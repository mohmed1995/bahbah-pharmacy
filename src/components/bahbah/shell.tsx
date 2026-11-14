"use client";

import {
  Bike,
  Pill,
  ShieldCheck,
  Facebook,
} from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
import {
  products,
  getProduct,
  SHIPPING_FEE,
  categories,
  interactionRules,
  WASLY,
  PHARMACY,
  DOCTOR_TECH,
  type InteractionLevel,
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
  const { go, openCatalog, setCartOpen, setSearchOpen, toggleLang, openAccount, setConsultOpen } = useBahbah();
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
              {lang === "ar" ? "خدمة واصلي: توصيل خلال 30 دقيقة في ديروط" : "Wasly: 30-min express delivery in Deirout"}
            </span>
            <span className="hidden text-white/30 md:inline">|</span>
            <span className="hidden items-center gap-1.5 text-white/80 md:flex">
              <IconShieldCheck className="size-3.5 text-[#10B981]" />
              {lang === "ar" ? "أدوية ومستحضرات أصلية 100% بإشراف صيدلي" : "100% Genuine medical products under pharmacist supervision"}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-bold">
            <a href={`tel:${WASLY.hotline}`} dir="ltr" className="flex items-center gap-1.5 text-white/90 transition hover:text-[#F59E0B]">
              <IconPhone className="size-3 text-[#F59E0B]" />
              {WASLY.hotline}
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:h-[72px] md:px-6">
        {/* brand */}
        <button className="flex items-center gap-2.5 transition-transform hover:scale-[1.02] active:scale-95" onClick={() => go("home")}>
          <div className="relative">
            <Image
              src="/images/bahbah-badge.png"
              alt="Bahbah Pharmacy"
              width={46}
              height={46}
              className="rounded-full bg-white shadow-md ring-2 ring-border/50"
              priority
            />
          </div>
          <div className="text-start leading-tight">
            <div className="font-heading text-[17.5px] font-black text-[#0B1E38]">
              {t("brand.name")}
            </div>
            <div className="hidden text-[10px] font-black tracking-widest text-[#D97706] sm:block">
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

          {/* search (mobile) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="grid size-10 place-items-center rounded-full text-foreground/70 transition hover:bg-muted active:scale-95 md:hidden"
            aria-label={t("search.title")}
          >
            <IconSearchGlass className="size-5" />
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
/* Voice search — ar-EG / en-US via Web Speech API (graceful fallback)  */
/* ------------------------------------------------------------------ */

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const emptySubscribe = () => () => {};

function VoiceButton({ onResult }: { onResult: (text: string) => void }) {
  const t = useT();
  const [listening, setListening] = useState(false);
  /* gate on mount: avoids SSR window access and setState-in-effect */
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  if (!mounted) return null;

  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;

  const start = () => {
    const rec = new Ctor();
    rec.lang = document.documentElement.lang === "en" ? "en-US" : "ar-EG";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript ?? "";
      if (text) onResult(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      toast.error(t("tools.voiceErr"));
    };
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  return (
    <button
      onClick={start}
      aria-label={t("tools.voice")}
      title={t("tools.listening")}
      className={`absolute top-1/2 end-3 grid size-8 -translate-y-1/2 place-items-center rounded-full transition ${
        listening
          ? "animate-pulse bg-[#DC4B4B] text-white"
          : "bg-[#EAF1F9] text-[#1E4E8F] hover:bg-[#1E4E8F]/15"
      }`}
    >
      <IconMic className="size-4" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Search dialog                                                       */
/* ------------------------------------------------------------------ */
function normAr(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .trim();
}

export function SearchDialog() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const open = useBahbah((s) => s.searchOpen);
  const { setSearchOpen, openProduct, openCatalog } = useBahbah();
  const [q, setQ] = useState("");

  const addToCart = useBahbah((s) => s.addToCart);

  const results = useMemo(() => {
    const query = q.trim();
    if (!query) return [];
    const nq = normAr(query);
    const lq = query.toLowerCase();

    return products
      .filter((p) => {
        const fullAr = normAr([p.nameAr, p.ingredientAr, p.brandAr, p.formAr].join(" "));
        const fullEn = [p.nameEn, p.ingredientEn, p.brandEn, p.formEn].join(" ").toLowerCase();
        return fullAr.includes(nq) || fullEn.includes(lq);
      })
      .slice(0, 16);
  }, [q]);

  const popular = ["بانادول", "ابيلات", "جليماكس", "ليفيست", "فيتامين", "سيرافي", "أوميجا", "سوبر كيدز", "كونجستال"];

  return (
    <Dialog open={open} onOpenChange={setSearchOpen}>
      <DialogContent aria-describedby={undefined} className="top-[12%] max-w-xl translate-y-0 rounded-2xl p-0">
        <DialogHeader className="px-5 pb-0 pt-5">
          <DialogTitle className="font-heading text-lg font-black">{t("search.title")}</DialogTitle>
        </DialogHeader>
        <div className="px-5 pb-2">
          <div className="relative">
            <IconSearchGlass className="absolute top-1/2 start-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search.placeholder")}
              className="h-12 rounded-full ps-11 pe-12 text-base"
            />
            <VoiceButton onResult={setQ} />
          </div>
        </div>

        <div className="nice-scrollbar max-h-[50vh] overflow-y-auto px-5 pb-5">
          {!q.trim() && (
            <div>
              <p className="mb-2 text-xs font-bold text-muted-foreground">{t("search.popular")}</p>
              <div className="flex flex-wrap gap-2">
                {popular.map((p) => (
                  <button
                    key={p}
                    onClick={() => setQ(p)}
                    className="rounded-full border border-border/80 bg-muted/60 px-3.5 py-1.5 text-xs font-bold text-foreground/75 transition-all hover:border-[#184C8A]/40 hover:bg-white hover:text-[#184C8A] hover:shadow-sm active:scale-95"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {q.trim() && results.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("search.none")}</p>
          )}

          {results.length > 0 && (
            <div className="space-y-1">
              <p className="mb-2 text-xs font-bold text-muted-foreground">{t("search.results")}</p>
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openProduct(p.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-start transition-all hover:border-border/80 hover:bg-[#EAF2FA]/50"
                >
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-white p-1 flex items-center justify-center shadow-xs">
                    {p.img ? (
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
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)}
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
            onClick={() => {
              if (!file || !phone.trim()) {
                toast.error(t("rx.required"));
                return;
              }
              /* push into the pharmacist review queue (visible in the dashboard) */
              useBahbah.getState().submitRx({
                fileName: file,
                phone,
                noteAr: notes,
                noteEn: notes,
              });
              setRxOpen(false);
              setFile(null);
              setPhone("");
              setNotes("");
              toast.success(t("rx.queued"));
            }}
          >
            {t("rx.submit")}
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
/* Drug interaction checker dialog                                     */
/* ------------------------------------------------------------------ */
export function ICDialog() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const open = useBahbah((s) => s.icOpen);
  const setIcOpen = useBahbah((s) => s.setIcOpen);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [result, setResult] = useState<{
    level: InteractionLevel;
    text: string;
  } | null>(null);

  const check = () => {
    const pa = getProduct(a);
    const pb = getProduct(b);
    if (!pa || !pb) return;
    const fa = `${pa.ingredientAr} ${pa.ingredientEn}`;
    const fb = `${pb.ingredientAr} ${pb.ingredientEn}`;
    const hit = interactionRules.find(
      (r) =>
        (fa.includes(r.a) && fb.includes(r.b)) ||
        (fa.includes(r.b) && fb.includes(r.a))
    );
    setResult(
      hit
        ? { level: hit.level, text: lang === "ar" ? hit.ar : hit.en }
        : { level: "safe", text: t("ic.safe") }
    );
  };

  const tone: Record<InteractionLevel, string> = {
    safe: "bg-[#EAF6F1] text-[#2E9E6B] border-[#2E9E6B]/30",
    warn: "bg-[#FFF4E5] text-[#B45E0A] border-[#F09428]/40",
    danger: "bg-[#FDECEC] text-[#DC4B4B] border-[#DC4B4B]/40",
  };
  const levelLabel: Record<InteractionLevel, string> = {
    safe: "✓",
    warn: "!",
    danger: "×",
  };

  return (
    <Dialog open={open} onOpenChange={setIcOpen}>
      <DialogContent aria-describedby={undefined} className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg font-black">
            <span className="grid size-9 place-items-center rounded-full bg-[#EAF1F9]">
              <IconCapsule className="size-4.5 text-[#1E4E8F]" />
            </span>
            {t("ic.title")}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("ic.desc")}</p>

        <div className="space-y-3">
          <ProductSelect label={t("ic.a")} value={a} onChange={setA} lang={lang} />
          <ProductSelect label={t("ic.b")} value={b} onChange={setB} lang={lang} />
          <Button
            className="h-12 w-full rounded-full text-base font-bold"
            disabled={!a || !b || a === b}
            onClick={check}
          >
            {t("ic.check")}
          </Button>

          {result && (
            <div className={`flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm font-bold leading-relaxed ${tone[result.level]}`}>
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/70 text-sm font-black">
                {levelLabel[result.level]}
              </span>
              {result.text}
            </div>
          )}

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">{t("ic.note")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProductSelect({
  label,
  value,
  onChange,
  lang,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  lang: "ar" | "en";
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm font-bold text-foreground outline-none transition focus:border-[#1E4E8F]"
      >
        <option value="">—</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {lang === "ar" ? p.nameAr : p.nameEn}
          </option>
        ))}
      </select>
    </div>
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
  const { go, openCatalog } = useBahbah();
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
                <div className="font-heading text-lg font-black">{t("brand.name")}</div>
                <div className="text-[10px] font-bold tracking-widest text-[#F59E0B]">
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

/* Search dialog close icon — bespoke */
import { IconXMark as _CloseIconBase } from "./icons";
export const CloseIcon = _CloseIconBase;
