const fs = require('fs');
const path = require('path');

const srcDir = 'C:/Users/Nima/.gemini/antigravity/brain/fcb67547-f234-49fa-bd8f-a4624eda2175/scratch/incoming_new_design';
const targetDir = 'f:/صيدليه';

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(childItem => {
      copyRecursive(path.join(src, childItem), path.join(dest, childItem));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(srcDir, targetDir);
console.log('Successfully copied all files from incoming_new_design to workspace.');
console.log('Target package.json size:', fs.statSync(targetDir + '/package.json').size);
