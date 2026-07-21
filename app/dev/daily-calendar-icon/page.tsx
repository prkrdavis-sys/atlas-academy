"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { DailyCalendarIcon } from "@/components/DailyCalendarIcon";
import { cn } from "@/lib/utils";

function parsePreviewDate(value: string | null): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 17));
}

function DailyCalendarIconPreviewInner() {
  const searchParams = useSearchParams();
  const date = parsePreviewDate(searchParams.get("date"));
  const dateQuery = searchParams.get("date") ? `&date=${searchParams.get("date")}` : "";

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-6 sm:p-10">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Daily calendar icon preview
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Bare previews for the dynamic daily challenge calendar icon.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PreviewPanel
          title="Solid"
          subtitle="Full-color icon on a neutral surface"
          href={`/dev/daily-calendar-icon/bare?variant=solid${dateQuery}`}
          className="bg-slate-100 dark:bg-slate-950"
        >
          <div className="mx-auto w-40">
            <DailyCalendarIcon variant="solid" date={date} />
          </div>
        </PreviewPanel>

        <PreviewPanel
          title="Watermark"
          subtitle="Hero-card treatment on the daily gradient"
          href={`/dev/daily-calendar-icon/bare?variant=watermark${dateQuery}`}
          className="bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-700"
        >
          <div className="mx-auto w-40 text-white opacity-[0.18]">
            <DailyCalendarIcon variant="watermark" date={date} />
          </div>
        </PreviewPanel>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-display text-lg font-extrabold text-slate-900 dark:text-slate-100">
          Direct links
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <li>
            <a className="font-semibold text-teal-700 hover:underline dark:text-teal-400" href="/dev/daily-calendar-icon/bare?variant=solid">
              /dev/daily-calendar-icon/bare?variant=solid
            </a>
          </li>
          <li>
            <a className="font-semibold text-teal-700 hover:underline dark:text-teal-400" href="/dev/daily-calendar-icon/bare?variant=watermark">
              /dev/daily-calendar-icon/bare?variant=watermark
            </a>
          </li>
          <li>
            <a className="font-semibold text-teal-700 hover:underline dark:text-teal-400" href="/dev/daily-calendar-icon/bare?variant=solid&date=2026-12-25">
              /dev/daily-calendar-icon/bare?variant=solid&amp;date=2026-12-25
            </a>
          </li>
          <li>
            <a className="font-semibold text-teal-700 hover:underline dark:text-teal-400" href="/dev/daily-calendar-icon/bare?variant=watermark&date=2026-01-03">
              /dev/daily-calendar-icon/bare?variant=watermark&amp;date=2026-01-03
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

type PreviewPanelProps = {
  title: string;
  subtitle: string;
  href: string;
  className?: string;
  children: ReactNode;
};

function PreviewPanel({ title, subtitle, href, className, children }: PreviewPanelProps) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 dark:border-slate-700">
      <div className="border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-display text-base font-extrabold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        <a href={href} className="mt-2 inline-block text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400">
          Open bare view
        </a>
      </div>
      <div className={cn("flex min-h-56 items-center justify-center p-10", className)}>{children}</div>
    </section>
  );
}

export default function DailyCalendarIconPreviewPage() {
  return (
    <Suspense>
      <DailyCalendarIconPreviewInner />
    </Suspense>
  );
}
