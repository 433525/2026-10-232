# 暖阳邻里 · UI 重做方案（对照 PDF 设计稿）

> 目标：以 `deliverables/暖阳邻里-Web端单页应用.pdf`（7 页，桌面 1440）与
> `deliverables/暖阳邻里-五页签完整稿.pdf`（8 页，移动 390）为唯一视觉基准，
> 重做 B 端单页应用与 A+ 受理工作台的界面层，并在其上补齐交互与性能缺口。

---

## 一、现状审计

### 1.1 代码结构

| 层 | 位置 | 说明 |
|---|---|---|
| 入口 | `index.html` → `src/main.tsx`；`aplus.html` → `src/main-aplus.tsx` | 双入口，Vite 多页构建 |
| B 端外壳 | `src/App.tsx` + `HeaderNav` / `BottomTabBar` / `FooterCompliance` | 页签状态在 `AppContext`，无 URL 路由 |
| B 端页面 | `HomeTab` / `CommunityTab` / `MessagesTab` / `ProfileTab` / `PublishModal` | 页签 + `activeSubPage` 弹层 |
| B 端弹层 | `OrderDetailModal`、`TasksHall`、`EldercareModal`、`CertificateModal`、`HelpCenterModal`、`SosModal`、`SearchModal`、`CommunityQrModal`、`RealNameModal`、`AdminCenter`、`TermsModal`、`TimeLedgerPage` | 各自实现遮罩与关闭，样式分散 |
| A+ | `src/aplus/*`（workbench 状态机 + 11 版面 + 10 弹层） | 独立样式 `aplus/styles.css`（824 行） |
| 领域层 | `src/data/*`、`src/selectors/*`、`src/context/AppContext.tsx` | 本地存档 + 投影，**本次不动**（除少量读取扩展） |
| 门禁 | `tools/check-*.mjs`（5 个 CDP 脚本，117 项） | 文本选择器 + 存档断言 |

### 1.2 设计系统落地程度

| 项 | 设计稿 | 现状 | 判定 |
|---|---|---|---|
| 底色 / 主色 | `#FBF6EF` / `#C4562A` | token 已落，HomeTab 已用 | 部分完成 |
| 字体分工 | 标题 Noto Serif SC，正文 Noto Sans SC | token 已落，仅首页标题用了衬线 | 未铺开 |
| 投影 | 全站无 `box-shadow` | 消息 / 我的 / 社区 / 页脚 / 多数弹层仍是 `shadow-*` + 渐变 | 未执行 |
| 圆角 | 弹层 24 / 卡 22 / 次级 18 / 输入 12 / 按钮 999 | 组件里 8/12/16/20 混用 | 未统一 |
| 语义色 | 品牌橘只给可点击；危险红只给危险 | 社区/消息仍用 emerald 主色、slate 中性色 | 未替换 |
| 布局 | 1152 内容列 / 764+360 双栏 | 首页已双栏；社区为单列；消息无主从 | 部分完成 |

### 1.3 逐页差距

| 页面 | 现状 | 与设计稿的主要差距 |
|---|---|---|
| 首页 | 已改暖色，双栏网格 | 右列被网格行高牵制；轮播缺暂停/上一张控件；卡片字号偏小；页脚仍是深色板 |
| 社区 | 旧版青绿风格 | 标题非衬线、筛选为实底 tab、缺右侧「群二维码 / 闲置互助」栏、卡片投影与圆角不符 |
| 消息 | 旧版四段 tab + 单列卡片 | 设计为「分段控件 + 左列表右详情」；无「全部已读」；聊天区为深色头 + 气泡 |
| 我的 | 旧版金色渐变钱包 | 设计为白卡 + 深绿存折卡 + 六行菜单；缺桌面三张统计卡 |
| 发布 | 页内表单 | 设计为桌面居中弹层（880px）/ 移动整页；缺「发布后会发生什么」与底部摘要 |
| 弹层 | 各自实现，深色遮罩 + 投影 | 需统一为 24 圆角、暖色遮罩、可访问焦点圈 |
| A+ | 深青顶栏 + 深色侧栏 + 冷灰底 | 设计为暖米底、白顶栏、浅色侧栏、品牌橘主操作 |

---

## 二、重做范围

### 2.1 保留（不重写）

- 领域模型、存档、投影、校验、审核、举报、备份/恢复、A+ 状态机；
- 路由参数、剪贴板、下载、错误上报、离线提示等 `src/shared/*`；
- 所有验收脚本的**行为契约**（按钮文案、`role`、存档键）。

### 2.2 重写（表现层）

