"""Debug: zoom left half of logo with coordinate grid to hand-tune badge circle."""
from PIL import Image, ImageDraw

img = Image.open('/home/z/my-project/upload/pasted_image_1794492669010.png').convert('RGB')
w, h = img.size
left = img.crop((0, 0, 150, h))  # badge zone only, stop before arabic text
S = 4  # zoom factor
big = left.resize((150 * S, h * S), Image.NEAREST)

d = ImageDraw.Draw(big)
# vertical grid every 10 source px
for x in range(0, 150, 10):
    d.line([(x * S, 0), (x * S, h * S)], fill=(255, 0, 255), width=1)
    d.text((x * S + 2, 2), str(x), fill=(255, 0, 255))
# horizontal grid every 10 source px
for y in range(0, h, 10):
    d.line([(0, y * S), (150 * S, y * S)], fill=(0, 255, 0), width=1)
    d.text((2, y * S + 2), str(y), fill=(0, 255, 0))

big.save('/home/z/my-project/scripts/badge_debug.png')
print("saved", big.size)
