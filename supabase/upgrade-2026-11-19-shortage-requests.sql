-- =====================================================================
-- ترقية 2026-11-19 (3): طلبات النواقص («طلب ناقص»)
-- تُشغَّل بعد security.sql و commerce.sql و upgrade-2026-11-19.sql
-- و upgrade-2026-11-19-whatsapp-orders.sql.
-- الزبون بيطلب دوا ناقص من زرار «طلب ناقص» (كتابة الاسم / مسح باركود /
-- رفع صورة العلبة أو الروشتة) أو من زرار «طلب» جنب صنف «غير متوفر».
-- الطلب بيتسجل هنا الأول بكود تتبع BH-XXXX وبرقم تليفون الزبون (بيتربط
-- بملفه الموحد)، وبعدين واتساب بيفتح بالكود. الصيدلي بيشوف الطلبات في
-- قائمة «طلبات النواقص» ويقدر يعلّمها «بقى متوفر» ويرد على الزبون
-- بواتساب «الدوا وصل»، أو يحوّلها لطلب / يقفلها.
-- صورة العلبة/الروشتة بتترفع على نفس باكت الروشتات (rx-prescriptions)
-- وبيتخزن رابطها العام في photo_url.
-- =====================================================================

create table if not exists public.shortage_requests (
  id text primary key,
  code text not null unique,
  customer_phone text,
  customer_name text,
  item_name text not null,
  barcode text,
  photo_url text,
  source text not null default 'manual' check (source in ('manual', 'barcode', 'photo', 'product')),
  status text not null default 'pending' check (status in ('pending', 'available', 'notified', 'converted', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shortage_requests_created_idx
  on public.shortage_requests (created_at desc);

create index if not exists shortage_requests_phone_idx
  on public.shortage_requests (customer_phone);

alter table public.shortage_requests enable row level security;

-- الزبون يضيف بس وبحالة 'pending' — الطاقم يقرا ويعدّل (نفس نمط whatsapp_orders)
drop policy if exists sr_insert_public on public.shortage_requests;
create policy sr_insert_public on public.shortage_requests
  for insert to anon, authenticated
  with check (status = 'pending' and length(trim(item_name)) > 0);

drop policy if exists sr_staff_select on public.shortage_requests;
create policy sr_staff_select on public.shortage_requests
  for select to authenticated using (public.is_staff());

drop policy if exists sr_staff_update on public.shortage_requests;
create policy sr_staff_update on public.shortage_requests
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
