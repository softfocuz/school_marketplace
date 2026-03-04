// routes/admin.js
const express = require("express");
const router = express.Router();
const { get, all, run } = require("../config/database");
const { requireAdmin } = require("../middleware/auth");

router.use(requireAdmin);

// DASHBOARD
router.get("/dashboard", async (req, res) => {
  const stats = {
    totalUsers: (await get("SELECT COUNT(*) as c FROM users WHERE role = 'buyer'")).c,
    totalStores: (await get("SELECT COUNT(*) as c FROM stores")).c,
    totalOrders: (await get("SELECT COUNT(*) as c FROM orders")).c,
    totalRevenue: (await get("SELECT SUM(total_amount) as r FROM orders WHERE status != 'cancelled'")).r || 0,
    pendingVerifications: (await get("SELECT COUNT(*) as c FROM verifications WHERE status = 'pending'")).c,
    pendingSellers: (await get("SELECT COUNT(*) as c FROM users WHERE role = 'seller' AND seller_status = 'pending'")).c,
  };
  const pendingVerifs = await all("SELECT v.*, u.username, u.email FROM verifications v JOIN users u ON v.user_id = u.id WHERE v.status = 'pending' ORDER BY v.submitted_at ASC LIMIT 10");
  const pendingSellers = await all("SELECT * FROM users WHERE role = 'seller' AND seller_status = 'pending' ORDER BY created_at ASC LIMIT 10");
  res.render("admin/dashboard", { stats, pendingVerifs, pendingSellers });
});

router.get("/verifications", async (req, res) => {
  const filter = req.query.status || "all";
  let sql = "SELECT v.*, u.username, u.email FROM verifications v JOIN users u ON v.user_id = u.id";
  const params = [];
  if (filter !== "all") { sql += " WHERE v.status = ?"; params.push(filter); }
  sql += " ORDER BY v.submitted_at DESC";
  const verifications = await all(sql, params);
  res.render("admin/verifications", { verifications, filter });
});

router.get("/verifications/:id", async (req, res) => {
  const verif = await get("SELECT v.*, u.username, u.email FROM verifications v JOIN users u ON v.user_id = u.id WHERE v.id = ?", [req.params.id]);
  if (!verif) { req.flash("error", "Not found."); return res.redirect("/admin/verifications"); }
  res.render("admin/verification-detail", { verif });
});

router.post("/verifications/:id/approve", async (req, res) => {
  await run("UPDATE verifications SET status='approved', reviewed_at=CURRENT_TIMESTAMP, admin_note=NULL WHERE id=?", [req.params.id]);
  req.flash("success", "Verification approved!");
  res.redirect("/admin/verifications");
});

router.post("/verifications/:id/reject", async (req, res) => {
  await run("UPDATE verifications SET status='rejected', reviewed_at=CURRENT_TIMESTAMP, admin_note=? WHERE id=?", [req.body.admin_note || "No reason given.", req.params.id]);
  req.flash("success", "Verification rejected.");
  res.redirect("/admin/verifications");
});

router.get("/sellers", async (req, res) => {
  const filter = req.query.status || "all";
  let sql = "SELECT * FROM users WHERE role = 'seller'";
  const params = [];
  if (filter !== "all") { sql += " AND seller_status = ?"; params.push(filter); }
  sql += " ORDER BY created_at DESC";
  const sellers = await all(sql, params);
  for (const seller of sellers) {
    seller.store = await get("SELECT * FROM stores WHERE seller_id = ?", [seller.id]);
  }
  res.render("admin/sellers", { sellers, filter });
});

router.post("/sellers/:id/approve", async (req, res) => {
  await run("UPDATE users SET seller_status = 'approved' WHERE id = ? AND role = 'seller'", [req.params.id]);
  req.flash("success", "Seller approved! They can now log in.");
  res.redirect("/admin/sellers");
});

router.post("/sellers/:id/reject", async (req, res) => {
  await run("UPDATE users SET seller_status = 'rejected' WHERE id = ? AND role = 'seller'", [req.params.id]);
  req.flash("success", "Seller rejected.");
  res.redirect("/admin/sellers");
});

router.get("/orders", async (req, res) => {
  const orders = await all("SELECT o.*, s.name as store_name, u.username as buyer_name, v.first_name, v.last_name FROM orders o JOIN stores s ON o.store_id = s.id JOIN users u ON o.user_id = u.id LEFT JOIN verifications v ON v.user_id = o.user_id ORDER BY o.created_at DESC");
  for (const order of orders) {
    order.items = await all("SELECT oi.*, p.name as product_name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?", [order.id]);
  }
  res.render("admin/orders", { orders });
});

router.get("/users", async (req, res) => {
  const users = await all("SELECT u.*, v.status as verif_status, v.first_name, v.last_name FROM users u LEFT JOIN verifications v ON v.user_id = u.id ORDER BY u.created_at DESC");
  res.render("admin/users", { users });
});

module.exports = router;
