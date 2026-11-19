#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
مزامنة مخزون صيدلية بحبح — من برنامج المحل (Simple Assistant) إلى Supabase.

بيقرأ نسخة قاعدة بيانات برنامج المحل (SQLite) قراءة فقط — ومش بيكتب فيها
أبداً — ويرفع الأسعار والمخزون لجدول warehouse_products في Supabase
بمفتاح service role من متغير بيئة (BAHBAH_SERVICE_KEY) — المفتاح مش
مكتوب في أي ملف هنا.

التشغيل:
    python sync_inventory.py            # مزامنة كاملة
    python sync_inventory.py --dry-run  # قراءة وتحويل بس، من غير رفع

الإعدادات من config.json اللي جنب السكربت (أو متغيرات بيئة):
    POS_DB_PATH     مسار ملف قاعدة بيانات برنامج المحل
    SUPABASE_URL    رابط مشروع Supabase
    BAHBAH_SERVICE_KEY  مفتاح service role (متغير بيئة فقط)
"""

import argparse
import json
import os
import sqlite3
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
LOG_FILE = HERE / "sync.log"
BATCH_SIZE = 500

# أعمدة جدول المخزون في Supabase (warehouse_products)
TARGET_COLUMNS = [
    "code", "barcode", "name_ar", "name_en", "active_ingredient",
    "strength", "form", "category", "sale_price", "cost_price",
    "stock_boxes", "stock_strips", "min_limit", "sync_key", "updated_at",
]


def log(msg: str) -> None:
    line = f"[{datetime.now().isoformat(timespec='seconds')}] {msg}"
    print(line, flush=True)
    try:
        with LOG_FILE.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


def load_config() -> dict:
    cfg = {}
    cfg_file = HERE / "config.json"
    if cfg_file.exists():
        with cfg_file.open(encoding="utf-8") as f:
            cfg = json.load(f)
    # متغيرات البيئة تتفوق على ملف الإعدادات
    if os.environ.get("POS_DB_PATH"):
        cfg["pos_db_path"] = os.environ["POS_DB_PATH"]
    if os.environ.get("SUPABASE_URL"):
        cfg["supabase_url"] = os.environ["SUPABASE_URL"]
    return cfg


def sync_key_for(code, barcode) -> str:
    """نفس قاعدة SQL: باركود حقيقي (٨ أرقام فأكثر) وإلا الكود الداخلي.
    التكرارات بتتحل وقت الرفع (الأخير يكسب) وبتتسجل كتحذير."""
    b = str(barcode).strip() if barcode is not None else ""
    if len(b) >= 8 and b.isdigit():
        return b
    return str(code).strip()


def read_products(db_path: str) -> list[dict]:
    """قراءة فقط — mode=ro + query_only. مش بيكتب في قاعدة المحل أبداً."""
    uri = f"file:{db_path}?mode=ro"
    con = sqlite3.connect(uri, uri=True)
    try:
        con.execute("PRAGMA query_only = ON")
        cols = {r[1] for r in con.execute("PRAGMA table_info(products)")}
        if not cols:
            raise RuntimeError("جدول products مش موجود في ملف القاعدة ده")

        def pick(row: dict, *names):
            for n in names:
                if n in cols and row.get(n) not in (None, ""):
                    return row[n]
            return None

        wanted = [c for c in (
            "code", "barcode", "name_en", "name_ar", "name", "category",
            "active_ingredient", "strength", "form", "cost_price",
            "sale_price", "stock_boxes", "stock_strips", "min_limit",
        ) if c in cols]
        cur = con.execute(f"SELECT {', '.join(wanted)} FROM products")
        names = [d[0] for d in cur.description]

        def num(v):
            try:
                return float(v) if v is not None else None
            except (TypeError, ValueError):
                return None

        out = []
        for raw in cur.fetchall():
            row = dict(zip(names, raw))
            code = pick(row, "code")
            if code is None:
                continue  # صنف من غير كود = مالهوش هوية في المحل، تخطيه
            name_en = pick(row, "name_en", "name") or ""
            name_ar = pick(row, "name_ar", "name") or name_en
            out.append({
                "code": str(code),
                "barcode": (str(pick(row, "barcode")) if pick(row, "barcode") is not None else None),
                "name_ar": str(name_ar),
                "name_en": str(name_en),
                "active_ingredient": (str(pick(row, "active_ingredient")) if pick(row, "active_ingredient") else None),
                "strength": (str(pick(row, "strength")) if pick(row, "strength") else None),
                "form": (str(pick(row, "form")) if pick(row, "form") else None),
                "category": (str(pick(row, "category")) if pick(row, "category") else None),
                "sale_price": num(pick(row, "sale_price")),
                "cost_price": num(pick(row, "cost_price")),
                "stock_boxes": num(pick(row, "stock_boxes")),
                "stock_strips": num(pick(row, "stock_strips")),
                "min_limit": num(pick(row, "min_limit")),
                "sync_key": sync_key_for(code, pick(row, "barcode")),
            })
        return out
    finally:
        con.close()


def upsert_batch(supabase_url: str, service_key: str, rows: list[dict]) -> None:
    url = f"{supabase_url.rstrip('/')}/rest/v1/warehouse_products?on_conflict=sync_key"
    body = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("apikey", service_key)
    req.add_header("Authorization", f"Bearer {service_key}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "resolution=merge-duplicates,return=minimal")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:500]
        raise RuntimeError(f"Supabase رد بـ {e.code}: {detail}") from e


def find_pos_database() -> str:
    """بحث تلقائي ذكي عن قاعدة بيانات برنامج المحل Simple Assistant"""
    common_locations = [
        Path("C:/SimpleAssistant/pharmacy.db"),
        Path("C:/Simple Assistant/pharmacy.db"),
        Path("D:/SimpleAssistant/pharmacy.db"),
        Path("D:/Simple Assistant/pharmacy.db"),
        Path("C:/Program Files/SimpleAssistant/pharmacy.db"),
        Path("C:/SimpleAssistant/data/pharmacy.db"),
        Path("C:/Simple Assistant/data/pharmacy.db"),
        Path("D:/SimpleAssistant/data/pharmacy.db"),
        Path("D:/Simple Assistant/data/pharmacy.db"),
    ]
    for loc in common_locations:
        if loc.exists():
            return str(loc)
    
    # فحص المسارات المجاورة
    search_dirs = [Path("C:/SimpleAssistant"), Path("C:/Simple Assistant"), Path("D:/SimpleAssistant"), Path("D:/Simple Assistant"), HERE]
    for sdir in search_dirs:
        if sdir.exists():
            for db_candidate in sdir.glob("**/*.db"):
                try:
                    c = sqlite3.connect(f"file:{db_candidate}?mode=ro", uri=True)
                    has_table = c.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='products'").fetchone()
                    c.close()
                    if has_table:
                        return str(db_candidate.resolve())
                except Exception:
                    pass
    return ""


def main() -> int:
    parser = argparse.ArgumentParser(description="Bahbah warehouse sync")
    parser.add_argument("--dry-run", action="store_true", help="قراءة وتحويل فقط")
    args = parser.parse_args()

    cfg = load_config()
    db_path = cfg.get("pos_db_path", "")
    supabase_url = cfg.get("supabase_url", "")
    service_key = os.environ.get("BAHBAH_SERVICE_KEY", "")

    if not db_path or not Path(db_path).exists():
        log("جاري البحث التلقائي عن قاعدة بيانات برنامج المحل على الجهاز...")
        auto_found = find_pos_database()
        if auto_found:
            log(f"تم العثور تلقائياً على قاعدة البيانات في: {auto_found}")
            db_path = auto_found
            try:
                cfg["pos_db_path"] = auto_found
                cfg["supabase_url"] = supabase_url or "https://cldfmqdesbecppqtevzk.supabase.co"
                with (HERE / "config.json").open("w", encoding="utf-8") as cf:
                    json.dump(cfg, cf, indent=2, ensure_ascii=False)
                log(f"تم حفظ المسار تلقائياً في config.json للتشغيل الدوري.")
            except Exception:
                pass
        else:
            log(f"خطأ: ملف قاعدة بيانات المحل مش موجود: {db_path!r}")
            log("طريقة معرفة المسار: كليك يمين على أيقونة البرنامج على سطح المكتب واختيار Open file location")
            log("ثم انسخ المسار وضعه في ملف config.json أو ضع الأداة داخل نفس المجلد.")
            return 2
    if not args.dry_run:
        if not supabase_url:
            log("خطأ: SUPABASE_URL مش متظبط (config.json أو متغير بيئة)")
            return 2
        if not service_key:
            log("خطأ: متغير البيئة BAHBAH_SERVICE_KEY مش متظبط — المفتاح مش بيتحط في أي ملف")
            return 2

    started = time.time()
    rows = read_products(db_path)
    log(f"اتقرأ {len(rows)} صنف من قاعدة المحل")

    # مفاتيح مكررة داخل نفس التشغيلة (باركود مكرر في المحل): الأخير يكسب
    seen: dict[str, dict] = {}
    dupes = 0
    for r in rows:
        if r["sync_key"] in seen:
            dupes += 1
        seen[r["sync_key"]] = r
    unique_rows = list(seen.values())
    by_barcode = sum(
        1
        for r in unique_rows
        if r["barcode"] and len(str(r["barcode"])) >= 8 and str(r["barcode"]).isdigit()
        and r["sync_key"] == str(r["barcode"])
    )
    log(f"مفاتيح فريدة: {len(unique_rows)} (بباركود: {by_barcode}، بكود داخلي: {len(unique_rows) - by_barcode}، مكررات اتدمجت: {dupes})")

    if args.dry_run:
        log("DRY-RUN — عينة من أول ٣ أصناف:")
        for r in unique_rows[:3]:
            print(json.dumps(r, ensure_ascii=False))
        log("DRY-RUN تم — مفيش حاجة اترفعت")
        return 0

    stamp = datetime.now(timezone.utc).isoformat()
    sent = 0
    for i in range(0, len(unique_rows), BATCH_SIZE):
        batch = [dict(r, updated_at=stamp) for r in unique_rows[i:i + BATCH_SIZE]]
        upsert_batch(supabase_url, service_key, batch)
        sent += len(batch)
        log(f"اترفع {sent}/{len(unique_rows)}")

    log(f"تمت المزامنة: read={len(rows)} upserted={sent} في {time.time() - started:.1f} ثانية")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001 — لازم أي فشل يظهر في اللوج وبكود خروج
        log(f"فشلت المزامنة: {exc}")
        sys.exit(1)
