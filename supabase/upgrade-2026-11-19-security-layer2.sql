-- =====================================================================
-- ترقية 2026-11-19 (14): الأمان — الطبقة ٢: باكت روشتات خاص + تحصين
-- الإدخالات العامة.
-- تُشغَّل أخيرًا — بعد upgrade-2026-11-19-courier-ratings.sql (وهي نفسها
-- بعد integrity-fixes وكل ما قبلها في السلسلة).
--
-- المشكلتين اللي بتتصلح:
--  أ) باكت «rx-prescriptions» (صور الروشتات وصور النواقص) كان عام
--     (public) ومش معرّف أصلًا في أي ملف في السلسلة — أي حد معاه رابط
--     صورة روشتة يقدر يفتحها، والروابط بتتخزن كنص في rx_requests /
--     shortage_requests / care_subscriptions. دلوقتي: الباكت خاص،
--     والقراءة بروابط موقعة مؤقتة (signed URLs) بس، وبسياسات تخزين:
--       - العميل المسجّل يرفع في مجلد u/<أرقام تليفونه> بس (نفس هوية
--         customer_phone اللي السلسلة كلها بتستخدمها).
--       - الزائر (من غير تسجيل) يرفع في مجلد guest/ — كتابة بس،
--         مفيش قراءة للزوار خالص (الصورة بتتشاف من الطاقم بس).
--       - العميل يقرا صوره هو بس: مجلده، أو أي ملف مربوط بطلباته هو
--         (روشتة/ناقص/اشتراك رعاية برقمه) — وده بيغطي ملفات guest/
--         والملفات القديمة المسطحة اللي اترفعت قبل الطبقة دي.
--       - الطاقم يقرا بصلاحية «prescriptions» أو «shortages» (نفس
--         توزيع الطبقة ١ — المندوب برّه، افتراضاته «orders» بس).
--       - مفيش سياسات تعديل/حذف لأي حد: الرفع أصلًا upsert=false،
--         والملف اللي اترفع ما بيتبدلش ولا بيتمسح من الـ API.
--     العميل (التطبيق) بيخزن مسار الملف بس من دلوقتي، وبيبني رابط
--     موقّع وقت العرض — والروابط العامة القديمة المخزنة بتتحول
--     لمسارات وقت العرض برضه، فالبيانات القديمة ما بتتكسرش.
--  ب) الإدخالات العامة (طلبات واتساب / نواقص / تمريض) كانت من غير أي
--     حدود على الحقول — أي حد يقدر يبعت نصوص عملاقة أو يغرق الطوابير
--     بطلبات مفتوحة بنفس الرقم. دلوقتي: حدود طول/صيغة على مستوى
--     السيرفر (triggers قبل الإدخال — بتسري على الجديد بس، فمفيش
--     صف قديم يكسرها)، وسقف بسيط للطلبات المفتوحة لنفس الرقم.
--     ده مش نظام rate-limit كامل — حدود عقلانية موثقة بس.
-- =====================================================================

-- =====================================================================
-- أ) الباكت الخاص وسياسات التخزين
-- =====================================================================

-- ---------- 1) تعريف الباكت: خاص + سقف حجم للملف ----------
-- (كان بيتنشئ يدويًا من لوحة Supabase — دلوقتي معرّف في السلسلة.
--  سقف 10MB للملف الواحد. مفيش قيد على نوع الملف: صور الآيفون HEIC
--  وأي صيغة كاميرا لازم تعدي، والباكت خاص فمفيش عرض عام أصلًا.)
insert into storage.buckets (id, name, public, file_size_limit)
values ('rx-prescriptions', 'rx-prescriptions', false, 10485760)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit;

-- ---------- 2) هل الملف مربوط بطلبات العميل صاحب الجلسة؟ ----------
-- (security definer عشان تقرا جداول الطلبات من غير ما RLS بتاعتها
--  يتدخل جوه سياسة التخزين — نفس نمط rating_order_allowed بالظبط.
--  بتغطي: صور guest/ اللي اترفعت قبل التسجيل، والملفات القديمة
--  المسطحة rx_*.jpg من قبل الطبقة دي، وصور اشتراكات الرعاية.)
create or replace function public.rx_photo_visible_to_caller(p_name text)
returns boolean
language plpgsql security definer set search_path = public stable as $$
declare v_phone text := public.customer_phone();
begin
  if v_phone is null or v_phone = '' or p_name is null or p_name = '' then
    return false;
  end if;
  return exists (
      select 1 from public.rx_requests r
       where public.phones_match(r.phone, v_phone)
         and (r.image_url = p_name
              or r.image_url like '%/rx-prescriptions/' || p_name)
    ) or exists (
      select 1 from public.shortage_requests s
       where public.phones_match(s.customer_phone, v_phone)
         and (s.photo_url = p_name
              or s.photo_url like '%/rx-prescriptions/' || p_name)
    ) or exists (
      select 1 from public.care_subscriptions c
       where public.phones_match(c.phone, v_phone)
         and (c.prescription_url = p_name
              or c.prescription_url like '%/rx-prescriptions/' || p_name)
    );
