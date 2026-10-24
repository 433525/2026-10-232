/**
 * check-community-flow.mjs — B 端主链路 + 跨入口联动（零依赖，CDP 驱动）。
 *
 * 覆盖两条合规红线与一条跨端契约：
 * 1. 实名前置拦截：未实名访客提交求助时被挡在发布之前；
 * 2. 先审后发：已实名成员发布后进入待审，社区公开信息流看不到待审内容；
 * 3. 跨入口：A+ 社区桥能读到 B 刚写入的本机存档（同一个 localStorage 键）。
 *
 * 用法：先 build + preview，再 `node tools/check-community-flow.mjs`。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CDPConnection,
  collectErrors,
  evaluate,
  launchChrome,
  navigate,
  setViewport,
} from './lib/cdp.mjs'

const BASE = process.env.BASE_URL ?? 'http://localhost:5180'
const OUT_DIR = join(process.cwd(), 'docs', 'evidence', 'community-flow')
const TITLE = `演练-求助-${Date.now().toString(36)}`

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const HELPERS = `
window.__setValue = (el, value) => {
  if (!el) return false
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
    : el.tagName === 'SELECT' ? HTMLSelectElement.prototype
    : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  return true
}
window.__clickText = (selector, text) => {
  const node = [...document.querySelectorAll(selector)].find((item) => item.textContent.includes(text))
  if (!node) return false
  node.click()
  return true
}
window.__fillHelpForm = () => {
  const texts = [...document.querySelectorAll('input[type="text"]')]
  window.__setValue(texts[0], ${JSON.stringify(TITLE)})
  window.__setValue(texts[1], '演练用的虚构求助描述，不含任何真实个人信息')
  const note = document.querySelector('textarea')
  window.__setValue(note, '虚构演练：无真实健康信息')
  const consents = [...document.querySelectorAll('input[type="checkbox"]')]
  consents.forEach((box) => { if (!box.checked) box.click() })
}
`

const settle = `await new Promise((r) => setTimeout(r, 350))`

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const chrome = await launchChrome({ port: 9341 })
  const connection = await new CDPConnection(chrome.version.webSocketDebuggerUrl).open()

  try {
    const page = await connection.newPage()
    const errors = collectErrors(page)
    page.on('Page.javascriptDialogOpening', () => {
      page.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {})
    })
    await setViewport(page, 1440, 1000)
    await navigate(page, `${BASE}/`)
    await evaluate(page, HELPERS)

    // ── 1. 未实名访客提交 → 实名拦截 ────────────────────────────────
    const visitorAttempt = await evaluate(page, `(async () => {
      window.__clickText('nav button', '发布')
      ${settle}
      const hasForm = document.body.innerText.includes('发布求助订单')
      window.__fillHelpForm()
      ${settle}
      window.__clickText('button', '确认发布到接单大厅')
      ${settle}
      const alerts = [...document.querySelectorAll('[role="alert"]')].map((n) => n.textContent.trim())
      return {
        hasForm,
        alerts,
        stillOnPublish: document.body.innerText.includes('确认发布到接单大厅'),
        archive: localStorage.getItem('community-mvp.synthetic-state.v1') !== null,
      }
    })()`)

    check('B 端发布页可打开', visitorAttempt.hasForm, '')
    const visitorBlocked = visitorAttempt.alerts.some((text) => text.includes('实名'))
    check('未实名访客被前置拦截', visitorBlocked, visitorAttempt.alerts.join(' / ').slice(0, 60))
    check('拦截后未写入本机存档', visitorAttempt.archive === false, `archive=${visitorAttempt.archive}`)

    // ── 2. 切换到已实名成员 ─────────────────────────────────────────
    const switched = await evaluate(page, `(async () => {
      const identity = [...document.querySelectorAll('header button')].find((b) => b.textContent.includes('演练'))
      identity.click()
      ${settle}
      const users = [...document.querySelectorAll('header button')].filter((b) => b.textContent.includes('时间币'))
      const target = users.find((b) => b.textContent.includes('已实名'))
      if (!target) return { ok: false, label: '' }
      target.click()
      ${settle}
      const label = [...document.querySelectorAll('header button')]
        .map((b) => b.textContent.trim())
        .find((text) => text.includes('演练用户') || text.includes('演练访客')) ?? ''
      return { ok: true, label }
    })()`)
    check('可切换到已实名演练成员', switched.ok && switched.label.includes('演练用户'), switched.label.slice(0, 30))

    // ── 3. 已实名成员发布 → 进入待审 ────────────────────────────────
    const memberPublish = await evaluate(page, `(async () => {
      window.__clickText('nav button', '发布')
      ${settle}
      window.__fillHelpForm()
      ${settle}
      window.__clickText('button', '确认发布到接单大厅')
      ${settle}
      const text = document.body.innerText
      return {
        text: text.slice(0, 300),
        audit: text.includes('审核'),
        archive: localStorage.getItem('community-mvp.synthetic-state.v1') !== null,
      }
    })()`)
    check('成员发布后写入本机存档', memberPublish.archive === true, `archive=${memberPublish.archive}`)
    check('发布后提示进入审核', memberPublish.audit, memberPublish.text.replace(/\s+/g, ' ').slice(0, 80))

    // ── 4. 先审后发：公开信息流看不到待审内容 ────────────────────────
    const feed = await evaluate(page, `(async () => {
      window.__clickText('nav button', '社区')
      ${settle}
      return {
        hasTitle: document.body.innerText.includes(${JSON.stringify(TITLE)}),
        textLength: document.body.innerText.trim().length,
      }
    })()`)
    check('社区信息流已渲染内容', feed.textLength > 800, `textLength=${feed.textLength}`)
    check('待审内容不出现在公开信息流', feed.hasTitle === false, `hasTitle=${feed.hasTitle}`)

    // ── 5. 跨入口：A+ 社区桥读取同一存档 ─────────────────────────────
    const bridge = await evaluate(page, `(async () => {
      location.href = '/aplus.html'
      return true
    })()`)
    void bridge
    await navigate(page, `${BASE}/aplus.html`)
    const crossEntry = await evaluate(page, `(async () => {
      const button = [...document.querySelectorAll('.heading-actions .button')]
        .find((node) => node.textContent.includes('社区求助'))
      button.click()
      ${settle}
      return {
        status: document.querySelector('.bridge-status')?.textContent?.trim() ?? '',
        modal: !!document.querySelector('.modal-backdrop .modal'),
        posts: document.querySelectorAll('.bridge-post').length,
      }
    })()`)
    check('A+ 社区桥可打开', crossEntry.modal, '')
    check(
      'A+ 读到 B 写入的存档（不再提示未找到）',
      crossEntry.status.includes('已读取'),
      crossEntry.status,
    )

    errors.stop()
    check('B 主链路无控制台异常', errors.errors.length === 0, errors.errors.slice(0, 3).join(' | '))
  } finally {
    connection.close()
    await chrome.close()
  }

  const failed = results.filter((item) => !item.ok)
  writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify({
    base: BASE,
    checkedAt: new Date().toISOString(),
    title: TITLE,
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
