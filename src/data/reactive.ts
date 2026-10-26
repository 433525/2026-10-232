/**
 * 极小的响应式原语（约 90 行，零依赖）。
 *
 * 移植自 community-service-mvp 的 Vue/Pinia 数据层时，业务逻辑本身与框架无关，
 * 只有 `ref` / `computed` / `defineStore` 三个 API 需要落地。这里用最少的代码
 * 提供等价语义，避免为了“跑起来”而引入运行时框架，也避免把 store 改写成另一套
 * 状态机（那会让 mvp 的既有回归全部失效）。
 *
 * 约定：
 * - `ref` 只承担「读得到最新值 + 写入时通知订阅者」，不做深层代理；
 *   两个 store 都以不可变快照方式写回（`xxx.value = nextState.xxx`），
 *   因此不需要 Proxy 级别的依赖追踪。
 * - 一次动作要写多个 ref 时用 `batch()` 包起来：通知合并到批末一次，
 *   避免 useSyncExternalStore 的连环同步重渲染。
 * - `computed` 是惰性 getter，不缓存。展示层每次渲染重算，规模在千级以内，
 *   代价可以接受；换来的是没有失效标记这块最容易出错的状态。
 * - `createReactiveStore` 返回的对象同时是「store 实例」和「订阅源」：
 *   属性访问走 Proxy 转发到内部实例，`subscribe` / `getVersion` 供
 *   React `useSyncExternalStore` 使用。
 */

type Listener = () => void

/** 创建 ref 时所在的 store；ref 的写入只通知自己所属的 store。 */
let activeSink: Listener | null = null

/** 批处理深度；>0 时各 store 的通知挂起，退到 0 时统一冲刷。 */
let batchDepth = 0
/** 批处理期间发生过写入的 store 的冲刷函数（每 store 至多冲刷一次）。 */
const pendingFlushes = new Set<() => void>()

/**
 * 批处理：`fn` 内的所有 ref 写入只在结束时向订阅者通知一次。
 *
 * 一次业务动作往往连续改写多个 ref（提交快照要写状态、时间与多类数据），
 * 逐次同步通知会让 useSyncExternalStore 连环触发同步重渲染，在挂载窗口内
 * 甚至会叠加成 React #185。批内版本号仍随每次写入递增，getVersion 语义不变；
 * 嵌套安全，`fn` 抛错也会在 finally 中冲刷与退出。
 */
export function batch<R>(fn: () => R): R {
  batchDepth += 1
  try {
    return fn()
  } finally {
    batchDepth -= 1
    if (batchDepth === 0) {
      const flushes = [...pendingFlushes]
      pendingFlushes.clear()
      for (const flush of flushes) flush()
    }
  }
}

export interface Ref<T> {
  value: T
}

export function ref<T>(initial: T): Ref<T> {
  const sink = activeSink
  let current = initial
  return {
    get value(): T {
      return current
    },
    set value(next: T) {
      if (Object.is(current, next)) return
      current = next
      sink?.()
    },
  }
}

export function computed<T>(getter: () => T): Readonly<Ref<T>> {
  return {
    get value(): T {
      return getter()
    },
  } as Readonly<Ref<T>>
}

export interface StoreInternals {
  /** 仅用于调试与 DevTools 辨识，不参与业务。 */
  readonly storeId: string
  subscribe(listener: Listener): () => void
  getVersion(): number
  /** 强制读取实例（首次调用时执行 setup）。 */
  resolve(): unknown
}

export type ReactiveStore<T> = T & StoreInternals

/**
 * `defineStore(id, setup)` 的等价物：单例 + 懒初始化 + 订阅。
 * 同一个 id 在一个页面生命周期内只会执行一次 `setup`。
 *
 * 注意：这里**不是**函数而是对象。Vue 里 `useStore()` 是取单例的语法糖，
 * React 侧由 `useSyncExternalStore` 驱动，保留可调用形状只会让类型变复杂。
 */
export function createReactiveStore<T extends object>(id: string, setup: () => T): ReactiveStore<T> {
  let instance: T | null = null
  let version = 0
  const listeners = new Set<Listener>()

  const flush = () => {
    for (const listener of [...listeners]) listener()
  }
  const emit: Listener = () => {
    version += 1
    if (batchDepth > 0) {
      pendingFlushes.add(flush)
      return
    }
    flush()
  }

  const resolve = (): T => {
    if (instance === null) {
      activeSink = emit
      try {
        instance = setup()
      } finally {
        activeSink = null
      }
    }
    return instance
  }

  const internals: StoreInternals = {
    storeId: id,
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getVersion: () => version,
    resolve,
  }

  return new Proxy(internals as ReactiveStore<T>, {
    get(target, key, receiver) {
      if (key in target) return Reflect.get(target, key, receiver)
      const value = Reflect.get(resolve(), key)
      return typeof value === 'function' ? value.bind(resolve()) : value
    },
    has(target, key) {
      return key in target || key in resolve()
    },
    ownKeys() {
      return [...new Set([...Reflect.ownKeys(internals), ...Reflect.ownKeys(resolve())])]
    },
    getOwnPropertyDescriptor(target, key) {
      const own = Reflect.getOwnPropertyDescriptor(target, key)
      if (own) return own
      return Reflect.getOwnPropertyDescriptor(resolve(), key) ?? { configurable: true, enumerable: true }
    },
    set(target, key, value, receiver) {
      if (key in target) return Reflect.set(target, key, value, receiver)
      return Reflect.set(resolve(), key, value)
    },
  })
}
