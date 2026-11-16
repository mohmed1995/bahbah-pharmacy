-- ============================================================================
-- صيدلية بحبح — المخطط الكامل والشامل لقاعدة بيانات Supabase (Master SQL Schema)
-- Bahbah Pharmacy - Complete Production Database Definition
-- المشروع: https://supabase.com/dashboard/project/cldfmqdesbecppqtevzk
-- ============================================================================
-- يحتوي هذا الملف على كافة الجداول، الفهارس، سياسات الأمان RLS، 
-- إعدادات مخزن الصور Storage، والتحديث اللحظي Realtime.
-- يمكنك نسخ هذا الملف كاملاً واستيراده في أي مشروع Supabase جديد لنقل النظام 100%.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. جدول الطلبات (Orders Table)
-- ----------------------------------------------------------------------------
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
    status TEXT DEFAULT 'pending',          -- 'pending' | 'shipping' | 'delivered' | 'cancelled'
    payment_status TEXT DEFAULT 'unpaid',     -- 'unpaid' | 'paid'
    delivery_zone TEXT,                       -- قرى ونجوع ديروط
    courier_id TEXT,                          -- مندوب التوصيل المكلف
    pharmacist_id TEXT,                       -- الصيدلي المحضر للطلب
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders (customer_phone);

