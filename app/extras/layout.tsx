import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore | Atlas Academy",
  description:
    "Reference tools — browse the Library, explore the World and USA maps, and customize your game setup.",
};

export default function ExtrasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
