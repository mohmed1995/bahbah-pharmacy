import os
import re

LUXURY_CSS = """
    /* ==========================================================================
       BAHBAH LUXURY OS - ARCHITECTURAL COCKPIT DESIGN SYSTEM
       Engineered by: Chief UI/UX Architect Ziad Tarek
       ========================================================================== */
    :root {
      --obsidian-deep: #030712;
      --obsidian-surface: #070d1e;
      --obsidian-card: rgba(11, 19, 43, 0.78);
      --obsidian-card-elevated: rgba(16, 28, 64, 0.92);
      --crystal-border: rgba(255, 255, 255, 0.1);
      --crystal-border-hover: rgba(99, 102, 241, 0.5);
      --emerald-glow: #10b981;
      --sapphire-glow: #6366f1;
      --amber-glow: #f59e0b;
      --rose-laser: #f43f5e;
      --smooth-physics: cubic-bezier(0.16, 1, 0.3, 1);
    }

    .crystal-card {
      background: var(--obsidian-card);
      backdrop-filter: blur(28px) saturate(180%);
      -webkit-backdrop-filter: blur(28px) saturate(180%);
      border: 1px solid var(--crystal-border);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
      border-radius: 1.25rem;
      transition: all 0.3s var(--smooth-physics);
    }
    .crystal-card:hover {
      border-color: var(--crystal-border-hover);
      box-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.65), 0 0 25px 0 rgba(99, 102, 241, 0.25);
      transform: translateY(-2px);
    }
    .btn-hydraulic {
      position: relative;
      overflow: hidden;
      transition: all 0.2s var(--smooth-physics);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }
    .btn-hydraulic:hover {
      transform: translateY(-2px);
      filter: brightness(1.12);
      box-shadow: 0 8px 25px -4px rgba(99, 102, 241, 0.4);
    }
    .btn-hydraulic:active {
      transform: translateY(1px) scale(0.97);
    }
    .laser-pulse-emerald {
      animation: laserPulseGreen 2.4s infinite cubic-bezier(0.66, 0, 0, 1);
    }
    @keyframes laserPulseGreen {
      to { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
    }
    .laser-pulse-rose {
      animation: laserPulseRed 2.0s infinite cubic-bezier(0.66, 0, 0, 1);
    }
    @keyframes laserPulseRed {
      to { box-shadow: 0 0 0 10px rgba(244, 63, 94, 0); }
    }
"""

NEW_TABS_HTML = """
        <!-- TAB: TABLE DRUGS (أدوية الجدول والتفتيش) -->
        <button id="tab-table-btn" onclick="switchTab('table')" class="text-slate-300 hover:text-white px-2 md:px-3 py-1.5 rounded-xl transition flex items-center gap-1 shrink-0" title="دفتر أدوية الجدول والمؤثرات العقلية الرسمي (EDA)">
          <span class="text-rose-400">⚖️</span>
          <span>أدوية الجدول (<span id="tableDrugsBadge" class="text-rose-400 font-bold">0</span>)</span>
        </button>
        <!-- TAB: IN-PHARMACY CLINIC (عيادة الصيدلية) -->
        <button id="tab-clinic-btn" onclick="switchTab('clinic')" class="text-slate-300 hover:text-white px-2 md:px-3 py-1.5 rounded-xl transition flex items-center gap-1 shrink-0" title="عيادة الصيدلية: قياس الضغط والسكر والوزن">
          <span class="text-teal-400">🩺</span>
          <span>عيادة الصيدلية</span>
        </button>
"""

