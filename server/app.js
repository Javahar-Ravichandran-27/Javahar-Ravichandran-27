const path = require('node:path');
const express = require('express');
const { authenticate } = require('./auth');

function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use((_req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY' });
    next();
  });
  app.use('/api', authenticate(db));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/products', require('./routes/products')(db));
  app.use('/api/auth', require('./routes/auth')(db));
  app.use('/api/orders', require('./routes/orders')(db));
  app.use('/api/admin', require('./routes/admin')(db));
  app.use('/api', require('./routes/community')(db));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));
  // SPA fallback: the client-side router handles every non-API path.
  app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return app;
}

module.exports = { createApp };
