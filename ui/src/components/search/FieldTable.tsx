import React, { useMemo, useState } from 'react';
import type { CatalogEntry } from '../../types';
import { ChevronUp, ChevronDown, Copy, Check } from 'lucide-react';

interface FieldTableProps {
  results: CatalogEntry[];
  isLoading: boolean;
  selectedId?: string;
  onSelectRow: (entry: CatalogEntry) => void;
  query?: string;
}

const FieldTable: React.FC<FieldTableProps> = ({ 
  results, 
  isLoading, 
  selectedId, 
  onSelectRow,
  query 
}) => {
  const [sortField, setSortField] = useState<keyof CatalogEntry | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sortedResults = useMemo(() => {
    if (!sortField || !sortOrder) return results;

    return [...results].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        return sortOrder === 'asc' 
          ? (aVal === bVal ? 0 : aVal ? 1 : -1)
          : (aVal === bVal ? 0 : bVal ? 1 : -1);
      }

      return 0;
    });
  }, [results, sortField, sortOrder]);

  const handleSort = (field: keyof CatalogEntry) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') {
        setSortField(null);
        setSortOrder(null);
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleCopy = (e: React.MouseEvent, path: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(path);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const highlightMatch = (text: string) => {
    if (!query || query.length < 2) return text;
    
    // Remove leading / for highlight if it's there
    const cleanQuery = query.startsWith('/') ? query.substring(1) : query;
    if (!cleanQuery) return text;

    try {
      const parts = text.split(new RegExp(`(${cleanQuery})`, 'gi'));
      return parts.map((part, i) => 
        part.toLowerCase() === cleanQuery.toLowerCase() ? (
          <mark key={i} className="bg-mint/40 text-ink rounded-sm px-0.5">{part}</mark>
        ) : part
      );
    } catch (e) {
      return text;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-12 bg-steel/20 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center">
        <div className="bg-steel/30 p-4 rounded-full mb-4">
          <ChevronDown className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-ink mb-2">No results found</h3>
        <p className="text-slate-500">Try adjusting your filters or search query.</p>
      </div>
    );
  }

  return (
    <table className="w-full text-left border-collapse table-fixed">
      <thead className="sticky top-0 bg-paper z-10 shadow-sm">
        <tr className="border-b border-steel">
          <th className="w-12 px-4 py-3"></th>
          <th 
            className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-ink transition-colors group"
            onClick={() => handleSort('fieldPath')}
          >
            <div className="flex items-center gap-2">
              Field Path
              <SortIcon active={sortField === 'fieldPath'} order={sortOrder} />
            </div>
          </th>
          <th 
            className="w-40 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-ink transition-colors group"
            onClick={() => handleSort('contextId')}
          >
            <div className="flex items-center gap-2">
              Context
              <SortIcon active={sortField === 'contextId'} order={sortOrder} />
            </div>
          </th>
          <th 
            className="w-24 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-ink transition-colors group text-center"
            onClick={() => handleSort('minOccurs')}
          >
            <div className="flex items-center justify-center gap-2">
              Min
              <SortIcon active={sortField === 'minOccurs'} order={sortOrder} />
            </div>
          </th>
          <th 
            className="w-24 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-ink transition-colors group text-center"
            onClick={() => handleSort('maxOccurs')}
          >
            <div className="flex items-center justify-center gap-2">
              Max
              <SortIcon active={sortField === 'maxOccurs'} order={sortOrder} />
            </div>
          </th>
          <th 
            className="w-28 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-ink transition-colors group text-center"
            onClick={() => handleSort('allowsNull')}
          >
            <div className="flex items-center justify-center gap-2">
              Null?
              <SortIcon active={sortField === 'allowsNull'} order={sortOrder} />
            </div>
          </th>
          <th 
            className="w-28 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-ink transition-colors group text-center"
            onClick={() => handleSort('allowsEmpty')}
          >
            <div className="flex items-center justify-center gap-2">
              Empty?
              <SortIcon active={sortField === 'allowsEmpty'} order={sortOrder} />
            </div>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-steel/50">
        {sortedResults.map((entry) => (
          <tr 
            key={entry.id}
            onClick={() => onSelectRow(entry)}
            className={`group hover:bg-ceremony/5 cursor-pointer transition-colors ${
              selectedId === entry.id ? 'bg-ceremony/10' : ''
            }`}
          >
            <td className="px-4 py-3">
              <button
                onClick={(e) => handleCopy(e, entry.fieldPath, entry.id)}
                className="text-slate-300 hover:text-ceremony transition-colors"
                title="Copy XPath"
              >
                {copiedId === entry.id ? <Check className="w-4 h-4 text-mint" /> : <Copy className="w-4 h-4" />}
              </button>
            </td>
            <td className="px-4 py-3 font-mono text-sm truncate">
              {highlightMatch(entry.fieldPath)}
            </td>
            <td className="px-4 py-3">
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">
                {entry.contextId}
              </span>
            </td>
            <td className="px-4 py-3 text-center text-sm font-medium">{entry.minOccurs}</td>
            <td className="px-4 py-3 text-center text-sm font-medium">{entry.maxOccurs}</td>
            <td className="px-4 py-3 text-center">
              <BooleanBadge value={entry.allowsNull} />
            </td>
            <td className="px-4 py-3 text-center">
              <BooleanBadge value={entry.allowsEmpty} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const SortIcon = ({ active, order }: { active: boolean; order: 'asc' | 'desc' | null }) => {
  if (!active) return <ChevronDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />;
  return order === 'asc' ? <ChevronUp className="w-3 h-3 text-ceremony" /> : <ChevronDown className="w-3 h-3 text-ceremony" />;
};

const BooleanBadge = ({ value }: { value: boolean }) => (
  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
    value ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
  }`}>
    {value ? 'Yes' : 'No'}
  </span>
);

export default FieldTable;
