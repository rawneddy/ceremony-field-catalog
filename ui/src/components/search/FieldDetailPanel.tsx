import React from 'react';
import type { CatalogEntry } from '../../types';
import { X, Database, Info, Activity, Clock } from 'lucide-react';
import { config } from '../../config';

interface FieldDetailPanelProps {
  entry: CatalogEntry;
  onClose: () => void;
}

const FieldDetailPanel: React.FC<FieldDetailPanelProps> = ({ entry, onClose }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div 
      className="w-[450px] bg-white border-l border-steel shadow-2xl flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right"
      style={{ animationDuration: `${config.DETAIL_PANEL_ANIMATION_MS}ms` }}
    >
      <div className="p-6 border-b border-steel flex items-center justify-between bg-paper">
        <h2 className="text-sm font-black uppercase tracking-widest text-ink">Field Details</h2>
        <button 
          onClick={onClose}
          className="p-1 rounded-full hover:bg-steel transition-colors"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-3 text-slate-400">
            <Database className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-widest">Context</h3>
          </div>
          <div className="bg-paper border border-steel p-4 rounded-md">
            <div className="text-2xl font-black text-ink">{entry.contextId}</div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3 text-slate-400">
            <Info className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-widest">Metadata</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(entry.metadata).map(([key, value]) => (
              <div key={key} className="flex flex-col p-3 bg-paper border-l-4 border-ceremony rounded-r-md">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">{key}</span>
                <span className="text-sm font-bold text-ink">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3 text-slate-400">
            <Activity className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-widest">Statistics</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Occurrences" value={`${entry.minOccurs} - ${entry.maxOccurs}`} />
            <StatCard label="Allows Null" value={entry.allowsNull ? 'Yes' : 'No'} highlight={entry.allowsNull} />
            <StatCard label="Allows Empty" value={entry.allowsEmpty ? 'Yes' : 'No'} highlight={entry.allowsEmpty} />
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3 text-slate-400">
            <Clock className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-widest">Discovery Timeline</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="First Observed" value={formatDate(entry.firstObservedAt)} />
            <StatCard label="Last Observed" value={formatDate(entry.lastObservedAt)} />
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3 text-slate-400">
            <X className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-widest">Full Field Path</h3>
          </div>
          <div className="bg-ink text-paper p-4 rounded font-mono text-xs break-all leading-relaxed border border-ink">
            {entry.fieldPath}
          </div>
        </section>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="bg-paper border border-steel p-4 rounded-md">
    <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">{label}</div>
    <div className={`text-lg font-black ${highlight ? 'text-amber-600' : 'text-ink'}`}>{value}</div>
  </div>
);

export default FieldDetailPanel;