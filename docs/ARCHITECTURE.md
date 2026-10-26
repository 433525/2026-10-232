# 架构说明

> 面向维护者：分层、状态流、可扩展点，以及从 `community-service-mvp`（Vue 3）移植到 React 时做的取舍。
> 对应实现见 `docs/delivery/component-data-map.md`（谁读谁、谁调谁）。

## 1. 分层

| 层 | 位置 | 职责 |
| --- | --- | --- |
| 入口层 | `index.html` + `main.tsx`；`aplus.html` + `main-aplus.tsx` | 两个 HTML 各自闭环：入口脚本、`noscript` 兜底、`noindex`、内联图标 |
| 外壳层 | `App.tsx`（B）；`aplus/App.tsx`（A+） | 版面装配、错误边界、跳过链接、弹层调度 |
| 状态层 | `context/AppContext.tsx`（B 契约适配）；`aplus/workbench.ts`（A+ 唯一状态源） | 身份与导航、动作编排、表单草稿、提示与深链 |
| 领域层 | `data/community/*`、`data/intake/*` | 类型、状态机、存档读写、校验；**与框架无关** |
| 原语层 | `data/reactive.ts` | `ref` / `computed` / `createReactiveStore`（约 90 行，零依赖） |
| 组件层 | `components/*.tsx`（B 22 个）、`aplus/components/**`（A+ 21 个） | 只做展示与事件绑定 |
| 基础层 | `utils/*`、`hooks/*`、`shared/*` | 音频、Toast、剪贴板、查询串、异常上报 |

依赖方向单向：组件 → 状态层 → 领域层。**组件不得自建业务状态副本**，领域层不得 import 组件。

## 2. 关键机制

### 2.1 双入口与共享领域层

`vite.config.ts` 用 `rollupOptions.input` 声明两份 HTML。两端共享的 `data/**` 由 Rollup 抽成单个 `assets/types-*.js`，被两份 HTML 共同引用——**领域层只打一份**。
`sections` 之间没有运行时耦合；唯一的跨端通道是 `data/intake/community-bridge.ts`，它按存档键读取 B 端状态并做校验。

### 2.2 B 端订单状态机

```
open → accepted-local-demo → completion-requested → completed-local-demo
         ↓                        ↓
     cancelled-local-demo     disputed-local-demo → resume / close
```

六个状态都带 `-local-demo` 后缀或中文「（本机演练）」，**状态文案本身就在提示这不是真实履约**。
全部转换集中在 `data/community/store.ts`；`orderEvents` 是追加式时间线（上限 100 条），记录「谁在本机点了什么」，`actor` 可为 `demo-side` / `synthetic-counterpart` / `reviewer`。
`synthetic-counterpart` 的存在是为了演示「双方确认」——没有真实对方，所以由本机代记，并在界面标注「合成对方（代记录）」。

### 2.3 时间币：只读流水

`LedgerEntry.status` 恒为 `'unsettled'`，store 中**没有任何结算动作**。完成订单只追加一条未结算流水，不产生余额、不可兑现、不可转让。这是 R18 的落地方式：把「记账」与「结算」在类型层面分开。

### 2.4 存档容错

`CommunityStorageStatus` / `IntakeStorageStatus` 是六个显式状态：`ready / saved / memory-only / recovery-required / save-error / conflict`。
读写失败不抛异常，而是落到对应状态并由 UI 说明；`recovery-required` 时 A+ **必须先下载旧存档原文**才允许重置（B 端暂无此路径，见缺口报告）。

### 2.5 先审后发与留痕

`publishPost` 一律写 `moderation: 'pending'`；`visiblePosts` 只取 `approved && publishedToFeed !== false`。
审核动作（`moderatePost` / `moderateComment` / `resolveReport` / `hideOrderMessage` / `create-report`）都会追加 `auditLog`，`reason` 必填，审核**只改状态与理由，不改正文**。

### 2.6 A+ 工作台：去框架化

mvp 的 `useAplusWorkbench()` 是 Vue 组合式函数，依赖 `ref / reactive / computed / watch / nextTick / onMounted`。移植时只替换这六项，业务判断逐条保留：

