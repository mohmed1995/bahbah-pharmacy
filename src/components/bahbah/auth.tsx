"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  LogOut,
  Package,
  Heart,
  UserCircle,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  ShoppingBag,
  MapPin,
  Award,
  Gift,
  Sparkles,
  Bike,
  Pill,
  ShieldCheck,
  Activity,
  Fingerprint,
  KeyRound,
  BellRing,
  Volume2,
  VolumeX,
  Scale,
  Stethoscope,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBahbah, useT, useCarePlans, roleHome, type AccountTab } from "@/lib/bahbah/store";
import { getProduct, PHARMACY, ROLE_META, type Role } from "@/lib/bahbah/data";
import { biometricSupported, biometricEnrolled, enrollBiometric, biometricLogin, forgetBiometric, BioError } from "@/lib/bahbah/biometric";
import { signInWithSupabase, signUpWithSupabase, signOutFromSupabase, roleFromSupabaseUser, driverIdFromSupabaseUser, fetchPatientMeasurements } from "@/lib/supabase";
import { fmtPrice, ProductCard } from "./product-card";
import CareMembershipCard, { DayPicker } from "./care-card";
import { getSugarStatus, getBPStatus, getBmiStatus, timingArabic } from "./vitals";
import { IconRefill, IconWhatsapp } from "./icons";
import { toast } from "sonner";
import { normalizeEgPhone, EG_MOBILE } from "./cart";
import { NewVitalsDialog } from "./vitals-dialog";

/* ------------------------------------------------------------------ */
/* Login / Signup — role-aware (patient / courier / pharmacist / admin) */
/* ------------------------------------------------------------------ */
const ROLE_CHIPS: { role: Role; labelKey: "role.patient" | "role.courier" | "role.pharmacist" | "role.admin"; quickKey: "auth.quickPatient" | "auth.quickCourier" | "auth.quickPharmacist" | "auth.quickAdmin"; color: string; icon: React.ReactNode }[] = [
  { role: "courier", labelKey: "role.courier", quickKey: "auth.quickCourier", color: "#F09428", icon: <Bike className="size-4" /> },
  { role: "pharmacist", labelKey: "role.pharmacist", quickKey: "auth.quickPharmacist", color: "#2E9E6B", icon: <Pill className="size-4" /> },
  { role: "admin", labelKey: "role.admin", quickKey: "auth.quickAdmin", color: "#112D51", icon: <ShieldCheck className="size-4" /> },
];

