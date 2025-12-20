import React from 'react';
import { CheckCircle2, Loader2, Layers, AlertCircle, Edit3 } from 'lucide-react';
import type { UploadBin, Context } from '../../types';

interface BinRowProps {
  bin: UploadBin;
  context: Context;
  isReady: boolean;
  onEditClick: () => void;
  onSubmit: () => void;
}

const BinRow: React.FC<BinRowProps> = ({ bin, isReady, onEditClick, onSubmit }) => {
  const isProcessing = bin.status === 'submitting';
  const isComplete = bin.status === 'complete';
  const isError = bin.status === 'error';

  const totalFiles = bin.files.length;
  const totalFields = bin.files.reduce((sum, f) => sum + f.fieldCount, 0);
  const totalAttrs = bin.files.reduce((sum, f) => sum + f.attributeCount, 0);

  // Get file names for preview
  const fileNames = bin.files.slice(0, 3).map(f => f.file.name);
  const moreCount = totalFiles > 3 ? totalFiles - 3 : 0;

  return (
    <div className={`bg-white border-2 rounded-md p-5 shadow-sm transition-all ${
      isComplete ? 'border-mint bg-mint/5' :
      isError ? 'border-error-200' :
      isReady ? 'border-ceremony' :
      'border-steel'
    }`}>
      <div className="flex items-start justify-between">
        {/* Left side: Icon and info */}
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${
            isComplete ? 'bg-mint/20' :
            isReady ? 'bg-ceremony/10' :
            bin.id === 'incomplete' ? 'bg-amber-50' :
            'bg-slate-100'
          }`}>
            {isComplete ? (
              <CheckCircle2 className="w-6 h-6 text-mint" />
            ) : bin.id === 'incomplete' && !isReady ? (
              <AlertCircle className="w-6 h-6 text-amber-500" />
            ) : isReady ? (
              <CheckCircle2 className="w-6 h-6 text-ceremony" />
            ) : (
              <Layers className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-ink uppercase tracking-tight">
                {bin.id === 'complete' ? 'Complete' : 'Incomplete'} Group
              </h3>
              <span className="text-xs font-bold text-slate-400">
                ({totalFiles} {totalFiles === 1 ? 'file' : 'files'})
              </span>
              {isReady && !isComplete && (
                <span className="text-[10px] font-bold text-mint bg-mint/10 px-2 py-0.5 rounded-full uppercase">
                  Ready
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              {fileNames.join(', ')}{moreCount > 0 ? `, +${moreCount} more` : ''}
            </div>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400">
              <span><strong className="text-ink">{totalFields.toLocaleString()}</strong> fields</span>
              <span><strong className="text-ink">{totalAttrs.toLocaleString()}</strong> attributes</span>
            </div>
          </div>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-3">
          {isProcessing && (
            <div className="flex items-center gap-2 text-ceremony font-bold text-xs mr-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading {Math.round(bin.progress)}%</span>
            </div>
          )}

          {isError && (
            <div className="text-error-500 font-bold text-xs mr-2">{bin.error}</div>
          )}

          {!isComplete && !isProcessing && (
            <>
              <button
                onClick={onEditClick}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:text-ink border border-steel rounded hover:border-slate-400 transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                Edit Metadata
              </button>
              <button
                disabled={!isReady || isProcessing}
                onClick={onSubmit}
                className={`px-5 py-2 rounded text-xs font-black uppercase tracking-wide transition-colors flex items-center gap-2 ${
                  isReady
                    ? 'bg-ceremony text-paper hover:bg-ceremony-hover shadow-sm'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Submit
              </button>
            </>
          )}

          {isComplete && (
            <div className="flex items-center gap-2 text-mint font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              Submitted
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isProcessing && (
        <div className="mt-4 bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-ceremony h-full transition-all duration-300"
            style={{ width: `${bin.progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default BinRow;
