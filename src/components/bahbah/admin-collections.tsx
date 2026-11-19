"use client";

import { useMemo, useState } from "react";
import { Wallet, Banknote, Smartphone, Landmark, HandCoins, PackageCheck, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { driverById, type CourierCollection } from "@/lib/bahbah/data";
import { useBahbah, useT } from "@/lib/bahbah/store";
import { fmtPrice } from "./product-card";
import { KpiCard } from "./admin-ui";

/* ------------------------------------------------------------------ */
/* التوريد والتحصيل — سجل فلوس المناديب عند المدير بس.                 */
/* كل سجل: المندوب حصّل كام من عميل طلب بعينه، وإزاي (كاش/محفظة/بنك)،  */
/* والمحفظة من رقم إيه لحساب إيه — عشان وقت التوريد المدير يعرف كل     */
/* جنيه جه منين. القسم ده بيترندر بصلاحية «الماليات» بس، والبيانات     */
/* نفسها محكومة بـ RLS (أدمن/ماليات) فالصيدلي مش هيوصله أي مبلغ.       */
/* ------------------------------------------------------------------ */

const METHOD_META: Record<
  CourierCollection["method"],
  { ar: string; en: string; icon: React.ReactNode; cls: string }
> = {
  cash: { ar: "كاش", en: "Cash", icon: <Banknote className="size-3.5" />, cls: "bg-[#EAF6F1] text-[#2E9E6B]" },
  wallet: { ar: "محفظة إلكترونية", en: "E-Wallet", icon: <Smartphone className="size-3.5" />, cls: "bg-[#FFF4E5] text-[#B45E0A]" },
  bank: { ar: "تحويل بنكي", en: "Bank", icon: <Landmark className="size-3.5" />, cls: "bg-[#EAF1F9] text-[#1E4E8F]" },
};

function methodDetail(c: CourierCollection, lang: string): string {
  if (c.method === "wallet") {
    return lang === "ar"
      ? `من رقم ${c.walletFrom || "—"} لحساب ${c.walletTo || "—"}`
      : `from ${c.walletFrom || "—"} to ${c.walletTo || "—"}`;
  }
  if (c.method === "bank" && c.walletTo) {
    return lang === "ar" ? `لحساب ${c.walletTo}` : `to account ${c.walletTo}`;
  }
  return "";
}

export function CollectionsSection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const collections = useBahbah((s) => s.courierCollections);
  const adminUpdateCollection = useBahbah((s) => s.adminUpdateCollection);
  const adminDeleteCollection = useBahbah((s) => s.adminDeleteCollection);
  const [scope, setScope] = useState<"today" | "all">("today");
  /* تصحيح مبلغ سجل من المدير — السجل ثابت بعد كتابته لأي حد تاني،
     والسياسة على السيرفر بتسمح للأدمن بس بالتعديل/الحذف */
  const [editId, setEditId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10);
  const rows = useMemo(
    () =>
      scope === "today"
        ? collections.filter((c) => (c.createdAt || "").slice(0, 10) === todayStr)
        : collections,
    [collections, scope, todayStr]
  );

  const totals = useMemo(() => {
    const sum = (list: CourierCollection[]) => list.reduce((s, c) => s + (c.amount || 0), 0);
    return {
      all: sum(rows),
      cash: sum(rows.filter((c) => c.method === "cash")),
      wallet: sum(rows.filter((c) => c.method === "wallet")),
      bank: sum(rows.filter((c) => c.method === "bank")),
    };
  }, [rows]);

  const byCourier = useMemo(() => {
    const map = new Map<string, { key: string; name: string; list: CourierCollection[] }>();
    for (const c of rows) {
      const key = c.courierId || c.courierEmail || "—";
      const drv = c.courierId ? driverById(c.courierId) : undefined;
      const name =
        c.courierName ||
        (drv ? (lang === "ar" ? drv.nameAr : drv.nameEn) : undefined) ||
        c.courierEmail ||
        key;
      if (!map.has(key)) map.set(key, { key, name, list: [] });
      map.get(key)!.list.push(c);
    }
    return [...map.values()].sort(
      (a, b) =>
        b.list.reduce((s, c) => s + c.amount, 0) - a.list.reduce((s, c) => s + c.amount, 0)
    );
  }, [rows, lang]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-xl font-black">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#1E4E8F]/10 text-[#1E4E8F]">
              <HandCoins className="size-5" />
            </span>
            {lang === "ar" ? "التوريد والتحصيل" : "Courier Collections & Settlement"}
          </h2>
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            {lang === "ar"
              ? "كل مبلغ حصّله مندوب من عميل بيتسجل هنا لحظة التسليم — القسم ده ظاهر للمدير بس."
              : "Every amount a courier collects is logged here at delivery — manager only."}
          </p>
        </div>
        <div className="flex rounded-full border border-border bg-card p-1">
          {(["today", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`rounded-full px-4 py-1.5 text-xs font-black transition ${
                scope === s ? "bg-[#1E4E8F] text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "today" ? (lang === "ar" ? "النهارده" : "Today") : lang === "ar" ? "الكل" : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* totals */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={<Wallet className="size-5" />} tint="bg-[#1E4E8F]/10" color="text-[#1E4E8F]" value={fmtPrice(totals.all, t)} label={lang === "ar" ? "إجمالي المحصّل" : "Total Collected"} />
        <KpiCard icon={<Banknote className="size-5" />} tint="bg-[#EAF6F1]" color="text-[#2E9E6B]" value={fmtPrice(totals.cash, t)} label={lang === "ar" ? "كاش" : "Cash"} />
        <KpiCard icon={<Smartphone className="size-5" />} tint="bg-[#FFF4E5]" color="text-[#B45E0A]" value={fmtPrice(totals.wallet, t)} label={lang === "ar" ? "محافظ إلكترونية" : "E-Wallets"} />
        <KpiCard icon={<Landmark className="size-5" />} tint="bg-[#EAF1F9]" color="text-[#1E4E8F]" value={fmtPrice(totals.bank, t)} label={lang === "ar" ? "تحويلات بنكية" : "Bank Transfers"} />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-muted/40 p-10 text-center">
          <PackageCheck className="size-10 text-muted-foreground/60" />
          <p className="max-w-sm text-sm font-bold text-muted-foreground">
            {lang === "ar"
              ? scope === "today"
                ? "مفيش تحصيلات النهارده لسه — أول ما مندوب يسلّم طلب ويحصّل، السجل هيظهر هنا فورًا مع تنبيه."
                : "مفيش سجلات تحصيل لسه — بتتكون تلقائيًا عند كل تسليم."
              : "No collections yet — they are recorded automatically at each delivery."}
          </p>
        </div>
      ) : (
        <>
          {/* per-courier settlement cards */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {byCourier.map((g) => {
              const total = g.list.reduce((s, c) => s + c.amount, 0);
              const cash = g.list.filter((c) => c.method === "cash").reduce((s, c) => s + c.amount, 0);
              const wallet = g.list.filter((c) => c.method === "wallet").reduce((s, c) => s + c.amount, 0);
              const bank = g.list.filter((c) => c.method === "bank").reduce((s, c) => s + c.amount, 0);
              return (
                <div key={g.key} className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-heading text-sm font-black">{g.name}</p>
                    <Badge variant="outline" className="rounded-full font-bold">
                      {g.list.length} {lang === "ar" ? "تسليمة" : "deliveries"}
                    </Badge>
                  </div>
                  <p className="mt-2 font-heading text-2xl font-black text-[#1E4E8F]">{fmtPrice(total, t)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                    {cash > 0 && <span className="rounded-full bg-[#EAF6F1] px-2 py-0.5 text-[#2E9E6B]">{lang === "ar" ? "كاش" : "Cash"}: {fmtPrice(cash, t)}</span>}
                    {wallet > 0 && <span className="rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[#B45E0A]">{lang === "ar" ? "محفظة" : "Wallet"}: {fmtPrice(wallet, t)}</span>}
                    {bank > 0 && <span className="rounded-full bg-[#EAF1F9] px-2 py-0.5 text-[#1E4E8F]">{lang === "ar" ? "بنك" : "Bank"}: {fmtPrice(bank, t)}</span>}
                  </div>
                  <p className="mt-2.5 border-t border-border/60 pt-2 text-[11px] font-bold text-muted-foreground">
                    {lang === "ar"
                      ? `المطلوب تورّيده كاش: ${fmtPrice(cash, t)} — المحافظ والبنك اتحولت لحسابات الصيدلية مباشرة`
                      : `Cash to hand over: ${fmtPrice(cash, t)} — wallets/bank went straight to the pharmacy accounts`}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ledger */}
          <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
            <div className="border-b border-border/60 bg-muted/40 px-5 py-3">
              <p className="font-heading text-sm font-black">
                {lang === "ar" ? "سجل التحصيلات" : "Collections Ledger"} ({rows.length})
              </p>
            </div>
            <div className="divide-y divide-border/60">
              {rows.map((c) => {
                const meta = METHOD_META[c.method];
                const detail = methodDetail(c, lang);
                const when = new Date(c.createdAt);
                return (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${meta.cls}`}>
                        {meta.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {lang === "ar" ? "طلب" : "Order"} <span className="text-[#1E4E8F]">#{c.orderId}</span>
                          <span className="text-muted-foreground"> — {c.courierName || c.courierId || "—"}</span>
                        </p>
                        <p className="truncate text-[11px] font-bold text-muted-foreground">
                          {lang === "ar" ? meta.ar : meta.en}
                          {detail ? ` · ${detail}` : ""}
                          {c.note ? ` · ${c.note}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="font-heading text-base font-black text-[#2E9E6B]">{fmtPrice(c.amount, t)}</p>
                      <p className="text-[11px] font-bold text-muted-foreground" dir="ltr">
                        {when.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")} ·{" "}
                        {when.toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/50 pt-2.5 sm:w-auto sm:border-0 sm:pt-0">
                      {editId === c.id ? (
                        <>
                          <Input
                            type="number"
                            min={0}
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="h-8 w-28 rounded-full text-xs font-bold"
                            dir="ltr"
                            aria-label={lang === "ar" ? "المبلغ الصحيح" : "Correct amount"}
                          />
                          <Button
                            size="sm"
                            className="h-8 rounded-full bg-[#2E9E6B] px-3 text-[11px] font-black text-white hover:bg-[#278a5e]"
                            onClick={async () => {
                              const amt = Number(editAmount);
                              if (!Number.isFinite(amt) || amt < 0) {
                                toast.error(lang === "ar" ? "اكتب مبلغ صحيح" : "Enter a valid amount");
                                return;
                              }
                              if (await adminUpdateCollection(c.id, { amount: amt })) {
                                setEditId(null);
                                toast.success(lang === "ar" ? "تم تصحيح المبلغ" : "Amount corrected");
                              }
                            }}
                          >
                            {lang === "ar" ? "حفظ" : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full px-3 text-[11px] font-bold"
                            onClick={() => setEditId(null)}
                          >
                            {lang === "ar" ? "إلغاء" : "Cancel"}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full px-3 text-[11px] font-bold"
                            onClick={() => {
                              setEditId(c.id);
                              setEditAmount(String(c.amount));
                            }}
                          >
                            <Pencil className="size-3.5" />
                            {lang === "ar" ? "تصحيح المبلغ" : "Fix amount"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full border-[#DC4B4B]/40 px-3 text-[11px] font-bold text-[#DC4B4B] hover:bg-[#DC4B4B]/10 hover:text-[#DC4B4B]"
                            onClick={async () => {
                              if (!window.confirm(lang === "ar" ? `حذف سجل تحصيل طلب #${c.orderId} نهائيًا؟` : `Delete the collection record for order #${c.orderId} permanently?`)) return;
                              if (await adminDeleteCollection(c.id)) {
                                toast.success(lang === "ar" ? "تم حذف السجل" : "Record deleted");
                              }
                            }}
                          >
                            <Trash2 className="size-3.5" />
                            {lang === "ar" ? "حذف" : "Delete"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
