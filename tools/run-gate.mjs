#!/usr/bin/env node
/**
 * run-gate.mjs — 门禁编排器（CIP-232 / W3，D-14）。
 *
 * 解决的问题：八段各自启动 Chrome、各自冷启页面，串行墙钟约 419 s 已顶到 420 s 预算，
 * 再加断言必然破线（D-13）。本脚本做三件事：
 *   1. 逐段独立进程执行，并注入 `CDP_PORT` 作为**缺省值**（各脚本仍以自身常量为准，
 *      八个端口 9333/9336/9341/9347/9351/9352/9353/9354 互不重复，故端口从不是并发瓶颈）；
 *   2. 有界并发：默认 1 路（串行），`--concurrency=N` 仅供压测，结果不得作发布判据（D-14）；
 *   3. 逐段计时并直接写 `docs/metrics/gate-timing.json`，替代人工抄表（原先每次抄表
 *      都可能与 `baseRevision` 错配，见 D-06/D-09）。
 *
 * 语义说明：`totalMs` 为墙钟（端到端反馈时间），`sumMs` 为各段之和。并发度 >1 时
 * 两者必然不等，采集器的「分项合计」校验按 `concurrency` 分支判定。
 *
 * 用法（先 build + preview 到 5180）：
 *   node tools/run-gate.mjs                 # 串行，发布判据用（默认）
 *   node tools/run-gate.mjs --serial        # 同上，显式写法
 *   node tools/run-gate.mjs --concurrency=2 # 压测用，结果不作判据（D-14）
 *   node tools/run-gate.mjs --only=fixes-a,fixes-b   # 只跑指定段，不写耗时文件
 */
import { execSync, spawn } from 'node:child_process'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { surfaceHash } from './lib/surface-hash.mjs'

const ROOT = process.cwd()
const OUT = join(ROOT, 'docs', 'metrics', 'gate-timing.json')

const SEGMENTS = [
  { slug: 'dual-entry', file: 'tools/check-dual-entry.mjs', label: '双入口' },
  { slug: 'aplus-flow', file: 'tools/check-aplus-flow.mjs', label: 'A+ 流程' },
  { slug: 'community-flow', file: 'tools/check-community-flow.mjs', label: '社区流程' },
  { slug: 'acceptance', file: 'tools/check-acceptance.mjs', label: '验收' },
  { slug: 'recovery', file: 'tools/check-recovery.mjs', label: '坏档恢复' },
  { slug: 'fixes-a', file: 'tools/check-fixes-a.mjs', label: '修复补测 A' },
  { slug: 'fixes-b', file: 'tools/check-fixes-b.mjs', label: '修复补测 B' },
  { slug: 'p0-gaps', file: 'tools/check-p0-gaps.mjs', label: 'P0 缺口' },
]

