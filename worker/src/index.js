// صيدلية بحبح — Cloudflare Worker (API) + D1.
// الموقع نفسه ملفات ثابتة من ./public، والـ Worker بيخدم /api/* بس (راجع wrangler.toml).
// الأسرار (بتتضاف بـ wrangler secret put): ADMIN_PASSWORD, SESSION_SECRET

const enc = new TextEncoder();
const PHONE_RE = /^01\d{9}$/;
const SRC_OK = new Set(['bag', 'qr', 'group', 'phone', 'other', 'rx']);
const SESSION_HOURS = 12;

/* ---------- أدوات عامة ---------- */
// نفس تطبيع الواجهة (bbNorm في index.html) عشان البحث يطلع نفس النتائج
export function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ًͯ-ٰٟ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '')
    .trim();
}

export function cleanPhone(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.startsWith('20') && d.length === 12) d = '0' + d.slice(2);
  return PHONE_RE.test(d) ? d : null;
}

const SEC_HEADERS = { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };
const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...SEC_HEADERS, ...extra },
  });
const err = (status, error) => json({ error }, status);

const text = (v, max) => String(v ?? '').trim().slice(0, max);

async function body(request) {
  const ct = request.headers.get('Content-Type') || '';
  if (!ct.includes('application/json')) return null; // يمنع CSRF من فورم عادي
  try { return await request.json(); } catch { return null; }
}

const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function safeEqual(a, b) {
  const x = enc.encode(a), y = enc.encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}

/* ---------- حد المحاولات (D1) ---------- */
async function rateLimit(env, key, max, windowSec) {
  const w = Math.floor(Date.now() / 1000 / windowSec);
  await env.DB.prepare('INSERT INTO rl (k, w, n, exp) VALUES (?, ?, 1, ?) ON CONFLICT(k, w) DO UPDATE SET n = n + 1').bind(key, w, (w + 1) * windowSec).run();
  const row = await env.DB.prepare('SELECT n FROM rl WHERE k = ? AND w = ?').bind(key, w).first();
  return (row?.n || 0) <= max;
}
const ipOf = (request) => request.headers.get('CF-Connecting-IP') || 'local';

