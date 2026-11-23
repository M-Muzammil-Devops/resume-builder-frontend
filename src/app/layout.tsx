import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ChunkReloadGuard } from "@/components/system/ChunkReloadGuard";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${raleway.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ChunkReloadGuard />
        {children}
      </body>
    </html>
  );
}
