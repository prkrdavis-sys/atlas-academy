"use client";

import { Analytics } from "@vercel/analytics/next";

export function AppAnalytics() {
  // `@vercel/analytics` pageview uses `window.va.call(...)`. During Next.js /
  // Turbopack HMR, `window.va` can be left as a non-function, which throws
  // `_a.call is not a function` and pops the runtime overlay. The package does
  // not send events in development anyway, so skip mounting there.
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  return <Analytics />;
}
