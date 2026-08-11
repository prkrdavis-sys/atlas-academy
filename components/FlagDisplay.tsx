"use client";

import { type ReactNode } from "react";
import { getFlagPath } from "@/lib/countries";
import {
  getFlagAspectRatio,
  getFlagClipPath,
  getFlagDisplayProfile,
  getFlagGridObjectFit,
  getFlagGridObjectPosition,
  isShapedFlag,
} from "@/lib/flag-display";
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
  /** Optional display ratio override for layouts that need uniform flag rectangles. */
  displayAspectRatio?: number;
  /** How the flag fills a display box; intrinsic displays default to contain. */
  objectFit?: "contain" | "fill" | "cover";
  /** Anchor point used when objectFit crops the flag. */
  objectPosition?: string;
  priority?: boolean;
  /** CSS color invert for inverted-flag quiz modes. */
  inverted?: boolean;
};

const RECT_FRAME_STYLES: Record<Exclude<FlagFrameVariant, "none">, string> = {
  sm: "overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900",
  md: "overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-800",
  lg: "overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-900",
  pill: "overflow-hidden rounded-sm border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900",
};

const SHAPED_FRAME_STYLES: Record<Exclude<FlagFrameVariant, "none">, string> = {
  sm: "[filter:drop-shadow(0_0_0_1px_rgb(226_232_240))] dark:[filter:drop-shadow(0_0_0_1px_rgb(71_85_105))]",
  md: "[filter:drop-shadow(0_0_0_2px_rgb(226_232_240))_drop-shadow(0_4px_6px_rgb(15_23_42_/_0.08))] dark:[filter:drop-shadow(0_0_0_2px_rgb(71_85_105))]",
  lg: "[filter:drop-shadow(0_0_0_2px_rgb(226_232_240))_drop-shadow(0_8px_16px_rgb(15_23_42_/_0.12))] dark:[filter:drop-shadow(0_0_0_2px_rgb(71_85_105))]",
  pill: "[filter:drop-shadow(0_0_0_1px_rgb(226_232_240))] dark:[filter:drop-shadow(0_0_0_1px_rgb(71_85_105))]",
};

// Quiz tiles use a consistent rectangle; non-rectangular flags keep their silhouette below.
const FLAG_GRID_ASPECT_RATIO = 3 / 2;

type FlagImgProps = {
  code: string;
  alt: string;
  className?: string;
  objectFit?: "contain" | "fill" | "cover";
  objectPosition?: string;
  constrainedAxis?: "width" | "height";
  priority?: boolean;
  clipPath?: string;
  displayAspectRatio?: number;
};

/** Combines optional invert with an existing Tailwind arbitrary filter class. */
function withInvertFilter(baseFilterClass: string | undefined, inverted: boolean) {
  if (!inverted) return baseFilterClass;
  if (!baseFilterClass) return "[filter:invert(1)]";
  return baseFilterClass.replace("[filter:", "[filter:invert(1)_");
}

