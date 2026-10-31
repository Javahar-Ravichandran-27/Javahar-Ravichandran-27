const fs = require('node:fs');
const path = require('node:path');

// Minimal .env loader so the project needs no extra dependency.
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const { openDb } = require('./db');
const { createApp } = require('./app');

const db = openDb();
const port = Number(process.env.PORT) || 3000;
createApp(db).listen(port, () => console.log(`Nova Threads running at http://localhost:${port}`));
