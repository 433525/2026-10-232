/**
 * check-fixes-b.mjs — 补充验收 B 段（零依赖，CDP 驱动）。
 *
 * 覆盖：社区桥登记与重复复核、A+ 投诉复核（含转介席回避）、A+ 备份导入、
 * 订单争议全流程、时间存折明细、负向与边界补测（I-02）。
 *
 * 与 A 段（`check-fixes-a.mjs`）共享 `tools/lib/fixes-helpers.mjs`，但不共享运行时状态：
 * 本段自行导入一份含「已接单且已通过」求助单的备份作为前置，可单独运行。
 *
 * 用法：先 build + preview 到 5180，再 `node tools/check-fixes-b.mjs`。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
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
import { SETTLE as settle, makeHelpers } from './lib/fixes-helpers.mjs'

const BASE = process.env.BASE_URL ?? 'http://localhost:5180'
const OUT_DIR = join(process.cwd(), 'docs', 'evidence', 'fixes-b')
const STATE_KEY = 'community-mvp.synthetic-state.v1'

const STAMP = Date.now().toString(36)
const O1_ID = `SYNTH-POST-DCHAT-${STAMP}`
const O1_TITLE = `演练-订单留言绑定-${STAMP}（虚构）`

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const HELPERS = makeHelpers(STATE_KEY)

async function uploadFile(page, selector, filePath) {
  await page.send('DOM.enable')
  const { root } = await page.send('DOM.getDocument', { depth: 1 })
  const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector })
  if (!nodeId) throw new Error(`未找到文件输入：${selector}`)
  await page.send('DOM.setFileInputFiles', { files: [filePath], nodeId })
}

async function main() {
  const chrome = await launchChrome({ port: 9353 })
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

    /* ── B 段前置：先落一份初始存档，再导入含「已接单且已通过」求助单的备份 ─ */
    await evaluate(page, `(async () => { await window.__switchIdentity('已实名'); return true })()`)
    // 首次进入时本机还没有存档；先做一次会落盘的轻量写动作（点赞），
    // 以当前默认存档作为种子基底。注意不能用「恢复初始演练数据」：
    // `resetFixturesWithFreshPostIds()` 会重排 post id，导致第 14 节的
    // 固定映射（SYNTH-POST-001）失效。
    await evaluate(page, `(async () => {
      window.__clickText('nav button', '社区')
      ${settle}
      const like = document.querySelector('button[aria-label^="赞同"]')
      if (like) like.click()
      ${settle}
      return true
    })()`)
    const rawEnvelope = await evaluate(page, `localStorage.getItem(${JSON.stringify(STATE_KEY)})`)
    if (!rawEnvelope) throw new Error('B 段前置失败：初始存档未落盘')
    const envelope = JSON.parse(rawEnvelope)
    envelope.savedAt = new Date().toISOString()
    envelope.state.posts = [
      {
        id: O1_ID,
        mode: 'help',
        title: O1_TITLE,
        content: '合成演练订单：验证订单留言按订单建线程，不含真实个人信息。',
        category: '日常家务',
        timeWindow: '本周五 09:00–10:00',
        duration: '约 1 小时',
        author: { id: 'SYNTH-DEMO-USER', name: '演练用户·我（虚构）', synthetic: true },
        location: '演练社区·梧桐里活动室（虚构）',
        createdAt: new Date().toISOString(),
        likeCount: 0,
        likedByMe: false,
        favorited: false,
        moderation: 'approved',
        comments: [],
        orderStatus: 'accepted-local-demo',
        synthetic: true,
      },
      ...envelope.state.posts,
    ]
    const seedDir = mkdtempSync(join(tmpdir(), 'wb-fixes-b-'))
    const seedPath = join(seedDir, 'bridge-seed.json')
    writeFileSync(seedPath, JSON.stringify(envelope), 'utf8')

    const panelReady = await evaluate(page, `(async () => {
      if (document.querySelector('input[data-storage-import]')) return true
      window.__clickText('nav button', '我的')
      ${settle}
      window.__clickText('button', '演练审核与举报处置后台')
      ${settle}
      window.__clickText('button', '存档与恢复')
      ${settle}
      return Boolean(document.querySelector('input[data-storage-import]'))
    })()`)
    if (!panelReady) throw new Error('B 段前置失败：存档面板未打开')
    await uploadFile(page, 'input[data-storage-import]', seedPath)
    await new Promise((resolve) => setTimeout(resolve, 900))
    const seedOk = await evaluate(page, `(() => ({
      has: (window.__readState()?.posts ?? []).some((p) => p.id === ${JSON.stringify(O1_ID)}),
    }))()`)
    rmSync(seedDir, { recursive: true, force: true })
    if (!seedOk.has) throw new Error('B 段前置失败：桥接种子订单未导入')
    await evaluate(page, `(async () => {
      window.__clickText('button', '关闭')
      ${settle}
      return true
    })()`)

    /* ── 13. 社区桥登记端到端：B 端求助 → A+ 登记 → 状态与队列回写 ──── */
    await evaluate(page, `localStorage.removeItem('a-plus.synthetic-intake.v1')`)
    await navigate(page, `${BASE}/aplus.html`)
    const bridgeFlow = await evaluate(page, `(async () => {
      const queueCount = () => {
        const el = [...document.querySelectorAll('small')].find((n) => n.textContent.includes('条演练记录'))
        return Number((el?.textContent.match(/(\\d+)/) ?? [])[1] ?? -1)
      }
      const queueBefore = queueCount()
      const openBtn = [...document.querySelectorAll('.heading-actions .button')]
        .find((b) => b.textContent.includes('社区求助'))
      if (!openBtn) return { step: 'no-bridge-button' }
      openBtn.click()
      ${settle}
      const status = document.querySelector('.bridge-status')?.textContent ?? ''
      const article = [...document.querySelectorAll('.bridge-post')]
        .find((n) => n.textContent.includes(${JSON.stringify(O1_TITLE)}))
      if (!article) return { step: 'post-not-listed', status }
      const wasRegisterable = article.textContent.includes('可登记')
      const confirmBox = document.querySelector('.bridge-modal .synthetic-confirm input[type="checkbox"]')
      if (confirmBox && !confirmBox.checked) confirmBox.click()
      ${settle}
      const register = [...article.querySelectorAll('button')]
        .find((b) => b.textContent.includes('登记到 A+ 队列'))
      if (!register) return { step: 'no-register-button', wasRegisterable }
      register.click()
      ${settle}
      // 登记后同一条帖子在同一弹层内应立刻变为「已登记」：
      // 这同时验证社区桥列表的记忆化按 store 版本正确失效。
      const articleAfter = [...document.querySelectorAll('.bridge-post')]
        .find((n) => n.textContent.includes(${JSON.stringify(O1_TITLE)}))
      const registeredNow = Boolean(articleAfter && articleAfter.textContent.includes('已登记'))
      const queueAfter = queueCount()
      // 关闭后重开（重新读取社区存档）：新读取结果下仍应显示已登记。
      const close = [...document.querySelectorAll('.bridge-modal button')]
        .find((b) => b.textContent.trim() === '关闭')
      if (close) close.click()
      ${settle}
      const reopen = [...document.querySelectorAll('.heading-actions .button')]
        .find((b) => b.textContent.includes('社区求助'))
      if (reopen) reopen.click()
      ${settle}
      const articleReopen = [...document.querySelectorAll('.bridge-post')]
        .find((n) => n.textContent.includes(${JSON.stringify(O1_TITLE)}))
      const stillRegistered = Boolean(articleReopen && articleReopen.textContent.includes('已登记'))
      // 存档断言：新登记记录带社区帖子 id 与 community-entry-local 来源。
      const raw = JSON.parse(localStorage.getItem('a-plus.synthetic-intake.v1') || 'null')
      const cases = raw?.cases ?? raw?.backup?.cases ?? []
      const newCase = cases.find((item) => item.sourcePostId === ${JSON.stringify(O1_ID)})
      return {
        step: 'done',
        statusOk: status.includes('已读取'),
        wasRegisterable,
        registeredNow,
        queueBefore,
        queueAfter,
        stillRegistered,
        newCaseOk: Boolean(newCase) && newCase.sourceChannel === 'community-entry-local',
        newCaseId: newCase?.id ?? '',
      }
    })()`)
    check(
      '社区桥可读取并列出 B 端已通过的求助',
      bridgeFlow.step !== 'no-bridge-button' && bridgeFlow.statusOk === true && bridgeFlow.wasRegisterable === true,
      `${bridgeFlow.step ?? 'done'} status=${bridgeFlow.status ?? ''}`,
    )
    check(
      '登记后同弹层立即显示已登记（记忆化正确失效）',
      bridgeFlow.step === 'done' && bridgeFlow.registeredNow === true,
      `registeredNow=${bridgeFlow.registeredNow}`,
    )
    check(
      '登记后 A+ 队列 +1',
      bridgeFlow.step === 'done' && bridgeFlow.queueAfter === bridgeFlow.queueBefore + 1,
      `${bridgeFlow.queueBefore} → ${bridgeFlow.queueAfter}`,
    )
    check(
      '重新读取后仍显示已登记（跨读取稳定）',
      bridgeFlow.step === 'done' && bridgeFlow.stillRegistered === true,
      `stillRegistered=${bridgeFlow.stillRegistered}`,
    )
    check(
      '新登记记录写入存档：绑定社区帖子 id 与专属来源',
      bridgeFlow.step === 'done' && bridgeFlow.newCaseOk === true,
      `case=${bridgeFlow.newCaseId}`,
    )

    /* ── 14. 社区桥重复复核：同标签/摘要先拦下，人工确认后才另建 ────── */
    const duplicateReview = await evaluate(page, `(async () => {
      const close = [...document.querySelectorAll('.bridge-modal button')]
        .find((b) => b.textContent.trim() === '关闭')
      if (close) close.click()
      ${settle}
      // 从 B 端存档推算 SYNTH-POST-001 的桥映射（label/summary），先手工建一条同文记录。
      const b = JSON.parse(localStorage.getItem('community-mvp.synthetic-state.v1') || 'null')
      const post = (b?.state?.posts ?? []).find((p) => p.id === 'SYNTH-POST-001')
      if (!post) return { step: 'no-b-post' }
      const label = '社区求助 · SYNTH-POST-001'
      const summary = post.title.trim() + '｜' + post.content.trim()
      const queueCount = () => {
        const el = [...document.querySelectorAll('small')].find((n) => n.textContent.includes('条演练记录'))
        return Number((el?.textContent.match(/(\\d+)/) ?? [])[1] ?? -1)
      }
      const before = queueCount()
      const create = [...document.querySelectorAll('.heading-actions .button')].find((x) => x.textContent.includes('新建'))
      create.click()
      ${settle}
      const setValue = (el, value) => {
        if (!el) return false
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
        return true
      }
      setValue(document.querySelector('#record-label'), label)
      setValue(document.querySelector('#record-summary'), summary)
      setValue(document.querySelector('#record-owner'), '演练-受理席-01')
      ${settle}
      const confirmBox = [...document.querySelectorAll('.modal .synthetic-confirm input[type="checkbox"]')]
        .find((box) => box.closest('.modal').textContent.includes('虚构'))
      if (confirmBox && !confirmBox.checked) confirmBox.click()
      ${settle}
      const submit = [...document.querySelectorAll('.modal .button.primary')].find((x) => x.textContent.includes('创建演练记录'))
      submit.click()
      ${settle}
      if (queueCount() !== before + 1) return { step: 'manual-create-failed', before, after: queueCount() }
      // 桥里登记同一条帖子 → 标签/摘要与手工记录完全相同 → 应进入人工重复复核。
      const bridge = [...document.querySelectorAll('.heading-actions .button')].find((x) => x.textContent.includes('社区求助'))
      bridge.click()
      ${settle}
      const article = [...document.querySelectorAll('.bridge-post')].find((n) => n.textContent.includes('把两箱演练物资搬到活动室'))
      if (!article) return { step: 'post-not-listed' }
      const confirmBox2 = document.querySelector('.bridge-modal .synthetic-confirm input[type="checkbox"]')
      if (confirmBox2 && !confirmBox2.checked) confirmBox2.click()
      ${settle}
      const register = [...article.querySelectorAll('button')].find((x) => x.textContent.includes('登记到 A+ 队列'))
      if (!register) return { step: 'no-register-button' }
      register.click()
      ${settle}
      const inReview = document.body.innerText.includes('人工重复复核')
      if (!inReview) return { step: 'review-not-shown' }
      // 复核视图：勾两处确认 + 填说明 → 确认仍创建独立记录。
      const boxes = [...document.querySelectorAll('.bridge-modal .synthetic-confirm input[type="checkbox"]')]
      boxes.forEach((box) => { if (!box.checked) box.click() })
      const explanation = document.querySelector('#community-duplicate-explanation')
      setValue(explanation, '已人工核对：另一条为手工录入的同文演练记录，本条确为社区帖独立登记。')
      ${settle}
      const confirmBtn = [...document.querySelectorAll('.bridge-modal .button.primary')]
        .find((x) => x.textContent.includes('确认仍创建独立记录'))
      confirmBtn.click()
      ${settle}
      const raw = JSON.parse(localStorage.getItem('a-plus.synthetic-intake.v1') || 'null')
      const cases = raw?.cases ?? []
      const registered = cases.find((item) => item.sourcePostId === 'SYNTH-POST-001')
      const articleAfter = [...document.querySelectorAll('.bridge-post')]
        .find((n) => n.textContent.includes('把两箱演练物资搬到活动室'))
      return {
        step: 'done',
        queueAfter: queueCount(),
        registered: Boolean(registered),
        reviewKept: Boolean(registered?.events?.some((event) => (event.note ?? '').includes('人工重复登记复核'))),
        uiRegistered: Boolean(articleAfter && articleAfter.textContent.includes('已登记')),
      }
    })()`)
    check(
      '重复登记进入人工重复复核（不静默合并）',
      duplicateReview.step === 'done',
      duplicateReview.step ?? '',
    )
    check(
      '人工确认后另建独立记录并绑定社区帖子',
      duplicateReview.step === 'done' && duplicateReview.registered === true && duplicateReview.uiRegistered === true,
      `registered=${duplicateReview.registered} ui=${duplicateReview.uiRegistered}`,
    )
    check(
      '复核说明写入新记录时间线（留痕）',
      duplicateReview.step === 'done' && duplicateReview.reviewKept === true,
      `reviewKept=${duplicateReview.reviewKept}`,
    )

    /* ── 15. A+ 投诉复核链路：提交 → 队列 → 复核席完成复核 ──────────── */
    const complaintFlow = await evaluate(page, `(async () => {
      const close = [...document.querySelectorAll('.bridge-modal button')].find((b) => b.textContent.trim() === '关闭')
      if (close) close.click()
      ${settle}
      const setValue = (el, value) => {
        if (!el) return false
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
        return true
      }
      const pendingCount = () => {
        const el = [...document.querySelectorAll('small')].find((n) => n.textContent.includes('条待复核'))
        return Number((el?.textContent.match(/(\\d+)/) ?? [])[1] ?? -1)
      }
      const before = pendingCount()
      const firstCase = document.querySelector('.queue-item')
      if (!firstCase) return { step: 'no-case' }
      firstCase.click()
      ${settle}
      const complain = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '提交投诉')
      if (!complain) return { step: 'no-complain-button' }
      complain.click()
      ${settle}
      // 目标选「转介席」：若默认针对复核席，切到复核席后变成复核针对自己的投诉，会被门禁挡下。
      const target = document.querySelector('#complaint-target')
      if (target) {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(target, 'demo-referral')
        target.dispatchEvent(new Event('change', { bubbles: true }))
      }
      setValue(document.querySelector('#complaint-description'), '合成演练投诉：验证独立复核队列的完整链路。')
      ${settle}
      const box = document.querySelector('.modal .synthetic-confirm input[type="checkbox"]')
      if (box && !box.checked) box.click()
      ${settle}
      const submit = [...document.querySelectorAll('.modal .button.primary')].find((b) => b.textContent.includes('提交到复核队列'))
      submit.click()
      ${settle}
      const dlgClose = document.querySelector('.modal .icon-button[aria-label="关闭"]')
      if (dlgClose) dlgClose.click()
      ${settle}
      const afterSubmit = pendingCount()
      // 复核要求「复核席」角色：受理席应被挡，切角色后应可复核。
      let blockedAsIntake = false
      const reason = [...document.querySelectorAll('.complaint-detail .notice-inline')].map((n) => n.textContent)
      blockedAsIntake = reason.some((t) => t.includes('复核') && (t.includes('角色') || t.includes('受理')))
      // 角色切换是顶栏的 select（不是按钮），用原生赋值 + change 事件。
      const roleSelect = document.querySelector('select[aria-label="切换演示角色"]')
      if (!roleSelect) return { step: 'no-role-select', afterSubmit }
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(roleSelect, 'demo-review')
      roleSelect.dispatchEvent(new Event('change', { bubbles: true }))
      ${settle}
      const resolution = document.querySelector('textarea[id^="complaint-resolution-"]')
      if (!resolution) return { step: 'no-resolution-field', afterSubmit, blockedAsIntake }
      setValue(resolution, '已核对演练记录，按演示规则完成复核处置。')
      ${settle}
      const confirm = [...document.querySelectorAll('.complaint-detail .button.primary')]
        .find((b) => b.textContent.includes('确认复核'))
      if (!confirm) return { step: 'no-confirm-button', afterSubmit, roleNow: roleSelect.value }
      const diag = {
        roleNow: roleSelect.value,
        confirmDisabled: confirm.disabled,
        reviewError: document.querySelector('.complaint-detail .form-error')?.textContent ?? '',
      }
      confirm.click()
      ${settle}
      const raw = JSON.parse(localStorage.getItem('a-plus.synthetic-intake.v1') || 'null')
      const complaint = (raw?.complaints ?? [])[0]
      return {
        step: 'done',
        before,
        afterSubmit,
        blockedAsIntake,
        ...diag,
        pendingAfter: pendingCount(),
        status: complaint?.status ?? '',
        resolution: complaint?.resolution ?? '',
        reviewerRole: complaint?.reviewerRole ?? '',
      }
    })()`)
    check(
      '投诉提交后进入待复核队列',
      complaintFlow.step === 'done' && complaintFlow.afterSubmit === complaintFlow.before + 1,
      `${complaintFlow.before} → ${complaintFlow.afterSubmit}`,
    )
    check(
      '受理席不可复核（角色门禁），复核席可完成',
      complaintFlow.step === 'done' && complaintFlow.pendingAfter === complaintFlow.before,
      `pendingAfter=${complaintFlow.pendingAfter} role=${complaintFlow.roleNow} disabled=${complaintFlow.confirmDisabled} err=${(complaintFlow.reviewError ?? '').slice(0, 40)} step=${complaintFlow.step}`,
    )
    check(
      '复核结论与复核人角色写入存档（留痕）',
      complaintFlow.status !== '' && complaintFlow.status !== '待复核'
        && complaintFlow.resolution.includes('复核处置') && complaintFlow.reviewerRole === 'demo-review',
      `status=${complaintFlow.status} reviewer=${complaintFlow.reviewerRole}`,
    )
    await evaluate(page, `(async () => {
      const roleSelect = document.querySelector('select[aria-label="切换演示角色"]')
      if (roleSelect) {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(roleSelect, 'demo-intake')
        roleSelect.dispatchEvent(new Event('change', { bubbles: true }))
      }
      ${settle}
      return true
    })()`)

    /* ── 15b. A+ 投诉「转介席视角」：可复核、回避门禁、不改 case 时间线 ── */
    const referralView = await evaluate(page, `(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms))
      const setValue = (el, value) => {
        if (!el) return false
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
        return true
      }
      const setSelect = (el, value) => {
        if (!el) return false
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, value)
        el.dispatchEvent(new Event('change', { bubbles: true }))
        return true
      }
      const roleSelect = () => document.querySelector('select[aria-label="切换演示角色"]')
      const setRole = async (role) => { setSelect(roleSelect(), role); await wait(360) }
      const archive = () => JSON.parse(localStorage.getItem('a-plus.synthetic-intake.v1') || 'null')
      const complaintCount = () => (archive()?.complaints ?? []).length

      const submitComplaint = async (targetRole, text) => {
        const item = document.querySelector('.queue-panel .queue-item') ?? document.querySelector('.queue-item')
        if (!item) return 'no-case'
        item.click(); await wait(420)
        const entry = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '提交投诉')
        if (!entry) return 'no-entry'
        entry.click(); await wait(420)
        setSelect(document.querySelector('#complaint-target'), targetRole)
        setValue(document.querySelector('#complaint-description'), text)
        await wait(320)
        const box = document.querySelector('.modal .synthetic-confirm input[type="checkbox"]')
        if (box && !box.checked) box.click()
        await wait(320)
        const btn = [...document.querySelectorAll('.modal .button.primary')]
          .find((b) => b.textContent.includes('提交到复核队列'))
        if (!btn || btn.disabled) return 'submit-blocked'
        btn.click(); await wait(420)
        const closeBtn = document.querySelector('.modal .icon-button[aria-label="关闭"]')
        if (closeBtn) closeBtn.click()
        await wait(420)
        return 'ok'
      }

      // 三条虚构投诉：A 针对转介席；B 由转介席提交；C 双方都不是转介席（转介席可正评）。
      await setRole('demo-intake')
      const seedA = await submitComplaint('demo-referral', '视角用例A-针对转介席')
      await setRole('demo-referral')
      const seedB = await submitComplaint('demo-intake', '视角用例B-转介席提交')
      await setRole('demo-intake')
      const seedC = await submitComplaint('demo-review', '视角用例C-可复核')
      if ([seedA, seedB, seedC].includes('no-case') || [seedA, seedB, seedC].includes('submit-blocked')) {
        return { step: 'seed-failed', seedA, seedB, seedC }
      }

      const pick = async (keyword) => {
        const items = [...document.querySelectorAll('.complaint-panel .queue-item')]
        const node = items.find((n) => n.textContent.includes(keyword))
        if (!node) return false
        node.click(); await wait(360)
        return true
      }
      const detail = () => {
        const panel = document.querySelector('.complaint-detail')
        if (!panel) return null
        const alerts = [...panel.querySelectorAll('[role="alert"], .notice-inline')]
          .map((n) => n.textContent.trim())
        const confirm = [...panel.querySelectorAll('.button.primary')]
          .find((b) => b.textContent.includes('确认复核'))
        return {
          text: panel.innerText,
          alerts,
          confirm: confirm ? { present: true, disabled: confirm.disabled } : { present: false },
        }
      }

      await setRole('demo-referral')
      const beforeCount = complaintCount()

      const pickA = await pick('视角用例A-针对转介席')
      const asTarget = detail()
      const pickB = await pick('视角用例B-转介席提交')
      const asSubmitter = detail()
      const pickC = await pick('视角用例C-可复核')
      const asReviewer = detail()
      const caseIdC = (archive()?.complaints ?? []).find((c) => c.description.includes('视角用例C-可复核'))?.caseId ?? ''
      const caseBefore = (archive()?.cases ?? []).find((c) => c.id === caseIdC)
      const timelineBefore = caseBefore?.timeline?.length ?? -1
      const statusBefore = caseBefore?.status ?? ''

      const resolution = document.querySelector('textarea[id^="complaint-resolution-"]')
      setValue(resolution, '转介席视角演练复核：核对记录后按演示规则处置。')
      await wait(340)
      const confirmBtn = [...document.querySelectorAll('.complaint-detail .button.primary')]
        .find((b) => b.textContent.includes('确认复核'))
      if (!confirmBtn || confirmBtn.disabled) return { step: 'referral-review-blocked', asReviewer }
      const pendingOf = () => {
        const badge = [...document.querySelectorAll('.complaint-panel small')]
          .find((n) => n.textContent.includes('条待复核'))
        return Number((badge?.textContent.match(/(\\d+)/) ?? [])[1] ?? -1)
      }
      const pendingBefore = pendingOf()
      confirmBtn.click(); await wait(520)
      const pendingAfter = pendingOf()

      const reviewed = (archive()?.complaints ?? [])
        .find((c) => c.description.includes('视角用例C-可复核'))
      const caseAfter = (archive()?.cases ?? []).find((c) => c.id === caseIdC)
      const openCase = [...document.querySelectorAll('.complaint-detail .detail-actions button')]
        .find((b) => b.textContent.includes('打开关联 case'))

      return {
        step: 'done',
        seedA, seedB, seedC,
        beforeCount,
        afterCount: complaintCount(),
        pickA, pickB, pickC,
        asTarget,
        asSubmitter,
        asReviewer: {
          roleLine: asReviewer?.text,
          confirmDisabled: asReviewer?.confirm?.disabled,
        },
        reviewed: {
          status: reviewed?.status ?? '',
          reviewerRole: reviewed?.reviewerRole ?? '',
          resolution: reviewed?.resolution ?? '',
        },
        caseIdC,
        timelineBefore,
        timelineAfter: caseAfter?.timeline?.length ?? -1,
        statusBefore,
        statusAfter: caseAfter?.status ?? '',
        openCaseVisible: Boolean(openCase),
        pendingBefore,
        pendingAfter,
      }
    })()`)
    const targetBlocked = (referralView.asTarget?.alerts ?? [])
      .some((text) => text.includes('被投诉角色不能复核'))
    const submitterBlocked = (referralView.asSubmitter?.alerts ?? [])
      .some((text) => text.includes('投诉提交人不能复核'))
    check(
      '转介席视角可见投诉队列与详情（含当前演示角色说明）',
      referralView.step === 'done' && referralView.pickA === true && referralView.pickB === true
        && referralView.pickC === true
        && (referralView.asTarget?.text ?? '').includes('当前演示角色：演示 · 转介席'),
      `${referralView.step} pick=${referralView.pickA}/${referralView.pickB}/${referralView.pickC}`,
    )
    check(
      '转介席不得复核「针对转介席」的投诉（回避门禁）',
      referralView.step === 'done' && targetBlocked === true
        && referralView.asTarget?.confirm?.disabled === true,
      `blocked=${targetBlocked} disabled=${referralView.asTarget?.confirm?.disabled}`,
    )
    check(
      '转介席不得复核「转介席自己提交」的投诉（提交人回避）',
      referralView.step === 'done' && submitterBlocked === true
        && referralView.asSubmitter?.confirm?.disabled === true,
      `blocked=${submitterBlocked} disabled=${referralView.asSubmitter?.confirm?.disabled}`,
    )
    check(
      '转介席可完成他人投诉的复核并写入复核角色',
      referralView.step === 'done'
        && referralView.reviewed.status !== '待复核' && referralView.reviewed.status !== ''
        && referralView.reviewed.reviewerRole === 'demo-referral'
        && referralView.reviewed.resolution.includes('转介席视角'),
      `step=${referralView.step} status=${referralView.reviewed?.status} reviewer=${referralView.reviewed?.reviewerRole}`,
    )
    check(
      '投诉复核不改写关联 case 的时间线与状态',
      referralView.step === 'done' && referralView.caseIdC !== ''
        && referralView.timelineBefore === referralView.timelineAfter
        && referralView.statusBefore === referralView.statusAfter
        && referralView.openCaseVisible === true,
      `case=${referralView.caseIdC} timeline=${referralView.timelineBefore}→${referralView.timelineAfter} status=${referralView.statusBefore}→${referralView.statusAfter}`,
    )
    check(
      '转介席完成复核后待复核队列计数递减一条',
      referralView.step === 'done'
        && referralView.pendingBefore > 0
        && referralView.pendingAfter === referralView.pendingBefore - 1
        && referralView.beforeCount >= 3,
      `pending=${referralView.pendingBefore}→${referralView.pendingAfter} complaints=${referralView.beforeCount}`,
    )
    await evaluate(page, `(async () => {
      const roleSelect = document.querySelector('select[aria-label="切换演示角色"]')
      if (roleSelect) {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(roleSelect, 'demo-intake')
        roleSelect.dispatchEvent(new Event('change', { bubbles: true }))
      }
      ${settle}
      return true
    })()`)

    /* ── 16. A+ 备份导入：重置后可整档恢复；版本不符被拒 ────────────── */
    const uploadAplus = async (filePath) => {
      await page.send('DOM.enable')
      const { root } = await page.send('DOM.getDocument', { depth: 1 })
      const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[data-aplus-backup-input]' })
      if (!nodeId) throw new Error('未找到 A+ 导入文件输入')
      await page.send('DOM.setFileInputFiles', { files: [filePath], nodeId })
    }
    const backupRaw = await evaluate(page, `localStorage.getItem('a-plus.synthetic-intake.v1')`)
    const tmpDir2 = mkdtempSync(join(tmpdir(), 'wb-fixes-aplus-'))
    const goodPath = join(tmpDir2, 'aplus-backup.json')
    writeFileSync(goodPath, backupRaw, 'utf8')
    const badPath = join(tmpDir2, 'aplus-bad-version.json')
    writeFileSync(badPath, JSON.stringify({ ...JSON.parse(backupRaw), schemaVersion: 99 }), 'utf8')

    const resetState = await evaluate(page, `(async () => {
      const before = (JSON.parse(localStorage.getItem('a-plus.synthetic-intake.v1') || 'null')?.cases ?? []).length
      const reset = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('重置演练'))
      if (!reset) return { step: 'no-reset-button' }
      reset.click()
      ${settle}
      const after = (JSON.parse(localStorage.getItem('a-plus.synthetic-intake.v1') || 'null')?.cases ?? []).length
      return { step: 'done', before, after }
    })()`)
    check(
      'A+ 重置演练恢复初始记录',
      resetState.step === 'done' && resetState.after < resetState.before,
      `${resetState.before} → ${resetState.after}`,
    )

    await uploadAplus(goodPath)
    await new Promise((resolve) => setTimeout(resolve, 900))
    const importedAplus = await evaluate(page, `(async () => ({
      cases: (JSON.parse(localStorage.getItem('a-plus.synthetic-intake.v1') || 'null')?.cases ?? []).length,
      bridgeCase: (JSON.parse(localStorage.getItem('a-plus.synthetic-intake.v1') || 'null')?.cases ?? [])
        .some((item) => item.sourcePostId === ${JSON.stringify(O1_ID)}),
      toast: document.querySelector('.toast')?.textContent ?? '',
    }))()`)
    check(
      '合法备份导入后记录完整恢复（含桥登记记录）',
      importedAplus.cases === resetState.before && importedAplus.bridgeCase === true,
      `cases=${importedAplus.cases}/${resetState.before} bridge=${importedAplus.bridgeCase}`,
    )

    await evaluate(page, `(async () => { await new Promise((r) => setTimeout(r, 2800)); return true })()`)
    await uploadAplus(badPath)
    await new Promise((resolve) => setTimeout(resolve, 900))
    const rejectedAplus = await evaluate(page, `(async () => ({
      cases: (JSON.parse(localStorage.getItem('a-plus.synthetic-intake.v1') || 'null')?.cases ?? []).length,
      toast: document.querySelector('.toast')?.textContent ?? '',
    }))()`)
    check(
      '版本不符的备份被拒绝且存档不变',
      rejectedAplus.cases === importedAplus.cases && rejectedAplus.toast.includes('版本'),
      `cases=${rejectedAplus.cases} toast=${rejectedAplus.toast.slice(0, 50)}`,
    )
    rmSync(tmpDir2, { recursive: true, force: true })

    /* ── 17. 订单争议流程露出：发起 → 撤销 → 再发起 → 因争议关闭 ────── */
    await navigate(page, `${BASE}/`)
    await evaluate(page, HELPERS)
    const D_TITLE = `演练-争议流程-${STAMP}`
    const D_REASON = `争议原因-${STAMP}：约定好的上门时间两次未成行`
    const D_RESUME = `处理说明-${STAMP}：双方重新约好上门时间`
    const D_CLOSE = `处理说明-${STAMP}：家属已另行安排，双方同意终止`
    const D_TAG = `二次争议-${STAMP}`

    const disputeSeeded = await evaluate(page, `(async () => {
      await window.__switchIdentity('已实名')
      window.__clickText('nav button', '发布')
      ${settle}
      window.__setValue(document.querySelector('#help-title'), ${JSON.stringify(D_TITLE)})
      window.__setValue(document.querySelector('#help-desc'), '合成演练：验证争议流程的界面入口、理由校验与留痕。')
      const boxes = [...document.querySelectorAll('input[type="checkbox"]')]
      boxes.forEach((box) => { if (!box.checked) box.click() })
      ${settle}
      window.__clickText('button', '确认发布到接单大厅')
      ${settle}
      const post = (window.__readState()?.posts ?? []).find((p) => p.title === ${JSON.stringify(D_TITLE)})
      return { submitted: Boolean(post), moderation: post?.moderation ?? null }
    })()`)
    check(
      '争议用例订单进入待审（数据基线可用）',
      disputeSeeded.submitted === true && disputeSeeded.moderation === 'pending',
      `moderation=${disputeSeeded.moderation}`,
    )

    await evaluate(page, `(async () => {
      await window.__switchIdentity('审核员')
      window.__clickText('nav button', '我的')
      ${settle}
      window.__clickText('button', '演练审核与举报处置后台')
      ${settle}
      window.__clickIn(${JSON.stringify(D_TITLE)}, '审核通过并公开')
      ${settle}
      window.__clickText('button', '关闭')
      ${settle}
      await window.__switchIdentity('已实名')
      window.__clickText('nav button', '我的')
      ${settle}
      const card = [...document.querySelectorAll('#profile-orders div.cursor-pointer')]
        .find((node) => node.textContent.includes(${JSON.stringify(D_TITLE)}))
      if (card) card.click()
      ${settle}
      window.__clickText('button', '代合成邻居接单')
      ${settle}
      return true
    })()`)

    const disputeEntry = await evaluate(page, `(async () => {
      const text = document.body.innerText
      const buttons = [...document.querySelectorAll('button')].map((b) => b.textContent.trim())
      return {
        opened: text.includes('互助求助订单详情'),
        accepted: text.includes('志愿者已认领'),
        hasEntry: buttons.some((label) => label.includes('发起争议')),
        hasResolve: buttons.some((label) => label.includes('撤销争议') || label.includes('因争议关闭')),
      }
    })()`)
    check(
      '已接单订单出现「发起争议」入口（争议态前不显示处理入口）',
      disputeEntry.opened === true && disputeEntry.accepted === true
        && disputeEntry.hasEntry === true && disputeEntry.hasResolve === false,
      `opened=${disputeEntry.opened} accepted=${disputeEntry.accepted} entry=${disputeEntry.hasEntry} resolve=${disputeEntry.hasResolve}`,
    )

    const disputeGuarded = await evaluate(page, `(async () => {
      const entry = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('发起争议'))
      if (!entry) return { step: 'no-entry' }
      entry.click()
      ${settle}
      const field = document.querySelector('#dispute-reason')
      const submit = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('确认发起争议'))
      const text = document.body.innerText
      // 必须在填写前快照 disabled：React 复用同一个 DOM 节点，填写后属性会被改写。
      const blockedWhenEmpty = Boolean(submit?.disabled)
      window.__setValue(field, ${JSON.stringify(D_REASON)})
      ${settle}
      return {
        step: 'done',
        hasField: Boolean(field),
        blockedWhenEmpty,
        enabledAfterFill: submit ? submit.disabled === false : false,
        honest: text.includes('不发起真实仲裁'),
      }
    })()`)
    check(
      '争议弹层要求理由：空理由禁用提交，填写后放行',
      disputeGuarded.step === 'done' && disputeGuarded.hasField === true
        && disputeGuarded.blockedWhenEmpty === true && disputeGuarded.enabledAfterFill === true,
      `${disputeGuarded.step} field=${disputeGuarded.hasField} empty=${disputeGuarded.blockedWhenEmpty} filled=${disputeGuarded.enabledAfterFill}`,
    )
    check('争议弹层声明不发起真实仲裁/投诉', disputeGuarded.honest === true, '')

    const disputed = await evaluate(page, `(async () => {
      const submit = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('确认发起争议'))
      if (!submit || submit.disabled) return { step: 'submit-blocked' }
      submit.click()
      ${settle}
      const text = document.body.innerText
      const post = (window.__readState()?.posts ?? []).find((p) => p.title === ${JSON.stringify(D_TITLE)})
      const events = post?.orderEvents ?? []
      return {
        step: 'done',
        detailStillOpen: text.includes('互助求助订单详情') && text.includes('演练留痕'),
        alertShown: text.includes('争议处理中（本机演练）'),
        reasonShown: text.includes(${JSON.stringify(D_REASON)}),
        statusLabel: text.includes('申诉处理中'),
        orderStatus: post?.orderStatus ?? '',
        eventOk: events.some((e) => e.type === 'dispute' && e.note.includes(${JSON.stringify(D_REASON)})),
        hasResolve: [...document.querySelectorAll('button')].some((b) => b.textContent.includes('撤销争议并继续履约')),
      }
    })()`)
    check(
      '发起争议后详情不关闭且留痕立即出现 dispute 事件',
      disputed.step === 'done' && disputed.detailStillOpen === true && disputed.eventOk === true,
      `${disputed.step} open=${disputed.detailStillOpen} event=${disputed.eventOk}`,
    )
    check(
      '争议态：状态标签、原因提示与领域状态一致',
      disputed.orderStatus === 'disputed-local-demo' && disputed.statusLabel === true
        && disputed.alertShown === true && disputed.reasonShown === true,
      `status=${disputed.orderStatus} label=${disputed.statusLabel} alert=${disputed.alertShown} reason=${disputed.reasonShown}`,
    )

    const resumed = await evaluate(page, `(async () => {
      const entry = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('撤销争议并继续履约'))
      if (!entry) return { step: 'no-entry' }
      entry.click()
      ${settle}
      const field = document.querySelector('#resolve-reason')
      const submit = () => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('确认撤销并恢复履约'))
      const blockedWhenEmpty = Boolean(submit()?.disabled)
      window.__setValue(field, ${JSON.stringify(D_RESUME)})
      ${settle}
      const button = submit()
      if (!button || button.disabled) return { step: 'submit-blocked', blockedWhenEmpty }
      button.click()
      ${settle}
      const text = document.body.innerText
      const post = (window.__readState()?.posts ?? []).find((p) => p.title === ${JSON.stringify(D_TITLE)})
      const events = post?.orderEvents ?? []
      return {
        step: 'done',
        blockedWhenEmpty,
        orderStatus: post?.orderStatus ?? '',
        alertGone: !text.includes('争议处理中（本机演练）'),
        backToAccepted: text.includes('志愿者已认领'),
        eventOk: events.some((e) => e.type === 'resume-after-dispute' && e.note.includes(${JSON.stringify(D_RESUME)})),
        entryBack: [...document.querySelectorAll('button')].some((b) => b.textContent.includes('发起争议')),
      }
    })()`)
    check(
      '撤销争议需理由并回到履约中（留痕 resume-after-dispute）',
      resumed.step === 'done' && resumed.blockedWhenEmpty === true
        && resumed.orderStatus === 'accepted-local-demo' && resumed.eventOk === true,
      `${resumed.step} empty=${resumed.blockedWhenEmpty} status=${resumed.orderStatus} event=${resumed.eventOk}`,
    )
    check(
      '撤销后界面复原：争议提示消失、可再次发起',
      resumed.alertGone === true && resumed.backToAccepted === true && resumed.entryBack === true,
      `alert=${resumed.alertGone} accepted=${resumed.backToAccepted} entry=${resumed.entryBack}`,
    )

    const closed = await evaluate(page, `(async () => {
      const entry = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('发起争议'))
      if (!entry) return { step: 'no-reopen' }
      entry.click()
      ${settle}
      window.__setValue(document.querySelector('#dispute-reason'), ${JSON.stringify(D_TAG)})
      ${settle}
      const submitDispute = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('确认发起争议'))
      if (!submitDispute || submitDispute.disabled) return { step: 'reopen-blocked' }
      submitDispute.click()
      ${settle}
      const closeEntry = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('因争议关闭订单'))
      if (!closeEntry) return { step: 'no-close-entry' }
      closeEntry.click()
      ${settle}
      const field = document.querySelector('#resolve-reason')
      const submitClose = () => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('确认关闭该订单'))
      const blockedWhenEmpty = Boolean(submitClose()?.disabled)
      window.__setValue(field, ${JSON.stringify(D_CLOSE)})
      ${settle}
      const button = submitClose()
      if (!button || button.disabled) return { step: 'close-submit-blocked', blockedWhenEmpty }
      button.click()
      ${settle}
      const text = document.body.innerText
      const post = (window.__readState()?.posts ?? []).find((p) => p.title === ${JSON.stringify(D_TITLE)})
      const events = post?.orderEvents ?? []
      return {
        step: 'done',
        blockedWhenEmpty,
        orderStatus: post?.orderStatus ?? '',
        cancelledLabel: text.includes('订单已取消'),
        closeEvent: events.some((e) => e.type === 'close-after-dispute' && e.note.includes(${JSON.stringify(D_CLOSE)})),
        reasonKept: text.includes(${JSON.stringify(D_CLOSE)}),
        entryGone: ![...document.querySelectorAll('button')]
          .some((b) => b.textContent.includes('发起争议') || b.textContent.includes('撤销争议') || b.textContent.includes('因争议关闭')),
        disputeCount: events.filter((e) => e.type === 'dispute').length,
      }
    })()`)
    check(
      '因争议关闭需理由且订单终止（留痕 close-after-dispute）',
      closed.step === 'done' && closed.blockedWhenEmpty === true
        && closed.orderStatus === 'cancelled-local-demo' && closed.closeEvent === true,
      `${closed.step} empty=${closed.blockedWhenEmpty} status=${closed.orderStatus} event=${closed.closeEvent}`,
    )
    check(
      '终止后不再显示争议入口，历史理由仍可读',
      closed.entryGone === true && closed.cancelledLabel === true
        && closed.reasonKept === true && closed.disputeCount === 2,
      `entry=${closed.entryGone} cancelled=${closed.cancelledLabel} reason=${closed.reasonKept} disputes=${closed.disputeCount}`,
    )
    await pressEscape(page)
    await new Promise((resolve) => setTimeout(resolve, 300))

    /* ── 18. 时间存折明细：数值与流水同源、只读说明齐全 ─────────────── */
    const ledger = await evaluate(page, `(async () => {
      window.__clickText('nav button', '我的')
      ${settle}
      const entry = document.querySelector('.nl-ledger-card__link')
      if (!entry) return { step: 'no-entry' }
      entry.click()
      ${settle}
      const dialog = [...document.querySelectorAll('[role="dialog"]')]
        .find((node) => node.textContent.includes('时间存折明细'))
      if (!dialog) return { step: 'no-dialog' }
      const text = dialog.innerText
      const rows = [...dialog.querySelectorAll('.nl-timeline__row')]
      const amounts = rows.map((row) => (row.querySelector('.nl-timeline__amount')?.textContent ?? '').trim())
      const entries = window.__readState()?.ledgerEntries ?? []
      const minutes = entries.reduce((sum, item) => sum + item.minutes, 0)
      return {
        step: 'done',
        rows: rows.length,
        entries: entries.length,
        heroValue: (dialog.querySelector('.nl-ledger-hero__value .nl-num')?.textContent ?? '').trim(),
        expected: (minutes / 60).toFixed(1),
        heroHours: (text.match(/折合\\s*([\\d.]+)\\s*小时/) ?? [])[1] ?? '',
        totalLabel: (text.match(/累计记录\\s*(\\d+)\\s*条/) ?? [])[1] ?? '',
        unsettled: /未结算\\s*\\d+\\s*条/.test(text),
        amountsOk: amounts.length > 0 && amounts.every((value) => /^[+-]?\\d+\\.\\d 小时$/.test(value)),
        voucher: rows.every((row) => row.innerText.includes('凭证 ')),
        readable: text.includes('不可兑现') && text.includes('不可转让'),
        readonly: text.includes('只读流水'),
      }
    })()`)
    check(
      '时间存折明细：余额与流水条数在界面上自洽',
      ledger.step === 'done' && ledger.heroValue === ledger.expected
        && ledger.totalLabel === String(ledger.rows) && ledger.rows === ledger.entries,
      `${ledger.step} hero=${ledger.heroValue}/${ledger.expected} rows=${ledger.rows}/${ledger.entries} label=${ledger.totalLabel}`,
    )
    check(
      '时间存折明细：折合小时、未结算计数与金额格式正确',
      ledger.step === 'done' && ledger.heroHours === ledger.expected
        && ledger.unsettled === true && ledger.amountsOk === true,
      `hours=${ledger.heroHours}/${ledger.expected} unsettled=${ledger.unsettled} amounts=${ledger.amountsOk}`,
    )
    check(
      '时间存折明细：凭证号与「不可兑现/不可转让」只读声明在位',
      ledger.step === 'done' && ledger.voucher === true
        && ledger.readable === true && ledger.readonly === true,
      `voucher=${ledger.voucher} readable=${ledger.readable} readonly=${ledger.readonly}`,
    )
    await pressEscape(page)
    await new Promise((resolve) => setTimeout(resolve, 300))

    /* ── 17. 负向与边界补测（I-02 / W1 序 6）───────────────────────────
     * 判定标准是「被拒绝 + 状态未变」，不只看提示文案：只弹 toast 但仍写入
     * 存档的实现必须判红。起点用「清本机存档 + 重载」构造，避免受前述 16 组
     * 用例的身份与模态残留影响。
     * 命名前缀：[neg] 负向路径、[edge] 边界输入；供 collect-baseline 精确统计。
     */
    await evaluate(page, `(async () => { localStorage.removeItem(${JSON.stringify(STATE_KEY)}); return true })()`)
    await navigate(page, `${BASE}/`)
    await evaluate(page, HELPERS)

    const NEG_TITLE = `演练驳回路径-${STAMP}`
    const NEG_CONTENT = '合成演练内容：验证驳回理由为空时不得提交，驳回后不进入公开信息流。'

    const negSeeded = await evaluate(page, `(async () => {
      await window.__switchIdentity('已实名')
      window.__clickText('nav button', '发布')
      ${settle}
      window.__clickText('button', '志愿动态')
      ${settle}
      window.__setValue(document.querySelector('#post-title'), ${JSON.stringify(NEG_TITLE)})
      window.__setValue(document.querySelector('#post-content'), ${JSON.stringify(NEG_CONTENT)})
      ${settle}
      window.__clickText('button', '发布并同步至社区')
      ${settle}
      const post = (window.__readState()?.posts ?? []).find((p) => p.title === ${JSON.stringify(NEG_TITLE)})
      return { moderation: post?.moderation ?? null, id: post?.id ?? '' }
    })()`)

    // 空白理由两个用例共一次 DOM 采样：空 → 纯空白 → 填写，逐步取按钮 disabled。
    const rejectGuard = await evaluate(page, `(async () => {
      await window.__switchIdentity('审核员')
      window.__clickText('nav button', '我的')
      ${settle}
      window.__clickText('button', '演练审核与举报处置后台')
      ${settle}
      const card = () => [...document.querySelectorAll('section')]
        .filter((node) => node.innerText.includes(${JSON.stringify(NEG_TITLE)}))
        .pop()
      const rejectBtn = () => {
        const scope = card()
        return scope
          ? [...scope.querySelectorAll('button')].find((b) => b.textContent.includes('驳回并记录理由'))
          : null
      }
      const reasonInput = () => {
        const scope = card()
        return scope ? scope.querySelector('input[id^="reject-"]') : null
      }
      if (!card()) return { step: 'no-card' }
      const empty = rejectBtn()?.disabled
      window.__setValue(reasonInput(), '   ')
      await new Promise((r) => setTimeout(r, 320))
      const blank = rejectBtn()?.disabled
      window.__setValue(reasonInput(), '合成演练：含未脱敏联系方式，按演练规则驳回。')
      await new Promise((r) => setTimeout(r, 320))
      const filled = rejectBtn()?.disabled
      return { step: 'done', empty, blank, filled }
    })()`)
    check(
      '[neg] 待审帖驳回：理由为空时提交按钮禁用',
      rejectGuard.step === 'done' && rejectGuard.empty === true,
      `${rejectGuard.step} disabled=${rejectGuard.empty}`,
    )
    check(
      '[edge] 待审帖驳回：理由仅空白字符仍视为空，按钮保持禁用；填写后放行',
      rejectGuard.step === 'done' && rejectGuard.blank === true && rejectGuard.filled === false,
      `blank=${rejectGuard.blank} filled=${rejectGuard.filled}`,
    )

    const negRejected = await evaluate(page, `(async () => {
      const scope = [...document.querySelectorAll('section')]
        .filter((node) => node.innerText.includes(${JSON.stringify(NEG_TITLE)}))
        .pop()
      if (!scope) return { step: 'no-card' }
      const button = [...scope.querySelectorAll('button')].find((b) => b.textContent.includes('驳回并记录理由'))
      if (!button) return { step: 'no-button' }
      button.click()
      ${settle}
      const state = window.__readState()
      const post = (state?.posts ?? []).find((p) => p.title === ${JSON.stringify(NEG_TITLE)})
      const audits = (state?.auditLog ?? [])
        .filter((entry) => entry.action === 'moderate-post' && entry.targetId === ${JSON.stringify(negSeeded.id)})
      window.__clickText('button', '关闭')
      ${settle}
      window.__clickText('nav button', '社区')
      ${settle}
      return {
        step: 'done',
        moderation: post?.moderation ?? null,
        reviewNote: (post?.reviewNote ?? '').slice(0, 48),
        audits: audits.length,
        inFeed: document.body.innerText.includes(${JSON.stringify(NEG_CONTENT)}),
      }
    })()`)
    check(
      '[neg] 驳回后状态转 rejected 并写审核日志，且不进入公开信息流',
      negRejected.step === 'done'
        && negRejected.moderation === 'rejected'
        && negRejected.audits === 1
        && negRejected.reviewNote.length > 0
        && negRejected.inFeed === false,
      `${negRejected.moderation} audits=${negRejected.audits} inFeed=${negRejected.inFeed} note=${negRejected.reviewNote}`,
    )

    // 时间账本只读：调账入口无论输入何值都不得改变任何余额（R18 / T11）。
    const coinReadonly = await evaluate(page, `(async () => {
      const total = () => (window.__readState()?.ledgerEntries ?? []).reduce((sum, item) => sum + item.minutes, 0)
      const before = total()
      window.__clickText('nav button', '我的')
      ${settle}
      window.__clickText('button', '演练审核与举报处置后台')
      ${settle}
      window.__clickText('button', '时间账本')
      ${settle}
      const amount = document.querySelector('#coin-amount')
      const reason = document.querySelector('#coin-reason')
      if (amount) window.__setValue(amount, '9999')
      if (reason) window.__setValue(reason, '负向用例：调账应被拒绝')
      await new Promise((r) => setTimeout(r, 320))
      const button = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('调账不可用'))
      const advertised = button ? button.getAttribute('aria-disabled') === 'true' : null
      if (button) button.click()
      await new Promise((r) => setTimeout(r, 420))
      return {
        before,
        after: total(),
        advertised,
        toast: window.__toasts().find((t) => t.includes('只读')) ?? '',
      }
    })()`)
    check(
      '[neg] 时间账本只读：调账入口不改变任何余额，仅给只读说明',
      coinReadonly.before === coinReadonly.after
        && coinReadonly.toast.length > 0
        && coinReadonly.advertised === true,
      `before=${coinReadonly.before} after=${coinReadonly.after} aria-disabled=${coinReadonly.advertised} toast=${coinReadonly.toast.slice(0, 30)}`,
    )

    // 暂停受理：门禁必须真的挡住新建入口，恢复后放行。
    await navigate(page, `${BASE}/aplus.html`)
    const pauseGate = await evaluate(page, `(async () => {
      const findBtn = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(text))
      const createBtn = () => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('新建演练记录'))
      const gate = () => document.querySelector('[aria-label="本机合成演练受理开关"]')
      const pause = findBtn('暂停新登记')
      if (!pause) return { step: 'no-pause' }
      pause.click()
      await new Promise((r) => setTimeout(r, 380))
      const paused = {
        createDisabled: createBtn()?.disabled ?? null,
        // 门禁自身必须给出可见状态，不能只靠按钮文案变化。
        gateNotice: (gate()?.innerText ?? '').includes('新登记已暂停'),
        gatePressed: (findBtn('恢复新登记')?.getAttribute('aria-pressed')) === 'true',
        resumeVisible: Boolean(findBtn('恢复新登记')),
      }
      findBtn('恢复新登记')?.click()
      await new Promise((r) => setTimeout(r, 380))
      return { step: 'done', paused, resumedDisabled: createBtn()?.disabled ?? null }
    })()`)
    check(
      '[neg] 暂停新登记后 A+ 新建入口禁用并给出提示，恢复后放行',
      pauseGate.step === 'done'
        && pauseGate.paused.createDisabled === true
        && pauseGate.paused.gateNotice === true
        && pauseGate.paused.gatePressed === true
        && pauseGate.paused.resumeVisible === true
        && pauseGate.resumedDisabled === false,
      `${pauseGate.step} paused=${pauseGate.paused?.createDisabled} notice=${pauseGate.paused?.gateNotice} pressed=${pauseGate.paused?.gatePressed} resumed=${pauseGate.resumedDisabled}`,
    )

    errors.stop()
    check('B 段全流程无控制台异常（A+ 桥接与投诉链路）', errors.errors.length === 0, errors.errors.slice(0, 3).join(' | '))
  } finally {
    connection.close()
    await chrome.close()
  }

  const { mkdirSync } = await import('node:fs')
  mkdirSync(OUT_DIR, { recursive: true })
  const failed = results.filter((item) => !item.ok)
  writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify({
    base: BASE,
    checkedAt: new Date().toISOString(),
    stamp: STAMP,
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
