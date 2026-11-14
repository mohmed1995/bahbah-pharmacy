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
import { salesData, weeklyData, categories } from "@/lib/bahbah/data";
import { useBahbah, useT, useAdminProducts } from "@/lib/bahbah/store";
import { fmtPrice } from "./product-card";
import { AdminCard, SectionTitle, TableWrap, TH, TD, DEMO_CUSTOMERS, PIE_COLORS } from "./admin-ui";
import { toast } from "sonner";

/* ================================================================== */
/* CUSTOMERS                                                           */
/* ================================================================== */
export function CustomersSection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return DEMO_CUSTOMERS;
    return DEMO_CUSTOMERS.filter((c) =>
      [c.nameAr, c.nameEn, c.phone].join(" ").toLowerCase().includes(query)
    );
  }, [q]);

  const vipCount = DEMO_CUSTOMERS.filter((c) => c.spend >= 3000).length;

  const stats = [
    { icon: <Users className="size-5" />, tint: "bg-[#EAF1F9]", color: "text-[#1E4E8F]", value: "12,480", label: t("adm.totalCustomers") },
    { icon: <UserPlus className="size-5" />, tint: "bg-[#EAF6F1]", color: "text-[#2E9E6B]", value: "128", label: t("adm.newThisMonth") },
    { icon: <Crown className="size-5" />, tint: "bg-[#F09428]/15", color: "text-[#C56A0A]", value: String(vipCount), label: t("adm.vipCount") },
    { icon: <TrendingUp className="size-5" />, tint: "bg-[#EEF0F7]", color: "text-[#112D51]", value: fmtPrice(186, t), label: t("admin.kpi4") },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <AdminCard key={s.label} className="p-4">
            <span className={`grid size-10 place-items-center rounded-xl ${s.tint} ${s.color}`}>{s.icon}</span>
            <div className="mt-3 font-heading text-lg font-black md:text-xl">{s.value}</div>
            <div className="mt-0.5 text-[11px] font-bold text-muted-foreground">{s.label}</div>
          </AdminCard>
        ))}
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("adm.searchCustomers")}
          className="h-10 rounded-full ps-10 text-sm"
        />
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
  const orders = adminOrders ?? [];

  /* monthly revenue + orders combo */
  const monthly = salesData.map((m) => ({
    name: lang === "ar" ? m.monthAr : m.monthEn,
    revenue: m.revenue,
    orders: m.orders,
  }));

  /* payment split from live admin orders */
  const paySplit = useMemo(() => {
    const counters: Record<string, number> = { cod: 0, instapay: 0, card: 0 };
    orders.forEach((o) => {
      if (o.payment in counters) counters[o.payment] += 1;
    });
    const meta: Record<string, { label: string; color: string }> = {
      cod: { label: t("checkout.cod"), color: "#1E4E8F" },
      instapay: { label: t("checkout.instapay"), color: "#F09428" },
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

  /* category revenue demo (weighted by product count) */
  const catShare = useMemo(
    () =>
      categories.map((c, i) => ({
        name: lang === "ar" ? c.nameAr : c.nameEn,
        value: products.filter((p) => p.category === c.id).reduce((s, p) => s + p.stock * p.price, 0) + (6 - i) * 1400,
        color: PIE_COLORS[i % PIE_COLORS.length],
      })),
    [lang, products]
  );

  const weekly = weeklyData.map((d) => ({
    name: lang === "ar" ? d.dayAr : d.dayEn,
    revenue: d.revenue,
  }));

  return (
    <div className="space-y-4">
      {/* actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle
          icon={<TrendingUp className="size-5 text-[#1E4E8F]" />}
          title={t("adm.reports")}
        />
        <Button
          variant="outline"
          className="rounded-full px-4 text-xs font-bold"
          onClick={() => toast.success(t("adm.exported"))}
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
