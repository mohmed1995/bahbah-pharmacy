"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Heart,
  Scale,
  Calendar,
  Clock,
  User,
  Phone,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Minus,
  Sparkles,
  ShieldCheck,
  Stethoscope,
  Info,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  QrCode,
  Share2,
  Plus,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useBahbah, useT, type PatientMeasurement } from "@/lib/bahbah/store";
import { TableWrap, TH, TD } from "./admin-ui";
import { toast } from "sonner";
import { NewVitalsDialog } from "./vitals-dialog";

/* ------------------------------------------------------------------ */
/* Helpers for health classification                                   */
/* ------------------------------------------------------------------ */

export function getSugarStatus(
  sugar?: number,
  timing: PatientMeasurement["sugarTiming"] = "fasting"
) {
  if (sugar == null || sugar <= 0) return null;
  if (timing === "fasting") {
    if (sugar < 70) return { label: "منخفض (هبوط)", color: "text-amber-600 bg-amber-50 border-amber-200", status: "low" };
    if (sugar <= 100) return { label: "طبيعي ومثالي", color: "text-emerald-700 bg-emerald-50 border-emerald-200", status: "normal" };
    if (sugar <= 125) return { label: "مرحلة ما قبل السكري", color: "text-amber-700 bg-amber-50 border-amber-200", status: "pre" };
    return { label: "مرتفع عن المعدل", color: "text-red-700 bg-red-50 border-red-200", status: "high" };
  } else {
    // عشوائي أو بعد الأكل
    if (sugar < 80) return { label: "منخفض", color: "text-amber-600 bg-amber-50 border-amber-200", status: "low" };
    if (sugar <= 140) return { label: "طبيعي ومثالي", color: "text-emerald-700 bg-emerald-50 border-emerald-200", status: "normal" };
    if (sugar <= 199) return { label: "مرتفع قليلاً (فوق الطبيعي)", color: "text-amber-700 bg-amber-50 border-amber-200", status: "pre" };
    return { label: "مرتفع يستلزم مراجعة", color: "text-red-700 bg-red-50 border-red-200", status: "high" };
  }
}

export function getBPStatus(systolic?: number, diastolic?: number) {
  if (!systolic || !diastolic) return null;
  if (systolic < 90 || diastolic < 60) {
    return { label: "ضغط منخفض", color: "text-amber-600 bg-amber-50 border-amber-200", level: "low" };
  }
  if (systolic <= 120 && diastolic <= 80) {
    return { label: "ضغط دم مثالي", color: "text-emerald-700 bg-emerald-50 border-emerald-200", level: "ideal" };
  }
  if (systolic <= 129 && diastolic < 80) {
    return { label: "ضغط دم مرتفع طفيفاً", color: "text-amber-700 bg-amber-50 border-amber-200", level: "elevated" };
  }
  if (systolic <= 139 || diastolic <= 89) {
    return { label: "ارتفاع مرحلة 1", color: "text-orange-700 bg-orange-50 border-orange-200", level: "stage1" };
  }
  return { label: "ارتفاع مرحلة 2 (مرتفع)", color: "text-red-700 bg-red-50 border-red-200", level: "stage2" };
}

export function getBmiStatus(bmi?: number) {
  if (!bmi || bmi <= 0) return null;
  if (bmi < 18.5) return { label: "نقص وزن (نحافة)", color: "text-amber-600 bg-amber-50" };
  if (bmi < 25) return { label: "وزن مثالي وصحي", color: "text-emerald-700 bg-emerald-50" };
  if (bmi < 30) return { label: "زيادة وزن خفيفة", color: "text-amber-700 bg-amber-50" };
  return { label: "سمنة", color: "text-red-700 bg-red-50" };
}

export function timingArabic(timing?: PatientMeasurement["sugarTiming"]) {
  switch (timing) {
    case "fasting":
      return "صائم (8 ساعات)";
    case "postprandial":
      return "بعد الأكل بساعتين";
    case "random":
      return "سكر عشوائي";
    case "bedtime":
      return "قبل النوم";
    default:
      return "قياس سكر";
  }
}

