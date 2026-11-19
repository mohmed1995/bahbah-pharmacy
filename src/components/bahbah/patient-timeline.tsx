"use client";

import { useMemo, type ReactNode } from "react";
import { useBahbah, useT } from "@/lib/bahbah/store";
import { planById } from "@/lib/bahbah/data";
import { fmtPrice } from "./product-card";
import { getSugarStatus, getBPStatus, timingArabic } from "./vitals";
import { IconHeartPulse, IconCartBag, IconRxSheet, IconRefill } from "./icons";
import { RxPhotoLink } from "./rx-photo";

/* ------------------------------------------------------------------ */
/* الخط الزمني الموحد للمريض — قياسات + طلبات + روشتات + رعاية شهرية  */
/* كل نشاط المريض متجمع في مكان واحد ومرتب زمنياً (الأحدث أولاً)،     */
/* ومفتاح الربط بين كل المصادر هو رقم الهاتف.                         */
/* ------------------------------------------------------------------ */

/** مقارنة أرقام الهواتف بصرف النظر عن الصيغة (010… / ‎+20… / مسافات) */
export function phonesMatch(a?: string | null, b?: string | null): boolean {
  const da = (a || "").replace(/\D/g, "");
  const db = (b || "").replace(/\D/g, "");
  if (!da || !db) return false;
  if (da === db) return true;
  const ta = da.slice(-10);
  const tb = db.slice(-10);
  return ta.length === 10 && ta === tb;
}

type EntryKind = "measurement" | "order" | "rx" | "care";

interface TimelineEntry {
  key: string;
  kind: EntryKind;
  at: number;
  when: string;
  title: string;
  detail: ReactNode;
}

const KIND_STYLE: Record<EntryKind, { tint: string; Icon: typeof IconHeartPulse }> = {
  measurement: { tint: "bg-emerald-50 text-emerald-600 border-emerald-200", Icon: IconHeartPulse },
  order: { tint: "bg-[#EAF2FA] text-[#184C8A] border-[#C9DDF3]", Icon: IconCartBag },
  rx: { tint: "bg-[#FFF4E5] text-[#B45E0A] border-[#F5D9AE]", Icon: IconRxSheet },
  care: { tint: "bg-violet-50 text-violet-600 border-violet-200", Icon: IconRefill },
};

