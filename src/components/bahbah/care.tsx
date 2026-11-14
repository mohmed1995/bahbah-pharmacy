"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBahbah, useT, useCarePlans, useZones, useSiteInfo, nextDeliveryFor, effStock, type CareSub } from "@/lib/bahbah/store";
import { addonById, careAddons, carePlans, getProduct, WASLY } from "@/lib/bahbah/data";
import {
  IconRefill,
  IconShieldCheck,
  IconScooter,
  IconPharmacist,
  IconBell,
  IconCheck,
  IconPhone,
  IconWhatsapp,
  IconChevronR,
  IconSparkles,
  IconHeartPulse,
  IconPlus,
  IconBoxes,
} from "./icons";
import CareMembershipCard, { DayPicker } from "./care-card";
import { fmtPrice } from "./product-card";
import Reveal from "./reveal";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* رعاية بحبح — premium monthly-treatment (علاج شهري) experience       */
/* ------------------------------------------------------------------ */

const STEPS = [
  { t: "care.step1t", d: "care.step1d", icon: IconBoxes, color: "#184C8A" },
  { t: "care.step2t", d: "care.step2d", icon: IconPharmacist, color: "#059669" },
  { t: "care.step3t", d: "care.step3d", icon: IconScooter, color: "#F59E0B" },
  { t: "care.step4t", d: "care.step4d", icon: IconBell, color: "#2563EB" },
] as const;

const JOURNEY = [
  { t: "care.journey.1t", d: "care.journey.1d", icon: IconBell, color: "#2563EB" },
  { t: "care.journey.2t", d: "care.journey.2d", icon: IconPharmacist, color: "#059669" },
  { t: "care.journey.3t", d: "care.journey.3d", icon: IconScooter, color: "#F59E0B" },
  { t: "care.journey.4t", d: "care.journey.4d", icon: IconShieldCheck, color: "#184C8A" },
] as const;

const FAQS = [1, 2, 3, 4, 5, 6] as const;

const todayISO = () => new Date().toISOString().slice(0, 10);

/* tiny animated counter for the stats band */
function useCountUp(target: number, dur = 1300) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

