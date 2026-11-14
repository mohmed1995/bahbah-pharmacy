const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs/promises');
const path = require('node:path');
const logger = require('./logger');

const DB_PATH = path.join(__dirname, '..', 'data', 'pharmacy_modern.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let dbInstance = null;

async function getDB() {
  if (dbInstance) return dbInstance;

  try {
    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    await fs.mkdir(dataDir, { recursive: true });

    dbInstance = new DatabaseSync(DB_PATH);
    
    // Execute Schema
    const schemaSql = await fs.readFile(SCHEMA_PATH, 'utf8');
    dbInstance.exec(schemaSql);

    await logger.info('DATABASE_INITIALIZED', { path: DB_PATH });
    return dbInstance;
  } catch (err) {
    await logger.error('DATABASE_INIT_FAILED', err, { path: DB_PATH });
    throw err;
  }
}

// ==========================================
// ASYNC DAO METHODS
// ==========================================

async function searchProducts(query = '', limit = 40) {
  try {
    const db = await getDB();
    const cleanQ = query.trim().toLowerCase();

    if (!cleanQ) {
      const stmt = db.prepare(`
        SELECT p.*, s.zone_name, s.aisle, s.rack, s.shelf_level, s.bin, s.x_coord, s.y_coord, s.photo_url
        FROM products p
        LEFT JOIN shelf_locations s ON p.shelf_location_id = s.id
        ORDER BY p.id ASC
        LIMIT ?
      `);
      return stmt.all(limit);
    }

    const likeQ = `%${cleanQ}%`;
    const stmt = db.prepare(`
      SELECT p.*, s.zone_name, s.aisle, s.rack, s.shelf_level, s.bin, s.x_coord, s.y_coord, s.photo_url
      FROM products p
      LEFT JOIN shelf_locations s ON p.shelf_location_id = s.id
      WHERE p.name_en LIKE ? 
         OR p.name_ar LIKE ? 
         OR p.code LIKE ? 
         OR p.barcode LIKE ?
         OR p.active_ingredient LIKE ?
      ORDER BY 
        CASE 
          WHEN p.code = ? THEN 1
          WHEN p.barcode = ? THEN 2
          WHEN p.name_en LIKE ? THEN 3
          ELSE 4
        END,
        p.sale_price ASC
      LIMIT ?
    `);

    return stmt.all(likeQ, likeQ, likeQ, likeQ, likeQ, cleanQ, cleanQ, `${cleanQ}%`, limit);
  } catch (err) {
    await logger.error('SEARCH_PRODUCTS_ERROR', err, { query, limit });
    return [];
  }
}

async function getProductBatches(productId) {
  try {
    const db = await getDB();
    const stmt = db.prepare(`
      SELECT b.*, sup.name as supplier_name
      FROM batches b
      LEFT JOIN suppliers sup ON b.supplier_id = sup.id
      WHERE b.product_id = ? AND b.status = 'active' AND (b.box_qty > 0 OR b.strip_qty > 0)
      ORDER BY b.expiry_date ASC
    `);
    return stmt.all(productId);
  } catch (err) {
    await logger.error('GET_PRODUCT_BATCHES_ERROR', err, { productId });
    return [];
  }
}

async function getShelfLocation(locationId) {
  try {
    const db = await getDB();
    const stmt = db.prepare(`SELECT * FROM shelf_locations WHERE id = ?`);
    return stmt.get(locationId) || null;
  } catch (err) {
    await logger.error('GET_SHELF_LOCATION_ERROR', err, { locationId });
    return null;
  }
}

async function getAllShelfLocations() {
  try {
    const db = await getDB();
    const stmt = db.prepare(`SELECT * FROM shelf_locations ORDER BY zone_code, rack, shelf_level`);
    return stmt.all();
  } catch (err) {
    await logger.error('GET_ALL_SHELVES_ERROR', err);
    return [];
  }
}

async function recordInvoice(invoiceData) {
  const db = await getDB();
  try {
    db.exec('BEGIN');

    const invStmt = db.prepare(`
      INSERT INTO invoices (
        invoice_no, type, customer_id, customer_name, subtotal, discount, 
        insurance_copay, total, payment_method, paid_amount, remaining_amount, 
        cashier_name, shift_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = invStmt.run(
      invoiceData.invoice_no,
      invoiceData.type || 'sale',
      invoiceData.customer_id || null,
      invoiceData.customer_name || 'عميل نقدي',
      invoiceData.subtotal,
      invoiceData.discount || 0,
      invoiceData.insurance_copay || 0,
      invoiceData.total,
      invoiceData.payment_method || 'cash',
      invoiceData.paid_amount || invoiceData.total,
      invoiceData.remaining_amount || 0,
      invoiceData.cashier_name || 'د. إسلام الشريف',
      invoiceData.shift_id || null
    );

    const invoiceId = Number(result.lastInsertRowid);

    // Items and Batch Level Deduction
    const itemStmt = db.prepare(`
      INSERT INTO invoice_items (
        invoice_id, product_id, batch_id, unit_type, qty, unit_price, line_total, batch_number, expiry_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateProdStockStmt = db.prepare(`
      UPDATE products 
      SET stock_boxes = MAX(0, stock_boxes - ?),
          stock_strips = MAX(0, stock_strips - ?)
      WHERE id = ?
    `);

    const updateBatchStockStmt = db.prepare(`
      UPDATE batches
      SET box_qty = MAX(0, box_qty - ?),
          strip_qty = MAX(0, strip_qty - ?),
          status = CASE WHEN (box_qty - ?) <= 0 AND (strip_qty - ?) <= 0 THEN 'depleted' ELSE 'active' END
      WHERE id = ?
    `);

    for (const item of invoiceData.items || []) {
      const isStrip = item.unit === 'شريط';
      const boxQty = isStrip ? 0 : item.qty;
      const stripQty = isStrip ? item.qty : 0;

      itemStmt.run(
        invoiceId,
        item.product_id,
        item.batch_id || null,
        isStrip ? 'strip' : 'box',
        item.qty,
        item.unit_price,
        item.line_total,
        item.batch_number || null,
        item.expiry_date || null
      );

      // Decrement product aggregate stock
      updateProdStockStmt.run(boxQty, stripQty, item.product_id);

      // Decrement batch-level stock if batch_id provided
      if (item.batch_id) {
        updateBatchStockStmt.run(boxQty, stripQty, boxQty, stripQty, item.batch_id);
      }
    }

    // Update customer debt balance if 'later' payment
    if (invoiceData.customer_id && (invoiceData.remaining_amount > 0 || invoiceData.payment_method === 'later')) {
      const debtAdd = invoiceData.remaining_amount || invoiceData.total;
      db.prepare(`UPDATE customers SET balance_debt = balance_debt + ? WHERE id = ?`).run(debtAdd, invoiceData.customer_id);
    }

    db.exec('COMMIT');

    await logger.info('INVOICE_RECORDED', { invoiceId, invoiceNo: invoiceData.invoice_no, total: invoiceData.total });
    return { success: true, invoiceId, invoiceNo: invoiceData.invoice_no };
  } catch (err) {
    db.exec('ROLLBACK');
    await logger.error('INVOICE_RECORD_FAILED', err, { invoiceData });
    throw err;
  }
}

async function recordTableDrugDispense(logData) {
  try {
    const db = await getDB();
    const stmt = db.prepare(`
      INSERT INTO table_drugs_log (
        product_id, product_name, table_class, batch_number, qty_dispensed, unit_type,
        patient_name, patient_national_id, patient_phone, doctor_name, doctor_license,
        prescription_no, prescription_date, remaining_stock, pharmacist_name, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      logData.product_id,
      logData.product_name,
      logData.table_class || 'Table 2',
      logData.batch_number || null,
      logData.qty_dispensed,
      logData.unit_type || 'علبة',
      logData.patient_name,
      logData.patient_national_id,
      logData.patient_phone || '',
      logData.doctor_name,
      logData.doctor_license || '',
      logData.prescription_no,
      logData.prescription_date,
      logData.remaining_stock,
      logData.pharmacist_name || 'د. إسلام الشريف',
      logData.notes || ''
    );

    await logger.info('TABLE_DRUG_DISPENSED', { id: result.lastInsertRowid, patient: logData.patient_name });
    return { success: true, logId: Number(result.lastInsertRowid) };
  } catch (err) {
    await logger.error('TABLE_DRUG_DISPENSE_FAILED', err, { logData });
    throw err;
  }
}

async function getTableDrugsRegistry(limit = 100) {
  try {
    const db = await getDB();
    const stmt = db.prepare(`SELECT * FROM table_drugs_log ORDER BY timestamp DESC LIMIT ?`);
    return stmt.all(limit);
  } catch (err) {
    await logger.error('GET_TABLE_DRUGS_REGISTRY_ERROR', err);
    return [];
  }
}

async function recordClinicVisit(visitData) {
  try {
    const db = await getDB();
    const stmt = db.prepare(`
      INSERT INTO clinic_records (
        patient_name, patient_phone, bp_sys, bp_dia, pulse, bp_status,
        glucose_type, glucose_value, glucose_status, weight_kg, height_cm, bmi, bmi_status,
        fee, fee_to_drawer, cashier_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      visitData.patient_name,
      visitData.patient_phone || '',
      visitData.bp_sys || null,
      visitData.bp_dia || null,
      visitData.pulse || null,
      visitData.bp_status || null,
      visitData.glucose_type || null,
      visitData.glucose_value || null,
      visitData.glucose_status || null,
      visitData.weight_kg || null,
      visitData.height_cm || null,
      visitData.bmi || null,
      visitData.bmi_status || null,
      visitData.fee || 0,
      visitData.fee_to_drawer ? 1 : 0,
      visitData.cashier_name || 'د. إسلام الشريف'
    );

    await logger.info('CLINIC_VISIT_RECORDED', { id: result.lastInsertRowid, patient: visitData.patient_name });
    return { success: true, visitId: Number(result.lastInsertRowid) };
  } catch (err) {
    await logger.error('CLINIC_VISIT_RECORD_FAILED', err, { visitData });
    throw err;
  }
}

async function closeShiftSession(shiftData) {
  try {
    const db = await getDB();
    const stmt = db.prepare(`
      INSERT INTO shifts (
        shift_type, cashier_name, receiver_name, start_time, end_time,
        starting_cash, actual_cash, cash_sales, instapay_sales, visa_sales,
        credit_sales, debts_collected, clinic_revenue, expenses_total, expected_cash,
        difference, diff_reason, denominations_json, expenses_json, status
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'closed')
    `);

    const result = stmt.run(
      shiftData.shift_type || 'evening',
      shiftData.cashier_name || 'د. إسلام الشريف',
      shiftData.receiver_name || 'الصيدلي المستلم',
      shiftData.start_time || new Date().toISOString(),
      shiftData.starting_cash || 500,
      shiftData.actual_cash || 0,
      shiftData.cash_sales || 0,
      shiftData.instapay_sales || 0,
      shiftData.visa_sales || 0,
      shiftData.credit_sales || 0,
      shiftData.debts_collected || 0,
      shiftData.clinic_revenue || 0,
      shiftData.expenses_total || 0,
      shiftData.expected_cash || 0,
      shiftData.difference || 0,
      shiftData.diff_reason || '',
      JSON.stringify(shiftData.denominations || {}),
      JSON.stringify(shiftData.expenses || []),
    );

    await logger.info('SHIFT_CLOSED_Z_REPORT', { shiftId: result.lastInsertRowid, diff: shiftData.difference });
    return { success: true, shiftId: Number(result.lastInsertRowid) };
  } catch (err) {
    await logger.error('CLOSE_SHIFT_FAILED', err, { shiftData });
    throw err;
  }
}

async function recordSupplierInwardInvoice(data) {
  const db = await getDB();
  try {
    db.exec('BEGIN');

    const insertBatch = db.prepare(`
      INSERT INTO batches (product_id, batch_number, expiry_date, box_qty, strip_qty, cost_price, sale_price, supplier_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    const updateProd = db.prepare(`
      UPDATE products
      SET stock_boxes = stock_boxes + ?,
          cost_price = COALESCE(?, cost_price),
          sale_price = COALESCE(?, sale_price),
          strip_price = CASE WHEN ? > 0 THEN ? / unit_no ELSE strip_price END
      WHERE id = ?
    `);

    let itemsProcessed = 0;
    for (const item of (data.items || [])) {
      let prodId = item.product_id;
      if (!prodId && item.code) {
        const p = db.prepare('SELECT id FROM products WHERE code = ? OR barcode = ?').get(item.code, item.code);
        if (p) prodId = p.id;
      }
      if (!prodId) continue;

      const qty = parseInt(item.qty, 10) || 1;
      const cost = parseFloat(item.cost_price) || 0;
      const sale = parseFloat(item.sale_price) || 0;
      const expiry = item.expiry_date || '2028-12-31';
      const batchNo = item.batch_number || `BN-${Math.floor(10000 + Math.random() * 89999)}`;

      insertBatch.run(prodId, batchNo, expiry, qty, 0, cost, sale, data.supplier_id || null);
      updateProd.run(qty, cost > 0 ? cost : null, sale > 0 ? sale : null, sale, sale, prodId);
      itemsProcessed++;
    }

    db.exec('COMMIT');
    await logger.info('SUPPLIER_INWARD_RECORDED', { invoiceNo: data.invoice_no, supplier: data.supplier_name, items: itemsProcessed });
    return { success: true, itemsCount: itemsProcessed };
  } catch (err) {
    db.exec('ROLLBACK');
    await logger.error('SUPPLIER_INWARD_FAILED', err, { data });
    throw err;
  }
}

async function getManagerTelemetry() {
  try {
    const db = await getDB();
    const today = new Date().toISOString().slice(0, 10);

    const todaySales = db.prepare(`
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'instapay' THEN total ELSE 0 END), 0) as instapay_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'visa' THEN total ELSE 0 END), 0) as visa_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'later' THEN total ELSE 0 END), 0) as credit_sales
      FROM invoices
      WHERE created_at >= ?
    `).get(today);

    const latestShift = db.prepare(`SELECT * FROM shifts ORDER BY id DESC LIMIT 1`).get() || {
      cashier_name: 'د. إسلام الشريف',
      starting_cash: 500,
      actual_cash: 500,
      status: 'open'
    };

    const totalStock = db.prepare(`
      SELECT 
        COUNT(*) as total_items,
        COALESCE(SUM(stock_boxes * sale_price), 0) as inventory_retail_value,
        COALESCE(SUM(stock_boxes * cost_price), 0) as inventory_cost_value,
        COALESCE(SUM(CASE WHEN stock_boxes <= min_limit THEN 1 ELSE 0 END), 0) as low_stock_count
      FROM products
    `).get();

    const nearExpiry = db.prepare(`
      SELECT COUNT(*) as c 
      FROM batches 
      WHERE status = 'active' AND expiry_date <= '2027-01-01'
    `).get().c;

    const criticalShortages = db.prepare(`
      SELECT id, code, name_en, stock_boxes, min_limit, sale_price
      FROM products
      WHERE stock_boxes <= min_limit
      ORDER BY stock_boxes ASC
      LIMIT 8
    `).all();

    return {
      today: todaySales,
      shift: latestShift,
      inventory: totalStock,
      near_expiry_count: nearExpiry,
      critical_shortages: criticalShortages,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    await logger.error('GET_MANAGER_TELEMETRY_ERROR', err);
    return null;
  }
}

async function getPlanogramHeatmap() {
  try {
    const db = await getDB();
    const shelves = db.prepare(`
      SELECT s.*, 
        COUNT(p.id) as product_count,
        COALESCE(SUM(p.stock_boxes), 0) as total_boxes,
        COALESCE(AVG(p.sale_price), 0) as avg_price
      FROM shelf_locations s
      LEFT JOIN products p ON p.shelf_location_id = s.id
      GROUP BY s.id
      ORDER BY s.zone_code, s.rack, s.shelf_level
    `).all();

    return shelves.map(sh => {
      // Ergonomic classification
      let ergonomicCategory = 'normal';
      let recommendation = 'تنظيم قياسي';
      if (sh.shelf_level === 2 || sh.shelf_level === 3) {
        ergonomicCategory = 'prime_eye_hand';
        recommendation = 'منطقة ذهبية سريعة الحركة (مستوى العين واليد) للأدوية الأكثر طلباً';
      } else if (sh.shelf_level === 4) {
        ergonomicCategory = 'top_overstock';
        recommendation = 'رف علوي لتخزين الباكوات الزائدة والمستلزمات الخفيفة';
      } else {
        ergonomicCategory = 'bottom_heavy';
        recommendation = 'رف سفلي للمحاليل والمطهرات والعلب الثقيلة';
      }

      return {
        ...sh,
        ergonomic_category: ergonomicCategory,
        recommendation
      };
    });
  } catch (err) {
    await logger.error('GET_PLANOGRAM_HEATMAP_ERROR', err);
    return [];
  }
}

module.exports = {
  getDB,
  searchProducts,
  getProductBatches,
  getShelfLocation,
  getAllShelfLocations,
  recordInvoice,
  recordTableDrugDispense,
  getTableDrugsRegistry,
  recordClinicVisit,
  closeShiftSession,
  recordSupplierInwardInvoice,
  getManagerTelemetry,
  getPlanogramHeatmap
};
