import fs from 'fs';
const html = fs.readFileSync('f:/صيدليه/public/index.html', 'utf8');
const p1 = html.indexOf('id="chips"');
const p2 = html.indexOf('<div class="grid"');
console.log(html.substring(p1, p2));
