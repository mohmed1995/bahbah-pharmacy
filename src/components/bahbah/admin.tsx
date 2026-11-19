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
  Volume2,
  Bell,
  Sparkles,
  ShieldCheck,
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
import { LockKeyhole, LogOut, ClipboardList, DatabaseBackup } from "lucide-react";
import {
  categories,
  salesData,
  weeklyData,
  driverById,
  carePlans,
  deliveryZones,
  DEFAULT_LOYALTY_TIERS,
  DEFAULT_LOYALTY_FREE_SHIP_QUOTA,
  type LoyaltyPerk,
  type LoyaltyTier,
} from "@/lib/bahbah/data";
import {
  useBahbah,
  useT,
  useAdminProducts,
  useDemoActive,
  playOrderChime,
  hasPermission,
  type AdminSection,
  type PermissionKey,
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
  IconSparkles,
  IconHeartPulse,
} from "./icons";
import {
  AdminCard,
  SectionTitle,
  StatusBadge,
  KpiCard,
  PIE_COLORS,
  daysUntil,
  DashboardSyncBar,
} from "./admin-ui";
import { OrdersSection, ProductsSection, InventorySection } from "./admin-ops";
import { DeliverySection } from "./admin-delivery";
import {
  CustomersSection,
  ReportsSection,
  DemoModeBanner,
  monthlySeriesFromOrders,
  weeklySeriesFromOrders,
  categoryShareFromOrders,
} from "./admin-insights";
import { PrescriptionsSection } from "./admin-rx";
import { StaffPermissionsSection } from "./admin-staff";
import { CollectionsSection } from "./admin-collections";
import { DailyReportSection } from "./admin-daily";
import { BackupArchiveSection } from "./admin-backup";
import { NursingPricesCard } from "./admin-nursing";
import { CouponsSection, AdsSection, CareAdminSection, VitalsAdminSection, MaintenanceSection } from "./admin-extra";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Admin password gate — dedicated password-protected entry            */
/* ------------------------------------------------------------------ */
export function AdminGate() {
  const t = useT();

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

          <Button
            type="button"
            className="mt-6 h-12 w-full rounded-xl bg-[#F09428] text-base font-black text-white shadow-lg hover:bg-[#e08317]"
            onClick={() => useBahbah.setState({ view: "login" })}
          >
            تسجيل الدخول بحساب إدارة مصرح
          </Button>
          <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-center text-[11px] font-bold text-white/75">
            لا توجد كلمة مرور عامة أو دخول مباشر. يلزم حساب إدارة موثق من Supabase.
          </p>
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
  const lang = useBahbah((s) => s.lang);
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

  const sessionRole = useBahbah((s) => s.sessionRole);
  const staffPermissions = useBahbah((s) => s.staffPermissions);
  const can = (k: PermissionKey) => hasPermission({ sessionRole, staffPermissions }, k);

  const allNav: {
    key: AdminSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    perm: PermissionKey;
  }[] = [
    { key: "overview", label: t("admin.overview"), icon: IconChartUp, perm: "finances" },
    { key: "orders", label: t("admin.orders"), icon: ShoppingCart, perm: "orders" },
    { key: "prescriptions", label: t("adm.rx.title"), icon: IconRxClipboard, perm: "prescriptions" },
    { key: "products", label: t("admin.products"), icon: IconCapsule, perm: "medicines" },
    { key: "inventory", label: t("adm.inventory"), icon: IconBoxes, perm: "medicines" },
    { key: "delivery", label: t("adm.delivery"), icon: IconScooter, perm: "orders" },
    { key: "collections", label: lang === "ar" ? "التوريد والتحصيل" : "Collections", icon: Wallet, perm: "finances" },
    { key: "care", label: t("adm.care"), icon: IconRefill, perm: "orders" },
    { key: "vitals", label: lang === "ar" ? "قياسات المرضى" : "Vitals", icon: IconHeartPulse, perm: "measurements" },
    { key: "coupons", label: t("adm.coupons"), icon: Ticket, perm: "settings" },
    { key: "ads", label: t("adm.ads"), icon: Megaphone, perm: "settings" },
    { key: "customers", label: t("admin.customers"), icon: Users, perm: "orders" },
    { key: "reports", label: t("adm.reports"), icon: BarChart3, perm: "finances" },
    { key: "daily", label: lang === "ar" ? "التقرير اليومي" : "Daily Report", icon: ClipboardList, perm: "finances" },
    { key: "backup", label: lang === "ar" ? "النسخ الاحتياطي والأرشفة" : "Backup & Archive", icon: DatabaseBackup, perm: "finances" },
    { key: "maintenance", label: t("adm.maintenance"), icon: Wrench, perm: "settings" },
    { key: "staff", label: lang === "ar" ? "الطاقم والصلاحيات" : "Staff & Permissions", icon: ShieldCheck, perm: "staff" },
    { key: "settings", label: t("adm.settings"), icon: SettingsIcon, perm: "settings" },
  ];
  /* أقسام اللوحة بتتفلتر بصلاحيات المدير الموزعة — من غير الصلاحية القسم
     مش بيظهر أصلًا ومش بيترندر (الأدمن عنده الكل دايمًا). */
  const nav = allNav.filter((n) => can(n.perm));

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
              className="rounded-full bg-white p-0.5 shadow-sm ring-1 ring-border"
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
                  className="rounded-full bg-white p-0.5 shadow-md ring-2 ring-white/60"
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

            {/* Audio Notification & Browser Alert Header Controls */}
            <div className="flex items-center gap-2.5">
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 rounded-full border-[#184C8A]/30 bg-[#EAF1F9]/50 px-3.5 text-xs font-black text-[#184C8A] hover:bg-[#EAF1F9]"
                onClick={() => {
                  playOrderChime();
                  toast.success("🔔 تم اختبار جرس التنبيه الصوتي بنجاح!");
                }}
              >
                <Volume2 className="size-3.5 text-[#184C8A]" />
                {lang === "ar" ? "تجربة جرس الطلبات 🔊" : "Test Audio Chime"}
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 rounded-full border-amber-300 bg-amber-50 px-3.5 text-xs font-black text-amber-800 hover:bg-amber-100"
                onClick={async () => {
                  if (typeof window !== "undefined" && "Notification" in window) {
                    const res = await Notification.requestPermission();
                    if (res === "granted") {
                      toast.success("تم تفعيل إشعارات المتصفح الفورية للطلبات بنجاح ✓");
                    } else {
                      toast.info("إذن الإشعارات: " + res);
                    }
                  } else {
                    toast.info(
                      lang === "ar"
                        ? "إشعارات المتصفح غير مدعومة على هذا الجهاز/المتصفح"
                        : "Browser notifications are not supported on this device/browser"
                    );
                  }
                }}
              >
                <Bell className="size-3.5 text-amber-600" />
                {lang === "ar" ? "تفعيل الإشعارات 🔔" : "Enable Alerts"}
              </Button>

              <Badge className="gap-1 rounded-full bg-[#EAF6F1] px-3 py-1.5 text-[10px] font-black text-[#2E9E6B] hover:bg-[#EAF6F1]">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#2E9E6B] opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#2E9E6B]" />
                </span>
                {t("track.live")}
              </Badge>
            </div>
          </div>

          <div className="px-4 pt-5 md:px-6">
            {section === "overview" && can("finances") && <OverviewSection />}
            {section === "orders" && <OrdersSection />}
            {section === "prescriptions" && <PrescriptionsSection />}
            {section === "products" && <ProductsSection />}
            {section === "inventory" && <InventorySection />}
            {section === "delivery" && <DeliverySection />}
            {section === "collections" && can("finances") && <CollectionsSection />}
            {section === "care" && <CareAdminSection />}
            {section === "vitals" && <VitalsAdminSection />}
            {section === "coupons" && <CouponsSection />}
            {section === "ads" && <AdsSection />}
            {section === "customers" && <CustomersSection />}
            {section === "reports" && can("finances") && <ReportsSection />}
            {section === "daily" && can("finances") && <DailyReportSection />}
            {section === "backup" && can("finances") && <BackupArchiveSection />}
            {section === "maintenance" && <MaintenanceSection />}
            {section === "staff" && can("staff") && <StaffPermissionsSection />}
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
  const demo = useDemoActive();
  const orders = adminOrders ?? [];

  const nonCancelled = orders.filter((o) => o.status !== "cancelled");
  const revTotal = nonCancelled.reduce((s, o) => s + o.total, 0);
  const ordersCount = orders.length;
  const deliveriesCount = orders.filter((o) => o.status === "delivered" || o.status === "shipping").length;
  const activeCustomers = new Set(orders.map((o) => o.phone || o.customerAr)).size;

  const lowCount = products.filter((p) => p.stock < 30).length;
  const expiringCount = products.filter((p) => {
    const d = daysUntil(p.expiry);
    return d >= 0 && d < 120;
  }).length;

  /* الرسوم من الطلبات الحقيقية — سلسلة المبيعات الجاهزة (salesData) كانت
     بتتعرض كأنها حقيقية. دلوقتي بتظهر بس في وضع العرض التجريبي الصريح */
  const chartData = demo
    ? salesData.map((m) => ({
        name: lang === "ar" ? m.monthAr : m.monthEn,
        revenue: ordersCount === 0 ? 0 : m.revenue,
      }))
    : monthlySeriesFromOrders(orders, lang);
  const weekly = demo
    ? weeklyData.map((d) => ({
        name: lang === "ar" ? d.dayAr : d.dayEn,
        orders: ordersCount === 0 ? 0 : d.orders,
      }))
    : weeklySeriesFromOrders(orders, lang);

  const kpis = [
    { icon: <Wallet className="size-5" />, tint: "bg-[#EAF1F9]", color: "text-[#1E4E8F]", value: fmtPrice(revTotal, t), label: t("adm.revToday") },
    { icon: <ShoppingCart className="size-5" />, tint: "bg-[#FFF4E5]", color: "text-[#C56A0A]", value: String(ordersCount), label: t("adm.ordersToday") },
    { icon: <IconScooter className="size-5" />, tint: "bg-[#EAF6F1]", color: "text-[#2E9E6B]", value: String(deliveriesCount), label: t("adm.kpiDeliveries") },
    { icon: <UserPlus className="size-5" />, tint: "bg-[#EEF0F7]", color: "text-[#112D51]", value: String(activeCustomers), label: t("adm.newThisMonth") },
    { icon: <Package className="size-5" />, tint: "bg-[#F09428]/15", color: "text-[#B45E0A]", value: String(lowCount), label: t("adm.invLow") },
    { icon: <AlertTriangle className="size-5" />, tint: "bg-[#DC4B4B]/10", color: "text-[#DC4B4B]", value: String(expiringCount), label: t("adm.invExpiring") },
  ];

  /* category revenue share (donut) — من بنود الطلبات الحقيقية.
     في وضع العرض بس بنرجع للمعادلة القديمة (عدد المنتجات × رقم ثابت) */
  const catShare = useMemo(
    () =>
      demo
        ? categories.map((c, i) => ({
            name: lang === "ar" ? c.nameAr : c.nameEn,
            value: products.filter((p) => p.category === c.id).length * 780 + (6 - i) * 320,
            color: PIE_COLORS[i % PIE_COLORS.length],
          }))
        : categoryShareFromOrders(orders, lang),
    [demo, lang, products, orders]
  );

  const alerts = products.filter((p) => p.stock < 30 || daysUntil(p.expiry) < 120);
  const recent = orders.slice(0, 6);

  return (
    <div className="space-y-4">
      {demo && <DemoModeBanner />}
      <DashboardSyncBar />
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

        {/* Quick Shortcuts for Ads & Monthly Medicine */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-2xl border border-[#F09428]/30 bg-[#FFF4E5] p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-[#F09428] text-white shadow-sm">
                <Megaphone className="size-5" />
              </span>
              <div>
                <p className="font-heading text-sm font-black text-[#B45E0A]">
                  إدارة الإعلانات والبنرات
                </p>
                <p className="text-xs text-[#B45E0A]/85">
                  تفعيل وإيقاف البنرات وتعديل العروض في الرئيسية
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="rounded-full bg-[#F09428] px-4 font-bold text-white shadow-sm hover:bg-[#D97706]"
              onClick={() => setSection("ads")}
            >
              فتح الإعلانات
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#2E9E6B]/30 bg-[#EAF6F1] p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-[#2E9E6B] text-white shadow-sm">
                <IconRefill className="size-5" />
              </span>
              <div>
                <p className="font-heading text-sm font-black text-[#166534]">
                  عملاء الأدوية الشهرية
                </p>
                <p className="text-xs text-[#166534]/85">
                  متابعة الروشتات، والتركيزات، وتكرار العلاج فوراً
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="rounded-full bg-[#2E9E6B] px-4 font-bold text-white shadow-sm hover:bg-[#15803D]"
              onClick={() => setSection("care")}
            >
              فتح العملاء
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* SETTINGS                                                            */
/* ================================================================== */
/* ------------------------------------------------------------------ */
/* إعدادات نقاط الولاء والمستويات — بيانات في إعدادات الأدمن على       */
/* السيرفر (settings.loyaltyTiers / loyaltyEarnEgpPerPoint). الرصيد    */
/* والكسب والكروت بتتنفذ على السيرفر (ترقية loyalty-points).          */
/* ------------------------------------------------------------------ */
function LoyaltySettingsCard() {
  const lang = useBahbah((s) => s.lang);
  const settings = useBahbah((s) => s.settings);
  const { updateSettings } = useBahbah();
  const ar = lang === "ar";

  const tiers: LoyaltyTier[] =
    settings.loyaltyTiers && settings.loyaltyTiers.length > 0
      ? settings.loyaltyTiers
      : DEFAULT_LOYALTY_TIERS;
  const egpPerPoint = settings.loyaltyEarnEgpPerPoint ?? 10;
  const freeShipQuota = settings.loyaltyFreeShipQuota ?? DEFAULT_LOYALTY_FREE_SHIP_QUOTA;

  const save = (next: LoyaltyTier[]) => updateSettings({ loyaltyTiers: next });
  const patch = (i: number, p: Partial<LoyaltyTier>) =>
    save(tiers.map((t, x) => (x === i ? { ...t, ...p } : t)));
  const addTier = () => {
    if (tiers.length >= 10) return;
    const last = tiers[tiers.length - 1];
    save([
      ...tiers,
      {
        id: `lvl-${Date.now()}`,
        nameAr: "عميل جديد",
        nameEn: "New Client",
        minPoints: (last?.minPoints ?? 0) + 500,
        perk: "none" as LoyaltyPerk,
      },
    ]);
  };
  const removeTier = (i: number) => {
    if (tiers.length <= 1) return;
    save(tiers.filter((_, x) => x !== i));
  };

  const perkLabel = (p: LoyaltyPerk) =>
    p === "discount_card_10"
      ? ar
        ? "كارت خصم ١٠٪ (مرة واحدة)"
        : "10% discount card (one-time)"
      : p === "free_delivery"
        ? ar
          ? "توصيل مجاني (برصيد شهري)"
          : "Free delivery (monthly balance)"
        : ar
          ? "بدون ميزة"
          : "No perk";

  return (
    <AdminCard className="lg:col-span-2">
      <SectionTitle
        icon={<Sparkles className="size-5 text-[#F09428]" />}
        title={ar ? "نقاط الولاء ومستويات العميل" : "Loyalty points & client levels"}
      />
      <p className="mt-1 text-xs font-semibold text-muted-foreground">
        {ar
          ? "النقاط بتبدأ من صفر، والحساب الجديد بياخد 50 نقطة ترحيبية مرة واحدة على السيرفر. الكسب بيتحسب على السيرفر لما الطلب يتسلّم. التوصيل المجاني لعميل المستوى الأعلى وعميل العلاج الشهري المشترك بيتم من رصيد شهري محدود بتحدده هنا — مش مفتوح."
          : "Points start at zero; a new account gets 50 welcome points once, server-side. Earning is credited server-side on delivery. Free delivery for the top level and subscribed monthly-treatment clients comes from a limited monthly balance you set here — not unlimited."}
      </p>

      <div className="flex flex-wrap gap-4">
        <label className="mt-4 block w-full max-w-xs space-y-1.5">
          <span className="text-xs font-bold text-foreground/75">
            {ar ? "معدل الكسب: نقطة لكل كام جنيه؟" : "Earn rate: 1 point per how many EGP?"}
          </span>
          <Input
            type="number"
            min={1}
            value={egpPerPoint}
            onChange={(e) =>
              updateSettings({
                loyaltyEarnEgpPerPoint: Math.max(1, Math.floor(Number(e.target.value) || 10)),
              })
            }
            className="h-11 rounded-xl"
            dir="ltr"
          />
        </label>

        <label className="mt-4 block w-full max-w-xs space-y-1.5">
          <span className="text-xs font-bold text-foreground/75">
            {ar
              ? "رصيد التوصيل المجاني: كام توصيلة مجانية في الشهر؟"
              : "Free-delivery balance: how many free deliveries per month?"}
          </span>
          <Input
            type="number"
            min={0}
            value={freeShipQuota}
            onChange={(e) =>
              updateSettings({
                loyaltyFreeShipQuota: Math.max(0, Math.floor(Number(e.target.value) || 0)),
              })
            }
            className="h-11 rounded-xl"
            dir="ltr"
          />
          <span className="block text-[11px] font-semibold text-muted-foreground">
            {ar
              ? "بيتطبق على عميل أعلى مستوى وعميل العلاج الشهري المشترك، وبيتجدد أول كل شهر. حملة التوصيل المجاني ما بتستهلكش من الرصيد."
              : "Applies to top-level clients and subscribed monthly-treatment clients; renews on the 1st of each month. The free-shipping campaign does not consume the balance."}
          </span>
        </label>
      </div>

      <div className="mt-4 space-y-2">
        {tiers.map((tier, i) => (
          <div
            key={tier.id}
            className="grid items-end gap-2 rounded-xl border border-border/60 p-3 sm:grid-cols-[1fr_1fr_110px_190px_auto]"
          >
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground">
                {ar ? `اسم المستوى ${i + 1} (عربي)` : `Level ${i + 1} name (AR)`}
              </span>
              <Input
                value={tier.nameAr}
                onChange={(e) => patch(i, { nameAr: e.target.value })}
                className="h-10 rounded-lg"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground">
                {ar ? "الاسم (إنجليزي)" : "Name (EN)"}
              </span>
              <Input
                value={tier.nameEn}
                onChange={(e) => patch(i, { nameEn: e.target.value })}
                className="h-10 rounded-lg"
                dir="ltr"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground">
                {ar ? "من كام نقطة" : "From points"}
              </span>
              <Input
                type="number"
                min={0}
                value={tier.minPoints}
                onChange={(e) =>
                  patch(i, { minPoints: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                }
                className="h-10 rounded-lg"
                dir="ltr"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground">
                {ar ? "الميزة" : "Perk"}
              </span>
              <select
                value={tier.perk}
                onChange={(e) => patch(i, { perk: e.target.value as LoyaltyPerk })}
                className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm font-semibold"
              >
                {(["none", "discount_card_10", "free_delivery"] as LoyaltyPerk[]).map((p) => (
                  <option key={p} value={p}>
                    {perkLabel(p)}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-lg"
              disabled={tiers.length <= 1}
              onClick={() => removeTier(i)}
            >
              {ar ? "حذف" : "Delete"}
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-3 rounded-xl"
        disabled={tiers.length >= 10}
        onClick={addTier}
      >
        {ar ? "+ إضافة مستوى (لحد 10 مستويات)" : "+ Add level (up to 10)"}
      </Button>
    </AdminCard>
  );
}

function SettingsSection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const settings = useBahbah((s) => s.settings);
  const siteEdits = useBahbah((s) => s.siteEdits);
  const careEdits = useBahbah((s) => s.careEdits);
  const zoneEdits = useBahbah((s) => s.zoneEdits);
  const setSection = useBahbah((s) => s.setAdminSection);
  const demoMode = useBahbah((s) => s.demoMode);
  const serverOrdersLoaded = useBahbah((s) => s.serverOrdersLoaded);
  const { updateSettings, updateSiteEdits, updateCareEdit, updateZoneEdit, resetAdminDemo, setDemoMode } =
    useBahbah();

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
          {/* وضع العرض التجريبي: بيانات وهمية للعرض فقط — بيتلغي تلقائيًا أول ما توصل بيانات سيرفر */}
          <div className="flex items-center justify-between rounded-xl border border-dashed border-[#F59E0B]/50 bg-[#FFFBEB] p-3.5">
            <div>
              <span className="text-sm font-bold">
                {lang === "ar" ? "وضع العرض التجريبي" : "Demo presentation mode"}
              </span>
              <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                {serverOrdersLoaded
                  ? lang === "ar"
                    ? "متعطّل تلقائيًا — وصلت بيانات حقيقية من السيرفر"
                    : "Auto-disabled — real server data has arrived"
                  : lang === "ar"
                    ? "بيانات عرض وهمية في اللوحة (بتتلغي لوحدها مع أول بيانات سيرفر)"
                    : "Fabricated figures in the dashboard (auto-off once server data exists)"}
              </p>
            </div>
            <Switch
              checked={demoMode && !serverOrdersLoaded}
              disabled={serverOrdersLoaded}
              onCheckedChange={(v) => setDemoMode(v)}
            />
          </div>
        </div>
      </AdminCard>

      {/* loyalty points & levels */}
      <LoyaltySettingsCard />

      {/* delivery settings & zone pricing control */}
      <AdminCard className="lg:col-span-2">
        <SectionTitle
          icon={<IconScooter className="size-5 text-[#C56A0A]" />}
          title="ضبط تسعيرة وتوصيل القرى والنجوع (ديروط وضواحيها)"
        />
        <p className="mt-1 text-xs text-muted-foreground font-semibold">
          تحكم في سعر التوصيل والوقت المتوقع لكل قرية ونجع، وتحديد خيار كتابة المكان المخصص
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 max-h-96 overflow-y-auto p-1 nice-scrollbar">
          {deliveryZones.map((z) => {
            const e = zoneEdits[z.id] ?? {};
            return (
              <div key={z.id} className="rounded-xl border border-border/70 p-3 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <p className="font-heading text-xs font-black truncate text-[#184C8A]">{z.nameAr}</p>
                  <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                    {e.fee !== undefined ? e.fee : z.fee} ج.م
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-muted-foreground block font-bold mb-0.5">السعر (ج.م):</span>
                    <Input
                      type="number"
                      placeholder={String(z.fee)}
                      value={e.fee ?? ""}
                      onChange={(ev) =>
                        updateZoneEdit(z.id, {
                          fee: ev.target.value === "" ? undefined : Number(ev.target.value),
                        })
                      }
                      className="h-8 rounded-lg text-center text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-bold mb-0.5">الدقائق:</span>
                    <Input
                      type="number"
                      placeholder={String(z.etaMin)}
                      value={e.etaMin ?? ""}
                      onChange={(ev) =>
                        updateZoneEdit(z.id, {
                          etaMin: ev.target.value === "" ? undefined : Number(ev.target.value),
                        })
                      }
                      className="h-8 rounded-lg text-center text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AdminCard>

      {/* delivery settings */}
      <AdminCard>
        <SectionTitle
          icon={<IconScooter className="size-5 text-[#C56A0A]" />}
          title={t("adm.delivery")}
        />
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border/60 p-3.5">
            <div>
              <span className="text-sm font-bold">{t("adm.campaign")}</span>
              <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                {t("adm.campaignHint")}
              </p>
            </div>
            <Switch
              checked={settings.freeShipCampaignOn}
              onCheckedChange={(v) => updateSettings({ freeShipCampaignOn: v })}
            />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold text-foreground/75 block">{t("adm.campaignImg")}</span>
            <div className="flex items-center gap-3">
              <div className="h-14 w-24 shrink-0 overflow-hidden rounded-xl border bg-white shadow-xs">
                {settings.freeShipCampaignImg ? (
                  <img
                    src={settings.freeShipCampaignImg}
                    alt="Campaign Preview"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center px-1 text-center text-[10px] font-bold text-muted-foreground">
                    {lang === "ar" ? "لا توجد صورة" : "No image"}
                  </div>
                )}
              </div>
              <Input
                value={settings.freeShipCampaignImg ?? ""}
                onChange={(e) => updateSettings({ freeShipCampaignImg: e.target.value })}
                placeholder="رابط الصورة أو ارفع من جهازك.."
                className="h-11 flex-1 rounded-xl text-xs"
                dir="ltr"
              />
              <label className="cursor-pointer rounded-full bg-[#184C8A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#112D51] shrink-0">
                رفع صورة
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = async () => {
                        if (typeof reader.result === "string") {
                          const ok = await updateSettings({ freeShipCampaignImg: reader.result });
                          if (ok) toast.success("تم تحديث صورة بانر الحملة بنجاح ✓");
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
          </div>
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
            onClick={async () => {
              /* تأكيد حفظ فعلي: بنعيد مزامنة إعدادات المتجر الحالية وبنقول
                 «تم» بس لو السيرفر أكّد الكتابة */
              if (await updateSettings({})) toast.success(t("misc.saved"));
            }}
          >
            {t("misc.save")}
          </Button>
        </div>
      </AdminCard>

      {/* جدول توصيل القرى الأسبوعي — بيظهر في الرئيسية وبيتحفظ على السيرفر */}
      <AdminCard className="lg:col-span-2">
        <SectionTitle
          icon={<IconScooter className="size-5 text-[#1E4E8F]" />}
          title={lang === "ar" ? "يوم القرى — جدول التوصيل الأسبوعي" : "Village days — weekly delivery schedule"}
        />
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          {lang === "ar"
            ? "اكتب اليوم والقرى المغطاة فيه — بيظهر للعملاء في الصفحة الرئيسية وبيتحفظ في إعدادات السيرفر."
            : "Weekday → villages covered. Shown on the home page and stored in the server settings."}
        </p>
        <div className="mt-4 space-y-2">
          {(settings.villageDays ?? []).map((d, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Input
                value={d.day}
                onChange={(e) => {
                  const next = [...(settings.villageDays ?? [])];
                  next[i] = { ...next[i], day: e.target.value };
                  updateSettings({ villageDays: next });
                }}
                placeholder={lang === "ar" ? "اليوم (مثال: السبت)" : "Day (e.g. Saturday)"}
                className="h-10 w-36 rounded-xl font-bold"
              />
              <Input
                value={d.villages}
                onChange={(e) => {
                  const next = [...(settings.villageDays ?? [])];
                  next[i] = { ...next[i], villages: e.target.value };
                  updateSettings({ villageDays: next });
                }}
                placeholder={lang === "ar" ? "القرى: مسارة، الكودية، دشلوط…" : "Villages: …"}
                className="h-10 min-w-52 flex-1 rounded-xl"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-full font-bold"
                onClick={() =>
                  updateSettings({ villageDays: (settings.villageDays ?? []).filter((_, j) => j !== i) })
                }
              >
                {lang === "ar" ? "حذف" : "Remove"}
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            className="h-10 rounded-full font-bold"
            onClick={() =>
              updateSettings({ villageDays: [...(settings.villageDays ?? []), { day: "", villages: "" }] })
            }
          >
            {lang === "ar" ? "+ إضافة يوم" : "+ Add day"}
          </Button>
        </div>
      </AdminCard>

      {/* أسعار الخدمات التمريضية المنزلية (nursing_edits على السيرفر) */}
      <NursingPricesCard />

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

      {/* شعارات ووعود المتجر ونصوص الهيرو — تحكم سهل وسريع */}
      <AdminCard className="lg:col-span-2">
        <SectionTitle
          icon={<IconSparkles className="size-5 text-[#F09428]" />}
          title="شعارات ونصوص الواجهة والوعود التسويقية (تعديل مباشر)"
        />
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          يمكنك تعديل شعار التوصيل وشحن المحافظات وعناوين الواجهة بسهولة من هنا — التغيير يظهر فوراً ويُحفظ في السيرفر.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground/80">
              شعار التوصيل (بديل أصلي 100%)
            </span>
            <Input
              value={siteEdits.deliveryPromiseAr ?? ""}
              onChange={(e) => updateSiteEdits({ deliveryPromiseAr: e.target.value })}
              placeholder="توصيل 24 ساعة"
              className="h-11 rounded-xl"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground/80">
              شعار الشحن (بديل شحن سريع)
            </span>
            <Input
              value={siteEdits.shippingPromiseAr ?? ""}
              onChange={(e) => updateSiteEdits({ shippingPromiseAr: e.target.value })}
              placeholder="شحن سريع لجميع المحافظات"
              className="h-11 rounded-xl"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground/80">
              عنوان الهيرو الرئيسي (السطر الأول)
            </span>
            <Input
              value={siteEdits.heroTitleAr ?? ""}
              onChange={(e) => updateSiteEdits({ heroTitleAr: e.target.value })}
              placeholder="صيدليتك الأولى في ديروط.."
              className="h-11 rounded-xl"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground/80">
              النص المميز الملوّن في الهيرو
            </span>
            <Input
              value={siteEdits.heroAccentAr ?? ""}
              onChange={(e) => updateSiteEdits({ heroAccentAr: e.target.value })}
              placeholder="توصيل 24 ساعة لجميع المحافظات"
              className="h-11 rounded-xl"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground/80">
              شريط الهيرو العلوي (Badge)
            </span>
            <Input
              value={siteEdits.heroBadgeAr ?? ""}
              onChange={(e) => updateSiteEdits({ heroBadgeAr: e.target.value })}
              placeholder="✨ صيدليتك المعتمدة في ديروط — خدمة طبية 24 ساعة"
              className="h-11 rounded-xl"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground/80">
              نص الوصف الترحيبي أسفل عنوان الهيرو
            </span>
            <Input
              value={siteEdits.heroSubAr ?? ""}
              onChange={(e) => updateSiteEdits({ heroSubAr: e.target.value })}
              placeholder="أدويتك ومستلزماتك الطبية وتجميلك تصلك لباب بيتك فوراً.."
              className="h-11 rounded-xl"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground/80">
              الشريط الإعلاني أعلى الموقع (Top Micro Bar)
            </span>
            <Input
              value={siteEdits.announcementAr ?? ""}
              onChange={(e) => updateSiteEdits({ announcementAr: e.target.value })}
              placeholder="توصيل 24 ساعة لجميع المحافظات بإشراف صيدلي معتمد"
              className="h-11 rounded-xl"
            />
          </label>

          <div className="sm:col-span-2 space-y-2 pt-2 border-t border-border/60">
            <span className="text-xs font-bold text-foreground/80 block">
              صورة وشعار الهيرو الدائري بالواجهة:
            </span>
            <div className="flex items-center gap-3">
              <div className="size-14 shrink-0 rounded-2xl border bg-white p-1 overflow-hidden shadow-xs">
                <img
                  src={siteEdits.heroImage || "/images/bahbah-badge.png"}
                  alt="Hero Preview"
                  className="size-full object-contain"
                />
              </div>
              <Input
                value={siteEdits.heroImage ?? ""}
                onChange={(e) => updateSiteEdits({ heroImage: e.target.value })}
                placeholder="رابط الصورة أو ارفع من جهازك.."
                className="h-11 flex-1 rounded-xl text-xs"
                dir="ltr"
              />
              <label className="cursor-pointer rounded-full bg-[#184C8A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#112D51] shrink-0">
                رفع صورة
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = async () => {
                        if (typeof reader.result === "string") {
                          const ok = await updateSiteEdits({ heroImage: reader.result });
                          if (ok) toast.success("تم تحديث صورة الهيرو بنجاح ✓");
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
          <p className="text-xs font-bold text-[#2E9E6B]">
            ✓ التعديلات تُحفظ تلقائياً في السيرفر وتُطبق على المتجر فوراً
          </p>
          <Button
            size="sm"
            className="rounded-full bg-[#1E4E8F] px-5 font-bold text-white hover:bg-[#112D51]"
            onClick={async () => {
              /* تأكيد حفظ فعلي: بنعيد مزامنة النصوص الحالية وبنقول «تم» بس
                 لو السيرفر أكّد الكتابة */
              if (await updateSiteEdits({})) {
                toast.success("تم تأكيد حفظ ونشر جميع النصوص والشعارات بنجاح ✓");
              }
            }}
          >
            تأكيد الحفظ
          </Button>
        </div>
      </AdminCard>

      {/* إدارة العروض والإعلانات المصورة — وصول مباشر من الإعدادات */}
      <AdminCard className="lg:col-span-2 border-orange-200 bg-orange-50/30 dark:border-orange-950 dark:bg-orange-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionTitle
              icon={<Megaphone className="size-5 text-[#EA580C]" />}
              title="إدارة العروض والإعلانات ورفع الصور"
            />
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              تعديل بنرات الصفحة الرئيسية، إنشاء عروض وخصومات أسبوعية جديدة، ورفع صور الإعلانات والمنتجات مباشرة من جهازك.
            </p>
          </div>
          <Button
            className="h-10 rounded-xl bg-[#EA580C] px-5 text-xs font-bold text-white hover:bg-[#C2410C]"
            onClick={() => setSection("ads")}
          >
            فتح إدارة الإعلانات والعروض ←
          </Button>
        </div>
      </AdminCard>

      {/* Production Clean Reset to 0 */}
      <AdminCard className="border-rose-300 bg-rose-50/40 dark:border-rose-950 dark:bg-rose-950/20 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-rose-600 text-white">
                <AlertTriangle className="size-5" />
              </span>
              <h3 className="font-heading text-base font-black text-rose-900 dark:text-rose-200">
                تصفير شامل للتشغيل الفعلي — بدء العمل على نظيف (Zero Reset)
              </h3>
            </div>
            <p className="text-xs text-rose-800/80 dark:text-rose-300 font-semibold max-w-xl">
              تصفير نسخة اللوحة المحلية على هذا الجهاز (الطلبات والروشتات والاشتراكات والعدادات). لا يمسح قاعدة البيانات السحابية — أي حذف من السحابة يتم من لوحة Supabase فقط.
            </p>
          </div>

          <Button
            className="h-11 rounded-full bg-rose-600 px-6 font-black text-white hover:bg-rose-700 shadow-md shadow-rose-600/25 active:scale-95 transition-all text-xs"
            onClick={() => {
              const ok = window.confirm(
                "تأكيد التصفير المحلي:\n\nسيتم تصفير نسخة اللوحة على هذا الجهاز فقط ولن يتم حذف أي بيانات من السحابة. متابعة؟"
              );
              if (ok) {
                resetAdminDemo();
                toast.success("تم تصفير لوحة الإدارة بالكامل بنجاح — جاهز للتشغيل الحي الفعلي على نظيف! 🚀");
              }
            }}
          >
            تصفير شامل للتشغيل الفعلي 0️⃣
          </Button>
        </div>
      </AdminCard>
    </div>
  );
}
