# P1 骨架阶段 · 开源调研

调研日期：2026-10-23。目标：把 232 的单入口 React 应用改成「`/` B 端 + `/aplus.html` A+ 端」双入口构建，两端共享一份 `src/data/` 领域层。

## 候选

| # | 候选 | 许可 | 与本阶段的关系 |
|---|---|---|---|
| 1 | Vite 官方多页应用（Multi-Page App）配置 | MIT | 直接决定 `rollupOptions.input` 写法 |
| 2 | `vite-plugin-singlefile`（232 原有依赖） | MIT | 232 用它把全站内联成单个 HTML |
| 3 | `vite-plugin-pwa`（mvp 的离线方案参考） | MIT | 评估是否需要在本阶段引入 |

## 可借鉴做法（落到文件/组件级）

1. **多入口用 `rollupOptions.input` 显式声明，而不是靠目录约定。**
   落到 `vite.config.ts`：`input: { community: index.html, aplus: aplus.html }`。
   两个入口的共享模块（`src/data/**`）由 Rollup 自动抽成共享 chunk，A+ 不会打包第二份领域层。

2. **每个 HTML 入口自成闭环：入口脚本、`<noscript>` 兜底、`noindex` 全部各写一份。**
   落到 `index.html` 与新增 `aplus.html`。232 原本只有 `index.html`；若让 A+ 复用同一外壳，任一入口的标题/兜底文案都会串味。

3. **删除 `vite-plugin-singlefile`。**
   落到 `vite.config.ts` 的插件数组。理由见下。

## 不采纳及原因

- **`vite-plugin-singlefile`**：其 README 明确写着「this will not work with multi-page apps」，并声明多入口请求（issue #51）按 wontfix 关闭。保留它会导致两份 HTML 各自内联一份共享代码，A+ 也无法独立加载自己的样式表。本阶段移除该依赖，但**不新增任何依赖**，插件数从 2 降为 2（react + tailwind）。
- **`vite-plugin-pwa`**：离线能力需要 Service Worker、版本提示与预缓存清单，属于独立议题；本阶段引入会与「先审后发」等合规验收抢时间，且 232 基线本就无离线。登记为后续可选项，不在本次范围。

## 结论

双入口 + 共享 chunk + 各入口自闭环兜底。构建产物中 `assets/` 下应出现一份被两个 HTML 共同引用的领域层 chunk；若出现两份，说明共享失败，需要在 P4 复核。
