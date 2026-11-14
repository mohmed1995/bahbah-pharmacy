const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('F:/صيدليه/pharmacy_pos_management/pharmacy.db', { readOnly: true });

console.log('--- DATA QUALITY AUDIT FOR PRODUCTS ---');
const totalProducts = db.prepare('SELECT count(*) as c FROM products').get().c;
const missingBarcode = db.prepare("SELECT count(*) as c FROM products WHERE barcode IS NULL OR barcode = ''").get().c;
const duplicateCodes = db.prepare("SELECT count(*) as c FROM (SELECT code FROM products GROUP BY code HAVING count(*) > 1)").get().c;
const duplicateBarcodes = db.prepare("SELECT count(*) as c FROM (SELECT barcode FROM products WHERE barcode IS NOT NULL AND barcode != '' GROUP BY barcode HAVING count(*) > 1)").get().c;
const zeroSalePrice = db.prepare("SELECT count(*) as c FROM products WHERE sale_price <= 0").get().c;
const zeroCostPrice = db.prepare("SELECT count(*) as c FROM products WHERE cost_price <= 0").get().c;
const negativeStock = db.prepare("SELECT count(*) as c FROM products WHERE stock_boxes < 0 OR stock_strips < 0").get().c;
const withActiveIngredient = db.prepare("SELECT count(*) as c FROM products WHERE active_ingredient IS NOT NULL AND active_ingredient != ''").get().c;

console.log('Total Products:', totalProducts);
console.log('Missing Barcodes:', missingBarcode, `(${(missingBarcode/totalProducts*100).toFixed(1)}%)`);
console.log('Duplicate Codes:', duplicateCodes);
console.log('Duplicate Barcodes:', duplicateBarcodes);
console.log('Zero or Negative Sale Price:', zeroSalePrice);
console.log('Zero or Negative Cost Price:', zeroCostPrice);
console.log('Negative Stock in products table:', negativeStock);
console.log('With Active Ingredient:', withActiveIngredient, `(${(withActiveIngredient/totalProducts*100).toFixed(1)}%)`);

// Check pharmacy_stock table
const totalStockRows = db.prepare('SELECT count(*) as c FROM pharmacy_stock').get().c;
const negativePharmacyStock = db.prepare('SELECT count(*) as c FROM pharmacy_stock WHERE qty < 0').get().c;
const zeroPharmacyStock = db.prepare('SELECT count(*) as c FROM pharmacy_stock WHERE qty = 0').get().c;
console.log('\n--- DATA QUALITY AUDIT FOR PHARMACY_STOCK ---');
console.log('Total Stock Rows:', totalStockRows);
console.log('Negative Stock:', negativePharmacyStock);
console.log('Zero Stock:', zeroPharmacyStock);

// Check Arabic Encoding (check for common mojibake characters like Ø, Ù, etc.)
const mojibakeCount = db.prepare("SELECT count(*) as c FROM products WHERE name LIKE '%Ø%' OR name LIKE '%Ù%'").get().c;
console.log('\nMojibake (broken UTF-8/CP1256):', mojibakeCount);

// Read 3 sample rows with masking
console.log('\n--- 3 SAMPLE ROWS (MASKED) ---');
const samples = db.prepare('SELECT id, code, barcode, name, category, cost_price, sale_price, stock_boxes, active_ingredient FROM products LIMIT 3').all();
for (const s of samples) {
  console.log({
    id: s.id,
    code: s.code,
    barcode: s.barcode ? s.barcode.slice(0, 4) + '****' : 'N/A',
    name: s.name,
    category: s.category,
    cost_price: s.cost_price,
    sale_price: s.sale_price,
    stock_boxes: s.stock_boxes,
    active_ingredient: s.active_ingredient || 'None'
  });
}
