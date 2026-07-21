"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DailyCalendarIcon } from "@/components/DailyCalendarIcon";
import { cn } from "@/lib/utils";

function parsePreviewDate(value: string | null): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 17));
}

function BareIconPreviewInner() {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") === "solid" ? "solid" : "watermark";
  const date = parsePreviewDate(searchParams.get("date"));
  const isSolid = variant === "solid";

  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center p-10",
        isSolid ? "bg-slate-100 dark:bg-slate-950" : "bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-700",
      )}
    >
      <div className={cn("w-44 sm:w-52", !isSolid && "text-white opacity-[0.18]")}>
        <DailyCalendarIcon variant={variant} date={date} />
      </div>
    </div>
  );
}

export default function BareDailyCalendarIconPage() {
  return (
    <Suspense>
      <BareIconPreviewInner />
    </Suspense>
  );
}
