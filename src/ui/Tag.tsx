import React from 'react';

interface TagProps {
  tone?: 'brand' | 'accent' | 'danger' | 'warn' | 'neutral' | 'solid' | 'outline';
  children: React.ReactNode;
  className?: string;
}

/** 分类标签：不承担点击，只做归类。 */
export const Tag: React.FC<TagProps> = ({ tone = 'brand', children, className = '' }) => (
  <span className={`nl-tag${tone === 'brand' ? '' : ` nl-tag--${tone}`} ${className}`.trim()}>
    {children}
  </span>
);
