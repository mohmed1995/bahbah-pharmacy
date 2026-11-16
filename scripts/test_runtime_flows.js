const assert = require('assert');

// Simulate runtime logic
const data = require('../src/lib/bahbah/real-catalog.json');

console.log('--- RUNTIME DATA INTEGRITY CHECK ---');
console.log('Total catalog products:', data.length);

// Check that catalog items have proper fields
let missingPrices = 0;
let missingNames = 0;
for (const p of data) {
  if (typeof p.price !== 'number' || p.price < 0) missingPrices++;
  if (!p.nameAr || !p.nameAr.trim()) missingNames++;
}
assert.strictEqual(missingPrices, 0, 'No products should have invalid prices');
assert.strictEqual(missingNames, 0, 'No products should have missing names');
console.log('✓ All catalog products have valid prices and Arabic names');

// Verify that deliveryZones have all required IDs and properties
const { deliveryZones } = require('../src/lib/bahbah/data.ts');
console.log('Total delivery zones:', deliveryZones.length);
assert(deliveryZones.length >= 20, 'Should have at least 20 delivery zones/villages');

const customZone = deliveryZones.find(z => z.id === 'custom-village');
assert(customZone, 'custom-village zone must exist');
assert(customZone.fee > 0, 'custom-village must have a base delivery fee');
console.log('✓ Delivery zones and custom-village verified successfully');

console.log('--- ALL RUNTIME CHECKS PASSED ---');
