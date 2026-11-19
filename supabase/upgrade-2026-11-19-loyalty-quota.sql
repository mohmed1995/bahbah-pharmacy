-- =====================================================================
-- ترقية 2026-11-19 (11): رصيد التوصيل المجاني الشهري للولاء/الرعاية
-- («حصّة» محدودة بدل التوصيل المجاني المفتوح) + أسماء مستويات ألطف.
-- تُشغَّل أخيرًا — بعد upgrade-2026-11-19-wiring-fixes.sql (وهي نفسها
-- بعد loyalty-points و free-shipping-campaign و security-layer1).
--
-- 1) التوصيل المجاني لعميل المستوى الأعلى (ميزة free_delivery) وعميل
--    العلاج الشهري المشترك بقى من رصيد شهري محدود: عدد توصيلات مجانية
--    في الشهر التقويمي بيحدده الأدمن من إعدادات «نقاط الولاء ومستويات
--    العميل» (settings.loyaltyFreeShipQuota — افتراضي 4). الرصيد بيتجدد
--    تلقائيًا أول كل شهر (الفترة = 'YYYY-MM').
-- 2) الاستهلاك بيتحسب على السيرفر جوه place_order نفسه: الإعفاء بسبب
--    الولاء/الرعاية بيستهلك توصيلة من رصيد الشهر، والإعفاء بسبب حملة
--    التوصيل المجاني (freeShipCampaignOn) ما بيستهلكش حاجة — الحملة
--    حملة الصيدلية، مش من جيب العميل. خلص الرصيد = رسوم المنطقة عادية.
-- 3) سجل الاستهلاك في loyalty_free_deliveries بمعرّف حتمي من رقم الطلب
--    ('LFD-' || order_id) — إعادة إرسال نفس الطلب ما بتستهلكش مرتين.
-- 4) ensure_loyalty بيرجع أرقام الرصيد (free_quota / free_used /
--    free_remaining) عشان الواجهة توري العميل المتبقي له الشهر ده.
-- 5) أسماء المستويات الافتراضية بقت ألطف وبرُوح الصيدلية: عميل جديد /
--    صديق بحبح / عميل منتظم / عميل العلاج الشهري — والأسماء المحفوظة
--    عند الأدمن بتتعدّل هنا بس لو لسه على الافتراضي القديم بحذافيره
--    (أي تسمية خاصة عملها الأدمن بنفسه ما بتتلمسش).
-- الكتابة في سجل الرصيد من place_order (security definer) بس — مفيش
-- أي سياسة كتابة للعملاء، والقراءة: العميل يقرا بتاعه، والطاقم للخدمة.
-- =====================================================================

-- ---------- 1) سجل استهلاك التوصيلات المجانية ----------
create table if not exists public.loyalty_free_deliveries (
  id text primary key,               -- 'LFD-' || order_id (حتمي = مرة واحدة للطلب)
  customer_phone text not null,
  order_id text,
  period text not null,              -- 'YYYY-MM' — الشهر التقويمي للاستهلاك
  created_at timestamptz not null default now()
);
create index if not exists loyalty_free_deliveries_phone_period_idx
  on public.loyalty_free_deliveries (customer_phone, period);

alter table public.loyalty_free_deliveries enable row level security;

drop policy if exists loyalty_free_deliveries_owner_select on public.loyalty_free_deliveries;
create policy loyalty_free_deliveries_owner_select on public.loyalty_free_deliveries
  for select to authenticated
  using (customer_phone = public.customer_phone() and public.customer_phone() <> '');
drop policy if exists loyalty_free_deliveries_staff_select on public.loyalty_free_deliveries;
create policy loyalty_free_deliveries_staff_select on public.loyalty_free_deliveries
  for select to authenticated using (public.is_staff());

-- ---------- 2) حد الرصيد والمستهلك (دوال داخلية — التنفيذ من العموم ملغي) ----------
-- حد الرصيد الشهري من إعدادات الأدمن (افتراضي 4 — نفس افتراضي الواجهة)
create or replace function public.loyalty_free_quota_limit() returns int
language sql stable as $$
  select greatest(0, coalesce(
    public.try_numeric(
      (select settings ->> 'loyaltyFreeShipQuota' from public.admin_settings where id = 'global')),
    4))::int
