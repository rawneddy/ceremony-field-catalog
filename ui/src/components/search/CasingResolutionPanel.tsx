import React, { useState, useMemo } from 'react';
import { X, AlertTriangle, Check, Wand2 } from 'lucide-react';
import type { CatalogEntry } from '../../types';
import { getSortedCasingVariants, getDominantCasing, needsCasingResolution } from '../../utils/casingUtils';

interface CasingResolutionPanelProps {
  entries: CatalogEntry[];
  onResolve: (resolutions: Map<string, string>) => void;
  onCancel: () => void;
  isResolving: boolean;
}

/**
 * Modal panel for resolving casing conflicts before schema export.
 * Displays fields with multiple casing variants and allows user to select canonical casing.
 */
const CasingResolutionPanel: React.FC<CasingResolutionPanelProps> = ({
  entries,
  onResolve,
  onCancel,
  isResolving,
}) => {
  // Get only entries that need resolution
  const unresolvedEntries = useMemo(() => {
    return entries.filter(e => needsCasingResolution(e.casingCounts, e.canonicalCasing));
  }, [entries]);

  // Track selections (fieldId -> selected casing)
  const [selections, setSelections] = useState<Map<string, string>>(() => new Map());

  const handleSelect = (fieldId: string, casing: string) => {
    setSelections(prev => {
      const next = new Map(prev);
      next.set(fieldId, casing);
      return next;
    });
  };

  const handleAutoSelectDominant = () => {
    const newSelections = new Map<string, string>();
    unresolvedEntries.forEach(entry => {
      const dominant = getDominantCasing(entry.casingCounts, entry.fieldPath);
      newSelections.set(entry.id, dominant);
    });
    setSelections(newSelections);
  };

  const allResolved = unresolvedEntries.every(e => selections.has(e.id));
  const resolvedCount = selections.size;
  const totalCount = unresolvedEntries.length;

  const handleSaveAndExport = () => {
    if (!allResolved) return;
    onResolve(selections);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-lg font-bold text-ink">Resolve Casing Before Export</h2>
              <p className="text-sm text-slate-500">
                {totalCount} field{totalCount !== 1 ? 's have' : ' has'} multiple observed casings
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          <p className="text-sm text-slate-600">
            Select the canonical (preferred) casing for each field. This selection will be saved and used for schema export.
          </p>

          {unresolvedEntries.map(entry => {
            const variants = getSortedCasingVariants(entry.casingCounts);
            const selectedCasing = selections.get(entry.id);

            return (
              <div
                key={entry.id}
                className={`border rounded-lg p-4 transition-colors ${
                  selectedCasing ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'
                }`}
              >
                <div className="font-mono text-sm text-slate-500 mb-3">
                  {entry.fieldPath}
                </div>
                <div className="space-y-2">
                  {variants.map(([casing, count]) => (
                    <label
                      key={casing}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                        selectedCasing === casing
                          ? 'bg-emerald-100'
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`casing-${entry.id}`}
                        checked={selectedCasing === casing}
                        onChange={() => handleSelect(entry.id, casing)}
                        className="w-4 h-4 text-ceremony focus:ring-ceremony"
                      />
                      <span className="font-mono text-sm flex-1">{casing}</span>
                      <span className="text-xs text-slate-400">({count})</span>
                      {selectedCasing === casing && (
                        <Check className="w-4 h-4 text-emerald-500" />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-500">
            {resolvedCount < totalCount ? (
              <span className="text-amber-600 font-medium">
                {totalCount - resolvedCount} of {totalCount} still need selection
              </span>
            ) : (
              <span className="text-emerald-600 font-medium">
                All fields resolved
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAutoSelectDominant}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              Auto-select Dominant
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndExport}
              disabled={!allResolved || isResolving}
              className={`px-4 py-2 text-sm font-bold rounded transition-colors ${
                allResolved && !isResolving
                  ? 'bg-ceremony text-white hover:bg-ceremony-hover'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isResolving ? 'Saving...' : 'Save & Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CasingResolutionPanel;
