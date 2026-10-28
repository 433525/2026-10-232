#!/usr/bin/env node
/**
 * audit-reachability-refs.mjs — 可达性矩阵「覆盖断言」列的引用审计（I-18 + I-19）。
 *
 * 解决的问题：`docs/delivery/reachability.md` 用 `comm#8` 这类**位置下标**指向
 * `docs/evidence/<slug>/report.json` 的 `results` 数组。下标不带名称，一旦某段
 * 前部插入断言，后面所有引用整体位移，而文档读起来毫无破绽——它照样写着
 * 「comm#8 点赞往返」，只是 comm#8 已经变成别的断言。2026-10-28 实测：
 * 132 处引用中 45 行指向了错误的断言、1 处越界（`p0#12`，该段只有 12 条），
 * 而 M4「52/52 covered」正是靠这一列取证的。
 *
 * I-18 修的是**那一次**（逐行重排下标），I-19 修的是**这一类**：每个引用后面
 * 盖一个 4 位十六进制**校验位** `comm#8@3f2a`，取值是该下标当前断言名的
 * sha256 前 4 位。下标仍是人的阅读锚点，校验位则把「下标指向的名称」写进了
 * 文档本身——只要某段前部插入/删除/重排断言，受影响的每一处引用当场失配，
 * 并打印出「期望名称 vs 实际名称」，不必等下一次全表人工复核。
 *
 * 本工具做**可机判**的三件事：
 *   1. 每个引用是否越界（下标 ≥ 该段断言数）；
 *   2. 校验位与当前断言名是否相符（失配即判失败，打印两侧名称）；
 *   3. 是否存在未盖章的引用（新增行忘记 `--stamp`，判失败并提示）。
 * 另对「同一前缀同一下标被两个动作行同时引用」仅作提示，不判失败——
 * `comm#10`「刷新后保持」同时支撑点赞与收藏是合法复用。
 *
 * 刻意**不**做的事：判断「这个下标指向的断言是否真的在验证该动作」。那需要语义
 * 判断，机器给不出；用盖章冒充它，只会制造「门禁没报就是对的」的假信心。
 * 盖章只保证「你当初选的那条断言没被换掉」，语义层仍须人工过一遍 `--list`
 * 的全表（30 秒）。
 *
 * 用法：
 *   node tools/audit-reachability-refs.mjs          # 表格 + 越界/失配/未盖章即退出码 1
 *   node tools/audit-reachability-refs.mjs --list   # 只列引用，不判失败（人工复核用）
 *   node tools/audit-reachability-refs.mjs --stamp  # 按当前 report.json 重写全部校验位
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const DOC = join(ROOT, 'docs', 'delivery', 'reachability.md')

/** 前缀 → 证据目录（目录名与脚本名不同：`dual` 的目录是 `dual-entry`）。 */
const SOURCES = {
  comm: 'community-flow',
  acc: 'acceptance',
  rec: 'recovery',
  p0: 'p0-gaps',
  aplus: 'aplus-flow',
  dual: 'dual-entry',
  fix: null, // 由 fixes-a + fixes-b 顺序拼接，见下
}

function loadNames() {
  const names = {}
  for (const [prefix, slug] of Object.entries(SOURCES)) {
    if (slug) {
      const file = join(ROOT, 'docs', 'evidence', slug, 'report.json')
      if (!existsSync(file)) {
        console.error(`[缺证据] ${file} 不存在，无法审计 ${prefix}#n`)
        process.exit(3)
      }
      names[prefix] = JSON.parse(readFileSync(file, 'utf8')).results.map((item) => item.name)
    }
  }
  const parts = ['fixes-a', 'fixes-b'].map((slug) => {
    const file = join(ROOT, 'docs', 'evidence', slug, 'report.json')
    if (!existsSync(file)) {
      console.error(`[缺证据] ${file} 不存在，无法审计 fix#n`)
      process.exit(3)
    }
    return JSON.parse(readFileSync(file, 'utf8')).results
  })
  names.fix = parts.flat().map((item) => item.name)
  return names
}

/** 断言名 → 4 位校验位。取 sha256 前 4 位十六进制，132 处引用的偶然碰撞概率约 0.2%。 */
const stampOf = (name) => createHash('sha256').update(name, 'utf8').digest('hex').slice(0, 4)

const names = loadNames()
const doc = readFileSync(DOC, 'utf8').split('\n')
const PREFIX = 'comm|acc|rec|p0|aplus|dual|fix'
/**
 * 区间写法 `comm#5`–`#8` 的终点是**裸下标**（不带前缀），若只匹配 `前缀#n` 形式，
 * 起点越界会被发现、终点越界会被静默放过——这正是首版漏掉 `p0#10`–`#12` 的原因
 * （该段只有 12 条，终点 #12 已越界）。先把区间整体吃掉，再扫单点。
 * I-19 起校验位可省略（`@xxxx`），以便工具先于盖章落地、且不拒绝对旧文档的读取。
 */
