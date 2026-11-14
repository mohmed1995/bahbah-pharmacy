"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  XCircle,
  Phone,
  Clock,
  FileImage,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RxStatus } from "@/lib/bahbah/data";
import { useBahbah, useT, type RxRequest } from "@/lib/bahbah/store";
import { IconRxClipboard, IconRxSheet } from "./icons";
import { AdminCard, KpiCard, SectionTitle } from "./admin-ui";
import { toast } from "sonner";

/* ================================================================== */
/* PRESCRIPTIONS — pharmacist review queue (client uploads land here)  */
/* ================================================================== */

const RX_META: Record<RxStatus, { key: "adm.rx.new" | "adm.rx.approved" | "adm.rx.rejected"; cls: string }> = {
  new: { key: "adm.rx.new", cls: "bg-[#FFF4E5] text-[#B45E0A]" },
  approved: { key: "adm.rx.approved", cls: "bg-[#EAF6F1] text-[#2E9E6B]" },
  rejected: { key: "adm.rx.rejected", cls: "bg-[#DC4B4B]/10 text-[#DC4B4B]" },
};

export function PrescriptionsSection() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const rxQueue = useBahbah((s) => s.rxQueue);
  const { adminSetRx } = useBahbah();
  const [filter, setFilter] = useState<"all" | RxStatus>("all");

  const counts = useMemo(
    () => ({
      all: rxQueue.length,
      new: rxQueue.filter((r) => r.status === "new").length,
      approved: rxQueue.filter((r) => r.status === "approved").length,
      rejected: rxQueue.filter((r) => r.status === "rejected").length,
    }),
    [rxQueue]
  );

  const list = useMemo(
    () => (filter === "all" ? rxQueue : rxQueue.filter((r) => r.status === filter)),
    [rxQueue, filter]
  );

  const kpis = [
    { icon: <IconRxSheet className="size-5" />, tint: "bg-[#FFF4E5]", color: "text-[#C56A0A]", value: String(counts.new), label: t("adm.rx.kpiNew") },
    { icon: <BadgeCheck className="size-5" />, tint: "bg-[#EAF6F1]", color: "text-[#2E9E6B]", value: String(counts.approved), label: t("adm.rx.kpiApproved") },
    { icon: <XCircle className="size-5" />, tint: "bg-[#DC4B4B]/10", color: "text-[#DC4B4B]", value: String(counts.rejected), label: t("adm.rx.kpiRejected") },
    { icon: <Clock className="size-5" />, tint: "bg-[#EAF1F9]", color: "text-[#1E4E8F]", value: lang === "ar" ? "18 د" : "18 min", label: t("adm.rx.kpiAvg") },
  ];

  const filters: { key: "all" | RxStatus; label: string }[] = [
    { key: "all", label: t("adm.rx.filterAll") },
    { key: "new", label: t("adm.rx.new") },
    { key: "approved", label: t("adm.rx.approved") },
    { key: "rejected", label: t("adm.rx.rejected") },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <AdminCard>
        <SectionTitle
          icon={<IconRxClipboard className="size-5 text-[#1E4E8F]" />}
          title={t("adm.rx.queue")}
          action={
            <Badge className="rounded-full border-0 bg-[#EAF1F9] text-[#1E4E8F]">
              {counts.all} {t("adm.items")}
            </Badge>
          }
        />

        <div className="nice-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition ${
                filter === f.key
                  ? "bg-[#1E4E8F] text-white"
                  : "bg-muted text-foreground/70 hover:bg-border"
              }`}
            >
              {f.key === "new" && counts.new > 0 && (
                <span className="grid size-4.5 place-items-center rounded-full bg-[#F09428] text-[9px] font-black text-white">
                  {counts.new}
                </span>
              )}
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {list.map((rx) => (
            <RxCard key={rx.id} rx={rx} onSet={adminSetRx} />
          ))}
          {list.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm font-bold text-muted-foreground">
              {t("adm.rx.empty")}
            </p>
          )}
        </div>
      </AdminCard>
    </div>
  );
}

function RxCard({
  rx,
  onSet,
}: {
  rx: RxRequest;
  onSet: (id: string, status: RxStatus) => void;
}) {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const meta = RX_META[rx.status];
  const isNew = rx.status === "new";

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        isNew ? "border-[#F09428]/40 bg-[#FFF4E5]/40" : "border-border/60 bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* file chip */}
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#EAF1F9] text-[#1E4E8F]">
          <IconRxSheet className="size-6" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading text-sm font-black text-[#1E4E8F]">{rx.id}</span>
            <Badge className={`rounded-full border-0 ${meta.cls}`}>{t(meta.key)}</Badge>
          </div>
          <p className="mt-0.5 truncate text-sm font-bold">
            {lang === "ar" ? rx.customerAr : rx.customerEn}
            <span className="ms-2 text-xs font-bold text-muted-foreground" dir="ltr">
              {rx.phone}
            </span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
            <FileImage className="size-3.5 shrink-0" />
            <span className="truncate" dir="ltr">
              {rx.fileName}
            </span>
            <span className="shrink-0 text-border">•</span>
            <span dir="ltr">{rx.date}</span>
          </p>
          <p className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-xs leading-relaxed text-foreground/80">
            {lang === "ar" ? rx.noteAr : rx.noteEn}
          </p>
        </div>
      </div>

      {/* actions */}
      {isNew ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            className="h-9 flex-1 rounded-full bg-[#2E9E6B] text-xs font-bold hover:bg-[#278a5e]"
            onClick={() => {
              onSet(rx.id, "approved");
              toast.success(t("adm.rx.done"));
            }}
          >
            <BadgeCheck className="size-4" />
            {t("adm.rx.approve")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 flex-1 rounded-full border-[#DC4B4B]/40 text-xs font-bold text-[#DC4B4B] hover:bg-[#DC4B4B]/10 hover:text-[#DC4B4B]"
            onClick={() => {
              onSet(rx.id, "rejected");
              toast.success(t("adm.rx.done"));
            }}
          >
            <Ban className="size-4" />
            {t("adm.rx.reject")}
          </Button>
          <a
            href={`tel:${rx.phone.replace(/\s/g, "")}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-[#1E4E8F] transition hover:bg-[#EAF1F9]"
            aria-label={t("track.call")}
          >
            <Phone className="size-4" />
          </a>
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
          {rx.status === "approved" ? (
            <>
              <BadgeCheck className="size-3.5 text-[#2E9E6B]" />
              {t("adm.rx.approvedHint")}
            </>
          ) : (
            <>
              <XCircle className="size-3.5 text-[#DC4B4B]" />
              {t("adm.rx.rejectedHint")}
            </>
          )}
        </p>
      )}
    </div>
  );
}
