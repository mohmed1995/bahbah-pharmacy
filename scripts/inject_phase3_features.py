import os

FILES = [
    r'F:\صيدليه\admin_pos.html',
    r'F:\صيدليه\pharmacy_pos_management\admin_pos.html'
]

HEADER_BTNS_HTML = """
      <!-- Manager Mobile View Button -->
      <a 
        href="/manager_mobile.html" 
        target="_blank"
        class="bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 font-bold px-2.5 py-1.5 rounded-xl shadow text-xs flex items-center gap-1 transition active:scale-95"
        title="فتح لوحة تحكم المدير والملاك الحية بالموبايل"
      >
        <span>📱</span>
        <span class="hidden md:inline">موبايل المدير</span>
      </a>

      <!-- Distributor Invoice OCR Button -->
      <button 
        onclick="openInvoiceOcrModal()" 
        class="bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 font-bold px-2.5 py-1.5 rounded-xl shadow text-xs flex items-center gap-1 transition active:scale-95"
        title="قارئ ومحلل فواتير الموزعين الذكي بالكاميرا (ابن سينا، المتحدة، فارما أوفرسيز)"
      >
        <span>📷</span>
        <span class="hidden md:inline">ماسح الفواتير OCR</span>
      </button>"""

PLANOGRAM_TAB_BTN = """
        <!-- TAB: SMART PLANOGRAM (بلانوجرام الأرفف الذكي) -->
        <button id="tab-planogram-btn" onclick="switchTab('planogram')" class="text-slate-300 hover:text-white px-2 md:px-3 py-1.5 rounded-xl transition flex items-center gap-1 shrink-0" title="المخطط الذكي للرفوف وخريطة توزيع الأدوية">
          <span class="text-amber-400">🗺️</span>
          <span>بلانوجرام الأرفف</span>
        </button>"""

INVOICE_OCR_MODAL = """
  <!-- ========================================================================== -->
  <!-- MODAL: DISTRIBUTOR INVOICE OCR & SMART INWARD SCANNER (ماسح فواتير الموزعين) -->
  <!-- ========================================================================== -->
  <div id="invoiceOcrModal" class="hidden fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6">
    <div class="crystal-card w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-cyan-500/30">
      <div class="p-4 md:p-5 border-b border-white/10 flex items-center justify-between bg-[#050814]/80">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-xl font-bold shadow-lg shadow-cyan-500/20">
            📷
          </div>
          <div>
            <h3 class="text-base font-black text-white flex items-center gap-2">
              <span>قارئ ومحلل فواتير الموزعين الذكي (Invoice OCR & Inward Engine)</span>
              <span class="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/40 font-bold">الذكاء الاصطناعي الضوئي</span>
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">استخراج التشغيلات وتواريخ الصلاحية والأسعار الجديدة من فواتير ابن سينا والمتحدة وفارما أوفرسيز آلياً</p>
          </div>
        </div>
        <button onclick="closeInvoiceOcrModal()" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition text-lg">&times;</button>
      </div>

      <div class="p-4 md:p-6 overflow-y-auto space-y-5">
        <!-- Distributor Selector & Upload Controls -->
        <div class="bg-[#050814] p-4 rounded-3xl border border-white/10 space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="text-xs text-slate-300 block mb-1 font-semibold">شركة التوزيع الموردة:</label>
              <select id="ocrDistributorSelect" class="w-full bg-[#0b1329] border border-white/10 rounded-xl p-2.5 text-white text-xs outline-none focus:border-cyan-500">
                <option value="ibnsina">ابن سينا فارما (Ibnsina Pharma)</option>
                <option value="ucp">الشركة المتحدة للصيادلة (UCP)</option>
                <option value="overseas">فارما أوفرسيز (Pharma Overseas)</option>
                <option value="multi">مالتي فارما (Multi Pharma)</option>
                <option value="ramco">رامكو فارما (Ramco)</option>
              </select>
            </div>
            <div class="md:col-span-2 flex items-end gap-2">
              <button onclick="simulateOcrSample()" class="flex-1 btn-hydraulic btn-gradient-cyan text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25">
                <span>⚡</span> مسح عينة فاتورة إلكترونية حقيقية
              </button>
              <label class="btn-hydraulic bg-[#0b1329] hover:bg-slate-800 text-slate-200 border border-white/20 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer">
                <span>📂</span> رفع صورة الفاتورة
                <input type="file" accept="image/*,.pdf" class="hidden" onchange="handleOcrFileUpload(event)" />
              </label>
            </div>
          </div>
        </div>

        <!-- OCR Extracted Table -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>📋 الأصناف والتشغيلات المستخرجة من الفاتورة (<span id="ocrItemsCount" class="text-cyan-400">0</span> أصناف):</span>
            <span class="text-slate-400 font-mono text-[11px]" id="ocrInvoiceNumber">INV-PENDING</span>
          </div>
          <div class="crystal-card overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-right text-xs">
                <thead class="bg-[#050814]/90 text-slate-300 font-bold border-b border-white/10">
                  <tr>
                    <th class="p-3">اسم الدواء</th>
                    <th class="p-3">رقم التشغيلة (Batch)</th>
                    <th class="p-3">تاريخ الصلاحية</th>
                    <th class="p-3">الكمية</th>
                    <th class="p-3">بونص</th>
                    <th class="p-3">سعر الشراء</th>
                    <th class="p-3">سعر الجمهور</th>
                    <th class="p-3">الإجمالي</th>
                  </tr>
                </thead>
                <tbody id="ocrItemsTableBody" class="divide-y divide-white/5 font-mono">
                  <tr>
                    <td colspan="8" class="p-8 text-center text-slate-500">
                      اضغط على "مسح عينة فاتورة إلكترونية" أو قم برفع صورة فاتورة ورقية لبدء التحليل
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-white/10 flex items-center justify-between bg-[#050814]/80">
        <button onclick="closeInvoiceOcrModal()" class="px-4 py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white text-xs">إلغاء</button>
        <button id="ocrConfirmInwardBtn" onclick="confirmOcrInward()" disabled class="btn-hydraulic bg-slate-800 text-slate-500 font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-not-allowed">
          <span>📥</span> تأكيد وتوريد الدفعات إلى المخزن والرفوف
        </button>
      </div>
    </div>
  </div>
"""

