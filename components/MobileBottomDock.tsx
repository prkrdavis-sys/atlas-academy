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
 * Uses a full visual-viewport fixed shell (`top` + `height`, no transform) so
 * the bar stays docked on modern iOS Safari where layout-viewport `bottom: 0`
 * can float mid-screen after keyboard or chrome changes.
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
