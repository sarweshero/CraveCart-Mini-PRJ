/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.sarweshero.me";
const apiOrigin = (() => {
  try {
    return new URL(apiUrl).origin;
  } catch {
    return "https://api.sarweshero.me";
  }
})();
const connectSrc = Array.from(
  new Set([
    "'self'",
    "http://localhost:8000",
    "https://localhost:8000",
    "https://api.sarweshero.me",
    apiOrigin,
  ])
).join(" ");

const nextConfig = {
  poweredByHeader: false,
  compress: true,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "vjrfmepmnhgsfstooyik.storage.supabase.co" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },

  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options",        value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https://images.unsplash.com https://api.dicebear.com https://vjrfmepmnhgsfstooyik.storage.supabase.co",
          `connect-src ${connectSrc}`,
          "frame-ancestors 'none'",
        ].join("; "),
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
    ];
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
