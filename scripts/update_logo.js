const sharp = require('sharp');
const fs = require('fs');

async function makeBadges() {
  // 1. Direct crisp badge
  await sharp('public/images/extracted-badge.png')
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile('public/images/bahbah-badge-crisp.png');

  // 2. White-backed circle badge (Pure white circle with subtle gold/blue ring)
  const whiteCircleSvg = Buffer.from(`
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <circle cx="256" cy="256" r="252" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="4"/>
    </svg>
  `);

  const badgeBuffer = await sharp('public/images/extracted-badge.png')
    .resize(460, 460, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  await sharp(whiteCircleSvg)
    .composite([{ input: badgeBuffer, gravity: 'center' }])
    .png()
    .toFile('public/images/bahbah-badge-white.png');

  // Replace default bahbah-badge.png with the clean white-backed version
  fs.copyFileSync('public/images/bahbah-badge-white.png', 'public/images/bahbah-badge.png');
  console.log('Successfully updated public/images/bahbah-badge.png with pure white background!');

  // Update PWA icons
  await sharp('public/images/bahbah-badge-white.png')
    .resize(192, 192)
    .png()
    .toFile('public/images/pwa-192.png');

  await sharp('public/images/bahbah-badge-white.png')
    .resize(512, 512)
    .png()
    .toFile('public/images/pwa-512.png');
  console.log('Successfully updated PWA icons!');
}

makeBadges().catch(console.error);
