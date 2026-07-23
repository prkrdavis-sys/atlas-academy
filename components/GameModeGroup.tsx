import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type GameModeGroupHeaderStyle = {
  container: string;
  summary: string;
  title: string;
  subtitle: string;
  badge: string;
  chevron: string;
};

type GameModeGroupProps = {
  title: string;
  subtitle?: string;
  badge: string;
  defaultOpen?: boolean;
  headerStyle: GameModeGroupHeaderStyle;
  children: ReactNode;
};

export function GameModeGroup({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  headerStyle,
  children,
}: GameModeGroupProps) {
  return (
    <details
      open={defaultOpen || undefined}
      className={cn("group rounded-2xl border-2 shadow-sm transition-shadow", headerStyle.container)}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 transition-all sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden",
          headerStyle.summary,
        )}
      >
        <div className="min-w-0 flex-1">
          <h2 className={cn("font-display text-lg font-extrabold sm:text-xl", headerStyle.title)}>
            {title}
          </h2>
          {subtitle ? (
            <p className={cn("mt-0.5 text-xs sm:text-sm", headerStyle.subtitle)}>{subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums sm:px-3 sm:py-1",
              headerStyle.badge,
            )}
          >
            {badge}
          </span>
          <span
            aria-hidden
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-sm transition-transform duration-200 group-open:rotate-180",
              headerStyle.chevron,
            )}
          >
            ▾
          </span>
        </div>
      </summary>
      <div className="px-3 pb-3 sm:px-4 sm:pb-4">{children}</div>
    </details>
  );
}