/* ---------- جلسة الإدارة (كوكي HttpOnly موقّع) ---------- */
async function makeSession(env) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600;
  return `${exp}.${await hmac(env.SESSION_SECRET, 'admin.' + exp)}`;
}
async function isAdmin(request, env) {
  if (!env.SESSION_SECRET) return false;
  const m = /(?:^|;\s*)bb_admin=([^;]+)/.exec(request.headers.get('Cookie') || '');
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(env.SESSION_SECRET, 'admin.' + exp));
}
const cookie = (value, maxAge) =>
  `bb_admin=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;

/* ---------- المنتجات ---------- */
const PCOLS = 'id, name, generic, category, price, stock, img, restricted';
const shape = (r) => ({ ...r, restricted: !!r.restricted });

async function search(request, env, ctx, url) {
  const q = norm(url.searchParams.get('q') || '');
  let rows;
  if (!q) {
    // الواجهة بتفلتر الأقسام عندها، فبنرجّع الكتالوج كله (بيتكاش دقيقة على الحافة)
    rows = (await env.DB.prepare(`SELECT ${PCOLS} FROM products ORDER BY id`).all()).results;
    return json(rows.map(shape), 200, { 'Cache-Control': 'public, max-age=60' });
  }
  const terms = q.split(/\s+/).filter(Boolean).slice(0, 6);
  const where = terms.map(() => "search LIKE ? ESCAPE '\\'").join(' AND ');
  const args = terms.map((t) => '%' + t.replace(/[\\%_]/g, '\\$&') + '%');
  rows = (await env.DB.prepare(`SELECT ${PCOLS} FROM products WHERE ${where} ORDER BY (stock > 0) DESC, id LIMIT 200`).bind(...args).all()).results;

  ctx.waitUntil((async () => {
    if (!(await rateLimit(env, 'ev:' + ipOf(request), 120, 60))) return;
    await env.DB.prepare('INSERT INTO events (t, q) VALUES (?, ?)').bind(rows.length ? 'search' : 'gap', q.slice(0, 60)).run();
  })().catch(() => {}));
  return json(rows.map(shape));
}

/* ---------- نقاط عامة ---------- */
async function watch(request, env) {
  if (!(await rateLimit(env, 'watch:' + ipOf(request), 20, 3600))) return err(429, 'too_many_requests');
  const b = await body(request);
  if (!b) return err(400, 'bad_request');
  const phone = cleanPhone(b.phone);
  const pid = Number(b.product_id ?? b.id);
  if (!phone) return err(400, 'رقم الموبايل غير صحيح');
  if (b.consent !== true) return err(400, 'لازم توافق على استلام رسالة واتساب');
  const p = await env.DB.prepare('SELECT id, name FROM products WHERE id = ?').bind(pid).first();
  if (!p) return err(404, 'المنتج غير موجود');
  const dup = await env.DB.prepare("SELECT id FROM watch WHERE product_id = ? AND phone = ? AND status = 'waiting'").bind(pid, phone).first();
  if (!dup) await env.DB.prepare('INSERT INTO watch (product_id, phone) VALUES (?, ?)').bind(pid, phone).run();
  return json({ ok: true, name: p.name });
}

const VIP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newVipCode() {
  const b = crypto.getRandomValues(new Uint8Array(8));
  return 'BB-' + Array.from(b, (x) => VIP_ALPHABET[x % VIP_ALPHABET.length]).join('');
}

async function monthlyRegister(request, env) {
  if (!(await rateLimit(env, 'mo:' + ipOf(request), 10, 3600))) return err(429, 'too_many_requests');
  const b = await body(request);
  if (!b) return err(400, 'bad_request');
  const name = text(b.name, 80), area = text(b.area, 200), notes = text(b.notes, 500);
  const phone = cleanPhone(b.phone);
  const cycle = Math.min(90, Math.max(7, parseInt(b.cycle_days, 10) || 30));
  if (!name || !area) return err(400, 'الاسم والعنوان مطلوبين');
  if (!phone) return err(400, 'رقم الموبايل غير صحيح');
  let code = /^BB-[A-HJ-NP-Z2-9]{8}$/.test(b.vip_code || '') ? b.vip_code : newVipCode();
  for (let i = 0; i < 5; i++) {
    try {
      await env.DB.prepare('INSERT INTO monthly (vip_code, name, phone, area, cycle_days, notes) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(code, name, phone, area, cycle, notes).run();
      return json({ ok: true, vip_code: code });
    } catch (e) {
      if (!/UNIQUE|constraint/i.test(String(e))) throw e;
      code = newVipCode();
    }
  }
  return err(500, 'تعذر إنشاء الكود');
}

async function event(request, env) {
  if (!(await rateLimit(env, 'ev:' + ipOf(request), 120, 60))) return json({ ok: true });
  const b = await body(request);
  if (!b || b.t !== 'wa') return err(400, 'bad_request');
  await env.DB.prepare('INSERT INTO events (t, s) VALUES (?, ?)').bind('wa', text(b.s, 30) || 'other').run();
  return json({ ok: true });
}

/* ---------- نقاط الإدارة ---------- */
async function adminLogin(request, env) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return err(503, 'admin_not_configured');
  if (!(await rateLimit(env, 'login:' + ipOf(request), 5, 900))) return err(429, 'too_many_attempts');
  const b = await body(request);
  if (!b || typeof b.password !== 'string') return err(400, 'bad_request');
  const a = b64u(await crypto.subtle.digest('SHA-256', enc.encode(b.password)));
  const c = b64u(await crypto.subtle.digest('SHA-256', enc.encode(env.ADMIN_PASSWORD)));
  if (!safeEqual(a, c)) return err(401, 'invalid_password');
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(await makeSession(env), SESSION_HOURS * 3600) });
}

async function adminStats(env, url) {
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days'), 10) || 7));
  const since = `-${days} days`;
  const one = async (sql, ...a) => (await env.DB.prepare(sql).bind(...a).first()) || {};
  const all = async (sql, ...a) => (await env.DB.prepare(sql).bind(...a).all()).results;

  const searches = (await one("SELECT COUNT(*) n FROM events WHERE t IN ('search','gap') AND at >= datetime('now', ?)", since)).n || 0;
  const wa = await all("SELECT s, COUNT(*) n FROM events WHERE t = 'wa' AND at >= datetime('now', ?) GROUP BY s ORDER BY n DESC", since);
  const o = await one("SELECT COUNT(*) n, COALESCE(SUM(total), 0) total, COUNT(DISTINCT phone) allCustomers FROM orders WHERE created_at >= datetime('now', ?)", since);
  const newC = await one(`SELECT COUNT(*) n FROM (SELECT phone FROM orders GROUP BY phone HAVING MIN(created_at) >= datetime('now', ?))`, since);
  const rep = await one(`SELECT COUNT(*) n FROM (SELECT phone FROM orders WHERE phone IN (SELECT phone FROM orders WHERE created_at >= datetime('now', ?)) GROUP BY phone HAVING COUNT(*) > 1)`, since);
  const due = await one("SELECT COUNT(*) n FROM reminders WHERE opt_in = 1 AND stopped = 0 AND date(last_filled, '+' || cycle_days || ' days') <= date('now')");
  const sent = await one("SELECT COUNT(*) n FROM reminders WHERE last_sent_at >= datetime('now', ?)", since);
  const ret = await one(`SELECT COUNT(*) n FROM reminders r WHERE r.last_sent_at >= datetime('now', ?) AND EXISTS (SELECT 1 FROM orders o WHERE o.phone = r.phone AND o.created_at > r.last_sent_at AND o.created_at <= datetime(r.last_sent_at, '+7 days'))`, since);
  const opt = await one('SELECT COUNT(*) n FROM reminders WHERE opt_in = 1');
  const stopped = await one('SELECT COUNT(*) n FROM reminders WHERE stopped = 1');
  const watchTop = await all("SELECT p.name, COUNT(*) n FROM watch w JOIN products p ON p.id = w.product_id WHERE w.status = 'waiting' GROUP BY w.product_id ORDER BY n DESC LIMIT 10");
  const gaps = await all("SELECT q, COUNT(*) n FROM events WHERE t = 'gap' AND at >= datetime('now', ?) GROUP BY q ORDER BY n DESC LIMIT 10", since);
  const high = await one("SELECT COUNT(*) n FROM incidents WHERE severity = 'high' AND at >= datetime('now', '-7 days')");
  const incidents = await all('SELECT at, severity, note FROM incidents ORDER BY id DESC LIMIT 20');

  return json({
    searches, wa, highRecent: high.n || 0,
    orders: { n: o.n || 0, total: o.total || 0, newCustomers: newC.n || 0, repeatCustomers: rep.n || 0, allCustomers: o.allCustomers || 0 },
    reminders: { due: due.n || 0, sent: sent.n || 0, returned7d: ret.n || 0, optedIn: opt.n || 0, stopped: stopped.n || 0 },
    watchTop, gaps, incidents,
  });
}

async function adminRoute(request, env, url) {
  const path = url.pathname, method = request.method;

  if (path === '/api/admin/login' && method === 'POST') return adminLogin(request, env);
  if (path === '/api/admin/logout' && method === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
  if (!(await isAdmin(request, env))) return err(401, 'unauthorized');

  if (path === '/api/admin/me' && method === 'GET') return json({ ok: true });
  if (path === '/api/admin/stats' && method === 'GET') return adminStats(env, url);

  if (path === '/api/admin/watch/ready' && method === 'GET') {
    const r = await env.DB.prepare("SELECT w.id, p.name AS product, w.phone FROM watch w JOIN products p ON p.id = w.product_id WHERE w.status = 'waiting' AND p.stock > 0 ORDER BY w.id").all();
    return json(r.results.map((x) => ({ ...x, phone: '2' + x.phone }))); // صيغة wa.me: 20...
  }
  let m = /^\/api\/admin\/watch\/(\d+)\/(done|stop)$/.exec(path);
  if (m && method === 'POST') {
    await env.DB.prepare('UPDATE watch SET status = ? WHERE id = ?').bind(m[2] === 'done' ? 'done' : 'stopped', Number(m[1])).run();
    return json({ ok: true });
  }

  if (path === '/api/admin/orders' && method === 'POST') {
    const b = await body(request);
    const phone = cleanPhone(b?.phone), total = Number(b?.total);
    if (!phone) return err(400, 'رقم الموبايل غير صحيح');
    if (!Number.isFinite(total) || total < 0 || total > 1e7) return err(400, 'المبلغ غير صحيح');
    const src = SRC_OK.has(b.src) ? b.src : 'other';
    await env.DB.prepare('INSERT INTO orders (phone, total, src) VALUES (?, ?, ?)').bind(phone, total, src).run();
    return json({ ok: true });
  }

  if (path === '/api/admin/incidents' && method === 'POST') {
    const b = await body(request);
    const note = text(b?.note, 300);
    if (!['low', 'medium', 'high'].includes(b?.severity)) return err(400, 'اختار الخطورة');
    if (!note) return err(400, 'اكتب وصف مختصر');
    await env.DB.prepare('INSERT INTO incidents (severity, note) VALUES (?, ?)').bind(b.severity, note).run();
    return json({ ok: true });
  }

  if (path === '/api/admin/reminders' && method === 'POST') {
    const b = await body(request);
    const phone = cleanPhone(b?.phone);
    if (!phone) return err(400, 'رقم الموبايل غير صحيح');
    if (b.opt_in !== true) return err(400, 'لازم موافقة العميل على التذكير');
    const last = /^\d{4}-\d{2}-\d{2}$/.test(b.last_filled || '') ? b.last_filled : null;
    if (!last) return err(400, 'تاريخ آخر صرف غير صحيح');
    const cycle = Math.min(180, Math.max(7, parseInt(b.cycle_days, 10) || 30));
    await env.DB.prepare('INSERT INTO reminders (phone, name, area, product_id, cycle_days, last_filled, opt_in) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .bind(phone, text(b.name, 80), text(b.area, 200), Number(b.product_id) || null, cycle, last).run();
    return json({ ok: true });
  }
  m = /^\/api\/admin\/reminders\/(\d+)\/(sent|stop)$/.exec(path);
  if (m && method === 'POST') {
    const sql = m[2] === 'sent' ? "UPDATE reminders SET last_sent_at = datetime('now') WHERE id = ?" : 'UPDATE reminders SET stopped = 1 WHERE id = ?';
    await env.DB.prepare(sql).bind(Number(m[1])).run();
    return json({ ok: true });
  }

  if (path === '/api/admin/monthly' && method === 'GET') {
    const r = await env.DB.prepare('SELECT vip_code, name, phone, area, cycle_days, notes, created_at FROM monthly ORDER BY created_at DESC LIMIT 500').all();
    return json(r.results);
  }

  if (path === '/api/admin/products' && method === 'POST') {
    const b = await body(request);
    const name = text(b?.name, 100), price = Number(b?.price), stock = Number(b?.stock);
    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) return err(400, 'راجع الاسم والسعر والكمية');
    const generic = text(b.generic, 160);
    const r = await env.DB.prepare('INSERT INTO products (name, generic, category, price, stock, img, restricted, search) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(name, generic, text(b.category, 40), price, stock, text(b.img, 300), b.restricted ? 1 : 0, norm(name + ' ' + generic)).run();
    return json({ ok: true, id: r.meta?.last_row_id });
  }
  m = /^\/api\/admin\/products\/(\d+)$/.exec(path);
  if (m && method === 'PUT') {
    const b = await body(request);
    const id = Number(m[1]);
    const cur = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
    if (!cur) return err(404, 'not_found');
    const name = text(b?.name ?? cur.name, 100), generic = text(b?.generic ?? cur.generic, 160);
    const price = Number(b?.price ?? cur.price), stock = Number(b?.stock ?? cur.stock);
    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) return err(400, 'راجع الاسم والسعر والكمية');
    await env.DB.prepare("UPDATE products SET name = ?, generic = ?, price = ?, stock = ?, restricted = ?, search = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(name, generic, price, stock, (b?.restricted ?? !!cur.restricted) ? 1 : 0, norm(name + ' ' + generic), id).run();
    return json({ ok: true });
  }

  return err(404, 'not_found');
}

/* ---------- الدخول ---------- */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(request) : err(404, 'not_found');
    try {
      const { pathname: p } = url, method = request.method;
      if (p.startsWith('/api/admin/')) return await adminRoute(request, env, url);
      if (p === '/api/search' && method === 'GET') return await search(request, env, ctx, url);
      if (p === '/api/watch' && method === 'POST') return await watch(request, env);
      if (p === '/api/monthly/register' && method === 'POST') return await monthlyRegister(request, env);
      if (p === '/api/event' && method === 'POST') return await event(request, env);
      return err(404, 'not_found');
    } catch (e) {
      console.error('api error', e?.stack || e);
      return err(500, 'server_error');
    }
  },

  // يومياً: حذف بيانات انتهت مدتها (وعدنا العميل بحذف رقمه بعد الإبلاغ أو 30 يوم)
  async scheduled(_event, env) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM watch WHERE status != 'waiting' OR created_at < datetime('now', '-30 days')"),
      env.DB.prepare("DELETE FROM events WHERE at < datetime('now', '-90 days')"),
      env.DB.prepare('DELETE FROM rl WHERE exp < ?').bind(Math.floor(Date.now() / 1000)),
    ]);
  },
};
