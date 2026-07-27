"use client";

import { useEffect } from "react";
import { installAudioGestures } from "@/lib/sound";

/**
 * Arms Web Audio gesture unlock as soon as the app shell mounts.
 * Context create/resume/prime stays in lib/sound.ts and only runs on gesture.
 */
export function AudioUnlock() {
  useEffect(() => {
    installAudioGestures();
  }, []);

  return null;
}
