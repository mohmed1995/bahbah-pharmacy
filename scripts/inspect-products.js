const fs = require('fs');

// Read real catalog
const realCatalog = JSON.parse(fs.readFileSync('./src/lib/bahbah/real-catalog.json', 'utf8'));

// Extract featured products from data.ts
const dataContent = fs.readFileSync('./src/lib/bahbah/data.ts', 'utf8');
const featuredMatch = dataContent.match(/const featuredProducts: Product\[\] = (\[[\s\S]*?\n\];)/);

console.log('Real catalog items:', realCatalog.length);
if (featuredMatch) {
  console.log('Found featuredProducts block of length:', featuredMatch[1].length);
}
