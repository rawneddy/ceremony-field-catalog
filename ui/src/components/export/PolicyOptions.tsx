import React from 'react';
import { Info } from 'lucide-react';
import type { SchemaExportPolicy, ContainerCardinalityPolicy, XsdVersion, ExportFormat } from '../../lib/schema/types';
import { CONTAINER_CARDINALITY_OPTIONS, XSD_VERSION_OPTIONS } from '../../lib/schema/types';

interface PolicyOptionsProps {
  policy: SchemaExportPolicy;
  onChange: (policy: SchemaExportPolicy) => void;
  format: ExportFormat;
  xsdVersion: XsdVersion;
  onXsdVersionChange: (version: XsdVersion) => void;
}

interface TooltipProps {
  text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text }) => {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="p-0.5 rounded-full hover:bg-slate-100 transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        <Info className="w-3.5 h-3.5 text-slate-400" />
      </button>
      {isVisible && (
        <div className="absolute z-50 left-6 top-1/2 -translate-y-1/2 w-64 p-2 bg-ink text-paper text-xs rounded shadow-lg">
          {text}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-ink rotate-45" />
        </div>
      )}
    </div>
  );
};

const PolicyOptions: React.FC<PolicyOptionsProps> = ({
  policy,
  onChange,
  format,
  xsdVersion,
  onXsdVersionChange
}) => {
  const handleCardinalityChange = (value: ContainerCardinalityPolicy) => {
    onChange({ ...policy, containerCardinality: value });
  };

  return (
    <div className="space-y-6">
      {/* XSD Version Section - only show for XSD format */}
      {format === 'xsd' && (
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
            XSD Version
          </h3>
          <div className="space-y-2">
            {XSD_VERSION_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-all ${
                  option.disabled
                    ? 'opacity-50 cursor-not-allowed bg-slate-50 border-steel'
                    : xsdVersion === option.value
                    ? 'border-ceremony bg-ceremony/5'
                    : 'border-steel hover:border-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="xsdVersion"
                  value={option.value}
                  checked={xsdVersion === option.value}
                  onChange={() => !option.disabled && onXsdVersionChange(option.value)}
                  disabled={option.disabled}
                  className="mt-0.5 accent-ceremony"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink">{option.label}</span>
                    <span className="text-xs text-slate-500">({option.description})</span>
                  </div>
                  {option.disabled && option.disabledReason && (
                    <p className="text-[10px] text-slate-400 mt-1">{option.disabledReason}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Container Cardinality Section */}
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
          Container Cardinality
        </h3>
        <div className="space-y-2">
          {CONTAINER_CARDINALITY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-all ${
                policy.containerCardinality === option.value
                  ? 'border-ceremony bg-ceremony/5'
                  : 'border-steel hover:border-slate-400'
              }`}
            >
              <input
                type="radio"
                name="containerCardinality"
                value={option.value}
                checked={policy.containerCardinality === option.value}
                onChange={() => handleCardinalityChange(option.value)}
                className="mt-0.5 accent-ceremony"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink">{option.label}</span>
                  <span className="text-xs text-slate-500">{option.description}</span>
                  {option.isDefault && (
                    <span className="text-[9px] font-bold text-ceremony bg-ceremony/10 px-1.5 py-0.5 rounded">
                      Default
                    </span>
                  )}
                  <Tooltip text={option.tooltip} />
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PolicyOptions;
