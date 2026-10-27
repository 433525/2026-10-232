/**
 * measure-recompute.mjs — M6「典型操作重算次数」的独立测量工具（CIP-232 / I-05 S2）。
 *
 * 定位（D-29）：这是测量工具，不是验收脚本。不进入 `tools/run-gate.mjs` 的八段门禁、
 * 不计入 M1 的规模口径、不被 `collect-baseline.mjs --strict` 校验，也不写 `gate-timing.json`。
 * 设计依据：`docs/delivery/probe-design.md`（§三 结构 / §四 协议 / §五 判据）。
 *
 * 为什么现在还不能直接产出 M6 读数：
 *   计数来自 `?probe=1` 探针（S1），而 S1 要改 `src/`，受 D-04 约束需人工值守窗口。
 *   探针不存在时，六个操作的 `act`/`done` 无处校准，硬写只会得到「看起来有效、
 *   实际操作错位」的读数——那比没有读数更糟。故 S2 先交三件可独立验证的事：
 *     1. 统计核心（`--self-test`，34 项离线用例，零依赖、不开浏览器）；
 *     2. 探针契约检查（`--probe-check`，未挂载即 fail-closed，S1 落地后即其验收手段）；
 *     3. 采样循环（`--harness-test`，合成探针跑通 reset → act → settle → snapshot → 中位数）。
 *   六个真实操作留待 S3 校准；`--run` 会列出未校准项并拒绝执行。
 *
 * 用法：
 *   node tools/measure-recompute.mjs --self-test      # 离线自检，无需服务与浏览器
 *   node tools/measure-recompute.mjs --list           # 打出操作登记表与校准状态
 *   node tools/measure-recompute.mjs --probe-check    # 需 `vite preview` 已在 5180
 *   node tools/measure-recompute.mjs --harness-test   # 合成探针，验证采样循环
 *   node tools/measure-recompute.mjs --run            # 需 S1 探针 + S3 校准
 *
 * 退出码：0 通过｜1 用例或契约失败｜2 用法错误｜3 前置缺失（探针未挂载 / 操作未校准）
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CDPConnection, evaluate, launchChrome, navigate, setViewport } from './lib/cdp.mjs'

const BASE = process.env.BASE_URL ?? 'http://localhost:5180'
const EVIDENCE_DIR = join(process.cwd(), 'docs', 'evidence', 'probe')

/** 探针的六个计数键（probe-design §3.1）。顺序即输出顺序。 */
export const PROBE_KEYS = Object.freeze([
  'computed:eval',
  'store:emit',
  'store:flush',
  'projection:community',
  'render:b',
  'render:aplus',
])

/** M6 分子只取这两个键；`render:*` 单列参考（§五）。 */
export const M6_KEYS = Object.freeze(['computed:eval', 'projection:community'])

const STABILITY_LIMIT = 0.1
const SETTLE_MS = 200
const WARMUP = 1
const ROUNDS = 3

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ───────────────────────────── 统计核心（纯函数） ─────────────────────────────

/** 中位数。偶数个取两中值均值；空数组与非数值一律抛错，避免 NaN 悄悄进读数。 */
export function median(values) {
  if (!Array.isArray(values) || values.length === 0) throw new Error('median 需要非空数组')
  for (const value of values) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`median 收到非数值：${value}`)
  }
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * 极差比 =(max−min)/中位数。分母用中位数而非均值：一轮离群会把均值拉偏，把「抖动」说小。
 * 中位数为 0 时：全零返回 0，否则返回 Infinity（由调用方判为不稳定）。
 */
export function spreadRatio(values) {
  const center = median(values)
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (center === 0) return max === 0 ? 0 : Number.POSITIVE_INFINITY
  return (max - min) / center
}

/**
 * 两次快照之差。缺键按 0 处理（探针约定「未发生的键不出现」），
 * 但**负差即抛错**：计数器单调，出现负数说明 reset 位置错了或被重载清零，
 * 这类读数必须作废而不是取绝对值。
 */
export function deltaSnapshot(before, after) {
  const left = before ?? {}
  const right = after ?? {}
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])]
  const delta = {}
  for (const key of keys) {
    const from = left[key] ?? 0
    const to = right[key] ?? 0
    if (typeof from !== 'number' || typeof to !== 'number' || !Number.isFinite(from) || !Number.isFinite(to)) {
      throw new Error(`deltaSnapshot 非数值：${key} ${from} → ${to}`)
    }
    if (to < from) throw new Error(`deltaSnapshot 计数器回退：${key} ${from} → ${to}`)
    delta[key] = to - from
  }
  return delta
}

