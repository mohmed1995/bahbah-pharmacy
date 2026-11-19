import { products, type Product } from "./data";

/* ------------------------------------------------------------------ */
/* تنسيق الرفوف من الكتالوج الحقيقي — مطابقة بالاسم/البراند/الشكل فقط */
/* لا منتجات مخترعة: أي مجموعة لا تطابق شيئاً في الكتالوج تُتخطى بصمت */
/* ------------------------------------------------------------------ */

function txt(p: Product): string {
  return [p.nameAr, p.nameEn, p.brandAr, p.brandEn, p.formAr, p.formEn]
    .join(" ")
    .toLowerCase();
}

const match = (p: Product, res: RegExp[]) => {
  const t = txt(p);
  return res.some((r) => r.test(t));
};

/* ---- منتجات حساسة: تُباع وتُبحث عادي، لكن لا تظهر أبداً في بطل/عروض/رفوف مروّجة ---- */
const SENSITIVE_RES: RegExp[] = [
  /durex/i,
  /ديوريكس/,
  /واقي ذكري/,
  /condom/i,
  /\bcialis\b/i,
  /سيالس/,
  /viagra/i,
  /فياجرا/,
  /sildenafil/i,
  /tadalafil/i,
  /powerecta/i,
  /باوريكتا/,
  /\berec\b/i,
  /إريك|اريك/,
  /gynera/i,
  /جينيرا/,
  /microgynon/i,
  /ميكروجينون/,
  /marvelon/i,
  /مارفيلون/,
  /cerazette/i,
  /سيرازيت/,
];

export function isSensitiveProduct(p: Product): boolean {
  return match(p, SENSITIVE_RES);
}

/** منتجات صحة الرجل للركن الهادئ داخل العناية الشخصية */
export function mensHealthProducts(): Product[] {
  return products.filter(isSensitiveProduct);
}

/* ---- أدوية GLP-1: لا ترويج لها إطلاقاً (غير موجودة بالكتالوج حالياً — حماية مستقبلية) ---- */
const GLP1_RES: RegExp[] = [/ozempic/i, /mounjaro/i, /wegovy/i, /rybelsus/i, /أوزمبك/, /مونجارو/];
export const isGlp1Product = (p: Product) => match(p, GLP1_RES);

/** فلتر الرفوف المروّجة (العروض): بدون حساس، وبدون أدوية بوصفة، وبدون GLP-1 */
export function isPromotable(p: Product): boolean {
  return !isSensitiveProduct(p) && !isGlp1Product(p) && !p.rx;
}

/* ---------------- مجموعات الرفوف ---------------- */

