"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FlagImage } from "@/components/FlagDisplay";
import {
  buildLibraryDetailHref,
  searchLibraryPlaces,
  type LibraryFilter,
  type LibrarySort,
} from "@/lib/library";
import { cn } from "@/lib/utils";
import type { GameScope } from "@/lib/types";

type LibrarySearchProps = {
  scope: GameScope;
  filter: LibraryFilter;
  sort?: LibrarySort;
  isState?: boolean;
  className?: string;
};

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20 16.65 16.65" />
    </svg>
  );
}

export function LibrarySearch({
  scope,
  filter,
  sort = "alphabetical",
  isState = false,
  className,
}: LibrarySearchProps) {
  const router = useRouter();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const matches = useMemo(
    () => searchLibraryPlaces(scope, query),
    [scope, query],
  );

  const showDropdown = isOpen && query.trim().length > 0;

  useEffect(() => {
    setHighlightedIndex(matches.length > 0 ? 0 : -1);
  }, [matches]);

  useEffect(() => {
    if (!showDropdown) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showDropdown]);

  const navigateTo = (code: string) => {
    setQuery("");
    setIsOpen(false);
    setHighlightedIndex(-1);
    router.push(buildLibraryDetailHref(code, scope, filter, sort));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (event.key === "ArrowDown" && query.trim()) {
        setIsOpen(true);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (matches.length === 0) return;
        setHighlightedIndex((current) => (current + 1) % matches.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (matches.length === 0) return;
        setHighlightedIndex((current) =>
          current <= 0 ? matches.length - 1 : current - 1,
        );
        break;
      case "Enter":
        event.preventDefault();
        if (highlightedIndex >= 0 && matches[highlightedIndex]) {
          navigateTo(matches[highlightedIndex].code);
        }
        break;
      case "Escape":
        event.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  const fullPlaceholder = isState ? "Search states…" : "Search countries…";
  const [placeholder, setPlaceholder] = useState("Search");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const updatePlaceholder = () => {
      setPlaceholder(mediaQuery.matches ? fullPlaceholder : "Search");
    };

    updatePlaceholder();
    mediaQuery.addEventListener("change", updatePlaceholder);
    return () => mediaQuery.removeEventListener("change", updatePlaceholder);
  }, [fullPlaceholder]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={fullPlaceholder}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined
          }
          className="min-h-11 w-full rounded-full border-2 border-slate-200 bg-white/80 py-2.5 pl-11 pr-4 text-sm font-semibold text-slate-800 shadow-sm placeholder:font-medium placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-900/60"
        />
      </div>

      {showDropdown ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={isState ? "Matching states" : "Matching countries"}
          className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border-2 border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
        >
          {matches.length > 0 ? (
            matches.map((place, index) => {
              const active = index === highlightedIndex;
              return (
                <li key={place.code} role="presentation">
                  <button
                    id={`${listboxId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => navigateTo(place.code)}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                      active
                        ? "bg-teal-50 text-teal-900 dark:bg-teal-950/60 dark:text-teal-100"
                        : "text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800/80",
                    )}
                  >
                    {place.hasFlag ? (
                      <FlagImage
                        code={place.code}
                        alt=""
                        width={32}
                        frame="pill"
                        className="w-8 shrink-0"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-slate-100 text-xs font-bold text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      >
                        {place.code}
                      </span>
                    )}
                    <span className="min-w-0 font-display text-sm font-extrabold leading-tight">
                      {place.name}
                    </span>
                  </button>
                </li>
              );
            })
          ) : (
            <li className="px-3 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
              No {isState ? "states" : "countries"} match &ldquo;{query.trim()}&rdquo;
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
