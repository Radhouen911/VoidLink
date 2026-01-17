/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        void: {
          // Modern dark theme - Telegram/Signal inspired
          black: "#0e1621",
          dark: "#17212b",
          purple: "#2b5278",
          blue: "#0088cc",
          accent: "#0088cc",
          success: "#4caf50",
          warning: "#ff9800",
          danger: "#f44336",
          text: "#ffffff",
          "text-dim": "#8b98a5",
          "text-secondary": "#6c7883",
          border: "#2b5278",
          "border-light": "#1f2c38",
          hover: "#1f2c38",
          active: "#2b5278",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        display: ["Space Grotesk", "sans-serif"],
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
      },
    },
  },
  plugins: [],
};
