# 改动清单

相对 `origin/main`（`ea48ac0`）的全部改动。分四类，便于逐条核对。
标注说明：**P1/P2** 为本分支前序阶段完成的骨架与 B 端主链路；**P3–P5** 为本次会话完成的 A+ 移植、清理验收与交付文档。

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
