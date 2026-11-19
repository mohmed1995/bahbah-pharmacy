-- =====================================================================
-- ترقية 2026-11-19 (3): تجهيز جدول مخزن الصيدلية للمزامنة من برنامج
-- المحل (Simple Assistant) + قراءة عامة للتوفر والبحث بالباركود.
-- تُشغَّل بعد warehouse-seed.sql (اللي بينشئ الجدول وبيزرع البيانات).
-- sync_key = الباركود الحقيقي لو فريد، ولو مش موجود/مكرر يبقى كود
-- الصنف الداخلي — وهو مفتاح الـ upsert بتاع أداة المزامنة.
-- =====================================================================

alter table public.warehouse_products add column if not exists sync_key text;
alter table public.warehouse_products add column if not exists updated_at timestamptz;

-- تعبئة sync_key للصفوف الموجودة (باركود ≥ 8 أرقام ومش مكرر، وإلا الكود)
with dup as (
  select barcode from public.warehouse_products
  where barcode is not null and length(barcode) >= 8
  group by barcode having count(*) > 1
)
update public.warehouse_products w
set sync_key = case
  when w.barcode is not null and length(w.barcode) >= 8
       and w.barcode not in (select barcode from dup)
  then w.barcode
  else w.code
end
where w.sync_key is null;

create unique index if not exists warehouse_products_sync_key_uidx
  on public.warehouse_products (sync_key);

-- قراءة عامة: العميل يقدر يشوف التوفر ويبحث بالباركود (الكتابة بس
-- بمفتاح service role من أداة المزامنة على كمبيوتر المحل)
drop policy if exists warehouse_read_public on public.warehouse_products;
create policy warehouse_read_public on public.warehouse_products
  for select to anon, authenticated using (true);
