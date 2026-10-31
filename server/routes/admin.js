const express = require('express');
const { requireAdmin } = require('../auth');
const { productFromRow, orderFromRow } = require('../db');
const { str } = require('../validate');

const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function parseProduct(body) {
  const name = str(body.name, 120);
  const category = str(body.category, 40).toLowerCase();
  const price = Math.round(Number(body.price) * 100);
  const compareAt = body.compare_at ? Math.round(Number(body.compare_at) * 100) : null;
  const stock = parseInt(body.stock, 10);
  const sizes = (Array.isArray(body.sizes) ? body.sizes : String(body.sizes || '').split(','))
    .map((s) => String(s).trim()).filter(Boolean);
  const colors = (Array.isArray(body.colors) ? body.colors : [])
    .map((c) => ({ name: str(c?.name, 40), hex: /^#[0-9a-f]{6}$/i.test(c?.hex) ? c.hex : '#888888' }))
    .filter((c) => c.name);
  const image = str(body.image, 500);
  if (image && !/^(https:\/\/|\/(?!\/))[^\s"'<>]+$/.test(image)) return { error: 'Image must be an https:// URL or a /path.' };
  if (!name) return { error: 'Name is required.' };
  if (!category) return { error: 'Category is required.' };
  if (!Number.isFinite(price) || price <= 0) return { error: 'Price must be greater than 0.' };
  if (compareAt !== null && (!Number.isFinite(compareAt) || compareAt <= price)) {
    return { error: 'Compare-at price must be higher than price.' };
  }
  if (!Number.isInteger(stock) || stock < 0) return { error: 'Stock must be 0 or more.' };
  if (!sizes.length) return { error: 'Add at least one size.' };
  if (!colors.length) return { error: 'Add at least one color.' };
  return {
    value: {
      name, category, price, compare_at: compareAt, stock,
      slug: slugify(str(body.slug, 120) || name),
      gender: ['men', 'women', 'unisex'].includes(body.gender) ? body.gender : 'unisex',
      description: str(body.description, 2000),
      sizes: JSON.stringify(sizes), colors: JSON.stringify(colors),
      featured: body.featured ? 1 : 0, is_new: body.is_new ? 1 : 0,
      image: image || null,
    },
  };
}

module.exports = (db) => {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/stats', (_req, res) => {
    const orders = db.prepare("SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue FROM orders WHERE status != 'cancelled'").get();
    res.json({
      orders: orders.count,
      revenue: orders.revenue,
      products: db.prepare('SELECT COUNT(*) AS n FROM products').get().n,
      customers: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'").get().n,
      subscribers: db.prepare('SELECT COUNT(*) AS n FROM subscribers').get().n,
      lowStock: db.prepare('SELECT id, name, stock FROM products WHERE stock < 10 ORDER BY stock').all(),
    });
  });

  router.get('/orders', (_req, res) => {
    res.json(db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 200').all().map(orderFromRow));
  });

  router.patch('/orders/:id', (req, res) => {
    if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status.' });
    const result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Order not found.' });
    res.json(orderFromRow(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)));
  });

  router.get('/messages', (_req, res) => {
    res.json(db.prepare('SELECT * FROM messages ORDER BY id DESC LIMIT 200').all());
  });

  router.post('/products', (req, res) => {
    const { error, value } = parseProduct(req.body || {});
    if (error) return res.status(400).json({ error });
    if (db.prepare('SELECT id FROM products WHERE slug = ?').get(value.slug)) {
      return res.status(409).json({ error: 'A product with this slug already exists.' });
    }
    const cols = Object.keys(value);
    const { lastInsertRowid } = db.prepare(`INSERT INTO products (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
      .run(...Object.values(value));
    res.status(201).json(productFromRow(db.prepare('SELECT * FROM products WHERE id = ?').get(lastInsertRowid)));
  });

  router.put('/products/:id', (req, res) => {
    const { error, value } = parseProduct(req.body || {});
    if (error) return res.status(400).json({ error });
    const clash = db.prepare('SELECT id FROM products WHERE slug = ? AND id != ?').get(value.slug, req.params.id);
    if (clash) return res.status(409).json({ error: 'A product with this slug already exists.' });
    const cols = Object.keys(value);
    const result = db.prepare(`UPDATE products SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`)
      .run(...Object.values(value), req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Product not found.' });
    res.json(productFromRow(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)));
  });

  router.delete('/products/:id', (req, res) => {
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Product not found.' });
    res.status(204).end();
  });

  return router;
};
