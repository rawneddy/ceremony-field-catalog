import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { Plus, Database, AlertCircle, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { useContexts } from '../hooks/useContexts';
import { useContextMutations } from '../hooks/useContextMutations';
import type { Context, ContextWithCount, MetadataExtractionRule } from '../types';

const ContextsPage: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContext, setEditingContext] = useState<Context | null>(null);
  const { data: contexts, isLoading } = useContexts(true);
  const { deleteContext } = useContextMutations();

  const handleEdit = (context: Context) => {
    setEditingContext(context);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this context? All associated observations will be permanently removed.')) {
      try {
        await deleteContext(id);
      } catch (e) {
        alert('Failed to delete context');
      }
    }
  };

  return (
    <Layout>
      <div className="bg-paper border-b border-steel p-8 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-ink uppercase tracking-tight">Context Management</h1>
            <p className="text-slate-500 mt-1 font-medium">Define and manage business observation points.</p>
          </div>
          <button 
            onClick={() => { setEditingContext(null); setIsFormOpen(true); }}
            className="bg-ceremony text-paper px-6 py-3 rounded font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            New Context
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-paper/50 p-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-steel h-48 rounded-md animate-pulse" />
            ))
          ) : contexts?.map((context) => (
            <ContextCard 
              key={context.contextId} 
              context={context as ContextWithCount} 
              onEdit={() => handleEdit(context)}
              onDelete={() => handleDelete(context.contextId)}
            />
          ))}
        </div>
      </div>

      {isFormOpen && (
        <ContextFormModal 
          context={editingContext} 
          onClose={() => setIsFormOpen(false)} 
        />
      )}
    </Layout>
  );
};

