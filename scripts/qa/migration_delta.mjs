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
  "upgrade-2026-11-19-integrity-fixes.sql",
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


/* ================= DELTA Phase G: integrity-fixes, post-repair ================= */
// Repaired 2026-11-19: the truncation-marker line is gone, the truncated comment
// is completed, and admin_loyalty_set_card_status is defined at the file's tail.
const rawIntegrity = fs.readFileSync(path.join(SQL_DIR, "upgrade-2026-11-19-integrity-fixes.sql"), "utf8");
const junkLines = rawIntegrity.split("\n").filter((l) => l.includes("[truncated"));
check("delta-migration", "post-repair: integrity file contains NO truncation-marker line",
  junkLines.length === 0, `junk lines: ${JSON.stringify(junkLines)}`);
const csuAfterChain = (await db.query("select 1 from pg_proc where proname = 'care_self_update'")).rows.length > 0;
check("delta-migration", "post-repair: the chain run itself installs integrity-fixes (care_self_update present)",
  csuAfterChain, `care_self_update exists after chain: ${csuAfterChain}`);
try {
  await db.exec(rawIntegrity);
  check("delta-migration", "post-repair: re-executing the repaired integrity file is clean (idempotent)", true, "no error");
} catch (e) {
  check("delta-migration", "post-repair: re-executing the repaired integrity file is clean (idempotent)", false, (e.message || String(e)).slice(0, 300));
}

/* ================= DELTA Phase H: introspection of the new objects ================= */
const csu = (await db.query("select prosecdef, coalesce(proacl::text, '') as acl from pg_proc where proname = 'care_self_update'")).rows[0];
check("delta-introspection", "care_self_update exists and is SECURITY DEFINER", !!csu && csu.prosecdef === true, csu ? `acl=${csu.acl}` : "missing");
check("delta-introspection", "care_self_update: EXECUTE granted to authenticated only (not anon, not PUBLIC)",
  !!csu && csu.acl.includes("authenticated=") && !csu.acl.includes("anon=") && !/(^|,)={1}[A-Z]/.test(csu.acl),
  csu ? `acl=${csu.acl}` : "missing");
const csuSrc = await procSrc("care_self_update");
check("delta-introspection", "care_self_update source: phone-digit matching + status whitelist present",
  csuSrc.includes("regexp_replace") && csuSrc.includes("'active'") && csuSrc.includes("'paused'") && csuSrc.includes("'cancelled'") && csuSrc.includes("bad_status"),
  "pg_proc source");
const pol = (await db.query("select qual, with_check from pg_policies where policyname = 'settings_admin_write' and tablename = 'admin_settings'")).rows[0];
check("delta-introspection", "settings_admin_write policy widened: admin OR has_permission('settings') in USING and WITH CHECK",
  !!pol && pol.qual.includes("has_permission") && pol.qual.includes("settings") && pol.with_check.includes("has_permission"),
  pol ? `qual=${pol.qual}` : "policy missing");
const drvCol = (await db.query("select 1 from information_schema.columns where table_schema='public' and table_name='admin_settings' and column_name='driver_removed'")).rows.length;
check("delta-introspection", "admin_settings.driver_removed column exists", drvCol === 1, `found=${drvCol}`);
const gps2 = (await db.query("select public.get_public_settings() as s")).rows[0].s;
const gps2Keys = Object.keys(gps2);
check("delta-introspection", "get_public_settings still returns all keys, now incl. driver_removed (>=19 keys)",
  gps2Keys.includes("driver_removed") && gps2Keys.length >= 19, `${gps2Keys.length} keys: ${gps2Keys.join(",")}`);
const cardConstraint = (await db.query("select pg_get_constraintdef(oid) as def from pg_constraint where conname = 'loyalty_cards_status_check'")).rows[0]?.def ?? "";
check("delta-introspection", "loyalty_cards status constraint widened to include 'voided'", cardConstraint.includes("voided"), cardConstraint);
for (const fn of ["admin_loyalty_lookup", "admin_loyalty_adjust"]) {
  const row = (await db.query("select prosecdef from pg_proc where proname = $1", [fn])).rows[0];
  check("delta-introspection", `${fn} exists and is SECURITY DEFINER`, !!row && row.prosecdef === true, row ? "definer" : "MISSING");
}
const scs = (await db.query("select 1 from pg_proc where proname = 'admin_loyalty_set_card_status'")).rows.length;
check("delta-introspection", "admin_loyalty_set_card_status is defined (client calls it at supabase.ts:1682)", scs === 1,
  scs ? "defined" : "MISSING — repair incomplete");
