# 可达性矩阵（I-01 / W1 序 4）

| 项 | 内容 |
|---|---|
| 用途 | 逐条登记「领域写动作 → 界面入口 → 覆盖断言」，量化 M4 追溯覆盖率 |
| 基线版本 | `repo@02c2c53` + 本轮 W1 改动 |
| 采集口径 | 动作清单取自契约层 `src/context/AppContext.tsx`（B 端）与 `src/aplus/workbench.ts` 的公开返回对象（A+ 端），**只计有副作用的写动作**，不列纯 getter 与派生 |
| 采集日期 | 2026-10-26（W1 序 6 落地后复测） |

## 一、状态定义

| 状态 | 判据 | 处置 |
|---|---|---|
| `covered` | 存在至少一条断言，直接以该动作的后果为判定对象 | 保持 |
| `gap` | 界面入口存在，但无任何断言以其后果为判定对象（可能被其他流程顺带覆盖） | 列入 I-02 补测 |
| `unused` | 契约暴露但全仓无消费方、无界面入口 | 列入 I-04 契约收敛 |
| `unreachable` | 有实现但无界面入口（静默能力） | P0 处置：补入口或下线 |

## 二、统计摘要

| 端 | 动作数 | covered | gap | unused | unreachable | 覆盖率 |
|---|---|---|---|---|---|---|
| B 端（社区/订单/审核） | 33 | 33 | 0 | 0 | 0 | 100% |
| A+ 端（受理工作台） | 19 | 19 | 0 | 0 | 0 | 100% |
| **合计** | **52** | **52** | **0** | **0** | **0** | **100%** |

> 分母已按 D-03 / ADR-001 收敛：`setViewMode`/`viewMode` 于 2026-10-26 删除，动作数 53 → 52，`unused` 1 → 0。`gap` 由 11 降至 **0**：W3 关闭 5 条、W4 关闭 4 条（深链/跟进/模拟联系/重开）、W5 关闭 2 条（朗读播放/停止）。**M4 于 2026-10-27 达标 52/52 = 100%**。

- 判据（D-17 + D-18）：W3 出口 46/52 = 88.5%、W4 出口 50/52 = 96.2%、**W5 出口 52/52 = 100%，三级阶梯全部达成**。出口核对以**绝对条数**（46 / 50 / 52）为准，百分比仅作呈现。
- W3 收口（2026-10-27，D-19 批准后实施）：新增 7 条断言（community 5 / aplus 2），两个脚本各做一次缺陷注入验证——点赞「永远 +1」与「返回修改不退出复核态」均被抓红。断言总量 223 → **230**。
- W4 收口（2026-10-27，同批交付）：新增 8 条断言（全部在 `check-aplus-flow`，26 → 34），关闭 4 个 A+ 缺口——深链复制（含回跳）、调整跟进、模拟联系结果、关联重开；首条做缺陷注入（移除跟进原因必填）后该 `[neg]` 断言转红，已还原。断言总量 230 → **238**。
- W5 收口（2026-10-27）：`check-community-flow` 16 → 18，新增朗读播放 / 全局停止 2 条。`speechSynthesis` 打桩隔离 headless 无语音引擎的影响，断言对象是应用状态机而非音频输出；两条各自做缺陷注入并转红（去掉 `setIsAudioPlaying(true)`、去掉 `stopArticleAudio` 的置假），后者暴露的正是「弹层已复原但顶栏仍显示停止」的半复原态。断言总量 238 → **240**。
- W2 序 2 关闭 4 条（`cancelOrder` / `verifyRealName` / `adminRejectCommentWithReason` / `markAllMessagesRead`），覆盖率由 69.8% 提升 7.6 个百分点；序 3 的 18 条 P1/P2 未做，缺口改由 W3–W5 分批清除。
- `unreachable` 列仍为 **0**（矩阵按「动作」计数，`cancelEventSignup` 不是独立动作行），但需单列一项**无入口能力分支**：报名成功后 `CommunityTab` 把按钮置 `disabled`，用户无法取消报名，故 `cancelEventSignup` 在 UI 层不可达（见 §六）。此前把「报名/取消」合并当 toggle，掩盖了这一点。
- `gap` 归零：W3 清互动三项与长辈模式、W4 清 A+ 四项、W5 清朗读两项。后续新增断言不再由「动作覆盖」驱动，改由 D-21 的两项判据驱动（精确负向占比、重算次数）。

## 三、B 端动作矩阵

数据源：`src/context/AppContext.tsx`（契约层）。

