// استخراج المادة الفعالة/التركيز/الشكل -> يُكتب كـ "غير مؤكد" ولا يدخل محرك المثيل قبل مراجعة الصيدلاني
// الاستخدام: node extract.js   (يحتاج ingredients.json: { "كونكور":"bisoprolol", "augmentin":"amoxicillin + clavulanic acid", ... })
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
const db = new DatabaseSync(process.env.DB_PATH || 'pharmacy.db');
const DESC = process.env.DESC_COL || null;           // اسم عمود الوصف لو موجود
for (const s of ['ai_source TEXT', 'ai_verified INTEGER DEFAULT 0'])
  try { db.exec(`ALTER TABLE products ADD COLUMN ${s}`); } catch {}

const norm = (s='') => String(s).toLowerCase().replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآ]/g,'ا')
  .replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}\s.%/+]/gu,' ').replace(/\s+/g,' ').trim();
const DICT = Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync('ingredients.json','utf8'))).map(([k,v])=>[norm(k),v]));
const ING_VALUES = [...new Set(Object.values(DICT))];

const canon = s => s.toLowerCase().split('+').map(x=>x.trim()).filter(Boolean).sort().join(' + ');
const FORMS = [
  [/(xr|sr|er|retard|ريتارد|مطول|ممتد)/i, ' ER'],   // يُضاف للشكل: المطوّل ≠ العادي
];
const BASE = [[/(قرص|اقراص|tab)/i,'tablet'],[/(كبسول|cap)/i,'capsule'],[/(شراب|syr|susp|معلق)/i,'syrup'],
  [/(حقن|amp|inj|vial)/i,'injection'],[/(كريم|cream)/i,'cream'],[/(جل|gel)/i,'gel'],[/(نقط|drops|قطره)/i,'drops'],
  [/(لبوس|supp)/i,'suppository'],[/(مرهم|oint)/i,'ointment'],[/(بخاخ|spray|inhal)/i,'spray']];

function parse(name, desc) {
  const n = norm(name), tokens = n.split(' ');
  let ai = null, src = null;
  for (const len of [3,2,1]) { const k = tokens.slice(0,len).join(' '); if (DICT[k]) { ai = DICT[k]; src='dict'; break; } }
  if (!ai && desc) { const d = norm(desc); const hit = ING_VALUES.filter(v => v.split('+').every(p => d.includes(norm(p.trim()))));
    if (hit.length === 1) { ai = hit[0]; src='desc'; } }
  const st = [...n.matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|%|مجم|جم|مل)/g)].map(m=>m[1]+m[2]).join('/') || null;
  let form = (BASE.find(([re])=>re.test(n))||[])[1] || null;
  if (form && FORMS[0][0].test(n)) form += FORMS[0][1];
  return { ai: ai && canon(ai), src, st, form };
}

const rows = db.prepare(`select id, name_ar name, active_ingredient ai ${DESC?`, ${DESC} d`:''}, ai_source, ai_verified from products`).all();
// ما كان معبأ مسبقًا من القاموس الأولي: يُعلَّم غير مؤكد
db.exec(`update products set ai_source='dict', ai_verified=0 where active_ingredient is not null and ai_source is null`);
const up = db.prepare(`update products set active_ingredient=?, strength=coalesce(strength,?), form=coalesce(form,?), ai_source=?, ai_verified=0 where id=?`);
let n=0; for (const r of rows) {
  if (r.ai_verified === 1 || r.ai) continue;           // لا نكتب فوق المؤكد أو الموجود
  const p = parse(r.name, r.d); if (!p.ai) continue;
  up.run(p.ai, p.st, p.form, p.src, r.id); n++; }
console.log('استخراج جديد:', n, '| إجمالي بمادة فعالة:', db.prepare('select count(*) c from products where active_ingredient is not null').get().c);
