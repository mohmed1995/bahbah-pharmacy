-- =====================================================================
-- ترقية 2026-11-19 (7): نقاط الولاء ومستويات العميل («مستويات العميل»)
-- تُشغَّل بعد security.sql و commerce.sql وكل ترقيات 2026-11-19 السابقة
-- (آخرها upgrade-2026-11-19-free-shipping-campaign.sql — نسخة place_order
-- هنا مبنية على نسخة حملة التوصيل المجاني، فلازم تيجي بعدها).
--
-- 1) حساب ولاء لكل عميل مربوط برقم تليفونه (نفس هوية customer_addresses):
--    الرصيد بيبدأ من صفر، وحساب جديد بياخد 50 نقطة ترحيبية مرة واحدة بس
--    (سجل دفتري بمعرّف حتمي + فهرس فريد = التكرار مستحيل حتى مع إعادة
--    المحاولات أو إعادة التسجيل).
-- 2) الكسب: نقطة لكل «loyaltyEarnEgpPerPoint» جنيه (افتراضي 10) من إجمالي
--    أي طلب اتسلّم — بيتحسب على السيرفر بـ trigger عند التسليم، ومرة
--    واحدة لكل طلب (فهرس فريد على رقم الطلب في الدفتر).
-- 3) المستويات بيانات إعدادات عند الأدمن (admin_settings.settings ->
--    loyaltyTiers): اسم / حد نقاط / ميزة. الافتراضي 4 مستويات:
--    عميل جديد (0) ← صديق بحبح (500) ← عميل منتظم (1000: كارت خصم
--    ١٠٪ مرة واحدة) ← عميل العلاج الشهري (1500: توصيل مجاني برصيد شهري).
-- 4) كارت الخصم المكتسب بيُستخدم زي الكوبون بكوده في place_order،
--    وبيتعلّم «مستخدم» في نفس عملية الطلب.
-- 5) التوصيل المجاني للولاء بيتركّب (OR) مع أي شحن مجاني تاني: مستوى
--    العميل بيمنحه أو عنده اشتراك رعاية شهرية نشط في
--    care_subscriptions — عميل العلاج الشهري واخد الميزة باشتراكه نفسه.
-- الكتابة في جداول الولاء من دوال security definer بس — مفيش أي سياسة
-- كتابة للعملاء، والقراءة: العميل يقرا بتاعه، والطاقم يقرا للخدمة.
-- =====================================================================

-- هوية العميل من التوكن (نفس تعريف ترقية العناوين — idempotent)
create or replace function public.customer_phone() returns text
language sql stable as $$
  select coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'phone', ''),
    split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1)
  )
$$;

