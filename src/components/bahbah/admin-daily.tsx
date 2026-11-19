"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  Download,
  Landmark,
  RefreshCw,
  Smartphone,
  Star,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { driverById, type CourierCollection, type CourierRating, type Order } from "@/lib/bahbah/data";
import { useBahbah, useT } from "@/lib/bahbah/store";
import {
  fetchActiveOrdersFromSupabase,
  fetchCourierCollectionsForDayFromSupabase,
  fetchCourierRatingsFromSupabase,
  fetchOrdersForDayFromSupabase,
  fetchQueueSnapshotFromSupabase,
  type QueueSnapshot,
} from "@/lib/supabase";
import {
  buildDailyReport,
  findStuckOrders,
  STUCK_THRESHOLDS_MIN,
  topCouriersForDay,
} from "@/lib/bahbah/reports";
import { fmtPrice } from "./product-card";
import { AdminCard, KpiCard, SectionTitle, StatusBadge } from "./admin-ui";
import { IconScooter } from "./icons";

/* ------------------------------------------------------------------ */
/* التقرير اليومي — صورة يوم كامل من بيانات السيرفر الحقيقية:          */
/* طلبات اليوم وإيرادها، التسليمات والإلغاءات، التحصيلات بكل طريقة،   */
/* أفضل المناديب (تسليمات + تقييم)، لقطة الطوابير المستنية إجراء،      */
/* والأعطال = طلبات عالقة في حالتها أطول من حدود موثقة في reports.ts. */
/* حدود اليوم بنفس اتفاق باقي اللوحات (تاريخ UTC زي order.date).      */
/* رصد الأعطال لحظي بطبيعته فبيظهر في تقرير النهارده بس.               */
/* ------------------------------------------------------------------ */

