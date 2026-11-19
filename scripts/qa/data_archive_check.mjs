/**
 * QA — DATA EXPORT & ARCHIVE (ترقية data-archive, position 15).
 *
 * Real execution on embedded Postgres (PGlite), same harness
 * conventions as security_layer2_check.mjs (auth + storage platform
 * stubs, stand-ins for the four pre-existing tables, Supabase-style
 * grants, role switching via qa_jwt_claims).
 *
 *  1. Full chain in the owner's order + data-archive LAST.
 *  2. Introspection: the 3 new functions exist, SECURITY DEFINER,
 *     EXECUTE for authenticated only.
 *  3. Archive probes: non-admins rejected (admin_only), future
 *     cutoff rejected (bad_cutoff), preview counts == delete counts,
 *     old terminal orders + their collections/ratings + closed queue
 *     items deleted, old-but-open items survive, and the essentials
 *     (care / measurements / loyalty x3 / addresses / warehouse)
 *     are byte-for-byte untouched. Second run deletes nothing.
 *  4. Restore probes: non-admin rejected, non-whitelisted table
 *     rejected, archived row comes back, re-import of the same rows
 *     is idempotent (upsert — no duplicates, values updated),
 *     loyalty_accounts restorable despite having NO client write
 *     policy, warehouse rows keyed by sync_key (null keys skipped),
 *     and the layer-2 public-create guards are bypassed ONLY inside
 *     the admin restore (a 6th open whatsapp row restores fine while
 *     a direct insert of it is rejected).
 *
 * Exits 1 if any check fails. Writes data-archive-results.json.
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
check("migration", "platform stubs + pre-existing-table stand-ins created", true, "auth/storage stubs + D10 stand-ins");

/* ================= Phase B: full chain + data-archive LAST ================= */
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
  "upgrade-2026-11-19-data-archive.sql",
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
  fs.writeFileSync(path.join(QA_DIR, "data-archive-results.json"), JSON.stringify(results, null, 2));
  console.error("CHAIN BROKEN — aborting probes");
  process.exit(1);
}

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
for (const fn of ["archive_preview_counts", "archive_old_operational_data", "restore_backup_table"]) {
  const row = (await db.query(
    "select prosecdef, coalesce(proacl::text, '') as acl from pg_proc where proname = $1", [fn]
  )).rows[0];
  check("introspection", `${fn} is SECURITY DEFINER, EXECUTE for authenticated only`,
    !!row && row.prosecdef === true && row.acl.includes("authenticated=") && !row.acl.includes("anon="),
    row ? `acl=${row.acl}` : "missing");
}