-- ----------------------------------------------------------------------------
-- 2. جدول طلبات الروشتات وتصوير الأدوية (Prescription Requests Table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rx_requests (
    id TEXT PRIMARY KEY,
    patient_name TEXT,
    phone TEXT,
    image_url TEXT,                           -- رابط صورة الروشتة في Storage
    status TEXT DEFAULT 'new',                -- 'new' | 'reviewed' | 'dispensed' | 'rejected'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rx_requests_created_at ON public.rx_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rx_requests_status ON public.rx_requests (status);

-- ----------------------------------------------------------------------------
-- 3. جدول برنامج العلاج الشهري والرعاية المزمنة (Care Subscriptions Table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.care_subscriptions (
    id TEXT PRIMARY KEY,
    plan_id TEXT,                             -- كود الخطة العلاجية
    member_no TEXT,                           -- رقم عضوية المريض
    name TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    prescription_url TEXT,                    -- صورة الروشتة الدائمة للعلاج المزمن
    day_pref INTEGER DEFAULT 1,               -- اليوم المفضل في الشهر للتوصيل (1-30)
    status TEXT DEFAULT 'active',             -- 'active' | 'paused' | 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_care_subscriptions_created_at ON public.care_subscriptions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_care_subscriptions_phone ON public.care_subscriptions (phone);

-- ----------------------------------------------------------------------------
-- 4. جدول قياسات المريض الحيوية (Patient Vital Measurements Table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_measurements (
    id TEXT PRIMARY KEY,
    patient_code TEXT NOT NULL,               -- كود ملف المريض (مثل BB-P-101)
    patient_name TEXT,
    patient_phone TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    blood_sugar NUMERIC,                      -- قياس السكر (مجم/ديسيلتر)
    sugar_timing TEXT,                        -- 'fasting' | 'postprandial' | 'random'
    systolic NUMERIC,                         -- ضغط الدم الانقباضي (مثل 120)
    diastolic NUMERIC,                        -- ضغط الدم الانبساطي (مثل 80)
    pulse NUMERIC,                            -- النبض
    weight NUMERIC,                           -- الوزن بالكيلوجرام
    height NUMERIC,                           -- الطول بالسنتيمتر
    bmi NUMERIC,                              -- مؤشر كتلة الجسم المحسوب
    pharmacist_notes TEXT,                    -- نصائح وتوجيهات دكتور الصيدلية
    recorded_by TEXT                          -- اسم الصيدلي القائم بالقياس
);

CREATE INDEX IF NOT EXISTS idx_patient_measurements_phone ON public.patient_measurements (patient_phone);
CREATE INDEX IF NOT EXISTS idx_patient_measurements_code ON public.patient_measurements (patient_code);
CREATE INDEX IF NOT EXISTS idx_patient_measurements_date ON public.patient_measurements (recorded_at DESC);

-- ----------------------------------------------------------------------------
-- 5. جدول إعدادات لوحة التحكم وإدارة الصيدلية المباشرة (Admin Settings CMS Table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    admin_pass TEXT DEFAULT '2026',           -- كلمة مرور لوحة الإدارة
    site_edits JSONB DEFAULT '{}'::jsonb,     -- نصوص وعناوين الواجهة الرئيسية
    ad_edits JSONB DEFAULT '{}'::jsonb,       -- بنرات الإعلانات والصور
    care_edits JSONB DEFAULT '{}'::jsonb,     -- باقات الرعاية الشهرية
    zone_edits JSONB DEFAULT '{}'::jsonb,     -- أسعار توصيل قرى ونجوع ديروط
    ads_off JSONB DEFAULT '[]'::jsonb,        -- الإعلانات المعطلة
    stock_adj JSONB DEFAULT '{}'::jsonb,      -- تعديلات المخزون الفوري
    price_override JSONB DEFAULT '{}'::jsonb, -- تعديل أسعار الأدوية يدوياً
    custom_products JSONB DEFAULT '[]'::jsonb,-- أصناف جديدة مضافة من لوحة التحكم
    coupons JSONB DEFAULT '[]'::jsonb,        -- كوبونات الخصم النشطة
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- إدراج السجل الموحد إن لم يكن موجوداً
INSERT INTO public.admin_settings (id, admin_pass)
VALUES ('global', '2026')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. سياسات الأمان والحماية (Row Level Security - RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rx_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- حذف السياسات السابقة لتجنب أي تعارض
DROP POLICY IF EXISTS "Allow all operations on orders" ON public.orders;
DROP POLICY IF EXISTS "Public order intake only" ON public.orders;
DROP POLICY IF EXISTS "Staff read orders" ON public.orders;
DROP POLICY IF EXISTS "Staff update orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anon all on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated all on orders" ON public.orders;

CREATE POLICY "Allow all operations on orders"
ON public.orders FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on rx_requests" ON public.rx_requests;
DROP POLICY IF EXISTS "Public prescription intake only" ON public.rx_requests;
DROP POLICY IF EXISTS "Staff read prescriptions" ON public.rx_requests;
DROP POLICY IF EXISTS "Staff update prescriptions" ON public.rx_requests;

CREATE POLICY "Allow all operations on rx_requests"
ON public.rx_requests FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on care_subscriptions" ON public.care_subscriptions;
DROP POLICY IF EXISTS "Public care intake only" ON public.care_subscriptions;
DROP POLICY IF EXISTS "Staff read care subscriptions" ON public.care_subscriptions;
DROP POLICY IF EXISTS "Staff update care subscriptions" ON public.care_subscriptions;

CREATE POLICY "Allow all operations on care_subscriptions"
ON public.care_subscriptions FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on patient_measurements" ON public.patient_measurements;

CREATE POLICY "Allow all operations on patient_measurements"
ON public.patient_measurements FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on admin_settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Allow public read on admin_settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Allow anon update on admin_settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Allow authenticated all on admin_settings" ON public.admin_settings;

CREATE POLICY "Allow all operations on admin_settings"
ON public.admin_settings FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 7. إعداد مخزن صور الروشتات (Supabase Storage: rx-prescriptions)
-- ----------------------------------------------------------------------------
-- إنشاء الـ Bucket إن لم يكن منشأً
INSERT INTO storage.buckets (id, name, public)
VALUES ('rx-prescriptions', 'rx-prescriptions', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- سياسات تخزين الصور: السماح للجميع برفع الصور وقراءتها
DROP POLICY IF EXISTS "Allow prescription uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to rx-prescriptions" ON storage.objects;
CREATE POLICY "Allow prescription uploads"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'rx-prescriptions');

DROP POLICY IF EXISTS "Allow public read prescription images" ON storage.objects;
DROP POLICY IF EXISTS "Staff read prescription images" ON storage.objects;
CREATE POLICY "Allow public read prescription images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'rx-prescriptions');

-- ----------------------------------------------------------------------------
-- 8. تفعيل التحديث اللحظي الفوري لجميع الجداول (Supabase Realtime Publication)
-- ----------------------------------------------------------------------------
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
