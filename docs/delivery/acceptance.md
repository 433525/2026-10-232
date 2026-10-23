# 验收记录

更新：2026-10-23。执行环境：Windows 11 / Node 22.22.2 / Chromium（headless）/ `vite preview @ 5180`。
所有结论均来自本轮实际执行，命令与产物路径可复现。

## 一、构建与类型

| 项目 | 命令 | 结果 |
|---|---|---|
| 类型检查 | `npm run typecheck`（`tsc --noEmit`，`strict` + `noUnusedLocals`） | **0 错误** |
| 生产构建 | `npm run build` | **成功**，`✓ built in 2.01s` |
| 双入口产物 | `dist/index.html`、`dist/aplus.html` | 两份 HTML 各自只有 1 个入口 chunk |
| 共享领域层 | `dist/assets/types-*.js`（196.40 kB / gzip 62.34） | 被两份 HTML **共同引用**（各出现 1 次），未重复打包 |

产物清单（本轮实测）：

```
dist/index.html                  2.17 kB │ gzip  1.35 kB
dist/aplus.html                  2.16 kB │ gzip  1.31 kB
dist/assets/community-*.css     87.48 kB │ gzip 13.43 kB   ← B 端（Tailwind 4）
dist/assets/aplus-*.css         33.38 kB │ gzip  7.56 kB   ← A+ 端（mvp 原生 CSS）
dist/assets/community-*.js     276.85 kB │ gzip 76.88 kB
dist/assets/aplus-*.js         172.34 kB │ gzip 42.52 kB
dist/assets/types-*.js         196.40 kB │ gzip 62.34 kB   ← 两端共享
```

## 二、自动化验收（62 项，全部通过）

| 脚本 | 结果 | 覆盖 |
|---|---|---|
| `npm run check:dual` | **27/27** | 双入口加载、控制台零异常、两端 320/390/768/1024/1440 无横向溢出、A+ 弹层打开/Esc 关闭/焦点归还、`data-autofocus` 优先级、社区桥空态 |
| `npm run check:aplus` | **24/24** | 新建记录、虚构确认门禁、重复检测→人工复核、检查点拦截→解锁、状态流转、备份文本合法 JSON、刷新后持久化 |
| `npm run check:community` | **11/11** | 实名前置拦截、拦截时不写存档、身份切换、成员发布写入存档、先审后发（待审不进公开流）、A+ 读取 B 的存档 |

机器可读结果：`docs/evidence/{dual-entry,aplus-flow,community-flow}/report.json`。
截图（不入库，本地复现）：`docs/evidence/dual-entry/*.png`。

关键结论摘录：

- 双入口在 5 档宽度下 `documentElement.scrollWidth` 与 `body.scrollWidth` 均 ≤ `innerWidth + 1`。
- A+ 打开状态弹层时初始焦点落在 `SELECT#action-select`；Esc 后焦点回到同一个 `BUTTON.button.primary`（按元素引用比对）。
- 使用说明弹层初始焦点落在「知道了」（`[data-autofocus]`），而非它上方的关闭按钮。
- 未实名访客提交求助被拦截并提示「依据实名制法规要求…须先完成实名认证」，且 `localStorage` 无存档写入。
- 成员发布后 A+ 社区桥显示「已读取 1 条合成求助 · 存档保存于 …」，证明两端确实共用一份数据。

## 三、§1.3 十条合规红线逐条验证

| # | 红线 | 实现位置 | 验证方式 | 结果 |
|---|---|---|---|---|
| 1 | **先审后发** | `store.publishPost` 写 `moderation:'pending'`；`visiblePosts` 只取 `approved` | `check:community` 发布后断言公开信息流不含该标题；`check:aplus` 断言新记录自动选中 | ✅ |
| 2 | **实名前置拦截** | `AppContext` 发布入口校验 `membership` | `check:community` 访客提交被拦截、存档未写入 | ✅ |
| 3 | **敏感信息最小化 / 接单后可见** | 不采集证件号、门牌号、病史；`types` 仅有粗粒度 `location` | 全仓扫描：`身份证`/`idCard` 仅出现在「不采集」说明；无 18 位号码 | ✅ |
| 4 | **紧急求助非急救通道** | `SosModal` 明示「不是急救通道、非 24 小时值守」；120/110 为纯文本「请手动拨打」 | 全仓 `href="tel:` 计数 **0**；`check:dual` 控制台无异常 | ✅ |
| 5 | **时间币仅记账、不可兑现转让** | `LEDGER_ENTRY_STATUS='unsettled'`；「no action in the store settles them」 | 代码评审：store 无结算动作；界面文案标注「未结算」 | ✅ |
| 6 | **UGC 举报入口与留痕** | `reportContent` → `reports` + `auditLog('create-report')`；`resolveReport` 写结论 | 代码评审 + `AdminCenter` 举报队列 | ✅ |
| 7 | **匿名仅前台匿名** | `selectors/community.ts`：展示名替换为「匿名邻里（演练）」，`post.author` 保留 | 代码评审（含注释说明后台仍可定位） | ✅ |
| 8 | **全站 noindex + robots.txt** | 两份 HTML 的 `meta robots=noindex,nofollow,noarchive`；`public/robots.txt` `Disallow: /` | `check:dual` 加载两入口；构建产物含 `robots.txt` | ✅ |
| 9 | **仅自制/开源可商用素材、无外部 CDN** | 全仓无外部图片/字体/CDN 引用；头像为空串→渐变占位；图标为内联 SVG | `grep https?://` 仅命中注释；`@font-face` 0 处；字体为系统栈 | ✅ |
| 10 | **不冒充官方** | 全站改为「项目组 / 互助演练」；证明书署名「演练项目组（虚构）」；协议声明「未获得任何社区、街道或机构授权」 | 全仓 `官方` 仅剩「不代表任何官方主体」等否定句与敏感词表 | ✅ |

## 四、手工走查（本轮已执行）

1. B 端：首页 → 社区 → 发布 → 消息 → 我的，五栏切换正常，底部导航在 390px 固定。
2. A+ 端：选中记录 → 更新检查点 → 更新状态 → 时间线追加 → 导出备份文本 → 刷新后仍在。
3. 两端互链：A+ 侧栏「社区演练」→ `/`；B 端「我的 → 服务记录」读 A+ 进度。
4. 320px：两端均无横向滚动，A+ 队列与详情改为单列主从。

## 五、本轮未覆盖（如实登记）

| 项 | 原因 | 建议 |
|---|---|---|
| 备份**导入**（文件选择） | CDP 下需 `DOM.setFileInputFiles`，本轮未接 | 下一轮补 |
| 跨标签存档冲突 | `storage` 事件路径未自动化 | 手工双标签验证 |
| Firefox / Safari / 微信 X5 | 仅 Chromium | T3 要求，需真机 |
| A+ 弹层内部滚动（320px） | 仅验证无横向溢出 | 逐弹层补 |
| 视觉像素比对 | 未建立基线 | 参考 mvp 的 visual-baseline 方案 |

## 六、如何复现

```bash
npm ci                 # 或 npm install
npm run typecheck
npm run build
npx vite preview --port 5180 --strictPort   # 另开终端
npm run check:dual
npm run check:aplus
npm run check:community
```

脚本会自动拉起 headless Chromium（可用 `CHROME_PATH` 指定浏览器），每次使用全新的临时用户目录，因此**不依赖既有 localStorage**。
