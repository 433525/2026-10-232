# P6 存档自愈与细粒度举报 · 开源调研

调研日期：2026-10-24。目标：把 §7「存储契约」里已写在类型层、但**用户无法到达**的两条路径补上——
坏档 `recovery-required` 的取回原文与重置门禁、跨标签 `conflict` 的可见与消解；
同时把「每条 UGC 可举报」（§1.3-6）补到评论粒度。

## 候选

| # | 候选 | 许可 | 与本阶段的关系 |
|---|---|---|---|
| 1 | [astoilkov/use-local-storage-state](https://github.com/astoilkov/use-local-storage-state) | MIT | React 侧 localStorage 持久化：`storage` 事件跨标签同步、写失败退化内存、`isPersistent` 暴露给 UI |
| 2 | [mozilla/localForage](https://github.com/mozilla/localForage) | Apache-2.0 | 多驱动降级（IndexedDB → WebSQL → localStorage）与异步错误处理 |
| 3 | [discourse/discourse](https://github.com/discourse/discourse) | GPL-2.0 | 举报模型 `PostAction`（用户 + 目标 + 类型）+ `Reviewable` 审核队列与处置留痕 |
| 4 | [donavon/use-persisted-state](https://github.com/donavon/use-persisted-state) | MIT | 早期同类实现，`storage` 事件广播 + `createPersistedState` 工厂 |

## 值得借鉴的做法

1. **「写不进去」必须是可见状态，而不是静默失败。**
   `use-local-storage-state` 的做法是把 `isPersistent`（当前值到底落盘还是只在内存）作为 hook 的返回值交给 UI，
   官方 README 明确建议用它提示「Changes aren't currently persisted」。
   落到本项目：`store` 早已有 `storageStatus`（`ready/saved/memory-only/save-error/recovery-required/conflict`），
   但 B 端**没有任何组件消费它**（`grep storageStatus src/components` 为空）。本轮新增
   `components/StoragePanel.tsx`，把六态映射为中文状态 + 说明 + 可执行动作；状态来自 store，不在组件里推断。

2. **跨标签同步只做「发现并让用户决定」，不做静默合并。**
   `use-local-storage-state` 监听 `storage` 事件后直接覆盖本地状态；`localForage` 干脆不做跨标签。
   本项目的存档是**多实体快照**（帖子 + 评论 + 举报 + 账本 + 审计），直接覆盖会丢掉另一个标签页刚写的内容，
   所以沿用 store 现有行为：只把状态置为 `conflict` 并保留当前视图，由用户点「载入最新存档」显式拉取，
   文案写清「载入会丢弃本页未保存的改动」。落到 `StoragePanel` 的冲突卡片与 `reloadArchive()`。

3. **举报目标是「类型 + id」的多态引用，审核队列按目标类型分派处置。**
   Discourse 的 `PostAction` 把「谁、对哪条内容、以什么类型」拆开存，评论与主题共用同一套标记，
   再由 `Reviewable` 统一进队、结案留痕。本项目的 `Report` 已有 `targetType: 'post' | 'comment' | 'message'`
   与 `targetId`，`reportContent()` 也已对评论做存在性/可见性校验——**缺口只在 UI 没有入口**，
   因此本轮不新增字段、不改状态机，仅：`CommunityTab` 每条已审评论加举报按钮，
   `submitComplaint` 接受显式 `targetType/targetId`（`ComplaintTicket` 只加可选字段，签名不变）。

## 明确不采纳

- **不引入 `use-local-storage-state`**：它把持久化绑定到组件生命周期，而本项目是「领域 store 单例 + `useSyncExternalStore`」，
  引入后会出现两套写入路径；且项目硬约束「不引新依赖」。只借 `isPersistent` 的产品表达。
- **不引入 `localForage` 的多驱动降级**：本项目存档是单键 JSON，`localStorage` 同步语义对「写前快照比对」是必要的；
  换成异步 IndexedDB 会改变 `persistState` 的返回时序，影响 6 处调用点的错误处理。降级只做「内存模式」一档。
- **不照抄 Discourse 的自动隐藏/信任等级**：`high_trust_flaggers_auto_hide_posts` 这类自动处置需要真实用户信誉体系，
  演示环境没有可信身份，自动下架会被误读成「已处理」。本项目坚持人工处置 + 结果通知举报人（§1.3-6）。
- **不复用 Discourse 代码**：GPL-2.0 与本次交付的许可不兼容，仅参考模型拆分方式（见 §8.8）。

## 结论

本轮只补「已建模但不可达」的能力：存档六态可见、坏档先取原文再重置、跨标签冲突可见可消解、评论可举报。
领域类型与状态机一行不改（§8.1），新增代码集中在 `src/shared/download.ts`、`src/components/StoragePanel.tsx`
与两处 UI 入口。
