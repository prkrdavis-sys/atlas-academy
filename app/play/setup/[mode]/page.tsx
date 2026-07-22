"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameModeSettingsPageContent } from "@/components/GameModeSettingsPageContent";
import { isValidSetupMode } from "@/lib/game-setup";
import { getStoredScope } from "@/lib/scope";

function GameModeSettingsPageInner() {
  const params = useParams<{ mode: string }>();
  const router = useRouter();
  const modeParam = params.mode;

  useEffect(() => {
    if (modeParam === "daily-challenge") {
      router.replace("/");
      return;
    }
    if (modeParam === "speed-round" || modeParam === "marathon") {
      const params = new URLSearchParams({ modifier: modeParam });
      if (getStoredScope() === "usa") {
        params.set("scope", "usa");
      }
      router.replace(`/play/setup/mixed?${params.toString()}`);
      return;
    }
    if (!isValidSetupMode(modeParam)) {
      router.replace("/play/setup");
    }
  }, [modeParam, router]);

  if (!isValidSetupMode(modeParam)) {
    return null;
  }

  return <GameModeSettingsPageContent mode={modeParam} />;
}

export default function GameModeSettingsPage() {
  return (
    <Suspense>
      <GameModeSettingsPageInner />
    </Suspense>
  );
}
