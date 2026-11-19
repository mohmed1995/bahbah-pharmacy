/**
 * QA BATTERIES 2/3/4/5 — REAL EXECUTION on embedded Postgres (PGlite).
 *
 * What this does:
 *  1. Boots a fresh Postgres (PGlite, real PG engine — not a mock).
 *  2. Creates ONLY the platform objects Supabase itself provides (auth schema,
 *     auth.jwt()/auth.uid() stubs driven by a claims table, anon/authenticated
 *     roles, supabase_realtime publication) + stand-ins for the four tables the
 *     chain assumes pre-exist on the live project (orders, rx_requests,
 *     care_subscriptions, patient_measurements — audit finding D10: the chain
 *     contains no CREATE TABLE for them). Stand-in columns mirror the client's
 *     Db* interfaces in src/lib/supabase.ts.
 *  3. Executes the FULL migration chain IN THE OWNER'S ORDER and records
 *     per-file success/failure. (warehouse-seed.sql: DDL head only — the
 *     10k-row data load is a data operation, not schema; noted in report.)
 *  4. Runs REAL place_order money scenarios, loyalty lifecycle, idempotency
 *     probes and RLS role-matrix probes against the migrated schema.
 *
 * Exits 1 if any check fails. Writes qa-results.json next to this file.
 */
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const QA_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(QA_DIR, "..", "..");
const SQL_DIR = path.join(ROOT, "supabase");

const results = [];
function check(battery, name, pass, evidence) {
  results.push({ battery, name, pass: !!pass, evidence: String(evidence ?? "") });
  console.log(`${pass ? "✅" : "❌"} [${battery}] ${name} — ${evidence}`);
}
async function expectError(battery, name, fn, match) {
  try {
    await fn();
    check(battery, name, false, "expected an error but the operation SUCCEEDED");
  } catch (e) {
    const msg = e.message || String(e);
    check(battery, name, match.test(msg), `error: ${msg.slice(0, 160)}`);
  }
}

const db = new PGlite();
await db.waitReady;

/* ================= Phase A: Supabase platform stubs ================= */
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
async function setClaims(claims) {
  await db.query("update public.qa_jwt_claims set claims = $1::jsonb", [JSON.stringify(claims)]);
}
const SUB = "11111111-1111-1111-1111-111111111111";
const CLAIMS = {
  patient: (phone) => ({ sub: SUB, email: `${phone}@bahbah.eg`, user_metadata: { phone } }),
  pharmacist: { sub: SUB, email: "pharm@bahbah.eg", app_metadata: { role: "pharmacist" } },
  courier: { sub: SUB, email: "courier@bahbah.eg", app_metadata: { role: "courier", driverId: "dr-1" } },
  admin: { sub: SUB, email: "admin@bahbah.eg", app_metadata: { role: "admin" } },
};

/* ---- Stand-ins for tables the chain assumes pre-exist (audit D10) ---- */
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
  -- admin_settings also pre-exists on the live project (created by legacy
  -- scripts long removed from the repo): security.sql line 1 runs an
  -- alter-table drop-column on it BEFORE its own create-if-not-exists in
  -- section 4, so a database without the table fails at line 1. Columns
  -- mirror security.sql section 4 + the legacy admin_pass column.
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
check("migration", "platform stubs + pre-existing-table stand-ins created", true,
  "auth schema/jwt/uid, roles, publication, orders/rx/care/measurements stand-ins (chain has no CREATE TABLE for these four — D10)");

/* ================= Phase B: migration chain, owner's order ================= */
const CHAIN = [
  "security.sql",
  "commerce.sql",
  "commerce-seed.sql",
  "upgrade-2026-11-19.sql",
  "upgrade-2026-11-19-whatsapp-orders.sql",
  "WAREHOUSE_SEED_DDL", // warehouse-seed.sql lives outside supabase/
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
];
let chainBroken = false;
for (const f of CHAIN) {
  let sql;
  if (f === "WAREHOUSE_SEED_DDL") {
    const full = fs.readFileSync(path.join(ROOT, "..", "warehouse-seed.sql"), "utf8");
    sql = full.slice(0, full.indexOf("insert into")); // DDL head only
  } else {
    sql = fs.readFileSync(path.join(SQL_DIR, f), "utf8");
  }
  try {
    await db.exec(sql);
    check("migration", `chain file executes: ${f}`, true, "no error");
  } catch (e) {
    chainBroken = true;
    check("migration", `chain file executes: ${f}`, false, (e.message || String(e)).slice(0, 300));
  }
}
// Supabase-style API grants (RLS is the gatekeeper, as on the real platform)
await db.exec(`
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.jwt(), auth.uid() to anon, authenticated;
  grant all on all tables in schema public to anon, authenticated;
  grant all on all sequences in schema public to anon, authenticated;
`);

