# 架构说明

> 面向维护者：模块边界、状态流、可扩展点，以及从 `community-service-mvp` 借鉴并落地的工程基线。

## 1. 分层

| 层 | 位置 | 职责 |
| --- | --- | --- |
| 外壳层 | `App.tsx` | 双视口切换、错误边界、全局快捷键、弹层调度、跳过链接 |
| 状态层 | `context/AppContext.tsx` | 身份、导航、订单状态机、时间币账本、消息、投诉、审核动作 |
| 领域层 | `types/index.ts` + `data/mockData.ts` | 类型契约与合成数据 |
| 组件层 | `components/*.tsx` | 5 个主 Tab + 11 个弹层/子页面 + 3 个基础组件 |
| 基础层 | `utils/*`、`hooks/*` | 音频、存档、内容预检、草稿、Toast、弹层焦点 |

依赖方向自上而下单向：组件 → context/utils/types，禁止反向引用组件。

## 2. 关键机制

### 2.1 订单状态机
```
published(接单大厅) → accepted(待上门) → in_progress(已签到)
    → completed(双向确认结算) | cancelled | disputed
```
状态变更集中在 `AppContext`：`acceptOrder / clockInOrder / completeOrder / cancelOrder`。
结算 `completeOrder` 同时写入两笔账本流水（志愿者 +币、求助者 −币），并推送站内消息，保证「一笔业务、双向留痕」。

### 2.2 时间币账本
`TimeLedger` 采用不可篡改流水模型：`txHash`（幂等业务号）+ `balanceAfter` + `type`。
管理员人工调账走 `adminAdjustTimeCoin`，独立标记 `admin_adjust` 并写入原因，满足「管理员调整留痕」要求。

### 2.3 本地存档容错（utils/storage.ts）
写入带版本信封 `{ v, savedAt, data }`，读取时：
1. 非法 JSON / 版本过高 / 结构校验失败 → 回退默认数据并告警；
2. 裸数据（历史格式）可兼容读取；
3. 写入失败（隐私模式、配额满）不抛异常。

### 2.4 内容安全预检（utils/moderation.ts）
`moderateContent(...)` 返回 `{ severity: pass|warn|block, hits, advice }`：
- `block`：涉政涉暴、黄赌毒、诈骗等 → 阻断发布并给出中文整改建议；
- `warn`：医疗断言、时长买卖、站外导流等 → 允许发布但提示进入人工复核；
- 接口形态与线上内容安全 API 一致，可直接替换为云端审核。

### 2.5 发布草稿（utils/draft.ts）
输入 600ms 防抖后写入 `cuihu.publish-draft.v1`；进入页面自动恢复并提示。
**合规勾选（敏感信息授权）永不自动恢复**，提交前必须由用户重新确认。提交成功即清除草稿。

### 2.6 弹层可访问性（hooks/useDialog.ts）
打开：锁定背景滚动 → 焦点进入弹层 → Tab 循环；关闭：Esc / 遮罩 → 焦点归还触发元素。
主弹层由 `App.tsx` 统一调度，页内小弹层各自调用 `useDialog`。

### 2.7 全局提示（utils/toast.tsx）
单例提示队列（最多 3 条），按文案特征推断等级：错误 → `role="alert"` + `aria-live="assertive"`，
其余 → `role="status"` + `polite`。全站不使用 `alert()`，避免阻塞主线程与打断读屏。

## 3. 设计 Token

定义于 `src/index.css`：`--text-body / --text-title / --text-small / --tap-min / --focus-ring / --radius-card / --ease-out`。
新增视觉元素一律引用 Token，不再硬编码字号与圆角。

## 4. 可扩展点

| 需求 | 建议改法 |
| --- | --- |
| 接后端 API | 在 `context/AppContext.tsx` 内替换数据来源为异步请求，保持对外 action 签名不变 |
| 换内容安全服务 | 仅替换 `utils/moderation.ts` 实现 |
| 新增发布类型 | `types/index.ts` 扩展 `PostCategory`，`PublishModal` 增加一个模式 |
| 新增弹层 | 新建组件 + 在 `App.tsx` 的 `SubPageType` 中登记 |
| 多语言 | 抽离文案常量，当前全站文案集中在组件内中文字符串 |

## 5. 已知边界

- 数据为本机合成，未接入真实短信、地图、对象存储与内容安全云服务；
- 时间币仅记账，不含任何支付、兑现与转让能力；
- 语音朗读使用浏览器 Web Speech API，个别浏览器无语音包时自动降级为纯文字。
