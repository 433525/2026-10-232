#!/usr/bin/env node
/**
 * collect-baseline.mjs — 持续改进项目的基线采集器（CIP-232 / W1 任务 1.1）。
 *
 * 设计原则：
 * 1. 只读。除 `--write` 指定的输出文件外不改动任何仓库文件。
 * 2. 零依赖。仅用 Node 内置模块，不新增 package.json 依赖（离线约束）。
 * 3. 真值优先。断言数量优先读各脚本自己写出的 `docs/evidence/<slug>/report.json`
 *    的 `total`（运行时真值，含循环展开）；缺失时才回退到静态 call site 计数，
 *    并在输出中显式标注 `static`，避免把静态计数误当验收口径。
 *
 * 采集项：
 *   A 断言规模（逐脚本：静态调用点 / 运行时总数 / 通过数 / 证据时间）
 *   B 核心代码规模与断言密度（口径 A 全量核心模块 / 口径 B 四个核心单点）
 *   C 工作区与产物（未跟踪文件数、dist 总量、最大 chunk）
 *   D 负向/边界断言占比（启发式，静态扫描断言名称，标注为参考值）
 *   E 文档—实现偏差（文档声明的断言数 / AppContext 行数 / 密度分母与数值 / 交接状态块 vs 实测）
 *   F 门禁耗时与待采集
 *
 * 用法：
 *   node tools/collect-baseline.mjs           # 打印 Markdown 表
 *   node tools/collect-baseline.mjs --json    # 打印 JSON
 *   node tools/collect-baseline.mjs --write   # 写入 docs/metrics/baseline.md
 *
 * 运行时项（不在本脚本自动采集，需另跑）：
 *   - 全量门禁耗时：`node tools/run-gate.mjs`（八段串行、自动落盘 `gate-timing.json`）
 *   - 单次典型操作重算次数：需 I-05 渲染探针先落地，本脚本只登记为「待采集」
 *
 * I-11 一致性校验（`--strict` 视为硬失败）：
 *   1. `gate-timing.json` 的分段断言/通过数与对应 `report.json` 一致；
 *   2. 分项合计（断言、通过、毫秒）等于总计字段；
 *   3. 记录的总断言数等于本次采集的运行时断言数；
 *   4. `baseRevision` 存在且为 HEAD 祖先；
 *   5. 被测面内容指纹（`tools/lib/surface-hash.mjs`）与当前源码一致，否则耗时基线失效。
 *   6. `docs/HANDOVER.md` §0.1 的 `CIP-STATUS` 状态块（I-16）：断言数、全量/快检耗时、
 *      精确负向占比须与本次实测一致；未写该块不判红。
 *   7. 产物内容指纹（`tools/lib/dist-hash.mjs`，I-17）与 `dist/` 当前内容一致；旧格式基线
 *      未记录指纹、或 `dist/` 不存在时不判红。
 *   8. 证据分片绑定（`tools/lib/evidence.mjs`，I-20）：八份 `report.json` 的内容指纹须与
 *      `gate-timing.json` 记录的一致，且 `checkedAt` 落在本次门禁的时间窗内；旧格式基线
 *      未记录指纹时不判红。
 * 第 5 条的意义：判失效看内容而非提交时间——只改文档不失效，改 `src/` 或 `check-*` 才失效。
 * 第 6 条的意义：交接文档是接手者的入口，长期在契约校验之外，连续三个版本写着已废弃的
 * 断言数（117 → 205 → 248），且与同文件 §2.5 自相矛盾。
 * 第 7 条的意义：第 5 条只证明「源码没改」，证明不了「门禁跑的是这份 bundle」。改 `src/`
 * 后忘记 build，断言跑在旧产物上照样全绿，耗时记录却写着新源码的指纹——两侧自洽、结论为假；
 * 构建后被重新打包（内容已非实测那份）同样让旧结论失去对应物。实测该漏洞于 2026-10-27
 * 真实发生：dist 于 23:32 重建，而最近一次全量门禁在 16:36，中间 7 小时无任何记录能分辨。
 * 第 8 条的意义：第 5、7 条证明的都是**输入端**（源码、产物），证明不了「八份证据出自同一次
 * 执行」。全量门禁记录 248/248 之后，单跑任意一段 `node tools/check-<x>.mjs` 会用另一时刻
 * 的结果覆盖该段 `report.json`，而断言总数与通过数多半不变——分项校验照样全绿，证据已换。
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { distHash } from './lib/dist-hash.mjs'
import { evidenceHash } from './lib/evidence.mjs'
import { surfaceHash } from './lib/surface-hash.mjs'

const ROOT = process.cwd()
const OUT_DEFAULT = join(ROOT, 'docs', 'metrics', 'baseline.md')

const SCRIPTS = [
  { slug: 'dual-entry', file: 'tools/check-dual-entry.mjs', label: '双入口' },
  { slug: 'aplus-flow', file: 'tools/check-aplus-flow.mjs', label: 'A+ 流程' },
  { slug: 'community-flow', file: 'tools/check-community-flow.mjs', label: '社区流程' },
  { slug: 'acceptance', file: 'tools/check-acceptance.mjs', label: '验收' },
  { slug: 'recovery', file: 'tools/check-recovery.mjs', label: '坏档恢复' },
  { slug: 'fixes-a', file: 'tools/check-fixes-a.mjs', label: '补测 A 段' },
  { slug: 'fixes-b', file: 'tools/check-fixes-b.mjs', label: '补测 B 段' },
  { slug: 'p0-gaps', file: 'tools/check-p0-gaps.mjs', label: 'P0 缺口' },
]

const CORE_DIRS = ['src/context', 'src/data', 'src/aplus', 'src/selectors']
const CORE_EXT = new Set(['.ts', '.tsx'])

/**
 * 门禁分档预算（毫秒，I-15）：快检 230 s 取 D-25 默认值（原 210 s 已在 245 条时倒挂
 * 0.8 s），全量 480 s 为 D-16，单段 150 s 为 D-02。改预算须同步 `decisions.md` 与
 * `ARCHITECTURE` §6.6，否则本表会与文字口径分叉。
 */
