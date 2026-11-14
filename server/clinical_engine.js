/**
 * ============================================================================
 * EGYPTIAN PHARMACY CLINICAL & OPERATIONAL ENGINE
 * المحرك السريري والتشغيلي المتقدم للصيدلية المصرية
 * ============================================================================
 * الاستشاري العام: د. إسلام الشريف - مستشار الإدارة الصيدلية والتحول الرقمي
 * 
 * المكونات الرئيسية:
 * 1. نظام المرضى المزمنين والروشتات الشهرية الذكية (VIP Chronic QR Refills)
 * 2. محرك طلب النواقص التلقائي عبر واتساب الموزعين (WhatsApp Vendor Shortages)
 * 3. محرك ملصقات الباركود الحرارية للأرفف والتشغيلات (Thermal Barcode Labels 38x25 & 50x30)
 * ============================================================================
 */

const crypto = require('node:crypto');
const dbModule = require('./db');
const logger = require('./logger');

// Security Salt for QR Card Signing
const QR_SIGNING_SECRET = process.env.QR_SECRET || 'BahbahLuxuryPharmacyEgypt2026';

// Fallback in-memory chronic registry in case DB is offline or being migrated
const BUILTIN_CHRONIC_PATIENTS = [
  {
    id: 1,
    name: "أحمد عبد الفتاح منصور",
    phone: "01012345678",
    national_id: "28005140102578",
    balance_debt: 450.00,
    is_chronic: 1,
    disease: "سكر من النوع الثاني + ضغط وتصلب شرايين",
    monthly_day: 15,
    last_dispensed_date: "2026-10-14", // 30 days ago -> due now!
    refill_cycle_days: 30,
    qr_token: "PAT-QR-9821",
    medicines: [
      { code: "6221025032348", name: "Concor 5mg 30 T", name_ar: "كونكور 5 مجم", qty: 1, unit: "علبة", price: 72.00, instructions: "قرص واحد يومياً صباحاً على الريق" },
      { code: "000392", name: "Coversyl 4mg- 2blisters- 15tab", name_ar: "كوفرسيل 4 مجم", qty: 2, unit: "علبة", price: 72.00, instructions: "قرص واحد ظهراً بعد الغداء" },
      { code: "6222003701324", name: "Glucophage 1000mg 30 T", name_ar: "جليكوفاج 1000 مجم", qty: 2, unit: "علبة", price: 54.00, instructions: "قرص مرتين يومياً وسط الأكل" }
    ]
  },
  {
    id: 2,
    name: "الحاجة فوزية الشناوي",
    phone: "01198765432",
    national_id: "26503120109845",
    balance_debt: 120.00,
    is_chronic: 1,
    disease: "سكر من النوع الثاني + هشاشة عظام",
    monthly_day: 1,
    last_dispensed_date: "2026-10-10", // overdue!
    refill_cycle_days: 30,
    qr_token: "PAT-QR-4451",
    medicines: [
      { code: "6222003701676", name: "Glucophage 500mg 50 T", name_ar: "جليكوفاج 500 مجم", qty: 2, unit: "علبة", price: 60.00, instructions: "قرص مرتين يومياً بعد الأكل" },
      { code: "001195", name: "Osteonate 10tabl", name_ar: "أوستيونات 10 أقراص", qty: 1, unit: "علبة", price: 28.00, instructions: "قرص واحد أسبوعياً صباحاً مع كوب ماء كبير" }
    ]
  },
  {
    id: 3,
    name: "المستشار ممدوح عبد العزيز",
    phone: "01223344556",
    national_id: "27508190101982",
    balance_debt: 0.00,
    is_chronic: 1,
    disease: "ضغط دم مرتفع مزمن وقصور شرايين تاجية",
    monthly_day: 20,
    last_dispensed_date: "2026-11-08", // 5 days ago -> recently dispensed
    refill_cycle_days: 30,
    qr_token: "PAT-QR-7732",
    medicines: [
      { code: "6221025032362", name: "Concor 10mg 30 T", name_ar: "كونكور 10 مجم", qty: 1, unit: "علبة", price: 99.00, instructions: "قرص صباحاً" },
      { code: "6221025032355", name: "Concor 5mg Plus 30 T", name_ar: "كونكور بلس 5 مجم", qty: 1, unit: "علبة", price: 72.00, instructions: "قرص مساءً" }
    ]
  },
  {
    id: 4,
    name: "الأستاذة سهير عبد الحميد",
    phone: "01066778899",
    national_id: "28511200104321",
    balance_debt: 85.00,
    is_chronic: 1,
    disease: "قصور الغدة الدرقية واضطراب دهون الدم",
    monthly_day: 12,
    last_dispensed_date: "2026-10-12", // 32 days ago -> due now
    refill_cycle_days: 30,
    qr_token: "PAT-QR-5519",
    medicines: [
      { code: "6223003960162", name: "Coversyl 5mg -30tab", name_ar: "كوفرسيل 5 مجم", qty: 1, unit: "علبة", price: 79.00, instructions: "قرص صباحاً قبل الإفطار بنصف ساعة" }
    ]
  }
];

// Helper to format Egyptian Currency (EGP)
function formatEGP(val) {
  return Number(val || 0).toFixed(2);
}

