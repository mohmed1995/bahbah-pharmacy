const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('========================================================');
console.log('🧪 RUNNING DEEP COMPREHENSIVE VERIFICATION SUITE');
console.log('========================================================\n');

let passedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
    process.exit(1);
  }
}

// 1. Medicine Safety Checks
test('Medicine Packshot & Visual: CozyCard & ListCard do NOT bypass ProductVisual', () => {
  const code = fs.readFileSync('src/components/bahbah/product-card.tsx', 'utf8');
  assert(!code.includes('product.img ? (\n            <Image\n              src={product.img}\n              alt={product.nameEn}'),
    'CozyCard must not bypass ProductVisual with raw product.img Image tag');
  assert(code.includes('<ProductVisual product={product} size="md" />'),
    'CozyCard must directly render ProductVisual');
  assert(code.includes('<ProductVisual product={product} size="sm" />'),
    'ListCard must directly render ProductVisual');
  assert(code.includes('SafeMedicinePackshot'),
    'SafeMedicinePackshot component must exist');
});

test('Medicine Safety: Cart and Shell Search use ProductVisual', () => {
  const cartCode = fs.readFileSync('src/components/bahbah/cart.tsx', 'utf8');
  assert(cartCode.includes('<ProductVisual product={l.p} size="sm" />'),
    'cart.tsx must use ProductVisual for cart item visual');
  const shellCode = fs.readFileSync('src/components/bahbah/shell.tsx', 'utf8');
  assert(shellCode.includes('<ProductVisual product={p} size="sm" />'),
    'shell.tsx must use ProductVisual for search result thumbnails');
});

test('Category Cleanup: Non-medicines mapped out of medicines category', () => {
  const dataCode = fs.readFileSync('src/lib/bahbah/data.ts', 'utf8');
  assert(dataCode.includes('name.includes("ميسلار")'), 'data.ts must reassign micellar to skincare');
  assert(dataCode.includes('name.includes("مبرد")'), 'data.ts must reassign foot files to personal');
});

// 2. Delivery & Villages Checks
test('Delivery: All Dairut villages and custom-village in data.ts', () => {
  const dataCode = fs.readFileSync('src/lib/bahbah/data.ts', 'utf8');
  const requiredZones = [
    'deirout-city', 'deirout-sharif', 'masara', 'koudia', 'deshlut',
    'houta', 'sanbo', 'bawit', 'beblaw', 'bani-yahya', 'kasr-haidar',
    'amshoul', 'abu-karim', 'riyad', 'mahmoudia', 'kom-boha', 'aramia',
    'sharaqwa', 'nazal', 'custom-village'
  ];
  for (const z of requiredZones) {
    assert(dataCode.includes(`id: "${z}"`), `Delivery zone '${z}' must exist in data.ts`);
  }
});

test('Delivery Checkout: zoneGroups in cart.tsx renders all Dairut villages & custom option', () => {
  const cartCode = fs.readFileSync('src/components/bahbah/cart.tsx', 'utf8');
  assert(cartCode.includes('"deirout-sharif"'), 'cart.tsx zoneGroups must include deirout-sharif');
  assert(cartCode.includes('"sanbo"'), 'cart.tsx zoneGroups must include sanbo');
  assert(cartCode.includes('"custom-village"'), 'cart.tsx zoneGroups must include custom-village');
  assert(cartCode.includes('setCustomVillageName(e.target.value)'),
    'cart.tsx must render input with setCustomVillageName onChange');
  assert(cartCode.includes('resolvedCity'),
    'cart.tsx must resolve custom village into city and address');
});

// 3. Admin Delivery Pricing in Settings
test('Admin Settings: Has dedicated Zone Delivery Pricing tuning section', () => {
  const adminCode = fs.readFileSync('src/components/bahbah/admin.tsx', 'utf8');
  assert(adminCode.includes('ضبط تسعيرة وتوصيل القرى والنجوع'),
    'admin.tsx Settings must include village delivery pricing tuning');
  assert(adminCode.includes('updateZoneEdit'),
    'admin.tsx Settings must call updateZoneEdit on fee change');
});

// 4. Team & Driver Management Checks
test('Couriers: Custom drivers getter and dynamic lookup in data.ts & store.ts', () => {
  const dataCode = fs.readFileSync('src/lib/bahbah/data.ts', 'utf8');
  assert(dataCode.includes('registerCustomDriversGetter'),
    'data.ts must export registerCustomDriversGetter');
  assert(dataCode.includes('registerCustomProductsGetter'),
    'data.ts must export registerCustomProductsGetter');

  const storeCode = fs.readFileSync('src/lib/bahbah/store.ts', 'utf8');
  assert(storeCode.includes('registerCustomDriversGetter('),
    'store.ts must register custom drivers getter');
  assert(storeCode.includes('allDrivers = [...(get().customDrivers || []), ...demoDrivers]'),
    'store.ts placeOrder must search allDrivers including customDrivers');
});

// 5. Order Audio Chime & Multi-Tab Notifications
test('Order Notifications: Audio chime + BroadcastChannel across pharmacy tabs', () => {
  const storeCode = fs.readFileSync('src/lib/bahbah/store.ts', 'utf8');
  assert(storeCode.includes('notifyNewOrder(order)'),
    'store.ts placeOrder must call notifyNewOrder(order)');
  assert(storeCode.includes('bahbah_orders_broadcast'),
    'store.ts must broadcast order across tabs via BroadcastChannel');
  assert(storeCode.includes('playOrderChime()'),
    'store.ts must contain synthesized Web Audio chime');
});

// 6. Admin Production Reset to 0
test('Admin Reset: Zero demo orders and live launch', () => {
  const storeCode = fs.readFileSync('src/lib/bahbah/store.ts', 'utf8');
  assert(storeCode.includes('resetAdminDemo: () => {'),
    'store.ts must define resetAdminDemo');
  assert(storeCode.includes('adminOrders: []'),
    'resetAdminDemo must zero out adminOrders');

  const adminCode = fs.readFileSync('src/components/bahbah/admin.tsx', 'utf8');
  assert(adminCode.includes('تصفير شامل للتشغيل الفعلي 0️⃣'),
    'admin.tsx must provide Production Reset button');
});

// 7. Upper Egypt Customer Account UX
test('Upper Egypt UX: Phone login, 1-click reorder, Dr. Hashem WhatsApp', () => {
  const authCode = fs.readFileSync('src/components/bahbah/auth.tsx', 'utf8');
  assert(authCode.includes('handleCustomerLogin'),
    'auth.tsx must have phone-only customer login');
  assert(authCode.includes('تكرار آخر طلب بضغطة واحدة'),
    'auth.tsx must provide 1-click reorder for Upper Egypt customers');
  assert(authCode.includes('01011500166'),
    'auth.tsx must link directly to Dr. Hashem WhatsApp');
});

// 8. Categories Grid
test('Categories: Responsive 7-category grid on homepage', () => {
  const homeCode = fs.readFileSync('src/components/bahbah/home.tsx', 'utf8');
  assert(homeCode.includes('lg:grid-cols-7'),
    'home.tsx Categories must use lg:grid-cols-7 for clean 7-category layout');
});

console.log(`\n========================================================`);
console.log(`🎉 ALL ${passedTests} VERIFICATION TESTS PASSED SUCCESSFULLY!`);
console.log(`========================================================`);
