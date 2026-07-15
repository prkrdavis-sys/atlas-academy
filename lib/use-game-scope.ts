"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { getStoredScope, setStoredScope } from "@/lib/scope";
import type { GameScope } from "@/lib/types";

type UseGameScopeOptions = {
  /** Element above the scope toggle whose height may change when scope changes. */
  layoutAnchorRef?: RefObject<HTMLElement | null>;
};

type PendingScroll = {
  y: number;
  anchorHeight: number;
};

/**
 * Scope state with scroll preservation when switching world/USA on mobile.
 * Compensates for layout shifts in content above the toggle (e.g. hero streaks).
 */
export function useGameScope(options: UseGameScopeOptions = {}) {
  const { layoutAnchorRef } = options;
  const [scope, setScope] = useState<GameScope>("world");
  const pendingScroll = useRef<PendingScroll | null>(null);

  useEffect(() => {
    // Hydrate after mount so server-rendered markup never mismatches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScope(getStoredScope());
  }, []);

  const selectScope = useCallback(
    (next: GameScope) => {
      setScope((current) => {
        if (next === current) return current;
        pendingScroll.current = {
          y: window.scrollY,
          anchorHeight: layoutAnchorRef?.current?.offsetHeight ?? 0,
        };
        setStoredScope(next);
        return next;
      });
    },
    [layoutAnchorRef],
  );

  useLayoutEffect(() => {
    const pending = pendingScroll.current;
    if (!pending) return;
    pendingScroll.current = null;
    const anchorHeight = layoutAnchorRef?.current?.offsetHeight ?? 0;
    const delta = anchorHeight - pending.anchorHeight;
    window.scrollTo(0, pending.y + delta);
  }, [scope, layoutAnchorRef]);

  return { scope, setScope, selectScope };
}
