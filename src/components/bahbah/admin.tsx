"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ShoppingCart,
  Users,
  Settings as SettingsIcon,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Package,
  BarChart3,
  UserPlus,
  Wallet,
  Ticket,
  Megaphone,
  Wrench,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LockKeyhole, LogOut } from "lucide-react";
import {
  categories,
  salesData,
  weeklyData,
  driverById,
  carePlans,
} from "@/lib/bahbah/data";
import {
  useBahbah,
  useT,
  useAdminProducts,
  DEFAULT_ADMIN_PASS,
  type AdminSection,
} from "@/lib/bahbah/store";
import { fmtPrice } from "./product-card";
import {
  IconChartUp,
  IconCapsule,
  IconBoxes,
  IconScooter,
  IconStorefront,
  IconRxClipboard,
  IconRefill,
  IconPhone,
} from "./icons";
import {
  AdminCard,
  SectionTitle,
  StatusBadge,
  KpiCard,
  PIE_COLORS,
  daysUntil,
} from "./admin-ui";
import { OrdersSection, ProductsSection, InventorySection } from "./admin-ops";
import { DeliverySection } from "./admin-delivery";
import { CustomersSection, ReportsSection } from "./admin-insights";
import { PrescriptionsSection } from "./admin-rx";
import { CouponsSection, AdsSection, CareAdminSection, MaintenanceSection } from "./admin-extra";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Admin password gate — dedicated password-protected entry            */
/* ------------------------------------------------------------------ */
export function AdminGate() {
  const t = useT();
  const adminPass = useBahbah((s) => s.adminPass);
  const [pass, setPass] = useState("");
  const [wrong, setWrong] = useState(false);

  const submit = () => {
    if (useBahbah.getState().unlockAdmin(pass)) {
      toast.success(t("adm.gate.btn") + " ✓");
    } else {
      setWrong(true);
      toast.error(t("adm.gate.wrong"));
    }
  };

  return (
    <main className="bb-hero-band flex min-h-screen flex-col items-center justify-center px-4 text-white">
      <div className="bb-glow pointer-events-none absolute top-1/4 start-[15%] size-64 rounded-full bg-[#1E4E8F]/70 blur-3xl" />
      <div className="bb-glow pointer-events-none absolute bottom-1/4 end-[10%] size-72 rounded-full bg-[#F09428]/25 blur-3xl" style={{ animationDelay: "1.4s" }} />

      <div className="relative w-full max-w-sm">
        <button
          className="mb-6 flex items-center gap-1.5 text-xs font-bold text-white/60 transition hover:text-white"
          onClick={() => useBahbah.setState({ view: "home" })}
        >
          <ArrowRight className="size-4 rtl:inline ltr:hidden" />
          <ArrowLeft className="size-4 ltr:inline rtl:hidden" />
          {t("admin.back")}
        </button>

        <div className="rounded-3xl border border-white/15 bg-white/10 p-7 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center text-center">
            <span className="bb-ring grid size-16 place-items-center rounded-full bg-[#F09428] text-white shadow-xl">
              <LockKeyhole className="size-8" />
            </span>
            <h1 className="mt-4 font-heading text-xl font-black">{t("adm.gate.title")}</h1>
            <p className="mt-1.5 text-xs leading-relaxed text-white/70">{t("adm.gate.sub")}</p>
          </div>

          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Input
              type="password"
              inputMode="numeric"
              value={pass}
              onChange={(e) => {
                setPass(e.target.value);
                setWrong(false);
              }}
              placeholder={t("adm.gate.ph")}
              dir="ltr"
              autoFocus
              className={`h-12 rounded-xl border-white/20 bg-white/90 text-center text-lg font-black tracking-[0.35em] text-[#112D51] placeholder:tracking-normal placeholder:font-bold placeholder:text-muted-foreground ${
                wrong ? "border-[#DC4B4B] ring-2 ring-[#DC4B4B]/40" : ""
              }`}
            />
            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-[#F09428] text-base font-black text-white shadow-lg hover:bg-[#e08317]"
            >
              {t("adm.gate.btn")}
            </Button>
          </form>

          {adminPass === DEFAULT_ADMIN_PASS && (
            <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-center text-[11px] font-bold text-white/75">
              {t("adm.gate.hint")}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Admin shell — sidebar (desktop) + chips (mobile) + 8 sections       */
/* ------------------------------------------------------------------ */

export default function AdminView() {
  const t = useT();
  const section = useBahbah((s) => s.adminSection);
  const setSection = useBahbah((s) => s.setAdminSection);
  const rxQueue = useBahbah((s) => s.rxQueue);
  const rxNew = rxQueue.filter((r) => r.status === "new").length;
  const back = () => useBahbah.setState({ view: "home" });
  const lock = () => {
    useBahbah.getState().lockAdmin();
    useBahbah.setState({ view: "home" });
    toast.success(t("adm.gate.locked"));
  };

  const nav: { key: AdminSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "overview", label: t("admin.overview"), icon: IconChartUp },
    { key: "orders", label: t("admin.orders"), icon: ShoppingCart },
    { key: "prescriptions", label: t("adm.rx.title"), icon: IconRxClipboard },
    { key: "products", label: t("admin.products"), icon: IconCapsule },
    { key: "inventory", label: t("adm.inventory"), icon: IconBoxes },
    { key: "delivery", label: t("adm.delivery"), icon: IconScooter },
    { key: "care", label: t("adm.care"), icon: IconRefill },
    { key: "coupons", label: t("adm.coupons"), icon: Ticket },
    { key: "ads", label: t("adm.ads"), icon: Megaphone },
    { key: "customers", label: t("admin.customers"), icon: Users },
    { key: "reports", label: t("adm.reports"), icon: BarChart3 },
    { key: "maintenance", label: t("adm.maintenance"), icon: Wrench },
    { key: "settings", label: t("adm.settings"), icon: SettingsIcon },
  ];

  const current = nav.find((n) => n.key === section) ?? nav[0];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-[1400px]">
        {/* ---------- desktop sidebar ---------- */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-e border-border bg-card p-4 lg:flex">
          <button className="flex items-center gap-2.5 px-1 py-2" onClick={back}>
            <Image
              src="/images/bahbah-badge.png"
              alt="Bahbah Pharmacy"
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="text-start leading-tight">
              <span className="block font-heading text-sm font-black text-[#112D51]">
                {t("brand.name")}
              </span>
              <span className="block text-[10px] font-bold text-[#F09428]">
                {t("admin.title")}
              </span>
            </span>
          </button>

          <nav className="nice-scrollbar mt-4 flex-1 space-y-1 overflow-y-auto">
            {nav.map((n) => {
              const active = n.key === section;
              return (
                <button
                  key={n.key}
                  onClick={() => setSection(n.key)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    active
                      ? "bg-[#1E4E8F] text-white shadow-md shadow-[#1E4E8F]/25"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <n.icon className="size-4.5" />
                  {n.label}
                  {n.key === "prescriptions" && rxNew > 0 && (
                    <span className="ms-auto grid size-5 place-items-center rounded-full bg-[#F09428] text-[10px] font-black text-white">
                      {rxNew}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="space-y-2 border-t border-border pt-3">
            <Button
              variant="outline"
              className="w-full rounded-full text-xs font-bold"
              onClick={back}
            >
              <ArrowRight className="size-4 rtl:inline ltr:hidden" />
              <ArrowLeft className="size-4 ltr:inline rtl:hidden" />
              {t("admin.back")}
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-full border-[#DC4B4B]/40 text-xs font-bold text-[#DC4B4B] hover:bg-[#DC4B4B]/10 hover:text-[#DC4B4B]"
              onClick={lock}
            >
              <LogOut className="size-4" />
              {t("adm.lock")}
            </Button>
            <p className="text-center text-[10px] font-bold text-muted-foreground">
              {t("admin.accessNote")}
            </p>
          </div>
        </aside>

        {/* ---------- content ---------- */}
        <div className="min-w-0 flex-1 pb-16 lg:pb-0">
          {/* mobile header + chips */}
          <div className="hero-pattern text-white lg:hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-4">
              <div className="flex items-center gap-3">
                <Image
                  src="/images/bahbah-badge.png"
                  alt="Bahbah Pharmacy"
                  width={38}
                  height={38}
                  className="rounded-full"
                />
                <div>
                  <h1 className="font-heading text-lg font-black">{t("admin.title")}</h1>
                  <p className="text-[10px] text-white/60">{t("admin.accessNote")}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-white/30 bg-white/10 px-3 font-bold text-white hover:bg-white/20 hover:text-white"
                onClick={back}
              >
                <ArrowRight className="size-4 rtl:inline ltr:hidden" />
                <ArrowLeft className="size-4 ltr:inline rtl:hidden" />
                {t("admin.back")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-[#DC4B4B]/50 bg-[#DC4B4B]/20 px-3 font-bold text-white hover:bg-[#DC4B4B]/40 hover:text-white"
                onClick={lock}
              >
                <LogOut className="size-4" />
                {t("adm.lock")}
              </Button>
            </div>
            <div className="nice-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-3">
              {nav.map((n) => {
                const active = n.key === section;
                return (
                  <button
                    key={n.key}
                    onClick={() => setSection(n.key)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition ${
                      active
                        ? "bg-[#F09428] text-white"
                        : "bg-white/10 text-white/80 hover:bg-white/20"
                    }`}
                  >
                    <n.icon className="size-4" />
                    {n.label}
                    {n.key === "prescriptions" && rxNew > 0 && (
                      <span className="grid size-4.5 place-items-center rounded-full bg-white text-[9px] font-black text-[#F09428]">
                        {rxNew}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* desktop section header */}
          <div className="hidden items-center justify-between gap-3 px-6 pt-6 lg:flex">
            <h1 className="flex items-center gap-2.5 font-heading text-2xl font-black">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#1E4E8F] text-white">
                <current.icon className="size-5.5" />
              </span>
              {current.label}
            </h1>
            <Badge className="gap-1 rounded-full bg-[#EAF6F1] px-3 py-1.5 text-[10px] font-black text-[#2E9E6B] hover:bg-[#EAF6F1]">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#2E9E6B] opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-[#2E9E6B]" />
              </span>
              {t("track.live")}
            </Badge>
          </div>

          <div className="px-4 pt-5 md:px-6">
            {section === "overview" && <OverviewSection />}
            {section === "orders" && <OrdersSection />}
            {section === "prescriptions" && <PrescriptionsSection />}
            {section === "products" && <ProductsSection />}
            {section === "inventory" && <InventorySection />}
            {section === "delivery" && <DeliverySection />}
            {section === "care" && <CareAdminSection />}
            {section === "coupons" && <CouponsSection />}
            {section === "ads" && <AdsSection />}
            {section === "customers" && <CustomersSection />}
            {section === "reports" && <ReportsSection />}
            {section === "maintenance" && <MaintenanceSection />}
            {section === "settings" && <SettingsSection />}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ================================================================== */
/* OVERVIEW                                                            */
/* ================================================================== */
function OverviewSection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const products = useAdminProducts();
  const adminOrders = useBahbah((s) => s.adminOrders);
  const setSection = useBahbah((s) => s.setAdminSection);
  const orders = adminOrders ?? [];

  const totalSales = salesData.reduce((s, m) => s + m.revenue, 0);
  const monthOrders = salesData[salesData.length - 1].orders;
  const avgBasket = Math.round(totalSales / salesData.reduce((s, m) => s + m.orders, 0));

  const chartData = salesData.map((m) => ({
    name: lang === "ar" ? m.monthAr : m.monthEn,
    revenue: m.revenue,
  }));
  const weekly = weeklyData.map((d) => ({
    name: lang === "ar" ? d.dayAr : d.dayEn,
    orders: d.orders,
  }));

  const lowCount = products.filter((p) => p.stock < 30).length;
  const expiringCount = products.filter((p) => {
    const d = daysUntil(p.expiry);
    return d >= 0 && d < 120;
  }).length;

  const kpis = [
    { icon: <Wallet className="size-5" />, tint: "bg-[#EAF1F9]", color: "text-[#1E4E8F]", value: fmtPrice(12400, t), label: t("adm.revToday"), sub: "+12%" },
    { icon: <ShoppingCart className="size-5" />, tint: "bg-[#FFF4E5]", color: "text-[#C56A0A]", value: "49", label: t("adm.ordersToday"), sub: "+8%" },
    { icon: <IconScooter className="size-5" />, tint: "bg-[#EAF6F1]", color: "text-[#2E9E6B]", value: "41", label: t("adm.kpiDeliveries") },
    { icon: <UserPlus className="size-5" />, tint: "bg-[#EEF0F7]", color: "text-[#112D51]", value: "128", label: t("adm.newThisMonth") },
    { icon: <Package className="size-5" />, tint: "bg-[#F09428]/15", color: "text-[#B45E0A]", value: String(lowCount), label: t("adm.invLow") },
    { icon: <AlertTriangle className="size-5" />, tint: "bg-[#DC4B4B]/10", color: "text-[#DC4B4B]", value: String(expiringCount), label: t("adm.invExpiring") },
  ];

  /* category revenue share (donut) */
  const catShare = useMemo(
    () =>
      categories.map((c, i) => ({
        name: lang === "ar" ? c.nameAr : c.nameEn,
        value: products.filter((p) => p.category === c.id).length * 780 + (6 - i) * 320,
        color: PIE_COLORS[i % PIE_COLORS.length],
      })),
    [lang, products]
  );

  const alerts = products.filter((p) => p.stock < 30 || daysUntil(p.expiry) < 120);
  const recent = orders.slice(0, 6);

  return (
    <div className="space-y-4">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* revenue chart */}
        <AdminCard className="lg:col-span-3">
          <SectionTitle
            icon={<IconChartUp className="size-5 text-[#1E4E8F]" />}
            title={t("admin.chart")}
          />
          <div className="mt-3 h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1E4E8F" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1E4E8F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#5B6B7F" }} />
                <YAxis tick={{ fontSize: 10, fill: "#5B6B7F" }} tickFormatter={(v: number) => `${v / 1000}k`} />
                <Tooltip
                  formatter={(v) => [`${Number(v).toLocaleString("en-US")} ${t("misc.egp")}`, t("admin.kpi1")]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontFamily: "inherit" }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1E4E8F"
                  strokeWidth={2.5}
                  fill="url(#rev)"
                  activeDot={{ r: 5, fill: "#F09428" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        {/* alerts */}
        <AdminCard className="lg:col-span-2">
          <SectionTitle
            icon={<AlertTriangle className="size-5 text-[#F09428]" />}
            title={t("admin.alerts")}
            action={
              <button
                onClick={() => setSection("inventory")}
                className="shrink-0 text-xs font-bold text-[#1E4E8F] hover:underline"
              >
                {t("misc.viewAll")}
              </button>
            }
          />
          <div className="nice-scrollbar mt-3 max-h-72 space-y-2.5 overflow-y-auto pe-1">
            {alerts.slice(0, 8).map((p) => {
              const low = p.stock < 30;
              const d = daysUntil(p.expiry);
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
                    <p.icon className="size-4.5 text-[#1E4E8F]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{lang === "ar" ? p.nameAr : p.nameEn}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {low && (
                        <Badge className="rounded-full border-0 bg-[#DC4B4B]/10 text-[#DC4B4B]">
                          {t("admin.lowStock")}: {p.stock}
                        </Badge>
                      )}
                      <Badge
                        className={`rounded-full border-0 ${
                          d < 0 ? "bg-[#DC4B4B]/10 text-[#DC4B4B]" : "bg-[#FFF4E5] text-[#B45E0A]"
                        }`}
                      >
                        {d < 0
                          ? t("admin.expired")
                          : `${t("admin.expiring")} — ${d} ${lang === "ar" ? "يوم" : "days"}`}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </AdminCard>

        {/* weekly orders */}
        <AdminCard className="lg:col-span-2">
          <SectionTitle
            icon={<IconBoxes className="size-5 text-[#112D51]" />}
            title={t("adm.weekly")}
          />
          <div className="mt-3 h-60" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#5B6B7F" }} />
                <YAxis tick={{ fontSize: 10, fill: "#5B6B7F" }} />
                <Tooltip
                  formatter={(v) => [Number(v).toLocaleString("en-US"), t("admin.chartOrders")]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontFamily: "inherit", fontSize: 12 }}
                />
                <Bar dataKey="orders" fill="#F09428" radius={[6, 6, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        {/* category donut */}
        <AdminCard className="lg:col-span-3">
          <SectionTitle
            icon={<IconStorefront className="size-5 text-[#1E4E8F]" />}
            title={t("admin.chartCats")}
          />
          <div className="mt-2 h-60" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={catShare}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  stroke="none"
                >
                  {catShare.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [`${Number(v).toLocaleString("en-US")} ${t("misc.egp")}`, ""]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontFamily: "inherit", fontSize: 12 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: 11,
                    fontFamily: "inherit",
                    direction: lang === "ar" ? "rtl" : "ltr",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        {/* recent orders */}
        <AdminCard className="lg:col-span-5">
          <SectionTitle
            icon={<ShoppingCart className="size-5 text-[#1E4E8F]" />}
            title={t("adm.recent")}
            action={
              <button
                onClick={() => setSection("orders")}
                className="shrink-0 text-xs font-bold text-[#1E4E8F] hover:underline"
              >
                {t("misc.viewAll")}
              </button>
            }
          />
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {recent.map((o) => {
              const driver = driverById(o.delivery?.driverId);
              return (
                <div key={o.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EAF1F9] text-[#1E4E8F]">
                    {o.delivery?.type === "pickup" ? (
                      <IconStorefront className="size-5" />
                    ) : (
                      <IconScooter className="size-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-black text-[#1E4E8F]">
                      {o.id}
                      <span className="truncate text-xs font-bold text-foreground/75">
                        {lang === "ar" ? o.customerAr : o.customerEn}
                      </span>
                    </p>
                    <p className="text-[11px] font-bold text-muted-foreground">
                      {fmtPrice(o.total, t)}
                      {driver && ` · ${lang === "ar" ? driver.nameAr : driver.nameEn}`}
                    </p>
                  </div>
                  <StatusBadge status={o.status} t={t} />
                </div>
              );
            })}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

/* ================================================================== */
/* SETTINGS                                                            */
/* ================================================================== */
function SettingsSection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const settings = useBahbah((s) => s.settings);
  const siteEdits = useBahbah((s) => s.siteEdits);
  const careEdits = useBahbah((s) => s.careEdits);
  const { updateSettings, updateSiteEdits, updateCareEdit, setAdminPass, resetAdminDemo } =
    useBahbah();
  const [newPass, setNewPass] = useState("");

  return (
    <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
      {/* store info */}
      <AdminCard>
        <SectionTitle
          icon={<IconStorefront className="size-5 text-[#1E4E8F]" />}
          title={t("adm.stInfo")}
        />
        <div className="mt-4 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground/75">{t("adm.stHotline")}</span>
            <Input
              value={settings.hotline}
              onChange={(e) => updateSettings({ hotline: e.target.value })}
              className="h-11 rounded-xl"
              dir="ltr"
            />
          </label>
          <div className="flex items-center justify-between rounded-xl border border-border/60 p-3.5">
            <span className="text-sm font-bold">{t("adm.stOpen")}</span>
            <Switch
              checked={settings.openNow}
              onCheckedChange={(v) => updateSettings({ openNow: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/60 p-3.5">
            <span className="text-sm font-bold">{t("adm.stAccept")}</span>
            <Switch
              checked={settings.acceptOrders}
              onCheckedChange={(v) => updateSettings({ acceptOrders: v })}
            />
          </div>
          <p className="rounded-xl bg-[#EAF6F1] px-3.5 py-2.5 text-xs font-bold text-[#2E9E6B]">
            {settings.openNow && settings.acceptOrders
              ? "— " + t("adm.stOpen") + " · " + t("adm.stAccept")
              : t("admin.accessNote")}
          </p>
        </div>
      </AdminCard>

      {/* delivery settings */}
      <AdminCard>
        <SectionTitle
          icon={<IconScooter className="size-5 text-[#C56A0A]" />}
          title={t("adm.delivery")}
        />
        <div className="mt-4 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground/75">{t("adm.stFree")}</span>
            <Input
              type="number"
              value={settings.freeThreshold}
              onChange={(e) => updateSettings({ freeThreshold: Number(e.target.value) || 0 })}
              className="h-11 rounded-xl"
              dir="ltr"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground/75">{t("adm.stFee")}</span>
            <Input
              type="number"
              value={settings.defaultFee}
              onChange={(e) => updateSettings({ defaultFee: Number(e.target.value) || 0 })}
              className="h-11 rounded-xl"
              dir="ltr"
            />
          </label>
          <Button
            className="h-11 w-full rounded-full font-bold"
            onClick={() => toast.success(t("misc.saved"))}
          >
            {t("misc.save")}
          </Button>
        </div>
      </AdminCard>

      {/* contact info & address — live everywhere */}
      <AdminCard className="lg:col-span-2">
        <SectionTitle
          icon={<IconPhone className="size-5 text-[#2E9E6B]" />}
          title={t("adm.contact.title")}
        />
        <p className="mt-1 text-xs font-semibold text-muted-foreground">{t("adm.contact.d")}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground/75">{t("adm.contact.phone1")}</span>
            <Input
              value={siteEdits.phone1 ?? ""}
              onChange={(e) => updateSiteEdits({ phone1: e.target.value })}
              placeholder="+20 101 150 0166"
              className="h-11 rounded-xl"
              dir="ltr"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground/75">{t("adm.contact.phone2")}</span>
            <Input
              value={siteEdits.phone2 ?? ""}
              onChange={(e) => updateSiteEdits({ phone2: e.target.value })}
              placeholder="+20 155 253 3484"
              className="h-11 rounded-xl"
              dir="ltr"
            />
          </label>
          <label className="block space-y-1.5 md:col-span-2">
            <span className="text-xs font-bold text-foreground/75">{t("adm.contact.fb")}</span>
            <Input
              value={siteEdits.facebook ?? ""}
              onChange={(e) => updateSiteEdits({ facebook: e.target.value })}
              placeholder="https://facebook.com/…"
              className="h-11 rounded-xl"
              dir="ltr"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground/75">{t("adm.contact.addrAr")}</span>
            <Input
              value={siteEdits.addressFullAr ?? ""}
              onChange={(e) => updateSiteEdits({ addressFullAr: e.target.value })}
              placeholder={lang === "ar" ? "العنوان الكامل…" : "العنوان الكامل…"}
              className="h-11 rounded-xl"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground/75">{t("adm.contact.addrEn")}</span>
            <Input
              value={siteEdits.addressFullEn ?? ""}
              onChange={(e) => updateSiteEdits({ addressFullEn: e.target.value })}
              placeholder="Full address…"
              className="h-11 rounded-xl"
              dir="ltr"
            />
          </label>
        </div>
        <p className="mt-3 rounded-xl bg-[#EAF1F9] px-3.5 py-2.5 text-[11px] font-bold text-[#1E4E8F]">
          {t("misc.saved")} ✓
        </p>
      </AdminCard>

      {/* admin panel password */}
      <AdminCard>
        <SectionTitle
          icon={<LockKeyhole className="size-5 text-[#F09428]" />}
          title={t("adm.pass.title")}
        />
        <p className="mt-1 text-xs font-semibold text-muted-foreground">{t("adm.pass.d")}</p>
        <div className="mt-4 flex gap-2">
          <Input
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder={t("adm.pass.new")}
            className="h-11 flex-1 rounded-xl"
            dir="ltr"
          />
          <Button
            className="h-11 rounded-xl px-5 font-bold"
            onClick={() => {
              if (newPass.trim().length < 3) {
                toast.error(t("adm.gate.wrong"));
                return;
              }
              setAdminPass(newPass);
              setNewPass("");
              toast.success(t("adm.pass.ok"));
            }}
          >
            {t("adm.pass.save")}
          </Button>
        </div>
      </AdminCard>

      {/* monthly care plans editor */}
      <AdminCard>
        <SectionTitle
          icon={<IconRefill className="size-5 text-[#2E9E6B]" />}
          title={t("adm.carePlan.title")}
        />
        <p className="mt-1 text-xs font-semibold text-muted-foreground">{t("adm.carePlan.d")}</p>
        <div className="mt-4 space-y-4">
          {carePlans.map((plan) => {
            const e = careEdits[plan.id] ?? {};
            return (
              <div key={plan.id} className="rounded-2xl border border-border/60 p-3.5">
                <p className="mb-2.5 flex items-center gap-2 font-heading text-sm font-black">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: plan.color }} />
                  {lang === "ar" ? plan.nameAr : plan.nameEn}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {t("adm.carePlan.nameAr")}
                    </span>
                    <Input
                      value={e.nameAr ?? ""}
                      onChange={(ev) => updateCareEdit(plan.id, { nameAr: ev.target.value })}
                      placeholder={plan.nameAr}
                      className="h-9 rounded-lg text-xs"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {t("adm.carePlan.nameEn")}
                    </span>
                    <Input
                      value={e.nameEn ?? ""}
                      onChange={(ev) => updateCareEdit(plan.id, { nameEn: ev.target.value })}
                      placeholder={plan.nameEn}
                      className="h-9 rounded-lg text-xs"
                      dir="ltr"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {t("adm.carePlan.price")}
                    </span>
                    <Input
                      type="number"
                      value={e.price ?? ""}
                      onChange={(ev) =>
                        updateCareEdit(plan.id, {
                          price: ev.target.value === "" ? undefined : Number(ev.target.value),
                        })
                      }
                      placeholder={String(plan.price)}
                      className="h-9 rounded-lg text-xs"
                      dir="ltr"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {t("adm.carePlan.oldPrice")}
                    </span>
                    <Input
                      type="number"
                      value={e.oldPrice ?? ""}
                      onChange={(ev) =>
                        updateCareEdit(plan.id, {
                          oldPrice: ev.target.value === "" ? undefined : Number(ev.target.value),
                        })
                      }
                      placeholder={String(plan.oldPrice)}
                      className="h-9 rounded-lg text-xs"
                      dir="ltr"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </AdminCard>

      {/* reset */}
      <AdminCard className="border-[#DC4B4B]/30 lg:col-span-2">
        <SectionTitle
          icon={<AlertTriangle className="size-5 text-[#DC4B4B]" />}
          title={t("adm.stReset")}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t("adm.stResetD")}</p>
          <Button
            variant="outline"
            className="rounded-full border-[#DC4B4B]/40 px-5 text-sm font-bold text-[#DC4B4B] hover:bg-[#DC4B4B]/10 hover:text-[#DC4B4B]"
            onClick={() => {
              resetAdminDemo();
              toast.success(t("adm.stResetDone"));
            }}
          >
            {t("adm.stReset")}
          </Button>
        </div>
      </AdminCard>
    </div>
  );
}
