// اختبار الـ Worker على SQLite حقيقي (node:sqlite) بدل D1: node scripts/test.mjs
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import worker from '../worker/src/index.js';
import { buildSeedSql } from './seed.mjs';

const db = new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../worker/schema.sql', import.meta.url), 'utf8'));
const products = JSON.parse(readFileSync(new URL('../public/products.json', import.meta.url), 'utf8'));
db.exec(buildSeedSql(products));
db.exec(buildSeedSql(products)); // إعادة التشغيل لازم تكون آمنة

const wrap = (sql, args = []) => ({
  bind: (...a) => wrap(sql, a),
  async all() { return { results: db.prepare(sql).all(...args).map((r) => ({ ...r })) }; },
  async first() { const r = db.prepare(sql).get(...args); return r ? { ...r } : null; },
  async run() { const r = db.prepare(sql).run(...args); return { meta: { last_row_id: Number(r.lastInsertRowid) } }; },
});
const env = { DB: { prepare: (s) => wrap(s), batch: async (st) => { for (const s of st) await s.run(); } }, ADMIN_PASSWORD: 'test-pass-123', SESSION_SECRET: 'x'.repeat(40) };
const pending = [];
const ctx = { waitUntil: (p) => pending.push(p) };
let ip = 1;
const call = async (method, path, { body, cookie, ipAddr } = {}) => {
  const headers = { 'CF-Connecting-IP': ipAddr || '9.9.9.' + (ip++) };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  const r = await worker.fetch(new Request('https://x.test' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env, ctx);
  await Promise.all(pending.splice(0));
  return { status: r.status, j: await r.json(), headers: r.headers };
};
let n = 0; const ok = (name) => console.log('✓', name, ++n);

// بيانات
assert.equal(db.prepare('SELECT COUNT(*) c FROM products').get().c, products.length); ok('seed idempotent: ' + products.length);

// بحث
let r = await call('GET', '/api/search');
assert.equal(r.j.length, products.length); assert.ok(r.headers.get('Cache-Control').includes('max-age=60')); ok('catalog list');
r = await call('GET', '/api/search?q=' + encodeURIComponent('اوبلكس'));
assert.ok(r.j.length >= 1 && r.j.every((p) => (p.name + ' ' + p.generic).includes('اوبلكس'))); ok('arabic search');
r = await call('GET', '/api/search?q=' + encodeURIComponent("100%_'--"));
assert.equal(r.status, 200); assert.equal(r.j.length, 0); ok('hostile query safe');
assert.ok(db.prepare("SELECT COUNT(*) c FROM events WHERE t='gap'").get().c >= 1); ok('gap logged');

// واتش
const pid = products[0].id;
r = await call('POST', '/api/watch', { body: { id: pid, phone: '01011500166', consent: false } });
assert.equal(r.status, 400); ok('watch needs consent');
r = await call('POST', '/api/watch', { body: { id: pid, phone: '123', consent: true } });
assert.equal(r.status, 400); ok('watch phone validated');
r = await call('POST', '/api/watch', { body: { product_id: pid, phone: '+201011500166', consent: true }, ipAddr: '1.1.1.1' });
assert.equal(r.status, 200); assert.equal(r.j.name, products[0].name);
await call('POST', '/api/watch', { body: { product_id: pid, phone: '01011500166', consent: true }, ipAddr: '1.1.1.1' });
assert.equal(db.prepare('SELECT COUNT(*) c FROM watch').get().c, 1); ok('watch dedup + intl phone');
r = await call('POST', '/api/watch', { body: { id: 999999, phone: '01011500166', consent: true } });
assert.equal(r.status, 404); ok('watch unknown product');

// كارت شهري
r = await call('POST', '/api/monthly/register', { body: { name: 'مريض تجريبي', phone: '01011500166', area: 'ديروط', cycle_days: '30', vip_code: 'BB-ABCDEFGH' } });
assert.equal(r.j.vip_code, 'BB-ABCDEFGH');
r = await call('POST', '/api/monthly/register', { body: { name: 'تاني', phone: '01011500166', area: 'ديروط', vip_code: 'BB-ABCDEFGH' } });
assert.equal(r.status, 200); assert.notEqual(r.j.vip_code, 'BB-ABCDEFGH'); assert.match(r.j.vip_code, /^BB-[A-HJ-NP-Z2-9]{8}$/); ok('vip code collision → new code');
r = await call('POST', '/api/monthly/register', { body: { name: '', phone: '01011500166', area: 'x' } });
assert.equal(r.status, 400); ok('monthly validation');

// CSRF: فورم عادي مش مقبول
const form = await worker.fetch(new Request('https://x.test/api/watch', { method: 'POST', headers: { 'Content-Type': 'text/plain', 'CF-Connecting-IP': '5.5.5.5' }, body: '{}' }), env, ctx);
assert.equal(form.status, 400); ok('non-json rejected');

// إدارة
r = await call('GET', '/api/admin/stats'); assert.equal(r.status, 401); ok('admin needs auth');
for (let i = 0; i < 5; i++) { r = await call('POST', '/api/admin/login', { body: { password: 'wrong' }, ipAddr: '7.7.7.7' }); assert.equal(r.status, 401); }
r = await call('POST', '/api/admin/login', { body: { password: 'test-pass-123' }, ipAddr: '7.7.7.7' });
assert.equal(r.status, 429); ok('login rate limited');
r = await call('POST', '/api/admin/login', { body: { password: 'test-pass-123' }, ipAddr: '8.8.8.8' });
assert.equal(r.status, 200);
const sc = r.headers.get('Set-Cookie'); assert.match(sc, /HttpOnly/); assert.match(sc, /Secure/); assert.match(sc, /SameSite=Strict/);
const cookie = sc.split(';')[0]; ok('login sets secure cookie');
r = await call('GET', '/api/admin/me', { cookie: cookie.slice(0, -2) + 'zz' }); assert.equal(r.status, 401); ok('tampered cookie rejected');
r = await call('GET', '/api/admin/me', { cookie }); assert.equal(r.status, 200);

await call('POST', '/api/admin/orders', { cookie, body: { phone: '01011500166', total: 120, src: 'rx' } });
await call('POST', '/api/admin/orders', { cookie, body: { phone: '01011500166', total: 80, src: 'bag' } });
r = await call('POST', '/api/admin/orders', { cookie, body: { phone: '01011500166', total: -5 } }); assert.equal(r.status, 400);
await call('POST', '/api/admin/incidents', { cookie, body: { severity: 'high', note: 'تركيز غلط' } });
r = await call('POST', '/api/admin/reminders', { cookie, body: { phone: '01011500166', name: 'ع', product_id: pid, cycle_days: 30, last_filled: '2026-01-01', opt_in: true } });
assert.equal(r.status, 200);
r = await call('POST', '/api/admin/reminders', { cookie, body: { phone: '01011500166', last_filled: '2026-01-01', opt_in: false } });
assert.equal(r.status, 400); ok('reminder needs opt-in');

r = await call('GET', '/api/admin/stats?days=30', { cookie });
const s = r.j;
for (const k of ['searches', 'wa', 'highRecent', 'orders', 'reminders', 'watchTop', 'gaps', 'incidents']) assert.ok(k in s, 'stats.' + k);
for (const k of ['n', 'total', 'newCustomers', 'repeatCustomers', 'allCustomers']) assert.ok(k in s.orders, 'orders.' + k);
for (const k of ['due', 'sent', 'returned7d', 'optedIn', 'stopped']) assert.ok(k in s.reminders, 'reminders.' + k);
assert.equal(s.orders.n, 2); assert.equal(s.orders.total, 200); assert.equal(s.highRecent, 1); assert.equal(s.reminders.due, 1);
assert.equal(s.watchTop.length, 1); ok('stats shape matches admin/stats.html');

// جاهز للإبلاغ: بس لو المخزون > 0 (كل المنتجات عندها مخزون)
r = await call('GET', '/api/admin/watch/ready', { cookie });
assert.equal(r.j.length, 1); assert.match(r.j[0].phone, /^201\d{9}$/); ok('watch ready → wa.me phone');
await call('POST', '/api/admin/watch/' + r.j[0].id + '/done', { cookie });
await worker.scheduled({}, env);
assert.equal(db.prepare('SELECT COUNT(*) c FROM watch').get().c, 0); ok('cron purges notified watch');

// منتجات
r = await call('PUT', '/api/admin/products/' + pid, { cookie, body: { price: 55.5, stock: 0, restricted: true } });
assert.equal(r.status, 200);
const row = db.prepare('SELECT price, stock, restricted FROM products WHERE id = ?').get(pid);
assert.deepEqual({ ...row }, { price: 55.5, stock: 0, restricted: 1 });
db.exec(buildSeedSql(products));
assert.equal(db.prepare('SELECT price FROM products WHERE id = ?').get(pid).price, 55.5); ok('reseed keeps price/stock edits');
r = await call('GET', '/api/search?q=' + encodeURIComponent(products[0].name.split(' ')[0]));
assert.ok(r.j.find((p) => p.id === pid).restricted === true); ok('restricted exposed as boolean');

await call('POST', '/api/admin/logout', { cookie });
console.log('\nكل الاختبارات نجحت (' + n + ')');
