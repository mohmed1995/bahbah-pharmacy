"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Flame,
  Timer,
  Percent,
  PackageOpen,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { offers, discountPct, type Product } from "@/lib/bahbah/data";
import { useBahbah, useT } from "@/lib/bahbah/store";
import { ProductCard, SectionHead, fmtPrice } from "./product-card";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Live countdown to the end of the weekly offers                      */
/* ------------------------------------------------------------------ */
function useCountdown() {
  /* fixed demo deadline: 2 days 14 hours from mount, ticks every second */
  const [target] = useState(() => Date.now() + (2 * 24 + 14) * 3600 * 1000 + 27 * 60 * 1000);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, target - now);
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

function Countdown() {
  const t = useT();
  const { d, h, m, s } = useCountdown();
  const cells: [number, string][] = [
    [d, t("offers.d")],
    [h, t("offers.h")],
    [m, t("offers.m")],
    [s, t("offers.s")],
  ];
  return (
    <div className="flex items-center gap-2" dir="ltr">
      {cells.map(([v, label], i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex min-w-14 flex-col items-center rounded-xl bg-white/10 px-2.5 py-2 ring-1 ring-white/20 backdrop-blur">
            <span className="font-heading text-xl font-black tabular-nums text-white md:text-2xl">
              {String(v).padStart(2, "0")}
            </span>
            <span className="text-[10px] font-bold text-white/60">{label}</span>
          </div>
          {i < 3 && <span className="font-heading text-lg font-black text-white/40">:</span>}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Deal of the day — the deepest discount of the week                  */
/* ------------------------------------------------------------------ */
function DealOfDay({ deal }: { deal: Product }) {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const { openProduct, addToCart } = useBahbah();
  const pct = discountPct(deal);
  const Icon = deal.icon;
  const name = lang === "ar" ? deal.nameAr : deal.nameEn;
  const brand = lang === "ar" ? deal.brandAr : deal.brandEn;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1E38] via-[#184C8A] to-[#113665] p-5 text-white shadow-xl md:p-8">
      <div className="pointer-events-none absolute -end-14 -top-14 size-48 rounded-full bg-[#F59E0B]/25 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -start-10 size-56 rounded-full bg-white/5 blur-2xl" />

      <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <Badge className="mb-4 gap-1.5 rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] px-4 py-2 text-xs font-black text-white hover:brightness-105 ring-1 ring-white/20">
            <Flame className="size-4" />
            {t("offers.dealOfDay")}
          </Badge>

          <h2 className="font-heading text-2xl font-black leading-snug md:text-4xl">{name}</h2>
          <p className="mt-1 text-sm text-white/70">{brand}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="font-heading text-3xl font-black text-[#F59E0B] md:text-5xl">
              {fmtPrice(deal.price, t)}
            </span>
            {deal.oldPrice && (
              <span className="text-lg text-white/50 line-through md:text-xl">
                {fmtPrice(deal.oldPrice, t)}
              </span>
            )}
            <span className="rounded-full bg-[#059669] px-3 py-1 text-sm font-black ring-1 ring-white/20">
              {t("offers.badge")} {pct}%
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-white/70 md:text-sm">
            <PackageOpen className="size-4 text-[#F59E0B]" />
            {deal.stock} {t("offers.left")}
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button
              size="lg"
              className="h-12 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#EA580C] px-7 text-base font-black text-white shadow-lg shadow-black/25 hover:brightness-105 active:scale-95 transition-all"
              onClick={() => {
                addToCart(deal.id);
                openProduct(deal.id);
              }}
            >
              {t("offers.grab")}
              <ChevronRight className="size-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>

        {/* deal visual */}
        <button
          onClick={() => openProduct(deal.id)}
          className="group relative mx-auto grid size-44 place-items-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur transition hover:scale-105 active:scale-95 md:size-56"
          aria-label={name}
        >
          <span className="absolute inset-3 rounded-full bg-white/10" />
          <span className="absolute -top-2 -end-2 grid size-16 place-items-center rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] font-heading text-lg font-black text-white shadow-lg ring-2 ring-white">
            -{pct}%
          </span>
          <Icon className="relative size-24 text-white md:size-28" strokeWidth={1.4} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cosmetic & Beauty Wide Moving Carousel                             */
/* ------------------------------------------------------------------ */
const COSMETIC_SLIDES = [
  {
    id: "cosm-limitless",
    img: "/images/offers/cropped-limitless-woman.jpg",
    title: "ليمتلس ومان ماكس — فيتامينات المرأة المتكاملة",
    sub: "أكثر من 20 فيتامين ومعدن أساسي لصحة الشعر والبشرة والأظافر",
    price: 210,
    oldPrice: 265,
    tag: "عرض الأسبوع",
    color: "from-[#831843] via-[#9D174D] to-[#BE185D]",
  },
  {
    id: "cosm-melatex",
    img: "/images/offers/cropped-mega-1.jpg",
    title: "حياة ميلاتكس غسول تفتيح البشرة الحساسة 200 مل",
    sub: "غسول طبي للتفتيح والترطيب الفائق وإزالة التصبغات بدون جفاف",
    price: 210,
    oldPrice: 245,
    tag: "تجميل وعناية",
    color: "from-[#0F172A] via-[#1E293B] to-[#334155]",
  },
  {
    id: "cosm-vacation",
    img: "/images/offers/cropped-vacation.jpg",
    title: "فاكيشن سيروم فيتامين سي 10% نقي",
    sub: "إشراقة ونضارة شبابية فورية ومحاربة التصبغات وعلامات الإرهاق",
    price: 390,
    oldPrice: 475,
    tag: "الأعلى طلباً",
    color: "from-[#7C2D12] via-[#9A3412] to-[#C2410C]",
  },
  {
    id: "cosm-starville",
    img: "/images/offers/cropped-starville.jpg",
    title: "ستارفيل سيروم فيتامين سي للنضارة الفورية",
    sub: "تفتيح وترطيب عميق مع كولاجين نباتي وخلاصة العرقسوس",
    price: 280,
    oldPrice: 320,
    tag: "الأكثر مبيعاً",
    color: "from-[#14532D] via-[#166534] to-[#15803D]",
  },
  {
    id: "cosm-litup",
    img: "/images/offers/cropped-litup.jpg",
    title: "ليت أب غسول تفتيح الوجه بالكامل",
    sub: "تنظيف عميق وإزالة الشوائب بتركيبة فيتامين C و E والشاي الأخضر",
    price: 190,
    oldPrice: 220,
    tag: "عناية يومية",
    color: "from-[#1E3A8A] via-[#1E40AF] to-[#2563EB]",
  },
  {
    id: "cosm-tetraglow",
    img: "/images/offers/cropped-tetraglow-cream.jpg",
    title: "تيتراجلو كريم تفتيح وتوحيد لون البشرة",
    sub: "ترطيب مضاعف وعلاج البقع الداكنة طوال اليوم",
    price: 185,
    oldPrice: 220,
    tag: "حماية وتفتيح",
    color: "from-[#4C1D95] via-[#5B21B6] to-[#6D28D9]",
  },
];

function CosmeticOffersCarousel() {
  const t = useT();
  const addToCart = useBahbah((s) => s.addToCart);
  const [cur, setCur] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCur((prev) => (prev + 1) % COSMETIC_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const slide = COSMETIC_SLIDES[cur];

  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
      <div className="grid items-center gap-4 lg:grid-cols-12">
        {/* Left: Wide Clean Cropped Product Photo without top bars and without hardcoded prices */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/40 sm:aspect-[2/1] lg:col-span-7">
          <img
            src={slide.img}
            alt={slide.title}
            className="h-full w-full object-cover object-center transition-all duration-700 ease-out hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent lg:hidden" />
          <Badge className="absolute top-3 start-3 z-10 gap-1 rounded-full bg-[#F09428] px-3 py-1 font-black text-white shadow-lg">
            <Sparkles className="size-3.5" />
            {slide.tag}
          </Badge>
        </div>

        {/* Right: Clean Dynamic Typography, Accurate Price, and 1-Click Order Button */}
        <div className="flex flex-col justify-between p-5 text-white lg:col-span-5 lg:p-7">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-block size-2 animate-pulse rounded-full bg-[#2E9E6B]" />
              <span className="text-xs font-bold text-[#F09428]">{slide.tag}</span>
            </div>
            <h3 className="font-heading text-xl font-black leading-tight sm:text-2xl">{slide.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-white/75 sm:text-sm">{slide.sub}</p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-2xl font-black text-[#F09428] sm:text-3xl">
                  {slide.price} {t("misc.egp")}
                </span>
                <span className="text-sm font-semibold text-white/50 line-through">
                  {slide.oldPrice} {t("misc.egp")}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#2E9E6B]">
                {t("offers.saveUpTo")} {Math.round(((slide.oldPrice - slide.price) / slide.oldPrice) * 100)}%
              </span>
            </div>

            <Button
              size="lg"
              className="h-11 rounded-full bg-[#2E9E6B] px-6 text-sm font-black text-white hover:bg-[#258257] shadow-lg shadow-[#2E9E6B]/20 transition active:scale-95"
              onClick={() => {
                addToCart(slide.id);
                toast.success(t("cart.added"));
              }}
            >
              <ShoppingBag className="size-4 me-1.5" />
              {t("offers.grab")}
            </Button>
          </div>

          {/* Dots navigation & slide counter */}
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
            <div className="flex gap-1.5">
              {COSMETIC_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCur(idx)}
                  className={`h-2 rounded-full transition-all ${cur === idx ? "w-6 bg-[#F09428]" : "w-2 bg-white/30"}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => setCur((prev) => (prev - 1 + COSMETIC_SLIDES.length) % COSMETIC_SLIDES.length)}
              >
                <ChevronRight className="size-4 rtl:rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => setCur((prev) => (prev + 1) % COSMETIC_SLIDES.length)}
              >
                <ChevronLeft className="size-4 rtl:rotate-180" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Offers view                                                         */
/* ------------------------------------------------------------------ */
type Filter = "all" | "f20" | "f30" | "f40";

export default function OffersView() {
  const t = useT();
  const [filter, setFilter] = useState<Filter>("all");
  const list = offers();
  const maxPct = list.reduce((mx, p) => Math.max(mx, discountPct(p)), 0);
  const deal = useMemo(
    () => [...list].sort((a, b) => discountPct(b) - discountPct(a))[0],
    [list]
  );

  const filtered = useMemo(() => {
    switch (filter) {
      case "f20":
        return list.filter((p) => discountPct(p) >= 20);
      case "f30":
        return list.filter((p) => discountPct(p) >= 30);
      case "f40":
        return list.filter((p) => discountPct(p) >= 40);
      default:
        return list;
    }
  }, [filter, list]);

  const chips: [Filter, string][] = [
    ["all", t("offers.filterAll")],
    ["f20", t("offers.f20")],
    ["f30", t("offers.f30")],
    ["f40", t("offers.f40")],
  ];

  return (
    <main className="pb-16 md:pb-20">
      {/* page hero */}
      <section className="hero-pattern relative overflow-hidden text-white">
        <div className="pointer-events-none absolute -top-20 end-[12%] size-64 rounded-full bg-[#F59E0B]/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <Badge className="mb-4 gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white/95 backdrop-blur-md hover:bg-white/15">
                <Percent className="size-3.5 text-[#F59E0B]" />
                {t("offers.saveUpTo")} {maxPct}%
              </Badge>
              <h1 className="font-heading text-3xl font-black md:text-5xl">{t("offers.pageTitle")}</h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">
                {t("offers.pageSub")}
              </p>
            </div>
            <div>
              <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-white/80">
                <Timer className="size-4 text-[#F59E0B]" />
                {t("offers.endsIn")}
              </p>
              <Countdown />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-8 md:px-6">
        {/* Cosmetic & Beauty Wide Moving Carousel */}
        <CosmeticOffersCarousel />

        {/* deal of the day */}
        {deal && <DealOfDay deal={deal} />}

        {/* filter chips */}
        <div className="no-scrollbar -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {chips.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
                filter === key
                  ? "border-transparent bg-gradient-to-r from-[#EA580C] to-[#F59E0B] text-white shadow-sm ring-1 ring-white/20"
                  : "border-border/80 bg-card text-foreground/75 hover:border-[#F59E0B]/50 hover:bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* results meta */}
        <div className="mt-5">
          <SectionHead
            title={`${t("offers.title")} (${filtered.length})`}
            sub={t("offers.sub")}
          />
        </div>

        {/* grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid size-16 place-items-center rounded-full bg-muted">
              <Percent className="size-7 text-muted-foreground" />
            </div>
            <p className="font-heading font-bold text-muted-foreground">{t("offers.none")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
