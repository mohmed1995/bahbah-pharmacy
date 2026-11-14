import type { ComponentType } from "react";

/* ------------------------------------------------------------------ */
/* Bahbah bespoke icon family                                          */
/* 24x24 grid · stroke 1.8 · round caps · drawn for the brand          */
/* ------------------------------------------------------------------ */

export type IconProps = {
  className?: string;
  strokeWidth?: number | string;
};

export type IconType = ComponentType<IconProps>;

function Base({
  className,
  strokeWidth,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* --- Medicines ---------------------------------------------------- */

/** Capsule pill — diagonal with divider + shine */
export function IconCapsule(p: IconProps) {
  return (
    <Base {...p}>
      <g transform="rotate(-45 12 12)">
        <rect x="3.6" y="8.6" width="16.8" height="6.8" rx="3.4" />
        <path d="M12 8.6v6.8" />
        <path d="M6.4 10.6h2.4" />
      </g>
    </Base>
  );
}

/** Effervescent / vitamin tube */
export function IconVitaminTube(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="8.2" y="2.8" width="7.6" height="3.1" rx="1.1" />
      <rect x="9" y="5.9" width="6" height="15.3" rx="2.2" />
      <path d="M10.4 9.6h3.2M10.4 12.6h3.2M10.4 15.6h3.2" />
    </Base>
  );
}

/** Medicine droplet with a plus */
export function IconDropletPlus(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 3.2C9.6 6.5 6.8 10.4 6.8 14a5.2 5.2 0 0 0 10.4 0c0-3.6-2.8-7.5-5.2-10.8Z" />
      <path d="M12 12.4v4M10.2 14.4h3.6" />
    </Base>
  );
}

/** Syringe */
export function IconSyringe(p: IconProps) {
  return (
    <Base {...p}>
      <path d="m17.2 2.8 4 4" />
      <path d="m19.2 4.8-2.4 2.4" />
      <path d="M14.4 6.4l3.2 3.2" />
      <path d="M15.9 7.9 7.6 16.2l-3 .9-1.5-1.5.9-3 8.3-8.3" />
      <path d="m9.4 10.6 4 4M6.9 13.1l2 2" />
    </Base>
  );
}

/** Inhaler */
export function IconInhaler(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="9.6" y="7.2" width="7.6" height="13.6" rx="2.2" />
      <rect x="11.4" y="3.4" width="4" height="3.8" rx="1" />
      <rect
        x="1.8"
        y="9.4"
        width="8.4"
        height="3.6"
        rx="1.4"
        transform="rotate(-18 6 11.2)"
      />
      <path d="m5.2 5.9-.9-.9M6.6 4.8l-.4-1.2M3.8 7.6l-1.2-.4" />
    </Base>
  );
}

/** Pollen / allergen */
export function IconAllergy(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 6.8V4.2M12 17.2v2.6M6.8 12H4.2M17.2 12h2.6M8.3 8.3 6.5 6.5M15.7 8.3l1.8-1.8M8.3 15.7l-1.8 1.8M15.7 15.7l1.8 1.8" />
      <circle cx="12" cy="3.4" r=".9" />
      <circle cx="12" cy="20.6" r=".9" />
      <circle cx="3.4" cy="12" r=".9" />
      <circle cx="20.6" cy="12" r=".9" />
    </Base>
  );
}

/** Rx prescription sheet */
export function IconRxSheet(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="4.8" y="2.8" width="14.4" height="18.4" rx="2.4" />
      <path d="M8.8 8.2h3.8M8.8 12.2h6.4M8.8 16.2h4.6" />
      <path d="M16.6 6v3M15.1 7.5h3" />
    </Base>
  );
}

/** Shield with medical cross */
export function IconShieldCross(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 2.8l7.2 2.7v5.7c0 4.7-3 7.9-7.2 9.9-4.2-2-7.2-5.2-7.2-9.9V5.5L12 2.8Z" />
      <path d="M12 8v6.4M8.8 11.2h6.4" />
    </Base>
  );
}

/* --- Care & devices ------------------------------------------------ */

/** Cream jar */
export function IconCreamJar(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="5.4" y="4.6" width="13.2" height="4" rx="1.6" />
      <rect x="6.4" y="8.6" width="11.2" height="12" rx="3.2" />
      <path d="M9.6 12.8h4.8M9.6 15.8h3" />
    </Base>
  );
}

/** Baby bottle */
export function IconBabyBottle(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M10.4 5.4c-.9-1.7-.2-3.2 1.6-3.2s2.5 1.5 1.6 3.2" />
      <rect x="8.6" y="5.4" width="6.8" height="2.9" rx="1.1" />
      <rect x="7.6" y="8.3" width="8.8" height="13" rx="2.6" />
      <path d="M10.1 12.4h3.8M10.1 15.6h3.8M10.1 18.8h2.4" />
    </Base>
  );
}

/** Soap / wash pump */
export function IconSoap(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M9.9 4.6V3.4c0-.5.4-.9.9-.9h2.4c.5 0 .9.4.9.9v1.2" />
      <path d="M9.9 3.7H8.2c-.4 0-.7.3-.7.7v.9" />
      <path d="M12 4.6v2.3" />
      <rect x="7.4" y="6.9" width="9.2" height="14" rx="2.6" />
      <path d="M10.2 11h3.6M10.2 14.2h3.6" />
    </Base>
  );
}

/** Tooth */
export function IconTooth(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 4.2c-1.7-1.1-3.5-1.2-4.9-.1-2.3 1.8-2.8 4.5-1.8 7.3.8 2.3 1.1 3.4 1.5 5.7.3 1.7 1 3 2.1 3 1.3 0 1.5-1.5 1.7-3.1.2-1.5.5-2.6 1.4-2.6s1.2 1.1 1.4 2.6c.2 1.6.4 3.1 1.7 3.1 1.1 0 1.8-1.3 2.1-3 .4-2.3.7-3.4 1.5-5.7 1-2.8.5-5.5-1.8-7.3-1.4-1.1-3.2-1-4.9.1Z" />
      <path d="M8.7 7.2c.5-.6 1.2-1 2-1.1" />
    </Base>
  );
}

/** Sun protection */
export function IconSunScreen(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 3.2v2M12 18.8v2M3.2 12h2M18.8 12h2M5.8 5.8l1.4 1.4M16.8 16.8l1.4 1.4M18.2 5.8l-1.4 1.4M7.2 16.8l-1.4 1.4" />
    </Base>
  );
}

/** Face mask */
export function IconMask(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M5.2 9.8C5.2 7 8.3 5 12 5s6.8 2 6.8 4.8v3.4c0 2.9-3.1 4.9-6.8 4.9s-6.8-2-6.8-4.9V9.8Z" />
      <path d="M12 5v13.1" />
      <path d="M5.2 11.2H2.8M18.8 11.2h2.4" />
      <path d="M8.3 6.4c-.4 2.2-.4 9 0 11.2M15.7 6.4c.4 2.2.4 9 0 11.2" />
    </Base>
  );
}

