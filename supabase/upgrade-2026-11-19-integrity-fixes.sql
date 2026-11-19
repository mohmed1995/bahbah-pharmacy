-- =====================================================================
-- ترقية 2026-11-19 (12): إصلاحات سلامة سوبابيز (Integrity fixes)
-- تُشغَّل أخيرًا — بعد upgrade-2026-11-19-loyalty-quota.sql (وهي نفسها
-- بعد wiring-fixes و security-layer1 و loyalty-points وكل ما قبلها).
--
-- جاية من فحص السلامة الشامل: مسارات كتابة كانت بتفشل بصمت أو ما
-- بتكتبش أصلًا، رغم إن الواجهة كانت بتوحي إنها شغالة:
--  1) D1: إيقاف/استئناف/إلغاء اشتراك الرعاية الشهرية من حساب المريض
--     نفسه كان مستحيل يحفظ: سياسة التحديث على care_subscriptions
--     للطاقم بس، وتغيير يوم الصندوق ما كانش له كتابة سيرفر أصلًا.
--     الحل: دالة care_self_update (security definer) بتعدّل اشتراكات
--     صاحب الجلسة بس — بمطابقة التليفون بالأرقام زي loyalty_is_care_member.
--  2) D2 (قرار المالك — سيادة المدير): سياسة كتابة admin_settings
--     كانت للأدمن بس، فحفظ الصيدلي (إعادة تموين/أسعار/إعدادات) كان
--     بيتقابل برفض RLS ويفشل على الحي. بتتوسّع لـ: أدمن، أو صاحب
--     صلاحية «settings» اللي المدير بيديهاله بنفسه لشخص بعينه
--     (افتراضي الصيدلي لـ settings = false — الوضع ما اتغيّرش إلا
--     لمن يختاره المدير).
--  3) سيادة المدير على المناديب: عمود driver_removed في admin_settings
--     — إزالة مندوب (مضاف أو أساسي) بتتسجل على السيرفر فبيختفي من
--     قوائم التعيين على كل الأجهزة، و get_public_settings بترجّعه.
--  4) سيادة المدير على الولاء: دوال إدارة بحساب العميل —
--     admin_loyalty_lookup (عرض الرصيد/الكارت/رصيد التوصيل)،
--     admin_loyalty_adjust (تصحيح نقاط ± بسجل «adjust»)،
--     admin_loyalty_set_card_status (إلغاء/إعادة تفعيل كارت الخصم).
--     للأدمن بس بفحص جوه الدالة نفسها، والكتابة في النقاط بتعدّي
--     على loyalty_credit نفسها (نفس سجل الحركات — مفيش باب خلفي).
-- =====================================================================

-- ---------- 1) D2: توسيع سياسة كتابة إعدادات الأدمن ----------
drop policy if exists settings_admin_write on public.admin_settings;
create policy settings_admin_write on public.admin_settings for update to authenticated
  using (public.app_role() = 'admin' or public.has_permission('settings'))
  with check (public.app_role() = 'admin' or public.has_permission('settings'));

-- ---------- 2) D1: المريض يعدّل اشتراكه هو بس ----------
-- بتعدّل صفوف care_subscriptions اللي تليفونها بيطابق هوية الجلسة
-- (customer_phone) بمقارنة الأرقام بس — نفس أسلوب loyalty_is_care_member:
-- تطابق تام بالأرقام، أو تطابق آخر 10 أرقام لو الرقمين ≥ 10 أرقام.
-- الحالة مقيدة بـ active/paused/cancelled، ويوم الصندوق 1..31.
create or replace function public.care_self_update(
  p_status text default null,
  p_day_pref int default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_phone text := public.customer_phone();
  v_digits text;
begin
  if v_phone is null or v_phone = '' then
    raise exception 'no_identity';
  end if;
  if p_status is not null and p_status not in ('active', 'paused', 'cancelled') then
    raise exception 'bad_status';
  end if;
  if p_day_pref is not null and (p_day_pref < 1 or p_day_pref > 31) then
    raise exception 'bad_day_pref';
  end if;
  if p_status is null and p_day_pref is null then
    return;
  end if;

  v_digits := regexp_replace(v_phone, '[^0-9]', '', 'g');
  if v_digits = '' then
    raise exception 'no_identity';
  end if;

  update public.care_subscriptions cs
     set status = coalesce(p_status, cs.status),
         day_pref = coalesce(p_day_pref, cs.day_pref)
   where regexp_replace(coalesce(cs.phone, ''), '[^0-9]', '', 'g') <> ''
     and (
       regexp_replace(coalesce(cs.phone, ''), '[^0-9]', '', 'g') = v_digits
       or (
         length(regexp_replace(coalesce(cs.phone, ''), '[^0-9]', '', 'g')) >= 10
         and length(v_digits) >= 10
         and right(regexp_replace(coalesce(cs.phone, ''), '[^0-9]', '', 'g'), 10) = right(v_digits, 10)
       )
     );
end $$;
revoke all on function public.care_self_update(text, int) from public;
revoke execute on function public.care_self_update(text, int) from anon;
grant execute on function public.care_self_update(text, int) to authenticated;

-- ---------- 3) إزالة المناديب على السيرفر (driver_removed) ----------
alter table public.admin_settings
  add column if not exists driver_removed jsonb default '[]'::jsonb;

-- get_public_settings: نفس تعريف wiring-fixes (الأحدث) + المفتاح الجديد
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
    'zone_disabled', v_row.zone_disabled,
    'offer_edits', v_row.offer_edits,
    'settings', v_row.settings,
    'updated_at', v_row.updated_at
  );
