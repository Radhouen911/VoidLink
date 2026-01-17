import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "/VoidLink/",
  build: {
    outDir: "../../", // Output directly to repository root
    emptyOutDir: false, // Don't empty the entire repo
    assetsDir: "assets", // Keep assets in assets folder
  },
  define: {
    "import.meta.env.VITE_DEMO_MODE": '"true"',
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    watch: {
      usePolling: true,
    },
  },
});
