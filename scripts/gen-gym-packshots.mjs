import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

const OUT = '/home/z/my-project/public/images/products';
const CATS = '/home/z/my-project/public/images/cats';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(CATS, { recursive: true });

const STYLE =
  'professional e-commerce packshot photograph, product standing upright centered, ' +
  'very light soft-tinted studio background with gentle radial gradient, soft realistic shadow under the product, ' +
  'clean minimal pharmacy product photography, crisp studio lighting, high quality, detailed, ' +
  'no human, no hands, packaging has plain minimal labels without readable brand text';

const JOBS = [
  { dir: OUT, id: 'creatine-mono',      p: 'tall white plastic creatine monohydrate powder tub with black lid and a metal measuring scoop resting on top, cool white tint background' },
  { dir: OUT, id: 'whey-gold',          p: 'premium gold and black whey protein powder tub with a chocolate protein shake in a glass beside it, warm gold tint background' },
  { dir: OUT, id: 'mass-gainer',        p: 'large bulk mass gainer powder bag pouch standing upright with a scoop of powder beside it, warm caramel tint background' },
  { dir: OUT, id: 'bcaa-5000',          p: 'sleek blue plastic BCAA amino acid powder container with an open lid showing powder, cool blue tint background' },
  { dir: OUT, id: 'l-carnitine-3000',   p: 'row of small amber liquid carnitine ampoule shots vials with one open vial, fresh green tint background' },
  { dir: OUT, id: 'fat-burner',         p: 'matte black fat burner capsule bottle with green tea leaf and two capsules beside it, dark green tint background' },
  { dir: OUT, id: 'pre-workout',        p: 'vivid electric blue pre-workout booster powder tub with lightning bolt shaped energy vibe, dynamic blue tint background' },
  { dir: OUT, id: 'multivitamin-sport', p: 'orange sport multivitamin bottle with colorful capsules spilling from it, energetic orange tint background' },
  { dir: OUT, id: 'protein-bar',        p: 'stack of chocolate coated protein bars with one unwrapped bar showing texture, rich chocolate brown tint background' },
  { dir: OUT, id: 'shaker-bottle',      p: 'sleek matte black and orange protein shaker bottle 700ml with stainless mixing ball beside it, orange gradient tint background' },
  { dir: CATS, id: 'cat-fitness',       p: 'wide banner composition of fitness nutrition products: whey protein tub, creatine container and shaker bottle arranged on a light warm orange studio background, dumbbell silhouette in soft focus behind, clean minimal pharmacy e-commerce style, no human, no hands, no readable brand text' },
];

async function main() {
  const zai = await ZAI.create();
  const only = process.argv.slice(2);
  for (const job of JOBS) {
    const out = `${job.dir}/${job.id}.png`;
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
