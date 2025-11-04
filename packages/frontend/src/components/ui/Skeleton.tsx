import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animate?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  lines = 1,
  animate = true,
}) => {
  const baseClasses = `
    ${animate ? 'animate-pulse' : ''}
    ${className}
  `;

  const variantClasses = {
    text: 'bg-gray-200 rounded',
    circular: 'bg-gray-200 rounded-full',
    rectangular: 'bg-gray-200',
    rounded: 'bg-gray-200 rounded-lg',
  };

  const defaultStyles = {
    text: { height: '1rem', width: width || '100%' },
    circular: { height: height || '2.5rem', width: width || '2.5rem' },
    rectangular: { height: height || '1rem', width: width || '100%' },
    rounded: { height: height || '1rem', width: width || '100%' },
  };

  const style = {
    ...defaultStyles[variant],
    ...(width && { width }),
    ...(height && { height }),
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${baseClasses}`}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={`${variantClasses[variant]}`}
            style={{
              ...style,
              width: i === lines - 1 ? '70%' : '100%', // Last line is shorter
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]}`}
      style={style}
    />
  );
};

// Predefined skeleton components for common use cases
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`p-4 border rounded-lg ${className}`}>
    <div className="flex items-center space-x-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton width="40%" height={16} />
        <Skeleton width="60%" height={14} />
      </div>
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ items?: number; className?: string }> = ({
  items = 3,
  className
}) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: items }, (_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  className?: string
}> = ({ rows = 5, columns = 4, className }) => (
  <div className={`space-y-3 ${className}`}>
    {/* Header */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }, (_, i) => (
        <Skeleton key={`header-${i}`} variant="text" height={20} width="20%" />
      ))}
    </div>

    {/* Rows */}
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="flex space-x-4">
        {Array.from({ length: columns }, (_, colIndex) => (
          <Skeleton key={`cell-${rowIndex}-${colIndex}`} variant="text" height={16} width="20%" />
        ))}
      </div>
    ))}
  </div>
);

export const FormSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`space-y-6 ${className}`}>
    <div className="space-y-2">
      <Skeleton width="30%" height={16} />
      <Skeleton height={40} />
    </div>
    <div className="space-y-2">
      <Skeleton width="25%" height={16} />
      <Skeleton height={40} />
    </div>
    <div className="space-y-2">
      <Skeleton width="35%" height={16} />
      <Skeleton height={80} />
    </div>
    <Skeleton width="40%" height={40} />
  </div>
);

export default Skeleton;