// middleware/auth.js
// Middleware to protect routes

/**
 * Make sure user is logged in
 */
function requireLogin(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  req.flash('error', 'Please log in to continue.');
  res.redirect('/auth/login');
}

/**
 * Make sure user is an admin
 */
function requireAdmin(req, res, next) {
  if (req.session && req.session.role === 'admin') {
    return next();
  }
  res.status(403).send('Access denied. Admins only.');
}

/**
 * Make sure user is a seller
 */
function requireSeller(req, res, next) {
  if (req.session && (req.session.role === 'seller' || req.session.role === 'admin')) {
    return next();
  }
  req.flash('error', 'Only sellers can access this area.');
  res.redirect('/');
}

/**
 * Pass user session data to all views automatically
 */
function setLocals(req, res, next) {
  res.locals.currentUser = req.session.userId ? {
    id: req.session.userId,
    username: req.session.username,
    role: req.session.role
  } : null;
  res.locals.flashSuccess = req.flash('success');
  res.locals.flashError = req.flash('error');
  next();
}

module.exports = { requireLogin, requireAdmin, requireSeller, setLocals };
