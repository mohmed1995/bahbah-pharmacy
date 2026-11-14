"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  categories,
  testimonials,
  offers,
  bestSellers,
  discountPct,
  carePlans,
  getProduct,
  products,
  WASLY,
  type AdSlide,
} from "@/lib/bahbah/data";
import { useBahbah, useT, useAdSlides, effStock } from "@/lib/bahbah/store";
import { ProductCard, SectionHead, BahbahLogo } from "./product-card";
import {
  IconShieldCheck,
  IconArrowL,
  IconArrowR,
  IconUploadCloud,
  IconPhone,
  IconRouteDuo,
  IconStarFill,
  IconSparkles,
  IconPercent,
  IconChevronR,
  IconVanDuo,
  IconShieldCrossDuo,
  IconPharmacistDuo,
  IconWalletDuo,
  IconVan,
  IconPharmacist,
  IconRxClipboardDuo,
  IconDropletPlusDuo,
  IconVitaminTubeDuo,
  IconThermoDuo,
  IconClockFastDuo,
  IconStorefrontDuo,
  IconMic,
  IconTextSize,
  IconCapsuleDuo,
  IconBoxes,
  IconCheck,
  duoOf,
} from "./icons";
import { toast } from "sonner";
import { Copy, Dumbbell } from "lucide-react";
import Reveal from "./reveal";

/* ------------------------------------------------------------------ */
/* Ads v2 — noon-style split: main banner + side tiles, story bars,    */
/* ken-burns zoom, live countdown, promo-code chip, touch swipe        */
/* ------------------------------------------------------------------ */

const toneTint: Record<AdSlide["tone"], string> = {
  blue: "bg-[#184C8A]/25",
  orange: "bg-[#F59E0B]/25",
  green: "bg-[#059669]/25",
  sand: "bg-[#D97706]/20",
  sky: "bg-[#0284C7]/25",
};

const SLIDE_MS = 6500;

function CountdownChip() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const ms = Math.max(0, end.getTime() - now);
  const pad = (x: number) => String(x).padStart(2, "0");
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return (
    <span
      dir="ltr"
      className="bb-count inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#DC2626] to-[#EF4444] px-2.5 py-1 font-heading text-[11px] font-black tabular-nums text-white shadow-md ring-1 ring-white/20 md:text-xs"
    >
      {pad(h)}:{pad(m)}:{pad(sec)}
    </span>
  );
}

function CodeChip({ code }: { code: string }) {
  const t = useT();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
        toast.success(t("ads.copied"));
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/60 bg-white/15 px-3 py-2 text-[11px] font-black text-white backdrop-blur transition hover:bg-white/30 active:scale-95 md:text-xs"
    >
      <Copy className="size-3.5" />
      <span className="opacity-80">{t("ads.code")}:</span>
      <span dir="ltr" className="font-heading tracking-wide text-[#FDE68A]">{code}</span>
    </button>
  );
}

