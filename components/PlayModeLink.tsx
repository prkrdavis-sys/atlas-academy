"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { useProfiles } from "@/components/ProfileProvider";
import type { GameMode } from "@/lib/types";

type PlayModeLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  mode: GameMode;
  onProfileRequired: () => void;
};

export function PlayModeLink({
  mode,
  onProfileRequired,
  ...props
}: PlayModeLinkProps) {
  const { activeProfile, hydrated } = useProfiles();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!hydrated || activeProfile) return;
    event.preventDefault();
    onProfileRequired();
  }

  return <Link {...props} href={`/play/${mode}`} onClick={handleClick} />;
}
