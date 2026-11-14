FILES = [
    r'F:\صيدليه\admin_pos.html',
    r'F:\صيدليه\pharmacy_pos_management\admin_pos.html'
]

for filepath in FILES:
    with open(filepath, 'r', encoding='utf-8') as f:
        c = f.read()

    old_switch = """    function switchTab(tab) {
      document.getElementById('posView').classList.add('hidden');
      document.getElementById('chronicView').classList.add('hidden');
      document.getElementById('debtsView').classList.add('hidden');
      document.getElementById('invoicesView').classList.add('hidden');
      document.getElementById('expiryView').classList.add('hidden');
      document.getElementById('shortagesView').classList.add('hidden');
      document.getElementById('shiftView').classList.add('hidden');
      document.getElementById('analyticsView').classList.add('hidden');
      if (document.getElementById('bundlesView')) document.getElementById('bundlesView').classList.add('hidden');
      if (document.getElementById('suppliersView')) document.getElementById('suppliersView').classList.add('hidden');
      if (document.getElementById('insuranceView')) document.getElementById('insuranceView').classList.add('hidden');

      
      if (document.getElementById('tableView')) document.getElementById('tableView').classList.add('hidden');
      if (document.getElementById('clinicView')) document.getElementById('clinicView').classList.add('hidden');
      if (document.getElementById('tab-table-btn')) document.getElementById('tab-table-btn').className = inactiveClass;
      if (document.getElementById('tab-clinic-btn')) document.getElementById('tab-clinic-btn').className = inactiveClass;

      const inactiveClass = 'text-slate-300 hover:text-white px-2 md:px-3 py-1.5 rounded-xl transition flex items-center gap-1 shrink-0';"""

    fixed_switch = """    function switchTab(tab) {
      const inactiveClass = 'text-slate-300 hover:text-white px-2 md:px-3 py-1.5 rounded-xl transition flex items-center gap-1 shrink-0';
      document.getElementById('posView').classList.add('hidden');
      document.getElementById('chronicView').classList.add('hidden');
      document.getElementById('debtsView').classList.add('hidden');
      document.getElementById('invoicesView').classList.add('hidden');
      document.getElementById('expiryView').classList.add('hidden');
      document.getElementById('shortagesView').classList.add('hidden');
      document.getElementById('shiftView').classList.add('hidden');
      document.getElementById('analyticsView').classList.add('hidden');
      if (document.getElementById('bundlesView')) document.getElementById('bundlesView').classList.add('hidden');
      if (document.getElementById('suppliersView')) document.getElementById('suppliersView').classList.add('hidden');
      if (document.getElementById('insuranceView')) document.getElementById('insuranceView').classList.add('hidden');
      if (document.getElementById('tableView')) document.getElementById('tableView').classList.add('hidden');
      if (document.getElementById('clinicView')) document.getElementById('clinicView').classList.add('hidden');
      if (document.getElementById('tab-table-btn')) document.getElementById('tab-table-btn').className = inactiveClass;
      if (document.getElementById('tab-clinic-btn')) document.getElementById('tab-clinic-btn').className = inactiveClass;"""

    if old_switch in c:
        c = c.replace(old_switch, fixed_switch)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(c)
        print(f"Fixed inactiveClass order in {filepath}")

print("Fix switch order complete.")
