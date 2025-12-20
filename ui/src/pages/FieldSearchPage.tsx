import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { Search } from 'lucide-react';
import FieldTable from '../components/search/FieldTable';
import FacetSidebar from '../components/search/FacetSidebar';
import FieldDetailPanel from '../components/search/FieldDetailPanel';
import TruncationWarning from '../components/search/TruncationWarning';
import { ModeToggle, ErrorBanner, EmptyState } from '../components/ui';
import { useFieldSearch } from '../hooks/useFieldSearch';
import { useFacets } from '../hooks/useFacets';
import { useSuggest } from '../hooks/useSuggest';
import { config } from '../config';
import type { CatalogEntry } from '../types';

const FieldSearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [selectedRow, setSelectedRow] = useState<CatalogEntry | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);

  // Suggestions for field paths (enabled in string mode)
  const suggestions = useSuggest('fieldPath', query, undefined);

  // Reset selection when suggestions change
  React.useEffect(() => {
    setSuggestionIndex(-1);
  }, [suggestions]);

  // State for the actual search being executed
  const [searchParams, setSearchParams] = useState({
    q: '',
    useRegex: false
  });

  const { data, isLoading, error } = useFieldSearch({
    q: searchParams.q || undefined,
    useRegex: searchParams.useRegex,
    size: config.MAX_RESULTS_PER_PAGE
  }, hasSearched, 'search');

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
    setHasSearched(true);
    setSearchParams({
      q: query,
      useRegex: isRegex
    });
    setShowSuggestions(false);
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
          // Don't search yet - let them refine or hit enter again
          setSuggestionIndex(-1);
        }
      } else {
        // Normal form submit handles the search
      }
    } else if (e.key === 'Tab') {
      if (suggestionIndex >= 0) {
        e.preventDefault();
        const selected = suggestions[suggestionIndex];
        if (selected) {
          // Partial autocomplete: fill up to the end of the match
          const matchIndex = selected.toLowerCase().indexOf(query.toLowerCase());
          if (matchIndex !== -1) {
            const partial = selected.substring(0, matchIndex + query.length);
            setQuery(partial);
          } else {
            // Fallback if match logic is fuzzy or regex-based in future
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

  return (
    <Layout>
      <div className="bg-paper p-6 shrink-0 shadow-header relative z-10">
        <div className="flex items-center gap-8 px-2">
          <div className="w-56 shrink-0">
            <h1 className="text-2xl font-black text-ink uppercase tracking-tight">Field Search</h1>
            <p className="text-slate-500 text-sm font-medium">
              {isRegex ? 'Regex mode' : 'Substring mode'}
            </p>
          </div>
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Search field paths... (e.g. /Ceremony/Account or Account)"
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
                          // Don't auto-search on click either, consistent with keyboard "drill-down"
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <ModeToggle isRegex={isRegex} onToggle={setIsRegex} />
              <button
                type="submit"
                className="bg-ceremony text-paper px-6 py-2.5 rounded text-sm font-bold hover:bg-ceremony-hover transition-colors shadow-sm"
              >
                Search
              </button>
          </form>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-2 bg-gradient-to-b from-black/10 to-transparent shrink-0" />
        <div className="flex-1 flex overflow-hidden">
        {!hasSearched ? (
          <div className="flex-1 flex bg-white">
            <EmptyState
              icon={Search}
              title="Field Search"
              description="Enter an XPath or search term above to explore specific field patterns across the catalog."
              className="flex-1"
            />
          </div>
        ) : (
          <>
            <FacetSidebar
              facets={facets}
              onToggleValue={toggleFacetValue}
              onSetMode={setFacetMode}
              onClearFacet={clearFacet}
              onClearAll={clearAllFacets}
              resultCount={filteredResults.length}
            />

            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {error && <ErrorBanner title="Search Failed" error={error} />}

              {data && data.totalElements > data.size && (
                <TruncationWarning total={data.totalElements} displayed={data.size} />
              )}

              <div className="flex-1 overflow-auto">
                <FieldTable
                  results={filteredResults}
                  isLoading={isLoading}
                  selectedId={selectedRow?.id}
                  onSelectRow={setSelectedRow}
                  query={query}
                />
              </div>
            </div>
          </>
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