end $$;
revoke all on function public.rx_photo_visible_to_caller(text) from public;
revoke execute on function public.rx_photo_visible_to_caller(text) from anon;
grant execute on function public.rx_photo_visible_to_caller(text) to authenticated;

-- ---------- 3) سياسات الرفع ----------
-- العميل المسجّل: مجلد u/<أرقام تليفونه> بس — الأرقام مستخرجة من
-- نفس customer_phone() (metadata phone أو أول الإيميل) ومتنضفة لأرقام
-- بس، فالمجلد اللي العميل بيبنيه هو نفسه اللي السياسة بتتحقق منه.
drop policy if exists rx_storage_insert_own on storage.objects;
create policy rx_storage_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'rx-prescriptions'
    and (storage.foldername(name))[1] = 'u'
    and (storage.foldername(name))[2]
        = nullif(regexp_replace(public.customer_phone(), '[^0-9]', '', 'g'), '')
  );

-- الزائر: مجلد guest/ — إيداع كتابة بس (مفيش أي سياسة قراءة للزوار،
-- فالملف ما يتشافش غير من الطاقم أو من صاحبه بعد ما يسجّل وطلبه
-- يتربط برقمه عن طريق rx_photo_visible_to_caller).
drop policy if exists rx_storage_insert_guest on storage.objects;
create policy rx_storage_insert_guest on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'rx-prescriptions'
    and (storage.foldername(name))[1] = 'guest'
  );

-- ---------- 4) سياسات القراءة (لازمة لبناء الروابط الموقعة) ----------
-- العميل: مجلده هو، أو ملف مربوط بطلباته هو.
drop policy if exists rx_storage_select_own on storage.objects;
create policy rx_storage_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'rx-prescriptions'
    and (
      (
        (storage.foldername(name))[1] = 'u'
        and (storage.foldername(name))[2]
            = nullif(regexp_replace(public.customer_phone(), '[^0-9]', '', 'g'), '')
      )
      or public.rx_photo_visible_to_caller(name)
    )
  );

-- الطاقم: بصلاحية الروشتات أو النواقص (توزيع الطبقة ١ — المدير دايمًا
-- بيعدي من has_permission، والصيدلي واخد الاتنين افتراضيًا، والمندوب
-- لأ). الباكت مشترك بين النوعين فالسياسة على أيٍّ منهما.
drop policy if exists rx_storage_select_staff on storage.objects;
create policy rx_storage_select_staff on storage.objects
  for select to authenticated
  using (
    bucket_id = 'rx-prescriptions'
    and (public.has_permission('prescriptions')
         or public.has_permission('shortages'))
  );

-- مفيش سياسات update/delete على الباكت لأي حد — عن قصد.

-- =====================================================================
-- ب) تحصين الإدخالات العامة: حدود حقول + سقف طلبات مفتوحة
-- (BEFORE INSERT triggers — الجديد بس، والطاقم بيعدّل مش بيدخل،
--  فشغل الطاقم مش بيتأثر. صيغة التليفون: ٨–١٥ رقم بعد تنضيف أي
--  رموز/مسافات — نفس تساهل السلسلة في صيغ +20 / 0.
--  دوال الحراسة security definer بالضرورة: عدّ الطلبات المفتوحة
--  لازم يشوف صفوف المدخل الزائر ما يقدرش يقراها أصلًا بـ RLS —
--  من غير definer السقف هيبقى ميت على السيرفر الحي زي ما هو
--  ميت نظريًا. الدوال ما بترجعش أي بيانات للمستدعي — بتعدّ
--  وبترفض أو تعدّي بس.)
-- =====================================================================

