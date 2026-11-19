-- Bahbah Pharmacy — Row Level Security
-- شغّله في Supabase › SQL Editor. الدور الموثّق = app_metadata.role (admin | pharmacist | courier).
-- لإعطاء دور لموظف:
--   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email='...';
--   (للمندوب أضف "driverId":"dr-1")

-- 0) أسرار ما تتخزنش في جدول يقراه العامة
alter table public.admin_settings drop column if exists admin_pass;

-- 1) دوال مساعدة
create or replace function public.app_role() returns text
language sql stable as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'patient') $$;
create or replace function public.is_staff() returns boolean
language sql stable as $$ select public.app_role() in ('admin','pharmacist','courier') $$;
create or replace function public.driver_id() returns text
language sql stable as $$ select auth.jwt() -> 'app_metadata' ->> 'driverId' $$;

-- 1ب) صلاحيات الطاقم — المدير بيوزعها بنفسه من لوحة الإدارة (قسم «الطاقم والصلاحيات»).
--     صف لكل موظف (بإيميل حسابه في Supabase) و permissions jsonb بمفاتيح ثابتة:
--     orders / prescriptions / medicines / shortages / whatsapp_orders /
--     measurements / finances / settings / staff.
--     مفيش صف (أو مفتاح ناقص في الصف) = افتراض الدور، وهو سلوك ما قبل النظام:
--     الصيدلي بينفذ طلبات وروشتات وأدوية ونواقص وقياسات — من غير ماليات ولا
--     إعدادات ولا إدارة طاقم؛ والمندوب طلباته بس؛ والأدمن عنده الكل دايمًا.
create table if not exists public.staff_permissions (
  user_email text primary key,
  role text,
  permissions jsonb not null default '{}'::jsonb,
  updated_by text,
  updated_at timestamptz not null default now()
);
alter table public.staff_permissions enable row level security;
drop policy if exists staff_perm_admin_all on public.staff_permissions;
create policy staff_perm_admin_all on public.staff_permissions for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');
drop policy if exists staff_perm_self_read on public.staff_permissions;
create policy staff_perm_self_read on public.staff_permissions for select to authenticated
  using (lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

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
    return p in ('orders','prescriptions','medicines','shortages','whatsapp_orders','measurements');
  end if;
  return p = 'orders';
end $$;

alter table public.orders               enable row level security;
alter table public.rx_requests          enable row level security;
alter table public.care_subscriptions   enable row level security;
alter table public.patient_measurements enable row level security;
alter table public.admin_settings       enable row level security;

-- شيل أي سياسات قديمة مفتوحة
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies
           where schemaname='public' and tablename in ('orders','rx_requests','care_subscriptions','patient_measurements','admin_settings')
  loop execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename); end loop;
end $$;

-- 2) orders: العميل يضيف بس (من غير قراءة) — الطاقم يقرا — المندوب يعدّل طلباته بس
create policy orders_insert_public on public.orders for insert to anon, authenticated
  with check (
    status = 'pending' and payment_status = 'unpaid'
    and courier_id is null and pharmacist_id is null
    and coalesce(subtotal,0) >= 0 and coalesce(discount,0) >= 0 and coalesce(delivery_fee,0) >= 0
    and total >= 0
    and abs(total - (coalesce(subtotal,0) - coalesce(discount,0) + coalesce(delivery_fee,0))) < 0.01
  );
create policy orders_staff_select on public.orders for select to authenticated using (public.is_staff());
create policy orders_staff_update on public.orders for update to authenticated
  using (public.app_role() in ('admin','pharmacist') or (public.app_role()='courier' and courier_id = public.driver_id()))
  with check (public.app_role() in ('admin','pharmacist') or (public.app_role()='courier' and courier_id = public.driver_id()));
create policy orders_admin_delete on public.orders for delete to authenticated using (public.app_role()='admin');

