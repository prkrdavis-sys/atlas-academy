"use client";

import { type ReactNode } from "react";
import { getFlagPath } from "@/lib/countries";
import { getFlagAspectRatio, getFlagClipPath, isShapedFlag } from "@/lib/flag-display";
import { cn } from "@/lib/utils";

export type FlagFrameVariant = "none" | "sm" | "md" | "lg" | "pill";

type FlagLayout = "intrinsic" | "tile";

type FlagImageProps = {
  code: string;
  alt: string;
  /** Intrinsic width hint; actual display size comes from className. */
  width: number;
  frame?: FlagFrameVariant;
  className?: string;
  /** Which axis is set via className — the other stays auto for correct aspect ratio. */
  constrainedAxis?: "width" | "height";
  /** Tile fills container width using the flag's true aspect ratio. */
  layout?: FlagLayout;
  priority?: boolean;
};

const RECT_FRAME_STYLES: Record<Exclude<FlagFrameVariant, "none">, string> = {
  sm: "rounded-md border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900",
  md: "rounded-xl border-2 border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-800",
  lg: "rounded-2xl border-2 border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-900",
  pill: "rounded-sm border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900",
};

const SHAPED_FRAME_STYLES: Record<Exclude<FlagFrameVariant, "none">, string> = {
  sm: "[filter:drop-shadow(0_0_0_1px_rgb(226_232_240))] dark:[filter:drop-shadow(0_0_0_1px_rgb(71_85_105))]",
  md: "[filter:drop-shadow(0_0_0_2px_rgb(226_232_240))_drop-shadow(0_4px_6px_rgb(15_23_42_/_0.08))] dark:[filter:drop-shadow(0_0_0_2px_rgb(71_85_105))]",
  lg: "[filter:drop-shadow(0_0_0_2px_rgb(226_232_240))_drop-shadow(0_8px_16px_rgb(15_23_42_/_0.12))] dark:[filter:drop-shadow(0_0_0_2px_rgb(71_85_105))]",
  pill: "[filter:drop-shadow(0_0_0_1px_rgb(226_232_240))] dark:[filter:drop-shadow(0_0_0_1px_rgb(71_85_105))]",
};

type FlagImgProps = {
  code: string;
  alt: string;
  className?: string;
  constrainedAxis?: "width" | "height";
  priority?: boolean;
};

function FlagImg({ code, alt, className, constrainedAxis = "width", priority }: FlagImgProps) {
  return (
    // Local SVG assets keep their intrinsic viewBox when rendered as a native image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getFlagPath(code)}
      alt={alt}
      decoding="async"
      className={cn("block max-w-full", className)}
      style={constrainedAxis === "width" ? { height: "auto" } : { width: "auto" }}
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}

function wrapWithFrame(
  image: ReactNode,
  code: string,
  frame: Exclude<FlagFrameVariant, "none">,
  className?: string,
) {
  const shaped = isShapedFlag(code);
  const clipPath = getFlagClipPath(code);

  if (shaped && clipPath) {
    return (
      <span
        className={cn("inline-block max-w-full leading-none", SHAPED_FRAME_STYLES[frame], className)}
        style={{ clipPath }}
      >
        {image}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-block max-w-full leading-none",
        RECT_FRAME_STYLES[frame],
        className,
      )}
    >
      {image}
    </span>
  );
}

