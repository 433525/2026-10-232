# P2 B 端主链路 · 开源调研

调研日期：2026-10-23。目标：把 232 的 `mockData.ts` 业务种子与 `AppContext` 业务分支替换为 `community-service-mvp` 的领域层，同时保持 43 个组件的 props 与 `AppContextType` 签名不变。

## 候选

| # | 候选 | 许可 | 与本阶段的关系 |
|---|---|---|---|
| 1 | Zustand | MIT | React 侧最常用的外部 store，`useSyncExternalStore` 的标准用法参考 |
| 2 | valtio | MIT | 基于 Proxy 的可变快照方案 |
| 3 | Pinia（mvp 原实现） | MIT | 需要被移植的源状态机 |

## 可借鉴做法（落到文件/组件级）

1. **「外部 store + 版本号」是 `useSyncExternalStore` 最省事的接线方式。**
   落到 `src/data/reactive.ts`：`createReactiveStore(id, setup)` 返回同时是 store 实例与订阅源的对象，`subscribe` / `getVersion` 直接喂给 `useSyncExternalStore`。
   选择版本号而非 `getSnapshot` 返回对象快照，是因为后者要求每次返回同一引用，而 mvp 的 store 是「ref 写入 + 不可变替换」混合模型，做浅比较会引入漏更新。

2. **状态机留在领域层，展示层只读派生。**
   落到 `src/data/community/store.ts`（订单/审核/举报/账本）与 `src/selectors/community.ts`（纯函数派生）。组件不得自建状态副本——这是 mvp 已经验证过的边界，也保证 B 端 43 个组件的 props 不用改。

3. **存档读写要有显式状态枚举，而不是抛异常。**
   落到 `src/data/community/types.ts` 的 `COMMUNITY_STORAGE_STATUSES`（`ready / saved / memory-only / recovery-required / save-error / conflict`）。UI 据此显示「仅当前会话」「发现无法读取的旧存档」等文案，避免坏档直接白屏。

## 不采纳及原因

- **Zustand**：功能上完全够用，但会新增运行时依赖，违反「不引入新依赖」约束；且 mvp 的 store 是 Vue setup 语法，改写为 Zustand 需要重写而非搬运，回归风险高于收益。
- **valtio**：Proxy 可变模型与 mvp「写入时整体替换数组」的写法相反，迁移中容易出现「改了对象但没触发订阅」的静默 bug。

## 结论

用约 90 行的 `reactive.ts` 提供 `ref` / `computed` / `createReactiveStore` 三个原语，领域层文件按「只改 import 路径」的方式搬运。这样 mvp 的既有回归断言仍然对应同一段业务代码，而不是对应一份重写。
