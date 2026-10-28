#!/usr/bin/env node
/**
 * audit-reachability-refs.mjs — 可达性矩阵「覆盖断言」列的索引审计（I-18）。
 *
 * 解决的问题：`docs/delivery/reachability.md` 用 `comm#8` 这类**位置下标**指向
 * `docs/evidence/<slug>/report.json` 的 `results` 数组。下标不带名称，一旦某段
 * 前部插入断言，后面所有引用整体位移，而文档读起来毫无破绽——它照样写着
 * 「comm#8 点赞往返」，只是 comm#8 已经变成别的断言。2026-10-28 实测：
 * 120 处引用中 23 处指向了错误的断言、1 处越界（`p0#12`，该段只有 12 条），
 * 而 M4「52/52 covered」正是靠这一列取证的。
 *
 * 本工具只做**可机判**的两件事：
 *   1. 每个引用是否越界（下标 ≥ 该段断言数）；
 *   2. 同一前缀的同一下标是否被两个不同动作行同时引用（提示，不判失败——
 *      `comm#10`「刷新后保持」同时支撑点赞与收藏是合法复用）。
 *
 * 刻意**不**做的事：判断「这个下标指向的断言是否真的在验证该动作」。那需要语义
 * 判断，机器给不出；用越界检查冒充它，只会制造「门禁没报就是对的」的假信心。
 * 语义层仍须人工过一遍 `--list` 的全表（30 秒），这才是本工具的真正用法。
 *
 * 用法：
 *   node tools/audit-reachability-refs.mjs          # 表格 + 越界即退出码 1
 *   node tools/audit-reachability-refs.mjs --list   # 只列引用，不判失败（人工复核用）
 */
import { existsSync, readFileSync } from 'node:fs'
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

const names = loadNames()
const doc = readFileSync(DOC, 'utf8').split('\n')
const PREFIX = 'comm|acc|rec|p0|aplus|dual|fix'
/**
 * 区间写法 `comm#5`–`#8` 的终点是**裸下标**（不带前缀），若只匹配 `前缀#n` 形式，
 * 起点越界会被发现、终点越界会被静默放过——这正是首版漏掉 `p0#10`–`#12` 的原因
 * （该段只有 12 条，终点 #12 已越界）。先把区间整体吃掉，再扫单点。
 */
const RANGE = new RegExp(`\`(${PREFIX})#(\\d+)\`–\`#(\\d+)\``, 'g')
const SINGLE = new RegExp(`\`(${PREFIX})#(\\d+)\``, 'g')

const rows = []
doc.forEach((line, index) => {
  // 只扫表格行：正文举例（如「另 1 处越界：p0#12」）也带反引号，若不限表格会被当成引用，
  // 制造自指的假越界——首版实测即误报了两处正文。
  if (!line.startsWith('|')) return
  const cells = line.split('|')
  const rowId = (cells[1] ?? '').trim()
  const push = (prefix, at) =>
    rows.push({
      line: index + 1,
      rowId,
      prefix,
      at: Number(at),
      ok: Boolean(names[prefix][Number(at)]),
      name: names[prefix][Number(at)] ?? null,
    })

  const rest = line.replace(RANGE, (_whole, prefix, from, to) => {
    push(prefix, from)
    push(prefix, to)
    return '\0' // 占位，防止单点正则重复计入区间两端
  })
  for (const ref of rest.matchAll(SINGLE)) push(ref[1], ref[2])
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
for (const row of rows) {
  const key = `${row.prefix}#${row.at}`
  const owners = seen.get(key)
  const shared = owners && owners.size > 1 ? `（共用：${[...owners].join(' / ')}）` : ''
  const state = row.ok ? 'OK  ' : '越界'
  if (!row.ok) broken += 1
  const text = `${state} L${String(row.line).padStart(3)} ${row.rowId.padEnd(6)} ${key.padEnd(9)} ${row.name ?? '——该段无此下标——'}${shared}`
  if (list || !row.ok) console.log(text)
}

console.log(
  `\n引用 ${rows.length} 处，越界 ${broken} 处${list ? '' : '（未越界者不打印，人工复核请加 --list）'}。`,
)
if (broken && !list) process.exit(1)
