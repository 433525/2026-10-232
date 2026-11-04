/**
 * useTablist：为筛选组补全 WAI-ARIA Tabs 的键盘契约。
 *
 * 逐条对应 mvp 的 `v-tablist` 指令：
 * - 只有当前选中项进入 Tab 序列（roving tabindex）；
 * - ←/→/↑/↓ 循环切换，Home/End 跳到首尾，Enter/Space 由原生按钮处理；
 * - 自动激活：焦点移动即触发 click，与既有筛选逻辑保持一致。
 * 只改变键盘行为，不改变 DOM 结构与业务状态。
 */
import { useEffect, useRef, type KeyboardEvent } from 'react'

function tabsOf(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
    .filter((node) => !node.hasAttribute('disabled'))
}

function syncTabIndex(root: HTMLElement | null) {
  if (!root) return
  const tabs = tabsOf(root)
  if (!tabs.length) return
  let active = tabs.findIndex((node) => node.getAttribute('aria-selected') === 'true')
  if (active < 0) active = 0
  tabs.forEach((node, index) => { node.tabIndex = index === active ? 0 : -1 })
}

export function useTablist() {
  const rootRef = useRef<HTMLDivElement | null>(null)

  // 每次渲染后同步 roving tabindex（对应指令的 updated 钩子）。
  useEffect(() => {
    syncTabIndex(rootRef.current)
  })

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const root = event.currentTarget
    const target = event.target as HTMLElement | null
    if (!target || target.getAttribute('role') !== 'tab') return
    const tabs = tabsOf(root)
    if (tabs.length < 2) return
    const current = tabs.indexOf(target as HTMLButtonElement)
    if (current < 0) return

    let next = -1
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % tabs.length
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    if (next < 0) return

    event.preventDefault()
    const node = tabs[next]
    node.focus()
    node.click()
    syncTabIndex(root)
  }

  return { rootRef, onKeyDown }
}
