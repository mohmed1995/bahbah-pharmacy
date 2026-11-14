const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. إضافة أنماط CSS المتقدمة للسلة ونظام الشراء
const cartCSS = `
/* ===== أنماط نظام السلة والشراء المطور (2026 UX) ===== */
.cart-header-pro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1.5px solid #E2E8F0;
  margin-bottom: 12px;
}
.cart-header-pro h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--t);
  display: flex;
  align-items: center;
  gap: 8px;
}
.cart-item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}
.cart-item-card:hover {
  background: #FFFFFF;
  border-color: #CBD5E1;
  box-shadow: 0 4px 12px rgba(18, 59, 115, 0.06);
}
.cart-item-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 20px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.cart-item-info {
  flex: 1;
  min-width: 0;
}
.cart-item-title {
  font-weight: 700;
  font-size: 14.5px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}
.cart-item-generic {
  font-size: 11.5px;
  color: #64748B;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cart-item-price {
  font-size: 13.5px;
  font-weight: 800;
  color: var(--t);
}
.cart-item-total {
  font-size: 12px;
  color: #059669;
  font-weight: 700;
  margin-inline-start: 6px;
}
.cart-qty-ctrl {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #FFFFFF;
  border: 1px solid #CBD5E1;
  border-radius: 99px;
  padding: 3px 6px;
}
.cart-qty-ctrl button {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 0;
  background: #EFF6FF;
  color: var(--t);
  font-weight: 800;
  font-size: 15px;
  display: grid;
  place-items: center;
  transition: all 0.15s ease;
}
.cart-qty-ctrl button:active {
  transform: scale(0.9);
}
.cart-qty-ctrl button.del {
  background: #FEE2E2;
  color: #DC2626;
  font-size: 13px;
}
.cart-qty-ctrl b {
  min-width: 20px;
  text-align: center;
  font-size: 14px;
  font-weight: 800;
  color: var(--ink);
}

/* بطاقات اختيار طريقة الاستلام */
.checkout-method-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}
.checkout-method-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 10px;
  border-radius: 14px;
  border: 2px solid #E2E8F0;
  background: #F8FAFC;
  font-weight: 700;
  font-size: 13.5px;
  color: #475569;
  transition: all 0.2s ease;
  cursor: pointer;
}
.checkout-method-btn.active {
  background: #EFF6FF;
  border-color: var(--t2);
  color: var(--t);
  box-shadow: 0 4px 12px -2px rgba(27, 79, 142, 0.18);
}

/* شريط التوصيل المجاني المحسن */
.free-shipping-card {
  padding: 12px 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, #ECFDF5, #F0FDF4);
  border: 1px solid #A7F3D0;
  margin-bottom: 12px;
}
.free-shipping-card.needed {
  background: linear-gradient(135deg, #FFFBEB, #FEF3C7);
  border-color: #FDE68A;
}
.free-shipping-bar {
  height: 7px;
  background: rgba(0,0,0,0.08);
  border-radius: 99px;
  overflow: hidden;
  margin: 6px 0;
}
.free-shipping-bar > div {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #10B981, #059669);
  transition: width 0.3s ease;
}

/* تنبيه الفحص التلقائي للتعارض داخل السلة */
.cart-safety-alert {
  padding: 12px 14px;
  border-radius: 14px;
  background: #FFF1F2;
  border: 1.5px solid #FECDD3;
  color: #9F1239;
  font-size: 12.5px;
  line-height: 1.5;
  margin-bottom: 12px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.cart-safety-ok {
  padding: 9px 12px;
  border-radius: 12px;
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  color: #166534;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

/* حقول النموذج المجمعة */
.checkout-form-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 12px;
}
.checkout-input-row {
  display: flex;
  gap: 8px;
}
.checkout-input-row > * {
  flex: 1;
}
.checkout-label {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.checkout-field {
  width: 100%;
  padding: 11px 13px;
  border-radius: 12px;
  border: 1.5px solid #CBD5E1;
  background: #F8FAFC;
  font-size: 13.5px;
  color: var(--ink);
  outline: 0;
  box-sizing: border-box;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.checkout-field:focus {
  border-color: var(--t2);
  background: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(37, 102, 179, 0.12);
}

/* خيارات الدفع الحديثة */
.payment-selector {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  margin-bottom: 10px;
}
.pay-opt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 12px;
  background: #F8FAFC;
  border: 1.5px solid #E2E8F0;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
}
.pay-opt.active {
  background: #EFF6FF;
  border-color: var(--t);
  color: var(--t);
  font-weight: 700;
}
.pay-opt span.icon { font-size: 20px; }
.pay-opt span.label { font-size: 11.5px; font-weight: 700; }
.pay-opt span.sub { font-size: 9.5px; color: #64748B; }

/* الفاتورة وتفصيل السعر */
.checkout-invoice {
  background: #F1F5F9;
  border-radius: 14px;
  padding: 12px 14px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 13.5px;
}
.invoice-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #475569;
}
.invoice-row.highlight {
  color: #059669;
  font-weight: 700;
}
.invoice-row.total {
  font-size: 17px;
  font-weight: 900;
  color: var(--t);
  border-top: 1.5px dashed #CBD5E1;
  padding-top: 8px;
  margin-top: 2px;
}

/* أزرار الإجراء السريع */
.checkout-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.btn-wa-order {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 15px 20px;
  border-radius: 16px;
  border: 0;
  background: linear-gradient(135deg, #10B981, #059669);
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 800;
  box-shadow: 0 8px 20px -4px rgba(16, 185, 129, 0.45);
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-wa-order:active {
  transform: scale(0.98);
}
.btn-rx-attach {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 14px;
  background: #EFF6FF;
  border: 1.5px dashed var(--t2);
  color: var(--t);
  font-weight: 700;
  font-size: 13.5px;
  cursor: pointer;
}
.btn-rx-attach.has-file {
  background: #ECFDF5;
  border-color: #10B981;
  color: #047857;
}

/* زر إفراغ السلة ومتابعة التسوق */
.cart-footer-aux {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  padding-top: 8px;
}
.cart-footer-aux button {
  background: none;
  border: 0;
  font-size: 12px;
  color: #64748B;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 8px;
}
.cart-footer-aux button:hover {
  background: #F1F5F9;
  color: #1E293B;
}
.cart-footer-aux button.danger {
  color: #DC2626;
}
.cart-footer-aux button.danger:hover {
  background: #FEE2E2;
}
`;

// إدراج أنماط CSS قبل </style>
const styleEnd = html.indexOf('</style>');
if (styleEnd !== -1) {
  html = html.slice(0, styleEnd) + '\n' + cartCSS + '\n' + html.slice(styleEnd);
}

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('CSS inserted successfully. File length:', html.length);
