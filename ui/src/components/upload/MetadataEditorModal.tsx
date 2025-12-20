import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { SuggestionInput } from '../ui';
import type { Context, UploadBin, FileWithMetadata } from '../../types';

interface MetadataEditorModalProps {
  bin: UploadBin;
  context: Context;
  onSave: (updatedFiles: FileWithMetadata[]) => void;
  onClose: () => void;
}

const MetadataEditorModal: React.FC<MetadataEditorModalProps> = ({
  bin,
  context,
  onSave,
  onClose
}) => {
  // Local state for editing - deep copy the files
  const [editedFiles, setEditedFiles] = useState<FileWithMetadata[]>(
    bin.files.map(f => ({
      ...f,
      metadata: { ...f.metadata }
    }))
  );

  const requiredFields = context.requiredMetadata;
  const optionalFields = context.optionalMetadata;
  const allFields = [...requiredFields, ...optionalFields];

  // Check if all required fields are filled for all files
  const allRequiredFilled = editedFiles.every(f =>
    requiredFields.every(field => f.metadata[field] && f.metadata[field].trim())
  );

  const handleMetadataChange = (fileIndex: number, field: string, value: string) => {
    setEditedFiles(prev => prev.map((f, i) =>
      i === fileIndex
        ? { ...f, metadata: { ...f.metadata, [field]: value } }
        : f
    ));
  };

  const handleSave = () => {
    onSave(editedFiles);
    onClose();
  };

  const isAutoExtracted = (file: FileWithMetadata, field: string): boolean => {
    return !!file.originalMetadata[field];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel">
          <div>
            <h2 className="text-lg font-black text-ink uppercase tracking-tight">
              Edit Metadata - {bin.id === 'complete' ? 'Complete' : 'Incomplete'} Group
            </h2>
            <p className="text-xs text-slate-500">
              {bin.files.length} {bin.files.length === 1 ? 'file' : 'files'} in this group
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-ink transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-paper border-b-2 border-steel sticky left-0 z-10 min-w-[200px]">
                    Filename
                  </th>
                  {requiredFields.map(field => (
                    <th
                      key={field}
                      className="text-left px-3 py-2 text-[10px] font-black uppercase tracking-wider text-ink bg-ceremony/10 border-b-2 border-ceremony/30 min-w-[150px]"
                    >
                      {field}
                      <span className="text-ceremony ml-1">*</span>
                    </th>
                  ))}
                  {optionalFields.map(field => (
                    <th
                      key={field}
                      className="text-left px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-paper border-b-2 border-steel min-w-[150px]"
                    >
                      {field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {editedFiles.map((file, fileIndex) => (
                  <tr key={file.file.name} className="border-b border-steel/50 hover:bg-paper/50">
                    <td className="px-3 py-2 text-xs font-medium text-ink sticky left-0 bg-white z-10">
                      <div className="truncate max-w-[200px]" title={file.file.name}>
                        {file.file.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {file.fieldCount} fields, {file.attributeCount} attrs
                      </div>
                    </td>
                    {allFields.map(field => {
                      const isRequired = requiredFields.includes(field);
                      const isAuto = isAutoExtracted(file, field);
                      const hasValue = file.metadata[field] && file.metadata[field].trim();
                      const showError = isRequired && !hasValue;

                      return (
                        <td
                          key={field}
                          className={`px-2 py-2 ${isRequired ? 'bg-ceremony/5' : ''}`}
                        >
                          <SuggestionInput
                            field={`metadata.${field}`}
                            value={file.metadata[field] || ''}
                            onChange={(val) => handleMetadataChange(fileIndex, field, val)}
                            contextId={context.contextId}
                            placeholder={isRequired ? 'Required...' : 'Optional...'}
                            autoExtracted={isAuto}
                            inputClassName={showError ? 'border-error-300 bg-error-50' : ''}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend and Actions */}
        <div className="px-6 py-4 border-t border-steel bg-paper/50 flex items-center justify-between">
          <div className="flex items-center gap-6 text-[10px] text-slate-500">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-ceremony/10 border border-ceremony/30 rounded" />
              <span>Required field</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-ceremony/5 border border-ceremony/20 rounded" />
              <span>Auto-extracted (click to edit)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!allRequiredFilled}
              className={`px-6 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors ${
                allRequiredFilled
                  ? 'bg-mint text-white hover:bg-mint/90 shadow-sm'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {allRequiredFilled && <CheckCircle2 className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetadataEditorModal;