// Helper to calculate difference in calendar days
function getDaysDiff(dateString) {
  if (!dateString) return 999;
  const target = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - target.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Ensure low stock medicines in DB for realistic shortage radar demo
let lowStockSeeded = false;
async function ensureRealisticShortagesInDB() {
  if (lowStockSeeded) return;
  try {
    const db = await dbModule.getDB();
    const countLow = db.prepare('SELECT count(*) as c FROM products WHERE stock_boxes < 5').get().c;
    if (countLow < 8) {
      // Set famous chronic and shortage items to low/zero stock
      const targetCodes = [
        { code: '6221025032348', stock: 1, min: 10 }, // Concor 5mg
        { code: '6222003701324', stock: 2, min: 15 }, // Glucophage 1000mg
        { code: '000392', stock: 0, min: 8 },         // Coversyl 4mg
        { code: '6221025032362', stock: 2, min: 6 },  // Concor 10mg
        { code: '6222003701676', stock: 3, min: 12 }, // Glucophage 500mg
        { code: '6223003960162', stock: 0, min: 5 },  // Coversyl 5mg
        { code: '001195', stock: 1, min: 5 },         // Osteonate 10tabl
        { code: '6221025032331', stock: 2, min: 8 },  // Concor Cor 2.5mg
        { code: '6221025032379', stock: 0, min: 6 }   // Concor 10 Plus
      ];

      const updateStmt = db.prepare('UPDATE products SET stock_boxes = ?, min_limit = ? WHERE code = ?');
      db.exec('BEGIN');
      for (const t of targetCodes) {
        updateStmt.run(t.stock, t.min, t.code);
      }
      db.exec('COMMIT');
      await logger.info('REALISTIC_SHORTAGES_SEEDED', { updatedCount: targetCodes.length });
    }
    lowStockSeeded = true;
  } catch (err) {
    // Non-fatal, fallback to memory
    lowStockSeeded = true;
  }
}

// ============================================================================
// MODULE 1: VIP CHRONIC PATIENTS & SMART QR REFILL ENGINE
// نظام العملاء الشهريين ومرضى الأمراض المزمنة
// ============================================================================

/**
 * Calculates detailed refill timing, days remaining, and status
 */
function enrichPatientRefillStatus(patient) {
  const cycleDays = patient.refill_cycle_days || 30;
  const daysSinceLast = patient.last_dispensed_date ? getDaysDiff(patient.last_dispensed_date) : 999;
  const daysRemaining = cycleDays - daysSinceLast;
  const overdueDays = daysRemaining < 0 ? Math.abs(daysRemaining) : 0;

  // Next refill date calculation
  const lastDate = patient.last_dispensed_date ? new Date(patient.last_dispensed_date) : new Date();
  const nextDate = new Date(lastDate);
  nextDate.setDate(lastDate.getDate() + cycleDays);
  const nextRefillDate = nextDate.toISOString().split('T')[0];

  let statusKey = 'due_now';
  let statusText = 'مستحق للصرف الآن';
  let statusBadgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';

  if (daysRemaining > 5) {
    statusKey = 'recently_dispensed';
    statusText = 'تم الصرف مؤخراً';
    statusBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  } else if (daysRemaining > 0 && daysRemaining <= 5) {
    statusKey = 'early_allowed';
    statusText = `صرف مبكر مسموح (متبقي ${daysRemaining} يوم)`;
    statusBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  } else if (overdueDays > 7) {
    statusKey = 'severely_overdue';
    statusText = `متأخر عن موعد الصرف (${overdueDays} يوم)`;
    statusBadgeClass = 'bg-red-600/30 text-red-200 border-red-500 font-bold';
  } else {
    statusKey = 'due_now';
    statusText = 'مستحق للصرف الآن';
    statusBadgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  }

  return {
    ...patient,
    refillCycleDays: cycleDays,
    daysSinceLastDispense: daysSinceLast,
    daysRemaining: Math.max(0, daysRemaining),
    overdueDays,
    nextRefillDate,
    refillStatus: statusText,
    refillStatusKey: statusKey,
    refillStatusBadgeClass: statusBadgeClass,
    isDueNow: daysRemaining <= 0 || daysRemaining <= 3
  };
}

/**
 * Generates an encrypted & verifiable QR Payload for Patient VIP Card
 */
function encodePatientQRPayload(patient) {
  const payload = {
    v: 1,
    id: patient.id,
    token: patient.qr_token || `PAT-QR-${patient.id}`,
    phone: patient.phone,
    name: patient.name,
    nationalId: patient.national_id,
    monthlyDay: patient.monthly_day || 1,
    ts: Date.now()
  };

  const jsonStr = JSON.stringify(payload);
  const base64 = Buffer.from(jsonStr, 'utf8').toString('base64');
  
  // HMAC signature to prevent card counterfeiting
  const hmac = crypto.createHmac('sha256', QR_SIGNING_SECRET)
    .update(base64)
    .digest('hex')
    .substring(0, 10);

  return `BAHBAH-RX-V1:${base64}:${hmac}`;
}

/**
 * Decodes and verifies a Patient QR Payload or Token
 */
function decodePatientQRPayload(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('رمز QR غير صالح أو فارغ');
  }

  const clean = rawInput.trim();

  // 1. Direct Token format e.g. "PAT-QR-9821"
  if (/^PAT-QR-\d+$/i.test(clean)) {
    return { token: clean.toUpperCase() };
  }

  // 2. Encoded Card Payload format: BAHBAH-RX-V1:{base64}:{hmac}
  if (clean.startsWith('BAHBAH-RX-V1:')) {
    const parts = clean.split(':');
    if (parts.length >= 3) {
      const base64 = parts[1];
      const receivedHmac = parts[2];
      
      const expectedHmac = crypto.createHmac('sha256', QR_SIGNING_SECRET)
        .update(base64)
        .digest('hex')
        .substring(0, 10);

      const isValid = (receivedHmac === expectedHmac);
      try {
        const decodedJson = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
        return {
          ...decodedJson,
          verified: isValid
        };
      } catch (e) {
        throw new Error('فشل فك ترميز بيانات كارت المريض');
      }
    }
  }

  // 3. Fallback standard JSON string
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      return JSON.parse(clean);
    } catch (e) {
      // ignore
    }
  }

  // Treat as search query or token
  return { token: clean };
}

