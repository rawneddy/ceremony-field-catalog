import React from 'react';
import { Download } from 'lucide-react';
import type { CatalogEntry } from '../../types';
import { useSchemaExport } from '../../hooks/useSchemaExport';

interface SchemaExportButtonsProps {
  entries: CatalogEntry[];
  contextId: string;
  metadata: Record<string, string>;
  disabled?: boolean;
}

/**
 * Export buttons for downloading schema in various formats.
 * Used by Field Search page after results are loaded.
 */
const SchemaExportButtons: React.FC<SchemaExportButtonsProps> = ({
  entries,
  contextId,
  metadata,
  disabled = false
}) => {
  const { exportToJsonSchema, exportToXsd, exportToCsv } = useSchemaExport();

  const isDisabled = disabled || entries.length === 0;

  const buttonClass = `
    inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded
    transition-colors
    ${isDisabled
      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
      : 'bg-ceremony text-white hover:bg-ceremony-hover'
    }
  `;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => exportToXsd(entries, contextId, metadata)}
        disabled={isDisabled}
        className={buttonClass}
        title="Export as XML Schema Definition"
      >
        <Download className="w-3 h-3" />
        XSD
      </button>
      <button
        onClick={() => exportToJsonSchema(entries, contextId, metadata)}
        disabled={isDisabled}
        className={buttonClass}
        title="Export as JSON Schema"
      >
        <Download className="w-3 h-3" />
        JSON
      </button>
      <button
        onClick={() => exportToCsv(entries, contextId, metadata)}
        disabled={isDisabled}
        className={buttonClass}
        title="Export as CSV"
      >
        <Download className="w-3 h-3" />
        CSV
      </button>
    </div>
  );
};

export default SchemaExportButtons;
