import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Info } from 'lucide-react';
import type { DiscoveryReturnState } from './VariantExplorerPanel';

interface DiscoveryReturnBannerProps {
  returnState: DiscoveryReturnState;
  onDismiss: () => void;
}

/**
 * Banner shown on Schema page when user jumped from Discovery.
 * Allows returning to Discovery with preserved state.
 */
const DiscoveryReturnBanner: React.FC<DiscoveryReturnBannerProps> = ({
  returnState,
  onDismiss
}) => {
  const navigate = useNavigate();

  const handleReturn = () => {
    navigate('/', { state: returnState.discoveryState });
  };

  return (
    <div className="bg-sky-50 border-b border-sky-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-sky-100 p-1.5 rounded-full">
          <Info className="w-4 h-4 text-sky-600" />
        </div>
        <div className="text-sm">
          <span className="text-sky-800">Jumped from Discovery</span>
          <span className="mx-2 text-sky-300">|</span>
          <span className="font-mono text-xs text-sky-600 bg-sky-100 px-2 py-0.5 rounded">
            {returnState.fieldPath}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleReturn}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-sky-700 hover:text-sky-900 hover:bg-sky-100 rounded transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Discovery
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 text-sky-400 hover:text-sky-600 hover:bg-sky-100 rounded transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default DiscoveryReturnBanner;
