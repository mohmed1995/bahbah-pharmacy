const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseAnonKey);

// Read real-catalog.json
const realCatalog = JSON.parse(fs.readFileSync('./src/lib/bahbah/real-catalog.json', 'utf8'));

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

  if (n.includes('سكر') || n.includes('ضغط') || n.includes('قلب') || n.includes('كوليسترول')) return 'chronic';
  if (n.includes('مغص') || n.includes('قولون') || n.includes('معدة') || n.includes('حموضة')) return 'digestive';
  if (n.includes('برد') || n.includes('رشح') || n.includes('إنفلونزا') || n.includes('سعال') || n.includes('كحة')) return 'cold-flu';
  if (n.includes('شاش') || n.includes('بلاستر') || n.includes('قطن') || n.includes('كحول') || n.includes('مطهر')) return 'first-aid';

  return 'medicines';
}

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

// Featured products
const dataContent = fs.readFileSync('./src/lib/bahbah/data.ts', 'utf8');
const featuredBlock = dataContent.slice(
  dataContent.indexOf('const featuredProducts: Product[] = ['),
  dataContent.indexOf('const mappedRealProducts: Product[] =')
);

const itemRegex = /{\s*id:\s*"([^"]+)",\s*nameAr:\s*"([^"]+)",\s*nameEn:\s*"([^"]+)",[\s\S]*?category:\s*"([^"]+)",\s*price:\s*([0-9.]+),[\s\S]*?stock:\s*([0-9]+),[\s\S]*?}/g;
let m;
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
}

async function uploadAll() {
  const allItems = Array.from(productsMap.values());
  console.log(`Starting upload of ${allItems.length} products to Supabase...`);

  const BATCH_SIZE = 100;
  let successCount = 0;

  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    const batch = allItems.slice(i, i + BATCH_SIZE);
    const { error } = await sb.from('products').upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`Error at batch ${i}-${i + batch.length}:`, error.message);
      return false;
    }
    successCount += batch.length;
    process.stdout.write(`Uploaded ${successCount}/${allItems.length} products...\r`);
  }

  console.log(`\nSuccessfully uploaded all ${successCount} products to Supabase!`);
  return true;
}

uploadAll();
