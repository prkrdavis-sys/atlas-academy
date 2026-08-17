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

  const activeId =
    ctx && welcomeSeen && settleReady && screen && !shownThisVisit
      ? pickCoachMark(screen, getSeenCoachMarks(), visibleIds)
      : null;
  const activeEl =
    ctx && activeId
      ? pickVisibleAnchor(ctx.anchorsRef.current.get(activeId) ?? [])
      : null;

  const dismiss = useCallback((id: CoachMarkId) => {
    markCoachMarkSeen(id);
    setShownThisVisit(true);
    setTargetRect(null);
  }, []);

  useEffect(() => {
    if (!activeId || !activeEl) return;

    const tipId = activeId;
    const tipEl = activeEl;

    function updateRect() {
      if (!tipEl.isConnected || !isCoachAnchorVisible(tipEl)) {
        setTargetRect(null);
        return;
      }
      const copy = COACH_MARKS[tipId];
      const rect = getSpotlightRect(tipEl, copy.spotlight);
      setTargetRect(rect);
      setPlacement(getCoachPlacement(rect));
    }

    const frame = window.requestAnimationFrame(updateRect);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    const observer = new ResizeObserver(updateRect);
    observer.observe(tipEl);

    function onDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      const eventTarget = event.target;
      if (!(eventTarget instanceof Element)) return;
      if (eventTarget.closest("[data-coach-bubble]")) return;

      if (tipEl.contains(eventTarget)) {
        dismiss(tipId);
        return;
      }

      const copy = COACH_MARKS[tipId];
      const rect = getSpotlightRect(tipEl, copy.spotlight);
      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        dismiss(tipId);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss(tipId);
      }
    }

    document.addEventListener("click", onDocumentClick, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      observer.disconnect();
      document.removeEventListener("click", onDocumentClick, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeId, activeEl, dismiss]);

  const copy = activeId ? COACH_MARKS[activeId] : null;
  if (!copy || !targetRect || !activeEl || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[68] overflow-hidden"
      >
        <div
          className={cn(
            "absolute ring-2 ring-teal-400 ring-offset-2 ring-offset-transparent",
            copy.spotlight === "center" ? "rounded-full" : "rounded-2xl",
          )}
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow: "0 0 0 9999px rgb(15 23 42 / 0.45)",
          }}
        />
      </div>
      <CoachMarkBubble
        title={copy.title}
        body={copy.body}
        target={targetRect}
        placement={placement}
        onDismiss={() => dismiss(copy.id)}
      />
    </>,
    document.body,
  );
}
