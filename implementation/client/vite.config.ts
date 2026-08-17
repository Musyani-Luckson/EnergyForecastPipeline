import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",

      includeAssets: [
        "favicon.ico",
        "favicon-16x16.png",
        "favicon-32x32.png",
        "apple-touch-icon.png",
        "robots.txt",
      ],

      manifest: {
        // `id` anchors the app's identity: without it the install is keyed on
        // start_url, so changing that would register as a different app.
        id: "/",

        name: "BEFDSS: Building Energy Forecasting and Decision-Support System",

        short_name: "BEFDSS",

        description:
          "A web-based platform for building energy demand forecasting, anomaly detection, visualization, and decision-support using IQR preprocessing and Grid-Search optimized SARIMA models.",

        start_url: "/",
        scope: "/",
        lang: "en",
        dir: "ltr",

        display: "standalone",
        display_override: ["standalone", "minimal-ui"],

        // Splash background matches the application surface, so launching does
        // not flash a dark panel before the light interface paints. The theme
        // colour matches the navigation chrome.
        background_color: "#f8fafc",
        theme_color: "#0f172a",

        // Charts and the multi-stage evolution timeline are wide; locking the
        // app to portrait would make them unreadable on a phone.
        orientation: "any",

        categories: ["productivity", "utilities", "business"],

        icons: [
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          // Maskable variants carry the safe-zone padding the platforms
          // require, so the launcher can apply its own shape without
          // clipping the badge or leaving square corners behind.
          {
            src: "/maskable-icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],

        shortcuts: [
          { name: "Datasets", short_name: "Datasets", url: "/datasets" },
          { name: "Dashboard", short_name: "Dashboard", url: "/" },
        ],
      },

      workbox: {
        // The API is never cached: forecasts, reports and job status must
        // always come from the server.
        navigateFallbackDenylist: [/^\/api/, /^\/admin/, /^\/media/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
