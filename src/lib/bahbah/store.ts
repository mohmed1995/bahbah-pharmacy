"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getProduct,
  products as baseProducts,
  adminOrders as adminDemoOrders,
  demoRxQueue,
  zoneById,
  deliveryZones,
  slotById,
  drivers as demoDrivers,
  demoCoupons,
  STAFF_ACCOUNTS,
  PHARMACY,
  carePlans,
  careAddons,
  adSlides,
  type Order,
  type OrderItem,
  type Product,
  type DriverStatus,
  type RxRequest,
  type RxStatus,
  type Coupon,
  type CareSubscriber,
  type Role,
  demoCareSubs,
} from "./data";

/** next occurrence of a day-of-month (1-28) strictly after `fromIso` */
export function nextDeliveryFor(dayPref: number, fromIso: string): string {
  const d = new Date(fromIso);
  const day = d.getDate();
  const target =
    dayPref > day
      ? new Date(d.getFullYear(), d.getMonth(), dayPref)
      : new Date(d.getFullYear(), d.getMonth() + 1, dayPref);
  return target.toISOString().slice(0, 10);
}

/** full monthly-care membership record (persisted) */
export interface CareSub {
  planId: string;
  since: string;
  next: string;
  status: "active" | "paused";
  addons: string[];
  name: string;
  phone: string;
  address: string;
  zoneId?: string;
  /** preferred day of month (1-28) for the monthly shipment */
  dayPref: number;
  memberNo: string;
}

export interface SubscribeCareInput {
  planId: string;
  addons: string[];
  name: string;
  phone: string;
  address: string;
  zoneId?: string;
  dayPref: number;
}
import { makeT, type DictKey, type Lang } from "./i18n";
import type { IconType } from "@/components/bahbah/icons";

export type View =
  | "home"
  | "catalog"
  | "product"
  | "offers"
  | "care"
  | "track"
  | "cart"
  | "checkout"
  | "success"
  | "login"
  | "account"
  | "admin"
  | "courier"
  | "pharmacist";

export type AccountTab = "orders" | "favorites" | "profile" | "care";

/* ---- catalog display & control state ---- */
export type CatalogView = "cozy" | "list" | "compact";
export type SortKey =
  | "pop"
  | "rating"
  | "price"
  | "discount"
  | "newest"
  | "best";
export type SortDir = 1 | -1;

export interface CatalogFilters {
  brands: string[];
  minRating: number; // 0 = any
  maxPrice: number; // 1000 = any
  offersOnly: boolean;
  noRx: boolean;
  inStock: boolean;
  newOnly: boolean;
}

export const DEFAULT_FILTERS: CatalogFilters = {
  brands: [],
  minRating: 0,
  maxPrice: 1000,
  offersOnly: false,
  noRx: false,
  inStock: false,
  newOnly: false,
};

export const MAX_PRICE = 1000;

export type AdminSection =
  | "overview"
  | "orders"
  | "prescriptions"
  | "products"
  | "inventory"
  | "delivery"
  | "care"
  | "coupons"
  | "ads"
  | "customers"
  | "reports"
  | "maintenance"
  | "settings";

export interface AdminSettings {
  openNow: boolean;
  acceptOrders: boolean;
  freeThreshold: number;
  defaultFee: number;
  hotline: string;
}

/* ---- editable-from-admin content (CMS layers over the base data) ---- */
export const DEFAULT_ADMIN_PASS = "2026";

/** contact info the owner can change from the dashboard (footer/track/auth) */
export interface SiteEdits {
  phone1?: string;
  phone2?: string;
  facebook?: string;
  addressFullAr?: string;
  addressFullEn?: string;
}

/** ad-banner copy the owner can rewrite from the dashboard */
export interface AdEdit {
  titleAr?: string;
  titleEn?: string;
  subAr?: string;
  subEn?: string;
  badgeAr?: string;
  badgeEn?: string;
  ctaAr?: string;
  ctaEn?: string;
}

/** monthly-care plan tweaks the owner can make from the dashboard */
export interface CareEdit {
  nameAr?: string;
  nameEn?: string;
  price?: number;
  oldPrice?: number;
}

/** delivery-zone pricing the owner can tune from the dashboard */
export interface ZoneEdit {
  fee?: number;
  etaMin?: number;
  freeOver?: number;
}

export const DEFAULT_SETTINGS: AdminSettings = {
  openNow: true,
  acceptOrders: true,
  freeThreshold: 300,
  defaultFee: 30,
  hotline: "+20 101 150 0166",
};

export interface CartItem {
  productId: string;
  qty: number;
}