-- ---------- 1) طلبات الواتساب ----------
-- الاسم ≤ 80 حرف، التليفون ٨–١٥ رقم، الأصناف array ≤ 50 صنف
-- و≤ 8192 حرف JSON، ومفيش أكتر من 5 طلبات «sent» مفتوحة لنفس الرقم.
create or replace function public.guard_whatsapp_order_insert()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_open int;
begin
  if new.customer_name is not null and length(new.customer_name) > 80 then
    raise exception 'customer_name_too_long';
  end if;
  if new.customer_phone is not null
     and length(regexp_replace(new.customer_phone, '[^0-9]', '', 'g')) not between 8 and 15 then
    raise exception 'bad_phone';
  end if;
  if jsonb_typeof(new.items) <> 'array'
     or jsonb_array_length(new.items) > 50
     or length(new.items::text) > 8192 then
    raise exception 'bad_items';
  end if;
  if new.customer_phone is not null and new.customer_phone <> '' then
    select count(*) into v_open
      from public.whatsapp_orders w
     where w.status = 'sent'
       and public.phones_match(w.customer_phone, new.customer_phone);
    if v_open >= 5 then
      raise exception 'too_many_open_requests';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_whatsapp_order_insert on public.whatsapp_orders;
create trigger trg_guard_whatsapp_order_insert
  before insert on public.whatsapp_orders
  for each row execute function public.guard_whatsapp_order_insert();

-- ---------- 2) طلبات النواقص ----------
-- اسم الصنف ≤ 120 حرف، الاسم ≤ 80، التليفون ٨–١٥ رقم، الباركود
-- ≤ 32 حرف، مسار/رابط الصورة ≤ 1024 حرف، ومفيش أكتر من 5 طلبات
-- «pending» مفتوحة لنفس الرقم.
create or replace function public.guard_shortage_request_insert()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_open int;
begin
  if length(new.item_name) > 120 then
    raise exception 'item_name_too_long';
  end if;
  if new.customer_name is not null and length(new.customer_name) > 80 then
    raise exception 'customer_name_too_long';
  end if;
  if new.customer_phone is not null
     and length(regexp_replace(new.customer_phone, '[^0-9]', '', 'g')) not between 8 and 15 then
    raise exception 'bad_phone';
  end if;
  if new.barcode is not null and length(new.barcode) > 32 then
    raise exception 'barcode_too_long';
  end if;
  if new.photo_url is not null and length(new.photo_url) > 1024 then
    raise exception 'photo_url_too_long';
  end if;
  if new.customer_phone is not null and new.customer_phone <> '' then
    select count(*) into v_open
      from public.shortage_requests s
     where s.status = 'pending'
       and public.phones_match(s.customer_phone, new.customer_phone);
    if v_open >= 5 then
      raise exception 'too_many_open_requests';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_shortage_request_insert on public.shortage_requests;
create trigger trg_guard_shortage_request_insert
  before insert on public.shortage_requests
  for each row execute function public.guard_shortage_request_insert();

-- ---------- 3) حجوزات التمريض ----------
-- الاسم ≤ 80 حرف، التليفون ٨–١٥ رقم، اسم الخدمة ≤ 80، العنوان
-- ≤ 300، الملاحظات ≤ 500، التوقيت المفضل ≤ 40، المنطقة ≤ 40،
-- ومفيش أكتر من 3 حجوزات مفتوحة (new/confirmed) لنفس الرقم.
create or replace function public.guard_nursing_request_insert()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_open int;
begin
  if new.customer_name is not null and length(new.customer_name) > 80 then
    raise exception 'customer_name_too_long';
  end if;
  if new.customer_phone is not null
     and length(regexp_replace(new.customer_phone, '[^0-9]', '', 'g')) not between 8 and 15 then
    raise exception 'bad_phone';
  end if;
  if length(new.service_name_ar) > 80
     or (new.service_name_en is not null and length(new.service_name_en) > 80) then
    raise exception 'service_name_too_long';
  end if;
  if new.address is not null and length(new.address) > 300 then
    raise exception 'address_too_long';
  end if;
  if new.notes is not null and length(new.notes) > 500 then
    raise exception 'notes_too_long';
  end if;
  if new.preferred_at is not null and length(new.preferred_at) > 40 then
    raise exception 'preferred_at_too_long';
  end if;
  if new.zone_id is not null and length(new.zone_id) > 40 then
    raise exception 'zone_id_too_long';
  end if;
  if new.customer_phone is not null and new.customer_phone <> '' then
    select count(*) into v_open
      from public.nursing_requests n
     where n.status in ('new', 'confirmed')
       and public.phones_match(n.customer_phone, new.customer_phone);
    if v_open >= 3 then
      raise exception 'too_many_open_requests';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_nursing_request_insert on public.nursing_requests;
create trigger trg_guard_nursing_request_insert
  before insert on public.nursing_requests
  for each row execute function public.guard_nursing_request_insert();
