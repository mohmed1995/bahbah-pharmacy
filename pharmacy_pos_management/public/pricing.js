/**
 * Shared Pricing & Order Calculation Logic
 * موحدة بين: السلة (Cart)، صفحة الدفع (Checkout)، ولوحة التحكم (Admin/Dashboard)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PricingCalculator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const DEFAULT_CONFIG = {
    freeShippingThreshold: 200, // توصيل مجاني فوق 200 ج.م
    flatShippingFee: 25,         // رسوم التوصيل الأساسية
  };

  /**
   * حساب ملخص الطلب بدقة وموحدة
   * @param {Array} items - قائمة العناصر [{ price: number, qty: number, ... }]
   * @param {Object} options - إعدادات الخصومات أو التوصيل
   */
  function calculateOrderSummary(items = [], options = {}) {
    const config = { ...DEFAULT_CONFIG, ...options };
    
    // الإجمالي الفرعي
    const subtotal = items.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const qty = Math.max(0, parseInt(item.qty, 10) || 0);
      return sum + (price * qty);
    }, 0);

    const totalItems = items.reduce((sum, item) => sum + (Math.max(0, parseInt(item.qty, 10) || 0)), 0);

    // حساب الشحن
    const isFreeShipping = subtotal >= config.freeShippingThreshold || subtotal === 0;
    const shipping = subtotal === 0 ? 0 : (isFreeShipping ? 0 : config.flatShippingFee);
    const amountNeededForFreeShipping = isFreeShipping ? 0 : Math.max(0, config.freeShippingThreshold - subtotal);

    // الإجمالي النهائي
    const total = subtotal + shipping;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      total: Math.round(total * 100) / 100,
      totalItems,
      isFreeShipping,
      amountNeededForFreeShipping: Math.round(amountNeededForFreeShipping * 100) / 100,
      threshold: config.freeShippingThreshold
    };
  }

  return {
    calculateOrderSummary,
    DEFAULT_CONFIG
  };
}));
