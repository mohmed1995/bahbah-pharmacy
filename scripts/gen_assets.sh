#!/bin/bash
# Bahbah Pharmacy — AI ad banners + category images (no text, space for overlay)
set -e
cd /home/z/my-project
mkdir -p public/images/ads public/images/cats

gen() { # $1=prompt $2=out $3=size
  if [ -s "$2" ]; then echo "skip $2"; return 0; fi
  for i in 1 2 3; do
    if z-ai image -p "$1" -o "$2" -s "$3"; then echo "OK $2"; return 0; fi
    echo "retry $2 ($i)"; sleep 2
  done
  echo "FAIL $2"; return 1
}

# ---------- Ad banners (wide 1344x768, text-free, overlay space) ----------
gen "Pharmacy weekly sale advertisement background, many medicine boxes and vitamin supplement bottles floating and flying on vibrant warm orange gradient background, dynamic diagonal composition, soft confetti bokeh, professional e-commerce advertising photography, absolutely no text no letters no numbers no logos, empty clean space on the right third of the image, studio lighting, high quality, detailed" \
  public/images/ads/ad-offers.png 1344x768

gen "Pharmacy delivery courier riding a motor scooter with a large insulated delivery backpack box, speeding along a sunny Egyptian city street with palm trees, royal blue color theme, slight motion blur, dynamic professional advertising photography, absolutely no text no letters no logos, clean sky area on the upper left, high quality, detailed" \
  public/images/ads/ad-wasly.png 1344x768

gen "Organized weekly pill organizer box with colorful medicine capsules and white pill bottles arranged neatly around it, soft mint green and white background, modern minimal 3d render style, healthcare subscription concept, absolutely no text no letters no numbers, lots of clean empty space on the left, soft studio lighting, high quality" \
  public/images/ads/ad-monthly.png 1344x768

gen "Luxury skincare cosmetics advertising, elegant cream jars and glass serum bottles on beige stone podium with tropical monstera leaf shadows, warm spa aesthetic, professional cosmetics product photography, absolutely no text no letters no logos, empty space on the left half, soft golden lighting, high quality, detailed" \
  public/images/ads/ad-skin.png 1344x768

gen "Soft baby care products advertising, white diapers pack, baby lotion bottles, rubber duck and cute teddy bear on pastel light blue background with fluffy clouds, gentle studio lighting, professional advertising photography, absolutely no text no letters no logos, clean space on the right half, high quality" \
  public/images/ads/ad-baby.png 1344x768

# ---------- Category images (square 1024, text-free) ----------
gen "Assorted medicine blister packs, pill capsules and syrup bottle on clean light blue studio background, pharmacy concept, professional product photography, absolutely no text no letters, centered composition, high quality" \
  public/images/cats/cat-medicines.png 1024x1024

gen "Vitamin supplement bottles with fresh orange citrus slices and yellow capsules on bright warm orange background, healthy lifestyle concept, professional product photography, absolutely no text no letters, centered, high quality" \
  public/images/cats/cat-vitamins.png 1024x1024

gen "Elegant white moisturizer cream jar with silky cream texture swirl and green leaf on soft beige background, luxury skincare product photography, absolutely no text no letters, centered, high quality" \
  public/images/cats/cat-skincare.png 1024x1024

gen "Cute baby milk bottle, folded soft towel and small plush teddy bear on pastel mint green background, mother and baby care concept, soft studio lighting, professional product photography, absolutely no text no letters, centered, high quality" \
  public/images/cats/cat-baby.png 1024x1024

gen "Modern digital blood pressure monitor device with cuff, digital thermometer and stethoscope on clean light gray blue background, medical devices concept, professional product photography, absolutely no text no letters, centered, high quality" \
  public/images/cats/cat-devices.png 1024x1024

gen "Natural shampoo bottle, soap bars with soft foam bubbles and green eucalyptus leaves on fresh aqua blue background, personal care concept, professional product photography, absolutely no text no letters, centered, high quality" \
  public/images/cats/cat-personal.png 1024x1024

echo "ALL DONE"
