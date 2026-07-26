/** Format the current clock time in an IANA timezone (e.g. "3:45 PM"). */
export function formatLocalClockTime(timeZone: string, date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * Long timezone name for a place (e.g. "Eastern Time", "Central European Time").
 * Uses the locale's generic name so DST doesn't flip "Standard"/"Daylight" labels.
 */
export function formatTimeZoneName(timeZone: string, date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longGeneric",
  }).formatToParts(date);

  const name = parts.find((part) => part.type === "timeZoneName")?.value;
  if (name) return name;

  // Fallback for runtimes without longGeneric support.
  const fallbackParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "long",
  }).formatToParts(date);
  return (
    fallbackParts.find((part) => part.type === "timeZoneName")?.value ??
    timeZone.replace(/_/g, " ")
  );
}
