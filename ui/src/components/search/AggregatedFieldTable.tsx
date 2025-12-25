import React, { useMemo, useState } from 'react';
import type { AggregatedField } from '../../types';
import { ChevronUp, ChevronDown, Copy, Check } from 'lucide-react';
import { Skeleton, EmptyState, TriStateBadge } from '../ui';
import { config } from '../../config';
import { getDominantCasing } from '../../utils/casingUtils';

interface AggregatedFieldTableProps {
  results: AggregatedField[];
  isLoading: boolean;
  selectedFieldPath?: string;
  onSelectRow: (field: AggregatedField) => void;
  query?: string;
}

type SortableField = 'fieldPath' | 'variantCount' | 'firstObservedAt' | 'lastObservedAt';

/**
 * Table component for displaying aggregated field data.
 * Shows ranges for min/max occurs and tri-state badges for null/empty.
 * Used by the Discovery page for browsing fields across variants.
 */
const AggregatedFieldTable: React.FC<AggregatedFieldTableProps> = ({
  results,
  isLoading,
  selectedFieldPath,
  onSelectRow,
  query
}) => {
  const [sortField, setSortField] = useState<SortableField | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

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

      return 0;
    });
  }, [results, sortField, sortOrder]);

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
        const currentIndex = sortedResults.findIndex(r => r.fieldPath === selectedFieldPath);
        const nextIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, sortedResults.length - 1);
        const nextResult = sortedResults[nextIndex];
        if (nextResult) onSelectRow(nextResult);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = sortedResults.findIndex(r => r.fieldPath === selectedFieldPath);
        const prevIndex = currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0);
        const prevResult = sortedResults[prevIndex];
        if (prevResult) onSelectRow(prevResult);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedResults, selectedFieldPath, onSelectRow]);

  const handleSort = (field: SortableField) => {
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

  const handleCopy = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), config.COPY_FEEDBACK_MS);
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
            className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-ink transition-colors group"
            onClick={() => handleSort('fieldPath')}
          >
            <div className="flex items-center gap-2">
              Field Path
              <SortIcon active={sortField === 'fieldPath'} order={sortOrder} />
            </div>
          </th>
          <th
            className="w-28 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-ink transition-colors group text-center"
            onClick={() => handleSort('variantCount')}
          >
            <div className="flex items-center justify-center gap-2">
              Variants
              <SortIcon active={sortField === 'variantCount'} order={sortOrder} />
            </div>
          </th>
          <th className="w-24 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
            Min
          </th>
          <th className="w-24 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
            Max
          </th>
          <th className="w-28 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
            Null?
          </th>
          <th className="w-28 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
            Empty?
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
        {sortedResults.map((field) => {
          // Use dominant casing for display, fall back to canonical fieldPath
          const displayPath = getDominantCasing(field.casingCounts, field.fieldPath);
          return (
          <tr
            key={field.fieldPath}
            onClick={() => onSelectRow(field)}
            className={`group hover:bg-ceremony/5 cursor-pointer transition-colors ${
              selectedFieldPath === field.fieldPath ? 'bg-ceremony/10' : ''
            }`}
          >
            <td className="px-4 py-3">
              <button
                onClick={(e) => handleCopy(e, displayPath)}
                className="text-slate-300 hover:text-ceremony transition-colors"
                title="Copy XPath"
              >
                {copiedPath === displayPath ? (
                  <Check className="w-4 h-4 text-mint" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </td>
            <td className="px-4 py-3 font-mono text-sm truncate">
              {highlightMatch(displayPath)}
            </td>
            <td className="px-4 py-3 text-center">
              <span className="inline-flex items-center justify-center min-w-[2rem] bg-ceremony/10 text-ceremony px-2 py-0.5 rounded-full text-xs font-bold">
                {field.variantCount}
              </span>
            </td>
            <td className="px-4 py-3 text-center text-sm font-medium">
              <RangeBadge range={field.minOccursRange} />
            </td>
            <td className="px-4 py-3 text-center text-sm font-medium">
              <RangeBadge range={field.maxOccursRange} />
            </td>
            <td className="px-4 py-3 text-center">
              <TriStateBadge value={field.allowsNull} />
            </td>
            <td className="px-4 py-3 text-center">
              <TriStateBadge value={field.allowsEmpty} />
            </td>
            <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 font-mono">
              {formatDate(field.firstObservedAt)}
            </td>
            <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 font-mono">
              {formatDate(field.lastObservedAt)}
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

/**
 * Displays a range as "min-max" or single value if min === max.
 * Highlighted when the range spans multiple values.
 */
const RangeBadge = ({ range }: { range: [number, number] }) => {
  const [min, max] = range;
  const isRange = min !== max;

  if (isRange) {
    return (
      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs font-bold">
        {min}-{max}
      </span>
    );
  }

  return <span className="text-slate-600">{min}</span>;
};

export default AggregatedFieldTable;
