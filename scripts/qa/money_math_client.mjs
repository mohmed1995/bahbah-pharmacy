/**
 * QA BATTERY 2 (client half) — faithful port of the CLIENT totals logic in
 * store.ts placeOrder (read line-by-line at QA time) + data.ts loyalty helpers,
 * run against the same scenario table as the server battery. The server values
 * below are the ACTUAL outputs recorded from real place_order execution on
 * Postgres (migration_dry_run.mjs). Any client/server divergence is reported.
 *
 * Ported rules (store.ts placeOrder, data.ts):
 *  subtotal = Σ price*qty
 *  coupon (normalized code, active): discount = subtotal>=minTotal ? round(subtotal*pct/100) : 0
 *  else own active loyalty card (code match): discount = round(subtotal*pct/100)   [no min]
 *  fee: pickup -> slotExtra(0); delivery: campaign||loyaltyFreeShip ? 0+slotExtra : zoneFee+slotExtra
 *  loyaltyFreeShip = eligible(level perk free_delivery | careMember | active careSub)
 *                    && (freeRemaining === null || freeRemaining > 0)
 *  total = max(0, subtotal - discount) + fee
 */
const TIERS = [
  { id: "lvl1", minPoints: 0, perk: "none" },
  { id: "lvl2", minPoints: 500, perk: "none" },
  { id: "lvl3", minPoints: 1000, perk: "discount_card_10" },
  { id: "lvl4", minPoints: 1500, perk: "free_delivery" },
];
const COUPONS = [
  { code: "BAHBAH10", percent: 10, minTotal: 200, active: true },
  { code: "BAHBAH20", percent: 20, minTotal: 500, active: true },
  { code: "DEIROUT15", percent: 15, minTotal: 300, active: true },
];
function levelFor(balance) { let cur = TIERS[0]; for (const t of TIERS) if (balance >= t.minPoints) cur = t; return cur; }
function freeShipApplies(loyalty, careActive) {
  const eligible = (loyalty && levelFor(loyalty.balance).perk === "free_delivery") || !!loyalty?.careMember || careActive;
  if (!eligible) return false;
  const rem = loyalty && typeof loyalty.freeRemaining === "number" ? loyalty.freeRemaining : null;
  return rem === null || rem > 0;
}
function clientTotals({ items, zoneFee = 20, slotExtra = 0, deliveryType = "delivery", couponCode = null, loyalty = null, careActive = false, campaign = false }) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const norm = couponCode ? couponCode.trim().toUpperCase() : null;
  const coupon = norm ? COUPONS.find((c) => c.code === norm && c.active) : undefined;
  const card = !coupon && loyalty?.card && loyalty.card.status === "active" && norm && loyalty.card.code.toUpperCase() === norm ? loyalty.card : null;
  const discount = coupon ? (subtotal >= coupon.minTotal ? Math.round((subtotal * coupon.percent) / 100) : 0)
    : card ? Math.round((subtotal * card.percent) / 100) : 0;
  const slot = deliveryType === "delivery" ? slotExtra : 0;
  const lfs = deliveryType === "delivery" && freeShipApplies(loyalty, careActive);
  const fee = deliveryType === "pickup" ? 0 + slot : campaign || lfs ? 0 + slot : zoneFee + slot;
  return { subtotal, discount, delivery_fee: fee, total: Math.max(0, subtotal - discount) + fee };
}

