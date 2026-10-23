/**
 * 本地持久化安全读写。
 *
 * 借鉴 community-service-mvp 的“单条容错、存档级严格”读取器：
 * 单条记录损坏时跳过并告警，只有存档级问题（非 JSON / 版本不符 / 结构非法）
 * 才回退默认值，绝不让一条坏数据把整个应用拖成白屏。
 */

const ENVELOPE_VERSION = 1;

interface Envelope<T> {
  v: number;
  savedAt: string;
  data: T;
}

function warn(key: string, reason: string) {
  // 便于排查：仅在开发期打印，不影响用户
  if (typeof console !== 'undefined') {
    console.warn(`[storage] 读取本地存档失败（${key}）：${reason}，已回退默认数据`);
  }
}

function isValidEnvelope(value: unknown): value is Envelope<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'v' in value &&
    'data' in value &&
    typeof (value as Envelope<unknown>).v === 'number'
  );
}

/**
 * 安全读取本地数据。
 * @param key 存储键名
 * @param fallback 兜底默认值
 * @param validate 可选的结构校验（例如必须是数组）
 */
export function safeRead<T>(key: string, fallback: T, validate?: (data: unknown) => boolean): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;

    const parsed: unknown = JSON.parse(raw);
    if (isValidEnvelope(parsed)) {
      if (parsed.v > ENVELOPE_VERSION) {
        warn(key, `存档版本 ${parsed.v} 高于当前支持版本`);
        return fallback;
      }
      if (validate && !validate(parsed.data)) {
        warn(key, '存档结构校验未通过');
        return fallback;
      }
      return parsed.data as T;
    }

    // 兼容裸数据（早期版本直接写数组/对象）
    if (validate && !validate(parsed)) {
      warn(key, '裸数据结构校验未通过');
      return fallback;
    }
    return parsed as T;
  } catch (err) {
    warn(key, err instanceof Error ? err.message : '未知解析错误');
    return fallback;
  }
}

/** 安全写入本地数据（配额满 / 隐私模式下不抛异常，返回是否成功） */
export function safeWrite<T>(key: string, data: T): boolean {
  try {
    const envelope: Envelope<T> = {
      v: ENVELOPE_VERSION,
      savedAt: new Date().toISOString(),
      data,
    };
    window.localStorage.setItem(key, JSON.stringify(envelope));
    return true;
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn(`[storage] 写入本地存档失败（${key}）：`, err);
    }
    return false;
  }
}

/** 校验器：必须是数组 */
export const isArray = (data: unknown): boolean => Array.isArray(data);

/** 校验器：必须是非 null 对象 */
export const isObject = (data: unknown): boolean =>
  typeof data === 'object' && data !== null && !Array.isArray(data);

/** 一键清空本应用所有本地存档（用于“恢复演示数据”） */
export function clearAppStorage(prefix = 'cuihu.'): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // 忽略隐私模式下的访问异常
  }
}
