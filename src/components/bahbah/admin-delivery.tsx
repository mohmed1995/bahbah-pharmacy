"use client";

import { useMemo, useState } from "react";
import {
  Phone,
  Star,
  TrendingUp,
  Clock,
  BadgeCheck,
  Users,
  MapPin,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  drivers as demoDrivers,
  zoneById,
  type DriverStatus,
} from "@/lib/bahbah/data";
import { useBahbah, useT, useZones } from "@/lib/bahbah/store";
import { IconScooter, IconVan, IconStorefront, IconRoute, IconClockFast } from "./icons";
import { fmtPrice } from "./product-card";
import { AdminCard, SectionTitle, StatusBadge, KpiCard } from "./admin-ui";
import { toast } from "sonner";

/* ================================================================== */
/* DELIVERY — board / drivers / zones                                  */
/* ================================================================== */
export function DeliverySection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const [tab, setTab] = useState<"board" | "drivers" | "zones">("board");

  const tabs = [
    { key: "board", label: t("adm.board"), icon: <IconRoute className="size-4" /> },
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
  const driverStatus = useBahbah((s) => s.driverStatus);
  const { adminAdvance, adminAssignDriver, adminCancel } = useBahbah();
  const list = (orders ?? []).filter((o) => o.status === "pending" || o.status === "shipping");

  const available = demoDrivers.filter(
    (d) => (driverStatus[d.id] ?? d.status) === "available"
  ).length;

  const kpis = [
    { icon: <IconScooter className="size-5" />, tint: "bg-[#FFF4E5]", color: "text-[#C56A0A]", value: "41", label: t("adm.kpiDeliveries") },
    { icon: <IconClockFast className="size-5" />, tint: "bg-[#EAF1F9]", color: "text-[#1E4E8F]", value: "45", label: `${t("adm.kpiAvgTime")} (${t("dv.min")})` },
    { icon: <BadgeCheck className="size-5" />, tint: "bg-[#EAF6F1]", color: "text-[#2E9E6B]", value: "96%", label: t("adm.kpiOnTime") },
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
            const driver = demoDrivers.find((d) => d.id === o.delivery?.driverId);
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
                  <StatusBadge status={o.status} t={t} />
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
                    onChange={(e) => {
                      adminAssignDriver(o.id, e.target.value);
                      toast.success(t("misc.saved"));
                    }}
                    className="h-9 min-w-36 flex-1 rounded-full border border-input bg-transparent px-3 text-xs font-bold"
                    aria-label={t("adm.assign")}
                  >
                    <option value="" disabled>
                      {t("adm.assign")}
                    </option>
                    {demoDrivers.map((d) => (
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
                      onClick={() => {
                        adminAdvance(o.id);
                        toast.success(t("misc.saved"));
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
                      onClick={() => {
                        adminAdvance(o.id);
                        toast.success(t("misc.saved"));
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
                    onClick={() => {
                      adminCancel(o.id);
                      toast.success(t("misc.saved"));
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

/* ---------- drivers ---------- */
function DriversPanel() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const driverStatus = useBahbah((s) => s.driverStatus);
  const { cycleDriverStatus } = useBahbah();

  const statusMeta: Record<DriverStatus, { label: string; cls: string }> = useMemo(
    () => ({
      available: { label: t("adm.available"), cls: "bg-[#EAF6F1] text-[#2E9E6B]" },
      busy: { label: t("adm.busy"), cls: "bg-[#FFF4E5] text-[#B45E0A]" },
      offline: { label: t("adm.offline"), cls: "bg-muted text-muted-foreground" },
    }),
    [t]
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {demoDrivers.map((d) => {
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
                  {d.rating.toFixed(1)}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground">
                  {lang === "ar" ? "التقييم" : "Rating"}
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

            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-9 flex-1 rounded-full text-xs font-bold"
                onClick={() => {
                  cycleDriverStatus(d.id);
                  toast.success(t("misc.saved"));
                }}
              >
                {t("adm.changeStatus")}
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
  );
}

/* ---------- zones — live delivery pricing editor ---------- */
function ZonesPanel() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const zoneDisabled = useBahbah((s) => s.zoneDisabled);
  const zoneEdits = useBahbah((s) => s.zoneEdits);
  const { toggleZone, updateZoneEdit } = useBahbah();
  const zones = useZones();

  /* demo monthly orders per zone */
  const demoOrders = [312, 268, 205, 142, 96, 88, 74, 61, 55, 40];

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
                <Switch checked={on} onCheckedChange={() => {
                  toggleZone(z.id);
                  toast.success(t("misc.saved"));
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
                    {demoOrders[i % demoOrders.length]}
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