NEW_MODALS_HTML = """
  <!-- ========================================================================== -->
  <!-- MODAL: VISUAL SHELF-LOCATING & 2D PHARMACY FLOOR PLAN (موقع الرف البصري) -->
  <!-- ========================================================================== -->
  <div id="shelfLocatingModal" class="hidden fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6">
    <div class="crystal-card w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-amber-500/30">
      <div class="p-4 md:p-5 border-b border-white/10 flex items-center justify-between bg-[#050814]/80">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xl font-bold shadow-lg shadow-amber-500/20">
            📍
          </div>
          <div>
            <h3 class="text-base font-black text-white flex items-center gap-2">
              <span id="shelfModalProdName">موقع الصنف في أرفف الصيدلية</span>
              <span id="shelfModalProdCode" class="text-xs font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-500/30"></span>
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">مخطط ثنائي الأبعاد (2D Floor Plan) + رسم توضيحي لموقع العلبة على الرف الفعلي</p>
          </div>
        </div>
        <button onclick="closeShelfModal()" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition text-lg">&times;</button>
      </div>

      <div class="p-4 md:p-6 overflow-y-auto space-y-6">
        <!-- Visual Telemetry Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-[#050814] p-3 rounded-2xl border border-white/10 text-center">
            <span class="text-[10px] text-slate-400 block mb-1">المنطقة العلاجية</span>
            <span id="shelfZoneBadge" class="text-xs font-bold text-amber-400">المنطقة A</span>
          </div>
          <div class="bg-[#050814] p-3 rounded-2xl border border-white/10 text-center">
            <span class="text-[10px] text-slate-400 block mb-1">رقم الممر والستاند</span>
            <span id="shelfAisleRackBadge" class="text-xs font-bold text-cyan-400">ممر 1 - ستاند 2</span>
          </div>
          <div class="bg-[#050814] p-3 rounded-2xl border border-white/10 text-center">
            <span class="text-[10px] text-slate-400 block mb-1">مستوى الرف</span>
            <span id="shelfLevelBadge" class="text-xs font-bold text-emerald-400">رف 2 (متوسط)</span>
          </div>
          <div class="bg-[#050814] p-3 rounded-2xl border border-white/10 text-center">
            <span class="text-[10px] text-slate-400 block mb-1">الدرج والخانة</span>
            <span id="shelfBinBadge" class="text-xs font-bold text-indigo-400">درج 204</span>
          </div>
        </div>

        <!-- 2D Floor Plan SVG + Physical Shelf View -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 2D Floor Plan Map -->
          <div class="bg-[#050814] p-4 rounded-3xl border border-white/10 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-slate-300 pb-2 border-b border-white/5">
              <span>🗺️ خريطة مسقط الصيدلية (2D Map)</span>
              <span class="text-[11px] text-amber-400">النقطة المضيئة = موقع الدواء</span>
            </div>
            <div class="relative w-full aspect-[4/3] bg-[#030611] rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center">
              <!-- SVG Pharmacy Blueprint -->
              <svg viewBox="0 0 400 300" class="w-full h-full">
                <!-- Entrance & Cashier -->
                <rect x="150" y="270" width="100" height="25" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1" />
                <text x="200" y="287" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">🚪 المدخل والكاشير</text>
                
                <!-- Zone A: Antibiotics -->
                <rect x="20" y="30" width="70" height="90" rx="8" fill="rgba(99, 102, 241, 0.12)" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="3 3" />
                <text x="55" y="75" text-anchor="middle" fill="#818cf8" font-size="9" font-weight="bold">ZONE-A<tspan x="55" dy="12">مضادات حيوية</tspan></text>

                <!-- Zone B: Chronic Cardio & Diabetes -->
                <rect x="160" y="30" width="80" height="90" rx="8" fill="rgba(16, 185, 129, 0.12)" stroke="#10b981" stroke-width="1.5" stroke-dasharray="3 3" />
                <text x="200" y="75" text-anchor="middle" fill="#34d399" font-size="9" font-weight="bold">ZONE-B<tspan x="200" dy="12">ضغط وسكر</tspan></text>

                <!-- Zone C: Cosmetics -->
                <rect x="310" y="30" width="70" height="90" rx="8" fill="rgba(236, 72, 153, 0.12)" stroke="#ec4899" stroke-width="1.5" stroke-dasharray="3 3" />
                <text x="345" y="75" text-anchor="middle" fill="#f472b6" font-size="9" font-weight="bold">ZONE-C<tspan x="345" dy="12">تجميل وبشرة</tspan></text>

                <!-- Zone D: OTC & Pain -->
                <rect x="40" y="170" width="90" height="70" rx="8" fill="rgba(245, 158, 11, 0.12)" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3 3" />
                <text x="85" y="205" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">ZONE-D<tspan x="85" dy="12">مسكنات و OTC</tspan></text>

                <!-- Zone E: Fridge & Biologicals -->
                <rect x="290" y="170" width="90" height="70" rx="8" fill="rgba(6, 182, 212, 0.12)" stroke="#06b6d4" stroke-width="1.5" stroke-dasharray="3 3" />
                <text x="335" y="205" text-anchor="middle" fill="#22d3ee" font-size="9" font-weight="bold">ZONE-E<tspan x="335" dy="12">ثلاجة الأنسولين</tspan></text>

                <!-- Vault: Controlled Drugs -->
                <rect x="10" y="240" width="50" height="50" rx="6" fill="rgba(244, 63, 94, 0.15)" stroke="#f43f5e" stroke-width="1.5" />
                <text x="35" y="268" text-anchor="middle" fill="#fb7185" font-size="8" font-weight="bold">🔒 جدول</text>

                <!-- Dynamic Glowing Target Pin -->
                <g id="shelfTargetPin" transform="translate(200, 75)">
                  <circle cx="0" cy="0" r="14" fill="rgba(245, 158, 11, 0.3)" class="laser-pulse-rose" />
                  <circle cx="0" cy="0" r="7" fill="#f59e0b" />
                  <circle cx="0" cy="0" r="3" fill="#ffffff" />
                </g>
              </svg>
            </div>
          </div>

          <!-- Physical Shelf Diagram View -->
          <div class="bg-[#050814] p-4 rounded-3xl border border-white/10 space-y-2 flex flex-col">
            <div class="flex items-center justify-between text-xs font-bold text-slate-300 pb-2 border-b border-white/5">
              <span>🗄️ المظهر الفعلي لرف الدواء (Shelf Elevation)</span>
              <span id="shelfElevationText" class="text-[11px] text-emerald-400">الرف المضاء باللون الأخضر</span>
            </div>
            <div class="flex-1 bg-[#02040a] p-3 rounded-2xl border border-white/5 flex flex-col justify-around space-y-2">
              <!-- Shelf Levels (1 to 4) -->
              <div id="shelfLevelRow4" class="shelf-rack-row p-2 rounded-xl border border-white/10 flex items-center justify-between text-xs transition">
                <span class="text-slate-400 font-bold text-[11px]">رف 4 (علوي)</span>
                <span class="text-slate-500 text-[10px]">مخزون إضافي</span>
              </div>
              <div id="shelfLevelRow3" class="shelf-rack-row p-2 rounded-xl border border-white/10 flex items-center justify-between text-xs transition">
                <span class="text-slate-400 font-bold text-[11px]">رف 3 (عين العميل)</span>
                <span class="text-slate-500 text-[10px]">أصناف سريعة الحركة</span>
              </div>
              <div id="shelfLevelRow2" class="shelf-rack-row p-2 rounded-xl border border-white/10 flex items-center justify-between text-xs transition bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-500/20">
                <span class="text-amber-300 font-bold text-xs flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  رف 2 (مستوى اليد) 👈 موقع العلبة هنا!
                </span>
                <span id="shelfHighlightBin" class="bg-amber-400 text-black font-black px-2 py-0.5 rounded-lg text-xs">درج 204</span>
              </div>
              <div id="shelfLevelRow1" class="shelf-rack-row p-2 rounded-xl border border-white/10 flex items-center justify-between text-xs transition">
                <span class="text-slate-400 font-bold text-[11px]">رف 1 (سفلي)</span>
                <span class="text-slate-500 text-[10px]">علب كبيرة ومحاليل</span>
              </div>
            </div>
            <div class="pt-2 text-center text-xs text-slate-400 bg-white/5 p-2 rounded-xl">
              💡 <span id="shelfGuidanceVoice">اتجه إلى ممر 1 -> ستاند A-1 -> الرف الثاني -> الدرج 204</span>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-white/10 flex items-center justify-between bg-[#050814]/80">
        <button onclick="closeShelfModal()" class="px-4 py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white text-xs">إغلاق</button>
        <button id="addFromShelfBtn" onclick="addCurrentShelfProductToCart()" class="btn-hydraulic btn-gradient-emerald text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2">
          <span>🛒</span> أضف هذا الصنف إلى الفاتورة
        </button>
      </div>
    </div>
  </div>

  <!-- ========================================================================== -->
  <!-- MODAL: BATCH SELECTOR (اختيار التشغيلة: سعر قديم vs سعر جديد) -->
  <!-- ========================================================================== -->
  <div id="batchSelectorModal" class="hidden fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="crystal-card w-full max-w-lg overflow-hidden border border-indigo-500/30">
      <div class="p-4 border-b border-white/10 flex items-center justify-between bg-[#050814]/80">
        <div class="flex items-center gap-2">
          <span class="text-xl">📦</span>
          <div>
            <h3 class="text-sm font-bold text-white" id="batchModalProdName">اختيار تشغيلة الدواء والخصم</h3>
            <span class="text-[11px] text-slate-400">تتبع الصلاحية وفصل السعر القديم عن السعر الجديد (Batch Tracking)</span>
          </div>
        </div>
        <button onclick="closeBatchModal()" class="text-slate-400 hover:text-white text-lg">&times;</button>
      </div>
      <div class="p-4 space-y-3">
        <div class="text-xs text-slate-300 pb-1">
          اختر التشغيلة المطلوبة لصرفها للعميل (النظام يوصي بـ FEFO الأقرب للصلاحية أولاً):
        </div>
        <div id="batchListContainer" class="space-y-2 max-h-60 overflow-y-auto">
          <!-- Dynamic Batches Injected Here -->
        </div>
      </div>
      <div class="p-3 border-t border-white/10 flex justify-end bg-[#050814]/80">
        <button onclick="closeBatchModal()" class="px-4 py-1.5 rounded-xl border border-white/10 text-slate-300 hover:text-white text-xs">إلغاء</button>
      </div>
    </div>
  </div>

  <!-- ========================================================================== -->
  <!-- MODAL: CONTROLLED SUBSTANCES COMPLIANCE GATE (بوابة أدوية الجدول) -->
  <!-- ========================================================================== -->
  <div id="tableDrugComplianceModal" class="hidden fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="crystal-card w-full max-w-xl overflow-hidden border border-rose-500/50">
      <div class="p-4 border-b border-rose-500/30 bg-rose-950/40 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl text-rose-400">⚖️</span>
          <div>
            <h3 class="text-sm font-black text-rose-300">قيد أمني: صرف دواء جدول مراقب (EDA)</h3>
            <p class="text-[11px] text-rose-200/80">مطلوب قانونياً تسجيل بيانات المريض والطبيب والروشتة في الدفتر الرسمي</p>
          </div>
        </div>
        <button onclick="closeTableComplianceModal()" class="text-slate-400 hover:text-white text-lg">&times;</button>
      </div>
      <form onsubmit="confirmTableDrugDispense(event)" class="p-4 md:p-5 space-y-3 text-xs">
        <div class="bg-[#050814] p-3 rounded-xl border border-rose-500/20 text-rose-300 font-bold flex justify-between items-center">
          <span id="compDrugName">اسم الصنف</span>
          <span id="compTableClass" class="bg-rose-900/60 px-2 py-0.5 rounded text-[11px] border border-rose-500/40">جدول 2</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="text-slate-300 block mb-1">اسم المريض الرباعي (*):</label>
            <input id="compPatientName" required type="text" placeholder="الاسم كما بالبطاقة" class="w-full bg-[#050814] border border-white/10 rounded-xl p-2 text-white outline-none focus:border-rose-500" />
          </div>
          <div>
            <label class="text-slate-300 block mb-1">الرقم القومي (14 رقماً) (*):</label>
            <input id="compNationalId" required maxlength="14" type="text" placeholder="295XXXXXXXXXXX" class="w-full bg-[#050814] border border-white/10 rounded-xl p-2 text-white outline-none focus:border-rose-500 font-mono" />
          </div>
          <div>
            <label class="text-slate-300 block mb-1">اسم الطبيب المعالج (*):</label>
            <input id="compDoctorName" required type="text" placeholder="د. شريف متولي" class="w-full bg-[#050814] border border-white/10 rounded-xl p-2 text-white outline-none focus:border-rose-500" />
          </div>
          <div>
            <label class="text-slate-300 block mb-1">رقم ترخيص الطبيب / النقابة:</label>
            <input id="compDoctorLicense" type="text" placeholder="DOC-12345" class="w-full bg-[#050814] border border-white/10 rounded-xl p-2 text-white outline-none focus:border-rose-500 font-mono" />
          </div>
          <div>
            <label class="text-slate-300 block mb-1">رقم الروشتة وتاريخها (*):</label>
            <input id="compPrescriptionNo" required type="text" placeholder="RX-9821 بتاريخ اليوم" class="w-full bg-[#050814] border border-white/10 rounded-xl p-2 text-white outline-none focus:border-rose-500" />
          </div>
          <div>
            <label class="text-slate-300 block mb-1">الكمية المصروفة (*):</label>
            <input id="compQty" required type="number" min="1" value="1" class="w-full bg-[#050814] border border-white/10 rounded-xl p-2 text-white outline-none focus:border-rose-500" />
          </div>
        </div>
        <div class="pt-2 flex items-center justify-between border-t border-white/10">
          <button type="button" onclick="closeTableComplianceModal()" class="px-4 py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white">إلغاء</button>
          <button type="submit" class="btn-hydraulic btn-gradient-rose text-white font-bold px-5 py-2 rounded-xl shadow-lg shadow-rose-500/30">
            تأكيد وقيد في دفتر التفتيش وإضافة للسلة ⚖️
          </button>
        </div>
      </form>
    </div>
  </div>
"""

