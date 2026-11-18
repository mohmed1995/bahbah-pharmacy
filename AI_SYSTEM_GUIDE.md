# BAHBAH PHARMACY SYSTEM — AI ARCHITECTURE & CODEBASE GUIDE
> **Purpose**: This guide is written specifically for AI agents, LLMs, and engineers modifying or auditing the Bahbah Pharmacy codebase. It details the complete architecture, data flow, order lifecycle, database schemas, state management, and critical operational constraints.

---

## 1. Executive Summary & Tech Stack

- **Framework**: Next.js 16 (App Router, `"use client"` SPA architecture under `src/app/page.tsx`)
- **Language**: TypeScript 5 (Strict typing, zero emit errors required)
- **Styling**: Tailwind CSS v3 + Lucide Icons + Framer-motion inspired CSS animations
- **State Management**: Zustand 5 with `persist` middleware (`src/lib/bahbah/store.ts`)
- **Backend / Database**: Supabase PostgreSQL + Auth + Realtime WebSocket channels (`src/lib/supabase.ts`, `src/lib/bahbah/supabase-sync.ts`)
- **Target Audience / Locale**: Egyptian Arabic primary (`ar-EG`), English fallback (`en`). Localized for Dairut / Assiut and rural villages.

---

## 2. Directory & Component Index

```
.
├── AI_SYSTEM_GUIDE.md             # This document — read first
├── package.json                   # Dependencies, scripts (dev, build, lint)
├── next.config.ts                 # Next.js configuration
├── tsconfig.json                  # TypeScript compiler settings & path aliases (@/* -> ./src/*)
├── tailwind.config.ts             # Custom colors (emerald/teal pharmacy palette), fonts, shadows
├── database/                      # SQL schemas, seed files, and Prisma schema
│   ├── bahbah-supabase-master-schema.sql
│   ├── bahbah-supabase-auth-and-catalog.sql
│   ├── setup-supabase.sql
│   ├── setup-admin-settings.sql
│   ├── fix-supabase-production.sql
│   ├── seed-products.sql
│   └── schema.prisma
├── public/                        # Manifest, PWA service worker, headers, robots
└── src/
    ├── app/                       # Next.js App Router root layout & main entry
    │   ├── layout.tsx             # Root HTML, font setup, toaster mount
    │   └── page.tsx               # Renders BahbahRoot wrapper
    ├── components/
    │   ├── bahbah/                # Application modules & views
    │   │   ├── root.tsx           # Main container, mounts Shell, handles global initialization & realtime sync
    │   │   ├── shell.tsx          # Master navigation shell, bottom navigation bar, top header, search modal
    │   │   ├── home.tsx           # Home feed: carousel ads, quick services, category shortcuts, hot deals
    │   │   ├── catalog.tsx        # Category catalog, product filtering, live search, voice search
    │   │   ├── product.tsx        # Single product view modal / drawer
    │   │   ├── product-card.tsx   # Reusable product card with quantity stepper and stock badge
    │   │   ├── cart.tsx           # 3-step checkout (Delivery info -> Review -> Confirmation)
    │   │   ├── track.tsx          # Order tracking screen (pending -> shipping -> delivered timeline)
    │   │   ├── auth.tsx           # Simplified customer & staff authentication (Phone / Password)
    │   │   ├── care.tsx           # Chronic illness monthly medicine subscription program
    │   │   ├── care-card.tsx      # Monthly care subscription card & status badge
    │   │   ├── admin.tsx          # Admin control panel: stats, order management, stock toggles
    │   │   ├── admin-ops.tsx      # Order queue management, driver assignment, status transitions
    │   │   ├── admin-delivery.tsx # Delivery zones, fees, and courier roster management
    │   │   ├── admin-rx.tsx       # Prescription verification queue for pharmacists/admins
    │   │   ├── admin-insights.tsx # Business analytics, sales metrics, top selling products
    │   │   ├── courier.tsx        # Courier driver interface (view assigned orders, mark delivered & collected)
    │   │   ├── pharmacist.tsx     # Pharmacist dispensing & prescription review screen
    │   │   ├── vitals.tsx         # Patient health measurements (Blood pressure, Glucose)
    │   │   ├── offers.tsx         # Special discounts, flash deals & bundle promotions
    │   │   ├── icons.tsx          # SVG icons collection
    │   │   └── reveal.tsx         # Smooth entrance animations
    │   └── ui/                    # Base UI primitives (button, input, dialog, toast, etc.)
    └── lib/
        ├── supabase.ts            # Supabase client, offline retry queue, table CRUD operations
        └── bahbah/
            ├── config.ts          # Pharmacy contact info, WhatsApp numbers, address, coordinates
            ├── data.ts            # Initial seed data, product categories, delivery zones, mock fallbacks
            ├── i18n.ts            # Arabic & English translation dictionaries
            ├── real-catalog.json  # Pre-compiled local catalog backup (1500+ items)
            ├── store.ts           # Central Zustand store (Cart, Orders, Auth, Settings, Subscriptions)
            └── supabase-sync.ts   # Realtime WebSocket listeners, delta merging, offline flush triggers
```

---

## 3. State Management & Data Architecture (`src/lib/bahbah/store.ts`)

The application state is managed centrally via Zustand (`useBahbah`). 

### Core State Slices:
1. **User & Auth State (`user`, `role`, `setUser`, `setRole`, `logout`)**:
   - Roles: `'customer' | 'admin' | 'pharmacist' | 'courier'`
   - Preserved in `localStorage` under `bahbah_store_v1`.