/** Digital thermometer */
export function IconThermo(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M10.4 4.6a1.6 1.6 0 0 1 3.2 0v8.9a3.9 3.9 0 1 1-3.2 0V4.6Z" />
      <path d="M12 11.4v5" />
      <circle cx="12" cy="17.4" r="1.3" fill="currentColor" stroke="none" />
      <path d="M16.4 7.4h2.4M16.4 10.2h1.6" />
    </Base>
  );
}

/** Blood-pressure monitor */
export function IconBPDevice(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="3" y="4.6" width="12.6" height="9" rx="2" />
      <path d="M5.7 7.5h4.6M5.7 10.2h3" />
      <path d="M15.6 8.4c3 .4 4.6 2.3 4.6 5.2v1.2" />
      <circle cx="20.2" cy="17.2" r="2.4" />
    </Base>
  );
}

/** Stethoscope */
export function IconStethoscope(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M5.6 3.2v5.2a6.4 6.4 0 0 0 12.8 0V3.2" />
      <path d="M12 14.8v1.4c0 1.9 1.5 3.4 3.4 3.4h.1" />
      <circle cx="17.8" cy="19.6" r="2.3" />
      <path d="M4.2 3.2h1.4M18.4 3.2h1.4" />
    </Base>
  );
}

/** Heart with pulse */
export function IconHeartPulse(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 20.3C8.4 17.6 4 13.9 4 9.8 4 7 6.2 4.9 8.9 4.9c1.3 0 2.4.6 3.1 1.5.7-.9 1.8-1.5 3.1-1.5 2.7 0 4.9 2.1 4.9 4.9 0 4.1-4.4 7.8-8 10.5Z" />
      <path d="M7.4 11.4h2.4l1.3-2.2 2 4 1.3-1.8h2.2" />
    </Base>
  );
}

/* --- Delivery & logistics ------------------------------------------ */

/** Delivery scooter with cargo box */
export function IconScooter(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="5.4" cy="17.2" r="2.3" />
      <circle cx="18.6" cy="17.2" r="2.3" />
      <path d="M5.4 17.2h6.9" />
      <path d="M12.3 17.2l2.5-7.6h2.4" />
      <path d="M17.2 9.6l1.4 7.6" />
      <path d="M15.2 7h3.6" />
      <path d="M16.4 7l.8 2.6" />
      <rect x="2.2" y="7.8" width="4.6" height="4.2" rx="1.1" />
      <path d="M4.5 12v2.9" />
    </Base>
  );
}

/** Fast delivery van */
export function IconVan(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="2.9" y="6.8" width="9.8" height="9" rx="1.2" />
      <path d="M12.7 9.4h3.8l3 3.4v3h-6.8Z" />
      <circle cx="7.1" cy="17.6" r="1.9" />
      <circle cx="17.3" cy="17.6" r="1.9" />
      <path d="M1.4 4.8h3M.9 7.6h2.2" />
    </Base>
  );
}

/** Map pin */
export function IconPin(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 21.2S5.4 15.8 5.4 10.8a6.6 6.6 0 0 1 13.2 0c0 5-6.6 10.4-6.6 10.4Z" />
      <circle cx="12" cy="10.6" r="2.4" />
    </Base>
  );
}

/** Route between two points */
export function IconRoute(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="5.4" cy="18.6" r="2" />
      <circle cx="18.6" cy="5.4" r="2" />
      <path d="M7.4 18.6h4.2c3.4 0 3.4-6.4 0-6.4H9.2c-3.4 0-3.4-6.8 0-6.8h7.4" />
    </Base>
  );
}

/** Fast clock */
export function IconClockFast(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="13.2" cy="13.2" r="7.6" />
      <path d="M13.2 9.4v3.8l2.6 1.6" />
      <path d="M2.8 6.6h4.2M1.8 10.2h3.2M2.8 13.8h2.8" />
    </Base>
  );
}

/** Wallet */
export function IconWallet(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M5.6 6V5.2c0-.7.6-1.3 1.3-1.3h10.2c.7 0 1.3.6 1.3 1.3V6" />
      <rect x="2.8" y="6" width="18.4" height="13.4" rx="2.4" />
      <path d="M21.2 12.4h-4.2a1.9 1.9 0 0 0 0 3.8h4.2" />
    </Base>
  );
}

/** Gift / rewards */
export function IconGift(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="4.2" y="11" width="15.6" height="9.4" rx="1.8" />
      <rect x="3" y="7.6" width="18" height="3.4" rx="1" />
      <path d="M12 7.6v12.8" />
      <path d="M12 7.6c-2.2 0-3.9-1-3.9-2.5 0-1.1.9-1.9 1.9-1.6 1.2.3 2 2.2 2 4.1ZM12 7.6c2.2 0 3.9-1 3.9-2.5 0-1.1-.9-1.9-1.9-1.6-1.2.3-2 2.2-2 4.1Z" />
    </Base>
  );
}

/* --- Store & dashboard ---------------------------------------------- */

/** Pharmacy storefront */
export function IconStorefront(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4.6 4.2h14.8l1.1 5.2H3.5l1.1-5.2Z" />
      <path d="M4.4 9.4v9a1.6 1.6 0 0 0 1.6 1.6h12a1.6 1.6 0 0 0 1.6-1.6v-9" />
      <path d="M12 12.6v4.2M9.9 14.7h4.2" />
    </Base>
  );
}

/** Pharmacist headset (support) */
export function IconPharmacist(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4.6 13.4a7.4 7.4 0 0 1 14.8 0" />
      <rect x="2.8" y="12.6" width="3.8" height="6" rx="1.7" />
      <rect x="17.4" y="12.6" width="3.8" height="6" rx="1.7" />
      <path d="M19.3 18.6v.4c0 1.3-1 2.3-2.3 2.3h-3.4" />
    </Base>
  );
}

/** Chart bars up */
export function IconChartUp(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4.4 20v-6.4M9.7 20V9.6M15 20v-4M20.3 20V5" />
      <path d="M3.2 20.4h18.2" />
      <path d="m4.6 6.4 4-2.6 3.2 2 4.6-3.4" />
      <path d="M13.6 2.2h2.8V5" />
    </Base>
  );
}

/** Boxes / inventory */
export function IconBoxes(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="3.4" y="12.4" width="7.6" height="7.6" rx="1.2" />
      <rect x="13" y="12.4" width="7.6" height="7.6" rx="1.2" />
      <rect x="8.2" y="4" width="7.6" height="6.4" rx="1.2" />
      <path d="M10.4 16.2h3.6" />
    </Base>
  );
}

/* --- Navigation family (bespoke replacements for generic icons) ----- */

/** Rounded home with door */
export function IconHomeSoft(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4.2 10.4 12 4l7.8 6.4" />
      <path d="M6 9.2v9.2c0 .9.7 1.6 1.6 1.6h8.8c.9 0 1.6-.7 1.6-1.6V9.2" />
      <path d="M10 20v-5.4c0-.6.4-1 1-1h2c.6 0 1 .4 1 1V20" />
    </Base>
  );
}