const P1 = { price: 100 }, P2 = { price: 50 }, P3 = { price: 155 };
const cardActive = { code: "BBH-QACARD", percent: 10, status: "active" };
const scenarios = [
  ["C1 = S1 plain", { items: [{ ...P1, qty: 2 }] }, { subtotal: 200, discount: 0, delivery_fee: 20, total: 220 }],
  ["C2 = S2 slot premium", { items: [{ ...P1, qty: 2 }], slotExtra: 15 }, { subtotal: 200, discount: 0, delivery_fee: 35, total: 235 }],
  ["C3 = S3 pickup", { items: [{ ...P1, qty: 2 }], deliveryType: "pickup" }, { subtotal: 200, discount: 0, delivery_fee: 0, total: 200 }],
  ["C4 = S4 coupon at min", { items: [{ ...P1, qty: 2 }], couponCode: "BAHBAH10" }, { subtotal: 200, discount: 20, delivery_fee: 20, total: 200 }],
  ["C5 = S5 coupon below min", { items: [{ ...P1, qty: 1 }], couponCode: "BAHBAH10" }, { subtotal: 100, discount: 0, delivery_fee: 20, total: 120 }],
  ["C6 = S7a campaign + slot", { items: [{ ...P1, qty: 2 }], slotExtra: 15, campaign: true }, { subtotal: 200, discount: 0, delivery_fee: 15, total: 215 }],
  ["C7 = S7b campaign no slot", { items: [{ ...P1, qty: 2 }], campaign: true }, { subtotal: 200, discount: 0, delivery_fee: 0, total: 200 }],
  ["C8 = S8 own card", { items: [{ ...P1, qty: 2 }], couponCode: "BBH-QACARD", loyalty: { balance: 1000, card: cardActive, careMember: false } }, { subtotal: 200, discount: 20, delivery_fee: 20, total: 200 }],
  ["C9 = S9 used card", { items: [{ ...P1, qty: 2 }], couponCode: "BBH-QACARD", loyalty: { balance: 1000, card: { ...cardActive, status: "used" }, careMember: false } }, { subtotal: 200, discount: 0, delivery_fee: 20, total: 220 }],
  ["C10 = S6 rounding via card", { items: [{ ...P3, qty: 1 }], couponCode: "BBH-QACARD", loyalty: { balance: 1000, card: cardActive, careMember: false } }, { subtotal: 155, discount: 16, delivery_fee: 20, total: 159 }],
  ["C11 = S11 top tier, quota left", { items: [{ ...P1, qty: 2 }], loyalty: { balance: 1500, card: null, careMember: false, freeQuota: 4, freeUsed: 0, freeRemaining: 4 } }, { subtotal: 200, discount: 0, delivery_fee: 0, total: 200 }],
  ["C12 = S12b quota exhausted", { items: [{ ...P1, qty: 2 }], loyalty: { balance: 1500, card: null, careMember: false, freeQuota: 1, freeUsed: 1, freeRemaining: 0 } }, { subtotal: 200, discount: 0, delivery_fee: 20, total: 220 }],
  ["C13 = S13 care member", { items: [{ ...P1, qty: 2 }], loyalty: { balance: 0, card: null, careMember: true, freeQuota: 4, freeUsed: 0, freeRemaining: 4 }, careActive: true }, { subtotal: 200, discount: 0, delivery_fee: 0, total: 200 }],
  ["C14 = S14 campaign + loyalty", { items: [{ ...P1, qty: 2 }], campaign: true, loyalty: { balance: 1500, card: null, careMember: false, freeQuota: 4, freeUsed: 1, freeRemaining: 3 } }, { subtotal: 200, discount: 0, delivery_fee: 0, total: 200 }],
  ["C15 typed-lowercase coupon normalized", { items: [{ ...P1, qty: 2 }], couponCode: "bahbah10" }, { subtotal: 200, discount: 20, delivery_fee: 20, total: 200 }],
];

let pass = 0, fail = 0;
for (const [name, input, expected] of scenarios) {
  const got = clientTotals(input);
  const ok = ["subtotal", "discount", "delivery_fee", "total"].every((k) => got[k] === expected[k]);
  console.log(`${ok ? "✅" : "❌"} [money-client] ${name} — client=${JSON.stringify(got)} server=${JSON.stringify(expected)}`);
  ok ? pass++ : fail++;
}
console.log(`\nmoney-client: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
