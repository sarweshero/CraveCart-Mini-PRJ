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
    apiOrigin,
    supabaseOrigin,
    supabaseWsOrigin,
  ])
).join(" ");

const nextConfig = {
  
  // FIX FE-CUS-3: Don't expose the tech stack to clients
  poweredByHeader: false,

  // FIX FE-CUS-5: Enable gzip/brotli compression
  compress: true,

  // ── Image optimisation ───────────────────────────────────────────────────
  images: {
    // FIX FE-CUS-6: Added Supabase storage domain for user/food images
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: supabaseStorageHostname },
      { protocol: "https", hostname: supabaseHostname },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },

  // ── FIX FE-CUS-4: Security headers applied to every response ─────────────
  async headers() {
    const securityHeaders = [
      // Prevent clickjacking
      { key: "X-Frame-Options",        value: "DENY" },
      // Block MIME-type sniffing
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Full referrer only for same-origin, origin-only cross-origin
      { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
      // Only load resources from trusted origins
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          `img-src 'self' data: blob: https://images.unsplash.com https://api.dicebear.com ${supabaseOrigin} https://${supabaseStorageHostname}`,
          `connect-src ${connectSrc}`,
          "frame-ancestors 'none'",
        ].join("; "),
      },
      // Permissions policy — disable unused browser APIs
      {
        key: "Permissions-Policy",
        value: "camera=(self), microphone=(), geolocation=(self), payment=()",
      },
    ];

    return [{ source: "/(.*)", headers: securityHeaders }];
  },

  // ── Redirects ────────────────────────────────────────────────────────────
  async redirects() {
    return [
      // Redirect root to home if you ever accidentally hit /index
      {
        source:      "/index",
        destination: "/",
        permanent:   true,
      },
    ];
  },

  // ── Webpack (production optimisations) ───────────────────────────────────
  webpack(config, { isServer }) {
    // Drop unused moment.js locales if any dep uses it
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
