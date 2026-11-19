"use client";

import { useState } from "react";
import {
  Stethoscope,
  CheckCircle2,
  XCircle,
  Phone,
  MapPin,
  Clock,
  Activity,
  Heart,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NURSING_SERVICES, type NursingRequest } from "@/lib/bahbah/data";
import { useBahbah, useT, hasPermission } from "@/lib/bahbah/store";
import { fmtPrice } from "./product-card";
import { CustomerContactMenu } from "./contact-menu";
import { AdminCard, SectionTitle } from "./admin-ui";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* قائمة «طلبات التمريض» — بتظهر في بوابة الصيدلي جنب طلبات النواقص    */
/* وواتساب (صلاحية «التمريض»). الحالات: جديد ← تم التأكيد ← تمت        */
/* الزيارة / ملغي، وكل تغيير بيتحفظ في السيرفر الأول.                  */
/* ------------------------------------------------------------------ */

const STATUS_META: Record<
  NursingRequest["status"],
  { ar: string; en: string; cls: string }
> = {
  new: { ar: "جديد", en: "New", cls: "bg-[#FFF4E5] text-[#B45E0A]" },
  confirmed: { ar: "تم التأكيد", en: "Confirmed", cls: "bg-[#EAF1F9] text-[#1E4E8F]" },
  done: { ar: "تمت الزيارة", en: "Visit done", cls: "bg-[#EAF6F1] text-[#2E9E6B]" },
  cancelled: { ar: "ملغي", en: "Cancelled", cls: "bg-[#DC4B4B]/10 text-[#DC4B4B]" },
};

