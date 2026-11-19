# صيدلية بحبح — الدليل الفني والتشغيلي للإصدار الثالث (V3)
## Bahbah Pharmacy V3 Technical & Operational Manual

> **تاريخ التوثيق:** 19 نوفمبر 2026  
> **الإصدار:** Version 3 (Production Final Delivery)  
> **حالة الاختبارات:** اجتياز 100% لكافة بطاريات الفحص والـ QA (Chain Broken: False)

---

## 1. الفروقات الجوهرية بين النسخة السابقة ونسخة V3

| العنصر | النسخة السابقة (Workspace) | النسخة المطورة (V3 Final) |
| :--- | :--- | :--- |
| **مزامنة المخزون** | كتالوج ثابت `real-catalog.json` | أداة ربط حي `tools/inventory-sync/` مع برنامج المحل `Simple Assistant` |
| **ترقيات قاعدة البيانات** | جداول أساسية فقط | **16 ملف ترقية SQL** تغطي الأمان، الصلاحيات، الحصص، والأرشفة |
| **خدمات التمريض** | غير متوفرة | موديول متكامل (`nursing.tsx`, `admin-nursing.tsx`) للزيارات والتمريض المنزلي |
| **تحصيل المناديب** | تسجيل يدوي غير محكم | نظام تسليم وتوريد للخزينة مع تقييم المندوب (`admin-collections.tsx`) |
| **عناوين وتوصيل** | نص بسيط للعنوان | دفتر عناوين العميل، تحديد الموقع الجغرافي، وكود تتبع واتساب فوري |
| **الولاء والشحن المجاني** | شحن مجاني مفتوح أو ثابت | نظام حصص شهرية للرعاية والولاء + حملات شحن مجاني قابلة للتحكم |
| **النسخ الاحتياطي** | يدوي محدود | لوحة تحكم كاملة للنسخ والاسترجاع والأرشفة (`admin-backup.tsx`) |
| **حجم وحالة الكود** | `store.ts` (59KB) / `supabase.ts` (22KB) | `store.ts` (123KB) / `supabase.ts` (77KB) مكتمل الدوال بنسبة 100% |

---

## 2. خريطة ملفات الترقية وترتيب تشغيل SQL في Supabase

يجب تشغيل ملفات الـ SQL في Supabase SQL Editor بهذا الترتيب الإلزامي لضمان التوافق:

1. `warehouse-seed/warehouse-seed.sql`: إنشاء جدول المخزن وبذر البيانات الأولية.
2. `supabase/upgrade-2026-11-19-warehouse-sync.sql`: تجهيز المخزن للمزامنة الخارجية وتفعيل البحث بالباركود.
3. `supabase/upgrade-2026-11-19.sql`: خيارات التغليف الخاص (Discreet Packaging) وفودافون كاش.
4. `supabase/upgrade-2026-11-19-whatsapp-orders.sql`: طلبات الواتساب السريعة وتوليد كود `BH-XXXX`.
5. `supabase/upgrade-2026-11-19-shortage-requests.sql`: طلبات النواقص والبحث بالباركود للعملاء.
6. `supabase/upgrade-2026-11-19-portals-permissions.sql`: هيكل صلاحيات الطاقم وسلسلة حالات الطلبات.
7. `supabase/upgrade-2026-11-19-collections-addresses.sql`: دفتر العناوين ونظام تحصيلات المناديب والتوريد.
8. `supabase/upgrade-2026-11-19-nursing-services.sql`: جداول ومنظومة الخدمات التمريضية المنزلية.
9. `supabase/upgrade-2026-11-19-free-shipping-campaign.sql`: تفعيل إدارة حملات التوصيل المجاني عبر الإدارة.
10. `supabase/upgrade-2026-11-19-loyalty-points.sql`: نظام نقاط ومستويات ولاء العملاء.
11. `supabase/upgrade-2026-11-19-security-layer1.sql`: تأمين القراءة والتعديل لصلاحيات الطاقم وأموال التمريض.
12. `supabase/upgrade-2026-11-19-wiring-fixes.sql`: إصلاح التوصيلات البرمجية ومنع الحفظ الوهمي.
13. `supabase/upgrade-2026-11-19-loyalty-quota.sql`: تحديد حصة التوصيل المجاني الشهرية لمشتركي الرعاية.
14. `supabase/upgrade-2026-11-19-integrity-fixes.sql`: التحقق الإلزامي من سلامة البيانات وقيود الجداول.
15. `supabase/upgrade-2026-11-19-courier-ratings.sql`: تقييم المناديب ونماذج الرسائل السريعة للتواصل.
16. `supabase/upgrade-2026-11-19-security-layer2.sql`: تأمين وعزل باكت الروشتات (Storage Bucket) وفحص الدخل.
17. `supabase/upgrade-2026-11-19-data-archive.sql`: إجراءات التصدير، الاسترجاع، وأرشفة البيانات القديمة.

