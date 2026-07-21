"use client";

import Image from "next/image";
import { getFlagPath } from "@/lib/countries";
import { cn } from "@/lib/utils";

export type FlagFrameVariant = "none" | "sm" | "md" | "lg" | "pill";

type FlagFit = "intrinsic" | "cover";

type FlagImageProps = {
  code: string;
  alt: string;
  /** Intrinsic width hint for Next.js; actual display width comes from className. */
  width: number;
  frame?: FlagFrameVariant;
  className?: string;
  /** Which axis is set via className — the other is set to auto for correct aspect ratio. */
  constrainedAxis?: "width" | "height";
  /** Cover fills a uniform 3:2 frame — use in grids so mixed SVG ratios stay consistent. */
  fit?: FlagFit;
  priority?: boolean;
};

const FRAME_STYLES: Record<Exclude<FlagFrameVariant, "none">, string> = {
  sm: "overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900",
  md: "overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-800",
  lg: "overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-900",
  pill: "overflow-hidden rounded-sm border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900",
};

/** Renders a flag at its SVG intrinsic aspect ratio with no letterboxing. */
export function FlagImage({
  code,
  alt,
  width,
  frame = "none",
  className,
  constrainedAxis = "width",
  fit = "intrinsic",
  priority,
}: FlagImageProps) {
  const image =
    fit === "cover" ? (
      <span className={cn("relative block aspect-[3/2] w-full overflow-hidden", className)}>
        <Image
          src={getFlagPath(code)}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 45vw, (max-width: 1024px) 22vw, 18rem"
          priority={priority}
        />
      </span>
    ) : (
      <Image
        src={getFlagPath(code)}
        alt={alt}
        width={width}
        height={Math.round(width * 0.75)}
        className={cn("block max-w-full", className)}
        style={constrainedAxis === "width" ? { height: "auto" } : { width: "auto" }}
        priority={priority}
      />
    );

  if (frame === "none") {
    return image;
  }

  return <span className={cn("inline-block leading-none", FRAME_STYLES[frame])}>{image}</span>;
}

export function FlagDisplay({ code, size = "lg" }: { code: string; size?: "sm" | "md" | "lg" }) {
  const width = size === "lg" ? 320 : size === "md" ? 240 : 120;
  return (
    <div className="flex justify-center">
      <FlagImage
        code={code}
        alt={`Flag of ${code}`}
        width={width}
        frame="md"
        className={size === "lg" ? "w-80" : size === "md" ? "w-60" : "w-[7.5rem]"}
        priority
      />
    </div>
  );
}

export function FlagGrid({
  codes,
  onSelect,
  compact = false,
  revealed = false,
  selectedCode = null,
  correctCode,
}: {
  codes: string[];
  onSelect: (code: string) => void;
  compact?: boolean;
  revealed?: boolean;
  selectedCode?: string | null;
  correctCode?: string;
}) {
  const flagWidth = compact ? 160 : 200;
  const gridCols = codes.length >= 6 ? "grid-cols-3" : "grid-cols-2";
  const gridMaxWidth =
    codes.length >= 6
      ? "max-w-[min(100cqw,22rem)] md:max-w-[min(100cqw,40rem)] lg:max-w-[min(100cqw,44rem)]"
      : "max-w-[min(100cqw,22rem)] md:max-w-[min(100cqw,34rem)] lg:max-w-[min(100cqw,38rem)]";
  return (
    <div className="flex h-full w-full min-h-0 items-center justify-center md:py-4">
      <div
        className={cn(
          "grid w-full",
          gridMaxWidth,
          gridCols,
          compact ? "gap-2 md:gap-4" : "gap-3 md:gap-5",
        )}
      >
        {codes.map((code) => {
          const isCorrect = revealed && correctCode === code;
          const isIncorrect = revealed && selectedCode === code && correctCode !== code;

          return (
            revealed ? (
              <div
                key={code}
                className={cn(
                  "block w-full overflow-hidden rounded-xl border-2 bg-white p-0 leading-none shadow-[0_3px_0_var(--color-slate-200)] dark:bg-slate-800 dark:shadow-[0_3px_0_var(--color-slate-700)]",
                  isCorrect
                    ? "border-emerald-400 bg-emerald-50 shadow-[0_3px_0_var(--color-emerald-300)] ring-2 ring-inset ring-emerald-300 dark:border-emerald-500 dark:bg-emerald-950/50 dark:shadow-[0_3px_0_var(--color-emerald-800)] dark:ring-emerald-700"
                    : isIncorrect
                      ? "border-rose-400 bg-rose-50 shadow-[0_3px_0_var(--color-rose-300)] ring-2 ring-inset ring-rose-300 dark:border-rose-500 dark:bg-rose-950/50 dark:shadow-[0_3px_0_var(--color-rose-800)] dark:ring-rose-700"
                      : "border-slate-200 dark:border-slate-600",
                )}
                aria-hidden
              >
                <FlagImage
                  code={code}
                  alt={`Flag option ${code}`}
                  width={flagWidth}
                  fit="cover"
                />
              </div>
            ) : (
              <button
                key={code}
                type="button"
                onClick={() => onSelect(code)}
                className="block w-full overflow-hidden rounded-xl border-2 border-slate-200 bg-white p-0 leading-none shadow-[0_3px_0_var(--color-slate-200)] transition-all duration-100 hover:border-sky-300 active:translate-y-[3px] active:shadow-none dark:border-slate-600 dark:bg-slate-800 dark:shadow-[0_3px_0_var(--color-slate-700)] dark:hover:border-sky-500"
              >
                <FlagImage
                  code={code}
                  alt={`Flag option ${code}`}
                  width={flagWidth}
                  fit="cover"
                />
              </button>
            )
          );
        })}
      </div>
    </div>
  );
}
