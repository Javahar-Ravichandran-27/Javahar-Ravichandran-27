const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { hashPassword } = require('./auth');
const seedProducts = require('./seed');

function openDb(dbPath = process.env.DB_PATH || 'data/store.db') {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      gender TEXT NOT NULL DEFAULT 'unisex',
      price INTEGER NOT NULL,
      compare_at INTEGER,
      description TEXT NOT NULL DEFAULT '',
      colors TEXT NOT NULL DEFAULT '[]',
      sizes TEXT NOT NULL DEFAULT '[]',
      image TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      is_new INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      items TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      shipping INTEGER NOT NULL,
      total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS subscribers (
      email TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  seed(db);
  return db;
}

function seed(db) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM products').get();
  if (n === 0) {
    const insert = db.prepare(`INSERT INTO products
      (slug, name, category, gender, price, compare_at, description, colors, sizes, stock, featured, is_new)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const p of seedProducts) {
      insert.run(p.slug, p.name, p.category, p.gender, p.price, p.compare_at ?? null, p.description,
        JSON.stringify(p.colors), JSON.stringify(p.sizes), p.stock, p.featured ? 1 : 0, p.is_new ? 1 : 0);
    }
  }
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@novathreads.com').toLowerCase();
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!exists) {
    db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')")
      .run('Store Admin', adminEmail, hashPassword(process.env.ADMIN_PASSWORD || 'admin12345'));
  }
}

function productFromRow(row) {
  if (!row) return null;
  return {
    ...row,
    colors: JSON.parse(row.colors),
    sizes: JSON.parse(row.sizes),
    featured: !!row.featured,
    is_new: !!row.is_new,
  };
}

function orderFromRow(row) {
  if (!row) return null;
  return { ...row, address: JSON.parse(row.address), items: JSON.parse(row.items) };
}

module.exports = { openDb, productFromRow, orderFromRow };
