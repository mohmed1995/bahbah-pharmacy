/**
 * إعدادات وهوية صيدلية بحبح العامة
 */

export const siteConfig = {
  // اسم الصيدلية والوصف
  nameAr: "صيدلية بحبح",
  nameEn: "Bahbah Pharmacy",
  taglineAr: "صحتك ورعايتك في أيدٍ أمينة — خدمة صيدلانية متكاملة",
  taglineEn: "Your Health Closer Than Ever",

  // بيانات التواصل الرسمية
  contact: {
    phone: "01011500166",
    displayPhone: "010 11500166",
    whatsapp: "201011500166",
    email: "info@bahbahpharmacy.com",
    addressAr: "جمهورية مصر العربية",
    addressEn: "Egypt",
    workingHoursAr: "خدمة 24 ساعة طوال أيام الأسبوع",
    workingHoursEn: "24/7 Service all week",
  },

  // إعدادات المتجر والشحن
  shipping: {
    freeShippingThreshold: 500, // الشحن مجاني فوق 500 ج.م
    defaultShippingCost: 25,
    deliveryEstimateHours: 2,
  },

  // روابط السوشيال ميديا والتواصل المباشر
  social: {
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    whatsappLink: "https://wa.me/201011500166?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D8%B5%D9%8A%D8%AF%D9%84%D9%8A%D8%A9%20%D8%A8%D8%AD%D8%A8%D8%AD%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D8%A7%D8%B3%D8%AA%D8%B4%D8%A7%D8%B1%D8%A9%20%D8%A3%D9%88%20%D8%B7%D9%84%D8%A8%20%D8%AF%D9%88%D8%A7%D8%A1",
    callLink: "tel:01011500166",
  },

  // وسائل الدفع
  paymentMethods: {
    cashOnDelivery: true,
    instapay: true,
    creditCard: true,
  },
};
