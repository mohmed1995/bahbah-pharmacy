/* ------------------------------------------------------------------ */
/* منطق نقي (pure) للوحات المتابعة: لوحة المناديب الحية + التقرير      */
/* اليومي + مخطِّط إشعارات حالة طلبات العميل. مفيش هنا أي استيراد      */
/* تنفيذي — أنواع بس — عشان نفس المنطق يشتغل في الواجهة ويتفحص         */
/* تنفيذيًا في بطارية QA (scripts/qa/trio_check.mjs) من غير متصفح.      */
/* كل الأرقام هنا بتتحسب من بيانات جاية من السيرفر فعلًا (orders /     */
/* courier_collections / courier_ratings) — مفيش أي رقم افتراضي.       */
/* ------------------------------------------------------------------ */

import type {
  CourierCollection,
  CourierRating,
  Driver,
  Order,
} from "./data";

/** مفتاح يوم UTC من طابع ISO — نفس اتفاق باقي اللوحات (order.date) */
export const dayKeyOf = (iso: string | undefined | null): string =>
  (iso ?? "").slice(0, 10);

const ACTIVE_STATUSES: ReadonlyArray<Order["status"]> = ["pending", "ready", "shipping"];

/* ------------------------------------------------------------------ */
/* 1) لوحة المناديب الحية — صف لكل مندوب                               */
/* ------------------------------------------------------------------ */

export interface CourierLiveRow {
  driver: Driver;
  /** طلباته النشطة دلوقتي (pending/ready/shipping ومتعينة له) — أي تاريخ */
  activeOrders: Order[];
  /** اتعيّن له النهارده (اتعملت النهارده ومتعينة له — أي حالة) */
  assignedToday: number;
  /** سلّم النهارده فعليًا (بقت delivered وآخر تحديث لها النهارده) */
  deliveredToday: number;
  /** إجمالي تحصيلاته النهارده من سجلات التوريد */
  collectionsToday: number;
  /** عدد سجلات تحصيل النهارده */
  collectionsCountToday: number;
  /** متوسط تقييم العملاء (كل الوقت) — null لو مفيش تقييمات لسه */
  ratingAvg: number | null;
  ratingCount: number;
}

export function courierLiveBoard(
  drivers: Driver[],
  orders: Order[],
  collections: CourierCollection[],
  ratings: CourierRating[],
  today: string
): CourierLiveRow[] {
  const rows: CourierLiveRow[] = drivers.map((driver) => {
    const mine = orders.filter((o) => o.delivery?.driverId === driver.id);
    const activeOrders = mine
      .filter((o) => ACTIVE_STATUSES.includes(o.status))
      .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
    const assignedToday = mine.filter((o) => dayKeyOf(o.createdAt) === today).length;
    const deliveredToday = mine.filter(
      (o) => o.status === "delivered" && dayKeyOf(o.updatedAt ?? o.createdAt) === today
    ).length;
    const myCollections = collections.filter(
      (c) => c.courierId === driver.id && dayKeyOf(c.createdAt) === today
    );
    const myRatings = ratings.filter((r) => r.courierId === driver.id);
    return {
      driver,
      activeOrders,
      assignedToday,
      deliveredToday,
      collectionsToday: myCollections.reduce((s, c) => s + (c.amount || 0), 0),
      collectionsCountToday: myCollections.length,
      ratingAvg:
        myRatings.length > 0
          ? myRatings.reduce((s, r) => s + r.stars, 0) / myRatings.length
          : null,
      ratingCount: myRatings.length,
    };
  });
  /* اللي شغال أكتر يطلع الأول: نشط دلوقتي، بعدين تسليمات النهارده */
  return rows.sort(
    (a, b) =>
      b.activeOrders.length - a.activeOrders.length || b.deliveredToday - a.deliveredToday
  );
}

