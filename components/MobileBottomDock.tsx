"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useVisualViewportDock } from "@/lib/use-visual-viewport-dock";
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
 * The dock is only as tall as its content (`bottom: 0`, never a full-viewport
 * shell). A visual-viewport measurement then translates it so Safari chrome,
 * the keyboard, and page zoom cannot leave the bar floating mid-screen.
 */
export function MobileBottomDock({
  children,
  className,
  barClassName,
  style,
}: MobileBottomDockProps) {
  const dockRef = useRef<HTMLDivElement>(null);
  useVisualViewportDock(dockRef);

  return (
    <div
      ref={dockRef}
      className={cn("pointer-events-none fixed inset-x-0 bottom-0 z-40 sm:hidden", className)}
      style={style}
    >
      <div className={cn("pointer-events-auto", barClassName)}>
        {children}
      </div>
    </div>
  );
}
