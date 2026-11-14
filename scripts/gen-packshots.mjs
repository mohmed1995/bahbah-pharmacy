import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

const OUT = '/home/z/my-project/public/images/products';
fs.mkdirSync(OUT, { recursive: true });

const STYLE =
  'professional e-commerce packshot photograph, product standing upright centered, ' +
  'very light soft-tinted studio background with gentle radial gradient, soft realistic shadow under the product, ' +
  'clean minimal pharmacy product photography, crisp studio lighting, high quality, detailed, ' +
  'no human, no hands, packaging has plain minimal labels without readable brand text';

const JOBS = [
  { id: 'panadol-extra',   p: 'small white medicine box with blue accents containing paracetamol caplets, a blister strip of white caplets leaning beside the box, cool light blue tint background' },
  { id: 'brufen-400',      p: 'orange and white medicine box of ibuprofen 400mg tablets with an orange blister strip of round tablets beside it, warm peach tint background' },
  { id: 'telfast-180',     p: 'sandy orange medicine box of allergy tablets with a blister strip, sand beige tint background' },
  { id: 'vitamin-c-1000',  p: 'orange effervescent vitamin C tablet tube with one orange fizzing tablet and orange slices beside it, citrus orange tint background' },
  { id: 'omega-3',         p: 'amber glass supplement bottle with golden fish oil softgel capsules spilling beside it, golden yellow tint background' },
  { id: 'vitamin-d3',      p: 'small white plastic supplement dropper bottle with amber cap, soft white tint background' },
  { id: 'feroglobin',      p: 'dark red supplement bottle of iron capsules with red softgel capsules beside it, soft rose tint background' },
  { id: 'cerave-cream',    p: 'white cylindrical moisturizing cream pump jar with minimal blue stripe, pale blue tint background' },
  { id: 'anthelios-spf50', p: 'white and orange sunscreen tube standing on a small stone with soft sunlight, warm sand tint background' },
  { id: 'eva-collagen',    p: 'elegant pink collagen beauty supplement jar with gold lid, blush pink tint background' },
  { id: 'pampers-s4',      p: 'soft pastel green baby diapers pack standing upright with a tiny folded diaper beside it, mint green tint background' },
  { id: 'omron-bp-m2',     p: 'white digital blood pressure monitor device with cuff and small LCD screen, light gray-blue tint background' },
  { id: 'sensodyne',       p: 'blue and white toothpaste tube standing upright, cool aqua tint background' },
  { id: 'vaseline-lotion', p: 'deep blue plastic body lotion bottle with pump, steel blue tint background' },
];

async function main() {
  const zai = await ZAI.create();
  const only = process.argv.slice(2);
  for (const job of JOBS) {
    const out = `${OUT}/${job.id}.png`;
    if (fs.existsSync(out) && fs.statSync(out).size > 100000) { console.log('skip', job.id); continue; }
    if (only.length && !only.includes(job.id)) continue;
    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        const res = await zai.images.generations.create({ prompt: `${job.p}, ${STYLE}`, size: '1024x1024' });
        const b64 = res?.data?.[0]?.base64;
        if (!b64) throw new Error('no base64');
        fs.writeFileSync(out, Buffer.from(b64, 'base64'));
        console.log('OK', job.id, Math.round(fs.statSync(out).size / 1024) + 'KB');
        ok = true;
      } catch (e) {
        console.error(`ERR ${job.id} attempt ${attempt}:`, e.message);
        await new Promise(r => setTimeout(r, 1500 * attempt));
      }
    }
  }
  console.log('DONE');
}
main().catch(e => { console.error(e); process.exit(1); });
