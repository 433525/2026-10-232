/**
 * 弹层可访问性基线（借鉴 community-service-mvp findings 的统一键盘行为）：
 * - 打开时焦点进入弹层
 * - Tab 在弹层内循环
 * - Esc 关闭并把焦点归还给触发元素
 * - 打开时锁定页面滚动（背景不可滚）
 */
import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialog(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 焦点进入弹层：优先第一个可聚焦元素，否则弹层容器本身
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]:last-of-type');
    const container = dialog || document.body;
    const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
    (focusables[0] || container).focus?.();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [open]);
}
