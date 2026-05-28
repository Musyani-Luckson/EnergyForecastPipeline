import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "favicon-32x32.png",
        "robots.txt",
        "apple-touch-icon.png",
      ],

      manifest: {
        name: "BEFDSS - Building Energy Forecasting and Decision-Support System",

        short_name: "BEFDSS",

        description:
          "A web-based platform for building energy demand forecasting, anomaly detection, visualization, and decision-support using IQR preprocessing and Grid-Search optimized SARIMA models. Powered by Musyani Luckson.",

        start_url: "/",

        display: "standalone",

        background_color: "#0f172a",

        theme_color: "#16a34a",

        orientation: "portrait-primary",

        categories: [
          "productivity",
          "utilities",
          "business",
          "analytics",
          "education",
        ],

        icons: [
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
