/**
 * error-reporting.ts — 统一异常上报（React 版）。
 *
 * 与 mvp 的 Vue 版差异：Vue 通过 `app.config.errorHandler` 兜住渲染异常，
 * React 没有等价钩子，改为「全局 error 事件 + 未处理拒绝 + 错误边界」三处：
 * - `installErrorReporting('aplus')` 在入口调用一次，挂 window 监听；
 * - 渲染期异常由 `AppErrorBoundary` 捕获后派发同一事件；
 * - 监听方（工作台的 `onAppError`）只显示可读提示，不暴露堆栈给用户。
 */
export interface AppErrorDetail {
  message: string
}

export const APP_ERROR_EVENT = 'app:error'

/** 页面级可读提示；不包含堆栈、URL 或任何业务数据。 */
export const APP_ERROR_MESSAGE = '界面出现异常，当前本机数据未被修改；如页面无法继续操作，请刷新后重试。'

export function reportAppError(scope: string, error: unknown): void {
  console.error(`[${scope}] render error`, error)
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<AppErrorDetail>(APP_ERROR_EVENT, {
    detail: { message: APP_ERROR_MESSAGE },
  }))
}

export function installErrorReporting(scope: 'intake' | 'community'): () => void {
  if (typeof window === 'undefined') return () => {}

  const onError = (event: ErrorEvent) => {
    console.error(`[${scope}] window error`, event.error ?? event.message)
    window.dispatchEvent(new CustomEvent<AppErrorDetail>(APP_ERROR_EVENT, {
      detail: { message: APP_ERROR_MESSAGE },
    }))
  }
  const onRejection = (event: PromiseRejectionEvent) => {
    // 未处理的 Promise 拒绝只记录到控制台，避免打断本机演练流程。
    console.error(`[${scope}] unhandled rejection`, event.reason)
  }

  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
  }
}
