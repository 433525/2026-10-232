# P7 备份导入 · 开源调研

调研日期：2026-10-24。目标：B 端目前只能「导出 + 读取」，缺「导入」——用户换机器或清了缓存后，
手里有备份也恢复不回去。本轮要补的是**覆盖式恢复**，而覆盖是破坏性操作，重点不在文件选择器，
而在「校验、预览、确认」三件事。

## 候选

| # | 候选 | 许可 | 与本阶段的关系 |
|---|---|---|---|
| 1 | [excalidraw/excalidraw](https://github.com/excalidraw/excalidraw) | MIT | `.excalidraw` 文件导入：`restore()` / `restoreElements()` 负责迁移、修关系、补默认值 |
| 2 | [ajv-validator/ajv](https://github.com/ajv-validator/ajv) | MIT | JSON Schema 校验器，常被用作「导入前先验结构」 |
| 3 | [tldraw/tldraw](https://github.com/tldraw/tldraw) | tldraw license（非 OSI） | 文档快照的 schema 版本与迁移链 |
| 4 | 同作者 `community-service-mvp` 的 `src/data/intake/intake-backup.ts` | 自有 | A+ 端已有的导入实现：5 MB 上限、拒绝空摘要、`parseIntakeBackup` 单一解析入口 |

## 值得借鉴的做法（落到文件/组件级）

1. **恢复走「与启动读存档同一个解析函数」，绝不写第二套校验。**
   Excalidraw 的 `restore()` 同时服务 localStorage 加载、文件导入与剪贴板粘贴，是唯一的边界层；
   若导入另写一套宽松校验，就会出现「导入能过、刷新就坏」。
   落到 `src/data/community/store.ts`：`previewBackup()` / `importBackup()` 都调用已有的
   `parseStoredCommunity()`（与 `loadInitialState()` 同一函数），版本、字段、大小上限完全一致。

2. **覆盖前先给「将要发生什么」的可读摘要，再让用户确认。**
   Excalidraw 导入后会重建场景；本项目更需要「条数 + 保存时间」这类可核对的信息。
   落到 `CommunityBackupSummary`（posts / comments / threads / messages / reports / ledger / audit / savedAt）
   与 `AppContext.importBackupFile()` 的 `window.confirm` 文案；UI 只负责选文件，摘要由 store 算。

3. **两层大小上限：传输层限文件，领域层限内容。**
   A+ 的 `MAX_BACKUP_BYTES = 5 MB` 只挡住「读进内存」；真正的上限是存档序列化后的字符数。
   落到 `AppContext` 的 5 MB 文件守卫 + `parseStoredCommunity` 的 `MAX_STORED_CHARS = 1_000_000`，
   两条错误文案分别说明「文件太大」与「存档内容超限」。

## 明确不采纳

- **不引入 ajv / JSON Schema**：为一个单键信封引入 schema 引擎，会把「校验规则」拆到两份（TS 类型 + schema），
  而现有 `isCommunityState()` 已经逐字段校验并在 `normalizeCommunityState()` 里补默认值；再引一套只会漂移。
- **不做版本迁移链**：tldraw/Excalidraw 的迁移链是为「多年跨版本」准备的；本项目 `schemaVersion` 恒为 1，
  遇到非 1 一律拒绝并保留原存档（明确写进文案），比半吊子迁移安全。真要升版时再按迁移函数补。
- **不复用 tldraw 代码**：其许可证非 OSI 认证，与本次交付不兼容；仅参考「快照带版本号」的思路。
- **不做「合并导入」**：帖子/评论/举报都有 id，合并会产生半真半假的混合存档；本轮只做整档覆盖，
  并在确认框写明「当前未导出的改动会丢失」。

## 结论

导入 = 选文件（5 MB 守卫）→ 单一解析器校验 → 摘要确认 → 整档覆盖（坏档需先下载原文）。
新增代码集中在 `store.ts` 的三个函数、`AppContext.importBackupFile()` 与 `StoragePanel` 的一个隐藏 input；
不新增依赖，不改存档 schema。
