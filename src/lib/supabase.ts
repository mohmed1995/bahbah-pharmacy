import { createClient } from "@supabase/supabase-js";
import type { Order, RxRequest, CareSubscriber, PatientMeasurement, Role, WhatsappOrder, ShortageRequest, CourierCollection, CourierRating, SavedAddress, LoyaltyState, NursingRequest } from "./bahbah/data";

/**
 * الدور الموثّق للمستخدم. بنقراه من app_metadata فقط (بيتكتب من السيرفر/لوحة Supabase بس).
 * user_metadata يقدر أي مستخدم يعدّله بنفسه (signUp / updateUser) فمينفعش نثق فيه أبدًا
 * لأي صلاحية أعلى من "patient".
 */
const STAFF_ROLES: Role[] = ["courier", "pharmacist", "admin"];
export function roleFromSupabaseUser(
  user: { app_metadata?: Record<string, unknown> | null } | null | undefined
): Role {
  const r = user?.app_metadata?.role;
  return typeof r === "string" && (STAFF_ROLES as string[]).includes(r) ? (r as Role) : "patient";
}
export function driverIdFromSupabaseUser(
  user: { app_metadata?: Record<string, unknown> | null } | null | undefined
): string | undefined {
  const d = user?.app_metadata?.driverId;
  return typeof d === "string" ? d : undefined;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === "production") {
    /* ممنوع البناء الصامت الفاضي: بيلد إنتاج من غير مفاتيح Supabase كان
       بيعدّي ويدّي واجهة فاضية محدش يعرف سببها. دلوقتي البناء يقع بصوت عالٍ. */
    throw new Error(
      "[Bahbah] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are missing. " +
        "A production build without Supabase env would ship an empty app — set both variables (e.g. in .env.local) and rebuild."
    );
  }
  /* التطوير المحلي بس: تحذير صريح بدل ما التطبيق يموت من غير سبب مفهوم */
  console.warn(
    "[Bahbah] Supabase env vars are missing — running with inert placeholder client (dev only)."
  );
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || "https://placeholder.invalid",
  supabaseAnonKey || "missing-build-key",
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/* Database Row Interfaces */
export interface DbOrder {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  customer_notes: string | null;
  items: unknown;
  subtotal: number | null;
  discount: number | null;
  delivery_fee: number | null;
  total: number | null;
  payment_method: string | null;
  status: string | null;
  payment_status: string | null;
  delivery_zone: string | null;
  courier_id: string | null;
  pharmacist_id: string | null;
  /** عمود التغليف الخاص — يُضاف بملف ترقية SQL (قد لا يوجد قبل تشغيله) */
  discreet_packaging?: boolean | null;
  /** دبوس موقع العميل — يُضاف بترقية collections-addresses (قد لا يوجد قبل تشغيلها) */
  customer_lat?: number | null;
  customer_lng?: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbRxRequest {
  id: string;
  patient_name: string | null;
  phone: string | null;
  image_url: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
}

export interface DbCareSubscription {
  id: string;
  plan_id: string | null;
  member_no: string | null;
  name: string | null;
  phone: string | null;
  address: string | null;
  notes?: string | null;
  prescription_url?: string | null;
  day_pref?: number | null;
  status: string | null;
  created_at: string;
}

export interface DbPatientMeasurement {
  id: string;
  patient_code: string;
  patient_name: string;
  patient_phone: string;
  recorded_at: string;
  blood_sugar?: number | null;
  sugar_timing?: string | null;
  systolic?: number | null;
  diastolic?: number | null;
  pulse?: number | null;
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  pharmacist_notes?: string | null;
  recorded_by?: string | null;
}

/* Mapper helpers */
export function mapDbOrderToOrder(row: DbOrder): Order {
  const items = Array.isArray(row.items) ? row.items : [];
  return {
    id: row.id,
    date: (row.created_at || new Date().toISOString()).slice(0, 10),
    items: items,
    total: Number(row.total) || 0,
    status: (row.status as Order["status"]) || "pending",
    customerAr: row.customer_name || "عميل بحبح",
    customerEn: row.customer_name || "Bahbah Customer",
    phone: row.customer_phone || "",
    address: row.customer_address || "",
    payment: row.payment_method || "cod",
    mine: false,
    discount: row.discount ? Number(row.discount) : undefined,
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
    discreetPackaging:
      row.discreet_packaging ??
      ((row.customer_address || "").includes("تغليف خاص") ||
      (row.customer_notes || "").includes("تغليف خاص")
        ? true
        : undefined),
    lat: row.customer_lat != null ? Number(row.customer_lat) : undefined,
    lng: row.customer_lng != null ? Number(row.customer_lng) : undefined,
    delivery: {
      type: "delivery",
      zoneId: row.delivery_zone || undefined,
      zoneNameAr: row.delivery_zone || undefined,
      zoneNameEn: row.delivery_zone || undefined,
      slotAr: "في أسرع وقت",
      slotEn: "ASAP",
      driverId: row.courier_id || undefined,
      fee: Number(row.delivery_fee) || 0,
    },
  };
}

export function mapOrderToDb(order: Order, subtotal?: number): Partial<DbOrder> {
  const itemsSubtotal =
    subtotal ??
    (order.items || []).reduce((acc, it) => acc + (it.price || 0) * (it.qty || 1), 0);

  return {
    id: order.id,
    customer_name: order.customerAr || order.customerEn || "عميل بحبح",
    customer_phone: order.phone || "",
    customer_address: order.address || "",
    customer_notes: order.coupon ? `Coupon: ${order.coupon}` : "",
    items: order.items,
    subtotal: itemsSubtotal,
    discount: order.discount || 0,
    delivery_fee: order.delivery?.fee || 0,
    total: order.total || 0,
    payment_method: order.payment || "cod",
    status: order.status || "pending",
    /* الدفع بيتأكد عند التسليم (courierDeliver بيحوّلها paid) — مش وقت الطلب */
    payment_status: "unpaid",
    delivery_zone: order.delivery?.zoneId || order.delivery?.zoneNameAr || null,
    courier_id: order.delivery?.driverId || null,
    pharmacist_id: null,
    discreet_packaging: order.discreetPackaging ?? false,
    customer_lat: order.lat ?? null,
    customer_lng: order.lng ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function mapDbRxToRx(row: DbRxRequest): RxRequest {
  return {
    id: row.id,
    customerAr: row.patient_name || "عميل بحبح",
    customerEn: row.patient_name || "Bahbah Customer",
    phone: row.phone || "",
    fileName: row.image_url || "",
    date: (row.created_at || new Date().toISOString()).slice(0, 10),
    status: (row.status as RxRequest["status"]) || "new",
    noteAr: row.notes || "—",
    noteEn: row.notes || "—",
  };
}

export function mapDbCareToSubscriber(row: DbCareSubscription): CareSubscriber {
  return {
    id: row.id || row.member_no || "CS-NEW",
    nameAr: row.name || "عميل شهري",
    nameEn: row.name || "Monthly client",
    phone: row.phone || "",
    planId: row.plan_id || "monthly-rx",
    address: row.address || "",
    notes: row.notes || "",
    prescriptionUrl: row.prescription_url || "",
    dayPref: row.day_pref || 1,
    since: (row.created_at || new Date().toISOString()).slice(0, 10),
    nextDelivery: (row.created_at || new Date().toISOString()).slice(0, 10),
    months: 1,
    status: (row.status as "active" | "paused" | "cancelled") || "active",
  };
}

export function mapDbMeasurementToMeasurement(row: DbPatientMeasurement): PatientMeasurement {
  return {
    id: row.id,
    patientCode: row.patient_code,
    patientName: row.patient_name,
    patientPhone: row.patient_phone,
    recordedAt: row.recorded_at,
    bloodSugar: row.blood_sugar != null ? Number(row.blood_sugar) : undefined,
    sugarTiming: (row.sugar_timing as PatientMeasurement["sugarTiming"]) || undefined,
    systolic: row.systolic != null ? Number(row.systolic) : undefined,
    diastolic: row.diastolic != null ? Number(row.diastolic) : undefined,
    pulse: row.pulse != null ? Number(row.pulse) : undefined,
    weight: row.weight != null ? Number(row.weight) : undefined,
    height: row.height != null ? Number(row.height) : undefined,
    bmi: row.bmi != null ? Number(row.bmi) : undefined,
    pharmacistNotes: row.pharmacist_notes || undefined,
    recordedBy: row.recorded_by || undefined,
  };
}

/* Supabase API Services */

/* ------------------------------------------------------------------ */
/* الطلبات: بتتبعت للسيرفر (place_order) اللي بيحسب الأسعار والخصم والتوصيل بنفسه —   */
/* أي أرقام جاية من المتصفح بتتجاهل.                                              */
/* ------------------------------------------------------------------ */
export interface PlaceOrderPayload {
  id: string;
  name: string;
  phone: string;
  address: string;
  payment: string;
  deliveryType: "delivery" | "pickup";
  zoneId?: string;
  slotId?: string;
  coupon?: string;
  driverId?: string;
  discreetPackaging?: boolean;
  /** دبوس موقع العميل — place_order بيحفظه على الطلب لو موجود وصحيح */
  lat?: number;
  lng?: number;
  items: { productId: string; qty: number; nameAr: string; nameEn: string }[];
}
export interface PlaceOrderResult {
  id: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  duplicate?: boolean;
}

const PENDING_ORDERS_KEY = "bahbah_pending_orders_v2";

function readPendingOrders(): PlaceOrderPayload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PENDING_ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingOrders(list: PlaceOrderPayload[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PENDING_ORDERS_KEY, JSON.stringify(list));
  } catch {
    /* التخزين ممتلئ أو محجوب — مفيش حاجة نعملها */
  }
}

function queuePendingOrder(payload: PlaceOrderPayload) {
  const list = readPendingOrders();
  if (!list.some((p) => p.id === payload.id)) writePendingOrders([...list, payload]);
}

/** رفض نهائي من السيرفر (بيانات غلط) — إعادة المحاولة مش هتفيد */
function isPermanentRejection(error: { code?: string; message?: string }) {
  return /bad_|unknown_product/.test(error.message || "");
}

async function sendOrder(payload: PlaceOrderPayload): Promise<"ok" | "retry" | "rejected"> {
  try {
    const { data, error } = await supabase.rpc("place_order", { p: payload });
    if (error) {
      console.warn("Supabase place_order error:", error.message);
      return isPermanentRejection(error) ? "rejected" : "retry";
    }
    lastOrderResults.set(payload.id, data as PlaceOrderResult);
    return "ok";
  } catch (err) {
    console.warn("Supabase place_order failed:", err);
    return "retry";
  }
}
const lastOrderResults = new Map<string, PlaceOrderResult>();

/**
 * ينشئ الطلب على السيرفر. بيرجّع الأرقام النهائية المحسوبة هناك،
 * أو null لو اتحط في الطابور (شبكة) أو اترفض.
 */
export async function submitOrderToSupabase(
  payload: PlaceOrderPayload
): Promise<{ result: PlaceOrderResult | null; rejected: boolean }> {
  const r = await sendOrder(payload);
  if (r === "ok") return { result: lastOrderResults.get(payload.id) ?? null, rejected: false };
  if (r === "retry") queuePendingOrder(payload);
  return { result: null, rejected: r === "rejected" };
}

/** إعادة إرسال الطلبات المعلّقة — بتتنادى عند فتح التطبيق ولما النت يرجع */
export async function flushPendingOrders() {
  const pending = readPendingOrders();
  if (pending.length === 0) return;
  const stillPending: PlaceOrderPayload[] = [];
  for (const payload of pending) {
    if ((await sendOrder(payload)) === "retry") stillPending.push(payload);
  }
  writePendingOrders(stillPending);
}

/** طلب تكرار علاج شهري (بدون أسعار — الصيدلية بتراجعه وتسعّره).
    بترجّع true بس لو السيرفر أكّد إنشاء الطلب — الفشل بيرجع false
    عشان الواجهة ما تورّيش طلب «اتعمل» وهو مش موجود على السيرفر. */
export async function submitRefillToSupabase(p: { id: string; name: string; phone: string; address: string }): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("place_refill", { p });
    if (error) {
      console.warn("Supabase place_refill error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase place_refill failed:", err);
    return false;
  }
}

// Fetch all orders
export async function fetchOrdersFromSupabase(): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.warn("Supabase fetchOrders error:", error.message);
      return [];
    }
    return (data as DbOrder[]).map(mapDbOrderToOrder);
  } catch (err) {
    console.warn("Supabase fetchOrders failed:", err);
    return [];
  }
}