| Vue | React 版 |
|---|---|
| `ref` / `computed` | `data/reactive.ts` 同名原语（惰性、不缓存） |
| `reactive(form)` | `ref<Form>` + `setForm(name, patch)` 整体替换 |
| `watch(activeFilter, …)` | `setActiveFilter()` 内显式写偏好 |
| `watch(() => action, …)` | `setTransitionAction()` 内同步 `reasonCode` |
| `nextTick()` | `afterPaint()`（双 rAF） |
| `onMounted` / `onBeforeUnmount` | `init()` 返回清理函数，由 `useEffect` 调用 |

组件通过 `useAplusContext()` 读取工作台，内部用 `useSyncExternalStore(subscribe, getVersion)` 订阅。`intake` store 的写入由工作台内的 `revision` 计数器转接，否则 A+ 界面不会跟着重渲染。

### 2.7 A+ 弹层焦点

`aplus/dialog-focus.ts` 实现 APG「Dialog (Modal)」最小闭环：`[data-autofocus]` → 首个可编辑字段 → 首个可聚焦元素；Tab/Shift+Tab 循环；Esc 交调用方；关闭后归还触发元素。
背景用 `inert`，**不用** `aria-hidden`（避免双重隐藏导致读屏重复播报）。
与 mvp 的差异：Vue 有 `watch(isOpen)` 这个同步点，React 没有，改为在每个开/关动作末尾显式 `sync()`。

### 2.8 社区桥：只读

`readCommunityHelpPosts()` 读 B 的本机存档 → 校验每条记录 → 返回 `{ status: 'ready' | 'missing' | 'error', posts, warnings, savedAt }`，坏记录进 `warnings` 而不是整体失败。
`mapCommunityHelpPostToIntake()` 把帖子映射成受理输入（标题→标签、正文→摘要并按 240 字截断、帖子 ID→`sourcePostId`）。
登记时按 `sourcePostId` 去重：已登记则提示已有记录 ID，不重复创建；摘要/标签完全重复则进入人工复核。

## 3. 设计 Token

- B 端：`src/index.css`（Tailwind 4 `@theme`）——`--text-body / --text-title / --text-small / --tap-min / --focus-ring / --radius-card / --ease-out`。
- A+ 端：`src/aplus/styles.css`（沿用 mvp 原生 CSS，787 行类名与令牌未改）——`--fs-* / --sp-* / --r-* / --tap`。

两套 Token 互不引用：A+ 不加载 Tailwind，B 不加载 A+ 的样式表。

## 4. 可扩展点

| 需求 | 建议改法 |
|---|---|
| 接后端 API | 替换 `data/*/store.ts` 的持久化函数（`writeSnapshot` / `loadInitialState`），保持 store 对外字段与方法名不变 |
| 换内容安全服务 | 替换 `utils/moderation.ts` 的 `moderateContent` 实现；A+ 的敏感信息拦截在 `data/intake/intake.ts` |
| 新增发布类型 | `data/community/types.ts` 扩展 `POST_MODES` + `PublishModal` 增加模式 + `selectors/community.ts` 补映射 |
| 新增 A+ 弹层 | 新建组件 + 在 `aplus/workbench.ts` 加 `show*` 与 `open*/close` + 在 `App.tsx` 挂载 |
| 新增 A+ 筛选 | `filter-preference.ts` 的 `INTAKE_FILTERS` + `workbench.ts` 的 `filteredCases` 分支 |
| 多语言 | 文案目前集中在组件与 `presentation.ts`，可抽为字典 |

## 5. 已知边界

- 无后端、无真实通知、无上传/定位/支付；所有状态在当前浏览器。
- A+ 全树重渲染（单版本号订阅）；记录上千时需改细粒度。
- 仅在 Chromium 验证；未测微信 X5 / Safari。
- B 端坏档恢复弱于 A+；A+ 未移植 `OfflineNotice`。
- 完整清单见 `docs/delivery/gap-report.md`。

## 6. 度量口径（持续改进基线）

改进指标只有在分母、取样方式与复现命令同时固定时才可比。以下四条口径为**唯一有效口径**，改动须走 ADR。

### 6.1 断言数量：只认运行时真值