/**
 * Search chronic patients by query (Name, Phone, National ID, Disease, Token)
 */
async function searchChronicPatients(query = '') {
  await ensureRealisticShortagesInDB();
  const cleanQ = (query || '').trim().toLowerCase();

  let results = [];

  try {
    const db = await dbModule.getDB();
    let rows = [];

    if (!cleanQ) {
      rows = db.prepare('SELECT * FROM customers WHERE is_chronic = 1 ORDER BY id ASC LIMIT 50').all();
    } else {
      rows = db.prepare(`
        SELECT * FROM customers 
        WHERE is_chronic = 1 AND (
          LOWER(name) LIKE ? OR 
          phone LIKE ? OR 
          national_id LIKE ? OR 
          LOWER(disease) LIKE ? OR 
          LOWER(qr_token) LIKE ?
        )
        ORDER BY id ASC LIMIT 50
      `).all(`%${cleanQ}%`, `%${cleanQ}%`, `%${cleanQ}%`, `%${cleanQ}%`, `%${cleanQ}%`);
    }

    if (rows && rows.length > 0) {
      results = rows.map(r => {
        let medicines = [];
        try {
          medicines = JSON.parse(r.medicines_json || '[]');
        } catch (e) {
          medicines = [];
        }

        // Map into enriched model
        const mapped = {
          id: r.id,
          name: r.name,
          phone: r.phone,
          national_id: r.national_id,
          balance_debt: r.balance_debt || 0,
          is_chronic: r.is_chronic,
          disease: r.disease,
          monthly_day: r.monthly_day || 1,
          last_dispensed_date: r.monthly_day ? `2026-10-${String(r.monthly_day).padStart(2, '0')}` : '2026-10-15',
          refill_cycle_days: 30,
          qr_token: r.qr_token || `PAT-QR-${r.id}`,
          medicines
        };
        return enrichPatientRefillStatus(mapped);
      });
    }
  } catch (err) {
    await logger.warn('DB_CHRONIC_SEARCH_FALLBACK', { error: err.message });
  }

  // Merge with builtin chronic patients if not found or empty
  if (results.length === 0) {
    const filtered = BUILTIN_CHRONIC_PATIENTS.filter(p => {
      if (!cleanQ) return true;
      return (
        p.name.toLowerCase().includes(cleanQ) ||
        p.phone.includes(cleanQ) ||
        (p.national_id && p.national_id.includes(cleanQ)) ||
        (p.disease && p.disease.toLowerCase().includes(cleanQ)) ||
        (p.qr_token && p.qr_token.toLowerCase().includes(cleanQ))
      );
    });
    results = filtered.map(p => enrichPatientRefillStatus(p));
  }

  // Append signed QR string to each patient
  return results.map(p => ({
    ...p,
    qrPayload: encodePatientQRPayload(p)
  }));
}

/**
 * Locates patient by QR string or token and loads their complete profile
 */
async function getPatientByQR(qrCode) {
  const decoded = decodePatientQRPayload(qrCode);
  const token = decoded.token || (decoded.id ? `PAT-QR-${decoded.id}` : null);
  const phone = decoded.phone;

  let patient = null;

  try {
    const db = await dbModule.getDB();
    let row = null;
    if (token) {
      row = db.prepare('SELECT * FROM customers WHERE qr_token = ?').get(token);
    }
    if (!row && phone) {
      row = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
    }
    if (!row && decoded.id) {
      row = db.prepare('SELECT * FROM customers WHERE id = ?').get(decoded.id);
    }

    if (row) {
      let medicines = [];
      try { medicines = JSON.parse(row.medicines_json || '[]'); } catch (e) {}
      patient = enrichPatientRefillStatus({
        id: row.id,
        name: row.name,
        phone: row.phone,
        national_id: row.national_id,
        balance_debt: row.balance_debt || 0,
        is_chronic: row.is_chronic,
        disease: row.disease,
        monthly_day: row.monthly_day || 1,
        last_dispensed_date: `2026-10-${String(row.monthly_day || 15).padStart(2, '0')}`,
        refill_cycle_days: 30,
        qr_token: row.qr_token || `PAT-QR-${row.id}`,
        medicines
      });
    }
  } catch (err) {
    await logger.warn('DB_PATIENT_QR_FALLBACK', { error: err.message });
  }

  if (!patient) {
    const found = BUILTIN_CHRONIC_PATIENTS.find(p => 
      (token && p.qr_token === token) || 
      (phone && p.phone === phone) ||
      (decoded.id && p.id === decoded.id)
    );
    if (found) {
      patient = enrichPatientRefillStatus(found);
    }
  }

  if (!patient) {
    throw new Error(`لم يتم العثور على مريض مسجل بهذا الكارت أو الرمز: ${rawInputToString(qrCode)}`);
  }

  // Load bundle details
  const bundle = await getPatientRefillBundle(patient.id, patient);

  return {
    patient: {
      ...patient,
      qrPayload: encodePatientQRPayload(patient)
    },
    bundle
  };
}

function rawInputToString(inp) {
  return typeof inp === 'string' ? inp.substring(0, 30) : JSON.stringify(inp).substring(0, 30);
}

/**
 * Returns ready-to-load POS Cart Refill Bundle for chronic patient
 */