function AdSideTile({
  img,
  title,
  sub,
  cta,
  tint,
  onClick,
}: {
  img: string;
  title: string;
  sub: string;
  cta: string;
  tint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bb-card-hover group relative h-36 overflow-hidden rounded-2xl shadow-md ring-1 ring-black/5 transition hover:shadow-xl sm:h-44 lg:h-auto lg:rounded-3xl"
    >
      <Image
        src={img}
        alt={title}
        fill
        sizes="(max-width:1024px) 50vw, 380px"
        className="object-cover transition duration-700 group-hover:scale-110"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <span className={`absolute inset-0 bg-gradient-to-tr ${tint} to-transparent opacity-40 mix-blend-multiply`} />
      <span className="absolute inset-x-0 bottom-0 flex flex-col items-start p-3.5 text-start text-white md:p-4">
        <span className="font-heading text-sm font-black drop-shadow md:text-lg">{title}</span>
        <span className="mt-0.5 hidden text-[11px] font-semibold text-white/85 sm:block md:text-xs">{sub}</span>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-[10px] font-black text-[#0B1E38] shadow-md transition group-hover:gap-2 md:text-[11px]">
          {cta}
          <IconChevronR className="size-3 rtl:rotate-180" />
        </span>
      </span>
    </button>
  );
}

function AdCarousel() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const slides = useAdSlides();
  const { go, openCatalog } = useBahbah();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchX = useRef<number | null>(null);

  const n = slides.length;

  const next = useCallback(() => setIdx((i) => (i + 1) % Math.max(n, 1)), [n]);
  const prev = useCallback(
    () => setIdx((i) => (i - 1 + Math.max(n, 1)) % Math.max(n, 1)),
    [n]
  );

  useEffect(() => {
    if (paused || n <= 1) return;
    timer.current = setInterval(next, SLIDE_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, n, next]);

  /* reset index if admin hides slides — render-phase adjustment */
  if (idx >= n && idx !== 0) {
    setIdx(0);
  }

  if (n === 0) return null;

  const slide = slides[idx];
  const offset = lang === "ar" ? idx * 100 : -idx * 100;

  const act = () => {
    switch (slide.action) {
      case "offers":
        go("offers");
        break;
      case "care":
        go("care");
        break;
      case "category":
        openCatalog(slide.category ?? null);
        break;
      default:
        openCatalog(null);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-3 pt-3 md:px-6 md:pt-5" aria-label={t("ads.title")}>
      <div className="grid gap-3 lg:grid-cols-3 lg:gap-4">
        {/* main banner */}
        <div
          className="group relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5 lg:col-span-2 lg:rounded-3xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const d = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(d) > 42) {
              if (lang === "ar") {
                if (d > 0) prev();
                else next();
              } else if (d < 0) next();
              else prev();
            }
            touchX.current = null;
          }}
        >
          <div className="relative h-52 sm:h-64 md:h-80 lg:h-[400px]">
            {/* track */}
            <div
              className="flex h-full transition-transform duration-700 ease-out"
              style={{ transform: `translateX(${offset}%)` }}
            >
              {slides.map((s) => (
                <div
                  key={s.id}
                  className="relative h-full w-full shrink-0"
                  aria-hidden={s.id !== slide.id}
                  inert={s.id !== slide.id || undefined}
                >
                  <Image
                    key={`${s.id}-${s.id === slide.id}`}
                    src={s.img}
                    alt={lang === "ar" ? s.titleKeyAr : s.titleKeyEn}
                    fill
                    sizes="(max-width:1024px) 100vw, 800px"
                    className={`object-cover ${s.id === slide.id ? "bb-kenburns" : ""}`}
                    priority={s.id === "ad-offers"}
                  />
                  {/* readability layers */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <div className={`absolute inset-0 ${toneTint[s.tone]} mix-blend-multiply`} />

                  {/* copy — staggered entrance */}
                  <div className="absolute inset-x-0 bottom-0 p-4 pb-8 text-white md:p-9 md:pb-12">
                    <div
                      key={`copy-${s.id === slide.id ? "on" : "off"}`}
                      className={`max-w-xl ${s.id === slide.id ? "bb-ad-in" : ""}`}
                    >
                      <Badge className="mb-2 rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] px-3.5 py-1 text-[11px] font-black text-white shadow-md hover:brightness-105 md:mb-3 md:text-xs ring-1 ring-white/20">
                        {lang === "ar" ? s.badgeAr : s.badgeEn}
                      </Badge>
                      <h2 className="font-heading text-xl font-black leading-tight drop-shadow-md md:text-4xl">
                        {lang === "ar" ? s.titleKeyAr : s.titleKeyEn}
                      </h2>
                      <p className="mt-1 hidden max-w-md text-xs font-semibold text-white/85 drop-shadow sm:block md:mt-2 md:text-base">
                        {lang === "ar" ? s.subKeyAr : s.subKeyEn}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 md:mt-5 md:gap-3">
                        <Button
                          className="h-9 rounded-full bg-white px-5 text-xs font-black text-[#0B1E38] shadow-lg hover:bg-white/95 active:scale-95 transition-all md:h-12 md:px-7 md:text-sm"
                          onClick={act}
                        >
                          {lang === "ar" ? s.ctaKeyAr : s.ctaKeyEn}
                          <IconChevronR className="size-4 rtl:rotate-180" />
                        </Button>
                        {s.code && <CodeChip code={s.code} />}
                        {s.urgent && (
                          <span className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur ring-1 ring-white/10">
                            <span className="text-[10px] font-black text-white/90 md:text-xs">
                              {t("ads.urgent")}
                            </span>
                            <CountdownChip />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* arrows (desktop) */}
            {n > 1 && (
              <>
                <button
                  aria-label="next"
                  onClick={next}
                  className="absolute top-1/2 end-3 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white opacity-0 backdrop-blur transition hover:bg-white/40 active:scale-90 group-hover:opacity-100 md:end-4 md:size-11"
                >
                  <IconChevronR className="size-5 rtl:rotate-180" />
                </button>
                <button
                  aria-label="prev"
                  onClick={prev}
                  className="absolute top-1/2 start-3 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white opacity-0 backdrop-blur transition hover:bg-white/40 active:scale-90 group-hover:opacity-100 md:start-4 md:size-11"
                >
                  <IconChevronR className="size-5 ltr:rotate-180" />
                </button>
              </>
            )}

            {/* story-style progress segments */}
            <div className="absolute inset-x-0 bottom-0 z-10 flex gap-1.5 px-3 pb-2 md:px-5 md:pb-2.5">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  aria-label={`slide-${i + 1}`}
                  onClick={() => setIdx(i)}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/30 transition hover:bg-white/50"
                >
                  {i < idx && <span className="block h-full w-full rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B]" />}
                  {i === idx && (
                    <span
                      key={`seg-${idx}-${paused}`}
                      style={{ "--seg-dur": `${SLIDE_MS}ms` } as React.CSSProperties}
                      className={`bb-seg-fill block h-full w-0 rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] ${
                        paused ? "bb-seg-paused" : ""
                      }`}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* side tiles — رعاية بحبح + ركن الجيم */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:grid-rows-2 lg:gap-4">
          <AdSideTile
            img="/images/ads/ad-monthly.png"
            title={t("ads.sideCareT")}
            sub={t("ads.sideCareD")}
            cta={t("ads.sideCta")}
            tint="from-[#F59E0B]/90"
            onClick={() => go("care")}
          />
          <AdSideTile
            img="/images/ads/ad-gym.png"
            title={t("ads.sideGymT")}
            sub={t("ads.sideGymD")}
            cta={t("ads.sideCta")}
            tint="from-[#184C8A]/90"
            onClick={() => openCatalog("fitness")}
          />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */
function Hero() {
  const t = useT();
  const { openCatalog, setRxOpen } = useBahbah();

  return (
    <section className="hero-pattern relative overflow-hidden text-white">
      {/* glow decorations */}
      <div className="bb-glow pointer-events-none absolute -top-24 start-1/4 size-72 rounded-full bg-[#184C8A]/60 blur-3xl" />
      <div className="bb-glow pointer-events-none absolute -bottom-32 end-[8%] size-80 rounded-full bg-[#F59E0B]/20 blur-3xl" style={{ animationDelay: "2s" }} />
      <span className="bb-float pointer-events-none absolute top-14 end-[6%] hidden text-5xl opacity-30 lg:block" aria-hidden>💊</span>
      <span className="bb-float-slow pointer-events-none absolute bottom-24 start-[4%] hidden text-4xl opacity-25 lg:block" aria-hidden>🧴</span>

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 md:grid-cols-2 md:px-6 md:pb-24 md:pt-16">
        {/* copy */}
        <div className="order-2 md:order-1">
          <Badge className="mb-5 gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold text-white/95 backdrop-blur-md shadow-xs hover:bg-white/15">
            <IconShieldCheck className="size-3.5 text-[#F59E0B]" />
            {t("hero.badge")}
          </Badge>

          <h1 className="font-heading text-4xl font-black leading-[1.18] md:text-6xl tracking-tight">
            {t("hero.title")}
            <br />
            <span className="bb-gradient-text">{t("hero.titleAccent")}</span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 md:text-lg">
            {t("hero.sub")}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="h-13 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#EA580C] px-8 text-base font-black text-white shadow-lg shadow-[#F59E0B]/30 transition-all hover:shadow-xl hover:shadow-[#F59E0B]/40 hover:-translate-y-0.5 active:scale-95"
              onClick={() => openCatalog(null)}
            >
              {t("hero.cta1")}
              <IconArrowL className="size-4 rtl:inline ltr:hidden" />
              <IconArrowR className="size-4 ltr:inline rtl:hidden" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-13 rounded-full border-white/30 bg-white/10 px-8 text-base font-bold text-white backdrop-blur-md transition hover:bg-white/20 hover:text-white active:scale-95"
              onClick={() => setRxOpen(true)}
            >
              <IconUploadCloud className="size-4" />
              {t("hero.cta2")}
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {(["hero.chip1", "hero.chip2", "hero.chip3"] as const).map((k) => (
              <span key={k} className="flex items-center gap-1.5 text-sm font-bold text-white/90">
                <span className="grid size-5 place-items-center rounded-full bg-[#059669] shadow-xs">
                  <IconShieldCheck className="size-3 text-white" />
                </span>
                {t(k)}
              </span>
            ))}
          </div>
        </div>

        {/* visual */}
        <div className="order-1 flex justify-center md:order-2">
          <div className="relative">
            {/* big badge */}
            <div className="relative size-44 md:size-64">
              <div className="absolute inset-0 rounded-full bg-white/20 blur-2xl" />
              <div className="relative size-44 overflow-hidden rounded-full bg-white p-2 shadow-2xl ring-4 ring-white/60 md:size-64 md:p-3">
                <Image
                  src="/images/bahbah-badge.png"
                  alt="Bahbah Pharmacy badge"
                  width={256}
                  height={256}
                  className="size-full object-contain"
                  priority
                />
              </div>
            </div>

            {/* floating pills around the badge */}
            <FloatingOrb className="-top-4 -start-6 md:-start-14" delay="0s" icon={<IconShieldCheck className="size-5 text-[#059669]" />} label={t("trust.original")} />
            <FloatingOrb className="top-1/2 -end-8 md:-end-20" delay="0.8s" icon={<IconVan className="size-5 text-[#184C8A]" />} label={t("trust.ship")} />
            <FloatingOrb className="-bottom-5 start-6 md:start-2" delay="1.6s" icon={<IconPharmacist className="size-5 text-[#D97706]" />} label={t("trust.pharmacist")} />
          </div>
        </div>
      </div>

      {/* stats strip */}
      <div className="relative mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-[-3.5rem] translate-y-1/2 grid grid-cols-3 gap-3 rounded-3xl border border-border/80 bg-white/95 p-4 shadow-[0_20px_50px_-10px_rgba(11,30,56,0.12)] backdrop-blur-xl md:gap-6 md:p-6 ring-1 ring-black/5">
          {(
            [
              ["hero.stat1v", "hero.stat1"],
              ["hero.stat2v", "hero.stat2"],
              ["hero.stat3v", "hero.stat3"],
            ] as const
          ).map(([v, k], i) => (
            <div key={k} className={`text-center ${i > 0 ? "border-s border-border" : ""}`}>
              <div className={`font-heading text-xl font-black md:text-3xl ${i === 0 ? "text-[#184C8A]" : i === 1 ? "text-[#D97706]" : "text-[#059669]"}`}>
                {t(v)}
              </div>
              <div className="mt-1 text-[11px] font-bold text-muted-foreground md:text-sm">{t(k)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FloatingOrb({
  className,
  delay,
  icon,
  label,
}: {
  className?: string;
  delay: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className={`absolute z-10 flex animate-bounce items-center gap-2 rounded-full bg-white px-3.5 py-2.5 text-xs font-bold text-[#112D51] shadow-xl ${className}`}
      style={{ animationDuration: "2.6s", animationDelay: delay }}
    >
      <span className="grid size-7 place-items-center rounded-full bg-[#EAF1F9] text-[#1E4E8F]">
        {icon}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Free-delivery live strip — الهدف بيتقرأ من إعدادات لوحة الإدارة      */
/* "باقي 10 جنيه على 300 وتحصل على توصيل مجاني"                        */
/* ------------------------------------------------------------------ */

function StripMessage({ raw }: { raw: string }) {
  /* بيبرز الأرقام باللون البرتقالي جوة الجملة الدعائية */
  const parts = raw.split(/(\d[\d,]*)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\d[\d,]*$/.test(part) ? (
          <span key={i} dir="ltr" className="mx-1 inline-block rounded-lg bg-[#F09428] px-2 py-0.5 font-heading text-[0.95em] font-black text-white shadow-sm">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function FreeShipStrip() {
  const t = useT();
  const cart = useBahbah((s) => s.cart);
  const goal = useBahbah((s) => s.settings.freeThreshold);
  const go = useBahbah((s) => s.go);

  if (goal <= 0) return null; /* الإدارة قفلت الميزة */

  const subtotal = cart.reduce((s, c) => s + (getProduct(c.productId)?.price ?? 0) * c.qty, 0);
  const has = subtotal > 0;
  const remaining = Math.max(0, goal - subtotal);
  const pct = Math.min(100, Math.round((subtotal / goal) * 100));
  const done = has && remaining === 0;

  const msg = !has
    ? t("ship.stripEmpty").replace("{y}", goal.toLocaleString("en-US"))
    : done
      ? t("ship.stripDone")
      : t("ship.stripGo")
          .replace("{x}", remaining.toLocaleString("en-US"))
          .replace("{y}", goal.toLocaleString("en-US"));

  return (
    <section className="mx-auto max-w-7xl px-3 pt-3 md:px-6 md:pt-4" aria-label={t("ship.stripBadge")}>
      <div
        className={`relative overflow-hidden rounded-2xl p-4 text-white shadow-lg ring-1 ring-black/5 transition-colors duration-500 md:rounded-3xl md:p-5 ${
          done
            ? "bg-gradient-to-r from-[#065F46] via-[#059669] to-[#10B981] shadow-lg shadow-[#059669]/20"
            : "bg-gradient-to-r from-[#0B1E38] via-[#184C8A] to-[#1D4ED8] shadow-lg shadow-[#184C8A]/20"
        }`}
      >
        {/* decorative glow */}
        <span className="pointer-events-none absolute -end-10 -top-14 size-36 rounded-full bg-white/10 blur-2xl" />
        <span className="pointer-events-none absolute -start-8 -bottom-16 size-40 rounded-full bg-[#F59E0B]/25 blur-2xl" />

        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
          {/* icon */}
          <span className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#EA580C] text-white shadow-md md:grid">
            <IconVanDuo className="size-6" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] px-2.5 py-0.5 text-[10px] font-black tracking-wide text-white shadow-sm md:text-[11px] ring-1 ring-white/20">
                {t("ship.stripBadge")}
              </span>
              <p className="font-heading text-sm font-black leading-snug md:text-lg">
                <StripMessage raw={msg} />
              </p>
            </div>
            {/* progress */}
            <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-white/20 md:h-3 backdrop-blur-xs">
              <div
                className={`relative h-full rounded-full transition-all duration-700 ease-out ${
                  done ? "bg-white" : "bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#FCD34D] shadow-xs"
                }`}
                style={{ width: `${Math.max(pct, has ? 6 : 0)}%` }}
              >
                {pct > 0 && pct < 100 && (
                  <span className="absolute inset-0 animate-pulse rounded-full bg-white/30" />
                )}
              </div>
            </div>
          </div>

          {!has && (
            <Button
              className="h-11 shrink-0 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#EA580C] px-7 text-sm font-black text-white shadow-lg transition hover:brightness-105 active:scale-95"
              onClick={() => go("catalog")}
            >
              {t("ship.stripCta")}
              <IconChevronR className="size-4 rtl:rotate-180" />
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Trust strip                                                         */
/* ------------------------------------------------------------------ */
function TrustStrip() {
  const t = useT();
  const items = [
    { icon: IconVanDuo, tint: "bg-[#EAF2FA]", color: "text-[#184C8A]", title: "trust.ship", desc: "trust.shipD" },
    { icon: IconShieldCrossDuo, tint: "bg-[#ECFDF5]", color: "text-[#059669]", title: "trust.original", desc: "trust.originalD" },
    { icon: IconPharmacistDuo, tint: "bg-[#FFFBEB]", color: "text-[#D97706]", title: "trust.pharmacist", desc: "trust.pharmacistD" },
    { icon: IconWalletDuo, tint: "bg-[#F1F5F9]", color: "text-[#0B1E38]", title: "trust.payment", desc: "trust.paymentD" },
  ] as const;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-20 md:px-6 md:pt-24">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {items.map((it) => (
          <div
            key={it.title}
            className="bb-card-hover flex flex-col items-center gap-2.5 rounded-2xl border border-border/70 bg-card p-4 text-center shadow-xs md:flex-row md:justify-start md:gap-3.5 md:p-5 md:text-start"
          >
            <span className={`grid size-11 shrink-0 place-items-center rounded-full ${it.tint}`}>
              <it.icon className={`size-5 ${it.color}`} />
            </span>
            <div>
              <div className="font-heading text-sm font-black md:text-[15px]">{t(it.title)}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground md:text-xs">
                {t(it.desc)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Categories — real product photos, big-company tiles                 */
/* ------------------------------------------------------------------ */
function Categories() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const openCatalog = useBahbah((s) => s.openCatalog);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-14 md:px-6 md:pt-16">
      <SectionHead title={t("cat.title")} sub={t("cat.sub")} />
      <div className="grid grid-cols-3 gap-3 md:grid-cols-6 md:gap-4">
        {categories.map((c) => {
          const DuoIcon = duoOf(c.icon);
          return (
            <button
              key={c.id}
              onClick={() => openCatalog(c.id)}
              className="group text-center"
            >
              <span className="relative block overflow-hidden rounded-2xl shadow-xs ring-1 ring-black/5 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl">
                <span className="relative block aspect-square">
                  <Image
                    src={c.img}
                    alt={lang === "ar" ? c.nameAr : c.nameEn}
                    fill
                    sizes="(max-width:768px) 30vw, 180px"
                    className="object-cover transition duration-500 group-hover:scale-110"
                  />
                </span>
                <span className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-1.5 start-1.5 grid size-7 place-items-center rounded-full bg-white/95 shadow-md backdrop-blur-md md:bottom-2 md:start-2 md:size-9 ring-1 ring-black/5">
                  <DuoIcon className={`size-4 md:size-5 ${c.color}`} strokeWidth={1.7} />
                </span>
              </span>
              <span className="mt-2 block text-[11px] font-black leading-tight text-foreground/85 md:mt-2.5 md:text-sm transition-colors group-hover:text-[#184C8A]">
                {lang === "ar" ? c.nameAr : c.nameEn}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal scroller for offers                                      */
/* ------------------------------------------------------------------ */
function OffersSection() {
  const t = useT();
  const go = useBahbah((s) => s.go);
  const list = offers();

  return (
    <section className="pt-14 md:pt-16">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHead
          title={t("offers.title")}
          sub={t("offers.sub")}
          action={
            <div className="flex items-center gap-2">
              <Badge className="hidden rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] px-3 py-1.5 text-xs font-black text-white hover:brightness-105 sm:block ring-1 ring-white/20">
                {t("offers.ends")}
              </Badge>
              <Button
                variant="outline"
                className="rounded-full border-[#F59E0B]/40 px-5 font-bold text-[#D97706] hover:bg-[#FFFBEB] hover:text-[#D97706] active:scale-95 transition-all"
                onClick={() => go("offers")}
              >
                <IconPercent className="size-4" />
                {t("misc.viewAll")}
              </Button>
            </div>
          }
        />
      </div>
      <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:px-6">
        {list.map((p) => (
          <div key={p.id} className="w-[240px] shrink-0 snap-start md:w-[280px]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Best sellers                                                        */
/* ------------------------------------------------------------------ */
function BestSellers() {
  const t = useT();
  const openCatalog = useBahbah((s) => s.openCatalog);
  const list = bestSellers().slice(0, 8);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-14 md:px-6 md:pt-16">
      <SectionHead
        title={t("best.title")}
        sub={t("best.sub")}
        action={
          <Button
            variant="outline"
            className="rounded-full px-5 font-bold"
            onClick={() => openCatalog(null)}
          >
            {t("misc.viewAll")}
            <IconChevronR className="size-4 rtl:rotate-180" />
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {list.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Wasly delivery cards — شحن سريع + تتبع مباشر + فرع + كل مصر         */
/* ------------------------------------------------------------------ */
function WaslyCards() {
  const t = useT();
  const { go, setConsultOpen } = useBahbah();
  const openCatalogSafe = () => useBahbah.getState().openCatalog(null);

  const cards = [
    {
      key: "fast",
      icon: IconClockFastDuo,
      title: "wasly.fastT",
      desc: "wasly.fastD",
      tone: "bg-[#FFFBEB]",
      color: "text-[#D97706]",
      onClick: () => openCatalogSafe(),
    },
    {
      key: "live",
      icon: IconRouteDuo,
      title: "wasly.liveT",
      desc: "wasly.liveD",
      tone: "bg-[#EAF2FA]",
      color: "text-[#184C8A]",
      onClick: () => go("track"),
    },
    {
      key: "pick",
      icon: IconStorefrontDuo,
      title: "wasly.pickT",
      desc: "wasly.pickD",
      tone: "bg-[#ECFDF5]",
      color: "text-[#059669]",
      onClick: () => setConsultOpen(true),
    },
    {
      key: "eg",
      icon: IconVanDuo,
      title: "wasly.egT",
      desc: "wasly.egD",
      tone: "bg-[#F1F5F9]",
      color: "text-[#0B1E38]",
      onClick: () => go("offers"),
    },
  ] as const;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-14 md:px-6 md:pt-16">
      <SectionHead title={t("wasly.title")} sub={t("wasly.sub")} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {cards.map((c, i) => (
          <button
            key={c.key}
            onClick={c.onClick}
            className={`group relative overflow-hidden rounded-2xl p-4 text-start shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg md:p-5 ${
              i === 0
                ? "bg-gradient-to-br from-[#EA580C] via-[#F59E0B] to-[#D97706] text-white shadow-md shadow-[#F59E0B]/25"
                : "bb-card-hover border border-border/70 bg-card hover:border-[#184C8A]/25"
            }`}
          >
            <span
              className={`grid size-11 place-items-center rounded-2xl transition group-hover:scale-110 ${
                i === 0 ? "bg-white/20 text-white" : `${c.tone} ${c.color}`
              }`}
            >
              <c.icon className="size-5.5" />
            </span>
            <h3 className={`mt-3 font-heading text-sm font-black md:text-base ${i === 0 ? "text-white" : ""}`}>
              {t(c.title)}
            </h3>
            <p className={`mt-1 text-[11px] leading-snug md:text-xs ${i === 0 ? "text-white/85" : "text-muted-foreground"}`}>
              {t(c.desc)}
            </p>
            {i === 0 && (
              <span className="absolute -end-6 -top-6 size-20 rounded-full bg-white/15 transition group-hover:scale-125" />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* رعاية بحبح — صناديق العلاج الشهري (أهداف جيم حقيقية من المخزون)     */
/* ------------------------------------------------------------------ */
function CareSection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const go = useBahbah((s) => s.go);
  const openCareWizard = useBahbah((s) => s.openCareWizard);
  const stockAdj = useBahbah((s) => s.stockAdj);

  return (
    <section className="pt-14 md:pt-16">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <Reveal>
          <SectionHead title={t("care.title")} sub={t("care.sub")} />
          <div className="mt-3 flex justify-center">
            <Button
              variant="outline"
              className="rounded-full border-[#F59E0B]/40 px-6 font-black text-[#D97706] hover:bg-[#FFFBEB] hover:text-[#D97706] active:scale-95 transition-all"
              onClick={() => go("care")}
            >
              <IconBoxes className="size-4.5" />
              {t("care.viewAll")}
              <IconChevronR className="size-4 rtl:rotate-180" />
            </Button>
          </div>
        </Reveal>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {carePlans.slice(0, 3).map((plan) => {
            const Icon = plan.icon;
            const save = Math.round(((plan.oldPrice - plan.price) / plan.oldPrice) * 100);
            const meds = plan.medIds
              .map((id) => getProduct(id))
              .filter(Boolean) as NonNullable<ReturnType<typeof getProduct>>[];
            const stocks = plan.medIds.map((id) => effStock(id, stockAdj));
            const outCount = stocks.filter((s) => s === 0).length;
            const lowCount = stocks.filter((s) => s > 0 && s <= 5).length;
            const stockChip = outCount > 0
              ? { key: t("stock.boxOut"), cls: "bg-[#FFFBEB] text-[#D97706] ring-1 ring-[#F59E0B]/20", dot: "bg-[#F59E0B]" }
              : lowCount > 0
                ? { key: t("stock.boxLow"), cls: "bg-[#FEF2F2] text-[#DC2626] ring-1 ring-[#DC2626]/20", dot: "bg-[#DC2626]" }
                : { key: t("stock.boxFull"), cls: "bg-[#ECFDF5] text-[#059669] ring-1 ring-[#10B981]/20", dot: "bg-[#10B981]" };
            return (
              <div
                key={plan.id}
                className="bb-card-hover group relative flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-xs hover:border-[#184C8A]/25"
              >
                <span
                  className="absolute -end-10 -top-10 size-28 rounded-full opacity-10 transition group-hover:scale-125"
                  style={{ backgroundColor: plan.color }}
                />
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-md transition duration-300 group-hover:scale-110 group-hover:rotate-3"
                    style={{ backgroundColor: plan.color }}
                  >
                    <Icon className="size-6" />
                  </span>
                  <div>
                    <h3 className="font-heading text-lg font-black">{lang === "ar" ? plan.nameAr : plan.nameEn}</h3>
                    <Badge className="mt-0.5 rounded-full bg-[#FFFBEB] text-[11px] font-black text-[#D97706] ring-1 ring-[#F59E0B]/20 hover:bg-[#FFFBEB]">
                      {t("care.save")} {save}%
                    </Badge>
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {lang === "ar" ? plan.descAr : plan.descEn}
                </p>

                {/* اللي جوه الصندوق — من المخزن */}
                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-bold text-muted-foreground">{t("care.includes")}:</p>
                  <div className="flex items-center gap-1.5">
                    {meds.map((m, k) => (
                      <span
                        key={m.id}
                        className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-black/5 shadow-xs"
                        style={{ zIndex: meds.length - k }}
                        title={lang === "ar" ? m.nameAr : m.nameEn}
                      >
                        {m.img ? (
                          <Image src={m.img} alt={m.nameEn} fill sizes="48px" className="object-contain p-0.5" />
                        ) : (
                          <span className="grid size-full place-items-center bg-[#EAF2FA]">
                            <m.icon className="size-5 text-[#184C8A]" strokeWidth={1.6} />
                          </span>
                        )}
                      </span>
                    ))}
                    <span className="ms-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-black text-foreground/70">
                      {meds.length} {lang === "ar" ? "أصناف" : "items"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {meds.slice(0, 3).map((m) => (
                      <span key={m.id} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground/70">
                        <IconCheck className="size-2.5 text-[#059669]" />
                        {lang === "ar" ? m.nameAr : m.nameEn}
                      </span>
                    ))}
                  </div>
                </div>

                {/* حالة المخزون — مباشرة */}
                <div className={`mt-3 flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black ${stockChip.cls}`}>
                  <span className="relative flex size-2">
                    <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${stockChip.dot}`} />
                    <span className={`relative inline-flex size-2 rounded-full ${stockChip.dot}`} />
                  </span>
                  {stockChip.key}
                </div>

                <div className="mt-5 flex items-end justify-between border-t border-border/60 pt-4">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-heading text-2xl font-black" style={{ color: plan.color }}>
                        {plan.price.toLocaleString("en-US")}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground">{t("care.perMonth")}</span>
                    </div>
                    <span className="text-xs text-muted-foreground line-through">
                      {plan.oldPrice.toLocaleString("en-US")} {t("misc.currency")}
                    </span>
                  </div>
                  <Button
                    className="h-11 rounded-full px-6 font-black text-white shadow-md active:scale-[0.98] transition hover:brightness-105"
                    style={{ backgroundColor: plan.color }}
                    onClick={() => {
                      openCareWizard(plan.id);
                      go("care");
                    }}
                  >
                    <IconBoxes className="size-4.5" />
                    {t("care.subscribe")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-[#FFFBEB] px-4 py-3 text-center text-xs font-bold text-[#D97706] ring-1 ring-[#F59E0B]/20 md:text-sm">
          <IconBoxes className="size-4.5 shrink-0" />
          {t("care.monthlyNote")} · {t("stock.live")}
          <button
            className="underline underline-offset-4 hover:text-[#184C8A]"
            onClick={() => go("care")}
          >
            {t("care.viewAll")}
          </button>
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Quick medical tools — checker + voice + big text                    */
/* ------------------------------------------------------------------ */
function ToolsRow() {
  const t = useT();
  const elderMode = useBahbah((s) => s.elderMode);
  const { setIcOpen, setSearchOpen, toggleElderMode } = useBahbah();

  const items = [
    {
      icon: IconCapsuleDuo,
      tint: "bg-[#EAF1F9]",
      color: "text-[#1E4E8F]",
      title: "tools.checkerT",
      desc: "tools.checkerD",
      onClick: () => setIcOpen(true),
    },
    {
      icon: IconMic,
      tint: "bg-[#FFF4E5]",
      color: "text-[#C56A0A]",
      title: "tools.voice",
      desc: "search.title",
      onClick: () => setSearchOpen(true),
    },
    {
      icon: IconTextSize,
      tint: "bg-[#EAF6F1]",
      color: "text-[#2E9E6B]",
      title: "tools.elder",
      desc: elderMode ? "tools.elderOn" : "tools.elderSub",
      onClick: () => {
        toggleElderMode();
        toast.success(t("tools.elderOn"));
      },
      active: elderMode,
    },
  ] as const;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-14 md:px-6 md:pt-16">
      <SectionHead title={t("tools.title")} sub={t("tools.sub")} />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((it) => (
          <button
            key={it.title}
            onClick={it.onClick}
            className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 text-start shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg md:p-5 ${
              "active" in it && it.active
                ? "border-[#2E9E6B]/50 bg-[#EAF6F1]/60"
                : "border-border/70 bg-card"
            }`}
          >
            <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${it.tint} transition group-hover:scale-110`}>
              <it.icon className={`size-6 ${it.color}`} />
            </span>
            <span className="min-w-0">
              <span className="block font-heading text-sm font-black md:text-base">{t(it.title)}</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">{t(it.desc)}</span>
            </span>
            <IconChevronR className="ms-auto size-4 shrink-0 text-muted-foreground rtl:rotate-180" />
          </button>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Mid-page promo banners (AI photos)                                  */
/* ------------------------------------------------------------------ */
function PromoBanners() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const openCatalog = useBahbah((s) => s.openCatalog);
  const skin = categories.find((c) => c.id === "skincare")!;
  const baby = categories.find((c) => c.id === "baby")!;

  const banners = [
    {
      img: "/images/ads/ad-skin.png",
      title: lang === "ar" ? skin.nameAr : skin.nameEn,
      sub: lang === "ar" ? "أقوى الماركات العالمية" : "Top global brands",
      cat: "skincare",
    },
    {
      img: "/images/ads/ad-baby.png",
      title: lang === "ar" ? baby.nameAr : baby.nameEn,
      sub: lang === "ar" ? "كل اللي بيبي محتاجه" : "Everything for your baby",
      cat: "baby",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 pt-14 md:px-6 md:pt-16">
      <div className="grid gap-4 md:grid-cols-2">
        {banners.map((b) => (
          <button
            key={b.cat}
            onClick={() => openCatalog(b.cat)}
            className="group relative h-40 overflow-hidden rounded-3xl shadow-md ring-1 ring-black/5 transition hover:shadow-xl md:h-52"
          >
            <Image
              src={b.img}
              alt={b.title}
              fill
              sizes="(max-width:768px) 100vw, 560px"
              className="object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-0 start-0 p-5 text-start text-white">
              <h3 className="font-heading text-xl font-black drop-shadow md:text-2xl">{b.title}</h3>
              <p className="mt-1 text-xs font-bold text-white/85 md:text-sm">{b.sub}</p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-black text-[#112D51] shadow-md transition group-hover:gap-2">
                {t("misc.viewAll")}
                <IconChevronR className="size-3.5 rtl:rotate-180" />
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */
function Services() {
  const t = useT();
  const { setRxOpen, setConsultOpen, go } = useBahbah();

  const items = [
    {
      icon: IconRxClipboardDuo,
      tint: "bg-[#FFF4E5]",
      color: "text-[#C56A0A]",
      title: "services.uploadT",
      desc: "services.uploadD",
      onClick: () => setRxOpen(true),
    },
    {
      icon: IconPhone,
      tint: "bg-[#EAF1F9]",
      color: "text-[#1E4E8F]",
      title: "services.consultT",
      desc: "services.consultD",
      onClick: () => setConsultOpen(true),
    },
    {
      icon: IconRouteDuo,
      tint: "bg-[#EAF6F1]",
      color: "text-[#2E9E6B]",
      title: "services.trackT",
      desc: "services.trackD",
      onClick: () => go("account"),
    },
  ] as const;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-14 md:px-6 md:pt-16">
      <SectionHead title={t("services.title")} sub={t("services.sub")} />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((it) => (
          <button
            key={it.title}
            onClick={it.onClick}
            className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 text-start shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <span className={`grid size-13 place-items-center rounded-2xl ${it.tint} transition group-hover:scale-105`}>
              <it.icon className={`size-6 ${it.color}`} />
            </span>
            <h3 className="mt-4 font-heading text-lg font-black">{t(it.title)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(it.desc)}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#1E4E8F]">
              {t("hero.cta1")}
              <IconChevronR className="size-4 transition group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
            </span>
            <span className="absolute -end-8 -top-8 size-24 rounded-full bg-muted/70 transition group-hover:scale-125" />
          </button>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Pharmacist tips                                                     */
/* ------------------------------------------------------------------ */
function Tips() {
  const t = useT();
  const items = [
    { icon: IconDropletPlusDuo, tint: "bg-[#EAF1F9]", color: "text-[#1E4E8F]", title: "tips.1t", desc: "tips.1d" },
    { icon: IconVitaminTubeDuo, tint: "bg-[#EAF6F1]", color: "text-[#2E9E6B]", title: "tips.2t", desc: "tips.2d" },
    { icon: IconThermoDuo, tint: "bg-[#FFF4E5]", color: "text-[#C56A0A]", title: "tips.3t", desc: "tips.3d" },
  ] as const;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-14 md:px-6 md:pt-16">
      <SectionHead title={t("tips.title")} sub={t("tips.sub")} />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((it, i) => (
          <div
            key={it.title}
            className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <span className="font-heading absolute -top-3 end-4 text-7xl font-black text-muted/60 transition group-hover:text-muted">
              {i + 1}
            </span>
            <span className={`relative grid size-13 place-items-center rounded-2xl ${it.tint}`}>
              <it.icon className={`size-6 ${it.color}`} />
            </span>
            <h3 className="relative mt-4 font-heading text-base font-black leading-snug md:text-lg">
              {t(it.title)}
            </h3>
            <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{t(it.desc)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Testimonials                                                        */
/* ------------------------------------------------------------------ */
function Testimonials() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-14 md:px-6 md:pt-16">
      <SectionHead title={t("test.title")} sub={t("test.sub")} />
      <div className="grid gap-4 md:grid-cols-3">
        {testimonials.map((tm) => (
          <div
            key={tm.nameEn}
            className="relative rounded-3xl border border-border/70 bg-card p-6 shadow-sm"
          >
            <IconSparkles className="absolute end-5 top-5 size-5 text-[#F09428]/40" />
            <div className="flex gap-0.5">
              {Array.from({ length: tm.rating }).map((_, i) => (
                <IconStarFill key={i} className="size-4 text-[#F09428]" />
              ))}
            </div>
            <p className="mt-3 min-h-20 text-sm leading-relaxed text-foreground/85">
              &ldquo;{lang === "ar" ? tm.textAr : tm.textEn}&rdquo;
            </p>
            <div className="mt-4 flex items-center gap-3 border-t border-border/60 pt-4">
              <span className="grid size-10 place-items-center rounded-full bg-[#EAF1F9] font-heading text-sm font-black text-[#1E4E8F]">
                {(lang === "ar" ? tm.nameAr : tm.nameEn).charAt(0)}
              </span>
              <div>
                <div className="text-sm font-bold">{lang === "ar" ? tm.nameAr : tm.nameEn}</div>
                <div className="text-xs text-muted-foreground">{t("hero.stat1")}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* CTA banner                                                          */
/* ------------------------------------------------------------------ */
function CtaBanner() {
  const t = useT();
  const openCatalog = useBahbah((s) => s.openCatalog);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-14 md:px-6 md:pt-16">
      <div className="hero-pattern relative overflow-hidden rounded-3xl px-6 py-10 text-white md:px-12 md:py-14 shadow-xl">
        <div className="pointer-events-none absolute -end-16 -top-16 size-56 rounded-full bg-[#F59E0B]/25 blur-2xl" />
        <div className="relative flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-5 text-center md:text-start">
            <div className="hidden md:block">
              <BahbahLogo size={72} />
            </div>
            <div>
              <h3 className="font-heading text-2xl font-black md:text-3xl">{t("cta.title")}</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/75 md:text-base">
                {t("cta.desc")}
              </p>
            </div>
          </div>
          <Button
            size="lg"
            className="h-13 shrink-0 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#EA580C] px-8 text-base font-black text-white shadow-lg shadow-[#F59E0B]/30 hover:brightness-105 active:scale-95 transition-all"
            onClick={() => openCatalog(null)}
          >
            {t("cta.btn")}
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Trust marquee — infinite animated strip right under the hero        */
/* ------------------------------------------------------------------ */
function TrustMarquee() {
  const t = useT();
  const items = ["mq.1", "mq.2", "mq.3", "mq.4", "mq.5", "mq.6"] as const;
  const row = [...items, ...items];
  return (
    <div className="bb-marquee relative overflow-hidden border-y border-[#F59E0B]/20 bg-[#0B1E38] py-3 text-white">
      <div className="bb-marquee-track items-center">
        {row.map((k, i) => (
          <span key={i} className="flex shrink-0 items-center gap-3 px-5 text-xs font-black md:text-sm">
            <IconSparkles className="size-4 shrink-0 text-[#F59E0B]" />
            {t(k)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ركن الجيم — حاجات الجيم الأصلية بالهدف (تضخيم/تنشيف/قوة/بداية)       */
/* ------------------------------------------------------------------ */

type GymGoal = "all" | "mass" | "cut" | "power" | "start";

const GYM_GOAL: Record<string, Exclude<GymGoal, "all">> = {
  "creatine-mono": "power",
  "whey-gold": "mass",
  "mass-gainer": "mass",
  "bcaa-5000": "power",
  "l-carnitine-3000": "cut",
  "fat-burner": "cut",
  "pre-workout": "power",
  "multivitamin-sport": "start",
  "protein-bar": "cut",
  "shaker-bottle": "start",
};

function GymZone() {
  const t = useT();
  const [goal, setGoal] = useState<GymGoal>("all");
  const openCatalog = useBahbah((s) => s.openCatalog);
  const stockAdj = useBahbah((s) => s.stockAdj);

  const gym = products.filter((p) => p.category === "fitness");
  const list = gym.filter((p) => goal === "all" || GYM_GOAL[p.id] === goal);
  const inStock = gym.filter((p) => effStock(p.id, stockAdj) > 0).length;

  const chips: { key: GymGoal; label: string }[] = [
    { key: "all", label: t("gym.goalAll") },
    { key: "mass", label: t("gym.goalMass") },
    { key: "cut", label: t("gym.goalCut") },
    { key: "power", label: t("gym.goalPower") },
    { key: "start", label: t("gym.goalStart") },
  ];

  return (
    <section className="relative mt-14 overflow-hidden bg-[#0B1E38] py-12 text-white md:mt-16 md:py-16" aria-label={t("gym.title")}>
      {/* glow */}
      <span className="pointer-events-none absolute -top-24 start-[12%] size-64 rounded-full bg-[#184C8A]/70 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-28 end-[6%] size-72 rounded-full bg-[#F59E0B]/20 blur-3xl" />
      <span className="bb-float pointer-events-none absolute top-10 end-[4%] hidden text-5xl opacity-20 lg:block" aria-hidden>🏋️</span>

      <div className="relative mx-auto max-w-7xl px-4 md:px-6">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#EA580C] to-[#F59E0B] text-white shadow-lg shadow-[#EA580C]/30 md:size-14">
                <Dumbbell className="size-6 md:size-7" />
              </span>
              <div>
                <h2 className="font-heading text-2xl font-black md:text-3xl">{t("gym.title")}</h2>
                <p className="mt-0.5 text-sm text-white/70 md:text-base">{t("gym.sub")}</p>
              </div>
            </div>
          </div>
          {/* live stock badge */}
          <span className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-black text-white ring-1 ring-white/20 backdrop-blur md:text-xs">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#10B981] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#10B981]" />
            </span>
            {t("gym.live")} · {inStock}/{gym.length}
          </span>
        </div>

        {/* goal chips */}
        <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setGoal(c.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition active:scale-95 md:text-sm ${
                goal === c.key
                  ? "bg-gradient-to-r from-[#EA580C] to-[#F59E0B] text-white shadow-lg shadow-[#EA580C]/30 ring-1 ring-white/20"
                  : "bg-white/10 text-white/80 ring-1 ring-white/15 hover:bg-white/20 hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* product scroller */}
      <div className="relative no-scrollbar mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:px-6">
        {list.map((p) => (
          <div key={p.id} className="w-[220px] shrink-0 snap-start md:w-[260px]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      <div className="relative mx-auto mt-6 flex max-w-7xl justify-center px-4 md:px-6">
        <Button
          className="h-12 rounded-full bg-white px-8 text-sm font-black text-[#0B1E38] shadow-lg transition hover:bg-white/95 active:scale-95"
          onClick={() => openCatalog("fitness")}
        >
          {t("gym.viewAll")}
          <IconChevronR className="size-4 rtl:rotate-180" />
        </Button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Home view                                                           */
/* ------------------------------------------------------------------ */
export default function HomeView() {
  return (
    <main className="pb-16 md:pb-20">
      <Hero />
      <TrustMarquee />
      <FreeShipStrip />
      <AdCarousel />
      <TrustStrip />
      <Categories />
      <GymZone />
      <OffersSection />
      <CareSection />
      <BestSellers />
      <WaslyCards />
      <Services />
      <ToolsRow />
      <PromoBanners />
      <Tips />
      <Testimonials />
      <CtaBanner />
    </main>
  );
}
