"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  CookingPot,
  Home,
  Phone,
  MapPin,
  Wallet,
  Package,
  PartyPopper,
  Star,
  MessageCircle,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBahbah, useT } from "@/lib/bahbah/store";
import { zoneById, driverById, BRANCH, PHARMACY } from "@/lib/bahbah/data";
import { IconScooter, IconStorefront, IconPin, IconClockFast, IconOtpBox, IconStarRate } from "./icons";
import { fmtPrice } from "./product-card";

/* ------------------------------------------------------------------ */
/* Live tracking — animated route map + courier card + timeline        */
/* ------------------------------------------------------------------ */

const STEP_ICONS = [ClipboardCheck, CookingPot, IconScooter, Home];

/* route path in a 400x220 viewBox — pharmacy (bottom-left) → home (top-right) */
const ROUTE_D =
  "M30 190 C110 172 92 102 172 96 C240 92 252 142 302 112 C338 90 352 62 372 32";

function statusStep(status: string): number {
  if (status === "pending") return 1;
  if (status === "shipping") return 2;
  if (status === "delivered") return 4;
  return 1;
}

function progressOf(status: string): number {
  if (status === "pending") return 14;
  if (status === "shipping") return 62;
  if (status === "delivered") return 100;
  return 0;
}

export default function TrackView() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const trackOrderId = useBahbah((s) => s.trackOrderId);
  const myOrders = useBahbah((s) => s.myOrders);
  const { go, advanceTrack, openAccount } = useBahbah();
  const [rating, setRating] = useState(0);

  const order = useMemo(
    () => myOrders.find((o) => o.id === trackOrderId) ?? myOrders[0],
    [myOrders, trackOrderId]
  );

  if (!order) {
    return (
      <main className="flex flex-col items-center gap-4 py-24 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-muted">
          <Package className="size-9 text-muted-foreground" />
        </div>
        <h2 className="font-heading text-xl font-black">{t("track.notFound")}</h2>
        <Button className="mt-2 rounded-full px-10 font-bold" onClick={() => go("catalog")}>
          {t("cart.continue")}
        </Button>
      </main>
    );
  }

  const step = statusStep(order.status);
  const done = order.status === "delivered";
  const cancelled = order.status === "cancelled";
  const progress = progressOf(order.status);

  const steps = [
    { title: t("track.step1"), desc: t("track.step1D") },
    { title: t("track.step2"), desc: t("track.step2D") },
    { title: t("track.step3"), desc: t("track.step3D") },
    { title: t("track.step4"), desc: t("track.step4D") },
  ];

  const paymentLabel =
    order.payment === "cod"
      ? t("checkout.cod")
      : order.payment === "instapay"
        ? t("checkout.instapay")
        : t("checkout.card");

  const zone = zoneById(order.delivery?.zoneId);
  const driver = driverById(order.delivery?.driverId);
  const isPickup = order.delivery?.type === "pickup";

  /* deterministic 4-digit handover code derived from the order id */
  let otp = "4821";
  {
    let h = 7;
    for (const ch of order.id) h = (h * 31 + ch.charCodeAt(0)) % 8900;
    otp = String(1000 + h);
  }

  const etaText = done
    ? t("track.done")
    : order.status === "pending"
      ? t("track.step2")
      : zone
        ? t("dv.zoneEta").replace("{x}", String(zone.etaMin))
        : t("track.etaValue");

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-6 md:px-6 md:pb-16 md:pt-8">
      {/* back + title */}
      <button
        onClick={() => openAccount("orders")}
        className="mb-4 flex items-center gap-1 text-sm font-bold text-muted-foreground transition hover:text-[#184C8A]"
      >
        <ArrowRight className="size-4 rtl:inline ltr:hidden" />
        <ArrowLeft className="size-4 ltr:inline rtl:hidden" />
        {t("product.back")}
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-black md:text-3xl">{t("track.title")}</h1>
        <div className="flex items-center gap-2">
          <Badge className="rounded-full bg-[#EAF2FA] px-4 py-2 font-heading text-sm font-black text-[#184C8A] hover:bg-[#EAF2FA]">
            {t("track.order")}: {order.id}
          </Badge>
          {!done && !cancelled && (
            <Badge className="gap-1 rounded-full bg-red-500/10 px-3 py-2 text-[10px] font-black text-red-600 hover:bg-red-500/10">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-red-500" />
              </span>
              {t("track.live")}
            </Badge>
          )}
        </div>
      </div>

      {/* cancelled banner */}
      {cancelled ? (
        <div className="mt-6 rounded-3xl border border-red-200 bg-red-50/50 p-6 text-center">
          <p className="font-heading text-lg font-black text-red-600">{t("status.cancelled")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("track.notFound")}</p>
        </div>
      ) : (
        <>
          {/* ============ LIVE MAP ============ */}
          <div className="mt-6 overflow-hidden rounded-3xl border border-border/70 bg-card bb-card-shadow">
            <div dir="ltr" className="relative h-56 w-full bg-[#EAF2FA]/70 md:h-64">
              {/* city blocks */}
              <svg viewBox="0 0 400 220" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
                <g fill="#dbe6f3" opacity="0.55">
                  <rect x="52" y="28" width="64" height="44" rx="8" />
                  <rect x="150" y="16" width="58" height="52" rx="8" />
                  <rect x="248" y="30" width="70" height="46" rx="8" />
                  <rect x="322" y="120" width="56" height="52" rx="8" />
                  <rect x="46" y="112" width="70" height="46" rx="8" />
                  <rect x="150" y="128" width="62" height="48" rx="8" />
                </g>
                <g stroke="#c9d8ea" strokeWidth="1.5" opacity="0.7">
                  <path d="M0 100h400M0 176h400M118 0v220M226 0v220" />
                </g>
                {/* park */}
                <rect x="252" y="184" width="58" height="26" rx="8" fill="#cfe9db" />

                {/* route base */}
                <path d={ROUTE_D} fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" />
                <path d={ROUTE_D} fill="none" stroke="#c9d8ea" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 10" />
                {/* route progress */}
                <path
                  d={ROUTE_D}
                  fill="none"
                  stroke="#184C8A"
                  strokeWidth="4"
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray={`${progress} 100`}
                  className="transition-all duration-1000 ease-out"
                />
                {/* endpoints */}
                <g>
                  <circle cx="30" cy="190" r="13" fill="#184C8A" />
                  <circle cx="372" cy="32" r="13" fill={done ? "#059669" : "#F59E0B"} />
                </g>
              </svg>

              {/* endpoint labels */}
              <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-black text-[#0B1E38] shadow-sm">
                <IconStorefront className="size-3.5 text-[#184C8A]" />
                {t("track.pharmacy")}
              </span>
              <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-black text-[#0B1E38] shadow-sm">
                <IconPin className={`size-3.5 ${done ? "text-[#059669]" : "text-[#F59E0B]"}`} />
                {isPickup ? t("dv.pickup") : t("track.yourDoor")}
              </span>

              {/* moving scooter marker */}
              <span
                className="absolute left-0 top-0 grid size-11 place-items-center rounded-full bg-gradient-to-br from-[#184C8A] to-[#0B1E38] text-white shadow-lg shadow-[#184C8A]/40 ring-4 ring-white transition-all duration-1000 ease-out"
                style={{
                  offsetPath: `path("${ROUTE_D}")`,
                  offsetDistance: `${progress}%`,
                  offsetRotate: "0deg",
                }}
              >
                {done ? <PartyPopper className="size-5" /> : <IconScooter className="size-6" strokeWidth={1.9} />}
              </span>

              {/* progress chip */}
              <span className="absolute bottom-3 right-3 rounded-full bg-[#0B1E38]/90 px-3 py-1.5 text-[11px] font-black text-white shadow-sm" dir="ltr">
                {progress}%
              </span>
            </div>

            {/* under-map strip: ETA + route endpoints (mobile-friendly) */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-5 py-3.5">
              <span className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
                <IconStorefront className="size-4 text-[#184C8A]" />
                {lang === "ar" ? BRANCH.nameAr : BRANCH.nameEn}
              </span>
              <span className="hidden items-center gap-1.5 text-xs font-bold text-[#184C8A] sm:flex">
                <IconClockFast className="size-4" />
                {t("track.progress").replace("{x}", String(progress))}
              </span>
              <span className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
                {isPickup ? (lang === "ar" ? "الفرع" : "Branch") : t("track.yourDoor")}
                <IconPin className={`size-4 ${done ? "text-[#059669]" : "text-[#F59E0B]"}`} />
              </span>
            </div>
          </div>

          {/* ============ delivery handover code (OTP) ============ */}
          {order.status === "shipping" && !isPickup && (
            <div className="mt-4 flex items-center gap-3.5 rounded-2xl border border-[#184C8A]/20 bg-[#EAF2FA]/80 p-4 bb-card-shadow">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#184C8A]/10 text-[#184C8A]">
                <IconOtpBox className="size-5.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm font-black text-[#184C8A]">{t("track.otp")}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{t("track.otpHint")}</p>
              </div>
              <span
                className="shrink-0 rounded-xl bg-white px-4 py-2.5 font-heading text-xl font-black tracking-[0.28em] text-[#184C8A] shadow-sm ring-1 ring-[#184C8A]/15"
                dir="ltr"
              >
                {otp}
              </span>
            </div>
          )}

          {/* ============ ETA + courier ============ */}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {/* courier card */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-border/70 bg-card p-4 bb-card-shadow">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#EAF2FA] font-heading text-lg font-black text-[#184C8A]">
                {driver ? (lang === "ar" ? driver.nameAr : driver.nameEn).charAt(0) : <IconScooter className="size-6" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-muted-foreground">{t("track.driver")}</p>
                <p className="truncate font-heading text-base font-black">
                  {driver ? (lang === "ar" ? driver.nameAr : driver.nameEn) : t("track.courierName")}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-bold text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#184C8A] to-[#0B1E38] px-2 py-0.5 text-[10px] font-black text-white">
                    <IconScooter className="size-3" />
                    {t("track.wasly")}
                  </span>
                  <span className="flex items-center gap-0.5 text-[#F59E0B]">
                    <Star className="size-3 fill-[#F59E0B]" />
                    {driver ? driver.rating.toFixed(1) : "4.9"}
                  </span>
                  {driver && (
                    <span className="rounded-md bg-muted px-1.5 py-0.5" dir="ltr">
                      {t("track.plate")}: {driver.plate}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-[10px] font-bold text-[#059669]">{t("track.waslyNote")}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <a
                  href={`tel:${driver ? driver.phone.replace(/\s/g, "") : PHARMACY.phone1Href}`}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-[#059669] px-3.5 text-xs font-bold text-white transition hover:bg-[#047857]"
                >
                  <Phone className="size-3.5" />
                  {t("track.call")}
                </a>
                <button
                  className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-border px-3.5 text-xs font-bold text-foreground/70 transition hover:border-[#184C8A]/40 hover:text-[#184C8A]"
                  onClick={() => useBahbah.getState().setConsultOpen(true)}
                >
                  <MessageCircle className="size-3.5" />
                  {t("track.chat")}
                </button>
              </div>
            </div>

            {/* ETA card */}
            <div className="flex items-center gap-4 rounded-2xl border border-amber-300/40 bg-amber-50/80 p-4 bb-card-shadow">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-100/70">
                {done ? (
                  <PartyPopper className="size-6 text-[#059669]" />
                ) : (
                  <Clock className={`size-6 text-amber-700 ${order.status === "shipping" ? "animate-pulse" : ""}`} />
                )}
              </span>
              <div>
                <p className="text-xs font-bold text-amber-800">{t("track.eta")}</p>
                <p className="font-heading text-base font-black text-amber-950">{etaText}</p>
                {(zone || order.delivery) && (
                  <p className="mt-1 text-[11px] font-bold text-amber-800/80">
                    {zone ? (lang === "ar" ? zone.nameAr : zone.nameEn) : ""} ·{" "}
                    {order.delivery ? (lang === "ar" ? order.delivery.slotAr : order.delivery.slotEn) : ""}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ============ timeline ============ */}
          <div className="mt-6 rounded-3xl border border-border/70 bg-card p-5 bb-card-shadow md:p-7">
            <ol className="relative">
              {steps.map((s, i) => {
                const isDone = i < step;
                const isActive = i === step;
                const Icon = STEP_ICONS[i];
                return (
                  <li key={i} className="relative flex items-start gap-4 pb-7 last:pb-0">
                    {i < steps.length - 1 && (
                      <span
                        className={`absolute start-[21px] top-11 h-7 w-0.5 rounded-full transition-colors duration-500 ${
                          i < step ? "bg-[#059669]" : "bg-border"
                        }`}
                      />
                    )}
                    <span
                      className={`relative z-10 grid size-11 shrink-0 place-items-center rounded-full transition-all duration-500 ${
                        isDone
                          ? "bg-[#059669] text-white"
                          : isActive
                            ? "bg-gradient-to-r from-[#184C8A] to-[#0B1E38] text-white shadow-lg shadow-[#184C8A]/30"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="size-5" /> : <Icon className="size-5" />}
                      {isActive && (
                        <span className="absolute inset-0 animate-ping rounded-full bg-[#184C8A]/30" />
                      )}
                    </span>
                    <div className={`pt-0.5 ${!isDone && !isActive ? "opacity-50" : ""}`}>
                      <p
                        className={`font-heading text-[15px] font-black ${
                          isActive ? "text-[#184C8A]" : isDone ? "text-[#059669]" : "text-foreground/70"
                        }`}
                      >
                        {s.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground md:text-sm">
                        {s.desc}
                      </p>
                    </div>
                    {isActive && (
                      <Badge className="ms-auto hidden rounded-full bg-[#184C8A]/10 px-3 py-1.5 text-[10px] font-black text-[#184C8A] hover:bg-[#184C8A]/10 sm:block">
                        {t("track.live")}
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ol>

            {!done && (
              <Button
                variant="outline"
                className="mt-6 w-full rounded-full border-dashed text-sm font-bold text-muted-foreground hover:text-[#184C8A] hover:border-[#184C8A]/30"
                onClick={advanceTrack}
              >
                <IconScooter className="size-4" />
                {t("track.simulate")}
              </Button>
            )}
          </div>

          {/* ============ rate the delivery ============ */}
          {done && (
            <div className="mt-4 rounded-3xl border border-border/70 bg-card p-5 bb-card-shadow md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-heading text-lg font-black">
                  <IconStarRate className="size-5 text-[#F59E0B]" />
                  {t("track.rate")}
                </h3>
                {rating > 0 && (
                  <span className="flex items-center gap-1 text-sm font-bold text-[#059669]">
                    <BadgeCheck className="size-4" />
                    {t("track.rateThanks")}
                  </span>
                )}
              </div>
              <div className="mt-3 flex gap-1.5" dir="ltr">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    aria-label={`${n} / 5`}
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <IconStarRate
                      className={`size-8 ${
                        n <= rating
                          ? "text-[#F59E0B] [&_path]:fill-[#F59E0B]"
                          : "text-[#C9D4E4]"
                      }`}
                      strokeWidth={1.6}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ============ summary ============ */}
      <div className="mt-6 rounded-3xl border border-border/70 bg-card p-5 bb-card-shadow md:p-6">
        <h3 className="font-heading text-lg font-black">{t("track.summary")}</h3>

        <div className="mt-4 space-y-2">
          {order.items.map((it) => (
            <div key={it.productId} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">
                {lang === "ar" ? it.nameAr : it.nameEn}
                <span className="text-muted-foreground"> × {it.qty}</span>
              </span>
              <span className="shrink-0 font-bold">{fmtPrice(it.price * it.qty, t)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-3">
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 size-4 shrink-0 text-[#184C8A]" />
            <div>
              <p className="text-[11px] font-bold text-muted-foreground">{t("track.address")}</p>
              <p className="text-sm font-bold leading-snug">{order.address}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Wallet className="mt-0.5 size-4 shrink-0 text-[#184C8A]" />
            <div>
              <p className="text-[11px] font-bold text-muted-foreground">{t("track.payment")}</p>
              <p className="text-sm font-bold">{paymentLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Clock className="mt-0.5 size-4 shrink-0 text-[#184C8A]" />
            <div>
              <p className="text-[11px] font-bold text-muted-foreground">{t("track.slot")}</p>
              <p className="text-sm font-bold">
                {order.delivery
                  ? (lang === "ar" ? order.delivery.slotAr : order.delivery.slotEn)
                  : t("track.etaValue")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
          <span className="font-heading text-base font-black">
            {t("account.total")}: <span className="text-[#184C8A]">{fmtPrice(order.total, t)}</span>
          </span>
          <Badge className="gap-1 rounded-full bg-[#ECFDF5] text-xs font-bold text-[#059669] hover:bg-[#ECFDF5]">
            <BadgeCheck className="size-3.5" />
            {t("trust.original")}
          </Badge>
        </div>
      </div>
    </main>
  );
}