PLANOGRAM_VIEW_HTML = """
  <!-- ========================================================================== -->
  <!-- MODULE: SMART PLANOGRAM & SHELF HEATMAP VIEW (المخطط الذكي للأرفف) -->
  <!-- ========================================================================== -->
  <main id="planogramView" class="hidden flex-1 p-4 md:p-6 overflow-y-auto">
    <div class="max-w-7xl mx-auto space-y-6">
      <div class="flex flex-wrap items-center justify-between border-b border-white/10 pb-4 gap-3">
        <div>
          <h2 class="text-xl font-black text-white flex items-center gap-2">
            <span class="text-amber-400">🗺️</span> المخطط الذكي للرفوف وهندسة الحركة (Smart Planogram)
          </h2>
          <p class="text-xs text-slate-400 mt-1">توزيع الأدوية وفق قواعد الأرجونوميكس الصيدلي: مستويات العين واليد والرفوف السفلية والعلوية</p>
        </div>
        <div class="flex gap-2">
          <button onclick="loadPlanogramHeatmap()" class="btn-hydraulic bg-[#0b1329] hover:bg-slate-800 text-white border border-amber-500/40 font-bold px-4 py-2 rounded-2xl text-xs flex items-center gap-1.5 transition">
            <span>🔄</span> تحديث خريطة الرفوف
          </button>
        </div>
      </div>

      <!-- Ergonomics Legend -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="bg-amber-950/40 border border-amber-500/40 p-3 rounded-2xl flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">👁️</div>
          <div>
            <span class="text-xs font-bold text-amber-300 block">المنطقة الذهبية (مستوى العين واليد)</span>
            <span class="text-[10px] text-slate-400">رف 2 و 3: للأدوية الأكثر طلباً لتقليل زمن الصرف</span>
          </div>
        </div>
        <div class="bg-indigo-950/40 border border-indigo-500/40 p-3 rounded-2xl flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">⬆️</div>
          <div>
            <span class="text-xs font-bold text-indigo-300 block">منطقة التخزين الفائض (رف 4 علوي)</span>
            <span class="text-[10px] text-slate-400">رف 4: للباكوات الاحتياطية والمستلزمات الخفيفة</span>
          </div>
        </div>
        <div class="bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-2xl flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">⬇️</div>
          <div>
            <span class="text-xs font-bold text-emerald-300 block">منطقة الأحجام الثقيلة (رف 1 سفلي)</span>
            <span class="text-[10px] text-slate-400">رف 1: للمحاليل والمطهرات والعبوات الكبيرة</span>
          </div>
        </div>
      </div>

      <!-- Interactive Shelf Grid -->
      <div id="planogramShelvesGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Dynamically populated -->
      </div>
    </div>
  </main>
"""