interface BahbahState {
  lang: Lang;
  view: View;
  productId: string | null;
  catalogCategory: string | null;
  cart: CartItem[];
  favorites: string[];
  user: AppUser | null;
  myOrders: Order[];
  lastOrderId: string | null;
  trackOrderId: string | null;
  accountTab: AccountTab;
  cartOpen: boolean;
  searchOpen: boolean;
  rxOpen: boolean;
  consultOpen: boolean;
  icOpen: boolean; // drug-interaction checker dialog

  /* ---- accessibility ---- */
  bigText: boolean;
  elderMode: boolean;

  /* ---- coupons ---- */
  appliedCoupon: string | null;

  /* ---- رعاية بحبح (monthly chronic care) ---- */
  careSub: CareSub | null;
  /** plan pre-picked for the subscribe wizard (home deep-link) */
  careWizardPlan: string | null;

  /* ---- catalog display & control ---- */
  catalogView: CatalogView;
  sortKey: SortKey;
  sortDir: SortDir;
  filters: CatalogFilters;

  /* ---- admin password gate ---- */
  adminUnlocked: boolean;
  adminPass: string;

  /* ---- CMS layers edited from the dashboard ---- */
  siteEdits: SiteEdits;
  adEdits: Record<string, AdEdit>;
  careEdits: Record<string, CareEdit>;
  zoneEdits: Record<string, ZoneEdit>;

  /* ---- dashboard state (persisted demo CRUD) ---- */
  adminSection: AdminSection;
  adminOrders: Order[] | null;
  customProducts: Product[];
  stockAdj: Record<string, number>;
  priceOverride: Record<string, number>;
  driverStatus: Record<string, DriverStatus>;
  zoneDisabled: string[];
  settings: AdminSettings;
  rxQueue: RxRequest[];
  coupons: Coupon[];
  couponOff: string[];
  adsOff: string[];
  careSubs: CareSubscriber[];

  setLang: (l: Lang) => void;
  toggleLang: () => void;
  go: (v: View) => void;
  openProduct: (id: string) => void;
  openCatalog: (category?: string | null) => void;
  openAccount: (tab?: AccountTab) => void;
  openTrack: (orderId: string) => void;
  advanceTrack: () => void;

  addToCart: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleFavorite: (productId: string) => void;

  login: (user: AppUser) => void;
  logout: () => void;
  placeOrder: (o: {
    address: string;
    phone: string;
    payment: string;
    name: string;
    city: string;
    deliveryType: "delivery" | "pickup";
    zoneId?: string;
    slotId?: string;
  }) => string;
  reorder: (orderId: string) => void;

  setCartOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  setRxOpen: (v: boolean) => void;
  setConsultOpen: (v: boolean) => void;
  setIcOpen: (v: boolean) => void;

  /* ---- accessibility & coupons & care ---- */
  toggleBigText: () => void;
  toggleElderMode: () => void;
  applyCoupon: (code: string) => boolean;
  clearCoupon: () => void;
  subscribeCare: (p: SubscribeCareInput) => void;
  pauseCare: () => void;
  resumeCare: () => void;
  cancelCare: () => void;
  changeCareDay: (dayPref: number) => void;
  openCareWizard: (planId?: string) => void;
  closeCareWizard: () => void;

  /** monthly total of a plan + addons (uses dashboard price edits) */
  careMonthly: (planId: string, addons: string[]) => number;

  setCatalogView: (v: CatalogView) => void;
  setSort: (key: SortKey, dir?: SortDir) => void;
  flipSortDir: () => void;
  setFilters: (patch: Partial<CatalogFilters>) => void;
  resetFilters: () => void;

  setAdminSection: (s: AdminSection) => void;
  adminAdvance: (orderId: string) => void;
  adminCancel: (orderId: string) => void;
  adminAssignDriver: (orderId: string, driverId: string) => void;
  courierPickup: (orderId: string) => void; // courier took the parcel (pending → shipping)
  courierDeliver: (orderId: string) => void; // courier handed it over (shipping → delivered)
  pharmacistReady: (orderId: string) => void; // pharmacist handed the order to the driver
  restock: (productId: string, qty: number) => void;
  setPrice: (productId: string, price: number) => void;
  addAdminProduct: (p: Product) => void;
  cycleDriverStatus: (driverId: string) => void;
  toggleZone: (zoneId: string) => void;
  updateSettings: (patch: Partial<AdminSettings>) => void;
  toggleCouponActive: (code: string) => void;
  addCoupon: (c: Coupon) => void;
  toggleAd: (adId: string) => void;
  toggleCareSubStatus: (id: string) => void;
  resetAdminDemo: () => void;

