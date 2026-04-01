import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/pages/**/*.{js,ts,jsx,tsx,mdx}","./src/components/**/*.{js,ts,jsx,tsx,mdx}","./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "#0A0C0F", card: "#111318", elevated: "#181C22", border: "#1F2430" },
        brand: { DEFAULT: "#E8A830", dim: "#C48918", bright: "#F5C842" },
        success: { DEFAULT: "#22C55E", dim: "#16A34A" },
        danger: { DEFAULT: "#EF4444" },
        ink: { DEFAULT: "#F1EDE4", muted: "#9CA3AF", faint: "#4B5563" },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease forwards",
        "fade-in": "fadeIn 0.3s ease forwards",
        shimmer: "shimmer 2s infinite linear",
      },
      keyframes: {
        fadeUp: { "0%": { opacity:"0", transform:"translateY(16px)" }, "100%": { opacity:"1", transform:"translateY(0)" } },
        fadeIn: { "0%": { opacity:"0" }, "100%": { opacity:"1" } },
        shimmer: { "0%": { backgroundPosition:"-200% 0" }, "100%": { backgroundPosition:"200% 0" } },
      },
      boxShadow: {
        brand: "0 0 30px rgba(232,168,48,0.2)",
        success: "0 0 30px rgba(34,197,94,0.2)",
        card: "0 4px 24px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
