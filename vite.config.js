import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        // Use babel.config.js files
        configFile: true,
      },
    }),
    svgr(),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