function FlagImg({
  code,
  alt,
  className,
  objectFit = "contain",
  objectPosition,
  constrainedAxis = "width",
  priority,
  clipPath,
  displayAspectRatio,
}: FlagImgProps) {
  const isHeightConstrained = constrainedAxis === "height";
  const aspectRatio = displayAspectRatio ?? getFlagAspectRatio(code);

  return (
    <span
      className={cn(
        "relative max-w-full",
        isHeightConstrained ? "inline-block" : "block",
        className,
      )}
      style={{ aspectRatio }}
    >
      {/* Local SVG assets are rendered directly so the complete flag remains visible. */}
      {/* Height-constrained: keep the img in-flow. Absolutely positioned children
          make WebKit/Safari collapse width to 0 (hairline frame) even with
          aspect-ratio on the wrapper. Width-constrained: fill the box. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getFlagPath(code)}
        alt={alt}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        className={
          isHeightConstrained
            ? "block h-full w-auto max-w-none"
            : "block h-full w-full max-w-full"
        }
        style={{
          aspectRatio,
          objectFit,
          ...(objectPosition ? { objectPosition } : null),
          ...(clipPath ? { clipPath } : null),
        }}
        {...(priority ? { fetchPriority: "high" as const } : {})}
      />
    </span>
  );
}

function wrapWithFrame(
  image: ReactNode,
  code: string,
  frame: Exclude<FlagFrameVariant, "none">,
  className?: string,
) {
  const shaped = isShapedFlag(code);

  if (shaped) {
    return (
      <span className={cn("inline-block max-w-full leading-none", className)}>
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

/** Renders a complete flag at its true aspect ratio; tile layouts may opt into cropping. */
export function FlagImage({
  code,
  alt,
  frame = "none",
  className,
  constrainedAxis = "width",
  layout = "intrinsic",
  displayAspectRatio,
  objectFit,
  objectPosition,
  priority,
  inverted = false,
}: FlagImageProps) {
  const shaped = isShapedFlag(code);
  const clipPath = getFlagClipPath(code);
  const isHeightConstrained = constrainedAxis === "height";
  const hasFrame = frame !== "none";
  const resolvedObjectFit = objectFit ?? "contain";

  const shapedFrameClass =
    shaped && hasFrame ? SHAPED_FRAME_STYLES[frame] : undefined;
  const flagFilterClass = withInvertFilter(shapedFrameClass, inverted);
  const imgClipPath = shaped ? clipPath : undefined;

  // When framed, keep sizing on the outer frame only. Applying the same width to
  // the inner image makes it as wide as the border-box and paints over the border.
  const imageClassName = cn(
    isHeightConstrained ? "max-w-full" : "h-auto w-full",
    !hasFrame || isHeightConstrained ? className : undefined,
    flagFilterClass,
  );

  const image =
    layout === "tile" ? (
      <span className="relative block h-full w-full">
        <FlagImg
          code={code}
          alt={alt}
          priority={priority}
          constrainedAxis={constrainedAxis}
          clipPath={imgClipPath}
          displayAspectRatio={displayAspectRatio}
          objectFit={resolvedObjectFit}
          objectPosition={objectPosition}
          className={cn("h-full w-full object-contain", flagFilterClass)}
        />
      </span>
    ) : (
      <FlagImg
        code={code}
        alt={alt}
        priority={priority}
        constrainedAxis={constrainedAxis}
        clipPath={imgClipPath}
        displayAspectRatio={displayAspectRatio}
        objectFit={resolvedObjectFit}
        objectPosition={objectPosition}
        className={imageClassName}
      />
    );

  if (!hasFrame) {
    return image;
  }

  // Height-constrained: size stays on the image; frame shrink-wraps around it.
  // Width-constrained: size goes on the frame so the border sits outside the flag.
  const outerClassName = isHeightConstrained ? undefined : className;

  return wrapWithFrame(image, code, frame, outerClassName);
}

function getFlagDisplaySizing(code: string, size: "sm" | "md" | "lg") {
  const profile = getFlagDisplayProfile(code);

  if (profile === "pennant") {
    return {
      constrainedAxis: "height" as const,
      className:
        size === "lg"
          ? "h-[min(20rem,55cqh)]"
          : size === "md"
            ? "h-[min(14rem,38cqh)]"
            : "h-[min(9rem,30cqh)]",
    };
  }

  if (profile === "square") {
    return {
      constrainedAxis: "width" as const,
      className:
        size === "lg"
          ? "w-[min(20rem,55cqh)]"
          : size === "md"
            ? "w-[min(15rem,38cqh)]"
            : "w-[min(8rem,30cqh)]",
    };
  }

  if (profile === "ultra-wide") {
    return {
      constrainedAxis: "width" as const,
      className:
        size === "lg"
          ? "w-[min(32rem,100cqw)]"
          : size === "md"
            ? "w-[min(24rem,100cqw)]"
            : "w-[min(18rem,100cqw)]",
    };
  }

  return {
    constrainedAxis: "width" as const,
    className: size === "lg" ? "w-80" : size === "md" ? "w-60" : "w-[7.5rem]",
  };
}

export function FlagDisplay({
  code,
  size = "lg",
  inverted = false,
}: {
  code: string;
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
}) {
  const width = size === "lg" ? 320 : size === "md" ? 240 : 120;
  const sizing = getFlagDisplaySizing(code, size);
  return (
    <div className="flex justify-center">
      <FlagImage
        code={code}
        alt={inverted ? `Inverted flag of ${code}` : `Flag of ${code}`}
        width={width}
        frame="md"
        constrainedAxis={sizing.constrainedAxis}
        className={sizing.className}
        inverted={inverted}
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
      ? "[filter:drop-shadow(0_0_0_2px_rgb(148_163_184))_drop-shadow(0_2px_0_rgb(148_163_184))] dark:[filter:drop-shadow(0_0_0_2px_rgb(71_85_105))]"
      : "[filter:drop-shadow(0_0_0_2px_rgb(148_163_184))_drop-shadow(0_3px_0_rgb(148_163_184))] dark:[filter:drop-shadow(0_0_0_2px_rgb(71_85_105))] hover:[filter:drop-shadow(0_0_0_2px_rgb(56_189_248))_drop-shadow(0_3px_0_rgb(56_189_248))]";
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
      "overflow-hidden border-2 border-slate-400 bg-white shadow-[0_2px_0_var(--color-slate-400)] dark:border-slate-600 dark:bg-slate-800 dark:shadow-[0_2px_0_var(--color-slate-700)]",
      tileRadius,
    );
  }
  return cn(
    "overflow-hidden border-2 border-slate-400 bg-white shadow-[0_3px_0_var(--color-slate-400)] transition-all duration-100 hover:border-sky-400 active:translate-y-[3px] active:shadow-none dark:border-slate-600 dark:bg-slate-800 dark:shadow-[0_3px_0_var(--color-slate-700)] dark:hover:border-sky-500",
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
  inverted = false,
}: {
  codes: string[];
  onSelect: (code: string) => void;
  compact?: boolean;
  revealed?: boolean;
  selectedCode?: string | null;
  correctCode?: string;
  inverted?: boolean;
}) {
  const flagWidth = revealed ? 120 : compact ? 160 : 200;
  const gridCols = codes.length >= 6 ? "grid-cols-3" : "grid-cols-2";
  const gridMaxWidth =
    codes.length >= 6
      ? "max-w-[min(100cqw,22rem)] md:max-w-[min(100cqw,40rem)] lg:max-w-[min(100cqw,44rem)]"
      : "max-w-[min(100cqw,22rem)] md:max-w-[min(100cqw,34rem)] lg:max-w-[min(100cqw,38rem)]";
  // Leave room for tile borders, row gaps, and the 2px bottom shadow so overflow
  // parents don't clip the bottom edge of the revealed answer grid.
  const revealedGridWidth =
    codes.length >= 6
      ? "w-[min(100cqw,28rem,calc((100cqh-0.75rem)*1.75))]"
      : "w-[min(100cqw,22rem,calc((100cqh-0.5rem)*1.15))]";
  const tileRadius = revealed ? "rounded-lg" : "rounded-xl";

  return (
    <div
      className={cn(
        "flex h-full w-full min-h-0 items-center justify-center",
        revealed ? "[container-type:size] pb-0.5" : "md:py-4",
      )}
    >
      <div
        className={cn(
          "grid items-start",
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
          const objectFit = getFlagGridObjectFit(code, FLAG_GRID_ASPECT_RATIO);
          const cropsRightEdge =
            objectFit === "cover" && getFlagAspectRatio(code) > FLAG_GRID_ASPECT_RATIO;
          const tileClassName = cn(
            "relative flex aspect-[3/2] h-auto w-full shrink-0 items-center justify-center leading-none",
            getTileBorderClass(shaped, tileRadius, isCorrect, isIncorrect, revealed),
          );

          const flag = shaped ? (
            <div className="flex h-full w-full items-center justify-center">
              <FlagImage
                code={code}
                alt={inverted ? `Inverted flag option ${code}` : `Flag option ${code}`}
                width={flagWidth}
                constrainedAxis="height"
                className="h-full w-auto"
                inverted={inverted}
              />
            </div>
          ) : (
            <FlagImage
              code={code}
              alt={inverted ? `Inverted flag option ${code}` : `Flag option ${code}`}
              width={flagWidth}
              displayAspectRatio={FLAG_GRID_ASPECT_RATIO}
              className="h-full w-full"
              objectFit={objectFit}
              objectPosition={cropsRightEdge ? getFlagGridObjectPosition(code) : undefined}
              inverted={inverted}
            />
          );

          return revealed ? (
            <div key={code} className={tileClassName} aria-hidden>
              {flag}
            </div>
          ) : (
            <button
              key={code}
              type="button"
              onClick={() => onSelect(code)}
              className={tileClassName}
            >
              {flag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
