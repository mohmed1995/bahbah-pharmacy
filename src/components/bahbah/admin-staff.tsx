"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Trash2, Save, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  useBahbah,
  PERMISSION_KEYS,
  PERMISSION_DEFAULTS,
  type PermissionKey,
} from "@/lib/bahbah/store";
import type { Role } from "@/lib/bahbah/data";
import {
  fetchAllStaffPermissions,
  upsertStaffPermissions,
  deleteStaffPermissions,
  type DbStaffPermission,
} from "@/lib/supabase";
import { AdminCard, SectionTitle } from "./admin-ui";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Staff permissions — المدير بيوزع صلاحيات كل موظف بنفسه.             */
/* الحفظ في جدول staff_permissions (كتابة أدمن بس بـ RLS)، والتطبيق    */
/* بيقرا صف الموظف عند دخوله. حذف الصف = رجوع لافتراضات الدور.        */
/* ------------------------------------------------------------------ */

const PERM_LABELS: Record<PermissionKey, { ar: string; en: string }> = {
  orders: { ar: "الطلبات والتنفيذ", en: "Orders & execution" },
  prescriptions: { ar: "الروشتات", en: "Prescriptions" },
  medicines: { ar: "الأدوية والمخزون", en: "Medicines & stock" },
  shortages: { ar: "طلبات النواقص", en: "Shortage requests" },
  whatsapp_orders: { ar: "طلبات واتساب", en: "WhatsApp orders" },
  measurements: { ar: "قياسات وملفات المرضى", en: "Measurements & patient files" },
  nursing: { ar: "خدمات التمريض", en: "Nursing services" },
  finances: { ar: "الماليات والتقارير", en: "Finances & reports" },
  settings: { ar: "الإعدادات والصيانة", en: "Settings & maintenance" },
  staff: { ar: "إدارة الطاقم والصلاحيات", en: "Staff & permissions" },
};

const STAFF_ROLES: { role: Exclude<Role, "patient">; ar: string; en: string }[] = [
  { role: "pharmacist", ar: "صيدلي", en: "Pharmacist" },
  { role: "courier", ar: "مندوب توصيل", en: "Courier" },
  { role: "admin", ar: "إدارة", en: "Admin" },
];

