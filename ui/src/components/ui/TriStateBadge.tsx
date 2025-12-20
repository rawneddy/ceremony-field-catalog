import React from 'react';
import type { TriState } from '../../types';

interface TriStateBadgeProps {
  value: TriState;
  className?: string;
}

/**
 * Displays a tri-state value (yes/no/mixed) with appropriate styling.
 * Used in aggregated views where boolean fields may have different values across variants.
 *
 * - yes: green (all variants are true)
 * - no: gray (all variants are false)
 * - mixed: amber (variants have different values)
 */
const TriStateBadge: React.FC<TriStateBadgeProps> = ({ value, className = '' }) => {
  const styles: Record<TriState, { bg: string; text: string; label: string }> = {
    yes: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      label: 'Yes',
    },
    no: {
      bg: 'bg-slate-100',
      text: 'text-slate-500',
      label: 'No',
    },
    mixed: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      label: 'Mixed',
    },
  };

  const style = styles[value];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${style.bg} ${style.text} ${className}`}
    >
      {style.label}
    </span>
  );
};

export default TriStateBadge;
