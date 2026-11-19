/**
 * QA — POST-GATE TRIO (courier live board + per-step customer
 * notifications + daily report). No new migration in this batch — the
 * new server surface is READ queries + pure client logic:
 *
 *  Part A (real Postgres / PGlite, full chain): the exact query
 *    semantics the new helpers in src/lib/supabase.ts rely on —
 *    day-range [gte, lt) selects on orders & courier_collections
 *    (fetchOrdersForDayFromSupabase / fetchCourierCollectionsForDay…),
 *    the active-orders filter (fetchActiveOrdersFromSupabase), and the
 *    queue counters (fetchQueueSnapshotFromSupabase: whatsapp 'sent',
 *    shortage 'pending', nursing 'new', rx 'new'). Seeded across two
 *    days so boundary rows must fall OUT of the selected day.
 *  Part B (pure logic): src/lib/bahbah/reports.ts transpiled with the
 *    app's own TypeScript and unit-tested with fixtures —
 *    courierLiveBoard, buildDailyReport, topCouriersForDay,
 *    findStuckOrders (documented thresholds), planMyOrderSync
 *    (notify only on server-confirmed transitions, exactly once,
 *    cross-path dedupe via the shared notified set).
 *
 * Exits 1 if any check fails. Writes trio-results.json.
 */
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const QA_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(QA_DIR, "..", "..");
const SQL_DIR = path.join(ROOT, "supabase");

const results = [];
function check(battery, name, pass, evidence) {
  results.push({ battery, name, pass: !!pass, evidence: String(evidence ?? "") });
  console.log(`${pass ? "✅" : "❌"} [${battery}] ${name} — ${evidence}`);
}

const db = new PGlite();
await db.waitReady;

/* ================= Phase A: platform stubs + stand-ins ================= */
await db.exec(`
  do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
  do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
  do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;
  create schema if not exists auth;
  create table if not exists auth.users (
    id uuid primary key, email text,
    raw_app_meta_data jsonb not null default '{}'::jsonb,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create table if not exists public.qa_jwt_claims (claims jsonb not null default '{}'::jsonb);
  insert into public.qa_jwt_claims values ('{}'::jsonb);
  create or replace function auth.jwt() returns jsonb language sql stable as
    $$ select claims from public.qa_jwt_claims limit 1 $$;
  create or replace function auth.uid() returns uuid language sql stable as
    $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
  grant select on public.qa_jwt_claims to anon, authenticated;
  create publication supabase_realtime;
`);
await db.exec(`
  create table public.orders (
    id text primary key,
    customer_name text, customer_phone text, customer_address text, customer_notes text,
    items jsonb not null default '[]'::jsonb,
    subtotal numeric, discount numeric, delivery_fee numeric, total numeric,
    payment_method text, status text, payment_status text,
    delivery_zone text, courier_id text, pharmacist_id text,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  );
  create table public.rx_requests (
    id text primary key, patient_name text, phone text, image_url text,
    status text, notes text, created_at timestamptz not null default now()
  );
  create table public.care_subscriptions (
    id text primary key, plan_id text, member_no text, name text, phone text, address text,
    notes text, prescription_url text, day_pref int, status text,
    created_at timestamptz not null default now()
  );
  create table public.patient_measurements (
    id text primary key, patient_code text, patient_phone text, patient_name text,
    sugar numeric, systolic numeric, diastolic numeric, weight numeric, height numeric,
    recorded_at timestamptz not null default now(), created_at timestamptz not null default now()
  );
  create table public.admin_settings (
    id text primary key default 'global',
    admin_pass text,
    site_edits jsonb default '{}'::jsonb,
    ad_edits jsonb default '{}'::jsonb,
    care_edits jsonb default '{}'::jsonb,
    zone_edits jsonb default '{}'::jsonb,
    ads_off jsonb default '[]'::jsonb,
    stock_adj jsonb default '{}'::jsonb,
    price_override jsonb default '{}'::jsonb,
    custom_products jsonb default '[]'::jsonb,
    coupons jsonb default '[]'::jsonb,
    settings jsonb default '{}'::jsonb,
    updated_at timestamptz not null default now()
  );
  insert into public.admin_settings (id) values ('global');
`);
check("migration", "platform stubs + pre-existing-table stand-ins created", true, "same harness as post_delivery_check.mjs");