/* ================= Phase D: seed ================= */
const OLD = "2026-05-01T00:00:00Z";
const NEW = "2026-11-18T00:00:00Z";
const CUTOFF = "2026-08-01T00:00:00Z";
const PHONE = "01001234567";
await db.exec(`
  insert into public.orders (id, customer_name, customer_phone, items, subtotal, total, status, payment_status, created_at, updated_at) values
    ('ORD-OLD-DEL', 'عميل قديم', '${PHONE}', '[]', 100, 100, 'delivered', 'paid', '${OLD}', '${OLD}'),
    ('ORD-OLD-CAN', 'عميل قديم', '${PHONE}', '[]', 50, 50, 'cancelled', 'unpaid', '${OLD}', '${OLD}'),
    ('ORD-OLD-PEN', 'عميل قديم', '${PHONE}', '[]', 70, 70, 'pending', 'unpaid', '${OLD}', '${OLD}'),
    ('ORD-NEW-DEL', 'عميل جديد', '${PHONE}', '[]', 200, 200, 'delivered', 'paid', '${NEW}', '${NEW}');
  insert into public.courier_collections (id, order_id, courier_id, amount, method, created_at) values
    ('COL-OLD', 'ORD-OLD-DEL', 'dr-1', 100, 'cash', '${OLD}'),
    ('COL-NEW', 'ORD-NEW-DEL', 'dr-1', 200, 'cash', '${NEW}'),
    ('COL-ORPHAN', 'ORD-GONE', 'dr-1', 30, 'cash', '${OLD}'),
    ('COL-ORPHAN-NEW', 'ORD-GONE', 'dr-1', 40, 'cash', '${NEW}');
  insert into public.courier_ratings (id, order_id, courier_id, customer_phone, stars, created_at) values
    ('CR-OLD', 'ORD-OLD-DEL', 'dr-1', '${PHONE}', 5, '${OLD}'),
    ('CR-NEW', 'ORD-NEW-DEL', 'dr-1', '${PHONE}', 4, '${NEW}');
  insert into public.whatsapp_orders (id, code, customer_phone, customer_name, items, total, status, created_at, updated_at) values
    ('WA-OLD-DONE', 'BH-WA1', '${PHONE}', 'عميل', '[]', 10, 'done', '${OLD}', '${OLD}'),
    ('WA-OLD-SENT', 'BH-WA2', '${PHONE}', 'عميل', '[]', 10, 'sent', '${OLD}', '${OLD}'),
    ('WA-NEW-DONE', 'BH-WA3', '${PHONE}', 'عميل', '[]', 10, 'done', '${NEW}', '${NEW}');
  insert into public.shortage_requests (id, code, customer_phone, customer_name, item_name, status, created_at, updated_at) values
    ('SH-OLD-CLOSED', 'BH-SH1', '${PHONE}', 'عميل', 'دواء قديم', 'closed', '${OLD}', '${OLD}'),
    ('SH-OLD-PEND', 'BH-SH2', '${PHONE}', 'عميل', 'دواء مستني', 'pending', '${OLD}', '${OLD}'),
    ('SH-NEW-CLOSED', 'BH-SH3', '${PHONE}', 'عميل', 'دواء جديد', 'closed', '${NEW}', '${NEW}');
  insert into public.nursing_requests (id, code, customer_phone, customer_name, service_id, service_name_ar, status, created_at, updated_at) values
    ('NR-OLD-DONE', 'BH-NR1', '${PHONE}', 'عميل', 'sugar', 'قياس سكر', 'done', '${OLD}', '${OLD}'),
    ('NR-OLD-NEW', 'BH-NR2', '${PHONE}', 'عميل', 'sugar', 'قياس سكر', 'new', '${OLD}', '${OLD}');
  insert into public.rx_requests (id, patient_name, phone, status, created_at) values
    ('RX-OLD-APPR', 'عميل', '${PHONE}', 'approved', '${OLD}'),
    ('RX-OLD-NEW', 'عميل', '${PHONE}', 'new', '${OLD}');
  /* الأساسيات — كلها قديمة، ولازم تعيش كلها */
  insert into public.care_subscriptions (id, name, phone, status, created_at) values
    ('CS-OLD', 'عميل', '${PHONE}', 'cancelled', '${OLD}');
  insert into public.patient_measurements (id, patient_phone, patient_name, sugar, created_at) values
    ('MEAS-OLD', '${PHONE}', 'عميل', 120, '${OLD}');
  insert into public.loyalty_accounts (customer_phone, balance, created_at, updated_at) values
    ('${PHONE}', 300, '${OLD}', '${OLD}');
  insert into public.loyalty_ledger (id, customer_phone, kind, points, order_id, created_at) values
    ('LLE-OLD', '${PHONE}', 'earn', 10, 'ORD-OLD-DEL', '${OLD}');
  insert into public.loyalty_cards (id, customer_phone, code, percent, status, earned_at) values
    ('CARD-OLD', '${PHONE}', 'BH-CARD-OLD', 10, 'used', '${OLD}');
  insert into public.customer_addresses (id, customer_phone, label, address_text, created_at, updated_at) values
    ('ADDR-OLD', '${PHONE}', 'البيت', 'دايروت — تقسيم أبو جبل', '${OLD}', '${OLD}');
  insert into public.warehouse_products (code, barcode, name_ar, sale_price, stock_boxes, sync_key) values
    ('WSEED', 'WSEED', 'صنف مخزن', 10, 5, 'WSEED');
`);
check("seed", "seed data inserted (old/new orders, queues, essentials)", true, "seeded as superuser");

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
const count = async (table, where = "") =>
  Number((await db.query(`select count(*)::int as n from public.${table} ${where}`)).rows[0].n);
const essentialsBefore = {
  care: await count("care_subscriptions"),
  meas: await count("patient_measurements"),
  lacc: await count("loyalty_accounts"),
  lled: await count("loyalty_ledger"),
  lcard: await count("loyalty_cards"),
  addr: await count("customer_addresses"),
  wh: await count("warehouse_products"),
};

/* ================= Phase E: archive probes ================= */
await expectError("archive", "pharmacist preview rejected (admin_only)",
  () => asRole(CLAIMS.pharmacist, () => db.query("select public.archive_preview_counts($1) as c", [CUTOFF])),
  /admin_only/);
