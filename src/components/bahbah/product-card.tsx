"use client";

import Image from "next/image";
import { BadgeCheck, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
/* Product visual — AI packshot when available, duotone icon fallback  */
/* ------------------------------------------------------------------ */
export function ProductVisual({ product, size = "md" }: { product: Product; size?: "md" | "lg" }) {
  const cat = catOf(product.category);
  const Icon = product.icon;
  const box = size === "lg" ? "size-36" : "size-20";

  if (product.img) {
    return (
      <div
        className={`relative w-full overflow-hidden rounded-t-2xl ${
          size === "lg" ? `${cat.tint} h-72 md:h-80` : "h-36 bg-gradient-to-b from-white to-[#F8FAFC] md:h-44"
        }`}
      >
        {size === "lg" && (
          <>
            <div className="absolute -top-12 -end-12 size-44 rounded-full bg-white/60 blur-xs" />
            <div className="absolute -bottom-14 -start-14 size-48 rounded-full bg-white/50 blur-xs" />
          </>
        )}
        <Image
          src={product.img}
          alt={product.nameEn}
          fill
          sizes={size === "lg" ? "(max-width:768px) 100vw, 560px" : "280px"}
          className={size === "lg" ? "object-contain p-4 md:p-6" : "object-contain p-2.5 transition-transform duration-300 group-hover:scale-105"}
        />
        {size !== "lg" && <div className="absolute inset-0 bg-gradient-to-t from-black/[0.03] to-transparent pointer-events-none" />}
      </div>
    );
  }

  return (
    <div
      className={`${cat.tint} relative flex w-full items-center justify-center overflow-hidden rounded-t-2xl ${
        size === "lg" ? "h-56" : "h-36"
      }`}
    >
      <div className="absolute -top-8 -end-8 size-28 rounded-full bg-white/50" />
      <div className="absolute -bottom-10 -start-10 size-32 rounded-full bg-white/40" />
      <div
        className={`${box} relative flex items-center justify-center rounded-full bg-white shadow-[0_6px_20px_-6px_rgba(11,30,56,0.18)] ring-1 ring-black/5`}
      >
        <Icon className={`${size === "lg" ? "size-16" : "size-10"} ${cat.color}`} strokeWidth={1.6} />
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
  return (
    <div className="absolute top-3 start-3 z-10 flex flex-col gap-1.5">
      {pct > 0 && (
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
/* Price block                                                         */
/* ------------------------------------------------------------------ */
function Price({ product, t, big = false }: { product: Product; t: (k: DictKey) => string; big?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`font-heading font-black text-[#184C8A] tracking-tight ${big ? "text-xl" : "text-lg"}`}>
        {fmtPrice(product.price, t)}
      </span>
      {product.oldPrice && (
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
        <div className="relative h-44 w-full overflow-hidden bg-gradient-to-b from-white to-[#F8FAFC]">
          {product.img ? (
            <Image
              src={product.img}
              alt={product.nameEn}
              fill
              sizes="(max-width:768px) 50vw, 260px"
              className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <ProductVisual product={product} />
          )}
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
          {product.oldPrice && (
            <span className="text-[11px] font-semibold text-muted-foreground/70 line-through">
              {fmtPrice(product.oldPrice, t)}
            </span>
          )}
        </div>

        {/* 4. زر طلب سلس ومريح */}
        <div className="mt-3">
          {product.stock <= 0 ? (
            <Button
              disabled
              variant="secondary"
              className="h-9 w-full rounded-full text-xs font-bold opacity-60"
            >
              {t("product.out")}
            </Button>
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
        className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-gradient-to-b from-white to-[#F8FAFC] md:h-32 md:w-32"
        onClick={() => openProduct(product.id)}
        aria-label={name}
      >
        {product.img ? (
          <Image
            src={product.img}
            alt={product.nameEn}
            fill
            sizes="130px"
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <ProductVisual product={product} />
        )}
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
            {product.oldPrice && (
              <span className="text-[11px] font-semibold text-muted-foreground/70 line-through">
                {fmtPrice(product.oldPrice, t)}
              </span>
            )}
          </div>

          {/* زر الطلب */}
          {product.stock <= 0 ? (
            <Button disabled variant="secondary" className="h-8.5 rounded-full px-4 text-xs font-bold opacity-60">
              {t("product.out")}
            </Button>
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
    <Image
      src="/images/bahbah-badge.png"
      alt="Bahbah Pharmacy logo"
      width={size}
      height={size}
      className="rounded-full"
      priority
    />
  );
}
