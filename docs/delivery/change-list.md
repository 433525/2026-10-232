# 改动清单

相对 `origin/main`（`ea48ac0`）的全部改动。分四类，便于逐条核对。
标注说明：**P1/P2** 为本分支前序阶段完成的骨架与 B 端主链路；**P3–P5** 为 A+ 移植、清理验收与交付文档；**P6** 为 2026-10-24 的存档自愈与评论级举报（见 §四 4.2）。

## 一、新增（Added）

### 1. A+ 入口与工作台（P3）

| 文件 | 说明 |
|---|---|
| `aplus.html` | 第二入口；`noindex` + `noscript` 兜底 + 自制内联图标 |
| `src/main-aplus.tsx` | A+ 启动模块；不加载 Tailwind，只加载 `styles.css` |
| `src/aplus/App.tsx` | 版面装配 + 渲染错误边界（替代 Vue 的 `app.config.errorHandler`） |
| `src/aplus/context.tsx` | `provide/inject` → React Context + `useSyncExternalStore` 订阅 |
| `src/aplus/workbench.ts` | 1315 行 Vue 组合式函数 → React store（`createReactiveStore`），业务判断逐条对应 |
| `src/aplus/dialog-focus.ts` | APG 模态对话框焦点闭环；`watch(isOpen)` → 显式 `sync()` |
| `src/aplus/toast.ts` | 单条全局提示；错误等级由文案特征推断 |
| `src/aplus/tablist.ts` | `v-tablist` 指令 → `useTablist()`（roving tabindex + 方向键） |
| `src/aplus/components/*.tsx` | 11 个版面组件 |
| `src/aplus/components/dialogs/*.tsx` | 10 个弹层 |
| `src/aplus/presentation.ts`、`styles.css` | 前序阶段已搬运；`styles.css` 与 mvp 逐字节一致（787 行类名与令牌未改） |

### 2. 领域层（P1/P2）

| 文件 | 说明 |
|---|---|
| `src/data/reactive.ts` | 约 90 行原语：`ref` / `computed` / `createReactiveStore`（零依赖） |
| `src/data/community/*.ts`（9 个） | mvp 的 B 端领域层：类型、种子、内容、store、审核筛选、发布草稿、公告轮播、阅读模式、存档键 |
| `src/data/intake/*.ts`（7 个） | mvp 的 A+ 领域层 + React 版 store + 社区桥 + 备份 + 筛选偏好 |
| `src/selectors/community.ts` | 232 `types` ↔ mvp 领域层的纯函数映射（含派生志愿者） |

### 3. 验收与文档（P4/P5）

| 文件 | 说明 |
|---|---|
| `tools/lib/cdp.mjs` | 零依赖 CDP 客户端（Node 22 全局 WebSocket，无 Playwright/Puppeteer） |
| `tools/check-dual-entry.mjs` | 双入口 27 项：加载、控制台、五档宽度、弹层焦点、Esc 归还、社区桥空态 |
| `tools/check-aplus-flow.mjs` | A+ 主流程 24 项：建单、去重、检查点拦截、流转、备份、刷新持久化 |
| `tools/check-community-flow.mjs` | B 主链路 11 项：实名拦截、先审后发、跨入口读取 |
| `docs/research/p1..p5*.md` | 五个阶段的开源调研（候选、可借鉴做法、不采纳原因） |
| `docs/delivery/*.md` | 映射表、本清单、缺口报告、验收记录 |
| `docs/evidence/**/report.json` | 三套验收的机器可读结果（截图按 `.gitignore` 不入库） |
| `public/robots.txt` | 全站 `Disallow: /`（T16 第二道闸门） |

## 二、修改（Changed）

### 1. 构建与入口

| 文件 | 改动 |
|---|---|
| `vite.config.ts` | 移除 `vite-plugin-singlefile`，改为 `rollupOptions.input` 双入口；产物出现两端共用的 `assets/types-*.js` |
| `index.html` | 标题/描述改为合成演练口径；补 `noindex`、`format-detection`、`noscript`、自制内联图标 |
| `package.json` / `package-lock.json` | 移除 `vite-plugin-singlefile`；补 `check:*` 脚本；锁定依赖版本 |