-- ---------- 1) الجداول ----------
create table if not exists public.loyalty_accounts (
  customer_phone text primary key,
  balance int not null default 0 check (balance >= 0),
  welcome_granted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loyalty_ledger (
  id text primary key,
  customer_phone text not null,
  kind text not null check (kind in ('welcome', 'earn', 'redeem', 'adjust')),
  points int not null,
  order_id text,
  note text,
  created_at timestamptz not null default now()
);
-- نقاط الترحيب مرة واحدة لكل عميل — على مستوى قاعدة البيانات نفسها
create unique index if not exists loyalty_ledger_welcome_once
  on public.loyalty_ledger (customer_phone) where kind = 'welcome';
-- كسب أي طلب مرة واحدة مهما اتكررت محاولات تحديث حالته
create unique index if not exists loyalty_ledger_earn_once
  on public.loyalty_ledger (order_id) where kind = 'earn' and order_id is not null;
create index if not exists loyalty_ledger_phone_idx
  on public.loyalty_ledger (customer_phone, created_at desc);

create table if not exists public.loyalty_cards (
  id text primary key,
  customer_phone text not null,
  code text not null unique,
  percent numeric not null default 10,
  status text not null default 'active' check (status in ('active', 'used')),
  earned_at timestamptz not null default now(),
  used_at timestamptz,
  used_order_id text
);
-- الكارت بيُكتسب مرة واحدة في عمر الحساب
create unique index if not exists loyalty_cards_once_per_customer
  on public.loyalty_cards (customer_phone);
create index if not exists loyalty_cards_phone_idx
  on public.loyalty_cards (customer_phone, earned_at desc);

alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_ledger enable row level security;
alter table public.loyalty_cards enable row level security;

-- القراءة: العميل يقرا سجلاته بس (بهوية التوكن)، والطاقم يقرا للخدمة.
-- مفيش سياسات كتابة خالص — الكتابة من الدوال الموثّقة تحت بس.
drop policy if exists loyalty_accounts_owner_select on public.loyalty_accounts;
create policy loyalty_accounts_owner_select on public.loyalty_accounts
  for select to authenticated
  using (customer_phone = public.customer_phone() and public.customer_phone() <> '');
drop policy if exists loyalty_accounts_staff_select on public.loyalty_accounts;
create policy loyalty_accounts_staff_select on public.loyalty_accounts
  for select to authenticated using (public.is_staff());

drop policy if exists loyalty_ledger_owner_select on public.loyalty_ledger;
create policy loyalty_ledger_owner_select on public.loyalty_ledger
  for select to authenticated
  using (customer_phone = public.customer_phone() and public.customer_phone() <> '');
drop policy if exists loyalty_ledger_staff_select on public.loyalty_ledger;
create policy loyalty_ledger_staff_select on public.loyalty_ledger
  for select to authenticated using (public.is_staff());

drop policy if exists loyalty_cards_owner_select on public.loyalty_cards;
create policy loyalty_cards_owner_select on public.loyalty_cards
  for select to authenticated
  using (customer_phone = public.customer_phone() and public.customer_phone() <> '');
drop policy if exists loyalty_cards_staff_select on public.loyalty_cards;
create policy loyalty_cards_staff_select on public.loyalty_cards
  for select to authenticated using (public.is_staff());

-- ---------- 2) المستويات والمزايا (بيانات إعدادات الأدمن) ----------
create or replace function public.loyalty_tiers() returns jsonb
language sql stable as $$
  select case
    when jsonb_typeof(coalesce(
           (select settings -> 'loyaltyTiers' from public.admin_settings where id = 'global'),
           'null'::jsonb)) = 'array'
         and jsonb_array_length(coalesce(
           (select settings -> 'loyaltyTiers' from public.admin_settings where id = 'global'),
           '[]'::jsonb)) > 0
    then (select settings -> 'loyaltyTiers' from public.admin_settings where id = 'global')
    else '[
      {"id":"lvl1","nameAr":"عميل جديد","nameEn":"New Client","minPoints":0,"perk":"none"},
      {"id":"lvl2","nameAr":"صديق بحبح","nameEn":"Bahbah Friend","minPoints":500,"perk":"none"},
      {"id":"lvl3","nameAr":"عميل منتظم","nameEn":"Regular Client","minPoints":1000,"perk":"discount_card_10"},
      {"id":"lvl4","nameAr":"عميل العلاج الشهري","nameEn":"Monthly Treatment Client","minPoints":1500,"perk":"free_delivery"}
    ]'::jsonb
  end
$$;

-- ميزة أعلى مستوى وصلّه الرصيد ده ('none' / 'discount_card_10' / 'free_delivery')
create or replace function public.loyalty_level_perk(p_balance int) returns text
language plpgsql stable as $$
declare t record; v_perk text := 'none';
begin
  for t in
    select value from jsonb_array_elements(public.loyalty_tiers())
    order by coalesce(public.try_numeric(value ->> 'minPoints'), 0)
  loop
    if coalesce(p_balance, 0) >= coalesce(public.try_numeric(t.value ->> 'minPoints'), 0) then
      v_perk := coalesce(t.value ->> 'perk', 'none');
    end if;
  end loop;
  return v_perk;
end $$;
revoke all on function public.loyalty_tiers() from public;
revoke all on function public.loyalty_level_perk(int) from public;

-- عضوية رعاية شهرية نشطة؟ (مقارنة بالأرقام بس، مع تحمل اختلاف الصيغ)
-- ملحوظة أمان: التنفيذ المباشر بيتلغي من العموم تحت — الدالة بتُستدعى
-- من دوال security definer بس، عشان ما تبقاش أداة استعلام عن أرقام الناس.
create or replace function public.loyalty_is_care_member(p_phone text) returns boolean
language sql stable as $$
  select exists (
    select 1 from public.care_subscriptions cs
    where cs.status = 'active'
      and regexp_replace(coalesce(cs.phone, ''), '[^0-9]', '', 'g') <> ''
      and regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') <> ''
      and (
        regexp_replace(coalesce(cs.phone, ''), '[^0-9]', '', 'g')
          = regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')
        or (
          length(regexp_replace(coalesce(cs.phone, ''), '[^0-9]', '', 'g')) >= 10
          and length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) >= 10
          and right(regexp_replace(coalesce(cs.phone, ''), '[^0-9]', '', 'g'), 10)
              = right(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), 10)
        )
      )
  )
$$;

