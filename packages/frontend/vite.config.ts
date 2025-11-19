import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize build output
    target: "es2020",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true, // Remove debugger statements
        pure_funcs: ["console.log", "console.info"], // Remove specific console methods
      },
      mangle: {
        safari10: true, // Fix Safari 10 issues
      },
    },

    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React and core libraries
          vendor: ["react", "react-dom", "react-router-dom"],

          // UI libraries chunk
          ui: [
            "@heroicons/react",
            "lucide-react",
            "@dnd-kit/core",
            "@dnd-kit/sortable",
            "@dnd-kit/utilities",
          ],

          // State management and utilities
          utils: ["zustand", "axios", "nanoid"],

          // Virtual scrolling libraries
          virtualization: ["react-window", "react-window-infinite-loader"],
        },

        // Optimize chunk file names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId
                .split("/")
                .pop()
                ?.replace(/\.\w+$/, "") || "chunk"
            : "chunk";
          return `assets/js/[name]-[hash].js`;
        },
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split(".") || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || "")) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext || "")) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },

    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,

    // Enable source maps for production debugging (optional)
    sourcemap: process.env.NODE_ENV === "development",

    // Optimize CSS
    cssCodeSplit: true,
    cssMinify: true,
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "axios",
      "zustand",
      "@heroicons/react/24/outline",
      "@heroicons/react/24/solid",
    ],
    exclude: ["@invenflow/shared"], // Don't pre-bundle local packages
  },

  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["staging.ptunicorn.id", "localhost", "127.0.0.1"],
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },

  // Performance optimizations
  esbuild: {
    // Remove console and debugger in production
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
  },

  // Preview configuration for production testing
  preview: {
    port: 4173,
    strictPort: true,
  },
});