/* ================= Phase B: full chain (unchanged — trio adds no migration) ================= */
const CHAIN = [
  "security.sql",
  "commerce.sql",
  "commerce-seed.sql",
  "upgrade-2026-11-19.sql",
  "upgrade-2026-11-19-whatsapp-orders.sql",
  "WAREHOUSE_SEED_DDL",
  "upgrade-2026-11-19-warehouse-sync.sql",
  "upgrade-2026-11-19-shortage-requests.sql",
  "upgrade-2026-11-19-portals-permissions.sql",
  "upgrade-2026-11-19-collections-addresses.sql",
  "upgrade-2026-11-19-free-shipping-campaign.sql",
  "upgrade-2026-11-19-loyalty-points.sql",
  "upgrade-2026-11-19-nursing-services.sql",
  "upgrade-2026-11-19-security-layer1.sql",
  "upgrade-2026-11-19-wiring-fixes.sql",
  "upgrade-2026-11-19-loyalty-quota.sql",
  "upgrade-2026-11-19-integrity-fixes.sql",
  "upgrade-2026-11-19-courier-ratings.sql",
];
let chainBroken = false;
for (const f of CHAIN) {
  let sql;
  if (f === "WAREHOUSE_SEED_DDL") {
    const full = fs.readFileSync(path.join(ROOT, "..", "warehouse-seed.sql"), "utf8");
    sql = full.slice(0, full.indexOf("insert into"));
  } else {
    sql = fs.readFileSync(path.join(SQL_DIR, f), "utf8");
  }
  try {
    await db.exec(sql);
  } catch (e) {
    chainBroken = true;
    check("migration", `chain file executes: ${f}`, false, (e.message || String(e)).slice(0, 300));
  }
}
check("migration", "full chain executes with NO new trio migration (18 files)", !chainBroken, "trio is read-only over existing tables");
if (chainBroken) {
  fs.writeFileSync(path.join(QA_DIR, "trio-results.json"), JSON.stringify(results, null, 2));
  console.error("CHAIN BROKEN — aborting probes");
  process.exit(1);
}
await db.exec(`
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.jwt(), auth.uid() to anon, authenticated;
  grant all on all tables in schema public to anon, authenticated;
  grant all on all sequences in schema public to anon, authenticated;
`);

