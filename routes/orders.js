const express = require('express');
const router = express.Router();
const { get, all, run } = require('../config/database');
const { requireLogin } = require('../middleware/auth');

// VIEW CART
router.get('/cart', requireLogin, async (req, res) => {
  const cartItems = await all(`
    SELECT ci.id as cart_item_id, ci.quantity,
           p.id as product_id, p.name, p.price, p.image,
           s.id as store_id, s.name as store_name
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    JOIN stores s ON p.store_id = s.id
    WHERE ci.user_id = ?`, [req.session.userId]);
  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  res.render('store/cart', { cartItems, total });
});

// ADD TO CART
router.post('/cart/add', requireLogin, async (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  const product = await get('SELECT * FROM products WHERE id = ? AND available = 1', [product_id]);
  if (!product) return res.json({ success: false, message: 'Product not found.' });

  const existing = await get('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?', [req.session.userId, product_id]);
  if (existing) {
    await run('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [quantity, existing.id]);
  } else {
    await run('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)', [req.session.userId, product_id, quantity]);
  }

  const cartData = await get('SELECT SUM(quantity) as total FROM cart_items WHERE user_id = ?', [req.session.userId]);
  res.json({ success: true, message: 'Added to cart!', cartCount: cartData.total || 0 });
});

// REMOVE FROM CART
router.post('/cart/remove', requireLogin, async (req, res) => {
  await run('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [req.body.cart_item_id, req.session.userId]);
  res.redirect('/orders/cart');
});

// PLACE ORDER
router.post('/place', requireLogin, async (req, res) => {
  const userId = req.session.userId;
  const delivery_address = req.body.delivery_address || '';

  // Check verification
  const verification = await get('SELECT * FROM verifications WHERE user_id = ?', [userId]);
  if (!verification) {
    return res.json({ success: false, action: 'verify', message: 'You need to verify your identity before placing an order.' });
  }
  if (verification.status === 'pending') {
    return res.json({ success: false, action: 'pending', message: 'Your account is under review. Please wait for admin approval.' });
  }
  if (verification.status === 'rejected') {
    return res.json({ success: false, action: 'resubmit', message: `Your verification was rejected. Reason: ${verification.admin_note || 'No reason given'}. Please resubmit.` });
  }

  // Get cart
  const cartItems = await all(`
    SELECT ci.quantity, p.id as product_id, p.name, p.price, p.store_id, s.name as store_name
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    JOIN stores s ON p.store_id = s.id
    WHERE ci.user_id = ?`, [userId]);

  if (cartItems.length === 0) {
    return res.json({ success: false, message: 'Your cart is empty.' });
  }

  // Group by store
  const storeGroups = {};
  cartItems.forEach(item => {
    if (!storeGroups[item.store_id]) {
      storeGroups[item.store_id] = { store_id: item.store_id, store_name: item.store_name, items: [] };
    }
    storeGroups[item.store_id].items.push(item);
  });

  const orderIds = [];

  for (const storeId in storeGroups) {
    const group = storeGroups[storeId];
    const total = group.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    const order = await run(
      'INSERT INTO orders (user_id, store_id, total_amount, notes) VALUES (?, ?, ?, ?)',
      [userId, group.store_id, total, delivery_address ? 'Deliver to: ' + delivery_address : '']
    );
    const orderId = order.lastID;
    orderIds.push(orderId);

    for (const item of group.items) {
      await run(
        'INSERT INTO order_items (order_id, product_id, quantity, price_at_order) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );
    }
  }

  // Clear cart
  await run('DELETE FROM cart_items WHERE user_id = ?', [userId]);
  res.json({ success: true, message: 'Order placed successfully!', orderIds });
});

// MY ORDERS
router.get('/my-orders', requireLogin, async (req, res) => {
  const orders = await all(`
    SELECT o.*, s.name as store_name
    FROM orders o JOIN stores s ON o.store_id = s.id
    WHERE o.user_id = ? ORDER BY o.created_at DESC`, [req.session.userId]);

  for (const order of orders) {
    order.items = await all(`
      SELECT oi.*, p.name as product_name
      FROM order_items oi JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?`, [order.id]);
  }
  res.render('store/my-orders', { orders });
});

// CANCEL ORDER (pending only)
router.post('/cancel/:id', requireLogin, async (req, res) => {
  const order = await get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!order) { req.flash('error', 'Order not found.'); return res.redirect('/orders/my-orders'); }
  if (order.status !== 'pending') { req.flash('error', 'Only pending orders can be cancelled.'); return res.redirect('/orders/my-orders'); }
  await run("UPDATE orders SET status = 'cancelled' WHERE id = ?", [order.id]);
  req.flash('success', 'Order cancelled.');
  res.redirect('/orders/my-orders');
});

module.exports = router;
