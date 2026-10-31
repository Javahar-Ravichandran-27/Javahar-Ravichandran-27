const express = require('express');
const { productFromRow } = require('../db');

const SORTS = {
  newest: 'is_new DESC, created_at DESC, id DESC',
  'price-asc': 'price ASC',
  'price-desc': 'price DESC',
  name: 'name COLLATE NOCASE ASC',
  featured: 'featured DESC, id ASC',
};

module.exports = (db) => {
  const router = express.Router();

  router.get('/', (req, res) => {
    const where = [];
    const params = [];
    const { category, gender, q, featured, sale, min, max } = req.query;
    if (category) { where.push('category = ?'); params.push(String(category)); }
    if (gender) { where.push("(gender = ? OR gender = 'unisex')"); params.push(String(gender)); }
    if (q) {
      where.push('(name LIKE ? OR description LIKE ? OR category LIKE ?)');
      const like = `%${String(q).slice(0, 100)}%`;
      params.push(like, like, like);
    }
    if (featured === 'true') where.push('featured = 1');
    if (req.query.new === 'true') where.push('is_new = 1');
    if (sale === 'true') where.push('compare_at IS NOT NULL AND compare_at > price');
    if (min && !Number.isNaN(Number(min))) { where.push('price >= ?'); params.push(Math.round(Number(min) * 100)); }
    if (max && !Number.isNaN(Number(max))) { where.push('price <= ?'); params.push(Math.round(Number(max) * 100)); }
    const order = SORTS[req.query.sort] || SORTS.featured;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 100);
    const sql = `SELECT * FROM products ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order} LIMIT ${limit}`;
    res.json(db.prepare(sql).all(...params).map(productFromRow));
  });

  router.get('/categories', (_req, res) => {
    res.json(db.prepare('SELECT category AS name, COUNT(*) AS count FROM products GROUP BY category ORDER BY category').all());
  });

  router.get('/:slug', (req, res) => {
    const product = productFromRow(db.prepare('SELECT * FROM products WHERE slug = ?').get(req.params.slug));
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    const related = db.prepare('SELECT * FROM products WHERE category = ? AND id != ? ORDER BY featured DESC LIMIT 4')
      .all(product.category, product.id).map(productFromRow);
    res.json({ ...product, related });
  });

  return router;
};
