import React, { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import Layout from '../components/layout/Layout';
import ContextCard from '../components/contexts/ContextCard';
import ContextFormModal from '../components/contexts/ContextFormModal';
import { useContexts } from '../hooks/useContexts';
import { useContextMutations } from '../hooks/useContextMutations';
import type { Context, ContextWithCount } from '../types';

const ContextsPage: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContext, setEditingContext] = useState<Context | null>(null);
  const { data: contexts, isLoading } = useContexts(true);
  const { deleteContext } = useContextMutations();

  const handleEdit = (context: Context) => {
    setEditingContext(context);
    setIsFormOpen(true);
  };

  const handleDelete = async (context: ContextWithCount) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${context.displayName}"? All ${context.fieldCount.toLocaleString()} associated observations will be permanently removed.`
      )
    ) {
      try {
        await deleteContext(context.contextId);
        toast.success(`Context "${context.displayName}" deleted successfully`);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        toast.error(`Failed to delete context: ${message}`);
      }
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingContext(null);
  };

  const handleNewContext = () => {
    setEditingContext(null);
    setIsFormOpen(true);
  };

  return (
    <Layout>
      <div className="bg-paper p-6 shrink-0 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.3)] relative z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-ink uppercase tracking-tight">
              Context Management
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
              Define and manage business observation points.
            </p>
          </div>
          <button
            onClick={handleNewContext}
            className="bg-ceremony text-paper px-6 py-2.5 rounded text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Context
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-2 bg-gradient-to-b from-black/10 to-transparent shrink-0" />
        <div className="flex-1 overflow-auto bg-paper/50 p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-steel h-48 rounded-md animate-pulse" />
            ))
          ) : contexts?.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-slate-400">
              <p className="text-lg font-bold mb-2">No contexts yet</p>
              <p className="text-sm">Create your first context to start cataloging field observations.</p>
            </div>
          ) : (
            contexts?.map((context) => (
              <ContextCard
                key={context.contextId}
                context={context as ContextWithCount}
                onEdit={() => handleEdit(context)}
                onDelete={() => handleDelete(context as ContextWithCount)}
              />
            ))
          )}
        </div>
        </div>
      </div>

      {isFormOpen && <ContextFormModal context={editingContext} onClose={handleCloseForm} />}
    </Layout>
  );
};

export default ContextsPage;
