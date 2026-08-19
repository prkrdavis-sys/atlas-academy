/**
 * Probing for WebGL support costs a real GL context. Browsers cap how many can
 * exist at once (mobile Safari allows only a handful) and evict the oldest when
 * the cap is hit — which would kill the live globe canvas. So the probe context
 * is released immediately and the answer is cached for the session.
 */
let cachedSupport: boolean | null = null;

/** Returns whether the current environment can create a WebGL context. */
export function supportsWebGL(): boolean {
  if (typeof document === "undefined") return false;
  if (cachedSupport !== null) return cachedSupport;

  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (gl) {
      // Hand the context back to the browser instead of waiting for GC.
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
    cachedSupport = Boolean(gl);
  } catch {
    cachedSupport = false;
  }

  return cachedSupport;
}
