import React, { useState, useRef, useEffect } from 'react';
import { useSuggest } from '../../hooks/useSuggest';

interface SuggestionInputProps {
  field: string;
  value: string;
  onChange: (value: string) => void;
  contextId?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  autoExtracted?: boolean;
  onEditAutoExtracted?: () => void;
}

const SuggestionInput: React.FC<SuggestionInputProps> = ({
  field,
  value,
  onChange,
  contextId,
  placeholder,
  className = '',
  inputClassName = '',
  disabled = false,
  autoExtracted = false,
  onEditAutoExtracted
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const showDropdown = isFocused && (!autoExtracted || isEditing);
  const { suggestions } = useSuggest(field, value, contextId, undefined, showDropdown);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  const handleFocus = () => {
    setIsFocused(true);
    if (autoExtracted && !isEditing) {
      // Don't show dropdown for auto-extracted until edit mode
    }
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setIsFocused(false);
      if (autoExtracted) {
        setIsEditing(false);
      }
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => {
        const next = Math.min(prev + 1, suggestions.length - 1);
        scrollSuggestionIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => {
        const next = Math.max(prev - 1, -1);
        scrollSuggestionIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        e.preventDefault();
        onChange(suggestions[selectedIndex]);
        setIsFocused(false);
        inputRef.current?.blur();
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const scrollSuggestionIntoView = (index: number) => {
    if (suggestionsRef.current) {
      const children = suggestionsRef.current.children;
      if (children[index]) {
        children[index].scrollIntoView({ block: 'nearest' });
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setIsFocused(false);
  };

  const handleEditClick = () => {
    setIsEditing(true);
    onEditAutoExtracted?.();
    inputRef.current?.focus();
  };

  // Auto-extracted cell styling
  if (autoExtracted && !isEditing) {
    return (
      <div className={`relative group ${className}`}>
        <div
          className="w-full bg-ceremony/5 border border-ceremony/20 rounded px-3 py-1.5 text-xs font-medium text-ink cursor-pointer hover:bg-ceremony/10 transition-colors flex items-center justify-between"
          onClick={handleEditClick}
        >
          <span className="truncate">{value || '-'}</span>
          <span className="text-[9px] text-ceremony opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            Edit
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full bg-white border border-steel rounded px-3 py-1.5 text-xs focus:outline-none focus:border-ceremony focus:ring-1 focus:ring-ceremony/20 font-medium disabled:bg-slate-50 disabled:text-slate-400 ${inputClassName}`}
      />

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-steel rounded-md shadow-xl max-h-48 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              className={`w-full text-left px-3 py-2 text-xs transition-colors font-medium border-b border-steel/50 last:border-0 ${
                index === selectedIndex
                  ? 'bg-ceremony/10 text-ceremony font-bold'
                  : 'hover:bg-paper'
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuggestionInput;
