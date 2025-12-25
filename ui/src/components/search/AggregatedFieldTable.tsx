import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnResizeMode,
} from '@tanstack/react-table';
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

const columnHelper = createColumnHelper<AggregatedField>();

/**
 * Table component for displaying aggregated field data.
 * Shows ranges for min/max occurs and tri-state badges for null/empty.
 * Uses TanStack Table for sorting and column resizing.
 */
const AggregatedFieldTable: React.FC<AggregatedFieldTableProps> = ({
  results,
  isLoading,
  selectedFieldPath,
  onSelectRow,
  query
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');

  const handleCopy = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), config.COPY_FEEDBACK_MS);
  };

  const highlightMatch = (text: string) => {
    if (!query || query.length < 2) return text;

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

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'copy',
      size: 48,
      minSize: 48,
      maxSize: 48,
      enableResizing: false,
      header: () => null,
      cell: ({ row }) => {
        const displayPath = getDominantCasing(row.original.casingCounts, row.original.fieldPath);
        return (
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
        );
      },
    }),
    columnHelper.accessor('fieldPath', {
      header: 'Field Path',
      size: 400,
      minSize: 150,
      cell: ({ row }) => {
        const displayPath = getDominantCasing(row.original.casingCounts, row.original.fieldPath);
        return (
          <span className="font-mono text-sm truncate block" title={displayPath}>
            {highlightMatch(displayPath)}
          </span>
        );
      },
    }),
    columnHelper.accessor('variantCount', {
      header: 'Variants',
      size: 100,
      minSize: 80,
      cell: ({ getValue }) => (
        <span className="inline-flex items-center justify-center min-w-[2rem] bg-ceremony/10 text-ceremony px-2 py-0.5 rounded-full text-xs font-bold">
          {getValue()}
        </span>
      ),
    }),
    columnHelper.accessor(row => row.minOccursRange, {
      id: 'minOccurs',
      header: 'Min',
      size: 80,
      minSize: 60,
      sortingFn: (rowA, rowB) => rowA.original.minOccursRange[0] - rowB.original.minOccursRange[0],
      cell: ({ row }) => <RangeBadge range={row.original.minOccursRange} />,
    }),
    columnHelper.accessor(row => row.maxOccursRange, {
      id: 'maxOccurs',
      header: 'Max',
      size: 80,
      minSize: 60,
      sortingFn: (rowA, rowB) => rowA.original.maxOccursRange[0] - rowB.original.maxOccursRange[0],
      cell: ({ row }) => <RangeBadge range={row.original.maxOccursRange} />,
    }),
    columnHelper.accessor('allowsNull', {
      header: 'Null?',
      size: 90,
      minSize: 70,
      cell: ({ getValue }) => <TriStateBadge value={getValue()} />,
    }),
    columnHelper.accessor('allowsEmpty', {
      header: 'Empty?',
      size: 90,
      minSize: 70,
      cell: ({ getValue }) => <TriStateBadge value={getValue()} />,
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
  ], [query, copiedPath]);

  const table = useReactTable({
    data: results,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode,
    enableColumnResizing: true,
  });

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const rows = table.getRowModel().rows;
      if (rows.length === 0) return;

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = rows.findIndex(r => r.original.fieldPath === selectedFieldPath);
        const nextIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, rows.length - 1);
        const nextRow = rows[nextIndex];
        if (nextRow) onSelectRow(nextRow.original);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = rows.findIndex(r => r.original.fieldPath === selectedFieldPath);
        const prevIndex = currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0);
        const prevRow = rows[prevIndex];
        if (prevRow) onSelectRow(prevRow.original);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [table, selectedFieldPath, onSelectRow]);

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
                  } ${header.id === 'copy' ? '' : 'text-center'}`}
                  style={{ width: header.getSize() }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className={`flex items-center gap-2 ${header.id === 'copy' || header.id === 'fieldPath' ? '' : 'justify-center'}`}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <SortIcon
                        direction={header.column.getIsSorted()}
                      />
                    )}
                  </div>
                  {/* Resize handle */}
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
          {table.getRowModel().rows.map(row => (
            <tr
              key={row.original.fieldPath}
              onClick={() => onSelectRow(row.original)}
              className={`group hover:bg-ceremony/5 cursor-pointer transition-colors ${
                selectedFieldPath === row.original.fieldPath ? 'bg-ceremony/10' : ''
              }`}
            >
              {row.getVisibleCells().map(cell => (
                <td
                  key={cell.id}
                  className={`px-4 py-3 border-r border-slate-100 last:border-r-0 ${cell.column.id === 'copy' || cell.column.id === 'fieldPath' ? '' : 'text-center'}`}
                  style={{ width: cell.column.getSize() }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
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

/**
 * Displays a range as "min-max" or single value if min === max.
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
