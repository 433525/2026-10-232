import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  /** 加载失败时展示的占位说明文字 */
  fallbackLabel?: string;
}

/**
 * 带兜底的图片：加载失败不留下破图空洞，而是退化为品牌渐变占位块。
 * 同时统一开启懒加载与异步解码，避免长列表首屏卡顿。
 */
export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel = '社区实拍',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={`${alt}（图片加载失败，已显示占位图）`}
        className={`flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-emerald-100 via-teal-50 to-slate-100 text-emerald-700/70 ${className}`}
      >
        <ImageOff className="w-5 h-5" />
        <span className="text-[10px] font-medium px-2 text-center leading-tight">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
