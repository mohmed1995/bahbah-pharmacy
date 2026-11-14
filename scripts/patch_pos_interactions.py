import os

FILES = [
    r'F:\صيدليه\admin_pos.html',
    r'F:\صيدليه\pharmacy_pos_management\admin_pos.html'
]

SHELF_BATCH_BTNS = """
                  <button onclick="event.stopPropagation(); openShelfModal(p.id || 1)" class="text-xs text-amber-300 hover:text-amber-200 bg-amber-950/80 border border-amber-500/40 px-2 py-1 rounded-xl font-bold flex items-center gap-1" title="عرض خريطة وموقع الرف الفعلي">
                    📍 الرف
                  </button>
                  <button onclick="event.stopPropagation(); openBatchSelector(p.id || 1, (p.name_en||p.name).replace(/'/g, ''))" class="text-xs text-indigo-300 hover:text-indigo-200 bg-indigo-950/80 border border-indigo-500/40 px-2 py-1 rounded-xl font-bold flex items-center gap-1" title="اختيار التشغيلة (سعر قديم / جديد)">
                    📦 تشغيلات
                  </button>"""

TABLE_DRUG_GATE = """    function addToCart(code, unit) {
      let p = products.find(x => x.code === code) || currentPredictions.find(x => x.code === code);
      if (!p) return;

      // Table 1 & 2 Controlled Drugs Compliance Check
      if (p.is_table_drug && p.is_table_drug > 0 && !window.activeTableAuthorized) {
        triggerTableDrugCompliance(p);
        return;
      }
      window.activeTableAuthorized = false;"""

for filepath in FILES:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Add shelf and batch buttons in renderProducts
    if 'openShelfModal(p.id' not in c:
        target_btn = """<button onclick="openGenericsModal('${p.code}')" """
        if target_btn in c:
            c = c.replace(target_btn, SHELF_BATCH_BTNS + '\n                  ' + target_btn, 1)
            print(f" -> Added shelf & batch buttons in {filepath}")

    # 2. Add Table drug gate
    if 'Table 1 & 2 Controlled Drugs Compliance Check' not in c:
        target_add = "function addToCart(code, unit) {\n      let p = products.find(x => x.code === code) || currentPredictions.find(x => x.code === code);\n      if (!p) return;"
        if target_add in c:
            c = c.replace(target_add, TABLE_DRUG_GATE, 1)
            print(f" -> Added table drug compliance gate in {filepath}")

    # 3. Enhance loadProducts mapping
    target_load = "products = data.items || [];"
    replacement_load = """const rawList = Array.isArray(data) ? data : (data.items || []);
        products = rawList.map(item => ({
          ...item,
          id: item.id,
          name: item.name_en || item.name,
          price: item.sale_price !== undefined ? item.sale_price : (item.price || 0),
          cost: item.cost_price !== undefined ? item.cost_price : (item.cost || 0),
          strip_price: item.strip_price || ((item.sale_price || item.price || 0) / (item.unit_no || 1)),
          stock_boxes: item.stock_boxes !== undefined ? item.stock_boxes : 5,
          stock_strips: item.stock_strips !== undefined ? item.stock_strips : 0,
          shelf_location_id: item.shelf_location_id || 1,
          is_table_drug: item.is_table_drug || 0,
          table_class: item.table_class || null
        }));"""
    if target_load in c:
        c = c.replace(target_load, replacement_load, 1)
        print(f" -> Enhanced loadProducts normalization in {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(c)

print('Patch complete.')
