import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { TagInput } from '../ui';
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
  const optionalFields = context.optionalMetadata || [];
  const allFields = [...requiredFields, ...optionalFields];

  // Check if a specific file has all required fields filled
  const isRowComplete = (file: FileWithMetadata) =>
    requiredFields.every(field => file.metadata[field] && file.metadata[field].trim());

  // Check if all required fields are filled for all files
  const allRequiredFilled = editedFiles.every(isRowComplete);

  // Count completed rows
  const completedCount = editedFiles.filter(isRowComplete).length;

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
                {editedFiles.map((file, fileIndex) => {
                  const rowComplete = isRowComplete(file);
                  return (
                    <tr
                      key={file.file.name}
                      className={`border-b border-steel/50 transition-colors ${
                        rowComplete
                          ? 'bg-mint/10 hover:bg-mint/15'
                          : 'hover:bg-paper/50'
                      }`}
                    >
                      <td className={`px-3 py-2 text-xs font-medium text-ink sticky left-0 z-10 ${
                        rowComplete ? 'bg-mint/10' : 'bg-white'
                      }`}>
                        <div className="flex items-center gap-2">
                          {rowComplete && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-mint flex-shrink-0" />
                          )}
                          <div>
                            <div className="truncate max-w-[180px]" title={file.file.name}>
                              {file.file.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {file.fieldCount} fields, {file.attributeCount} attrs
                            </div>
                          </div>
                        </div>
                      </td>
                      {allFields.map(field => {
                        const isRequired = requiredFields.includes(field);

                        return (
                          <td
                            key={field}
                            className={`px-2 py-2 ${
                              rowComplete
                                ? ''
                                : isRequired ? 'bg-ceremony/5' : ''
                            }`}
                          >
                            <TagInput
                              field={`metadata.${field}`}
                              values={file.metadata[field] ? [file.metadata[field]] : []}
                              onChange={(vals) => handleMetadataChange(fileIndex, field, vals[0] || '')}
                              contextId={context.contextId}
                              placeholder={isRequired ? 'Required...' : 'Optional...'}
                              maxValues={1}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
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
              <div className="w-4 h-4 bg-mint/10 border border-mint/30 rounded" />
              <span>Row complete</span>
            </div>
            <div className="text-slate-400">
              <span className="font-bold text-mint">{completedCount}</span>
              <span> / {editedFiles.length} files ready</span>
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
              className={`px-6 py-2 rounded text-sm font-bold flex items-center gap-2 transition-all ${
                allRequiredFilled
                  ? 'bg-mint text-white hover:bg-mint/90 shadow-lg shadow-mint/25 ring-2 ring-mint/30'
                  : 'bg-slate-600 text-white hover:bg-slate-500'
              }`}
            >
              {allRequiredFilled && <CheckCircle2 className="w-4 h-4" />}
              Save {!allRequiredFilled && 'Progress'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetadataEditorModal;
