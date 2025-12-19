import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import FieldTable from '../components/search/FieldTable';
import FacetSidebar from '../components/search/FacetSidebar';
import FieldDetailPanel from '../components/search/FieldDetailPanel';
import TruncationWarning from '../components/search/TruncationWarning';
import { useFieldSearch } from '../hooks/useFieldSearch';
import { useFacets } from '../hooks/useFacets';
import { useSuggest } from '../hooks/useSuggest';
import type { CatalogEntry } from '../types';

const FieldSearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [selectedRow, setSelectedRow] = useState<CatalogEntry | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Suggestions for field paths (enabled in string mode)
  const suggestions = useSuggest('fieldPath', query, undefined);

  // State for the actual search being executed
  const [searchParams, setSearchParams] = useState({
    q: '',
    useRegex: false
  });

  const { data, isLoading, error } = useFieldSearch({
    q: searchParams.q || undefined,
    useRegex: searchParams.useRegex,
    size: 250
  }, hasSearched);

  const {
    facets,
    filteredResults,
    setFacetMode,
    toggleFacetValue,
    clearFacet,
    clearAllFacets
  } = useFacets(data?.content);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    setSearchParams({
      q: query,
      useRegex: isRegex
    });
  };

  return (
    <Layout>
      <div className="bg-paper border-b border-steel p-6 shrink-0">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSearch} className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Search field paths... (e.g. /Ceremony/Account or Account)"
                  className="w-full bg-white border border-steel rounded px-10 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-ceremony/20 focus:border-ceremony transition-all font-medium"
                />

                {showSuggestions && !isRegex && query.length > 0 && suggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-steel rounded-md shadow-2xl max-h-64 overflow-y-auto">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="w-full text-left px-4 py-3 text-sm hover:bg-paper transition-colors font-mono border-b border-steel/50 last:border-0"
                        onClick={() => {
                          setQuery(suggestion);
                          setShowSuggestions(false);
                          setHasSearched(true);
                          setSearchParams({ q: suggestion, useRegex: isRegex });
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center bg-white border border-steel rounded px-1 px-1">
                <button
                  type="button"
                  onClick={() => setIsRegex(false)}
                  className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${!isRegex ? 'bg-ink text-paper' : 'text-slate-400 hover:text-ink'}`}
                >
                  String
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegex(true)}
                  className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${isRegex ? 'bg-ink text-paper' : 'text-slate-400 hover:text-ink'}`}
                >
                  Regex
                </button>
              </div>
              <button
                type="submit"
                className="bg-ceremony text-paper px-8 py-3 rounded font-bold hover:bg-blue-700 transition-colors shadow-sm"
              >
                Search
              </button>
            </div>
            
            <div className="mt-2 flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-1.5 text-slate-500">
                {isRegex ? (
                  <span>Regex pattern matching enabled</span>
                ) : (
                  <span>String contains matching on field paths</span>
                )}
              </div>
              <Link to="/search" className="text-ceremony hover:underline flex items-center gap-1">
                Switch to Discovery Engine →
              </Link>
            </div>
          </form>
        </div>
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
          {error && (
            <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-center gap-3">
              <div className="bg-red-100 p-1.5 rounded-full">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-black uppercase tracking-tight">Search Failed</div>
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
              query={query}
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

export default FieldSearchPage;