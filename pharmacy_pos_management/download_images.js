import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('pharmacy.db');
const products = db.prepare("SELECT id, name_ar, image_url FROM products WHERE image_url LIKE '%http%'").all();

const outDir = path.resolve('public/images/products');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log(`Starting download of ${products.length} product images to ${outDir}...`);

let success = 0;
let failed = 0;
let skipped = 0;

const concurrency = 15;
let currentIndex = 0;

async function downloadOne(p) {
  const ext = path.extname(new URL(p.image_url).pathname) || '.jpg';
  const localFileName = `${p.id}${ext}`;
  const localPath = path.join(outDir, localFileName);
  const relativeWebPath = `/images/products/${localFileName}`;

  if (fs.existsSync(localPath) && fs.statSync(localPath).size > 500) {
    skipped++;
    return { id: p.id, webPath: relativeWebPath };
  }

  try {
    const res = await fetch(p.image_url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(localPath, Buffer.from(arrayBuffer));
    success++;
    return { id: p.id, webPath: relativeWebPath };
  } catch (err) {
    failed++;
    return null;
  }
}

async function worker() {
  while (currentIndex < products.length) {
    const p = products[currentIndex++];
    if (!p) break;
    const res = await downloadOne(p);
    if (res) {
      db.prepare('UPDATE products SET image_url = ? WHERE id = ?').run(res.webPath, res.id);
    }
    if ((currentIndex % 100) === 0 || currentIndex === products.length) {
      console.log(`Progress: ${currentIndex}/${products.length} (Downloaded: ${success}, Skipped: ${skipped}, Failed: ${failed})`);
    }
  }
}

const workers = Array.from({ length: concurrency }, () => worker());
await Promise.all(workers);

console.log(`\nAll done! Downloaded: ${success}, Skipped: ${skipped}, Failed: ${failed}`);
