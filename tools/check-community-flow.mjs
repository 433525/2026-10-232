/**
 * check-community-flow.mjs — B 端主链路 + 跨入口联动（零依赖，CDP 驱动）。
 *
 * 覆盖两条合规红线与一条跨端契约：
 * 1. 实名前置拦截：未实名访客提交求助时被挡在发布之前；
 * 2. 先审后发：已实名成员发布后进入待审，社区公开信息流看不到待审内容；
 * 3. 跨入口：A+ 社区桥能读到 B 刚写入的本机存档（同一个 localStorage 键）；
 * 4. 覆盖补齐（D-19）：点赞/收藏 toggle 往返与刷新保持、活动报名、
 *    长辈模式持久化、语音朗读的播放/停止（W5，`speechSynthesis` 打桩）；
 * 5. 回归强度（W6/W7）：举报去重、访客点赞/举报被拒、深链有效与失效两半、
 *    访客越权审核被拒、审核员不能代替成员发布、纯空白评论两层拦截。
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
// B 端 toast 同一时刻最多 3 条、3200 ms 后自动移除；取最后一条即最近一次反馈。
// 定位必须限定在 Toaster 容器内：StorageBanner 也用 role="status"/"alert"，
// 全局 querySelectorAll 会在存档异常时取到横幅而不是提示。
// 文案里含变体图标（! / ✓），故断言用 includes 而非相等。
window.__lastToast = () => {
  const host = document.querySelector('[aria-live][class*="pointer-events-none"]')
  if (!host) return ''
  const nodes = [...host.querySelectorAll('[role="status"], [role="alert"]')]
  return nodes.length ? nodes[nodes.length - 1].textContent.trim() : ''
}
window.__reportCount = () => {
  try {
    const env = JSON.parse(localStorage.getItem('community-mvp.synthetic-state.v1'))
    return (env.state.reports ?? []).length
  } catch { return -1 }
}
// 身份菜单在顶栏，菜单项用 role="menuitemradio"，文案含昵称（演练访客/演练用户/演练审核员）。
// 点击后菜单会自关，故等到下一帧再继续，避免后续点击命中已卸载的节点。
window.__switchRole = (label) => new Promise((resolve) => {
  const trigger = [...document.querySelectorAll('header button')].find((b) => b.textContent.includes('演练'))
  if (trigger && !document.querySelector('[role="menu"][aria-label="切换演示角色身份"]')) trigger.click()
  setTimeout(() => {
    const target = [...document.querySelectorAll('header button[role="menuitemradio"]')]
      .find((b) => b.textContent.includes(label))
    if (target) target.click()
    resolve(!!target)
  }, 260)
})
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

    // ── 4b. 互动往返：点赞 / 收藏（W3 覆盖补齐，D-19） ────────────────
    // 目标卡片 SYNTH-POST-004：种子 likedByMe=false / favorited=false / likeCount=5。
    // toggle 语义：点一次 +1 且 aria-pressed=true，再点回初值——两半都要判，否则「点两次加两」会假绿。
    const social = await evaluate(page, `(async () => {
      const card = () => document.querySelector('#post-SYNTH-POST-004')
      if (!card()) return { found: false }
      const likeBtn = () => card().querySelector('button[aria-label^="赞同"]')
      const markBtn = () => [...card().querySelectorAll('button')].find((b) => b.textContent.includes('收藏'))
      const readLike = () => ({
        count: Number((likeBtn().getAttribute('aria-label') || '').replace(/[^0-9]/g, '')),
        pressed: likeBtn().getAttribute('aria-pressed') === 'true',
      })
      const readMark = () => markBtn().getAttribute('aria-pressed') === 'true'
      const initial = { like: readLike(), mark: readMark() }
      likeBtn().click()
      ${settle}
      const afterLike = readLike()
      likeBtn().click()
      ${settle}
      const backLike = readLike()
      markBtn().click()
      ${settle}
      const afterMark = readMark()
      markBtn().click()
      ${settle}
      const backMark = readMark()
      return { found: true, initial, afterLike, backLike, afterMark, backMark }
    })()`)
    const likeStep = social.initial?.like.pressed ? -1 : 1
    check(
      '[edge] 点赞往返：计数按 ±1 变化后回到初值',
      social.found !== false
        && social.afterLike.count === social.initial.like.count + likeStep
        && social.afterLike.pressed === !social.initial.like.pressed
        && social.backLike.count === social.initial.like.count
        && social.backLike.pressed === social.initial.like.pressed,
      `${social.initial?.like.count} → ${social.afterLike?.count} → ${social.backLike?.count}`,
    )
    check(
      '[edge] 收藏往返：aria-pressed 置真后复原',
      social.found !== false
        && social.afterMark === !social.initial.mark
        && social.backMark === social.initial.mark,
      `initial=${social.initial?.mark} after=${social.afterMark} back=${social.backMark}`,
    )

    // ── 4c. 互动状态刷新后保持（写入同一份本机存档） ──────────────────
    const markOn = await evaluate(page, `(async () => {
      const card = document.querySelector('#post-SYNTH-POST-004')
      const likeBtn = [...card.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '').includes('赞同'))
      const markBtn = [...card.querySelectorAll('button')].find((b) => b.textContent.includes('收藏'))
      likeBtn.click()
      markBtn.click()
      ${settle}
      return {
        like: likeBtn.getAttribute('aria-pressed') === 'true',
        mark: markBtn.getAttribute('aria-pressed') === 'true',
      }
    })()`)
    await navigate(page, `${BASE}/`)
    await evaluate(page, HELPERS) // 刷新后页面上下文重建，注入的 helper 会丢失
    const socialAfterReload = await evaluate(page, `(async () => {
      window.__clickText('nav button', '社区')
      ${settle}
      const card = document.querySelector('#post-SYNTH-POST-004')
      if (!card) return { found: false }
      const likeBtn = [...card.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '').includes('赞同'))
      const markBtn = [...card.querySelectorAll('button')].find((b) => b.textContent.includes('收藏'))
      return {
        found: true,
        like: likeBtn.getAttribute('aria-pressed') === 'true',
        count: Number((likeBtn.getAttribute('aria-label') || '').replace(/[^0-9]/g, '')),
        mark: markBtn.getAttribute('aria-pressed') === 'true',
      }
    })()`)
    check(
      '[edge] 点赞与收藏在刷新后保持（未回落）',
      markOn.like === true && markOn.mark === true
        && socialAfterReload.found !== false
        && socialAfterReload.like === true && socialAfterReload.mark === true
        && socialAfterReload.count === social.initial.like.count + likeStep,
      `like=${socialAfterReload.like} count=${socialAfterReload.count} mark=${socialAfterReload.mark}`,
    )

    // 身份不随存档持久化：重载后回到访客，报名类动作需要已实名成员，故先切回。
    const reselect = await evaluate(page, `(async () => {
      const identity = [...document.querySelectorAll('header button')].find((b) => b.textContent.includes('演练'))
      if (identity) { identity.click(); ${settle} }
      const target = [...document.querySelectorAll('header button')]
        .filter((b) => b.textContent.includes('时间币'))
        .find((b) => b.textContent.includes('已实名'))
      if (!target) return { ok: false }
      target.click()
      ${settle}
      return { ok: true }
    })()`)

    // ── 4d. 活动报名：名额 +1、按钮转为已报名且不可重复提交 ────────────
    // 目标卡片 SYNTH-POST-003：种子 eventSignupCount=8 / eventCapacity=12 / signedUpByMe=false。
    // 注意：报名后按钮被 disabled，UI 无「取消报名」路径（cancelEventSignup 无独立入口），
    // 故本条只判单向 +1，不判往返——避免把不可达路径写成断言。
    const enroll = await evaluate(page, `(async () => {
      const card = document.querySelector('#post-SYNTH-POST-003')
      if (!card) return { found: false }
      const readCounter = () => card.querySelector('.nl-activity__left')?.textContent?.trim() ?? ''
      const enrollBtn = () => [...card.querySelectorAll('button')].find((b) => /立即报名|已报名/.test(b.textContent))
      const before = { counter: readCounter(), label: enrollBtn()?.textContent?.trim() ?? '' }
      enrollBtn().click()
      ${settle}
      ${settle}
      const after = {
        counter: readCounter(),
        label: enrollBtn()?.textContent?.trim() ?? '',
        disabled: enrollBtn()?.disabled ?? null,
      }
      const raw = localStorage.getItem('community-mvp.synthetic-state.v1')
      let stored = null
      try {
        stored = JSON.parse(raw).state.posts.find((p) => p.id === 'SYNTH-POST-003')
      } catch (error) { stored = null }
      return {
        found: true,
        before,
        after,
        signedUpByMe: stored?.signedUpByMe ?? null,
        signupCount: stored?.eventSignupCount ?? null,
      }
    })()`)
    // 「已报名 8/12 人」不能剥掉全部非数字（会得到 812），只取已报名人数。
    const seats = (text) => Number((/(\d+)\s*\//.exec(text ?? '') || [])[1] ?? NaN)
    const beforeSeats = seats(enroll.before?.counter)
    const afterSeats = seats(enroll.after?.counter)
    check(
      '报名活动后名额 +1 且按钮转为已报名不可重复提交',
      enroll.found !== false
        && enroll.before.label.includes('立即报名')
        && enroll.after.counter !== enroll.before.counter
        && afterSeats === beforeSeats + 1
        && enroll.after.label.includes('已报名')
        && enroll.after.disabled === true
        && enroll.signedUpByMe === true
        && enroll.signupCount === 9,
      `${enroll.before?.counter} → ${enroll.after?.counter} / ${enroll.after?.label} / disabled=${enroll.after?.disabled} / stored=${enroll.signupCount}`,
    )

    // ── 4e. 长辈模式：切换生效、刷新保持、可复原 ──────────────────────
    const elderlyOn = await evaluate(page, `(async () => {
      const btn = () => [...document.querySelectorAll('header button')].find((b) => /大字/.test(b.textContent))
      if (!btn()) return { found: false }
      btn().click()
      ${settle}
      return {
        found: true,
        active: document.querySelector('.nl-shell')?.classList.contains('elderly-mode-active') ?? false,
        pressed: btn().getAttribute('aria-pressed') === 'true',
        label: btn().textContent.trim(),
      }
    })()`)
    await navigate(page, `${BASE}/`)
    await evaluate(page, HELPERS)
    const elderlyAfterReload = await evaluate(page, `(async () => {
      const btn = () => [...document.querySelectorAll('header button')].find((b) => /大字/.test(b.textContent))
      const kept = {
        active: document.querySelector('.nl-shell')?.classList.contains('elderly-mode-active') ?? false,
        pressed: btn()?.getAttribute('aria-pressed') === 'true',
      }
      btn().click()
      ${settle}
      return {
        kept,
        reverted: {
          active: document.querySelector('.nl-shell')?.classList.contains('elderly-mode-active') ?? false,
          pressed: btn()?.getAttribute('aria-pressed') === 'true',
        },
      }
    })()`)
    check(
      '[edge] 长辈模式切换生效、刷新保持、关闭后复原',
      elderlyOn.found !== false
        && elderlyOn.active === true && elderlyOn.pressed === true
        && elderlyAfterReload.kept.active === true && elderlyAfterReload.kept.pressed === true
        && elderlyAfterReload.reverted.active === false && elderlyAfterReload.reverted.pressed === false,
      `on=${elderlyOn.active} kept=${elderlyAfterReload.kept.active} reverted=${elderlyAfterReload.reverted.active} / ${elderlyOn.label}`,
    )

    // ── 4f. 语音朗读：播放态建立与全局停止（W5 覆盖补齐） ──────────────
    // headless 无语音引擎，真实 speak 可能立即回调 onend 把播放态清掉，
    // 故先把 speechSynthesis 换成计数桩：断言的仍是应用状态机，不是音频输出。
    const audio = await evaluate(page, `(async () => {
      window.__speech = { spoken: 0, cancelled: 0 }
      try {
        Object.defineProperty(window, 'speechSynthesis', {
          configurable: true,
          value: {
            speak: () => { window.__speech.spoken += 1 },
            cancel: () => { window.__speech.cancelled += 1 },
            speaking: false,
          },
        })
      } catch (error) { /* 已有不可重定义的实现则跳过打桩 */ }
      // 上次会话可能停在别的页签（activeTab 会持久化），先回首页再进「常用功能」。
      window.__clickText('nav button', '首页')
      ${settle}
      const entry = [...document.querySelectorAll('.nl-quick__item')]
        .find((node) => node.textContent.includes('养老科普'))
      if (!entry) return { found: false, reason: 'no-entry' }
      entry.click()
      ${settle}
      const modal = document.querySelector('.nl-backdrop [role="dialog"]')
      if (!modal) return { found: false, reason: 'no-modal' }
      const playBtn = () => modal.querySelector('button[aria-label="开始语音朗读"], button[aria-label="停止朗读"]')
      const headerStop = () => [...document.querySelectorAll('header button')]
        .find((node) => node.textContent.includes('停止朗读'))
      const before = {
        label: playBtn()?.getAttribute('aria-label') ?? '',
        headerStop: !!headerStop(),
      }
      playBtn().click()
      ${settle}
      const playing = {
        label: playBtn()?.getAttribute('aria-label') ?? '',
        text: modal.textContent.includes('正在语音朗读正文'),
        headerStop: !!headerStop(),
        spoken: window.__speech.spoken,
      }
      const stopper = headerStop()
      if (!stopper) return { found: true, before, playing, stopped: { missing: true } }
      stopper.click()
      ${settle}
      const stopped = {
        label: playBtn()?.getAttribute('aria-label') ?? '',
        text: modal.textContent.includes('正在语音朗读正文'),
        headerStop: !!headerStop(),
        cancelled: window.__speech.cancelled,
      }
      return { found: true, before, playing, stopped }
    })()`)

    check(
      '播放朗读后进入播放态，且出现全局停止入口',
      audio.found === true
        && audio.before?.label === '开始语音朗读'
        && audio.before?.headerStop === false
        && audio.playing?.label === '停止朗读'
        && audio.playing?.text === true
        && audio.playing?.headerStop === true
        && audio.playing?.spoken >= 1,
      `初始=${audio.before?.label} → 播放=${audio.playing?.label} / 正文提示=${audio.playing?.text} / 全局停止=${audio.playing?.headerStop} / speak 调用=${audio.playing?.spoken}`,
    )
    check(
      '[edge] 全局停止朗读后回到静默态（弹层按钮与顶栏控件同时复原）',
      audio.found === true
        && audio.stopped?.missing !== true
        && audio.stopped?.label === '开始语音朗读'
        && audio.stopped?.text === false
        && audio.stopped?.headerStop === false
        && audio.stopped?.cancelled >= 1,
      `停止后=${audio.stopped?.label} / 正文提示=${audio.stopped?.text} / 顶栏停止=${audio.stopped?.headerStop} / cancel 调用=${audio.stopped?.cancelled}`,
    )
    await evaluate(page, `(async () => {
      const close = [...document.querySelectorAll('.nl-modal__foot .button, .nl-modal__close')]
        .find((node) => node.textContent.trim() === '关闭' || node.getAttribute('aria-label') === '关闭')
      if (close) close.click()
      await new Promise((r) => setTimeout(r, 250))
      return true
    })()`)

    // ── 4g. 举报去重：同一目标连续举报不新增工单（D-21 回归强度） ────────
    // store 的 reportContent 按「目标 + 待处理 + 同一举报人」判重，命中后返回既有工单。
    // 判定只认工单条数与编号不变，不锁死提示文案——当前实现在命中判重时仍提示
    // 「举报已记录」，文案与语义不符，已登记为 D-22（待修），不由断言固化。
    const reselectForReport = await evaluate(page, `(async () => {
      const trigger = [...document.querySelectorAll('header button')].find((b) => b.textContent.includes('演练'))
      if (trigger) { trigger.click(); ${settle} }
      const target = [...document.querySelectorAll('header button[role="menuitemradio"]')]
        .find((b) => b.textContent.includes('演练用户'))
      if (!target) return { ok: false }
      target.click()
      ${settle}
      return { ok: true }
    })()`)

    const reportTwice = await evaluate(page, `(async () => {
      window.__clickText('nav button', '社区')
      ${settle}
      const flag = () => document.querySelector('#post-SYNTH-POST-004 button[aria-label^="举报这条内容"]')
      const readReports = () => {
        try {
          const env = JSON.parse(localStorage.getItem('community-mvp.synthetic-state.v1'))
          return env.state.reports ?? []
        } catch { return [] }
      }
      if (!flag()) return { found: false }
      const before = readReports()
      flag().click()
      ${settle}
      const afterFirst = readReports()
      flag().click()
      ${settle}
      const afterSecond = readReports()
      return {
        found: true,
        before: before.length,
        afterFirst: afterFirst.length,
        afterSecond: afterSecond.length,
        firstId: afterFirst[0]?.id ?? '',
        secondId: afterSecond[0]?.id ?? '',
        targetType: afterSecond[0]?.targetType ?? '',
      }
    })()`)

    check(
      '[neg] 同一内容重复举报不新增工单（命中既有待处理记录）',
      reselectForReport.ok === true
        && reportTwice.found !== false
        && reportTwice.afterFirst === reportTwice.before + 1
        && reportTwice.afterSecond === reportTwice.afterFirst
        && reportTwice.firstId.length > 0
        && reportTwice.firstId === reportTwice.secondId
        && reportTwice.targetType === 'post',
      `工单 ${reportTwice.before} → ${reportTwice.afterFirst} → ${reportTwice.afterSecond}（编号 ${reportTwice.firstId} → ${reportTwice.secondId}）`,
    )

    // ── 4h. 越权切换：访客的互动与举报被状态机拒绝 ────────────────────
    // 判两半：动作必须被拒（计数 / 工单不变），且给出可操作的实名提示。
    // 举报目标特意选 SYNTH-POST-003（与 4g 的 004 不同），否则「工单数不变」
    // 会被去重逻辑假绿，测不到成员闸门。
    const visitorGate = await evaluate(page, `(async () => {
      const trigger = [...document.querySelectorAll('header button')].find((b) => b.textContent.includes('演练'))
      if (trigger) { trigger.click(); ${settle} }
      const guest = [...document.querySelectorAll('header button[role="menuitemradio"]')]
        .find((b) => b.textContent.includes('演练访客'))
      if (!guest) return { switched: false }
      guest.click()
      ${settle}
      window.__clickText('nav button', '社区')
      ${settle}
      const card = () => document.querySelector('#post-SYNTH-POST-003')
      const likeBtn = () => card()?.querySelector('button[aria-label^="赞同"]')
      const flag = () => card()?.querySelector('button[aria-label^="举报这条内容"]')
      const readLike = () => ({
        count: Number((likeBtn()?.getAttribute('aria-label') ?? '').replace(/[^0-9]/g, '')),
        pressed: likeBtn()?.getAttribute('aria-pressed') === 'true',
      })
      if (!card() || !likeBtn() || !flag()) return { switched: true, found: false }
      const before = { like: readLike(), reports: window.__reportCount(), label: document.body.innerText.includes('演练访客') }
      likeBtn().click()
      ${settle}
      const afterLike = { like: readLike(), toast: window.__lastToast() }
      flag().click()
      ${settle}
      const afterReport = { reports: window.__reportCount(), toast: window.__lastToast() }
      return { switched: true, found: true, before, afterLike, afterReport }
    })()`)

    check(
      '[neg] 未实名访客点赞被拒：计数与选中态均不变',
      visitorGate.switched === true
        && visitorGate.found === true
        && visitorGate.before.label === true
        && visitorGate.afterLike.like.count === visitorGate.before.like.count
        && visitorGate.afterLike.like.pressed === visitorGate.before.like.pressed
        && String(visitorGate.afterLike.toast).includes('切换为演练成员'),
      `访客=${visitorGate.before?.label} 计数 ${visitorGate.before?.like.count} → ${visitorGate.afterLike?.like.count} / 选中 ${visitorGate.before?.like.pressed} → ${visitorGate.afterLike?.like.pressed} / 提示=${String(visitorGate.afterLike?.toast).slice(0, 40)}`,
    )
    check(
      '[neg] 未实名访客举报被拒：工单数不变且提示先实名',
      visitorGate.switched === true
        && visitorGate.found === true
        && visitorGate.afterReport.reports === visitorGate.before.reports
        && String(visitorGate.afterReport.toast).includes('切换为演练成员'),
      `工单 ${visitorGate.before?.reports} → ${visitorGate.afterReport?.reports} / 提示=${String(visitorGate.afterReport?.toast).slice(0, 40)}`,
    )

    // ── 4i. 深链边界：有效 id 高亮、失效 id 不误高亮且不抛异常 ──────────
    // 两半同判：只测失效侧会把「高亮彻底失效」判绿，只测有效侧则漏掉脏参数。
    // flash 类在 2.6 s 后自动移除，故用短轮询捕获，不依赖固定等待。
    const errorsBeforeDeepLink = errors.errors.length
    await navigate(page, `${BASE}/?tab=community&post=SYNTH-POST-004`)
    const goodDeepLink = await evaluate(page, `(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms))
      let flashed = false
      for (let i = 0; i < 20 && !flashed; i += 1) {
        flashed = !!document.querySelector('#post-SYNTH-POST-004.nl-post--flash')
        if (!flashed) await wait(50)
      }
      return {
        flashed,
        posts: document.querySelectorAll('.nl-post').length,
        onCommunity: document.body.innerText.includes('社区动态'),
      }
    })()`)
    await navigate(page, `${BASE}/?tab=community&post=SYNTH-DOES-NOT-EXIST`)
    const badDeepLink = await evaluate(page, `(async () => {
      await new Promise((r) => setTimeout(r, 500))
      return {
        posts: document.querySelectorAll('.nl-post').length,
        flashed: document.querySelectorAll('.nl-post--flash').length,
        textLength: document.body.innerText.trim().length,
      }
    })()`)
    check(
      '[edge] 有效 ?post= 深链高亮目标、失效 id 不误高亮且页面照常渲染',
      goodDeepLink.onCommunity === true
        && goodDeepLink.posts > 0
        && goodDeepLink.flashed === true
        && badDeepLink.posts === goodDeepLink.posts
        && badDeepLink.flashed === 0
        && badDeepLink.textLength > 800
        && errors.errors.length === errorsBeforeDeepLink,
      `有效：高亮=${goodDeepLink.flashed} 卡片=${goodDeepLink.posts}；失效：高亮=${badDeepLink.flashed} 卡片=${badDeepLink.posts} 文本=${badDeepLink.textLength} 异常增量=${errors.errors.length - errorsBeforeDeepLink}`,
    )

    // ── 4j. 越权：后台入口对全身份可见，但处置动作只允许审核员 ────────────
    // 判定取两半：动作被拒（工单仍待处理、审核日志不增）且提示可操作。
    // 只判「点了没报错」会把 requireReviewer 被移除的缺陷判绿——办结成功后
    // 工单转 resolved 并写日志，两半会同时变化。
    await evaluate(page, HELPERS) // 上一段整页重载过，注入的 helper 已丢失
    const adminGate = await evaluate(page, `(async () => {
      const readState = () => {
        try { return JSON.parse(localStorage.getItem('community-mvp.synthetic-state.v1')).state }
        catch { return null }
      }
      const pendingTicket = (state) => (state?.reports ?? []).find((r) => r.status === 'pending')
      const resolvedCount = (state) => (state?.reports ?? []).filter((r) => r.status !== 'pending').length
      window.__clickText('nav button', '我的')
      ${settle}
      const opened = window.__clickText('button', '演练审核与举报处置后台')
      ${settle}
      const tabbed = window.__clickText('button', '举报处置工单')
      ${settle}
      const done = [...document.querySelectorAll('button')]
        .find((b) => b.textContent.includes('确认办结'))
      const before = readState()
      if (done) done.click()
      ${settle}
      const after = readState()
      return {
        opened,
        tabbed,
        hadButton: !!done,
        toast: window.__lastToast(),
        beforeStatus: pendingTicket(before)?.status ?? '',
        afterStatus: pendingTicket(after)?.status ?? '',
        beforeResolved: resolvedCount(before),
        afterResolved: resolvedCount(after),
        beforeAudit: (before?.auditLog ?? []).length,
        afterAudit: (after?.auditLog ?? []).length,
      }
    })()`)
    check(
      '[neg] 访客在后台办结举报被拒：工单仍待处理且不写审核日志',
      adminGate.opened === true
        && adminGate.tabbed === true
        && adminGate.hadButton === true
        && adminGate.beforeStatus === 'pending'
        && adminGate.afterStatus === 'pending'
        && adminGate.afterResolved === adminGate.beforeResolved
        && adminGate.afterAudit === adminGate.beforeAudit
        && String(adminGate.toast).includes('只有审核员'),
      `入口=${adminGate.opened} 页签=${adminGate.tabbed} 按钮=${adminGate.hadButton} 工单 ${adminGate.beforeStatus} → ${adminGate.afterStatus} / 已办结 ${adminGate.beforeResolved} → ${adminGate.afterResolved} / 日志 ${adminGate.beforeAudit} → ${adminGate.afterAudit} / 提示=${String(adminGate.toast).slice(0, 40)}`,
    )

    // ── 4k. 角色互斥：审核员不能代替成员发布 ───────────────────────────
    // requireMember() 对审核员给的是专用文案（不是「请先实名」），验证的是
    // 「身份通过实名前置但角色不放行」这条独立分支：只看实名挡不挡，会漏掉
    // 审核员借发布入口写入内容。
    const reviewerPublish = await evaluate(page, `(async () => {
      const countPosts = () => {
        try { return JSON.parse(localStorage.getItem('community-mvp.synthetic-state.v1')).state.posts.length }
        catch { return -1 }
      }
      const switched = await window.__switchRole('演练审核员')
      window.__clickText('nav button', '发布')
      ${settle}
      const opened = document.body.innerText.includes('发布求助订单')
      window.__fillHelpForm()
      ${settle}
      const before = countPosts()
      window.__clickText('button', '确认发布到接单大厅')
      ${settle}
      return {
        switched,
        opened,
        before,
        after: countPosts(),
        toast: window.__lastToast(),
        stillOpen: document.body.innerText.includes('确认发布到接单大厅'),
      }
    })()`)
    check(
      '[neg] 审核员不能代替成员发布：帖子数不变且发布弹层保持',
      reviewerPublish.switched === true
        && reviewerPublish.opened === true
        && reviewerPublish.before > 0
        && reviewerPublish.after === reviewerPublish.before
        && reviewerPublish.stillOpen === true
        && String(reviewerPublish.toast).includes('审核身份不能代替'),
      `切换=${reviewerPublish.switched} 表单=${reviewerPublish.opened} 帖子 ${reviewerPublish.before} → ${reviewerPublish.after} / 弹层保持=${reviewerPublish.stillOpen} / 提示=${String(reviewerPublish.toast).slice(0, 40)}`,
    )

    // ── 4l. 边界：纯空白评论不产生待审评论（禁用态 + 提交兜底两层）────────
    // 只判「按钮能不能点」会漏掉 submit 事件直接派发；只判「没写进存档」又会
    // 因为按钮禁用而恒真。故同时判禁用态、表单直提后的评论数、以及有文本时
    // 按钮必须恢复可用（防止「永远禁用」被当成合规）。
    const blankComment = await evaluate(page, `(async () => {
      const readComments = () => {
        try {
          const state = JSON.parse(localStorage.getItem('community-mvp.synthetic-state.v1')).state
          return (state.posts.find((p) => p.id === 'SYNTH-POST-001')?.comments ?? []).length
        } catch { return -1 }
      }
      const switched = await window.__switchRole('演练用户')
      window.__clickText('nav button', '社区')
      ${settle}
      const card = () => document.querySelector('#post-SYNTH-POST-001')
      const toggle = () => card()?.querySelector('button[aria-label^="评论（"]')
      if (!card() || !toggle()) return { found: false, switched }
      toggle().click()
      ${settle}
      const input = () => card()?.querySelector('input[aria-label="评论内容"]')
      const submit = () => card()?.querySelector('form.nl-comment-form button[type="submit"]')
      if (!input() || !submit()) return { found: true, switched, form: false }
      const before = readComments()
      window.__setValue(input(), '   ')
      ${settle}
      const disabledSpaces = submit().disabled === true
      card().querySelector('form.nl-comment-form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      ${settle}
      const afterBlank = readComments()
      window.__setValue(input(), '合成演练：这条评论用于验证按钮可用')
      ${settle}
      const enabledWithText = submit().disabled === false
      window.__setValue(input(), '')
      ${settle}
      const disabledEmpty = submit().disabled === true
      return { found: true, switched, form: true, before, afterBlank, disabledSpaces, disabledEmpty, enabledWithText }
    })()`)
    check(
      '[edge] 纯空白评论被拒：提交按钮禁用且表单直提不新增评论',
      blankComment.switched === true
        && blankComment.found === true
        && blankComment.form === true
        && blankComment.disabledSpaces === true
        && blankComment.disabledEmpty === true
        && blankComment.enabledWithText === true
        && blankComment.afterBlank === blankComment.before,
      `禁用(空白)=${blankComment.disabledSpaces} 禁用(空)=${blankComment.disabledEmpty} 有文本可用=${blankComment.enabledWithText} / 评论 ${blankComment.before} → ${blankComment.afterBlank}`,
    )

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
