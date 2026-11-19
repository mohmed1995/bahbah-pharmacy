/**
 * QA COPY of scripts/test_runtime_flows.js with the harness bug fixed.
 *
 * Original failure (reproduces identically on the pristine baseline c1916ce):
 *   node scripts/test_runtime_flows.js
 *   -> Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@/components'
 *      imported from src/lib/bahbah/data.ts
 *
 * Root cause = TEST HARNESS, not the app:
 * the original test does `require('../src/lib/bahbah/data.ts')` in plain Node.
 * data.ts is a Next.js TypeScript module that imports "@/components/bahbah/icons"
 * (the "@/*" path alias from tsconfig.json, resolved by the Next bundler) and
 * lucide-react. Plain Node has no alias resolution, so the require dies before
 * any assertion runs. The app itself is unaffected (verified: the same import
 * exists in git HEAD, and `npm run typecheck` / the production build resolve it).
 *
 * Fix applied here: keep every original assertion, but obtain `deliveryZones`
 * by extracting the array literal from data.ts source and evaluating ONLY that
 * literal (it is pure data: strings/numbers/booleans), instead of importing the
 * whole module. The catalog JSON checks are kept verbatim.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', '..', 'src');

// --- Original check 1: catalog integrity (verbatim logic) ---
const data = require(path.join(SRC, 'lib', 'bahbah', 'real-catalog.json'));

console.log('--- RUNTIME DATA INTEGRITY CHECK (QA harness, alias-fixed) ---');
console.log('Total catalog products:', data.length);

let missingPrices = 0;
let missingNames = 0;
for (const p of data) {
  if (typeof p.price !== 'number' || p.price < 0) missingPrices++;
  if (!p.nameAr || !p.nameAr.trim()) missingNames++;
}
assert.strictEqual(missingPrices, 0, 'No products should have invalid prices');
assert.strictEqual(missingNames, 0, 'No products should have missing names');
console.log('✓ All catalog products have valid prices and Arabic names');

// --- Original check 2: delivery zones (same assertions, alias-safe source) ---
const dataTs = fs.readFileSync(path.join(SRC, 'lib', 'bahbah', 'data.ts'), 'utf8');
const startMarker = 'export const deliveryZones';
const startIdx = dataTs.indexOf(startMarker);
assert(startIdx >= 0, 'deliveryZones export must exist in data.ts');
// anchor on the assignment "= [" — the first "[" after the marker is the
// "DeliveryZone[]" type annotation, not the value.
const assignIdx = dataTs.indexOf('=', startIdx);
const arrStart = dataTs.indexOf('[', assignIdx);
// bracket-match to the end of the array literal
let depth = 0, endIdx = -1, inStr = null, esc = false;
for (let i = arrStart; i < dataTs.length; i++) {
  const ch = dataTs[i];
  if (inStr) {
    if (esc) esc = false;
    else if (ch === '\\') esc = true;
    else if (ch === inStr) inStr = null;
    continue;
  }
  if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
  if (ch === '[') depth++;
  if (ch === ']') { depth--; if (depth === 0) { endIdx = i; break; } }
}
assert(endIdx > arrStart, 'deliveryZones array literal must terminate');
const literal = dataTs.slice(arrStart, endIdx + 1);
const deliveryZones = vm.runInNewContext('(' + literal + ')', Object.create(null));

console.log('Total delivery zones:', deliveryZones.length);
assert(deliveryZones.length >= 20, 'Should have at least 20 delivery zones/villages');

const customZone = deliveryZones.find(z => z.id === 'custom-village');
assert(customZone, 'custom-village zone must exist');
assert(customZone.fee > 0, 'custom-village must have a base delivery fee');
console.log('✓ Delivery zones and custom-village verified successfully');

// Extra QA assertions (same spirit): every zone has id + numeric fee >= 0, ids unique
const ids = new Set();
for (const z of deliveryZones) {
  assert(z.id && typeof z.id === 'string', 'zone id required');
  assert(!ids.has(z.id), `duplicate zone id ${z.id}`);
  ids.add(z.id);
  assert(typeof z.fee === 'number' && z.fee >= 0, `zone ${z.id} fee must be a non-negative number`);
}
console.log('✓ All zones have unique ids and valid fees');

console.log('--- ALL RUNTIME CHECKS PASSED (QA harness) ---');
