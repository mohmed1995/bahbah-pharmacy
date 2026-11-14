#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
📜 محرك الوكيل البرمجي: "محمد" (الحكيم ذو الـ 3000 عام)
المسؤول عن تطوير وتشريح وإدارة برنامج "الصواف" (Offline POS & Inventory & Accounting)
================================================================================
"""

import os
import sys
import subprocess
import shutil
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# تحميل متغيرات البيئة مع إعطاء الأولوية لملف .env
load_dotenv(override=True)

from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown
from rich.table import Table
from rich.prompt import Prompt
from rich.text import Text

console = Console()

# التحقق من وجود مفتاح API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    console.print(Panel(
        "[bold red]❌ لم يتم العثور على مفتاح GEMINI_API_KEY في ملف .env أو في متغيرات النظام![/bold red]\n"
        "يرجى ضبط المفتاح داخل ملف .env بصيغة: GEMINI_API_KEY=\"مفتاحك\"",
        title="خطأ في الإعدادات"
    ))
    sys.exit(1)

from google import genai
from google.genai import types

# مسار مجلد العمل الحالي
WORKSPACE_DIR = Path(__file__).resolve().parent
BACKUP_DIR = WORKSPACE_DIR / ".backups"
BACKUP_DIR.mkdir(exist_ok=True)
CHECKLIST_FILE = WORKSPACE_DIR / "SAWWAF_MASTER_PLAN.md"

# ==============================================================================
# 🛠️ الأدوات التنفيذية (Tools & Function Calling)
# ==============================================================================

def list_project_files() -> str:
    """يعرض شجرة ملفات المشروع بالكامل متجاهلاً المجلدات المؤقتة والسرية (.git, node_modules, __pycache__, .env, .backups)."""
    ignored_patterns = {
        ".git", "node_modules", "__pycache__", ".env", ".env.local",
        ".backups", ".next", "dist", "out", ".system_generated"
    }
    file_list = []
    for root, dirs, files in os.walk(WORKSPACE_DIR):
        dirs[:] = [d for d in dirs if d not in ignored_patterns and not d.startswith(".")]
        rel_root = os.path.relpath(root, WORKSPACE_DIR)
        for f in files:
            if f.startswith(".env") or f.endswith(".zip") or f.endswith(".pyc"):
                continue
            rel_file = os.path.normpath(os.path.join(rel_root, f)) if rel_root != "." else f
            try:
                size = os.path.getsize(os.path.join(root, f))
                file_list.append(f"{rel_file} ({size:,} bytes)")
            except Exception:
                file_list.append(rel_file)

    console.print(Panel(f"📂 [bold cyan]list_project_files[/bold cyan]: تم فحص {len(file_list)} ملفاً.", title="تنفيذ أداة"))
    if not file_list:
        return "المشروع فارغ حالياً."
    return "\n".join(file_list[:150]) + ("\n...(تم اختصار الباقي)" if len(file_list) > 150 else "")


def read_file(file_path: str) -> str:
    """يقرأ الكود المصدري لأي ملف بالكامل لفهم المنطق البرمجي والمحاسبي. المعامل: file_path (مسار الملف النسبي أو المطلق)."""
    try:
        path = WORKSPACE_DIR / file_path if not os.path.isabs(file_path) else Path(file_path)
        if not path.exists():
            return f"❌ خطأ: الملف غير موجود: {file_path}"
        if not path.is_file():
            return f"❌ خطأ: المسار ليس ملفاً: {file_path}"
        
        content = path.read_text(encoding="utf-8", errors="replace")
        console.print(Panel(f"📖 [bold green]read_file[/bold green]: قراءة `{file_path}` ({len(content)} حرف)", title="تنفيذ أداة"))
        return content
    except Exception as e:
        return f"❌ حدث استثناء أثناء قراءة الملف: {str(e)}"


def write_file(file_path: str, content: str) -> str:
    """ينشئ أو يعدل الملفات بدقة مع أخذ نسخة احتياطية سريعة قبل التعديل في مجلد .backups لضمان عدم ضياع أي سطر. المعاملات: file_path, content."""
    try:
        path = WORKSPACE_DIR / file_path if not os.path.isabs(file_path) else Path(file_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        backup_msg = ""
        if path.exists() and path.is_file():
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"{path.stem}_{timestamp}{path.suffix}.bak"
            backup_path = BACKUP_DIR / backup_name
            shutil.copy2(path, backup_path)
            backup_msg = f" (تم حفظ نسخة احتياطية في: .backups/{backup_name})"

        path.write_text(content, encoding="utf-8")
        console.print(Panel(f"✍️ [bold yellow]write_file[/bold yellow]: تم حفظ `{file_path}`{backup_msg}", title="تنفيذ أداة"))
        return f"✅ تم كتابة وحفظ الملف بنجاح: {file_path}{backup_msg}"
    except Exception as e:
        return f"❌ فشلت كتابة الملف {file_path}: {str(e)}"


def run_terminal(command: str) -> str:
    """ينفذ أوامر النظام والترمينال (مثل git clone، تثبيت الحزم، فحص الداتا بيز) ويعيد المخرجات لتحليلها وإصلاحها ذاتياً. المعامل: command."""
    console.print(Panel(f"⚡ [bold magenta]run_terminal[/bold magenta]: `{command}`", title="تشغيل أمر في النظام"))
    try:
        proc = subprocess.run(
            command,
            shell=True,
            cwd=str(WORKSPACE_DIR),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120
        )
        out = proc.stdout.strip()
        err = proc.stderr.strip()
        code = proc.returncode

        result = []
        result.append(f"Exit Code: {code}")
        if out:
            result.append(f"STDOUT:\n{out}")
        if err:
            result.append(f"STDERR:\n{err}")

        output_str = "\n".join(result)
        return output_str if output_str else "تم تنفيذ الأمر بنجاح بدون مخرجات."
    except subprocess.TimeoutExpired:
        return "❌ انتهت مهلة تنفيذ الأمر (تجاوز 120 ثانية)."
    except Exception as e:
        return f"❌ خطأ أثناء تنفيذ الأمر: {str(e)}"


def read_master_checklist() -> str:
    """يقرأ الخطة الرئيسية وقائمة الفحص SAWWAF_MASTER_PLAN.md بالكامل للاطلاع على بنود المشروع وحالتها وملاحظاتها."""
    try:
        if not CHECKLIST_FILE.exists():
            return "❌ ملف SAWWAF_MASTER_PLAN.md غير موجود بعد."
        content = CHECKLIST_FILE.read_text(encoding="utf-8", errors="replace")
        console.print(Panel("📋 [bold blue]read_master_checklist[/bold blue]: قراءة خطة الصواف الكبرى", title="تنفيذ أداة"))
        return content
    except Exception as e:
        return f"❌ خطأ أثناء قراءة الخطة الرئيسية: {str(e)}"


def update_master_checklist(item: str, status: str, notes: str) -> str:
    """يحدث أو يضيف بنداً في ملف SAWWAF_MASTER_PLAN.md لضمان عدم نسيان أي تفصيلة إدارية أو محاسبية أو مخزنية. المعاملات: item (كود أو اسم البند), status (الحالة مثل DONE / IN_PROGRESS / PENDING), notes (الملاحظات)."""
    try:
        if not CHECKLIST_FILE.exists():
            return "❌ ملف SAWWAF_MASTER_PLAN.md غير موجود."

        content = CHECKLIST_FILE.read_text(encoding="utf-8", errors="replace")
        lines = content.splitlines()
        updated = False
        new_lines = []

        for line in lines:
            if line.strip().startswith("|") and item in line:
                parts = [p.strip() for p in line.split("|")]
                # | المعرف | القسم / البند | الوصف الدقيق والمعايير | الحالة | ملاحظات وتحديثات |
                if len(parts) >= 6:
                    parts[4] = f"`{status}`"
                    parts[5] = notes
                    line = " | ".join(parts)
                    updated = True
            new_lines.append(line)

        if not updated:
            # إضافة بند جديد إلى نهاية جدول المتابعة
            new_row = f"| **{item}** | عام / مستجد | متابعة وإشراف فني | `{status}` | {notes} |"
            new_lines.append(new_row)

        CHECKLIST_FILE.write_text("\n".join(new_lines), encoding="utf-8")
        console.print(Panel(f"📝 [bold green]update_master_checklist[/bold green]: تحديث البند [{item}] -> {status}", title="تحديث الخطة الكبرى"))
        return f"✅ تم تحديث الخطة الرئيسية للبند [{item}] بالحالة: {status}."
    except Exception as e:
        return f"❌ فشل تحديث الخطة الرئيسية: {str(e)}"


# قائمة الأدوات المتاحة لـ "محمد"
MOHAMED_TOOLS = [
    list_project_files,
    read_file,
    write_file,
    run_terminal,
    read_master_checklist,
    update_master_checklist
]

# ==============================================================================
# 🧠 عقل وشخصية "محمد" (System Instructions)
# ==============================================================================

MOHAMED_SYSTEM_INSTRUCTION = """
أنت "محمد"، حكيم وعالم موسوعي عمرك 3000 سنة. أنت لست مبرمجاً عادياً، بل تجمع في عقلك 6 علماء عباقرة يعملون بتناغم تام:

1. عالم برمجيات (World-Class Software Scientist): خبير في الأنظمة الأوفلاين (Offline-first)، قواعد البيانات المحلية (SQLite وغيرها)، الأداء اللحظي، ومنع تهنيج البرنامج أو تلف الداتا عند انقطاع الكهرباء.
2. عالم مهندس معماري (Master Systems Architect): تبني هيكل كود نظيف ومقسّم (Modular) يربط المخزن بالحسابات بالإدارة كالساعة السويسرية.
3. عالم نفس سلوكي (Behavioral Psychologist): تفهم عقلية العامل والكاشير البسيط تحت ضغط الشغل؛ تصمم تجربة استخدام (UX) تمنع الحيرة، تمنع الغلط البشري، وتجعل البيع والجرد يتم في ثوانٍ بضغطة زر أو باركود بدون خطوات معقدة.
4. عالم وفنان رسام (Master UI Artist): ترسم واجهات مريحة للعين، ألوان واضحة، خطوط مقروءة من بعيد، وأزرار كبيرة ومعبّرة يفهمها أي عامل من أول نظرة.
5. عالم محاسب قانوني (Forensic Accountant): لا يفوتك مليم؛ تضبط الدورة المحاسبية كاملة في الخلفية أوتوماتيكياً (حركة الخزنة، تقفيل الوردية/الشيفت، العجز والزيادة، حسابات الموردين والعملاء، الآجل، المرتجعات، وصافي الربح الحقيقي) دون أن ترهق الكاشير بمعادلات محاسبية.
6. عالم وتاجر محنك (Master Merchant & Inventory Strategist): تفهم نبض السوق والتجارة؛ تراقب نواقص المخزون، الأصناف الراكدة والسريعة، تسعير الجملة والقطاعي، الهالك، وتنبيهات إعادة الطلب.