/** Category grid — one tile carries a plus-like accent mark */
export function IconGridCats(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="3.6" y="3.6" width="7" height="7" rx="2" />
      <rect x="13.4" y="3.6" width="7" height="7" rx="2" />
      <rect x="3.6" y="13.4" width="7" height="7" rx="2" />
      <rect x="13.4" y="13.4" width="7" height="7" rx="3.5" />
      <path d="M16.9 15.9v3M15.7 17.4h2.4" />
    </Base>
  );
}

/** Shopping bag with handle */
export function IconCartBag(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M5.2 8h13.6l-.9 11.1a1.8 1.8 0 0 1-1.8 1.7H7.9a1.8 1.8 0 0 1-1.8-1.7L5.2 8Z" />
      <path d="M8.8 10.6V6.4a3.2 3.2 0 0 1 6.4 0v4.2" />
      <path d="M12 12.4v4M10 14.4h4" />
    </Base>
  );
}

/** Heart */
export function IconHeartLine(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 20.1C8.6 17.5 4.2 14 4.2 9.9c0-2.7 2-4.8 4.6-4.8 1.3 0 2.5.6 3.2 1.5.7-.9 1.9-1.5 3.2-1.5 2.6 0 4.6 2.1 4.6 4.8 0 4.1-4.4 7.6-7.8 10.2Z" />
    </Base>
  );
}

/** User in soft circle */
export function IconUserRound(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="9.6" r="3" />
      <path d="M5.8 18.4c1-2.7 3.3-4.2 6.2-4.2s5.2 1.5 6.2 4.2" />
    </Base>
  );
}

/** Magnifier */
export function IconSearchGlass(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="11" cy="11" r="6.4" />
      <path d="m15.8 15.8 4.4 4.4" />
      <path d="M8.2 11c0-1.5 1.3-2.8 2.8-2.8" />
    </Base>
  );
}

/** Prescription clipboard with Rx mark */
export function IconRxClipboard(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="5" y="4.4" width="14" height="17" rx="2.4" />
      <path d="M9.2 4.4V3.2c0-.5.4-.9.9-.9h3.8c.5 0 .9.4.9.9v1.2" />
      <path d="M8.8 12.6h1.9c.9 0 1.6-.7 1.6-1.6s-.7-1.6-1.6-1.6H8.8v5.6" />
      <path d="m10.4 11 3 3.6M13.4 11l-3 3.6" />
      <path d="M14.4 18h1.8M9 18h2.6" />
    </Base>
  );
}

/** Delivery OTP — parcel with code dots */
/** Voice search microphone */
export function IconMic(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="9" y="2.8" width="6" height="11" rx="3" />
      <path d="M5.4 11.4a6.6 6.6 0 0 0 13.2 0" />
      <path d="M12 18v3.2M8.8 21.2h6.4" />
    </Base>
  );
}

/** Text size / accessibility */
export function IconTextSize(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M3.4 18.6 8 5.4l4.6 13.2" />
      <path d="M5.2 14.6h5.6" />
      <path d="M13.6 18.6 17 9.8l3.4 8.8" />
      <path d="M14.8 15.9h4.4" />
    </Base>
  );
}

/** Calendar with refresh — monthly refill */
export function IconRefill(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="3.6" y="5.4" width="16.8" height="15.2" rx="2.6" />
      <path d="M8 3.2v4M16 3.2v4M3.6 10.4h16.8" />
      <path d="M9.6 15.2a2.6 2.6 0 0 1 4.7-1.2M14.6 16.9a2.6 2.6 0 0 1-4.8 1.1" />
      <path d="M14.9 13.4v1.4h-1.4M9.4 18.7v-1.4h1.4" />
    </Base>
  );
}

export function IconOtpBox(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="3.6" y="7.4" width="16.8" height="13" rx="2.4" />
      <path d="M7.8 7.4V5.2c0-.7.6-1.2 1.2-1.2h6c.7 0 1.2.6 1.2 1.2v2.2" />
      <circle cx="8.4" cy="13.9" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13.9" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="13.9" r="1" fill="currentColor" stroke="none" />
      <path d="M9.4 17.4h5.2" />
    </Base>
  );
}

/** Star rate */
export function IconStarRate(p: IconProps) {
  return (
    <Base {...p}>
      <path d="m12 3.6 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8L12 3.6Z" />
    </Base>
  );
}

/* ================================================================== */
/* DUOTONE SYSTEM — filled brand-tinted silhouette under the linework  */
/* ================================================================== */

function Duo({
  className,
  strokeWidth,
  bg,
  children,
}: IconProps & { bg: React.ReactNode; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <g fill="currentColor" stroke="none" fillOpacity={0.14}>
        {bg}
      </g>
      {children}
    </svg>
  );
}

/* --- Duotone · medicines ------------------------------------------- */

export function IconCapsuleDuo(p: IconProps) {
  return (
    <Duo
      {...p}
      bg={
        <g transform="rotate(-45 12 12)">
          <rect x="3.6" y="8.6" width="16.8" height="6.8" rx="3.4" />
        </g>
      }
    >
      <g transform="rotate(-45 12 12)">
        <rect x="3.6" y="8.6" width="16.8" height="6.8" rx="3.4" />
        <path d="M12 8.6v6.8" />
        <path d="M6.4 10.6h2.4" />
      </g>
    </Duo>
  );
}

export function IconVitaminTubeDuo(p: IconProps) {
  return (
    <Duo
      {...p}
      bg={<rect x="9" y="5.9" width="6" height="15.3" rx="2.2" />}
    >
      <rect x="8.2" y="2.8" width="7.6" height="3.1" rx="1.1" />
      <rect x="9" y="5.9" width="6" height="15.3" rx="2.2" />
      <path d="M10.4 9.6h3.2M10.4 12.6h3.2M10.4 15.6h3.2" />
    </Duo>
  );
}

export function IconDropletPlusDuo(p: IconProps) {
  return (
    <Duo
      {...p}
      bg={<path d="M12 3.2C9.6 6.5 6.8 10.4 6.8 14a5.2 5.2 0 0 0 10.4 0c0-3.6-2.8-7.5-5.2-10.8Z" />}
    >
      <path d="M12 3.2C9.6 6.5 6.8 10.4 6.8 14a5.2 5.2 0 0 0 10.4 0c0-3.6-2.8-7.5-5.2-10.8Z" />
      <path d="M12 12.4v4M10.2 14.4h3.6" />
    </Duo>
  );
}

export function IconSyringeDuo(p: IconProps) {
  return (
    <Duo
      {...p}
      bg={<path d="M15.9 7.9 7.6 16.2l-3 .9-1.5-1.5.9-3 8.3-8.3Z" />}
    >
      <path d="m17.2 2.8 4 4" />
      <path d="m19.2 4.8-2.4 2.4" />
      <path d="M14.4 6.4l3.2 3.2" />
      <path d="M15.9 7.9 7.6 16.2l-3 .9-1.5-1.5.9-3 8.3-8.3" />
      <path d="m9.4 10.6 4 4M6.9 13.1l2 2" />
    </Duo>
  );
}

