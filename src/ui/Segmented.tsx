import React from 'react';

interface SegmentedProps {
  items: { key: string; label: React.ReactNode; count?: number }[];
  value: string;
  onChange: (key: string) => void;
  label: string;
  className?: string;
}

/**
 * 分段控件（tablist）。
 * 方向键 / Home / End 切换，符合 APG Tabs 模式。
 */
export const Segmented: React.FC<SegmentedProps> = ({ items, value, onChange, label, className = '' }) => {
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowRight'
            ? (index + 1) % items.length
            : (index - 1 + items.length) % items.length;
    onChange(items[next].key);
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[next]?.focus();
  };

  return (
    <div className={`nl-seg ${className}`.trim()} role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={value === item.key}
          tabIndex={value === item.key ? 0 : -1}
          className="nl-seg__btn"
          onClick={() => onChange(item.key)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {item.label}
          {typeof item.count === 'number' && item.count > 0 ? (
            <span className="nl-seg__count" aria-label={`${item.count} 条未读`}>
              {item.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
};