القاعدة الذهبية لـ "محمد" (السهل الممتنع):
- الشمولية التامة في الخلفية (Zero Omission): لا تنسَ أي تفصيلة إدارية أو محاسبية أو مخزنية أو أمنية. كل حركة بيع أو مرتجع أو إذن صرف يجب أن تسمّع في المخزن والخزنة والتقارير الإدارية تلقائياً وبأمان تام.
- التبسيط الأقصى في الواجهة وفي الشرح (Extreme Simplicity): واجهة الكاشير والعامل يجب أن تكون في قمة البساطة والوضوح (شاشة بيع سريعة، أزرار محددة، صلاحيات محكمة لا تظهر لهم تعقيدات الإدارة). وعندما تتحدث معي، اشرح لي أعقد الأمور الهندسية والمحاسبية بأسلوب مبسط وواضح ومرتب في نقاط، بدون كلام نظري عائم، وبدون أن تسقط أي تفصيلة.

مهمتك المباشرة:
تطوير برنامج أوفلاين اسمه "الصواف". استخدم أدواتك (list_project_files, read_file, write_file, run_terminal, update_master_checklist, read_master_checklist) لفحص الأكواد، سحب مستودعات GitHub، بناء وإصلاح الأخطاء ذاتياً، وتوثيق كل خطوة في SAWWAF_MASTER_PLAN.md.
"""

# ==============================================================================
# 🚀 محرك التشغيل وإدارة الجلسة
# ==============================================================================

def initialize_mohamed_client():
    """تهيئة عميل Gemini واختيار الموديل الأنسب المتاح مع Fallback تلقائي."""
    client = genai.Client(api_key=api_key)
    
    preferred_model = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
    candidate_models = [
        preferred_model,
        "gemini-2.5-pro",
        "gemini-3.5-flash-lite",
        "gemini-3.8-flash",
        "gemini-3.1-pro-preview"
    ]
    # إزالة التكرار مع الحفاظ على الترتيب
    seen = set()
    candidate_models = [m for m in candidate_models if not (m in seen or seen.add(m))]

    working_model = None
    for model_name in candidate_models:
        try:
            # اختبار سريع للموديل
            test_resp = client.models.generate_content(
                model=model_name,
                contents="test",
                config=types.GenerateContentConfig(max_output_tokens=5)
            )
            working_model = model_name
            break
        except Exception:
            continue

    if not working_model:
        # افتراضي إذا تعذر الفحص
        working_model = "gemini-3.5-flash-lite"

    config = types.GenerateContentConfig(
        system_instruction=MOHAMED_SYSTEM_INSTRUCTION,
        tools=MOHAMED_TOOLS,
        temperature=0.3
    )

    chat = client.chats.create(model=working_model, config=config)
    return client, chat, working_model


import time

def send_message_safe(chat, prompt: str, max_retries: int = 3):
    """إرسال رسالة للموديل مع إعادة المحاولة التلقائية في حالات ضغط الخوادم المؤقت (503 / 429)."""
    for attempt in range(max_retries):
        try:
            return chat.send_message(prompt)
        except Exception as e:
            err_str = str(e)
            if any(code in err_str for code in ["503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED"]):
                if attempt < max_retries - 1:
                    time.sleep(2 * (attempt + 1))
                    continue
            raise e


def display_welcome_banner(model_name: str):
    """عرض ترويسة الترحيب بهيبة الحكيم ذو الـ 3000 عام."""
    banner_text = f"""[bold yellow]📜 مرحباً بك! أنا "محمد"، الحكيم ذو الـ 3000 عام.[/bold yellow]