function NursingQueueCard({ r }: { r: NursingRequest }) {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const setNursingRequestStatus = useBahbah((s) => s.setNursingRequestStatus);
  const completeNursingVisit = useBahbah((s) => s.completeNursingVisit);
  /* تحديث الحالة بقى بيرجّع نتيجة مؤكدة — الفشل بيبان بتنبيه (D9) */
  const nursingStatus = async (id: string, status: NursingRequest["status"]) => {
    const ok = await setNursingRequestStatus(id, status);
    if (!ok) toast.error("تعذّر تحديث حالة الحجز على السيرفر — الحالة زي ما هي، حاول تاني");
  };

  const [completing, setCompleting] = useState(false);
  const [sugar, setSugar] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [busy, setBusy] = useState(false);

  const meta = STATUS_META[r.status];
  const isMeasure = r.serviceKind === "sugar" || r.serviceKind === "bp";

  const finishVisit = async () => {
    setBusy(true);
    const ok = await completeNursingVisit(r.id, {
      sugar: sugar.trim() ? Number(sugar) : undefined,
      systolic: systolic.trim() ? Number(systolic) : undefined,
      diastolic: diastolic.trim() ? Number(diastolic) : undefined,
    });
    setBusy(false);
    if (ok) {
      setCompleting(false);
      toast.success(lang === "ar" ? "اتسجلت الزيارة" : "Visit recorded");
    } else {
      toast.error(lang === "ar" ? "تعذر حفظ إتمام الزيارة" : "Couldn't save the visit completion");
    }
  };

  return (
    <div className="rounded-2xl border border-[#2E9E6B]/25 bg-[#F2FAF6]/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#0B1E38] px-2.5 py-0.5 font-heading text-xs font-black text-white" dir="ltr">
            {r.code}
          </span>
          <Badge className={`rounded-full border-0 ${meta.cls}`}>
            {lang === "ar" ? meta.ar : meta.en}
          </Badge>
          {r.measurementId && (
            <Badge className="rounded-full border-0 bg-[#EAF6F1] text-[#2E9E6B]">
              {lang === "ar" ? "اتسجل في قياساتي" : "Saved to قياساتي"}
            </Badge>
          )}
        </div>
        <span className="text-[11px] font-bold text-muted-foreground">
          {new Date(r.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}
        </span>
      </div>

      <p className="mt-2 font-heading text-sm font-black text-foreground">
        {lang === "ar" ? r.serviceNameAr : r.serviceNameEn || r.serviceNameAr}
        <span className="ms-2 font-heading text-sm font-black text-[#1E4E8F]">{fmtPrice(r.total, t)}</span>
        <span className="ms-1 text-[11px] font-bold text-muted-foreground">
          ({lang === "ar" ? "خدمة" : "service"} {fmtPrice(r.servicePrice, t)} + {lang === "ar" ? "زيارة" : "visit"}{" "}
          {fmtPrice(r.visitFee, t)} — {lang === "ar" ? "كاش عند الزيارة" : "cash on visit"})
        </span>
      </p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs font-bold text-foreground/70">
        <span>{r.name || (lang === "ar" ? "عميل بحبح" : "Bahbah customer")}</span>
        {r.phone ? (
          <span className="inline-flex items-center gap-1" dir="ltr">
            <Phone className="size-3" /> {r.phone}
          </span>
        ) : null}
        {r.phone ? (
          <CustomerContactMenu phone={r.phone} label="" className="grid size-7 place-items-center rounded-full bg-[#2E9E6B] text-white shadow-xs transition hover:brightness-105 active:scale-95" />
        ) : null}
      </p>
      {r.preferredAt && (
        <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-foreground/70">
          <Clock className="size-3" /> {r.preferredAt}
        </p>
      )}
      {r.address && (
        <p className="mt-0.5 flex items-start gap-1 text-xs font-bold text-foreground/70">
          <MapPin className="mt-0.5 size-3 shrink-0" /> {r.address}
        </p>
      )}
      {r.notes && <p className="mt-0.5 text-xs font-bold text-muted-foreground">{r.notes}</p>}

      {r.status === "done" && isMeasure && (r.measuredSugar != null || r.measuredSystolic != null) && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-black text-[#2E9E6B]">
          {r.serviceKind === "sugar" ? <Activity className="size-3.5" /> : <Heart className="size-3.5" />}
          {r.serviceKind === "sugar"
            ? `${lang === "ar" ? "السكر" : "Sugar"}: ${r.measuredSugar}`
            : `${lang === "ar" ? "الضغط" : "BP"}: ${r.measuredSystolic ?? "—"}/${r.measuredDiastolic ?? "—"}`}
        </p>
      )}

      {(r.status === "new" || r.status === "confirmed") && (
        <div className="mt-2.5 border-t border-[#2E9E6B]/15 pt-2.5">
          {!completing ? (
            <div className="flex flex-wrap items-center gap-2">
              {r.status === "new" && (
                <Button
                  size="sm"
                  className="h-8 rounded-full bg-[#184C8A] px-3.5 text-[11px] font-black text-white"
                  onClick={() => void nursingStatus(r.id, "confirmed")}
                >
                  {lang === "ar" ? "تأكيد" : "Confirm"}
                </Button>
              )}
              <Button
                size="sm"
                className="h-8 rounded-full bg-[#2E9E6B] px-3.5 text-[11px] font-black text-white hover:bg-[#278a5e]"
                onClick={() => (isMeasure ? setCompleting(true) : void finishVisit())}
              >
                <CheckCircle2 className="size-3.5" />
                {lang === "ar" ? "تمت الزيارة" : "Visit done"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-full px-3.5 text-[11px] font-black text-[#DC4B4B]"
                onClick={() => void nursingStatus(r.id, "cancelled")}
              >
                <XCircle className="size-3.5" />
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-black text-foreground/80">
                {lang === "ar" ? "سجّل نتيجة القياس (اختياري) — هتتحفظ في «قياساتي» عند المريض" : "Enter the reading (optional) — saved to the patient's قياساتي"}
              </p>
              {r.serviceKind === "sugar" ? (
                <Input
                  value={sugar}
                  onChange={(e) => setSugar(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder={lang === "ar" ? "قياس السكر (mg/dL)" : "Blood sugar (mg/dL)"}
                  inputMode="numeric"
                  className="h-10 rounded-xl"
                  dir="ltr"
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder={lang === "ar" ? "الانقباضي (120)" : "Systolic (120)"}
                    inputMode="numeric"
                    className="h-10 rounded-xl"
                    dir="ltr"
                  />
                  <Input
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder={lang === "ar" ? "الانبساطي (80)" : "Diastolic (80)"}
                    inputMode="numeric"
                    className="h-10 rounded-xl"
                    dir="ltr"
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 rounded-full bg-[#2E9E6B] px-3.5 text-[11px] font-black text-white hover:bg-[#278a5e]"
                  disabled={busy}
                  onClick={finishVisit}
                >
                  {busy ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : lang === "ar" ? "حفظ وإتمام الزيارة" : "Save & complete visit"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full px-3.5 text-[11px] font-black text-muted-foreground"
                  onClick={() => setCompleting(false)}
                >
                  {lang === "ar" ? "رجوع" : "Back"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function NursingQueue() {
  const lang = useBahbah((s) => s.lang);
  const nursingRequests = useBahbah((s) => s.nursingRequests);
  const canNursing = useBahbah((s) => hasPermission(s, "nursing"));

  if (!canNursing || nursingRequests.length === 0) return null;
  const newCount = nursingRequests.filter((r) => r.status === "new").length;

  return (
    <div>
      <h2 className="flex items-center gap-2 font-heading text-lg font-black">
        <Stethoscope className="size-5 text-[#2E9E6B]" />
        {lang === "ar" ? "طلبات التمريض" : "Nursing requests"} ({newCount} {lang === "ar" ? "جديدة" : "new"})
      </h2>
      <div className="mt-3 space-y-2.5">
        {nursingRequests.slice(0, 20).map((r) => (
          <NursingQueueCard key={r.id} r={r} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* إدارة الخدمات التمريضية — كارت في إعدادات لوحة الإدارة.             */
/* القائمة كلها بيانات إعدادات: تعديل اسم/وصف/سعر أي خدمة أساسية،      */
/* تفعيلها/تعطيلها (المعطّلة بتختفي من قائمة العميل)، وإضافة خدمة      */
/* جديدة بالكامل أو حذفها. الحفظ في السيرفر: admin_settings            */
/* (nursing_edits للأساسيات + nursing_custom للمضافة) — نفس آلية        */
/* أسعار الرعاية والمناطق — ويسري على واجهة العميل فورًا.              */
/* ------------------------------------------------------------------ */

const KIND_LABELS: Record<string, { ar: string; en: string }> = {
  sugar: { ar: "قياس سكر — النتيجة بتتسجل في قياساتي", en: "Sugar check — reading saved to قياساتي" },
  bp: { ar: "قياس ضغط — النتيجة بتتسجل في قياساتي", en: "BP check — reading saved to قياساتي" },
  other: { ar: "خدمة تمريض عامة", en: "General nursing service" },
};

function KindBadge({ kind, lang }: { kind: string; lang: string }) {
  const m = KIND_LABELS[kind] ?? KIND_LABELS.other;
  return (
    <Badge variant="outline" className="rounded-full text-[10px] font-bold text-muted-foreground">
      {lang === "ar" ? m.ar : m.en}
    </Badge>
  );
}

export function NursingPricesCard() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const nursingEdits = useBahbah((s) => s.nursingEdits);
  const nursingCustom = useBahbah((s) => s.nursingCustom);
  const updateNursingEdit = useBahbah((s) => s.updateNursingEdit);
  const addNursingService = useBahbah((s) => s.addNursingService);
  const updateNursingCustom = useBahbah((s) => s.updateNursingCustom);
  const deleteNursingCustom = useBahbah((s) => s.deleteNursingCustom);

  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newDescAr, setNewDescAr] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newKind, setNewKind] = useState<"sugar" | "bp" | "other">("other");

  const addService = async () => {
    if (!newNameAr.trim()) {
      toast.error(lang === "ar" ? "اكتب اسم الخدمة بالعربي على الأقل" : "Enter at least the Arabic service name");
      return;
    }
    const ok = await addNursingService({
      nameAr: newNameAr.trim(),
      nameEn: newNameEn.trim() || newNameAr.trim(),
      descAr: newDescAr.trim(),
      descEn: newDescAr.trim(),
      kind: newKind,
      price: Math.max(0, Number(newPrice) || 0),
    });
    if (!ok) return;
    setNewNameAr("");
    setNewNameEn("");
    setNewDescAr("");
    setNewPrice("");
    setNewKind("other");
    toast.success(lang === "ar" ? "اتضافت الخدمة وظهرت للعميل" : "Service added and now visible to customers");
  };

  const priceField = (
    value: number,
    onChange: (n: number) => void
  ) => (
    <label className="flex items-center gap-2">
      <span className="text-xs font-bold text-foreground/75">{lang === "ar" ? "السعر" : "Price"}</span>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="h-10 w-24 rounded-xl"
        dir="ltr"
      />
      <span className="text-xs font-bold text-muted-foreground">{t("misc.currency")}</span>
    </label>
  );

  const activeField = (value: boolean, onChange: (v: boolean) => void) => (
    <label className="flex items-center gap-2">
      <span className="text-xs font-bold text-foreground/75">{lang === "ar" ? "متاحة للحجز" : "Bookable"}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </label>
  );

  return (
    <AdminCard className="lg:col-span-2">
      <SectionTitle
        icon={<Stethoscope className="size-5 text-[#2E9E6B]" />}
        title={lang === "ar" ? "إدارة الخدمات التمريضية المنزلية" : "Manage home nursing services"}
      />
      <p className="mt-1 text-xs font-semibold text-muted-foreground">
        {lang === "ar"
          ? "قائمة «خدمات تمريضية» اللي العميل بيحجز منها — عدّل الاسم أو السعر، عطّل أي خدمة فتختفي من عند العميل، أو ضيف خدمة جديدة. كل حاجة بتتحفظ في السيرفر وتسري فورًا. رسوم الزيارة نفسها هي رسوم منطقة التوصيل المختارة."
          : "The customer-facing nursing list — rename, reprice, disable (hidden from customers), or add a service. Everything is saved server-side and applies immediately. The visit fee is the chosen delivery zone's fee."}
      </p>

      <div className="mt-4 space-y-2.5">
        {/* الخدمات الأساسية (بذرة افتراضية — التعديلات فوقها من الإعدادات) */}
        {NURSING_SERVICES.map((s) => {
          const e = nursingEdits[s.id];
          return (
            <div key={s.id} className="space-y-2.5 rounded-xl border border-border/60 p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <KindBadge kind={s.kind} lang={lang} />
                <span className="flex-1" />
                {priceField(e?.price ?? s.price, (n) => updateNursingEdit(s.id, { price: n }))}
                {activeField(e?.active !== false, (v) => updateNursingEdit(s.id, { active: v }))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={e?.nameAr ?? s.nameAr}
                  onChange={(ev) => updateNursingEdit(s.id, { nameAr: ev.target.value })}
                  placeholder={lang === "ar" ? "اسم الخدمة بالعربي" : "Service name (Arabic)"}
                  className="h-10 rounded-xl"
                />
                <Input
                  value={e?.nameEn ?? s.nameEn}
                  onChange={(ev) => updateNursingEdit(s.id, { nameEn: ev.target.value })}
                  placeholder="Service name (English)"
                  className="h-10 rounded-xl"
                  dir="ltr"
                />
              </div>
              <Input
                value={e?.descAr ?? s.descAr}
                onChange={(ev) => updateNursingEdit(s.id, { descAr: ev.target.value })}
                placeholder={lang === "ar" ? "وصف قصير يظهر للعميل" : "Short customer-facing description"}
                className="h-10 rounded-xl"
              />
            </div>
          );
        })}

        {/* الخدمات المضافة من الإدارة */}
        {nursingCustom.map((s) => (
          <div key={s.id} className="space-y-2.5 rounded-xl border border-dashed border-[#2E9E6B]/40 bg-[#F2FAF6]/50 p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <KindBadge kind={s.kind} lang={lang} />
              <Badge className="rounded-full border-0 bg-[#EAF6F1] text-[10px] font-black text-[#2E9E6B]">
                {lang === "ar" ? "مضافة من الإدارة" : "Admin-added"}
              </Badge>
              <span className="flex-1" />
              {priceField(s.price, (n) => updateNursingCustom(s.id, { price: n }))}
              {activeField(s.active !== false, (v) => updateNursingCustom(s.id, { active: v }))}
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-full px-3 text-[11px] font-black text-[#DC4B4B]"
                onClick={() => deleteNursingCustom(s.id)}
              >
                <Trash2 className="size-3.5" />
                {lang === "ar" ? "حذف" : "Delete"}
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={s.nameAr}
                onChange={(ev) => updateNursingCustom(s.id, { nameAr: ev.target.value })}
                placeholder={lang === "ar" ? "اسم الخدمة بالعربي" : "Service name (Arabic)"}
                className="h-10 rounded-xl"
              />
              <Input
                value={s.nameEn}
                onChange={(ev) => updateNursingCustom(s.id, { nameEn: ev.target.value })}
                placeholder="Service name (English)"
                className="h-10 rounded-xl"
                dir="ltr"
              />
            </div>
            <Input
              value={s.descAr}
              onChange={(ev) => updateNursingCustom(s.id, { descAr: ev.target.value, descEn: ev.target.value })}
              placeholder={lang === "ar" ? "وصف قصير يظهر للعميل" : "Short customer-facing description"}
              className="h-10 rounded-xl"
            />
          </div>
        ))}
      </div>

      {/* إضافة خدمة جديدة */}
      <div className="mt-4 space-y-2.5 rounded-xl border border-[#2E9E6B]/30 bg-[#F2FAF6]/60 p-3.5">
        <p className="flex items-center gap-1.5 text-sm font-black">
          <Plus className="size-4 text-[#2E9E6B]" />
          {lang === "ar" ? "إضافة خدمة جديدة" : "Add a new service"}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={newNameAr}
            onChange={(e) => setNewNameAr(e.target.value)}
            placeholder={lang === "ar" ? "اسم الخدمة بالعربي *" : "Service name (Arabic) *"}
            className="h-10 rounded-xl bg-card"
          />
          <Input
            value={newNameEn}
            onChange={(e) => setNewNameEn(e.target.value)}
            placeholder="Service name (English)"
            className="h-10 rounded-xl bg-card"
            dir="ltr"
          />
        </div>
        <Input
          value={newDescAr}
          onChange={(e) => setNewDescAr(e.target.value)}
          placeholder={lang === "ar" ? "وصف قصير يظهر للعميل (اختياري)" : "Short description (optional)"}
          className="h-10 rounded-xl bg-card"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground/75">{lang === "ar" ? "السعر" : "Price"}</span>
            <Input
              type="number"
              min={0}
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="0"
              className="h-10 w-24 rounded-xl bg-card"
              dir="ltr"
            />
            <span className="text-xs font-bold text-muted-foreground">{t("misc.currency")}</span>
          </label>
          <Select value={newKind} onValueChange={(v) => setNewKind(v as "sugar" | "bp" | "other")}>
            <SelectTrigger className="h-10 w-56 rounded-xl bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="other">{lang === "ar" ? "خدمة تمريض عامة" : "General nursing service"}</SelectItem>
              <SelectItem value="sugar">{lang === "ar" ? "قياس سكر" : "Sugar check"}</SelectItem>
              <SelectItem value="bp">{lang === "ar" ? "قياس ضغط" : "BP check"}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="h-10 rounded-full bg-[#2E9E6B] px-5 text-xs font-black text-white hover:bg-[#278a5e]"
            onClick={addService}
          >
            <Plus className="size-4" />
            {lang === "ar" ? "إضافة الخدمة" : "Add service"}
          </Button>
        </div>
      </div>
    </AdminCard>
  );
}
