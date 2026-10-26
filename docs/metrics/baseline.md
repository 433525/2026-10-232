# 基线表（自动采集）

- 采集时间：2026-10-26T10:03:43.719Z
- 采集脚本：`tools/collect-baseline.mjs`（零依赖、只读）
- 断言口径：运行时真值（各脚本 `report.json` 的 `total`），覆盖率 6/6

## A. 断言规模

| 脚本 | 静态调用点 | 运行时总数 | 通过 | 证据时间 | 口径 |
|---|---|---|---|---|---|
| `tools/check-dual-entry.mjs` | 18 | 27 | 27 | 2026-10-26 09:57:03 | runtime |
| `tools/check-aplus-flow.mjs` | 24 | 24 | 24 | 2026-10-26 09:57:35 | runtime |
| `tools/check-community-flow.mjs` | 11 | 11 | 11 | 2026-10-26 09:58:11 | runtime |
| `tools/check-acceptance.mjs` | 27 | 27 | 27 | 2026-10-26 09:58:52 | runtime |
| `tools/check-recovery.mjs` | 28 | 28 | 28 | — | runtime |
| `tools/check-fixes.mjs` | 93 | 93 | 93 | 2026-10-26 10:01:55 | runtime |
| **合计** | **201** | **210** | — | — | — |

## B. 核心代码规模与密度

- 口径 A（全量核心模块，src/context + src/data + src/aplus + src/selectors）：**12693 行**
  - 断言密度 A：**1.65 条 / 百行**（210 ÷ 12693）
- 口径 B（四个核心单点）：**6004 行**
  - 断言密度 B：**3.5 条 / 百行**（210 ÷ 6004）

> 口径说明：v1.0 方案记录的 3.3 条/百行接近口径 B。两种口径不可混用；本轮起以口径 A 为准，目标值须按同一分母重算。

| 文件 | 行数 |
|---|---|
| `src/context/AppContext.tsx` | 1024 |
| `src/data/community/store.ts` | 2383 |
| `src/data/intake/store.ts` | 1009 |
| `src/aplus/workbench.ts` | 1588 |

核心模块行数 Top 8：

| 文件 | 行数 |
|---|---|
| `src/data/community/store.ts` | 2383 |
| `src/aplus/workbench.ts` | 1588 |
| `src/data/intake/intake.ts` | 1411 |
| `src/context/AppContext.tsx` | 1024 |
| `src/data/intake/store.ts` | 1009 |
| `src/selectors/community.ts` | 701 |
| `src/data/intake/intake-backup.ts` | 518 |
| `src/data/community/types.ts` | 403 |

## C. 工作区与产物

- 未跟踪文件：**3**（其中 `tools/_*` 调试脚本 0）
- dist 总量：**781 KB**；最大 chunk：`assets/community-GxR72cK5.js` 196 KB

## D. 负向/边界断言占比（参考值）

- 可识别断言名称 201 条，命中负向关键词 61 条，占比 **30.3%**
- 精确口径（前缀自声明）：`[neg]` 4 条、`[edge]` 1 条，合计 5 条 / 210 条 = **2.4%**
- 两口径差异说明：存量断言未加前缀，精确口径只覆盖新增用例；负向覆盖率的目标值以**精确口径**为准，启发式仅供趋势参考
- 说明：静态断言名称启发式统计，模板串与循环展开未计入；仅作趋势参考

## E. 文档—实现偏差

**契约文档（计入门禁）**

| 类型 | 文件:行 | 声明值 | 实测值 | 结论 |
|---|---|---|---|---|
| 断言总数 | `docs/delivery/acceptance.md:27` | 210 | 210 | 一致 |
| AppContext 行数 | `docs/delivery/gap-report.md:62` | 1024 | 1024 | 一致 |

历史流水类文档（P1–P10 记录、交接沿革）另有 20 处数字，其中 20 处与当前实测不同；按「历史记录不追改」处理，不计入偏差数。

## F. 门禁耗时与待采集

- 全量门禁（六段串行，端到端墙钟）：**331.0 s**（约 5 分 31 秒），断言 **210** 条全绿
- 环境：win32-x64 / Node v22.22.2 / vite 7.3.2；基线 02c2c53；base `http://localhost:5180`
- 来源：`docs/metrics/gate-timing.json`（人工实测落盘；采集器只读，不自行启动浏览器）

| 脚本 | 耗时 (s) | 断言 | 通过 |
|---|---|---|---|
| `tools/check-dual-entry.mjs` | 39.5 | 27 | 27 |
| `tools/check-aplus-flow.mjs` | 32.5 | 24 | 24 |
| `tools/check-community-flow.mjs` | 35.3 | 11 | 11 |
| `tools/check-acceptance.mjs` | 39.1 | 27 | 27 |
| `tools/check-recovery.mjs` | 53.9 | 28 | 28 |
| `tools/check-fixes.mjs` | 130.6 | 93 | 93 |
| **合计** | **331.0** | **210** | **210** |

> 口径说明：六段串行执行，均针对 dist 的同一次构建；含 Chrome 启动与页面加载，故为端到端墙钟时间，非纯断言耗时。

- [ ] 单次典型操作重算次数（需 I-05 渲染探针）

