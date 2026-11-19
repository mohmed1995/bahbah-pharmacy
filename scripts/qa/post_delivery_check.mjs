/**
 * QA — POST-DELIVERY BATCH (courier ratings + message templates).
 *
 * Real execution on embedded Postgres (PGlite), same harness conventions
 * as migration_delta.mjs:
 *  1. Platform stubs (auth.jwt/uid via claims table, API roles) + stand-ins
 *     for the four tables the chain assumes pre-exist (audit D10).
 *  2. FULL migration chain in the owner's order, with the new
 *     upgrade-2026-11-19-courier-ratings.sql LAST.
 *  3. Introspection: courier_ratings shape/RLS, phones_match semantics,
 *     get_public_settings carries courier_msg_templates with the seeds.
 *  4. Behavioral RLS probes as real roles: a customer can rate ONLY their
 *     own DELIVERED order, exactly once; forged phone / someone else's
 *     order / not-yet-delivered / bad stars all rejected; no update or
 *     delete path exists; staff read all; anon gets nothing.
 *  5. Rating math the admin UI aggregates (avg / count / latest comments).
 *
 * Exits 1 if any check fails. Writes post-delivery-results.json.
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
check("migration", "platform stubs + pre-existing-table stand-ins created", true, "same harness as migration_delta.mjs");

/* ================= Phase B: full chain + the new migration LAST ================= */
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
    check("migration", `chain file executes: ${f}`, true, "no error");
  } catch (e) {
    chainBroken = true;
    check("migration", `chain file executes: ${f}`, false, (e.message || String(e)).slice(0, 300));
  }
}
if (chainBroken) {
  fs.writeFileSync(path.join(QA_DIR, "post-delivery-results.json"), JSON.stringify(results, null, 2));
  console.error("CHAIN BROKEN — aborting probes");
  process.exit(1);
}

/* Supabase-style API grants (RLS is the gatekeeper, as on the real platform) */
await db.exec(`
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.jwt(), auth.uid() to anon, authenticated;
  grant all on all tables in schema public to anon, authenticated;
  grant all on all sequences in schema public to anon, authenticated;
`);

/* ================= Phase C: introspection ================= */
const tbl = (await db.query(
  "select relrowsecurity from pg_class where relname = 'courier_ratings' and relnamespace = 'public'::regnamespace"
)).rows[0];
check("introspection", "courier_ratings exists with RLS enabled", !!tbl && tbl.relrowsecurity === true, JSON.stringify(tbl ?? null));
const uniq = (await db.query(
  "select count(*)::int as n from pg_indexes where schemaname='public' and tablename='courier_ratings' and indexdef ilike '%unique%order_id%'"
)).rows[0].n;
check("introspection", "courier_ratings.order_id is UNIQUE (one rating per order at the DB level)", uniq >= 1, `unique indexes on order_id: ${uniq}`);
const pols = (await db.query(
  "select policyname, cmd from pg_policies where schemaname='public' and tablename='courier_ratings' order by policyname"
)).rows;
check("introspection", "policies: insert-own + select-own + staff-select, and NO update/delete policies",
  pols.length === 3 && pols.every((p) => ["INSERT", "SELECT"].includes(p.cmd)),
  pols.map((p) => `${p.policyname}:${p.cmd}`).join(", "));
const roa = (await db.query("select prosecdef, coalesce(proacl::text, '') as acl from pg_proc where proname = 'rating_order_allowed'")).rows[0];
check("introspection", "rating_order_allowed is SECURITY DEFINER, EXECUTE for authenticated only",
  !!roa && roa.prosecdef === true && roa.acl.includes("authenticated=") && !roa.acl.includes("anon="),
  roa ? `acl=${roa.acl}` : "missing");
const gps = (await db.query("select public.get_public_settings() as s")).rows[0].s;
const tpl = gps.courier_msg_templates;
check("introspection", "get_public_settings returns courier_msg_templates with the 3 seed messages",
  Array.isArray(tpl) && tpl.length === 3 && tpl[0].includes("في الطريق"),
  `templates=${JSON.stringify(tpl)}`);
