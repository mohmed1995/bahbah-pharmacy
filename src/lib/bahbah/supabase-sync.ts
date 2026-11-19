import {
  supabase,
  mapDbOrderToOrder,
  mapDbRxToRx,
  mapDbCareToSubscriber,
  mapDbMeasurementToMeasurement,
  flushPendingOrders,
  fetchPublicSettingsFromSupabase,
  fetchWhatsappOrdersFromSupabase,
  fetchShortageRequestsFromSupabase,
  fetchNursingRequestsFromSupabase,
  fetchCourierCollectionsFromSupabase,
  fetchCustomerAddressesFromSupabase,
  upsertCustomerAddressToSupabase,
  ensureLoyaltyFromSupabase,
  trackOrderStatus,
  mapDbCollectionToCollection,
  fetchMyStaffPermissions,
  roleFromSupabaseUser,
  driverIdFromSupabaseUser,
  type DbOrder,
  type DbRxRequest,
  type DbCareSubscription,
  type DbPatientMeasurement,
  type DbCourierCollection,
} from "../supabase";
import {
  useBahbah,
  notifyNewOrder,
  notifyNewRx,
  notifyNewMeasurement,
  notifyNewCareSub,
  notifyMyOrderStatus,
  notifyCourierAssignment,
  notifyNewCollection,
} from "./store";
import type { Order, RxRequest, CareSubscriber, PatientMeasurement, Role, Product, Coupon, Driver, DriverStatus } from "./data";
import { planMyOrderSync, type ServerOrderStatus } from "./reports";
import type { SiteEdits, AdEdit, CareEdit, ZoneEdit, AdminSettings, NursingServiceEdit, OfferEdit } from "./store";
import type { NursingService } from "./data";

let isInitialized = false;

/* أعمدة الإعدادات العامة — من غير أي أسرار (admin_pass اتشال من الكود نهائيًا) */
const PUBLIC_SETTINGS_COLUMNS =
  "id,site_edits,ad_edits,care_edits,zone_edits,nursing_edits,nursing_custom,ads_off,stock_adj,price_override,custom_products,coupons,updated_at";

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
      /* القيمة القادمة من القاعدة هي المرجع حتى لو فاضية — عشان إلغاء تعيين المندوب
         (courier_id = null) يوصل للعميل. mapDbOrderToOrder دايمًا بترجع كائن delivery. */
      driverId: remote.delivery?.driverId,
    },
  };
}

export interface DbAdminSettings {
  id: string;
  site_edits?: SiteEdits;
  ad_edits?: Record<string, AdEdit>;
  care_edits?: Record<string, CareEdit>;
  zone_edits?: Record<string, ZoneEdit>;
  nursing_edits?: Record<string, NursingServiceEdit>;
  nursing_custom?: NursingService[];
  ads_off?: string[];
  stock_adj?: Record<string, number>;
  price_override?: Record<string, number>;
  custom_products?: Product[];
  coupons?: Coupon[];
  /* مفاتيح «إصلاح التوصيلات»: تعديلات صور المنتجات + المناديب وحالاتهم +
     المناطق المقفولة — أعمدة منفصلة في admin_settings (ترقية wiring-fixes) */
  img_override?: Record<string, { img: string; verified?: boolean }>;
  custom_drivers?: Driver[];
  driver_status?: Record<string, DriverStatus>;
  /* مناديب أزالهم المدير (ترقية integrity-fixes) — بيختفوا من كل قوائم التعيين */
  driver_removed?: string[];
  /* رسائل واتساب الجاهزة للمناديب (ترقية courier-ratings) — بيعدّلها المدير */
  courier_msg_templates?: string[];
  zone_disabled?: string[];
  offer_edits?: Record<string, OfferEdit>;
  /* حالة المحل (فتح/قفل + استقبال طلبات) — بتتزامن من لوحة التحكم لكل الواجهات */
  settings?: Partial<AdminSettings>;
  updated_at?: string;
}