| ID | 动作 | 界面入口 | 覆盖断言 | 状态 |
|---|---|---|---|---|
| B-01 | `switchUser` | 顶栏「演练身份」选择器 | `comm#4`、`acc#1`、`rec#11` | covered |
| B-02 | `setElderlyMode` | 「我的」→ 长辈模式开关 | `comm#12`（切换生效 / 刷新保持 / 复原） | covered |
| B-03 | `setViewMode` | **已删除**（D-03 / ADR-001，2026-10-26） | — | 移出矩阵 |
| B-04 | `playArticleAudio` | 首页长照护文章 → 朗读 | `comm#13`（播放态建立 / 正文提示 / 顶栏停止入口） | covered |
| B-05 | `stopArticleAudio` | 同上（停止朗读） | `comm#14`（全局停止后弹层与顶栏同时复原） | covered |
| B-06 | `createHelpOrder` | 「发布」→ 求助单 | `comm#5`、`fix#38`、`fix#39` | covered |
| B-07 | `createPost` | 「发布」→ 社区动态 | `comm#5`–`#8`、`fix#5`–`#8` | covered |
| B-08 | `acceptOrder` | 接单大厅 → 认领 | `acc#5`–`#7` | covered |
| B-09 | `clockInOrder` | 订单详情 → 上门签到 | `acc#8`–`#10` | covered |
| B-10 | `counterpartAcceptOrder` | 审核后台 → 代合成邻居接单 | `fix#40`、`fix#42` | covered |
| B-11 | `completeOrder` | 订单详情 → 双方确认完成 | `acc#11`–`#14`、`fix#41`–`#45` | covered |
| B-12 | `cancelOrder` | 订单详情 → 取消订单 | `p0#5`–`#7`（终态 / 留痕 / 不结算） | covered |
| B-13 | `raiseOrderDispute` | 订单详情 → 发起争议 | `fix#76`–`#80` | covered |
| B-14 | `resolveOrderDispute` | 订单详情 → 撤销争议 / 因争议关闭 | `fix#81`–`#84` | covered |
| B-15 | `likePost` | 信息流卡片 → 点赞 | `comm#8`（±1 往返）、`comm#10`（刷新保持） | covered |
| B-16 | `bookmarkPost` | 信息流卡片 → 收藏 | `comm#9`（往返）、`comm#10`（刷新保持） | covered |
| B-17 | `addComment` | 帖子详情 → 评论 | `fix#9`–`#11`、`fix#17` | covered |
| B-18 | `enrollActivity` | 活动帖 → 报名 | `comm#11`（名额 +1 / 按钮禁用 / 存档落盘） | covered |
| B-19 | `sendChatMessage` | 消息页 → 会话输入 | `fix#28`–`#34` | covered |
| B-20 | `submitComplaint` | 信息流/评论/订单留言 → 举报 | `acc#15`–`#18`、`rec#15`、`rec#23` | covered |
| B-21 | `triggerSos` | 首页 SOS 入口 | `fix#49`、`fix#50` | covered |
| B-22 | `verifyRealName` | 「我的」→ 实名认证 | `p0#10`–`#12`（未同意被拒 / 切换 / 刷新回落） | covered |
| B-23 | `adminApprovePost` | 审核后台 → 通过 | `fix#14`、`fix#16` | covered |
| B-24 | `adminRejectPostWithReason` | 审核后台 → 驳回（需理由） | `fix#89`–`#91` | covered |
| B-25 | `adminApproveComment` | 审核后台 → 通过评论 | `fix#15`、`fix#17` | covered |
| B-26 | `adminRejectCommentWithReason` | 审核后台 → 驳回评论 | `p0#1`–`#4`（理由门禁 / 落库 / 审计 / 同帖旁路不变） | covered |
| B-27 | `adminResolveComplaint` | 审核后台 → 举报处置 | `acc#19`–`#23` | covered |
| B-28 | `adminAdjustTimeCoin` | 审核后台 → 时间币调整 | `fix#92`（只读不变量） | covered |
| B-29 | `exportBackup` | 存档与恢复 → 导出备份 | `rec#4` | covered |
| B-30 | `exportUnreadableArchive` | 存档面板 → 下载坏档原文 | `rec#9`、`fix#53`、`fix#54` | covered |
| B-31 | `importBackupFile` | 存档面板 → 导入备份 | `rec#19`–`rec#22`、`fix#24` | covered |
| B-32 | `reloadArchive` | 存档面板 / 冲突警示条 → 载入最新 | `rec#12`–`rec#14` | covered |
| B-33 | `resetDemoData` | 存档面板 → 重置演练数据 | `rec#8`–`rec#10` | covered |
| B-34 | `markAllMessagesRead` | 消息页 → 全部已读 | `p0#8`–`#9`（角标清零与刷新不回弹） | covered |

## 四、A+ 端动作矩阵

数据源：`src/aplus/workbench.ts` 的公开返回对象（有副作用的函数）。

