import sqlite3
import urllib.request
import http.cookiejar
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
opener.open('https://www.bahbahpharmacyonline.com/ar/brands?currency=egp')

conn = sqlite3.connect('pharmacy.db')
cur = conn.cursor()
rows = cur.execute("SELECT name_ar, product_url FROM products WHERE category='دواء' LIMIT 8").fetchall()
for name, url in rows:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        html = opener.open(req, timeout=10).read().decode('utf-8', errors='ignore')
        soup = BeautifulSoup(html, 'html.parser')
        desc = soup.find('div', class_=lambda c: c and ('tab-pane' in c or 'description' in c))
        txt = desc.get_text(strip=True)[:120] if desc else 'NO_DESC'
        print(name, '-->', txt)
    except Exception as e:
        print(name, '--> Error', e)
conn.close()
