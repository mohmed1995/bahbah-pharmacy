"use client";

import { useMemo } from "react";
import {
  Phone,
  MapPin,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  Navigation,
  Store,
  Wallet,
  ArrowRight,
  ArrowLeft,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminOrders as adminDemoOrders, driverById, BRANCH, PHARMACY, type Order } from "@/lib/bahbah/data";
import { useBahbah, useT, type DictKey } from "@/lib/bahbah/store";
import { fmtPrice } from "./product-card";
import { KpiCard } from "./admin-ui";
import { IconScooter, IconPin } from "./icons";

/* ------------------------------------------------------------------ */
/* Courier portal — المندوب يلاقي الطلبات والعناوين وحدّث الحالة        */
/* ------------------------------------------------------------------ */

const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export default function CourierPortal() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const user = useBahbah((s) => s.user);
  const adminOrders = useBahbah((s) => s.adminOrders);
  const driverStatus = useBahbah((s) => s.driverStatus);
  const { go, courierPickup, courierDeliver, cycleDriverStatus } = useBahbah();

  const myDriverId = user?.driverId ?? "dr-1";
  const driver = driverById(myDriverId);
  const orders = adminOrders ?? adminDemoOrders;

  const mine = useMemo(
    () => orders.filter((o) => o.delivery?.driverId === myDriverId && o.status !== "cancelled"),
    [orders, myDriverId]
  );
  const active = mine.filter((o) => o.status === "pending" || o.status === "shipping");
  const doneToday = mine.filter((o) => o.status === "delivered");
  const codTotal = active.reduce((s, o) => (o.payment === "cod" ? s + o.total : s), 0);
  const earnings = doneToday.length * 15;

  const myStatus = driverStatus[myDriverId] ?? driver?.status ?? "available";

  /* ---- not signed in / wrong role ---- */
  if (!user || user.role !== "courier") return <StaffGate role="courier" />;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-5 md:px-6 md:pb-12">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#1E4E8F] text-white shadow-md">
            <IconScooter className="size-6" />
          </span>
          <div>
            <h1 className="font-heading text-xl font-black md:text-2xl">{t("cour.title")}</h1>
            <p className="text-xs font-bold text-muted-foreground md:text-sm">{t("cour.sub")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={`cursor-pointer gap-1.5 rounded-full border-0 px-3.5 py-1.5 ${
              myStatus === "available"
                ? "bg-[#EAF6F1] text-[#2E9E6B]"
                : myStatus === "busy"
                  ? "bg-[#FFF4E5] text-[#B45E0A]"
                  : "bg-muted text-muted-foreground"
            }`}
            onClick={() => cycleDriverStatus(myDriverId)}
          >
            <span className="size-2 rounded-full bg-current" />
            {myStatus === "available" ? t("adm.available") : myStatus === "busy" ? t("adm.busy") : t("adm.offline")}
          </Badge>
          <Button variant="outline" size="sm" className="rounded-full font-bold" onClick={() => go("home")}>
            <ArrowRight className="size-4 rtl:inline ltr:hidden" />
            <ArrowLeft className="size-4 ltr:inline rtl:hidden" />
            {t("admin.back")}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={<Package className="size-5" />} tint="bg-[#EAF1F9]" color="text-[#1E4E8F]" value={String(active.length)} label={t("cour.today")} />
        <KpiCard icon={<Truck className="size-5" />} tint="bg-[#FFF4E5]" color="text-[#B45E0A]" value={String(mine.filter((o) => o.status === "shipping").length)} label={t("cour.onWay")} />
        <KpiCard icon={<CheckCircle2 className="size-5" />} tint="bg-[#EAF6F1]" color="text-[#2E9E6B]" value={String(doneToday.length)} label={t("cour.delivered")} />
        <KpiCard icon={<Wallet className="size-5" />} tint="bg-[#1E4E8F]/10" color="text-[#1E4E8F]" value={fmtPrice(earnings, t)} label={t("cour.earnToday")} />
      </div>

      {/* COD banner + branch pickup point */}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-[#F09428]/30 bg-[#FFF4E5]/70 p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#F09428] text-white">
            <Wallet className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#8a5410]">{t("cour.cod")}</p>
            <p className="font-heading text-xl font-black text-[#B45E0A]">{fmtPrice(codTotal, t)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#EAF6F1] text-[#2E9E6B]">
            <Store className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-muted-foreground">{t("cour.branch")}</p>
            <p className="truncate text-sm font-black">{lang === "ar" ? BRANCH.addressAr : BRANCH.addressEn}</p>
          </div>
          <a
            href={mapsUrl(`${PHARMACY.addressFullAr}`)}
            target="_blank"
            rel="noreferrer"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-[#EAF1F9] text-[#1E4E8F] transition hover:bg-[#dce8f5]"
            aria-label={t("cour.map")}
          >
            <Navigation className="size-4" />
          </a>
        </div>
      </div>

      {/* shipments */}
      <h2 className="mt-7 flex items-center gap-2 font-heading text-lg font-black">
        <IconPin className="size-5 text-[#1E4E8F]" />
        {t("cour.today")} ({active.length})
      </h2>

      {active.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-muted/40 p-10 text-center">
          <Package className="size-10 text-muted-foreground/60" />
          <p className="max-w-sm text-sm font-bold text-muted-foreground">{t("cour.none")}</p>
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          {active.map((o) => (
            <ShipmentCard
              key={o.id}
              o={o}
              onPickup={() => courierPickup(o.id)}
              onDeliver={() => courierDeliver(o.id)}
            />
          ))}
        </div>
      )}

      {/* delivered history */}
      {doneToday.length > 0 && (
        <>
          <h2 className="mt-7 font-heading text-base font-black text-muted-foreground">
            {t("cour.delivered")} ({doneToday.length})
          </h2>
          <div className="mt-3 space-y-2">
            {doneToday.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <CheckCircle2 className="size-4 shrink-0 text-[#2E9E6B]" />
                  <span className="font-heading text-sm font-black text-[#1E4E8F]">{o.id}</span>
                  <span className="truncate text-xs font-bold text-muted-foreground">
                    {lang === "ar" ? o.customerAr : o.customerEn}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-black text-[#2E9E6B]">{fmtPrice(o.total, t)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* One shipment card — everything the courier needs on the road        */
/* ------------------------------------------------------------------ */
function ShipmentCard({
  o,
  onPickup,
  onDeliver,
}: {
  o: Order;
  onPickup: () => void;
  onDeliver: () => void;
}) {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const zoneAr = o.delivery?.zoneNameAr;
  const zoneEn = o.delivery?.zoneNameEn;
  const isCod = o.payment === "cod";

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
      {/* head */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="font-heading text-base font-black text-[#1E4E8F]">{o.id}</span>
          {o.status === "pending" ? (
            <Badge className="gap-1 rounded-full border-0 bg-[#FFF4E5] text-[#B45E0A]">
              <Clock className="size-3" />
              {t("admin.stPending")}
            </Badge>
          ) : (
            <Badge className="gap-1 rounded-full border-0 bg-[#EAF1F9] text-[#1E4E8F]">
              <Truck className="size-3" />
              {t("admin.stShipping")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
          {zoneAr && (
            <Badge variant="outline" className="rounded-full font-bold">
              {t("cour.zoneTag")}: {lang === "ar" ? zoneAr : zoneEn}
            </Badge>
          )}
          <Badge variant="outline" className="rounded-full font-bold">
            {t("cour.slotTag")}: {lang === "ar" ? o.delivery?.slotAr ?? "—" : o.delivery?.slotEn ?? "—"}
          </Badge>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {/* customer + phone */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-[#EAF1F9] font-heading font-black text-[#1E4E8F]">
              {(lang === "ar" ? o.customerAr : o.customerEn).charAt(0)}
            </span>
            <div>
              <p className="text-sm font-black">{lang === "ar" ? o.customerAr : o.customerEn}</p>
              <p dir="ltr" className="text-xs font-bold text-muted-foreground">{o.phone}</p>
            </div>
          </div>
          <a
            href={`tel:${o.phone.replace(/\s/g, "")}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#2E9E6B] px-4 text-xs font-black text-white transition hover:brightness-105"
          >
            <Phone className="size-3.5" />
            {t("cour.callCust")}
          </a>
        </div>

        {/* address + map */}
        <div className="flex items-start gap-3 rounded-2xl bg-muted/50 p-3.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-[#DC4B4B]" />
          <p className="flex-1 text-sm font-bold leading-relaxed">{o.address}</p>
          <a
            href={mapsUrl(o.address)}
            target="_blank"
            rel="noreferrer"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-[#1E4E8F] shadow-sm ring-1 ring-black/5 transition hover:bg-[#EAF1F9]"
            aria-label={t("cour.map")}
          >
            <Navigation className="size-4" />
          </a>
        </div>

        {/* items */}
        <div>
          <p className="mb-1.5 text-[11px] font-bold text-muted-foreground">{t("cour.items")}</p>
          <div className="space-y-1">
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
        </div>

        {/* total + action */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <div>
            <Badge className={`rounded-full border-0 ${isCod ? "bg-[#F09428] text-white" : "bg-[#EAF6F1] text-[#2E9E6B]"}`}>
              {isCod ? t("cour.payCod") : t("cour.payPaid")}
            </Badge>
            <p className="mt-1.5 font-heading text-xl font-black text-[#1E4E8F]">{fmtPrice(o.total, t)}</p>
          </div>
          {o.status === "pending" ? (
            <Button className="h-12 rounded-full px-6 font-black" onClick={onPickup}>
              <Package className="size-4" />
              {t("cour.pickup")}
            </Button>
          ) : (
            <Button className="h-12 rounded-full bg-[#2E9E6B] px-6 font-black text-white hover:bg-[#278a5e]" onClick={onDeliver}>
              <CheckCircle2 className="size-4" />
              {t("cour.deliverBtn")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared gate — shown when the portal is opened without the right role */
/* ------------------------------------------------------------------ */
export function StaffGate({ role }: { role: "courier" | "pharmacist" | "admin" }) {
  const t = useT();
  const { go } = useBahbah();

  const portalKey: DictKey = role === "courier" ? "port.courier" : role === "pharmacist" ? "port.pharmacist" : "port.admin";
  const quickKey: DictKey = role === "courier" ? "auth.quickCourier" : role === "pharmacist" ? "auth.quickPharmacist" : "auth.quickAdmin";
  const email = role === "courier" ? "courier@bahbah.eg" : role === "pharmacist" ? "pharmacist@bahbah.eg" : "admin@bahbah.eg";

  const loginAsStaff = () => {
    useBahbah.getState().login({
      name:
        role === "courier"
          ? "محمود سيد — مندوب واصلي"
          : role === "pharmacist"
            ? "د. سارة إبراهيم — صيدلية بحبح"
            : "إدارة صيدلية بحبح",
      email,
      role,
      driverId: role === "courier" ? "dr-1" : undefined,
    });
    go(role);
  };

  return (
    <main className="flex flex-col items-center justify-center gap-5 px-4 py-24 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-[#EAF1F9]">
        <LogIn className="size-9 text-[#1E4E8F]" />
      </span>
      <div>
        <h1 className="font-heading text-xl font-black md:text-2xl">{t(portalKey)}</h1>
        <p className="mt-1.5 max-w-sm text-sm font-bold text-muted-foreground">{t("port.forbidden")}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="lg" className="rounded-full px-8 font-black" onClick={loginAsStaff}>
          {t(quickKey)}
        </Button>
        <Button size="lg" variant="outline" className="rounded-full px-8 font-bold" onClick={() => go("login")}>
          {t("auth.login")}
        </Button>
      </div>
      <p dir="ltr" className="text-xs font-bold text-muted-foreground">
        {email} · 123456
      </p>
    </main>
  );
}
