import React, { useState, useMemo } from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import type { CatalogEntry } from '../../types';
import SchemaExportDialog from '../export/SchemaExportDialog';
import CasingResolutionPanel from './CasingResolutionPanel';
import { needsCasingResolution } from '../../utils/casingUtils';
import { useSetCanonicalCasing } from '../../hooks';

interface SchemaExportButtonsProps {
  entries: CatalogEntry[];
  contextId: string;
  metadata: Record<string, string>;
  optionalMetadata?: Record<string, string[]>;
  disabled?: boolean;
}

/**
 * Export button that opens the schema export dialog.
 * If there are unresolved casing conflicts, shows resolution panel first.
 */
const SchemaExportButtons: React.FC<SchemaExportButtonsProps> = ({
  entries,
  contextId,
  metadata,
  optionalMetadata = {},
  disabled = false
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isResolutionPanelOpen, setIsResolutionPanelOpen] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  // Entries with server-validated canonical casing updates applied
  const [resolvedEntries, setResolvedEntries] = useState<CatalogEntry[] | null>(null);

  const { setCanonicalCasing } = useSetCanonicalCasing();

  // Check for unresolved casing conflicts
  const unresolvedCount = useMemo(() => {
    return entries.filter(e => needsCasingResolution(e.casingCounts, e.canonicalCasing)).length;
  }, [entries]);

  const hasUnresolvedConflicts = unresolvedCount > 0;
  const isDisabled = disabled || entries.length === 0;

  // Merge required metadata with optional metadata (use first value of each optional array for filename)
  const mergedMetadata: Record<string, string> = { ...metadata };
  for (const [key, values] of Object.entries(optionalMetadata)) {
    if (values.length > 0 && values[0]) {
      mergedMetadata[key] = values.join('-'); // Join multiple values with hyphen
    }
  }

  const handleExportClick = () => {
    if (hasUnresolvedConflicts) {
      setIsResolutionPanelOpen(true);
    } else {
      setIsDialogOpen(true);
    }
  };

  const handleResolve = async (resolutions: Map<string, string>) => {
    setIsResolving(true);
    try {
      // Save all canonical casing selections and collect server responses
      const promises = Array.from(resolutions.entries()).map(([fieldId, canonicalCasing]) =>
        setCanonicalCasing({ fieldId, canonicalCasing })
      );
      const updatedEntries = await Promise.all(promises);

      // Build a map of updated entries by ID for quick lookup
      const updatedEntriesMap = new Map(updatedEntries.map(e => [e.id, e]));

      // Merge: use server-validated updated entry if available, otherwise keep original
      const mergedEntries = entries.map(entry =>
        updatedEntriesMap.get(entry.id) ?? entry
      );

      // Store merged entries for the dialog (ensures it uses fresh canonical casings)
      setResolvedEntries(mergedEntries);
      setIsResolutionPanelOpen(false);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Failed to save canonical casings:', error);
      // Keep panel open so user can retry
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <>
      <button
        onClick={handleExportClick}
        disabled={isDisabled}
        className={`
          inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded
          transition-colors
          ${isDisabled
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-ceremony text-white hover:bg-ceremony-hover'
          }
        `}
        title={hasUnresolvedConflicts ? `${unresolvedCount} casing conflict${unresolvedCount !== 1 ? 's' : ''} to resolve` : 'Export schema'}
      >
        <Download className="w-3 h-3" />
        Export Schema
        {hasUnresolvedConflicts && !isDisabled && (
          <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 bg-amber-500 rounded text-[10px]">
            <AlertTriangle className="w-2.5 h-2.5" />
            {unresolvedCount}
          </span>
        )}
      </button>

      {isResolutionPanelOpen && (
        <CasingResolutionPanel
          entries={entries}
          onResolve={handleResolve}
          onCancel={() => setIsResolutionPanelOpen(false)}
          isResolving={isResolving}
        />
      )}

      {isDialogOpen && (
        <SchemaExportDialog
          entries={resolvedEntries ?? entries}
          contextId={contextId}
          metadata={mergedMetadata}
          onClose={() => {
            setIsDialogOpen(false);
            setResolvedEntries(null); // Clear resolved entries when dialog closes
          }}
        />
      )}
    </>
  );
};

export default SchemaExportButtons;