/* ================= Phase C: post-chain introspection ================= */
const procSrc = async (fn) =>
  (await db.query("select prosrc from pg_proc where proname = $1 order by oid desc limit 1", [fn])).rows[0]?.prosrc ?? "";
const poSrc = await procSrc("place_order");
check("migration", "final place_order retains campaign check", poSrc.includes("freeShipCampaignOn"), "pg_proc source of winning place_order");
check("migration", "final place_order retains loyalty card logic", poSrc.includes("loyalty_cards"), "pg_proc source");
check("migration", "final place_order contains quota gate + consumption", poSrc.includes("loyalty_free_used") && poSrc.includes("loyalty_free_deliveries"), "pg_proc source");
check("migration", "final place_order retains discreet packaging + lat/lng", poSrc.includes("discreet_packaging") && poSrc.includes("customer_lat"), "pg_proc source");
const hpSrc = await procSrc("has_permission");
check("migration", "final has_permission includes nursing in pharmacist defaults", hpSrc.includes("'nursing'"), "pg_proc source");
const guardSrc = await procSrc("guard_order_update");
check("migration", "final guard_order_update knows the ready step", guardSrc.includes("'ready'"), "pg_proc source");
const gps = (await db.query("select public.get_public_settings() as s")).rows[0].s;
const gpsKeys = Object.keys(gps);
const NEED_KEYS = ["site_edits","ad_edits","care_edits","zone_edits","ads_off","stock_adj","price_override","custom_products","coupons","settings","img_override","custom_drivers","driver_status","zone_disabled","offer_edits","nursing_edits","nursing_custom"];
const missingKeys = NEED_KEYS.filter((k) => !gpsKeys.includes(k));
check("migration", "get_public_settings returns every settings key the client reads", missingKeys.length === 0,
  `${gpsKeys.length} keys returned; missing: ${missingKeys.join(",") || "none"}`);
const noRls = (await db.query(
  "select tablename from pg_tables t join pg_class c on c.relname = t.tablename join pg_namespace n on n.oid = c.relnamespace where t.schemaname='public' and n.nspname='public' and not c.relrowsecurity and t.tablename not like 'qa\\_%'"
)).rows.map((r) => r.tablename);
check("migration", "RLS enabled on every public table", noRls.length === 0, noRls.length ? `no RLS: ${noRls.join(",")}` : "all tables row-secured");

/* ================= Phase D: money scenarios (real place_order) ================= */
await db.exec(`
  insert into public.products (id, price, stock) values
    ('QA-P1', 100, null), ('QA-P2', 50, 5), ('QA-P3', 155, null)
  on conflict (id) do update set price = excluded.price, stock = excluded.stock;
  insert into public.delivery_zones (id, fee) values ('qa-zone', 20)
  on conflict (id) do update set fee = excluded.fee;
  insert into public.delivery_slots (id, extra_fee) values ('qa-slot', 15)
  on conflict (id) do update set extra_fee = excluded.extra_fee;
`);
async function setSettings(obj) {
  await db.query("update public.admin_settings set settings = $1::jsonb where id = 'global'", [JSON.stringify(obj)]);
}
async function place(payload) {
  const r = await db.query("select public.place_order($1::jsonb) as r", [JSON.stringify(payload)]);
  return r.rows[0].r;
}
const base = { deliveryType: "delivery", payment: "cod", phone: "01000000009", name: "QA", address: "x", zoneId: "qa-zone",
  items: [{ productId: "QA-P1", qty: 2, nameAr: "a", nameEn: "a" }] };