export function IconInhalerDuo(p: IconProps) {
  return (
    <Duo {...p} bg={<rect x="9.6" y="7.2" width="7.6" height="13.6" rx="2.2" />}>
      <rect x="9.6" y="7.2" width="7.6" height="13.6" rx="2.2" />
      <rect x="11.4" y="3.4" width="4" height="3.8" rx="1" />
      <rect
        x="1.8"
        y="9.4"
        width="8.4"
        height="3.6"
        rx="1.4"
        transform="rotate(-18 6 11.2)"
      />
      <path d="m5.2 5.9-.9-.9M6.6 4.8l-.4-1.2M3.8 7.6l-1.2-.4" />
    </Duo>
  );
}

export function IconAllergyDuo(p: IconProps) {
  return (
    <Duo {...p} bg={<circle cx="12" cy="12" r="2.4" />}>
      <circle cx="12" cy="12" r="2.4" fill="currentColor" fillOpacity={0.35} stroke="none" />
      <path d="M12 6.8V4.2M12 17.2v2.6M6.8 12H4.2M17.2 12h2.6M8.3 8.3 6.5 6.5M15.7 8.3l1.8-1.8M8.3 15.7l-1.8 1.8M15.7 15.7l1.8 1.8" />
      <circle cx="12" cy="3.4" r=".9" />
      <circle cx="12" cy="20.6" r=".9" />
      <circle cx="3.4" cy="12" r=".9" />
      <circle cx="20.6" cy="12" r=".9" />
    </Duo>
  );
}

export function IconRxSheetDuo(p: IconProps) {
  return (
    <Duo {...p} bg={<rect x="4.8" y="2.8" width="14.4" height="18.4" rx="2.4" />}>
      <rect x="4.8" y="2.8" width="14.4" height="18.4" rx="2.4" />
      <path d="M8.8 8.2h3.8M8.8 12.2h6.4M8.8 16.2h4.6" />
      <path d="M16.6 6v3M15.1 7.5h3" />
    </Duo>
  );
}

export function IconShieldCrossDuo(p: IconProps) {
  return (
    <Duo
      {...p}
      bg={<path d="M12 2.8l7.2 2.7v5.7c0 4.7-3 7.9-7.2 9.9-4.2-2-7.2-5.2-7.2-9.9V5.5L12 2.8Z" />}
    >
      <path d="M12 2.8l7.2 2.7v5.7c0 4.7-3 7.9-7.2 9.9-4.2-2-7.2-5.2-7.2-9.9V5.5L12 2.8Z" />
      <path d="M12 8v6.4M8.8 11.2h6.4" />
    </Duo>
  );
}

/* --- Duotone · care & devices -------------------------------------- */

export function IconCreamJarDuo(p: IconProps) {
  return (
    <Duo {...p} bg={<rect x="6.4" y="8.6" width="11.2" height="12" rx="3.2" />}>
      <rect x="5.4" y="4.6" width="13.2" height="4" rx="1.6" />
      <rect x="6.4" y="8.6" width="11.2" height="12" rx="3.2" />
      <path d="M9.6 12.8h4.8M9.6 15.8h3" />
    </Duo>
  );
}

export function IconBabyBottleDuo(p: IconProps) {
  return (
    <Duo {...p} bg={<rect x="7.6" y="8.3" width="8.8" height="13" rx="2.6" />}>
      <path d="M10.4 5.4c-.9-1.7-.2-3.2 1.6-3.2s2.5 1.5 1.6 3.2" />
      <rect x="8.6" y="5.4" width="6.8" height="2.9" rx="1.1" />
      <rect x="7.6" y="8.3" width="8.8" height="13" rx="2.6" />
      <path d="M10.1 12.4h3.8M10.1 15.6h3.8M10.1 18.8h2.4" />
    </Duo>
  );
}

export function IconSoapDuo(p: IconProps) {
  return (
    <Duo {...p} bg={<rect x="7.4" y="6.9" width="9.2" height="14" rx="2.6" />}>
      <path d="M9.9 4.6V3.4c0-.5.4-.9.9-.9h2.4c.5 0 .9.4.9.9v1.2" />
      <path d="M9.9 3.7H8.2c-.4 0-.7.3-.7.7v.9" />
      <path d="M12 4.6v2.3" />
      <rect x="7.4" y="6.9" width="9.2" height="14" rx="2.6" />
      <path d="M10.2 11h3.6M10.2 14.2h3.6" />
    </Duo>
  );
}

export function IconToothDuo(p: IconProps) {
  return (
    <Duo
      {...p}
      bg={<path d="M12 4.2c-1.7-1.1-3.5-1.2-4.9-.1-2.3 1.8-2.8 4.5-1.8 7.3.8 2.3 1.1 3.4 1.5 5.7.3 1.7 1 3 2.1 3 1.3 0 1.5-1.5 1.7-3.1.2-1.5.5-2.6 1.4-2.6s1.2 1.1 1.4 2.6c.2 1.6.4 3.1 1.7 3.1 1.1 0 1.8-1.3 2.1-3 .4-2.3.7-3.4 1.5-5.7 1-2.8.5-5.5-1.8-7.3-1.4-1.1-3.2-1-4.9.1Z" />}
    >
      <path d="M12 4.2c-1.7-1.1-3.5-1.2-4.9-.1-2.3 1.8-2.8 4.5-1.8 7.3.8 2.3 1.1 3.4 1.5 5.7.3 1.7 1 3 2.1 3 1.3 0 1.5-1.5 1.7-3.1.2-1.5.5-2.6 1.4-2.6s1.2 1.1 1.4 2.6c.2 1.6.4 3.1 1.7 3.1 1.1 0 1.8-1.3 2.1-3 .4-2.3.7-3.4 1.5-5.7 1-2.8.5-5.5-1.8-7.3-1.4-1.1-3.2-1-4.9.1Z" />
      <path d="M8.7 7.2c.5-.6 1.2-1 2-1.1" />
    </Duo>
  );
}

export function IconSunScreenDuo(p: IconProps) {
  return (
    <Duo {...p} bg={<circle cx="12" cy="12" r="4.2" />}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 3.2v2M12 18.8v2M3.2 12h2M18.8 12h2M5.8 5.8l1.4 1.4M16.8 16.8l1.4 1.4M18.2 5.8l-1.4 1.4M7.2 16.8l-1.4 1.4" />
    </Duo>
  );
}

export function IconMaskDuo(p: IconProps) {
  return (
    <Duo
      {...p}
      bg={<path d="M5.2 9.8C5.2 7 8.3 5 12 5s6.8 2 6.8 4.8v3.4c0 2.9-3.1 4.9-6.8 4.9s-6.8-2-6.8-4.9V9.8Z" />}
    >
      <path d="M5.2 9.8C5.2 7 8.3 5 12 5s6.8 2 6.8 4.8v3.4c0 2.9-3.1 4.9-6.8 4.9s-6.8-2-6.8-4.9V9.8Z" />
      <path d="M12 5v13.1" />
      <path d="M5.2 11.2H2.8M18.8 11.2h2.4" />
      <path d="M8.3 6.4c-.4 2.2-.4 9 0 11.2M15.7 6.4c.4 2.2.4 9 0 11.2" />
    </Duo>
  );
}

