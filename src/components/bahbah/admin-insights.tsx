"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Crown,
  Users,
  UserPlus,
  TrendingUp,
  Download,
  Wallet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { salesData, weeklyData, categories, getProduct, type Order } from "@/lib/bahbah/data";
import { useBahbah, useT, useAdminProducts, useDemoActive } from "@/lib/bahbah/store";
import { fmtPrice } from "./product-card";
import { AdminCard, SectionTitle, TableWrap, TH, TD, DEMO_CUSTOMERS, PIE_COLORS, DashboardSyncBar } from "./admin-ui";
import { CustomerContactMenu } from "./contact-menu";
import { toast } from "sonner";
import {
  adminLoyaltyLookupFromSupabase,
  adminLoyaltyAdjustInSupabase,
  adminLoyaltySetCardStatusInSupabase,
  type AdminLoyaltyInfo,
} from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/* Real series derived from actual orders — the fabricated demo series */
/* (salesData / weeklyData) are ONLY used when demo mode is explicitly */
/* on AND no server data exists (useDemoActive).                       */
/* ------------------------------------------------------------------ */
export function monthlySeriesFromOrders(orders: Order[], lang: string) {
  const out: { name: string; revenue: number; orders: number }[] = [];
  const now = new Date();
  for (let i = 9; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthOrders = orders.filter((o) => o.status !== "cancelled" && o.date.startsWith(key));
    out.push({
      name: d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short" }),
      revenue: monthOrders.reduce((s, o) => s + o.total, 0),
      orders: monthOrders.length,
    });
  }
  return out;
}

export function weeklySeriesFromOrders(orders: Order[], lang: string) {
  const out: { name: string; orders: number; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayOrders = orders.filter((o) => o.status !== "cancelled" && o.date === key);
    out.push({
      name: d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { weekday: "short" }),
      orders: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
    });
  }
  return out;
}

export function categoryShareFromOrders(orders: Order[], lang: string) {
  const totals = new Map<string, number>();
  orders
    .filter((o) => o.status !== "cancelled")
    .forEach((o) =>
      o.items.forEach((it) => {
        const cat = getProduct(it.productId)?.category ?? "other";
        totals.set(cat, (totals.get(cat) ?? 0) + it.price * it.qty);
      })
    );
  return categories
    .map((c, i) => ({
      name: lang === "ar" ? c.nameAr : c.nameEn,
      value: totals.get(c.id) ?? 0,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }))
    .filter((x) => x.value > 0);
}

export interface CustomerRow {
  nameAr: string;
  nameEn: string;
  phone: string;
  orders: number;
  spend: number;
  points: number;
  joined: string;
}

/** customer table aggregated from real orders (grouped by phone) */
export function customersFromOrders(orders: Order[]): CustomerRow[] {
  const map = new Map<string, CustomerRow>();
  orders
    .filter((o) => o.status !== "cancelled")
    .forEach((o) => {
      const key = o.phone || o.customerAr;
      const cur =
        map.get(key) ??
        ({
          nameAr: o.customerAr,
          nameEn: o.customerEn,
          phone: o.phone,
          orders: 0,
          spend: 0,
          points: 0,
          joined: o.date,
        } as CustomerRow);
      cur.orders += 1;
      cur.spend += o.total;
      cur.points = Math.floor(cur.spend / 10);
      if (o.date < cur.joined) cur.joined = o.date;
      map.set(key, cur);
    });
  return [...map.values()].sort((a, b) => b.spend - a.spend);
}

/* ------------------------------------------------------------------ */
/* تصدير جهات اتصال العملاء (طلب المالك: الأسماء والأرقام على تليفونه) */
/* المصدر = نفس الطلبات الحقيقية اللي الجدول بيجمع منها (من السيرفر)،  */
/* والدمج برقم التليفون بعد توحيد صيغته (آخر 10 أرقام) وآخر اسم معروف  */
/* من أحدث طلب. التوليد بيتم في المتصفح من بيانات السيرفر المحمّلة.    */
/* ------------------------------------------------------------------ */
export interface CustomerContact {
  name: string;
  phone: string;
  orders: number;
  spend: number;
}

