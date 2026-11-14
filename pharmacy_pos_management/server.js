import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import cron from 'node-cron';
import { mountAdmin } from './admin.js';
import { mountInsights } from './insights.js';

/* ===== إعدادات: عدّل أسماء الأعمدة لو مختلفة في pharmacy.db ===== */
const C = { table:'products', id:'id', name:'name_ar', price:'price_public', category:'category', image:'image_url' };
const WA_NUMBER = process.env.WA_NUMBER || '2010XXXXXXXX';       // رقم بحبح بالصيغة الدولية بدون +
const WA_TOKEN = process.env.WA_TOKEN, WA_PHONE_ID = process.env.WA_PHONE_ID;
const WA_TEMPLATE = process.env.WA_TEMPLATE || 'refill_reminder'; // لازم تتعمل وتتوافق عليها من Meta
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Bahbah@Secure2026';
const db = new DatabaseSync(process.env.DB_PATH || 'pharmacy.db');
db.exec('PRAGMA journal_mode = WAL;');

/* ===== تطبيع النص العربي ===== */
export const norm = (s='') => String(s).toLowerCase()
  .replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')
  .replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();

/* ===== 1) محرك البحث + المثيل (في الذاكرة: 1,547 منتج = لحظي) ===== */
let CAT = [];
function load() {
  CAT = db.prepare(`select ${C.id} id, ${C.name} name, ${C.price} price, ${C.category} category, ${C.image} image,
      ifnull(restricted, 0) restricted,
      case when ai_verified=1 then active_ingredient end ai,
      case when ai_verified=1 then strength end strength,
      case when ai_verified=1 then form end form,
      case when stock_synced_at >= datetime('now','-36 hours') then stock_qty end stock_qty from ${C.table}`).all()
    .map(p => ({ ...p, n: norm(p.name), ain: norm(p.ai||''), tokens: norm(p.name).split(' ') }));
}
load();

function lev(a,b){ if(a===b) return 0; const m=a.length,n=b.length; if(!m||!n) return Math.max(m,n);
  let prev=Array.from({length:n+1},(_,i)=>i);
  for(let i=1;i<=m;i++){ const cur=[i]; for(let j=1;j<=n;j++)
    cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1)); prev=cur; } return prev[n]; }

function score(p, qt){ let s=0;
  for(const t of qt){
    if(p.n.includes(t)) { s+=3; if(p.tokens.some(x=>x.startsWith(t))) s+=1; continue; }
    if(p.ain && p.ain.includes(t)) { s+=2; continue; }
    const best=Math.min(...p.tokens.map(x=>lev(x.slice(0,t.length+1),t)));
    if(t.length>=4 && best<=1) s+=1.5; else if(t.length>=6 && best<=2) s+=1; else return 0;
  } return s; }

const availability = p => p.stock_qty==null ? 'unknown' : p.stock_qty<=0 ? 'out' : p.stock_qty<=2 ? 'low' : 'in_stock';

function equivalents(p){
  if(!p.ain || !p.strength || !p.form) return [];
  return CAT.filter(x=>x.id!==p.id && x.ain===p.ain && x.strength===p.strength && x.form===p.form
      && x.price>0 && availability(x)!=='out')
    .sort((a,b)=>a.price-b.price);
}

function card(p, withEq=true){
  const o = { id:p.id, name:p.name, price:p.price, category:p.category, image:p.image,
    restricted: !!p.restricted,
    ingredient:p.ai, strength:p.strength, form:p.form, availability:availability(p) };
  if(withEq && !p.restricted){
    const eq = equivalents(p).filter(e => !e.restricted).slice(0,3).map(e=>({ ...card(e,false), saving: Math.max(0, +(p.price-e.price).toFixed(2)) }));
    const cheaper = eq.filter(e=>e.saving>0);
    o.equivalents = eq;
    o.best = cheaper[0] || null;              // أوفر مثيل متاح
  }
  return o;
}

const app = express();
app.use(express.json());
mountAdmin(app, db, load);
mountInsights(app, db);
app.use(express.static('public'));