$$;

-- كام توصيلة مجانية العميل استهلكها في فترة (شهر) معينة
create or replace function public.loyalty_free_used(p_phone text, p_period text) returns int
language sql stable as $$
  select count(*)::int from public.loyalty_free_deliveries
   where customer_phone = p_phone and period = p_period
$$;
revoke all on function public.loyalty_free_quota_limit() from public;
revoke all on function public.loyalty_free_used(text, text) from public;

-- ---------- 3) أسماء المستويات الألطف في الدالة الاحتياطية ----------
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

revoke all on function public.loyalty_tiers() from public;

-- ---------- 4) ensure_loyalty: نفس نسخة ترقية الولاء + أرقام الرصيد ----------
create or replace function public.ensure_loyalty()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_phone text := public.customer_phone();
  v_bal int;
  v_card public.loyalty_cards%rowtype;
  v_quota int;
  v_used int;
begin
  if v_phone is null or v_phone = '' then raise exception 'no_customer_identity'; end if;
  -- نقاط الترحيب (50) بتتمنح هنا مرة واحدة بس — معرّف الدفتر الحتمي
  -- والفهرس الفريد بيخلوا أي إعادة (دخول تاني/تسجيل مكرر) بلا أثر.
  v_bal := public.loyalty_credit(v_phone, 'welcome', 50, null, 'welcome');
  select * into v_card from public.loyalty_cards
   where customer_phone = v_phone order by earned_at desc limit 1;
  -- رصيد التوصيل المجاني الشهري: الحد والمستهلك والمتبقي (الشهر الحالي)
  v_quota := public.loyalty_free_quota_limit();
  v_used := public.loyalty_free_used(v_phone, to_char(now(), 'YYYY-MM'));
  return jsonb_build_object(
    'balance', v_bal,
    'card_code', v_card.code,
    'card_percent', v_card.percent,
    'card_status', v_card.status,
    'card_earned_at', v_card.earned_at,
    'card_used_at', v_card.used_at,
    'care_member', public.loyalty_is_care_member(v_phone),
    'free_quota', v_quota,
    'free_used', v_used,
    'free_remaining', greatest(0, v_quota - v_used)
  );
end $$;
revoke all on function public.ensure_loyalty() from public;
grant execute on function public.ensure_loyalty() to authenticated;

-- ---------- 5) place_order: نفس النسخة المرجعية من ترقية الولاء ------
-- (نفسها مبنية على نسخة حملة التوصيل المجاني: freeShipCampaignOn +
-- تغليف خاص + دبوس موقع + كارت خصم الولاء) — والفرق الوحيد هنا:
-- إعفاء الولاء/الرعاية بقى مشروط برصيد التوصيل المجاني الشهري
-- وبيستهلك توصيلة عند نجاح الطلب. حملة التوصيل المجاني لا تستهلك. ---
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
  v_loyalty_free boolean := false;
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
    -- ولاء/رعاية: توصيل مجاني من رصيد شهري محدود بيحدده الأدمن
    -- (settings.loyaltyFreeShipQuota توصيلة في الشهر التقويمي) لو مستوى
    -- العميل بيمنحه (عميل العلاج الشهري) أو عنده اشتراك رعاية شهرية
    -- نشط — بيتركّب مع حملة التوصيل المجاني (OR)، بس الحملة وهي شغالة
    -- ما بتستهلكش من الرصيد: الاستهلاك شرطه الإعفاء بسبب الولاء/الرعاية.
    if coalesce(v_set.settings ->> 'freeShipCampaignOn', '') <> 'true'
       and (public.loyalty_level_perk(coalesce(
              (select balance from public.loyalty_accounts where customer_phone = v_phone), 0)) = 'free_delivery'
            or public.loyalty_is_care_member(v_phone))
       and public.loyalty_free_used(v_phone, to_char(now(), 'YYYY-MM'))
             < public.loyalty_free_quota_limit() then
      v_fee := v_extra;
      v_loyalty_free := true;
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

  -- استهلاك توصيلة من رصيد الولاء/الرعاية — معرّف حتمي من رقم الطلب،
  -- فأي إعادة إرسال لنفس الطلب ما بتستهلكش مرتين (والطلب المكرر أصلًا
  -- بيرجع بدري من فوق قبل أي حساب).
  if v_loyalty_free then
    insert into public.loyalty_free_deliveries (id, customer_phone, order_id, period)
    values ('LFD-' || v_id, v_phone, v_id, to_char(now(), 'YYYY-MM'))
    on conflict (id) do nothing;
  end if;

  return jsonb_build_object('id', v_id, 'subtotal', v_sub, 'discount', v_disc,
                            'delivery_fee', v_fee, 'total', v_total, 'duplicate', false);
