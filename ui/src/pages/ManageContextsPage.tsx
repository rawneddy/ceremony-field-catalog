import React, { useState } from 'react';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import Layout from '../components/layout/Layout';
import ContextCard from '../components/contexts/ContextCard';
import ContextFormModal from '../components/contexts/ContextFormModal';
import { Skeleton, EmptyState } from '../components/ui';
import { useContexts } from '../hooks/useContexts';
import { useContextMutations } from '../hooks/useContextMutations';
import type { Context, ContextWithCount } from '../types';

const ManageContextsPage: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContext, setEditingContext] = useState<Context | null>(null);
  const [filter, setFilter] = useState('');
  const { data: contexts, isLoading } = useContexts(true);

  const filteredContexts = contexts?.filter(c =>
    c.displayName.toLowerCase().includes(filter.toLowerCase()) ||
    c.contextId.toLowerCase().includes(filter.toLowerCase()) ||
    c.description?.toLowerCase().includes(filter.toLowerCase())
  );
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
      <div className="bg-paper p-6 shrink-0 shadow-header relative z-10">
        <div className="flex items-center gap-8 px-2">
          <div className="w-56 shrink-0">
            <h1 className="text-2xl font-black text-ink uppercase tracking-tight">Contexts</h1>
            <p className="text-slate-500 text-sm font-medium">Schema Boundaries</p>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter contexts..."
              className="w-full bg-white border border-steel rounded px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ceremony/20 focus:border-ceremony transition-all font-medium"
            />
          </div>
          <button
            onClick={handleNewContext}
            className="bg-ceremony text-paper px-6 py-2.5 rounded text-sm font-bold hover:bg-ceremony-hover transition-colors shadow-sm"
          >
            + New
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-2 bg-gradient-to-b from-black/10 to-transparent shrink-0" />
        <div className="flex-1 overflow-auto bg-paper/50 p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            <Skeleton variant="card" count={4} />
          ) : filteredContexts?.length === 0 ? (
            <div className="col-span-2">
              <EmptyState
                title={filter ? 'No matches' : 'No contexts yet'}
                description={filter ? 'Try a different filter term.' : 'Create your first context to start cataloging field observations.'}
              />
            </div>
          ) : (
            filteredContexts?.map((context) => (
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

export default ManageContextsPage;