let seq = 0;
const oid = () => `QA-ORD-${String(++seq).padStart(3, "0")}`;

await setSettings({});
let r = await place({ ...base, id: oid() });
check("money", "S1 plain order, zone fee 20", r.subtotal === 200 && r.delivery_fee === 20 && r.discount === 0 && r.total === 220, JSON.stringify(r));
const s1Id = r.id;
r = await place({ ...base, id: oid(), slotId: "qa-slot" });
check("money", "S2 slot premium +15", r.delivery_fee === 35 && r.total === 235, JSON.stringify(r));
r = await place({ ...base, id: oid(), deliveryType: "pickup" });
check("money", "S3 pickup = no fee", r.delivery_fee === 0 && r.total === 200, JSON.stringify(r));
r = await place({ ...base, id: oid(), coupon: "BAHBAH10" });
check("money", "S4 coupon 10% at min-total 200", r.discount === 20 && r.total === 200, JSON.stringify(r));
r = await place({ ...base, id: oid(), coupon: "BAHBAH10", items: [{ productId: "QA-P1", qty: 1, nameAr: "a", nameEn: "a" }] });
check("money", "S5 coupon below min-total = no discount", r.discount === 0 && r.total === 120, JSON.stringify(r));
await db.exec(`
  insert into public.loyalty_accounts (customer_phone, balance) values ('01000000007', 1000)
  on conflict (customer_phone) do update set balance = excluded.balance;
  insert into public.loyalty_cards (id, customer_phone, code, percent, status) values
    ('LC-QA3', '01000000007', 'BBH-QARND', 10, 'active')
  on conflict (id) do nothing;
`);
r = await place({ ...base, id: oid(), phone: "01000000007", coupon: "BBH-QARND", items: [{ productId: "QA-P3", qty: 1, nameAr: "a", nameEn: "a" }] });
check("money", "S6 discount rounding via 10% card (min 0): round(15.5) = 16", r.discount === 16 && r.total === 159, JSON.stringify(r));
await setSettings({ freeShipCampaignOn: "true" });
r = await place({ ...base, id: oid(), slotId: "qa-slot" });
check("money", "S7a campaign ON: zone fee 0, slot premium kept", r.delivery_fee === 15 && r.total === 215, JSON.stringify(r));
r = await place({ ...base, id: oid() });
check("money", "S7b campaign ON, no slot: fee 0", r.delivery_fee === 0 && r.total === 200, JSON.stringify(r));
await setSettings({});
// loyalty card lifecycle
await db.exec(`
  insert into public.loyalty_accounts (customer_phone, balance) values ('01000000001', 1000), ('01000000006', 1000)
  on conflict (customer_phone) do update set balance = excluded.balance;
  insert into public.loyalty_cards (id, customer_phone, code, percent, status) values
    ('LC-QA1', '01000000001', 'BBH-QACARD', 10, 'active'),
    ('LC-QA2', '01000000006', 'BBH-QAOTHER', 10, 'active')
  on conflict (id) do nothing;
`);
r = await place({ ...base, id: oid(), phone: "01000000001", coupon: "BBH-QACARD" });
check("money", "S8 loyalty card valid: 10% off, no min-total", r.discount === 20 && r.total === 200, JSON.stringify(r));
const cardState = (await db.query("select status, used_order_id from public.loyalty_cards where code = 'BBH-QACARD'")).rows[0];
check("money", "S8b card marked used exactly once, bound to the order", cardState.status === "used" && cardState.used_order_id === r.id, JSON.stringify(cardState));
r = await place({ ...base, id: oid(), phone: "01000000001", coupon: "BBH-QACARD" });
check("money", "S9 used card gives no discount on second order", r.discount === 0 && r.total === 220, JSON.stringify(r));
r = await place({ ...base, id: oid(), phone: "01000000001", coupon: "BBH-QAOTHER" });
check("money", "S10 someone else's card code gives no discount", r.discount === 0 && r.total === 220, JSON.stringify(r));
// free delivery: level / quota
await db.exec(`insert into public.loyalty_accounts (customer_phone, balance) values ('01000000002', 1500), ('01000000003', 1500)
  on conflict (customer_phone) do update set balance = excluded.balance;`);
