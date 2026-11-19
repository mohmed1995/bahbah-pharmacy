-- =====================================================================
-- ترقية 2026-11-19 (5): البوابات + صلاحيات الطاقم + سلسلة حالات الطلب
-- تُشغَّل بعد security.sql و commerce.sql وكل ترقيات 2026-11-19 السابقة.
-- 1) جدول staff_permissions + دالة has_permission (المدير بيوزع الصلاحيات
--    من لوحة الإدارة — قسم «الطاقم والصلاحيات»).
-- 2) حالة طلب جديدة 'ready' (تم التجهيز): pending → ready → shipping →
--    delivered. أي قيد CHECK قديم على orders.status بيتلين عشان يشملها،
--    وحارس تحديث الطلبات بيتحدث بالخريطة الجديدة + فحص صلاحية «الطلبات».
-- 3) admin_set_price / admin_sync_catalog بقوا بيتطلبوا صلاحية «الأدوية».
-- =====================================================================

-- ---------- 1) صلاحيات الطاقم ----------
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

-- ---------- 2) حالة 'ready' على جدول الطلبات ----------
-- أي CHECK قديم على عمود status (من غير ready) بيتمسك ويتشال، وبعدين
-- بيتحط القيد الموحد. القيود اللي مش على status ما بتتلمسش.
do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and rel.relname = 'orders' and con.contype = 'c'
      and (pg_get_constraintdef(con.oid) ~ '(^|[^a-z_])status[[:space:]]+in'
           or pg_get_constraintdef(con.oid) ~ '(^|[^a-z_])status[[:space:]]*=')
      and pg_get_constraintdef(con.oid) not ilike '%ready%'
  loop
    execute format('alter table public.orders drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending','ready','shipping','delivered','cancelled'));

-- ---------- 3) حارس تحديث الطلبات (نسخة security.sql المحدثة) ----------
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

-- ---------- 4) أسعار/كتالوج: صلاحية «الأدوية» بدل فحص الدور الخام ----------
create or replace function public.admin_set_price(p_id text, p_price numeric)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission('medicines') then raise exception 'forbidden'; end if;
  if coalesce(p_id,'') = '' or p_price is null or p_price < 0 then raise exception 'bad_price'; end if;
  insert into public.products (id, price) values (p_id, p_price)
  on conflict (id) do update set price = excluded.price;
  update public.admin_settings
     set price_override = coalesce(price_override, '{}'::jsonb) || jsonb_build_object(p_id, p_price),
         updated_at = now()
   where id = 'global';
  return jsonb_build_object('id', p_id, 'price', p_price);
end $$;
revoke all on function public.admin_set_price(text, numeric) from public;
grant execute on function public.admin_set_price(text, numeric) to authenticated;

create or replace function public.admin_sync_catalog(p_items jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare it jsonb; v_price numeric; v_stock int; v_count int := 0;
begin
  if not public.has_permission('medicines') then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'bad_items'; end if;
  if jsonb_array_length(p_items) > 5000 then raise exception 'too_many_items'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    if coalesce(it->>'id','') = '' then continue; end if;
    v_price := public.try_numeric(it->>'price');
    if v_price is null or v_price < 0 then continue; end if;
    v_stock := case when (it->>'stock') ~ '^[0-9]{1,9}$' then (it->>'stock')::int end;
    insert into public.products (id, price, stock) values (it->>'id', v_price, v_stock)
    on conflict (id) do update
      set price = excluded.price,
          stock = coalesce(excluded.stock, public.products.stock);
    v_count := v_count + 1;
  end loop;
  return jsonb_build_object('synced', v_count);
end $$;
revoke all on function public.admin_sync_catalog(jsonb) from public;
grant execute on function public.admin_sync_catalog(jsonb) to authenticated;