function arg(name, fallback) {
  const hit = process.argv.slice(2).find((item) => item.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}

const serial = process.argv.includes('--serial')
/**
 * 默认串行。并发执行在 2026-10-26 实测**不可作为发布判据**（见 D-14）：
 *   - 3 路：墙钟 155.4 s、223/223（单次通过，未能复现）；
 *   - 2 路：墙钟 219.5 s、202/211，`fixes-b`/`p0-gaps` 两段因固定等待不足而连环失败。
 * 根因是各脚本的 `settle()` 为固定时长等待，CPU 争用下 React 提交与存档写入晚于等待窗口，
 * 与端口隔离无关。把 `settle` 全量改为条件轮询是一次大改，未完成前并发只能作实验用途。
 */
const concurrency = serial ? 1 : Math.max(1, Number(arg('concurrency', '1')))
if (concurrency > 1) {
  console.warn(`[实验] 并发度 ${concurrency}：并发结果不得作为发布判据（D-14），仅用于压测与定位。`)
}
const only = arg('only', '')
const selected = only
  ? SEGMENTS.filter((item) => only.split(',').includes(item.slug))
  : SEGMENTS

function git(args) {
  try {
    return execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

function report(slug) {
  const path = join(ROOT, 'docs', 'evidence', slug, 'report.json')
  if (!existsSync(path)) return null
  try {
    const json = JSON.parse(readFileSync(path, 'utf8'))
    return { total: json.total ?? null, passed: json.passed ?? null, mtimeMs: statSync(path).mtimeMs }
  } catch {
    return null
  }
}

function runSegment(segment, port) {
  return new Promise((resolve) => {
    const started = Date.now()
    const child = spawn(process.execPath, [segment.file], {
      cwd: ROOT,
      env: { ...process.env, CDP_PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let tail = ''
    const capture = (chunk) => {
      tail = (tail + chunk.toString()).slice(-4000)
    }
    child.stdout.on('data', capture)
    child.stderr.on('data', capture)
    child.on('error', (error) => {
      resolve({ ...segment, ms: Date.now() - started, exitCode: 1, tail: String(error) })
    })
    child.on('exit', (code) => {
      resolve({ ...segment, ms: Date.now() - started, exitCode: code ?? 1, tail })
    })
  })
}

function machine() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  return `${process.platform}-${process.arch} / Node ${process.version} / vite ${pkg.devDependencies.vite.replace(/^[^\d]*/, '')}`
}

const gateStart = Date.now()
const queue = [...selected]
const results = []
const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
  while (queue.length) {
    const segment = queue.shift()
    const port = 9400 + SEGMENTS.findIndex((item) => item.slug === segment.slug)
    const before = report(segment.slug)?.mtimeMs ?? 0
    const result = await runSegment(segment, port)
    const evidence = report(segment.slug)
    // 进程崩溃时不会写新报告，旧报告必须判为过期，否则会把上一轮的通过数当本轮结果。
    const fresh = Boolean(evidence) && (evidence.mtimeMs ?? 0) > before
    results.push({
      slug: segment.slug,
      file: segment.file,
      ms: result.ms,
      assertions: fresh ? evidence.total : null,
      passed: fresh ? evidence.passed : null,
      exitCode: result.exitCode,
    })
    const verdict = result.exitCode === 0 ? 'PASS' : 'FAIL'
    const note = result.exitCode === 0 ? '' : fresh ? '（断言未全绿）' : '（证据未更新）'
    console.log(`${verdict}  ${segment.slug} — ${(result.ms / 1000).toFixed(1)} s${note}`)
    if (result.exitCode !== 0) {
      console.log(result.tail.split('\n').slice(-15).join('\n'))
    }
  }
})

await Promise.all(workers)

const wallMs = Date.now() - gateStart
results.sort((a, b) => SEGMENTS.findIndex((s) => s.slug === a.slug) - SEGMENTS.findIndex((s) => s.slug === b.slug))
const sumMs = results.reduce((sum, item) => sum + item.ms, 0)
const totalAssertions = results.reduce((sum, item) => sum + (item.assertions ?? 0), 0)
const totalPassed = results.reduce((sum, item) => sum + (item.passed ?? 0), 0)
const failed = results.filter((item) => item.exitCode !== 0)

console.log(`\n${results.length - failed.length}/${results.length} 段通过；断言 ${totalPassed}/${totalAssertions}；墙钟 ${(wallMs / 1000).toFixed(1)} s（各段之和 ${(sumMs / 1000).toFixed(1)} s，并发度 ${concurrency}）`)

// 有失败段时不再落盘耗时：半轮数据会被后续轮次误当有效基线。
if (!only && failed.length === 0) {
  const payload = {
    measuredAt: new Date().toISOString(),
    machine: machine(),
    base: process.env.BASE_URL ?? 'http://localhost:5180',
    baseRevision: git('rev-parse --short HEAD') ?? 'unknown',
    surfaceHash: surfaceHash(ROOT),
    note: `${results.length} 段${concurrency > 1 ? `并发（并发度 ${concurrency}）` : '串行'}执行，均针对 dist 的同一次构建；totalMs 为端到端墙钟，sumMs 为各段之和，并发时二者不等。surfaceHash 为被测面内容指纹（I-12），用于判定耗时是否失效。`,
    serial: concurrency === 1,
    concurrency,
    wallMs,
    sumMs,
    totalMs: wallMs,
    totalAssertions,
    totalPassed,
    scripts: results.map(({ slug, file, ms, assertions, passed }) => ({ slug, file, ms, assertions, passed })),
  }
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`已写入 docs/metrics/gate-timing.json（baseRevision ${payload.baseRevision}，${payload.surfaceHash}）`)
}

if (failed.length) {
  console.error(`\n${failed.length} 段失败：${failed.map((item) => item.slug).join(', ')}`)
  process.exitCode = 1
}
