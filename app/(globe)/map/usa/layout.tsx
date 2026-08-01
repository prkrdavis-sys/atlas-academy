import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "USA Map | Atlas Academy",
  description:
    "Explore all 50 states on an interactive U.S. map. Pan, zoom, and click to discover places in the Library.",
};

export default function UsaMapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
