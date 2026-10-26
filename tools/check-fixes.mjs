/**
 * check-fixes.mjs — 两轮修复的补充验收（零依赖，CDP 驱动）。
 *
 * 覆盖：
 * 1. 待审内容进得了审核：成员发布动态 + 评论 → 审核后台可见 → 通过 → 前台出现
 *    （修复前：selectors 只投影 approved，后台待审队列恒为空、moderateComment 无人调用）；
 * 2. 发布失败不再谎报成功：审核员身份提交求助 → 弹层不关、草稿保留、无成功提示、存档未写入
 *    （修复前：调用 void 动作后无条件清草稿 + success toast + 关弹层）；
 * 3. 订单留言落到单条订单：导入含「已接单但无会话订单」的备份 → 订单详情发起沟通 →
 *    第一条留言按订单建线程；再给另一订单留言，互不串线
 *    （修复前：消息页固定取第一条会话，新接单订单发不出第一条留言）；
 * 4. 发布者履约：发布求助 → 审核通过 → 代合成邻居接单 → 双方确认完成 → 账本/评价
 *    （修复前：counterpart 动作未透传，发布者点「确认完成」必报角色错误）；
 * 5. 空动作如实化：「下载证书」产出真实文本文件；SOS 演练不再声称「已在本机记录」；
 * 6. A+ 普通新建不提供「社区入口演练」来源（该来源必须带社区帖子 id，只能由社区桥创建）；
 * 7. 下载失败分支：劫持 URL.createObjectURL 模拟浏览器拒绝创建下载，
 *    证书与 A+ 坏档导出都给出可执行提示、不谎报成功、失败不标记「已下载」；
 * 8. 社区桥登记端到端：B 端已通过的求助 → A+ 桥登记 → 同弹层立即「已登记」、
 *    队列 +1、重读仍稳定、存档绑定 sourcePostId 与 community-entry-local 来源；
 * 9. 订单留痕与互跳：订单详情展示演练留痕时间线（事件 + 操作方 + 代记录标记）、
 *    私信会话「查看订单详情」直达对应订单；
 * 10. 订单争议流程露出：已接单订单出现「发起争议」，空理由禁用提交；发起后详情不关闭、
 *     dispute 事件立即进留痕、状态变「申诉处理中」；撤销回到履约中、因争议关闭则终止，
 *     三者都要求理由且事件类型分别为 dispute / resume-after-dispute / close-after-dispute；
 * 11. 接单大厅筛选：分类结果与「可接需求 N 条」同源、标签只剩该分类，「仅看紧急」只留
 *     加急需求，关键词无结果给空态并可清空恢复；
 * 12. 时间存折明细页：余额/折合小时与账本同源、条数等于流水行数、金额格式与凭证号在位、
 *     「不可兑现/不可转让」只读声明不缺失；
 * 13. A+ 投诉的「转介席视角」：转介席既能看到同一队列，也受「被投诉角色 / 投诉提交人」
 *     两条回避规则约束；满足条件时可独立完成复核并把 demo-referral 写进存档，且复核
 *     不改写关联 case 的时间线与状态。
 * 14. 负向/边界补测（I-02）：驳回理由为空与仅空白时按钮禁用、驳回后转 rejected 并写审计
 *     日志且不进公开信息流、时间账本只读不变量（调账不改余额）、A+ 暂停受理门禁。
 *     新增用例名带 `[neg]` / `[edge]` 前缀，供 `collect-baseline.mjs` 精确统计负向覆盖率。
 *
 * 用法：先 build + preview 到 5180，再 `node tools/check-fixes.mjs`。
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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

const BASE = process.env.BASE_URL ?? 'http://localhost:5180'
const OUT_DIR = join(process.cwd(), 'docs', 'evidence', 'fixes')
const STATE_KEY = 'community-mvp.synthetic-state.v1'
const DRAFT_KEY = 'cuihu.publish-draft.v1'

const STAMP = Date.now().toString(36)
const TITLE1 = `演练审核队列-${STAMP}`
const CONTENT1 = '合成演练内容：验证待审内容能进入审核后台，不含真实个人信息。'
const COMMENT1 = `待审评论-${STAMP}`
const TITLE2 = `失败保留草稿-${STAMP}`
const O1_ID = `SYNTH-POST-DCHAT-${STAMP}`
const O1_TITLE = `演练-订单留言绑定-${STAMP}（虚构）`
const P1_SNIPPET = '把两箱演练物资搬到活动室'
const MSG1 = `第一条订单留言-${STAMP}`
const MSG2 = `第二条订单留言-${STAMP}`

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const settle = `await new Promise((r) => setTimeout(r, 400))`

const HELPERS = `
window.__readState = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(${JSON.stringify(STATE_KEY)}) || 'null')
    return raw && raw.state ? raw.state : null
  } catch { return null }
}
window.__toasts = () =>
  [...document.querySelectorAll('[role="status"], [role="alert"]')]
    .map((n) => n.textContent.trim())
window.__clickText = (selector, text) => {
  const node = [...document.querySelectorAll(selector)].find((item) => item.textContent.includes(text))
  if (!node) return false
  node.click()
  return true
}
/** 在包含指定文本的区块里点按钮：审核队列等多条并列时避免点到别人的条目。
 *  优先在弹层内定位——页面上的「我的订单」也可能包含同一标题。 */