export function IconThermoDuo(p: IconProps) {
  return (
    <Duo
      {...p}
      bg={<path d="M10.4 4.6a1.6 1.6 0 0 1 3.2 0v8.9a3.9 3.9 0 1 1-3.2 0V4.6Z" />}
    >
      <path d="M10.4 4.6a1.6 1.6 0 0 1 3.2 0v8.9a3.9 3.9 0 1 1-3.2 0V4.6Z" />
      <path d="M12 11.4v5" />
      <circle cx="12" cy="17.4" r="1.3" fill="currentColor" stroke="none" />
      <path d="M16.4 7.4h2.4M16.4 10.2h1.6" />
    </Duo>
  );
}

export function IconBPDeviceDuo(p: IconProps) {
  return (
    <Duo {...p} bg={<rect x="3" y="4.6" width="12.6" height="9" rx="2" />}>
      <rect x="3" y="4.6" width="12.6" height="9" rx="2" />
      <path d="M5.7 7.5h4.6M5.7 10.2h3" />
      <path d="M15.6 8.4c3 .4 4.6 2.3 4.6 5.2v1.2" />
      <circle cx="20.2" cy="17.2" r="2.4" />
    </Duo>
  );
}

export function IconStethoscopeDuo(p: IconProps) {
  return (
    <Duo {...p} bg={<path d="M5.6 3.2v5.2a6.4 6.4 0 0 0 12.8 0V3.2Z" />}>
      <path d="M5.6 3.2v5.2a6.4 6.4 0 0 0 12.8 0V3.2" />
      <path d="M12 14.8v1.4c0 1.9 1.5 3.4 3.4 3.4h.1" />
      <circle cx="17.8" cy="19.6" r="2.3" />
      <path d="M4.2 3.2h1.4M18.4 3.2h1.4" />
    </Duo>
  );
}

export function IconHeartPulseDuo(p: IconProps) {
  return (
    <Duo
      {...p}
      bg={<path d="M12 20.3C8.4 17.6 4 13.9 4 9.8 4 7 6.2 4.9 8.9 4.9c1.3 0 2.4.6 3.1 1.5.7-.9 1.8-1.5 3.1-1.5 2.7 0 4.9 2.1 4.9 4.9 0 4.1-4.4 7.8-8 10.5Z" />}
    >
      <path d="M12 20.3C8.4 17.6 4 13.9 4 9.8 4 7 6.2 4.9 8.9 4.9c1.3 0 2.4.6 3.1 1.5.7-.9 1.8-1.5 3.1-1.5 2.7 0 4.9 2.1 4.9 4.9 0 4.1-4.4 7.8-8 10.5Z" />
      <path d="M7.4 11.4h2.4l1.3-2.2 2 4 1.3-1.8h2.2" />
    </Duo>
  );
}

/* --- Duotone · delivery & services ---------------------------------- */

export function IconScooterDuo(p: IconProps) {
  return (
    <Duo {...p} bg={<rect x="2.2" y="7.8" width="4.6" height="4.2" rx="1.1" />}>
      <circle cx="5.4" cy="17.2" r="2.3" />
      <circle cx="18.6" cy="17.2" r="2.3" />
      <path d="M5.4 17.2h6.9" />
      <path d="M12.3 17.2l2.5-7.6h2.4" />
      <path d="M17.2 9.6l1.4 7.6" />
      <path d="M15.2 7h3.6" />
      <path d="M16.4 7l.8 2.6" />
      <rect x="2.2" y="7.8" width="4.6" height="4.2" rx="1.1" />
      <path d="M4.5 12v2.9" />
    </Duo>
  );
}

export function IconVanDuo(p: IconProps) {
  return (
    <Duo {...p} bg={<rect x="2.9" y="6.8" width="9.8" height="9" rx="1.2" />}>
      <rect x="2.9" y="6.8" width="9.8" height="9" rx="1.2" />
      <path d="M12.7 9.4h3.8l3 3.4v3h-6.8Z" />
      <circle cx="7.1" cy="17.6" r="1.9" />
      <circle cx="17.3" cy="17.6" r="1.9" />
      <path d="M1.4 4.8h3M.9 7.6h2.2" />
    </Duo>
  );
}

export function IconPinDuo(p: IconProps) {
  return (
    <Duo
      {...p}
      bg={<path d="M12 21.2S5.4 15.8 5.4 10.8a6.6 6.6 0 0 1 13.2 0c0 5-6.6 10.4-6.6 10.4Z" />}
    >
      <path d="M12 21.2S5.4 15.8 5.4 10.8a6.6 6.6 0 0 1 13.2 0c0 5-6.6 10.4-6.6 10.4Z" />
      <circle cx="12" cy="10.6" r="2.4" />
    </Duo>
  );
}

export function IconRouteDuo(p: IconProps) {
  return (
    <Duo
      {...p}
      bg={<path d="M7.4 18.6h4.2c3.4 0 3.4-6.4 0-6.4H9.2c-3.4 0-3.4-6.8 0-6.8h7.4l-.02 0" />}
    >
      <circle cx="5.4" cy="18.6" r="2" />
      <circle cx="18.6" cy="5.4" r="2" />
      <path d="M7.4 18.6h4.2c3.4 0 3.4-6.4 0-6.4H9.2c-3.4 0-3.4-6.8 0-6.8h7.4" />
    </Duo>
  );
}

export function IconClockFastDuo(p: IconProps) {
  return (
    <Duo {...p} bg={<circle cx="13.2" cy="13.2" r="7.6" />}>
      <circle cx="13.2" cy="13.2" r="7.6" />
      <path d="M13.2 9.4v3.8l2.6 1.6" />
      <path d="M2.8 6.6h4.2M1.8 10.2h3.2M2.8 13.8h2.8" />
    </Duo>
  );
}

export function IconWalletDuo(p: IconProps) {
  return (
    <Duo {...p} bg={<rect x="2.8" y="6" width="18.4" height="13.4" rx="2.4" />}>
      <path d="M5.6 6V5.2c0-.7.6-1.3 1.3-1.3h10.2c.7 0 1.3.6 1.3 1.3V6" />
      <rect x="2.8" y="6" width="18.4" height="13.4" rx="2.4" />
      <path d="M21.2 12.4h-4.2a1.9 1.9 0 0 0 0 3.8h4.2" />
    </Duo>
  );
}

export function IconGiftDuo(p: IconProps) {
  return (
    <Duo {...p} bg={<rect x="4.2" y="11" width="15.6" height="9.4" rx="1.8" />}>
      <rect x="4.2" y="11" width="15.6" height="9.4" rx="1.8" />
      <rect x="3" y="7.6" width="18" height="3.4" rx="1" />
      <path d="M12 7.6v12.8" />
      <path d="M12 7.6c-2.2 0-3.9-1-3.9-2.5 0-1.1.9-1.9 1.9-1.6 1.2.3 2 2.2 2 4.1ZM12 7.6c2.2 0 3.9-1 3.9-2.5 0-1.1-.9-1.9-1.9-1.6-1.2.3-2 2.2-2 4.1Z" />
    </Duo>
  );
}

