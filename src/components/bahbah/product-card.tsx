"use client";

import { useState } from "react";
import Image from "next/image";
import { BadgeCheck, FileWarning, ShieldCheck, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { setProductPriceOnServer } from "@/lib/supabase";
import {
  discountPct,
  type Product,
  categories,
} from "@/lib/bahbah/data";
import { useBahbah, useT, type DictKey } from "@/lib/bahbah/store";
import {
  IconStarFill,
  IconHeartFill,
  IconHeartLineDuo,
  IconPlus,
  IconMinus,
  IconCartBagDuo,
} from "./icons";
import { toast } from "sonner";

export type CardView = "cozy" | "list" | "compact";

export function fmtPrice(n: number, t: (k: DictKey) => string) {
  return `${n.toLocaleString("en-US")} ${t("misc.currency")}`;
}

export function catOf(id: string) {
  return categories.find((c) => c.id === id)!;
}
/* ------------------------------------------------------------------ */
/* Rating                                                              */
/* ------------------------------------------------------------------ */
export function Rating({ value, count, t }: { value: number; count?: number; t: (k: DictKey) => string }) {
  return (
    <div className="flex items-center gap-1 text-[13px]">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <IconStarFill
            key={i}
            className={`size-3.5 ${i <= Math.round(value) ? "text-[#F59E0B]" : "text-muted"}`}
          />
        ))}
      </div>
      <span className="font-bold text-foreground/85">{value.toFixed(1)}</span>
      {typeof count === "number" && (
        <span className="text-muted-foreground text-xs">({count} {t("misc.reviewsCount")})</span>
      )}
    </div>
  );
}