-- 2b) [v6 — إصلاح C-3] حارس تحديث الطلبات: سياسات RLS تقدر تقيد "مين يعدّل أنهي صف"
--     لكن ما تقدرش تقيد "أنهي أعمدة" ولا انتقالات الحالة — فده بيتم بتريجر BEFORE UPDATE.
--     ملاحظات تصميم:
--     • auth.uid() فاضي = service_role / SQL Editor / Dashboard: قناة إدارة موثوقة برّه الحارس
--       (هي كمان الطريقة الوحيدة "لإحياء" طلب ملغي لو حصل خطأ بشري — الإلغاء نهائي من التطبيق).
--     • الأدمن يقدر يعدّل كل الحقول (تصحيح أسماء/عناوين/أصناف/أرقام) لكن بشرطين:
--       خريطة الانتقالات، واتساق الإجمالي لو أي رقم فلوس اتغيّر.
--     • تعيين/تغيير المندوب (courier_id) للأدمن بس (adminAssignDriver من بوابة الإدارة).
create or replace function public.guard_order_update() returns trigger
language plpgsql as $$
declare v_role text := public.app_role();
begin
  if auth.uid() is null then return new; end if;

  -- (ب) خريطة انتقالات الحالة لكل الطاقم: delivered و cancelled نهائيتين،
  --     ومفيش رجوع لورا (مفيش delivered→pending ولا أي إحياء لطلب ملغي).
  --     السلسلة: pending (جديد) → ready (تم التجهيز — الصيدلي) → shipping
  --     (المندوب استلم) → delivered (تم التسليم). pending→shipping لسه مسموح
  --     لطلبات اتعينت قبل ما خطوة التجهيز تبقى صريحة.
  if new.status is distinct from old.status then
    if v_role not in ('admin','pharmacist','courier') then
      raise exception 'order_update_forbidden_role';
    end if;
    /* صلاحية «الطلبات» اللي المدير وزعها: من غيرها مفيش تحريك حالة أصلًا */
    if v_role in ('pharmacist','courier') and not public.has_permission('orders') then
      raise exception 'permission_denied:orders';
    end if;
    if not (
      (old.status = 'pending'  and new.status in ('ready','shipping','cancelled')) or
      (old.status = 'ready'    and new.status in ('shipping','cancelled')) or
      (old.status = 'shipping' and new.status in ('delivered','cancelled'))
    ) then
      raise exception 'bad_status_transition:%->%', old.status, new.status;
    end if;
    -- تضييق حسب الدور: المندوب استلام وتسليم بس (ما يجهزش وما يلغيّش)،
    -- والصيدلي يلغي من pending بس (إلغاء طلب اتجهز/اتشحن قرار إدارة).
    if v_role = 'courier' and not (
      (old.status = 'pending'  and new.status = 'shipping') or
      (old.status = 'ready'    and new.status = 'shipping') or
      (old.status = 'shipping' and new.status = 'delivered')
    ) then
      raise exception 'courier_transition_forbidden';
    end if;
    if v_role = 'pharmacist' and new.status = 'cancelled' and old.status <> 'pending' then
      raise exception 'pharmacist_transition_forbidden';
    end if;
  end if;

  -- تعيين المندوب: أدمن بس
  if new.courier_id is distinct from old.courier_id and v_role <> 'admin' then
    raise exception 'courier_assign_admin_only';
  end if;
  -- ملحوظة: كان هنا فحص على عمود stock_decremented — اتشال لأنه مش موجود أصلًا
  -- في مخطط orders (لا في SQL المستودع ولا في نوع DbOrder عند العميل)، ومرجعيته
  -- في التريجر كانت هتكسر كل تحديث طلب بخطأ "record has no field".

  -- (أ) المندوب: ما يلمسش غير status — و payment_status بس عند التسليم (تحصيل الكاش).
  --     أي تعديل في فلوس/عميل/أصناف من حساب مندوب = رفض فوري.
  if v_role = 'courier' then
    if new.customer_name    is distinct from old.customer_name
       or new.customer_phone    is distinct from old.customer_phone
       or new.customer_address  is distinct from old.customer_address
       or new.customer_notes    is distinct from old.customer_notes
       or new.items             is distinct from old.items
       or new.subtotal          is distinct from old.subtotal
       or new.discount          is distinct from old.discount
       or new.delivery_fee      is distinct from old.delivery_fee
       or new.total             is distinct from old.total
       or new.payment_method    is distinct from old.payment_method
       or new.delivery_zone     is distinct from old.delivery_zone
       or new.pharmacist_id     is distinct from old.pharmacist_id
       or new.created_at        is distinct from old.created_at
    then
      raise exception 'courier_field_forbidden';
    end if;
    if new.payment_status is distinct from old.payment_status
       and not (old.payment_status = 'unpaid' and new.payment_status = 'paid' and new.status = 'delivered') then
      raise exception 'courier_payment_forbidden';
    end if;
  end if;

  -- (أ2) الصيدلي: يحرّك الحالة ويحصّل عند التسليم، لكن ما يعدّلش أرقام الفلوس
  --      ولا الأصناف ولا وسيلة الدفع. (adminAdvance عند الصيدلي بيبعت
  --      payment_status='paid' مع status='delivered' — فده مسموح بنفس قاعدة المندوب.)
  if v_role = 'pharmacist' then
    if new.subtotal       is distinct from old.subtotal
       or new.discount       is distinct from old.discount
       or new.delivery_fee   is distinct from old.delivery_fee
       or new.total          is distinct from old.total
       or new.payment_method is distinct from old.payment_method
       or new.items          is distinct from old.items
    then
      raise exception 'pharmacist_field_forbidden';
    end if;
    if new.payment_status is distinct from old.payment_status
       and not (old.payment_status = 'unpaid' and new.payment_status = 'paid' and new.status = 'delivered') then
      raise exception 'pharmacist_payment_forbidden';
    end if;
  end if;

  -- (ج) اتساق الإجمالي: لو أي رقم فلوس اتغيّر، لازم total = subtotal - discount + delivery_fee
  --     (نفس فحص سياسة الإدخال فوق). التعديلات اللي ما تلمسش الفلوس ما بتتفعلش عليها
  --     عشان صفوف قديمة غير متسقة أصلًا ما تمنعش تحديث حالة شرعي.
  if (new.subtotal is distinct from old.subtotal
      or new.discount is distinct from old.discount
      or new.delivery_fee is distinct from old.delivery_fee
      or new.total is distinct from old.total)
     and abs(coalesce(new.total,0) - (coalesce(new.subtotal,0) - coalesce(new.discount,0) + coalesce(new.delivery_fee,0))) >= 0.01
  then
    raise exception 'total_inconsistent';
  end if;

  return new;
