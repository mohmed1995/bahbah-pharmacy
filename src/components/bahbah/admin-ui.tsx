"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/bahbah/data";
import type { DictKey } from "@/lib/bahbah/store";
import { IconArrowUp, IconArrowDown, IconArrowUpDown } from "./icons";

/* shared building blocks for the admin dashboard */

export const daysUntil = (iso: string) =>
  Math.floor((new Date(iso).getTime() - Date.now()) / 86400000);

export const PIE_COLORS = ["#1E4E8F", "#F09428", "#2E9E6B", "#112D51", "#7A93B5", "#C56A0A"];

export function expiryMeta(p: Product) {
  const d = daysUntil(p.expiry);
  if (d < 0) return { key: "expired", cls: "bg-[#DC4B4B]/10 text-[#DC4B4B]" } as const;
  if (d < 120) return { key: "expiring", cls: "bg-[#FFF4E5] text-[#B45E0A]" } as const;
  return { key: "ok", cls: "bg-[#EAF6F1] text-[#2E9E6B]" } as const;
}

/* demo customer base (consistent with orders) */
export const DEMO_CUSTOMERS = [
  { nameAr: "منى عبد الله", nameEn: "Mona Abdullah", phone: "0111 456 7890", orders: 14, spend: 3860, points: 386, joined: "2025-03-12" },
  { nameAr: "أحمد محمد", nameEn: "Ahmed Mohamed", phone: "0100 123 4567", orders: 9, spend: 2410, points: 241, joined: "2025-06-04" },
  { nameAr: "سارة فؤاد", nameEn: "Sara Fouad", phone: "0122 987 6543", orders: 7, spend: 1980, points: 198, joined: "2025-08-19" },
  { nameAr: "كريم عادل", nameEn: "Karim Adel", phone: "0114 222 3344", orders: 5, spend: 1490, points: 149, joined: "2025-11-27" },
  { nameAr: "نهى سامي", nameEn: "Noha Samy", phone: "0106 555 7788", orders: 4, spend: 970, points: 97, joined: "2026-01-08" },
  { nameAr: "عمر خالد", nameEn: "Omar Khaled", phone: "0128 333 4455", orders: 3, spend: 720, points: 72, joined: "2026-02-14" },
  { nameAr: "هدى مصطفى", nameEn: "Hoda Mostafa", phone: "0109 777 8899", orders: 2, spend: 430, points: 43, joined: "2026-04-30" },
];

export function AdminCard({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-border/70 bg-card p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 font-heading text-base font-black md:text-lg">
        {icon}
        {title}
      </h3>
      {action}
    </div>
  );
}

export function KpiCard({
  icon,
  tint,
  color,
  value,
  label,
  sub,
}: {
  icon: ReactNode;
  tint: string;
  color: string;
  value: string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <span className={`grid size-10 place-items-center rounded-xl ${tint} ${color}`}>{icon}</span>
      <div className="mt-3 font-heading text-lg font-black md:text-xl">{value}</div>
      <div className="mt-0.5 text-[11px] font-bold text-muted-foreground">{label}</div>
      {sub && <div className="mt-1 text-[10px] font-bold text-[#2E9E6B]">{sub}</div>}
    </div>
  );
}

export const TH = "px-4 py-3 text-start font-heading font-black whitespace-nowrap";
export const TD = "px-4 py-3 align-middle";

/* ------------------------------------------------------------------ */
/* Sortable column header — click to sort, click again to flip         */
/* ------------------------------------------------------------------ */
export type ColSort = { key: string; dir: 1 | -1 } | null;

export function nextSort(cur: ColSort, key: string): ColSort {
  if (!cur || cur.key !== key) return { key, dir: 1 };
  if (cur.dir === 1) return { key, dir: -1 };
  return null; /* third click clears */
}

export function SortTh({
  label,
  colKey,
  sort,
  onSort,
}: {
  label: string;
  colKey: string;
  sort: ColSort;
  onSort: (key: string) => void;
}) {
  const active = sort?.key === colKey;
  const Icon = !active ? IconArrowUpDown : sort!.dir === 1 ? IconArrowUp : IconArrowDown;
  return (
    <th className={TH}>
      <button
        onClick={() => onSort(colKey)}
        className={`inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 transition hover:text-[#1E4E8F] ${
          active ? "text-[#1E4E8F]" : ""
        }`}
      >
        {label}
        <Icon className="size-3.5 opacity-80" />
      </button>
    </th>
  );
}

export function sortRows<T>(rows: T[], sort: ColSort, val: (row: T) => string | number): T[] {
  if (!sort) return rows;
  return [...rows].sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    const cmp =
      typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb), "ar");
    return cmp * sort.dir;
  });
}

export function StatusBadge({ status, t }: { status: string; t: (k: DictKey) => string }) {
  const meta: Record<string, { label: DictKey; cls: string }> = {
    pending: { label: "admin.stPending", cls: "bg-[#FFF4E5] text-[#B45E0A]" },
    shipping: { label: "admin.stShipping", cls: "bg-[#EAF1F9] text-[#1E4E8F]" },
    delivered: { label: "admin.stDelivered", cls: "bg-[#EAF6F1] text-[#2E9E6B]" },
    cancelled: { label: "admin.stCancelled", cls: "bg-[#DC4B4B]/10 text-[#DC4B4B]" },
  };
  const m = meta[status] ?? meta.pending;
  return <Badge className={`rounded-full border-0 ${m.cls}`}>{t(m.label)}</Badge>;
}

export function ExpiryBadge({ p, t }: { p: Product; t: (k: DictKey) => string }) {
  const em = expiryMeta(p);
  const label =
    em.key === "expired"
      ? t("admin.expired")
      : em.key === "expiring"
        ? `${t("admin.expiring")} — ${daysUntil(p.expiry)} ${t("dv.min")}`
        : t("admin.ok");
  const icon =
    em.key === "expired" ? (
      <XCircle className="size-3" />
    ) : em.key === "expiring" ? (
      <AlertTriangle className="size-3" />
    ) : (
      <CheckCircle2 className="size-3" />
    );
  return (
    <Badge className={`gap-1 rounded-full border-0 ${em.cls}`}>
      {icon}
      {label}
    </Badge>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="nice-scrollbar overflow-x-auto">{children}</div>
    </div>
  );
}
