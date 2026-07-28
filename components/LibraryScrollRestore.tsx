"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { consumeLibraryScrollState, restoreLibraryScrollState } from "@/lib/library-scroll";

export function LibraryScrollRestore() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const state = consumeLibraryScrollState();
    if (!state) return;

    const apply = () => restoreLibraryScrollState(state);

    apply();

    const raf = requestAnimationFrame(apply);
    const shortDelay = window.setTimeout(apply, 100);
    const longDelay = window.setTimeout(apply, 400);
    window.addEventListener("load", apply, { once: true });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(shortDelay);
      window.clearTimeout(longDelay);
      window.removeEventListener("load", apply);
    };
  }, [pathname]);

  return null;
}