### 2. B 端适配层（P2）

| 文件 | 改动 |
|---|---|
| `src/context/AppContext.tsx` | 1137 行重写：`AppContextType` 字段名与签名不变，实现改为读 `useCommunityStore`；删除业务分支与业务 localStorage 键 |
| `src/components/{AdminCenter,MessagesTab,OrderDetailModal,PublishModal,RealNameModal,CommunityTab,HelpCenterModal,ProfileTab,SosModal,FooterCompliance}.tsx` | 只改数据接线与必要的合规文案（见下）；props 与结构未动 |
| `src/types/index.ts` | 与 232 原契约保持一致；仅修正一处注释中的虚构社区名 |

### 3. 合规文案修正（P4，最小文本改动）

这些是**删字/换词**，不改结构、不改 props、不改交互：

| 文件 | 原文 | 改为 | 依据 |
|---|---|---|---|
| `HeaderNav` | 官方互助站 | 互助演练站 | §1.3.10 不冒充官方 |
| `CommunityTab` | 官方发布 / 官方认证 | 项目组发布 / 项目组标注 | 同上 |
| `HomeTab` | 下载官方证书 / 翠湖互助站 24H 服务 | 下载演练证明 / 梧桐里互助站 24H（虚构） | 同上 + R14 素材/标识 |
| `MessagesTab` | 官方通知 / 确认提交网格长 / 网格长调解办结记录 | 系统通知 / 确认提交演练复核 / 演练复核办结记录 | R11 机构名义 |
| `ProfileTab` | 官方证书 / 向社区互助监督委员会提交申诉 | 演练证明 / 本原型没有真实申诉渠道 | R11 |
| `CertificateModal` | 「身份证号：3201…」「官方防伪编码已上链备案」「翠湖花园社区志愿服务工作站」出具 | 删除证件号；改为「演练编号，仅用于本机核对」；署名为「社区服务演练项目组（虚构）」 | R6 敏感信息 + R11 + 虚假技术声明 |
| `CommunityQrModal` | 「扫码加入本社区官方互助交流群」「群主：网格长王芳」 | 「本图为版式演示，不对应任何真实群聊」；负责人改为演示角色 | R11 |
| `TermsModal` | 「由翠湖花园社区居委会与新时代文明实践站联合创办」 | 「课程/校内演练原型，由项目组维护，未获得任何社区、街道或机构授权」 | R11 |
| `HelpCenterModal` | 「所有志愿者均经过公安背景审核」「系统将呼叫 500 米内急救志愿者和网格长」 | 「本原型不做任何背景审核」「不会呼叫急救、不会通知、不会派单」 | §1.3.4 非急救通道 + 演示不得写成已实现 |
| `SosModal` | `tel:120` / `tel:110` 链接 | 「请手动拨打 120 / 110」纯文本 | 任务禁止 `tel:` 链接；本原型不承担一键拨号角色 |
| `BrandMark` | 翠湖社区标识 | 梧桐里社区互助演练标识 | 与数据层社区名一致 |
| `PublishModal` | 默认地点「翠湖花园3期」 | 「梧桐里3期（虚构）」 | 同上 |

### 4. 文档

| 文件 | 改动 |
|---|---|
| `README.md` | 整篇重写：双入口、演示 vs 生产对照、已知边界、仅合成数据声明 |
| `docs/ARCHITECTURE.md` | 分层表去掉 `mockData.ts`，补双入口与两套存档、A+ store 说明 |

## 三、删除（Removed）