[cyan]العالم الموسوعي الذي يجمع الحسابات والمخازن والبرمجة الأوفلاين في برنامج [bold white]"الصواف"[/bold white].[/cyan]
[dim]• الموديل النشط: {model_name} | الأدوات التنفيذية: نشطة ومؤمنة بالنسخ الاحتياطي (.backups)[/dim]
[dim]• وثيقة الخطة: SAWWAF_MASTER_PLAN.md[/dim]"""
    console.print(Panel(banner_text, border_style="gold1", expand=False))


def main():
    display_welcome_banner("جاري الاتصال بالعقل...")
    
    try:
        client, chat, active_model = initialize_mohamed_client()
    except Exception as e:
        console.print(f"[bold red]❌ فشل تهيئة المساعد الذكي: {e}[/bold red]")
        sys.exit(1)

    console.print(f"[bold green]✨ العقل متصل بنجاح عبر الموديل: {active_model}[/bold green]\n")

    # الرسالة الترحيبية الافتتاحية من محمد
    first_prompt = (
        "ابدأ الآن بتوجيه أول رسالة للمستخدم ترحب به بشخصيتك وهيبتك وحكمتك (الحكيم ذو الـ 3000 عام الذي يجمع 6 علماء عباقرة)، "
        "واطلب منه تزويدك برابط مستودع GitHub لبرنامج 'الصواف' (أو مسار الفولدر على الجهاز) لتقوم فوراً بسحبه وفحصه "
        "وتشريحه بالكامل ومطابقته مع وثيقة SAWWAF_MASTER_PLAN.md لتقديم أول تقرير مبسط وشامل."
    )

    with console.status("[bold cyan]محمد يستحضر حكمته ويعد الترحيب...[/bold cyan]", spinner="dots"):
        try:
            initial_response = send_message_safe(chat, first_prompt)
            console.print(Panel(Markdown(initial_response.text), title="[bold gold1]محمد (الحكيم)[/bold gold1]", border_style="cyan"))
        except Exception as e:
            console.print(f"[bold red]حدث خطأ أثناء إرسال الرسالة الأولى: {e}[/bold red]")

    # فحص خيار التشغيل الافتتاحي فقط
    if len(sys.argv) > 1 and sys.argv[1] in ["--welcome", "--first-run", "--init"]:
        return

    # حلقة المحادثة التفاعلية
    console.print("[bold dim]💡 اكتب رسالتك أو رابط المستودع، أو اكتب 'exit' أو 'خروج' للإنهاء:[/bold dim]\n")
    
    # فحص إذا تم تمرير مدخلات سطر الأوامر (مثل تشغيل غير تفاعلي)
    if len(sys.argv) > 1:
        user_input = " ".join(sys.argv[1:])
        console.print(f"[bold green]أنت >[/bold green] {user_input}")
        with console.status("[bold cyan]محمد يفكر وينفذ الأدوات...[/bold cyan]", spinner="aesthetic"):
            response = send_message_safe(chat, user_input)
            console.print(Panel(Markdown(response.text), title="[bold gold1]محمد (الحكيم)[/bold gold1]", border_style="cyan"))
        return

    while True:
        try:
            user_input = Prompt.ask("[bold green]أنت >[/bold green]").strip()
            if not user_input:
                continue
            if user_input.lower() in ["exit", "quit", "خروج", "إنهاء"]:
                console.print("[bold yellow]أستودعك الله، وسأظل حارساً على صرح 'الصواف' حتى نلتقي.[/bold yellow]")
                break

            with console.status("[bold cyan]محمد يفكر وينفذ الأدوات...[/bold cyan]", spinner="aesthetic"):
                response = send_message_safe(chat, user_input)
                console.print(Panel(Markdown(response.text), title="[bold gold1]محمد (الحكيم)[/bold gold1]", border_style="cyan"))

        except (KeyboardInterrupt, EOFError):
            console.print("\n[bold yellow]تم إيقاف الجلسة. في أمان الله.[/bold yellow]")
            break
        except Exception as e:
            console.print(f"[bold red]حدث خطأ أثناء المحادثة: {e}[/bold red]")


if __name__ == "__main__":
    main()
