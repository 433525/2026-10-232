# 组件 ↔ 数据源映射表

更新：2026-10-23。范围：`433525/2026-10-232` 双入口改造后的 B 端（`/`）与 A+ 端（`/aplus.html`）。
本表回答一个问题：**每个界面上看到的东西来自哪个文件、哪个字段，点了之后调用哪个方法。**

数据源只有两处，均在本机：

| 端 | 状态源 | 存档键 | 领域文件 |
|---|---|---|---|
| B 端 | `useCommunityStore`（`src/data/community/store.ts`） | `community-mvp.synthetic-state.v1` | `data/community/{types,fixtures,content,store,moderation-filters,publish-draft,banner-slides,reading-mode}.ts` |
| A+ 端 | `aplusWorkbench`（`src/aplus/workbench.ts`）+ `useIntakeStore`（`src/data/intake/store.ts`） | `a-plus.synthetic-intake.v1` | `data/intake/{intake,intake-backup,fixtures,store,community-bridge,community-intake-progress,filter-preference}.ts` |

两端唯一的耦合是 `src/data/intake/community-bridge.ts`：它**只读** B 端的存档键，不写回。

---

## 一、B 端页面 → 数据 → 动作

| 界面（组件） | 读取的数据 | 领域来源 | 写动作（store 方法） |
|---|---|---|---|
| `HomeTab` 搜索 / Banner / 快捷入口 | `visiblePosts`、`BANNER_ITEMS`、`ANNOUNCEMENTS`、`ELDERCARE_ARTICLES` | `store.ts` 派生 + `content.ts` + `banner-slides.ts` | `openCommunitySearch`、`openCommunityPost`（经路由参数） |
| `HomeTab` 附近志愿者 | `volunteers`（由 `membership` 派生的派生志愿者列表） | `selectors/community.ts` | —（纯只读） |
| `HomeTab` 热门求助 | `visiblePosts.filter(mode==='help')` | `store.ts` | `openCommunityPost` |
| `CommunityTab` 信息流 | `visiblePosts`（仅 `moderation==='approved' && publishedToFeed!==false`） | `store.ts:644` 附近派生 | — |
| `CommunityTab` 点赞 / 收藏 | `post.likedByMe`、`likeCount`、`favorited` | `Post` 字段 | `toggleLike`、`toggleFavorite` |
| `CommunityTab` 评论（先审后发） | `post.comments`（只展示 `approved`） | `Comment` | `addComment`（新评论 `pending`） |
| `CommunityTab` 举报 | `reports` | `Report` | `reportContent`、`resolveReport` |
| `CommunityTab`「项目组发布」筛选 | `SYNTHETIC_TEAM_AUTHOR_ID` 命中的帖子 | `selectors/community.ts` | — |
| `PublishModal` 三类发布 | 表单本地草稿 + `publish-draft.ts` | `PublishPostInput` | `publishPost`（写入 `moderation:'pending'`） |
| `PublishModal` 实名前置 | `membership` | `membershipFromUserId` | 拦截时 `setMembership` / 引导实名 |
| `TasksHall` 接单大厅 | `visiblePosts`（`mode==='help'`） | `store.ts` | `acceptOrder`、`clockInOrder` |
| `OrderDetailModal` 订单全流程 | `orderStatus`、`orderEvents`、`orderFeedback` | `OrderEvent[]` | `acceptOrder` → `clockInOrder` → `requestOrderCompletion` → `confirmOrderCompletion` / `cancelOrder` / `raiseOrderDispute` / `resolveOrderDispute`；合成对方动作 `counterpart*` |
| `OrderDetailModal` 时间币记账 | `ledger`（`unsettled` 只读） | `LedgerEntry` | 完成/取消后由 store 追加流水（不结算、不可兑现） |
| `MessagesTab` 订单留言 | `threads`（`kind==='order'`） | `DemoThread` / `DemoMessage` | `sendOrderMessage`、`hideOrderMessage` |
| `MessagesTab` 系统通知 | `systemNotices`、`unreadNoticeCount` | `DemoMessage.noticeKind` | `markNotificationsRead` |
| `MessagesTab` 投诉 / 反馈工单 | `complaints` | `Complaint` | `addComplaint` |
| `ProfileTab` 账本 / 订单 / 收藏 / 我的发布 | `ledger`、`posts`、`comments` | 派生 | — |
| `ProfileTab` 服务记录（A+ 进度） | `readLocalIntakeProgress()` 只读 A+ 存档 | `data/intake/community-intake-progress.ts` | —（只读） |
| `ProfileTab` 时间币流水 | `ledgerEntries`（只读） | `LedgerEntry` | — |
| `CertificateModal` 演练证明 | `currentUser`、`ledger` 汇总 | `selectors/community.ts` | —（纯展示，明确标注合成） |
| `AdminCenter` 审核队列 | `posts`（`moderation==='pending'`）、`comments` | `ModerationStatus` | `moderatePost`、`moderateComment` |
| `AdminCenter` 举报处置 | `reports` | `Report` | `resolveReport` |
| `AdminCenter` 操作日志 | `auditLog` | `AuditLogEntry` | 由上述动作自动追加 |
| `AdminCenter` 投诉工单 | `complaints` | `Complaint` | `addComplaint` |
| `AdminCenter` 演练数据重置 | 全量 `state` | — | `resetDemoData`、`reloadFromStorage`、`readBackupJson` |
| `SosModal` | 无业务数据（不定位、不通知） | — | —（只写一条本机提示） |
| `RealNameModal` | `membership` | `MembershipRole` | `setMembership`（不采集证件号） |
| `SearchModal` | `visiblePosts` 本机模糊匹配 | `store.ts` | — |
| `HeaderNav` 身份切换 | `membership`、`users` | `selectors/community.ts` | `setMembership` |
| `FooterCompliance` | 静态合规文案 | `content.ts` | — |

