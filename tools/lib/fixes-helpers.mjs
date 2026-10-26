/**
 * 验收脚本公共注入块（零依赖）。
 *
 * 由 `check-fixes*.mjs` 与 `check-p0-gaps.mjs` 共用：页面内助手只在
 * `evaluate(page, helpers)` 后存在，不进入产品代码，也不依赖任何全局状态。
 */

/** 页面内等待片段：直接插进模板串，作为 `await` 表达式使用。 */
export const SETTLE = 'await new Promise((r) => setTimeout(r, 400))'

/**
 * 生成页面内助手脚本。
 * @param {string} stateKey 存档键（`localStorage` 中的业务状态）
 * @returns {string} 可直接交给 `evaluate(page, ...)` 的脚本
 */
export function makeHelpers(stateKey) {
  return `
window.__readState = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(${JSON.stringify(stateKey)}) || 'null')
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
}
