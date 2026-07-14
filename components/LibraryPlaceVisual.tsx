import Image from "next/image";
import { getFlagPath, getShapePath } from "@/lib/countries";
import type { Country } from "@/lib/types";

type LibraryPlaceVisualProps = {
  country: Pick<Country, "code" | "code3" | "name" | "hasShape" | "hasFlag">;
  variant?: "card" | "hero";
};

const shapeFilterCard =
  "opacity-80 transition-transform group-hover:scale-105 [filter:brightness(0)_saturate(100%)_invert(30%)_sepia(13%)_saturate(1020%)_hue-rotate(179deg)_brightness(93%)_contrast(90%)] dark:opacity-90 dark:[filter:brightness(0)_invert(1)]";

const shapeFilterHero =
  "[filter:brightness(0)_saturate(100%)_invert(28%)_sepia(15%)_saturate(1120%)_hue-rotate(179deg)_brightness(93%)_contrast(90%)] dark:[filter:brightness(0)_invert(1)]";

export function LibraryPlaceVisual({ country, variant = "card" }: LibraryPlaceVisualProps) {
  if (country.hasShape) {
    return (
      // Silhouettes are local SVG documents with their own intrinsic viewBox.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getShapePath(country.code3)}
        alt={variant === "hero" ? `Outline of ${country.name}` : ""}
        className={
          variant === "hero"
            ? `max-h-64 w-full object-contain ${shapeFilterHero}`
            : `max-h-24 w-full object-contain sm:max-h-28 ${shapeFilterCard}`
        }
      />
    );
  }

  if (country.hasFlag) {
    const dimensions = variant === "hero" ? { w: 280, h: 210 } : { w: 176, h: 132 };
    return (
      <div
        className={
          variant === "hero"
            ? "flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 via-white to-teal-50 p-6 dark:from-slate-800 dark:via-slate-900 dark:to-teal-950/50"
            : "flex h-full w-full items-center justify-center"
        }
      >
        <span
          className={
            variant === "hero"
              ? "overflow-hidden rounded-2xl border-2 border-white/90 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-900"
              : "overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-md transition-transform group-hover:scale-105 dark:border-slate-600 dark:bg-slate-900"
          }
        >
          <Image
            src={getFlagPath(country.code)}
            alt={variant === "hero" ? `Flag of ${country.name}` : ""}
            width={dimensions.w}
            height={dimensions.h}
            className="h-auto w-full object-contain"
            priority={variant === "hero"}
          />
        </span>
      </div>
    );
  }

  return (
    <span
      className={
        variant === "hero"
          ? "font-display text-5xl font-extrabold text-slate-300 dark:text-slate-600"
          : "font-display text-3xl font-extrabold text-slate-300 dark:text-slate-600"
      }
      aria-hidden
    >
      {country.code}
    </span>
  );
}
