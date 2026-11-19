"use client";

import { Phone, MessageCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBahbah } from "@/lib/bahbah/store";
import { IconWhatsapp } from "./icons";

/* ------------------------------------------------------------------ */
/* تواصل سريع مع العميل: اتصال + واتساب برسائل جاهزة                    */
/* بيظهر في أي مكان الطاقم/المندوب شايف فيه رقم عميل (كروت الطلبات،   */
/* شاشة المندوب، قوائم الصيدلي، جدول العملاء). الرسائل الجاهزة بيعدّلها */
/* المدير من لوحة الإدارة (admin_settings.courier_msg_templates)      */
/* وبتتوزع على كل الأجهزة من get_public_settings.                     */
/* ------------------------------------------------------------------ */

/** تحويل أي صيغة رقم مصري لصيغة واتساب الدولية (20…) من غير + */
export function waIntlPhone(phone: string): string {
  const digits = (phone || "").replace(/[^0-9]/g, "");
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("1")) return `20${digits}`;
  return digits;
}

export function CustomerContactMenu({
  phone,
  label,
  className,
}: {
  phone: string;
  /** نص الزرار (افتراضي: أيقونة بس) */
  label?: string;
  className?: string;
}) {
  const lang = useBahbah((s) => s.lang);
  const templates = useBahbah((s) => s.courierMsgTemplates);
  if (!phone || phone.replace(/[^0-9]/g, "").length < 8) return null;

  const tel = phone.replace(/[\s-]/g, "");
  const wa = waIntlPhone(phone);
  const list = (templates ?? []).filter((x) => x && x.trim().length > 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={lang === "ar" ? "تواصل مع العميل" : "Contact customer"}
          className={
            className ??
            "inline-flex h-9 items-center gap-1.5 rounded-full bg-[#2E9E6B] px-3.5 text-xs font-black text-white shadow-xs transition hover:brightness-105 active:scale-95"
          }
        >
          <Phone className="size-3.5" />
          {label ?? (lang === "ar" ? "تواصل" : "Contact")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5">
        <DropdownMenuItem asChild>
          <a href={`tel:${tel}`} className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-bold">
            <Phone className="size-4 text-[#2E9E6B]" />
            {lang === "ar" ? "اتصال بالعميل" : "Call customer"}
            <span dir="ltr" className="ms-auto text-xs text-muted-foreground">{phone}</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noreferrer"
            className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-bold"
          >
            <IconWhatsapp className="size-4 text-[#25D366]" />
            {lang === "ar" ? "واتساب — محادثة جديدة" : "WhatsApp — new chat"}
          </a>
        </DropdownMenuItem>
        {list.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-2.5 pb-1 pt-1.5 text-[11px] font-black text-muted-foreground">
              {lang === "ar" ? "رسائل جاهزة — دوسة واحدة وبتتبعت" : "Ready messages — one tap"}
            </DropdownMenuLabel>
            {list.map((msg, i) => (
              <DropdownMenuItem key={i} asChild>
                <a
                  href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-bold leading-snug"
                >
                  <MessageCircle className="size-4 shrink-0 text-[#25D366]" />
                  <span className="line-clamp-2">{msg}</span>
                </a>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