/* ================= Phase C: seed across two days + queues ================= */
const DAY = "2026-11-19";
await db.exec(`
  insert into public.orders (id, customer_name, customer_phone, status, payment_status, courier_id, total, created_at, updated_at) values
    ('T-D1', 'عميل ١', '01000000011', 'delivered', 'paid',   'dr-1', 200, '${DAY}T08:00:00Z', '${DAY}T09:00:00Z'),
    ('T-D2', 'عميل ٢', '01000000012', 'cancelled', 'unpaid', null,    50,  '${DAY}T09:30:00Z', '${DAY}T10:00:00Z'),
    ('T-D3', 'عميل ٣', '01000000013', 'pending',   'unpaid', 'dr-1', 100, '${DAY}T10:15:00Z', '${DAY}T10:15:00Z'),
    ('T-P1', 'عميل أمس', '01000000014', 'shipping', 'unpaid', 'dr-2', 70,  '2026-11-18T23:30:00Z', '2026-11-19T07:00:00Z'),
    ('T-N1', 'عميل بكرا', '01000000015', 'pending', 'unpaid', null,   60,  '2026-11-20T00:30:00Z', '2026-11-20T00:30:00Z')
  on conflict (id) do nothing;
  insert into public.courier_collections (id, order_id, courier_id, courier_name, amount, method, wallet_from, wallet_to, created_at) values
    ('COL-T1', 'T-D1', 'dr-1', 'محمود سيد', 150, 'cash',   null, null, '${DAY}T09:05:00Z'),
    ('COL-T2', 'T-D1', 'dr-1', 'محمود سيد', 80,  'wallet', '01000000011', '01099999999', '${DAY}T09:06:00Z'),
    ('COL-T3', 'T-P1', 'dr-2', 'كريم فتحي', 20,  'bank',   null, 'EG-ACC-1', '${DAY}T07:05:00Z'),
    ('COL-P1', 'T-P1', 'dr-2', 'كريم فتحي', 999, 'cash',   null, null, '2026-11-18T20:00:00Z')
  on conflict (id) do nothing;
  insert into public.whatsapp_orders (id, code, customer_phone, customer_name, items, total, status) values
    ('WA-T1', 'BH-1001', '01000000011', 'أ', '[]'::jsonb, 10, 'sent'),
    ('WA-T2', 'BH-1002', '01000000012', 'ب', '[]'::jsonb, 20, 'sent'),
    ('WA-T3', 'BH-1003', '01000000013', 'ج', '[]'::jsonb, 30, 'done')
  on conflict (id) do nothing;
  insert into public.shortage_requests (id, code, customer_phone, customer_name, item_name, status) values
    ('SH-T1', 'BH-2001', '01000000011', 'أ', 'دواء ١', 'pending'),
    ('SH-T2', 'BH-2002', '01000000012', 'ب', 'دواء ٢', 'pending'),
    ('SH-T3', 'BH-2003', '01000000013', 'ج', 'دواء ٣', 'pending'),
    ('SH-T4', 'BH-2004', '01000000014', 'د', 'دواء ٤', 'closed')
  on conflict (id) do nothing;
  insert into public.nursing_requests (id, code, customer_phone, customer_name, service_id, service_name_ar, status) values
    ('NU-T1', 'BH-3001', '01000000011', 'أ', 'sugar', 'قياس سكر', 'new'),
    ('NU-T2', 'BH-3002', '01000000012', 'ب', 'bp', 'قياس ضغط', 'done')
  on conflict (id) do nothing;
  insert into public.rx_requests (id, patient_name, phone, status) values
    ('RX-T1', 'أ', '01000000011', 'new'),
    ('RX-T2', 'ب', '01000000012', 'new'),
    ('RX-T3', 'ج', '01000000013', 'approved')
  on conflict (id) do nothing;
`);
check("seed", "seeded 5 orders / 4 collections / 4 queue tables across two days", true, `day=${DAY}`);

/* ---- the exact range the helpers use: [day 00:00Z, next day 00:00Z) ---- */
const GTE = `${DAY}T00:00:00.000Z`;
const LT = `2026-11-20T00:00:00.000Z`;
const dayOrders = (await db.query(
  "select id, total, status from public.orders where created_at >= $1 and created_at < $2 order by created_at",
  [GTE, LT]
)).rows;
check("day-range", "orders for the day = exactly the 3 created that day (prev/next day excluded)",
  dayOrders.length === 3 && dayOrders.map((r) => r.id).join(",") === "T-D1,T-D2,T-D3",
  `ids=${dayOrders.map((r) => r.id).join(",")}`);
const revenue = dayOrders.filter((r) => r.status !== "cancelled").reduce((s, r) => s + Number(r.total), 0);
check("day-range", "revenue (non-cancelled sum) = 300, delivered = 1, cancelled = 1",
  revenue === 300 &&
    dayOrders.filter((r) => r.status === "delivered").length === 1 &&
    dayOrders.filter((r) => r.status === "cancelled").length === 1,
  `revenue=${revenue}`);

const dayCols = (await db.query(
  "select method, amount from public.courier_collections where created_at >= $1 and created_at < $2",
  [GTE, LT]
)).rows;
const byMethod = {};
for (const c of dayCols) byMethod[c.method] = (byMethod[c.method] ?? 0) + Number(c.amount);
check("day-range", "collections for the day = 3 rows, cash 150 / wallet 80 / bank 20 (yesterday's 999 excluded)",
  dayCols.length === 3 && byMethod.cash === 150 && byMethod.wallet === 80 && byMethod.bank === 20,
  JSON.stringify(byMethod));

const active = (await db.query(
  "select id from public.orders where status in ('pending','ready','shipping') order by updated_at asc"
)).rows.map((r) => r.id);
check("day-range", "active-orders filter = pending/ready/shipping across days (T-D3, T-P1, T-N1), oldest update first",
  JSON.stringify(active) === JSON.stringify(["T-P1", "T-D3", "T-N1"]), `ids=${active.join(",")}`);

