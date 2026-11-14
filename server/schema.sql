-- ============================================================================
-- OFFLINE-FIRST EGYPTIAN PHARMACY MANAGEMENT SYSTEM
-- Modern SQLite Schema (Replacing Legacy Delphi / Sybase dark1.db)
-- ============================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- 1. SHELF LOCATIONS (Visual Shelf-Locating & 2D Floor Plan)
CREATE TABLE IF NOT EXISTS shelf_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_code TEXT NOT NULL,          -- e.g., 'ZONE-A'
  zone_name TEXT NOT NULL,          -- e.g., 'المضادات الحيوية والتنفسي'
  aisle TEXT NOT NULL,              -- e.g., 'ممر 1'
  rack TEXT NOT NULL,               -- e.g., 'ستاند 3'
  shelf_level INTEGER NOT NULL,     -- 1=علوي, 2, 3, 4, 5=سفلي
  bin TEXT,                         -- e.g., 'درج 04'
  x_coord REAL NOT NULL DEFAULT 0,  -- 0-100% on 2D map
  y_coord REAL NOT NULL DEFAULT 0,  -- 0-100% on 2D map
  photo_url TEXT,                   -- Shelf photo / planogram diagram
  notes TEXT
);

-- 2. SUPPLIERS & DISTRIBUTORS (Egyptian Pharma Logistics)
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  rep_name TEXT,
  rep_phone TEXT,
  cash_discount REAL DEFAULT 0.20,
  quota_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. PRODUCTS CATALOG (10,215 authentic pharmaceutical products)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  barcode TEXT,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  category TEXT DEFAULT 'أدوية',
  active_ingredient TEXT,
  strength TEXT,
  form TEXT,
  cost_price REAL NOT NULL DEFAULT 0,
  sale_price REAL NOT NULL DEFAULT 0,
  strip_price REAL NOT NULL DEFAULT 0,
  unit_no INTEGER NOT NULL DEFAULT 1,
  stock_boxes INTEGER NOT NULL DEFAULT 0,
  stock_strips INTEGER NOT NULL DEFAULT 0,
  min_limit INTEGER NOT NULL DEFAULT 3,
  is_table_drug INTEGER NOT NULL DEFAULT 0, -- 0=Normal, 1=Table 1 (Narcotics), 2=Table 2 (Psychotropics)
  table_class TEXT,                        -- 'Table 1', 'Table 2', NULL
  shelf_location_id INTEGER REFERENCES shelf_locations(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prod_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_prod_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_prod_name_en ON products(name_en);
CREATE INDEX IF NOT EXISTS idx_prod_name_ar ON products(name_ar);
CREATE INDEX IF NOT EXISTS idx_prod_ai ON products(active_ingredient);

-- 4. BATCHES (Batch-level tracking with Expiry & Old/New Price)
CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  expiry_date TEXT NOT NULL,               -- ISO YYYY-MM-DD
  box_qty INTEGER NOT NULL DEFAULT 0,
  strip_qty INTEGER NOT NULL DEFAULT 0,
  cost_price REAL NOT NULL,
  sale_price REAL NOT NULL,                -- Supports old price vs new price batches
  supplier_id INTEGER REFERENCES suppliers(id),
  received_date TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active'             -- 'active', 'depleted', 'expired', 'returned'
);

CREATE INDEX IF NOT EXISTS idx_batch_prod ON batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batch_expiry ON batches(expiry_date);

-- 5. CUSTOMERS & CHRONIC PATIENTS (VIP Cards & Debts)
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  national_id TEXT,
  balance_debt REAL DEFAULT 0,
  is_chronic INTEGER DEFAULT 0,
  disease TEXT,
  monthly_day INTEGER DEFAULT 1,
  medicines_json TEXT,                     -- Array of recurring items
  qr_token TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cust_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_cust_qr ON customers(qr_token);

-- 6. SHIFTS & FINANCIAL RECONCILIATION
CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_type TEXT NOT NULL,                -- 'morning', 'evening', 'night'
  cashier_name TEXT NOT NULL,
  receiver_name TEXT,
  start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP,
  starting_cash REAL NOT NULL DEFAULT 500,
  actual_cash REAL NOT NULL DEFAULT 0,
  cash_sales REAL NOT NULL DEFAULT 0,
  instapay_sales REAL NOT NULL DEFAULT 0,
  visa_sales REAL NOT NULL DEFAULT 0,
  credit_sales REAL NOT NULL DEFAULT 0,
  debts_collected REAL NOT NULL DEFAULT 0,
  clinic_revenue REAL NOT NULL DEFAULT 0,
  expenses_total REAL NOT NULL DEFAULT 0,
  expected_cash REAL NOT NULL DEFAULT 0,
  difference REAL NOT NULL DEFAULT 0,
  diff_reason TEXT,
  denominations_json TEXT,
  expenses_json TEXT,
  status TEXT DEFAULT 'open'               -- 'open', 'closed'
);

-- 7. SALES INVOICES & BILLING
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'sale',                -- 'sale', 'return'
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT,
  subtotal REAL NOT NULL,
  discount REAL DEFAULT 0,
  insurance_copay REAL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL,            -- 'cash', 'instapay', 'visa', 'later'
  paid_amount REAL NOT NULL,
  remaining_amount REAL DEFAULT 0,
  cashier_name TEXT,
  shift_id INTEGER REFERENCES shifts(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inv_no ON invoices(invoice_no);
CREATE INDEX IF NOT EXISTS idx_inv_date ON invoices(created_at);

-- 8. INVOICE LINE ITEMS (With Batch linkage)
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  batch_id INTEGER REFERENCES batches(id),
  unit_type TEXT NOT NULL DEFAULT 'box',   -- 'box', 'strip'
  qty INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  line_total REAL NOT NULL,
  batch_number TEXT,
  expiry_date TEXT
);

CREATE INDEX IF NOT EXISTS idx_item_inv ON invoice_items(invoice_id);

-- 9. CONTROLLED SUBSTANCES REGISTRY (Table 1 & 2 Drugs - EDA Compliance)
CREATE TABLE IF NOT EXISTS table_drugs_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  table_class TEXT NOT NULL,               -- 'Table 1', 'Table 2'
  batch_number TEXT,
  qty_dispensed INTEGER NOT NULL,
  unit_type TEXT NOT NULL DEFAULT 'علبة',
  patient_name TEXT NOT NULL,
  patient_national_id TEXT NOT NULL,
  patient_phone TEXT,
  doctor_name TEXT NOT NULL,
  doctor_license TEXT,
  prescription_no TEXT NOT NULL,
  prescription_date TEXT NOT NULL,
  remaining_stock INTEGER NOT NULL,
  pharmacist_name TEXT NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_tdl_date ON table_drugs_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_tdl_patient ON table_drugs_log(patient_national_id);

-- 10. IN-PHARMACY CLINIC SERVICES (Vital Signs Telemetry)
CREATE TABLE IF NOT EXISTS clinic_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  bp_sys INTEGER,
  bp_dia INTEGER,
  pulse INTEGER,
  bp_status TEXT,
  glucose_type TEXT,
  glucose_value REAL,
  glucose_status TEXT,
  weight_kg REAL,
  height_cm REAL,
  bmi REAL,
  bmi_status TEXT,
  fee REAL DEFAULT 0,
  fee_to_drawer INTEGER DEFAULT 1,
  cashier_name TEXT
);
