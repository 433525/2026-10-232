/**
 * A+ 工作台的依赖注入上下文。
 *
 * 页面结构层级较深（布局 → 面板 → 对话框），若逐层透传会产生几十个 props。
 * 这里用 React Context 只下发一个工作台对象：状态是 ref/computed（读 `.value`），
 * 动作是函数。`useAplusContext()` 顺带订阅 store 版本号，子组件因此共享同一份状态。
 *
 * 与 mvp `aplus/context.ts` 的差异：`inject` → `useContext`，并补一次
 * `useSyncExternalStore`，因为 React 没有 Vue 的依赖收集。
 */
import { createContext, useContext, useSyncExternalStore } from 'react'
import { aplusWorkbench, type AplusWorkbench } from './workbench'

const AplusWorkbenchContext = createContext<AplusWorkbench | null>(null)

const noopSubscribe = () => () => {}
const zeroVersion = () => 0

export function AplusProvider({ children }: { children: React.ReactNode }) {
  return (
    <AplusWorkbenchContext.Provider value={aplusWorkbench}>
      {children}
    </AplusWorkbenchContext.Provider>
  )
}

/** 读取工作台；同时把组件挂到 store 的订阅上。 */
export function useAplusContext(): AplusWorkbench {
  const workbench = useContext(AplusWorkbenchContext)
  const subscribe = workbench ? workbench.subscribe : noopSubscribe
  const getVersion = workbench ? workbench.getVersion : zeroVersion
  useSyncExternalStore(subscribe, getVersion, getVersion)

  if (!workbench) {
    throw new Error('A+ 子组件必须渲染在 <AplusProvider> 提供的上下文内')
  }
  return workbench
}
