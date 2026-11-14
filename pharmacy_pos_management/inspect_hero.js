import fs from 'fs';
const html = fs.readFileSync('f:/صيدليه/public/index.html', 'utf8');
const p1 = html.indexOf('<header>');
const p2 = html.indexOf('id="chips"');
console.log(html.substring(p1, p2));
