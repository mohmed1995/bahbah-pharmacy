-- =====================================================================
-- ترقية 2026-11-19: إصلاح التوصيلات («Fake Save» wiring fixes)
-- ترتيب التشغيل: تُشغَّل أخيرًا — بعد كل ترقيات 2026-11-19 بهذا الترتيب:
--   upgrade-2026-11-19.sql
--   upgrade-2026-11-19-whatsapp-orders.sql
--   upgrade-2026-11-19-warehouse-sync.sql
--   upgrade-2026-11-19-shortage-requests.sql
--   upgrade-2026-11-19-portals-permissions.sql
--   upgrade-2026-11-19-collections-addresses.sql
--   upgrade-2026-11-19-free-shipping-campaign.sql
--   upgrade-2026-11-19-loyalty-points.sql
--   upgrade-2026-11-19-nursing-services.sql
--   upgrade-2026-11-19-security-layer1.sql
--   upgrade-2026-11-19-wiring-fixes.sql  ← (هذا الملف)
--
-- المشكلة اللي بيصلّحها: كنترولات في لوحة الإدارة كانت بتقول «تم الحفظ»
-- وهي مش موصّلة بالسيرفر أصلًا أو بتزامن مفتاح غلط:
--   1) تعديلات صور المنتجات كانت بتتزامن مع مفتاح custom_products الغلط
--      فكانت بتضيع عند أي تحميل من السيرفر → عمود img_override مخصص لها.
--   2) المناديب المضافين من اللوحة وحالاتهم (متاح/مشغول/غير متصل) كانوا
--      محليين بس على جهاز المدير → عمودا custom_drivers و driver_status.
--   3) قفل/فتح مناطق التوصيل كان محلي بس → عمود zone_disabled.
--   4) تعديلات العروض (offer edits) كانت محلية بس رغم إن الواجهة بتقول
--      «اتنشر في شاشات العملاء» → عمود offer_edits.
-- كلها أعمدة jsonb في admin_settings بنفس آلية باقي الإعدادات
-- (stock_adj / price_override / zone_edits...)، وبتوصل لكل الواجهات عن
-- طريق get_public_settings + realtime زي أخواتها بالظبط.
-- =====================================================================

-- ---------- 1) الأعمدة الجديدة ----------
alter table public.admin_settings
  add column if not exists img_override jsonb default '{}'::jsonb;
alter table public.admin_settings
  add column if not exists custom_drivers jsonb default '[]'::jsonb;
alter table public.admin_settings
  add column if not exists driver_status jsonb default '{}'::jsonb;
alter table public.admin_settings
  add column if not exists zone_disabled jsonb default '[]'::jsonb;
alter table public.admin_settings
  add column if not exists offer_edits jsonb default '{}'::jsonb;

-- ---------- 2) get_public_settings تشمل المفاتيح الجديدة ----------
-- نفس تعريف ترقية الخدمات التمريضية (الأحدث) + المفاتيح الخمسة، عشان
-- واجهات العملاء والمناديب تقرأها من أي جهاز — مش من جهاز المدير بس.
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
    'zone_disabled', v_row.zone_disabled,
    'offer_edits', v_row.offer_edits,
    'settings', v_row.settings,
    'updated_at', v_row.updated_at
  );
end $$;
revoke all on function public.get_public_settings() from public;
grant execute on function public.get_public_settings() to anon, authenticated;