1. **样式基座**：`styles/tokens.css`（扩）、`styles/base.css`、`styles/components.css`、`styles/pages.css`。
2. **通用组件**：`src/ui/`（Button / Modal / Sheet / Segmented / Tag / Avatar / SectionHead / EmptyState / Switch / Field）。
3. **外壳**：`HeaderNav`（桌面 / 移动两套结构）、`BottomTabBar`（浮动胶囊坞）、`FooterCompliance`（浅色）。
4. **B 端五页**：`HomeTab`、`CommunityTab`、`MessagesTab`、`ProfileTab`、`PublishModal`。
5. **B 端弹层**：12 个，统一容器与配方。
6. **A+ 皮肤**：替换 `aplus/styles.css` 令牌与顶栏/侧栏/按钮规则；版面结构不动。

### 2.3 新增功能（设计稿有、代码缺）

| 功能 | 落点 |
|---|---|
| 桌面主导航 | 顶栏内联导航（设计稿缺口，补齐可达性） |
| 消息全部已读 | `AppContext` 记录已读 id 集合，`localStorage` 持久化 |
| 消息主从详情 | 四通道列表 + 详情；移动端列表→详情+返回 |
| 公告展开 / 收起 | 首页「公告与制度」手风琴（保留） |
| 社区「群二维码 / 闲置互助」 | 社区右栏卡片 |
| 报名余位 / 已报名态 | 活动卡（`enrollActivity` 已存在） |
| 收藏 / 复制链接 | 帖子操作区（`bookmarkPost` + `clipboard`） |
| 时间存折明细页 | `TimeLedgerPage` 重做 |
| 桌面「我的」三张统计卡 | 我的页 |
| 大字模式开关 | 我的页 + 顶栏 |

### 2.4 性能与体验

- 弹层按需加载：`React.lazy` + `Suspense`，首屏不打包 12 个弹层；
- 首屏避免 `backdrop-filter`；固定头/坞用不透明底；
- 列表派生用 `useMemo`；切换页签用 `startTransition`；
- 图片 `loading="lazy"` + `decoding="async"`（沿用 `SmartImage`）；
- 统一 `prefers-reduced-motion` 与 `forced-colors` 兜底；
- 焦点圈、44px 热区、弹层焦点陷阱与 Esc 关闭全量校验。

---

## 三、具体改动点（文件级）

| 文件 | 动作 | 要点 |
|---|---|---|
| `src/index.css` | 改 | 只保留 `@import` 与 Tailwind 主题映射；移除零散规则 |
| `src/styles/nl-tokens.css` | 扩 | 补齐字体阶梯、行高、容器宽、头/坞高度、动效曲线 |
| `src/styles/base.css` | 新增 | reset、排版、焦点、滚动条、减少动效、强制配色 |
| `src/styles/components.css` | 新增 | 按钮/胶囊/标签/输入/卡片/弹层/分段/开关/空态/列表行 |
| `src/styles/pages.css` | 新增 | 首页双栏、社区双栏、消息主从、我的、发布、A+ 兼容 |
| `src/ui/*.tsx` | 新增 | 9 个通用组件（含焦点陷阱） |
| `src/components/HeaderNav.tsx` | 重写 | 桌面：标识 + 导航 + 搜索 + 工具；移动：问候 + 地址 + 铃 + 搜索 |
| `src/components/BottomTabBar.tsx` | 重写 | 浮动胶囊坞，中央黑色 +，活动项实底橘 |
| `src/components/FooterCompliance.tsx` | 重写 | 浅色卡 + 三枚徽标 + 急救/边界两条提示 |
| `src/components/HomeTab.tsx` | 重写 | 两列流式布局；轮播补暂停/上一条；移动顺序重排 |
| `src/components/CommunityTab.tsx` | 重写 | 标题区 + 筛选胶囊 + 通知条 + 信息流 + 右栏 |
| `src/components/MessagesTab.tsx` | 重写 | 四通道、主从、全部已读、聊天线程、投诉票 |
| `src/components/ProfileTab.tsx` | 重写 | 用户卡 + 存折卡 + 统计卡 + 菜单 + 规则弹层 |
| `src/components/PublishModal.tsx` | 重写 | 弹层/整页双形态，三段切换，右侧说明，底部摘要 |
| `src/components/OrderDetailModal.tsx` | 改 | 套用统一弹层与卡片配方 |
| `src/components/TasksHall.tsx` | 改 | 列表/筛选/空态重排 |
| `src/components/EldercareModal.tsx`、`CertificateModal`、`HelpCenterModal`、`SearchModal`、`CommunityQrModal`、`RealNameModal`、`AdminCenter`、`TermsModal`、`SosModal` | 改 | 统一弹层容器、按钮、标签；SOS 用底部抽屉 |
| `src/components/TimeLedgerPage.tsx` | 重写 | 余额头卡 + 流水时间线 + 统计 |
| `src/components/BrandMark.tsx` | 改 | 由青绿改为品牌橘 + 暖金 |
| `src/App.tsx` | 改 | 新外壳、懒加载弹层、跳过链接 |
| `src/context/AppContext.tsx` | 改 | 新增已读集合与 `markAllMessagesRead` |
| `src/aplus/styles.css` | 改 | 令牌换暖色、去投影、顶栏/侧栏/按钮重绘 |
| `src/aplus/components/*` | 微调 | 仅类名或图标色，不改状态机 |

