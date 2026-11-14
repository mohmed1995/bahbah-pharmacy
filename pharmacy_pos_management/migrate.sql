-- شغّله مرة واحدة على pharmacy.db (sqlite3 pharmacy.db < migrate.sql)
-- ملاحظة: لو عمود موجود بالفعل هيطلع خطأ "duplicate column" وتقدر تتجاهله.
ALTER TABLE products ADD COLUMN active_ingredient TEXT;
ALTER TABLE products ADD COLUMN strength TEXT;
ALTER TABLE products ADD COLUMN form TEXT;
ALTER TABLE products ADD COLUMN stock_qty INTEGER;      -- NULL = غير معروف

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  name TEXT, area TEXT,
  wa_opt_in INTEGER DEFAULT 0,          -- موافقة صريحة على رسائل التذكير
  opt_in_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS refill_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  product_id  INTEGER NOT NULL REFERENCES products(id),
  cycle_days  INTEGER NOT NULL DEFAULT 30,
  next_reminder_at TEXT NOT NULL,       -- YYYY-MM-DD
  last_sent_at TEXT,
  pharmacist_verified INTEGER DEFAULT 0, -- الصيدلاني راجع الروشتة
  active INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_rr_due ON refill_reminders(active, next_reminder_at);
CREATE TABLE IF NOT EXISTS reminder_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_id INTEGER, channel TEXT, status TEXT, detail TEXT,
  at TEXT DEFAULT CURRENT_TIMESTAMP
);
