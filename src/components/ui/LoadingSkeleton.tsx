interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 'var(--radius-sm)', style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      aria-hidden="true"
      style={{ width, height, borderRadius, flexShrink: 0, ...style }}
    />
  );
}

export function CreatorCardSkeleton() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
        <Skeleton width={48} height={48} borderRadius="50%" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton height={12} />
      <Skeleton width="80%" height={12} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton width={60} height={24} borderRadius="var(--radius-full)" />
        <Skeleton width={80} height={24} borderRadius="var(--radius-full)" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={100} height={14} />
        <Skeleton width={80} height={32} borderRadius="var(--radius-full)" />
      </div>
    </div>
  );
}

export function PortfolioModalSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
        <Skeleton width={72} height={72} borderRadius="50%" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton width="50%" height={20} />
          <Skeleton width="35%" height={14} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Skeleton width={50} height={22} borderRadius="var(--radius-full)" />
            <Skeleton width={70} height={22} borderRadius="var(--radius-full)" />
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={120} borderRadius="var(--radius-md)" />
        ))}
      </div>
      <Skeleton height={14} />
      <Skeleton width="90%" height={14} />
      <Skeleton width="75%" height={14} />
    </div>
  );
}

export default Skeleton;