| 文件/内容 | 原因 |
|---|---|
| `src/data/mockData.ts`（744 行） | 业务种子由 mvp 领域层替代；其中含示例手机号、门牌号、订单流水等 232 自造数据 |
| `AppContext` 内的业务分支与业务 localStorage 键 | 业务状态改由 `src/data/community/store.ts` 统一持有，避免两套状态机 |
| 所有示例手机号 / 身份证格式串 / `tel:` 链接 | 合规红线；`src/` 全仓已扫描为 0 |
| `vite-plugin-singlefile` 依赖与插件配置 | 官方 README 明确不支持多入口（issue #51 按 wontfix 关闭） |
| 「官方/认证/居委会/实践站/街道监督委员会/网格长」等机构与授权表述 | R11：无授权不得以社区或机构名义运营 |

## 四、修复（Fixed）

| 问题 | 处理 |
|---|---|
| React 内联 callback ref 写入 store 导致 `Maximum update depth exceeded`（#185） | 备份文件输入改为按 `data-aplus-backup-input` 查询，不再把 DOM 节点存进 store |
| 程序化 `.click()` 不聚焦按钮，导致「Esc 归还焦点」测成 `BODY` | 验收脚本改为先 `focus()` 再 `click()`，并比对同一元素引用；实现侧未改（真实鼠标点击本就会聚焦） |
| 两个入口共用单一 HTML 外壳会串标题与兜底文案 | 每个入口各写一份 `noscript` / `noindex` / 标题 |
| `/favicon.ico` 404 污染控制台断言 | 两个入口各加自制内联 SVG 图标（不使用外部素材） |

### 4.1 第二次验收补齐（2026-10-23 晚）

补测 §9 的履约链路后暴露并修复三处断链，另修正两处误导性文案。
逐条根因见 `docs/delivery/gap-report.md` 第七节。

| 文件 | 改动 | 类型 |
|---|---|---|
| `tools/check-acceptance.mjs` | 新增 27 项验收：接单→签到→完成→账本、病史可见性、每帖举报入口与落点、举报处置与留痕、A+ 高风险拦截 | 新增 |
| `package.json` | 新增 `check:acceptance` 脚本 | 修改 |
| `src/selectors/community.ts` | 新增 `viewAuthorId()`；`buildOrder` / `buildPost` 接受 `viewerId`，把本人作者 id 投影成当前视图身份 id；`buildOrders` / `buildPosts` 透传 | 修复 |
| `src/context/AppContext.tsx` | `completeOrder` 在发布者确认失败时回落到 `counterpartConfirmOrderCompletion`（此前该动作是死代码） | 修复 |
| `src/components/CommunityTab.tsx` | 信息流每条帖子增加「举报」按钮，传当前 `post.id` | 修复 |
| `src/components/OrderDetailModal.tsx` | 订单详情增加「举报该内容」；完成按钮「入账」改为「记账（未结算）」 | 修复 |
| `src/components/ProfileTab.tsx` | 订单状态「已完成结算」→「已完成（未结算）」 | 修复 |
| `docs/delivery/*.md`、`README.md` | 验收数 62 → 89、补合规章节证据、补低内存构建说明、补两类新缺口 | 修改 |

### 4.2 P6 存档自愈与评论级举报（2026-10-24）

起因：`store` 早已实现六态存档状态与坏档原文保留，但**没有任何组件读取**（`grep storageStatus src/components` 为空）。
后果是：存档损坏或跨标签冲突时，所有写入被静默拦下，用户拿到一句 toast 却找不到恢复路径；评论也没有举报入口。
本轮只补「已建模但不可达」的能力，领域状态机与既有 props 一行未改。调研见 `docs/research/p6-storage-recovery.md`。

