/**
 * 模态对话框的焦点管理（WAI-ARIA APG「Dialog (Modal)」模式的最小实现）。
 *
 * 职责边界：
 * 1. 打开时把焦点移入对话框：优先 `[data-autofocus]`，其次首个可编辑字段，最后首个可聚焦元素；
 * 2. 打开期间把 Tab / Shift+Tab 的循环限制在对话框内；
 * 3. Esc 交给调用方关闭（是否允许关闭由业务决定）；
 * 4. 关闭后把焦点还给触发元素，元素已移除时保持浏览器默认焦点。
 *
 * 与 mvp 的差异：Vue 用 `watch(isOpen)` 自动触发，React 没有等价的同步点，
 * 改为由工作台在每次开/关动作末尾显式调用 `sync()`。判定逻辑逐条对应原实现。
 * 这里按 APG 的“模态”语义只处理键盘焦点，背景的 inert 由模板绑定完成；
 * 不使用 `aria-hidden`，避免与 inert 双重隐藏导致读屏重复播报。
 */

/** 与既有 DOM 约定保持一致：.modal 与 .dialog-card 都是对话框容器。 */
const DIALOG_ROOT_SELECTOR = '.modal-backdrop .modal, .modal-backdrop .dialog-card'

/**
 * 可 Tab 聚焦的候选。排除隐藏输入、负 tabindex、禁用与不可见节点，
 * 与 tabbable 的判定口径一致但不引入依赖。
 */
const FOCUSABLE_SELECTOR = [
  'button',
  '[href]',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export interface DialogFocusOptions {
  /** 当前是否有对话框打开。 */
  isOpen: () => boolean
  /** Esc 按下时的关闭动作。 */
  onEscape: () => void
}

export interface DialogFocusController {
  /** 在开/关状态变化后调用；重复调用是幂等的。 */
  sync(): void
  /** 安装全局键盘监听；返回解绑函数。 */
  attach(): () => void
}

function nextFrame(callback: () => void): void {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => callback())
  else window.setTimeout(callback, 0)
}

export function createDialogFocus({ isOpen, onEscape }: DialogFocusOptions): DialogFocusController {
  let returnFocus: HTMLElement | null = null
  let wasOpen = false

  function dialogRoot(): HTMLElement | null {
    return document.querySelector<HTMLElement>(DIALOG_ROOT_SELECTOR)
  }

  function focusables(): HTMLElement[] {
    const root = dialogRoot()
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((node) => {
      if (node.hasAttribute('disabled') || node.getAttribute('aria-hidden') === 'true') return false
      if (node.closest('[inert]')) return false
      // getClientRects 为空说明节点或祖先不可见（display:none / 未挂载）。
      if (!node.getClientRects().length) return false
      return getComputedStyle(node).visibility !== 'hidden'
    })
  }

  function onDocumentKeydown(event: KeyboardEvent) {
    if (!isOpen()) return

    if (event.key === 'Escape') {
      event.preventDefault()
      onEscape()
      return
    }
    if (event.key !== 'Tab') return

    const candidates = focusables()
    if (!candidates.length) return
    const first = candidates[0]
    const last = candidates[candidates.length - 1]
    const active = document.activeElement as HTMLElement | null

    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    } else if (!active || !candidates.includes(active)) {
      // 焦点被脚本或浏览器移出对话框时拉回，避免键盘用户“掉”到背景页面。
      event.preventDefault()
      first.focus()
    }
  }

  function focusIntoTarget() {
    const root = dialogRoot()
    const preferred = root?.querySelector<HTMLElement>('[data-autofocus]')
    const field = root?.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([readonly]), textarea:not([readonly]), select',
    )
    ;(preferred ?? field ?? focusables()[0])?.focus()
  }

  function sync() {
    const open = isOpen()
    if (open === wasOpen) return
    wasOpen = open

    if (open) {
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      nextFrame(focusIntoTarget)
      return
    }

    const target = returnFocus
    returnFocus = null
    // 触发元素可能随列表重渲染消失；此时保持浏览器默认焦点，不做强制跳转。
    nextFrame(() => {
      if (target && target.isConnected) target.focus({ preventScroll: true })
    })
  }

  function attach(): () => void {
    document.addEventListener('keydown', onDocumentKeydown)
    return () => document.removeEventListener('keydown', onDocumentKeydown)
  }

  return { sync, attach }
}
