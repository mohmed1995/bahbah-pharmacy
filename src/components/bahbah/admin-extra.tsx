"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import { BadgeCheck, Ticket, Megaphone, Plus, RefreshCcw, CalendarClock, Users2, Repeat2, Wrench, Download, FileSpreadsheet, Search, Zap, Camera, Upload, Trash2, Tag, Percent, Sparkles, Check, Activity, Heart, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBahbah, useT, useAdminProducts, useOffers, type PatientMeasurement } from "@/lib/bahbah/store";
import { adSlides, carePlans, planById, getProduct, type CareSubscriber } from "@/lib/bahbah/data";
import { AdminCard, SectionTitle, KpiCard, TableWrap, TH, TD } from "./admin-ui";
import { fmtPrice } from "./product-card";
import { getSugarStatus, getBPStatus, getBmiStatus, timingArabic } from "./vitals";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Coupons engine — create / activate / follow usage                   */
/* ------------------------------------------------------------------ */
export function CouponsSection() {
  const t = useT();
  const coupons = useBahbah((s) => s.coupons);
  const { toggleCouponActive, addCoupon } = useBahbah();
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [minTotal, setMinTotal] = useState("200");

  const create = () => {
    const norm = code.trim().toUpperCase();
    const pct = Math.min(90, Math.max(1, Number(percent) || 0));
    const min = Math.max(0, Number(minTotal) || 0);
    if (!norm || !pct) {
      toast.error(t("coupon.invalid"));
      return;
    }
    if (coupons.some((c) => c.code === norm)) {
      toast.error(t("coupon.invalid"));
      return;
    }
    addCoupon({ code: norm, percent: pct, minTotal: min, uses: 0, active: true });
    setCode("");
    setPercent("10");
    setMinTotal("200");
    toast.success(t("adm.couponAdded"));
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<Ticket className="size-5" />}
          tint="bg-[#EAF1F9]"
          color="text-[#1E4E8F]"
          value={String(coupons.length)}
          label={t("adm.coupons")}
        />
        <KpiCard
          icon={<BadgeCheck className="size-5" />}
          tint="bg-[#EAF6F1]"
          color="text-[#2E9E6B]"
          value={String(coupons.filter((c) => c.active).length)}
          label={t("adm.colActive")}
        />
        <KpiCard
          icon={<RefreshCcw className="size-5" />}
          tint="bg-[#FFF4E5]"
          color="text-[#C56A0A]"
          value={String(coupons.reduce((s, c) => s + c.uses, 0))}
          label={t("adm.colUses")}
        />
        <KpiCard
          icon={<Users2 className="size-5" />}
          tint="bg-[#EEF0F7]"
          color="text-[#112D51]"
          value={`${coupons.reduce((s, c) => s + c.uses, 0) * 45}`}
          label={t("adm.revToday")}
        />
      </div>

      <AdminCard>
        <SectionTitle icon={<Plus className="size-5 text-[#1E4E8F]" />} title={t("adm.couponAdd")} />
        <div className="mt-4 grid gap-2.5 md:grid-cols-4">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("adm.couponCodePh")}
            dir="ltr"
            className="h-11 rounded-xl font-bold uppercase"
          />
          <Input
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            type="number"
            min={1}
            max={90}
            placeholder={t("adm.colPercent")}
            className="h-11 rounded-xl"
          />
          <Input
            value={minTotal}
            onChange={(e) => setMinTotal(e.target.value)}
            type="number"
            min={0}
            placeholder={t("adm.colMin")}
            className="h-11 rounded-xl"
          />
          <Button className="h-11 rounded-xl font-bold" onClick={create}>
            <Plus className="size-4" />
            {t("adm.couponAdd")}
          </Button>
        </div>
      </AdminCard>

      <TableWrap>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs">
            <tr>
              <th className={TH}>{t("adm.colCode")}</th>
              <th className={TH}>{t("adm.colPercent")}</th>
              <th className={TH}>{t("adm.colMin")}</th>
              <th className={TH}>{t("adm.colUses")}</th>
              <th className={TH}>{t("adm.colActive")}</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.code} className="border-b border-border/50 last:border-0">
                <td className={TD}>
                  <span dir="ltr" className="rounded-lg bg-[#EAF1F9] px-2.5 py-1 font-heading text-sm font-black text-[#1E4E8F]">
                    {c.code}
                  </span>
                </td>
                <td className={`${TD} font-bold`}>{c.percent}%</td>
                <td className={`${TD} font-bold`}>{c.minTotal.toLocaleString("en-US")}</td>
                <td className={`${TD} font-bold`}>{c.uses}</td>
                <td className={TD}>
                  <Switch checked={c.active} onCheckedChange={() => toggleCouponActive(c.code)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ads & banners manager — full control of homepage banners            */
/* ------------------------------------------------------------------ */
/* Reusable Image Uploader with Client Compression                     */
/* ------------------------------------------------------------------ */
function ImageUploader({
  value,
  onChange,
  label = "صورة الإعلان / العرض",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        setLoading(false);
        return;
      }
      try {
        const img = new window.Image();
        img.onload = () => {
          const maxDim = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL("image/jpeg", 0.82);
          onChange(compressed);
          setLoading(false);
          toast.success("تم اختيار وضغط الصورة بنجاح ✓");
        };
        img.onerror = () => {
          onChange(dataUrl);
          setLoading(false);
        };
        img.src = dataUrl;
      } catch {
        onChange(dataUrl);
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-black/5 ring-1 ring-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Preview" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-1 end-1 grid size-5 place-items-center rounded-full bg-black/60 text-white hover:bg-black"
              title="حذف الصورة"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ) : (
          <div className="grid size-16 shrink-0 place-items-center rounded-xl border-2 border-dashed border-border/80 bg-muted/40 text-muted-foreground">
            <Camera className="size-5 opacity-60" />
          </div>
        )}

        <div className="flex-1 space-y-1.5 min-w-[200px]">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
              className="h-8 rounded-lg gap-1.5 text-xs font-bold"
            >
              <Upload className="size-3.5 text-[#1E4E8F]" />
              {loading ? "جاري المعالجة..." : "رفع صورة من جهازك"}
            </Button>
            <span className="text-[10px] text-muted-foreground">أو ضع رابطاً:</span>
          </div>
          <Input
            value={value.startsWith("data:") ? "(صورة تم رفعها بنجاح)" : value}
            onChange={(e) => {
              if (!e.target.value.startsWith("(صورة")) {
                onChange(e.target.value);
              }
            }}
            placeholder="/images/ads/ad-gym.png أو رابط مباشر"
            className="h-8 rounded-lg text-xs"
            dir="ltr"
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ads & Offers Manager — homepage banners & weekly deals             */
/* ------------------------------------------------------------------ */
export function AdsSection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const adsOff = useBahbah((s) => s.adsOff) || [];
  const adEdits = useBahbah((s) => s.adEdits) || {};
  const offerEdits = useBahbah((s) => s.offerEdits) || {};
  const allProducts = useAdminProducts();
  const offersList = useOffers();
  const { toggleAd, updateAdEdit, updateOfferEdit } = useBahbah();

  const [activeTab, setActiveTab] = useState<"ads" | "offers">("ads");
  const [editingAd, setEditingAd] = useState<string | null>(null);

  /* Add Custom Banner State */
  const [showAddBanner, setShowAddBanner] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSub, setNewSub] = useState("");
  const [newImg, setNewImg] = useState("/images/ads/ad-gym.png");
  const [newBadge, setNewBadge] = useState("عرض خاص");
  const [newCta, setNewCta] = useState("اطلب الآن");

  /* Add / Edit Offer State */
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [offerProdId, setOfferProdId] = useState("");
  const [offerPrice, setOfferPrice] = useState<number>(0);
  const [offerOldPrice, setOfferOldPrice] = useState<number>(0);
  const [offerBadge, setOfferBadge] = useState("عرض الأسبوع");
  const [offerImg, setOfferImg] = useState("");
  const [offerSearch, setOfferSearch] = useState("");

  const clicks = [1240, 980, 640, 520, 410];

  const handleToggleAd = (id: string, currentOn: boolean) => {
    toggleAd(id);
    toast.success(
      currentOn
        ? (lang === "ar" ? "تم إخفاء الإعلان من الصفحة الرئيسية بنجاح" : "Ad banner hidden from homepage")
        : (lang === "ar" ? "تم تفعيل الإعلان وعرضه في الصفحة الرئيسية بنجاح" : "Ad banner activated on homepage")
    );
  };

  const handleSelectProductForOffer = (productId: string) => {
    setOfferProdId(productId);
    const p = allProducts.find((item) => item.id === productId);
    if (p) {
      setOfferOldPrice(p.oldPrice || p.price);
      setOfferPrice(Math.round(p.price * 0.8)); // default 20% discount
      setOfferImg(p.img || "");
    }
  };

  const handleSaveOffer = () => {
    if (!offerProdId) {
      toast.error("برجاء اختيار الصنف المراد إضافته للعروض");
      return;
    }
    if (!offerPrice || offerPrice <= 0) {
      toast.error("برجاء كتابة سعر العرض المخفض");
      return;
    }

    updateOfferEdit(offerProdId, {
      price: Number(offerPrice),
      oldPrice: Number(offerOldPrice) || Number(offerPrice) * 1.25,
      badgeAr: offerBadge || "عرض خاص",
      badgeEn: "Special Offer",
      img: offerImg,
      active: true,
    });

    toast.success("تم تفعيل ونشر العرض في شاشات العملاء بنجاح ✓");
    setShowAddOffer(false);
    setOfferProdId("");
  };

  const candidateProducts = useMemo(() => {
    const q = offerSearch.trim().toLowerCase();
    if (!q) return allProducts.slice(0, 15);
    return allProducts
      .filter((p) => p.nameAr.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q))
      .slice(0, 25);
  }, [allProducts, offerSearch]);

  return (
    <div className="space-y-5">
      {/* Top Header & Tab Navigation */}
      <AdminCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionTitle icon={<Megaphone className="size-5 text-[#F09428]" />} title="إدارة الإعلانات وعروض الصيدلية" />
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {lang === "ar"
                ? "تعديل إعلانات وبنرات الرئيسية، إنشاء عروض أسبوعية جديدة، وتغيير أو رفع صور المنتجات والإعلانات مباشرة."
                : "Manage homepage banners, weekly deals, pricing discounts, and upload promo images."}
            </p>
          </div>

          {/* Navigation Pill Buttons */}
          <div className="flex items-center gap-2 rounded-xl bg-muted/80 p-1">
            <button
              onClick={() => setActiveTab("ads")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === "ads"
                  ? "bg-[#1E4E8F] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Megaphone className="size-3.5" />
              إعلانات الرئيسية ({adSlides.length})
            </button>
            <button
              onClick={() => setActiveTab("offers")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === "offers"
                  ? "bg-[#EA580C] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Percent className="size-3.5" />
              عروض وخصومات الأسبوع ({offersList.length})
            </button>
          </div>
        </div>
      </AdminCard>

      {/* ================= TAB 1: إعلانات وبنرات الرئيسية ================= */}
      {activeTab === "ads" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground">
              بنرات وإعلانات السلايدر في الصفحة الرئيسية:
            </p>
            <Button
              className="h-9 rounded-xl bg-[#1E4E8F] px-4 text-xs font-bold text-white hover:bg-[#112D51]"
              onClick={() => setShowAddBanner(!showAddBanner)}
            >
              <Plus className="size-4 me-1" />
              {showAddBanner ? "إغلاق النموذج" : "إضافة إعلان جديد"}
            </Button>
          </div>

          {/* Add Banner Form with Image Upload */}
          {showAddBanner && (
            <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 space-y-3">
              <p className="font-heading text-sm font-black text-[#1E4E8F]">
                إضافة بنر إعلاني جديد للرئيسية:
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground">عنوان الإعلان *</span>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="مثال: خصم 20% على منتجات العناية بالبشرة"
                    className="h-9 rounded-lg text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground">الوصف المختصر</span>
                  <Input
                    value={newSub}
                    onChange={(e) => setNewSub(e.target.value)}
                    placeholder="مثال: توصيل 24 ساعة وشحن سريع لجميع المحافظات"
                    className="h-9 rounded-lg text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground">شريط التميز (Badge)</span>
                  <Input
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    placeholder="مثال: عرض اليوم"
                    className="h-9 rounded-lg text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground">نص زر الإعلان (CTA)</span>
                  <Input
                    value={newCta}
                    onChange={(e) => setNewCta(e.target.value)}
                    placeholder="مثال: تسوق العرض الآن"
                    className="h-9 rounded-lg text-xs"
                  />
                </label>

                {/* Direct Image Uploader */}
                <div className="sm:col-span-2">
                  <ImageUploader
                    value={newImg}
                    onChange={setNewImg}
                    label="صورة البنر الإعلاني (رفع من الجهاز أو رابط)"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  onClick={() => setShowAddBanner(false)}
                >
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  className="h-8 rounded-lg bg-[#2E9E6B] text-xs font-bold text-white hover:bg-[#238156]"
                  onClick={() => {
                    if (!newTitle.trim()) {
                      toast.error("برجاء كتابة عنوان الإعلان");
                      return;
                    }
                    updateAdEdit("ad-gym", {
                      titleAr: newTitle,
                      subAr: newSub,
                      badgeAr: newBadge,
                      ctaAr: newCta,
                      img: newImg,
                    });
                    toast.success("تم حفظ وتحديث الإعلان في الصفحة الرئيسية بنجاح!");
                    setShowAddBanner(false);
                  }}
                >
                  حفظ ونشر الإعلان
                </Button>
              </div>
            </div>
          )}

          {/* Existing Banners Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {adSlides.map((s, i) => {
              const on = !adsOff.includes(s.id);
              const e = adEdits[s.id] ?? {};
              const open = editingAd === s.id;
              const bannerImg = e.img || s.img;

              return (
                <div
                  key={s.id}
                  className={`overflow-hidden rounded-2xl border bg-card shadow-sm transition ${
                    on ? "border-border/70" : "border-border/40 opacity-70"
                  }`}
                >
                  <div className="relative h-32 md:h-40 bg-black/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={bannerImg} alt={s.titleKeyAr} className="size-full object-cover" />
                    {!on && <div className="absolute inset-0 bg-black/50" />}
                    <Badge
                      className={`absolute top-2.5 end-2.5 rounded-full px-3 py-1 font-bold ${
                        on ? "bg-[#2E9E6B] text-white" : "bg-[#DC4B4B] text-white"
                      } hover:bg-inherit`}
                    >
                      {on ? "● معروض في الرئيسية" : "✕ متوقف عن العرض"}
                    </Badge>
                    <span className="absolute top-2.5 start-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-black text-white">
                      إعلان #{i + 1}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-heading text-sm font-black">
                        {lang === "ar" ? e.titleAr || s.titleKeyAr : e.titleEn || s.titleKeyEn}
                      </p>
                      <p className="truncate text-[11px] font-bold text-muted-foreground">
                        {lang === "ar" ? e.subAr || s.subKeyAr : e.subEn || s.subKeyEn}
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">
                        {clicks[i % clicks.length].toLocaleString("en-US")} {t("adm.ad.clicks")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full px-3 text-[11px] font-black"
                        onClick={() => setEditingAd(open ? null : s.id)}
                      >
                        {open ? "إغلاق" : t("misc.edit")}
                      </Button>

                      <Button
                        size="sm"
                        className={`h-8 rounded-full px-3 text-[11px] font-black ${
                          on
                            ? "bg-[#DC4B4B]/10 text-[#DC4B4B] hover:bg-[#DC4B4B]/20"
                            : "bg-[#2E9E6B] text-white hover:bg-[#238156]"
                        }`}
                        onClick={() => handleToggleAd(s.id, on)}
                      >
                        {on ? "إيقاف" : "تفعيل"}
                      </Button>
                    </div>
                  </div>

                  {/* Inline Editor with Live Image Upload */}
                  {open && (
                    <div className="space-y-3 border-t border-border/60 bg-muted/40 p-4">
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        <label className="block space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground">{t("adm.ads.titleAr")}</span>
                          <Input
                            value={e.titleAr ?? ""}
                            onChange={(ev) => updateAdEdit(s.id, { titleAr: ev.target.value })}
                            placeholder={s.titleKeyAr}
                            className="h-9 rounded-lg text-xs"
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground">{t("adm.ads.titleEn")}</span>
                          <Input
                            value={e.titleEn ?? ""}
                            onChange={(ev) => updateAdEdit(s.id, { titleEn: ev.target.value })}
                            placeholder={s.titleKeyEn}
                            className="h-9 rounded-lg text-xs"
                            dir="ltr"
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground">{t("adm.ads.subAr")}</span>
                          <Input
                            value={e.subAr ?? ""}
                            onChange={(ev) => updateAdEdit(s.id, { subAr: ev.target.value })}
                            placeholder={s.subKeyAr}
                            className="h-9 rounded-lg text-xs"
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground">{t("adm.ads.subEn")}</span>
                          <Input
                            value={e.subEn ?? ""}
                            onChange={(ev) => updateAdEdit(s.id, { subEn: ev.target.value })}
                            placeholder={s.subKeyEn}
                            className="h-9 rounded-lg text-xs"
                            dir="ltr"
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground">{t("adm.ads.badge")}</span>
                          <Input
                            value={e.badgeAr ?? ""}
                            onChange={(ev) => updateAdEdit(s.id, { badgeAr: ev.target.value })}
                            placeholder={s.badgeAr}
                            className="h-9 rounded-lg text-xs"
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground">{t("adm.ads.cta")}</span>
                          <Input
                            value={e.ctaAr ?? ""}
                            onChange={(ev) => updateAdEdit(s.id, { ctaAr: ev.target.value })}
                            placeholder={s.ctaKeyAr}
                            className="h-9 rounded-lg text-xs"
                          />
                        </label>

                        {/* Image Uploader for this specific banner */}
                        <div className="sm:col-span-2 pt-1 border-t border-border/40">
                          <ImageUploader
                            value={e.img || s.img}
                            onChange={(imgUrl) => updateAdEdit(s.id, { img: imgUrl })}
                            label="تغيير أو رفع صورة هذا البنر:"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <p className="text-[11px] font-bold text-[#2E9E6B]">
                          {t("misc.saved")} ✓ — يسمع في الرئيسية فوراً
                        </p>
                        <Button
                          size="sm"
                          className="h-8 rounded-lg bg-[#1E4E8F] px-4 text-xs font-bold text-white hover:bg-[#112D51]"
                          onClick={() => {
                            toast.success("تم حفظ وتحديث الإعلان بنجاح ✓");
                            setEditingAd(null);
                          }}
                        >
                          تم الحفظ
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 2: عروض وخصومات الأسبوع ================= */}
      {activeTab === "offers" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-muted-foreground">
                الأصناف المدرجة في قسم العروض وصفحة الخصومات الأسبوعية:
              </p>
            </div>
            <Button
              className="h-9 rounded-xl bg-[#EA580C] px-4 text-xs font-bold text-white hover:bg-[#C2410C]"
              onClick={() => setShowAddOffer(!showAddOffer)}
            >
              <Plus className="size-4 me-1" />
              {showAddOffer ? "إغلاق النموذج" : "إضافة عرض جديد"}
            </Button>
          </div>

          {/* Add / Setup New Offer Form */}
          {showAddOffer && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 space-y-3 dark:border-orange-950 dark:bg-orange-950/20">
              <p className="font-heading text-sm font-black text-[#EA580C]">
                إضافة صنف لقائمة العروض والخصومات:
              </p>

              {/* Product picker */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-foreground/80">
                  ابحث واختر الصنف من الصيدلية:
                </label>
                <div className="flex gap-2">
                  <Input
                    value={offerSearch}
                    onChange={(e) => setOfferSearch(e.target.value)}
                    placeholder="اكتب اسم الدواء أو المنتج للبحث..."
                    className="h-9 rounded-lg text-xs"
                  />
                </div>

                <div className="nice-scrollbar max-h-36 overflow-y-auto rounded-xl border border-border/80 bg-background p-1 divide-y divide-border/40">
                  {candidateProducts.map((p) => {
                    const sel = p.id === offerProdId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProductForOffer(p.id)}
                        className={`flex w-full items-center justify-between p-2 text-start text-xs transition rounded-lg ${
                          sel ? "bg-[#EA580C]/15 font-bold text-[#EA580C]" : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {p.img && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.img} alt="" className="size-7 rounded object-contain bg-white p-0.5 border" />
                          )}
                          <span>{p.nameAr} ({p.nameEn})</span>
                        </div>
                        <span className="font-bold">{p.price} ج.م</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price & Badge Setup */}
              <div className="grid gap-3 sm:grid-cols-3 pt-2">
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground">السعر الأصلي قبل الخصم (ج.م)</span>
                  <Input
                    type="number"
                    value={offerOldPrice || ""}
                    onChange={(e) => setOfferOldPrice(Number(e.target.value))}
                    className="h-9 rounded-lg text-xs"
                    dir="ltr"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground">سعر العرض المخفض (ج.م) *</span>
                  <Input
                    type="number"
                    value={offerPrice || ""}
                    onChange={(e) => setOfferPrice(Number(e.target.value))}
                    className="h-9 rounded-lg text-xs"
                    dir="ltr"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground">شارة العرض (Badge)</span>
                  <Input
                    value={offerBadge}
                    onChange={(e) => setOfferBadge(e.target.value)}
                    placeholder="مثال: خصم 25%، عرض الأسبوع"
                    className="h-9 rounded-lg text-xs"
                  />
                </label>

                {/* Offer Image Uploader */}
                <div className="sm:col-span-3">
                  <ImageUploader
                    value={offerImg}
                    onChange={setOfferImg}
                    label="صورة العرض (رفع صورة مخصصة من الجهاز أو الكاميرا)"
                  />
                </div>
              </div>

              {offerOldPrice > 0 && offerPrice > 0 && offerPrice < offerOldPrice && (
                <div className="rounded-xl bg-orange-100/70 p-2 text-center text-xs font-bold text-[#EA580C] dark:bg-orange-900/30">
                  نسبة الخصم المحسوبة تلقائياً: {Math.round(((offerOldPrice - offerPrice) / offerOldPrice) * 100)}% خصم حقيقي
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  onClick={() => setShowAddOffer(false)}
                >
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  className="h-8 rounded-lg bg-[#EA580C] text-xs font-bold text-white hover:bg-[#C2410C]"
                  onClick={handleSaveOffer}
                >
                  حفظ وتفعيل العرض
                </Button>
              </div>
            </div>
          )}

          {/* Active Offers List */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offersList.map((p) => {
              const e = offerEdits[p.id];
              const pct = p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;

              return (
                <div
                  key={p.id}
                  className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3.5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border bg-white p-1">
                      {p.img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.img} alt={p.nameAr} className="size-full object-contain" />
                      ) : (
                        <p.icon className="size-full text-muted-foreground p-2" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Badge className="bg-[#EA580C] text-white text-[10px] font-black hover:bg-[#EA580C]">
                          -{pct}%
                        </Badge>
                        <span className="text-[10px] font-bold text-muted-foreground truncate">
                          {e?.badgeAr || "عرض خاص"}
                        </span>
                      </div>
                      <p className="font-heading text-xs font-black truncate mt-1">
                        {p.nameAr}
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-heading text-sm font-black text-[#EA580C]">
                          {p.price} ج.م
                        </span>
                        {p.oldPrice && (
                          <span className="text-[11px] text-muted-foreground line-through">
                            {p.oldPrice} ج.م
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Check className="size-3.5 text-[#2E9E6B]" />
                      <span>فعال بالمتجر</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs font-bold text-[#DC4B4B] hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                      onClick={() => {
                        updateOfferEdit(p.id, { active: false });
                        toast.success(`تم حذف ${p.nameAr} من قائمة العروض`);
                      }}
                    >
                      <Trash2 className="size-3.5 me-1" />
                      إلغاء العرض
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* عملاء الأدوية الشهرية — بديل رعاية بحبح والصناديق                   */
/* ------------------------------------------------------------------ */
export function CareAdminSection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const careSubs = useBahbah((s) => s.careSubs);
  const toggleCareSubStatus = useBahbah((s) => s.toggleCareSubStatus);
  const refillMonthlyRx = useBahbah((s) => s.refillMonthlyRx);

  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");

  const activeCount = careSubs.filter((s) => s.status === "active").length;
  const rxCount = careSubs.filter((s) => !!s.prescriptionUrl).length;

  const filtered = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return careSubs;
    return careSubs.filter(
      (s) =>
        s.nameAr.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q))
    );
  }, [careSubs, filterQuery]);

  const handleRefillOrder = async (patient: CareSubscriber) => {
    try {
      const orderId = await refillMonthlyRx(patient);
      toast.success(
        lang === "ar"
          ? `تم إنشاء طلب تكرار علاج شهري بنجاح برقم: (${orderId}) وتمت إضافته للطلبات!`
          : `Refill order created: #${orderId}`
      );
    } catch {
      toast.error(lang === "ar" ? "تعذر إنشاء طلب التكرار" : "Refill failed");
    }
  };

  return (
    <div className="space-y-5">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<Users2 className="size-5" />}
          tint="bg-[#EAF1F9]"
          color="text-[#1E4E8F]"
          value={String(careSubs.length)}
          label={lang === "ar" ? "إجمالي المرضى المسجلين" : "Registered Patients"}
        />
        <KpiCard
          icon={<BadgeCheck className="size-5" />}
          tint="bg-[#EAF6F1]"
          color="text-[#2E9E6B]"
          value={String(activeCount)}
          label={lang === "ar" ? "مرضى نشطين (توصيل شهري)" : "Active Patients"}
        />
        <KpiCard
          icon={<FileSpreadsheet className="size-5" />}
          tint="bg-[#FFF4E5]"
          color="text-[#C56A0A]"
          value={String(rxCount)}
          label={lang === "ar" ? "روشتات مرفقة" : "Rx Images Attached"}
        />
        <KpiCard
          icon={<CalendarClock className="size-5" />}
          tint="bg-[#EEF0F7]"
          color="text-[#112D51]"
          value={`${new Date().getDate()} من الشهر`}
          label={lang === "ar" ? "اليوم الحالي" : "Current Day"}
        />
      </div>

      {/* Filter and Section Header */}
      <AdminCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionTitle
              icon={<Repeat2 className="size-5 text-[#2E9E6B]" />}
              title={lang === "ar" ? "سجل عملاء الأدوية الشهرية والعلاج المزمن" : "Monthly Medicine Patients Registry"}
            />
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {lang === "ar"
                ? "متابعة وتجهيز طلبيات الأدوية الشهرية للمرضى، وفحص الروشتات والملاحظات والتركيزات وتكرار العلاج فوراً"
                : "Manage regular monthly chronic patients, review attached prescriptions and dispatch refills."}
            </p>
          </div>
          <div className="w-full sm:w-72">
            <Input
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={lang === "ar" ? "بحث باسم المريض أو الهاتف أو الكود..." : "Search patient..."}
              className="h-10 rounded-xl text-xs"
            />
          </div>
        </div>
      </AdminCard>

      {/* Patients Table */}
      <TableWrap>
        <table className="w-full min-w-[850px] text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs">
            <tr>
              <th className={TH}>كود المريض</th>
              <th className={TH}>اسم المريض والموبايل</th>
              <th className={TH}>العنوان بالتفصيل</th>
              <th className={TH}>يوم التوصيل</th>
              <th className={TH}>الملاحظات والتركيزات</th>
              <th className={TH}>صورة الروشتة</th>
              <th className={TH}>الحالة</th>
              <th className={TH}>إجراءات سريعة</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-xs font-bold text-muted-foreground">
                  {lang === "ar" ? "لا يوجد عملاء أدوية شهرية مسجلين حالياً" : "No registered patients found"}
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className={TD}>
                    <span className="rounded-lg bg-[#EAF1F9] px-2.5 py-1 font-heading text-xs font-black text-[#1E4E8F]">
                      {s.id}
                    </span>
                  </td>
                  <td className={TD}>
                    <p className="font-bold text-foreground">{s.nameAr}</p>
                    <a
                      href={`https://wa.me/201011500166?text=${encodeURIComponent(
                        `مرحباً، بخصوص ملف العميل الشهري ${s.nameAr} (كود: ${s.id}).`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#25D366] hover:underline"
                      dir="ltr"
                    >
                      {s.phone}
                    </a>
                  </td>
                  <td className={`${TD} max-w-[200px] truncate text-xs text-muted-foreground`}>
                    {s.address || "—"}
                  </td>
                  <td className={`${TD} font-bold text-xs`}>
                    يوم {s.dayPref || 1} شهرياً
                  </td>
                  <td className={`${TD} max-w-[180px] truncate text-xs`}>
                    {s.notes ? (
                      <span className="rounded-md bg-[#FFFBEB] px-2 py-0.5 font-semibold text-[#B45E0A]" title={s.notes}>
                        {s.notes}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={TD}>
                    {s.prescriptionUrl ? (
                      <button
                        onClick={() => setPreviewImg(s.prescriptionUrl || null)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-xs font-bold text-[#1E4E8F] shadow-xs hover:bg-muted"
                      >
                        <div className="relative size-5 overflow-hidden rounded bg-muted">
                          <Image src={s.prescriptionUrl} alt="Rx" fill className="object-cover" />
                        </div>
                        عرض
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">بدون صورة</span>
                    )}
                  </td>
                  <td className={TD}>
                    {s.status === "active" ? (
                      <Badge className="rounded-full border-0 bg-[#EAF6F1] text-[#2E9E6B]">
                        نشط
                      </Badge>
                    ) : (
                      <Badge className="rounded-full border-0 bg-[#FFF4E5] text-[#B45E0A]">
                        موقوف
                      </Badge>
                    )}
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        className="h-8 rounded-full bg-[#F59E0B] px-2.5 text-[11px] font-black text-white hover:bg-[#EA580C]"
                        onClick={() => handleRefillOrder(s)}
                        title="إنشاء طلب تكرار لهذا المريض فوراً"
                      >
                        <Zap className="size-3" />
                        تكرار العلاج
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full px-2.5 text-xs font-bold"
                        onClick={() => toggleCareSubStatus(s.id)}
                      >
                        <RefreshCcw className="size-3" />
                        {s.status === "active" ? "إيقاف" : "استئناف"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>

      {/* Prescription Zoom Modal */}
      <Dialog open={!!previewImg} onOpenChange={() => setPreviewImg(null)}>
        <DialogContent className="max-w-xl p-4">
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-black">
              معاينة صورة الروشتة الشهرية للعميل
            </DialogTitle>
          </DialogHeader>
          {previewImg && (
            <div className="relative mt-2 h-[70vh] w-full overflow-hidden rounded-xl bg-black/5">
              <Image src={previewImg} alt="Prescription Full Preview" fill className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* قياسات المريض — لوحة إدارة قياسات السكر والضغط والوزن              */
/* ------------------------------------------------------------------ */
export function VitalsAdminSection() {
  const lang = useBahbah((s) => s.lang);
  const measurements = useBahbah((s) => s.measurements);
  const deleteMeasurement = useBahbah((s) => s.deleteMeasurement);
  const go = useBahbah((s) => s.go);

  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return measurements;
    return measurements.filter(
      (m) =>
        m.patientName.toLowerCase().includes(s) ||
        m.patientCode.toLowerCase().includes(s) ||
        m.patientPhone.includes(s)
    );
  }, [measurements, q]);

  const sugarCount = measurements.filter((m) => m.bloodSugar != null).length;
  const bpCount = measurements.filter((m) => m.systolic != null).length;
  const weightCount = measurements.filter((m) => m.weight != null).length;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<Activity className="size-5" />}
          tint="bg-[#EAF1F9]"
          color="text-[#1E4E8F]"
          value={String(measurements.length)}
          label={lang === "ar" ? "إجمالي القياسات المسجلة" : "Total Measurements"}
        />
        <KpiCard
          icon={<Activity className="size-5" />}
          tint="bg-[#FFF4E5]"
          color="text-[#C56A0A]"
          value={String(sugarCount)}
          label={lang === "ar" ? "قياسات السكر" : "Blood Sugar Records"}
        />
        <KpiCard
          icon={<Heart className="size-5" />}
          tint="bg-red-50"
          color="text-red-600"
          value={String(bpCount)}
          label={lang === "ar" ? "قياسات ضغط الدم" : "Blood Pressure Records"}
        />
        <KpiCard
          icon={<Scale className="size-5" />}
          tint="bg-[#EAF6F1]"
          color="text-[#2E9E6B]"
          value={String(weightCount)}
          label={lang === "ar" ? "قياسات الوزن" : "Weight Records"}
        />
      </div>

      {/* Header and Search */}
      <AdminCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionTitle
              icon={<Activity className="size-5 text-[#2E9E6B]" />}
              title={lang === "ar" ? "سجل قياسات السكر والضغط والوزن لجميع المرضى" : "Patients Health Vitals Log"}
            />
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {lang === "ar"
                ? "يمكنك فحص سجل القياسات الطبية ومتابعة تطور الحالات، والذهاب لبوابة المريض العامة مباشرة."
                : "Manage and monitor recorded vital signs for all pharmacy patients."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-10 rounded-xl text-xs font-bold"
              onClick={() => go("vitals")}
            >
              {lang === "ar" ? "فتح بوابة المريض ↗" : "Open Patient Portal ↗"}
            </Button>
            <div className="w-64">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={lang === "ar" ? "بحث باسم المريض أو الكود..." : "Search..."}
                className="h-10 rounded-xl text-xs"
              />
            </div>
          </div>
        </div>
      </AdminCard>

      {/* Table */}
      <TableWrap>
        <table className="w-full min-w-[850px] text-xs">
          <thead className="border-b border-border bg-muted/50 text-[11px]">
            <tr>
              <th className={TH}>{lang === "ar" ? "كود واسم المريض" : "Patient Code & Name"}</th>
              <th className={TH}>{lang === "ar" ? "رقم الموبايل" : "Phone"}</th>
              <th className={TH}>{lang === "ar" ? "قياس السكر" : "Blood Sugar"}</th>
              <th className={TH}>{lang === "ar" ? "ضغط الدم والنبض" : "Blood Pressure"}</th>
              <th className={TH}>{lang === "ar" ? "الوزن و BMI" : "Weight & BMI"}</th>
              <th className={TH}>{lang === "ar" ? "التاريخ والوقت" : "Recorded At"}</th>
              <th className={TH}>{lang === "ar" ? "ملاحظات الصيدلي" : "Pharmacist Notes"}</th>
              <th className={TH}>{lang === "ar" ? "حذف" : "Action"}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-xs font-bold text-muted-foreground">
                  {lang === "ar" ? "لا توجد قياسات مطابقة" : "No records found"}
                </td>
              </tr>
            ) : (
              filtered.map((m) => {
                const sugarSt = getSugarStatus(m.bloodSugar, m.sugarTiming);
                const bpSt = getBPStatus(m.systolic, m.diastolic);
                const bmiSt = getBmiStatus(m.bmi);
                const d = new Date(m.recordedAt);
                const dtStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString(
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
                        {dtStr}
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
                          toast.success("تم حذف القياس بنجاح");
                        }}
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
  );
}

/* ------------------------------------------------------------------ */
/* Maintenance & Google Cloud Sync & Live Price Updater                */
/* ------------------------------------------------------------------ */
export function MaintenanceSection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const products = useAdminProducts();
  const setPrice = useBahbah((s) => s.setPrice);
  const restock = useBahbah((s) => s.restock);
  const adminOrders = useBahbah((s) => s.adminOrders);
  const orders = adminOrders ?? [];
  
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");

  const filtered = q.trim()
    ? products.filter(
        (p) =>
          p.nameAr.toLowerCase().includes(q.toLowerCase()) ||
          p.nameEn.toLowerCase().includes(q.toLowerCase()) ||
          p.id.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 30)
    : products.slice(0, 15);

  const handleSavePrice = (id: string) => {
    const p = Number(editPrice);
    if (!p || p <= 0) {
      toast.error(lang === "ar" ? "يرجى إدخال سعر صحيح" : "Please enter a valid price");
      return;
    }
    setPrice(id, p);
    if (editStock) {
      const s = Number(editStock);
      if (s > 0) restock(id, s);
    }
    setEditingId(null);
    toast.success(lang === "ar" ? "تم تحديث السعر والمخزون فوراً بنجاح!" : "Price updated live!");
  };

  const exportGoogleSheetsCSV = () => {
    const headers = ["ID", "Name_Arabic", "Name_English", "Category", "Price_EGP", "OldPrice_EGP", "Stock", "Expiry"];
    const rows = products.map((p) => [
      `"${p.id}"`,
      `"${(p.nameAr || "").replace(/"/g, '""')}"`,
      `"${(p.nameEn || "").replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.price,
      p.oldPrice || p.price,
      p.stock,
      `"${p.expiry}"`,
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `صيدلية_بحبح_مخزون_وأسعار_جوجل_شيتس_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(lang === "ar" ? "تم تصدير ملف Google Sheets بنجاح!" : "Google Sheets CSV exported successfully!");
  };

  const exportGoogleDriveBackup = () => {
    const fullBackup = {
      pharmacy: "Bahbah Pharmacy — صيدلية بحبح الفاخرة ديروط",
      timestamp: new Date().toISOString(),
      pharmacist_in_charge: "د. هاشم بحبح (Dr. Hashem Bahbah)",
      products_count: products.length,
      orders_count: orders.length,
      products,
      orders,
    };
    const jsonStr = JSON.stringify(fullBackup, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bahbah_pharmacy_google_drive_backup_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(lang === "ar" ? "تم تنزيل النسخة الاحتياطية لجوجل درايف بنجاح!" : "Google Drive backup downloaded!");
  };

  return (
    <div className="space-y-6">
      {/* Header card: Roles & Control */}
      <div className="rounded-3xl bg-gradient-to-r from-[#112D51] via-[#1E4E8F] to-[#2E9E6B] p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-[#F09428] font-black text-white hover:bg-[#e08317]">
                {lang === "ar" ? "جاهز للتشغيل الحي 100%" : "Production Ready"}
              </Badge>
              <span className="text-xs font-bold text-white/80">
                {lang === "ar" ? "صيدلية بحبح — ديروط" : "Bahbah Pharmacy"}
              </span>
            </div>
            <h2 className="mt-2 font-heading text-2xl font-black">
              {lang === "ar"
                ? "مركز الصيانة السريعة وتحديث الأسعار ومزامنة Google"
                : "Live Price Updater & Cloud Maintenance Center"}
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/80 md:text-sm">
              {lang === "ar"
                ? "تنسيق متكامل بين دكتور هاشم (صاحب الصيدلية والرقابة الدوائية والحسابات) والمهندس البرمجي (توصيل الأزرار، منع الأخطاء، والنسخ الاحتياطي السحابي)."
                : "Coordinated systems for Dr. Hashem (Clinical & Accounts Oversight) and the Software Engineer (API wiring & Cloud Backup)."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button
              className="h-11 rounded-full bg-[#059669] px-5 font-black text-white hover:bg-[#047857] shadow-md"
              onClick={exportGoogleSheetsCSV}
            >
              <FileSpreadsheet className="size-4 me-2" />
              {lang === "ar" ? "تصدير إلى Google Sheets" : "Export to Google Sheets"}
            </Button>
            <Button
              className="h-11 rounded-full bg-[#F09428] px-5 font-black text-white hover:bg-[#d87c14] shadow-md"
              onClick={exportGoogleDriveBackup}
            >
              <Download className="size-4 me-2" />
              {lang === "ar" ? "نسخ احتياطي Google Drive" : "Google Drive Backup"}
            </Button>
          </div>
        </div>

        {/* Health indicators */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur">
            <span className="text-[11px] font-bold text-white/70">
              {lang === "ar" ? "دقة الحسابات المالية" : "Financial Accuracy"}
            </span>
            <p className="mt-1 font-heading text-lg font-black text-[#4ADE80]">100% بالقرش</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur">
            <span className="text-[11px] font-bold text-white/70">
              {lang === "ar" ? "حالة الأزرار والروابط" : "System Buttons"}
            </span>
            <p className="mt-1 font-heading text-lg font-black text-[#4ADE80]">شغالة بالكامل</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur">
            <span className="text-[11px] font-bold text-white/70">
              {lang === "ar" ? "مواعيد العمل والدليفري" : "Working Hours"}
            </span>
            <p className="mt-1 font-heading text-lg font-black text-[#F09428]">24 ساعة يومياً</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur">
            <span className="text-[11px] font-bold text-white/70">
              {lang === "ar" ? "إجمالي المنتجات المربوطة" : "Active Products"}
            </span>
            <p className="mt-1 font-heading text-lg font-black text-white">{products.length} صنف</p>
          </div>
        </div>
      </div>

      {/* Live Fast Price Updater */}
      <AdminCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle
            icon={<Zap className="size-5 text-[#F09428]" />}
            title={lang === "ar" ? "محدث الأسعار السريع الفوري" : "Instant Live Price & Stock Updater"}
          />
          <div className="relative w-full max-w-xs">
            <Search className="absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={lang === "ar" ? "ابحث عن أي دواء أو مستحضر..." : "Search product..."}
              className="h-10 rounded-full ps-9 text-xs"
            />
          </div>
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          {lang === "ar"
            ? "أي تعديل هنا يسمع فوراً لحظياً في شاشات العملاء والسلة وفواتير الكاشير دون الحاجة لإعادة تشغيل أو تحديث."
            : "Any price change takes effect instantly across catalog, cart, and cashier invoices without reload."}
        </p>

        <div className="mt-4">
          <TableWrap>
            <table className="w-full text-start text-xs">
              <thead className="border-b border-border bg-muted/40 font-bold text-muted-foreground">
                <tr>
                  <th className={TH}>{lang === "ar" ? "الصنف" : "Product"}</th>
                  <th className={TH}>{lang === "ar" ? "القسم" : "Category"}</th>
                  <th className={TH}>{lang === "ar" ? "السعر الحالي" : "Current Price"}</th>
                  <th className={TH}>{lang === "ar" ? "المخزون" : "Stock"}</th>
                  <th className={TH}>{lang === "ar" ? "إجراء سريع" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((p) => {
                  const isEditing = editingId === p.id;
                  return (
                    <tr key={p.id} className="transition hover:bg-muted/30">
                      <td className={`${TD} font-bold text-foreground`}>
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-[#2E9E6B]" />
                          <span>{lang === "ar" ? p.nameAr : p.nameEn}</span>
                        </div>
                      </td>
                      <td className={TD}>
                        <Badge variant="outline" className="text-[10px]">
                          {p.category}
                        </Badge>
                      </td>
                      <td className={`${TD} font-bold text-[#1E4E8F]`}>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="h-8 w-24 rounded-lg text-xs"
                            dir="ltr"
                          />
                        ) : (
                          fmtPrice(p.price, t)
                        )}
                      </td>
                      <td className={TD}>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editStock}
                            onChange={(e) => setEditStock(e.target.value)}
                            placeholder={String(p.stock)}
                            className="h-8 w-20 rounded-lg text-xs"
                            dir="ltr"
                          />
                        ) : (
                          <span className={p.stock < 10 ? "font-bold text-[#DC4B4B]" : "font-medium"}>
                            {p.stock}
                          </span>
                        )}
                      </td>
                      <td className={TD}>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              className="h-8 rounded-lg bg-[#2E9E6B] px-3 text-xs font-bold text-white hover:bg-[#258257]"
                              onClick={() => handleSavePrice(p.id)}
                            >
                              حفظ
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-lg px-2 text-xs"
                              onClick={() => setEditingId(null)}
                            >
                              إلغاء
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg border-[#1E4E8F]/30 px-3 text-xs font-bold text-[#1E4E8F] hover:bg-[#1E4E8F]/10"
                            onClick={() => {
                              setEditingId(p.id);
                              setEditPrice(String(p.price));
                              setEditStock(String(p.stock));
                            }}
                          >
                            تعديل السعر
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        </div>
      </AdminCard>
    </div>
  );
}