/**
 * 多轮聚合。单轮时 `stable` 返回 null 而非 true——「没有重复就没有稳定性证据」，
 * 这条区分是本工具存在的理由之一：静默返回 true 会让不可重复的操作伪装成已复核。
 */
export function aggregateRounds(rounds) {
  if (!Array.isArray(rounds) || rounds.length === 0) throw new Error('aggregateRounds 至少需要一轮')
  const keys = [...new Set(rounds.flatMap((round) => Object.keys(round)))].sort()
  const medians = {}
  const spreads = {}
  const rawSpreads = {}
  for (const key of keys) {
    const values = rounds.map((round) => round[key] ?? 0)
    medians[key] = median(values)
    rawSpreads[key] = spreadRatio(values)
    spreads[key] = Number.isFinite(rawSpreads[key]) ? Number(rawSpreads[key].toFixed(3)) : null
  }
  const stable = rounds.length < 2 ? null : keys.every((key) => rawSpreads[key] <= STABILITY_LIMIT)
  return { roundCount: rounds.length, median: medians, spread: spreads, stable }
}

/** M6 分子：只加 `computed:eval` 与 `projection:community`。 */
export function m6Score(delta) {
  return M6_KEYS.reduce((sum, key) => sum + (delta?.[key] ?? 0), 0)
}

/** 校验探针返回值：键必须在白名单内、值必须是非负有限数；缺键合法。 */
export function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('snapshot() 未返回普通对象')
  }
  const clean = {}
  for (const [key, value] of Object.entries(snapshot)) {
    if (!PROBE_KEYS.includes(key)) throw new Error(`snapshot 未知计数键：${key}`)
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`snapshot 计数键 ${key} 的值非法：${value}`)
    }
    clean[key] = value
  }
  return clean
}

// ───────────────────────────── 操作登记表 ─────────────────────────────

/**
 * probe-design §四 的六个操作。相对原文补了一列 `repeat`——原文对每个操作都写
 * 「连续 3 轮」，但四个操作并不幂等：点赞是 toggle（第二轮会取消）、接单只能发生
 * 一次、发帖与登记每轮都会新增记录。直接 3 轮会把「状态已变」读成「重算抖动」，
 * 故按操作标注重复方式：
 *   'none'   同页可重复，轮间只需 reset 探针；
 *   'reload' 每轮前重载重建前置状态（注意：身份不随存档持久化，重载后须重选身份，W3 已证）。
 *
 * `act` / `done` 为 null 表示尚未在真实 UI 上校准（S3）。`--run` 只接受 calibrated 项。
 */
export const OPS = [
  {
    id: 'b-community',
    label: 'B 端切到社区页',
    path: '/?probe=1&tab=community',
    repeat: 'reload',
    calibrated: false,
    act: null,
    done: null,
    note: '进入页面本身即操作；重载可重复，导航后 reset 再取基线',
  },
  {
    id: 'b-like',
    label: '点赞一次',
    path: '/?probe=1&tab=community',
    repeat: 'reload',
    calibrated: false,
    act: null,
    done: null,
    note: '点赞是 toggle，同页第二轮会取消（W3 已证），必须每轮重载并重选身份',
  },
  {
    id: 'b-publish',
    label: '发帖一次',
    path: '/?probe=1&tab=community',
    repeat: 'none',
    calibrated: false,
    act: null,
    done: null,
    note: '每轮新增记录，可同页重复；标题须带轮次后缀避免撞唯一性',
  },
  {
    id: 'b-accept',
    label: '接单一次',
    path: '/?probe=1&tab=orders',
    repeat: 'reload',
    calibrated: false,
    act: null,
    done: null,
    note: '订单状态单向流转，同页无法重复接单，只能重载换新单',
  },
  {
    id: 'aplus-filter',
    label: 'A+ 切换筛选至高危',
    path: '/aplus.html?probe=1',
    repeat: 'none',
    calibrated: false,
    act: null,
    done: null,
    note: '筛选可来回切换，同页重复安全；A+ 侧是 M6 的主要可减空间',
  },
  {
    id: 'aplus-create',
    label: 'A+ 提交登记',
    path: '/aplus.html?probe=1',
    repeat: 'none',
    calibrated: false,
    act: null,
    done: null,
    note: '每轮新增记录，可同页重复；须先满足合成确认与暂停态前置',
  },
]

