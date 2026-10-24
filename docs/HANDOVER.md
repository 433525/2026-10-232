# 交接文档 · 社区服务双入口原型（React 19）

> 更新：2026-10-24（P6 后）· 交接对象：下一位维护者 / 下一个 AI 会话
> 仓库位置：`D:\网页开发\repo` · 当前分支：`agent/workbuddy/aplus-react-port`（P6 代码提交见 `git log --grep=P6`）
> 一句话状态：**功能闭环、验收通过、尚未合并主线；是合成演练原型，不是可上线产品。**

---

## 0. 一页速览

| 项 | 值 |
|---|---|
| 项目 | 社区服务双入口合成演练原型：B 端受控社区（`/`）+ A+ 受理工作台（`/aplus.html`） |
| 仓库 | `https://github.com/433525/2026-10-232` |
| 当前分支 | `agent/workbuddy/aplus-react-port`，与 `origin` 同步，工作区干净 |
| 主线基线 | `main` @ `ea48ac0`，**不包含**双入口与 A+ 改造 |
| 待处理 | PR [#1](https://github.com/433525/2026-10-232/pull/1) 处于打开状态，未合并 |
| 技术栈 | React 19.2.6 + Vite 7.3.2 + TypeScript 5.9.3；B 端 Tailwind 4.1.17，A+ 原生 CSS |
| 代码规模 | `src` 共 19,576 行（ts/tsx/css）；B 端 22 个组件，A+ 21 个（11 版面 + 10 弹层） |
| 验证状态 | 类型检查 0 错误；生产构建成功（2.14s）；自动化验收 117/117（2026-10-24 记录） |
| 性质 | 纯前端、纯合成数据、无后端、无通知、无支付，**不具备生产运营能力** |
| 建议下一步 | 评审并合并 PR #1；再按 §3.1 的优先级决定是否投入生产化 |

**只有 10 分钟？** 先读 §1.3（硬边界）、§3.1（待办优先级）、§7.2（十条硬规则）。

---

## 1. 项目背景与目标

### 1.1 项目是什么

同一份领域层支撑两个互不干扰的入口：

| 入口 | 地址 | 使用者 | 内容 |
|---|---|---|---|
| B 端受控社区 | `/`（`index.html`） | 居民视角 | 五栏导航、发布求助/志愿动态/邻里帖、先审后发、接单与履约、留言、审核后台、时间账本 |
| A+ 受理工作台 | `/aplus.html` | 内部视角 | 登记队列、分诊、检查点、高风险停止、投诉复核、社区桥、备份与重置、`?case=` 深链 |

两端**唯一**的运行时耦合是 `src/data/intake/community-bridge.ts`：只读 B 端本机存档，把「审核通过的求助帖」映射为受理记录，不写回、不复制。

### 1.2 项目目标

1. **验证产品形态**：跑通「发布 → 先审后发 → 接单/受理 → 双方确认 → 只读记账」完整闭环，确认两端职责边界（B 管履约，A+ 管受理，不互相代替）。
2. **验证合规边界**：把实名前置、敏感信息最小化、先审后发、举报留痕、非急救通道、不冒充官方等红线做成**可演示的拦截与提示**，而不是写在文档里的承诺。
3. **验证工程质量**：双入口共享领域层只打一份包、五档宽度无横向溢出、键盘可完成的弹层焦点闭环、控制台零异常。

**明确的非目标**：不接后端、不做真实通知、不做支付/上传/定位、不绑定域名、不冒充任何社区或机构。

### 1.3 五条硬边界（改动前必须接受）

| # | 边界 | 含义 |
|---|---|---|
| 1 | **仅合成数据** | 不得写入任何真实姓名、手机号、身份证号、门牌号、病史、机构名。示例社区「梧桐里」为虚构。 |
| 2 | **无生产能力** | 没有 API、数据库、会话、鉴权、消息投递。所有状态在当前浏览器，清缓存即消失。 |
| 3 | **不冒充官方** | 全站以「项目组 / 互助演练」名义；文案中不得出现「官方认证」「居委会」「街道」「网格长」等授权暗示。 |
| 4 | **不是急救通道** | 只提示「请手动拨打 120 / 110」，**全仓 `tel:` 链接计数必须为 0**；不定位、不通知、不派单。 |
| 5 | **不被索引** | 两个 HTML 均 `noindex,nofollow,noarchive`；`public/robots.txt` 为 `Disallow: /`。 |

### 1.4 需求依据与优先级

- 功能与合规以《社区服务小程序功能说明》《社区服务网页版开发步骤与雷点》（R1–R20 / T1–T20 / O1–O6）为准。
- 232 原版 UI **只决定外观**，不决定功能范围。
- 领域层逻辑移植自同作者 `community-service-mvp`（Vue 3）；冲突时以文档为准，不以旧实现为准。

---

## 2. 当前进度与已完成功能

### 2.1 阶段进度

| 阶段 | 内容 | 状态 |
|---|---|---|
| P1 | 骨架、构建链、双入口可行性 | 完成 |
| P2 | B 端主链路接领域层（发布/审核/接单/消息/我的） | 完成 |
| P3 | A+ 工作台从 Vue 组合式函数移植到 React store（10 弹层 + 焦点闭环） | 完成 |
| P4 | 清理、合规文案、三套验收脚本（62 项） | 完成 |
| P4.1 | 补测 §9 履约链路，修复三处断链，验收增至 89 项 | 完成 |
| P5 | README、架构/设计/交付文档、证据归档 | 完成 |
| P6 | 存档自愈（坏档取原文/重置门禁/跨标签冲突）与评论级举报 | 完成 |
| **待办** | **PR 评审与合并；生产化决策** | **未开始** |

### 2.2 版本与交付状态

```
e871309  fix: 补齐 §9 履约链路验收并修复三处断链        ← HEAD
20b3a7b  docs: 登记 agent 推送日志与 PR #1 链接
3e6d5cf  feat: 双入口重构 — B 端受控社区 + A+ 受理工作台（React 19）
ea48ac0  feat: 翠湖社区时间银行与银龄守护互助平台（Web 版）  ← main
```

- 分支已推送，`git log @{u}..HEAD` 为空，工作区干净。
- `main` 仍停在 `ea48ac0`（旧版单入口）。**任何基于 `main` 的改动都不会包含 A+ 工作台。**
- `docs/evidence/**/*.png` 被 `.gitignore` 排除，只提交 `report.json`；需要截图时本地跑脚本复现。

**本次交接复验（2026-10-24）**

| 检查 | 命令 | 结果 |
|---|---|---|
| 类型检查 | `npm run typecheck` | 0 错误 |
| 生产构建 | `npm run build` | 成功，2024 modules，`✓ built in 2.29s` |

> 117 项验收数字取自入库证据（`docs/evidence/*/report.json`，2026-10-24 10:5x 复跑，`recovery` 已扩到 28 项）。接手后请按 §6.3 自行复跑一次。

### 2.3 B 端已完成功能

- **导航**：五栏（首页 / 社区 / ＋发布 / 消息 / 我的），移动端固定底栏；页签状态持久化在 `localStorage`（`community.ui.active-tab`），**不写 URL**。
- **首页**：搜索、Banner 轮播、六个快捷入口、附近志愿者（由成员派生）、热门求助、公告。
- **社区**：全部/求助/志愿/邻里筛选、点赞、收藏、评论（先审后发）、转发、置顶公告、闲置互助、每帖举报入口。
- **发布**：求助订单 / 志愿动态（可前台匿名）/ 邻里帖；未实名访客被前置拦截且不写存档；提交一律 `moderation: 'pending'`。
- **履约**：接单 → 上门签到 → 请求完成 → 双方确认 → 追加 `unsettled` 账本流水；取消、争议、恢复/关闭。
- **消息**：订单留言、系统通知、投诉/反馈工单、未读角标。
- **我的**：资料、实名档位、时间账本、演练证明、设置、管理入口、A+ 受理进度只读摘要。
- **管理后台**：审核队列（帖子/评论）、举报处置、投诉工单、操作日志、**存档与恢复**（六态状态、导出/导入备份、载入存档、坏档取原文、重置门禁）。存档异常时主内容区顶部出警示条，不再只有一句 toast。
- **适老化**：关怀模式大字、44px 触控下限、焦点环、TTS 朗读、减少动态偏好。

### 2.4 A+ 端已完成功能

- **登记队列**：7 种筛选 + 搜索 + 指标卡（分诊/筛查/逾期/高风险）；320px 下改单列主从（选中滚入详情，可返回队列）。
- **详情**：检查点（同意/必填完整）、风险标记、关联记录、追加式时间线、生命周期文案。
- **10 个弹层**：新建、状态流转、检查点、跟进、模拟联系、高风险停止、重开、投诉、社区桥、使用说明。
- **投诉复核**：独立队列、筛选、结论回写。
- **备份**：导出/导入 JSON（5 MB 上限、拒绝空摘要）、坏档必须「先下载原文再重置」、刷新后持久化。
- **社区桥**：读取 B 端存档、按 `sourcePostId` 去重、摘要/标签重复进人工复核。
- **深链**：`?case=<id>`，记录不存在时清理参数并提示。

### 2.5 自动化验收成绩（117/117）

| 脚本 | 项数 | 覆盖重点 |
|---|---|---|
| `npm run check:dual` | 27/27 | 双入口加载、控制台零异常、320/390/768/1024/1440 无溢出、弹层焦点进入/Esc 归还、`data-autofocus` 优先级、社区桥空态 |
| `npm run check:aplus` | 24/24 | 新建、虚构确认门禁、去重→人工复核、检查点拦截→解锁、流转、备份 JSON、刷新持久化 |
| `npm run check:community` | 11/11 | 实名拦截、拦截不写存档、身份切换、发布落存档、先审后发、A+ 读 B 存档 |
| `npm run check:acceptance` | 27/27 | 接单→签到→确认→账本、病史接单后可见、每帖举报落点、举报处置留痕、A+ 高风险拦截 |
| `npm run check:recovery` | 28/28 | 存档面板可达、坏档可见与写入拦截、先取原文再重置、跨标签冲突与消解、评论/留言举报落点、备份导入（合法/版本不符/超限）、五档溢出、静态扫描 |
| **合计** | **117/117** | 证据：`docs/evidence/{dual-entry,aplus-flow,community-flow,acceptance,recovery}/report.json` |

### 2.6 十条合规红线的落地方式

| 红线 | 实现位置 | 验证手段 |
|---|---|---|
| 先审后发 | `store.publishPost` 写 `pending`；`visiblePosts` 只取 `approved` | 社区脚本断言公开流不含待审标题 |
| 实名前置 | `AppContext` 发布入口校验 `membership` | 拦截且 `localStorage` 无写入 |
| 敏感信息最小化 | `viewerParticipates()` 门控病史；未接单只见小区级位置 | 接单前无病史文本、接单后可见 |
| 非急救通道 | `SosModal` 纯文本提示，无 `tel:` | 全仓 `href="tel:` 计数 0 |
| 时间币只记账 | `LEDGER_ENTRY_STATUS='unsettled'`，store 无结算动作 | 代码评审 + 文案「未结算」 |
| 举报与留痕 | 每帖 / **每条已审评论** / **每条对方留言** / 每单举报 → `reports`（含 `targetType`）+ `auditLog('create-report')` | 落点等于所点条目、处置后消息 +1、审计 +1；评论 `SYNTH-COMMENT-001`、留言 `SYNTH-MESSAGE-004` |
| 匿名仅前台 | `selectors` 替换展示名，`post.author` 保留 | 代码评审（后台仍可定位） |
| noindex + robots | 两个 HTML + `public/robots.txt` | 构建产物检查 |
| 无外部素材 | 内联 SVG、空头像渐变、系统字体栈 | `@font-face` 0 处、无 CDN 引用 |
| 不冒充官方 | 全站「项目组 / 演练」口径；P6 清除「网格员 / 网格长 / 社区网格把关 / 一键直拨」 | 复查「官方」仅出现在否定句；`check:recovery` 静态扫描「网格/居委会/街道办」0 处 |

### 2.6.1 P6 增量（2026-10-24）

| 项 | 内容 |
|---|---|
| 存档可见 | 后台新增「存档与恢复」页签（第 5 个）：六态状态、底层说明、存档键、最后保存时间 |
| 坏档自愈 | 「下载旧存档原文」→ 才允许重置；下载前重置按钮 `disabled`，任意写入都被 store 拦下并提示恢复路径 |
| 跨标签 | 另一标签页改写后，主内容区顶部出现 `role=status` 警示与「载入最新存档」；载入后 `lastKnownRaw` 同步、写入恢复 |
| 评论举报 | 每条已审评论独立举报（`targetType: 'comment'`）；审核端工单显示「演练评论」+ 目标 id |
| 合规文案 | 清除「网格员 / 网格长 / 社区网格把关 / 一键直拨」；首页紧急入口副标题改为「非急救：请拨打 120/110」 |
| 验收 | 新增 `tools/check-recovery.mjs` 23 项；合计 112 项 |

### 2.6.2 P7 增量（2026-10-24）

| 项 | 内容 |
|---|---|
| 备份导入 | 存档面板新增「导入备份 JSON」：5 MB 文件上限 → 与启动同一解析器校验 → 显示条数/保存时间 → 二次确认后整档覆盖；坏档需先下载原文 |
| 留言举报 | 「订单留言」每条对方留言可单独举报（`targetType='message'`），自己的留言不显示 |
| 验收 | `check:recovery` 扩到 28 项；合计 117 项 |

### 2.7 唯一的 schema 扩展

`ORDER_EVENT_TYPES` 新增 `'clock-in'`（上门签到），用于补齐「接单 → 签到 → 完成」链路。其余类型、状态枚举、流转守卫、`ORDER_EVENT_LIMIT = 100` 均未改动。

补充（P6）：**视图模型** `src/types/index.ts` 的 `ComplaintTicket` 追加了两个**可选**字段 `targetType` / `targetId`，用于表达评论级举报。这是 232 视图契约的向后兼容扩展（缺省按 `post`），不涉及领域存档 schema。

---

## 3. 待办事项与已知问题

### 3.1 优先级总表

| 优先级 | 事项 | 性质 | 建议动作 |
|---|---|---|---|
| **P0** | PR #1 未合并，`main` 不含 A+ | 交付动作 | 评审 diff → 合并；合并前确认本地 117 项 |
| **P0** | 无视觉像素基线 | 质量缺口 | 若继续迭代 UI，先选 8–12 个关键状态（两端主视图、深链、代表弹层、320px、**存档异常态**）建截图基线；可参考 mvp 的 `visual-baseline` 做法，否则样式回归只能靠肉眼 |
| **P1** | A+ 备份导入的文件选择未自动化 | 测试缺口 | B 端已用 `DOM.setFileInputFiles` 覆盖；把同一手法补进 `check:aplus` |
| **P1** | B 端消息页没有会话列表 | 结构缺口 | 只渲染 `chatMessages[0]` 所属会话，多条订单后旧会话不可达；需改 232 版面，动手前先确认交互。 |
| **P2** | 坏档门禁的最外层是 UI 守卫 | 健壮性取舍 | 绕过界面直接调 `store.resetDemoData()` 仍可覆盖原文；若要硬保证，需把「已确认」标记做进领域层 |
| **P2** | A+ 全树重渲染 | 性能 | `revision` 单版本号订阅；记录上千时改按字段订阅 |
| **P2** | `computed` 不缓存 | 性能/取舍 | 派生每次读取重算；规模小可接受，先量化再改 |
| **P2** | 三个超大单文件 | 可维护性 | `store.ts` 2320 行、`workbench.ts` 1517 行、`AppContext.tsx` 749 行；拆分前先补契约测试 |
| **P3** | 仅 Chromium 验证 | 兼容风险 | 补 Firefox / Safari / 微信 X5 真机 |
| **P3** | A+ 无独立大字模式；`mobile-nav` 未验刘海屏 | 适老化 | 复用 B 的关怀模式令牌；补 `env(safe-area-inset-*)` |
| **P3** | 无 Service Worker | 能力边界 | A+ 未移植 `OfflineNotice`；如要离线需连同预缓存一起做 |

### 3.2 需求文档有、代码没有（摘要）

完整逐条见 `docs/delivery/gap-report.md` 第三节。

| 类别 | 缺口 |
|---|---|
| R5 实名 | 只有拦截演示，无真实校验通道 |
| R6 敏感信息 | 只有字段裁剪与文案，无加密、无访问审计、无接单后限时可见 |
| R7 内容审核 | 有先审后发与人工审核，无敏感词库、无图片审核（本就不上传图片） |
| R8 日志留存 | 仅本机 `auditLog`，随浏览器清除消失，不满足 ≥ 6 个月 |
| R9/R13/R19/R20 | 备案、协议自查、论坛主体责任、安全评估均「未办理」，仅页脚声明 |
| T2/T8/T11/T12 | 无通知投递、无实时通道、无服务端幂等、无限流 |
| T7/T14 | 无上传能力（压缩、EXIF、白名单、扫描均不适用） |
| T15 | 无自动备份，只有手动导出 |
| T17/T18 | B 有大字与 TTS；A+ 无独立大字；无子女代发/社区帮办 |
| O1/O5 | 无审核值班表与时限承诺；无意外预案流程 |

### 3.3 已知技术债细节（含触发条件）

1. **B 端坏档门禁在 UI 层**：P6 起 B 也有「先下载原文才能重置」，但守卫在 `AppContext`（`unreadableArchiveExported`）而非领域层；直接调用 `store.resetDemoData()` 仍可覆盖原文。
2. **A+ 全树重渲染**：`useSyncExternalStore` 订阅单一 `revision`。数百条无感；上千条或上万条时间线会明显卡顿。
3. **`computed` 惰性不缓存**：`filteredCases`、`communityRegisteredCases` 每次读取重算。换来「永不失效」，代价是重复计算。
4. **`AppContext.tsx` 是契约单点**：字段名与签名被 232 契约钉死，634 行未拆。拆分前必须先补契约测试，否则 B 端 22 个组件会集体失配。
5. **`data/community/store.ts` 2320 行**：状态机、派生、持久化、审核、举报、投诉、账本全在一个模块。改动时优先加方法，不要再加分支到既有函数。
6. **验收只在 Chromium**：`tools/lib/cdp.mjs` 只找 Chrome/Edge，无法覆盖微信 X5。
7. **截图不入库**：评审看不到历史视觉状态，只能本地复现。
8. **`scripts/` 为空目录**：`.gitignore` 仍保留 `scripts/.mcp_session` 规则，属历史遗留，可删可留。

### 3.4 明确不做的事（不要"顺手补上"）

- 不接后端、不写 API 客户端、不加登录态。
- 不做真实通知（短信/推送/IM）、不做支付/充值/兑换。
- 不做文件上传、定位、地图。
- 不引入 UI 组件库替换现有版式；不引入外部 CDN、字体、图片。
- 不引入 PWA/Service Worker（除非连同预缓存与更新提示一起做）。
- 不把时间币改成可结算余额。

### 3.5 三条可选路线（供决策，不代替决策）

| 路线 | 内容 | 优点 | 代价 |
|---|---|---|---|
| A. 收口交付 | 合并 PR、补视觉基线、修 P1 缺口 | 交付完整、风险低 | 不产生新能力 |
| B. 生产化改造 | 接后端、鉴权、真实审核与通知 | 可试点 | 工作量数倍于当前原型，合规前置条件多 |
| C. 作为教学/评审样本 | 保持现状，补文档与演示脚本 | 成本最低 | 不再演进，需明确冻结 |

---

## 4. 关键技术选型与架构说明

### 4.1 选型表

| 领域 | 选型 | 版本 | 理由 |
|---|---|---|---|
| 框架 | React | 19.2.6 | 本轮移植目标栈；A+ 从 Vue 组合式函数改写为 store |
| 构建 | Vite | 7.3.2 | 原生多入口（`rollupOptions.input`），两份 HTML 各自闭环 |
| 语言 | TypeScript | 5.9.3 | `strict` + `noUnusedLocals` + `noUnusedParameters`，构建前先过类型 |
| B 端样式 | Tailwind CSS | 4.1.17 | CSS-first `@theme`，无 `tailwind.config`；令牌写在 `src/index.css` |
| A+ 样式 | 原生 CSS | — | 沿用 mvp 的类名与令牌（`src/aplus/styles.css`，824 行），不混入 Tailwind |
| 图标 | lucide-react | 1.61.0 | 按需引入，避免图标字体与外部素材 |
| 动效 | canvas-confetti | 1.9.4 | 仅用于提交成功的彩带，可被 `prefers-reduced-motion` 降级 |
| 类名合并 | clsx + tailwind-merge | 2.1.1 / 3.4.0 | `cn()` 统一处理条件类名 |
| 路由 | 无库，查询串 | — | A+ `?case=`；避免为两个入口引入 router |
| 响应式 | 自研原语 | — | `src/data/reactive.ts` 约 90 行：`ref` / `computed` / `createReactiveStore` |
| 验收 | 自研 CDP 客户端 | — | 零依赖，Node 22 全局 `WebSocket`，不引 Playwright/Puppeteer |
| 测试框架 | **无** | — | 没有 vitest/jest；验收 = 4 个 CDP 脚本，不要去找 `npm test` |

### 4.2 三个关键取舍

**① 双 HTML 入口，而不是单页路由。**
两个入口各自拥有 `<title>`、`noindex`、`noscript` 兜底与内联图标。共用单一外壳会串标题与兜底文案，也会让 A+ 被迫加载 Tailwind。

**② 去掉 `vite-plugin-singlefile`。**
该插件官方明确不支持多入口（issue #51 wontfix）。内联后两份 HTML 会各自打包一份共享领域层，体积翻倍，且 A+ 无法单独加载自己的样式表。改为常规多入口 + 共享 chunk 后，`dist/assets/types-*.js` 只出现一次、被两份 HTML 共同引用。

**③ 领域层与框架解耦。**
`src/data/**` 不 import React、不 import 组件，只用自研原语。这使得 Vue → React 移植只需替换响应式与生命周期，业务判断可以逐条对照，也让「接后端只改持久化函数」成为可能。

### 4.3 分层与依赖方向

| 层 | 位置 | 职责 |
|---|---|---|
| 入口层 | `index.html` + `main.tsx`；`aplus.html` + `main-aplus.tsx` | 各自闭环，互不引用对方样式 |
| 外壳层 | `App.tsx`；`aplus/App.tsx` | 版面装配、错误边界、跳过链接、弹层调度 |
| 状态层 | `context/AppContext.tsx`；`aplus/workbench.ts` | 身份与导航、动作编排、表单草稿、提示、深链 |
| 领域层 | `data/community/*`、`data/intake/*` | 类型、状态机、校验、存档读写；**与框架无关** |
| 原语层 | `data/reactive.ts` | `ref` / `computed` / `createReactiveStore` |
| 组件层 | `components/*.tsx`（22）、`aplus/components/**`（21） | 只做展示与事件绑定 |
| 基础层 | `utils/*`、`hooks/*`、`shared/*` | 音频、Toast、剪贴板、查询串、异常上报 |

**依赖方向严格单向：组件 → 状态层 → 领域层。** 组件不得自建业务状态副本，领域层不得 import 组件。

### 4.4 状态与数据流

```
用户操作 → 组件回调 → 状态层动作（AppContext / aplusWorkbench）
        → 领域 store 变更 → 存档写入 localStorage → 版本号 +1
        → useSyncExternalStore 触发重渲染 → 组件读派生值
```

- B 端：`useCommunityStore`（`data/community/store.ts`），存档键 `community-mvp.synthetic-state.v1`。
- A+ 端：`aplusWorkbench`（唯一状态源）+ `useIntakeStore`，存档键 `a-plus.synthetic-intake.v1`。
- A+ 订阅单版本号 `revision`；`intake` store 的写入由工作台转接，否则界面不重渲染。
- UI 偏好单独成键（如 `community.ui.active-tab`），不与业务数据混存。

### 4.5 订单状态机与记账

```
open → accepted-local-demo → completion-requested → completed-local-demo
         ↓                          ↓
   cancelled-local-demo       disputed-local-demo → resume / close
```

- 六个状态全部带 `-local-demo` 后缀或「（本机演练）」后缀，**状态文案本身即提示**。
- 全部转换集中在 `data/community/store.ts`；`orderEvents` 为追加式时间线（上限 100 条）。
- `actor` 可为 `demo-side` / `synthetic-counterpart` / `reviewer`；本机没有真实对方，代确认必须标注「合成对方（代记录）」。
- **账本只追加 `unsettled` 流水，store 中不存在任何结算动作**。类型层面把「记账」与「结算」分开，是 R18 的落地方式。

### 4.6 存档容错

`CommunityStorageStatus` / `IntakeStorageStatus` 共六态：`ready / saved / memory-only / recovery-required / save-error / conflict`。

- 读写失败**不抛异常**，落到对应状态并由 UI 说明。
- `recovery-required` 时 A+ 必须先下载旧存档原文才允许重置；B 端暂无此强制路径（见 §3.3-1）。
- 隐私模式下写失败应退化为 `memory-only`，不得静默丢数据。

### 4.7 A+ 弹层焦点（APG Dialog 最小闭环）

- 初始焦点优先级：`[data-autofocus]` → 首个可编辑字段 → 首个可聚焦元素。
- `Tab` / `Shift+Tab` 在弹层内循环；`Esc` 交给调用方决定是否关闭。
- 关闭后焦点归还触发元素（**按元素引用比对**，不是按选择器）。
- 背景用 `inert`，**不用** `aria-hidden`，避免双重隐藏导致读屏重复播报。
- 与 Vue 版差异：Vue 有 `watch(isOpen)` 同步点，React 没有，改为每个开/关动作末尾显式 `sync()`。新增弹层时容易漏这一步。

### 4.8 样式与令牌

| 端 | 文件 | 令牌 | 约束 |
|---|---|---|---|
| B | `src/index.css`（168 行） | `--text-body/title/small`、`--tap-min`、`--focus-ring`、`--radius-card`、`--ease-out`、`--brand-*` | Tailwind 4 `@theme`；表单控件字号 ≥ 16px；焦点环 2px 实色 |
| A+ | `src/aplus/styles.css`（824 行） | `--fs-*`、`--sp-*`、`--r-*`、`--tap` | 沿用 mvp 类名；不加载 Tailwind，B 不加载此文件 |

两套令牌**互不引用**。A+ 顶栏高度与 `.section-jump` 的 sticky top 必须引用同一变量，否则吸顶锚点会错位。

---

## 5. 代码结构与重要文件

### 5.1 目录树

```
repo/
├─ index.html                  B 端入口（noindex / noscript / 内联图标）
├─ aplus.html                  A+ 入口（同上，独立标题与兜底文案）
├─ vite.config.ts              双入口 + @ 别名；无 singlefile
├─ tsconfig.json               strict + noUnusedLocals/Parameters
├─ public/robots.txt           Disallow: /
├─ src/
│  ├─ main.tsx                 B 启动（Tailwind）
│  ├─ main-aplus.tsx           A+ 启动（仅 styles.css）
│  ├─ App.tsx                  B 外壳
│  ├─ aplus/                   A+ 工作台：workbench / context / 焦点 / toast / tablist / 21 组件
│  ├─ components/              B 端 24 个组件（含 P6 的 StoragePanel / StorageBanner）
│  ├─ context/AppContext.tsx   B 端契约适配层（749 行，含存档投影与恢复动作）
│  ├─ data/
│  │  ├─ reactive.ts           自研响应式原语
│  │  ├─ community/            B 领域层（9 文件，store.ts 2320 行）
│  │  └─ intake/               A+ 领域层 + 社区桥 + 备份（7 文件）
│  ├─ selectors/community.ts   领域实体 ↔ 视图模型纯函数
│  ├─ shared/                  clipboard / route-state / error-reporting / download
│  ├─ hooks/useDialog.ts       弹层开关与滚动锁定
│  ├─ utils/                   audio / cn / draft / moderation / storage / toast
│  └─ types/index.ts           232 契约类型
├─ tools/
│  ├─ lib/cdp.mjs              零依赖 CDP 客户端（自动找 Chrome/Edge）
│  └─ check-*.mjs              5 个验收脚本（含 check-recovery）
├─ docs/                       架构、设计、交付、调研、证据
└─ dist/                       构建产物（gitignore，部署时现构建）
```

### 5.2 必须认识的文件

| 文件 | 规模 | 作用 | 改动风险 |
|---|---|---|---|
| `src/data/community/store.ts` | 2320 行 | B 端唯一领域 store：状态机、派生、持久化、审核、举报、投诉、账本 | **高**：所有 B 端行为都经过此处；改派生要同时核对选择器 |
| `src/aplus/workbench.ts` | 1527 行 | A+ 唯一状态源：`show*` 开关、表单草稿、筛选、深链、动作编排 | **高**：新增弹层必须同时改 `show*`、`open/close`、`App.tsx` 挂载 |
| `src/context/AppContext.tsx` | 634 行 | B 端契约适配：字段名/签名与 232 一致，实现读社区 store | **高**：改签名会连带 22 个组件；拆分前先补契约测试 |
| `src/data/community/types.ts` | — | 五条状态机类型与枚举；`ORDER_EVENT_TYPES` 唯一扩展点 | 中：扩展需同步 UI 文案与验收断言 |
| `src/selectors/community.ts` | — | 实体 → 视图模型；`viewAuthorId()` 修过「永远看不到签到」的断链 | **高**：身份投影错误会让权限与按钮同时失效 |
| `src/data/intake/intake.ts` | — | A+ 受理领域逻辑：校验、去重、敏感信息拦截 | 中：去重键与摘要截断长度被验收断言依赖 |
| `src/data/intake/community-bridge.ts` | — | 只读 B 存档 → 校验 → 映射受理输入 | **高**：任何写回都会破坏两端隔离 |
| `src/data/intake/intake-backup.ts` | — | 导出/导入、5 MB 上限、坏档原文导出 | 中：导入失败必须给原文下载路径 |
| `src/data/reactive.ts` | 约 90 行 | `ref` / `computed` / `createReactiveStore` | 低：被全项目依赖，改动需全量回归 |
| `src/aplus/dialog-focus.ts` | — | APG 焦点闭环 | 中：漏 `sync()` 会导致焦点掉到 `body` |
| `src/shared/route-state.ts` | — | 查询串读写、popstate、分享链接 | 低：仅 A+ 使用 |
| `src/components/AdminCenter.tsx` | — | 审核、举报处置、投诉、审计日志 | 中：处置输入框共享状态已知瑕疵 |
| `src/components/CommunityTab.tsx` | — | 信息流、互动、每帖举报入口 | 中：`visiblePosts` 的过滤条件不可放宽 |
| `src/components/OrderDetailModal.tsx` | — | 履约全流程与账本展示 | 中：按钮可用性由状态机守卫决定，不要在前端另写判断 |
| `src/aplus/styles.css` | 824 行 | A+ 全部样式与令牌 | 中：类名与 mvp 对齐，重命名会连带 21 个组件 |
| `vite.config.ts` | 35 行 | 双入口、别名 | 低：改入口名会破坏验收脚本的 URL |
| `tools/lib/cdp.mjs` | — | 启动 headless Chrome、临时 profile、清理重试 | 低：`EBUSY` 已重试，勿把清理失败当断言失败 |

### 5.3 组件清单

- **B 端 22 个**：`HomeTab`、`CommunityTab`、`TasksHall`、`MessagesTab`、`ProfileTab`、`AdminCenter`、`HeaderNav`、`BottomTabBar`、`PublishModal`、`OrderDetailModal`、`SearchModal`、`RealNameModal`、`CertificateModal`、`CommunityQrModal`、`EldercareModal`、`HelpCenterModal`、`SosModal`、`TermsModal`、`FooterCompliance`、`BrandMark`、`SmartImage`、`ErrorBoundary`。
- **A+ 11 个版面**：`AppTopBar`、`AppSideRail`、`MobileNav`、`PageHeading`、`SyntheticBanner`、`IntakeGate`、`MetricGrid`、`QueuePanel`、`CaseDetail`、`ComplaintPanel`、`BackupTextPanel`。
- **A+ 10 个弹层**：`CreateCase`、`Transition`、`Checkpoint`、`FollowUp`、`ContactSimulation`、`HighRiskStop`、`Reopen`、`Complaint`、`CommunityBridge`、`Help`。

### 5.4 工具链

| 文件 | 作用 | 注意 |
|---|---|---|
| `tools/lib/cdp.mjs` | 零依赖 CDP：启动浏览器、建页、收集控制台异常、量溢出、点击、Esc | 自动查找 Chrome/Edge，可用 `CHROME_PATH` 覆盖 |
| `tools/check-dual-entry.mjs` | 27 项双入口与响应式 | 依赖 `BASE_URL`，默认 5180 |
| `tools/check-aplus-flow.mjs` | 24 项 A+ 主流程 | 会创建带随机后缀的演练记录，互不污染 |
| `tools/check-community-flow.mjs` | 11 项 B 主链路 | 断言「拦截时不写存档」 |
| `tools/check-acceptance.mjs` | 27 项履约与举报链路 | 补测后新增，覆盖三处历史断链 |

### 5.5 文档地图

| 文档 | 用途 | 何时读 |
|---|---|---|
| `README.md` | 总览、演示 vs 生产对照、已知边界 | 第一次接触 |
| `docs/ARCHITECTURE.md` | 分层、状态流、扩展点 | 动手改代码前 |
| `docs/DESIGN.md` | 视觉定位、动效、无障碍原则 | 改 UI 前 |
| `docs/delivery/component-data-map.md` | 每个组件读哪个字段、调哪个方法 | 定位数据来源 |
| `docs/delivery/gap-report.md` | 双向缺口、需求未实现项、技术债 | 评估工作量 |
| `docs/delivery/change-list.md` | 新增/修改/删除/修复四类清单 | 评审 diff |
| `docs/delivery/acceptance.md` | 117 项验收明细与合规逐条验证 | 复现与核对 |
| `docs/research/p1–p6*.md` | 各阶段调研与取舍 | 理解「为什么不用某方案」 |
| `docs/agents/log.md` | 推送日志、PR、验证结果、风险 | 追溯提交背景 |

---

## 6. 运行与部署

### 6.1 环境要求

| 项 | 要求 | 说明 |
|---|---|---|
| Node.js | **≥ 22**（实测 22.22.2） | 验收脚本依赖全局 `WebSocket`；Vite 7 需 Node 20.19+/22.12+ |
| 浏览器 | Chrome 或 Edge | 验收脚本会自动查找；也可用 `CHROME_PATH` 指定 |
| 系统 | Windows / macOS / Linux 均可 | 现有脚本路径优先 Windows，其他平台需设 `CHROME_PATH` |
| 网络 | 仅安装依赖时需要 | 运行与验收全部本地，无外部请求 |

### 6.2 安装与开发

```bash
cd D:/网页开发/repo
npm ci                 # 依赖已锁定；无网络时可复用现有 node_modules
npm run dev            # 开发服务器，默认 5173
# B 端：http://localhost:5173/
# A+ 端：http://localhost:5173/aplus.html
```

### 6.3 验收复现（必须 5180）

五个脚本的默认 `BASE_URL` 是 `http://localhost:5180`，**不是** `preview` 默认的 4173。

```bash
npm run typecheck
npm run build
npx vite preview --port 5180 --strictPort     # 单独终端，保持运行

npm run check:dual        # 27
npm run check:aplus       # 24
npm run check:community   # 11
npm run check:acceptance  # 27
```

可覆盖的变量：

```bash
BASE_URL=http://localhost:4173 npm run check:dual   # 换端口
CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" npm run check:dual
```

脚本会新建临时浏览器 profile，**不依赖你现有的 localStorage**；结束时清理失败会自动重试（Windows `EBUSY`）。

### 6.4 构建产物（2026-10-24 实测）

```
dist/index.html                    2.17 kB │ gzip  1.35 kB
dist/aplus.html                    2.16 kB │ gzip  1.31 kB
dist/assets/community-*.css       87.38 kB │ gzip 13.41 kB   ← B 端 Tailwind
dist/assets/aplus-*.css           33.38 kB │ gzip  7.56 kB   ← A+ 原生 CSS
dist/assets/community-*.js       278.46 kB │ gzip 77.33 kB
dist/assets/aplus-*.js           172.34 kB │ gzip 42.52 kB
dist/assets/types-*.js           196.40 kB │ gzip 62.34 kB   ← 两端共享，只出现一次
dist/robots.txt
```

> `docs/delivery/acceptance.md` 中的 276.85 kB 是 P4.1 修复前的旧值；以本节实测为准。

### 6.5 静态部署

产物是**纯静态文件**，无服务端依赖：

1. `npm run build`，把 `dist/` **整个目录**上传到站点根路径（资源引用为 `/assets/...`，不支持子路径部署）。
2. 必须保留 `index.html` 与 `aplus.html` 两个文件及其文件名；A+ 没有独立目录。
3. **关闭 SPA fallback**（把所有未知路径重写到 `index.html`）。本项目无 path 路由，开启 fallback 会让 `/aplus.html` 被 B 端覆盖。
4. 建议缓存策略：HTML 短缓存或不缓存；`/assets/*` 长缓存（文件名含内容哈希）。
5. 部署后自查：
   - `https://<host>/` 与 `https://<host>/aplus.html` 均可打开，标题不串；
   - 控制台无 404（尤其 `favicon.ico`，已用内联图标规避）；
   - `robots.txt` 返回 `Disallow: /`；
   - 断网/清缓存后仍可打开（无 SW，属正常，不要求离线可用）。

**未完成的上线前置**：未绑定域名、未开 GitHub Pages、未办 ICP/公安联网备案、无 HTTPS 配置、无监控。若要对外发布，先完成 §3.2 的合规项，不要在演示文案上写「已上线」。

### 6.6 常见故障

| 现象 | 原因 | 处理 |
|---|---|---|
| `Fatal process out of memory: Zone` | 可用内存过低（本机曾低至 0.2 GB） | `NODE_OPTIONS=--max-old-space-size=1200 npm run build`；仍失败则先 `--minify false` 验证产物 |
| 验收脚本报「未找到 Chrome/Edge」 | 非默认安装路径 | 设 `CHROME_PATH` |
| 验收全红、页面 404 | 未 build 或 preview 不在 5180 | 先 `npm run build`，再 `npx vite preview --port 5180 --strictPort` |
| 清理临时目录 `EBUSY` | Windows 上 Chrome 退出滞后 | 已在 `cdp.mjs` 重试；持续出现则手动结束残留 chrome 进程 |
| 刷新后数据不见 | 隐私模式 / 存档写失败 | UI 应显示 `memory-only`；不是 bug，但需确认状态文案正确 |
| A+ 界面操作后不刷新 | 绕过 workbench 直接写 intake store | 必须经工作台动作，由 `revision` 转接 |

---

## 7. 后续接手者需要优先关注的注意事项

### 7.1 第一天 checklist

1. `git status` 与 `git branch -vv`：确认在 `agent/workbuddy/aplus-react-port`，不要直接在 `main` 上改。
2. 读 `README.md` → `docs/ARCHITECTURE.md` → `docs/delivery/gap-report.md` → `docs/delivery/acceptance.md`（顺序不要反）。
3. 跑 `npm run typecheck` + `npm run build`，确认本地基线可用。
4. 起 5180 预览，五个验收脚本全跑一遍，确认 117/117；若数字不符，先查环境（Node 版本、Chrome、端口），不要先改代码。
5. 打开两端各走一遍主链路：B 端「发布 → 审核 → 接单 → 签到 → 完成 → 账本」；A+ 端「社区桥 → 登记 → 检查点 → 流转 → 备份」。
6. 确认 PR #1 的 diff 范围与你将要改的文件是否重叠，避免重复劳动。

### 7.2 十条硬规则

1. **不要给账本加结算**：`unsettled` 是合规设计，不是未完成功能。加余额、兑换、转让会直接破坏 R18 的论证。
2. **不要绕过 `pending`**：任何发布路径都必须先审后发；`visiblePosts` 的过滤条件不可放宽。
3. **不要恢复 `tel:` 链接**：急救只给文字提示。全仓 `href="tel:` 必须保持 0。
4. **不要采集真实个人信息**：包括示例手机号、身份证格式串、门牌号；演示证明只放演练编号。
5. **不要写「官方」**：用「项目组 / 演练」。任何授权暗示都要改掉。
6. **不要引入外部 CDN / 字体 / 图片**：图标用内联 SVG，头像空串走渐变占位。
7. **不要在组件里复制业务状态**：A+ 一律 `useAplusContext()`；B 端一律走 `AppContext`。
8. **不要写回 B 端存档**：`community-bridge.ts` 只读。需要新字段就在映射层加，不要改对方数据。
9. **不要跳过弹层焦点三件套**：进入、循环、归还；新增弹层后必须手动 Tab 一圈 + Esc 验证。
10. **不要按页面写验收**：按状态机的边写。历史教训是「页面能打开」但「边走不通」，三处断链就是这样漏掉的。

### 7.3 按层改动套路

| 要改什么 | 改哪里 | 同步要改 |
|---|---|---|
| 新增发布类型 | `data/community/types.ts` 的 `POST_MODES` | `PublishModal` 模式、`selectors/community.ts` 映射、审核筛选 |
| 新增 A+ 弹层 | 新建 `aplus/components/dialogs/*.tsx` | `workbench.ts` 的 `show*`/`open*`/`close*`、`aplus/App.tsx` 挂载、焦点 `sync()` |
| 新增 A+ 筛选 | `filter-preference.ts` 的 `INTAKE_FILTERS` | `workbench.ts` 的 `filteredCases` 分支、指标卡 |
| 接后端 | `data/*/store.ts` 的 `writeSnapshot` / `loadInitialState` | 保持 store 对外字段与方法名不变；先补契约测试 |
| 换内容安全 | `utils/moderation.ts` 的 `moderateContent` | A+ 侧在 `data/intake/intake.ts` |
| 改视觉 | B：`index.css` + Tailwind 类；A+：`styles.css` | 两套令牌不互引；改后跑五档宽度与焦点检查 |
| 加验收项 | `tools/check-*.mjs` | 同步 `docs/delivery/acceptance.md` 与 `README.md` 的项数 |

### 7.4 协作与提交规范

- 不推 `main`、不 force push、不改写远端历史。
- 分支名：`agent/<agent>/<主题>`；提交带 `Agent` / `Session` / `Step` trailer。
- 每次推送在 `docs/agents/log.md` 登记：分支、基线、提交、PR、验证结果、未做与风险。
- 已知历史问题：`3e6d5cf` / `20b3a7b` 的作者是 `WorkBuddy`，与规范要求的 `agent:workbuddy` 不一致；因不能 force push，**只对后续提交生效**，不要试图改写。
- 提交前最低验证：`typecheck` + `build` + 受影响的验收脚本。

### 7.5 五个常见误解

1. **「117 项通过 = 可以上线」**：不等于。117 项只证明本机合成数据下主链路与异常路径可走通，无后端、无鉴权、无合规手续。
2. **「`docs/evidence` 里有截图」**：没有。PNG 被 gitignore，只有 `report.json`；截图需本地跑脚本。
3. **「项目用了 Noto Sans SC 字体」**：`index.css` 字体栈首选它，但**没有 `@font-face`、没有自托管**；系统未安装时回退到系统字体。不要为了「补齐」引入 CDN。
4. **「A+ 和 B 的投诉是同一套」**：不是。B 的是本机反馈工单，A+ 的是针对演示角色的复核队列，同名不同义，刻意未合并。
5. **「有 `?case=` 就说明 B 端也有深链」**：没有。B 端页签只存 `localStorage`，分享链接只能到首页。需要 B 端深链是新增需求，不是修 bug。

---

## 附录 A · 命令速查

```bash
# 安装与开发
npm ci
npm run dev

# 质量门禁
npm run typecheck                  # tsc --noEmit
npm run build                      # 双入口产物
npx vite preview --port 5180 --strictPort

# 验收（五脚本，共 117 项）
npm run check:dual
npm run check:aplus
npm run check:community
npm run check:acceptance
npm run check:recovery

# 低内存构建
NODE_OPTIONS=--max-old-space-size=1200 npm run build

# 版本状态
git branch -vv
git log --oneline -5
git status --short

# 合规自检
grep -rn 'href="tel:' src        # 应无输出
grep -rn '@font-face' src        # 应无输出
grep -rn 'https\?://' src        # 仅应命中注释/说明，不得出现在 src/href 属性
```

---

## 附录 B · 可直接粘贴的交接提示词

> 用法：新开一个会话，把下面整段发给接手者（人或 AI），即可获得自包含的上下文。

```text
你是「社区服务双入口原型」项目的接手维护者。请先建立上下文，再动手。

【项目位置】
D:\网页开发\repo（Windows，Git Bash）。仓库 https://github.com/433525/2026-10-232
当前分支 agent/workbuddy/aplus-react-port @ e871309，已与 origin 同步，工作区干净。
main 停在 ea48ac0，不包含 A+ 与双入口改造。PR #1 打开未合并。

【项目是什么】
纯前端合成数据演练原型，两个入口共用一份领域层：
- B 端受控社区 /（index.html）：居民视角，发布、先审后发、接单、签到、完成、留言、审核后台、时间账本。
- A+ 受理工作台 /aplus.html：内部视角，登记队列、分诊、检查点、高风险停止、投诉复核、备份、?case= 深链。
两端唯一耦合是 src/data/intake/community-bridge.ts，只读 B 端存档，绝不写回。
技术栈：React 19.2.6 + Vite 7.3.2 + TypeScript 5.9.3；B 端 Tailwind 4.1.17，A+ 原生 CSS；无路由库、无测试框架、无后端。
规模：src 约 19,576 行；B 端 22 组件，A+ 21 组件（11 版面 + 10 弹层）。

【硬边界，不可突破】
1. 仅合成数据，不得写入任何真实姓名、手机号、身份证、门牌号、病史、机构名。
2. 无生产能力：无 API、无数据库、无鉴权、无通知投递、无支付、无上传/定位。
3. 不冒充官方：只用「项目组 / 互助演练」，不写「官方认证 / 居委会 / 街道 / 网格长」。
4. 非急救通道：只提示「请手动拨打 120 / 110」，全仓 href="tel: 必须为 0。
5. 时间币只记账不结算：LedgerEntry 恒为 unsettled，不得加余额、兑换、转让。
6. 先审后发不可绕过：publishPost 一律 pending，visiblePosts 只取 approved。
7. 不引入外部 CDN / 字体 / 图片；不引 UI 库；不加 Service Worker（除非整套离线方案一起做）。

【当前状态】
typecheck 0 错误；build 成功（2.14s）；自动化验收 117/117（27 双入口 + 24 A+ + 11 B + 27 履约链路 + 28 异常路径与恢复）。
证据在 docs/evidence/*/report.json（截图不入库）。
已知缺口：A+ 导入自动化未接、消息页无会话列表、坏档门禁最外层是 UI 守卫、
A+ 全树重渲染、computed 不缓存、三个超大单文件、仅 Chromium 验证、无视觉像素基线。

【第一步请按顺序做】
1. 读 README.md、docs/ARCHITECTURE.md、docs/delivery/gap-report.md、docs/delivery/acceptance.md。
2. 运行：cd D:/网页开发/repo && npm run typecheck && npm run build
3. 起预览：npx vite preview --port 5180 --strictPort（验收脚本默认 BASE_URL 是 5180，不是 4173）
4. 跑五个脚本：npm run check:dual / check:aplus / check:community / check:acceptance / check:recovery，确认 117/117。
5. 手动走两条链路：B 端发布→审核→接单→签到→完成→账本；A+ 社区桥→登记→检查点→流转→备份。
6. 汇报：当前基线是否与文档一致、你打算改什么、影响哪些文件。

【改动规则】
- 组件不得自建业务状态副本：A+ 用 useAplusContext()，B 用 AppContext。
- 领域层（src/data/**）不得 import React 或组件；依赖方向只能是 组件 → 状态层 → 领域层。
- 新增 A+ 弹层要同时改 workbench 的 show*/open*/close*、App.tsx 挂载、dialog-focus 的 sync()。
- 改身份投影只改 src/selectors/community.ts，不要改数据层或组件（viewAuthorId 的教训）。
- 验收按状态机的边写，不按页面写；改 UI 后跑五档宽度 320/390/768/1024/1440。
- 提交前最低验证：typecheck + build + 受影响的验收脚本。
- 不推 main、不 force push；分支 agent/<name>/<topic>；推送后在 docs/agents/log.md 登记。

【交付要求】
改完请给出：改了哪些文件、为什么、验证命令与结果、未覆盖的风险。
不确定的产品口径先问，不要用「已实现」描述演示能力。
```

---

## 附录 C · 相关文档

| 文档 | 内容 |
|---|---|
| `README.md` | 总览、演示 vs 生产对照、快速开始、已知边界 |
| `docs/ARCHITECTURE.md` | 分层、关键机制、扩展点 |
| `docs/DESIGN.md` | 视觉定位、品牌、动效、无障碍 |
| `docs/delivery/component-data-map.md` | 组件 ↔ 数据源 ↔ 动作映射 |
| `docs/delivery/change-list.md` | 新增/修改/删除/修复清单 |
| `docs/delivery/gap-report.md` | 双向缺口、需求未实现项、技术债 |
| `docs/delivery/acceptance.md` | 117 项验收与十条合规逐条验证 |
| `docs/research/p1–p6*.md` | 阶段调研与方案取舍 |
| `docs/agents/log.md` | 推送日志、PR、验证与风险 |

---

**维护约定**：本文档描述的是「当前分支的事实」，不是规划。改动影响 §2、§3、§6 中任一数字时，请同步更新本文与 `README.md` 的验收项数。
