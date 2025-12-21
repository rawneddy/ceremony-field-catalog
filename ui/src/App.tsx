import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/layout/ErrorBoundary';
import DiscoverFieldsPage from './pages/DiscoverFieldsPage';
import ExploreSchemaPage from './pages/ExploreSchemaPage';
import SubmitDataPage from './pages/SubmitDataPage';
import ManageContextsPage from './pages/ManageContextsPage';
import SystemHealthPage from './pages/SystemHealthPage';

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
            <Route path="/" element={<DiscoverFieldsPage />} />
            <Route path="/schema" element={<ExploreSchemaPage />} />
            <Route path="/submit" element={<SubmitDataPage />} />
            <Route path="/contexts" element={<ManageContextsPage />} />
            <Route path="/system" element={<SystemHealthPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-charcoal)',
              color: 'var(--color-paper)',
              border: '1px solid var(--color-steel)',
            },
          }}
        />
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;