const FEVER_RES: RegExp[] = [
  /panadol/i, /بانادول/, /cetal(?!o)/i, /سيتال(?!و)/, /paracetamol/i, /باراسيتامول/,
  /brufen/i, /بروفين/, /ibuprofen/i, /إيبوبروفين/, /adol/i, /أدول/, /abimol/i, /أبيمول/,
];
const BP_RES: RegExp[] = [
  /norvasc/i, /نورفاسك/, /tritace/i, /تريتاس/, /concor/i, /كونكور/, /exforge/i, /إكسفورج/,
  /atacand/i, /أتاكاند/, /amlodipine/i, /أملوديبين/, /ramipril/i, /bisoprolol/i, /بيسوبرولول/,
  /valsartan/i, /فالسارتان/, /losartan/i, /لوزارتان/, /nebilet/i, /نيبيليت/, /diovan/i, /ديوفان/,
];
const DIABETES_RES: RegExp[] = [
  /diamicron/i, /دياميكرون/, /glucophage/i, /جلوكوفاج/, /cidophage/i, /سيدوفاج/,
  /galvus/i, /جالفوس/, /metformin/i, /ميتفورمين/, /gliclazide/i, /insulin/i, /إنسولين/, /انسولين/,
  /janumet/i, /جانوميت/, /amaryl/i, /أماريل/, /glimepiride/i,
];
const DIAPER_RES: RegExp[] = [
  /حفاض/, /diaper/i, /molfix/i, /مولفيكس/, /pampers/i, /بامبرز/, /fine baby/i, /فاين بيبي/,
  /babyjoy/i, /بيبي جوي/, /canbebe/i, /كان بيبي/,
];
const FORMULA_RES: RegExp[] = [
  /formula/i, /حليب أطفال/, /حليب اطفال/, /hero baby/i, /هيرو بيبي/, /bebilac/i, /بيبيلاك/,
  /nestogen/i, /نيستوجين/, /aptamil/i, /أبتاميل/, /similac/i, /سيميلاك/, /\bnan\b/i,
];
const SUPP_RES: RegExp[] = [/supp/i, /لبوس/, /تحاميل/];
const VAGINAL_RES: RegExp[] = [/vaginal/i, /مهبل/];
const COLIC_RES: RegExp[] = [
  /dentinox/i, /دنتينوكس/, /disflatyl/i, /ديسفلاتيل/, /simethicone/i, /سيميثيكون/, /ماء غريب/, /gripe/i, /مغص/,
];
const ASTHMA_RES: RegExp[] = [
  /ventolin/i, /فنتولين/, /farcolin/i, /فاركولين/, /atrovent/i, /أتروفنت/,
  /salbutamol/i, /سالبوتامول/, /nebuliz/i,
];
const FIRST_AID_RES: RegExp[] = [
  /شاش/, /gauze/i, /قطن طبي/, /medical cotton/i, /بلاستر/, /plaster/i, /silkplast/i,
  /سيلك بلاست/, /betadine/i, /بيتادين/, /ضماد/, /bandage/i, /لاصق طبي/,
];
const IV_RES: RegExp[] = [/ringer/i, /رينجر/, /محلول وريدي/, /normal saline/i, /نورمال سالاين/];
const THERMO_RES: RegExp[] = [/ترمومتر/, /thermometer/i];
const ORS_RES: RegExp[] = [/هيدروسيف/, /hydrosef/i, /محلول جفاف/, /rehydrat/i];

const BABYISH_RES: RegExp[] = [/أطفال/, /اطفال/, /infant/i, /kids/i, /بيبي/, /baby/i];

function pick(res: RegExp[], extra?: (p: Product) => boolean, limit = 12): Product[] {
  return products
    .filter((p) => !isSensitiveProduct(p) && match(p, res) && (extra ? extra(p) : true))
    .slice(0, limit);
}

function merge(lists: Product[][], limit = 14): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const list of lists)
    for (const p of list) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
      if (out.length >= limit) return out;
    }
  return out;
}

/** نافذة أ — ذروة المساء (20:00–01:00): خافض حرارة قبل النوم + ضغط + سكر/إنسولين + حفاضات */
export function eveningPeakProducts(): Product[] {
  return merge([
    pick(FEVER_RES),
    pick(BP_RES),
    pick(DIABETES_RES),
    pick(DIAPER_RES, (p) => p.category === "baby"),
  ]);
}

/** نافذة ب — الليل العميق (02:00–05:00): قليل بس مصيري */
export function deepNightProducts(): Product[] {
  const infantFever = products
    .filter(
      (p) =>
        !isSensitiveProduct(p) &&
        match(p, FEVER_RES) &&
        (p.category === "baby" || match(p, BABYISH_RES) || match(p, SUPP_RES))
    )
    .slice(0, 8);
  const supps = products
    .filter((p) => !isSensitiveProduct(p) && match(p, SUPP_RES) && !match(p, VAGINAL_RES))
    .slice(0, 10);
  return merge([
    infantFever,
    supps,
    pick(COLIC_RES),
    pick(ASTHMA_RES),
    pick(FIRST_AID_RES),
    pick(IV_RES),
    pick(ORS_RES),
  ]);
}

/* ---------------- الأسنان والتقويم ---------------- */

const DENTAL_RES: RegExp[] = [
  /معجون/, /toothpaste/i, /signal/i, /سيجنال/, /closeup/i, /colgate/i, /كولجيت/,
  /sensodyne/i, /سنسوداين/, /oral-b/i, /أورال/, /اورال/, /فرشاة أسنان/, /فرش اسنان/,
  /toothbrush/i, /غسول فم/, /mouthwash/i, /listerine/i, /ليسترين/, /خيط أسنان/,
  /dental floss/i, /أسنان/, /اسنان/, /dental/i, /parodontax/i, /بارودونتاكس/, /مسواك/, /miswak/i,
];
const ORTHO_RES: RegExp[] = [
  /تقويم الأسنان/, /تقويم الاسنان/, /orthodontic/i, /interdental/i, /بين الأسنان/, /بين الاسنان/,
];
const HAIR_REMOVAL_RES: RegExp[] = [/إزالة الشعر/, /ازالة الشعر/, /hair removal/i];

