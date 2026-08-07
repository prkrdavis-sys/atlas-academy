"use client";

import { useEffect, useState } from "react";

export type VisualViewportFrame = {
  /** visualViewport.offsetTop — applied only while the soft keyboard is open. */
  offsetTop: number;
  /** visualViewport.height while the keyboard is open; otherwise layout height. */
  height: number;
  /**
   * When true, docks should fill the layout viewport (`top: 0; bottom: 0`)
   * instead of tracking visualViewport — avoids rising with rubber-band overscroll.
   */
  pinToLayout: boolean;
};

/** Soft keyboards shrink the visual viewport far more than dynamic browser chrome. */
const KEYBOARD_HEIGHT_GAP_PX = 120;

function isSoftKeyboardOpen(vv: VisualViewport): boolean {
  return window.innerHeight - vv.height > KEYBOARD_HEIGHT_GAP_PX;
}

function readFrame(): VisualViewportFrame {
  const vv = window.visualViewport;
  if (!vv) {
    return { offsetTop: 0, height: window.innerHeight, pinToLayout: true };
  }

  if (isSoftKeyboardOpen(vv)) {
    return {
      offsetTop: vv.offsetTop,
      height: vv.height,
      pinToLayout: false,
    };
  }

  // Ignore visualViewport offset/height jitter from rubber-band overscroll so
  // fixed bottom docks stay glued to the physical bottom of the screen.
  return {
    offsetTop: 0,
    height: window.innerHeight,
    pinToLayout: true,
  };
}

/**
 * Tracks the visible viewport for docking fixed mobile UI.
 *
 * On iOS Safari, layout-viewport `position: fixed; bottom: 0` can drift after
 * the soft keyboard opens. While the keyboard is open, size fixed shells with
 * `top` + `height` from the visual viewport. While it is closed, pin to the
 * layout viewport so document rubber-banding cannot lift the dock.
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
    // Only needed while the keyboard is open (input scrolled into view). Harmless
    // when closed because readFrame ignores offsetTop unless the keyboard is open.
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return frame;
}