const todayKey = () => new Date().toISOString().slice(0, 10);

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function DailyReportSection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const ar = lang === "ar";

  const [day, setDay] = useState<string>(todayKey());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [collections, setCollections] = useState<CourierCollection[]>([]);
  const [ratings, setRatings] = useState<CourierRating[]>([]);
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[] | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const isToday = day === todayKey();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [oRes, cRes, snap, r] = await Promise.all([
      fetchOrdersForDayFromSupabase(day),
      fetchCourierCollectionsForDayFromSupabase(day),
      fetchQueueSnapshotFromSupabase(),
      fetchCourierRatingsFromSupabase(300),
    ]);
    const errs: string[] = [];
    if (oRes.orders) setOrders(oRes.orders);
    else errs.push(oRes.error);
    if (cRes.collections) setCollections(cRes.collections);
    else errs.push(cRes.error);
    setSnapshot(snap);
    if (!snap) errs.push(ar ? "تعذّر جلب لقطة الطوابير" : "Queue snapshot failed");
    setRatings(r);
    if (day === todayKey()) {
      const aRes = await fetchActiveOrdersFromSupabase();
      if (aRes.orders) setActiveOrders(aRes.orders);
      else {
        setActiveOrders(null);
        errs.push(aRes.error);
      }
    } else {
      setActiveOrders(null);
    }
    if (errs.length > 0) {
      setError(errs[0]);
      toast.error(ar ? "في جزء من بيانات التقرير ما اتجابش — شوف التنبيه فوق" : "Part of the report data failed to load — see the banner");
    }
    setLoadedAt(new Date());
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => buildDailyReport(orders, collections), [orders, collections]);
  const topCouriers = useMemo(() => topCouriersForDay(orders, ratings), [orders, ratings]);
  const stuck = useMemo(
    () => (isToday && activeOrders ? findStuckOrders(activeOrders, Date.now()) : []),
    [isToday, activeOrders]
  );

  const courierName = (id: string) => {
    const d = driverById(id);
    return d ? (ar ? d.nameAr : d.nameEn) : id;
  };

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      [ar ? "تقرير بحبح اليومي" : "Bahbah Daily Report", day],
      [],
      [ar ? "البند" : "Metric", ar ? "القيمة" : "Value"],
      [ar ? "طلبات اليوم" : "Orders", totals.ordersCount],
      [ar ? "الإيراد (غير الملغي)" : "Revenue (non-cancelled)", totals.revenue],
      [ar ? "تم تسليمها" : "Delivered", totals.deliveredCount],
      [ar ? "ملغية" : "Cancelled", totals.cancelledCount],
      [ar ? "لسه شغالة" : "Still active", totals.activeCount],
      [ar ? "إجمالي التحصيلات" : "Collections total", totals.collectionsTotal],
      [ar ? "تحصيل كاش" : "Cash collections", `${totals.collectionsByMethod.cash.sum} (${totals.collectionsByMethod.cash.count})`],
      [ar ? "تحصيل محفظة" : "Wallet collections", `${totals.collectionsByMethod.wallet.sum} (${totals.collectionsByMethod.wallet.count})`],
      [ar ? "تحصيل بنك" : "Bank collections", `${totals.collectionsByMethod.bank.sum} (${totals.collectionsByMethod.bank.count})`],
      [],
      [ar ? "المندوب" : "Courier", ar ? "تسليمات" : "Deliveries", ar ? "متوسط التقييم" : "Avg rating", ar ? "عدد التقييمات" : "Ratings"],
      ...topCouriers.map((c) => [
        courierName(c.courierId),
        c.delivered,
        c.ratingAvg !== null ? c.ratingAvg.toFixed(2) : "—",
        c.ratingCount,
      ]),
      [],
      [ar ? "طابور مستني إجراء" : "Queue awaiting action", ar ? "العدد الآن" : "Count now"],
      [ar ? "طلبات واتساب" : "WhatsApp orders", snapshot?.whatsapp ?? "—"],
      [ar ? "طلبات نواقص" : "Shortage requests", snapshot?.shortage ?? "—"],
      [ar ? "حجوزات تمريض" : "Nursing bookings", snapshot?.nursing ?? "—"],
      [ar ? "روشتات" : "Prescriptions", snapshot?.rx ?? "—"],
    ];
    if (isToday) {
      rows.push(
        [],
        [ar ? "طلبات عالقة الآن" : "Stuck orders now", ar ? "الحالة" : "Status", ar ? "عالق من (دقيقة)" : "Stuck (min)", ar ? "الحد (دقيقة)" : "Threshold (min)"],
        ...stuck.map((s) => [s.order.id, s.order.status, s.minutesStuck, s.thresholdMin])
      );
    }
    const csv = "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `bahbah_daily_${day}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const queueChips = [
    { label: ar ? "طلبات واتساب مستنية" : "WhatsApp awaiting", value: snapshot?.whatsapp },
    { label: ar ? "نواقص مستنية" : "Shortages awaiting", value: snapshot?.shortage },
    { label: ar ? "تمريض جديد" : "New nursing", value: snapshot?.nursing },
    { label: ar ? "روشتات جديدة" : "New prescriptions", value: snapshot?.rx },
  ];

  return (
    <div className="space-y-4">
      <AdminCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle
            icon={<CalendarDays className="size-5 text-[#1E4E8F]" />}
            title={ar ? "التقرير اليومي" : "Daily Report"}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={isToday ? "default" : "outline"}
              className="h-9 rounded-full px-4 text-xs font-bold"
              onClick={() => setDay(todayKey())}
            >
              {ar ? "النهارده" : "Today"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-full px-4 text-xs font-bold"
              onClick={() => setDay(shiftDay(day, -1))}
            >
              {ar ? "اليوم اللي قبله" : "Previous day"}
            </Button>
            <Input
              type="date"
              value={day}
              max={todayKey()}
              onChange={(e) => e.target.value && setDay(e.target.value)}
              className="h-9 w-40 rounded-full text-xs font-bold"
              dir="ltr"
              aria-label={ar ? "اختيار اليوم" : "Pick a day"}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => void load()}
              className="h-9 rounded-full px-4 text-xs font-bold"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              {ar ? "تحديث" : "Refresh"}
            </Button>
            <Button
              size="sm"
              onClick={exportCsv}
              className="h-9 rounded-full bg-[#1E4E8F] px-4 text-xs font-black text-white hover:bg-[#184C8A]"
            >
              <Download className="size-3.5" />
              {ar ? "تصدير CSV" : "Export CSV"}
            </Button>
          </div>
        </div>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          {ar
            ? "كل الأرقام من بيانات السيرفر لليوم المختار — لقطة الطوابير والأعطال لحظية (دلوقتي) مهما كان اليوم."
            : "All figures come from server data for the selected day — queue snapshot and faults are live (now) regardless of the day."}
          {loadedAt && (
            <>
              {" "}
              {ar ? "آخر تحديث:" : "Updated:"}{" "}
              <span dir="ltr">
                {loadedAt.toLocaleTimeString(ar ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </>
          )}
        </p>
      </AdminCard>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#DC4B4B]/40 bg-[#DC4B4B]/10 px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-black text-[#DC4B4B]">
            <AlertTriangle className="size-4 shrink-0" />
            {ar ? "في بيانات ما اتجابتش من السيرفر:" : "Some data could not be loaded:"} {error}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void load()}
            className="h-8 rounded-full border-[#DC4B4B]/40 px-3 text-[11px] font-bold text-[#DC4B4B] hover:bg-[#DC4B4B]/10 hover:text-[#DC4B4B]"
          >
            {ar ? "حاول تاني" : "Retry"}
          </Button>
        </div>
      )}

      {/* أرقام اليوم */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={<IconScooter className="size-5" />} tint="bg-[#EAF1F9]" color="text-[#1E4E8F]" value={String(totals.ordersCount)} label={ar ? "طلبات اليوم" : "Orders today"} />
        <KpiCard icon={<Wallet className="size-5" />} tint="bg-[#EAF6F1]" color="text-[#2E9E6B]" value={fmtPrice(totals.revenue, t)} label={ar ? "الإيراد (غير الملغي)" : "Revenue"} />
        <KpiCard icon={<Banknote className="size-5" />} tint="bg-[#EAF6F1]" color="text-[#2E9E6B]" value={String(totals.deliveredCount)} label={ar ? "تم تسليمها" : "Delivered"} />
        <KpiCard icon={<AlertTriangle className="size-5" />} tint="bg-[#DC4B4B]/10" color="text-[#DC4B4B]" value={String(totals.cancelledCount)} label={ar ? "ملغية" : "Cancelled"} />
      </div>

      {/* التحصيلات بكل طريقة */}
      <AdminCard>
        <SectionTitle icon={<Wallet className="size-5 text-[#1E4E8F]" />} title={ar ? "التحصيلات حسب الطريقة" : "Collections by method"} />
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard icon={<Banknote className="size-5" />} tint="bg-[#EAF6F1]" color="text-[#2E9E6B]" value={fmtPrice(totals.collectionsByMethod.cash.sum, t)} label={`${ar ? "كاش" : "Cash"} (${totals.collectionsByMethod.cash.count})`} />
          <KpiCard icon={<Smartphone className="size-5" />} tint="bg-[#FFF4E5]" color="text-[#B45E0A]" value={fmtPrice(totals.collectionsByMethod.wallet.sum, t)} label={`${ar ? "محفظة إلكترونية" : "E-Wallet"} (${totals.collectionsByMethod.wallet.count})`} />
          <KpiCard icon={<Landmark className="size-5" />} tint="bg-[#EAF1F9]" color="text-[#1E4E8F]" value={fmtPrice(totals.collectionsByMethod.bank.sum, t)} label={`${ar ? "تحويل بنكي" : "Bank"} (${totals.collectionsByMethod.bank.count})`} />
          <KpiCard icon={<Wallet className="size-5" />} tint="bg-[#EEF0F7]" color="text-[#112D51]" value={fmtPrice(totals.collectionsTotal, t)} label={ar ? "إجمالي المحصّل" : "Total collected"} />
        </div>
      </AdminCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* أفضل المناديب */}
        <AdminCard>
          <SectionTitle icon={<IconScooter className="size-5 text-[#1E4E8F]" />} title={ar ? "مناديب اليوم" : "Today's couriers"} />
          {topCouriers.length === 0 ? (
            <p className="mt-3 text-sm font-bold text-muted-foreground">
              {ar ? "مفيش تسليمات مسجلة في اليوم ده لسه." : "No deliveries recorded for this day yet."}
            </p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {topCouriers.map((c) => (
                <div key={c.courierId} className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2.5 text-xs">
                  <span className="font-heading text-sm font-black">{courierName(c.courierId)}</span>
                  <span className="flex items-center gap-3 font-bold">
                    <span className="text-[#2E9E6B]">
                      {c.delivered} {ar ? "تسليمة" : "deliveries"}
                    </span>
                    <span className="flex items-center gap-1 text-[#C56A0A]">
                      <Star className="size-3.5 fill-[#F09428] text-[#F09428]" />
                      {c.ratingAvg !== null ? c.ratingAvg.toFixed(1) : "—"}
                      {c.ratingCount > 0 ? ` (${c.ratingCount})` : ""}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </AdminCard>

        {/* لقطة الطوابير */}
        <AdminCard>
          <SectionTitle icon={<AlertTriangle className="size-5 text-[#B45E0A]" />} title={ar ? "طوابير مستنية إجراء (الآن)" : "Queues awaiting action (now)"} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {queueChips.map((q) => (
              <div key={q.label} className="rounded-xl bg-muted/40 px-3 py-3 text-center">
                <p className="font-heading text-xl font-black text-[#112D51]">
                  {q.value === undefined ? "…" : q.value}
                </p>
                <p className="text-[11px] font-bold text-muted-foreground">{q.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] font-bold text-muted-foreground">
            {ar
              ? "دي لقطة لحظية بعدّادات السيرفر — مش مرتبطة باليوم المختار."
              : "A live snapshot from server counters — not tied to the selected day."}
          </p>
        </AdminCard>
      </div>

      {/* الأعطال: طلبات عالقة */}
      <AdminCard>
        <SectionTitle
          icon={<AlertTriangle className="size-5 text-[#DC4B4B]" />}
          title={ar ? "أعطال: طلبات عالقة" : "Faults: stuck orders"}
        />
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          {ar
            ? `الطلب بيعتبر عالق لو فضل في حالته من غير تحديث أطول من: قيد المراجعة ${STUCK_THRESHOLDS_MIN.pending} دقيقة، تم التجهيز ${STUCK_THRESHOLDS_MIN.ready} دقيقة، في الطريق ${STUCK_THRESHOLDS_MIN.shipping} دقيقة.`
            : `An order is stuck if it stays in its status without an update longer than: pending ${STUCK_THRESHOLDS_MIN.pending} min, ready ${STUCK_THRESHOLDS_MIN.ready} min, shipping ${STUCK_THRESHOLDS_MIN.shipping} min.`}
        </p>
        {!isToday ? (
          <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-3 text-center text-xs font-bold text-muted-foreground">
            {ar
              ? "رصد الأعطال لحظي — بيظهر في تقرير النهارده بس، لأنه بيقيس حالة الطلب دلوقتي مش تاريخه."
              : "Fault detection is live — it appears in today's report only, since it measures the order's state right now."}
          </p>
        ) : stuck.length === 0 ? (
          <p className="mt-3 rounded-xl bg-[#EAF6F1] px-3 py-3 text-center text-xs font-black text-[#2E9E6B]">
            {ar ? "مفيش طلبات عالقة دلوقتي ✓" : "No stuck orders right now ✓"}
          </p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {stuck.map(({ order, minutesStuck, thresholdMin }) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DC4B4B]/25 bg-[#DC4B4B]/5 px-3 py-2.5 text-xs"
              >
                <span className="min-w-0 font-bold">
                  <span className="font-heading font-black text-[#1E4E8F]">{order.id}</span>{" "}
                  {ar ? order.customerAr : order.customerEn}
                  <span className="text-muted-foreground" dir="ltr"> {order.phone}</span>
                  {order.delivery?.driverId && (
                    <span className="text-muted-foreground"> — {courierName(order.delivery.driverId)}</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-black text-[#DC4B4B]">
                    {ar ? `عالق من ${minutesStuck} دقيقة (الحد ${thresholdMin})` : `stuck ${minutesStuck} min (limit ${thresholdMin})`}
                  </span>
                  <StatusBadge status={order.status} t={t} />
                </span>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
