import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Extras | Atlas Academy",
  description:
    "Bonus quiz modes — practice weak spots, pick flags, border neighbors, and population showdowns.",
};

export default function ExtrasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
