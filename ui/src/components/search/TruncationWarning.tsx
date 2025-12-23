import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface TruncationWarningProps {
  total: number;
  displayed: number;
  /** Optional: for Discovery page, show unique field count */
  fieldCount?: number;
}

const TruncationWarning: React.FC<TruncationWarningProps> = ({
  total,
  displayed,
  fieldCount
}) => {
  return (
    <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-center gap-4 px-6">
      <div className="bg-amber-100 p-2 rounded-full">
        <AlertTriangle className="w-5 h-5 text-amber-600" />
      </div>
      <div>
        <div className="text-sm font-black text-amber-900 uppercase tracking-tight">
          Results Truncated
        </div>
        <div className="text-sm text-amber-700">
          {fieldCount !== undefined ? (
            <>
              <span className="font-bold">{fieldCount.toLocaleString()} unique field paths</span> loaded
              from {displayed.toLocaleString()} observations.
              {' '}<span className="font-bold">{total.toLocaleString()}</span> total observations exist—refine
              your search to discover more fields.
            </>
          ) : (
            <>
              Showing <span className="font-bold">{displayed.toLocaleString()}</span> of{' '}
              <span className="font-bold">{total.toLocaleString()}</span> results.
              Please refine your search to see more specific matches.
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TruncationWarning;