/** يبني تحديثات الـ store من صف إعدادات جاي من السيرفر (fetch أو realtime) */
function settingsUpdatesFromRow(s: DbAdminSettings): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (s.site_edits && Object.keys(s.site_edits).length > 0) updates.siteEdits = s.site_edits;
  if (s.ad_edits && Object.keys(s.ad_edits).length > 0) updates.adEdits = s.ad_edits;
  if (s.care_edits && Object.keys(s.care_edits).length > 0) updates.careEdits = s.care_edits;
  if (s.zone_edits && Object.keys(s.zone_edits).length > 0) updates.zoneEdits = s.zone_edits;
  if (s.nursing_edits && Object.keys(s.nursing_edits).length > 0) updates.nursingEdits = s.nursing_edits;
  if (Array.isArray(s.nursing_custom)) updates.nursingCustom = s.nursing_custom;
  if (Array.isArray(s.ads_off)) updates.adsOff = s.ads_off;
  if (s.stock_adj && Object.keys(s.stock_adj).length > 0) updates.stockAdj = s.stock_adj;
  if (s.price_override && Object.keys(s.price_override).length > 0) updates.priceOverride = s.price_override;
  if (Array.isArray(s.custom_products) && s.custom_products.length > 0) updates.customProducts = s.custom_products;
  if (Array.isArray(s.coupons) && s.coupons.length > 0) updates.coupons = s.coupons;
  if (s.img_override && Object.keys(s.img_override).length > 0) updates.productImgOverride = s.img_override;
  if (Array.isArray(s.custom_drivers) && s.custom_drivers.length > 0) updates.customDrivers = s.custom_drivers;
  if (s.driver_status && Object.keys(s.driver_status).length > 0) updates.driverStatus = s.driver_status;
  if (Array.isArray(s.driver_removed)) updates.driverRemoved = s.driver_removed;
  if (Array.isArray(s.courier_msg_templates) && s.courier_msg_templates.length > 0)
    updates.courierMsgTemplates = s.courier_msg_templates;
  if (Array.isArray(s.zone_disabled)) updates.zoneDisabled = s.zone_disabled;
  if (s.offer_edits && Object.keys(s.offer_edits).length > 0) updates.offerEdits = s.offer_edits;
  if (s.settings && typeof s.settings === "object") {
    /* ندمج فوق الإعدادات الحالية عشان أي حقل ناقص في الصف ما يصفّرش قيمة محلية */
    updates.settings = { ...useBahbah.getState().settings, ...s.settings };
  }
  return updates;
}

/** Sync any admin configuration changes directly to Supabase.
 *  بترجّع true بس لو السيرفر أكّد الحفظ — الفشل بيرجع false مش بيُبلع. */