export function dentalProducts(): Product[] {
  return products.filter((p) => !isSensitiveProduct(p) && match(p, DENTAL_RES)).slice(0, 14);
}

/** ركن التقويم — يظهر فقط لو وُجدت منتجات تقويم حقيقية في الكتالوج */
export function orthoProducts(): Product[] {
  return products
    .filter((p) => !isSensitiveProduct(p) && match(p, ORTHO_RES) && !match(p, HAIR_REMOVAL_RES))
    .slice(0, 10);
}

/* ---------------- الرفوف الموسمية ---------------- */

export type Season = "ramadan" | "winter" | "school" | "summer";

export function currentSeason(d: Date): Season | null {
  try {
    const hijriMonth = Number(
      new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { month: "numeric" }).format(d)
    );
    if (hijriMonth === 9) return "ramadan";
  } catch {
    /* تقويم هجري غير متاح — نتجاهل رمضان */
  }
  const m = d.getMonth(); // 0-based
  if (m === 10 || m === 11 || m === 0 || m === 1) return "winter";
  if (m === 8) return "school";
  if (m >= 5 && m <= 7) return "summer";
  return null;
}

const WINTER_RES: RegExp[] = [
  /congestal/i, /كونجستال/, /cold/i, /كولد/, /fludrex/i, /فلودركس/, /tusskan/i, /توسكان/,
  /ventocough/i, /كحة/, /cough/i, /نزلات البرد/, /برد و/, /power cold/i, /باور كولد/,
];
const RAMADAN_RES: RegExp[] = [
  /gaviscon/i, /جافيسكون/, /protofix/i, /بروتوفيكس/, /motilium/i, /موتيليوم/, /fawar/i, /فوار/,
  /carminex/i, /كارمينكس/, /حموضة/, /هضم/, /digestive/i, /rennie/i, /ريني/,
];
const SUNSCREEN_RES: RegExp[] = [/sunscreen/i, /واقي شمس/, /صن بلوك/, /sunblock/i, /spf/i];
const SCHOOL_VIT_RES: RegExp[] = [/sansovit/i, /سانسوفيت/, /قمل/, /lice/i];

export function seasonalProducts(season: Season): Product[] {
  switch (season) {
    case "winter":
      return merge([pick(WINTER_RES), pick(FEVER_RES, undefined, 6)]);
    case "ramadan":
      return merge([pick(RAMADAN_RES), pick(DIABETES_RES, undefined, 6), pick(BP_RES, undefined, 6)]);
    case "school":
      return merge([
        pick(DENTAL_RES, undefined, 8),
        pick(SCHOOL_VIT_RES),
        pick(SUNSCREEN_RES, undefined, 6),
      ]);
    case "summer":
      return merge([
        pick(ORS_RES),
        pick([/antinal/i, /أنتينال/, /انتينال/, /إسهال/, /اسهال/]),
        pick(SUNSCREEN_RES),
        pick([/daktarin/i, /دكتارين/, /canesten/i, /كانستين/, /فطريات/, /antifungal/i, /lamisil/i, /لاميسيل/]),
      ]);
  }
}

/* ---------------- النوافذ الزمنية ---------------- */

/** هل الساعة h داخل النافذة [from, to)؟ — النوافذ قد تلتف بعد منتصف الليل */
export function hourInWindow(h: number, from: number, to: number): boolean {
  if (from === to) return true;
  return from < to ? h >= from && h < to : h >= from || h < to;
}

export const EVENING_WINDOW = { from: 20, to: 1 };
export const DEEP_NIGHT_WINDOW = { from: 2, to: 5 };
export const NEON_WINDOW = { from: 0, to: 5 };

/** طلب ليلي؟ (اتعمل بين 00:00 و05:00) */
export function isNightOrder(createdAt: string | number | Date): boolean {
  const h = new Date(createdAt).getHours();
  return hourInWindow(h, NEON_WINDOW.from, NEON_WINDOW.to);
}
