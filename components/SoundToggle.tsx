"use client";

import { MenuSwitch } from "@/components/MenuSwitch";
import { useProfiles } from "@/components/ProfileProvider";
import { isSoundEnabled, playSound, unlockAudio } from "@/lib/sound";
import { updateProfileSettings } from "@/lib/storage";

/** Sound effects on/off toggle for the header menu. */
export function SoundToggle() {
  const { activeProfile, refresh } = useProfiles();
  if (!activeProfile) return null;

  const enabled = isSoundEnabled(activeProfile);

  function setEnabled(next: boolean) {
    if (!activeProfile) return;
    updateProfileSettings(activeProfile.id, { soundEnabled: next });
    refresh();
    if (next) {
      unlockAudio();
      playSound("tap");
    }
  }

  return (
    <MenuSwitch
      label="Sound"
      emoji="🔊"
      checked={enabled}
      onCheckedChange={setEnabled}
    />
  );
}