  /* ---- admin password gate & CMS editors ---- */
  unlockAdmin: (pass: string) => boolean;
  lockAdmin: () => void;
  setAdminPass: (p: string) => void;
  updateSiteEdits: (patch: SiteEdits) => void;
  updateAdEdit: (id: string, patch: AdEdit) => void;
  updateCareEdit: (id: string, patch: CareEdit) => void;
  updateZoneEdit: (id: string, patch: ZoneEdit) => void;
  submitRx: (r: { fileName: string; phone: string; noteAr: string; noteEn: string }) => void;
  adminSetRx: (id: string, status: RxStatus) => void;
}

export interface AppUser {
  name: string;
  email: string;
  phone?: string;
  role: Role;
  driverId?: string; // set for courier accounts
}

/** staff login result — null if credentials don't match a staff account */
export function matchStaff(email: string, password: string): AppUser | null {
  const acc = STAFF_ACCOUNTS.find(
    (a) => a.email === email.trim().toLowerCase() && a.password === password
  );
  if (!acc) return null;
  return {
    name: acc.nameAr,
    email: acc.email,
    role: acc.role,
    driverId: acc.driverId,
  };
}

/** where each role lands right after login */
export const roleHome = (r: Role): View =>
  r === "admin" ? "admin" : r === "courier" ? "courier" : r === "pharmacist" ? "pharmacist" : "account";

export interface Address {
  label: string;
  details: string;
  city: string;
  isDefault: boolean;
}

let orderCounter = 1050;

/** effective live stock of a product (base + dashboard adjustments, never < 0) */
export function effStock(productId: string, stockAdj: Record<string, number>): number {
  const base = getProduct(productId)?.stock ?? 0;
  return Math.max(0, base + (stockAdj[productId] ?? 0));
}

const seedOrder: Order = {
  id: "BB-0998",
  date: "2026-10-28",
  items: [
    { productId: "vitamin-c-1000", nameAr: "فيتامين سي 1000 فوار", nameEn: "Vitamin C 1000 Effervescent", price: 85, qty: 2 },
    { productId: "sensodyne", nameAr: "سينسوداين معجون أسنان", nameEn: "Sensodyne Toothpaste", price: 95, qty: 1 },
  ],
  total: 265,
  status: "delivered",
  customerAr: "عميل بحبح",
  customerEn: "Bahbah Customer",
  phone: "0100 000 0000",
  address: "ديروط — شارع المحطة",
  payment: "cod",
  mine: true,
  delivery: {
    type: "delivery",
    zoneId: "deirout-city",
    zoneNameAr: "ديروط داخل المدينة",
    zoneNameEn: "Deirout (city)",
    slotAr: "في أسرع وقت",
    slotEn: "ASAP",
    driverId: "dr-1",
    fee: 10,
  },
};

