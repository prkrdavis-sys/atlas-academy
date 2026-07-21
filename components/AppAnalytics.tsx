"use client";

import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";

export function AppAnalytics() {
  return (
    <>
      <Script id="vercel-analytics-queue" strategy="beforeInteractive">
        {`window.vaq=window.vaq||[];if(typeof window.va!=="function"){window.va=function(){window.vaq.push(arguments);};}`}
      </Script>
      <Analytics />
    </>
  );
}
