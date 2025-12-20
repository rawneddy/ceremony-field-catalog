import React, { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import type { FacetState } from '../../types';

interface FacetPopoverProps {
  title: string;
  facet: FacetState;
  onToggleValue: (val: string) => void;
  onSetMode: (mode: 'any' | 'one') => void;
  onClear: () => void;
  style?: React.CSSProperties;
}

const FacetPopover: React.FC<FacetPopoverProps> = ({
  title,
  facet,
  onToggleValue,
  onSetMode,
  onClear,
  style
}) => {
  const [search, setSearch] = useState('');

  const filteredValues = facet.values.filter((v) =>
    v.value.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="facet-popover w-64 bg-white text-ink shadow-2xl rounded-md border border-steel overflow-hidden flex flex-col max-h-[400px]"
      style={style}
    >
      <div className="p-3 border-b border-steel bg-paper flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-tight truncate">{title}</h3>
        <button onClick={onClear} className="text-[10px] font-bold text-ceremony hover:underline">Clear</button>
      </div>

      <div className="p-3 border-b border-steel grid grid-cols-2 gap-1">
        <button
          onClick={() => onSetMode('any')}
          className={`text-[10px] font-bold uppercase py-1.5 rounded transition-colors ${
            facet.mode === 'any' ? 'bg-ink text-paper' : 'bg-paper text-slate-500 hover:text-ink'
          }`}
        >
          Include Any
        </button>
        <button
          onClick={() => onSetMode('one')}
          className={`text-[10px] font-bold uppercase py-1.5 rounded transition-colors ${
            facet.mode === 'one' ? 'bg-ink text-paper' : 'bg-paper text-slate-500 hover:text-ink'
          }`}
        >
          Require One
        </button>
      </div>

      <div className="p-2">
        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search values..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-paper border border-steel rounded px-7 py-1.5 text-xs focus:outline-none focus:border-ceremony/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {filteredValues.map((v) => (
          <label
            key={v.value}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer hover:bg-paper transition-colors ${
              facet.selected.has(v.value) ? 'bg-ceremony/5 text-ceremony font-bold' : 'text-slate-600'
            }`}
          >
            <input
              type={facet.mode === 'one' ? 'radio' : 'checkbox'}
              checked={facet.selected.has(v.value)}
              onChange={() => onToggleValue(v.value)}
              className="accent-ceremony"
            />
            <span className="truncate flex-1">{v.value}</span>
            <span className="text-[10px] font-mono text-slate-400">({v.count})</span>
          </label>
        ))}
        {filteredValues.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-400">No matching values</div>
        )}
      </div>
    </div>
  );
};

export default FacetPopover;
