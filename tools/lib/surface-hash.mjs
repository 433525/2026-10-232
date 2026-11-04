/**
 * surface-hash.mjs — 「被测面」内容指纹（I-12）。
 *
 * 用途：门禁耗时是否仍然有效，取决于被测代码有没有变。用 git 提交区间判断有两个
 * 缺陷：① 提交晚于实测，实测后提交必然被判「已改动」；② 只改文档的提交要额外豁免。
 * 内容指纹只回答一个问题——当前源代码与实测当时是否逐字节相同。
 *
 * 纳入范围：`src/**`、`tools/check-*.mjs`、`tools/lib/**`、构建入口与配置。
 * 不纳入：`docs/**`、`dist/**`、`tools/` 下一次性脚本（不影响被测行为）。
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT_FILES = [
  'index.html',
  'aplus.html',
  'package.json',
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mjs',
  'tsconfig.json',
]

const SURFACE_DIRS = ['src']

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      walk(abs, out)
    } else {
      out.push(abs)
    }
  }
  return out
}

/** 返回被测面的相对路径清单（已排序，`/` 分隔）。 */
export function surfaceEntries(root = process.cwd()) {
  const files = []
  for (const dir of SURFACE_DIRS) {
    const abs = join(root, dir)
    if (existsSync(abs)) walk(abs, files)
  }
  for (const name of ROOT_FILES) {
    const abs = join(root, name)
    if (existsSync(abs)) files.push(abs)
  }
  const toolsDir = join(root, 'tools')
  if (existsSync(toolsDir)) {
    for (const entry of readdirSync(toolsDir, { withFileTypes: true })) {
      if (entry.isFile() && /^check-.*\.mjs$/.test(entry.name)) files.push(join(toolsDir, entry.name))
    }
    const libDir = join(toolsDir, 'lib')
    if (existsSync(libDir)) walk(libDir, files)
  }
  return files.map((file) => relative(root, file).replace(/\\/g, '/')).sort()
}

/** 被测面内容指纹：`sha256:<32 位>`。路径与内容都会参与摘要，改名同样会变。 */
export function surfaceHash(root = process.cwd()) {
  const hash = createHash('sha256')
  for (const rel of surfaceEntries(root)) {
    hash.update(rel)
    hash.update('\0')
    hash.update(readFileSync(join(root, rel)))
    hash.update('\0')
  }
  return `sha256:${hash.digest('hex').slice(0, 32)}`
}