/* ------------------------------------------------------------------ */
/* 1.ب) تبويب «اللوحة» في قسم التوصيل — مؤشرات حقيقية من نفس طلبات     */
/* السيرفر اللي اللوحة بتعرضها (adminOrders)، بنفس اتفاق اليوم في      */
/* لوحة المناديب الحية (dayKeyOf على updated_at ثم created_at):        */
/* - توصيلات اليوم: طلبات delivered وآخر تحديث لها النهارده.           */
/* - متوسط زمن التوصيل: متوسط (updated_at − created_at) بالدقائق       */
/*   لطلبات اتسلّمت النهارده وعندها الطابعين ومدة غير سالبة —           */
/*   updated_at للطلب المسلّم هو لحظة التسليم (حالة نهائية ما بتتغيّرش  */
/*   بعدها)، فالمدة دي هي زمن الطلب من إنشائه لحد باب العميل فعلًا.    */
/* - نسبة الاكتمال: المسلّم ÷ (المسلّم + الملغي) من طلبات اتحسمت       */
/*   النهارده. «الالتزام بالمواعيد» القديمة مكانتش بتتحسب بأمانة —      */
/*   مفيش «ميعاد وعد» مخزّن لكل طلب نقارن بيه — فاتبدّلت بنسبة          */
/*   الاكتمال بدل رقم مخترع.                                           */
/* null = مفيش بيانات كفاية النهارده، والواجهة بتعرض «—» مش صفر كداب.  */
/* ------------------------------------------------------------------ */

export interface DeliveryBoardKpis {
  deliveredToday: number;
  avgDeliveryMinutes: number | null;
  completionRatePct: number | null;
}

export function deliveryBoardKpis(orders: Order[], today: string): DeliveryBoardKpis {
  const closedToday = (status: Order["status"]) =>
    orders.filter(
      (o) => o.status === status && dayKeyOf(o.updatedAt ?? o.createdAt) === today
    );
  const delivered = closedToday("delivered");
  const cancelled = closedToday("cancelled");

  const durations: number[] = [];
  for (const o of delivered) {
    const start = Date.parse(o.createdAt ?? "");
    const end = Date.parse(o.updatedAt ?? "");
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const minutes = (end - start) / 60000;
    if (minutes >= 0) durations.push(minutes);
  }

  const closed = delivered.length + cancelled.length;
  return {
    deliveredToday: delivered.length,
    avgDeliveryMinutes:
      durations.length > 0
        ? Math.round(durations.reduce((s, m) => s + m, 0) / durations.length)
        : null,
    completionRatePct: closed > 0 ? Math.round((delivered.length / closed) * 100) : null,
  };
}

/* ------------------------------------------------------------------ */
/* 2) التقرير اليومي                                                   */
/* ------------------------------------------------------------------ */

export interface DailyReportTotals {
  /** كل الطلبات اللي اتعملت في اليوم */
  ordersCount: number;
  /** الإيراد = مجموع إجمالي الطلبات غير الملغية في اليوم */
  revenue: number;
  deliveredCount: number;
  cancelledCount: number;
  /** لسه شغالة (pending/ready/shipping) من طلبات اليوم */
  activeCount: number;
  collectionsTotal: number;
  collectionsByMethod: Record<
    CourierCollection["method"],
    { count: number; sum: number }
  >;
}

export function buildDailyReport(
  orders: Order[],
  collections: CourierCollection[]
): DailyReportTotals {
  const byMethod: DailyReportTotals["collectionsByMethod"] = {
    cash: { count: 0, sum: 0 },
    wallet: { count: 0, sum: 0 },
    bank: { count: 0, sum: 0 },
  };
  let collectionsTotal = 0;
  for (const c of collections) {
    const m = byMethod[c.method] ?? byMethod.cash;
    m.count += 1;
    m.sum += c.amount || 0;
    collectionsTotal += c.amount || 0;
  }
  return {
    ordersCount: orders.length,
    revenue: orders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + (o.total || 0), 0),
    deliveredCount: orders.filter((o) => o.status === "delivered").length,
    cancelledCount: orders.filter((o) => o.status === "cancelled").length,
    activeCount: orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
    collectionsTotal,
    collectionsByMethod: byMethod,
  };
}

export interface TopCourierRow {
  courierId: string;
  /** تسليمات اليوم (من طلبات اليوم اللي بقت delivered ومتعينة له) */
  delivered: number;
  ratingAvg: number | null;
  ratingCount: number;
}

export function topCouriersForDay(
  orders: Order[],
  ratings: CourierRating[]
): TopCourierRow[] {
  const map = new Map<string, TopCourierRow>();
  for (const o of orders) {
    const cid = o.delivery?.driverId;
    if (!cid || o.status !== "delivered") continue;
    const cur = map.get(cid) ?? { courierId: cid, delivered: 0, ratingAvg: null, ratingCount: 0 };
    cur.delivered += 1;
    map.set(cid, cur);
  }
  for (const row of map.values()) {
    const mine = ratings.filter((r) => r.courierId === row.courierId);
    row.ratingCount = mine.length;
    row.ratingAvg =
      mine.length > 0 ? mine.reduce((s, r) => s + r.stars, 0) / mine.length : null;
  }
  return [...map.values()].sort((a, b) => b.delivered - a.delivered);
}

