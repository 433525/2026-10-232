import React from 'react';
import { cn } from '../utils/cn';

type Variant = 'primary' | 'ghost' | 'quiet' | 'danger';
type Size = 'md' | 'sm' | 'xs' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

/**
 * 统一按钮：胶囊形，无投影。
 * 尺寸只分四档，避免各页自行发明 28/32/38 的高度。
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', size = 'md', block, icon, iconRight, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        'nl-btn',
        `nl-btn--${variant}`,
        size !== 'md' && `nl-btn--${size}`,
        block && 'nl-btn--block',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  ),
);

Button.displayName = 'Button';