| 文件 | 改动 | 类型 |
|---|---|---|
| `src/shared/download.ts` | 从 A+ `workbench.ts` 抽出的下载工具（`downloadTextFile` / `dateStamp`），两端共用 | 新增 |
| `src/components/StoragePanel.tsx` | 后台「存档与恢复」页签：六态中文映射、最后保存时间、导出备份、载入存档、坏档取原文、重置（下载前禁用） | 新增 |
| `src/components/StorageBanner.tsx` | 主内容区顶部常驻警示条：仅在 `memory-only / save-error / recovery-required / conflict` 出现，动作复用 AppContext | 新增 |
| `tools/check-recovery.mjs` | 23 项异常路径验收：面板可达、坏档可见与拦截、先取原文再重置、跨标签冲突与消解、评论级举报、五档溢出、静态扫描 | 新增 |
| `src/context/AppContext.tsx` | 追加 9 个字段（存档状态只读投影 + 导出/取原文/载入/重置），实现 `resetDemoData` 的「未下载原文不得重置」守卫；`submitComplaint` 支持显式 `targetType/targetId`，取消 `posts[0]` 兜底 | 修改 |
| `src/components/AdminCenter.tsx` | 新增「存档与恢复」页签（第 5 个）；举报工单显示目标类型与目标 id；处置结论草稿按工单 id 存（修掉多条工单同步回显） | 修改 |
| `src/components/CommunityTab.tsx` | 每条已审评论增加举报按钮（目标 `comment`）；评论折叠按钮补 `aria-label` / `aria-expanded` | 修改 |
| `src/types/index.ts` | `ComplaintTicket` 追加可选 `targetType` / `targetId`（签名不变，缺省按 post） | 修改 |
| `src/selectors/community.ts` | `buildReports` 透出 `targetType` / `targetId`，供管理端区分帖子/评论/留言 | 修改 |
| `src/App.tsx` | 两处 `<main>` 顶部挂载 `<StorageBanner />` | 修改 |
| `src/data/community/store.ts` | 仅改 `RECOVERY_REQUIRED_MESSAGE` 文案，指向「我的 → 演练审核与举报处置后台 → 存档与恢复」 | 修改 |
| `src/aplus/workbench.ts` | 删除本地 `downloadTextFile`，改用 `src/shared/download.ts` | 修改 |
| `package.json` | 新增 `check:recovery` 脚本 | 修改 |
| 合规文案（`HomeTab` / `CommunityTab` / `ProfileTab` / `HelpCenterModal` / `SosModal` / `CommunityQrModal` / `TermsModal`） | 清除「网格 / 网格员 / 网格长 / 一键直拨 / 社区网格把关 / 实名业主与认证志愿者」等官方化措辞，改为项目组口径；首页紧急入口副标题改为「非急救：请拨打 120/110」 | 修改 |
| `tools/check-acceptance.mjs` | 管理入口文案变更后同步选择器（`审核与举报处置后台`） | 修改 |
| `docs/research/p6-storage-recovery.md` | P6 调研：use-local-storage-state / localForage / Discourse flags 的取舍 | 新增 |

### 4.3 P7 备份导入与留言举报（2026-10-24）

起因：B 端只能导出不能导入，用户清缓存或换机器后无法恢复；§1.3-6 要求「每条 UGC 可举报」，
而订单留言（`targetType='message'`）在领域层早已支持却一直没有入口。调研见 `docs/research/p7-backup-import.md`。

| 文件 | 改动 | 类型 |
|---|---|---|
| `src/data/community/types.ts` | 新增 `CommunityBackupSummary`（导入摘要，不含业务数据） | 新增 |
| `src/data/community/store.ts` | 新增 `previewBackup()` / `importBackup()`（复用启动时的同一解析器）；`allowRecovery` 仅在「已下载原文」时由调用方传入 | 修改 |
| `src/context/AppContext.tsx` | 新增 `importBackupFile(file)`：5 MB 守卫 → 读文件 → 解析 → 摘要确认 → 整档覆盖；失败不改存档 | 修改 |
| `src/components/StoragePanel.tsx` | 增加「导入备份 JSON」按钮与隐藏 `input[data-storage-import]`；操作区改为 4 列；补充文件/内容双层上限说明 | 修改 |
| `src/components/MessagesTab.tsx` | 每条对方留言增加举报入口（`targetType='message'`），自己的留言不显示 | 修改 |
| `tools/check-recovery.mjs` | 新增 5 项：导入入口、合法导入生效、版本不符被拒、超 5 MB 被拒、留言举报落点；顺手修正举报列表「前插」导致的取错项 | 修改 |
| `docs/research/p7-backup-import.md` | P7 调研：Excalidraw restore / ajv / tldraw / mvp intake-backup 的取舍 | 新增 |

