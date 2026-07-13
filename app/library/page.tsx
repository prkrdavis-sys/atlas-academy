import type { Metadata } from "next";
import { LibraryBrowser } from "@/components/LibraryBrowser";

export const metadata: Metadata = {
  title: "Country Library | Atlas Academy",
  description: "Browse country flags, shapes, capitals, populations, neighbors, and facts.",
};

export default function LibraryPage() {
  return <LibraryBrowser />;
}
