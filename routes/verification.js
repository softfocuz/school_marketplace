const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { get, run } = require('../config/database');
const { requireLogin } = require('../middleware/auth');

//File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `id_${req.session.userId}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype))
      return cb(null, true);
    cb(new Error('Only image files allowed!'));
  }
});

//SHOW FORM
router.get('/form', requireLogin, async (req, res) => {
  const verification = await get('SELECT * FROM verifications WHERE user_id = ?', [req.session.userId]);
  res.render('verification/form', { verification });
});

//SUBMIT
router.post('/submit', requireLogin, upload.single('student_id_photo'), async (req, res) => {
  const { first_name, last_name, course, year_level, schedule, contact_number, facebook_link, facebook_describe } = req.body;

  //Validate Philippine mobile number
  const phoneRegex = /^(09|\+639)\d{9}$/;
  if (!phoneRegex.test(contact_number)) {
    req.flash('error', 'Please enter a valid Philippine mobile number (e.g. 09XXXXXXXXX).');
    return res.redirect('/verification/form');
  }

  if (!req.file) {
    req.flash('error', 'Please upload your student ID photo.');
    return res.redirect('/verification/form');
  }

  const existing = await get('SELECT id, status FROM verifications WHERE user_id = ?', [req.session.userId]);

  if (existing && existing.status === 'pending') {
    req.flash('error', 'Your verification is already under review.');
    return res.redirect('/verification/form');
  }
  if (existing && existing.status === 'approved') {
    req.flash('error', 'You are already verified.');
    return res.redirect('/');
  }

  const photo = req.file.filename;

  if (existing) {
    //Resubmit after rejection
    await run(`UPDATE verifications SET first_name=?, last_name=?, course=?, year_level=?, schedule=?,
      contact_number=?, facebook_link=?, facebook_describe=?, student_id_photo=?,
      status='pending', admin_note=NULL, submitted_at=CURRENT_TIMESTAMP WHERE user_id=?`,
      [first_name, last_name, course, year_level, schedule, contact_number, facebook_link, facebook_describe, photo, req.session.userId]);
  } else {
    await run(`INSERT INTO verifications (user_id, first_name, last_name, course, year_level, schedule,
      contact_number, facebook_link, facebook_describe, student_id_photo) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [req.session.userId, first_name, last_name, course, year_level, schedule, contact_number, facebook_link, facebook_describe, photo]);
  }

  req.flash('success', 'Verification submitted! Please wait for admin approval.');
  res.redirect('/verification/status');
});

//STATUS PAGE
router.get('/status', requireLogin, async (req, res) => {
  const verification = await get('SELECT * FROM verifications WHERE user_id = ?', [req.session.userId]);
  res.render('verification/status', { verification });
});

module.exports = router;
