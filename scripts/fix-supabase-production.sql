-- ============================================================================
-- صيدلية بحبح — سكريبت تصليح وتفعيل قاعدة بيانات Supabase للإنتاج الحقيقي
-- Bahbah Pharmacy - Complete Production Fix Script
-- رابط المشروع: https://supabase.com/dashboard/project/cldfmqdesbecppqtevzk/sql
-- ============================================================================

-- 1. جدول الطلبات (orders) — التأكد من وجوده وضبط سياسات الأمان
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    customer_notes TEXT,
    items JSONB,
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    delivery_fee NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'cod',
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'unpaid',
    delivery_zone TEXT,
    courier_id TEXT,
    pharmacist_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- إزالة أي سياسات قديمة متعارضة
DROP POLICY IF EXISTS "Public order intake only" ON public.orders;
DROP POLICY IF EXISTS "Staff read orders" ON public.orders;
DROP POLICY IF EXISTS "Staff update orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anon all on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated all on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public read on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all operations on orders" ON public.orders;

-- تفعيل الصلاحيات الكاملة للوحة التحكم والعملاء (حفظ وقراءة وتحديث وتصفير)
CREATE POLICY "Allow all operations on orders"
ON public.orders FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);


-- 2. جدول الروشتات (rx_requests)
CREATE TABLE IF NOT EXISTS public.rx_requests (
    id TEXT PRIMARY KEY,
    patient_name TEXT,
    phone TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.rx_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public prescription intake only" ON public.rx_requests;
DROP POLICY IF EXISTS "Staff read prescriptions" ON public.rx_requests;
DROP POLICY IF EXISTS "Staff update prescriptions" ON public.rx_requests;
DROP POLICY IF EXISTS "Allow all operations on rx_requests" ON public.rx_requests;

CREATE POLICY "Allow all operations on rx_requests"
ON public.rx_requests FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);


-- 3. جدول اشتراكات العلاج الشهري (care_subscriptions)
CREATE TABLE IF NOT EXISTS public.care_subscriptions (
    id TEXT PRIMARY KEY,
    plan_id TEXT,
    member_no TEXT,
    name TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    prescription_url TEXT,
    day_pref INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.care_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public care intake only" ON public.care_subscriptions;
DROP POLICY IF EXISTS "Staff read care subscriptions" ON public.care_subscriptions;
DROP POLICY IF EXISTS "Staff update care subscriptions" ON public.care_subscriptions;
DROP POLICY IF EXISTS "Allow all operations on care_subscriptions" ON public.care_subscriptions;

CREATE POLICY "Allow all operations on care_subscriptions"
ON public.care_subscriptions FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);


-- 4. جدول قياسات المرضى الحيوية (patient_measurements) — السكر والضغط والوزن
CREATE TABLE IF NOT EXISTS public.patient_measurements (
    id TEXT PRIMARY KEY,
    patient_code TEXT NOT NULL,
    patient_name TEXT,
    patient_phone TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    blood_sugar NUMERIC,
    sugar_timing TEXT,
    systolic NUMERIC,
    diastolic NUMERIC,
    pulse NUMERIC,
    weight NUMERIC,
    height NUMERIC,
    bmi NUMERIC,
    pharmacist_notes TEXT,
    recorded_by TEXT
);

ALTER TABLE public.patient_measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on patient_measurements" ON public.patient_measurements;

CREATE POLICY "Allow all operations on patient_measurements"
ON public.patient_measurements FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);


-- 5. جدول إعدادات لوحة التحكم (admin_settings)
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

INSERT INTO public.admin_settings (id, admin_pass)
VALUES ('global', '2026')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on admin_settings" ON public.admin_settings;
CREATE POLICY "Allow all operations on admin_settings"
ON public.admin_settings FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);


-- 6. تفعيل التحديث الفوري المباشر (Supabase Realtime) لجميع الجداول
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rx_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rx_requests;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'care_subscriptions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.care_subscriptions;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'patient_measurements') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_measurements;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'admin_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;
  END IF;
END $$;