export function IconStorefrontDuo(p: IconProps) {
  return (
    <Duo
      {...p}
      bg={<path d="M4.4 9.4v9a1.6 1.6 0 0 0 1.6 1.6h12a1.6 1.6 0 0 0 1.6-1.6v-9Z" />}
    >
      <path d="M4.6 4.2h14.8l1.1 5.2H3.5l1.1-5.2Z" />
      <path d="M4.4 9.4v9a1.6 1.6 0 0 0 1.6 1.6h12a1.6 1.6 0 0 0 1.6-1.6v-9" />
      <path d="M12 12.6v4.2M9.9 14.7h4.2" />
    </Duo>
  );
}

export function IconPharmacistDuo(p: IconProps) {
  return (
    <Duo {...p} bg={<path d="M4.6 13.4a7.4 7.4 0 0 1 14.8 0Z" />}>
      <path d="M4.6 13.4a7.4 7.4 0 0 1 14.8 0" />
      <rect x="2.8" y="12.6" width="3.8" height="6" rx="1.7" />
      <rect x="17.4" y="12.6" width="3.8" height="6" rx="1.7" />
      <path d="M19.3 18.6v.4c0 1.3-1 2.3-2.3 2.3h-3.4" />
    </Duo>
  );
}

export function IconRxClipboardDuo(p: IconProps) {
  return (
    <Duo {...p} bg={<rect x="5" y="4.4" width="14" height="17" rx="2.4" />}>
      <rect x="5" y="4.4" width="14" height="17" rx="2.4" />
      <path d="M9.2 4.4V3.2c0-.5.4-.9.9-.9h3.8c.5 0 .9.4.9.9v1.2" />
      <path d="M8.8 12.6h1.9c.9 0 1.6-.7 1.6-1.6s-.7-1.6-1.6-1.6H8.8v5.6" />
      <path d="m10.4 11 3 3.6M13.4 11l-3 3.6" />
      <path d="M14.4 18h1.8M9 18h2.6" />
    </Duo>
  );
}

export function IconBoxesDuo(p: IconProps) {
  return (
    <Duo
      {...p}
      bg={
        <>
          <rect x="3.4" y="12.4" width="7.6" height="7.6" rx="1.2" />
          <rect x="8.2" y="4" width="7.6" height="6.4" rx="1.2" />
        </>
      }
    >
      <rect x="3.4" y="12.4" width="7.6" height="7.6" rx="1.2" />
      <rect x="13" y="12.4" width="7.6" height="7.6" rx="1.2" />
      <rect x="8.2" y="4" width="7.6" height="6.4" rx="1.2" />
      <path d="M10.4 16.2h3.6" />
    </Duo>
  );
}

export function IconCartBagDuo(p: IconProps) {
  return (
    <Duo
      {...p}
      bg={<path d="M5.2 8h13.6l-.9 11.1a1.8 1.8 0 0 1-1.8 1.7H7.9a1.8 1.8 0 0 1-1.8-1.7L5.2 8Z" />}
    >
      <path d="M5.2 8h13.6l-.9 11.1a1.8 1.8 0 0 1-1.8 1.7H7.9a1.8 1.8 0 0 1-1.8-1.7L5.2 8Z" />
      <path d="M8.8 10.6V6.4a3.2 3.2 0 0 1 6.4 0v4.2" />
      <path d="M12 12.4v4M10 14.4h4" />
    </Duo>
  );
}

export function IconHomeSoftDuo(p: IconProps) {
  return (
    <Duo
      {...p}
      bg={<path d="M6 9.2v9.2c0 .9.7 1.6 1.6 1.6h8.8c.9 0 1.6-.7 1.6-1.6V9.2Z" />}
    >
      <path d="M4.2 10.4 12 4l7.8 6.4" />
      <path d="M6 9.2v9.2c0 .9.7 1.6 1.6 1.6h8.8c.9 0 1.6-.7 1.6-1.6V9.2" />
      <path d="M10 20v-5.4c0-.6.4-1 1-1h2c.6 0 1 .4 1 1V20" />
    </Duo>
  );
}

export function IconUserRoundDuo(p: IconProps) {
  return (
    <Duo {...p} bg={<circle cx="12" cy="12" r="9" />}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="9.6" r="3" />
      <path d="M5.8 18.4c1-2.7 3.3-4.2 6.2-4.2s5.2 1.5 6.2 4.2" />
    </Duo>
  );
}

export function IconHeartLineDuo(p: IconProps) {
  return (
    <Duo
      {...p}
      bg={<path d="M12 20.1C8.6 17.5 4.2 14 4.2 9.9c0-2.7 2-4.8 4.6-4.8 1.3 0 2.5.6 3.2 1.5.7-.9 1.9-1.5 3.2-1.5 2.6 0 4.6 2.1 4.6 4.8 0 4.1-4.4 7.6-7.8 10.2Z" />}
    >
      <path d="M12 20.1C8.6 17.5 4.2 14 4.2 9.9c0-2.7 2-4.8 4.6-4.8 1.3 0 2.5.6 3.2 1.5.7-.9 1.9-1.5 3.2-1.5 2.6 0 4.6 2.1 4.6 4.8 0 4.1-4.4 7.6-7.8 10.2Z" />
    </Duo>
  );
}

/* ================================================================== */
/* CONTROL ICONS — sorting, filtering, display modes, actions          */
/* ================================================================== */

/* --- Display modes -------------------------------------------------- */

/** Cozy grid — 2×2 soft tiles */
export function IconViewCozy(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="3.6" y="3.6" width="7.2" height="7.2" rx="2" />
      <rect x="13.2" y="3.6" width="7.2" height="7.2" rx="2" />
      <rect x="3.6" y="13.2" width="7.2" height="7.2" rx="2" />
      <rect x="13.2" y="13.2" width="7.2" height="7.2" rx="2" />
    </Base>
  );
}

/** List rows — leading dot + lines */
export function IconViewList(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="4.4" cy="6.2" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="4.4" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="4.4" cy="17.8" r="1.3" fill="currentColor" stroke="none" />
      <path d="M8.6 6.2h11M8.6 12h11M8.6 17.8h11" />
    </Base>
  );
}

/** Compact grid — 3×3 mini tiles */
export function IconViewCompact(p: IconProps) {
  return (
    <Base {...p}>
      {[3.8, 10.1, 16.4].flatMap((x) =>
        [3.8, 10.1, 16.4].map((y) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="3.8" height="3.8" rx="1.1" />
        ))
      )}
    </Base>
  );
}

/* --- Sorting -------------------------------------------------------- */

/** Sort lines with descending arrow */
export function IconSort(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4 6.4h9M4 12h6M4 17.6h3.6" />
      <path d="M17.4 20V6.8" />
      <path d="m13.8 10.4 3.6-3.6 3.6 3.6" />
    </Base>
  );
}

export function IconArrowUp(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 19.6V4.8" />
      <path d="m6.4 10.4 5.6-5.6 5.6 5.6" />
    </Base>
  );
}

