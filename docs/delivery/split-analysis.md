# I-04 前置分析：契约层分域切分（不动代码）

> 用途：`D-24` 把「契约拆分」排在 W7–W8，但拆分动作本身受 `D-04` 约束（需人工值守窗口）。本文件是**执行前的测绘与边界约定**，只读代码、不改代码，使拆分在获批后可机械执行。
> 落盘日期：2026-10-27 ｜ 测绘基线：`ab7ca15`（248 项 / 437.2 s / 密度 A 1.96）
> 结论先行：**拆分能达成 M5（契约层 ≤400 行），但不能达成 M2（密度）**——`D-24` 的密度推算前提有误，见 §四。

## 一、现状测绘

`src/context/AppContext.tsx` 1013 行，是单文件承担三重职责：

| 职责 | 规模 | 位置 |
|---|---|---|
| 契约声明 `AppContextType` | **81 个键**（36 回调 + 45 状态/派生值） | 68–225 |
| 运行时装配（store 订阅、投影、音效、路由） | 1 处 `useSyncExternalStore`、11 处 `useState`、1 处 `useEffect` | 259–293、308–318 |
| 命令实现 | **36 个 `useCallback`** | 295–913 |
| 契约装配 `value` | 74 个显式键 + 派生计数 | 919–993 |

36 个回调是拆分的主体。逐个统计发现它们可归入 **1 个底座 + 5 个域**，且域间依赖是单向的。

## 二、分域方案（1 底座 + 5 域）

| 域 | 拟落文件（均在 `src/context/` 下） | 当前行区间 | 回调数 | 职责 |
|---|---|---|---|---|
| **R 运行时底座** | `runtime.ts`（内部，不进 `AppContextType`） | 259–293、800–803 | 0 | store 订阅与版本号、`projectContext` 投影、`currentUser`/`membership`、`storageStatus` 派生 |
| **A 导航与身份** | `use-navigation.ts` | 265–279、295–366 | 7 | UI 状态（tab/子页/选中项/搜索词）、路由双写与 pop 同步、身份切换、音频朗读 |
| **B 求助订单** | `use-help-orders.ts` | 368–570 | 8 | 发布求助、接单、签到、代接单、完成与评价、取消、发起/办结争议 |
| **C 社区互动** | `use-community-actions.ts` | 404–434、571–703 | 9 | 发帖、点赞、收藏、评论、报名、私信、举报、SOS、实名 |
| **D 后台治理** | `use-admin-actions.ts` | 704–804 | 7 | 帖子/评论的通过或驳回（含理由）、举报办结、时间币调整 |
| **E 存储与备份** | `use-storage-admin.ts` | 798–913 | 5 | 导出、坏档原文导出、重载、重置、导入 |

合计 7 + 8 + 9 + 7 + 5 = **36**，与实测回调数一致（`grep -c "= useCallback"` 为 36，另 1 处 `useCallback` 出现在 import 行）。

### 2.1 依赖分层（决定拆分顺序）

实测全部跨域写操作只有 6 处，且**全部指向 A 域**：

| 行 | 调用方（域） | 被调 | 语义 |
|---|---|---|---|
| 374 | `createHelpOrder`（B） | `setActiveSubPage('realname_verify')` | 未实名时跳到实名页 |
| 398 | `createPost`（B→C 的帖子分支） | `setActiveTab('home')` | 发布后回首页看结果 |
| 428 | `createPost`（C） | `setActiveTab('community')` | 发布后回信息流 |
| 685 | `triggerSos`（C） | `setActiveSubPage('sos_modal')` | 唤起求助弹层 |
| 698 | `verifyRealName`（C） | `setActiveSubPage(null)` | 关闭实名弹层 |
| 865 | `resetDemoData`（E） | `setActiveSubPage(null)` | 重置后回默认页 |

反方向（A 依赖 B/C/D/E）**零处**。因此依赖图是有向无环的**两层结构**：

```
R（store 订阅 + 投影）
└─ A（导航 / 身份 / 音频）
   ├─ B（求助订单）
   ├─ C（社区互动）
   ├─ D（后台治理）
   └─ E（存储与备份）
```

