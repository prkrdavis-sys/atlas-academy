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
 * While the soft keyboard is closed, the shell fills the layout viewport so
 * rubber-band overscroll cannot lift the bar. While the keyboard is open, it
 * tracks visualViewport (`top` + `height`) so the bar stays above the keyboard
 * on modern iOS Safari.
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
          ? frame.pinToLayout
            ? { top: 0, bottom: 0 }
            : { top: frame.offsetTop, height: frame.height }
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
