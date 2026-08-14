"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { FlagImage } from "@/components/FlagDisplay";
import { getCountryByCode } from "@/lib/countries";
import { getFlagLore, type FlagLore } from "@/lib/flag-lore";
import { GLASS_INSET_CLASS } from "@/lib/glass";
import { isStateCode } from "@/lib/scope";
import { cn } from "@/lib/utils";

type FlagLightboxProps = {
  open: boolean;
  onClose: () => void;
  code: string;
  countryName: string;
};

function LoreSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
        {title}
      </h3>
      {children}
    </section>
  );
}

function FlagLoreArticle({
  lore,
  capital,
  isState,
}: {
  lore: FlagLore;
  capital: string;
  isState: boolean;
}) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap gap-2">
        {lore.adopted ? (
          <p className={`${GLASS_INSET_CLASS} rounded-full px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300`}>
            Adopted {lore.adopted}
          </p>
        ) : null}
        {capital ? (
          <p className={`${GLASS_INSET_CLASS} rounded-full px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300`}>
            {isState ? "State capital" : "Capital"}: {capital}
          </p>
        ) : null}
      </div>

      <LoreSection title="Meaning">
        <p
          id="flag-lightbox-meaning"
          className={`${GLASS_INSET_CLASS} rounded-2xl p-4 text-sm font-semibold leading-relaxed text-teal-900 dark:text-teal-200`}
        >
          {lore.meaning}
        </p>
      </LoreSection>

      <LoreSection title="Design">
        <p className="text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
          {lore.design}
        </p>
      </LoreSection>

      {lore.colors.length > 0 ? (
        <LoreSection title="Colors">
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {lore.colors.map((color) => (
              <div key={color.name} className={`${GLASS_INSET_CLASS} rounded-2xl p-4`}>
                <dt className="text-xs font-bold text-slate-500 dark:text-slate-400">{color.name}</dt>
                <dd className="mt-1 text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">
                  {color.meaning}
                </dd>
              </div>
            ))}
          </dl>
        </LoreSection>
      ) : null}

      {lore.emblem ? (
        <LoreSection title="Emblem">
          <p className="text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
            {lore.emblem}
          </p>
        </LoreSection>
      ) : null}

      {lore.coatOfArms ? (
        <LoreSection title="Coat of arms">
          <p className="text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
            {lore.coatOfArms}
          </p>
        </LoreSection>
      ) : null}
    </div>
  );
}

function subscribeNoop() {
  return () => {};
}

function useIsClient() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

export function FlagLightbox({ open, onClose, code, countryName }: FlagLightboxProps) {
  const mounted = useIsClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const country = getCountryByCode(code);
  const lore = getFlagLore(code);
  const isState = isStateCode(code);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: 0 });
  }, [open, code]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-5 md:p-6">
      <button
        type="button"
        aria-label="Close flag viewer"
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="flag-lightbox-title"
        aria-describedby={lore ? "flag-lightbox-meaning" : undefined}
        className={cn(
          "relative z-10 flex w-full max-w-[min(100%,40rem)] flex-col overflow-hidden",
          "h-[min(92dvh,52rem)] rounded-[1.75rem] border-2 border-slate-200 bg-white shadow-[0_24px_60px_rgb(15_23_42_/_0.35)]",
          "dark:border-slate-700 dark:bg-slate-900",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
              Flag
            </p>
            <h2
              id="flag-lightbox-title"
              className="truncate font-display text-lg font-extrabold text-slate-900 dark:text-slate-50 sm:text-xl"
            >
              {countryName}
            </h2>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            aria-label="Exit flag viewer"
            className="min-h-10 shrink-0 gap-1.5 font-extrabold sm:px-4"
          >
            <span aria-hidden>←</span>
            <span>Exit</span>
          </Button>
        </div>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-br from-sky-50 via-white to-teal-50 dark:from-slate-800 dark:via-slate-900 dark:to-teal-950/50"
        >
          <div className="flex flex-col items-center px-4 pb-2 pt-5 sm:px-6 sm:pt-6">
            <div className="flex max-h-[min(36vh,18rem)] w-full items-center justify-center">
              <FlagImage
                code={code}
                alt={`Flag of ${countryName}`}
                width={960}
                constrainedAxis="height"
                className="max-h-full max-w-full"
              />
            </div>
            <p className="mt-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              Flag
            </p>
          </div>

          <div className="px-4 pb-8 pt-2 sm:px-6 sm:pb-10">
            {lore ? (
              <FlagLoreArticle
                lore={lore}
                capital={country?.capital ?? ""}
                isState={isState}
              />
            ) : (
              <p className={`${GLASS_INSET_CLASS} rounded-2xl p-4 text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300`}>
                The enlarged flag of {countryName}. Lore for this design is still being added.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