window.__clickIn = (scopeText, buttonText) => {
  const roots = [...document.querySelectorAll('[role="dialog"]')]
  const root = roots.find((node) => node.textContent.includes(scopeText))
    ?? [...document.querySelectorAll('section')].find((node) => node.textContent.includes(scopeText))
  if (!root) return false
  const scope = [root, ...root.querySelectorAll('section')].find((node) => node.textContent.includes(scopeText))
  if (!scope) return false
  const button = [...scope.querySelectorAll('button')].find((node) => node.textContent.includes(buttonText))
  if (!button) return false
  button.click()
  return true
}
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
/** 头部身份切换：展开后按身份标签（含“时间币”）选中目标身份。 */
window.__switchIdentity = async (label) => {
  const identity = [...document.querySelectorAll('header button')].find((b) => b.textContent.includes('演练'))
  if (!identity) return false
  identity.click()
  await new Promise((r) => setTimeout(r, 350))
  const target = [...document.querySelectorAll('header button')]
    .filter((b) => b.textContent.includes('时间币'))
    .find((b) => b.textContent.includes(label))
  if (!target) return false
  target.click()
  await new Promise((r) => setTimeout(r, 350))
  return true
}
`

async function main() {
  const chrome = await launchChrome({ port: 9351 })
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

    /* ── 0. 接单大厅：分类 / 仅看紧急 / 关键词空态（在数据被后续用例消耗前） ─ */
    const hall = await evaluate(page, `(async () => {
      window.__clickText('nav button', '首页')
      ${settle}
      window.__clickText('button', '我要接单')
      ${settle}
      const dialog = [...document.querySelectorAll('[role="dialog"]')]
        .find((node) => node.textContent.includes('社区志愿接单大厅'))
      if (!dialog) return { step: 'no-hall' }
      const CATS = ['陪同就医', '日常家务', '聊天陪伴', '隔代育儿', '紧急求助']
      const cards = () => [...dialog.querySelectorAll('.nl-card')]
      const count = () => (dialog.innerText.match(/可接需求\\s*(\\d+)\\s*条/) ?? [])[1] ?? ''
      const chip = (label) => [...dialog.querySelectorAll('button')]
        .find((node) => node.textContent.trim() === label)
      const wait = () => new Promise((r) => setTimeout(r, 320))

      const allCount = cards().length
      const allShown = count()
      const first = cards()[0]
      const ownCategory = first ? CATS.find((label) => first.innerText.includes(label)) ?? null : null
      const otherCategory = CATS.find((label) => label !== ownCategory) ?? null
      const firstUrgent = first ? first.innerText.includes('加急置顶') : false
      const firstTitle = (first?.querySelector('h3')?.textContent ?? '').trim()

      chip(ownCategory).click()
      await wait()
      const sameCards = cards()
      const sameCategory = {
        count: sameCards.length,
        shown: count(),
        allMatch: sameCards.every((node) => node.innerText.includes(ownCategory)),
        pressed: chip(ownCategory).getAttribute('aria-pressed') === 'true',
        othersOff: chip('全部需求').getAttribute('aria-pressed') === 'false',
      }

      chip(otherCategory).click()
      await wait()
      const otherCategoryState = {
        count: cards().length,
        shown: count(),
        empty: dialog.innerText.includes('当前筛选条件下没有待接单需求'),
      }

      chip('全部需求').click()
      await wait()
      const backCount = cards().length

      chip('仅看紧急').click()
      await wait()
      const urgentCards = cards()
      const urgent = {
        count: urgentCards.length,
        allMatch: urgentCards.every((node) => node.innerText.includes('加急置顶')),
        pressed: [...dialog.querySelectorAll('button')]
          .find((node) => node.textContent.includes('仅看紧急')).getAttribute('aria-pressed') === 'true',
      }
      chip('仅看紧急').click()
      await wait()

      const search = dialog.querySelector('input[aria-label="搜索待接单需求"]')
      window.__setValue(search, firstTitle.slice(0, 4))
      await wait()
      const hit = { count: cards().length, shown: count() }
      window.__setValue(search, 'zzz-不存在关键词')
      await wait()
      const miss = { count: cards().length, empty: dialog.innerText.includes('当前筛选条件下没有待接单需求') }
      window.__setValue(search, '')
      await wait()
      return {
        step: 'done',
        allCount, allShown, ownCategory, otherCategory, firstUrgent, firstTitle,
        sameCategory, otherCategoryState, backCount, urgent, hit, miss,
        restored: cards().length,
        restoredShown: count(),
      }
    })()`)
    check(
      '接单大厅有数据且「可接需求 N 条」与渲染卡片数一致',
      hall.step === 'done' && hall.allCount >= 1 && hall.allShown === String(hall.allCount),
      `${hall.step} cards=${hall.allCount} shown=${hall.allShown}`,
    )
    check(
      '接单大厅分类筛选：选中自身分类结果不变、选他类给空态',
      hall.step === 'done'
        && hall.sameCategory.count === hall.allCount
        && hall.sameCategory.shown === String(hall.allCount)
        && hall.sameCategory.allMatch === true
        && hall.sameCategory.pressed === true && hall.sameCategory.othersOff === true
        && hall.otherCategoryState.count === 0
        && hall.otherCategoryState.shown === '0'
        && hall.otherCategoryState.empty === true,
      `${hall.step} same=${hall.sameCategory?.count}/${hall.allCount} other=${hall.otherCategoryState?.count} empty=${hall.otherCategoryState?.empty}`,
    )
    check(
      '「仅看紧急」结果与首条紧急标记一致且每条都带加急标签',
      hall.step === 'done' && hall.urgent.pressed === true
        && hall.urgent.count === (hall.firstUrgent ? hall.allCount : 0)
        && hall.urgent.allMatch === true,
      `urgent=${hall.urgent?.count} firstUrgent=${hall.firstUrgent} all=${hall.allCount}`,
    )
    check(
      '接单大厅关键词：命中标题可筛出、无结果给空态、清空恢复',
      hall.step === 'done' && hall.hit.count === 1 && hall.hit.shown === '1'
        && hall.miss.count === 0 && hall.miss.empty === true
        && hall.restored === hall.allCount && hall.restoredShown === String(hall.allCount),
      `hit=${hall.hit?.count}/${hall.hit?.shown} miss=${hall.miss?.count} restore=${hall.restored}/${hall.allCount}`,
    )
    await pressEscape(page)
    await new Promise((resolve) => setTimeout(resolve, 300))

    /* ── 1. 成员发布动态 → 待审（成功路径收口：只有一条成功提示） ── */
    await evaluate(page, `(async () => { await window.__switchIdentity('已实名'); return true })()`)
    const published = await evaluate(page, `(async () => {
      window.__clickText('nav button', '发布')
      ${settle}
      window.__clickText('button', '志愿动态')
      ${settle}
      window.__setValue(document.querySelector('#post-title'), ${JSON.stringify(TITLE1)})
      window.__setValue(document.querySelector('#post-content'), ${JSON.stringify(CONTENT1)})
      ${settle}
      window.__clickText('button', '发布并同步至社区')
      ${settle}
      const post = (window.__readState()?.posts ?? []).find((p) => p.title === ${JSON.stringify(TITLE1)})
      return {
        modalClosed: !document.querySelector('#post-title'),
        toasts: window.__toasts(),
        pending: post?.moderation ?? null,
      }
    })()`)
    check('成员发布成功后弹层关闭', published.modalClosed === true, '')
    check(
      '成功路径只出现一条「已提交审核」提示',
      published.toasts.filter((t) => t.includes('已提交审核')).length === 1,
      published.toasts.join(' | ').slice(0, 100),
    )
    check('发布后帖子进入待审状态', published.pending === 'pending', `moderation=${published.pending}`)

    const hiddenFromFeed = await evaluate(page, `(async () => {
      window.__clickText('nav button', '社区')
      ${settle}
      return { hasTitle: document.body.innerText.includes(${JSON.stringify(TITLE1)}) }
    })()`)
    check('待审内容不出现在公开信息流（R7）', hiddenFromFeed.hasTitle === false, '')

    /* ── 2. 评论同样先审后发 ──────────────────────────────────────── */
    const commented = await evaluate(page, `(async () => {
      const firstPost = document.querySelector('[id^="post-SYNTH-"]')
      const postId = firstPost ? firstPost.id.replace(/^post-/, '') : ''
      const toggle = document.querySelector('button[aria-label^="评论（"]')
      if (!toggle || !firstPost) return { ok: false, postId }
      toggle.click()
      ${settle}
      const input = document.querySelector('input[aria-label="评论内容"]')
      window.__setValue(input, ${JSON.stringify(COMMENT1)})
      ${settle}
      const send = [...document.querySelectorAll('.nl-comment-form button')].find((b) => b.textContent.includes('发送'))
      if (send) send.click()
      ${settle}
      const post = (window.__readState()?.posts ?? []).find((p) => p.id === postId)
      const comment = (post?.comments ?? []).find((c) => c.content === ${JSON.stringify(COMMENT1)})
      return {
        ok: true,
        postId,
        toast: window.__toasts().find((t) => t.includes('待审核')) ?? '',
        moderation: comment?.moderation ?? null,
        visibleInFeed: document.body.innerText.includes(${JSON.stringify(COMMENT1)}),
      }
    })()`)
    check('评论提交后提示待审核', commented.toast.includes('待审核'), commented.toast.slice(0, 60))
    check('评论写入存档为待审状态', commented.moderation === 'pending', `moderation=${commented.moderation}`)
    check('待审评论不出现在信息流（R7）', commented.visibleInFeed === false, '')

    /* ── 3. 审核后台：待审帖 + 待审评论都可见 ─────────────────────── */
    await evaluate(page, `(async () => { await window.__switchIdentity('审核员'); return true })()`)
    const queueVisible = await evaluate(page, `(async () => {
      window.__clickText('nav button', '我的')
      ${settle}
      window.__clickText('button', '演练审核与举报处置后台')
      ${settle}
      const text = document.body.innerText
      return {
        opened: text.includes('内容审核'),
        hasPendingPost: text.includes(${JSON.stringify(TITLE1)}),
        hasPendingComment: text.includes('待审评论') && text.includes(${JSON.stringify(COMMENT1)}),
      }
    })()`)
    check('审核后台可打开且待审帖在队列中', queueVisible.opened && queueVisible.hasPendingPost, '')
    check('待审评论也在审核队列中（修复前恒为空）', queueVisible.hasPendingComment === true, '')

    /* ── 4. 审核通过 → 前台出现 ───────────────────────────────────── */
    const approved = await evaluate(page, `(async () => {
      window.__clickText('button', '审核通过并公开')
      ${settle}
      window.__clickText('button', '审核通过并展示')
      ${settle}
      const state = window.__readState()
      const post = (state?.posts ?? []).find((p) => p.title === ${JSON.stringify(TITLE1)})
      // 评论挂在发布当时的信息流首帖（未必是 TITLE1），全量找。
      const comment = (state?.posts ?? []).flatMap((p) => p.comments)
        .find((c) => c.content === ${JSON.stringify(COMMENT1)})
      const actions = new Set((state?.auditLog ?? []).map((entry) => entry.action))
      return {
        postStatus: post?.moderation ?? null,
        commentStatus: comment?.moderation ?? null,
        hasPostAudit: actions.has('moderate-post'),
        hasCommentAudit: actions.has('moderate-comment'),
      }
    })()`)
    check('帖子审核通过并写入审计日志', approved.postStatus === 'approved' && approved.hasPostAudit, `post=${approved.postStatus}`)
    check('评论审核通过并写入审计日志', approved.commentStatus === 'approved' && approved.hasCommentAudit, `comment=${approved.commentStatus}`)

    const feedShown = await evaluate(page, `(async () => {
      window.__clickText('button', '关闭')
      ${settle}
      await window.__switchIdentity('已实名')
      window.__clickText('nav button', '社区')
      ${settle}
      const text = document.body.innerText
      // 信息流卡片渲染正文而非标题；评论只在展开该帖时进入 DOM。
      const hasPost = text.includes(${JSON.stringify(CONTENT1)})
      const article = document.getElementById('post-' + ${JSON.stringify(commented.postId)})
      const toggle = article ? article.querySelector('button[aria-label^="评论（"]') : null
      if (toggle) toggle.click()
      ${settle}
      return {
        onMember: [...document.querySelectorAll('header button')].some((b) => b.textContent.includes('演练用户')),
        hasPost,
        hasComment: document.body.innerText.includes(${JSON.stringify(COMMENT1)}),
        articleFound: Boolean(article),
      }
    })()`)
    check(
      '通过后的帖子出现在信息流（正文可见）',
      feedShown.hasPost === true,
      feedShown.hasPost ? '' : `onMember=${feedShown.onMember}`,
    )
    check('通过后的评论出现在原帖下（展开后）', feedShown.hasComment === true, `articleFound=${feedShown.articleFound}`)

    /* ── 5. 发布失败（审核员身份）：不清草稿、不谎报成功 ───────────── */
    await evaluate(page, `(async () => { await window.__switchIdentity('审核员'); return true })()`)
    const failedPublish = await evaluate(page, `(async () => {
      window.__clickText('nav button', '发布')
      ${settle}
      window.__setValue(document.querySelector('#help-title'), ${JSON.stringify(TITLE2)})
      window.__setValue(document.querySelector('#help-desc'), '合成演练：验证失败分支不清理草稿。')
      const boxes = [...document.querySelectorAll('input[type="checkbox"]')]
      boxes.forEach((box) => { if (!box.checked) box.click() })
      ${settle}
      const before = (window.__readState()?.posts ?? []).length
      window.__clickText('button', '确认发布到接单大厅')
      ${settle}
      const after = (window.__readState()?.posts ?? []).length
      return {
        modalStillOpen: Boolean(document.querySelector('#help-title')),
        toasts: window.__toasts(),
        before,
        after,
      }
    })()`)
    check('失败后发布弹层保持打开', failedPublish.modalStillOpen === true, '')
    check(
      '失败提示给出可执行原因（切换演练成员）',
      failedPublish.toasts.some((t) => t.includes('演练成员')),
      failedPublish.toasts.join(' | ').slice(0, 90),
    )
    check(
      '失败时不出现「已提交审核」成功提示',
      failedPublish.toasts.every((t) => !t.includes('已提交审核')),
      '',
    )
    check('失败时存档未新增帖子', failedPublish.after === failedPublish.before, `${failedPublish.before} → ${failedPublish.after}`)

    // 草稿自动暂存有 600ms 防抖；safeWrite 还包了一层 {v, savedAt, data} 信封。
    let draftTitle = null
    for (let attempt = 0; attempt < 12 && draftTitle !== TITLE2; attempt += 1) {
      draftTitle = await evaluate(page, `(() => {
        try {
          return JSON.parse(localStorage.getItem(${JSON.stringify(DRAFT_KEY)}) || 'null')?.data?.helpTitle ?? null
        } catch { return null }
      })()`)
      if (draftTitle !== TITLE2) await new Promise((resolve) => setTimeout(resolve, 250))
    }
    const draftKept = await evaluate(page, `(async () => {
      window.__clickText('button', '取消')
      ${settle}
      const closed = !document.querySelector('#help-title')
      window.__clickText('nav button', '发布')
      ${settle}
      return {
        closed,
        restoredTitle: document.querySelector('#help-title')?.value ?? '',
        restoredToast: window.__toasts().some((t) => t.includes('恢复上次未提交的发布草稿')),
      }
    })()`)
    check('失败后的草稿已自动暂存', draftTitle === TITLE2, `draft=${draftTitle}`)
    check(
      '重新打开发布弹层时草稿被恢复',
      draftKept.closed && draftKept.restoredTitle === TITLE2 && draftKept.restoredToast,
      `restored=${draftKept.restoredTitle}`,
    )
    await pressEscape(page)

    /* ── 6. 订单留言绑定单条订单（备份导入构造「已接单、无会话」） ──── */
    const raw = await evaluate(page, `localStorage.getItem(${JSON.stringify(STATE_KEY)})`)
    const envelope = JSON.parse(raw)
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
    const tmpDir = mkdtempSync(join(tmpdir(), 'wb-fixes-'))
    const backupPath = join(tmpDir, 'dchat-backup.json')
    writeFileSync(backupPath, JSON.stringify(envelope), 'utf8')

    const uploadFile = async (selector, filePath) => {
      await page.send('DOM.enable')
      const { root } = await page.send('DOM.getDocument', { depth: 1 })
      const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector })
      if (!nodeId) throw new Error(`未找到文件输入：${selector}`)
      await page.send('DOM.setFileInputFiles', { files: [filePath], nodeId })
    }
    await evaluate(page, `(async () => {
      window.__clickText('nav button', '我的')
      ${settle}
      window.__clickText('button', '演练审核与举报处置后台')
      ${settle}
      window.__clickText('button', '存档与恢复')
      ${settle}
      return true
    })()`)
    await uploadFile('input[data-storage-import]', backupPath)
    // 导入要走 confirm + 全量重渲染，等待放在 Node 侧，避免在页面重建期求值。
    let imported
    try {
      await new Promise((resolve) => setTimeout(resolve, 900))
      imported = await evaluate(page, `(() => ({
        toast: window.__toasts().join(' | '),
        hasOrder: (window.__readState()?.posts ?? []).some((p) => p.id === ${JSON.stringify(O1_ID)}),
      }))()`)
    } catch (error) {
      console.error('导入后读取状态失败：', error.message)
      console.error('页面已捕获的异常：\n' + errors.errors.join('\n'))
      throw error
    }
    check('含已接单订单的备份导入成功', imported.hasOrder && imported.toast.includes('已导入本机备份'), imported.toast.slice(0, 60))
    rmSync(tmpDir, { recursive: true, force: true })

    await evaluate(page, `(async () => {
      // 关掉审核后台弹层，再切回成员视角走订单链路。
      window.__clickText('button', '关闭')
      ${settle}
      await window.__switchIdentity('已实名')
      return true
    })()`)
    const firstMessage = await evaluate(page, `(async () => {
      window.__clickText('nav button', '我的')
      ${settle}
      // 我发起的求助（默认页签）：新导入的已接单订单应出现在这里。
      const card = [...document.querySelectorAll('#profile-orders div.cursor-pointer')]
        .find((node) => node.textContent.includes(${JSON.stringify(O1_TITLE)}))
      if (!card) return { opened: false, reason: '我的订单里没有该订单' }
      card.click()
      ${settle}
      const chat = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('订单内沟通留言'))
      if (!chat) return { opened: true, reason: '订单详情缺少沟通入口' }
      chat.click()
      ${settle}
      window.__clickText('button', '订单留言')
      ${settle}
      const text = document.body.innerText
      const composer = document.querySelector('input[aria-label="留言内容"]')
      if (!composer) return { opened: true, step: '私信通道未出现留言输入框', listHasOrder: text.includes(${JSON.stringify(O1_TITLE)}) }
      window.__setValue(composer, ${JSON.stringify(MSG1)})
      ${settle}
      const form = composer.closest('form')
      const send = form ? [...form.querySelectorAll('button')].find((b) => b.textContent.includes('发送')) : null
      if (send) send.click()
      ${settle}
      const state = window.__readState()
      const o1Thread = (state?.threads ?? []).find((t) => t.postId === ${JSON.stringify(O1_ID)})
      const p1Thread = (state?.threads ?? []).find((t) => t.postId === 'SYNTH-POST-001')
      return {
        opened: true,
        listHasOrder: text.includes(${JSON.stringify(O1_TITLE)}),
        emptyHint: text.includes('这条订单还没有留言'),
        threadCreated: Boolean(o1Thread),
        threadMessages: o1Thread?.messages?.length ?? 0,
        threadPostId: o1Thread?.postId ?? null,
        p1Messages: p1Thread?.messages?.length ?? 0,
        uiShowsMessage: document.body.innerText.includes(${JSON.stringify(MSG1)}),
      }
    })()`)
    check('新接单订单出现在「我发起的求助」并可发起沟通', firstMessage.opened === true, firstMessage.reason ?? firstMessage.step ?? '')
    check('消息页会话列表按订单定位（修复前恒取第一条会话）', firstMessage.listHasOrder === true, '')
    check('无会话订单给出「第一条绑定到该订单」提示', firstMessage.emptyHint === true, '')
    check(
      '第一条留言按订单建立线程',
      firstMessage.threadCreated && firstMessage.threadMessages === 1 && firstMessage.threadPostId === O1_ID,
      `messages=${firstMessage.threadMessages} postId=${firstMessage.threadPostId}`,
    )
    check('另一订单（SYNTH-POST-001）线程未被串线', firstMessage.p1Messages === 2, `p1=${firstMessage.p1Messages}`)
    check('留言出现在当前会话窗口', firstMessage.uiShowsMessage === true, '')

    /* ── 7. 第二条订单：认领后留言落到该订单 ──────────────────────── */
    const secondMessage = await evaluate(page, `(async () => {
      window.__clickText('nav button', '首页')
      ${settle}
      window.__clickText('button', '我要接单')
      ${settle}
      const detail = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('查看详情'))
      if (detail) detail.click()
      ${settle}
      const claim = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('认领并提供志愿服务'))
      if (claim) claim.click()
      ${settle}
      window.__clickText('nav button', '我的')
      ${settle}
      const volunteered = [...document.querySelectorAll('button[role="tab"]')]
        .find((b) => b.textContent.includes('我认领的志愿'))
      if (volunteered) volunteered.click()
      ${settle}
      const card = [...document.querySelectorAll('#profile-orders div.cursor-pointer')]
        .find((node) => node.textContent.includes(${JSON.stringify(P1_SNIPPET)}))
      if (!card) return { ok: false, step: '认领后未出现在我认领的志愿' }
      card.click()
      ${settle}
      const chat = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('订单内沟通留言'))
      if (!chat) return { ok: false, step: '订单详情缺少沟通入口' }
      chat.click()
      ${settle}
      window.__clickText('button', '订单留言')
      ${settle}
      // 焦点应落在刚认领的这条订单会话上，而不是上一条。
      const activeItem = document.querySelector('.nl-msg__item[aria-current="true"]')
      const composer = document.querySelector('input[aria-label="留言内容"]')
      if (!composer) return { ok: false, step: '私信通道未出现留言输入框' }
      window.__setValue(composer, ${JSON.stringify(MSG2)})
      ${settle}
      const form = composer.closest('form')
      const send = form ? [...form.querySelectorAll('button')].find((b) => b.textContent.includes('发送')) : null
      if (send) send.click()
      ${settle}
      const state = window.__readState()
      const o1Thread = (state?.threads ?? []).find((t) => t.postId === ${JSON.stringify(O1_ID)})
      const p1Thread = (state?.threads ?? []).find((t) => t.postId === 'SYNTH-POST-001')
      return {
        ok: true,
        activeTitle: activeItem?.textContent ?? '',
        o1Messages: o1Thread?.messages?.length ?? 0,
        p1Messages: p1Thread?.messages?.length ?? 0,
        p1Last: p1Thread?.messages?.[p1Thread.messages.length - 1]?.content ?? '',
      }
    })()`)
    check('认领另一订单后可继续履约沟通', secondMessage.ok === true, secondMessage.step ?? '')
    check(
      '焦点会话随订单切换（标题对得上）',
      secondMessage.ok && secondMessage.activeTitle.includes(P1_SNIPPET),
      secondMessage.activeTitle.slice(0, 50),
    )
    check(
      '第二条留言落到所认领订单的线程',
      secondMessage.p1Messages === 3 && secondMessage.p1Last === MSG2,
      `p1=${secondMessage.p1Messages} last=${secondMessage.p1Last}`,
    )
    check('第一条订单线程保持 1 条不串线', secondMessage.o1Messages === 1, `o1=${secondMessage.o1Messages}`)

    /* ── 7b. 私信会话直达订单详情（消息 ↔ 订单互跳闭环） ─────────────── */
    const chatToOrder = await evaluate(page, `(async () => {
      const jump = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('查看订单详情'))
      if (!jump) return { step: 'no-jump-button' }
      jump.click()
      ${settle}
      const text = document.body.innerText
      return {
        step: 'done',
        opened: text.includes('互助求助订单详情'),
        rightOrder: text.includes(${JSON.stringify(P1_SNIPPET)}),
        hasTimeline: text.includes('演练留痕'),
        timelineAccept: text.includes('标记接单') && text.includes('本机参与者'),
      }
    })()`)
    check(
      '私信会话可直达对应订单详情（不串单）',
      chatToOrder.step === 'done' && chatToOrder.opened === true && chatToOrder.rightOrder === true,
      `${chatToOrder.step} right=${chatToOrder.rightOrder}`,
    )
    check(
      '订单详情展示演练留痕时间线（含事件与操作方）',
      chatToOrder.step === 'done' && chatToOrder.hasTimeline === true && chatToOrder.timelineAccept === true,
      `timeline=${chatToOrder.hasTimeline} accept=${chatToOrder.timelineAccept}`,
    )
    await pressEscape(page)

    /* ── 8. 消息页（新会话列表）五档无横向溢出 ─────────────────────── */
    const overflow = {}
    for (const width of [320, 390, 768, 1024, 1440]) {
      await setViewport(page, width, 900)
      overflow[width] = await evaluate(page, `(() => {
        const doc = document.documentElement
        const body = document.body
        return Math.max(doc.scrollWidth - doc.clientWidth, body.scrollWidth - body.clientWidth)
      })()`)
    }
    const overflowBad = Object.entries(overflow).filter(([, value]) => value > 0)
    check(
      '消息页（订单会话列表）320/390/768/1024/1440 无横向溢出',
      overflowBad.length === 0,
      JSON.stringify(overflow),
    )

    /* ── 9. 发布者履约：发布 → 审核 → 代合成邻居接单 → 确认完成 → 账本 ─ */
    const C_TITLE = `演练-发布者履约-${STAMP}`
    const publishedOrder = await evaluate(page, `(async () => {
      window.__clickText('nav button', '发布')
      ${settle}
      window.__setValue(document.querySelector('#help-title'), ${JSON.stringify(C_TITLE)})
      window.__setValue(document.querySelector('#help-desc'), '合成演练：验证发布者视角的完整履约链路。')
      const boxes = [...document.querySelectorAll('input[type="checkbox"]')]
      boxes.forEach((box) => { if (!box.checked) box.click() })
      ${settle}
      window.__clickText('button', '确认发布到接单大厅')
      ${settle}
      const post = (window.__readState()?.posts ?? []).find((p) => p.title === ${JSON.stringify(C_TITLE)})
      return {
        submitted: Boolean(post),
        moderation: post?.moderation ?? null,
      }
    })()`)
    check('发布者发布求助订单进入待审', publishedOrder.submitted && publishedOrder.moderation === 'pending', `moderation=${publishedOrder.moderation}`)

    await evaluate(page, `(async () => {
      await window.__switchIdentity('审核员')
      window.__clickText('nav button', '我的')
      ${settle}
      window.__clickText('button', '演练审核与举报处置后台')
      ${settle}
      window.__clickText('button', '审核通过并公开')
      ${settle}
      window.__clickText('button', '关闭')
      ${settle}
      await window.__switchIdentity('已实名')
      return true
    })()`)
    const approvedOrder = await evaluate(page, `(async () => {
      const post = (window.__readState()?.posts ?? []).find((p) => p.title === ${JSON.stringify(C_TITLE)})
      return { moderation: post?.moderation ?? null }
    })()`)
    check('求助订单审核通过并公开', approvedOrder.moderation === 'approved', `moderation=${approvedOrder.moderation}`)

    const fulfilled = await evaluate(page, `(async () => {
      window.__clickText('nav button', '我的')
      ${settle}
      const card = [...document.querySelectorAll('#profile-orders div.cursor-pointer')]
        .find((node) => node.textContent.includes(${JSON.stringify(C_TITLE)}))
      if (!card) return { step: '我的订单里没有该订单' }
      card.click()
      ${settle}
      const counterpart = [...document.querySelectorAll('button')]
        .find((b) => b.textContent.includes('代合成邻居接单'))
      if (!counterpart) return { step: '缺少「代合成邻居接单（演练）」入口' }
      counterpart.click()
      ${settle}
      const text1 = document.body.innerText
      const acceptedUi = text1.includes('志愿者已认领')
      const confirmBtn = [...document.querySelectorAll('button')]
        .find((b) => b.textContent.includes('双方确认完成'))
      if (!confirmBtn) return { step: '接单后未出现完成确认入口', acceptedUi }
      const ledgerBefore = (window.__readState()?.ledgerEntries ?? []).length
      confirmBtn.click()
      ${settle}
      const submit = [...document.querySelectorAll('button')]
        .find((b) => b.textContent.includes('提交确认并记账'))
      if (!submit) return { step: '完成确认弹层未打开', acceptedUi }
      submit.click()
      ${settle}
      const state = window.__readState()
      const post = (state?.posts ?? []).find((p) => p.title === ${JSON.stringify(C_TITLE)})
      const events = post?.orderEvents ?? []
      return {
        step: 'done',
        acceptedUi,
        orderStatus: post?.orderStatus ?? '',
        ledgerBefore,
        ledgerAfter: (state?.ledgerEntries ?? []).length,
        counterpartAccept: events.some((e) => e.type === 'accept' && e.actor === 'synthetic-counterpart'),
        requested: events.some((e) => e.type === 'request-completion'),
        confirmed: events.some((e) => e.type === 'confirm-completion'),
        feedback: Boolean(post?.orderFeedback),
      }
    })()`)
    check(
      '发布者订单可代合成邻居接单（状态与入口联动）',
      fulfilled.step !== '我的订单里没有该订单' && fulfilled.step !== '缺少「代合成邻居接单（演练）」入口' && fulfilled.acceptedUi === true,
      fulfilled.step ?? '',
    )
    check('接单后发布者可发起双方确认（修复前必报角色错误）', fulfilled.step === 'done', fulfilled.step ?? '')
    check(
      '完成链路事件完整（代接单/申请/确认）',
      fulfilled.counterpartAccept === true && fulfilled.requested === true && fulfilled.confirmed === true,
      `accept=${fulfilled.counterpartAccept} req=${fulfilled.requested} confirm=${fulfilled.confirmed}`,
    )
    check(
      '发布者完成后账本新增未结算记录',
      fulfilled.orderStatus === 'completed-local-demo' && fulfilled.ledgerAfter === (fulfilled.ledgerBefore ?? 0) + 1,
      `${fulfilled.ledgerBefore} → ${fulfilled.ledgerAfter} status=${fulfilled.orderStatus}`,
    )
    check('完成评价已保存', fulfilled.feedback === true, '')

    /* ── 9b. 发布者订单的留痕时间线（含合成对方代记录标记） ─────────── */
    const fulfilledTimeline = await evaluate(page, `(async () => {
      window.__clickText('nav button', '我的')
      ${settle}
      const card = [...document.querySelectorAll('#profile-orders div.cursor-pointer')]
        .find((node) => node.textContent.includes(${JSON.stringify(C_TITLE)}))
      if (!card) return { step: 'no-card' }
      card.click()
      ${settle}
      const text = document.body.innerText
      return {
        step: 'done',
        opened: text.includes('互助求助订单详情'),
        hasTimeline: text.includes('演练留痕'),
        acceptByCounterpart: text.includes('标记接单') && text.includes('合成对方（代记录）'),
        requested: text.includes('发起完成申请'),
        confirmed: text.includes('确认完成'),
      }
    })()`)
    check(
      '发布者订单完成后可见完整留痕时间线',
      fulfilledTimeline.step === 'done'
        && fulfilledTimeline.opened === true
        && fulfilledTimeline.hasTimeline === true
        && fulfilledTimeline.acceptByCounterpart === true
        && fulfilledTimeline.requested === true
        && fulfilledTimeline.confirmed === true,
      `timeline=${fulfilledTimeline.hasTimeline} accept=${fulfilledTimeline.acceptByCounterpart} req=${fulfilledTimeline.requested} confirm=${fulfilledTimeline.confirmed}`,
    )
    await pressEscape(page)

    /* ── 10. 空动作如实化：证书真实下载、SOS 不谎称记录 ──────────────── */
    const downloadDir = mkdtempSync(join(tmpdir(), 'wb-fixes-dl-'))
    try {
      await page.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir })
    } catch {
      // 新版 Chrome 移除了 Page 级命令时退回 Browser 级。
      await connection.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir })
    }
    const certificate = await evaluate(page, `(async () => {
      window.__clickText('button', '志愿证明')
      ${settle}
      const download = [...document.querySelectorAll('button')]
        .find((b) => b.textContent.includes('下载证书'))
      if (!download) return { opened: false }
      download.click()
      ${settle}
      return { opened: document.body.innerText.includes('社区志愿服务电子证明') }
    })()`)
    await new Promise((resolve) => setTimeout(resolve, 1200))
    const { readdirSync, readFileSync: readDownloaded } = await import('node:fs')
    const dirListing = readdirSync(downloadDir)
    const certFile = dirListing.find((name) => /^community-drill-certificate-.*\.txt$/.test(name))
    let certContent = ''
    if (certFile) certContent = readDownloaded(join(downloadDir, certFile), 'utf8')
    check('证书弹层可打开', certificate.opened === true, '')
    check(
      '「下载证书」产出真实文本文件（含免责口径）',
      Boolean(certFile) && certContent.includes('不构成任何真实的志愿服务记录') && certContent.includes('证明编号'),
      certFile ?? `未检测到下载文件，目录内容：${JSON.stringify(dirListing)}`,
    )
    rmSync(downloadDir, { recursive: true, force: true })

    // 等上一条成功 toast（3.2s 存活）清掉，再验证失败分支不谎报成功。
    await new Promise((resolve) => setTimeout(resolve, 3500))
    const certFail = await evaluate(page, `(async () => {
      // 劫持 createObjectURL 模拟「浏览器拒绝创建下载」。
      const original = URL.createObjectURL
      URL.createObjectURL = () => { throw new Error('演练：拒绝创建下载') }
      try {
        const download = [...document.querySelectorAll('button')]
          .find((b) => b.textContent.includes('下载证书'))
        if (!download) return { clicked: false }
        download.click()
        ${settle}
        const toasts = window.__toasts()
        return {
          clicked: true,
          failedToast: toasts.some((t) => t.includes('证明下载失败')),
          noSuccessToast: toasts.every((t) => !t.includes('已请求下载')),
        }
      } finally {
        URL.createObjectURL = original
      }
    })()`)
    check(
      '证书下载失败给出可执行提示且不谎报成功',
      certFail.clicked === true && certFail.failedToast === true && certFail.noSuccessToast === true,
      JSON.stringify(certFail),
    )

    const sos = await evaluate(page, `(async () => {
      const close = [...document.querySelectorAll('button')]
        .find((b) => b.getAttribute('aria-label') === '关闭' || b.textContent.trim() === '关闭')
      if (close) close.click()
      ${settle}
      window.__clickText('nav button', '首页')
      ${settle}
      const entry = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('紧急求助'))
      if (!entry) return { opened: false }
      entry.click()
      ${settle}
      const drill = [...document.querySelectorAll('button')]
        .find((b) => b.textContent.includes('演练一次求助流程'))
      if (!drill) return { opened: true, drilled: false }
      drill.click()
      // 倒计时 3 档 × 900ms，等它走完。
      await new Promise((r) => setTimeout(r, 4200))
      const text = document.body.innerText
      return {
        opened: true,
        drilled: true,
        honestDone: text.includes('界面演练完成（未写入任何记录）'),
        noFalseRecord: !text.includes('已在本机记录'),
      }
    })()`)
    check('SOS 演练可走完', sos.opened && sos.drilled, '')
    check(
      'SOS 文案如实：演练完成且不再声称「已在本机记录」',
      sos.honestDone === true && sos.noFalseRecord === true,
      `honest=${sos.honestDone} noFalse=${sos.noFalseRecord}`,
    )
    await pressEscape(page)

    /* ── 11. A+ 普通新建不提供社区桥专属来源 ───────────────────────── */
    await navigate(page, `${BASE}/aplus.html`)
    const sourceOptions = await evaluate(page, `(async () => {
      const create = [...document.querySelectorAll('.heading-actions .button')].find((b) => b.textContent.includes('新建'))
      if (!create) return { opened: false }
      create.click()
      ${settle}
      const select = document.querySelector('#record-source')
      if (!select) return { opened: true, hasSelect: false }
      const options = [...select.options].map((option) => ({ value: option.value, label: option.textContent.trim() }))
      return { opened: true, hasSelect: true, value: select.value, options }
    })()`)
    const optionsOk =
      sourceOptions.hasSelect === true
      && sourceOptions.options.every((option) => option.value !== 'community-entry-local')
      && sourceOptions.options.some((option) => option.value === 'manual-entry')
    check(
      'A+ 普通新建不列出「社区入口演练」来源（修复前选了必失败）',
      sourceOptions.opened === true && optionsOk === true,
      JSON.stringify(sourceOptions.options ?? []),
    )
    check(
      '来源默认仍是「人工录入演练」',
      sourceOptions.value === 'manual-entry',
      `value=${sourceOptions.value}`,
    )

    /* ── 12. A+ 坏档导出失败分支：不标记已下载、不谎报成功 ──────────── */
    await evaluate(page, `localStorage.setItem('a-plus.synthetic-intake.v1', 'not-json')`)
    await navigate(page, `${BASE}/aplus.html`)
    const exportFail = await evaluate(page, `(async () => {
      const button = [...document.querySelectorAll('button')]
        .find((b) => b.textContent.includes('下载无法读取的旧存档'))
      if (!button) return { step: 'no-button', text: document.body.innerText.slice(0, 80) }
      const original = URL.createObjectURL
      URL.createObjectURL = () => { throw new Error('演练：拒绝创建下载') }
      let failedToast = ''
      try {
        button.click()
        ${settle}
        failedToast = document.querySelector('.toast')?.textContent ?? ''
      } finally {
        URL.createObjectURL = original
      }
      // 等失败 toast 自动清掉后恢复重试：应走成功路径，证明失败分支没有卡死状态。
      await new Promise((r) => setTimeout(r, 2800))
      button.click()
      ${settle}
      const successToast = document.querySelector('.toast')?.textContent ?? ''
      return { step: 'done', failedToast, successToast }
    })()`)
    check(
      'A+ 坏档导出失败提示可执行且未标记已下载',
      exportFail.step === 'done'
        && exportFail.failedToast.includes('原文下载失败')
        && exportFail.failedToast.includes('尚未标记为已下载'),
      exportFail.failedToast.slice(0, 90) || (exportFail.text ?? ''),
    )
    check(
      '恢复后坏档导出可正常完成',
      exportFail.step === 'done' && exportFail.successToast.includes('已下载无法读取的旧存档原文'),
      exportFail.successToast.slice(0, 60),
    )

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
    check('全流程无控制台异常（B+A+ 双端）', errors.errors.length === 0, errors.errors.slice(0, 3).join(' | '))
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
