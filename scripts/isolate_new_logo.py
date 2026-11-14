"""Isolate the circular badge from the new Bahbah logo (1600x1600).

The image contains the circular badge on top and Arabic lettering below.
Strategy: find colored (non-white) pixels within the badge region only
(top 78% of image), fit bbox -> circle, crop with feathered alpha.
"""
from PIL import Image, ImageDraw, ImageFilter
import os

SRC = "/home/z/my-project/upload/pasted_image_1794515141310.png"
OUT_BADGE = "/home/z/my-project/public/images/bahbah-badge.png"
os.makedirs(os.path.dirname(OUT_BADGE), exist_ok=True)

img = Image.open(SRC).convert("RGB")
W, H = img.size
px = img.load()

def is_colored(x, y):
    r, g, b = px[x, y]
    # white-ish threshold
    return not (r > 235 and g > 235 and b > 235)

# scan only top 80% to exclude Arabic lettering under the badge
xs, ys = [], []
step = 2
for y in range(0, int(H * 0.80), step):
    for x in range(0, W, step):
        if is_colored(x, y):
            xs.append(x)
            ys.append(y)

left, right = min(xs), max(xs)
top, bottom = min(ys), max(ys)
# the Arabic lettering under the badge pollutes the bottom edge:
# trust the x-extent (clean diameter) and anchor the circle at the top edge
cx = (left + right) / 2
r = (right - left) / 2
cy = top + r
print(f"bbox: {left},{top} -> {right},{bottom}  center=({cx:.1f},{cy:.1f}) r={r:.1f}")

# crop square around circle with small margin
margin = 2
R = int(r + margin)
cx_i, cy_i = int(round(cx)), int(round(cy))
box = (cx_i - R, cy_i - R, cx_i + R, cy_i + R)
crop = img.crop(box).convert("RGBA")
size = crop.size[0]

# circular alpha mask with soft edge
mask = Image.new("L", (size * 4, size * 4), 0)
d = ImageDraw.Draw(mask)
d.ellipse((4 * 2, 4 * 2, 4 * size - 4 * 2, 4 * size - 4 * 2), fill=255)
mask = mask.resize((size, size), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))
crop.putalpha(mask)

out = crop.resize((512, 512), Image.LANCZOS)
out.save(OUT_BADGE)
print("saved", OUT_BADGE, out.size)
