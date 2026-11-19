/* Quick logic check for deliveryBoardKpis (reports.ts) — same transpile
   mechanism as scripts/qa/trio_check.mjs Part B. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const QA_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(QA_DIR, "..", "..");
const require2 = createRequire(path.join(ROOT, "package.json"));
const ts = require2("typescript");
const src = fs.readFileSync(path.join(ROOT, "src", "lib", "bahbah", "reports.ts"), "utf8");
const { outputText } = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const mod = { exports: {} };
new Function("module", "exports", "require", outputText)(mod, mod.exports, require2);
const { deliveryBoardKpis } = mod.exports;

const DAY = "2026-11-19";
const O = (id, status, createdAt, updatedAt) => ({ id, status, total: 0, items: [], createdAt, updatedAt });

const orders = [
  O("d1", "delivered", `${DAY}T10:00:00Z`, `${DAY}T10:30:00Z`), // 30 min
  O("d2", "delivered", `${DAY}T11:00:00Z`, `${DAY}T12:00:00Z`), // 60 min
  O("d3", "delivered", "2026-11-18T23:00:00Z", `${DAY}T00:20:00Z`), // delivered today via updatedAt
  O("old", "delivered", "2026-11-18T09:00:00Z", "2026-11-18T09:40:00Z"), // yesterday — excluded
  O("c1", "cancelled", `${DAY}T09:00:00Z`, `${DAY}T09:05:00Z`),
  O("p1", "pending", `${DAY}T12:00:00Z`, `${DAY}T12:00:00Z`), // active — excluded from all three
  O("nodates", "delivered", undefined, undefined), // no timestamps — not counted as today
];
const k = deliveryBoardKpis(orders, DAY);
const assert = (name, cond, ev) => {
  console.log(`${cond ? "✅" : "❌"} ${name} — ${ev}`);
  if (!cond) process.exitCode = 1;
};
assert("deliveredToday", k.deliveredToday === 3, `got ${k.deliveredToday}, want 3 (d1,d2,d3)`);
assert(
  "avgDeliveryMinutes",
  k.avgDeliveryMinutes === 57,
  `got ${k.avgDeliveryMinutes}, want 57 (30+60+80)/3=56.67→57`
);
assert("completionRatePct", k.completionRatePct === 75, `got ${k.completionRatePct}, want 75 (3/(3+1))`);

const empty = deliveryBoardKpis([], DAY);
assert(
  "empty day",
  empty.deliveredToday === 0 && empty.avgDeliveryMinutes === null && empty.completionRatePct === null,
  JSON.stringify(empty)
);
console.log("done");
