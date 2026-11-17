import {
  supabase,
  mapDbOrderToOrder,
  mapDbRxToRx,
  mapDbCareToSubscriber,
  mapDbMeasurementToMeasurement,
  flushPendingOrders,
  type DbOrder,
  type DbRxRequest,
  type DbCareSubscription,
  type DbPatientMeasurement,
} from "../supabase";
import { useBahbah, notifyNewOrder } from "./store";
import type { Order, RxRequest, CareSubscriber, PatientMeasurement, Role, Product, Coupon } from "./data";
import type { SiteEdits, AdEdit, CareEdit, ZoneEdit } from "./store";

let isInitialized = false;

/**
 * دمج تحديث قادم من Supabase فوق الطلب المحلي.
 * بيحدّث الحالة والمندوب والمجموع بس — ما بيلمسش نوع التوصيل (توصيل/استلام)
 * ولا الميعاد ولا أسماء المنطقة ولا علامة mine، لأن صف القاعدة ما بيحملهاش.
 */
function mergeRemoteOrder(local: Order, remote: Order): Order {
  return {
    ...local,
    status: remote.status,
    total: remote.total || local.total,
    delivery: {
      type: "delivery",
      ...local.delivery,
      driverId: remote.delivery?.driverId ?? local.delivery?.driverId,
    },
  };
}

export interface DbAdminSettings {
  id: string;
  admin_pass?: string;
  site_edits?: SiteEdits;
  ad_edits?: Record<string, AdEdit>;
  care_edits?: Record<string, CareEdit>;
  zone_edits?: Record<string, ZoneEdit>;
  ads_off?: string[];
  stock_adj?: Record<string, number>;
  price_override?: Record<string, number>;
  custom_products?: Product[];
  coupons?: Coupon[];
  updated_at?: string;
}

/** Sync any admin configuration changes directly to Supabase */
export async function syncAdminSettingsToSupabase(patch: Partial<DbAdminSettings>) {
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
      console.log("⚡ [Bahbah Supabase Sync] Admin settings saved to Supabase:", Object.keys(patch));
    }
  } catch (err) {
    console.warn("[Supabase Sync] Failed to update admin settings:", err);
  }
}

/** Supabase Auth: Sign In */
export async function signInWithSupabase(email: string, pass: string) {
  return await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: pass,
  });
}

/** Supabase Auth: Sign Up */
export async function signUpWithSupabase(
  email: string,
  pass: string,
  metadata: { name: string; phone?: string; role?: Role }
) {
  return await supabase.auth.signUp({
    email: email.trim(),
    password: pass,
    options: {
      data: metadata,
    },
  });
}

/** Supabase Auth: Sign Out */
export async function signOutFromSupabase() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("[Supabase Auth] Sign out error:", err);
  }
}

