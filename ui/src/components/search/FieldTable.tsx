import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { CatalogEntry } from '../../types';
import { ChevronUp, ChevronDown, Copy, Check, AlertTriangle, Info } from 'lucide-react';
import { Skeleton, EmptyState } from '../ui';
import { config } from '../../config';
import { computeAllFieldWarnings, type FieldWarning } from '../../lib/schema/fieldWarnings';

interface FieldTableProps {
  results: CatalogEntry[];
  isLoading: boolean;
  selectedId?: string;
  onSelectRow: (entry: CatalogEntry) => void;
  query?: string;
  /** Field path to scroll to and auto-select after results load */
  highlightFieldPath?: string;
}

// CSS for attention animation (injected once)
const attentionStyle = document.createElement('style');
attentionStyle.textContent = `
  @keyframes field-attention {
    0% { background-color: #fef3c7; box-shadow: 0 0 0 2px #f59e0b; }
    100% { background-color: rgba(139, 92, 246, 0.15); box-shadow: none; }
  }
  .field-attention {
    animation: field-attention 0.8s ease-out forwards;
  }
  .field-highlighted {
    background-color: rgba(139, 92, 246, 0.12) !important;
  }
`;
if (!document.getElementById('field-attention-style')) {
  attentionStyle.id = 'field-attention-style';
  document.head.appendChild(attentionStyle);
}

