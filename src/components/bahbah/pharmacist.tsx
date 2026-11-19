"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Search,
  Pill,
  FileWarning,
  Package,
  Clock,
  AlertTriangle,
  Plus,
  CheckCircle2,
  XCircle,
  FileText,
  Phone,
  ArrowRight,
  ArrowLeft,
  LogIn,
  MapPin,
  Tag,
  Activity,
  Heart,
  Scale,
  User,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminOrders as adminDemoOrders, categories, discountPct } from "@/lib/bahbah/data";
import { useBahbah, useT, useAdminProducts, hasPermission, type Product, type PatientMeasurement } from "@/lib/bahbah/store";
import { fmtPrice, ProductVisual } from "./product-card";
import { CustomerContactMenu } from "./contact-menu";
import { RxPhotoLink } from "./rx-photo";
import { KpiCard, daysUntil, TableWrap, TH, TD } from "./admin-ui";
import { StaffGate } from "./courier";
import { IconPharmacist, IconRxClipboard, IconWhatsapp } from "./icons";
import { getSugarStatus, getBPStatus, getBmiStatus, timingArabic } from "./vitals";
import PatientTimeline, { phonesMatch } from "./patient-timeline";
import { NursingQueue } from "./admin-nursing";
import { isNightOrder } from "@/lib/bahbah/curation";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Pharmacist portal — مخزون + بحث + روشتات + طلبات التحضير + القياسات */
/* ------------------------------------------------------------------ */

