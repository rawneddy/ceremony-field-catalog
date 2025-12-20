import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/layout/ErrorBoundary';
import DiscoveryPage from './pages/DiscoveryPage';
import FieldSearchPage from './pages/FieldSearchPage';
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
            <Route path="/" element={<DiscoveryPage />} />
            <Route path="/search" element={<FieldSearchPage />} />
            <Route path="/contexts" element={<ContextsPage />} />
            <Route path="/upload" element={<UploadPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              color: '#f8f8f8',
              border: '1px solid #333',
            },
          }}
        />
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;