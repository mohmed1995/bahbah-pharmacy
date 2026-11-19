-- =====================================================================
-- ترقية 2026-11-19 (15): النسخ الاحتياطي والأرشفة — تصدير كامل،
-- استيراد/استرجاع مُتحقَّق منه، وأرشفة البيانات التشغيلية القديمة.
-- تُشغَّل أخيرًا — بعد upgrade-2026-11-19-security-layer2.sql (وهي
-- نفسها بعد courier-ratings وكل ما قبلها في السلسلة).
--
-- ليه: مساحة الخطة المجانية محدودة، ومفيش نسخ احتياطي تلقائي عليها.
-- المدير يقدر من لوحة الإدارة:
--   أ) ينزّل نسخة كاملة من بيانات السيرفر (ملف JSON واحد من العميل —
--      القراءة بصلاحياته الحالية، والجداول اللي بتتفشل بتتسمّى صراحة).
--   ب) يسترجع ملف نسخة نزّله قبل كده: restore_backup_table هنا هي
--      طريق الكتابة الوحيد — أدمن بس، وقايمة جداول بيضاء، و upsert
--      على المفتاح الأساسي فإعادة نفس الملف مرتين ما بتكرّرش حاجة.
--      (الكتابة المباشرة من العميل مستحيلة أصلًا لجداول الولاء —
--      مفيش سياسات كتابة عليها — وحارس تحديث الطلبات كان هيعطّل
--      استرجاع صفوف اتحركت حالتها؛ الدالة دي هي المسار الموثّق.)
--   ج) يأرشف: archive_old_operational_data بتحذف البيانات التشغيلية
--      القديمة بس — والقاعدة «الأساسيات ما بتتمسش أبدًا» مفروضة هنا
--      في الـ SQL نفسه: الدالة ما بتلمسش care_subscriptions ولا
--      patient_measurements ولا جداول الولاء ولا customer_addresses
--      ولا warehouse_products ولا admin_settings — مفيش أي مسار حذف
--      ليهم في الدالة أصلًا.
--
-- قواعد الأرشفة (نفسها بالحرف في دالة المعاينة والحذف):
--   - الطلبات: created_at أقدم من الحد وحالتها نهائية
--     (delivered / cancelled) — طلب لسه شغال ما بيتمسش مهما قدّم.
--   - تحصيلات وتقييمات الطلبات دي (مربوطة بـ order_id)، زائد أي
--     تحصيلة/تقييم يتيم (طلبه مش موجود أصلًا) أقدم من الحد.
--   - الطوابير المقفولة بس: واتساب (converted/done/cancelled)،
--     نواقص (أي حاجة غير pending)، تمريض (done/cancelled)،
--     روشتات (أي حاجة غير new) — العنصر المفتوح ما بيتمسش.
--   - الحد في المستقبل أو فاضي = رفض (bad_cutoff) — حماية من
--     مسح الكل بغلطة تاريخ.
-- =====================================================================

-- =====================================================================
-- أ) معاينة الأرشفة: إيه هيتحذف بالظبط لو اتنفذت بنفس الحد؟
-- (نفس شروط الحذف بالحرف — الأدمن بيشوف الأرقام قبل ما يأكّد.)
-- =====================================================================
create or replace function public.archive_preview_counts(p_cutoff timestamptz)
returns jsonb
language plpgsql security definer set search_path = public stable as $$
begin
  if public.app_role() <> 'admin' then
    raise exception 'admin_only';
  end if;
  if p_cutoff is null or p_cutoff > now() then
    raise exception 'bad_cutoff';
  end if;

  return jsonb_build_object(
    'orders', (
      select count(*) from public.orders o
       where o.created_at < p_cutoff
         and o.status in ('delivered', 'cancelled')
    ),
    'courier_collections', (
      select count(*) from public.courier_collections c
       where exists (
               select 1 from public.orders o
                where o.id = c.order_id
                  and o.created_at < p_cutoff
                  and o.status in ('delivered', 'cancelled')
             )
          or (c.created_at < p_cutoff
              and not exists (select 1 from public.orders o where o.id = c.order_id))
    ),
    'courier_ratings', (
      select count(*) from public.courier_ratings r
       where exists (
               select 1 from public.orders o
                where o.id = r.order_id
                  and o.created_at < p_cutoff
                  and o.status in ('delivered', 'cancelled')
             )
          or (r.created_at < p_cutoff
              and not exists (select 1 from public.orders o where o.id = r.order_id))
    ),
    'whatsapp_orders', (
      select count(*) from public.whatsapp_orders w
       where w.created_at < p_cutoff
         and w.status in ('converted', 'done', 'cancelled')
    ),
    'shortage_requests', (
      select count(*) from public.shortage_requests s
       where s.created_at < p_cutoff
         and s.status <> 'pending'
    ),
    'nursing_requests', (
      select count(*) from public.nursing_requests n
       where n.created_at < p_cutoff
         and n.status in ('done', 'cancelled')
    ),
    'rx_requests', (
      select count(*) from public.rx_requests r
       where r.created_at < p_cutoff
         and r.status <> 'new'
    )
  );
