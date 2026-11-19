"use client";

import { useEffect, useState, type ReactNode } from "react";
import { resolveRxPhotoUrl } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/* عرض صور الروشتات/النواقص من الباكت الخاص (الأمان — الطبقة ٢)      */
/* القيم المخزنة بقت مسارات ملفات (أو روابط عامة قديمة) — المكونات   */
/* دي بتبني رابط موقّع مؤقت وقت العرض بـ resolveRxPhotoUrl.          */
/* قبل تركيب ترقية الطبقة ٢ على السيرفر التوقيع هيفشل بهدوء          */
/* والمكوّن هيعرض البديل النصي — مفيش كراش ومفيش روابط مكسورة.       */
/* ------------------------------------------------------------------ */

/** بيحوّل قيمة مخزنة (مسار/رابط قديم/data:) لرابط عرض جاهز أو null */
export function useRxPhotoUrl(value: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (!value) return;
    void resolveRxPhotoUrl(value).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [value]);
  return url;
}

/**
 * رابط نصي لصورة مرفقة: بيبقى رابط حقيقي (أو زرار onOpen) بس لو
 * الرابط الموقّع اتبنى فعلًا — غير كده بيعرض البديل النصي زي ما هو.
 */
export function RxPhotoLink({
  value,
  className,
  fallbackText,
  onOpen,
  children,
}: {
  value: string | null | undefined;
  className?: string;
  /** اللي يظهر لو مفيش رابط (اسم ملف مثلًا) — افتراضي: نفس محتوى الرابط */
  fallbackText?: ReactNode;
  /** لو موجودة: زرار يستدعيها بالرابط الموقّع بدل فتح تبويب جديد */
  onOpen?: (url: string) => void;
  children: ReactNode;
}) {
  const url = useRxPhotoUrl(value);
  if (!url) {
    /* البديل النصي من غير ستايل الرابط — مش قابل للدوس فمش لازم يبان كده */
    return <span>{fallbackText ?? children}</span>;
  }
  if (onOpen) {
    return (
      <button type="button" className={className} onClick={() => onOpen(url)}>
        {children}
      </button>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

/** صورة مرفقة بتتعرّض بالرابط الموقّع — ما بتترسمش خالص لو مفيش رابط */
export function RxPhotoImg({
  value,
  alt,
  className,
  onClick,
}: {
  value: string | null | undefined;
  alt?: string;
  className?: string;
  onClick?: (url: string) => void;
}) {
  const url = useRxPhotoUrl(value);
  if (!url) return null;
  return (
    <img
      src={url}
      alt={alt || ""}
      className={className}
      onClick={onClick ? () => onClick(url) : undefined}
    />
  );
}
