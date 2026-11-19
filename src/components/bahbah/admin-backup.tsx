"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  DatabaseBackup,
  Download,
  FileJson,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useBahbah, useDemoActive } from "@/lib/bahbah/store";
import {
  BACKUP_TABLES,
  backupTableMeta,
  buildBackupBundle,
  validateBackupBundle,
  type BackupRow,
  type ValidatedBackup,
} from "@/lib/bahbah/backup";
import {
  archiveOldOperationalDataFromSupabase,
  fetchArchivePreviewFromSupabase,
  fetchBackupTableFromSupabase,
  restoreBackupTableToSupabase,
} from "@/lib/supabase";
import { AdminCard, SectionTitle } from "./admin-ui";
import { DemoModeBanner } from "./admin-insights";

/* ------------------------------------------------------------------ */
/* النسخ الاحتياطي والأرشفة — ثلاث عمليات للمدير:                     */
/*  ١) تصدير نسخة كاملة: قراءة خام بصفحات من كل جدول على السيرفر،     */
/*     وملف JSON واحد بينزل عنده. أي جدول يفشل بيتسمّى صراحة،         */
/*     والنسخة الناقصة ما بتتنزلش على إنها كاملة أبدًا.                */
/*  ٢) استرجاع نسخة: التحقق من الملف وملخص عدّاداته بيظهر قبل أي      */
/*     كتابة، والكتابة upsert على المفتاح الأساسي عبر دالة سيرفر      */
/*     أدمن-بس — إعادة نفس الملف مرتين ما بتكرّرش حاجة.               */
/*  ٣) أرشفة: حذف نهائي للتشغيلي القديم بس (طلبات منتهية + تحصيلاتها  */
/*     وتقييماتها + عناصر الطوابير المقفولة) — الأساسيات (حسابات      */
/*     وعناوين وولاء وقياسات واشتراكات رعاية) برّه دالة الحذف         */
/*     أصلًا على مستوى الـ SQL. المعاينة بنفس الشروط بتظهر قبل الحذف، */
/*     ولازم تأكيد مزدوج + إقرار بتنزيل نسخة الأول.                   */
/* ------------------------------------------------------------------ */

const ARCHIVE_TABLE_ORDER = [
  "orders",
  "courier_collections",
  "courier_ratings",
  "whatsapp_orders",
  "shortage_requests",
  "nursing_requests",
  "rx_requests",
] as const;

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const backupFileName = (partial: boolean) =>
  `bahbah_backup_${new Date().toISOString().slice(0, 10)}${partial ? "_PARTIAL" : ""}.json`;

/** رسالة مفهومة لأخطاء دوال الأرشفة/الاسترجاع الشائعة */
function friendlyError(error: string, ar: boolean): string {
  if (error.includes("admin_only"))
    return ar ? "العملية دي للمدير (Admin) بس — حسابك الحالي مش مدير." : "This action is admin-only — your current account is not an admin.";
  if (/could not find the function|PGRST202|404/i.test(error))
    return ar
      ? "ترقية قاعدة البيانات لسه ما اتركبتش على Supabase — شغّل ملف upgrade-2026-11-19-data-archive.sql الأول."
      : "The database upgrade is not applied on Supabase yet — run upgrade-2026-11-19-data-archive.sql first.";
  return error;
}

type TableFetchState =
  | { phase: "waiting" }
  | { phase: "fetching" }
  | { phase: "done"; count: number }
  | { phase: "failed"; error: string };

type TableRestoreState =
  | { phase: "waiting" }
  | { phase: "running" }
  | { phase: "done"; upserted: number }
  | { phase: "failed"; error: string; upserted: number };

function StatusIcon({ phase }: { phase: TableFetchState["phase"] | TableRestoreState["phase"] }) {
  if (phase === "done") return <CheckCircle2 className="size-4 shrink-0 text-[#2E9E6B]" />;
  if (phase === "failed") return <XCircle className="size-4 shrink-0 text-[#DC4B4B]" />;
  if (phase === "fetching" || phase === "running")
    return <Loader2 className="size-4 shrink-0 animate-spin text-[#1E4E8F]" />;
  return <span className="size-4 shrink-0 rounded-full border border-border" />;
}

