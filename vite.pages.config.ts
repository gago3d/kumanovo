import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = import.meta.dirname;

export default defineConfig({
  base: "./",
  root: resolve(root, "host"),
  publicDir: false,
  plugins: [tailwindcss(), viteReact()],
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
