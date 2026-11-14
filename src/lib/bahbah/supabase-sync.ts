import {
  supabase,
  mapDbOrderToOrder,
  mapDbRxToRx,
  mapDbCareToSubscriber,
  type DbOrder,
  type DbRxRequest,
  type DbCareSubscription,
} from "../supabase";
import { useBahbah } from "./store";
import type { Order, RxRequest, CareSubscriber } from "./data";

let isInitialized = false;

export function initSupabaseSync() {
  if (typeof window === "undefined") return () => {};
  if (isInitialized) return () => {};
  isInitialized = true;

  console.log("⚡ [Bahbah Supabase Sync] Initializing live database synchronization...");

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
        // Direct sync with Supabase as single source of truth
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

  // 4. Real-time Subscription: Orders
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
          }
        } else if (payload.eventType === "UPDATE") {
          const updatedOrder = mapDbOrderToOrder(payload.new as DbOrder);
          useBahbah.setState({
            adminOrders: currentAdminOrders.map((o) =>
              o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o
            ),
            myOrders: state.myOrders.map((o) =>
              o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o
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

  // 5. Real-time Subscription: Prescriptions (rx_requests)
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

  // 6. Real-time Subscription: Care Subscriptions
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

  return () => {
    supabase.removeChannel(ordersChannel);
    supabase.removeChannel(rxChannel);
    supabase.removeChannel(careChannel);
  };
}
