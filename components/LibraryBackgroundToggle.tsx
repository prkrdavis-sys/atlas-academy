"use client";

import { MenuSwitch } from "@/components/MenuSwitch";
import { useLibraryBackground } from "@/lib/use-library-background";

/** Main-menu toggle for hiding the globe beneath the Library content. */
export function LibraryBackgroundToggle() {
  const { opaque, setOpaque, ready } = useLibraryBackground();

  return (
    <MenuSwitch
      label="Opaque library"
      emoji="▦"
      checked={ready && opaque}
      onCheckedChange={setOpaque}
    />
  );
}
