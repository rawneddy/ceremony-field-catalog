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
import { useSuggest } from '../hooks/useSuggest';
import type { CatalogEntry } from '../types';

const AdvancedSearchPage: React.FC = () => {
  const [contextId, setContextId] = useState('');
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [fieldPath, setFieldPath] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [selectedRow, setSelectedRow] = useState<CatalogEntry | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Suggestions scoped to context and metadata
  const suggestions = useSuggest('fieldPath', fieldPath, contextId || undefined, metadata);

  // State for the actual search being executed
  const [searchParams, setSearchParams] = useState({
    contextId: '',
    metadata: {} as Record<string, string>,
    fieldPath: '',
    isRegex: false
  });

  const { data: contexts } = useContexts();
  const selectedContext = contexts?.find(c => c.contextId === contextId);

  const { data, isLoading } = useFieldSearch({
    contextId: searchParams.contextId || undefined,
    fieldPathContains: searchParams.fieldPath || undefined,
    metadata: Object.keys(searchParams.metadata).length > 0 ? searchParams.metadata : undefined,
    regex: searchParams.isRegex,
    size: 250
  });

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
    setSearchParams({
      contextId,
      metadata,
      fieldPath,
      isRegex
    });
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
      <div className="bg-paper border-b border-steel p-6 shrink-0">
        <form onSubmit={handleSearch} className="max-w-6xl mx-auto grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Context</label>
            <ContextSelector 
              value={contextId} 
              onChange={handleContextChange} 
              contexts={contexts || []} 
            />
          </div>

          <div className="col-span-9">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Field Path Pattern</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={fieldPath}
                  onChange={(e) => setFieldPath(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="e.g. /Ceremony/Account/Amount"
                  className="w-full bg-white border border-steel rounded px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ceremony/20 focus:border-ceremony transition-all font-medium font-mono"
                />

                {showSuggestions && !isRegex && suggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-steel rounded-md shadow-2xl max-h-64 overflow-y-auto">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="w-full text-left px-4 py-2 text-xs hover:bg-paper transition-colors font-mono border-b border-steel/50 last:border-0"
                        onClick={() => {
                          setFieldPath(suggestion);
                          setShowSuggestions(false);
                          setSearchParams(prev => ({ ...prev, fieldPath: suggestion, isRegex }));
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center bg-white border border-steel rounded px-1">
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
              <button
                type="submit"
                className="bg-ceremony text-paper px-6 py-2.5 rounded text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-sm"
              >
                Search
              </button>
            </div>
          </div>

          {selectedContext && (
            <div className="col-span-12">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-3 h-3 text-ceremony" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Metadata Filters for {selectedContext.displayName}</h3>
              </div>
              <MetadataFilters 
                context={selectedContext} 
                values={metadata} 
                onChange={handleMetadataChange} 
              />
            </div>
          )}
        </form>
      </div>

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
    </Layout>
  );
};

export default AdvancedSearchPage;