/* ------------------------------------------------------------------ */
/* Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function VitalsPortal() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const user = useBahbah((s) => s.user);
  const careSubs = useBahbah((s) => s.careSubs);
  const measurements = useBahbah((s) => s.measurements);
  const go = useBahbah((s) => s.go);

  const [inputCode, setInputCode] = useState(user?.phone || "");
  const [activeCode, setActiveCode] = useState<string | null>(user?.phone || null);
  const [selectedMetric, setSelectedMetric] = useState<"sugar" | "bp" | "weight">("sugar");
  const [openAddModal, setOpenAddModal] = useState(false);

  // Lookup results
  const patientRecords = useMemo(() => {
    if (!activeCode) return [];
    const norm = activeCode.trim().toLowerCase().replace(/[\s-]/g, "");
    return measurements
      .filter((m) => {
        const codeNorm = m.patientCode.trim().toLowerCase().replace(/[\s-]/g, "");
        const phoneNorm = m.patientPhone.trim().toLowerCase().replace(/[\s-]/g, "");
        return codeNorm === norm || phoneNorm === norm || (norm.length >= 4 && (codeNorm.includes(norm) || phoneNorm.includes(norm)));
      })
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  }, [measurements, activeCode]);

  const latest = patientRecords[0] || null;

  // Chart data sorted chronologically
  const chartData = useMemo(() => {
    return [...patientRecords]
      .reverse()
      .map((m) => {
        const d = new Date(m.recordedAt);
        const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
        return {
          date: dateStr,
          rawDate: m.recordedAt,
          bloodSugar: m.bloodSugar ?? null,
          systolic: m.systolic ?? null,
          diastolic: m.diastolic ?? null,
          weight: m.weight ?? null,
          pulse: m.pulse ?? null,
          timing: timingArabic(m.sugarTiming),
        };
      });
  }, [patientRecords]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputCode.trim();
    if (!clean) {
      toast.error(lang === "ar" ? "برجاء كتابة كود المريض أو رقم الهاتف" : "Please enter your code or phone");
      return;
    }
    setActiveCode(clean);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 md:px-6 md:pb-24">
      {/* Top Breadcrumb / Back button */}
      <div className="flex items-center justify-between gap-3 pb-4">
        <button
          onClick={() => go("home")}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowRight className="size-4 rtl:inline ltr:hidden" />
          <ArrowLeft className="size-4 ltr:inline rtl:hidden" />
          <span>{t("nav.home")}</span>
          <span className="opacity-50">/</span>
          <span className="text-[#184C8A] font-black">{lang === "ar" ? "بوابة قياسات المريض" : "Patient Vitals Portal"}</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setOpenAddModal(true)}
            className="h-9 rounded-full bg-[#2E9E6B] px-4 text-xs font-black text-white hover:bg-[#238156] shadow-sm flex items-center gap-1.5"
          >
            <Plus className="size-3.5" />
            <span>{lang === "ar" ? "+ تسجيل قياس جديد" : "+ Record Vitals"}</span>
          </Button>

          <Badge className="gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border-emerald-200 px-3 py-1 text-[11px] font-bold">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span>{lang === "ar" ? "خدمة طبية مجانية لعملاء الصيدلية" : "Free Health Monitoring"}</span>
          </Badge>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1E38] via-[#184C8A] to-[#1D4ED8] p-6 text-white shadow-xl md:p-10">
        <div className="pointer-events-none absolute -bottom-16 -start-10 size-60 rounded-full bg-[#F59E0B]/20 blur-3xl" />
        <div className="pointer-events-none absolute -top-12 -end-10 size-72 rounded-full bg-[#10B981]/20 blur-3xl" />

        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-amber-300 backdrop-blur-md ring-1 ring-white/15">
            <Activity className="size-3.5 animate-pulse text-amber-400" />
            <span>{lang === "ar" ? "متابعة السكر والضغط والوزن دورياً" : "Blood Sugar, Pressure & Weight Tracker"}</span>
          </div>

          <h1 className="mt-3 font-heading text-2xl font-black md:text-4xl leading-tight">
            {lang === "ar" ? "بوابة المريض لمتابعة القياسات الصحية" : "Your Personal Health & Vitals Portal"}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-white/80 md:text-sm">
            {lang === "ar"
              ? "قست السكر أو الضغط أو الوزن في صيدلية بحبح؟ اكتب كودك الخاص أو رقم هاتفك لتستعرض جميع قياساتك السابقة، ونصائح دكتور الصيدلية المخصصة لحالتك."
              : "Track your historical readings recorded at Bahbah Pharmacy anytime by entering your patient code or mobile number."}
          </p>

          {/* Quick Search Bar */}
          <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder={lang === "ar" ? "اكتب كود المريض (مثال: BB-C-101) أو رقم الموبايل..." : "Enter code or phone..."}
                className="h-12 w-full rounded-2xl border-white/20 bg-white/95 ps-10 text-xs font-bold text-slate-900 placeholder:text-slate-400 shadow-md focus-visible:ring-[#F59E0B]"
                dir="ltr"
              />
            </div>
            <Button
              type="submit"
              className="h-12 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#EA580C] px-7 text-xs font-black text-white shadow-lg transition hover:brightness-105 active:scale-95"
            >
              <Search className="size-4 me-1.5" />
              {lang === "ar" ? "عرض قياساتي الصحية" : "View My Records"}
            </Button>
            <Button
              type="button"
              onClick={() => setOpenAddModal(true)}
              className="h-12 rounded-2xl bg-[#2E9E6B] hover:bg-[#238156] px-5 text-xs font-black text-white shadow-lg transition active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="size-4" />
              <span>{lang === "ar" ? "+ تسجيل قياس جديد" : "+ Record Vitals"}</span>
            </Button>
          </form>

          {/* Privacy note */}
          <div className="mt-3 flex items-center gap-1.5 text-xs text-white/80">
            <ShieldCheck className="size-4 text-emerald-300" />
            <span>
              {lang === "ar"
                ? "بياناتك الصحية مشفرة ومحمية — لا يمكن لأي شخص الاطلاع على قياساتك إلا بكودك الخاص أو رقم هاتفك."
                : "Your health records are strictly confidential and protected."}
            </span>
          </div>
        </div>
      </div>

      {/* Patient Profile Card (If found) */}
      {patientRecords.length > 0 && latest && (
        <div className="mt-6 space-y-6">
          {/* Header Info */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3.5">
              <span className="grid size-14 place-items-center rounded-2xl bg-[#EAF2FA] text-[#184C8A] font-heading font-black shadow-xs">
                <User className="size-7 text-[#184C8A]" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-lg font-black text-foreground md:text-xl">
                    {latest.patientName}
                  </h2>
                  <Badge className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                    {lang === "ar" ? "ملف قياسات معتمد" : "Verified Records"}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-semibold">
                  <span className="flex items-center gap-1">
                    <QrCode className="size-3 text-[#F59E0B]" />
                    <span className="font-mono text-foreground font-bold">{latest.patientCode}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1" dir="ltr">
                    <Phone className="size-3 text-emerald-600" />
                    <span>{latest.patientPhone}</span>
                  </span>
                  <span>•</span>
                  <span>{patientRecords.length} {lang === "ar" ? "قياسات مسجلة" : "recordings"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://wa.me/201011500166?text=${encodeURIComponent(
                  `السلام عليكم دكتور، أنا المريض ${latest.patientName} (كود: ${latest.patientCode})، وأرغب في استشارة صيدلية بحبح بخصوص قياساتي الأخيرة.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#25D366] px-4 text-xs font-black text-white shadow-sm hover:brightness-105"
              >
                <Phone className="size-3.5" />
                <span>{lang === "ar" ? "استشارة الصيدلي عبر واتساب" : "WhatsApp Pharmacist"}</span>
              </a>
            </div>
          </div>

          {/* KPI Snapshot Cards for Latest Values */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* 1. Blood Sugar Card */}
            {(() => {
              const sugarSt = getSugarStatus(latest.bloodSugar, latest.sugarTiming);
              return (
                <Card className="rounded-3xl border-border/80 shadow-xs hover:shadow-md transition">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="grid size-11 place-items-center rounded-2xl bg-amber-50 text-[#C56A0A]">
                        <Activity className="size-5" />
                      </span>
                      {sugarSt && (
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${sugarSt.color}`}>
                          {sugarSt.label}
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="text-xs font-bold text-muted-foreground">
                        {lang === "ar" ? "قياس السكر في الدم" : "Blood Sugar"}
                      </p>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="font-heading text-3xl font-black text-foreground">
                          {latest.bloodSugar != null ? latest.bloodSugar : "—"}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">mg/dL</span>
                      </div>
                      <p className="mt-1 text-[11px] font-bold text-muted-foreground/90">
                        {timingArabic(latest.sugarTiming)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* 2. Blood Pressure Card */}
            {(() => {
              const bpSt = getBPStatus(latest.systolic, latest.diastolic);
              return (
                <Card className="rounded-3xl border-border/80 shadow-xs hover:shadow-md transition">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="grid size-11 place-items-center rounded-2xl bg-red-50 text-red-600">
                        <Heart className="size-5" />
                      </span>
                      {bpSt && (
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${bpSt.color}`}>
                          {bpSt.label}
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="text-xs font-bold text-muted-foreground">
                        {lang === "ar" ? "ضغط الدم (انقباضي / انبساطي)" : "Blood Pressure"}
                      </p>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="font-heading text-3xl font-black text-foreground">
                          {latest.systolic && latest.diastolic ? `${latest.systolic} / ${latest.diastolic}` : "—"}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">mmHg</span>
                      </div>
                      <p className="mt-1 text-[11px] font-bold text-muted-foreground/90">
                        {latest.pulse ? `النبض: ${latest.pulse} نبضة/دقيقة` : "المعدل الطبيعي: 120/80"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* 3. Weight & BMI Card */}
            {(() => {
              const bmiSt = getBmiStatus(latest.bmi);
              return (
                <Card className="rounded-3xl border-border/80 shadow-xs hover:shadow-md transition">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                        <Scale className="size-5" />
                      </span>
                      {bmiSt && (
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${bmiSt.color}`}>
                          {bmiSt.label}
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="text-xs font-bold text-muted-foreground">
                        {lang === "ar" ? "الوزن ومؤشر كتلة الجسم" : "Weight & BMI"}
                      </p>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="font-heading text-3xl font-black text-foreground">
                          {latest.weight != null ? latest.weight : "—"}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">كجم</span>
                        {latest.bmi != null && (
                          <span className="ms-2 text-xs font-bold text-[#184C8A]">
                            (BMI: {latest.bmi})
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] font-bold text-muted-foreground/90">
                        {latest.height ? `الطول: ${latest.height} سم` : "متابعة تطور الوزن"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>

          {/* Latest Pharmacist Note & Advice */}
          {latest.pharmacistNotes && (
            <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-r from-amber-50/70 via-orange-50/50 to-amber-50/40 p-5 shadow-xs">
              <div className="flex items-start gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white shadow-xs">
                  <Stethoscope className="size-5" />
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-sm font-black text-amber-950">
                      {lang === "ar" ? "توصيات وملاحظات صيدلي بحبح لآخر قياس:" : "Pharmacist Notes & Guidance:"}
                    </h3>
                    {latest.recordedBy && (
                      <span className="text-[11px] font-bold text-amber-800/80">({latest.recordedBy})</span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-amber-900 font-medium">
                    {latest.pharmacistNotes}
                  </p>
                  <p className="text-[10px] font-bold text-amber-700 pt-1">
                    تاريخ التسجيل: {new Date(latest.recordedAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Chart Section */}
          <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div>
                <h3 className="font-heading text-base font-black text-foreground md:text-lg">
                  {lang === "ar" ? "الرسم البياني لتطور القياسات عبر الزمن" : "Vitals Progress Chart"}
                </h3>
                <p className="text-xs font-semibold text-muted-foreground">
                  {lang === "ar" ? "تابع استقرار القياسات ومدى التزامك بالعلاج ونمط الحياة" : "Track how your vital readings change over time"}
                </p>
              </div>

              {/* Metric Switch Tabs */}
              <div className="flex items-center gap-1.5 rounded-2xl bg-muted/80 p-1">
                <button
                  type="button"
                  onClick={() => setSelectedMetric("sugar")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    selectedMetric === "sugar"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Activity className="size-3.5" />
                  <span>{lang === "ar" ? "السكر" : "Blood Sugar"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMetric("bp")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    selectedMetric === "bp"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Heart className="size-3.5" />
                  <span>{lang === "ar" ? "الضغط" : "Pressure"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMetric("weight")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    selectedMetric === "weight"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Scale className="size-3.5" />
                  <span>{lang === "ar" ? "الوزن" : "Weight"}</span>
                </button>
              </div>
            </div>

            {/* Chart Canvas */}
            <div className="pt-6">
              {chartData.length < 2 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Activity className="size-10 text-muted-foreground/40" />
                  <p className="mt-2 text-xs font-bold">
                    {lang === "ar"
                      ? "يوجد قياس واحد حالياً. ستظهر المقارنة والرسم البياني بمجرد تسجيل قياسك القادم في الصيدلية!"
                      : "Chart requires at least two measurements to show trends."}
                  </p>
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0B1E38",
                          color: "#fff",
                          borderRadius: "12px",
                          border: "none",
                          fontSize: "12px",
                        }}
                      />
                      {selectedMetric === "sugar" && (
                        <>
                          <ReferenceLine y={100} stroke="#10B981" strokeDasharray="3 3" label={{ value: "طبيعي صائم 100", fill: "#10B981", fontSize: 10 }} />
                          <ReferenceLine y={140} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: "طبيعي بعد الأكل 140", fill: "#F59E0B", fontSize: 10 }} />
                          <Line
                            type="monotone"
                            dataKey="bloodSugar"
                            name="السكر (mg/dL)"
                            stroke="#F59E0B"
                            strokeWidth={3}
                            dot={{ r: 5, fill: "#F59E0B", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 7 }}
                          />
                        </>
                      )}
                      {selectedMetric === "bp" && (
                        <>
                          <ReferenceLine y={120} stroke="#10B981" strokeDasharray="3 3" />
                          <ReferenceLine y={80} stroke="#10B981" strokeDasharray="3 3" />
                          <Line
                            type="monotone"
                            dataKey="systolic"
                            name="الانقباضي (العالي)"
                            stroke="#EF4444"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: "#EF4444" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="diastolic"
                            name="الانبساطي (الواطي)"
                            stroke="#3B82F6"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: "#3B82F6" }}
                          />
                        </>
                      )}
                      {selectedMetric === "weight" && (
                        <Line
                          type="monotone"
                          dataKey="weight"
                          name="الوزن (كجم)"
                          stroke="#10B981"
                          strokeWidth={3}
                          dot={{ r: 5, fill: "#10B981", strokeWidth: 2, stroke: "#fff" }}
                          activeDot={{ r: 7 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Historical Logs Table */}
          <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3">
              <h3 className="font-heading text-base font-black text-foreground">
                {lang === "ar" ? "جدول سجل القياسات الكامل بالتفصيل" : "Full Historical Log"}
              </h3>
              <span className="text-xs font-bold text-muted-foreground">
                {patientRecords.length} {lang === "ar" ? "قياس" : "records"}
              </span>
            </div>

            <TableWrap>
              <table className="w-full min-w-[700px] text-xs">
                <thead className="border-b border-border bg-muted/50 text-[11px]">
                  <tr>
                    <th className={TH}>{lang === "ar" ? "تاريخ ووقت القياس" : "Date & Time"}</th>
                    <th className={TH}>{lang === "ar" ? "قياس السكر" : "Blood Sugar"}</th>
                    <th className={TH}>{lang === "ar" ? "ضغط الدم والنبض" : "Blood Pressure & Pulse"}</th>
                    <th className={TH}>{lang === "ar" ? "الوزن و BMI" : "Weight & BMI"}</th>
                    <th className={TH}>{lang === "ar" ? "ملاحظات الصيدلي" : "Pharmacist Advice"}</th>
                  </tr>
                </thead>
                <tbody>
                  {patientRecords.map((rec) => {
                    const sugarSt = getSugarStatus(rec.bloodSugar, rec.sugarTiming);
                    const bpSt = getBPStatus(rec.systolic, rec.diastolic);
                    const bmiSt = getBmiStatus(rec.bmi);
                    const dt = new Date(rec.recordedAt);
                    const formattedDate = `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()} - ${dt.toLocaleTimeString(
                      lang === "ar" ? "ar-EG" : "en-US",
                      { hour: "2-digit", minute: "2-digit" }
                    )}`;

                    return (
                      <tr key={rec.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        <td className={TD}>
                          <span className="font-bold text-foreground block">{formattedDate}</span>
                          <span className="text-[10px] text-muted-foreground">{rec.recordedBy || "صيدلية بحبح"}</span>
                        </td>
                        <td className={TD}>
                          {rec.bloodSugar != null ? (
                            <div className="space-y-0.5">
                              <span className="font-heading font-black text-sm text-foreground">
                                {rec.bloodSugar} mg/dL
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground">
                                  {timingArabic(rec.sugarTiming)}
                                </span>
                                {sugarSt && (
                                  <Badge className={`h-4 text-[9px] px-1.5 font-bold ${sugarSt.color}`}>
                                    {sugarSt.label}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className={TD}>
                          {rec.systolic && rec.diastolic ? (
                            <div className="space-y-0.5">
                              <span className="font-heading font-black text-sm text-foreground">
                                {rec.systolic} / {rec.diastolic} mmHg
                              </span>
                              <div className="flex items-center gap-1">
                                {rec.pulse && (
                                  <span className="text-[10px] text-muted-foreground">
                                    نبض: {rec.pulse}
                                  </span>
                                )}
                                {bpSt && (
                                  <Badge className={`h-4 text-[9px] px-1.5 font-bold ${bpSt.color}`}>
                                    {bpSt.label}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className={TD}>
                          {rec.weight != null ? (
                            <div className="space-y-0.5">
                              <span className="font-heading font-black text-sm text-foreground">
                                {rec.weight} كجم
                              </span>
                              {rec.bmi != null && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-muted-foreground">
                                    BMI: {rec.bmi}
                                  </span>
                                  {bmiSt && (
                                    <Badge className={`h-4 text-[9px] px-1.5 font-bold ${bmiSt.color}`}>
                                      {bmiSt.label}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className={`${TD} max-w-[240px]`}>
                          {rec.pharmacistNotes ? (
                            <p className="text-xs leading-relaxed text-foreground/90 font-medium">
                              {rec.pharmacistNotes}
                            </p>
                          ) : (
                            <span className="text-muted-foreground">لا توجد ملاحظات إضافية</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          </div>

          {/* Healthy Guidelines Educational Section */}
          <div className="rounded-3xl border border-blue-200 bg-blue-50/60 p-6 dark:border-blue-950 dark:bg-blue-950/20">
            <div className="flex items-center gap-2.5">
              <Info className="size-5 text-[#184C8A]" />
              <h3 className="font-heading text-sm font-black text-[#184C8A] md:text-base">
                {lang === "ar" ? "المعدلات الصحية الاسترشادية المعتمدة طبياً:" : "Medical Reference Guidelines:"}
              </h3>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3 text-xs leading-relaxed">
              <div className="rounded-2xl bg-white p-4 shadow-2xs border border-border/60">
                <p className="font-heading font-black text-amber-700">معدلات السكر في الدم</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>• <strong className="text-foreground">صائم طبيعي:</strong> من 70 إلى 99 mg/dL</li>
                  <li>• <strong className="text-foreground">ما قبل السكري صائم:</strong> من 100 إلى 125</li>
                  <li>• <strong className="text-foreground">بعد الأكل بساعتين:</strong> أقل من 140 mg/dL</li>
                </ul>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-2xs border border-border/60">
                <p className="font-heading font-black text-red-600">معدلات ضغط الدم</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>• <strong className="text-foreground">ضغط مثالي:</strong> أقل من 120/80 mmHg</li>
                  <li>• <strong className="text-foreground">ضغط مرتفع طفيف:</strong> 120-129 / أقل من 80</li>
                  <li>• <strong className="text-foreground">ارتفاع مرحلة 1:</strong> 130-139 أو 80-89</li>
                </ul>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-2xs border border-border/60">
                <p className="font-heading font-black text-emerald-700">مؤشر كتلة الجسم (BMI)</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>• <strong className="text-foreground">طبيعي وصحي:</strong> من 18.5 إلى 24.9</li>
                  <li>• <strong className="text-foreground">زيادة في الوزن:</strong> من 25 إلى 29.9</li>
                  <li>• <strong className="text-foreground">سمنة:</strong> 30 فما فوق</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State: Initial Prompt vs Not Found */}
      {patientRecords.length === 0 && (
        <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card p-10 text-center shadow-xs">
          <div className="grid size-16 place-items-center rounded-2xl bg-[#EAF1F9] text-[#184C8A]">
            <Activity className="size-8 text-[#184C8A]" />
          </div>
          <h2 className="mt-4 font-heading text-lg font-black text-foreground">
            {!activeCode
              ? (lang === "ar" ? "أدخل رقم هاتفك أو كود المريض الخاص بك" : "Enter Your Phone or Patient Code")
              : (lang === "ar" ? `لم نجد قياسات مسجلة برقم (${activeCode})` : "No Records Found")}
          </h2>
          <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
            {!activeCode
              ? (lang === "ar"
                  ? "لعرض سجلك الطبي والقياسات الدورية (السكر، الضغط، الوزن) مع المخطط البياني ونصائح الصيدلي، اكتب رقم هاتفك في الخانة بالأعلى واضغط عرض."
                  : "Type your registered phone number or patient code above to view your historical measurements and charts.")
              : (lang === "ar"
                  ? "تأكد من كتابة كود المريض أو رقم الهاتف المسجل في صيدلية بحبح بشكل صحيح. كما يمكنك زيارة الصيدلية لقياس السكر والضغط مجاناً وسيقوم الصيدلي بإضافتها لملفك."
                  : "Please verify your patient code or visit Bahbah Pharmacy to record your vitals.")}
          </p>
          <div className="mt-5 flex flex-wrap gap-3 justify-center">
            <Button
              className="rounded-full bg-[#2E9E6B] text-xs font-bold text-white hover:bg-[#238156] gap-1.5"
              onClick={() => setOpenAddModal(true)}
            >
              <Plus className="size-4" />
              <span>{lang === "ar" ? "تسجيل قياس جديد الآن" : "Record First Measurement"}</span>
            </Button>
            <Button
              variant="outline"
              className="rounded-full text-xs font-bold"
              onClick={() => go("care")}
            >
              {lang === "ar" ? "الاشتراك في رعاية الأدوية الشهرية" : "Chronic Care Subscription"}
            </Button>
          </div>
        </div>
      )}

      {/* Shared Record Vitals Dialog */}
      <NewVitalsDialog
        open={openAddModal}
        onOpenChange={setOpenAddModal}
        initialPhone={user?.phone || activeCode || ""}
        initialName={latest?.patientName || user?.name || ""}
        initialCode={activeCode || ""}
      />
    </main>
  );
}
