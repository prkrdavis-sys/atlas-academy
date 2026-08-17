"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type GameCrashBoundaryProps = {
  children: ReactNode;
  onRetry: () => void;
};

type GameCrashBoundaryState = {
  hasError: boolean;
};

/**
 * Recovers a mid-round React crash without wiping the persisted snapshot.
 * Retry remounts GameBoard, which hydrates from localStorage.
 */
export class GameCrashBoundary extends Component<GameCrashBoundaryProps, GameCrashBoundaryState> {
  state: GameCrashBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GameCrashBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl border-2 border-slate-200 bg-white/90 p-8 text-center shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
          <p className="font-display text-2xl font-extrabold">Round interrupted</p>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Your streak and mastery are saved. Resume to pick up where you left off.
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onRetry();
            }}
          >
            Resume round
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
