// الاستخدام في server.js: ضع السطرين التاليين مباشرة بعد app.use(express.json()) وقبل أي route آخر
//   import { mountAdmin } from './admin.js';  mountAdmin(app, db, load);
import crypto from 'node:crypto';
import path from 'node:path';
export function mountAdmin(app, db, onChange = () => {}) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass || pass.length < 10) throw new Error('عيّن ADMIN_PASSWORD (10 حروف على الأقل)');
  const safe = (a,b) => { const x=Buffer.from(a), y=Buffer.from(b); return x.length===y.length && crypto.timingSafeEqual(x,y); };
  // دعم تسجيل الدخول بالجلسة / الكوكيز لتسهيل الدخول من المتصفح بدون Basic Auth المعقدة
  app.get('/admin/login', (_, res) => {
    res.send(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>تسجيل دخول الصيدلي — صيدلية بحبح</title>
      <style>
        body{margin:0;background:#F4F7F6;color:#10201F;font-family:Tahoma,sans-serif;display:grid;place-items:center;min-height:100vh}
        .box{background:#fff;padding:28px 24px;border-radius:16px;box-shadow:0 12px 30px rgba(0,0,0,0.08);width:min(90%,360px);text-align:center}
        h2{margin:0 0 8px;color:#0E5A57}
        p{margin:0 0 20px;color:#5B6E6C;font-size:13.5px}
        input{width:100%;box-sizing:border-box;padding:12px;margin-bottom:14px;border:1.5px solid #D8E2E0;border-radius:10px;font-size:15px}
        button{width:100%;padding:12px;background:#0E5A57;color:#fff;border:0;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer}
        button:hover{background:#12736F}
        .err{color:#A12727;font-size:13px;margin-top:10px;display:none}
      </style></head><body>
      <div class="box">
        <h2>صيدلية بحبح</h2>
        <p>لوحة التحكم وإدارة المنتجات</p>
        <form onsubmit="event.preventDefault();doLogin()">
          <input type="password" id="pw" placeholder="كلمة المرور الخاصة بالصيدلي" required autofocus>
          <button type="submit">دخول إلى لوحة التحكم ⬅️</button>
          <div class="err" id="err">كلمة المرور غير صحيحة، حاول مجدداً</div>
        </form>
      </div>
      <script>
        async function doLogin(){
          const pw = document.getElementById('pw').value;
          const r = await fetch('/api/admin/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})});
          if(r.ok){ location.href='/admin'; }
          else { document.getElementById('err').style.display='block'; }
        }
      </script></body></html>`);
  });

  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body || {};
    if (password && safe(password, pass)) {
      res.setHeader('Set-Cookie', `bahbah_admin=${Buffer.from(pass).toString('base64')}; Path=/; HttpOnly; SameSite=Lax`);
      return res.json({ ok: 1 });
    }
    res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
  });

  const guard = (req,res,next) => {
    // 1) فحص الكوكيز أولاً (الأسهل للمتصفح)
    const cookies = req.headers.cookie || '';
    const match = cookies.match(/bahbah_admin=([^;]+)/);
    if (match && match[1]) {
      const decoded = Buffer.from(match[1], 'base64').toString();
      if (safe(decoded, pass)) return next();
    }
    // 2) فحص Basic Auth التقليدي
    const h = req.headers.authorization || '';
    const pw = h.startsWith('Basic ') ? Buffer.from(h.slice(6),'base64').toString().split(/:(.*)/s)[1] : null;
    if (pw && safe(pw, pass)) return next();

    // لو الطلب من صفحة ويب مباشرة وجهه لصفحة الدخول السهلة
    if (req.accepts('html')) {
      return res.redirect('/admin/login');
    }
    res.set('WWW-Authenticate','Basic realm="bahbah"').status(401).send('مطلوب تسجيل دخول');
  };
  app.use(['/admin','/api/admin'], guard);                       // يحمي القديم والجديد
  app.get('/admin', (_,res) => res.sendFile(path.resolve('admin/admin.html')));   // خارج public عمدًا
  app.get('/admin/rx', (_,res) => res.sendFile(path.resolve('admin/rx.html')));
  app.get('/admin/remind', (_,res) => res.sendFile(path.resolve('admin/remind.html')));
  app.get('/admin/stats', (_,res) => res.sendFile(path.resolve('admin/stats.html')));

  app.get('/api/admin/reminders/due', (_,res) => res.json(db.prepare(
    `select r.id, r.cycle_days, c.phone, c.name, c.area, p.name_ar product
     from refill_reminders r join customers c on c.id=r.customer_id join products p on p.id=r.product_id
     where r.active=1 and r.pharmacist_verified=1 and c.wa_opt_in=1 and r.next_reminder_at<=date('now')
     order by r.next_reminder_at`).all()));
  app.get('/api/admin/monthly/requests', (_,res) => res.json(db.prepare(
    `select id, name, phone, area, cycle_days, notes, status, created_at from monthly_requests where status='new' order by id desc`).all()));
  app.post('/api/admin/monthly/requests/:id/done', (q,res) => {
    db.prepare(`update monthly_requests set status='completed' where id=?`).run(+q.params.id);
    res.json({ok:1}); });
  app.post('/api/admin/reminders/:id/done', (q,res) => {
    db.prepare(`update refill_reminders set last_sent_at=datetime('now'), next_reminder_at=date('now','+'||cycle_days||' days') where id=?`).run(+q.params.id);
    res.json({ok:1}); });
  app.post('/api/admin/reminders/:id/stop', (q,res) => {            // العميل طلب الإيقاف
    const r = db.prepare('select customer_id from refill_reminders where id=?').get(+q.params.id);
    if (r) { db.prepare('update customers set wa_opt_in=0 where id=?').run(r.customer_id);
             db.prepare('update refill_reminders set active=0 where customer_id=?').run(r.customer_id); }
    res.json({ok:1}); });

  // تعديل سريع للمخزون أو السعر المباشر
  app.post('/api/admin/products/:id/quick-update', (q, res) => {
    try {
      const id = +q.params.id;
      const { price, stock } = q.body || {};
      if (price != null) {
        db.prepare('update products set price_public=? where id=?').run(+price, id);
      }
      if (stock != null) {
        db.prepare('update products set stock_qty=?, stock_synced_at=datetime("now") where id=?').run(+stock, id);
      }
      onChange();
      res.json({ ok: 1 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // إدارة المنتجات في قاعدة البيانات مع فلتر المتوفر / غير المتوفر وإحصائيات
  app.get('/api/admin/products', (q, res) => {
    const search = q.query.q ? `%${q.query.q.trim()}%` : '%';
    const cat = q.query.cat;
    const filter = q.query.filter; // 'in_stock', 'out_of_stock', 'all'
    
    let sql = `select id, name_ar, active_ingredient, strength, form, category, price_public, stock_qty, restricted, image_url from products where name_ar like ?`;
    const params = [search];
    if (cat) { sql += ` and category = ?`; params.push(cat); }
    if (filter === 'in_stock') { sql += ` and ifnull(stock_qty,0) > 0`; }
    else if (filter === 'out_of_stock') { sql += ` and ifnull(stock_qty,0) <= 0`; }
    sql += ` order by id desc limit 60`;

    // إحصائيات سريعة للوحة
    const counts = db.prepare(`select 
      count(1) as total,
      sum(case when ifnull(stock_qty,0) > 0 then 1 else 0 end) as in_stock,
      sum(case when ifnull(stock_qty,0) <= 0 then 1 else 0 end) as out_of_stock
      from products`).get();

    res.json({ items: db.prepare(sql).all(...params), stats: counts });
  });

  app.post('/api/admin/products', (q, res) => {
    try {
      const { name_ar, price_public, stock_qty, category, active_ingredient, strength, form, restricted, image_url } = q.body || {};
      if (!name_ar) return res.status(400).json({ error: 'اسم المنتج مطلوب' });
      const stmt = db.prepare(`insert into products(name_ar, name_normalized, price_public, stock_qty, category, active_ingredient, strength, form, restricted, image_url, ai_verified)
        values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`);
      const info = stmt.run(name_ar, name_ar.toLowerCase(), +price_public || 0, stock_qty != null ? +stock_qty : 10, category || 'أدوية', active_ingredient || '', strength || '', form || '', restricted ? 1 : 0, image_url || '');
      onChange();
      res.json({ ok: 1, id: info.lastInsertRowid });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/products/:id', (q, res) => {
    try {
      const id = +q.params.id;
      const { name_ar, price_public, stock_qty, category, active_ingredient, strength, form, restricted, image_url } = q.body || {};
      db.prepare(`update products set name_ar=?, price_public=?, stock_qty=?, category=?, active_ingredient=?, strength=?, form=?, restricted=?, image_url=? where id=?`)
        .run(name_ar, +price_public || 0, stock_qty != null ? +stock_qty : 0, category || 'أدوية', active_ingredient || '', strength || '', form || '', restricted ? 1 : 0, image_url || '', id);
      onChange();
      res.json({ ok: 1 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/products/:id/delete', (q, res) => {
    try {
      db.prepare(`delete from products where id=?`).run(+q.params.id);
      onChange();
      res.json({ ok: 1 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/review', (q,res) => {
    const missing = q.query.mode === 'missing';
    res.json(db.prepare(`select id, name_ar as name, active_ingredient ai, strength, form, ai_source from products
      where ifnull(ai_verified,0)=0 and active_ingredient ${missing?'is null and ifnull(ai_source,"")<>"rejected"':'is not null'}
      order by name_ar limit 30`).all()); });
  app.post('/api/admin/review/:id', (q,res) => {
    const { ai, strength, form, ok } = q.body || {}, id = +q.params.id;
    if (ok && ai && strength && form)
      db.prepare(`update products set active_ingredient=?,strength=?,form=?,ai_verified=1,ai_source='manual' where id=?`).run(ai.trim().toLowerCase(),strength.trim(),form.trim(),id);
    else db.prepare(`update products set active_ingredient=null,strength=null,form=null,ai_verified=0,ai_source='rejected' where id=?`).run(id);
    onChange(); res.json({ok:1}); });
}
