import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Search, FileCode } from 'lucide-react';
import FieldTable from '../components/search/FieldTable';
import FieldDetailPanel from '../components/search/FieldDetailPanel';
import TruncationWarning from '../components/search/TruncationWarning';
import ContextSelector from '../components/search/ContextSelector';
import InlineRequiredMetadata from '../components/search/InlineRequiredMetadata';
import InlineOptionalMetadata from '../components/search/InlineOptionalMetadata';
import SchemaExportButtons from '../components/search/SchemaExportButtons';
import { ModeToggle, ErrorBanner, EmptyState } from '../components/ui';
import { useFieldSearch } from '../hooks/useFieldSearch';
import { useContexts } from '../hooks/useContexts';
import { config } from '../config';
import type { CatalogEntry } from '../types';

const ExploreSchemaPage: React.FC = () => {
  // URL params for bookmarkable/shareable searches
  const [urlParams, setUrlParams] = useSearchParams();

  // Context and metadata state
  const [contextId, setContextId] = useState('');
  const [requiredMetadata, setRequiredMetadata] = useState<Record<string, string>>({});
  const [optionalMetadata, setOptionalMetadata] = useState<Record<string, string[]>>({});

  // Search state
  const [selectedRow, setSelectedRow] = useState<CatalogEntry | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);
  const [highlightFieldPath, setHighlightFieldPath] = useState<string | undefined>(undefined);
  const [shakeButton, setShakeButton] = useState(false);

  // Live filter state (client-side only, not sent to API)
  const [filter, setFilter] = useState('');
  const [isRegex, setIsRegex] = useState(false);

  // Get contexts
  const { data: contexts } = useContexts();
  const selectedContext = contexts?.find(c => c.contextId === contextId);

  // Initialize state from URL params on first load (after contexts are available)
  useEffect(() => {
    if (initializedFromUrl || !contexts) return;

    const urlContextId = urlParams.get('contextId');
    if (!urlContextId) {
      setInitializedFromUrl(true);
      return;
    }

    // Find the context to get its required metadata keys
    const context = contexts.find(c => c.contextId === urlContextId);
    if (!context) {
      setInitializedFromUrl(true);
      return;
    }

    // Read metadata from URL params (prefixed with meta_)
    const metadata: Record<string, string> = {};
    context.requiredMetadata.forEach(key => {
      const value = urlParams.get(`meta_${key}`);
      if (value) {
        metadata[key] = value;
      }
    });

    // Read other params
    const urlHighlight = urlParams.get('highlight') || undefined;

    // Set state
    setContextId(urlContextId);
    setRequiredMetadata(metadata);
    setHighlightFieldPath(urlHighlight);
    setInitializedFromUrl(true);

    // Check if we have enough to auto-search
    const allFilled = context.requiredMetadata.every(key => metadata[key]?.trim());
    if (allFilled) {
      // Auto-trigger search after state is set
      setHasSearched(true);
      setSearchParams({
        contextId: urlContextId,
        metadata: Object.fromEntries(
          Object.entries(metadata).map(([k, v]) => [k, [v]])
        )
      });
    }
  }, [urlParams, contexts, initializedFromUrl]);

  // Update URL when search is executed
  const updateUrlParams = useCallback((
    searchContextId: string,
    searchMetadata: Record<string, string>
  ) => {
    const params = new URLSearchParams();
    params.set('contextId', searchContextId);

    // Add metadata with meta_ prefix
    Object.entries(searchMetadata).forEach(([key, value]) => {
      if (value?.trim()) {
        params.set(`meta_${key}`, value);
      }
    });

    setUrlParams(params, { replace: true });
  }, [setUrlParams]);

  // Check if all required metadata is filled
  const allRequiredFilled = useMemo(() => {
    if (!selectedContext) return false;
    return selectedContext.requiredMetadata.every(
      key => requiredMetadata[key]?.trim()
    );
  }, [selectedContext, requiredMetadata]);

  // Search is only enabled when context + all required metadata are filled
  const searchEnabled = !!contextId && allRequiredFilled;

  // State for the actual search being executed
  const [searchParams, setSearchParams] = useState({
    contextId: '',
    metadata: {} as Record<string, string[]>
  });

  // Convert metadata to array format for API (required + optional)
  const metadataForApi = useMemo(() => {
    const result: Record<string, string[]> = {};
    // Add required metadata (single values)
    Object.entries(requiredMetadata).forEach(([key, value]) => {
      if (value?.trim()) {
        result[key] = [value];
      }
    });
    // Add optional metadata (already arrays)
    Object.entries(optionalMetadata).forEach(([key, values]) => {
      if (values.length > 0) {
        result[key] = values;
      }
    });
    return result;
  }, [requiredMetadata, optionalMetadata]);

  const { data, isLoading, error } = useFieldSearch({
    contextId: searchParams.contextId || undefined,
    metadata: Object.keys(searchParams.metadata).length > 0 ? searchParams.metadata : undefined,
    size: config.MAX_RESULTS_PER_PAGE
  }, hasSearched && searchEnabled, 'search');

  const handleContextChange = (newContextId: string) => {
    setContextId(newContextId);
    setRequiredMetadata({}); // Reset metadata when context changes
    setOptionalMetadata({});
    setHasSearched(false);
    setFilter('');
  };

  const handleOptionalMetadataChange = (key: string, values: string[]) => {
    setOptionalMetadata(prev => {
      if (values.length === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: values };
    });
  };

  const handleMetadataChange = (key: string, value: string) => {
    setRequiredMetadata(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();

    // Validate before searching
    if (!searchEnabled) {
      return;
    }

    setHasSearched(true);
    setSearchParams({
      contextId: contextId,
      metadata: metadataForApi
    });

    // Clear the live filter when search is executed
    setFilter('');

    // Update URL for bookmarking/sharing
    updateUrlParams(contextId, requiredMetadata);
  };

  // Raw results from API
  const rawResults = data?.content || [];

  // Apply client-side filter to results
  const results = useMemo(() => {
    if (!filter.trim()) {
      return rawResults;
    }

    if (isRegex) {
      try {
        const regex = new RegExp(filter, 'i');
        return rawResults.filter(entry => regex.test(entry.fieldPath));
      } catch {
        // Invalid regex, return all results
        return rawResults;
      }
    } else {
      const lowerFilter = filter.toLowerCase();
      return rawResults.filter(entry =>
        entry.fieldPath.toLowerCase().includes(lowerFilter)
      );
    }
  }, [rawResults, filter, isRegex]);

  // Shared layout constants - title takes fixed width, controls fill the rest
  const TITLE_WIDTH = 'w-56'; // 224px - consistent across all search pages
  const ROW_GAP = 'gap-6';    // 24px - consistent gap between title and controls

  return (
    <Layout>
      <div className="bg-paper p-6 shrink-0 shadow-header relative z-30">
        {/* Row 1: Title + Primary Controls (Context, Required Metadata, Optional Metadata, Search Button) */}
        <div className={`flex items-center ${ROW_GAP}`}>
          <div className={`${TITLE_WIDTH} shrink-0`}>
            <h1 className="text-2xl font-black text-ink uppercase tracking-tight">Schema</h1>
            <p className="text-slate-500 text-sm font-medium">Data Structures</p>
          </div>
          <div className="flex-1 flex items-center gap-4">
            <div className="w-48 shrink-0">
              <ContextSelector
                value={contextId}
                onChange={handleContextChange}
                contexts={contexts || []}
              />
            </div>

            {/* Required Metadata (inline) */}
            {selectedContext && selectedContext.requiredMetadata.length > 0 && (
              <InlineRequiredMetadata
                context={selectedContext}
                values={requiredMetadata}
                onChange={handleMetadataChange}
              />
            )}

            {/* Pipe separator between required and optional */}
            {searchEnabled && selectedContext && selectedContext.optionalMetadata.length > 0 && (
              <div className="text-slate-300 text-2xl font-light select-none">|</div>
            )}

            {/* Optional Metadata (inline, appears after required is filled) */}
            {searchEnabled && selectedContext && selectedContext.optionalMetadata.length > 0 && (
              <InlineOptionalMetadata
                context={selectedContext}
                values={optionalMetadata}
                onChange={handleOptionalMetadataChange}
                requiredMetadata={requiredMetadata}
              />
            )}

            {/* Search Button (always visible, disabled until ready) */}
            <button
              onClick={(e) => {
                if (!searchEnabled) {
                  e.preventDefault();
                  setShakeButton(true);
                  setTimeout(() => setShakeButton(false), 500);
                } else {
                  handleSearch(e);
                }
              }}
              disabled={!searchEnabled}
              className={`px-6 py-2.5 rounded text-sm font-bold transition-all shadow-sm ml-auto shrink-0
                ${searchEnabled
                  ? 'bg-ceremony text-paper hover:bg-ceremony-hover cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                ${shakeButton ? 'animate-shake' : ''}`}
            >
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-2 bg-gradient-to-b from-black/10 to-transparent shrink-0" />
        <div className="flex-1 flex overflow-hidden">
          {!hasSearched ? (
            <div className="flex-1 flex bg-white">
              <EmptyState
                icon={FileCode}
                title="Explore Schema"
                description={
                  contextId
                    ? "Complete the required metadata above, then search to generate an exact schema."
                    : "Select a context to begin. You'll need to fill in required metadata to explore the schema."
                }
                className="flex-1"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {error && <ErrorBanner title="Search Failed" error={error} />}

              {/* Results Header with Filter and Export */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-steel/50 bg-paper gap-4">
                <div className="text-xs font-bold text-slate-500 shrink-0">
                  {isLoading ? 'Searching...' : (
                    filter.trim()
                      ? `${results.length} of ${rawResults.length} fields`
                      : `${results.length} fields`
                  )}
                  {data && data.totalElements > data.size && (
                    <span className="text-amber-600 ml-2">
                      (showing {data.size} of {data.totalElements})
                    </span>
                  )}
                </div>

                {/* Live Filter Input */}
                <div className="flex-1 max-w-md flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="Filter results by field path..."
                      className="w-full bg-white border border-steel rounded px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ceremony/20 focus:border-ceremony transition-all font-medium font-mono"
                    />
                  </div>
                  <ModeToggle isRegex={isRegex} onToggle={setIsRegex} />
                </div>

                <SchemaExportButtons
                  entries={results}
                  contextId={contextId}
                  metadata={requiredMetadata}
                  optionalMetadata={optionalMetadata}
                  disabled={isLoading || results.length === 0}
                />
              </div>

              {data && data.totalElements > data.size && (
                <TruncationWarning total={data.totalElements} displayed={data.size} />
              )}

              <div className="flex-1 overflow-auto">
                <FieldTable
                  results={results}
                  isLoading={isLoading}
                  selectedId={selectedRow?.id}
                  onSelectRow={setSelectedRow}
                  query={filter}
                  highlightFieldPath={highlightFieldPath}
                />
              </div>
            </div>
          )}

          {selectedRow && (
            <FieldDetailPanel
              entry={selectedRow}
              allEntries={results}
              onClose={() => setSelectedRow(null)}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ExploreSchemaPage;
