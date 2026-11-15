"use client";

import {
  Bike,
  Pill,
  ShieldCheck,
  Facebook,
  Smartphone,
  Download,
  Share2,
  MoreVertical,
  CheckCircle2,
  Sparkles,
  Flame,
  Camera,
  CalendarClock,
  MessageCircle,
  ArrowUpRight,
} from "lucide-react";
import { useEffect, useMemo, useState, useRef, useSyncExternalStore } from "react";
import Image from "next/image";
import {
  IconHomeSoft,
  IconGridCats,
  IconCartBag,
  IconHeartLine,
  IconUserRound,
  IconSearchGlass,
  IconRxSheet,
  IconOtpBox,
  IconGlobe,
  IconPhone,
  IconPlus,
  IconMinus,
  IconTrash,
  IconClock,
  IconPin,
  IconXMark,
  IconShieldCheck,
  IconChevronR,
  IconMic,
  IconWhatsapp,
  IconCapsule,
  IconRefill,
} from "./icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadRxPrescriptionImage } from "@/lib/supabase";
import {
  products,
  getProduct,
  SHIPPING_FEE,
  categories,
  WASLY,
  PHARMACY,
  DOCTOR_TECH,
} from "@/lib/bahbah/data";
import {
  useBahbah,
  useT,
  cartCount,
  useSiteInfo,
} from "@/lib/bahbah/store";
import { toast } from "sonner";
import { fmtPrice } from "./product-card";

