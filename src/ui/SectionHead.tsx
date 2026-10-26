import React from 'react';

interface SectionHeadProps {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  id?: string;
  className?: string;
}

/** 区块标题：15px 无衬线 SemiBold（衬线只留给页面主标题）。 */
export const SectionHead: React.FC<SectionHeadProps> = ({ title, sub, action, id, className = '' }) => (
  <div className={`nl-sec ${className}`.trim()}>
    <div>
      <h2 id={id} className="nl-sec__title">
        {title}
      </h2>
      {sub ? <p className="nl-sec__sub">{sub}</p> : null}
    </div>
    {action}
  </div>
);
