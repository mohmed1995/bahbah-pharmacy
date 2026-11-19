"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getProduct,
  registerCustomProductsGetter,
  registerCustomDriversGetter,
  products as baseProducts,
  adminOrders as adminDemoOrders,
  demoRxQueue,
  zoneById,
  deliveryZones,
  slotById,
  drivers as demoDrivers,
  demoCoupons,
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
  demoMeasurements,
  type PatientMeasurement,
  type WhatsappOrder,
  type ShortageRequest,
  NURSING_SERVICES,
  type NursingService,
  type NursingRequest,
  type CourierCollection,
  type SavedAddress,
  type Driver,
  type LoyaltyTier,
  type LoyaltyState,
  DEFAULT_LOYALTY_TIERS,
  DEFAULT_LOYALTY_EGP_PER_POINT,
  DEFAULT_LOYALTY_FREE_SHIP_QUOTA,
  DEFAULT_COURIER_MSG_TEMPLATES,
  loyaltyFreeShipApplies,
} from "./data";
import { hourInWindow, isPromotable } from "./curation";
import { toast } from "sonner";
import {
  submitOrderToSupabase,
  submitRefillToSupabase,
  updateOrderStatusInSupabase,
  insertRxRequestToSupabase,
  updateRxStatusInSupabase,
  insertCareSubToSupabase,
  updateCareSubStatusInSupabase,
  careSelfUpdateInSupabase,
  insertMeasurementToSupabase,
  deleteMeasurementFromSupabase,
  insertWhatsappOrderToSupabase,
  updateWhatsappOrderStatusInSupabase,
  insertShortageRequestToSupabase,
  updateShortageRequestStatusInSupabase,
  insertNursingRequestToSupabase,
  updateNursingRequestInSupabase,
  insertCourierCollectionToSupabase,
  updateCourierCollectionInSupabase,
  deleteCourierCollectionFromSupabase,
  fetchOrdersDetailedFromSupabase,
  upsertCustomerAddressToSupabase,
  deleteCustomerAddressFromSupabase,
  syncAdminSettingsToSupabase,
  signOutFromSupabase,
} from "@/lib/supabase";

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
  notes?: string;
  prescriptionUrl?: string;
}

export interface SubscribeCareInput {
  planId?: string;
  addons?: string[];
  name: string;
  phone: string;
  address: string;
  zoneId?: string;
  dayPref: number;
  notes?: string;
  prescriptionUrl?: string;
}
import { makeT, type DictKey, type Lang } from "./i18n";
import type { IconType } from "@/components/bahbah/icons";

export type View =
  | "home"
  | "catalog"
  | "product"
  | "offers"
  | "care"
  | "vitals"
  | "track"
  | "cart"
  | "checkout"
  | "success"
  | "login"
  | "account"
  | "admin"
  | "courier"
  | "pharmacist";

export type AccountTab = "orders" | "favorites" | "profile" | "care" | "vitals";

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

/* ------------------------------------------------------------------ */
/* Staff permissions — صلاحيات الطاقم اللي المدير بيوزعها بنفسه.        */
/* المصدر الحقيقي: جدول staff_permissions في Supabase (RLS + دالة        */
/* has_permission على السيرفر). هنا بنحتفظ بنسخة العميل للواجهة بس،     */
/* ولو الجدول مش موجود/فاضي بنرجع لافتراضات الدور (سلوك النهارده).     */
/* ------------------------------------------------------------------ */
export type PermissionKey =
  | "orders"
  | "prescriptions"
  | "medicines"
  | "shortages"
  | "whatsapp_orders"
  | "measurements"
  | "nursing"
  | "finances"
  | "settings"
  | "staff";

export const PERMISSION_KEYS: PermissionKey[] = [
  "orders",
  "prescriptions",
  "medicines",
  "shortages",
  "whatsapp_orders",
  "measurements",
  "nursing",
  "finances",
  "settings",
  "staff",
];

/** افتراضات كل دور = سلوك التطبيق قبل نظام الصلاحيات (الصيدلي: تنفيذ من غير ماليات) */
export const PERMISSION_DEFAULTS: Record<Role, Record<PermissionKey, boolean>> = {
  admin: {
    orders: true, prescriptions: true, medicines: true, shortages: true,
    whatsapp_orders: true, measurements: true, nursing: true, finances: true, settings: true, staff: true,
  },
  pharmacist: {
    orders: true, prescriptions: true, medicines: true, shortages: true,
    whatsapp_orders: true, measurements: true, nursing: true, finances: false, settings: false, staff: false,
  },
  courier: {
    orders: true, prescriptions: false, medicines: false, shortages: false,
    whatsapp_orders: false, measurements: false, nursing: false, finances: false, settings: false, staff: false,
  },
  patient: {
    orders: false, prescriptions: false, medicines: false, shortages: false,
    whatsapp_orders: false, measurements: false, nursing: false, finances: false, settings: false, staff: false,
  },
};

/** هل الدور الحالي عنده الصلاحية؟ (أدمن = الكل؛ غير كده: صف الطاقم فوق افتراض الدور) */
export function hasPermission(
  s: { sessionRole: Role | null; staffPermissions: Partial<Record<PermissionKey, boolean>> | null },
  key: PermissionKey
): boolean {
  const role = s.sessionRole;
  if (!role) return false;
  if (role === "admin") return true;
  const merged = { ...PERMISSION_DEFAULTS[role], ...(s.staffPermissions ?? {}) };
  return !!merged[key];
}

export type AdminSection =
  | "overview"
  | "orders"
  | "collections"
  | "prescriptions"
  | "products"
  | "inventory"
  | "delivery"
  | "care"
  | "vitals"
  | "coupons"
  | "ads"
  | "customers"
  | "reports"
  | "daily"
  | "backup"
  | "maintenance"
  | "staff"
  | "settings";

export interface VillageDay {
  /** اسم اليوم (مثال: السبت) */
  day: string;
  /** أسماء القرى المغطاة في اليوم ده */
  villages: string;
}

export interface AdminSettings {
  openNow: boolean;
  acceptOrders: boolean;
  /** حملة التوصيل المجاني — مفتاح تشغيل/إيقاف من لوحة الإدارة (بتتحفظ في إعدادات السيرفر) */
  freeShipCampaignOn: boolean;
  /** صورة بانر حملة التوصيل المجاني (رابط أو data URL — نفس نمط صور الأدمن) */
  freeShipCampaignImg?: string;
  defaultFee: number;
  hotline: string;
  /** جدول توصيل القرى الأسبوعي — بيتحفظ في إعدادات الأدمن على السيرفر */
  villageDays?: VillageDay[];
  /** مستويات الولاء (اسم/حد نقاط/ميزة) — بيانات إعدادات عند الأدمن، بتتقرا من السيرفر */
  loyaltyTiers?: LoyaltyTier[];
  /** معدل كسب نقاط الولاء: كل كام جنيه في طلب اتسلّم = نقطة (افتراضي 10) */
  loyaltyEarnEgpPerPoint?: number;
  /** رصيد التوصيل المجاني الشهري: كام توصيلة مجانية في الشهر لعميل
      المستوى الأعلى / عميل العلاج الشهري المشترك (افتراضي 4) */
  loyaltyFreeShipQuota?: number;
}

/* ---- editable-from-admin content (CMS layers over the base data) ---- */
export const DEFAULT_ADMIN_PASS = "";

/** contact info & site marketing copy the owner can change from the dashboard */
export interface SiteEdits {
  phone1?: string;
  phone2?: string;
  facebook?: string;
  addressFullAr?: string;
  addressFullEn?: string;
  heroTitleAr?: string;
  heroAccentAr?: string;
  heroBadgeAr?: string;
  heroSubAr?: string;
  heroSubEn?: string;
  heroImage?: string;
  heroChip1Ar?: string;
  heroChip2Ar?: string;
  heroChip3Ar?: string;
  deliveryPromiseAr?: string;
  deliveryPromiseSubAr?: string;
  shippingPromiseAr?: string;
  shippingPromiseSubAr?: string;
  announcementAr?: string;
  announcementEn?: string;
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
  img?: string;
  /** نافذة عرض زمنية (ساعة محلية 0–23) — تُحفظ في إعدادات الأدمن على السيرفر */
  showFrom?: number;
  showTo?: number;
}

/** weekly-deal & special-offer overrides */
export interface OfferEdit {
  price?: number;
  oldPrice?: number;
  badgeAr?: string;
  badgeEn?: string;
  img?: string;
  active?: boolean;
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

/** تعديلات الإدارة على خدمة تمريضية أساسية (اسم/وصف/سعر/تفعيل) —
    بتتخزن في admin_settings.nursing_edits (نفس آلية care_edits).
    الخدمات المضافة بالكامل من الإدارة بتتخزن في nursing_custom. */
export interface NursingServiceEdit {
  nameAr?: string;
  nameEn?: string;
  descAr?: string;
  descEn?: string;
  price?: number;
  active?: boolean;
}

export const DEFAULT_SETTINGS: AdminSettings = {
  openNow: true,
  acceptOrders: true,
  freeShipCampaignOn: false,
  defaultFee: 30,
  hotline: "+20 101 150 0166",
  villageDays: [],
  loyaltyTiers: DEFAULT_LOYALTY_TIERS,
  loyaltyEarnEgpPerPoint: DEFAULT_LOYALTY_EGP_PER_POINT,
  loyaltyFreeShipQuota: DEFAULT_LOYALTY_FREE_SHIP_QUOTA,
};

export interface CartItem {
  productId: string;
  qty: number;
}

interface BahbahState {
  lang: Lang;
  view: View;
  previousView?: View;
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
  voiceSearchAutoStart?: boolean;
  loginOpen: boolean;
  adminAlarmPlaying: boolean;
  rxOpen: boolean;
  consultOpen: boolean;
  icOpen: boolean; // drug-interaction checker dialog
  installAppOpen: boolean;

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

  /* ---- verified staff session (NOT persisted — comes from the live Supabase session) ---- */
  adminUnlocked: boolean;
  sessionRole: Role | null;
  setSessionRole: (r: Role | null) => void;
  /** صلاحيات الموظف الحالي من staff_permissions (null = الجدول مش موجود/مفيش صف → افتراضات الدور) */
  staffPermissions: Partial<Record<PermissionKey, boolean>> | null;
  setStaffPermissions: (p: Partial<Record<PermissionKey, boolean>> | null) => void;

  /* ---- truth guards (NOT persisted) ---- */
  /** true while a placeOrder call is awaiting the server verdict (double-submit guard) */
  orderPlacing: boolean;
  /** true once server orders were loaded — from then on the server is the only order source */
  serverOrdersLoaded: boolean;
  /** ISO time of the last successful server sync (maintenance panel) */
  lastSyncAt: string | null;
  setServerOrdersLoaded: (v: boolean) => void;
  setLastSyncAt: (iso: string | null) => void;
  /* ---- حالة مزامنة لوحة الأداء (مش بتتحفظ — بتتعاد كل جلسة) ---- */
  /** idle = لسه ما جلبناش، loading = جلب شغال، ok = البيانات حديثة، error = الجلب فشل والبيانات المعروضة قديمة */
  dashSyncStatus: "idle" | "loading" | "ok" | "error";
  dashSyncError: string | null;
  /** إعادة جلب طلبات اللوحة من السيرفر يدويًا — true لو نجحت */
  refreshDashboardData: () => Promise<boolean>;
  /* ---- demo presentation mode (explicit opt-in; auto-OFF whenever server data exists) ---- */
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;

  /* ---- CMS layers edited from the dashboard ---- */
  siteEdits: SiteEdits;
  adEdits: Record<string, AdEdit>;
  offerEdits: Record<string, OfferEdit>;
  careEdits: Record<string, CareEdit>;
  zoneEdits: Record<string, ZoneEdit>;
  nursingEdits: Record<string, NursingServiceEdit>;
  /** خدمات تمريضية أضافها المدير بنفسه — admin_settings.nursing_custom */
  nursingCustom: NursingService[];

