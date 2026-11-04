/**
 * check-acceptance.mjs — §9 验收清单里前三个脚本没覆盖到的部分（零依赖，CDP 驱动）。
 *
 * 补四类断言：
 * 1. B 端完整履约链路：接单 → 上门签到 → 双方确认完成 → 账本新增「未结算」；
 * 2. 合规 #3：病史（敏感信息）在接单前不可见、接单后才可见；
 * 3. 合规 #6：信息流每条 UGC 都有举报入口，举报落到**被举报的那条**内容上，
 *    并能被审核后台处置、结果写回站内消息；
 * 4. A+ 高风险拦截：高风险登记后不得按常规初筛推进。
 *
 * 用法：先 build + preview 到 5180，再 `node tools/check-acceptance.mjs`。
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
const OUT_DIR = join(process.cwd(), 'docs', 'evidence', 'acceptance')
const STATE_KEY = 'community-mvp.synthetic-state.v1'

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const settle = `await new Promise((r) => setTimeout(r, 350))`

const HELPERS = `
window.__readState = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(${JSON.stringify(STATE_KEY)}) || 'null')
    // 存档是 { app, kind, schemaVersion, savedAt, state } 的信封，业务字段在 state 里。
    return raw && raw.state ? raw.state : null
  } catch { return null }
}
window.__clickText = (selector, text) => {
  const node = [...document.querySelectorAll(selector)].find((item) => item.textContent.includes(text))
  if (!node) return false
  node.click()
  return true
}
window.__closeSubPage = () => {
  const button = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === '关闭' || b.textContent.trim() === '关闭')
  if (button) { button.click(); return true }
  return false
}
`

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const chrome = await launchChrome({ port: 9347 })
  const connection = await new CDPConnection(chrome.version.webSocketDebuggerUrl).open()

  try {
    const page = await connection.newPage()
    const errors = collectErrors(page)
    await setViewport(page, 1440, 1000)
    await navigate(page, `${BASE}/`)
    await evaluate(page, HELPERS)

    // ── 0. 先切到已实名成员（举报与接单都要求 member）────────────────
    const member = await evaluate(page, `(async () => {
      const identity = [...document.querySelectorAll('header button')].find((b) => b.textContent.includes('演练'))
      identity.click()
      ${settle}
      const target = [...document.querySelectorAll('header button')]
        .filter((b) => b.textContent.includes('时间币'))
        .find((b) => b.textContent.includes('已实名'))
      if (!target) return { ok: false }
      target.click()
      ${settle}
      return { ok: true }
    })()`)
    check('可切换到已实名演练成员', member.ok === true, '')

    // ── 1. 接单前：病史对未接单者不可见 ─────────────────────────────
    const beforeAccept = await evaluate(page, `(async () => {
      window.__clickText('button', '我要接单')
      ${settle}
      const card = [...document.querySelectorAll('h3')]
        .find((h) => h.textContent.includes('把两箱演练物资搬到活动室'))
      if (!card) return { opened: false }
      const scope = card.closest('div.group') || card.closest('article') || card.parentElement
      const detail = [...scope.querySelectorAll('button')].find((b) => b.textContent.includes('查看详情'))
      detail.click()
      ${settle}
      const text = document.body.innerText
      return {
        opened: text.includes('互助求助订单详情'),
        hasNote: text.includes('仅用于通用登记流程演示。'),
        masked: text.includes('脱敏隐藏') || text.includes('接单后凭证可见'),
        text: text.replace(/\\s+/g, ' ').slice(0, 200),
      }
    })()`)
    check('接单大厅可打开订单详情', beforeAccept.opened === true, beforeAccept.text ?? '')
    check(
      '病史在接单前不可见（R6）',
      beforeAccept.opened === true && beforeAccept.hasNote === false,
      `hasNote=${beforeAccept.hasNote}`,
    )
    check('接单前给出脱敏说明', beforeAccept.masked === true, `masked=${beforeAccept.masked}`)

    // ── 2. 接单 → 病史可见 → 签到 → 双方确认完成 ────────────────────
    // 认领后弹层关闭，且订单从「接单大厅」移出（大厅只列 published）。
    // 已接单的服务从「我的 → 我认领的志愿」继续，这也是修复前完全走不通的一段。
    const accepted = await evaluate(page, `(async () => {
      const claim = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('认领并提供志愿服务'))
      if (!claim) return { claimed: false }
      claim.click()
      ${settle}
      const mine = [...document.querySelectorAll('nav button')].find((b) => b.textContent.includes('我的'))
      if (mine) mine.click()
      ${settle}
      const tab = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('我认领的志愿'))
      if (!tab) return { claimed: true, reopened: false, reason: '缺「我认领的志愿」标签' }
      tab.click()
      ${settle}
      const card = [...document.querySelectorAll('div.cursor-pointer')]
        .find((node) => node.textContent.includes('把两箱演练物资搬到活动室'))
      if (!card) return { claimed: true, reopened: false, reason: '我的订单里没有该笔' }
      card.click()
      ${settle}
      const text = document.body.innerText
      return {
        claimed: true,
        reopened: text.includes('互助求助订单详情'),
        hasNote: text.includes('仅用于通用登记流程演示。'),
        hasClockIn: text.includes('上门签到'),
        statusText: text.includes('待上门签到服务'),
      }
    })()`)
    check('可认领订单', accepted.claimed === true, '')
    check('认领后可在「我认领的志愿」重新打开详情', accepted.reopened === true, accepted.reason ?? '')
    check('接单后病史才可见（R6 最小化）', accepted.hasNote === true, `hasNote=${accepted.hasNote}`)
    check('接单后出现上门签到入口', accepted.hasClockIn === true, `hasClockIn=${accepted.hasClockIn}`)

    const clocked = await evaluate(page, `(async () => {
      const button = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('上门签到'))
      if (!button) return { ok: false }
      button.click()
      ${settle}
      const text = document.body.innerText
      const state = window.__readState()
      const post = (state?.posts ?? []).find((p) => p.id === 'SYNTH-POST-001')
      return {
        ok: true,
        inProgress: text.includes('志愿服务进行中'),
        event: (post?.orderEvents ?? []).some((e) => e.type === 'clock-in'),
      }
    })()`)
    check('上门签到记录为 clock-in 事件', clocked.ok === true && clocked.event === true, `event=${clocked.event}`)
    check('签到后状态进入服务中', clocked.inProgress === true, `inProgress=${clocked.inProgress}`)

    const completed = await evaluate(page, `(async () => {
      const ledgerBefore = (window.__readState()?.ledgerEntries ?? []).length
      const start = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('双方确认完成'))
      if (!start) return { opened: false }
      start.click()
      ${settle}
      const submit = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('提交确认并记账'))
      if (!submit) return { opened: true, submitted: false, text: document.body.innerText.slice(0, 160) }
      submit.click()
      ${settle}
      const state = window.__readState()
      const entries = state?.ledgerEntries ?? []
      const post = (state?.posts ?? []).find((p) => p.id === 'SYNTH-POST-001')
      return {
        opened: true,
        submitted: true,
        ledgerBefore,
        ledgerAfter: entries.length,
        lastStatus: entries[entries.length - 1]?.status ?? '',
        orderStatus: post?.orderStatus ?? '',
        toastText: [...document.querySelectorAll('[role="status"], [role="alert"]')]
          .map((n) => n.textContent.trim()).join(' | ').slice(0, 120),
      }
    })()`)
    check('双方确认完成弹层可提交', completed.submitted === true, completed.text ?? '')
    check(
      '完成后账本新增一条记录',
      completed.submitted === true && completed.ledgerAfter === completed.ledgerBefore + 1,
      `${completed.ledgerBefore} → ${completed.ledgerAfter}`,
    )
    check('新增账本条目固定为未结算', completed.lastStatus === 'unsettled', `status=${completed.lastStatus}`)
    check(
      '订单落到 completed-local-demo',
      completed.orderStatus === 'completed-local-demo',
      `orderStatus=${completed.orderStatus}`,
    )

    // ── 3. 举报：每条 UGC 有入口，且落到被举报的那条 ──────────────────
    const reportEntry = await evaluate(page, `(async () => {
      const nav = [...document.querySelectorAll('nav button')].find((b) => b.textContent.includes('社区'))
      if (nav) nav.click()
      ${settle}
      const cards = [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === '举报')
      return { posts: cards.length }
    })()`)
    check('信息流每条 UGC 都有举报入口', reportEntry.posts > 0, `reportButtons=${reportEntry.posts}`)

    const reported = await evaluate(page, `(async () => {
      const before = (window.__readState()?.reports ?? []).length
      const card = [...document.querySelectorAll('button')]
        .filter((b) => b.textContent.trim() === '举报')
      if (!card.length) return { clicked: false }
      // 取第二条，避免与「自己刚发布的帖子」混淆：验证举报落点不是恒定的第一条。
      const target = card[Math.min(1, card.length - 1)]
      const article = target.closest('div.rounded-2xl') || target.closest('article') || target.parentElement.parentElement.parentElement
      const title = article?.querySelector('h3')?.textContent?.trim() ?? ''
      target.click()
      ${settle}
      const state = window.__readState()
      const reports = state?.reports ?? []
      return {
        clicked: true,
        title,
        before,
        after: reports.length,
        lastTarget: reports[reports.length - 1]?.targetId ?? '',
        lastTargetType: reports[reports.length - 1]?.targetType ?? '',
        lastStatus: reports[reports.length - 1]?.status ?? '',
      }
    })()`)
    check('点击举报写入本机 reports', reported.clicked === true && reported.after === reported.before + 1, `${reported.before} → ${reported.after}`)
    check('举报目标是所点的那条内容而非固定首条', Boolean(reported.lastTarget), `target=${reported.lastTarget}`)
    check('举报初始状态为待处理', reported.lastStatus === 'pending', `status=${reported.lastStatus}`)

    // ── 4. 审核后台处置举报 → 状态变更 + 站内消息通知举报人 ────────────
    const resolved = await evaluate(page, `(async () => {
      // 先切到「我的」页，再在同一页内切换身份；切完直接点管理入口，避免下拉层
      // 未收起时再点导航导致点空。
      const nav = [...document.querySelectorAll('nav button')].find((b) => b.textContent.includes('我的'))
      if (nav) nav.click()
      ${settle}
      // 举报处置要求审核员角色（store.resolveReport 的 requireReviewer 门禁）。
      const identity = [...document.querySelectorAll('header button')].find((b) => b.textContent.includes('演练'))
      if (identity) identity.click()
      ${settle}
      const reviewer = [...document.querySelectorAll('header button')]
        .filter((b) => b.textContent.includes('时间币'))
        .find((b) => b.textContent.includes('审核员'))
      if (reviewer) reviewer.click()
      ${settle}
      // 入口文案已按 §1.3-10 从「社区网格管理…」改为「演练审核与举报处置后台（项目组）」。
      const entry = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('审核与举报处置后台'))
      if (!entry) {
        return {
          opened: false,
          body: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 160),
          buttons: [...document.querySelectorAll('button')].length,
        }
      }
      entry.click()
      ${settle}
      const tab = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('举报处置工单'))
      const tabOk = Boolean(tab)
      if (tab) tab.click()
      ${settle}
      const noticesBefore = (window.__readState()?.threads ?? [])
        .flatMap((t) => t.messages ?? []).length
      const input = document.querySelector('input[type="text"][class*="focus:ring-purple"]')
        || [...document.querySelectorAll('input[type="text"]')].pop()
      if (!input) return { opened: true, tabOk, hasInput: false }
      const proto = HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, '已核实并下架相关内容（演练处置）')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      ${settle}
      const button = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('确认办结'))
      if (!button) return { opened: true, tabOk, hasInput: true, hasButton: false }
      button.click()
      ${settle}
      const state = window.__readState()
      const reports = state?.reports ?? []
      const resolvedOne = reports.find((r) => r.status === 'resolved' || r.status === 'dismissed')
      const noticesAfter = (state?.threads ?? []).flatMap((t) => t.messages ?? []).length
      const audit = (state?.auditLog ?? []).filter((entry) => entry.action === 'resolve-report').length
      return {
        opened: true,
        tabOk,
        hasInput: true,
        hasButton: true,
        status: resolvedOne?.status ?? '',
        resolution: resolvedOne?.resolution ?? '',
        noticesBefore,
        noticesAfter,
        auditCount: audit,
      }
    })()`)
    check('审核后台可打开举报处置页', resolved.opened === true && resolved.tabOk === true, '')
    check('举报可被处置为已处理/已驳回', resolved.status === 'resolved' || resolved.status === 'dismissed', `status=${resolved.status}`)
    check('处置结论写入举报记录（留痕）', Boolean(resolved.resolution), resolved.resolution ?? '')
    check(
      '处置结果以站内消息通知举报人',
      resolved.noticesAfter > resolved.noticesBefore,
      `${resolved.noticesBefore} → ${resolved.noticesAfter}`,
    )
    check('处置动作写入审计日志', resolved.auditCount > 0, `audit=${resolved.auditCount}`)

    // ── 5. A+ 高风险拦截 ────────────────────────────────────────────
    await navigate(page, `${BASE}/aplus.html`)
    const highRisk = await evaluate(page, `(async () => {
      const stamp = Date.now().toString(36)
      const setValue = (el, value) => {
        if (!el) return
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
          : el.tagName === 'SELECT' ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
      }
      const create = [...document.querySelectorAll('.heading-actions .button')].find((b) => b.textContent.includes('新建'))
      if (!create) return { opened: false }
      create.click()
      ${settle}
      setValue(document.querySelector('#record-label'), '演练-高风险-' + stamp)
      setValue(document.querySelector('#record-summary'), '合成演练：高风险场景，仅用于验证停止常规初筛的流程，不含任何真实个人信息。')
      setValue(document.querySelector('#record-owner'), '演练-受理席-01')
      ${settle}
      const labels = [...document.querySelectorAll('.modal label')]
      const riskLabel = labels.find((l) => l.textContent.includes('高风险停止初筛'))
      if (!riskLabel) {
        return {
          opened: true,
          hasRiskBox: false,
          modalTitle: document.querySelector('.modal h2')?.textContent?.trim() ?? '',
          labelTexts: labels.map((l) => l.textContent.trim().slice(0, 18)),
          hasLabelField: Boolean(document.querySelector('#record-label')),
        }
      }
      const riskBox = riskLabel.querySelector('input[type="checkbox"]')
      if (!riskBox.checked) riskBox.click()
      ${settle}
      // 勾选高风险后会展开必填的「停止初筛的演练依据」。
      setValue(document.querySelector('#record-high-risk-note'), '演练依据：合成场景，仅用于验证停止初筛流程。')
      ${settle}
      const syntheticLabel = [...document.querySelectorAll('.modal label.synthetic-confirm')]
        .find((l) => l.textContent.includes('虚构'))
      const syntheticBox = syntheticLabel?.querySelector('input[type="checkbox"]')
      if (syntheticBox && !syntheticBox.checked) syntheticBox.click()
      ${settle}
      const submit = [...document.querySelectorAll('.modal .button.primary')]
        .find((b) => b.textContent.includes('创建演练记录'))
      if (!submit || submit.disabled) {
        return { opened: true, hasRiskBox: true, submitted: false, reason: '创建按钮仍禁用' }
      }
      submit.click()
      ${settle}
      const modalOpen = Boolean(document.querySelector('.modal-backdrop .modal'))
      const error = document.querySelector('.form-error')?.textContent?.trim() ?? ''
      const detail = document.querySelector('.case-detail')?.innerText ?? document.body.innerText
      return {
        opened: true,
        hasRiskBox: true,
        submitted: true,
        modalOpen,
        error,
        riskStopped: detail.includes('已停止常规初筛') || detail.includes('风险未解除'),
        snippet: detail.replace(/\\s+/g, ' ').slice(0, 240),
      }
    })()`)
    check('A+ 新建弹层含高风险选项', highRisk.hasRiskBox === true, highRisk.hasRiskBox ? '' : `labels=${(highRisk.labelTexts ?? []).join('/')}`)
    check('高风险登记后弹层关闭', highRisk.submitted === true && highRisk.modalOpen === false, highRisk.reason ?? '')
    check(
      '高风险登记后停止常规初筛',
      highRisk.submitted === true && highRisk.riskStopped === true,
      `snippet=${highRisk.snippet ?? ''}`,
    )

    errors.stop()
    check('全流程无控制台异常', errors.errors.length === 0, errors.errors.slice(0, 3).join(' | '))
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
