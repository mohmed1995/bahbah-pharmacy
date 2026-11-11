// فحص سريع قبل أي نشر: node scripts/check.mjs  (أو npm run check)
// بيمسك أخطاء الـ JavaScript (زي تعريف let مرتين اللي كان بيوقف لوحة الإدارة كلها)، والدوال المكررة، وسلامة بيانات المنتجات.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import vm from 'node:vm';

const root = new URL('../public/', import.meta.url).pathname;
let bad = 0;
const fail = (m) => { console.error('✗', m); bad++; };
const ok = (m) => console.log('✓', m);

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(root);

// 1) JavaScript داخل صفحات HTML
for (const f of files.filter((x) => extname(x) === '.html')) {
  const html = readFileSync(f, 'utf8');
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  blocks.forEach((code, i) => {
    try { new vm.Script(code, { filename: f + '#' + i }); }
    catch (e) { fail(`${f.replace(root, '')} (script ${i}): ${e.message}`); }
    const names = [...code.matchAll(/^(?:async )?function (\w+)\(/gm)].map((m) => m[1]);
    const dup = names.filter((n, k) => names.indexOf(n) !== k);
    if (dup.length) fail(`${f.replace(root, '')}: دوال معرّفة مرتين → ${[...new Set(dup)].join(', ')}`);
  });
  if (/['"][0-9a-f]{64}['"]/.test(html)) fail(`${f.replace(root, '')}: فيه hash طويل (كلمات السر ما تتخزنش في الواجهة)`);
}
for (const f of files.filter((x) => extname(x) === '.js')) {
  try { new vm.Script(readFileSync(f, 'utf8'), { filename: f }); } catch (e) { fail(`${f.replace(root, '')}: ${e.message}`); }
}
if (!bad) ok('JavaScript: لا أخطاء ولا دوال مكررة');

// 2) بيانات المنتجات
const products = JSON.parse(readFileSync(join(root, 'products.json'), 'utf8'));
const ids = new Set();
let probs = 0;
for (const p of products) {
  if (!Number.isInteger(p.id) || ids.has(p.id)) { fail('id غير صالح/مكرر: ' + p.id); probs++; }
  ids.add(p.id);
  if (!p.name?.trim()) { fail('اسم فاضي: ' + p.id); probs++; }
  if (!(p.price >= 0) || !Number.isInteger(p.stock) || p.stock < 0) { fail('سعر/مخزون غير صالح: ' + p.id); probs++; }
  if (p.img && !/^https?:\/\//.test(p.img) && !existsSync(join(root, p.img))) { fail(`صورة ناقصة: ${p.id} → ${p.img}`); probs++; }
}
if (!probs) ok(`products.json: ${products.length} منتج سليم`);
const noGeneric = products.filter((p) => !p.generic).length;
if (noGeneric) console.log(`ℹ ${noGeneric} منتج من غير مادة فعالة (مش خطأ، بس بيضعف البحث وفاحص التداخلات)`);

if (bad) { console.error(`\nفشل: ${bad} مشكلة`); process.exit(1); }
console.log('\nالفحص نجح');
