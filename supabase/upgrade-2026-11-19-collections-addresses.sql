-- =====================================================================
-- ترقية 2026-11-19 (6): تحصيل المندوب والتوريد + دفتر عناوين العميل ودبوس الموقع
-- تُشغَّل بعد security.sql و commerce.sql وكل ترقيات 2026-11-19 السابقة
-- (آخرها upgrade-2026-11-19-portals-permissions.sql).
-- 1) جدول courier_collections: المندوب بيسجّل عند التسليم هو حصّل كام
--    وإزاي (كاش / محفظة إلكترونية / تحويل بنكي) — القراءة للمدير بس
--    (أدمن أو صلاحية «الماليات»)، والصيدلي ما يشوفش أي مبلغ لا في
--    الواجهة ولا من الـ API.
-- 2) جدول customer_addresses: دفتر عناوين العميل (اسم/نص/دبوس موقع/
--    افتراضي) مربوط برقم تليفونه — العميل يدير عناوينه بس، والطاقم
--    يقراها عشان التوصيل.
-- 3) عمودا customer_lat / customer_lng على الطلبات + تحديث place_order
--    وحارس تحديث الطلبات عشان الدبوس يوصل للمندوب وما يتعدّلش من الطاقم.
-- =====================================================================

-- ---------- 1) تحصيل المندوب (التوريد) ----------
create table if not exists public.courier_collections (
  id text primary key,
  order_id text not null,
  courier_id text,
  courier_email text,
  courier_name text,
  amount numeric not null check (amount >= 0),
  method text not null check (method in ('cash', 'wallet', 'bank')),
  wallet_from text,
  wallet_to text,
  note text,
  created_at timestamptz not null default now(),
  /* المحفظة لازم يبقى معروف اتحولت منين ولفين — ده أصل تتبع التوريد */
  constraint courier_collections_wallet_fields
    check (method <> 'wallet'
           or (coalesce(wallet_from, '') <> '' and coalesce(wallet_to, '') <> ''))
);
create index if not exists courier_collections_created_idx
  on public.courier_collections (created_at desc);
create index if not exists courier_collections_courier_idx
  on public.courier_collections (courier_id, created_at desc);

alter table public.courier_collections enable row level security;

-- المندوب يضيف تحصيلاته هو بس (driverId من التوكن الموثّق، مش من العميل)
drop policy if exists collections_courier_insert on public.courier_collections;
create policy collections_courier_insert on public.courier_collections
  for insert to authenticated
  with check (
    public.app_role() = 'courier'
    and courier_id = public.driver_id()
    and public.has_permission('orders')
  );

-- القراءة: المدير بس — أدمن دايمًا، أو أي موظف واخد صلاحية «الماليات» من المدير.
-- الصيدلي بصلاحياته الافتراضية (من غير ماليات) مش هيوصله أي صف.
drop policy if exists collections_finance_select on public.courier_collections;
create policy collections_finance_select on public.courier_collections
  for select to authenticated
  using (public.app_role() = 'admin' or public.has_permission('finances'));

-- تعديل/حذف سجل تحصيل (تصحيح خطأ) للأدمن بس — السجل أصلًا ثابت بعد كتابته
drop policy if exists collections_admin_all on public.courier_collections;
create policy collections_admin_all on public.courier_collections
  for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- تنبيه المدير اللحظي عند تسجيل تحصيل جديد (نفس قنوات الطلبات)
do $$
begin
  alter publication supabase_realtime add table public.courier_collections;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- ---------- 2) دفتر عناوين العميل ----------
-- هوية العميل من التوكن: رقم التليفون من user_metadata، أو الجزء اللي
-- قبل @ في إيميل الحساب (حسابات العملاء بتتعمل بصيغة phone@bahbah.eg).
create or replace function public.customer_phone() returns text
language sql stable as $$
  select coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'phone', ''),
    split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1)
  )
$$;

create table if not exists public.customer_addresses (
  id text primary key,
  customer_phone text not null,
  label text not null,
  address_text text not null,
  city text,
  lat numeric,
  lng numeric,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_addresses_phone_idx
  on public.customer_addresses (customer_phone, created_at desc);

alter table public.customer_addresses enable row level security;

-- العميل يدير عناوينه هو بس (إضافة/قراءة/تعديل/حذف)
drop policy if exists addresses_owner_all on public.customer_addresses;
create policy addresses_owner_all on public.customer_addresses
  for all to authenticated
  using (customer_phone = public.customer_phone() and public.customer_phone() <> '')
  with check (customer_phone = public.customer_phone() and public.customer_phone() <> '');

-- الطاقم يقرا العناوين عشان التوصيل (الصيدلي/المندوب/المدير)
drop policy if exists addresses_staff_select on public.customer_addresses;
create policy addresses_staff_select on public.customer_addresses
  for select to authenticated using (public.is_staff());

-- ---------- 3) دبوس الموقع على الطلب ----------
alter table public.orders
  add column if not exists customer_lat numeric;
