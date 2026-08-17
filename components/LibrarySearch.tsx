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
import { GLASS_CONTROL_CLASS, GLASS_INSET_CLASS, GLASS_PANEL_CLASS } from "@/lib/glass";
import { cn } from "@/lib/utils";
import type { GameScope } from "@/lib/types";
import { useCoachMarkAnchor } from "@/components/CoachMarkProvider";

type LibrarySearchProps = {
  scope: GameScope;
  filter: LibraryFilter;
  sort?: LibrarySort;
  isState?: boolean;
  mobileDropdownFullWidth?: boolean;
  className?: string;
  onNavigateToDetail?: () => void;
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
  mobileDropdownFullWidth = false,
  className,
  onNavigateToDetail,
}: LibrarySearchProps) {
  const router = useRouter();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useCoachMarkAnchor("library-search");

  const matches = useMemo(
    () => searchLibraryPlaces(scope, query),
    [scope, query],
  );

  const showDropdown = isOpen && query.trim().length > 0;
  const activeIndex =
    matches.length > 0 &&
    highlightedIndex >= 0 &&
    highlightedIndex < matches.length
      ? highlightedIndex
      : matches.length > 0
        ? 0
        : -1;

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
    onNavigateToDetail?.();
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
        setHighlightedIndex((current) => {
          const normalizedCurrent =
            current >= 0 && current < matches.length ? current : 0;
          return (normalizedCurrent + 1) % matches.length;
        });
        break;
      case "ArrowUp":
        event.preventDefault();
        if (matches.length === 0) return;
        setHighlightedIndex((current) =>
          current <= 0 || current >= matches.length
            ? matches.length - 1
            : current - 1,
        );
        break;
      case "Enter":
        event.preventDefault();
        if (activeIndex >= 0 && matches[activeIndex]) {
          navigateTo(matches[activeIndex].place.code);
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
  const [isFocused, setIsFocused] = useState(false);
  const [isWideLayout, setIsWideLayout] = useState(false);
  const [isIconOnly, setIsIconOnly] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const updateWideLayout = () => {
      setIsWideLayout(mediaQuery.matches);
    };

    updateWideLayout();
    mediaQuery.addEventListener("change", updateWideLayout);
    return () => mediaQuery.removeEventListener("change", updateWideLayout);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const parent = container?.parentElement;
    if (!container || !parent) return;

    const searchPlaceholderMinWidth = 56;
    const horizontalPadding = 60;

    const updateIconOnly = () => {
      const parentStyles = getComputedStyle(parent);
      const columnGap = Number.parseFloat(parentStyles.columnGap) || 0;
      const siblingWidth = Array.from(parent.children).reduce((total, child) => {
        if (child === container) return total;
        return total + child.getBoundingClientRect().width;
      }, 0);
      const gapCount = Math.max(parent.children.length - 1, 0);
      const availableWidth =
        parent.clientWidth - siblingWidth - columnGap * gapCount;

      setIsIconOnly(
        availableWidth < searchPlaceholderMinWidth + horizontalPadding,
      );
    };

    updateIconOnly();
    const observer = new ResizeObserver(updateIconOnly);
    observer.observe(parent);
    for (const child of parent.children) {
      observer.observe(child);
    }
    return () => observer.disconnect();
  }, []);

  const showCollapsedIcon = isIconOnly && !query && !isFocused;
  const placeholder = isIconOnly
    ? ""
    : isWideLayout
      ? fullPlaceholder
      : "Search";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative min-w-0",
        showCollapsedIcon ? "w-11 shrink-0 flex-none" : "min-w-0 flex-1",
        mobileDropdownFullWidth && "max-sm:static",
        className,
      )}
    >
      <div className="relative">
        <SearchIcon
          className={cn(
            "pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 dark:text-slate-400",
            showCollapsedIcon
              ? "left-1/2 -translate-x-1/2"
              : "left-3.5",
          )}
        />
        <input
          ref={searchInputRef}
          type="search"
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setIsOpen(true);
            setHighlightedIndex(nextQuery.trim() ? 0 : -1);
          }}
          onFocus={() => {
            setIsFocused(true);
            if (query.trim()) setIsOpen(true);
          }}
          onBlur={() => setIsFocused(false)}
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
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          className={cn(
            GLASS_CONTROL_CLASS,
            "min-h-11 rounded-full py-2.5 text-base font-semibold text-slate-800 shadow-sm placeholder:font-medium placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-900/60 sm:text-sm",
            showCollapsedIcon
              ? "w-11 shrink-0 px-0"
              : "w-full pl-11 pr-4",
          )}
        />
      </div>

      {showDropdown ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={isState ? "Matching states" : "Matching countries"}
          className={cn(
            `${GLASS_PANEL_CLASS} absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl p-1.5 shadow-lg`,
            mobileDropdownFullWidth &&
              "max-sm:-left-4 max-sm:-right-4 max-sm:top-[calc(100%+0.5rem)] max-sm:mt-0 max-sm:w-auto",
          )}
        >
          {matches.length > 0 ? (
            matches.map((match, index) => {
              const place = match.place;
              const active = index === activeIndex;
              const subtitle =
                match.keyword && match.category
                  ? `${match.keyword} · ${match.category}`
                  : null;
              const optionLabel = subtitle
                ? `${place.name}, ${subtitle}`
                : place.name;
              return (
                <li key={place.code} role="presentation">
                  <button
                    id={`${listboxId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    aria-label={optionLabel}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => navigateTo(place.code)}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                      active
                        ? "bg-teal-500/15 text-teal-900 dark:bg-teal-400/15 dark:text-teal-100"
                        : "text-slate-800 hover:bg-white/20 dark:text-slate-100 dark:hover:bg-white/10",
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
                        className={`${GLASS_INSET_CLASS} flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-xs font-bold text-slate-500 dark:text-slate-400`}
                      >
                        {place.code}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-display text-sm font-extrabold leading-tight">
                        {place.name}
                      </span>
                      {subtitle ? (
                        <span
                          className={cn(
                            "mt-0.5 block truncate text-xs font-semibold",
                            active
                              ? "text-teal-700 dark:text-teal-300"
                              : "text-slate-500 dark:text-slate-400",
                          )}
                        >
                          {subtitle}
                        </span>
                      ) : null}
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
