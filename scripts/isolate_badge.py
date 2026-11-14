"""Isolate the circular Bahbah badge from the black background with transparency."""
from PIL import Image, ImageDraw, ImageFilter

SRC = '/home/z/my-project/upload/pasted_image_1794492669010.png'
OUT_DIR = '/home/z/my-project/download/bahbah-brand'

import os
os.makedirs(OUT_DIR, exist_ok=True)

img = Image.open(SRC).convert('RGB')
w, h = img.size

# 1) Auto-detect the badge bounding box inside the LEFT half (Arabic text is right half)
left_half = img.crop((0, 0, w // 2, h))
px = left_half.load()
lw, lh = left_half.size
minx, miny, maxx, maxy = lw, lh, 0, 0
for y in range(lh):
    for x in range(lw):
        r, g, b = px[x, y]
        if r + g + b > 90:  # non-black pixel
            minx, miny = min(minx, x), min(miny, y)
            maxx, maxy = max(maxx, x), max(maxy, y)
print("badge bbox in left half:", minx, miny, maxx, maxy)

cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
radius = max(maxx - minx, maxy - miny) / 2
print(f"center=({cx:.0f},{cy:.0f}) radius={radius:.0f}")

# 2) Crop a square around the badge with a tiny margin
margin = 2
side = int(radius * 2 + margin * 2)
crop = img.crop((int(cx - side / 2), int(cy - side / 2),
                 int(cx - side / 2) + side, int(cy - side / 2) + side)).convert('RGBA')

# 3) Apply circular alpha mask (1px feather for smooth edge)
big = crop.resize((side * 4, side * 4), Image.LANCZOS)  # upscale for smooth mask
mask = Image.new('L', big.size, 0)
d = ImageDraw.Draw(mask)
d.ellipse((4, 4, big.size[0] - 4, big.size[1] - 4), fill=255)
mask = mask.resize(crop.size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))
crop.putalpha(mask)

badge = crop.resize((512, 512), Image.LANCZOS)
badge.save(f'{OUT_DIR}/bahbah-badge.png')

# 4) Preview sheet: badge on cream, on white, on navy, on black
prev_w, prev_h = 1024, 300
sheet = Image.new('RGB', (prev_w, prev_h), '#FFFFFF')
b = badge.resize((220, 220), Image.LANCZOS)
zones = [( (0, 0, 256, 300), '#FAF6EC'), ((256, 0, 512, 300), '#FFFFFF'),
         ((512, 0, 768, 300), '#112D51'), ((768, 0, 1024, 300), '#000000')]
draw = ImageDraw.Draw(sheet)
for box, color in zones:
    draw.rectangle(box, fill=color)
for i, (box, _) in enumerate(zones):
    sheet.paste(b, (box[0] + 18, 40), b)
sheet.save(f'{OUT_DIR}/badge-preview.png')
print("saved badge + preview sheet")