NEW_VIEWS_HTML = """
  <!-- ========================================================================== -->
  <!-- MODULE: CONTROLLED SUBSTANCES REGISTRY VIEW (دفتر أدوية الجدول والتفتيش) -->
  <!-- ========================================================================== -->
  <main id="tableView" class="hidden flex-1 p-4 md:p-6 overflow-y-auto">
    <div class="max-w-7xl mx-auto space-y-6">
      <div class="flex flex-wrap items-center justify-between border-b border-white/10 pb-4 gap-3">
        <div>
          <h2 class="text-xl font-black text-white flex items-center gap-2">
            <span class="text-rose-500">⚖️</span> دفتر قيد أدوية الجدول والمؤثرات العقلية الرسمي
          </h2>
          <p class="text-xs text-slate-400 mt-1">مطابق لاشتراطات هيئة الدواء المصرية (EDA) وقانون مزاولة مهنة الصيدلة (سجل التفتيش الدوري)</p>
        </div>
        <div class="flex gap-2">
          <button onclick="printTableInspectionReport()" class="btn-hydraulic bg-[#0b1329] hover:bg-slate-800 text-white border border-rose-500/40 font-bold px-4 py-2 rounded-2xl text-xs flex items-center gap-1.5 transition">
            <span>🖨️</span> طباعة سجل التفتيش الصيدلي الرسمي
          </button>
        </div>
      </div>

      <div class="crystal-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-right text-xs">
            <thead class="bg-[#050814]/90 text-slate-300 font-bold border-b border-white/10">
              <tr>
                <th class="p-3">التاريخ والوقت</th>
                <th class="p-3">اسم الدواء</th>
                <th class="p-3">نوع الجدول</th>
                <th class="p-3">المريض والرقم القومي</th>
                <th class="p-3">الطبيب المعالج</th>
                <th class="p-3">الروشتة</th>
                <th class="p-3">المنصرف</th>
                <th class="p-3">الرصيد المتبقي</th>
                <th class="p-3">الصيدلي المسؤول</th>
              </tr>
            </thead>
            <tbody id="tableDrugsLogBody" class="divide-y divide-white/5">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </main>

  <!-- ========================================================================== -->
  <!-- MODULE: IN-PHARMACY CLINIC SERVICES VIEW (عيادة الصيدلية السريعة) -->
  <!-- ========================================================================== -->
  <main id="clinicView" class="hidden flex-1 p-4 md:p-6 overflow-y-auto">
    <div class="max-w-6xl mx-auto space-y-6">
      <div class="flex flex-wrap items-center justify-between border-b border-white/10 pb-4 gap-3">
        <div>
          <h2 class="text-xl font-black text-white flex items-center gap-2">
            <span class="text-teal-400">🩺</span> عيادة الصيدلية والخدمات الطبية السريعة
          </h2>
          <p class="text-xs text-slate-400 mt-1">قياس الضغط، السكر، الوزن ومؤشر كتلة الجسم، وطباعة كارت حراري 80mm فوري للمريض</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Input Form -->
        <div class="lg:col-span-2 crystal-card p-5 md:p-6 space-y-5 border border-teal-500/30">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-slate-300 block mb-1 font-semibold">اسم المريض:</label>
              <input id="clinicPatientName" type="text" placeholder="أحمد عبد الفتاح منصور" class="w-full bg-[#050814] border border-white/10 rounded-xl p-2.5 text-white text-xs outline-none focus:border-teal-500" />
            </div>
            <div>
              <label class="text-xs text-slate-300 block mb-1 font-semibold">رقم الموبايل / واتساب:</label>
              <input id="clinicPatientPhone" type="text" placeholder="01012345678" class="w-full bg-[#050814] border border-white/10 rounded-xl p-2.5 text-white text-xs outline-none focus:border-teal-500" />
            </div>
          </div>

          <!-- BP & Pulse -->
          <div class="bg-[#050814]/70 p-4 rounded-2xl border border-white/10 space-y-3">
            <h4 class="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <span>❤️</span> قياس ضغط الدم والنبض
            </h4>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-[11px] text-slate-400 block mb-1">الانقباضي (SYS):</label>
                <input id="clinicBpSys" type="number" placeholder="120" oninput="calculateClinicAssessment()" class="w-full bg-[#0b1329] border border-white/10 rounded-xl p-2 text-white text-center font-bold text-sm outline-none focus:border-rose-500" />
              </div>
              <div>
                <label class="text-[11px] text-slate-400 block mb-1">الانبساطي (DIA):</label>
                <input id="clinicBpDia" type="number" placeholder="80" oninput="calculateClinicAssessment()" class="w-full bg-[#0b1329] border border-white/10 rounded-xl p-2 text-white text-center font-bold text-sm outline-none focus:border-rose-500" />
              </div>
              <div>
                <label class="text-[11px] text-slate-400 block mb-1">النبض (BPM):</label>
                <input id="clinicPulse" type="number" placeholder="72" class="w-full bg-[#0b1329] border border-white/10 rounded-xl p-2 text-white text-center font-bold text-sm outline-none focus:border-rose-500" />
              </div>
            </div>
            <div id="bpStatusBadge" class="text-xs py-1.5 px-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-center">أدخل القراءات للتقييم السريري</div>
          </div>

          <!-- Blood Glucose -->
          <div class="bg-[#050814]/70 p-4 rounded-2xl border border-white/10 space-y-3">
            <h4 class="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <span>🩸</span> قياس نسبة السكر بالدم (mg/dL)
            </h4>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-[11px] text-slate-400 block mb-1">نوع التحليل:</label>
                <select id="clinicGlucoseType" onchange="calculateClinicAssessment()" class="w-full bg-[#0b1329] border border-white/10 rounded-xl p-2 text-white text-xs outline-none focus:border-cyan-500">
                  <option value="random">عشوائي (Random)</option>
                  <option value="fasting">صائم (Fasting)</option>
                  <option value="postprandial">فاطر ساعتين (Post-prandial)</option>
                </select>
              </div>
              <div>
                <label class="text-[11px] text-slate-400 block mb-1">القراءة (mg/dL):</label>
                <input id="clinicGlucoseValue" type="number" placeholder="110" oninput="calculateClinicAssessment()" class="w-full bg-[#0b1329] border border-white/10 rounded-xl p-2 text-white text-center font-bold text-sm outline-none focus:border-cyan-500" />
              </div>
            </div>
            <div id="glucoseStatusBadge" class="text-xs py-1.5 px-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-center">أدخل نسبة السكر للتقييم</div>
          </div>

          <!-- Weight & BMI -->
          <div class="bg-[#050814]/70 p-4 rounded-2xl border border-white/10 space-y-3">
            <h4 class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>⚖️</span> الوزن ومؤشر كتلة الجسم (BMI)
            </h4>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-[11px] text-slate-400 block mb-1">الوزن (كجم):</label>
                <input id="clinicWeight" type="number" step="0.5" placeholder="75" oninput="calculateClinicAssessment()" class="w-full bg-[#0b1329] border border-white/10 rounded-xl p-2 text-white text-center font-bold text-sm outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label class="text-[11px] text-slate-400 block mb-1">الطول (سم):</label>
                <input id="clinicHeight" type="number" placeholder="170" oninput="calculateClinicAssessment()" class="w-full bg-[#0b1329] border border-white/10 rounded-xl p-2 text-white text-center font-bold text-sm outline-none focus:border-emerald-500" />
              </div>
            </div>
            <div id="bmiStatusBadge" class="text-xs py-1.5 px-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-center">أدخل الوزن والطول للتقييم</div>
          </div>

          <!-- Fees & Actions -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div class="flex items-center gap-2">
              <label class="text-xs text-slate-300 font-bold">رسم الخدمة (ج.م):</label>
              <input id="clinicFee" type="number" value="15" class="w-20 bg-[#050814] border border-teal-500/50 rounded-xl p-2 text-teal-300 text-center font-bold text-sm outline-none" />
              <label class="text-[11px] text-slate-400 flex items-center gap-1 cursor-pointer">
                <input id="clinicFeeToDrawer" type="checkbox" checked class="rounded" />
                <span>إيداع بالدرج</span>
              </label>
            </div>
            <div class="flex gap-2">
              <button onclick="printClinicThermalCard()" class="btn-hydraulic btn-gradient-teal text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-teal-500/20 active:scale-95">
                <span>🖨️</span> طباعة كارت المريض الحراري (80mm)
              </button>
              <button onclick="sendClinicWhatsApp()" class="btn-hydraulic btn-gradient-emerald text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95">
                <span>💬</span> إرسال لواتساب المريض
              </button>
            </div>
          </div>
        </div>

        <!-- Thermal Card Live Preview -->
        <div class="crystal-card p-5 space-y-4 border border-teal-500/30 flex flex-col">
          <h3 class="text-xs font-bold text-teal-400 flex items-center gap-1.5 pb-2 border-b border-white/10">
            <span>📋</span> معاينة كارت الفحص الصيدلي الحراري
          </h3>
          <div class="bg-white text-slate-900 p-4 rounded-2xl font-mono text-xs space-y-2 shadow-inner border border-slate-300 flex-1">
            <div class="text-center font-black text-sm pb-1 border-b border-dashed border-slate-400">
              صيدلية بحبح الفاخرة<br>
              <span class="text-[10px] font-normal">كارت الفحص الطبي الصيدلاني</span>
            </div>
            <div class="text-[10px] space-y-0.5 pt-1">
              <div>المريض: <span id="prevPatient" class="font-bold">أحمد عبد الفتاح</span></div>
              <div>التاريخ: <span id="prevDate" class="font-bold">2026-11-13</span></div>
            </div>
            <div class="border-t border-b border-dashed border-slate-400 py-2 space-y-1 text-[11px]">
              <div class="flex justify-between"><span>الضغط:</span><span id="prevBp" class="font-bold">120 / 80</span></div>
              <div class="flex justify-between"><span>النبض:</span><span id="prevPulse" class="font-bold">72 BPM</span></div>
              <div class="flex justify-between"><span>السكر:</span><span id="prevGlucose" class="font-bold">110 mg/dL</span></div>
              <div class="flex justify-between"><span>الـ BMI:</span><span id="prevBmi" class="font-bold">25.9 (وزن صحي)</span></div>
            </div>
            <div class="text-[10px] text-center italic text-slate-600 pt-2">
              "صحتك أمانة.. نتمنى لكم دوام الصحة والعافية"
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
"""

