-- ============================================================================
-- صيدلية بحبح — حزمة تسجيل الدخول، المستخدمين، الكتالوج، والمناديب (نسخة مؤمّنة)
-- آمن لإعادة التشغيل أكثر من مرة (idempotent)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. دالة تحديث updated_at (عامة)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. جدول الحسابات والمستخدمين
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'patient',           -- 'patient' | 'courier' | 'pharmacist' | 'admin'
    national_id TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- قيد يمنع أي قيمة دور غير معروفة (NOT VALID كي لا يفشل على بيانات قديمة)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('patient','courier','pharmacist','admin')) NOT VALID;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. دوال فحص الصلاحيات (SECURITY DEFINER كي لا تدخل في حلقة RLS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin','pharmacist') AND is_active
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. تريجر إنشاء البروفايل: الدور دائماً patient (الترقية يدوياً من الإدارة)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1), 'عميل بحبح'),
    NEW.raw_user_meta_data->>'phone',
    'patient'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 4. حماية الأعمدة الحساسة: غير الأدمن لا يستطيع تغيير role / is_active / id
--    (auth.uid() = NULL عند التشغيل من SQL Editor أو service_role فيُسمح)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.id := OLD.id;
    NEW.role := OLD.role;
    NEW.is_active := OLD.is_active;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- ----------------------------------------------------------------------------
-- 5. سياسات profiles
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles read own or staff" ON public.profiles;
DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
DROP POLICY IF EXISTS "profiles admin all" ON public.profiles;

-- كل مستخدم يرى نفسه، والموظفون (صيدلي/أدمن) يرون الجميع
CREATE POLICY "profiles read own or staff" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff());

-- كل مستخدم يعدل بياناته فقط (الدور محمي بالتريجر أعلاه)
CREATE POLICY "profiles update own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- الأدمن فقط يدير كل شيء (إضافة/حذف/ترقية)
CREATE POLICY "profiles admin all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 6. جدول قرى ونجوع ديروط وتسعيرة التوصيل (قبل المناديب بسبب الـ FK)
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
DROP POLICY IF EXISTS "delivery_zones public read" ON public.delivery_zones;
DROP POLICY IF EXISTS "delivery_zones staff write" ON public.delivery_zones;
CREATE POLICY "delivery_zones public read" ON public.delivery_zones
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "delivery_zones staff write" ON public.delivery_zones
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

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
-- 7. جدول مناديب التوصيل
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.couriers (
    id TEXT PRIMARY KEY,                   -- كود المندوب (dr-1, dr-2)
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle TEXT DEFAULT 'موتوسيكل',
    plate_no TEXT,
    status TEXT DEFAULT 'available',       -- 'available' | 'busy' | 'offline'
    zone_id TEXT,
    user_id UUID,                          -- ربط اختياري بحساب المندوب لتسجيل دخوله
    total_deliveries INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.couriers ADD COLUMN IF NOT EXISTS user_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'couriers_zone_id_fkey') THEN
    ALTER TABLE public.couriers
      ADD CONSTRAINT couriers_zone_id_fkey
      FOREIGN KEY (zone_id) REFERENCES public.delivery_zones(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'couriers_user_id_fkey') THEN
    ALTER TABLE public.couriers
      ADD CONSTRAINT couriers_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'couriers_status_check') THEN
    ALTER TABLE public.couriers
      ADD CONSTRAINT couriers_status_check
      CHECK (status IN ('available','busy','offline')) NOT VALID;
  END IF;
END $$;

ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on couriers" ON public.couriers;
DROP POLICY IF EXISTS "couriers staff all" ON public.couriers;
DROP POLICY IF EXISTS "couriers read own" ON public.couriers;

CREATE POLICY "couriers staff all" ON public.couriers
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "couriers read own" ON public.couriers
  FOR SELECT TO authenticated USING (user_id = auth.uid());

INSERT INTO public.couriers (id, name, phone, vehicle, status)
VALUES
  ('dr-1', 'محمود حسانين (أبو رحاب)', '01011500166', 'موتوسيكل دايون', 'available'),
  ('dr-2', 'علي جمال الشريف', '01012345678', 'فيسبا إيطالي', 'available'),
  ('dr-3', 'محمد عبد العال', '01123456789', 'موتوسيكل هوجان', 'available')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8. جدول أقسام وفئات الصيدلية
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
DROP POLICY IF EXISTS "categories public read" ON public.categories;
DROP POLICY IF EXISTS "categories staff write" ON public.categories;
CREATE POLICY "categories public read" ON public.categories
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories staff write" ON public.categories
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

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
-- 9. جدول كتالوج المنتجات والأدوية
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    barcode TEXT,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    category_id TEXT REFERENCES public.categories(id),
    active_ingredient TEXT,
    strength TEXT,
    form TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    strip_price NUMERIC DEFAULT 0,
    old_price NUMERIC,
    stock_boxes INTEGER DEFAULT 10,
    image_url TEXT,
    verified_photo BOOLEAN DEFAULT FALSE,
    requires_rx BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode  ON public.products(barcode);

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on products" ON public.products;
DROP POLICY IF EXISTS "products public read" ON public.products;
DROP POLICY IF EXISTS "products staff write" ON public.products;
CREATE POLICY "products public read" ON public.products
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "products staff write" ON public.products
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ----------------------------------------------------------------------------
-- 10. تفعيل الـ Realtime
-- ----------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','couriers','delivery_zones','products']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
