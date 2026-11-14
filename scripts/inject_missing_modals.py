import os
from inject_phase3_features import INVOICE_OCR_MODAL, PLANOGRAM_VIEW_HTML

FILES = [
    r'F:\صيدليه\admin_pos.html',
    r'F:\صيدليه\pharmacy_pos_management\admin_pos.html'
]

for filepath in FILES:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Inject OCR modal before shelfLocatingModal
    if 'id="invoiceOcrModal"' not in c:
        target_mod = '<div id="shelfLocatingModal"'
        if target_mod in c:
            c = c.replace(target_mod, INVOICE_OCR_MODAL + '\n\n  ' + target_mod, 1)
            print(f" -> Injected invoiceOcrModal in {filepath}")

    # 2. Inject planogramView before tableView
    if 'id="planogramView"' not in c:
        target_vw = '<main id="tableView"'
        if target_vw in c:
            c = c.replace(target_vw, PLANOGRAM_VIEW_HTML + '\n\n  ' + target_vw, 1)
            print(f" -> Injected planogramView in {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(c)

print("Modals & Views injection complete.")
