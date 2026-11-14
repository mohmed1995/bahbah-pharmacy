"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Eye,
  Package,
  ShoppingCart,
  Coins,
  Plus,
  Pencil,
  PackagePlus,
  AlertTriangle,
  XCircle,
  Layers,
  User,
  MapPin,
  Wallet,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  categories,
  driverById,
  adminOrders as adminDemoOrders,
  alternativesOf,
  type Order,
  type Product,
} from "@/lib/bahbah/data";
import { useBahbah, useT, useAdminProducts } from "@/lib/bahbah/store";
import { fmtPrice } from "./product-card";
import {
  AdminCard,
  SectionTitle,
  StatusBadge,
  ExpiryBadge,
  TableWrap,
  TH,
  TD,
  daysUntil,
  SortTh,
  nextSort,
  sortRows,
  type ColSort,
} from "./admin-ui";
import { toast } from "sonner";

/* ================================================================== */
/* ORDERS                                                              */
/* ================================================================== */
export function OrdersSection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const orders = useBahbah((s) => s.adminOrders);
  const { adminAdvance, adminCancel } = useBahbah();
  const list = orders ?? adminDemoOrders;

  const [filter, setFilter] = useState<"all" | Order["status"]>("all");
  const [q, setQ] = useState("");
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [sort, setSort] = useState<ColSort>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const rows = list.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!query) return true;
      return [o.id, o.customerAr, o.customerEn, o.phone, o.address]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
    return sortRows(rows, sort, (o) => {
      switch (sort?.key) {
        case "id":
          return o.id;
        case "customer":
          return lang === "ar" ? o.customerAr : o.customerEn;
        case "total":
          return o.total;
        default:
          return o.id;
      }
    });
  }, [list, filter, q, sort, lang]);

  const details = list.find((o) => o.id === detailsId);
  const detailsDriver = driverById(details?.delivery?.driverId);

  const filters: { key: "all" | Order["status"]; label: string; count: number }[] = [
    { key: "all", label: t("adm.allStatus"), count: list.length },
    { key: "pending", label: t("admin.stPending"), count: list.filter((o) => o.status === "pending").length },
    { key: "shipping", label: t("admin.stShipping"), count: list.filter((o) => o.status === "shipping").length },
    { key: "delivered", label: t("admin.stDelivered"), count: list.filter((o) => o.status === "delivered").length },
    { key: "cancelled", label: t("admin.stCancelled"), count: list.filter((o) => o.status === "cancelled").length },
  ];

  return (
    <div className="space-y-4">
      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="nice-scrollbar flex flex-1 gap-1.5 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition ${
                filter === f.key
                  ? "bg-[#1E4E8F] text-white"
                  : "bg-card text-foreground/70 hover:bg-muted"
              }`}
            >
              {f.label}
              <span className={`rounded-full px-1.5 text-[10px] ${filter === f.key ? "bg-white/20" : "bg-muted"}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("admin.searchPh")}
            className="h-10 rounded-full ps-10 text-sm"
          />
        </div>
      </div>

      <TableWrap>
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <SortTh label={t("admin.colOrder")} colKey="id" sort={sort} onSort={(k) => setSort(nextSort(sort, k))} />
              <SortTh label={t("admin.colCustomer")} colKey="customer" sort={sort} onSort={(k) => setSort(nextSort(sort, k))} />
              <th className={TH}>{t("adm.colZone")}</th>
              <th className={TH}>{t("adm.colDriver")}</th>
              <SortTh label={t("admin.colTotal")} colKey="total" sort={sort} onSort={(k) => setSort(nextSort(sort, k))} />
              <th className={TH}>{t("admin.colStatus")}</th>
              <th className={TH}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const driver = driverById(o.delivery?.driverId);
              return (
                <tr key={o.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className={TD}>
                    <div className="font-black text-[#1E4E8F]">{o.id}</div>
                    <div className="text-[11px] text-muted-foreground" dir="ltr">{o.date}</div>
                  </td>
                  <td className={TD}>
                    <div className="font-bold">{lang === "ar" ? o.customerAr : o.customerEn}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">{o.phone}</div>
                  </td>
                  <td className={TD}>
                    {o.delivery?.type === "pickup" ? (
                      <Badge className="gap-1 rounded-full border-0 bg-[#EAF6F1] text-[#2E9E6B]">
                        {t("dv.pickup")}
                      </Badge>
                    ) : (
                      <span className="text-xs font-bold text-foreground/75">
                        {o.delivery
                          ? (lang === "ar" ? o.delivery.zoneNameAr : o.delivery.zoneNameEn)
                          : "—"}
                      </span>
                    )}
                  </td>
                  <td className={TD}>
                    {driver ? (
                      <span className="text-xs font-bold">{lang === "ar" ? driver.nameAr : driver.nameEn}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={`${TD} font-bold`}>{fmtPrice(o.total, t)}</td>
                  <td className={TD}>
                    <StatusBadge status={o.status} t={t} />
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-8 rounded-full p-0 text-muted-foreground hover:text-[#1E4E8F]"
                        onClick={() => setDetailsId(o.id)}
                        aria-label={t("adm.details")}
                      >
                        <Eye className="size-4" />
                      </Button>
                      {o.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full px-3 text-xs font-bold"
                          onClick={() => {
                            adminAdvance(o.id);
                            toast.success(t("misc.saved"));
                          }}
                        >
                          {t("adm.startShip")}
                        </Button>
                      )}
                      {o.status === "shipping" && (
                        <Button
                          size="sm"
                          className="rounded-full bg-[#2E9E6B] px-3 text-xs font-bold hover:bg-[#278a5e]"
                          onClick={() => {
                            adminAdvance(o.id);
                            toast.success(t("misc.saved"));
                          }}
                        >
                          {t("adm.markDelivered")}
                        </Button>
                      )}
                      {(o.status === "pending" || o.status === "shipping") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full px-2.5 text-xs font-bold text-[#DC4B4B] hover:bg-[#DC4B4B]/10 hover:text-[#DC4B4B]"
                          onClick={() => {
                            adminCancel(o.id);
                            toast.success(t("misc.saved"));
                          }}
                        >
                          {t("adm.cancelOrder")}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {t("adm.noActive")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>

      {/* details dialog */}
      <Dialog open={!!details} onOpenChange={(v) => !v && setDetailsId(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-lg rounded-2xl p-0">
          {details && (
            <>
              <DialogHeader className="border-b border-border px-5 py-4">
                <DialogTitle className="flex items-center justify-between font-heading text-lg font-black">
                  <span>
                    {t("adm.details")} — <span className="text-[#1E4E8F]">{details.id}</span>
                  </span>
                  <StatusBadge status={details.status} t={t} />
                </DialogTitle>
              </DialogHeader>
              <div className="nice-scrollbar max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
                {/* items */}
                <div>
                  <p className="mb-2 text-xs font-bold text-muted-foreground">{t("adm.items")}</p>
                  <div className="space-y-1.5">
                    {details.items.map((it) => (
                      <div key={it.productId} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">
                          {lang === "ar" ? it.nameAr : it.nameEn}
                          <span className="text-muted-foreground"> × {it.qty}</span>
                        </span>
                        <span className="shrink-0 font-bold">{fmtPrice(it.price * it.qty, t)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* delivery meta */}
                <div className="grid gap-2.5 rounded-xl bg-muted/50 p-3.5 text-sm sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <User className="mt-0.5 size-4 text-[#1E4E8F]" />
                    <span>{lang === "ar" ? details.customerAr : details.customerEn}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Wallet className="mt-0.5 size-4 text-[#1E4E8F]" />
                    <span>
                      {details.payment === "cod"
                        ? t("checkout.cod")
                        : details.payment === "instapay"
                          ? t("checkout.instapay")
                          : t("checkout.card")}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 text-[#1E4E8F]" />
                    <span className="leading-snug">{details.address}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 size-4 text-[#1E4E8F]" />
                    <span>
                      {details.delivery
                        ? (lang === "ar" ? details.delivery.slotAr : details.delivery.slotEn)
                        : "—"}
                    </span>
                  </div>
                  {detailsDriver && (
                    <div className="flex items-start gap-2">
                      <ShoppingCart className="mt-0.5 size-4 text-[#1E4E8F]" />
                      <span>
                        {t("adm.colDriver")}: {lang === "ar" ? detailsDriver.nameAr : detailsDriver.nameEn}
                      </span>
                    </div>
                  )}
                  {details.delivery && details.delivery.fee !== undefined && (
                    <div className="flex items-start gap-2">
                      <Coins className="mt-0.5 size-4 text-[#1E4E8F]" />
                      <span>
                        {t("dv.fee")}: {details.delivery.fee === 0 ? t("dv.free") : fmtPrice(details.delivery.fee, t)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 font-heading text-base font-black">
                  <span>{t("account.total")}</span>
                  <span className="text-[#1E4E8F]">{fmtPrice(details.total, t)}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================================================================== */
/* PRODUCTS                                                            */
/* ================================================================== */
export function ProductsSection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const products = useAdminProducts();
  const { setPrice, restock, addAdminProduct } = useBahbah();

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [priceFor, setPriceFor] = useState<Product | null>(null);
  const [priceVal, setPriceVal] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [sort, setSort] = useState<ColSort>(null);

  /* add-product form */
  const [np, setNp] = useState({
    nameAr: "",
    nameEn: "",
    brand: "",
    price: "",
    stock: "",
    expiry: "",
    category: "medicines",
  });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const rows = products.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!query) return true;
      return [p.nameAr, p.nameEn, p.brandAr, p.brandEn, p.ingredientAr, p.ingredientEn]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
    return sortRows(rows, sort, (p) => {
      switch (sort?.key) {
        case "name":
          return lang === "ar" ? p.nameAr : p.nameEn;
        case "price":
          return p.price;
        case "stock":
          return p.stock;
        case "expiry":
          return p.expiry;
        default:
          return p.id;
      }
    });
  }, [products, q, cat, sort, lang]);

  const catName = (id: string) => {
    const c = categories.find((x) => x.id === id);
    return c ? (lang === "ar" ? c.nameAr : c.nameEn) : id;
  };

  const submitAdd = () => {
    if (!np.nameAr.trim() || !np.price.trim()) {
      toast.error(t("auth.invalid"));
      return;
    }
    const catObj = categories.find((c) => c.id === np.category)!;
    const product: Product = {
      id: `custom-${Date.now()}`,
      nameAr: np.nameAr.trim(),
      nameEn: np.nameEn.trim() || np.nameAr.trim(),
      brandAr: np.brand.trim() || "—",
      brandEn: np.brand.trim() || "—",
      category: np.category,
      price: Number(np.price) || 0,
      rating: 4.5,
      reviews: 0,
      ingredientAr: "—",
      ingredientEn: "—",
      formAr: "—",
      formEn: "—",
      rx: false,
      stock: Number(np.stock) || 0,
      expiry: np.expiry || "2028-01-01",
      descAr: np.nameAr.trim(),
      descEn: np.nameEn.trim() || np.nameAr.trim(),
      icon: catObj.icon,
      tags: ["new"],
    };
    addAdminProduct(product);
    setAddOpen(false);
    setNp({ nameAr: "", nameEn: "", brand: "", price: "", stock: "", expiry: "", category: "medicines" });
    toast.success(t("adm.added"));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="nice-scrollbar flex flex-1 gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setCat("all")}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition ${
              cat === "all" ? "bg-[#1E4E8F] text-white" : "bg-card text-foreground/70 hover:bg-muted"
            }`}
          >
            {t("misc.all")}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition ${
                cat === c.id ? "bg-[#1E4E8F] text-white" : "bg-card text-foreground/70 hover:bg-muted"
              }`}
            >
              {lang === "ar" ? c.nameAr : c.nameEn}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("admin.searchPh")}
            className="h-10 rounded-full ps-10 text-sm"
          />
        </div>
        <Button
          className="h-10 rounded-full bg-[#F09428] px-4 text-sm font-bold text-white hover:bg-[#d8821e]"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-4" />
          {t("adm.addProduct")}
        </Button>
      </div>

      <TableWrap>
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <SortTh label={t("admin.colProduct")} colKey="name" sort={sort} onSort={(k) => setSort(nextSort(sort, k))} />
              <th className={TH}>{t("admin.colCat")}</th>
              <SortTh label={t("admin.colPrice")} colKey="price" sort={sort} onSort={(k) => setSort(nextSort(sort, k))} />
              <SortTh label={t("admin.colStock")} colKey="stock" sort={sort} onSort={(k) => setSort(nextSort(sort, k))} />
              <SortTh label={t("admin.colExpiry")} colKey="expiry" sort={sort} onSort={(k) => setSort(nextSort(sort, k))} />
              <th className={TH}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const low = p.stock < 30;
              return (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className={TD}>
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
                        <p.icon className="size-4 text-[#1E4E8F]" />
                      </span>
                      <span className="font-bold">{lang === "ar" ? p.nameAr : p.nameEn}</span>
                      {p.rx && (
                        <Badge variant="outline" className="rounded-full border-[#B0713A]/40 text-[10px] text-[#B0713A]">
                          Rx
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className={`${TD} text-muted-foreground`}>{catName(p.category)}</td>
                  <td className={`${TD} font-bold`}>{fmtPrice(p.price, t)}</td>
                  <td className={TD}>
                    <div className="flex flex-col items-start gap-1">
                      <Badge className={`rounded-full border-0 ${low ? "bg-[#FFF4E5] text-[#B45E0A]" : "bg-[#EAF6F1] text-[#2E9E6B]"}`}>
                        {p.stock}
                      </Badge>
                      {/* shortage classification: متوفر / ناقص / له بدائل */}
                      {p.stock <= 10 ? (
                        <span className="flex flex-wrap items-center gap-1">
                          <Badge className="rounded-full border-0 bg-[#DC4B4B]/10 text-[10px] text-[#DC4B4B]">
                            {t("adm.stockLow")}
                          </Badge>
                          {alternativesOf(p).length > 0 && (
                            <Badge className="rounded-full border-0 bg-[#EAF1F9] text-[10px] text-[#1E4E8F]">
                              {t("adm.hasAlt")}
                            </Badge>
                          )}
                        </span>
                      ) : (
                        <Badge className="rounded-full border-0 bg-[#EAF6F1] text-[10px] text-[#2E9E6B]">
                          {t("adm.stockOk")}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground" dir="ltr">{p.expiry}</span>
                      <ExpiryBadge p={p} t={t} />
                    </div>
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full px-3 text-xs font-bold"
                        onClick={() => {
                          setPriceFor(p);
                          setPriceVal(String(p.price));
                        }}
                      >
                        <Pencil className="size-3.5" />
                        {t("adm.editPrice")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full bg-[#EAF1F9] px-3 text-xs font-bold text-[#1E4E8F] hover:bg-[#dbe7f5]"
                        onClick={() => {
                          restock(p.id, 50);
                          toast.success(t("misc.saved"));
                        }}
                      >
                        <PackagePlus className="size-3.5" />
                        {t("adm.restock")}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>

      {/* price dialog */}
      <Dialog open={!!priceFor} onOpenChange={(v) => !v && setPriceFor(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-black">{t("adm.editPrice")}</DialogTitle>
          </DialogHeader>
          {priceFor && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-muted-foreground">
                {lang === "ar" ? priceFor.nameAr : priceFor.nameEn}
              </p>
              <Input
                type="number"
                value={priceVal}
                onChange={(e) => setPriceVal(e.target.value)}
                className="h-12 rounded-xl text-base"
                dir="ltr"
              />
              <Button
                className="h-11 w-full rounded-full font-bold"
                onClick={() => {
                  const v = Number(priceVal);
                  if (!v || v <= 0) {
                    toast.error(t("auth.invalid"));
                    return;
                  }
                  setPrice(priceFor.id, v);
                  setPriceFor(null);
                  toast.success(t("misc.saved"));
                }}
              >
                {t("misc.save")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* add product dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-black">{t("adm.addProduct")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder={t("adm.np.name")} value={np.nameAr} onChange={(e) => setNp({ ...np, nameAr: e.target.value })} className="h-11 rounded-xl" />
            <Input placeholder={t("adm.np.nameEn")} value={np.nameEn} onChange={(e) => setNp({ ...np, nameEn: e.target.value })} className="h-11 rounded-xl" />
            <Input placeholder={t("adm.np.brand")} value={np.brand} onChange={(e) => setNp({ ...np, brand: e.target.value })} className="h-11 rounded-xl" />
            <select
              value={np.category}
              onChange={(e) => setNp({ ...np, category: e.target.value })}
              className="h-11 rounded-xl border border-input bg-transparent px-3 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === "ar" ? c.nameAr : c.nameEn}
                </option>
              ))}
            </select>
            <Input type="number" placeholder={t("adm.np.price")} value={np.price} onChange={(e) => setNp({ ...np, price: e.target.value })} className="h-11 rounded-xl" dir="ltr" />
            <Input type="number" placeholder={t("adm.np.stock")} value={np.stock} onChange={(e) => setNp({ ...np, stock: e.target.value })} className="h-11 rounded-xl" dir="ltr" />
            <Input type="date" placeholder={t("adm.np.expiry")} value={np.expiry} onChange={(e) => setNp({ ...np, expiry: e.target.value })} className="h-11 rounded-xl sm:col-span-2" dir="ltr" />
            <Button className="h-11 rounded-full font-bold sm:col-span-2" onClick={submitAdd}>
              <Plus className="size-4" />
              {t("adm.addProduct")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================================================================== */
/* INVENTORY                                                           */
/* ================================================================== */
export function InventorySection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const products = useAdminProducts();
  const { restock } = useBahbah();

  const low = products.filter((p) => p.stock < 30).sort((a, b) => a.stock - b.stock);
  const expiring = products
    .filter((p) => daysUntil(p.expiry) >= 0 && daysUntil(p.expiry) < 120)
    .sort((a, b) => daysUntil(a.expiry) - daysUntil(b.expiry));
  const expired = products.filter((p) => daysUntil(p.expiry) < 0);
  const value = products.reduce((s, p) => s + p.stock * p.price, 0);

  const summary = [
    { icon: <Coins className="size-5" />, tint: "bg-[#EAF1F9]", color: "text-[#1E4E8F]", label: t("adm.invValue"), value: fmtPrice(value, t) },
    { icon: <Package className="size-5" />, tint: "bg-[#FFF4E5]", color: "text-[#C56A0A]", label: t("adm.invLow"), value: String(low.length) },
    { icon: <AlertTriangle className="size-5" />, tint: "bg-[#F09428]/15", color: "text-[#B45E0A]", label: t("adm.invExpiring"), value: String(expiring.length) },
    { icon: <XCircle className="size-5" />, tint: "bg-[#DC4B4B]/10", color: "text-[#DC4B4B]", label: t("adm.invExpired"), value: String(expired.length) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {summary.map((s) => (
          <AdminCard key={s.label} className="p-4">
            <span className={`grid size-10 place-items-center rounded-xl ${s.tint} ${s.color}`}>{s.icon}</span>
            <div className="mt-3 font-heading text-lg font-black md:text-xl">{s.value}</div>
            <div className="mt-0.5 text-[11px] font-bold text-muted-foreground">{s.label}</div>
          </AdminCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* low stock */}
        <AdminCard>
          <SectionTitle
            icon={<Package className="size-5 text-[#C56A0A]" />}
            title={`${t("adm.invLow")} (${low.length})`}
          />
          <div className="nice-scrollbar mt-3 max-h-80 space-y-2 overflow-y-auto pe-1">
            {low.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
                  <p.icon className="size-4.5 text-[#1E4E8F]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{lang === "ar" ? p.nameAr : p.nameEn}</p>
                  <p className="text-[11px] font-bold text-[#B45E0A]">{t("admin.colStock")}: {p.stock}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 rounded-full px-3 text-xs font-bold"
                  onClick={() => {
                    restock(p.id, 50);
                    toast.success(t("misc.saved"));
                  }}
                >
                  <PackagePlus className="size-3.5" />
                  50+
                </Button>
              </div>
            ))}
            {low.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("admin.ok")}</p>
            )}
          </div>
        </AdminCard>

        {/* expiring */}
        <AdminCard>
          <SectionTitle
            icon={<AlertTriangle className="size-5 text-[#B45E0A]" />}
            title={`${t("adm.invExpiring")} (${expiring.length})`}
          />
          <div className="nice-scrollbar mt-3 max-h-80 space-y-2 overflow-y-auto pe-1">
            {expiring.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
                  <p.icon className="size-4.5 text-[#1E4E8F]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{lang === "ar" ? p.nameAr : p.nameEn}</p>
                  <p className="text-[11px] text-muted-foreground" dir="ltr">{p.expiry}</p>
                </div>
                <Badge className="shrink-0 rounded-full border-0 bg-[#FFF4E5] text-[#B45E0A]">
                  {daysUntil(p.expiry)} {lang === "ar" ? "يوم" : "days"}
                </Badge>
              </div>
            ))}
            {expiring.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("admin.ok")}</p>
            )}
          </div>
        </AdminCard>

        {/* expired */}
        <AdminCard>
          <SectionTitle
            icon={<XCircle className="size-5 text-[#DC4B4B]" />}
            title={`${t("adm.invExpired")} (${expired.length})`}
          />
          <div className="nice-scrollbar mt-3 max-h-80 space-y-2 overflow-y-auto pe-1">
            {expired.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-[#DC4B4B]/25 bg-[#DC4B4B]/5 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white">
                  <p.icon className="size-4.5 text-[#DC4B4B]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{lang === "ar" ? p.nameAr : p.nameEn}</p>
                  <p className="text-[11px] text-muted-foreground" dir="ltr">{p.expiry}</p>
                </div>
                <Badge className="shrink-0 gap-1 rounded-full border-0 bg-[#DC4B4B]/15 text-[#DC4B4B]">
                  <Layers className="size-3" />
                  {t("admin.expired")}
                </Badge>
              </div>
            ))}
            {expired.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("admin.ok")}</p>
            )}
          </div>
        </AdminCard>
      </div>

      {/* expiry meta note */}
      <p className="flex items-center gap-2 rounded-xl bg-muted/60 px-4 py-3 text-xs font-bold text-muted-foreground">
        <AlertTriangle className="size-4 shrink-0 text-[#F09428]" />
        {t("admin.alerts")} — {t("adm.invExpiring")} &lt; 120 {lang === "ar" ? "يوم" : "days"} · {t("adm.invLow")} &lt; 30
      </p>
    </div>
  );
}