| ID | 动作 | 界面入口 | 覆盖断言 | 状态 |
|---|---|---|---|---|
| A-01 | `createRecord` | 队列页 → 「新建记录」 | `aplus#1`–`#7`、`fix#51`、`fix#52` | covered |
| A-02 | `cancelDuplicateReview` | 重复复核 → 「返回修改」 | `aplus#10`（表单复原 + 门禁未削弱）、`aplus#11` | covered |
| A-03 | `openDuplicateCandidate` | 重复复核 → 查看候选记录 | `aplus#9` | covered |
| A-04 | `applyTransition` | 详情 → 状态流转 | `aplus#11`–`#19` | covered |
| A-05 | `saveCheckpoint` | 检查点弹层 → 保存 | `aplus#13`–`#16` | covered |
| A-06 | `saveFollowUp` | 跟进弹层 → 保存跟进 | `aplus#29`（空原因被拒且时间线不增）、`aplus#30`（追加一条 / 关闭 / 负责人更新） | covered |
| A-07 | `saveContactSimulation` | 联系模拟弹层 → 保存 | `aplus#31`（未确认禁用）、`aplus#32`（结果写入 / 状态不变） | covered |
| A-08 | `saveHighRiskStop` | 高风险 → 停止常规初筛 | `acc#24`–`#26` | covered |
| A-09 | `createReopenedRecord` | 重新登记弹层 → 创建关联记录 | `aplus#33`（新记录指回原记录）、`aplus#34`（原记录终态不变） | covered |
| A-10 | `submitComplaint` | 投诉弹层 → 提交 | `fix#63` | covered |
| A-11 | `reviewSelectedComplaint` | 投诉详情 → 复核 | `fix#64`–`#71` | covered |
| A-12 | `toggleIntakePaused` | 门禁条 → 暂停/恢复新登记 | `fix#93` | covered |
| A-13 | `exportBackup` / `viewBackupText` | 存档 → 导出备份 / 查看备份文本 | `aplus#20`–`#22` | covered |
| A-14 | `exportUnreadableBackup` | 坏档 → 导出原文 | `fix#53`、`fix#54` | covered |
| A-15 | `chooseBackup` | 存档 → 选择备份导入 | `fix#73`、`fix#74` | covered |
| A-16 | `reloadLatestSnapshot` | 存档 → 载入最新快照 | `aplus#23` | covered |
| A-17 | `startCommunityRegistration` | 社区桥 → 登记为受理记录 | `fix#56`–`#62` | covered |
| A-18 | `readCommunityArchive` | 社区桥 → 读取 B 端存档 | `comm#9`、`comm#10`、`fix#55` | covered |
| A-19 | `copySelectedCaseLink` | 详情 → 「复制链接」 | `aplus#27`（剪贴板深链）、`aplus#28`（切走后仍能定位） | covered |

> 断言编号 `comm#n` / `acc#n` / `rec#n` / `fix#n` / `aplus#n` / `dual#n` 指对应脚本内 `check()` 的出现序号，与 `docs/evidence/<slug>/report.json` 的 `results` 数组下标一致（从 0 起）。

## 五、缺口清单与批次划分（D-17）

W3 / W4 / W5 三批已于 2026-10-27 全部交付，缺口由 11 降至 **0**：52 covered + 0 gap = 52。下表保留原始批次与实测断言，作为「一次交付一条、每条带判定」的留痕；每条建议均标实现行号（D-05），并按实现语义校正。

| 批次 | 序 | 动作 | 实现 | 状态 | 实际断言 / 建议断言 |
|---|---|---|---|---|---|
| W3 | 1 | `cancelDuplicateReview` | `src/aplus/workbench.ts:1020` | ✅ | `aplus#10` 复原表单 + 再提交仍走复核门禁；`aplus#11` `[neg]` 队列数不变 |
| W3 | 2 | `enrollActivity` | `src/context/AppContext.tsx:603` | ✅ | `comm#11` 名额 8/12 → 9/12、按钮转「已报名」且 `disabled`、存档 `signedUpByMe=true` |
| W3 | 3 | `likePost` | `src/context/AppContext.tsx:571` | ✅ | `comm#8` `[edge]` 计数 5→6→5 往返；`comm#10` 刷新保持 |
| W3 | 4 | `bookmarkPost` | `src/context/AppContext.tsx:580` | ✅ | `comm#9` `[edge]` `aria-pressed` 真→假往返；`comm#10` 刷新保持 |
| W3 | 5 | `setElderlyMode` | `src/context/AppContext.tsx:304` | ✅ | `comm#12` `[edge]` 切换生效 / 刷新保持 / 关闭复原 |
| W4 | 6 | `saveFollowUp` | `src/aplus/workbench.ts:1090` | ✅ | `aplus#29` `[neg]` 留空原因被拒（弹层保持、时间线不增）；`aplus#30` 补全后追加一条「调整人工跟进」、弹层关闭、负责人更新 |
| W4 | 7 | `saveContactSimulation` | `src/aplus/workbench.ts:1105` | ✅ | `aplus#31` `[neg]` 未勾选虚构确认时保存禁用；`aplus#32` `[edge]` 时间线出现「结果：约定稍后再联系（模拟）」、登记状态前后一致、负责人更新 |
| W4 | 8 | `createReopenedRecord` | `src/aplus/workbench.ts:1142` | ✅ | `aplus#33` 新记录（队列 +1、状态已收件、时间线 2 条）反向列出原记录；`aplus#34` `[neg]` 原记录终态仍为「已结束（服务结果未核实）」 |
| W4 | 9 | `copySelectedCaseLink` | `src/aplus/workbench.ts:699` | ✅ | `aplus#27` `[edge]` 剪贴板写入含 `case=SYNTH-00N` 的绝对链接；`aplus#28` `[edge]` 切到别的记录后打开该链接仍定位回原记录 |
| W5 | 10 | `playArticleAudio` | `src/context/AppContext.tsx:352` | ✅ | `comm#15` 播放后弹层按钮转「停止朗读」、正文提示出现、顶栏「停止朗读」出现、`speak` 被调用 |
| W5 | 11 | `stopArticleAudio` | `src/context/AppContext.tsx:365` | ✅ | `comm#16` `[edge]` 全局停止后弹层按钮、正文提示、顶栏控件三处同时复原，`cancel` 被调用 |