---

## 3. تشغيل أداة مزامنة المخزون (`inventory-sync`)

توجد الأداة في المجلد `tools/inventory-sync/` وتعمل كالتالي:
- الربط بقاعدة بيانات برنامج المحل (Simple Assistant) بوضع القراءة فقط `mode=ro`.
- تتطلب ضبط متغير البيئة:
  ```cmd
  setx BAHBAH_SERVICE_KEY "YOUR_SUPABASE_SERVICE_ROLE_KEY"
  ```
- تشغيل التجربة:
  ```cmd
  py -3 sync_inventory.py --dry-run
  ```
- التشغيل التلقائي عبر مجدول مهام ويندوز (Windows Task Scheduler) كل 15 دقيقة عبر `run_sync.bat`.

---

## 4. المكونات الجديدة لواجهة المستخدم (React / Next.js)

1. **التمريض والرعاية المنزلية**:
   - `src/components/bahbah/nursing.tsx`: طلب وحجز خدمة تمريضية للعميل.
   - `src/components/bahbah/admin-nursing.tsx`: جدولة الممرضين ومتابعة الزيارات من الإدارة.
2. **المناديب والتحصيل**:
   - `src/components/bahbah/admin-collections.tsx`: متابعة عهدة كل مندوب وتوريد المبالغ المستلمة.
   - `src/components/bahbah/addresses.tsx`: حفظ وإدارة العناوين المتعددة للعميل مع الإحداثيات.
3. **الإدارة والعمليات**:
   - `src/components/bahbah/admin-staff.tsx`: توزيع صلاحيات النظام على الصيادلة والمساعدين والمناديب.
   - `src/components/bahbah/admin-daily.tsx`: تقرير الإغلاق المالي واليومي.
   - `src/components/bahbah/admin-backup.tsx`: شاشة أخذ واستعادة النسخ الاحتياطية.
4. **تجربة المريض**:
   - `src/components/bahbah/patient-timeline.tsx`: السجل الزمني للعلاجات والقياسات.
   - `src/components/bahbah/monthly-reminder.tsx`: منبه الأدوية الشهرية التلقائي.
   - `src/components/bahbah/rx-photo.tsx`: التقاط سريع للروشتات بالكاميرا.
   - `src/components/bahbah/contact-menu.tsx`: قائمة تواصل فوري مباشرة وسريعة.

---

## 5. خطوة التطبيق الموصى بها

لتحديث مساحة العمل الحالية للنسخة V3 بالكامل:
1. استخراج الملفات المحدثة من `bahbah-pharmacy-final-v3.zip` إلى مساحة العمل.
2. تثبيت الحزم إن لزم الأمر وتشغيل البناء `npm run build` للتأكد من خلوه من الأخطاء.
3. تشغيل حزمة ترقيات الـ SQL على مشروع Supabase بالترتيب الموضح أعلاه.
