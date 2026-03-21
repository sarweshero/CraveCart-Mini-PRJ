/** @type {import('next').NextConfig} */
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
      { protocol: "https", hostname: "vjrfmepmnhgsfstooyik.storage.supabase.co" },
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
          "img-src 'self' data: blob: https://images.unsplash.com https://api.dicebear.com https://vjrfmepmnhgsfstooyik.storage.supabase.co",
          "connect-src 'self' https://localhost:8000 ${NEXT_PUBLIC_API_URL}",
          "frame-ancestors 'none'",
        ].join("; "),
      },
      // Permissions policy — disable unused browser APIs
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self), payment=()",
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