  /* ---- dashboard state (persisted demo CRUD) ---- */
  adminSection: AdminSection;
  adminOrders: Order[] | null;
  customProducts: Product[];
  customDrivers: Driver[];
  productImgOverride: Record<string, { img: string; verified?: boolean }>;
  stockAdj: Record<string, number>;
  priceOverride: Record<string, number>;
  driverStatus: Record<string, DriverStatus>;
  /** مناديب أزالهم المدير (admin_settings.driver_removed) — بيختفوا من
      كل قوائم التعيين على كل الأجهزة، مش من جهاز المدير بس */
  driverRemoved: string[];
  /** رسائل واتساب جاهزة بيختار منها المندوب/الموظف وهو بيكلم العميل —
      بيعدّلها المدير وبتتخزن في admin_settings.courier_msg_templates */
  courierMsgTemplates: string[];
  zoneDisabled: string[];
  settings: AdminSettings;
  rxQueue: RxRequest[];
  coupons: Coupon[];
  couponOff: string[];
  adsOff: string[];
  careSubs: CareSubscriber[];
  measurements: PatientMeasurement[];
  whatsappOrders: WhatsappOrder[];
  shortageRequests: ShortageRequest[];
  /** حجوزات الخدمات التمريضية — للطاقم من السيرفر، وحجوزات العميل بتتضاف بعد تأكيد السيرفر */
  nursingRequests: NursingRequest[];
  nursingOpen: boolean;
  /** سجلات تحصيل المناديب (التوريد) — للمدير بس، مش بتتحفظ محليًا أبدًا */
  courierCollections: CourierCollection[];
  /** دفتر عناوين العميل — بيتحفظ محليًا وبيتزامن مع Supabase عند تسجيل الدخول */
  savedAddresses: SavedAddress[];
  /** آخر عنوان استخدمه العميل في طلب — بيتحدد تلقائيًا في الدفع الجاي */
  lastAddressId: string | null;
  /** حالة ولاء العميل من السيرفر (رصيد/كارت/عضوية رعاية) — null قبل أول مزامنة */
  loyalty: LoyaltyState | null;
  shortageOpen: boolean;
  shortagePrefill: { itemName?: string; barcode?: string; source?: ShortageRequest["source"] } | null;

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
    discreetPackaging?: boolean;
    /** دبوس موقع العميل + عنوان دفتر العناوين المستخدم (بيبقى «آخر عنوان») */
    lat?: number;
    lng?: number;
    addressId?: string;
  }) => Promise<string>;
  createWhatsappOrder: (o: {
    items: WhatsappOrder["items"];
    total: number;
    phone?: string;
    name?: string;
  }) => Promise<string | null>;
  setWhatsappOrderStatus: (id: string, status: WhatsappOrder["status"]) => Promise<boolean>;
  createShortageRequest: (r: {
    itemName: string;
    barcode?: string;
    photoUrl?: string;
    source: ShortageRequest["source"];
    phone?: string;
    name?: string;
  }) => Promise<string | null>;
  setShortageRequestStatus: (id: string, status: ShortageRequest["status"]) => Promise<boolean>;
  createNursingRequest: (r: {
    service: NursingService;
    visitFee: number;
    zoneId?: string;
    address: string;
    preferredAt: string;
    notes?: string;
    phone?: string;
    name?: string;
  }) => Promise<string | null>;
  setNursingRequestStatus: (id: string, status: NursingRequest["status"]) => Promise<boolean>;
  /** إتمام زيارة تمريض: الحالة «تمت الزيارة» + نتيجة القياس لو الخدمة قياس سكر/ضغط
      (النتيجة بتتسجل كمان في «قياساتي» — patient_measurements) */
  completeNursingVisit: (
    id: string,
    measured?: { sugar?: number; systolic?: number; diastolic?: number }
  ) => Promise<boolean>;
  setNursingOpen: (v: boolean) => void;
  setShortageOpen: (
    v: boolean,
    prefill?: { itemName?: string; barcode?: string; source?: ShortageRequest["source"] } | null
  ) => void;
  reorder: (orderId: string) => void;

  setCartOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean, autoVoice?: boolean) => void;
  setLoginOpen: (v: boolean) => void;
  setAdminAlarmPlaying: (v: boolean) => void;
  stopAdminAlarm: () => void;
  setRxOpen: (v: boolean) => void;
  setConsultOpen: (v: boolean) => void;
  setIcOpen: (v: boolean) => void;
  setInstallAppOpen: (v: boolean) => void;

  /* ---- accessibility & coupons & care ---- */
  toggleBigText: () => void;
  toggleElderMode: () => void;
  applyCoupon: (code: string) => boolean;
  clearCoupon: () => void;
  subscribeCare: (p: SubscribeCareInput) => Promise<boolean>;
  refillMonthlyRx: (patient: CareSubscriber) => Promise<string>;
  pauseCare: () => Promise<void>;
  resumeCare: () => Promise<void>;
  cancelCare: () => Promise<void>;
  changeCareDay: (dayPref: number) => Promise<void>;
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
  /* إجراءات الطلبات بترجّع true بس لو السيرفر أكّد التحديث — الواجهة ما
     بتتقدّمش ولا تقول «تم» قبل التأكيد (إصلاح التوصيلات) */
  adminAdvance: (orderId: string) => Promise<boolean>;
  adminCancel: (orderId: string) => Promise<boolean>;
  adminAssignDriver: (orderId: string, driverId: string) => Promise<boolean>;
  courierPickup: (orderId: string) => Promise<boolean>; // courier took the parcel (pending → shipping)
  courierDeliver: (orderId: string) => Promise<boolean>; // courier handed it over (shipping → delivered)
  /** تسليم مع تسجيل التحصيل أولًا (التوريد): سجل الفلوس لازم يثبت في السيرفر قبل ما الطلب يبقى «تم التسليم» */
  courierDeliverWithCollection: (orderId: string, input: {
    amount: number;
    method: CourierCollection["method"];
    walletFrom?: string;
    walletTo?: string;
    note?: string;
  }) => Promise<boolean>;
  /* ---- دفتر عناوين العميل ---- */
  addSavedAddress: (a: Omit<SavedAddress, "id" | "updatedAt"> & { id?: string }) => SavedAddress;
  updateSavedAddress: (id: string, patch: Partial<Omit<SavedAddress, "id" | "phone">>) => void;
  deleteSavedAddress: (id: string) => Promise<void>;
  setDefaultSavedAddress: (id: string) => void;
  pharmacistReady: (orderId: string) => Promise<boolean>; // pharmacist handed the order to the driver
  /* إجراءات الإعدادات/الكتالوج بترجّع true بس لو السيرفر أكّد الحفظ —
     عند الفشل التعديل بيرجع لآخر حالة محفوظة وبيظهر تنبيه بالفشل */
  restock: (productId: string, qty: number) => Promise<boolean>;
  setPrice: (productId: string, price: number) => Promise<boolean>;
  addAdminProduct: (p: Product) => Promise<boolean>;
  addDriver: (d: Driver) => Promise<boolean>;
  /** إزالة مندوب نهائيًا (سيادة المدير): بتتشال من السيرفر (custom_drivers
      + driver_removed) فبيختفي من قوائم التعيين على كل الأجهزة */
  removeDriver: (driverId: string) => Promise<boolean>;
  updateProductImage: (productId: string, img: string, verified?: boolean) => Promise<boolean>;
  cycleDriverStatus: (driverId: string) => Promise<boolean>;
  /** حفظ رسائل واتساب الجاهزة للمناديب (admin_settings.courier_msg_templates) —
      true بس لو السيرفر أكّد، والفشل بيرجّع القايمة لآخر حالة محفوظة */
  saveCourierMsgTemplates: (list: string[]) => Promise<boolean>;
  toggleZone: (zoneId: string) => Promise<boolean>;
  updateSettings: (patch: Partial<AdminSettings>) => Promise<boolean>;
  toggleCouponActive: (code: string) => Promise<boolean>;
  addCoupon: (c: Coupon) => Promise<boolean>;
  removeCoupon: (code: string) => Promise<boolean>;
  toggleAd: (adId: string) => Promise<boolean>;
  toggleCareSubStatus: (id: string) => Promise<boolean>;
  /** إلغاء اشتراك رعاية من الطاقم/المدير — تأكيد سيرفر أولًا */
  cancelCareSub: (id: string) => Promise<boolean>;
  addMeasurement: (m: Omit<PatientMeasurement, "id" | "recordedAt">) => Promise<string>;
  deleteMeasurement: (id: string) => Promise<boolean>;
  /** تصحيح/حذف سجل تحصيل من المدير — السياسة على السيرفر للأدمن بس */
  adminUpdateCollection: (id: string, patch: { amount?: number; note?: string }) => Promise<boolean>;
  adminDeleteCollection: (id: string) => Promise<boolean>;
  resetAdminDemo: () => void;

  /* ---- admin password gate & CMS editors ---- */
  lockAdmin: () => void;
  updateSiteEdits: (patch: SiteEdits) => Promise<boolean>;
  updateAdEdit: (id: string, patch: AdEdit) => Promise<boolean>;
  updateOfferEdit: (id: string, patch: OfferEdit) => Promise<boolean>;
  updateCareEdit: (id: string, patch: CareEdit) => Promise<boolean>;
  updateZoneEdit: (id: string, patch: ZoneEdit) => Promise<boolean>;
  updateNursingEdit: (id: string, patch: NursingServiceEdit) => Promise<boolean>;
  /** إضافة خدمة تمريضية جديدة من لوحة الإدارة (بتتحفظ في السيرفر) */
  addNursingService: (s: Omit<NursingService, "id" | "active">) => Promise<boolean>;
  updateNursingCustom: (id: string, patch: Partial<NursingService>) => Promise<boolean>;
  deleteNursingCustom: (id: string) => Promise<boolean>;
  submitRx: (r: { fileName: string; phone: string; noteAr: string; noteEn: string }) => Promise<boolean>;
  adminSetRx: (id: string, status: RxStatus) => Promise<boolean>;
}

export interface AppUser {
  name: string;
  email: string;
  phone?: string;
  role: Role;
  driverId?: string; // set for courier accounts
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

/**
 * رقم طلب فريد بدون عدّاد محلي: BB-YYMMDD-XXXXXXXX (8 خانات من 32 حرف/رقم ≈ 1.1 تريليون احتمال في اليوم)
 * (العدّاد القديم كان يبدأ من 1050 عند كل متصفح فيتكرر الرقم ويفشل الحفظ في Supabase).
 * الطول 8 مقصود: لو حصل تصادم، الداتابيز بترفض الطلب التاني بـ duplicate key وبيتعامل معاه
 * كأنه نجح (عشان إعادة الإرسال متكررش)، فلازم احتمال التصادم يكون عمليًا صفر.
 */
export function generateOrderId(): string {
  const d = new Date();
  const ymd =
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let rand = "";
  for (let i = 0; i < 8; i++) {
    rand += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `BB-${ymd}-${rand}`;
}

/** معرّف فريد ضد التصادم لسجلات بتتكتب كمفاتيح أساسية (روشتات/قياسات):
    وقت كامل + لاحقة عشوائية — الصيغ القديمة كانت بتتصادم (رقم تسلسلي
    من طول القايمة، أو آخر 6 أرقام من الوقت) فالسجل كان بيضيع بصمت. */
export function uniqueRecordId(prefix: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let rand = "";
  for (let i = 0; i < 6; i++) {
    rand += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

/** effective live stock of a product (base + dashboard adjustments, never < 0) */
export function effStock(productId: string, stockAdj: Record<string, number>): number {
  const base = getProduct(productId)?.stock ?? 0;
  return Math.max(0, base + (stockAdj[productId] ?? 0));
}

/* ------------------------------------------------------------------ */
/* Order status state machine — mirrors the SQL trigger rules:         */
/* terminal states (delivered / cancelled) never move again, and a     */
/* cancelled order can never be resurrected.                           */
/* ------------------------------------------------------------------ */
export const ORDER_TRANSITIONS: Record<Order["status"], Order["status"][]> = {
  /* pending → shipping لسه مسموح (طلبات قديمة/استلام مباشر من غير خطوة تجهيز صريحة) */
  pending: ["ready", "shipping", "cancelled"],
  ready: ["shipping", "cancelled"],
  shipping: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function canTransitionOrder(from: Order["status"], to: Order["status"]): boolean {
  if (from === to) return false;
  return (ORDER_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Demo data (fabricated sales series etc.) may ONLY be presented when the owner
 * explicitly enabled demo mode AND no server truth exists: no staff session and
 * no server orders loaded yet. The moment server data exists, demo is OFF.
 */
export function isDemoActive(s: {
  demoMode: boolean;
  serverOrdersLoaded: boolean;
  sessionRole: Role | null;
}): boolean {
  return s.demoMode && !s.serverOrdersLoaded && !s.sessionRole;
}

export const useDemoActive = () => useBahbah((s) => isDemoActive(s));

/* ------------------------------------------------------------------ */
/* Web Audio API Synthesized Chime & Instant Order Notification       */
/* ------------------------------------------------------------------ */
let alarmIntervalId: any = null;

/** Continuous loud alert siren/bell for admin until dismissed */
export function startContinuousAdminAlarm() {
  if (typeof window === "undefined") return;
  if (alarmIntervalId) return; // already ringing

  playUrgentAdminAlarm();
  alarmIntervalId = setInterval(() => {
    playUrgentAdminAlarm();
  }, 2400);

  // Update Zustand state
  try {
    useBahbah.getState().setAdminAlarmPlaying(true);
  } catch {}
}

export function stopContinuousAdminAlarm() {
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
  try {
    useBahbah.getState().setAdminAlarmPlaying(false);
  } catch {}
}

/** Loud two-tone alarm for administration order alert */
export function playUrgentAdminAlarm() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const tones = [
      { freq: 950, time: 0.0, dur: 0.18, type: "sawtooth" as OscillatorType },
      { freq: 720, time: 0.22, dur: 0.22, type: "sawtooth" as OscillatorType },
      { freq: 950, time: 0.48, dur: 0.18, type: "sawtooth" as OscillatorType },
      { freq: 720, time: 0.70, dur: 0.35, type: "sawtooth" as OscillatorType },
    ];

    tones.forEach(({ freq, time, dur, type }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      gain.gain.setValueAtTime(0, ctx.currentTime + time);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur);
    });
  } catch (err) {
    console.warn("Could not play admin alarm:", err);
  }
}

/** Familiar ding-dong doorbell sound for courier delivering order */
export function playDoorbellDingDong() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    // Classic Ding-Dong (High bell then low bell)
    const tones = [
      { freq: 784, time: 0.0, dur: 0.7 }, // G5 (Ding)
      { freq: 659.25, time: 0.55, dur: 0.9 }, // E5 (Dong)
    ];

    tones.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      gain.gain.setValueAtTime(0, ctx.currentTime + time);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur);
    });
  } catch (err) {
    console.warn("Could not play doorbell ding-dong:", err);
  }
}

