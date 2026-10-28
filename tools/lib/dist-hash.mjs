/**
 * dist-hash.mjs — 构建产物的内容指纹（I-17）。
 *
 * 为什么需要第二个指纹：`surface-hash.mjs` 回答「源码变没变」，本文件回答
 * 「门禁实际跑的那份 js/css/html 变没变」。二者必须配对才成立——
 * 只记源码指纹时，`npm run build` 之后重新构建过 dist 也不会让基线失效，
 * 反过来「改了 src 却忘了 build」也不会让基线失效：断言跑在旧 bundle 上照样全绿，
 * 而耗时记录里写的是新源码的指纹，看上去毫无破绽。这是测量链上唯一一个
 * 「两边都自洽、结论仍可能是假绿」的环节，故单列一个指纹。
 *
 * 范围：`dist/**` 下的 `.js` / `.css` / `.html`。其余文件（如 `robots.txt`）不参与
 * 打包产物判定；路径与内容都入摘要，改文件名或改内容都会变。
 *
 * 注意：`dist/` 在 `.gitignore` 内，新克隆的仓库没有产物，此时 `distHash()` 返回
 * `null`——调用方必须把「无产物」与「指纹不符」分开处理，不得把前者判成失败。
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const ARTIFACT = /\.(?:js|css|html)$/
const SKIP_DIRS = new Set(['node_modules', '.vite'])

/** 产物相对路径清单（已排序，`/` 分隔）；无 `dist/` 时为空数组。 */
export function distEntries(root = process.cwd()) {
  const dir = join(root, 'dist')
  if (!existsSync(dir)) return []
  const files = []
  const walk = (abs) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue
      const child = join(abs, entry.name)
      if (entry.isDirectory()) walk(child)
      else if (ARTIFACT.test(entry.name)) files.push(child)
    }
  }
  walk(dir)
  return files.map((file) => relative(root, file).replace(/\\/g, '/')).sort()
}

/** 产物内容指纹：`sha256:<32 位>`；无产物时返回 `null`。 */
export function distHash(root = process.cwd()) {
  const entries = distEntries(root)
  if (!entries.length) return null
  const hash = createHash('sha256')
  for (const rel of entries) {
    hash.update(rel)
    hash.update('\0')
    hash.update(readFileSync(join(root, rel)))
    hash.update('\0')
  }
  return `sha256:${hash.digest('hex').slice(0, 32)}`
}
