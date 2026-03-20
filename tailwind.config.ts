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
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#0A0A0F",
          soft: "#14141C",
          muted: "#1E1E2A",
        },
        cream: {
          DEFAULT: "#F5F3EE",
          soft: "#EAE8E2",
          muted: "#D4D0C8",
        },
        sage: {
          DEFAULT: "#4A7C59",
          light: "#6BA67C",
          dark: "#2E5238",
        },
        amber: {
          mentor: "#D4956A",
          light: "#E8B48A",
          dark: "#A86B3E",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.1), 0 16px 40px rgba(0,0,0,0.08)",
        float: "0 8px 32px rgba(0,0,0,0.12)",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease forwards",
        "fade-in": "fadeIn 0.4s ease forwards",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
