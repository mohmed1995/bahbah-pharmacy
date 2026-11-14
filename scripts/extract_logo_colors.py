"""Extract exact brand colors from Bahbah Pharmacy logo."""
from PIL import Image
from collections import Counter

img = Image.open('/home/z/my-project/upload/pasted_image_1794492669010.png').convert('RGB')
w, h = img.size
print(f"Image size: {w}x{h}")

# 1) Dominant colors overall (quantized)
small = img.resize((160, int(160 * h / w)))
q = small.quantize(colors=10, method=Image.MEDIANCUT)
pal = q.getpalette()
counts = Counter(q.getdata())
total = sum(counts.values())
print("\n-- Dominant quantized colors --")
for idx, c in counts.most_common(10):
    r, g, b = pal[idx * 3: idx * 3 + 3]
    print(f"#{r:02X}{g:02X}{b:02X}  {c / total * 100:5.1f}%")

# 2) Point sampling in known regions (relative coords guessed from layout)
regions = {
    'blue_ring_left': (0.10, 0.45),      # left edge of circular badge ring
    'blue_ring_bottom': (0.18, 0.88),
    'cream_inner': (0.22, 0.30),         # inner cream circle
    'orange_B': (0.21, 0.52),            # the orange B glyph
    'arabic_text': (0.55, 0.50),         # navy arabic word
    'background': (0.95, 0.90),          # black bg
}
print("\n-- Point samples --")
for name, (fx, fy) in regions.items():
    px, py = int(w * fx), int(h * fy)
    r, g, b = img.getpixel((px, py))
    print(f"{name:18s} @({px},{py}) -> #{r:02X}{g:02X}{b:02X}")

# 3) Strongest saturated colors by hue family (excluding near-black/white)
print("\n-- Saturated color clusters --")
def classify(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    if mx - mn < 30:
        return None
    if b > r and b > g:
        return 'blue'
    if r > g and r > b and g > b:
        return 'orange'
    return None

buckets = {'blue': [], 'orange': []}
for x in range(0, w, 2):
    for y in range(0, h, 2):
        r, g, b = img.getpixel((x, y))
        fam = classify(r, g, b)
        if fam:
            buckets[fam].append((r, g, b))

for fam, pts in buckets.items():
    if not pts:
        continue
    n = len(pts)
    avg = tuple(sum(p[i] for p in pts) // n for i in range(3))
    # strongest (most saturated) variant
    sat = max(pts, key=lambda p: max(p) - min(p))
    print(f"{fam}: avg=#{avg[0]:02X}{avg[1]:02X}{avg[2]:02X}  strongest=#{sat[0]:02X}{sat[1]:02X}{sat[2]:02X}  ({n} px)")
