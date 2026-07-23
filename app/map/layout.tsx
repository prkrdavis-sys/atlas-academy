import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interactive Map | Atlas Academy",
  description:
    "Explore every country and all 50 U.S. states on interactive maps. Pan, zoom, and click to discover places in the Library.",
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
