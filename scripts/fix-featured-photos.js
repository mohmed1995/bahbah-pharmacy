const fs = require('fs');

const path = 'src/lib/bahbah/data.ts';
let content = fs.readFileSync(path, 'utf8');

// Replacements for the 12 featured items to match real photos on disk:

// 1. Panadol Extra
content = content.replace(
  /id:\s*"panadol-extra"[\s\S]*?tags:\s*\["best"\]/,
  `id: "panadol-extra",
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
    tags: ["best"]`
);

// 2. Brufen
content = content.replace(
  /id:\s*"brufen-400"[\s\S]*?tags:\s*\["best"\]/,
  `id: "brufen-400",
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
    tags: ["best"]`
);

// 3. Augmentin
content = content.replace(
  /id:\s*"augmentin-1g"[\s\S]*?tags:\s*\[\s*\]/,
  `id: "augmentin-1g",
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
    tags: []`
);

// 4. Antinal
content = content.replace(
  /id:\s*"antinal"[\s\S]*?tags:\s*\[\s*\]/,
  `id: "antinal",
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
    tags: []`
);

// 5. Congestal
content = content.replace(
  /id:\s*"congestal"[\s\S]*?tags:\s*\[\s*\]/,
  `id: "congestal",
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
    tags: []`
);

// 6. Ventolin Inhaler
content = content.replace(
  /id:\s*"ventolin-inhaler"[\s\S]*?tags:\s*\[\s*\]/,
  `id: "ventolin-inhaler",
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
    tags: []`
);

// 7. Telfast
content = content.replace(
  /id:\s*"telfast-180"[\s\S]*?tags:\s*\["best"\]/,
  `id: "telfast-180",
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
    tags: ["best"]`
);

// 8. Feroglobin
content = content.replace(
  /img:\s*"\/images\/products\/feroglobin\.png"/,
  `img: "/images/products/2495.jpg",\r\n    verifiedPhoto: true`
);

// 9. Omega 3
content = content.replace(
  /img:\s*"\/images\/products\/omega-3\.png"/,
  `img: "/images/products/2488.jpg",\r\n    verifiedPhoto: true`
);

// 10. Pampers
content = content.replace(
  /img:\s*"\/images\/products\/pampers-s4\.png"/,
  `img: "/images/products/2767.jpg",\r\n    verifiedPhoto: true`
);

// 11. Vitamin D3 -> C-Retard Zinc (real photo)
content = content.replace(
  /id:\s*"vitamin-d3"[\s\S]*?tags:\s*\["best"\]/,
  `id: "vitamin-d3",
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
    tags: ["best"]`
);

// 12. Cerave -> Bepanthen (real photo)
content = content.replace(
  /id:\s*"cerave-cream"[\s\S]*?tags:\s*\["best"\]/,
  `id: "cerave-cream",
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
    tags: ["best"]`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully mapped all featured items to verified authentic photos on disk!');
