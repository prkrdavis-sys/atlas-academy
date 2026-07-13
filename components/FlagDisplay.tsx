"use client";

import Image from "next/image";
import { getFlagPath } from "@/lib/countries";

export function FlagDisplay({ code, size = "lg" }: { code: string; size?: "sm" | "md" | "lg" }) {
  // All flag assets share a 4:3 viewBox, so keep the box 4:3 to avoid cropping.
  const dimensions =
    size === "lg" ? { w: 320, h: 240 } : size === "md" ? { w: 240, h: 180 } : { w: 120, h: 90 };
  return (
    <div className="flex justify-center">
      <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-800">
        <Image
          src={getFlagPath(code)}
          alt={`Flag of ${code}`}
          width={dimensions.w}
          height={dimensions.h}
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}

export function FlagGrid({
  codes,
  onSelect,
  compact = false,
}: {
  codes: string[];
  onSelect: (code: string) => void;
  compact?: boolean;
}) {
  const flagSize = compact ? { w: 160, h: 120 } : { w: 200, h: 150 };
  return (
    <div className="flex h-full w-full min-h-0 items-center justify-center">
      <div
        className={`grid w-[min(100cqw,calc(100cqh*4/3))] grid-cols-2 ${compact ? "gap-2" : "gap-3"}`}
      >
        {codes.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => onSelect(code)}
            className="aspect-[4/3] overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-[0_3px_0_var(--color-slate-200)] transition-all duration-100 hover:border-sky-300 active:translate-y-[3px] active:shadow-none dark:border-slate-600 dark:bg-slate-800 dark:shadow-[0_3px_0_var(--color-slate-700)] dark:hover:border-sky-500"
          >
            <Image
              src={getFlagPath(code)}
              alt={`Flag option ${code}`}
              width={flagSize.w}
              height={flagSize.h}
              className="h-full w-full object-contain"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
