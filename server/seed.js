const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs/promises');
const path = require('node:path');
const dbModule = require('./db');
const logger = require('./logger');

const LEGACY_SQLITE_PATH = path.join(__dirname, '..', 'pharmacy_pos_management', 'pharmacy.db');

async function seedSystem() {
  await logger.info('SEED_START', { message: 'Starting Modern Pharmacy Database Seeding...' });
  const db = await dbModule.getDB();

  // 1. SEED SHELF LOCATIONS (Visual 2D Floor Plan Zones)
  const existingShelves = db.prepare('SELECT count(*) as c FROM shelf_locations').get().c;
  if (existingShelves === 0) {
    await logger.info('SEED_SHELVES', { message: 'Seeding 2D Floor Plan Shelves & Zones...' });
    const insertShelf = db.prepare(`
      INSERT INTO shelf_locations (zone_code, zone_name, aisle, rack, shelf_level, bin, x_coord, y_coord, photo_url, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const zones = [
      { code: 'ZONE-A', name: 'المضادات الحيوية والجهاز التنفسي', aisle: 'ممر 1 (يمين)', rack: 'ستاند A-1', x: 20, y: 25 },
      { code: 'ZONE-A', name: 'المضادات الحيوية والجهاز التنفسي', aisle: 'ممر 1 (يمين)', rack: 'ستاند A-2', x: 25, y: 25 },
      { code: 'ZONE-B', name: 'القلب والسكر والأمراض المزمنة', aisle: 'ممر 2 (وسط)', rack: 'ستاند B-1', x: 50, y: 30 },
      { code: 'ZONE-B', name: 'القلب والسكر والأمراض المزمنة', aisle: 'ممر 2 (وسط)', rack: 'ستاند B-2', x: 55, y: 30 },
      { code: 'ZONE-C', name: 'التجميل والعناية بالبشرة والشعر', aisle: 'ممر 3 (واجهة)', rack: 'ستاند C-1', x: 80, y: 25 },
      { code: 'ZONE-C', name: 'التجميل والعناية بالبشرة والشعر', aisle: 'ممر 3 (واجهة)', rack: 'ستاند C-2', x: 85, y: 25 },
      { code: 'ZONE-D', name: 'المسكنات والـ OTC والجهاز الهضمي', aisle: 'ممر 4 (خلفي)', rack: 'ستاند D-1', x: 30, y: 75 },
      { code: 'ZONE-D', name: 'المسكنات والـ OTC والجهاز الهضمي', aisle: 'ممر 4 (خلفي)', rack: 'ستاند D-2', x: 40, y: 75 },
      { code: 'ZONE-E', name: 'الثلاجة والأدوية الحيوية والأنسولين', aisle: 'ممر 5 (خلف الكاشير)', rack: 'ثلاجة عرض 1', x: 85, y: 80 },
      { code: 'ZONE-VAULT', name: 'خزينة أدوية الجدول المراقبة', aisle: 'غرفة الإدارة', rack: 'خزينة حديدية V-1', x: 10, y: 85 },
    ];

    db.exec('BEGIN');
    for (const z of zones) {
      for (let lvl = 1; lvl <= 4; lvl++) {
        insertShelf.run(
          z.code,
          z.name,
          z.aisle,
          z.rack,
          lvl,
          `درج ${lvl}0${Math.floor(Math.random()*9 + 1)}`,
          z.x,
          z.y,
          `/images/shelves/${z.code.toLowerCase()}_level_${lvl}.svg`,
          `رف مستوى ${lvl} مخصص للأدوية الأكثر طلباً`
        );
      }
    }
    db.exec('COMMIT');
  }

  // 2. SEED SUPPLIERS (Egyptian Pharma Distributors)
  const existingSuppliers = db.prepare('SELECT count(*) as c FROM suppliers').get().c;
  if (existingSuppliers === 0) {
    await logger.info('SEED_SUPPLIERS', { message: 'Seeding Egyptian Distributors...' });
    const insertSupplier = db.prepare(`
      INSERT INTO suppliers (code, name, phone, rep_name, rep_phone, cash_discount, quota_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN');
    insertSupplier.run('IBN-SINA', 'ابن سينا فارما (Ibnsina Pharma)', '19555', 'أ/ كريم الدسوقي', '01098765432', 0.22, 'كوتة مفتوحة، توصيل مرتين يومياً (صباحي 10ص / مسائي 6م)');
    insertSupplier.run('UCP', 'الشركة المتحدة للصيادلة (UCP)', '19444', 'أ/ محمد البنا', '01123456789', 0.21, 'موزع رئيسي لشركات نوفارتس وجلاكسو، بوانص دورية 10+2');
    insertSupplier.run('PHARMA-OVERSEAS', 'فارما أوفرسيز (Pharma Overseas)', '19333', 'أ/ أحمد سمير', '01234567890', 0.20, 'أصناف النواقص، تسوية مرتجعات أسبوعية');
    insertSupplier.run('MULTI-PHARMA', 'مالتي فارما (Multi Pharma)', '19222', 'أ/ تامر عاشور', '01011223344', 0.20, 'أدوية أورام وأمراض نادرة');
    insertSupplier.run('RAMCO', 'رامكو فارما (Ramco Pharma)', '19111', 'أ/ هاني شاكر', '01099887766', 0.19, 'مستحضرات تجميل ومكملات غذائية أصلية');
    db.exec('COMMIT');
  }

  // 3. MIGRATE PRODUCTS FROM LEGACY SQLITE (10,215 ITEMS)
  const productCount = db.prepare('SELECT count(*) as c FROM products').get().c;
  if (productCount === 0) {
    await logger.info('SEED_PRODUCTS', { message: 'Migrating 10,215 authentic products...' });

    let legacyDb;
    try {
      legacyDb = new DatabaseSync(LEGACY_SQLITE_PATH, { readOnly: true });
    } catch (err) {
      await logger.error('LEGACY_DB_NOT_ACCESSIBLE', err);
      return;
    }

    const legacyProducts = legacyDb.prepare('SELECT * FROM products').all();
    const shelfIds = db.prepare('SELECT id, zone_code FROM shelf_locations').all();
    const suppliers = db.prepare('SELECT id FROM suppliers').all();

    // Table 1 & Table 2 Drugs keywords in Egypt
    const table1Keywords = ['morphine', 'pethidine', 'fentanyl', 'mst'];
    const table2Keywords = ['lyrica', 'pregabalin', 'zolam', 'alprazolam', 'amotril', 'clonazepam', 'neurontin', 'somadril', 'parkinol', 'gabapentin', 'tramadol'];

    const insertProd = db.prepare(`
      INSERT INTO products (
        code, barcode, name_en, name_ar, category, active_ingredient, strength, form,
        cost_price, sale_price, strip_price, unit_no, stock_boxes, stock_strips, min_limit,
        is_table_drug, table_class, shelf_location_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertBatch = db.prepare(`
      INSERT INTO batches (product_id, batch_number, expiry_date, box_qty, strip_qty, cost_price, sale_price, supplier_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN');
    let imported = 0;
    let batchCount = 0;

    for (const p of legacyProducts) {
      const nameLower = (p.name || '').toLowerCase();

      // Check Table Drug status
      let isTable = 0;
      let tableClass = null;
      if (table1Keywords.some(k => nameLower.includes(k))) {
        isTable = 1;
        tableClass = 'Table 1';
      } else if (table2Keywords.some(k => nameLower.includes(k))) {
        isTable = 2;
        tableClass = 'Table 2';
      }

      // Assign shelf location
      let targetZone = 'ZONE-A';
      if (isTable > 0) {
        targetZone = 'ZONE-VAULT';
      } else if (nameLower.includes('concor') || nameLower.includes('glucophage') || nameLower.includes('plavix') || nameLower.includes('lipitor') || nameLower.includes('crestor') || nameLower.includes('coversyl')) {
        targetZone = 'ZONE-B';
      } else if (nameLower.includes('cream') || nameLower.includes('gel') || nameLower.includes('lotion') || nameLower.includes('serum') || nameLower.includes('laroche') || nameLower.includes('vichy')) {
        targetZone = 'ZONE-C';
      } else if (nameLower.includes('panadol') || nameLower.includes('cataflam') || nameLower.includes('brufen') || nameLower.includes('antinal') || nameLower.includes('spasmocanulase')) {
        targetZone = 'ZONE-D';
      } else if (nameLower.includes('insulin') || nameLower.includes('lantus') || nameLower.includes('novorapid') || nameLower.includes('humalog') || nameLower.includes('vaccine')) {
        targetZone = 'ZONE-E';
      }

      const matchingShelves = shelfIds.filter(s => s.zone_code === targetZone);
      const chosenShelfId = matchingShelves.length > 0 
        ? matchingShelves[Math.floor(Math.random() * matchingShelves.length)].id 
        : shelfIds[0].id;

      // Extract basic strength & form
      const strengthMatch = p.name.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|%|مجم|جم)/i);
      const strength = strengthMatch ? strengthMatch[0] : null;

      let form = 'أقراص (Tablets)';
      if (/syrup|susp|شراب/i.test(p.name)) form = 'شراب (Syrup)';
      else if (/cap|كبسول/i.test(p.name)) form = 'كبسولات (Capsules)';
      else if (/inj|amp|vial|حقن/i.test(p.name)) form = 'حقن (Injection)';
      else if (/cream|كريم/i.test(p.name)) form = 'كريم (Cream)';
      else if (/gel|جل/i.test(p.name)) form = 'جل (Gel)';
      else if (/drops|قطر/i.test(p.name)) form = 'نقط (Drops)';

      const stockBoxes = p.stock_boxes || (Math.random() > 0.3 ? Math.floor(Math.random() * 18 + 2) : 0);
      const stockStrips = p.stock_strips || (stockBoxes > 0 ? Math.floor(Math.random() * 3) : 0);

      const res = insertProd.run(
        p.code,
        p.barcode || p.code,
        p.name,
        p.name, // Will be searched across both
        p.category || 'أدوية',
        p.active_ingredient || null,
        strength,
        form,
        p.cost_price || 0,
        p.sale_price || 0,
        p.strip_price || (p.sale_price / (p.unit_no || 1)),
        p.unit_no || 1,
        stockBoxes,
        stockStrips,
        p.min_limit || 3,
        isTable,
        tableClass,
        chosenShelfId
      );

      const newProdId = Number(res.lastInsertRowid);
      imported++;

      // Create realistic batches for items with stock (Demonstrates Old/New price & Expiry tracking)
      if (stockBoxes > 0) {
        const supId = suppliers[Math.floor(Math.random() * suppliers.length)].id;
        
        if (stockBoxes >= 6 && Math.random() > 0.4) {
          // SPLIT INTO 2 BATCHES: Old batch (old cheaper price) + New batch (new higher price)
          const oldQty = Math.floor(stockBoxes / 2);
          const newQty = stockBoxes - oldQty;
          const oldPrice = p.sale_price;
          const newPrice = Number((p.sale_price * 1.15).toFixed(2)); // 15% price increase in newer batch

          // Batch 1 (Nearer expiry, Old price)
          insertBatch.run(
            newProdId,
            `BN-${Math.floor(10000 + Math.random()*89999)}`,
            '2026-12-31',
            oldQty,
            stockStrips,
            p.cost_price,
            oldPrice,
            supId,
            'active'
          );

          // Batch 2 (Long expiry, New higher price)
          insertBatch.run(
            newProdId,
            `BN-${Math.floor(10000 + Math.random()*89999)}`,
            '2028-06-30',
            newQty,
            0,
            Number((p.cost_price * 1.15).toFixed(2)),
            newPrice,
            supId,
            'active'
          );
          batchCount += 2;
        } else {
          // Single Batch
          insertBatch.run(
            newProdId,
            `BN-${Math.floor(10000 + Math.random()*89999)}`,
            '2027-11-30',
            stockBoxes,
            stockStrips,
            p.cost_price,
            p.sale_price,
            supId,
            'active'
          );
          batchCount++;
        }
      }
    }
    db.exec('COMMIT');

    await logger.info('MIGRATION_COMPLETE', { importedProducts: imported, seededBatches: batchCount });
  }

  // 4. SEED VIP CHRONIC PATIENTS (Smart QR Card Demonstration)
  const custCount = db.prepare('SELECT count(*) as c FROM customers').get().c;
  if (custCount === 0) {
    await logger.info('SEED_CUSTOMERS', { message: 'Seeding VIP Chronic Patients...' });
    const insertCust = db.prepare(`
      INSERT INTO customers (name, phone, national_id, balance_debt, is_chronic, disease, monthly_day, medicines_json, qr_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN');
    insertCust.run(
      'أحمد عبد الفتاح منصور',
      '01012345678',
      '28005140102578',
      450.00,
      1,
      'سكر + ضغط وتصلب شرايين',
      15,
      JSON.stringify([
        { code: '000392', name: 'Coversyl 4mg- 2blisters- 15tab', qty: 1, unit: 'علبة', price: 72 },
        { code: '001195', name: 'Osteonate 10tabl', qty: 1, unit: 'علبة', price: 28 }
      ]),
      'PAT-QR-9821'
    );

    insertCust.run(
      'الحاجة فوزية الشناوي',
      '01198765432',
      '26503120109845',
      120.00,
      1,
      'سكر من النوع الثاني',
      1,
      JSON.stringify([
        { code: '000145', name: 'Baby zinc olive- lotion', qty: 2, unit: 'علبة', price: 3.8 }
      ]),
      'PAT-QR-4451'
    );
    db.exec('COMMIT');
  }

  await logger.info('SEED_ALL_SUCCESS', { message: 'Offline-First Pharmacy Modern Database is 100% Ready!' });
}

if (require.main === module) {
  seedSystem()
    .then(() => process.exit(0))
    .catch(err => {
      process.stderr.write(String(err) + '\n');
      process.exit(1);
    });
}

module.exports = { seedSystem };