export const useBahbah = create<BahbahState>()(
  persist(
    (set, get) => ({
      lang: "ar",
      view: "home",
      productId: null,
      catalogCategory: null,
      cart: [],
      favorites: [],
      user: null,
      myOrders: [seedOrder],
      lastOrderId: null,
      trackOrderId: null,
      accountTab: "orders",
      cartOpen: false,
      searchOpen: false,
      rxOpen: false,
      consultOpen: false,
      icOpen: false,
      bigText: false,
      elderMode: false,
      appliedCoupon: null,
      careSub: null,
      careWizardPlan: null,

      catalogView: "cozy",
      sortKey: "pop",
      sortDir: 1,
      filters: DEFAULT_FILTERS,

      adminUnlocked: false,
      adminPass: DEFAULT_ADMIN_PASS,
      siteEdits: {},
      adEdits: {},
      careEdits: {},
      zoneEdits: {},

      adminSection: "overview",
      adminOrders: null,
      customProducts: [],
      stockAdj: {},
      priceOverride: {},
      driverStatus: {},
      zoneDisabled: [],
      settings: DEFAULT_SETTINGS,
      rxQueue: demoRxQueue,
      coupons: demoCoupons,
      couponOff: [],
      adsOff: [],
      careSubs: demoCareSubs,

      setLang: (l) => set({ lang: l }),
      toggleLang: () => set({ lang: get().lang === "ar" ? "en" : "ar" }),

      go: (v) => set({ view: v, cartOpen: false, searchOpen: false }),
      openProduct: (id) => set({ view: "product", productId: id, cartOpen: false, searchOpen: false }),
      openCatalog: (category = null) =>
        set({ view: "catalog", catalogCategory: category, cartOpen: false, searchOpen: false }),
      openAccount: (tab) =>
        set({ view: "account", accountTab: tab ?? get().accountTab, cartOpen: false, searchOpen: false }),
      openTrack: (orderId) => set({ view: "track", trackOrderId: orderId, cartOpen: false, searchOpen: false }),
      advanceTrack: () => {
        /* demo: simulate the courier moving the order to its next real status */
        const id = get().trackOrderId;
        if (!id) return;
        const next = { pending: "shipping", shipping: "delivered" } as const;
        set({
          myOrders: get().myOrders.map((o) =>
            o.id === id && o.status in next ? { ...o, status: next[o.status as keyof typeof next] } : o
          ),
        });
      },

      addToCart: (productId, qty = 1) => {
        /* clamp to live stock — المخزون مربوط بكل حاجة */
        const max = effStock(productId, get().stockAdj);
        const cart = [...get().cart];
        const idx = cart.findIndex((c) => c.productId === productId);
        const cur = idx >= 0 ? cart[idx].qty : 0;
        const next = Math.min(cur + qty, max);
        if (next <= cur) return; // المخزن خلص من المنتج ده
        if (idx >= 0) cart[idx] = { ...cart[idx], qty: next };
        else cart.push({ productId, qty: next });
        set({ cart });
      },
      setQty: (productId, qty) => {
        if (qty <= 0) {
          set({ cart: get().cart.filter((c) => c.productId !== productId) });
          return;
        }
        /* never exceed live stock */
        const capped = Math.min(qty, effStock(productId, get().stockAdj));
        set({
          cart: get().cart.map((c) => (c.productId === productId ? { ...c, qty: capped } : c)),
        });
      },
      removeFromCart: (productId) =>
        set({ cart: get().cart.filter((c) => c.productId !== productId) }),
      clearCart: () => set({ cart: [] }),

      toggleFavorite: (productId) => {
        const favs = get().favorites;
        set({
          favorites: favs.includes(productId)
            ? favs.filter((f) => f !== productId)
            : [...favs, productId],
        });
      },

      login: (user) => set({ user }),
      logout: () => set({ user: null, view: "home" }),

      placeOrder: ({ address, phone, payment, name, city, deliveryType, zoneId, slotId }) => {
        const state = get();
        /* guard: never create an empty order (double-tap protection) */
        if (state.cart.length === 0) return "";
        const items: OrderItem[] = state.cart.map((c) => {
          const p = getProduct(c.productId);
          return {
            productId: c.productId,
            qty: c.qty,
            nameAr: p?.nameAr ?? c.productId,
            nameEn: p?.nameEn ?? c.productId,
            price: p?.price ?? 0,
          };
        });
        const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

        /* coupon engine — validated live, min-total enforced */
        const coupon = state.coupons.find(
          (c) => c.code === state.appliedCoupon && c.active
        );
        const discount =
          coupon && subtotal >= coupon.minTotal
            ? Math.round((subtotal * coupon.percent) / 100)
            : 0;

        /* delivery fee by zone + slot premium — pickup is always free;
           free-delivery goal comes from the dashboard (settings.freeThreshold) */
        const zone =
          deliveryType === "delivery"
            ? mergedZones(state.zoneEdits).find((z) => z.id === zoneId)
            : undefined;
        const slot = slotById(slotId);
        const slotExtra = deliveryType === "delivery" ? slot?.extraFee ?? 0 : 0;
        const freeGoal = state.settings.freeThreshold > 0 ? state.settings.freeThreshold : Infinity;
        const fee =
          deliveryType === "pickup" || !zone
            ? 0 + slotExtra
            : subtotal >= freeGoal
              ? 0 + slotExtra
              : zone.fee + slotExtra;
        const total = Math.max(0, subtotal - discount) + fee;
        const driver =
          deliveryType === "delivery"
            ? (demoDrivers.find((d) => d.zoneId === zone?.id && get().driverStatus[d.id] !== "offline" && get().driverStatus[d.id] !== "busy") ??
              demoDrivers.find((d) => d.status === "available") ??
              demoDrivers[0])
            : undefined;

        const id = `BB-${orderCounter++}`;
        const order: Order = {
          id,
          date: new Date().toISOString().slice(0, 10),
          items,
          total,
          status: "pending",
          customerAr: name || state.user?.name || "عميل بحبح",
          customerEn: name || state.user?.name || "Bahbah Customer",
          phone,
          address:
            deliveryType === "pickup"
              ? `${city || ""} — ${address}`.trim() || "استلام من الفرع"
              : `${zone ? (state.lang === "ar" ? zone.nameAr : zone.nameEn) : city || ""} — ${address}`.trim(),
          payment,
          mine: true,
          coupon: discount > 0 ? coupon?.code : undefined,
          discount: discount > 0 ? discount : undefined,
          delivery: {
            type: deliveryType,
            zoneId: zone?.id,
            zoneNameAr: zone?.nameAr,
            zoneNameEn: zone?.nameEn,
            slotAr: slot?.labelAr ?? (deliveryType === "pickup" ? "استلام من الفرع" : "في أسرع وقت"),
            slotEn: slot?.labelEn ?? (deliveryType === "pickup" ? "Pickup from branch" : "ASAP"),
            driverId: driver?.id,
            fee,
          },
        };
        const adminList = state.adminOrders ?? adminDemoOrders;
        /* المخزون مربوط بالطلب — كل صنف يخصم من المخزن فورًا */
        const nextStockAdj = { ...state.stockAdj };
        items.forEach((i) => {
          nextStockAdj[i.productId] = (nextStockAdj[i.productId] ?? 0) - i.qty;
        });
        set({
          myOrders: [order, ...state.myOrders],
          cart: [],
          lastOrderId: id,
          view: "success",
          adminOrders: [order, ...adminList],
          stockAdj: nextStockAdj,
          appliedCoupon: null,
          /* bump coupon usage counter */
          coupons: discount > 0
            ? state.coupons.map((c) => (c.code === coupon?.code ? { ...c, uses: c.uses + 1 } : c))
            : state.coupons,
        });
        return id;
      },

      submitRx: ({ fileName, phone, noteAr, noteEn }) => {
        const n = 2042 + get().rxQueue.filter((r) => r.id.startsWith("RX-")).length - demoRxQueue.length;
        const rx: RxRequest = {
          id: `RX-${Math.max(n, 2042)}`,
          customerAr: get().user?.name || "عميل بحبح",
          customerEn: get().user?.name || "Bahbah Customer",
          phone,
          fileName,
          date: new Date().toISOString().slice(0, 10),
          status: "new",
          noteAr: noteAr || "—",
          noteEn: noteEn || "—",
        };
        set({ rxQueue: [rx, ...get().rxQueue] });
      },
      adminSetRx: (id, status) =>
        set({
          rxQueue: get().rxQueue.map((r) => (r.id === id ? { ...r, status } : r)),
        }),

      reorder: (orderId) => {
        const order = get().myOrders.find((o) => o.id === orderId);
        if (!order) return;
        const cart = [...get().cart];
        order.items.forEach((i) => {
          const idx = cart.findIndex((c) => c.productId === i.productId);
          if (idx >= 0) cart[idx] = { ...cart[idx], qty: cart[idx].qty + i.qty };
          else cart.push({ productId: i.productId, qty: i.qty });
        });
        set({ cart, view: "cart" });
      },

      setCartOpen: (v) => set({ cartOpen: v }),
      setSearchOpen: (v) => set({ searchOpen: v }),
      setRxOpen: (v) => set({ rxOpen: v }),
      setConsultOpen: (v) => set({ consultOpen: v }),
      setIcOpen: (v) => set({ icOpen: v }),

      toggleBigText: () => {
        const next = !get().bigText;
        set({ bigText: next });
        document.documentElement.classList.toggle("bahbah-big-text", next);
      },
      toggleElderMode: () => {
        const next = !get().elderMode;
        set({ elderMode: next, bigText: next ? true : get().bigText });
        document.documentElement.classList.toggle("bahbah-elder", next);
        if (next) document.documentElement.classList.add("bahbah-big-text");
      },
      applyCoupon: (code) => {
        const norm = code.trim().toUpperCase();
        const c = get().coupons.find((x) => x.code === norm && x.active);
        if (!c) return false;
        set({ appliedCoupon: norm });
        return true;
      },
      clearCoupon: () => set({ appliedCoupon: null }),

      subscribeCare: ({ planId, addons, name, phone, address, zoneId, dayPref }) => {
        const today = new Date().toISOString().slice(0, 10);
        const next = nextDeliveryFor(dayPref, today);
        const memberNo = `BB-C-${1001 + get().careSubs.length}`;
        const sub: CareSub = {
          planId,
          since: today,
          next,
          status: "active",
          addons,
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          zoneId,
          dayPref,
          memberNo,
        };
        /* live sync: the dashboard care-list sees the new member instantly */
        const n = get().careSubs.filter((s) => s.id.startsWith("CS-")).length;
        const entry: CareSubscriber = {
          id: `CS-${104 + n}`,
          nameAr: sub.name || "مشترك جديد",
          nameEn: sub.name || "New member",
          phone: sub.phone,
          planId,
          since: sub.since,
          nextDelivery: sub.next,
          months: 1,
          status: "active",
        };
        set({ careSub: sub, careSubs: [entry, ...get().careSubs], careWizardPlan: null });
      },
      pauseCare: () => {
        const sub = get().careSub;
        if (!sub || sub.status === "paused") return;
        set({
          careSub: { ...sub, status: "paused" },
          careSubs: get().careSubs.map((s) =>
            s.phone === sub.phone && s.planId === sub.planId && s.status === "active"
              ? { ...s, status: "paused" as const }
              : s
          ),
        });
      },
      resumeCare: () => {
        const sub = get().careSub;
        if (!sub) return;
        const today = new Date().toISOString().slice(0, 10);
        set({
          careSub: { ...sub, status: "active", next: nextDeliveryFor(sub.dayPref, today) },
          careSubs: get().careSubs.map((s) =>
            s.phone === sub.phone && s.planId === sub.planId && s.status === "paused"
              ? { ...s, status: "active" as const }
              : s
          ),
        });
      },
      cancelCare: () => {
        const sub = get().careSub;
        if (!sub) return;
        set({
          careSub: null,
          careSubs: get().careSubs.map((s) =>
            s.phone === sub.phone && s.planId === sub.planId && s.status === "active"
              ? { ...s, status: "paused" as const }
              : s
          ),
        });
      },
      changeCareDay: (dayPref) => {
        const sub = get().careSub;
        if (!sub) return;
        const next = nextDeliveryFor(dayPref, new Date().toISOString().slice(0, 10));
        set({
          careSub: { ...sub, dayPref, next },
          careSubs: get().careSubs.map((s) =>
            s.phone === sub.phone && s.planId === sub.planId ? { ...s, nextDelivery: next } : s
          ),
        });
      },
      openCareWizard: (planId) => set({ careWizardPlan: planId ?? null }),
      closeCareWizard: () => set({ careWizardPlan: null }),

      careMonthly: (planId, addons) => {
        const plan = carePlans.find((p) => p.id === planId);
        const edit = get().careEdits[planId] ?? {};
        const base = edit.price ?? plan?.price ?? 0;
        const extra = addons.reduce((sum, id) => {
          const a = careAddons.find((x) => x.id === id);
          return sum + (a?.price ?? 0);
        }, 0);
        return base + extra;
      },

      setCatalogView: (v) => set({ catalogView: v }),
      setSort: (key, dir) =>
        set({ sortKey: key, sortDir: dir ?? get().sortDir }),
      flipSortDir: () => set({ sortDir: get().sortDir === 1 ? -1 : 1 }),
      setFilters: (patch) =>
        set({ filters: { ...get().filters, ...patch } }),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      setAdminSection: (s) => set({ adminSection: s }),

      adminAdvance: (orderId) => {
        const next = { pending: "shipping", shipping: "delivered" } as const;
        set({
          adminOrders: (get().adminOrders ?? adminDemoOrders).map((o) =>
            o.id === orderId && o.status in next
              ? { ...o, status: next[o.status as keyof typeof next] }
              : o
          ),
        });
      },
      adminCancel: (orderId) => {
        set({
          adminOrders: (get().adminOrders ?? adminDemoOrders).map((o) =>
            o.id === orderId ? { ...o, status: "cancelled" } : o
          ),
        });
      },
      adminAssignDriver: (orderId, driverId) => {
        set({
          adminOrders: (get().adminOrders ?? adminDemoOrders).map((o) =>
            o.id === orderId
              ? { ...o, delivery: { type: "delivery" as const, ...o.delivery, driverId } }
              : o
          ),
        });
      },

      /* ---- staff portals ---- */
      courierPickup: (orderId) => {
        const patch = (list: Order[]) =>
          list.map((o) => (o.id === orderId && o.status === "pending" ? { ...o, status: "shipping" as const } : o));
        set({
          adminOrders: patch(get().adminOrders ?? adminDemoOrders),
          myOrders: patch(get().myOrders),
        });
      },
      courierDeliver: (orderId) => {
        const patch = (list: Order[]) =>
          list.map((o) => (o.id === orderId && o.status === "shipping" ? { ...o, status: "delivered" as const } : o));
        set({
          adminOrders: patch(get().adminOrders ?? adminDemoOrders),
          myOrders: patch(get().myOrders),
        });
      },
      pharmacistReady: (orderId) => {
        /* medicine is packed — hand it to the assigned courier */
        const patch = (list: Order[]) =>
          list.map((o) => (o.id === orderId && o.status === "pending" ? { ...o, status: "shipping" as const } : o));
        set({
          adminOrders: patch(get().adminOrders ?? adminDemoOrders),
          myOrders: patch(get().myOrders),
        });
      },

      restock: (productId, qty) => {
        const cur = get().stockAdj[productId] ?? 0;
        set({ stockAdj: { ...get().stockAdj, [productId]: cur + qty } });
      },
      setPrice: (productId, price) =>
        set({ priceOverride: { ...get().priceOverride, [productId]: price } }),
      addAdminProduct: (p) => set({ customProducts: [p, ...get().customProducts] }),

      cycleDriverStatus: (driverId) => {
        const order: DriverStatus[] = ["available", "busy", "offline"];
        const cur = get().driverStatus[driverId] ?? demoDrivers.find((d) => d.id === driverId)?.status ?? "available";
        const next = order[(order.indexOf(cur) + 1) % order.length];
        set({ driverStatus: { ...get().driverStatus, [driverId]: next } });
      },
      toggleZone: (zoneId) => {
        const list = get().zoneDisabled;
        set({
          zoneDisabled: list.includes(zoneId)
            ? list.filter((z) => z !== zoneId)
            : [...list, zoneId],
        });
      },
      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      toggleCouponActive: (code) =>
        set({
          coupons: get().coupons.map((c) =>
            c.code === code ? { ...c, active: !c.active } : c
          ),
        }),
      addCoupon: (c) => set({ coupons: [c, ...get().coupons] }),
      toggleAd: (adId) => {
        const off = get().adsOff;
        set({
          adsOff: off.includes(adId) ? off.filter((a) => a !== adId) : [...off, adId],
        });
      },
      toggleCareSubStatus: (id) =>
        set({
          careSubs: get().careSubs.map((s) =>
            s.id === id
              ? { ...s, status: s.status === "active" ? ("paused" as const) : ("active" as const) }
              : s
          ),
        }),

      /* ---- admin password gate & CMS editors ---- */
      unlockAdmin: (pass) => {
        const ok = pass.trim() === get().adminPass;
        if (ok) set({ adminUnlocked: true });
        return ok;
      },
      lockAdmin: () => set({ adminUnlocked: false }),
      setAdminPass: (p) => set({ adminPass: p.trim() || DEFAULT_ADMIN_PASS }),
      updateSiteEdits: (patch) => set({ siteEdits: { ...get().siteEdits, ...patch } }),
      updateAdEdit: (id, patch) =>
        set({ adEdits: { ...get().adEdits, [id]: { ...get().adEdits[id], ...patch } } }),
      updateCareEdit: (id, patch) =>
        set({ careEdits: { ...get().careEdits, [id]: { ...get().careEdits[id], ...patch } } }),
      updateZoneEdit: (id, patch) =>
        set({ zoneEdits: { ...get().zoneEdits, [id]: { ...get().zoneEdits[id], ...patch } } }),
      resetAdminDemo: () =>
        set({
          adminOrders: null,
          customProducts: [],
          stockAdj: {},
          priceOverride: {},
          driverStatus: {},
          zoneDisabled: [],
          settings: DEFAULT_SETTINGS,
          rxQueue: demoRxQueue,
          coupons: demoCoupons,
          couponOff: [],
          adsOff: [],
          careSubs: demoCareSubs,
        }),
    }),
    {
      name: "bahbah-store",
      version: 3,
      /* v2 → v3: boxes era — old free-delivery threshold 500 resets to the new 300 goal */
      migrate: (persisted: unknown) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        const old = p.careSub as
          | { planId: string; since: string; next: string; status?: string }
          | null
          | undefined;
        if (old && !old.status) {
          p.careSub = {
            ...old,
            status: "active",
            addons: [],
            name: "",
            phone: "",
            address: "",
            dayPref: Number(old.next?.slice(8, 10)) || 15,
            memberNo: "BB-C-1000",
          };
        }
        /* drop stale subscription to a retired plan so the card re-subscribes fresh */
        const sub = p.careSub as { planId?: string } | null | undefined;
        if (sub?.planId && !carePlans.some((pl) => pl.id === sub.planId)) {
          p.careSub = null;
        }
        const st = p.settings as { freeThreshold?: number } | undefined;
        if (st && st.freeThreshold === 500) st.freeThreshold = 300;
        return p as unknown as BahbahState;
      },
      partialize: (s) => ({
        lang: s.lang,
        cart: s.cart,
        favorites: s.favorites,
        user: s.user,
        myOrders: s.myOrders,
        accountTab: s.accountTab,
        bigText: s.bigText,
        elderMode: s.elderMode,
        careSub: s.careSub,
        adminOrders: s.adminOrders,
        customProducts: s.customProducts,
        stockAdj: s.stockAdj,
        priceOverride: s.priceOverride,
        driverStatus: s.driverStatus,
        zoneDisabled: s.zoneDisabled,
        settings: s.settings,
        rxQueue: s.rxQueue,
        coupons: s.coupons,
        adsOff: s.adsOff,
        careSubs: s.careSubs,
        adminUnlocked: s.adminUnlocked,
        adminPass: s.adminPass,
        siteEdits: s.siteEdits,
        adEdits: s.adEdits,
        careEdits: s.careEdits,
        zoneEdits: s.zoneEdits,
        catalogView: s.catalogView,
        sortKey: s.sortKey,
        sortDir: s.sortDir,
        filters: s.filters,
      }),
    }
  )
);

