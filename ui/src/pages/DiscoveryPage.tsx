import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { Search, Filter } from 'lucide-react';
import AggregatedFieldTable from '../components/search/AggregatedFieldTable';
import FacetSidebar from '../components/search/FacetSidebar';
import VariantExplorerPanel from '../components/search/VariantExplorerPanel';
import TruncationWarning from '../components/search/TruncationWarning';
import ContextSelector from '../components/search/ContextSelector';
import MetadataFilters from '../components/search/MetadataFilters';
import { ModeToggle, ErrorBanner } from '../components/ui';
import { useFieldSearch } from '../hooks/useFieldSearch';
import { useAggregatedFields } from '../hooks/useAggregatedFields';
import { useDiscoveryFacets } from '../hooks/useDiscoveryFacets';
import { useContexts } from '../hooks/useContexts';
import { useDebounce } from '../hooks/useDebounce';
import { config } from '../config';
import type { AggregatedField } from '../types';

const DiscoveryPage: React.FC = () => {
  const [contextId, setContextId] = useState('');
  const [metadata, setMetadata] = useState<Record<string, string[]>>({});
  const [fieldPath, setFieldPath] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [selectedField, setSelectedField] = useState<AggregatedField | null>(null);

  // Debounce only the text-based search (fieldPath)
  // Metadata is not debounced - updates are explicit (chip add/remove)
  const debouncedFieldPath = useDebounce(fieldPath, config.DEBOUNCE_MS);

  const { data: contexts } = useContexts();
  const selectedContext = contexts?.find(c => c.contextId === contextId);

  // Search is ALWAYS enabled for instant results
  const { data, isLoading, error } = useFieldSearch({
    q: debouncedFieldPath || undefined,
    contextId: contextId || undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    useRegex: isRegex,
    size: config.MAX_RESULTS_PER_PAGE
  }, true, 'discovery');

  // Aggregate entries by fieldPath for discovery view
  const aggregatedFields = useAggregatedFields(data?.content);

  // Build facet index from aggregated results (Splunk-style)
  const facets = useDiscoveryFacets(aggregatedFields, metadata);

  // Splunk-style: clicking a facet value adds it to header filter
  const handleFacetSelect = (key: string, value: string) => {
    setMetadata(prev => {
      const currentValues = prev[key] || [];
      // Toggle: if already selected, remove; otherwise add
      if (currentValues.includes(value)) {
        const newValues = currentValues.filter(v => v !== value);
        if (newValues.length === 0) {
          const { [key]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [key]: newValues };
      }
      return { ...prev, [key]: [...currentValues, value] };
    });
  };

  const handleClearFacet = (key: string) => {
    setMetadata(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleClearAllFacets = () => {
    setMetadata({});
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    // In Discovery, search is reactive, but we can manually trigger if needed
    // by clearing the debounce or similar. For now, the button just confirms.
  };

  const handleContextChange = (newContextId: string) => {
    setContextId(newContextId);
    setMetadata({}); // Reset metadata filters when context changes
  };

  const handleMetadataChange = (key: string, values: string[]) => {
    setMetadata(prev => {
      const updated = { ...prev };
      if (values.length === 0) {
        delete updated[key]; // Remove key when no values
      } else {
        updated[key] = values;
      }
      return updated;
    });
  };

  return (
    <Layout>
      <div className="bg-paper p-6 shrink-0 shadow-header relative z-30">
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
              <ModeToggle isRegex={isRegex} onToggle={setIsRegex} />
            </form>
          </div>

          {selectedContext && (
            <div className="mt-4 pt-4 border-t border-steel/50 ml-60">
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
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-2 bg-gradient-to-b from-black/10 to-transparent shrink-0" />
        <div className="flex-1 flex overflow-hidden">
        <FacetSidebar
          facets={facets}
          onToggleValue={handleFacetSelect}
          onSetMode={() => {}} // Mode not used in Splunk-style
          onClearFacet={handleClearFacet}
          onClearAll={handleClearAllFacets}
          resultCount={aggregatedFields.length}
        />

        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {error && <ErrorBanner title="Discovery Failed" error={error} />}

          {data && data.totalElements > data.size && (
            <TruncationWarning total={data.totalElements} displayed={data.size} />
          )}

          <div className="flex-1 overflow-auto">
            <AggregatedFieldTable
              results={aggregatedFields}
              isLoading={isLoading}
              selectedFieldPath={selectedField?.fieldPath}
              onSelectRow={setSelectedField}
              query={fieldPath}
            />
          </div>
        </div>

        {selectedField && (
          <VariantExplorerPanel
            aggregatedField={selectedField}
            onClose={() => setSelectedField(null)}
          />
        )}
      </div>
      </div>
    </Layout>
  );
};

export default DiscoveryPage;