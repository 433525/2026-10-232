/**
 * check-aplus-flow.mjs — A+ 主流程功能验收（零依赖，CDP 驱动）。
 *
 * 覆盖任务要求的四条主链路：
 * 1. 新建演练记录（含虚构确认）→ 队列 +1 且提示成功；
 * 2. 重复登记（同摘要）→ 暂停创建并进入人工重复复核；
 * 3. 状态流转 → 时间线追加、状态改变；
 * 4. 备份文本 → 合法 JSON 且含案例；刷新后记录仍在（存档往返）。
 *
 * 用法：先 build + preview，再 `node tools/check-aplus-flow.mjs`。
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
  setViewport,
} from './lib/cdp.mjs'

const BASE = process.env.BASE_URL ?? 'http://localhost:5180'
const OUT_DIR = join(process.cwd(), 'docs', 'evidence', 'aplus-flow')
const SUMMARY = `演练-功能验收-${Date.now().toString(36)}`

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

/** React 受控组件必须走原生 setter + input 事件，直接赋 value 不会触发 onChange。 */
const SET_VALUE_HELPER = `
window.__setValue = (selector, value) => {
  const el = document.querySelector(selector)
  if (!el) return false
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
    : el.tagName === 'SELECT' ? HTMLSelectElement.prototype
    : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  return true
}
`