// ───────────────────────────── 离线自检 ─────────────────────────────

function runSelfTest() {
  const rows = []
  const eq = (name, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected)
    rows.push({ name, ok, detail: ok ? '' : `期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}` })
  }
  const near = (name, actual, expected) => {
    const ok = Math.abs(actual - expected) < 1e-9
    rows.push({ name, ok, detail: ok ? '' : `期望 ${expected}，实际 ${actual}` })
  }
  const exact = (name, actual, expected) => {
    const ok = Object.is(actual, expected)
    rows.push({ name, ok, detail: ok ? '' : `期望 ${String(expected)}，实际 ${String(actual)}` })
  }
  const throws = (name, fn, pattern) => {
    try {
      fn()
      rows.push({ name, ok: false, detail: '未抛错' })
    } catch (error) {
      const ok = !pattern || pattern.test(String(error.message))
      rows.push({ name, ok, detail: ok ? '' : `抛错信息不符：${error.message}` })
    }
  }

  // median
  near('median 奇数取中位', median([3, 1, 2]), 2)
  near('median 偶数取两中值均值（防「取上中位」）', median([4, 1, 3, 2]), 2.5)
  near('median 单元素', median([7]), 7)
  const input = [5, 1, 9]
  median(input)
  eq('median 不修改入参', input, [5, 1, 9])
  throws('median 空数组抛错', () => median([]), /非空/)
  throws('median 非数值抛错', () => median([1, '2']), /非数值/)

  // spreadRatio
  near('spreadRatio 全相同为 0', spreadRatio([100, 100, 100]), 0)
  near('spreadRatio 常规极差比', spreadRatio([80, 100, 120]), 0.4)
  near('spreadRatio 全零不为 NaN', spreadRatio([0, 0, 0]), 0)
  exact('spreadRatio 中位为零且有非零 → Infinity', spreadRatio([0, 0, 5]), Number.POSITIVE_INFINITY)
  near('spreadRatio 分母取中位数而非均值', spreadRatio([100, 100, 121]), 0.21)

  // deltaSnapshot
  eq('deltaSnapshot 新增键按 0 起算', deltaSnapshot({ 'store:emit': 1 }, { 'store:emit': 4, 'computed:eval': 9 }), {
    'store:emit': 3,
    'computed:eval': 9,
  })
  eq('deltaSnapshot 零差保留键', deltaSnapshot({ 'store:emit': 2 }, { 'store:emit': 2 }), { 'store:emit': 0 })
  throws('deltaSnapshot 计数器回退抛错', () => deltaSnapshot({ 'computed:eval': 5 }, { 'computed:eval': 3 }), /回退/)
  throws('deltaSnapshot 键消失按回退处理', () => deltaSnapshot({ 'computed:eval': 5 }, {}), /回退/)
  throws('deltaSnapshot 非数值抛错', () => deltaSnapshot({ 'computed:eval': 1 }, { 'computed:eval': '4' }), /非数值/)

  // aggregateRounds
  const median3 = aggregateRounds([{ 'computed:eval': 8 }, { 'computed:eval': 9 }, { 'computed:eval': 10 }])
  eq('aggregateRounds 三轮取中位（不是均值 9）', median3.median, { 'computed:eval': 9 })
  eq('aggregateRounds 22% 极差判为不稳定', median3.stable, false)
  eq(
    'aggregateRounds 5% 抖动判为稳定',
    aggregateRounds([{ 'computed:eval': 100 }, { 'computed:eval': 100 }, { 'computed:eval': 105 }]).stable,
    true,
  )
  eq('aggregateRounds 单轮不判定稳定（返回 null）', aggregateRounds([{ 'computed:eval': 12 }]).stable, null)
  eq(
    'aggregateRounds 12% 抖动判为不稳定',
    aggregateRounds([{ 'computed:eval': 100 }, { 'computed:eval': 112 }, { 'computed:eval': 106 }]).stable,
    false,
  )
  eq(
    'aggregateRounds 恰好 10% 判为稳定（边界含等号）',
    aggregateRounds([{ 'computed:eval': 100 }, { 'computed:eval': 110 }, { 'computed:eval': 100 }]).stable,
    true,
  )
  const zeroMedian = aggregateRounds([{ 'computed:eval': 0 }, { 'computed:eval': 0 }, { 'computed:eval': 5 }])
  eq('aggregateRounds 中位为零的抖动判为不稳定', zeroMedian.stable, false)
  eq('aggregateRounds 无穷极差写为 null（JSON 友好）', zeroMedian.spread, { 'computed:eval': null })
  throws('aggregateRounds 空入参抛错', () => aggregateRounds([]), /至少/)

  // m6Score
  eq(
    'm6Score 只计 computed:eval 与 projection:community',
    m6Score({ 'computed:eval': 7, 'projection:community': 2, 'render:b': 30, 'store:emit': 9 }),
    9,
  )
  eq('m6Score 缺键按 0', m6Score({ 'render:b': 30 }), 0)

  // validateSnapshot
  eq('validateSnapshot 接受缺键（未发生的键不出现）', validateSnapshot({ 'computed:eval': 3 }), { 'computed:eval': 3 })
  throws('validateSnapshot 拒绝未知键', () => validateSnapshot({ foo: 1 }), /未知计数键/)
  throws('validateSnapshot 拒绝负值', () => validateSnapshot({ 'computed:eval': -1 }), /非法/)

  // 登记表自洽
  const ids = OPS.map((op) => op.id)
  eq('OPS id 唯一', ids.length, new Set(ids).size)
  eq('OPS 数量与 probe-design §四 的六个操作一致', ids.length, 6)
  eq(
    'OPS 未校准项不得留半截 act',
    OPS.filter((op) => !op.calibrated).every((op) => op.act === null && op.done === null),
    true,
  )
  eq('OPS repeat 取值合法', OPS.every((op) => op.repeat === 'none' || op.repeat === 'reload'), true)

  for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'}  ${row.name}${row.detail ? ` — ${row.detail}` : ''}`)
  const failed = rows.filter((row) => !row.ok)
  console.log(`\n自检 ${rows.length - failed.length}/${rows.length} 通过`)
  return failed.length === 0
}