const RANGE = new RegExp(
  `\`(${PREFIX})#(\\d+)(?:@([0-9a-f]{4}))?\`–\`#(\\d+)(?:@([0-9a-f]{4}))?\``,
  'g',
)
const SINGLE = new RegExp(`\`(${PREFIX})#(\\d+)(?:@([0-9a-f]{4}))?\``, 'g')

if (process.argv.includes('--stamp')) {
  let changed = 0
  let refs = 0
  const out = doc.map((line) => {
    // 只改表格行，正文举例（如「另 1 处越界：p0#12」）不盖章，否则会把举例变成引用。
    if (!line.startsWith('|')) return line
    // 区间先整体重写：两端各盖一次章，终点补回前缀以外的 `#n@xxxx` 形式。
    let next = line.replace(RANGE, (whole, prefix, from, _s1, to) => {
      const a = names[prefix]?.[Number(from)]
      const b = names[prefix]?.[Number(to)]
      if (!a || !b) return whole // 越界不盖章，留给审计模式报错
      refs += 2
      return `\`${prefix}#${from}@${stampOf(a)}\`–\`#${to}@${stampOf(b)}\``
    })
    // 再处理单点。区间起点会被这里重复匹配，重建结果与上一步逐字节相同，幂等。
    next = next.replace(SINGLE, (whole, prefix, at) => {
      const name = names[prefix]?.[Number(at)]
      if (!name) return whole
      refs += 1
      return `\`${prefix}#${at}@${stampOf(name)}\``
    })
    if (next !== line) changed += 1
    return next
  })
  writeFileSync(DOC, out.join('\n'), 'utf8')
  console.log(`[stamp] 处理引用 ${refs} 处，改写行 ${changed} 行：${DOC}`)
  process.exit(0)
}

const rows = []
doc.forEach((line, index) => {
  // 只扫表格行：正文举例（如「另 1 处越界：p0#12」）也带反引号，若不限表格会被当成引用，
  // 制造自指的假越界——首版实测即误报了两处正文。
  if (!line.startsWith('|')) return
  const cells = line.split('|')
  const rowId = (cells[1] ?? '').trim()
  const push = (prefix, at, sum) => {
    const name = names[prefix][Number(at)] ?? null
    rows.push({
      line: index + 1,
      rowId,
      prefix,
      at: Number(at),
      ok: Boolean(name),
      name,
      sum: sum ?? null,
      expect: name ? stampOf(name) : null,
    })
  }

  const rest = line.replace(RANGE, (_whole, prefix, from, s1, to, s2) => {
    push(prefix, from, s1)
    push(prefix, to, s2)
    return '\0' // 占位，防止单点正则重复计入区间两端
  })
  for (const ref of rest.matchAll(SINGLE)) push(ref[1], ref[2], ref[3])
})

const seen = new Map()
for (const row of rows) {
  if (!row.ok) continue
  const key = `${row.prefix}#${row.at}`
  const owners = seen.get(key) ?? new Set()
  owners.add(row.rowId)
  seen.set(key, owners)
}

const list = process.argv.includes('--list')
let broken = 0
let drifted = 0
let bare = 0
for (const row of rows) {
  const key = `${row.prefix}#${row.at}`
  const owners = seen.get(key)
  const shared = owners && owners.size > 1 ? `（共用：${[...owners].join(' / ')}）` : ''
  let state = 'OK  '
  let note = ''
  if (!row.ok) {
    state = '越界'
    broken += 1
  } else if (!row.sum) {
    state = '未盖章'
    bare += 1
  } else if (row.sum !== row.expect) {
    state = '失配'
    drifted += 1
    note = `　← 声明 @${row.sum}，当前为「${row.name}」@${row.expect}`
  }
  const text = `${state} L${String(row.line).padStart(3)} ${row.rowId.padEnd(6)} ${key.padEnd(9)} ${row.name ?? '——该段无此下标——'}${shared}${note}`
  if (list || state !== 'OK  ') console.log(text)
}

const fail = broken + drifted + bare
console.log(
  `\n引用 ${rows.length} 处：越界 ${broken}、校验位失配 ${drifted}、未盖章 ${bare}` +
    `${list ? '（--list 不判失败）' : ''}。`,
)
if (bare) console.log('未盖章的引用请运行 `node tools/audit-reachability-refs.mjs --stamp` 后复核差异。')
if (fail && !list) process.exit(1)
