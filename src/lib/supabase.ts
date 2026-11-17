import { createClient } from "@supabase/supabase-js";
import type { Order, RxRequest, CareSubscriber, PatientMeasurement } from "./bahbah/data";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.invalid";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing-build-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
    status: (row.status as "active" | "paused") || "active",
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

/* طابور الطلبات اللي فشل حفظها (شبكة ضعيفة / انقطاع) — بيتعاد إرسالها تلقائيًا */
const PENDING_ORDERS_KEY = "bahbah_pending_orders_v1";

function readPendingOrders(): Partial<DbOrder>[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PENDING_ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingOrders(list: Partial<DbOrder>[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PENDING_ORDERS_KEY, JSON.stringify(list));
  } catch {
    /* التخزين ممتلئ أو محجوب — مفيش حاجة نعملها */
  }
}

function queuePendingOrder(payload: Partial<DbOrder>) {
  const list = readPendingOrders();
  if (!list.some((p) => p.id === payload.id)) {
    writePendingOrders([...list, payload]);
  }
}

/** رقم مفتاح مكرر = الطلب موجود فعلًا في القاعدة، يعتبر نجاح */
function isDuplicateKeyError(error: { code?: string; message?: string }) {
  return error.code === "23505" || /duplicate key/i.test(error.message || "");
}

// Insert Order — returns the payload on success, null if it was queued for retry
export async function insertOrderToSupabase(order: Order, subtotal?: number) {
  const payload = mapOrderToDb(order, subtotal);
  try {
    // Note: Do NOT use .select() here so anon inserts succeed without requiring SELECT permissions
    const { error } = await supabase.from("orders").insert(payload);
    if (error && !isDuplicateKeyError(error)) {
      console.warn("Supabase insertOrder error:", error.message, error);
      queuePendingOrder(payload);
      return null;
    }
    console.log("⚡ [Supabase Sync] Order inserted successfully into Supabase:", order.id);
    return payload;
  } catch (err) {
    console.warn("Supabase insertOrder failed:", err);
    queuePendingOrder(payload);
    return null;
  }
}

/** إعادة إرسال الطلبات المعلّقة — بتتنادى عند فتح التطبيق ولما النت يرجع */
export async function flushPendingOrders() {
  const pending = readPendingOrders();
  if (pending.length === 0) return;
  const stillPending: Partial<DbOrder>[] = [];
  for (const payload of pending) {
    try {
      const { error } = await supabase.from("orders").insert(payload);
      if (error && !isDuplicateKeyError(error)) {
        console.warn("Supabase flushPendingOrders error:", error.message);
        stillPending.push(payload);
      } else {
        console.log("⚡ [Supabase Sync] Pending order delivered:", payload.id);
      }
    } catch {
      stillPending.push(payload);
    }
  }
  writePendingOrders(stillPending);
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

// Update Order Status in Supabase
export async function updateOrderStatusInSupabase(
  orderId: string,
  patch: Partial<DbOrder>
) {
  try {
    const { error } = await supabase
      .from("orders")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) console.warn("Supabase updateOrder error:", error.message);
  } catch (err) {
    console.warn("Supabase updateOrder failed:", err);
  }
}

// Upload Rx Prescription Image to Supabase Storage
export async function uploadRxPrescriptionImage(file: File): Promise<string | null> {
  try {
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `rx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data, error } = await supabase.storage
      .from("rx-prescriptions")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.warn("Supabase storage upload error:", error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("rx-prescriptions")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (err) {
    console.warn("Supabase storage upload failed:", err);
    return null;
  }
}

// Insert Rx Request
export async function insertRxRequestToSupabase(rx: RxRequest) {
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
    if (error) console.warn("Supabase insertRx error:", error.message);
  } catch (err) {
    console.warn("Supabase insertRx failed:", err);
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

// Update Rx Request Status
export async function updateRxStatusInSupabase(id: string, status: string) {
  try {
    const { error } = await supabase
      .from("rx_requests")
      .update({ status })
      .eq("id", id);
    if (error) console.warn("Supabase updateRx error:", error.message);
  } catch (err) {
    console.warn("Supabase updateRx failed:", err);
  }
}

// Update Care Subscription Status
export async function updateCareSubStatusInSupabase(id: string, status: string) {
  try {
    const { error } = await supabase
      .from("care_subscriptions")
      .update({ status })
      .eq("id", id);
    if (error) console.warn("Supabase updateCareSub error:", error.message);
  } catch (err) {
    console.warn("Supabase updateCareSub failed:", err);
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
}) {
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
    if (error) console.warn("Supabase insertCare error:", error.message);
  } catch (err) {
    console.warn("Supabase insertCare failed:", err);
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
export async function insertMeasurementToSupabase(m: PatientMeasurement) {
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
    if (error) console.warn("[Supabase Measurements] insert error:", error.message);
  } catch (err) {
    console.warn("[Supabase Measurements] insert failed:", err);
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

// -------------------------------------------------------------
// Admin Settings & Realtime Store Sync
// -------------------------------------------------------------
export async function syncAdminSettingsToSupabase(patch: Record<string, unknown>) {
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
    } else {
      console.log("⚡ [Bahbah Supabase Sync] Admin settings updated in Supabase:", Object.keys(patch));
    }
  } catch (err) {
    console.warn("[Supabase Sync] Failed to update admin settings:", err);
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
