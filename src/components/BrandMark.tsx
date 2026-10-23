import React from 'react';

interface BrandMarkProps {
  size?: number;
  className?: string;
  /** mono = 单色描边版，用于证书/页脚等需要单色的场景 */
  tone?: 'color' | 'mono';
}

/**
 * 翠湖社区「时间银行」品牌标识 —— 手绘矢量（非位图）。
 *
 * 造型语义：外圈 = 社区守望的圆满；沙漏 = 可储蓄的时间；
 * 下方托举弧 = 双手相托的邻里互助；顶端星芒 = 时间币的微光。
 * 16px 下仍可辨识，可任意缩放与单色化。
 */
export const BrandMark: React.FC<BrandMarkProps> = ({
  size = 40,
  className = '',
  tone = 'color',
}) => {
  const isMono = tone === 'mono';
  const ringId = isMono ? 'bm-ring-mono' : 'bm-ring';
  const sandId = isMono ? 'bm-sand-mono' : 'bm-sand';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="翠湖社区时间银行标识"
      className={className}
    >
      <defs>
        <linearGradient id={ringId} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          {isMono ? (
            <>
              <stop offset="0%" stopColor="currentColor" />
              <stop offset="100%" stopColor="currentColor" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#059669" />
              <stop offset="55%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#0f766e" />
            </>
          )}
        </linearGradient>
        <linearGradient id={sandId} x1="15" y1="11" x2="33" y2="37" gradientUnits="userSpaceOnUse">
          {isMono ? (
            <>
              <stop offset="0%" stopColor="currentColor" />
              <stop offset="100%" stopColor="currentColor" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </>
          )}
        </linearGradient>
      </defs>

      {/* 外圈：守望的圆满 */}
      <circle cx="24" cy="24" r="21" fill="none" stroke={`url(#${ringId})`} strokeWidth="2.6" />

      {/* 沙漏上盖 / 下盖 */}
      <rect x="13.2" y="8.6" width="21.6" height="3.2" rx="1.6" fill={`url(#${ringId})`} />
      <rect x="13.2" y="36.2" width="21.6" height="3.2" rx="1.6" fill={`url(#${ringId})`} />

      {/* 沙漏本体（对称蝴蝶结造型） */}
      <path
        d="M15.4 12.2 H32.6 L24 23 L32.6 33.8 H15.4 L24 23 Z"
        fill={`url(#${sandId})`}
        stroke={`url(#${ringId})`}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* 托举的双手 / 邻里互助弧 */}
      <path
        d="M10.4 27.2 C10.4 34.4 16.4 39.6 24 39.6 C31.6 39.6 37.6 34.4 37.6 27.2"
        fill="none"
        stroke={`url(#${ringId})`}
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* 顶端星芒：时间币微光 */}
      <path
        d="M24 1.6 L25.7 5 L29.1 6.7 L25.7 8.4 L24 11.8 L22.3 8.4 L18.9 6.7 L22.3 5 Z"
        fill={isMono ? 'currentColor' : '#f59e0b'}
      />
    </svg>
  );
};