const pm = async (a, b) => (await db.query("select public.phones_match($1, $2) as m", [a, b])).rows[0].m;
check("phones_match", "identical numbers match; +20 format matches 0 format; last-10 rule works",
  (await pm("01000000011", "01000000011")) === true &&
  (await pm("+201000000011", "01000000011")) === true &&
  (await pm("201000000011", "01000000011")) === true,
  "three format variants of the same number");
check("phones_match", "different numbers / empty values do NOT match",
  (await pm("01000000011", "01000000012")) === false &&
  (await pm("", "01000000011")) === false &&
  (await pm(null, "01000000011")) === false,
  "mismatch + empties rejected");

/* ================= Phase D: seed orders ================= */
await db.exec(`
  insert into public.orders (id, customer_name, customer_phone, status, payment_status, courier_id, total) values
    ('QA-A1', 'عميل أ', '01000000011', 'delivered', 'paid', 'dr-1', 220),
    ('QA-A2', 'عميل أ', '+201000000011', 'delivered', 'paid', 'dr-1', 150),
    ('QA-A3', 'عميل أ', '01000000011', 'shipping', 'unpaid', 'dr-1', 90),
    ('QA-B1', 'عميلة ب', '01000000012', 'delivered', 'paid', 'dr-2', 300)
  on conflict (id) do nothing;
`);

async function asRole(claims, fn) {
  await setClaims(claims);
  await db.exec("set role authenticated");
  try { return await fn(); } finally { await db.exec("reset role"); }
}
const insertRating = (id, orderId, phone, stars, comment = null) =>
  db.query(
    "insert into public.courier_ratings (id, order_id, courier_id, courier_name, customer_phone, stars, comment) values ($1,$2,'dr-1','محمود سيد',$3,$4,$5)",
    [id, orderId, phone, stars, comment]
  );

/* ---- happy path: own delivered order ---- */
await asRole(CLAIMS.patient("01000000011"), async () => {
  await insertRating("CR-QA-A1", "QA-A1", "01000000011", 5, "سريع ومحترم");
});
const a1 = (await db.query("select stars, comment from public.courier_ratings where order_id = 'QA-A1'")).rows[0];
check("ratings-rls", "customer rates OWN delivered order — row persisted (5★ + comment)", a1?.stars === 5 && a1?.comment === "سريع ومحترم", JSON.stringify(a1));

/* ---- same customer, order stored in +20 format ---- */
await asRole(CLAIMS.patient("01000000011"), async () => {
  await insertRating("CR-QA-A2", "QA-A2", "01000000011", 4, null);
});
const a2 = (await db.query("select stars from public.courier_ratings where order_id = 'QA-A2'")).rows[0];
check("ratings-rls", "order phone stored as +20… still rateable by the same customer (digit matching)", a2?.stars === 4, JSON.stringify(a2));

/* ---- exactly once ---- */
await expectError("ratings-rls", "SECOND rating for the same order is rejected (unique order_id)", () =>
  asRole(CLAIMS.patient("01000000011"), () => insertRating("CR-QA-A1-BIS", "QA-A1", "01000000011", 1)), /duplicate key|unique/i);

/* ---- someone else's order ---- */
await expectError("ratings-rls", "rating SOMEONE ELSE'S delivered order is rejected by RLS", () =>
  asRole(CLAIMS.patient("01000000011"), () => insertRating("CR-QA-B1", "QA-B1", "01000000011", 5)), /row-level security/i);

/* ---- forged phone on own order ---- */
await expectError("ratings-rls", "rating with a FORGED customer_phone (not the session phone) is rejected", () =>
  asRole(CLAIMS.patient("01000000012"), () => insertRating("CR-QA-A3-F", "QA-A1", "01000000012", 5)), /row-level security|duplicate key/i);

/* ---- not delivered yet ---- */
await expectError("ratings-rls", "rating an order still SHIPPING (not delivered) is rejected", () =>
  asRole(CLAIMS.patient("01000000011"), () => insertRating("CR-QA-A3", "QA-A3", "01000000011", 5)), /row-level security/i);