/* ------------------------------------------------------------------ */
/* Syncs <html dir/lang> with the selected language                    */
/* ------------------------------------------------------------------ */
export function LangSync() {
  const lang = useBahbah((s) => s.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  return null;
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */
export function Header() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const cart = useBahbah((s) => s.cart);
  const favs = useBahbah((s) => s.favorites);
  const user = useBahbah((s) => s.user);
  const view = useBahbah((s) => s.view);
  const siteEdits = useBahbah((s) => s.siteEdits);
  const { go, openCatalog, setCartOpen, setSearchOpen, toggleLang, openAccount, setConsultOpen, setInstallAppOpen } = useBahbah();
  const count = cartCount(cart);

  const navItems: { label: string; onClick: () => void; active: boolean }[] = [
    { label: t("nav.home"), onClick: () => go("home"), active: view === "home" },
    { label: t("nav.catalog"), onClick: () => openCatalog(null), active: view === "catalog" || view === "product" },
    { label: t("nav.offers"), onClick: () => go("offers"), active: view === "offers" },
    { label: t("nav.care"), onClick: () => go("care"), active: view === "care" },
    { label: t("nav.favorites"), onClick: () => openAccount("favorites"), active: false },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-white/90 backdrop-blur-xl shadow-[0_2px_15px_-3px_rgba(11,30,56,0.04)]">
      {/* Top micro announcement bar */}
      <div className="hidden border-b border-white/10 bg-[#0B1E38] px-4 py-1.5 text-xs text-white/85 sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 text-[#F59E0B]">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#10B981] opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-[#10B981]" />
              </span>
              {siteEdits?.shippingPromiseAr || (lang === "ar" ? "شحن سريع لجميع المحافظات" : "Fast Shipping Across Egypt")}
            </span>
            <span className="hidden text-white/30 md:inline">|</span>
            <span className="hidden items-center gap-1.5 text-white/80 md:flex">
              <IconShieldCheck className="size-3.5 text-[#10B981]" />
              {siteEdits?.deliveryPromiseAr || (lang === "ar" ? "توصيل 24 ساعة بإشراف صيدلي معتمد" : "24/7 Delivery Under Pharmacist Care")}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-bold">
            <button
              onClick={() => setInstallAppOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/30 hover:text-white"
            >
              <Smartphone className="size-3 text-emerald-400" />
              {lang === "ar" ? "📱 تثبيت التطبيق" : "📱 Install App"}
            </button>
            <span className="text-white/30">|</span>
            <a href={`tel:${WASLY.hotline}`} dir="ltr" className="flex items-center gap-1.5 text-white/90 transition hover:text-[#F59E0B]">
              <IconPhone className="size-3 text-[#F59E0B]" />
              {WASLY.hotline}
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-20 max-w-7xl items-center gap-3 px-4 md:h-24 md:px-6">
        {/* brand */}
        <button className="flex items-center gap-3 transition-transform hover:scale-[1.02] active:scale-95" onClick={() => go("home")}>
          <div className="relative size-16 shrink-0 md:size-20">
            <Image
              src="/images/bahbah-badge.png"
              alt="Bahbah Pharmacy"
              width={80}
              height={80}
              className="size-full rounded-full bg-white p-1 shadow-md ring-2 ring-border/50 object-contain"
              priority
            />
          </div>
          <div className="text-start leading-tight">
            <div className="font-heading text-xl font-black text-[#D97706] md:text-3xl">
              {t("brand.name")}
            </div>
            <div className="hidden text-xs font-black tracking-widest text-[#184C8A] sm:block">
              BAHBAH PHARMACY
            </div>
          </div>
        </button>

        {/* desktop nav */}
        <nav className="ms-6 hidden items-center gap-1 lg:flex">
          {navItems.map((n) => (
            <button
              key={n.label}
              onClick={n.onClick}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 ${
                n.active
                  ? "bg-[#184C8A]/10 text-[#184C8A] shadow-sm"
                  : "text-foreground/75 hover:bg-muted hover:text-foreground active:scale-95"
              }`}
            >
              {n.label}
            </button>
          ))}
        </nav>

        {/* desktop search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="group mx-auto hidden h-11 w-full max-w-md items-center justify-between rounded-full border border-border/80 bg-muted/60 px-4 text-sm text-muted-foreground shadow-inner transition hover:border-[#184C8A]/40 hover:bg-white hover:shadow-sm md:flex"
        >
          <div className="flex items-center gap-2.5 truncate">
            <IconSearchGlass className="size-4.5 text-muted-foreground transition group-hover:text-[#184C8A]" />
            <span className="truncate">{t("nav.search")}</span>
          </div>
          <span className="flex items-center gap-1 rounded-md bg-background px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground ring-1 ring-border">
            ⌘K
          </span>
        </button>

        <div className="ms-auto flex items-center gap-1.5 md:ms-0">
          {/* language */}
          <button
            onClick={() => {
              toggleLang();
              toast.success(lang === "ar" ? "Switched to English" : "تم التبديل للعربية");
            }}
            className="hidden h-10 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-bold text-foreground/80 transition hover:border-[#184C8A]/50 hover:text-[#184C8A] active:scale-95 sm:flex"
          >
            <IconGlobe className="size-4" />
            {t("nav.langSwitch")}
          </button>

          {/* favorites (desktop) */}
          <button
            onClick={() => openAccount("favorites")}
            className="relative hidden size-10 place-items-center rounded-full text-foreground/70 transition hover:bg-muted hover:text-[#184C8A] active:scale-95 md:grid"
            aria-label={t("nav.favorites")}
          >
            <IconHeartLine className="size-5" />
            {favs.length > 0 && (
              <span className="bb-pop absolute -top-0.5 -end-0.5 grid size-5 place-items-center rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] text-[10px] font-black text-white shadow-sm">
                {favs.length}
              </span>
            )}
          </button>

          {/* account */}
          <button
            onClick={() => go(user ? "account" : "login")}
            className="hidden size-10 place-items-center rounded-full text-foreground/70 transition hover:bg-muted hover:text-[#184C8A] active:scale-95 md:grid"
            aria-label={t("nav.account")}
          >
            <IconUserRound className="size-5" />
          </button>

          {/* install app (mobile) */}
          <button
            onClick={() => setInstallAppOpen(true)}
            className="grid size-10 place-items-center rounded-full text-foreground/70 transition hover:bg-muted active:scale-95 md:hidden"
            aria-label={lang === "ar" ? "تثبيت التطبيق" : "Install App"}
          >
            <Smartphone className="size-5 text-emerald-600" />
          </button>

          {/* search (mobile) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="grid size-10 place-items-center rounded-full text-foreground/70 transition hover:bg-muted active:scale-95 md:hidden"
            aria-label={t("search.title")}
          >
            <IconSearchGlass className="size-5" />
          </button>

          {/* install app (desktop) */}
          <button
            onClick={() => setInstallAppOpen(true)}
            className="hidden h-10 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50/50 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 hover:text-emerald-800 active:scale-95 lg:flex"
            aria-label={lang === "ar" ? "تثبيت التطبيق" : "Install App"}
          >
            <Smartphone className="size-4 text-emerald-600" />
            <span>{lang === "ar" ? "تطبيق الهاتف" : "Mobile App"}</span>
          </button>

          {/* ask pharmacist (fixed in header) */}
          <button
            onClick={() => setConsultOpen(true)}
            className="hidden h-10 items-center gap-1.5 rounded-full border border-[#10B981]/30 bg-[#ECFDF5] px-3.5 text-xs font-black text-[#059669] transition hover:bg-[#10B981] hover:text-white active:scale-95 shadow-xs sm:flex"
            aria-label={lang === "ar" ? "استشارة صيدلي" : "Ask Pharmacist"}
          >
            <IconPhone className="size-3.5" />
            <span>{lang === "ar" ? "اسأل صيدلي" : "Ask Pharmacist"}</span>
          </button>

          {/* cart */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative grid size-11 place-items-center rounded-full bg-gradient-to-r from-[#184C8A] to-[#0B1E38] text-white shadow-md shadow-[#184C8A]/25 transition-all duration-200 hover:shadow-lg hover:shadow-[#184C8A]/35 hover:scale-105 active:scale-95"
            aria-label={t("nav.cart")}
          >
            <IconCartBag className="size-5" />
            {count > 0 && (
              <span className="bb-pop absolute -top-1 -end-1 grid size-5.5 place-items-center rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] px-1 text-[11px] font-black text-white ring-2 ring-background shadow-sm">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* lang on very small screens */}
      <div className="flex justify-center pb-2 sm:hidden">
        <button
          onClick={toggleLang}
          className="flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[11px] font-bold text-foreground/70"
        >
          <IconGlobe className="size-3.5" />
          {t("nav.langSwitch")}
        </button>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile bottom navigation                                            */
/* ------------------------------------------------------------------ */
export function BottomNav() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const view = useBahbah((s) => s.view);
  const cart = useBahbah((s) => s.cart);
  const { go, openCatalog, setCartOpen, openAccount, setConsultOpen } = useBahbah();
  const count = cartCount(cart);
  const hidden = view === "admin";

  if (hidden) return null;

  const items: {
    key: string;
    label: string;
    icon: any;
    onClick: () => void;
    active: boolean;
    badge?: number;
    special?: boolean;
  }[] = [
    { key: "home", label: t("nav.home"), icon: IconHomeSoft, onClick: () => go("home"), active: view === "home" },
    { key: "catalog", label: t("nav.catalog"), icon: IconGridCats, onClick: () => openCatalog(null), active: view === "catalog" || view === "product" },
    {
      key: "consult",
      label: lang === "ar" ? "اسأل صيدلي" : "Consult",
      icon: IconPhone,
      onClick: () => setConsultOpen(true),
      active: false,
      special: true,
    },
    { key: "cart", label: t("nav.cart"), icon: IconCartBag, onClick: () => setCartOpen(true), active: view === "cart" || view === "checkout", badge: count },
    { key: "account", label: t("nav.account"), icon: IconUserRound, onClick: () => openAccount("orders"), active: view === "account" || view === "login" || view === "track" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-white/95 pb-safe backdrop-blur-xl shadow-[0_-4px_25px_rgba(11,30,56,0.06)] md:hidden">
      <div className="grid grid-cols-5">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={it.onClick}
            className="relative flex h-16 flex-col items-center justify-center gap-1 transition active:scale-95"
          >
            {it.special ? (
              <span className="grid size-7 place-items-center rounded-full bg-[#ECFDF5] text-[#059669] shadow-xs ring-1 ring-[#10B981]/25">
                <it.icon className="size-4 text-[#059669]" />
              </span>
            ) : (
              <span className="relative">
                <it.icon
                  className={`size-5.5 transition-colors ${it.active ? "text-[#184C8A]" : "text-foreground/50"}`}
                  strokeWidth={it.active ? 2.4 : 1.9}
                />
                {"badge" in it && (it.badge ?? 0) > 0 && (
                  <span className="bb-pop absolute -top-1.5 -end-2 grid size-4.5 place-items-center rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] px-1 text-[10px] font-black text-white shadow-sm ring-1 ring-white">
                    {it.badge}
                  </span>
                )}
              </span>
            )}
            <span
              className={`text-[10px] font-bold ${
                it.special
                  ? "font-black text-[#059669]"
                  : it.active
                    ? "text-[#184C8A]"
                    : "text-foreground/55"
              }`}
            >
              {it.label}
            </span>
            {it.active && (
              <span className="absolute top-0 h-1 w-7 rounded-full bg-gradient-to-r from-[#184C8A] to-[#0284C7] shadow-sm" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Cart drawer (bottom sheet)                                          */
/* ------------------------------------------------------------------ */
export function CartDrawer() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const cartOpen = useBahbah((s) => s.cartOpen);
  const cart = useBahbah((s) => s.cart);
  /* عتبة التوصيل المجاني — من لوحة الإدارة */
  const freeGoal = Math.max(0, useBahbah((s) => s.settings.freeThreshold));
  const { setCartOpen, setQty, removeFromCart, go } = useBahbah();

  const lines = cart.map((c) => ({ ...c, p: getProduct(c.productId)! })).filter((l) => l.p);
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const threshold = freeGoal > 0 ? freeGoal : Infinity;
  const shipping = subtotal === 0 || subtotal >= threshold ? 0 : SHIPPING_FEE;
  const remaining = Math.max(0, (freeGoal || Infinity) - subtotal);

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent side="bottom" className="mx-auto max-h-[88vh] w-full max-w-lg rounded-t-3xl p-0">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center justify-between font-heading text-lg font-black">
            {t("cart.title")}
            <span className="text-sm font-bold text-muted-foreground">
              {cartCount(cart)} {t("cart.items")}
            </span>
          </SheetTitle>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div className="grid size-16 place-items-center rounded-full bg-muted">
              <IconCartBag className="size-7 text-muted-foreground" />
            </div>
            <p className="font-heading font-bold">{t("cart.empty")}</p>
            <p className="text-sm text-muted-foreground">{t("cart.emptyD")}</p>
            <Button
              className="mt-2 rounded-full px-8 font-bold"
              onClick={() => go("catalog")}
            >
              {t("cart.continue")}
            </Button>
          </div>
        ) : (
          <>
            <div className="nice-scrollbar max-h-[44vh] overflow-y-auto px-5 py-3">
              {lines.map((l) => (
                <div key={l.productId} className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0">
                  <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted">
                    <l.p.icon className={`size-5 ${catColor(l.p.category)}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {lang === "ar" ? l.p.nameAr : l.p.nameEn}
                    </p>
                    <p className="font-heading text-sm font-black text-[#184C8A]">
                      {fmtPrice(l.p.price, t)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      className="grid size-7 place-items-center rounded-full border border-border bg-white shadow-xs transition hover:bg-muted active:scale-90"
                      onClick={() => setQty(l.productId, l.qty - 1)}
                      aria-label="minus"
                    >
                      <IconMinus className="size-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{l.qty}</span>
                    <button
                      className="grid size-7 place-items-center rounded-full border border-border bg-white shadow-xs transition hover:bg-muted active:scale-90"
                      onClick={() => setQty(l.productId, l.qty + 1)}
                      aria-label="plus"
                    >
                      <IconPlus className="size-3.5" />
                    </button>
                    <button
                      className="grid size-7 place-items-center rounded-full text-[#DC2626] hover:bg-[#DC2626]/10 transition active:scale-90"
                      onClick={() => removeFromCart(l.productId)}
                      aria-label={t("cart.remove")}
                    >
                      <IconTrash className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2.5 border-t border-border bg-muted/40 px-5 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                <span className="font-bold">{fmtPrice(subtotal, t)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("cart.delivery")}</span>
                <span className={`font-bold ${shipping === 0 ? "text-[#059669]" : ""}`}>
                  {shipping === 0 ? t("cart.free") : fmtPrice(shipping, t)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-heading text-base font-black">
                <span>{t("cart.total")}</span>
                <span className="text-[#184C8A]">{fmtPrice(subtotal + shipping, t)}</span>
              </div>
              {remaining > 0 ? (
                <p className="rounded-xl bg-[#FFFBEB] px-3 py-2 text-center text-xs font-bold text-[#D97706] ring-1 ring-[#F59E0B]/20">
                  {t("cart.freeNote").replace("{x}", remaining.toLocaleString("en-US"))}
                </p>
              ) : (
                <p className="rounded-xl bg-[#ECFDF5] px-3 py-2 text-center text-xs font-bold text-[#059669] ring-1 ring-[#10B981]/20">
                  {t("cart.freeDone")}
                </p>
              )}
              <Button
                className="h-12 w-full rounded-full bg-gradient-to-r from-[#184C8A] to-[#113665] text-base font-black text-white shadow-md shadow-[#184C8A]/25 transition hover:shadow-lg hover:shadow-[#184C8A]/35 active:scale-[0.98]"
                onClick={() => go("checkout")}
              >
                {t("cart.checkout")}
                <IconChevronR className="size-4 rtl:rotate-180" />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function catColor(categoryId: string): string {
  const cat = categories.find((c) => c.id === categoryId);
  return cat ? cat.color : "text-[#1E4E8F]";
}

/* ------------------------------------------------------------------ */
/* Egyptian Dialect Voice Engine & Medical Intent Resolver            */
/* ------------------------------------------------------------------ */

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: any) => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const emptySubscribe = () => () => {};

// Conversational Egyptian words to strip before searching
const EG_CONVERSATIONAL_WORDS = [
  "عاوز", "عايز", "عايزه", "عايزة", "عاوزه", "عاوزة", "عاوزين", "عايزين",
  "محتاج", "محتاجه", "محتاجة", "محتاجين",
  "عندكم", "عندك", "فيه", "في", "لو سمحت", "لو سمحتي", "بالله عليك", "بقولك",
  "هاتلي", "هات", "شوفلي", "ابعتلي", "ابعت",
  "دوا", "دواء", "علاج", "حاجة", "حاجه", "شريط", "علبة", "علبه", "كرتونة",
  "امبول", "امبولات", "حقنة", "حقن", "مرهم", "كريم", "قطرة", "قطره", "فوار",
  "كبسول", "كبسولات", "أقراص", "اقراص", "قرص", "برشام", "لبوس", "بخاخ", "نقط",
  "بكام", "سعر", "سعره", "سعرها", "من فضلك", "ممكن", "فين", "عاوز اطلب", "عايز اطلب",
  "بتاع", "بتاعت", "لـ", "للـ"
];

// Symptoms and Egyptian complaints mapped to active medical products
const SYMPTOM_TREATMENTS: Record<string, { label: string; terms: string[] }> = {
  صداع: {
    label: "صداع ومسكنات ألم",
    terms: ["بانادول", "بنادول", "بروفين", "كيتوفان", "كتافلام", "باراسيتامول", "سولبادين", "ادول"],
  },
  سخونية: {
    label: "سخونية وخافض حرارة",
    terms: ["باراسيتامول", "بروفين", "بانادول", "سيتال", "كونجستال", "ابيمول"],
  },
  حرارة: {
    label: "ارتفاع درجة الحرارة",
    terms: ["باراسيتامول", "بروفين", "بانادول", "سيتال", "كونجستال"],
  },
  مغص: {
    label: "مغص وتقلصات ومعدة",
    terms: ["سبازمو", "كولونا", "ديجستين", "انتودين", "فلاجيل", "بوسكوبان", "فيسرالجين"],
  },
  قولون: {
    label: "قولون وانتفاخ",
    terms: ["كولونا", "ديسبلاتيل", "كولوفيرين", "ديجستين", "انتودين"],
  },
  حموضة: {
    label: "حموضة وحرقان المعدة",
    terms: ["انتودين", "جافيسكون", "نيكسيوم", "اوميبرازول", "كونترولوك", "فوار راني", "مالوكس"],
  },
  كحة: {
    label: "كحة وسعال وبلغم",
    terms: ["ايفيبرونت", "برونشيكم", "فاركولين", "سيلجون", "بلسم", "توسيفان"],
  },
  بلغم: {
    label: "مذيب وطارد للبلغم",
    terms: ["ميوكوسول", "استيل سيستايين", "برونشيكم", "فاركولين", "ايفيبرونت"],
  },
  برد: {
    label: "برد ورشح وزكام",
    terms: ["كونجستال", "كومتركس", "وان تو ثري", "سي ريتارد", "تلفاست", "اوترفين", "فلورست"],
  },
  رشح: {
    label: "رشح وعطس واحتقان",
    terms: ["كونجستال", "تلفاست", "اوترفين", "زيرتك", "كومتركس"],
  },
  ضغط: {
    label: "أدوية الضغط",
    terms: ["كونكور", "كابوتن", "اكسفورج", "املوديبين", "نورفاسك", "تارجريت"],
  },
  سكر: {
    label: "أدوية وتنظيم السكر",
    terms: ["جلوكوفاج", "اماريل", "جليماكس", "جانوفيا", "انسولين"],
  },
  حساسية: {
    label: "حساسية وهرش وجيوب أنفية",
    terms: ["تلفاست", "زيرتك", "كلاريتين", "هيستوب", "فنستيل"],
  },
  عين: {
    label: "قطرات وترطيب العين",
    terms: ["سيستان", "تيرز", "تيرز جارد", "توبركس", "قطرة"],
  },
  شعر: {
    label: "تساقط وعناية بالشعر",
    terms: ["بيوتين", "بانتوجار", "شامبو", "سيروم", "شعر"],
  },
  بشرة: {
    label: "حب الشباب والعناية بالبشرة",
    terms: ["ستارفيل", "سيرافي", "لاروش", "صن بلوك", "كريم", "تفتيح"],
  },
  اطفال: {
    label: "أدوية ومستلزمات الأطفال",
    terms: ["بامبرز", "بيبيلاك", "نان", "سودوكريم", "سيتال", "دنتينوكس"],
  },
  فيتامين: {
    label: "فيتامينات ومقويات ومناعة",
    terms: ["ليميتلس", "سانسوفيت", "فيروجلوبين", "فيتامين سي", "زنك", "اوميجا 3"],
  },
  حروق: {
    label: "حروق وجروح",
    terms: ["ميبو", "بيبانثين", "فيوسيدين", "ديرمازين"],
  },
  اسنان: {
    label: "مسكنات ألم الأسنان",
    terms: ["كيتوفان", "كتافلام", "بروفين", "سولبادين", "دينتيل"],
  },
};

function normAr(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .trim();
}

function parseEgyptianVoiceQuery(raw: string) {
  const normalized = normAr(raw);
  const words = normalized.split(/\s+/).filter(Boolean);

  let intent: "rx" | "care" | "offers" | "pharmacist" | null = null;
  if (words.some((w) => ["روشته", "روشتة", "صوره", "صورة", "دكتور", "تكرار"].includes(w))) {
    intent = "rx";
  } else if (words.some((w) => ["شهري", "شهريه", "شهرية", "مزمن", "مزمنه", "مزمنة"].includes(w))) {
    intent = "care";
  } else if (words.some((w) => ["عرض", "عروض", "خصم", "خصومات", "تخفيض", "اوفر"].includes(w))) {
    intent = "offers";
  } else if (words.some((w) => ["صيدلي", "استشاره", "استشارة", "واتساب", "تليفون"].includes(w))) {
    intent = "pharmacist";
  }

  let detectedSymptom: string | null = null;
  const expandedTerms: string[] = [];

  for (const [symptomKey, config] of Object.entries(SYMPTOM_TREATMENTS)) {
    const normKey = normAr(symptomKey);
    if (words.some((w) => w.includes(normKey) || normKey.includes(w))) {
      detectedSymptom = config.label;
      expandedTerms.push(...config.terms.map(normAr));
    }
  }

  const normFillers = EG_CONVERSATIONAL_WORDS.map(normAr);
  const cleanTokens = words.filter((w) => !normFillers.includes(w) && w.length > 1);

  return {
    cleanTokens,
    expandedTerms,
    intent,
    detectedSymptom,
  };
}

/* ------------------------------------------------------------------ */
/* Search & Voice Dialog                                               */
/* ------------------------------------------------------------------ */
export function SearchDialog() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const open = useBahbah((s) => s.searchOpen);
  const { setSearchOpen, openProduct, openCatalog, setRxOpen, go } = useBahbah();
  const [q, setQ] = useState("");
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");

  const addToCart = useBahbah((s) => s.addToCart);

  /* Web Speech API in Egyptian Dialect */
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const startListening = () => {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("متصفحك لا يدعم خاصية البحث الصوتي مباشرة. يمكنك الكتابة في المربع أعلاه.");
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort?.();
      }

      const rec = new Ctor();
      rec.lang = "ar-EG"; // اللهجة المصرية
      rec.interimResults = true;
      rec.maxAlternatives = 3;

      rec.onresult = (e: any) => {
        const transcript = e.results?.[0]?.[0]?.transcript ?? "";
        setInterimText(transcript);
        if (e.results?.[0]?.isFinal || e.results?.[0]?.[0]?.confidence > 0.6) {
          setQ(transcript);
        }
      };

      rec.onerror = (err: any) => {
        setListening(false);
        setInterimText("");
        if (err?.error !== "no-speech") {
          toast.error("برجاء السماح بالمايكروفون للبحث الصوتي");
        }
      };

      rec.onend = () => {
        setListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
      setListening(true);
      setInterimText("سامعك كويس... اتكلم براحتك باللهجة المصرية");
    } catch {
      setListening(false);
      setInterimText("");
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    setListening(false);
  };

  // Close cleans up
  useEffect(() => {
    if (!open && listening) {
      stopListening();
    }
  }, [open]);

  // Egyptian query analysis
  const analysis = useMemo(() => {
    const raw = q.trim() || interimText.trim();
    if (!raw) return null;
    return parseEgyptianVoiceQuery(raw);
  }, [q, interimText]);

  // Fast Product Matching across 1544 products
  const results = useMemo(() => {
    const query = q.trim();
    if (!query) return [];
    const nq = normAr(query);
    const lq = query.toLowerCase();

    const cleanTokens = analysis?.cleanTokens ?? [];
    const expanded = analysis?.expandedTerms ?? [];

    return products
      .filter((p) => {
        const fullAr = normAr([p.nameAr, p.ingredientAr, p.brandAr, p.formAr, p.descAr].join(" "));
        const fullEn = [p.nameEn, p.ingredientEn, p.brandEn, p.formEn].join(" ").toLowerCase();

        // Direct exact or partial match
        if (fullAr.includes(nq) || fullEn.includes(lq)) return true;

        // Clean tokens match (e.g. "عاوز بنادول احمر" -> matches "بنادول" AND "احمر" or any)
        if (cleanTokens.length > 0 && cleanTokens.some((tok) => fullAr.includes(tok) || fullEn.includes(tok))) {
          return true;
        }

        // Expanded symptom treatments match
        if (expanded.length > 0 && expanded.some((term) => fullAr.includes(term))) {
          return true;
        }

        return false;
      })
      .slice(0, 20);
  }, [q, analysis]);

  const voiceSampleChips = [
    "عايز بنادول أحمر",
    "حاجة للمغص والقولون",
    "دوا كحة وبلغم",
    "فيتامين سي وأوميجا",
    "كريم مرطب وتفتيح",
    "علاج للسكر",
    "روشتة دكتور",
    "عروض الصيدلية",
  ];

  return (
    <Dialog open={open} onOpenChange={setSearchOpen}>
      <DialogContent aria-describedby={undefined} className="top-[10%] max-w-xl translate-y-0 rounded-3xl p-0 shadow-2xl border-border/80 overflow-hidden">
        <DialogHeader className="px-5 pb-0 pt-5">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 font-heading text-lg font-black text-[#1E4E8F]">
              <IconMic className="size-5 text-[#F09428]" />
              البحث الذكي والصوتي باللهجة المصرية
            </DialogTitle>
            <Badge className="bg-[#EAF1F9] text-[#1E4E8F] text-[10px] font-bold hover:bg-[#EAF1F9]">
              صوت مصري 100%
            </Badge>
          </div>
        </DialogHeader>

        {/* Search Input Bar + Live Mic Button */}
        <div className="px-5 pt-3 pb-2">
          <div className="relative">
            <IconSearchGlass className="absolute top-1/2 start-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="اكتب اسم الدواء أو تحدث بالمايك باللهجة المصرية..."
              className="h-12 rounded-full ps-11 pe-12 text-sm md:text-base border-border/80 focus-visible:ring-[#1E4E8F]"
            />
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              aria-label={listening ? "إيقاف الاستماع" : "بدء البحث الصوتي"}
              title="تحدث بالمايك باللهجة المصرية"
              className={`absolute top-1/2 end-2.5 grid size-8.5 -translate-y-1/2 place-items-center rounded-full transition-all active:scale-95 ${
                listening
                  ? "animate-pulse bg-[#DC4B4B] text-white shadow-md shadow-red-500/40"
                  : "bg-[#1E4E8F] text-white hover:bg-[#112D51]"
              }`}
            >
              <IconMic className="size-4" />
            </button>
          </div>
        </div>

        {/* Live Voice Listening Pulse Banner */}
        {listening && (
          <div className="mx-5 mb-2 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50/90 p-3 text-red-900 animate-in fade-in slide-in-from-top-1 dark:border-red-950 dark:bg-red-950/40 dark:text-red-200">
            <div className="flex items-center gap-3">
              <span className="relative flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-red-600" />
              </span>
              <div>
                <p className="text-xs font-black">جاري الاستماع لصوتك الآن...</p>
                <p className="text-[11px] font-semibold text-red-700/80 dark:text-red-300">
                  {interimText || "اتكلم براحتك (مثال: عايز بنادول أحمر، حاجة للمغص والقولون)"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={stopListening}
              className="h-7 rounded-full border-red-300 bg-white text-[10px] font-bold text-red-700 hover:bg-red-50"
            >
              تم
            </Button>
          </div>
        )}

        {/* Detected Smart Shortcuts Banner (Rx, Care, Offers, WhatsApp) */}
        {analysis?.intent && (
          <div className="mx-5 mb-2 rounded-2xl bg-gradient-to-r from-[#1E4E8F]/10 via-[#2E9E6B]/10 to-transparent p-3 border border-[#1E4E8F]/20">
            {analysis.intent === "rx" && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Camera className="size-4 text-[#1E4E8F]" />
                  <span className="text-xs font-bold">فهمنا أنك تريد رفع الروشتة وتصويرها</span>
                </div>
                <Button
                  size="sm"
                  className="h-7 rounded-full bg-[#1E4E8F] text-[11px] font-bold text-white hover:bg-[#112D51]"
                  onClick={() => {
                    setSearchOpen(false);
                    setRxOpen(true);
                  }}
                >
                  تصوير الروشتة الآن ←
                </Button>
              </div>
            )}

            {analysis.intent === "care" && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarClock className="size-4 text-[#2E9E6B]" />
                  <span className="text-xs font-bold">برنامج عميل الأدوية الشهرية وتكرار العلاج</span>
                </div>
                <Button
                  size="sm"
                  className="h-7 rounded-full bg-[#2E9E6B] text-[11px] font-bold text-white hover:bg-[#238156]"
                  onClick={() => {
                    setSearchOpen(false);
                    go("care");
                  }}
                >
                  فتح الخدمة الشهرية ←
                </Button>
              </div>
            )}

            {analysis.intent === "offers" && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Flame className="size-4 text-[#EA580C]" />
                  <span className="text-xs font-bold">عروض وخصومات بحبح الأسبوعية</span>
                </div>
                <Button
                  size="sm"
                  className="h-7 rounded-full bg-[#EA580C] text-[11px] font-bold text-white hover:bg-[#C2410C]"
                  onClick={() => {
                    setSearchOpen(false);
                    go("offers");
                  }}
                >
                  تصفح العروض الآن ←
                </Button>
              </div>
            )}

            {analysis.intent === "pharmacist" && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-4 text-[#25D366]" />
                  <span className="text-xs font-bold">استشارة الصيدلي المناوب فوراً على واتساب</span>
                </div>
                <Button
                  size="sm"
                  className="h-7 rounded-full bg-[#25D366] text-[11px] font-bold text-white hover:bg-[#1eb757]"
                  onClick={() => {
                    window.open("https://wa.me/201011500166?text=" + encodeURIComponent("السلام عليكم دكتور بحبح، محتاج استشارة صيدلانية بخصوص: " + q), "_blank");
                  }}
                >
                  محادثة واتساب ←
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Detected Egyptian Symptom Feedback */}
        {analysis?.detectedSymptom && (
          <div className="mx-5 mb-1 flex items-center gap-2 text-xs font-bold text-[#1E4E8F]">
            <Sparkles className="size-3.5 text-[#F09428]" />
            <span>عرضنا أدوية مناسبة لـ: {analysis.detectedSymptom}</span>
          </div>
        )}

        {/* Dialog Body */}
        <div className="nice-scrollbar max-h-[50vh] overflow-y-auto px-5 pb-5">
          {!q.trim() && (
            <div>
              <p className="mb-2 text-xs font-bold text-muted-foreground">
                جرب قول بصوتك أو اضغط للبحث المباشر:
              </p>
              <div className="flex flex-wrap gap-2">
                {voiceSampleChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setQ(chip)}
                    className="flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/60 px-3.5 py-1.5 text-xs font-bold text-foreground/75 transition-all hover:border-[#1E4E8F]/40 hover:bg-white hover:text-[#1E4E8F] hover:shadow-sm active:scale-95"
                  >
                    <IconMic className="size-3 text-[#F09428]" />
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {q.trim() && results.length === 0 && (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm font-bold text-muted-foreground">
                لم نجد صنفاً مطابقاً بالضبط لكلمة &quot;{q}&quot;
              </p>
              <p className="text-xs text-muted-foreground">
                يمكنك تصوير الروشتة وسنقوم بتوفيرها، أو استشارة الصيدلي المناوب مباشرة:
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <Button
                  size="sm"
                  className="rounded-full bg-[#1E4E8F] text-xs font-bold"
                  onClick={() => {
                    setSearchOpen(false);
                    setRxOpen(true);
                  }}
                >
                  <Camera className="size-3.5 me-1" />
                  تصوير الروشتة
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-xs font-bold border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10"
                  onClick={() => {
                    window.open("https://wa.me/201011500166?text=" + encodeURIComponent("السلام عليكم، بسأل عن دواء: " + q), "_blank");
                  }}
                >
                  <MessageCircle className="size-3.5 me-1" />
                  اسأل الصيدلي
                </Button>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-1">
              <p className="mb-2 text-xs font-bold text-muted-foreground">
                النتائج المطابقة ({results.length}):
              </p>
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openProduct(p.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-start transition-all hover:border-border/80 hover:bg-[#EAF2FA]/50"
                >
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-white p-1 flex items-center justify-center shadow-xs">
                    {p.img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.img} alt={p.nameAr} className="size-full object-contain" />
                    ) : (
                      <p.icon className="size-5 text-[#184C8A]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {lang === "ar" ? p.nameAr : p.nameEn}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lang === "ar" ? p.formAr || p.ingredientAr : p.formEn || p.ingredientEn}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-heading text-sm font-black text-[#184C8A]">
                      {fmtPrice(p.price, t)}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(p.id, 1);
                        toast.success(lang === "ar" ? "تمت الإضافة للسلة" : "Added to cart");
                      }}
                      className="grid size-8 place-items-center rounded-lg bg-[#184C8A]/10 hover:bg-[#184C8A] text-[#184C8A] hover:text-white transition-all font-black text-sm active:scale-90 shadow-xs"
                    >
                      +
                    </span>
                  </div>
                </button>
              ))}
              <button
                onClick={() => openCatalog(null)}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-[#184C8A]/10 to-[#184C8A]/5 py-2.5 text-sm font-bold text-[#184C8A] transition hover:bg-[#184C8A]/15 active:scale-98"
              >
                {t("misc.viewAll")}
                <IconChevronR className="size-4 rtl:rotate-180" />
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Prescription upload dialog                                          */
/* ------------------------------------------------------------------ */
export function RxDialog() {
  const t = useT();
  const open = useBahbah((s) => s.rxOpen);
  const setRxOpen = useBahbah((s) => s.setRxOpen);
  const [file, setFile] = useState<string | null>(null);
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const refCode = useMemo(
    () => `RX-${Math.floor(1000 + Math.random() * 9000)}`,
    [open]
  );

  return (
    <Dialog open={open} onOpenChange={setRxOpen}>
      <DialogContent aria-describedby={undefined} className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg font-black">
            <span className="grid size-9 place-items-center rounded-full bg-[#FFF4E5]">
              <IconRxSheet className="size-4.5 text-[#C56A0A]" />
            </span>
            {t("rx.title")}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("rx.desc")}</p>
        <div className="space-y-3">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#1E4E8F]/30 bg-[#EAF1F9]/50 p-6 text-center transition hover:border-[#1E4E8F]/60">
            <IconRxSheet className="size-7 text-[#1E4E8F]" />
            <span className="text-sm font-bold text-[#1E4E8F]">{t("rx.choose")}</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f.name);
                  setFileObj(f);
                }
              }}
            />
            {file && (
              <span className="flex items-center gap-1 text-xs font-bold text-[#2E9E6B]">
                <IconShieldCheck className="size-3.5" /> {t("rx.chosen")} {file}
              </span>
            )}
          </label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("rx.phone")}
            inputMode="tel"
            className="h-11 rounded-xl"
          />
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("rx.notes")}
            className="rounded-xl"
            rows={2}
          />
          <Button
            className="h-12 w-full rounded-full text-base font-bold"
            disabled={uploading}
            onClick={async () => {
              if (!file || !phone.trim()) {
                toast.error(t("rx.required"));
                return;
              }
              setUploading(true);
              let publicUrl: string | null = null;
              if (fileObj) {
                try {
                  publicUrl = await uploadRxPrescriptionImage(fileObj);
                } catch (e) {
                  console.warn("Prescription upload error:", e);
                }
              }

              /* push into the pharmacist review queue (visible in the dashboard & Supabase) */
              useBahbah.getState().submitRx({
                fileName: publicUrl || file,
                phone,
                noteAr: notes,
                noteEn: notes,
              });
              setUploading(false);
              setRxOpen(false);
              setFile(null);
              setFileObj(null);
              setPhone("");
              setNotes("");
              toast.success(t("rx.queued"));
            }}
          >
            {uploading ? "جاري الرفع..." : t("rx.submit")}
          </Button>

          {/* WhatsApp express lane — camera/gallery photo straight to the pharmacist */}
          <a
            href={`https://wa.me/${WASLY.whatsapp}?text=${encodeURIComponent(
              `صيدلية بحبح — رفع روشتة\nكود مرجعي: ${refCode}\nرقم التواصل: ${phone || "—"}`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="bb-whatsapp-gradient flex h-12 w-full items-center justify-center gap-2 rounded-full text-base font-bold text-white shadow-md transition"
          >
            <IconWhatsapp className="size-5" />
            إرسال عبر واتساب
          </a>
          {file && (
            <p className="text-center text-[11px] font-bold text-muted-foreground">
              كود المرجع: <span dir="ltr" className="font-black text-[#1E4E8F]">{refCode}</span>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Pharmacist consultation dialog                                      */
/* ------------------------------------------------------------------ */
export function ConsultDialog() {
  const t = useT();
  const open = useBahbah((s) => s.consultOpen);
  const setConsultOpen = useBahbah((s) => s.setConsultOpen);
  const [phone, setPhone] = useState("");
  const [question, setQuestion] = useState("");

  return (
    <Dialog open={open} onOpenChange={setConsultOpen}>
      <DialogContent aria-describedby={undefined} className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg font-black">
            <span className="grid size-9 place-items-center rounded-full bg-[#EAF1F9]">
              <IconPhone className="size-4.5 text-[#1E4E8F]" />
            </span>
            {t("consult.title")}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("consult.desc")}</p>
        <div className="space-y-3">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("rx.phone")}
            inputMode="tel"
            className="h-11 rounded-xl"
          />
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("consult.q")}
            className="rounded-xl"
            rows={3}
          />
          <Button
            className="h-12 w-full rounded-full text-base font-bold"
            onClick={() => {
              if (!phone.trim() || !question.trim()) {
                toast.error(t("consult.required"));
                return;
              }
              setConsultOpen(false);
              setPhone("");
              setQuestion("");
              toast.success(t("consult.success"));
            }}
          >
            {t("consult.submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}



/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */
export function Footer() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const view = useBahbah((s) => s.view);
  const site = useSiteInfo();
  const { go, openCatalog, setInstallAppOpen } = useBahbah();
  if (view === "admin" || view === "courier" || view === "pharmacist") return null;

  return (
    <footer className="mt-auto hero-pattern text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-5">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Image
                src="/images/bahbah-badge.png"
                alt="Bahbah Pharmacy"
                width={52}
                height={52}
                className="rounded-full bg-white p-1 shadow-md"
              />
              <div className="leading-tight">
                <div className="font-heading text-lg font-black text-[#F59E0B]">{t("brand.name")}</div>
                <div className="text-[10px] font-bold tracking-widest text-white/90">
                  BAHBAH PHARMACY
                </div>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/70">{t("footer.about")}</p>
            <Badge className="rounded-full bg-white/10 text-white/80 hover:bg-white/10 ring-1 ring-white/10">
              {t("footer.demo")}
            </Badge>
          </div>

          <div>
            <h4 className="mb-4 font-heading font-black text-[#F59E0B]">{t("footer.quick")}</h4>
            <ul className="space-y-2.5 text-sm text-white/75">
              <li><button className="hover:text-white transition" onClick={() => go("home")}>{t("nav.home")}</button></li>
              <li><button className="hover:text-white transition" onClick={() => openCatalog(null)}>{t("nav.catalog")}</button></li>
              <li>
                <button className="flex items-center gap-1.5 font-bold text-[#10B981] hover:text-white transition" onClick={() => go("care")}>
                  <IconRefill className="size-3.5" />
                  {t("nav.care")}
                </button>
              </li>
              <li><button className="hover:text-white transition" onClick={() => go("cart")}>{t("nav.cart")}</button></li>
              <li><button className="hover:text-white transition" onClick={() => go("account")}>{t("nav.account")}</button></li>
              <li><button className="hover:text-white transition" onClick={() => go("offers")}>{t("nav.offers")}</button></li>
              <li>
                <button
                  className="flex items-center gap-1.5 font-bold text-[#F59E0B] hover:text-white transition"
                  onClick={() => setInstallAppOpen(true)}
                >
                  <Smartphone className="size-3.5 text-[#F59E0B]" />
                  {lang === "ar" ? "📱 تثبيت التطبيق على الهاتف" : "📱 Install App"}
                </button>
              </li>
            </ul>
          </div>

          {/* staff portals — every role has its own dashboard */}
          <div>
            <h4 className="mb-4 font-heading font-black text-[#F59E0B]">{t("footer.team")}</h4>
            <ul className="space-y-2.5 text-sm text-white/75">
              <li>
                <button className="flex items-center gap-1.5 hover:text-white transition" onClick={() => go("courier")}>
                  <Bike className="size-3.5" />
                  {t("port.courier")}
                </button>
              </li>
              <li>
                <button className="flex items-center gap-1.5 hover:text-white transition" onClick={() => go("pharmacist")}>
                  <Pill className="size-3.5" />
                  {t("port.pharmacist")}
                </button>
              </li>
              <li>
                <button className="flex items-center gap-1.5 hover:text-white transition" onClick={() => go("admin")}>
                  <ShieldCheck className="size-3.5" />
                  {t("port.admin")}
                </button>
              </li>
              <li>
                <a
                  href={site.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-white transition"
                >
                  <Facebook className="size-3.5" />
                  {lang === "ar" ? "صفحتنا على فيسبوك" : "Our Facebook page"}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-heading font-black text-[#F59E0B]">{t("footer.cats")}</h4>
            <ul className="space-y-2.5 text-sm text-white/75">
              {categories.map((c) => (
                <li key={c.id}>
                  <button className="hover:text-white transition" onClick={() => openCatalog(c.id)}>
                    {lang === "ar" ? c.nameAr : c.nameEn}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-heading font-black text-[#F59E0B]">{t("footer.contact")}</h4>
            <ul className="space-y-3 text-sm text-white/75">
              <li className="flex items-center gap-2">
                <IconPhone className="size-4 shrink-0 text-[#F59E0B]" />
                <span className="flex flex-col leading-snug">
                  <a href={`tel:${site.phone1Href}`} dir="ltr" className="font-bold hover:text-white transition">{site.phone1}</a>
                  <a href={`tel:${site.phone2Href}`} dir="ltr" className="hover:text-white transition">{site.phone2}</a>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <IconPin className="mt-0.5 size-4 shrink-0 text-[#F59E0B]" />
                <span className="leading-relaxed">
                  {lang === "ar" ? site.addressFullAr : site.addressFullEn}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <IconClock className="size-4 text-[#F59E0B]" />
                {t("footer.hours")}
              </li>
            </ul>
          </div>
        </div>

        {/* copyright — Doctor Tech */}
        <div className="mt-10 flex flex-col items-center gap-3 border-t border-white/10 pt-6 text-xs text-white/50 md:flex-row md:justify-between">
          <span>{t("footer.rights")}</span>
          <a
            href={`tel:${DOCTOR_TECH.phoneHref}`}
            className="flex flex-wrap items-center justify-center gap-1.5 font-bold text-white/80 transition hover:text-[#F59E0B]"
          >
            <IconShieldCheck className="size-4 text-[#F59E0B]" />
            {t("footer.doctorTech")}
            <span dir="ltr" className="rounded-full bg-white/10 px-2.5 py-0.5 font-black tracking-wide text-[#F59E0B] ring-1 ring-white/10">
              {DOCTOR_TECH.phone}
            </span>
          </a>
          <span className="font-bold tracking-wide text-white/60">BAHBAH PHARMACY</span>
        </div>
        <p className="mt-2 text-center text-[10px] font-semibold text-white/40 md:text-end">
          {t("footer.madeBy")}: {lang === "ar" ? DOCTOR_TECH.nameAr : DOCTOR_TECH.nameEn} — Doctor Tech
        </p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* PWA App Install Modal & Mobile Guide                               */
/* ------------------------------------------------------------------ */
export function InstallAppModal() {
  const open = useBahbah((s) => s.installAppOpen);
  const setOpen = useBahbah((s) => s.setInstallAppOpen);
  const lang = useBahbah((s) => s.lang);
  const [platform, setPlatform] = useState<"android" | "ios">("android");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      if (/iPhone|iPad|iPod/i.test(ua)) {
        setPlatform("ios");
      } else {
        setPlatform("android");
      }

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstall);
      window.addEventListener("appinstalled", () => {
        setInstalled(true);
        setDeferredPrompt(null);
      });

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby={undefined} className="max-w-md rounded-3xl p-6 sm:p-7">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="relative size-12 shrink-0">
              <Image
                src="/images/bahbah-badge.png"
                alt="Bahbah Pharmacy"
                width={48}
                height={48}
                className="size-full rounded-2xl bg-white p-1 shadow-md ring-1 ring-border object-contain"
              />
            </div>
            <div>
              <DialogTitle className="font-heading text-lg font-black text-slate-900">
                {lang === "ar" ? "تثبيت تطبيق صيدلية بحبح" : "Install Bahbah Pharmacy App"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {lang === "ar" ? "تطبيق رسمي سريع وخفيف على هاتفك بدون إشغال ذاكرة" : "Fast, lightweight official web app for your phone"}
              </p>
            </div>
          </div>
        </DialogHeader>

        {installed ? (
          <div className="rounded-2xl bg-emerald-50 p-5 text-center text-emerald-800">
            <CheckCircle2 className="mx-auto mb-2 size-10 text-emerald-600" />
            <p className="font-black text-base">
              {lang === "ar" ? "تم تثبيت التطبيق بنجاح على هاتفك!" : "App installed successfully!"}
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              {lang === "ar" ? "يمكنك فتحه الآن من شاشتك الرئيسية في أي وقت وبدون متصفح." : "You can open it anytime from your home screen."}
            </p>
            <Button
              onClick={() => setOpen(false)}
              className="mt-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {lang === "ar" ? "تم، شكراً" : "Done"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Direct prompt button if supported by browser */}
            {deferredPrompt && (
              <Button
                onClick={handleInstallClick}
                className="h-12 w-full rounded-2xl bg-emerald-600 font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2"
              >
                <Download className="size-5" />
                {lang === "ar" ? "تثبيت فوري الآن بنقرة واحدة" : "Install App Directly Now"}
              </Button>
            )}

            {/* Platform selector */}
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPlatform("android")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition ${
                  platform === "android"
                    ? "bg-white text-[#184C8A] shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>🤖 أندرويد (Chrome)</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatform("ios")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition ${
                  platform === "ios"
                    ? "bg-white text-[#184C8A] shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>🍏 آيفون / آيباد (Safari)</span>
              </button>
            </div>

            {/* Platform instructions */}
            {platform === "android" ? (
              <div className="space-y-3 rounded-2xl border border-border/80 bg-slate-50/70 p-4 text-xs">
                <div className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#184C8A] text-[11px] font-black text-white">1</span>
                  <div className="leading-relaxed">
                    <p className="font-bold text-slate-800">
                      اضغط على خيارات المتصفح <span className="inline-flex items-center px-1 font-mono text-[13px] font-bold text-slate-700 bg-white border rounded">⋮</span>
                    </p>
                    <p className="text-slate-500">الثلاث نقاط في أعلى زاوية المتصفح (Google Chrome).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#184C8A] text-[11px] font-black text-white">2</span>
                  <div className="leading-relaxed">
                    <p className="font-bold text-slate-800">
                      اختر <span className="font-bold text-emerald-700">"التثبيت على الهاتف"</span> أو <span className="font-bold text-emerald-700">"إضافة إلى الشاشة الرئيسية"</span>
                    </p>
                    <p className="text-slate-500">Install app أو Add to Home screen.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#184C8A] text-[11px] font-black text-white">3</span>
                  <div className="leading-relaxed">
                    <p className="font-bold text-slate-800">اضغط "تثبيت" (Install)</p>
                    <p className="text-slate-500">ستظهر أيقونة التطبيق على شاشة هاتفك فوراً ويمكنك فتحه بدون متصفح!</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-border/80 bg-slate-50/70 p-4 text-xs">
                <div className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#184C8A] text-[11px] font-black text-white">1</span>
                  <div className="leading-relaxed">
                    <p className="font-bold text-slate-800">
                      اضغط على زر المشاركة <span className="inline-flex items-center px-1.5 py-0.5 font-bold text-blue-600 bg-white border rounded">⎋</span>
                    </p>
                    <p className="text-slate-500">زر المربع الذي يخرج منه سهم للأعلى في شريط متصفح Safari السفلي.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#184C8A] text-[11px] font-black text-white">2</span>
                  <div className="leading-relaxed">
                    <p className="font-bold text-slate-800">
                      اسحب للأسفل واختر <span className="font-bold text-blue-700">"إضافة إلى الشاشة الرئيسية" (Add to Home Screen ⊞)</span>
                    </p>
                    <p className="text-slate-500">ستجدها بين الخيارات المتاحة في القائمة.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#184C8A] text-[11px] font-black text-white">3</span>
                  <div className="leading-relaxed">
                    <p className="font-bold text-slate-800">اضغط "إضافة" (Add) في الزاوية العلوية</p>
                    <p className="text-slate-500">سيتم تثبيت التطبيق وتظهر أيقونة صيدلية بحبح على شاشة هاتفك فوراً.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-2.5 py-2">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span>حفظ بيانات الطلب تلقائياً</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-2.5 py-2">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span>ربط فوري بالواتساب</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-2.5 py-2">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span>تكرار الأدوية الشهرية بسهولة</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-2.5 py-2">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span>شحن سريع لجميع المحافظات</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full rounded-2xl h-11 text-xs font-bold"
            >
              {lang === "ar" ? "فهمت ذلك، إغلاق" : "Got it, Close"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* Search dialog close icon — bespoke */
import { IconXMark as _CloseIconBase } from "./icons";
export const CloseIcon = _CloseIconBase;
