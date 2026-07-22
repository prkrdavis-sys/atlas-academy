import { FlagImage } from "@/components/FlagDisplay";
import {
  formatPopulation,
  getCountryByCode,
  getShapePath,
} from "@/lib/countries";

export function NeighborCountryDisplay({ code }: { code: string }) {
  const country = getCountryByCode(code);
  if (!country) return null;

  return (
    <section
      aria-label={`Clues about ${country.name}`}
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

      <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
        <div className="w-full min-w-0 shrink-0 overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-800">
          <FlagImage
            code={country.code}
            alt={`Flag of ${country.name}`}
            width={160}
            frame="none"
            fit="cover"
            priority
          />
        </div>

        <dl className="grid gap-3">
          <div>
            <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700/70">
              Capital
            </dt>
            <dd className="mt-0.5 font-display text-lg font-extrabold leading-tight text-slate-800 dark:text-slate-200 sm:text-2xl">
              {country.capital || "No official capital"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700/70">
              Population
            </dt>
            <dd className="mt-0.5 font-display text-lg font-extrabold leading-tight tabular-nums text-slate-800 sm:text-2xl">
              {formatPopulation(country.population)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
