import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { Search, Filter } from 'lucide-react';
import FieldTable from '../components/search/FieldTable';
import FacetSidebar from '../components/search/FacetSidebar';
import FieldDetailPanel from '../components/search/FieldDetailPanel';
import TruncationWarning from '../components/search/TruncationWarning';
import ContextSelector from '../components/search/ContextSelector';
import MetadataFilters from '../components/search/MetadataFilters';
import { useFieldSearch } from '../hooks/useFieldSearch';
import { useFacets } from '../hooks/useFacets';
import { useContexts } from '../hooks/useContexts';
import { useDebounce } from '../hooks/useDebounce';
import type { CatalogEntry } from '../types';

const DiscoveryPage: React.FC = () => {
  const [contextId, setContextId] = useState('');
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [fieldPath, setFieldPath] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [selectedRow, setSelectedRow] = useState<CatalogEntry | null>(null);

  // Debounce the text-based search parameters
  const debouncedFieldPath = useDebounce(fieldPath, 500);
  const debouncedMetadata = useDebounce(metadata, 500);

  const { data: contexts } = useContexts();
  const selectedContext = contexts?.find(c => c.contextId === contextId);

  // Search is ALWAYS enabled for instant results
  const { data, isLoading, error } = useFieldSearch({
    q: debouncedFieldPath || undefined,
    contextId: contextId || undefined,
    metadata: Object.keys(debouncedMetadata).length > 0 ? debouncedMetadata : undefined,
    useRegex: isRegex,
    size: 250
  }, true, 'discovery');

  const {
    facets,
    filteredResults,
    setFacetMode,
    toggleFacetValue,
    clearFacet,
    clearAllFacets
  } = useFacets(data?.content);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    // In Discovery, search is reactive, but we can manually trigger if needed
    // by clearing the debounce or similar. For now, the button just confirms.
  };

  const handleContextChange = (newContextId: string) => {
    setContextId(newContextId);
    setMetadata({}); // Reset metadata filters when context changes
  };

  const handleMetadataChange = (key: string, value: string) => {
    setMetadata(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Layout>
      <div className="bg-paper p-6 shrink-0 shadow-header relative z-10">
        <div className="px-2">
          <div className="flex items-center gap-8">
            <div className="w-56 shrink-0">
              <h1 className="text-2xl font-black text-ink uppercase tracking-tight">Discovery</h1>
              <p className="text-slate-500 text-sm font-medium">Explore field patterns</p>
            </div>
            <form onSubmit={handleSearch} className="flex-1 flex items-center gap-3">
              <div className="w-48 shrink-0">
                <ContextSelector
                  value={contextId}
                  onChange={handleContextChange}
                  contexts={contexts || []}
                />
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={fieldPath}
                  onChange={(e) => setFieldPath(e.target.value)}
                  placeholder="Type anything to discover fields... (e.g. DDA, Fulfillment, /Ceremony)"
                  className="w-full bg-white border border-steel rounded px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ceremony/20 focus:border-ceremony transition-all font-medium font-mono"
                />
              </div>
              <div className="flex items-center bg-white border border-steel rounded px-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRegex(false)}
                  className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${!isRegex ? 'bg-ink text-paper' : 'text-slate-400 hover:text-ink'}`}
                >
                  String
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegex(true)}
                  className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${isRegex ? 'bg-ink text-paper' : 'text-slate-400 hover:text-ink'}`}
                >
                  Regex
                </button>
              </div>
            </form>
          </div>

          {selectedContext && (
            <div className="mt-4 pt-4 border-t border-steel/50">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-3 h-3 text-ceremony" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fixed Metadata Filters for {selectedContext.displayName}</h3>
              </div>
              <MetadataFilters
                context={selectedContext}
                values={metadata}
                onChange={handleMetadataChange}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-2 bg-gradient-to-b from-black/10 to-transparent shrink-0" />
        <div className="flex-1 flex overflow-hidden">
        <FacetSidebar
          facets={facets}
          onToggleValue={toggleFacetValue}
          onSetMode={setFacetMode}
          onClearFacet={clearFacet}
          onClearAll={clearAllFacets}
          resultCount={filteredResults.length}
        />

        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {error && (
            <div className="m-6 p-4 bg-error-50 border border-error-200 rounded-md text-error-700 flex items-center gap-3">
              <div className="bg-error-100 p-1.5 rounded-full">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-black uppercase tracking-tight">Discovery Failed</div>
                <div className="text-xs">{(error as any).response?.data?.message || error.message}</div>
              </div>
            </div>
          )}

          {data && data.totalElements > data.size && (
            <TruncationWarning total={data.totalElements} displayed={data.size} />
          )}

          <div className="flex-1 overflow-auto">
            <FieldTable
              results={filteredResults}
              isLoading={isLoading}
              selectedId={selectedRow?.id}
              onSelectRow={setSelectedRow}
              query={fieldPath}
            />
          </div>
        </div>

        {selectedRow && (
          <FieldDetailPanel
            entry={selectedRow}
            onClose={() => setSelectedRow(null)}
          />
        )}
      </div>
      </div>
    </Layout>
  );
};

export default DiscoveryPage;