export default function CareView() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const careSub = useBahbah((s) => s.careSub);
  const wizardPlanFromStore = useBahbah((s) => s.careWizardPlan);
  const user = useBahbah((s) => s.user);
  const site = useSiteInfo();
  const stockAdj = useBahbah((s) => s.stockAdj);
  /* stats counters — hooks must live at the top level */
  const statSubs = useCountUp(2400);
  const statShips = useCountUp(5800);
  const statOntime = useCountUp(98);

  const { subscribeCare, pauseCare, resumeCare, cancelCare, changeCareDay, closeCareWizard, setConsultOpen, go, careMonthly, openProduct } = useBahbah();
  const plans = useCarePlans();

  /* ---------------- wizard state ---------------- */
  const [wizOpenLocal, setWizOpenLocal] = useState(false);
  const [wizStep, setWizStep] = useState(1);
  const [wizPlan, setWizPlan] = useState<string>("box-mass");
  const [wizAddons, setWizAddons] = useState<string[]>([]);
  const [wizName, setWizName] = useState(user?.name ?? "");
  const [wizPhone, setWizPhone] = useState(user?.phone ?? "");
  const [wizAddr, setWizAddr] = useState("");
  const [wizZone, setWizZone] = useState("deirout-city");
  const [wizDay, setWizDay] = useState(() => {
    const d = (new Date().getDate() + 3) % 28;
    return d === 0 ? 28 : d;
  });


  const zoneDisabled = useBahbah((s) => s.zoneDisabled);
  const allZones = useZones();
  const zones = allZones.filter((z) => !zoneDisabled.includes(z.id));


  const activePlan = careSub ? plans.find((p) => p.id === careSub.planId) : undefined;

  /* deep-link aware wizard state (home/account set careWizardPlan → open here) */
  const wizOpen = wizOpenLocal || wizardPlanFromStore != null;
  const effWizPlan = wizardPlanFromStore ?? wizPlan;
  const wizPlanObj = plans.find((p) => p.id === effWizPlan);
  const wizTotal = careMonthly(effWizPlan, wizAddons);
  const firstShip = useMemo(() => nextDeliveryFor(wizDay, todayISO()), [wizDay]);

  const openWizard = (planId: string) => {
    setWizPlan(planId);
    setWizAddons([]);
    setWizStep(1);
    setWizName((n) => n || careSub?.name || user?.name || "");
    setWizPhone((p) => p || careSub?.phone || user?.phone || "");
    setWizAddr((a) => a || careSub?.address || "");
    setWizZone((z) => z || careSub?.zoneId || "deirout-city");
    setWizOpenLocal(true);
  };

  const confirmSubscribe = () => {
    if (!wizName.trim()) return toast.error(t("care.wiz.needName"));
    if (wizPhone.trim().length < 8) return toast.error(t("care.wiz.needPhone"));
    if (!wizAddr.trim()) return toast.error(t("care.wiz.needAddr"));
    subscribeCare({
      planId: wizPlan,
      addons: wizAddons,
      name: wizName,
      phone: wizPhone,
      address: wizAddr,
      zoneId: wizZone,
      dayPref: wizDay,
    });
    setWizOpenLocal(false);
    closeCareWizard();
    toast.success(t("care.subscribed"));
    go("care");
    setTimeout(() => document.getElementById("care-card")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const scrollToPlans = () =>
    document.getElementById("care-plans")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <main className="pb-16 md:pb-20">
      {/* ================= hero ================= */}
      <section className="bb-hero-band relative overflow-hidden text-white">
        <div className="bb-glow pointer-events-none absolute -top-24 start-[8%] size-64 rounded-full bg-[#059669]/30 blur-3xl" />
        <div className="bb-glow pointer-events-none absolute -bottom-28 end-[5%] size-72 rounded-full bg-[#F59E0B]/20 blur-3xl" style={{ animationDelay: "1.6s" }} />
        <span className="bb-float pointer-events-none absolute top-10 end-[12%] hidden text-5xl opacity-30 md:block">💪</span>
        <span className="bb-float-slow pointer-events-none absolute bottom-12 start-[6%] hidden text-4xl opacity-25 md:block">🏋️</span>

        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12 md:px-6 md:pb-20 md:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-5 gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/10">
              <IconHeartPulse className="size-4 text-[#10B981]" />
              {t("care.heroBadge")}
            </Badge>
            <h1 className="font-heading text-4xl font-black leading-[1.15] md:text-6xl">
              {t("care.heroTitle")}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
              {t("care.heroSub")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                className="bb-ring h-13 rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] px-9 text-base font-black text-white shadow-xl shadow-[#EA580C]/25 transition hover:brightness-105 active:scale-95"
                onClick={scrollToPlans}
              >
                <IconBoxes className="size-5" />
                {t("care.cta")}
                <IconChevronR className="size-4 rtl:rotate-180" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-13 rounded-full border-white/30 bg-white/5 px-7 text-base font-bold text-white backdrop-blur transition hover:bg-white/15 hover:text-white"
                onClick={() => setConsultOpen(true)}
              >
                <IconPharmacist className="size-5" />
                {t("fab.consult")}
              </Button>
            </div>

            {/* animated stat band */}
            <div className="mx-auto mt-9 grid max-w-lg grid-cols-3 gap-2.5">
              {(
                [
                  [statSubs, "+", t("care.stats.subs")],
                  [statShips, "+", t("care.stats.ship")],
                  [statOntime, "%", t("care.stats.ontime")],
                ] as const
              ).map(([v, suffix, label], i) => (
                <Reveal key={label} delay={i * 120}>
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-2 py-3.5 backdrop-blur">
                    <p dir="ltr" className="font-heading text-xl font-black text-[#7FE0B4] md:text-2xl">
                      {v.toLocaleString("en-US")}
                      {suffix}
                    </p>
                    <p className="mt-1 text-[10px] font-bold text-white/75 md:text-xs">{label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 -bottom-1 h-6 rounded-t-[2.5rem] bg-background" />
      </section>

      {/* ================= membership card ================= */}
      {careSub && activePlan && (
        <section id="care-card" className="mx-auto max-w-3xl scroll-mt-24 px-4 pt-8 md:px-6">
          <Reveal>
            <CareMembershipCard
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  {careSub.status === "paused" ? (
                    <Button
                      size="sm"
                      className="h-9 rounded-full bg-[#059669] px-5 font-black text-white hover:bg-[#047857]"
                      onClick={() => {
                        resumeCare();
                        toast.success(t("care.resume"));
                      }}
                    >
                      <IconRefill className="size-4" />
                      {t("care.resume")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-full border-white/30 bg-white/10 px-5 font-black text-white hover:bg-white/20 hover:text-white"
                      onClick={() => {
                        pauseCare();
                        toast.success(t("care.pause"));
                      }}
                    >
                      {t("care.pause")}
                    </Button>
                  )}
                  {/* change preferred day inline */}
                  <DayPicker value={careSub.dayPref} onChange={(d) => {
                    changeCareDay(d);
                    toast.success(t("care.changeDay"));
                  }} dark />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-full border-[#FF9C9C]/40 bg-transparent px-5 font-black text-[#FFB4B4] hover:bg-[#DC4B4B]/25 hover:text-white"
                    onClick={() => {
                      cancelCare();
                      toast.success(t("care.cancel"));
                    }}
                  >
                    {t("care.cancel")}
                  </Button>
                </div>
              }
            />
          </Reveal>
        </section>
      )}

      {/* ================= صناديق العلاج الشهري — هدف حقيقي ومخزون مباشر ================= */}
      <section id="care-plans" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-12 md:px-6 md:pt-16">
        <Reveal>
          <SectionHeadMini
            icon={<IconBoxes className="size-6 text-white" />}
            title={t("care.title")}
            sub={t("care.sub")}
            tone="#F59E0B"
          />
        </Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            const mine = careSub?.planId === plan.id;
            const meds = plan.medIds
              .map((id) => getProduct(id))
              .filter(Boolean) as NonNullable<ReturnType<typeof getProduct>>[];
            const stocks = plan.medIds.map((id) => effStock(id, stockAdj));
            const outCount = stocks.filter((s) => s === 0).length;
            const lowCount = stocks.filter((s) => s > 0 && s <= 5).length;
            const stockChip = outCount > 0
              ? { key: t("stock.boxOut"), cls: "bg-amber-50 text-amber-800 ring-amber-500/40", dot: "bg-[#F59E0B]" }
              : lowCount > 0
                ? { key: t("stock.boxLow"), cls: "bg-red-50 text-red-700 ring-red-500/30", dot: "bg-red-600" }
                : { key: t("stock.boxFull"), cls: "bg-emerald-50 text-emerald-800 ring-emerald-500/30", dot: "bg-[#059669]" };
            return (
              <Reveal key={plan.id} delay={(i % 3) * 90}>
                <div
                  className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card p-6 shadow-sm bb-card-hover ${
                    plan.popular ? "border-[#F59E0B] shadow-lg ring-2 ring-[#F59E0B]/25" : "border-border/70"
                  } ${mine ? "outline-2 outline-offset-2 outline-[#059669]" : ""}`}
                >
                  {plan.popular && !mine && (
                    <span className="absolute top-0 end-6 rounded-b-xl bg-gradient-to-r from-[#EA580C] to-[#F59E0B] px-3 py-1 text-[11px] font-black text-white shadow-md">
                      <IconSparkles className="mb-0.5 me-1 inline size-3.5" />
                      {t("misc.new")}
                    </span>
                  )}
                  {mine && (
                    <span className="absolute top-0 end-6 flex items-center gap-1 rounded-b-xl bg-gradient-to-r from-[#059669] to-[#10B981] px-3 py-1 text-[11px] font-black text-white shadow-md">
                      <IconCheck className="mb-0.5 inline size-3.5" />
                      {t("care.active")}
                    </span>
                  )}
                  <span
                    className="absolute -end-12 -top-12 size-32 rounded-full opacity-10 transition duration-500 group-hover:scale-150"
                    style={{ backgroundColor: plan.color }}
                  />
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-14 shrink-0 place-items-center rounded-2xl text-white shadow-md transition duration-300 group-hover:scale-110 group-hover:rotate-3"
                      style={{ backgroundColor: plan.color }}
                    >
                      <Icon className="size-7" />
                    </span>
                    <div>
                      <h3 className="font-heading text-lg font-black md:text-xl">
                        {lang === "ar" ? plan.nameAr : plan.nameEn}
                      </h3>
                      <p className="mt-0.5 text-[11px] font-bold text-muted-foreground md:text-xs">
                        {lang === "ar" ? plan.tagAr : plan.tagEn}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 min-h-10 text-sm leading-relaxed text-muted-foreground">
                    {lang === "ar" ? plan.descAr : plan.descEn}
                  </p>

                  {/* اللي جوه الصندوق — صور حقيقية من المخزن */}
                  <div className="mt-4">
                    <p className="mb-2 text-[11px] font-bold text-muted-foreground">{t("care.includes")}:</p>
                    <div className="mb-3 flex items-center gap-2">
                      {meds.map((m, k) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => openProduct(m.id)}
                          title={lang === "ar" ? m.nameAr : m.nameEn}
                          className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                          style={{ zIndex: meds.length - k }}
                        >
                          {m.img ? (
                            <Image src={m.img} alt={m.nameEn} fill sizes="56px" className="object-contain p-1" />
                          ) : (
                            <span className="grid size-full place-items-center bg-[#EAF2FA]">
                              <m.icon className="size-6 text-[#184C8A]" strokeWidth={1.6} />
                            </span>
                          )}
                        </button>
                      ))}
                      <span className="ms-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-black text-foreground/70">
                        {meds.length} {lang === "ar" ? "أصناف" : "items"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {meds.map((m) => (
                        <span
                          key={m.id}
                          className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground/75"
                        >
                          <IconCheck className="size-3 text-[#059669]" />
                          {lang === "ar" ? m.nameAr : m.nameEn}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* حالة المخزون — مباشرة من المخزن */}
                  <div className={`mt-4 flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${stockChip.cls}`}>
                    <span className={`relative flex size-2`}>
                      <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${stockChip.dot}`} />
                      <span className={`relative inline-flex size-2 rounded-full ${stockChip.dot}`} />
                    </span>
                    {stockChip.key}
                  </div>

                  <div className="mt-auto pt-5">
                    <div className="flex items-end justify-between border-t border-border/60 pt-4">
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-heading text-3xl font-black" style={{ color: plan.color }}>
                            {plan.price.toLocaleString("en-US")}
                          </span>
                          <span className="text-xs font-bold text-muted-foreground">{t("care.perMonth")}</span>
                        </div>
                        <span className="text-xs text-muted-foreground line-through">
                          {plan.oldPrice.toLocaleString("en-US")} {t("misc.currency")}
                        </span>
                      </div>
                      <span className="rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[10px] font-black text-[#059669]">
                        {fmtPrice(plan.oldPrice - plan.price, t)} {t("cart.savings")}
                      </span>
                    </div>
                    <Button
                      className="mt-4 h-12 w-full rounded-full text-base font-black text-white shadow-md transition hover:brightness-110 active:scale-[0.98]"
                      style={{ backgroundColor: plan.color }}
                      onClick={() => openWizard(plan.id)}
                    >
                      <IconBoxes className="size-5" />
                      {mine ? t("care.manage") : t("care.subscribe")}
                    </Button>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
        <Reveal>
          <p className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-amber-50/80 border border-amber-200/60 px-4 py-3.5 text-center text-xs font-bold text-amber-900 md:text-sm">
            <IconRefill className="size-4.5 shrink-0" />
            {t("care.monthlyNote")} · {t("stock.live")}
          </p>
        </Reveal>
      </section>

      {/* ================= smart plan builder ================= */}
      <BuilderSection onSubscribe={openWizard} />

      {/* ================= how it works ================= */}
      <section className="mx-auto max-w-7xl px-4 pt-14 md:px-6 md:pt-18">
        <Reveal>
          <div className="text-center">
            <h2 className="font-heading text-2xl font-black md:text-3xl">{t("care.how")}</h2>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">{t("care.howSub")}</p>
          </div>
        </Reveal>
        <div className="relative mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="absolute inset-x-16 top-9 hidden border-t-2 border-dashed border-[#059669]/30 lg:block" />
          {STEPS.map((s, i) => (
            <Reveal key={s.t} delay={i * 100}>
              <div className="relative flex h-full flex-col items-center rounded-3xl border border-border/70 bg-card p-6 text-center shadow-sm bb-card-hover">
                <span
                  className="relative z-10 grid size-18 place-items-center rounded-full text-white shadow-lg ring-8 ring-background"
                  style={{ backgroundColor: s.color }}
                >
                  <s.icon className="size-8" />
                  <span className="absolute -top-1 -end-1 grid size-7 place-items-center rounded-full bg-white font-heading text-sm font-black text-[#0B1E38] shadow ring-2 ring-background">
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-4 font-heading text-base font-black">{t(s.t)}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground md:text-[13px]">{t(s.d)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= shipment journey ================= */}
      <section className="mx-auto max-w-7xl px-4 pt-14 md:px-6 md:pt-18">
        <Reveal>
          <div className="text-center">
            <h2 className="font-heading text-2xl font-black md:text-3xl">{t("care.journey.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">{t("care.journey.sub")}</p>
          </div>
        </Reveal>
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {JOURNEY.map((s, i) => (
            <Reveal key={s.t} delay={i * 100}>
              <div className="relative h-full rounded-3xl border border-border/70 bg-gradient-to-b from-card to-muted/40 p-6 shadow-sm bb-card-hover">
                <div className="flex items-center justify-between">
                  <span
                    className="grid size-12 place-items-center rounded-2xl text-white shadow-md"
                    style={{ backgroundColor: s.color }}
                  >
                    <s.icon className="size-6" />
                  </span>
                  <span className="font-heading text-4xl font-black text-muted-foreground/15">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-3.5 font-heading text-base font-black">{t(s.t)}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground md:text-[13px]">{t(s.d)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= personal pharmacist ================= */}
      <section className="mx-auto max-w-4xl px-4 pt-14 md:px-6 md:pt-18">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-[#184C8A]/15 bg-gradient-to-l from-[#EAF2FA] via-card to-card p-6 bb-card-shadow md:p-8">
            <span className="absolute -end-14 -top-14 size-44 rounded-full bg-[#184C8A]/10" />
            <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center">
              <span className="bb-ring grid size-20 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-[#184C8A] to-[#0B1E38] text-white shadow-xl">
                <IconPharmacist className="size-10" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-wide text-[#184C8A]">
                  {t("care.pharm.title")}
                </p>
                <h3 className="mt-1 font-heading text-xl font-black md:text-2xl">{t("care.pharm.name")}</h3>
                <p className="mt-0.5 text-xs font-bold text-[#059669]">{t("care.pharm.role")}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("care.pharm.d")}</p>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-2 md:w-auto">
                <a
                  href={`tel:${site.phone1Href}`}
                  className="flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#184C8A] to-[#0B1E38] px-6 text-sm font-black text-white shadow-md transition hover:brightness-110"
                >
                  <IconPhone className="size-4.5" />
                  {t("care.pharm.call")}
                </a>
                <a
                  href={`https://wa.me/${WASLY.whatsapp}?text=${encodeURIComponent(
                    lang === "ar"
                      ? "أهلًا صيدلية بحبح — أنا مشترك رعاية بحبح وعايز أستفسر عن خطتي"
                      : "Hello Bahbah Pharmacy — I'm a Bahbah Care member with a question about my plan"
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bb-whatsapp-gradient flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-black text-white shadow-md transition hover:brightness-105"
                >
                  <IconWhatsapp className="size-4.5" />
                  {t("care.pharm.wa")}
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================= savings calculator ================= */}
      <CalcSection onSubscribe={openWizard} />

      {/* ================= FAQ ================= */}
      <section className="mx-auto max-w-4xl px-4 pt-14 md:px-6 md:pt-18">
        <Reveal>
          <div className="text-center">
            <h2 className="font-heading text-2xl font-black md:text-3xl">{t("care.faq")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("care.faqSub")}</p>
          </div>
        </Reveal>
        <Reveal>
          <Accordion type="single" collapsible className="mt-7 space-y-3">
            {FAQS.map((n) => (
              <AccordionItem
                key={n}
                value={`faq-${n}`}
                className="rounded-2xl border border-border/70 bg-card px-5 shadow-sm last:border-b"
              >
                <AccordionTrigger className="py-4 text-start text-sm font-black hover:no-underline md:text-base">
                  {t(`care.faq${n}q` as "care.faq1q")}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {t(`care.faq${n}a` as "care.faq1a")}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </section>

      {/* ================= contact CTA ================= */}
      <section className="mx-auto max-w-7xl px-4 pt-14 md:px-6 md:pt-18">
        <Reveal>
          <div className="bb-hero-band relative overflow-hidden rounded-3xl px-6 py-10 text-white md:px-12">
            <div className="bb-glow pointer-events-none absolute -top-20 end-[10%] size-56 rounded-full bg-[#059669]/30 blur-3xl" />
            <div className="relative flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="text-center md:text-start">
                <h3 className="font-heading text-2xl font-black md:text-3xl">{t("consult.title")}</h3>
                <p className="mt-2 max-w-md text-sm text-white/75 md:text-base">{t("consult.desc")}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  size="lg"
                  className="h-12 rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] px-7 font-black text-white shadow-lg shadow-[#EA580C]/25 transition hover:brightness-105 active:scale-95"
                  onClick={() => setConsultOpen(true)}
                >
                  <IconPharmacist className="size-5" />
                  {t("fab.consult")}
                </Button>
                <a
                  href={`tel:${site.phone1Href}`}
                  className="flex h-12 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 text-sm font-black text-white backdrop-blur transition hover:bg-white/20"
                >
                  <IconPhone className="size-5" />
                  <span dir="ltr">{site.phone1}</span>
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================= subscribe wizard (bottom sheet) ================= */}
      <Sheet
        open={wizOpen}
        onOpenChange={(o) => {
          setWizOpenLocal(o);
          if (!o) closeCareWizard();
        }}
      >
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-0 nice-scrollbar"
        >
          <div className="mx-auto mt-1.5 h-1.5 w-14 rounded-full bg-muted" />
          <SheetHeader className="px-5 pb-2 pt-3 text-start md:px-6">
            <SheetTitle className="font-heading text-xl font-black md:text-2xl">
              {t("care.wiz.title")}
            </SheetTitle>
            <SheetDescription className="text-xs md:text-sm">{t("care.wiz.addonsD")}</SheetDescription>
          </SheetHeader>

          <div className="px-5 pb-6 md:px-6">
            {/* step dots */}
            <div className="mb-4 flex items-center gap-1.5">
              {[1, 2].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 flex-1 rounded-full transition ${wizStep >= n ? "bg-[#059669]" : "bg-muted"}`}
                />
              ))}
            </div>

            {/* chosen plan chip */}
            {wizPlanObj && (
              <div
                className="flex items-center justify-between gap-3 rounded-2xl p-4 text-white shadow-md"
                style={{ background: `linear-gradient(120deg, #112D51, ${wizPlanObj.color})` }}
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-white/20">
                    <wizPlanObj.icon className="size-5.5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold text-white/70">{t("care.wiz.plan")}</p>
                    <p className="font-heading text-sm font-black md:text-base">
                      {lang === "ar" ? wizPlanObj.nameAr : wizPlanObj.nameEn}
                    </p>
                  </div>
                </div>
                <p className="font-heading text-lg font-black md:text-xl">
                  {wizTotal.toLocaleString("en-US")}
                  <span className="ms-1 text-[10px] font-bold text-white/70">{t("care.perMonth")}</span>
                </p>
              </div>
            )}

            {wizStep === 1 && (
              <div className="mt-4 space-y-2.5">
                <p className="text-xs font-black text-foreground/75">{t("care.wiz.addons")}</p>
                {careAddons.map((a) => {
                  const on = wizAddons.includes(a.id);
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() =>
                        setWizAddons((cur) =>
                          on ? cur.filter((x) => x !== a.id) : [...cur, a.id]
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-start transition active:scale-[0.99] ${
                        on ? "border-[#059669] bg-[#ECFDF5]/80" : "border-border bg-card hover:border-[#059669]/40"
                      }`}
                    >
                      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${on ? "bg-[#059669] text-white" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-heading text-sm font-black">
                          {lang === "ar" ? a.nameAr : a.nameEn}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {lang === "ar" ? a.descAr : a.descEn}
                        </span>
                      </span>
                      <span className="shrink-0 font-heading text-sm font-black text-[#059669]">
                        +{a.price}
                      </span>
                      <span className={`grid size-5.5 shrink-0 place-items-center rounded-full border-2 ${on ? "border-[#059669] bg-[#059669] text-white" : "border-border"}`}>
                        {on && <IconCheck className="size-3.5" />}
                      </span>
                    </button>
                  );
                })}

                <div className="flex items-center justify-between rounded-2xl bg-[#ECFDF5] px-4 py-3">
                  <span className="text-sm font-black text-[#059669]">{t("care.wiz.total")}</span>
                  <span className="font-heading text-xl font-black text-[#059669]">
                    {fmtPrice(wizTotal, t)}
                    <span className="ms-1 text-[10px]">{t("care.perMonth")}</span>
                  </span>
                </div>

                <Button
                  className="h-12 w-full rounded-full text-base font-black"
                  onClick={() => setWizStep(2)}
                >
                  {t("care.wiz.next")}
                  <IconChevronR className="size-4 rtl:rotate-180" />
                </Button>
              </div>
            )}

            {wizStep === 2 && (
              <div className="mt-4 space-y-3">
                <p className="text-xs font-black text-foreground/75">{t("care.wiz.details")}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-bold text-foreground/75">{t("checkout.name")}</span>
                    <Input value={wizName} onChange={(e) => setWizName(e.target.value)} className="h-12 rounded-xl" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-bold text-foreground/75">{t("checkout.phone")}</span>
                    <Input value={wizPhone} onChange={(e) => setWizPhone(e.target.value)} inputMode="tel" className="h-12 rounded-xl" />
                  </label>
                </div>
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-foreground/75">{t("dv.pick")}</span>
                  <Select value={wizZone} onValueChange={setWizZone}>
                    <SelectTrigger className="h-12 rounded-xl font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((z) => (
                        <SelectItem key={z.id} value={z.id}>
                          {lang === "ar" ? z.nameAr : z.nameEn} · {z.fee} {t("misc.currency")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-foreground/75">{t("checkout.address")}</span>
                  <Textarea value={wizAddr} onChange={(e) => setWizAddr(e.target.value)} rows={2} className="rounded-xl" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-foreground/75">{t("care.wiz.day")}</span>
                  <Select
                    value={String(wizDay)}
                    onValueChange={(v) => setWizDay(Number(v))}
                  >
                    <SelectTrigger className="h-12 rounded-xl font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="block text-[11px] text-muted-foreground">{t("care.dayHint")}</span>
                </label>

                <div className="rounded-2xl border border-[#059669]/30 bg-[#ECFDF5]/80 p-4">
                  <p className="flex items-center gap-2 text-xs font-black text-[#059669]">
                    <IconScooter className="size-4" />
                    {t("care.wiz.firstShip")}: <span dir="ltr" className="font-heading">{firstShip}</span>
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-muted-foreground">
                    {t("care.wiz.total")}: {fmtPrice(wizTotal, t)}{t("care.perMonth")}
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="h-12 flex-1 rounded-full font-bold" onClick={() => setWizStep(1)}>
                    {t("care.wiz.back")}
                  </Button>
                  <Button
                    className="h-12 flex-[2] rounded-full bg-gradient-to-r from-[#059669] to-[#10B981] text-base font-black text-white shadow-md hover:brightness-105"
                    onClick={confirmSubscribe}
                  >
                    <IconCheck className="size-5" />
                    {t("care.wiz.confirm")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* smart plan builder — condition chips + addon toggles + live totals  */
/* ------------------------------------------------------------------ */
function BuilderSection({ onSubscribe }: { onSubscribe: (planId: string) => void }) {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const plans = useCarePlans();
  const [planId, setPlanId] = useState("box-mass");
  const [picked, setPicked] = useState<string[]>([]);

  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  const monthly = careMonthlyLite(plan.id, picked);
  const monthlySave = Math.max(0, plan.oldPrice - plan.price);
  const addonSave = picked.reduce((s, id) => s + Math.round((addonById(id)?.price ?? 0) * 0.1), 0);
  const yearly = (monthlySave + addonSave) * 12;
  const Icon = plan.icon;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-14 md:px-6 md:pt-18">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1E38] via-[#112D51] to-[#184C8A] p-6 text-white shadow-xl md:p-9">
          <div className="bb-glow pointer-events-none absolute -top-24 end-[6%] size-64 rounded-full bg-[#059669]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 start-[4%] size-56 rounded-full bg-[#F59E0B]/20 blur-3xl" />

          <div className="relative">
            <div className="text-center">
              <Badge className="mb-3 gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold text-white hover:bg-white/10">
                <IconSparkles className="size-3.5 text-[#F7D774]" />
                {t("care.builder.title")}
              </Badge>
              <h2 className="font-heading text-2xl font-black md:text-3xl">{t("care.builder.title")}</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-white/75 md:text-base">{t("care.builder.sub")}</p>
            </div>

            <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_320px]">
              {/* left: config */}
              <div className="space-y-5">
                <div>
                  <p className="mb-2.5 text-xs font-black text-[#F7D774]">{t("care.builder.base")}</p>
                  <div className="flex flex-wrap gap-2">
                    {plans.map((p) => {
                      const on = p.id === planId;
                      const PI = p.icon;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPlanId(p.id)}
                          className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-black transition md:text-sm ${
                            on
                              ? "border-transparent text-[#112D51] shadow-lg"
                              : "border-white/25 bg-white/5 text-white/85 hover:bg-white/15"
                          }`}
                          style={on ? { backgroundColor: "#F7D774" } : undefined}
                        >
                          <PI className={`size-4.5 ${on ? "text-[#8a6d00]" : "text-white/70"}`} />
                          {lang === "ar" ? p.nameAr : p.nameEn}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2.5 text-xs font-black text-[#F7D774]">{t("care.builder.addons")}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {careAddons.map((a) => {
                      const on = picked.includes(a.id);
                      const AI = a.icon;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() =>
                            setPicked((cur) => (on ? cur.filter((x) => x !== a.id) : [...cur, a.id]))
                          }
                          className={`flex items-center gap-3 rounded-2xl border p-3 text-start transition active:scale-[0.98] ${
                            on ? "border-[#10B981] bg-white/15" : "border-white/15 bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <span
                            className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                              on ? "bg-[#059669] text-white" : "bg-white/10 text-white/70"
                            }`}
                          >
                            {on ? <IconCheck className="size-4.5" /> : <AI className="size-4.5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-black md:text-sm">
                              {lang === "ar" ? a.nameAr : a.nameEn}
                            </span>
                            <span className="block truncate text-[10px] text-white/60">
                              {lang === "ar" ? a.descAr : a.descEn}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-black text-[#F7D774]">+{a.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* right: live summary */}
              <div className="h-fit rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur lg:sticky lg:top-24">
                <div className="flex items-center gap-3 border-b border-white/15 pb-4">
                  <span className="grid size-11 place-items-center rounded-2xl bg-[#F7D774] text-[#112D51]">
                    <Icon className="size-5.5" />
                  </span>
                  <p className="font-heading text-sm font-black leading-snug">
                    {lang === "ar" ? plan.nameAr : plan.nameEn}
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-[11px] font-bold text-white/65">{t("care.builder.monthly")}</p>
                    <p dir="ltr" className="font-heading text-3xl font-black text-[#10B981]">
                      {monthly.toLocaleString("en-US")}
                      <span className="ms-1 text-xs font-bold text-white/70">{t("misc.currency")}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white/65">{t("care.builder.yearly")}</p>
                    <p dir="ltr" className="font-heading text-2xl font-black text-[#F7D774]">
                      ≈ {yearly.toLocaleString("en-US")}
                      <span className="ms-1 text-xs font-bold text-white/70">{t("misc.currency")}</span>
                    </p>
                  </div>
                  <Button
                    className="h-12 w-full rounded-full bg-gradient-to-r from-[#059669] to-[#10B981] text-base font-black text-white shadow-lg hover:brightness-105 active:scale-[0.98]"
                    onClick={() => onSubscribe(plan.id)}
                  >
                    <IconRefill className="size-5" />
                    {t("care.builder.cta")}
                  </Button>
                  <p className="flex items-center justify-center gap-1.5 text-center text-[10px] font-bold text-white/60">
                    <IconShieldCheck className="size-3.5" />
                    {t("care.monthlyNote")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* savings calculator — 15% plan discount + delivery-fee savings       */
/* ------------------------------------------------------------------ */
function CalcSection({ onSubscribe }: { onSubscribe: (planId: string) => void }) {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const [meds, setMeds] = useState(350);

  const monthly = Math.round(meds * 0.15 + 15); // 15% plan saving + avg delivery fee
  const yearly = monthly * 12;

  return (
    <section className="mx-auto max-w-4xl px-4 pt-14 md:px-6 md:pt-18">
      <Reveal>
        <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-md md:p-8">
          <div className="text-center">
            <h2 className="font-heading text-2xl font-black md:text-3xl">{t("care.calc.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("care.calc.sub")}</p>
          </div>

          <div className="mt-7">
            <div className="flex items-end justify-between">
              <label className="text-xs font-bold text-foreground/75 md:text-sm">{t("care.calc.label")}</label>
              <p dir="ltr" className="font-heading text-lg font-black text-[#184C8A] md:text-xl">
                {meds.toLocaleString("en-US")} <span className="text-xs font-bold text-muted-foreground">{t("misc.currency")}</span>
              </p>
            </div>
            <Slider
              value={[meds]}
              onValueChange={(v) => setMeds(v[0])}
              min={100}
              max={1500}
              step={25}
              className="mt-3"
            />
            <div className="mt-1 flex justify-between text-[10px] font-bold text-muted-foreground" dir="ltr">
              <span>100</span>
              <span>1500</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#ECFDF5] p-4 text-center">
              <p className="text-[11px] font-black text-[#059669]">{t("care.calc.monthly")}</p>
              <p dir="ltr" className="mt-1 font-heading text-2xl font-black text-[#059669]">
                +{monthly.toLocaleString("en-US")}
                <span className="ms-1 text-xs">{t("misc.currency")}</span>
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] p-4 text-center">
              <p className="text-[11px] font-black text-[#D97706]">{t("care.calc.yearly")}</p>
              <p dir="ltr" className="mt-1 font-heading text-2xl font-black text-[#D97706]">
                +{yearly.toLocaleString("en-US")}
                <span className="ms-1 text-xs">{t("misc.currency")}</span>
              </p>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] font-bold text-muted-foreground">
            {t("care.calc.ship")} · {lang === "ar" ? "تقديري وقابل للزيادة مع الإضافات" : "estimate — grows with add-ons"}
          </p>

          <Button
            className="bb-ring mx-auto mt-5 h-12 rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] px-9 text-base font-black text-white shadow-lg shadow-[#EA580C]/25 hover:brightness-105 active:scale-95"
            onClick={() => onSubscribe("box-mass")}
          >
            <IconPlus className="size-5" />
            {t("care.cta")}
          </Button>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* helpers — keep light lookups out of the render loop                 */
/* ------------------------------------------------------------------ */

/* monthly price of a plan + addons (base catalog prices, builder view) */
function careMonthlyLite(planId: string, addons: string[]) {
  const plan = carePlans.find((p) => p.id === planId);
  const base = plan?.price ?? 0;
  return base + addons.reduce((s, id) => s + (addonById(id)?.price ?? 0), 0);
}

/* section header with colored icon pill */
function SectionHeadMini({
  icon,
  title,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  tone: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span
        className="grid size-13 place-items-center rounded-2xl text-white shadow-lg"
        style={{ backgroundColor: tone }}
      >
        {icon}
      </span>
      <div>
        <h2 className="font-heading text-2xl font-black md:text-3xl">{title}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground md:text-base">{sub}</p>
      </div>
    </div>
  );
}