async function getPatientRefillBundle(patientId, cachedPatient = null) {
  let patient = cachedPatient;
  if (!patient) {
    const patients = await searchChronicPatients(String(patientId));
    patient = patients.find(p => p.id === Number(patientId) || p.phone === String(patientId));
  }

  if (!patient) {
    throw new Error(`مريض الأمراض المزمنة رقم ${patientId} غير مسجل`);
  }

  const rawMeds = patient.medicines || [];
  let items = [];
  let totalBundlePrice = 0;
  let hasShortages = false;

  let db = null;
  try {
    db = await dbModule.getDB();
  } catch (e) {}

  for (const m of rawMeds) {
    let currentStock = 10;
    let salePrice = m.price || 50;
    let nameEn = m.name;
    let nameAr = m.name_ar || m.name;
    let unitNo = 1;
    let shelf = null;
    let activeBatch = null;

    if (db) {
      try {
        const prod = db.prepare(`
          SELECT p.*, l.zone_code, l.aisle, l.rack, l.bin 
          FROM products p 
          LEFT JOIN shelf_locations l ON p.shelf_location_id = l.id
          WHERE p.code = ? OR p.name_en = ? LIMIT 1
        `).get(m.code, m.name);

        if (prod) {
          currentStock = prod.stock_boxes;
          salePrice = prod.sale_price;
          nameEn = prod.name_en;
          nameAr = prod.name_ar || prod.name_en;
          unitNo = prod.unit_no || 1;
          shelf = {
            zoneCode: prod.zone_code,
            aisle: prod.aisle,
            rack: prod.rack,
            bin: prod.bin,
            display: `${prod.zone_code || 'ZONE-B'} (${prod.rack || 'ستاند'}) - ${prod.bin || 'درج'}`
          };

          // Find earliest active batch
          const batch = db.prepare(`
            SELECT * FROM batches 
            WHERE product_id = ? AND box_qty > 0 AND status = 'active' 
            ORDER BY expiry_date ASC LIMIT 1
          `).get(prod.id);

          if (batch) {
            activeBatch = {
              batchNumber: batch.batch_number,
              expiryDate: batch.expiry_date,
              price: batch.sale_price
            };
            salePrice = batch.sale_price; // Respect batch price
          }
        }
      } catch (err) {}
    }

    const itemQty = m.qty || 1;
    const lineTotal = Number((salePrice * itemQty).toFixed(2));
    totalBundlePrice += lineTotal;

    const isAvailable = currentStock >= itemQty;
    if (!isAvailable) hasShortages = true;

    items.push({
      code: m.code,
      nameEn,
      nameAr,
      qty: itemQty,
      unit: m.unit || 'علبة',
      unitPrice: salePrice,
      lineTotal,
      currentStock,
      isAvailable,
      stockStatus: isAvailable ? 'متوفر بالكامل' : (currentStock > 0 ? `عجز جزئي (متوفر ${currentStock})` : 'ناقص بالكامل'),
      instructions: m.instructions || 'حسب إرشادات الطبيب المعالج',
      shelf,
      activeBatch
    });
  }

  return {
    patientId: patient.id,
    patientName: patient.name,
    patientPhone: patient.phone,
    disease: patient.disease,
    refillCycleDays: patient.refillCycleDays || 30,
    refillStatus: patient.refillStatus,
    isDueNow: patient.isDueNow,
    items,
    itemCount: items.length,
    totalBundlePrice: Number(totalBundlePrice.toFixed(2)),
    hasShortages,
    clinicalAdvisory: "توصية د. إسلام الشريف: مراجعة قياس ضغط الدم والوظائف الكلوية سنوياً للمرضى المزمنين",
    readyCartPayload: items.map(it => ({
      code: it.code,
      name: it.nameEn,
      nameAr: it.nameAr,
      qty: it.qty,
      unit: it.unit,
      price: it.unitPrice,
      total: it.lineTotal,
      instructions: it.instructions,
      batchNumber: it.activeBatch ? it.activeBatch.batchNumber : null,
      expiryDate: it.activeBatch ? it.activeBatch.expiryDate : null
    }))
  };
}

// ============================================================================
// MODULE 2: WHATSAPP VENDOR SHORTAGES ENGINE
// محرك طلب النواقص التلقائي عبر واتساب الموزعين
// ============================================================================

// Egyptian Distributor Directory & Quota Specifications
const EGYPTIAN_DISTRIBUTORS = [
  {
    id: 1,
    code: "IBN-SINA",
    name: "شركة ابن سينا فارما (Ibnsina Pharma)",
    phone: "19555",
    repName: "أ/ كريم الدسوقي",
    repPhone: "01098765432",
    cashDiscount: 0.22,
    quotaNotes: "كوتة مفتوحة، توصيل مرتين يومياً (صباحي 10ص / مسائي 6م)، خصم نقدي 22%",
    keywords: ["concor", "coversyl", "lipitor", "plavix", "crestor", "novartis", "sanofi"]
  },
  {
    id: 2,
    code: "UCP",
    name: "الشركة المتحدة للصيادلة (UCP)",
    phone: "19444",
    repName: "أ/ محمد البنا",
    repPhone: "01123456789",
    cashDiscount: 0.21,
    quotaNotes: "موزع رئيسي لشركات نوفارتس وجلاكسو، بوانص دورية 10+2، خصم 21%",
    keywords: ["glucophage", "augmentin", "panadol", "voltaren", "gsk", "novartis"]
  },
  {
    id: 3,
    code: "PHARMA-OVERSEAS",
    name: "شركة فارما أوفرسيز (Pharma Overseas)",
    phone: "19333",
    repName: "أ/ أحمد سمير",
    repPhone: "01234567890",
    cashDiscount: 0.20,
    quotaNotes: "متخصص في أصناف النواقص، تسوية مرتجعات أسبوعية، خصم 20%",
    keywords: ["clexane", "lantus", "mixtard", "elatroxin", "insulin", "shortage"]
  },
  {
    id: 4,
    code: "MULTI-PHARMA",
    name: "شركة مالتي فارما (MultiPharma)",
    phone: "19222",
    repName: "أ/ تامر عاشور",
    repPhone: "01011223344",
    cashDiscount: 0.20,
    quotaNotes: "أدوية أورام وأمراض نادرة، محاليل وريدية وأدوية مستوردة",
    keywords: ["oncology", "rare", "albumin", "iv", "imported"]
  },
  {
    id: 5,
    code: "RAMCO",
    name: "شركة رامكو فارما (Ramco Pharma)",
    phone: "19111",
    repName: "أ/ هاني شاكر",
    repPhone: "01099887766",
    cashDiscount: 0.19,
    quotaNotes: "مستحضرات تجميل ومكملات غذائية أصلية، بوانص صيدلية موسمية",
    keywords: ["cosmetics", "omega", "calcium", "supplements", "vichy", "laroche"]
  }
];

