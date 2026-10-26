import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}

/** 空态：虚线描边而不是灰色实块，和「未完成」的语义一致。 */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, hint, action }) => (
  <div className="nl-empty">
    {icon ? <span className="text-muted">{icon}</span> : null}
    <p className="nl-empty__title">{title}</p>
    {hint ? <p className="nl-empty__hint">{hint}</p> : null}
    {action ? <div className="mt-2">{action}</div> : null}
  </div>
);