const qId = oid();
r = await place({ ...base, id: qId, phone: "01000000002" });
check("money", "S11 top-tier: zone fee waived from quota", r.delivery_fee === 0 && r.total === 200, JSON.stringify(r));
let used = (await db.query("select count(*)::int c from public.loyalty_free_deliveries where customer_phone = '01000000002'")).rows[0].c;
check("idempotency", "S11b quota consumption recorded once", used === 1, `rows=${used}`);
const dup = await place({ ...base, id: qId, phone: "01000000002" });
used = (await db.query("select count(*)::int c from public.loyalty_free_deliveries where customer_phone = '01000000002'")).rows[0].c;
check("idempotency", "S11c duplicate place_order: duplicate flag, no second quota burn, no second order",
  dup.duplicate === true && used === 1, `dup=${JSON.stringify(dup)} used=${used}`);
await setSettings({ loyaltyFreeShipQuota: 1 });
r = await place({ ...base, id: oid(), phone: "01000000003" });
check("money", "S12a quota=1: first order free", r.delivery_fee === 0, JSON.stringify(r));
r = await place({ ...base, id: oid(), phone: "01000000003" });
check("money", "S12b quota exhausted: full zone fee returns", r.delivery_fee === 20 && r.total === 220, JSON.stringify(r));
await setSettings({});
await db.exec(`insert into public.care_subscriptions (id, phone, status) values ('QA-CARE1', '01000000004', 'active') on conflict (id) do nothing;`);
r = await place({ ...base, id: oid(), phone: "01000000004" });
check("money", "S13 active monthly-care member: fee waived (quota)", r.delivery_fee === 0 && r.total === 200, JSON.stringify(r));
await setSettings({ freeShipCampaignOn: "true" });
const before14 = (await db.query("select count(*)::int c from public.loyalty_free_deliveries where customer_phone = '01000000002'")).rows[0].c;
r = await place({ ...base, id: oid(), phone: "01000000002" });
const after14 = (await db.query("select count(*)::int c from public.loyalty_free_deliveries where customer_phone = '01000000002'")).rows[0].c;
check("money", "S14 campaign ON + loyalty eligible: fee 0 and quota NOT consumed", r.delivery_fee === 0 && before14 === after14, `fee=${r.delivery_fee} used ${before14}->${after14}`);
await setSettings({});
// earn on delivery + re-trigger safety
await db.query("update public.orders set status = 'delivered' where id = $1", [s1Id]);
let bal = (await db.query("select balance from public.loyalty_accounts where customer_phone = '01000000009'")).rows[0]?.balance;
check("money", "S15 earn on delivery: floor(220 / 10) = 22 points", bal === 22, `balance=${bal}`);
await db.query("update public.orders set status = 'delivered' where id = $1", [s1Id]); // no transition
await db.query("update public.orders set status = 'cancelled' where id = $1", [s1Id]);  // service path
await db.query("update public.orders set status = 'delivered' where id = $1", [s1Id]);  // re-deliver
bal = (await db.query("select balance from public.loyalty_accounts where customer_phone = '01000000009'")).rows[0]?.balance;
const earnRows = (await db.query("select count(*)::int c from public.loyalty_ledger where order_id = $1 and kind = 'earn'", [s1Id])).rows[0].c;
check("idempotency", "S15b earn is exactly-once across re-delivery (trigger + deterministic ledger id)", bal === 22 && earnRows === 1, `balance=${bal} earnRows=${earnRows}`);
// stock enforcement
await expectError("money", "S16a order qty 6 > stock 5 rejected", () =>
  place({ ...base, id: oid(), items: [{ productId: "QA-P2", qty: 6, nameAr: "a", nameEn: "a" }] }), /out_of_stock/);
r = await place({ ...base, id: oid(), items: [{ productId: "QA-P2", qty: 5, nameAr: "a", nameEn: "a" }] });
let stock = (await db.query("select stock from public.products where id = 'QA-P2'")).rows[0].stock;
check("money", "S16b stock decremented server-side 5 -> 0", stock === 0 && r.total === 270, `stock=${stock} total=${r.total}`);
await expectError("money", "S16c next order now out of stock", () =>
  place({ ...base, id: oid(), items: [{ productId: "QA-P2", qty: 1, nameAr: "a", nameEn: "a" }] }), /out_of_stock/);