export function customerContactsFromOrders(orders: Order[]): CustomerContact[] {
  const sorted = [...orders].sort((a, b) =>
    (b.createdAt ?? b.date).localeCompare(a.createdAt ?? a.date)
  );
  const map = new Map<string, CustomerContact>();
  for (const o of sorted) {
    if (o.status === "cancelled") continue;
    const digits = (o.phone || "").replace(/[^0-9]/g, "");
    if (digits.length < 8) continue;
    const key = digits.length >= 10 ? digits.slice(-10) : digits;
    const cur = map.get(key);
    if (cur) {
      cur.orders += 1;
      cur.spend += o.total;
    } else {
      map.set(key, {
        name: o.customerAr || o.customerEn || "",
        phone: o.phone,
        orders: 1,
        spend: o.total,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.spend - a.spend);
}

const vcfEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export function buildCustomersVcf(contacts: CustomerContact[]): string {
  return contacts
    .map((c) =>
      [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${vcfEscape(c.name || c.phone)}`,
        `TEL;TYPE=CELL:${c.phone.replace(/[\s-]/g, "")}`,
        "END:VCARD",
      ].join("\r\n")
    )
    .join("\r\n");
}

export function buildCustomersCsv(contacts: CustomerContact[]): string {
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = contacts.map((c) => [esc(c.name), esc(c.phone), c.orders, c.spend].join(","));
  return "\uFEFF" + [["الاسم", "رقم التليفون", "عدد الطلبات", "إجمالي المشتريات"].join(","), ...rows].join("\r\n");
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** visible warning whenever fabricated demo numbers are on screen */
export function DemoModeBanner() {
  const lang = useBahbah((s) => s.lang);
  return (
    <div className="rounded-2xl border border-[#F59E0B]/40 bg-[#FFFBEB] px-4 py-2.5 text-center text-xs font-black text-[#B45309]">
      {lang === "ar"
        ? "🎭 وضع العرض التجريبي مفعّل — الأرقام المعروضة بيانات عرض وليست مبيعات حقيقية"
        : "🎭 Demo mode is ON — the numbers shown are presentation data, not real sales"}
    </div>
  );
}

/* ================================================================== */
/* CUSTOMERS                                                           */
/* ================================================================== */
/* ------------------------------------------------------------------ */
/* إدارة ولاء عميل — للمدير بس (الدوال على السيرفر بترفض أي حد تاني).  */
/* بحث برقم التليفون: الرصيد، كارت الخصم وحالته، عضوية الرعاية،        */
/* ورصيد التوصيل المجاني الشهري — مع تصحيح نقاط (±) وإلغاء/تفعيل      */
/* الكارت، وكل عملية بتتأكد من السيرفر قبل ما تظهر نتيجتها.            */
/* ------------------------------------------------------------------ */
function LoyaltyAdminPanel() {
  const lang = useBahbah((s) => s.lang);
  const [phone, setPhone] = useState("");
  const [info, setInfo] = useState<AdminLoyaltyInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const ar = lang === "ar";

  const lookup = async (p: string) => {
    const target = p.trim();
    if (target.replace(/\D/g, "").length < 8) {
      toast.error(ar ? "اكتب رقم تليفون صحيح" : "Enter a valid phone number");
      return;
    }
    setBusy(true);
    try {
      const res = await adminLoyaltyLookupFromSupabase(target);
      if (!res) {
        toast.error(ar ? "تعذّر جلب بيانات الولاء من السيرفر — حاول تاني" : "Could not load loyalty data — try again");
        return;
      }
      setInfo(res);
      if (!res.found) toast.warning(ar ? "الرقم ده ملوش حساب ولاء لسه" : "This number has no loyalty account yet");
    } finally {
      setBusy(false);
    }
  };

  const adjust = async (sign: 1 | -1) => {
    if (!info?.phone) return;
    const n = Math.floor(Math.abs(Number(delta)));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error(ar ? "اكتب عدد نقاط صحيح" : "Enter a valid points amount");
      return;
    }
    setBusy(true);
    try {
      const next = await adminLoyaltyAdjustInSupabase(info.phone, sign * n, note.trim() || undefined);
      if (next == null) {
        toast.error(ar ? "تعذّر تعديل النقاط على السيرفر — الرصيد زي ما هو" : "Could not adjust points on the server");
        return;
      }
      toast.success(ar ? `تم التعديل — الرصيد الجديد ${next} نقطة` : `Adjusted — new balance ${next} pts`);
      setDelta("");
      setNote("");
      await lookup(info.phone);
    } finally {
      setBusy(false);
    }
  };

  const setCard = async (status: "active" | "voided") => {
    if (!info?.phone) return;
    if (
      status === "voided" &&
      !window.confirm(ar ? "إلغاء كارت الخصم بتاع العميل؟ مش هيقدر يستخدمه في أي طلب جاي." : "Void this customer's discount card? It will stop working on new orders.")
    )
      return;
    setBusy(true);
    try {
      const ok = await adminLoyaltySetCardStatusInSupabase(info.phone, status);
      if (!ok) {
        toast.error(ar ? "تعذّر تغيير حالة الكارت على السيرفر" : "Could not change the card status on the server");
        return;
      }
      toast.success(status === "voided" ? (ar ? "تم إلغاء الكارت" : "Card voided") : ar ? "تمت إعادة تفعيل الكارت" : "Card reactivated");
      await lookup(info.phone);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminCard className="p-4 md:p-5">
      <SectionTitle
        icon={<Crown className="size-5 text-[#C56A0A]" />}
        title={ar ? "إدارة ولاء عميل" : "Customer Loyalty Manager"}
      />
      <p className="mt-1 text-[11px] font-bold text-muted-foreground">
        {ar ? "للمدير بس — ابحث برقم التليفون لعرض الرصيد والكارت وتصحيحهم" : "Admin only — look up a customer by phone to view and correct points & card"}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={ar ? "رقم تليفون العميل" : "Customer phone"}
          className="h-10 w-56 rounded-full text-sm"
          dir="ltr"
          inputMode="tel"
        />
        <Button
          className="h-10 rounded-full bg-[#1E4E8F] px-5 text-sm font-black text-white hover:bg-[#163a6b]"
          disabled={busy}
          onClick={() => void lookup(phone)}
        >
          {ar ? "بحث" : "Look up"}
        </Button>
      </div>

      {info && info.found && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-[#EAF1F9] px-3 py-1.5 text-[#1E4E8F]">
              {ar ? "الرصيد" : "Balance"}: {info.balance ?? 0} {ar ? "نقطة" : "pts"}
            </span>
            <span className="rounded-full bg-muted px-3 py-1.5" dir="ltr">{info.phone}</span>
            {info.careMember && (
              <span className="rounded-full bg-[#EAF6F1] px-3 py-1.5 text-[#2E9E6B]">
                {ar ? "عميل علاج شهري" : "Monthly-care member"}
              </span>
            )}
            {(info.freeQuota ?? 0) > 0 && (
              <span className="rounded-full bg-[#FFF4E5] px-3 py-1.5 text-[#B45E0A]">
                {ar ? "توصيل مجاني متبقي الشهر ده" : "Free deliveries left this month"}: {info.freeRemaining ?? 0}/{info.freeQuota}
              </span>
            )}
          </div>

          {info.cardCode ? (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/40 px-3.5 py-2.5 text-xs font-bold">
              <span>
                {ar ? "كارت خصم" : "Discount card"} {info.cardPercent ?? 10}٪ — <span dir="ltr">{info.cardCode}</span> —{" "}
                {info.cardStatus === "active"
                  ? ar ? "ساري" : "Active"
                  : info.cardStatus === "used"
                    ? ar ? "مستخدم" : "Used"
                    : ar ? "ملغي" : "Voided"}
              </span>
              {info.cardStatus === "active" && (
                <Button size="sm" variant="outline" className="h-8 rounded-full border-[#DC4B4B]/40 px-3 text-[11px] font-bold text-[#DC4B4B] hover:bg-[#DC4B4B]/10 hover:text-[#DC4B4B]" disabled={busy} onClick={() => void setCard("voided")}>
                  {ar ? "إلغاء الكارت" : "Void card"}
                </Button>
              )}
              {info.cardStatus === "voided" && (
                <Button size="sm" variant="outline" className="h-8 rounded-full px-3 text-[11px] font-bold" disabled={busy} onClick={() => void setCard("active")}>
                  {ar ? "إعادة تفعيل الكارت" : "Reactivate card"}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-xs font-bold text-muted-foreground">{ar ? "العميل ده لسه ما اكتسبش كارت خصم." : "This customer has not earned a discount card yet."}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder={ar ? "عدد النقاط" : "Points"}
              className="h-9 w-28 rounded-full text-xs font-bold"
              dir="ltr"
              inputMode="numeric"
            />
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={ar ? "سبب التعديل (اختياري)" : "Reason (optional)"}
              className="h-9 w-52 rounded-full text-xs"
            />
            <Button size="sm" className="h-9 rounded-full bg-[#2E9E6B] px-4 text-xs font-black text-white hover:bg-[#278a5e]" disabled={busy} onClick={() => void adjust(1)}>
              {ar ? "إضافة +" : "Add +"}
            </Button>
            <Button size="sm" variant="outline" className="h-9 rounded-full border-[#DC4B4B]/40 px-4 text-xs font-bold text-[#DC4B4B] hover:bg-[#DC4B4B]/10 hover:text-[#DC4B4B]" disabled={busy} onClick={() => void adjust(-1)}>
              {ar ? "خصم −" : "Deduct −"}
            </Button>
          </div>
        </div>
      )}
    </AdminCard>
  );
}

export function CustomersSection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const adminOrders = useBahbah((s) => s.adminOrders);
  const sessionRole = useBahbah((s) => s.sessionRole);
  const demo = useDemoActive();
  const [q, setQ] = useState("");

  /* العملاء الحقيقيون من الطلبات الفعلية — بيانات العرض التجريبي بتظهر بس
     في وضع العرض الصريح وغياب أي بيانات سيرفر */
  const customers = useMemo<CustomerRow[]>(
    () => (demo ? DEMO_CUSTOMERS : customersFromOrders(adminOrders ?? [])),
    [demo, adminOrders]
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((c) =>
      [c.nameAr, c.nameEn, c.phone].join(" ").toLowerCase().includes(query)
    );
  }, [q, customers]);

  const vipCount = customers.filter((c) => c.spend >= 3000).length;
  const monthKey = new Date().toISOString().slice(0, 7);
  const newThisMonth = customers.filter((c) => c.joined.startsWith(monthKey)).length;
  const avgSpend = customers.length
    ? Math.round(customers.reduce((s, c) => s + c.spend, 0) / customers.length)
    : 0;

  /* تصدير جهات الاتصال: من الطلبات الحقيقية المحمّلة من السيرفر بس —
     في وضع العرض التجريبي الأزرار مقفولة عشان بيانات وهمية ما تتصدّرش */
  const exportContacts = (kind: "vcf" | "csv") => {
    const contacts = customerContactsFromOrders(adminOrders ?? []);
    if (contacts.length === 0) {
      toast.error(lang === "ar" ? "لا توجد بيانات عملاء للتصدير بعد" : "No customer data to export yet");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    if (kind === "vcf") {
      downloadTextFile(`bahbah_customers_${stamp}.vcf`, buildCustomersVcf(contacts), "text/vcard;charset=utf-8;");
    } else {
      downloadTextFile(`bahbah_customers_${stamp}.csv`, buildCustomersCsv(contacts), "text/csv;charset=utf-8;");
    }
    toast.success(t("adm.exported"));
  };

  const stats = [
    { icon: <Users className="size-5" />, tint: "bg-[#EAF1F9]", color: "text-[#1E4E8F]", value: String(customers.length), label: t("adm.totalCustomers") },
    { icon: <UserPlus className="size-5" />, tint: "bg-[#EAF6F1]", color: "text-[#2E9E6B]", value: String(newThisMonth), label: t("adm.newThisMonth") },
    { icon: <Crown className="size-5" />, tint: "bg-[#F09428]/15", color: "text-[#C56A0A]", value: String(vipCount), label: t("adm.vipCount") },
    { icon: <TrendingUp className="size-5" />, tint: "bg-[#EEF0F7]", color: "text-[#112D51]", value: fmtPrice(avgSpend, t), label: t("admin.kpi4") },
  ];

  return (
    <div className="space-y-4">
      {demo && <DemoModeBanner />}
      {sessionRole === "admin" && <LoyaltyAdminPanel />}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <AdminCard key={s.label} className="p-4">
            <span className={`grid size-10 place-items-center rounded-xl ${s.tint} ${s.color}`}>{s.icon}</span>
            <div className="mt-3 font-heading text-lg font-black md:text-xl">{s.value}</div>
            <div className="mt-0.5 text-[11px] font-bold text-muted-foreground">{s.label}</div>
          </AdminCard>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("adm.searchCustomers")}
            className="h-10 rounded-full ps-10 text-sm"
          />
        </div>
        {/* تصدير جهات اتصال العملاء: VCF بيتنقل على التليفون كجهات اتصال
            جاهزة، و CSV للإكسل/المشاركة — من بيانات السيرفر الحقيقية */}
        <Button
          variant="outline"
          disabled={demo || customers.length === 0}
          onClick={() => exportContacts("vcf")}
          className="h-10 rounded-full px-4 text-xs font-black text-[#1E4E8F]"
        >
          <Download className="size-4" />
          {lang === "ar" ? "تصدير جهات الاتصال (VCF)" : "Export contacts (VCF)"}
        </Button>
        <Button
          variant="outline"
          disabled={demo || customers.length === 0}
          onClick={() => exportContacts("csv")}
          className="h-10 rounded-full px-4 text-xs font-black text-[#1E4E8F]"
        >
          <Download className="size-4" />
          {lang === "ar" ? "تصدير CSV" : "Export CSV"}
        </Button>
      </div>

      <TableWrap>
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className={TH}>{t("admin.colCustomer")}</th>
              <th className={TH}>{t("admin.colOrdersN")}</th>
              <th className={TH}>{t("admin.colSpend")}</th>
              <th className={TH}>{t("admin.colPoints")}</th>
              <th className={TH}>{t("admin.colJoined")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.phone} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                <td className={TD}>
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#EAF1F9] font-heading text-sm font-black text-[#1E4E8F]">
                      {(lang === "ar" ? c.nameAr : c.nameEn).charAt(0)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 font-bold">
                        {lang === "ar" ? c.nameAr : c.nameEn}
                        {c.spend >= 3000 && (
                          <Badge className="gap-1 rounded-full bg-[#F09428] px-2 py-0.5 text-[10px] font-black text-white hover:bg-[#F09428]">
                            <Crown className="size-3" />
                            {t("admin.vip")}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground" dir="ltr">
                        {c.phone}
                      </div>
                    </div>
                    <span className="ms-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                      <CustomerContactMenu
                        phone={c.phone}
                        label=""
                        className="grid size-9 place-items-center rounded-full bg-[#2E9E6B] text-white shadow-xs transition hover:brightness-105 active:scale-95"
                      />
                    </span>
                  </div>
                </td>
                <td className={`${TD} font-bold`}>{c.orders}</td>
                <td className={`${TD} font-bold`}>{fmtPrice(c.spend, t)}</td>
                <td className={TD}>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[#F09428]"
                        style={{ width: `${Math.min(100, (c.points / 400) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold">{c.points}</span>
                  </div>
                </td>
                <td className={`${TD} text-muted-foreground`} dir="ltr">
                  {c.joined}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {t("search.none")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

/* ================================================================== */
/* REPORTS                                                             */
/* ================================================================== */
export function ReportsSection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const adminOrders = useBahbah((s) => s.adminOrders);
  const products = useAdminProducts();
  const demo = useDemoActive();
  const orders = adminOrders ?? [];

  /* monthly revenue + orders combo — من الطلبات الحقيقية، وبيانات العرض
     التجريبي بتُستخدم بس في وضع العرض الصريح وغياب بيانات السيرفر */
  const monthly = demo
    ? salesData.map((m) => ({
        name: lang === "ar" ? m.monthAr : m.monthEn,
        revenue: m.revenue,
        orders: m.orders,
      }))
    : monthlySeriesFromOrders(orders, lang);

  /* payment split from live admin orders */
  const paySplit = useMemo(() => {
    const counters: Record<string, number> = { cod: 0, instapay: 0, vodafone: 0, card: 0 };
    orders.forEach((o) => {
      if (o.payment in counters) counters[o.payment] += 1;
    });
    const meta: Record<string, { label: string; color: string }> = {
      cod: { label: t("checkout.cod"), color: "#1E4E8F" },
      instapay: { label: t("checkout.instapay"), color: "#F09428" },
      vodafone: { label: t("checkout.vodafone"), color: "#DC4B4B" },
      card: { label: t("checkout.card"), color: "#2E9E6B" },
    };
    return Object.entries(counters)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: meta[k].label, value: v, color: meta[k].color }));
  }, [orders, t]);

  /* top products from live admin orders */
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; rev: number }>();
    orders.forEach((o) =>
      o.items.forEach((it) => {
        const cur = map.get(it.productId) ?? {
          name: (lang === "ar" ? it.nameAr : it.nameEn).slice(0, 22),
          qty: 0,
          rev: 0,
        };
        cur.qty += it.qty;
        cur.rev += it.qty * it.price;
        map.set(it.productId, cur);
      })
    );
    return [...map.values()].sort((a, b) => b.rev - a.rev).slice(0, 5);
  }, [orders, lang]);

  /* قيمة المخزون حسب القسم — من الكتالوج الحقيقي (stock × price).
     النسخة القديمة كانت بتزود رقم وهمي ثابت (+1400) على كل قسم. */
  const catShare = useMemo(
    () =>
      categories.map((c, i) => ({
        name: lang === "ar" ? c.nameAr : c.nameEn,
        value:
          products.filter((p) => p.category === c.id).reduce((s, p) => s + p.stock * p.price, 0) +
          (demo ? (6 - i) * 1400 : 0),
        color: PIE_COLORS[i % PIE_COLORS.length],
      })),
    [demo, lang, products]
  );

  const weekly = demo
    ? weeklyData.map((d) => ({
        name: lang === "ar" ? d.dayAr : d.dayEn,
        orders: d.orders,
        revenue: d.revenue,
      }))
    : weeklySeriesFromOrders(orders, lang);

  /* تصدير حقيقي: كان الزر بيقول «تم التصدير» من غير ما ينزّل أي ملف.
     دلوقتي بينزّل CSV بالطلبات المعروضة فعليًا في اللوحة. */
  const exportCsv = () => {
    if (orders.length === 0) {
      toast.error(lang === "ar" ? "لا توجد بيانات طلبات للتصدير بعد" : "No order data to export yet");
      return;
    }
    const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = ["Order", "Date", "Customer", "Phone", "Address", "Payment", "Status", "Total_EGP"];
    const rows = orders.map((o) =>
      [
        esc(o.id),
        esc(o.date),
        esc(lang === "ar" ? o.customerAr : o.customerEn),
        esc(o.phone),
        esc(o.address),
        esc(o.payment),
        esc(o.status),
        o.total,
      ].join(",")
    );
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bahbah_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(t("adm.exported"));
  };

  return (
    <div className="space-y-4">
      {demo && <DemoModeBanner />}
      <DashboardSyncBar />
      {/* actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle
          icon={<TrendingUp className="size-5 text-[#1E4E8F]" />}
          title={t("adm.reports")}
        />
        <Button
          variant="outline"
          className="rounded-full px-4 text-xs font-bold"
          onClick={exportCsv}
        >
          <Download className="size-4" />
          {t("adm.export")}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* monthly combo */}
        <AdminCard className="lg:col-span-3">
          <p className="font-heading text-base font-black">{t("admin.chart")}</p>
          <div className="mt-3 h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthly} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1E4E8F" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#5B8BC4" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#5B6B7F" }} />
                <YAxis tick={{ fontSize: 10, fill: "#5B6B7F" }} tickFormatter={(v: number) => `${v / 1000}k`} />
                <Tooltip
                  formatter={(v, name) => [
                    name === "revenue"
                      ? `${Number(v).toLocaleString("en-US")} ${t("misc.egp")}`
                      : Number(v).toLocaleString("en-US"),
                    name === "revenue" ? t("admin.kpi1") : t("admin.chartOrders"),
                  ]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontFamily: "inherit", fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="url(#revBar)" radius={[6, 6, 0, 0]} maxBarSize={34} />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#F09428"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#F09428" }}
                  yAxisId={0}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        {/* payment methods */}
        <AdminCard className="lg:col-span-2">
          <p className="font-heading text-base font-black">{t("adm.payments")}</p>
          <div className="mt-3 h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paySplit}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={4}
                  stroke="none"
                >
                  {paySplit.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, name) => [`${v} ${t("admin.colOrder")}`, name]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontFamily: "inherit", fontSize: 12 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, fontFamily: "inherit", direction: lang === "ar" ? "rtl" : "ltr" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        {/* top products */}
        <AdminCard className="lg:col-span-3">
          <p className="font-heading text-base font-black">{t("adm.topProducts")}</p>
          <div className="mt-3 h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#5B6B7F" }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 10, fill: "#5B6B7F", fontFamily: "inherit" }}
                />
                <Tooltip
                  formatter={(v, name) => [
                    name === "rev"
                      ? `${Number(v).toLocaleString("en-US")} ${t("misc.egp")}`
                      : Number(v).toLocaleString("en-US"),
                    name === "rev" ? t("admin.kpi1") : t("admin.colOrdersN"),
                  ]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontFamily: "inherit", fontSize: 12 }}
                />
                <Bar dataKey="rev" fill="#F09428" radius={[0, 6, 6, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        {/* weekly revenue */}
        <AdminCard className="lg:col-span-2">
          <p className="font-heading text-base font-black">{t("adm.weekly")}</p>
          <div className="mt-3 h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#5B6B7F" }} />
                <YAxis tick={{ fontSize: 10, fill: "#5B6B7F" }} tickFormatter={(v: number) => `${v / 1000}k`} />
                <Tooltip
                  formatter={(v) => [`${Number(v).toLocaleString("en-US")} ${t("misc.egp")}`, t("adm.revToday")]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontFamily: "inherit", fontSize: 12 }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#2E9E6B" strokeWidth={2.5} dot={{ r: 3, fill: "#2E9E6B" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        {/* category stock value */}
        <AdminCard className="lg:col-span-5">
          <SectionTitle
            icon={<Wallet className="size-5 text-[#1E4E8F]" />}
            title={t("adm.invValue")}
          />
          <div className="mt-3 h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catShare} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#5B6B7F" }} />
                <YAxis tick={{ fontSize: 10, fill: "#5B6B7F" }} tickFormatter={(v: number) => `${v / 1000}k`} />
                <Tooltip
                  formatter={(v) => [`${Number(v).toLocaleString("en-US")} ${t("misc.egp")}`, t("adm.invValue")]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontFamily: "inherit", fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {catShare.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