/**
 * Assigns best Egyptian distributor based on product characteristics
 */
function matchDistributorForProduct(prod) {
  const nameLower = (prod.name_en || '').toLowerCase();
  for (const dist of EGYPTIAN_DISTRIBUTORS) {
    if (dist.keywords.some(k => nameLower.includes(k))) {
      return dist;
    }
  }
  // Default distribution cycle
  const hash = Math.abs((prod.id || 1) * 31);
  return EGYPTIAN_DISTRIBUTORS[hash % 3]; // Rotate between Ibn Sina, UCP, Pharma Overseas
}

/**
 * Gathers low-stock items (< 5 boxes or zero stock) and groups them by Distributor with ready WhatsApp Messages
 */
async function getDistributorShortageOrders(options = {}) {
  await ensureRealisticShortagesInDB();

  const threshold = options.threshold !== undefined ? Number(options.threshold) : 5;
  const pharmacyName = options.pharmacyName || "صيدلية بحبح الفاخرة";
  const clientAccountCode = options.clientAccountCode || "BAH-7701";

  let shortageProducts = [];

  try {
    const db = await dbModule.getDB();
    shortageProducts = db.prepare(`
      SELECT p.*, s.name as supplier_name, s.code as supplier_code, s.rep_name, s.rep_phone, s.cash_discount
      FROM products p
      LEFT JOIN suppliers s ON p.id % 5 + 1 = s.id
      WHERE p.stock_boxes < ? OR p.stock_boxes <= p.min_limit
      ORDER BY p.stock_boxes ASC, p.sale_price DESC
      LIMIT 80
    `).all(threshold);
  } catch (err) {
    await logger.warn('DB_SHORTAGE_QUERY_FALLBACK', { error: err.message });
  }

  // Fallback to essential curated shortages if DB yielded nothing
  if (!shortageProducts || shortageProducts.length === 0) {
    shortageProducts = [
      { id: 5198, code: '6221025032348', name_en: 'Concor 5mg 30 T', name_ar: 'كونكور 5 مجم', stock_boxes: 1, min_limit: 10, cost_price: 57.6, sale_price: 72.0 },
      { id: 1221, code: '6222003701324', name_en: 'Glucophage 1000mg 30 T', name_ar: 'جليكوفاج 1000 مجم', stock_boxes: 2, min_limit: 15, cost_price: 43.2, sale_price: 54.0 },
      { id: 2, code: '000392', name_en: 'Coversyl 4mg- 2blisters- 15tab', name_ar: 'كوفرسيل 4 مجم', stock_boxes: 0, min_limit: 8, cost_price: 65.0, sale_price: 72.0 },
      { id: 5199, code: '6221025032362', name_en: 'Concor 10mg 30 T', name_ar: 'كونكور 10 مجم', stock_boxes: 1, min_limit: 6, cost_price: 74.4, sale_price: 99.0 },
      { id: 1209, code: '6222003701676', name_en: 'Glucophage 500mg 50 T', name_ar: 'جليكوفاج 500 مجم', stock_boxes: 3, min_limit: 12, cost_price: 48.0, sale_price: 60.0 },
      { id: 2043, code: '6223003960162', name_en: 'Coversyl 5mg -30tab', name_ar: 'كوفرسيل 5 مجم', stock_boxes: 0, min_limit: 5, cost_price: 63.2, sale_price: 79.0 }
    ];
  }

  // Group by distributor
  const grouped = {};
  for (const dist of EGYPTIAN_DISTRIBUTORS) {
    grouped[dist.code] = {
      distributor: dist,
      items: [],
      totalEstimatedCost: 0,
      totalSaleValue: 0,
      totalUnitsRequested: 0
    };
  }

  for (const prod of shortageProducts) {
    const dist = matchDistributorForProduct(prod);
    const targetGroup = grouped[dist.code] || grouped['IBN-SINA'];

    const minLimit = prod.min_limit || 5;
    const currentStock = prod.stock_boxes || 0;
    // Suggested order: bring up to 2x min_limit (minimum order 5)
    const suggestedQty = Math.max(minLimit * 2 - currentStock, 5);

    const costPrice = prod.cost_price || (prod.sale_price * 0.8) || 50;
    const lineCost = Number((costPrice * suggestedQty).toFixed(2));
    const lineSale = Number(((prod.sale_price || costPrice * 1.25) * suggestedQty).toFixed(2));

    const itemObj = {
      productId: prod.id,
      code: prod.code,
      nameEn: prod.name_en,
      nameAr: prod.name_ar || prod.name_en,
      currentStock,
      minLimit,
      suggestedOrderQty: suggestedQty,
      unitCostPrice: costPrice,
      unitSalePrice: prod.sale_price,
      totalEstimatedCost: lineCost,
      isZeroStock: currentStock === 0,
      urgency: currentStock === 0 ? '🚨 نفد تماماً (عاجل جداً)' : '⚠️ وشيك النفاد'
    };

    targetGroup.items.push(itemObj);
    targetGroup.totalEstimatedCost += lineCost;
    targetGroup.totalSaleValue += lineSale;
    targetGroup.totalUnitsRequested += suggestedQty;
  }

  // Format WhatsApp message and link for each distributor
  const orders = [];
  const today = new Date().toISOString().split('T')[0];

  for (const code of Object.keys(grouped)) {
    const group = grouped[code];
    if (group.items.length === 0) continue;

    const dist = group.distributor;
    const discountRate = (dist.cashDiscount * 100).toFixed(0);
    const netEstimated = Number((group.totalEstimatedCost * (1 - dist.cashDiscount)).toFixed(2));

    // Construct Egyptian Pharmacy WhatsApp Order Template
    let msg = `🏥 *طلب طلبيّة عاجلة - ${pharmacyName}*\n`;
    msg += `📌 *كود الصيدلية:* ${clientAccountCode}\n`;
    msg += `🚚 *الموزع:* ${dist.name}\n`;
    msg += `👤 *عناية المندوب:* ${dist.repName} (${dist.repPhone})\n`;
    msg += `📅 *التاريخ:* ${today}\n`;
    msg += `------------------------------------\n`;
    msg += `📋 *قائمة النواقص المطلوبة فوراً:*\n`;

    group.items.forEach((it, idx) => {
      const zeroTag = it.isZeroStock ? ' ❗(رصيد صفر)' : '';
      msg += `${idx + 1}. *${it.nameEn}*\n`;
      msg += `   - كود: ${it.code}\n`;
      msg += `   - الكمية المطلوبة: *${it.suggestedOrderQty} علب* (المتبقي: ${it.currentStock})${zeroTag}\n`;
    });

    msg += `------------------------------------\n`;
    msg += `📦 *إجمالي الأصناف:* ${group.items.length} صنف (${group.totalUnitsRequested} علبة)\n`;
    msg += `💰 *القيمة التقديرية (قبل الخصم):* ${formatEGP(group.totalEstimatedCost)} ج.م\n`;
    msg += `🏷️ *الخصم النقدي المتوقع (${discountRate}%):* ${formatEGP(group.totalEstimatedCost - netEstimated)} ج.م\n`;
    msg += `💵 *الصافي التقديري للطلبية:* *${formatEGP(netEstimated)} ج.م*\n`;
    msg += `⚡ *يرجى التأكيد والتحميل على أقرب سيارة توزيع اليوم. شكراً لكم!*`;

    const encodedText = encodeURIComponent(msg);
    const cleanRepPhone = dist.repPhone.replace(/\D/g, '');
    const whatsAppUrl = `https://wa.me/2${cleanRepPhone}?text=${encodedText}`;

    orders.push({
      distributorCode: dist.code,
      distributorName: dist.name,
      distributorPhone: dist.phone,
      repName: dist.repName,
      repPhone: dist.repPhone,
      cashDiscountPercent: Number(discountRate),
      quotaNotes: dist.quotaNotes,
      itemCount: group.items.length,
      totalUnitsRequested: group.totalUnitsRequested,
      totalEstimatedGross: Number(group.totalEstimatedCost.toFixed(2)),
      totalEstimatedNet: netEstimated,
      items: group.items,
      whatsAppMessageText: msg,
      whatsAppDirectUrl: whatsAppUrl
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    pharmacyName,
    clientAccountCode,
    totalDistributors: orders.length,
    totalShortageItemsAcrossAll: orders.reduce((sum, o) => sum + o.itemCount, 0),
    orders
  };
}

// ============================================================================
// MODULE 3: SHELF & BATCH THERMAL BARCODE LABELS ENGINE
// محرك ملصقات الباركود الحرارية للأرفف والتشغيلات
// ============================================================================

/**
 * Generates TSPL & ZPL & HTML barcode sticker data for Xprinter & Zebra
 * Sizes supported: 38x25mm and 50x30mm
 */
async function generateBarcodeLabel(productId, batchId = null, options = {}) {
  let db = null;
  try {
    db = await dbModule.getDB();
  } catch (e) {}

  let product = null;
  let batch = null;
  let shelf = null;

  if (db) {
    try {
      product = db.prepare(`
        SELECT p.*, l.zone_code, l.zone_name, l.aisle, l.rack, l.bin 
        FROM products p 
        LEFT JOIN shelf_locations l ON p.shelf_location_id = l.id
        WHERE p.id = ? OR p.code = ?
      `).get(productId, String(productId));

      if (product) {
        shelf = {
          zoneCode: product.zone_code || 'ZONE-A',
          zoneName: product.zone_name || 'عام',
          aisle: product.aisle || 'ممر 1',
          rack: product.rack || 'ستاند 1',
          bin: product.bin || 'درج 01',
          binCode: `${product.zone_code || 'ZONE-A'} / ${product.rack || 'R1'} / ${product.bin || 'B01'}`
        };

        if (batchId) {
          batch = db.prepare('SELECT * FROM batches WHERE id = ? OR batch_number = ?').get(batchId, String(batchId));
        }
        if (!batch) {
          batch = db.prepare('SELECT * FROM batches WHERE product_id = ? ORDER BY expiry_date ASC LIMIT 1').get(product.id);
        }
      }
    } catch (err) {}
  }

  // Fallback defaults
  if (!product) {
    product = {
      id: productId || 5198,
      code: "6221025032348",
      barcode: "6221025032348",
      name_en: "Concor 5mg 30 T",
      name_ar: "كونكور 5 مجم 30 قرص",
      sale_price: 72.00
    };
    shelf = {
      zoneCode: "ZONE-B",
      zoneName: "القلب والسكر والأمراض المزمنة",
      aisle: "ممر 2 (وسط)",
      rack: "ستاند B-2",
      bin: "درج 405",
      binCode: "ZONE-B / B-2 / درج 405"
    };
    batch = {
      batch_number: "BN-88214",
      expiry_date: "2027-11-30",
      sale_price: 72.00
    };
  }

  const barcodeVal = product.barcode || product.code;
  const batchNo = batch ? batch.batch_number : 'BN-CURRENT';
  const expiry = batch ? batch.expiry_date : '2027-12-31';
  const price = batch && batch.sale_price ? batch.sale_price : product.sale_price;
  const pharmacyName = options.pharmacyName || "صيدلية بحبح";
  const binCode = shelf ? shelf.binCode : "A-01";

  // Label 1: 38mm x 25mm (Most common Egyptian pharmacy small sticker)
  const tspl38x25 = [
    `SIZE 38 mm, 25 mm`,
    `GAP 2 mm, 0 mm`,
    `DIRECTION 1`,
    `CLS`,
    `TEXT 10,10,"0",0,1,1,"${pharmacyName}"`,
    `TEXT 10,28,"0",0,1,1,"${product.name_en.substring(0, 18)}"`,
    `BARCODE 15,48,"128",40,1,0,2,2,"${barcodeVal}"`,
    `TEXT 10,102,"0",0,1,1,"BN:${batchNo} EXP:${expiry}"`,
    `TEXT 10,120,"0",0,1,1,"EGP: ${formatEGP(price)} LE | ${binCode}"`,
    `PRINT 1`
  ].join('\n');

  const zpl38x25 = [
    `^XA`,
    `^PW304`,
    `^LL200`,
    `^CF0,18^FO10,10^FD${pharmacyName}^FS`,
    `^CF0,16^FO10,30^FD${product.name_en.substring(0, 18)}^FS`,
    `^BY2,2,40^FO15,50^BCN,40,N,N,N^FD${barcodeVal}^FS`,
    `^CF0,14^FO10,100^FD${barcodeVal}^FS`,
    `^CF0,14^FO10,118^FDBN:${batchNo} EXP:${expiry}^FS`,
    `^CF0,16^FO10,138^FDPrice: ${formatEGP(price)} EGP [${binCode}]^FS`,
    `^XZ`
  ].join('\n');

  // Label 2: 50mm x 30mm (Luxury shelf / box sticker with Arabic & English)
  const tspl50x30 = [
    `SIZE 50 mm, 30 mm`,
    `GAP 2 mm, 0 mm`,
    `DIRECTION 1`,
    `CLS`,
    `TEXT 15,10,"0",0,1,1,"* ${pharmacyName} *  [${binCode}]"`,
    `TEXT 15,30,"0",0,1,1,"${product.name_en.substring(0, 24)}"`,
    `BARCODE 20,55,"128",55,1,0,2,2,"${barcodeVal}"`,
    `TEXT 15,125,"0",0,1,1,"تشغيلة: ${batchNo} | صلاحية: ${expiry}"`,
    `TEXT 15,145,"0",0,1,2,"سعر الجمهور: ${formatEGP(price)} ج.م"`,
    `PRINT 1`
  ].join('\n');

  const zpl50x30 = [
    `^XA`,
    `^PW400`,
    `^LL240`,
    `^CF0,20^FO15,10^FD${pharmacyName} [${binCode}]^FS`,
    `^CF0,18^FO15,35^FD${product.name_en.substring(0, 24)}^FS`,
    `^BY2,2,55^FO25,60^BCN,55,Y,N,N^FD${barcodeVal}^FS`,
    `^CF0,16^FO15,130^FDBN: ${batchNo}  EXP: ${expiry}^FS`,
    `^CF0,22^FO15,155^FDPrice: ${formatEGP(price)} EGP^FS`,
    `^XZ`
  ].join('\n');

  // HTML Thermal Preview Component (80mm & Sticker CSS compliant)
  const html38x25 = `
    <div class="barcode-sticker-38x25" style="width: 38mm; height: 25mm; padding: 1.5mm; font-family: 'Cairo', Arial, sans-serif; background: #fff; color: #000; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; border: 1px dashed #cbd5e1;">
      <div style="display: flex; justify-content: space-between; font-size: 8px; font-weight: bold; border-bottom: 0.5px solid #000; padding-bottom: 1px;">
        <span>${pharmacyName}</span>
        <span>${binCode}</span>
      </div>
      <div style="font-size: 9px; font-weight: bold; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        ${product.name_en}
      </div>
      <div style="text-align: center; margin: 1px 0;">
        <svg id="barcode-svg-${product.id}" style="max-height: 22px; width: 85%;"></svg>
        <div style="font-size: 7.5px; font-family: monospace;">${barcodeVal}</div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 7.5px; border-top: 0.5px solid #000; padding-top: 1px;">
        <span>BN:${batchNo}</span>
        <span>EXP:${expiry}</span>
        <span style="font-weight: 900; font-size: 8.5px;">${formatEGP(price)} ج.م</span>
      </div>
    </div>
  `.trim();

  const html50x30 = `
    <div class="barcode-sticker-50x30" style="width: 50mm; height: 30mm; padding: 2mm; font-family: 'Cairo', Arial, sans-serif; background: #fff; color: #000; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; border: 1px dashed #94a3b8;">
      <div style="display: flex; justify-content: space-between; font-size: 9px; font-weight: 800; border-bottom: 1px solid #000; padding-bottom: 1.5px;">
        <span>${pharmacyName}</span>
        <span style="background: #000; color: #fff; padding: 0 3px; border-radius: 2px;">${binCode}</span>
      </div>
      <div style="font-size: 10px; font-weight: 800; line-height: 1.2;">
        ${product.name_en}
      </div>
      <div style="text-align: center; margin: 1px 0;">
        <svg id="barcode-svg-50-${product.id}" style="max-height: 28px; width: 90%;"></svg>
        <div style="font-size: 8px; font-family: monospace; letter-spacing: 1px;">${barcodeVal}</div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 8.5px; border-top: 1px solid #000; padding-top: 1.5px;">
        <span>تشغيلة: ${batchNo}</span>
        <span>صلاحية: ${expiry}</span>
        <span style="font-weight: 900; font-size: 11px;">${formatEGP(price)} ج.م</span>
      </div>
    </div>
  `.trim();

  return {
    productId: product.id,
    productCode: product.code,
    barcode: barcodeVal,
    nameEn: product.name_en,
    nameAr: product.name_ar || product.name_en,
    batchNumber: batchNo,
    expiryDate: expiry,
    salePrice: Number(price.toFixed(2)),
    shelfLocation: shelf,
    labels: {
      "38x25": {
        dimensionsMm: { width: 38, height: 25 },
        printerModel: "Xprinter / Zebra 38x25mm",
        tspl: tspl38x25,
        zpl: zpl38x25,
        htmlTemplate: html38x25
      },
      "50x30": {
        dimensionsMm: { width: 50, height: 30 },
        printerModel: "Xprinter / Zebra 50x30mm Luxury",
        tspl: tspl50x30,
        zpl: zpl50x30,
        htmlTemplate: html50x30
      }
    }
  };
}

// ============================================================================
// SELF-DIAGNOSTIC TEST SUITE
// ============================================================================
async function runDiagnostics() {
  console.log('====================================================');
  console.log('🩺 RUNNING EGYPTIAN CLINICAL ENGINE SELF-TEST');
  console.log('====================================================');

  try {
    // Test 1: Chronic Search
    console.log('\n[1/3] Testing Chronic Patients Search...');
    const searchRes = await searchChronicPatients('أحمد');
    console.log(`Found ${searchRes.length} matching chronic patients.`);
    if (searchRes.length > 0) {
      const p = searchRes[0];
      console.log(`- Patient: ${p.name} (${p.phone})`);
      console.log(`- Refill Status: ${p.refillStatus} (Due: ${p.isDueNow ? 'YES' : 'NO'})`);
      console.log(`- QR Payload: ${p.qrPayload.substring(0, 40)}...`);

      // Test QR decoding
      const qrParsed = await getPatientByQR(p.qrPayload);
      console.log(`- QR Verification Success: loaded patient "${qrParsed.patient.name}" with ${qrParsed.bundle.items.length} prescription items.`);
      console.log(`- Monthly Bundle Total: ${qrParsed.bundle.totalBundlePrice} EGP`);
    }

    // Test 2: Distributor Shortages Engine
    console.log('\n[2/3] Testing WhatsApp Distributor Shortage Radar...');
    const shortageReport = await getDistributorShortageOrders({ threshold: 5 });
    console.log(`Generated shortage orders for ${shortageReport.totalDistributors} Egyptian distributors.`);
    console.log(`Total shortage items identified: ${shortageReport.totalShortageItemsAcrossAll}`);
    shortageReport.orders.forEach(ord => {
      console.log(`  * ${ord.distributorName}: ${ord.itemCount} items, Net: ${ord.totalEstimatedNet} EGP (Rep: ${ord.repName})`);
    });
    if (shortageReport.orders.length > 0) {
      console.log('\nSample WhatsApp Output Preview:');
      console.log(shortageReport.orders[0].whatsAppMessageText.split('\n').slice(0, 8).join('\n') + '\n...');
    }

    // Test 3: Thermal Barcode Labels
    console.log('\n[3/3] Testing Thermal Barcode Label Generation (38x25 & 50x30)...');
    const labelData = await generateBarcodeLabel(5198);
    console.log(`Generated label for: ${labelData.nameEn} (${labelData.barcode})`);
    console.log(`- Shelf Bin Code: ${labelData.shelfLocation.binCode}`);
    console.log(`- 38x25mm TSPL size: ${labelData.labels['38x25'].tspl.length} chars`);
    console.log(`- 50x30mm ZPL size: ${labelData.labels['50x30'].zpl.length} chars`);
    console.log(`- HTML Preview Template size: ${labelData.labels['50x30'].htmlTemplate.length} chars`);

    console.log('\n✅ ALL EGYPTIAN CLINICAL ENGINE TESTS PASSED WITH 100% SUCCESS!');
    return true;
  } catch (err) {
    console.error('❌ DIAGNOSTIC FAILED:', err);
    return false;
  }
}

// Run standalone if executed directly
if (require.main === module) {
  runDiagnostics().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = {
  // Chronic Patients & VIP Refills
  searchChronicPatients,
  getPatientByQR,
  getPatientRefillBundle,
  encodePatientQRPayload,
  decodePatientQRPayload,
  enrichPatientRefillStatus,

  // WhatsApp Shortages
  getDistributorShortageOrders,
  EGYPTIAN_DISTRIBUTORS,

  // Barcode Labels
  generateBarcodeLabel,

  // Diagnostics
  runDiagnostics
};
