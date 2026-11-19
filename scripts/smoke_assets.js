/**
 * Bahbah Pharmacy — build smoke test for static assets.
 *
 * Fails the deploy if:
 *  1. out/ contains internal/forbidden files (.md files, manager_mobile.html,
 *     modules/luxury_*) — these must never be published.
 *  2. Any locally-referenced static asset is missing from out/ — every literal
 *     "/images/..." reference in src/ + public/*.html + sw.js, every icon in
 *     manifest.webmanifest, and the core shell files.
 *
 * Deliberately EXCLUDED: /images/products/* — the ~1,544 product photos live
 * only on the owner's machine and are merged at deploy time (see
 * ANTIGRAVITY_INSTRUCTIONS.md); they are not part of this source tree.
 *
 * Usage: node scripts/smoke_assets.js   (after `npm run build`)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "out");

let failures = [];

function walk(dir, base, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, acc);
    else acc.push(path.relative(base, p).split(path.sep).join("/"));
  }
  return acc;
}

if (!fs.existsSync(OUT)) {
  console.error("❌ SMOKE FAIL: out/ does not exist — run `npm run build` first.");
  process.exit(1);
}

const outFiles = walk(OUT, OUT, []);
const outSet = new Set(outFiles);

/* ---- 1. forbidden files in the deployable output ---- */
for (const f of outFiles) {
  if (f.endsWith(".md")) failures.push(`internal file published: out/${f}`);
  if (f === "manager_mobile.html" || f.endsWith("/manager_mobile.html"))
    failures.push(`legacy page published: out/${f}`);
  if (/(^|\/)modules\/luxury_/.test(f))
    failures.push(`dead luxury module published: out/${f}`);
}

/* ---- 2. referenced assets must exist ---- */
const refs = new Set();
function collectFrom(file) {
  const txt = fs.readFileSync(file, "utf8");
  const re = /["'(](\/images\/[A-Za-z0-9_.\/-]+)["')]/g;
  let m;
  while ((m = re.exec(txt))) {
    const p = m[1];
    if (p.endsWith("/")) continue; // directory prefix, not a file
    if (p.startsWith("/images/products/")) continue; // owner-supplied, see header
    refs.add(p);
  }
}
function collectDir(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collectDir(p);
    else if (/\.(ts|tsx)$/.test(e.name)) collectFrom(p);
  }
}
collectDir(path.join(ROOT, "src"));
for (const f of fs.readdirSync(path.join(ROOT, "public"))) {
  if (f.endsWith(".html") || f === "sw.js") collectFrom(path.join(ROOT, "public", f));
}
/* manifest icons */
try {
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "manifest.webmanifest"), "utf8"));
  for (const ic of man.icons || []) refs.add("/" + ic.src.replace(/^\.\//, ""));
} catch (e) {
  failures.push(`manifest.webmanifest unreadable: ${e.message}`);
}
/* core shell files */
for (const core of ["/offline.html", "/manifest.webmanifest", "/logo.svg", "/sw.js", "/robots.txt"])
  refs.add(core);

const missing = [...refs].filter((r) => !outSet.has(r.replace(/^\//, "")));
for (const m of missing) failures.push(`referenced asset missing from out/: ${m}`);

/* ---- report ---- */
console.log(`🔍 Smoke: scanned ${outFiles.length} files in out/, ${refs.size} referenced assets checked.`);
if (failures.length) {
  console.error(`❌ SMOKE FAIL (${failures.length} problem(s)):`);
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}
console.log("✅ SMOKE PASS: no forbidden files, every referenced asset present.");
