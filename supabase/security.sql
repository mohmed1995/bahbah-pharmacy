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

-- 4) admin_settings: قراءة عامة (محتوى الموقع) — كتابة للأدمن بس
create policy settings_read on public.admin_settings for select to anon, authenticated using (true);
create policy settings_admin_write on public.admin_settings for update to authenticated
  using (public.app_role()='admin') with check (public.app_role()='admin');

-- 5) تتبع الطلب للعميل بدون كشف باقي الطلبات: بيرجّع الحالة بس لرقم الطلب
create or replace function public.track_order(p_id text)
returns table(id text, status text, courier_id text, updated_at timestamptz)
language sql security definer set search_path = public as
$$ select o.id::text, o.status::text, o.courier_id::text, o.updated_at from public.orders o where o.id::text = p_id $$;
revoke all on function public.track_order(text) from public;
grant execute on function public.track_order(text) to anon, authenticated;

-- استرجاع قياسات المريض بأمان برقم الهاتف أو الكود الخاص به فقط
create or replace function public.get_patient_measurements(p_identifier text)
returns table(
  id text,
  patient_code text,
  patient_name text,
  patient_phone text,
  recorded_at timestamptz,
  blood_sugar numeric,
  sugar_timing text,
  systolic integer,
  diastolic integer,
  pulse integer,
  weight numeric,
  height numeric,
  bmi numeric,
  pharmacist_notes text,
  recorded_by text
)
language sql security definer set search_path = public as $$
  select
    m.id::text,
    m.patient_code::text,
    m.patient_name::text,
    m.patient_phone::text,
    m.recorded_at,
    m.blood_sugar,
    m.sugar_timing::text,
    m.systolic,
    m.diastolic,
    m.pulse,
    m.weight,
    m.height,
    m.bmi,
    m.pharmacist_notes::text,
    m.recorded_by::text
  from public.patient_measurements m
  where m.patient_phone = p_identifier or m.patient_code = p_identifier
  order by m.recorded_at desc;
$$;
revoke all on function public.get_patient_measurements(text) from public;
grant execute on function public.get_patient_measurements(text) to anon, authenticated;

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