export function initSupabaseSync() {
  if (typeof window === "undefined") return () => {};
  if (isInitialized) return () => {};
  isInitialized = true;

  console.log("⚡ [Bahbah Supabase Sync] Initializing live database synchronization...");

  // 0. إعادة إرسال أي طلبات اتعلّقت بسبب انقطاع النت (دلوقتي، وكل ما النت يرجع)
  flushPendingOrders();
  const onOnline = () => {
    flushPendingOrders();
  };
  window.addEventListener("online", onOnline);

  // 1. Initial Data Fetch: Orders
  (async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.warn("[Supabase Sync] Orders fetch error:", error.message);
        return;
      }
      if (data) {
        const remoteOrders = (data as DbOrder[]).map(mapDbOrderToOrder);
        useBahbah.setState({ adminOrders: remoteOrders });
        console.log(`⚡ [Bahbah Supabase Sync] Synced ${remoteOrders.length} orders from Supabase.`);
      }
    } catch (err) {
      console.warn("[Supabase Sync] Orders fetch failed:", err);
    }
  })();

  // 2. Initial Data Fetch: Rx Requests
  (async () => {
    try {
      const { data, error } = await supabase
        .from("rx_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.warn("[Supabase Sync] Rx fetch error:", error.message);
        return;
      }
      if (data) {
        const remoteRx = (data as DbRxRequest[]).map(mapDbRxToRx);
        useBahbah.setState({ rxQueue: remoteRx });
        console.log(`⚡ [Bahbah Supabase Sync] Synced ${remoteRx.length} prescriptions.`);
      }
    } catch (err) {
      console.warn("[Supabase Sync] Rx fetch failed:", err);
    }
  })();

  // 3. Initial Data Fetch: Care Subscriptions
  (async () => {
    try {
      const { data, error } = await supabase
        .from("care_subscriptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.warn("[Supabase Sync] Care subs fetch error:", error.message);
        return;
      }
      if (data) {
        const remoteSubs = (data as DbCareSubscription[]).map(mapDbCareToSubscriber);
        useBahbah.setState({ careSubs: remoteSubs });
        console.log(`⚡ [Bahbah Supabase Sync] Synced ${remoteSubs.length} care subscriptions.`);
      }
    } catch (err) {
      console.warn("[Supabase Sync] Care subs fetch failed:", err);
    }
  })();

  // 3b. Initial Data Fetch: Patient Measurements
  (async () => {
    try {
      const { data, error } = await supabase
        .from("patient_measurements")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(100);

      if (error) {
        console.warn("[Supabase Sync] Measurements fetch error:", error.message);
        return;
      }
      if (data && data.length > 0) {
        const remoteMeas = (data as DbPatientMeasurement[]).map(mapDbMeasurementToMeasurement);
        const existing = useBahbah.getState().measurements || [];
        // merge unique by id
        const merged = [...remoteMeas];
        for (const m of existing) {
          if (!merged.some((r) => r.id === m.id)) {
            merged.push(m);
          }
        }
        useBahbah.setState({ measurements: merged });
        console.log(`⚡ [Bahbah Supabase Sync] Synced ${remoteMeas.length} measurements.`);
      }
    } catch (err) {
      console.warn("[Supabase Sync] Measurements fetch failed:", err);
    }
  })();

  // 4. Initial Data Fetch: Admin Settings (Live CMS & Access Control)
  (async () => {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .eq("id", "global")
        .single();

      if (error) {
        console.warn("[Supabase Sync] Admin settings fetch error:", error.message);
        return;
      }
      if (data) {
        const s = data as DbAdminSettings;
        const updates: Record<string, unknown> = {};
        if (s.admin_pass) updates.adminPass = s.admin_pass;
        if (s.site_edits && Object.keys(s.site_edits).length > 0) updates.siteEdits = s.site_edits;
        if (s.ad_edits && Object.keys(s.ad_edits).length > 0) updates.adEdits = s.ad_edits;
        if (s.care_edits && Object.keys(s.care_edits).length > 0) updates.careEdits = s.care_edits;
        if (s.zone_edits && Object.keys(s.zone_edits).length > 0) updates.zoneEdits = s.zone_edits;
        if (Array.isArray(s.ads_off)) updates.adsOff = s.ads_off;
        if (s.stock_adj && Object.keys(s.stock_adj).length > 0) updates.stockAdj = s.stock_adj;
        if (s.price_override && Object.keys(s.price_override).length > 0) updates.priceOverride = s.price_override;
        if (Array.isArray(s.custom_products) && s.custom_products.length > 0) updates.customProducts = s.custom_products;
        if (Array.isArray(s.coupons) && s.coupons.length > 0) updates.coupons = s.coupons;

        if (Object.keys(updates).length > 0) {
          useBahbah.setState(updates);
          console.log("⚡ [Bahbah Supabase Sync] Synced admin settings from Supabase.");
        }
      }
    } catch (err) {
      console.warn("[Supabase Sync] Admin settings fetch failed:", err);
    }
  })();

  // 5. Real-time Subscription: Orders
  const ordersChannel = supabase
    .channel("bahbah-realtime-orders")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      (payload) => {
        console.log("⚡ [Supabase Realtime] Order event:", payload.eventType, payload.new);
        const state = useBahbah.getState();
        const currentAdminOrders = state.adminOrders || [];

        if (payload.eventType === "INSERT") {
          const newOrder = mapDbOrderToOrder(payload.new as DbOrder);
          if (!currentAdminOrders.some((o) => o.id === newOrder.id)) {
            useBahbah.setState({
              adminOrders: [newOrder, ...currentAdminOrders],
            });
            notifyNewOrder(newOrder);
          }
        } else if (payload.eventType === "UPDATE") {
          const updatedOrder = mapDbOrderToOrder(payload.new as DbOrder);
          useBahbah.setState({
            adminOrders: currentAdminOrders.map((o) =>
              o.id === updatedOrder.id ? mergeRemoteOrder(o, updatedOrder) : o
            ),
            myOrders: state.myOrders.map((o) =>
              o.id === updatedOrder.id ? mergeRemoteOrder(o, updatedOrder) : o
            ),
          });
        } else if (payload.eventType === "DELETE") {
          const deletedId = (payload.old as { id?: string })?.id;
          if (deletedId) {
            useBahbah.setState({
              adminOrders: currentAdminOrders.filter((o) => o.id !== deletedId),
              myOrders: state.myOrders.filter((o) => o.id !== deletedId),
            });
          }
        }
      }
    )
    .subscribe();

  // 6. Real-time Subscription: Prescriptions (rx_requests)
  const rxChannel = supabase
    .channel("bahbah-realtime-rx")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rx_requests" },
      (payload) => {
        console.log("⚡ [Supabase Realtime] Rx event:", payload.eventType, payload.new);
        const state = useBahbah.getState();
        if (payload.eventType === "INSERT") {
          const newRx = mapDbRxToRx(payload.new as DbRxRequest);
          if (!state.rxQueue.some((r) => r.id === newRx.id)) {
            useBahbah.setState({ rxQueue: [newRx, ...state.rxQueue] });
          }
        } else if (payload.eventType === "UPDATE") {
          const updatedRx = mapDbRxToRx(payload.new as DbRxRequest);
          useBahbah.setState({
            rxQueue: state.rxQueue.map((r) => (r.id === updatedRx.id ? updatedRx : r)),
          });
        }
      }
    )
    .subscribe();

  // 7. Real-time Subscription: Care Subscriptions
  const careChannel = supabase
    .channel("bahbah-realtime-care")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "care_subscriptions" },
      (payload) => {
        console.log("⚡ [Supabase Realtime] Care event:", payload.eventType, payload.new);
        const state = useBahbah.getState();
        if (payload.eventType === "INSERT") {
          const newSub = mapDbCareToSubscriber(payload.new as DbCareSubscription);
          if (!state.careSubs.some((s) => s.id === newSub.id)) {
            useBahbah.setState({ careSubs: [newSub, ...state.careSubs] });
          }
        } else if (payload.eventType === "UPDATE") {
          const updatedSub = mapDbCareToSubscriber(payload.new as DbCareSubscription);
          useBahbah.setState({
            careSubs: state.careSubs.map((s) => (s.id === updatedSub.id ? updatedSub : s)),
          });
        }
      }
    )
    .subscribe();

  // 7b. Real-time Subscription: Patient Measurements
  const measChannel = supabase
    .channel("bahbah-realtime-measurements")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "patient_measurements" },
      (payload) => {
        console.log("⚡ [Supabase Realtime] Measurement event:", payload.eventType, payload.new);
        const state = useBahbah.getState();
        const currentMeas = state.measurements || [];
        if (payload.eventType === "INSERT") {
          const newM = mapDbMeasurementToMeasurement(payload.new as DbPatientMeasurement);
          if (!currentMeas.some((m) => m.id === newM.id)) {
            useBahbah.setState({ measurements: [newM, ...currentMeas] });
          }
        } else if (payload.eventType === "UPDATE") {
          const updatedM = mapDbMeasurementToMeasurement(payload.new as DbPatientMeasurement);
          useBahbah.setState({
            measurements: currentMeas.map((m) => (m.id === updatedM.id ? updatedM : m)),
          });
        } else if (payload.eventType === "DELETE") {
          const deletedId = (payload.old as { id?: string })?.id;
          if (deletedId) {
            useBahbah.setState({
              measurements: currentMeas.filter((m) => m.id !== deletedId),
            });
          }
        }
      }
    )
    .subscribe();

  // 8. Real-time Subscription: Admin Settings
  const settingsChannel = supabase
    .channel("bahbah-realtime-settings")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "admin_settings" },
      (payload) => {
        console.log("⚡ [Supabase Realtime] Settings event:", payload.eventType, payload.new);
        if (payload.new) {
          const s = payload.new as DbAdminSettings;
          const updates: Record<string, unknown> = {};
          if (s.admin_pass) updates.adminPass = s.admin_pass;
          if (s.site_edits) updates.siteEdits = s.site_edits;
          if (s.ad_edits) updates.adEdits = s.ad_edits;
          if (s.care_edits) updates.careEdits = s.care_edits;
          if (s.zone_edits) updates.zoneEdits = s.zone_edits;
          if (Array.isArray(s.ads_off)) updates.adsOff = s.ads_off;
          if (s.stock_adj) updates.stockAdj = s.stock_adj;
          if (s.price_override) updates.priceOverride = s.price_override;
          if (Array.isArray(s.custom_products)) updates.customProducts = s.custom_products;
          if (Array.isArray(s.coupons)) updates.coupons = s.coupons;

          if (Object.keys(updates).length > 0) {
            useBahbah.setState(updates);
            console.log("⚡ [Bahbah Supabase Sync] Realtime applied admin settings update.");
          }
        }
      }
    )
    .subscribe();

  // 9. Auth State Listener
  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    console.log("⚡ [Supabase Auth Event]:", event, session?.user?.email);
    if (event === "SIGNED_OUT") {
      useBahbah.setState({ user: null, adminUnlocked: false });
    } else if (event === "SIGNED_IN" && session?.user) {
      const meta = session.user.user_metadata || {};
      const role: Role = (meta.role as Role) || "patient";
      const name = meta.name || session.user.email?.split("@")[0] || "User";
      useBahbah.setState({
        user: {
          name,
          email: session.user.email || "",
          phone: meta.phone || undefined,
          role,
          driverId: meta.driverId,
        },
        adminUnlocked: role === "admin",
      });
    }
  });

  return () => {
    window.removeEventListener("online", onOnline);
    supabase.removeChannel(ordersChannel);
    supabase.removeChannel(rxChannel);
    supabase.removeChannel(careChannel);
    supabase.removeChannel(measChannel);
    supabase.removeChannel(settingsChannel);
    authListener?.subscription.unsubscribe();
  };
}
