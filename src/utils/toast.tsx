/**
 * 全局提示（Toast）——单例、可被读屏播报。
 *
 * 借鉴 community-service-mvp `a-plus-app/src/aplus/toast.ts` 的设计：
 * 不引入第三方组件库，由文案特征推断等级，错误等级决定 role/aria-live
 * （error → role="alert" + aria-live="assertive"；其余 → role="status" + polite），
 * 避免每个调用点重复传参。
 */
import React, { useEffect, useState } from 'react';

export type ToastVariant = 'info' | 'success' | 'error';

/** 文案特征推断：失败/阻断类语气 → 错误级，读屏需立即打断播报 */
const ERROR_HINT = /失败|错误|请先|请填写|须先|不能|无效|已达|上限|无法|未保存|已停止|不可用|拒绝|禁止|违规|命中|超时|驳回|取消/;
const SUCCESS_HINT = /成功|已提交|已保存|已完成|已入账|已复制|已发送|已发布|已生成|到账|通过|已恢复|已确认|已办结|已认领|已接单/;

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

let seq = 0;
let items: ToastItem[] = [];
const listeners = new Set<() => void>();
const timers = new Map<number, number>();

function notifyChange() {
  listeners.forEach((l) => l());
}

function inferVariant(message: string, explicit?: ToastVariant): ToastVariant {
  if (explicit) return explicit;
  if (ERROR_HINT.test(message)) return 'error';
  if (SUCCESS_HINT.test(message)) return 'success';
  return 'info';
}

/** 弹出一条全局提示（同一时间只保留最近 3 条，旧提示自动让位） */
export function toast(message: string, variant?: ToastVariant) {
  if (!message) return;
  const id = ++seq;
  items = [...items, { id, message, variant: inferVariant(message, variant) }].slice(-3);
  notifyChange();

  const timer = window.setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    timers.delete(id);
    notifyChange();
  }, 3200);
  timers.set(id, timer);
}

/** 订阅当前提示列表（组件渲染用） */
export function useToasts(): ToastItem[] {
  const [, force] = useState(0);
  useEffect(() => {
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return items;
}

const VARIANT_STYLE: Record<ToastVariant, string> = {
  info: 'bg-slate-900/92 text-white border-slate-700/60',
  success: 'bg-emerald-700/95 text-white border-emerald-500/50',
  error: 'bg-rose-700/95 text-white border-rose-400/50',
};

const VARIANT_ICON: Record<ToastVariant, string> = {
  info: 'i',
  success: '✓',
  error: '!',
};

/** 全局提示容器：移动端居中吸底，桌面端居中置顶，pointer-events-none 不阻挡交互 */
export const Toaster: React.FC = () => {
  const toasts = useToasts();
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-24 sm:bottom-8 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.variant === 'error' ? 'alert' : 'status'}
          aria-live={t.variant === 'error' ? 'assertive' : 'polite'}
          className={`pointer-events-auto max-w-[92vw] sm:max-w-md w-auto px-4 py-2.5 rounded-2xl shadow-2xl border text-sm font-medium flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200 ${VARIANT_STYLE[t.variant]}`}
        >
          <span
            aria-hidden="true"
            className="mt-0.5 w-5 h-5 rounded-full bg-white/20 text-[12px] font-black flex items-center justify-center shrink-0"
          >
            {VARIANT_ICON[t.variant]}
          </span>
          <span className="leading-relaxed break-words">{t.message}</span>
        </div>
      ))}
    </div>
  );
};
