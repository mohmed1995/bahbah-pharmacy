/**
 * QA BATTERY 6 — error-path spot checks (code-level simulation of the failure
 * surfaces fixed in the wiring pass). Each check asserts the exact behavior the
 * fix promised, with the source line as evidence:
 *  E1 settings save failure  -> server fn returns false; store reverts + error toast
 *  E2 order status failure   -> server fn returns false; store does NOT move the
 *                               order locally; error toast fires
 *  E3 dashboard fetch failure-> fetch returns {error}; store sets error state;
 *                               DashboardSyncBar renders banner + retry; mounted
 *                               on BOTH Overview and Reports
 *  E4 courier collection     -> deliver returns the real server result (no fake ok)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");
const supabaseTs = read("src/lib/supabase.ts");
const storeTs = read("src/lib/bahbah/store.ts");
const adminUi = read("src/components/bahbah/admin-ui.tsx");
const adminTsx = read("src/components/bahbah/admin.tsx");
const insights = read("src/components/bahbah/admin-insights.tsx");

let pass = 0, fail = 0;
function check(name, ok, evidence) {
  console.log(`${ok ? "✅" : "❌"} [error-path] ${name}${evidence ? ` — ${evidence}` : ""}`);
  ok ? pass++ : fail++;
}
const has = (text, re) => re.test(text);

// E1a: sync fn is boolean-returning with an explicit false path
check("E1a syncAdminSettingsToSupabase: Promise<boolean> + return false on error",
  has(supabaseTs, /export async function syncAdminSettingsToSupabase[\s\S]{0,400}?Promise<boolean>/) &&
  has(supabaseTs, /catch \{[\s\S]{0,120}?return false;/));
// E1b: store awaits it, reverts patched keys, toasts on failure
// (real shape: syncAdminSettingsToSupabase({ settings: next }); per-key revert
// loop from `prev`; notifySettingsSaveFailed() with no args)
check("E1b store.updateSettings awaits + reverts patched keys + failure toast",
  has(storeTs, /const ok = await syncAdminSettingsToSupabase\(\{ settings: next \}\)/) &&
  has(storeTs, /\(reverted as Record<string, unknown>\)\[k\] = prev\[k\]/) &&
  has(storeTs, /set\(\{ settings: reverted \}\)/) &&
  has(storeTs, /notifySettingsSaveFailed\(\);[\s\S]{0,40}?return false;/));
// E2a: order-status fn boolean with false paths (error branch + catch)
check("E2a updateOrderStatusInSupabase: Promise<boolean> + return false on error",
  has(supabaseTs, /export async function updateOrderStatusInSupabase\([\s\S]{0,200}?Promise<boolean>/) &&
  has(supabaseTs, /console\.warn\("Supabase updateOrder error:", error\.message\);[\s\S]{0,30}?return false;/));
// E2b: adminAdvance awaits BEFORE the local set, and toasts on !ok
{
  const adv = storeTs.slice(storeTs.indexOf("adminAdvance: async"));
  const awaitIdx = adv.indexOf("await updateOrderStatusInSupabase");
  const setIdx = adv.indexOf("set({\n          adminOrders");
  check("E2b adminAdvance: server await precedes local move; !ok -> toast + return false",
    awaitIdx > -1 && setIdx > awaitIdx && has(adv.slice(0, 2600), /if \(!ok\) \{[\s\S]{0,80}?notifyOrderSaveFailed\(\);[\s\S]{0,40}?return false;/));
}
// E3a: detailed fetch returns an error shape instead of swallowing
// (real shape: { orders: null, error: error.message } / success { orders, error: null })
check("E3a fetchOrdersDetailedFromSupabase returns {orders} | {orders:null, error}",
  has(supabaseTs, /fetchOrdersDetailedFromSupabase\(\): Promise<\s*\{ orders: Order\[\]; error: null \} \| \{ orders: null; error: string \}/) &&
  has(supabaseTs, /return \{ orders: null, error: error\.message \};/));
// E3b: store records the error state
check("E3b refreshDashboardData sets dashSyncStatus:'error' + dashSyncError",
  has(storeTs, /dashSyncStatus: "error", dashSyncError: res\.error/));
// E3c: sync bar renders the error banner with the server message + retry wiring
check("E3c DashboardSyncBar: error banner + message + refresh-on-click",
  has(adminUi, /status === "error"/) && has(adminUi, /تعذّرت مزامنة بيانات الأداء/) &&
  has(adminUi, /await refreshDashboardData\(\)/) && has(adminUi, /\{error \? <span/));
// E3d: mounted on both performance screens
check("E3d DashboardSyncBar mounted in admin.tsx (Overview) AND admin-insights.tsx (Reports)",
  has(adminTsx, /<DashboardSyncBar \/>/) && has(insights, /<DashboardSyncBar \/>/));
// E3e: real CSV export (not a fake toast) — Blob + download anchor
check("E3e Reports export builds a real CSV download",
  has(insights, /new Blob\(\[csv\]/) && has(insights, /setAttribute\("download", `bahbah_orders_/));
// E4: courier flow — collection insert is awaited; a real failure aborts the
// delivery with an error toast; a duplicate is treated as already-recorded;
// the final result is courierDeliver's genuine boolean, which itself awaits
// the server status write before any local move / success signal.
check("E4 courierDeliverWithCollection: awaited collection, abort-on-failure, real result",
  has(storeTs, /if \(!row && !alreadyRecorded\) \{[\s\S]{0,400}?return false;/) &&
  has(storeTs, /return get\(\)\.courierDeliver\(orderId\);/) &&
  has(storeTs, /courierDeliver: async \(orderId\) => \{[\s\S]{0,700}?const ok = await updateOrderStatusInSupabase\(orderId, \{ status: "delivered", payment_status: "paid" \}\);[\s\S]{0,120}?if \(!ok\) \{[\s\S]{0,60}?notifyOrderSaveFailed\(\);[\s\S]{0,40}?return false;/));

console.log(`\nerror-path: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