- **真值来源**：各脚本运行后自写的 `docs/evidence/<slug>/report.json` 的 `total`。
- **禁止**用 `grep -c "check("` 计数。静态调用点 214 与运行时 223 的差值 9 全部来自 `check-dual-entry.mjs` 的 `checkOverflow()`：该函数被两端各调一次，内部按 320/390/768/1024/1440 五档宽度循环展开（2×5−1＝9）。
- 当前基线：223 项（dual 27 / aplus 24 / community 11 / acceptance 27 / recovery 28 / fixes-a 55 / fixes-b 39 / p0-gaps 12）。

### 6.2 断言密度：双口径并列，A 为考核口径

| 口径 | 分母 | 定义 |
|---|---|---|
| **A（考核）** | `src/context` + `src/data` + `src/aplus` + `src/selectors` 全部 `.ts/.tsx`，当前 12693 行 | 全量核心模块 |
| B（参考） | 四个核心单点（`AppContext.tsx`、`community/store.ts`、`intake/store.ts`、`aplus/workbench.ts`），当前 6004 行 | v1.0 历史口径 |

当前密度：A = 1.76 条/百行，B = 3.71 条/百行。两口径相差约一倍，**禁止混用**；M2 目标按口径 A 表述为 ≥2.09 条/百行，且须同时满足新增断言 ≥60 项。

### 6.3 构建体积：固定字节总量

M10 以 `dist/**` 全部文件**字节总和**判定（当前 781 KB）；`du -sh` 的 826 KB 含块对齐开销，换机器会漂移，不作为判据。（M9 是门禁耗时，定义见 §6.6。）

### 6.4 文档数字：分「契约」与「历史」

- **契约文档**（`docs/delivery/acceptance.md`、`docs/delivery/gap-report.md`、`docs/ARCHITECTURE.md`、`README.md`）中的数字声明必须与实测一致，由 `node tools/collect-baseline.mjs --strict` 判红。含 `≥`/`≤` 的行视为目标值，不计入偏差。
- **门禁耗时基线**（`docs/metrics/gate-timing.json`）由同一命令做五项校验（I-11/D-15）：分段与 `report.json` 一致、分项合计等于总计、记录断言数等于实测、`baseRevision` 为 HEAD 祖先、**被测面内容指纹与当前源码一致**。改 `src/` 或任一验收脚本即令耗时失效；只改文档不再失效。
- **历史流水**（`docs/agents/log.md`、P1–P10 沿革段）按「历史记录不追改」处理，不计入偏差数。
- 复现：`node tools/collect-baseline.mjs --strict`（<1 s，零依赖，可作提交级门禁）。

### 6.5 断言命名前缀

新增断言名以中括号前缀标注类别，供脚本精确统计，替代按关键词猜测的启发式：

| 前缀 | 含义 | 例 |
|---|---|---|
| `[neg]` | 负向路径：非法输入/越权/失败分支必须被拒绝，且状态不变 | `[neg] 损坏备份被拒绝且存档不变` |
| `[edge]` | 边界路径：空值、纯空白、超长、特殊字符 | `[edge] 空白理由仍禁用提交` |
| 无前缀 | 正向路径（存量 93 条均为无前缀） | `发布后帖子进入待审状态` |

统计口径：`[neg]` + `[edge]` 之和为负向覆盖率分子，分母为全部断言。存量断言未加前缀，故 6.1 的启发式占比（30.3%）仅作趋势参考。

### 6.6 门禁耗时：串行墙钟，分档判定

- **唯一计时方式**：`node tools/run-gate.mjs`（先 `vite preview --port 5180`）。每段独立进程、独立 CDP 端口，逐段计时后**自动**写回 `gate-timing.json`，不再人工抄表（抄表是 D-06 错配的来源）。
- **必须串行**：并发结果不得作为发布判据（D-14）。`--concurrency=N` 仅用于压测；2 路实测已出现 `fixes-b`/`p0-gaps` 连环失败，根因是固定时长等待在 CPU 争用下不足。
- **M9 分档**：快检（前五段，不含 fixes-a/b、p0-gaps）≤210 s；全量 ≤480 s；单段 ≤150 s（D-02、D-16）。
- **失效判定**：看 `surfaceHash`，不看提交时间；`serial`、`concurrency`、`wallMs`/`sumMs` 三字段同时存在才视为有效记录。
