import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sora)", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "sans-serif"],
      },
      colors: {
        dark:     "#1a1a1a",
        forest:   "#1B3A35",
        mint:     "#00C9A7",
        yellow:   "#FDE68A",
        lavender: "#C4B5FD",
        muted:    "#888888",
        page:     "#FAF7F2",
        surface:  "#ffffff",
        line:     "#eeeeee",
      },
      borderRadius: {
        card:   "16px",
        btn:    "8px",
        pill:   "99px",
      },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.1), 0 16px 40px rgba(0,0,0,0.08)",
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease forwards",
        "fade-in": "fadeIn 0.3s ease forwards",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
