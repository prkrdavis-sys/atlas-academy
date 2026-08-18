"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CoachMarkBubble, type CoachMarkPlacement } from "@/components/CoachMarkBubble";
import {
  COACH_MARKS,
  getCoachScreen,
  getSeenCoachMarks,
  markCoachMarkSeen,
  pickCoachMark,
  type CoachMarkId,
  type CoachSpotlight,
} from "@/lib/coach-marks";
import { hasSeenWelcome, WELCOME_SEEN_EVENT } from "@/lib/welcome";
import { cn } from "@/lib/utils";

const SCREEN_SETTLE_MS = 500;

type CoachMarkContextValue = {
  register: (id: CoachMarkId, el: HTMLElement) => () => void;
  subscribe: (listener: () => void) => () => void;
  anchorsRef: MutableRefObject<Map<CoachMarkId, Set<HTMLElement>>>;
};

const CoachMarkContext = createContext<CoachMarkContextValue | null>(null);

function isCoachAnchorVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  if (el.closest("[inert]")) return false;
  if (el.closest('[aria-hidden="true"]')) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) return false;
  const overlapX = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
  const overlapY = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
  return overlapX >= 8 && overlapY >= 8;
}

function pickVisibleAnchor(anchors: Iterable<HTMLElement>): HTMLElement | null {
  for (const el of anchors) {
    if (isCoachAnchorVisible(el)) return el;
  }
  return null;
}

function getSpotlightRect(el: HTMLElement, spotlight: CoachSpotlight): DOMRect {
  const rect = el.getBoundingClientRect();
  if (spotlight === "full") return rect;

  const size = Math.min(128, Math.max(72, Math.min(rect.width, rect.height) * 0.42));
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height * 0.42;
  return new DOMRect(cx - size / 2, cy - size / 2, size, size);
}

function getCoachPlacement(rect: DOMRect): CoachMarkPlacement {
  const vh = window.innerHeight;
  const headerBand = 96;
  const dockBand = vh * 0.72;
  if (rect.top >= dockBand) return "above";
  if (rect.bottom <= headerBand) return "below";
  const spaceAbove = rect.top;
  const spaceBelow = vh - rect.bottom;
  return spaceAbove >= spaceBelow ? "above" : "below";
}

