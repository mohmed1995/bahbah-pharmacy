-- =====================================================================
-- ترقية 2026-11-19 (2): طلبات الواتساب السريعة مع كود تتبع
-- تُشغَّل بعد security.sql و commerce.sql و upgrade-2026-11-19.sql.
-- العميل بيطلب من زرار «طلب سريع بواتساب» — الطلب بيتسجل هنا الأول
-- بكود BH-XXXX، وبعدين واتساب بيفتح بالكود، فالطاقم يقدر يطابق
-- الرسالة الواصلة بسجلها ويعلّمها «اتحولت لطلب» أو «تم».
-- =====================================================================

create table if not exists public.whatsapp_orders (
  id text primary key,
  code text not null unique,
  customer_phone text,
  customer_name text,
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  status text not null default 'sent' check (status in ('sent', 'converted', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_orders_created_idx
  on public.whatsapp_orders (created_at desc);

alter table public.whatsapp_orders enable row level security;

-- العميل يضيف بس وبحالة 'sent' — الطاقم يقرا ويعدّل (نفس نمط rx_requests)
drop policy if exists wa_insert_public on public.whatsapp_orders;
create policy wa_insert_public on public.whatsapp_orders
  for insert to anon, authenticated
  with check (status = 'sent' and coalesce(total, 0) >= 0);

drop policy if exists wa_staff_select on public.whatsapp_orders;
create policy wa_staff_select on public.whatsapp_orders
  for select to authenticated using (public.is_staff());

drop policy if exists wa_staff_update on public.whatsapp_orders;
create policy wa_staff_update on public.whatsapp_orders
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
