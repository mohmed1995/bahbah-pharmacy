import sqlite3
import re
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

# Dictionary of Egyptian trade names / generic patterns to Arabic & English active ingredient
INGREDIENTS_MAP = {
    # Paracetamol group
    r'(بانادول|بنادول|دوليبران|سيتال|بارامول|ابيمول|بيرال|ادول|ستوبادول|panadol|doliprane|cetal|paramol|abimol|pyral|adol|stopadol)': 'باراسيتامول (Paracetamol)',
    # Cold & Flu combinations with Paracetamol
    r'(كونجستال|كولد فري|كومتركس|باور كابس|فلوستوب|ترايمد فلو|123|وان تو ثري|congestal|cold free|comtrex|power caps|trimed flu)': 'باراسيتامول + مضاد احتقان (Paracetamol Combination)',
    # NSAIDs
    r'(بروفين|ماركوفين|ايبوبروفين|brufen|ibuprofen)': 'إيبوبروفين (Ibuprofen)',
    r'(كيتوفان|باي الكوفان|باي بروفنيد|كيتيوروك|فيلدين|ketofan|bi alcophan|bi profenid|ketoprofen)': 'كيتوبروفين (Ketoprofen)',
    r'(فولتارين|كاتافلام|اولفين|ديكلوفين|انتيفلام|voltaren|cataflam|olfen|diclofenac)': 'ديكلوفيناك (Diclofenac)',
    r'(سيلبركس|سيلكوكس|celebrex|celecoxib)': 'سيليكوكسيب (Celecoxib)',
    # Cough & Respiratory
    r'(ميكوسول|كاربوسيتين|mucosol|carbocisteine)': 'كاربوسيتين (Carbocisteine)',
    r'(برونشيكم|زعتر|توسكان|bronchicum|tusskan)': 'خلاصة الزعتر الطبيعي (Thyme Extract)',
    r'(ايفيبرونت|ايفيروسبان|بروسبان|بلسم|لبلاب|ivy|prospan|eurspisan|ivypront)': 'خلاصة أوراق اللبلاب (Hedera Helix)',
    r'(اسيتيل سيستين|فوار استيل|acetylcysteine)': 'أسيتيل سيستين (Acetylcysteine)',
    r'(اولفنت|فينتولين|سالبوفنت|ميكوفيللين|فاركولين|ventolin|salbovent|all vent|ventocough|mucophylline)': 'سالبوتامول (Salbutamol Combination)',
    r'(بيسلفون|موسولفان|بيلفولفين|bisolvon|ambroxol|bromhexine)': 'أمبروكسول / برومهكسين (Ambroxol/Bromhexine)',
    # Antibiotics
    r'(اوجمنتين|هاي بيوتك|كيورام|ميجا موكس|اموكسيسيللين|augmentin|hibiotic|curam|megamox|amoxicillin)': 'أموكسيسيللين + كلافولانيك (Amoxicillin/Clavulanic)',
    r'(زيثروماكس|زيزروسين|دلتازون|زيثرون|azithromycin|zithromax|zithrokan)': 'أزيثرومايسين (Azithromycin)',
    r'(سيفوتاكس|سيفاكسون|روسيفين|cefotax|ceftriaxone)': 'سيفترياكسون (Ceftriaxone)',
    r'(سيبروفار|سيبرو|ciprofar|ciprofloxacin)': 'سيبروفلوكساسين (Ciprofloxacin)',
    r'(كلوسيد|دالاسين|clindamycin|dalacin)': 'كليندامايسين (Clindamycin)',
    # Gastrointestinal
    r'(انتينال|دياكس|نيفوروكسازيد|antinal|diax|nifuroxazide)': 'نيفوروكسازيد (Nifuroxazide)',
    r'(انتودين|فاموتين|انتودين|antodine|famotidine)': 'فاموتيدين (Famotidine)',
    r'(كونترولوك|بانتولوك|زوركال|بانتوبرازول|controloc|pantoloc|zurcal|pantoprazole)': 'بانتوبرازول (Pantoprazole)',
    r'(اوميز|جاستروزول|هيليكول|omeprazole|omez|gastrazole)': 'أوميبرازول (Omeprazole)',
    r'(نيكسيوم|ايزوميبرازول|nexium|esomeprazole)': 'إيزوميبرازول (Esomeprazole)',
    r'(موتيليوم|فاركوموتيل|دومبريدون|motilium|domperidone)': 'دومبيريدون (Domperidone)',
    r'(بريمبران|ميتوكلوبراميد|primperan)': 'ميتوكلوبراميد (Metoclopramide)',
    r'(سبازموبيرالجان|كولونا|كولوفيرين|ميفيبفرين|spasmo|colona|coloverin|mebeverine)': 'ميبفرين (Mebeverine Combination)',
    r'(امريزول|فلاجيل|ميترونيدازول|flagyl|amrizole|metronidazole)': 'ميترونيدازول (Metronidazole)',
    # Antihistamines & Allergy
    r'(كلاريتين|موسيدين|لوراتادين|claritin|mosedin|loratadine)': 'لوراتادين (Loratadine)',
    r'(زيرتك|هيستازين|سيتريزين|zyrtec|histazine|cetirizine)': 'سيتريزين (Cetirizine)',
    r'(تلفاست|فيستال|فيبرامايسين|telfast|fexofenadine)': 'فيكسوفينادين (Fexofenadine)',
    # Chronic: Diabetes & Hypertension & Cholesterol
    r'(جلوكوفاج|سيدوفاج|ميتفورمين|glucophage|cidophage|metformin)': 'ميتفورمين (Metformin)',
    r'(اماريل|جليميبريد|amaryl|glimepiride)': 'جليميبيريد (Glimepiride)',
    r'(كونكور|بيسوبرولول|concor|bisoprolol)': 'بيسوبرولول (Bisoprolol)',
    r'(نورفاسك|الماكابين|املوديبين|norvasc|amlodipine)': 'أملوديبين (Amlodipine)',
    r'(كابوتن|كابتوبريل|capoten|captopril)': 'كابتوبريل (Captopril)',
    r'(اتور|ليبيتور|اتورفاستاتين|ator|lipitor|atorvastatin)': 'أتورفاستاتين (Atorvastatin)',
    r'(كريستور|روستور|روسوفاستاتين|crestor|rosuvastatin)': 'روسوفاستاتين (Rosuvastatin)',
    # Vitamins & Supplements
    r'(كالسيوم|استيوكير|اوستيوكير|calcium|osteocare)': 'كالسيوم + فيتامين د (Calcium + Vit D)',
    r'(رويال جيلي|رويال|غذاء ملكات|royal jelly)': 'غذاء ملكات النحل (Royal Jelly)',
    r'(اوميجا 3|زيت سمك|omega 3)': 'أوميجا 3 (Omega-3)',
    r'(فيروجلوبين|حديد|feroglobin|iron)': 'حديد وفيتامينات مكملة (Iron Complex)',
    r'(فيتامين سي|سيفامول|سي ريتارد|cevitil|vitamin c|cevamol)': 'فيتامين سي (Vitamin C)',
    r'(فيتامين د|ديفيدول|ديفارول|في drop|vidrop|vitamin d)': 'فيتامين د3 (Vitamin D3)',
}

def enrich_database():
    conn = sqlite3.connect('pharmacy.db')
    cur = conn.cursor()
    
    rows = cur.execute("SELECT id, name_ar, name_en, slug FROM products").fetchall()
    updated_count = 0
    
    for r in rows:
        pid, name_ar, name_en, slug = r
        text_to_search = f"{name_ar} {name_en or ''} {slug or ''}".lower()
        
        matched_ingredient = None
        for pattern, ingredient in INGREDIENTS_MAP.items():
            if re.search(pattern, text_to_search, re.IGNORECASE):
                matched_ingredient = ingredient
                break
                
        if matched_ingredient:
            cur.execute("UPDATE products SET active_ingredient = ? WHERE id = ?", (matched_ingredient, pid))
            updated_count += 1
            
    conn.commit()
    
    # Check total with ingredient now
    total = cur.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    with_ing = cur.execute("SELECT COUNT(*) FROM products WHERE active_ingredient IS NOT NULL AND active_ingredient != ''").fetchone()[0]
    conn.close()
    
    print(f"Enriched {updated_count} products!")
    print(f"Total: {total}, With Active Ingredient: {with_ing} ({with_ing*100/total:.1f}%)")

if __name__ == '__main__':
    enrich_database()
