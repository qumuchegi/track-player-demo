import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  base: "./",                 // ⭐ 非常重要：支持相对路径部署

  build: {
    outDir: "dist",           // ✅ 明确输出到 dist
    assetsDir: "assets",
    sourcemap: false
  },

  resolve: {
    alias: {
      cesium: path.resolve(__dirname, "node_modules/cesium")
    }
  },

  define: {
    CESIUM_BASE_URL: JSON.stringify("/cesium")
  }
});
