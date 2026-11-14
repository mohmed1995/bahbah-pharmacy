import os

FILES = [
    r'F:\صيدليه\admin_pos.html',
    r'F:\صيدليه\pharmacy_pos_management\admin_pos.html'
]

# The block to move
from do_full_update import JS_LOGIC

for filepath in FILES:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Clean from head
    bad_pattern = '<script src="https://cdn.tailwindcss.com">\n// ==========================================================================\n// MODERN OFFLINE-FIRST PHARMACY MODULES (2026 EDITION)'
    if bad_pattern in content:
        # Extract until end of JS_LOGIC
        end_marker = "window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');\n}\n</script>"
        if end_marker in content:
            content = content.replace(content[content.find(bad_pattern):content.find(end_marker)+len(end_marker)], '<script src="https://cdn.tailwindcss.com"></script>')
            print(f" -> Removed mistakenly placed script from <head> in {filepath}")

    # 2. Append cleanly before the LAST </script> tag
    last_script_idx = content.rfind('</script>')
    if last_script_idx != -1 and 'MODERN OFFLINE-FIRST PHARMACY MODULES (2026 EDITION)' not in content[last_script_idx-5000:]:
        content = content[:last_script_idx] + '\n\n' + JS_LOGIC + '\n' + content[last_script_idx:]
        print(f" -> Appended JS_LOGIC before the last </script> in {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fix completed.")
