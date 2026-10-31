const express = require('express');
const { hashPassword, verifyPassword, createToken, requireUser } = require('../auth');
const { str, isEmail } = require('../validate');

module.exports = (db) => {
  const router = express.Router();
  const publicUser = ({ id, name, email, role, created_at }) => ({ id, name, email, role, created_at });

  router.post('/register', (req, res) => {
    const name = str(req.body.name, 100);
    const email = str(req.body.email, 254).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const { lastInsertRowid } = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(name, email, hashPassword(password));
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid);
    res.status(201).json({ token: createToken(user), user: publicUser(user) });
  });

  router.post('/login', (req, res) => {
    const email = str(req.body.email, 254).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    res.json({ token: createToken(user), user: publicUser(user) });
  });

  router.get('/me', requireUser, (req, res) => res.json(req.user));

  return router;
};
