"useclient";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Heart,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBahbah, useT, type PatientMeasurement } from "@/lib/bahbah/store";
import { toast } from "sonner";

interface NewVitalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPhone?: string;
  initialName?: string;
  initialCode?: string;
}

export function NewVitalsDialog({
  open,
  onOpenChange,
  initialPhone = "",
  initialName = "",
  initialCode = "",
}: NewVitalsDialogProps) {
  const lang = useBahbah((s) => s.lang);
  const careSubs = useBahbah((s) => s.careSubs);
  const addMeasurement = useBahbah((s) => s.addMeasurement);
  const user = useBahbah((s) => s.user);

  const [patientName, setPatientName] = useState(initialName);
  const [patientPhone, setPatientPhone] = useState(initialPhone);
  const [patientCode, setPatientCode] = useState(initialCode);

  const [bloodSugar, setBloodSugar] = useState("");
  const [sugarTiming, setSugarTiming] = useState<PatientMeasurement["sugarTiming"]>("fasting");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [pharmacistNotes, setPharmacistNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialName) setPatientName(initialName);
      else if (user?.name && user.role === "patient") setPatientName(user.name);

      if (initialPhone) setPatientPhone(initialPhone);
      else if (user?.phone) setPatientPhone(user.phone);

      if (initialCode) setPatientCode(initialCode);
      else if (user?.phone) setPatientCode(`BB-${user.phone.slice(-4)}`);
    }
  }, [open, initialName, initialPhone, initialCode, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = patientPhone.trim().replace(/\s+/g, "");
    const cleanName = patientName.trim();
    if (!cleanPhone || !cleanName) {
      toast.error(lang === "ar" ? "برجاء كتابة اسم المريض ورقم الهاتف" : "Please provide patient name and phone");
      return;
    }

    const s = systolic ? Number(systolic) : undefined;
    const d = diastolic ? Number(diastolic) : undefined;
    const bs = bloodSugar ? Number(bloodSugar) : undefined;
    const w = weight ? Number(weight) : undefined;
    const h = height ? Number(height) : undefined;
    const p = pulse ? Number(pulse) : undefined;

    if (!bs && !s && !w) {
      toast.error(lang === "ar" ? "برجاء إدخال قياس واحد على الأقل (سكر، ضغط، أو وزن)" : "Please enter at least one measurement");
      return;
    }

    let calculatedBmi: number | undefined;
    if (w && h && h > 0) {
      const hm = h / 100;
      calculatedBmi = Number((w / (hm * hm)).toFixed(1));
    }

    setSaving(true);
    try {
      await addMeasurement({
        patientCode: patientCode.trim() || `BB-${cleanPhone.slice(-4)}`,
        patientName: cleanName,
        patientPhone: cleanPhone,
        bloodSugar: bs,
        sugarTiming: bs ? sugarTiming : undefined,
        systolic: s,
        diastolic: d,
        pulse: p,
        weight: w,
        height: h,
        bmi: calculatedBmi,
        pharmacistNotes: pharmacistNotes.trim() || undefined,
        recordedBy: user?.name ? user.name.split(" — ")[0] : "صيدلية بحبح",
      });

      toast.success(
        lang === "ar"
          ? `تم تسجيل القياسات بنجاح للمريض: ${cleanName}`
          : `Measurements saved successfully for ${cleanName}`
      );
      onOpenChange(false);
      // Reset form
      setBloodSugar("");
      setSystolic("");
      setDiastolic("");
      setPulse("");
      setWeight("");
      setHeight("");
      setPharmacistNotes("");
    } catch {
      toast.error(lang === "ar" ? "حدث خطأ أثناء حفظ القياسات" : "Failed to save measurement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl p-6 border-border/80 shadow-2xl">
        <DialogHeader className="border-b border-border/80 pb-3">
          <DialogTitle className="flex items-center gap-2 font-heading text-lg font-black text-foreground">
            <Stethoscope className="size-5 text-[#2E9E6B]" />
            {lang === "ar" ? "تسجيل قياسات طبية جديدة للمريض" : "Record Patient Health Vitals"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Quick Select from Registered Patients */}
          {careSubs.length > 0 && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3">
              <span className="text-[11px] font-bold text-blue-900 block mb-1.5">
                ⚡ اختيار سريع من مرضى الصيدلية المسجلين:
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
                      toast.info(`تم اختيار: ${sub.nameAr || sub.nameEn}`);
                    }}
                    className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-blue-800 shadow-2xs border border-blue-200 hover:bg-blue-600 hover:text-white transition"
                  >
                    {sub.nameAr || sub.nameEn} ({sub.id})
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
              <span className="text-xs font-bold text-foreground">رقم الهاتف / واتساب *</span>
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
              <span className="text-xs font-bold text-foreground">كود المريض الخاص (للبحث ومتابعة السجل)</span>
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

          {/* Notes */}
          <label className="block space-y-1">
            <span className="text-xs font-bold text-foreground">توصيات وملاحظات الصيدلي للمريض</span>
            <textarea
              value={pharmacistNotes}
              onChange={(e) => setPharmacistNotes(e.target.value)}
              placeholder="اكتب أي نصائح أو ملاحظات تظهر في ملف المريض..."
              className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-18 resize-none"
            />
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl text-xs font-bold"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-10 rounded-xl bg-[#2E9E6B] px-6 text-xs font-black text-white hover:bg-[#238156]"
            >
              {saving ? "جاري الحفظ..." : "حفظ القياس في النظام"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
