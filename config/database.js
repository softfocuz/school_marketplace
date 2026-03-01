// config/database.js
// SQLite database setup using sqlite3 (works on Windows without Visual Studio)

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(DB_PATH);

// Helper: run a query that doesn't return rows (CREATE, INSERT, UPDATE, DELETE)
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Helper: get one row
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Helper: get multiple rows
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// ─── CREATE TABLES & SEED DATA ────────────────────────────────────────────────

async function initDatabase() {
  await run('PRAGMA foreign_keys = ON');

  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'buyer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    course TEXT NOT NULL,
    year_level TEXT NOT NULL,
    schedule TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    facebook_link TEXT NOT NULL,
    facebook_describe TEXT NOT NULL,
    student_id_photo TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    admin_note TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    logo TEXT,
    email TEXT,
    is_fastfood INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image TEXT,
    stock INTEGER DEFAULT 0,
    available INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    store_id INTEGER NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_order REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);

  console.log('✅ Database tables ready');

  // Seed admin
  const admin = await get('SELECT id FROM users WHERE role = ?', ['admin']);
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    await run('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      ['admin', 'admin@novatech.com', hash, 'admin']);
    console.log('✅ Admin created: admin / admin123');
  }

  // Seed Clarise
  const clarise = await get('SELECT id FROM users WHERE username = ?', ['clarise']);
  if (!clarise) {
    const hash = bcrypt.hashSync('clarise123', 10);
    const seller = await run('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      ['clarise', 'tanclarise46@gmail.com', hash, 'seller']);
    const store = await run('INSERT INTO stores (seller_id, name, description, email) VALUES (?, ?, ?, ?)',
      [seller.lastID, 'Clarise', 'Fresh homemade goodies and student favorites!', 'tanclarise46@gmail.com']);
    await run('INSERT INTO products (store_id, name, description, price, stock) VALUES (?, ?, ?, ?, ?)',
      [store.lastID, 'Baked Macaroni', 'Homemade creamy baked macaroni, good for sharing!', 85, 20]);
    await run('INSERT INTO products (store_id, name, description, price, stock) VALUES (?, ?, ?, ?, ?)',
      [store.lastID, 'Chocolate Brownies (6 pcs)', 'Fudgy and rich brownies baked fresh daily.', 60, 30]);
    await run('INSERT INTO products (store_id, name, description, price, stock) VALUES (?, ?, ?, ?, ?)',
      [store.lastID, 'Iced Milk Tea (500ml)', 'Classic milk tea with pearls.', 45, 50]);
    console.log('✅ Clarise store + 3 products created');
  }

  // Seed Jollibee
  const jollibee = await get('SELECT id FROM users WHERE username = ?', ['jollibee_store']);
  if (!jollibee) {
    const hash = bcrypt.hashSync('jollibee123', 10);
    const seller = await run('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      ['jollibee_store', 'jollibee@novatech.com', hash, 'seller']);
    const store = await run('INSERT INTO stores (seller_id, name, description, is_fastfood) VALUES (?, ?, ?, ?)',
      [seller.lastID, 'Jollibee', 'Your favorite Filipino fast food chain!', 1]);
    await run('INSERT INTO products (store_id, name, description, price, stock) VALUES (?, ?, ?, ?, ?)',
      [store.lastID, 'Chickenjoy (1pc)', 'Crispy and juicy fried chicken.', 99, 100]);
    await run('INSERT INTO products (store_id, name, description, price, stock) VALUES (?, ?, ?, ?, ?)',
      [store.lastID, 'Jolly Spaghetti', 'Sweet Filipino-style spaghetti.', 65, 100]);
    await run('INSERT INTO products (store_id, name, description, price, stock) VALUES (?, ?, ?, ?, ?)',
      [store.lastID, 'Burger Steak', 'Savory burger patty in mushroom gravy.', 75, 100]);
    console.log("✅ Jollibee store created");
  }

  // Seed McDonald's
  const mcdo = await get('SELECT id FROM users WHERE username = ?', ['mcdo_store']);
  if (!mcdo) {
    const hash = bcrypt.hashSync('mcdo123', 10);
    const seller = await run('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      ['mcdo_store', 'mcdo@novatech.com', hash, 'seller']);
    const store = await run('INSERT INTO stores (seller_id, name, description, is_fastfood) VALUES (?, ?, ?, ?)',
      [seller.lastID, "McDonald's", "I'm lovin' it! Available school meals.", 1]);
    await run('INSERT INTO products (store_id, name, description, price, stock) VALUES (?, ?, ?, ?, ?)',
      [store.lastID, 'McChicken Sandwich', 'Crispy chicken sandwich with mayo.', 89, 100]);
    await run('INSERT INTO products (store_id, name, description, price, stock) VALUES (?, ?, ?, ?, ?)',
      [store.lastID, 'Large Fries', 'Golden crispy French fries.', 69, 100]);
    await run('INSERT INTO products (store_id, name, description, price, stock) VALUES (?, ?, ?, ?, ?)',
      [store.lastID, "McFloat (Medium)", 'Softdrink with vanilla ice cream float.', 55, 100]);
    console.log("✅ McDonald's store created");
  }
}

module.exports = { run, get, all, initDatabase };
