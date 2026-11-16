const fs = require('fs');
const content = fs.readFileSync('src/lib/bahbah/data.ts', 'utf8');
const lines = content.split('\n');
let inside = false;
let items = [];
let current = null;
for (let line of lines) {
  if (line.includes('const featuredProducts: Product[] = [')) inside = true;
  if (line.includes('export const products: Product[] = [')) inside = false;
  if (inside) {
    let idM = line.match(/id:\s*"([^"]+)"/);
    let nameM = line.match(/nameAr:\s*"([^"]+)"/);
    let imgM = line.match(/img:\s*"([^"]+)"/);
    if (idM) current = { id: idM[1] };
    if (nameM && current) current.nameAr = nameM[1];
    if (imgM && current) {
      current.img = imgM[1];
      items.push(current);
      current = null;
    }
  }
}
console.log('Featured items with img count:', items.length);
items.forEach(it => {
  const exists = fs.existsSync('public' + it.img);
  console.log(it.id, '|', it.nameAr, '|', it.img, '| exists:', exists);
});
