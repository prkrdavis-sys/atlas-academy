"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameModeSettingsPageContent } from "@/components/GameModeSettingsPageContent";
import { isValidGameMode } from "@/lib/game-setup";

function GameModeSettingsPageInner() {
  const params = useParams<{ mode: string }>();
  const router = useRouter();
  const modeParam = params.mode;

  useEffect(() => {
    if (!isValidGameMode(modeParam)) {
      router.replace("/play/setup");
    }
  }, [modeParam, router]);

  if (!isValidGameMode(modeParam)) {
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