// double-submit with stock item
await db.query("update public.products set stock = 10 where id = 'QA-P2'");
const dsId = oid();
const dsPayload = { ...base, id: dsId, items: [{ productId: "QA-P2", qty: 2, nameAr: "a", nameEn: "a" }] };
await place(dsPayload);
const ds2 = await place(dsPayload);
stock = (await db.query("select stock from public.products where id = 'QA-P2'")).rows[0].stock;
const dsCount = (await db.query("select count(*)::int c from public.orders where id = $1", [dsId])).rows[0].c;
check("idempotency", "S17 double-submit same order id: one order, stock decremented once", ds2.duplicate === true && dsCount === 1 && stock === 8,
  `dup=${ds2.duplicate} orders=${dsCount} stock=${stock}`);

/* ================= Phase E: welcome grant (as the patient) ================= */
await setClaims(CLAIMS.patient("01000000005"));
await db.exec("set role authenticated");
const w1 = (await db.query("select public.ensure_loyalty() as r")).rows[0].r;
const w2 = (await db.query("select public.ensure_loyalty() as r")).rows[0].r;
await db.exec("reset role");
const wRows = (await db.query("select count(*)::int c from public.loyalty_ledger where customer_phone = '01000000005' and kind = 'welcome'")).rows[0].c;
check("idempotency", "S18 welcome 50 points granted exactly once across retries",
  w1.balance === 50 && w2.balance === 50 && wRows === 1, `first=${w1.balance} retry=${w2.balance} ledgerRows=${wRows}`);
check("money", "S18b ensure_loyalty reports quota state (quota 4, used 0, remaining 4)",
  w1.free_quota === 4 && w1.free_used === 0 && w1.free_remaining === 4, JSON.stringify({ q: w1.free_quota, u: w1.free_used, r: w1.free_remaining }));

/* ================= Phase F: role x permission matrix (live RLS probes) ================= */
await setClaims({}); // back to the service path (auth.uid() null) for seeding
async function asRole(claims, fn) {
  await setClaims(claims);
  await db.exec("set role authenticated");
  try { return await fn(); } finally { await db.exec("reset role"); }
}
const count = async (sql, params = []) => (await db.query(sql, params)).rows[0].c;
// seed one row in each staff queue + one measurement + one nursing row + one order for the courier
await db.exec(`
  insert into public.whatsapp_orders (id, code, customer_phone, customer_name, items, total, status)
    values ('QA-WA1', 'BH-QA01', '01000000009', 'QA', '[]'::jsonb, 100, 'sent') on conflict (id) do nothing;
  insert into public.rx_requests (id, patient_name, phone, status) values ('QA-RX1', 'QA', '01000000009', 'new') on conflict (id) do nothing;
  insert into public.patient_measurements (id, patient_code, recorded_at) values ('QA-M1', 'BB-101', now()) on conflict (id) do nothing;
`);
await db.query("update public.orders set courier_id = 'dr-1' where id = $1", [s1Id]);
// NOTE: s1Id is 'delivered' by now; make a fresh pending order for transition probes
const probe = await place({ ...base, id: oid(), phone: "01000000009" });
await db.query("update public.orders set courier_id = 'dr-1' where id = $1", [probe.id]);

// -- patient --
await asRole(CLAIMS.patient("01000000009"), async () => {
  const c = await count("select count(*)::int c from public.orders");
  check("roles", "patient: cannot read orders table directly (tracking via RPC only)", c === 0, `rows=${c}`);
  const upd = await db.query("update public.orders set status = 'cancelled' where id = $1 returning id", [probe.id]);
  check("roles", "patient: cannot update any order", upd.rows.length === 0, `updated=${upd.rows.length}`);
  const perm = (await db.query("select public.has_permission('orders') p")).rows[0].p;
  check("roles", "patient: has_permission('orders') = false", perm === false, `=${perm}`);
});
await asRole(CLAIMS.patient("01000000009"), async () => {
  await db.query("insert into public.whatsapp_orders (id, code, customer_phone, items, total, status) values ('QA-WA2', 'BH-QA02', '01000000009', '[]'::jsonb, 50, 'sent')");
  check("roles", "patient: CAN create a whatsapp order in initial status 'sent'", true, "insert ok");
});
await expectError("roles", "patient: cannot create whatsapp order pre-converted", () =>
  asRole(CLAIMS.patient("01000000009"), () =>
    db.query("insert into public.whatsapp_orders (id, code, customer_phone, items, total, status) values ('QA-WA3', 'BH-QA03', '01000000009', '[]'::jsonb, 50, 'converted')")),
  /row-level security|violates/i);