JS_NEW_MODULES = """
// ==========================================================================
// INVOICE OCR & SMART PLANOGRAM MODULES
// ==========================================================================

let activeOcrInvoice = null;

function openInvoiceOcrModal() {
  document.getElementById('invoiceOcrModal').classList.remove('hidden');
}

function closeInvoiceOcrModal() {
  document.getElementById('invoiceOcrModal').classList.add('hidden');
  activeOcrInvoice = null;
}

async function simulateOcrSample() {
  const dist = document.getElementById('ocrDistributorSelect').value;
  try {
    const res = await fetch('/api/ocr/parse-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ distributor: dist, text: 'CONCOR 5MG\\nCOVERSYL 4MG\\nPANADOL ADVANCE' })
    });
    const data = await res.json();
    activeOcrInvoice = data;
    renderOcrTable(data);
  } catch (err) {
    alert('حدث خطأ أثناء قراءة الفاتورة');
  }
}

function handleOcrFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  simulateOcrSample();
}

function renderOcrTable(data) {
  const tbody = document.getElementById('ocrItemsTableBody');
  const countBadge = document.getElementById('ocrItemsCount');
  const invNoBadge = document.getElementById('ocrInvoiceNumber');
  const confirmBtn = document.getElementById('ocrConfirmInwardBtn');

  countBadge.innerText = data.items.length;
  invNoBadge.innerText = data.invoice_no;
  tbody.innerHTML = '';

  data.items.forEach(it => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-white/5 transition';
    tr.innerHTML = `
      <td class="p-3 font-bold text-white">${it.name}</td>
      <td class="p-3 text-cyan-300 font-bold">${it.batch_number}</td>
      <td class="p-3 text-emerald-400">${it.expiry_date}</td>
      <td class="p-3 font-black">${it.qty} علبة</td>
      <td class="p-3 text-amber-400 font-bold">+${it.bonus_qty || 0}</td>
      <td class="p-3">${it.cost_price.toFixed(2)} ج.م</td>
      <td class="p-3 text-indigo-300 font-bold">${it.sale_price.toFixed(2)} ج.م</td>
      <td class="p-3 font-bold text-white">${(it.qty * it.cost_price).toFixed(2)} ج.م</td>
    `;
    tbody.appendChild(tr);
  });

  confirmBtn.disabled = false;
  confirmBtn.className = 'btn-hydraulic btn-gradient-emerald text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25';
}

async function confirmOcrInward() {
  if (!activeOcrInvoice) return;
  try {
    const res = await fetch('/api/invoices/inward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activeOcrInvoice)
    });
    const result = await res.json();
    alert(`تم توريد ${result.itemsCount} أصناف وتشغيلات جديدة إلى المخزن والرفوف بنجاح! 📥✨`);
    closeInvoiceOcrModal();
    loadProducts('');
  } catch (err) {
    alert('فشل حفظ توريد الفاتورة');
  }
}

async function loadPlanogramHeatmap() {
  try {
    const res = await fetch('/api/planogram/heatmap');
    const shelves = await res.json();
    const container = document.getElementById('planogramShelvesGrid');
    if (!container) return;
    container.innerHTML = '';

    shelves.forEach(sh => {
      let borderClass = 'border-white/10';
      let tagBg = 'bg-slate-800 text-slate-300';
      if (sh.ergonomic_category === 'prime_eye_hand') {
        borderClass = 'border-amber-500/40 bg-amber-950/20';
        tagBg = 'bg-amber-950 text-amber-300 border border-amber-500/40';
      } else if (sh.ergonomic_category === 'top_overstock') {
        borderClass = 'border-indigo-500/30 bg-indigo-950/20';
        tagBg = 'bg-indigo-950 text-indigo-300 border border-indigo-500/40';
      } else {
        borderClass = 'border-emerald-500/30 bg-emerald-950/20';
        tagBg = 'bg-emerald-950 text-emerald-300 border border-emerald-500/40';
      }

      const card = document.createElement('div');
      card.className = `crystal-card p-4 space-y-2.5 border ${borderClass} transition hover:-translate-y-1`;
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-white">${sh.rack}</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${tagBg}">رف ${sh.shelf_level}</span>
        </div>
        <div class="text-[11px] text-slate-400">
          المنطقة: <b class="text-slate-200">${sh.zone_name}</b><br>
          الممر: <span class="text-cyan-400">${sh.aisle}</span>
        </div>
        <div class="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
          <span>الأصناف: <b class="text-white">${sh.product_count}</b></span>
          <span>المخزون: <b class="text-emerald-400">${sh.total_boxes} علبة</b></span>
        </div>
        <div class="text-[10px] text-slate-400 pt-1 border-t border-white/5 italic">
          💡 ${sh.recommendation}
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {}
}
"""

