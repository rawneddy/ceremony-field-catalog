import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/layout/ErrorBoundary';
import QuickSearchPage from './pages/QuickSearchPage';
import AdvancedSearchPage from './pages/AdvancedSearchPage';
import ContextsPage from './pages/ContextsPage';
import UploadPage from './pages/UploadPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<QuickSearchPage />} />
            <Route path="/search" element={<AdvancedSearchPage />} />
            <Route path="/contexts" element={<ContextsPage />} />
            <Route path="/upload" element={<UploadPage />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;