const cnt = async (table, status) =>
  (await db.query(`select count(*)::int as n from public.${table} where status = $1`, [status])).rows[0].n;
const snap = {
  whatsapp: await cnt("whatsapp_orders", "sent"),
  shortage: await cnt("shortage_requests", "pending"),
  nursing: await cnt("nursing_requests", "new"),
  rx: await cnt("rx_requests", "new"),
};
check("queues", "queue snapshot counters: whatsapp(sent)=2, shortage(pending)=3, nursing(new)=1, rx(new)=2",
  snap.whatsapp === 2 && snap.shortage === 3 && snap.nursing === 1 && snap.rx === 2,
  JSON.stringify(snap));

/* ================= Part B: pure logic in reports.ts ================= */
const require2 = createRequire(path.join(ROOT, "package.json"));
const ts = require2("typescript");
const src = fs.readFileSync(path.join(ROOT, "src", "lib", "bahbah", "reports.ts"), "utf8");
const { outputText } = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const tmpMod = path.join(QA_DIR, "trio-reports.mjs");
fs.writeFileSync(tmpMod, outputText);
const R = await import(`file://${tmpMod}`);

const mkOrder = (patch) => ({
  id: "X", date: DAY, items: [], total: 0, status: "pending",
  customerAr: "عميل", customerEn: "Customer", phone: "0100", address: "", payment: "cod",
  ...patch,
});
const NOW = Date.parse(`${DAY}T12:00:00Z`);
const isoAgo = (min) => new Date(NOW - min * 60000).toISOString();
const isoAt = (h) => `${DAY}T${String(h).padStart(2, "0")}:00:00Z`;

/* ---- courierLiveBoard ---- */
const drivers = [
  { id: "dr-1", nameAr: "محمود", nameEn: "Mahmoud", phone: "", vehicle: "scooter", plate: "1", rating: 0, trips: 0, zoneId: "z", status: "available" },
  { id: "dr-2", nameAr: "كريم", nameEn: "Karim", phone: "", vehicle: "scooter", plate: "2", rating: 0, trips: 0, zoneId: "z", status: "available" },
];
const boardOrders = [
  mkOrder({ id: "B1", status: "shipping", createdAt: "2026-11-18T20:00:00Z", updatedAt: isoAgo(20), delivery: { type: "delivery", driverId: "dr-1" } }),
  mkOrder({ id: "B2", status: "delivered", createdAt: isoAt(8), updatedAt: isoAt(9), delivery: { type: "delivery", driverId: "dr-1" } }),
  mkOrder({ id: "B3", status: "delivered", createdAt: "2026-11-18T10:00:00Z", updatedAt: "2026-11-18T11:00:00Z", delivery: { type: "delivery", driverId: "dr-2" } }),
  mkOrder({ id: "B4", status: "pending", createdAt: isoAt(10) }),
];
const boardCols = [
  { id: "C1", orderId: "B2", courierId: "dr-1", amount: 100, method: "cash", createdAt: isoAt(9) },
  { id: "C2", orderId: "B2", courierId: "dr-1", amount: 50, method: "wallet", createdAt: isoAt(9) },
  { id: "C3", orderId: "B3", courierId: "dr-2", amount: 70, method: "cash", createdAt: "2026-11-18T11:00:00Z" },
];
const boardRatings = [
  { id: "R1", orderId: "B2", courierId: "dr-1", customerPhone: "1", stars: 5, createdAt: isoAt(9) },
  { id: "R2", orderId: "B0", courierId: "dr-1", customerPhone: "2", stars: 4, createdAt: isoAt(7) },
];
const board = R.courierLiveBoard(drivers, boardOrders, boardCols, boardRatings, DAY);
const b1 = board.find((r) => r.driver.id === "dr-1");
const b2 = board.find((r) => r.driver.id === "dr-2");
check("live-board", "dr-1: 1 active (shipping from yesterday still counts), 1 delivered today, 1 assigned today (only B2 was created today)",
  b1.activeOrders.length === 1 && b1.activeOrders[0].id === "B1" && b1.deliveredToday === 1 && b1.assignedToday === 1,
  `active=${b1.activeOrders.length} delivered=${b1.deliveredToday} assigned=${b1.assignedToday}`);