-- ---------- 3) منح كارت الخصم عند عبور مستوى الكارت ----------
create or replace function public.loyalty_maybe_grant_card(p_phone text, p_balance int)
returns void
language plpgsql security definer set search_path = public as $$
declare t record; v_needs boolean := false; v_code text;
begin
  for t in select value from jsonb_array_elements(public.loyalty_tiers()) loop
    if coalesce(t.value ->> 'perk', '') = 'discount_card_10'
       and coalesce(p_balance, 0) >= coalesce(public.try_numeric(t.value ->> 'minPoints'), 0) then
      v_needs := true;
    end if;
  end loop;
  if not v_needs then return; end if;
  if exists (select 1 from public.loyalty_cards where customer_phone = p_phone) then return; end if;
  v_code := 'BBH-' || upper(substr(md5(random()::text || p_phone || clock_timestamp()::text), 1, 6));
  insert into public.loyalty_cards (id, customer_phone, code, percent)
  values ('LC-' || v_code, p_phone, v_code, 10)
  on conflict do nothing;
end $$;
revoke all on function public.loyalty_maybe_grant_card(text, int) from public;

-- ---------- 4) إضافة نقاط (الدفتر أولًا — التكرار بيتجاهل تلقائيًا) ----------
create or replace function public.loyalty_credit(
  p_phone text, p_kind text, p_points int, p_order_id text default null, p_note text default null
) returns int
language plpgsql security definer set search_path = public as $$
declare v_id text; v_rows int; v_bal int;
begin
  if p_phone is null or p_phone = '' then return 0; end if;
  insert into public.loyalty_accounts (customer_phone) values (p_phone)
  on conflict (customer_phone) do nothing;

  if coalesce(p_points, 0) <> 0 then
    v_id := case p_kind
      when 'welcome' then 'LLW-' || p_phone
      when 'earn'    then 'LLE-' || coalesce(p_order_id, substr(md5(random()::text), 1, 12))
      else 'LL-' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)
    end;
    insert into public.loyalty_ledger (id, customer_phone, kind, points, order_id, note)
    values (v_id, p_phone, p_kind, p_points, p_order_id, p_note)
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      update public.loyalty_accounts
         set balance = greatest(0, balance + p_points),
             welcome_granted_at = case when p_kind = 'welcome' and welcome_granted_at is null
                                       then now() else welcome_granted_at end,
             updated_at = now()
       where customer_phone = p_phone
       returning balance into v_bal;
      perform public.loyalty_maybe_grant_card(p_phone, v_bal);
      return coalesce(v_bal, 0);
    end if;
  end if;

  select balance into v_bal from public.loyalty_accounts where customer_phone = p_phone;
  return coalesce(v_bal, 0);
end $$;
revoke all on function public.loyalty_credit(text, text, int, text, text) from public;

-- ---------- 5) واجهة العميل: إنشاء الحساب + نقاط الترحيب + الحالة ----------
create or replace function public.ensure_loyalty()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_phone text := public.customer_phone();
  v_bal int;
  v_card public.loyalty_cards%rowtype;
begin
  if v_phone is null or v_phone = '' then raise exception 'no_customer_identity'; end if;
  -- نقاط الترحيب (50) بتتمنح هنا مرة واحدة بس — معرّف الدفتر الحتمي
  -- والفهرس الفريد بيخلوا أي إعادة (دخول تاني/تسجيل مكرر) بلا أثر.
  v_bal := public.loyalty_credit(v_phone, 'welcome', 50, null, 'welcome');
  select * into v_card from public.loyalty_cards
   where customer_phone = v_phone order by earned_at desc limit 1;
  return jsonb_build_object(
    'balance', v_bal,
    'card_code', v_card.code,
    'card_percent', v_card.percent,
    'card_status', v_card.status,
    'card_earned_at', v_card.earned_at,
    'card_used_at', v_card.used_at,
    'care_member', public.loyalty_is_care_member(v_phone)
  );
end $$;
revoke all on function public.ensure_loyalty() from public;
grant execute on function public.ensure_loyalty() to authenticated;

revoke all on function public.loyalty_is_care_member(text) from public;

-- ---------- 6) الكسب عند تسليم الطلب (مرة واحدة لكل طلب) ----------
create or replace function public.loyalty_on_order_delivered() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_rate numeric; v_pts int;
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered'
     and coalesce(new.customer_phone, '') <> '' then
    select coalesce(public.try_numeric(settings ->> 'loyaltyEarnEgpPerPoint'), 10)
      into v_rate from public.admin_settings where id = 'global';
    v_rate := coalesce(nullif(v_rate, 0), 10);
    v_pts := floor(coalesce(new.total, 0) / v_rate)::int;
    if v_pts > 0 then
      perform public.loyalty_credit(new.customer_phone, 'earn', v_pts, new.id, 'order_delivered');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_loyalty_earn on public.orders;
