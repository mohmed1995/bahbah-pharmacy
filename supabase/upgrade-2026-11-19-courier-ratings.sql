-- =====================================================================
-- ترقية 2026-11-19 (13): تقييم المندوب + رسائل التواصل الجاهزة
-- تُشغَّل أخيرًا — بعد upgrade-2026-11-19-integrity-fixes.sql (وهي نفسها
-- بعد loyalty-quota و wiring-fixes و security-layer1 وكل ما قبلها).
--
-- طلب المالك (دفعة ما بعد التسليم — «زي الشركات الكبيرة بالظبط»):
--  1) تقييم المندوب بالاسم: بعد ما الطلب يبقى «تم التسليم»، العميل
--     يقيّم المندوب اللي وصّله (1–5 نجوم + تعليق اختياري) — تقييم
--     واحد بس لكل طلب، وبيتكتب في السيرفر الأول والتأكيد ما بيظهرش
--     غير بعد الحفظ الفعلي. البيانات في public.courier_ratings.
--  2) رسائل واتساب جاهزة للمناديب/الطاقم («أنا في الطريق» …) بيعدّلها
--     المدير من لوحة الإدارة — بتتخزن في admin_settings في عمود
--     courier_msg_templates وبتوصل لكل الواجهات من get_public_settings.
--
-- أمان التقييم: العميل ما يقدرش يقيّم غير طلبه هو اللي اتسلّم فعلًا —
-- دالة rating_order_allowed (security definer) بتطابق تليفون الجلسة
-- (customer_phone) مع تليفون الطلب ومع التليفون اللي في صف التقييم
-- نفسه، بمطابقة الأرقام/آخر 10 أرقام زي care_self_update بالظبط.
-- مفيش أي سياسة تعديل أو حذف للعميل: التقييم بيتكتب مرة وبيفضل.
-- الطاقم بيقرا الكل (لوحة الإدارة بتعرض متوسط كل مندوب وآخر تعليقاته).
-- =====================================================================

-- ---------- 1) مطابقة أرقام التليفون (نفس دلالات السلسلة) ----------
-- بتقارن بالأرقام بس: تطابق تام، أو تطابق آخر 10 أرقام لو الرقمين
-- ≥ 10 أرقام (عشان صيغ +20 / 0 / من غير مقدمة ما تكسرش المطابقة).
create or replace function public.phones_match(a text, b text) returns boolean
language sql immutable as $$
  select regexp_replace(coalesce(a, ''), '[^0-9]', '', 'g') <> ''
     and regexp_replace(coalesce(b, ''), '[^0-9]', '', 'g') <> ''
     and (
       regexp_replace(coalesce(a, ''), '[^0-9]', '', 'g')
         = regexp_replace(coalesce(b, ''), '[^0-9]', '', 'g')
       or (
         length(regexp_replace(coalesce(a, ''), '[^0-9]', '', 'g')) >= 10
         and length(regexp_replace(coalesce(b, ''), '[^0-9]', '', 'g')) >= 10
         and right(regexp_replace(coalesce(a, ''), '[^0-9]', '', 'g'), 10)
             = right(regexp_replace(coalesce(b, ''), '[^0-9]', '', 'g'), 10)
       )
     )
$$;

-- ---------- 2) جدول تقييمات المناديب ----------
create table if not exists public.courier_ratings (
  id text primary key,
  order_id text not null unique,
  courier_id text,
  courier_name text,
  customer_phone text not null,
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists courier_ratings_courier_idx
  on public.courier_ratings (courier_id, created_at desc);

create index if not exists courier_ratings_phone_idx
  on public.courier_ratings (customer_phone);

alter table public.courier_ratings enable row level security;

-- فحص الإدخال: الطلب لازم يكون موجود وحالته «delivered»، وتليفون
-- الجلسة يطابق تليفون الطلب، وتليفون صف التقييم يطابق تليفون الجلسة.
-- (security definer عشان تقرا orders — العميل مالوش SELECT عليها.)
create or replace function public.rating_order_allowed(
  p_order_id text, p_phone text
) returns boolean
language plpgsql security definer set search_path = public stable as $$
declare v_phone text := public.customer_phone();
begin
  if v_phone is null or v_phone = '' then return false; end if;
  if not public.phones_match(p_phone, v_phone) then return false; end if;
  return exists (
    select 1 from public.orders o
     where o.id = p_order_id
       and o.status = 'delivered'
       and public.phones_match(o.customer_phone, v_phone)
  );
end $$;
revoke all on function public.rating_order_allowed(text, text) from public;
revoke execute on function public.rating_order_allowed(text, text) from anon;
grant execute on function public.rating_order_allowed(text, text) to authenticated;

-- العميل يضيف تقييمه لطلبه المسلّم بس — مرة واحدة (order_id unique)
drop policy if exists cr_insert_own on public.courier_ratings;
create policy cr_insert_own on public.courier_ratings
  for insert to authenticated
  with check (
    stars between 1 and 5
    and public.rating_order_allowed(order_id, customer_phone)
  );

-- العميل يقرا تقييماته هو بس (عشان الواجهة تعرف إنه قيّم خلاص)
drop policy if exists cr_select_own on public.courier_ratings;
create policy cr_select_own on public.courier_ratings
  for select to authenticated
  using (public.phones_match(customer_phone, public.customer_phone()));

-- الطاقم يقرا الكل (متوسطات الإدارة + آخر التعليقات)
drop policy if exists cr_staff_select on public.courier_ratings;
create policy cr_staff_select on public.courier_ratings
  for select to authenticated
  using (public.is_staff());

-- مفيش سياسات update/delete أصلًا: التقييم ما بيتعدّلش ولا بيتمسح
-- من أي عميل — الكتابة مرة واحدة ونهائية.

-- ---------- 3) رسائل التواصل الجاهزة (إعدادات الأدمن) ----------
-- courier_msg_templates: قائمة رسائل واتساب جاهزة بيختار منها المندوب/
-- الموظف وهو بيكلم العميل. البذرة = الرسائل الافتراضية اللي طلبها
-- المالك، والمدير يقدر يعدّل/يضيف/يمسح من لوحة الإدارة (قسم المناديب).
alter table public.admin_settings
  add column if not exists courier_msg_templates jsonb
  default '["أنا في الطريق إليك دلوقتي", "قربت منك، دقايق وأكون عندك", "أنا وصلت وجاهز للتسليم"]'::jsonb;

update public.admin_settings
   set courier_msg_templates = '["أنا في الطريق إليك دلوقتي", "قربت منك، دقايق وأكون عندك", "أنا وصلت وجاهز للتسليم"]'::jsonb
 where id = 'global' and courier_msg_templates is null;

-- get_public_settings: نفس تعريف integrity-fixes (الأحدث) + المفتاح الجديد
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
    'img_override', v_row.img_override,
    'custom_drivers', v_row.custom_drivers,
    'driver_status', v_row.driver_status,
    'driver_removed', v_row.driver_removed,
    'courier_msg_templates', v_row.courier_msg_templates,
    'zone_disabled', v_row.zone_disabled,
    'offer_edits', v_row.offer_edits,
    'settings', v_row.settings,
    'updated_at', v_row.updated_at
  );
end $$;
revoke all on function public.get_public_settings() from public;
grant execute on function public.get_public_settings() to anon, authenticated;
