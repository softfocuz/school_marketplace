// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { get, run } = require('../config/database');

// REGISTER
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

  if (role === 'seller') {
    // Seller accounts start as 'pending' — admin must approve first
    await run('INSERT INTO users (username, email, password, role, seller_status) VALUES (?, ?, ?, ?, ?)',
      [username, email, hash, 'seller', 'pending']);
    req.flash('success', 'Seller account submitted! Please wait for admin approval before you can log in.');
    return res.redirect('/auth/login');
  }

  // Regular buyer — no approval needed
  await run('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
    [username, email, hash, 'buyer']);
  req.flash('success', 'Account created! Please log in.');
  res.redirect('/auth/login');
});

// LOGIN
router.get('/login', (req, res) => res.render('auth/login'));

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await get('SELECT * FROM users WHERE username = ?', [username]);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    req.flash('error', 'Invalid username or password.');
    return res.redirect('/auth/login');
  }

  // Block sellers who are still pending or rejected
  if (user.role === 'seller' && user.seller_status === 'pending') {
    req.flash('error', '⏳ Your seller account is still under review. Please wait for admin approval.');
    return res.redirect('/auth/login');
  }
  if (user.role === 'seller' && user.seller_status === 'rejected') {
    req.flash('error', '❌ Your seller account was rejected. Please contact the admin.');
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

// LOGOUT
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;
