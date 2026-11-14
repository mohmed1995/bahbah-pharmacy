const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('F:/صيدليه/pharmacy_pos_management/pharmacy.db', { readOnly: true });

const prods = db.prepare('SELECT name FROM products LIMIT 500').all();
let arabicCount = 0;
for (const p of prods) {
  if (/[\u0600-\u06FF]/.test(p.name)) {
    arabicCount++;
  }
}
console.log(`In first 500 products, ${arabicCount} have Arabic characters.`);

const categories = db.prepare('SELECT category, count(*) as c FROM products GROUP BY category').all();
console.log('Categories:', categories);
