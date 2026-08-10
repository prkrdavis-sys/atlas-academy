"use client";

import { useEffect, useState } from "react";

export type VisualViewportFrame = {
  /**
   * visualViewport.offsetTop while the soft keyboard is open; otherwise 0 so
   * rubber-band overscroll cannot lift fixed docks.
   */
  offsetTop: number;
  /** Visible height for the fixed dock shell (`top` + `height`, never `bottom`). */
  height: number;
};

/** Soft keyboards shrink the visual viewport far more than dynamic browser chrome. */
const KEYBOARD_HEIGHT_GAP_PX = 120;

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

function isSoftKeyboardOpen(vv: VisualViewport): boolean {
  // Require both a large height gap and a focused editable — browser chrome on
  // small phones can exceed the gap threshold without a keyboard.
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

  if (isSoftKeyboardOpen(vv)) {
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
 * mid-screen after the soft keyboard or address bar changes. Always size fixed
 * shells with `top` + `height` from this frame. While the keyboard is closed,
 * force `offsetTop` to 0 so document rubber-banding cannot lift the dock.
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
