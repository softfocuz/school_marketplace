// config/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDatabase() {
  await run('PRAGMA foreign_keys = ON');

  // Users — added seller_status for admin approval of sellers
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'buyer',
    seller_status TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add seller_status column if it doesn't exist yet (for existing databases)
  await run(`ALTER TABLE users ADD COLUMN seller_status TEXT DEFAULT NULL`).catch(() => {});

  await run(`CREATE TABLE IF NOT EXISTS verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    course TEXT NOT NULL,
    year_level TEXT NOT NULL,
    schedule TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    address TEXT NOT NULL,
    facebook_link TEXT NOT NULL,
    facebook_describe TEXT NOT NULL,
    student_id_photo TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    admin_note TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // Add address column if it doesn't exist yet (for existing databases)
  await run(`ALTER TABLE verifications ADD COLUMN address TEXT`).catch(() => {});

  await run(`CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    logo TEXT,
    email TEXT,
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

  // Seed Clarise (approved seller)
  const clarise = await get('SELECT id FROM users WHERE username = ?', ['clarise']);
  if (!clarise) {
    const hash = bcrypt.hashSync('clarise123', 10);
    const seller = await run('INSERT INTO users (username, email, password, role, seller_status) VALUES (?, ?, ?, ?, ?)',
      ['clarise', 'tanclarise46@gmail.com', hash, 'seller', 'approved']);
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
}

module.exports = { run, get, all, initDatabase };