end $$;
drop trigger if exists orders_guard_update on public.orders;
create trigger orders_guard_update before update on public.orders
  for each row execute function public.guard_order_update();

-- 2c) التحقق من courier_id عند الإدخال والتعديل:
--     مفيش جدول profiles في المخطط ده — هوية المندوب عايشة في app_metadata
--     (role='courier' + driverId)، وقيمة courier_id في الطلبات هي الـ driverId نفسه
--     (زي 'dr-1')، فمفيش مرجع جدولي يتعمل عليه FK. التحقق القابل للتنفيذ هنا:
--     • صيغة سليمة دايمًا (نفس صيغة place_order).
--     • التعيين/التغيير لطاقم غير الأدمن ممنوع (بيتأكد هنا كمان، دفاعًا في العمق
--       مع قاعدة الحارس فوق — والتعيين من الواجهة أصلًا شغل adminAssignDriver).
--     • الإدخال المباشر من العامة مقيد بسياسة الإدخال (courier_id لازم null)،
--       والطلبات الحقيقية بتيجي من place_order اللي بيتحقق من الصيغة بنفسه.
create or replace function public.validate_order_courier() returns trigger
language plpgsql as $$
begin
  if new.courier_id is not null and new.courier_id !~ '^[A-Za-z0-9_-]{1,30}$' then
    raise exception 'bad_courier_id';
  end if;
  if tg_op = 'UPDATE' and new.courier_id is distinct from old.courier_id
     and auth.uid() is not null and public.app_role() <> 'admin' then
    raise exception 'courier_assign_admin_only';
  end if;
  return new;
end $$;
drop trigger if exists orders_validate_courier on public.orders;
create trigger orders_validate_courier before insert or update on public.orders
  for each row execute function public.validate_order_courier();

-- 3) rx / care / measurements: إدخال عام — قراءة وتعديل للطاقم
create policy rx_insert_public on public.rx_requests for insert to anon, authenticated with check (status = 'new');
create policy rx_staff_select on public.rx_requests for select to authenticated using (public.is_staff());
create policy rx_staff_update on public.rx_requests for update to authenticated
  using (public.app_role() in ('admin','pharmacist')) with check (public.app_role() in ('admin','pharmacist'));

create policy care_insert_public on public.care_subscriptions for insert to anon, authenticated with check (coalesce(status,'active') = 'active');
create policy care_staff_select on public.care_subscriptions for select to authenticated using (public.is_staff());
create policy care_staff_update on public.care_subscriptions for update to authenticated
  using (public.app_role() in ('admin','pharmacist')) with check (public.app_role() in ('admin','pharmacist'));

-- القياسات بيانات طبية: الإدخال للصيدلي/الإدارة بس
create policy meas_staff_all on public.patient_measurements for all to authenticated
  using (public.app_role() in ('admin','pharmacist')) with check (public.app_role() in ('admin','pharmacist'));

-- 4) admin_settings: القراءة المباشرة للطاقم بس — كتابة للأدمن بس.
--    ضمان وجود الجدول وعمود settings في أي مشروع: الإنشاء الأصلي كان في
--    سكربتات قديمة اتشالت من المستودع، فمن غير الجزء ده أي مشروع جديد
--    (أو إعادة بناء) هيلاقي الجدول/العمود ناقصين والمزامنة هتفشل بصمت.
--    على المشروع الحي الجزء ده no-op (الجدول موجود أصلًا).
create table if not exists public.admin_settings (
  id text primary key default 'global',
  admin_pass text,
  site_edits jsonb default '{}'::jsonb,
  ad_edits jsonb default '{}'::jsonb,
  care_edits jsonb default '{}'::jsonb,
  zone_edits jsonb default '{}'::jsonb,
  ads_off jsonb default '[]'::jsonb,
  stock_adj jsonb default '{}'::jsonb,
  price_override jsonb default '{}'::jsonb,
  custom_products jsonb default '[]'::jsonb,
  coupons jsonb default '[]'::jsonb,
  settings jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);
