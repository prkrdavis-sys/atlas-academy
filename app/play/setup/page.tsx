"use client";

import { Suspense } from "react";
import { GameSetupPageContent } from "@/components/GameSetupPageContent";

export default function GameSetupPage() {
  return (
    <Suspense>
      <GameSetupPageContent />
    </Suspense>
  );
}