/** Renders a flag at its SVG aspect ratio without cropping or letterboxing. */
export function FlagImage({
  code,
  alt,
  frame = "none",
  className,
  constrainedAxis = "width",
  layout = "intrinsic",
  priority,
}: FlagImageProps) {
  const shaped = isShapedFlag(code);
  const clipPath = getFlagClipPath(code);
  const isHeightConstrained = constrainedAxis === "height";

  const image =
    layout === "tile" ? (
      <span className="relative block h-full w-full">
        <FlagImg
          code={code}
          alt={alt}
          priority={priority}
          className="h-full w-full object-contain"
          constrainedAxis="width"
        />
      </span>
    ) : (
      <FlagImg
        code={code}
        alt={alt}
        priority={priority}
        className={isHeightConstrained ? cn("block", className) : "h-auto w-full"}
        constrainedAxis={constrainedAxis}
      />
    );

  const outerClassName = isHeightConstrained ? undefined : className;

  if (frame === "none") {
    if (layout === "intrinsic" && shaped && clipPath) {
      return (
        <span
          className={cn("inline-block max-w-full leading-none", outerClassName)}
          style={{ clipPath }}
        >
          {image}
        </span>
      );
    }
    if (layout === "intrinsic" && !isHeightConstrained) {
      return (
        <span className={cn("inline-block max-w-full leading-none", outerClassName)}>{image}</span>
      );
    }
    return image;
  }

  return wrapWithFrame(image, code, frame, outerClassName);
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

function getTileBorderClass(
  shaped: boolean,
  tileRadius: string,
  isCorrect: boolean,
  isIncorrect: boolean,
  revealed: boolean,
) {
  if (shaped) {
    if (isCorrect) {
      return "[filter:drop-shadow(0_0_0_2px_rgb(52_211_153))_drop-shadow(0_2px_0_rgb(110_231_183))] dark:[filter:drop-shadow(0_0_0_2px_rgb(16_185_129))]";
    }
    if (isIncorrect) {
      return "[filter:drop-shadow(0_0_0_2px_rgb(251_113_133))_drop-shadow(0_2px_0_rgb(253_164_175))] dark:[filter:drop-shadow(0_0_0_2px_rgb(244_63_94))]";
    }
    return revealed
      ? "[filter:drop-shadow(0_0_0_2px_rgb(226_232_240))_drop-shadow(0_2px_0_rgb(226_232_240))] dark:[filter:drop-shadow(0_0_0_2px_rgb(71_85_105))]"
      : "[filter:drop-shadow(0_0_0_2px_rgb(226_232_240))_drop-shadow(0_3px_0_rgb(226_232_240))] dark:[filter:drop-shadow(0_0_0_2px_rgb(71_85_105))] hover:[filter:drop-shadow(0_0_0_2px_rgb(125_211_252))_drop-shadow(0_3px_0_rgb(125_211_252))]";
  }

  if (isCorrect) {
    return cn(
      "overflow-hidden border-2 border-emerald-400 bg-emerald-50 shadow-[0_2px_0_var(--color-emerald-300)] ring-2 ring-inset ring-emerald-300 dark:border-emerald-500 dark:bg-emerald-950/50 dark:shadow-[0_2px_0_var(--color-emerald-800)] dark:ring-emerald-700",
      tileRadius,
    );
  }
  if (isIncorrect) {
    return cn(
      "overflow-hidden border-2 border-rose-400 bg-rose-50 shadow-[0_2px_0_var(--color-rose-300)] ring-2 ring-inset ring-rose-300 dark:border-rose-500 dark:bg-rose-950/50 dark:shadow-[0_2px_0_var(--color-rose-800)] dark:ring-rose-700",
      tileRadius,
    );
  }
  if (revealed) {
    return cn(
      "overflow-hidden border-2 border-slate-200 bg-white shadow-[0_2px_0_var(--color-slate-200)] dark:border-slate-600 dark:bg-slate-800 dark:shadow-[0_2px_0_var(--color-slate-700)]",
      tileRadius,
    );
  }
  return cn(
    "overflow-hidden border-2 border-slate-200 bg-white shadow-[0_3px_0_var(--color-slate-200)] transition-all duration-100 hover:border-sky-300 active:translate-y-[3px] active:shadow-none dark:border-slate-600 dark:bg-slate-800 dark:shadow-[0_3px_0_var(--color-slate-700)] dark:hover:border-sky-500",
    tileRadius,
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
  const flagWidth = revealed ? 120 : compact ? 160 : 200;
  const gridCols = codes.length >= 6 ? "grid-cols-3" : "grid-cols-2";
  const gridMaxWidth =
    codes.length >= 6
      ? "max-w-[min(100cqw,22rem)] md:max-w-[min(100cqw,40rem)] lg:max-w-[min(100cqw,44rem)]"
      : "max-w-[min(100cqw,22rem)] md:max-w-[min(100cqw,34rem)] lg:max-w-[min(100cqw,38rem)]";
  const revealedGridWidth =
    codes.length >= 6
      ? "w-[min(100cqw,28rem,calc(100cqh*2.05))]"
      : "w-[min(100cqw,22rem,calc(100cqh*1.35))]";
  const tileRadius = revealed ? "rounded-lg" : "rounded-xl";

  return (
    <div
      className={cn(
        "flex h-full w-full min-h-0 items-center justify-center",
        revealed ? "[container-type:size]" : "md:py-4",
      )}
    >
      <div
        className={cn(
          "grid",
          gridCols,
          revealed
            ? cn("max-h-full gap-1.5 md:gap-2", revealedGridWidth)
            : cn("w-full", gridMaxWidth, compact ? "gap-2 md:gap-4" : "gap-3 md:gap-5"),
        )}
      >
        {codes.map((code) => {
          const isCorrect = revealed && correctCode === code;
          const isIncorrect = revealed && selectedCode === code && correctCode !== code;
          const shaped = isShapedFlag(code);
          const aspectRatio = getFlagAspectRatio(code);
          const clipPath = getFlagClipPath(code);
          const tileClassName = cn(
            "block w-full leading-none",
            getTileBorderClass(shaped, tileRadius, isCorrect, isIncorrect, revealed),
          );
          const tileStyle = {
            aspectRatio,
            ...(shaped && clipPath ? { clipPath } : null),
          };

          const flag = (
            <FlagImage
              code={code}
              alt={`Flag option ${code}`}
              width={flagWidth}
              layout="tile"
            />
          );

          return revealed ? (
            <div key={code} className={tileClassName} style={tileStyle} aria-hidden>
              {flag}
            </div>
          ) : (
            <button
              key={code}
              type="button"
              onClick={() => onSelect(code)}
              className={tileClassName}
              style={tileStyle}
            >
              {flag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