export function playOrderChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    // High quality 3-tone pharmacy chime
    const notes = [
      { freq: 587.33, time: 0.0, dur: 0.25 }, // D5
      { freq: 880.00, time: 0.15, dur: 0.35 }, // A5
      { freq: 1174.66, time: 0.32, dur: 0.55 }, // D6
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      gain.gain.setValueAtTime(0, ctx.currentTime + time);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur);
    });
  } catch (err) {
    console.warn("Could not play synthesized audio chime:", err);
  }
}

export function notifyNewOrder(order: Order) {
  // Trigger continuous loud alarm for admin
  startContinuousAdminAlarm();

  if (typeof window !== "undefined") {
    toast.success(`🚨 طلب جديد وارد الآن! #${order.id} بقيمة ${order.total} ج.م`, {
      description: `${order.customerAr || order.customerEn} — ${order.address}`,
      duration: 15000,
      action: {
        label: "إيقاف الجرس 🔕",
        onClick: () => stopContinuousAdminAlarm(),
      },
    });

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(`طلب جديد في صيدلية بحبح #${order.id}`, {
          body: `العميل: ${order.customerAr || order.customerEn} — الإجمالي: ${order.total} ج.م — ${order.address}`,
          icon: "/images/bahbah-badge.png",
        });
      } catch (e) {
        // ignore
      }
    }
  }
}

/** Staff alert: a new prescription arrived (chime + toast + browser notification) */
export function notifyNewRx(rx: RxRequest) {
  playOrderChime();
  if (typeof window !== "undefined") {
    toast.info(`🧾 روشتة جديدة واردة الآن! ${rx.id}`, {
      description: `${rx.customerAr || rx.customerEn} — ${rx.phone}`,
      duration: 12000,
    });
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(`روشتة جديدة في صيدلية بحبح ${rx.id}`, {
          body: `العميل: ${rx.customerAr || rx.customerEn} — ${rx.phone}`,
          icon: "/images/bahbah-badge.png",
        });
      } catch {}
    }
  }
}

/** Staff alert: a new patient measurement was recorded */
export function notifyNewMeasurement(m: PatientMeasurement) {
  playOrderChime();
  if (typeof window !== "undefined") {
    toast.info(`🩺 قياس جديد للمريض ${m.patientName}`, {
      description: `كود ${m.patientCode} — ${m.patientPhone}`,
      duration: 10000,
    });
  }
}

/** Staff alert: a new monthly-care subscription arrived */
export function notifyNewCareSub(sub: CareSubscriber) {
  playOrderChime();
  if (typeof window !== "undefined") {
    toast.info(`💊 اشتراك رعاية شهرية جديد — ${sub.nameAr}`, {
      description: sub.phone,
      duration: 10000,
    });
  }
}

/** Customer feedback: my order's status changed on the server — صوت + تنبيه + إشعار متصفح */
/* سجل «اتنبّهنا خلاص» على مستوى الجلسة: نفس الانتقال (طلب + حالة) ما
   يتنبّهش غير مرة واحدة مهما شافه أكتر من مسار في نفس الوقت (قناة
   realtime، فحص شاشة التتبع، مراقب حالات طلباتي في الخلفية) — الحالات
   بتتقدم لقدام بس فمفيش انتقال شرعي بيتكرر. */
const orderStatusNotified = new Set<string>();
export function notifyMyOrderStatus(order: Order) {
  const dedupeKey = `${order.id}:${order.status}`;
  if (orderStatusNotified.has(dedupeKey)) return;
  orderStatusNotified.add(dedupeKey);
  const labels: Record<Order["status"], string> = {
    pending: "طلبك وصل الصيدلية وقيد المراجعة دلوقتي",
    ready: "تم تجهيز طلبك 📦 — المندوب هيستلمه ويخرج بيه للتوصيل",
    shipping: "طلبك خرج للتوصيل وهو في الطريق إليك 🚴",
    delivered: "تم تسليم طلبك بنجاح — بالشفا والعافية 💚 قيّم المندوب اللي وصّلك من شاشة تتبع الطلب ⭐",
    cancelled: "تم إلغاء طلبك — كلمنا لو محتاج أي مساعدة",
  };
  if (typeof window === "undefined") return;
  /* الجرس للمريض نفسه: جرس الباب عند التسليم، ورنّة الطلبات لباقي الحالات */
  if (order.status === "delivered") playDoorbellDingDong();
  else playOrderChime();
  toast.info(`📦 تحديث طلبك #${order.id}`, {
    description: labels[order.status] ?? order.status,
    duration: 9000,
  });
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(`صيدلية بحبح — تحديث طلبك #${order.id}`, {
        body: labels[order.status] ?? order.status,
        icon: "/images/bahbah-badge.png",
      });
    } catch {}
  }
}

/** Courier alert: a delivery became HIS (order ready and/or assigned to him) — صوت + تنبيه */
export function notifyCourierAssignment(order: Order) {
  if (typeof window === "undefined") return;
  playOrderChime();
  toast.success(`🛵 توصيلة جديدة باسمك! طلب #${order.id}`, {
    description: `${order.customerAr || order.customerEn} — ${order.address}`,
    duration: 12000,
  });
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(`توصيلة جديدة في صيدلية بحبح #${order.id}`, {
        body: `العميل: ${order.customerAr || order.customerEn} — ${order.address}`,
        icon: "/images/bahbah-badge.png",
      });
    } catch {}
  }
}

/** Manager alert: a courier recorded a collection (توريد) — صوت + تنبيه + إشعار.
    بتتنادى بس في جلسات المدير/الماليات، وسجلات التحصيل محكومة بـ RLS أصلًا. */
export function notifyNewCollection(c: CourierCollection) {
  if (typeof window === "undefined") return;
  const methodAr =
    c.method === "cash"
      ? "كاش"
      : c.method === "wallet"
        ? `محفظة إلكترونية من رقم ${c.walletFrom || "—"} لحساب ${c.walletTo || "—"}`
        : `تحويل بنكي لحساب ${c.walletTo || "—"}`;
  const line = `تم توريد ${c.amount} جنيه — ${methodAr}`;
  playOrderChime();
  toast.success(`💰 ${line}`, {
    description: `طلب #${c.orderId} — المندوب: ${c.courierName || c.courierId || "—"}`,
    duration: 12000,
  });
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification("صيدلية بحبح — توريد جديد", {
        body: `${line} (طلب #${c.orderId})`,
        icon: "/images/bahbah-badge.png",
      });
    } catch {}
  }
}

/* تنبيهات فشل الحفظ على السيرفر: قاعدة «إصلاح التوصيلات» إن مفيش كنترول
   يقول «تم» على كتابة السيرفر ما أكّدهاش — الفشل بيبان للمستخدم والتعديل
   بيرجع لآخر حالة مؤكدة. */