alter table public.orders
  add column if not exists customer_lng numeric;

-- place_order: نفس نسخة ترقية التغليف الخاص (vodafone + discreet) +
-- حفظ دبوس الموقع لو العميل حدّده (قيم برّه النطاق الجغرافي بتتجاهل).
create or replace function public.place_order(p jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id text := left(coalesce(p->>'id',''), 40);
  v_type text := coalesce(p->>'deliveryType','delivery');
  v_pay text := coalesce(p->>'payment','cod');
  v_phone text := left(coalesce(p->>'phone',''), 30);
  v_items jsonb := '[]'::jsonb;
  it jsonb; v_pid text; v_qty int; v_price numeric; v_stock int;
  v_sub numeric := 0; v_disc numeric := 0; v_fee numeric := 0; v_total numeric;
  v_set public.admin_settings%rowtype;
  v_zone text := p->>'zoneId'; v_zfee numeric; v_extra numeric := 0;
  v_free numeric; v_code text := upper(coalesce(p->>'coupon',''));
  v_cpct numeric; v_cmin numeric; v_exist public.orders%rowtype;
  v_discreet boolean := coalesce(p->>'discreetPackaging','false')::boolean;
  v_lat numeric := public.try_numeric(p->>'lat');
  v_lng numeric := public.try_numeric(p->>'lng');
begin
  if v_lat is not null and (v_lat < -90 or v_lat > 90) then v_lat := null; end if;
  if v_lng is not null and (v_lng < -180 or v_lng > 180) then v_lng := null; end if;
  if (v_lat is null) <> (v_lng is null) then v_lat := null; v_lng := null; end if;

  if v_id !~ '^[A-Za-z0-9-]{6,40}$' then raise exception 'bad_order_id'; end if;
  if v_type not in ('delivery','pickup') then raise exception 'bad_delivery_type'; end if;
  if v_pay not in ('cod','instapay','card','vodafone') then raise exception 'bad_payment'; end if;
  if char_length(regexp_replace(v_phone,'\s','','g')) < 8 then raise exception 'bad_phone'; end if;
  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') not between 1 and 60 then
    raise exception 'bad_items';
  end if;

  -- idempotent: نفس الرقم مرتين = نفس النتيجة
  select * into v_exist from public.orders where id = v_id;
  if found then
    return jsonb_build_object('id', v_exist.id, 'subtotal', v_exist.subtotal, 'discount', v_exist.discount,
                              'delivery_fee', v_exist.delivery_fee, 'total', v_exist.total, 'duplicate', true);
  end if;

  select * into v_set from public.admin_settings where id = 'global';

  for it in select * from jsonb_array_elements(p->'items') loop
    v_pid := it->>'productId';
    if coalesce(it->>'qty','') !~ '^[0-9]{1,3}$' then raise exception 'bad_qty'; end if;
    v_qty := (it->>'qty')::int;
    if v_qty < 1 or v_qty > 99 then raise exception 'bad_qty'; end if;

    -- السعر: تعديل الأدمن ← منتج أضافه الأدمن ← جدول products
    v_price := null;
    if v_set.price_override ? v_pid then v_price := public.try_numeric(v_set.price_override ->> v_pid); end if;
    if v_price is null and jsonb_typeof(v_set.custom_products) = 'array' then
      select public.try_numeric(e->>'price') into v_price
      from jsonb_array_elements(v_set.custom_products) e where e->>'id' = v_pid limit 1;
    end if;
    if v_price is null then select price into v_price from public.products where id = v_pid; end if;
    if v_price is null or v_price < 0 then raise exception 'unknown_product:%', v_pid; end if;

    -- [v6 — C-2] المخزون: اقفل صف المنتج، ولو مخزونه متعقّب لازم يكفي واخصم فورًا
    select stock into v_stock from public.products where id = v_pid for update;
    if found and v_stock is not null then
      if v_stock < v_qty then raise exception 'out_of_stock:%', v_pid; end if;
      update public.products set stock = stock - v_qty where id = v_pid;
    end if;

    v_sub := v_sub + v_price * v_qty;
    v_items := v_items || jsonb_build_object(
      'productId', v_pid, 'qty', v_qty, 'price', v_price,
      'nameAr', left(coalesce(it->>'nameAr', v_pid), 200), 'nameEn', left(coalesce(it->>'nameEn', v_pid), 200));
  end loop;

  -- الكوبون: من إعدادات الأدمن، أو الافتراضيين لو لسه ما اتعدّلوش
  if v_code <> '' then
    if jsonb_typeof(v_set.coupons) = 'array' and jsonb_array_length(v_set.coupons) > 0 then
      select public.try_numeric(c->>'percent'), public.try_numeric(c->>'minTotal') into v_cpct, v_cmin
      from jsonb_array_elements(v_set.coupons) c
      where upper(c->>'code') = v_code and coalesce((c->>'active')::boolean, false) limit 1;
    else
      select x.pct, x.mn into v_cpct, v_cmin from (values
        ('BAHBAH10',10,200),('BAHBAH20',20,500),('DEIROUT15',15,300)) as x(code,pct,mn) where x.code = v_code;
    end if;
    if v_cpct is not null and v_sub >= v_cmin then v_disc := round(v_sub * v_cpct / 100); end if;
  end if;

  -- التوصيل (الاستلام مجاني، والحد المجاني عام من الإعدادات)
  if v_type = 'delivery' then
    select fee into v_zfee from public.delivery_zones where id = v_zone;
    if v_zfee is null then raise exception 'bad_zone'; end if;
    if jsonb_typeof(v_set.zone_edits) = 'object' and (v_set.zone_edits -> v_zone ->> 'fee') is not null then
      v_zfee := coalesce(public.try_numeric(v_set.zone_edits -> v_zone ->> 'fee'), v_zfee);
    end if;
    select extra_fee into v_extra from public.delivery_slots where id = p->>'slotId';
    v_extra := coalesce(v_extra, 0);
    select free_threshold into v_free from public.shop_settings where id = 'global';
    v_fee := case when coalesce(v_free,0) > 0 and v_sub >= v_free then 0 else v_zfee end + v_extra;
  end if;

  v_total := greatest(0, v_sub - v_disc) + v_fee;

  insert into public.orders (id, customer_name, customer_phone, customer_address, customer_notes, items,
    subtotal, discount, delivery_fee, total, payment_method, status, payment_status,
    delivery_zone, courier_id, pharmacist_id, discreet_packaging, customer_lat, customer_lng,
    created_at, updated_at)
  values (v_id, left(coalesce(p->>'name',''),120), v_phone, left(coalesce(p->>'address',''),400),
    case when v_disc > 0 then 'Coupon: ' || v_code else '' end, v_items,
    v_sub, v_disc, v_fee, v_total, v_pay, 'pending', 'unpaid',
    case when v_type = 'delivery' then v_zone end,
    case when coalesce(p->>'driverId','') ~ '^[A-Za-z0-9_-]{1,30}$' then p->>'driverId' end,
    null, v_discreet, v_lat, v_lng, now(), now());

  return jsonb_build_object('id', v_id, 'subtotal', v_sub, 'discount', v_disc,
                            'delivery_fee', v_fee, 'total', v_total, 'duplicate', false);
end $$;
revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;

-- حارس تحديث الطلبات: نفس نسخة ترقية البوابات والصلاحيات + عمودا الدبوس
-- بينضموا لقوائم الحقول الممنوعة على المندوب والصيدلي (العنوان والدبوس
-- بيانات عميل — الطاقم يحرّك الحالة بس).
create or replace function public.guard_order_update() returns trigger
language plpgsql as $$
declare v_role text := public.app_role();
begin
  if auth.uid() is null then return new; end if;

  if new.status is distinct from old.status then
    if v_role not in ('admin','pharmacist','courier') then
      raise exception 'order_update_forbidden_role';
    end if;
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

  if new.courier_id is distinct from old.courier_id and v_role <> 'admin' then
    raise exception 'courier_assign_admin_only';
  end if;

  if v_role = 'courier' then
    if new.customer_name    is distinct from old.customer_name
       or new.customer_phone    is distinct from old.customer_phone
       or new.customer_address  is distinct from old.customer_address
       or new.customer_lat      is distinct from old.customer_lat
       or new.customer_lng      is distinct from old.customer_lng
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

  if v_role = 'pharmacist' then
    if new.subtotal       is distinct from old.subtotal
       or new.discount       is distinct from old.discount
       or new.delivery_fee   is distinct from old.delivery_fee
       or new.total          is distinct from old.total
       or new.payment_method is distinct from old.payment_method
       or new.items          is distinct from old.items
       or new.customer_lat   is distinct from old.customer_lat
       or new.customer_lng   is distinct from old.customer_lng
    then
      raise exception 'pharmacist_field_forbidden';
    end if;
    if new.payment_status is distinct from old.payment_status
       and not (old.payment_status = 'unpaid' and new.payment_status = 'paid' and new.status = 'delivered') then
      raise exception 'pharmacist_payment_forbidden';
    end if;
  end if;

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
