/**
 * check-recovery.mjs — §7 存储契约里的「异常路径」验收（零依赖，CDP 驱动）。
 *
 * 覆盖四个此前无法验证的点：
 * 1. 存档异常在界面上是**可见**的（此前 store 有六态，但没有任何组件读取）；
 * 2. 坏档 `recovery-required`：写入被拦、原文可下载、下载前不允许重置、下载后可重置；
 * 3. 跨标签 `conflict`：另一标签页改写后出现提示，载入最新存档可消解；
 * 4. 评论级举报：目标落到 comment 而不是父帖，并能被审核端处置；
 * 5. 备份导入：合法备份可覆盖并立即生效，版本不符与超限文件被拒绝且不改存档；
 * 6. 订单留言举报：目标落到 message。
 *
 * 另附静态扫描：官方化措辞（网格/居委会/街道）、电话链接、真实格式手机号与身份证号。
 *
 * 用法：先 build + preview 到 5180，再 `node tools/check-recovery.mjs`。
 */
import { mkdirSync, mkdtempSync, writeFileSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
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
const OUT_DIR = join(process.cwd(), 'docs', 'evidence', 'recovery')
const STATE_KEY = 'community-mvp.synthetic-state.v1'

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const settle = `await new Promise((r) => setTimeout(r, 400))`

const HELPERS = `
window.__key = ${JSON.stringify(STATE_KEY)}
window.__raw = () => localStorage.getItem(window.__key)
window.__state = () => {
  try {
    const env = JSON.parse(window.__raw())
    return env && env.state ? env.state : null
  } catch { return null }
}
// 只在本页生效：让 window.confirm 直接通过，用于验证「确认后」的分支。
window.__autoConfirm = () => { window.confirm = () => true }
window.__buttons = () => [...document.querySelectorAll('button')]
window.__btn = (text) => window.__buttons().find((b) => b.textContent.includes(text))
window.__btnExact = (text) => window.__buttons().find((b) => b.textContent.trim() === text)
window.__click = (text) => { const b = window.__btn(text); if (!b) return false; b.click(); return true }
window.__clickExact = (text) => { const b = window.__btnExact(text); if (!b) return false; b.click(); return true }
// 底部导航的「消息」按钮内含未读数角标，textContent 不是纯标签文字；按 nav 作用域包含匹配。
window.__navClick = (text) => {
  const b = [...document.querySelectorAll('nav button')].find((item) => item.textContent.includes(text))
  if (!b) return false
  b.click()
  return true
}
window.__toasts = () => [...document.querySelectorAll('[role="status"][aria-live], [role="alert"][aria-live]')]
  .map((n) => n.textContent.trim()).join(' | ')
window.__lastToast = () => {
  const nodes = [...document.querySelectorAll('[role="status"][aria-live], [role="alert"][aria-live]')]
  return nodes.length ? nodes[nodes.length - 1].textContent.trim() : ''
}
window.__alertText = () => [...document.querySelectorAll('[role="alert"]')].map((n) => n.textContent.trim()).join(' | ')
window.__bannerText = () => {
  const node = document.querySelector('main [role="alert"], main [role="status"]')
  return node ? node.textContent.trim() : ''
}
window.__hasText = (text) => document.body.innerText.includes(text)
window.__resetButton = () => window.__buttons().find((b) => b.textContent.includes('恢复初始演练数据')) ?? null
`

function walkFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walkFiles(full, acc)
    else acc.push(full)
  }
  return acc
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const chrome = await launchChrome({ port: 9351 })
  const connection = await new CDPConnection(chrome.version.webSocketDebuggerUrl).open()

  try {
    const page = await connection.newPage()
    const errors = collectErrors(page)
    await setViewport(page, 1440, 1000)
    await navigate(page, `${BASE}/`)
    await evaluate(page, HELPERS)
    await evaluate(page, 'window.__autoConfirm()')

    // ── 1. 存档面板可达 ───────────────────────────────────────────────
    await evaluate(page, `(async () => { window.__clickExact('我的'); ${settle} })()`)
    const openAdmin = await evaluate(page, `(async () => {
      const ok = window.__click('演练审核与举报处置后台')
      ${settle}
      return { ok, opened: window.__hasText('内容审核与举报处置') }
    })()`)
    check('「我的」→ 演练审核后台可打开', openAdmin.ok === true && openAdmin.opened === true)

    const openStorage = await evaluate(page, `(async () => {
      const ok = window.__click('存档与恢复')
      ${settle}
      return { ok, panel: window.__hasText('存档与恢复（本机演练）') }
    })()`)
    check('后台新增「存档与恢复」页签且面板可见', openStorage.ok === true && openStorage.panel === true)

    const initialState = await evaluate(page, `(() => ({
      status: window.__hasText('已保存在本机') || window.__hasText('尚未写入（初始演练数据）'),
      keyShown: window.__hasText('community-mvp.synthetic-state.v1'),
      exportButton: !!window.__btn('导出当前备份 JSON'),
    }))()`)
    check(
      '面板显示存档状态、存档键与导出入口',
      initialState.status && initialState.keyShown && initialState.exportButton,
      JSON.stringify(initialState),
    )

    const exported = await evaluate(page, `(async () => {
      window.__click('导出当前备份 JSON')
      ${settle}
      return window.__toasts()
    })()`)
    check('导出当前备份有明确反馈', String(exported).includes('已请求下载备份'))

    await pressEscape(page)

    // ── 2. 坏档：可见、拦截、先取原文再重置 ───────────────────────────
    await evaluate(page, `localStorage.setItem(window.__key, '{"app":"community-mvp","broken":')`)
    await navigate(page, `${BASE}/`)
    await evaluate(page, HELPERS)
    await evaluate(page, 'window.__autoConfirm()')

    const corruptBanner = await evaluate(page, `(() => ({
      alert: window.__alertText(),
    }))()`)
    check(
      '坏档后顶部出现 role=alert 的存档警示',
      String(corruptBanner.alert).includes('存档无法读取'),
      String(corruptBanner.alert).slice(0, 60),
    )

    const blockedWrite = await evaluate(page, `(async () => {
      window.__clickExact('社区')
      ${settle}
      const flag = document.querySelector('button[aria-label^="举报这条内容"]')
      if (!flag) return { clicked: false }
      flag.click()
      ${settle}
      const raw = window.__raw()
      return { clicked: true, toast: window.__toasts(), rawAfter: raw }
    })()`)
    check(
      '坏档期间写入被拦截并提示恢复路径',
      blockedWrite.clicked === true
        && String(blockedWrite.toast).includes('已停止所有写入')
        && String(blockedWrite.toast).includes('存档与恢复'),
      String(blockedWrite.toast).slice(0, 80),
    )

    const stillBroken = await evaluate(page, `(() => {
      try { JSON.parse(window.__raw()); return false } catch { return true }
    })()`)
    check('被拦截的写入没有覆盖坏档原文', stillBroken === true)

    const storageGuard = await evaluate(page, `(async () => {
      window.__clickExact('我的')
      ${settle}
      window.__click('演练审核与举报处置后台')
      ${settle}
      window.__click('存档与恢复')
      ${settle}
      const btn = window.__resetButton()
      return {
        panel: window.__hasText('旧存档原文仍在浏览器里'),
        found: !!btn,
        disabled: btn ? btn.disabled === true : false,
      }
    })()`)
    check(
      '坏档时面板要求先取回原文，重置按钮禁用',
      storageGuard.panel === true && storageGuard.found === true && storageGuard.disabled === true,
      JSON.stringify(storageGuard),
    )

    const download = await evaluate(page, `(async () => {
      window.__click('下载旧存档原文')
      ${settle}
      const btn = window.__resetButton()
      return { toast: window.__toasts(), enabled: btn ? btn.disabled === false : false }
    })()`)
    check(
      '下载原文后重置按钮解锁',
      String(download.toast).includes('已请求下载旧存档原文') && download.enabled === true,
      JSON.stringify(download),
    )

    const reset = await evaluate(page, `(async () => {
      window.__click('恢复初始演练数据')
      ${settle}
      const state = window.__state()
      let savedAt = null
      try { savedAt = JSON.parse(window.__raw()).savedAt ?? null } catch {}
      return {
        bannerGone: !window.__hasText('存档无法读取'),
        posts: state ? state.posts.length : 0,
        savedAt,
      }
    })()`)
    check(
      '确认后重置成功：警示消失、存档可解析、种子数据恢复',
      reset.bannerGone === true && reset.posts > 0 && Boolean(reset.savedAt),
      JSON.stringify(reset),
    )

    // 重置会把身份恢复为「访客」；后续写操作与举报都要求 member，先切回成员。
    const switchToMember = await evaluate(page, `(async () => {
      const header = document.querySelector('header')
      const trigger = [...header.querySelectorAll('button')].find((b) => b.textContent.includes('演练访客'))
      if (trigger) trigger.click()
      ${settle}
      const item = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('演练用户'))
      if (item) item.click()
      ${settle}
      return window.__hasText('演练用户')
    })()`)
    check('可切换到已实名演练成员', switchToMember === true)

    await pressEscape(page)
    await evaluate(page, `(async () => { window.__clickExact('首页'); ${settle} })()`)

    // ── 3. 跨标签冲突：可见 + 可载入 ─────────────────────────────────
    const second = await connection.newPage(`${BASE}/`)
    await evaluate(second, `(() => {
      const raw = localStorage.getItem(${JSON.stringify(STATE_KEY)})
      const env = JSON.parse(raw)
      env.savedAt = new Date(Date.now() + 60_000).toISOString()
      localStorage.setItem(${JSON.stringify(STATE_KEY)}, JSON.stringify(env))
      return true
    })()`)
    await new Promise((resolve) => setTimeout(resolve, 600))

    const conflict = await evaluate(page, `(() => ({
      banner: window.__bannerText(),
      hasReload: !!window.__btn('载入最新存档'),
    }))()`)
    check(
      '另一标签页写入后本页出现冲突警示',
      String(conflict.banner).includes('另一个标签页改写了存档') && conflict.hasReload === true,
      String(conflict.banner).slice(0, 60),
    )

    const blockedByConflict = await evaluate(page, `(async () => {
      window.__clickExact('社区')
      ${settle}
      const flag = document.querySelector('button[aria-label^="举报这条内容"]')
      if (!flag) return { toast: 'no-flag' }
      flag.click()
      ${settle}
      return { toast: window.__lastToast() }
    })()`)
    check(
      '冲突期间写入被拦下且提示先载入',
      String(blockedByConflict.toast).includes('已停止写入'),
      String(blockedByConflict.toast).slice(0, 70),
    )

    const reloaded = await evaluate(page, `(async () => {
      const btn = window.__btn('载入最新存档')
      if (!btn) return { clicked: false }
      btn.click()
      ${settle}
      return { clicked: true, banner: window.__bannerText() }
    })()`)
    const pageRaw = await evaluate(page, 'window.__raw()')
    const secondRaw = await evaluate(second, `localStorage.getItem(${JSON.stringify(STATE_KEY)})`)
    check(
      '载入最新存档后冲突消解且两端一致',
      reloaded.clicked === true
        && !String(reloaded.banner).includes('另一个标签页')
        && pageRaw === secondRaw,
      String(reloaded.banner).slice(0, 60),
    )
    await connection.send('Target.closeTarget', { targetId: second.targetId })

    // ── 4. 评论级举报（当前身份已是演练成员）────────────────────────
    const commentReport = await evaluate(page, `(async () => {
      window.__clickExact('社区')
      ${settle}
      const toggle = document.querySelector('button[aria-label*="评论（"]')
      if (!toggle) return { opened: false }
      toggle.click()
      ${settle}
      const flag = document.querySelector('button[aria-label^="举报 "][aria-label$="的这条评论"]')
      if (!flag) return { opened: true, flagged: false }
      flag.click()
      ${settle}
      const state = window.__state()
      const reports = (state && state.reports) || []
      const latest = reports[0]
      return {
        opened: true,
        flagged: true,
        toast: window.__toasts(),
        targetType: latest ? latest.targetType : null,
        targetId: latest ? latest.targetId : null,
      }
    })()`)
    check(
      '评论有独立举报入口，目标落在该评论上',
      commentReport.flagged === true
        && commentReport.targetType === 'comment'
        && String(commentReport.targetId).startsWith('SYNTH-COMMENT'),
      JSON.stringify({ targetType: commentReport.targetType, targetId: commentReport.targetId }),
    )

    const switchToReviewer = await evaluate(page, `(async () => {
      const header = document.querySelector('header')
      const trigger = [...header.querySelectorAll('button')].find((b) => b.textContent.includes('演练用户'))
      if (trigger) trigger.click()
      ${settle}
      const item = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('演练审核员'))
      if (item) item.click()
      ${settle}
      return window.__hasText('演练审核员')
    })()`)
    check('可切换到演练审核员', switchToReviewer === true)

    const reviewTicket = await evaluate(page, `(async () => {
      window.__clickExact('我的')
      ${settle}
      window.__click('演练审核与举报处置后台')
      ${settle}
      window.__click('举报处置工单')
      ${settle}
      return { shown: window.__hasText('演练评论'), hasResolve: !!window.__btn('确认办结') }
    })()`)
    check(
      '审核端把评论举报显示为「演练评论」',
      reviewTicket.shown === true && reviewTicket.hasResolve === true,
      JSON.stringify(reviewTicket),
    )

    const resolved = await evaluate(page, `(async () => {
      window.__click('确认办结')
      ${settle}
      const state = window.__state()
      const reports = (state && state.reports) || []
      const target = reports.find((item) => item.targetType === 'comment')
      return {
        status: target ? target.status : null,
        resolution: target ? target.resolution : null,
        audit: (state && state.auditLog ? state.auditLog.length : 0),
      }
    })()`)
    check(
      '处置后举报状态与结论写入存档',
      resolved.status === 'resolved' && Boolean(resolved.resolution) && resolved.audit > 0,
      JSON.stringify(resolved),
    )
    await pressEscape(page)

    // ── 5. 备份导入（文件选择用 CDP DOM.setFileInputFiles 真实触发）─────
    const tmpDir = mkdtempSync(join(tmpdir(), 'wb-recovery-'))
    const uploadFile = async (selector, filePath) => {
      await page.send('DOM.enable')
      const { root } = await page.send('DOM.getDocument', { depth: 1 })
      const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector })
      if (!nodeId) throw new Error(`未找到文件输入：${selector}`)
      await page.send('DOM.setFileInputFiles', { files: [filePath], nodeId })
    }

    const openStoragePanel = `(async () => {
      window.__clickExact('我的')
      ${settle}
      window.__click('演练审核与举报处置后台')
      ${settle}
      window.__click('存档与恢复')
      ${settle}
      return !!document.querySelector('input[data-storage-import]')
    })()`
    const panelOpened = await evaluate(page, openStoragePanel)
    check('存档面板提供导入入口（隐藏文件输入）', panelOpened === true)

    const rawBeforeImport = await evaluate(page, 'window.__raw()')
    const validBackup = JSON.parse(rawBeforeImport)
    validBackup.state.posts[0].title = '导入验证：本机备份'
    const validPath = join(tmpDir, 'valid-backup.json')
    writeFileSync(validPath, JSON.stringify(validBackup), 'utf8')

    await uploadFile('input[data-storage-import]', validPath)
    await new Promise((resolve) => setTimeout(resolve, 700))
    const imported = await evaluate(page, `(async () => {
      const state = window.__state()
      return {
        toast: window.__lastToast(),
        title: state && state.posts[0] ? state.posts[0].title : null,
      }
    })()`)
    check(
      '合法备份导入后立即覆盖本机存档',
      String(imported.toast).includes('已导入本机备份') && imported.title === '导入验证：本机备份',
      JSON.stringify(imported),
    )

    const badPath = join(tmpDir, 'bad-version.json')
    writeFileSync(badPath, JSON.stringify({
      app: 'community-mvp',
      kind: 'synthetic-community-demo',
      schemaVersion: 99,
      savedAt: new Date().toISOString(),
      state: {},
    }), 'utf8')
    await uploadFile('input[data-storage-import]', badPath)
    await new Promise((resolve) => setTimeout(resolve, 500))
    const rejectedVersion = await evaluate(page, `(() => ({
      toast: window.__lastToast(),
      title: window.__state()?.posts[0]?.title ?? null,
    }))()`)
    check(
      '版本不符的备份被拒绝且不改存档',
      String(rejectedVersion.toast).includes('版本不受支持')
        && rejectedVersion.title === '导入验证：本机备份',
      JSON.stringify(rejectedVersion),
    )

    const hugePath = join(tmpDir, 'too-large.json')
    writeFileSync(hugePath, 'x'.repeat(5 * 1024 * 1024 + 64), 'utf8')
    await uploadFile('input[data-storage-import]', hugePath)
    await new Promise((resolve) => setTimeout(resolve, 500))
    const rejectedSize = await evaluate(page, `(() => ({
      toast: window.__lastToast(),
      title: window.__state()?.posts[0]?.title ?? null,
    }))()`)
    check(
      '超过 5 MB 的备份文件被拒绝且不改存档',
      String(rejectedSize.toast).includes('超过 5 MB')
        && rejectedSize.title === '导入验证：本机备份',
      JSON.stringify(rejectedSize),
    )
    rmSync(tmpDir, { recursive: true, force: true })

    // ── 6. 订单留言举报（先接单成为参与方）─────────────────────────────
    await pressEscape(page)
    const messageReport = await evaluate(page, `(async () => {
      // 导入阶段身份仍是审核员；接单与留言举报都要求已实名成员，先切回。
      const header = document.querySelector('header')
      const trigger = [...header.querySelectorAll('button')].find((b) => b.textContent.includes('审核员'))
      if (trigger) trigger.click()
      ${settle}
      const member = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('演练用户'))
      if (member) member.click()
      ${settle}
      window.__navClick('首页')
      ${settle}
      window.__click('我要接单')
      ${settle}
      window.__click('查看详情')
      ${settle}
      window.__click('认领并提供志愿服务')
      ${settle}
      window.__navClick('消息')
      ${settle}
      window.__click('订单留言')
      ${settle}
      const flag = document.querySelector('button[aria-label^="举报这条留言"]')
      if (!flag) return { accepted: true, flagged: false, text: document.body.innerText.slice(0, 80) }
      flag.click()
      ${settle}
      const state = window.__state()
      const reports = (state && state.reports) || []
      const latest = reports[0]
      return {
        accepted: true,
        flagged: true,
        toast: window.__lastToast(),
        who: (document.querySelector('header')?.innerText ?? '').includes('演练用户'),
        targetType: latest ? latest.targetType : null,
        targetId: latest ? latest.targetId : null,
      }
    })()`)
    check(
      '订单留言可单独举报，目标落在该留言上',
      messageReport.flagged === true
        && messageReport.targetType === 'message'
        && String(messageReport.targetId).startsWith('SYNTH-MESSAGE'),
      JSON.stringify({
        flagged: messageReport.flagged,
        target: messageReport.targetId,
        who: messageReport.who,
        toast: messageReport.toast,
      }),
    )

    // ── 7. 窄屏不溢出（警示条也在 DOM 里时）──────────────────────────
    await evaluate(page, `localStorage.setItem(window.__key, 'not-json')`)
    await navigate(page, `${BASE}/`)
    await evaluate(page, HELPERS)
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
      '坏档警示条在 320/390/768/1024/1440 均无横向溢出',
      overflowBad.length === 0,
      JSON.stringify(overflow),
    )
    check('异常路径控制台零错误', errors.errors.length === 0, errors.errors.slice(0, 2).join(' / '))
    errors.stop()

    // ── 8. 静态扫描：官方化措辞与真实个人信息 ────────────────────────
    const files = walkFiles(join(process.cwd(), 'src'))
    const sourceText = files.map((file) => readFileSync(file, 'utf8')).join('\n')
    const officialPattern = /网格员|网格长|网格管理|居委会|街道办/
    const officialHits = files.filter((file) => officialPattern.test(readFileSync(file, 'utf8')))
    check(
      '源码不含「网格/居委会/街道办」等官方化措辞',
      officialHits.length === 0,
      officialHits.map((file) => file.replace(process.cwd(), '')).join(', '),
    )

    const telHits = (sourceText.match(/href=["']tel:/g) ?? []).length
    check('全仓无 tel: 链接（非急救通道）', telHits === 0, `count=${telHits}`)

    const phoneHits = sourceText.match(/1[3-9]\d{9}/g) ?? []
    const idHits = sourceText.match(/\b\d{17}[\dXx]\b/g) ?? []
    check(
      '全仓无真实格式手机号与身份证号',
      phoneHits.length === 0 && idHits.length === 0,
      `phone=${phoneHits.length} id=${idHits.length}`,
    )

    const passed = results.filter((item) => item.ok).length
    console.log(`\n${passed}/${results.length} 通过`)
    writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify({
      generatedAt: new Date().toISOString(),
      base: BASE,
      total: results.length,
      passed,
      results,
    }, null, 2))
    if (passed !== results.length) process.exitCode = 1
  } finally {
    connection.close()
    await chrome.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
