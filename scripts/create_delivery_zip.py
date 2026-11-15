import os
import zipfile

source_dir = r"F:\صيدليه"
output_zip = r"F:\صيدليه\bahbah-pharmacy-final-delivery.zip"

exclude_dirs = {
    'node_modules',
    '.next',
    '.git',
    '.wrangler',
    '.backups',
    'backups',
    'temp_repo'
}

exclude_files = {
    'bahbah-pharmacy-final-delivery.zip',
    'bahbah-cloudflare-pages.zip'
}

print(f"Compressing {source_dir} to {output_zip}...")

file_count = 0
with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
    for root, dirs, files in os.walk(source_dir):
        # Filter directories in-place
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            if file in exclude_files:
                continue
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, source_dir)
            zipf.write(full_path, rel_path)
            file_count += 1

size_mb = os.path.getsize(output_zip) / (1024 * 1024)
print(f"Done! Packed {file_count} files into {output_zip} ({size_mb:.2f} MB)")