拆分顺序固定为 **R → A → B → C → D → E**。A 先落地，其余四域可并行且互不阻塞。

### 2.2 接缝约定（避免拆成「换个地方堆 1000 行」）

1. **底座只提供读取与副作用原语**：`store`、`projection`、`version`、`membership`、`currentUser`、`storageStatus`、`toast`、`sound`。不含任何业务判断（如 `membership === 'visitor'` 的前置守卫留在 B/C 域内）。
2. **A 域对外只暴露 8 个键**：`elderlyMode/setElderlyMode`、`activeTab/setActiveTab`、`activeSubPage/setActiveSubPage`、三个选中项、`searchKeyword`、`chatFocusPostId`、`playingArticleId/isAudioPlaying/playArticleAudio/stopArticleAudio`、`switchUser`、`isMessageRead/markAllMessagesRead`。其余四域只调不实现。
3. **底座不进 `AppContextType`**：R 是内部构造，不新增公共键——81 键保持不变，`useApp()` 的 24 处消费点零改动。
4. **状态归属不跨域**：`unreadableArchiveExported`（798 行）必须留在 E 域内，因为 `reloadArchive`（832）与 `importBackupFile`（873）共用同一条「坏档期间先下载原文」守卫；拆到域外即破坏该不变式。

## 三、执行步骤与逐步验证

拆分是**纯重构**：判据不是「跑通」，而是「现有 248 项判定一字未改仍全绿」。任何一条转红，先按实现缺陷排查，不得改判据迁就（`D-19` 只授权新增，不授权改判据）。

| 步 | 动作 | 观察点 | 失败处理 |
|---|---|---|---|
| S0 | 记录基线：`collect-baseline.mjs --write` + `gate` 全量 | 248/248、437.2 s、`surfaceHash` 旧值 | 基线不绿不启动 |
| S1 | 抽出 R（`runtime.ts` + 内部 Context） | `tsc --noEmit` 0 错误；`AppContext.tsx` 净减约 40 行 | 行数不降说明只做了搬移，需检查是否重复订阅 |
| S2 | 抽出 A（`use-navigation.ts`） | 路由断言（`?tab=`、`?post=`、pop 同步）全绿 | 路由双写会致历史栈错乱，优先查 `writeRoute` 是否被两处调用 |
| S3 | 抽出 B（`use-help-orders.ts`） | 8 个订单动作断言全绿；取消/争议理由必填仍生效 | 理由必填属状态机，不应受拆解影响 |
| S4 | 抽出 C + D + E（三域可并行） | 报名名额计数、举报去重、坏档恢复三段断言全绿 | 名额计数易受异步影响，失败先查是否多了一次渲染 |
| S5 | 收口：`AppContext.tsx` 只剩契约声明 + 装配 | `wc -l` ≤400（M5）；`value` 键数仍 81 | 键数变化即契约破坏，回退 |
| S6 | 全量门禁 + 重采基线 + 文档同步 | 248/248；`surfaceHash` 变更；ARCHITECTURE §6.2 分母与密度行同步 | 未同步即 `--strict` 退出码 1 |

每步的强制顺序：`tsc --noEmit` → `npm run build` →（`npx vite preview --port 5180 --strictPort` 已起）`npm run gate` → `collect-baseline --strict`。`run-gate` 不自启服务，这是 W6 已踩过的坑。

**成本估计**：S1–S5 约 2.5 人日（`D-24` 原估），S6 约 0.3 人日；每步全量门禁 437 s，六步合计约 44 分钟纯等待，可接受。

## 四、关键修正：拆分不改善 M2

`D-24` 写「拆分使核心 12682 → 约 12070 行，245 条即 2.03，再补 3 条定向断言达 2.05」。该推算不成立，原因是口径：

