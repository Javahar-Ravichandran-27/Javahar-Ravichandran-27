const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.ADMIN_EMAIL = 'admin@test.dev';
process.env.ADMIN_PASSWORD = 'admin-pass-123';
const { openDb } = require('../server/db');
const { createApp } = require('../server/app');

let server, base;
before(async () => {
  server = createApp(openDb(':memory:')).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

async function call(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, { method, headers, body: body && JSON.stringify(body) });
  return { status: res.status, data: res.status === 204 ? null : await res.json() };
}

const address = { line1: '1 Main St', city: 'Chennai', postal: '600001', country: 'India' };

test('lists and filters products', async () => {
  const all = await call('/products');
  assert.equal(all.status, 200);
  assert.ok(all.data.length >= 10);
  const tees = await call('/products?category=tees');
  assert.ok(tees.data.length > 0 && tees.data.every((p) => p.category === 'tees'));
  const sorted = (await call('/products?sort=price-asc')).data.map((p) => p.price);
  assert.deepEqual(sorted, [...sorted].sort((a, b) => a - b));
  const sale = await call('/products?sale=true');
  assert.ok(sale.data.every((p) => p.compare_at > p.price));
  assert.ok((await call('/products?q=hoodie')).data.some((p) => p.slug === 'cloud-fleece-hoodie'));
});

test('returns product detail with related items, 404 for unknown', async () => {
  const { status, data } = await call('/products/cloud-fleece-hoodie');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.colors) && Array.isArray(data.related));
  assert.equal((await call('/products/nope')).status, 404);
});

test('registers, logs in and reads profile', async () => {
  const reg = await call('/auth/register', { method: 'POST', body: { name: 'Ana', email: 'Ana@Example.com', password: 'secret123' } });
  assert.equal(reg.status, 201);
  assert.equal(reg.data.user.email, 'ana@example.com');
  assert.equal((await call('/auth/register', { method: 'POST', body: { name: 'A', email: 'ana@example.com', password: 'secret123' } })).status, 409);
  assert.equal((await call('/auth/login', { method: 'POST', body: { email: 'ana@example.com', password: 'wrong' } })).status, 401);
  const login = await call('/auth/login', { method: 'POST', body: { email: 'ana@example.com', password: 'secret123' } });
  const me = await call('/auth/me', { token: login.data.token });
  assert.equal(me.data.name, 'Ana');
  assert.equal((await call('/auth/me', { token: 'forged.token' })).status, 401);
});

test('places an order using server-side prices and decrements stock', async () => {
  const { data: tee } = await call('/products/essential-heavyweight-tee');
  const { data: user } = await call('/auth/register', { method: 'POST', body: { name: 'Buyer', email: 'buyer@example.com', password: 'secret123' } });
  const order = await call('/orders', { method: 'POST', token: user.token, body: {
    name: 'Buyer', email: 'buyer@example.com', address,
    items: [{ productId: tee.id, size: 'M', color: tee.colors[0].name, quantity: 2, price: 1 }],
  } });
  assert.equal(order.status, 201);
  assert.equal(order.data.subtotal, tee.price * 2);
  assert.equal(order.data.shipping, 800); // $76 < $100 threshold
  assert.equal(order.data.total, tee.price * 2 + 800);
  const after = await call('/products/essential-heavyweight-tee');
  assert.equal(after.data.stock, tee.stock - 2);
  const mine = await call('/orders/mine', { token: user.token });
  assert.equal(mine.data.length, 1);
});

test('rejects invalid orders', async () => {
  const { data: tee } = await call('/products/essential-heavyweight-tee');
  const base = { name: 'X', email: 'x@example.com', address };
  const bad = [
    { ...base, items: [] },
    { ...base, items: [{ productId: tee.id, size: 'XXXL', color: tee.colors[0].name, quantity: 1 }] },
    { ...base, items: [{ productId: tee.id, size: 'M', color: 'Neon', quantity: 1 }] },
    { ...base, items: [{ productId: tee.id, size: 'M', color: tee.colors[0].name, quantity: 0 }] },
    { ...base, address: {}, items: [{ productId: tee.id, size: 'M', color: tee.colors[0].name, quantity: 1 }] },
  ];
  for (const body of bad) assert.equal((await call('/orders', { method: 'POST', body })).status, 400);
  const tooMany = await call('/orders', { method: 'POST', body: { ...base, items: Array(10).fill({ productId: tee.id, size: 'M', color: tee.colors[0].name, quantity: 20 }) } });
  assert.equal(tooMany.status, 409);
});

test('admin routes require an admin and support product CRUD', async () => {
  const { data: cust } = await call('/auth/register', { method: 'POST', body: { name: 'C', email: 'c@example.com', password: 'secret123' } });
  assert.equal((await call('/admin/stats')).status, 401);
  assert.equal((await call('/admin/stats', { token: cust.token })).status, 403);

  const { data: admin } = await call('/auth/login', { method: 'POST', body: { email: 'admin@test.dev', password: 'admin-pass-123' } });
  const stats = await call('/admin/stats', { token: admin.token });
  assert.equal(stats.status, 200);
  assert.ok(stats.data.orders >= 1);

  const created = await call('/admin/products', { method: 'POST', token: admin.token, body: {
    name: 'Test Overshirt', category: 'outerwear', price: '89.50', stock: 5, sizes: 'S, M, L', colors: [{ name: 'Ink', hex: '#111111' }],
  } });
  assert.equal(created.status, 201);
  assert.equal(created.data.slug, 'test-overshirt');
  assert.equal(created.data.price, 8950);
  const updated = await call(`/admin/products/${created.data.id}`, { method: 'PUT', token: admin.token,
    body: { ...created.data, price: 99, sizes: created.data.sizes } });
  assert.equal(updated.data.price, 9900);
  assert.equal((await call(`/admin/products/${created.data.id}`, { method: 'DELETE', token: admin.token })).status, 204);

  const orders = await call('/admin/orders', { token: admin.token });
  const patched = await call(`/admin/orders/${orders.data[0].id}`, { method: 'PATCH', token: admin.token, body: { status: 'shipped' } });
  assert.equal(patched.data.status, 'shipped');
});

test('newsletter and contact validate input', async () => {
  assert.equal((await call('/newsletter', { method: 'POST', body: { email: 'bad' } })).status, 400);
  assert.equal((await call('/newsletter', { method: 'POST', body: { email: 'fan@example.com' } })).status, 201);
  assert.equal((await call('/newsletter', { method: 'POST', body: { email: 'fan@example.com' } })).status, 201);
  assert.equal((await call('/contact', { method: 'POST', body: { name: 'Q', email: 'q@example.com', message: 'Hi!' } })).status, 201);
  assert.equal((await call('/contact', { method: 'POST', body: { name: '', email: 'q@example.com', message: '' } })).status, 400);
});