end $$;
revoke all on function public.get_public_settings() from public;
grant execute on function public.get_public_settings() to anon, authenticated;

-- ---------- 4) إدارة الولاء للأدمن ----------
-- حالة كارت جديدة «voided» (ملغي من الإدارة) — قيد الحالة الأصلي
-- كان active/used بس، فبيتوسّع هنا قبل ما الدوال تستخدمه.
alter table public.loyalty_cards drop constraint if exists loyalty_cards_status_check;
alter table public.loyalty_cards
  add constraint loyalty_cards_status_check check (status in ('active', 'used', 'voided'));

-- حلّ تليفون حساب الولاء من أي صيغة مكتوبة (مطابقة بالأرقام) —
-- دالة داخلية، التنفيذ من العموم ملغي.
create or replace function public.loyalty_resolve_phone(p_phone text) returns text
language sql stable as $$
  select la.customer_phone
    from public.loyalty_accounts la
   where regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') <> ''
     and (
       regexp_replace(la.customer_phone, '[^0-9]', '', 'g')
         = regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')
       or (
         length(regexp_replace(la.customer_phone, '[^0-9]', '', 'g')) >= 10
         and length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) >= 10
         and right(regexp_replace(la.customer_phone, '[^0-9]', '', 'g'), 10)
             = right(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), 10)
       )
     )
   limit 1
$$;
revoke all on function public.loyalty_resolve_phone(text) from public;

-- عرض حالة ولاء عميل للأدمن: الرصيد + الكارت + رصيد التوصيل المجاني
create or replace function public.admin_loyalty_lookup(p_phone text) returns jsonb
language plpgsql security definer set search_path = public stable as $$
declare
  v_phone text;
  v_bal int;
  v_card record;
  v_period text := to_char(now(), 'YYYY-MM');
  v_quota int;
  v_used int;
begin
  if public.app_role() <> 'admin' then
    raise exception 'admin_only';
  end if;
  v_phone := public.loyalty_resolve_phone(p_phone);
  if v_phone is null then
    return jsonb_build_object('found', false);
  end if;

  select balance into v_bal from public.loyalty_accounts where customer_phone = v_phone;
  select code, percent, status into v_card
    from public.loyalty_cards where customer_phone = v_phone
   order by earned_at desc limit 1;
  v_quota := public.loyalty_free_quota_limit();
  v_used := public.loyalty_free_used(v_phone, v_period);

  return jsonb_build_object(
    'found', true,
    'phone', v_phone,
    'balance', coalesce(v_bal, 0),
    'card_code', v_card.code,
    'card_percent', v_card.percent,
    'card_status', v_card.status,
    'care_member', public.loyalty_is_care_member(v_phone),
    'free_quota', v_quota,
    'free_used', v_used,
    'free_remaining', greatest(0, v_quota - v_used)
  );
end $$;
revoke all on function public.admin_loyalty_lookup(text) from public;
revoke execute on function public.admin_loyalty_lookup(text) from anon;
grant execute on function public.admin_loyalty_lookup(text) to authenticated;

-- تصحيح نقاط عميل (±) — بيعدّي على loyalty_credit فبيتسجل في السجل
-- بحركة «adjust» وبيتحدّث الرصيد وبيتفحص منح الكارت زي أي كسب طبيعي.
create or replace function public.admin_loyalty_adjust(
  p_phone text, p_delta int, p_note text default null
) returns int
language plpgsql security definer set search_path = public as $$
declare v_phone text;
begin
  if public.app_role() <> 'admin' then
    raise exception 'admin_only';
  end if;
  if p_delta is null or p_delta = 0 or abs(p_delta) > 100000 then
    raise exception 'bad_delta';
  end if;
  v_phone := public.loyalty_resolve_phone(p_phone);
  if v_phone is null then
    raise exception 'account_not_found';
  end if;
  return public.loyalty_credit(
    v_phone, 'adjust', p_delta, null,
    coalesce(nullif(trim(p_note), ''), 'تعديل يدوي من الإدارة')
  );
end $$;
revoke all on function public.admin_loyalty_adjust(text, int, text) from public;
revoke execute on function public.admin_loyalty_adjust(text, int, text) from anon;
grant execute on function public.admin_loyalty_adjust(text, int, text) to authenticated;

-- إلغاء كارت خصم عميل (active → voided) أو إعادة تفعيله (voided → active).
-- الكارت المستعمل (used) ما بيتلمسش، ولو الكارت أصلاً في الحالة المطلوبة أو
-- العميل مالوش كارت بترجع false — true بس لو حالة الكارت اتغيّرت فعلاً.
create or replace function public.admin_loyalty_set_card_status(
  p_phone text, p_status text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_phone text;
  v_card record;
begin
  if public.app_role() <> 'admin' then
    raise exception 'admin_only';
  end if;
  if p_status is null or p_status not in ('active', 'voided') then
    raise exception 'bad_status';
  end if;
  v_phone := public.loyalty_resolve_phone(p_phone);
  if v_phone is null then
    raise exception 'account_not_found';
  end if;
  select id, status into v_card
    from public.loyalty_cards where customer_phone = v_phone
   order by earned_at desc limit 1;
  if not found or v_card.status = 'used' or v_card.status = p_status then
    return false;
  end if;
  update public.loyalty_cards set status = p_status where id = v_card.id;
  return true;
end $$;
revoke all on function public.admin_loyalty_set_card_status(text, text) from public;
revoke execute on function public.admin_loyalty_set_card_status(text, text) from anon;
grant execute on function public.admin_loyalty_set_card_status(text, text) to authenticated;