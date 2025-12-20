import React from 'react';
import { Database, AlertCircle, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import type { ContextWithCount } from '../../types';

interface ContextCardProps {
  context: ContextWithCount;
  onEdit: () => void;
  onDelete: () => void;
}

const ContextCard: React.FC<ContextCardProps> = ({ context, onEdit, onDelete }) => {
  return (
    <div
      className={`bg-white border-2 transition-all p-6 rounded-md shadow-sm flex flex-col ${
        context.active
          ? 'border-steel hover:border-ceremony/30'
          : 'border-slate-100 opacity-70 grayscale-[0.5]'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded ${
              context.active ? 'bg-ceremony/10 text-ceremony' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Database className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-black text-ink truncate">{context.displayName}</h3>
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
            context.active ? 'bg-mint/20 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {context.active ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {context.active ? 'Active' : 'Inactive'}
        </div>
      </div>

      <p className="text-sm text-slate-500 mb-6 line-clamp-2 flex-1 italic">
        {context.description || 'No description provided.'}
      </p>

      <div className="space-y-3 mb-6">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter block mb-1">
            Required Metadata
          </span>
          <div className="flex flex-wrap gap-1">
            {context.requiredMetadata.map((m) => (
              <span
                key={m}
                className="bg-paper border border-steel px-2 py-0.5 rounded text-[10px] font-bold text-ink"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter block mb-1">
            Field Count
          </span>
          <span className="text-xl font-black text-ink">{context.fieldCount.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-steel mt-auto">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded border border-steel text-xs font-bold uppercase tracking-widest hover:bg-paper transition-colors"
          aria-label={`Edit ${context.displayName}`}
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded border border-steel text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors"
          aria-label={`Delete ${context.displayName}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ContextCard;
