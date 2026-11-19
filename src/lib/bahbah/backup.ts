/* ------------------------------------------------------------------ */
/* النسخ الاحتياطي والأرشفة — منطق الملف نفسه (نقي، من غير شبكة):     */
/*   - قايمة الجداول اللي النسخة بتغطيها ومفتاح كل جدول الأساسي.       */
/*   - بناء ملف النسخة (JSON واحد) من صفوف السيرفر الخام.              */
/*   - التحقق من ملف نسخة قبل الاسترجاع: الشكل والنسخة والمفاتيح —    */
/*     أي صف من غير مفتاح أساسي بيترفض وبيتعدّ، وأي جدول غريب         */
/*     بيتلاحظ وبيتخطى، والاسترجاع نفسه upsert فإعادة نفس الملف       */
/*     مرتين ما بتكرّرش أي صف.                                        */
/* الكتابة الفعلية للاسترجاع بتعدي على دالة restore_backup_table      */
/* في السيرفر (أدمن بس) — شوف upgrade-2026-11-19-data-archive.sql.     */
/* ------------------------------------------------------------------ */

export type BackupRow = Record<string, unknown>;

export interface BackupTableMeta {
  table: string;
  /** عمود المفتاح الأساسي — ترتيب الجلب وهدف الـ upsert في الاسترجاع */
  pk: string;
  ar: string;
  en: string;
  /** اختياري في واجهة التصدير (بيتفعّل بعلامة) — المخزون كبير وبيتزامن من أداة المخزن أصلًا */
  optional?: boolean;
}

/** الجداول الأساسية في كل نسخة — بالترتيب اللي بتتجاب وتتسترجع بيه */
export const BACKUP_TABLES: BackupTableMeta[] = [
  { table: "orders", pk: "id", ar: "الطلبات", en: "Orders" },
  { table: "courier_collections", pk: "id", ar: "تحصيلات المناديب (التوريد)", en: "Courier collections" },
  { table: "courier_ratings", pk: "id", ar: "تقييمات المناديب", en: "Courier ratings" },
  { table: "whatsapp_orders", pk: "id", ar: "طلبات واتساب", en: "WhatsApp orders" },
  { table: "shortage_requests", pk: "id", ar: "طلبات النواقص", en: "Shortage requests" },
  { table: "nursing_requests", pk: "id", ar: "حجوزات التمريض", en: "Nursing bookings" },
  { table: "rx_requests", pk: "id", ar: "الروشتات", en: "Prescriptions" },
  { table: "care_subscriptions", pk: "id", ar: "اشتراكات العلاج الشهري", en: "Monthly care subscriptions" },
  { table: "patient_measurements", pk: "id", ar: "قياسات المرضى", en: "Patient measurements" },
  { table: "loyalty_accounts", pk: "customer_phone", ar: "حسابات نقاط الولاء", en: "Loyalty accounts" },
  { table: "loyalty_ledger", pk: "id", ar: "سجل حركات النقاط", en: "Loyalty ledger" },
  { table: "loyalty_cards", pk: "id", ar: "كروت خصم الولاء", en: "Loyalty cards" },
  { table: "customer_addresses", pk: "id", ar: "عناوين العملاء", en: "Customer addresses" },
  { table: "warehouse_products", pk: "sync_key", ar: "منتجات المخزن", en: "Warehouse products", optional: true },
];

export const backupTableMeta = (table: string): BackupTableMeta | undefined =>
  BACKUP_TABLES.find((m) => m.table === table);

export interface BahbahBackupBundle {
  app: "bahbah-pharmacy";
  kind: "full-backup";
  version: 1;
  exportedAt: string;
  /** false لو في جدول فشل جلبُه — النسخة الجزئية بتتسمى جزئية صراحة */
  complete: boolean;
  /** الجداول اللي فشل جلبها (فاضية لو النسخة كاملة) */
  missingTables: string[];
  counts: Record<string, number>;
  tables: Record<string, BackupRow[]>;
}

export function buildBackupBundle(args: {
  tables: Record<string, BackupRow[]>;
  missingTables: string[];
  exportedAt?: string;
}): BahbahBackupBundle {
  const counts: Record<string, number> = {};
  for (const [table, rows] of Object.entries(args.tables)) counts[table] = rows.length;
  return {
    app: "bahbah-pharmacy",
    kind: "full-backup",
    version: 1,
    exportedAt: args.exportedAt ?? new Date().toISOString(),
    complete: args.missingTables.length === 0,
    missingTables: args.missingTables,
    counts,
    tables: args.tables,
  };
}

export interface ValidatedBackup {
  exportedAt: string | null;
  complete: boolean;
  /** صفوف صالحة للاسترجاع لكل جدول معروف */
  tables: Record<string, BackupRow[]>;
  /** عدّادات الملخص قبل أي كتابة */
  counts: Record<string, number>;
  /** تحذيرات صريحة: جداول غريبة اتخطت، صفوف من غير مفتاح اترفضت */
  warnings: string[];
}

export type BackupValidation =
  | { ok: true; backup: ValidatedBackup }
  | { ok: false; error: string };

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * التحقق من ملف نسخة قبل ما أي حاجة تتكتب: لازم يكون ملف بحبح
 * (app/kind) ونسخته مدعومة (version 1)، وكل جدول معروف لازم يكون
 * مصفوفة صفوف، وكل صف لازم يكون عنده مفتاحه الأساسي بقيمة حقيقية —
 * الصفوف الناقصة بتترفض وبتتعدّ في التحذيرات بدل ما تدخل صامتة.
 */
export function validateBackupBundle(raw: unknown): BackupValidation {
  if (!isPlainObject(raw)) return { ok: false, error: "not_an_object" };
  if (raw.app !== "bahbah-pharmacy" || raw.kind !== "full-backup")
    return { ok: false, error: "not_a_bahbah_backup" };
  if (raw.version !== 1) return { ok: false, error: "unsupported_version" };
  if (!isPlainObject(raw.tables)) return { ok: false, error: "missing_tables" };

  const warnings: string[] = [];
  const tables: Record<string, BackupRow[]> = {};
  const counts: Record<string, number> = {};

  for (const key of Object.keys(raw.tables)) {
    if (!backupTableMeta(key)) warnings.push(`unknown_table:${key}`);
  }

  for (const meta of BACKUP_TABLES) {
    const value = raw.tables[meta.table];
    if (value === undefined) continue;
    if (!Array.isArray(value)) return { ok: false, error: `bad_table:${meta.table}` };
    const good: BackupRow[] = [];
    let dropped = 0;
    for (const row of value) {
      if (!isPlainObject(row)) {
        dropped++;
        continue;
      }
      const pkVal = row[meta.pk];
      if (pkVal === null || pkVal === undefined || pkVal === "") {
        dropped++;
        continue;
      }
      good.push(row);
    }
    if (dropped > 0) warnings.push(`dropped_rows:${meta.table}:${dropped}`);
    tables[meta.table] = good;
    counts[meta.table] = good.length;
  }

  if (Object.keys(tables).length === 0) return { ok: false, error: "no_known_tables" };

  return {
    ok: true,
    backup: {
      exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : null,
      complete: raw.complete !== false,
      tables,
      counts,
      warnings,
    },
  };
}
