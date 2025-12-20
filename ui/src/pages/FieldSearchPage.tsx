import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Search, Filter, FileCode } from 'lucide-react';
import FieldTable from '../components/search/FieldTable';
import FieldDetailPanel from '../components/search/FieldDetailPanel';
import TruncationWarning from '../components/search/TruncationWarning';
import ContextSelector from '../components/search/ContextSelector';
import InlineRequiredMetadata from '../components/search/InlineRequiredMetadata';
import OptionalMetadataFilters from '../components/search/OptionalMetadataFilters';
import SchemaExportButtons from '../components/search/SchemaExportButtons';
import { ModeToggle, ErrorBanner, EmptyState } from '../components/ui';
import { useFieldSearch } from '../hooks/useFieldSearch';
import { useContexts } from '../hooks/useContexts';
import { useSuggest } from '../hooks/useSuggest';
import { config } from '../config';
import type { CatalogEntry } from '../types';

const FieldSearchPage: React.FC = () => {
  // URL params for bookmarkable/shareable searches
  const [urlParams, setUrlParams] = useSearchParams();

  // Context and metadata state
  const [contextId, setContextId] = useState('');
  const [requiredMetadata, setRequiredMetadata] = useState<Record<string, string>>({});
  const [optionalMetadata, setOptionalMetadata] = useState<Record<string, string[]>>({});

  // Search state
  const [query, setQuery] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [selectedRow, setSelectedRow] = useState<CatalogEntry | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);
  const [highlightFieldPath, setHighlightFieldPath] = useState<string | undefined>(undefined);
  const [shakeButton, setShakeButton] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

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
    const urlQuery = urlParams.get('q') || '';
    const urlRegex = urlParams.get('regex') === 'true';
    const urlHighlight = urlParams.get('highlight') || undefined;

    // Set state
    setContextId(urlContextId);
    setRequiredMetadata(metadata);
    setQuery(urlQuery);
    setIsRegex(urlRegex);
    setHighlightFieldPath(urlHighlight);
    setInitializedFromUrl(true);

    // Check if we have enough to auto-search
    const allFilled = context.requiredMetadata.every(key => metadata[key]?.trim());
    if (allFilled) {
      // Auto-trigger search after state is set
      setHasSearched(true);
      setSearchParams({
        q: urlQuery,
        contextId: urlContextId,
        metadata: Object.fromEntries(
          Object.entries(metadata).map(([k, v]) => [k, [v]])
        ),
        useRegex: urlRegex
      });
    }
  }, [urlParams, contexts, initializedFromUrl]);

  // Update URL when search is executed
  const updateUrlParams = useCallback((
    searchContextId: string,
    searchMetadata: Record<string, string>,
    searchQuery: string,
    searchIsRegex: boolean
  ) => {
    const params = new URLSearchParams();
    params.set('contextId', searchContextId);

    // Add metadata with meta_ prefix
    Object.entries(searchMetadata).forEach(([key, value]) => {
      if (value?.trim()) {
        params.set(`meta_${key}`, value);
      }
    });

    // Add optional params
    if (searchQuery) {
      params.set('q', searchQuery);
    }
    if (searchIsRegex) {
      params.set('regex', 'true');
    }

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

  // Suggestions for field paths (enabled in string mode, only when dropdown visible)
  const { suggestions } = useSuggest(
    'fieldPath',
    query,
    contextId || undefined,
    undefined,
    showSuggestions && !isRegex && searchEnabled
  );

  // Reset selection when suggestions change
  React.useEffect(() => {
    setSuggestionIndex(-1);
  }, [suggestions]);

  // State for the actual search being executed
  const [searchParams, setSearchParams] = useState({
    q: '',
    contextId: '',
    metadata: {} as Record<string, string[]>,
    useRegex: false
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
    q: searchParams.q || undefined,
    contextId: searchParams.contextId || undefined,
    metadata: Object.keys(searchParams.metadata).length > 0 ? searchParams.metadata : undefined,
    useRegex: searchParams.useRegex,
    size: config.MAX_RESULTS_PER_PAGE
  }, hasSearched && searchEnabled, 'search');

  const handleContextChange = (newContextId: string) => {
    setContextId(newContextId);
    setRequiredMetadata({}); // Reset metadata when context changes
    setOptionalMetadata({});
    setHasSearched(false);
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
      q: query,
      contextId: contextId,
      metadata: metadataForApi,
      useRegex: isRegex
    });
    setShowSuggestions(false);

    // Update URL for bookmarking/sharing
    updateUrlParams(contextId, requiredMetadata, query, isRegex);
  };

  const suggestionsRef = React.useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionIndex(prev => {
        const next = Math.min(prev + 1, suggestions.length - 1);
        scrollSuggestionIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionIndex(prev => {
        const next = Math.max(prev - 1, -1);
        scrollSuggestionIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      if (suggestionIndex >= 0) {
        e.preventDefault();
        const selected = suggestions[suggestionIndex];
        if (selected) {
          setQuery(selected);
          setSuggestionIndex(-1);
        }
      }
    } else if (e.key === 'Tab') {
      if (suggestionIndex >= 0) {
        e.preventDefault();
        const selected = suggestions[suggestionIndex];
        if (selected) {
          const matchIndex = selected.toLowerCase().indexOf(query.toLowerCase());
          if (matchIndex !== -1) {
            const partial = selected.substring(0, matchIndex + query.length);
            setQuery(partial);
          } else {
            setQuery(selected);
          }
        }
      }
    }
  };

  const scrollSuggestionIntoView = (index: number) => {
    if (suggestionsRef.current) {
      const suggestionElements = suggestionsRef.current.children;
      if (suggestionElements[index]) {
        suggestionElements[index].scrollIntoView({ block: 'nearest' });
      }
    }
  };

  // Results (no client-side filtering since we're searching exact FieldKey)
  const results = data?.content || [];

  // Shared layout constants - title takes fixed width, controls fill the rest
  const TITLE_WIDTH = 'w-56'; // 224px - consistent across all search pages
  const ROW_GAP = 'gap-6';    // 24px - consistent gap between title and controls

  return (
    <Layout>
      <div className="bg-paper p-6 shrink-0 shadow-header relative z-30">
        {/* Row 1: Title + Primary Controls (Context, Required Metadata, Search Button) */}
        <div className={`flex items-center ${ROW_GAP}`}>
          <div className={`${TITLE_WIDTH} shrink-0`}>
            <h1 className="text-2xl font-black text-ink uppercase tracking-tight">Schema Search</h1>
            <p className="text-slate-500 text-sm font-medium">Generate exact schemas</p>
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

        {/* Row 2: Optional Filters - uses same column structure for alignment */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            searchEnabled ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className={`flex ${ROW_GAP} mt-4 pt-4 border-t border-steel/50`}>
            <div className={`${TITLE_WIDTH} shrink-0`} /> {/* Empty spacer for alignment */}
            <div className="flex-1">
              {/* Optional Section Header */}
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-3 h-3 text-ceremony" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Metadata Filters for {selectedContext?.displayName}
                  <span className="text-slate-400 font-bold ml-2">(optional)</span>
                </h3>
              </div>

              {/* Optional Metadata Filters */}
              {selectedContext && selectedContext.optionalMetadata.length > 0 && (
                <div className="mb-3">
                  <OptionalMetadataFilters
                    context={selectedContext}
                    values={optionalMetadata}
                    onChange={handleOptionalMetadataChange}
                    requiredMetadata={requiredMetadata}
                  />
                </div>
              )}

              {/* Field Path Filter */}
              <div className="flex gap-3 items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Filter by field path..."
                    className="w-full bg-white border border-steel rounded px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ceremony/20 focus:border-ceremony transition-all font-medium font-mono"
                  />

                  {showSuggestions && !isRegex && query.length > 0 && suggestions.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-steel rounded-md shadow-2xl max-h-64 overflow-y-auto"
                    >
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={suggestion}
                          type="button"
                          className={`w-full text-left px-4 py-2 text-xs transition-colors font-mono border-b border-steel/50 last:border-0 ${
                            index === suggestionIndex ? 'bg-ceremony/10 text-ceremony font-bold' : 'hover:bg-paper'
                          }`}
                          onClick={() => {
                            setQuery(suggestion);
                            setShowSuggestions(false);
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <ModeToggle isRegex={isRegex} onToggle={setIsRegex} />
              </div>
            </div>
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
                title="Schema Search"
                description={
                  contextId
                    ? "Complete the required metadata above, then search to generate an exact schema."
                    : "Select a context to begin. You'll need to fill in required metadata to search for an exact schema."
                }
                className="flex-1"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {error && <ErrorBanner title="Search Failed" error={error} />}

              {/* Results Header with Export Buttons */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-steel/50 bg-paper">
                <div className="text-xs font-bold text-slate-500">
                  {isLoading ? 'Searching...' : `${results.length} fields`}
                  {data && data.totalElements > data.size && (
                    <span className="text-amber-600 ml-2">
                      (showing {data.size} of {data.totalElements})
                    </span>
                  )}
                </div>
                <SchemaExportButtons
                  entries={results}
                  contextId={contextId}
                  metadata={requiredMetadata}
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
                  query={query}
                  highlightFieldPath={highlightFieldPath}
                />
              </div>
            </div>
          )}

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

export default FieldSearchPage;
