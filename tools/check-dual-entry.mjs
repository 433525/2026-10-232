/**
 * check-dual-entry.mjs — 双入口验收（零依赖，CDP 驱动）。
 *
 * 覆盖：
 * 1. `/` 与 `/aplus.html` 能加载、控制台无异常；
 * 2. 两端在 320 / 390 / 768 / 1024 / 1440 五档宽度无横向溢出；
 * 3. A+ 主链路：选记录 → 打开状态弹层 → Esc 关闭且焦点归还；
 * 4. A+ 弹层焦点优先级：使用说明停在 `[data-autofocus]`；
 * 5. A+ 社区桥：未写存档时给出空态文案而不是白屏。
 *
 * 产物：docs/evidence/dual-entry/*.png 与 report.json。
 * 用法：先 `npm run build`，再 `npx vite preview --port 5180`，最后 `node tools/check-dual-entry.mjs`。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CDPConnection,
  collectErrors,
  evaluate,
  launchChrome,
  navigate,
  pressEscape,
  screenshot,
  setViewport,
} from './lib/cdp.mjs'

const BASE = process.env.BASE_URL ?? 'http://localhost:5180'
const OUT_DIR = join(process.cwd(), 'docs', 'evidence', 'dual-entry')
const WIDTHS = [320, 390, 768, 1024, 1440]

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  return ok
}

async function measureOverflow(session) {
  return evaluate(session, `(() => {
    const doc = document.documentElement
    const body = document.body
    return {
      innerWidth: window.innerWidth,
      docScroll: doc ? doc.scrollWidth : 0,
      bodyScroll: body ? body.scrollWidth : 0,
    }
  })()`)
}

async function checkOverflow(session, label, url) {
  for (const width of WIDTHS) {
    await setViewport(session, width, 900)
    await navigate(session, url)
    const size = await measureOverflow(session)
    const ok = size.docScroll <= size.innerWidth + 1 && size.bodyScroll <= size.innerWidth + 1
    check(`${label} ${width}px 无横向溢出`, ok, ok ? '' : `doc=${size.docScroll} body=${size.bodyScroll} inner=${size.innerWidth}`)
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const chrome = await launchChrome({ port: 9333 })
  const connection = await new CDPConnection(chrome.version.webSocketDebuggerUrl).open()

  try {
    // ── B 端 ────────────────────────────────────────────────────────
    const b = await connection.newPage()
    const bErrors = collectErrors(b)
    await setViewport(b, 1440, 900)
    await navigate(b, `${BASE}/`)
    const bState = await evaluate(b, `(() => {
      const root = document.getElementById('root')
      return {
        hasRoot: !!root,
        textLength: (document.body.innerText || '').trim().length,
        navCount: document.querySelectorAll('nav a, nav button').length,
        telLinks: document.querySelectorAll('a[href^="tel:"]').length,
      }
    })()`)
    check('B 端渲染出内容', bState.hasRoot && bState.textLength > 200, `textLength=${bState.textLength}`)
    check('B 端五栏导航存在', bState.navCount >= 5, `navCount=${bState.navCount}`)
    check('B 端无 tel: 链接', bState.telLinks === 0, `count=${bState.telLinks}`)
    await screenshot(b, join(OUT_DIR, 'b-1440.png'))
    await checkOverflow(b, 'B 端', `${BASE}/`)
    await setViewport(b, 390, 844)
    await navigate(b, `${BASE}/`)
    await screenshot(b, join(OUT_DIR, 'b-390.png'))
    bErrors.stop()
    check('B 端控制台无异常', bErrors.errors.length === 0, bErrors.errors.slice(0, 3).join(' | '))

    // ── A+ 端 ───────────────────────────────────────────────────────
    const a = await connection.newPage()
    const aErrors = collectErrors(a)
    await setViewport(a, 1440, 900)
    await navigate(a, `${BASE}/aplus.html`)

    const boot = await evaluate(a, `(() => ({
      queueItems: document.querySelectorAll('.queue-item').length,
      detailPlaceholder: !!document.querySelector('.detail-placeholder'),
      bodyText: (document.body.innerText || '').trim().length,
      metrics: document.querySelectorAll('.metric-card').length,
      panels: document.querySelectorAll('.panel').length,
    }))()`)
    check('A+ 端启动非白屏', boot.bodyText > 500 && boot.panels >= 2, `textLength=${boot.bodyText}`)
    check('A+ 队列有记录', boot.queueItems > 0, `queueItems=${boot.queueItems}`)
    check('A+ 指标卡 4 张', boot.metrics === 4, `metrics=${boot.metrics}`)
    await screenshot(a, join(OUT_DIR, 'aplus-1440.png'))

    // 选一条能打开状态弹层的记录
    const opened = await evaluate(a, `(() => {
      const items = [...document.querySelectorAll('.queue-item')]
      for (const [index, item] of items.entries()) {
        item.click()
        const primary = document.querySelector('.detail-actions .button.primary')
        if (primary && !primary.disabled) {
          return { index, id: document.querySelector('.detail-id')?.textContent?.trim() ?? '' }
        }
      }
      return { index: -1, id: '' }
    })()`)
    check('A+ 选中记录后详情可见', opened.index >= 0 && opened.id.length > 0, `id=${opened.id}`)

    // 打开状态弹层 → 焦点进入 → Esc 关闭 → 焦点归还
    // 注意：必须先把触发按钮聚焦再 click。程序化 `.click()` 不会像真实鼠标那样
    // 让按钮获得焦点，这会让「归还焦点」测成 BODY，属于测试前置条件缺失而非实现缺陷。
    const dialogState = await evaluate(a, `(async () => {
      const trigger = document.querySelector('.detail-actions .button.primary')
      window.__aplusTrigger = trigger
      trigger.focus()
      trigger.click()
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const modal = document.querySelector('.modal-backdrop .modal')
      const focusInside = !!(modal && modal.contains(document.activeElement))
      const focusTag = document.activeElement ? document.activeElement.tagName + '#' + (document.activeElement.id || '') : 'none'
      return { hasModal: !!modal, focusInside, focusTag }
    })()`)
    check('A+ 状态弹层打开', dialogState.hasModal, '')
    check('A+ 弹层初始焦点在弹层内', dialogState.focusInside, `focus=${dialogState.focusTag}`)

    await pressEscape(a)
    const afterEscape = await evaluate(a, `(() => ({
      hasModal: !!document.querySelector('.modal-backdrop'),
      sameTrigger: document.activeElement === window.__aplusTrigger,
      focusInActions: !!document.activeElement?.closest('.detail-actions'),
      focusTag: document.activeElement ? document.activeElement.tagName + '.' + document.activeElement.className : 'none',
    }))()`)
    check('A+ Esc 关闭弹层', !afterEscape.hasModal, '')
    check('A+ Esc 后焦点归还触发按钮', afterEscape.sameTrigger, `focus=${afterEscape.focusTag}`)

    // 使用说明：data-autofocus 优先
    const helpState = await evaluate(a, `(async () => {
      document.querySelector('.top-actions .icon-button').click()
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const modal = document.querySelector('.modal-backdrop .modal')
      const active = document.activeElement
      return {
        hasModal: !!modal,
        autofocus: !!active?.hasAttribute('data-autofocus'),
        label: active?.textContent?.trim() ?? '',
      }
    })()`)
    check('A+ 使用说明打开', helpState.hasModal, '')
    check('A+ 初始焦点优先 data-autofocus', helpState.autofocus, `focus=${helpState.label}`)
    await screenshot(a, join(OUT_DIR, 'aplus-help-1440.png'))
    await pressEscape(a)

    // 社区桥空态
    const bridgeState = await evaluate(a, `(async () => {
      const buttons = [...document.querySelectorAll('.heading-actions .button')]
      const bridge = buttons.find((node) => node.textContent.includes('社区求助'))
      bridge.click()
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const modal = document.querySelector('.modal-backdrop .modal')
      return {
        hasModal: !!modal,
        status: document.querySelector('.bridge-status')?.textContent?.trim() ?? '',
        emptyText: document.querySelector('.modal .empty-state')?.textContent?.trim() ?? '',
        postCount: document.querySelectorAll('.bridge-post').length,
      }
    })()`)
    check('A+ 社区桥可打开', bridgeState.hasModal, '')
    check(
      'A+ 社区桥给出确定状态（空态不白屏）',
      bridgeState.status.length > 0 && (bridgeState.postCount > 0 || bridgeState.emptyText.length > 0),
      `status=${bridgeState.status} posts=${bridgeState.postCount}`,
    )
    await screenshot(a, join(OUT_DIR, 'aplus-bridge-1440.png'))
    await pressEscape(a)

    await setViewport(a, 390, 844)
    await navigate(a, `${BASE}/aplus.html`)
    await screenshot(a, join(OUT_DIR, 'aplus-390.png'))
    await checkOverflow(a, 'A+ 端', `${BASE}/aplus.html`)

    aErrors.stop()
    check('A+ 端控制台无异常', aErrors.errors.length === 0, aErrors.errors.slice(0, 3).join(' | '))
  } finally {
    connection.close()
    await chrome.close()
  }

  const failed = results.filter((item) => !item.ok)
  writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify({
    base: BASE,
    checkedAt: new Date().toISOString(),
    total: results.length,
    passed: results.length - failed.length,
    results,
  }, null, 2), 'utf8')

  console.log(`\n${results.length - failed.length}/${results.length} 通过`)
  if (failed.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
