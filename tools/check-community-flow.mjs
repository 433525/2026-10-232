/**
 * check-community-flow.mjs — B 端主链路 + 跨入口联动（零依赖，CDP 驱动）。
 *
 * 覆盖两条合规红线与一条跨端契约：
 * 1. 实名前置拦截：未实名访客提交求助时被挡在发布之前；
 * 2. 先审后发：已实名成员发布后进入待审，社区公开信息流看不到待审内容；
 * 3. 跨入口：A+ 社区桥能读到 B 刚写入的本机存档（同一个 localStorage 键）；
 * 4. 覆盖补齐（D-19）：点赞/收藏 toggle 往返与刷新保持、活动报名、
 *    长辈模式持久化、语音朗读的播放/停止（W5，`speechSynthesis` 打桩）。
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
