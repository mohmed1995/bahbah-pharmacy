"""Final: isolate badge circle with hand-tuned geometry (center 76,74 r=70)."""
from PIL import Image, ImageDraw, ImageFilter

SRC = '/home/z/my-project/upload/pasted_image_1794492669010.png'
OUT_DIR = '/home/z/my-project/download/bahbah-brand'
CX, CY, R = 76, 74, 71   # hand-tuned from grid debug

img = Image.open(SRC).convert('RGBA')

# square crop around badge, 2px margin
m = 2
box = (CX - R - m, CY - R - m, CX + R + m, CY + R + m)
crop = img.crop(box)

# circular mask with soft edge
S = 4
big = crop.resize((crop.width * S, crop.height * S), Image.LANCZOS)
mask = Image.new('L', big.size, 0)
d = ImageDraw.Draw(mask)
pad = 6  # keeps full blue ring + white bottom crescent inside
d.ellipse((pad, pad, big.width - pad, big.height - pad), fill=255)
mask = mask.resize(crop.size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.5))
crop.putalpha(mask)

badge = crop.resize((512, 512), Image.LANCZOS)
badge.save(f'{OUT_DIR}/bahbah-badge.png')

# preview on 4 backgrounds
from PIL import ImageDraw as ID
sheet = Image.new('RGB', (1024, 300), '#FFFFFF')
dr = ID.Draw(sheet)
zones = [((0, 0, 256, 300), '#FAF6EC'), ((256, 0, 512, 300), '#FFFFFF'),
         ((512, 0, 768, 300), '#1E4E8F'), ((768, 0, 1024, 300), '#112D51')]
for boxz, color in zones:
    dr.rectangle(boxz, fill=color)
b = badge.resize((230, 230), Image.LANCZOS)
for boxz, _ in zones:
    sheet.paste(b, (boxz[0] + 13, 35), b)
sheet.save(f'{OUT_DIR}/badge-preview.png')
print("done -> bahbah-badge.png + badge-preview.png")
