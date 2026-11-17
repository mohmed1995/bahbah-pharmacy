import { Baby, Bone, Wind, Dumbbell, Flame } from "lucide-react";
import realCatalogData from "./real-catalog.json";
import {
  IconCapsule,
  IconVitaminTube,
  IconDropletPlus,
  IconCreamJar,
  IconBabyBottle,
  IconStethoscope,
  IconHeartPulse,
  IconTooth,
  IconSoap,
  IconMask,
  IconThermo,
  IconBPDevice,
  IconInhaler,
  IconAllergy,
  IconSunScreen,
  IconScooter,
  IconVan,
  IconPin,
  IconRoute,
  IconClockFast,
  IconWallet,
  IconGift,
  IconStorefront,
  IconPharmacist,
  IconShieldCross,
  IconMedal,
  type IconType,
} from "@/components/bahbah/icons";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: IconType;
  tint: string; // soft bg
  color: string; // strong icon color
  img: string; // AI product photo — big-company look
}

export interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  brandAr: string;
  brandEn: string;
  category: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  ingredientAr: string;
  ingredientEn: string;
  formAr: string;
  formEn: string;
  rx: boolean;
  stock: number;
  expiry: string; // ISO date — used by admin expiry alerts
  descAr: string;
  descEn: string;
  warnAr?: string;
  warnEn?: string;
  icon: IconType;
  img?: string; // AI packshot — falls back to duotone icon stage
  verifiedPhoto?: boolean; // True only when the medicine photo is physically authentic & verified
  tags: ("offer" | "best" | "new")[];
}

export interface OrderItem {
  productId: string;
  nameAr: string;
  nameEn: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  date: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "shipping" | "delivered" | "cancelled";
  customerAr: string;
  customerEn: string;
  phone: string;
  address: string;
  payment: string;
  mine?: boolean;
  coupon?: string;
  discount?: number;
  delivery?: OrderDelivery;
}

export interface OrderDelivery {
  type: "delivery" | "pickup";
  zoneId?: string;
  zoneNameAr?: string;
  zoneNameEn?: string;
  slotAr?: string;
  slotEn?: string;
  driverId?: string;
  fee?: number;
}