/* Convenience selectors & helpers */
export const cartCount = (cart: CartItem[]) => cart.reduce((s, c) => s + c.qty, 0);

/** merge base catalog + admin-created products + stock/price overrides */
export function mergeAdminProducts(
  customProducts: Product[],
  stockAdj: Record<string, number>,
  priceOverride: Record<string, number>
): Product[] {
  const all = [...customProducts, ...baseProducts];
  return all.map((p) => ({
    ...p,
    stock: Math.max(0, p.stock + (stockAdj[p.id] ?? 0)),
    price: priceOverride[p.id] ?? p.price,
  }));
}

export const useAdminProducts = () => {
  const custom = useBahbah((s) => s.customProducts);
  const adj = useBahbah((s) => s.stockAdj);
  const price = useBahbah((s) => s.priceOverride);
  return mergeAdminProducts(custom, adj, price);
};

/** live contact info = defaults from data.ts overridden by dashboard edits */
export function siteInfo(siteEdits: SiteEdits) {
  return {
    phone1: siteEdits.phone1?.trim() || PHARMACY.phone1,
    phone2: siteEdits.phone2?.trim() || PHARMACY.phone2,
    phone1Href: (siteEdits.phone1?.trim() || PHARMACY.phone1).replace(/\s/g, ""),
    phone2Href: (siteEdits.phone2?.trim() || PHARMACY.phone2).replace(/\s/g, ""),
    facebook: siteEdits.facebook?.trim() || PHARMACY.facebook,
    addressFullAr: siteEdits.addressFullAr?.trim() || PHARMACY.addressFullAr,
    addressFullEn: siteEdits.addressFullEn?.trim() || PHARMACY.addressFullEn,
  };
}
export const useSiteInfo = () => {
  const siteEdits = useBahbah((s) => s.siteEdits);
  return siteInfo(siteEdits);
};