// ───────────────────────────── 采样循环 ─────────────────────────────

async function readSnapshot(session) {
  const raw = await evaluate(
    session,
    `(() => {
      const probe = window.__CIP_PROBE__
      if (!probe || typeof probe.snapshot !== 'function') return null
      return probe.snapshot()
    })()`,
  )
  if (!raw || typeof raw !== 'object') throw new Error('探针未挂载或 snapshot() 未返回对象')
  return validateSnapshot(raw)
}

async function waitFor(session, expression, timeoutMs = 8000) {
  if (!expression) return
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if ((await evaluate(session, `Boolean(${expression})`)) === true) return
    await delay(100)
  }
  throw new Error(`操作未在 ${timeoutMs} ms 内完成：${expression}`)
}

/** 双 rAF + 静置：等渲染与订阅回调收敛，再取快照。固定等待在 CPU 争用下会不足（D-14）。 */
async function settle(session, ms) {
  await evaluate(
    session,
    `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, ${ms}))))`,
  )
}

async function measureOps(session, ops, options) {
  const { rounds, warmup, settleMs } = options
  const report = []
  for (const op of ops) {
    const collected = []
    for (let cycle = 0; cycle < rounds + warmup; cycle += 1) {
      if (op.repeat === 'reload') {
        await navigate(session, `${BASE}${op.path}`)
        if (op.setup) await evaluate(session, op.setup)
      }
      await evaluate(session, 'window.__CIP_PROBE__.reset()')
      const before = await readSnapshot(session)
      await evaluate(session, op.act ?? 'void 0')
      await waitFor(session, op.done)
      await settle(session, settleMs)
      const after = await readSnapshot(session)
      const delta = deltaSnapshot(before, after)
      if (cycle >= warmup) collected.push(delta)
    }
    const aggregate = aggregateRounds(collected)
    report.push({ id: op.id, label: op.label, repeat: op.repeat, ...aggregate, m6: m6Score(aggregate.median) })
  }
  return report
}

// ───────────────────────────── 探针契约检查 ─────────────────────────────

