/**
 * Amazon-Style Cart Manager
 * المميزات:
 * 1. تحكم فوري بالكميات (+ / -).
 * 2. حذف فوري مع إشعار تراجع Undo Toast.
 * 3. حفظ لوقت لاحق (Save for Later) والاستعادة للسلة.
 * 4. ملخص لحظي يعتمد حصراً على PricingCalculator المشترك.
 */
class AmazonCartManager {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'pharmacy_cart';
    this.savedStorageKey = options.savedStorageKey || 'pharmacy_saved_for_later';
    this.onUpdate = options.onUpdate || (() => {});
    this.lastDeleted = null;
    this.undoTimeout = null;

    this.items = this.load(this.storageKey);
    this.savedItems = this.load(this.savedStorageKey);
  }

  load(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      return [];
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    localStorage.setItem(this.savedStorageKey, JSON.stringify(this.savedItems));
    this.onUpdate({
      items: this.items,
      savedItems: this.savedItems,
      summary: this.getSummary()
    });
  }

  getSummary() {
    if (typeof PricingCalculator !== 'undefined') {
      return PricingCalculator.calculateOrderSummary(this.items);
    }
    // Fallback if pricing.js is missing
    const subtotal = this.items.reduce((s, i) => s + (i.price * i.qty), 0);
    return { subtotal, shipping: 0, total: subtotal, totalItems: this.items.length };
  }

  // إضافة منتج أو زيادة كميته
  addItem(product) {
    const existing = this.items.find(i => i.id === product.id);
    if (existing) {
      existing.qty += (product.qty || 1);
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image: product.image || '',
        qty: product.qty || 1
      });
    }
    this.save();
  }

  // تعديل الكمية (+/-)
  updateQty(id, delta) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      this.removeItem(id);
    } else {
      this.save();
    }
  }

  // حذف منتج مع ميزة الـ Undo
  removeItem(id) {
    const idx = this.items.findIndex(i => i.id === id);
    if (idx === -1) return;

    const [removed] = this.items.splice(idx, 1);
    this.lastDeleted = { item: removed, index: idx };
    this.save();
    this.showUndoToast(removed);
  }

  // التراجع عن الحذف (Undo)
  undoDelete() {
    if (!this.lastDeleted) return;
    this.items.splice(this.lastDeleted.index, 0, this.lastDeleted.item);
    this.lastDeleted = null;
    clearTimeout(this.undoTimeout);
    this.hideUndoToast();
    this.save();
  }

  // حفظ لوقت لاحق (Save for later)
  saveForLater(id) {
    const idx = this.items.findIndex(i => i.id === id);
    if (idx === -1) return;

    const [item] = this.items.splice(idx, 1);
    this.savedItems.push(item);
    this.save();
  }

  // نقل من "محفوظ لاحقاً" إلى السلة
  moveToCart(id) {
    const idx = this.savedItems.findIndex(i => i.id === id);
    if (idx === -1) return;

    const [item] = this.savedItems.splice(idx, 1);
    this.addItem(item);
  }

  // حذف نهائي من المحفوظات لاحقاً
  removeSavedItem(id) {
    this.savedItems = this.savedItems.filter(i => i.id !== id);
    this.save();
  }

  // Toast التراجع
  showUndoToast(item) {
    let toast = document.getElementById('amazon-undo-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'amazon-undo-toast';
      toast.className = 'undo-toast';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <span>تم حذف "<b>${item.name}</b>" من سلتك.</span>
      <button id="toast-undo-btn" class="toast-undo-action">تراجع</button>
    `;

    toast.querySelector('#toast-undo-btn').onclick = () => this.undoDelete();
    toast.classList.add('visible');

    clearTimeout(this.undoTimeout);
    this.undoTimeout = setTimeout(() => {
      this.hideUndoToast();
      this.lastDeleted = null;
    }, 5000);
  }

  hideUndoToast() {
    const toast = document.getElementById('amazon-undo-toast');
    if (toast) toast.classList.remove('visible');
  }
}

if (typeof window !== 'undefined') {
  window.AmazonCartManager = AmazonCartManager;
}
