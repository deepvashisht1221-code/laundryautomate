/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        xs: ["12px", { lineHeight: "1.4" }],
        sm: ["14px", { lineHeight: "1.5" }],
        base: ["16px", { lineHeight: "1.55" }],
        lg: ["20px", { lineHeight: "1.4" }],
        xl: ["24px", { lineHeight: "1.3" }],
        "2xl": ["32px", { lineHeight: "1.2" }],
      },
      colors: {
        ink: "var(--ink)",
        surface: "var(--surface)",
        "surface-variant": "var(--surface-variant)",
        card: "var(--card)",
        line: "var(--line)",
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          soft: "var(--primary-soft)",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--ink)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        border: "var(--line)",
        input: "var(--line)",
        ring: "var(--primary)",
        background: "var(--surface)",
        foreground: "var(--ink)",
      },
      borderRadius: {
        card: "12px",
        control: "8px",
      },
      spacing: {
        screen: "20px",
      },
      boxShadow: {
        float: "0 8px 24px -8px rgb(16 38 44 / 0.18)",
        "elevation-1": "0 1px 3px rgb(16 38 44 / 0.22), 0 4px 10px -2px rgb(16 38 44 / 0.20)",
        "elevation-2": "0 2px 6px rgb(16 38 44 / 0.24), 0 8px 20px -4px rgb(16 38 44 / 0.22)",
        "elevation-3": "0 4px 10px rgb(16 38 44 / 0.26), 0 12px 28px -6px rgb(16 38 44 / 0.24)",
      },
      maxWidth: {
        app: "480px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