/** 返回退出码：3 = 探针未落地（前置缺失）；1 = 契约不符；0 = 通过。 */
async function probeCheck(session) {
  const rows = []
  const record = (name, ok, detail = '') => {
    rows.push({ name, ok, detail })
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  }

  await navigate(session, `${BASE}/`)
  const quiet = await evaluate(session, 'typeof window.__CIP_PROBE__')
  record('默认不启用：不带 ?probe=1 时不挂载全局', quiet === 'undefined', `typeof = ${quiet}`)

  await navigate(session, `${BASE}/?probe=1`)
  const shape = await evaluate(
    session,
    `(() => {
      const probe = window.__CIP_PROBE__
      if (!probe) return { mounted: false }
      return {
        mounted: true,
        enabled: probe.enabled === true,
        hasReset: typeof probe.reset === 'function',
        hasSnapshot: typeof probe.snapshot === 'function',
      }
    })()`,
  )
  if (!shape?.mounted) {
    record('?probe=1 挂载 window.__CIP_PROBE__', false, '未挂载 —— S1 尚未落地')
    console.log('\n前置缺失：探针不存在，契约检查无法进行（退出码 3）')
    return 3
  }
  record('?probe=1 挂载 window.__CIP_PROBE__', true)
  record('enabled 为 true', shape.enabled === true)
  record('reset / snapshot 均为函数', shape.hasReset && shape.hasSnapshot)

  await evaluate(session, 'window.__CIP_PROBE__.reset()')
  const zeroed = await readSnapshot(session).catch((error) => ({ error: String(error.message) }))
  if (zeroed.error) {
    record('reset 后 snapshot 可读且键合法', false, zeroed.error)
  } else {
    const entries = Object.entries(zeroed)
    record('reset 后 snapshot 可读且键合法', true, `键 ${entries.length} 个`)
    record('reset 后全部计数归零', entries.every(([, value]) => value === 0), JSON.stringify(zeroed))
  }

  await navigate(session, `${BASE}/?probe=1&tab=community`)
  const coexist = await evaluate(session, 'Boolean(window.__CIP_PROBE__) && location.search.includes("tab=community")')
  record('?probe=1 与 ?tab= 共存（切页签不丢失）', coexist === true)

  await navigate(session, `${BASE}/aplus.html?probe=1`)
  const aplus = await evaluate(session, 'typeof window.__CIP_PROBE__ === "object" && window.__CIP_PROBE__ !== null')
  record('A+ 入口同样挂载（?probe=1）', aplus === true)

  const failed = rows.filter((row) => !row.ok)
  console.log(`\n契约检查 ${rows.length - failed.length}/${rows.length} 通过`)
  return failed.length === 0 ? 0 : 1
}

// ───────────────────────────── 采样循环自检（合成探针） ─────────────────────────────

const SYNTHETIC_PROBE = `(() => {
  const keys = ${JSON.stringify(PROBE_KEYS)}
  const zero = () => Object.fromEntries(keys.map((key) => [key, 0]))
  let counts = zero()
  let running = true
  const tick = () => {
    if (!running) return
    counts['computed:eval'] += 3
    counts['render:b'] += 1
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  window.__CIP_PROBE__ = {
    enabled: true,
    reset() { counts = zero() },
    snapshot() { return { ...counts } },
    stop() { running = false },
  }
  return true
})()`

async function harnessTest(session) {
  const rows = []
  const record = (name, ok, detail = '') => {
    rows.push({ name, ok, detail })
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  }

  await navigate(session, `${BASE}/`)
  await evaluate(session, SYNTHETIC_PROBE)
  const op = {
    id: '__synthetic',
    label: '采样循环自检（合成探针）',
    path: '/',
    repeat: 'none',
    calibrated: true,
    act: 'void 0',
    done: 'true',
  }

  let report
  try {
    report = await measureOps(session, [op], { rounds: ROUNDS, warmup: WARMUP, settleMs: 60 })
  } catch (error) {
    record('采样循环可跑通', false, String(error.message))
    return 1
  }
  const result = report[0]
  record('采样循环可跑通并产出 1 个操作', report.length === 1)
  record(`丢弃首轮后保留 ${ROUNDS} 轮`, result.roundCount === ROUNDS, `实际 ${result.roundCount}`)
  const keysOk = result.roundCount > 0 && Object.keys(result.median).every((key) => PROBE_KEYS.includes(key))
  record('中位数键名全部在探针白名单内', keysOk, Object.keys(result.median).join(','))
  record('计数为正（rAF 期间确有累加）', (result.median['computed:eval'] ?? 0) > 0, String(result.median['computed:eval']))
  record('M6 分子等于两键之和', result.m6 === (result.median['computed:eval'] ?? 0) + (result.median['projection:community'] ?? 0))
  record('稳定性判定已执行（布尔或 null）', result.stable === true || result.stable === false || result.stable === null, String(result.stable))

  const failed = rows.filter((row) => !row.ok)
  console.log(`\n采样循环自检 ${rows.length - failed.length}/${rows.length} 通过`)
  return failed.length === 0 ? 0 : 1
}

