import React, { useState } from 'react';
import { Download } from 'lucide-react';
import type { CatalogEntry } from '../../types';
import SchemaExportDialog from '../export/SchemaExportDialog';

interface SchemaExportButtonsProps {
  entries: CatalogEntry[];
  contextId: string;
  metadata: Record<string, string>;
  disabled?: boolean;
}

/**
 * Export button that opens the schema export dialog.
 * Used by Field Search page after results are loaded.
 */
const SchemaExportButtons: React.FC<SchemaExportButtonsProps> = ({
  entries,
  contextId,
  metadata,
  disabled = false
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isDisabled = disabled || entries.length === 0;

  return (
    <>
      <button
        onClick={() => setIsDialogOpen(true)}
        disabled={isDisabled}
        className={`
          inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded
          transition-colors
          ${isDisabled
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-ceremony text-white hover:bg-ceremony-hover'
          }
        `}
        title="Export schema"
      >
        <Download className="w-3 h-3" />
        Export Schema
      </button>

      {isDialogOpen && (
        <SchemaExportDialog
          entries={entries}
          contextId={contextId}
          metadata={metadata}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </>
  );
};

export default SchemaExportButtons;