await expectError("archive", "pharmacist archive rejected (admin_only)",
  () => asRole(CLAIMS.pharmacist, () => db.query("select public.archive_old_operational_data($1) as c", [CUTOFF])),
  /admin_only/);
await expectError("archive", "patient archive rejected (admin_only)",
  () => asRole(CLAIMS.patient(PHONE), () => db.query("select public.archive_old_operational_data($1) as c", [CUTOFF])),
  /admin_only/);
await expectError("archive", "anon cannot execute archive at all",
  () => asAnon(() => db.query("select public.archive_old_operational_data($1) as c", [CUTOFF])),
  /permission denied|admin_only/);
await expectError("archive", "future cutoff rejected (bad_cutoff)",
  () => asRole(CLAIMS.admin, () => db.query("select public.archive_old_operational_data('2999-01-01T00:00:00Z') as c")),
  /bad_cutoff/);
await expectError("archive", "null cutoff rejected (bad_cutoff)",
  () => asRole(CLAIMS.admin, () => db.query("select public.archive_old_operational_data(null) as c")),
  /bad_cutoff/);

const EXPECT = { orders: 2, courier_collections: 2, courier_ratings: 1, whatsapp_orders: 1, shortage_requests: 1, nursing_requests: 1, rx_requests: 1 };
const countsMatch = (c) =>
  Object.keys(EXPECT).length === Object.keys(c ?? {}).length &&
  Object.entries(EXPECT).every(([k, v]) => c[k] === v);
const preview = await asRole(CLAIMS.admin, async () =>
  (await db.query("select public.archive_preview_counts($1) as c", [CUTOFF])).rows[0].c);
check("archive", "preview counts match the expected deletion set",
  countsMatch(preview), JSON.stringify(preview));
check("archive", "preview deleted nothing (orders still 4)",
  (await count("orders")) === 4, `orders=${await count("orders")}`);

const archived = await asRole(CLAIMS.admin, async () =>
  (await db.query("select public.archive_old_operational_data($1) as c", [CUTOFF])).rows[0].c);
check("archive", "archive returns exactly the previewed counts",
  countsMatch(archived), JSON.stringify(archived));

check("archive", "old terminal orders deleted; old pending + new delivered survive",
  (await count("orders")) === 2 &&
  (await count("orders", "where id = 'ORD-OLD-PEN'")) === 1 &&
  (await count("orders", "where id = 'ORD-NEW-DEL'")) === 1,
  `orders left=${await count("orders")}`);
check("archive", "collections: old-order + old-orphan deleted; new + new-orphan survive",
  (await count("courier_collections")) === 2 &&
  (await count("courier_collections", "where id = 'COL-NEW'")) === 1 &&
  (await count("courier_collections", "where id = 'COL-ORPHAN-NEW'")) === 1,
  `collections left=${await count("courier_collections")}`);
check("archive", "ratings: only the new order's rating survives",
  (await count("courier_ratings")) === 1 && (await count("courier_ratings", "where id = 'CR-NEW'")) === 1,
  `ratings left=${await count("courier_ratings")}`);
check("archive", "whatsapp: old-done deleted; old-sent (open) + new-done survive",
  (await count("whatsapp_orders")) === 2 &&
  (await count("whatsapp_orders", "where id = 'WA-OLD-SENT'")) === 1 &&
  (await count("whatsapp_orders", "where id = 'WA-NEW-DONE'")) === 1,
  `whatsapp left=${await count("whatsapp_orders")}`);
check("archive", "shortages: old-closed deleted; old-pending (open) + new-closed survive",
  (await count("shortage_requests")) === 2 &&
  (await count("shortage_requests", "where id = 'SH-OLD-PEND'")) === 1 &&
  (await count("shortage_requests", "where id = 'SH-NEW-CLOSED'")) === 1,
  `shortages left=${await count("shortage_requests")}`);
check("archive", "nursing: old-done deleted; old-new (open) survives",
  (await count("nursing_requests")) === 1 && (await count("nursing_requests", "where id = 'NR-OLD-NEW'")) === 1,
  `nursing left=${await count("nursing_requests")}`);
check("archive", "rx: old-approved deleted; old-new (open) survives",
  (await count("rx_requests")) === 1 && (await count("rx_requests", "where id = 'RX-OLD-NEW'")) === 1,
  `rx left=${await count("rx_requests")}`);

