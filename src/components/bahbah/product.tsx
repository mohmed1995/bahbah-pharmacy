"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  FileWarning,
  BadgeCheck,
  Truck,
  ShieldCheck,
  RotateCcw,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProduct, alternativesOf, byCategory, discountPct, WASLY } from "@/lib/bahbah/data";
import { useBahbah, useT, effStock } from "@/lib/bahbah/store";
import { fetchWarehouseForProduct, type DbWarehouseProduct } from "@/lib/supabase";
import { toast } from "sonner";
import { Rating, ProductVisual, ProductCard, SectionHead, fmtPrice, catOf } from "./product-card";
import { IconWhatsapp } from "./icons";

/* small static review pool per language */
const REVIEW_POOL = [
  { ar: "منتج أصلي والتغليف ممتاز، الشحن وصل في نفس اليوم. تعامل محترم جدًا.", en: "Original product, excellent packaging, same-day delivery. Very professional.", n: { ar: "أحمد م.", en: "Ahmed M." } },
  { ar: "بستخدمه من زمان والنتيجة ثابتة. السعر هنا أحسن من الصيدليات التانية.", en: "I've used it for a long time, consistent results. Better price than other pharmacies.", n: { ar: "نهى س.", en: "Noha S." } },
  { ar: "الخدمة سريعة والصيدلي ساعدني أختار البديل الأرخص بنفس المادة الفعالة.", en: "Fast service, the pharmacist helped me pick a cheaper alternative with the same ingredient.", n: { ar: "كريم ع.", en: "Karim A." } },
];