const resolveAcl = (await db.query("select coalesce(proacl::text, '') as acl from pg_proc where proname = 'loyalty_resolve_phone'")).rows[0]?.acl ?? "";
check("delta-introspection", "loyalty_resolve_phone is internal: no EXECUTE for authenticated/PUBLIC", !resolveAcl.includes("authenticated=") && !/(^|,)={1}[A-Z]/.test(resolveAcl), `acl=${resolveAcl || "(owner only)"}`);

/* ================= DELTA Phase I: behavioral probes ================= */
async function asRole(claims, fn) {
  await setClaims(claims);
  await db.exec("set role authenticated");
  try { return await fn(); } finally { await db.exec("reset role"); }
}
// ---- D1: care_self_update ----
await db.exec(`
  insert into public.care_subscriptions (id, phone, status, day_pref) values
    ('D-CARE-A', '01000000011', 'active', 5),
    ('D-CARE-B', '01000000012', 'active', 7)
  on conflict (id) do nothing;
`);
const careState = async (id) => (await db.query("select status, day_pref from public.care_subscriptions where id = $1", [id])).rows[0];
const isMember = async (phone) => (await db.query("select public.loyalty_is_care_member($1) as m", [phone])).rows[0].m;
check("D1", "before: active sub A counts as care member (free-delivery eligible)", (await isMember("01000000011")) === true, "loyalty_is_care_member");
await asRole(CLAIMS.patient("01000000011"), async () => {
  await db.query("select public.care_self_update('paused', null)");
});
let a = await careState("D-CARE-A"); let b = await careState("D-CARE-B");
check("D1", "patient A pauses OWN sub via care_self_update; patient B's row untouched",
  a.status === "paused" && b.status === "active" && b.day_pref === 7, `A=${JSON.stringify(a)} B=${JSON.stringify(b)}`);
await asRole(CLAIMS.patient("01000000011"), async () => {
  await db.query("select public.care_self_update(null, 15)");
});
a = await careState("D-CARE-A");
check("D1", "patient A changes box day (previously had NO server write at all)", a.day_pref === 15 && a.status === "paused", JSON.stringify(a));
await asRole(CLAIMS.patient("01000000011"), async () => {
  await db.query("select public.care_self_update('active', null)");
});
a = await careState("D-CARE-A");
check("D1", "patient A resumes own sub", a.status === "active", JSON.stringify(a));
await expectError("D1", "invalid status rejected", () =>
  asRole(CLAIMS.patient("01000000011"), () => db.query("select public.care_self_update('bogus', null)")), /bad_status/);
await expectError("D1", "day_pref out of range rejected", () =>
  asRole(CLAIMS.patient("01000000011"), () => db.query("select public.care_self_update(null, 32)")), /bad_day_pref/);
await expectError("D1", "no-identity session rejected", () =>
  asRole({ sub: SUB }, () => db.query("select public.care_self_update('paused', null)")), /no_identity/);
await db.exec("set role anon");
await expectError("D1", "anon cannot EXECUTE care_self_update (grant is authenticated-only)", () =>
  db.query("select public.care_self_update('paused', null)"), /permission denied/);
await db.exec("reset role");
await asRole(CLAIMS.patient("01000000011"), async () => {
  await db.query("select public.care_self_update('cancelled', null)");
});
a = await careState("D-CARE-A");
check("D1", "patient A cancels own sub — and it PERSISTS server-side (the original D1 defect)", a.status === "cancelled", JSON.stringify(a));
check("D1", "cancelled sub no longer counts for loyalty_is_care_member; B (active) still does",
  (await isMember("01000000011")) === false && (await isMember("01000000012")) === true, "eligibility flip verified");
// eligibility at the money layer: place_order must charge A the fee and waive B's
await db.exec(`
  insert into public.products (id, price, stock) values ('QA-P1', 100, null)
  on conflict (id) do update set price = excluded.price, stock = excluded.stock;
  insert into public.delivery_zones (id, fee) values ('qa-zone', 20)
  on conflict (id) do update set fee = excluded.fee;
  update public.admin_settings set settings = '{}'::jsonb where id = 'global';
`);
async function place(payload) {
  const r = await db.query("select public.place_order($1::jsonb) as r", [JSON.stringify(payload)]);
  return r.rows[0].r;
}
const base = { deliveryType: "delivery", payment: "cod", name: "QA", address: "x", zoneId: "qa-zone",
  items: [{ productId: "QA-P1", qty: 2, nameAr: "a", nameEn: "a" }] };
let r = await place({ ...base, id: "D-ORD-A1", phone: "01000000011" });
check("D1", "money layer: cancelled member A pays full delivery fee again", r.delivery_fee === 20 && r.total === 220, JSON.stringify(r));
r = await place({ ...base, id: "D-ORD-B1", phone: "01000000012" });
check("D1", "money layer (control): active member B still gets the waiver", r.delivery_fee === 0 && r.total === 200, JSON.stringify(r));