const FieldTable: React.FC<FieldTableProps> = ({
  results,
  isLoading,
  selectedId,
  onSelectRow,
  query,
  highlightFieldPath
}) => {
  const [sortField, setSortField] = useState<keyof CatalogEntry | 'alerts' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasScrolledToHighlight, setHasScrolledToHighlight] = useState(false);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  // Compute field warnings once for all results (before sorting so we can sort by it)
  const fieldWarnings = useMemo(() => {
    return computeAllFieldWarnings(results);
  }, [results]);

  // Helper to get warning priority for sorting: warning=2, info=1, none=0
  const getWarningPriority = (fieldPath: string): number => {
    const warnings = fieldWarnings.get(fieldPath) || [];
    if (warnings.length === 0) return 0;
    if (warnings.some(w => w.severity === 'warning')) return 2;
    return 1; // info
  };

  const sortedResults = useMemo(() => {
    if (!sortField || !sortOrder) return results;

    return [...results].sort((a, b) => {
      // Special handling for alerts column
      if (sortField === 'alerts') {
        const aPriority = getWarningPriority(a.fieldPath);
        const bPriority = getWarningPriority(b.fieldPath);
        return sortOrder === 'asc'
          ? bPriority - aPriority  // asc: warning → info → none
          : aPriority - bPriority; // desc: none → info → warning
      }

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
  }, [results, sortField, sortOrder, fieldWarnings]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sortedResults.length === 0) return;
      
      // Don't navigate if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = sortedResults.findIndex(r => r.id === selectedId);
        const nextIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, sortedResults.length - 1);
        const nextResult = sortedResults[nextIndex];
        if (nextResult) onSelectRow(nextResult);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = sortedResults.findIndex(r => r.id === selectedId);
        const prevIndex = currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0);
        const prevResult = sortedResults[prevIndex];
        if (prevResult) onSelectRow(prevResult);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedResults, selectedId, onSelectRow]);

  // Scroll to and select highlighted field after results load
  useEffect(() => {
    if (!highlightFieldPath || isLoading || hasScrolledToHighlight || results.length === 0) {
      return;
    }

    // Find the entry with matching fieldPath
    const targetEntry = results.find(r => r.fieldPath === highlightFieldPath);
    if (!targetEntry) {
      setHasScrolledToHighlight(true);
      return;
    }

    // Select the row to open detail panel
    onSelectRow(targetEntry);

    // Scroll to the row after a brief delay to let the DOM update
    setTimeout(() => {
      const rowElement = rowRefs.current.get(targetEntry.id);
      if (rowElement) {
        rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add attention animation after scroll completes
        setTimeout(() => {
          rowElement.classList.add('field-attention');
        }, 300); // Wait for scroll to settle
      }
    }, 100);

    setHasScrolledToHighlight(true);
  }, [highlightFieldPath, isLoading, results, hasScrolledToHighlight, onSelectRow]);

  // Reset scroll flag when highlight changes
  useEffect(() => {
    setHasScrolledToHighlight(false);
  }, [highlightFieldPath]);

  const handleSort = (field: keyof CatalogEntry | 'alerts') => {
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
    setTimeout(() => setCopiedId(null), config.COPY_FEEDBACK_MS);
  };

  const highlightMatch = (text: string) => {
    if (!query || query.length < 2) return text;

    // Remove leading / for highlight if it's there
    const cleanQuery = query.startsWith('/') ? query.substring(1) : query;
    if (!cleanQuery) return text;

    // Escape regex special characters to prevent errors with user input like "[test" or "(test"
    const escapedQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    try {
      const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
      return parts.map((part, i) =>
        part.toLowerCase() === cleanQuery.toLowerCase() ? (
          <mark key={i} className="bg-mint/40 text-ink rounded-sm px-0.5">{part}</mark>
        ) : part
      );
    } catch {
      return text;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton variant="row" count={10} />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <EmptyState
        icon={ChevronDown}
        title="No results found"
        description="Try adjusting your filters or search query."
        className="h-full"
      />
    );
  }

  return (
    <table className="w-full text-left border-collapse table-fixed">
      <thead className="sticky top-0 bg-paper z-10 shadow-sm">
        <tr className="border-b border-steel">
          <th className="w-12 px-4 py-3"></th>
          <th
            className="w-28 px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-ink transition-colors group"
            onClick={() => handleSort('alerts')}
          >
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Alerts</span>
              <SortIcon active={sortField === 'alerts'} order={sortOrder} />
            </div>
          </th>
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
          <th 
            className="w-40 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-ink transition-colors group text-center"
            onClick={() => handleSort('firstObservedAt')}
          >
            <div className="flex items-center justify-center gap-2">
              First Seen
              <SortIcon active={sortField === 'firstObservedAt'} order={sortOrder} />
            </div>
          </th>
          <th 
            className="w-40 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-ink transition-colors group text-center"
            onClick={() => handleSort('lastObservedAt')}
          >
            <div className="flex items-center justify-center gap-2">
              Last Seen
              <SortIcon active={sortField === 'lastObservedAt'} order={sortOrder} />
            </div>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-steel/50">
        {sortedResults.map((entry) => {
          const warnings = fieldWarnings.get(entry.fieldPath) || [];
          const hasWarnings = warnings.length > 0;
          const isWarningSeverity = hasWarningSeverity(warnings);

          return (
          <tr
            key={entry.id}
            ref={(el) => {
              if (el) rowRefs.current.set(entry.id, el);
              else rowRefs.current.delete(entry.id);
            }}
            onClick={() => onSelectRow(entry)}
            className={`group hover:bg-ceremony/5 cursor-pointer transition-colors ${
              selectedId === entry.id ? 'bg-ceremony/10' : ''
            } ${highlightFieldPath === entry.fieldPath ? 'field-highlighted' : ''} ${
              hasWarnings ? (isWarningSeverity ? 'bg-amber-50/50' : 'bg-sky-50/30') : ''
            }`}
          >
            <td className={`px-4 py-3 ${hasWarnings ? (isWarningSeverity ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-sky-300') : ''}`}>
              <button
                onClick={(e) => handleCopy(e, entry.fieldPath, entry.id)}
                className="text-slate-300 hover:text-ceremony transition-colors"
                title="Copy XPath"
              >
                {copiedId === entry.id ? <Check className="w-4 h-4 text-mint" /> : <Copy className="w-4 h-4" />}
              </button>
            </td>
            <td className="px-2 py-3">
              <WarningBadges warnings={warnings} />
            </td>
            <td className="px-4 py-3 font-mono text-sm truncate">
              {highlightMatch(entry.fieldPath)}
            </td>
            <td className="px-4 py-3 text-center text-sm font-medium">{entry.minOccurs}</td>
            <td className="px-4 py-3 text-center text-sm font-medium">{entry.maxOccurs}</td>
            <td className="px-4 py-3 text-center">
              <BooleanBadge value={entry.allowsNull} />
            </td>
            <td className="px-4 py-3 text-center">
              <BooleanBadge value={entry.allowsEmpty} />
            </td>
            <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 font-mono">
              {formatDate(entry.firstObservedAt)}
            </td>
            <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 font-mono">
              {formatDate(entry.lastObservedAt)}
            </td>
          </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
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

/**
 * Displays a single warning badge for a field - prioritizes warnings over info.
 */
const WarningBadges = ({ warnings }: { warnings: FieldWarning[] }) => {
  if (warnings.length === 0) return null;

  // Priority: show warning severity first, then info
  const primaryWarning = warnings.find(w => w.severity === 'warning') || warnings[0]!;

  const tooltipText = warnings
    .map(w => `${w.shortLabel}: ${w.message}`)
    .join('\n\n');

  return (
    <span
      title={tooltipText}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
        primaryWarning.severity === 'warning'
          ? 'bg-amber-100 text-amber-700 border border-amber-200'
          : 'bg-sky-50 text-sky-600 border border-sky-200'
      }`}
    >
      {primaryWarning.severity === 'warning' ? (
        <AlertTriangle className="w-2.5 h-2.5" />
      ) : (
        <Info className="w-2.5 h-2.5" />
      )}
      {primaryWarning.shortLabel}
    </span>
  );
};

/**
 * Returns true if any warning has 'warning' severity.
 */
const hasWarningSeverity = (warnings: FieldWarning[]): boolean => {
  return warnings.some(w => w.severity === 'warning');
};

export default FieldTable;