// ───────────────────────────── 实测 ─────────────────────────────

async function runMeasurement(session) {
  const calibrated = OPS.filter((op) => op.calibrated)
  if (calibrated.length === 0) {
    console.error('无可执行操作：六个操作的 act/done 尚未在真实 UI 上校准（S3）。')
    console.error('已登记但未校准：')
    for (const op of OPS) console.error(`  - ${op.id}（${op.label}）：${op.note}`)
    console.error('\n前置缺失：先落 S1 探针，再按 S3 校准操作（退出码 3）')
    return 3
  }

  await navigate(session, `${BASE}${calibrated[0].path}`)
  const mounted = await evaluate(session, 'Boolean(window.__CIP_PROBE__)')
  if (!mounted) {
    console.error('前置缺失：?probe=1 未挂载探针（S1 未落地），退出码 3')
    return 3
  }

  const report = await measureOps(session, calibrated, { rounds: ROUNDS, warmup: WARMUP, settleMs: SETTLE_MS })
  const rev = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
  let surfaceHash = 'unknown'
  try {
    const timing = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'metrics', 'gate-timing.json'), 'utf8'))
    surfaceHash = timing.surfaceHash ?? 'unknown'
  } catch {
    // 缺 gate-timing 时仍允许落盘，只是无法判定读数是否对应当前源码。
  }

  mkdirSync(EVIDENCE_DIR, { recursive: true })
  const file = join(EVIDENCE_DIR, `${rev}.json`)
  writeFileSync(
    file,
    `${JSON.stringify(
      {
        rev,
        surfaceHash,
        measuredAt: new Date().toISOString(),
        machine: `${process.platform}-${process.arch} / Node ${process.version}`,
        base: BASE,
        rounds: ROUNDS,
        warmup: WARMUP,
        settleMs: SETTLE_MS,
        m6Keys: M6_KEYS,
        ops: report,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  for (const op of report) {
    const spread = op.spread['computed:eval']
    console.log(
      `  ${op.id.padEnd(14)} M6=${String(op.m6).padStart(4)}  computed:eval=${op.median['computed:eval'] ?? 0}  抖动=${spread === null ? '∞' : `${(spread * 100).toFixed(1)}%`}  ${op.stable === null ? '未复测' : op.stable ? '稳定' : '不稳定'}`,
    )
  }
  console.log(`\n已落盘：${file}`)
  return report.every((op) => op.stable !== false) ? 0 : 1
}

// ───────────────────────────── 入口 ─────────────────────────────

function printOps() {
  console.log('操作登记表（probe-design §四 + repeat 列）\n')
  for (const op of OPS) {
    console.log(`${op.calibrated ? '✓' : '·'} ${op.id.padEnd(14)} ${op.repeat.padEnd(7)} ${op.label}`)
    console.log(`  ${op.note}`)
  }
  const ready = OPS.filter((op) => op.calibrated).length
  console.log(`\n已校准 ${ready}/${OPS.length}；未校准项 act/done 为 null，--run 会拒绝执行。`)
}

function usage() {
  console.error('用法：node tools/measure-recompute.mjs [--self-test|--list|--probe-check|--harness-test|--run]')
}

async function main() {
  const mode = process.argv[2] ?? '--self-test'
  if (mode === '--self-test') {
    process.exitCode = runSelfTest() ? 0 : 1
    return
  }
  if (mode === '--list') {
    printOps()
    return
  }
  if (!['--probe-check', '--harness-test', '--run'].includes(mode)) {
    usage()
    process.exitCode = 2
    return
  }

  const chrome = await launchChrome({ port: 9362 })
  const connection = await new CDPConnection(chrome.version.webSocketDebuggerUrl).open()
  try {
    const page = await connection.newPage()
    await setViewport(page, 1440, 1000)
    if (mode === '--probe-check') process.exitCode = await probeCheck(page)
    else if (mode === '--harness-test') process.exitCode = await harnessTest(page)
    else process.exitCode = await runMeasurement(page)
  } finally {
    connection.close()
    await chrome.close()
  }
}

main().catch((error) => {
  console.error(`[measure-recompute] ${error.stack ?? error.message}`)
  process.exitCode = 1
})