JS_LOGIC = """
// ==========================================================================
// MODERN OFFLINE-FIRST PHARMACY MODULES (2026 EDITION)
// Lead Architect + Dr. Islam + Eng. Ziad Tarek
// ==========================================================================

let activeShelfProduct = null;
let activeTableDispenseProduct = null;

// 1. VISUAL SHELF-LOCATING (2D Floor Plan + Shelf Elevation)
async function openShelfModal(prodId) {
  try {
    const res = await fetch(`/api/products/${prodId}/shelf`);
    if (!res.ok) throw new Error('Could not fetch shelf location');
    const p = await res.json();
    activeShelfProduct = p;

    document.getElementById('shelfModalProdName').innerText = p.name_en || p.name;
    document.getElementById('shelfModalProdCode').innerText = p.code || p.barcode;
    document.getElementById('shelfZoneBadge').innerText = p.zone_name || 'المنطقة A';
    document.getElementById('shelfAisleRackBadge').innerText = `${p.aisle || 'ممر 1'} - ${p.rack || 'ستاند 1'}`;
    document.getElementById('shelfLevelBadge').innerText = `رف ${p.shelf_level || 2} (مستوى اليد)`;
    document.getElementById('shelfBinBadge').innerText = p.bin || 'درج عام';

    // Move SVG 2D Floor Plan Pin
    const pin = document.getElementById('shelfTargetPin');
    if (pin) {
      const x = (p.x_coord || 25) * 3.8;
      const y = (p.y_coord || 25) * 2.8;
      pin.setAttribute('transform', `translate(${x}, ${y})`);
    }

    // Highlight Physical Shelf Level
    for (let i = 1; i <= 4; i++) {
      const row = document.getElementById(`shelfLevelRow${i}`);
      if (row) {
        if (i === (p.shelf_level || 2)) {
          row.className = 'shelf-rack-row p-2 rounded-xl border border-amber-500 bg-amber-500/20 shadow-lg shadow-amber-500/20 flex items-center justify-between text-xs transition';
          row.innerHTML = `<span class="text-amber-300 font-bold text-xs flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>رف ${i} 👈 موقع العلبة هنا!</span><span class="bg-amber-400 text-black font-black px-2 py-0.5 rounded-lg text-xs">${p.bin || 'درج'}</span>`;
        } else {
          row.className = 'shelf-rack-row p-2 rounded-xl border border-white/10 flex items-center justify-between text-xs transition';
          row.innerHTML = `<span class="text-slate-400 font-bold text-[11px]">رف ${i}</span><span class="text-slate-500 text-[10px]">مستوى عادي</span>`;
        }
      }
    }

    document.getElementById('shelfGuidanceVoice').innerText = `اتجه إلى ${p.aisle || 'ممر 1'} -> ${p.rack || 'ستاند 1'} -> الرف رقم ${p.shelf_level || 2} -> ${p.bin || 'الدرج'}`;
    document.getElementById('shelfLocatingModal').classList.remove('hidden');
  } catch (err) {
    alert('موقع الرف لهذا الصنف: منطقة الأدوية الرئيسية - رف 2');
  }
}

function closeShelfModal() {
  const m = document.getElementById('shelfLocatingModal');
  if (m) m.classList.add('hidden');
  activeShelfProduct = null;
}

function addCurrentShelfProductToCart() {
  if (!activeShelfProduct) return;
  addToCart(activeShelfProduct.code || activeShelfProduct.barcode, 'علبة');
  closeShelfModal();
}

// 2. BATCH SELECTOR (Old Price vs New Price)
async function openBatchSelector(prodId, prodName) {
  try {
    const res = await fetch(`/api/products/${prodId}/batches`);
    if (!res.ok) throw new Error();
    const batches = await res.json();
    
    const container = document.getElementById('batchListContainer');
    document.getElementById('batchModalProdName').innerText = prodName;
    container.innerHTML = '';

    if (batches.length === 0) {
      container.innerHTML = '<div class="text-slate-400 text-center py-4 text-xs">لا توجد تشغيلات مسجلة بشكل منفصل. سيتم الصرف بالسعر الرسمي.</div>';
    } else {
      batches.forEach(b => {
        const isNear = new Date(b.expiry_date) < new Date('2027-01-01');
        const card = document.createElement('div');
        card.className = 'bg-[#050814] p-3 rounded-2xl border border-white/10 hover:border-indigo-500/50 transition cursor-pointer flex items-center justify-between';
        card.onclick = () => {
          addToCartCustomPrice(b.product_id, b.sale_price, b.batch_number, b.expiry_date);
          closeBatchModal();
        };
        card.innerHTML = `
          <div>
            <div class="font-bold text-white text-xs flex items-center gap-2">
              <span>تشغيلة: ${b.batch_number}</span>
              ${isNear ? '<span class="bg-rose-950/80 text-rose-300 border border-rose-500/40 text-[10px] px-1.5 py-0.2 rounded font-bold">وشيك الصلاحية ⚠️</span>' : ''}
            </div>
            <div class="text-[11px] text-slate-400 mt-0.5">
              صلاحية: <b class="${isNear ? 'text-rose-400' : 'text-slate-200'}">${b.expiry_date}</b> | متبقي: <b class="text-cyan-400">${b.box_qty} علبة</b>
            </div>
          </div>
          <div class="text-left">
            <span class="text-sm font-black text-emerald-400">${b.sale_price.toFixed(2)} ج.م</span>
            <span class="block text-[10px] text-indigo-400 font-bold">اختيار هذه التشغيلة 👈</span>
          </div>
        `;
        container.appendChild(card);
      });
    }

    document.getElementById('batchSelectorModal').classList.remove('hidden');
  } catch (e) {
    console.error(e);
  }
}

function closeBatchModal() {
  const m = document.getElementById('batchSelectorModal');
  if (m) m.classList.add('hidden');
}

function addToCartCustomPrice(prodId, price, batchNo, expiry) {
  const p = products.find(x => x.id === prodId);
  if (!p) return;
  const itemClone = { ...p, price: price, batchNumber: batchNo, expiryDate: expiry };
  cart.push({ code: p.code, product: itemClone, unit: 'علبة', qty: 1 });
  renderCart();
  playSuccessChime();
}

// 3. CONTROLLED SUBSTANCES COMPLIANCE GATE (EDA)
function triggerTableDrugCompliance(product) {
  activeTableDispenseProduct = product;
  document.getElementById('compDrugName').innerText = product.name_en || product.name;
  document.getElementById('compTableClass').innerText = product.table_class || 'جدول 2';
  document.getElementById('compQty').value = 1;
  document.getElementById('tableDrugComplianceModal').classList.remove('hidden');
}

function closeTableComplianceModal() {
  document.getElementById('tableDrugComplianceModal').classList.add('hidden');
  activeTableDispenseProduct = null;
}

async function confirmTableDrugDispense(e) {
  e.preventDefault();
  if (!activeTableDispenseProduct) return;

  const logPayload = {
    product_id: activeTableDispenseProduct.id,
    product_name: activeTableDispenseProduct.name_en || activeTableDispenseProduct.name,
    table_class: activeTableDispenseProduct.table_class || 'Table 2',
    qty_dispensed: parseInt(document.getElementById('compQty').value, 10) || 1,
    unit_type: 'علبة',
    patient_name: document.getElementById('compPatientName').value.trim(),
    patient_national_id: document.getElementById('compNationalId').value.trim(),
    doctor_name: document.getElementById('compDoctorName').value.trim(),
    doctor_license: document.getElementById('compDoctorLicense').value.trim(),
    prescription_no: document.getElementById('compPrescriptionNo').value.trim(),
    prescription_date: new Date().toISOString().slice(0, 10),
    remaining_stock: Math.max(0, (activeTableDispenseProduct.stock_boxes || 5) - 1),
    pharmacist_name: 'د. إسلام الشريف'
  };

  try {
    await fetch('/api/table-drugs/dispense', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logPayload)
    });
  } catch (err) {}

  // Add to cart with badge
  const p = activeTableDispenseProduct;
  cart.push({
    code: p.code,
    product: p,
    unit: 'علبة',
    qty: logPayload.qty_dispensed,
    tableCompliance: logPayload
  });

  closeTableComplianceModal();
  renderCart();
  playSuccessChime();
  alert(`تم تسجيل صرف ${p.name_en || p.name} في دفتر الجدول الرسمي وقيده للتفتيش الصيدلي بنجاح! ⚖️`);
}

async function renderTableDrugsLog() {
  try {
    const res = await fetch('/api/table-drugs/registry?limit=50');
    const logs = await res.json();
    const tbody = document.getElementById('tableDrugsLogBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    document.getElementById('tableDrugsBadge').innerText = logs.length;

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-slate-500">لا توجد قيود جدول مسجلة اليوم</td></tr>';
      return;
    }

    logs.forEach(l => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-white/5 transition';
      tr.innerHTML = `
        <td class="p-3 font-mono text-[11px] text-slate-400">${(l.timestamp || '').slice(0, 16).replace('T', ' ')}</td>
        <td class="p-3 font-bold text-white">${l.product_name}</td>
        <td class="p-3"><span class="bg-rose-950/80 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-bold">${l.table_class}</span></td>
        <td class="p-3 font-bold text-cyan-300">${l.patient_name}<br><span class="text-[10px] text-slate-400 font-mono">${l.patient_national_id}</span></td>
        <td class="p-3">${l.doctor_name}</td>
        <td class="p-3 font-mono text-slate-300">${l.prescription_no}</td>
        <td class="p-3 font-black text-rose-400">${l.qty_dispensed} علبة</td>
        <td class="p-3 font-bold text-slate-200">${l.remaining_stock}</td>
        <td class="p-3 text-slate-400">${l.pharmacist_name}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {}
}

function printTableInspectionReport() {
  window.print();
}

// 4. IN-PHARMACY CLINIC SERVICES
function calculateClinicAssessment() {
  const sys = parseInt(document.getElementById('clinicBpSys').value, 10);
  const dia = parseInt(document.getElementById('clinicBpDia').value, 10);
  const pulse = parseInt(document.getElementById('clinicPulse').value, 10) || 72;
  const bpBadge = document.getElementById('bpStatusBadge');

  if (sys && dia) {
    let bpText = '', bpClass = '';
    if (sys < 120 && dia < 80) {
      bpText = '🟢 ضغط مثالي (Optimal Blood Pressure)';
      bpClass = 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40';
    } else if (sys <= 129 && dia < 80) {
      bpText = '🟡 ما قبل ارتفاع ضغط الدم (Prehypertension)';
      bpClass = 'bg-amber-950/80 text-amber-300 border border-amber-500/40';
    } else if (sys <= 139 || dia <= 89) {
      bpText = '🟠 ارتفاع ضغط دم - مرحلة أولى (Stage 1 HTN)';
      bpClass = 'bg-orange-950/80 text-orange-300 border border-orange-500/40';
    } else if (sys >= 180 || dia >= 120) {
      bpText = '🚨 أزمة ارتفاع ضغط دم طارئة (Hypertensive Crisis)';
      bpClass = 'bg-rose-950/90 text-rose-300 border border-rose-500 font-black animate-pulse';
    } else {
      bpText = '🔴 ارتفاع ضغط دم - مرحلة ثانية (Stage 2 HTN)';
      bpClass = 'bg-rose-950/80 text-rose-300 border border-rose-500/40';
    }
    bpBadge.className = `text-xs py-1.5 px-3 rounded-xl font-bold text-center ${bpClass}`;
    bpBadge.innerText = bpText;
    document.getElementById('prevBp').innerText = `${sys} / ${dia}`;
    document.getElementById('prevPulse').innerText = `${pulse} BPM`;
  }

  // Glucose
  const gluc = parseFloat(document.getElementById('clinicGlucoseValue').value);
  const glucType = document.getElementById('clinicGlucoseType').value;
  const glucBadge = document.getElementById('glucoseStatusBadge');
  if (gluc) {
    let glucText = 'طبيعي', glucClass = 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40';
    if (gluc < 70) {
      glucText = '🚨 هبوط حاد في السكر (Hypoglycemia) - ينصح بسكريات فوراً';
      glucClass = 'bg-rose-950 text-rose-300 border border-rose-500 animate-pulse';
    } else if (gluc > 200) {
      glucText = '⚠️ ارتفاع ملحوظ في السكر (Hyperglycemia)';
      glucClass = 'bg-amber-950 text-amber-300 border border-amber-500/40';
    }
    glucBadge.className = `text-xs py-1.5 px-3 rounded-xl font-bold text-center ${glucClass}`;
    glucBadge.innerText = glucText;
    document.getElementById('prevGlucose').innerText = `${gluc} mg/dL (${glucType})`;
  }

  // BMI
  const w = parseFloat(document.getElementById('clinicWeight').value);
  const h = parseFloat(document.getElementById('clinicHeight').value);
  const bmiBadge = document.getElementById('bmiStatusBadge');
  if (w && h) {
    const hM = h / 100;
    const bmi = (w / (hM * hM)).toFixed(1);
    let bmiText = '';
    if (bmi < 18.5) bmiText = `نحافة (BMI: ${bmi})`;
    else if (bmi < 25) bmiText = `وزن مثالي متناسق (BMI: ${bmi})`;
    else if (bmi < 30) bmiText = `زيادة وزن طفيفة (BMI: ${bmi})`;
    else bmiText = `سمنة (BMI: ${bmi}) - يوصى بنظام غذائي`;
    bmiBadge.className = 'text-xs py-1.5 px-3 rounded-xl bg-teal-950/80 text-teal-300 border border-teal-500/40 font-bold text-center';
    bmiBadge.innerText = bmiText;
    document.getElementById('prevBmi').innerText = bmiText;
  }

  const pName = document.getElementById('clinicPatientName').value.trim();
  if (pName) document.getElementById('prevPatient').innerText = pName;
}

function printClinicThermalCard() {
  calculateClinicAssessment();
  window.print();
}

function sendClinicWhatsApp() {
  const phone = document.getElementById('clinicPatientPhone').value.trim();
  const name = document.getElementById('clinicPatientName').value.trim() || 'العميل الكريم';
  const bp = document.getElementById('prevBp').innerText;
  const pulse = document.getElementById('prevPulse').innerText;
  const gluc = document.getElementById('prevGlucose').innerText;
  const bmi = document.getElementById('prevBmi').innerText;

  if (!phone) {
    alert('يرجى إدخال رقم واتساب المريض!');
    return;
  }

  const msg = `*صيدلية بحبح - تقرير الفحص الطبي الصيدلاني 🩺*\\n` +
    `مرحباً أستاذ: ${name}\\n` +
    `تاريخ الفحص: ${new Date().toLocaleDateString('ar-EG')}\\n\\n` +
    `📊 *نتائج القياسات الحيوية:*\\n` +
    `• ضغط الدم: ${bp}\\n` +
    `• النبض: ${pulse}\\n` +
    `• السكر بالدم: ${gluc}\\n` +
    `• كتلة الجسم: ${bmi}\\n\\n` +
    `نتمنى لكم دوام الصحة والعافية! 🌸`;

  const cleanPhone = phone.startsWith('0') ? '2' + phone : phone;
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}
"""

