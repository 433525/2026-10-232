# P3 A+ 移植 · 开源调研

调研日期：2026-10-23。目标：把 mvp 的 Vue 工作台 1:1 移植为 React，`src/aplus/styles.css` 787 行类名与令牌不改，10 个弹层逐个搬。

## 候选

| # | 候选 | 许可 | 与本阶段的关系 |
|---|---|---|---|
| 1 | Radix Primitives `@radix-ui/react-dialog` | MIT（WorkOS，2024 被收购后仍 MIT） | 业界最常用的无障碍 Dialog 原语，官方宣称实现焦点陷阱/归还/ARIA |
| 2 | `focus-trap` | MIT | 只做焦点陷阱的独立库 |
| 3 | `a11y-dialog` | MIT | 轻量原生实现，约 1KB |

## 可借鉴做法（落到文件/组件级）

1. **焦点闭环只做四件事，顺序不能错。**
   落到 `src/aplus/dialog-focus.ts`：打开时优先 `[data-autofocus]` → 首个可编辑字段 → 首个可聚焦元素；打开期间 Tab/Shift+Tab 在弹层内循环；Esc 交给调用方决定是否关闭；关闭后把焦点还给触发元素，触发元素已消失时保持浏览器默认落点。
   这三档优先级不是装饰：`HelpDialog` 的「知道了」带 `data-autofocus`，必须优先于它上方的关闭按钮。

2. **背景用 `inert`，不要用 `aria-hidden`。**
   落到 `AppSideRail` / `main#aplus-main` 的 `inert={anyDialogOpen}`。两者同时使用会让读屏重复播报，APG 也不建议叠加。

3. **可聚焦性判定要排除三类节点。**
   落到 `dialog-focus.ts` 的 `focusables()`：`disabled` / `aria-hidden=true` 排除；`closest('[inert]')` 排除；`getClientRects().length === 0` 或 `visibility:hidden` 排除。少了最后一条，被 CSS 隐藏的输入框会抢走初始焦点。

## 不采纳及原因

- **Radix / focus-trap / a11y-dialog 三个库都不引入**：
  1. 约束明确要求「不引入新依赖」；
  2. 三者都会注入自己的 DOM 容器（portal / wrapper），而 A+ 的 `styles.css` 是按 `.modal-backdrop > .modal` 这层结构写的，换结构等于重写样式，违反「类名与令牌不改」；
  3. 本项目只需要 APG 的最小实现（约 110 行），引入一个库来解决 110 行的问题是负收益。
- **不采用 `showModal()`（原生 `<dialog>`）**：原生 dialog 的 `::backdrop` 与既有 `.modal-backdrop` 样式冲突，且 Safari 早期版本对 `::backdrop` 动画支持不一致。

## 结论

自研 110 行焦点控制器，把 mvp 的 `useDialogFocus` 从「Vue watch + 生命周期」改写为「显式 `sync()` + 全局 keydown」，行为逐条对齐，不引入依赖。