**不做**：不改信息架构、不改合规文案措辞、不引入 UI 库、不引外部字体/CDN、不改存档结构。

---

## 四、验收

1. `npm run typecheck` 0 error；`npm run build` 通过。
2. 5 个 CDP 脚本 117 项全绿（文案与 `role` 契约保持不变）。
3. 1440 / 1024 / 768 / 390 / 320 五档无横向溢出，触控热区 ≥44。
4. 关键页与 PDF 截图逐页比对：底色、标题字体、双栏比例、卡片圆角、按钮胶囊、无投影。
5. 对比度抽检：正文 ≥4.5:1，次要文字 ≥3:1。
6. 首屏 JS 体积不高于改前（297 kB / gzip 84 kB），弹层拆包后应下降。

---

## 五、风险与取舍

- **字体**：环境离线且不允许外链，`Noto Serif SC` 走系统字体栈（本机已安装），缺失时回落 `Songti SC / SimSun`。视觉一致，但不同机器字重略有差异。
- **设计稿缺桌面导航**：为保证可用性，在顶栏补一组 11px 文本导航，不改变其余元素位置。
- **内容口径**：沿用项目既有的「虚构演练」文案与数据，不照搬设计稿的「建工新村 / 王秀兰」示例数据，避免与合规声明冲突。
- **A+ 状态机**：只换皮肤不动逻辑，避免破坏 117 项验收中的状态断言。

---

# 第二轮（P8）：设计稿逐页比对与收口

> 第一轮已完成「换肤」（token / 外壳 / 五页 / 弹层 / A+ 皮肤）。
> 本轮以 PDF 渲染稿逐页比对为起点，修剩余偏差，并补交互与性能缺口。

## 六、比对方法

PDF 是 TGFX 导出的纯矢量稿（文字已转路径、xref 偏移全为 0），常规 PDF 阅读器与
`workbuddy-pdf` 都判为不可读。本轮写了一个专用转换器把 7 页内容流还原成 SVG 再截图，
得到与设计稿 1:1 的 1440×900 参考图，已归档到 `docs/design-reference/`（p01–p08）。
转换器按「对象流 + FlateDecode + 轴向渐变」解析，文字本身已是矢量路径，所以没有字体依赖。

| 参考页 | 内容 | 对应实现 |
|---|---|---|
| p01 | 封面：桌面 1440，沿用「吸顶导航 + 1152 内容列」 | `nl-container` / `--nl-content` |
| p02 | 首页 | `HomeTab` |
| p03 | 社区动态 | `CommunityTab` |
| p04 | 今日工单（A+） | `src/aplus/*` |
| p05 | 发布弹层 | `PublishModal` |
| p06 | 消息 | `MessagesTab` |
| p07 | 我的 | `ProfileTab` |

## 七、P8 比对结论

仍存在的偏差（按影响排序）：

| # | 位置 | 设计稿 | 第一轮实现 | 处理 |
|---|---|---|---|---|
| 1 | 页脚 | 一行 10px 灰字披露，无卡片、无边框 | 双列合规面板 + 两条警示 + 徽标，视觉重量远超正文 | 收为「一行披露 + 协议链接 + 可展开细节」，合规全文仍留在 DOM |
| 2 | 正文字号 | Body 14 / 行高 22 | 13 / 1.7 | 提到 14 / 1.6，标题阶梯同步收一档 |
| 3 | 顶栏 | 64–68px，标识 44，搜索 320×40，铃铛 40 圆钮 | 76px，标识 38，搜索 36 | 全部对齐；导航项降到 12.5px 不抢层级 |
| 4 | 公告大卡 | 标题 26，副文 13，CTA 40 高 | 25 / 12 / 34 | 对齐 |
| 5 | 常用功能 | 56 圆底图标 + 14 标签 | 44 + 12 | 对齐；移动端 52 |
| 6 | 消息 | 分段控件按内容宽度，列表有「今天」分组 | 分段拉满整行，无分组 | 加 `.nl-seg--inline` 与日期分组 |
| 7 | 我的 | 菜单行 56 高、单卡四行 | 行高偏紧、单卡八行 | 行高与分隔线对齐，保留扩展项 |
| 8 | A+ | 68 顶栏含搜索与用户胶囊，60 侧栏 | 40 侧栏、顶栏压成工具条 | 顶栏/侧栏尺寸对齐，KPI 数字换衬线 |

## 八、P8 改动点（文件级）

