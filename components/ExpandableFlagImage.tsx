"use client";

import { useCallback, useState } from "react";
import { FlagImage, type FlagFrameVariant } from "@/components/FlagDisplay";
import { FlagLightbox } from "@/components/FlagLightbox";
import { cn } from "@/lib/utils";

type ExpandableFlagImageProps = {
  code: string;
  countryName: string;
  alt: string;
  width: number;
  frame?: FlagFrameVariant;
  className?: string;
  constrainedAxis?: "width" | "height";
  priority?: boolean;
};

export function ExpandableFlagImage({
  code,
  countryName,
  alt,
  width,
  frame = "none",
  className,
  constrainedAxis = "width",
  priority,
}: ExpandableFlagImageProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View full-size flag of ${countryName}`}
        className={cn(
          "cursor-zoom-in rounded-[inherit] transition-transform hover:scale-[1.02] active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900",
        )}
      >
        <FlagImage
          code={code}
          alt={alt}
          width={width}
          frame={frame}
          className={className}
          constrainedAxis={constrainedAxis}
          priority={priority}
        />
      </button>
      <FlagLightbox open={open} onClose={close} code={code} countryName={countryName} />
    </>
  );
}
