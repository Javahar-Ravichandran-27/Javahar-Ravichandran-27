const express = require('express');
const { requireUser } = require('../auth');
const { productFromRow, orderFromRow } = require('../db');
const { str, isEmail } = require('../validate');

const FREE_SHIPPING_THRESHOLD = 10000; // cents
const SHIPPING_FEE = 800;

function shippingFor(subtotal) {
  return subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE;
}

module.exports = (db) => {
  const router = express.Router();
  const getProduct = db.prepare('SELECT * FROM products WHERE id = ?');

  router.post('/', (req, res) => {
    const body = req.body || {};
    const name = str(body.name, 100);
    const email = str(body.email || req.user?.email, 254).toLowerCase();
    const address = {
      line1: str(body.address?.line1, 200),
      line2: str(body.address?.line2, 200),
      city: str(body.address?.city, 100),
      postal: str(body.address?.postal, 20),
      country: str(body.address?.country, 60),
    };
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (!address.line1 || !address.city || !address.postal || !address.country) {
      return res.status(400).json({ error: 'Please complete your shipping address.' });
    }
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
      return res.status(400).json({ error: 'Your bag is empty.' });
    }

    // Prices and availability always come from the database, never the client.
    const lines = [];
    const needed = new Map();
    for (const raw of body.items) {
      const product = productFromRow(getProduct.get(Number(raw.productId)));
      const quantity = Number(raw.quantity);
      if (!product) return res.status(400).json({ error: 'One of the items is no longer available.' });
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return res.status(400).json({ error: `Invalid quantity for ${product.name}.` });
      }
      if (!product.sizes.includes(raw.size)) return res.status(400).json({ error: `Pick a valid size for ${product.name}.` });
      if (!product.colors.some((c) => c.name === raw.color)) {
        return res.status(400).json({ error: `Pick a valid color for ${product.name}.` });
      }
      needed.set(product.id, (needed.get(product.id) || 0) + quantity);
      if (needed.get(product.id) > product.stock) {
        return res.status(409).json({ error: `Only ${product.stock} left of ${product.name}.` });
      }
      lines.push({ productId: product.id, slug: product.slug, name: product.name, category: product.category,
        price: product.price, size: raw.size, color: raw.color, quantity });
    }

    const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
    const shipping = shippingFor(subtotal);
    const total = subtotal + shipping;

    db.exec('BEGIN');
    try {
      const decrement = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');
      for (const [id, qty] of needed) {
        if (decrement.run(qty, id, qty).changes !== 1) throw new Error('stock');
      }
      const { lastInsertRowid } = db.prepare(`INSERT INTO orders
        (user_id, email, name, address, items, subtotal, shipping, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(req.user?.id ?? null, email, name, JSON.stringify(address), JSON.stringify(lines), subtotal, shipping, total);
      db.exec('COMMIT');
      res.status(201).json(orderFromRow(db.prepare('SELECT * FROM orders WHERE id = ?').get(lastInsertRowid)));
    } catch (err) {
      db.exec('ROLLBACK');
      if (err.message === 'stock') return res.status(409).json({ error: 'Some items just sold out. Please review your bag.' });
      throw err;
    }
  });

  router.get('/mine', requireUser, (req, res) => {
    res.json(db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.user.id).map(orderFromRow));
  });

  return router;
};

module.exports.shippingFor = shippingFor;
