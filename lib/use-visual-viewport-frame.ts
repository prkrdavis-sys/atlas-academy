"use client";

import { useEffect, useState } from "react";

export type VisualViewportFrame = {
  /**
   * visualViewport.offsetTop while zoomed or the soft keyboard is open;
   * otherwise 0 so rubber-band overscroll cannot lift fixed docks.
   */
  offsetTop: number;
  /** Visible height for the fixed dock shell (`top` + `height`, never `bottom`). */
  height: number;
};

/** Soft keyboards shrink the visual viewport far more than dynamic browser chrome. */
const KEYBOARD_HEIGHT_GAP_PX = 120;

/** Treat anything past this as page zoom (focus auto-zoom or pinch). */
const PAGE_ZOOM_EPSILON = 0.01;

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

function isPageZoomed(vv: VisualViewport): boolean {
  return Math.abs(vv.scale - 1) > PAGE_ZOOM_EPSILON;
}

function isSoftKeyboardOpen(vv: VisualViewport): boolean {
  // Require both a large height gap and a focused editable — browser chrome on
  // small phones can exceed the gap threshold without a keyboard. Skip when
  // zoomed: scale alone shrinks vv.height and would false-trigger this.
  if (isPageZoomed(vv)) return false;
  return (
    window.innerHeight - vv.height > KEYBOARD_HEIGHT_GAP_PX &&
    isEditableTarget(document.activeElement)
  );
}

function readFrame(): VisualViewportFrame {
  const vv = window.visualViewport;
  if (!vv) {
    return { offsetTop: 0, height: window.innerHeight };
  }

  // Focus auto-zoom / pinch-zoom: layout-viewport fixed shells float mid-screen
  // unless the dock tracks the visible visual viewport (including offsetTop).
  if (isPageZoomed(vv) || isSoftKeyboardOpen(vv)) {
    return {
      offsetTop: vv.offsetTop,
      height: vv.height,
    };
  }

  // Keep top at 0 (ignore overscroll offsetTop) but size with the visual
  // viewport height — layout-viewport `bottom: 0` drifts mid-screen on modern
  // iOS Safari after keyboard/chrome changes.
  return {
    offsetTop: 0,
    height: vv.height,
  };
}

/**
 * Tracks the visible viewport for docking fixed mobile UI.
 *
 * On iOS Safari, layout-viewport `position: fixed; bottom: 0` can float
 * mid-screen after the soft keyboard, address bar, or page zoom changes.
 * Always size fixed shells with `top` + `height` from this frame. While the
 * keyboard is closed and scale is 1, force `offsetTop` to 0 so document
 * rubber-banding cannot lift the dock. While zoomed or the keyboard is open,
 * track visualViewport.offsetTop so the bar stays in the visible frame.
 */
export function useVisualViewportFrame(): VisualViewportFrame | null {
  const [frame, setFrame] = useState<VisualViewportFrame | null>(null);

  useEffect(() => {
    let raf = 0;

    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setFrame(readFrame());
      });
    };

    update();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    // Keyboard open/close often changes focus without a viewport event first.
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);

    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);

  return frame;
}
