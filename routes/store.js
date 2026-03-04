// routes/store.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { get, all, run } = require('../config/database');
const { requireLogin, requireSeller } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'product_' + req.session.userId + '_' + Date.now() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype))
      return cb(null, true);
    cb(new Error('Only image files allowed!'));
  }
});

// BROWSE ALL STORES — only approved sellers
router.get('/', async (req, res) => {
  const stores = await all(
    "SELECT s.*, u.username as seller_name, COUNT(p.id) as product_count " +
    "FROM stores s JOIN users u ON s.seller_id = u.id " +
    "LEFT JOIN products p ON p.store_id = s.id AND p.available = 1 " +
    "WHERE u.seller_status = 'approved' " +
    "GROUP BY s.id ORDER BY s.created_at ASC"
  );
  res.render('store/browse', { stores });
});

// SELLER DASHBOARD
router.get('/my-store', requireLogin, requireSeller, async (req, res) => {
  const store = await get('SELECT * FROM stores WHERE seller_id = ?', [req.session.userId]);
  if (!store) return res.render('store/create-store');

  const products = await all('SELECT * FROM products WHERE store_id = ?', [store.id]);
  const orders = await all(
    "SELECT o.*, u.username as buyer_name, v.first_name, v.last_name, v.address " +
    "FROM orders o JOIN users u ON o.user_id = u.id " +
    "LEFT JOIN verifications v ON v.user_id = o.user_id " +
    "WHERE o.store_id = ? ORDER BY o.created_at DESC LIMIT 20",
    [store.id]
  );

  for (const order of orders) {
    order.items = await all(
      "SELECT oi.*, p.name as product_name FROM order_items oi " +
      "JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?",
      [order.id]
    );
  }

  const revenueRow = await get("SELECT SUM(total_amount) as revenue FROM orders WHERE store_id = ? AND status != 'cancelled'", [store.id]);
  res.render('store/dashboard', { store, products, orders, totalRevenue: revenueRow.revenue || 0 });
});

// CREATE STORE
router.post('/my-store/create', requireLogin, requireSeller, async (req, res) => {
  const { name, description } = req.body;
  await run('INSERT INTO stores (seller_id, name, description) VALUES (?, ?, ?)', [req.session.userId, name, description]);
  req.flash('success', 'Store created!');
  res.redirect('/store/my-store');
});

// ADD PRODUCT
router.post('/my-store/product/add', requireLogin, requireSeller, upload.single('product_image'), async (req, res) => {
  const { name, description, price, stock } = req.body;
  const store = await get('SELECT * FROM stores WHERE seller_id = ?', [req.session.userId]);
  if (!store) { req.flash('error', 'Create a store first.'); return res.redirect('/store/my-store'); }
  const image = req.file ? req.file.filename : null;
  await run('INSERT INTO products (store_id, name, description, price, stock, image) VALUES (?, ?, ?, ?, ?, ?)',
    [store.id, name, description, price, stock || 0, image]);
  req.flash('success', 'Product added!');
  res.redirect('/store/my-store');
});

// EDIT PRODUCT — show form
router.get('/my-store/product/edit/:id', requireLogin, requireSeller, async (req, res) => {
  const store = await get('SELECT * FROM stores WHERE seller_id = ?', [req.session.userId]);
  const product = await get('SELECT * FROM products WHERE id = ? AND store_id = ?', [req.params.id, store.id]);
  if (!product) { req.flash('error', 'Product not found.'); return res.redirect('/store/my-store'); }
  res.render('store/edit-product', { product });
});

// EDIT PRODUCT — save
router.post('/my-store/product/edit/:id', requireLogin, requireSeller, upload.single('product_image'), async (req, res) => {
  const { name, description, price, stock } = req.body;
  const store = await get('SELECT * FROM stores WHERE seller_id = ?', [req.session.userId]);
  const product = await get('SELECT * FROM products WHERE id = ? AND store_id = ?', [req.params.id, store.id]);
  if (!product) { req.flash('error', 'Product not found.'); return res.redirect('/store/my-store'); }
  const image = req.file ? req.file.filename : product.image;
  await run('UPDATE products SET name=?, description=?, price=?, stock=?, image=? WHERE id=?',
    [name, description, price, stock || 0, image, product.id]);
  req.flash('success', 'Product updated!');
  res.redirect('/store/my-store');
});

// DELETE PRODUCT
router.post('/my-store/product/delete/:id', requireLogin, requireSeller, async (req, res) => {
  await run('DELETE FROM products WHERE id = ?', [req.params.id]);
  req.flash('success', 'Product removed.');
  res.redirect('/store/my-store');
});

// CONFIRM ORDER
router.post('/my-store/order/confirm/:id', requireLogin, requireSeller, async (req, res) => {
  const store = await get('SELECT * FROM stores WHERE seller_id = ?', [req.session.userId]);
  await run("UPDATE orders SET status = 'confirmed' WHERE id = ? AND store_id = ?", [req.params.id, store.id]);
  req.flash('success', 'Order confirmed!');
  res.redirect('/store/my-store');
});

// REJECT ORDER
router.post('/my-store/order/reject/:id', requireLogin, requireSeller, async (req, res) => {
  const store = await get('SELECT * FROM stores WHERE seller_id = ?', [req.session.userId]);
  const order = await get('SELECT * FROM orders WHERE id = ? AND store_id = ?', [req.params.id, store.id]);
  if (!order) { req.flash('error', 'Order not found.'); return res.redirect('/store/my-store'); }
  if (order.status !== 'pending') { req.flash('error', 'Only pending orders can be rejected.'); return res.redirect('/store/my-store'); }
  const reason = req.body.reject_reason || 'No reason given.';
  await run("UPDATE orders SET status = 'rejected', notes = ? WHERE id = ?", [reason, order.id]);
  req.flash('success', 'Order rejected.');
  res.redirect('/store/my-store');
});

// VIEW SINGLE STORE
router.get('/:id', async (req, res) => {
  const store = await get(
    "SELECT s.*, u.username as seller_name FROM stores s JOIN users u ON s.seller_id = u.id WHERE s.id = ?",
    [req.params.id]
  );
  if (!store) { req.flash('error', 'Store not found.'); return res.redirect('/stores'); }
  const products = await all('SELECT * FROM products WHERE store_id = ? AND available = 1', [store.id]);
  res.render('store/view', { store, products });
});

module.exports = router;
