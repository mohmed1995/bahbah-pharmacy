/**
 * دخول العميل ببصمة الجهاز (WebAuthn) مربوط بـ Supabase.
 *
 * - التفعيل: جلسة Supabase (بنعمل Anonymous sign-in لو مفيش) ← بصمة الجهاز تتسجّل (platform authenticator
 *   مع userVerification إجباري) ← بيانات الجهاز (credential_id + الاسم + الموبايل) بتتحفظ في جدول
 *   patient_devices المحمي بـ RLS (صاحب الجلسة بس يشوفه).
 * - الدخول: نظام التشغيل بيطلب البصمة/الوجه، وبعدها بنرجّع جلسة Supabase المحفوظة ونقرا بيانات
 *   العميل من patient_devices.
 *
 * ⚠️ ده قفل راحة للعميل على جهازه مش توثيق سيرفر: ماينفعش يمنح أي صلاحية طاقم (الأدوار بتيجي
 * من app_metadata بس). التحقق من توقيع WebAuthn على السيرفر محتاج Edge Function.
 */
import { supabase } from "@/lib/supabase";

const LS_KEY = "bahbah_bio_v1";

export type BioErrorCode =
  | "unsupported"
  | "no_session"
  | "cancelled"
  | "not_enrolled"
  | "session_expired"
  | "save_failed";

export class BioError extends Error {
  code: BioErrorCode;
  constructor(code: BioErrorCode) {
    super(code);
    this.code = code;
  }
}

const b64u = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64u = (s: string) => {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

function readLocal(): { credId: string; userId: string } | null {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeLocal(v: { credId: string; userId: string } | null) {
  try {
    if (v) window.localStorage.setItem(LS_KEY, JSON.stringify(v));
    else window.localStorage.removeItem(LS_KEY);
  } catch {}
}

export async function biometricSupported(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !window.PublicKeyCredential || !window.isSecureContext) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export const biometricEnrolled = () => typeof window !== "undefined" && !!readLocal();

export function forgetBiometric() {
  writeLocal(null);
}

const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n));

/** تفعيل البصمة لهذا الجهاز وربطها بحساب Supabase */
export async function enrollBiometric(profile: { name: string; phone: string }) {
  if (!(await biometricSupported())) throw new BioError("unsupported");

  let { data: sess } = await supabase.auth.getSession();
  if (!sess.session) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.session) throw new BioError("no_session");
    sess = { session: data.session };
  }
  const user = sess.session!.user;
  await supabase.auth.updateUser({ data: { name: profile.name, phone: profile.phone, role: "patient" } }).catch(() => {});

  let cred: PublicKeyCredential | null = null;
  try {
    cred = (await navigator.credentials.create({
      publicKey: {
        rp: { name: "Bahbah Pharmacy", id: location.hostname },
        user: { id: new TextEncoder().encode(user.id), name: profile.phone, displayName: profile.name },
        challenge: rand(32),
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;
  } catch {
    throw new BioError("cancelled");
  }
  if (!cred) throw new BioError("cancelled");

  const credId = b64u(cred.rawId);
  const { error } = await supabase
    .from("patient_devices")
    .upsert({ credential_id: credId, name: profile.name, phone: profile.phone }, { onConflict: "credential_id" });
  if (error) throw new BioError("save_failed");
  writeLocal({ credId, userId: user.id });
}

/** دخول بالبصمة: بيرجّع بيانات العميل من Supabase */
export async function biometricLogin(): Promise<{ name: string; phone: string }> {
  const local = readLocal();
  if (!local) throw new BioError("not_enrolled");
  if (!(await biometricSupported())) throw new BioError("unsupported");

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: rand(32),
        rpId: location.hostname,
        allowCredentials: [{ type: "public-key", id: fromB64u(local.credId) }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    if (!assertion) throw new Error("cancelled");
  } catch {
    throw new BioError("cancelled");
  }

  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session || sess.session.user.id !== local.userId) throw new BioError("session_expired");

  const { data, error } = await supabase
    .from("patient_devices")
    .select("name,phone")
    .eq("credential_id", local.credId)
    .maybeSingle();
  if (error || !data) throw new BioError("session_expired");
  return { name: data.name ?? "", phone: data.phone ?? "" };
}
