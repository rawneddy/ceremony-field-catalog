import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-12 ${className}`}>
      {Icon && (
        <div className="bg-steel/30 p-4 rounded-full mb-4">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-xl font-bold text-ink mb-2">{title}</h3>
      {description && (
        <p className="text-slate-500 max-w-md">{description}</p>
      )}
    </div>
  );
};

export default EmptyState;