- **口径 A 的分母是目录集**：`src/context` + `src/data` + `src/aplus` + `src/selectors` 全部 `.ts/.tsx`（ARCHITECTURE §6.2）。拆出的 hook 落在 `src/context/` 或 `src/context/hooks/` 下，**仍在分母内**，总量只是从 1013 行的单文件摊到 6 个文件，不会减少。
- 若为降分母把 hook 移到 `src/app/`、`src/features/` 等目录，等于**把被测代码搬出度量范围**：密度上升不代表断言变密，只代表分母变小。这比「为凑指标写断言」更隐蔽，因为它同时改变了比较基准。
- 实测算术：留在 `src/context` 内 → 分母约 12682 + 桥接样板（约 60 行），248 ÷ 12742 = **1.95**，比拆分前的 1.96 还低 0.01；即便按 `D-24` 的乐观值 12070，248 ÷ 12070 = 2.05，也只是刚好压线，且前提是移出目录。

**更硬的结论：M2 被 M1 蕴含。** M1 终期 ≥265，而 265 ÷ 12682 = **2.09**，已高于 M2 目标 ≥2.05；同时 265 − 205 = 60，满足 M2 的第二条件「新增断言 ≥60」。

因此：

1. **M2 不需要任何定向断言，也不需要拆分**。它只是 M1 的派生结论。
2. **拆分应按可维护性立项，不按指标立项**：它的真实收益是 M5（单文件 1013 → ≤400 行）、冲突面收敛、单域可读性；这些不进指标表，但不是虚的。
3. **`D-24` 的「M1 与 I-06 二选一」代价被低估**：若选 I-06（M1 停在 248），则 M1 未达 ≥265、M2 停在 1.96 < 2.05，**两个指标同时不达标**；若选 M1，M2 自动达成，代价只是 M6 降级为「首测 + 归因」。这个取舍比 `D-24` 描述的更不对称。

ARCHITECTURE §6.2 原写「M2 目标 ≥2.09」，来源是 265 ÷ 12693 的算术值，与 v2.0 指标表的 ≥2.05 不一致。已按本节修正为 2.05 并注明 2.09 的出处，避免下一次改分母时再次误引。

## 五、风险清单

| # | 风险 | 触发条件 | 处置 |
|---|---|---|---|
| R1 | 路由双写 | B/C 域在调用 `setActiveTab` 后另行 `writeRoute` | 路由写入只允许出现在 A 域 `setActiveTab` 内，代码评审按此判 |
| R2 | 闭包失效 | 拆分后把 `projection` 加入 `useCallback` 依赖 | 依赖仍以 `version` 为准（现状即如此），`projection` 每次渲染重建，入依赖会导致回调每帧重建 |
| R3 | 全树重渲染恶化 | 各域 hook 各自返回新对象，且未保持现有「单对象 value」结构 | 本批**不引入** `useMemo` 包裹 `value`——那会改变渲染时序，属行为变更，须单独立项 |
| R4 | 坏档守卫被拆散 | `unreadableArchiveExported` 移出 E 域 | 见 §2.2 第 4 条，守卫与两个消费方必须同域 |
| R5 | 断言被顺手「修正」 | 拆分后某条断言转红，被当作断言过时 | 转红即视为契约破坏，回退该步；`D-19` 不授权改既有判据 |
| R6 | 可测性期望落空 | 期望拆分后能对单域做单测 | `sound`/`toast` 是模块级单例，拆分不引入依赖注入，单域仍不可独立测试；可测性需另立 I-16 |

## 六、与其它事项的关系

- **`D-24`（待确认）**：本文件为其 W7 排程提供执行依据；§四 修正了它的密度前提，但不动其「拆分优先 + 顺延 W9」的默认结论。
- **`D-22`（待修）**：`submitComplaint` 的 `already` 分支属 C 域，拆分时会被搬到 `use-community-actions.ts`。修 D-22 与拆分**不要同批**，否则 `submitComplaint` 的 diff 混杂重构与行为变更，注入验证难以归因。
- **`D-26`/`D-27`**：权限判据（`requireReviewer`/`requireMember`）在 store 层，不在契约层，拆分不影响；但断言依赖 UI 可达性，故 S4 后必须复跑这三条。
- **M5**：拆分是达成 M5（≤400 行）的唯一路径，且不受 `D-24` 的指标取舍影响——即使 M1 让位 I-06，拆分仍应做。
