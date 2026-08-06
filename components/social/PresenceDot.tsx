import type { PresenceActivity } from "@/lib/social/types";
import { cn } from "@/lib/utils";

const ACTIVITY_STYLES: Record<PresenceActivity, { dot: string; label: string }> = {
  idle: { dot: "bg-emerald-500", label: "Online" },
  "in-round": { dot: "bg-amber-500", label: "In a round" },
  "in-match": { dot: "bg-sky-500", label: "In a head-to-head" },
};

const OFFLINE_STYLE = { dot: "bg-slate-300 dark:bg-slate-600", label: "Offline" };

export function presenceLabel(activity: PresenceActivity | null): string {
  return activity ? ACTIVITY_STYLES[activity].label : OFFLINE_STYLE.label;
}

/** Ring-outlined status dot anchored to the corner of a friend's avatar. */
export function PresenceDot({
  activity,
  className,
}: {
  activity: PresenceActivity | null;
  className?: string;
}) {
  const style = activity ? ACTIVITY_STYLES[activity] : OFFLINE_STYLE;

  return (
    <span
      role="img"
      aria-label={style.label}
      className={cn(
        "block size-3.5 rounded-full ring-2 ring-white dark:ring-slate-900",
        style.dot,
        className,
      )}
    />
  );
}