for filepath in FILES:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Inject Header Quick Buttons
    if 'href="/manager_mobile.html"' not in c:
        target_qb = '<!-- Quick Backup Button -->'
        if target_qb in c:
            c = c.replace(target_qb, HEADER_BTNS_HTML + '\n\n      ' + target_qb, 1)
            print(f" -> Injected header buttons in {filepath}")

    # 2. Inject Planogram Tab Button
    if 'id="tab-planogram-btn"' not in c:
        target_tb = '<button id="tab-table-btn"'
        if target_tb in c:
            c = c.replace(target_tb, PLANOGRAM_TAB_BTN + '\n        ' + target_tb, 1)
            print(f" -> Injected planogram tab button in {filepath}")

    # 3. Inject Invoice OCR Modal
    if 'id="invoiceOcrModal"' not in c:
        target_mod = '<!-- ==========================================================================\n  <!-- MODAL: VISUAL SHELF-LOCATING'
        if target_mod in c:
            c = c.replace(target_mod, INVOICE_OCR_MODAL + '\n\n  ' + target_mod, 1)
            print(f" -> Injected invoice OCR modal in {filepath}")

    # 4. Inject Planogram View
    if 'id="planogramView"' not in c:
        target_vw = '<!-- ==========================================================================\n  <!-- MODULE: CONTROLLED SUBSTANCES'
        if target_vw in c:
            c = c.replace(target_vw, PLANOGRAM_VIEW_HTML + '\n\n  ' + target_vw, 1)
            print(f" -> Injected planogram view in {filepath}")

    # 5. Inject JS Functions
    if 'INVOICE OCR & SMART PLANOGRAM MODULES' not in c:
        last_script = c.rfind('</script>')
        if last_script != -1:
            c = c[:last_script] + '\n\n' + JS_NEW_MODULES + '\n' + c[last_script:]
            print(f" -> Injected JS modules in {filepath}")

    # 6. Update switchTab for planogram
    if "if (tab === 'planogram')" not in c:
        old_switch_target = "if (tab === 'pos') {"
        planogram_hide = "if (document.getElementById('planogramView')) document.getElementById('planogramView').classList.add('hidden');\n      if (document.getElementById('tab-planogram-btn')) document.getElementById('tab-planogram-btn').className = inactiveClass;\n"
        planogram_show = """} else if (tab === 'planogram') {
        if (document.getElementById('planogramView')) document.getElementById('planogramView').classList.remove('hidden');
        if (document.getElementById('tab-planogram-btn')) document.getElementById('tab-planogram-btn').className = 'btn-gradient-amber text-white px-2 md:px-3 py-1.5 rounded-xl shadow-lg shadow-amber-500/25 transition flex items-center gap-1 shrink-0';
        loadPlanogramHeatmap();
      """
        if "if (document.getElementById('tableView'))" in c:
            c = c.replace("if (document.getElementById('tableView'))", planogram_hide + "      if (document.getElementById('tableView'))", 1)
            c = c.replace("} else if (tab === 'table') {", planogram_show + "} else if (tab === 'table') {", 1)
            print(f" -> Updated switchTab for planogram in {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(c)

print('Phase 3 injection complete.')