end $$;
revoke all on function public.archive_preview_counts(timestamptz) from public;
revoke execute on function public.archive_preview_counts(timestamptz) from anon;
grant execute on function public.archive_preview_counts(timestamptz) to authenticated;

-- =====================================================================
-- ب) الأرشفة نفسها: حذف نهائي بنفس الشروط — وبتُرجع العدّادات الفعلية
-- =====================================================================
create or replace function public.archive_old_operational_data(p_cutoff timestamptz)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_counts jsonb := '{}'::jsonb;
  v_n int;
begin
  if public.app_role() <> 'admin' then
    raise exception 'admin_only';
  end if;
  if p_cutoff is null or p_cutoff > now() then
    raise exception 'bad_cutoff';
  end if;

  /* التقييمات والتحصيلات الأول (مربوطة بالطلبات اللي هتتمسح) */
  delete from public.courier_ratings r
   where exists (
           select 1 from public.orders o
            where o.id = r.order_id
              and o.created_at < p_cutoff
              and o.status in ('delivered', 'cancelled')
         )
      or (r.created_at < p_cutoff
          and not exists (select 1 from public.orders o where o.id = r.order_id));
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('courier_ratings', v_n);

  delete from public.courier_collections c
   where exists (
           select 1 from public.orders o
            where o.id = c.order_id
              and o.created_at < p_cutoff
              and o.status in ('delivered', 'cancelled')
         )
      or (c.created_at < p_cutoff
          and not exists (select 1 from public.orders o where o.id = c.order_id));
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('courier_collections', v_n);

  delete from public.orders o
   where o.created_at < p_cutoff
     and o.status in ('delivered', 'cancelled');
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('orders', v_n);

  /* الطوابير: المقفول بس — المفتوح ما بيتمسش مهما قدّم */
  delete from public.whatsapp_orders w
   where w.created_at < p_cutoff
     and w.status in ('converted', 'done', 'cancelled');
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('whatsapp_orders', v_n);

  delete from public.shortage_requests s
   where s.created_at < p_cutoff
     and s.status <> 'pending';
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('shortage_requests', v_n);

  delete from public.nursing_requests n
   where n.created_at < p_cutoff
     and n.status in ('done', 'cancelled');
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('nursing_requests', v_n);

  delete from public.rx_requests r
   where r.created_at < p_cutoff
     and r.status <> 'new';
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('rx_requests', v_n);

  /* الأساسيات برّه الدالة دي تمامًا — مفيش حذف ليها هنا ولا هيبقى:
     care_subscriptions / patient_measurements / loyalty_accounts /
     loyalty_ledger / loyalty_cards / loyalty_free_deliveries /
     customer_addresses / warehouse_products / admin_settings /
     staff_permissions / patient_devices. */
  return v_counts;
end $$;
revoke all on function public.archive_old_operational_data(timestamptz) from public;
revoke execute on function public.archive_old_operational_data(timestamptz) from anon;
grant execute on function public.archive_old_operational_data(timestamptz) to authenticated;