const ORDER_STATUS_CLS: Record<string, string> = {
  pending: "bg-[#FFF4E5] text-[#B45E0A] border-[#F5D9AE]",
  shipping: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

const RX_STATUS_CLS: Record<string, string> = {
  new: "bg-[#FFF4E5] text-[#B45E0A] border-[#F5D9AE]",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

function Badge({ cls, children }: { cls: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black ${cls}`}>
      {children}
    </span>
  );
}

export default function PatientTimeline({
  phone,
  compact = false,
}: {
  phone: string;
  compact?: boolean;
}) {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const measurements = useBahbah((s) => s.measurements);
  const myOrders = useBahbah((s) => s.myOrders);
  const adminOrders = useBahbah((s) => s.adminOrders);
  const rxQueue = useBahbah((s) => s.rxQueue);
  const careSubs = useBahbah((s) => s.careSubs);

  const entries = useMemo<TimelineEntry[]>(() => {
    const fmtWhen = (raw: string): { at: number; label: string } => {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return { at: 0, label: raw };
      const dateOnly = raw.trim().length <= 10;
      const label = dateOnly
        ? d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : d.toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
      return { at: d.getTime(), label };
    };

    const out: TimelineEntry[] = [];

    /* ---- القياسات الصحية ---- */
    measurements
      .filter((m) => phonesMatch(m.patientPhone, phone))
      .forEach((m) => {
        const sugarSt = getSugarStatus(m.bloodSugar, m.sugarTiming);
        const bpSt = getBPStatus(m.systolic, m.diastolic);
        const parts: ReactNode[] = [];
        if (m.bloodSugar != null) {
          parts.push(
            <span key="sugar" className="inline-flex flex-wrap items-center gap-1.5">
              <span className="font-black text-foreground">
                {t("timeline.sugar")}: {m.bloodSugar} mg/dL
              </span>
              <span className="text-muted-foreground">({timingArabic(m.sugarTiming)})</span>
              {sugarSt && <Badge cls={sugarSt.color}>{sugarSt.label}</Badge>}
            </span>
          );
        }
        if (m.systolic && m.diastolic) {
          parts.push(
            <span key="bp" className="inline-flex flex-wrap items-center gap-1.5">
              <span className="font-black text-foreground">
                {t("timeline.bp")}: {m.systolic}/{m.diastolic} mmHg
              </span>
              {m.pulse ? <span className="text-muted-foreground">· {m.pulse} bpm</span> : null}
              {bpSt && <Badge cls={bpSt.color}>{bpSt.label}</Badge>}
            </span>
          );
        }
        if (m.weight != null) {
          parts.push(
            <span key="weight" className="font-black text-foreground">
              {t("timeline.weight")}: {m.weight} {lang === "ar" ? "كجم" : "kg"}
              {m.bmi != null ? <span className="text-muted-foreground"> · BMI {m.bmi}</span> : null}
            </span>
          );
        }
        const w = fmtWhen(m.recordedAt);
        out.push({
          key: `meas-${m.id}`,
          kind: "measurement",
          at: w.at,
          when: w.label,
          title: t("timeline.measurement"),
          detail: (
            <div className="space-y-1">
              {parts.length > 0 ? (
                parts.map((p, i) => <div key={i}>{p}</div>)
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
              {m.pharmacistNotes && (
                <p className="text-[11px] font-semibold leading-relaxed text-amber-800">
                  {m.pharmacistNotes}
                </p>
              )}
            </div>
          ),
        });
      });

    /* ---- الطلبات: طلباتي + طلبات اللوحة، مدموجة ومن غير تكرار ---- */
    const orderById = new Map<string, (typeof myOrders)[number]>();
    [...myOrders, ...(adminOrders ?? [])].forEach((o) => {
      if (!orderById.has(o.id)) orderById.set(o.id, o);
    });
    [...orderById.values()]
      .filter((o) => phonesMatch(o.phone, phone))
      .forEach((o) => {
        const w = fmtWhen(o.date);
        const statusKey =
          o.status === "pending"
            ? "admin.stPending"
            : o.status === "ready"
              ? "admin.stReady"
              : o.status === "shipping"
                ? "admin.stShipping"
                : o.status === "delivered"
                  ? "admin.stDelivered"
                  : "admin.stCancelled";
        out.push({
          key: `order-${o.id}`,
          kind: "order",
          at: w.at,
          when: w.label,
          title: `${t("timeline.order")} ${o.id}`,
          detail: (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="font-black text-foreground">
                {t("timeline.total")}: {fmtPrice(o.total, t)}
              </span>
              <span className="text-muted-foreground">
                · {o.items.reduce((n, i) => n + i.qty, 0)} {t("timeline.items")}
              </span>
              <Badge cls={ORDER_STATUS_CLS[o.status] || ORDER_STATUS_CLS.pending}>
                {t(statusKey)}
              </Badge>
            </div>
          ),
        });
      });

    /* ---- الروشتات ---- */
    rxQueue
      .filter((r) => phonesMatch(r.phone, phone))
      .forEach((r) => {
        const w = fmtWhen(r.date);
        out.push({
          key: `rx-${r.id}`,
          kind: "rx",
          at: w.at,
          when: w.label,
          title: `${t("timeline.rx")} ${r.id}`,
          detail: (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {r.fileName ? (
                <RxPhotoLink
                  value={r.fileName}
                  className="font-bold text-[#1E4E8F] underline hover:text-[#163a6b]"
                  fallbackText={
                    <span className="max-w-[220px] truncate font-semibold text-foreground">
                      {r.fileName}
                    </span>
                  }
                >
                  {lang === "ar" ? "عرض الروشتة ↗" : "View prescription ↗"}
                </RxPhotoLink>
              ) : null}
              <Badge cls={RX_STATUS_CLS[r.status] || RX_STATUS_CLS.new}>
                {t(r.status === "new" ? "adm.rx.new" : r.status === "approved" ? "adm.rx.approved" : "adm.rx.rejected")}
              </Badge>
              {(lang === "ar" ? r.noteAr : r.noteEn) && (
                <span className="w-full text-[11px] font-semibold text-muted-foreground">
                  {lang === "ar" ? r.noteAr : r.noteEn}
                </span>
              )}
            </div>
          ),
        });
      });

    /* ---- اشتراكات الرعاية الشهرية ---- */
    careSubs
      .filter((c) => phonesMatch(c.phone, phone))
      .forEach((c) => {
        const plan = planById(c.planId);
        const w = fmtWhen(c.since);
        const next = c.nextDelivery ? fmtWhen(c.nextDelivery) : null;
        out.push({
          key: `care-${c.id}`,
          kind: "care",
          at: w.at,
          when: w.label,
          title: t("timeline.care"),
          detail: (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="font-black text-foreground">
                {plan ? (lang === "ar" ? plan.nameAr : plan.nameEn) : c.planId || t("timeline.care")}
              </span>
              <Badge
                cls={
                  c.status === "active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }
              >
                {c.status === "active" ? t("care.active") : t("care.pausedTag")}
              </Badge>
              {next && (
                <span className="text-muted-foreground">
                  {t("timeline.nextDelivery")}: {next.label}
                </span>
              )}
            </div>
          ),
        });
      });

    return out.sort((a, b) => b.at - a.at);
  }, [phone, measurements, myOrders, adminOrders, rxQueue, careSubs, lang, t]);

  const visible = compact ? entries.slice(0, 10) : entries;

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 px-5 py-8 text-center">
        <span className="grid size-11 place-items-center rounded-2xl bg-[#EAF1F9] text-[#184C8A]">
          <IconHeartPulse className="size-5" />
        </span>
        <p className="mt-3 max-w-sm text-xs font-bold leading-relaxed text-muted-foreground">
          {t("timeline.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* الخط الزمني العمودي */}
      <div className="absolute bottom-3 top-3 start-[19px] w-px bg-border" aria-hidden="true" />
      <ul className={compact ? "space-y-3" : "space-y-4"}>
        {visible.map((e) => {
          const { tint, Icon } = KIND_STYLE[e.kind];
          return (
            <li key={e.key} className="relative flex items-start gap-3">
              <span
                className={`z-10 grid size-10 shrink-0 place-items-center rounded-full border ${tint}`}
              >
                <Icon className="size-5" />
              </span>
              <div
                className={`min-w-0 flex-1 rounded-2xl border border-border/70 bg-card shadow-xs ${
                  compact ? "p-3" : "p-3.5"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                  <p className={`font-heading font-black text-foreground ${compact ? "text-xs" : "text-sm"}`}>
                    {e.title}
                  </p>
                  <span className="text-[11px] font-bold text-muted-foreground">{e.when}</span>
                </div>
                <div className={`mt-1.5 ${compact ? "text-[11px]" : "text-xs"}`}>{e.detail}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