check("live-board", "dr-1: collections today = 150 (2 records); rating avg 4.5 over 2 ratings",
  b1.collectionsToday === 150 && b1.collectionsCountToday === 2 && b1.ratingAvg === 4.5 && b1.ratingCount === 2,
  `sum=${b1.collectionsToday} avg=${b1.ratingAvg}`);
check("live-board", "dr-2: delivered YESTERDAY does not count today; no ratings → avg null (never a fake number)",
  b2.deliveredToday === 0 && b2.collectionsToday === 0 && b2.ratingAvg === null && b2.ratingCount === 0,
  `delivered=${b2.deliveredToday} avg=${b2.ratingAvg}`);
check("live-board", "rows sorted busiest-first (dr-1 before dr-2)", board[0].driver.id === "dr-1", board.map((r) => r.driver.id).join(","));

/* ---- buildDailyReport + topCouriersForDay ---- */
const rep = R.buildDailyReport(
  [
    mkOrder({ id: "D1", status: "delivered", total: 200 }),
    mkOrder({ id: "D2", status: "cancelled", total: 50 }),
    mkOrder({ id: "D3", status: "pending", total: 100 }),
  ],
  boardCols.slice(0, 2).concat([{ id: "C9", orderId: "D1", courierId: "dr-1", amount: 20, method: "bank", createdAt: isoAt(9) }])
);
check("daily-report", "totals: 3 orders, revenue 300 (cancelled excluded), delivered 1, cancelled 1, active 1",
  rep.ordersCount === 3 && rep.revenue === 300 && rep.deliveredCount === 1 && rep.cancelledCount === 1 && rep.activeCount === 1,
  JSON.stringify({ n: rep.ordersCount, rev: rep.revenue }));
check("daily-report", "collections by method: cash 100×1, wallet 50×1, bank 20×1, total 170",
  rep.collectionsByMethod.cash.sum === 100 && rep.collectionsByMethod.cash.count === 1 &&
    rep.collectionsByMethod.wallet.sum === 50 && rep.collectionsByMethod.bank.sum === 20 &&
    rep.collectionsTotal === 170,
  JSON.stringify(rep.collectionsByMethod));
const tops = R.topCouriersForDay(
  [
    mkOrder({ id: "D1", status: "delivered", delivery: { type: "delivery", driverId: "dr-1" } }),
    mkOrder({ id: "D5", status: "delivered", delivery: { type: "delivery", driverId: "dr-1" } }),
    mkOrder({ id: "D6", status: "delivered", delivery: { type: "delivery", driverId: "dr-2" } }),
    mkOrder({ id: "D7", status: "shipping", delivery: { type: "delivery", driverId: "dr-2" } }),
  ],
  boardRatings
);
check("daily-report", "top couriers: dr-1 first with 2 deliveries + avg 4.5; dr-2 has 1 (shipping doesn't count)",
  tops.length === 2 && tops[0].courierId === "dr-1" && tops[0].delivered === 2 && tops[0].ratingAvg === 4.5 &&
    tops[1].courierId === "dr-2" && tops[1].delivered === 1 && tops[1].ratingAvg === null,
  JSON.stringify(tops));

/* ---- findStuckOrders (thresholds: pending 60 / ready 45 / shipping 90) ---- */
const stuck = R.findStuckOrders(
  [
    mkOrder({ id: "S1", status: "pending", updatedAt: isoAgo(61) }),
    mkOrder({ id: "S2", status: "pending", updatedAt: isoAgo(30) }),
    mkOrder({ id: "S3", status: "ready", updatedAt: isoAgo(46) }),
    mkOrder({ id: "S4", status: "shipping", updatedAt: isoAgo(91) }),
    mkOrder({ id: "S5", status: "shipping", updatedAt: isoAgo(89) }),
    mkOrder({ id: "S6", status: "delivered", updatedAt: isoAgo(500) }),
    mkOrder({ id: "S7", status: "cancelled", updatedAt: isoAgo(500) }),
    mkOrder({ id: "S8", status: "pending", createdAt: isoAgo(120) }), // no updatedAt → createdAt fallback
  ],
  NOW
);
check("stuck", "stuck = S1(pending 61m), S3(ready 46m), S4(shipping 91m), S8(pending via createdAt) — sorted worst first",
  JSON.stringify(stuck.map((s) => s.order.id)) === JSON.stringify(["S8", "S4", "S1", "S3"]),
  stuck.map((s) => `${s.order.id}:${s.minutesStuck}m>${s.thresholdMin}`).join(", "));
