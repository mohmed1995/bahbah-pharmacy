"use client";

import Image from "next/image";
import { useBahbah, useT, useCarePlans } from "@/lib/bahbah/store";
import { addonById, careTier, getProduct, monthsBetween } from "@/lib/bahbah/data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconCalendar,
  IconCheck,
  IconMedal,
  IconRefill,
  IconScooter,
  IconSparkles,
} from "./icons";

/* ------------------------------------------------------------------ */
/* بطاقة عضوية رعاية بحبح — premium membership card                    */
/* shared by the Care page and the account "My Care" tab               */
/* ------------------------------------------------------------------ */

const ISO = (d: Date) => d.toISOString().slice(0, 10);

export default function CareMembershipCard({ actions }: { actions?: React.ReactNode }) {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const careSub = useBahbah((s) => s.careSub);

  const plan = useBahbahPlan(careSub?.planId);
  if (!careSub || !plan) return null;

  const today = new Date().toISOString().slice(0, 10);
  const months = monthsBetween(careSub.since, today);
  const tier = careTier(months);
  const paused = careSub.status === "paused";

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(careSub.next).getTime() - new Date(ISO(new Date())).getTime()) / 86400000)
  );
  const cyclePct = Math.min(100, Math.max(4, Math.round((1 - daysLeft / 30) * 100)));

  const monthlySave = Math.max(0, plan.oldPrice - plan.price);
  const saved = monthlySave * months;
  const PlanIcon = plan.icon;

  const ring = 2 * Math.PI * 26;

  return (
    <div className="relative overflow-hidden rounded-3xl text-white shadow-2xl">
      {/* premium navy → plan-color gradient + gold hairline */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, #112D51 0%, #16406F 45%, ${plan.color} 130%)`,
        }}
      />
      <div className="bb-glow pointer-events-none absolute -end-16 -top-20 size-56 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -start-10 size-48 rounded-full bg-[#F59E0B]/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#F7D774] via-[#C9A227] to-[#F7D774] opacity-90" />
      {/* guilloche dots */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 1.4px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative p-5 md:p-7">
        {/* header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center overflow-hidden rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/20">
              <Image src="/images/bahbah-badge.png" alt="Bahbah" width={44} height={44} className="size-10 object-contain" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F7D774]">
                {t("care.card.title")}
              </p>
              <h3 className="mt-0.5 flex items-center gap-2 font-heading text-lg font-black md:text-2xl">
                {lang === "ar" ? plan.nameAr : plan.nameEn}
                <PlanIcon className="size-5 opacity-80 md:size-6" />
              </h3>
            </div>
          </div>
          <span
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black shadow-lg"
            style={{ backgroundColor: tier.color }}
          >
            <IconMedal className="size-3.5" />
            {t(`care.tier.${tier.id}` as "care.tier.gold")}
          </span>
        </div>

        {/* membership meta */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { l: t("care.card.id"), v: careSub.memberNo, dir: "ltr" as const },
            { l: t("care.card.since"), v: careSub.since, dir: "ltr" as const },
            { l: t("care.card.months"), v: String(months), dir: "rtl" as const },
          ].map((x) => (
            <div key={x.l} className="rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur-sm ring-1 ring-white/10">
              <p className="text-[10px] font-bold text-white/65">{x.l}</p>
              <p dir={x.dir} className="mt-0.5 truncate font-heading text-sm font-black md:text-base">
                {x.v}
              </p>
            </div>
          ))}
        </div>

        {/* cycle — next shipment + days ring */}
        <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur-sm ring-1 ring-white/10">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11px] font-black text-[#7FE0B4]">
              <IconScooter className="size-4" />
              {t("care.card.next")}
            </p>
            <p dir="ltr" className="mt-1 font-heading text-xl font-black md:text-2xl">
              {careSub.next}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="relative h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#059669] transition-all duration-700"
                style={{ width: `${paused ? 100 : cyclePct}%` }}
              >
                {!paused && cyclePct < 100 && <span className="bb-shimmer absolute inset-0 rounded-full" />}
              </div>
            </div>
            <p className="mt-1.5 text-[11px] font-bold text-white/70">
              {t("care.dayPref")}: {careSub.dayPref} · {paused ? t("care.pausedTag") : `${daysLeft} ${t("care.card.days")}`}
            </p>
          </div>
          {/* days-left ring */}
          <div className="relative size-16 shrink-0 md:size-20">
            <svg viewBox="0 0 60 60" className="size-full -rotate-90">
              <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="6" />
              <circle
                cx="30"
                cy="30"
                r="26"
                fill="none"
                stroke={paused ? "#F59E0B" : "#10B981"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={ring}
                strokeDashoffset={ring * (1 - (paused ? 1 : cyclePct / 100))}
                className="transition-all duration-700"
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center font-heading text-base font-black md:text-lg">
              {paused ? "⏸" : daysLeft}
            </span>
          </div>
        </div>

        {/* savings */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#C9A227]/20 px-4 py-3 ring-1 ring-[#F7D774]/30">
          <p className="flex items-center gap-2 text-xs font-black text-[#F7D774] md:text-sm">
            <IconSparkles className="size-4" />
            {t("care.card.saved")}
          </p>
          <p className="font-heading text-xl font-black text-white md:text-2xl">
            {saved.toLocaleString("en-US")} <span className="text-xs font-bold">{t("misc.currency")}</span>
          </p>
        </div>

        {/* paused note */}
        {paused && (
          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-[#F59E0B]/15 px-4 py-2.5 text-xs font-bold text-amber-200 ring-1 ring-[#F59E0B]/40">
            <IconRefill className="size-4 shrink-0" />
            {t("care.pausedNote")}
          </p>
        )}

        {/* what's inside */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {plan.medIds.map((id) => {
            return (
              <span
                key={id}
                className="flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-bold text-white/85 ring-1 ring-white/10"
              >
                <IconCheck className="size-3 text-[#7FE0B4]" />
                {lang === "ar" ? plan.medNames[id]?.ar ?? id : plan.medNames[id]?.en ?? id}
              </span>
            );
          })}
          {careSub.addons.map((id) => {
            const a = addonById(id);
            if (!a) return null;
            return (
              <span
                key={id}
                className="flex items-center gap-1 rounded-full bg-[#F7D774]/20 px-2.5 py-1 text-[11px] font-bold text-[#F7D774] ring-1 ring-[#F7D774]/30"
              >
                +
                {lang === "ar" ? a.nameAr : a.nameEn}
              </span>
            );
          })}
        </div>

        {actions && <div className="mt-4 border-t border-white/15 pt-4">{actions}</div>}
      </div>
    </div>
  );
}

/* small hook: live plan (dashboard price edits) + med names in one pass */
function useBahbahPlan(planId?: string) {
  const plans = useCarePlans();
  if (!planId) return undefined;
  const p = plans.find((x) => x.id === planId);
  if (!p) return undefined;
  const medNames: Record<string, { ar: string; en: string }> = {};
  p.medIds.forEach((id) => {
    const m = getProduct(id);
    if (m) medNames[id] = { ar: m.nameAr, en: m.nameEn };
  });
  return { ...p, medNames };
}

/* ------------------------------------------------------------------ */
/* day picker — select preferred monthly shipment day (1-28)           */
/* shared by the care page actions and the account tab                 */
/* ------------------------------------------------------------------ */
export function DayPicker({
  value,
  onChange,
  dark,
}: {
  value: number;
  onChange: (d: number) => void;
  dark?: boolean;
}) {
  const t = useT();
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger
        className={`h-9 w-auto gap-1.5 rounded-full px-4 text-xs font-black ${
          dark ? "border-white/30 bg-white/10 text-white" : ""
        }`}
      >
        <span className="flex items-center gap-1.5">
          <IconCalendar className="size-3.5" />
          {t("care.changeDay")}: {value}
        </span>
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
          <SelectItem key={d} value={String(d)}>
            {d}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
