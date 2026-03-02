const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { get, run } = require('../config/database');

//REGISTER
router.get('/register', (req, res) => res.render('auth/register'));

router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    req.flash('error', 'All fields are required.');
    return res.redirect('/auth/register');
  }
  const existing = await get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
  if (existing) {
    req.flash('error', 'Username or email already taken.');
    return res.redirect('/auth/register');
  }
  const hash = bcrypt.hashSync(password, 10);
  const allowedRole = role === 'seller' ? 'seller' : 'buyer';
  await run('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', [username, email, hash, allowedRole]);
  req.flash('success', 'Account created! Please log in.');
  res.redirect('/auth/login');
});

//LOGIN
router.get('/login', (req, res) => res.render('auth/login'));

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    req.flash('error', 'Invalid username or password.');
    return res.redirect('/auth/login');
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;
  req.flash('success', `Welcome back, ${user.username}!`);
  if (user.role === 'admin') return res.redirect('/admin/dashboard');
  if (user.role === 'seller') return res.redirect('/store/my-store');
  res.redirect('/');
});

//LOGOUT
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;