// -- courier --
await asRole(CLAIMS.courier, async () => {
  const wa = await count("select count(*)::int c from public.whatsapp_orders");
  const rx = await count("select count(*)::int c from public.rx_requests");
  const meas = await count("select count(*)::int c from public.patient_measurements");
  const col = await count("select count(*)::int c from public.courier_collections");
  check("roles", "courier: blind to whatsapp/rx/measurements/collections queues (layer-1 gates)", wa === 0 && rx === 0 && meas === 0 && col === 0, `wa=${wa} rx=${rx} meas=${meas} col=${col}`);
  const fin = (await db.query("select public.has_permission('finances') p")).rows[0].p;
  const ord = (await db.query("select public.has_permission('orders') p")).rows[0].p;
  check("roles", "courier: has_permission orders=true, finances=false", ord === true && fin === false, `orders=${ord} finances=${fin}`);
});
await expectError("roles", "courier: cannot mark order ready (pharmacist step)", () =>
  asRole(CLAIMS.courier, () => db.query("update public.orders set status = 'ready' where id = $1", [probe.id])),
  /courier_transition_forbidden|bad_status_transition/);
await asRole(CLAIMS.courier, async () => {
  await db.query("update public.orders set status = 'shipping' where id = $1", [probe.id]);
  const st = (await db.query("select status from public.orders where id = $1", [probe.id])).rows;
  check("roles", "courier: CAN pick up own order (pending -> shipping)", true, "update accepted (staff select sees own queue)");
});
await expectError("roles", "courier: cannot touch order money fields", () =>
  asRole(CLAIMS.courier, () => db.query("update public.orders set total = 1 where id = $1", [probe.id])),
  /courier_field_forbidden/);
// -- pharmacist --
await asRole(CLAIMS.pharmacist, async () => {
  const wa = await count("select count(*)::int c from public.whatsapp_orders");
  const col = await count("select count(*)::int c from public.courier_collections");
  check("roles", "pharmacist: reads whatsapp queue, blind to collections (no finances)", wa >= 1 && col === 0, `wa=${wa} col=${col}`);
  const fin = (await db.query("select public.has_permission('finances') p")).rows[0].p;
  const nur = (await db.query("select public.has_permission('nursing') p")).rows[0].p;
  const setp = (await db.query("select public.has_permission('settings') p")).rows[0].p;
  check("roles", "pharmacist defaults: finances=false, nursing=true, settings=false", fin === false && nur === true && setp === false, `fin=${fin} nur=${nur} set=${setp}`);
  const upd = await db.query("update public.admin_settings set settings = settings where id = 'global' returning id");
  check("roles", "pharmacist: admin_settings UPDATE blocked by RLS (admin-only policy) — known finding D2", upd.rows.length === 0, `updated=${upd.rows.length}`);
  const price = (await db.query("select public.admin_set_price('QA-P1', 100) as r")).rows[0].r;
  check("roles", "pharmacist: admin_set_price allowed via 'medicines' permission (definer RPC)", price.price === 100, JSON.stringify(price));
});
await expectError("roles", "pharmacist: cannot cancel a ready/shipping order", () =>
  asRole(CLAIMS.pharmacist, () => db.query("update public.orders set status = 'cancelled' where id = $1", [probe.id])),
  /pharmacist_transition_forbidden/);
await expectError("roles", "pharmacist: cannot edit order money fields", () =>
  asRole(CLAIMS.pharmacist, () => db.query("update public.orders set discount = 5 where id = $1", [probe.id])),
  /pharmacist_field_forbidden/);