export default function PharmacistPortal() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const user = useBahbah((s) => s.user);
  const sessionRole = useBahbah((s) => s.sessionRole);
  const adminOrders = useBahbah((s) => s.adminOrders);
  const rxQueue = useBahbah((s) => s.rxQueue);
  const measurements = useBahbah((s) => s.measurements);
  const careSubs = useBahbah((s) => s.careSubs);
  const allProducts = useAdminProducts();
  const { go, pharmacistReady, adminSetRx, restock, addMeasurement, deleteMeasurement, setWhatsappOrderStatus, setShortageRequestStatus } = useBahbah();
  /* تحديثات الحالات بقت بترجّع نتيجة مؤكدة من السيرفر — الفشل لازم
     يبان للطاقم بتنبيه بدل ما الزرار «يشتغل» والحالة ما تتغيرش (D9) */
  const waStatus = async (id: string, status: Parameters<typeof setWhatsappOrderStatus>[1]) => {
    const ok = await setWhatsappOrderStatus(id, status);
    if (!ok) toast.error(lang === "ar" ? "تعذّر تحديث حالة طلب الواتساب على السيرفر — حاول تاني" : "Could not update the WhatsApp order on the server — try again");
  };
  const shortageStatus = async (id: string, status: Parameters<typeof setShortageRequestStatus>[1]) => {
    const ok = await setShortageRequestStatus(id, status);
    if (!ok) toast.error(lang === "ar" ? "تعذّر تحديث حالة طلب الناقص على السيرفر — حاول تاني" : "Could not update the shortage request on the server — try again");
  };
  const whatsappOrders = useBahbah((s) => s.whatsappOrders);
  const shortageRequests = useBahbah((s) => s.shortageRequests);

  /* صلاحيات المدير الموزعة على الصيدلي ده (افتراضات الدور لو مفيش صف مخصص) */
  const canOrders = useBahbah((s) => hasPermission(s, "orders"));
  const canRx = useBahbah((s) => hasPermission(s, "prescriptions"));
  const canMedicines = useBahbah((s) => hasPermission(s, "medicines"));
  const canWhatsapp = useBahbah((s) => hasPermission(s, "whatsapp_orders"));
  const canShortages = useBahbah((s) => hasPermission(s, "shortages"));
  const canNursing = useBahbah((s) => hasPermission(s, "nursing"));
  const canMeasurements = useBahbah((s) => hasPermission(s, "measurements"));
  const canOrdersTab = canOrders || canRx || canMedicines || canWhatsapp || canShortages || canNursing;

  const [portalTab, setPortalTab] = useState<"orders" | "vitals" | "file">("orders");
  const visibleTabs = [
    ...(canOrdersTab ? ["orders" as const] : []),
    ...(canMeasurements ? ["vitals" as const, "file" as const] : []),
  ];
  const effectiveTab = visibleTabs.includes(portalTab) ? portalTab : (visibleTabs[0] ?? "orders");
  const [q, setQ] = useState("");

  // Patient file lookup (by phone)
  const [filePhoneInput, setFilePhoneInput] = useState("");
  const [filePhone, setFilePhone] = useState<string | null>(null);

  // Measurement Modal & Form
  const [openMeasModal, setOpenMeasModal] = useState(false);
  const [patientCode, setPatientCode] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");
  const [sugarTiming, setSugarTiming] = useState<PatientMeasurement["sugarTiming"]>("fasting");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [pharmacistNotes, setPharmacistNotes] = useState("");
  const [savingMeas, setSavingMeas] = useState(false);

  // Vitals filter search
  const [vitalsSearch, setVitalsSearch] = useState("");

  // Unified patient timeline dialog (by phone)
  const [timelinePhone, setTimelinePhone] = useState<string | null>(null);

  const orders = adminOrders ?? [];
  const pending = orders.filter((o) => o.status === "pending");
  const readyOrders = orders.filter((o) => o.status === "ready");
  const lowStock = allProducts.filter((p) => p.stock > 0 && p.stock < 30);
  const outStock = allProducts.filter((p) => p.stock === 0);
  const expiring = allProducts.filter((p) => {
    const d = daysUntil(p.expiry);
    return d >= 0 && d < 90;
  });
  const newRx = rxQueue.filter((r) => r.status === "new");

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return allProducts
      .filter(
        (p) =>
          p.nameAr.includes(q.trim()) ||
          p.nameEn.toLowerCase().includes(s) ||
          p.ingredientAr.includes(q.trim()) ||
          p.ingredientEn.toLowerCase().includes(s) ||
          p.brandAr.includes(q.trim()) ||
          p.brandEn.toLowerCase().includes(s)
      )
      .slice(0, 8);
  }, [q, allProducts]);

  const filteredMeasurements = useMemo(() => {
    const s = vitalsSearch.trim().toLowerCase();
    if (!s) return measurements;
    return measurements.filter(
      (m) =>
        m.patientName.toLowerCase().includes(s) ||
        m.patientCode.toLowerCase().includes(s) ||
        m.patientPhone.includes(s)
    );
  }, [measurements, vitalsSearch]);

  const handleSaveMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      toast.error(lang === "ar" ? "برجاء كتابة اسم المريض" : "Please enter patient name");
      return;
    }
    if (!patientCode.trim() && !patientPhone.trim()) {
      toast.error(lang === "ar" ? "برجاء كتابة كود المريض أو رقم الهاتف" : "Please enter code or phone");
      return;
    }

    const code = patientCode.trim() || `BB-${patientPhone.trim().slice(-4) || "P"}`;
    const sugarNum = bloodSugar ? Number(bloodSugar) : undefined;
    const sysNum = systolic ? Number(systolic) : undefined;
    const diaNum = diastolic ? Number(diastolic) : undefined;
    const pulseNum = pulse ? Number(pulse) : undefined;
    const weightNum = weight ? Number(weight) : undefined;
    const heightNum = height ? Number(height) : undefined;

    setSavingMeas(true);
    try {
      await addMeasurement({
        patientCode: code,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        bloodSugar: sugarNum,
        sugarTiming,
        systolic: sysNum,
        diastolic: diaNum,
        pulse: pulseNum,
        weight: weightNum,
        height: heightNum,
        pharmacistNotes: pharmacistNotes.trim() || undefined,
        recordedBy: user?.name ? `د. ${user.name}` : "د. بحبح — صيدلية بحبح",
      });

      toast.success(
        lang === "ar"
          ? `تم حفظ قياسات المريض (${patientName}) بنجاح بالكود: ${code}`
          : "Measurement recorded successfully!"
      );

      // Reset Form
      setBloodSugar("");
      setSystolic("");
      setDiastolic("");
      setPulse("");
      setWeight("");
      setHeight("");
      setPharmacistNotes("");
      setOpenMeasModal(false);
    } catch {
      toast.error(lang === "ar" ? "حدث خطأ أثناء الحفظ" : "Failed to record measurement");
    } finally {
      setSavingMeas(false);
    }
  };

  if (!user || sessionRole !== "pharmacist") return <StaffGatePharm />;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-5 md:px-6 md:pb-12">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#2E9E6B] text-white shadow-md">
            <IconPharmacist className="size-6" />
          </span>
          <div>
            <h1 className="font-heading text-xl font-black md:text-2xl">{t("pharm.title")}</h1>
            <p className="text-xs font-bold text-muted-foreground md:text-sm">{t("pharm.sub")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full font-bold text-xs"
            onClick={() => go("vitals")}
          >
            <Activity className="size-3.5 text-[#184C8A] me-1" />
            {lang === "ar" ? "بوابة قياسات المرضى" : "Vitals Portal"}
          </Button>
          <Button variant="outline" size="sm" className="rounded-full font-bold" onClick={() => go("home")}>
            <ArrowRight className="size-4 rtl:inline ltr:hidden" />
            <ArrowLeft className="size-4 ltr:inline rtl:hidden" />
            {t("admin.back")}
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-5 flex items-center justify-between border-b border-border/80 pb-2">
        <div className="flex items-center gap-2">
          {canOrdersTab && (
            <button
              onClick={() => setPortalTab("orders")}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black transition ${
                effectiveTab === "orders"
                  ? "bg-[#184C8A] text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Package className="size-4" />
              <span>{lang === "ar" ? "الطلبات والمخزون والروشتات" : "Orders & Stock"}</span>
              {pending.length > 0 && (
                <span className="rounded-full bg-amber-400 px-1.5 py-0.2 text-[10px] font-black text-slate-900">
                  {pending.length}
                </span>
              )}
            </button>
          )}

          {canMeasurements && (
            <button
              onClick={() => setPortalTab("vitals")}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black transition ${
                effectiveTab === "vitals"
                  ? "bg-[#2E9E6B] text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Activity className="size-4" />
              <span>{lang === "ar" ? "قياسات السكر والضغط والوزن" : "Vitals & Measurements"}</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                {measurements.length}
              </span>
            </button>
          )}

          {canMeasurements && (
            <button
              onClick={() => setPortalTab("file")}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black transition ${
                effectiveTab === "file"
                  ? "bg-[#B45E0A] text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <User className="size-4" />
              <span>{lang === "ar" ? "ملف المريض" : "Patient File"}</span>
            </button>
          )}
        </div>

        {effectiveTab === "vitals" && (
          <Button
            size="sm"
            className="rounded-full bg-[#2E9E6B] text-xs font-black text-white hover:bg-[#238156]"
            onClick={() => setOpenMeasModal(true)}
          >
            <Plus className="size-3.5 me-1" />
            {lang === "ar" ? "تسجيل قياس جديد لمريض" : "New Measurement"}
          </Button>
        )}
      </div>

      {/* ================= TAB 1: ORDERS & INVENTORY ================= */}
      {effectiveTab === "orders" && (
        <div className="space-y-6 pt-2">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard icon={<Package className="size-5" />} tint="bg-[#EAF1F9]" color="text-[#1E4E8F]" value={String(pending.length)} label={t("pharm.kpiNew")} />
            <KpiCard icon={<FileText className="size-5" />} tint="bg-[#FFF4E5]" color="text-[#B45E0A]" value={String(newRx.length)} label={t("pharm.kpiRx")} />
            <KpiCard icon={<AlertTriangle className="size-5" />} tint="bg-[#DC4B4B]/10" color="text-[#DC4B4B]" value={String(lowStock.length + outStock.length)} label={t("pharm.kpiLow")} />
            <KpiCard icon={<Clock className="size-5" />} tint="bg-[#EAF6F1]" color="text-[#2E9E6B]" value={String(expiring.length)} label={t("pharm.kpiExp")} />
          </div>

          {/* ---- product search (صلاحية الأدوية) ---- */}
          {canMedicines && (
          <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-heading text-base font-black md:text-lg">
              <Search className="size-4.5 text-[#1E4E8F]" />
              {t("nav.search")}
            </h2>
            <div className="relative mt-3">
              <Search className="absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("pharm.search")}
                className="h-12 rounded-2xl ps-10 text-base"
              />
            </div>

            {q.trim().length >= 2 && (
              <div className="mt-3 space-y-2">
                {results.length === 0 ? (
                  <p className="py-4 text-center text-sm font-bold text-muted-foreground">{t("pharm.searchNone")}</p>
                ) : (
                  results.map((p) => {
                    const cat = categories.find((c) => c.id === p.category);
                    const off = discountPct(p);
                    return (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3 transition hover:border-[#1E4E8F]/30"
                      >
                        <div
                          className={`relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl ${
                            p.img ? "bg-white ring-1 ring-black/5" : "bg-[#EAF6F1]"
                          }`}
                        >
                          {p.img ? (
                            <Image src={p.img} alt={p.nameEn} fill sizes="56px" className="object-contain p-1" />
                          ) : (
                            <Pill className="size-6 text-[#2E9E6B]" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black">{lang === "ar" ? p.nameAr : p.nameEn}</p>
                          <p className="truncate text-[11px] font-bold text-muted-foreground">
                            {lang === "ar" ? p.ingredientAr : p.ingredientEn} · {lang === "ar" ? p.brandAr : p.brandEn}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {cat && (
                              <span className="rounded-full bg-[#EAF1F9] px-2 py-0.5 text-[10px] font-black text-[#1E4E8F]">
                                {lang === "ar" ? cat.nameAr : cat.nameEn}
                              </span>
                            )}
                            {off > 0 && (
                              <span className="flex items-center gap-0.5 rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-black text-[#B45E0A]">
                                <Tag className="size-2.5" />
                                {off}٪ {t("misc.discount")}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-end">
                          <p className="font-heading text-sm font-black text-[#1E4E8F]">{fmtPrice(p.price, t)}</p>
                          <p className="text-[11px] font-bold text-muted-foreground">{p.stock} علبة متوفرة</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
          )}

          {/* ---- preparation queue (صلاحية الطلبات) ---- */}
          {canOrders && (
          <div>
            <h2 className="flex items-center gap-2 font-heading text-lg font-black">
              <IconRxClipboard className="size-5 text-[#1E4E8F]" />
              {t("pharm.queue")} ({pending.length})
            </h2>

            {pending.length === 0 ? (
              <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#2E9E6B]/40 bg-[#EAF6F1]/50 p-6 text-sm font-bold text-[#2E9E6B]">
                <CheckCircle2 className="size-4.5" />
                {t("pharm.queueNone")}
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                {pending.map((o) => (
                  <div key={o.id} className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-heading text-base font-black text-[#1E4E8F]">{o.id}</span>
                        <Badge className="rounded-full border-0 bg-[#FFF4E5] text-[#B45E0A]">{t("admin.stPending")}</Badge>
                        {o.discreetPackaging && (
                          <Badge className="rounded-full border-0 bg-[#0B1E38] text-white">
                            {lang === "ar" ? "تغليف خاص — سادة بدون علامات" : "Discreet packaging"}
                          </Badge>
                        )}
                        {isNightOrder(o.createdAt ?? o.date) && (
                          <Badge className="rounded-full border-0 bg-[#12294D] text-[#FCD34D]">
                            🌙 {lang === "ar" ? "طلب ليلي" : "Night order"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                        <Phone className="size-3.5" />
                        <span dir="ltr">{o.phone}</span>
                        <CustomerContactMenu phone={o.phone} label="" className="grid size-8 place-items-center rounded-full bg-[#2E9E6B] text-white shadow-xs transition hover:brightness-105 active:scale-95" />
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
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

                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-xs font-bold text-muted-foreground">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#DC4B4B]" />
                      {o.address}
                    </div>

                    {isNightOrder(o.createdAt ?? o.date) && (
                      <p className="mt-2.5 rounded-xl border border-[#F59E0B]/40 bg-[#FFFBEB] px-3 py-2 text-center font-heading text-xs font-black text-[#B45E0A]">
                        🌙 {t("checkout.nightLine")}
                        <span className="font-bold text-[#B45E0A]/70">
                          {lang === "ar" ? " — اكتبها على كارت وحطها في الشنطة" : " — write it on a card in the bag"}
                        </span>
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3.5">
                      <span className="text-sm font-bold text-muted-foreground">
                        {lang === "ar" ? o.customerAr : o.customerEn}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          className="h-11 rounded-full px-4 font-black text-[#184C8A]"
                          onClick={() => setTimelinePhone(o.phone)}
                        >
                          <User className="size-4" />
                          {t("timeline.viewPatient")}
                        </Button>
                        <Button className="h-11 rounded-full px-6 font-black" onClick={() => pharmacistReady(o.id)}>
                          <CheckCircle2 className="size-4" />
                          {t("pharm.readyBtn")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* ---- جاهز وبانتظار استلام المندوب ---- */}
          {canOrders && readyOrders.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 font-heading text-lg font-black">
                <CheckCircle2 className="size-5 text-[#2E9E6B]" />
                {t("admin.stReady")} ({readyOrders.length})
              </h2>
              <div className="mt-3 space-y-2">
                {readyOrders.map((o) => (
                  <div
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#2E9E6B]/30 bg-[#EAF6F1]/50 px-4 py-3"
                  >
                    <span className="font-heading text-sm font-black text-[#1E4E8F]">{o.id}</span>
                    <span className="truncate text-xs font-bold text-muted-foreground">
                      {lang === "ar" ? o.customerAr : o.customerEn} · <span dir="ltr">{o.phone}</span>
                    </span>
                    <Badge className="rounded-full border-0 bg-[#EAF6F1] text-[#2E9E6B]">
                      {lang === "ar" ? "بانتظار استلام المندوب" : "Waiting for courier pickup"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---- incoming prescriptions ---- */}
          {canRx && newRx.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 font-heading text-lg font-black">
                <FileText className="size-5 text-[#B45E0A]" />
                {t("pharm.rxQueue")} ({newRx.length})
              </h2>
              <div className="mt-3 space-y-2.5">
                {newRx.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F09428]/30 bg-[#FFF4E5]/50 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F09428]/15 text-[#B45E0A]">
                        <FileText className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-black">
                          {r.id} — {lang === "ar" ? r.customerAr : r.customerEn}
                        </p>
                        <p className="truncate text-[11px] font-bold text-muted-foreground">
                          {r.fileName ? (
                            <RxPhotoLink
                              value={r.fileName}
                              className="font-bold text-[#1E4E8F] underline hover:text-[#163a6b]"
                              fallbackText={<span>{r.fileName}</span>}
                            >
                              عرض الروشتة ↗
                            </RxPhotoLink>
                          ) : null}{" "}
                          · <span dir="ltr">{r.phone}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CustomerContactMenu phone={r.phone} label="" className="grid size-9 place-items-center rounded-full bg-[#2E9E6B] text-white shadow-xs transition hover:brightness-105 active:scale-95" />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-full px-4 font-black text-[#184C8A]"
                        onClick={() => setTimelinePhone(r.phone)}
                      >
                        <User className="size-3.5" />
                        {t("timeline.viewPatient")}
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 rounded-full bg-[#2E9E6B] px-4 font-black text-white hover:bg-[#278a5e]"
                        onClick={() => adminSetRx(r.id, "approved")}
                      >
                        <CheckCircle2 className="size-3.5" />
                        {t("pharm.accept")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-full border-[#DC4B4B]/30 px-4 font-black text-[#DC4B4B] hover:bg-[#DC4B4B]/10"
                        onClick={() => adminSetRx(r.id, "rejected")}
                      >
                        <XCircle className="size-3.5" />
                        {t("pharm.reject")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---- طلبات واتساب السريعة (بكود تتبع) ---- */}
          {canWhatsapp && whatsappOrders.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 font-heading text-lg font-black">
                <IconWhatsapp className="size-5 text-[#25D366]" />
                {lang === "ar" ? "طلبات واتساب" : "WhatsApp orders"} ({whatsappOrders.filter((w) => w.status === "sent").length}{" "}
                {lang === "ar" ? "جديدة" : "new"})
              </h2>
              <div className="mt-3 space-y-2.5">
                {whatsappOrders.slice(0, 20).map((w) => (
                  <div key={w.id} className="rounded-2xl border border-[#25D366]/30 bg-[#ECFDF5]/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#0B1E38] px-2.5 py-0.5 font-heading text-xs font-black text-white" dir="ltr">
                          {w.code}
                        </span>
                        {w.status === "sent" && (
                          <Badge className="rounded-full border-0 bg-[#FFF4E5] text-[#B45E0A]">{lang === "ar" ? "اتبعت واتساب" : "Sent"}</Badge>
                        )}
                        {w.status === "converted" && (
                          <Badge className="rounded-full border-0 bg-[#EAF1F9] text-[#1E4E8F]">{lang === "ar" ? "اتحول لطلب" : "Converted"}</Badge>
                        )}
                        {w.status === "done" && (
                          <Badge className="rounded-full border-0 bg-[#EAF6F1] text-[#2E9E6B]">{lang === "ar" ? "تم" : "Done"}</Badge>
                        )}
                        {w.status === "cancelled" && (
                          <Badge className="rounded-full border-0 bg-[#DC4B4B]/10 text-[#DC4B4B]">{lang === "ar" ? "ملغي" : "Cancelled"}</Badge>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-muted-foreground">
                        {new Date(w.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}
                        {w.phone ? (
                          <>
                            {" · "}
                            <span dir="ltr">{w.phone}</span>
                          </>
                        ) : null}
                      </span>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      {w.items.map((it, i) => (
                        <p key={i} className="text-xs font-bold text-foreground/80">
                          {lang === "ar" ? it.nameAr : it.nameEn}
                          <span className="text-muted-foreground"> × {it.qty}</span>
                        </p>
                      ))}
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#25D366]/20 pt-2.5">
                      <span className="font-heading text-sm font-black text-[#1E4E8F]">{fmtPrice(w.total, t)}</span>
                      <div className="flex items-center gap-2">
                        <CustomerContactMenu phone={w.phone} label="" className="grid size-8 place-items-center rounded-full bg-[#2E9E6B] text-white shadow-xs transition hover:brightness-105 active:scale-95" />
                        {w.status === "sent" && (
                          <Button
                            size="sm"
                            className="h-8 rounded-full bg-[#184C8A] px-3.5 text-[11px] font-black text-white"
                            onClick={() => void waStatus(w.id, "converted")}
                          >
                            {lang === "ar" ? "اتحول لطلب" : "Converted"}
                          </Button>
                        )}
                        {(w.status === "sent" || w.status === "converted") && (
                          <Button
                            size="sm"
                            className="h-8 rounded-full bg-[#2E9E6B] px-3.5 text-[11px] font-black text-white hover:bg-[#278a5e]"
                            onClick={() => void waStatus(w.id, "done")}
                          >
                            {lang === "ar" ? "تم" : "Done"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---- طلبات النواقص («طلب ناقص» — بكود تتبع) ---- */}
          {canShortages && shortageRequests.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 font-heading text-lg font-black">
                <Package className="size-5 text-[#B45E0A]" />
                {lang === "ar" ? "طلبات النواقص" : "Shortage requests"} ({shortageRequests.filter((r) => r.status === "pending").length}{" "}
                {lang === "ar" ? "جديدة" : "new"})
              </h2>
              <div className="mt-3 space-y-2.5">
                {shortageRequests.slice(0, 20).map((r) => {
                  const digits = (r.phone || "").replace(/[^0-9]/g, "");
                  const intlPhone = digits.startsWith("0")
                    ? `20${digits.slice(1)}`
                    : digits.startsWith("20")
                      ? digits
                      : digits.length === 10 && digits.startsWith("1")
                        ? `20${digits}`
                        : digits;
                  const arrivedMsg =
                    lang === "ar"
                      ? `السلام عليكم، معاك صيدلية بحبح 🌿\nالدوا اللي طلبته بقى متوفر دلوقتي: ${r.itemName}\nكود طلب الناقص: ${r.code}\nتحب نجهّزهولك طلب توصيل؟`
                      : `Hello, this is Bahbah Pharmacy.\nThe medicine you requested is now available: ${r.itemName}\nShortage request code: ${r.code}\nShall we prepare it as a delivery order?`;
                  return (
                    <div key={r.id} className="rounded-2xl border border-[#B45E0A]/25 bg-[#FFF9F0]/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-[#0B1E38] px-2.5 py-0.5 font-heading text-xs font-black text-white" dir="ltr">
                            {r.code}
                          </span>
                          {r.status === "pending" && (
                            <Badge className="rounded-full border-0 bg-[#FFF4E5] text-[#B45E0A]">{lang === "ar" ? "جديد" : "New"}</Badge>
                          )}
                          {r.status === "available" && (
                            <Badge className="rounded-full border-0 bg-[#EAF6F1] text-[#2E9E6B]">{lang === "ar" ? "بقى متوفر" : "Available"}</Badge>
                          )}
                          {r.status === "notified" && (
                            <Badge className="rounded-full border-0 bg-[#EAF1F9] text-[#1E4E8F]">{lang === "ar" ? "اتبعت للزبون" : "Customer notified"}</Badge>
                          )}
                          {r.status === "converted" && (
                            <Badge className="rounded-full border-0 bg-[#EAF1F9] text-[#1E4E8F]">{lang === "ar" ? "اتحول لطلب" : "Converted"}</Badge>
                          )}
                          {r.status === "closed" && (
                            <Badge className="rounded-full border-0 bg-muted text-muted-foreground">{lang === "ar" ? "مقفل" : "Closed"}</Badge>
                          )}
                          <Badge variant="outline" className="rounded-full font-bold text-muted-foreground">
                            {r.source === "barcode"
                              ? lang === "ar" ? "باركود" : "Barcode"
                              : r.source === "photo"
                                ? lang === "ar" ? "صورة" : "Photo"
                                : r.source === "product"
                                  ? lang === "ar" ? "من صنف ناقص" : "From item"
                                  : lang === "ar" ? "كتابة" : "Typed"}
                          </Badge>
                        </div>
                        <span className="text-[11px] font-bold text-muted-foreground">
                          {new Date(r.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}
                        </span>
                      </div>
                      <p className="mt-2 font-heading text-sm font-black text-foreground">
                        {r.itemName}
                        {r.barcode ? (
                          <span className="ms-2 text-[11px] font-bold text-muted-foreground" dir="ltr">
                            {r.barcode}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-foreground/70">
                        {r.name ? `${r.name} · ` : ""}
                        {r.phone ? <span dir="ltr">{r.phone}</span> : lang === "ar" ? "من غير رقم" : "No phone"}
                        {r.photoUrl ? (
                          <>
                            {" · "}
                            <RxPhotoLink
                              value={r.photoUrl}
                              className="inline-flex items-center gap-1 font-black text-[#1E4E8F] underline"
                              fallbackText={
                                <span className="inline-flex items-center gap-1 font-black text-muted-foreground">
                                  <FileText className="size-3" />
                                  {lang === "ar" ? "صورة مرفقة" : "Attached photo"}
                                </span>
                              }
                            >
                              <FileText className="size-3" />
                              {lang === "ar" ? "صورة مرفقة" : "Attached photo"}
                            </RxPhotoLink>
                          </>
                        ) : null}
                      </p>
                      {r.status !== "closed" && r.status !== "converted" && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[#B45E0A]/15 pt-2.5">
                          {r.status === "pending" && (
                            <Button
                              size="sm"
                              className="h-8 rounded-full bg-[#2E9E6B] px-3.5 text-[11px] font-black text-white hover:bg-[#278a5e]"
                              onClick={() => void shortageStatus(r.id, "available")}
                            >
                              {lang === "ar" ? "بقى متوفر" : "Now available"}
                            </Button>
                          )}
                          {(r.status === "available" || r.status === "notified") && intlPhone && (
                            <a
                              href={`https://wa.me/${intlPhone}?text=${encodeURIComponent(arrivedMsg)}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => {
                                if (r.status === "available") void shortageStatus(r.id, "notified");
                              }}
                              className="bb-whatsapp-gradient flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[11px] font-black text-white shadow-sm transition active:scale-95"
                            >
                              <IconWhatsapp className="size-3.5" />
                              {lang === "ar" ? "رد واتساب: الدوا وصل" : "WhatsApp: it arrived"}
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full px-3.5 text-[11px] font-black text-[#184C8A]"
                            onClick={() => void shortageStatus(r.id, "converted")}
                          >
                            {lang === "ar" ? "اتحول لطلب" : "Converted"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full px-3.5 text-[11px] font-black text-muted-foreground"
                            onClick={() => void shortageStatus(r.id, "closed")}
                          >
                            {lang === "ar" ? "إغلاق" : "Close"}
                          </Button>
                          <CustomerContactMenu phone={r.phone} label="" className="grid size-8 place-items-center rounded-full bg-[#2E9E6B] text-white shadow-xs transition hover:brightness-105 active:scale-95" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---- طلبات التمريض (خدمات تمريضية — بكود تتبع) ---- */}
          <NursingQueue />

          {/* ---- low stock + expiring tables (صلاحية الأدوية) ---- */}
          {canMedicines && (
          <div className="grid gap-4 lg:grid-cols-2">
            <StockTable
              title={t("pharm.lowTbl")}
              icon={<AlertTriangle className="size-4.5 text-[#DC4B4B]" />}
              rows={[...outStock, ...lowStock].slice(0, 8)}
              onRestock={(id) => restock(id, 10)}
            />
            <ExpiringTable rows={expiring.slice(0, 8)} />
          </div>
          )}
        </div>
      )}

      {/* ================= TAB: PATIENT FILE (by phone) ================= */}
      {effectiveTab === "file" && (
        <div className="space-y-5 pt-4">
          <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-heading text-base font-black md:text-lg">
              <User className="size-5 text-[#B45E0A]" />
              {lang === "ar" ? "فتح ملف مريض برقم الهاتف" : "Open a patient file by phone"}
            </h2>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                value={filePhoneInput}
                onChange={(e) => setFilePhoneInput(e.target.value)}
                placeholder="01xxxxxxxxx"
                inputMode="tel"
                dir="ltr"
                className="h-12 flex-1 rounded-2xl text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filePhoneInput.trim().length >= 8) setFilePhone(filePhoneInput.trim());
                }}
              />
              <Button
                className="h-12 rounded-full px-6 font-black"
                disabled={filePhoneInput.trim().length < 8}
                onClick={() => setFilePhone(filePhoneInput.trim())}
              >
                {lang === "ar" ? "فتح الملف" : "Open file"}
              </Button>
            </div>
            <p className="mt-2 text-[11px] font-bold text-muted-foreground">
              {lang === "ar"
                ? "الملف بيجمع طلبات المريض وروشتاته وقياساته واشتراكه الشهري برقم الهاتف. لو الرقم جديد هيتفتح ملف جديد، وأول قياس تحفظه بيتسجل على السيرفر وبيظهر للمريض في «قياساتي» و«رحلتي الصحية»."
                : "The file unifies the patient's orders, prescriptions, measurements and monthly care by phone. A new number opens a new file; the first measurement you save is stored server-side and appears in the patient's own portal."}
            </p>
          </div>

          {filePhone &&
            (() => {
              const meas = measurements.filter((m) => phonesMatch(m.patientPhone, filePhone));
              const existingCode = meas.find((m) => m.patientCode)?.patientCode;
              const digits = filePhone.replace(/\D/g, "");
              const fileNo = existingCode || `BB-${digits.slice(-4) || "----"}`;
              const pName =
                orders.find((o) => phonesMatch(o.phone, filePhone))?.customerAr ||
                careSubs.find((c) => phonesMatch(c.phone, filePhone))?.nameAr ||
                meas[0]?.patientName ||
                "";
              const hasHistory =
                meas.length > 0 ||
                orders.some((o) => phonesMatch(o.phone, filePhone)) ||
                careSubs.some((c) => phonesMatch(c.phone, filePhone));
              return (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#B45E0A]/30 bg-[#FFF4E5]/50 p-5 shadow-sm">
                    <div>
                      <p className="font-heading text-lg font-black">
                        {pName || (lang === "ar" ? "ملف جديد" : "New file")}
                        {!hasHistory && (
                          <span className="ms-2 rounded-full bg-[#B45E0A] px-2 py-0.5 text-[10px] font-black text-white">
                            {lang === "ar" ? "جديد" : "New"}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-muted-foreground">
                        {lang === "ar" ? "رقم الملف: " : "File no.: "}
                        <span dir="ltr" className="font-black text-[#B45E0A]">{fileNo}</span>
                        {" · "}
                        <span dir="ltr">{filePhone}</span>
                      </p>
                    </div>
                    <Button
                      className="h-11 rounded-full bg-[#2E9E6B] px-5 font-black text-white hover:bg-[#238156]"
                      onClick={() => {
                        setPatientPhone(filePhone);
                        setPatientName(pName);
                        setPatientCode(fileNo);
                        setOpenMeasModal(true);
                      }}
                    >
                      <Plus className="size-4 me-1" />
                      {lang === "ar" ? "إضافة قياس للمريض" : "Add measurement"}
                    </Button>
                  </div>

                  <PatientTimeline phone={filePhone} />
                </>
              );
            })()}
        </div>
      )}

      {/* ================= TAB 2: PATIENT VITALS & MEASUREMENTS ================= */}
      {effectiveTab === "vitals" && (
        <div className="space-y-5 pt-2">
          {/* Quick Info & Action Header */}
          <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-emerald-50/60 to-background p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 font-heading text-lg font-black text-foreground">
                  <Activity className="size-5 text-[#2E9E6B]" />
                  {lang === "ar" ? "تسجيل ومتابعة قياسات المرضى (السكر، الضغط، الوزن)" : "Patient Health Vitals Registry"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground font-semibold">
                  {lang === "ar"
                    ? "عند حضور المريض للصيدلية لقياس السكر أو الضغط أو الوزن، سجّل قراءاته هنا لتظهر مباشرة في بوابته وتطبيق هاتفه."
                    : "Record patient vitals at the pharmacy counter so they can view their historical trend in their portal."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className="rounded-full bg-[#2E9E6B] text-xs font-black text-white shadow-md hover:bg-[#238156]"
                  onClick={() => setOpenMeasModal(true)}
                >
                  <Plus className="size-4 me-1" />
                  {lang === "ar" ? "قياس جديد للمريض" : "Record Measurement"}
                </Button>
              </div>
            </div>

            {/* Filter Search */}
            <div className="mt-4">
              <div className="relative max-w-sm">
                <Search className="absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={vitalsSearch}
                  onChange={(e) => setVitalsSearch(e.target.value)}
                  placeholder={lang === "ar" ? "بحث باسم المريض أو الكود أو الموبايل..." : "Search patient..."}
                  className="h-9 rounded-xl ps-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Measurements Table */}
          <TableWrap>
            <table className="w-full min-w-[850px] text-xs">
              <thead className="border-b border-border bg-muted/50 text-[11px]">
                <tr>
                  <th className={TH}>{lang === "ar" ? "كود واسم المريض" : "Patient Code & Name"}</th>
                  <th className={TH}>{lang === "ar" ? "رقم الموبايل" : "Phone"}</th>
                  <th className={TH}>{lang === "ar" ? "قياس السكر" : "Blood Sugar"}</th>
                  <th className={TH}>{lang === "ar" ? "ضغط الدم" : "Blood Pressure"}</th>
                  <th className={TH}>{lang === "ar" ? "الوزن و BMI" : "Weight & BMI"}</th>
                  <th className={TH}>{lang === "ar" ? "تاريخ ووقت القياس" : "Date & Time"}</th>
                  <th className={TH}>{lang === "ar" ? "ملاحظات وتوصيات الصيدلي" : "Pharmacist Notes"}</th>
                  <th className={TH}>{lang === "ar" ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredMeasurements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs font-bold text-muted-foreground">
                      {lang === "ar" ? "لا توجد قياسات مسجلة مطابقة للبحث" : "No measurements recorded yet"}
                    </td>
                  </tr>
                ) : (
                  filteredMeasurements.map((m) => {
                    const sugarSt = getSugarStatus(m.bloodSugar, m.sugarTiming);
                    const bpSt = getBPStatus(m.systolic, m.diastolic);
                    const bmiSt = getBmiStatus(m.bmi);
                    const d = new Date(m.recordedAt);
                    const formatted = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString(
                      lang === "ar" ? "ar-EG" : "en-US",
                      { hour: "2-digit", minute: "2-digit" }
                    )}`;

                    return (
                      <tr key={m.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        <td className={TD}>
                          <span className="font-mono text-[11px] font-black text-[#184C8A] block">
                            {m.patientCode}
                          </span>
                          <span className="font-bold text-foreground text-xs">{m.patientName}</span>
                        </td>
                        <td className={TD}>
                          <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                            {m.patientPhone || "—"}
                          </span>
                        </td>
                        <td className={TD}>
                          {m.bloodSugar != null ? (
                            <div>
                              <span className="font-heading font-black text-sm text-amber-700">
                                {m.bloodSugar}
                              </span>{" "}
                              <span className="text-[10px] text-muted-foreground">mg/dL</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[9px] text-muted-foreground">
                                  {timingArabic(m.sugarTiming)}
                                </span>
                                {sugarSt && (
                                  <Badge className={`h-4 text-[9px] px-1 font-bold ${sugarSt.color}`}>
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
                          {m.systolic && m.diastolic ? (
                            <div>
                              <span className="font-heading font-black text-sm text-red-700">
                                {m.systolic}/{m.diastolic}
                              </span>{" "}
                              <span className="text-[10px] text-muted-foreground">mmHg</span>
                              {bpSt && (
                                <div className="mt-0.5">
                                  <Badge className={`h-4 text-[9px] px-1 font-bold ${bpSt.color}`}>
                                    {bpSt.label}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className={TD}>
                          {m.weight != null ? (
                            <div>
                              <span className="font-heading font-black text-xs text-emerald-700">
                                {m.weight} كجم
                              </span>
                              {m.bmi != null && (
                                <span className="text-[10px] text-muted-foreground block">
                                  BMI: {m.bmi}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className={TD}>
                          <span className="text-[11px] font-semibold text-muted-foreground block">
                            {formatted}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {m.recordedBy || "الصيدلي"}
                          </span>
                        </td>
                        <td className={`${TD} max-w-[200px]`}>
                          <p className="text-[11px] leading-relaxed text-foreground truncate" title={m.pharmacistNotes}>
                            {m.pharmacistNotes || "—"}
                          </p>
                        </td>
                        <td className={TD}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 size-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                            onClick={() => {
                              deleteMeasurement(m.id);
                              toast.success("تم حذف القياس");
                            }}
                            title="حذف القياس"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </TableWrap>
        </div>
      )}

      {/* ================= MODAL: RECORD NEW PATIENT MEASUREMENT ================= */}
      <Dialog open={openMeasModal} onOpenChange={setOpenMeasModal}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader className="border-b border-border/80 pb-3">
            <DialogTitle className="flex items-center gap-2 font-heading text-lg font-black text-foreground">
              <Stethoscope className="size-5 text-[#2E9E6B]" />
              {lang === "ar" ? "تسجيل قياسات طبية لمريض في الصيدلية" : "Record Patient Health Vitals"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveMeasurement} className="mt-4 space-y-4">
            {/* Quick Select from Registered Patients & Chronic Care */}
            {careSubs.length > 0 && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3">
                <span className="text-[11px] font-bold text-blue-900 block mb-1.5">
                  ⚡ اختيار سريع من المرضى المسجلين بالصيدلية (أدوية شهرية):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {careSubs.slice(0, 8).map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setPatientName(sub.nameAr || sub.nameEn);
                        setPatientPhone(sub.phone);
                        setPatientCode(sub.id);
                        toast.info(`تم اختيار المريض: ${sub.nameAr}`);
                      }}
                      className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-blue-800 shadow-2xs border border-blue-200 hover:bg-blue-600 hover:text-white transition"
                    >
                      {sub.nameAr} ({sub.id})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Patient Info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-foreground">اسم المريض *</span>
                <Input
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="مثال: الحاج أحمد عبد الرحمن"
                  className="h-10 rounded-xl text-xs"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-bold text-foreground">رقم الهاتف *</span>
                <Input
                  required
                  value={patientPhone}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPatientPhone(val);
                    if (!patientCode && val.length >= 4) {
                      setPatientCode(`BB-${val.slice(-4)}`);
                    }
                  }}
                  placeholder="01011500166"
                  className="h-10 rounded-xl text-xs"
                  dir="ltr"
                />
              </label>

              <label className="block space-y-1 sm:col-span-2">
                <span className="text-xs font-bold text-foreground">كود المريض الخاص (للدخول به في البوابة)</span>
                <Input
                  value={patientCode}
                  onChange={(e) => setPatientCode(e.target.value)}
                  placeholder="مثال: BB-C-105 أو رقم الموبايل"
                  className="h-10 rounded-xl text-xs"
                  dir="ltr"
                />
              </label>
            </div>

            {/* Blood Sugar Group */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-2.5">
              <p className="font-heading text-xs font-black text-amber-900 flex items-center gap-1.5">
                <Activity className="size-4 text-amber-600" />
                <span>قياس السكر في الدم</span>
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-amber-950">نسبة السكر (mg/dL)</span>
                  <Input
                    type="number"
                    step="1"
                    value={bloodSugar}
                    onChange={(e) => setBloodSugar(e.target.value)}
                    placeholder="مثال: 120"
                    className="h-9 rounded-xl bg-white text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-amber-950">توقيت القياس</span>
                  <Select
                    value={sugarTiming}
                    onValueChange={(v) => setSugarTiming(v as PatientMeasurement["sugarTiming"])}
                  >
                    <SelectTrigger className="h-9 rounded-xl bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fasting">صائم (8 ساعات)</SelectItem>
                      <SelectItem value="random">عشوائي</SelectItem>
                      <SelectItem value="postprandial">بعد الأكل بساعتين</SelectItem>
                      <SelectItem value="bedtime">قبل النوم</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              </div>
            </div>

            {/* Blood Pressure Group */}
            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-3.5 space-y-2.5">
              <p className="font-heading text-xs font-black text-red-900 flex items-center gap-1.5">
                <Heart className="size-4 text-red-600" />
                <span>قياس ضغط الدم والنبض</span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-red-950">الانقباضي (العالي)</span>
                  <Input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    placeholder="120"
                    className="h-9 rounded-xl bg-white text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-red-950">الانبساطي (الواطي)</span>
                  <Input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    placeholder="80"
                    className="h-9 rounded-xl bg-white text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-red-950">النبض (bpm)</span>
                  <Input
                    type="number"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    placeholder="75"
                    className="h-9 rounded-xl bg-white text-xs"
                  />
                </label>
              </div>
            </div>

            {/* Weight & Height Group */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2.5">
              <p className="font-heading text-xs font-black text-emerald-900 flex items-center gap-1.5">
                <Scale className="size-4 text-emerald-600" />
                <span>الوزن والطول</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-emerald-950">الوزن (كجم)</span>
                  <Input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="مثال: 78.5"
                    className="h-9 rounded-xl bg-white text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-emerald-950">الطول (سم) - لحساب BMI</span>
                  <Input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="مثال: 170"
                    className="h-9 rounded-xl bg-white text-xs"
                  />
                </label>
              </div>
            </div>

            {/* Pharmacist Notes */}
            <label className="block space-y-1">
              <span className="text-xs font-bold text-foreground">توصيات وملاحظات الصيدلي للمريض</span>
              <Textarea
                value={pharmacistNotes}
                onChange={(e) => setPharmacistNotes(e.target.value)}
                placeholder="اكتب أي نصائح غذائية أو دوائية أو موعد المتابعة القادم..."
                className="rounded-xl text-xs h-18 resize-none"
              />
            </label>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl text-xs font-bold"
                onClick={() => setOpenMeasModal(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={savingMeas}
                className="h-10 rounded-xl bg-[#2E9E6B] px-6 text-xs font-black text-white hover:bg-[#238156]"
              >
                {savingMeas ? "جاري الحفظ..." : "حفظ وإرسال للملف"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== الملف الصحي الموحد للمريض — قياسات + طلبات + روشتات + رعاية ===== */}
      <Dialog
        open={!!timelinePhone}
        onOpenChange={(v) => {
          if (!v) setTimelinePhone(null);
        }}
      >
        <DialogContent className="max-w-2xl rounded-3xl p-6">
          <DialogHeader className="border-b border-border/80 pb-3">
            <DialogTitle className="flex flex-wrap items-center gap-2 font-heading text-lg font-black text-foreground">
              <User className="size-5 text-[#184C8A]" />
              {t("timeline.title")}
              {timelinePhone && (
                <span className="text-sm font-bold text-muted-foreground" dir="ltr">
                  {timelinePhone}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pt-4">
            {timelinePhone && <PatientTimeline phone={timelinePhone} />}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

/* gate when not signed in as pharmacist */
function StaffGatePharm() {
  return <StaffGate role="pharmacist" />;
}

/* ------------------------------------------------------------------ */
/* Low-stock table with quick +10 restock                              */
/* ------------------------------------------------------------------ */
function StockTable({
  title,
  icon,
  rows,
  onRestock,
}: {
  title: string;
  icon: React.ReactNode;
  rows: Product[];
  onRestock: (id: string) => void;
}) {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  return (
    <div>
      <h3 className="flex items-center gap-2 font-heading text-sm font-black">
        {icon}
        {title}
      </h3>
      <div className="mt-2.5">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-xs font-bold text-muted-foreground">—</p>
        ) : (
          <TableWrap>
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className={TH}>{t("nav.catalog")}</th>
                  <th className={TH}>{t("pharm.qty")}</th>
                  <th className={TH}>{t("pharm.restock10")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0">
                    <td className={TD}>
                      <div className="flex items-center gap-2">
                        <div
                          className={`relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg ${
                            p.img ? "bg-white ring-1 ring-black/5" : "bg-[#EAF1F9]"
                          }`}
                        >
                          {p.img ? (
                            <Image src={p.img} alt={p.nameEn} fill sizes="36px" className="object-contain p-0.5" />
                          ) : (
                            <Pill className="size-4 text-[#1E4E8F]" />
                          )}
                        </div>
                        <span className="font-bold">{lang === "ar" ? p.nameAr : p.nameEn}</span>
                      </div>
                    </td>
                    <td className={TD}>
                      <Badge
                        className={`rounded-full border-0 ${
                          p.stock === 0 ? "bg-[#DC4B4B]/10 text-[#DC4B4B]" : "bg-[#FFF4E5] text-[#B45E0A]"
                        }`}
                      >
                        {p.stock}
                      </Badge>
                    </td>
                    <td className={TD}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-full px-2.5 text-[11px] font-black text-[#2E9E6B]"
                        onClick={() => onRestock(p.id)}
                      >
                        <Plus className="size-3" />
                        10
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Expiring-within-90-days table                                       */
/* ------------------------------------------------------------------ */
function ExpiringTable({ rows }: { rows: Product[] }) {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  return (
    <div>
      <h3 className="flex items-center gap-2 font-heading text-sm font-black">
        <Clock className="size-4.5 text-[#B45E0A]" />
        {t("pharm.expTbl")}
      </h3>
      <div className="mt-2.5">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-xs font-bold text-muted-foreground">—</p>
        ) : (
          <TableWrap>
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className={TH}>{t("nav.catalog")}</th>
                  <th className={TH}>{t("pharm.expiry")}</th>
                  <th className={TH}>{t("pharm.qty")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const d = daysUntil(p.expiry);
                  return (
                    <tr key={p.id} className="border-b border-border/50 last:border-0">
                      <td className={TD}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg ${
                              p.img ? "bg-white ring-1 ring-black/5" : "bg-[#EAF1F9]"
                            }`}
                          >
                            {p.img ? (
                              <Image src={p.img} alt={p.nameEn} fill sizes="36px" className="object-contain p-0.5" />
                            ) : (
                              <Pill className="size-4 text-[#1E4E8F]" />
                            )}
                          </div>
                          <span className="font-bold">{lang === "ar" ? p.nameAr : p.nameEn}</span>
                        </div>
                      </td>
                      <td className={TD}>
                        <span className="inline-flex items-center gap-1.5 font-bold text-[#B45E0A]">
                          <FileWarning className="size-3" />
                          {d} {t("pharm.days")}
                        </span>
                      </td>
                      <td className={`${TD} font-bold`}>{p.stock}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
    </div>
  );
}
