// نسخة احتياطية يومية متسقة (VACUUM INTO) مع الاحتفاظ بآخر 14 نسخة. انسخ مجلد backups/ يوميًا لقرص/جهاز آخر.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
const dir = 'backups'; fs.mkdirSync(dir, { recursive: true });
const f = `${dir}/pharmacy-${new Date().toISOString().slice(0,10)}.db`;
if (fs.existsSync(f)) fs.unlinkSync(f);
const db = new DatabaseSync(process.env.DB_PATH || 'pharmacy.db'); db.exec(`VACUUM INTO '${f}'`); db.close();
fs.readdirSync(dir).filter(x=>x.endsWith('.db')).sort().slice(0,-14).forEach(x=>fs.unlinkSync(`${dir}/${x}`));
console.log('backup ok', f);
