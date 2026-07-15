"use client";

import Image from "next/image";
import { getFlagPath } from "@/lib/countries";
import { cn } from "@/lib/utils";

export type FlagFrameVariant = "none" | "sm" | "md" | "lg" | "pill";

type FlagImageProps = {
  code: string;
  alt: string;
  /** Intrinsic width hint for Next.js; actual display width comes from className. */
  width: number;
  frame?: FlagFrameVariant;
  className?: string;
  /** Which axis is set via className — the other is set to auto for correct aspect ratio. */
  constrainedAxis?: "width" | "height";
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
  priority,
}: FlagImageProps) {
  const image = (
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
}: {
  codes: string[];
  onSelect: (code: string) => void;
  compact?: boolean;
}) {
  const flagWidth = compact ? 160 : 200;
  return (
    <div className="flex h-full w-full min-h-0 items-center justify-center">
      <div
        className={`grid w-full max-w-[min(100cqw,22rem)] grid-cols-2 items-start ${compact ? "gap-2" : "gap-3"}`}
      >
        {codes.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => onSelect(code)}
            className="block overflow-hidden rounded-xl border-2 border-slate-200 bg-white p-0 leading-none shadow-[0_3px_0_var(--color-slate-200)] transition-all duration-100 hover:border-sky-300 active:translate-y-[3px] active:shadow-none dark:border-slate-600 dark:bg-slate-800 dark:shadow-[0_3px_0_var(--color-slate-700)] dark:hover:border-sky-500"
          >
            <FlagImage
              code={code}
              alt={`Flag option ${code}`}
              width={flagWidth}
              className="w-full"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