/**
 * نفس جلب الطلبات لكن بيرجّع الخطأ بدل ما يبلعه: لوحة الأداء لازم تفرّق بين
 * «مفيش طلبات» و«الجلب فشل» — الدالة القديمة كانت بترجّع [] في الحالتين
 * فاللوحة كانت بتفضل عارضة أرقام قديمة/صفار من غير أي تنبيه.
 */
export async function fetchOrdersDetailedFromSupabase(): Promise<
  { orders: Order[]; error: null } | { orders: null; error: string }
> {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.warn("Supabase fetchOrdersDetailed error:", error.message);
      return { orders: null, error: error.message };
    }
    return { orders: (data as DbOrder[]).map(mapDbOrderToOrder), error: null };
  } catch (err) {
    console.warn("Supabase fetchOrdersDetailed failed:", err);
    return { orders: null, error: err instanceof Error ? err.message : String(err) };
  }
}

// Update Order Status in Supabase
// بترجّع true بس لو السيرفر أكّد الكتابة — أي فشل بيرجع false عشان الواجهة
// ما تقدّمش الحالة ولا تقول «تم» على حفظ ما حصلش.
export async function updateOrderStatusInSupabase(
  orderId: string,
  patch: Partial<DbOrder>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("orders")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) {
      console.warn("Supabase updateOrder error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase updateOrder failed:", err);
    return false;
  }
}

// -------------------------------------------------------------
// صور الروشتات والنواقص — باكت خاص (الأمان، الطبقة ٢)
// الباكت «rx-prescriptions» بقى خاص: الرفع بيخزن مسار الملف بس،
// والعرض بيتم برابط موقّع مؤقت (createSignedUrl) وقت الحاجة.
// مجلدات الرفع: u/<أرقام تليفون العميل المسجّل> أو guest/ للزائر —
// وسياسات التخزين في upgrade-2026-11-19-security-layer2.sql بتتحقق
// من المجلد بنفس اشتقاق customer_phone() اللي هنا.
// قبل ما الترقية تتركب على السيرفر: الرفع/التوقيع هيفشل بهدوء
// (null) والواجهة هتعرض بديل نصي صادق — مفيش كراش ومفيش روابط عامة.
// -------------------------------------------------------------
export const RX_STORAGE_BUCKET = "rx-prescriptions";

/* مجلد الرفع لهوية الجلسة الحالية — بيطابق اشتقاق customer_phone()
   في SQL: user_metadata.phone وإلا أول جزء من الإيميل، أرقام بس. */
async function rxUploadFolder(): Promise<string> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    const raw =
      (user?.user_metadata?.phone as string | undefined) ||
      (user?.email ? user.email.split("@")[0] : "");
    const digits = (raw || "").replace(/[^0-9]/g, "");
    return digits ? `u/${digits}` : "guest";
  } catch {
    return "guest";
  }
}

/* بيستخرج مسار التخزين من أي قيمة مخزنة: مسار جاهز، أو رابط عام
   قديم (قبل الطبقة ٢) شكله .../object/public/rx-prescriptions/<path>.
   بيرجع null لو القيمة مش ملف تخزين (اسم ملف نصي / فاضية). */
export function rxStoragePathFromValue(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v || v.startsWith("data:")) return null;
  const marker = `/${RX_STORAGE_BUCKET}/`;
  const idx = v.indexOf(marker);
  if (idx >= 0) {
    const path = v
      .slice(idx + marker.length)
      .split(/[?#]/)[0]
      .trim();
    try {
      return decodeURIComponent(path) || null;
    } catch {
      return path || null;
    }
  }
  if (v.startsWith("u/") || v.startsWith("guest/") || v.startsWith("rx_")) {
    return v;
  }
  return null;
}

/* بيحوّل أي قيمة مخزنة لرابط قابل للعرض:
   - data: URLs (البديل المحلي في شاشة الرعاية) زي ما هي.
   - ملفات الباكت: رابط موقّع مؤقت — أو null لو التوقيع فشل
     (قبل الترقية / من غير صلاحية) فالواجهة تعرض بديل نصي.
   - روابط http خارجية (بيانات تجريبية) زي ما هي. */
export async function resolveRxPhotoUrl(
  value: string | null | undefined
): Promise<string | null> {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith("data:")) return v;
  const path = rxStoragePathFromValue(v);
  if (!path) return v.startsWith("http://") || v.startsWith("https://") ? v : null;
  try {
    const { data, error } = await supabase.storage
      .from(RX_STORAGE_BUCKET)
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      console.warn("Supabase createSignedUrl failed:", error?.message);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.warn("Supabase createSignedUrl error:", err);
    return null;
  }
}

