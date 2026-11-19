"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Stethoscope,
  Activity,
  Heart,
  Syringe,
  Droplets,
  Bandage,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useBahbah, useT, useZones, useNursingServices, type NursingService } from "@/lib/bahbah/store";
import { fmtPrice } from "./product-card";
import { toast } from "sonner";

/* أيقونة كل خدمة — الأساسيات بأيقونتها، والمضافة من الإدارة حسب نوعها */
function ServiceIcon({ service, className }: { service: NursingService; className?: string }) {
  if (service.id === "injection") return <Syringe className={className} />;
  if (service.id === "iv") return <Droplets className={className} />;
  if (service.id === "dressing") return <Bandage className={className} />;
  if (service.kind === "sugar") return <Activity className={className} />;
  if (service.kind === "bp") return <Heart className={className} />;
  return <Stethoscope className={className} />;
}

const PERIODS = [
  { id: "asap", ar: "في أسرع وقت", en: "As soon as possible" },
  { id: "morning", ar: "صباحًا", en: "Morning" },
  { id: "afternoon", ar: "بعد الظهر", en: "Afternoon" },
  { id: "evening", ar: "مساءً", en: "Evening" },
] as const;

/* ------------------------------------------------------------------ */
/* حجز خدمة تمريضية — شاشة واحدة بسيطة: خدمة + ميعاد + عنوان/تليفون    */
/* جاهزين من الحساب. الحجز بيتسجل في السيرفر الأول بكود BH-XXXX،       */
/* والتأكيد (والكود) ما بيظهروش غير بعد نجاح التسجيل.                  */
/* ------------------------------------------------------------------ */
export function NursingDialog() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const open = useBahbah((s) => s.nursingOpen);
  const setNursingOpen = useBahbah((s) => s.setNursingOpen);
  const user = useBahbah((s) => s.user);
  const savedAddresses = useBahbah((s) => s.savedAddresses);
  const createNursingRequest = useBahbah((s) => s.createNursingRequest);
  const services = useNursingServices();
  const zones = useZones();

  const [serviceId, setServiceId] = useState<string>("");
  const [zoneId, setZoneId] = useState<string>("");
  const [date, setDate] = useState("");
  const [period, setPeriod] = useState<string>("asap");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [custName, setCustName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doneCode, setDoneCode] = useState<string | null>(null);

  const service = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId]
  );
  const zone = useMemo(() => zones.find((z) => z.id === zoneId) ?? null, [zones, zoneId]);
  const visitFee = zone?.fee ?? 0;
  const total = (service?.price ?? 0) + visitFee;

  /* تعبئة جاهزة من الحساب ودفتر العناوين أول ما الحوار يفتح */
  useEffect(() => {
    if (!open) return;
    setDoneCode(null);
    setSubmitting(false);
    setServiceId((prev) => prev || services[0]?.id || "");
    setZoneId((prev) => prev || zones[0]?.id || "");
    setPhone(user?.phone || "");
    setCustName(user?.name || "");
    const def =
      savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0] ?? null;
    setAddress(def ? def.details : "");
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setDate(iso);
    setPeriod("asap");
    setNotes("");
  }, [open ]);

  const submit = async () => {
    if (submitting) return;
    if (!service) {
      toast.error(lang === "ar" ? "اختار الخدمة الأول" : "Please pick a service first");
      return;
    }
    if (!phone.trim()) {
      toast.error(lang === "ar" ? "من فضلك اكتب رقم الموبايل" : "Please enter your mobile number");
      return;
    }
    if (!address.trim()) {
      toast.error(lang === "ar" ? "من فضلك اكتب عنوان الزيارة" : "Please enter the visit address");
      return;
    }
    const periodLabel = PERIODS.find((p) => p.id === period);
    const preferredAt = `${date || ""}${periodLabel ? ` — ${lang === "ar" ? periodLabel.ar : periodLabel.en}` : ""}`.trim();
    setSubmitting(true);
    const code = await createNursingRequest({
      service,
      visitFee,
      zoneId: zone?.id,
      address: address.trim(),
      preferredAt,
      notes: notes.trim() || undefined,
      phone: phone.trim(),
      name: custName.trim(),
    });
    setSubmitting(false);
    if (!code) {
      toast.error(
        lang === "ar"
          ? "تعذر تسجيل الحجز دلوقتي — حاول تاني بعد لحظات"
          : "Couldn't log the booking — please try again in a moment"
      );
      return;
    }
    setDoneCode(code);
  };

  return (
    <Dialog open={open} onOpenChange={setNursingOpen}>
      <DialogContent aria-describedby={undefined} className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg font-black">
            <span className="grid size-9 place-items-center rounded-full bg-[#EAF6F1]">
              <Stethoscope className="size-4.5 text-[#2E9E6B]" />
            </span>
            {lang === "ar" ? "خدمات تمريضية" : "Home nursing services"}
          </DialogTitle>
        </DialogHeader>

        {doneCode ? (
          <div className="space-y-4 py-2 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#EAF6F1]">
              <CheckCircle2 className="size-7 text-[#2E9E6B]" />
            </span>
            <div>
              <p className="font-heading text-base font-black">
                {lang === "ar" ? "اتسجل حجزك بنجاح" : "Your booking is confirmed"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {lang === "ar"
                  ? "هنتصل بيك نأكد الميعاد قبل الزيارة. الدفع كاش عند الزيارة."
                  : "We'll call you to confirm the time before the visit. Payment is cash on visit."}
              </p>
            </div>
            <p className="inline-block rounded-full bg-[#0B1E38] px-4 py-1.5 font-heading text-sm font-black text-white" dir="ltr">
              {doneCode}
            </p>
            <Button className="h-12 w-full rounded-full text-base font-bold" onClick={() => setNursingOpen(false)}>
              {lang === "ar" ? "تمام" : "Done"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {lang === "ar"
                ? "اختار الخدمة والميعاد اللي يناسبك، وهنزورك في البيت. الدفع كاش عند الزيارة."
                : "Pick a service and a time that suits you — we'll visit you at home. Cash on visit."}
            </p>

            {/* اختيار الخدمة */}
            <div className="space-y-2">
              {services.map((s) => {
                const selected = s.id === serviceId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setServiceId(s.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-start transition active:scale-[0.99] ${
                      selected
                        ? "border-[#2E9E6B] bg-[#EAF6F1]/70"
                        : "border-border bg-card hover:border-[#2E9E6B]/50"
                    }`}
                  >
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full ${selected ? "bg-[#2E9E6B] text-white" : "bg-[#EAF6F1] text-[#2E9E6B]"}`}>
                      <ServiceIcon service={s} className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-heading text-sm font-black">
                        {lang === "ar" ? s.nameAr : s.nameEn}
                      </span>
                      <span className="block truncate text-[11px] font-bold text-muted-foreground">
                        {lang === "ar" ? s.descAr : s.descEn}
                      </span>
                    </span>
                    <span className="shrink-0 font-heading text-sm font-black text-[#1E4E8F]">
                      {fmtPrice(s.price, t)}
                    </span>
                  </button>
                );
              })}
              {services.length === 0 && (
                <p className="rounded-xl bg-muted px-3 py-2.5 text-center text-xs font-bold text-muted-foreground">
                  {lang === "ar" ? "لا توجد خدمات متاحة حاليًا" : "No services available right now"}
                </p>
              )}
            </div>

            {/* المنطقة (رسوم الزيارة) + الميعاد */}
            <div className="grid grid-cols-2 gap-2">
              <Select value={zoneId} onValueChange={setZoneId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder={lang === "ar" ? "المنطقة" : "Area"} />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {(lang === "ar" ? z.nameAr : z.nameEn) + ` · ${fmtPrice(z.fee, t)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {lang === "ar" ? p.ar : p.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 rounded-xl"
              dir="ltr"
            />

            {/* العنوان — من دفتر العناوين أو جديد */}
            {savedAddresses.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {savedAddresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAddress(a.details)}
                    className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-black transition active:scale-95 ${
                      address === a.details
                        ? "border-[#184C8A] bg-[#EAF1F9] text-[#184C8A]"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <MapPin className="size-3" />
                    {a.label}
                  </button>
                ))}
              </div>
            )}
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={lang === "ar" ? "عنوان الزيارة بالتفصيل" : "Visit address in detail"}
              className="rounded-xl"
              rows={2}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                placeholder={lang === "ar" ? "الاسم" : "Name"}
                className="h-11 rounded-xl"
              />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={lang === "ar" ? "رقم الموبايل" : "Mobile number"}
                inputMode="tel"
                className="h-11 rounded-xl"
              />
            </div>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={lang === "ar" ? "ملحوظة للزيارة (اختياري)" : "Note for the visit (optional)"}
              className="h-11 rounded-xl"
            />

            {/* الإجمالي */}
            <div className="space-y-1 rounded-2xl bg-[#EAF1F9]/60 px-4 py-3 text-sm font-bold">
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">{lang === "ar" ? "سعر الخدمة" : "Service price"}</span>
                <span>{service ? fmtPrice(service.price, t) : "—"}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">{lang === "ar" ? "رسوم الزيارة" : "Visit fee"}</span>
                <span>{fmtPrice(visitFee, t)}</span>
              </p>
              <p className="flex items-center justify-between border-t border-[#1E4E8F]/15 pt-1.5 font-heading text-base font-black text-[#1E4E8F]">
                <span>{lang === "ar" ? "الإجمالي — كاش عند الزيارة" : "Total — cash on visit"}</span>
                <span>{fmtPrice(total, t)}</span>
              </p>
            </div>

            <Button className="h-12 w-full rounded-full text-base font-bold" disabled={submitting} onClick={submit}>
              {submitting ? (lang === "ar" ? "جاري التسجيل..." : "Booking...") : lang === "ar" ? "احجز الزيارة" : "Book the visit"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
