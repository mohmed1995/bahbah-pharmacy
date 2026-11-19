/**
 * QA — SECURITY LAYER 2 (private rx bucket + public-create hardening).
 *
 * Real execution on embedded Postgres (PGlite), same harness conventions
 * as post_delivery_check.mjs, PLUS a minimal storage platform stub
 * (storage.buckets / storage.objects / storage.foldername) since the
 * real storage schema is Supabase-platform-provided. The stub mirrors
 * the platform's shape for the columns the chain touches; RLS on
 * storage.objects is real and the migration's policies attach to it,
 * so the policy BEHAVIOR below is genuinely executed — what cannot be
 * proven here is the storage HTTP API itself (signed-URL minting is a
 * client/platform call, verified by code + grep, not by this harness).
 *
 *  1. Full chain in the owner's order + security-layer2 LAST.
 *  2. Introspection: bucket private + size cap, 4 storage policies,
 *     no update/delete storage policies, 3 guard triggers, helper ACL.
 *  3. Storage RLS probes as real roles: own-folder upload only,
 *     guest drop-box write-only, own/referenced reads, staff reads,
 *     courier + anon read nothing, no update/delete path.
 *  4. Public-create probes as anon: field caps + phone format +
 *     per-phone open-request ceilings on whatsapp/shortage/nursing.
 *
 * Exits 1 if any check fails. Writes layer2-results.json.
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

/* ================= Phase A: platform stubs (auth + storage) ================= */
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

  /* ---- storage platform stub (shape mirrors Supabase's storage schema
     for the columns the chain touches; RLS is real) ---- */
  create schema if not exists storage;
  create table if not exists storage.buckets (
    id text primary key, name text not null,
    public boolean not null default false,
    file_size_limit bigint, allowed_mime_types text[],
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  create table if not exists storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets(id),
    name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  alter table storage.objects enable row level security;
  create or replace function storage.foldername(name text) returns text[]
  language sql immutable as $$
    select case when position('/' in name) = 0 then array[]::text[]
                else (string_to_array(name, '/'))[1:cardinality(string_to_array(name, '/')) - 1]
           end $$;
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
check("migration", "platform stubs (auth + storage) + pre-existing-table stand-ins created", true,
  "storage stub mirrors platform shape; storage.objects RLS enabled");

/* ================= Phase B: full chain + layer-2 LAST ================= */
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
  "upgrade-2026-11-19-security-layer2.sql",
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
  fs.writeFileSync(path.join(QA_DIR, "layer2-results.json"), JSON.stringify(results, null, 2));
  console.error("CHAIN BROKEN — aborting probes");
  process.exit(1);
}

/* Supabase-style API grants (RLS is the gatekeeper, as on the real platform) */
await db.exec(`
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema storage to anon, authenticated;
  grant execute on function auth.jwt(), auth.uid() to anon, authenticated;
  grant all on all tables in schema public to anon, authenticated;
  grant all on all sequences in schema public to anon, authenticated;
  grant all on storage.objects to anon, authenticated;
  grant select on storage.buckets to anon, authenticated;
`);

/* ================= Phase C: introspection ================= */
const bucket = (await db.query(
  "select public, file_size_limit from storage.buckets where id = 'rx-prescriptions'"
)).rows[0];
check("introspection", "bucket rx-prescriptions exists, PRIVATE, 10MB file cap",
  !!bucket && bucket.public === false && Number(bucket.file_size_limit) === 10485760,
  JSON.stringify(bucket ?? null));
const pols = (await db.query(
  "select policyname, cmd from pg_policies where schemaname='storage' and tablename='objects' order by policyname"
)).rows;
check("introspection", "storage policies: insert-own + insert-guest + select-own + select-staff, NO update/delete",
  pols.length === 4 && pols.every((p) => ["INSERT", "SELECT"].includes(p.cmd)),
  pols.map((p) => `${p.policyname}:${p.cmd}`).join(", "));
const trigs = (await db.query(
  `select tgname from pg_trigger where not tgisinternal and tgname like 'trg_guard_%' order by tgname`
)).rows.map((r) => r.tgname);
check("introspection", "3 public-create guard triggers installed",
  trigs.length === 3, trigs.join(", "));
const helper = (await db.query(
  "select prosecdef, coalesce(proacl::text, '') as acl from pg_proc where proname = 'rx_photo_visible_to_caller'"
)).rows[0];
check("introspection", "rx_photo_visible_to_caller is SECURITY DEFINER, EXECUTE for authenticated only",
  !!helper && helper.prosecdef === true && helper.acl.includes("authenticated=") && !helper.acl.includes("anon="),
  helper ? `acl=${helper.acl}` : "missing");

