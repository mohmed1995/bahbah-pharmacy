// يولّد worker/seed.sql من public/products.json.
// أول تشغيل: بيضيف المنتجات. إعادة التشغيل: بيحدّث الاسم/المادة الفعالة/القسم/الصورة بس،
// ومبيلمسش السعر ولا المخزون ولا restricted لأن D1 هي المصدر الأساسي ليهم.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { norm } from '../worker/src/index.js';

const q = (v) => "'" + String(v ?? '').replace(/'/g, "''") + "'";

export function buildSeedSql(products) {
  const rows = products.map((p) => {
    const id = Number(p.id);
    if (!Number.isInteger(id)) throw new Error('bad product id: ' + p.id);
    const price = Number(p.price), stock = Number(p.stock);
    if (!(price >= 0) || !Number.isInteger(stock) || stock < 0) throw new Error('bad price/stock for ' + id);
    const name = String(p.name || '').trim(), generic = String(p.generic || '').trim();
    return `INSERT INTO products (id, name, generic, category, price, stock, img, restricted, search) VALUES (${id}, ${q(name)}, ${q(generic)}, ${q(p.category)}, ${price}, ${stock}, ${q(p.img)}, ${p.restricted ? 1 : 0}, ${q(norm(name + ' ' + generic))}) ` +
      'ON CONFLICT(id) DO UPDATE SET name = excluded.name, generic = excluded.generic, category = excluded.category, img = excluded.img, search = excluded.search;';
  });
  return rows.join('\n') + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const products = JSON.parse(readFileSync(new URL('../public/products.json', import.meta.url), 'utf8'));
  writeFileSync(new URL('../worker/seed.sql', import.meta.url), buildSeedSql(products));
  console.log('worker/seed.sql written:', products.length, 'products');
}