check("stuck", "thresholds are the documented ones (60/45/90)",
  R.STUCK_THRESHOLDS_MIN.pending === 60 && R.STUCK_THRESHOLDS_MIN.ready === 45 && R.STUCK_THRESHOLDS_MIN.shipping === 90,
  JSON.stringify(R.STUCK_THRESHOLDS_MIN));

/* ---- planMyOrderSync (notification planner) ---- */
{
  const lastKnown = new Map();
  const notified = new Set();
  const mine = [mkOrder({ id: "N1", status: "pending" }), mkOrder({ id: "N2", status: "shipping" })];
  // لفة ١: N1 زيه زي المحلي (لا تنبيه)، N2 اتسلّم وهو العميل قافل → patch + تنبيه
  let plan = R.planMyOrderSync(mine, new Map([["N1", { status: "pending" }], ["N2", { status: "delivered", courierId: "dr-1" }]]), lastKnown, notified);
  check("notify-plan", "first sight: unchanged order silent; order that moved while away → 1 patch + 1 notification",
    plan.patches.length === 1 && plan.patches[0].id === "N2" && plan.toNotify.length === 1 && plan.toNotify[0].status === "delivered",
    JSON.stringify({ patches: plan.patches.map((p) => p.id), notify: plan.toNotify.map((o) => o.id) }));
  // لفة ٢: نفس حالة السيرفر — لا patch ولا تنبيه تاني
  plan = R.planMyOrderSync(mine, new Map([["N1", { status: "pending" }], ["N2", { status: "delivered" }]]), lastKnown, notified);
  check("notify-plan", "same server state next poll → nothing fires again",
    plan.patches.length === 0 && plan.toNotify.length === 0, "quiet");
  // لفة ٣: N1 بقى ready → تنبيه جديد بحالته
  plan = R.planMyOrderSync(mine, new Map([["N1", { status: "ready" }]]), lastKnown, notified);
  check("notify-plan", "next real transition (pending → ready) notifies once with the new status",
    plan.toNotify.length === 1 && plan.toNotify[0].id === "N1" && plan.toNotify[0].status === "ready",
    JSON.stringify(plan.toNotify.map((o) => `${o.id}:${o.status}`)));
}
{
  // مسار تاني (شاشة التتبع) نبّه الأول: الـ notified المشترك بيمنع التكرار
  // لكن الـ patch لازم يعدي عشان الحالة المحلية تتحدث
  const lastKnown = new Map([["N9", "pending"]]);
  const notified = new Set(["N9:ready"]);
  const plan = R.planMyOrderSync(
    [mkOrder({ id: "N9", status: "pending" })],
    new Map([["N9", { status: "ready" }]]),
    lastKnown,
    notified
  );
  check("notify-plan", "already notified by another path → patch still applies, notification suppressed",
    plan.patches.length === 1 && plan.toNotify.length === 0, JSON.stringify(plan));
  // السيرفر ما ردش على الطلب (RPC فشلت) → ما يلمسوش
  const plan2 = R.planMyOrderSync([mkOrder({ id: "N9", status: "ready" })], new Map(), lastKnown, notified);
  check("notify-plan", "order missing from server response → untouched (no guessing)",
    plan2.patches.length === 0 && plan2.toNotify.length === 0, "untouched");
}

/* ================= summary ================= */
fs.rmSync(tmpMod, { force: true });
const failed = results.filter((r) => !r.pass);
fs.writeFileSync(path.join(QA_DIR, "trio-results.json"), JSON.stringify(results, null, 2));
console.log(`\n==== TRIO QA: ${results.length - failed.length}/${results.length} passed ====`);
if (failed.length) {
  console.error(`FAILED: ${failed.map((f) => f.name).join(" | ")}`);
  process.exit(1);
}