export default function ProductView() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const productId = useBahbah((s) => s.productId);
  const favorites = useBahbah((s) => s.favorites);
  const stockAdj = useBahbah((s) => s.stockAdj);
  const previousView = useBahbah((s) => s.previousView);
  const { go, addToCart, toggleFavorite, setCartOpen } = useBahbah();
  const user = useBahbah((s) => s.user);
  const createWhatsappOrder = useBahbah((s) => s.createWhatsappOrder);
  const setShortageOpen = useBahbah((s) => s.setShortageOpen);
  const [qty, setQty] = useState(1);
  const [waBusy, setWaBusy] = useState(false);
  const [warehouse, setWarehouse] = useState<DbWarehouseProduct | null>(null);

  const product = productId ? getProduct(productId) : undefined;

  /* توفر مخزن الصيدلية الحي (warehouse_products) — بيظهر بس لو في تطابق */
  useEffect(() => {
    let live = true;
    setWarehouse(null);
    if (product) {
      fetchWarehouseForProduct(product).then((r) => {
        if (live) setWarehouse(r);
      });
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  if (!product) {
    return (
      <main className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="font-heading text-xl font-bold">{t("search.none")}</p>
        <Button className="rounded-full px-8 font-bold" onClick={() => go("home")}>
          {t("nav.home")}
        </Button>
      </main>
    );
  }

  const name = lang === "ar" ? product.nameAr : product.nameEn;
  const brand = lang === "ar" ? product.brandAr : product.brandEn;
  const desc = lang === "ar" ? product.descAr : product.descEn;
  const warn = lang === "ar" ? product.warnAr : product.warnEn;
  const ing = lang === "ar" ? product.ingredientAr : product.ingredientEn;
  const form = lang === "ar" ? product.formAr : product.formEn;
  const cat = catOf(product.category);
  const alt = alternativesOf(product).slice(0, 4);
  const related = byCategory(product.category).filter((p) => p.id !== product.id).slice(0, 4);
  const isFav = favorites.includes(product.id);
  const pct = discountPct(product);

  const availableStock = effStock(product.id, stockAdj);
  const isOutOfStock = availableStock <= 0;

  const stockLabel =
    isOutOfStock ? t("product.out") : availableStock < 30 ? t("product.low") : t("product.inStock");
  const stockColor =
    isOutOfStock ? "text-[#DC2626] bg-[#DC2626]/10" : availableStock < 30 ? "text-[#D97706] bg-[#FFFBEB] ring-1 ring-[#F59E0B]/20" : "text-[#059669] bg-[#ECFDF5] ring-1 ring-[#10B981]/20";

  /* طلب سريع بواتساب: تسجيل في السيرفر بكود تتبع الأول، وبعدين فتح واتساب */
  const handleWhatsappOrder = async () => {
    if (waBusy) return;
    setWaBusy(true);
    const code = await createWhatsappOrder({
      items: [
        {
          productId: product.id,
          nameAr: product.nameAr,
          nameEn: product.nameEn,
          qty,
          price: product.price,
        },
      ],
      total: product.price * qty,
      phone: user?.phone,
      name: user?.name,
    });
    setWaBusy(false);
    if (!code) {
      toast.error(
        lang === "ar"
          ? "تعذر تسجيل الطلب السريع دلوقتي — حاول تاني أو كمل طلبك من السلة"
          : "Couldn't log the quick order — please retry or check out from the cart"
      );
      return;
    }
    const msg =
      lang === "ar"
        ? `السلام عليكم صيدلية بحبح، أود طلب:\n- ${name} × ${qty} — ${product.price * qty} ج.م\nكود الطلب السريع: ${code}`
        : `Hello Bahbah Pharmacy, I'd like to order:\n- ${name} x ${qty} — ${product.price * qty} EGP\nQuick order code: ${code}`;
    window.open(`https://wa.me/${WASLY.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <main className="pb-28 md:pb-16">
      <div className="mx-auto max-w-7xl px-4 pt-5 md:px-6 md:pt-8">
        {/* breadcrumb */}
        <button
          onClick={() => go(previousView && previousView !== "product" ? previousView : "catalog")}
          className="mb-4 flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:bg-[#184C8A] hover:text-white"
        >
          <ArrowRight className="size-4 rtl:inline ltr:hidden" />
          <ArrowLeft className="size-4 ltr:inline rtl:hidden" />
          {t("product.back")}
        </button>

        <div className="grid gap-6 md:grid-cols-2 md:gap-10">
          {/* visual */}
          <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
            <ProductVisual product={product} size="lg" />
            <div className="flex items-center justify-between px-5 py-4">
              <Badge className="rounded-full bg-[#EAF2FA] px-3 py-1 font-bold text-[#184C8A] hover:bg-[#EAF2FA]">
                {lang === "ar" ? cat.nameAr : cat.nameEn}
              </Badge>
              <button
                onClick={() => {
                  toggleFavorite(product.id);
                  toast.success(isFav ? t("product.favRemove") : t("product.favAdd"));
                }}
                className="grid size-10 place-items-center rounded-full border border-border bg-white shadow-xs transition hover:scale-105 active:scale-90"
                aria-label="favorite"
              >
                <Heart className={`size-4.5 ${isFav ? "fill-[#DC2626] text-[#DC2626]" : "text-foreground/50"}`} />
              </button>
            </div>
          </div>

          {/* info */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {pct > 0 && (
                <Badge className="rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] px-3 py-1 font-black text-white hover:brightness-105 ring-1 ring-white/20">
                  {t("offers.badge")} {pct}%
                </Badge>
              )}
              <Badge className={`rounded-full px-3 py-1 font-bold ${stockColor} border-0`}>
                {stockLabel}
              </Badge>
              {warehouse &&
                ((warehouse.stock_boxes ?? 0) > 0 ? (
                  <Badge className="rounded-full border-0 bg-[#EAF6F1] px-3 py-1 font-bold text-[#2E9E6B]">
                    {lang === "ar"
                      ? `في مخزن الصيدلية الآن: ${warehouse.stock_boxes} علبة`
                      : `In pharmacy warehouse: ${warehouse.stock_boxes} boxes`}
                  </Badge>
                ) : (
                  <>
                    <Badge className="rounded-full border-0 bg-[#FFF4E5] px-3 py-1 font-bold text-[#B45E0A]">
                      {lang === "ar" ? "غير متوفر في مخزن الصيدلية حالياً" : "Not in warehouse stock right now"}
                    </Badge>
                    <button
                      onClick={() =>
                        setShortageOpen(true, {
                          itemName: lang === "ar" ? product.nameAr : product.nameEn,
                          source: "product",
                        })
                      }
                      className="rounded-full bg-[#B45E0A] px-3 py-1 text-xs font-black text-white transition hover:bg-[#9A5008] active:scale-95"
                    >
                      {lang === "ar" ? "طلب" : "Request"}
                    </button>
                  </>
                ))}
              {product.rx && (
                <Badge variant="outline" className="rounded-full border-[#D97706]/40 bg-[#FFFBEB] font-bold text-[#D97706]">
                  <FileWarning className="me-1 size-3" />
                  {t("product.rx")}
                </Badge>
              )}
            </div>

            <h1 className="mt-3 font-heading text-3xl font-black leading-tight tracking-tight text-[#0B1E38] md:text-4xl">{name}</h1>
            <p className="mt-1.5 text-sm font-bold text-muted-foreground">{brand}</p>

            <div className="mt-3">
              <Rating value={product.rating} count={product.reviews} t={t} />
            </div>

            <div className="mt-5 flex items-baseline gap-3">
              <span className="font-heading text-4xl font-black text-[#184C8A]">
                {fmtPrice(product.price, t)}
              </span>
              {product.oldPrice && (
                <span className="text-lg text-muted-foreground line-through opacity-70">
                  {fmtPrice(product.oldPrice, t)}
                </span>
              )}
            </div>

            {/* specs */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <SpecBox label={t("product.ingredient")} value={ing} />
              <SpecBox label={t("product.form")} value={form} />
              <SpecBox label={t("product.brand")} value={brand} />
              <SpecBox
                label={t("product.otc") + " / " + t("product.rx")}
                value={product.rx ? t("product.rx") : t("product.otc")}
              />
            </div>

            {/* qty + add */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1.5 shadow-xs">
                <button
                  className="grid size-8 place-items-center rounded-full bg-muted transition hover:bg-[#EAF2FA] active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={isOutOfStock || qty <= 1}
                  aria-label="minus"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-8 text-center font-heading text-lg font-black text-[#0B1E38]">{isOutOfStock ? 0 : qty}</span>
                <button
                  className="grid size-8 place-items-center rounded-full bg-muted transition hover:bg-[#EAF2FA] active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => setQty(Math.min(availableStock, qty + 1))}
                  disabled={isOutOfStock || qty >= availableStock}
                  aria-label="plus"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <Button
                size="lg"
                disabled={isOutOfStock}
                className={`h-13 flex-1 rounded-full text-base font-black transition-all ${
                  isOutOfStock
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60 shadow-none hover:bg-muted"
                    : "bg-gradient-to-r from-[#184C8A] to-[#113665] text-white shadow-md shadow-[#184C8A]/25 hover:shadow-lg hover:shadow-[#184C8A]/35 active:scale-[0.98]"
                }`}
                onClick={() => {
                  if (isOutOfStock) {
                    toast.error(t("product.out"));
                    return;
                  }
                  addToCart(product.id, qty);
                  toast.success(t("product.added"));
                  setCartOpen(true);
                }}
              >
                <ShoppingCart className="size-5" />
                {isOutOfStock ? t("product.out") : t("product.addToCart")}
              </Button>
              <button
                onClick={handleWhatsappOrder}
                disabled={waBusy}
                className="bb-whatsapp-gradient flex h-13 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-black text-white shadow-md transition hover:scale-[1.03] active:scale-95 disabled:opacity-60"
                title={lang === "ar" ? "طلب سريع بواتساب — بكود تتبع" : "WhatsApp quick order — with tracking code"}
              >
                <IconWhatsapp className="size-5" />
                {lang === "ar" ? "طلب سريع بواتساب" : "WhatsApp quick order"}
              </button>
              {isOutOfStock && (
                <button
                  onClick={() =>
                    setShortageOpen(true, {
                      itemName: lang === "ar" ? product.nameAr : product.nameEn,
                      source: "product",
                    })
                  }
                  className="flex h-13 shrink-0 items-center justify-center gap-2 rounded-full bg-[#B45E0A] px-5 text-sm font-black text-white shadow-md transition hover:scale-[1.03] active:scale-95"
                  title={lang === "ar" ? "اطلب الصنف الناقص — هنرد عليك لما يتوفر" : "Request this missing item"}
                >
                  {lang === "ar" ? "طلب" : "Request"}
                </button>
              )}
            </div>

            {/* delivery perks */}
            <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-border/70 bg-muted/40 p-3 text-center">
              {[
                { icon: Truck, label: t("trust.ship") },
                { icon: ShieldCheck, label: t("trust.original") },
                { icon: RotateCcw, label: lang === "ar" ? "إرجاع خلال 14 يوم" : "14-day returns" },
              ].map((x) => (
                <div key={x.label} className="flex flex-col items-center gap-1.5">
                  <x.icon className="size-4.5 text-[#184C8A]" />
                  <span className="text-[10px] font-bold text-foreground/75 md:text-xs">{x.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* description + warnings */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <h3 className="font-heading text-lg font-black">{t("product.desc")}</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-foreground/80">{desc}</p>
          </div>
          {warn && (
            <div className="rounded-2xl border border-[#F09428]/30 bg-[#FFF4E5]/60 p-5">
              <h3 className="flex items-center gap-2 font-heading text-lg font-black text-[#B45E0A]">
                <FileWarning className="size-5" />
                {t("product.warn")}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#8a5410]">{warn}</p>
            </div>
          )}
        </div>

        {/* reviews */}
        <div className="mt-8">
          <SectionHead title={t("product.reviews")} />
          <div className="grid gap-3 md:grid-cols-3">
            {REVIEW_POOL.map((r, i) => (
              <div key={i} className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="size-4 fill-[#F09428] text-[#F09428]" />
                  ))}
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-foreground/80">
                  {lang === "ar" ? r.ar : r.en}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-full bg-[#EAF1F9] text-xs font-black text-[#1E4E8F]">
                    {(lang === "ar" ? r.n.ar : r.n.en).charAt(0)}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {lang === "ar" ? r.n.ar : r.n.en}
                  </span>
                  <BadgeCheck className="size-3.5 text-[#2E9E6B]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* alternatives */}
        {alt.length > 0 && (
          <div className="mt-10">
            <SectionHead
              title={t("product.alternatives")}
              sub={lang === "ar" ? "نفس الفعالية — اختار اللي يناسب ميزانيتك" : "Same category — pick what suits your budget"}
            />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {alt.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}

        {/* related */}
        {related.length > 0 && (
          <div className="mt-10">
            <SectionHead title={t("product.related")} />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* mobile sticky add-to-cart bar */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex flex-col leading-tight">
            <span className="font-heading text-lg font-black text-[#1E4E8F]">
              {fmtPrice(product.price * qty, t)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {qty} × {fmtPrice(product.price, t)}
            </span>
          </div>
          <Button
            className="h-12 flex-1 rounded-full text-base font-bold"
            onClick={() => {
              addToCart(product.id, qty);
              toast.success(t("product.added"));
              setCartOpen(true);
            }}
          >
            <ShoppingCart className="size-5" />
            {t("product.addToCart")}
          </Button>
        </div>
      </div>
    </main>
  );
}

function SpecBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/40 px-3.5 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-bold leading-snug">{value}</div>
    </div>
  );
}
