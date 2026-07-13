export type StreakTier = {
  level: number;
  emoji: string;
  label: string;
  gamePanelClass: string;
  gameLabelClass: string;
  heroPanelClass: string;
};

const STREAK_TIERS: StreakTier[] = [
  {
    level: 0,
    emoji: "✨",
    label: "Streak",
    gamePanelClass:
      "border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-900/90",
    gameLabelClass: "text-slate-500 dark:text-slate-400",
    heroPanelClass: "border border-white/15 bg-white/20",
  },
  {
    level: 1,
    emoji: "🔥",
    label: "Warming up",
    gamePanelClass:
      "border-amber-300 bg-gradient-to-b from-amber-50 to-orange-50 shadow-[inset_0_0_0_1px_rgb(251_191_36_/_0.35)] dark:border-amber-600 dark:from-amber-950/50 dark:to-orange-950/40",
    gameLabelClass: "text-amber-600 dark:text-amber-400",
    heroPanelClass:
      "border-2 border-amber-300/80 bg-white/25 shadow-[0_0_12px_rgb(251_191_36_/_0.25)]",
  },
  {
    level: 2,
    emoji: "🌶️",
    label: "Heating up",
    gamePanelClass:
      "border-amber-400 bg-gradient-to-b from-amber-50 to-orange-100 shadow-[inset_0_0_0_1px_rgb(251_191_36_/_0.45)] dark:border-amber-500 dark:from-amber-950/60 dark:to-orange-950/50",
    gameLabelClass: "text-orange-600 dark:text-orange-400",
    heroPanelClass:
      "border-2 border-amber-400/90 bg-white/28 shadow-[0_0_14px_rgb(251_146_60_/_0.3)]",
  },
  {
    level: 3,
    emoji: "♨️",
    label: "Steaming",
    gamePanelClass:
      "border-orange-400 bg-gradient-to-b from-orange-50 to-orange-100 shadow-[inset_0_0_0_1px_rgb(251_146_60_/_0.45)] dark:border-orange-600 dark:from-orange-950/50 dark:to-red-950/40",
    gameLabelClass: "text-orange-600 dark:text-orange-400",
    heroPanelClass:
      "border-2 border-orange-400/90 bg-white/30 shadow-[0_0_16px_rgb(251_146_60_/_0.35)]",
  },
  {
    level: 4,
    emoji: "🌡️",
    label: "Hot streak",
    gamePanelClass:
      "border-orange-500 bg-gradient-to-b from-orange-50 to-red-50 shadow-[inset_0_0_0_1px_rgb(249_115_22_/_0.5)] dark:border-orange-500 dark:from-orange-950/60 dark:to-red-950/50",
    gameLabelClass: "text-orange-700 dark:text-orange-300",
    heroPanelClass:
      "border-2 border-orange-500/95 bg-white/32 shadow-[0_0_18px_rgb(249_115_22_/_0.4)]",
  },
  {
    level: 5,
    emoji: "🧨",
    label: "Blazing",
    gamePanelClass:
      "border-orange-600 bg-gradient-to-b from-orange-100 to-red-100 shadow-[0_0_10px_rgb(234_88_12_/_0.2),inset_0_0_0_1px_rgb(234_88_12_/_0.35)] dark:border-orange-500 dark:from-orange-950/70 dark:to-red-950/60 dark:shadow-[0_0_12px_rgb(234_88_12_/_0.25)]",
    gameLabelClass: "text-orange-700 dark:text-orange-300",
    heroPanelClass:
      "border-2 border-orange-600 bg-white/34 shadow-[0_0_20px_rgb(234_88_12_/_0.45)]",
  },
  {
    level: 6,
    emoji: "🌋",
    label: "Volcanic",
    gamePanelClass:
      "border-red-400 bg-gradient-to-b from-orange-100 to-red-100 shadow-[0_0_12px_rgb(248_113_113_/_0.25),inset_0_0_0_1px_rgb(248_113_113_/_0.4)] dark:border-red-500 dark:from-red-950/60 dark:to-orange-950/50 dark:shadow-[0_0_14px_rgb(248_113_113_/_0.3)]",
    gameLabelClass: "text-red-600 dark:text-red-400",
    heroPanelClass:
      "border-2 border-red-400 bg-white/36 shadow-[0_0_22px_rgb(248_113_113_/_0.5)]",
  },
  {
    level: 7,
    emoji: "☄️",
    label: "Meteoric",
    gamePanelClass:
      "border-red-500 bg-gradient-to-b from-red-50 to-red-100 shadow-[0_0_14px_rgb(239_68_68_/_0.3),inset_0_0_0_1px_rgb(239_68_68_/_0.45)] dark:border-red-500 dark:from-red-950/70 dark:to-red-900/50 dark:shadow-[0_0_16px_rgb(239_68_68_/_0.35)]",
    gameLabelClass: "text-red-600 dark:text-red-400",
    heroPanelClass:
      "border-2 border-red-500 bg-white/38 shadow-[0_0_24px_rgb(239_68_68_/_0.55)]",
  },
  {
    level: 8,
    emoji: "💥",
    label: "Explosive",
    gamePanelClass:
      "border-red-600 bg-gradient-to-b from-red-100 to-rose-100 shadow-[0_0_16px_rgb(220_38_38_/_0.35),inset_0_0_0_1px_rgb(220_38_38_/_0.5)] dark:border-red-600 dark:from-red-950/80 dark:to-rose-950/60 dark:shadow-[0_0_18px_rgb(220_38_38_/_0.4)]",
    gameLabelClass: "text-red-700 dark:text-red-300",
    heroPanelClass:
      "border-2 border-red-600 bg-white/40 shadow-[0_0_26px_rgb(220_38_38_/_0.6)]",
  },
  {
    level: 9,
    emoji: "☀️",
    label: "Solar heat",
    gamePanelClass:
      "border-rose-500 bg-gradient-to-b from-amber-100 via-orange-100 to-red-100 shadow-[0_0_18px_rgb(244_63_94_/_0.35),inset_0_0_0_1px_rgb(244_63_94_/_0.45)] dark:border-rose-500 dark:from-amber-950/70 dark:via-orange-950/60 dark:to-red-950/70 dark:shadow-[0_0_20px_rgb(244_63_94_/_0.4)]",
    gameLabelClass: "text-rose-600 dark:text-rose-400",
    heroPanelClass:
      "border-2 border-rose-500 bg-white/42 shadow-[0_0_28px_rgb(244_63_94_/_0.65)]",
  },
  {
    level: 10,
    emoji: "🏆",
    label: "Legendary",
    gamePanelClass:
      "border-amber-500 bg-gradient-to-b from-amber-100 via-orange-100 to-red-100 shadow-[0_0_20px_rgb(245_158_11_/_0.4),inset_0_0_0_1px_rgb(245_158_11_/_0.5)] dark:border-amber-400 dark:from-amber-950/80 dark:via-orange-950/70 dark:to-red-950/80 dark:shadow-[0_0_22px_rgb(245_158_11_/_0.45)]",
    gameLabelClass: "text-amber-700 dark:text-amber-300",
    heroPanelClass:
      "border-2 border-amber-400 bg-white/44 shadow-[0_0_30px_rgb(245_158_11_/_0.7)]",
  },
];

export function getStreakTier(streak: number): StreakTier {
  const level = Math.min(Math.floor(streak / 5), STREAK_TIERS.length - 1);
  return STREAK_TIERS[level] ?? STREAK_TIERS[0];
}
