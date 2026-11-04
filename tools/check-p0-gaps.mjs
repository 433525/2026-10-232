/**
 * check-p0-gaps.mjs — P0 覆盖缺口补测（I-02 / W2 序 2）。
 *
 * 覆盖四个「有界面入口、无断言」的写动作，共 12 条：
 *   1. `adminRejectCommentWithReason`（4 条）：理由门禁、落库、审计留痕、同帖旁路不受影响；
 *   2. `cancelOrder`（3 条）：终态与标签、`cancel` 留痕、不产生结算；
 *   3. `verifyRealName`（3 条）：未同意被拒、切换成功且不落证件号、刷新回落（内存态）；
 *   4. `markAllMessagesRead`（2 条）：角标与按钮态、刷新后不回弹。
 *
 * 与 `check-fixes*.mjs` 共用 `tools/lib/fixes-helpers.mjs`；本脚本自建前置数据，
 * 不依赖任何此前脚本的执行顺序，可单独运行。
 *
 * 用法：先 build + preview 到 5180，再 `node tools/check-p0-gaps.mjs`。
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
import { SETTLE as settle, makeHelpers } from './lib/fixes-helpers.mjs'

const BASE = process.env.BASE_URL ?? 'http://localhost:5180'
const OUT_DIR = join(process.cwd(), 'docs', 'evidence', 'p0-gaps')
const STATE_KEY = 'community-mvp.synthetic-state.v1'
const READ_KEY = 'community.ui.read-messages'

const STAMP = Date.now().toString(36)
const P_TITLE = `演练-P0评论驳回-${STAMP}`
const P_CONTENT = `合成演练-${STAMP}：验证评论维度驳回的理由门禁、落库与留痕。`
const C_OK = `已通过评论-${STAMP}`
const C_BAD = `待驳回评论-${STAMP}`
const REJECT_REASON = `评论含站外引流-${STAMP}`
const H_TITLE = `演练-P0取消订单-${STAMP}`
const CANCEL_REASON = '时间安排冲突'

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function main() {
  const chrome = await launchChrome({ port: 9352 })
  const connection = await new CDPConnection(chrome.version.webSocketDebuggerUrl).open()

  try {
    const page = await connection.newPage()
    const errors = collectErrors(page)
    page.on('Page.javascriptDialogOpening', () => {
      page.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {})
    })
    await setViewport(page, 1440, 1000)
    await navigate(page, `${BASE}/`)
    const HELPERS = makeHelpers(STATE_KEY)
    await evaluate(page, HELPERS)

    /* ── 0. 前置数据：一条待审动态 → 审核通过 ─────────────────────── */
    const seeded = await evaluate(page, `(async () => {
      await window.__switchIdentity('已实名')
      window.__clickText('nav button', '发布')
      ${settle}
      window.__clickText('button', '志愿动态')
      ${settle}
      window.__setValue(document.querySelector('#post-title'), ${JSON.stringify(P_TITLE)})
      window.__setValue(document.querySelector('#post-content'), ${JSON.stringify(P_CONTENT)})
      ${settle}
      window.__clickText('button', '发布并同步至社区')
      ${settle}
      const post = (window.__readState()?.posts ?? []).find((p) => p.title === ${JSON.stringify(P_TITLE)})
      return { id: post?.id ?? '', moderation: post?.moderation ?? null }
    })()`)
    if (!seeded.id || seeded.moderation !== 'pending') {
      throw new Error(`前置动态未进入待审：${JSON.stringify(seeded)}`)
    }

    await evaluate(page, `(async () => {
      await window.__switchIdentity('审核员')
      window.__clickText('nav button', '我的')
      ${settle}
      window.__clickText('button', '演练审核与举报处置后台')
      ${settle}
      window.__clickIn(${JSON.stringify(P_TITLE)}, '审核通过并公开')
      ${settle}
      window.__clickText('button', '关闭')
      ${settle}
      await window.__switchIdentity('已实名')
      return true
    })()`)

    /* ── 1. 评论：先造一条已通过、再留一条待审 ────────────────────── */
    const addComment = async (text) => evaluate(page, `(async () => {
      window.__clickText('nav button', '社区')
      ${settle}
      const card = [...document.querySelectorAll('[id^="post-SYNTH-"]')]
        .find((node) => node.textContent.includes(${JSON.stringify(P_CONTENT)}))
      if (!card) return { step: 'no-card' }
      const toggle = card.querySelector('button[aria-label^="评论（"]')
      if (!toggle) return { step: 'no-toggle' }
      if (toggle.getAttribute('aria-expanded') !== 'true') {
        toggle.click()
        ${settle}
      }
      const input = card.querySelector('input[aria-label="评论内容"]')
      if (!input) return { step: 'no-input' }
      window.__setValue(input, ${JSON.stringify(text)})
      ${settle}
      const send = [...card.querySelectorAll('.nl-comment-form button')]
        .find((b) => b.textContent.includes('发送'))
      if (!send) return { step: 'no-send' }
      send.click()
      ${settle}
      const post = (window.__readState()?.posts ?? []).find((p) => p.title === ${JSON.stringify(P_TITLE)})
      const comment = (post?.comments ?? []).find((c) => c.content === ${JSON.stringify(text)})
      return { step: 'done', id: comment?.id ?? '', moderation: comment?.moderation ?? null }
    })()`)

    const approvedSeed = await addComment(C_OK)
    if (approvedSeed.moderation !== 'pending') {
      throw new Error(`已通过评论种子未写入待审：${JSON.stringify(approvedSeed)}`)
    }
    await evaluate(page, `(async () => {
      await window.__switchIdentity('审核员')
      window.__clickText('nav button', '我的')
      ${settle}
      window.__clickText('button', '演练审核与举报处置后台')
      ${settle}
      window.__clickIn(${JSON.stringify(C_OK)}, '审核通过并展示')
      ${settle}
      window.__clickText('button', '关闭')
      ${settle}
      await window.__switchIdentity('已实名')
      return true
    })()`)

    const pendingComment = await addComment(C_BAD)
    if (pendingComment.moderation !== 'pending') {
      throw new Error(`待驳回评论未写入待审：${JSON.stringify(pendingComment)}`)
    }

    /* ── 2. 评论驳回：四条 ────────────────────────────────────────── */
    await evaluate(page, `(async () => {
      await window.__switchIdentity('审核员')
      window.__clickText('nav button', '我的')
      ${settle}
      window.__clickText('button', '演练审核与举报处置后台')
      ${settle}
      return true
    })()`)

    const guarded = await evaluate(page, `(async () => {
      const scopeOf = () => [...document.querySelectorAll('section')]
        .find((node) => node.textContent.includes(${JSON.stringify(C_BAD)}))
      const scope = scopeOf()
      if (!scope) return { step: 'no-card' }
      const input = scope.querySelector('input.nl-field')
      const button = [...scope.querySelectorAll('button')]
        .find((b) => b.textContent.includes('驳回并记录理由'))
      if (!input || !button) return { step: 'no-controls' }
      const stateBefore = window.__readState()
      const auditBefore = (stateBefore?.auditLog ?? []).length
      const toastsBefore = window.__toasts().length
      const disabledWhenEmpty = button.disabled === true
      // 空值态点击：DOM 禁用后点击不产生副作用，用状态未变来判定。
      button.click()
      ${settle}
      const afterEmptyClick = window.__readState()
      const emptyClickSideEffect =
        (afterEmptyClick?.auditLog ?? []).length !== auditBefore
        || window.__toasts().length !== toastsBefore

      window.__setValue(input, '   ')
      ${settle}
      const disabledWhenBlank = button.disabled === true
      button.click()
      ${settle}
      const afterBlank = window.__readState()
      const blankModeration = (afterBlank?.posts ?? [])
        .find((p) => p.id === ${JSON.stringify(seeded.id)})
        ?.comments?.find((c) => c.id === ${JSON.stringify(pendingComment.id)})?.moderation ?? null
      return {
        step: 'done',
        disabledWhenEmpty,
        emptyClickSideEffect,
        disabledWhenBlank,
        auditBefore,
        auditAfterBlank: (afterBlank?.auditLog ?? []).length,
        blankModeration,
        cardStillThere: Boolean(scopeOf()),
      }
    })()`)
    check(
      '[neg] 评论驳回：理由为空时提交禁用，点击不写审核日志',
      guarded.step === 'done'
        && guarded.disabledWhenEmpty === true
        && guarded.emptyClickSideEffect === false
        && guarded.auditBefore === guarded.auditAfterBlank,
      `${guarded.step} disabled=${guarded.disabledWhenEmpty} sideEffect=${guarded.emptyClickSideEffect} audit=${guarded.auditBefore}→${guarded.auditAfterBlank}`,
    )
    check(
      '[neg] 评论驳回：仅空白仍禁用，审核状态与队列保持待审',
      guarded.step === 'done'
        && guarded.disabledWhenBlank === true
        && guarded.blankModeration === 'pending'
        && guarded.cardStillThere === true,
      `disabled=${guarded.disabledWhenBlank} moderation=${guarded.blankModeration} card=${guarded.cardStillThere}`,
    )

    const rejected = await evaluate(page, `(async () => {
      const scope = [...document.querySelectorAll('section')]
        .find((node) => node.textContent.includes(${JSON.stringify(C_BAD)}))
      if (!scope) return { step: 'no-card' }
      const input = scope.querySelector('input.nl-field')
      window.__setValue(input, ${JSON.stringify(REJECT_REASON)})
      ${settle}
      const button = [...scope.querySelectorAll('button')]
        .find((b) => b.textContent.includes('驳回并记录理由'))
      const enabledAfterFill = button ? button.disabled === false : false
      if (button) button.click()
      ${settle}
      const state = window.__readState()
      const post = (state?.posts ?? []).find((p) => p.id === ${JSON.stringify(seeded.id)})
      const target = (post?.comments ?? []).find((c) => c.id === ${JSON.stringify(pendingComment.id)})
      const audit = (state?.auditLog ?? [])
      const entry = audit[audit.length - 1]
      const stillListed = Boolean([...document.querySelectorAll('section')]
        .find((node) => node.textContent.includes(${JSON.stringify(C_BAD)})))
      return {
        step: 'done',
        enabledAfterFill,
        moderation: target?.moderation ?? null,
        reviewNote: target?.reviewNote ?? '',
        auditAction: entry?.action ?? '',
        auditTarget: entry?.targetId ?? '',
        auditReason: entry?.reason ?? '',
        stillListed,
        publicText: document.body.innerText.includes(${JSON.stringify(C_BAD)}),
      }
    })()`)
    check(
      '评论驳回：落库 rejected、理由入审核日志、待审卡下架',
      rejected.step === 'done'
        && rejected.enabledAfterFill === true
        && rejected.moderation === 'rejected'
        && rejected.reviewNote === REJECT_REASON
        && rejected.auditAction === 'moderate-comment'
        && rejected.auditTarget === pendingComment.id
        && rejected.auditReason === REJECT_REASON
        && rejected.stillListed === false,
      `mod=${rejected.moderation} note=${rejected.reviewNote?.slice(0, 12)} audit=${rejected.auditAction}/${rejected.auditTarget} listed=${rejected.stillListed}`,
    )

    const sibling = await evaluate(page, `(async () => {
      const state = window.__readState()
      const post = (state?.posts ?? []).find((p) => p.id === ${JSON.stringify(seeded.id)})
      const comments = post?.comments ?? []
      const approved = comments.filter((c) => (c.moderation ?? 'pending') === 'approved')
      return {
        step: 'done',
        total: comments.length,
        approved: approved.length,
        okContent: approved.some((c) => c.content === ${JSON.stringify(C_OK)}),
        okId: approved.some((c) => c.id === ${JSON.stringify(approvedSeed.id)}),
      }
    })()`)
    check(
      '[edge] 评论驳回：同帖已通过评论不变，公开评论只少一条',
      sibling.step === 'done'
        && sibling.okId === true && sibling.okContent === true
        && sibling.approved === 1 && sibling.total === 2,
      `approved=${sibling.approved}/${sibling.total} okId=${sibling.okId} content=${sibling.okContent}`,
    )

    await pressEscape(page)
    await new Promise((resolve) => setTimeout(resolve, 300))

    /* ── 3. 取消订单：发布 → 审核通过 → 发布者取消（published 态才有入口） ── */
    const orderSeed = await evaluate(page, `(async () => {
      await window.__switchIdentity('已实名')
      window.__clickText('nav button', '发布')
      ${settle}
      window.__setValue(document.querySelector('#help-title'), ${JSON.stringify(H_TITLE)})
      window.__setValue(document.querySelector('#help-desc'), '合成演练：验证取消订单的终态、留痕与不结算。')
      const boxes = [...document.querySelectorAll('input[type="checkbox"]')]
      boxes.forEach((box) => { if (!box.checked) box.click() })
      ${settle}
      window.__clickText('button', '确认发布到接单大厅')
      ${settle}
      const post = (window.__readState()?.posts ?? []).find((p) => p.title === ${JSON.stringify(H_TITLE)})
      return { id: post?.id ?? '', moderation: post?.moderation ?? null, status: post?.orderStatus ?? null }
    })()`)
    if (!orderSeed.id || orderSeed.moderation !== 'pending') {
      throw new Error(`取消订单种子未进入待审：${JSON.stringify(orderSeed)}`)
    }

    await evaluate(page, `(async () => {
      await window.__switchIdentity('审核员')
      window.__clickText('nav button', '我的')
      ${settle}
      window.__clickText('button', '演练审核与举报处置后台')
      ${settle}
      window.__clickIn(${JSON.stringify(H_TITLE)}, '审核通过并公开')
      ${settle}
      window.__clickText('button', '关闭')
      ${settle}
      await window.__switchIdentity('已实名')
      return true
    })()`)

    const CANCEL_EXPR = `(async () => {
      try {
      window.__clickText('nav button', '我的')
      ${settle}
      const card = [...document.querySelectorAll('#profile-orders div.cursor-pointer')]
        .find((node) => node.textContent.includes(${JSON.stringify(H_TITLE)}))
      if (!card) return { step: 'no-card' }
      card.click()
      ${settle}
      const before = window.__readState()
      const beforePost = (before?.posts ?? []).find((p) => p.id === ${JSON.stringify(orderSeed.id)})
      const ledgerBefore = (before?.ledgerEntries ?? []).map((e) => e.id ?? '').join(',')
      const eventsBefore = (beforePost?.orderEvents ?? []).length

      window.__clickText('button', '取消订单')
      ${settle}
      const select = document.querySelector('#cancel-reason')
      const hasSelect = Boolean(select)
      const options = select ? [...select.options].map((o) => o.value) : []
      window.__setValue(select, ${JSON.stringify(CANCEL_REASON)})
      ${settle}
      const confirm = [...document.querySelectorAll('button')]
        .find((b) => b.textContent.includes('确认取消'))
      if (!confirm) return { step: 'no-confirm', hasSelect, options }
      confirm.click()
      ${settle}

      const after = window.__readState()
      const post = (after?.posts ?? []).find((p) => p.id === ${JSON.stringify(orderSeed.id)})
      const events = post?.orderEvents ?? []
      const last = events[events.length - 1]
      // 详情在取消后自动关闭，终态文案改由「我的订单」卡片承担（OrderDetailModal 的
      // 「订单已取消」在关闭瞬间已不可见，故两处分别取值，避免用全局 body 文本误判）。
      window.__clickText('nav button', '我的')
      ${settle}
      const orderCard = [...document.querySelectorAll('#profile-orders div.cursor-pointer')]
        .find((node) => node.textContent.includes(${JSON.stringify(H_TITLE)}))
      const cardText = orderCard?.innerText ?? ''
      return {
        step: 'done',
        hasSelect,
        options,
        orderStatus: post?.orderStatus ?? '',
        statusLabel: cardText.includes('已取消'),
        detailClosed: !document.body.innerText.includes('互助求助订单详情'),
        eventsBefore,
        eventsAfter: events.length,
        lastType: last?.type ?? '',
        lastNote: last?.note ?? '',
        ledgerBefore,
        ledgerAfter: (after?.ledgerEntries ?? []).map((e) => e.id ?? '').join(','),
        toast: window.__toasts().slice(-1)[0] ?? '',
      }
      } catch (error) {
        return { step: 'threw', message: String(error?.message ?? error), stack: String(error?.stack ?? '').slice(0, 240) }
      }
    })()`
    if (process.env.DUMP_EXPR) { writeFileSync('tools/_scratch/_cancel-expr.js', CANCEL_EXPR); }
    const cancelResult = await evaluate(page, CANCEL_EXPR)
    check(
      '取消订单：终态为已取消，详情标签与弹层同步',
      cancelResult.step === 'done'
        && cancelResult.hasSelect === true
        && cancelResult.orderStatus === 'cancelled-local-demo'
        && cancelResult.statusLabel === true
        && cancelResult.detailClosed === true,
      `${cancelResult.step} status=${cancelResult.orderStatus} label=${cancelResult.statusLabel} closed=${cancelResult.detailClosed}`,
    )
    check(
      '取消订单：留痕新增 cancel 事件且原因写入说明',
      cancelResult.step === 'done'
        && cancelResult.eventsAfter === (cancelResult.eventsBefore ?? 0) + 1
        && cancelResult.lastType === 'cancel'
        && String(cancelResult.lastNote ?? '').includes(CANCEL_REASON),
      `events=${cancelResult.eventsBefore}→${cancelResult.eventsAfter} type=${cancelResult.lastType} note=${String(cancelResult.lastNote ?? '').slice(0, 24)}`,
    )
    check(
      '[neg] 取消订单：不产生结算，账本条目集合完全不变',
      cancelResult.step === 'done'
        && cancelResult.ledgerAfter === cancelResult.ledgerBefore,
      `ledgerUnchanged=${cancelResult.ledgerAfter === cancelResult.ledgerBefore}`,
    )

    /* ── 4. 全部已读：角标、副标题、按钮态、刷新不回弹 ─────────────── */
    const readFlow = await evaluate(page, `(async () => {
      window.__clickText('nav button', '消息')
      ${settle}
      const dotBefore = document.querySelectorAll('.nl-iconbtn__dot').length
      const labelBefore = document.querySelector('header button[aria-label^="消息"]')?.getAttribute('aria-label') ?? ''
      const button = [...document.querySelectorAll('button')]
        .find((b) => b.textContent.includes('全部已读'))
      if (!button) return { step: 'no-button', dotBefore, labelBefore }
      const disabledBefore = button.disabled === true
      button.click()
      ${settle}
      const subtitle = document.querySelector('.nl-page-sub')?.textContent ?? ''
      const buttonAfter = [...document.querySelectorAll('button')]
        .find((b) => b.textContent.includes('全部已读'))
      const rawRead = JSON.parse(localStorage.getItem(${JSON.stringify(READ_KEY)}) || 'null')
      const readIds = Array.isArray(rawRead) ? rawRead : (rawRead?.data ?? [])
      return {
        step: 'done',
        dotBefore,
        labelBefore,
        disabledBefore,
        dotAfter: document.querySelectorAll('.nl-iconbtn__dot').length,
        subtitle,
        disabledAfter: buttonAfter ? buttonAfter.disabled === true : null,
        unreadTags: (document.body.innerText.match(/未读/g) ?? []).length,
        readCount: Array.isArray(readIds) ? readIds.length : -1,
      }
    })()`)
    check(
      '全部已读：入口角标清零、副标题与按钮禁用态同步',
      readFlow.step === 'done'
        && readFlow.dotBefore > 0
        && readFlow.disabledBefore === false
        && readFlow.dotAfter === 0
        && readFlow.subtitle.includes('全部已读')
        && readFlow.disabledAfter === true,
      `${readFlow.step} dot=${readFlow.dotBefore}→${readFlow.dotAfter} disabled=${readFlow.disabledBefore}→${readFlow.disabledAfter} sub=${String(readFlow.subtitle ?? '').slice(0, 18)}`,
    )

    await navigate(page, `${BASE}/`)
    await evaluate(page, HELPERS)
    const persisted = await evaluate(page, `(async () => {
      window.__clickText('nav button', '消息')
      ${settle}
      const rawRead = JSON.parse(localStorage.getItem(${JSON.stringify(READ_KEY)}) || 'null')
      const readIds = Array.isArray(rawRead) ? rawRead : (rawRead?.data ?? [])
      return {
        step: 'done',
        dotAfterReload: document.querySelectorAll('.nl-iconbtn__dot').length,
        unreadTags: (document.body.innerText.match(/未读/g) ?? []).length,
        readCount: Array.isArray(readIds) ? readIds.length : -1,
        subtitle: document.querySelector('.nl-page-sub')?.textContent ?? '',
      }
    })()`)
    check(
      '[edge] 全部已读：刷新后未读不回弹，已读集合只增不减',
      persisted.step === 'done'
        && persisted.dotAfterReload === 0
        && persisted.unreadTags === 0
        && persisted.readCount === readFlow.readCount
        && persisted.readCount > 0,
      `dot=${persisted.dotAfterReload} tags=${persisted.unreadTags} read=${readFlow.readCount}→${persisted.readCount}`,
    )

    /* ── 5. 实名：未同意被拒 → 勾选切换 → 刷新回落且无残留 ─────────── */
    const verifyFlow = await evaluate(page, `(async () => {
      await window.__switchIdentity('访客')
      window.__clickText('nav button', '我的')
      ${settle}
      const tagBefore = document.querySelector('section.nl-user-card .nl-tag')?.textContent?.trim() ?? ''
      const entry = document.querySelector('button[aria-label="实名认证与身份信息"]')
      if (!entry) return { step: 'no-entry', tagBefore }
      entry.click()
      ${settle}
      const form = document.querySelector('#realname-form')
      if (!form) return { step: 'no-form', tagBefore }
      const submit = document.querySelector('button[form="realname-form"]')
      submit.click()
      ${settle}
      const alertText = form.querySelector('[role="alert"]')?.textContent?.trim() ?? ''
      const stillOpen = Boolean(document.querySelector('#realname-form'))
      const tagAfterReject = document.querySelector('section.nl-user-card .nl-tag')?.textContent?.trim() ?? ''
      const successToast = window.__toasts().some((t) => t.includes('已切换为'))
      const checkbox = form.querySelector('input[type="checkbox"]')
      if (checkbox && !checkbox.checked) checkbox.click()
      ${settle}
      submit.click()
      ${settle}
      const tagAfterAccept = document.querySelector('section.nl-user-card .nl-tag')?.textContent?.trim() ?? ''
      const closedAfterAccept = !document.querySelector('#realname-form')
      const acceptToast = window.__toasts().some((t) => t.includes('不采集身份证号'))
      const dump = JSON.stringify(localStorage)
      return {
        step: 'done',
        tagBefore,
        alertText,
        stillOpen,
        tagAfterReject,
        successToast,
        tagAfterAccept,
        closedAfterAccept,
        acceptToast,
        hasIdPattern: /[1-9]\\d{16}[\\dXx]/.test(dump),
        hasIdKey: /idcard|idCard|realname/i.test(Object.keys(localStorage).join(',')),
      }
    })()`)
    check(
      '[neg] 实名：未勾选同意被拒，弹层与未实名身份均保持',
      verifyFlow.step === 'done'
        && verifyFlow.alertText.includes('请先确认')
        && verifyFlow.stillOpen === true
        && verifyFlow.tagBefore === '未实名'
        && verifyFlow.tagAfterReject === '未实名'
        && verifyFlow.successToast === false,
      `${verifyFlow.step} alert=${String(verifyFlow.alertText ?? '').slice(0, 12)} open=${verifyFlow.stillOpen} tag=${verifyFlow.tagBefore}→${verifyFlow.tagAfterReject}`,
    )
    check(
      '实名：勾选后切换为演练成员，且不落任何证件号',
      verifyFlow.step === 'done'
        && verifyFlow.closedAfterAccept === true
        && verifyFlow.tagAfterAccept === '已实名'
        && verifyFlow.acceptToast === true
        && verifyFlow.hasIdPattern === false
        && verifyFlow.hasIdKey === false,
      `tag=${verifyFlow.tagAfterReject}→${verifyFlow.tagAfterAccept} closed=${verifyFlow.closedAfterAccept} id=${verifyFlow.hasIdPattern} key=${verifyFlow.hasIdKey}`,
    )

    await navigate(page, `${BASE}/`)
    await evaluate(page, HELPERS)
    const reset = await evaluate(page, `(async () => {
      window.__clickText('nav button', '我的')
      ${settle}
      return {
        step: 'done',
        tag: document.querySelector('section.nl-user-card .nl-tag')?.textContent?.trim() ?? '',
        hasIdKey: /idcard|idCard|realname/i.test(Object.keys(localStorage).join(',')),
      }
    })()`)
    check(
      '[edge] 实名：状态仅存内存，刷新回落访客且无实名残留键',
      reset.step === 'done' && reset.tag === '未实名' && reset.hasIdKey === false,
      `tag=${reset.tag} key=${reset.hasIdKey}`,
    )

    errors.stop()
    if (errors.errors.length) {
      console.error(`控制台异常（不计入断言）：${errors.errors.slice(0, 3).join(' | ')}`)
      process.exitCode = 1
    }
  } finally {
    connection.close()
    await chrome.close()
  }

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
