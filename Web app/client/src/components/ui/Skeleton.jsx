import React from 'react';
import './Skeleton.css';

const Skeleton = ({ width, height, borderRadius, className = '', style = {} }) => (
  <div
    className={`db-skeleton ${className}`}
    style={{ width, height, borderRadius: borderRadius || 'var(--radius)', ...style }}
  />
);

export const SkeletonText = ({ lines = 3, className = '' }) => (
  <div className={`db-skeleton-text ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height="14px"
        width={i === lines - 1 ? '60%' : '100%'}
        borderRadius="var(--radius-sm)"
        style={{ marginBottom: i < lines - 1 ? 'var(--space-2)' : 0 }}
      />
    ))}
  </div>
);

export const SkeletonCard = ({ className = '' }) => (
  <div className={`db-skeleton-card ${className}`}>
    <Skeleton height="20px" width="50%" borderRadius="var(--radius-sm)" />
    <Skeleton height="36px" width="30%" borderRadius="var(--radius-sm)" style={{ marginTop: 'var(--space-3)' }} />
    <Skeleton height="14px" width="40%" borderRadius="var(--radius-sm)" style={{ marginTop: 'var(--space-3)' }} />
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4, className = '' }) => (
  <div className={`db-skeleton-table ${className}`}>
    <div className="db-skeleton-table__header">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} height="14px" width="80%" borderRadius="var(--radius-sm)" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, row) => (
      <div key={row} className="db-skeleton-table__row">
        {Array.from({ length: cols }).map((_, col) => (
          <Skeleton key={col} height="14px" width={col === 0 ? '70%' : '50%'} borderRadius="var(--radius-sm)" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonAvatar = ({ size = 40, className = '' }) => (
  <Skeleton width={size} height={size} borderRadius="50%" className={className} />
);

export default Skeleton;
