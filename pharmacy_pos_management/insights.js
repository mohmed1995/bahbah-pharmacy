// الاستخدام في server.js بعد mountAdmin وقبل أي route آخر:
//   import { mountInsights } from './insights.js';  mountInsights(app, db);
// يحتوي: تتبع مجهول الهوية، ملخص الأداء، تنبيهات "بلّغني لما يتوفر"، سجل طلبات وأخطاء.
export function mountInsights(app, db) {
  db.exec(`
   create table if not exists events(id integer primary key autoincrement, type text, src text, n integer, q text, at text default current_timestamp);
   create index if not exists idx_ev on events(type, at);
   create table if not exists orders(id integer primary key autoincrement, phone text not null, total real, src text, at text default current_timestamp);
   create index if not exists idx_ord on orders(phone, at);
   create table if not exists incidents(id integer primary key autoincrement, severity text not null, note text, at text default current_timestamp);
   create table if not exists stock_watch(id integer primary key autoincrement, phone text not null, product_id integer not null,
     status text default 'waiting', created_at text default current_timestamp, expires_at text not null, notified_at text);
   create index if not exists idx_sw on stock_watch(status, product_id);`);
  const phoneOf = s => String(s||'').replace(/\D/g,'').replace(/^0/,'20');
  const okPhone = p => /^20(10|11|12|15)\d{8}$/.test(p);
  const track = (type, o = {}) => { try { db.prepare('insert into events(type,src,n,q) values(?,?,?,?)').run(type, o.src ?? null, o.n ?? null, o.q ?? null); } catch {} };

  // ---- تتبع بدون تعديل الـ handlers القديمة (بدون هاتف أو IP). نص البحث يُحفظ فقط لو لا نتيجة أو أول نتيجة غير متوفرة ----
  app.use('/api/search', (req, res, next) => { const j = res.json.bind(res);
    res.json = b => { try { const q = String(req.query.q||'').trim().toLowerCase();
      if (q.length >= 3) { const n = Array.isArray(b) ? b.length : 0, out = n > 0 && b[0].availability === 'out';
        track('search', { n, q: (n === 0 || out) ? q.slice(0,60) : null }); } } catch {} return j(b); }; next(); });
  app.use('/api/wa-link', (req, res, next) => { if (req.method === 'POST')
    track('wa_click', { src: String(req.body?.src || req.query?.src || '').slice(0,30) || null, q: String(req.body?.mode||'').slice(0,10) || null }); next(); });

  // ---- "بلّغني لما يتوفر" (عام، بدون دخول) ----
  const hits = new Map();
  const limited = ip => { const now = Date.now(), a = (hits.get(ip)||[]).filter(t => now - t < 3600e3); a.push(now); hits.set(ip, a); if (hits.size > 5000) hits.clear(); return a.length > 5; };
  app.post('/api/watch', (req, res) => {
    if (limited(req.headers['cf-connecting-ip'] || req.ip)) return res.status(429).json({ error: 'محاولات كتير، جرب بعد ساعة' });
    const { product_id, phone, consent } = req.body || {}, ph = phoneOf(phone);
    if (!consent) return res.status(400).json({ error: 'لازم توافق على الإشعار' });
    if (!okPhone(ph)) return res.status(400).json({ error: 'اكتب رقم موبايل مصري صحيح' });
    const p = db.prepare(`select id, name_ar as name, (stock_qty>0 and stock_synced_at>=datetime('now','-36 hours')) avail from products where id=?`).get(+product_id);
    if (!p) return res.status(404).json({ error: 'الدواء غير موجود' });
    if (p.avail) return res.status(409).json({ error: 'الدواء متوفر الآن، اطلبه مباشرة' });
    let restricted = 0; try { restricted = db.prepare('select restricted r from products where id=?').get(p.id)?.r || 0; } catch {}
    if (restricted) return res.status(403).json({ error: 'الصنف ده يُصرف بإجراءات المحل. كلّم الصيدلية' });
    if (db.prepare(`select count(*) c from stock_watch where phone=? and status='waiting'`).get(ph).c >= 5) return res.status(400).json({ error: 'وصلت للحد الأقصى من التنبيهات' });
    if (!db.prepare(`select 1 x from stock_watch where phone=? and product_id=? and status='waiting'`).get(ph, p.id)) {
      db.prepare(`insert into stock_watch(phone,product_id,expires_at) values(?,?,datetime('now','+30 days'))`).run(ph, p.id);
      track('watch', { n: 1 }); }
    res.json({ ok: true, name: p.name });
  });

  // ---- مسارات الأدمن (محمية بحارس mountAdmin لأنها تحت /api/admin) ----
  app.get('/api/admin/watch/ready', (_, res) => res.json(db.prepare(
    `select w.id, w.phone, p.name_ar product from stock_watch w join products p on p.id=w.product_id
     where w.status='waiting' and w.expires_at>datetime('now') and p.stock_qty>0 and p.stock_synced_at>=datetime('now','-36 hours')`).all()));
  app.post('/api/admin/watch/:id/:act', (q, res) => {
    const st = q.params.act === 'done' ? 'notified' : q.params.act === 'stop' ? 'stopped' : null;
    if (!st) return res.status(400).json({ error: 'bad' });
    db.prepare(`update stock_watch set status=?, notified_at=datetime('now') where id=?`).run(st, +q.params.id); res.json({ ok: 1 }); });

  app.post('/api/admin/orders', (q, res) => {
    const ph = phoneOf(q.body?.phone), total = Number(q.body?.total);
    if (!okPhone(ph) || !(total >= 0 && total < 100000)) return res.status(400).json({ error: 'رقم أو مبلغ غير صحيح' });
    db.prepare('insert into orders(phone,total,src) values(?,?,?)').run(ph, total, String(q.body?.src||'').slice(0,30) || null); res.json({ ok: 1 }); });
  app.post('/api/admin/incidents', (q, res) => {
    const sev = ['low','medium','high'].includes(q.body?.severity) ? q.body.severity : null;
    if (!sev) return res.status(400).json({ error: 'اختر الخطورة' });
    db.prepare('insert into incidents(severity,note) values(?,?)').run(sev, String(q.body?.note||'').slice(0,300)); res.json({ ok: 1 }); });

  app.get('/api/admin/stats', (q, res) => {
    const days = Math.min(90, Math.max(1, parseInt(q.query.days) || 7)), W = `datetime('now','-${days} days')`;
    const c = (sql) => db.prepare(sql).get().c, all = sql => db.prepare(sql).all();
    const o = db.prepare(`select count(*) n, ifnull(sum(total),0) t, count(distinct phone) cu from orders where at>=${W}`).get();
    res.json({ days,
      searches: c(`select count(*) c from events where type='search' and at>=${W}`),
      wa: all(`select ifnull(src,'مباشر') s, count(*) n from events where type='wa_click' and at>=${W} group by 1 order by n desc`),
      orders: { n: o.n, total: o.t, customers: o.cu,
        newCustomers: c(`select count(*) c from (select phone, min(at) f from orders group by phone) where f>=${W}`),
        allCustomers: c('select count(distinct phone) c from orders'),
        repeatCustomers: c('select count(*) c from (select phone from orders group by phone having count(*)>=2)') },
      reminders: {
        due: c(`select count(*) c from refill_reminders r join customers cu on cu.id=r.customer_id where r.active=1 and r.pharmacist_verified=1 and cu.wa_opt_in=1 and r.next_reminder_at<=date('now')`),
        sent: c(`select count(*) c from refill_reminders where last_sent_at>=${W}`),
        returned7d: c(`select count(*) c from refill_reminders r join customers cu on cu.id=r.customer_id where r.last_sent_at>=${W}
          and exists(select 1 from orders o where o.phone=cu.phone and o.at>r.last_sent_at and o.at<=datetime(r.last_sent_at,'+7 days'))`),
        optedIn: c('select count(*) c from customers where wa_opt_in=1'),
        stopped: c('select count(*) c from customers where wa_opt_in=0 and opt_in_at is not null') },
      gaps: all(`select q, count(*) n from events where type='search' and q is not null and at>=${W} group by q order by n desc limit 10`),
      watchTop: all(`select p.name_ar as name, count(*) n from stock_watch w join products p on p.id=w.product_id where w.created_at>=datetime('now','-30 days') group by w.product_id order by n desc limit 10`),
      incidents: all(`select id, severity, note, at from incidents where at>=datetime('now','-30 days') order by id desc limit 20`),
      highRecent: c(`select count(*) c from incidents where severity='high' and at>=datetime('now','-7 days')`) });
  });

  // ---- خصوصية: حذف الطلبات المنتهية، وأحداث أقدم من 90 يوم ----
  const purge = () => { try {
    db.exec(`delete from stock_watch where (status!='waiting' and ifnull(notified_at,created_at)<datetime('now','-7 days')) or expires_at<datetime('now','-7 days')`);
    db.exec(`delete from events where at<datetime('now','-90 days')`); } catch {} };
  purge(); setInterval(purge, 24 * 3600e3).unref();
}
