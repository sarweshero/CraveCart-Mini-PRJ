import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/pages/**/*.{js,ts,jsx,tsx,mdx}","./src/components/**/*.{js,ts,jsx,tsx,mdx}","./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "#FAFAF8", card: "#FFFFFF", elevated: "#F5F3EE" },
        accent: { DEFAULT: "#D97706", light: "#FEF3C7", dark: "#B45309" },
        stone: { text: "#1C1917", muted: "#57534E", faint: "#A8A29E" },
        border: { DEFAULT: "#E7E5E0" },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-dm)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
