"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Phone,
  Star,
  TrendingUp,
  Clock,
  BadgeCheck,
  Users,
  MapPin,
  Wallet,
  Trash2,
  MessageCircle,
  Save,
  RefreshCw,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  zoneById,
  type DriverStatus,
} from "@/lib/bahbah/data";
import { useBahbah, useT, useZones, useDrivers } from "@/lib/bahbah/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Plus } from "lucide-react";
import type { Driver } from "@/lib/bahbah/data";
import { IconScooter, IconVan, IconStorefront, IconRoute, IconClockFast } from "./icons";
import { fmtPrice } from "./product-card";
import { AdminCard, SectionTitle, StatusBadge, KpiCard } from "./admin-ui";
import { CustomerContactMenu } from "./contact-menu";
import { fetchCourierRatingsFromSupabase } from "@/lib/supabase";
import { courierLiveBoard, deliveryBoardKpis } from "@/lib/bahbah/reports";
import type { CourierRating } from "@/lib/bahbah/data";
import { toast } from "sonner";

/* ================================================================== */
/* DELIVERY — board / drivers / zones                                  */
/* ================================================================== */
export function DeliverySection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const [tab, setTab] = useState<"board" | "live" | "drivers" | "zones">("board");

  const tabs = [
    { key: "board", label: t("adm.board"), icon: <IconRoute className="size-4" /> },
    { key: "live", label: lang === "ar" ? "المناديب الآن" : "Couriers Live", icon: <Radio className="size-4" /> },
    { key: "drivers", label: t("adm.driversTitle"), icon: <Users className="size-4" /> },
    { key: "zones", label: t("adm.zonesTitle"), icon: <MapPin className="size-4" /> },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="nice-scrollbar flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((x) => (
          <button
            key={x.key}
            onClick={() => setTab(x.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
              tab === x.key ? "bg-[#1E4E8F] text-white" : "bg-card text-foreground/70 hover:bg-muted"
            }`}
          >
            {x.icon}
            {x.label}
          </button>
        ))}
      </div>

      {tab === "board" && <DeliveryBoard />}
      {tab === "live" && <CourierLiveBoard />}
      {tab === "drivers" && <DriversPanel />}
      {tab === "zones" && <ZonesPanel />}
    </div>
  );
}

/* ---------- live board ---------- */
function DeliveryBoard() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const orders = useBahbah((s) => s.adminOrders);
  const drivers = useDrivers();
  const driverStatus = useBahbah((s) => s.driverStatus);
  const { adminAdvance, adminAssignDriver, adminCancel } = useBahbah();
  const list = (orders ?? []).filter(
    (o) => o.status === "pending" || o.status === "ready" || o.status === "shipping"
  );

  /* العدد من القايمة المفلترة فعليًا (useDrivers) — كان بيتحسب من
     القايمة الافتراضية الخام فبيعدّ مناديب المدير شالهم أو عطّلهم */
  const available = drivers.filter(
    (d) => (driverStatus[d.id] ?? d.status) === "available"
  ).length;

  /* مؤشرات حقيقية من نفس طلبات السيرفر اللي اللوحة بتعرضها — الأرقام
     الثابتة الوهمية القديمة اتشالت خالص؛ التعريفات موثّقة في
     deliveryBoardKpis في reports.ts */
  const today = new Date().toISOString().slice(0, 10);
  const board = deliveryBoardKpis(orders ?? [], today);

  const kpis = [
    { icon: <IconScooter className="size-5" />, tint: "bg-[#FFF4E5]", color: "text-[#C56A0A]", value: String(board.deliveredToday), label: t("adm.kpiDeliveries") },
    { icon: <IconClockFast className="size-5" />, tint: "bg-[#EAF1F9]", color: "text-[#1E4E8F]", value: board.avgDeliveryMinutes !== null ? String(board.avgDeliveryMinutes) : "—", label: `${t("adm.kpiAvgTime")} (${t("dv.min")})` },
    { icon: <BadgeCheck className="size-5" />, tint: "bg-[#EAF6F1]", color: "text-[#2E9E6B]", value: board.completionRatePct !== null ? `${board.completionRatePct}%` : "—", label: t("adm.kpiCompletion") },
    { icon: <Users className="size-5" />, tint: "bg-[#EEF0F7]", color: "text-[#112D51]", value: String(available), label: t("adm.kpiDrivers") },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {list.length === 0 ? (
        <AdminCard className="py-12 text-center">
          <IconRoute className="mx-auto size-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-bold text-muted-foreground">{t("adm.noActive")}</p>
        </AdminCard>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((o) => {
            const driver = drivers.find((d) => d.id === o.delivery?.driverId);
            return (
              <AdminCard key={o.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-10 place-items-center rounded-xl bg-[#EAF1F9] text-[#1E4E8F]">
                      {o.delivery?.type === "pickup" ? <IconStorefront className="size-5" /> : <IconScooter className="size-5" />}
                    </span>
                    <div>
                      <p className="font-heading text-sm font-black text-[#1E4E8F]">{o.id}</p>
                      <p className="text-xs font-bold text-foreground/75">
                        {lang === "ar" ? o.customerAr : o.customerEn}
                        <span className="ms-2 text-muted-foreground" dir="ltr">{o.phone}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CustomerContactMenu phone={o.phone} label="" className="grid size-9 place-items-center rounded-full bg-[#2E9E6B] text-white shadow-xs transition hover:brightness-105 active:scale-95" />
                    <StatusBadge status={o.status} t={t} />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-3 text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-foreground/75">
                    <MapPin className="size-3.5 shrink-0 text-[#1E4E8F]" />
                    <span className="truncate">
                      {o.delivery?.type === "pickup"
                        ? t("dv.pickup")
                        : o.delivery
                          ? (lang === "ar" ? o.delivery.zoneNameAr : o.delivery.zoneNameEn)
                          : "—"}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-foreground/75">
                    <Clock className="size-3.5 shrink-0 text-[#1E4E8F]" />
                    <span className="truncate">
                      {o.delivery ? (lang === "ar" ? o.delivery.slotAr : o.delivery.slotEn) : "—"}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-foreground/75">
                    <Wallet className="size-3.5 shrink-0 text-[#1E4E8F]" />
                    {fmtPrice(o.total, t)}
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-foreground/75">
                    <TrendingUp className="size-3.5 shrink-0 text-[#1E4E8F]" />
                    {o.items.length} {t("adm.items")}
                  </span>
                </div>

                {/* driver assign */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={driver?.id ?? ""}
                    onChange={async (e) => {
                      if (await adminAssignDriver(o.id, e.target.value)) {
                        toast.success(t("misc.saved"));
                      }
                    }}
                    className="h-9 min-w-36 flex-1 rounded-full border border-input bg-transparent px-3 text-xs font-bold"
                    aria-label={t("adm.assign")}
                  >
                    <option value="" disabled>
                      {t("adm.assign")}
                    </option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {lang === "ar" ? d.nameAr : d.nameEn}
                      </option>
                    ))}
                  </select>

                  {o.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-full px-4 text-xs font-bold"
                      onClick={async () => {
                        if (await adminAdvance(o.id)) toast.success(t("misc.saved"));
                      }}
                    >
                      <IconScooter className="size-3.5" />
                      {t("admin.stReady")}
                    </Button>
                  )}
                  {o.status === "ready" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-full px-4 text-xs font-bold"
                      onClick={async () => {
                        if (await adminAdvance(o.id)) toast.success(t("misc.saved"));
                      }}
                    >
                      <IconScooter className="size-3.5" />
                      {t("adm.startShip")}
                    </Button>
                  )}
                  {o.status === "shipping" && (
                    <Button
                      size="sm"
                      className="h-9 rounded-full bg-[#2E9E6B] px-4 text-xs font-bold hover:bg-[#278a5e]"
                      onClick={async () => {
                        if (await adminAdvance(o.id)) toast.success(t("misc.saved"));
                      }}
                    >
                      <BadgeCheck className="size-3.5" />
                      {t("adm.markDelivered")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 rounded-full px-3 text-xs font-bold text-[#DC4B4B] hover:bg-[#DC4B4B]/10 hover:text-[#DC4B4B]"
                    onClick={async () => {
                      if (await adminCancel(o.id)) toast.success(t("misc.saved"));
                    }}
                  >
                    {t("adm.cancelOrder")}
                  </Button>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- لوحة المناديب الحية ---------- */
/* صورة حية لكل مندوب: طلباته النشطة دلوقتي وحالتها، تسليمات النهارده،
   تحصيلات النهارده (من سجلات التوريد)، ومتوسط تقييم العملاء. الطلبات
   والتحصيلات بتتحدث لحظيًا من قنوات realtime في الـ store، والتقييمات
   بتتجدد كل 30 ثانية و بزر تحديث — كل رقم هنا من بيانات السيرفر. */
function CourierLiveBoard() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const orders = useBahbah((s) => s.adminOrders) ?? [];
  const collections = useBahbah((s) => s.courierCollections);
  const drivers = useDrivers();
  const driverStatus = useBahbah((s) => s.driverStatus);

  const [ratings, setRatings] = useState<CourierRating[]>([]);
  const [ratingsAt, setRatingsAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loadRatings = async () => {
    setRefreshing(true);
    const r = await fetchCourierRatingsFromSupabase();
    setRatings(r);
    setRatingsAt(new Date());
    setRefreshing(false);
  };
  useEffect(() => {
    void loadRatings();
    const h = setInterval(() => void loadRatings(), 30000);
    return () => clearInterval(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const rows = useMemo(
    () => courierLiveBoard(drivers, orders, collections, ratings, today),
    [drivers, orders, collections, ratings, today]
  );

  const statusMeta: Record<string, { label: string; cls: string }> = {
    available: { label: t("adm.available"), cls: "bg-[#EAF6F1] text-[#2E9E6B]" },
    busy: { label: t("adm.busy"), cls: "bg-[#FFF4E5] text-[#B45E0A]" },
    offline: { label: t("adm.offline"), cls: "bg-muted text-muted-foreground" },
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#2E9E6B] opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-[#2E9E6B]" />
          </span>
          {lang === "ar"
            ? "الطلبات والتحصيلات بتتحدث لحظيًا — التقييمات آخر تحديث: "
            : "Orders & collections update live — ratings last refreshed: "}
          <span dir="ltr">
            {ratingsAt
              ? ratingsAt.toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
              : "…"}
          </span>
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={refreshing}
          onClick={() => void loadRatings()}
          className="h-9 rounded-full px-4 text-xs font-bold"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {lang === "ar" ? "تحديث" : "Refresh"}
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((row) => {
          const d = row.driver;
          const st = driverStatus[d.id] ?? d.status;
          const meta = statusMeta[st] ?? statusMeta.offline;
          return (
            <AdminCard key={d.id} className="p-4">
              <div className="flex items-center gap-3">
                <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-[#EAF1F9] font-heading text-lg font-black text-[#1E4E8F]">
                  {(lang === "ar" ? d.nameAr : d.nameEn).charAt(0)}
                  <span
                    className={`absolute -bottom-0.5 -end-0.5 size-3.5 rounded-full ring-2 ring-white ${
                      st === "available" ? "bg-[#2E9E6B]" : st === "busy" ? "bg-[#F09428]" : "bg-[#98a6b8]"
                    }`}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-black">
                    {lang === "ar" ? d.nameAr : d.nameEn}
                  </p>
                  <p className="text-[11px] font-bold text-muted-foreground" dir="ltr">
                    {d.plate}
                  </p>
                </div>
                <Badge className={`shrink-0 rounded-full border-0 ${meta.cls}`}>{meta.label}</Badge>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-muted/50 p-2.5 text-center">
                <div>
                  <p className="font-heading text-sm font-black text-[#1E4E8F]">{row.activeOrders.length}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">{lang === "ar" ? "نشط الآن" : "Active now"}</p>
                </div>
                <div>
                  <p className="font-heading text-sm font-black text-[#2E9E6B]">{row.deliveredToday}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">{lang === "ar" ? "سلّم النهارده" : "Delivered today"}</p>
                </div>
                <div>
                  <p className="font-heading text-sm font-black text-[#C56A0A]">{fmtPrice(row.collectionsToday, t)}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">
                    {lang === "ar" ? "حصّل النهارده" : "Collected today"}
                    {row.collectionsCountToday > 0 ? ` (${row.collectionsCountToday})` : ""}
                  </p>
                </div>
                <div>
                  <p className="flex items-center justify-center gap-1 font-heading text-sm font-black text-[#C56A0A]">
                    <Star className="size-3 fill-[#F09428] text-[#F09428]" />
                    {row.ratingAvg !== null ? row.ratingAvg.toFixed(1) : "—"}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground">
                    {lang === "ar" ? "التقييم" : "Rating"}
                    {row.ratingCount > 0 ? ` (${row.ratingCount})` : ""}
                  </p>
                </div>
              </div>

              {row.activeOrders.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-2.5 text-center text-[11px] font-bold text-muted-foreground">
                  {lang === "ar" ? "مفيش طلبات نشطة معاه دلوقتي" : "No active orders right now"}
                </p>
              ) : (
                <div className="mt-3 space-y-1.5">
                  {row.activeOrders.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs"
                    >
                      <span className="min-w-0">
                        <span className="font-heading font-black text-[#1E4E8F]">{o.id}</span>{" "}
                        <span className="font-bold text-foreground/75">
                          {lang === "ar" ? o.customerAr : o.customerEn}
                        </span>{" "}
                        <span className="font-bold text-muted-foreground">
                          {o.delivery
                            ? lang === "ar"
                              ? o.delivery.zoneNameAr
                              : o.delivery.zoneNameEn
                            : ""}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-black">{fmtPrice(o.total, t)}</span>
                        <StatusBadge status={o.status} t={t} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </AdminCard>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- drivers ---------- */
function DriversPanel() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const driverStatus = useBahbah((s) => s.driverStatus);
  const drivers = useDrivers();
  const zones = useZones();
  const { cycleDriverStatus, addDriver, removeDriver } = useBahbah();

  /* تقييمات العملاء الحقيقية من السيرفر (courier_ratings) — المتوسط
     والعدد وآخر التعليقات لكل مندوب. من غير تقييمات الخانة بتبان «—»
     بدل أي رقم افتراضي وهمي */
  const [ratings, setRatings] = useState<CourierRating[]>([]);
  useEffect(() => {
    let stop = false;
    fetchCourierRatingsFromSupabase().then((r) => {
      if (!stop) setRatings(r);
    });
    return () => {
      stop = true;
    };
  }, []);
  const ratingByDriver = useMemo(() => {
    const map = new Map<string, { avg: number; count: number; latest: CourierRating[] }>();
    for (const r of ratings) {
      if (!r.courierId) continue;
      const cur = map.get(r.courierId) ?? { avg: 0, count: 0, latest: [] };
      cur.count += 1;
      cur.avg += (r.stars - cur.avg) / cur.count;
      if (r.comment && cur.latest.length < 2) cur.latest.push(r);
      map.set(r.courierId, cur);
    }
    return map;
  }, [ratings]);

  const [addOpen, setAddOpen] = useState(false);
  const [newDriver, setNewDriver] = useState({
    nameAr: "",
    nameEn: "",
    phone: "",
    vehicle: "scooter" as "scooter" | "van",
    plate: "",
    zoneId: "deirout-city",
  });

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.nameAr.trim() || !newDriver.phone.trim()) {
      toast.error(lang === "ar" ? "برجاء إدخال اسم المندوب ورقم الموبايل" : "Please enter courier name and phone");
      return;
    }

    const driverObj: Driver = {
      id: `dr-${Date.now()}`,
      nameAr: newDriver.nameAr.trim(),
      nameEn: newDriver.nameEn.trim() || newDriver.nameAr.trim(),
      phone: newDriver.phone.trim(),
      vehicle: newDriver.vehicle,
      plate: newDriver.plate.trim() || "ط ن ح 1000",
      rating: 5.0,
      trips: 0,
      zoneId: newDriver.zoneId,
      status: "available",
    };

    /* الحوار ما بيقفلش ورسالة النجاح ما بتظهرش غير لو المندوب اتحفظ على
       السيرفر فعلًا — عند الفشل النموذج بيفضل مفتوح بالبيانات زي ما هي */
    const ok = await addDriver(driverObj);
    if (!ok) return;
    setAddOpen(false);
    setNewDriver({
      nameAr: "",
      nameEn: "",
      phone: "",
      vehicle: "scooter",
      plate: "",
      zoneId: "deirout-city",
    });
    toast.success(lang === "ar" ? "تمت إضافة المندوب وتفعيله بنجاح في أسطول واصلي ✓" : "New courier added to Wasly fleet");
  };

  const statusMeta: Record<DriverStatus, { label: string; cls: string }> = useMemo(
    () => ({
      available: { label: t("adm.available"), cls: "bg-[#EAF6F1] text-[#2E9E6B]" },
      busy: { label: t("adm.busy"), cls: "bg-[#FFF4E5] text-[#B45E0A]" },
      offline: { label: t("adm.offline"), cls: "bg-muted text-muted-foreground" },
    }),
    [t]
  );

  return (
    <div className="space-y-4">
      {/* Header bar with Add Courier button */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
        <div>
          <h3 className="font-heading text-base font-black text-foreground">
            {lang === "ar" ? "إدارة أسطول واصلي (المناديب وسائقي التوصيل)" : "Wasly Courier Fleet"}
          </h3>
          <p className="text-xs text-muted-foreground font-semibold">
            {lang === "ar" ? "إجمالي المناديب المسجلين: " : "Total registered couriers: "}
            <span className="font-bold text-[#184C8A]">{drivers.length}</span>
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="rounded-full bg-[#184C8A] px-5 font-black text-white hover:bg-[#112D51] text-xs shadow-sm"
        >
          <UserPlus className="size-4 me-1.5" />
          {lang === "ar" ? "إضافة مندوب جديد +" : "Add Courier +"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {drivers.map((d) => {
        const st = driverStatus[d.id] ?? d.status;
        const zone = zoneById(d.zoneId);
        const meta = statusMeta[st];
        return (
          <AdminCard key={d.id} className="p-4">
            <div className="flex items-center gap-3">
              <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-[#EAF1F9] font-heading text-lg font-black text-[#1E4E8F]">
                {(lang === "ar" ? d.nameAr : d.nameEn).charAt(0)}
                <span
                  className={`absolute -bottom-0.5 -end-0.5 size-3.5 rounded-full ring-2 ring-white ${
                    st === "available" ? "bg-[#2E9E6B]" : st === "busy" ? "bg-[#F09428]" : "bg-[#98a6b8]"
                  }`}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-sm font-black">
                  {lang === "ar" ? d.nameAr : d.nameEn}
                </p>
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                  {d.vehicle === "scooter" ? (
                    <IconScooter className="size-4 text-[#1E4E8F]" />
                  ) : (
                    <IconVan className="size-4 text-[#1E4E8F]" />
                  )}
                  <span dir="ltr">{d.plate}</span>
                </p>
              </div>
              <Badge className={`shrink-0 rounded-full border-0 ${meta.cls}`}>{meta.label}</Badge>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-2.5 text-center">
              <div>
                <p className="flex items-center justify-center gap-1 font-heading text-sm font-black text-[#C56A0A]">
                  <Star className="size-3 fill-[#F09428] text-[#F09428]" />
                  {ratingByDriver.get(d.id) ? ratingByDriver.get(d.id)!.avg.toFixed(1) : "—"}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground">
                  {lang === "ar" ? "التقييم" : "Rating"}
                  {ratingByDriver.get(d.id) ? ` (${ratingByDriver.get(d.id)!.count})` : ""}
                </p>
              </div>
              <div>
                <p className="font-heading text-sm font-black text-[#1E4E8F]">{d.trips.toLocaleString("en-US")}</p>
                <p className="text-[10px] font-bold text-muted-foreground">{t("adm.trips")}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate font-heading text-sm font-black text-[#112D51]">
                  {zone ? (lang === "ar" ? zone.nameAr : zone.nameEn) : "—"}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground">{t("adm.colZone")}</p>
              </div>
            </div>

            {/* آخر تعليقات العملاء على المندوب (من تقييمات السيرفر) */}
            {ratingByDriver.get(d.id)?.latest.length ? (
              <div className="mt-3 space-y-1.5 rounded-xl border border-[#F09428]/25 bg-[#FFF9F0]/70 p-2.5">
                {ratingByDriver.get(d.id)!.latest.map((r) => (
                  <p key={r.id} className="flex items-start gap-1.5 text-[11px] font-bold leading-snug text-foreground/75">
                    <span className="flex shrink-0 items-center gap-0.5 text-[#C56A0A]">
                      <Star className="size-3 fill-[#F09428] text-[#F09428]" />
                      {r.stars}
                    </span>
                    <span className="min-w-0 flex-1">“{r.comment}”</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground" dir="ltr">
                      {new Date(r.createdAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}
                    </span>
                  </p>
                ))}
              </div>
            ) : null}

            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-9 flex-1 rounded-full text-xs font-bold"
                onClick={async () => {
                  if (await cycleDriverStatus(d.id)) toast.success(t("misc.saved"));
                }}
              >
                {t("adm.changeStatus")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 rounded-full border-[#DC4B4B]/40 px-3 text-xs font-bold text-[#DC4B4B] hover:bg-[#DC4B4B]/10 hover:text-[#DC4B4B]"
                onClick={async () => {
                  /* إزالة نهائية مؤكدة: بتتشال من السيرفر فبتختفي من
                     قوائم التعيين على كل الأجهزة (سيادة المدير) */
                  const name = lang === "ar" ? d.nameAr : d.nameEn;
                  if (!window.confirm(lang === "ar" ? `إزالة المندوب «${name}» نهائيًا؟ مش هيظهر في أي قائمة تعيين تاني.` : `Remove courier "${name}" permanently? They will disappear from all assignment lists.`)) return;
                  if (await removeDriver(d.id)) {
                    toast.success(lang === "ar" ? "تمت إزالة المندوب" : "Courier removed");
                  }
                }}
              >
                <Trash2 className="size-4" />
                {lang === "ar" ? "إزالة" : "Remove"}
              </Button>
              <a
                href={`tel:${d.phone.replace(/\s/g, "")}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2E9E6B] text-white transition hover:bg-[#278a5e]"
                aria-label={t("track.call")}
              >
                <Phone className="size-4" />
              </a>
            </div>
          </AdminCard>
        );
      })}
      </div>

      <CourierMsgTemplatesCard />

      {/* Add New Courier Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-black text-[#184C8A]">
              {lang === "ar" ? "إضافة مندوب جديد لأسطول واصلي" : "Add New Wasly Courier"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateDriver} className="space-y-3.5 pt-2">
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                {lang === "ar" ? "اسم المندوب بالعربي *" : "Courier Name (Arabic) *"}
              </label>
              <Input
                value={newDriver.nameAr}
                onChange={(e) => setNewDriver({ ...newDriver, nameAr: e.target.value })}
                placeholder="مثال: أحمد عبد الله"
                className="h-11 rounded-xl"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                {lang === "ar" ? "رقم الموبايل / واتساب *" : "Phone Number *"}
              </label>
              <Input
                value={newDriver.phone}
                onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                placeholder="010XXXXXXXX"
                className="h-11 rounded-xl"
                dir="ltr"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground/80 mb-1">
                  {lang === "ar" ? "وسيلة الانتقال" : "Vehicle"}
                </label>
                <select
                  value={newDriver.vehicle}
                  onChange={(e) => setNewDriver({ ...newDriver, vehicle: e.target.value as "scooter" | "van" })}
                  className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-xs font-bold"
                >
                  <option value="scooter">{lang === "ar" ? "موتوسيكل / سكوتر 🛵" : "Scooter / Motorcycle"}</option>
                  <option value="van">{lang === "ar" ? "سيارة فان 🚐" : "Van / Car"}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground/80 mb-1">
                  {lang === "ar" ? "رقم اللوحة / الموتوسيكل" : "Plate Number"}
                </label>
                <Input
                  value={newDriver.plate}
                  onChange={(e) => setNewDriver({ ...newDriver, plate: e.target.value })}
                  placeholder="ط ن ح 1234"
                  className="h-11 rounded-xl"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                {lang === "ar" ? "المنطقة / القرية الأساسية للتوصيل" : "Assigned Zone"}
              </label>
              <select
                value={newDriver.zoneId}
                onChange={(e) => setNewDriver({ ...newDriver, zoneId: e.target.value })}
                className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-xs font-bold"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {lang === "ar" ? z.nameAr : z.nameEn} ({z.fee} ج.م)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-full text-xs font-bold"
                onClick={() => setAddOpen(false)}
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                type="submit"
                className="h-11 flex-1 rounded-full bg-[#184C8A] font-black text-white hover:bg-[#112D51] text-xs"
              >
                {lang === "ar" ? "حفظ وتفعيل المندوب" : "Save & Activate"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- zones — live delivery pricing editor ---------- */
function ZonesPanel() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const zoneDisabled = useBahbah((s) => s.zoneDisabled);
  const zoneEdits = useBahbah((s) => s.zoneEdits);
  const adminOrders = useBahbah((s) => s.adminOrders) || [];
  const { toggleZone, updateZoneEdit } = useBahbah();
  const zones = useZones();

  return (
    <div className="space-y-4">
      <AdminCard>
        <SectionTitle icon={<MapPin className="size-5 text-[#1E4E8F]" />} title={t("adm.zonesTitle")} />
        <p className="mt-1 text-xs font-semibold text-muted-foreground">{t("adm.zones.d")}</p>
      </AdminCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {zones.map((z, i) => {
          const on = !zoneDisabled.includes(z.id);
          const e = zoneEdits[z.id] ?? {};
          return (
            <AdminCard key={z.id} className={`p-4 ${on ? "" : "opacity-70"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-heading text-sm font-black">
                    <MapPin className="size-4 shrink-0 text-[#1E4E8F]" />
                    {lang === "ar" ? z.nameAr : z.nameEn}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {lang === "ar" ? z.areasAr : z.areasEn}
                  </p>
                </div>
                <Switch checked={on} onCheckedChange={async () => {
                  if (await toggleZone(z.id)) toast.success(t("misc.saved"));
                }} aria-label={t("adm.zoneOn")} />
              </div>

              {/* live pricing editor */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground">{t("adm.zones.fee")}</span>
                  <Input
                    type="number"
                    value={e.fee ?? ""}
                    onChange={(ev) => updateZoneEdit(z.id, { fee: ev.target.value === "" ? undefined : Number(ev.target.value) })}
                    placeholder={String(z.fee)}
                    className="h-9 rounded-lg text-center text-xs font-black"
                    dir="ltr"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground">{t("adm.zones.eta")}</span>
                  <Input
                    type="number"
                    value={e.etaMin ?? ""}
                    onChange={(ev) => updateZoneEdit(z.id, { etaMin: ev.target.value === "" ? undefined : Number(ev.target.value) })}
                    placeholder={String(z.etaMin)}
                    className="h-9 rounded-lg text-center text-xs font-black"
                    dir="ltr"
                  />
                </label>
              </div>
              <p className="mt-2 rounded-lg bg-[#FFF4E5] px-2.5 py-1.5 text-[10px] font-bold text-[#B45E0A]">
                {t("adm.freeGoalNote")}
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-2.5 text-center text-xs">
                <div>
                  <p className="font-heading text-sm font-black text-[#1E4E8F]">
                    {z.fee} {t("misc.currency")}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground">{t("adm.zoneFee")}</p>
                </div>
                <div>
                  <p className="font-heading text-sm font-black text-[#112D51]">
                    {z.etaMin} {t("dv.min")}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground">{t("adm.zoneEta")}</p>
                </div>
                <div>
                  <p className="font-heading text-sm font-black text-[#C56A0A]">
                    {adminOrders.filter((o) => o.delivery?.zoneId === z.id).length}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground">{t("adm.zoneOrders")}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <Badge
                  className={`rounded-full border-0 ${
                    on ? "bg-[#EAF6F1] text-[#2E9E6B]" : "bg-[#DC4B4B]/10 text-[#DC4B4B]"
                  }`}
                >
                  {on ? t("adm.zoneOn") : t("adm.zoneOff")}
                </Badge>
                <span className="text-[10px] font-bold text-[#2E9E6B]">
                  {t("misc.saved")} ✓
                </span>
              </div>
            </AdminCard>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- رسائل واتساب الجاهزة للمناديب (يعدّلها المدير) ---------- */
/* بتتخزن في admin_settings.courier_msg_templates وبتوصل لكل أجهزة
   المناديب والطاقم من get_public_settings — الحفظ ما بيأكّدش غير لو
   السيرفر كتب فعلًا (نفس قاعدة باقي الإعدادات) */
function CourierMsgTemplatesCard() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const templates = useBahbah((s) => s.courierMsgTemplates);
  const { saveCourierMsgTemplates } = useBahbah();
  const [draft, setDraft] = useState<string[]>(templates);
  const [saving, setSaving] = useState(false);

  /* أي تحديث جاي من السيرفر (أو من جهاز تاني) بيبقى هو الأساس للمسودة */
  useEffect(() => {
    setDraft(templates);
  }, [templates]);

  const save = async () => {
    setSaving(true);
    const ok = await saveCourierMsgTemplates(draft);
    setSaving(false);
    if (ok) toast.success(t("misc.saved"));
    /* عند الفشل الـ store بيرجّع آخر حالة مؤكدة وبيظهر تنبيه الفشل */
  };

  return (
    <AdminCard className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-heading text-sm font-black">
          <MessageCircle className="size-4 text-[#25D366]" />
          {lang === "ar" ? "رسائل واتساب جاهزة للمناديب" : "Ready WhatsApp messages for couriers"}
        </h3>
        <Button
          size="sm"
          disabled={saving}
          onClick={save}
          className="h-9 rounded-full bg-[#184C8A] px-4 text-xs font-black text-white hover:bg-[#112D51]"
        >
          <Save className="size-3.5" />
          {saving ? (lang === "ar" ? "بيحفظ…" : "Saving…") : lang === "ar" ? "حفظ الرسائل" : "Save messages"}
        </Button>
      </div>
      <p className="mt-1.5 text-[11px] font-bold leading-relaxed text-muted-foreground">
        {lang === "ar"
          ? "الرسائل دي بتظهر للمندوب والموظف في قايمة «تواصل» جنب رقم أي عميل — يدوس واحدة تتبعت على واتساب العميل على طول."
          : "These appear in the Contact menu next to any customer phone — one tap sends it to the customer's WhatsApp."}
      </p>
      <div className="mt-3 space-y-2">
        {draft.map((msg, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={msg}
              onChange={(e) => setDraft(draft.map((m, j) => (j === i ? e.target.value : m)))}
              className="h-10 flex-1 rounded-xl text-sm font-bold"
              maxLength={300}
            />
            <Button
              size="sm"
              variant="outline"
              aria-label={lang === "ar" ? "مسح الرسالة" : "Delete message"}
              className="h-10 w-10 shrink-0 rounded-xl border-[#DC4B4B]/40 p-0 text-[#DC4B4B] hover:bg-[#DC4B4B]/10 hover:text-[#DC4B4B]"
              onClick={() => setDraft(draft.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="h-9 rounded-full border-dashed px-4 text-xs font-bold"
          onClick={() => setDraft([...draft, ""])}
        >
          <Plus className="size-3.5" />
          {lang === "ar" ? "إضافة رسالة" : "Add message"}
        </Button>
      </div>
    </AdminCard>
  );
}
