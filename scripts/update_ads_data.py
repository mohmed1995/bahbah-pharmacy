# -*- coding: utf-8 -*-
"""Upgrade AdSlide interface + adSlides data (Egyptian dialect ad copy, gym slide, code/urgent fields)."""
import io

P = "src/lib/bahbah/data.ts"
s = io.open(P, encoding="utf-8").read()

START = "export interface AdSlide {"
END_MARKER = "/* ------------------------------------------------------------------ */\n/* رعاية بحبح — صناديق العلاج الشهري"
i = s.index(START)
j = s.index(END_MARKER)

NEW = '''export interface AdSlide {
  id: string;
  img: string;
  titleKeyAr: string;
  titleKeyEn: string;
  subKeyAr: string;
  subKeyEn: string;
  ctaKeyAr: string;
  ctaKeyEn: string;
  badgeAr: string;
  badgeEn: string;
  action: "catalog" | "offers" | "care" | "wasly" | "category";
  category?: string;
  tone: "blue" | "orange" | "green" | "sand" | "sky";
  /** كود خصم بيظهر كشريحة نسخ على البانر */
  code?: string;
  /** عدّاد تنازلي حي لحد آخر اليوم */
  urgent?: boolean;
}

export const adSlides: AdSlide[] = [
  {
    id: "ad-offers",
    img: "/images/ads/ad-offers.png",
    titleKeyAr: "عروض بتحرق.. والكود شغّال",
    titleKeyEn: "Hot deals — code works now",
    subKeyAr: "خصم حقيقي لحد 40% على أدوية وفيتامينات ومكملات أصلية",
    subKeyEn: "Real discounts up to 40% on medicines, vitamins & supplements",
    ctaKeyAr: "اتفرج واطلب",
    ctaKeyEn: "Shop the deals",
    badgeAr: "الحقها قبل ما تخلص",
    badgeEn: "Ends soon",
    action: "offers",
    tone: "orange",
    code: "BAHBAH10",
    urgent: true,
  },
  {
    id: "ad-gym",
    img: "/images/ads/ad-gym.png",
    titleKeyAr: "ركن الجيم عند بحبح",
    titleKeyEn: "Bahbah Gym Corner",
    subKeyAr: "كرياتين، بروتين، تخسيس، تسمين — أصلي 100% ومن المخزن على طول",
    subKeyEn: "Creatine, protein, burners & gainers — 100% original, in stock",
    ctaKeyAr: "اتفرج على حاجات الجيم",
    ctaKeyEn: "Shop gym gear",
    badgeAr: "وصل جديد",
    badgeEn: "Just arrived",
    action: "category",
    category: "fitness",
    tone: "blue",
  },
  {
    id: "ad-wasly",
    img: "/images/ads/ad-wasly.png",
    titleKeyAr: "دواك عند باب البيت",
    titleKeyEn: "Your meds at your door",
    subKeyAr: "جوة ديروط خلال 30 دقيقة — وتتابع المنديوب لحظة بلحظة",
    subKeyEn: "Inside Deirout within 30 min — track your courier live",
    ctaKeyAr: "اطلب دلوقتي",
    ctaKeyEn: "Order now",
    badgeAr: "واصلي أسرع",
    badgeEn: "Wasly express",
    action: "catalog",
    tone: "blue",
  },
  {
    id: "ad-monthly",
    img: "/images/ads/ad-monthly.png",
    titleKeyAr: "صندوقك الشهري.. جاهز",
    titleKeyEn: "Your monthly box — ready",
    subKeyAr: "كرياتين وبروتين ومكملاتك كاملة كل شهر — أرخص ما تحشره لوحدك",
    subKeyEn: "Creatine, whey & supplements monthly — cheaper than buying apart",
    ctaKeyAr: "جهّز صندوقك",
    ctaKeyEn: "Build my box",
    badgeAr: "الأشهر للجيمرز",
    badgeEn: "Gym favorite",
    action: "care",
    tone: "orange",
  },
  {
    id: "ad-skin",
    img: "/images/ads/ad-skin.png",
    titleKeyAr: "بشرتك تحتاج روتين",
    titleKeyEn: "Your skin needs a routine",
    subKeyAr: "أقوى الماركات العالمية بأسعار الصيدلية — أصلي 100%",
    subKeyEn: "Top global brands at pharmacy prices — 100% original",
    ctaKeyAr: "اكتشف المنتجات",
    ctaKeyEn: "Discover",
    badgeAr: "عناية راقية",
    badgeEn: "Premium care",
    action: "category",
    category: "skincare",
    tone: "sand",
  },
  {
    id: "ad-baby",
    img: "/images/ads/ad-baby.png",
    titleKeyAr: "أم وطفل — كل اللي بيبى محتاجه",
    titleKeyEn: "Mother & Baby essentials",
    subKeyAr: "حفاضات، حليب، وكل مستلزمات بيبى من مكان واحد",
    subKeyEn: "Diapers, formula and all baby needs in one place",
    ctaKeyAr: "اطلب من القسم",
    ctaKeyEn: "Order now",
    badgeAr: "كميات عائلية",
    badgeEn: "Family packs",
    action: "category",
    category: "baby",
    tone: "sky",
  },
};

'''

s = s[:i] + NEW + s[j:]
io.open(P, "w", encoding="utf-8").write(s)
print("adSlides upgraded OK")
