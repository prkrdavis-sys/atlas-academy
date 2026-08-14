"use client";

import { FlagNameBlurLayer } from "@/components/FlagNameBlur";
import { getFlagPath } from "@/lib/countries";
import { FLAG_CROP_DISPLAY_ASPECT_RATIO, getFlagCropStyle } from "@/lib/flag-crop";
import { getCropFlagNameRegions } from "@/lib/flag-name-regions";
import type { FlagCropOrientation } from "@/lib/types";
import { cn } from "@/lib/utils";

const ORIENTATION_CLASSES: Record<FlagCropOrientation, string> = {
  upright: "",
  "upside-down": "rotate-180",
  mirrored: "-scale-x-100",
  "mirrored-upside-down": "-scale-y-100",
};

export function FlagCropDisplay({
  code,
  orientation = "upright",
  inverted = false,
}: {
  code: string;
  orientation?: FlagCropOrientation;
  /** CSS color invert for the inverted flag-crop quiz mode. */
  inverted?: boolean;
}) {
  const cropStyle = getFlagCropStyle(code);
  const flagSrc = getFlagPath(code);
  const nameRegions = getCropFlagNameRegions(code);

  return (
    <div className="flex w-full justify-center px-1 sm:px-5">
      <div
        role="img"
        aria-label={
          inverted
            ? "A close-up fragment of the mystery inverted flag"
            : "A close-up fragment of the mystery flag"
        }
        className="relative w-full max-w-[34rem] overflow-hidden rounded-2xl border-2 border-slate-300 bg-slate-100 shadow-[0_14px_38px_rgb(15_23_42_/_0.18)] dark:border-slate-600 dark:bg-slate-800 dark:shadow-[0_18px_44px_rgb(0_0_0_/_0.38)]"
        style={{ aspectRatio: FLAG_CROP_DISPLAY_ASPECT_RATIO }}
      >
        <div
          className={cn(
            "absolute inset-0 bg-no-repeat transform-gpu",
            ORIENTATION_CLASSES[orientation],
            inverted && "[filter:invert(1)]",
          )}
          style={{
            backgroundImage: `url("${flagSrc}")`,
            ...cropStyle,
          }}
        >
          <FlagNameBlurLayer
            regions={nameRegions}
            paint={(offsetStyle) => (
              <span
                className="block bg-no-repeat"
                style={{
                  ...offsetStyle,
                  backgroundImage: `url("${flagSrc}")`,
                  ...cropStyle,
                }}
              />
            )}
          />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.22),inset_0_0_42px_rgb(15_23_42_/_0.12)]"
        />
      </div>
    </div>
  );
}
