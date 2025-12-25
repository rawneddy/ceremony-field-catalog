import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnResizeMode,
} from '@tanstack/react-table';
import type { CatalogEntry } from '../../types';
import { ChevronUp, ChevronDown, ChevronRight, Copy, Check, AlertTriangle, Info, Layers } from 'lucide-react';
import { Skeleton, EmptyState } from '../ui';
import { config } from '../../config';
import { computeAllFieldWarnings, type FieldWarning } from '../../lib/schema/fieldWarnings';
import { getDisplayCasing, getTotalObservations, hasMultipleCasings, getSortedCasingVariants, needsCasingResolution } from '../../utils/casingUtils';
import { useSetCanonicalCasing } from '../../hooks';

interface FieldTableProps {
  results: CatalogEntry[];
  isLoading: boolean;
  selectedId?: string;
  onSelectRow: (entry: CatalogEntry) => void;
  query?: string;
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

const columnHelper = createColumnHelper<CatalogEntry>();

const FieldTable: React.FC<FieldTableProps> = ({
  results,
  isLoading,
  selectedId,
  onSelectRow,
  query,
  highlightFieldPath
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasScrolledToHighlight, setHasScrolledToHighlight] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const { setCanonicalCasing, isSettingCasing } = useSetCanonicalCasing();

  // Compute field warnings once for all results
  const fieldWarnings = useMemo(() => {
    return computeAllFieldWarnings(results);
  }, [results]);

  const getWarningPriority = (fieldPath: string): number => {
    const warnings = fieldWarnings.get(fieldPath) || [];
    if (warnings.length === 0) return 0;
    if (warnings.some(w => w.severity === 'warning')) return 2;
    return 1;
  };

  const handleCopy = (e: React.MouseEvent, path: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(path);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), config.COPY_FEEDBACK_MS);
  };

  const toggleRowExpansion = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const highlightMatch = (text: string) => {
    if (!query || query.length < 2) return text;

    const cleanQuery = query.startsWith('/') ? query.substring(1) : query;
    if (!cleanQuery) return text;

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

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'copy',
      size: 48,
      minSize: 48,
      maxSize: 48,
      enableResizing: false,
      header: () => null,
      cell: ({ row }) => {
        const displayPath = getDisplayCasing(row.original.canonicalCasing, row.original.casingCounts, row.original.fieldPath);
        const warnings = fieldWarnings.get(row.original.fieldPath) || [];
        const hasWarnings = warnings.length > 0;
        const isWarningSeverity = warnings.some(w => w.severity === 'warning');

        return (
          <div className={hasWarnings ? (isWarningSeverity ? 'border-l-4 border-l-amber-400 -ml-4 pl-4' : 'border-l-4 border-l-sky-300 -ml-4 pl-4') : ''}>
            <button
              onClick={(e) => handleCopy(e, displayPath, row.original.id)}
              className="text-slate-300 hover:text-ceremony transition-colors"
              title="Copy XPath"
            >
              {copiedId === row.original.id ? <Check className="w-4 h-4 text-mint" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        );
      },
    }),
    columnHelper.accessor(row => getWarningPriority(row.fieldPath), {
      id: 'alerts',
      header: () => (
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          <span>Alerts</span>
        </div>
      ),
      size: 100,
      minSize: 80,
      sortDescFirst: true,
      cell: ({ row }) => {
        const warnings = fieldWarnings.get(row.original.fieldPath) || [];
        return <WarningBadges warnings={warnings} />;
      },
    }),
    columnHelper.accessor(row => getTotalObservations(row.casingCounts), {
      id: 'count',
      header: 'Count',
      size: 90,
      minSize: 70,
      cell: ({ row }) => {
        const totalCount = getTotalObservations(row.original.casingCounts);
        const hasCasingVariants = hasMultipleCasings(row.original.casingCounts);
        const hasCanonical = !!row.original.canonicalCasing;
        const needsResolution = needsCasingResolution(row.original.casingCounts, row.original.canonicalCasing);
        const isExpanded = expandedRows.has(row.original.id);

        if (totalCount === 0) {
          return <span className="text-sm text-slate-400">-</span>;
        }

        return (
          <div className="flex items-center justify-center gap-1">
            {hasCasingVariants && (
              <button
                onClick={(e) => toggleRowExpansion(e, row.original.id)}
                className="text-slate-400 hover:text-ceremony transition-colors"
                title="Show casing variants"
              >
                <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>
            )}
            <span className="text-sm font-medium text-slate-600">{totalCount}</span>
            {hasCasingVariants && (
              hasCanonical ? (
                <span title="Canonical casing set">
                  <Check className="w-3 h-3 text-emerald-500" />
                </span>
              ) : needsResolution ? (
                <span title="Needs casing resolution for export">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                </span>
              ) : (
                <span title="Multiple casing variants">
                  <Layers className="w-3 h-3 text-slate-400" />
                </span>
              )
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('fieldPath', {
      header: 'Field Path',
      size: 350,
      minSize: 150,
      cell: ({ row }) => {
        const displayPath = getDisplayCasing(row.original.canonicalCasing, row.original.casingCounts, row.original.fieldPath);
        return (
          <span className="font-mono text-sm truncate block" title={displayPath}>
            {highlightMatch(displayPath)}
          </span>
        );
      },
    }),
    columnHelper.accessor('minOccurs', {
      header: 'Min',
      size: 70,
      minSize: 50,
      cell: ({ getValue }) => <span className="text-sm font-medium">{getValue()}</span>,
    }),
    columnHelper.accessor('maxOccurs', {
      header: 'Max',
      size: 70,
      minSize: 50,
      cell: ({ getValue }) => <span className="text-sm font-medium">{getValue()}</span>,
    }),
    columnHelper.accessor('allowsNull', {
      header: 'Null?',
      size: 80,
      minSize: 60,
      cell: ({ getValue }) => <BooleanBadge value={getValue()} />,
    }),
    columnHelper.accessor('allowsEmpty', {
      header: 'Empty?',
      size: 80,
      minSize: 60,
      cell: ({ getValue }) => <BooleanBadge value={getValue()} />,
    }),
    columnHelper.accessor('firstObservedAt', {
      header: 'First Seen',
      size: 150,
      minSize: 120,
      cell: ({ getValue }) => (
        <span className="text-[10px] font-bold text-slate-500 font-mono">
          {formatDate(getValue())}
        </span>
      ),
    }),
    columnHelper.accessor('lastObservedAt', {
      header: 'Last Seen',
      size: 150,
      minSize: 120,
      cell: ({ getValue }) => (
        <span className="text-[10px] font-bold text-slate-500 font-mono">
          {formatDate(getValue())}
        </span>
      ),
    }),
  ], [query, copiedId, fieldWarnings, expandedRows]);

  const table = useReactTable({
    data: results,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    columnResizeMode,
    enableColumnResizing: true,
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const rows = table.getRowModel().rows;
      if (rows.length === 0) return;

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = rows.findIndex(r => r.original.id === selectedId);
        const nextIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, rows.length - 1);
        const nextRow = rows[nextIndex];
        if (nextRow) onSelectRow(nextRow.original);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = rows.findIndex(r => r.original.id === selectedId);
        const prevIndex = currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0);
        const prevRow = rows[prevIndex];
        if (prevRow) onSelectRow(prevRow.original);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [table, selectedId, onSelectRow]);

  // Scroll to and select highlighted field
  useEffect(() => {
    if (!highlightFieldPath || isLoading || hasScrolledToHighlight || results.length === 0) {
      return;
    }

    const targetEntry = results.find(r => r.fieldPath === highlightFieldPath);
    if (!targetEntry) {
      setHasScrolledToHighlight(true);
      return;
    }

    onSelectRow(targetEntry);

    setTimeout(() => {
      const rowElement = rowRefs.current.get(targetEntry.id);
      if (rowElement) {
        rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          rowElement.classList.add('field-attention');
        }, 300);
      }
    }, 100);

    setHasScrolledToHighlight(true);
  }, [highlightFieldPath, isLoading, results, hasScrolledToHighlight, onSelectRow]);

  useEffect(() => {
    setHasScrolledToHighlight(false);
  }, [highlightFieldPath]);

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
    <div className="overflow-x-auto">
      <table
        className="w-full text-left border-collapse"
        style={{ width: table.getCenterTotalSize() }}
      >
        <thead className="sticky top-0 bg-paper z-10 shadow-sm">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="border-b border-steel">
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className={`relative px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 border-r border-slate-200 last:border-r-0 ${
                    header.column.getCanSort() ? 'cursor-pointer hover:text-ink transition-colors group' : ''
                  } ${['copy', 'fieldPath', 'alerts'].includes(header.id) ? '' : 'text-center'}`}
                  style={{ width: header.getSize() }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className={`flex items-center gap-2 ${['copy', 'fieldPath', 'alerts'].includes(header.id) ? '' : 'justify-center'}`}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <SortIcon direction={header.column.getIsSorted()} />
                    )}
                  </div>
                  {header.column.getCanResize() && (
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={`absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none
                        bg-gradient-to-r from-transparent via-slate-300 to-transparent
                        hover:via-ceremony/60 active:via-ceremony
                        ${header.column.getIsResizing() ? 'via-ceremony' : ''}`}
                      style={{ transform: 'translateX(50%)' }}
                    />
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-steel/50">
          {table.getRowModel().rows.map(row => {
            const warnings = fieldWarnings.get(row.original.fieldPath) || [];
            const hasWarnings = warnings.length > 0;
            const isWarningSeverity = warnings.some(w => w.severity === 'warning');
            const hasCasingVariants = hasMultipleCasings(row.original.casingCounts);
            const isExpanded = expandedRows.has(row.original.id);

            return (
              <React.Fragment key={row.original.id}>
                <tr
                  ref={(el) => {
                    if (el) rowRefs.current.set(row.original.id, el);
                    else rowRefs.current.delete(row.original.id);
                  }}
                  onClick={() => onSelectRow(row.original)}
                  className={`group hover:bg-ceremony/5 cursor-pointer transition-colors ${
                    selectedId === row.original.id ? 'bg-ceremony/10' : ''
                  } ${highlightFieldPath === row.original.fieldPath ? 'field-highlighted' : ''} ${
                    hasWarnings ? (isWarningSeverity ? 'bg-amber-50/50' : 'bg-sky-50/30') : ''
                  }`}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className={`px-4 py-3 border-r border-slate-100 last:border-r-0 ${['copy', 'fieldPath', 'alerts'].includes(cell.column.id) ? '' : 'text-center'}`}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {isExpanded && hasCasingVariants && (
                  <CasingVariantRows
                    entry={row.original}
                    onSetCanonical={(casing) => setCanonicalCasing({ fieldId: row.original.id, canonicalCasing: casing })}
                    isSettingCasing={isSettingCasing}
                    colSpan={columns.length}
                  />
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
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

const SortIcon = ({ direction }: { direction: false | 'asc' | 'desc' }) => {
  if (!direction) return <ChevronDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />;
  return direction === 'asc'
    ? <ChevronUp className="w-3 h-3 text-ceremony" />
    : <ChevronDown className="w-3 h-3 text-ceremony" />;
};

const BooleanBadge = ({ value }: { value: boolean }) => (
  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
    value ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
  }`}>
    {value ? 'Yes' : 'No'}
  </span>
);

const WarningBadges = ({ warnings }: { warnings: FieldWarning[] }) => {
  if (warnings.length === 0) return null;

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

interface CasingVariantRowsProps {
  entry: CatalogEntry;
  onSetCanonical: (casing: string | null) => void;
  isSettingCasing: boolean;
  colSpan: number;
}

const CasingVariantRows: React.FC<CasingVariantRowsProps> = ({ entry, onSetCanonical, isSettingCasing, colSpan }) => {
  const variants = getSortedCasingVariants(entry.casingCounts);

  return (
    <>
      {variants.map(([casing, count]) => {
        const isCanonical = entry.canonicalCasing === casing;

        return (
          <tr
            key={`${entry.id}-${casing}`}
            className="bg-slate-50/50"
          >
            <td className="px-4 py-2 border-l-4 border-l-slate-200"></td>
            <td className="px-2 py-2"></td>
            <td className="px-2 py-2 text-center">
              <span className="text-xs font-medium text-slate-500">{count}</span>
            </td>
            <td className="px-4 py-2 pl-8" colSpan={colSpan - 3}>
              <div className="flex items-center gap-3">
                <span className={`font-mono text-xs ${isCanonical ? 'text-emerald-700 font-semibold' : 'text-slate-600'}`}>
                  {casing}
                </span>
                {isCanonical ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                    <Check className="w-3 h-3" />
                    canonical
                    <button
                      onClick={() => onSetCanonical(null)}
                      disabled={isSettingCasing}
                      className="ml-2 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Clear canonical selection"
                    >
                      clear
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => onSetCanonical(casing)}
                    disabled={isSettingCasing}
                    className="text-[10px] font-bold text-slate-400 hover:text-ceremony uppercase transition-colors disabled:opacity-50"
                    title="Set as canonical casing"
                  >
                    make canonical
                  </button>
                )}
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
};

export default FieldTable;
