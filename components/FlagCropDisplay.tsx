"use client";

import { getFlagPath } from "@/lib/countries";
import { FLAG_CROP_DISPLAY_ASPECT_RATIO, getFlagCropStyle } from "@/lib/flag-crop";

export function FlagCropDisplay({ code }: { code: string }) {
  const cropStyle = getFlagCropStyle(code);

  return (
    <div className="flex w-full justify-center px-1 sm:px-5">
      <div
        role="img"
        aria-label="A close-up fragment of the mystery flag"
        className="relative w-full max-w-[34rem] overflow-hidden rounded-2xl border-2 border-slate-300 bg-slate-100 shadow-[0_14px_38px_rgb(15_23_42_/_0.18)] dark:border-slate-600 dark:bg-slate-800 dark:shadow-[0_18px_44px_rgb(0_0_0_/_0.38)]"
        style={{ aspectRatio: FLAG_CROP_DISPLAY_ASPECT_RATIO }}
      >
        <div
          className="absolute inset-0 bg-no-repeat"
          style={{
            backgroundImage: `url("${getFlagPath(code)}")`,
            ...cropStyle,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.22),inset_0_0_42px_rgb(15_23_42_/_0.12)]"
        />
      </div>
    </div>
  );
}
