import React from 'react';
import { Search } from 'lucide-react';
import type { AxiosError } from 'axios';
import type { ErrorResponse } from '../../types';

interface ErrorBannerProps {
  title: string;
  error: Error | AxiosError<ErrorResponse>;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ title, error }) => {
  const message = isAxiosError(error)
    ? error.response?.data?.message || error.message
    : error.message;

  return (
    <div className="m-6 p-4 bg-error-50 border border-error-200 rounded-md text-error-700 flex items-center gap-3">
      <div className="bg-error-100 p-1.5 rounded-full">
        <Search className="w-4 h-4" />
      </div>
      <div>
        <div className="text-sm font-black uppercase tracking-tight">{title}</div>
        <div className="text-xs">{message}</div>
      </div>
    </div>
  );
};

function isAxiosError(error: unknown): error is AxiosError<ErrorResponse> {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

export default ErrorBanner;
