import { Suspense } from "react";
import { DailyChallengeLeaderboard } from "@/components/DailyChallengeLeaderboard";

export default function DailyChallengePage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm font-semibold text-slate-500">Loading daily challenge…</p>}>
      <DailyChallengeLeaderboard />
    </Suspense>
  );
}
