import { FlagImage } from "@/components/FlagDisplay";
import { getCountryByCode, getShapePath } from "@/lib/countries";

export function NeighborCountryDisplay({ code }: { code: string }) {
  const country = getCountryByCode(code);
  if (!country) return null;

  return (
    <section
      aria-label={`Shape and flag of ${country.name}`}
      className="mx-auto grid h-full min-h-0 w-full max-w-2xl grid-cols-[minmax(0,1.2fr)_minmax(8rem,0.8fr)] items-center gap-4 px-2 py-2 sm:gap-8 sm:px-6"
    >
      <div className="flex min-h-0 items-center justify-center">
        {country.hasShape && (
          // Country silhouettes are local SVG documents, so a native image preserves their intrinsic viewBox.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getShapePath(country.code3)}
            alt={`Outline of ${country.name}`}
            className="max-h-[min(30dvh,15rem)] w-full object-contain [filter:brightness(0)_saturate(100%)_invert(17%)_sepia(13%)_saturate(1146%)_hue-rotate(179deg)_brightness(93%)_contrast(91%)] dark:[filter:brightness(0)_invert(1)]"
          />
        )}
      </div>

      <div className="flex min-w-0 items-center justify-center">
        <FlagImage
          code={country.code}
          alt={`Flag of ${country.name}`}
          width={160}
          frame="md"
          className="w-full"
          priority
        />
      </div>
    </section>
  );
}