/* ------------------------------------------------------------------ */
/* Safe Pharmaceutical Packshot — prevents any medicine display mismatch */
/* ------------------------------------------------------------------ */
export function SafeMedicinePackshot({
  product,
  size = "md",
}: {
  product: Product;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = product.icon;
  const isSm = size === "sm";
  const isLg = size === "lg";

  return (
    <div
      className={`relative flex w-full flex-col justify-between overflow-hidden border border-slate-200/90 bg-gradient-to-b from-white via-[#F8FAFC] to-[#EFF4F9] text-start transition-all select-none ${
        isLg
          ? "h-72 md:h-80 p-5 rounded-3xl shadow-sm"
          : isSm
            ? "h-full w-full p-2.5 rounded-xl"
            : "aspect-[4/3] p-3 rounded-t-2xl"
      }`}
    >
      {/* Top medical gradient strip */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#184C8A] via-[#0284C7] to-[#059669]" />

      {/* Header: Verified Bahbah Pharmacy Rx seal */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5">
        <div className="flex items-center gap-1 rounded-full bg-[#184C8A]/10 px-2 py-0.5 text-[9.5px] font-black text-[#184C8A] md:text-[10px]">
          <BadgeCheck className="size-3 text-[#184C8A] shrink-0" />
          <span className="truncate">صيدلية بحبح معتمد 100%</span>
        </div>
        {product.rx ? (
          <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[9px] font-black text-rose-700">
            Rx
          </span>
        ) : (
          <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-black text-emerald-700">
            OTC
          </span>
        )}
      </div>

      {/* Middle: Medical dosage icon + Medicine Arabic & English Name */}
      <div className="my-auto py-1">
        <div className="flex items-center gap-2">
          <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-white shadow-xs border border-slate-100 text-[#184C8A]">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4
              className={`line-clamp-2 font-heading font-black leading-snug text-[#0B1E38] ${
                isLg ? "text-lg md:text-xl" : isSm ? "text-[11px]" : "text-[12px] md:text-[13px]"
              }`}
            >
              {product.nameAr}
            </h4>
            <p className="line-clamp-1 text-[10px] font-bold text-slate-500 font-mono" dir="ltr">
              {product.nameEn}
            </p>
          </div>
        </div>
      </div>

      {/* Footer: Strength / Concentration & Form Badges */}
      <div className="space-y-1 border-t border-slate-200/70 pt-1.5">
        <div className="flex items-center justify-between gap-1 text-[10px]">
          <span className="rounded-md bg-[#0284C7]/10 px-2 py-0.5 font-black text-[#0284C7] truncate max-w-[65%]">
            {product.ingredientAr || product.formAr || "جرعة معتمدة"}
          </span>
          <span className="text-[9px] font-bold text-slate-600 truncate">
            {product.formAr || "أقراص / شراب"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Product visual — verified photo when authentic, safe packshot fallback */
/* ------------------------------------------------------------------ */
export function ProductVisual({
  product,
  size = "md",
}: {
  product: Product;
  size?: "sm" | "md" | "lg";
}) {
  const [imgError, setImgError] = useState(false);
  const cat = catOf(product.category);
  const Icon = product.icon;
  const isMedicine = product.category === "medicines" || Boolean(product.rx);

  // Check if product image is an authentic verified photo
  const isVerified = Boolean(
    product.verifiedPhoto ||
      (product.img && (
        product.img.startsWith("data:") ||
        product.img.startsWith("blob:") ||
        product.img.includes("/images/offers/") ||
        product.img.includes("/images/products/") ||
        product.img.includes("custom")
      ))
  );

  // For medicines without a verified authentic photo, always render the clean certified packshot
  if (isMedicine && (!isVerified || !product.img || imgError)) {
    return <SafeMedicinePackshot product={product} size={size} />;
  }

  if (product.img && !imgError) {
    const isSm = size === "sm";
    const isLg = size === "lg";

    return (
      <div
        className={`relative w-full overflow-hidden ${
          isLg
            ? "h-72 md:h-80 rounded-3xl bg-gradient-to-b from-white via-white to-[#F8FAFC] border border-slate-100"
            : isSm
              ? "h-full w-full rounded-xl bg-gradient-to-b from-white to-[#F8FAFC]"
              : "aspect-[4/3] bg-gradient-to-b from-white to-[#F8FAFC] rounded-t-2xl"
        }`}
      >
        {isLg && (
          <>
            <div className="absolute -top-12 -end-12 size-44 rounded-full bg-white/60 blur-xs" />
            <div className="absolute -bottom-14 -start-14 size-48 rounded-full bg-white/50 blur-xs" />
          </>
        )}
        <Image
          src={product.img}
          alt={product.nameEn}
          fill
          loading="lazy"
          sizes={isLg ? "(max-width:768px) 100vw, 560px" : isSm ? "130px" : "280px"}
          className={
            isLg
              ? "object-contain p-4 md:p-6"
              : isSm
                ? "object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                : "object-contain p-2.5 transition-transform duration-300 group-hover:scale-105"
          }
          onError={() => setImgError(true)}
        />
        {!isLg && <div className="absolute inset-0 bg-gradient-to-t from-black/[0.03] to-transparent pointer-events-none" />}
      </div>
    );
  }

  // Fallback icon visual for non-medicine categories — نفس أبعاد صورة المنتج
  // بالظبط (aspect ثابت للـ md وارتفاع الـ lg) عشان الكارت ما يقفزش أثناء التحميل
  const box = size === "lg" ? "size-36" : size === "sm" ? "size-14" : "size-20";
  return (
    <div
      className={`${cat.tint} relative flex w-full items-center justify-center overflow-hidden ${
        size === "lg" ? "h-72 md:h-80 rounded-3xl" : size === "sm" ? "h-full rounded-xl" : "aspect-[4/3] rounded-t-2xl"
      }`}
    >
      <div className="absolute -top-8 -end-8 size-28 rounded-full bg-white/50" />
      <div className="absolute -bottom-10 -start-10 size-32 rounded-full bg-white/40" />
      <div
        className={`${box} relative flex items-center justify-center rounded-full bg-white shadow-[0_6px_20px_-6px_rgba(11,30,56,0.18)] ring-1 ring-black/5`}
      >
        <Icon className={`${size === "lg" ? "size-16" : size === "sm" ? "size-7" : "size-10"} ${cat.color}`} strokeWidth={1.6} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stock pill                                                          */
/* ------------------------------------------------------------------ */
export function StockLine({ stock, t, className = "" }: { stock: number; t: (k: DictKey) => string; className?: string }) {
  if (stock <= 0)
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold text-[#DC2626] ${className}`}>
        <span className="size-1.5 rounded-full bg-[#DC2626]" />
        {t("product.out")}
      </span>
    );
  if (stock <= 10)
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold text-[#D97706] ${className}`}>
        <span className="size-1.5 rounded-full bg-[#F59E0B]" />
        {t("product.low")}
      </span>
    );
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold text-[#059669] ${className}`}>
      <span className="size-1.5 rounded-full bg-[#059669]" />
      {t("product.inStock")}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Quantity stepper — direct cart control on the card                  */
/* ------------------------------------------------------------------ */
export function QtyStepper({
  productId,
  size = "md",
  tone = "brand",
}: {
  productId: string;
  size?: "sm" | "md";
  tone?: "brand" | "light";
}) {
  const t = useT();
  const qty = useBahbah((s) => s.cart.find((c) => c.productId === productId)?.qty ?? 0);
  const setQty = useBahbah((s) => s.setQty);
  const h = size === "sm" ? "h-8" : "h-9";
  const btn = size === "sm" ? "size-8" : "size-9";
  const w = size === "sm" ? "w-24" : "w-28";

  if (qty <= 0) {
    return (
      <Button
        size="sm"
        onClick={() => {
          useBahbah.getState().addToCart(productId);
          toast.success(t("product.added"));
        }}
        className={`${h} w-full gap-1.5 rounded-full px-4 text-[13px] font-black bg-gradient-to-r from-[#184C8A] to-[#113665] text-white shadow-sm hover:shadow-md hover:from-[#1b559b] hover:to-[#16437a] active:scale-[0.98] transition-all`}
      >
        <IconCartBagDuo className="size-4" />
        {t("product.addToCart")}
      </Button>
    );
  }

  return (
    <div
      className={`${h} ${w} mx-auto flex items-center justify-between rounded-full border-2 border-[#184C8A] bg-white px-1 shadow-sm`}
    >
      <button
        aria-label="minus"
        onClick={() => setQty(productId, qty - 1)}
        className={`${btn} grid place-items-center rounded-full text-[#184C8A] transition hover:bg-[#184C8A]/10 active:scale-90`}
      >
        <IconMinus className="size-3.5" />
      </button>
      <span className="min-w-5 text-center font-heading text-sm font-black text-[#0B1E38]">{qty}</span>
      <button
        aria-label="plus"
        onClick={() => setQty(productId, qty + 1)}
        className={`${btn} grid place-items-center rounded-full bg-[#184C8A] text-white transition hover:bg-[#113665] active:scale-90 shadow-xs`}
      >
        <IconPlus className="size-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badges column                                                       */
/* ------------------------------------------------------------------ */
function Badges({ product, t, pct }: { product: Product; t: (k: DictKey) => string; pct: number }) {
  const isMedicine = product.category === "medicines";
  return (
    <div className="absolute top-3 start-3 z-10 flex flex-col gap-1.5">
      {!isMedicine && pct > 0 && (
        <Badge className="rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] px-2.5 py-0.5 text-[11px] font-black text-white shadow-sm ring-1 ring-white/20">
          {t("offers.badge")} {pct}%
        </Badge>
      )}
      {product.tags.includes("best") && (
        <Badge className="gap-1 rounded-full bg-gradient-to-r from-[#184C8A] to-[#2563EB] px-2.5 py-0.5 text-[11px] font-black text-white shadow-sm ring-1 ring-white/20">
          <BadgeCheck className="size-3" /> {t("best.title")}
        </Badge>
      )}
      {product.tags.includes("new") && (
        <Badge className="rounded-full bg-gradient-to-r from-[#059669] to-[#10B981] px-2.5 py-0.5 text-[11px] font-black text-white shadow-sm ring-1 ring-white/20">
          {t("misc.new")}
        </Badge>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Favorite button                                                     */
/* ------------------------------------------------------------------ */
function FavButton({ product }: { product: Product }) {
  const t = useT();
  const favorites = useBahbah((s) => s.favorites);
  const toggleFavorite = useBahbah((s) => s.toggleFavorite);
  const isFav = favorites.includes(product.id);
  return (
    <button
      aria-label="favorite"
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(product.id);
        toast.success(isFav ? t("product.favRemove") : t("product.favAdd"));
      }}
      className="absolute top-3 end-3 z-10 grid size-9 place-items-center rounded-full bg-white/95 shadow-sm ring-1 ring-black/5 transition hover:scale-110 active:scale-90"
    >
      {isFav ? (
        <IconHeartFill className="size-4.5 text-[#DC2626]" />
      ) : (
        <IconHeartLineDuo className="size-4.5 text-[#0B1E38]/60" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Quick price edit — ADMIN ONLY. The pencil sits next to the price;   */
/* saving calls admin_set_price on the server and updates the local    */
/* priceOverride (cache/fallback) so the new price reflects instantly  */
/* everywhere. Customer-facing cards render nothing extra.             */
/* ------------------------------------------------------------------ */
export function QuickPriceEdit({ product }: { product: Product }) {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const sessionRole = useBahbah((s) => s.sessionRole);
  const setPrice = useBahbah((s) => s.setPrice);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  if (sessionRole !== "admin") return null;

  if (!editing) {
    return (
      <button
        aria-label={lang === "ar" ? "تعديل السعر" : "Edit price"}
        title={lang === "ar" ? "تعديل سريع للسعر" : "Quick price edit"}
        onClick={(e) => {
          e.stopPropagation();
          setValue(String(product.price));
          setEditing(true);
        }}
        className="grid size-6 shrink-0 place-items-center self-center rounded-full bg-[#F09428]/15 text-[#B45E0A] ring-1 ring-[#F09428]/30 transition hover:bg-[#F09428]/25 active:scale-90"
      >
        <Pencil className="size-3.5" />
      </button>
    );
  }

  const save = async () => {
    const p = Number(value);
    if (!p || p <= 0) {
      toast.error(lang === "ar" ? "ادخل سعر صحيح أكبر من صفر" : "Enter a valid price");
      return;
    }
    setSaving(true);
    const onServer = await setProductPriceOnServer(product.id, p);
    /* الـ override المحلي بينعكس فورًا على الكتالوج والسلة، وهو أول مصدر سعر
       بيقرأه place_order — فالسعر بيثبت حتى لو الـ RPC لسه مش متاحة */
    setPrice(product.id, p);
    setSaving(false);
    setEditing(false);
    toast.success(
      onServer
        ? lang === "ar"
          ? `تم حفظ السعر الجديد (${p} ج.م) على السيرفر`
          : `New price (${p}) saved on server`
        : lang === "ar"
          ? `تم حفظ السعر الجديد (${p} ج.م) — هيتزامن مع السيرفر`
          : `New price (${p}) saved — will sync to server`
    );
  };

  const pct = discountPct(product);
  return (
    <span
      className="flex items-center gap-1 self-center"
      onClick={(e) => e.stopPropagation()}
    >
      <Input
        type="number"
        min="0"
        step="0.5"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-8 w-20 rounded-full px-2.5 text-xs font-black"
        dir="ltr"
        autoFocus
      />
      <button
        aria-label="save"
        disabled={saving}
        onClick={() => void save()}
        className="grid size-7 shrink-0 place-items-center rounded-full bg-[#2E9E6B] text-white transition active:scale-90 disabled:opacity-50"
      >
        <Check className="size-4" />
      </button>
      <button
        aria-label="cancel"
        onClick={() => setEditing(false)}
        className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-foreground/60 transition active:scale-90"
      >
        <X className="size-4" />
      </button>
      {product.oldPrice ? (
        <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
          <span className="line-through">{fmtPrice(product.oldPrice, t)}</span>
          {pct > 0 && <span className="text-[#EA580C]">-{pct}%</span>}
        </span>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Price block                                                         */
/* ------------------------------------------------------------------ */
function Price({ product, t, big = false }: { product: Product; t: (k: DictKey) => string; big?: boolean }) {
  const isMedicine = product.category === "medicines";
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`font-heading font-black text-[#184C8A] tracking-tight ${big ? "text-xl" : "text-lg"}`}>
        {fmtPrice(product.price, t)}
      </span>
      {!isMedicine && product.oldPrice && (
        <span className="text-xs font-semibold text-muted-foreground line-through opacity-70">
          {fmtPrice(product.oldPrice, t)}
        </span>
      )}
    </div>
  );
}

function RxNote({ product, t }: { product: Product; t: (k: DictKey) => string }) {
  if (!product.rx) return null;
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-bold text-[#D97706] ring-1 ring-[#F59E0B]/20">
      <FileWarning className="size-3" />
      {t("product.rx")}
    </span>
  );
}

/* ================================================================== */
/* COZY card — vertical, pure 4 elements: photo, name+form, price, CTA */
/* ================================================================== */
/* زرار «طلب» صغير جنب «غير متوفر» — بيفتح طلب ناقص معبّأ باسم الصنف */
export function ShortageAskButton({ product, className = "" }: { product: Product; className?: string }) {
  const lang = useBahbah((s) => s.lang);
  const setShortageOpen = useBahbah((s) => s.setShortageOpen);
  return (
    <Button
      onClick={() =>
        setShortageOpen(true, {
          itemName: lang === "ar" ? product.nameAr : product.nameEn,
          source: "product",
        })
      }
      className={`rounded-full bg-[#B45E0A] font-black text-white hover:bg-[#9A5008] ${className}`}
    >
      {lang === "ar" ? "طلب" : "Request"}
    </Button>
  );
}

function CozyCard({ product }: { product: Product }) {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const openProduct = useBahbah((s) => s.openProduct);
  const inCartQty = useBahbah((s) => s.cart.find((c) => c.productId === product.id)?.qty ?? 0);
  const addToCart = useBahbah((s) => s.addToCart);
  const setQty = useBahbah((s) => s.setQty);
  const name = lang === "ar" ? product.nameAr : product.nameEn;
  const form = lang === "ar" ? (product.formAr || product.ingredientAr) : (product.formEn || product.ingredientEn);

  return (
    <div className="bb-card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs transition-all duration-200 hover:border-[#184C8A]/40 hover:shadow-md">
      {/* 1. صورة الدواء واضحة بدون تشويش */}
      <button
        className="w-full text-start focus:outline-hidden"
        onClick={() => openProduct(product.id)}
        aria-label={name}
      >
        <div className="relative w-full overflow-hidden">
          <ProductVisual product={product} size="md" />
        </div>
      </button>

      {/* المحتوى الداخلي: اسم وتركيز + سعر + زر طلب */}
      <div className="flex flex-1 flex-col justify-between p-3.5 pt-2.5">
        <button
          className="text-start focus:outline-hidden"
          onClick={() => openProduct(product.id)}
        >
          {/* 2. اسم الدواء وتركيزه */}
          <h3 className="line-clamp-2 min-h-[40px] font-heading text-[14px] font-black leading-snug text-foreground transition-colors group-hover:text-[#184C8A]">
            {name}
          </h3>
          <p className="mt-1 line-clamp-1 text-[11.5px] font-medium text-muted-foreground/80">
            {form}
          </p>
        </button>

        {/* 3. السعر */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-heading text-base font-black text-[#184C8A]">
            {fmtPrice(product.price, t)}
          </span>
          {product.category !== "medicines" && product.oldPrice && (
            <span className="text-[11px] font-semibold text-muted-foreground/70 line-through">
              {fmtPrice(product.oldPrice, t)}
            </span>
          )}
          <QuickPriceEdit product={product} />
        </div>

        {/* 4. زر طلب سلس ومريح */}
        <div className="mt-3">
          {product.stock <= 0 ? (
            <div className="flex gap-2">
              <Button
                disabled
                variant="secondary"
                className="h-9 flex-1 rounded-full text-xs font-bold opacity-60"
              >
                {t("product.out")}
              </Button>
              <ShortageAskButton product={product} className="h-9 px-4 text-xs" />
            </div>
          ) : inCartQty > 0 ? (
            <div className="flex h-9 w-full items-center justify-between rounded-full border-2 border-[#184C8A] bg-white px-1.5 shadow-xs">
              <button
                aria-label="minus"
                onClick={() => setQty(product.id, inCartQty - 1)}
                className="grid size-7 place-items-center rounded-full text-[#184C8A] transition hover:bg-[#184C8A]/10 active:scale-90"
              >
                <IconMinus className="size-3.5" />
              </button>
              <span className="font-heading text-sm font-black text-[#0B1E38]">{inCartQty}</span>
              <button
                aria-label="plus"
                onClick={() => setQty(product.id, inCartQty + 1)}
                className="grid size-7 place-items-center rounded-full bg-[#184C8A] text-white transition hover:bg-[#113665] active:scale-90 shadow-xs"
              >
                <IconPlus className="size-3.5" />
              </button>
            </div>
          ) : (
            <Button
              onClick={() => {
                addToCart(product.id);
                toast.success(t("product.added"));
              }}
              className="h-9 w-full gap-1.5 rounded-full bg-gradient-to-r from-[#184C8A] to-[#113665] text-xs font-black text-white shadow-xs transition-all hover:brightness-105 active:scale-95"
            >
              <IconCartBagDuo className="size-3.5" />
              <span>{t("product.addToCart")}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* LIST row — horizontal, pure 4 elements                             */
/* ================================================================== */
function ListCard({ product }: { product: Product }) {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const openProduct = useBahbah((s) => s.openProduct);
  const inCartQty = useBahbah((s) => s.cart.find((c) => c.productId === product.id)?.qty ?? 0);
  const addToCart = useBahbah((s) => s.addToCart);
  const setQty = useBahbah((s) => s.setQty);
  const name = lang === "ar" ? product.nameAr : product.nameEn;
  const form = lang === "ar" ? (product.formAr || product.ingredientAr) : (product.formEn || product.ingredientEn);

  return (
    <div className="bb-card-hover group relative flex overflow-hidden rounded-2xl border border-border/70 bg-card p-3 shadow-xs transition-all hover:border-[#184C8A]/30">
      {/* 1. صورة الدواء */}
      <button
        className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl md:h-32 md:w-32"
        onClick={() => openProduct(product.id)}
        aria-label={name}
      >
        <ProductVisual product={product} size="sm" />
      </button>

      {/* 2. اسم الدواء وتركيزه + 3. السعر + 4. زر الطلب */}
      <div className="flex flex-1 flex-col justify-between ps-3 pe-1">
        <button className="text-start" onClick={() => openProduct(product.id)}>
          <h3 className="line-clamp-2 font-heading text-[14px] font-black leading-snug text-foreground transition-colors group-hover:text-[#184C8A] md:text-base">
            {name}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground/80">
            {form}
          </p>
        </button>

        <div className="mt-2 flex items-center justify-between gap-3 pt-1">
          {/* السعر */}
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-base font-black text-[#184C8A]">
              {fmtPrice(product.price, t)}
            </span>
            {product.category !== "medicines" && product.oldPrice && (
              <span className="text-[11px] font-semibold text-muted-foreground/70 line-through">
                {fmtPrice(product.oldPrice, t)}
              </span>
            )}
            <QuickPriceEdit product={product} />
          </div>

          {/* زر الطلب */}
          {product.stock <= 0 ? (
            <div className="flex items-center gap-2">
              <Button disabled variant="secondary" className="h-8.5 rounded-full px-4 text-xs font-bold opacity-60">
                {t("product.out")}
              </Button>
              <ShortageAskButton product={product} className="h-8.5 px-3.5 text-xs" />
            </div>
          ) : inCartQty > 0 ? (
            <div className="flex h-8.5 w-28 items-center justify-between rounded-full border-2 border-[#184C8A] bg-white px-1.5 shadow-xs">
              <button
                aria-label="minus"
                onClick={() => setQty(product.id, inCartQty - 1)}
                className="grid size-6.5 place-items-center rounded-full text-[#184C8A] hover:bg-[#184C8A]/10 active:scale-90"
              >
                <IconMinus className="size-3" />
              </button>
              <span className="font-heading text-xs font-black text-[#0B1E38]">{inCartQty}</span>
              <button
                aria-label="plus"
                onClick={() => setQty(product.id, inCartQty + 1)}
                className="grid size-6.5 place-items-center rounded-full bg-[#184C8A] text-white active:scale-90 shadow-xs"
              >
                <IconPlus className="size-3" />
              </button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                addToCart(product.id);
                toast.success(t("product.added"));
              }}
              className="h-8.5 gap-1.5 rounded-full bg-gradient-to-r from-[#184C8A] to-[#113665] px-4 text-xs font-black text-white shadow-xs transition hover:brightness-105 active:scale-95"
            >
              <IconCartBagDuo className="size-3.5" />
              <span>{t("product.addToCart")}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* COMPACT tile — dense scanning, one-tap add                          */
/* ================================================================== */
function CompactCard({ product }: { product: Product }) {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const openProduct = useBahbah((s) => s.openProduct);
  const inCartQty = useBahbah((s) => s.cart.find((c) => c.productId === product.id)?.qty ?? 0);
  const addToCart = useBahbah((s) => s.addToCart);
  const setQty = useBahbah((s) => s.setQty);
  const name = lang === "ar" ? product.nameAr : product.nameEn;
  const pct = discountPct(product);
  const cat = catOf(product.category);
  const Icon = product.icon;

  return (
    <div className="bb-card-hover group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs hover:border-[#184C8A]/30">
      <button className="text-start" onClick={() => openProduct(product.id)}>
        <div className={`${cat.tint} relative h-24 overflow-hidden`}>
          <div className="absolute -top-4 -end-4 size-14 rounded-full bg-white/50" />
          {pct > 0 && (
            <Badge className="absolute top-1.5 start-1.5 rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] px-2 text-[10px] font-black text-white shadow-xs">
              <span dir="ltr">-{pct}%</span>
            </Badge>
          )}
          <div className="flex h-full items-center justify-center">
            <div className="grid size-14 place-items-center rounded-full bg-white shadow-xs ring-1 ring-black/5">
              <Icon className={`size-7 ${cat.color}`} strokeWidth={1.6} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 p-2.5 pb-1">
          <h3 className="line-clamp-2 min-h-8 text-xs font-bold leading-tight text-foreground transition-colors group-hover:text-[#184C8A]">{name}</h3>
          <span className="font-heading text-sm font-black text-[#184C8A]">
            {fmtPrice(product.price, t)}
          </span>
        </div>
      </button>

      <div className="flex items-center justify-between px-2.5 pb-2.5">
        <StockLine stock={product.stock} t={t} />
        {product.stock > 0 &&
          (inCartQty > 0 ? (
            <div className="flex h-6.5 items-center gap-0.5 rounded-full border-2 border-[#184C8A] px-0.5 bg-white shadow-xs">
              <button
                aria-label="minus"
                onClick={() => setQty(product.id, inCartQty - 1)}
                className="grid size-5 place-items-center rounded-full text-[#184C8A] hover:bg-[#184C8A]/10 active:scale-90"
              >
                <IconMinus className="size-3" />
              </button>
              <span className="min-w-4 text-center text-[11px] font-black text-[#0B1E38]">{inCartQty}</span>
              <button
                aria-label="plus"
                onClick={() => setQty(product.id, inCartQty + 1)}
                className="grid size-5 place-items-center rounded-full bg-[#184C8A] text-white active:scale-90 shadow-xs"
              >
                <IconPlus className="size-3" />
              </button>
            </div>
          ) : (
            <button
              aria-label="add"
              onClick={() => {
                addToCart(product.id);
                toast.success(t("product.added"));
              }}
              className="grid size-7 place-items-center rounded-full bg-gradient-to-r from-[#184C8A] to-[#113665] text-white shadow-sm transition hover:scale-110 active:scale-90"
            >
              <IconPlus className="size-4" />
            </button>
          ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Public ProductCard — picks the variant                              */
/* ================================================================== */
export function ProductCard({ product, view = "cozy" }: { product: Product; view?: CardView }) {
  if (view === "list") return <ListCard product={product} />;
  if (view === "compact") return <CompactCard product={product} />;
  return <CozyCard product={product} />;
}

export function SectionHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-heading text-2xl font-black text-foreground md:text-3xl">{title}</h2>
        {sub && <p className="mt-1 text-sm text-muted-foreground md:text-base">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function BahbahLogo({ size = 40 }: { size?: number }) {
  return (
    <div className="relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white p-1 shadow-md ring-2 ring-white/60">
      <Image
        src="/images/bahbah-badge.png"
        alt="Bahbah Pharmacy logo"
        width={size}
        height={size}
        className="rounded-full object-contain"
        priority
      />
    </div>
  );
}