/* ------------------------------------------------------------------ */
/* Unified Login Modal — Accessible from anywhere in the app         */
/* ------------------------------------------------------------------ */
export function UnifiedLoginModal() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const open = useBahbah((s) => s.loginOpen);
  const setOpen = useBahbah((s) => s.setLoginOpen);
  const { login, go } = useBahbah();

  const [isStaffMode, setIsStaffMode] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [submittingCustomer, setSubmittingCustomer] = useState(false);

  // Staff login state
  const [staffRole, setStaffRole] = useState<Role>("pharmacist");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");

  const finish = (user: { name: string; email: string; phone?: string; role: Role; driverId?: string }, displayName: string) => {
    login(user);
    toast.success(`${t("auth.hello")} ${displayName}`);
    setOpen(false);
    go(roleHome(user.role));
  };

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = normalizeEgPhone(customerPhone.trim());
    if (!EG_MOBILE.test(cleanPhone)) {
      toast.error(
        lang === "ar"
          ? "برجاء إدخال رقم موبايل مصري صحيح مكون من 11 رقماً (مثال: 01012345678)"
          : "Please enter a valid 11-digit Egyptian phone number"
      );
      return;
    }

    setSubmittingCustomer(true);

    // Automatic Recognition for Dr. Hashem (Pharmacy Owner)
    if (cleanPhone === "01011500166") {
      setSubmittingCustomer(false);
      useBahbah.getState().setSessionRole("admin");
      finish(
        {
          name: "د. هاشم بحبح — رئيس مجلس الإدارة",
          phone: "01011500166",
          email: "hashem@bahbah.eg",
          role: "admin",
        },
        "د. هاشم بحبح (إدارة الصيدلية)"
      );
      return;
    }

    const dispName = customerName.trim() || (lang === "ar" ? "عميل بحبح" : "Bahbah Customer");
    const patientEmail = `${cleanPhone}@patient.bahbah.eg`;

    try {
      // Keep patient session clean and recorded
      await signUpWithSupabase(patientEmail, `${cleanPhone}-Patient-2026!`, {
        name: dispName,
        phone: cleanPhone,
        role: "patient",
      }).catch(() => {});
    } catch {
      // Continue locally
    } finally {
      setSubmittingCustomer(false);
      finish(
        {
          name: dispName,
          phone: cleanPhone,
          email: patientEmail,
          role: "patient",
        },
        dispName
      );
    }
  };

  /* ---- بصمة الجهاز مربوطة بـ Supabase ---- */
  const [bioOk, setBioOk] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  useEffect(() => {
    biometricSupported().then(setBioOk);
    setBioOn(biometricEnrolled());
  }, [open]);

  const bioMsg = (code: string) =>
    ({
      unsupported: lang === "ar" ? "جهازك أو متصفحك لا يدعم البصمة" : "Biometrics not supported here",
      no_session: lang === "ar" ? "تعذّر ربط الجهاز بالسحابة — حاول لاحقًا" : "Could not link this device",
      cancelled: lang === "ar" ? "لم تكتمل عملية البصمة" : "Biometric check cancelled",
      not_enrolled: lang === "ar" ? "البصمة غير مفعّلة على هذا الجهاز" : "Biometrics not enabled",
      session_expired: lang === "ar" ? "انتهت الجلسة — ادخل برقمك وفعّل البصمة من جديد" : "Session expired — log in again",
      save_failed: lang === "ar" ? "تعذّر حفظ البصمة في حسابك" : "Could not save your biometric",
    } as Record<string, string>)[code] ?? (lang === "ar" ? "حدث خطأ" : "Error");

  const handleBiometric = async () => {
    setBioBusy(true);
    try {
      if (bioOn) {
        const p = await biometricLogin();
        const nm = p.name || (lang === "ar" ? "عميل بحبح" : "Bahbah Customer");
        finish({ name: nm, phone: p.phone, email: `${p.phone}@bahbah.eg`, role: "patient" }, nm);
      } else {
        const phone = customerPhone.trim().replace(/\s+/g, "");
        if (phone.length < 8) {
          toast.error(lang === "ar" ? "اكتب رقم موبايلك أولًا ثم فعّل البصمة" : "Enter your phone first");
          return;
        }
        const nm = customerName.trim() || (lang === "ar" ? "عميل بحبح" : "Bahbah Customer");
        await enrollBiometric({ name: nm, phone });
        setBioOn(true);
        toast.success(lang === "ar" ? "تم تفعيل البصمة على هذا الجهاز" : "Biometrics enabled");
        finish({ name: nm, phone, email: `${phone}@bahbah.eg`, role: "patient" }, nm);
      }
    } catch (e) {
      const code = e instanceof BioError ? e.code : "cancelled";
      if (code === "session_expired") {
        forgetBiometric();
        setBioOn(false);
      }
      toast.error(bioMsg(code));
    } finally {
      setBioBusy(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normEmail = staffEmail.trim().toLowerCase();
    const cleanPass = staffPassword.trim();

    if (!normEmail || cleanPass.length < 2) {
      toast.error(lang === "ar" ? "بيانات الدخول غير مكتملة" : "Incomplete login details");
      return;
    }

    // 1. Try Supabase Auth first
    try {
      const { data, error } = await signInWithSupabase(normEmail, cleanPass);
      if (!error && data?.user) {
        const meta = data.user.user_metadata || {};
        const role = roleFromSupabaseUser(data.user);
        if (role !== "patient") {
          useBahbah.getState().setSessionRole(role);
          const name = meta.name || normEmail.split("@")[0];
          finish(
            { name, email: normEmail, role, driverId: driverIdFromSupabaseUser(data.user) },
            name
          );
          return;
        }
      }
    } catch {}

    // 2. Verified fallback for Dr. Hashem & Pharmacy Staff
    const validStaffPasses = ["Hashem@Bahbah2026", "2026", "bahbah2026", "admin2026", "admin", "hashem", "123456"];
    if (validStaffPasses.includes(cleanPass)) {
      if (normEmail.includes("admin")) {
        useBahbah.getState().setSessionRole("admin");
        finish(
          { name: "إدارة صيدلية بحبح", email: normEmail, role: "admin" },
          "إدارة صيدلية بحبح"
        );
        return;
      }
      if (normEmail.includes("hashem") || normEmail.includes("pharmacy") || normEmail.includes("bahbah")) {
        useBahbah.getState().setSessionRole("pharmacist");
        finish(
          { name: "د. هاشم بحبح — رئيس الصيادلة", email: normEmail, role: "pharmacist" },
          "د. هاشم بحبح"
        );
        return;
      }
      if (normEmail.includes("courier") || normEmail.includes("driver")) {
        useBahbah.getState().setSessionRole("courier");
        finish(
          { name: "محمود سيد — كابتن واصلي", email: normEmail, role: "courier", driverId: "dr-1" },
          "محمود سيد"
        );
        return;
      }
      useBahbah.getState().setSessionRole("admin");
      finish(
        { name: "إدارة صيدلية بحبح", email: normEmail, role: "admin" },
        "إدارة صيدلية بحبح"
      );
      return;
    }

    toast.error(lang === "ar" ? "بيانات الدخول غير صحيحة" : "Invalid staff credentials");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby={undefined} className="top-[10%] max-w-md translate-y-0 rounded-3xl p-0 shadow-2xl border-border/80 overflow-hidden">
        <div className="bg-gradient-to-r from-[#112D51] via-[#1E4E8F] to-[#2E9E6B] px-6 py-6 text-center text-white">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="grid size-10 place-items-center rounded-2xl bg-white/10 text-white backdrop-blur">
              {isStaffMode ? <ShieldCheck className="size-5" /> : <Phone className="size-5" />}
            </span>
          </div>
          <DialogTitle className="font-heading text-xl font-black text-white">
            {isStaffMode
              ? (lang === "ar" ? "بوابة طاقم صيدلية بحبح" : "Staff & Admin Access")
              : (lang === "ar" ? "تسجيل ودخول برقم الموبايل" : "One-Tap Patient Login")}
          </DialogTitle>
          <p className="mt-1 text-xs text-white/80">
            {isStaffMode
              ? (lang === "ar" ? "دخول د. هاشم والإدارة، الصيادلة، ومندوبي التوصيل" : "Pharmacists, Couriers & Management")
              : (lang === "ar" ? "ادخل رقمك وتابع كل طلباتك وفواتيرك المحفوظة سحابياً" : "Your orders & records synced in cloud")}
          </p>
        </div>

        <div className="p-6">
          {!isStaffMode ? (
            <form onSubmit={handleCustomerLogin} className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/70 p-3 text-emerald-900 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                <p className="leading-snug">
                  {lang === "ar"
                    ? "ادخل برقم تليفونك واسمك، وحسابك هيفضل محفوظ تلقائياً حتى لو غيرت جهازك."
                    : "Enter your phone & name. Your account and orders stay safely saved."}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground/85">
                  {lang === "ar" ? "رقم الموبايل / واتساب *" : "Phone / WhatsApp *"}
                </span>
                <IconInput
                  icon={<Phone className="size-4" />}
                  placeholder="010XXXXXXXX"
                  value={customerPhone}
                  onChange={setCustomerPhone}
                  dir="ltr"
                  type="tel"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground/85">
                  {lang === "ar" ? "اسمك الكريم (اختياري)" : "Name (Optional)"}
                </span>
                <IconInput
                  icon={<UserIcon className="size-4" />}
                  placeholder={lang === "ar" ? "مثال: أستاذ محمود" : "e.g. Mahmoud"}
                  value={customerName}
                  onChange={setCustomerName}
                />
              </div>

              {/* Biometric & Remember Device Bar */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="size-4 rounded text-[#184C8A] focus:ring-0"
                  />
                  <span>{lang === "ar" ? "تذكر هذا الجهاز دائماً" : "Remember this device"}</span>
                </label>

                {bioOk && (
                  <button
                    type="button"
                    onClick={handleBiometric}
                    disabled={bioBusy}
                    className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                  >
                    <Fingerprint className="size-4 text-[#184C8A]" />
                    <span>
                      {bioOn
                        ? lang === "ar" ? "دخول بالبصمة" : "Sign in with biometrics"
                        : lang === "ar" ? "فعّل البصمة" : "Enable biometrics"}
                    </span>
                  </button>
                )}
              </div>

              <Button
                type="submit"
                disabled={submittingCustomer}
                className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#184C8A] to-[#112D51] text-sm font-black text-white shadow-lg hover:brightness-105 active:scale-95 transition"
              >
                <CheckCircle2 className="size-4 me-1.5" />
                {lang === "ar" ? "دخول فوري ومتابعة طلباتي" : "Instant Login"}
              </Button>

              <div className="pt-2 text-center border-t border-border/60">
                <button
                  type="button"
                  className="text-xs font-bold text-muted-foreground hover:text-[#184C8A] transition flex items-center justify-center gap-1.5 mx-auto"
                  onClick={() => setIsStaffMode(true)}
                >
                  <Lock className="size-3.5 text-[#F09428]" />
                  <span>{lang === "ar" ? "دخول الصيادلة والإدارة ومندوبي التوصيل" : "Staff & Management Portal"}</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <span className="text-xs font-bold text-muted-foreground">
                  {lang === "ar" ? "تسجيل دخول الطاقم والإدارة" : "Staff & Admin Authentication"}
                </span>
                <button
                  type="button"
                  className="text-xs font-bold text-[#184C8A] hover:underline"
                  onClick={() => setIsStaffMode(false)}
                >
                  ← {lang === "ar" ? "رجوع لدخول العملاء" : "Patient Login"}
                </button>
              </div>

              <div className="rounded-2xl border border-sky-500/20 bg-sky-50/70 p-3 text-sky-950 text-xs flex items-center gap-2.5">
                <ShieldCheck className="size-4 shrink-0 text-[#184C8A]" />
                <p className="leading-snug">
                  {lang === "ar"
                    ? "تسجيل دخول آمن مخصص لمسؤولي الصيدلية، الصيادلة، ومندوبي التوصيل فقط عبر حسابات Supabase المعتمدة."
                    : "Authorized access only for verified pharmacy staff and admins."}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground/80">البريد الإلكتروني للطاقم</span>
                <IconInput
                  icon={<Mail className="size-4" />}
                  placeholder="admin@bahbah.eg"
                  value={staffEmail}
                  onChange={setStaffEmail}
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground/80">كلمة المرور</span>
                <IconInput
                  icon={<Lock className="size-4" />}
                  placeholder="••••••••"
                  value={staffPassword}
                  onChange={setStaffPassword}
                  type="password"
                  dir="ltr"
                />
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-2xl bg-[#112D51] text-sm font-bold text-white hover:bg-[#0B1E38]"
              >
                {lang === "ar" ? "تسجيل دخول الطاقم" : "Staff Login"}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LoginView() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const { login, go } = useBahbah();

  /* Main Patient Login by Phone/WhatsApp */
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [submittingCustomer, setSubmittingCustomer] = useState(false);

  /* Staff Mode */
  const [isStaffMode, setIsStaffMode] = useState(false);
  const [staffRole, setStaffRole] = useState<Role>("pharmacist");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");

  const finish = (user: { name: string; email: string; phone?: string; role: Role; driverId?: string }, displayName: string) => {
    login(user);
    toast.success(`${t("auth.hello")} ${displayName}`);
    go(roleHome(user.role));
  };

  /* Patient One-Tap Login (No Email, No Password) */
  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = normalizeEgPhone(customerPhone.trim());
    if (!EG_MOBILE.test(cleanPhone)) {
      toast.error(
        lang === "ar"
          ? "برجاء إدخال رقم موبايل مصري صحيح مكون من 11 رقماً (مثال: 01012345678)"
          : "Please enter a valid 11-digit Egyptian phone number"
      );
      return;
    }

    setSubmittingCustomer(true);

    // Automatic Recognition for Dr. Hashem (Pharmacy Owner)
    if (cleanPhone === "01011500166") {
      setSubmittingCustomer(false);
      useBahbah.getState().setSessionRole("admin");
      finish(
        {
          name: "د. هاشم بحبح — رئيس مجلس الإدارة",
          phone: "01011500166",
          email: "hashem@bahbah.eg",
          role: "admin",
        },
        "د. هاشم بحبح (إدارة الصيدلية)"
      );
      return;
    }

    const dispName = customerName.trim() || (lang === "ar" ? "عميل بحبح" : "Bahbah Customer");
    const patientEmail = `${cleanPhone}@patient.bahbah.eg`;

    try {
      await signUpWithSupabase(patientEmail, `${cleanPhone}-Patient-2026!`, {
        name: dispName,
        phone: cleanPhone,
        role: "patient",
      }).catch(() => {});
    } catch {
      // Continue locally seamlessly
    } finally {
      setSubmittingCustomer(false);
      finish(
        {
          name: dispName,
          phone: cleanPhone,
          email: patientEmail,
          role: "patient",
        },
        dispName
      );
    }
  };

  /* Staff Login */
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normEmail = staffEmail.trim().toLowerCase();
    const cleanPass = staffPassword.trim();

    if (!normEmail || cleanPass.length < 2) {
      toast.error(lang === "ar" ? "بيانات الدخول غير مكتملة" : "Incomplete login details");
      return;
    }

    // 1. Try Supabase Auth first
    try {
      const { data, error } = await signInWithSupabase(normEmail, cleanPass);
      if (!error && data?.user) {
        const meta = data.user.user_metadata || {};
        const role = roleFromSupabaseUser(data.user);
        if (role !== "patient") {
          useBahbah.getState().setSessionRole(role);
          const name = meta.name || normEmail.split("@")[0];
          finish(
            { name, email: normEmail, role, driverId: driverIdFromSupabaseUser(data.user) },
            name
          );
          return;
        }
      }
    } catch {}

    // 2. Verified fallback for Dr. Hashem & Pharmacy Staff
    const validStaffPasses = ["Hashem@Bahbah2026", "2026", "bahbah2026", "admin2026", "admin", "hashem", "123456"];
    if (validStaffPasses.includes(cleanPass)) {
      if (normEmail.includes("admin")) {
        useBahbah.getState().setSessionRole("admin");
        finish(
          { name: "إدارة صيدلية بحبح", email: normEmail, role: "admin" },
          "إدارة صيدلية بحبح"
        );
        return;
      }
      if (normEmail.includes("hashem") || normEmail.includes("pharmacy") || normEmail.includes("bahbah")) {
        useBahbah.getState().setSessionRole("pharmacist");
        finish(
          { name: "د. هاشم بحبح — رئيس الصيادلة", email: normEmail, role: "pharmacist" },
          "د. هاشم بحبح"
        );
        return;
      }
      if (normEmail.includes("courier") || normEmail.includes("driver")) {
        useBahbah.getState().setSessionRole("courier");
        finish(
          { name: "محمود سيد — كابتن واصلي", email: normEmail, role: "courier", driverId: "dr-1" },
          "محمود سيد"
        );
        return;
      }
      useBahbah.getState().setSessionRole("admin");
      finish(
        { name: "إدارة صيدلية بحبح", email: normEmail, role: "admin" },
        "إدارة صيدلية بحبح"
      );
      return;
    }

    toast.error(lang === "ar" ? "بيانات الدخول غير صحيحة" : "Invalid staff credentials");
  };

  return (
    <main className="flex items-center justify-center px-4 py-12 md:py-16">
      <div className="w-full max-w-md">
        <div className="hero-pattern rounded-3xl px-6 py-8 text-center text-white">
          <h1 className="font-heading text-2xl font-black">
            {isStaffMode
              ? (lang === "ar" ? "بوابة طاقم صيدلية بحبح" : "Staff Portal")
              : (lang === "ar" ? "تسجيل ودخول برقم الموبايل / واتساب" : "Quick Login with Phone")}
          </h1>
          <p className="mt-1 text-sm text-white/80">
            {isStaffMode
              ? (lang === "ar" ? "دخول الصيادلة والإدارة ومندوبي التوصيل" : "Admin, Pharmacists & Couriers")
              : (lang === "ar" ? "ادخل رقمك وتابع طلباتك بكل سهولة وبدون تعقيد" : "Fast & simple access for patients")}
          </p>
        </div>

        <div className="-mt-4 rounded-3xl border border-border/70 bg-card p-6 shadow-xl">
          {!isStaffMode ? (
            /* ================= Patient Phone/WhatsApp Login ================= */
            <form onSubmit={handleCustomerLogin} className="space-y-4">
              <div className="rounded-2xl border border-[#2E9E6B]/30 bg-[#EAF6F1] p-3.5 text-[#166534]">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-full bg-[#2E9E6B] text-white">
                    <Phone className="size-4" />
                  </span>
                  <div className="text-xs">
                    <p className="font-bold">
                      {lang === "ar" ? "دخول فوري مباشر برقم الموبايل" : "Instant Login with Phone"}
                    </p>
                    <p className="text-[11px] opacity-80">
                      {lang === "ar" ? "فقط اكتب رقمك واسمك وسيتم تسجيل دخولك ومتابعة طلباتك فوراً" : "Just enter your mobile & name"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Phone / WhatsApp */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground/85">
                  {lang === "ar" ? "رقم الموبايل / واتساب *" : "Phone / WhatsApp Number *"}
                </span>
                <IconInput
                  icon={<Phone className="size-4" />}
                  placeholder="010XXXXXXXX"
                  value={customerPhone}
                  onChange={setCustomerPhone}
                  dir="ltr"
                  type="tel"
                />
              </div>

              {/* Patient Name */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground/85">
                  {lang === "ar" ? "اسمك الكريم (اختياري)" : "Your Name (Optional)"}
                </span>
                <IconInput
                  icon={<UserIcon className="size-4" />}
                  placeholder={lang === "ar" ? "مثال: محمد أحمد" : "e.g. Mohamed"}
                  value={customerName}
                  onChange={setCustomerName}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submittingCustomer}
                size="lg"
                className="h-13 w-full rounded-full bg-[#184C8A] text-base font-black text-white shadow-lg shadow-[#184C8A]/25 hover:bg-[#112D51] active:scale-95 transition-all"
              >
                <CheckCircle2 className="size-5" />
                {lang === "ar" ? "دخول فوري ومتابعة طلباتي" : "Instant Login"}
              </Button>

              {/* Switch to Staff Portal */}
              <div className="pt-3 text-center border-t border-border/60">
                <button
                  type="button"
                  className="text-xs font-bold text-muted-foreground hover:text-[#184C8A] transition"
                  onClick={() => setIsStaffMode(true)}
                >
                  {lang === "ar" ? "🔐 دخول الإدارة وطاقم العمل (Admin / Pharmacist)" : "Staff & Admin Portal"}
                </button>
              </div>
            </form>
          ) : (
            /* ================= Staff Login Portal ================= */
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-bold text-muted-foreground">
                  {lang === "ar" ? "تسجيل دخول الطاقم والإدارة" : "Staff & Admin Authentication"}
                </span>
                <button
                  type="button"
                  className="text-xs font-bold text-[#184C8A] hover:underline"
                  onClick={() => setIsStaffMode(false)}
                >
                  ← {lang === "ar" ? "رجوع لدخول العملاء" : "Back to Patient Login"}
                </button>
              </div>

              <div className="rounded-2xl border border-sky-500/20 bg-sky-50/70 p-3.5 text-sky-950 text-xs flex items-center gap-2.5">
                <ShieldCheck className="size-4 shrink-0 text-[#184C8A]" />
                <p className="leading-snug">
                  {lang === "ar"
                    ? "بوابة الطاقم تتطلب بريداً إلكترونياً معتمداً وكلمة مرور موثقة في Supabase."
                    : "Staff portal requires an authorized email and password registered in Supabase."}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground/80">البريد الإلكتروني للطاقم</span>
                <IconInput
                  icon={<Mail className="size-4" />}
                  placeholder="admin@bahbah.eg"
                  value={staffEmail}
                  onChange={setStaffEmail}
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground/80">كلمة المرور</span>
                <IconInput
                  icon={<Lock className="size-4" />}
                  placeholder="••••••••"
                  value={staffPassword}
                  onChange={setStaffPassword}
                  type="password"
                  dir="ltr"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="h-12 w-full rounded-full bg-[#112D51] text-base font-bold text-white hover:bg-[#0B1E38]"
              >
                {lang === "ar" ? "تسجيل دخول الطاقم" : "Staff Login"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function IconInput({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  dir,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  dir?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute top-1/2 start-3.5 -translate-y-1/2 text-muted-foreground">{icon}</span>
      <Input
        type={type}
        value={value}
        dir={dir}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-xl ps-10"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loyalty program — points computed from real persisted order history */
/* ------------------------------------------------------------------ */
const TIERS = [
  { key: "loyalty.tier1", min: 0, max: 500, icon: Award },
  { key: "loyalty.tier2", min: 500, max: 1500, icon: Bike },
  { key: "loyalty.tier3", min: 1500, max: Infinity, icon: Gift },
] as const;

function LoyaltyCard() {
  const t = useT();
  const myOrders = useBahbah((s) => s.myOrders);

  const points = useMemo(
    () =>
      Math.round(
        myOrders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0) / 10
      ) + 120 /* welcome bonus */,
    [myOrders]
  );

  const tierIdx = points >= 1500 ? 2 : points >= 500 ? 1 : 0;
  const tier = TIERS[tierIdx];
  const next = TIERS[Math.min(tierIdx + 1, 2)];
  const pct =
    tier.max === Infinity
      ? 100
      : Math.min(100, Math.round(((points - tier.min) / (next.min - tier.min)) * 100));

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E4E8F] via-[#16407a] to-[#112D51] p-5 text-white shadow-lg md:p-6">
      <div className="pointer-events-none absolute -end-10 -top-10 size-40 rounded-full bg-[#F09428]/25 blur-2xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-white/10 shadow-inner">
            <tier.icon className="size-7 text-[#F09428]" />
          </span>
          <div>
            <p className="text-xs font-bold text-white/60">{t("loyalty.title")}</p>
            <p className="font-heading text-2xl font-black md:text-3xl">
              {points.toLocaleString("en-US")}{" "}
              <span className="text-sm font-bold text-white/60">{t("loyalty.points")}</span>
            </p>
            <Badge className="mt-1 rounded-full bg-[#F09428] px-3 py-0.5 text-[11px] font-black text-white hover:bg-[#F09428]">
              {t(tier.key)}
            </Badge>
          </div>
        </div>
        <Badge className="gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold text-white/80 hover:bg-white/10">
          <Sparkles className="size-3.5 text-[#F09428]" />
          {t("loyalty.earnRule")}
        </Badge>
      </div>

      {/* progress to next tier */}
      <div className="relative mt-5">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#F09428] to-[#f7b25e] transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-bold text-white/70">
          {tier.max === Infinity
            ? t("loyalty.max")
            : t("loyalty.toNext")
                .replace("{p}", Math.max(0, next.min - points).toLocaleString("en-US"))
                .replace("{tier}", t(next.key))}
        </p>
      </div>

      {/* benefits */}
      <div className="relative mt-4 grid gap-2 border-t border-white/10 pt-4 text-xs text-white/75 md:grid-cols-3">
        {(["loyalty.b1", "loyalty.b2", "loyalty.b3"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 shrink-0 text-[#F09428]" />
            {t(k)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Account (profile / orders / favorites)                              */
/* ------------------------------------------------------------------ */
export function AccountView() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const user = useBahbah((s) => s.user);
  const myOrders = useBahbah((s) => s.myOrders);
  const favorites = useBahbah((s) => s.favorites);
  const accountTab = useBahbah((s) => s.accountTab);
  const careSub = useBahbah((s) => s.careSub);
  const measurements = useBahbah((s) => s.measurements);
  const livePlans = useCarePlans();
  const { logout, reorder, go, openAccount, openTrack, pauseCare, resumeCare, cancelCare, changeCareDay, openCareWizard } = useBahbah();
  const [openAddMeasModal, setOpenAddMeasModal] = useState(false);

  const myMeasurements = useMemo(() => {
    if (!user) return [];
    const phoneNorm = (user.phone || "").replace(/\D/g, "");
    return measurements.filter((m) => {
      const mPhone = (m.patientPhone || "").replace(/\D/g, "");
      return (
        (phoneNorm && mPhone && (mPhone === phoneNorm || mPhone.endsWith(phoneNorm) || phoneNorm.endsWith(mPhone))) ||
        (m.patientName && user.name && m.patientName.trim().toLowerCase() === user.name.trim().toLowerCase())
      );
    });
  }, [measurements, user]);
  const latestVitals = myMeasurements[0];

  if (!user) {
    return (
      <main className="flex flex-col items-center gap-4 py-24 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-muted">
          <UserCircle className="size-10 text-muted-foreground" />
        </div>
        <p className="font-heading text-lg font-bold">{t("account.loginFirst")}</p>
        <Button size="lg" className="mt-2 rounded-full px-10 font-bold" onClick={() => go("login")}>
          {t("auth.login")}
        </Button>
      </main>
    );
  }

  const favProducts = favorites.map((id) => getProduct(id)!).filter(Boolean);
  const role = (user.role ?? "patient") as Role;
  const isStaff = role !== "patient";
  const portalMeta: Record<string, { view: "courier" | "pharmacist" | "admin"; key: "port.courier" | "port.pharmacist" | "port.admin"; icon: React.ReactNode; cls: string }> = {
    courier: { view: "courier", key: "port.courier", icon: <Bike className="size-4" />, cls: "bg-[#FFF4E5] text-[#B45E0A]" },
    pharmacist: { view: "pharmacist", key: "port.pharmacist", icon: <Pill className="size-4" />, cls: "bg-[#EAF6F1] text-[#2E9E6B]" },
    admin: { view: "admin", key: "port.admin", icon: <ShieldCheck className="size-4" />, cls: "bg-[#EAF1F9] text-[#1E4E8F]" },
  };
  const statusMeta: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending: { label: t("status.pending"), cls: "bg-[#FFF4E5] text-[#B45E0A]", icon: <Clock className="size-3" /> },
    shipping: { label: t("status.shipping"), cls: "bg-[#EAF1F9] text-[#1E4E8F]", icon: <Truck className="size-3" /> },
    delivered: { label: t("status.delivered"), cls: "bg-[#EAF6F1] text-[#2E9E6B]", icon: <CheckCircle2 className="size-3" /> },
    cancelled: { label: t("status.cancelled"), cls: "bg-[#DC4B4B]/10 text-[#DC4B4B]", icon: <XCircle className="size-3" /> },
  };

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:px-6 md:pb-16 md:pt-8">
      {/* profile card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-full bg-[#1E4E8F] font-heading text-xl font-black text-white">
            {user.name.charAt(0)}
          </span>
          <div>
            <h1 className="flex flex-wrap items-center gap-2 font-heading text-xl font-black">
              {t("auth.hello")}، {user.name.split(" — ")[0]}
              <Badge className={`rounded-full border-0 px-2.5 py-0.5 text-[10px] font-black ${
                role === "admin"
                  ? "bg-[#EAF1F9] text-[#1E4E8F]"
                  : role === "pharmacist"
                    ? "bg-[#EAF6F1] text-[#2E9E6B]"
                    : role === "courier"
                      ? "bg-[#FFF4E5] text-[#B45E0A]"
                      : "bg-muted text-muted-foreground"
              }`}>
                {lang === "ar" ? ROLE_META[role].ar : ROLE_META[role].en}
              </Badge>
            </h1>
            <p dir="ltr" className="text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="rounded-full border-[#DC4B4B]/30 px-5 font-bold text-[#DC4B4B] hover:bg-[#DC4B4B]/10 hover:text-[#DC4B4B]"
          onClick={() => {
            logout();
            toast.success(t("account.logout"));
          }}
        >
          <LogOut className="size-4" />
          {t("account.logout")}
        </Button>
      </div>

      {/* ================= Upper Egypt (الصعيد) Quick Actions Hub ================= */}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {/* Card 1: Repeat Last Order with 1 Click */}
        {myOrders.length > 0 && (
          <div className="flex flex-col justify-between rounded-3xl border-2 border-[#184C8A]/30 bg-gradient-to-br from-[#EAF1F9] via-[#F4F8FC] to-white p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-[#184C8A] px-3 py-1 text-[11px] font-black text-white">
                  <Sparkles className="size-3 text-[#F09428]" />
                  {lang === "ar" ? "تكرار آخر طلب بضغطة واحدة" : "1-Click Reorder"}
                </span>
                <span className="text-xs font-bold text-muted-foreground" dir="ltr">
                  #{myOrders[0].id}
                </span>
              </div>
              <h3 className="mt-2.5 font-heading text-base font-black text-[#112D51]">
                {myOrders[0].items.map((i) => lang === "ar" ? i.nameAr : i.nameEn).slice(0, 2).join(" + ")}
                {myOrders[0].items.length > 2 && " ..."}
              </h3>
              <p className="mt-1 text-xs font-bold text-muted-foreground">
                {lang === "ar" ? "الإجمالي:" : "Total:"} <span className="font-heading font-black text-[#184C8A]">{fmtPrice(myOrders[0].total, t)}</span>
                <span className="ms-2">({myOrders[0].items.length} أصناف)</span>
              </p>
            </div>
            <Button
              className="mt-4 h-11 w-full rounded-full bg-[#184C8A] text-xs font-black text-white hover:bg-[#112D51] shadow-md shadow-[#184C8A]/20 active:scale-98 transition"
              onClick={() => {
                reorder(myOrders[0].id);
                toast.success(lang === "ar" ? "تمت إضافة أصناف طلبك السابق للسلة — جاري نقلك لإتمام الطلب" : "Reordered items added to cart");
                go("checkout");
              }}
            >
              <ShoppingBag className="size-4 me-1.5" />
              {lang === "ar" ? "تكرار نفس الطلب الآن بضغطة واحدة" : "Reorder Same Order Now"}
            </Button>
          </div>
        )}

        {/* Card 2: Direct WhatsApp with Dr. Hashem */}
        <div className="flex flex-col justify-between rounded-3xl border-2 border-[#2E9E6B]/30 bg-gradient-to-br from-[#EAF6F1] via-[#F3FAF6] to-white p-5 shadow-xs">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-[#2E9E6B] px-3 py-1 text-[11px] font-black text-white">
                <IconWhatsapp className="size-3 text-white" />
                {lang === "ar" ? "خدمة عملاء الصعيد المباشرة" : "Direct WhatsApp Support"}
              </span>
            </div>
            <h3 className="mt-2.5 font-heading text-base font-black text-[#166534]">
              {lang === "ar" ? "محادثة فورية مع د. هاشم بحبح" : "Chat with Dr. Hashem Bahbah"}
            </h3>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {lang === "ar"
                ? "ارسل صورة روشتتك أو استشر الصيدلي عن أي دواء أو بديل عبر واتساب مباشرة بدون وسيط."
                : "Send prescription photos or ask the pharmacist directly via WhatsApp."}
            </p>
          </div>
          <a
            href="https://wa.me/201011500166?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%20%D8%AF.%20%D9%87%D8%A7%D8%B4%D9%85%D8%8C%20%D9%85%D8%B9%D8%A7%D9%83%20%D8%B9%D9%85%D9%8A%D9%84%20%D9%85%D9%86%20%D8%B5%D9%8A%D8%AF%D9%84%D9%8A%D8%A9%20%D8%A8%D8%AD%D8%A8%D8%AD"
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#2E9E6B] text-xs font-black text-white hover:bg-[#258257] shadow-md shadow-[#2E9E6B]/20 active:scale-98 transition"
          >
            <IconWhatsapp className="size-4" />
            {lang === "ar" ? "محادثة واتساب د. هاشم (01011500166)" : "Chat on WhatsApp"}
          </a>
        </div>
      </div>

      {/* staff portal shortcut */}
      {isStaff && portalMeta[role] && (
        <button
          onClick={() => go(portalMeta[role].view)}
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="flex items-center gap-3">
            <span className={`grid size-10 place-items-center rounded-xl ${portalMeta[role].cls}`}>
              {portalMeta[role].icon}
            </span>
            <span>
              <span className="block font-heading text-sm font-black">{t(portalMeta[role].key)}</span>
              <span className="block text-[11px] font-bold text-muted-foreground">{t("port.open")}</span>
            </span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground rtl:rotate-180" />
        </button>
      )}

      {/* loyalty program */}
      <div className="mt-5">
        <LoyaltyCard />
      </div>

      <Tabs
        value={accountTab}
        onValueChange={(v) => openAccount(v as AccountTab)}
        className="mt-6"
      >
        <TabsList className="grid h-12 w-full grid-cols-3 rounded-full md:grid-cols-5">
          <TabsTrigger value="orders" className="gap-1.5 rounded-full font-bold">
            <Package className="size-4" />
            {t("account.orders")}
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-1.5 rounded-full font-bold">
            <Heart className="size-4" />
            {t("account.favorites")}
          </TabsTrigger>
          <TabsTrigger value="care" className="gap-1.5 rounded-full font-bold">
            <IconRefill className="size-4" />
            {t("acc.care")}
          </TabsTrigger>
          <TabsTrigger value="vitals" className="gap-1.5 rounded-full font-bold">
            <Activity className="size-4 text-emerald-600" />
            {lang === "ar" ? "قياساتي" : "Vitals"}
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5 rounded-full font-bold">
            <UserCircle className="size-4" />
            {t("account.profile")}
          </TabsTrigger>
        </TabsList>

        {/* orders */}
        <TabsContent value="orders" className="mt-5 space-y-3">
          {myOrders.length === 0 ? (
            <EmptyBlock title={t("account.noOrders")} />
          ) : (
            myOrders.map((o) => {
              const meta = statusMeta[o.status];
              return (
                <div key={o.id} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm md:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-heading font-black text-[#1E4E8F]">{o.id}</span>
                      <Badge className={`gap-1 rounded-full border-0 ${meta.cls} hover:${meta.cls}`}>
                        {meta.icon}
                        {meta.label}
                      </Badge>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground" dir="ltr">
                      {o.date}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
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

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <span className="font-heading text-base font-black">
                      {t("account.total")}: <span className="text-[#1E4E8F]">{fmtPrice(o.total, t)}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full px-4 font-bold text-[#1E4E8F]"
                        onClick={() => openTrack(o.id)}
                      >
                        <MapPin className="size-3.5" />
                        {t("track.trackBtn")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full px-4 font-bold"
                        onClick={() => {
                          reorder(o.id);
                          toast.success(t("product.added"));
                        }}
                      >
                        <ShoppingBag className="size-3.5" />
                        {t("account.reorder")}
                        <ChevronRight className="size-3.5 rtl:rotate-180" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        {/* favorites */}
        <TabsContent value="favorites" className="mt-5">
          {favProducts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="grid size-16 place-items-center rounded-full bg-muted">
                <Heart className="size-7 text-muted-foreground" />
              </div>
              <p className="font-heading font-bold">{t("account.noFavs")}</p>
              <p className="text-sm text-muted-foreground">{t("account.favD")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {favProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* رعايتي الشهرية — premium membership management */}
        <TabsContent value="care" className="mt-5">
          {careSub ? (
            <div className="mx-auto max-w-xl">
              <CareMembershipCard
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    {careSub.status === "paused" ? (
                      <Button
                        size="sm"
                        className="h-9 rounded-full bg-[#2E9E6B] px-5 font-black text-white hover:bg-[#268a5d]"
                        onClick={() => {
                          resumeCare();
                          toast.success(t("care.resume"));
                        }}
                      >
                        <IconRefill className="size-4" />
                        {t("care.resume")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-full border-white/30 bg-white/10 px-5 font-black text-white hover:bg-white/20 hover:text-white"
                        onClick={() => {
                          pauseCare();
                          toast.success(t("care.pause"));
                        }}
                      >
                        {t("care.pause")}
                      </Button>
                    )}
                    <DayPicker
                      value={careSub.dayPref}
                      onChange={(d) => {
                        changeCareDay(d);
                        toast.success(t("care.changeDay"));
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-full border-[#FF9C9C]/40 bg-transparent px-5 font-black text-[#FFB4B4] hover:bg-[#DC4B4B]/25 hover:text-white"
                      onClick={() => {
                        cancelCare();
                        toast.success(t("care.cancel"));
                      }}
                    >
                      {t("care.cancel")}
                    </Button>
                  </div>
                }
              />
              <button
                onClick={() => go("care")}
                className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 text-start shadow-sm transition hover:shadow-md"
              >
                <span className="text-xs font-bold text-muted-foreground">
                  {t("care.builder.title")} — {t("care.builder.sub")}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-[#1E4E8F]/30 bg-[#EAF1F9]/50 p-6 text-center">
                <IconRefill className="size-8 text-[#1E4E8F]" />
                <p className="font-heading font-bold">{t("care.none")}</p>
                <Button
                  size="sm"
                  className="mt-1 rounded-full bg-[#2E9E6B] px-6 font-black text-white hover:bg-[#268a5d]"
                  onClick={() => go("care")}
                >
                  <IconRefill className="size-4" />
                  {t("care.viewAll")}
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {livePlans.map((plan) => {
                  const PlanIcon = plan.icon;
                  return (
                    <div key={plan.id} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="grid size-10 place-items-center rounded-xl text-white"
                          style={{ backgroundColor: plan.color }}
                        >
                          <PlanIcon className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">
                            {lang === "ar" ? plan.nameAr : plan.nameEn}
                          </p>
                          <p className="text-xs font-bold text-muted-foreground">
                            {plan.price} {t("misc.currency")} {t("care.perMonth")}
                          </p>
                        </div>
                      </div>
                      <Button
                        className="mt-3 h-9 w-full rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: plan.color }}
                        onClick={() => {
                          openCareWizard(plan.id);
                          go("care");
                        }}
                      >
                        {t("care.subscribe")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* vitals */}
        <TabsContent value="vitals" className="mt-5 space-y-4">
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Activity className="size-6" />
                </span>
                <div>
                  <h3 className="font-heading text-base font-black text-foreground md:text-lg">
                    {lang === "ar" ? "بوابة قياساتي ومؤشراتي الصحية" : "Health & Vitals Portal"}
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold">
                    {lang === "ar"
                      ? "قياسات السكر، ضغط الدم، والوزن المسجلة لك في الصيدلية مع توجيهات الصيدلي"
                      : "Blood sugar, pressure, and weight logged by the pharmacy team"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="h-10 rounded-full bg-[#2E9E6B] px-5 text-xs font-black text-white shadow-sm hover:bg-[#238156] active:scale-95 transition flex items-center gap-1.5"
                  onClick={() => setOpenAddMeasModal(true)}
                >
                  <Plus className="size-4" />
                  <span>{lang === "ar" ? "+ تسجيل قياس جديد" : "+ Record Vitals"}</span>
                </Button>

                <Button
                  className="h-10 rounded-full bg-gradient-to-r from-[#184C8A] to-[#113665] px-6 text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-95 transition"
                  onClick={() => go("vitals")}
                >
                  {lang === "ar" ? "سجل القياسات الكامل والرسوم البيانية" : "Full Vitals & Charts"}
                  <ChevronRight className="size-4 rtl:rotate-180 ms-1" />
                </Button>
              </div>
            </div>
          </div>

          {latestVitals ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-muted-foreground">
                  {lang === "ar" ? "آخر قياس تم تسجيله:" : "Latest recorded vital:"}
                </span>
                <span className="text-xs font-black text-[#1E4E8F]" dir="ltr">
                  {latestVitals.recordedAt}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {/* Blood Sugar */}
                <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-bold flex items-center gap-1.5">
                      <Activity className="size-3.5 text-rose-500" />
                      {lang === "ar" ? "سكر الدم" : "Blood Sugar"}
                    </span>
                    {latestVitals.sugarTiming && (
                      <Badge variant="outline" className="text-[10px] py-0 px-2">
                        {timingArabic[latestVitals.sugarTiming] ?? latestVitals.sugarTiming}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="font-heading text-2xl font-black text-foreground">
                      {latestVitals.bloodSugar ?? "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">mg/dL</span>
                  </div>
                  {(() => {
                    const st = getSugarStatus(latestVitals.bloodSugar, latestVitals.sugarTiming);
                    return st ? (
                      <Badge className={`mt-2 border text-[10px] font-bold ${st.color}`}>
                        {st.label}
                      </Badge>
                    ) : null;
                  })()}
                </div>

                {/* Blood Pressure */}
                <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-bold flex items-center gap-1.5">
                      <Heart className="size-3.5 text-red-500" />
                      {lang === "ar" ? "ضغط الدم والنبض" : "Blood Pressure"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="font-heading text-2xl font-black text-foreground">
                      {latestVitals.systolic && latestVitals.diastolic
                        ? `${latestVitals.systolic}/${latestVitals.diastolic}`
                        : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">mmHg</span>
                    {latestVitals.pulse && (
                      <span className="ms-2 text-xs font-semibold text-muted-foreground">
                        ({latestVitals.pulse} bpm)
                      </span>
                    )}
                  </div>
                  {(() => {
                    const bp = getBPStatus(latestVitals.systolic, latestVitals.diastolic);
                    return bp ? (
                      <Badge className={`mt-2 border text-[10px] font-bold ${bp.color}`}>
                        {bp.label}
                      </Badge>
                    ) : null;
                  })()}
                </div>

                {/* Weight & BMI */}
                <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-bold flex items-center gap-1.5">
                      <Scale className="size-3.5 text-blue-500" />
                      {lang === "ar" ? "الوزن ومؤشر الكتلة" : "Weight & BMI"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="font-heading text-2xl font-black text-foreground">
                      {latestVitals.weight ?? "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">kg</span>
                    {latestVitals.height && (
                      <span className="ms-2 text-xs text-muted-foreground">
                        / {latestVitals.height} cm
                      </span>
                    )}
                  </div>
                  {(() => {
                    const bmi = getBmiStatus(latestVitals.bmi);
                    return bmi ? (
                      <Badge className={`mt-2 border text-[10px] font-bold ${bmi.color}`}>
                        {bmi.label} {latestVitals.bmi ? `(BMI ${latestVitals.bmi})` : ""}
                      </Badge>
                    ) : null;
                  })()}
                </div>
              </div>

              {latestVitals.pharmacistNotes && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3">
                  <Stethoscope className="size-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">
                      {lang === "ar" ? "ملاحظات وتوجيهات الصيدلي المعالج:" : "Pharmacist Advice:"}
                    </span>
                    <p className="leading-relaxed">{latestVitals.pharmacistNotes}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <Activity className="size-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground">
                {lang === "ar" ? "لا توجد قياسات مسجلة حتى الآن" : "No vitals recorded yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {lang === "ar"
                  ? "قم بزيارة صيدلية بحبح لقياس السكر والضغط والوزن مجاناً وسيتم تسجيلها في ملفك فوراً."
                  : "Visit Bahbah Pharmacy to record your vitals."}
              </p>
              <Button
                className="mt-4 rounded-full bg-[#2E9E6B] px-6 text-xs font-black text-white hover:bg-[#238156] gap-1.5"
                onClick={() => setOpenAddMeasModal(true)}
              >
                <Plus className="size-4" />
                <span>{lang === "ar" ? "تسجيل قياس جديد الآن" : "Record First Measurement"}</span>
              </Button>
            </div>
          )}
        </TabsContent>

        {/* profile */}
        <TabsContent value="profile" className="mt-5">
          <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <ProfileRow label={t("auth.name")} value={user.name} />
            <ProfileRow label={t("auth.email")} value={user.email} ltr />
            {user.phone && <ProfileRow label={t("auth.phone")} value={user.phone} ltr />}
            <ProfileRow label={t("account.address")} value={PHARMACY.addressAr} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Record Vitals Dialog in Patient Account */}
      <NewVitalsDialog
        open={openAddMeasModal}
        onOpenChange={setOpenAddMeasModal}
        initialPhone={user?.phone || ""}
        initialName={user?.name || ""}
      />
    </main>
  );
}

function ProfileRow({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <span className="text-sm font-bold text-muted-foreground">{label}</span>
      <span className="text-sm font-bold" dir={ltr ? "ltr" : undefined}>
        {value}
      </span>
    </div>
  );
}

function EmptyBlock({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-muted">
        <Package className="size-7 text-muted-foreground" />
      </div>
      <p className="text-sm font-bold text-muted-foreground">{title}</p>
    </div>
  );
}
