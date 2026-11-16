import os
import zipfile

out_dir = r"F:\صيدليه\out"
zip_path = r"F:\صيدليه\bahbah-cloudflare-pages.zip"

print(f"Creating Cloudflare Pages direct upload bundle from {out_dir}...")

file_count = 0
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
    for root, dirs, files in os.walk(out_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, out_dir)
            zipf.write(full_path, rel_path)
            file_count += 1

size_mb = os.path.getsize(zip_path) / (1024 * 1024)
print(f"✅ Successfully created {zip_path} with {file_count} files ({size_mb:.2f} MB).")
