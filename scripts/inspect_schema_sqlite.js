const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('F:/صيدليه/pharmacy_pos_management/pharmacy.db', { readOnly: true });

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
console.log('Total Tables in pharmacy.db:', tables.length);

for (const t of tables) {
  const rowCount = db.prepare(`SELECT count(*) as c FROM "${t.name}"`).get().c;
  const cols = db.prepare(`PRAGMA table_info("${t.name}")`).all();
  console.log(`\n=== Table: ${t.name} (Rows: ${rowCount}) ===`);
  for (const c of cols) {
    console.log(`  - ${c.name} (${c.type}) ${c.pk ? 'PRIMARY KEY' : ''} ${c.notnull ? 'NOT NULL' : ''}`);
  }
}
