"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useBahbah,
  useT,
  nextDeliveryFor,
  type CareSub,
} from "@/lib/bahbah/store";
import { type CareSubscriber } from "@/lib/bahbah/data";
import {
  uploadRxPrescriptionImage,
  fetchCareSubsFromSupabase,
  updateCareSubStatusInSupabase,
} from "@/lib/supabase";
import {
  IconRefill,
  IconShieldCheck,
  IconScooter,
  IconPharmacist,
  IconCheck,
  IconPhone,
  IconWhatsapp,
  IconChevronR,
  IconSparkles,
  IconHeartPulse,
  IconPlus,
  IconRxClipboardDuo,
} from "./icons";
import Reveal from "./reveal";
import { toast } from "sonner";
import {
  Search,
  Camera,
  Upload,
  Calendar,
  FileText,
  UserCheck,
  Clock,
  Sparkles,
  X,
  ExternalLink,
  RotateCw,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* عميل أدوية شهرية — تجربة متكاملة للأدوية المزمنة وتكرار الروشتة     */
/* ------------------------------------------------------------------ */

type CareTab = "register" | "lookup" | "directory";

export default function CareView() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const careSub = useBahbah((s) => s.careSub);
  const careSubs = useBahbah((s) => s.careSubs);
  const user = useBahbah((s) => s.user);
  const { subscribeCare, refillMonthlyRx, toggleCareSubStatus, go, setConsultOpen } = useBahbah();

  const [activeTab, setActiveTab] = useState<CareTab>("register");

  /* New Patient Form State */
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState("");
  const [dayPref, setDayPref] = useState<number>(() => {
    const d = (new Date().getDate() + 3) % 28;
    return d === 0 ? 28 : d;
  });
  const [notes, setNotes] = useState("");
  const [prescriptionUrl, setPrescriptionUrl] = useState<string>("");
  const [prescriptionPreview, setPrescriptionPreview] = useState<string | null>(null);
  const [uploadingRx, setUploadingRx] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registeredSuccessSub, setRegisteredSuccessSub] = useState<CareSub | null>(careSub);

  /* Existing Patient Search State */
  const [searchQuery, setSearchQuery] = useState("");
  const [foundPatient, setFoundPatient] = useState<CareSubscriber | null>(null);
  const [refilling, setRefilling] = useState(false);
  const [refillSuccessOrder, setRefillSuccessOrder] = useState<string | null>(null);

  /* Directory Filter */
  const [dirSearch, setDirSearch] = useState("");
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync latest care subscriptions on load
  useEffect(() => {
    fetchCareSubsFromSupabase().then((subs) => {
      if (subs && subs.length > 0) {
        useBahbah.setState({ careSubs: subs });
      }
    });
  }, []);

  /* Handle prescription photo file selection */
  const handleRxFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = () => {
      setPrescriptionPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage if available
    setUploadingRx(true);
    try {
      const publicUrl = await uploadRxPrescriptionImage(file);
      if (publicUrl) {
        setPrescriptionUrl(publicUrl);
        toast.success(lang === "ar" ? "تم رفع صورة الروشتة بنجاح" : "Prescription image uploaded successfully");
      } else {
        // Fallback to data URL
        const dataUrlReader = new FileReader();
        dataUrlReader.onload = () => {
          setPrescriptionUrl(dataUrlReader.result as string);
        };
        dataUrlReader.readAsDataURL(file);
        toast.info(lang === "ar" ? "تم حفظ صورة الروشتة محلياً" : "Prescription image saved locally");
      }
    } catch {
      toast.error(lang === "ar" ? "تعذر الرفع، سيتم حفظ الصورة في الطلب" : "Upload failed, saved with order");
    } finally {
      setUploadingRx(false);
    }
  };

  /* Submit New Monthly Patient */
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(lang === "ar" ? "برجاء كتابة اسم المريض بالكامل" : "Please enter patient name");
      return;
    }
    if (phone.trim().length < 8) {
      toast.error(lang === "ar" ? "برجاء إدخال رقم هاتف صحيح للتواصل" : "Please enter a valid phone number");
      return;
    }
    if (!address.trim()) {
      toast.error(lang === "ar" ? "برجاء إدخال عنوان التوصيل بالتفصيل" : "Please enter delivery address");
      return;
    }

    setSubmitting(true);
    try {
      subscribeCare({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        dayPref,
        notes: notes.trim(),
        prescriptionUrl: prescriptionUrl || prescriptionPreview || "",
      });

      const today = new Date().toISOString().slice(0, 10);
      const nextDate = nextDeliveryFor(dayPref, today);

      const createdSub: CareSub = {
        memberNo: `M-${Math.floor(1000 + Math.random() * 9000)}`,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        dayPref,
        notes: notes.trim(),
        prescriptionUrl: prescriptionUrl || prescriptionPreview || "",
        since: today,
        next: nextDate,
        status: "active",
        planId: "monthly-rx",
        addons: [],
      };

      setRegisteredSuccessSub(createdSub);
      toast.success(
        lang === "ar"
          ? "تم تسجيلك كعميل أدوية شهرية بنجاح! سيتم تجهيز العلاج في الموعد المحدد."
          : "Monthly medicine registration successful!"
      );
    } catch {
      toast.error(lang === "ar" ? "حدث خطأ أثناء التسجيل" : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* Search Existing Patient */
  const handlePatientSearch = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      toast.error(lang === "ar" ? "اكتب رقم الهاتف أو كود المريض للبحث" : "Enter phone or patient ID");
      return;
    }

    const patient = careSubs.find(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.phone.replace(/\s+/g, "").includes(q.replace(/\s+/g, "")) ||
        s.nameAr.toLowerCase().includes(q)
    );

    if (patient) {
      setFoundPatient(patient);
      toast.success(lang === "ar" ? `تم العثور على ملف: ${patient.nameAr}` : `Found: ${patient.nameAr}`);
    } else {
      setFoundPatient(null);
      toast.error(
        lang === "ar"
          ? "لم يتم العثور على عميل شهري بهذه البيانات. يمكنك التسجيل كعميل جديد."
          : "No monthly patient found. You can register as new."
      );
    }
  };

  /* Instant Monthly Refill Request */
  const handleInstantRefill = async (patient: CareSubscriber) => {
    setRefilling(true);
    try {
      const orderId = await refillMonthlyRx(patient);
      setRefillSuccessOrder(orderId);
      toast.success(
        lang === "ar"
          ? `تم إرسال طلب تكرار العلاج الشهري بنجاح برقم (${orderId}) وجارٍ تجهيزه في الصيدلية!`
          : `Monthly refill order placed successfully (#${orderId})!`
      );
    } catch {
      toast.error(lang === "ar" ? "تعذر إنشاء طلب التكرار" : "Refill request failed");
    } finally {
      setRefilling(false);
    }
  };

  /* Filtered Directory */
  const filteredDirectory = useMemo(() => {
    const q = dirSearch.trim().toLowerCase();
    if (!q) return careSubs;
    return careSubs.filter(
      (s) =>
        s.nameAr.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.address && s.address.toLowerCase().includes(q))
    );
  }, [careSubs, dirSearch]);

  return (
    <main className="min-h-screen pb-20">
      {/* ================= Hero Banner ================= */}
      <section className="bb-hero-band relative overflow-hidden bg-gradient-to-br from-[#184C8A] via-[#112D51] to-[#0B1E38] text-white">
        <div className="bb-glow pointer-events-none absolute -top-24 start-[8%] size-72 rounded-full bg-[#059669]/30 blur-3xl" />
        <div className="bb-glow pointer-events-none absolute -bottom-28 end-[5%] size-80 rounded-full bg-[#F59E0B]/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12 md:px-6 md:pb-16 md:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur">
              <IconRefill className="size-4 text-[#F59E0B]" />
              {lang === "ar" ? "برنامج عميل الأدوية الشهرية والعلاج المزمن" : "Monthly Medicine & Chronic Care Program"}
            </Badge>

            <h1 className="font-heading text-3xl font-black leading-tight md:text-5xl">
              {lang === "ar" ? "عميل الأدوية الشهرية — صيدلية بحبح" : "Bahbah Monthly Medicine Program"}
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/80 md:text-base">
              {lang === "ar"
                ? "علاجك الشهري وأدويتك المزمنة بتوصلك لباب بيتك بانتظام في موعد محدد كل شهر دون انقطاع، بإشراف صيدلي معتمد وتوصيل 24 ساعة لجميع المحافظات."
                : "Your monthly prescription and chronic treatments delivered right to your doorstep regularly every month under pharmacist supervision."}
            </p>

            {/* Navigation Tabs Pill Bar */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-white/10 p-1.5 backdrop-blur-md">
              <button
                onClick={() => setActiveTab("register")}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black transition-all md:text-sm ${
                  activeTab === "register"
                    ? "bg-[#F59E0B] text-white shadow-md shadow-[#F59E0B]/30"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <IconRxClipboardDuo className="size-4" />
                {lang === "ar" ? "تسجيل عميل شهري جديد" : "New Patient Registration"}
              </button>

              <button
                onClick={() => setActiveTab("lookup")}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black transition-all md:text-sm ${
                  activeTab === "lookup"
                    ? "bg-[#F59E0B] text-white shadow-md shadow-[#F59E0B]/30"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Search className="size-4" />
                {lang === "ar" ? "عميل سابق / تكرار العلاج" : "Existing Patient Refill"}
              </button>

              <button
                onClick={() => setActiveTab("directory")}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black transition-all md:text-sm ${
                  activeTab === "directory"
                    ? "bg-[#F59E0B] text-white shadow-md shadow-[#F59E0B]/30"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <UserCheck className="size-4" />
                {lang === "ar" ? "خانة العملاء المشتركين" : "Registered Patients Directory"}
                <span className="ms-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                  {careSubs.length}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TAB 1: تسجيل عميل شهري جديد ================= */}
      {activeTab === "register" && (
        <section className="mx-auto max-w-4xl px-4 pt-10 md:px-6">
          <Reveal>
            <div className="overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-lg md:p-10">
              <div className="flex items-center justify-between border-b border-border/60 pb-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[#EAF2FA] text-[#184C8A]">
                    <IconRxClipboardDuo className="size-6" />
                  </span>
                  <div>
                    <h2 className="font-heading text-xl font-black md:text-2xl">
                      {lang === "ar" ? "تسجيل عميل أدوية شهرية جديد" : "Register New Monthly Patient"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {lang === "ar"
                        ? "سجل بياناتك وصور الروشتة وحدد ميعاد الاستلام الشهري المفضل"
                        : "Fill in patient details, attach prescription, and choose delivery day"}
                    </p>
                  </div>
                </div>
                <Badge className="rounded-full bg-[#EAF6F1] px-3 py-1 font-bold text-[#059669]">
                  {lang === "ar" ? "توصيل 24 ساعة" : "24/7 Delivery"}
                </Badge>
              </div>

              {registeredSuccessSub ? (
                <div className="mt-6 space-y-6">
                  <div className="rounded-2xl border border-[#059669]/30 bg-[#ECFDF5] p-5 text-[#065F46]">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-full bg-[#059669] text-white">
                        <IconCheck className="size-5" />
                      </span>
                      <div>
                        <h3 className="font-heading text-base font-black">
                          {lang === "ar" ? "تم تسجيلك بنجاح كعميل أدوية شهرية!" : "Successfully Registered!"}
                        </h3>
                        <p className="text-xs opacity-90">
                          {lang === "ar"
                            ? "تم إنشاء ملفك الشهري وجدولته لدى صيدلية بحبح تحت إشراف د. هاشم بحبح"
                            : "Your monthly profile is ready and scheduled with Bahbah Pharmacy"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Membership Profile Card */}
                  <div className="rounded-3xl border border-border bg-gradient-to-br from-[#184C8A] to-[#112D51] p-6 text-white shadow-xl">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-4">
                      <div>
                        <span className="text-[11px] font-bold text-white/70">
                          {lang === "ar" ? "كود العميل الشهري:" : "Patient Code:"}
                        </span>
                        <p className="font-heading text-2xl font-black text-[#F59E0B]">
                          {registeredSuccessSub.memberNo}
                        </p>
                      </div>
                      <div className="text-end">
                        <span className="text-[11px] font-bold text-white/70">
                          {lang === "ar" ? "موعد الاستلام القادم:" : "Next Delivery:"}
                        </span>
                        <p className="font-heading text-lg font-black text-white" dir="ltr">
                          {registeredSuccessSub.next}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <span className="text-[11px] text-white/70">{lang === "ar" ? "اسم المريض:" : "Patient Name:"}</span>
                        <p className="font-bold text-white">{registeredSuccessSub.name}</p>
                      </div>
                      <div>
                        <span className="text-[11px] text-white/70">{lang === "ar" ? "رقم الهاتف / واتساب:" : "Phone:"}</span>
                        <p className="font-bold text-white" dir="ltr">{registeredSuccessSub.phone}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-[11px] text-white/70">{lang === "ar" ? "عنوان التوصيل:" : "Delivery Address:"}</span>
                        <p className="text-sm font-semibold text-white/90">{registeredSuccessSub.address}</p>
                      </div>
                      {registeredSuccessSub.notes && (
                        <div className="sm:col-span-2 rounded-xl bg-white/10 p-3">
                          <span className="text-[11px] font-bold text-[#F59E0B]">{lang === "ar" ? "الملاحظات والتركيزات:" : "Notes:"}</span>
                          <p className="mt-1 text-xs text-white/90">{registeredSuccessSub.notes}</p>
                        </div>
                      )}
                    </div>

                    {registeredSuccessSub.prescriptionUrl && (
                      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-black/25 p-3">
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-white">
                          <Image
                            src={registeredSuccessSub.prescriptionUrl}
                            alt="Prescription"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white">{lang === "ar" ? "الروشتة الشهرية المعتمدة" : "Active Prescription"}</p>
                          <button
                            onClick={() => setPreviewModalImg(registeredSuccessSub.prescriptionUrl || null)}
                            className="text-[11px] font-bold text-[#F59E0B] hover:underline"
                          >
                            {lang === "ar" ? "معاينة الروشتة بحجم كامل" : "View full image"}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <a
                        href={`https://wa.me/201011500166?text=${encodeURIComponent(
                          `السلام عليكم د. هاشم، أنا مسجل كعميل أدوية شهرية في صيدلية بحبح (كود: ${registeredSuccessSub.memberNo} - الاسم: ${registeredSuccessSub.name}).`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 items-center gap-2 rounded-full bg-[#25D366] px-6 text-xs font-black text-white shadow-md hover:brightness-105"
                      >
                        <IconWhatsapp className="size-4" />
                        {lang === "ar" ? "تواصل مع الصيدلي عبر واتساب لتأكيد الروشتة" : "Confirm via WhatsApp"}
                      </a>

                      <Button
                        variant="outline"
                        className="h-11 rounded-full border-white/30 bg-white/10 text-xs font-bold text-white hover:bg-white/20 hover:text-white"
                        onClick={() => {
                          setRegisteredSuccessSub(null);
                          setName("");
                          setPhone("");
                          setAddress("");
                          setNotes("");
                          setPrescriptionPreview(null);
                          setPrescriptionUrl("");
                        }}
                      >
                        <IconPlus className="size-4" />
                        {lang === "ar" ? "تسجيل مريض / روشتة أخرى" : "Register another patient"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Patient Name */}
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold text-foreground/80">
                        {lang === "ar" ? "اسم المريض ثلاثي *" : "Patient Full Name *"}
                      </span>
                      <Input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={lang === "ar" ? "مثال: محمد أحمد علي" : "e.g. Mohamed Ahmed"}
                        className="h-11 rounded-xl"
                      />
                    </label>

                    {/* Phone Number */}
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold text-foreground/80">
                        {lang === "ar" ? "رقم الموبايل / واتساب (للتأكيد ومتابعة الشحن) *" : "Phone / WhatsApp *"}
                      </span>
                      <Input
                        required
                        type="tel"
                        dir="ltr"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="010XXXXXXXX"
                        className="h-11 rounded-xl"
                      />
                    </label>

                    {/* Full Address */}
                    <label className="block space-y-1.5 sm:col-span-2">
                      <span className="text-xs font-bold text-foreground/80">
                        {lang === "ar" ? "العنوان بالتفصيل (المحافظة - المركز/المدينة - الشارع - علامة مميزة) *" : "Full Delivery Address *"}
                      </span>
                      <Input
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={lang === "ar" ? "مثال: ديروط - شارع البحر الأعظم - بجوار البنك الأهلي" : "Full address details..."}
                        className="h-11 rounded-xl"
                      />
                    </label>

                    {/* Preferred Day of Month */}
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold text-foreground/80">
                        {lang === "ar" ? "اليوم المفضل للتوصيل شهرياً *" : "Preferred Monthly Delivery Day *"}
                      </span>
                      <Select
                        value={String(dayPref)}
                        onValueChange={(v) => setDayPref(Number(v))}
                      >
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="اختار يوم التوصيل" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                            <SelectItem key={d} value={String(d)}>
                              {lang === "ar" ? `يوم ${d} من كل شهر ميلادي` : `Day ${d} of every month`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>

                    {/* Delivery Promise Badge */}
                    <div className="flex flex-col justify-end">
                      <div className="flex items-center gap-2 rounded-xl bg-[#EAF2FA] p-3 text-xs font-bold text-[#184C8A]">
                        <IconScooter className="size-5 shrink-0" />
                        <span>
                          {lang === "ar"
                            ? "شحن سريع لجميع المحافظات مع تتبع مباشر عبر واتساب"
                            : "Fast express shipping across all governorates"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Prescription Upload / Photo Capture */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-foreground/80">
                      {lang === "ar" ? "تصوير الروشتة أو صورة العلبة / العلاج *" : "Prescription Photo Upload / Camera *"}
                    </span>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleRxFileChange}
                      className="hidden"
                    />

                    {prescriptionPreview ? (
                      <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/40 p-3">
                        <div className="flex items-center justify-between pb-3">
                          <span className="text-xs font-bold text-[#059669]">
                            {lang === "ar" ? "✓ تم التقاط / اختيار صورة الروشتة" : "✓ Prescription image selected"}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="h-8 rounded-full px-3 text-xs"
                            onClick={() => {
                              setPrescriptionPreview(null);
                              setPrescriptionUrl("");
                            }}
                          >
                            <X className="size-3.5" />
                            {lang === "ar" ? "حذف وتصوير أخرى" : "Retake"}
                          </Button>
                        </div>
                        <div className="relative h-48 w-full overflow-hidden rounded-xl bg-black/10">
                          <Image
                            src={prescriptionPreview}
                            alt="Prescription preview"
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#184C8A]/30 bg-[#EAF2FA]/40 p-6 text-center transition hover:border-[#184C8A] hover:bg-[#EAF2FA]/80"
                      >
                        <div className="grid size-14 place-items-center rounded-full bg-white text-[#184C8A] shadow-md transition group-hover:scale-110">
                          <Camera className="size-7" />
                        </div>
                        <p className="mt-3 font-heading text-sm font-black text-[#184C8A]">
                          {lang === "ar" ? "اضغط هنا لتصوير الروشتة بالكاميرا أو رفعها من الموبايل" : "Click to capture prescription photo or upload"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {lang === "ar" ? "يدعم JPG, PNG, WEBP — واضحة ومقروءة" : "Supports JPG, PNG — clear & readable"}
                        </p>
                        {uploadingRx && (
                          <p className="mt-2 text-xs font-bold text-[#F59E0B] animate-pulse">
                            {lang === "ar" ? "جارٍ معالجة ورفع الصورة..." : "Processing image..."}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Notes / Special Instructions Box */}
                  <label className="block space-y-1.5">
                    <span className="text-xs font-bold text-foreground/80">
                      {lang === "ar" ? "خانة للملاحظات (لو حابب تكتب تركيزات معينة أو بدائل مقبولة أو تفاصيل خاصة)" : "Notes & Specific Instructions"}
                    </span>
                    <Textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={
                        lang === "ar"
                          ? "اكتب هنا أي تفاصيل: مثل تركيز معين للدواء، شركات مفضلة أو مرفوضة، مواعيد مناسبة للتسليم، أي أدوية حساسية..."
                          : "Write specific notes, acceptable alternatives, concentrations, allergies..."
                      }
                      className="rounded-xl"
                    />
                  </label>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      size="lg"
                      className="h-13 w-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-base font-black text-white shadow-lg shadow-[#F59E0B]/30 hover:brightness-105 active:scale-95 transition-all"
                    >
                      <IconCheck className="size-5" />
                      {submitting
                        ? (lang === "ar" ? "جارٍ تسجيل ملف المريض..." : "Saving registration...")
                        : (lang === "ar" ? "تأكيد تسجيل العميل الشهري وجدولة العلاج" : "Confirm Monthly Registration")}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Reveal>
        </section>
      )}

      {/* ================= TAB 2: عميل سابق وتكرار العلاج ================= */}
      {activeTab === "lookup" && (
        <section className="mx-auto max-w-4xl px-4 pt-10 md:px-6">
          <Reveal>
            <div className="overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-lg md:p-10">
              <div className="flex items-center gap-3 border-b border-border/60 pb-5">
                <span className="grid size-12 place-items-center rounded-2xl bg-[#FFF4E5] text-[#C56A0A]">
                  <Search className="size-6" />
                </span>
                <div>
                  <h2 className="font-heading text-xl font-black md:text-2xl">
                    {lang === "ar" ? "عميل سابق / طلب تكرار العلاج فوراً" : "Existing Patient Refill"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {lang === "ar"
                      ? "ابحث برقم موبايلك أو كود المريض لمراجعة روشتتك وطلب تكرار العلاج هذا الشهر فوراً"
                      : "Search by phone or patient ID to view prescription and request immediate monthly refill"}
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mt-6 flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePatientSearch()}
                  placeholder={lang === "ar" ? "ادخل رقم الموبايل أو كود المريض (مثال: 010... أو M-101)" : "Enter phone or patient code (e.g. 010... or M-101)"}
                  className="h-12 flex-1 rounded-xl text-sm font-bold"
                  dir="ltr"
                />
                <Button
                  onClick={handlePatientSearch}
                  className="h-12 rounded-xl bg-[#184C8A] px-6 font-black text-white hover:bg-[#112D51]"
                >
                  <Search className="size-4.5" />
                  {lang === "ar" ? "بحث" : "Search"}
                </Button>
              </div>

              {/* Found Patient Record */}
              {foundPatient && (
                <div className="mt-6 space-y-5 rounded-3xl border border-border bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] p-6 text-foreground">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                    <div>
                      <span className="text-[11px] font-bold text-muted-foreground">
                        {lang === "ar" ? "كود المريض:" : "Patient Code:"}
                      </span>
                      <p className="font-heading text-xl font-black text-[#184C8A]">
                        {foundPatient.id}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        className={`rounded-full px-3 py-1 font-bold ${
                          foundPatient.status === "active"
                            ? "bg-[#ECFDF5] text-[#059669]"
                            : "bg-[#FEF2F2] text-[#DC2626]"
                        }`}
                      >
                        {foundPatient.status === "active"
                          ? (lang === "ar" ? "توصيل شهري نشط" : "Active Subscription")
                          : (lang === "ar" ? "متوقف مؤقتاً" : "Paused")}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full text-xs font-bold"
                        onClick={() => toggleCareSubStatus(foundPatient.id)}
                      >
                        <RotateCw className="size-3.5" />
                        {foundPatient.status === "active"
                          ? (lang === "ar" ? "إيقاف مؤقت" : "Pause")
                          : (lang === "ar" ? "استئناف" : "Resume")}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <span className="text-[11px] text-muted-foreground">{lang === "ar" ? "اسم المريض:" : "Patient Name:"}</span>
                      <p className="font-bold text-base">{foundPatient.nameAr}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground">{lang === "ar" ? "رقم الهاتف:" : "Phone:"}</span>
                      <p className="font-bold text-base" dir="ltr">{foundPatient.phone}</p>
                    </div>
                    {foundPatient.address && (
                      <div className="sm:col-span-2">
                        <span className="text-[11px] text-muted-foreground">{lang === "ar" ? "عنوان التوصيل:" : "Delivery Address:"}</span>
                        <p className="text-sm font-semibold">{foundPatient.address}</p>
                      </div>
                    )}
                    {foundPatient.notes && (
                      <div className="sm:col-span-2 rounded-2xl bg-[#FFFBEB] p-3 text-[#B45E0A] ring-1 ring-[#F59E0B]/20">
                        <span className="text-[11px] font-bold">{lang === "ar" ? "الملاحظات والتركيزات المسجلة:" : "Recorded Notes:"}</span>
                        <p className="mt-1 text-xs font-semibold">{foundPatient.notes}</p>
                      </div>
                    )}
                  </div>

                  {foundPatient.prescriptionUrl && (
                    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                        <Image
                          src={foundPatient.prescriptionUrl}
                          alt="Prescription"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold">{lang === "ar" ? "صورة الروشتة المسجلة في ملف المريض" : "Saved Prescription Image"}</p>
                        <button
                          onClick={() => setPreviewModalImg(foundPatient.prescriptionUrl || null)}
                          className="mt-0.5 text-xs font-bold text-[#184C8A] hover:underline"
                        >
                          {lang === "ar" ? "عرض الروشتة بحجم كامل" : "View full image"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Refill Success Alert */}
                  {refillSuccessOrder && (
                    <div className="rounded-2xl border border-[#059669]/30 bg-[#ECFDF5] p-4 text-[#065F46]">
                      <p className="font-heading text-sm font-black">
                        {lang === "ar"
                          ? `✓ تم إنشاء طلب تكرار العلاج لهذا الشهر بنجاح برقم: (${refillSuccessOrder})`
                          : `Refill order generated: #${refillSuccessOrder}`}
                      </p>
                      <p className="mt-1 text-xs opacity-90">
                        {lang === "ar"
                          ? "تم إرسال الطلب فوراً إلى سيستم صيدلية بحبح وسيقوم الصيدلي بالتجهيز والشحن."
                          : "Order dispatched to pharmacy team for dispatch and delivery."}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      size="lg"
                      disabled={refilling}
                      className="h-12 flex-1 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-sm font-black text-white shadow-lg shadow-[#F59E0B]/30 hover:brightness-105"
                      onClick={() => handleInstantRefill(foundPatient)}
                    >
                      <IconRefill className="size-4.5" />
                      {refilling
                        ? (lang === "ar" ? "جارٍ إرسال طلب التكرار..." : "Sending refill order...")
                        : (lang === "ar" ? "⚡ طلب تكرار العلاج هذا الشهر فوراً" : "Instant Monthly Refill Now")}
                    </Button>

                    <a
                      href={`https://wa.me/201011500166?text=${encodeURIComponent(
                        `السلام عليكم، أنا المريض ${foundPatient.nameAr} (كود: ${foundPatient.id})، أرغب بتكرار علاجي الشهري المسجل لدى صيدلية بحبح.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-12 items-center gap-2 rounded-full bg-[#25D366] px-6 text-xs font-black text-white shadow-md hover:brightness-105"
                    >
                      <IconWhatsapp className="size-4" />
                      {lang === "ar" ? "واتساب الصيدلي" : "WhatsApp"}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </section>
      )}

      {/* ================= TAB 3: خانة العملاء المشتركين ================= */}
      {activeTab === "directory" && (
        <section className="mx-auto max-w-5xl px-4 pt-10 md:px-6">
          <Reveal>
            <div className="overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-lg md:p-10">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[#EAF6F1] text-[#059669]">
                    <UserCheck className="size-6" />
                  </span>
                  <div>
                    <h2 className="font-heading text-xl font-black md:text-2xl">
                      {lang === "ar" ? "سجل وخانة عملاء الأدوية الشهرية" : "Registered Monthly Patients Directory"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {lang === "ar"
                        ? "دليل وقائمة المرضى المسجلين في برنامج التوصيل الشهري المنتظم"
                        : "Directory of patients registered in the monthly delivery program"}
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-64">
                  <Input
                    value={dirSearch}
                    onChange={(e) => setDirSearch(e.target.value)}
                    placeholder={lang === "ar" ? "بحث بالاسم أو الهاتف أو الكود..." : "Filter by name, phone or ID..."}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
              </div>

              {filteredDirectory.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-bold text-muted-foreground">
                    {lang === "ar" ? "لا توجد نتائج مطابقة في سجل العملاء" : "No registered patients match your search"}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 rounded-full text-xs font-bold"
                    onClick={() => setActiveTab("register")}
                  >
                    <IconPlus className="size-4" />
                    {lang === "ar" ? "تسجيل عميل جديد الآن" : "Register a patient now"}
                  </Button>
                </div>
              ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {filteredDirectory.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex flex-col justify-between rounded-2xl border border-border/80 bg-muted/20 p-4 transition hover:border-[#184C8A]/40 hover:bg-card hover:shadow-md"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-lg bg-[#EAF2FA] px-2 py-0.5 font-heading text-xs font-black text-[#184C8A]">
                            {patient.id}
                          </span>
                          <Badge
                            className={`rounded-full text-[10px] font-bold ${
                              patient.status === "active"
                                ? "bg-[#ECFDF5] text-[#059669]"
                                : "bg-[#FEF2F2] text-[#DC2626]"
                            }`}
                          >
                            {patient.status === "active" ? (lang === "ar" ? "نشط" : "Active") : (lang === "ar" ? "متوقف" : "Paused")}
                          </Badge>
                        </div>

                        <div>
                          <h4 className="font-heading text-sm font-black text-foreground">
                            {patient.nameAr}
                          </h4>
                          <p className="text-xs text-muted-foreground" dir="ltr">
                            {patient.phone}
                          </p>
                        </div>

                        {patient.address && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            📍 {patient.address}
                          </p>
                        )}

                        {patient.notes && (
                          <div className="rounded-xl bg-[#FFFBEB] p-2 text-[11px] font-semibold text-[#B45E0A]">
                            📝 {patient.notes}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                        {patient.prescriptionUrl ? (
                          <button
                            onClick={() => setPreviewModalImg(patient.prescriptionUrl || null)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#184C8A] hover:underline"
                          >
                            <FileText className="size-3.5" />
                            {lang === "ar" ? "معاينة الروشتة" : "View Rx"}
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            {lang === "ar" ? "لا توجد صورة روشتة" : "No Rx image"}
                          </span>
                        )}

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            className="h-8 rounded-full bg-[#F59E0B] px-3 text-[11px] font-black text-white hover:bg-[#EA580C]"
                            onClick={() => handleInstantRefill(patient)}
                          >
                            <IconRefill className="size-3" />
                            {lang === "ar" ? "تكرار" : "Refill"}
                          </Button>

                          <a
                            href={`https://wa.me/201011500166?text=${encodeURIComponent(
                              `مرحباً، بخصوص العميل الشهري ${patient.nameAr} (كود: ${patient.id}).`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="grid size-8 place-items-center rounded-full bg-[#25D366] text-white hover:brightness-105"
                          >
                            <IconWhatsapp className="size-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        </section>
      )}

      {/* Full Prescription Preview Modal */}
      <Dialog open={!!previewModalImg} onOpenChange={() => setPreviewModalImg(null)}>
        <DialogContent className="max-w-xl p-4">
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-black">
              {lang === "ar" ? "معاينة صورة الروشتة الشهرية" : "Prescription Image Preview"}
            </DialogTitle>
          </DialogHeader>
          {previewModalImg && (
            <div className="relative mt-2 h-[70vh] w-full overflow-hidden rounded-xl bg-black/5">
              <Image
                src={previewModalImg}
                alt="Prescription full preview"
                fill
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
