"use client";

import { useEffect, useMemo, useState } from "react";
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
  Package,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  DEFAULT_LOYALTY_TIERS,
  loyaltyFreeShipApplies,
  loyaltyFreeRemaining,
  type Order,
  type DeliveryZone,
} from "@/lib/bahbah/data";
import { useBahbah, useT, useZones, effStock } from "@/lib/bahbah/store";
import { isSensitiveProduct, isNightOrder } from "@/lib/bahbah/curation";
import type { DictKey } from "@/lib/bahbah/i18n";
import { IconScooter, IconStorefront, IconClockFast, IconPin, IconWallet, IconPlus, IconWhatsapp } from "./icons";
import { fmtPrice, ProductVisual } from "./product-card";
import { captureLocation, mapsPinUrl, ADDRESS_LABEL_PRESETS } from "./addresses";
import Reveal from "./reveal";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Egyptian mobile validation                                          */
/* ------------------------------------------------------------------ */
/**
 * يحوّل الأرقام العربية/الفارسية (٠١٢…) لإنجليزية، ويشيل المسافات والشرطات والرموز،
 * ويقبل الصيغ الدولية (+20 / 0020) ويرجّعها لشكل 01xxxxxxxxx.
 */
export function normalizeEgPhone(raw: string): string {
  const latin = raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  let digits = latin.replace(/\D/g, "");
  if (digits.startsWith("0020")) digits = "0" + digits.slice(4);
  else if (digits.startsWith("20") && digits.length === 12) digits = "0" + digits.slice(2);
  return digits;
}

/** موبايل مصري: 11 رقم يبدأ بـ 010 أو 011 أو 012 أو 015 */
export const EG_MOBILE = /^01[0125]\d{8}$/;