check("archive", "ESSENTIALS untouched: care/measurements/loyalty x3/addresses/warehouse counts identical",
  (await count("care_subscriptions")) === essentialsBefore.care &&
  (await count("patient_measurements")) === essentialsBefore.meas &&
  (await count("loyalty_accounts")) === essentialsBefore.lacc &&
  (await count("loyalty_ledger")) === essentialsBefore.lled &&
  (await count("loyalty_cards")) === essentialsBefore.lcard &&
  (await count("customer_addresses")) === essentialsBefore.addr &&
  (await count("warehouse_products")) === essentialsBefore.wh,
  JSON.stringify(essentialsBefore));

const archived2 = await asRole(CLAIMS.admin, async () =>
  (await db.query("select public.archive_old_operational_data($1) as c", [CUTOFF])).rows[0].c);
check("archive", "second archive run deletes nothing (all zeros)",
  Object.values(archived2).every((v) => v === 0), JSON.stringify(archived2));

/* ================= Phase F: restore probes ================= */
await expectError("restore", "pharmacist restore rejected (admin_only)",
  () => asRole(CLAIMS.pharmacist, () => db.query("select public.restore_backup_table('shortage_requests', '[]'::jsonb) as n")),
  /admin_only/);
await expectError("restore", "non-whitelisted table rejected (admin_settings)",
  () => asRole(CLAIMS.admin, () => db.query("select public.restore_backup_table('admin_settings', '[{\"id\":\"global\"}]'::jsonb) as n")),
  /table_not_restorable/);
await expectError("restore", "non-array rows rejected (bad_rows)",
  () => asRole(CLAIMS.admin, () => db.query("select public.restore_backup_table('orders', '{}'::jsonb) as n")),
  /bad_rows/);
const emptyRestore = await asRole(CLAIMS.admin, async () =>
  (await db.query("select public.restore_backup_table('orders', '[]'::jsonb) as n")).rows[0].n);
check("restore", "empty rows array restores 0 without error", emptyRestore === 0, `n=${emptyRestore}`);

/* archived shortage row comes back, twice = still one row */
const shRow = [{ id: "SH-OLD-CLOSED", code: "BH-SH1", customer_phone: PHONE, customer_name: "عميل", item_name: "دواء قديم", barcode: null, photo_url: null, source: "manual", status: "closed", created_at: OLD, updated_at: OLD }];
const r1 = await asRole(CLAIMS.admin, async () =>
  (await db.query("select public.restore_backup_table('shortage_requests', $1::jsonb) as n", [JSON.stringify(shRow)])).rows[0].n);
check("restore", "archived shortage row restored (n=1, row present)",
  r1 === 1 && (await count("shortage_requests", "where id = 'SH-OLD-CLOSED'")) === 1, `n=${r1}`);
const r2 = await asRole(CLAIMS.admin, async () =>
  (await db.query("select public.restore_backup_table('shortage_requests', $1::jsonb) as n", [JSON.stringify(shRow)])).rows[0].n);
check("restore", "re-import of the same file is idempotent (n=1, still exactly one row)",
  r2 === 1 && (await count("shortage_requests", "where id = 'SH-OLD-CLOSED'")) === 1,
  `n=${r2}, rows=${await count("shortage_requests", "where id = 'SH-OLD-CLOSED'")}`);

/* loyalty_accounts: no client write policy exists — definer path must work, and upsert must UPDATE */
const laccRow = [{ customer_phone: "01007777777", balance: 120, welcome_granted_at: null, created_at: OLD, updated_at: OLD }];
const r3 = await asRole(CLAIMS.admin, async () =>
  (await db.query("select public.restore_backup_table('loyalty_accounts', $1::jsonb) as n", [JSON.stringify(laccRow)])).rows[0].n);
const bal1 = (await db.query("select balance from public.loyalty_accounts where customer_phone = '01007777777'")).rows[0]?.balance;
check("restore", "loyalty_accounts restored via definer RPC (no client write policy exists)",
  r3 === 1 && Number(bal1) === 120, `n=${r3}, balance=${bal1}`);
const r4 = await asRole(CLAIMS.admin, async () =>
  (await db.query("select public.restore_backup_table('loyalty_accounts', $1::jsonb) as n",
    [JSON.stringify([{ ...laccRow[0], balance: 55 }])])).rows[0].n);
const bal2 = (await db.query("select balance from public.loyalty_accounts where customer_phone = '01007777777'")).rows[0]?.balance;
check("restore", "re-import UPDATES the existing row (true upsert, no duplicate)",
  r4 === 1 && Number(bal2) === 55 && (await count("loyalty_accounts", "where customer_phone = '01007777777'")) === 1,
  `n=${r4}, balance=${bal2}`);

