import sys
from bs4 import BeautifulSoup
import re

sys.stdout.reconfigure(encoding='utf-8')

with open('shop_other.html', 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

imgs = soup.find_all('img', src=lambda s: s and '/images/products/' in s)
for i, img in enumerate(imgs[:5], 1):
    print(f"================ PRODUCT {i} ================")
    print("IMG SRC:", img.get('src'))
    print("IMG ALT:", img.get('alt'))
    # Find card container
    card = img
    for _ in range(6):
        if card.parent:
            card = card.parent
            if any('col' in c or 'card' in c or 'item' in c or 'product' in c for c in card.get('class', [])):
                break
    print("Card tag:", card.name, "Classes:", card.get('class'))
    print("Card Text:\n", card.get_text(separator=' \n ', strip=True)[:300])
    print("Links inside card:")
    for a in card.find_all('a', href=True):
        print("  - href:", a['href'], "| text:", a.get_text(strip=True))

# Check pagination or total count
pagination = soup.find(class_=re.compile(r'pagination|paging|page-item', re.I))
if pagination:
    print("\nPagination found:", pagination.get_text(separator=' ', strip=True))
    for a in pagination.find_all('a', href=True):
        print("  Page Link:", a['href'], a.get_text(strip=True))
