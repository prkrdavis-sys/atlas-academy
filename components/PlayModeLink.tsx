"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { useProfiles } from "@/components/ProfileProvider";
import { scopeQuery } from "@/lib/scope";
import type { GameMode, GameScope } from "@/lib/types";

type PlayModeLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  mode: GameMode;
  scope?: GameScope;
  onProfileRequired: () => void;
};

export function PlayModeLink({
  mode,
  scope = "world",
  onProfileRequired,
  ...props
}: PlayModeLinkProps) {
  const { activeProfile, hydrated } = useProfiles();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!hydrated) {
      event.preventDefault();
      return;
    }
    if (activeProfile) return;
    event.preventDefault();
    onProfileRequired();
  }

  return <Link {...props} href={`/play/${mode}${scopeQuery(scope)}`} onClick={handleClick} />;
}