app.get('/api/search', (req,res)=>{
  const q = norm(req.query.q||''), cat = req.query.cat;
  const qt = q.split(' ').filter(Boolean);
  let list = CAT;
  if(cat) list = list.filter(p => (p.category||'').includes(cat));
  if(!qt.length) return res.json(list.slice(0,24).map(p=>card(p)));
  const out = list.map(p=>({p,s:score(p,qt)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,24);
  res.json(out.map(x=>card(x.p)));
});

app.get('/api/categories', (_,res)=>{
  res.json(db.prepare(`select ${C.category} name, count(*) n from ${C.table} group by 1 order by n desc`).all());
});

/* تسجيل طلب علاج شهري من الموقع وحفظه في قاعدة البيانات */
app.post('/api/monthly/register', (req, res) => {
  try {
    const { name='', phone='', area='', cycle_days=30, notes='' } = req.body || {};
    const cleanPhone = String(phone).replace(/\D/g, '').replace(/^0/, '20');
    if (cleanPhone.length < 11 || !name) {
      return res.status(400).json({ ok: false, error: 'الاسم ورقم الهاتف مطلوبان' });
    }
    // حفظ أو تحديث العميل
    db.prepare(`insert into customers(phone, name, area, wa_opt_in, opt_in_at) values(?,?,?,1,datetime('now'))
      on conflict(phone) do update set name=excluded.name, area=excluded.area, wa_opt_in=1`).run(cleanPhone, name, area);

    // تسجيل الطلب في جدول الطلبات الجديدة لمرضى الشهري
    db.prepare(`insert into monthly_requests(name, phone, area, cycle_days, notes) values(?,?,?,?,?)`)
      .run(name, cleanPhone, area, +cycle_days || 30, notes);

    res.json({ ok: true, message: 'تم حفظ تسجيل العلاج الشهري بنجاح' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ===== 2) الطلب بواتساب: رسالة مهيكلة ===== */
app.post('/api/wa-link', (req,res)=>{
  const { mode='rx', items=[], name='', area='', src='' } = req.body||{};
  const lines = [ 'السلام عليكم، أنا عايز أطلب من صيدلية بحبح.' ];
  if(src) lines.push(`(كود القناة: ${src})`);
  if(name) lines.push(`الاسم: ${name}`);
  if(area) lines.push(`المنطقة/القرية: ${area}`);
  if(mode==='rx') lines.push('📷 هبعتلكم صورة الروشتة أو علبة الدواء الآن في الرسالة التالية.');
  if(items.length){ lines.push('الأصناف المطلوبة:');
    items.forEach(i=>{ const p=CAT.find(x=>x.id===i.id); if(p) lines.push(`• ${p.name} × ${i.qty||1} (${p.price} ج)`); }); }
  lines.push('برجاء تأكيد التوفر وسعر التوصيل.');
  res.json({ url:`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}` });
});

/* ===== 3) محرك التذكير الدوري ===== */
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); };

// الصيدلاني يفعّل التذكير بعد مراجعة الروشتة (لا تذكير بدون مراجعة)
app.post('/api/admin/reminders', (req,res)=>{
  const { phone, name, area, product_id, cycle_days=30, last_filled, opt_in } = req.body;
  if(!opt_in) return res.status(400).json({error:'مطلوب موافقة العميل على رسائل التذكير'});
  db.prepare(`insert into customers(phone,name,area,wa_opt_in,opt_in_at) values(?,?,?,1,datetime('now'))
     on conflict(phone) do update set name=excluded.name, area=excluded.area, wa_opt_in=1`).run(phone,name,area);
  const cid = db.prepare('select id from customers where phone=?').get(phone).id;
  const next = addDays(last_filled||new Date(), cycle_days-5);   // قبل نهاية الدواء بـ 5 أيام
  db.prepare(`insert into refill_reminders(customer_id,product_id,cycle_days,next_reminder_at,pharmacist_verified)
     values(?,?,?,?,1)`).run(cid,product_id,cycle_days,next);
  res.json({ ok:true, next_reminder_at:next });
});

function dueReminders(){
  return db.prepare(`select r.id, r.cycle_days, c.phone, c.name, p.${C.name} product
    from refill_reminders r join customers c on c.id=r.customer_id join ${C.table} p on p.${C.id}=r.product_id
    where r.active=1 and r.pharmacist_verified=1 and c.wa_opt_in=1 and r.next_reminder_at<=date('now')`).all();
}

async function sendTemplate(r){
  if(!WA_TOKEN||!WA_PHONE_ID) return { status:'dry_run', detail:'no credentials' };
  const resp = await fetch(`https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`, {
    method:'POST', headers:{ Authorization:`Bearer ${WA_TOKEN}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ messaging_product:'whatsapp', to:r.phone, type:'template',
      template:{ name:WA_TEMPLATE, language:{code:'ar'},
        components:[{ type:'body', parameters:[{type:'text',text:r.name||'عميلنا العزيز'},{type:'text',text:r.product}] }] } }) });
  return { status: resp.ok?'sent':'failed', detail: await resp.text() };
}

async function runReminders(){
  for(const r of dueReminders()){
    const out = await sendTemplate(r);
    db.prepare('insert into reminder_log(reminder_id,channel,status,detail) values(?,?,?,?)').run(r.id,'whatsapp',out.status,out.detail.slice(0,300));
    if(out.status==='sent') db.prepare(`update refill_reminders set last_sent_at=datetime('now'),
        next_reminder_at=date('now', '+'||cycle_days||' days') where id=?`).run(r.id);
  }
}
cron.schedule('0 10 * * *', runReminders, { timezone:'Africa/Cairo' });

app.listen(process.env.PORT||3000, ()=>console.log('بحبح على http://localhost:'+(process.env.PORT||3000)));
