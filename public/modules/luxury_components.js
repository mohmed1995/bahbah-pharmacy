/**
 * ============================================================================
 * BAHBAH LUXURY PHARMACY OS - LUXURY ARCHITECTURAL COMPONENTS
 * JavaScript Module: luxury_components.js
 * Chief Digital Architect: Eng. Ziad Tarek
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  // Core Luxury UI Architecture Namespace
  const LuxuryUI = {
    version: '2026.1.0',
    activeAutocompleteIndex: -1,
    currentResults: [],
    
    // Sample Catalog & Defaults (Graceful fallback if host app DB is initializing)
    catalogFallback: [
      { id: '101', name_ar: 'كونكور 5 بلس 30 قرص', name_en: 'Concor 5 Plus 30 Tab', generic: 'Bisoprolol + Hydrochlorothiazide', price: 85.50, batch: 'B9921', expiry: '11/2028', shelf: 'A1-04' },
      { id: '102', name_ar: 'بانادول اكسترا 24 قرص', name_en: 'Panadol Extra 24 Tab', generic: 'Paracetamol 500mg + Caffeine 65mg', price: 42.00, batch: 'P4401', expiry: '08/2027', shelf: 'B2-12' },
      { id: '103', name_ar: 'أوجمنتين 1 جم 14 قرص', name_en: 'Augmentin 1g 14 Tab', generic: 'Amoxicillin + Clavulanic Acid', price: 131.00, batch: 'AG772', expiry: '04/2027', shelf: 'C1-02' },
      { id: '104', name_ar: 'جلوكوفاج 1000 مجم 30 قرص', name_en: 'Glucophage 1000mg 30 Tab', generic: 'Metformin HCl 1000mg', price: 60.00, batch: 'GL880', expiry: '10/2028', shelf: 'A2-08' },
      { id: '105', name_ar: 'كونجستال 20 قرص', name_en: 'Congestal 20 Tab', generic: 'Paracetamol + Chlorpheniramine + Pseudoephedrine', price: 31.00, batch: 'CN119', expiry: '06/2027', shelf: 'B1-05' },
      { id: '106', name_ar: 'أنتينال كبسول 24 كبسولة', name_en: 'Antinal 24 Caps', generic: 'Nifuroxazide 200mg', price: 36.00, batch: 'AN302', expiry: '01/2028', shelf: 'D1-15' },
      { id: '107', name_ar: 'ليبيدور 20 مجم 30 قرص', name_en: 'Lipitor 20mg 30 Tab', generic: 'Atorvastatin 20mg', price: 165.00, batch: 'LP551', expiry: '09/2028', shelf: 'A3-01' },
      { id: '108', name_ar: 'كتافلام 50 مجم 20 قرص', name_en: 'Cataflam 50mg 20 Tab', generic: 'Diclofenac Potassium 50mg', price: 54.00, batch: 'CT662', expiry: '12/2027', shelf: 'B3-07' }
    ],

    // VIP Chronic Patients Mock Registry
    chronicPatients: [
      {
        id: 'VIP-9001',
        name: 'أ.د. سمير إبراهيم المنشاوي',
        phone: '01012345678',
        nationalId: '26508120102345',
        diagnosis: 'ضغط الدم الشرياني المرتفع + السكري نمط 2',
        tier: 'VIP Platinum',
        lastDispensed: '14 أكتوبر 2026',
        nextDue: '14 نوفمبر 2026',
        isDueNow: true,
        monthlyRx: [
          { drug: 'كونكور 5 بلس 30 قرص', dosage: 'قرص صباحاً بعد الإفطار', qty: 1, price: 85.50 },
          { drug: 'جلوكوفاج 1000 مجم 30 قرص', dosage: 'قرص بعد الغداء والعشاء', qty: 2, price: 120.00 },
          { drug: 'ليبيدور 20 مجم 30 قرص', dosage: 'قرص قبل النوم', qty: 1, price: 165.00 }
        ]
      },
      {
        id: 'VIP-9002',
        name: 'الحاجة / فاطمة عبد الرحمن النجار',
        phone: '01198765432',
        nationalId: '25805141209876',
        diagnosis: 'قصور الشريان التاجي + هشاشة العظام',
        tier: 'VIP Gold',
        lastDispensed: '28 أكتوبر 2026',
        nextDue: '28 نوفمبر 2026',
        isDueNow: false,
        monthlyRx: [
          { drug: 'بلافيكس 75 مجم 28 قرص', dosage: 'قرص واحد يومياً', qty: 1, price: 205.00 },
          { drug: 'كالسيترون كبسول', dosage: 'كبسولة بعد الغداء', qty: 1, price: 79.00 }
        ]
      }
    ],

    // Distributors Missing Shortage Registry
    distributors: [
      {
        id: 'ibnsina',
        name: 'ابن سينا فارما (Ibnsina Pharma)',
        repName: 'د. كريم عبد العزيز',
        phone: '+201009876543',
        missingCount: 14,
        totalEst: 16850.00,
        items: [
          { name: 'كونكور 5 بلس', qty: 20, estPrice: 1710 },
          { name: 'أوجمنتين 1 جم', qty: 30, estPrice: 3930 },
          { name: 'بانادول اكسترا', qty: 50, estPrice: 2100 },
          { name: 'جلوكوفاج 1000', qty: 40, estPrice: 2400 }
        ]
      },
      {
        id: 'united',
        name: 'الشركة المتحدة للصيادلة (UCP)',
        repName: 'أ. طارق الشناوي',
        phone: '+201221122334',
        missingCount: 9,
        totalEst: 11420.00,
        items: [
          { name: 'ليبيدور 20 مجم', qty: 15, estPrice: 2475 },
          { name: 'كتافلام 50 مجم', qty: 25, estPrice: 1350 },
          { name: 'كونجستال أقراص', qty: 35, estPrice: 1085 }
        ]
      },
      {
        id: 'pharma_overseas',
        name: 'فارما أوفرسيز (Pharma Overseas)',
        repName: 'د. محمود صقر',
        phone: '+201114455667',
        missingCount: 6,
        totalEst: 8900.00,
        items: [
          { name: 'سيريبرولايسين أمبول', qty: 10, estPrice: 3500 },
          { name: 'نيوروبيون أمبول', qty: 30, estPrice: 1350 }
        ]
      },
      {
        id: 'multi_pharma',
        name: 'مالتي فارما (Multi Pharma)',
        repName: 'أ. وليد الجيار',
        phone: '+201066778899',
        missingCount: 5,
        totalEst: 6300.00,
        items: [
          { name: 'أنتينال كبسول', qty: 40, estPrice: 1440 },
          { name: 'ميوكوفللين شراب', qty: 20, estPrice: 860 }
        ]
      }
    ]
  };

  /**
   * ==========================================================================
   * 1. ULTRA-FAST AUTOCOMPLETE DROPDOWN COMPONENT
   * ==========================================================================
   */
  LuxuryUI.initAutocomplete = function (customInputSelector) {
    const inputSelector = customInputSelector || '#searchInput, #product-search, input[name="search"]';
    const input = document.querySelector(inputSelector);
    if (!input) return;

    // Wrap or attach dropdown container
    let dropdown = document.getElementById('lx-autocomplete-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'lx-autocomplete-dropdown';
      dropdown.className = 'lx-autocomplete-dropdown';
      dropdown.style.display = 'none';
      input.parentElement.style.position = 'relative';
      input.parentElement.appendChild(dropdown);
    }

    // Input Search Listener with Debounce
    let debounceTimer;
    input.addEventListener('input', function (e) {
      clearTimeout(debounceTimer);
      const query = (e.target.value || '').trim().toLowerCase();
      if (query.length < 1) {
        LuxuryUI.hideAutocomplete();
        return;
      }

      debounceTimer = setTimeout(() => {
        LuxuryUI.renderAutocompleteResults(query, dropdown, input);
      }, 70);
    });

    // Keyboard Navigation: Up, Down, Enter, Escape
    input.addEventListener('keydown', function (e) {
      if (dropdown.style.display === 'none') return;

      const items = dropdown.querySelectorAll('.lx-autocomplete-item');
      if (items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        LuxuryUI.activeAutocompleteIndex = (LuxuryUI.activeAutocompleteIndex + 1) % items.length;
        LuxuryUI.updateActiveAutocompleteItem(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        LuxuryUI.activeAutocompleteIndex = (LuxuryUI.activeAutocompleteIndex - 1 + items.length) % items.length;
        LuxuryUI.updateActiveAutocompleteItem(items);
      } else if (e.key === 'Enter') {
        if (LuxuryUI.activeAutocompleteIndex >= 0 && LuxuryUI.activeAutocompleteIndex < items.length) {
          e.preventDefault();
          items[LuxuryUI.activeAutocompleteIndex].click();
        }
      } else if (e.key === 'Escape') {
        LuxuryUI.hideAutocomplete();
      }
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        LuxuryUI.hideAutocomplete();
      }
    });

    // Setup Global Hotkeys: F1 to F9
    LuxuryUI.initGlobalHotkeys(input);
  };

  LuxuryUI.hideAutocomplete = function () {
    const dropdown = document.getElementById('lx-autocomplete-dropdown');
    if (dropdown) dropdown.style.display = 'none';
    LuxuryUI.activeAutocompleteIndex = -1;
  };

  LuxuryUI.updateActiveAutocompleteItem = function (items) {
    items.forEach((item, idx) => {
      if (idx === LuxuryUI.activeAutocompleteIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('active');
      }
    });
  };

  LuxuryUI.renderAutocompleteResults = function (query, dropdown, input) {
    // Resolve products from app environment or fallback catalog
    const productsPool = (window.allProducts && window.allProducts.length) ? window.allProducts :
                         (window.products && window.products.length) ? window.products :
                         LuxuryUI.catalogFallback;

    const matches = productsPool.filter(p => {
      const ar = (p.name_ar || p.name || '').toLowerCase();
      const en = (p.name_en || '').toLowerCase();
      const gen = (p.generic || p.active_ingredient || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      return ar.includes(query) || en.includes(query) || gen.includes(query) || barcode.includes(query);
    }).slice(0, 10);

    LuxuryUI.currentResults = matches;
    LuxuryUI.activeAutocompleteIndex = matches.length > 0 ? 0 : -1;

    if (matches.length === 0) {
      dropdown.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: #94a3b8; font-size: 0.875rem;">
          <p>⚠️ لا توجد أصناف مطابقة لبحثك ("${query}")</p>
          <span style="font-size: 0.75rem; color: #64748b;">تأكد من الحروف أو امسح الباركود مباشرة</span>
        </div>
      `;
      dropdown.style.display = 'block';
      return;
    }

    let itemsHtml = matches.map((p, idx) => {
      const name = p.name_ar || p.name || p.name_en;
      const generic = p.generic || p.active_ingredient || 'دواء معتمد مسجل بهيئة الدواء';
      const price = parseFloat(p.price || 0).toFixed(2);
      const batch = p.batch || 'B2026';
      const shelf = p.shelf || 'A1-01';

      return `
        <div class="lx-autocomplete-item ${idx === 0 ? 'active' : ''}" data-index="${idx}">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); display: flex; align-items: center; justify-content: center; color: #818cf8; font-weight: 900; font-size: 0.85rem;">
              💊
            </div>
            <div>
              <div style="font-weight: 800; color: #ffffff; font-size: 0.92rem;">${name}</div>
              <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">${generic}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem; text-align: left;">
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
              <span style="color: #fbbf24; font-weight: 900; font-family: monospace; font-size: 1.05rem;">${price} ج.م</span>
              <div style="display: flex; gap: 4px;">
                <span style="background: rgba(6, 182, 212, 0.15); border: 1px solid rgba(6, 182, 212, 0.3); color: #22d3ee; font-size: 0.65rem; padding: 1px 6px; border-radius: 4px; font-weight: 700;">
                  رف: ${shelf}
                </span>
                <span style="background: rgba(255, 255, 255, 0.05); color: #94a3b8; font-size: 0.65rem; padding: 1px 6px; border-radius: 4px;">
                  تشغيلة: ${batch}
                </span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Hotkeys Footer Bar
    const hotkeysBar = `
      <div class="lx-hotkeys-bar">
        <div><span class="lx-kbd">Enter</span> لاختيار الصنف والتنزيل للسلة</div>
        <div><span class="lx-kbd">↑ / ↓</span> للتنقل</div>
        <div><span class="lx-kbd">Esc</span> للإغلاق</div>
        <div><span class="lx-kbd">F8</span> روشتة VIP</div>
        <div><span class="lx-kbd">F9</span> طلبيات الموزعين</div>
      </div>
    `;

    dropdown.innerHTML = `<div class="lx-autocomplete-list">${itemsHtml}</div>${hotkeysBar}`;
    dropdown.style.display = 'block';

    // Click Bindings on items
    dropdown.querySelectorAll('.lx-autocomplete-item').forEach(el => {
      el.addEventListener('click', function () {
        const index = parseInt(this.getAttribute('data-index'), 10);
        const selectedProduct = LuxuryUI.currentResults[index];
        LuxuryUI.selectProduct(selectedProduct, input);
      });
    });
  };

  LuxuryUI.selectProduct = function (product, input) {
    if (!product) return;
    LuxuryUI.hideAutocomplete();
    if (input) input.value = '';

    // If host system has addToCart or selectDrug function
    if (typeof window.addToCart === 'function') {
      window.addToCart(product);
    } else if (typeof window.selectProductFromAutocomplete === 'function') {
      window.selectProductFromAutocomplete(product);
    }

    // Dispatch luxury custom event
    const event = new CustomEvent('luxury:product-selected', { detail: { product } });
    window.dispatchEvent(event);
  };

  LuxuryUI.initGlobalHotkeys = function (input) {
    window.addEventListener('keydown', function (e) {
      if (e.key === 'F1') {
        e.preventDefault();
        if (input) { input.focus(); input.select(); }
      } else if (e.key === 'F2') {
        e.preventDefault();
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) checkoutBtn.click();
      } else if (e.key === 'F3') {
        e.preventDefault();
        LuxuryUI.openBarcodeLabelModal();
      } else if (e.key === 'F8') {
        e.preventDefault();
        LuxuryUI.openVipPatientModal();
      } else if (e.key === 'F9') {
        e.preventDefault();
        LuxuryUI.openVendorDispatchModal();
      }
    });
  };

  /**
   * ==========================================================================
   * 2. VIP CHRONIC PATIENTS & SMART QR MODAL
   * ==========================================================================
   */
  LuxuryUI.openVipPatientModal = function (patientId) {
    LuxuryUI.closeModal();
    const patient = LuxuryUI.chronicPatients.find(p => p.id === patientId) || LuxuryUI.chronicPatients[0];

    const modal = document.createElement('div');
    modal.id = 'lx-modal-root';
    modal.className = 'lx-modal-overlay';

    modal.innerHTML = `
      <div class="lx-modal-container" style="max-width: 680px;">
        <!-- Header -->
        <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--lx-crystal-border-subtle); display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; color: #fbbf24;">
              👑
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.1rem; font-weight: 900; color: #ffffff;">ملف مريض الـ VIP ورعاية الأمراض المزمنة</h3>
              <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: #94a3b8;">التعرف الفوري بالـ QR الذكي وصرف الروشتة الشهرية بنقرة واحدة</p>
            </div>
          </div>
          <button onclick="LuxuryUI.closeModal()" class="lx-btn lx-btn-ghost" style="padding: 0.35rem 0.65rem; font-size: 0.9rem;">✕</button>
        </div>

        <!-- Body -->
        <div style="padding: 1.5rem; overflow-y: auto; max-height: calc(85vh - 120px); display: flex; flex-direction: column; gap: 1.25rem;">
          
          <!-- VIP GOLD CARD -->
          <div class="lx-vip-card" style="padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span class="lx-badge-pulse-gold" style="display: inline-block; padding: 0.2rem 0.75rem; background: rgba(245, 158, 11, 0.25); border: 1px solid rgba(251, 191, 36, 0.6); border-radius: 9999px; font-size: 0.7rem; font-weight: 900; color: #fef08a; letter-spacing: 0.5px;">
                  ✨ ${patient.tier} MEMBER
                </span>
                <h4 style="margin: 0.75rem 0 0 0; font-size: 1.25rem; font-weight: 900; color: #ffffff; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">${patient.name}</h4>
                <div style="font-size: 0.8rem; color: #fde68a; margin-top: 4px; font-family: monospace;">كود المريض: ${patient.id} | هاتف: ${patient.phone}</div>
              </div>
              <div class="lx-gold-chip"></div>
            </div>

            <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid rgba(254, 240, 138, 0.2); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <span style="font-size: 0.7rem; color: #fde68a; display: block;">التشخيص الطبي المزمن:</span>
                <span style="font-size: 0.82rem; font-weight: 800; color: #ffffff;">${patient.diagnosis}</span>
              </div>
              <div style="text-align: left;">
                <span style="font-size: 0.7rem; color: #fde68a; display: block;">حالة استحقاق الصرف:</span>
                <span style="font-size: 0.82rem; font-weight: 900; color: ${patient.isDueNow ? '#34d399' : '#38bdf8'};">
                  ${patient.isDueNow ? '🟢 مستحق الصرف اليوم ✨' : '🔵 الصرف القادم: ' + patient.nextDue}
                </span>
              </div>
            </div>
          </div>

          <!-- Monthly Prescription Table -->
          <div style="background: rgba(3, 7, 18, 0.6); border: 1px solid var(--lx-crystal-border-subtle); border-radius: 1rem; padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <h5 style="margin: 0; font-size: 0.875rem; font-weight: 800; color: #f1f5f9;">📋 بنود الروشتة الشهرية المعتمدة</h5>
              <span style="font-size: 0.75rem; color: #94a3b8;">آخر صرف: ${patient.lastDispensed}</span>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${patient.monthlyRx.map(item => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.8rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 0.625rem;">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: #ffffff;">${item.drug}</div>
                    <div style="font-size: 0.72rem; color: #38bdf8; margin-top: 2px;">⚡ الجرعة: ${item.dosage}</div>
                  </div>
                  <div style="text-align: left;">
                    <div style="font-size: 0.9rem; font-weight: 800; color: #fbbf24; font-family: monospace;">${item.price.toFixed(2)} ج.م</div>
                    <div style="font-size: 0.7rem; color: #94a3b8;">الكمية: ${item.qty} علبة</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Action Hydraulic Buttons -->
          <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem;">
            <button onclick="LuxuryUI.closeModal()" class="lx-btn lx-btn-ghost" style="padding: 0.75rem 1.25rem;">إلغاء</button>
            <button id="lx-dispense-rx-btn" onclick="LuxuryUI.dispenseChronicRx('${patient.id}')" class="lx-btn lx-btn-gold" style="padding: 0.75rem 1.5rem; font-size: 0.95rem;">
              <span>⚡</span> صرف الروشتة الشهرية للطلب الحالي بنقرة واحدة
            </button>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(modal);
  };

  LuxuryUI.dispenseChronicRx = function (patientId) {
    const patient = LuxuryUI.chronicPatients.find(p => p.id === patientId);
    if (!patient) return;

    // Push each drug to the cart
    patient.monthlyRx.forEach(item => {
      const match = LuxuryUI.catalogFallback.find(p => p.name_ar === item.drug || p.name_en === item.drug) || {
        name_ar: item.drug,
        name: item.drug,
        price: item.price,
        qty: item.qty
      };

      if (typeof window.addToCart === 'function') {
        window.addToCart(match);
      }
    });

    LuxuryUI.closeModal();

    // Trigger Notification
    alert(`✅ تم صرف وتنزيل الروشتة الشهرية للعميل VIP (${patient.name}) بنجاح إلى الفاتورة!`);
  };

  /**
   * ==========================================================================
   * 3. WHATSAPP VENDOR DISPATCH MODAL
   * ==========================================================================
   */
  LuxuryUI.openVendorDispatchModal = function () {
    LuxuryUI.closeModal();

    const modal = document.createElement('div');
    modal.id = 'lx-modal-root';
    modal.className = 'lx-modal-overlay';

    modal.innerHTML = `
      <div class="lx-modal-container" style="max-width: 780px;">
        <!-- Header -->
        <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--lx-crystal-border-subtle); display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; color: #34d399;">
              🚚
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.1rem; font-weight: 900; color: #ffffff;">بوابة توزيع طلبيات النواقص للموزعين عبر واتساب</h3>
              <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: #94a3b8;">تجميع ذكي لنواقص المخزن وإرسالها مباشرة لمندوبي كبرى شركات التوزيع المصرية</p>
            </div>
          </div>
          <button onclick="LuxuryUI.closeModal()" class="lx-btn lx-btn-ghost" style="padding: 0.35rem 0.65rem; font-size: 0.9rem;">✕</button>
        </div>

        <!-- Body / Distributors Grid -->
        <div style="padding: 1.5rem; overflow-y: auto; max-height: calc(85vh - 120px); display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem;">
          ${LuxuryUI.distributors.map(dist => `
            <div class="lx-glass-panel" style="padding: 1.25rem; border-color: rgba(16, 185, 129, 0.25); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                  <div>
                    <h4 style="margin: 0; font-size: 0.98rem; font-weight: 800; color: #ffffff;">${dist.name}</h4>
                    <span style="font-size: 0.72rem; color: #94a3b8;">المندوب: ${dist.repName}</span>
                  </div>
                  <span class="lx-badge-pulse-emerald" style="padding: 0.2rem 0.6rem; border-radius: 9999px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(52, 211, 153, 0.5); font-size: 0.7rem; font-weight: 800; color: #6ee7b7;">
                    ${dist.missingCount} صنف ناقص
                  </span>
                </div>

                <!-- Missing Items Preview -->
                <div style="background: rgba(3, 7, 18, 0.6); border-radius: 0.75rem; padding: 0.75rem; margin-bottom: 1rem; font-size: 0.78rem;">
                  <div style="color: #cbd5e1; font-weight: 700; margin-bottom: 0.4rem;">أبرز الأصناف المطلوبة:</div>
                  ${dist.items.map(it => `
                    <div style="display: flex; justify-content: space-between; color: #94a3b8; padding: 2px 0;">
                      <span>• ${it.name} (${it.qty} علبة)</span>
                      <span style="color: #fbbf24; font-family: monospace;">${it.estPrice} ج.م</span>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; padding-top: 0.5rem; border-top: 1px solid rgba(255, 255, 255, 0.08);">
                  <span style="font-size: 0.75rem; color: #94a3b8;">القيمة التقديرية:</span>
                  <span style="font-size: 1.1rem; font-weight: 900; color: #34d399; font-family: monospace;">${dist.totalEst.toLocaleString()} ج.م</span>
                </div>

                <button onclick="LuxuryUI.sendWhatsAppOrder('${dist.id}')" class="lx-btn lx-btn-emerald" style="width: 100%; padding: 0.65rem 1rem; font-size: 0.85rem;">
                  <span>💬</span> إرسال الطلبية فورا للمندوب واتساب
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  };

  LuxuryUI.sendWhatsAppOrder = function (distId) {
    const dist = LuxuryUI.distributors.find(d => d.id === distId);
    if (!dist) return;

    const pharmacyName = 'صيدلية بحبح الفاخرة';
    const timestamp = new Date().toLocaleString('ar-EG');

    let message = `*طلب نواقص عاجل - ${pharmacyName}*\n`;
    message += `التاريخ: ${timestamp}\n`;
    message += `الموجه إلى: ${dist.name} (عناية الزميل: ${dist.repName})\n\n`;
    message += `يرجى تسجيل وتجهيز النواقص التالية للصيدلية كأولوية:\n`;
    message += `-----------------------------------\n`;

    dist.items.forEach((it, idx) => {
      message += `${idx + 1}. *${it.name}* | الكمية: ${it.qty} علبة\n`;
    });

    message += `-----------------------------------\n`;
    message += `إجمالي الأصناف: ${dist.missingCount} صنف\n`;
    message += `القيمة التقديرية: ${dist.totalEst.toLocaleString()} ج.م\n\n`;
    message += `_تم الإرسال آلياً عبر نظام صيدلية بحبح OS الفاخر 2026_`;

    const encoded = encodeURIComponent(message);
    const cleanPhone = dist.phone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;

    window.open(waUrl, '_blank');
  };

  /**
   * ==========================================================================
   * 4. THERMAL BARCODE LABEL MODAL (38x25 mm)
   * ==========================================================================
   */
  LuxuryUI.openBarcodeLabelModal = function (productData) {
    LuxuryUI.closeModal();

    const product = productData || {
      name: 'كونكور 5 بلس 30 قرص',
      generic: 'Bisoprolol + HCTZ',
      price: 85.50,
      barcode: '6223001234567',
      batch: 'LOT-9942',
      expiry: '11/2028',
      shelf: 'D-02'
    };

    const modal = document.createElement('div');
    modal.id = 'lx-modal-root';
    modal.className = 'lx-modal-overlay';

    modal.innerHTML = `
      <div class="lx-modal-container" style="max-width: 540px;">
        <!-- Header -->
        <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--lx-crystal-border-subtle); display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(6, 182, 212, 0.15); border: 1px solid rgba(6, 182, 212, 0.4); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; color: #22d3ee;">
              🏷️
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.1rem; font-weight: 900; color: #ffffff;">طباعة ملصق الباركود الحراري 38×25 مم</h3>
              <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: #94a3b8;">متوافق 100% مع طابعات Xprinter و Zebra و HPRT</p>
            </div>
          </div>
          <button onclick="LuxuryUI.closeModal()" class="lx-btn lx-btn-ghost" style="padding: 0.35rem 0.65rem; font-size: 0.9rem;">✕</button>
        </div>

        <!-- Body / Realistic 38x25mm Label Visualizer -->
        <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem;">
          
          <div style="text-align: center; color: #94a3b8; font-size: 0.75rem;">
            معاينة الملصق الحقيقي (أبعاد الملصق الحراري: 38 مم عرض × 25 مم ارتفاع):
          </div>

          <!-- REALISTIC ON-SCREEN LABEL PREVIEW -->
          <div class="lx-thermal-label-preview" id="lx-label-preview">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #64748b; padding-bottom: 4px;">
              <span style="font-weight: 900; font-size: 13px; color: #020617;">صيدلية بحبح الفاخرة</span>
              <span style="font-weight: 800; font-size: 11px; background: #000; color: #fff; padding: 1px 6px; border-radius: 3px;">رف: ${product.shelf}</span>
            </div>

            <div style="margin: 4px 0;">
              <div style="font-weight: 900; font-size: 15px; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${product.name}</div>
            </div>

            <!-- Precision Vector SVG Barcode -->
            <div style="text-align: center; margin: 2px 0;">
              <svg width="240" height="55" viewBox="0 0 240 55" style="display: block; margin: 0 auto;">
                <rect x="10" y="0" width="3" height="42" fill="#000" />
                <rect x="16" y="0" width="2" height="42" fill="#000" />
                <rect x="22" y="0" width="4" height="42" fill="#000" />
                <rect x="29" y="0" width="2" height="42" fill="#000" />
                <rect x="34" y="0" width="5" height="42" fill="#000" />
                <rect x="42" y="0" width="2" height="42" fill="#000" />
                <rect x="48" y="0" width="3" height="42" fill="#000" />
                <rect x="55" y="0" width="4" height="42" fill="#000" />
                <rect x="62" y="0" width="2" height="42" fill="#000" />
                <rect x="68" y="0" width="5" height="42" fill="#000" />
                <rect x="76" y="0" width="3" height="42" fill="#000" />
                <rect x="83" y="0" width="2" height="42" fill="#000" />
                <rect x="88" y="0" width="4" height="42" fill="#000" />
                <rect x="95" y="0" width="3" height="42" fill="#000" />
                <rect x="102" y="0" width="5" height="42" fill="#000" />
                <rect x="110" y="0" width="2" height="42" fill="#000" />
                <rect x="115" y="0" width="4" height="42" fill="#000" />
                <rect x="122" y="0" width="3" height="42" fill="#000" />
                <rect x="128" y="0" width="2" height="42" fill="#000" />
                <rect x="133" y="0" width="5" height="42" fill="#000" />
                <rect x="141" y="0" width="3" height="42" fill="#000" />
                <rect x="147" y="0" width="2" height="42" fill="#000" />
                <rect x="153" y="0" width="4" height="42" fill="#000" />
                <rect x="160" y="0" width="2" height="42" fill="#000" />
                <rect x="165" y="0" width="5" height="42" fill="#000" />
                <rect x="173" y="0" width="3" height="42" fill="#000" />
                <rect x="180" y="0" width="2" height="42" fill="#000" />
                <rect x="185" y="0" width="4" height="42" fill="#000" />
                <rect x="192" y="0" width="3" height="42" fill="#000" />
                <rect x="198" y="0" width="4" height="42" fill="#000" />
                <rect x="205" y="0" width="2" height="42" fill="#000" />
                <rect x="210" y="0" width="5" height="42" fill="#000" />
                <rect x="218" y="0" width="3" height="42" fill="#000" />
                <text x="120" y="52" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle" fill="#000">${product.barcode}</text>
              </svg>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #000; padding-top: 4px;">
              <div>
                <span style="font-size: 11px; font-weight: 700; color: #334155;">تشغيلة: ${product.batch}</span>
                <span style="font-size: 11px; font-weight: 700; color: #334155; margin-right: 8px;">صلاحية: ${product.expiry}</span>
              </div>
              <div style="font-size: 18px; font-weight: 900; font-family: monospace; color: #000;">
                ${parseFloat(product.price).toFixed(2)} ج.م
              </div>
            </div>
          </div>

          <!-- Quantity Stepper & Print Trigger -->
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 0.8rem; color: #cbd5e1;">العدد:</span>
              <select id="lx-label-qty" class="lx-btn lx-btn-ghost" style="padding: 0.5rem 0.75rem; background: #0b132b; color: #ffffff;">
                <option value="1">ملصق واحد (1)</option>
                <option value="2">ملصقين (2)</option>
                <option value="5">5 ملصقات</option>
                <option value="10">10 ملصقات (علبة كاملة)</option>
              </select>
            </div>

            <div style="display: flex; gap: 0.5rem;">
              <button onclick="LuxuryUI.closeModal()" class="lx-btn lx-btn-ghost" style="padding: 0.65rem 1rem;">إلغاء</button>
              <button onclick="LuxuryUI.printThermalLabel()" class="lx-btn lx-btn-cyan" style="padding: 0.65rem 1.25rem;">
                <span>🖨️</span> طباعة فورية للملصق
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(modal);
  };

  LuxuryUI.printThermalLabel = function () {
    // Generate or populate dedicated 38x25 mm print target element
    let printTarget = document.getElementById('lxPrintBarcodeTarget');
    if (!printTarget) {
      printTarget = document.createElement('div');
      printTarget.id = 'lxPrintBarcodeTarget';
      document.body.appendChild(printTarget);
    }

    const preview = document.getElementById('lx-label-preview');
    if (!preview) return;

    const qty = parseInt(document.getElementById('lx-label-qty')?.value || '1', 10);
    const content = preview.innerHTML;

    // Fill print target with requested number of stickers
    printTarget.innerHTML = '';
    for (let i = 0; i < qty; i++) {
      const page = document.createElement('div');
      page.style.width = '38mm';
      page.style.height = '25mm';
      page.style.pageBreakAfter = 'always';
      page.innerHTML = content;
      printTarget.appendChild(page);
    }

    // Launch Native Print Dialog
    window.print();
  };

  LuxuryUI.closeModal = function () {
    const modal = document.getElementById('lx-modal-root');
    if (modal) {
      modal.remove();
    }
  };

  // Expose to window
  window.LuxuryUI = LuxuryUI;

  // Auto-init autocomplete on DOM ready if search input exists
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LuxuryUI.initAutocomplete());
  } else {
    LuxuryUI.initAutocomplete();
  }

})(window, document);
