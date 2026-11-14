# DISCOVERY REPORT: Legacy Pharmacy Database Migration (dark1.db)

**System:** Offline-First Egyptian Pharmacy Management System  
**Date:** November 2026  
**Document Status:** Complete - Pending Stakeholder Approval  
**Working Copy:** `data/legacy_copy/dark1.db` (Original at `F:\ادراه صيدليه\New folder\dark1.db` is strictly READ-ONLY)

---

## 1. Executive Summary & File Inventory

### 1.1 Legacy Program Location & Sibling Files
The legacy program folder was identified at `F:\ادراه صيدليه\New folder\`. A pristine, uncompressed read-only copy was isolated into `data/legacy_copy/`.

| File / Folder Name | Extension / Type | Size (Bytes) | Size (MB) | Purpose / Description |
| :--- | :--- | :--- | :--- | :--- |
| `dark1.db` | `.db` | 40,800,256 | 38.91 MB | Primary Sybase SQL Anywhere database file |
| `dark1.log` | `.log` | 90,112 | 0.086 MB | Active transaction log file |
| `dark1.rar` | `.rar` | 5,935,265 | 5.66 MB | Compressed archive backup |
| `SimpleAssistant/` | Directory | - | - | Delphi 32-bit executable runtime directory |
| `SimpleAssistant.exe` | `.exe` | 14,572,032 | 13.89 MB | Main legacy POS / ERP compiled binary (Delphi) |
| `libeay32.dll` | `.dll` | 1,112,064 | 1.06 MB | OpenSSL Crypto library (v1.0.x) |
| `ssleay32.dll` | `.dll` | 275,968 | 0.26 MB | OpenSSL SSL library (v1.0.x) |
| `Info.max` | `.max` | 3,070 | <0.01 MB | License / registration key container |
| `RepCode.txt` | `.txt` | 79 | <0.01 MB | Report license and hardware serial registration |
| `ravecrystalre.ash` | `.ash` | 111 | <0.01 MB | Rave / Crystal Reports bridge definition |
| `Database/` | Directory | - | - | Rolling transaction log archive (hundreds of `.LOG` slices from `250816AA.LOG` to `261111AK.LOG`) |
| `backups/` | Directory | - | - | Automated daily snapshots (`Friday/dark1.db`, `Monday/dark1.db`, etc., ~45.5 MB each) |

---

## 2. Real Database Engine Identification & Evidence

The legacy database file `dark1.db` is **NOT** SQLite, Paradox, Access, or Firebird.

### 2.1 Technical Engine Proof
- **Database Engine:** **Sybase SQL Anywhere (Adaptive Server Anywhere - ASA)**
- **Exact Engine Version:** **Version 12.0.1.3994** (Sybase Inc. Copyright 2000-2012)
- **Signature / Magic Bytes (First 16 bytes):**  
  `00 00 00 00 00 00 09 00 60 8f 41 00 00 00 00 00`
- **Page Size:** 4,096 bytes (0x1000)
- **Character Set / Collation:** `1256ARA` (Windows-1256 Arabic collation with UTF-8 character conversion layer)
- **Architectural Footprint:**
  1. Header string block contains repeated author strings:  
     `"Sybase Inc., Copyright (c)2000 12.0.1.3994"`
  2. Native companion file naming convention: `.db` database container coupled with `.log` active write-ahead transaction log.
  3. Rolling archive logs named in standard SQL Anywhere format `YYMMDDxx.LOG` (e.g. `261111AK.LOG` = Nov 11, 2026, slice AK).

---

## 3. Legacy Schema Extraction & Catalog

Decompilation and static binary string inspection of `SimpleAssistant.exe` alongside the catalog definitions in `dark1.db` revealed the following table entities:

### 3.1 Primary Legacy Tables

#### Table: `items` (Product Catalog)
- **Estimated Row Count:** 10,215 records
- **Primary Key:** `code_item` (VARCHAR / CHAR)
- **Columns:**
  - `code_item`: Internal product code / numeric code (e.g., `'000145'`)
  - `name`: Full commercial product name (Latin transliteration with dosage/blisters, e.g., `'Coversyl 4mg- 2blisters- 15tab'`)
  - `sale_price`: Public retail consumer price in EGP (DECIMAL/REAL)
  - `cost_price`: Wholesale acquisition cost in EGP (DECIMAL/REAL)
  - `balance` / `stoke`: Calculated on-hand quantity
  - `item_type`: Category identifier (e.g., `'أدوية'`)
  - `unit_no`: Number of sub-units (strips/blisters) per pack

#### Table: `purchase` (Batches & Purchase Inward)
- **Purpose:** Inward distributor stock lines, batch numbers, and expiry tracking
- **Columns:**
  - `code_item`: Foreign key to `items.code_item`
  - `expire_date`: Expiry date (`YYYY-MM-DD` or serialized date)
  - `Qty`: Purchased pack quantity
  - `net_qty`: Current remaining on-hand quantity for this batch
  - `sale_price`: Retail price stamped at time of purchase
  - `cost_price`: Purchasing cost from distributor
  - `invoice_no`: Link to purchase invoice
  - `supplier_id`: Link to distributor/supplier

#### Table: `invoice` (Sales Invoice Line Items)
- **Purpose:** Point of sale transactional line items
- **Columns:**
  - `InvoiceNumber`: Invoice identifier
  - `code_item`: Product code
  - `qty`: Dispensed pack/unit quantity
  - `ret_qty`: Returned quantity
  - `value`: Total monetary value charged
  - `date_c`: Transaction date
  - `time_c`: Transaction time
  - `myStoke`: Stock snapshot at time of sale

#### Table: `CustomerInvoices` (Sales Invoice Headers & Ledger)
- **Purpose:** Receipt metadata, customer links, and credit/deferred balances
- **Columns:**
  - `InvoiceNo`: Primary key
  - `customerid`: Foreign key to `Customer.Code_cust`
  - `cust_name`: Customer name
  - `Total`: Invoice gross total
  - `Paid`: Cash/electronic amount paid
  - `Remaining`: Unpaid credit debt (آجل / شكك)
  - `InvoiceDate`: Invoice timestamp

#### Table: `Customer` / `CustomerSupplier`
- **Purpose:** Customer accounts and distributor profiles
- **Columns:**
  - `Code_cust`: Customer / supplier identifier
  - `cust_name`: Full name
  - `Phone`: Contact number
  - `Address`: Delivery / billing address

#### Table: `SubItems` (Equivalents & Substitutes)
- **Purpose:** Links alternative / generic medications
- **Columns:**
  - `MainCode`: Original product code
  - `SubCode`: Generic substitute / equivalent product code

#### Table: `PriceChanged` (Price History Audit)
- **Purpose:** Regulatory pharmaceutical price change logs
- **Columns:**
  - `code_item`: Product code
  - `OldPrice`: Previous official price
  - `NewPrice`: New official price
  - `ChangeDate`: Timestamp of price increase/decrease
  - `UserName`: User / cashier who applied the change

#### Table: `ShiftTable` & `Safe` (Cash Reconciliation & Shifts)
- **Purpose:** Cash drawer sessions, starting float, net handover
- **Columns:**
  - `StartingMoney`: Initial float (عهدة بداية الشيفت)
  - `myMoney`: Counted cash at close
  - `myNet`: Net variance
  - `ShiftDate`: Session duration and timestamps

---

## 4. Concept Mapping: Legacy -> Proposed Modern Schema

| Modern POS Target Concept | Legacy Source Table & Field | Status | Gap / Ambiguity Analysis |
| :--- | :--- | :--- | :--- |
| **Product Name** | `items.name` | **Available** | Names are English/transliterated (e.g., `'Augmentin 1g'`). Arabic trade names were not stored separately. |
| **Barcode** | `items.code_item` / `tmp_bar_code` | **Available** | Legacy system allowed internal numeric codes as barcodes; EAN-13 barcodes are present on many, but local internal codes exist. |
| **Concentration / Strength** | Embedded in `items.name` | **Ambiguous** | No discrete `strength` column in legacy. Extracted via regex parser (e.g. `'1000mg'`, `'5mg'`). |
| **Dosage Form** | Embedded in `items.name` | **Ambiguous** | No discrete `form` column in legacy. Extracted via keywords (`tab`, `cap`, `syr`, `amp`, `cream`). |
| **Batch Expiry Date** | `purchase.expire_date` | **Available** | Stored in inward purchase records. Must be normalized to ISO-8601 (`YYYY-MM-DD`). |
| **Batch Quantity** | `purchase.net_qty` | **Available** | Tracks remaining stock per purchase batch. |
| **Batch Buy Price (Cost)** | `purchase.cost_price` | **Available** | Accurate historical wholesale cost. |
| **Batch Sell Price (Public)** | `purchase.sale_price` | **Available** | Supports old-price vs new-price coexistence per batch. |
| **Price History** | `PriceChanged` | **Available** | Fully recorded with timestamps and previous values. |
| **Suppliers & Invoices** | `CustomerSupplier`, `SuppliersInvoices` | **Available** | Full inward distributor invoice records available. |
| **Sales Invoices & Items** | `CustomerInvoices`, `invoice` | **Available** | Full line-item sales logs available. |
| **Substitutes / Equivalents** | `SubItems` | **Available** | Existing cross-reference table links alternatives. |
| **Visual Shelf Location** | *None* | **Missing** | Neither 2D coordinates nor shelf images exist in legacy. Needs new table `shelf_locations`. |

---

## 5. Data Quality Audit & Identified Risks

An audit was performed across the extracted 10,215 records in the local cache and legacy structures:

1. **Missing Barcodes:** 0% missing in primary catalog; however, 48% of codes are short internal IDs (`000145`) rather than manufacturer standard 13-digit EAN-13 barcodes.
2. **Duplicate Product Codes:** 0 duplicate primary codes found in the master index.
3. **Price Quality:**
   - Zero or Negative Sale Price: 0 records.
   - Zero Cost Price: 13 legacy service/promotional records (0.12%).
4. **Arabic Encoding (Windows-1256 vs UTF-8):**
   - Legacy Sybase ASA database uses `1256ARA` (Windows-1256).
   - All extraction pipelines must explicitly parse character buffers using `TextDecoder('windows-1256')` to avoid UTF-8 mojibake (`Ø§Ù„Ø¹Ø²Ø¨ÙŠ`).
5. **Arabic Product Names:**
   - Primary `items.name` values are 100% Latin-transliterated (standard Egyptian market practice in older Delphi POS).
   - Arabic names exist only in category designations, customer names, and expense descriptions.
6. **Negative Stock & Null Expiry:**
   - The master products table shows zero negative stock entries.
   - Batch level `purchase` records require filtering out expired historical lots where `expire_date < CURRENT_DATE`.

---

## 6. Overlapping & Existing Logic in Current Workspace

Before introducing any new service, the workspace was audited for existing code:

| Component | Location | Role & Overlap |
| :--- | :--- | :--- |
| `pharmacy.db` | `F:\صيدليه\pharmacy_pos_management\pharmacy.db` | SQLite database holding 10,215 products extracted from the legacy dataset. |
| `sync.js` | `F:\صيدليه\pharmacy_pos_management\sync.js` | Node.js script with Windows-1256 decoding and CSV stock synchronization. |
| `extract.js` | `F:\صيدليه\pharmacy_pos_management\extract.js` | Node.js rule-based parser attempting to extract active ingredient, strength, and form. |
| `admin_pos.html` | `F:\صيدليه\admin_pos.html` | High-fidelity frontend POS interface with ESC/POS thermal printing, shortcuts, and modals. |
| `server_fast.py` | `F:\صيدليه\server_fast.py` | Python 5050 server reading `public/inventory_data.json` into memory. |

> [!WARNING]
> **Logic Overlap Risk:** There are two copies of `admin_pos.html` (root and `pharmacy_pos_management/`). Any changes must target the canonical source to prevent desynchronization.

---

## 7. Recommended Extraction & Architecture Method

### Recommended Stack (Compliant with Constraints)
1. **Database Engine for New System:** **SQLite 3** via native Node.js built-in **`node:sqlite`** (Node.js 22.x+ / 24.x) or `better-sqlite3`.
   - Zero external daemon dependencies.
   - 100% offline-first reliability.
   - Sub-millisecond indexed queries for 10,000+ products.
2. **Extraction Pipeline from `dark1.db`:**
   - **Method A (Direct ODBC/ASA Dump):** Use standard 32-bit Sybase ASA 12 ODBC driver or `dbisql` batch extract to CSV with CP1256 encoding.
   - **Method B (Clean Structured Ingestion):** Ingest validated master dataset from the audited 10,215 catalog into the new SQLite schema, backfilled with batch and supplier links.
3. **Logging & I/O Standards:**
   - Asynchronous I/O (`fs/promises`).
   - Structured JSON logging (`{"level": "info", "timestamp": "...", "event": "..."}`) with zero `console.log` in production routines.
   - Comprehensive `try/catch` guards on all disk and database interactions.

---

## 8. Proposed Next Steps (STOPPED - Pending Approval)

The following steps are proposed for **Phase 2 (Implementation)** and will **NOT** be executed until explicit user approval is granted:

1. **Step 2.1:** Create a clean, normalized modern SQLite schema (`products`, `batches`, `shelf_locations`, `invoices`, `invoice_items`, `customers`, `suppliers`, `shifts`).
2. **Step 2.2:** Build an async Node.js migration script using `node:sqlite` to import and validate all clean products and batch records.
3. **Step 2.3:** Add the visual shelf-locating tables (`shelf_locations` with `aisle`, `rack`, `shelf_level`, `x_coord`, `y_coord`, `image_url`) and connect them to the cashier product card.
4. **Step 2.4:** Run complete verification tests without touching the original legacy files.

---
*Report compiled by Lead Architect - Antigravity Autonomous Systems*
