/**
 * Cooperative yielding so globe canvas paints never stall the animation loop.
 * Auto-rotation and OrbitControls both need a chance to run every frame; a
 * multi-hundred-ms sync texture rebuild freezes the spin and reads as choppy.
 */

const DEFAULT_FRAME_BUDGET_MS = 6;

/** Resolves after the next animation frame has been painted. */
export function yieldToAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export type PaintYieldGate = {
  /** Return false to abort the in-flight paint (newer request won). */
  shouldContinue: () => boolean;
  /**
   * Returns a Promise only when the time-slice is spent (caller must await).
   * Returns void when still inside the budget — do not wrap this in `async`
   * or every call becomes a microtask and the frame still stalls.
   */
  yieldIfNeeded: () => void | Promise<void>;
};

/** Await only when {@link PaintYieldGate.yieldIfNeeded} actually scheduled a frame. */
export async function awaitPaintYield(gate: PaintYieldGate): Promise<void> {
  const wait = gate.yieldIfNeeded();
  if (wait) await wait;
}

/**
 * Builds a yield gate that keeps work under `budgetMs` per animation frame.
 * Call `awaitPaintYield(gate)` between paint batches; check `shouldContinue`
 * after each await to drop cancelled work.
 */
export function createPaintYieldGate(
  shouldContinue: () => boolean,
  budgetMs: number = DEFAULT_FRAME_BUDGET_MS,
): PaintYieldGate {
  let sliceStart = performance.now();
  return {
    shouldContinue,
    yieldIfNeeded() {
      if (!shouldContinue()) return;
      if (performance.now() - sliceStart < budgetMs) return;
      return yieldToAnimationFrame().then(() => {
        sliceStart = performance.now();
      });
    },
  };
}
