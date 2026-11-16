const fs = require('fs');

const path = 'src/lib/bahbah/data.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove dummy images for the 3 featured medicines
content = content.replace(/    img: "\/images\/products\/panadol-extra\.png",\r?\n/, '');
content = content.replace(/    img: "\/images\/products\/brufen-400\.png",\r?\n/, '');
content = content.replace(/    img: "\/images\/products\/telfast-180\.png",\r?\n/, '');

// 2. Add verifiedPhoto: true to mappedRealProducts
if (!content.includes('verifiedPhoto: true')) {
  content = content.replace(
    'icon: categoryIconMap[cat] || IconCapsule,',
    'icon: categoryIconMap[cat] || IconCapsule,\r\n    verifiedPhoto: true,'
  );
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated src/lib/bahbah/data.ts');