/* ------------------------------------------------------------------ */
/* 3) الأعطال: طلبات عالقة في حالة أطول من حد معقول                    */
/*                                                                     */
/* التعريف (موثّق هنا وفي واجهة التقرير): الطلب «عالق» لو فضل في      */
/* حالته الحالية من غير أي تحديث أطول من الحد بتاعها:                  */
/*   pending  (قيد المراجعة)  > 60 دقيقة — محدش بص عليه               */
/*   ready    (تم التجهيز)    > 45 دقيقة — جاهز ومحدش خرج بيه          */
/*   shipping (في الطريق)     > 90 دقيقة — التوصيلة اتأخرت بزيادة      */
/* «من غير تحديث» = الفرق بين دلوقتي و updated_at على السيرفر          */
/* (أو created_at لو مفيش updated_at). الحالات النهائية                */
/* (delivered/cancelled) مش أعطال أبدًا.                              */
/* ------------------------------------------------------------------ */

export const STUCK_THRESHOLDS_MIN: Record<string, number> = {
  pending: 60,
  ready: 45,
  shipping: 90,
};

export interface StuckOrder {
  order: Order;
  minutesStuck: number;
  thresholdMin: number;
}

export function findStuckOrders(orders: Order[], nowMs: number): StuckOrder[] {
  const out: StuckOrder[] = [];
  for (const o of orders) {
    const threshold = STUCK_THRESHOLDS_MIN[o.status];
    if (threshold === undefined) continue;
    const since = Date.parse(o.updatedAt ?? o.createdAt ?? "");
    if (!Number.isFinite(since)) continue;
    const minutes = Math.floor((nowMs - since) / 60000);
    if (minutes > threshold) out.push({ order: o, minutesStuck: minutes, thresholdMin: threshold });
  }
  return out.sort((a, b) => b.minutesStuck - a.minutesStuck);
}

/* ------------------------------------------------------------------ */
/* 4) مخطِّط إشعارات حالة طلبات العميل (مراقب myOrders)                */
/*                                                                     */
/* القاعدة: الإشعار ما يطلعش غير على حالة جت من السيرفر فعلًا          */
/* (RPC track_order) واتغيّرت عن آخر حالة معروفة. الخطة نقية:          */
/* - أول مرة نشوف طلب: الأساس = حالته المحلية، وبنقارن السيرفر بيها    */
/*   في نفس اللفة (طلب اتحرك والعميل قافل التطبيق → يتنبّه مرة).       */
/* - أي تغيّر فعلي: patch للحالة المحلية + إشعار (مرة واحدة لكل         */
/*   (طلب، حالة) في الجلسة — notified هو السجل اللي بيمنع التكرار      */
/*   حتى لو شاشة التتبع ومراقب الخلفية شافوا التغيّر في نفس الوقت).    */
/* - الحالات النهائية (delivered/cancelled) بتخرج من المتابعة.         */
/* ------------------------------------------------------------------ */

export interface ServerOrderStatus {
  status: Order["status"];
  courierId?: string;
}

export interface MyOrderSyncPlan {
  patches: { id: string; status: Order["status"]; courierId?: string }[];
  toNotify: Order[];
}

export function planMyOrderSync(
  myOrders: Order[],
  server: Map<string, ServerOrderStatus>,
  lastKnown: Map<string, string>,
  notified: Set<string>
): MyOrderSyncPlan {
  const patches: MyOrderSyncPlan["patches"] = [];
  const toNotify: Order[] = [];
  for (const o of myOrders) {
    const srv = server.get(o.id);
    if (!srv) continue; // السيرفر ما ردش على الطلب ده اللفة دي — ما نخمّنش
    const known = lastKnown.get(o.id) ?? o.status;
    if (srv.status === known) {
      lastKnown.set(o.id, srv.status);
      continue;
    }
    lastKnown.set(o.id, srv.status);
    patches.push({ id: o.id, status: srv.status, courierId: srv.courierId });
    const key = `${o.id}:${srv.status}`;
    if (!notified.has(key)) {
      notified.add(key);
      toNotify.push({ ...o, status: srv.status });
    }
  }
  return { patches, toNotify };
}
