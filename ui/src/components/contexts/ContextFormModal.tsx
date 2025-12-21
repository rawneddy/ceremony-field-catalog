import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { AlertTriangle, Check } from 'lucide-react';
import { useContextMutations } from '../../hooks/useContextMutations';
import type { Context, MetadataExtractionRule } from '../../types';

interface ContextFormData {
  contextId: string;
  displayName: string;
  description: string;
  active: boolean;
  requiredMetadata: string;
  optionalMetadata: string;
  metadataRules: Record<string, MetadataExtractionRule>;
}

interface ContextFormModalProps {
  context: Context | null;
  onClose: () => void;
}

const isValidRegex = (pattern: string): boolean => {
  if (!pattern) return true;
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
};

const ContextFormModal: React.FC<ContextFormModalProps> = ({ context, onClose }) => {
  const { createContext, updateContext, isCreating, isUpdating } = useContextMutations();
  const isEditing = !!context;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContextFormData>({
    defaultValues: {
      contextId: context?.contextId || '',
      displayName: context?.displayName || '',
      description: context?.description || '',
      active: context?.active ?? true,
      requiredMetadata: context?.requiredMetadata.join(', ') || '',
      optionalMetadata: context?.optionalMetadata?.join(', ') || '',
      metadataRules: context?.metadataRules || {},
    },
  });

  const requiredMetadata = watch('requiredMetadata');
  const optionalMetadata = watch('optionalMetadata');
  const metadataRules = watch('metadataRules');

  // Get all metadata fields for the rules section
  const allMetadataFields = [
    ...requiredMetadata.split(',').map((s) => s.trim()).filter(Boolean),
    ...optionalMetadata.split(',').map((s) => s.trim()).filter(Boolean),
  ];

  const onSubmit = async (data: ContextFormData) => {
    // Validate all regex patterns before submit
    const invalidRegexFields = Object.entries(data.metadataRules)
      .filter(([_, rule]) => rule.validationRegex && !isValidRegex(rule.validationRegex))
      .map(([field]) => field);

    if (invalidRegexFields.length > 0) {
      toast.error(`Invalid regex patterns in: ${invalidRegexFields.join(', ')}`);
      return;
    }

    const payload = {
      ...data,
      requiredMetadata: data.requiredMetadata.split(',').map((s) => s.trim()).filter(Boolean),
      optionalMetadata: data.optionalMetadata.split(',').map((s) => s.trim()).filter(Boolean),
      metadataRules: data.metadataRules,
    };

    try {
      if (isEditing) {
        await updateContext({ id: context.contextId, context: payload });
        toast.success(`Context "${data.displayName}" updated successfully`);
      } else {
        await createContext(payload);
        toast.success(`Context "${data.displayName}" created successfully`);
      }
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error occurred';
      toast.error(`Failed to save context: ${message}`);
    }
  };

  const updateRule = (field: string, updates: Partial<MetadataExtractionRule>) => {
    const currentRules = metadataRules || {};
    const existingRule = currentRules[field] || { xpaths: [] };
    setValue('metadataRules', {
      ...currentRules,
      [field]: {
        xpaths: existingRule.xpaths || [],
        ...updates,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-ink/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="p-6 border-b border-steel bg-paper shrink-0">
            <h2 className="text-xl font-black uppercase tracking-tight">
              {isEditing ? 'Edit Context' : 'Create New Context'}
            </h2>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Context ID */}
            <div>
              <label
                htmlFor="contextId"
                className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1"
              >
                Context ID
              </label>
              <input
                id="contextId"
                {...register('contextId', { required: 'Context ID is required' })}
                disabled={isEditing}
                className="w-full bg-paper border border-steel rounded px-3 py-2 text-sm font-bold focus:outline-none focus:border-ceremony disabled:opacity-50"
                placeholder="e.g. deposits"
              />
              {errors.contextId && (
                <p className="text-[10px] text-error-500 mt-1 font-bold">{errors.contextId.message}</p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label
                htmlFor="displayName"
                className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1"
              >
                Display Name
              </label>
              <input
                id="displayName"
                {...register('displayName', { required: 'Display name is required' })}
                className="w-full bg-paper border border-steel rounded px-3 py-2 text-sm font-bold focus:outline-none focus:border-ceremony"
                placeholder="e.g. Deposit Accounts"
              />
              {errors.displayName && (
                <p className="text-[10px] text-error-500 mt-1 font-bold">{errors.displayName.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                {...register('description')}
                className="w-full bg-paper border border-steel rounded px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:border-ceremony"
                placeholder="Describe the purpose of this context..."
              />
            </div>

            {/* Metadata Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="requiredMetadata"
                  className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1"
                >
                  Required Metadata (comma sep)
                </label>
                <input
                  id="requiredMetadata"
                  {...register('requiredMetadata')}
                  disabled={isEditing}
                  className="w-full bg-paper border border-steel rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-ceremony disabled:opacity-50"
                />
              </div>
              <div>
                <label
                  htmlFor="optionalMetadata"
                  className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1"
                >
                  Optional Metadata (comma sep)
                </label>
                <input
                  id="optionalMetadata"
                  {...register('optionalMetadata')}
                  className="w-full bg-paper border border-steel rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-ceremony"
                />
              </div>
            </div>

            {/* Auto-Extraction Rules */}
            <div className="border-t border-steel pt-4 mt-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                Auto-Extraction Rules
              </h3>
              <p className="text-[10px] text-slate-400 mb-4">
                Define prioritized XPaths to automatically extract metadata values from uploaded XML
                files. Optionally add a Regex to validate the extracted value.
              </p>

              {allMetadataFields.map((field) => (
                <MetadataRuleEditor
                  key={field}
                  field={field}
                  rule={metadataRules[field]}
                  onUpdate={(updates) => updateRule(field, updates)}
                />
              ))}

              {allMetadataFields.length === 0 && (
                <div className="text-xs text-slate-400 italic text-center py-2">
                  Add metadata fields above to configure extraction rules.
                </div>
              )}
            </div>

            {/* Active Toggle */}
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="w-5 h-5 rounded accent-ceremony"
                  />
                  <span className="text-sm font-bold text-ink uppercase tracking-tight">
                    Active Observation Point
                  </span>
                </label>
              )}
            />
          </div>

          <div className="p-6 border-t border-steel bg-paper flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCreating || isUpdating}
              className="bg-ink text-paper px-8 py-2 rounded text-xs font-black uppercase tracking-widest hover:bg-charcoal transition-all disabled:opacity-50"
            >
              {isSubmitting || isCreating || isUpdating ? 'Saving...' : 'Save Context'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface MetadataRuleEditorProps {
  field: string;
  rule?: MetadataExtractionRule;
  onUpdate: (updates: Partial<MetadataExtractionRule>) => void;
}

const MetadataRuleEditor: React.FC<MetadataRuleEditorProps> = ({ field, rule, onUpdate }) => {
  const xpathsValue = rule?.xpaths?.join(', ') || '';
  const regexValue = rule?.validationRegex || '';
  const regexIsValid = isValidRegex(regexValue);

  return (
    <div className="mb-4 bg-slate-50 p-3 rounded border border-steel">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-ink">{field}</span>
      </div>

      <div className="space-y-2">
        <div>
          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">
            XPaths (comma separated, priority order)
          </label>
          <input
            value={xpathsValue}
            onChange={(e) => {
              const xpaths = e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
              onUpdate({ xpaths });
            }}
            className="w-full bg-white border border-steel rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-ceremony"
            placeholder="/Root/Element/Path, /Another/Path"
          />
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">
            Validation Regex (Optional)
          </label>
          <div className="relative">
            <input
              value={regexValue}
              onChange={(e) => onUpdate({ validationRegex: e.target.value })}
              className={`w-full border rounded px-2 py-1.5 text-xs font-mono focus:outline-none transition-colors ${
                !regexIsValid
                  ? 'border-error-500 bg-error-50 focus:border-error-600'
                  : regexValue
                  ? 'border-mint bg-mint/5 focus:border-ceremony'
                  : 'border-steel bg-white focus:border-ceremony'
              }`}
              placeholder="e.g. ^[A-Z]{3}$"
            />
            {!regexIsValid && (
              <AlertTriangle className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-error-500" />
            )}
            {regexIsValid && regexValue && (
              <Check className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-success-700" />
            )}
          </div>
          {!regexIsValid && (
            <p className="text-[9px] text-error-500 mt-1 font-bold">Invalid Regular Expression</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContextFormModal;