/* ------------------------------------------------------------------ */
/* Cart page — packshots + coupon + savings                           */
/* ------------------------------------------------------------------ */
export function CartView() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const cart = useBahbah((s) => s.cart);
  const appliedCoupon = useBahbah((s) => s.appliedCoupon);
  const coupons = useBahbah((s) => s.coupons);
  const favorites = useBahbah((s) => s.favorites);
  const stockAdj = useBahbah((s) => s.stockAdj);
  /* حملة التوصيل المجاني — مفتاحها في لوحة الإدارة */
  const campaignOn = useBahbah((s) => s.settings.freeShipCampaignOn);
  const { setQty, removeFromCart, go, addToCart, applyCoupon, clearCoupon, openProduct } = useBahbah();
  const user = useBahbah((s) => s.user);
  const createWhatsappOrder = useBahbah((s) => s.createWhatsappOrder);
  const [code, setCode] = useState("");
  const [waBusy, setWaBusy] = useState(false);

  const lines = cart.map((c) => ({ ...c, p: getProduct(c.productId)! })).filter((l) => l.p);
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const savings = lines.reduce(
    (s, l) => s + (l.p.oldPrice ? (l.p.oldPrice - l.p.price) * l.qty : 0),
    0
  );
  const coupon = coupons.find((c) => c.code === appliedCoupon && c.active);
  const discount = coupon && subtotal >= coupon.minTotal ? Math.round((subtotal * coupon.percent) / 100) : 0;
  const shipping = subtotal === 0 || campaignOn ? 0 : SHIPPING_FEE;

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
                  className="relative size-16 shrink-0 overflow-hidden rounded-2xl md:size-20"
                  aria-label={lang === "ar" ? l.p.nameAr : l.p.nameEn}
                >
                  <ProductVisual product={l.p} size="sm" />
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
        </div>

        {/* summary */}
        <div className="h-fit space-y-4 lg:sticky lg:top-24">
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
              <button
                disabled={waBusy}
                onClick={async () => {
                  if (waBusy) return;
                  setWaBusy(true);
                  const totalWa = Math.max(0, subtotal - discount) + shipping;
                  const code = await createWhatsappOrder({
                    items: lines.map((l) => ({
                      productId: l.p.id,
                      nameAr: l.p.nameAr,
                      nameEn: l.p.nameEn,
                      qty: l.qty,
                      price: l.p.price,
                    })),
                    total: totalWa,
                    phone: user?.phone,
                    name: user?.name,
                  });
                  setWaBusy(false);
                  if (!code) {
                    toast.error(
                      lang === "ar"
                        ? "تعذر تسجيل الطلب السريع دلوقتي — حاول تاني أو كمل من إتمام الطلب"
                        : "Couldn't log the quick order — please retry or use checkout"
                    );
                    return;
                  }
                  const msg = `السلام عليكم صيدلية بحبح، أود طلب محتويات السلة التالية:\n${lines
                    .map((l, i) => `${i + 1}. ${lang === "ar" ? l.p.nameAr : l.p.nameEn} × ${l.qty} (${fmtPrice(l.p.price * l.qty, t)})`)
                    .join("\n")}\n\nالإجمالي: ${fmtPrice(totalWa, t)}\nكود الطلب السريع: ${code}`;
                  window.open(`https://wa.me/201011500166?text=${encodeURIComponent(msg)}`, "_blank");
                }}
                className="bb-whatsapp-gradient mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-black text-white shadow-md transition hover:scale-[1.01] active:scale-95 disabled:opacity-60"
              >
                <IconWhatsapp className="size-4.5" />
                {lang === "ar" ? "طلب سريع بواتساب" : "WhatsApp quick order"}
              </button>
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
  const orderPlacing = useBahbah((s) => s.orderPlacing);
  const acceptOrders = useBahbah((s) => s.settings.acceptOrders);
  const { go, placeOrder } = useBahbah();

  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<"cod" | "instapay" | "vodafone" | "card">("cod");
  const [cashChangeFloat, setCashChangeFloat] = useState<string>("exact");

  /* تغليف خاص سادة (مجاناً) — بيتحول افتراضياً لو السلة فيها أصناف حساسة */
  const [discreet, setDiscreet] = useState(false);
  const [discreetTouched, setDiscreetTouched] = useState(false);

  /* delivery state */
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [zoneId, setZoneId] = useState<string>("deirout-city");
  const [customVillageName, setCustomVillageName] = useState("");
  const [slotId, setSlotId] = useState<string>("asap");
  const [slotOpen, setSlotOpen] = useState(false); // hidden by default — ASAP is the fast default

  /* one-tap prefill from the most recent order (ابسط وأسرع) */
  const lastOrder = myOrders[0];
  const applyLastOrder = () => {
    if (!lastOrder) return;
    setAddrTouched(true);
    setName((n) => n || lastOrder.customerAr);
    setPhone(lastOrder.phone);
    setAddress(lastOrder.address.split("—").slice(1).join("—").trim() || lastOrder.address);
    setSelectedAddressId(null);
    setPin(
      lastOrder.lat != null && lastOrder.lng != null
        ? { lat: lastOrder.lat, lng: lastOrder.lng }
        : null
    );
    if (lastOrder.delivery) {
      setDeliveryType(lastOrder.delivery.type);
      if (lastOrder.delivery.zoneId) setZoneId(lastOrder.delivery.zoneId);
    }
    toast.success(t("dv.useLast"));
  };

  /* ---- دفتر العناوين: اختيار عنوان محفوظ أو كتابة جديد (بيتحفظ مع الطلب) ---- */
  const savedAddresses = useBahbah((s) => s.savedAddresses);
  const lastAddressId = useBahbah((s) => s.lastAddressId);
  const { addSavedAddress } = useBahbah();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [newLabel, setNewLabel] = useState<string>("البيت");
  const [addrInit, setAddrInit] = useState(false);
  /* العميل لمس العنوان بنفسه (كتابة/اختيار/آخر طلب) = الاختيار التلقائي يقف */
  const [addrTouched, setAddrTouched] = useState(false);

  const myAddresses = savedAddresses.filter(
    (a) => !a.phone || !(user?.phone || phone) || a.phone === (user?.phone || phone)
  );

  const pickSavedAddress = (id: string | null) => {
    setAddrTouched(true);
    setSelectedAddressId(id);
    if (!id) {
      setAddress("");
      setPin(null);
      return;
    }
    const a = savedAddresses.find((x) => x.id === id);
    if (!a) return;
    setAddress(a.details);
    setPin(a.lat != null && a.lng != null ? { lat: a.lat, lng: a.lng } : null);
  };

  /* أول مرة بس: آخر عنوان اتستخدم (أو الأساسي) بيبقى محدد وجاهز في الحقول —
     إلا لو العميل بدأ يكتب/يختار بنفسه قبل ما العناوين توصله */
  useEffect(() => {
    if (addrInit) return;
    if (addrTouched) {
      setAddrInit(true);
      return;
    }
    if (savedAddresses.length === 0) return;
    const pick =
      savedAddresses.find((a) => a.id === lastAddressId) ??
      savedAddresses.find((a) => a.isDefault) ??
      savedAddresses[0];
    if (pick) {
      setSelectedAddressId(pick.id);
      setAddress((cur) => cur || pick.details);
      setPin(
        pick.lat != null && pick.lng != null ? { lat: pick.lat, lng: pick.lng } : null
      );
    }
    setAddrInit(true);
  }, [savedAddresses, lastAddressId, addrTouched, addrInit]);

  const locateMe = async () => {
    setPinBusy(true);
    const p = await captureLocation();
    setPinBusy(false);
    if (p) {
      setPin(p);
      toast.success(lang === "ar" ? "اتحدد موقعك — المندوب هيوصل بالظبط" : "Location pinned");
    } else {
      toast.error(
        lang === "ar"
          ? "ما قدرناش نحدد الموقع — فعّل الـ GPS واسمح بالوصول للموقع"
          : "Couldn't get your location"
      );
    }
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

  const hasSensitive = lines.some((l) => isSensitiveProduct(l.p));
  useEffect(() => {
    if (hasSensitive && !discreetTouched) setDiscreet(true);
  }, [hasSensitive, discreetTouched]);

  const zone = deliveryType === "delivery" ? zones.find((z) => z.id === zoneId) : undefined;
  const chosenSlot = slotById(slotId);
  const slotExtra = deliveryType === "delivery" ? chosenSlot?.extraFee ?? 0 : 0;
  /* حملة التوصيل المجاني من لوحة الإدارة — وهي شغالة رسوم كل المناطق صفر */
  const campaignOn = useBahbah((s) => s.settings.freeShipCampaignOn);
  /* توصيل مجاني من الولاء/الرعاية ضمن الرصيد الشهري — نفس قاعدة السيرفر
     ومتجر الطلب: مؤهل (مستوى/اشتراك رعاية) ولسه فيه رصيد متبقي */
  const loyalty = useBahbah((s) => s.loyalty);
  const loyaltyTiersSetting = useBahbah((s) => s.settings.loyaltyTiers);
  const careSub = useBahbah((s) => s.careSub);
  const loyaltyFreeShip =
    deliveryType === "delivery" &&
    loyaltyFreeShipApplies(
      loyaltyTiersSetting && loyaltyTiersSetting.length > 0
        ? loyaltyTiersSetting
        : DEFAULT_LOYALTY_TIERS,
      loyalty,
      careSub?.status === "active"
    );
  const shipFree = campaignOn || loyaltyFreeShip;
  const fee =
    (deliveryType === "pickup" || !zone ? 0 : shipFree ? 0 : zone!.fee) + slotExtra;

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

  /* رقم الموبايل بعد التنظيف — ده اللي بيتخزن ويتبعت للمندوب */
  const phoneNorm = normalizeEgPhone(phone);

  /* أول حقل ناقص بيرجع رسالته المخصصة، و null معناها كله تمام */
  const step1Error: DictKey | null = !name.trim()
    ? "checkout.err.name"
    : !EG_MOBILE.test(phoneNorm)
      ? "checkout.err.phone"
      : deliveryType === "delivery" && !zoneId
        ? "checkout.err.zone"
        : deliveryType === "delivery" && zoneId === "custom-village" && !customVillageName.trim()
          ? "checkout.err.village"
          : deliveryType === "delivery" && !address.trim()
            ? "checkout.err.address"
            : null;

  const steps = [t("checkout.step1"), t("checkout.step2"), t("checkout.step3")];
  const zoneName = (z: DeliveryZone) => (lang === "ar" ? z.nameAr : z.nameEn);
  const zoneAreas = (z: DeliveryZone) => (lang === "ar" ? z.areasAr : z.areasEn);

  /* zone groups — used as optgroups inside one compact dropdown */
  const zoneGroups: { label: string; ids: string[] }[] = [
    { label: t("dv.group.city"), ids: ["deirout-city"] },
    {
      label: "قرى ونجوع ديروط (توصيل فوري ⚡)",
      ids: [
        "deirout-sharif",
        "masara",
        "koudia",
        "deshlut",
        "houta",
        "sanbo",
        "bawit",
        "beblaw",
        "bani-yahya",
        "kasr-haidar",
        "amshoul",
        "abu-karim",
        "riyad",
        "mahmoudia",
        "kom-boha",
        "aramia",
        "sharaqwa",
        "nazal",
        "deirout-ring",
        "sunrise",
        "sunset",
      ],
    },
    {
      label: "قرية أو نجع آخر — اكتب اسم مكانك ✍️",
      ids: ["custom-village"],
    },
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
                                    {shipFree ? t("dv.free") : `${z.fee} ${t("misc.currency")}`}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {zoneId === "custom-village" && (
                    <div className="mt-3 rounded-2xl border-2 border-[#184C8A]/30 bg-[#EAF1F9]/70 p-3.5 space-y-1.5 animate-in fade-in slide-in-from-top-1">
                      <label className="block text-xs font-black text-[#184C8A]">
                        ✍️ اكتب اسم قريتك أو عزبتك أو نجعك بديروط بالتفصيل:
                      </label>
                      <Input
                        value={customVillageName}
                        onChange={(e) => setCustomVillageName(e.target.value)}
                        placeholder="مثال: نجع فلان / عزبة كذا / بالقرب من مدرسة..."
                        className="h-11 rounded-xl bg-white font-bold"
                      />
                      <p className="text-[11px] font-bold text-muted-foreground">
                        سيتم توجيه المندوب إلى مكانك المكتوب مباشرة مع تأكيد الهاتف.
                      </p>
                    </div>
                  )}
                  {zone && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-muted-foreground">
                      <span className="flex items-center gap-1 text-[#1E4E8F]">
                        <IconClockFast className="size-3.5" />
                        {t("dv.zoneEta").replace("{x}", String(zone.etaMin))}
                      </span>
                      {shipFree ? (
                        <span className="rounded-full bg-[#EAF6F1] px-2 py-0.5 text-[#2E9E6B]">{t("dv.free")}</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5">
                          {zone.fee} {t("misc.currency")}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* دفتر العناوين — اختيار سريع من المحفوظ أو عنوان جديد */}
                {myAddresses.length > 0 && (
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground/75">
                      <MapPin className="size-4 text-[#1E4E8F]" />
                      {lang === "ar" ? "عناوينك المحفوظة" : "Your saved addresses"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {myAddresses.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => pickSavedAddress(a.id)}
                          className={`rounded-full border-2 px-3.5 py-1.5 text-xs font-black transition active:scale-[0.97] ${
                            selectedAddressId === a.id
                              ? "border-[#1E4E8F] bg-[#EAF1F9]/70 text-[#1E4E8F]"
                              : "border-border text-muted-foreground hover:border-[#1E4E8F]/40"
                          }`}
                        >
                          {a.label}
                          {a.isDefault ? " ⭐" : ""}
                          {a.lat != null ? " 📍" : ""}
                        </button>
                      ))}
                      <button
                        onClick={() => pickSavedAddress(null)}
                        className={`rounded-full border-2 px-3.5 py-1.5 text-xs font-black transition active:scale-[0.97] ${
                          selectedAddressId === null
                            ? "border-[#F09428] bg-[#FFF4E5] text-[#B45E0A]"
                            : "border-border text-muted-foreground hover:border-[#F09428]/50"
                        }`}
                      >
                        ➕ {lang === "ar" ? "عنوان جديد" : "New address"}
                      </button>
                    </div>
                  </div>
                )}

                <label className="block space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground/75">{t("checkout.address")}</span>
                    <span className="text-[11px] font-bold text-[#184C8A]">
                      {lang === "ar" ? "📍 اذكر علامة مميزة (مسجد، مدرسة، عائلة...)" : "📍 Add a nearby landmark"}
                    </span>
                  </div>
                  <Textarea
                    value={address}
                    onChange={(e) => {
                      setAddrTouched(true);
                      setAddress(e.target.value);
                      /* تعديل نص عنوان محفوظ = عنوان جديد هيتحفظ بالاسم اللي يختاره */
                      if (selectedAddressId) {
                        const sel = savedAddresses.find((x) => x.id === selectedAddressId);
                        if (sel && e.target.value !== sel.details) setSelectedAddressId(null);
                      }
                    }}
                    rows={2}
                    className="rounded-xl leading-relaxed text-sm"
                    placeholder={
                      lang === "ar"
                        ? "اكتب العنوان بالتفصيل: الشارع أو المنطقة، وأقرب علامة مميزة (بجوار مسجد... / أمام مدرسة... / دوار عائلة...)"
                        : zoneAreas(zone ?? zones[0])
                    }
                  />
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {lang === "ar"
                      ? "العلامات المميزة تضمن وصول المندوب لباب بيتك فوراً بدون تأخير."
                      : "Landmarks ensure fast delivery to your door."}
                  </p>
                </label>

                {/* دبوس الموقع — تحديد GPS اختياري بيروح مع الطلب للمندوب */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pinBusy}
                    onClick={locateMe}
                    className="h-9 rounded-full px-4 text-xs font-black"
                  >
                    <MapPin className="size-3.5" />
                    {pinBusy
                      ? lang === "ar"
                        ? "جارٍ التحديد…"
                        : "Locating…"
                      : pin
                        ? lang === "ar"
                          ? "تحديث موقعي على الخريطة"
                          : "Update my pin"
                        : lang === "ar"
                          ? "حدّد موقعي على الخريطة"
                          : "Pin my location"}
                  </Button>
                  {pin && (
                    <>
                      <a
                        href={mapsPinUrl(pin.lat, pin.lng)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-[#EAF6F1] px-3 py-1.5 text-[11px] font-black text-[#2E9E6B]"
                      >
                        📍 {lang === "ar" ? "الموقع متحدد — معاينة" : "Pinned — preview"}
                      </a>
                      <button
                        onClick={() => setPin(null)}
                        className="text-[11px] font-bold text-[#DC4B4B] underline-offset-2 hover:underline"
                      >
                        {lang === "ar" ? "شيل الدبوس" : "Remove"}
                      </button>
                    </>
                  )}
                </div>

                {/* عنوان جديد؟ سمّيه وهنحفظه في دفترك مع الطلب ده */}
                {!selectedAddressId && address.trim().length > 3 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground">
                      {lang === "ar" ? "هنحفظه في دفترك باسم:" : "Save it in your book as:"}
                    </span>
                    {ADDRESS_LABEL_PRESETS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setNewLabel(p)}
                        className={`rounded-full border-2 px-3 py-1 text-[11px] font-black transition active:scale-[0.97] ${
                          newLabel === p
                            ? "border-[#1E4E8F] bg-[#EAF1F9]/70 text-[#1E4E8F]"
                            : "border-border text-muted-foreground hover:border-[#1E4E8F]/40"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
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

            {/* تغليف خاص — من مميزات التوصيل، اختيار مجاني في قسم التوصيل */}
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#EAF1F9] text-[#1E4E8F]">
                <Package className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm font-black">{t("checkout.discreetT")}</p>
                <p className="text-xs text-muted-foreground">{t("checkout.discreetD")}</p>
                <p className="mt-0.5 text-[11px] font-bold text-[#2E9E6B]">
                  {lang === "ar" ? "من مميزات توصيلنا: تغليف خاص يحافظ على خصوصيتك" : "One of our delivery perks: packaging that protects your privacy"}
                </p>
              </div>
              <Switch
                checked={discreet}
                onCheckedChange={(v) => {
                  setDiscreet(v);
                  setDiscreetTouched(true);
                }}
                aria-label={t("checkout.discreetT")}
              />
            </div>

            <Button
              size="lg"
              className="h-12 w-full rounded-full text-base font-bold"
              onClick={() => {
                if (step1Error) {
                  toast.error(t(step1Error));
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
                ["vodafone", t("checkout.vodafone"), t("checkout.vodafoneD"), <Smartphone className="size-5" key="3" />],
                ["card", t("checkout.card"), t("checkout.cardD"), <IconWallet className="size-5" key="4" />],
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

            {payment === "cod" && (
              <div className="rounded-2xl border-2 border-[#184C8A]/20 bg-[#EAF2FA]/60 p-4 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <p className="font-heading text-xs font-black text-[#184C8A]">
                    {lang === "ar" ? "💵 معاك فكة كام؟ (لتجهيز الباقي مع المندوب مسبقاً)" : "Change float needed:"}
                  </p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#184C8A] shadow-xs">
                    {lang === "ar" ? "خدمة مريحة" : "Convenience"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { id: "exact", labelAr: "معايا المبلغ مضبوط", labelEn: "Exact amount" },
                    { id: "100", labelAr: "ورقة 100 ج.م", labelEn: "100 EGP bill" },
                    { id: "200", labelAr: "ورقة 200 ج.م", labelEn: "200 EGP bill" },
                    { id: "more", labelAr: "مبلغ أكبر (محتاج فكة)", labelEn: "Need change" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCashChangeFloat(opt.id)}
                      className={`rounded-xl border-2 px-2.5 py-2 text-center text-xs font-bold transition active:scale-95 ${
                        cashChangeFloat === opt.id
                          ? "border-[#184C8A] bg-[#184C8A] text-white shadow-xs"
                          : "border-border/80 bg-white text-foreground/80 hover:border-[#184C8A]/40"
                      }`}
                    >
                      {lang === "ar" ? opt.labelAr : opt.labelEn}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  {lang === "ar"
                    ? "تحديد الفكة يساعد المندوب على تجهيز باقي أموالك بدقة قبل التحرك من الصيدلية."
                    : "Helps the courier prepare your exact change before dispatch."}
                </p>
              </div>
            )}
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
              {payment === "cod" && (
                <div className="mt-2 flex items-start gap-2.5">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[#1E4E8F]" />
                  <span className="text-foreground/80 font-bold">
                    {cashChangeFloat === "exact"
                      ? (lang === "ar" ? "الدفع نقدًا: المبلغ متوفر مضبوط" : "COD: Exact cash ready")
                      : cashChangeFloat === "100"
                        ? (lang === "ar" ? "الدفع نقدًا: مطلوب فكة من ورقة 100 ج.م" : "COD: Change needed for 100 EGP")
                        : cashChangeFloat === "200"
                          ? (lang === "ar" ? "الدفع نقدًا: مطلوب فكة من ورقة 200 ج.م" : "COD: Change needed for 200 EGP")
                          : (lang === "ar" ? "الدفع نقدًا: مطلوب فكة لمبلغ كبير" : "COD: Change needed")}
                  </span>
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
              {campaignOn && fee === 0 && deliveryType === "delivery" && (
                <p className="rounded-xl bg-[#EAF6F1] px-3 py-2 text-[11px] font-bold text-[#2E9E6B]">
                  {t("cart.campaignFree")}
                </p>
              )}
              {!campaignOn && loyaltyFreeShip && deliveryType === "delivery" && (
                <p className="rounded-xl bg-[#EAF6F1] px-3 py-2 text-[11px] font-bold text-[#2E9E6B]">
                  {loyaltyFreeRemaining(loyalty) !== null
                    ? t("loyalty.freeShipLeft").replace(
                        "{n}",
                        String(loyaltyFreeRemaining(loyalty))
                      )
                    : t("loyalty.freeShip")}
                </p>
              )}
              <div className="flex justify-between border-t border-border pt-2 font-heading text-lg font-black">
                <span>{t("cart.total")}</span>
                <span className="text-[#184C8A]">{fmtPrice(total, t)}</span>
              </div>
            </div>

            {!acceptOrders && (
              <p className="rounded-xl bg-[#FEF3C7] px-3.5 py-2.5 text-center text-xs font-black text-[#B45309] ring-1 ring-[#F59E0B]/30">
                {lang === "ar"
                  ? "الصيدلية واقفة استقبال الطلبات مؤقتًا — سلتك محفوظة، ارجع كمان شوية"
                  : "The pharmacy is temporarily not accepting orders — your cart is saved"}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="h-12 flex-1 rounded-full font-bold active:scale-95" onClick={() => setStep(2)}>
                {t("checkout.back")}
              </Button>
              <Button
                disabled={orderPlacing || !acceptOrders}
                className="h-12 flex-1 rounded-full text-base font-black bg-gradient-to-r from-[#184C8A] to-[#113665] text-white shadow-md shadow-[#184C8A]/25 hover:shadow-lg hover:shadow-[#184C8A]/35 active:scale-[0.98] transition-all disabled:opacity-60"
                onClick={async () => {
                  const resolvedCity =
                    zoneId === "custom-village" && customVillageName.trim()
                      ? customVillageName.trim()
                      : zone && deliveryType === "delivery"
                        ? (lang === "ar" ? zone.nameAr : zone.nameEn)
                        : lang === "ar" ? BRANCH.nameAr : BRANCH.nameEn;

                  const villagePart =
                    zoneId === "custom-village" && customVillageName.trim()
                      ? `[${customVillageName.trim()}] `
                      : "";
                  const changePart =
                    payment === "cod" && cashChangeFloat !== "exact"
                      ? ` [فكة: ${cashChangeFloat === "100" ? "ورقة 100 ج.م" : cashChangeFloat === "200" ? "ورقة 200 ج.م" : "مطلوب فكة لمبلغ كبير"}]`
                      : "";
                  const notesPart = notes.trim() ? ` [ملاحظات: ${notes.trim()}]` : "";
                  const discreetPart = discreet ? ` [تغليف خاص]` : "";

                  const resolvedAddress = `${villagePart}${address.trim()}${notesPart}${changePart}${discreetPart}`.trim();
                  /* بنستنى حكم السيرفر: الرفض بيخلّي العميل هنا وسلته سليمة */
                  const id = await placeOrder({
                    address: resolvedAddress,
                    phone: phoneNorm,
                    payment,
                    name,
                    city: resolvedCity,
                    deliveryType,
                    zoneId: deliveryType === "delivery" ? zoneId : undefined,
                    slotId: deliveryType === "delivery" ? slotId : undefined,
                    discreetPackaging: discreet,
                    lat: deliveryType === "delivery" ? pin?.lat : undefined,
                    lng: deliveryType === "delivery" ? pin?.lng : undefined,
                    addressId: deliveryType === "delivery" ? (selectedAddressId ?? undefined) : undefined,
                  });
                  if (!id) return;
                  /* عنوان جديد اتكتب في الطلب ده؟ بيتحفظ في دفتر العميل
                     وبيبقى هو آخر عنوان (المحدد تلقائيًا في الطلب الجاي) */
                  if (deliveryType === "delivery" && !selectedAddressId && address.trim()) {
                    const saved = addSavedAddress({
                      phone: phoneNorm,
                      label: newLabel,
                      details: address.trim(),
                      city: resolvedCity,
                      lat: pin?.lat,
                      lng: pin?.lng,
                      isDefault: savedAddresses.length === 0,
                    });
                    useBahbah.setState({ lastAddressId: saved.id });
                  }
                  toast.success(t("checkout.success"));
                }}
              >
                <CheckCircle2 className="size-5" />
                {orderPlacing
                  ? lang === "ar"
                    ? "جارٍ تأكيد الطلب…"
                    : "Placing order…"
                  : t("checkout.place")}
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

  const waMessage = order
    ? `السلام عليكم د. هاشم (صيدلية بحبح)، قمت بعمل طلب جديد من الموقع برقم (${order.id}):
الحالة: الطلب مسجّل ولسه في انتظار تأكيد الصيدلية
الاسم: ${order.customerAr || ""}
الهاتف: ${order.phone || ""}
العنوان: ${order.address || ""}
إجمالي الحساب: ${order.total} ج.م
طريقة الدفع: ${order.payment === "cod" ? "دفع عند الاستلام" : order.payment}${order.discreetPackaging ? "\nالتغليف: تغليف خاص — علبة/كيس سادة بدون أي علامات" : ""}
الأصناف المطلوبة:
${(order.items || []).map((it) => `- ${it.nameAr || it.productId} (عدد ${it.qty})`).join("\n")}

برجاء مراجعة الطلب وتأكيده قبل التجهيز.`
    : `السلام عليكم صيدلية بحبح، قمت بعمل طلب جديد من الموقع برقم (${lastOrderId}) وهو في انتظار تأكيدكم.`;

  const waUrl = `https://wa.me/201011500166?text=${encodeURIComponent(waMessage)}`;

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center md:py-20">
      <div className="grid size-24 place-items-center rounded-full bg-[#EAF6F1]">
        <PartyPopper className="size-11 text-[#2E9E6B]" />
      </div>
      <h1 className="mt-6 font-heading text-3xl font-black">{t("checkout.success")}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
        {lang === "ar"
          ? "تم تسجيل طلبك في سيستم صيدلية بحبح وهو دلوقتي في انتظار تأكيد الصيدلية — هنواصل معاك للتأكيد قبل التجهيز. للتأكيد السريع ابعته على واتساب الصيدلية من الزر تحت."
          : t("checkout.successD")}
      </p>

      {order && isNightOrder(order.createdAt ?? order.date) && (
        <p className="mt-4 rounded-full border border-[#F59E0B]/40 bg-[#FFFBEB] px-5 py-2 font-heading text-sm font-black text-[#B45E0A]">
          🌙 {t("checkout.nightLine")}
        </p>
      )}

      {lastOrderId && (
        <Badge className="mt-4 rounded-full bg-[#EAF1F9] px-6 py-2.5 font-heading text-lg font-black text-[#1E4E8F] hover:bg-[#EAF1F9]">
          {t("checkout.orderNo")}: {lastOrderId}
        </Badge>
      )}

      {/* Primary WhatsApp Action Button */}
      <div className="mt-6 w-full max-w-md">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-[#25D366] text-sm md:text-base font-black text-white shadow-xl shadow-[#25D366]/30 hover:brightness-105 active:scale-95 transition-all"
        >
          <IconWhatsapp className="size-6 shrink-0" />
          <span>
            {lang === "ar"
              ? "📲 إرسال الطلب لواتساب الصيدلية فوراً لتأكيد الشحن"
              : "Send Order to Pharmacy WhatsApp Now"}
          </span>
        </a>
        <p className="mt-2 text-xs text-muted-foreground">
          {lang === "ar"
            ? "اضغط لإرسال بيانات طلبك تلقائياً لدكتور هاشم بحبح عشان يراجعه ويأكده"
            : "Click to forward order details directly to pharmacist on WhatsApp for review & confirmation"}
        </p>
      </div>

      {/* delivery assignment card */}
      {order?.delivery && (
        <div className="mt-6 flex w-full max-w-md items-center gap-3 rounded-2xl border border-[#F09428]/30 bg-[#FFF4E5]/70 p-4 text-start">
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
                  : "كابتن أسطول بحبح"}
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-[#B45E0A]">
              {order.delivery.type === "pickup"
                ? t("dv.pickupReady")
                : (lang === "ar" ? order.delivery.slotAr : order.delivery.slotEn)}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex w-full max-w-md flex-col gap-2.5">
        <Button
          size="lg"
          className="h-12 w-full rounded-full text-base font-bold bg-[#184C8A] text-white hover:bg-[#112D51]"
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
