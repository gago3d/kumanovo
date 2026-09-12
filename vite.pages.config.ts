import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const root = import.meta.dirname;

function copyMapLibreWorkers(): Plugin {
  return {
    name: "copy-maplibre-workers",
    closeBundle() {
      const distA = resolve(root, "pages-dist/a");
      const src = resolve(root, "node_modules/maplibre-gl/dist");
      mkdirSync(distA, { recursive: true });
      for (const name of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
        copyFileSync(resolve(src, name), resolve(distA, name));
      }
    },
  };
}

export default defineConfig({
  base: "./",
  root: resolve(root, "host"),
  publicDir: false,
  plugins: [tailwindcss(), viteReact(), copyMapLibreWorkers()],
  resolve: {
    alias: { "@": resolve(root, "src") },
  },
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  build: {
    outDir: resolve(root, "pages-dist"),
    emptyOutDir: true,
    assetsDir: "a",
    sourcemap: false,
  },
});
