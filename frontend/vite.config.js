// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import viteCompression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";

  return {
    plugins: [
      react(),
      viteCompression(), // gzip compression for production
      VitePWA({
        registerType: "autoUpdate",
        manifest: {
          name: "FeedbackApp",
          short_name: "Feedback",
          description: "Student Feedback & Admin Analytics Platform",
          theme_color: "#1e3a8a",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@components": path.resolve(__dirname, "src/components"),
        "@pages": path.resolve(__dirname, "src/pages"),
        "@utils": path.resolve(__dirname, "src/utils"),
        "@assets": path.resolve(__dirname, "src/assets"),
      },
    },
    server: {
      port: 3000,
      open: true,
      cors: true,
      proxy: {
        "/api": {
          target: process.env.VITE_API_URL || "http://localhost:5000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      sourcemap: !isProduction,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              return "vendor";
            }
          },
        },
      },
      chunkSizeWarningLimit: 2000,
    },
    define: {
      "process.env": process.env, // for using env variables in frontend
    },
  };
});