export function BackupArchiveSection() {
  const lang = useBahbah((s) => s.lang);
  const ar = lang === "ar";
  const demo = useDemoActive();
  const sessionRole = useBahbah((s) => s.sessionRole);
  const isAdmin = sessionRole === "admin";

  const label = useCallback(
    (table: string) => {
      const m = backupTableMeta(table);
      return m ? (ar ? m.ar : m.en) : table;
    },
    [ar]
  );

  /* ---------------- ١) التصدير ---------------- */
  const [includeWarehouse, setIncludeWarehouse] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [fetchStates, setFetchStates] = useState<Record<string, TableFetchState>>({});
  const exportRowsRef = useRef<Record<string, BackupRow[]>>({});
  const [exportFailed, setExportFailed] = useState<string[]>([]);
  const [exportDoneAt, setExportDoneAt] = useState<Date | null>(null);

  const exportTables = useMemo(
    () => BACKUP_TABLES.filter((m) => includeWarehouse || !m.optional).map((m) => m.table),
    [includeWarehouse]
  );

  const runExport = useCallback(
    async (onlyTables?: string[]) => {
      const targets = onlyTables ?? exportTables;
      setExporting(true);
      if (!onlyTables) {
        exportRowsRef.current = {};
        setExportFailed([]);
        setExportDoneAt(null);
        setFetchStates(Object.fromEntries(targets.map((t) => [t, { phase: "waiting" as const }])));
      }
      const failed: string[] = [];
      for (const table of targets) {
        setFetchStates((s) => ({ ...s, [table]: { phase: "fetching" } }));
        const res = await fetchBackupTableFromSupabase(table);
        if (res.rows) {
          exportRowsRef.current[table] = res.rows;
          setFetchStates((s) => ({ ...s, [table]: { phase: "done", count: res.rows!.length } }));
        } else {
          failed.push(table);
          setFetchStates((s) => ({ ...s, [table]: { phase: "failed", error: res.error } }));
        }
      }
      setExportFailed((prev) => {
        const merged = onlyTables ? prev.filter((t) => !targets.includes(t)) : [];
        return [...merged, ...failed];
      });
      setExporting(false);
      if (failed.length === 0) {
        const bundle = buildBackupBundle({ tables: exportRowsRef.current, missingTables: [] });
        downloadJson(backupFileName(false), bundle);
        setExportDoneAt(new Date());
        const total = Object.values(bundle.counts).reduce((a, b) => a + b, 0);
        toast.success(
          ar
            ? `نزلت نسخة كاملة: ${total} صف من ${Object.keys(bundle.counts).length} جدول`
            : `Full backup downloaded: ${total} rows from ${Object.keys(bundle.counts).length} tables`
        );
      } else {
        toast.error(
          ar
            ? `في ${failed.length} جدول ما اتجابش — النسخة مش كاملة ومش هتتنزل على إنها كاملة`
            : `${failed.length} table(s) failed — the backup is NOT complete and won't be labelled as such`
        );
      }
    },
    [ar, exportTables]
  );

  const downloadPartial = () => {
    const bundle = buildBackupBundle({ tables: exportRowsRef.current, missingTables: exportFailed });
    downloadJson(backupFileName(true), bundle);
    toast.info(ar ? "نزلت النسخة الجزئية — مكتوب جواها صراحة إنها ناقصة وفاتها جداول" : "Partial backup downloaded — it is explicitly marked incomplete inside the file");
  };

  /* ---------------- ٢) الاسترجاع ---------------- */
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ValidatedBackup | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreStates, setRestoreStates] = useState<Record<string, TableRestoreState>>({});
  const [restoreFinished, setRestoreFinished] = useState(false);

  const validationErrorText = (code: string): string => {
    if (code === "invalid_json") return ar ? "الملف مش JSON سليم." : "The file is not valid JSON.";
    if (code === "not_an_object" || code === "not_a_bahbah_backup")
      return ar ? "ده مش ملف نسخة احتياطية من بحبح." : "This is not a Bahbah backup file.";
    if (code === "unsupported_version")
      return ar ? "نسخة الملف مش مدعومة في الإصدار ده من التطبيق." : "This backup file version is not supported by this app version.";
    if (code === "missing_tables" || code === "no_known_tables")
      return ar ? "الملف مفيهوش جداول بيانات معروفة." : "The file contains no known data tables.";
    if (code.startsWith("bad_table:"))
      return (ar ? "جدول بصيغة غلط في الملف: " : "A table in the file has a bad shape: ") + label(code.slice("bad_table:".length));
    return code;
  };

  const warningText = (w: string): string => {
    if (w.startsWith("unknown_table:"))
      return (ar ? "جدول غريب اتخطى: " : "Unknown table skipped: ") + w.slice("unknown_table:".length);
    if (w.startsWith("dropped_rows:")) {
      const [, table, n] = w.split(":");
      return ar
        ? `اترفض ${n} صف من «${label(table)}» لأنه من غير مفتاح أساسي`
        : `${n} row(s) dropped from "${label(table)}" — missing primary key`;
    }
    return w;
  };

  const onPickFile = async (file: File) => {
    setImportError(null);
    setSummary(null);
    setRestoreStates({});
    setRestoreFinished(false);
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setImportError(validationErrorText("invalid_json"));
      return;
    }
    const res = validateBackupBundle(parsed);
    if (!res.ok) {
      setImportError(validationErrorText(res.error));
      return;
    }
    setSummary(res.backup);
  };

  const runRestore = async () => {
    if (!summary) return;
    setRestoring(true);
    setRestoreFinished(false);
    const order = BACKUP_TABLES.map((m) => m.table).filter((t) => summary.tables[t]);
    setRestoreStates(Object.fromEntries(order.map((t) => [t, { phase: "waiting" as const }])));
    let anyFail = false;
    for (const table of order) {
      setRestoreStates((s) => ({ ...s, [table]: { phase: "running" } }));
      const res = await restoreBackupTableToSupabase(table, summary.tables[table]);
      if (res.error) {
        anyFail = true;
        setRestoreStates((s) => ({
          ...s,
          [table]: { phase: "failed", error: friendlyError(res.error!, ar), upserted: res.upserted },
        }));
      } else {
        setRestoreStates((s) => ({ ...s, [table]: { phase: "done", upserted: res.upserted } }));
      }
    }
    setRestoring(false);
    setRestoreFinished(true);
    if (anyFail)
      toast.error(ar ? "الاسترجاع خلص بفشل في جدول أو أكتر — شوف النتيجة تحت كل جدول" : "Restore finished with failures — see per-table results");
    else toast.success(ar ? "الاسترجاع اكتمل — كل الجداول اتكتبت على السيرفر" : "Restore complete — all tables written to the server");
  };

  /* ---------------- ٣) الأرشفة ---------------- */
  const [cutoffChoice, setCutoffChoice] = useState<"3m" | "6m" | "1y" | "custom">("6m");
  const [customDate, setCustomDate] = useState<string>("");
  const cutoffIso = useMemo(() => {
    if (cutoffChoice === "custom") {
      if (!customDate) return null;
      const d = new Date(`${customDate}T00:00:00.000Z`);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    const d = new Date();
    if (cutoffChoice === "3m") d.setMonth(d.getMonth() - 3);
    if (cutoffChoice === "6m") d.setMonth(d.getMonth() - 6);
    if (cutoffChoice === "1y") d.setFullYear(d.getFullYear() - 1);
    return d.toISOString();
  }, [cutoffChoice, customDate]);

  const [preview, setPreview] = useState<Record<string, number> | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exportedCheck, setExportedCheck] = useState(false);
  const [armed, setArmed] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveResult, setArchiveResult] = useState<Record<string, number> | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    if (!cutoffIso) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    setArchiveResult(null);
    setArmed(false);
    const res = await fetchArchivePreviewFromSupabase(cutoffIso);
    if (res.counts) setPreview(res.counts);
    else {
      setPreview(null);
      setPreviewError(friendlyError(res.error, ar));
    }
    setPreviewLoading(false);
  }, [cutoffIso, ar]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const previewTotal = preview
    ? ARCHIVE_TABLE_ORDER.reduce((sum, t) => sum + (preview[t] ?? 0), 0)
    : 0;

  const runArchive = async () => {
    if (!cutoffIso) return;
    setArchiving(true);
    setArchiveError(null);
    const res = await archiveOldOperationalDataFromSupabase(cutoffIso);
    setArchiving(false);
    setArmed(false);
    if (res.counts) {
      setArchiveResult(res.counts);
      const total = Object.values(res.counts).reduce((a, b) => a + b, 0);
      toast.success(ar ? `الأرشفة تمت — اتحذف ${total} صف نهائيًا من السيرفر` : `Archive done — ${total} rows permanently deleted from the server`);
      void loadPreview();
    } else {
      setArchiveError(friendlyError(res.error, ar));
      toast.error(ar ? "الأرشفة فشلت — مفيش حاجة اتحذفت" : "Archive failed — nothing was deleted");
    }
  };

  const cutoffLabel =
    cutoffChoice === "3m"
      ? ar ? "أقدم من ٣ شهور" : "Older than 3 months"
      : cutoffChoice === "6m"
        ? ar ? "أقدم من ٦ شهور" : "Older than 6 months"
        : cutoffChoice === "1y"
          ? ar ? "أقدم من سنة" : "Older than 1 year"
          : ar ? "تاريخ مخصص" : "Custom date";

  return (
    <div className="space-y-4">
      {demo && <DemoModeBanner />}
      {!isAdmin && (
        <div className="flex items-center gap-2 rounded-2xl border border-[#F59E0B]/40 bg-[#FFFBEB] px-4 py-3 text-xs font-black text-[#B45309]">
          <AlertTriangle className="size-4 shrink-0" />
          {ar
            ? "القسم ظاهر بصلاحية «الماليات»، لكن الاسترجاع والأرشفة بينفذهم السيرفر للمدير (Admin) بس — أي محاولة من حساب غير مدير هتترفض من السيرفر نفسه."
            : "This section is visible with the Finances permission, but restore and archive are enforced server-side as admin-only — any attempt from a non-admin account is rejected by the server itself."}
        </div>
      )}

      {/* ============ ١) تصدير نسخة كاملة ============ */}
      <AdminCard>
        <SectionTitle
          icon={<DatabaseBackup className="size-5 text-[#1E4E8F]" />}
          title={ar ? "تصدير نسخة احتياطية كاملة" : "Export a full backup"}
        />
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          {ar
            ? "بيجمع كل بيانات السيرفر في ملف JSON واحد تحتفظ بيه عندك (هو نسختك الاحتياطية — الخطة المجانية مفيهاش نسخ تلقائي). الجداول بتتجاب جدول ورا جدول، وأي جدول يفشل بيتسمّى صراحة ومفيش نسخة ناقصة بتتسمى كاملة."
            : "Collects all server data into one JSON file you keep (it is your backup — the free plan has no automatic backups). Tables are fetched one by one; any failed table is named explicitly and a partial backup is never labelled complete."}
        </p>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-bold">
          <Checkbox
            checked={includeWarehouse}
            onCheckedChange={(v) => setIncludeWarehouse(v === true)}
            disabled={exporting}
          />
          {ar
            ? "ضمّن منتجات المخزن (حوالي ١٠ آلاف صنف — الملف هيكبر؛ المخزون بيتزامن أصلًا من أداة المخزن)"
            : "Include warehouse products (~10k items — the file grows; stock already syncs from the warehouse tool)"}
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            onClick={() => void runExport()}
            disabled={exporting || demo}
            className="h-10 rounded-full bg-[#1E4E8F] px-5 text-xs font-black text-white hover:bg-[#184C8A]"
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {ar ? "تنزيل نسخة كاملة دلوقتي" : "Download a full backup now"}
          </Button>
          {exportFailed.length > 0 && !exporting && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void runExport(exportFailed)}
                className="h-9 rounded-full px-4 text-xs font-bold"
              >
                {ar ? "إعادة محاولة الجداول الفاشلة" : "Retry failed tables"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={downloadPartial}
                className="h-9 rounded-full border-[#DC4B4B]/40 px-4 text-xs font-bold text-[#DC4B4B] hover:bg-[#DC4B4B]/10 hover:text-[#DC4B4B]"
              >
                {ar ? "تنزيل النسخة الجزئية كما هي (ناقصة)" : "Download the partial backup as-is (incomplete)"}
              </Button>
            </>
          )}
          {exportDoneAt && exportFailed.length === 0 && (
            <span className="text-[11px] font-bold text-[#2E9E6B]">
              {ar ? "آخر نسخة كاملة نزلت: " : "Last full backup downloaded: "}
              <span dir="ltr">{exportDoneAt.toLocaleTimeString(ar ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
            </span>
          )}
        </div>

        {Object.keys(fetchStates).length > 0 && (
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {exportTables.map((table) => {
              const st = fetchStates[table];
              if (!st) return null;
              return (
                <div key={table} className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                  <span className="flex items-center gap-2 font-bold">
                    <StatusIcon phase={st.phase} />
                    {label(table)}
                  </span>
                  <span className="font-black text-muted-foreground">
                    {st.phase === "done"
                      ? `${st.count} ${ar ? "صف" : "rows"}`
                      : st.phase === "failed"
                        ? ar ? "فشل" : "failed"
                        : st.phase === "fetching"
                          ? ar ? "بيتجاب…" : "fetching…"
                          : ar ? "في الانتظار" : "waiting"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {exportFailed.length > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-[#DC4B4B]/40 bg-[#DC4B4B]/10 px-3 py-2.5 text-xs font-black text-[#DC4B4B]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {ar
              ? `النسخة مش كاملة — فشل جلب: ${exportFailed.map(label).join("، ")}. اللي اتجاب محفوظ وممكن تنزّله جزئيًا أو تعيد المحاولة.`
              : `Backup is incomplete — failed to fetch: ${exportFailed.map(label).join(", ")}. What was fetched is kept; download it as partial or retry.`}
          </p>
        )}
      </AdminCard>

      {/* ============ ٢) استرجاع نسخة ============ */}
      <AdminCard>
        <SectionTitle
          icon={<Upload className="size-5 text-[#1E4E8F]" />}
          title={ar ? "استرجاع نسخة احتياطية" : "Restore a backup"}
        />
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          {ar
            ? "اختار ملف نسخة نزّلته من هنا قبل كده. هيتعرض ملخص بعدّاد كل جدول قبل أي كتابة، والكتابة upsert على المفتاح الأساسي — استرجاع نفس الملف مرتين مش هيكرّر أي صف."
            : "Pick a backup file previously downloaded from here. A per-table count summary is shown before anything is written, and writes are upserts by primary key — restoring the same file twice duplicates nothing."}
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onPickFile(f);
            e.target.value = "";
          }}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            disabled={restoring || demo}
            onClick={() => fileRef.current?.click()}
            className="h-10 rounded-full px-5 text-xs font-black"
          >
            <FileJson className="size-4" />
            {ar ? "اختيار ملف نسخة…" : "Choose a backup file…"}
          </Button>
        </div>

        {importError && (
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-[#DC4B4B]/40 bg-[#DC4B4B]/10 px-3 py-2.5 text-xs font-black text-[#DC4B4B]">
            <XCircle className="size-4 shrink-0" />
            {importError}
          </p>
        )}

        {summary && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-muted-foreground">
              <span>
                {ar ? "اتعملت بتاريخ: " : "Exported at: "}
                <span dir="ltr">{summary.exportedAt ? new Date(summary.exportedAt).toLocaleString(ar ? "ar-EG" : "en-GB") : "—"}</span>
              </span>
              <span className={`rounded-full px-2.5 py-1 font-black ${summary.complete ? "bg-[#EAF6F1] text-[#2E9E6B]" : "bg-[#DC4B4B]/10 text-[#DC4B4B]"}`}>
                {summary.complete ? (ar ? "نسخة كاملة" : "Complete backup") : ar ? "نسخة جزئية (ناقصة)" : "Partial backup (incomplete)"}
              </span>
              <span>
                {ar ? "إجمالي الصفوف: " : "Total rows: "}
                {Object.values(summary.counts).reduce((a, b) => a + b, 0)}
              </span>
            </div>

            {summary.warnings.length > 0 && (
              <div className="rounded-xl border border-[#F59E0B]/40 bg-[#FFFBEB] px-3 py-2.5 text-[11px] font-bold text-[#B45309]">
                {summary.warnings.map((w) => (
                  <p key={w} className="flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    {warningText(w)}
                  </p>
                ))}
              </div>
            )}

            <div className="grid gap-1.5 sm:grid-cols-2">
              {BACKUP_TABLES.filter((m) => summary.tables[m.table]).map((m) => {
                const st = restoreStates[m.table];
                return (
                  <div key={m.table} className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                    <span className="flex items-center gap-2 font-bold">
                      {st ? <StatusIcon phase={st.phase} /> : <span className="size-4 shrink-0 rounded-full border border-border" />}
                      {ar ? m.ar : m.en}
                    </span>
                    <span className="text-end font-black text-muted-foreground">
                      {st?.phase === "done"
                        ? `${ar ? "اتكتب" : "written"} ${st.upserted}`
                        : st?.phase === "failed"
                          ? `${ar ? "فشل" : "failed"}${st.upserted > 0 ? ` (${ar ? "اتكتب" : "written"} ${st.upserted})` : ""}`
                          : `${summary.counts[m.table]} ${ar ? "صف" : "rows"}`}
                    </span>
                  </div>
                );
              })}
            </div>
            {BACKUP_TABLES.filter((m) => restoreStates[m.table]?.phase === "failed").map((m) => (
              <p key={m.table} className="text-[11px] font-bold text-[#DC4B4B]">
                {ar ? m.ar : m.en}: {(restoreStates[m.table] as TableRestoreState & { phase: "failed" }).error}
              </p>
            ))}

            <Button
              onClick={() => void runRestore()}
              disabled={restoring || demo || !isAdmin}
              className="h-10 rounded-full bg-[#1E4E8F] px-5 text-xs font-black text-white hover:bg-[#184C8A]"
            >
              {restoring ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {restoreFinished
                ? ar ? "استرجاع تاني (نفس الملف — آمن، مفيش تكرار)" : "Restore again (same file — safe, no duplicates)"
                : ar ? "بدء الاسترجاع على السيرفر" : "Start restore to the server"}
            </Button>
            {!isAdmin && (
              <p className="text-[11px] font-bold text-[#B45309]">
                {ar ? "الاسترجاع للمدير بس — سجّل دخول بحساب مدير عشان يتنفذ." : "Restore is admin-only — sign in with an admin account to run it."}
              </p>
            )}
          </div>
        )}
      </AdminCard>

      {/* ============ ٣) الأرشفة ============ */}
      <AdminCard className="border-[#DC4B4B]/40">
        <SectionTitle
          icon={<Archive className="size-5 text-[#DC4B4B]" />}
          title={ar ? "أرشفة البيانات التشغيلية القديمة" : "Archive old operational data"}
        />
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          {ar
            ? "عشان المساحة ما تتمليش: بعد ما تنزّل نسخة كاملة، امسح نهائيًا البيانات التشغيلية القديمة من قاعدة البيانات الحية. الحذف بيتنفذ في السيرفر بقواعد ثابتة — والمعاينة تحت بنفس الشروط بالظبط."
            : "To keep storage from filling up: after downloading a full backup, permanently delete old operational data from the live database. Deletion runs server-side under fixed rules — the preview below uses exactly the same rules."}
        </p>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl bg-[#DC4B4B]/5 px-3 py-3">
            <p className="flex items-center gap-1.5 text-xs font-black text-[#DC4B4B]">
              <Trash2 className="size-4" />
              {ar ? "اللي هيتحذف نهائيًا" : "What gets permanently deleted"}
            </p>
            <ul className="mt-1.5 list-inside list-disc space-y-1 text-[11px] font-bold text-foreground/80">
              <li>{ar ? "الطلبات المنتهية (تم تسليمها أو ملغية) الأقدم من الحد — الطلب اللي لسه شغال ما بيتمسش مهما قدّم" : "Finished orders (delivered or cancelled) older than the cutoff — an order still in progress is never touched"}</li>
              <li>{ar ? "تحصيلات وتقييمات الطلبات دي" : "Those orders' courier collections and ratings"}</li>
              <li>{ar ? "عناصر الطوابير المقفولة: واتساب (اتحولت/تمت/ملغية)، نواقص (غير المستنية)، تمريض (تم/ملغي)، روشتات (غير الجديدة)" : "Closed queue items: WhatsApp (converted/done/cancelled), shortages (non-pending), nursing (done/cancelled), prescriptions (non-new)"}</li>
            </ul>
          </div>
          <div className="rounded-xl bg-[#EAF6F1] px-3 py-3">
            <p className="flex items-center gap-1.5 text-xs font-black text-[#2E9E6B]">
              <ShieldCheck className="size-4" />
              {ar ? "اللي عمره ما بيتمس — بيفضل حي دايمًا" : "What is NEVER deleted — always stays live"}
            </p>
            <ul className="mt-1.5 list-inside list-disc space-y-1 text-[11px] font-bold text-foreground/80">
              <li>{ar ? "حسابات العملاء وعناوينهم المحفوظة" : "Customer accounts and their saved addresses"}</li>
              <li>{ar ? "نقاط الولاء: الحسابات والسجل والكروت" : "Loyalty: accounts, ledger and cards"}</li>
              <li>{ar ? "قياسات المرضى واشتراكات العلاج الشهري" : "Patient measurements and monthly care subscriptions"}</li>
              <li>{ar ? "منتجات المخزن وإعدادات النظام" : "Warehouse products and system settings"}</li>
            </ul>
            <p className="mt-1.5 text-[11px] font-bold text-muted-foreground">
              {ar
                ? "القاعدة دي مفروضة في كود الـ SQL نفسه — دالة الأرشفة ما عندهاش أي مسار حذف للجداول دي."
                : "This rule is enforced in the SQL itself — the archive function has no delete path to those tables at all."}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(["3m", "6m", "1y", "custom"] as const).map((c) => (
            <Button
              key={c}
              size="sm"
              variant={cutoffChoice === c ? "default" : "outline"}
              className="h-9 rounded-full px-4 text-xs font-bold"
              onClick={() => setCutoffChoice(c)}
            >
              {c === "3m" ? (ar ? "أقدم من ٣ شهور" : "Older than 3 months")
                : c === "6m" ? (ar ? "أقدم من ٦ شهور" : "Older than 6 months")
                : c === "1y" ? (ar ? "أقدم من سنة" : "Older than 1 year")
                : ar ? "تاريخ مخصص" : "Custom date"}
            </Button>
          ))}
          {cutoffChoice === "custom" && (
            <Input
              type="date"
              value={customDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setCustomDate(e.target.value)}
              className="h-9 w-44 rounded-full text-xs font-bold"
              dir="ltr"
              aria-label={ar ? "حد الأرشفة" : "Archive cutoff"}
            />
          )}
        </div>

        {previewLoading && (
          <p className="mt-3 flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {ar ? "بيتحسب اللي هيتحذف…" : "Counting what would be deleted…"}
          </p>
        )}
        {previewError && (
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-[#DC4B4B]/40 bg-[#DC4B4B]/10 px-3 py-2.5 text-xs font-black text-[#DC4B4B]">
            <AlertTriangle className="size-4 shrink-0" />
            {previewError}
          </p>
        )}
        {preview && !previewError && (
          <div className="mt-3">
            <p className="text-xs font-black">
              {ar
                ? `بحد «${cutoffLabel}» هيتحذف ${previewTotal} صف:`
                : `With the cutoff "${cutoffLabel}", ${previewTotal} rows will be deleted:`}
            </p>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {ARCHIVE_TABLE_ORDER.map((t) => (
                <div key={t} className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                  <span className="font-bold">{label(t)}</span>
                  <span className="font-black text-[#DC4B4B]">{preview[t] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {archiveResult && (
          <div className="mt-3 rounded-xl bg-[#EAF6F1] px-3 py-3">
            <p className="flex items-center gap-1.5 text-xs font-black text-[#2E9E6B]">
              <CheckCircle2 className="size-4" />
              {ar ? "اتحذف فعليًا من السيرفر:" : "Actually deleted from the server:"}
            </p>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {ARCHIVE_TABLE_ORDER.map((t) => (
                <div key={t} className="flex items-center justify-between gap-2 rounded-lg bg-white/60 px-3 py-1.5 text-xs">
                  <span className="font-bold">{label(t)}</span>
                  <span className="font-black">{archiveResult[t] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {archiveError && (
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-[#DC4B4B]/40 bg-[#DC4B4B]/10 px-3 py-2.5 text-xs font-black text-[#DC4B4B]">
            <AlertTriangle className="size-4 shrink-0" />
            {archiveError}
          </p>
        )}

        <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs font-black">
          <Checkbox
            checked={exportedCheck}
            onCheckedChange={(v) => setExportedCheck(v === true)}
            className="mt-0.5"
          />
          {ar
            ? "نزّلت نسخة احتياطية كاملة خلاص ومتحقق منها — فاهم إن الحذف ده نهائي ومفيش رجوع فيه غير بالاسترجاع من النسخة"
            : "I have already downloaded a full backup and verified it — I understand this deletion is permanent and the only way back is restoring from that backup"}
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!armed ? (
            <Button
              onClick={() => setArmed(true)}
              disabled={!exportedCheck || !preview || previewTotal === 0 || archiving || demo || !isAdmin}
              className="h-10 rounded-full bg-[#DC4B4B] px-5 text-xs font-black text-white hover:bg-[#c23e3e]"
            >
              <Trash2 className="size-4" />
              {ar ? `أرشفة وحذف ${previewTotal > 0 ? previewTotal : ""} صف نهائيًا` : `Archive & permanently delete ${previewTotal > 0 ? previewTotal : ""} rows`}
            </Button>
          ) : (
            <>
              <span className="text-xs font-black text-[#DC4B4B]">
                {ar ? "متأكد؟ الحذف نهائي ومش هيتلغي." : "Are you sure? This deletion is final."}
              </span>
              <Button
                onClick={() => void runArchive()}
                disabled={archiving}
                className="h-10 rounded-full bg-[#DC4B4B] px-5 text-xs font-black text-white hover:bg-[#c23e3e]"
              >
                {archiving ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                {ar ? "تأكيد الحذف النهائي" : "Confirm permanent deletion"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setArmed(false)}
                disabled={archiving}
                className="h-10 rounded-full px-5 text-xs font-bold"
              >
                {ar ? "لأ، رجوع" : "No, go back"}
              </Button>
            </>
          )}
          {preview && previewTotal === 0 && (
            <span className="text-[11px] font-bold text-muted-foreground">
              {ar ? "مفيش حاجة أقدم من الحد ده للحذف." : "Nothing older than this cutoff to delete."}
            </span>
          )}
        </div>
      </AdminCard>
    </div>
  );
}
