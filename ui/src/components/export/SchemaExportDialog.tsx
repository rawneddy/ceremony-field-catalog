import React, { useState, useCallback } from 'react';
import { X, Download, FileCode, FileJson, FileSpreadsheet } from 'lucide-react';
import PolicyOptions from './PolicyOptions';
import type { ExportFormat, SchemaExportPolicy, XsdVersion } from '../../lib/schema/types';
import { DEFAULT_POLICY } from '../../lib/schema/types';
import type { CatalogEntry } from '../../types/catalog.types';
import { buildFieldTreeWithPolicy } from '../../lib/schema/fieldTree';
import { generateXsd } from '../../lib/schema/xsdGenerator';
import { generateJsonSchemaString } from '../../lib/schema/jsonSchemaGenerator';
import { generateFilename, getMimeType } from '../../lib/schema/policy';

interface SchemaExportDialogProps {
  entries: CatalogEntry[];
  contextId: string;
  metadata: Record<string, string>;
  onClose: () => void;
}

interface FormatOption {
  value: ExportFormat;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: 'xsd',
    label: 'XSD',
    icon: FileCode,
    description: 'XML Schema Definition'
  },
  {
    value: 'json-schema',
    label: 'JSON Schema',
    icon: FileJson,
    description: 'JSON Schema (draft 2020-12)'
  },
  {
    value: 'csv',
    label: 'CSV',
    icon: FileSpreadsheet,
    description: 'Flat field list'
  }
];

const SchemaExportDialog: React.FC<SchemaExportDialogProps> = ({
  entries,
  contextId,
  metadata,
  onClose
}) => {
  const [format, setFormat] = useState<ExportFormat>('xsd');
  const [policy, setPolicy] = useState<SchemaExportPolicy>({ ...DEFAULT_POLICY });
  const [xsdVersion, setXsdVersion] = useState<XsdVersion>('1.1');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(() => {
    setIsExporting(true);

    try {
      const config = {
        format,
        policy,
        xsdVersion,
        contextId,
        metadata
      };

      let content: string;
      let mimeType: string;

      if (format === 'csv') {
        // CSV stays flat - generate simple list
        content = generateCsv(entries);
        mimeType = 'text/csv';
      } else {
        // Build tree and generate hierarchical schema
        const tree = buildFieldTreeWithPolicy(entries, policy);

        if (format === 'xsd') {
          content = generateXsd(tree, config);
        } else {
          content = generateJsonSchemaString(tree, config);
        }
        mimeType = getMimeType(format);
      }

      // Download file
      const filename = generateFilename(config);
      downloadFile(content, filename, mimeType);

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [format, policy, xsdVersion, contextId, metadata, entries, onClose]);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-ink/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-lg rounded-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-steel bg-paper shrink-0 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Export Schema</h2>
            <p className="text-xs text-slate-500 mt-1">
              {entries.length} fields from {contextId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Format Selection */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
              Export Format
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = format === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormat(option.value)}
                    className={`p-3 rounded border text-center transition-all ${
                      isSelected
                        ? 'border-ceremony bg-ceremony/5'
                        : 'border-steel hover:border-slate-400'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-1 ${isSelected ? 'text-ceremony' : 'text-slate-400'}`} />
                    <div className="text-sm font-bold text-ink">{option.label}</div>
                    <div className="text-[10px] text-slate-500">{option.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Policy Options - only show for hierarchical formats */}
          {format !== 'csv' && (
            <PolicyOptions
              policy={policy}
              onChange={setPolicy}
              format={format}
              xsdVersion={xsdVersion}
              onXsdVersionChange={setXsdVersion}
            />
          )}

          {/* CSV note */}
          {format === 'csv' && (
            <div className="bg-slate-50 border border-steel rounded p-4">
              <p className="text-xs text-slate-600">
                CSV export generates a flat list of all fields with their cardinality and properties.
                No hierarchy or policy options apply.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-steel bg-paper flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || entries.length === 0}
            className="bg-ceremony text-paper px-8 py-2 rounded text-xs font-black uppercase tracking-widest hover:bg-ceremony-hover transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Generates a simple CSV from catalog entries.
 */
function generateCsv(entries: CatalogEntry[]): string {
  const headers = ['fieldPath', 'minOccurs', 'maxOccurs', 'allowsNull', 'allowsEmpty'];
  const rows = entries.map((entry) => [
    `"${entry.fieldPath}"`,
    entry.minOccurs,
    entry.maxOccurs,
    entry.allowsNull,
    entry.allowsEmpty
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Triggers a file download in the browser.
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default SchemaExportDialog;
