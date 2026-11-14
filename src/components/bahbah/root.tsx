"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useBahbah, useT, cartCount } from "@/lib/bahbah/store";
import { getProduct } from "@/lib/bahbah/data";
import {
  LangSync,
  Header,
  BottomNav,
  Footer,
  CartDrawer,
  SearchDialog,
  RxDialog,
  ConsultDialog,
  ICDialog,
} from "./shell";
import HomeView from "./home";
import CatalogView from "./catalog";
import ProductView from "./product";
import OffersView from "./offers";
import CareView from "./care";
import TrackView from "./track";
import { CartView, CheckoutView, SuccessView } from "./cart";
import { LoginView, AccountView } from "./auth";
import AdminView, { AdminGate } from "./admin";
import CourierPortal, { StaffGate } from "./courier";
import PharmacistPortal from "./pharmacist";
import { fmtPrice } from "./product-card";
import { Button } from "@/components/ui/button";
import { IconCartBagDuo, IconPhone } from "./icons";

/* hydration gate without setState-in-effect */
const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/* ------------------------------------------------------------------ */
/* Floating cart bar — appears as soon as anything is in the cart      */
/* ------------------------------------------------------------------ */
function FloatingCartBar() {
  const t = useT();
  const cart = useBahbah((s) => s.cart);
  const view = useBahbah((s) => s.view);
  const go = useBahbah((s) => s.go);
  const count = cartCount(cart);

  if (count === 0) return null;
  if (["cart", "checkout", "success", "admin", "courier", "pharmacist"].includes(view)) return null;

  const subtotal = cart.reduce((s, c) => {
    const p = getProduct(c.productId);
    return s + (p ? p.price * c.qty : 0);
  }, 0);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 z-40 px-3 md:bottom-5 md:px-6">
      <div className="pointer-events-auto mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-[#112D51] px-4 py-3 text-white shadow-2xl ring-1 ring-white/10">
        <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white/10">
          <IconCartBagDuo className="size-5" />
          <span className="absolute -top-1 -end-1 grid size-5 place-items-center rounded-full bg-[#F09428] text-[10px] font-black">
            {count}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold text-white/70">
            {count} {t("fbar.items")}
          </p>
          <p className="font-heading text-sm font-black">{fmtPrice(subtotal, t)}</p>
        </div>
        <Button
          size="sm"
          className="h-10 shrink-0 rounded-full bg-[#F09428] px-5 text-sm font-black text-white hover:bg-[#e08317]"
          onClick={() => go("cart")}
        >
          {t("fbar.cta")}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Floating pharmacist button — one-tap consult, always reachable      */
/* ------------------------------------------------------------------ */
function PharmacistFab() {
  const t = useT();
  const view = useBahbah((s) => s.view);
  const cart = useBahbah((s) => s.cart);
  const setConsultOpen = useBahbah((s) => s.setConsultOpen);

  if (["admin", "courier", "pharmacist"].includes(view)) return null;
  const showBar = cart.length > 0 && !["cart", "checkout", "success"].includes(view);

  return (
    <button
      onClick={() => setConsultOpen(true)}
      aria-label={t("fab.consult")}
      className={`fixed z-40 flex items-center gap-2 rounded-full bg-[#2E9E6B] py-3 text-white shadow-xl transition hover:brightness-105 ${
        showBar ? "bottom-32 md:bottom-20" : "bottom-20 md:bottom-6"
      } end-4 px-4 md:px-5`}
    >
      <span className="relative">
        <IconPhone className="size-5" />
        <span className="absolute -top-1 -end-1 size-2.5 animate-pulse rounded-full bg-[#F09428]" />
      </span>
      <span className="text-xs font-black md:text-sm">{t("fab.consult")}</span>
    </button>
  );
}

export default function BahbahApp() {
  const view = useBahbah((s) => s.view);
  const user = useBahbah((s) => s.user);
  const adminUnlocked = useBahbah((s) => s.adminUnlocked);
  const mounted = useMounted();

  /* scroll to top whenever the view changes */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [view]);

  /* direct #admin or ?admin deep-link */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.has("admin") || window.location.hash === "#admin") {
        useBahbah.getState().go("admin");
      }
    }
  }, []);

  /* re-apply persisted accessibility flags after rehydration */
  const bigText = useBahbah((s) => s.bigText);
  useEffect(() => {
    document.documentElement.classList.toggle("bahbah-big-text", bigText);
  }, [bigText]);

  const elderMode = useBahbah((s) => s.elderMode);
  useEffect(() => {
    document.documentElement.classList.toggle("bahbah-elder", elderMode);
    if (elderMode) document.documentElement.classList.add("bahbah-big-text");
  }, [elderMode]);

  /* hydration-safe skeleton while persisted store rehydrates */
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/images/bahbah-badge.png"
            alt="Bahbah Pharmacy"
            width={72}
            height={72}
            className="animate-pulse rounded-full"
          />
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#F09428]" />
          </div>
        </div>
      </div>
    );
  }

  /* ---- role guards: staff portals only open for the matching role ----
     admin = dedicated password gate (2026 by default) OR an admin account */
  const adminLocked = !adminUnlocked && (!user || user.role !== "admin");
  const staffView = view === "admin" || view === "courier" || view === "pharmacist";
  const requiredRole = view === "courier" ? "courier" : "pharmacist";
  const gate = (view === "courier" || view === "pharmacist") && (!user || user.role !== requiredRole);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LangSync />
      {!staffView && <Header />}

      <div className="flex-1">
        {view === "home" && <HomeView />}
        {view === "catalog" && <CatalogView />}
        {view === "product" && <ProductView />}
        {view === "offers" && <OffersView />}
        {view === "care" && <CareView />}
        {view === "track" && <TrackView />}
        {view === "cart" && <CartView />}
        {view === "checkout" && <CheckoutView />}
        {view === "success" && <SuccessView />}
        {view === "login" && <LoginView />}
        {view === "account" && <AccountView />}
        {view === "admin" && (adminLocked ? <AdminGate /> : <AdminView />)}
        {view === "courier" && (gate ? <StaffGate role="courier" /> : <CourierPortal />)}
        {view === "pharmacist" && (gate ? <StaffGate role="pharmacist" /> : <PharmacistPortal />)}
      </div>

      {!staffView && <Footer />}
      {!staffView && <BottomNav />}

      <CartDrawer />
      <SearchDialog />
      <RxDialog />
      <ConsultDialog />
      <ICDialog />

      {!staffView && <FloatingCartBar />}

      {/* bottom padding so fixed bottom nav never covers content on mobile */}
      {!staffView && <div className="h-16 md:hidden" aria-hidden />}
    </div>
  );
}
