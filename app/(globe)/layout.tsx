/**
 * Route group for `/` and `/map`. The persistent globe experience is mounted
 * from `AppShell` so the WebGL canvas also survives navigation to Library and
 * play routes — these pages only exist so the URL space is grouped.
 */
export default function GlobeExperienceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
