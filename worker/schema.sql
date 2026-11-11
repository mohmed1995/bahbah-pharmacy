-- صيدلية بحبح: مخطط قاعدة D1 (SQLite). التشغيل: npm run db:init
CREATE TABLE IF NOT EXISTS products (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  generic    TEXT NOT NULL DEFAULT '',
  category   TEXT NOT NULL DEFAULT '',
  price      REAL NOT NULL DEFAULT 0 CHECK (price >= 0),
  stock      INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  img        TEXT NOT NULL DEFAULT '',
  restricted INTEGER NOT NULL DEFAULT 0,      -- 1 = يُصرف بروشتة / بإشراف الصيدلي
  search     TEXT NOT NULL DEFAULT '',        -- الاسم + المادة الفعالة بعد التطبيع (للبحث)
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- كارت العلاج الشهري (الكود بيتولد بشكل عشوائي وUNIQUE)
CREATE TABLE IF NOT EXISTS monthly (
  vip_code   TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  area       TEXT NOT NULL,
  cycle_days INTEGER NOT NULL DEFAULT 30,
  notes      TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- "بلّغني لما يتوفر": بتتحذف بعد الإبلاغ أو بعد 30 يوم (cron)، وبشرط الموافقة
CREATE TABLE IF NOT EXISTS watch (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL,
  phone       TEXT NOT NULL,
  consent_at  TEXT NOT NULL DEFAULT (datetime('now')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  status      TEXT NOT NULL DEFAULT 'waiting'  -- waiting | done | stopped
);
CREATE INDEX IF NOT EXISTS idx_watch_status ON watch(status, product_id);

-- طلبات مكتملة بيسجلها الصيدلاني
CREATE TABLE IF NOT EXISTS orders (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  phone      TEXT NOT NULL,
  total      REAL NOT NULL CHECK (total >= 0),
  src        TEXT NOT NULL DEFAULT 'other',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- تذكيرات إعادة الصرف (بموافقة العميل فقط)
CREATE TABLE IF NOT EXISTS reminders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  phone       TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  area        TEXT NOT NULL DEFAULT '',
  product_id  INTEGER,
  cycle_days  INTEGER NOT NULL DEFAULT 30,
  last_filled TEXT NOT NULL,
  opt_in      INTEGER NOT NULL DEFAULT 0,
  stopped     INTEGER NOT NULL DEFAULT 0,
  last_sent_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- أخطاء وشكاوى (بدون أسماء مرضى)
CREATE TABLE IF NOT EXISTS incidents (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  note     TEXT NOT NULL,
  at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- أحداث الاستخدام: search | wa | gap (بحث ملقاش نتيجة)
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  t  TEXT NOT NULL,
  s  TEXT NOT NULL DEFAULT '',
  q  TEXT NOT NULL DEFAULT '',
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_t_at ON events(t, at);

-- حد المحاولات (دخول الإدارة + الإرسال العام)
CREATE TABLE IF NOT EXISTS rl (
  k TEXT NOT NULL,
  w INTEGER NOT NULL,      -- رقم النافذة الزمنية
  n INTEGER NOT NULL DEFAULT 0,
  exp INTEGER NOT NULL,    -- وقت انتهاء النافذة (ثواني) للتنظيف
  PRIMARY KEY (k, w)
);
