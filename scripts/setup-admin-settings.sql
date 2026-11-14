-- ============================================================================
-- صيدلية بحبح — إعداد جدول إعدادات لوحة التحكم والإدارة (Admin Settings Schema)
-- Project: https://supabase.com/dashboard/project/cldfmqdesbecppqtevzk
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    admin_pass TEXT DEFAULT '2026',
    site_edits JSONB DEFAULT '{}'::jsonb,
    ad_edits JSONB DEFAULT '{}'::jsonb,
    care_edits JSONB DEFAULT '{}'::jsonb,
    zone_edits JSONB DEFAULT '{}'::jsonb,
    ads_off JSONB DEFAULT '[]'::jsonb,
    stock_adj JSONB DEFAULT '{}'::jsonb,
    price_override JSONB DEFAULT '{}'::jsonb,
    custom_products JSONB DEFAULT '[]'::jsonb,
    coupons JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- إدراج القيم الافتراضية
INSERT INTO public.admin_settings (id, admin_pass)
VALUES ('global', '2026')
ON CONFLICT (id) DO NOTHING;

-- تفعيل سياسات الأمان والحماية RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on admin_settings" ON public.admin_settings;
CREATE POLICY "Allow public read on admin_settings" ON public.admin_settings FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow anon update on admin_settings" ON public.admin_settings;
CREATE POLICY "Allow anon update on admin_settings" ON public.admin_settings FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all on admin_settings" ON public.admin_settings;
CREATE POLICY "Allow authenticated all on admin_settings" ON public.admin_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- تفعيل المزامنة اللحظية (Realtime)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'admin_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;
  END IF;
END $$;