alter table public.admin_settings add column if not exists settings jsonb default '{}'::jsonb;
alter table public.admin_settings enable row level security;
insert into public.admin_settings (id) values ('global') on conflict (id) do nothing;
--    [v6] سياسة using(true) القديمة كانت بتكشف الصف كله: RLS بيقيّد الصفوف مش
--    الأعمدة، فأي زائر يقدر يطلب select * ويقرا أي عمود داخلي في الصف (حاليًا أو
--    يضاف مستقبلًا). الواجهة العامة تاخد المفاتيح الآمنة بس من get_public_settings().
create policy settings_staff_read on public.admin_settings for select to authenticated using (public.is_staff());
create policy settings_admin_write on public.admin_settings for update to authenticated
  using (public.app_role()='admin') with check (public.app_role()='admin');

-- المفاتيح الآمنة للعرض العام فقط — نفس الأعمدة اللي الواجهة بتقراها فعلًا
-- (PUBLIC_SETTINGS_COLUMNS في supabase-sync)، من غير أي مفاتيح داخلية.
-- ملحوظة لمسار العميل: الاستعلام الابتدائي للإعدادات يتحوّل لـ rpc('get_public_settings')
-- بنفس شكل الصف، وقناة realtime على الجدول هتفضل توصل للطاقم بس بعد تضييق السياسة.
-- (رسوم المناطق وحد الشحن المجاني عايشين في delivery_zones / shop_settings —
--  جداول أحادية الغرض بسياسات قراءة عامة آمنة في commerce.sql.)
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

-- 5) تتبع الطلب للعميل بدون كشف باقي الطلبات: بيرجّع الحالة بس لرقم الطلب
create or replace function public.track_order(p_id text)
returns table(id text, status text, courier_id text, updated_at timestamptz)
language sql security definer set search_path = public as
$$ select o.id::text, o.status::text, o.courier_id::text, o.updated_at from public.orders o where o.id::text = p_id $$;
revoke all on function public.track_order(text) from public;
grant execute on function public.track_order(text) to anon, authenticated;

-- 5ب) قياسات المريض بكوده الشخصي بس: بوابة «قياساتي» كانت بتقرا الجدول كله
--     وده ممنوع بسياسة meas_staff_all (القياسات بيانات طبية). الكود الشخصي
--     هو وسيلة الوصول (بيتسلم للمريض مطبوع على كارت القياس) — مطابقة تامة
--     بعد تجاهل المسافات والشرطات، ومن غير أي بحث برقم التليفون أو مطابقة
--     جزئية عشان ما حدش يقدر يعدّد قياسات غيره.
create or replace function public.get_measurements_for_patient(p_code text)
returns setof public.patient_measurements
language sql security definer set search_path = public stable as
$$ select m.* from public.patient_measurements m
   where length(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g')) >= 4
     and lower(regexp_replace(m.patient_code, '[\s-]', '', 'g'))
       = lower(regexp_replace(p_code, '[\s-]', '', 'g'))
   order by m.recorded_at desc
   limit 200 $$;
revoke all on function public.get_measurements_for_patient(text) from public;
grant execute on function public.get_measurements_for_patient(text) to anon, authenticated;

-- 6) تسجيل جديد: ماحدش يقدر يحط role في app_metadata من العميل (Supabase بيمنع ده أصلًا)،
--    لكن اقفل تسجيل المستخدمين العاديين لو مش محتاجه: Auth › Providers › Email › Disable sign ups.
--
-- ملاحظة: أسعار الطلب لسه بتتحسب في المتصفح؛ الـ check فوق بيتأكد من اتساق الحسابات بس.
-- التحقق الكامل من الأسعار محتاج جدول products في القاعدة + دالة place_order.

-- 7) بصمة الجهاز للعملاء (WebAuthn) — كل جهاز مربوط بحساب Supabase صاحبه
--    مطلوب: Authentication › Sign In / Providers › فعّل "Allow anonymous sign-ins"
create table if not exists public.patient_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  credential_id text not null unique,
  name text, phone text,
  created_at timestamptz not null default now()
);
alter table public.patient_devices enable row level security;
drop policy if exists devices_owner on public.patient_devices;
create policy devices_owner on public.patient_devices for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