/* ---- stars range ---- */
await expectError("ratings-rls", "stars = 6 rejected (check constraint / policy)", () =>
  asRole(CLAIMS.patient("01000000012"), () => insertRating("CR-QA-B1-S6", "QA-B1", "01000000012", 6)), /check constraint|row-level security/i);

/* ---- B rates her own order (dr-2) ---- */
await asRole(CLAIMS.patient("01000000012"), async () => {
  await db.query(
    "insert into public.courier_ratings (id, order_id, courier_id, courier_name, customer_phone, stars, comment) values ('CR-QA-B1-OK','QA-B1','dr-2','كريم فتحي','01000000012',4,'كويس بس اتأخر شوية')"
  );
});
check("ratings-rls", "second customer rates her own delivered order (dr-2)", true, "insert succeeded under her own claims");

/* ---- read isolation ---- */
const ownSeen = await asRole(CLAIMS.patient("01000000011"), async () =>
  (await db.query("select order_id from public.courier_ratings order by order_id")).rows.map((r) => r.order_id));
check("ratings-rls", "customer SELECT sees ONLY own ratings", JSON.stringify(ownSeen) === JSON.stringify(["QA-A1", "QA-A2"]), `saw: ${ownSeen.join(",")}`);
const staffSeen = await asRole(CLAIMS.pharmacist, async () =>
  (await db.query("select count(*)::int as n from public.courier_ratings")).rows[0].n);
check("ratings-rls", "staff SELECT sees ALL ratings (admin averages source)", staffSeen === 3, `count=${staffSeen}`);

/* ---- no update / delete path for customers ---- */
const upd = await asRole(CLAIMS.patient("01000000011"), async () =>
  (await db.query("update public.courier_ratings set stars = 1 where order_id = 'QA-A1' returning id")).rows.length);
const del = await asRole(CLAIMS.patient("01000000011"), async () =>
  (await db.query("delete from public.courier_ratings where order_id = 'QA-A1' returning id")).rows.length);
const a1After = (await db.query("select stars from public.courier_ratings where order_id = 'QA-A1'")).rows[0];
check("ratings-rls", "customer UPDATE and DELETE affect 0 rows — rating is final once written",
  upd === 0 && del === 0 && a1After?.stars === 5, `upd=${upd} del=${del} stars still ${a1After?.stars}`);

/* ---- anon ---- */
await db.exec("set role anon");
await expectError("ratings-rls", "anon cannot insert a rating", () =>
  db.query("insert into public.courier_ratings (id, order_id, customer_phone, stars) values ('CR-ANON','QA-A1','01000000011',5)"),
  /row-level security|permission denied/i);
await expectError("ratings-rls", "anon cannot EXECUTE rating_order_allowed", () =>
  db.query("select public.rating_order_allowed('QA-A1', '01000000011')"), /permission denied/i);
await db.exec("reset role");

/* ================= Phase E: admin aggregation math ================= */
const agg = (await db.query(`
  select courier_id,
         round(avg(stars)::numeric, 2) as avg,
         count(*)::int as n,
         (array_agg(comment order by created_at desc) filter (where comment is not null))[1] as latest_comment
    from public.courier_ratings group by courier_id order by courier_id
`)).rows;
const dr1 = agg.find((r) => r.courier_id === "dr-1");
const dr2 = agg.find((r) => r.courier_id === "dr-2");
check("rating-math", "dr-1: ratings 5★ and 4★ → avg 4.50, count 2, latest comment present",
  dr1 && Number(dr1.avg) === 4.5 && dr1.n === 2 && typeof dr1.latest_comment === "string",
  JSON.stringify(dr1));
check("rating-math", "dr-2: single 4★ rating → avg 4.00, count 1",
  dr2 && Number(dr2.avg) === 4 && dr2.n === 1, JSON.stringify(dr2));

/* ================= summary ================= */
const failed = results.filter((r) => !r.pass);
fs.writeFileSync(path.join(QA_DIR, "post-delivery-results.json"), JSON.stringify(results, null, 2));
console.log(`\n==== POST-DELIVERY QA: ${results.length - failed.length}/${results.length} passed ====`);
if (failed.length) {
  console.error(`FAILED: ${failed.map((f) => f.name).join(" | ")}`);
  process.exit(1);
}
