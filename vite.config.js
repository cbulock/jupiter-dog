import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        // Use babel.config.js files
        configFile: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
