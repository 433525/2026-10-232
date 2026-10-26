import React from 'react';
import { cn } from '../utils/cn';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'brand' | 'ink' | 'accent';
  className?: string;
}

/**
 * 头像：没有真实照片时用姓氏首字，避免加载外部图片。
 * 姓名可能是「演练居民·小禾（虚构）」，取第一个非符号字符。
 */
export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', tone = 'brand', className }) => {
  const initial = (name.replace(/[·\s（(].*$/, '').trim()[0] ?? '邻').toUpperCase();
  return (
    <span
      className={cn(
        'nl-avatar',
        size !== 'md' && `nl-avatar--${size}`,
        tone !== 'brand' && `nl-avatar--${tone}`,
        className,
      )}
      aria-hidden="true"
    >
      {src ? <img src={src} alt="" loading="lazy" decoding="async" /> : initial}
    </span>
  );
};
