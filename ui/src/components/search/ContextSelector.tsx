import React from 'react';
import type { ContextWithCount } from '../../types';

interface ContextSelectorProps {
  value: string;
  onChange: (value: string) => void;
  contexts: ContextWithCount[];
}

const ContextSelector: React.FC<ContextSelectorProps> = ({ value, onChange, contexts }) => {
  const activeContexts = contexts.filter(c => c.active);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white border border-steel rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ceremony/20 focus:border-ceremony transition-all font-bold appearance-none cursor-pointer"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        backgroundSize: '16px'
      }}
    >
      <option value="">All Contexts</option>
      {activeContexts.map((context) => (
        <option key={context.contextId} value={context.contextId}>
          {context.displayName}
        </option>
      ))}
    </select>
  );
};

export default ContextSelector;
