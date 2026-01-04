/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        void: {
          black: "#0a0a0f",
          dark: "#1a1a2e",
          purple: "#16213e",
          blue: "#0f3460",
          accent: "#00d4ff",
          success: "#00ff88",
          warning: "#ffaa00",
          danger: "#ff3366",
          text: "#e4e4e7",
          "text-dim": "#a1a1aa",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        display: ["Space Grotesk", "sans-serif"],
      },
      animation: {
        glow: "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px #00d4ff, 0 0 10px #00d4ff" },
          "100%": {
            boxShadow: "0 0 10px #00d4ff, 0 0 20px #00d4ff, 0 0 30px #00d4ff",
          },
        },
      },
    },
  },
  plugins: [],
};
