"use client";

function normAr(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .trim();
}

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  brands,
  categories,
  discountPct,
  products,
  type Product,
} from "@/lib/bahbah/data";
import {
  useBahbah,
  useT,
  MAX_PRICE,
  type CatalogView,
  type SortKey,
} from "@/lib/bahbah/store";
import { ProductCard } from "./product-card";
import {
  IconSearchGlass,
  IconSearchOff,
  IconViewCozy,
  IconViewList,
  IconViewCompact,
  IconSort,
  IconArrowUp,
  IconArrowDown,
  IconFunnel,
  IconXMark,
  IconCheck,
  IconTag,
  IconPercent,
  IconMedal,
  IconSparkles,
  IconClock,
  IconRefresh,
} from "./icons";

/* ------------------------------------------------------------------ */
/* Sort model                                                          */
/* ------------------------------------------------------------------ */
const SORT_ITEMS: { key: SortKey; icon: React.ComponentType<{ className?: string }>; dirSensitive: boolean }[] = [
  { key: "pop", icon: IconSparkles, dirSensitive: false },
  { key: "best", icon: IconMedal, dirSensitive: true },
  { key: "rating", icon: IconTag, dirSensitive: true },
  { key: "discount", icon: IconPercent, dirSensitive: true },
  { key: "newest", icon: IconClock, dirSensitive: true },
  { key: "price", icon: IconSort, dirSensitive: true },
];

function sortLabel(key: SortKey, dir: 1 | -1, lang: "ar" | "en") {
  const ar = lang === "ar";
  switch (key) {
    case "pop":
      return ar ? "الأكثر شعبية" : "Most popular";
    case "best":
      return dir === 1 ? (ar ? "الأكثر مبيعًا" : "Best selling") : ar ? "الأقل مبيعًا" : "Least selling";
    case "rating":
      return dir === 1 ? (ar ? "الأعلى تقييمًا" : "Top rated") : ar ? "الأدنى تقييمًا" : "Lowest rated";
    case "discount":
      return dir === 1 ? (ar ? "أعلى خصم" : "Biggest discount") : ar ? "أقل خصم" : "Smallest discount";
    case "newest":
      return dir === 1 ? (ar ? "وصل حديثًا" : "Newest arrivals") : ar ? "الأقدم أولًا" : "Oldest first";
    case "price":
      return dir === 1
        ? ar
          ? "السعر: من الأقل للأعلى"
          : "Price: low to high"
        : ar
          ? "السعر: من الأعلى للأقل"
          : "Price: high to low";
  }
}

function applySort(list: Product[], key: SortKey, dir: 1 | -1): Product[] {
  const s = [...list];
  const flip = (v: number) => v * dir;
  switch (key) {
    case "pop":
      return s.sort((a, b) => flip(b.reviews - a.reviews));
    case "rating":
      return s.sort((a, b) => flip(b.rating - a.rating) || b.reviews - a.reviews);
    case "price":
      return s.sort((a, b) => flip(a.price - b.price));
    case "discount":
      return s.sort((a, b) => flip(discountPct(b) - discountPct(a)));
    case "newest":
      return s.sort(
        (a, b) =>
          flip((b.tags.includes("new") ? 1 : 0) - (a.tags.includes("new") ? 1 : 0)) ||
          flip(b.id.localeCompare(a.id))
      );
    case "best":
      return s.sort(
        (a, b) =>
          flip((b.tags.includes("best") ? 1 : 0) - (a.tags.includes("best") ? 1 : 0)) ||
          flip(b.reviews - a.reviews)
      );
  }
}