-- =====================================================================
-- ج) استرجاع جدول من نسخة احتياطية: upsert على المفتاح الأساسي
-- ---------------------------------------------------------------------
-- - أدمن بس (admin_only) — أي دور تاني بيترفض قبل ما يلمس حاجة.
-- - قايمة بيضاء ثابتة: جدول برّاها = table_not_restorable، فمفيش
--   استرجاع لجداول النظام (admin_settings / staff_permissions / …).
-- - الأعمدة بتتبني من information_schema لجدول الهدف نفسه، والصفوف
--   بتتقرا بـ jsonb_populate_recordset — مفاتيح زيادة في الملف
--   بتتجاهل وأعمدة ناقصة بتتكتب null (ملفاتنا أصلًا select * كاملة).
-- - إعادة استيراد نفس الملف: كل صف بيتصادم على مفتاحه وبيتحدّث
--   بنفس قيمه — مفيش تكرار (idempotent).
-- - حراس الإدخال العام بتاعة الطبقة ٢ (trg_guard_* على الواتساب/
--   النواقص/تمريض) بتتوقف أثناء استرجاع جداولها بس وترجع فورًا:
--   الحراس دول معمولين ضد الإنشاء العام المجهول، والاسترجاع هنا
--   أدمن موثّق بيستعيد بيانات تاريخية شرعية (ممكن تكون أقدم من
--   الطبقة ٢ أو أطول من سقوفها). التعطيل جوه نفس المعاملة — أي
--   فشل بيرجّع كل حاجة زي ما كانت، الحراس included.
-- - warehouse_products مفتاحها sync_key (مفيش id): الصفوف اللي
--   sync_key بتاعها فاضي بتتخطى — ما ينفعش تتركب على مفتاح فاضي
--   من غير ما تتكرر مع كل استيراد.
-- =====================================================================
create or replace function public.restore_backup_table(p_table text, p_rows jsonb)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_pk text;
  v_cols text;
  v_set text;
  v_guard text;
  v_filter text := '';
  v_n int;
begin
  if public.app_role() <> 'admin' then
    raise exception 'admin_only';
  end if;

  v_pk := case p_table
    when 'orders' then 'id'
    when 'courier_collections' then 'id'
    when 'courier_ratings' then 'id'
    when 'whatsapp_orders' then 'id'
    when 'shortage_requests' then 'id'
    when 'nursing_requests' then 'id'
    when 'rx_requests' then 'id'
    when 'care_subscriptions' then 'id'
    when 'patient_measurements' then 'id'
    when 'loyalty_accounts' then 'customer_phone'
    when 'loyalty_ledger' then 'id'
    when 'loyalty_cards' then 'id'
    when 'customer_addresses' then 'id'
    when 'warehouse_products' then 'sync_key'
    else null
  end;
  if v_pk is null then
    raise exception 'table_not_restorable:%', coalesce(p_table, '');
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'bad_rows';
  end if;
  if jsonb_array_length(p_rows) = 0 then
    return 0;
  end if;

  select string_agg(quote_ident(column_name), ', ' order by ordinal_position),
         string_agg(
           format('%I = excluded.%I', column_name, column_name),
           ', ' order by ordinal_position
         ) filter (where column_name <> v_pk)
    into v_cols, v_set
    from information_schema.columns
   where table_schema = 'public' and table_name = p_table;
  if v_cols is null or v_set is null then
    raise exception 'table_not_restorable:%', p_table;
  end if;

  v_guard := case p_table
    when 'whatsapp_orders' then 'trg_guard_whatsapp_order_insert'
    when 'shortage_requests' then 'trg_guard_shortage_request_insert'
    when 'nursing_requests' then 'trg_guard_nursing_request_insert'
    else null
  end;
  if v_guard is not null and exists (
    select 1 from pg_trigger where tgname = v_guard and not tgisinternal
  ) then
    execute format('alter table public.%I disable trigger %I', p_table, v_guard);
  end if;

  if p_table = 'warehouse_products' then
    v_filter := 'where sync_key is not null';
  end if;

  execute format(
    'insert into public.%I (%s)
     select %s from jsonb_populate_recordset(null::public.%I, $1) %s
     on conflict (%I) do update set %s',
    p_table, v_cols, v_cols, p_table, v_filter, v_pk, v_set
  ) using p_rows;
  get diagnostics v_n = row_count;

  if v_guard is not null and exists (
    select 1 from pg_trigger where tgname = v_guard and not tgisinternal
  ) then
    execute format('alter table public.%I enable trigger %I', p_table, v_guard);
  end if;

  return v_n;
end $$;
revoke all on function public.restore_backup_table(text, jsonb) from public;
revoke execute on function public.restore_backup_table(text, jsonb) from anon;
grant execute on function public.restore_backup_table(text, jsonb) to authenticated;