| 文件 | 动作 | 内容 |
|---|---|---|
| `src/styles/nl-tokens.css` | 改 | `--nl-fs-body` 14、`--nl-lh-body` 1.6、`--nl-fs-h2` 18、`--nl-fs-h3` 16、`--nl-header-h` 68 |
| `src/styles/components.css` | 改 | 顶栏尺寸、搜索框、铃铛/用户胶囊、分段控件 compact 变体、页脚轻量化 |
| `src/styles/pages.css` | 改 | hero 字号、快捷功能图标、消息日期分组、我的菜单行、社区右栏列表 |
| `src/components/HeaderNav.tsx` | 改 | 标识 44 / 搜索占位 / 工具区顺序与设计对齐 |
| `src/components/FooterCompliance.tsx` | 重写 | 一行披露 + 协议 + `<details>` 合规细节 |
| `src/components/HomeTab.tsx` | 改 | 快捷图标尺寸、hero 文案层级 |
| `src/components/MessagesTab.tsx` | 改 | 紧凑分段 + 今天/更早分组 |
| `src/components/CommunityTab.tsx` | 改 | 右栏互助列表取 3 条 + 帖子菜单补「复制链接」 |
| `src/components/ProfileTab.tsx` | 改 | 菜单行高、分隔线、统计卡对齐 |
| `src/aplus/styles.css` | 改 | 顶栏 68 / 侧栏 60 / KPI 衬线数字 / 搜索框 |

不做：不改领域模型与存档键、不改验收脚本断言的文案与 `role`、不引外部字体。

## 九、P8 验收

1. `npm run typecheck`、`npm run build` 通过；
2. 5 个 CDP 脚本 117 项保持全绿；
3. 1440 / 1024 / 768 / 390 / 320 五档无横向溢出，触控 ≥44；
4. 与 p02–p07 参考图逐页比对：底色、字号阶梯、双栏比例、圆角、无投影；
5. 首屏 JS 与改前同量级（入口主 chunk 198.6 kB / gzip 63.2，路由工具并入后 +0.6 kB）。

## 十、P8 完成情况

### 10.1 视觉（对照 p02–p07）

- 字号阶梯重定：正文 14/1.6、区块标题 17、页标题 26 衬线、说明 10.5；
- 顶栏 68px、标识 44、搜索 320×40 带描边、铃铛 40 圆钮、用户胶囊 42（橘底白字头像）；
- 公告大卡标题 26、副文 13、CTA 40；快捷入口图标 54（移动 54、平板 6 列）；
- 页脚从「双列合规面板」改为「一行披露 + 协议 + 合规细节折叠」，合规正文仍在 DOM；
- 消息分段控件按内容宽度、列表加「今天 / 更早」，我的菜单行 56；
- A+ 清除全部冷色残留（12 处 teal/gray hex），KPI 数字改衬线、面板 22 圆角、侧栏 76 图标轨；
- 崩溃兜底页、`theme-color`、favicon 一并换暖色，加载时不再闪灰底。

### 10.2 交互与功能

| 项 | 说明 |
|---|---|
| 页签深链 | `?tab=` 取 `home` / `community` / `messages` / `profile`；URL 优先于本机记忆，切页签 pushState，后退可用 |
| 帖子深链 | `?tab=community&post=<id>`：滚到目标帖并高亮 2.6s；「复制链接」生成同一地址 |
| 平板导航 | 1024–1199 顶栏隐藏导航、改由底部坞承担，避免顶栏挤压截断 |
| 移动筛选 | 分类胶囊单行横向滚动 + 右侧渐隐，不再折行挤压首屏 |
| 弹层预热 | 空闲时预取发布 / 订单详情 / 接单大厅三个 chunk，首次打开不等下载 |
| 空态与可达 | 闲置互助补「查看全部闲置」直达筛选；页脚折叠区可键盘展开 |

### 10.3 实测

| 指标 | 结果 |
|---|---|
| `npm run typecheck` | 0 error |
| `npm run build` | 通过，B 端入口主 chunk 198.6 kB（gzip 63.2），共享 vendor chunk 196.4 kB（gzip 62.4），CSS 81.9 kB（gzip 15.2） |
| 验收脚本 | 117/117（27 + 24 + 11 + 27 + 28） |
| 首屏（本地 preview，1440） | FCP/LCP 172ms，CLS 0，资源 9 个，JS 传输合计 140.7 kB |
| 首屏（390） | FCP/LCP 148ms，CLS 0 |
| A+（1440） | FCP/LCP 236ms，CLS 0，JS 105.6 kB |
| 五档宽度 | 320 / 390 / 768 / 1024 / 1440 均无横向溢出（门禁覆盖） |

设计稿与实现的差异保留在：示例数据（用项目自有的虚构数据，不复制「建工新村 / 王秀兰」）、
桌面导航（设计稿缺，本实现补 12.5px 文本导航）、页脚（合规正文折叠而非删除）。
