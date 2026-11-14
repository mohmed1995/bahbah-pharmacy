// فحص جودة البيانات قبل ما نعتمد على محرك المثيل
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(process.env.DB_PATH || 'pharmacy.db', { open: true, readOnly: true });
const n = db.prepare('select count(*) as c from products').get().c;
const q = (sql) => db.prepare(sql).get().c;

console.log({
  total: Number(n),
  with_ingredient: Number(q("select count(*) as c from products where active_ingredient is not null and active_ingredient<>''")),
  zero_price: Number(q('select count(*) as c from products where price_public is null or price_public<=0')),
  missing_image: Number(q("select count(*) as c from products where image_url is null or image_url=''")),
  dup_names: Number(q('select count(*) as c from (select name_ar from products group by name_ar having count(*)>1)')),
});
