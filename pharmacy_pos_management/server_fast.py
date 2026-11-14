
import http.server
import socketserver
import json
import urllib.parse
import os
import re

PORT = 5050
DATA_FILE = r'F:\صيدليه\public\inventory_data.json'

def load_data():
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def normalize_text(text):
    if not text:
        return ''
    text = text.lower()
    text = re.sub(r'[أإآ]', 'ا', text)
    text = re.sub(r'ة', 'ه', text)
    text = re.sub(r'ى', 'ي', text)
    text = re.sub(r'[ً-ٟ]', '', text)
    return text.strip()

class FastPharmacyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=r'F:\صيدليه', **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/inventory':
            qs = urllib.parse.parse_qs(parsed.query)
            raw_q = qs.get('q', [''])[0].strip()
            norm_q = normalize_text(raw_q)
            limit = int(qs.get('limit', ['40'])[0])
            items = load_data()
            if norm_q:
                filtered = []
                for it in items:
                    name_norm = normalize_text(it.get('name', ''))
                    ar_norm = normalize_text(it.get('name_ar', ''))
                    code_norm = it.get('code', '').lower()
                    barcode_norm = (it.get('barcode') or '').lower()
                    ingredient_norm = normalize_text(it.get('active_ingredient', ''))

                    if (norm_q in name_norm or 
                        norm_q in ar_norm or 
                        norm_q in code_norm or 
                        norm_q in barcode_norm or
                        norm_q in ingredient_norm):
                        filtered.append(it)
                items = filtered

            res = {
                'total': len(items),
                'items': items[:limit]
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
        elif parsed.path == '/' or parsed.path == '/pos':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            with open(r'F:\صيدليه\admin_pos.html', 'rb') as f:
                self.wfile.write(f.read())
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/inventory':
            length = int(self.headers.get('content-length', 0))
            body = json.loads(self.rfile.read(length).decode('utf-8'))
            items = load_data()
            code = body.get('code')
            for it in items:
                if it['code'] == code:
                    if body.get('action') == 'update_stock':
                        if 'stock_boxes' in body: it['stock_boxes'] = max(0, int(body['stock_boxes']))
                        if 'stock_strips' in body: it['stock_strips'] = max(0, int(body['stock_strips']))
                    elif body.get('action') == 'update_price':
                        if 'price' in body: it['price'] = float(body['price'])
                        if 'cost' in body: it['cost'] = float(body['cost'])
                        if it.get('unit_no', 1) > 1:
                            it['strip_price'] = round(it['price'] / it['unit_no'], 2)
                    save_data(items)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'success': True, 'item': it}).encode('utf-8'))
                    return
            self.send_response(404)
            self.end_headers()

with socketserver.TCPServer(('0.0.0.0', PORT), FastPharmacyHandler) as httpd:
    print(f'Server running with Bilingual Search at http://0.0.0.0:{PORT}')
    httpd.serve_forever()
