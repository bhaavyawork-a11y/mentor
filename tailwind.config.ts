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
        dark: "#0f0f0f",
        raspberry: "#F2619C",
        lemon: "#EDE986",
        lilac: "#E7BEF8",
        blueberry: "#93ABD9",
        page: "#fdf9f7",
        surface: "#ffffff",
        line: "#f0f0f0",
      },
      borderRadius: {
        "2xl": "14px",
        "3xl": "20px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.1), 0 16px 40px rgba(0,0,0,0.08)",
        float: "0 8px 32px rgba(0,0,0,0.12)",
      },
      fontSize: {
        h1: ["26px", { lineHeight: "1.2", fontWeight: "800" }],
        h2: ["18px", { lineHeight: "1.3", fontWeight: "800" }],
        body: ["13px", { lineHeight: "1.6" }],
        label: ["11px", { lineHeight: "1.4" }],
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
