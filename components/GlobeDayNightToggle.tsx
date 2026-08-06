"use client";

import { MenuSwitch } from "@/components/MenuSwitch";
import { useGlobeDayNight } from "@/lib/use-globe-day-night";

/** Main-menu toggle for real-time day/night sunlight on the 3D globes. */
export function GlobeDayNightToggle() {
  const { enabled, setEnabled, ready } = useGlobeDayNight();

  return (
    <div suppressHydrationWarning>
      <MenuSwitch
        label="Day / night"
        checked={ready && enabled}
        onCheckedChange={setEnabled}
      />
    </div>
  );
}
