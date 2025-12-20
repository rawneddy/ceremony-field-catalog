import React from 'react';
import { CheckCircle2, Loader2, Layers, ArrowRight } from 'lucide-react';
import type { UploadBin, Context } from '../../types';

interface BinRowProps {
  bin: UploadBin;
  context: Context;
  onUpdate: (metadata: Record<string, string>) => void;
  onSubmit: () => void;
}

const BinRow: React.FC<BinRowProps> = ({ bin, context, onUpdate, onSubmit }) => {
  // Check if metadata is complete
  const missingFields = context.requiredMetadata.filter(f => !bin.metadata[f]);
  const isReady = missingFields.length === 0;
  const isProcessing = bin.status === 'submitting';
  const isComplete = bin.status === 'complete';
  const isError = bin.status === 'error';

  return (
    <div className={`bg-white border rounded-md p-4 shadow-sm transition-all ${isComplete ? 'border-mint bg-mint/5' : isError ? 'border-error-200' : 'border-steel'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded ${isComplete ? 'bg-mint/20' : 'bg-slate-100'}`}>
            {isComplete ? <CheckCircle2 className="w-5 h-5 text-success-700" /> : <Layers className="w-5 h-5 text-slate-500" />}
          </div>
          <div>
            <h3 className="font-bold text-ink">File Group ({bin.files.length})</h3>
            <div className="flex gap-2 text-[10px] text-slate-400 font-mono mt-1">
              <span>{bin.files.slice(0, 3).map(f => f.name).join(', ')}{bin.files.length > 3 ? '...' : ''}</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          {isProcessing && (
            <div className="flex items-center gap-2 text-ceremony font-bold text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              Uploading {Math.round(bin.progress)}%
            </div>
          )}
          {isError && <div className="text-error-500 font-bold text-xs">{bin.error}</div>}
        </div>
      </div>

      {/* Metadata Editor Grid */}
      {!isComplete && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-slate-50 p-4 rounded border border-steel/50">
          {[...context.requiredMetadata, ...context.optionalMetadata].map(field => (
            <div key={field}>
              <label className={`block text-[9px] font-bold uppercase tracking-tighter mb-1 ${context.requiredMetadata.includes(field) && !bin.metadata[field] ? 'text-error-500' : 'text-slate-400'}`}>
                {field} {context.requiredMetadata.includes(field) ? '*' : ''}
              </label>
              <input
                value={bin.metadata[field] ?? ''}
                onChange={e => onUpdate({ ...bin.metadata, [field]: e.target.value })}
                className={`w-full border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-ceremony ${context.requiredMetadata.includes(field) && !bin.metadata[field] ? 'border-error-300 bg-error-50' : 'border-steel'}`}
                placeholder="Value..."
              />
            </div>
          ))}
        </div>
      )}

      {!isComplete && (
        <div className="flex justify-end border-t border-steel/20 pt-3">
          <button
            disabled={!isReady || isProcessing}
            onClick={onSubmit}
            className="bg-ceremony text-paper px-6 py-2 rounded text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-ceremony-hover transition-colors shadow-sm flex items-center gap-2"
          >
            {isProcessing ? 'Sending...' : `Submit ${bin.files.length} Files`}
            {!isProcessing && <ArrowRight className="w-3 h-3" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default BinRow;