## 二、A+ 端组件 → 工作台字段 → 领域来源

| 组件 | 读取的工作台字段 | 动作 |
|---|---|---|
| `AppTopBar` | `store.currentDemoRole`、`currentDemoRoleLabel` | 直接写 `currentDemoRole`（无副作用，仅影响按钮可见性与时间线署名） |
| `AppSideRail` / `MobileNav` | `anyDialogOpen`、`currentDemoRoleLabel` | 链接回 `/` |
| `PageHeading` | `store.pendingComplaints` | `jumpToComplaints`、`openCommunityBridge`、`openCreate` |
| `IntakeGate` | `store.intakePaused` | `toggleIntakePaused` |
| `SyntheticBanner` | `store.storageStatus`、`storageStatusLabel`、`lastSavedLabel` | `exportBackup`、`viewBackupText`、`chooseBackup`、`reloadLatestSnapshot`、`exportUnreadableBackup`、`resetDemo` |
| `BackupTextPanel` | `backupText` | 关闭（写 `backupText`） |
| `MetricGrid` | `store.{triage,screening,overdue,highRisk}Cases`、`activeFilter` | `setActiveFilter` |
| `QueuePanel` | `filteredCases`、`store.selectedId`、`search`、`filters` | `setActiveFilter`、`setSearch`、`selectCase`、`resetQueueFilters` |
| `CaseDetail` | `selectedCase`、`selectedRiskNotice`、`linkedCases`、`actionOptions`、`lifecycleText`、`selectedCaseCheckpoint*` | `openTransition`、`openCheckpoint`、`openFollowUp`、`openContactSimulation`、`openHighRiskStop`、`openReopen`、`openComplaint`、`copySelectedCaseLink`、`selectRelatedCase`、`backToQueue` |
| `ComplaintPanel` | `complaintFilter`、`filteredComplaints`、`selectedComplaint*`、`canReviewSelectedComplaint` | `selectComplaint`、`reviewSelectedComplaint`、`openComplaintCase` |
| `dialogs/HelpDialog` | `showHelp` | `closeHelp`（`data-autofocus` 落在「知道了」） |
| `dialogs/CreateCaseDialog` | `showCreate`、`forms.create`、`duplicate*` | `setForm`、`createRecord`、`cancelDuplicateReview`、`openDuplicateCandidate` |
| `dialogs/TransitionDialog` | `showTransition`、`forms.transition`、`actionOptions`、`transitionSubmitDisabled` | `setTransitionAction`、`setForm`、`applyTransition` |
| `dialogs/CheckpointDialog` | `showCheckpoint`、`forms.checkpoint` | `setForm`、`saveCheckpoint` |
| `dialogs/FollowUpDialog` | `showFollowUp`、`forms.followUp` | `setForm`、`saveFollowUp` |
| `dialogs/ContactSimulationDialog` | `showContactSimulation`、`forms.contactSimulation` | `setForm`、`saveContactSimulation` |
| `dialogs/HighRiskStopDialog` | `showHighRiskStop`、`highRiskNote` | 写 `highRiskNote`、`saveHighRiskStop` |
| `dialogs/ReopenDialog` | `showReopen`、`forms.reopen` | `setForm`、`createReopenedRecord` |
| `dialogs/ComplaintDialog` | `showComplaint`、`forms.complaint`、`complaintTargetRoles` | `setForm`、`submitComplaint` |
| `dialogs/CommunityBridgeDialog` | `community*`（读取结果、候选、复核状态） | `readCommunityArchive`、`startCommunityRegistration`、`cancelCommunityReview`、`confirmCommunityRegistration`、`closeCommunityBridge` |