/* ------------------------------------------------------------------ */
/* View switcher — cozy / list / compact                               */
/* ------------------------------------------------------------------ */
function ViewSwitcher() {
  const t = useT();
  const view = useBahbah((s) => s.catalogView);
  const setView = useBahbah((s) => s.setCatalogView);

  const modes: { key: CatalogView; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { key: "cozy", icon: IconViewCozy, label: t("view.cozy") },
    { key: "list", icon: IconViewList, label: t("view.list") },
    { key: "compact", icon: IconViewCompact, label: t("view.compact") },
  ];

  return (
    <div className="flex h-11 items-center gap-0.5 rounded-xl border border-border bg-muted/60 p-1">
      {modes.map((m) => (
        <button
          key={m.key}
          title={m.label}
          aria-label={m.label}
          onClick={() => setView(m.key)}
          className={`grid size-8 place-items-center rounded-lg transition ${
            view === m.key
              ? "bg-[#184C8A] text-white shadow-sm shadow-[#184C8A]/20"
              : "text-foreground/60 hover:bg-white hover:text-[#184C8A]"
          }`}
        >
          <m.icon className="size-4.5" />
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sort menu with direction flip                                       */
/* ------------------------------------------------------------------ */
function SortControl({ lang }: { lang: "ar" | "en" }) {
  const t = useT();
  const key = useBahbah((s) => s.sortKey);
  const dir = useBahbah((s) => s.sortDir);
  const setSort = useBahbah((s) => s.setSort);
  const flip = useBahbah((s) => s.flipSortDir);
  const active = SORT_ITEMS.find((s) => s.key === key)!;

  return (
    <div className="flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-11 gap-2 rounded-xl border-border/80 bg-card px-3.5 font-bold text-foreground/80 hover:text-[#184C8A]"
          >
            <active.icon className="size-4.5 text-[#184C8A]" />
            <span className="hidden md:inline">{sortLabel(key, dir, lang)}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 bb-card-shadow-lg">
          <DropdownMenuLabel className="px-2 pb-1 text-xs font-bold text-muted-foreground">
            {t("sort.label")}
          </DropdownMenuLabel>
          {SORT_ITEMS.map((it) => (
            <DropdownMenuItem
              key={it.key}
              onClick={() => setSort(it.key, it.dirSensitive ? (it.key === key ? dir : 1) : 1)}
              className={`gap-2.5 rounded-xl px-2.5 py-2.5 text-sm font-bold ${
                key === it.key ? "bg-[#184C8A]/10 text-[#184C8A]" : ""
              }`}
            >
              <it.icon className="size-4.5 opacity-80" />
              <span className="flex-1">{sortLabel(it.key, dir, lang)}</span>
              {key === it.key && <IconCheck className="size-4 text-[#184C8A]" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {active.dirSensitive && (
        <button
          onClick={flip}
          title={lang === "ar" ? "عكس اتجاه الترتيب" : "Flip sort direction"}
          className="grid size-11 place-items-center rounded-xl border border-border/80 bg-card text-[#184C8A] transition hover:border-[#184C8A]/40"
        >
          {dir === 1 ? <IconArrowUp className="size-4.5" /> : <IconArrowDown className="size-4.5" />}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filter panel — shared between desktop sidebar & mobile sheet        */
/* ------------------------------------------------------------------ */
function FilterPanel({ lang }: { lang: "ar" | "en" }) {
  const t = useT();
  const filters = useBahbah((s) => s.filters);
  const setFilters = useBahbah((s) => s.setFilters);
  const resetFilters = useBahbah((s) => s.resetFilters);
  const catalogCategory = useBahbah((s) => s.catalogCategory);
  const setCatalogCategory = (c: string | null) => useBahbah.setState({ catalogCategory: c });

  const ar = lang === "ar";
  const toggleBrand = (id: string) =>
    setFilters({
      brands: filters.brands.includes(id)
        ? filters.brands.filter((b) => b !== id)
        : [...filters.brands, id],
    });

  const toggles: { key: "offersOnly" | "noRx" | "inStock" | "newOnly"; label: string }[] = [
    { key: "offersOnly", label: t("filter.offersOnly") },
    { key: "noRx", label: t("filter.noRx") },
    { key: "inStock", label: t("filter.inStock") },
    { key: "newOnly", label: t("filter.newOnly") },
  ];

  const ratingPills = [
    { v: 0, label: t("filter.anyRating") },
    { v: 3, label: "3+" },
    { v: 4, label: "4+" },
    { v: 4.5, label: "4.5+" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* categories */}
      <div>
        <h4 className="mb-2.5 font-heading text-sm font-black">{t("cat.title")}</h4>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setCatalogCategory(null)}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${
              !catalogCategory ? "bg-[#184C8A]/10 text-[#184C8A]" : "text-foreground/70 hover:bg-muted"
            }`}
          >
            {t("misc.all")}
            {!catalogCategory && <IconCheck className="ms-auto size-4" />}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCatalogCategory(c.id)}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold transition ${
                catalogCategory === c.id
                  ? "bg-[#184C8A]/10 text-[#184C8A]"
                  : "text-foreground/70 hover:bg-muted"
              }`}
            >
              <c.icon className="size-4.5" />
              {ar ? c.nameAr : c.nameEn}
              {catalogCategory === c.id && <IconCheck className="ms-auto size-4" />}
            </button>
          ))}
        </div>
      </div>

      {/* max price */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-heading text-sm font-black">{t("filter.price")}</h4>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-foreground/70">
            {filters.maxPrice >= MAX_PRICE
              ? t("filter.anyPrice")
              : `≤ ${filters.maxPrice} ${t("misc.egp")}`}
          </span>
        </div>
        <Slider
          value={[filters.maxPrice]}
          min={25}
          max={MAX_PRICE}
          step={25}
          onValueChange={([v]) => setFilters({ maxPrice: v })}
          className="py-1"
        />
      </div>

      {/* rating */}
      <div>
        <h4 className="mb-2.5 font-heading text-sm font-black">{t("filter.rating")}</h4>
        <div className="flex flex-wrap gap-1.5">
          {ratingPills.map((p) => (
            <button
              key={p.v}
              onClick={() => setFilters({ minRating: p.v })}
              className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                filters.minRating === p.v
                  ? "border-[#F59E0B] bg-gradient-to-r from-[#EA580C] to-[#F59E0B] text-white shadow-sm shadow-[#F59E0B]/20"
                  : "border-border/80 bg-card text-foreground/70 hover:border-[#F59E0B]/50"
              }`}
            >
              {p.v > 0 && <IconTag className="size-3.5" />}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* brands */}
      <div>
        <h4 className="mb-2.5 font-heading text-sm font-black">{t("filter.brands")}</h4>
        <ScrollArea className="h-44 rounded-xl border border-border/70 pe-2">
          <div className="flex flex-col gap-0.5 p-1">
            {brands.map((b) => (
              <label
                key={b.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-foreground/80 transition hover:bg-muted"
              >
                <Checkbox
                  checked={filters.brands.includes(b.id)}
                  onCheckedChange={() => toggleBrand(b.id)}
                  className="data-[state=checked]:border-[#184C8A] data-[state=checked]:bg-[#184C8A]"
                />
                {ar ? b.nameAr : b.nameEn}
              </label>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* quick toggles */}
      <div className="flex flex-col gap-1">
        <h4 className="mb-2.5 font-heading text-sm font-black">{t("filter.title")}</h4>
        {toggles.map((tg) => (
          <label
            key={tg.key}
            className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-foreground/80 transition hover:bg-muted"
          >
            {tg.label}
            <Switch
              checked={filters[tg.key]}
              onCheckedChange={(v) => setFilters({ [tg.key]: v })}
              className="data-[state=checked]:bg-[#184C8A]"
            />
          </label>
        ))}
      </div>

      <Button
        variant="outline"
        className="rounded-full border-[#DC4B4B]/40 font-bold text-[#DC4B4B] hover:bg-[#DC4B4B]/10 hover:text-[#DC4B4B]"
        onClick={resetFilters}
      >
        <IconRefresh className="size-4" />
        {t("filter.reset")}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Active filter chips                                                 */
/* ------------------------------------------------------------------ */
function ActiveChips({ lang }: { lang: "ar" | "en" }) {
  const t = useT();
  const filters = useBahbah((s) => s.filters);
  const setFilters = useBahbah((s) => s.setFilters);
  const resetFilters = useBahbah((s) => s.resetFilters);
  const catalogCategory = useBahbah((s) => s.catalogCategory);
  const setCatalogCategory = (c: string | null) => useBahbah.setState({ catalogCategory: c });
  const ar = lang === "ar";

  const chips: { label: string; clear: () => void }[] = [];
  if (catalogCategory) {
    const c = categories.find((x) => x.id === catalogCategory)!;
    chips.push({ label: ar ? c.nameAr : c.nameEn, clear: () => setCatalogCategory(null) });
  }
  if (filters.maxPrice < MAX_PRICE)
    chips.push({
      label: `≤ ${filters.maxPrice} ${t("misc.egp")}`,
      clear: () => setFilters({ maxPrice: MAX_PRICE }),
    });
  if (filters.minRating > 0)
    chips.push({ label: `${filters.minRating}+ ★`, clear: () => setFilters({ minRating: 0 }) });
  filters.brands.forEach((b) => {
    const brand = brands.find((x) => x.id === b);
    chips.push({
      label: ar ? brand?.nameAr ?? b : brand?.nameEn ?? b,
      clear: () => setFilters({ brands: filters.brands.filter((x) => x !== b) }),
    });
  });
  if (filters.offersOnly)
    chips.push({ label: t("filter.offersOnly"), clear: () => setFilters({ offersOnly: false }) });
  if (filters.noRx) chips.push({ label: t("filter.noRx"), clear: () => setFilters({ noRx: false }) });
  if (filters.inStock)
    chips.push({ label: t("filter.inStock"), clear: () => setFilters({ inStock: false }) });
  if (filters.newOnly)
    chips.push({ label: t("filter.newOnly"), clear: () => setFilters({ newOnly: false }) });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-bold text-muted-foreground">{t("filter.active")}:</span>
      {chips.map((c, i) => (
        <button
          key={i}
          onClick={c.clear}
          className="flex items-center gap-1.5 rounded-full border border-[#184C8A]/25 bg-[#184C8A]/5 px-3 py-1 text-xs font-bold text-[#184C8A] transition hover:bg-[#184C8A]/10"
        >
          {c.label}
          <IconXMark className="size-3" />
        </button>
      ))}
      <button
        onClick={resetFilters}
        className="rounded-full px-2.5 py-1 text-xs font-bold text-[#DC4B4B] hover:bg-[#DC4B4B]/10"
      >
        {t("filter.reset")}
      </button>
    </div>
  );
}

/* ================================================================== */
/* Catalog view                                                        */
/* ================================================================== */
export default function CatalogView() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const catalogCategory = useBahbah((s) => s.catalogCategory);
  const setCatalogCategory = (c: string | null) => useBahbah.setState({ catalogCategory: c });
  const openCatalog = useBahbah((s) => s.openCatalog);
  const view = useBahbah((s) => s.catalogView);
  const sortKey = useBahbah((s) => s.sortKey);
  const sortDir = useBahbah((s) => s.sortDir);
  const filters = useBahbah((s) => s.filters);

  const [q, setQ] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [visible, setVisible] = useState(24);
  const [selectedForm, setSelectedForm] = useState("all");

  const filtered = useMemo(() => {
    let list: Product[] = [...products];
    const query = q.trim();
    if (query) {
      const nq = normAr(query);
      const lq = query.toLowerCase();
      list = list.filter((p) => {
        const fullAr = normAr([p.nameAr, p.ingredientAr, p.brandAr, p.formAr].join(" "));
        const fullEn = [p.nameEn, p.ingredientEn, p.brandEn, p.formEn].join(" ").toLowerCase();
        return fullAr.includes(nq) || fullEn.includes(lq);
      });
    }
    if (selectedForm !== "all") {
      list = list.filter((p) => (p.formAr || "").includes(selectedForm) || (p.nameAr || "").includes(selectedForm));
    }
    if (catalogCategory) list = list.filter((p) => p.category === catalogCategory);
    if (filters.maxPrice < MAX_PRICE) list = list.filter((p) => p.price <= filters.maxPrice);
    if (filters.minRating > 0) list = list.filter((p) => p.rating >= filters.minRating);
    if (filters.brands.length) list = list.filter((p) => filters.brands.includes(p.brandEn));
    if (filters.offersOnly) list = list.filter((p) => p.oldPrice && discountPct(p) > 0);
    if (filters.noRx) list = list.filter((p) => !p.rx);
    if (filters.inStock) list = list.filter((p) => p.stock > 0);
    if (filters.newOnly) list = list.filter((p) => p.tags.includes("new"));
    return applySort(list, sortKey, sortDir);
  }, [q, catalogCategory, filters, sortKey, sortDir]);

  /* reset pagination when the query/sort/filter changes — render-phase
     state adjustment (React-documented pattern, avoids cascading effect) */
  const resetKey = `${q}|${selectedForm}|${catalogCategory ?? ""}|${sortKey}|${sortDir}|${JSON.stringify(filters)}`;
  const [lastReset, setLastReset] = useState(resetKey);
  if (lastReset !== resetKey) {
    setLastReset(resetKey);
    setVisible(24);
  }

  const shown = filtered.slice(0, visible);
  const activeCat = categories.find((c) => c.id === catalogCategory);
  const step = view === "list" ? 18 : view === "compact" ? 30 : 24;
  const gridCls =
    view === "list"
      ? "flex flex-col gap-3"
      : view === "compact"
        ? "grid grid-cols-3 gap-2.5 md:grid-cols-4 md:gap-3 xl:grid-cols-5"
        : "grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4";

  const hasResults = filtered.length > 0;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 md:px-6 md:pb-20 md:pt-8">
      {/* heading */}
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-black md:text-4xl">
          {activeCat ? (lang === "ar" ? activeCat.nameAr : activeCat.nameEn) : t("cat.all")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground md:text-base">{t("cat.sub")}</p>
      </div>

      {/* category chips */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        <button
          onClick={() => setCatalogCategory(null)}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
            !catalogCategory
              ? "border-[#184C8A] bg-gradient-to-r from-[#184C8A] to-[#0B1E38] text-white shadow-sm shadow-[#184C8A]/20"
              : "border-border/80 bg-card text-foreground/70 hover:border-[#184C8A]/40"
          }`}
        >
          {t("misc.all")}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCatalogCategory(c.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition ${
              catalogCategory === c.id
                ? "border-[#184C8A] bg-gradient-to-r from-[#184C8A] to-[#0B1E38] text-white shadow-sm shadow-[#184C8A]/20"
                : "border-border/80 bg-card text-foreground/70 hover:border-[#184C8A]/40"
            }`}
          >
            <c.icon className="size-4" />
            {lang === "ar" ? c.nameAr : c.nameEn}
          </button>
        ))}
      </div>

      {/* Quick Dosage Form Filter */}
      <div className="no-scrollbar -mx-4 mt-3 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        <span className="text-xs font-bold text-muted-foreground me-1">{lang === "ar" ? "الشكل الدوائي:" : "Dosage Form:"}</span>
        {[
          { key: "all", ar: "الكل", en: "All" },
          { key: "أقراص", ar: "أقراص / كبسول", en: "Tablets / Capsules" },
          { key: "شراب", ar: "شراب", en: "Syrup" },
          { key: "كريم", ar: "كريم / لوسيون", en: "Cream / Lotion" },
          { key: "بخاخ", ar: "بخاخ / نقط", en: "Spray / Drops" },
          { key: "أجهزة", ar: "أجهزة ومستلزمات", en: "Devices" },
        ].map((fItem) => (
          <button
            key={fItem.key}
            onClick={() => setSelectedForm(selectedForm === fItem.key ? "all" : fItem.key)}
            className={`rounded-full px-3.5 py-1 text-xs font-bold transition border ${
              selectedForm === fItem.key
                ? "border-[#184C8A] bg-[#184C8A] text-white shadow-sm shadow-[#184C8A]/20"
                : "border-border/80 bg-card text-foreground/75 hover:border-[#184C8A]/40"
            }`}
          >
            {lang === "ar" ? fItem.ar : fItem.en}
          </button>
        ))}
      </div>

      {/* control bar */}
      <div className="sticky top-[68px] z-30 mt-5 flex items-center gap-2 rounded-2xl border border-border/70 bg-background/90 p-2 shadow-sm backdrop-blur-md md:top-[76px]">
        <div className="relative min-w-0 flex-1">
          <IconSearchGlass className="absolute top-1/2 start-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
            className="h-9 rounded-xl bg-muted/50 ps-10"
          />
        </div>

        {/* mobile filter sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative h-9 gap-1.5 rounded-xl px-3 font-bold lg:hidden">
              <IconFunnel className="size-4 text-[#184C8A]" />
              <span className="hidden sm:inline">{t("filter.open")}</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[86dvh] overflow-y-auto rounded-t-3xl px-5 pb-8 pt-4"
          >
            <SheetHeader className="p-0 pb-4 text-start">
              <SheetTitle className="font-heading text-xl font-black">
                {t("filter.title")}
              </SheetTitle>
            </SheetHeader>
            <FilterPanel lang={lang} />
            <Button
              className="mt-5 h-12 w-full rounded-full text-base font-bold bg-gradient-to-r from-[#184C8A] to-[#0B1E38] text-white shadow-md shadow-[#184C8A]/20"
              onClick={() => setSheetOpen(false)}
            >
              {t("filter.apply")} ({filtered.length})
            </Button>
          </SheetContent>
        </Sheet>

        <SortControl lang={lang} />
        <div className="hidden sm:block">
          <ViewSwitcher />
        </div>
      </div>

      {/* view switcher inline for mobile */}
      <div className="mt-3 flex items-center justify-between sm:hidden">
        <span className="text-xs font-bold text-muted-foreground">{t("view.cozy")}</span>
        <ViewSwitcher />
      </div>

      {/* meta + chips */}
      <div className="mt-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-muted-foreground">
            {lang === "ar" ? `${filtered.length} منتج` : `${filtered.length} ${filtered.length === 1 ? "product" : "products"}`}
          </p>
          {hasResults && (
            <p className="text-xs font-semibold text-muted-foreground/70">
              {t("misc.showing")} {Math.min(visible, filtered.length)} {t("misc.of")} {filtered.length}
            </p>
          )}
        </div>
        <ActiveChips lang={lang} />
      </div>

      {/* content: desktop sidebar + grid */}
      <div className="mt-4 flex gap-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-[150px] max-h-[calc(100dvh-170px)] overflow-y-auto rounded-2xl border border-border/70 bg-card p-5 bb-card-shadow">
            <FilterPanel lang={lang} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {!hasResults ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <div className="grid size-20 place-items-center rounded-full bg-muted">
                <IconSearchOff className="size-9 text-muted-foreground" />
              </div>
              <p className="font-heading font-bold">{t("search.none")}</p>
              <Button
                variant="outline"
                className="rounded-full font-bold"
                onClick={() => {
                  setQ("");
                  openCatalog(null);
                  useBahbah.getState().resetFilters();
                }}
              >
                {t("filter.reset")}
              </Button>
            </div>
          ) : (
            <>
              <div className={gridCls}>
                {shown.map((p) => (
                  <ProductCard key={p.id} product={p} view={view} />
                ))}
              </div>

              {visible < filtered.length && (
                <div className="mt-8 flex flex-col items-center gap-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t("misc.showing")} {shown.length} {t("misc.of")} {filtered.length}
                  </p>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-full border-[#184C8A]/30 px-8 font-bold text-[#184C8A] hover:bg-[#184C8A]/5 shadow-sm"
                    onClick={() => setVisible((v) => v + step)}
                  >
                    {t("misc.loadMore")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
