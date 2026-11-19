-- =====================================================================
-- ترقية 2026-11-19: الخدمات التمريضية المنزلية («خدمات تمريضية»)
-- ترتيب التشغيل: تُشغَّل بعد security.sql و commerce.sql وكل ترقيات
-- 2026-11-19 السابقة بهذا الترتيب:
--   upgrade-2026-11-19.sql
--   upgrade-2026-11-19-whatsapp-orders.sql
--   upgrade-2026-11-19-warehouse-sync.sql
--   upgrade-2026-11-19-shortage-requests.sql
--   upgrade-2026-11-19-portals-permissions.sql
--   upgrade-2026-11-19-collections-addresses.sql
--   upgrade-2026-11-19-free-shipping-campaign.sql
--   upgrade-2026-11-19-loyalty-points.sql
--   upgrade-2026-11-19-nursing-services.sql  ← (هذا الملف)
--
-- العميل بيحجز خدمة تمريض منزلية من زرار «خدمات تمريضية» في الواجهة
-- (قياس سكر / قياس ضغط / حقن / كانيولا ومحاليل / غيار جروح). الحجز
-- بيتسجل هنا الأول بكود تتبع BH-XXXX وبرقم تليفون العميل (بيتربط
-- بملفه الموحد)، والدفع كاش عند الزيارة. الطاقم بيشوف الحجوزات في
-- قائمة «طلبات التمريض» وبيحرّكها: جديد → تم التأكيد → تمت الزيارة
-- (أو ملغي). قياسات السكر/الضغط اللي بتتسجل عند إتمام الزيارة بتروح
-- كمان لجدول patient_measurements فتظهر في «قياساتي» والملف الموحد.
-- أسعار الخدمات بتتعدل من لوحة الإدارة وبتتخزن في admin_settings
-- (عمود nursing_edits الجديد — نفس آلية care_edits/zone_edits).
-- =====================================================================

-- ---------- 1) بيانات الخدمات في إعدادات الأدمن ----------
-- nursing_edits: تعديلات الإدارة على الخدمات الأساسية (اسم/وصف/سعر/تفعيل).
-- nursing_custom: خدمات أضافها المدير بنفسه بالكامل من لوحة الإدارة.
alter table public.admin_settings
  add column if not exists nursing_edits jsonb default '{}'::jsonb;
alter table public.admin_settings
  add column if not exists nursing_custom jsonb default '[]'::jsonb;

-- إعادة تعريف get_public_settings عشان تشمل nursing_edits (الأسعار
-- لازم توصل لواجهة العميل العامة زي care_edits بالظبط).
create or replace function public.get_public_settings()
returns jsonb
language plpgsql security definer set search_path = public stable as $$
declare v_row public.admin_settings%rowtype;
begin
  select * into v_row from public.admin_settings where id = 'global';
  if not found then return '{}'::jsonb; end if;
  return jsonb_build_object(
    'id', v_row.id,
    'site_edits', v_row.site_edits,
    'ad_edits', v_row.ad_edits,
    'care_edits', v_row.care_edits,
    'zone_edits', v_row.zone_edits,
    'nursing_edits', v_row.nursing_edits,
    'nursing_custom', v_row.nursing_custom,
    'ads_off', v_row.ads_off,
    'stock_adj', v_row.stock_adj,
    'price_override', v_row.price_override,
    'custom_products', v_row.custom_products,
    'coupons', v_row.coupons,
    'settings', v_row.settings,
    'updated_at', v_row.updated_at
  );
end $$;
revoke all on function public.get_public_settings() from public;
grant execute on function public.get_public_settings() to anon, authenticated;

-- ---------- 2) صلاحية «التمريض» في افتراضات الأدوار ----------
-- نفس دالة upgrade-2026-11-19-portals-permissions مع إضافة 'nursing'
-- لافتراضات الصيدلي (المدير يقدر يوزعها/يقفلها من «الطاقم والصلاحيات»).
create or replace function public.has_permission(p text) returns boolean
language plpgsql stable as $$
declare v_role text := public.app_role(); v_val boolean;
begin
  if v_role = 'admin' then return true; end if;
  if v_role not in ('pharmacist','courier') then return false; end if;
  select (permissions ->> p)::boolean into v_val
    from public.staff_permissions
   where lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''));
  if v_val is not null then return v_val; end if;
  /* افتراضات الدور (سلوك ما قبل نظام الصلاحيات) */
  if v_role = 'pharmacist' then
    return p in ('orders','prescriptions','medicines','shortages','whatsapp_orders','measurements','nursing');
  end if;
  return p = 'orders';
end $$;

-- ---------- 3) جدول حجوزات التمريض ----------
create table if not exists public.nursing_requests (
  id text primary key,
  code text not null unique,
  customer_phone text,
  customer_name text,
  service_id text not null,
  service_name_ar text not null,
  service_name_en text,
  service_kind text not null default 'other' check (service_kind in ('sugar', 'bp', 'other')),
  service_price numeric not null default 0,
  visit_fee numeric not null default 0,
  total numeric not null default 0,
  zone_id text,
  address text,
  preferred_at text,
  notes text,
  status text not null default 'new' check (status in ('new', 'confirmed', 'done', 'cancelled')),
  measured_sugar numeric,
  measured_systolic integer,
  measured_diastolic integer,
  measurement_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nursing_requests_created_idx
  on public.nursing_requests (created_at desc);

create index if not exists nursing_requests_phone_idx
  on public.nursing_requests (customer_phone);

alter table public.nursing_requests enable row level security;

-- العميل يضيف بس وبحالة 'new' — الطاقم (بصلاحية التمريض) يقرا ويعدّل
-- (نفس نمط shortage_requests/whatsapp_orders + قيد الصلاحية الموزعة).
drop policy if exists nr_insert_public on public.nursing_requests;
create policy nr_insert_public on public.nursing_requests
  for insert to anon, authenticated
  with check (status = 'new' and length(trim(service_name_ar)) > 0);

drop policy if exists nr_staff_select on public.nursing_requests;
create policy nr_staff_select on public.nursing_requests
  for select to authenticated
  using (public.is_staff() and public.has_permission('nursing'));

drop policy if exists nr_staff_update on public.nursing_requests;
create policy nr_staff_update on public.nursing_requests
  for update to authenticated
  using (public.is_staff() and public.has_permission('nursing'))
  with check (public.is_staff() and public.has_permission('nursing'));