## 三、动作映射（界面动作 → 领域方法 → 落点）

| 界面动作 | B 端 | A+ 端 | 落点 |
|---|---|---|---|
| 发布 | `publishPost` | `createCase` | B：`moderation='pending'`；A+：`status='已收件'` |
| 接单 | `acceptOrder` | `transition('ACCEPT_FOR_TRIAGE')`（概念对应：受理分流，不是派单） | B：`orderStatus='accepted-local-demo'` |
| 上门签到 | `clockInOrder`（`ORDER_EVENT_TYPES` 本轮**唯一** schema 扩展） | 无对应（A+ 不做上门） | B：`orderEvents` 追加 `clock-in` |
| 完成 | `requestOrderCompletion` → `confirmOrderCompletion` | `transition('CLOSE_FOLLOW_UP')` | B：双方确认后 `completed-local-demo` + 账本流水 |
| 取消 | `cancelOrder` | `transition('WITHDRAW'/'REJECT')` | B：`cancelled-local-demo` |
| 争议 | `raiseOrderDispute` / `resolveOrderDispute` | `transition('REFERRAL_FAILED')` | B：`disputed-local-demo` |
| 互动 | `toggleLike` / `toggleFavorite` / `addComment` | —（A+ 无社区互动） | 只改本机存档 |
| 举报 | `reportContent` → `resolveReport` | `submitComplaint` → `reviewComplaint`（投诉≠举报） | 两套独立队列 |
| SOS | 本机提示，`tel:` 链接已移除 | — | 不定位、不通知、不派单 |
| 实名 | `setMembership`（不采集证件号） | `currentDemoRole` 仅演示角色 | 无真实认证 |
| 管理动作 | `moderatePost` / `moderateComment` / `hideOrderMessage` | `raiseHighRiskStop` / `recordContactSimulation` / `updateFollowUp` | 均写本机日志/时间线 |
| 备份 | `readBackupJson` + 刷新 | `exportBackup` / `importBackup`（5 MB 上限、拒绝空摘要） | 各自独立存档 |

## 四、schema 扩展登记

`src/data/community/types.ts` 的 `ORDER_EVENT_TYPES` 相比 mvp **只新增 `'clock-in'`（上门签到）** 一项，用于满足「接单 → 签到 → 完成」演示链路；其余类型、状态枚举与流转守卫未改动。`ORDER_EVENT_LIMIT = 100` 保持。
