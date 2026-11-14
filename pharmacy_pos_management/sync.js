// مزامنة المخزون/الأسعار من تصدير الكاشير (CSV).   لا يلمس أبدًا: active_ingredient / strength / form / ai_*
//   node sync.js --link inbox/stock.csv     ربط أولي (مرة واحدة): يكتب external_code للمطابقات الحرفية الفريدة فقط
//   node sync.js inbox/stock.csv            تجربة بدون كتابة + تقرير
//   node sync.js inbox/stock.csv --apply    تنفيذ (مع نسخة احتياطية قبلها)
// أعلام: --missing-zero (الصنف الغايب عن الملف = كمية 0)  --accept-prices (اقبل قفزات السعر الكبيرة)  --force
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
const A = process.argv.slice(2), has = f => A.includes(f);
const file = A.find(a => !a.startsWith('--')) || 'inbox/stock.csv';
const CFG = { code:'كود الصنف', name:'اسم الصنف', qty:'الكمية', price:'السعر', maxPriceJump:0.15,
  ...(fs.existsSync('sync.config.json') ? JSON.parse(fs.readFileSync('sync.config.json','utf8')) : {}) };
const db = new DatabaseSync(process.env.DB_PATH || 'pharmacy.db');
for (const s of ['stock_qty INTEGER','external_code TEXT','stock_synced_at TEXT','price_prev REAL']) try { db.exec(`ALTER TABLE products ADD COLUMN ${s}`); } catch {}
db.exec('create unique index if not exists idx_ext on products(external_code) where external_code is not null');

const norm = (s='') => String(s).toLowerCase().replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const num = s => { const x = String(s ?? '').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g,'.').replace(/[٬\s]/g,'').replace(/,(?=\d{3}(\D|$))/g,'').replace(',','.'); const n = parseFloat(x); return Number.isFinite(n) ? n : null; };

// ترميز: UTF-8 أو windows-1256 (شائع في برامج الصيدليات)
const buf = fs.readFileSync(file); let text;
try { text = new TextDecoder('utf-8',{fatal:true}).decode(buf); } catch { text = new TextDecoder('windows-1256').decode(buf); }
text = text.replace(/^\uFEFF/,'');
function parseCSV(t) {
  const first = t.split('\n')[0], sep = (first.match(/;/g)||[]).length > (first.match(/,/g)||[]).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"') { if (t[i+1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === sep) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i+1] === '\n') i++; row.push(cur); cur = ''; if (row.some(x=>x.trim())) rows.push(row); row = []; }
    else cur += c; }
  if (cur || row.length) { row.push(cur); if (row.some(x=>x.trim())) rows.push(row); }
  return rows; }
const rows = parseCSV(text), hdr = rows[0].map(s => s.trim());
const ix = k => hdr.indexOf(CFG[k]);
for (const k of ['code','name','qty','price']) if (ix(k) < 0) { console.error(`العمود "${CFG[k]}" غير موجود. الأعمدة الموجودة:`, hdr, '\nعدّل sync.config.json'); process.exit(1); }

// تجميع الصفوف المكررة (دفعات): نجمع الكمية، ونأخذ آخر سعر صالح
const items = new Map();
for (const r of rows.slice(1)) { const code = (r[ix('code')]||'').trim(); if (!code) continue;
  const it = items.get(code) || { code, name:r[ix('name')], qty:0, price:null };
  it.qty += Math.max(0, num(r[ix('qty')]) ?? 0); const p = num(r[ix('price')]); if (p > 0) it.price = p; items.set(code, it); }

fs.mkdirSync('reports', { recursive:true });
const date = new Date().toISOString().slice(0,10), rep = [];
const log = (...a) => { const s = a.join(' '); rep.push(s); console.log(s); };

