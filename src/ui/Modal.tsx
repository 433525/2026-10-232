import React from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useDialog } from '../hooks/useDialog';

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** 880px 双栏弹层（发布、订单详情） */
  wide?: boolean;
  /** 移动端改为底部抽屉 */
  sheet?: boolean;
  /** 移动端铺满全屏（发布流程） */
  full?: boolean;
  className?: string;
  bodyClassName?: string;
  /** 隐藏右上角关闭按钮时，由内容自己提供返回路径 */
  hideClose?: boolean;
}

/**
 * 统一弹层容器。
 * 可访问性交给 useDialog：Esc 关闭、Tab 循环、滚动锁定、焦点归还。
 * 视觉：24px 圆角 + 1px 描边 + 遮罩，不使用投影。
 */
export const Modal: React.FC<ModalProps> = ({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
  sheet,
  full,
  className = '',
  bodyClassName = '',
  hideClose,
}) => {
  useDialog(true, onClose);

  const content = (
    <div className="nl-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`${sheet ? 'nl-sheet' : 'nl-modal'} ${wide ? 'nl-modal--wide' : ''} ${
          full ? 'nl-modal--full' : ''
        } ${className}`.trim()}
      >
        {sheet ? <div className="nl-sheet__handle" aria-hidden="true" /> : null}
        <div className="nl-modal__head">
          <div>
            <h2 className="nl-modal__title">{title}</h2>
            {subtitle ? <p className="nl-modal__sub">{subtitle}</p> : null}
          </div>
          {hideClose ? null : (
            <button type="button" className="nl-modal__close" onClick={onClose} aria-label="关闭">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className={`nl-modal__body ${bodyClassName}`.trim()}>{children}</div>
        {footer ? <div className="nl-modal__foot">{footer}</div> : null}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
