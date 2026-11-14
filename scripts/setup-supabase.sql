-- ============================================================================
-- صيدلية بحبح — إعداد قاعدة بيانات Supabase الرسمية
-- Bahbah Pharmacy Supabase Complete Production Schema & Storage Setup
-- Project URL: https://supabase.com/dashboard/project/cldfmqdesbecppqtevzk
-- ============================================================================

-- 1. جدول الطلبات (Orders table)
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

-- 2. جدول طلبات الروشتات (Prescription requests table)
CREATE TABLE IF NOT EXISTS public.rx_requests (
    id TEXT PRIMARY KEY,
    patient_name TEXT,
    phone TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. جدول اشتراكات الرعاية الشهرية (Care subscriptions table)
CREATE TABLE IF NOT EXISTS public.care_subscriptions (
    id TEXT PRIMARY KEY,
    plan_id TEXT,
    member_no TEXT,
    name TEXT,
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- سياسات الأمان والحماية (Row Level Security - RLS)
-- ============================================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rx_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon all on orders" ON public.orders;
CREATE POLICY "Allow anon all on orders" ON public.orders FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all on orders" ON public.orders;
CREATE POLICY "Allow authenticated all on orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on rx_requests" ON public.rx_requests;
CREATE POLICY "Allow anon all on rx_requests" ON public.rx_requests FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all on rx_requests" ON public.rx_requests;
CREATE POLICY "Allow authenticated all on rx_requests" ON public.rx_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on care_subscriptions" ON public.care_subscriptions;
CREATE POLICY "Allow anon all on care_subscriptions" ON public.care_subscriptions FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all on care_subscriptions" ON public.care_subscriptions;
CREATE POLICY "Allow authenticated all on care_subscriptions" ON public.care_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- تفعيل التحديث الفوري (Supabase Realtime)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'rx_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rx_requests;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'care_subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.care_subscriptions;
  END IF;
END $$;

-- ============================================================================
-- سياسات تخزين صور الروشتات (Storage Bucket: rx-prescriptions RLS Policies)
-- ============================================================================
-- السماح برفع صور الروشتات من قِبل الزوار
DROP POLICY IF EXISTS "Allow public uploads to rx-prescriptions" ON storage.objects;
CREATE POLICY "Allow public uploads to rx-prescriptions"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'rx-prescriptions');

-- السماح بقراءة وعرض صور الروشتات للصيدلي والإدارة
DROP POLICY IF EXISTS "Allow public read from rx-prescriptions" ON storage.objects;
CREATE POLICY "Allow public read from rx-prescriptions"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'rx-prescriptions');

-- ============================================================================
-- فهارس تحسين السرعة الفائقة (Performance Indexes)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_rx_requests_created_at ON public.rx_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rx_requests_status ON public.rx_requests (status);
CREATE INDEX IF NOT EXISTS idx_care_subscriptions_created_at ON public.care_subscriptions (created_at DESC);
