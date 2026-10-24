import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        faint: "rgb(var(--c-faint) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        raised: "rgb(var(--c-raised) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        aurora: "rgb(var(--c-aurora) / <alpha-value>)",
        ice: "rgb(var(--c-ice) / <alpha-value>)",
        solar: "rgb(var(--c-solar) / <alpha-value>)",
        rain: "rgb(var(--c-rain) / <alpha-value>)",
        danger: "rgb(var(--c-danger) / <alpha-value>)",
        success: "rgb(var(--c-success) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-heading)", "var(--font-body)", "system-ui", "sans-serif"],
        bengali: ["var(--font-bengali)", "var(--font-bengali-fallback)", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        "4xl": "2rem",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      boxShadow: {
        glass: "0 1px 2px rgb(var(--shadow-color) / 0.12), 0 16px 40px -28px rgb(var(--shadow-color) / 0.28)",
        lift: "0 12px 32px -22px rgb(var(--shadow-color) / 0.34)",
        glow: "0 0 0 1px rgb(var(--c-aurora) / 0.18)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translate3d(0, 12px, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        shimmer: {
          "0%": { transform: "translate3d(-100%, 0, 0)" },
          "100%": { transform: "translate3d(100%, 0, 0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
        "drift-x": {
          "0%, 100%": { transform: "translate3d(-2%, 0, 0)" },
          "50%": { transform: "translate3d(2%, 0, 0)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        flash: {
          "0%, 92%, 100%": { opacity: "0" },
          "93%": { opacity: "0.65" },
          "94%": { opacity: "0.1" },
          "95%": { opacity: "0.8" },
          "96%": { opacity: "0" },
        },
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -8px, 0)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.2" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.6s linear infinite",
        "pulse-soft": "pulse-soft 4s ease-in-out infinite",
        "drift-x": "drift-x 26s ease-in-out infinite",
        "spin-slow": "spin-slow 40s linear infinite",
        flash: "flash 9s linear infinite",
        float: "float 6s ease-in-out infinite",
        twinkle: "twinkle 4s ease-in-out infinite",
      },
      screens: {
        xs: "400px",
        "3xl": "1800px",
      },
      spacing: {
        safe: "env(safe-area-inset-bottom, 0px)",
      },
    },
  },
  plugins: [],
};

export default config;