export function IconArrowDown(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 4.4v14.8" />
      <path d="m6.4 13.6 5.6 5.6 5.6-5.6" />
    </Base>
  );
}

export function IconArrowUpDown(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M7.6 19.6V6" />
      <path d="m3.8 9.8 3.8-3.8 3.8 3.8" />
      <path d="M16.4 4.4V18" />
      <path d="m12.6 14.2 3.8 3.8 3.8-3.8" />
    </Base>
  );
}

export function IconChevronR(p: IconProps) {
  return (
    <Base {...p}>
      <path d="m9 5.4 6.6 6.6L9 18.6" />
    </Base>
  );
}

export function IconChevronL(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M15 5.4 8.4 12 15 18.6" />
    </Base>
  );
}

export function IconArrowR(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4.4 12h15.2" />
      <path d="m13.8 6.2 5.8 5.8-5.8 5.8" />
    </Base>
  );
}

export function IconArrowL(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M19.6 12H4.4" />
      <path d="M10.2 6.2 4.4 12l5.8 5.8" />
    </Base>
  );
}

/* --- Filtering ------------------------------------------------------ */

export function IconFunnel(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M3.6 5h16.8l-6.6 7.8v5.4l-3.6 2.2v-7.6L3.6 5Z" />
    </Base>
  );
}

export function IconSliders(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4 7.2h8.4M17.6 7.2h2.4" />
      <circle cx="15.4" cy="7.2" r="2.1" />
      <path d="M4 16.8h2.4M11.6 16.8h8.4" />
      <circle cx="9.4" cy="16.8" r="2.1" />
      <path d="M4 12h11M19.6 12h.4" />
      <circle cx="17.4" cy="12" r="2.1" />
    </Base>
  );
}

/* --- Basic actions --------------------------------------------------- */

export function IconPlus(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 5.2v13.6M5.2 12h13.6" />
    </Base>
  );
}

export function IconMinus(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M5.2 12h13.6" />
    </Base>
  );
}

export function IconXMark(p: IconProps) {
  return (
    <Base {...p}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Base>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Base {...p}>
      <path d="m5 12.6 4.4 4.4L19 7.4" />
    </Base>
  );
}

export function IconCheckCircle(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="m8.2 12.3 2.6 2.6 5-5.4" />
    </Base>
  );
}

export function IconInfoCircle(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 11v5" />
      <circle cx="12" cy="7.9" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconWarnTriangle(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M10.3 4.2 2.9 17.4c-.7 1.2.2 2.6 1.6 2.6h15c1.4 0 2.3-1.4 1.6-2.6L13.7 4.2c-.7-1.2-2.7-1.2-3.4 0Z" />
      <path d="M12 9.4v4.4" />
      <circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconTrash(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4.4 6.6h15.2" />
      <path d="M9.2 6.6V4.9c0-.7.6-1.3 1.3-1.3h3c.7 0 1.3.6 1.3 1.3v1.7" />
      <path d="M6.4 6.6l.8 12.1c.1 1 .9 1.7 1.9 1.7h5.8c1 0 1.8-.7 1.9-1.7l.8-12.1" />
      <path d="M10.1 10.4v6M13.9 10.4v6" />
    </Base>
  );
}

export function IconShare(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="17.6" cy="5.6" r="2.6" />
      <circle cx="17.6" cy="18.4" r="2.6" />
      <path d="m8.4 10.8 6.8-3.9M8.4 13.2l6.8 3.9" />
    </Base>
  );
}

export function IconEye(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M2.6 12S6 5.8 12 5.8 21.4 12 21.4 12 18 18.2 12 18.2 2.6 12 2.6 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </Base>
  );
}

export function IconBell(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M18 9.6a6 6 0 1 0-12 0c0 5.2-2 6.4-2 6.4h16s-2-1.2-2-6.4Z" />
      <path d="M10 19.6a2.1 2.1 0 0 0 4 0" />
    </Base>
  );
}

export function IconRefresh(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M20 5.4v5h-5" />
      <path d="M4 18.6v-5h5" />
      <path d="M19.4 10.4A7.6 7.6 0 0 0 5.9 8.1L4 10.4M4.6 13.6a7.6 7.6 0 0 0 13.5 2.3l1.9-2.3" />
    </Base>
  );
}

/* --- Objects & contact ----------------------------------------------- */

export function IconPhone(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M19.6 15.9v2.3c0 1-.8 1.8-1.8 1.8-8.5-.5-13.3-5.2-13.9-13.9 0-1 .8-1.8 1.8-1.8h2.3c.9 0 1.6.6 1.8 1.4l.6 2.4c.2.7-.1 1.4-.6 1.9l-1 1a12.4 12.4 0 0 0 4.8 4.8l1-1c.5-.5 1.2-.8 1.9-.6l2.4.6c.8.2 1.4.9 1.4 1.8Z" />
    </Base>
  );
}

export function IconWhatsapp(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 3.4a8.6 8.6 0 0 0-7.4 13L3.4 20.6l4.4-1.1A8.6 8.6 0 1 0 12 3.4Z" />
      <path d="M9.2 8.4c.6-.2.9 0 1.1.5l.5 1.2c.1.4 0 .7-.3 1l-.5.5c.5 1 1.3 1.8 2.3 2.3l.5-.5c.3-.3.6-.4 1-.3l1.2.5c.5.2.7.5.5 1.1-.3.8-1.2 1.3-2.1 1.2-2.9-.5-5.2-2.8-5.7-5.7-.1-.9.4-1.8 1.2-2.1l.3.3Z" />
    </Base>
  );
}

export function IconUploadCloud(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M6.8 17.4A4.4 4.4 0 0 1 7 8.6a5.6 5.6 0 0 1 10.8 1.2 3.8 3.8 0 0 1-.6 7.6" />
      <path d="M12 20.4v-7.2" />
      <path d="m8.8 16.4 3.2-3.2 3.2 3.2" />
    </Base>
  );
}

export function IconCamera(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4 8.2h2.6l1.5-2.4h7.8l1.5 2.4H20a1.6 1.6 0 0 1 1.6 1.6v8.4A1.6 1.6 0 0 1 20 19.8H4a1.6 1.6 0 0 1-1.6-1.6V9.8A1.6 1.6 0 0 1 4 8.2Z" />
      <circle cx="12" cy="13.8" r="3.4" />
    </Base>
  );
}

export function IconFile(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M13.6 3.2H7.2A1.8 1.8 0 0 0 5.4 5v14c0 1 .8 1.8 1.8 1.8h9.6c1 0 1.8-.8 1.8-1.8V8.2l-5-5Z" />
      <path d="M13.4 3.4v5h5" />
    </Base>
  );
}

export function IconCalendar(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="3.6" y="5.2" width="16.8" height="15.4" rx="2.2" />
      <path d="M3.6 9.8h16.8M8.2 3.2v4M15.8 3.2v4" />
      <path d="M8 13.6h2.4M13.6 13.6H16M8 17.2h2.4" />
    </Base>
  );
}