const GATE_BUDGET = { fastMs: 230_000, totalMs: 480_000, segmentMs: 150_000 }

/** 快检档包含的段：前五段（不含 fixes-a/b、p0-gaps）。 */
const FAST_TIER = ['dual-entry', 'aplus-flow', 'community-flow', 'acceptance', 'recovery']


/** 四个核心单点文件：v1.0 方案计算密度时使用的分母口径（口径 B）。 */
const CORE_SINGLES = [
  'src/context/AppContext.tsx',
  'src/data/community/store.ts',
  'src/data/intake/store.ts',
  'src/aplus/workbench.ts',
]

/** 视为「当前状态声明」的文档：其余文档中的数字按历史流水处理，不计入偏差数。 */
const CURRENT_DOCS = [
  'docs/delivery/acceptance.md',
  'docs/delivery/gap-report.md',
  'docs/ARCHITECTURE.md',
  'README.md',
]

/** 负向/边界语义关键词：命中即计入「非纯正向」断言。仅作趋势参考，不作考核值。 */
const NEGATIVE_TOKENS = [
  '拒绝',
  '不可',
  '禁用',
  '禁用态',
  '失败',
  '拦截',
  '回退',
  '不',
  '无',
  '空态',
  '无效',
  '超限',
  '越权',
  '边界',
  '不允许',
  '不能',
  '错误',
  '容错',
]

function readText(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return ''
  }
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      walk(full, out)
    } else {
      out.push(full)
    }
  }
  return out
}

function countLines(file) {
  const text = readText(file)
  if (!text) return 0
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
}

