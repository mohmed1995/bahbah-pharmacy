"use client";

import { useEffect } from "react";
import { useBahbah, type View, type AdminSection } from "./store";

/**
 * Browser-history integration for the in-app `view` router.
 *
 * Before this, changing views never touched the History API, so the browser /
 * Android back button left the app entirely and the only way back was a full
 * reload. Now every view change pushes a history entry, and popstate restores
 * the previous view (and product / admin section) instead of exiting.
 *
 * The persisted store is untouched: on reload the persisted view is simply
 * seeded as the current history entry.
 */
interface ViewHistoryState {
  bahbah: true;
  view: View;
  productId: string | null;
  adminSection: AdminSection;
}

const VIEWS: View[] = [
  "home",
  "catalog",
  "product",
  "offers",
  "care",
  "vitals",
  "track",
  "cart",
  "checkout",
  "success",
  "login",
  "account",
  "admin",
  "courier",
  "pharmacist",
];

function snapshot(): ViewHistoryState {
  const s = useBahbah.getState();
  return {
    bahbah: true,
    view: s.view,
    productId: s.productId,
    adminSection: s.adminSection,
  };
}

export function useViewHistory() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let restoring = false;

    /* seed the current (possibly persisted) view as this entry's state */
    window.history.replaceState(snapshot(), "");
    let last = snapshot();

    const unsub = useBahbah.subscribe((s) => {
      const cur: ViewHistoryState = {
        bahbah: true,
        view: s.view,
        productId: s.productId,
        adminSection: s.adminSection,
      };
      if (restoring) {
        last = cur;
        return;
      }
      const viewChanged = cur.view !== last.view;
      const productChanged = cur.view === "product" && cur.productId !== last.productId;
      const sectionChanged = cur.view === "admin" && cur.adminSection !== last.adminSection;
      if (viewChanged || productChanged || sectionChanged) {
        window.history.pushState(cur, "");
      }
      last = cur;
    });

    const onPopState = (e: PopStateEvent) => {
      const st = e.state as ViewHistoryState | null;
      /* foreign entries (or backing out past our first entry) keep the
         browser's default behaviour — we only restore states we created */
      if (!st || st.bahbah !== true || !VIEWS.includes(st.view)) return;
      restoring = true;
      try {
        const store = useBahbah.getState();
        if (st.view === "product" && st.productId) {
          useBahbah.setState({
            view: "product",
            productId: st.productId,
            previousView: store.view,
            cartOpen: false,
            searchOpen: false,
          });
        } else {
          store.go(st.view);
          if (st.view === "admin") store.setAdminSection(st.adminSection);
        }
      } finally {
        restoring = false;
        last = snapshot();
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      unsub();
      window.removeEventListener("popstate", onPopState);
    };
  }, []);
}
