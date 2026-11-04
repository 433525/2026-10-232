/**
 * A+ 入口启动模块。
 *
 * 与 B 端的区别：不引入 Tailwind（A+ 复用 mvp 的原生 CSS，类名与令牌不改），
 * 只加载 `src/aplus/styles.css`。
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AplusApp from './aplus/App'
import './aplus/styles.css'
import { installErrorReporting } from './shared/error-reporting'

installErrorReporting('intake')

const container = document.getElementById('aplus-root')
if (container) {
  createRoot(container).render(
    <StrictMode>
      <AplusApp />
    </StrictMode>,
  )
}
