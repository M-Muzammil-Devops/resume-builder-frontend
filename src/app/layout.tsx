import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import "./globals.css";
import "./theme.css";
import { ChunkReloadGuard } from "@/components/system/ChunkReloadGuard";
import { CookieConsent } from "@/components/consent/CookieConsent";
import { SiteBanner } from "@/components/system/SiteBanner";

export const metadata: Metadata = {
  title: "ResumeBuilder",
  description:
    "Build ATS-friendly resumes with live editing, templates, job tracking, and AI improvements.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

/** BUG-1320: UI + resume fonts via next/font (no legacy @font-face, no second download). */
const raleway = localFont({
  src: [
    { path: "../../public/fonts/Raleway-Regular.woff", weight: "400", style: "normal" },
    { path: "../../public/fonts/Raleway-Bold.woff", weight: "700", style: "normal" },
  ],
  variable: "--font-raleway",
  display: "swap",
  fallback: ["Segoe UI", "system-ui", "sans-serif"],
});
const montserrat = localFont({
  src: [
    { path: "../../public/fonts/Montserrat-Regular.woff", weight: "400", style: "normal" },
    { path: "../../public/fonts/Montserrat-Bold.woff", weight: "700", style: "normal" },
  ],
  variable: "--font-montserrat",
  display: "swap",
  preload: false,
  fallback: ["Segoe UI", "system-ui", "sans-serif"],
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Day/Night: a tiny external script (CSP nonce, no inline code) sets <html data-theme> before first paint.
  const nonce = (await headers()).get("x-nonce") || undefined;
  return (
    <html lang="en" className={`${raleway.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <head>
        {/* Must block first paint, or the page flashes the wrong theme. The file is ~400 bytes and cached. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-init.js" nonce={nonce} />
      </head>
      <body className="min-h-screen antialiased">
        <ChunkReloadGuard />
        <SiteBanner />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
