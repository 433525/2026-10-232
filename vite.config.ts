import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 双入口构建：
 * - `/index.html`  → B 端受控社区（React + Tailwind 4）
 * - `/aplus.html`  → A+ 受理工作台（React + mvp 原生 CSS）
 *
 * 与 232 原版的差异：去掉 `vite-plugin-singlefile`。
 * singlefile 把所有资源内联进单个 HTML，多入口下两份 HTML 会各自内联一份共享
 * 代码（体积翻倍），也没法让 A+ 单独加载自己的样式表。改为常规多入口 + 共享
 * chunk，两个入口才能共用 `src/data` 领域层。
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        community: path.resolve(__dirname, "index.html"),
        aplus: path.resolve(__dirname, "aplus.html"),
      },
    },
  },
});
