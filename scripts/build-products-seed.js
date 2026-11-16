const fs = require('fs');

// Read real-catalog.json
const realCatalog = JSON.parse(fs.readFileSync('./src/lib/bahbah/real-catalog.json', 'utf8'));

// Valid category IDs in public.categories
const VALID_CATS = new Set([
  'medicines',
  'chronic',
  'cold-flu',
  'digestive',
  'vitamins',
  'mom-baby',
  'skin-care',
  'devices',
  'first-aid'
]);

function mapCategory(cat, nameAr = '') {
  if (!cat) return 'medicines';
  const c = cat.toLowerCase().trim();
  const n = (nameAr || '').toLowerCase();

  if (c === 'skincare' || c === 'skin-care' || c === 'personal') return 'skin-care';
  if (c === 'baby' || c === 'mom-baby') return 'mom-baby';
  if (c === 'devices' || c === 'device') return 'devices';
  if (c === 'vitamins' || c === 'fitness') return 'vitamins';
  if (c === 'chronic') return 'chronic';
  if (c === 'cold-flu') return 'cold-flu';
  if (c === 'digestive') return 'digestive';
  if (c === 'first-aid') return 'first-aid';

  // Keyword inferences
  if (n.includes('سكر') || n.includes('ضغط') || n.includes('قلب') || n.includes('كوليسترول')) return 'chronic';
  if (n.includes('مغص') || n.includes('قولون') || n.includes('معدة') || n.includes('حموضة')) return 'digestive';
  if (n.includes('برد') || n.includes('رشح') || n.includes('إنفلونزا') || n.includes('سعال') || n.includes('كحة')) return 'cold-flu';
  if (n.includes('شاش') || n.includes('بلاستر') || n.includes('قطن') || n.includes('كحول') || n.includes('مطهر')) return 'first-aid';

  return 'medicines';
}

function escapeSql(str) {
  if (str == null) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

// Map real catalog items
const productsMap = new Map();

for (const p of realCatalog) {
  const cat = mapCategory(p.category, p.nameAr);
  productsMap.set(p.id, {
    id: p.id,
    code: p.id,
    barcode: p.barcode || null,
    name_ar: p.nameAr || 'منتج صيدلية بحبح',
    name_en: p.nameEn || p.nameAr || 'Bahbah Product',
    category_id: cat,
    active_ingredient: p.ingredientAr || p.ingredientEn || null,
    strength: null,
    form: p.formAr || p.formEn || null,
    price: Number(p.price) || 10,
    strip_price: Math.round((Number(p.price) || 10) / 2),
    old_price: p.oldPrice ? Number(p.oldPrice) : null,
    stock_boxes: Number(p.stock) || 15,
    image_url: p.img || null,
    verified_photo: Boolean(p.img && !p.img.includes('placeholder')),
    requires_rx: Boolean(p.rx)
  });
}

// Extract featured products from data.ts
const dataContent = fs.readFileSync('./src/lib/bahbah/data.ts', 'utf8');
const featuredBlock = dataContent.slice(
  dataContent.indexOf('const featuredProducts: Product[] = ['),
  dataContent.indexOf('const mappedRealProducts: Product[] =')
);

// Match product objects inside featuredProducts
const itemRegex = /{\s*id:\s*"([^"]+)",\s*nameAr:\s*"([^"]+)",\s*nameEn:\s*"([^"]+)",[\s\S]*?category:\s*"([^"]+)",\s*price:\s*([0-9.]+),[\s\S]*?stock:\s*([0-9]+),[\s\S]*?}/g;
let m;
let featuredCount = 0;
while ((m = itemRegex.exec(featuredBlock)) !== null) {
  const id = m[1];
  const nameAr = m[2];
  const nameEn = m[3];
  const category = m[4];
  const price = Number(m[5]);
  const stock = Number(m[6]);

  const cat = mapCategory(category, nameAr);
  productsMap.set(id, {
    id,
    code: id,
    barcode: null,
    name_ar: nameAr,
    name_en: nameEn,
    category_id: cat,
    active_ingredient: null,
    strength: null,
    form: null,
    price: price || 10,
    strip_price: Math.round((price || 10) / 2),
    old_price: null,
    stock_boxes: stock || 20,
    image_url: null,
    verified_photo: true,
    requires_rx: false
  });
  featuredCount++;
}

console.log('Processed', realCatalog.length, 'real catalog items and', featuredCount, 'featured products.');
console.log('Total unique products:', productsMap.size);

// Generate SQL in chunks of 250
let sql = `-- ============================================================================
-- صيدلية بحبح — بذر كتالوج المنتجات الكامل (1500+ صنف حقيقي)
-- ============================================================================

-- تأكيد السماح بالإدخال وتجاوز قيود RLS مؤقتاً للبذر
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products temp seed insert" ON public.products;
CREATE POLICY "products temp seed insert" ON public.products
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

`;

const items = Array.from(productsMap.values());
const CHUNK_SIZE = 200;

for (let i = 0; i < items.length; i += CHUNK_SIZE) {
  const chunk = items.slice(i, i + CHUNK_SIZE);
  sql += `INSERT INTO public.products (
  id, code, barcode, name_ar, name_en, category_id,
  active_ingredient, strength, form, price, strip_price,
  old_price, stock_boxes, image_url, verified_photo, requires_rx
) VALUES\n`;

  const rows = chunk.map((p) => {
    return `  (${escapeSql(p.id)}, ${escapeSql(p.code)}, ${escapeSql(p.barcode)}, ${escapeSql(p.name_ar)}, ${escapeSql(p.name_en)}, ${escapeSql(p.category_id)}, ${escapeSql(p.active_ingredient)}, ${escapeSql(p.strength)}, ${escapeSql(p.form)}, ${p.price}, ${p.strip_price}, ${p.old_price != null ? p.old_price : 'NULL'}, ${p.stock_boxes}, ${escapeSql(p.image_url)}, ${p.verified_photo}, ${p.requires_rx})`;
  });

  sql += rows.join(',\n');
  sql += `\nON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  strip_price = EXCLUDED.strip_price,
  stock_boxes = EXCLUDED.stock_boxes,
  image_url = EXCLUDED.image_url,
  requires_rx = EXCLUDED.requires_rx;\n\n`;
}

// Restore safe policies
sql += `-- إعادة تأمين سياسات الأمان
DROP POLICY IF EXISTS "products temp seed insert" ON public.products;
DROP POLICY IF EXISTS "products public read" ON public.products;
DROP POLICY IF EXISTS "products staff write" ON public.products;
CREATE POLICY "products public read" ON public.products
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "products staff write" ON public.products
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
`;

fs.writeFileSync('./scripts/seed-products.sql', sql, 'utf8');
console.log('Generated scripts/seed-products.sql successfully! File size:', (sql.length / 1024).toFixed(1), 'KB');