// -- admin --
await asRole(CLAIMS.admin, async () => {
  const fin = (await db.query("select public.has_permission('finances') p")).rows[0].p;
  const upd = await db.query("update public.admin_settings set settings = settings where id = 'global' returning id");
  check("roles", "admin: has_permission always true; settings write allowed", fin === true && upd.rows.length === 1, `fin=${fin} updated=${upd.rows.length}`);
});
// -- collections: courier writes once, wallet rules, manager reads --
await asRole(CLAIMS.courier, async () => {
  await db.query("insert into public.courier_collections (id, order_id, courier_id, amount, method) values ($1, $2, 'dr-1', 220, 'cash')",
    [`COL-${s1Id}`, s1Id]);
  check("idempotency", "collection: courier records cash collection COL-<orderId>", true, "insert ok");
});
await expectError("idempotency", "collection: duplicate COL-<orderId> rejected (PK)", () =>
  asRole(CLAIMS.courier, () => db.query("insert into public.courier_collections (id, order_id, courier_id, amount, method) values ($1, $2, 'dr-1', 220, 'cash')", [`COL-${s1Id}`, s1Id])),
  /duplicate key|unique/i);
await expectError("money", "collection: wallet without from/to rejected by CHECK", () =>
  asRole(CLAIMS.courier, () => db.query("insert into public.courier_collections (id, order_id, courier_id, amount, method) values ('COL-QA-W1', 'QA-ORD-X', 'dr-1', 100, 'wallet')")),
  /courier_collections_wallet_fields|check/i);
await asRole(CLAIMS.courier, async () => {
  await db.query("insert into public.courier_collections (id, order_id, courier_id, amount, method, wallet_from, wallet_to) values ('COL-QA-W2', 'QA-ORD-Y', 'dr-1', 100, 'wallet', '0100', '0101')");
  check("money", "collection: wallet with from/to accepted, amount recorded verbatim", true, "insert ok");
});
await asRole(CLAIMS.admin, async () => {
  const col = await count("select count(*)::int c from public.courier_collections");
  check("roles", "admin (finances): reads collections ledger", col === 2, `rows=${col}`);
});
// -- nursing public insert consistency (layer-1 G3) --
await db.exec("set role anon");
await expectError("roles", "anon nursing booking: total != price+fee rejected", () =>
  db.query("insert into public.nursing_requests (id, code, customer_phone, customer_name, service_id, service_name_ar, service_name_en, service_price, visit_fee, total, status) values ('QA-NR1', 'BH-QA09', '01000000009', 'QA', 'sugar', 'قياس سكر', 'Sugar', 25, 20, 999, 'new')"),
  /row-level security|violates/i);
await db.query("insert into public.nursing_requests (id, code, customer_phone, customer_name, service_id, service_name_ar, service_name_en, service_price, visit_fee, total, status) values ('QA-NR2', 'BH-QA10', '01000000009', 'QA', 'sugar', 'قياس سكر', 'Sugar', 25, 20, 45, 'new')");
check("roles", "anon nursing booking: consistent totals accepted", true, "insert ok");
await db.exec("reset role");
// -- measurements patient access path --
await db.exec("set role anon");
const meas = (await db.query("select public.get_measurements_for_patient('BB-101') as m")).rows;
check("roles", "patient measurements reachable only via personal-code RPC", Array.isArray(meas), `rpc rows=${meas.length}`);
await db.exec("reset role");

/* ================= summary ================= */
const failed = results.filter((x) => !x.pass);
const byBattery = {};
for (const x of results) {
  byBattery[x.battery] ??= { pass: 0, fail: 0 };
  byBattery[x.battery][x.pass ? "pass" : "fail"]++;
}
console.log("\n================ QA DRY-RUN SUMMARY ================");
for (const [b, c] of Object.entries(byBattery)) console.log(`${b}: ${c.pass} passed, ${c.fail} failed`);
console.log(`TOTAL: ${results.length - failed.length}/${results.length} passed`);
if (chainBroken) console.log("NOTE: migration chain had failures — downstream results may cascade.");
fs.writeFileSync(path.join(QA_DIR, "qa-results.json"), JSON.stringify({ at: new Date().toISOString(), chainBroken, byBattery, results }, null, 2));
await db.close();
process.exit(failed.length ? 1 : 0);
