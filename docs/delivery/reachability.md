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
| B 端（社区/订单/审核） | 34 | 23 | 10 | 1 | 0 | 67.6% |
| A+ 端（受理工作台） | 19 | 14 | 5 | 0 | 0 | 73.7% |
| **合计** | **53** | **37** | **15** | **1** | **0** | **69.8%** |

- M4 目标为 ≥90%，当前 69.8%，缺口 15 条动作（W1 序 6 补测后由 64.2% 提升 5.6 个百分点）。
- `unreachable` 为 0：不存在「有实现无入口」的静默能力，这是 P6–P10 修复的直接成果。
- 但 `gap` 15 条说明断言仍集中在「主链路」，**旁路能力基本裸奔**；这不是可达性问题，是断言覆盖问题。

## 三、B 端动作矩阵

数据源：`src/context/AppContext.tsx`（契约层）。

| ID | 动作 | 界面入口 | 覆盖断言 | 状态 |
|---|---|---|---|---|
| B-01 | `switchUser` | 顶栏「演练身份」选择器 | `comm#4`、`acc#1`、`rec#11` | covered |
| B-02 | `setElderlyMode` | 「我的」→ 长辈模式开关 | — | **gap** |
| B-03 | `setViewMode` | **无消费方**（全仓零引用） | — | **unused** |
| B-04 | `playArticleAudio` | 首页长照护文章 → 朗读 | — | **gap** |
| B-05 | `stopArticleAudio` | 同上（停止朗读） | — | **gap** |
| B-06 | `createHelpOrder` | 「发布」→ 求助单 | `comm#5`、`fix#38`、`fix#39` | covered |
| B-07 | `createPost` | 「发布」→ 社区动态 | `comm#5`–`#8`、`fix#5`–`#8` | covered |
| B-08 | `acceptOrder` | 接单大厅 → 认领 | `acc#5`–`#7` | covered |
| B-09 | `clockInOrder` | 订单详情 → 上门签到 | `acc#8`–`#10` | covered |
| B-10 | `counterpartAcceptOrder` | 审核后台 → 代合成邻居接单 | `fix#40`、`fix#42` | covered |
| B-11 | `completeOrder` | 订单详情 → 双方确认完成 | `acc#11`–`#14`、`fix#41`–`#45` | covered |
| B-12 | `cancelOrder` | 订单详情 → 取消订单 | 仅 `fix#83`/`#84` 以「订单已取消」状态标签间接出现 | **gap** |
| B-13 | `raiseOrderDispute` | 订单详情 → 发起争议 | `fix#76`–`#80` | covered |
| B-14 | `resolveOrderDispute` | 订单详情 → 撤销争议 / 因争议关闭 | `fix#81`–`#84` | covered |
| B-15 | `likePost` | 信息流卡片 → 点赞 | — | **gap** |
| B-16 | `bookmarkPost` | 信息流卡片 → 收藏 | — | **gap** |
| B-17 | `addComment` | 帖子详情 → 评论 | `fix#9`–`#11`、`fix#17` | covered |
| B-18 | `enrollActivity` | 活动帖 → 报名 | — | **gap** |
| B-19 | `sendChatMessage` | 消息页 → 会话输入 | `fix#28`–`#34` | covered |
| B-20 | `submitComplaint` | 信息流/评论/订单留言 → 举报 | `acc#15`–`#18`、`rec#15`、`rec#23` | covered |
| B-21 | `triggerSos` | 首页 SOS 入口 | `fix#49`、`fix#50` | covered |
| B-22 | `verifyRealName` | 「我的」→ 实名认证 | 无（`comm#4` 只做「切换到已实名成员」，不验认证流程本身） | **gap** |
| B-23 | `adminApprovePost` | 审核后台 → 通过 | `fix#14`、`fix#16` | covered |
| B-24 | `adminRejectPostWithReason` | 审核后台 → 驳回（需理由） | `fix#89`–`#91` | covered |
| B-25 | `adminApproveComment` | 审核后台 → 通过评论 | `fix#15`、`fix#17` | covered |
| B-26 | `adminRejectCommentWithReason` | 审核后台 → 驳回评论 | — | **gap** |
| B-27 | `adminResolveComplaint` | 审核后台 → 举报处置 | `acc#19`–`#23` | covered |
| B-28 | `adminAdjustTimeCoin` | 审核后台 → 时间币调整 | `fix#92`（只读不变量） | covered |
| B-29 | `exportBackup` | 存档与恢复 → 导出备份 | `rec#4` | covered |
| B-30 | `exportUnreadableArchive` | 存档面板 → 下载坏档原文 | `rec#9`、`fix#53`、`fix#54` | covered |
| B-31 | `importBackupFile` | 存档面板 → 导入备份 | `rec#19`–`rec#22`、`fix#24` | covered |
| B-32 | `reloadArchive` | 存档面板 / 冲突警示条 → 载入最新 | `rec#12`–`rec#14` | covered |
| B-33 | `resetDemoData` | 存档面板 → 重置演练数据 | `rec#8`–`rec#10` | covered |
| B-34 | `markAllMessagesRead` | 消息页 → 全部已读 | — | **gap** |

## 四、A+ 端动作矩阵

数据源：`src/aplus/workbench.ts` 的公开返回对象（有副作用的函数）。

