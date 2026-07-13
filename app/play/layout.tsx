"use client";

import { useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ProfileRequiredDialog } from "@/components/ProfileRequiredDialog";
import { useProfiles } from "@/components/ProfileProvider";

export default function PlayLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { activeProfile, hydrated } = useProfiles();
  const returnHome = useCallback(() => router.push("/"), [router]);

  if (!hydrated) {
    return null;
  }

  if (!activeProfile) {
    return <ProfileRequiredDialog open onClose={returnHome} />;
  }

  return children;
}
