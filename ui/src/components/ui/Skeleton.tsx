import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'card' | 'row' | 'text';
  count?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'row',
  count = 1
}) => {
  const baseClass = 'animate-pulse rounded';

  const variantClasses = {
    card: 'bg-white border border-steel h-48',
    row: 'h-12 bg-steel/20',
    text: 'h-4 bg-steel/20 w-3/4',
  };

  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={`${baseClass} ${variantClasses[variant]} ${className}`}
        />
      ))}
    </>
  );
};

export default Skeleton;