export function IconClock(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 7.2V12l3.2 2" />
    </Base>
  );
}

export function IconTag(p: IconProps) {
  return (
    <Base {...p}>
      <path d="m12.6 3.4 7.2 7.2a1.8 1.8 0 0 1 0 2.5l-6.7 6.7a1.8 1.8 0 0 1-2.5 0l-7.2-7.2V4.8a1.4 1.4 0 0 1 1.4-1.4h7.8Z" />
      <circle cx="8.4" cy="8.4" r="1.3" />
    </Base>
  );
}

export function IconPercent(p: IconProps) {
  return (
    <Base {...p}>
      <path d="m5.6 18.4 12.8-12.8" />
      <circle cx="7.4" cy="7.4" r="2.5" />
      <circle cx="16.6" cy="16.6" r="2.5" />
    </Base>
  );
}

export function IconUsers(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="9.2" cy="8.2" r="3.4" />
      <path d="M3.4 19.6c.8-3 3-4.6 5.8-4.6s5 1.6 5.8 4.6" />
      <path d="M15.6 5.2a3.4 3.4 0 0 1 0 6" />
      <path d="M17.4 15.4c1.6.7 2.8 2.1 3.2 4.2" />
    </Base>
  );
}

export function IconGlobe(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M3.2 12h17.6" />
      <path d="M12 3.2c2.4 2.2 3.6 5.2 3.6 8.8s-1.2 6.6-3.6 8.8c-2.4-2.2-3.6-5.2-3.6-8.8s1.2-6.6 3.6-8.8Z" />
    </Base>
  );
}

export function IconMedal(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="9" r="5.4" />
      <path d="m8.8 13.6-2 7 5.2-2.6 5.2 2.6-2-7" />
      <path d="m12 6.4.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3.9-1.8Z" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconSparkles(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 4.2 13.7 9l4.8 1.7-4.8 1.7L12 17.2l-1.7-4.8L5.5 10.7 10.3 9 12 4.2Z" />
      <path d="M18.8 15.8l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
      <path d="M5.6 3.2l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5L3.6 5.2l1.5-.5.5-1.5Z" />
    </Base>
  );
}

export function IconShieldCheck(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 2.8l7.2 2.7v5.7c0 4.7-3 7.9-7.2 9.9-4.2-2-7.2-5.2-7.2-9.9V5.5L12 2.8Z" />
      <path d="m8.8 11.8 2.2 2.2 4.2-4.6" />
    </Base>
  );
}

export function IconSearchOff(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="11" cy="11" r="6.4" />
      <path d="m15.8 15.8 4.4 4.4" />
      <path d="m7.2 14.8 7.6-7.6" />
    </Base>
  );
}

export function IconReceipt(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M5.6 3.4h12.8v17.2l-2.1-1.6-2.2 1.6-2.1-1.6-2.1 1.6-2.2-1.6-2.1 1.6V3.4Z" />
      <path d="M9 8h6M9 11.6h6M9 15.2h3.4" />
    </Base>
  );
}

export function IconCard(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="2.8" y="5.4" width="18.4" height="13.2" rx="2.2" />
      <path d="M2.8 9.8h18.4" />
      <path d="M6.4 14.6h3.8" />
    </Base>
  );
}

export function IconCash(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="2.8" y="6.6" width="18.4" height="10.8" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 9.8v.01M18 14.2v.01" />
    </Base>
  );
}

export function IconBoxOpen(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 8.6 3.6 5l8.4-1.6L20.4 5 12 8.6Z" />
      <path d="M3.6 5v10.6L12 20.6l8.4-5V5" />
      <path d="M12 8.6v12" />
    </Base>
  );
}

export function IconPackage(p: IconProps) {
  return (
    <Base {...p}>
      <path d="m12 2.8 8.4 4.4v9.6L12 21.2l-8.4-4.4V7.2L12 2.8Z" />
      <path d="m3.8 7.4 8.2 4.2 8.2-4.2" />
      <path d="M12 11.6v9.4" />
      <path d="m7.9 5 8.2 4.2v3.6" />
    </Base>
  );
}

export function IconStarFill({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="m12 3.2 2.7 5.4 6 1-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.6l6-1L12 3.2Z"
      />
    </svg>
  );
}

export function IconHeartFill({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 20.4C8.4 17.6 3.8 13.9 3.8 9.6c0-2.9 2.2-5.1 5-5.1 1.3 0 2.5.6 3.2 1.6.7-1 1.9-1.6 3.2-1.6 2.8 0 5 2.2 5 5.1 0 4.3-4.6 8-8.2 10.8Z"
      />
    </svg>
  );
}

export function IconLeaf(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M5 19.6c-1.6-6.8 2.6-13 13.4-14.2 1.2 10.8-5 15.4-10.6 14.6" />
      <path d="M5 19.6C7.4 14 11 10.4 15.6 8.4" />
    </Base>
  );
}

/* Compatibility aliases for existing lucide-style names */
export { IconCapsule as PillIcon };

/* Duotone lookup — maps any base icon to its duotone twin when available */
const DUO_PAIRS: [IconType, IconType][] = [
  [IconCapsule, IconCapsuleDuo],
  [IconVitaminTube, IconVitaminTubeDuo],
  [IconDropletPlus, IconDropletPlusDuo],
  [IconSyringe, IconSyringeDuo],
  [IconInhaler, IconInhalerDuo],
  [IconAllergy, IconAllergyDuo],
  [IconRxSheet, IconRxSheetDuo],
  [IconShieldCross, IconShieldCrossDuo],
  [IconCreamJar, IconCreamJarDuo],
  [IconBabyBottle, IconBabyBottleDuo],
  [IconSoap, IconSoapDuo],
  [IconTooth, IconToothDuo],
  [IconSunScreen, IconSunScreenDuo],
  [IconMask, IconMaskDuo],
  [IconThermo, IconThermoDuo],
  [IconBPDevice, IconBPDeviceDuo],
  [IconStethoscope, IconStethoscopeDuo],
  [IconHeartPulse, IconHeartPulseDuo],
  [IconScooter, IconScooterDuo],
  [IconVan, IconVanDuo],
  [IconPin, IconPinDuo],
  [IconRoute, IconRouteDuo],
  [IconClockFast, IconClockFastDuo],
  [IconWallet, IconWalletDuo],
  [IconGift, IconGiftDuo],
  [IconStorefront, IconStorefrontDuo],
  [IconPharmacist, IconPharmacistDuo],
  [IconRxClipboard, IconRxClipboardDuo],
  [IconBoxes, IconBoxesDuo],
  [IconCartBag, IconCartBagDuo],
  [IconHomeSoft, IconHomeSoftDuo],
  [IconUserRound, IconUserRoundDuo],
  [IconHeartLine, IconHeartLineDuo],
  [IconGridCats, IconViewCozy],
];

const duoMap = new Map<IconType, IconType>(DUO_PAIRS);

/** Returns the duotone twin of a base icon, or the icon itself when none exists. */
export function duoOf(icon: IconType): IconType {
  return duoMap.get(icon) ?? icon;
}
