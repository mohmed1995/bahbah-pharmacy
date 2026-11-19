-- =====================================================================
-- ترقية 2026-11-19: التغليف الخاص + فودافون كاش
-- تُشغَّل بعد security.sql و commerce.sql (نفس ترتيب باقي الملفات).
-- 1) عمود discreet_packaging على الطلبات — علم التغليف السادة بيتنقل
--    مع الطلب وبيظهر للصيدلي والواصلي.
-- 2) place_order: قبول طريقة الدفع vodafone + حفظ علم التغليف الخاص.
-- =====================================================================

alter table public.orders
  add column if not exists discreet_packaging boolean not null default false;

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
begin
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
    -- (try_numeric: قيمة تعديل فاسدة بتتفوّت للمصدر اللي بعده بدل ما تكسّر الطلب)
    v_price := null;
    if v_set.price_override ? v_pid then v_price := public.try_numeric(v_set.price_override ->> v_pid); end if;
    if v_price is null and jsonb_typeof(v_set.custom_products) = 'array' then
      select public.try_numeric(e->>'price') into v_price
      from jsonb_array_elements(v_set.custom_products) e where e->>'id' = v_pid limit 1;
    end if;
    if v_price is null then select price into v_price from public.products where id = v_pid; end if;
    if v_price is null or v_price < 0 then raise exception 'unknown_product:%', v_pid; end if;

    -- [v6 — C-2] المخزون: اقفل صف المنتج، ولو مخزونه متعقّب (stock مش NULL)
    -- لازم يكفي الكمية، واخصم فورًا. أي خطأ لاحق في نفس الطلب بيلغي المعاملة
    -- كلها فالخصم بيتراجع تلقائيًا. صنف مش موجود في products (منتج أدمن)
    -- أو مخزونه NULL = غير متعقّب، بيعدي زي ما هو.
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

  -- التوصيل (نفس منطق الواجهة: الاستلام مجاني، والحد المجاني عام من الإعدادات)
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
    delivery_zone, courier_id, pharmacist_id, discreet_packaging, created_at, updated_at)
  values (v_id, left(coalesce(p->>'name',''),120), v_phone, left(coalesce(p->>'address',''),400),
    case when v_disc > 0 then 'Coupon: ' || v_code else '' end, v_items,
    v_sub, v_disc, v_fee, v_total, v_pay, 'pending', 'unpaid',
    case when v_type = 'delivery' then v_zone end,
    case when coalesce(p->>'driverId','') ~ '^[A-Za-z0-9_-]{1,30}$' then p->>'driverId' end,
    null, v_discreet, now(), now());

  return jsonb_build_object('id', v_id, 'subtotal', v_sub, 'discount', v_disc,
                            'delivery_fee', v_fee, 'total', v_total, 'duplicate', false);
end $$;
