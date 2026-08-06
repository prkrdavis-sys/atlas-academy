"use client";

import { MenuSwitch } from "@/components/MenuSwitch";
import { useShowMapProgress } from "@/lib/use-show-map-progress";

/**
 * Main-menu toggle for painting mastery progress on the globe and 2D maps.
 * Off keeps the natural land texture only.
 */
export function ShowMapProgressToggle() {
  const { enabled, setEnabled, ready } = useShowMapProgress();

  return (
    <div suppressHydrationWarning>
      <MenuSwitch
        label="Map progress"
        emoji="🗺️"
        checked={ready && enabled}
        onCheckedChange={setEnabled}
      />
    </div>
  );
}
