import { FlagImage } from "@/components/FlagDisplay";
import { getCapitalPath, getShapePath } from "@/lib/countries";
import { formatDisplayCode } from "@/lib/scope";
import type { Country } from "@/lib/types";

type LibraryPlaceVisualProps = {
  country: Pick<Country, "code" | "code3" | "name" | "capital" | "hasShape" | "hasFlag" | "hasCapitalImage">;
  variant?: "card" | "hero";
  visual?: "auto" | "shape" | "flag" | "capital";
};

const shapeFilterCard =
  "opacity-80 transition-transform group-hover:scale-105 [filter:brightness(0)_saturate(100%)_invert(30%)_sepia(13%)_saturate(1020%)_hue-rotate(179deg)_brightness(93%)_contrast(90%)] dark:opacity-90 dark:[filter:brightness(0)_invert(1)]";

const shapeFilterHero =
  "[filter:brightness(0)_saturate(100%)_invert(28%)_sepia(15%)_saturate(1120%)_hue-rotate(179deg)_brightness(93%)_contrast(90%)] dark:[filter:brightness(0)_invert(1)]";

export function LibraryPlaceVisual({
  country,
  variant = "card",
  visual = "auto",
}: LibraryPlaceVisualProps) {
  const showCapital = visual === "capital" && country.hasCapitalImage;
  const showShape = !showCapital && (visual === "shape" || (visual === "auto" && country.hasShape));
  const showFlag = !showCapital && !showShape && (visual === "flag" || (visual === "auto" && country.hasFlag));

  if (showCapital) {
    return (
      <div
        className={
          variant === "hero"
            ? "h-full w-full overflow-hidden rounded-2xl"
            : "h-full w-full overflow-hidden rounded-xl"
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getCapitalPath(country.code)}
          alt={variant === "hero" ? `Skyline of ${country.capital}` : ""}
          className={
            variant === "hero"
              ? "h-full w-full rounded-2xl object-cover"
              : "h-full w-full rounded-xl object-cover transition-transform group-hover:scale-105"
          }
        />
      </div>
    );
  }

  if (showShape) {
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

  if (showFlag) {
    const width = variant === "hero" ? 280 : 176;
    return (
      <div
        className={
          variant === "hero"
            ? "flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 via-white to-teal-50 p-6 dark:from-slate-800 dark:via-slate-900 dark:to-teal-950/50"
            : "flex h-full w-full items-center justify-center"
        }
      >
        <FlagImage
          code={country.code}
          alt={variant === "hero" ? `Flag of ${country.name}` : ""}
          width={width}
          frame={variant === "hero" ? "lg" : "md"}
          className={variant === "hero" ? "w-[min(100%,17.5rem)]" : "w-[min(100%,11rem)] transition-transform group-hover:scale-105"}
          priority={variant === "hero"}
        />
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
      {formatDisplayCode(country.code)}
    </span>
  );
}
