interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, className }: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--color-border)',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
      }}
    />
  )
}

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Skeleton height={14} width="55%" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <Skeleton key={i} height={12} width={i % 2 === 0 ? '80%' : '65%'} />
      ))}
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
      <Skeleton height={13} width="35%" />
      <Skeleton height={13} width="20%" />
      <Skeleton height={13} width="15%" />
    </div>
  )
}

export function SkeletonStatCard() {
  return (
    <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton height={10} width="40%" />
      <Skeleton height={36} width="55%" borderRadius={6} />
      <Skeleton height={10} width="70%" />
    </div>
  )
}
