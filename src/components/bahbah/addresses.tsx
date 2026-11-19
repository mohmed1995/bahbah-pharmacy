"use client";

import { useState } from "react";
import { MapPin, Star, Trash2, Pencil, Plus, Navigation, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { SavedAddress } from "@/lib/bahbah/data";
import { useBahbah } from "@/lib/bahbah/store";

/* ------------------------------------------------------------------ */
/* دفتر عناوين العميل — عناوين مسماة (البيت/الشقة/الشغل) مع دبوس موقع.  */
/* البيانات في Supabase (customer_addresses) مربوطة برقم التليفون،      */
/* وبتتزامن محليًا. الدبوس بيتاخد من تحديد الموقع الحالي (GPS) —        */
/* مفيش خريطة خارجية ولا مفاتيح مدفوعة، والمندوب بيفتح الدبوس          */
/* على خرائط جوجل من كارت الطلب.                                       */
/* ------------------------------------------------------------------ */

export const ADDRESS_LABEL_PRESETS = ["البيت", "الشقة", "الشغل", "بيت العيلة"];

/** تحديد الموقع الحالي من الجهاز — بيرجع null لو اترفض/مش متاح */
export function captureLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
}

export const mapsPinUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/* ------------------------------------------------------------------ */
/* نموذج عنوان واحد (إضافة/تعديل) — بيُستخدم في دفتر العناوين والدفع   */
/* ------------------------------------------------------------------ */
export function AddressForm({
  initial,
  phone,
  onDone,
  compact,
}: {
  initial?: SavedAddress | null;
  phone: string;
  onDone: (a: SavedAddress) => void;
  compact?: boolean;
}) {
  const lang = useBahbah((s) => s.lang);
  const addSavedAddress = useBahbah((s) => s.addSavedAddress);
  const updateSavedAddress = useBahbah((s) => s.updateSavedAddress);

  const [label, setLabel] = useState(initial?.label ?? "البيت");
  const [customLabel, setCustomLabel] = useState("");
  const [details, setDetails] = useState(initial?.details ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    initial?.lat != null && initial?.lng != null ? { lat: initial.lat, lng: initial.lng } : null
  );
  const [locating, setLocating] = useState(false);
  const [makeDefault, setMakeDefault] = useState(initial?.isDefault ?? false);

  const isCustom = !ADDRESS_LABEL_PRESETS.includes(label);
  const finalLabel = (isCustom ? customLabel.trim() || label : label).trim();

  const locate = async () => {
    setLocating(true);
    const p = await captureLocation();
    setLocating(false);
    if (p) {
      setPin(p);
      toast.success(lang === "ar" ? "تم تحديد موقعك — المندوب هيوصل للمكان بالظبط" : "Location pinned");
    } else {
      toast.error(
        lang === "ar"
          ? "ما قدرناش نحدد الموقع — فعّل الـ GPS واسمح بالوصول للموقع وحاول تاني"
          : "Couldn't get your location — enable GPS and allow location access"
      );
    }
  };

  const save = () => {
    if (!finalLabel) {
      toast.error(lang === "ar" ? "اكتب اسم للعنوان (البيت، الشقة...)" : "Give the address a label");
      return;
    }
    if (!details.trim()) {
      toast.error(lang === "ar" ? "اكتب العنوان بالتفصيل" : "Write the full address");
      return;
    }
    if (initial) {
      updateSavedAddress(initial.id, {
        label: finalLabel,
        details: details.trim(),
        city: city.trim() || undefined,
        lat: pin?.lat,
        lng: pin?.lng,
        isDefault: makeDefault || initial.isDefault,
      });
      onDone({ ...initial, label: finalLabel, details: details.trim(), city: city.trim() || undefined, lat: pin?.lat, lng: pin?.lng });
    } else {
      const saved = addSavedAddress({
        phone,
        label: finalLabel,
        details: details.trim(),
        city: city.trim() || undefined,
        lat: pin?.lat,
        lng: pin?.lng,
        isDefault: makeDefault,
      });
      onDone(saved);
    }
  };

  return (
    <div className="space-y-3">
      {/* label presets + custom */}
      <div>
        <p className="mb-1.5 text-xs font-bold text-foreground/75">
          {lang === "ar" ? "اسم العنوان" : "Address label"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ADDRESS_LABEL_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setLabel(p)}
              className={`rounded-full border-2 px-3.5 py-1.5 text-xs font-black transition active:scale-[0.97] ${
                label === p
                  ? "border-[#1E4E8F] bg-[#EAF1F9]/70 text-[#1E4E8F]"
                  : "border-border text-muted-foreground hover:border-[#1E4E8F]/40"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setLabel(customLabel || "عنوان آخر")}
            className={`rounded-full border-2 px-3.5 py-1.5 text-xs font-black transition active:scale-[0.97] ${
              isCustom
                ? "border-[#1E4E8F] bg-[#EAF1F9]/70 text-[#1E4E8F]"
                : "border-border text-muted-foreground hover:border-[#1E4E8F]/40"
            }`}
          >
            {lang === "ar" ? "اسم آخر…" : "Other…"}
          </button>
        </div>
        {isCustom && (
          <Input
            value={customLabel}
            onChange={(e) => {
              setCustomLabel(e.target.value);
              setLabel(e.target.value || "عنوان آخر");
            }}
            placeholder={lang === "ar" ? "اكتب اسم العنوان" : "Type a label"}
            className="mt-2 h-10 rounded-xl"
          />
        )}
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-bold text-foreground/75">
          {lang === "ar" ? "العنوان بالتفصيل" : "Full address"}
        </span>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={2}
          className="rounded-xl text-sm leading-relaxed"
          placeholder={lang === "ar" ? "الشارع/المنطقة + أقرب علامة مميزة (مسجد، مدرسة، دوار عائلة...)" : "Street/area + nearest landmark"}
        />
      </label>

      {!compact && (
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-foreground/75">
            {lang === "ar" ? "المدينة/القرية (اختياري)" : "City/Village (optional)"}
          </span>
          <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-10 rounded-xl" />
        </label>
      )}

      {/* location pin */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-muted/30 p-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EAF1F9] text-[#1E4E8F]">
          <MapPin className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black">
            {pin
              ? lang === "ar"
                ? "📍 الموقع متحدد على الخريطة"
                : "📍 Location pinned"
              : lang === "ar"
                ? "حدّد موقعك على الخريطة (اختياري)"
                : "Pin your location (optional)"}
          </p>
          <p className="text-[11px] font-bold text-muted-foreground">
            {pin
              ? lang === "ar"
                ? "المندوب هيفتح الدبوس ويوصل لبابك بالظبط"
                : "The courier opens the pin and reaches your door"
              : lang === "ar"
                ? "بيسهّل على المندوب الوصول من غير مكالمات"
                : "Helps the courier arrive without calls"}
          </p>
        </div>
        {pin && (
          <a
            href={mapsPinUrl(pin.lat, pin.lng)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-[#1E4E8F] shadow-sm ring-1 ring-black/5"
          >
            {lang === "ar" ? "معاينة" : "Preview"}
          </a>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={locating}
          onClick={locate}
          className="h-9 rounded-full px-4 text-xs font-black"
        >
          {locating ? <Loader2 className="size-3.5 animate-spin" /> : <Navigation className="size-3.5" />}
          {pin ? (lang === "ar" ? "تحديث الموقع" : "Update") : lang === "ar" ? "حدّد موقعي الحالي" : "Use my location"}
        </Button>
        {pin && (
          <button
            onClick={() => setPin(null)}
            className="text-[11px] font-bold text-[#DC4B4B] underline-offset-2 hover:underline"
          >
            {lang === "ar" ? "شيل الدبوس" : "Remove pin"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
          <input
            type="checkbox"
            checked={makeDefault}
            onChange={(e) => setMakeDefault(e.target.checked)}
            className="size-4 accent-[#1E4E8F]"
          />
          {lang === "ar" ? "ده عنواني الأساسي" : "This is my main address"}
        </label>
        <Button onClick={save} className="h-10 rounded-full px-6 text-xs font-black">
          <CheckCircle2 className="size-4" />
          {initial ? (lang === "ar" ? "حفظ التعديل" : "Save changes") : lang === "ar" ? "حفظ العنوان" : "Save address"}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* دفتر العناوين الكامل — بيتحط في تبويب «الملف الشخصي» في الحساب      */
/* ------------------------------------------------------------------ */
export function AddressBook() {
  const lang = useBahbah((s) => s.lang);
  const user = useBahbah((s) => s.user);
  const savedAddresses = useBahbah((s) => s.savedAddresses);
  const deleteSavedAddress = useBahbah((s) => s.deleteSavedAddress);
  const setDefaultSavedAddress = useBahbah((s) => s.setDefaultSavedAddress);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const phone = user?.phone ?? "";
  const mine = savedAddresses.filter((a) => !a.phone || !phone || a.phone === phone);

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-heading text-base font-black">
          <span className="grid size-9 place-items-center rounded-xl bg-[#EAF1F9] text-[#1E4E8F]">
            <MapPin className="size-4" />
          </span>
          {lang === "ar" ? "دفتر عناويني" : "My Address Book"}
        </h3>
        {!adding && (
          <Button
            size="sm"
            variant="outline"
            className="h-9 rounded-full px-4 text-xs font-black"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-3.5" />
            {lang === "ar" ? "عنوان جديد" : "New address"}
          </Button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] font-bold text-muted-foreground">
        {lang === "ar"
          ? "عناوينك المحفوظة بتظهر لك في الدفع على طول، وآخر عنوان تستخدمه بيبقى هو المحدد تلقائيًا."
          : "Saved addresses appear at checkout; the last one you used is preselected."}
      </p>

      <div className="mt-4 space-y-2.5">
        {mine.length === 0 && !adding && (
          <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-xs font-bold text-muted-foreground">
            {lang === "ar" ? "مفيش عناوين محفوظة لسه — ضيف عنوان البيت وخلّي كل طلب بعد كده أسرع." : "No saved addresses yet."}
          </p>
        )}
        {mine.map((a) => (
          <div key={a.id} className="rounded-2xl border border-border/60 bg-muted/20 p-3.5">
            {editingId === a.id ? (
              <AddressForm
                initial={a}
                phone={phone}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-black">
                    {a.label}
                    {a.isDefault && (
                      <Badge className="gap-1 rounded-full border-0 bg-[#EAF6F1] px-2 py-0.5 text-[10px] font-black text-[#2E9E6B]">
                        <Star className="size-3" />
                        {lang === "ar" ? "الأساسي" : "Default"}
                      </Badge>
                    )}
                    {a.lat != null && a.lng != null && (
                      <a
                        href={mapsPinUrl(a.lat, a.lng)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-[#EAF1F9] px-2 py-0.5 text-[10px] font-black text-[#1E4E8F]"
                      >
                        📍 {lang === "ar" ? "موقع محدد" : "Pinned"}
                      </a>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs font-bold leading-relaxed text-muted-foreground">
                    {a.city ? `${a.city} — ` : ""}
                    {a.details}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!a.isDefault && (
                    <button
                      onClick={() => setDefaultSavedAddress(a.id)}
                      title={lang === "ar" ? "اجعله الأساسي" : "Make default"}
                      className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-[#EAF6F1] hover:text-[#2E9E6B]"
                    >
                      <Star className="size-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setEditingId(a.id)}
                    title={lang === "ar" ? "تعديل" : "Edit"}
                    className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-[#EAF1F9] hover:text-[#1E4E8F]"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => {
                      deleteSavedAddress(a.id);
                      toast.success(lang === "ar" ? "اتشال العنوان من دفترك" : "Address removed");
                    }}
                    title={lang === "ar" ? "حذف" : "Delete"}
                    className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-[#DC4B4B]/10 hover:text-[#DC4B4B]"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding && (
        <div className="mt-3 rounded-2xl border-2 border-[#1E4E8F]/25 bg-[#EAF1F9]/30 p-4">
          <AddressForm
            phone={phone}
            onDone={() => {
              setAdding(false);
              toast.success(lang === "ar" ? "اتحفظ العنوان في دفترك" : "Address saved");
            }}
          />
          <button
            onClick={() => setAdding(false)}
            className="mt-2 text-[11px] font-bold text-muted-foreground underline-offset-2 hover:underline"
          >
            {lang === "ar" ? "إلغاء" : "Cancel"}
          </button>
        </div>
      )}
    </div>
  );
}