// Upload Rx Prescription Image to Supabase Storage (باكت خاص —
// بيرجع مسار الملف جوّه الباكت، مش رابط؛ العرض بالرابط الموقّع)
export async function uploadRxPrescriptionImage(file: File): Promise<string | null> {
  try {
    const ext = file.name.split(".").pop() || "jpg";
    const folder = await rxUploadFolder();
    const filePath = `${folder}/rx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data, error } = await supabase.storage
      .from(RX_STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.warn("Supabase storage upload error:", error.message);
      return null;
    }

    return data.path;
  } catch (err) {
    console.warn("Supabase storage upload failed:", err);
    return null;
  }
}

// Insert Rx Request — بترجّع true بس لو الصف اتكتب على السيرفر فعلًا
export async function insertRxRequestToSupabase(rx: RxRequest): Promise<boolean> {
  try {
    const { error } = await supabase.from("rx_requests").insert({
      id: rx.id,
      patient_name: rx.customerAr || rx.customerEn,
      phone: rx.phone,
      image_url: rx.fileName,
      status: rx.status,
      notes: rx.noteAr || rx.noteEn,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.warn("Supabase insertRx error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase insertRx failed:", err);
    return false;
  }
}

// Fetch Rx Requests
export async function fetchRxRequestsFromSupabase(): Promise<RxRequest[]> {
  try {
    const { data, error } = await supabase
      .from("rx_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("Supabase fetchRx error:", error.message);
      return [];
    }
    return (data as DbRxRequest[]).map(mapDbRxToRx);
  } catch (err) {
    console.warn("Supabase fetchRx failed:", err);
    return [];
  }
}

// Update Rx Request Status — بترجّع true بس لو السيرفر أكّد التحديث
export async function updateRxStatusInSupabase(id: string, status: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("rx_requests")
      .update({ status })
      .eq("id", id);
    if (error) {
      console.warn("Supabase updateRx error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase updateRx failed:", err);
    return false;
  }
}

// Update Care Subscription Status (للطاقم) — بترجّع true بس لو السيرفر أكّد
export async function updateCareSubStatusInSupabase(id: string, status: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("care_subscriptions")
      .update({ status })
      .eq("id", id);
    if (error) {
      console.warn("Supabase updateCareSub error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase updateCareSub failed:", err);
    return false;
  }
}

/**
 * تعديل المريض لاشتراكه هو بس (إيقاف/استئناف/إلغاء/تغيير يوم الصندوق)
 * عن طريق دالة care_self_update — سياسة التحديث المباشر على الجدول
 * للطاقم بس، فمسار المريض بيعدّي على الدالة اللي بتتحقق من هويته
 * (تليفون الجلسة) وبتعدّل صفوفه هو بس. بترجّع true بس لو الدالة نجحت —
 * قبل ما الترقية تتركب على المشروع الدالة مش موجودة فبيرجع false
 * والواجهة بترجع بالحالة وبتورّي الخطأ بدل ما تكدب.
 */
export async function careSelfUpdateInSupabase(patch: {
  status?: string;
  dayPref?: number;
}): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("care_self_update", {
      p_status: patch.status ?? null,
      p_day_pref: patch.dayPref ?? null,
    });
    if (error) {
      console.warn("Supabase care_self_update error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase care_self_update failed:", err);
    return false;
  }
}
export async function insertCareSubToSupabase(sub: {
  memberNo: string;
  planId?: string;
  name: string;
  phone: string;
  address: string;
  status?: string;
  notes?: string;
  prescriptionUrl?: string;
  dayPref?: number;
}): Promise<boolean> {
  try {
    const { error } = await supabase.from("care_subscriptions").insert({
      id: sub.memberNo,
      plan_id: sub.planId || "monthly-rx",
      member_no: sub.memberNo,
      name: sub.name,
      phone: sub.phone,
      address: sub.address,
      notes: sub.notes || null,
      prescription_url: sub.prescriptionUrl || null,
      day_pref: sub.dayPref || 1,
      status: sub.status || "active",
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.warn("Supabase insertCare error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase insertCare failed:", err);
    return false;
  }
}

// Fetch Care Subscriptions
export async function fetchCareSubsFromSupabase(): Promise<CareSubscriber[]> {
  try {
    const { data, error } = await supabase
      .from("care_subscriptions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.warn("Supabase fetchCareSubs error:", error.message);
      return [];
    }
    return (data as DbCareSubscription[]).map(mapDbCareToSubscriber);
  } catch (err) {
    console.warn("Supabase fetchCareSubs failed:", err);
    return [];
  }
}

// -------------------------------------------------------------
// Patient Measurements (السكر والضغط والوزن)
// -------------------------------------------------------------
// Insert Measurement — بترجّع true بس لو القياس اتكتب على السيرفر فعلًا
export async function insertMeasurementToSupabase(m: PatientMeasurement): Promise<boolean> {
  try {
    const { error } = await supabase.from("patient_measurements").insert({
      id: m.id,
      patient_code: m.patientCode,
      patient_name: m.patientName,
      patient_phone: m.patientPhone,
      recorded_at: m.recordedAt,
      blood_sugar: m.bloodSugar ?? null,
      sugar_timing: m.sugarTiming ?? null,
      systolic: m.systolic ?? null,
      diastolic: m.diastolic ?? null,
      pulse: m.pulse ?? null,
      weight: m.weight ?? null,
      height: m.height ?? null,
      bmi: m.bmi ?? null,
      pharmacist_notes: m.pharmacistNotes ?? null,
      recorded_by: m.recordedBy ?? null,
    });
    if (error) {
      console.warn("[Supabase Measurements] insert error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Supabase Measurements] insert failed:", err);
    return false;
  }
}

// Delete Measurement — الحذف لازم يوصل السيرفر، وإلا القياس بيرجع
// مع أول جلب/مزامنة كأنه ما اتحذفش. بترجّع true بس لو السيرفر أكّد.
export async function deleteMeasurementFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("patient_measurements")
      .delete()
      .eq("id", id);
    if (error) {
      console.warn("[Supabase Measurements] delete error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Supabase Measurements] delete failed:", err);
    return false;
  }
}

export async function fetchMeasurementsFromSupabase(): Promise<PatientMeasurement[]> {
  try {
    const { data, error } = await supabase
      .from("patient_measurements")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(200);

    if (error) {
      console.warn("[Supabase Measurements] fetch error:", error.message);
      return [];
    }
    return (data as DbPatientMeasurement[]).map(mapDbMeasurementToMeasurement);
  } catch (err) {
    console.warn("[Supabase Measurements] fetch failed:", err);
    return [];
  }
}

/**
 * قياسات مريض واحد بكوده الشخصي — للمريض نفسه من غير حساب.
 * الجدول مقفول بسياسات الطاقم (بيانات طبية)، فالبوابة بتستخدم دالة
 * get_measurements_for_patient اللي بترجع صفوف الكود ده بس بمطابقة تامة.
 * لو الدالة مش مطبقة على السيرفر لسه، بترجع فاضي والسلوك المحلي بيكمل.
 */
export async function fetchMeasurementsByCodeFromSupabase(
  code: string
): Promise<PatientMeasurement[]> {
  try {
    const { data, error } = await supabase.rpc("get_measurements_for_patient", {
      p_code: code,
    });
    if (error || !data) return [];
    return (data as DbPatientMeasurement[]).map(mapDbMeasurementToMeasurement);
  } catch {
    return [];
  }
}

// -------------------------------------------------------------
// Admin Settings & Realtime Store Sync
// -------------------------------------------------------------
export async function syncAdminSettingsToSupabase(
  patch: Record<string, unknown>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("admin_settings")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "global");

    if (error) {
      console.warn("[Supabase Sync] Admin settings update error:", error.message);
      return false;
    }
    console.log("⚡ [Bahbah Supabase Sync] Admin settings updated in Supabase:", Object.keys(patch));
    return true;
  } catch (err) {
    console.warn("[Supabase Sync] Failed to update admin settings:", err);
    return false;
  }
}

export async function fetchAdminSettingsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("admin_settings")
      .select("*")
      .eq("id", "global")
      .single();
    if (error) {
      console.warn("[Supabase Sync] fetchAdminSettings error:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("[Supabase Sync] fetchAdminSettings failed:", err);
    return null;
  }
}

// -------------------------------------------------------------
// Supabase Auth Helpers
// -------------------------------------------------------------
export async function signInWithSupabase(email: string, pass: string) {
  return await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: pass,
  });
}

export async function signUpWithSupabase(
  email: string,
  pass: string,
  metadata: { name: string; phone?: string; role?: string; driverId?: string }
) {
  return await supabase.auth.signUp({
    email: email.trim(),
    password: pass,
    options: {
      data: metadata,
    },
  });
}

export async function signOutFromSupabase() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("[Supabase Auth] signOut error:", err);
  }
}

/* -------------------------------------------------------------
   RPCs جديدة (بتتعرّف من مسار SQL): admin_set_price / admin_sync_catalog /
   get_public_settings. كلها اختيارية — لو الـ SQL لسه ما اتطبّقش على المشروع،
   الدوال بترجع null/false بهدوء والسلوك الحالي بيكمل زي ما هو.
   ------------------------------------------------------------- */

/** الإعدادات العامة من RPC آمنة (من غير أي أعمدة سرية) — null لو غير متاحة */
export async function fetchPublicSettingsFromSupabase(): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabase.rpc("get_public_settings");
    if (error || !data) return null;
    const row = Array.isArray(data) ? data[0] : data;
    return (row as Record<string, unknown>) ?? null;
  } catch {
    return null;
  }
}

/** تعديل سعر منتج على السيرفر (admin_set_price) — true لو اتحفظ فعلًا */
export async function setProductPriceOnServer(productId: string, price: number): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("admin_set_price", { p_id: productId, p_price: price });
    if (error) {
      console.warn("[Supabase] admin_set_price unavailable:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Supabase] admin_set_price failed:", err);
    return false;
  }
}

/** رفع الكتالوج الحالي (id + price + stock) للسيرفر (admin_sync_catalog) */
export async function syncCatalogToSupabase(
  items: { id: string; price: number; stock: number }[]
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("admin_sync_catalog", { p_items: items });
    if (error) {
      console.warn("[Supabase] admin_sync_catalog unavailable:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Supabase] admin_sync_catalog failed:", err);
    return false;
  }
}

/** تتبع حالة طلب برقمه فقط (RPC آمنة — بتتعرّف في supabase/security.sql) */
export async function trackOrderStatus(orderId: string) {
  try {
    const { data, error } = await supabase.rpc("track_order", { p_id: orderId });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return data[0] as { id: string; status: string; courier_id: string | null; updated_at: string };
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// WhatsApp Quick Orders (طلب سريع بواتساب — بكود تتبع BH-XXXX)
// -------------------------------------------------------------
export interface DbWhatsappOrder {
  id: string;
  code: string;
  customer_phone: string | null;
  customer_name: string | null;
  items: unknown;
  total: number | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export function mapDbWhatsappToOrder(row: DbWhatsappOrder): WhatsappOrder {
  return {
    id: row.id,
    code: row.code,
    phone: row.customer_phone || "",
    name: row.customer_name || "",
    items: Array.isArray(row.items) ? (row.items as WhatsappOrder["items"]) : [],
    total: Number(row.total) || 0,
    status: (row.status as WhatsappOrder["status"]) || "sent",
    createdAt: row.created_at,
  };
}

/** إدخال طلب واتساب — بيرجع الصف أو رسالة الخطأ (الكود مكرر = جرّب كود تاني) */
export async function insertWhatsappOrderToSupabase(o: WhatsappOrder) {
  try {
    const { data, error } = await supabase
      .from("whatsapp_orders")
      .insert({
        id: o.id,
        code: o.code,
        customer_phone: o.phone || null,
        customer_name: o.name || null,
        items: o.items,
        total: o.total,
        status: "sent",
        created_at: o.createdAt,
        updated_at: o.createdAt,
      })
      .select()
      .single();
    if (error) return { row: null as DbWhatsappOrder | null, error: error.message };
    return { row: data as DbWhatsappOrder, error: null as string | null };
  } catch (err) {
    return { row: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function fetchWhatsappOrdersFromSupabase(limit = 40): Promise<WhatsappOrder[]> {
  try {
    const { data, error } = await supabase
      .from("whatsapp_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.warn("Supabase fetchWhatsappOrders error:", error.message);
      return [];
    }
    return (data as DbWhatsappOrder[]).map(mapDbWhatsappToOrder);
  } catch (err) {
    console.warn("Supabase fetchWhatsappOrders failed:", err);
    return [];
  }
}

export async function updateWhatsappOrderStatusInSupabase(id: string, status: WhatsappOrder["status"]) {
  try {
    const { error } = await supabase
      .from("whatsapp_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) console.warn("Supabase updateWhatsappOrderStatus error:", error.message);
    return !error;
  } catch (err) {
    console.warn("Supabase updateWhatsappOrderStatus failed:", err);
    return false;
  }
}

// -------------------------------------------------------------
// Shortage Requests (طلب ناقص — بكود تتبع BH-XXXX)
// -------------------------------------------------------------
export interface DbShortageRequest {
  id: string;
  code: string;
  customer_phone: string | null;
  customer_name: string | null;
  item_name: string;
  barcode: string | null;
  photo_url: string | null;
  source: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export function mapDbShortageToRequest(row: DbShortageRequest): ShortageRequest {
  return {
    id: row.id,
    code: row.code,
    phone: row.customer_phone || "",
    name: row.customer_name || "",
    itemName: row.item_name || "",
    barcode: row.barcode || undefined,
    photoUrl: row.photo_url || undefined,
    source: (row.source as ShortageRequest["source"]) || "manual",
    status: (row.status as ShortageRequest["status"]) || "pending",
    createdAt: row.created_at,
  };
}

/** إدخال طلب ناقص — بيرجع الصف أو رسالة الخطأ (الكود مكرر = جرّب كود تاني) */
export async function insertShortageRequestToSupabase(r: ShortageRequest) {
  try {
    const { data, error } = await supabase
      .from("shortage_requests")
      .insert({
        id: r.id,
        code: r.code,
        customer_phone: r.phone || null,
        customer_name: r.name || null,
        item_name: r.itemName,
        barcode: r.barcode || null,
        photo_url: r.photoUrl || null,
        source: r.source,
        status: "pending",
        created_at: r.createdAt,
        updated_at: r.createdAt,
      })
      .select()
      .single();
    if (error) return { row: null as DbShortageRequest | null, error: error.message };
    return { row: data as DbShortageRequest, error: null as string | null };
  } catch (err) {
    return { row: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function fetchShortageRequestsFromSupabase(limit = 40): Promise<ShortageRequest[]> {
  try {
    const { data, error } = await supabase
      .from("shortage_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.warn("Supabase fetchShortageRequests error:", error.message);
      return [];
    }
    return (data as DbShortageRequest[]).map(mapDbShortageToRequest);
  } catch (err) {
    console.warn("Supabase fetchShortageRequests failed:", err);
    return [];
  }
}

export async function updateShortageRequestStatusInSupabase(id: string, status: ShortageRequest["status"]) {
  try {
    const { error } = await supabase
      .from("shortage_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) console.warn("Supabase updateShortageRequestStatus error:", error.message);
    return !error;
  } catch (err) {
    console.warn("Supabase updateShortageRequestStatus failed:", err);
    return false;
  }
}

// -------------------------------------------------------------
// Nursing Requests (خدمات تمريضية — بكود تتبع BH-XXXX)
// -------------------------------------------------------------
export interface DbNursingRequest {
  id: string;
  code: string;
  customer_phone: string | null;
  customer_name: string | null;
  service_id: string;
  service_name_ar: string;
  service_name_en: string | null;
  service_kind: string | null;
  service_price: number | null;
  visit_fee: number | null;
  total: number | null;
  zone_id: string | null;
  address: string | null;
  preferred_at: string | null;
  notes: string | null;
  status: string | null;
  measured_sugar: number | null;
  measured_systolic: number | null;
  measured_diastolic: number | null;
  measurement_id: string | null;
  created_at: string;
  updated_at: string;
}

export function mapDbNursingToRequest(row: DbNursingRequest): NursingRequest {
  return {
    id: row.id,
    code: row.code,
    phone: row.customer_phone || "",
    name: row.customer_name || "",
    serviceId: row.service_id,
    serviceNameAr: row.service_name_ar || "",
    serviceNameEn: row.service_name_en || "",
    serviceKind: (row.service_kind as NursingRequest["serviceKind"]) || "other",
    servicePrice: Number(row.service_price) || 0,
    visitFee: Number(row.visit_fee) || 0,
    total: Number(row.total) || 0,
    zoneId: row.zone_id || undefined,
    address: row.address || "",
    preferredAt: row.preferred_at || "",
    notes: row.notes || undefined,
    status: (row.status as NursingRequest["status"]) || "new",
    measuredSugar: row.measured_sugar != null ? Number(row.measured_sugar) : undefined,
    measuredSystolic: row.measured_systolic != null ? Number(row.measured_systolic) : undefined,
    measuredDiastolic: row.measured_diastolic != null ? Number(row.measured_diastolic) : undefined,
    measurementId: row.measurement_id || undefined,
    createdAt: row.created_at,
  };
}

/** إدخال حجز تمريض — بيرجع الصف أو رسالة الخطأ (الكود مكرر = جرّب كود تاني) */
export async function insertNursingRequestToSupabase(r: NursingRequest) {
  try {
    const { data, error } = await supabase
      .from("nursing_requests")
      .insert({
        id: r.id,
        code: r.code,
        customer_phone: r.phone || null,
        customer_name: r.name || null,
        service_id: r.serviceId,
        service_name_ar: r.serviceNameAr,
        service_name_en: r.serviceNameEn || null,
        service_kind: r.serviceKind,
        service_price: r.servicePrice,
        visit_fee: r.visitFee,
        total: r.total,
        zone_id: r.zoneId || null,
        address: r.address || null,
        preferred_at: r.preferredAt || null,
        notes: r.notes || null,
        status: "new",
        created_at: r.createdAt,
        updated_at: r.createdAt,
      })
      .select()
      .single();
    if (error) return { row: null as DbNursingRequest | null, error: error.message };
    return { row: data as DbNursingRequest, error: null as string | null };
  } catch (err) {
    return { row: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function fetchNursingRequestsFromSupabase(limit = 40): Promise<NursingRequest[]> {
  try {
    const { data, error } = await supabase
      .from("nursing_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.warn("Supabase fetchNursingRequests error:", error.message);
      return [];
    }
    return (data as DbNursingRequest[]).map(mapDbNursingToRequest);
  } catch (err) {
    console.warn("Supabase fetchNursingRequests failed:", err);
    return [];
  }
}

/** تحديث حجز تمريض (حالة + نتائج قياس اختيارية) — true لو اتحفظ فعلًا */
export async function updateNursingRequestInSupabase(
  id: string,
  patch: {
    status: NursingRequest["status"];
    measuredSugar?: number;
    measuredSystolic?: number;
    measuredDiastolic?: number;
    measurementId?: string;
  }
) {
  try {
    const update: Record<string, unknown> = {
      status: patch.status,
      updated_at: new Date().toISOString(),
    };
    /* حقول القياس بتتكتب بس لما تتبعت — تغيير حالة عادي ما يمسحهاش */
    if (patch.measuredSugar !== undefined) update.measured_sugar = patch.measuredSugar;
    if (patch.measuredSystolic !== undefined) update.measured_systolic = patch.measuredSystolic;
    if (patch.measuredDiastolic !== undefined) update.measured_diastolic = patch.measuredDiastolic;
    if (patch.measurementId !== undefined) update.measurement_id = patch.measurementId;
    const { error } = await supabase.from("nursing_requests").update(update).eq("id", id);
    if (error) console.warn("Supabase updateNursingRequest error:", error.message);
    return !error;
  } catch (err) {
    console.warn("Supabase updateNursingRequest failed:", err);
    return false;
  }
}

// -------------------------------------------------------------
// Warehouse (مخزن الصيدلية — warehouse_products من برنامج المحل)
// -------------------------------------------------------------
export interface DbWarehouseProduct {
  code: string | null;
  barcode: string | null;
  sync_key: string | null;
  name_ar: string | null;
  name_en: string | null;
  active_ingredient: string | null;
  strength: string | null;
  form: string | null;
  category: string | null;
  sale_price: number | null;
  cost_price: number | null;
  stock_boxes: number | null;
  stock_strips: number | null;
  min_limit: number | null;
  updated_at: string | null;
}

/* -------------------------------------------------------------
// Staff Permissions (صلاحيات الطاقم — staff_permissions)
// المدير بيوزعها من لوحة الإدارة؛ RLS بيقصر الكتابة على الأدمن،
// وكل موظف يقرا صفه بس. أي فشل/غياب للجدول بيرجع null فالواجهة
// ترجع لافتراضات الدور (سلوك ما قبل نظام الصلاحيات).
// ------------------------------------------------------------- */
export interface DbStaffPermission {
  user_email: string;
  role: string | null;
  permissions: Record<string, boolean> | null;
  updated_by: string | null;
  updated_at: string;
}

/** صلاحيات الموظف الحالي (بإيميله) — null لو مفيش صف أو الجدول مش موجود */
export async function fetchMyStaffPermissions(
  email: string
): Promise<Record<string, boolean> | null> {
  try {
    const { data, error } = await supabase
      .from("staff_permissions")
      .select("permissions")
      .ilike("user_email", email.trim())
      .limit(1);
    if (error || !data || data.length === 0) return null;
    const perms = (data[0] as { permissions: Record<string, boolean> | null }).permissions;
    return perms && typeof perms === "object" ? perms : null;
  } catch {
    return null;
  }
}

/** كل صفوف الصلاحيات — للأدمن بس (RLS)؛ بيرجع [] عند أي فشل */
export async function fetchAllStaffPermissions(): Promise<DbStaffPermission[]> {
  try {
    const { data, error } = await supabase
      .from("staff_permissions")
      .select("*")
      .order("user_email", { ascending: true });
    if (error || !data) return [];
    return data as DbStaffPermission[];
  } catch {
    return [];
  }
}

/** حفظ صلاحيات موظف (upsert بإيميله) — الكتابة للأدمن بس بـ RLS */
export async function upsertStaffPermissions(
  email: string,
  role: string,
  permissions: Record<string, boolean>,
  updatedBy: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from("staff_permissions").upsert(
      {
        user_email: email.trim().toLowerCase(),
        role,
        permissions,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_email" }
    );
    if (error) {
      console.warn("Supabase upsertStaffPermissions error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase upsertStaffPermissions failed:", err);
    return false;
  }
}

/** حذف صف صلاحيات موظف (بيرجع لافتراضات دوره) — للأدمن بس بـ RLS */
export async function deleteStaffPermissions(email: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("staff_permissions")
      .delete()
      .ilike("user_email", email.trim());
    if (error) {
      console.warn("Supabase deleteStaffPermissions error:", error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

const normName = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, " ").replace(/\s+/g, " ").trim();

/** بحث بالباركود في مخزن الصيدلية — بيرجع null لو الجدول فاضي/مش موجود */
export async function fetchWarehouseByBarcode(barcode: string): Promise<DbWarehouseProduct | null> {
  try {
    const { data, error } = await supabase
      .from("warehouse_products")
      .select("*")
      .eq("barcode", barcode.trim())
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return data[0] as DbWarehouseProduct;
  } catch {
    return null;
  }
}

/** مطابقة منتج كتالوج بصف مخزن بالاسم الموحّد (تطابق تام بعد التوحيد) */
export async function fetchWarehouseForProduct(p: {
  nameEn: string;
  nameAr: string;
}): Promise<DbWarehouseProduct | null> {
  try {
    const token = (p.nameEn || "").split(/\s+/)[0]?.replace(/[^A-Za-z0-9]/g, "");
    if (!token || token.length < 3) return null;
    const { data, error } = await supabase
      .from("warehouse_products")
      .select("*")
      .ilike("name_en", `%${token}%`)
      .limit(25);
    if (error || !data) return null;
    const rows = data as DbWarehouseProduct[];
    const targetEn = normName(p.nameEn);
    const targetAr = normName(p.nameAr);
    return (
      rows.find(
        (r) => normName(r.name_en || "") === targetEn || normName(r.name_ar || "") === targetAr
      ) ?? null
    );
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// Courier Collections (تحصيل المندوب — التوريد)
// المندوب بيكتب سجل التحصيل قبل إتمام التسليم. القراءة محكومة بـ RLS:
// أدمن أو صلاحية «الماليات» بس — أي فشل هنا (الجدول مش موجود لسه، أو
// مفيش صلاحية) بيترجم لخطأ/قائمة فاضية من غير ما يكسر التطبيق.
// -------------------------------------------------------------
export interface DbCourierCollection {
  id: string;
  order_id: string;
  courier_id: string | null;
  courier_email: string | null;
  courier_name: string | null;
  amount: number | null;
  method: string | null;
  wallet_from: string | null;
  wallet_to: string | null;
  note: string | null;
  created_at: string;
}

export function mapDbCollectionToCollection(row: DbCourierCollection): CourierCollection {
  return {
    id: row.id,
    orderId: row.order_id,
    courierId: row.courier_id || undefined,
    courierEmail: row.courier_email || undefined,
    courierName: row.courier_name || undefined,
    amount: Number(row.amount) || 0,
    method: (row.method as CourierCollection["method"]) || "cash",
    walletFrom: row.wallet_from || undefined,
    walletTo: row.wallet_to || undefined,
    note: row.note || undefined,
    createdAt: row.created_at,
  };
}

/** إدخال سجل تحصيل — بيرجع الصف أو رسالة الخطأ (التسليم ما يكملش من غيره) */
export async function insertCourierCollectionToSupabase(c: CourierCollection) {
  try {
    const { data, error } = await supabase
      .from("courier_collections")
      .insert({
        id: c.id,
        order_id: c.orderId,
        courier_id: c.courierId || null,
        courier_email: c.courierEmail || null,
        courier_name: c.courierName || null,
        amount: c.amount,
        method: c.method,
        wallet_from: c.walletFrom || null,
        wallet_to: c.walletTo || null,
        note: c.note || null,
        created_at: c.createdAt,
      })
      .select()
      .single();
    if (error) return { row: null as DbCourierCollection | null, error: error.message };
    return { row: data as DbCourierCollection, error: null as string | null };
  } catch (err) {
    return { row: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

/** سجلات التحصيل — للمدير بس عمليًا (RLS هترجع [] لغير المصرّح لهم) */
/* تصحيح سجل تحصيل من المدير (سيادة المدير): السياسة على السيرفر
   collections_admin_all بتسمح للأدمن بس بالتعديل/الحذف — السجل ثابت
   بعد كتابته لأي حد تاني. الدالتين بيرجعوا true بس لو السيرفر أكّد. */
export async function updateCourierCollectionInSupabase(
  id: string,
  patch: { amount?: number; note?: string }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("courier_collections")
      .update({
        ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
        ...(patch.note !== undefined ? { note: patch.note || null } : {}),
      })
      .eq("id", id);
    if (error) {
      console.warn("Supabase updateCollection error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase updateCollection failed:", err);
    return false;
  }
}

export async function deleteCourierCollectionFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("courier_collections")
      .delete()
      .eq("id", id);
    if (error) {
      console.warn("Supabase deleteCollection error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase deleteCollection failed:", err);
    return false;
  }
}

export async function fetchCourierCollectionsFromSupabase(limit = 100): Promise<CourierCollection[]> {  try {
    const { data, error } = await supabase
      .from("courier_collections")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.warn("Supabase fetchCourierCollections error:", error.message);
      return [];
    }
    return (data as DbCourierCollection[]).map(mapDbCollectionToCollection);
  } catch (err) {
    console.warn("Supabase fetchCourierCollections failed:", err);
    return [];
  }
}

// -------------------------------------------------------------
// Customer Addresses (دفتر عناوين العميل — customer_addresses)
// العميل يدير عناوينه بس (RLS بيطابق رقم التليفون من التوكن)، والطاقم
// يقرا للتوصيل. أي فشل (الجدول مش موجود لسه) بيرجع null/[] والواجهة
// بتكمل بالنسخة المحلية المحفوظة على الجهاز.
// -------------------------------------------------------------
export interface DbCustomerAddress {
  id: string;
  customer_phone: string;
  label: string;
  address_text: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  is_default: boolean | null;
  created_at: string;
  updated_at: string;
}

export function mapDbAddressToSaved(row: DbCustomerAddress): SavedAddress {
  return {
    id: row.id,
    phone: row.customer_phone || "",
    label: row.label || "",
    details: row.address_text || "",
    city: row.city || undefined,
    lat: row.lat != null ? Number(row.lat) : undefined,
    lng: row.lng != null ? Number(row.lng) : undefined,
    isDefault: !!row.is_default,
    updatedAt: row.updated_at,
  };
}

/** عناوين العميل المسجل — بيرجع null لو الجدول مش متاح (مش []) عشان المزامنة ما تمسحش المحلي */
export async function fetchCustomerAddressesFromSupabase(): Promise<SavedAddress[] | null> {
  try {
    const { data, error } = await supabase
      .from("customer_addresses")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) {
      console.warn("Supabase fetchCustomerAddresses error:", error.message);
      return null;
    }
    return (data as DbCustomerAddress[]).map(mapDbAddressToSaved);
  } catch (err) {
    console.warn("Supabase fetchCustomerAddresses failed:", err);
    return null;
  }
}

/** إضافة/تعديل عنوان (upsert بالـ id) — بيرجع true عند النجاح */
export async function upsertCustomerAddressToSupabase(a: SavedAddress): Promise<boolean> {
  try {
    const { error } = await supabase.from("customer_addresses").upsert(
      {
        id: a.id,
        customer_phone: a.phone,
        label: a.label,
        address_text: a.details,
        city: a.city || null,
        lat: a.lat ?? null,
        lng: a.lng ?? null,
        is_default: a.isDefault,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error) {
      console.warn("Supabase upsertCustomerAddress error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase upsertCustomerAddress failed:", err);
    return false;
  }
}

/* -------------------------------------------------------------
// Loyalty Points (نقاط الولاء — loyalty_accounts / loyalty_ledger / loyalty_cards)
// ensure_loyalty على السيرفر: بينشئ حساب الولاء للعميل وبيمنح نقاط
// الترحيب (50) مرة واحدة بس، وبيرجع الحالة كاملة (رصيد/كارت/عضوية
// رعاية). أي فشل (الترقية لسه ما اتشغّلتش) بيرجع null والواجهة
// بتعرض صفر بهدوء.
// ------------------------------------------------------------- */
export async function ensureLoyaltyFromSupabase(): Promise<LoyaltyState | null> {
  try {
    const { data, error } = await supabase.rpc("ensure_loyalty");
    if (error || !data) {
      if (error) console.warn("Supabase ensureLoyalty error:", error.message);
      return null;
    }
    const row = (Array.isArray(data) ? data[0] : data) as {
      balance?: number;
      card_code?: string | null;
      card_percent?: number | null;
      card_status?: string | null;
      card_earned_at?: string | null;
      card_used_at?: string | null;
      care_member?: boolean;
      free_quota?: number | null;
      free_used?: number | null;
      free_remaining?: number | null;
    };
    /* أرقام رصيد التوصيل المجاني بتيجي من السيرفر بعد ترقية الرصيد —
       غيابها (سيرفر أقدم) بيخلي الحقول undefined والواجهة بتتعامل بهدوء */
    const freeQuota =
      row.free_quota != null && Number.isFinite(Number(row.free_quota))
        ? Math.max(0, Math.floor(Number(row.free_quota)))
        : undefined;
    const freeUsed =
      row.free_used != null && Number.isFinite(Number(row.free_used))
        ? Math.max(0, Math.floor(Number(row.free_used)))
        : undefined;
    const freeRemaining =
      row.free_remaining != null && Number.isFinite(Number(row.free_remaining))
        ? Math.max(0, Math.floor(Number(row.free_remaining)))
        : undefined;
    return {
      balance: Math.max(0, Math.floor(Number(row.balance ?? 0))),
      card: row.card_code
        ? {
            code: row.card_code,
            percent: Number(row.card_percent ?? 10),
            status:
              row.card_status === "used"
                ? "used"
                : row.card_status === "voided"
                  ? "voided"
                  : "active",
            earnedAt: row.card_earned_at ?? undefined,
            usedAt: row.card_used_at ?? undefined,
          }
        : null,
      careMember: !!row.care_member,
      freeQuota,
      freeUsed,
      freeRemaining,
    };
  } catch (err) {
    console.warn("Supabase ensureLoyalty failed:", err);
    return null;
  }
}

/** حذف عنوان من دفتر العميل */
export async function deleteCustomerAddressFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("customer_addresses").delete().eq("id", id);
    if (error) {
      console.warn("Supabase deleteCustomerAddress error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase deleteCustomerAddress failed:", err);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* إدارة الولاء للأدمن (سيادة المدير): عرض حالة عميل + تصحيح نقاط +   */
/* إلغاء/تفعيل كارت الخصم — كلها دوال سيرفر بفحص «أدمن بس» جواها      */
/* (ترقية integrity-fixes). قبل ما الترقية تتركب الدوال مش موجودة     */
/* فالنتائج بترجع فشل صريح (null/false) بدل أي نجاح وهمي.              */
/* ------------------------------------------------------------------ */

export interface AdminLoyaltyInfo {
  found: boolean;
  phone?: string;
  balance?: number;
  cardCode?: string | null;
  cardPercent?: number | null;
  cardStatus?: string | null;
  careMember?: boolean;
  freeQuota?: number;
  freeUsed?: number;
  freeRemaining?: number;
}

export async function adminLoyaltyLookupFromSupabase(phone: string): Promise<AdminLoyaltyInfo | null> {
  try {
    const { data, error } = await supabase.rpc("admin_loyalty_lookup", { p_phone: phone });
    if (error || !data) {
      if (error) console.warn("Supabase admin_loyalty_lookup error:", error.message);
      return null;
    }
    const row = data as {
      found?: boolean;
      phone?: string;
      balance?: number;
      card_code?: string | null;
      card_percent?: number | null;
      card_status?: string | null;
      care_member?: boolean;
      free_quota?: number;
      free_used?: number;
      free_remaining?: number;
    };
    return {
      found: !!row.found,
      phone: row.phone,
      balance: row.balance,
      cardCode: row.card_code ?? null,
      cardPercent: row.card_percent ?? null,
      cardStatus: row.card_status ?? null,
      careMember: !!row.care_member,
      freeQuota: row.free_quota,
      freeUsed: row.free_used,
      freeRemaining: row.free_remaining,
    };
  } catch (err) {
    console.warn("Supabase admin_loyalty_lookup failed:", err);
    return null;
  }
}

/** تصحيح نقاط عميل (±) — بيرجع الرصيد الجديد بعد التعديل، أو null عند الفشل */
export async function adminLoyaltyAdjustInSupabase(
  phone: string,
  delta: number,
  note?: string
): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc("admin_loyalty_adjust", {
      p_phone: phone,
      p_delta: delta,
      p_note: note ?? null,
    });
    if (error) {
      console.warn("Supabase admin_loyalty_adjust error:", error.message);
      return null;
    }
    return typeof data === "number" ? data : null;
  } catch (err) {
    console.warn("Supabase admin_loyalty_adjust failed:", err);
    return null;
  }
}

/** إلغاء كارت خصم (voided) أو إعادة تفعيله (active) — true بس لو حالة اتغيّرت فعلًا */
export async function adminLoyaltySetCardStatusInSupabase(
  phone: string,
  status: "active" | "voided"
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("admin_loyalty_set_card_status", {
      p_phone: phone,
      p_status: status,
    });
    if (error) {
      console.warn("Supabase admin_loyalty_set_card_status error:", error.message);
      return false;
    }
    return data === true;
  } catch (err) {
    console.warn("Supabase admin_loyalty_set_card_status failed:", err);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* تقييمات المناديب (courier_ratings — ترقية courier-ratings)          */
/* العميل يقيّم المندوب بالاسم بعد تسليم طلبه: الكتابة في السيرفر      */
/* الأول، والتأكيد في الواجهة ما بيظهرش غير بعد حفظ فعلي. تقييم       */
/* واحد لكل طلب (order_id unique + معرّف حتمي CR-<orderId>).          */
/* قبل ما الترقية تتركب الجدول مش موجود فالنتائج بترجع فشل صريح.      */
/* ------------------------------------------------------------------ */

export interface DbCourierRating {
  id: string;
  order_id: string;
  courier_id: string | null;
  courier_name: string | null;
  customer_phone: string;
  stars: number;
  comment: string | null;
  created_at: string;
}

export function mapDbRatingToRating(row: DbCourierRating): CourierRating {
  return {
    id: row.id,
    orderId: row.order_id,
    courierId: row.courier_id || undefined,
    courierName: row.courier_name || undefined,
    customerPhone: row.customer_phone || "",
    stars: Number(row.stars) || 0,
    comment: row.comment || undefined,
    createdAt: row.created_at,
  };
}

/**
 * إرسال تقييم مندوب — server-first: البيرجع ok:true بس لو الصف اتكتب
 * فعلًا. duplicate:true لو الطلب ده اتقيّم قبل كده (الواجهة بتعرض
 * التقييم الموجود بدل ما تعيد الإرسال).
 */
export async function insertCourierRatingToSupabase(r: {
  orderId: string;
  courierId?: string;
  courierName?: string;
  customerPhone: string;
  stars: number;
  comment?: string;
}): Promise<{ ok: boolean; duplicate: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from("courier_ratings").insert({
      id: `CR-${r.orderId}`,
      order_id: r.orderId,
      courier_id: r.courierId || null,
      courier_name: r.courierName || null,
      customer_phone: r.customerPhone,
      stars: r.stars,
      comment: r.comment?.trim() ? r.comment.trim().slice(0, 500) : null,
    });
    if (!error) return { ok: true, duplicate: false, error: null };
    /* 23505 = unique violation: الطلب اتقيّم قبل كده (أو نفس الإرسال اتكرر) */
    const code = (error as { code?: string }).code;
    if (code === "23505") return { ok: false, duplicate: true, error: null };
    console.warn("Supabase insertCourierRating error:", error.message);
    return { ok: false, duplicate: false, error: error.message };
  } catch (err) {
    console.warn("Supabase insertCourierRating failed:", err);
    return { ok: false, duplicate: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

/** تقييم العميل الحالي لطلب معيّن (لو قيّمه) — null لو لسه أو غير متاح */
export async function fetchMyCourierRatingFromSupabase(orderId: string): Promise<CourierRating | null> {
  try {
    const { data, error } = await supabase
      .from("courier_ratings")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();
    if (error || !data) return null;
    return mapDbRatingToRating(data as DbCourierRating);
  } catch {
    return null;
  }
}

/** كل التقييمات للطاقم (متوسطات لوحة الإدارة وآخر التعليقات) */
export async function fetchCourierRatingsFromSupabase(limit = 300): Promise<CourierRating[]> {
  try {
    const { data, error } = await supabase
      .from("courier_ratings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.warn("Supabase fetchCourierRatings error:", error.message);
      return [];
    }
    return (data as DbCourierRating[]).map(mapDbRatingToRating);
  } catch (err) {
    console.warn("Supabase fetchCourierRatings failed:", err);
    return [];
  }
}

// -------------------------------------------------------------
// التقرير اليومي + لوحة المناديب الحية (قراءات سيرفر بس — مفيش جداول
// جديدة: orders / courier_collections / courier_ratings + عدّادات
// الطوابير). حدود «اليوم» بنفس اتفاق باقي اللوحات: تاريخ UTC زي ما
// الطلب بيتحفظ (order.date = أول 10 حروف من created_at)، فأرقام
// التقرير بتطابق أرقام لوحة الأداء والتوريد دايمًا.
// كل دالة هنا بترجّع الخطأ صراحة (مش بتبلعه) — شاشة التقرير لازم
// تفرّق بين «مفيش بيانات» و«الجلب فشل».
// -------------------------------------------------------------

/** حدود يوم UTC كامل [gte, lt) بصيغة ISO من مفتاح يوم YYYY-MM-DD */
export function dayRangeIso(day: string): { gte: string; lt: string } {
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { gte: start.toISOString(), lt: end.toISOString() };
}

/** طلبات يوم بعينه (اتعملت في اليوم ده) — للتقرير اليومي */
export async function fetchOrdersForDayFromSupabase(
  day: string
): Promise<{ orders: Order[]; error: null } | { orders: null; error: string }> {
  try {
    const { gte, lt } = dayRangeIso(day);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .gte("created_at", gte)
      .lt("created_at", lt)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) return { orders: null, error: error.message };
    return { orders: (data as DbOrder[]).map(mapDbOrderToOrder), error: null };
  } catch (err) {
    return { orders: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/** كل الطلبات النشطة دلوقتي (pending/ready/shipping) — لكشف العالقة */
export async function fetchActiveOrdersFromSupabase(): Promise<
  { orders: Order[]; error: null } | { orders: null; error: string }
> {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["pending", "ready", "shipping"])
      .order("updated_at", { ascending: true })
      .limit(300);
    if (error) return { orders: null, error: error.message };
    return { orders: (data as DbOrder[]).map(mapDbOrderToOrder), error: null };
  } catch (err) {
    return { orders: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/** تحصيلات يوم بعينه (اتسجلت في اليوم ده) — للتقرير اليومي */
export async function fetchCourierCollectionsForDayFromSupabase(
  day: string
): Promise<
  { collections: CourierCollection[]; error: null } | { collections: null; error: string }
> {
  try {
    const { gte, lt } = dayRangeIso(day);
    const { data, error } = await supabase
      .from("courier_collections")
      .select("*")
      .gte("created_at", gte)
      .lt("created_at", lt)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) return { collections: null, error: error.message };
    return {
      collections: (data as DbCourierCollection[]).map(mapDbCollectionToCollection),
      error: null,
    };
  } catch (err) {
    return { collections: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface QueueSnapshot {
  /** طلبات واتساب لسه مستنية إجراء (status = sent) */
  whatsapp: number;
  /** طلبات نواقص لسه مستنية (status = pending) */
  shortage: number;
  /** حجوزات تمريض جديدة (status = new) */
  nursing: number;
  /** روشتات جديدة (status = new) */
  rx: number;
}

/**
 * لقطة الطوابير المستنية إجراء «دلوقتي» — عدّادات سيرفر دقيقة
 * (count exact) مش عدّ صفوف جت في آخر جلبة. أي عدّاد يفشل بيرجع
 * null للكل عشان الشاشة تعرض الخطأ بدل رقم ناقص يبان إنه الحقيقة.
 */
export async function fetchQueueSnapshotFromSupabase(): Promise<QueueSnapshot | null> {
  try {
    const count = async (table: string, status: string): Promise<number> => {
      const { count: n, error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      if (error) throw new Error(error.message);
      return n ?? 0;
    };
    const [whatsapp, shortage, nursing, rx] = await Promise.all([
      count("whatsapp_orders", "sent"),
      count("shortage_requests", "pending"),
      count("nursing_requests", "new"),
      count("rx_requests", "new"),
    ]);
    return { whatsapp, shortage, nursing, rx };
  } catch (err) {
    console.warn("Supabase fetchQueueSnapshot failed:", err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* النسخ الاحتياطي والأرشفة (ترقية data-archive — position 15)        */
/* التصدير: قراءة خام (select *) بصفحات من كل جدول — صفوف قاعدة       */
/* البيانات زي ما هي، من غير تحويل لأنواع العميل، عشان الاسترجاع     */
/* يرجّعها زي ما خرجت بالظبط. أي جدول يفشل بيرجع خطأ باسمه — مفيش     */
/* نسخة ناقصة بتتسمى كاملة.                                           */
/* الاسترجاع والأرشفة: دوال سيرفر أدمن-بس (restore_backup_table /     */
/* archive_old_operational_data) — الكتابة المباشرة من العميل          */
/* مستحيلة لجداول الولاء أصلًا (مفيش سياسات كتابة عليها).             */
/* قبل ما الترقية تتركب الدوال مش موجودة فالنتائج بترجع فشل صريح.    */
/* ------------------------------------------------------------------ */

const BACKUP_PAGE_SIZE = 1000;
/** سقف أمان: 200 صفحة × 1000 = 200 ألف صف للجدول الواحد */
const BACKUP_MAX_PAGES = 200;

/** ترتيب ثابت للجلب بالصفحات = عمود المفتاح الأساسي لكل جدول */
const BACKUP_ORDER_COLUMN: Record<string, string> = {
  loyalty_accounts: "customer_phone",
  warehouse_products: "sync_key",
};

export async function fetchBackupTableFromSupabase(
  table: string
): Promise<{ rows: Record<string, unknown>[]; error: null } | { rows: null; error: string }> {
  try {
    const orderCol = BACKUP_ORDER_COLUMN[table] ?? "id";
    const rows: Record<string, unknown>[] = [];
    for (let page = 0; page < BACKUP_MAX_PAGES; page++) {
      const from = page * BACKUP_PAGE_SIZE;
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order(orderCol, { ascending: true })
        .range(from, from + BACKUP_PAGE_SIZE - 1);
      if (error) return { rows: null, error: `${table}: ${error.message}` };
      const batch = (data ?? []) as Record<string, unknown>[];
      rows.push(...batch);
      if (batch.length < BACKUP_PAGE_SIZE) return { rows, error: null };
    }
    return { rows: null, error: `${table}: too many rows (>${BACKUP_MAX_PAGES * BACKUP_PAGE_SIZE})` };
  } catch (err) {
    return { rows: null, error: err instanceof Error ? err.message : String(err) };
  }
}

const RESTORE_CHUNK_SIZE = 200;

/**
 * استرجاع جدول واحد من نسخة: upsert على المفتاح الأساسي عبر دالة
 * السيرفر، على دفعات. بيرجع عدد الصفوف اللي اتكتبت فعلًا — ولو دفعة
 * فشلت بيوقف الجدول ده ويرجع الخطأ مع العدد اللي اتكتب قبله، عشان
 * الواجهة تقول الحقيقة بدل «تم» وهمية.
 */
export async function restoreBackupTableToSupabase(
  table: string,
  rows: Record<string, unknown>[]
): Promise<{ upserted: number; error: string | null }> {
  let upserted = 0;
  try {
    for (let i = 0; i < rows.length; i += RESTORE_CHUNK_SIZE) {
      const chunk = rows.slice(i, i + RESTORE_CHUNK_SIZE);
      const { data, error } = await supabase.rpc("restore_backup_table", {
        p_table: table,
        p_rows: chunk,
      });
      if (error) return { upserted, error: error.message };
      upserted += typeof data === "number" ? data : 0;
    }
    return { upserted, error: null };
  } catch (err) {
    return { upserted, error: err instanceof Error ? err.message : String(err) };
  }
}

/** معاينة الأرشفة: عدّادات اللي هيتحذف بنفس الحد — أدمن بس في السيرفر */
export async function fetchArchivePreviewFromSupabase(
  cutoffIso: string
): Promise<{ counts: Record<string, number>; error: null } | { counts: null; error: string }> {
  try {
    const { data, error } = await supabase.rpc("archive_preview_counts", { p_cutoff: cutoffIso });
    if (error) return { counts: null, error: error.message };
    return { counts: (data ?? {}) as Record<string, number>, error: null };
  } catch (err) {
    return { counts: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/** تنفيذ الأرشفة: حذف نهائي للتشغيلي القديم — أدمن بس، والأساسيات برّه الدالة أصلًا */
export async function archiveOldOperationalDataFromSupabase(
  cutoffIso: string
): Promise<{ counts: Record<string, number>; error: null } | { counts: null; error: string }> {
  try {
    const { data, error } = await supabase.rpc("archive_old_operational_data", { p_cutoff: cutoffIso });
    if (error) return { counts: null, error: error.message };
    return { counts: (data ?? {}) as Record<string, number>, error: null };
  } catch (err) {
    return { counts: null, error: err instanceof Error ? err.message : String(err) };
  }
}


/**
 * جلب قياسات المريض برقم الهاتف أو الكود الشخصي (للتوافق مع مودال الفحوصات)
 */
export async function fetchPatientMeasurements(identifier: string): Promise<PatientMeasurement[]> {
  const clean = identifier.trim();
  if (!clean) return [];
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_patient_measurements', {
      p_identifier: clean,
    });
    if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
      return (rpcData as DbPatientMeasurement[]).map(mapDbMeasurementToMeasurement);
    }
    const { data, error } = await supabase
      .from('patient_measurements')
      .select('*')
      .or(`patient_phone.eq.${clean},patient_code.eq.${clean}`)
      .order('recorded_at', { ascending: false });
    if (!error && data) {
      return (data as DbPatientMeasurement[]).map(mapDbMeasurementToMeasurement);
    }
    return [];
  } catch (err) {
    console.warn('[Supabase] fetchPatientMeasurements failed:', err);
    return [];
  }
}