function rectsClose(a: DOMRect, b: DOMRect): boolean {
  return (
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

const SPOTLIGHT_PAD = 6;
const DIMMER_CLASS = "absolute bg-slate-900/45";

/**
 * Dims the page with four viewport-sized rects instead of a 9999px box-shadow,
 * which forced the browser to paint a ~20k-pixel layer and froze the UI.
 * The hole is empty so the real control (Play, Map, …) still receives taps.
 */
function CoachMarkScrim({
  rect,
  spotlight,
}: {
  rect: DOMRect;
  spotlight: CoachSpotlight;
}) {
  const top = Math.max(0, rect.top - SPOTLIGHT_PAD);
  const left = Math.max(0, rect.left - SPOTLIGHT_PAD);
  const width = rect.width + SPOTLIGHT_PAD * 2;
  const height = rect.height + SPOTLIGHT_PAD * 2;
  const right = left + width;
  const bottom = top + height;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className={DIMMER_CLASS} style={{ top: 0, left: 0, right: 0, height: top }} />
      <div className={DIMMER_CLASS} style={{ top: bottom, left: 0, right: 0, bottom: 0 }} />
      <div className={DIMMER_CLASS} style={{ top, left: 0, width: left, height }} />
      <div className={DIMMER_CLASS} style={{ top, left: right, right: 0, height }} />
      <div
        className={cn(
          "absolute ring-2 ring-teal-400 ring-offset-2 ring-offset-transparent",
          spotlight === "center" ? "rounded-full" : "rounded-2xl",
        )}
        style={{ top, left, width, height }}
      />
    </div>
  );
}

export function useCoachMarkAnchor<T extends HTMLElement = HTMLElement>(
  id: CoachMarkId | null,
) {
  const ctx = useContext(CoachMarkContext);
  const [node, setNode] = useState<T | null>(null);

  useEffect(() => {
    if (!node || !id || !ctx) return;
    return ctx.register(id, node);
  }, [node, id, ctx]);

  return setNode;
}

export function CoachMarkLink({
  markId,
  ...props
}: ComponentProps<typeof Link> & { markId?: CoachMarkId | null }) {
  const ref = useCoachMarkAnchor(markId ?? null);
  return <Link ref={markId ? ref : undefined} {...props} />;
}

export function CoachMarkProvider({ children }: { children: ReactNode }) {
  const anchorsRef = useRef(new Map<CoachMarkId, Set<HTMLElement>>());
  const listenersRef = useRef(new Set<() => void>());

  const register = useCallback((id: CoachMarkId, el: HTMLElement) => {
    const map = anchorsRef.current;
    let anchors = map.get(id);
    if (!anchors) {
      anchors = new Set();
      map.set(id, anchors);
    }
    anchors.add(el);
    el.setAttribute("data-coach-mark", id);
    listenersRef.current.forEach((listener) => listener());
    return () => {
      anchors.delete(el);
      if (el.getAttribute("data-coach-mark") === id) {
        el.removeAttribute("data-coach-mark");
      }
      if (anchors.size === 0) map.delete(id);
      listenersRef.current.forEach((listener) => listener());
    };
  }, []);

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const contextValue = useMemo<CoachMarkContextValue>(
    () => ({ register, subscribe, anchorsRef }),
    [register, subscribe],
  );

  return (
    <CoachMarkContext.Provider value={contextValue}>
      {children}
      <CoachMarkHost />
    </CoachMarkContext.Provider>
  );
}

function CoachMarkHost() {
  const ctx = useContext(CoachMarkContext);
  const pathname = usePathname();
  const screen = getCoachScreen(pathname);
  const [anchorVersion, setAnchorVersion] = useState(0);
  const [welcomeSeen, setWelcomeSeen] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [placement, setPlacement] = useState<CoachMarkPlacement>("below");
  const [settleReady, setSettleReady] = useState(false);
  const [shownThisVisit, setShownThisVisit] = useState(false);
  const [sessionSeen, setSessionSeen] = useState<ReadonlySet<CoachMarkId>>(() => new Set());
  const [prevScreen, setPrevScreen] = useState(screen);

  if (screen !== prevScreen) {
    setPrevScreen(screen);
    setShownThisVisit(false);
    setSettleReady(false);
    setTargetRect(null);
  }

  useEffect(() => {
    if (!ctx) return;
    return ctx.subscribe(() => {
      setAnchorVersion((value) => value + 1);
    });
  }, [ctx]);

  useEffect(() => {
    function onWelcomeSeen() {
      setWelcomeSeen(true);
    }
    window.addEventListener(WELCOME_SEEN_EVENT, onWelcomeSeen);
    const frame = window.requestAnimationFrame(() => {
      if (hasSeenWelcome()) onWelcomeSeen();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(WELCOME_SEEN_EVENT, onWelcomeSeen);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSettleReady(true);
    }, SCREEN_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [screen]);

  const visibleIds = new Set<CoachMarkId>();
  if (ctx && welcomeSeen && settleReady && screen && !shownThisVisit && anchorVersion >= 0) {
    for (const [id, els] of ctx.anchorsRef.current) {
      if (pickVisibleAnchor(els)) visibleIds.add(id);
    }
  }

  const seen = new Set(getSeenCoachMarks());
  for (const id of sessionSeen) seen.add(id);

  const activeId =
    ctx && welcomeSeen && settleReady && screen && !shownThisVisit
      ? pickCoachMark(screen, seen, visibleIds)
      : null;
  const activeEl =
    ctx && activeId
      ? pickVisibleAnchor(ctx.anchorsRef.current.get(activeId) ?? [])
      : null;

  const dismiss = useCallback((id: CoachMarkId) => {
    setSessionSeen((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setShownThisVisit(true);
    setTargetRect(null);
    markCoachMarkSeen(id);
  }, []);

  useEffect(() => {
    if (!activeId || !activeEl) return;

    const tipId = activeId;
    const tipEl = activeEl;

    function updateRect() {
      if (!tipEl.isConnected || !isCoachAnchorVisible(tipEl)) {
        setTargetRect((prev) => (prev ? null : prev));
        return;
      }
      const copy = COACH_MARKS[tipId];
      const rect = getSpotlightRect(tipEl, copy.spotlight);
      const nextPlacement = getCoachPlacement(rect);
      setTargetRect((prev) => (prev && rectsClose(prev, rect) ? prev : rect));
      setPlacement((prev) => (prev === nextPlacement ? prev : nextPlacement));
    }

    const frame = window.requestAnimationFrame(updateRect);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    const observer = new ResizeObserver(updateRect);
    observer.observe(tipEl);

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0) return;
      if (!(event.target instanceof Element)) return;
      // Got it handles itself. Everything else dismisses without preventDefault
      // so Play / nav still receive the same tap.
      if (event.target.closest("[data-coach-bubble]")) return;
      dismiss(tipId);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss(tipId);
      }
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      observer.disconnect();
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeId, activeEl, dismiss]);

  const copy = activeId ? COACH_MARKS[activeId] : null;
  const overlayOpen = Boolean(copy && targetRect && activeEl);

  useEffect(() => {
    if (!overlayOpen) return;
    document.body.classList.add("coach-mark-open");
    return () => document.body.classList.remove("coach-mark-open");
  }, [overlayOpen]);

  if (typeof document === "undefined") return null;

  if (copy && targetRect && activeEl) {
    return createPortal(
      <div
        className="pointer-events-none fixed inset-0 z-[100]"
        data-coach-root=""
      >
        <CoachMarkScrim rect={targetRect} spotlight={copy.spotlight} />
        <CoachMarkBubble
          title={copy.title}
          body={copy.body}
          target={targetRect}
          placement={placement}
          onDismiss={() => dismiss(copy.id)}
        />
      </div>,
      document.body,
    );
  }

  return null;
}
