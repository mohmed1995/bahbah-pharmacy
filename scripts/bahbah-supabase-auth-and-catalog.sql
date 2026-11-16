-- ============================================================================
-- صيدلية بحبح — حزمة تسجيل الدخول، المستخدمين، الكتالوج، والمناديب
-- Bahbah Pharmacy - Complete Auth Profiles, Staff, Products & Zones Schema
-- رابط محرر SQL المفتوح لديك: https://supabase.com/dashboard/project/cldfmqdesbecppqtevzk/sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. جدول الحسابات والمستخدمين (User Profiles & Roles)
-- مربوط مباشرة بنظام الدخول auth.users في Supabase
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'patient',           -- 'patient' | 'courier' | 'pharmacist' | 'admin'
    national_id TEXT,                      -- الرقم القومي (اختياري)
    address TEXT,                          -- عنوان المريض / القرية
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on profiles" ON public.profiles;
CREATE POLICY "Allow all on profiles"
ON public.profiles FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- تريجر (Trigger) لإنشاء بروفايل تلقائياً فور تسجيل أي مستخدم أو عميل جديد
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'عميل بحبح'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 2. جدول مناديب التوصيل وأسطول الصيدلية (Couriers & Delivery Fleet)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.couriers (
    id TEXT PRIMARY KEY,                   -- كود المندوب (مثل dr-1, dr-2)
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle TEXT DEFAULT 'موتوسيكل',        -- موتوسيكل / فيسبا / دراجة
    plate_no TEXT,                         -- رقم اللوحة
    status TEXT DEFAULT 'available',       -- 'available' | 'busy' | 'offline'
    zone_id TEXT,                          -- نطاق القرية المكلف بها
    total_deliveries INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on couriers" ON public.couriers;
CREATE POLICY "Allow all on couriers"
ON public.couriers FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- إدراج مناديب ديروط الأساسيين
INSERT INTO public.couriers (id, name, phone, vehicle, status)
VALUES 
  ('dr-1', 'محمود حسانين (أبو رحاب)', '01011500166', 'موتوسيكل دايون', 'available'),
  ('dr-2', 'علي جمال الشريف', '01012345678', 'فيسبا إيطالي', 'available'),
  ('dr-3', 'محمد عبد العال', '01123456789', 'موتوسيكل هوجان', 'available')
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 3. جدول قرى ونجوع ديروط وتسعيرة التوصيل (Delivery Zones of Dairut)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_zones (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    delivery_fee NUMERIC NOT NULL DEFAULT 10,
    estimated_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on delivery_zones" ON public.delivery_zones;
CREATE POLICY "Allow all on delivery_zones"
ON public.delivery_zones FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- إدراج قرى ونجوع مركز ديروط بالتسعيرة الرسمية
INSERT INTO public.delivery_zones (id, name_ar, name_en, delivery_fee, estimated_minutes)
VALUES
  ('deirout-city', 'مدينة ديروط (المحطة والوسط)', 'Dairut City', 5, 15),
  ('sanabu', 'قرية صنبو', 'Sanabu', 10, 25),
  ('dashlout', 'قرية دشلوط', 'Dashlout', 12, 30),
  ('masara', 'قرية مسارة', 'Masara', 10, 25),
  ('bahr-yusuf', 'شلهوب وبحر يوسف', 'Shalhoob & Bahr Yusuf', 12, 35),
  ('bani-yahya', 'بني يحيى قبلي وبحري', 'Bani Yahya', 10, 25),
  ('koodia', 'الكودية', 'Al-Koodia', 15, 40),
  ('qasr-haydar', 'قصر حيدر', 'Qasr Haydar', 12, 30),
  ('houta', 'الحوطا الغربية والشرقية', 'Al-Houta', 15, 45),
  ('sanhout', 'سنهور والنجوع المجاورة', 'Sanhoor', 12, 30),
  ('deirout-sherif', 'ديروط الشريف', 'Dairut Al-Sharif', 10, 20),
  ('jarf-sarhan', 'جرف سرحان', 'Jarf Sarhan', 12, 30),
  ('amshool', 'أمشول ونواحيها', 'Amshool', 15, 40),
  ('bavilis', 'بابل والنجوع المجاورة', 'Bavilis', 15, 40),
  ('nazlet-daher', 'نزلة ظاهر والعوامر', 'Nazlet Daher', 15, 45),
  ('abu-al-hadar', 'أبو الهدر والجبانة', 'Abu Al-Hadar', 15, 45),
  ('custom-village', 'قرية أو نجع آخر (كتابة مخصصة)', 'Custom Village', 15, 40)
ON CONFLICT (id) DO UPDATE 
SET delivery_fee = EXCLUDED.delivery_fee, name_ar = EXCLUDED.name_ar;


-- ----------------------------------------------------------------------------
-- 4. جدول أقسام وفئات الصيدلية (Categories Table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on categories" ON public.categories;
CREATE POLICY "Allow all on categories"
ON public.categories FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

INSERT INTO public.categories (id, name_ar, name_en, sort_order)
VALUES
  ('medicines', 'أدوية وعلاجات', 'Medicines', 1),
  ('chronic', 'أمراض مزمنة', 'Chronic Care', 2),
  ('cold-flu', 'برد وإنفلونزا', 'Cold & Flu', 3),
  ('digestive', 'الجهاز الهضمي', 'Digestive', 4),
  ('vitamins', 'فيتامينات ومكملات', 'Vitamins', 5),
  ('mom-baby', 'الأم والطفل', 'Mother & Baby', 6),
  ('skin-care', 'العناية بالبشرة', 'Skin Care', 7),
  ('devices', 'أجهزة طبية وقياس', 'Medical Devices', 8),
  ('first-aid', 'إسعافات أولية', 'First Aid', 9)
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 5. جدول كتالوج المنتجات والأدوية (Products Catalog Table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    barcode TEXT,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    category_id TEXT REFERENCES public.categories(id),
    active_ingredient TEXT,                -- المادة الفعالة
    strength TEXT,                         -- التركيز (مثل 500 مجم)
    form TEXT,                             -- أقراص / شراب / حقن / كريم
    price NUMERIC NOT NULL DEFAULT 0,      -- سعر البيع للجمهور
    strip_price NUMERIC DEFAULT 0,         -- سعر الشريط المفرد
    old_price NUMERIC,                     -- السعر قبل الخصم (للعروض)
    stock_boxes INTEGER DEFAULT 10,        -- رصيد العلب في الصيدلية
    image_url TEXT,                        -- صورة الصنف
    verified_photo BOOLEAN DEFAULT FALSE,  -- هل الصورة موثقة ومطابقة صيدلانياً
    requires_rx BOOLEAN DEFAULT FALSE,     -- هل يحتاج روشتة طبية لصرفه
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on products" ON public.products;
CREATE POLICY "Allow all on products"
ON public.products FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_products_cat ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name_ar ON public.products(name_ar);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);


-- ----------------------------------------------------------------------------
-- 6. تفعيل التحديث اللحظي لجميع الجداول الجديدة (Supabase Realtime)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'couriers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couriers;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'delivery_zones') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_zones;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'products') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
END $$;
