import sys
import re
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

with open('sample_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

print("=== Checking all <a> tags that look like brands or categories ===")
for a in soup.find_all('a', href=True):
    href = a['href']
    if any(k in href.lower() for k in ['brand', 'category', 'product', 'shop']):
        t = a.get_text(strip=True)
        img = a.find('img')
        img_src = img['src'] if (img and img.get('src')) else ''
        if t or img_src:
            print(f"Text: '{t}' | Href: {href} | Img: {img_src}")

print("\n=== Checking all images in page ===")
imgs = soup.find_all('img')
print(f"Total img tags: {len(imgs)}")
for img in imgs[:20]:
    print(f"IMG src: {img.get('src')} | alt: {img.get('alt')}")

# Check main container
main = soup.find('main') or soup.find('div', class_=re.compile(r'content|main|brand|container', re.I))
if main:
    print("\nMain/Container class:", main.get('class'))