2. **Cart State (`cart`, `addToCart`, `removeFromCart`, `clearCart`, `appliedCoupon`)**:
   - Line items with product ID, quantity, price, unit.
   - Calculates subtotal, delivery fee, discounts, and final total.
3. **Orders State (`orders`, `placeOrder`, `updateOrderStatus`, `adminAssignDriver`, `courierDeliver`)**:
   - Stores active and historical orders.
   - Optimistically updates UI immediately, then syncs to Supabase.
4. **Delivery & Zones (`deliveryZones`, `zoneById`, `activeZoneId`)**:
   - Supports Dairut town centers and surrounding villages (`custom-village` with name).
5. **Monthly Chronic Care (`careSubs`, `subscribeCare`, `refillMonthlyRx`)**:
   - Automated recurring prescriptions for elderly and chronic illness patients.
6. **Prescriptions (`rxRequests`, `submitRx`, `updateRxStatus`)**:
   - Image upload or camera capture of paper prescriptions.

### LocalStorage Keys:
- `bahbah_store_v1`: Main Zustand persisted slice (cart, customer info, user session).
- `bahbah_pending_orders_v1`: Offline order retry queue. Any order placed when network is down or Supabase is unreachable is stored here and flushed automatically on `online` event or app launch.

---

## 4. Supabase Integration & Realtime Sync

### 4.1 Database Tables:
- **`public.orders`**:
  - `id` (VARCHAR PK): Formatted as `BB-YYMMDD-XXXXXXXX` (e.g. `BB-261118-A7K2M9X4`).
  - `customer_id` (UUID nullable, references auth.users).
  - `customer_name` (VARCHAR): Customer full name.
  - `customer_phone` (VARCHAR): Normalized 11-digit Egyptian phone (`01xxxxxxxxx`).
  - `delivery_type` (VARCHAR): `'delivery' | 'pickup'`.
  - `zone_id` (VARCHAR): e.g. `'dairut-center'`, `'custom-village'`.
  - `address` (TEXT): Detailed delivery address.
  - `items` (JSONB): Array of `{ productId, title, qty, price, unit }`.
  - `total` (NUMERIC): Total amount in EGP.
  - `status` (VARCHAR): `'pending' | 'preparing' | 'shipping' | 'delivered' | 'cancelled'`.
  - `payment_method` (VARCHAR): `'cash' | 'instapay' | 'card'`.
  - `payment_status` (VARCHAR): Always `'unpaid'` upon creation; set to `'paid'` upon courier delivery.
  - `courier_id` (VARCHAR nullable): Assigned driver ID.
  - `created_at` (TIMESTAMPTZ).

- **`public.profiles`**:
  - `id` (UUID PK, references auth.users).
  - `role` (VARCHAR): `'customer' | 'admin' | 'pharmacist' | 'courier'`.
  - `phone` (VARCHAR), `full_name` (VARCHAR).

- **`public.rx_requests`**:
  - Prescription uploads, image URLs, notes, and verification statuses.

- **`public.products`**:
  - 1500+ pharmaceutical and personal care items with prices, categories, and stock flags.

### 4.2 Offline Queue & Idempotency:
- When a customer submits an order:
  1. An 8-character base-32 suffix is generated: `BB-YYMMDD-XXXXXXXX`.
  2. Order is saved to `orders` in Zustand store.
  3. Payload is appended to `bahbah_pending_orders_v1` in `localStorage`.
  4. `insertOrderToSupabase()` is executed.
  5. If the request succeeds or returns duplicate key error (`23505`), the order is removed from the pending queue.
  6. If network fails, the order remains in the pending queue. When network reconnects, `flushPendingOrders()` flushes the queue sequentially.

### 4.3 Safe Realtime Delta Merging (`mergeRemoteOrder` in `supabase-sync.ts`):
- When Supabase pushes an `UPDATE` event via WebSocket:
  - Do NOT overwrite immutable client-side details (e.g. pickup flag, address, items).
  - Only update mutable operations fields: `status`, `payment_status`, `delivery.driverId`, and `total`.
  - When `remote.courier_id` is null, the driver is safely unassigned.

---

## 5. Input Validation Rules (CRITICAL FOR AI)

1. **Egyptian Mobile Validation**:
   - Must use `normalizeEgPhone(raw)` from `src/components/bahbah/cart.tsx`.
   - Converts Arabic/Eastern Arabic digits (`٠١٢٣٤٥٦٧٨٩` / `۰۱۲۳۴۵۶۷۸۹`) to ASCII `0-9`.
   - Strips non-digits, converts international prefix (`+20` or `0020`) to leading `0`.
   - Validates against regex: `/^01[0125]\d{8}$/` (Exactly 11 digits starting with 010, 011, 012, or 015).
2. **Order ID Format**:
   - `generateOrderId()` format: `BB-YYMMDD-XXXXXXXX` where `XXXXXXXX` is 8 alphanumeric characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (crockford/base32 omitting ambiguous 0, O, 1, I, L).
3. **Cart Checkout Stepper (`src/components/bahbah/cart.tsx`)**:
   - Step 1: Customer details (Name, Egyptian Phone, Zone, Address).
   - Step 2: Payment method selection & delivery notes.
   - Step 3: Confirmation & Order ID display.

---

## 6. Development & Deployment Guidelines

- **Zero TypeScript Errors**: Always run `npx tsc --noEmit` before committing.
- **Next.js 16 Compatibility**: Client components must have `"use client"` at the very top.
- **Security / RLS**: Do NOT hardcode Supabase Service Role keys or passwords in code. Public client uses anonymous key with Row Level Security.