> **实施时纠正的建议失真（D-05 反复生效）**：
>
> W4 两条：① 「未选结果禁用提交」不成立——模拟结果下拉框有三项且默认选中首项，永远非空，改为判「未勾选虚构确认时按钮禁用」这一真实门禁；② 重开成功后**不切换选中项**（`ensureSelection()` 保留原记录），新记录编号只能从原记录的「关联演练记录」列表反推，断言据此改为「原记录列表出现新记录 + 点进后反查原记录」。
>
> W3 两条：
> 1. 原建议「报名后再点回到未报名、名额复原」不可实现——`CommunityTab` 报名后把按钮置 `disabled`，UI 无取消入口；实际改为判「名额 +1 且不可重复提交」。
> 2. 原建议「收藏后『我的』列表出现该帖」不存在该列表，改为判卡片 `aria-pressed` 往返 + 刷新保持。
>
> 另：`cancelEventSignup` 仅有实现、无独立界面入口（见 §六），故 `enrollActivity` 的「切换回未报名」分支在 UI 层不可达。
>
> 原 W1 时点的 15 条清单作废：4 条已由 W2 关闭，5 条已由 W3 关闭、4 条已由 W4 关闭，媒体 2 条留 W5。W4 的深链复制需剪贴板桩，W5 的媒体项需 `Audio` 桩，**不得以「按钮可点」充数**；每条判定须含「状态未变」的一半（D-05）。

## 六、死接口

| 动作 | 现状 | 处置结果 |
|---|---|---|
| `setViewMode` / `viewMode` | 原契约层定义 10 处，全仓零消费方、零入口、零断言（`grep` 仅命中定义文件自身，24 处 `useApp()` 无一取用） | **已删除**（2026-10-26，D-03 已获批准，按 `adr/ADR-001-remove-viewmode.md` S1–S7 执行）：代码 10 处移除、契约注释登记例外项、`AppContext.tsx` 1024 → 1013 行、全量门禁 223/223 通过、耗时 420.9 s 重采。本地存储键 `community.ui.view-mode` 成为孤儿键，不清理亦无副作用 |
| `cancelEventSignup` | 有实现（`src/data/community/store.ts:1742`）、参与 `enrollActivity` 的切换分支，但**无独立界面入口**：报名成功后 `CommunityTab.tsx:390` 将按钮置 `disabled` | **待产品决策**（二选一）：① 报名按钮改为可切换（文案「已报名·点击取消」）并补 1 条往返断言，M4 分母 +1；② 明确「本机演练报名不可撤回」为设计约束，写入 `gap-report` 已知边界并把 `enrollActivity` 的 cancel 分支标注 `@unreachable`。当前默认不改代码 |

## 七、复现方式

```bash
# 动作清单（B 端契约层）
grep -nE "^  [a-zA-Z]+: \(" src/context/AppContext.tsx

# 动作清单（A+ 端公开返回）
sed -n '/^  return {/,/^  }$/p' src/aplus/workbench.ts

# 某动作是否存在界面消费方（destructure + 使用两处即视为有入口）
grep -rn "cancelOrder" src --include=*.tsx | grep -v AppContext.tsx

# 某能力是否被断言（0 命中即 gap 候选）
grep -c "点赞" tools/check-*.mjs
```

**判定纪律**：`gap` 一律以「关键词 0 命中」为前提，且必须人工确认界面入口存在；不得凭印象标注。