/** live care plans = base plans overridden by dashboard edits */
export function useCarePlans() {
  const careEdits = useBahbah((s) => s.careEdits);
  return carePlans.map((p) => {
    const e = careEdits[p.id] ?? {};
    return {
      ...p,
      nameAr: e.nameAr?.trim() || p.nameAr,
      nameEn: e.nameEn?.trim() || p.nameEn,
      price: e.price ?? p.price,
      oldPrice: e.oldPrice ?? p.oldPrice,
    };
  });
}

/** live ad slides = base slides with dashboard copy edits (hidden ones filtered out) */
export function applyAdEdits(
  adsOff: string[],
  adEdits: Record<string, AdEdit>
) {
  return adSlides
    .filter((a) => !adsOff.includes(a.id))
    .map((s) => {
      const e = adEdits[s.id] ?? {};
      return {
        ...s,
        titleKeyAr: e.titleAr?.trim() || s.titleKeyAr,
        titleKeyEn: e.titleEn?.trim() || s.titleKeyEn,
        subKeyAr: e.subAr?.trim() || s.subKeyAr,
        subKeyEn: e.subEn?.trim() || s.subKeyEn,
        badgeAr: e.badgeAr?.trim() || s.badgeAr,
        badgeEn: e.badgeEn?.trim() || s.badgeEn,
        ctaKeyAr: e.ctaAr?.trim() || s.ctaKeyAr,
        ctaKeyEn: e.ctaEn?.trim() || s.ctaKeyEn,
      };
    });
}
export const useAdSlides = () => {
  const adsOff = useBahbah((s) => s.adsOff);
  const adEdits = useBahbah((s) => s.adEdits);
  return applyAdEdits(adsOff, adEdits);
};

/** live delivery zones = base zones with dashboard pricing edits */
export function mergedZones(zoneEdits: Record<string, ZoneEdit>) {
  return deliveryZones.map((z) => {
    const e = zoneEdits[z.id] ?? {};
    return {
      ...z,
      fee: e.fee ?? z.fee,
      etaMin: e.etaMin ?? z.etaMin,
      freeOver: e.freeOver ?? z.freeOver,
    };
  });
}
export const useZones = () => {
  const zoneEdits = useBahbah((s) => s.zoneEdits);
  return mergedZones(zoneEdits);
};

export const useT = () => {
  const lang = useBahbah((s) => s.lang);
  return makeT(lang);
};

export type { DictKey, Lang, Product, IconType, RxRequest, RxStatus, Role };
export { adminDemoOrders };
