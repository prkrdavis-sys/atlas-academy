"use client";

import { MenuSwitch } from "@/components/MenuSwitch";
import { useProfiles } from "@/components/ProfileProvider";
import { isHapticsEnabled, triggerHaptic } from "@/lib/haptics";
import { updateProfileSettings } from "@/lib/storage";

/** Vibration on/off toggle for the header menu. */
export function HapticsToggle() {
  const { activeProfile, refresh } = useProfiles();
  if (!activeProfile) return null;

  const enabled = isHapticsEnabled(activeProfile);

  function setEnabled(next: boolean) {
    if (!activeProfile) return;
    updateProfileSettings(activeProfile.id, { hapticsEnabled: next });
    refresh();
    if (next) {
      triggerHaptic("correct");
    }
  }

  return (
    <MenuSwitch
      label="Vibration"
      checked={enabled}
      onCheckedChange={setEnabled}
    />
  );
}
