"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameModeSettingsPageContent } from "@/components/GameModeSettingsPageContent";
import { isValidSetupMode } from "@/lib/game-setup";

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
      router.replace(`/play/setup/mixed?modifier=${modeParam}`);
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
