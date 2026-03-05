// app.js
// Main entry point for NovaTech Ventures School Marketplace

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(session({
  secret: 'novatech_secret_key_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// Flash messages
app.use(flash());

// Global middleware
const { setLocals } = require('./middleware/auth');
app.use(setLocals);

// Cart count in navbar
const { get } = require('./config/database');
app.use(async (req, res, next) => {
  if (req.session.userId) {
    const cartData = await get('SELECT SUM(quantity) as total FROM cart_items WHERE user_id = ?', [req.session.userId]);
    res.locals.cartCount = cartData ? (cartData.total || 0) : 0;
  } else {
    res.locals.cartCount = 0;
  }
  next();
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/stores', require('./routes/store'));
app.use('/store', require('./routes/store'));
app.use('/orders', require('./routes/orders'));
app.use('/verification', require('./routes/verification'));
app.use('/admin', require('./routes/admin'));

// Home
app.get('/', (req, res) => res.render('index'));

// Init DB then start server
const { initDatabase } = require('./config/database');
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 NovaTech Ventures running at http://localhost:${PORT}`);
    console.log(`   Admin: admin / admin123`);
    console.log(`   Clarise store: clarise / clarise123\n`);
  });
}).catch(err => {
  console.error('❌ Database init failed:', err);
});
