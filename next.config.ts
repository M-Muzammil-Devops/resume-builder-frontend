import type { NextConfig } from "next";

/** The API is reached through src/app/rb-api/[...path]/route.ts (API_INTERNAL_URL). */

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // QA run3 (10b): host nginx compresses (brotli for browsers, gzip fallback). When Next gzipped first, nginx
  // passed the gzip body through untouched, so browsers never got brotli. Local `next start` is uncompressed.
  compress: false,
  // Docker image only (the Dockerfile sets NEXT_STANDALONE=1): self-contained server in .next/standalone.
  ...(process.env.NEXT_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  allowedDevOrigins: ["*.trycloudflare.com"],
  experimental: {
    // Audio tool uploads (100 MB + multipart overhead) pass through the proxy layer.
    proxyClientMaxBodySize: "110mb",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // BUG-1404: two years. Add "; preload" only once the final domain is chosen (owner decision).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // Content-Security-Policy is set per request with a nonce in src/proxy.ts (BUG-916).
        ],
      },
    ];
  },
  /** The user area lives under /user. Old paths keep working (temporary redirects keep query strings). */
  async redirects() {
    return [
      { source: "/user", destination: "/user/dashboard", permanent: false },
      { source: "/dashboard", destination: "/user/dashboard", permanent: false },
      { source: "/settings", destination: "/user/settings", permanent: false },
      { source: "/jobs/:path*", destination: "/user/jobs/:path*", permanent: false },
      { source: "/editor/local-demo", destination: "/user/dashboard", permanent: false },
      { source: "/editor/:id", destination: "/user/editor/:id", permanent: false },
      { source: "/cover-letters/:id", destination: "/user/cover-letters?id=:id", permanent: false },
      { source: "/user/cover-letters/:id", destination: "/user/cover-letters?id=:id", permanent: false },
      // BUG-1223: short and list paths people type or bookmark.
      { source: "/tracker", destination: "/user/tracker", permanent: false },
      // Tracker and Auto Apply moved out of /user/jobs/* into the User Dashboard shell.
      { source: "/user/jobs/tracker", destination: "/user/tracker", permanent: false },
      { source: "/user/jobs/auto-apply", destination: "/user/auto-apply", permanent: false },
      { source: "/auto-apply", destination: "/user/auto-apply", permanent: false },
      { source: "/cover-letters", destination: "/user/cover-letters", permanent: false },
      // The AI Voice Cleaner tool was retired; old links land on Remove Background Noise.
      { source: "/tools/ai-voice-cleaner", destination: "/tools/audio-noise-remover", permanent: true },
      { source: "/tools/noise-remover", destination: "/tools/audio-noise-remover", permanent: false },
      // The browser-only "local editor" demo was removed.
      { source: "/user/editor/local-demo", destination: "/user/dashboard", permanent: false },
      // "Edit PDF" duplicated the PDF Editor (QA run3, 3a).
      { source: "/tools/pdf/edit", destination: "/tools/pdf/pdf-editor", permanent: false },
      // People type /signup; the create-account page is /register.
      { source: "/signup", destination: "/register", permanent: true },
    ];
  },
};

export default nextConfig;
