"use client";

import { useState } from "react";
import { useBahbah } from "@/lib/bahbah/store";
import { WASLY, planById } from "@/lib/bahbah/data";
import { phonesMatch } from "./patient-timeline";
import { IconRefill, IconWhatsapp } from "./icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* تذكير الصندوق الشهري — بيظهر لما الاشتراك الشهري للمريض المسجل      */
/* قرب يخلص (خلال 3 أيام أو عدى ميعاده من قريب)، من بيانات             */
/* care_subscriptions الحقيقية المتزامنة من السيرفر، والمفتاح = الهاتف */
/* ------------------------------------------------------------------ */
export default function MonthlyReminder() {
  const lang = useBahbah((s) => s.lang);
  const user = useBahbah((s) => s.user);
  const careSubs = useBahbah((s) => s.careSubs);
  const refillMonthlyRx = useBahbah((s) => s.refillMonthlyRx);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const phone = user?.phone || "";
  const sub = careSubs.find((c) => c.status === "active" && phonesMatch(c.phone, phone));
  if (!sub || done) return null;

  const due = new Date(`${sub.nextDelivery}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days > 3 || days < -14) return null;

  const plan = planById(sub.planId);
  const waText =
    lang === "ar"
      ? `السلام عليكم، أنا ${sub.nameAr}، صندوقي الشهري (${plan?.nameAr ?? "الأدوية الشهرية"}) قرب يخلص — من فضلكم جهزوا اللي بعده.`
      : `Hello, I'm ${sub.nameEn || sub.nameAr}. My monthly box is about to run out — please prepare the next one.`;

  const onRefill = async () => {
    setSending(true);
    try {
      const id = await refillMonthlyRx(sub);
      if (id) {
        setDone(true);
        toast.success(
          lang === "ar"
            ? "تم إرسال طلب تجهيز صندوقك الشهري — الصيدلي هيأكده معاك"
            : "Your monthly box refill was requested — the pharmacist will confirm"
        );
      }
    } catch {
      toast.error(lang === "ar" ? "تعذر إرسال طلب التكرار — حاول تاني" : "Refill request failed — try again");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 md:px-6">
      <div className="flex flex-col items-start gap-4 rounded-3xl border border-[#F59E0B]/40 bg-[#FFFBEB] p-5 shadow-sm md:flex-row md:items-center md:p-6">
        <span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-[#F59E0B] text-white shadow-md">
          <IconRefill className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-base font-black md:text-lg">
            {lang === "ar" ? "صندوقك الشهري بيخلص — نجهز اللي بعده؟" : "Your monthly box is running out — shall we prepare the next one?"}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground md:text-sm">
            {plan ? `${lang === "ar" ? plan.nameAr : plan.nameEn} — ` : ""}
            {days > 0
              ? lang === "ar"
                ? `التوصيلة الجاية بعد ${days} ${days === 1 ? "يوم" : "أيام"} (${sub.nextDelivery})`
                : `Next delivery in ${days} day(s) (${sub.nextDelivery})`
              : days === 0
                ? lang === "ar"
                  ? "التوصيلة الجاية النهاردة"
                  : "Next delivery is today"
                : lang === "ar"
                  ? `التوصيلة عدت من ${-days} ${-days === 1 ? "يوم" : "أيام"} — نجهزها فوراً`
                  : `Delivery was ${-days} day(s) ago — let's prepare it now`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            onClick={onRefill}
            disabled={sending}
            className="rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] px-5 font-black text-white shadow-md transition hover:brightness-105 active:scale-95"
          >
            {lang === "ar" ? "جهزوا اللي بعده" : "Prepare the next box"}
          </Button>
          <a
            href={`https://wa.me/${WASLY.whatsapp}?text=${encodeURIComponent(waText)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#059669]/40 bg-white px-4 text-sm font-black text-[#059669] transition hover:bg-[#ECFDF5] active:scale-95"
          >
            <IconWhatsapp className="size-4" />
            {lang === "ar" ? "واتساب" : "WhatsApp"}
          </a>
        </div>
      </div>
    </section>
  );
}