/* ================= Phase D: storage RLS probes ================= */
const PA = "01001234567"; // patient A
const PB = "01009999999"; // patient B
const PUB = "https://qa.supabase.co/storage/v1/object/public/rx-prescriptions";
await db.exec(`
  insert into storage.objects (bucket_id, name) values
    ('rx-prescriptions', 'u/${PA}/rx_a.jpg'),
    ('rx-prescriptions', 'guest/rx_b.jpg'),
    ('rx-prescriptions', 'rx_legacy.jpg'),
    ('rx-prescriptions', 'u/${PB}/rx_c.jpg');
  insert into public.rx_requests (id, patient_name, phone, image_url, status) values
    ('RX-QA1', 'عميل أ', '${PA}', '${PUB}/guest/rx_b.jpg', 'new');
  insert into public.care_subscriptions (id, name, phone, prescription_url, status) values
    ('CS-QA1', 'عميل أ', '${PA}', '${PUB}/rx_legacy.jpg', 'active');
`);
async function asRole(claims, fn) {
  await setClaims(claims);
  await db.exec("set role authenticated");
  try { return await fn(); } finally { await db.exec("reset role"); }
}
async function asAnon(fn) {
  await setClaims({});
  await db.exec("set role anon");
  try { return await fn(); } finally { await db.exec("reset role"); }
}
const insertObj = (name) =>
  db.query("insert into storage.objects (bucket_id, name) values ('rx-prescriptions', $1)", [name]);
const visibleNames = async () =>
  (await db.query("select name from storage.objects where bucket_id = 'rx-prescriptions' order by name")).rows.map((r) => r.name);

/* uploads */
await asRole(CLAIMS.patient(PA), async () => {
  await insertObj(`u/${PA}/rx_new.jpg`);
  check("storage-upload", "patient uploads into OWN u/<phone> folder", true, `u/${PA}/rx_new.jpg`);
});
await expectError("storage-upload", "patient CANNOT upload into someone else's folder",
  () => asRole(CLAIMS.patient(PA), () => insertObj(`u/${PB}/rx_evil.jpg`)),
  /row-level security|violates/);
await expectError("storage-upload", "patient CANNOT upload at bucket root",
  () => asRole(CLAIMS.patient(PA), () => insertObj("rx_root.jpg")),
  /row-level security|violates/);
await asAnon(async () => {
  await insertObj("guest/rx_anon.jpg");
  check("storage-upload", "guest (anon) can drop into guest/ (write-only drop box)", true, "guest/rx_anon.jpg");
});
await expectError("storage-upload", "guest CANNOT upload into a customer's folder",
  () => asAnon(() => insertObj(`u/${PA}/rx_evil2.jpg`)),
  /row-level security|violates/);

/* reads */
const seenA = await asRole(CLAIMS.patient(PA), visibleNames);
check("storage-read", "patient A reads: own folder + guest photo referenced by own Rx + legacy file referenced by own care sub",
  seenA.includes(`u/${PA}/rx_a.jpg`) && seenA.includes("guest/rx_b.jpg") && seenA.includes("rx_legacy.jpg"),
  seenA.join(", "));
check("storage-read", "patient A does NOT read: patient B's folder, unreferenced guest uploads",
  !seenA.includes(`u/${PB}/rx_c.jpg`) && !seenA.includes("guest/rx_anon.jpg"),
  seenA.join(", "));
const seenB = await asRole(CLAIMS.patient(PB), visibleNames);
check("storage-read", "patient B reads only own folder",
  seenB.length === 1 && seenB[0] === `u/${PB}/rx_c.jpg`, seenB.join(", "));
const seenPharm = await asRole(CLAIMS.pharmacist, visibleNames);
check("storage-read", "pharmacist (prescriptions/shortages defaults) reads ALL bucket objects",
  seenPharm.length >= 6, `${seenPharm.length} objects`);
const seenCourier = await asRole(CLAIMS.courier, visibleNames);
check("storage-read", "courier reads NOTHING (layer-1 posture holds through storage)",
  seenCourier.length === 0, `saw ${seenCourier.length}`);
const seenAnon = await asAnon(visibleNames);
check("storage-read", "anon reads NOTHING (bucket is private)",
  seenAnon.length === 0, `saw ${seenAnon.length}`);

/* no update/delete path */
await asRole(CLAIMS.patient(PA), async () => {
  await db.query("delete from storage.objects where name = $1", [`u/${PA}/rx_a.jpg`]);
  await db.query("update storage.objects set name = 'u/hacked.jpg' where name = $1", [`u/${PA}/rx_a.jpg`]);
});
const stillThere = (await db.query(
  "select count(*)::int as n from storage.objects where name = $1", [`u/${PA}/rx_a.jpg`]
)).rows[0].n;
check("storage-write", "patient update/delete silently affect 0 rows (no policies exist)",
  stillThere === 1, `object still present: ${stillThere === 1}`);

/* ================= Phase E: public-create hardening probes (as anon) ================= */
const waInsert = (id, code, phone, name, items = "[]") =>
  db.query(
    "insert into public.whatsapp_orders (id, code, customer_phone, customer_name, items, total, status) values ($1,$2,$3,$4,$5::jsonb,0,'sent')",
    [id, code, phone, name, items]
  );
