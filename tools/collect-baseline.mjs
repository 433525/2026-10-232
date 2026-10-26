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
 *   B 核心代码规模（src/context + src/data + src/aplus + src/selectors）
 *   C 断言密度（运行时断言数 ÷ 核心代码百行）
 *   D 工作区卫生（未跟踪文件数、调试脚本数）
 *   E 构建产物（dist 总量、最大 chunk）
 *   F 文档漂移（文档声明的断言数 / AppContext 行数 vs 实测）
 *   G 负向断言占比（启发式，静态扫描断言名称，标注为参考值）
 *
 * 用法：
 *   node tools/collect-baseline.mjs           # 打印 Markdown 表
 *   node tools/collect-baseline.mjs --json    # 打印 JSON
 *   node tools/collect-baseline.mjs --write   # 写入 docs/metrics/baseline.md
 *
 * 运行时项（不在本脚本自动采集，需另跑）：
 *   - 全量门禁耗时：启动 preview 后串行执行六段脚本并计时（脚本按序各自打印耗时）
 *   - 单次典型操作重算次数：需 I-05 渲染探针先落地，本脚本只登记为「待采集」
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

const ROOT = process.cwd()
const OUT_DEFAULT = join(ROOT, 'docs', 'metrics', 'baseline.md')

const SCRIPTS = [
  { slug: 'dual-entry', file: 'tools/check-dual-entry.mjs', label: '双入口' },
  { slug: 'aplus-flow', file: 'tools/check-aplus-flow.mjs', label: 'A+ 流程' },
  { slug: 'community-flow', file: 'tools/check-community-flow.mjs', label: '社区流程' },
  { slug: 'acceptance', file: 'tools/check-acceptance.mjs', label: '验收' },
  { slug: 'recovery', file: 'tools/check-recovery.mjs', label: '坏档恢复' },
  { slug: 'fixes', file: 'tools/check-fixes.mjs', label: '修复补测' },
]

const CORE_DIRS = ['src/context', 'src/data', 'src/aplus', 'src/selectors']
const CORE_EXT = new Set(['.ts', '.tsx'])

/** 四个核心单点文件：v1.0 方案计算密度时使用的分母口径（口径 B）。 */
const CORE_SINGLES = [
  'src/context/AppContext.tsx',
  'src/data/community/store.ts',
  'src/data/intake/store.ts',
  'src/aplus/workbench.ts',
]

/** 视为「当前状态声明」的文档：其余文档中的数字按历史流水处理，不计入偏差数。 */
const CURRENT_DOCS = ['docs/delivery/acceptance.md', 'docs/delivery/gap-report.md', 'README.md']

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
      checkedAt: json.checkedAt ?? null,
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

function gitUntracked() {
  try {
    const raw = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' })
    const lines = raw.split('\n').filter((line) => line.startsWith('??'))
    return {
      total: lines.length,
      scratch: lines.filter((line) => /tools[/\\]_/.test(line)).length,
    }
  } catch {
    return { total: null, scratch: null }
  }
}

/**
 * 门禁耗时：由 `docs/metrics/gate-timing.json` 提供（人工串行实测后落盘）。
 * 采集器本身只读、不启动浏览器，因此不自行计时，只做「有则填、无则待采集」。
 */
function gateTiming() {
  const path = join(ROOT, 'docs', 'metrics', 'gate-timing.json')
  if (!existsSync(path)) return null
  try {
    const json = JSON.parse(readText(path))
    if (typeof json.totalMs !== 'number' || !Array.isArray(json.scripts)) return null
    return json
  } catch {
    return null
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

  const actual = { assertions, appContextLines, coreLines }

  return {
    collectedAt: new Date().toISOString(),
    assertions,
    density: coreLines ? Number(((assertions / coreLines) * 100).toFixed(2)) : null,
    densitySingles: coreSinglesLines
      ? Number(((assertions / coreSinglesLines) * 100).toFixed(2))
      : null,
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
      prefixedRatio: assertions ? Number(((prefixed.total / assertions) * 100).toFixed(1)) : null,
      note: '静态断言名称启发式统计，模板串与循环展开未计入；仅作趋势参考',
    },
    docClaims: docClaims(actual),
    gateTiming: gateTiming(),
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
  lines.push(`- 未跟踪文件：**${data.untracked.total ?? '—'}**（其中 \`tools/_*\` 调试脚本 ${data.untracked.scratch ?? '—'}）`)
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
    const mm = Math.floor(g.totalMs / 60000)
    const ss = ((g.totalMs % 60000) / 1000).toFixed(0)
    lines.push(`- 全量门禁（六段串行，端到端墙钟）：**${totalSec} s**（约 ${mm} 分 ${ss} 秒），断言 **${g.totalAssertions}** 条全绿`)
    lines.push(`- 环境：${g.machine}；基线 ${g.baseRevision}；base \`${g.base}\``)
    lines.push(`- 来源：\`docs/metrics/gate-timing.json\`（人工实测落盘；采集器只读，不自行启动浏览器）`)
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
  if (drift.length) {
    console.error(`\n[strict] 契约文档存在 ${drift.length} 处数字偏差：`)
    for (const claim of drift) {
      console.error(`  - ${claim.file}:${claim.line} ${claim.kind} 声明 ${claim.claimed} / 实测 ${claim.actual}`)
    }
    process.exitCode = 1
  } else {
    console.log('\n[strict] 契约文档数字一致。')
  }
}