function staticCallSites(file) {
  const text = readText(file)
  const matched = text.match(/^\s*(?:await\s+)?check\(/gm)
  return matched ? matched.length : 0
}

function runtimeReport(slug) {
  const path = join(ROOT, 'docs', 'evidence', slug, 'report.json')
  if (!existsSync(path)) return null
  try {
    const json = JSON.parse(readText(path))
    return {
      total: typeof json.total === 'number' ? json.total : null,
      passed: typeof json.passed === 'number' ? json.passed : null,
      // 证据时间字段不统一：多数脚本写 checkedAt，check-recovery 写 generatedAt。
      // 采集器两种都认，否则 A 段「证据时间」会恒定显示 —（当前 recovery 即如此）。
      checkedAt: json.checkedAt ?? json.generatedAt ?? null,
    }
  } catch {
    return null
  }
}

function extractAssertionNames(file) {
  const text = readText(file)
  const names = []
  const re = /check\(\s*(?:`([^`]*)`|'([^']*)'|"([^"]*)")/g
  let m
  while ((m = re.exec(text)) !== null) names.push(m[1] ?? m[2] ?? m[3])
  return names
}

function git(args) {
  try {
    return execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

function gitOk(args) {
  try {
    execSync(`git ${args}`, { cwd: ROOT, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * 工作区卫生。生成物（`docs/metrics/*`、`docs/evidence/*`）不计入「脏文件」：
 * 前者是本脚本 `--write` 的产物，后者是验收运行写出的报告，二者未提交属正常态。
 */
function gitUntracked() {
  try {
    const raw = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' })
    const paths = raw
      .split('\n')
      .filter((line) => line.startsWith('??'))
      .map((line) => line.slice(3).trim().replace(/^"|"$/g, ''))
    const isGenerated = (path) => /^docs\/(?:metrics|evidence)\//.test(path)
    return {
      total: paths.filter((path) => !isGenerated(path)).length,
      generated: paths.filter(isGenerated).length,
      scratch: paths.filter((path) => /tools[/\\]_/.test(path)).length,
    }
  } catch {
    return { total: null, generated: null, scratch: null }
  }
}

/**
 * 门禁耗时：由 `docs/metrics/gate-timing.json` 提供（人工串行实测后落盘）。
 * 采集器本身只读、不启动浏览器，因此不自行计时，只做「有则填、无则待采集」，
 * 并对落盘数据做一致性校验（I-11），避免出现「修订号/断言数错配」的不可复核基线。
 */
function gateTiming(assertions) {
  const path = join(ROOT, 'docs', 'metrics', 'gate-timing.json')
  if (!existsSync(path)) return null
  let json
  try {
    json = JSON.parse(readText(path))
    if (typeof json.totalMs !== 'number' || !Array.isArray(json.scripts)) return null
  } catch {
    return null
  }

  // 1) 分段与运行时报告逐条对齐。slug 以 SCRIPTS 为准：gate-timing.json 里的 slug
  //    可能是短名（如 `dual`），与证据目录 `docs/evidence/dual-entry/` 不同名。
  const perScript = json.scripts.map((row) => {
    const slug = SCRIPTS.find((item) => item.file === row.file)?.slug ?? row.slug
    const report = runtimeReport(slug)
    return {
      file: row.file,
      recorded: row.assertions,
      runtime: report?.total ?? null,
      ok: report ? report.total === row.assertions && report.passed === row.passed : false,
    }
  })

  const sumAssertions = json.scripts.reduce((sum, row) => sum + (row.assertions ?? 0), 0)
  const sumPassed = json.scripts.reduce((sum, row) => sum + (row.passed ?? 0), 0)
  const sumMs = json.scripts.reduce((sum, row) => sum + (row.ms ?? 0), 0)

  // 2) base 修订号：必须存在且为 HEAD 祖先
  const head = git('rev-parse --short HEAD')
  const baseExists = Boolean(json.baseRevision) && gitOk(`cat-file -e "${json.baseRevision}^{commit}"`)
  const baseIsAncestor = baseExists && gitOk(`merge-base --is-ancestor "${json.baseRevision}" HEAD`)

  // 3) 被测面内容指纹（I-12）：有记录时以指纹为准，无记录时退回提交区间判断。
  const changed = baseIsAncestor ? (git(`diff --name-only ${json.baseRevision}..HEAD`) ?? '') : ''
  const CODE_SURFACE = /^(?:src\/|tools\/check-|tools\/lib\/|index\.html$|aplus\.html$|vite\.config\.|package\.json$)/
  const touched = changed.split('\n').filter((line) => CODE_SURFACE.test(line.trim()))
  const currentHash = surfaceHash(ROOT)
  const hashRecorded = typeof json.surfaceHash === 'string' && json.surfaceHash.length > 0
  const surfaceOk = hashRecorded ? json.surfaceHash === currentHash : baseIsAncestor && touched.length === 0

  const concurrent = (json.concurrency ?? 1) > 1
  const perMs = json.scripts.map((row) => row.ms ?? 0)
  const timingOk = concurrent
    ? json.totalMs === json.wallMs && json.totalMs >= Math.max(...perMs) && json.totalMs <= sumMs
    : Math.abs(sumMs - json.totalMs) <= 1000

  // 4) 分档预算（I-15）：快检档只取前五段，按同段实测耗时合计；全量取墙钟；
  //    单段取最长一段。此前只记录全量墙钟，快检档 210 s 已悄悄倒挂 0.8 s 无人发现。
  const fastRows = json.scripts.filter((row) => {
    const slug = SCRIPTS.find((item) => item.file === row.file)?.slug ?? row.slug
    return FAST_TIER.includes(slug)
  })
  const fastMs = fastRows.reduce((sum, row) => sum + (row.ms ?? 0), 0)
  const slowest = json.scripts.reduce(
    (worst, row) => ((row.ms ?? 0) > (worst.ms ?? 0) ? row : worst),
    json.scripts[0] ?? { file: '—', ms: 0 },
  )
  const tierOk = fastMs <= GATE_BUDGET.fastMs
    && json.totalMs <= GATE_BUDGET.totalMs
    && (slowest.ms ?? 0) <= GATE_BUDGET.segmentMs

  // 5) 产物配对（I-17）：源码指纹只证明「代码没改」，证明不了「门禁跑的是这份 bundle」。
  //    改了 `src/` 却忘记 build 时，断言跑在旧产物上照样全绿，而耗时记录里写的是当前源码
  //    的指纹——两侧自洽、结论可能是假。产物在构建后被替换同样会让旧结论失去对应物。
  const currentDistHash = distHash(ROOT)
  const distRecorded = typeof json.distHash === 'string' && json.distHash.length > 0
  // 无产物不判红：`dist/` 不入库，新克隆或清理后缺产物属环境状态，不是基线缺陷。
  const distOk = !distRecorded || !currentDistHash ? true : json.distHash === currentDistHash

  // 6) 证据绑定（I-20）：前两条指纹都是**输入端**的证明（源码没改、产物没换），
  //    证明不了「这八份 report.json 出自同一次门禁」。实测缺口：全量门禁记录 248/248 后，
  //    单跑 `node tools/check-p0-gaps.mjs` 会用另一时刻（可能已是另一份 bundle）的结果
  //    覆盖该段证据，而断言总数与通过数不变，第 1、2 条校验照样全绿。
  //    判据两条：① 分片字节指纹与门禁记录一致；② `checkedAt` 落在本次门禁的时间窗内。
  const windowStart = typeof json.gateStartAt === 'string' ? Date.parse(json.gateStartAt) : NaN
  const windowEnd = typeof json.measuredAt === 'string' ? Date.parse(json.measuredAt) : NaN
  const windowEnforced = Number.isFinite(windowStart)
  const evidenceBound = json.scripts.map((row) => {
    const slug = SCRIPTS.find((item) => item.file === row.file)?.slug ?? row.slug
    const current = evidenceHash(join(ROOT, 'docs', 'evidence', slug, 'report.json'))
    const recordedHash = typeof row.reportHash === 'string' && row.reportHash.length > 0
    const at = runtimeReport(slug)?.checkedAt ?? null
    const atMs = at ? Date.parse(at) : NaN
    // 留 5 s 容差：`gateStartAt` 取自进程启动，各段脚本的 `checkedAt` 取自落盘时刻，两者同源但非同一毫秒。
    const inWindow = !windowEnforced
      ? true
      : Number.isFinite(atMs) && atMs >= windowStart - 5000 && (!Number.isFinite(windowEnd) || atMs <= windowEnd + 5000)
    return {
      slug,
      recorded: recordedHash,
      hashOk: !recordedHash || !current ? true : row.reportHash === current,
      inWindow,
      at,
    }
  })
  const evidenceOk = evidenceBound.every((item) => item.hashOk && item.inWindow)
  const unbound = evidenceBound.filter((item) => !item.hashOk || !item.inWindow).map((item) => item.slug)
  const hashMissing = evidenceBound.filter((item) => !item.recorded).length

  const checks = [
    {
      id: '分段断言/通过与 report.json 一致',
      ok: perScript.every((item) => item.ok),
      detail: perScript.filter((item) => !item.ok).map((item) => item.file).join(', ') || `${SCRIPTS.length}/${SCRIPTS.length}`,
    },
    {
      id: concurrent ? '分项合计等于总计（并发口径）' : '分项合计等于总计',
      ok: sumAssertions === json.totalAssertions && sumPassed === json.totalPassed && timingOk,
      detail: `断言 ${sumAssertions}/${json.totalAssertions}、通过 ${sumPassed}/${json.totalPassed}、墙钟 ${json.totalMs}/${json.wallMs ?? json.totalMs} ms（各段之和 ${sumMs} ms，并发度 ${json.concurrency ?? 1}）`,
    },
    {
      id: '记录断言数等于本次运行时断言数',
      ok: json.totalAssertions === assertions,
      detail: `${json.totalAssertions} vs ${assertions}`,
    },
    {
      id: 'baseRevision 存在且为 HEAD 祖先',
      ok: baseIsAncestor,
      detail: `${json.baseRevision ?? '—'} → HEAD ${head ?? '—'}`,
    },
    {
      id: '被测面内容指纹一致（I-12）',
      ok: surfaceOk,
      detail: hashRecorded
        ? `${json.surfaceHash} vs ${currentHash}`
        : `未记录指纹，退回提交区间判断：${touched.length ? touched.slice(0, 3).join(', ') : '无改动'}`,
    },
    {
      id: '分档预算：快检 / 全量 / 单段（I-15）',
      ok: tierOk,
      detail: `快检 ${(fastMs / 1000).toFixed(1)} / ${GATE_BUDGET.fastMs / 1000} s（${fastRows.length} 段）、全量 ${(json.totalMs / 1000).toFixed(1)} / ${GATE_BUDGET.totalMs / 1000} s、最长段 ${slowest.file} ${((slowest.ms ?? 0) / 1000).toFixed(1)} / ${GATE_BUDGET.segmentMs / 1000} s`,
    },
    {
      id: '被测产物指纹一致（I-17）',
      ok: distOk,
      detail: !distRecorded
        ? '未记录产物指纹（旧格式基线），下一次全量门禁自动写入'
        : !currentDistHash
          ? 'dist/ 无产物，跳过（dist 不入库）'
          : `${json.distHash} vs ${currentDistHash}`,
    },
    {
      id: '证据分片绑定本次门禁（I-20）',
      ok: evidenceOk,
      detail: hashMissing === evidenceBound.length
        ? '未记录分片指纹（旧格式基线），下一次全量门禁自动写入'
        : unbound.length
          ? `${unbound.length} 段不符：${unbound.join(', ')}`
          : `${evidenceBound.length}/${evidenceBound.length} 分片指纹一致${windowEnforced ? '，时间窗内' : '（未记录门禁起始时刻，仅校验指纹）'}`,
    },
  ]

  return {
    ...json,
    head,
    perScript,
    checks,
    consistent: checks.every((item) => item.ok),
    tiers: { fastMs, fastCount: fastRows.length, slowest: { file: slowest.file, ms: slowest.ms ?? 0 }, budget: GATE_BUDGET },
    dist: { recorded: json.distHash ?? null, current: currentDistHash },
    evidence: {
      bound: evidenceBound.filter((item) => item.recorded && item.hashOk && item.inWindow).length,
      total: evidenceBound.length,
      hashMissing,
      unbound,
    },
  }
}

function distStats() {
  const dir = join(ROOT, 'dist')
  if (!existsSync(dir)) return { total: null, largest: null }
  const files = walk(dir).filter((f) => /\.(js|css)$/.test(f))
  let total = 0
  let largest = { name: '', size: 0 }
  for (const file of files) {
    const size = statSync(file).size
    total += size
    if (size > largest.size) largest = { name: relative(dir, file).replace(/\\/g, '/'), size }
  }
  const allFiles = walk(dir)
  const allBytes = allFiles.reduce((sum, f) => sum + statSync(f).size, 0)
  return {
    total: allBytes,
    assets: total,
    largest: largest.name ? largest : null,
  }
}

function docClaims(actual) {
  const docs = [
    ...walk(join(ROOT, 'docs')).filter((f) => f.endsWith('.md')),
    join(ROOT, 'README.md'),
  ].filter((f) => existsSync(f))

  const claims = []
  for (const file of docs) {
    const lines = readText(file).split('\n')
    lines.forEach((line, i) => {
      // 目标值/阈值行（含 ≥ ≤）不是在陈述当前状态，计入会把目标误判为偏差。
      if (/[≥≤]/.test(line)) return
      // AppContext 行数声明
      const ctx = /AppContext\.tsx[^\n]{0,60}?(\d{3,4})\s*行/g
      let m
      while ((m = ctx.exec(line)) !== null) {
        claims.push({
          kind: 'AppContext 行数',
          file: relative(ROOT, file).replace(/\\/g, '/'),
          line: i + 1,
          claimed: Number(m[1]),
          actual: actual.appContextLines,
        })
      }
      // 断言总数声明（两种语序）
      const a1 = /(?:断言|验收)[^\n]{0,16}?(\d{2,3})\s*(?:项|条)/g
      while ((m = a1.exec(line)) !== null) {
        claims.push({
          kind: '断言总数',
          file: relative(ROOT, file).replace(/\\/g, '/'),
          line: i + 1,
          claimed: Number(m[1]),
          actual: actual.assertions,
        })
      }
      const a2 = /(\d{2,3})\s*(?:项|条)[^\n]{0,10}?(?:断言|验收)/g
      while ((m = a2.exec(line)) !== null) {
        claims.push({
          kind: '断言总数',
          file: relative(ROOT, file).replace(/\\/g, '/'),
          line: i + 1,
          claimed: Number(m[1]),
          actual: actual.assertions,
        })
      }
      // 「当前基线：N 项」形（ARCHITECTURE §6.1 的口径锚点）
      const a3 = /当前基线[：:]\s*(\d{2,3})\s*项/g
      while ((m = a3.exec(line)) !== null) {
        claims.push({
          kind: '断言总数',
          file: relative(ROOT, file).replace(/\\/g, '/'),
          line: i + 1,
          claimed: Number(m[1]),
          actual: actual.assertions,
        })
      }
      // 密度分母声明（ARCHITECTURE §6.2 的口径锚点，I-13）：必须写成同一行的
      // 「分母实测：A = N 行 / B = M 行」，两侧数字各自核对，缺一即不成立。
      const den = /分母实测[^\n]*?A\s*=\s*(\d{4,5})\s*行[^\n]*?B\s*=\s*(\d{4,5})\s*行/g
      while ((m = den.exec(line)) !== null) {
        claims.push({
          kind: '密度分母 A',
          file: relative(ROOT, file).replace(/\\/g, '/'),
          line: i + 1,
          claimed: Number(m[1]),
          actual: actual.coreLines,
        })
        claims.push({
          kind: '密度分母 B',
          file: relative(ROOT, file).replace(/\\/g, '/'),
          line: i + 1,
          claimed: Number(m[2]),
          actual: actual.coreSinglesLines,
        })
      }
      // 密度数值声明（I-14）：I-13 只锁分母，数值本身仍可漂移——W5 加完两条断言后
      // §6.2 的「A = 1.88」停留在 238 项的旧值上，实测已 1.89。凡写「当前密度」的行，
      // A/B 两个数值都按 toFixed(2) 精确比对；未写该行不判红，避免变成新的必填项。
      if (/当前密度/.test(line)) {
        const dv = /A\s*=\s*([\d.]+)\s*条\s*\/\s*百行[^\n]*?B\s*=\s*([\d.]+)\s*条\s*\/\s*百行/g
        while ((m = dv.exec(line)) !== null) {
          claims.push({
            kind: '密度 A',
            file: relative(ROOT, file).replace(/\\/g, '/'),
            line: i + 1,
            claimed: Number(m[1]),
            actual: actual.density,
          })
          claims.push({
            kind: '密度 B',
            file: relative(ROOT, file).replace(/\\/g, '/'),
            line: i + 1,
            claimed: Number(m[2]),
            actual: actual.densitySingles,
          })
        }
      }
    })
  }

  const dedup = []
  const seen = new Set()
  for (const claim of claims) {
    const key = `${claim.file}:${claim.line}:${claim.kind}:${claim.claimed}`
    if (seen.has(key)) continue
    seen.add(key)
    claim.ok = claim.claimed === claim.actual
    claim.scope = CURRENT_DOCS.includes(claim.file.replace(/\\/g, '/')) ? 'current' : 'historical'
    dedup.push(claim)
  }
  return dedup
}

/**
 * 交接文档「当前状态块」校验（I-16）。`docs/HANDOVER.md` 是接手者的入口，却不在
 * 契约校验的 `CURRENT_DOCS` 内：2026-10-24 定稿写 117 项，此后 W3–W7 增至 248 项，
 * §0 仍停在 205 项、附录仍写「五脚本 117 项」，同一文件内 §0 与 §2.5 互相矛盾——
 * 与本项目反复出现的「权威文档与实测分叉」同类，只是这次长在最显眼的位置。
 *
 * 只校验显式标记块，不扫全文：该文件另有 700 行历史沿革，全文扫描会把刻意保留的
 * 旧数字判成偏差。块内约定 `| 指标名 | 值 |`，值取首个数字或百分数；
 * 未写该块不判红（避免变成新的必填项），写了但数值不符即 `--strict` 退出码 1。
 */
const STATUS_BLOCK_RE = /<!--\s*CIP-STATUS:BEGIN[^>]*-->([\s\S]*?)<!--\s*CIP-STATUS:END\s*-->/

function handoverStatusClaims(actual, gate) {
  const rel = 'docs/HANDOVER.md'
  const text = readText(join(ROOT, rel))
  const match = STATUS_BLOCK_RE.exec(text)
  if (!match) return []
  const baseLine = text.slice(0, match.index).split('\n').length
  const expected = {
    断言总数: String(actual.assertions),
    全量门禁: gate?.totalMs ? (gate.totalMs / 1000).toFixed(1) : null,
    快检门禁: gate?.tiers?.fastMs ? (gate.tiers.fastMs / 1000).toFixed(1) : null,
    精确负向占比: actual.prefixedRatio === null || actual.prefixedRatio === undefined ? null : `${actual.prefixedRatio}%`,
  }
  const claims = []
  match[1].split('\n').forEach((line, i) => {
    const cells = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/.exec(line)
    if (!cells) return
    const name = cells[1].trim()
    if (!(name in expected)) return
    const value = /^([\d.]+%?)/.exec(cells[2].trim())
    if (!value) return
    claims.push({
      kind: name,
      file: rel,
      line: baseLine + i,
      claimed: value[1],
      actual: expected[name],
      ok: expected[name] !== null && value[1] === expected[name],
      scope: 'status',
    })
  })
  return claims
}

function fmtBytes(bytes) {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

function collect() {
  const rows = SCRIPTS.map(({ slug, file, label }) => {
    const report = runtimeReport(slug)
    return {
      slug,
      file,
      label,
      staticSites: staticCallSites(join(ROOT, file)),
      total: report?.total ?? null,
      passed: report?.passed ?? null,
      checkedAt: report?.checkedAt ?? null,
      source: report?.total ? 'runtime' : 'static',
    }
  })

  const assertions = rows.reduce((sum, row) => sum + (row.total ?? row.staticSites), 0)
  const runtimeRows = rows.filter((row) => row.source === 'runtime').length

  const coreFiles = CORE_DIRS.flatMap((dir) =>
    walk(join(ROOT, dir)).filter((f) => CORE_EXT.has(f.slice(f.lastIndexOf('.')))),
  )
  const core = coreFiles
    .map((file) => ({ file: relative(ROOT, file).replace(/\\/g, '/'), lines: countLines(file) }))
    .sort((a, b) => b.lines - a.lines)
  const coreLines = core.reduce((sum, item) => sum + item.lines, 0)

  const appContextLines = countLines(join(ROOT, 'src', 'context', 'AppContext.tsx'))
  const coreSingles = CORE_SINGLES.map((file) => ({
    file,
    lines: countLines(join(ROOT, file)),
  }))
  const coreSinglesLines = coreSingles.reduce((sum, item) => sum + item.lines, 0)

  const allNames = SCRIPTS.flatMap(({ file }) => extractAssertionNames(join(ROOT, file)))
  const negativeNames = allNames.filter((name) => NEGATIVE_TOKENS.some((token) => name.includes(token)))
  // 精确口径：新增断言按 `[neg]` / `[edge]` 前缀自声明，不再依赖关键词猜测。
  const prefixed = {
    neg: allNames.filter((name) => name.startsWith('[neg]')).length,
    edge: allNames.filter((name) => name.startsWith('[edge]')).length,
  }
  prefixed.total = prefixed.neg + prefixed.edge

  const density = coreLines ? Number(((assertions / coreLines) * 100).toFixed(2)) : null
  const densitySingles = coreSinglesLines
    ? Number(((assertions / coreSinglesLines) * 100).toFixed(2))
    : null
  const prefixedRatio = assertions ? Number(((prefixed.total / assertions) * 100).toFixed(1)) : null
  const actual = { assertions, appContextLines, coreLines, coreSinglesLines, density, densitySingles }

  const gate = gateTiming(assertions)
  const statusClaims = handoverStatusClaims({ ...actual, prefixedRatio }, gate)

  return {
    collectedAt: new Date().toISOString(),
    assertions,
    density,
    densitySingles,
    rows,
    runtimeCoverage: `${runtimeRows}/${rows.length}`,
    core,
    coreLines,
    coreSingles,
    coreSinglesLines,
    appContextLines,
    untracked: gitUntracked(),
    dist: distStats(),
    negative: {
      sampled: allNames.length,
      matched: negativeNames.length,
      ratio: allNames.length ? Number(((negativeNames.length / allNames.length) * 100).toFixed(1)) : null,
      prefixed,
      prefixedRatio,
      note: '静态断言名称启发式统计，模板串与循环展开未计入；仅作趋势参考',
    },
    docClaims: docClaims(actual),
    statusClaims,
    gateTiming: gate,
    pending: ['单次典型操作重算次数（需 I-05 渲染探针）'],
  }
}

function toMarkdown(data) {
  const lines = []
  lines.push('# 基线表（自动采集）')
  lines.push('')
  lines.push(`- 采集时间：${data.collectedAt}`)
  lines.push(`- 采集脚本：\`tools/collect-baseline.mjs\`（零依赖、只读）`)
  lines.push(`- 断言口径：运行时真值（各脚本 \`report.json\` 的 \`total\`），覆盖率 ${data.runtimeCoverage}`)
  lines.push('')
  lines.push('## A. 断言规模')
  lines.push('')
  lines.push('| 脚本 | 静态调用点 | 运行时总数 | 通过 | 证据时间 | 口径 |')
  lines.push('|---|---|---|---|---|---|')
  for (const row of data.rows) {
    lines.push(
      `| \`${row.file}\` | ${row.staticSites} | ${row.total ?? '—'} | ${row.passed ?? '—'} | ${
        row.checkedAt ? row.checkedAt.slice(0, 19).replace('T', ' ') : '—'
      } | ${row.source} |`,
    )
  }
  lines.push(`| **合计** | **${data.rows.reduce((s, r) => s + r.staticSites, 0)}** | **${data.assertions}** | — | — | — |`)
  lines.push('')
  lines.push('## B. 核心代码规模与密度')
  lines.push('')
  lines.push(`- 口径 A（全量核心模块，src/context + src/data + src/aplus + src/selectors）：**${data.coreLines} 行**`)
  lines.push(`  - 断言密度 A：**${data.density} 条 / 百行**（${data.assertions} ÷ ${data.coreLines}）`)
  lines.push(`- 口径 B（四个核心单点）：**${data.coreSinglesLines} 行**`)
  lines.push(`  - 断言密度 B：**${data.densitySingles} 条 / 百行**（${data.assertions} ÷ ${data.coreSinglesLines}）`)
  lines.push('')
  lines.push('> 口径说明：v1.0 方案记录的 3.3 条/百行接近口径 B。两种口径不可混用；本轮起以口径 A 为准，目标值须按同一分母重算。')
  lines.push('')
  lines.push('| 文件 | 行数 |')
  lines.push('|---|---|')
  for (const item of data.coreSingles) lines.push(`| \`${item.file}\` | ${item.lines} |`)
  lines.push('')
  lines.push('核心模块行数 Top 8：')
  lines.push('')
  lines.push('| 文件 | 行数 |')
  lines.push('|---|---|')
  for (const item of data.core.slice(0, 8)) lines.push(`| \`${item.file}\` | ${item.lines} |`)
  lines.push('')
  lines.push('## C. 工作区与产物')
  lines.push('')
  lines.push(`- 未跟踪文件：**${data.untracked.total ?? '—'}**（其中 \`tools/_*\` 调试脚本 ${data.untracked.scratch ?? '—'}；已排除 \`docs/metrics\`、\`docs/evidence\` 生成物 ${data.untracked.generated ?? '—'} 个）`)
  lines.push(`- dist 总量：**${fmtBytes(data.dist.total)}**；最大 chunk：\`${data.dist.largest?.name ?? '—'}\` ${fmtBytes(data.dist.largest?.size)}`)
  lines.push('')
  lines.push('## D. 负向/边界断言占比（参考值）')
  lines.push('')
  lines.push(
    `- 可识别断言名称 ${data.negative.sampled} 条，命中负向关键词 ${data.negative.matched} 条，占比 **${data.negative.ratio}%**`,
  )
  lines.push(
    `- 精确口径（前缀自声明）：\`[neg]\` ${data.negative.prefixed.neg} 条、\`[edge]\` ${data.negative.prefixed.edge} 条，合计 ${data.negative.prefixed.total} 条 / ${data.assertions} 条 = **${data.negative.prefixedRatio}%**`,
  )
  lines.push(
    `- 两口径差异说明：存量断言未加前缀，精确口径只覆盖新增用例；负向覆盖率的目标值以**精确口径**为准，启发式仅供趋势参考`,
  )
  lines.push(`- 说明：${data.negative.note}`)
  lines.push('')
  lines.push('## E. 文档—实现偏差')
  lines.push('')
  const currentClaims = data.docClaims.filter((claim) => claim.scope === 'current')
  const historicalClaims = data.docClaims.filter((claim) => claim.scope === 'historical')
  if (!currentClaims.length) {
    lines.push('- 当前状态类文档中未扫描到可核对的数字声明。')
  } else {
    lines.push('**契约文档（计入门禁）**')
    lines.push('')
    lines.push('| 类型 | 文件:行 | 声明值 | 实测值 | 结论 |')
    lines.push('|---|---|---|---|---|')
    for (const claim of currentClaims) {
      lines.push(
        `| ${claim.kind} | \`${claim.file}:${claim.line}\` | ${claim.claimed} | ${claim.actual} | ${
          claim.ok ? '一致' : '**偏差**'
        } |`,
      )
    }
  }
  lines.push('')
  const statusClaims = data.statusClaims ?? []
  if (statusClaims.length) {
    lines.push('**交接文档状态块（I-16，`docs/HANDOVER.md` §0.1，`CIP-STATUS` 标记之间）**')
    lines.push('')
    lines.push('| 指标 | 文件:行 | 声明值 | 实测值 | 结论 |')
    lines.push('|---|---|---|---|---|')
    for (const claim of statusClaims) {
      lines.push(
        `| ${claim.kind} | \`${claim.file}:${claim.line}\` | ${claim.claimed} | ${claim.actual ?? '—'} | ${
          claim.ok ? '一致' : '**偏差**'
        } |`,
      )
    }
    lines.push('')
  } else {
    lines.push('- 交接文档未写 `CIP-STATUS` 状态块（不判红；写了才比对）。')
    lines.push('')
  }
  lines.push(
    `历史流水类文档（P1–P10 记录、交接沿革）另有 ${historicalClaims.length} 处数字，其中 ${
      historicalClaims.filter((c) => !c.ok).length
    } 处与当前实测不同；按「历史记录不追改」处理，不计入偏差数。`,
  )
  lines.push('')
  lines.push('## F. 门禁耗时与待采集')
  lines.push('')
  if (data.gateTiming) {
    const g = data.gateTiming
    const totalSec = (g.totalMs / 1000).toFixed(1)
    const totalSeconds = Math.round(g.totalMs / 1000)
    const mm = Math.floor(totalSeconds / 60)
    const ss = totalSeconds % 60
    const mode = (g.concurrency ?? 1) > 1 ? `${g.scripts.length} 段并发（并发度 ${g.concurrency}）` : `${g.scripts.length} 段串行`
    lines.push(`- 全量门禁（${mode}，端到端墙钟）：**${totalSec} s**（约 ${mm} 分 ${ss} 秒），断言 **${g.totalAssertions}** 条全绿`)
    if (g.sumMs && (g.concurrency ?? 1) > 1) {
      lines.push(`- 各段耗时之和 **${(g.sumMs / 1000).toFixed(1)} s**；并发节省 **${((g.sumMs - g.totalMs) / 1000).toFixed(1)} s**（${Math.round(((g.sumMs - g.totalMs) / g.sumMs) * 100)}%）`)
    } else if (g.sumMs) {
      lines.push(`- 各段耗时之和 **${(g.sumMs / 1000).toFixed(1)} s**（串行口径，与墙钟之差仅为进程间调度开销）`)
    }
    lines.push(`- 环境：${g.machine}；基线 ${g.baseRevision}；base \`${g.base}\``)
    lines.push(`- 来源：\`tools/run-gate.mjs\` 实测并自动落盘（采集器只读，不自行启动浏览器）；被测面指纹 \`${g.surfaceHash ?? '未记录'}\``)
    if (g.dist) {
      const distNote = !g.dist.recorded
        ? '旧格式基线未记录，下一次全量门禁写入'
        : !g.dist.current
          ? 'dist/ 无产物，跳过'
          : g.dist.recorded === g.dist.current
            ? '一致'
            : '**不一致：耗时与断言结论不再对应当前 bundle**'
      lines.push(`- 产物配对（I-17）：记录 \`${g.dist.recorded ?? '未记录'}\` / 当前 \`${g.dist.current ?? '无产物'}\`（${distNote}）`)
    }
    if (g.evidence) {
      const evNote = g.evidence.hashMissing === g.evidence.total
        ? '旧格式基线未记录，下一次全量门禁写入'
        : g.evidence.unbound.length
          ? `**${g.evidence.unbound.length} 段不符：${g.evidence.unbound.join(', ')}**`
          : `一致（${g.runId ? `runId \`${g.runId}\`、` : ''}起始 ${g.gateStartAt ?? '未记录'}）`
      lines.push(`- 证据绑定（I-20）：${g.evidence.bound}/${g.evidence.total} 分片与本次门禁记录一致——${evNote}`)
    }
    if (g.tiers) {
      const b = g.tiers.budget
      const fastOk = g.tiers.fastMs <= b.fastMs
      const totalOk = g.totalMs <= b.totalMs
      const segOk = (g.tiers.slowest.ms ?? 0) <= b.segmentMs
      lines.push(
        `- 分档（I-15）：快检 **${(g.tiers.fastMs / 1000).toFixed(1)} s / ${b.fastMs / 1000} s**（前 ${g.tiers.fastCount} 段，余 ${((b.fastMs - g.tiers.fastMs) / 1000).toFixed(1)} s）｜全量 **${totalSec} s / ${b.totalMs / 1000} s**（余 ${((b.totalMs - g.totalMs) / 1000).toFixed(1)} s）｜单段最长 \`${g.tiers.slowest.file}\` **${((g.tiers.slowest.ms ?? 0) / 1000).toFixed(1)} s / ${b.segmentMs / 1000} s**${fastOk && totalOk && segOk ? '' : ' **（超预算）**'}`,
      )
    }
    lines.push('')
    lines.push('| 脚本 | 耗时 (s) | 断言 | 通过 |')
    lines.push('|---|---|---|---|')
    for (const row of g.scripts) {
      lines.push(`| \`${row.file}\` | ${(row.ms / 1000).toFixed(1)} | ${row.assertions} | ${row.passed} |`)
    }
    lines.push(`| **合计** | **${totalSec}** | **${g.totalAssertions}** | **${g.totalPassed}** |`)
    lines.push('')
    if (g.note) lines.push(`> 口径说明：${g.note}`)
    lines.push('')
    lines.push(`一致性校验（I-11，采集时 HEAD \`${g.head}\`）：**${g.consistent ? '全部通过' : '存在失败项'}**`)
    lines.push('')
    lines.push('| 校验项 | 结果 | 明细 |')
    lines.push('|---|---|---|')
    for (const item of g.checks) {
      lines.push(`| ${item.id} | ${item.ok ? '通过' : '**失败**'} | ${item.detail} |`)
    }
    lines.push('')
  } else {
    lines.push('- [ ] 全量门禁耗时（需 preview + 六段串行计时）')
  }
  for (const item of data.pending) lines.push(`- [ ] ${item}`)
  lines.push('')
  return `${lines.join('\n')}\n`
}

const args = new Set(process.argv.slice(2))
const data = collect()

if (args.has('--json')) {
  console.log(JSON.stringify(data, null, 2))
} else {
  const markdown = toMarkdown(data)
  if (args.has('--write')) {
    const target = OUT_DEFAULT
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, markdown, 'utf8')
    console.log(`已写入 ${relative(ROOT, target)}`)
  }
  console.log(markdown)
}