export function StaffPermissionsSection() {
  const lang = useBahbah((s) => s.lang);
  const myEmail = useBahbah((s) => s.user?.email ?? "");
  const [rows, setRows] = useState<DbStaffPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<Role, "patient">>("pharmacist");
  const [perms, setPerms] = useState<Record<PermissionKey, boolean>>({ ...PERMISSION_DEFAULTS.pharmacist });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await fetchAllStaffPermissions());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* اختيار دور جديد في النموذج = نبدأ من افتراضاته */
  const pickRole = (r: Exclude<Role, "patient">) => {
    setRole(r);
    setPerms({ ...PERMISSION_DEFAULTS[r] });
  };

  /* تعديل صف موجود: ننقل قيمه للنموذج */
  const editRow = (row: DbStaffPermission) => {
    const r = (STAFF_ROLES.some((x) => x.role === row.role) ? row.role : "pharmacist") as Exclude<Role, "patient">;
    setEmail(row.user_email);
    setRole(r);
    setPerms({ ...PERMISSION_DEFAULTS[r], ...(row.permissions ?? {}) });
  };

  const save = async () => {
    const e = email.trim().toLowerCase();
    if (!e.includes("@")) {
      toast.error(lang === "ar" ? "اكتب إيميل الموظف صح" : "Enter a valid staff email");
      return;
    }
    setSaving(true);
    const ok = await upsertStaffPermissions(e, role, perms, myEmail);
    setSaving(false);
    if (ok) {
      toast.success(lang === "ar" ? "اتحفظت الصلاحيات — هتتطبق من أول دخول جاي للموظف" : "Permissions saved — they apply at the staff member's next sign-in");
      void load();
    } else {
      toast.error(
        lang === "ar"
          ? "الحفظ فشل — اتأكد إن ملف ترقية الصلاحيات اتشغّل في Supabase"
          : "Save failed — make sure the permissions upgrade SQL was run in Supabase"
      );
    }
  };

  const remove = async (row: DbStaffPermission) => {
    const ok = await deleteStaffPermissions(row.user_email);
    if (ok) {
      toast.success(lang === "ar" ? "اتشال الصف المخصص — الموظف رجع لافتراضات دوره" : "Custom row removed — back to role defaults");
      void load();
    } else {
      toast.error(lang === "ar" ? "الحذف فشل" : "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <AdminCard>
        <SectionTitle
          icon={<ShieldCheck className="size-5 text-[#1E4E8F]" />}
          title={lang === "ar" ? "صلاحيات الطاقم" : "Staff permissions"}
        />
        <p className="mt-2 text-xs font-bold leading-relaxed text-muted-foreground">
          {lang === "ar"
            ? "حدد لكل موظف يشوف إيه وينفذ إيه. مثال: صيدلي يشوف الأدوية والطلبات وينفذها، والماليات مقفولة عليه تمامًا — في الواجهة وفي قاعدة البيانات. الموظف اللي ملوش صف مخصص بيشتغل بافتراضات دوره."
            : "Choose what each staff member can see and do. Example: a pharmacist sees medicines and orders and executes them, while finances stay fully closed — in the UI and in the database. Staff without a custom row keep their role defaults."}
        </p>

        {/* ---- editor form ---- */}
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@bahbah.eg"
            dir="ltr"
            className="h-11 rounded-xl"
            aria-label={lang === "ar" ? "إيميل الموظف" : "Staff email"}
          />
          <div className="flex gap-1.5">
            {STAFF_ROLES.map((r) => (
              <button
                type="button"
                key={r.role}
                onClick={() => pickRole(r.role)}
                className={`rounded-full px-3.5 py-2 text-xs font-black transition ${
                  role === r.role
                    ? "bg-[#1E4E8F] text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {lang === "ar" ? r.ar : r.en}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PERMISSION_KEYS.map((k) => (
            <label
              key={k}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 px-3.5 py-2.5"
            >
              <span className="text-xs font-black">{lang === "ar" ? PERM_LABELS[k].ar : PERM_LABELS[k].en}</span>
              <Switch
                checked={!!perms[k]}
                onCheckedChange={(v) => setPerms((p) => ({ ...p, [k]: v }))}
                aria-label={lang === "ar" ? PERM_LABELS[k].ar : PERM_LABELS[k].en}
              />
            </label>
          ))}
        </div>

        <Button className="mt-4 h-11 rounded-full px-6 font-black" onClick={save} disabled={saving}>
          {saving ? <Save className="size-4 animate-pulse" /> : <UserPlus className="size-4" />}
          {lang === "ar" ? "حفظ صلاحيات الموظف" : "Save staff permissions"}
        </Button>
      </AdminCard>

      {/* ---- existing rows ---- */}
      <AdminCard>
        <SectionTitle
          icon={<ShieldCheck className="size-5 text-[#2E9E6B]" />}
          title={lang === "ar" ? "صلاحيات مخصصة حالية" : "Current custom permissions"}
        />
        {loading ? (
          <p className="mt-3 text-sm font-bold text-muted-foreground">
            {lang === "ar" ? "جاري التحميل..." : "Loading..."}
          </p>
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm font-bold text-muted-foreground">
            {lang === "ar"
              ? "مفيش صفوف مخصصة — كل الطاقم شغال بافتراضات دوره (الصيدلي من غير ماليات، والمندوب طلباته بس)."
              : "No custom rows — everyone runs on role defaults (pharmacist without finances, courier with his orders only)."}
          </p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {rows.map((row) => {
              const merged = {
                ...(PERMISSION_DEFAULTS[(row.role as Role) ?? "pharmacist"] ?? PERMISSION_DEFAULTS.pharmacist),
                ...(row.permissions ?? {}),
              };
              const granted = PERMISSION_KEYS.filter((k) => merged[k]);
              return (
                <div
                  key={row.user_email}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black" dir="ltr">
                      {row.user_email}
                      <Badge className="ms-2 rounded-full border-0 bg-[#EAF1F9] text-[#1E4E8F]">
                        {STAFF_ROLES.find((r) => r.role === row.role)
                          ? lang === "ar"
                            ? STAFF_ROLES.find((r) => r.role === row.role)!.ar
                            : STAFF_ROLES.find((r) => r.role === row.role)!.en
                          : row.role}
                      </Badge>
                    </p>
                    <p className="mt-1.5 flex flex-wrap gap-1">
                      {granted.map((k) => (
                        <span key={k} className="rounded-full bg-[#EAF6F1] px-2 py-0.5 text-[10px] font-black text-[#2E9E6B]">
                          {lang === "ar" ? PERM_LABELS[k].ar : PERM_LABELS[k].en}
                        </span>
                      ))}
                      {granted.length === 0 && (
                        <span className="text-[11px] font-bold text-muted-foreground">
                          {lang === "ar" ? "كل الصلاحيات مقفولة" : "All permissions off"}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button size="sm" variant="outline" className="rounded-full px-3.5 text-xs font-bold" onClick={() => editRow(row)}>
                      {lang === "ar" ? "تعديل" : "Edit"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full px-2.5 text-xs font-bold text-[#DC4B4B] hover:bg-[#DC4B4B]/10 hover:text-[#DC4B4B]"
                      onClick={() => remove(row)}
                      aria-label={lang === "ar" ? "حذف" : "Delete"}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
