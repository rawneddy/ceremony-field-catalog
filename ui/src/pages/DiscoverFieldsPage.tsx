import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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

// Type for incoming state when returning from Schema page
interface DiscoveryIncomingState {
  contextId: string;
  metadata: Record<string, string[]>;
  facetFilters: Record<string, string[]>;
  facetModes: Record<string, 'any' | 'all'>;
  searchQuery: string;
  isRegex: boolean;
  selectedFieldPath: string;
}

const DiscoverFieldsPage: React.FC = () => {
  const location = useLocation();
  const incomingState = location.state as DiscoveryIncomingState | undefined;

  const [contextId, setContextId] = useState(incomingState?.contextId ?? '');
  // Server-side metadata filters (from header bar) - triggers API calls
  const [metadata, setMetadata] = useState<Record<string, string[]>>(incomingState?.metadata ?? {});
  // Client-side facet filters (from sidebar) - filters loaded results locally
  const [facetFilters, setFacetFilters] = useState<Record<string, string[]>>(incomingState?.facetFilters ?? {});
  // Facet mode per key: 'any' = OR (match any selected value), 'all' = AND (match all selected values)
  const [facetModes, setFacetModes] = useState<Record<string, 'any' | 'all'>>(incomingState?.facetModes ?? {});
  const [fieldPath, setFieldPath] = useState(incomingState?.searchQuery ?? '');
  const [isRegex, setIsRegex] = useState(incomingState?.isRegex ?? false);
  const [selectedField, setSelectedField] = useState<AggregatedField | null>(null);
  const [pendingSelectedFieldPath, setPendingSelectedFieldPath] = useState<string | undefined>(
    incomingState?.selectedFieldPath
  );

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

  // Restore selected field when returning from Schema page
  useEffect(() => {
    if (pendingSelectedFieldPath && aggregatedFields.length > 0) {
      const field = aggregatedFields.find(f => f.fieldPath === pendingSelectedFieldPath);
      if (field) {
        setSelectedField(field);
      }
      setPendingSelectedFieldPath(undefined); // Clear pending so we don't re-select
    }
  }, [pendingSelectedFieldPath, aggregatedFields]);

  // Apply client-side facet filters to aggregated fields
  const filteredAggregatedFields = useMemo(() => {
    if (Object.keys(facetFilters).length === 0) {
      return aggregatedFields;
    }

    // Separate filters by mode
    const allModeFilters: [string, string[]][] = [];
    const anyModeFilters: [string, string[]][] = [];

    for (const [key, selectedValues] of Object.entries(facetFilters)) {
      if (selectedValues.length === 0) continue;
      const mode = facetModes[key] || 'any';
      if (mode === 'all') {
        allModeFilters.push([key, selectedValues]);
      } else {
        anyModeFilters.push([key, selectedValues]);
      }
    }

    return aggregatedFields.filter(field => {
      // 'all' mode: field must have variants COLLECTIVELY covering all selected values per key
      // (Different variants can cover different values - this is field-level coverage)
      const passesAllMode = allModeFilters.every(([key, selectedValues]) => {
        if (key === 'contextId') {
          return selectedValues.every(sv =>
            field.variants.some(v => v.contextId === sv)
          );
        } else {
          return selectedValues.every(sv =>
            field.variants.some(v => v.metadata[key] === sv)
          );
        }
      });

      if (!passesAllMode) return false;

      // 'any' mode: at least ONE variant must match ALL 'any' mode keys simultaneously
      // This ensures the Variant Explorer panel will show at least one matching variant
      if (anyModeFilters.length === 0) return true;

      return field.variants.some(variant =>
        anyModeFilters.every(([key, selectedValues]) => {
          if (key === 'contextId') {
            return selectedValues.includes(variant.contextId);
          } else {
            const value = variant.metadata[key];
            return value !== undefined && selectedValues.includes(value);
          }
        })
      );
    });
  }, [aggregatedFields, facetFilters, facetModes]);

  // Clear selectedField if it's no longer in the filtered results
  useEffect(() => {
    if (selectedField && !filteredAggregatedFields.some(f => f.fieldPath === selectedField.fieldPath)) {
      setSelectedField(null);
    }
  }, [filteredAggregatedFields, selectedField]);

  // Build facet index from UNFILTERED results (counts stay stable)
  // Pass facetFilters only for highlighting which values are selected
  const facets = useDiscoveryFacets(aggregatedFields, facetFilters, facetModes);

  // Splunk-style: clicking a facet value filters client-side (no API call)
  // Both 'any' and 'all' modes are multi-select, just different logic
  const handleFacetSelect = (key: string, value: string) => {
    setFacetFilters(prev => {
      const currentValues = prev[key] || [];

      // Toggle value in list (multi-select for both modes)
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

  const handleSetMode = (key: string, mode: 'any' | 'all') => {
    setFacetModes(prev => ({ ...prev, [key]: mode }));
    // Both modes support multi-select, no need to truncate selections
  };

  const handleClearFacet = (key: string) => {
    setFacetFilters(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleClearAllFacets = () => {
    setFacetFilters({});
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    // In Discovery, search is reactive, but we can manually trigger if needed
    // by clearing the debounce or similar. For now, the button just confirms.
  };

  const handleContextChange = (newContextId: string) => {
    setContextId(newContextId);
    setMetadata({}); // Reset metadata filters when context changes
    setFacetFilters({}); // Reset facet filters too
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

  // Shared layout constants - title takes fixed width, controls fill the rest
  const TITLE_WIDTH = 'w-56'; // 224px - consistent across all search pages
  const ROW_GAP = 'gap-6';    // 24px - consistent gap between title and controls

  return (
    <Layout>
      <div className="bg-paper p-6 shrink-0 shadow-header relative z-30">
        {/* Row 1: Title + Primary Controls */}
        <div className={`flex items-center ${ROW_GAP}`}>
          <div className={`${TITLE_WIDTH} shrink-0`}>
            <h1 className="text-2xl font-black text-ink uppercase tracking-tight">Fields</h1>
            <p className="text-slate-500 text-sm font-medium">Field Filters</p>
          </div>
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-4">
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

        {/* Row 2: Secondary Filters - uses same column structure for alignment */}
        {selectedContext && (
          <div className={`flex ${ROW_GAP} mt-4 pt-4 border-t border-steel/50`}>
            <div className={`${TITLE_WIDTH} shrink-0`} /> {/* Empty spacer for alignment */}
            <div className="flex-1">
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
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-2 bg-gradient-to-b from-black/10 to-transparent shrink-0" />
        <div className="flex-1 flex overflow-hidden">
        <FacetSidebar
          facets={facets}
          onToggleValue={handleFacetSelect}
          onSetMode={handleSetMode}
          onClearFacet={handleClearFacet}
          onClearAll={handleClearAllFacets}
          fieldCount={filteredAggregatedFields.length}
          observationCount={data?.content?.length}
        />

        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {error && <ErrorBanner title="Discovery Failed" error={error} />}

          {data && data.totalElements > data.size && (
            <TruncationWarning
              total={data.totalElements}
              displayed={data.size}
              fieldCount={aggregatedFields.length}
            />
          )}

          <div className="flex-1 overflow-auto">
            <AggregatedFieldTable
              results={filteredAggregatedFields}
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
            facetFilters={facetFilters}
            discoveryState={{
              contextId,
              metadata,
              facetFilters,
              facetModes,
              searchQuery: fieldPath,
              isRegex
            }}
          />
        )}
      </div>
      </div>
    </Layout>
  );
};

export default DiscoverFieldsPage;