if (has('--link')) {                                       // ===== ربط أولي =====
  const byName = new Map(); for (const it of items.values()) { const k = norm(it.name); byName.set(k, byName.has(k) ? null : it); }
  const prods = db.prepare('select id, name_ar as name from products where external_code is null').all();
  const pn = new Map(); for (const p of prods) { const k = norm(p.name); pn.set(k, pn.has(k) ? null : p); }
  let linked = 0; const set = db.prepare('update products set external_code=? where id=?');
  for (const [k, p] of pn) { const it = byName.get(k); if (p && it) { set.run(it.code, p.id); linked++; } }
  const left = db.prepare('select id, name_ar as name from products where external_code is null').all();
  fs.writeFileSync(`reports/unlinked-${date}.csv`, '\ufeffid,name\n' + left.map(p=>`${p.id},"${p.name.replace(/"/g,'""')}"`).join('\n'));
  console.log(`تم ربط ${linked}. المتبقي بدون ربط: ${left.length} (راجع reports/unlinked-${date}.csv واربطهم يدويًا بالكود)`);
  process.exit(0);
}

// ===== مزامنة =====
const prods = db.prepare('select id, name_ar as name, price_public as price, external_code code from products where external_code is not null').all();
const byCode = new Map(prods.map(p => [p.code, p]));
const matched = [...items.values()].filter(i => byCode.has(i.code));
const unmatched = [...items.values()].filter(i => !byCode.has(i.code));
const absent = prods.filter(p => !items.has(p.code));
log(`ملف: ${file} | صفوف: ${items.size} | مطابق: ${matched.length} | غير مطابق: ${unmatched.length} | مرتبط بالقاعدة وغايب عن الملف: ${absent.length}`);

if (!has('--force') && (!prods.length || matched.length < 0.7 * prods.length)) {
  log('⛔ إيقاف: المطابقات أقل من 70% من الأصناف المرتبطة. غالبًا الملف ناقص أو تغيّر شكل الأعمدة. لم يُغيَّر شيء.'); process.exit(2); }

const flagged = [], upd = [];
for (const it of matched) { const p = byCode.get(it.code); let price = null;
  if (it.price > 0) { const jump = p.price > 0 ? Math.abs(it.price - p.price) / p.price : 0;
    if (jump > CFG.maxPriceJump && !has('--accept-prices')) flagged.push(`${p.name}: ${p.price} → ${it.price}`); else if (it.price !== p.price) price = it.price; }
  upd.push({ id:p.id, qty:it.qty, price, old:p.price }); }
log(`تحديث سعر: ${upd.filter(u=>u.price!=null).length} | قفزات سعر مرفوضة للمراجعة: ${flagged.length} | كمية صفر: ${upd.filter(u=>u.qty===0).length}`);
flagged.slice(0,50).forEach(x => log('  ⚠️ سعر', x));
unmatched.slice(0,50).forEach(x => log('  ؟ غير مرتبط:', x.code, x.name));
absent.slice(0,50).forEach(x => log('  — غايب عن الملف:', x.name));

if (has('--apply')) {
  fs.mkdirSync('backups', { recursive:true }); const bk = `backups/pre-sync-${date}.db`; if (fs.existsSync(bk)) fs.unlinkSync(bk); db.exec(`VACUUM INTO '${bk}'`);
  const u = db.prepare("update products set stock_qty=?, stock_synced_at=datetime('now'), price_public=coalesce(?,price_public), price_prev=case when ? is not null then ? else price_prev end where id=?");
  const z = db.prepare("update products set stock_qty=0, stock_synced_at=datetime('now') where id=?");
  db.exec('BEGIN'); try {
    for (const x of upd) u.run(x.qty, x.price, x.price, x.old, x.id);
    if (has('--missing-zero')) for (const p of absent) z.run(p.id);
    db.exec('COMMIT'); log('✅ تم التطبيق. نسخة ما قبل التحديث:', bk);
  } catch (e) { db.exec('ROLLBACK'); log('❌ فشل وتم التراجع:', e.message); process.exitCode = 1; }
} else log('(تجربة فقط: أضف --apply للتنفيذ)');
fs.writeFileSync(`reports/sync-${date}.txt`, rep.join('\n'));
