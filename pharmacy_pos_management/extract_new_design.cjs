const fs = require('fs');
const { execSync } = require('child_process');

const zip = 'C:/Users/Nima/.gemini/antigravity/brain/fcb67547-f234-49fa-bd8f-a4624eda2175/.user_uploaded/media_1794512399706_c0416158.zip';
const dest = 'C:/Users/Nima/.gemini/antigravity/brain/fcb67547-f234-49fa-bd8f-a4624eda2175/scratch/incoming_new_design';

if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

execSync(`tar -xf "${zip}" -C "${dest}"`);
const list = fs.readdirSync(dest, { recursive: true });
console.log('Extracted files count:', list.length);
console.log('Files:', list);
