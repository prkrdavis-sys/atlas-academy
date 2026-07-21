import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "World Map | Atlas Academy",
  description:
    "Explore every country on an interactive world map. Pan, zoom, and click to discover places in the Library.",
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