### 4.4 P8 持续改进（CIP-232，2026-10-26）

起因：功能已闭环，但「改了多少、测得够不够、文档说的是不是真的」三件事全靠人工记忆——断言数三处口径不一（205/210/223）、密度分母与基线互相矛盾、耗时靠抄表。本轮不改产品行为，只把度量、门禁与决策落盘。

| 文件/内容 | 改动 | 类型 |
|---|---|---|
| `tools/collect-baseline.mjs` | 零依赖只读采集器：断言真值取 `report.json` 的 `total`、双口径密度、未跟踪与 dist、文档—实现偏差；`--strict` 对契约文档数字与耗时基线判红 | 新增 |
| `tools/lib/surface-hash.mjs` | 被测面内容指纹（`src/**`、`check-*.mjs`、`tools/lib/**`、入口与构建配置） | 新增 |
| `tools/run-gate.mjs` | 八段串行编排：独立端口、逐段计时、结束自动写回 `gate-timing.json`，取代人工抄表 | 新增 |
| `tools/check-fixes.mjs` → `check-fixes-a.mjs` / `check-fixes-b.mjs` | 1970 行单脚本按版面拆两段，各留一条控制台看门狗（断言 93 → 94） | 修改 |
| `tools/check-p0-gaps.mjs` | 新增 12 条 P0 缺口断言（评论级驳回、订单取消、备份导入失败等），均带 `[neg]` / `[edge]` 前缀 | 新增 |
| `tools/check-community-flow.mjs`、`tools/check-dual-entry.mjs` 等 | 断言命名前缀规范落地；B 端深链改查询串后的选择器同步 | 修改 |
| `src/context/AppContext.tsx` | 删除零消费契约字段 `viewMode` / `setViewMode`（10 处，1024 → 1013 行）；行为与签名其余不变。依据 `docs/delivery/adr/ADR-001-remove-viewmode.md`（D-03） | 删除 |
| `docs/delivery/decisions.md` | 决策日志（D-01…D-19）：状态、理由、影响与落盘日期，作为唯一事实源 | 新增 |
| `docs/delivery/reachability.md` | 写动作可达性矩阵：52 个写动作 × 断言覆盖，缺口按数据完整性排序 | 新增 |
| `docs/delivery/adr/ADR-001-remove-viewmode.md` | 死接口判定与删除案：证据表、三案对比、S1–S7 步骤、回退与风险 | 新增 |
| `docs/metrics/baseline.md`、`docs/metrics/gate-timing.json` | 自动采集的基线表与门禁耗时记录（含 `surfaceHash`、`concurrency`、分项耗时） | 新增 |
| `docs/ARCHITECTURE.md` §6 | 新增「度量口径」：断言只认运行时真值、双口径密度、体积按字节、文档数字分契约/历史、命名前缀、耗时分档 | 修改 |
| `README.md` | 补度量与门禁命令索引、决策日志与 ADR 入口；验收项数按实测更新 | 修改 |

### 4.5 W6 回归强度收口（CIP-232，2026-10-27）

起因：动作覆盖率已达 52/52，继续按「动作数」补断言会退化为凑数（D-21）。本批不再扩覆盖面，只加强判定：补 5 条负向/边界用例，把精确负向口径从 10.4% 提到 12.2%，并把「密度数值」这一度量盲区纳入门禁。**未改 `src/`**。

