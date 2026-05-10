interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  size?: 'sm' | 'md' | 'lg';
}

export default function EmptyState({
  icon = '🔭',
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
}: EmptyStateProps) {
  const paddingMap = { sm: 'var(--space-8)', md: 'var(--space-16)', lg: 'var(--space-16)' };
  const iconSizeMap = { sm: 56, md: 80, lg: 100 };
  const titleSizeMap = { sm: 'var(--text-base)', md: 'var(--text-xl)', lg: 'var(--text-2xl)' };

  return (
    <div
      className="empty-state"
      style={{ padding: `${paddingMap[size]} var(--space-8)` }}
      role="status"
      aria-label={title}
    >
      <div
        className="empty-state-icon"
        style={{ width: iconSizeMap[size], height: iconSizeMap[size], fontSize: iconSizeMap[size] * 0.4 }}
      >
        {icon}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxWidth: 360 }}>
        <h3
          style={{
            fontSize: titleSizeMap[size],
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          {title}
        </h3>
        {description && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.7, margin: 0 }}>
            {description}
          </p>
        )}
      </div>

      {(action || secondaryAction) && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
          {action && (
            <button className="btn btn-primary btn-sm" onClick={action.onClick} id={`empty-action-${title.replace(/\s+/g, '-').toLowerCase()}`}>
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button className="btn btn-ghost btn-sm" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
