-- =====================================================================
-- ترقية 2026-11-19 (أمان — الطبقة ١: الأساس): تضييق صلاحيات القراءة/
-- التعديل على قوائم الطاقم حسب الصلاحيات الموزعة، واتساق فلوس التمريض،
-- وتنظيفات أساسية.
-- ترتيب التشغيل: تُشغَّل أخيرًا — بعد security.sql و commerce.sql وكل
-- ترقيات 2026-11-19 السابقة، بما فيها:
--   upgrade-2026-11-19.sql
--   upgrade-2026-11-19-whatsapp-orders.sql
--   upgrade-2026-11-19-warehouse-sync.sql (+ warehouse-seed.sql قبلها)
--   upgrade-2026-11-19-shortage-requests.sql
--   upgrade-2026-11-19-portals-permissions.sql
--   upgrade-2026-11-19-collections-addresses.sql
--   upgrade-2026-11-19-loyalty-points.sql
--   upgrade-2026-11-19-nursing-services.sql
--   upgrade-2026-11-19-free-shipping-campaign.sql
--   upgrade-2026-11-19-security-layer1.sql  ← (هذا الملف)
--
-- المشكلة اللي بتتصلح: سياسات «أي طاقم» (is_staff) على قوائم العملاء
-- كانت بتسمح لحساب المندوب (أقل صلاحية) إنه يقرا — ومن الـ API مباشرة —
-- طلبات الواتساب والنواقص والروشتات واشتراكات الرعاية وكل أرقام العملاء
-- اللي فيها، ويعدّل بعضها، رغم إن واجهته ما تعرضهاش أصلًا. التضييق ده
-- بيخلي الباك إند نفسه يطبق نفس الصلاحيات اللي المدير بيوزعها
-- (has_permission) — بنفس نمط سياسات nursing_requests.
-- =====================================================================

-- ---------- 1) طلبات الواتساب: قراءة/تعديل بصلاحية «whatsapp_orders» ----------
drop policy if exists wa_staff_select on public.whatsapp_orders;
create policy wa_staff_select on public.whatsapp_orders
  for select to authenticated using (public.has_permission('whatsapp_orders'));
drop policy if exists wa_staff_update on public.whatsapp_orders;
create policy wa_staff_update on public.whatsapp_orders
  for update to authenticated
  using (public.has_permission('whatsapp_orders'))
  with check (public.has_permission('whatsapp_orders'));

-- ---------- 2) طلبات النواقص: قراءة/تعديل بصلاحية «shortages» ----------
drop policy if exists sr_staff_select on public.shortage_requests;
create policy sr_staff_select on public.shortage_requests
  for select to authenticated using (public.has_permission('shortages'));
drop policy if exists sr_staff_update on public.shortage_requests;
create policy sr_staff_update on public.shortage_requests
  for update to authenticated
  using (public.has_permission('shortages'))
  with check (public.has_permission('shortages'));

-- ---------- 3) الروشتات: قراءة/تعديل بصلاحية «prescriptions» ----------
drop policy if exists rx_staff_select on public.rx_requests;
create policy rx_staff_select on public.rx_requests
  for select to authenticated using (public.has_permission('prescriptions'));
drop policy if exists rx_staff_update on public.rx_requests;
create policy rx_staff_update on public.rx_requests
  for update to authenticated
  using (public.has_permission('prescriptions'))
  with check (public.has_permission('prescriptions'));

-- ---------- 4) اشتراكات الرعاية الشهرية: للمدير/الصيدلي بس ----------
-- (مفيش مفتاح صلاحية مخصص للرعاية في نظام التوزيع — فالقيد بالدور،
--  والمندوب برّه تمامًا.)
drop policy if exists care_staff_select on public.care_subscriptions;
create policy care_staff_select on public.care_subscriptions
  for select to authenticated
  using (public.app_role() in ('admin','pharmacist'));
drop policy if exists care_staff_update on public.care_subscriptions;
create policy care_staff_update on public.care_subscriptions
  for update to authenticated
  using (public.app_role() in ('admin','pharmacist'))
  with check (public.app_role() in ('admin','pharmacist'));

-- ---------- 5) القياسات (بيانات طبية): بصلاحية «measurements» ----------
drop policy if exists meas_staff_all on public.patient_measurements;
create policy meas_staff_all on public.patient_measurements
  for all to authenticated
  using (public.has_permission('measurements'))
  with check (public.has_permission('measurements'));

-- ---------- 6) الولاء: قراءة الطاقم للمدير/الصيدلي بس (مش المندوب) ----------
-- (سياسات المالك بهوية التليفون زي ما هي — دي سياسات قراءة الطاقم بس.
--  الكتابة أصلًا مقفولة: من دوال security definer بس.)
drop policy if exists loyalty_accounts_staff_select on public.loyalty_accounts;
create policy loyalty_accounts_staff_select on public.loyalty_accounts
  for select to authenticated
  using (public.app_role() in ('admin','pharmacist'));
drop policy if exists loyalty_ledger_staff_select on public.loyalty_ledger;
create policy loyalty_ledger_staff_select on public.loyalty_ledger
  for select to authenticated
  using (public.app_role() in ('admin','pharmacist'));
drop policy if exists loyalty_cards_staff_select on public.loyalty_cards;
create policy loyalty_cards_staff_select on public.loyalty_cards
  for select to authenticated
  using (public.app_role() in ('admin','pharmacist'));

-- ---------- 7) حجوزات التمريض: اتساق الفلوس عند الإدخال العام ----------
-- العميل بيبعت service_price + visit_fee + total من المتصفح؛ السياسة
-- القديمة كانت بتتحقق من الحالة والاسم بس. دلوقتي: مفيش قيم سالبة،
-- ولازم total = سعر الخدمة + رسوم الزيارة (نفس فحص سياسة إدخال الطلبات).
drop policy if exists nr_insert_public on public.nursing_requests;
create policy nr_insert_public on public.nursing_requests
  for insert to anon, authenticated
  with check (
    status = 'new'
    and length(trim(service_name_ar)) > 0
    and coalesce(service_price, 0) >= 0
    and coalesce(visit_fee, 0) >= 0
    and coalesce(total, 0) >= 0
    and abs(coalesce(total, 0) - (coalesce(service_price, 0) + coalesce(visit_fee, 0))) < 0.01
  );

-- ---------- 8) تنظيف: عمود كلمة سر الأدمن القديم ما يرجعش ----------
-- security.sql بيمسحه في أوله لكن تعريف إنشاء الجدول جواه لسه بيضيفه
-- في التثبيتات الجديدة (الترتيب) — المسح هنا (آخر ملف) بيضمن النتيجة
-- النهائية في كل الحالات. الإعدادات العامة أصلًا ما بترجعوش للعميل.
alter table public.admin_settings drop column if exists admin_pass;

-- ---------- 9) مخزن الصيدلية: تأكيد RLS + قراءة عامة (دفاع في العمق) ----------
-- الـ seed بيُفعّل RLS، لكن لو اتستخدم seed مختلف/قديم من غير التفعيل
-- هتفضل السياسة بلا أثر والجدول مفتوح كتابةً للزوار. التفعيل هنا
-- idempotent، والسياسة بتتأكد إنها موجودة بشكلها الصحيح: قراءة بس.
alter table public.warehouse_products enable row level security;
drop policy if exists warehouse_read_public on public.warehouse_products;
create policy warehouse_read_public on public.warehouse_products
  for select to anon, authenticated using (true);
