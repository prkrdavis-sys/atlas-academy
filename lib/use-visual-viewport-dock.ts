"use client";

import { useLayoutEffect, type RefObject } from "react";
import { dockShiftYToVisualBottom } from "@/lib/visual-viewport-dock";

const SHIFT_EPSILON_PX = 0.5;

function isEditableTarget(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/**
 * Keeps a `position: fixed; bottom: 0` element on the visible bottom edge.
 *
 * Layout-viewport `bottom: 0` drifts after iOS Safari chrome, keyboard, or
 * zoom changes. We measure the element's box and translate it so its bottom
 * matches the visual viewport — without sizing the element to
 * `visualViewport.height`, which is what put the tab bar mid-screen.
 */
export function useVisualViewportDock(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    let translateY = 0;
    let raf = 0;
    let delayShort = 0;
    let delayLong = 0;

    const apply = () => {
      raf = 0;
      const el = ref.current;
      if (!el || el.getClientRects().length === 0) return;

      el.style.top = "auto";
      el.style.bottom = "0px";
      el.style.height = "auto";

      const vv = window.visualViewport;
      if (!vv || vv.height <= 0) {
        if (translateY !== 0) {
          translateY = 0;
          el.style.transform = "";
        }
        return;
      }

      const rect = el.getBoundingClientRect();
      const shiftY = dockShiftYToVisualBottom(rect.bottom - translateY, {
        offsetTop: vv.offsetTop,
        height: vv.height,
        scale: vv.scale,
      }, {
        allowLargeUpwardShift: isEditableTarget(document.activeElement),
      });

      const maxShift = Math.max(vv.height, window.innerHeight);
      const next =
        Math.abs(shiftY) < SHIFT_EPSILON_PX
          ? 0
          : Math.max(-maxShift, Math.min(maxShift, shiftY));

      if (next === translateY) return;
      translateY = next;
      el.style.transform = translateY ? `translateY(${translateY}px)` : "";
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(apply);
    };

    const scheduleWithDelay = () => {
      schedule();
      window.clearTimeout(delayShort);
      window.clearTimeout(delayLong);
      delayShort = window.setTimeout(schedule, 100);
      delayLong = window.setTimeout(schedule, 400);
    };

    apply();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", schedule);
    vv?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", scheduleWithDelay);
    window.addEventListener("pageshow", schedule);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", scheduleWithDelay);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(delayShort);
      window.clearTimeout(delayLong);
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", scheduleWithDelay);
      window.removeEventListener("pageshow", schedule);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", scheduleWithDelay);
    };
  }, [ref]);
}
