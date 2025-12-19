import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { FacetIndex } from '../../types';
import { Filter, X, ChevronRight, Search as SearchIcon, Info } from 'lucide-react';

interface FacetSidebarProps {
  facets: FacetIndex;
  onToggleValue: (key: string, value: string) => void;
  onSetMode: (key: string, mode: 'any' | 'one') => void;
  onClearFacet: (key: string) => void;
  onClearAll: () => void;
  resultCount: number;
}

const FacetSidebar: React.FC<FacetSidebarProps> = ({
  facets,
  onToggleValue,
  onSetMode,
  onClearFacet,
  onClearAll,
  resultCount
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openFacet, setOpenFacet] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number, left: number } | null>(null);
  const [facetSearch, setFacetSearch] = useState('');

  const facetKeys = Object.keys(facets).sort((a, b) => {
    // Pin active facets to top
    const aActive = facets[a].selected.size > 0;
    const bActive = facets[b].selected.size > 0;
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return a.localeCompare(b);
  });

  const filteredKeys = facetKeys.filter(key => 
    key.toLowerCase().includes(facetSearch.toLowerCase())
  );

  const handleFacetClick = (e: React.MouseEvent, key: string) => {
    if (openFacet === key) {
      setOpenFacet(null);
      setPopoverPos(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setPopoverPos({ top: rect.top, left: rect.right });
      setOpenFacet(key);
    }
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openFacet && !(e.target as Element).closest('.facet-popover') && !(e.target as Element).closest('.facet-button')) {
        setOpenFacet(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFacet]);

  if (collapsed) {
    return (
      <div className="w-12 bg-slate border-r border-ink flex flex-col items-center py-4 gap-4 shrink-0">
        <button onClick={() => setCollapsed(false)} className="text-slate-400 hover:text-paper">
          <Filter className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 bg-slate text-paper flex flex-col shrink-0 relative z-20 shadow-xl border-r border-ink">
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-ceremony" />
          <h2 className="text-xs font-black uppercase tracking-widest">Metadata Facets</h2>
        </div>
        <button onClick={() => setCollapsed(true)} className="text-slate-400 hover:text-paper">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 bg-ink/30 border-b border-white/5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Filtering Results</span>
          <div className="group relative">
             <Info className="w-3 h-3 text-slate-500 cursor-help" />
             <div className="absolute left-full ml-2 top-0 w-48 p-2 bg-ink text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Counts based on loaded results (max 250), not global database.
             </div>
          </div>
        </div>
        <div className="text-2xl font-black text-mint">{resultCount}</div>
      </div>

      {facetKeys.length > 10 && (
        <div className="p-2 px-4">
          <div className="relative">
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search facets..."
              value={facetSearch}
              onChange={(e) => setFacetSearch(e.target.value)}
              className="w-full bg-ink/50 border border-white/10 rounded px-7 py-1.5 text-xs focus:outline-none focus:border-ceremony/50"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {filteredKeys.map(key => {
          const facet = facets[key];
          const isActive = facet.selected.size > 0;
          
          return (
            <div key={key} className="relative">
              <button
                onClick={(e) => handleFacetClick(e, key)}
                className={`facet-button w-full flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors group ${
                  isActive ? 'bg-ceremony/10' : ''
                } ${openFacet === key ? 'bg-white/10' : ''}`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-ceremony shrink-0" />}
                  <span className={`text-sm font-medium truncate ${isActive ? 'text-paper' : 'text-slate-300'}`}>
                    {key}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-slate-500">
                    {isActive ? `${facet.selected.size}/${facet.values.length}` : facet.values.length}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform ${openFacet === key ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {openFacet === key && popoverPos && createPortal(
                <FacetPopover
                  title={key}
                  facet={facet}
                  onToggleValue={(val) => onToggleValue(key, val)}
                  onSetMode={(mode) => onSetMode(key, mode)}
                  onClear={() => onClearFacet(key)}
                  style={{ 
                    position: 'fixed', 
                    top: Math.min(popoverPos.top, window.innerHeight - 400), 
                    left: popoverPos.left + 4,
                    zIndex: 9999 
                  }}
                />,
                document.body
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 mt-auto">
        <button
          onClick={onClearAll}
          className="w-full py-2 border border-white/10 rounded text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-paper hover:border-white/20 transition-all"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
};

interface FacetPopoverProps {
  title: string;
  facet: any;
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
  
  const filteredValues = facet.values.filter((v: any) => 
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
        {filteredValues.map((v: any) => (
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

export default FacetSidebar;