const settle = `await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const chrome = await launchChrome({ port: 9336 })
  const connection = await new CDPConnection(chrome.version.webSocketDebuggerUrl).open()

  try {
    const page = await connection.newPage()
    const errors = collectErrors(page)
    // 重置演练数据时会弹 window.confirm，统一接受。
    page.on('Page.javascriptDialogOpening', () => {
      page.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {})
    })
    await setViewport(page, 1440, 900)
    await navigate(page, `${BASE}/aplus.html`)
    await evaluate(page, SET_VALUE_HELPER)

    const before = await evaluate(page, `document.querySelectorAll('.queue-item').length`)

    // ── 1. 新建记录 ─────────────────────────────────────────────────
    const created = await evaluate(page, `(async () => {
      const openButton = [...document.querySelectorAll('.heading-actions .button')]
        .find((node) => node.textContent.includes('新建演练记录'))
      openButton.click()
      ${settle}
      const hasModal = !!document.querySelector('.modal-backdrop .modal')
      // 必须在勾选之前读禁用态，否则测的是“已勾选后”的按钮。
      const submitProbe = [...document.querySelectorAll('.modal-footer .button.primary')]
        .find((node) => node.textContent.includes('创建演练记录'))
      const disabledBefore = submitProbe ? submitProbe.disabled : null
      window.__setValue('#record-summary', ${JSON.stringify(SUMMARY)})
      ${settle}
      const confirmBox = [...document.querySelectorAll('.modal .synthetic-confirm input')]
      confirmBox.forEach((box) => { if (!box.checked) box.click() })
      ${settle}
      const submit = [...document.querySelectorAll('.modal-footer .button.primary')]
        .find((node) => node.textContent.includes('创建演练记录'))
      const disabledAfter = submit.disabled
      submit.click()
      ${settle}
      return {
        hasModal,
        disabledBefore,
        disabledAfter,
        modalClosed: !document.querySelector('.modal-backdrop'),
        toast: document.querySelector('.toast')?.textContent?.trim() ?? '',
        queueCount: document.querySelectorAll('.queue-item').length,
        title: document.querySelector('.detail-title')?.textContent?.trim() ?? '',
      }
    })()`)

    check('新建弹层可打开', created.hasModal, '')
    check('未勾选虚构确认时创建按钮禁用', created.disabledBefore === true, `disabled=${created.disabledBefore}`)
    check('勾选虚构确认后创建按钮可用', created.disabledAfter === false, `disabled=${created.disabledAfter}`)
    check('新建记录后弹层关闭', created.modalClosed, '')
    check('新建记录给出成功提示', created.toast.includes('演练记录已加入队列'), created.toast)
    check('新建记录后队列 +1', created.queueCount === before + 1, `${before} → ${created.queueCount}`)
    check('新建记录自动选中', created.title.includes(SUMMARY), created.title)

    // ── 2. 重复登记 → 人工复核 ────────────────────────────────────────
    const duplicate = await evaluate(page, `(async () => {
      const openButton = [...document.querySelectorAll('.heading-actions .button')]
        .find((node) => node.textContent.includes('新建演练记录'))
      openButton.click()
      ${settle}
      window.__setValue('#record-summary', ${JSON.stringify(SUMMARY)})
      ${settle}
      ;[...document.querySelectorAll('.modal .synthetic-confirm input')]
        .forEach((box) => { if (!box.checked) box.click() })
      ${settle}
      const submit = [...document.querySelectorAll('.modal-footer .button.primary')]
        .find((node) => node.textContent.includes('创建演练记录'))
      submit.click()
      ${settle}
      const title = document.querySelector('.modal #create-title')?.textContent?.trim() ?? ''
      const candidates = document.querySelectorAll('.modal .related-case').length
      const finalButton = [...document.querySelectorAll('.modal-footer .button.primary')]
        .find((node) => node.textContent.includes('确认仍创建独立记录'))
      return { title, candidates, finalDisabled: finalButton ? finalButton.disabled : null }
    })()`)

    check('重复登记进入人工复核', duplicate.title.includes('重复'), duplicate.title)
    check('重复复核列出候选记录', duplicate.candidates > 0, `candidates=${duplicate.candidates}`)
    check('复核确认按钮初始禁用', duplicate.finalDisabled === true, `disabled=${duplicate.finalDisabled}`)
    await pressEscape(page)

    // ── 3. 检查点拦截：未完成检查点时普通流转必须被阻止 ──────────────
    const blocked = await evaluate(page, `(async () => {
      const primary = document.querySelector('.detail-actions .button.primary')
      if (!primary) return { skipped: true }
      primary.click()
      ${settle}
      const select = document.querySelector('#action-select')
      const options = [...select.options].filter((option) => option.value)
      if (!options.length) return { skipped: true }
      window.__setValue('#action-select', options[0].value)
      ${settle}
      const submit = [...document.querySelectorAll('.modal-footer .button.primary')].pop()
      return {
        action: options[0].value,
        disabled: submit.disabled,
        notice: document.querySelector('.modal .notice-inline[role="alert"]')?.textContent?.trim() ?? '',
      }
    })()`)
    check('检查点未完成时流转被阻止', blocked.disabled === true, `action=${blocked.action} disabled=${blocked.disabled}`)
    check('阻止原因可见', blocked.notice.includes('检查点'), blocked.notice.slice(0, 40))
    await pressEscape(page)

    // ── 4. 更新检查点 → 解锁并完成流转 ───────────────────────────────
    const checkpoint = await evaluate(page, `(async () => {
      const button = [...document.querySelectorAll('.detail-actions .button')]
        .find((node) => node.textContent.includes('更新登记检查点'))
      if (!button) return { skipped: true }
      button.click()
      ${settle}
      window.__setValue('#checkpoint-consent', 'confirmed')
      ${settle}
      ;[...document.querySelectorAll('.modal .synthetic-confirm input')]
        .forEach((box) => { if (!box.checked) box.click() })
      window.__setValue('#checkpoint-note', '功能验收：虚构检查点说明')
      ${settle}
      const submit = [...document.querySelectorAll('.modal-footer .button.primary')]
        .find((node) => node.textContent.includes('保存检查点'))
      const disabled = submit.disabled
      submit.click()
      ${settle}
      return {
        disabled,
        modalClosed: !document.querySelector('.modal-backdrop'),
        ready: document.querySelector('.checkpoint-callout')?.classList.contains('ready') ?? false,
      }
    })()`)
    check('检查点弹层提交可用', checkpoint.disabled === false, '')
    check('检查点保存后弹层关闭', checkpoint.modalClosed, '')
    check('检查点保存后标记完成', checkpoint.ready === true, `ready=${checkpoint.ready}`)

    const transition = await evaluate(page, `(async () => {
      const primary = document.querySelector('.detail-actions .button.primary')
      primary.click()
      ${settle}
      const select = document.querySelector('#action-select')
      const options = [...select.options].filter((option) => option.value)
      window.__setValue('#action-select', options[0].value)
      ${settle}
      ;[...document.querySelectorAll('.modal .synthetic-confirm input')]
        .forEach((box) => { if (!box.checked) box.click() })
      ${settle}
      const before = document.querySelectorAll('.timeline-item').length
      const submit = [...document.querySelectorAll('.modal-footer .button.primary')].pop()
      const disabled = submit.disabled
      submit.click()
      ${settle}
      return {
        action: options[0].value,
        disabled,
        modalClosed: !document.querySelector('.modal-backdrop'),
        toast: document.querySelector('.toast')?.textContent?.trim() ?? '',
        timelineBefore: before,
        timelineAfter: document.querySelectorAll('.timeline-item').length,
        status: document.querySelector('.detail-head-side .tag')?.textContent?.trim() ?? '',
      }
    })()`)

    check('解锁后流转提交可用', transition.disabled === false, `action=${transition.action}`)
    check('流转后弹层关闭', transition.modalClosed, '')
    check('流转后时间线追加', transition.timelineAfter > transition.timelineBefore, `${transition.timelineBefore} → ${transition.timelineAfter}`)
    check('流转后状态刷新', transition.status.length > 0, transition.status)

    // ── 4. 备份文本 + 刷新持久化 ─────────────────────────────────────
    const backup = await evaluate(page, `(async () => {
      const button = [...document.querySelectorAll('.banner-actions .button')]
        .find((node) => node.textContent.includes('查看备份文本'))
      button.click()
      ${settle}
      const raw = document.querySelector('#backup-text')?.value ?? ''
      let parsed = null
      try { parsed = JSON.parse(raw) } catch {}
      return {
        length: raw.length,
        ok: !!parsed,
        cases: Array.isArray(parsed?.cases) ? parsed.cases.length : -1,
        hasSummary: raw.includes(${JSON.stringify(SUMMARY)}),
      }
    })()`)
    check('备份文本非空', backup.length > 0, `length=${backup.length}`)
    check('备份文本是合法 JSON', backup.ok, '')
    check('备份含新建记录', backup.hasSummary && backup.cases > 0, `cases=${backup.cases}`)

    await navigate(page, `${BASE}/aplus.html`)
    const persisted = await evaluate(page, `(() => ({
      queue: document.querySelectorAll('.queue-item').length,
      matched: [...document.querySelectorAll('.queue-item')].some((node) => node.textContent.includes(${JSON.stringify(SUMMARY)})),
      storageStatus: document.querySelector('.storage-status')?.getAttribute('data-state') ?? '',
    }))()`)
    check('刷新后记录仍在本机存档', persisted.matched, `queue=${persisted.queue} status=${persisted.storageStatus}`)

    errors.stop()
    check('主流程无控制台异常', errors.errors.length === 0, errors.errors.slice(0, 3).join(' | '))
  } finally {
    connection.close()
    await chrome.close()
  }

  const failed = results.filter((item) => !item.ok)
  writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify({
    base: BASE,
    checkedAt: new Date().toISOString(),
    summary: SUMMARY,
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
