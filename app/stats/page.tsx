"use client";

import { useProfiles } from "@/components/ProfileProvider";
import { GAME_MODES, ACHIEVEMENTS } from "@/lib/types";

export default function StatsPage() {
  const { activeProfile } = useProfiles();

  if (!activeProfile) {
    return (
      <div className="rounded-3xl border-2 border-slate-200 bg-white/90 p-8 text-center shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <p className="text-slate-600 dark:text-slate-400">Create a profile to see your stats.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Stats for {activeProfile.name}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">Track your streaks and accuracy across all game modes.</p>
      </div>

      <div className="grid gap-3 sm:hidden">
        {GAME_MODES.map((mode, index) => {
          const stats = activeProfile.stats[mode.id];
          const accuracy =
            stats.totalPlayed > 0
              ? Math.round((stats.totalCorrect / stats.totalPlayed) * 100)
              : 0;
          return (
            <article
              key={mode.id}
              className={`rounded-2xl border-2 border-slate-200 p-4 shadow-sm backdrop-blur dark:border-slate-700 ${index % 2 === 1 ? "bg-slate-100/95 dark:bg-slate-800/95" : "bg-white/90 dark:bg-slate-900/90"}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>{mode.icon}</span>
                <h2 className="min-w-0 flex-1 font-display text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {mode.title}
                </h2>
                <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">{accuracy}%</span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Streak</dt>
                  <dd className="font-mono text-lg font-bold text-slate-800 dark:text-slate-200">{stats.currentStreak}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Best</dt>
                  <dd className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-400">{stats.bestStreak}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Played</dt>
                  <dd className="font-mono text-lg font-bold text-slate-800 dark:text-slate-200">{stats.totalPlayed}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      <div className="hidden rounded-3xl border-2 border-slate-200 bg-white/90 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:block">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-700 [&_th]:sticky [&_th]:top-[calc(4rem+env(safe-area-inset-top))] [&_th]:z-10 [&_th]:bg-slate-50 [&_th]:shadow-[0_1px_0_0_rgb(226_232_240)] dark:[&_th]:bg-slate-800 dark:[&_th]:shadow-[0_1px_0_0_rgb(51_65_85)]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Mode</th>
              <th className="px-4 py-3 text-right font-semibold">Current Streak</th>
              <th className="px-4 py-3 text-right font-semibold">Best Streak</th>
              <th className="px-4 py-3 text-right font-semibold">Accuracy</th>
              <th className="px-4 py-3 text-right font-semibold">Played</th>
            </tr>
          </thead>
          <tbody>
            {GAME_MODES.map((mode) => {
              const stats = activeProfile.stats[mode.id];
              const accuracy =
                stats.totalPlayed > 0
                  ? Math.round((stats.totalCorrect / stats.totalPlayed) * 100)
                  : 0;
              return (
                <tr key={mode.id} className="border-b border-slate-100 even:bg-slate-100/80 dark:border-slate-800 dark:even:bg-slate-800/80">
                  <td className="px-4 py-3">
                    <span className="mr-2">{mode.icon}</span>
                    {mode.title}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{stats.currentStreak}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700 dark:text-emerald-400">{stats.bestStreak}</td>
                  <td className="px-4 py-3 text-right">{accuracy}%</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{stats.totalPlayed}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-[1.75rem] border-2 border-slate-200 bg-white/90 p-4 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:p-6">
        <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-10 -mx-4 mb-4 flex items-baseline justify-between gap-3 border-b border-slate-200 bg-slate-50/95 px-4 pb-4 backdrop-blur-xl shadow-[0_1px_0_0_rgb(226_232_240)] dark:border-slate-700 dark:bg-slate-800/95 dark:shadow-[0_1px_0_0_rgb(51_65_85)] sm:-mx-6 sm:px-6">
          <h2 className="font-semibold">Achievements</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {activeProfile.achievements.length} / {ACHIEVEMENTS.length} unlocked
          </p>
        </div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {ACHIEVEMENTS.map((achievement) => {
            const earned = activeProfile.achievements.includes(achievement.id);
            return (
              <div
                key={achievement.id}
                className={`min-w-[16rem] snap-start rounded-xl border px-4 py-3 sm:min-w-0 ${earned ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50" : "border-slate-200 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-800"}`}
              >
                <p className="font-medium">{earned ? "🏆" : "🔒"} {achievement.title}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{achievement.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
