import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Library | Atlas Academy",
  description:
    "Browse flags, shapes, capitals, populations, neighbors, and geographic profiles for every country and US state.",
};

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
