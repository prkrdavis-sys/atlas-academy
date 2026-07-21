import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono, Nunito } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { ProfileProvider } from "@/components/ProfileProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Atlas Academy",
  description: "Learn world geography with flags, capitals, shapes, and more at Atlas Academy.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Atlas Academy",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${geistSans.variable} ${geistMono.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ThemeProvider>
          <ProfileProvider>
            <a
              href="#main-content"
              className="fixed left-3 top-3 z-[70] -translate-y-20 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-transform focus:translate-y-0 dark:bg-slate-100 dark:text-slate-900"
            >
              Skip to content
            </a>
            <AppShell>{children}</AppShell>
          </ProfileProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
