const fs = require('fs');

// 1. Check if dark1.db is SQLite or Sybase/Other
const fd = fs.openSync('F:/صيدليه/data/legacy_copy/dark1.db', 'r');
const buf = Buffer.alloc(4096);
fs.readSync(fd, buf, 0, 4096, 0);
fs.closeSync(fd);

console.log('--- DARK1.DB HEADER ANALYSIS ---');
const magicAscii = buf.slice(0, 32).toString('latin1');
console.log('First 32 bytes hex:', buf.slice(0, 32).toString('hex'));
console.log('First 32 bytes ASCII:', magicAscii.replace(/[^\x20-\x7E]/g, '.'));

// Search for recognizable strings in first 4096 bytes
const text4k = buf.toString('latin1');
const matches = text4k.match(/[A-Za-z0-9_-]{4,}/g) || [];
console.log('Readable strings in first 4KB:', matches.slice(0, 30));

// Check pharmacy.db if it is SQLite
try {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync('F:/صيدليه/pharmacy_pos_management/pharmacy.db', { readOnly: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('\n--- PHARMACY.DB (SQLite) TABLES ---');
  console.log(tables);
  for (const t of tables) {
    const count = db.prepare(`SELECT count(*) as c FROM "${t.name}"`).get();
    console.log(`Table ${t.name}: ${count.c} rows`);
  }
} catch (e) {
  console.log('SQLite error on pharmacy.db:', e.message);
}