create trigger orders_loyalty_earn after update of status on public.orders
  for each row execute function public.loyalty_on_order_delivered();

-- ---------- 7) زرع المستويات ومعدل الكسب في إعدادات الأدمن ----------
-- بنضيف المفاتيح لو مش موجودة بس — أي تعديل عمله الأدمن قبل كده بيتحفظ.
do $$
declare v_settings jsonb;
begin
  select coalesce(settings, '{}'::jsonb) into v_settings
    from public.admin_settings where id = 'global';
  if v_settings is null then v_settings := '{}'::jsonb; end if;
  if not (v_settings ? 'loyaltyTiers') then
    v_settings := v_settings || jsonb_build_object('loyaltyTiers', '[
      {"id":"lvl1","nameAr":"عميل جديد","nameEn":"New Client","minPoints":0,"perk":"none"},
      {"id":"lvl2","nameAr":"صديق بحبح","nameEn":"Bahbah Friend","minPoints":500,"perk":"none"},
      {"id":"lvl3","nameAr":"عميل منتظم","nameEn":"Regular Client","minPoints":1000,"perk":"discount_card_10"},
      {"id":"lvl4","nameAr":"عميل العلاج الشهري","nameEn":"Monthly Treatment Client","minPoints":1500,"perk":"free_delivery"}
    ]'::jsonb);
  end if;
  if not (v_settings ? 'loyaltyEarnEgpPerPoint') then
    v_settings := v_settings || jsonb_build_object('loyaltyEarnEgpPerPoint', 10);
  end if;
  update public.admin_settings set settings = v_settings where id = 'global';
end $$;

-- ---------- 8) place_order: نفس نسخة ترقية حملة التوصيل المجاني
-- (freeShipCampaignOn، وهي نفسها مبنية على نسخة العناوين: تغليف خاص +
-- دبوس موقع) + كارت خصم الولاء ككوبون + توصيل مجاني (ولاء/رعاية) ------
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
  v_code text := upper(coalesce(p->>'coupon',''));
  v_cpct numeric; v_cmin numeric; v_exist public.orders%rowtype;
  v_discreet boolean := coalesce(p->>'discreetPackaging','false')::boolean;
  v_loyalty_card boolean := false;
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
    -- كارت خصم الولاء المكتسب: بيُستخدم زي الكوبون بكوده، وبيتعلّم مستخدم بعد الطلب
    if v_cpct is null and v_code <> '' then
      select percent into v_cpct from public.loyalty_cards
       where code = v_code and customer_phone = v_phone and status = 'active'
       limit 1;
      if v_cpct is not null then v_cmin := 0; v_loyalty_card := true; end if;
    end if;
    if v_cpct is not null and v_sub >= v_cmin then v_disc := round(v_sub * v_cpct / 100); end if;
  end if;

  -- التوصيل (الاستلام مجاني — وحملة التوصيل المجاني من إعدادات الأدمن بتلغي رسوم المنطقة)
  if v_type = 'delivery' then
    select fee into v_zfee from public.delivery_zones where id = v_zone;
    if v_zfee is null then raise exception 'bad_zone'; end if;
    if jsonb_typeof(v_set.zone_edits) = 'object' and (v_set.zone_edits -> v_zone ->> 'fee') is not null then
      v_zfee := coalesce(public.try_numeric(v_set.zone_edits -> v_zone ->> 'fee'), v_zfee);
    end if;
    select extra_fee into v_extra from public.delivery_slots where id = p->>'slotId';
    v_extra := coalesce(v_extra, 0);
    v_fee := case when coalesce(v_set.settings ->> 'freeShipCampaignOn', '') = 'true' then 0 else v_zfee end + v_extra;
    -- ولاء: توصيل مجاني لو مستوى العميل بيمنحه (عميل العلاج الشهري) أو عنده
    -- اشتراك رعاية شهرية نشط — بيتركّب مع حملة التوصيل المجاني (OR).
    if public.loyalty_level_perk(coalesce(
         (select balance from public.loyalty_accounts where customer_phone = v_phone), 0)) = 'free_delivery'
       or public.loyalty_is_care_member(v_phone) then
      v_fee := v_extra;
    end if;
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

  -- كارت الولاء بيُستخدم مرة واحدة: أول طلب بيخصم بيه بيعلّمه مستخدم
  if v_loyalty_card then
    update public.loyalty_cards
       set status = 'used', used_at = now(), used_order_id = v_id
     where code = v_code and customer_phone = v_phone and status = 'active';
  end if;

  return jsonb_build_object('id', v_id, 'subtotal', v_sub, 'discount', v_disc,
                            'delivery_fee', v_fee, 'total', v_total, 'duplicate', false);
end $$;
revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;