export async function syncAdminSettingsToSupabase(patch: Partial<DbAdminSettings>): Promise<boolean> {
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
    console.log("⚡ [Bahbah Supabase Sync] Admin settings saved to Supabase:", Object.keys(patch));
    return true;
  } catch (err) {
    console.warn("[Supabase Sync] Failed to update admin settings:", err);
    return false;
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

  /* ---- مراقب حالات طلبات العميل (لكل الشاشات، مش شاشة التتبع بس) ----
     العميل مالهوش قناة realtime على orders (RLS) — مساره الوحيد هو فحص
     track_order. شاشة التتبع كانت بتعمل ده لطلب واحد وهي مفتوحة بس؛
     المراقب ده بيعمّمه: كل 15 ثانية بنسأل السيرفر عن حالة كل طلبات
     العميل غير النهائية، وأي تغيّر مؤكد من السيرفر بيحدّث الحالة
     المحلية وبينبّه (notifyMyOrderStatus بصوت + تنبيه + إشعار متصفح).
     مفيش تنبيه بيطلع على حركة محلية متفائلة أبدًا — القرار كله من
     planMyOrderSync النقي، وسجل التنبيهات بيمنع التكرار بين المسارات. */
  const myOrderLastKnown = new Map<string, string>();
  const myOrderNotified = new Set<string>();
  let myOrderPollInFlight = false;
  const myOrderTick = async () => {
    if (myOrderPollInFlight) return; // لا فحصين متداخلين أبدًا
    const active = useBahbah
      .getState()
      .myOrders.filter(
        (o) => o.status === "pending" || o.status === "ready" || o.status === "shipping"
      );
    if (active.length === 0) return;
    myOrderPollInFlight = true;
    try {
      const server = new Map<string, ServerOrderStatus>();
      await Promise.all(
        active.map(async (o) => {
          const r = await trackOrderStatus(o.id);
          if (r) {
            server.set(o.id, {
              status: r.status as Order["status"],
              courierId: r.courier_id ?? undefined,
            });
          }
        })
      );
      if (server.size === 0) return;
      const plan = planMyOrderSync(
        useBahbah.getState().myOrders,
        server,
        myOrderLastKnown,
        myOrderNotified
      );
      if (plan.patches.length > 0) {
        const patchById = new Map(plan.patches.map((p) => [p.id, p]));
        useBahbah.setState((st) => ({
          myOrders: st.myOrders.map((o) => {
            const p = patchById.get(o.id);
            if (!p) return o;
            return {
              ...o,
              status: p.status,
              delivery: o.delivery
                ? { ...o.delivery, driverId: p.courierId ?? o.delivery.driverId }
                : o.delivery,
            };
          }),
        }));
      }
      for (const o of plan.toNotify) notifyMyOrderStatus(o);
    } finally {
      myOrderPollInFlight = false;
    }
  };
  const myOrderTimer = setInterval(() => {
    void myOrderTick();
  }, 15000);

  /* ---- بيانات خاصة (طلبات / روشتات / اشتراكات / قياسات): للطاقم الموثّق بس ----
     كانت بتتحمّل وبتتفتح لها قنوات realtime عند كل زائر مجهول = تسريب أسماء وأرقام وعناوين
     وبيانات طبية لأي حد. دلوقتي بتشتغل بس لما تبقى جلسة Supabase بدور طاقم. */
  let privateCleanup: (() => void) | null = null;
  const startPrivateSync = () => {
    if (privateCleanup) return;
    /* تنبيهات المتصفح للطاقم: نطلب الإذن مرة واحدة (بهدوء — الرفض مش بيكسر حاجة) */
    try {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    } catch {}
    const cleanups: Array<() => void> = [];
    let cancelled = false;
    cleanups.push(() => {
      cancelled = true;
    });

    // 0b. صلاحيات الموظف الحالي من staff_permissions (المدير بيوزعها من لوحته).
    //     مفيش صف/الجدول مش موجود → null → الواجهة ترجع لافتراضات الدور.
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const email = data.user?.email;
        if (!email) return;
        const perms = await fetchMyStaffPermissions(email);
        if (cancelled) return;
        useBahbah.setState({ staffPermissions: perms });
      } catch (err) {
        console.warn("[Supabase Sync] Staff permissions fetch failed:", err);
      }
    })();

    // 1. Initial Data Fetch: Orders
    (async () => {
      useBahbah.setState({ dashSyncStatus: "loading", dashSyncError: null });
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) {
          console.warn("[Supabase Sync] Orders fetch error:", error.message);
          /* الفشل لازم يبان في لوحة الأداء — مش يتبلع في الكونسول بس */
          if (!cancelled) {
            useBahbah.setState({ dashSyncStatus: "error", dashSyncError: error.message });
          }
          return;
        }
        if (data) {
          if (cancelled) return;
          const remoteOrders = (data as DbOrder[]).map(mapDbOrderToOrder);
          /* من اللحظة دي السيرفر هو مصدر الطلبات الوحيد — أي بيانات تجريبية بتتقفل */
          useBahbah.setState({
            adminOrders: remoteOrders,
            serverOrdersLoaded: true,
            lastSyncAt: new Date().toISOString(),
            dashSyncStatus: "ok",
            dashSyncError: null,
          });
          console.log(`⚡ [Bahbah Supabase Sync] Synced ${remoteOrders.length} orders from Supabase.`);
        }
      } catch (err) {
        console.warn("[Supabase Sync] Orders fetch failed:", err);
        if (!cancelled) {
          useBahbah.setState({
            dashSyncStatus: "error",
            dashSyncError: err instanceof Error ? err.message : String(err),
          });
        }
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
          if (cancelled) return;
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
          if (cancelled) return;
          const remoteSubs = (data as DbCareSubscription[]).map(mapDbCareToSubscriber);
          useBahbah.setState({ careSubs: remoteSubs });
          console.log(`⚡ [Bahbah Supabase Sync] Synced ${remoteSubs.length} care subscriptions.`);
        }
      } catch (err) {
        console.warn("[Supabase Sync] Care subs fetch failed:", err);
      }
    })();

    // 3c. Initial Data Fetch: WhatsApp Quick Orders (staff only via RLS)
    (async () => {
      try {
        const rows = await fetchWhatsappOrdersFromSupabase(40);
        if (cancelled) return;
        if (rows.length > 0) {
          useBahbah.setState({ whatsappOrders: rows });
          console.log(`⚡ [Bahbah Supabase Sync] Synced ${rows.length} WhatsApp orders.`);
        }
      } catch (err) {
        console.warn("[Supabase Sync] WhatsApp orders fetch failed:", err);
      }
    })();

    // 3d. Initial Data Fetch: Shortage Requests (staff only via RLS)
    (async () => {
      try {
        const rows = await fetchShortageRequestsFromSupabase(40);
        if (cancelled) return;
        if (rows.length > 0) {
          useBahbah.setState({ shortageRequests: rows });
          console.log(`⚡ [Bahbah Supabase Sync] Synced ${rows.length} shortage requests.`);
        }
      } catch (err) {
        console.warn("[Supabase Sync] Shortage requests fetch failed:", err);
      }
    })();

    // 3d2. Initial Data Fetch: Nursing Requests (staff only via RLS + صلاحية التمريض)
    (async () => {
      try {
        const rows = await fetchNursingRequestsFromSupabase(40);
        if (cancelled) return;
        if (rows.length > 0) {
          useBahbah.setState({ nursingRequests: rows });
          console.log(`⚡ [Bahbah Supabase Sync] Synced ${rows.length} nursing requests.`);
        }
      } catch (err) {
        console.warn("[Supabase Sync] Nursing requests fetch failed:", err);
      }
    })();

    // 3e. Initial Data Fetch: Courier Collections (التوريد) — للمدير بس.
    //     RLS أصلًا بيقصر القراءة على أدمن/ماليات، وهنا كمان مش بنطلبها
    //     غير في جلسة أدمن عشان مفيش مبلغ يعدي على جهاز صيدلي بأي شكل.
    if (useBahbah.getState().sessionRole === "admin") {
      (async () => {
        try {
          const rows = await fetchCourierCollectionsFromSupabase(100);
          if (cancelled) return;
          if (rows.length > 0) {
            useBahbah.setState({ courierCollections: rows });
            console.log(`⚡ [Bahbah Supabase Sync] Synced ${rows.length} courier collections.`);
          }
        } catch (err) {
          console.warn("[Supabase Sync] Courier collections fetch failed:", err);
        }
      })();
    }

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
          if (cancelled) return;
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

    /* تنبيه المندوب مرة واحدة لكل إسناد في الجلسة — مش مع كل حدث/تحديث.
       لو الطلب اتسحب منه، بيرجع يتنبّه لو اتسند له تاني. */
    const courierAlertedOrders = new Set<string>();
    const alertCourierOnce = (order: Order) => {
      if (courierAlertedOrders.has(order.id)) return;
      courierAlertedOrders.add(order.id);
      notifyCourierAssignment(order);
    };

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
                serverOrdersLoaded: true,
                lastSyncAt: new Date().toISOString(),
                dashSyncStatus: "ok",
                dashSyncError: null,
              });
              notifyNewOrder(newOrder);
              /* طلب جديد متعين لمندوب بعينه من لحظة إنشائه = توصيلة بتاعته */
              if (
                state.sessionRole === "courier" &&
                state.user?.driverId &&
                newOrder.delivery?.driverId === state.user.driverId &&
                (newOrder.status === "pending" || newOrder.status === "ready")
              ) {
                alertCourierOnce(newOrder);
              }
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedOrder = mapDbOrderToOrder(payload.new as DbOrder);
            /* تنبيه المندوب: التوصيلة بقت بتاعته — الطلب اتجهز وهو متعين له،
               أو اتعين له وهو جاهز/جديد. (قبل كده قائمته كانت بتتحدث بصمت.) */
            if (state.sessionRole === "courier" && state.user?.driverId) {
              const myId = state.user.driverId;
              const prev = currentAdminOrders.find((o) => o.id === updatedOrder.id);
              const becameMine =
                updatedOrder.delivery?.driverId === myId && prev?.delivery?.driverId !== myId;
              const becameReadyForMe =
                updatedOrder.delivery?.driverId === myId &&
                updatedOrder.status === "ready" &&
                prev?.status !== "ready";
              if (updatedOrder.delivery?.driverId !== myId) {
                courierAlertedOrders.delete(updatedOrder.id); // اتسحب منه
              } else if (
                becameReadyForMe ||
                (becameMine && (updatedOrder.status === "ready" || updatedOrder.status === "pending"))
              ) {
                alertCourierOnce(updatedOrder);
              }
            }
            /* تنبيه العميل: لو ده طلبه وحالته اتغيرت فعلًا، نعرّفه فورًا */
            const myPrev = state.myOrders.find((o) => o.id === updatedOrder.id);
            useBahbah.setState({
              adminOrders: currentAdminOrders.map((o) =>
                o.id === updatedOrder.id ? mergeRemoteOrder(o, updatedOrder) : o
              ),
              myOrders: state.myOrders.map((o) =>
                o.id === updatedOrder.id ? mergeRemoteOrder(o, updatedOrder) : o
              ),
              lastSyncAt: new Date().toISOString(),
              dashSyncStatus: "ok",
              dashSyncError: null,
            });
            if (myPrev && myPrev.status !== updatedOrder.status) {
              notifyMyOrderStatus({ ...myPrev, status: updatedOrder.status });
            }
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id?: string })?.id;
            if (deletedId) {
              courierAlertedOrders.delete(deletedId);
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
              /* تنبيه صوتي + مرئي للطاقم بروزشتة جديدة (اللي بعتها بنفسه موجودة أصلًا في الطابور فمش هتتنبّه) */
              notifyNewRx(newRx);
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
              notifyNewCareSub(newSub);
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
              notifyNewMeasurement(newM);
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

    // 7c. Real-time Subscription: Courier Collections — تنبيه المدير بالتوريد
    //     لحظة تسجيله (صوت + إشعار). القناة بتتحط للطاقم، لكن RLS بيمنع وصول
    //     أي صف لغير الأدمن/الماليات، والتنبيه نفسه ما بيشتغلش غير للأدمن.
    const collectionsChannel = supabase
      .channel("bahbah-realtime-collections")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "courier_collections" },
        (payload) => {
          const row = mapDbCollectionToCollection(payload.new as DbCourierCollection);
          const state = useBahbah.getState();
          if (state.courierCollections.some((c) => c.id === row.id)) return;
          useBahbah.setState({ courierCollections: [row, ...state.courierCollections] });
          if (state.sessionRole === "admin") notifyNewCollection(row);
        }
      )
      .subscribe();

    cleanups.push(() => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(rxChannel);
      supabase.removeChannel(careChannel);
      supabase.removeChannel(measChannel);
      supabase.removeChannel(collectionsChannel);
    });
    privateCleanup = () => {
      cleanups.forEach((fn) => fn());
      privateCleanup = null;
    };
  };
  const stopPrivateSync = () => {
    privateCleanup?.();
  };

  // 4. Initial Data Fetch: Admin Settings (Live CMS & Access Control)
  //    الأولوية لـ RPC get_public_settings (بتعرّفها مسار SQL — بترجع الإعدادات
  //    العامة بس من غير أي أسرار). لو مش متاحة لسه، بنرجع للقراءة الحالية.
  (async () => {
    try {
      let s: DbAdminSettings | null = null;

      const rpcRow = await fetchPublicSettingsFromSupabase();
      if (rpcRow) {
        s = rpcRow as unknown as DbAdminSettings;
      } else {
        const { data, error } = await supabase
          .from("admin_settings")
          .select(PUBLIC_SETTINGS_COLUMNS)
          .eq("id", "global")
          .single();

        if (error) {
          console.warn("[Supabase Sync] Admin settings fetch error:", error.message);
        } else if (data) {
          s = data as DbAdminSettings;
        }

        /* حالة المحل (settings) بتتجاب في محاولة معزولة: لو العمود مش موجود لسه
           على المشروع، المحاولة دي بتفشل لوحدها من غير ما تكسر باقي الإعدادات */
        try {
          const { data: shopRow, error: shopErr } = await supabase
            .from("admin_settings")
            .select("settings")
            .eq("id", "global")
            .single();
          if (!shopErr && shopRow) {
            const shop = (shopRow as { settings?: Partial<AdminSettings> }).settings;
            if (shop && typeof shop === "object") {
              s = { ...(s ?? ({ id: "global" } as DbAdminSettings)), settings: shop };
            }
          }
        } catch {}
      }

      /* مفاتيح «إصلاح التوصيلات» (صور المنتجات/المناديب/المناطق المقفولة) بتتجاب
         في محاولة معزولة زي عمود settings بالظبط: قبل ما ترقية wiring-fixes
         تتطبق على المشروع الأعمدة دي مش موجودة، فالمحاولة بتفشل لوحدها من
         غير ما تكسر تحميل باقي الإعدادات. بعد الترقية الـ RPC نفسه بيرجّعها. */
      try {
        const { data: wireRow, error: wireErr } = await supabase
          .from("admin_settings")
          .select("img_override,custom_drivers,driver_status,zone_disabled,offer_edits")
          .eq("id", "global")
          .single();
        if (!wireErr && wireRow) {
          const w = wireRow as Pick<
            DbAdminSettings,
            "img_override" | "custom_drivers" | "driver_status" | "zone_disabled" | "offer_edits"
          >;
          s = {
            ...(s ?? ({ id: "global" } as DbAdminSettings)),
            ...(w.img_override ? { img_override: w.img_override } : {}),
            ...(w.custom_drivers ? { custom_drivers: w.custom_drivers } : {}),
            ...(w.driver_status ? { driver_status: w.driver_status } : {}),
            ...(w.zone_disabled ? { zone_disabled: w.zone_disabled } : {}),
            ...(w.offer_edits ? { offer_edits: w.offer_edits } : {}),
          };
        }
      } catch {}

      /* رسائل التواصل الجاهزة (courier_msg_templates) بتتجاب في محاولة
         معزولة بنفس أسلوب مفاتيح wiring-fixes: قبل ما ترقية courier-ratings
         تتطبق العمود مش موجود فالمحاولة بتفشل لوحدها بهدوء. */
      try {
        const { data: tplRow, error: tplErr } = await supabase
          .from("admin_settings")
          .select("courier_msg_templates")
          .eq("id", "global")
          .single();
        if (!tplErr && tplRow) {
          const tpl = (tplRow as { courier_msg_templates?: string[] }).courier_msg_templates;
          if (Array.isArray(tpl) && tpl.length > 0) {
            s = { ...(s ?? ({ id: "global" } as DbAdminSettings)), courier_msg_templates: tpl };
          }
        }
      } catch {}

      if (s) {
        const updates = settingsUpdatesFromRow(s);
        if (Object.keys(updates).length > 0) {
          useBahbah.setState(updates);
          console.log("⚡ [Bahbah Supabase Sync] Synced admin settings from Supabase.");
        }
      }
    } catch (err) {
      console.warn("[Supabase Sync] Admin settings fetch failed:", err);
    }
  })();

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
          const updates = settingsUpdatesFromRow(s);
          if (Object.keys(updates).length > 0) {
            useBahbah.setState({ ...updates, lastSyncAt: new Date().toISOString() });
            console.log("⚡ [Bahbah Supabase Sync] Realtime applied admin settings update.");
          }
        }
      }
    )
    .subscribe();

  // 9. Auth State Listener — الدور بييجي من app_metadata (موثّق) فقط
  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session?.user) {
      stopPrivateSync();
      const st = useBahbah.getState();
      const wasStaff = st.sessionRole !== null || (st.user != null && st.user.role !== "patient");
      useBahbah.setState({
        sessionRole: null,
        adminUnlocked: false,
        staffPermissions: null,
        /* مفيش جلسة = مفيش هوية طاقم ولا بيانات عملاء محفوظة محليًا على الجهاز */
        user: wasStaff ? null : st.user,
        ...(wasStaff
          ? { adminOrders: [], rxQueue: [], careSubs: [], measurements: [], courierCollections: [], loyalty: null }
          : {}),
      });
      return;
    }

    const role: Role = roleFromSupabaseUser(session.user);
    const meta = session.user.user_metadata || {};

    if (role === "patient") {
      stopPrivateSync();
      useBahbah.setState({ sessionRole: null, adminUnlocked: false, staffPermissions: null });
      if (event === "SIGNED_IN") {
        const name = meta.name || session.user.email?.split("@")[0] || "User";
        useBahbah.setState({
          user: { name, email: session.user.email || "", phone: meta.phone || undefined, role: "patient" },
        });
      }
      /* نقاط الولاء: عند دخول العميل بنستدعي ensure_loyalty — السيرفر بينشئ
         حساب الولاء وبيمنح نقاط الترحيب (50) مرة واحدة بس لأي حساب جديد،
         وبيرجع الرصيد الحقيقي والكارت المكتسب وعضوية الرعاية الشهرية.
         الترقية مش متاحة = بنسيب الحالة المحلية زي ما هي (العرض بيصفّر). */
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void (async () => {
          try {
            const loyalty = await ensureLoyaltyFromSupabase();
            if (loyalty) useBahbah.setState({ loyalty });
          } catch (err) {
            console.warn("[Supabase Sync] Loyalty sync failed:", err);
          }
        })();
      }
      /* دفتر العناوين: عند دخول العميل (أو استعادة جلسته) بنزامن عناوينه من
         السيرفر — السيرفر مرجع، وأي عنوان محلي لنفس الرقم لسه ما اترفعش
         بيترفع دلوقتي. الجدول مش متاح = بنسيب النسخة المحلية زي ما هي. */
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        const sessionPhone = String(meta.phone || session.user.email?.split("@")[0] || "").trim();
        void (async () => {
          try {
            const serverRows = await fetchCustomerAddressesFromSupabase();
            if (!serverRows) return;
            const st = useBahbah.getState();
            const merged = [...serverRows];
            for (const local of st.savedAddresses) {
              if (merged.some((a) => a.id === local.id)) continue;
              if (local.phone && sessionPhone && local.phone !== sessionPhone) continue;
              const lifted = { ...local, phone: local.phone || sessionPhone };
              merged.unshift(lifted);
              void upsertCustomerAddressToSupabase(lifted);
            }
            if (merged.length > 0 && !merged.some((a) => a.isDefault)) {
              merged[0] = { ...merged[0], isDefault: true };
              void upsertCustomerAddressToSupabase(merged[0]);
            }
            const lastStillThere = merged.some((a) => a.id === st.lastAddressId);
            useBahbah.setState({
              savedAddresses: merged,
              lastAddressId: lastStillThere
                ? st.lastAddressId
                : (merged.find((a) => a.isDefault)?.id ?? merged[0]?.id ?? null),
            });
          } catch (err) {
            console.warn("[Supabase Sync] Customer addresses sync failed:", err);
          }
        })();
      }
      return;
    }

    /* طاقم موثّق */
    const name = meta.name || session.user.email?.split("@")[0] || "User";
    useBahbah.setState({
      sessionRole: role,
      adminUnlocked: role === "admin",
      user: {
        name,
        email: session.user.email || "",
        phone: meta.phone || undefined,
        role,
        driverId: driverIdFromSupabaseUser(session.user),
      },
    });
    startPrivateSync();
  });

  return () => {
    window.removeEventListener("online", onOnline);
    clearInterval(myOrderTimer);
    stopPrivateSync();
    supabase.removeChannel(settingsChannel);
    authListener?.subscription.unsubscribe();
    isInitialized = false;
  };
}
