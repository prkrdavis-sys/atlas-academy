"use client";

import { Fragment, type ReactNode } from "react";
import { MODE_REF_PATTERN } from "@/lib/mode-ref";
import { getScopedModeInfo } from "@/lib/scope";
import type { GameMode, GameScope } from "@/lib/types";

type HomeHeroTaglineContentProps = {
  text: string;
  scope: GameScope;
};

export function HomeHeroTaglineContent({ text, scope }: HomeHeroTaglineContentProps) {
  return <>{parseModeRefs(text, scope)}</>;
}

function parseModeRefs(text: string, scope: GameScope): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MODE_REF_PATTERN)) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    const mode = match[1] as GameMode;
    const modeInfo = getScopedModeInfo(mode, scope);

    if (modeInfo) {
      parts.push(
        <span
          key={`mode-${index}-${mode}`}
          className="font-semibold underline decoration-emerald-200/90 underline-offset-[0.2em]"
        >
          <span aria-hidden>{modeInfo.icon}</span> {modeInfo.title} Mode
        </span>,
      );
    } else {
      parts.push(match[0]);
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<Fragment key={`text-${lastIndex}`}>{text.slice(lastIndex)}</Fragment>);
  }

  return parts;
}
