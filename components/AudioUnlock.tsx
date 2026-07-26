"use client";

import { useEffect } from "react";
import { unlockAudio } from "@/lib/sound";

/** Unlocks Web Audio on the first user gesture so effects can play reliably. */
export function AudioUnlock() {
  useEffect(() => {
    function onGesture() {
      unlockAudio();
    }

    document.addEventListener("pointerdown", onGesture, true);
    document.addEventListener("keydown", onGesture, true);
    return () => {
      document.removeEventListener("pointerdown", onGesture, true);
      document.removeEventListener("keydown", onGesture, true);
    };
  }, []);

  return null;
}
