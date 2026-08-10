"use client";

import type { CSSProperties, ReactNode } from "react";
import { useVisualViewportFrame } from "@/lib/use-visual-viewport-frame";
import { cn } from "@/lib/utils";

type MobileBottomDockProps = {
  children: ReactNode;
  className?: string;
  barClassName?: string;
  style?: CSSProperties;
};

/**
 * Pins children to the visible bottom edge on phones.
 *
 * Always uses a fixed shell sized with `top` + `height` from the visual
 * viewport (never layout-viewport `bottom: 0`), which avoids the iOS Safari
 * bug where the tab bar floats mid-screen after keyboard or chrome changes.
 * While the keyboard is closed the frame keeps `offsetTop` at 0 so rubber-band
 * overscroll cannot lift the bar; while it is open, the frame tracks the
 * visual viewport so the bar stays above the keyboard.
 */
export function MobileBottomDock({
  children,
  className,
  barClassName,
  style,
}: MobileBottomDockProps) {
  const frame = useVisualViewportFrame();

  return (
    <div
      className={cn("pointer-events-none fixed inset-x-0 z-40 sm:hidden", className)}
      style={{
        ...(frame
          ? { top: frame.offsetTop, height: frame.height }
          : { top: 0, bottom: 0 }),
        ...style,
      }}
    >
      <div className={cn("pointer-events-auto absolute inset-x-0 bottom-0", barClassName)}>
        {children}
      </div>
    </div>
  );
}
