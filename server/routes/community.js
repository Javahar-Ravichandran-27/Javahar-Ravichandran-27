const express = require('express');
const { str, isEmail } = require('../validate');

module.exports = (db) => {
  const router = express.Router();

  router.post('/newsletter', (req, res) => {
    const email = str(req.body.email, 254).toLowerCase();
    if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    db.prepare('INSERT OR IGNORE INTO subscribers (email) VALUES (?)').run(email);
    res.status(201).json({ message: "You're on the list. Welcome to the community." });
  });

  router.post('/contact', (req, res) => {
    const name = str(req.body.name, 100);
    const email = str(req.body.email, 254).toLowerCase();
    const message = str(req.body.message, 5000);
    if (!name || !message) return res.status(400).json({ error: 'Name and message are required.' });
    if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    db.prepare('INSERT INTO messages (name, email, message) VALUES (?, ?, ?)').run(name, email, message);
    res.status(201).json({ message: 'Thanks for reaching out. We reply within 1–2 business days.' });
  });

  return router;
};