function notifySettingsSaveFailed() {
  toast.error("تعذّر الحفظ على السيرفر — التعديل ما اتثبّتش ورجع لآخر حالة محفوظة. راجع الاتصال وحاول تاني", {
    duration: 7000,
  });
}
function notifyOrderSaveFailed() {
  toast.error("تعذّر تحديث الطلب على السيرفر — حالة الطلب زي ما هي. راجع الاتصال وحاول تاني", {
    duration: 7000,
  });
}
function notifyCareSaveFailed() {
  toast.error("تعذّر حفظ تعديل الاشتراك على السيرفر — الاشتراك زي ما هو. راجع الاتصال وحاول تاني", {
    duration: 7000,
  });
}
function notifyRxSaveFailed() {
  toast.error("تعذّر إرسال الروشتة للسيرفر — الروشتة ما وصلتش الصيدلية. راجع الاتصال وحاول تاني", {
    duration: 7000,
  });
}
function notifyAddressSyncFailed() {
  toast.warning("العنوان اتحفظ على الجهاز بس ما اتزامنش مع السيرفر — ممكن ما يظهرش عند تسجيل الدخول من جهاز تاني", {
    duration: 7000,
  });
}

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
      myOrders: [],
      lastOrderId: null,
      trackOrderId: null,
      accountTab: "orders",
      cartOpen: false,
      searchOpen: false,
      loginOpen: false,
      adminAlarmPlaying: false,
      rxOpen: false,
      consultOpen: false,
      icOpen: false,
      installAppOpen: false,
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
      sessionRole: null,
      setSessionRole: (r) => set({ sessionRole: r, adminUnlocked: r === "admin" }),
      staffPermissions: null,
      setStaffPermissions: (p) => set({ staffPermissions: p }),
      orderPlacing: false,
      serverOrdersLoaded: false,
      lastSyncAt: null,
      setServerOrdersLoaded: (v) => set({ serverOrdersLoaded: v }),
      setLastSyncAt: (iso) => set({ lastSyncAt: iso }),
      dashSyncStatus: "idle",
      dashSyncError: null,
      refreshDashboardData: async () => {
        if (get().dashSyncStatus === "loading") return false;
        set({ dashSyncStatus: "loading", dashSyncError: null });
        const res = await fetchOrdersDetailedFromSupabase();
        if (res.orders) {
          set({
            adminOrders: res.orders,
            serverOrdersLoaded: true,
            lastSyncAt: new Date().toISOString(),
            dashSyncStatus: "ok",
            dashSyncError: null,
          });
          return true;
        }
        /* الفشل مش بيصفّر اللوحة: البيانات الحالية بتفضل باينة تحت شريط الخطأ */
        set({ dashSyncStatus: "error", dashSyncError: res.error });
        return false;
      },
      demoMode: false,
      setDemoMode: (v) => set({ demoMode: v }),
      siteEdits: {},
      adEdits: {},
      offerEdits: {},
      careEdits: {},
      zoneEdits: {},
      nursingEdits: {},
      nursingCustom: [],

      adminSection: "overview",
      adminOrders: [],
      customProducts: [],
      customDrivers: [],
      productImgOverride: {},
      stockAdj: {},
      priceOverride: {},
      driverStatus: {},
      driverRemoved: [],
      courierMsgTemplates: DEFAULT_COURIER_MSG_TEMPLATES,
      zoneDisabled: [],
      settings: DEFAULT_SETTINGS,
      rxQueue: [],
      coupons: demoCoupons,
      couponOff: [],
      adsOff: [],
      careSubs: [],
      measurements: [],
      whatsappOrders: [],
      shortageRequests: [],
      nursingRequests: [],
      nursingOpen: false,
      courierCollections: [],
      savedAddresses: [],
      lastAddressId: null,
      loyalty: null,
      shortageOpen: false,
      shortagePrefill: null,

      setLang: (l) => set({ lang: l }),
      toggleLang: () => set({ lang: get().lang === "ar" ? "en" : "ar" }),

      go: (v) => set({ previousView: get().view, view: v, cartOpen: false, searchOpen: false }),
      openProduct: (id) => set({ previousView: get().view, view: "product", productId: id, cartOpen: false, searchOpen: false }),
      openCatalog: (category = null) =>
        set({ view: "catalog", catalogCategory: category, cartOpen: false, searchOpen: false }),
      openAccount: (tab) =>
        set({ view: "account", accountTab: tab ?? get().accountTab, cartOpen: false, searchOpen: false }),
      openTrack: (orderId) => set({ view: "track", trackOrderId: orderId, cartOpen: false, searchOpen: false }),
      advanceTrack: () => {
        /* demo: simulate the courier moving the order to its next real status.
           محاكاة تجريبية بس — في التشغيل الحقيقي الحالة تيجي من السيرفر فقط،
           فالدالة دي ما تشتغلش برا وضع الديمو عشان ما ترسمش تقدم توصيل وهمي. */
        if (!isDemoActive(get())) return;
        const id = get().trackOrderId;
        if (!id) return;
        const next = { pending: "ready", ready: "shipping", shipping: "delivered" } as const;
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
      logout: () => {
        set({ user: null, adminUnlocked: false, sessionRole: null, view: "home" });
        signOutFromSupabase();
      },

      placeOrder: async ({ address, phone, payment, name, city, deliveryType, zoneId, slotId, discreetPackaging, lat, lng, addressId }) => {
        const state = get();
        /* double-submit guard: one order in flight at a time */
        if (state.orderPlacing) return "";
        /* guard: never create an empty order */
        if (state.cart.length === 0) return "";
        /* shop-closed gate — the dashboard toggle is synced to the storefront */
        if (!state.settings.acceptOrders) {
          toast.error("الصيدلية واقفة استقبال الطلبات دلوقتي — جرّب كمان شوية أو كلمنا واتساب", {
            duration: 8000,
          });
          return "";
        }
        /* validate every line BEFORE anything is committed: qty > 0 and within
           live stock (نفس قاعدة addToCart). أي صنف ناقص = إيقاف الطلب والسلة تفضل. */
        const items: OrderItem[] = [];
        let clampedAny = false;
        for (const c of state.cart) {
          const p = getProduct(c.productId);
          if (!p || !(c.qty > 0)) {
            toast.error("في صنف غير صالح في السلة — راجع السلة وحاول تاني", { duration: 8000 });
            return "";
          }
          const max = effStock(c.productId, state.stockAdj);
          if (max <= 0) {
            toast.error(`"${p.nameAr}" خلص من المخزون دلوقتي — شيله من السلة وكمل طلبك`, {
              duration: 8000,
            });
            return "";
          }
          const qty = Math.min(c.qty, max);
          if (qty !== c.qty) clampedAny = true;
          items.push({
            productId: c.productId,
            qty,
            nameAr: p.nameAr,
            nameEn: p.nameEn,
            price: p.price,
          });
        }
        if (clampedAny) {
          toast.warning("تم ضبط كميات بعض الأصناف حسب المتاح في المخزون");
        }
        const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

        /* coupon engine — validated live, min-total enforced.
           كارت خصم الولاء المكتسب بيشتغل هنا زي أي كوبون (والسيرفر بيتحقق
           منه وبيعلّمه مستخدم في place_order). */
        const coupon = state.coupons.find(
          (c) => c.code === state.appliedCoupon && c.active
        );
        const loyaltyCard =
          state.loyalty?.card && state.loyalty.card.status === "active" &&
          state.appliedCoupon &&
          state.loyalty.card.code.toUpperCase() === state.appliedCoupon.toUpperCase()
            ? state.loyalty.card
            : null;
        const discount = coupon
          ? subtotal >= coupon.minTotal
            ? Math.round((subtotal * coupon.percent) / 100)
            : 0
          : loyaltyCard
            ? Math.round((subtotal * loyaltyCard.percent) / 100)
            : 0;

        /* delivery fee by zone + slot premium — pickup is always free;
           حملة التوصيل المجاني (settings.freeShipCampaignOn) هي آلية الشحن
           المجاني الوحيدة: وهي شغالة رسوم المنطقة صفر لكل المناطق */
        const zone =
          deliveryType === "delivery"
            ? mergedZones(state.zoneEdits).find((z) => z.id === zoneId)
            : undefined;
        const slot = slotById(slotId);
        const slotExtra = deliveryType === "delivery" ? slot?.extraFee ?? 0 : 0;
        /* توصيل مجاني من الولاء — بيتركّب مع حملة التوصيل المجاني (أي واحد
           فيهم يكفي): مستوى العميل بيمنحه (عميل العلاج الشهري) أو عنده
           اشتراك رعاية شهرية نشط — بس من رصيد شهري محدود بيحدده الأدمن،
           والحملة وهي شغالة ما بتستهلكش من الرصيد. السيرفر بيطبّق نفس
           القاعدة وهو المرجع. */
        const loyaltyTiers =
          state.settings.loyaltyTiers && state.settings.loyaltyTiers.length > 0
            ? state.settings.loyaltyTiers
            : DEFAULT_LOYALTY_TIERS;
        const loyaltyFreeShip =
          deliveryType === "delivery" &&
          loyaltyFreeShipApplies(loyaltyTiers, state.loyalty, state.careSub?.status === "active");
        const fee =
          deliveryType === "pickup" || !zone
            ? 0 + slotExtra
            : state.settings.freeShipCampaignOn || loyaltyFreeShip
              ? 0 + slotExtra
              : zone.fee + slotExtra;
        const total = Math.max(0, subtotal - discount) + fee;
        const removedDrivers = get().driverRemoved || [];
        const allDrivers = [...(get().customDrivers || []), ...demoDrivers].filter(
          (d) => !removedDrivers.includes(d.id)
        );
        const driver =
          deliveryType === "delivery"
            ? (allDrivers.find((d) => d.zoneId === zone?.id && get().driverStatus[d.id] !== "offline" && get().driverStatus[d.id] !== "busy") ??
              allDrivers.find((d) => (get().driverStatus[d.id] ?? d.status) === "available") ??
              allDrivers[0])
            : undefined;

        const id = generateOrderId();
        const orderAddress =
          deliveryType === "pickup"
            ? `${city || ""} — ${address}`.trim() || "استلام من الفرع"
            : `${zone ? (state.lang === "ar" ? zone.nameAr : zone.nameEn) : city || ""} — ${address}`.trim();

        /* السيرفر أولًا: مفيش شاشة نجاح ولا خصم مخزون ولا تفريغ سلة قبل حكم السيرفر.
           رفض نهائي = خطأ والسلة تفضل زي ما هي. انقطاع نت = الطلب بيتسجّل محليًا
           وبيفضل في طابور الإرسال التلقائي (submitOrderToSupabase بيحطه في الطابور). */
        set({ orderPlacing: true });
        try {
          const { result, rejected } = await submitOrderToSupabase({
            id,
            name: name || state.user?.name || "عميل بحبح",
            phone,
            address: orderAddress,
            payment,
            deliveryType,
            zoneId: zone?.id,
            slotId: deliveryType === "delivery" ? slotId : undefined,
            coupon: state.appliedCoupon ?? undefined,
            driverId: driver?.id,
            discreetPackaging: discreetPackaging || undefined,
            lat: deliveryType === "delivery" ? lat : undefined,
            lng: deliveryType === "delivery" ? lng : undefined,
            items: items.map((i) => ({ productId: i.productId, qty: i.qty, nameAr: i.nameAr, nameEn: i.nameEn })),
          });

          if (rejected) {
            toast.error("الصيدلية ما قدرتش تسجّل الطلب — راجع السلة وحاول تاني أو كلمنا بالواتساب", { duration: 10000 });
            return "";
          }

          /* السيرفر هو المرجع في الأرقام النهائية لو ردّ */
          const finalTotal = result ? result.total : total;
          const finalDiscount = result ? result.discount : discount;
          const finalFee = result ? result.delivery_fee : fee;
          const order: Order = {
            id,
            date: new Date().toISOString().slice(0, 10),
            createdAt: new Date().toISOString(),
            items,
            total: finalTotal,
            status: "pending",
            customerAr: name || state.user?.name || "عميل بحبح",
            customerEn: name || state.user?.name || "Bahbah Customer",
            phone,
            address: orderAddress,
            payment,
            mine: true,
            coupon: finalDiscount > 0 ? (coupon?.code ?? (loyaltyCard ? loyaltyCard.code : undefined)) : undefined,
            discount: finalDiscount > 0 ? finalDiscount : undefined,
            discreetPackaging: discreetPackaging || undefined,
            lat: deliveryType === "delivery" ? lat : undefined,
            lng: deliveryType === "delivery" ? lng : undefined,
            delivery: {
              type: deliveryType,
              zoneId: zone?.id,
              zoneNameAr: zone?.nameAr,
              zoneNameEn: zone?.nameEn,
              slotAr: slot?.labelAr ?? (deliveryType === "pickup" ? "استلام من الفرع" : "في أسرع وقت"),
              slotEn: slot?.labelEn ?? (deliveryType === "pickup" ? "Pickup from branch" : "ASAP"),
              driverId: driver?.id,
              fee: finalFee,
            },
          };

          const fresh = get();
          const adminList = fresh.adminOrders ?? [];
          /* انعكاس محلي لحالة الولاء بعد تأكيد السيرفر — مزامنة الولاء
             الجاية بتأكده: (1) كارت الخصم لو اتخصم في الطلب ده بقى
             مستخدم، (2) لو الإعفاء من الرسوم كان بسبب الولاء/الرعاية
             (والحملة مقفولة) اتستهلكت توصيلة من الرصيد الشهري */
          let nextLoyalty = fresh.loyalty;
          if (loyaltyCard && finalDiscount > 0 && nextLoyalty?.card) {
            nextLoyalty = {
              ...nextLoyalty,
              card: { ...nextLoyalty.card, status: "used" as const },
            };
          }
          if (
            loyaltyFreeShip &&
            !state.settings.freeShipCampaignOn &&
            result &&
            nextLoyalty &&
            typeof nextLoyalty.freeRemaining === "number"
          ) {
            nextLoyalty = {
              ...nextLoyalty,
              freeRemaining: Math.max(0, nextLoyalty.freeRemaining - 1),
              freeUsed: (nextLoyalty.freeUsed ?? 0) + 1,
            };
          }
          /* المخزون مربوط بالطلب — الخصم بيحصل بس بعد قبول السيرفر أو التسجيل الآمن في الطابور */
          const nextStockAdj = { ...fresh.stockAdj };
          items.forEach((i) => {
            nextStockAdj[i.productId] = (nextStockAdj[i.productId] ?? 0) - i.qty;
          });
          set({
            myOrders: [order, ...fresh.myOrders],
            cart: [],
            lastOrderId: id,
            /* العنوان المستخدم في الطلب ده بيبقى هو المحدد تلقائيًا في الطلب الجاي */
            ...(deliveryType === "delivery" && addressId ? { lastAddressId: addressId } : {}),
            view: "success",
            adminOrders: [order, ...adminList],
            stockAdj: nextStockAdj,
            appliedCoupon: null,
            /* حالة الولاء المنعكسة محليًا (كارت مستخدم / توصيلة مستهلكة
               من الرصيد) — اتحسبت فوق من رد السيرفر المؤكد */
            ...(nextLoyalty !== fresh.loyalty && nextLoyalty ? { loyalty: nextLoyalty } : {}),
            /* bump coupon usage counter */
            coupons: finalDiscount > 0
              ? fresh.coupons.map((c) => (c.code === coupon?.code ? { ...c, uses: c.uses + 1 } : c))
              : fresh.coupons,
          });
          notifyNewOrder(order);
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            try {
              const bc = new BroadcastChannel("bahbah_orders_broadcast");
              bc.postMessage({ type: "NEW_ORDER", order });
              bc.close();
            } catch {}
          }
          if (!result) {
            toast.warning("الطلب اتسجّل عندك — هيتبعت للصيدلية أول ما النت يرجع", {
              description: "ممكن كمان تبعته بالواتساب من صفحة النجاح للتأكيد السريع",
              duration: 10000,
            });
          } else if (Math.abs(result.total - total) >= 0.5) {
            toast.warning(`تم تحديث إجمالي طلبك إلى ${result.total} ج.م حسب الأسعار الحالية`);
          }
          return id;
        } finally {
          set({ orderPlacing: false });
        }
      },

      submitRx: async ({ fileName, phone, noteAr, noteEn }) => {
        /* معرّف فريد ضد التصادم: الصيغة القديمة (1001 + طول القايمة) كانت
           بتتصادم بعد أي حذف فالروشتة كانت بتضيع على السيرفر بصمت */
        const rxId = uniqueRecordId("RX");
        const rx: RxRequest = {
          id: rxId,
          customerAr: get().user?.name || "عميل بحبح",
          customerEn: get().user?.name || "Bahbah Customer",
          phone,
          fileName,
          date: new Date().toISOString().slice(0, 10),
          status: "new",
          noteAr: noteAr || "—",
          noteEn: noteEn || "—",
        };
        /* السيرفر أولًا: الروشتة ما بتظهرش كمُرسلة غير لو اتكتبت فعلًا —
           فشل الكتابة = تنبيه صريح بدل ما المريض يفتكر إنها وصلت */
        const ok = await insertRxRequestToSupabase(rx);
        if (!ok) {
          notifyRxSaveFailed();
          return false;
        }
        set({ rxQueue: [rx, ...get().rxQueue] });
        return true;
      },
      adminSetRx: async (id, status) => {
        const prev = get().rxQueue;
        const ok = await updateRxStatusInSupabase(id, status);
        if (!ok) {
          toast.error("تعذّر تحديث حالة الروشتة على السيرفر — الحالة زي ما هي. راجع الاتصال وحاول تاني", {
            duration: 7000,
          });
          return false;
        }
        set({
          rxQueue: prev.map((r) => (r.id === id ? { ...r, status } : r)),
        });
        return true;
      },

      reorder: (orderId) => {
        const order = get().myOrders.find((o) => o.id === orderId);
        if (!order) return;
        const cart = [...get().cart];
        order.items.forEach((i) => {
          /* نفس قاعدة addToCart: الكمية ما تعدّيش المخزون الحي أبدًا */
          const max = effStock(i.productId, get().stockAdj);
          if (max <= 0) return;
          const idx = cart.findIndex((c) => c.productId === i.productId);
          const cur = idx >= 0 ? cart[idx].qty : 0;
          const next = Math.min(cur + i.qty, max);
          if (next <= cur) return;
          if (idx >= 0) cart[idx] = { ...cart[idx], qty: next };
          else cart.push({ productId: i.productId, qty: next });
        });
        set({ cart, view: "cart" });
      },

      setCartOpen: (v) => set({ cartOpen: v }),
      setSearchOpen: (v, autoVoice) => set({ searchOpen: v, voiceSearchAutoStart: Boolean(autoVoice) }),
      setLoginOpen: (v) => set({ loginOpen: v }),
      setAdminAlarmPlaying: (v) => set({ adminAlarmPlaying: v }),
      stopAdminAlarm: () => {
        stopContinuousAdminAlarm();
      },
      setRxOpen: (v) => set({ rxOpen: v }),
      setConsultOpen: (v) => set({ consultOpen: v }),
      setIcOpen: (v) => set({ icOpen: v }),
      setInstallAppOpen: (v) => set({ installAppOpen: v }),

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
        if (c) {
          set({ appliedCoupon: norm });
          return true;
        }
        /* كارت خصم الولاء المكتسب بيُستخدم زي الكوبون بالكود بتاعه */
        const card = get().loyalty?.card;
        if (card && card.status === "active" && card.code.toUpperCase() === norm) {
          set({ appliedCoupon: norm });
          return true;
        }
        return false;
      },
      clearCoupon: () => set({ appliedCoupon: null }),

      subscribeCare: async ({
        planId = "monthly-rx",
        addons = [],
        name,
        phone,
        address,
        zoneId,
        dayPref,
        notes = "",
        prescriptionUrl = "",
      }) => {
        const today = new Date().toISOString().slice(0, 10);
        const next = nextDeliveryFor(dayPref, today);
        const memberNo = `M-${Math.floor(1000 + Math.random() * 9000)}`;
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
          notes: notes.trim(),
          prescriptionUrl,
        };
        const entry: CareSubscriber = {
          id: memberNo,
          nameAr: sub.name || "عميل أدوية شهرية",
          nameEn: sub.name || "Monthly client",
          phone: sub.phone,
          planId,
          address: sub.address,
          notes: sub.notes,
          prescriptionUrl: sub.prescriptionUrl,
          dayPref: sub.dayPref,
          since: sub.since,
          nextDelivery: sub.next,
          months: 1,
          status: "active",
        };
        /* السيرفر أولًا: الاشتراك ما بيظهرش كمُفعّل غير لو اتكتب فعلًا —
           فشل الكتابة كان بيخلي المشترك «موجود» عنده ومش موجود عند
           الصيدلية، فلا الطاقم يشوفه ولا استحقاق التوصيل المجاني يثبت */
        const saved = await insertCareSubToSupabase({
          memberNo: entry.id,
          planId,
          name: entry.nameAr,
          phone: entry.phone,
          address: sub.address,
          notes: sub.notes,
          prescriptionUrl: sub.prescriptionUrl,
          dayPref: sub.dayPref,
          status: "active",
        });
        if (!saved) {
          notifyCareSaveFailed();
          return false;
        }
        set({ careSub: sub, careSubs: [entry, ...get().careSubs.filter((s) => s.id !== entry.id)], careWizardPlan: null });
        if (prescriptionUrl) {
          const rx: RxRequest = {
            id: uniqueRecordId("RX"),
            customerAr: sub.name,
            customerEn: sub.name,
            phone: sub.phone,
            fileName: prescriptionUrl,
            date: today,
            status: "new",
            noteAr: `[عميل شهري ${memberNo}] ${notes}`,
            noteEn: `[Monthly client ${memberNo}] ${notes}`,
          };
          const rxOk = await insertRxRequestToSupabase(rx);
          if (rxOk) {
            set((s) => ({ rxQueue: [rx, ...s.rxQueue] }));
          } else {
            toast.warning("الاشتراك اتحفظ، بس صورة الروشتة ما اتبعتتش للسيرفر — الصيدلية هتطلبها منك", {
              duration: 7000,
            });
          }
        }
        return true;
      },
      refillMonthlyRx: async (patient: CareSubscriber) => {
        const orderId = generateOrderId();
        const order: Order = {
          id: orderId,
          date: new Date().toISOString().slice(0, 10),
          customerAr: patient.nameAr,
          customerEn: patient.nameEn || patient.nameAr,
          phone: patient.phone,
          address: patient.address || "العنوان مسجل في ملف الأدوية الشهرية",
          payment: "cod",
          status: "pending",
          mine: true,
          items: [
            {
              productId: "monthly-rx-refill",
              nameAr: "تكرار أدوية شهرية",
              nameEn: "Monthly Medicine Refill",
              qty: 1,
              price: 0,
            },
          ],
          total: 0,
          delivery: {
            type: "delivery",
            slotAr: "تكرار فوري لعلاج شهري",
            slotEn: "Instant Monthly Refill",
            fee: 0,
          },
        };
        /* السيرفر أولًا: نتيجة place_refill هي الحقيقة — فشلها (رقم
           مرفوض مثلًا) كان بيعدّي بصمت والطلب بيظهر للمريض وهو مش
           موجود عند الصيدلية. دلوقتي الفشل بيترمي كخطأ والمتصلين
           بيورّوا رسالة التعذّر، والطلب ما بيتحطش محليًا أصلًا */
        const ok = await submitRefillToSupabase({
          id: orderId,
          name: patient.nameAr,
          phone: patient.phone,
          address: order.address,
        });
        if (!ok) {
          throw new Error("refill_failed");
        }
        set((s) => ({
          myOrders: [order, ...s.myOrders],
          adminOrders: [order, ...(s.adminOrders || [])],
        }));
        return orderId;
      },
      pauseCare: async () => {
        const sub = get().careSub;
        if (!sub || sub.status === "paused") return;
        /* مسار المريض بيعدّي على care_self_update (السياسة المباشرة
           للطاقم بس) — الحالة المحلية ما بتتحركش غير بعد تأكيد الدالة */
        const ok = await careSelfUpdateInSupabase({ status: "paused" });
        if (!ok) {
          notifyCareSaveFailed();
          return;
        }
        set({
          careSub: { ...sub, status: "paused" },
          careSubs: get().careSubs.map((s) =>
            s.phone === sub.phone && s.planId === sub.planId && s.status === "active"
              ? { ...s, status: "paused" as const }
              : s
          ),
        });
      },
      resumeCare: async () => {
        const sub = get().careSub;
        if (!sub) return;
        const ok = await careSelfUpdateInSupabase({ status: "active" });
        if (!ok) {
          notifyCareSaveFailed();
          return;
        }
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
      cancelCare: async () => {
        const sub = get().careSub;
        if (!sub) return;
        const ok = await careSelfUpdateInSupabase({ status: "cancelled" });
        if (!ok) {
          notifyCareSaveFailed();
          return;
        }
        set({
          careSub: null,
          careSubs: get().careSubs.map((s) =>
            s.phone === sub.phone && s.planId === sub.planId && s.status !== "cancelled"
              ? { ...s, status: "cancelled" as const }
              : s
          ),
        });
      },
      changeCareDay: async (dayPref) => {
        const sub = get().careSub;
        if (!sub) return;
        /* تغيير يوم الصندوق كان محلي بس — دلوقتي بيتبعت لـ care_self_update
           وبيثبت على السيرفر، والفشل بيخلي اليوم زي ما هو مع تنبيه */
        const ok = await careSelfUpdateInSupabase({ dayPref });
        if (!ok) {
          notifyCareSaveFailed();
          return;
        }
        const next = nextDeliveryFor(dayPref, new Date().toISOString().slice(0, 10));
        set({
          careSub: { ...sub, dayPref, next },
          careSubs: get().careSubs.map((s) =>
            s.phone === sub.phone && s.planId === sub.planId ? { ...s, dayPref, nextDelivery: next } : s
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

      adminAdvance: async (orderId) => {
        const next = { pending: "ready", ready: "shipping", shipping: "delivered" } as const;
        const currentOrder = (get().adminOrders ?? []).find((o) => o.id === orderId);
        if (!currentOrder || !(currentOrder.status in next)) return false;
        const nextStatus = next[currentOrder.status as keyof typeof next];
        /* السيرفر الأول: الحالة المحلية ما بتتقدّمش غير بعد تأكيد الكتابة */
        const ok = await updateOrderStatusInSupabase(orderId, {
          status: nextStatus,
          ...(nextStatus === "delivered" ? { payment_status: "paid" } : {}),
        });
        if (!ok) {
          notifyOrderSaveFailed();
          return false;
        }
        set({
          adminOrders: (get().adminOrders ?? []).map((o) =>
            o.id === orderId ? { ...o, status: nextStatus } : o
          ),
        });
        return true;
      },
      adminCancel: async (orderId) => {
        const cur = (get().adminOrders ?? []).find((o) => o.id === orderId);
        /* terminal states never move again — a delivered order can't be cancelled */
        if (!cur || !canTransitionOrder(cur.status, "cancelled")) return false;
        const ok = await updateOrderStatusInSupabase(orderId, { status: "cancelled" });
        if (!ok) {
          notifyOrderSaveFailed();
          return false;
        }
        set({
          adminOrders: (get().adminOrders ?? []).map((o) =>
            o.id === orderId ? { ...o, status: "cancelled" } : o
          ),
        });
        return true;
      },
      adminAssignDriver: async (orderId, driverId) => {
        const ok = await updateOrderStatusInSupabase(orderId, { courier_id: driverId });
        if (!ok) {
          notifyOrderSaveFailed();
          return false;
        }
        set({
          adminOrders: (get().adminOrders ?? []).map((o) =>
            o.id === orderId
              ? { ...o, delivery: { type: "delivery" as const, ...o.delivery, driverId } }
              : o
          ),
        });
        return true;
      },

      /* ---- staff portals ---- */
      courierPickup: async (orderId) => {
        const cur =
          (get().adminOrders ?? []).find((o) => o.id === orderId) ??
          get().myOrders.find((o) => o.id === orderId);
        /* guard: الاستلام من ready (بعد التجهيز) — أو pending مباشرة لطلبات قبل خطوة التجهيز */
        if (!cur || !canTransitionOrder(cur.status, "shipping")) return false;
        const ok = await updateOrderStatusInSupabase(orderId, { status: "shipping" });
        if (!ok) {
          notifyOrderSaveFailed();
          return false;
        }
        const patch = (list: Order[]) =>
          list.map((o) =>
            o.id === orderId && (o.status === "ready" || o.status === "pending")
              ? { ...o, status: "shipping" as const }
              : o
          );
        set({
          adminOrders: patch(get().adminOrders ?? []),
          myOrders: patch(get().myOrders),
        });
        return true;
      },
      courierDeliver: async (orderId) => {
        const cur =
          (get().adminOrders ?? []).find((o) => o.id === orderId) ??
          get().myOrders.find((o) => o.id === orderId);
        /* guard: only shipping → delivered (a cancelled order can't be resurrected as delivered) */
        if (!cur || !canTransitionOrder(cur.status, "delivered")) return false;
        /* السيرفر الأول: الجرس ورسالة النجاح ما بيحصلوش غير بعد تأكيد التسليم */
        const ok = await updateOrderStatusInSupabase(orderId, { status: "delivered", payment_status: "paid" });
        if (!ok) {
          notifyOrderSaveFailed();
          return false;
        }
        playDoorbellDingDong(); // doorbell chime at customer arrival
        if (typeof window !== "undefined") {
          toast.success("🔔 تم تسليم الطلب للعميل بنجاح!", {
            description: "صوت جرس الباب يعمل الآن لتنبيه العميل بوصول الطلب",
            duration: 6000,
          });
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("صيدلية بحبح — تم تسليم طلبك!", {
                body: "تم تسليم الطلب بنجاح. نتمنى لكم دوام الصحة والعافية!",
                icon: "/images/bahbah-badge.png",
              });
            } catch {}
          }
        }
        const patch = (list: Order[]) =>
          list.map((o) => (o.id === orderId && o.status === "shipping" ? { ...o, status: "delivered" as const } : o));
        set({
          adminOrders: patch(get().adminOrders ?? []),
          myOrders: patch(get().myOrders),
        });
        return true;
      },
      /* ---- تسليم مع تحصيل (التوريد): سجل الفلوس بيثبت في السيرفر الأول،
         ولو فشل التسجيل التسليم ما بيكملش — عشان مفيش جنيه يضيع من غير أثر.
         معرّف السجل مشتق من رقم الطلب فإعادة المحاولة ما بتكررش السجل. ---- */
      courierDeliverWithCollection: async (orderId, input) => {
        const st = get();
        const cur =
          (st.adminOrders ?? []).find((o) => o.id === orderId) ??
          st.myOrders.find((o) => o.id === orderId);
        if (!cur || !canTransitionOrder(cur.status, "delivered")) return false;

        const amount = Number(input.amount);
        if (!Number.isFinite(amount) || amount < 0) {
          toast.error("اكتب المبلغ اللي استلمته من العميل بالظبط قبل التسليم", { duration: 7000 });
          return false;
        }
        if (
          input.method === "wallet" &&
          (!input.walletFrom?.trim() || !input.walletTo?.trim())
        ) {
          toast.error("المحفظة الإلكترونية لازم يتسجل اتحولت من رقم إيه ولحساب إيه", {
            duration: 7000,
          });
          return false;
        }

        const collection: CourierCollection = {
          id: `COL-${orderId}`,
          orderId,
          courierId: st.user?.driverId,
          courierEmail: st.user?.email,
          courierName: st.user?.name,
          amount,
          method: input.method,
          walletFrom: input.walletFrom?.trim() || undefined,
          walletTo: input.walletTo?.trim() || undefined,
          note: input.note?.trim() || undefined,
          createdAt: new Date().toISOString(),
        };
        const { row, error } = await insertCourierCollectionToSupabase(collection);
        /* duplicate = السجل موجود أصلًا من محاولة سابقة — كمّل التسليم عادي */
        const alreadyRecorded = !!error && /duplicate|unique/i.test(error);
        if (!row && !alreadyRecorded) {
          toast.error(
            "ما قدرناش نسجّل التحصيل في النظام — الطلب لسه «في الطريق» ومفيش فلوس هتضيع. راجع النت وحاول تاني، ولو المشكلة فضلت كلّم المدير",
            { duration: 10000 }
          );
          return false;
        }
        if (row) {
          set({ courierCollections: [collection, ...get().courierCollections] });
        }
        /* التسليم نفسه لازم يثبت في السيرفر — نتيجته هي نتيجة العملية كلها */
        return get().courierDeliver(orderId);
      },

      /* ---- دفتر عناوين العميل: محلي أولًا (بيتحفظ على الجهاز) + كتابة
         للسيرفر في الخلفية. السيرفر هو المرجع عند تسجيل الدخول. ---- */
      addSavedAddress: (a) => {
        const list = get().savedAddresses;
        const addr: SavedAddress = {
          ...a,
          id: a.id ?? `ADDR-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
          isDefault: a.isDefault || list.length === 0,
          updatedAt: new Date().toISOString(),
        };
        const demoted = addr.isDefault
          ? list.filter((x) => x.isDefault).map((x) => ({ ...x, isDefault: false }))
          : [];
        set({
          savedAddresses: [
            addr,
            ...list.map((x) => (x.isDefault && addr.isDefault ? { ...x, isDefault: false } : x)),
          ],
        });
        /* المزامنة بقى ليها نتيجة: فشل الحفظ على السيرفر بيورّي تحذير
           بدل ما العنوان «يتحفظ» محليًا بس ويختفي من أي جهاز تاني */
        void upsertCustomerAddressToSupabase(addr).then((ok) => {
          if (!ok) notifyAddressSyncFailed();
        });
        demoted.forEach((d) => void upsertCustomerAddressToSupabase(d));
        return addr;
      },
      updateSavedAddress: (id, patch) => {
        const list = get().savedAddresses;
        const cur = list.find((x) => x.id === id);
        if (!cur) return;
        const next: SavedAddress = { ...cur, ...patch, updatedAt: new Date().toISOString() };
        const demoted =
          patch.isDefault === true
            ? list.filter((x) => x.id !== id && x.isDefault).map((x) => ({ ...x, isDefault: false }))
            : [];
        set({
          savedAddresses: get().savedAddresses.map((x) =>
            x.id === id ? next : patch.isDefault === true ? { ...x, isDefault: false } : x
          ),
        });
        void upsertCustomerAddressToSupabase(next).then((ok) => {
          if (!ok) notifyAddressSyncFailed();
        });
        demoted.forEach((d) => void upsertCustomerAddressToSupabase(d));
      },
      deleteSavedAddress: async (id) => {
        const list = get().savedAddresses;
        const prevLastAddressId = get().lastAddressId;
        const gone = list.find((x) => x.id === id);
        if (!gone) return;
        let rest = list.filter((x) => x.id !== id);
        let promoted: SavedAddress | undefined;
        if (gone.isDefault && rest.length > 0) {
          promoted = { ...rest[0], isDefault: true, updatedAt: new Date().toISOString() };
          rest = rest.map((x) => (x.id === promoted!.id ? promoted! : x));
        }
        set({
          savedAddresses: rest,
          ...(prevLastAddressId === id ? { lastAddressId: rest[0]?.id ?? null } : {}),
        });
        /* الحذف بقى مؤكد: فشل حذف السيرفر بيرجّع العنوان زي ما كان —
           قبله كان «بيتمسح» من الشاشة ويرجع من السيرفر عند تسجيل الدخول */
        const ok = await deleteCustomerAddressFromSupabase(id);
        if (!ok) {
          set({ savedAddresses: list, lastAddressId: prevLastAddressId });
          toast.error("تعذّر حذف العنوان من السيرفر — العنوان رجع زي ما هو. راجع الاتصال وحاول تاني", {
            duration: 7000,
          });
          return;
        }
        if (promoted) void upsertCustomerAddressToSupabase(promoted);
      },
      setDefaultSavedAddress: (id) => {
        get().updateSavedAddress(id, { isDefault: true });
      },
      pharmacistReady: async (orderId) => {
        /* medicine is packed — the order becomes «تم التجهيز» (ready) and waits for
           the assigned courier to pick it up (courierPickup moves it to shipping).
           Server-confirmed exactly like the other order actions: the local status
           moves only after updateOrderStatusInSupabase confirms the write. */
        const st = get();
        const cur =
          (st.adminOrders ?? []).find((o) => o.id === orderId) ??
          st.myOrders.find((o) => o.id === orderId);
        if (!cur || !canTransitionOrder(cur.status, "ready")) return false;
        const ok = await updateOrderStatusInSupabase(orderId, {
          status: "ready",
          ...(st.user?.email ? { pharmacist_id: st.user.email } : {}),
        });
        if (!ok) {
          notifyOrderSaveFailed();
          return false;
        }
        const patch = (list: Order[]) =>
          list.map((o) => (o.id === orderId && o.status === "pending" ? { ...o, status: "ready" as const } : o));
        set({
          adminOrders: patch(get().adminOrders ?? []),
          myOrders: patch(get().myOrders),
        });
        return true;
      },

      restock: async (productId, qty) => {
        const prev = get().stockAdj;
        const next = { ...prev, [productId]: (prev[productId] ?? 0) + qty };
        set({ stockAdj: next });
        const ok = await syncAdminSettingsToSupabase({ stock_adj: next });
        if (!ok) {
          set({ stockAdj: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      setPrice: async (productId, price) => {
        const prev = get().priceOverride;
        const next = { ...prev, [productId]: price };
        set({ priceOverride: next });
        const ok = await syncAdminSettingsToSupabase({ price_override: next });
        if (!ok) {
          set({ priceOverride: prev });
          notifySettingsSaveFailed();
        }
        /* ملحوظة: الـ price_override ده هو أول مصدر بيقرأه place_order على السيرفر،
           فالسعر بيثبت عند الدفع. تعديل جدول products نفسه بيتم من كارت المنتج
           (admin_set_price) ومن زر رفع الكتالوج في لوحة الصيانة. */
        return ok;
      },
      addAdminProduct: async (p) => {
        const prev = get().customProducts;
        const next = [p, ...prev];
        set({ customProducts: next });
        const ok = await syncAdminSettingsToSupabase({ custom_products: next });
        if (!ok) {
          set({ customProducts: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      addDriver: async (d) => {
        const prev = get().customDrivers || [];
        const next = [d, ...prev];
        set({ customDrivers: next });
        /* المندوب لازم يوجد على السيرفر (عمود custom_drivers في admin_settings)
           عشان يظهر لباقي الأجهزة ويتقدر يتعيّن على طلبات حقيقية — مش محلي بس */
        const ok = await syncAdminSettingsToSupabase({ custom_drivers: next });
        if (!ok) {
          set({ customDrivers: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      removeDriver: async (driverId) => {
        const prevDrivers = get().customDrivers || [];
        const prevStatus = get().driverStatus;
        const prevRemoved = get().driverRemoved;
        const nextDrivers = prevDrivers.filter((d) => d.id !== driverId);
        const nextStatus = { ...prevStatus };
        delete nextStatus[driverId];
        /* الإزالة على مستويين: المندوب المخصص بيتمسح من custom_drivers،
           وأي مندوب (مخصص أو افتراضي) بيتحط في driver_removed فبيختفي
           من قوائم التعيين على كل الأجهزة — الكل بيتزامن في كتابة واحدة
           مؤكدة، والفشل بيرجّع كل حاجة زي ما كانت */
        const nextRemoved = prevRemoved.includes(driverId)
          ? prevRemoved
          : [...prevRemoved, driverId];
        set({ customDrivers: nextDrivers, driverStatus: nextStatus, driverRemoved: nextRemoved });
        const ok = await syncAdminSettingsToSupabase({
          custom_drivers: nextDrivers,
          driver_status: nextStatus,
          driver_removed: nextRemoved,
        });
        if (!ok) {
          set({ customDrivers: prevDrivers, driverStatus: prevStatus, driverRemoved: prevRemoved });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      updateProductImage: async (productId, img, verified) => {
        const prev = get().productImgOverride;
        const next = { ...prev, [productId]: { img, verified: verified ?? true } };
        set({ productImgOverride: next });
        /* التوصيلة الصح: التعديلات بتتخزن في عمود img_override المخصص لها —
           كانت بتتزامن غلط مع custom_products فكانت بتضيع عند أي تحميل من السيرفر */
        const ok = await syncAdminSettingsToSupabase({ img_override: next });
        if (!ok) {
          set({ productImgOverride: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },

      cycleDriverStatus: async (driverId) => {
        const order: DriverStatus[] = ["available", "busy", "offline"];
        const prev = get().driverStatus;
        const cur = prev[driverId] ?? demoDrivers.find((d) => d.id === driverId)?.status ?? "available";
        const nextStatus = order[(order.indexOf(cur) + 1) % order.length];
        const next = { ...prev, [driverId]: nextStatus };
        set({ driverStatus: next });
        const ok = await syncAdminSettingsToSupabase({ driver_status: next });
        if (!ok) {
          set({ driverStatus: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      saveCourierMsgTemplates: async (list) => {
        const prev = get().courierMsgTemplates;
        const next = list.map((s) => s.trim()).filter((s) => s.length > 0).slice(0, 12);
        set({ courierMsgTemplates: next });
        /* الرسائل لازم توصل لكل أجهزة المناديب والطاقم — بتتخزن في عمود
           courier_msg_templates وبتتوزع من get_public_settings */
        const ok = await syncAdminSettingsToSupabase({ courier_msg_templates: next });
        if (!ok) {
          set({ courierMsgTemplates: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      toggleZone: async (zoneId) => {
        const prev = get().zoneDisabled;
        const next = prev.includes(zoneId)
          ? prev.filter((z) => z !== zoneId)
          : [...prev, zoneId];
        set({ zoneDisabled: next });
        /* قفل/فتح المنطقة بيتحفظ في السيرفر (عمود zone_disabled) فبيوصل
           لواجهات العملاء كلها — مش بيقفل على جهاز المدير بس */
        const ok = await syncAdminSettingsToSupabase({ zone_disabled: next });
        if (!ok) {
          set({ zoneDisabled: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      updateSettings: async (patch) => {
        const prev = get().settings;
        const next = { ...prev, ...patch };
        set({ settings: next });
        const role = get().sessionRole;
        /* حالة فتح/قفل المحل واستقبال الطلبات لازم توصل لكل واجهات العملاء:
           بنزامن كائن الإعدادات كله لـ admin_settings في patch معزول — لو العمود
           مش موجود لسه على المشروع، الفشل بيتلوج بس ومش بيكسر أي مزامنة تانية،
           والسلوك المحلي بيكمل زي ما هو. */
        if (role === "admin" || role === "pharmacist") {
          const ok = await syncAdminSettingsToSupabase({ settings: next });
          if (!ok) {
            /* رجّع مفاتيح الـ patch بس لآخر قيم مؤكدة — أي تعديل تاني نجح في
               نفس الوقت ما يتأثرش */
            const reverted = { ...get().settings };
            for (const k of Object.keys(patch) as Array<keyof AdminSettings>) {
              (reverted as Record<string, unknown>)[k] = prev[k];
            }
            set({ settings: reverted });
            notifySettingsSaveFailed();
            return false;
          }
        }
        return true;
      },
      toggleCouponActive: async (code) => {
        const prev = get().coupons;
        const next = prev.map((c) =>
          c.code === code ? { ...c, active: !c.active } : c
        );
        set({ coupons: next });
        const ok = await syncAdminSettingsToSupabase({ coupons: next });
        if (!ok) {
          set({ coupons: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      addCoupon: async (c) => {
        const prev = get().coupons;
        const next = [c, ...prev];
        set({ coupons: next });
        const ok = await syncAdminSettingsToSupabase({ coupons: next });
        if (!ok) {
          set({ coupons: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      removeCoupon: async (code) => {
        const prev = get().coupons;
        const next = prev.filter((c) => c.code !== code);
        if (next.length === prev.length) return false;
        set({ coupons: next });
        const ok = await syncAdminSettingsToSupabase({ coupons: next });
        if (!ok) {
          set({ coupons: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      adminUpdateCollection: async (id, patch) => {
        const prev = get().courierCollections;
        const ok = await updateCourierCollectionInSupabase(id, patch);
        if (!ok) {
          toast.error("تعذّر تصحيح سجل التحصيل على السيرفر — السجل زي ما هو. راجع الاتصال وحاول تاني", {
            duration: 7000,
          });
          return false;
        }
        set({
          courierCollections: prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
                  ...(patch.note !== undefined ? { note: patch.note } : {}),
                }
              : c
          ),
        });
        return true;
      },
      adminDeleteCollection: async (id) => {
        const prev = get().courierCollections;
        const ok = await deleteCourierCollectionFromSupabase(id);
        if (!ok) {
          toast.error("تعذّر حذف سجل التحصيل من السيرفر — السجل زي ما هو. راجع الاتصال وحاول تاني", {
            duration: 7000,
          });
          return false;
        }
        set({ courierCollections: prev.filter((c) => c.id !== id) });
        return true;
      },
      toggleAd: async (adId) => {
        const prev = get().adsOff;
        const next = prev.includes(adId) ? prev.filter((a) => a !== adId) : [...prev, adId];
        set({ adsOff: next });
        const ok = await syncAdminSettingsToSupabase({ ads_off: next });
        if (!ok) {
          set({ adsOff: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      toggleCareSubStatus: async (id) => {
        const item = get().careSubs.find((s) => s.id === id);
        if (!item) return false;
        const nextStatus = item.status === "active" ? "paused" : "active";
        /* تأكيد سيرفر أولًا: التبديل كان بيتحرك محليًا والحفظ بيضيع،
           فبيانات المدير بتختلف عن السيرفر بصمت */
        const ok = await updateCareSubStatusInSupabase(id, nextStatus);
        if (!ok) {
          notifyCareSaveFailed();
          return false;
        }
        set({
          careSubs: get().careSubs.map((s) =>
            s.id === id ? { ...s, status: nextStatus } : s
          ),
        });
        return true;
      },
      cancelCareSub: async (id) => {
        const item = get().careSubs.find((s) => s.id === id);
        if (!item || item.status === "cancelled") return false;
        const ok = await updateCareSubStatusInSupabase(id, "cancelled");
        if (!ok) {
          notifyCareSaveFailed();
          return false;
        }
        set({
          careSubs: get().careSubs.map((s) =>
            s.id === id ? { ...s, status: "cancelled" as const } : s
          ),
        });
        return true;
      },
      addMeasurement: async (m) => {
        /* معرّف فريد ضد التصادم: الصيغة القديمة (آخر 6 أرقام من الوقت)
           كان ممكن تصادمها بين قياسين قريبين فقياس يضيع على السيرفر */
        const id = uniqueRecordId("MEAS");
        const recordedAt = new Date().toISOString();
        let bmi: number | undefined = undefined;
        if (m.weight && m.height && m.height > 0) {
          const hM = m.height / 100;
          bmi = Number((m.weight / (hM * hM)).toFixed(1));
        }
        const newRecord: PatientMeasurement = {
          ...m,
          id,
          recordedAt,
          bmi: m.bmi ?? bmi,
        };
        set({ measurements: [newRecord, ...get().measurements] });
        /* الحفظ بقى مؤكد: فشل الكتابة بيشيل القياس من الشاشة + تنبيه،
           بدل قياس «موجود» عند الطاقم ومش موجود على السيرفر */
        const ok = await insertMeasurementToSupabase(newRecord);
        if (!ok) {
          set({ measurements: get().measurements.filter((x) => x.id !== id) });
          toast.error("تعذّر حفظ القياس على السيرفر — القياس ما اتسجلش. راجع الاتصال وحاول تاني", {
            duration: 7000,
          });
        }
        return id;
      },
      deleteMeasurement: async (id) => {
        const prev = get().measurements;
        const target = prev.find((m) => m.id === id);
        if (!target) return false;
        set({ measurements: prev.filter((m) => m.id !== id) });
        /* الحذف لازم يوصل السيرفر: قبله كان محلي بس فالقياس «المحذوف»
           بيرجع مع أول جلب من السيرفر كأنه ما اتحذفش أبدًا */
        const ok = await deleteMeasurementFromSupabase(id);
        if (!ok) {
          set({ measurements: prev });
          toast.error("تعذّر حذف القياس من السيرفر — القياس رجع زي ما هو. راجع الاتصال وحاول تاني", {
            duration: 7000,
          });
          return false;
        }
        return true;
      },

      /* ---- طلب سريع بواتساب: بيتسجل في السيرفر الأول وبعدين واتساب يفتح ---- */
      createWhatsappOrder: async ({ items, total, phone, name }) => {
        const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        for (let attempt = 0; attempt < 3; attempt++) {
          let suffix = "";
          for (let i = 0; i < 4; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
          const order: WhatsappOrder = {
            id: `WA-${Date.now().toString(36)}${attempt}`,
            code: `BH-${suffix}`,
            phone: phone || "",
            name: name || "",
            items,
            total,
            status: "sent",
            createdAt: new Date().toISOString(),
          };
          const { row, error } = await insertWhatsappOrderToSupabase(order);
          if (row) {
            set({ whatsappOrders: [order, ...get().whatsappOrders] });
            return order.code;
          }
          /* كود مكرر = محاولة تانية بكود جديد، أي خطأ تاني = إيقاف */
          if (!error || !/duplicate|unique/i.test(error)) return null;
        }
        return null;
      },
      setWhatsappOrderStatus: async (id, status) => {
        const ok = await updateWhatsappOrderStatusInSupabase(id, status);
        if (ok) {
          set({
            whatsappOrders: get().whatsappOrders.map((w) => (w.id === id ? { ...w, status } : w)),
          });
        }
        /* بترجّع النتيجة للمكوّن عشان يورّي تنبيه عند الفشل بدل الصمت */
        return ok;
      },

      /* ---- طلب ناقص: بيتسجل في السيرفر الأول بكود تتبع، وبعدين واتساب يفتح ---- */
      createShortageRequest: async ({ itemName, barcode, photoUrl, source, phone, name }) => {
        const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        for (let attempt = 0; attempt < 3; attempt++) {
          let suffix = "";
          for (let i = 0; i < 4; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
          const req: ShortageRequest = {
            id: `SH-${Date.now().toString(36)}${attempt}`,
            code: `BH-${suffix}`,
            phone: phone || "",
            name: name || "",
            itemName,
            barcode,
            photoUrl,
            source,
            status: "pending",
            createdAt: new Date().toISOString(),
          };
          const { row, error } = await insertShortageRequestToSupabase(req);
          if (row) {
            set({ shortageRequests: [req, ...get().shortageRequests] });
            return req.code;
          }
          /* كود مكرر = محاولة تانية بكود جديد، أي خطأ تاني = إيقاف */
          if (!error || !/duplicate|unique/i.test(error)) return null;
        }
        return null;
      },
      setShortageRequestStatus: async (id, status) => {
        const ok = await updateShortageRequestStatusInSupabase(id, status);
        if (ok) {
          set({
            shortageRequests: get().shortageRequests.map((r) => (r.id === id ? { ...r, status } : r)),
          });
        }
        return ok;
      },

      /* ---- خدمات تمريضية: الحجز بيتسجل في السيرفر الأول بكود تتبع ---- */
      createNursingRequest: async ({ service, visitFee, zoneId, address, preferredAt, notes, phone, name }) => {
        const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        for (let attempt = 0; attempt < 3; attempt++) {
          let suffix = "";
          for (let i = 0; i < 4; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
          const req: NursingRequest = {
            id: `NR-${Date.now().toString(36)}${attempt}`,
            code: `BH-${suffix}`,
            phone: phone || "",
            name: name || "",
            serviceId: service.id,
            serviceNameAr: service.nameAr,
            serviceNameEn: service.nameEn,
            serviceKind: service.kind,
            servicePrice: service.price,
            visitFee,
            total: service.price + visitFee,
            zoneId,
            address,
            preferredAt,
            notes,
            status: "new",
            createdAt: new Date().toISOString(),
          };
          const { row, error } = await insertNursingRequestToSupabase(req);
          if (row) {
            set({ nursingRequests: [req, ...get().nursingRequests] });
            return req.code;
          }
          /* كود مكرر = محاولة تانية بكود جديد، أي خطأ تاني = إيقاف */
          if (!error || !/duplicate|unique/i.test(error)) return null;
        }
        return null;
      },
      setNursingRequestStatus: async (id, status) => {
        const ok = await updateNursingRequestInSupabase(id, { status });
        if (ok) {
          set({
            nursingRequests: get().nursingRequests.map((r) => (r.id === id ? { ...r, status } : r)),
          });
        }
        return ok;
      },
      completeNursingVisit: async (id, measured) => {
        const req = get().nursingRequests.find((r) => r.id === id);
        if (!req) return false;
        /* خدمة قياس؟ النتيجة بتتسجل في «قياساتي» الأول (نفس مخزن الملف
           الموحد — patient_measurements) وبنربط سجل القياس بالحجز. */
        let measurementId: string | undefined;
        const hasValue =
          (req.serviceKind === "sugar" && measured?.sugar != null) ||
          (req.serviceKind === "bp" && (measured?.systolic != null || measured?.diastolic != null));
        if (hasValue) {
          measurementId = await get().addMeasurement({
            /* نفس اصطلاح الصيدلي: كود المريض BB-آخر ٤ أرقام من التليفون */
            patientCode: `BB-${(req.phone || "").replace(/\D/g, "").slice(-4) || "P"}`,
            patientName: req.name || "عميل بحبح",
            patientPhone: req.phone || "",
            bloodSugar: req.serviceKind === "sugar" ? measured?.sugar : undefined,
            systolic: req.serviceKind === "bp" ? measured?.systolic : undefined,
            diastolic: req.serviceKind === "bp" ? measured?.diastolic : undefined,
            pharmacistNotes: `قياس من زيارة تمريض منزلية — حجز ${req.code}`,
            recordedBy: "nursing",
          });
        }
        const ok = await updateNursingRequestInSupabase(id, {
          status: "done",
          measuredSugar: req.serviceKind === "sugar" ? measured?.sugar : undefined,
          measuredSystolic: req.serviceKind === "bp" ? measured?.systolic : undefined,
          measuredDiastolic: req.serviceKind === "bp" ? measured?.diastolic : undefined,
          measurementId,
        });
        if (ok) {
          set({
            nursingRequests: get().nursingRequests.map((r) =>
              r.id === id
                ? {
                    ...r,
                    status: "done" as const,
                    measuredSugar: req.serviceKind === "sugar" ? measured?.sugar : r.measuredSugar,
                    measuredSystolic: req.serviceKind === "bp" ? measured?.systolic : r.measuredSystolic,
                    measuredDiastolic: req.serviceKind === "bp" ? measured?.diastolic : r.measuredDiastolic,
                    measurementId: measurementId ?? r.measurementId,
                  }
                : r
            ),
          });
        }
        return ok;
      },
      setNursingOpen: (v) => set({ nursingOpen: v }),
      setShortageOpen: (v, prefill) =>
        set({ shortageOpen: v, shortagePrefill: v ? (prefill ?? null) : null }),

      /* ---- admin password gate & CMS editors ---- */
      lockAdmin: () => {
        set({ adminUnlocked: false, sessionRole: null, user: null });
        signOutFromSupabase();
      },
      updateSiteEdits: async (patch) => {
        const prev = get().siteEdits;
        const next = { ...prev, ...patch };
        set({ siteEdits: next });
        const ok = await syncAdminSettingsToSupabase({ site_edits: next });
        if (!ok) {
          set({ siteEdits: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      updateAdEdit: async (id, patch) => {
        const prev = get().adEdits;
        const next = { ...prev, [id]: { ...prev[id], ...patch } };
        set({ adEdits: next });
        const ok = await syncAdminSettingsToSupabase({ ad_edits: next });
        if (!ok) {
          set({ adEdits: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      updateOfferEdit: async (id, patch) => {
        const prev = get().offerEdits;
        const next = { ...prev, [id]: { ...prev[id], ...patch } };
        set({ offerEdits: next });
        /* العروض كانت محلية بس رغم إن الواجهة بتقول «اتنشر في شاشات العملاء» —
           دلوقتي بتتخزن في عمود offer_edits على السيرفر زي باقي التعديلات */
        const ok = await syncAdminSettingsToSupabase({ offer_edits: next });
        if (!ok) {
          set({ offerEdits: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      updateCareEdit: async (id, patch) => {
        const prev = get().careEdits;
        const next = { ...prev, [id]: { ...prev[id], ...patch } };
        set({ careEdits: next });
        const ok = await syncAdminSettingsToSupabase({ care_edits: next });
        if (!ok) {
          set({ careEdits: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      updateZoneEdit: async (id, patch) => {
        const prev = get().zoneEdits;
        const next = { ...prev, [id]: { ...prev[id], ...patch } };
        set({ zoneEdits: next });
        const ok = await syncAdminSettingsToSupabase({ zone_edits: next });
        if (!ok) {
          set({ zoneEdits: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      updateNursingEdit: async (id, patch) => {
        const prev = get().nursingEdits;
        const next = { ...prev, [id]: { ...prev[id], ...patch } };
        set({ nursingEdits: next });
        const ok = await syncAdminSettingsToSupabase({ nursing_edits: next });
        if (!ok) {
          set({ nursingEdits: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      addNursingService: async (s) => {
        const svc: NursingService = {
          ...s,
          id: `svc-${Date.now().toString(36)}`,
          active: true,
        };
        const prev = get().nursingCustom;
        const next = [...prev, svc];
        set({ nursingCustom: next });
        const ok = await syncAdminSettingsToSupabase({ nursing_custom: next });
        if (!ok) {
          set({ nursingCustom: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      updateNursingCustom: async (id, patch) => {
        const prev = get().nursingCustom;
        const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
        set({ nursingCustom: next });
        const ok = await syncAdminSettingsToSupabase({ nursing_custom: next });
        if (!ok) {
          set({ nursingCustom: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      deleteNursingCustom: async (id) => {
        const prev = get().nursingCustom;
        const next = prev.filter((s) => s.id !== id);
        set({ nursingCustom: next });
        const ok = await syncAdminSettingsToSupabase({ nursing_custom: next });
        if (!ok) {
          set({ nursingCustom: prev });
          notifySettingsSaveFailed();
        }
        return ok;
      },
      resetAdminDemo: () => {
        /* صلاحية حقيقية بس: جلسة Supabase موثّقة بدور admin (مش مجرد state محلي) */
        if (get().sessionRole !== "admin") return;
        set({
          adminOrders: [],
          myOrders: [],
          lastOrderId: null,
          customProducts: [],
          stockAdj: {},
          priceOverride: {},
          driverStatus: {},
          driverRemoved: [],
          zoneDisabled: [],
          settings: DEFAULT_SETTINGS,
          rxQueue: [],
          coupons: demoCoupons,
          couponOff: [],
          adsOff: [],
          careSubs: [],
          measurements: [],
        });
        syncAdminSettingsToSupabase({
          stock_adj: {},
          price_override: {},
          custom_products: [],
          custom_drivers: [],
          driver_status: {},
          driver_removed: [],
        });
        /* ⚠️ الزر ده بيصفّر الحالة المحلية بس. كان زمان بيمسح جداول الطلبات والروشتات
           والاشتراكات والقياسات من قاعدة الإنتاج مباشرة من المتصفح (فقدان بيانات عملاء
           حقيقيين بضغطة). أي مسح من السحابة لازم يتعمل من لوحة Supabase بشكل واعي. */
      },
    }),
    {
      name: "bahbah-store",
      version: 4,
      /* v3 → v4: production launch — purge all demo orders, demo rx, and demo subscriptions */
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
        return {
          ...p,
          myOrders: [],
          adminOrders: [],
          rxQueue: [],
          careSubs: [],
        } as unknown as BahbahState;
      },
      partialize: (s) => ({
        lang: s.lang,
        cart: s.cart,
        favorites: s.favorites,
        user: s.user,
        myOrders: s.myOrders,
        savedAddresses: s.savedAddresses,
        lastAddressId: s.lastAddressId,
        loyalty: s.loyalty,
        accountTab: s.accountTab,
        bigText: s.bigText,
        elderMode: s.elderMode,
        careSub: s.careSub,
        adminOrders: s.adminOrders,
        customProducts: s.customProducts,
        customDrivers: s.customDrivers,
        productImgOverride: s.productImgOverride,
        stockAdj: s.stockAdj,
        priceOverride: s.priceOverride,
        driverStatus: s.driverStatus,
        driverRemoved: s.driverRemoved,
        courierMsgTemplates: s.courierMsgTemplates,
        zoneDisabled: s.zoneDisabled,
        settings: s.settings,
        rxQueue: s.rxQueue,
        coupons: s.coupons,
        adsOff: s.adsOff,
        careSubs: s.careSubs,
        measurements: s.measurements,
        siteEdits: s.siteEdits,
        adEdits: s.adEdits,
        careEdits: s.careEdits,
        zoneEdits: s.zoneEdits,
        nursingEdits: s.nursingEdits,
        nursingCustom: s.nursingCustom,
        catalogView: s.catalogView,
        sortKey: s.sortKey,
        sortDir: s.sortDir,
        filters: s.filters,
        demoMode: s.demoMode,
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
  priceOverride: Record<string, number>,
  productImgOverride: Record<string, { img: string; verified?: boolean }> = {}
): Product[] {
  const all = [...customProducts, ...baseProducts];
  return all.map((p) => {
    const imgOver = productImgOverride[p.id];
    return {
      ...p,
      stock: Math.max(0, p.stock + (stockAdj[p.id] ?? 0)),
      price: priceOverride[p.id] ?? p.price,
      img: imgOver?.img !== undefined ? imgOver.img : p.img,
      verifiedPhoto: imgOver?.verified !== undefined ? imgOver.verified : p.verifiedPhoto,
    };
  });
}

export const useAdminProducts = () => {
  const custom = useBahbah((s) => s.customProducts);
  const adj = useBahbah((s) => s.stockAdj);
  const price = useBahbah((s) => s.priceOverride);
  const imgOver = useBahbah((s) => s.productImgOverride) || {};
  return mergeAdminProducts(custom, adj, price, imgOver);
};

export const useDrivers = () => {
  const custom = useBahbah((s) => s.customDrivers) || [];
  const removed = useBahbah((s) => s.driverRemoved) || [];
  /* المندوب المُزال بيختفي من كل قايمة تعيين — مش بس من شاشة المدير */
  return [...custom, ...demoDrivers].filter((d) => !removed.includes(d.id));
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
        img: e.img?.trim() || s.img,
        titleKeyAr: e.titleAr?.trim() || s.titleKeyAr,
        titleKeyEn: e.titleEn?.trim() || s.titleKeyEn,
        subKeyAr: e.subAr?.trim() || s.subKeyAr,
        subKeyEn: e.subEn?.trim() || s.subKeyEn,
        badgeAr: e.badgeAr?.trim() || s.badgeAr,
        badgeEn: e.badgeEn?.trim() || s.badgeEn,
        ctaKeyAr: e.ctaAr?.trim() || s.ctaKeyAr,
        ctaKeyEn: e.ctaEn?.trim() || s.ctaKeyEn,
        showFrom: typeof e.showFrom === "number" ? e.showFrom : s.showFrom,
        showTo: typeof e.showTo === "number" ? e.showTo : s.showTo,
      };
    });
}

/** الساعة دلوقتي — بتتحدث كل دقيقة (للنوافذ الزمنية والهيدر الليلي) */
export function useNow(stepMs = 60000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), stepMs);
    return () => clearInterval(id);
  }, [stepMs]);
  return now;
}

export const useAdSlides = () => {
  const adsOff = useBahbah((s) => s.adsOff);
  const adEdits = useBahbah((s) => s.adEdits);
  const now = useNow();
  const hour = now.getHours();
  return applyAdEdits(adsOff, adEdits).filter((s) => {
    if (typeof s.showFrom !== "number" || typeof s.showTo !== "number") return true;
    return hourInWindow(hour, s.showFrom, s.showTo);
  });
};

export const useOffers = () => {
  const allProducts = useAdminProducts();
  const offerEdits = useBahbah((s) => s.offerEdits) || {};

  return allProducts
    .map((p) => {
      const e = offerEdits[p.id];
      if (!e) return p;
      return {
        ...p,
        price: e.price ?? p.price,
        oldPrice: e.oldPrice ?? p.oldPrice,
        img: e.img?.trim() || p.img,
        tags: e.active === false
          ? (p.tags.filter((t) => t !== "offer") as any)
          : (p.tags.includes("offer") ? p.tags : [...p.tags, "offer"] as any),
      };
    })
    .filter((p) => {
      const e = offerEdits[p.id];
      if (e?.active === false) return false;
      if (e?.active === true) return true;
      return p.tags.includes("offer") && !!p.oldPrice;
    })
    /* قاعدة ثابتة: المنتجات الحساسة وأدوية الوصفة وGLP-1 لا تدخل رف العروض أبداً */
    .filter((p) => isPromotable(p));
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

/** قائمة الخدمات التمريضية الفعلية — بتتبني كلها من بيانات الإعدادات:
    الخدمات الأساسية (NURSING_SERVICES مجرد بذرة افتراضية) بعد تطبيق
    تعديلات الإدارة عليها (اسم/وصف/سعر/تفعيل من nursing_edits)، وبعدها
    الخدمات اللي المدير أضافها بنفسه (nursing_custom). الخدمة المعطّلة
    من الإدارة ما بتظهرش للعميل خالص. */
export function mergedNursingServices(
  edits: Record<string, NursingServiceEdit>,
  custom: NursingService[]
): NursingService[] {
  const seeds = NURSING_SERVICES.filter((s) => edits[s.id]?.active !== false).map((s) => {
    const e = edits[s.id];
    return {
      ...s,
      nameAr: e?.nameAr ?? s.nameAr,
      nameEn: e?.nameEn ?? s.nameEn,
      descAr: e?.descAr ?? s.descAr,
      descEn: e?.descEn ?? s.descEn,
      price: e?.price ?? s.price,
    };
  });
  const added = (custom ?? []).filter((s) => s.active !== false);
  return [...seeds, ...added];
}
export const useNursingServices = () => {
  const nursingEdits = useBahbah((s) => s.nursingEdits);
  const nursingCustom = useBahbah((s) => s.nursingCustom);
  return mergedNursingServices(nursingEdits, nursingCustom);
};

export const useT = () => {
  const lang = useBahbah((s) => s.lang);
  return makeT(lang);
};

export type { DictKey, Lang, Product, IconType, RxRequest, RxStatus, Role, PatientMeasurement, NursingService, NursingRequest };
export { adminDemoOrders };


// Register dynamic getters for data.ts
if (typeof window !== "undefined") {
  registerCustomProductsGetter(() => {
    try {
      const s = useBahbah.getState();
      return mergeAdminProducts(s.customProducts || [], s.stockAdj || {}, s.priceOverride || {}, s.productImgOverride || {});
    } catch {
      return [];
    }
  });

  registerCustomDriversGetter(() => {
    try {
      const st = useBahbah.getState();
      const removed = st.driverRemoved || [];
      return [...(st.customDrivers || []), ...demoDrivers].filter((d) => !removed.includes(d.id));
    } catch {
      return demoDrivers;
    }
  });

  // Multi-tab order sync across all open tabs in pharmacy
  try {
    const bc = new BroadcastChannel("bahbah_orders_broadcast");
    bc.onmessage = (event) => {
      if (event.data?.type === "NEW_ORDER" && event.data.order) {
        const newOrder = event.data.order;
        const current = useBahbah.getState().adminOrders || [];
        if (!current.some((o) => o.id === newOrder.id)) {
          useBahbah.setState({
            adminOrders: [newOrder, ...current],
          });
          notifyNewOrder(newOrder);
        }
      }
    };
  } catch {}
}