| ID | 动作 | 界面入口 | 覆盖断言 | 状态 |
|---|---|---|---|---|
| A-01 | `createRecord` | 队列页 → 「新建记录」 | `aplus#1`–`#7`、`fix#51`、`fix#52` | covered |
| A-02 | `cancelDuplicateReview` | 重复复核 → 「返回修改」 | — | **gap** |
| A-03 | `openDuplicateCandidate` | 重复复核 → 查看候选记录 | `aplus#9` | covered |
| A-04 | `applyTransition` | 详情 → 状态流转 | `aplus#11`–`#19` | covered |
| A-05 | `saveCheckpoint` | 检查点弹层 → 保存 | `aplus#13`–`#16` | covered |
| A-06 | `saveFollowUp` | 跟进弹层 → 保存跟进 | — | **gap** |
| A-07 | `saveContactSimulation` | 联系模拟弹层 → 保存 | — | **gap** |
| A-08 | `saveHighRiskStop` | 高风险 → 停止常规初筛 | `acc#24`–`#26` | covered |
| A-09 | `createReopenedRecord` | 重新登记弹层 → 创建关联记录 | — | **gap** |
| A-10 | `submitComplaint` | 投诉弹层 → 提交 | `fix#63` | covered |
| A-11 | `reviewSelectedComplaint` | 投诉详情 → 复核 | `fix#64`–`#71` | covered |
| A-12 | `toggleIntakePaused` | 门禁条 → 暂停/恢复新登记 | `fix#93` | covered |
| A-13 | `exportBackup` / `viewBackupText` | 存档 → 导出备份 / 查看备份文本 | `aplus#20`–`#22` | covered |
| A-14 | `exportUnreadableBackup` | 坏档 → 导出原文 | `fix#53`、`fix#54` | covered |
| A-15 | `chooseBackup` | 存档 → 选择备份导入 | `fix#73`、`fix#74` | covered |
| A-16 | `reloadLatestSnapshot` | 存档 → 载入最新快照 | `aplus#23` | covered |
| A-17 | `startCommunityRegistration` | 社区桥 → 登记为受理记录 | `fix#56`–`#62` | covered |
| A-18 | `readCommunityArchive` | 社区桥 → 读取 B 端存档 | `comm#9`、`comm#10`、`fix#55` | covered |
| A-19 | `copySelectedCaseLink` | 详情 → 「复制链接」 | — | **gap** |

> 断言编号 `comm#n` / `acc#n` / `rec#n` / `fix#n` / `aplus#n` / `dual#n` 指对应脚本内 `check()` 的出现序号，与 `docs/evidence/<slug>/report.json` 的 `results` 数组下标一致（从 0 起）。

## 五、缺口清单与处置顺序

W1 序 6 已闭环 3 条（`adminRejectPostWithReason`、`adminAdjustTimeCoin`、`toggleIntakePaused`），见 `fix#89`–`#93`。剩余 15 条按「是否触及数据完整性」排序，前 5 条进入 W2 补测额度（30 项）的前段：

| 序 | 动作 | 为何优先 | 建议断言 |
|---|---|---|---|
| 1 | `adminRejectCommentWithReason` | 帖子维度已补，评论维度仍零覆盖；同一函数族，复用现成用例成本最低 | 空/空白理由禁用、驳回后评论不展示、审计留痕 |
| 2 | `cancelOrder` | 订单终态之一，当前只被「因争议关闭」间接带出，主动取消路径未验 | 取消需理由、状态 `cancelled`、账本不产生结算、留痕事件 `cancel` |
| 3 | `verifyRealName` | `comm#4` 只验证「已实名成员能发布」，未验证「未实名提交被拒 + 认证后放行」 | 非法证件号被拒、认证成功写入 `realNameVerified`、刷新后保持 |
| 4 | `markAllMessagesRead` | 未读数是导航角标的唯一来源 | 全部已读后角标消失、刷新后保持 |
| 5 | `saveFollowUp` | 跟进记录是 A+ 的主要产出之一 | 保存后时间线追加、弹层关闭、空内容禁用 |
| 6 | `saveContactSimulation` | 联系结果决定后续流转分支 | 结果码写入、未选结果禁用提交 |
| 7 | `createReopenedRecord` | 跨 case 关联，容易产生孤儿记录 | 新记录带 `reopenedFrom`、不影响原 case 终态 |
| 8 | `likePost` / `bookmarkPost` / `enrollActivity` | 互动类，影响信息流排序与「我的」列表 | 幂等（重复点只 +1）、刷新后保持 |
| 9 | `playArticleAudio` / `stopArticleAudio` | 依赖浏览器音频能力，CDP 下需 mock | 状态切换、停止后 `isAudioPlaying=false` |
| 10 | `setElderlyMode` | 纯展示偏好 | 切换后字号 class 生效、刷新后保持 |
| 11 | `cancelDuplicateReview` | 复核回退路径 | 返回后表单内容保留、不产生记录 |
| 12 | `copySelectedCaseLink` | 深链复制，已有 `shared/clipboard.ts` 可复用 | 剪贴板内容与当前 case id 一致、`?case=` 可直接打开 |

## 六、死接口

| 动作 | 现状 | 处置建议 |
|---|---|---|
| `setViewMode` / `viewMode` | 契约层定义，全仓零消费方、零入口、零断言 | I-04 契约拆分时删除，或补一个「移动框/自适应」切换入口并加断言。当前建议**删除**：`viewMode` 是设计期的展示开关，与真实响应式断点重复 |

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