// ---- D2: settings write gate ----
await asRole(CLAIMS.pharmacist, async () => {
  const perm = (await db.query("select public.has_permission('settings') p")).rows[0].p;
  const upd = await db.query("update public.admin_settings set settings = settings where id = 'global' returning id");
  check("D2", "pharmacist WITHOUT 'settings' grant: still blocked from admin_settings writes", perm === false && upd.rows.length === 0,
    `perm=${perm} updated=${upd.rows.length}`);
});
await db.exec(`insert into public.staff_permissions (user_email, permissions) values ('pharm@bahbah.eg', '{"settings": true}'::jsonb)
  on conflict (user_email) do update set permissions = excluded.permissions;`);
await asRole(CLAIMS.pharmacist, async () => {
  const perm = (await db.query("select public.has_permission('settings') p")).rows[0].p;
  const upd = await db.query("update public.admin_settings set settings = settings where id = 'global' returning id");
  check("D2", "pharmacist WITH the manager-granted 'settings' permission: write allowed (restock/prices can persist)",
    perm === true && upd.rows.length === 1, `perm=${perm} updated=${upd.rows.length}`);
});
await asRole(CLAIMS.admin, async () => {
  const upd = await db.query("update public.admin_settings set settings = settings where id = 'global' returning id");
  check("D2", "admin: settings write still allowed", upd.rows.length === 1, `updated=${upd.rows.length}`);
});

// ---- Admin loyalty RPCs ----
await db.exec(`
  insert into public.loyalty_accounts (customer_phone, balance) values ('01000000021', 600)
  on conflict (customer_phone) do update set balance = excluded.balance;
  insert into public.loyalty_cards (id, customer_phone, code, percent, status, earned_at) values
    ('LC-D1', '01000000021', 'BBH-DELTA1', 10, 'active', now())
  on conflict (id) do nothing;
`);
await expectError("loyalty-admin", "pharmacist: admin_loyalty_lookup raises admin_only", () =>
  asRole(CLAIMS.pharmacist, () => db.query("select public.admin_loyalty_lookup('01000000021')")), /admin_only/);
await expectError("loyalty-admin", "pharmacist: admin_loyalty_adjust raises admin_only", () =>
  asRole(CLAIMS.pharmacist, () => db.query("select public.admin_loyalty_adjust('01000000021', 10, null)")), /admin_only/);
await expectError("loyalty-admin", "patient: admin_loyalty_lookup raises admin_only", () =>
  asRole(CLAIMS.patient("01000000021"), () => db.query("select public.admin_loyalty_lookup('01000000021')")), /admin_only/);
await db.exec("set role anon");
await expectError("loyalty-admin", "anon: EXECUTE on admin_loyalty_lookup denied (revoked)", () =>
  db.query("select public.admin_loyalty_lookup('01000000021')"), /permission denied/);
await db.exec("reset role");
await asRole(CLAIMS.admin, async () => {
  const lk = (await db.query("select public.admin_loyalty_lookup('01000000021') as r")).rows[0].r;
  check("loyalty-admin", "admin lookup: found, balance + latest card reported",
    lk.found === true && lk.balance === 600 && lk.card_code === "BBH-DELTA1" && lk.card_status === "active", JSON.stringify(lk));
  const nf = (await db.query("select public.admin_loyalty_lookup('01099999999') as r")).rows[0].r;
  check("loyalty-admin", "admin lookup: unknown phone returns found=false (no throw)", nf.found === false, JSON.stringify(nf));
  const nb = (await db.query("select public.admin_loyalty_adjust('01000000021', 50, 'QA delta') as b")).rows[0].b;
  const led = (await db.query("select count(*)::int c from public.loyalty_ledger where customer_phone = '01000000021' and kind = 'adjust'")).rows[0].c;
  check("loyalty-admin", "admin adjust +50: returns new balance 650 and writes an audited 'adjust' ledger row",
    nb === 650 && led === 1, `balance=${nb} adjustRows=${led}`);
  const nb2 = (await db.query("select public.admin_loyalty_adjust('01000000021', -50, null) as b")).rows[0].b;
  check("loyalty-admin", "admin adjust -50: balance back to 600 (via loyalty_credit, no back door)", nb2 === 600, `balance=${nb2}`);
});
await expectError("loyalty-admin", "admin adjust: unknown account rejected", () =>
  asRole(CLAIMS.admin, () => db.query("select public.admin_loyalty_adjust('01099999999', 10, null)")), /account_not_found/);
