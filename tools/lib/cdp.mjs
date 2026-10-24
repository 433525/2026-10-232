/**
 * cdp.mjs — 零依赖的 Chrome DevTools Protocol 客户端。
 *
 * 为什么不用 Playwright/Puppeteer：本项目要求「不引入新依赖」，而验收只需要
 * 「开页 → 收集控制台异常 → 量 overflow → 点按钮 → 按 Esc」这五件事。
 * Node 22 自带全局 WebSocket 与 fetch，够用了。
 *
 * 用法见 tools/check-dual-entry.mjs。
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean)

export function findChrome() {
  const hit = CHROME_CANDIDATES.find((path) => existsSync(path))
  if (!hit) throw new Error('未找到 Chrome/Edge，可通过 CHROME_PATH 指定')
  return hit
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function launchChrome({ port = 9333, width = 1440, height = 900 } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'wb-cdp-'))
  const child = spawn(findChrome(), [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-features=Translate,OptimizationHints',
    `--window-size=${width},${height}`,
    'about:blank',
  ], { stdio: 'ignore' })

  const endpoint = `http://127.0.0.1:${port}`
  let version = null
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${endpoint}/json/version`)
      if (response.ok) {
        version = await response.json()
        break
      }
    } catch {
      // 端口尚未就绪。
    }
    await delay(200)
  }
  if (!version) {
    child.kill()
    rmSync(profile, { recursive: true, force: true })
    throw new Error('Chrome 调试端口未就绪')
  }

  return {
    version,
    endpoint,
    async close() {
      child.kill()
      await delay(200)
      // Windows 上 Chrome 退出时会短暂占用 profile 里的文件（Crashpad 等），
      // 直接 rmSync 会抛 EBUSY/EPERM 把整轮验收判成失败。清理属收尾动作，
      // 失败只重试、不改变断言结果。
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          rmSync(profile, { recursive: true, force: true })
          return
        } catch {
          await delay(250)
        }
      }
      console.warn(`[cdp] 临时 profile 未能清理，可手工删除：${profile}`)
    },
  }
}

export class CDPConnection {
  #socket
  #nextId = 1
  #pending = new Map()
  #listeners = new Map()

  constructor(webSocketUrl) {
    this.#socket = new WebSocket(webSocketUrl)
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.#socket.addEventListener('open', resolve, { once: true })
      this.#socket.addEventListener('error', () => reject(new Error('CDP WebSocket 连接失败')), { once: true })
    })
    this.#socket.addEventListener('message', (event) => this.#onMessage(event.data))
    return this
  }

  #onMessage(raw) {
    const message = JSON.parse(raw)
    if (message.id && this.#pending.has(message.id)) {
      const { resolve, reject } = this.#pending.get(message.id)
      this.#pending.delete(message.id)
      if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`))
      else resolve(message.result)
      return
    }
    if (!message.method) return
    for (const listener of this.#listeners.get(message.method) ?? []) {
      listener(message.params, message.sessionId)
    }
  }

  on(method, listener) {
    const list = this.#listeners.get(method) ?? []
    list.push(listener)
    this.#listeners.set(method, list)
    return () => {
      const current = this.#listeners.get(method) ?? []
      this.#listeners.set(method, current.filter((item) => item !== listener))
    }
  }

  send(method, params = {}, sessionId) {
    const id = this.#nextId++
    const payload = { id, method, params }
    if (sessionId) payload.sessionId = sessionId
    this.#socket.send(JSON.stringify(payload))
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject })
      setTimeout(() => {
        if (!this.#pending.has(id)) return
        this.#pending.delete(id)
        reject(new Error(`CDP 超时：${method}`))
      }, 30_000)
    })
  }

  close() {
    this.#socket.close()
  }

  /** 打开一个页面并返回会话句柄（flatten 模式，命令按 sessionId 路由）。 */
  async newPage(url) {
    const { targetId } = await this.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true })
    const session = {
      targetId,
      sessionId,
      send: (method, params) => this.send(method, params, sessionId),
      /** 只接收本会话的事件；返回值用于解绑。 */
      on: (method, listener) => this.on(method, (params, sid) => {
        if (sid === sessionId) listener(params)
      }),
    }
    await session.send('Page.enable')
    await session.send('Runtime.enable')
    await session.send('Log.enable')
    if (url) await navigate(session, url)
    return session
  }
}

export async function navigate(session, url) {
  await session.send('Page.navigate', { url })
  // 轮询 readyState 比等 loadEventFired 稳：多入口页面在 chunk 预取阶段就可能已触发一次 load。
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const state = await evaluate(session, 'document.readyState')
      if (state === 'complete') {
        await delay(350)
        return
      }
    } catch {
      // 导航过程中执行上下文会被销毁，忽略后重试。
    }
    await delay(100)
  }
  throw new Error(`页面未在预期时间内就绪：${url}`)
}

/** 收集页面上的异常与错误级日志。返回数组与清理函数。 */
export function collectErrors(session) {
  const errors = []
  const offs = [
    session.on('Runtime.exceptionThrown', (params) => {
      const detail = params.exceptionDetails
      errors.push(`[exception] ${detail?.exception?.description ?? detail?.text ?? 'unknown'}`)
    }),
    session.on('Runtime.consoleAPICalled', (params) => {
      if (params.type !== 'error' && params.type !== 'warning') return
      const text = (params.args ?? []).map((arg) => arg.value ?? arg.description ?? arg.type).join(' ')
      errors.push(`[console.${params.type}] ${text}`)
    }),
    session.on('Log.entryAdded', (params) => {
      if (params.entry?.level !== 'error') return
      errors.push(`[log] ${params.entry.text}`)
    }),
  ]
  return { errors, stop: () => offs.forEach((off) => off()) }
}

export async function evaluate(session, expression) {
  const result = await session.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? '页面求值失败')
  }
  return result.result?.value
}

export async function setViewport(session, width, height = 900) {
  await session.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 480,
  })
  await delay(150)
}

export async function screenshot(session, filePath) {
  const { data } = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  const { writeFileSync } = await import('node:fs')
  writeFileSync(filePath, Buffer.from(data, 'base64'))
}

export async function pressEscape(session) {
  for (const type of ['keyDown', 'keyUp']) {
    await session.send('Input.dispatchKeyEvent', {
      type,
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27,
      nativeVirtualKeyCode: 27,
    })
  }
  await delay(150)
}
