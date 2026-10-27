# 基线表（自动采集）

- 采集时间：2026-10-27T05:55:23.674Z
- 采集脚本：`tools/collect-baseline.mjs`（零依赖、只读）
- 断言口径：运行时真值（各脚本 `report.json` 的 `total`），覆盖率 8/8

## A. 断言规模

| 脚本 | 静态调用点 | 运行时总数 | 通过 | 证据时间 | 口径 |
|---|---|---|---|---|---|
| `tools/check-dual-entry.mjs` | 18 | 27 | 27 | 2026-10-27 05:46:29 | runtime |
| `tools/check-aplus-flow.mjs` | 35 | 35 | 35 | 2026-10-27 05:47:03 | runtime |
| `tools/check-community-flow.mjs` | 22 | 22 | 22 | 2026-10-27 05:47:50 | runtime |
| `tools/check-acceptance.mjs` | 27 | 27 | 27 | 2026-10-27 05:48:30 | runtime |
| `tools/check-recovery.mjs` | 28 | 28 | 28 | — | runtime |
| `tools/check-fixes-a.mjs` | 55 | 55 | 55 | 2026-10-27 05:50:42 | runtime |
| `tools/check-fixes-b.mjs` | 39 | 39 | 39 | 2026-10-27 05:52:04 | runtime |
| `tools/check-p0-gaps.mjs` | 12 | 12 | 12 | 2026-10-27 05:53:03 | runtime |
| **合计** | **236** | **245** | — | — | — |

## B. 核心代码规模与密度

- 口径 A（全量核心模块，src/context + src/data + src/aplus + src/selectors）：**12682 行**
  - 断言密度 A：**1.93 条 / 百行**（245 ÷ 12682）
- 口径 B（四个核心单点）：**5993 行**
  - 断言密度 B：**4.09 条 / 百行**（245 ÷ 5993）

> 口径说明：v1.0 方案记录的 3.3 条/百行接近口径 B。两种口径不可混用；本轮起以口径 A 为准，目标值须按同一分母重算。

| 文件 | 行数 |
|---|---|
| `src/context/AppContext.tsx` | 1013 |
| `src/data/community/store.ts` | 2383 |
| `src/data/intake/store.ts` | 1009 |
| `src/aplus/workbench.ts` | 1588 |

核心模块行数 Top 8：

| 文件 | 行数 |
|---|---|
| `src/data/community/store.ts` | 2383 |
| `src/aplus/workbench.ts` | 1588 |
| `src/data/intake/intake.ts` | 1411 |
| `src/context/AppContext.tsx` | 1013 |
| `src/data/intake/store.ts` | 1009 |
| `src/selectors/community.ts` | 701 |
| `src/data/intake/intake-backup.ts` | 518 |
| `src/data/community/types.ts` | 403 |

## C. 工作区与产物

- 未跟踪文件：**0**（其中 `tools/_*` 调试脚本 0；已排除 `docs/metrics`、`docs/evidence` 生成物 0 个）
- dist 总量：**781 KB**；最大 chunk：`assets/community-UgQB5uMf.js` 196 KB

## D. 负向/边界断言占比（参考值）

- 可识别断言名称 236 条，命中负向关键词 81 条，占比 **34.3%**
- 精确口径（前缀自声明）：`[neg]` 16 条、`[edge]` 14 条，合计 30 条 / 245 条 = **12.2%**
- 两口径差异说明：存量断言未加前缀，精确口径只覆盖新增用例；负向覆盖率的目标值以**精确口径**为准，启发式仅供趋势参考
- 说明：静态断言名称启发式统计，模板串与循环展开未计入；仅作趋势参考

## E. 文档—实现偏差

**契约文档（计入门禁）**

| 类型 | 文件:行 | 声明值 | 实测值 | 结论 |
|---|---|---|---|---|
| 断言总数 | `docs/ARCHITECTURE.md:114` | 245 | 245 | 一致 |
| 密度 A | `docs/ARCHITECTURE.md:123` | 1.93 | 1.93 | 一致 |
| 密度 B | `docs/ARCHITECTURE.md:123` | 4.09 | 4.09 | 一致 |
| 密度分母 A | `docs/ARCHITECTURE.md:129` | 12682 | 12682 | 一致 |
| 密度分母 B | `docs/ARCHITECTURE.md:129` | 5993 | 5993 | 一致 |
| 断言总数 | `docs/delivery/acceptance.md:27` | 245 | 245 | 一致 |
| AppContext 行数 | `docs/delivery/gap-report.md:62` | 1013 | 1013 | 一致 |
| 断言总数 | `README.md:43` | 245 | 245 | 一致 |

历史流水类文档（P1–P10 记录、交接沿革）另有 23 处数字，其中 20 处与当前实测不同；按「历史记录不追改」处理，不计入偏差数。

## F. 门禁耗时与待采集

- 全量门禁（8 段串行，端到端墙钟）：**432.4 s**（约 7 分 12 秒），断言 **245** 条全绿
- 各段耗时之和 **432.4 s**（串行口径，与墙钟之差仅为进程间调度开销）
- 环境：win32-x64 / Node v22.22.2 / vite 7.3.2；基线 270400e；base `http://localhost:5180`
- 来源：`tools/run-gate.mjs` 实测并自动落盘（采集器只读，不自行启动浏览器）；被测面指纹 `sha256:d2e2a01f948210a9218e68d2fab369e2`

| 脚本 | 耗时 (s) | 断言 | 通过 |
|---|---|---|---|
| `tools/check-dual-entry.mjs` | 39.4 | 27 | 27 |
| `tools/check-aplus-flow.mjs` | 33.3 | 35 | 35 |
| `tools/check-community-flow.mjs` | 46.4 | 22 | 22 |
| `tools/check-acceptance.mjs` | 38.8 | 27 | 27 |
| `tools/check-recovery.mjs` | 52.9 | 28 | 28 |
| `tools/check-fixes-a.mjs` | 77.8 | 55 | 55 |
| `tools/check-fixes-b.mjs` | 84.4 | 39 | 39 |
| `tools/check-p0-gaps.mjs` | 59.4 | 12 | 12 |
| **合计** | **432.4** | **245** | **245** |

> 口径说明：8 段串行执行，均针对 dist 的同一次构建；totalMs 为端到端墙钟，sumMs 为各段之和，并发时二者不等。surfaceHash 为被测面内容指纹（I-12），用于判定耗时是否失效。

一致性校验（I-11，采集时 HEAD `270400e`）：**全部通过**

| 校验项 | 结果 | 明细 |
|---|---|---|
| 分段断言/通过与 report.json 一致 | 通过 | 8/8 |
| 分项合计等于总计 | 通过 | 断言 245/245、通过 245/245、墙钟 432426/432426 ms（各段之和 432421 ms，并发度 1） |
| 记录断言数等于本次运行时断言数 | 通过 | 245 vs 245 |
| baseRevision 存在且为 HEAD 祖先 | 通过 | 270400e → HEAD 270400e |
| 被测面内容指纹一致（I-12） | 通过 | sha256:d2e2a01f948210a9218e68d2fab369e2 vs sha256:d2e2a01f948210a9218e68d2fab369e2 |

- [ ] 单次典型操作重算次数（需 I-05 渲染探针）

