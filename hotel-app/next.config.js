/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.sarweshero.me";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vjrfmepmnhgsfstooyik.supabase.co";
const apiOrigin = (() => {
  try {
    return new URL(apiUrl).origin;
  } catch {
    return "https://api.sarweshero.me";
  }
})();
const supabaseOrigin = (() => {
  try {
    return new URL(supabaseUrl).origin;
  } catch {
    return "https://vjrfmepmnhgsfstooyik.supabase.co";
  }
})();
const supabaseHostname = (() => {
  try {
    return new URL(supabaseOrigin).hostname;
  } catch {
    return "vjrfmepmnhgsfstooyik.supabase.co";
  }
})();
const supabaseStorageHostname = supabaseHostname.replace(".supabase.co", ".storage.supabase.co");
const supabaseWsOrigin = supabaseOrigin.replace(/^http/i, "ws");
const connectSrc = Array.from(
  new Set([
    "'self'",
    "http://localhost:8000",
    "https://localhost:8000",
    "https://api.sarweshero.me",
    apiOrigin,
    supabaseOrigin,
    supabaseWsOrigin,
  ])
).join(" ");

const nextConfig = {
  poweredByHeader: false,
  compress: true,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: supabaseStorageHostname },
      { protocol: "https", hostname: supabaseHostname },
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
          `img-src 'self' data: blob: https://images.unsplash.com https://source.unsplash.com https://api.dicebear.com ${supabaseOrigin} https://${supabaseStorageHostname}`,
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