const ContextCard = ({ context, onEdit, onDelete }: { context: ContextWithCount; onEdit: () => void; onDelete: () => void }) => {
  return (
    <div className={`bg-white border-2 transition-all p-6 rounded-md shadow-sm flex flex-col ${
      context.active ? 'border-steel hover:border-ceremony/30' : 'border-slate-100 opacity-70 grayscale-[0.5]'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${context.active ? 'bg-ceremony/10 text-ceremony' : 'bg-slate-100 text-slate-400'}`}>
            <Database className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-black text-ink truncate">{context.displayName}</h3>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
          context.active ? 'bg-mint/20 text-emerald-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {context.active ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {context.active ? 'Active' : 'Inactive'}
        </div>
      </div>

      <p className="text-sm text-slate-500 mb-6 line-clamp-2 flex-1 italic">
        {context.description || 'No description provided.'}
      </p>

      <div className="space-y-3 mb-6">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter block mb-1">Required Metadata</span>
          <div className="flex flex-wrap gap-1">
            {context.requiredMetadata.map(m => (
              <span key={m} className="bg-paper border border-steel px-2 py-0.5 rounded text-[10px] font-bold text-ink">{m}</span>
            ))}
          </div>
        </div>
        <div>
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter block mb-1">Field Count</span>
           <span className="text-xl font-black text-ink">{context.fieldCount.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-steel mt-auto">
        <button 
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded border border-steel text-xs font-bold uppercase tracking-widest hover:bg-paper transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </button>
        <button 
          onClick={onDelete}
          className="p-2 rounded border border-steel text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const ContextFormModal = ({ context, onClose }: { context: Context | null; onClose: () => void }) => {
  const { createContext, updateContext, isCreating, isUpdating } = useContextMutations();
  const [formData, setFormData] = useState({
    contextId: context?.contextId || '',
    displayName: context?.displayName || '',
    description: context?.description || '',
    active: context?.active ?? true,
    requiredMetadata: context?.requiredMetadata.join(', ') || '',
    optionalMetadata: context?.optionalMetadata.join(', ') || '',
    metadataRules: context?.metadataRules || {} as Record<string, MetadataExtractionRule>
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      requiredMetadata: formData.requiredMetadata.split(',').map(s => s.trim()).filter(Boolean),
      optionalMetadata: formData.optionalMetadata.split(',').map(s => s.trim()).filter(Boolean),
      metadataRules: formData.metadataRules
    };

    try {
      if (context) {
        await updateContext({ id: context.contextId, context: payload });
      } else {
        await createContext(payload);
      }
      onClose();
    } catch (e) {
      alert('Failed to save context');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-ink/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-steel bg-paper">
            <h2 className="text-xl font-black uppercase tracking-tight">{context ? 'Edit Context' : 'Create New Context'}</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Context ID</label>
              <input
                disabled={!!context}
                value={formData.contextId}
                onChange={e => setFormData(prev => ({ ...prev, contextId: e.target.value }))}
                className="w-full bg-paper border border-steel rounded px-3 py-2 text-sm font-bold focus:outline-none focus:border-ceremony disabled:opacity-50"
                placeholder="e.g. deposits"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Display Name</label>
              <input
                value={formData.displayName}
                onChange={e => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className="w-full bg-paper border border-steel rounded px-3 py-2 text-sm font-bold focus:outline-none focus:border-ceremony"
                placeholder="e.g. Deposit Accounts"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-paper border border-steel rounded px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:border-ceremony"
                placeholder="Describe the purpose of this context..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Required Metadata (comma sep)</label>
                  <input
                    disabled={!!context}
                    value={formData.requiredMetadata}
                    onChange={e => setFormData(prev => ({ ...prev, requiredMetadata: e.target.value }))}
                    className="w-full bg-paper border border-steel rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-ceremony disabled:opacity-50"
                  />
               </div>
               <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Optional Metadata (comma sep)</label>
                  <input
                    value={formData.optionalMetadata}
                    onChange={e => setFormData(prev => ({ ...prev, optionalMetadata: e.target.value }))}
                    className="w-full bg-paper border border-steel rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-ceremony"
                  />
               </div>
            </div>

            <div className="border-t border-steel pt-4 mt-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Auto-Extraction Rules</h3>
              <p className="text-[10px] text-slate-400 mb-4">
                Define prioritized XPaths to automatically extract metadata values from uploaded XML files. 
                Optionally add a Regex to validate the extracted value.
              </p>
              
              {[
                ...formData.requiredMetadata.split(',').map(s => s.trim()).filter(Boolean),
                ...formData.optionalMetadata.split(',').map(s => s.trim()).filter(Boolean)
              ].map(field => (
                <div key={field} className="mb-4 bg-slate-50 p-3 rounded border border-steel">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-ink">{field}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">XPaths (comma separated, priority order)</label>
                      <input
                        value={formData.metadataRules[field]?.xpaths?.join(', ') || ''}
                        onChange={e => {
                          const xpaths = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                          setFormData(prev => ({
                            ...prev,
                            metadataRules: {
                              ...prev.metadataRules,
                              [field]: { 
                                ...prev.metadataRules[field], 
                                xpaths 
                              }
                            }
                          }));
                        }}
                        className="w-full bg-white border border-steel rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-ceremony"
                        placeholder="/Root/Element/Path, /Another/Path"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Validation Regex (Optional)</label>
                      <input
                        value={formData.metadataRules[field]?.validationRegex || ''}
                        onChange={e => {
                          setFormData(prev => ({
                            ...prev,
                            metadataRules: {
                              ...prev.metadataRules,
                              [field]: { 
                                ...prev.metadataRules[field], 
                                validationRegex: e.target.value 
                              }
                            }
                          }));
                        }}
                        className="w-full bg-white border border-steel rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-ceremony"
                        placeholder="e.g. ^[A-Z]{3}$"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {(!formData.requiredMetadata && !formData.optionalMetadata) && (
                <div className="text-xs text-slate-400 italic text-center py-2">
                  Add metadata fields above to configure extraction rules.
                </div>
              )}
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={e => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                className="w-5 h-5 rounded accent-ceremony"
              />
              <span className="text-sm font-bold text-ink uppercase tracking-tight">Active Observation Point</span>
            </label>
          </div>
          <div className="p-6 border-t border-steel bg-paper flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-ink">Cancel</button>
            <button 
              type="submit" 
              disabled={isCreating || isUpdating}
              className="bg-ink text-paper px-8 py-2 rounded text-xs font-black uppercase tracking-widest hover:bg-slate transition-all disabled:opacity-50"
            >
              {isCreating || isUpdating ? 'Saving...' : 'Save Context'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContextsPage;
