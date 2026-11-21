import type { NextConfig } from "next";

/** The API is reached through src/app/rb-api/[...path]/route.ts (API_INTERNAL_URL). */

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["*.trycloudflare.com"],
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
      { source: "/editor/:id", destination: "/user/editor/:id", permanent: false },
      { source: "/cover-letters/:id", destination: "/user/cover-letters/:id", permanent: false },
      // BUG-1223: short and list paths people type or bookmark.
      { source: "/tracker", destination: "/user/jobs/tracker", permanent: false },
      { source: "/user/tracker", destination: "/user/jobs/tracker", permanent: false },
      { source: "/cover-letters", destination: "/user/dashboard#cover-letters", permanent: false },
      { source: "/user/cover-letters", destination: "/user/dashboard#cover-letters", permanent: false },
    ];
  },
};

export default nextConfig;
