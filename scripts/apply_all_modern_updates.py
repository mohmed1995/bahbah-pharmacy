import re

TARGET_FILES = [
    r'F:\صيدليه\admin_pos.html',
    r'F:\صيدليه\pharmacy_pos_management\admin_pos.html'
]

# Read components from integrate_modern_pos.py
from integrate_modern_pos import LUXURY_CSS, NEW_TABS_HTML, NEW_MODALS_HTML, NEW_VIEWS_HTML, JS_LOGIC

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
        # Insert before analytics tab or inside main tabs
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

    # 7. Update product card in renderProducts to display Shelf & Batch badges
    old_card_pattern = r"onclick=\"addToCart\('\$\{p\.code\}', 'علبة'\)\""
    # Replace button area to include shelf button
    if "openShelfModal" not in content and "p.category" in content:
        # Find where product cards are rendered
        card_btn_target = '<button onclick="addToCart(\'${p.code}\', \'علبة\')"'
        replacement_card_btn = """<div class="flex items-center gap-1.5 w-full mt-2">
            <button onclick="event.stopPropagation(); openShelfModal(${p.id})" class="text-[11px] bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-300 px-2 py-1 rounded-xl font-bold transition flex items-center gap-1 shrink-0" title="موقع الرف في الصيدلية">
              📍 الرف
            </button>
            <button onclick="event.stopPropagation(); openBatchSelector(${p.id}, '${(p.name_en||p.name).replace(/'/g, '')}')" class="text-[11px] bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 px-2 py-1 rounded-xl font-bold transition flex items-center gap-1 shrink-0" title="اختيار التشغيلة وسعر قديم/جديد">
              📦 تشغيلات
            </button>
            <button onclick="addToCart('${p.code}', 'علبة')" class="flex-1 btn-hydraulic btn-gradient-emerald text-white font-bold py-1 px-2 rounded-xl text-xs transition shadow-md">
              + إضافة
            </button>
          </div>"""
        if card_btn_target in content:
            content = content.replace(card_btn_target, replacement_card_btn, 1)
            print(" -> Enhanced Product Card with Shelf & Batch actions")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Successfully updated {filepath} (Size: {len(content)} bytes)")
