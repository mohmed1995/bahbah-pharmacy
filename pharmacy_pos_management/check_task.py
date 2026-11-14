import re
with open('sample_page.html', 'r', encoding='utf-8') as f:
    text = f.read()

# print occurrences of 'images/products'
matches = re.findall(r'https://www\.bahbahpharmacyonline\.com/images/products/[^\s"\'<>]+', text)
print("Matches in sample_page.html:", len(matches))

# Wait, in task-46, which URL had the images?
# In task-46: URL: https://www.bahbahpharmacyonline.com/ar/shop?brand=Other&currency_set=true had images!
# Let's check why task-46 had it:
