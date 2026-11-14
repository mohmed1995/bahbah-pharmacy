"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Search,
  Pill,
  FileWarning,
  Package,
  Clock,
  AlertTriangle,
  Plus,
  CheckCircle2,
  XCircle,
  FileText,
  Phone,
  ArrowRight,
  ArrowLeft,
  LogIn,
  MapPin,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { adminOrders as adminDemoOrders, categories, discountPct } from "@/lib/bahbah/data";
import { useBahbah, useT, useAdminProducts, type Product } from "@/lib/bahbah/store";
import { fmtPrice } from "./product-card";
import { KpiCard, daysUntil, TableWrap, TH, TD } from "./admin-ui";
import { StaffGate } from "./courier";
import { IconPharmacist, IconRxClipboard } from "./icons";

/* ------------------------------------------------------------------ */
/* Pharmacist portal — مخزون + بحث + روشتات + طلبات التحضير            */
/* ------------------------------------------------------------------ */

export default function PharmacistPortal() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const user = useBahbah((s) => s.user);
  const adminOrders = useBahbah((s) => s.adminOrders);
  const rxQueue = useBahbah((s) => s.rxQueue);
  const allProducts = useAdminProducts();
  const { go, pharmacistReady, adminSetRx, restock } = useBahbah();

  const [q, setQ] = useState("");

  const orders = adminOrders ?? adminDemoOrders;
  const pending = orders.filter((o) => o.status === "pending");
  const lowStock = allProducts.filter((p) => p.stock > 0 && p.stock < 30);
  const outStock = allProducts.filter((p) => p.stock === 0);
  const expiring = allProducts.filter((p) => {
    const d = daysUntil(p.expiry);
    return d >= 0 && d < 90;
  });
  const newRx = rxQueue.filter((r) => r.status === "new");

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return allProducts
      .filter(
        (p) =>
          p.nameAr.includes(q.trim()) ||
          p.nameEn.toLowerCase().includes(s) ||
          p.ingredientAr.includes(q.trim()) ||
          p.ingredientEn.toLowerCase().includes(s) ||
          p.brandAr.includes(q.trim()) ||
          p.brandEn.toLowerCase().includes(s)
      )
      .slice(0, 8);
  }, [q, allProducts]);

  if (!user || user.role !== "pharmacist") return <StaffGatePharm />;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-5 md:px-6 md:pb-12">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#2E9E6B] text-white shadow-md">
            <IconPharmacist className="size-6" />
          </span>
          <div>
            <h1 className="font-heading text-xl font-black md:text-2xl">{t("pharm.title")}</h1>
            <p className="text-xs font-bold text-muted-foreground md:text-sm">{t("pharm.sub")}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="rounded-full font-bold" onClick={() => go("home")}>
          <ArrowRight className="size-4 rtl:inline ltr:hidden" />
          <ArrowLeft className="size-4 ltr:inline rtl:hidden" />
          {t("admin.back")}
        </Button>
      </div>

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={<Package className="size-5" />} tint="bg-[#EAF1F9]" color="text-[#1E4E8F]" value={String(pending.length)} label={t("pharm.kpiNew")} />
        <KpiCard icon={<FileText className="size-5" />} tint="bg-[#FFF4E5]" color="text-[#B45E0A]" value={String(newRx.length)} label={t("pharm.kpiRx")} />
        <KpiCard icon={<AlertTriangle className="size-5" />} tint="bg-[#DC4B4B]/10" color="text-[#DC4B4B]" value={String(lowStock.length + outStock.length)} label={t("pharm.kpiLow")} />
        <KpiCard icon={<Clock className="size-5" />} tint="bg-[#EAF6F1]" color="text-[#2E9E6B]" value={String(expiring.length)} label={t("pharm.kpiExp")} />
      </div>

      {/* ---- product search ---- */}
      <div className="mt-6 rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-heading text-base font-black md:text-lg">
          <Search className="size-4.5 text-[#1E4E8F]" />
          {t("nav.search")}
        </h2>
        <div className="relative mt-3">
          <Search className="absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("pharm.search")}
            className="h-12 rounded-2xl ps-10 text-base"
          />
        </div>

        {q.trim().length >= 2 && (
          <div className="mt-3 space-y-2">
            {results.length === 0 ? (
              <p className="py-4 text-center text-sm font-bold text-muted-foreground">{t("pharm.searchNone")}</p>
            ) : (
              results.map((p) => {
                const cat = categories.find((c) => c.id === p.category);
                const off = discountPct(p);
                return (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3 transition hover:border-[#1E4E8F]/30"
                  >
                    {/* packshot / duotone fallback */}
                    <div
                      className={`relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl ${
                        p.img ? "bg-white ring-1 ring-black/5" : "bg-[#EAF6F1]"
                      }`}
                    >
                      {p.img ? (
                        <Image src={p.img} alt={p.nameEn} fill sizes="56px" className="object-contain p-1" />
                      ) : (
                        <Pill className="size-6 text-[#2E9E6B]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{lang === "ar" ? p.nameAr : p.nameEn}</p>
                      <p className="truncate text-[11px] font-bold text-muted-foreground">
                        {lang === "ar" ? p.ingredientAr : p.ingredientEn} · {lang === "ar" ? p.brandAr : p.brandEn}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {cat && (
                          <span className="rounded-full bg-[#EAF1F9] px-2 py-0.5 text-[10px] font-black text-[#1E4E8F]">
                            {lang === "ar" ? cat.nameAr : cat.nameEn}
                          </span>
                        )}
                        {off > 0 && (
                          <span className="flex items-center gap-0.5 rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-black text-[#B45E0A]">
                            <Tag className="size-2.5" />
                            {off}٪ {t("misc.discount")}
                          </span>
                        )}
                        <Badge
                          className={`rounded-full border-0 ${
                            p.stock === 0
                              ? "bg-[#DC4B4B]/10 text-[#DC4B4B]"
                              : p.stock < 30
                                ? "bg-[#FFF4E5] text-[#B45E0A]"
                                : "bg-[#EAF6F1] text-[#2E9E6B]"
                          }`}
                        >
                          {t("pharm.qty")}: {p.stock}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-end">
                        <p className="text-sm font-black text-[#1E4E8F]">{fmtPrice(p.price, t)}</p>
                        {p.oldPrice && (
                          <p className="text-[10px] font-bold text-muted-foreground line-through">
                            {fmtPrice(p.oldPrice, t)}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full px-3 font-black text-[#2E9E6B]"
                        onClick={() => {
                          restock(p.id, 10);
                          // refresh search results in place
                          setQ((v) => v);
                        }}
                      >
                        <Plus className="size-3.5" />
                        10
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ---- preparation queue ---- */}
      <h2 className="mt-7 flex items-center gap-2 font-heading text-lg font-black">
        <IconRxClipboard className="size-5 text-[#1E4E8F]" />
        {t("pharm.queue")} ({pending.length})
      </h2>

      {pending.length === 0 ? (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#2E9E6B]/40 bg-[#EAF6F1]/50 p-6 text-sm font-bold text-[#2E9E6B]">
          <CheckCircle2 className="size-4.5" />
          {t("pharm.queueNone")}
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          {pending.map((o) => (
            <div key={o.id} className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-heading text-base font-black text-[#1E4E8F]">{o.id}</span>
                  <Badge className="rounded-full border-0 bg-[#FFF4E5] text-[#B45E0A]">{t("admin.stPending")}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <Phone className="size-3.5" />
                  <span dir="ltr">{o.phone}</span>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                {o.items.map((it) => (
                  <div key={it.productId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      {lang === "ar" ? it.nameAr : it.nameEn}
                      <span className="text-muted-foreground"> × {it.qty}</span>
                    </span>
                    <span className="shrink-0 font-bold">{fmtPrice(it.price * it.qty, t)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-xs font-bold text-muted-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#DC4B4B]" />
                {o.address}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3.5">
                <span className="text-sm font-bold text-muted-foreground">
                  {lang === "ar" ? o.customerAr : o.customerEn}
                </span>
                <Button className="h-11 rounded-full px-6 font-black" onClick={() => pharmacistReady(o.id)}>
                  <CheckCircle2 className="size-4" />
                  {t("pharm.readyBtn")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- incoming prescriptions ---- */}
      {newRx.length > 0 && (
        <>
          <h2 className="mt-7 flex items-center gap-2 font-heading text-lg font-black">
            <FileText className="size-5 text-[#B45E0A]" />
            {t("pharm.rxQueue")} ({newRx.length})
          </h2>
          <div className="mt-3 space-y-2.5">
            {newRx.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F09428]/30 bg-[#FFF4E5]/50 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F09428]/15 text-[#B45E0A]">
                    <FileText className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black">
                      {r.id} — {lang === "ar" ? r.customerAr : r.customerEn}
                    </p>
                    <p className="truncate text-[11px] font-bold text-muted-foreground">
                      {r.fileName} · <span dir="ltr">{r.phone}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-9 rounded-full bg-[#2E9E6B] px-4 font-black text-white hover:bg-[#278a5e]"
                    onClick={() => adminSetRx(r.id, "approved")}
                  >
                    <CheckCircle2 className="size-3.5" />
                    {t("pharm.accept")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-full border-[#DC4B4B]/30 px-4 font-black text-[#DC4B4B] hover:bg-[#DC4B4B]/10"
                    onClick={() => adminSetRx(r.id, "rejected")}
                  >
                    <XCircle className="size-3.5" />
                    {t("pharm.reject")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---- low stock + expiring tables ---- */}
      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        <StockTable
          title={t("pharm.lowTbl")}
          icon={<AlertTriangle className="size-4.5 text-[#DC4B4B]" />}
          rows={[...outStock, ...lowStock].slice(0, 8)}
          onRestock={(id) => restock(id, 10)}
        />
        <ExpiringTable rows={expiring.slice(0, 8)} />
      </div>
    </main>
  );
}

/* gate when not signed in as pharmacist */
function StaffGatePharm() {
  return <StaffGate role="pharmacist" />;
}

/* ------------------------------------------------------------------ */
/* Low-stock table with quick +10 restock                              */
/* ------------------------------------------------------------------ */
function StockTable({
  title,
  icon,
  rows,
  onRestock,
}: {
  title: string;
  icon: React.ReactNode;
  rows: Product[];
  onRestock: (id: string) => void;
}) {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  return (
    <div>
      <h3 className="flex items-center gap-2 font-heading text-sm font-black">
        {icon}
        {title}
      </h3>
      <div className="mt-2.5">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-xs font-bold text-muted-foreground">—</p>
        ) : (
          <TableWrap>
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className={TH}>{t("nav.catalog")}</th>
                  <th className={TH}>{t("admin.products")}</th>
                  <th className={TH}>{t("pharm.qty")}</th>
                  <th className={TH}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0">
                    <td className={TD}>
                      <div className="flex items-center gap-2">
                        <div
                          className={`relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg ${
                            p.img ? "bg-white ring-1 ring-black/5" : "bg-[#EAF1F9]"
                          }`}
                        >
                          {p.img ? (
                            <Image src={p.img} alt={p.nameEn} fill sizes="36px" className="object-contain p-0.5" />
                          ) : (
                            <Pill className="size-4 text-[#1E4E8F]" />
                          )}
                        </div>
                        <span className="font-bold">{lang === "ar" ? p.nameAr : p.nameEn}</span>
                      </div>
                    </td>
                    <td className={`${TD} font-black text-[#1E4E8F]`}>{fmtPrice(p.price, t)}</td>
                    <td className={TD}>
                      <Badge
                        className={`rounded-full border-0 ${
                          p.stock === 0 ? "bg-[#DC4B4B]/10 text-[#DC4B4B]" : "bg-[#FFF4E5] text-[#B45E0A]"
                        }`}
                      >
                        {p.stock}
                      </Badge>
                    </td>
                    <td className={TD}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-full px-2.5 text-[11px] font-black text-[#2E9E6B]"
                        onClick={() => onRestock(p.id)}
                      >
                        <Plus className="size-3" />
                        10
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Expiring-within-90-days table                                       */
/* ------------------------------------------------------------------ */
function ExpiringTable({ rows }: { rows: Product[] }) {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  return (
    <div>
      <h3 className="flex items-center gap-2 font-heading text-sm font-black">
        <Clock className="size-4.5 text-[#B45E0A]" />
        {t("pharm.expTbl")}
      </h3>
      <div className="mt-2.5">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-xs font-bold text-muted-foreground">—</p>
        ) : (
          <TableWrap>
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className={TH}>{t("nav.catalog")}</th>
                  <th className={TH}>{t("pharm.expiry")}</th>
                  <th className={TH}>{t("pharm.qty")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const d = daysUntil(p.expiry);
                  return (
                    <tr key={p.id} className="border-b border-border/50 last:border-0">
                      <td className={TD}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg ${
                              p.img ? "bg-white ring-1 ring-black/5" : "bg-[#EAF1F9]"
                            }`}
                          >
                            {p.img ? (
                              <Image src={p.img} alt={p.nameEn} fill sizes="36px" className="object-contain p-0.5" />
                            ) : (
                              <Pill className="size-4 text-[#1E4E8F]" />
                            )}
                          </div>
                          <span className="font-bold">{lang === "ar" ? p.nameAr : p.nameEn}</span>
                        </div>
                      </td>
                      <td className={TD}>
                        <span className="inline-flex items-center gap-1.5 font-bold text-[#B45E0A]">
                          <FileWarning className="size-3" />
                          {d} {t("pharm.days")}
                        </span>
                      </td>
                      <td className={`${TD} font-bold`}>{p.stock}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
    </div>
  );
}