await expectError("loyalty-admin", "admin adjust: zero delta rejected", () =>
  asRole(CLAIMS.admin, () => db.query("select public.admin_loyalty_adjust('01000000021', 0, null)")), /bad_delta/);
// ---- admin_loyalty_set_card_status (repaired tail of integrity-fixes) ----
// Client contract (supabase.ts adminLoyaltySetCardStatusInSupabase): (p_phone, p_status)
// -> boolean, true ONLY when a card's status actually changed.
await db.exec(`
  insert into public.loyalty_accounts (customer_phone, balance) values ('01000000022', 100)
  on conflict (customer_phone) do update set balance = excluded.balance;
  insert into public.loyalty_cards (id, customer_phone, code, percent, status, earned_at) values
    ('LC-D2', '01000000022', 'BBH-DELTA2', 10, 'used', now())
  on conflict (id) do nothing;
`);
const cardStatus = async (code) =>
  (await db.query("select status from public.loyalty_cards where code = $1", [code])).rows[0].status;
await expectError("loyalty-admin", "pharmacist: admin_loyalty_set_card_status raises admin_only", () =>
  asRole(CLAIMS.pharmacist, () => db.query("select public.admin_loyalty_set_card_status('01000000021', 'voided')")), /admin_only/);
await expectError("loyalty-admin", "patient: admin_loyalty_set_card_status raises admin_only", () =>
  asRole(CLAIMS.patient("01000000021"), () => db.query("select public.admin_loyalty_set_card_status('01000000021', 'voided')")), /admin_only/);
await db.exec("set role anon");
await expectError("loyalty-admin", "anon: EXECUTE on admin_loyalty_set_card_status denied (revoked)", () =>
  db.query("select public.admin_loyalty_set_card_status('01000000021', 'voided')"), /permission denied/);
await db.exec("reset role");
await asRole(CLAIMS.admin, async () => {
  const v1 = (await db.query("select public.admin_loyalty_set_card_status('01000000021', 'voided') as r")).rows[0].r;
  check("loyalty-admin", "admin voids an active card: returns true, status now voided",
    v1 === true && (await cardStatus("BBH-DELTA1")) === "voided", `ret=${v1} status=${await cardStatus("BBH-DELTA1")}`);
  const v2 = (await db.query("select public.admin_loyalty_set_card_status('01000000021', 'voided') as r")).rows[0].r;
  check("loyalty-admin", "re-voiding an already-voided card: returns false (no change)",
    v2 === false && (await cardStatus("BBH-DELTA1")) === "voided", `ret=${v2}`);
  const v3 = (await db.query("select public.admin_loyalty_set_card_status('01000000021', 'active') as r")).rows[0].r;
  check("loyalty-admin", "admin reactivates the voided card: returns true, status now active",
    v3 === true && (await cardStatus("BBH-DELTA1")) === "active", `ret=${v3} status=${await cardStatus("BBH-DELTA1")}`);
  const v4 = (await db.query("select public.admin_loyalty_set_card_status('01000000022', 'voided') as r")).rows[0].r;
  check("loyalty-admin", "a USED card is never touched: returns false, status stays used",
    v4 === false && (await cardStatus("BBH-DELTA2")) === "used", `ret=${v4} status=${await cardStatus("BBH-DELTA2")}`);
});
await expectError("loyalty-admin", "admin set_card_status: invalid status rejected", () =>
  asRole(CLAIMS.admin, () => db.query("select public.admin_loyalty_set_card_status('01000000021', 'used')")), /bad_status/);
await expectError("loyalty-admin", "admin set_card_status: unknown account rejected", () =>
  asRole(CLAIMS.admin, () => db.query("select public.admin_loyalty_set_card_status('01099999999', 'voided')")), /account_not_found/);

/* ================= summary ================= */
const failed = results.filter((x) => !x.pass);
const byBattery = {};
for (const x of results) {
  byBattery[x.battery] ??= { pass: 0, fail: 0 };
  byBattery[x.battery][x.pass ? "pass" : "fail"]++;
}
console.log("\n================ QA DELTA DRY-RUN SUMMARY ================");
for (const [b, c] of Object.entries(byBattery)) console.log(`${b}: ${c.pass} passed, ${c.fail} failed`);
console.log(`TOTAL: ${results.length - failed.length}/${results.length} passed`);
if (chainBroken) console.log("NOTE: migration chain had failures — downstream results may cascade.");
fs.writeFileSync(path.join(QA_DIR, "qa-delta-results.json"), JSON.stringify({ at: new Date().toISOString(), chainBroken, byBattery, results }, null, 2));
await db.close();
process.exit(failed.length ? 1 : 0);