end $$;
revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;


-- ---------- 6) زرع إعداد الرصيد + تليين أسماء المستويات المحفوظة ----------
do $$
declare
  v_settings jsonb;
  v_tiers jsonb;
  v_out jsonb := '[]'::jsonb;
  t jsonb;
begin
  select coalesce(settings, '{}'::jsonb) into v_settings
    from public.admin_settings where id = 'global';
  if v_settings is null then v_settings := '{}'::jsonb; end if;

  -- رصيد التوصيل المجاني: بنضيف المفتاح لو مش موجود بس
  if not (v_settings ? 'loyaltyFreeShipQuota') then
    v_settings := v_settings || jsonb_build_object('loyaltyFreeShipQuota', 4);
  end if;

  -- المستويات: بنزرع الافتراضي اللطيف لو المفتاح مش موجود أصلًا
  if not (v_settings ? 'loyaltyTiers') then
    v_settings := v_settings || jsonb_build_object('loyaltyTiers', '[
      {"id":"lvl1","nameAr":"عميل جديد","nameEn":"New Client","minPoints":0,"perk":"none"},
      {"id":"lvl2","nameAr":"صديق بحبح","nameEn":"Bahbah Friend","minPoints":500,"perk":"none"},
      {"id":"lvl3","nameAr":"عميل منتظم","nameEn":"Regular Client","minPoints":1000,"perk":"discount_card_10"},
      {"id":"lvl4","nameAr":"عميل العلاج الشهري","nameEn":"Monthly Treatment Client","minPoints":1500,"perk":"free_delivery"}
    ]'::jsonb);
  else
    -- ولو موجودة: بنليّن أي حقل لسه على الافتراضي القديم بحذافيره بس —
    -- أي اسم الأدمن غيّره بنفسه بيتحفظ زي ما هو.
    v_tiers := v_settings -> 'loyaltyTiers';
    if jsonb_typeof(v_tiers) = 'array' then
      for t in select * from jsonb_array_elements(v_tiers) loop
        if t ->> 'id' = 'lvl1' then
          if t ->> 'nameAr' = 'عميل' then t := jsonb_set(t, '{nameAr}', '"عميل جديد"'); end if;
          if t ->> 'nameEn' = 'Client' then t := jsonb_set(t, '{nameEn}', '"New Client"'); end if;
        elsif t ->> 'id' = 'lvl2' then
          if t ->> 'nameAr' = 'عميل مميز' then t := jsonb_set(t, '{nameAr}', '"صديق بحبح"'); end if;
          if t ->> 'nameEn' = 'Valued Client' then t := jsonb_set(t, '{nameEn}', '"Bahbah Friend"'); end if;
        elsif t ->> 'id' = 'lvl3' then
          if t ->> 'nameAr' = 'عميل ذهبي' then t := jsonb_set(t, '{nameAr}', '"عميل منتظم"'); end if;
          if t ->> 'nameEn' = 'Gold Client' then t := jsonb_set(t, '{nameEn}', '"Regular Client"'); end if;
        elsif t ->> 'id' = 'lvl4' then
          if t ->> 'nameAr' = 'VIP — العلاج الشهري' then t := jsonb_set(t, '{nameAr}', '"عميل العلاج الشهري"'); end if;
          if t ->> 'nameEn' = 'VIP — Monthly Treatment' then t := jsonb_set(t, '{nameEn}', '"Monthly Treatment Client"'); end if;
        end if;
        v_out := v_out || jsonb_build_array(t);
      end loop;
      v_settings := jsonb_set(v_settings, '{loyaltyTiers}', v_out);
    end if;
  end if;

  update public.admin_settings set settings = v_settings where id = 'global';
end $$;
