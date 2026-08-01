import { Suspense } from "react";
import { GlobeExperience } from "@/components/GlobeExperience";

/**
 * Shared layout for `/` and `/map`. The whole experience (globe canvas, home
 * hero, map chrome) lives here so navigating between the two routes never
 * remounts the globe — the page UI just slides between the panes.
 */
export default function GlobeExperienceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <GlobeExperience />
      </Suspense>
      {children}
    </>
  );
}