/* orders: identical-row upsert passes the order guard untouched */
const ordRow = (await db.query("select row_to_json(o) as j from public.orders o where o.id = 'ORD-NEW-DEL'")).rows[0].j;
const r5 = await asRole(CLAIMS.admin, async () =>
  (await db.query("select public.restore_backup_table('orders', $1::jsonb) as n", [JSON.stringify([ordRow])])).rows[0].n);
check("restore", "identical order row re-imports cleanly (guard passes, no duplicate)",
  r5 === 1 && (await count("orders", "where id = 'ORD-NEW-DEL'")) === 1, `n=${r5}`);

/* warehouse: keyed by sync_key; null-key rows skipped, re-import idempotent */
const whRows = [
  { code: "W1", barcode: "W1", name_ar: "صنف ١", sale_price: 10, stock_boxes: 3, sync_key: "W1" },
  { code: "W2", barcode: "W2", name_ar: "صنف ٢", sale_price: 20, stock_boxes: 1, sync_key: null },
];
const r6 = await asRole(CLAIMS.admin, async () =>
  (await db.query("select public.restore_backup_table('warehouse_products', $1::jsonb) as n", [JSON.stringify(whRows)])).rows[0].n);
const r7 = await asRole(CLAIMS.admin, async () =>
  (await db.query("select public.restore_backup_table('warehouse_products', $1::jsonb) as n", [JSON.stringify(whRows)])).rows[0].n);
check("restore", "warehouse restore keys on sync_key, skips null-key rows, idempotent on re-import",
  r6 === 1 && r7 === 1 &&
  (await count("warehouse_products", "where sync_key = 'W1'")) === 1 &&
  (await count("warehouse_products", "where code = 'W2'")) === 0,
  `first=${r6}, second=${r7}`);

/* layer-2 guard bypass is restore-only: 5 open rows exist-check */
const GP = "01005555555";
await db.exec(`
  insert into public.whatsapp_orders (id, code, customer_phone, customer_name, items, total, status, created_at, updated_at) values
    ('WA-G1', 'BH-G1', '${GP}', 'عميل', '[]', 1, 'sent', '${NEW}', '${NEW}'),
    ('WA-G2', 'BH-G2', '${GP}', 'عميل', '[]', 1, 'sent', '${NEW}', '${NEW}'),
    ('WA-G3', 'BH-G3', '${GP}', 'عميل', '[]', 1, 'sent', '${NEW}', '${NEW}'),
    ('WA-G4', 'BH-G4', '${GP}', 'عميل', '[]', 1, 'sent', '${NEW}', '${NEW}'),
    ('WA-G5', 'BH-G5', '${GP}', 'عميل', '[]', 1, 'sent', '${NEW}', '${NEW}');
`);
await expectError("restore", "control: a DIRECT 6th open whatsapp insert is rejected by the layer-2 guard",
  () => db.query(`insert into public.whatsapp_orders (id, code, customer_phone, items, total, status)
                  values ('WA-G6', 'BH-G6', '${GP}', '[]', 1, 'sent')`),
  /too_many_open_requests/);
const waRow = [{ id: "WA-G6", code: "BH-G6", customer_phone: GP, customer_name: "عميل", items: [], total: 1, status: "sent", created_at: NEW, updated_at: NEW }];
const r8 = await asRole(CLAIMS.admin, async () =>
  (await db.query("select public.restore_backup_table('whatsapp_orders', $1::jsonb) as n", [JSON.stringify(waRow)])).rows[0].n);
check("restore", "the same 6th open row RESTORES via the admin RPC (guard bypassed inside restore only)",
  r8 === 1 && (await count("whatsapp_orders", "where id = 'WA-G6'")) === 1, `n=${r8}`);
await expectError("restore", "guard is armed again after the restore (direct insert still rejected)",
  () => db.query(`insert into public.whatsapp_orders (id, code, customer_phone, items, total, status)
                  values ('WA-G7', 'BH-G7', '${GP}', '[]', 1, 'sent')`),
  /too_many_open_requests/);

/* ================= summary ================= */
const failed = results.filter((r) => !r.pass);
fs.writeFileSync(
  path.join(QA_DIR, "data-archive-results.json"),
  JSON.stringify({ at: new Date().toISOString(), chainBroken, total: results.length, failed: failed.length, results }, null, 2)
);
console.log(`\n==== DATA ARCHIVE QA: ${results.length - failed.length}/${results.length} passed ====`);
if (failed.length > 0) process.exit(1);
