FILES = [
    r'F:\صيدليه\admin_pos.html',
    r'F:\صيدليه\pharmacy_pos_management\admin_pos.html'
]

for filepath in FILES:
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Check if line 6 starts the bad block
    if '<script src="https://cdn.tailwindcss.com">' in lines[6]:
        # Find where it ends with </script>
        end_idx = -1
        for j in range(7, 400):
            if '</script>' in lines[j]:
                end_idx = j
                break
        if end_idx != -1:
            print(f"Removing lines 6 to {end_idx} from {filepath}")
            new_lines = lines[:6] + ['  <script src="https://cdn.tailwindcss.com"></script>\n'] + lines[end_idx+1:]
            with open(filepath, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            print(f"Saved clean {filepath}")

print("Clean head complete.")
