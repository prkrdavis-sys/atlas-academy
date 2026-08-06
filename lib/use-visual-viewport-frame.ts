"use client";

import { useEffect, useState } from "react";

export type VisualViewportFrame = {
  /** visualViewport.offsetTop — iOS can scroll the visual viewport independently. */
  offsetTop: number;
  /** visualViewport.height — shrinks for keyboard and dynamic browser chrome. */
  height: number;
};

function readFrame(): VisualViewportFrame {
  const vv = window.visualViewport;
  if (vv) {
    return { offsetTop: vv.offsetTop, height: vv.height };
  }
  return { offsetTop: 0, height: window.innerHeight };
}

/**
 * Tracks the visible viewport for docking fixed mobile UI.
 *
 * On iOS 26+ Safari, layout-viewport `position: fixed; bottom: 0` often drifts
 * after the soft keyboard or address bar changes, leaving bottom bars floating
 * mid-screen. Size fixed shells with `top` + `height` from this frame instead
 * (no transform on the fixed element).
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