export interface AppUser {
  name: string;
  email: string;
  phone?: string;
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export const categories: Category[] = [
  {
    id: "medicines",
    nameAr: "أدوية",
    nameEn: "Medicines",
    icon: IconCapsule,
    tint: "bg-[#EAF2FA]",
    color: "text-[#184C8A]",
    img: "/images/cats/cat-medicines.png",
  },
  {
    id: "vitamins",
    nameAr: "فيتامينات ومكملات",
    nameEn: "Vitamins & Supplements",
    icon: IconVitaminTube,
    tint: "bg-[#FFFBEB]",
    color: "text-[#D97706]",
    img: "/images/cats/cat-vitamins.png",
  },
  {
    id: "skincare",
    nameAr: "العناية بالبشرة",
    nameEn: "Skin Care",
    icon: IconCreamJar,
    tint: "bg-[#FFF1F2]",
    color: "text-[#BE185D]",
    img: "/images/cats/cat-skincare.png",
  },
  {
    id: "baby",
    nameAr: "الأم والطفل",
    nameEn: "Mother & Baby",
    icon: IconBabyBottle,
    tint: "bg-[#ECFDF5]",
    color: "text-[#059669]",
    img: "/images/cats/cat-baby.png",
  },
  {
    id: "devices",
    nameAr: "أجهزة طبية",
    nameEn: "Medical Devices",
    icon: IconStethoscope,
    tint: "bg-[#F1F5F9]",
    color: "text-[#0B1E38]",
    img: "/images/cats/cat-devices.png",
  },
  {
    id: "personal",
    nameAr: "العناية الشخصية",
    nameEn: "Personal Care",
    icon: IconSoap,
    tint: "bg-[#F0F9FF]",
    color: "text-[#0284C7]",
    img: "/images/cats/cat-personal.png",
  },
  {
    id: "fitness",
    nameAr: "تغذية الجيم",
    nameEn: "Sports Nutrition",
    icon: Dumbbell,
    tint: "bg-[#FFF7ED]",
    color: "text-[#EA580C]",
    img: "/images/cats/cat-fitness.png",
  },
];

/* ------------------------------------------------------------------ */
/* Wasly — Bahbah in-house delivery fleet (big-company system)         */
/* ------------------------------------------------------------------ */

export const WASLY = {
  nameAr: "واصلي",
  nameEn: "Wasly",
  tagAr: "أسطول توصيل بحبح",
  tagEn: "Bahbah delivery fleet",
  expressMin: 30,
  hotline: "+20 101 150 0166",
  whatsapp: "201011500166", // واتساب الصيدلية — الرقم الحقيقي
};

export const PHARMACY = {
  cityAr: "ديروط",
  cityEn: "Dairut",
  govAr: "أسيوط",
  govEn: "Assiut",
  /* العنوان الحقيقي الكامل */
  addressAr: "تقسيم أبو جبل — خلف مساكن الضباط، ديروط، أسيوط",
  addressEn: "Taqseem Abu Gabal — Behind Officers' Housing, Dairut, Assiut",
  addressFullAr: "جمهورية مصر العربية – محافظة أسيوط – مركز ديروط – منطقة تقسيم أبو جبل – خلف مساكن الضباط",
  addressFullEn: "Egypt – Assiut Governorate – Dairut Center – Taqseem Abu Gabal Area – Behind Officers' Housing",
  phone1: "+20 101 150 0166",
  phone2: "+20 155 253 3484",
  phone1Href: "+201011500166",
  phone2Href: "+201552533484",
  facebook: "https://www.facebook.com/profile.php?id=61572292605050",
  facebookLabel: "Bahbah Pharmacy",
};

/* الحقوق — شركة التطوير */
export const DOCTOR_TECH = {
  nameAr: "شركة دكتور تك",
  nameEn: "Doctor Tech",
  phone: "+20 101 743 4376",
  phoneHref: "+201017434376",
};

/* ------------------------------------------------------------------ */
/* Roles & accounts (demo auth with permissions)                       */
/* ------------------------------------------------------------------ */

export type Role = "patient" | "courier" | "pharmacist" | "admin";

export const ROLE_META: Record<Role, { ar: string; en: string }> = {
  patient: { ar: "مريض", en: "Patient" },
  courier: { ar: "مندوب", en: "Courier" },
  pharmacist: { ar: "صيدلي", en: "Pharmacist" },
  admin: { ar: "إدارة", en: "Admin" },
};

/** حسابات الطاقم المعتمدة للصيدلية */
export const STAFF_ACCOUNTS: {
  email: string;
  nameAr: string;
  nameEn: string;
  role: Exclude<Role, "patient">;
  driverId?: string;
}[] = [
  {
    email: "courier@bahbah.eg",
    nameAr: "محمود سيد — أسطول واصلي",
    nameEn: "Mahmoud Sayed — Wasly Courier Fleet",
    role: "courier",
    driverId: "dr-1",
  },
  {
    email: "hashem@bahbah.eg",
    nameAr: "د. هاشم بحبح — صاحب الصيدلية ورئيس الصيادلة",
    nameEn: "Dr. Hashem Bahbah — Pharmacy Owner & Head Pharmacist",
    role: "pharmacist",
  },
  {
    email: "admin@bahbah.eg",
    nameAr: "المهندس التقني — إدارة نظم بحبح",
    nameEn: "Systems Engineer — Bahbah Operations Admin",
    role: "admin",
  },
];

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

const featuredProducts: Product[] = [
  {
    id: "cosm-limitless",
    nameAr: "ليمتلس ومان ماكس 30 قرص",
    nameEn: "Limitless Woman Max 30 Tablets",
    brandAr: "Limitless Naturals",
    brandEn: "Limitless Naturals",
    category: "vitamins",
    price: 210,
    oldPrice: 265,
    rating: 4.9,
    reviews: 142,
    ingredientAr: "26 عنصر وفيتامين ومعادن أساسية للمرأة",
    ingredientEn: "26 Essential Multivitamins & Minerals for Women",
    formAr: "أقراص — 30 قرص",
    formEn: "Tablets — 30 pcs",
    rx: false,
    stock: 50,
    expiry: "2027-10-31",
    descAr: "تركيبة غذائية متكاملة لتعزيز صحة وحيوية المرأة والشعر والبشرة والأظافر والمناعة اليومية.",
    descEn: "Complete nutritional formula to boost women's energy, hair, skin, nails and daily immunity.",
    icon: IconVitaminTube,
    img: "/images/offers/cropped-limitless-woman.jpg",
    tags: ["offer", "best"],
  },
  {
    id: "cosm-melatex",
    nameAr: "حياة ميلاتكس غسول 200 مل",
    nameEn: "Hayah Melatex Cleanser 200ml",
    brandAr: "Hayah Laboratories",
    brandEn: "Hayah Laboratories",
    category: "skincare",
    price: 210,
    oldPrice: 245,
    rating: 4.8,
    reviews: 98,
    ingredientAr: "تركيبة تفتيح وتقشير لطيف خالية من الصابون",
    ingredientEn: "Gentle Soap-Free Brightening Cleanser",
    formAr: "غسول رغوي — 200 مل",
    formEn: "Foam Cleanser — 200ml",
    rx: false,
    stock: 45,
    expiry: "2027-08-30",
    descAr: "غسول تفتيح يومي يعمل على توحيد لون البشرة وإزالة التصبغات الزائدة وتجديد خلايا الوجه بلطف.",
    descEn: "Daily brightening cleanser that unifies skin tone and gently exfoliates dark spots.",
    icon: IconCreamJar,
    img: "/images/offers/cropped-mega-1.jpg",
    tags: ["offer", "best"],
  },
  {
    id: "cosm-vacation",
    nameAr: "فاكيشن سيروم فيتامين سي 10% نقي 30 مل",
    nameEn: "Vacation Vitamin C 10% Pure Serum 30ml",
    brandAr: "Vacation",
    brandEn: "Vacation",
    category: "skincare",
    price: 390,
    oldPrice: 475,
    rating: 4.9,
    reviews: 76,
    ingredientAr: "فيتامين C نقي 10% + هيالورونيك أسيد",
    ingredientEn: "Pure Vitamin C 10% + Hyaluronic Acid",
    formAr: "سيروم قطارة — 30 مل",
    formEn: "Serum Dropper — 30ml",
    rx: false,
    stock: 35,
    expiry: "2027-11-30",
    descAr: "سيروم النضارة ومكافحة الأكسدة والتجاعيد مع تركيز 10% فيتامين سي نقي لبشرة مشدودة ومشرقة.",
    descEn: "Antioxidant & radiance serum with 10% pure Vitamin C for firm, radiant and even skin tone.",
    icon: IconCreamJar,
    img: "/images/offers/cropped-vacation.jpg",
    tags: ["offer", "best"],
  },
  {
    id: "cosm-starville",
    nameAr: "ستارفيل سيروم فيتامين سي 30 مل",
    nameEn: "Starville Vitamin C Serum 30ml",
    brandAr: "Starville",
    brandEn: "Starville",
    category: "skincare",
    price: 280,
    oldPrice: 320,
    rating: 4.7,
    reviews: 110,
    ingredientAr: "فيتامين C + كولاجين نباتي + خلاصة العرقسوس",
    ingredientEn: "Vitamin C + Marine Collagen + Licorice Extract",
    formAr: "سيروم قطارة — 30 مل",
    formEn: "Serum Dropper — 30ml",
    rx: false,
    stock: 40,
    expiry: "2027-09-30",
    descAr: "تفتيح وترطيب ونضارة فورية وتخفيف التصبغات وإعادة مرونة ونقاء البشرة.",
    descEn: "Instant brightening and hydration to reduce pigmentation and restore skin suppleness.",
    icon: IconCreamJar,
    img: "/images/offers/cropped-starville.jpg",
    tags: ["offer", "best"],
  },
  {
    id: "cosm-litup",
    nameAr: "ليت أب غسول الوجه 200 مل",
    nameEn: "Lit Up Facial Cleanser 200ml",
    brandAr: "Macro Group",
    brandEn: "Macro Group",
    category: "skincare",
    price: 190,
    oldPrice: 220,
    rating: 4.6,
    reviews: 84,
    ingredientAr: "فيتامين C و E + شاي أخضر + خلاصة العرقسوس",
    ingredientEn: "Vitamin C & E + Green Tea + Licorice Extract",
    formAr: "غسول سائل — 200 مل",
    formEn: "Liquid Cleanser — 200ml",
    rx: false,
    stock: 60,
    expiry: "2027-12-31",
    descAr: "تنظيف عميق وإزالة الشوائب والزيوت الزائدة وتفتيح طبيعي للبشرة دون التسبب في الجفاف.",
    descEn: "Deep cleansing, oil control and natural skin brightening without dryness.",
    icon: IconSoap,
    img: "/images/offers/cropped-litup.jpg",
    tags: ["offer"],
  },
  {
    id: "cosm-tetraglow",
    nameAr: "تيتراجلو كريم تفتيح وتوحيد لون البشرة 50 جم",
    nameEn: "Tetraglow Brightening Cream 50g",
    brandAr: "Tetraglow",
    brandEn: "Tetraglow",
    category: "skincare",
    price: 185,
    oldPrice: 220,
    rating: 4.7,
    reviews: 65,
    ingredientAr: "أربوتين + نياسيناميد + خلاصة التوت البري",
    ingredientEn: "Arbutin + Niacinamide + Mulberry Extract",
    formAr: "كريم أنبوب — 50 جم",
    formEn: "Cream Tube — 50g",
    rx: false,
    stock: 45,
    expiry: "2027-08-31",
    descAr: "كريم فعال لتفتيح البقع الداكنة وتوحيد لون البشرة وحمايتها من أضرار الجذور الحرة.",
    descEn: "Effective brightening cream for dark spots and even complexion with antioxidant protection.",
    icon: IconCreamJar,
    img: "/images/offers/cropped-tetraglow-cream.jpg",
    tags: ["offer"],
  },
  {
    id: "panadol-extra",
    nameAr: "بنادول إكسترا 48 قرص",
    nameEn: "Panadol Extra 48 Tablets",
    brandAr: "GSK",
    brandEn: "GSK",
    category: "medicines",
    price: 48,
    oldPrice: 56,
    rating: 4.8,
    reviews: 312,
    ingredientAr: "باراسيتامول + كافيين",
    ingredientEn: "Paracetamol + Caffeine",
    formAr: "أقراص — 48 قرص",
    formEn: "Tablets — 48 pcs",
    rx: false,
    stock: 120,
    expiry: "2027-08-31",
    descAr: "مسكن قوي وسريع للصداع وآلام الأسنان والمفاصل وآلام الدورة الشهرية.",
    descEn: "Fast, effective relief for headaches, toothache, muscle and joint pain.",
    warnAr: "لا تتجاوز 8 أقراص في 24 ساعة.",
    warnEn: "Do not exceed 8 tablets in 24 hours.",
    icon: IconCapsule,
    img: "/images/products/1087.jpg",
    verifiedPhoto: true,
    tags: ["best"],
  },
  {
    id: "brufen-400",
    nameAr: "بروفين 600 مجم 30 قرص",
    nameEn: "Brufen 600mg 30 Tablets",
    brandAr: "Abbott",
    brandEn: "Abbott",
    category: "medicines",
    price: 45,
    rating: 4.7,
    reviews: 240,
    ingredientAr: "إيبوبروفين 600 مجم",
    ingredientEn: "Ibuprofen 600mg",
    formAr: "أقراص — 30 قرص",
    formEn: "Tablets — 30 pcs",
    rx: false,
    stock: 85,
    expiry: "2027-05-31",
    descAr: "مضاد التهاب غير ستيرويدي لمخاطبة آلام الروماتيزم والمفاصل والصداع وخفض الحرارة.",
    descEn: "NSAID for rheumatic pain, joint inflammation, and fever reduction.",
    warnAr: "يؤخذ بعد الأكل مباشرة.",
    warnEn: "Take after meals.",
    icon: IconCapsule,
    img: "/images/products/1090.jpg",
    verifiedPhoto: true,
    tags: ["best"],
  },
  {
    id: "augmentin-1g",
    nameAr: "أوجمنتين معلق 457 مجم 70 مل",
    nameEn: "Augmentin 457mg Suspension 70ml",
    brandAr: "GSK",
    brandEn: "GSK",
    category: "medicines",
    price: 75,
    rating: 4.9,
    reviews: 198,
    ingredientAr: "أموكسيسيلين + كلافولانيك أسيد",
    ingredientEn: "Amoxicillin + Clavulanic Acid",
    formAr: "معلق شراب — 70 مل",
    formEn: "Suspension — 70 ml",
    rx: true,
    stock: 40,
    expiry: "2026-12-15",
    descAr: "مضاد حيوي واسع الطيف لعلاج التهابات الحلق والجيوب الأنفية والصدر.",
    descEn: "Broad-spectrum antibiotic for throat, sinus, and chest infections.",
    warnAr: "يصرف بإشراف صيدلي أو تذكرة طبية.",
    warnEn: "Prescription only.",
    icon: IconShieldCross,
    img: "/images/products/2599.jpg",
    verifiedPhoto: true,
    tags: [],
  },
  {
    id: "antinal",
    nameAr: "أنتينال 200 مجم 24 كبسول",
    nameEn: "Antinal 200mg 24 Capsules",
    brandAr: "Amoun",
    brandEn: "Amoun",
    category: "medicines",
    price: 36,
    rating: 4.8,
    reviews: 156,
    ingredientAr: "نيفوروكسازيد 200 مجم",
    ingredientEn: "Nifuroxazide 200mg",
    formAr: "كبسولات — 24 كبسولة",
    formEn: "Capsules — 24 pcs",
    rx: false,
    stock: 200,
    expiry: "2027-10-30",
    descAr: "مطهر معوي واسع المدى لعلاج الإسهال والنزلات المعوية.",
    descEn: "Intestinal antiseptic for diarrhea and gastroenteritis.",
    icon: IconCapsule,
    img: "/images/products/1447.jpg",
    verifiedPhoto: true,
    tags: [],
  },
  {
    id: "congestal",
    nameAr: "كونجستال شراب 120 مل",
    nameEn: "Congestal Syrup 120ml",
    brandAr: "Sigma",
    brandEn: "Sigma",
    category: "medicines",
    price: 30,
    rating: 4.7,
    reviews: 132,
    ingredientAr: "باراسيتامول + كلورفينامين + سودوإيفيدرين",
    ingredientEn: "Paracetamol + Chlorpheniramine + Pseudoephedrine",
    formAr: "شراب — 120 مل",
    formEn: "Syrup — 120 ml",
    rx: false,
    stock: 150,
    expiry: "2027-03-31",
    descAr: "علاج متكامل لنزلات البرد والرشح واحتقان الجيوب الأنفية.",
    descEn: "Complete relief for common cold, runny nose, and sinus congestion.",
    warnAr: "قد يسبب نعاس بسيط.",
    warnEn: "May cause mild drowsiness.",
    icon: Wind,
    img: "/images/products/2504.jpg",
    verifiedPhoto: true,
    tags: [],
  },
  {
    id: "ventolin-inhaler",
    nameAr: "فنتولين ايفوهيلر 100 مكجم بخاخ",
    nameEn: "Ventolin Evohaler 100mcg",
    brandAr: "GSK",
    brandEn: "GSK",
    category: "medicines",
    price: 95,
    rating: 4.9,
    reviews: 187,
    ingredientAr: "سالبوتامول 100 مكجم",
    ingredientEn: "Salbutamol 100mcg",
    formAr: "بخاخ — 200 بخة",
    formEn: "Inhaler — 200 puffs",
    rx: true,
    stock: 25,
    expiry: "2026-09-20",
    descAr: "موسع سريع للشعب الهوائية لعلاج أزمات الربو وضيق التنفس.",
    descEn: "Fast bronchodilator for asthma relief and breathing ease.",
    warnAr: "يصرف بروشتة أو متابعة طبية منتظمة.",
    warnEn: "Prescription only.",
    icon: IconInhaler,
    img: "/images/products/1929.jpg",
    verifiedPhoto: true,
    tags: [],
  },
  {
    id: "telfast-180",
    nameAr: "تلفاست شراب 100 مل",
    nameEn: "Telfast Syrup 100ml",
    brandAr: "Sanofi",
    brandEn: "Sanofi",
    category: "medicines",
    price: 45,
    rating: 4.8,
    reviews: 264,
    ingredientAr: "فيكسوفينادين 30 مجم / 5 مل",
    ingredientEn: "Fexofenadine 30mg/5ml",
    formAr: "شراب — 100 مل",
    formEn: "Syrup — 100 ml",
    rx: false,
    stock: 75,
    expiry: "2027-07-31",
    descAr: "مضاد هيستامين لعلاج حساسية الأنف والجلد والعطس.",
    descEn: "Antihistamine for allergic rhinitis and skin allergies.",
    icon: IconCapsule,
    img: "/images/products/2557.jpg",
    verifiedPhoto: true,
    tags: ["best"],
  },
  {
    id: "vitamin-c-1000",
    nameAr: "فيتامين سي 1000 فوار",
    nameEn: "Vitamin C 1000 Effervescent",
    brandAr: "Pharco",
    brandEn: "Pharco",
    category: "vitamins",
    price: 85,
    oldPrice: 110,
    rating: 4.7,
    reviews: 221,
    ingredientAr: "حمض الأسكوربيك",
    ingredientEn: "Ascorbic Acid",
    formAr: "أقراص فوارة — 20 قرص",
    formEn: "Effervescent — 20 pcs",
    rx: false,
    stock: 140,
    expiry: "2027-06-30",
    descAr: "يدعم المناعة وامتصاص الحديد، ونشاط مضاد للأكسدة يوميًا بطعم البرتقال اللذيذ.",
    descEn: "Immune support, iron absorption and daily antioxidant boost with a tasty orange flavor.",
    icon: IconVitaminTube,
    img: "/images/products/vitamin-c-1000.png",
    tags: ["offer", "best"],
  },
  {
    id: "omega-3",
    nameAr: "أوميجا 3 للقلب",
    nameEn: "Omega-3 Heart",
    brandAr: "بيريتانز برايد",
    brandEn: "Puritan's Pride",
    category: "vitamins",
    price: 220,
    oldPrice: 265,
    rating: 4.6,
    reviews: 98,
    ingredientAr: "زيت السمك المركز EPA/DHA",
    ingredientEn: "Concentrated Fish Oil EPA/DHA",
    formAr: "كبسولات جيلاتينية — 100 كبسولة",
    formEn: "Softgels — 100 pcs",
    rx: false,
    stock: 55,
    expiry: "2027-11-30",
    descAr: "يدعم صحة القلب والدماغ والمفاصل، مستخلص من أسماك بحرية نقية.",
    descEn: "Supports heart, brain and joint health — sourced from clean deep-sea fish.",
    icon: IconHeartPulse,
    img: "/images/products/2488.jpg",
    verifiedPhoto: true,
    tags: ["offer"],
  },
  {
    id: "vitamin-d3",
    nameAr: "سي ريتارد زنك 20 كبسولة",
    nameEn: "C-Retard Zinc 20 Capsules",
    brandAr: "Hikma",
    brandEn: "Hikma",
    category: "vitamins",
    price: 35,
    rating: 4.9,
    reviews: 210,
    ingredientAr: "فيتامين سي 500 مجم + زنك 5 مجم",
    ingredientEn: "Vitamin C 500mg + Zinc 5mg",
    formAr: "كبسولات — 20 كبسولة",
    formEn: "Capsules — 20 pcs",
    rx: false,
    stock: 90,
    expiry: "2027-06-30",
    descAr: "تركيبة مزدوجة لتقوية المناعة ومقاومة أدوار البرد والإنفلونزا.",
    descEn: "Dual formula boosting immunity and fighting colds.",
    icon: IconCapsule,
    img: "/images/products/2247.jpg",
    verifiedPhoto: true,
    tags: ["best"],
  },
  {
    id: "zinc-plus",
    nameAr: "زنك بلس",
    nameEn: "Zinc Plus",
    brandAr: "إيفا فارما",
    brandEn: "EVA Pharma",
    category: "vitamins",
    price: 65,
    rating: 4.5,
    reviews: 76,
    ingredientAr: "الزنك + فيتامين C",
    ingredientEn: "Zinc + Vitamin C",
    formAr: "أقراص — 30 قرص",
    formEn: "Tablets — 30 pcs",
    rx: false,
    stock: 95,
    expiry: "2027-04-30",
    descAr: "دعم يومي للمناعة وصحة الجلد وسرعة التئام الجروح.",
    descEn: "Daily immunity, skin health and wound healing support.",
    icon: IconShieldCross,
    tags: [],
  },
  {
    id: "feroglobin",
    nameAr: "فيروجلوبين شراب",
    nameEn: "Feroglobin Syrup",
    brandAr: "فيتابيوتكس",
    brandEn: "Vitabiotics",
    category: "vitamins",
    price: 165,
    oldPrice: 190,
    rating: 4.7,
    reviews: 143,
    ingredientAr: "حديد + فيتامينات B و C",
    ingredientEn: "Iron + B & C Vitamins",
    formAr: "شراب — 200 مل",
    formEn: "Syrup — 200 ml",
    rx: false,
    stock: 48,
    expiry: "2026-08-10",
    descAr: "حديد عضوي لطيف على المعدة لعلاج الأنيميا وزيادة الطاقة والتركيز.",
    descEn: "Gentle organic iron for anemia — boosts energy and focus.",
    icon: IconDropletPlus,
    img: "/images/products/2495.jpg",
    verifiedPhoto: true,
    tags: ["offer"],
  },
  {
    id: "folic-acid",
    nameAr: "حمض الفوليك 5 مجم",
    nameEn: "Folic Acid 5mg",
    brandAr: "إيفا فارما",
    brandEn: "EVA Pharma",
    category: "baby",
    price: 22,
    rating: 4.7,
    reviews: 310,
    ingredientAr: "حمض الفوليك",
    ingredientEn: "Folic Acid",
    formAr: "أقراص — 30 قرص",
    formEn: "Tablets — 30 pcs",
    rx: false,
    stock: 160,
    expiry: "2027-12-31",
    descAr: "أساسي قبل الحمل وفي الشهور الأولى لوقاية الجنين من تشوهات الأنبوب العصبي.",
    descEn: "Essential pre-pregnancy and in the first trimester to protect against neural tube defects.",
    icon: Baby,
    tags: [],
  },
  {
    id: "cerave-cream",
    nameAr: "بيبانثين كريم مرطب 30 جم",
    nameEn: "Bepanthen Moisturizer Cream 30g",
    brandAr: "Bayer",
    brandEn: "Bayer",
    category: "skincare",
    price: 90,
    rating: 4.9,
    reviews: 180,
    ingredientAr: "ديكسبانثينول مرطب ومرمم للبشرة",
    ingredientEn: "Dexpanthenol skin moisturizer & repair",
    formAr: "كريم — 30 جم",
    formEn: "Cream — 30g",
    rx: false,
    stock: 65,
    expiry: "2027-11-30",
    descAr: "كريم طبي مرطب للبشرة الجافة والتسلخات وتجديد الخلايا.",
    descEn: "Medical moisturizer cream for dry skin and skin repair.",
    icon: IconCreamJar,
    img: "/images/products/2877.jpg",
    verifiedPhoto: true,
    tags: ["best"],
  },
  {
    id: "whey-gold",
    nameAr: "واي بروتين جولد ستاندرد",
    nameEn: "Gold Standard Whey",
    brandAr: "Optimum Nutrition",
    brandEn: "Optimum Nutrition",
    category: "fitness",
    price: 780,
    oldPrice: 890,
    rating: 4.9,
    reviews: 341,
    ingredientAr: "بروتين مصل اللبن المعزول + BCAA كاملة",
    ingredientEn: "Whey protein isolate + full BCAA profile",
    formAr: "بودرة — 454 جم / 14 جرعة",
    formEn: "Powder — 454g / 14 servings",
    rx: false,
    stock: 48,
    expiry: "2027-12-31",
    descAr: "أشهر واي في العالم بجدارة — 24 جم بروتين نضيف في كل سكوب، يمتص بسرعة بعد التمرين ويبني العضل من غير دهون زيادة. طعم الشوكولاتة تحفة.",
    descEn: "The world's favorite whey — 24g clean protein per scoop, fast post-workout absorption, lean muscle gains.",
    warnAr: "بيحتوي على لبن — للي عندهم حساسية من اللاكتوز يبدأوا بجرعة نص سكوب.",
    warnEn: "Contains milk — lactose-sensitive users should start with half a scoop.",
    icon: IconCapsule,
    img: "/images/products/whey-gold.png",
    tags: ["best", "offer"],
  },
  {
    id: "mass-gainer",
    nameAr: "ماس جينر للتسمين والكتلة",
    nameEn: "Hyper Mass Gainer",
    brandAr: "Biotech USA",
    brandEn: "Biotech USA",
    category: "fitness",
    price: 690,
    oldPrice: 790,
    rating: 4.7,
    reviews: 176,
    ingredientAr: "كارب معقد + بروتين متعدد المصادر + فيتامينات",
    ingredientEn: "Complex carbs + multi-source protein + vitamins",
    formAr: "بودرة — 1.5 كجم",
    formEn: "Powder — 1.5 kg",
    rx: false,
    stock: 45,
    expiry: "2027-11-30",
    descAr: "للي وزنه صعب يزيد مهما أكل — كالوريز نضيفة بالبروتين والكارب الصح، تتحول لكتلة عضلية مش بطن. سكوبين باللبن بعد التمرين وبين الوجبات.",
    descEn: "For hard-gainers — clean calories with quality protein and carbs that build muscle, not belly. Two scoops with milk around training.",
    icon: Dumbbell,
    img: "/images/products/mass-gainer.png",
    tags: ["best", "offer"],
  },
  {
    id: "bcaa-5000",
    nameAr: "بي سي أي أي 2:1:1",
    nameEn: "BCAA 2:1:1",
    brandAr: "Scitec",
    brandEn: "Scitec",
    category: "fitness",
    price: 380,
    rating: 4.6,
    reviews: 132,
    ingredientAr: "لوسين + آيزولوسين + فالين بنسبة 2:1:1",
    ingredientEn: "Leucine + Isoleucine + Valine at 2:1:1",
    formAr: "بودرة — 250 جم",
    formEn: "Powder — 250g",
    rx: false,
    stock: 55,
    expiry: "2027-09-30",
    descAr: "حماية العضل من التكسير أثناء الدايت والتمارين الطويلة، واستشفاء أسرع بعد التمرين. سيبه في الشاكر واشربه على طول التمرين.",
    descEn: "Protects muscle during cutting and long sessions, speeds up recovery. Sip throughout your workout.",
    icon: IconVitaminTube,
    img: "/images/products/bcaa-5000.png",
    tags: [],
  },
  {
    id: "l-carnitine-3000",
    nameAr: "إل كارنيتين 3000",
    nameEn: "L-Carnitine 3000",
    brandAr: "Amix",
    brandEn: "Amix",
    category: "fitness",
    price: 350,
    oldPrice: 420,
    rating: 4.7,
    reviews: 198,
    ingredientAr: "إل كارنيتين 3000 مجم لكل أمبول",
    ingredientEn: "L-carnitine 3000mg per ampoule",
    formAr: "أمبولات سايلة — 20 أمبول",
    formEn: "Liquid ampoules — 20 pcs",
    rx: false,
    stock: 70,
    expiry: "2027-08-31",
    descAr: "بيعلى الجسم يحرق الدهون كوقود بدل العضل — أمبول قبل التمرين بنص ساعة ومعاه كارديو نضيف، النتيجة تبان من تالت أسبوعين مع دايت كويس.",
    descEn: "Helps the body burn fat as fuel instead of muscle — one ampoule 30 min before cardio with a clean diet.",
    icon: IconDropletPlus,
    img: "/images/products/l-carnitine-3000.png",
    tags: ["offer"],
  },
  {
    id: "fat-burner",
    nameAr: "حارق دهون ثيرموجينيك",
    nameEn: "Thermo Fat Burner",
    brandAr: "MuscleTech",
    brandEn: "MuscleTech",
    category: "fitness",
    price: 285,
    oldPrice: 340,
    rating: 4.5,
    reviews: 164,
    ingredientAr: "كارنيتين + شاي أخضر + كافيين طبيعي",
    ingredientEn: "Carnitine + green tea + natural caffeine",
    formAr: "كبسولات — 60 كبسولة",
    formEn: "Capsules — 60 pcs",
    rx: false,
    stock: 65,
    expiry: "2027-10-31",
    descAr: "تركيبة بترفع الحرق وتقلل الشهية في نفس الوقت — كبسولة الصبح قبل الفطار وكبسولة قبل التمرين، ومتعكسش بعد الساعة 6 العصر.",
    descEn: "Raises thermogenesis and curbs appetite — one capsule before breakfast and one pre-workout. Avoid late-evening doses.",
    warnAr: "فيه كافيين — مينفعش مع قهوة جمر بنفس الوقت، وممنوع للحامل والمرضع.",
    warnEn: "Contains caffeine — do not stack with strong coffee. Not for pregnant or nursing women.",
    icon: IconCapsule,
    img: "/images/products/fat-burner.png",
    tags: ["new", "offer"],
  },
  {
    id: "pre-workout",
    nameAr: "بري وركاوت مضخة",
    nameEn: "Pre-Workout Booster",
    brandAr: "Biotech USA",
    brandEn: "Biotech USA",
    category: "fitness",
    price: 540,
    rating: 4.8,
    reviews: 149,
    ingredientAr: "سيترولين مالات + بيتا ألانين + كافيين",
    ingredientEn: "Citrulline malate + beta-alanine + caffeine",
    formAr: "بودرة — 300 جم / 30 جرعة",
    formEn: "Powder — 300g / 30 servings",
    rx: false,
    stock: 40,
    expiry: "2028-02-28",
    descAr: "مضخة دم جامدة وتركيز عالي — نص سكوب قبل التمرين بنص ساعة وهتلاقي نفسك تاخد أوزان أتقل وتمرين أطول من غير إرهاق.",
    descEn: "Serious pump and laser focus — half a scoop 30 minutes pre-workout for heavier lifts and longer sessions.",
    warnAr: "التنميل الخفيف من البيتا ألانين طبيعي ويروح لوحده. متستخدمش قبل النوم.",
    warnEn: "Mild tingling from beta-alanine is normal. Do not take before bedtime.",
    icon: IconHeartPulse,
    img: "/images/products/pre-workout.png",
    tags: ["new"],
  },
  {
    id: "multivitamin-sport",
    nameAr: "ملتي فيتامين للرياضيين",
    nameEn: "Sport Multivitamin",
    brandAr: "Universal",
    brandEn: "Universal",
    category: "fitness",
    price: 235,
    rating: 4.6,
    reviews: 117,
    ingredientAr: "25 فيتامين ومعدن + أحماض أمينية",
    ingredientEn: "25 vitamins & minerals + amino complex",
    formAr: "كبسولات — 60 كبسولة",
    formEn: "Capsules — 60 pcs",
    rx: false,
    stock: 80,
    expiry: "2027-12-31",
    descAr: "الأساس اللي كتير بينساه — جسم بيتدرب محتاج فيتامينات أتول، كبسولة يوميًا بعد الفطار تقيك الإرهاق وتساند المناعة طول الشهر.",
    descEn: "The base everyone skips — one daily capsule covers training needs, fights fatigue and supports immunity.",
    icon: IconVitaminTube,
    img: "/images/products/multivitamin-sport.png",
    tags: [],
  },
  {
    id: "protein-bar",
    nameAr: "بروتين بار — 6 حبات",
    nameEn: "Protein Bar — 6 pack",
    brandAr: "Weider",
    brandEn: "Weider",
    category: "fitness",
    price: 180,
    oldPrice: 210,
    rating: 4.5,
    reviews: 96,
    ingredientAr: "20 جم بروتين لكل بار — سكر قليل",
    ingredientEn: "20g protein per bar — low sugar",
    formAr: "ألواح — 6 ألواح × 50 جم",
    formEn: "Bars — 6 × 50g",
    rx: false,
    stock: 90,
    expiry: "2027-06-30",
    descAr: "السناك اللي بيرفع بروتينك من غير سكر — بار بعد التمرين أو بين المحاضرات والشغل، طعم بيسد شهية الحلويات.",
    descEn: "The snack that feeds your protein goals — post-workout or on the go, tastes like dessert without the sugar.",
    icon: IconCapsule,
    img: "/images/products/protein-bar.png",
    tags: ["new", "offer"],
  },
  {
    id: "shaker-bottle",
    nameAr: "شاكر بحبح 700 مل",
    nameEn: "Bahbah Shaker 700ml",
    brandAr: "صيدلية بحبح",
    brandEn: "Bahbah Pharmacy",
    category: "fitness",
    price: 85,
    oldPrice: 110,
    rating: 4.4,
    reviews: 73,
    ingredientAr: "بلاستيك غذائي خالي من BPA — شبكة خلط ستانلس",
    ingredientEn: "Food-grade BPA-free plastic — stainless mixing grid",
    formAr: "شاكر — 700 مل",
    formEn: "Shaker — 700 ml",
    rx: false,
    stock: 150,
    expiry: "2029-01-01",
    descAr: "شاكر شيك ومحكم — قفل محكم مش بيسرب في الشنطة وشبكة خلط بتسيل الكرياتين والواي من غير تكتيل.",
    descEn: "A tight, leak-proof shaker with a stainless grid that blends creatine and whey perfectly smooth.",
    icon: IconGift,
    img: "/images/products/shaker-bottle.png",
    tags: ["new", "offer"],
  },
];

const categoryIconMap: Record<string, IconType> = {
  medicines: IconCapsule,
  vitamins: IconVitaminTube,
  skincare: IconCreamJar,
  baby: IconBabyBottle,
  devices: IconStethoscope,
  personal: IconSoap,
  fitness: Dumbbell,
};

let customProductsGetter: (() => Product[]) | null = null;
export function registerCustomProductsGetter(fn: () => Product[]) {
  customProductsGetter = fn;
}

let customDriversGetter: (() => Driver[]) | null = null;
export function registerCustomDriversGetter(fn: () => Driver[]) {
  customDriversGetter = fn;
}

const mappedRealProducts: Product[] = (realCatalogData as any[]).map((p) => {
  let cat = p.category;
  const name = (p.nameAr || "").toLowerCase();

  // 1. Medicines (Syrups, tablets, capsules, drops, inhalers)
  const isMedicine = /شراب|أقراص|كبسول|نقط|أمبول|حقن|مرهم|جل|سبراي|لبوس|فوار|محلول استنشاق|جرعة/i.test(name) && !/فيتامين|كالسيوم|حديد|زنك|أوميجا|مكمل|شاور|غسول/i.test(name);

  // 2. Strict Medical Devices & Hospital Supplies
  const isMedDevice = /اوكسيميتر|جهاز ضغط|قياس ضغط|جهاز سكر|جهاز قياس|ترمومتر|نيبولايزر|قناع جهاز استنشاق|شريط قياس|شرائط قياس|شرائط سكر|شاش طبي|شاش فازلين|قطن طبي|بلاستر طبي|ميزان رقمي|ميزان ديجيتال/i.test(name) && !isMedicine;

  // 3. Personal Care (Hygiene, Bath, Hair Removal, Deodorants, Oral Care)
  const isPersonal = /مزيل عرق|رول اون|معجون اسنان|فرشاة اسنان|فرشاة أسنان|فرشاة تنظيف|شاور|لوفة|حلاقة|فوط صحية|مناديل|مبرد|إزالة الشعر|سويت|شرائح شمع|شمع/i.test(name) || /صابون(ة)?\s*(ديتول|نابلسي|فنيك|كبريت|مغربي)/i.test(name);

  // 4. Baby & Mother Care
  const isBaby = /بامبرز|حفاض|لهاية|ببرونة|سوبر كيدز|أطفال|طفل|شامبو أطفال|زيت أطفال/i.test(name) && !/لوفة/i.test(name);

  // 5. Vitamins & Sports Nutrition
  const isVitamins = /فيتامين|كالسيوم|حديد|زنك|أوميجا|ماغنسيوم|مكمل|رويال جيلي/i.test(name);
  const isFitness = /بروتين|كرياتين|واي بروتين|bcaa|ماس جينر|جلوتامين/i.test(name);

  // 6. Skincare / Hair Cosmetics
  const isSkincare = /غسول|ميسلار|مرطب|سيروم|كريم تفتيح|واقي شمس|صن بلوك|اسكراب|ماسكرا|ماسك|تونر|شعر|بشرة/i.test(name) && !isPersonal && !isBaby;

  if (isMedDevice) {
    cat = "devices";
  } else if (isPersonal) {
    cat = "personal";
  } else if (isBaby) {
    cat = "baby";
  } else if (isFitness) {
    cat = "fitness";
  } else if (isVitamins) {
    cat = "vitamins";
  } else if (isSkincare) {
    cat = "skincare";
  } else if (isMedicine) {
    cat = "medicines";
  }

  return {
    ...p,
    category: cat,
    icon: categoryIconMap[cat] || IconCapsule,
    verifiedPhoto: true,
  };
});
const __UNUSED_MAPPED__ = (realCatalogData as any[]).map((p) => ({
  ...p,
  icon: categoryIconMap[p.category] || IconCapsule,
}));

export const products: Product[] = [
  ...mappedRealProducts,
  ...featuredProducts,
];

/* ------------------------------------------------------------------ */
/* Delivery network — zones, time slots, drivers                       */
/* ------------------------------------------------------------------ */

export interface DeliveryZone {
  id: string;
  nameAr: string;
  nameEn: string;
  areasAr: string;
  areasEn: string;
  fee: number;
  etaMin: number; // minutes to door
  freeOver: number; // free delivery when subtotal >= this
}

export const deliveryZones: DeliveryZone[] = [
  {
    id: "deirout-city",
    nameAr: "مدينة ديروط",
    nameEn: "Deirout City",
    areasAr: "وسط المدينة — شارع المحطة، الشارع الرئيسي، حي السوق، المستشفى، منطقة الترعة، تقسيم أبو جبل، مساكن الضباط، القرشية",
    areasEn: "Downtown — Station St., Main St., Souq district, Hospital, Canal zone, Abu Gabal, Officers Housing",
    fee: 10,
    etaMin: 25,
    freeOver: 250,
  },
  {
    id: "deirout-sharif",
    nameAr: "ديروط الشريف",
    nameEn: "Deirout El-Sharif",
    areasAr: "ديروط الشريف بحري وقبلي والمناطق المحيطة",
    areasEn: "Deirout El-Sharif and surrounding areas",
    fee: 12,
    etaMin: 30,
    freeOver: 300,
  },
  {
    id: "masara",
    nameAr: "مسارة — سرحان — جرف سرحان",
    nameEn: "Masara / Sarhan / Geif Sarhan",
    areasAr: "قرية مسارة، سرحان، جرف سرحان",
    areasEn: "Masara village, Sarhan, Geif Sarhan",
    fee: 12,
    etaMin: 30,
    freeOver: 300,
  },
  {
    id: "koudia",
    nameAr: "كودية الإسلام",
    nameEn: "Koudia El-Islam",
    areasAr: "كودية الإسلام وتوابعها",
    areasEn: "Koudia El-Islam and hamlets",
    fee: 12,
    etaMin: 30,
    freeOver: 300,
  },
  {
    id: "deshlut",
    nameAr: "دشلوط",
    nameEn: "Deshlut",
    areasAr: "دشلوط — أكبر قرى مركز ديروط وتوابعها",
    areasEn: "Deshlut — the largest village of Deirut",
    fee: 15,
    etaMin: 35,
    freeOver: 350,
  },
  {
    id: "houta",
    nameAr: "الحوطا الشرقية والغربية",
    nameEn: "El-Houta Sharqiya and Gharbiya",
    areasAr: "الحوطا الشرقية، الحوطا الغربية",
    areasEn: "El-Houta Sharqiya, El-Houta Gharbiya",
    fee: 15,
    etaMin: 35,
    freeOver: 350,
  },
  {
    id: "sanbo",
    nameAr: "صنبو",
    nameEn: "Sanbo",
    areasAr: "قرية صنبو، عزبة صنبو والمناطق المجاورة",
    areasEn: "Sanbo village and surroundings",
    fee: 15,
    etaMin: 35,
    freeOver: 350,
  },
  {
    id: "bawit",
    nameAr: "باويط",
    nameEn: "Bawit",
    areasAr: "قرية باويط وتوابعها ودير أبا هور",
    areasEn: "Bawit village and hamlets",
    fee: 15,
    etaMin: 40,
    freeOver: 350,
  },
  {
    id: "beblaw",
    nameAr: "ببلاو",
    nameEn: "Beblaw",
    areasAr: "قرية ببلاو والنجوع التابعة",
    areasEn: "Beblaw village and hamlets",
    fee: 15,
    etaMin: 40,
    freeOver: 350,
  },
  {
    id: "bani-yahya",
    nameAr: "بني يحيى",
    nameEn: "Bani Yahya",
    areasAr: "بني يحيى بحري، بني يحيى قبلي والمناطق المجاورة",
    areasEn: "Bani Yahya Bahari and Qibli",
    fee: 15,
    etaMin: 40,
    freeOver: 350,
  },
  {
    id: "kasr-haidar",
    nameAr: "قصر حيدر",
    nameEn: "Kasr Haidar",
    areasAr: "قصر حيدر والنجوع المجاورة",
    areasEn: "Kasr Haidar village and hamlets",
    fee: 15,
    etaMin: 40,
    freeOver: 350,
  },
  {
    id: "amshoul",
    nameAr: "أمشول — عواجة — شلش",
    nameEn: "Amshoul / Awaga / Shelsh",
    areasAr: "أمشول، عواجة، شلش وتوابعها",
    areasEn: "Amshoul, Awaga, Shelsh",
    fee: 15,
    etaMin: 40,
    freeOver: 350,
  },
  {
    id: "abu-karim",
    nameAr: "أبو كريم — أبو الهدر",
    nameEn: "Abu Karim / Abu El-Hadar",
    areasAr: "أبو كريم، أبو الهدر والمناطق التابعة",
    areasEn: "Abu Karim, Abu El-Hadar",
    fee: 15,
    etaMin: 40,
    freeOver: 350,
  },
  {
    id: "riyad",
    nameAr: "الرياض — المطاوعة",
    nameEn: "El-Riyad / El-Matawa",
    areasAr: "قرية الرياض، المطاوعة والنجوع",
    areasEn: "El-Riyad, El-Matawa",
    fee: 15,
    etaMin: 40,
    freeOver: 350,
  },
  {
    id: "mahmoudia",
    nameAr: "المحمودية — المناشي — المندرة",
    nameEn: "El-Mahmoudia / El-Manashi / El-Mandra",
    areasAr: "المحمودية، المناشي، المندرة بحري، النهاية",
    areasEn: "El-Mahmoudia, El-Manashi, El-Mandra Bahari",
    fee: 15,
    etaMin: 40,
    freeOver: 350,
  },
  {
    id: "kom-boha",
    nameAr: "كوم بوها — زاوية هارون — كوم أنجاشة",
    nameEn: "Kom Boha / Zawyet Haroun / Kom Angasha",
    areasAr: "كوم بوها بحري، زاوية هارون، كوم أنجاشة",
    areasEn: "Kom Boha, Zawyet Haroun, Kom Angasha",
    fee: 15,
    etaMin: 40,
    freeOver: 350,
  },
  {
    id: "aramia",
    nameAr: "عرامية الخضيري — نجع خضر",
    nameEn: "Aramiet El-Khodeiri / Nag' Khodr",
    areasAr: "عرامية الخضيري، نجع خضر، الحما",
    areasEn: "Aramiet El-Khodeiri, Nag' Khodr",
    fee: 15,
    etaMin: 40,
    freeOver: 350,
  },
  {
    id: "sharaqwa",
    nameAr: "الشراقوة — خارفة — مزينة — بانوب",
    nameEn: "El-Sharaqwa / Kharfa / Mzina / Banoub",
    areasAr: "الشراقوة، خارفة، مزينة، بانوب ظهر الجمل",
    areasEn: "El-Sharaqwa, Kharfa, Mzina, Banoub Zahr El-Gamal",
    fee: 15,
    etaMin: 40,
    freeOver: 350,
  },
  {
    id: "nazal",
    nameAr: "نزلات ديروط (كل النزلات)",
    nameEn: "The Nazal villages",
    areasAr: "نزلة عبد الله، نزلة ظاهر، نزلة ضاهر، نزلة بدوي، نزلة ساو، نزلة سرقنا، نزلة العوامر، نزلة فرج محمود، نزلة مصطفى عبد الحليم",
    areasEn: "Nazlet Abdallah, Zaher, Daher, Badawi, Saw, Sarqana, Awamer, Farag Mahmoud, Mostafa Abdel Halim",
    fee: 15,
    etaMin: 40,
    freeOver: 350,
  },
  {
    id: "custom-village",
    nameAr: "قرية أو نجع آخر — اكتب اسم مكانك بنفسك ✍️",
    nameEn: "Other Village or Hamlet — Type Your Location",
    areasAr: "أي قرية أو عزبة أو نجع أو حوض داخل مركز ديروط وضواحيها — اكتب اسم المكان",
    areasEn: "Any other village, hamlet or area in Dairut center — type your specific location",
    fee: 18,
    etaMin: 45,
    freeOver: 350,
  },
  {
    id: "deirout-ring",
    nameAr: "ديروط الشريف — كودية الإسلام — مسارة — سرحان",
    nameEn: "Deirout El-Sharif / Koudia / Masara / Sarhan",
    areasAr: "ديروط الشريف، كودية الإسلام، مسارة، سرحان، جرف سرحان",
    areasEn: "Deirout El-Sharif, Koudia El-Islam, Masara, Sarhan, Geif Sarhan",
    fee: 12,
    etaMin: 30,
    freeOver: 300,
  },
  {
    id: "sunrise",
    nameAr: "قرى الشروق",
    nameEn: "Sunrise villages",
    areasAr: "أبو الهدر، أبو كريم، أمشول، شلش، عواجة، مزينة، صنبو، باويط، ببلاو، بني يحيى بحري، بانوب ظهر الجمل",
    areasEn: "Abu El-Hadar, Abu Karim, Amshoul, Shelsh, Awaga, Mzina, Sanbo, Bawit, Beblaw, Bani Yahya, Banoub Zahr El-Gamal",
    fee: 18,
    etaMin: 45,
    freeOver: 400,
  },
  {
    id: "sunset",
    nameAr: "قرى الغروب",
    nameEn: "Sunset villages",
    areasAr: "الرياض، المطاوعة، المحمودية، المناشي، المندرة بحري، النهاية، قصر حيدر، كوم أنجاشة، كوم بوها بحري، زاوية هارون، عرامية الخضيري، نجع خضر، الشراقوة، خارفة",
    areasEn: "Riyad, Matawa, Mahmoudia, Manashi, Mandra Bahari, Nehaya, Kasr Haidar, Kom Angasha, Kom Boha, Zawyet Haroun, Aramia, Nag' Khodr, Sharaqwa, Kharfa",
    fee: 18,
    etaMin: 45,
    freeOver: 400,
  },
  {
    id: "assiut",
    nameAr: "أسيوط والمدينة الجديدة",
    nameEn: "Assiut and New City",
    areasAr: "أسيوط، أسيوط الجديدة، الحمراء، الواسطى، العادلية",
    areasEn: "Assiut, New Assiut, Hamra, Wasti, Adalia",
    fee: 30,
    etaMin: 60,
    freeOver: 400,
  },
  {
    id: "upper-nile",
    nameAr: "صدفا — أبنوب — منفلوط — القوصية",
    nameEn: "Sadfa / Abnub / Manfalut / Qusiya",
    areasAr: "صدفا، القوصية، منفلوط، أبنوب، أبو تيج، البداري",
    areasEn: "Sadfa, Qusiya, Manfalut, Abnub, Abu Tig, Badari",
    fee: 35,
    etaMin: 90,
    freeOver: 450,
  },
  {
    id: "nationwide",
    nameAr: "باقي محافظات مصر (شحن)",
    nameEn: "Rest of Egypt (shipping)",
    areasAr: "كل المحافظات — القاهرة، الجيزة، الإسكندرية، الصعيد والدلتا — عبر شركات الشحن",
    areasEn: "All governorates — Cairo, Giza, Alexandria, Delta & Upper Egypt — via couriers",
    fee: 60,
    etaMin: 2880,
    freeOver: 800,
  },
];

export const zoneById = (id?: string) => deliveryZones.find((z) => z.id === id);

export interface DeliverySlot {
  id: string;
  labelAr: string;
  labelEn: string;
  subAr: string;
  subEn: string;
  /** premium surcharge added on top of the zone fee (EGP) */
  extraFee?: number;
}

export const deliverySlots: DeliverySlot[] = [
  {
    id: "slot-12-14",
    labelAr: "12:00 م — 2:00 م",
    labelEn: "12:00 PM — 2:00 PM",
    subAr: "الفترة الظهيرة",
    subEn: "Afternoon slot",
  },
  {
    id: "slot-14-16",
    labelAr: "2:00 م — 4:00 م",
    labelEn: "2:00 PM — 4:00 PM",
    subAr: "فترة العصر",
    subEn: "Mid-day slot",
  },
  {
    id: "slot-16-18",
    labelAr: "4:00 م — 6:00 م",
    labelEn: "4:00 PM — 6:00 PM",
    subAr: "فترة المغرب",
    subEn: "Evening slot",
  },
  {
    id: "slot-18-20",
    labelAr: "6:00 م — 8:00 م",
    labelEn: "6:00 PM — 8:00 PM",
    subAr: "فترة أول الليل",
    subEn: "Prime evening slot",
  },
  {
    id: "slot-20-22",
    labelAr: "8:00 م — 10:00 م",
    labelEn: "8:00 PM — 10:00 PM",
    subAr: "فترة السهرة",
    subEn: "Night slot",
  },
  {
    id: "slot-22-24",
    labelAr: "10:00 م — 12:00 منتصف الليل",
    labelEn: "10:00 PM — 12:00 Midnight",
    subAr: "الفترة المسائية المتأخرة",
    subEn: "Late night slot",
  },
];

export const slotById = (id?: string) => deliverySlots.find((s) => s.id === id);

/* ------------------------- Prescription queue ----------------------- */

export type RxStatus = "new" | "approved" | "rejected";

export interface RxRequest {
  id: string;
  customerAr: string;
  customerEn: string;
  phone: string;
  fileName: string;
  date: string;
  status: RxStatus;
  noteAr: string;
  noteEn: string;
}

export const demoRxQueue: RxRequest[] = [];

export type DriverStatus = "available" | "busy" | "offline";

export interface Driver {
  id: string;
  nameAr: string;
  nameEn: string;
  phone: string;
  vehicle: "scooter" | "van";
  plate: string;
  rating: number;
  trips: number;
  zoneId: string;
  status: DriverStatus;
}

export const drivers: Driver[] = [
  {
    id: "dr-1",
    nameAr: "محمود سيد",
    nameEn: "Mahmoud Sayed",
    phone: "0100 111 2233",
    vehicle: "scooter",
    plate: "ط ن ح 1234",
    rating: 4.9,
    trips: 1240,
    zoneId: "deirout-city",
    status: "available",
  },
  {
    id: "dr-2",
    nameAr: "كريم فتحي",
    nameEn: "Karim Fathy",
    phone: "0111 222 3344",
    vehicle: "scooter",
    plate: "س ي د 5678",
    rating: 4.7,
    trips: 860,
    zoneId: "deirout-center",
    status: "available",
  },
  {
    id: "dr-3",
    nameAr: "أحمد عادل",
    nameEn: "Ahmed Adel",
    phone: "0122 333 4455",
    vehicle: "van",
    plate: "ق ب أ 9012",
    rating: 4.8,
    trips: 640,
    zoneId: "assiut",
    status: "busy",
  },
  {
    id: "dr-4",
    nameAr: "إسلام رجب",
    nameEn: "Islam Ragab",
    phone: "0123 444 5566",
    vehicle: "scooter",
    plate: "ج ح د 3456",
    rating: 4.6,
    trips: 512,
    zoneId: "upper-nile",
    status: "available",
  },
  {
    id: "dr-5",
    nameAr: "محمد شعبان",
    nameEn: "Mohamed Shaban",
    phone: "0106 555 6677",
    vehicle: "van",
    plate: "ل م ن 7890",
    rating: 4.8,
    trips: 980,
    zoneId: "nationwide",
    status: "busy",
  },
  {
    id: "dr-6",
    nameAr: "حسن عليوة",
    nameEn: "Hassan Aliewa",
    phone: "0128 666 7788",
    vehicle: "scooter",
    plate: "ه و ز 2468",
    rating: 4.5,
    trips: 233,
    zoneId: "deirout-city",
    status: "offline",
  },
];

export const driverById = (id?: string): Driver | undefined => {
  if (!id) return undefined;
  if (customDriversGetter) {
    try {
      const list = customDriversGetter();
      const found = list.find((d) => d.id === id);
      if (found) return found;
    } catch {}
  }
  return drivers.find((d) => d.id === id);
};

/* Branch for pickup orders — العنوان الحقيقي */
export const BRANCH = {
  nameAr: "فرع ديروط — تقسيم أبو جبل",
  nameEn: "Dairut Branch — Taqseem Abu Gabal",
  addressAr: "منطقة تقسيم أبو جبل، خلف مساكن الضباط، ديروط، أسيوط",
  addressEn: "Taqseem Abu Gabal Area, Behind Officers' Housing, Dairut, Assiut",
  hoursAr: "يوميًا 9 ص — 12 م",
  hoursEn: "Daily 9 AM — 12 AM",
};

/* ------------------------------------------------------------------ */
/* Testimonials                                                        */
/* ------------------------------------------------------------------ */

export interface Testimonial {
  nameAr: string;
  nameEn: string;
  textAr: string;
  textEn: string;
  rating: number;
}

export const testimonials: Testimonial[] = [
  {
    nameAr: "منى عبد الرحمن",
    nameEn: "Mona Abdelrahman",
    textAr: "أسرع صيدلية اتعاملت معاها. طلبت الدواء الصبح ووصلني قبل ما أكمل يوم! والموظفين محترمين جدًا.",
    textEn: "The fastest pharmacy I've dealt with. Ordered in the morning and it arrived the same day. Great staff!",
    rating: 5,
  },
  {
    nameAr: "محمود السيد",
    nameEn: "Mahmoud Elsayed",
    textAr: "ميزة البدائل بتحكمني كتير، بلاقي نفس المادة الفعالة بسعر أقل. تجربة شراء مريحة جدًا.",
    textEn: "The alternatives feature saves me money — same active ingredient, better price. Very smooth experience.",
    rating: 5,
  },
  {
    nameAr: "سارة إبراهيم",
    nameEn: "Sara Ibrahim",
    textAr: "رفعت روشتة ابني من الموبايل واتجهزت الطلبية واتصلت على البيت. تعامل راقي وفخم.",
    textEn: "Uploaded my son's prescription from mobile and the order arrived ready at my door. Excellent service.",
    rating: 5,
  },
];

/* ------------------------------------------------------------------ */
/* Admin demo data                                                     */
/* ------------------------------------------------------------------ */

export interface MonthSales {
  monthAr: string;
  monthEn: string;
  revenue: number;
  orders: number;
}

export const salesData: MonthSales[] = [
  { monthAr: "يناير", monthEn: "Jan", revenue: 42000, orders: 210 },
  { monthAr: "فبراير", monthEn: "Feb", revenue: 38500, orders: 195 },
  { monthAr: "مارس", monthEn: "Mar", revenue: 45200, orders: 228 },
  { monthAr: "أبريل", monthEn: "Apr", revenue: 51800, orders: 246 },
  { monthAr: "مايو", monthEn: "May", revenue: 48900, orders: 232 },
  { monthAr: "يونيو", monthEn: "Jun", revenue: 56300, orders: 271 },
  { monthAr: "يوليو", monthEn: "Jul", revenue: 61200, orders: 298 },
  { monthAr: "أغسطس", monthEn: "Aug", revenue: 58400, orders: 284 },
  { monthAr: "سبتمبر", monthEn: "Sep", revenue: 64800, orders: 315 },
  { monthAr: "أكتوبر", monthEn: "Oct", revenue: 71500, orders: 342 },
];

/* last 7 days — orders per day for the weekly mini chart */
export interface DayOrders {
  dayAr: string;
  dayEn: string;
  orders: number;
  revenue: number;
}

export const weeklyData: DayOrders[] = [
  { dayAr: "السبت", dayEn: "Sat", orders: 38, revenue: 7600 },
  { dayAr: "الأحد", dayEn: "Sun", orders: 44, revenue: 8800 },
  { dayAr: "الاثنين", dayEn: "Mon", orders: 31, revenue: 6200 },
  { dayAr: "الثلاثاء", dayEn: "Tue", orders: 47, revenue: 9400 },
  { dayAr: "الأربعاء", dayEn: "Wed", orders: 52, revenue: 10400 },
  { dayAr: "الخميس", dayEn: "Thu", orders: 61, revenue: 12200 },
  { dayAr: "الجمعة", dayEn: "Fri", orders: 49, revenue: 9800 },
];

export const adminOrders: Order[] = [];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const getProduct = (id: string): Product | undefined => {
  if (customProductsGetter) {
    try {
      const list = customProductsGetter();
      const found = list.find((p) => p.id === id);
      if (found) return found;
    } catch {}
  }
  return products.find((p) => p.id === id);
};

export const alternativesOf = (p: Product) =>
  products.filter((x) => x.category === p.category && x.id !== p.id);

export const byCategory = (id: string) => products.filter((p) => p.category === id);

export const bestSellers = () => products.filter((p) => p.tags.includes("best"));

export const offers = () => products.filter((p) => p.tags.includes("offer") && p.oldPrice);

export const discountPct = (p: Product) =>
  p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;

export const FREE_SHIPPING_THRESHOLD = 300;
export const SHIPPING_FEE = 30;

/* Unique brand list derived from the catalog — used by the catalog filters */
export const brands: { id: string; nameAr: string; nameEn: string }[] = Array.from(
  new Map(
    products.map((p) => [
      p.brandEn,
      { id: p.brandEn, nameAr: p.brandAr, nameEn: p.brandEn },
    ])
  ).values()
).sort((a, b) => a.nameEn.localeCompare(b.nameEn));

/* ------------------------------------------------------------------ */
/* Ad banner carousel — big-company style slides (AI photos, no text)  */
/* ------------------------------------------------------------------ */

export interface AdSlide {
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
    img: "/images/ads/ad-wasly-official.png",
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
];

/* ------------------------------------------------------------------ */
/* رعاية بحبح — صناديق العلاج الشهري (أهداف جيم حقيقية من المخزون)     */
/* ------------------------------------------------------------------ */

export interface CarePlan {
  id: string;
  nameAr: string;
  nameEn: string;
  /** short promise shown on the card */
  tagAr: string;
  tagEn: string;
  descAr: string;
  descEn: string;
  /** محتويات الصندوق — منتجات حقيقية من المخزن */
  medIds: string[];
  price: number; // monthly
  oldPrice: number; // buying separately
  color: string; // accent
  icon: IconType;
  popular?: boolean;
  /** هدف الصندوق — للتقسيم في الصفحة الرئيسية */
  goal: "mass" | "cut" | "power" | "start";
}

export const carePlans: CarePlan[] = [
  {
    id: "box-mass",
    nameAr: "صندوق التضخيم والتسمين",
    nameEn: "Bulk & Mass Box",
    tagAr: "وزن زايد وعضل يبان — مش بطن",
    tagEn: "Real weight, real muscle",
    descAr: "ماس جينر بالكالوريز النضيفة + كرياتين للقوة + ملتي فيتامين بيغطي النواقص + شاكر بحبح هدية. صندوق واحد شهري وجسمك يبدأ يشتغل صح.",
    descEn: "Clean-calorie mass gainer + creatine for strength + daily multivitamin + a Bahbah shaker. One monthly box, real gains.",
    medIds: ["mass-gainer", "creatine-mono", "multivitamin-sport", "shaker-bottle"],
    price: 1195,
    oldPrice: 1430,
    color: "#F09428",
    icon: Dumbbell,
    popular: true,
    goal: "mass",
  },
  {
    id: "box-cut",
    nameAr: "صندوق التخسيس والتنشيف",
    nameEn: "Cut & Slim Box",
    tagAr: "حرق نضيف وعضل محفوظ",
    tagEn: "Burn fat, keep muscle",
    descAr: "كارنيتين بيوصل للدهون قبل العضل + حارق ثيرموجينيك بيرفع الحرق ويسد الشهية + واي بروتين يحافظ على عضلك وانت بتاكل أقل + ملتي فيتامين يقاوم الإرهاق.",
    descEn: "L-carnitine to torch fat + thermogenic burner + whey to guard muscle on a deficit + multivitamin against fatigue.",
    medIds: ["l-carnitine-3000", "fat-burner", "whey-gold", "multivitamin-sport"],
    price: 1390,
    oldPrice: 1650,
    color: "#2E9E6B",
    icon: Flame,
    goal: "cut",
  },
  {
    id: "box-power",
    nameAr: "صندوق القوة والأداء",
    nameEn: "Power & Performance Box",
    tagAr: "مضخة وأوزان أتقل كل تمرين",
    tagEn: "Pump up, lift heavier",
    descAr: "كرياتين أساس القوة + بري وركاوت بمضخة دم وتركيز صاروخي + BCAA يحمي العضل من التكسير + شاكر بحبح. للجيمر الجدع اللي عايز رقمه يزيد كل شهر.",
    descEn: "Creatine for raw strength + pre-workout pump & focus + BCAA muscle shield + Bahbah shaker. For PRs every month.",
    medIds: ["creatine-mono", "pre-workout", "bcaa-5000", "shaker-bottle"],
    price: 1190,
    oldPrice: 1425,
    color: "#1E4E8F",
    icon: IconMedal,
    goal: "power",
  },
  {
    id: "box-start",
    nameAr: "صندوق البداية الصح",
    nameEn: "Fresh Starter Box",
    tagAr: "أول سنة جيم؟ ابدأ صح",
    tagEn: "New to the gym? Start right",
    descAr: "واي بروتين أساسي للبداية + كرياتين تعلم صح من أول يوم + بروتين بار يسد جوعك صح + شاكر بحبح. الباقة اللي بتبدأ بيها الناس بثقة.",
    descEn: "First-timer friendly — whey for daily protein + creatine done right + protein bars + Bahbah shaker.",
    medIds: ["whey-gold", "creatine-mono", "protein-bar", "shaker-bottle"],
    price: 1240,
    oldPrice: 1465,
    color: "#B0713A",
    icon: IconVitaminTube,
    goal: "start",
  },
];

export const planById = (id?: string) => carePlans.find((p) => p.id === id);

/* ------------------------------------------------------------------ */
/* رعاية بحبح — optional add-ons appended to any monthly plan          */
/* ------------------------------------------------------------------ */

export interface CareAddon {
  id: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  price: number; // + EGP / month
  medId?: string;
  icon: IconType;
}

export const careAddons: CareAddon[] = [
  {
    id: "addon-shaker",
    nameAr: "شاكر بحبح إضافي",
    nameEn: "Extra Bahbah Shaker",
    descAr: "شاكر تاني للشنطة — واحد للجيم وواحد للبيت",
    descEn: "A second shaker — one for the gym, one for home",
    price: 75,
    medId: "shaker-bottle",
    icon: IconGift,
  },
  {
    id: "addon-bar",
    nameAr: "بروتين بار — 6 حبات",
    nameEn: "Protein Bar — 6 pack",
    descAr: "سناك بروتين بيسد جوعك صح بين الوجبات",
    descEn: "Protein snack that keeps you full the clean way",
    price: 160,
    medId: "protein-bar",
    icon: IconCapsule,
  },
  {
    id: "addon-vitd",
    nameAr: "فيتامين د للعضم",
    nameEn: "Vitamin D for Bones",
    descAr: "قوة عضم وثبات مفاصل مع الاوزان التقيلة",
    descEn: "Bone strength for heavy lifts",
    price: 85,
    medId: "vitamin-d3",
    icon: IconVitaminTube,
  },
  {
    id: "addon-omega",
    nameAr: "أوميجا 3 للمفاصل",
    nameEn: "Omega-3 for Joints",
    descAr: "دهون نضيفة بتريح المفاصل والقلب مع التمرين",
    descEn: "Clean fats that ease joints and support the heart",
    price: 95,
    medId: "omega-3",
    icon: IconDropletPlus,
  },
  {
    id: "addon-zinc",
    nameAr: "زنك للاستشفاء",
    nameEn: "Zinc Recovery",
    descAr: "استشفاء أسرع وتستوستيرون تحت السيطرة",
    descEn: "Faster recovery with balanced testosterone",
    price: 60,
    medId: "zinc-plus",
    icon: IconShieldCross,
  },
];

export const addonById = (id?: string) => careAddons.find((a) => a.id === id);

/* ------------------------------------------------------------------ */
/* رعاية بحبح — loyalty tiers by subscription length                   */
/* ------------------------------------------------------------------ */

export interface CareTier {
  id: "bronze" | "silver" | "gold" | "platinum";
  minMonths: number;
  nameAr: string;
  nameEn: string;
  color: string;
}

export const CARE_TIERS: CareTier[] = [
  { id: "bronze", minMonths: 0, nameAr: "برونزي", nameEn: "Bronze", color: "#C56A0A" },
  { id: "silver", minMonths: 3, nameAr: "فضي", nameEn: "Silver", color: "#8CA3B8" },
  { id: "gold", minMonths: 6, nameAr: "ذهبي", nameEn: "Gold", color: "#C9A227" },
  { id: "platinum", minMonths: 12, nameAr: "بلاتيني", nameEn: "Platinum", color: "#6D4FC2" },
];

export const careTier = (months: number): CareTier =>
  [...CARE_TIERS].reverse().find((t) => months >= t.minMonths) ?? CARE_TIERS[0];

/** whole months between two ISO dates (min 1) */
export const monthsBetween = (sinceIso: string, nowIso: string): number => {
  const a = new Date(sinceIso);
  const b = new Date(nowIso);
  const m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  return Math.max(1, m);
};

/* Monthly medicine / chronic subscribers visible in the dashboard */
export interface CareSubscriber {
  id: string;
  nameAr: string;
  nameEn: string;
  phone: string;
  planId?: string;
  address?: string;
  notes?: string;
  prescriptionUrl?: string;
  dayPref?: number;
  since: string;
  nextDelivery: string;
  months: number;
  status: "active" | "paused";
}

export const demoCareSubs: CareSubscriber[] = [];

/* ------------------------------------------------------------------ */
/* قياسات المريض — السكر والضغط والوزن ومتابعة الحالة الصحية          */
/* ------------------------------------------------------------------ */

export type SugarMealTiming = "fasting" | "random" | "postprandial" | "bedtime";

export interface PatientMeasurement {
  id: string;
  patientCode: string;
  patientName: string;
  patientPhone: string;
  recordedAt: string;
  bloodSugar?: number;
  sugarTiming?: SugarMealTiming;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  pharmacistNotes?: string;
  recordedBy?: string;
}

export const demoMeasurements: PatientMeasurement[] = [];

/* ------------------------------------------------------------------ */
/* Coupons engine (BAHBAH10 / BAHBAH20 ...)                            */
/* ------------------------------------------------------------------ */

export interface Coupon {
  code: string;
  percent: number;
  minTotal: number;
  uses: number;
  active: boolean;
}

export const demoCoupons: Coupon[] = [
  { code: "BAHBAH10", percent: 10, minTotal: 200, uses: 0, active: true },
  { code: "BAHBAH20", percent: 20, minTotal: 500, uses: 0, active: true },
  { code: "DEIROUT15", percent: 15, minTotal: 300, uses: 0, active: true },
];

/* ------------------------------------------------------------------ */
/* Drug interaction checker — demo rules table                         */
/* ------------------------------------------------------------------ */

export type InteractionLevel = "safe" | "warn" | "danger";

export interface InteractionRule {
  a: string; // ingredientAr fragment (lowercase match both langs)
  b: string;
  level: InteractionLevel;
  ar: string;
  en: string;
}

export const interactionRules: InteractionRule[] = [
  {
    a: "إيبوبروفين",
    b: "أسبرين",
    level: "warn",
    ar: "إيبوبروفين مع الأسبرين يزيد خطر نزيف المعدة — ابعد الجرعات عن بعضها واستشر الصيدلي.",
    en: "Ibuprofen with aspirin raises stomach-bleeding risk — space doses apart and ask our pharmacist.",
  },
  {
    a: "باراسيتامول",
    b: "كافيين",
    level: "warn",
    ar: "التركيبة دي موجودة أصلًا في بانادول إكسترا — متاخدش معاه أدوية تانية فيها كافيين (قهوة/شاي بقوة).",
    en: "This combo already exists in Panadol Extra — avoid extra caffeine sources (strong coffee/tea).",
  },
  {
    a: "سالبوتامول",
    b: "فيودرين",
    level: "danger",
    ar: "دمج موسعات الشعب الهوائية مع فيودرين يزيد ضربات القلب والرعشة — استشر طبيبك فورًا.",
    en: "Combining bronchodilators with pseudoephedrine raises heart rate and tremor — consult your doctor.",
  },
  {
    a: "حديد",
    b: "حمض الأسكوربيك",
    level: "safe",
    ar: "فيتامين C بيساعد امتصاص الحديد — دمج ممتاز، خدهم مع بعض في نفس الوجبة.",
    en: "Vitamin C boosts iron absorption — great combo, take both with the same meal.",
  },
  {
    a: "فيكسوفينادين",
    b: "عصير",
    level: "warn",
    ar: "تجنب عصير التفاح والبرتقال والجريب فروت مع تلفاست — بيقلل الامتصاص. اشرب ماء بس.",
    en: "Avoid apple, orange and grapefruit juice with fexofenadine — it reduces absorption. Take with water.",
  },
];
