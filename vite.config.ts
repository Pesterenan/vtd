/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  root: "src",
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: 'ws',
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  base: "./",
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(dirname, "src/index.html"),
        videoFrameExtractor: path.resolve(dirname, "src/modals/videoFrameExtractor/video-frame-extractor.html"),
      },
    },
    target:
      process.env.TAURI_ENV_PLATFORM == 'windows'
        ? 'chrome105'
        : 'es2020',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    watch: false,
    setupFiles: [path.resolve(dirname, "vitest.setup.ts")],
    css: false,
  },
  resolve: {
    alias: {
      "src": path.resolve(dirname, "src"),
      "@": path.resolve(dirname, "src"),
      "@@": path.resolve(dirname),
      ...(process.env.VITEST ? {
        "\\.(jpg|jpeg|png|gif|svg)$": path.resolve(dirname, "__mocks__/fileMock.ts"),
      } : {}),
    },
  },
});