if (args.has('--strict')) {
  const drift = data.docClaims.filter((claim) => claim.scope === 'current' && !claim.ok)
  const statusFailed = (data.statusClaims ?? []).filter((claim) => !claim.ok)
  const timingFailed = (data.gateTiming?.checks ?? []).filter((item) => !item.ok)
  if (drift.length) {
    console.error(`\n[strict] 契约文档存在 ${drift.length} 处数字偏差：`)
    for (const claim of drift) {
      console.error(`  - ${claim.file}:${claim.line} ${claim.kind} 声明 ${claim.claimed} / 实测 ${claim.actual}`)
    }
  }
  if (statusFailed.length) {
    console.error(`\n[strict] 交接文档状态块存在 ${statusFailed.length} 处偏差（I-16）：`)
    for (const claim of statusFailed) {
      console.error(`  - ${claim.file}:${claim.line} ${claim.kind} 声明 ${claim.claimed} / 实测 ${claim.actual ?? '—'}`)
    }
  }
  if (timingFailed.length) {
    console.error(`\n[strict] 门禁耗时基线存在 ${timingFailed.length} 处不一致：`)
    for (const item of timingFailed) console.error(`  - ${item.id}：${item.detail}`)
  }
  if (drift.length || statusFailed.length || timingFailed.length) {
    process.exitCode = 1
  } else {
    console.log('\n[strict] 契约文档数字、交接状态块与门禁耗时基线均一致。')
  }
}
