import type { Metadata } from "next";
import { LibraryBrowser } from "@/components/LibraryBrowser";
import { normalizeScope } from "@/lib/scope";

export const metadata: Metadata = {
  title: "Library | Atlas Academy",
  description:
    "Browse flags, shapes, capitals, populations, neighbors, and facts for every country and US state.",
};

type LibraryPageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const { scope } = await searchParams;
  const normalized = normalizeScope(scope);
  // Remount on scope change so the region filter resets to "All".
  return <LibraryBrowser key={normalized} scope={normalized} />;
}