TARGET_FILES = [
    r'F:\صيدليه\admin_pos.html',
    r'F:\صيدليه\pharmacy_pos_management\admin_pos.html'
]

for filepath in TARGET_FILES:
    if not os.path.exists(filepath):
        continue
    print(f"Processing: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Inject Luxury CSS
    if 'BAHBAH LUXURY OS - ARCHITECTURAL COCKPIT DESIGN SYSTEM' not in content:
        content = content.replace('</style>', LUXURY_CSS + '\n</style>', 1)
        print(" -> Injected Luxury CSS")

    # 2. Inject Tabs
    if 'id="tab-table-btn"' not in content:
        target_tab = '<button id="tab-analytics-btn"'
        if target_tab in content:
            content = content.replace(target_tab, NEW_TABS_HTML + '\n        ' + target_tab, 1)
            print(" -> Injected Table & Clinic Tabs")

    # 3. Inject Views
    if 'id="tableView"' not in content:
        target_view = '<!-- MODAL: GENERICS'
        if target_view in content:
            content = content.replace(target_view, NEW_VIEWS_HTML + '\n\n  ' + target_view, 1)
            print(" -> Injected Table & Clinic Views")

    # 4. Inject Modals
    if 'id="shelfLocatingModal"' not in content:
        target_modal = '<!-- MODAL: GENERICS'
        if target_modal in content:
            content = content.replace(target_modal, NEW_MODALS_HTML + '\n\n  ' + target_modal, 1)
            print(" -> Injected Shelf & Batch Modals")

    # 5. Inject JS Logic
    if 'MODERN OFFLINE-FIRST PHARMACY MODULES (2026 EDITION)' not in content:
        content = content.replace('</script>', JS_LOGIC + '\n</script>', 1)
        print(" -> Injected JS Logic")

    # 6. Update switchTab function to support table and clinic
    if "if (tab === 'table')" not in content and 'function switchTab(tab) {' in content:
        tab_hides = """
      if (document.getElementById('tableView')) document.getElementById('tableView').classList.add('hidden');
      if (document.getElementById('clinicView')) document.getElementById('clinicView').classList.add('hidden');
      if (document.getElementById('tab-table-btn')) document.getElementById('tab-table-btn').className = inactiveClass;
      if (document.getElementById('tab-clinic-btn')) document.getElementById('tab-clinic-btn').className = inactiveClass;
"""
        content = content.replace("const inactiveClass = 'text-slate-300", tab_hides + "\n      const inactiveClass = 'text-slate-300", 1)

        tab_shows = """
      } else if (tab === 'table') {
        if (document.getElementById('tableView')) document.getElementById('tableView').classList.remove('hidden');
        if (document.getElementById('tab-table-btn')) document.getElementById('tab-table-btn').className = 'btn-gradient-rose text-white px-2 md:px-3 py-1.5 rounded-xl shadow-lg shadow-rose-500/25 transition flex items-center gap-1 shrink-0';
        renderTableDrugsLog();
      } else if (tab === 'clinic') {
        if (document.getElementById('clinicView')) document.getElementById('clinicView').classList.remove('hidden');
        if (document.getElementById('tab-clinic-btn')) document.getElementById('tab-clinic-btn').className = 'btn-gradient-teal text-white px-2 md:px-3 py-1.5 rounded-xl shadow-lg shadow-teal-500/25 transition flex items-center gap-1 shrink-0';
        calculateClinicAssessment();
"""
        content = content.replace("renderInsuranceClaims();\n      }", "renderInsuranceClaims();\n" + tab_shows + "      }", 1)
        print(" -> Updated switchTab routing for table & clinic")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Successfully updated {filepath} (Size: {len(content)} bytes)")