| 文件/内容 | 改动 | 类型 |
|---|---|---|
| `tools/check-community-flow.mjs` | 18 → 22：重复举报不新增工单（去重）、访客点赞被拒（计数/选中态不变）、访客举报被拒（工单不增）、有效与失效 `?post=` 深链两半（高亮命中 / 不误高亮且零异常） | 修改 |
| `tools/check-aplus-flow.mjs` | 34 → 35：失效 `?case=` 深链清理参数并提示，详情不停在空态 | 修改 |
| `tools/collect-baseline.mjs` | 新增「密度 A / 密度 B」两类契约 claim（I-14）：`当前密度` 行的数值按 `toFixed(2)` 比对，未写该行不判红；同时把 `density` 计算提前以便 claim 复用 | 修改 |
| `docs/ARCHITECTURE.md` §6 | §6.1 静态/运行时计数改 236/245；§6.2 密度 1.93/4.09，「当前密度」单独成段（与含 `≥` 的目标行分行，否则被整体跳过）；§6.4 校验范围补「密度数值」；§6.5 补精确口径 30/245 = 12.2% 与「只认 `report.json`」说明 | 修改 |
| `docs/delivery/decisions.md` | D-21 记执行进度；新增 D-22（举报去重提示未区分「已去重」，待修）、D-23（I-14 密度数值入门禁 + 分行约束） | 修改 |
| `README.md`、`docs/delivery/acceptance.md`、`docs/HANDOVER.md` | 断言数 245、分段 22/35、耗时 432.4 s 三处同批对齐；修正 README 残留的 223/24/11 三处陈旧计数 | 修改 |
| `docs/metrics/baseline.md`、`docs/metrics/gate-timing.json` | 重采：245 项 / 432.4 s / `surfaceHash sha256:d2e2a01f…` / 密度 A 1.93 | 修改 |

### 4.6 W7 权限与输入边界补测 + 分档入禁（CIP-232，2026-10-27）

起因：M4 已封顶 52/52，剩余风险不在动作缺口而在**权限与输入边界**；同时 D-25 发现快检档预算只写在文档里、实测无人比对（210 s 已倒挂 0.8 s）。本批补 3 条判定并把分档预算纳入 `--strict`。**未改 `src/`**，三条断言各自做缺陷注入并转红。

| 文件/内容 | 改动 | 类型 |
|---|---|---|
| `tools/check-community-flow.mjs` | 22 → 25：`[neg]` 访客在后台办结举报被拒（工单仍待处理、已办结数与审核日志均不变、提示「只有审核员」）；`[neg]` 审核员不能代替成员发布（帖子数不变、发布弹层保持、提示专用文案）；`[edge]` 纯空白评论两层拦截（空白与空串均禁用、有文本恢复可用、表单直提不新增评论） | 修改 |
| `tools/collect-baseline.mjs` | 新增 I-15「分档预算」校验：快检（前五段）≤230 s、全量 ≤480 s、单段 ≤150 s，任一超线即 `--strict` 退出码 1；`baseline.md` F 段输出实测/预算与余量；顺带兼容证据时间字段（`check-recovery` 写 `generatedAt`，A 段此前恒显示「—」） | 修改 |
| `docs/ARCHITECTURE.md` §6 | §6.1 静态/运行时计数改 239/248、分段 community 25；§6.2 密度 1.96/4.14；§6.4 校验项 5 → 6（新增分档预算）；§6.5 精确口径 33/248 = 13.3%；§6.6 快检档 210 → 230 s 并注明由 I-15 核对 | 修改 |
| `docs/delivery/decisions.md` | 新增 D-26（三条断言 + I-15 落地，含注入证据）；D-25 补「I-15 已落地、实测 216.4 s」 | 修改 |
| `docs/delivery/acceptance.md`、`README.md`、`docs/HANDOVER.md` | 断言数 248、community 25、耗时 437.2 s 同批对齐；顺带修正 HANDOVER 中 `AppContext.tsx` 的陈旧行数（634 → 1013，两处） | 修改 |
| `docs/metrics/baseline.md`、`docs/metrics/gate-timing.json` | 重采：248 项 / 437.2 s / `surfaceHash sha256:c82f40e0…` / 密度 A 1.96 / 快检 216.4 s | 修改 |
