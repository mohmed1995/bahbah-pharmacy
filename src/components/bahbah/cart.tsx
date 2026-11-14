"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  ChevronRight,
  CheckCircle2,
  Truck,
  PartyPopper,
  User,
  MapPin,
  Phone,
  Store,
  Clock,
  BadgeCheck,
  TicketPercent,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getProduct,
  products,
  SHIPPING_FEE,
  deliverySlots,
  slotById,
  driverById,
  BRANCH,
  type Order,
  type DeliveryZone,
} from "@/lib/bahbah/data";
import { useBahbah, useT, useZones, effStock } from "@/lib/bahbah/store";
import { IconScooter, IconStorefront, IconClockFast, IconPin, IconWallet, IconPlus, IconWhatsapp } from "./icons";
import { fmtPrice } from "./product-card";
import Reveal from "./reveal";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Cart page — packshots + free-shipping progress + coupon + savings   */
/* ------------------------------------------------------------------ */
export function CartView() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const cart = useBahbah((s) => s.cart);
  const appliedCoupon = useBahbah((s) => s.appliedCoupon);
  const coupons = useBahbah((s) => s.coupons);
  const favorites = useBahbah((s) => s.favorites);
  const stockAdj = useBahbah((s) => s.stockAdj);
  /* عتبة التوصيل المجاني — بيتظبط من لوحة الإدارة */
  const freeGoal = Math.max(0, useBahbah((s) => s.settings.freeThreshold));
  const { setQty, removeFromCart, go, addToCart, applyCoupon, clearCoupon, openProduct } = useBahbah();
  const [code, setCode] = useState("");

  const lines = cart.map((c) => ({ ...c, p: getProduct(c.productId)! })).filter((l) => l.p);
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const savings = lines.reduce(
    (s, l) => s + (l.p.oldPrice ? (l.p.oldPrice - l.p.price) * l.qty : 0),
    0
  );
  const coupon = coupons.find((c) => c.code === appliedCoupon && c.active);
  const discount = coupon && subtotal >= coupon.minTotal ? Math.round((subtotal * coupon.percent) / 100) : 0;
  const threshold = freeGoal > 0 ? freeGoal : Infinity;
  const shipping = subtotal === 0 || subtotal >= threshold ? 0 : SHIPPING_FEE;
  const remaining = Math.max(0, (freeGoal || Infinity) - subtotal);
  const progress = freeGoal > 0 ? Math.min(100, Math.round((subtotal / freeGoal) * 100)) : 100;

  /* suggested add-ons — same categories as cart items, not already in cart */
  const inCart = new Set(cart.map((c) => c.productId));
  const cats = new Set(lines.map((l) => l.p.category));
  const pool = products.filter(
    (p) => !inCart.has(p.id) && (cats.has(p.category) || favorites.includes(p.id))
  );
  const fallbackP = products.filter((p) => !inCart.has(p.id) && p.tags?.includes("best"));
  const suggestions = (pool.length >= 3 ? pool : [...pool, ...fallbackP]).slice(0, 4);

  if (lines.length === 0) {
    return (
      <main className="flex flex-col items-center gap-4 py-24 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-muted">
          <ShoppingCart className="size-9 text-muted-foreground" />
        </div>
        <h2 className="font-heading text-2xl font-black">{t("cart.empty")}</h2>
        <p className="text-sm text-muted-foreground">{t("cart.emptyD")}</p>
        <Button size="lg" className="mt-2 rounded-full px-10 font-bold" onClick={() => go("catalog")}>
          {t("cart.continue")}
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 md:px-6 md:pb-16 md:pt-8">
      <h1 className="font-heading text-3xl font-black md:text-4xl">{t("cart.title")}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* items */}
        <div className="space-y-3">
          {lines.map((l, i) => (
            <Reveal key={l.productId} delay={Math.min(i * 60, 240)}>
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-sm transition hover:border-[#1E4E8F]/30 hover:shadow-md md:gap-4 md:p-4">
                {/* packshot / duotone fallback */}
                <button
                  onClick={() => openProduct(l.productId)}
                  className={`relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl md:size-20 ${
                    l.p.img ? "bg-white ring-1 ring-black/5" : "bg-[#EAF1F9]"
                  }`}
                  aria-label={lang === "ar" ? l.p.nameAr : l.p.nameEn}
                >
                  {l.p.img ? (
                    <Image src={l.p.img} alt={l.p.nameEn} fill sizes="80px" className="object-contain p-1" />
                  ) : (
                    <l.p.icon className="size-7 text-[#1E4E8F] md:size-9" strokeWidth={1.6} />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => openProduct(l.productId)}
                    className="block max-w-full truncate font-heading text-sm font-bold hover:text-[#1E4E8F] md:text-base"
                  >
                    {lang === "ar" ? l.p.nameAr : l.p.nameEn}
                  </button>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {lang === "ar" ? l.p.brandAr : l.p.brandEn}
                  </p>
                  {/* حالة المخزون — مربوطة بالمخزن مباشرة */}
                  {(() => {
                    const st = effStock(l.productId, stockAdj);
                    if (st === 0)
                      return (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#FDEEE8] px-2 py-0.5 text-[10px] font-black text-[#C03B3B]">
                          ⚠ {t("stock.out")}
                        </p>
                      );
                    if (st <= 5)
                      return (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-black text-[#B45E0A]">
                          🔥 {t("stock.low").replace("{x}", String(st))}
                        </p>
                      );
                    return null;
                  })()}
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-heading text-base font-black text-[#1E4E8F]">
                      {fmtPrice(l.p.price, t)}
                    </span>
                    {l.p.oldPrice && (
                      <span className="text-[11px] text-muted-foreground line-through">
                        {fmtPrice(l.p.oldPrice, t)}
                      </span>
                    )}
                    {l.qty > 1 && (
                      <span className="rounded-full bg-[#EAF1F9] px-2 py-0.5 text-[10px] font-black text-[#1E4E8F]">
                        × {l.qty} = {fmtPrice(l.p.price * l.qty, t)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      className="grid size-8 place-items-center rounded-full border border-border bg-white transition hover:border-[#1E4E8F]/40 active:scale-90"
                      onClick={() => setQty(l.productId, l.qty - 1)}
                      aria-label="minus"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-7 text-center font-black">{l.qty}</span>
                    <button
                      className="grid size-8 place-items-center rounded-full bg-[#1E4E8F] text-white transition hover:bg-[#163e73] active:scale-90 disabled:opacity-40 disabled:hover:bg-[#1E4E8F]"
                      onClick={() => setQty(l.productId, l.qty + 1)}
                      disabled={l.qty >= effStock(l.productId, stockAdj)}
                      aria-label="plus"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <button
                    className="flex items-center gap-1 text-xs font-bold text-[#DC4B4B] hover:underline"
                    onClick={() => removeFromCart(l.productId)}
                  >
                    <Trash2 className="size-3.5" />
                    {t("cart.remove")}
                  </button>
                </div>
              </div>
            </Reveal>
          ))}

          {/* suggested add-ons */}
          {suggestions.length > 0 && (
            <Reveal>
              <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                <p className="flex items-center gap-1.5 font-heading text-sm font-black">
                  <Sparkles className="size-4 text-[#F09428]" />
                  {t("cart.suggest")}
                </p>
                <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
                  {suggestions.map((p) => (
                    <div
                      key={p.id}
                      className="flex w-36 shrink-0 flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background/60 p-2.5 text-center"
                    >
                      <button
                        onClick={() => openProduct(p.id)}
                        className="relative grid size-16 w-full place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5"
                      >
                        {p.img ? (
                          <Image src={p.img} alt={p.nameEn} fill sizes="144px" className="object-contain p-1" />
                        ) : (
                          <p.icon className="size-7 text-[#1E4E8F]" strokeWidth={1.6} />
                        )}
                      </button>
                      <p className="line-clamp-2 min-h-8 text-[11px] font-bold leading-tight">
                        {lang === "ar" ? p.nameAr : p.nameEn}
                      </p>
                      <Button
                        size="sm"
                        className="h-8 w-full rounded-full bg-[#112D51] px-2 text-[11px] font-black hover:bg-[#0d2340]"
                        onClick={() => {
                          addToCart(p.id);
                          toast.success(`${lang === "ar" ? p.nameAr : p.nameEn} — ${t("product.added")}`);
                        }}
                      >
                        <IconPlus className="size-3.5" />
                        {fmtPrice(p.price, t)}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          )}
        </div>

        {/* summary */}
        <div className="h-fit space-y-4 lg:sticky lg:top-24">
          {/* free-shipping progress */}
          <Reveal>
            <div className="rounded-2xl border border-[#059669]/25 bg-gradient-to-l from-[#ECFDF5] to-card p-4 shadow-xs">
              <p className="flex items-center gap-2 text-xs font-black text-[#059669] md:text-sm">
                <Truck className="size-4.5 shrink-0" />
                {remaining > 0
                  ? t("cart.progress").replace("{x}", fmtPrice(remaining, t))
                  : t("cart.progressDone")}
              </p>
              <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-white shadow-inner">
                <div
                  className="relative h-full rounded-full bg-gradient-to-r from-[#059669] to-[#10B981] transition-all duration-700"
                  style={{ width: `${Math.max(progress, 6)}%` }}
                >
                  {progress > 0 && progress < 100 && (
                    <span className="bb-shimmer absolute inset-0 rounded-full" />
                  )}
                </div>
              </div>
            </div>
          </Reveal>

          {/* coupon */}
          <Reveal delay={60}>
            <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
              <p className="flex items-center gap-1.5 text-xs font-black md:text-sm">
                <TicketPercent className="size-4.5 text-[#F59E0B]" />
                {t("cart.coupon")}
              </p>
              {appliedCoupon && coupon ? (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-[#ECFDF5] px-3 py-2.5 ring-1 ring-[#10B981]/20">
                  <span className="text-sm font-black text-[#059669]">
                    {coupon.code} · −{coupon.percent}%
                  </span>
                  <button
                    className="text-xs font-bold text-[#DC2626] hover:underline"
                    onClick={() => {
                      clearCoupon();
                      setCode("");
                    }}
                  >
                    {t("cart.remove")}
                  </button>
                </div>
              ) : (
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!code.trim()) return;
                    if (applyCoupon(code)) {
                      const c = coupons.find((x) => x.code === code.trim().toUpperCase());
                      toast.success(t("cart.couponOk").replace("{p}", String(c?.percent ?? 0)));
                      setCode("");
                    } else {
                      toast.error(t("cart.couponBad"));
                    }
                  }}
                >
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={t("cart.couponPh")}
                    className="h-11 flex-1 rounded-xl uppercase"
                  />
                  <Button type="submit" className="h-11 rounded-xl px-5 font-black bg-[#184C8A] hover:bg-[#113665]">
                    {t("cart.couponApply")}
                  </Button>
                </form>
              )}
            </div>
          </Reveal>

          {/* totals */}
          <Reveal delay={120}>
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
              <h3 className="font-heading text-lg font-black">{t("checkout.summary")}</h3>
              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                  <span className="font-bold">{fmtPrice(subtotal, t)}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("cart.savings")}</span>
                    <span className="font-black text-[#059669]">−{fmtPrice(savings + discount, t)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("cart.delivery")}</span>
                  <span className={`font-bold ${shipping === 0 ? "text-[#059669]" : ""}`}>
                    {shipping === 0 ? t("cart.free") : fmtPrice(shipping, t)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-3 font-heading text-lg font-black">
                  <span>{t("cart.total")}</span>
                  <span className="text-[#184C8A]">
                    {fmtPrice(Math.max(0, subtotal - discount) + shipping, t)}
                  </span>
                </div>
              </div>
              <p className="mt-3 rounded-xl bg-[#EAF2FA] px-3 py-2 text-center text-[11px] font-bold text-[#184C8A] ring-1 ring-[#184C8A]/15">
                {t("dv.zoneEta").replace("{x}", "35")} — {t("dv.delivery")}
              </p>
              <Button
                size="lg"
                className="bb-ring mt-4 h-12 w-full rounded-full text-base font-black bg-gradient-to-r from-[#184C8A] to-[#113665] text-white shadow-md shadow-[#184C8A]/25 hover:shadow-lg hover:shadow-[#184C8A]/35 active:scale-[0.98] transition-all"
                onClick={() => go("checkout")}
              >
                {t("cart.checkout")}
                <ChevronRight className="size-4 rtl:rotate-180" />
              </Button>
              <a
                href={`https://wa.me/201011500166?text=${encodeURIComponent(
                  `السلام عليكم صيدلية بحبح، أود طلب محتويات السلة التالية:\n${lines
                    .map((l, i) => `${i + 1}. ${lang === "ar" ? l.p.nameAr : l.p.nameEn} × ${l.qty} (${fmtPrice(l.p.price * l.qty, t)})`)
                    .join("\n")}\n\nالإجمالي: ${fmtPrice(Math.max(0, subtotal - discount) + shipping, t)}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="bb-whatsapp-gradient mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-black text-white shadow-md transition hover:scale-[1.01] active:scale-95"
              >
                <IconWhatsapp className="size-4.5" />
                {lang === "ar" ? "طلب ومحادثة عبر واتساب" : "Order via WhatsApp"}
              </a>
              <Button variant="outline" className="mt-2 w-full rounded-full font-bold active:scale-95" onClick={() => go("catalog")}>
                {t("cart.continue")}
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Checkout (3 steps) — delivery-aware                                 */
/* ------------------------------------------------------------------ */
export function CheckoutView() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const cart = useBahbah((s) => s.cart);
  const user = useBahbah((s) => s.user);
  const myOrders = useBahbah((s) => s.myOrders);
  const { go, placeOrder } = useBahbah();

  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<"cod" | "instapay" | "card">("cod");

  /* delivery state */
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [zoneId, setZoneId] = useState<string>("deirout-city");
  const [slotId, setSlotId] = useState<string>("asap");
  const [slotOpen, setSlotOpen] = useState(false); // hidden by default — ASAP is the fast default

  /* one-tap prefill from the most recent order (ابسط وأسرع) */
  const lastOrder = myOrders[0];
  const applyLastOrder = () => {
    if (!lastOrder) return;
    setName((n) => n || lastOrder.customerAr);
    setPhone(lastOrder.phone);
    setAddress(lastOrder.address.split("—").slice(1).join("—").trim() || lastOrder.address);
    if (lastOrder.delivery) {
      setDeliveryType(lastOrder.delivery.type);
      if (lastOrder.delivery.zoneId) setZoneId(lastOrder.delivery.zoneId);
    }
    toast.success(t("dv.useLast"));
  };

  /* live zones (dashboard pricing) minus zones the admin disabled */
  const zoneDisabled = useBahbah((s) => s.zoneDisabled);
  const allZones = useZones();
  const zones = allZones.filter((z) => !zoneDisabled.includes(z.id));

  /* coupon state */
  const coupons = useBahbah((s) => s.coupons);
  const appliedCoupon = useBahbah((s) => s.appliedCoupon);
  const { applyCoupon, clearCoupon } = useBahbah();
  const [codeInput, setCodeInput] = useState("");

  const lines = cart.map((c) => ({ ...c, p: getProduct(c.productId)! })).filter((l) => l.p);
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);

  const zone = deliveryType === "delivery" ? zones.find((z) => z.id === zoneId) : undefined;
  const chosenSlot = slotById(slotId);
  const slotExtra = deliveryType === "delivery" ? chosenSlot?.extraFee ?? 0 : 0;
  /* عتبة التوصيل المجاني من لوحة الإدارة */
  const freeGoal = Math.max(0, useBahbah((s) => s.settings.freeThreshold));
  const fee =
    (deliveryType === "pickup" || !zone ? 0 : freeGoal > 0 && subtotal >= freeGoal ? 0 : zone!.fee) + slotExtra;

  const activeCoupon = coupons.find((c) => c.code === appliedCoupon && c.active);
  const discount =
    activeCoupon && subtotal >= activeCoupon.minTotal
      ? Math.round((subtotal * activeCoupon.percent) / 100)
      : 0;
  const total = Math.max(0, subtotal - discount) + fee;

  if (lines.length === 0) {
    return (
      <main className="flex flex-col items-center gap-4 py-24 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-muted">
          <ShoppingCart className="size-9 text-muted-foreground" />
        </div>
        <h2 className="font-heading text-2xl font-black">{t("cart.empty")}</h2>
        <Button size="lg" className="mt-2 rounded-full px-10 font-bold" onClick={() => go("catalog")}>
          {t("cart.continue")}
        </Button>
      </main>
    );
  }

  const step1Valid =
    name.trim() &&
    phone.trim().length >= 8 &&
    (deliveryType === "pickup" || (address.trim() && zoneId));

  const steps = [t("checkout.step1"), t("checkout.step2"), t("checkout.step3")];
  const zoneName = (z: DeliveryZone) => (lang === "ar" ? z.nameAr : z.nameEn);
  const zoneAreas = (z: DeliveryZone) => (lang === "ar" ? z.areasAr : z.areasEn);

  /* zone groups — used as optgroups inside one compact dropdown */
  const zoneGroups: { label: string; ids: string[] }[] = [
    { label: t("dv.group.city"), ids: ["deirout-city"] },
    { label: t("dv.group.villages"), ids: ["deirout-ring", "deshlut", "houta", "nazal", "sunrise", "sunset"] },
    { label: t("dv.group.gov"), ids: ["assiut", "upper-nile", "nationwide"] },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:px-6 md:pb-16 md:pt-8">
      <h1 className="font-heading text-3xl font-black">{t("checkout.title")}</h1>

      {/* stepper */}
      <div className="mt-6 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-full font-heading text-sm font-black transition ${
                step > i + 1
                  ? "bg-[#059669] text-white shadow-xs"
                  : step === i + 1
                    ? "bg-[#184C8A] text-white shadow-md shadow-[#184C8A]/30 ring-2 ring-[#184C8A]/20"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step > i + 1 ? <CheckCircle2 className="size-5" /> : i + 1}
            </span>
            <span className={`hidden text-xs font-bold sm:block ${step === i + 1 ? "text-[#184C8A]" : "text-muted-foreground"}`}>
              {s}
            </span>
            {i < 2 && <div className={`h-0.5 flex-1 rounded-full ${step > i + 1 ? "bg-[#059669]" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-border/70 bg-card p-5 shadow-sm md:p-7">
        {/* ============ STEP 1: delivery — one compact screen ============ */}
        {step === 1 && (
          <div className="space-y-4">
            {!user && (
              <p className="rounded-xl bg-[#EAF1F9] px-4 py-2.5 text-xs font-bold text-[#1E4E8F]">
                {t("checkout.guest")}
              </p>
            )}

            {/* one-tap prefill from last order — the fastest path */}
            {lastOrder && !name && !phone && (
              <button
                onClick={applyLastOrder}
                className="flex w-full items-center gap-2.5 rounded-2xl border border-[#2E9E6B]/40 bg-[#EAF6F1]/70 px-4 py-3 text-start transition hover:bg-[#EAF6F1] active:scale-[0.99]"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#2E9E6B]/15 text-[#2E9E6B]">
                  <Sparkles className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black text-[#2E9E6B]">{t("dv.useLast")}</span>
                  <span className="block truncate text-[11px] font-bold text-muted-foreground">
                    {lastOrder.customerAr} · <span dir="ltr">{lastOrder.phone}</span>
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-[#2E9E6B] rtl:rotate-180" />
              </button>
            )}

            {/* method — compact segmented control */}
            <div>
              <p className="mb-2 text-xs font-bold text-foreground/75">{t("dv.title")}</p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["delivery", t("dv.delivery"), <IconScooter className="size-5" key="dv" />, t("dv.fastTag")],
                    ["pickup", t("dv.pickup"), <IconStorefront className="size-5" key="pk" />, t("dv.pickupD")],
                  ] as const
                ).map(([key, label, icon, tag]) => (
                  <button
                    key={key}
                    onClick={() => setDeliveryType(key)}
                    className={`flex items-center gap-2.5 rounded-2xl border-2 px-3.5 py-3 text-start transition active:scale-[0.99] ${
                      deliveryType === key
                        ? "border-[#1E4E8F] bg-[#EAF1F9]/60"
                        : "border-border bg-card hover:border-[#1E4E8F]/40"
                    }`}
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                        deliveryType === key ? "bg-[#1E4E8F] text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-heading text-sm font-black">{label}</span>
                      <span className="block truncate text-[10px] font-bold text-muted-foreground">{tag}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* pickup branch card */}
            {deliveryType === "pickup" && (
              <div className="flex items-start gap-3 rounded-2xl border border-[#2E9E6B]/30 bg-[#EAF6F1]/60 p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#2E9E6B]/15 text-[#2E9E6B]">
                  <IconStorefront className="size-5.5" />
                </span>
                <div className="min-w-0">
                  <p className="font-heading text-sm font-black">{lang === "ar" ? BRANCH.nameAr : BRANCH.nameEn}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {lang === "ar" ? BRANCH.addressAr : BRANCH.addressEn}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs font-bold text-[#2E9E6B]">
                    <Clock className="size-3.5" />
                    {t("dv.pickupReady")} · {lang === "ar" ? BRANCH.hoursAr : BRANCH.hoursEn}
                  </p>
                </div>
              </div>
            )}

            {/* delivery: one compact zone dropdown replaces the big card grid */}
            {deliveryType === "delivery" && (
              <>
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground/75">
                    <IconPin className="size-4 text-[#1E4E8F]" />
                    {t("dv.pick")}
                  </p>
                  <Select value={zoneId} onValueChange={setZoneId}>
                    <SelectTrigger className="h-13 rounded-2xl font-heading text-sm font-black">
                      <SelectValue placeholder={t("dv.pick")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {zoneGroups.map((g) => {
                        const gz = g.ids.map((id) => zones.find((z) => z.id === id)).filter(Boolean) as DeliveryZone[];
                        if (gz.length === 0) return null;
                        return (
                          <SelectGroup key={g.label}>
                            <SelectLabel className="text-[11px] font-black text-muted-foreground">
                              {g.label}
                            </SelectLabel>
                            {gz.map((z) => (
                              <SelectItem key={z.id} value={z.id} className="text-sm font-bold">
                                <span className="flex items-center justify-between gap-2">
                                  <span>{zoneName(z)}</span>
                                  <span className="text-[11px] font-black text-[#1E4E8F]">
                                    {freeGoal > 0 && subtotal >= freeGoal ? t("dv.free") : `${z.fee} ${t("misc.currency")}`}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {zone && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-muted-foreground">
                      <span className="flex items-center gap-1 text-[#1E4E8F]">
                        <IconClockFast className="size-3.5" />
                        {t("dv.zoneEta").replace("{x}", String(zone.etaMin))}
                      </span>
                      {freeGoal > 0 && subtotal >= freeGoal ? (
                        <span className="rounded-full bg-[#EAF6F1] px-2 py-0.5 text-[#2E9E6B]">{t("dv.free")}</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5">
                          {zone.fee} {t("misc.currency")}
                          {freeGoal > 0 ? ` · ${t("dv.zoneFree").replace("{x}", freeGoal.toLocaleString("en-US"))}` : ""}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-foreground/75">{t("checkout.address")}</span>
                  <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="rounded-xl" placeholder={zoneAreas(zone ?? zones[0])} />
                </label>
              </>
            )}

            {/* contact */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-foreground/75">{t("checkout.name")}</span>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-foreground/75">{t("checkout.phone")}</span>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="h-12 rounded-xl" />
              </label>
            </div>

            {/* slot — ASAP default, extra times behind one tap */}
            {deliveryType === "delivery" && (
              <div className="rounded-2xl border border-border/70 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EAF1F9] text-[#1E4E8F]">
                      <IconClockFast className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black md:text-sm">
                        {chosenSlot && slotId !== "asap"
                          ? `${lang === "ar" ? chosenSlot.labelAr : chosenSlot.labelEn} — ${lang === "ar" ? chosenSlot.subAr : chosenSlot.subEn}`
                          : t("dv.slotNow")}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground">{t("dv.slot")}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 rounded-full px-4 text-xs font-black"
                    onClick={() => setSlotOpen((v) => !v)}
                  >
                    {t("dv.changeSlot")}
                  </Button>
                </div>
                {slotOpen && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {deliverySlots.map((s) => {
                      const active = slotId === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            setSlotId(s.id);
                            setSlotOpen(false);
                          }}
                          className={`relative rounded-xl border-2 px-2 py-2.5 text-center transition active:scale-[0.98] ${
                            active ? "border-[#1E4E8F] bg-[#EAF1F9]/60" : "border-border hover:border-[#1E4E8F]/40"
                          }`}
                        >
                          {s.extraFee && (
                            <span className="absolute -top-2 end-1.5 rounded-full bg-[#F09428] px-1.5 py-0.5 text-[9px] font-black text-white shadow-sm">
                              +{s.extraFee} {t("misc.currency")}
                            </span>
                          )}
                          <span className="block text-xs font-black">{lang === "ar" ? s.labelAr : s.labelEn}</span>
                          <span className="block text-[10px] text-muted-foreground" dir="ltr">
                            {lang === "ar" ? s.subAr : s.subEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* optional note */}
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-foreground/75">
                {t("checkout.notes")} <span className="font-normal text-muted-foreground">({t("dv.optional")})</span>
              </span>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-11 rounded-xl" />
            </label>

            <Button
              size="lg"
              className="h-12 w-full rounded-full text-base font-bold"
              onClick={() => {
                if (!step1Valid) {
                  toast.error(t("auth.invalid"));
                  return;
                }
                setStep(2);
              }}
            >
              {t("checkout.next")}
              <ChevronRight className="size-4 rtl:rotate-180" />
            </Button>
          </div>
        )}

        {/* ============ STEP 2: payment ============ */}
        {step === 2 && (
          <div className="space-y-3">
            {(
              [
                ["cod", t("checkout.cod"), t("checkout.codD"), <Store className="size-5" key="1" />],
                ["instapay", t("checkout.instapay"), t("checkout.instapayD"), <Phone className="size-5" key="2" />],
                ["card", t("checkout.card"), t("checkout.cardD"), <IconWallet className="size-5" key="3" />],
              ] as const
            ).map(([key, title, desc, icon]) => (
              <button
                key={key}
                onClick={() => setPayment(key)}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-start transition ${
                  payment === key
                    ? "border-[#1E4E8F] bg-[#EAF1F9]/60"
                    : "border-border bg-card hover:border-[#1E4E8F]/40"
                }`}
              >
                <span className={`grid size-11 place-items-center rounded-full ${payment === key ? "bg-[#1E4E8F] text-white" : "bg-muted text-muted-foreground"}`}>
                  {icon}
                </span>
                <span className="flex-1">
                  <span className="block font-heading text-sm font-black">{title}</span>
                  <span className="block text-xs text-muted-foreground">{desc}</span>
                </span>
                <span className={`size-5 rounded-full border-2 ${payment === key ? "border-[#1E4E8F] bg-[#1E4E8F] ring-2 ring-inset ring-white" : "border-border"}`} />
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="h-12 flex-1 rounded-full font-bold" onClick={() => setStep(1)}>
                {t("checkout.back")}
              </Button>
              <Button className="h-12 flex-1 rounded-full text-base font-bold" onClick={() => setStep(3)}>
                {t("checkout.next")}
                <ChevronRight className="size-4 rtl:rotate-180" />
              </Button>
            </div>
          </div>
        )}

        {/* ============ STEP 3: review ============ */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-muted/50 p-4 text-sm">
              <div className="flex items-start gap-2.5">
                <User className="mt-0.5 size-4 shrink-0 text-[#1E4E8F]" />
                <div>
                  <span className="font-bold">{name}</span>
                  <span dir="ltr" className="ms-2 text-muted-foreground">{phone}</span>
                </div>
              </div>
              <div className="mt-2 flex items-start gap-2.5">
                {deliveryType === "delivery" ? (
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[#1E4E8F]" />
                ) : (
                  <IconStorefront className="mt-0.5 size-4 shrink-0 text-[#1E4E8F]" />
                )}
                <span className="text-foreground/80">
                  {deliveryType === "delivery" ? (
                    <>
                      <b className="font-heading">{zone && zoneName(zone)}</b> — {address}
                    </>
                  ) : (
                    <>{lang === "ar" ? BRANCH.nameAr : BRANCH.nameEn}</>
                  )}
                </span>
              </div>
              <div className="mt-2 flex items-start gap-2.5">
                <Clock className="mt-0.5 size-4 shrink-0 text-[#1E4E8F]" />
                <span className="text-foreground/80">
                  {deliveryType === "pickup"
                    ? t("dv.pickupReady")
                    : (() => {
                        const s = slotById(slotId);
                        return s ? (lang === "ar" ? `${s.labelAr} · ${s.subAr}` : `${s.labelEn} · ${s.subEn}`) : "";
                      })()}
                </span>
              </div>
              {notes.trim() && (
                <div className="mt-2 flex items-start gap-2.5">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[#1E4E8F]" />
                  <span className="text-foreground/80">{notes}</span>
                </div>
              )}
            </div>

            <div className="nice-scrollbar max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-border/60 p-3">
              {lines.map((l) => (
                <div key={l.productId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    {lang === "ar" ? l.p.nameAr : l.p.nameEn}
                    <span className="text-muted-foreground"> × {l.qty}</span>
                  </span>
                  <span className="shrink-0 font-bold">{fmtPrice(l.p.price * l.qty, t)}</span>
                </div>
              ))}
            </div>

            {/* coupon engine */}
            <div className="rounded-2xl border border-border/60 p-3.5">
              {activeCoupon && discount > 0 ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-xl bg-[#EAF6F1] text-[#2E9E6B]">
                      <BadgeCheck className="size-5" />
                    </span>
                    <div>
                      <p dir="ltr" className="text-sm font-black text-[#2E9E6B]">{activeCoupon.code}</p>
                      <p className="text-[11px] font-bold text-muted-foreground">
                        {t("coupon.ok")
                          .replace("{code}", activeCoupon.code)
                          .replace("{x}", discount.toLocaleString("en-US"))}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => clearCoupon()}
                    className="rounded-full px-3 py-1.5 text-xs font-bold text-[#DC4B4B] transition hover:bg-[#DC4B4B]/10"
                  >
                    {t("coupon.remove")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder={t("coupon.ph")}
                    dir="ltr"
                    className="h-11 flex-1 rounded-xl text-center font-bold uppercase"
                  />
                  <Button
                    variant="outline"
                    className="h-11 shrink-0 rounded-xl px-5 font-bold"
                    onClick={() => {
                      const norm = codeInput.trim().toUpperCase();
                      const c = coupons.find((x) => x.code === norm && x.active);
                      if (!c) {
                        toast.error(t("coupon.invalid"));
                        return;
                      }
                      if (subtotal < c.minTotal) {
                        toast.error(t("coupon.min").replace("{x}", c.minTotal.toLocaleString("en-US")));
                        return;
                      }
                      applyCoupon(norm);
                      setCodeInput("");
                      toast.success(
                        t("coupon.ok")
                          .replace("{code}", c.code)
                          .replace("{x}", Math.round((subtotal * c.percent) / 100).toLocaleString("en-US"))
                      );
                    }}
                  >
                    {t("coupon.apply")}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                <span className="font-bold">{fmtPrice(subtotal, t)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#2E9E6B]">
                  <span className="font-bold">
                    {t("misc.discount")} ({activeCoupon?.code})
                  </span>
                  <span className="font-bold">− {fmtPrice(discount, t)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("dv.fee")}</span>
                <span className={`font-bold ${fee === 0 ? "text-[#2E9E6B]" : ""}`}>
                  {fee === 0 ? t("dv.free") : fmtPrice(fee, t)}
                </span>
              </div>
              {slotExtra > 0 && (
                <p className="rounded-xl bg-[#FFF4E5] px-3 py-2 text-[11px] font-bold text-[#B45E0A]">
                  {t("dv.expressNote").replace("{x}", String(slotExtra))}
                </p>
              )}
              {zone && fee > 0 && subtotal < zone.freeOver && (
                <p className="rounded-xl bg-[#FFF4E5] px-3 py-2 text-[11px] font-bold text-[#B45E0A]">
                  {t("dv.zoneFree").replace("{x}", zone.freeOver.toLocaleString("en-US"))}
                </p>
              )}
              <div className="flex justify-between border-t border-border pt-2 font-heading text-lg font-black">
                <span>{t("cart.total")}</span>
                <span className="text-[#184C8A]">{fmtPrice(total, t)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="h-12 flex-1 rounded-full font-bold active:scale-95" onClick={() => setStep(2)}>
                {t("checkout.back")}
              </Button>
              <Button
                className="h-12 flex-1 rounded-full text-base font-black bg-gradient-to-r from-[#184C8A] to-[#113665] text-white shadow-md shadow-[#184C8A]/25 hover:shadow-lg hover:shadow-[#184C8A]/35 active:scale-[0.98] transition-all"
                onClick={() => {
                  const id = placeOrder({
                    address,
                    phone,
                    payment,
                    name,
                    city: zone && deliveryType === "delivery" ? (lang === "ar" ? zone.nameAr : zone.nameEn) : lang === "ar" ? BRANCH.nameAr : BRANCH.nameEn,
                    deliveryType,
                    zoneId: deliveryType === "delivery" ? zoneId : undefined,
                    slotId: deliveryType === "delivery" ? slotId : undefined,
                  });
                  if (!id) return;
                  toast.success(t("checkout.success"));
                }}
              >
                <CheckCircle2 className="size-5" />
                {t("checkout.place")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Order success                                                       */
/* ------------------------------------------------------------------ */
export function SuccessView() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const lastOrderId = useBahbah((s) => s.lastOrderId);
  const myOrders = useBahbah((s) => s.myOrders);
  const { go, openTrack } = useBahbah();

  const order: Order | undefined = useMemo(
    () => myOrders.find((o) => o.id === lastOrderId),
    [myOrders, lastOrderId]
  );
  const driver = driverById(order?.delivery?.driverId);

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center md:py-20">
      <div className="grid size-24 place-items-center rounded-full bg-[#EAF6F1]">
        <PartyPopper className="size-11 text-[#2E9E6B]" />
      </div>
      <h1 className="mt-6 font-heading text-3xl font-black">{t("checkout.success")}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
        {t("checkout.successD")}
      </p>
      {lastOrderId && (
        <Badge className="mt-5 rounded-full bg-[#EAF1F9] px-5 py-2 font-heading text-base font-black text-[#1E4E8F] hover:bg-[#EAF1F9]">
          {t("checkout.orderNo")}: {lastOrderId}
        </Badge>
      )}

      {/* delivery assignment card */}
      {order?.delivery && (
        <div className="mt-5 flex w-full max-w-sm items-center gap-3 rounded-2xl border border-[#F09428]/30 bg-[#FFF4E5]/70 p-4 text-start">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#F09428]/15 text-[#C56A0A]">
            {order.delivery.type === "pickup" ? <IconStorefront className="size-5.5" /> : <IconScooter className="size-5.5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#B45E0A]">
              {order.delivery.type === "pickup" ? t("dv.pickup") : t("track.driver")}
            </p>
            <p className="truncate font-heading text-sm font-black text-[#8a5410]">
              {order.delivery.type === "pickup"
                ? lang === "ar" ? BRANCH.nameAr : BRANCH.nameEn
                : driver
                  ? (lang === "ar" ? driver.nameAr : driver.nameEn)
                  : "—"}
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-[#B45E0A]">
              {order.delivery.type === "pickup"
                ? t("dv.pickupReady")
                : (lang === "ar" ? order.delivery.slotAr : order.delivery.slotEn)}
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 flex w-full max-w-sm flex-col gap-2.5">
        <Button
          size="lg"
          className="h-12 w-full rounded-full text-base font-bold"
          onClick={() => (lastOrderId ? openTrack(lastOrderId) : go("account"))}
        >
          <Truck className="size-5" />
          {t("checkout.track")}
        </Button>
        <Button variant="outline" size="lg" className="h-12 w-full rounded-full font-bold" onClick={() => go("catalog")}>
          {t("checkout.keep")}
        </Button>
      </div>
    </main>
  );
}