await asAnon(async () => {
  await waInsert("WA-QA1", "BH-QA01", PA, "أحمد");
  check("public-create", "whatsapp: valid public insert passes", true, "BH-QA01");
});
await expectError("public-create", "whatsapp: name > 80 chars rejected",
  () => asAnon(() => waInsert("WA-QA2", "BH-QA02", PA, "x".repeat(81))), /customer_name_too_long/);
await expectError("public-create", "whatsapp: phone with 3 digits rejected",
  () => asAnon(() => waInsert("WA-QA3", "BH-QA03", "123", "أحمد")), /bad_phone/);
await expectError("public-create", "whatsapp: 51 items rejected",
  () => asAnon(() => waInsert("WA-QA4", "BH-QA04", PA, "أحمد", JSON.stringify(Array(51).fill({ n: "x" })))), /bad_items/);
/* rate ceiling: PA already has 1 open ('sent') — add 4 more, 6th must fail */
await asAnon(async () => {
  for (let i = 0; i < 4; i++) await waInsert(`WA-QB${i}`, `BH-QB0${i}`, PA, "أحمد");
});
await expectError("public-create", "whatsapp: 6th open request for same phone rejected",
  () => asAnon(() => waInsert("WA-QB9", "BH-QB09", PA, "أحمد")), /too_many_open_requests/);
await db.query("update public.whatsapp_orders set status = 'done' where id = 'WA-QB0'");
await asAnon(async () => {
  await waInsert("WA-QB8", "BH-QB08", PA, "أحمد");
  check("public-create", "whatsapp: after one closes, a new open request passes again", true, "BH-QB08");
});

const srInsert = (id, code, phone, item) =>
  db.query(
    "insert into public.shortage_requests (id, code, customer_phone, customer_name, item_name, status) values ($1,$2,$3,'أحمد',$4,'pending')",
    [id, code, phone, item]
  );
await asAnon(async () => {
  await srInsert("SR-QA1", "BH-QS01", PA, "دواء سكر");
  check("public-create", "shortage: valid public insert passes", true, "BH-QS01");
});
await expectError("public-create", "shortage: item_name > 120 chars rejected",
  () => asAnon(() => srInsert("SR-QA2", "BH-QS02", PA, "x".repeat(121))), /item_name_too_long/);
await expectError("public-create", "shortage: bad phone rejected",
  () => asAnon(() => srInsert("SR-QA3", "BH-QS03", "12", "دواء")), /bad_phone/);
await asAnon(async () => {
  for (let i = 0; i < 4; i++) await srInsert(`SR-QB${i}`, `BH-QT0${i}`, PA, "دواء");
});
await expectError("public-create", "shortage: 6th pending request for same phone rejected",
  () => asAnon(() => srInsert("SR-QB9", "BH-QT09", PA, "دواء")), /too_many_open_requests/);

const nrInsert = (id, code, phone, notes = null) =>
  db.query(
    `insert into public.nursing_requests
       (id, code, customer_phone, customer_name, service_id, service_name_ar, service_price, visit_fee, total, notes, status)
     values ($1,$2,$3,'أحمد','svc1','قياس سكر',25,10,35,$4,'new')`,
    [id, code, phone, notes]
  );
await asAnon(async () => {
  await nrInsert("NR-QA1", "BH-QN01", PA);
  check("public-create", "nursing: valid public insert passes (money consistency intact)", true, "BH-QN01");
});
await expectError("public-create", "nursing: notes > 500 chars rejected",
  () => asAnon(() => nrInsert("NR-QA2", "BH-QN02", PA, "x".repeat(501))), /notes_too_long/);
await expectError("public-create", "nursing: bad phone rejected",
  () => asAnon(() => nrInsert("NR-QA3", "BH-QN03", "999")), /bad_phone/);
await asAnon(async () => {
  await nrInsert("NR-QB0", "BH-QN10", PA);
  await nrInsert("NR-QB1", "BH-QN11", PA);
});
await expectError("public-create", "nursing: 4th open booking for same phone rejected",
  () => asAnon(() => nrInsert("NR-QB9", "BH-QN19", PA)), /too_many_open_requests/);

/* staff updates are NOT blocked by the insert guards */
await db.query("update public.nursing_requests set status = 'confirmed', notes = $1 where id = 'NR-QA1'", ["x".repeat(600)]);
check("public-create", "staff UPDATE path unaffected by insert guards (long internal note ok)",
  true, "update applied as owner");

/* ================= summary ================= */
const failed = results.filter((r) => !r.pass);
console.log(`\n===== LAYER-2 QA: ${results.length - failed.length}/${results.length} passed =====`);
fs.writeFileSync(path.join(QA_DIR, "layer2-results.json"), JSON.stringify(results, null, 2));
if (failed.length) process.exit(1);
