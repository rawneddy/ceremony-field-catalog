import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSuggest } from '../../hooks/useSuggest';

interface TagInputProps {
  field: string;
  values: string[];
  onChange: (values: string[]) => void;
  contextId?: string;
  /** Already-selected metadata for cascading filter constraints */
  metadata?: Record<string, string>;
  placeholder?: string;
  disabled?: boolean;
  maxValues?: number; // Set to 1 for single-select mode
  /** Disable auto-advance to next input after selection (default: false) */
  disableAutoAdvance?: boolean;
  className?: string;
}

const TagInput: React.FC<TagInputProps> = ({
  field,
  values,
  onChange,
  contextId,
  metadata,
  placeholder = 'Type to search...',
  disabled = false,
  maxValues,
  disableAutoAdvance = false,
  className = ''
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions when focused, constrained by already-selected metadata
  const { suggestions } = useSuggest(field, inputValue, contextId, metadata, isFocused);

  // Calculate dropdown position using fixed positioning to escape overflow containers
  useEffect(() => {
    if (isFocused && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < 200 && spaceAbove > spaceBelow;

      setDropdownStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        maxHeight: 192, // max-h-48 = 12rem = 192px
        ...(openUpward
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 })
      });
    }
  }, [isFocused]);

  // Filter out already-selected values from suggestions
  const availableSuggestions = suggestions.filter(s => !values.includes(s));

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [availableSuggestions.length, inputValue]);

  const handleAddTag = (value: string) => {
    if (!values.includes(value)) {
      // If maxValues is set and we're at limit, replace the last value
      if (maxValues && values.length >= maxValues) {
        onChange([...values.slice(0, maxValues - 1), value]);
      } else {
        onChange([...values, value]);
      }
    }
    setInputValue('');
    setSelectedIndex(-1);

    // For single-select mode, auto-advance to next input (unless disabled)
    if (maxValues === 1 && !disableAutoAdvance) {
      setIsFocused(false);

      // Find and focus the next focusable input
      // Use setTimeout to let React update the DOM first
      setTimeout(() => {
        if (containerRef.current) {
          // Get all TagInput containers, then find their inputs
          const allContainers = Array.from(document.querySelectorAll('[data-tag-input]'));
          const currentContainerIndex = allContainers.indexOf(containerRef.current);

          // Look for the next container that has a visible input
          for (let i = currentContainerIndex + 1; i < allContainers.length; i++) {
            const container = allContainers[i];
            if (container) {
              const nextInput = container.querySelector('input:not([disabled])');
              if (nextInput instanceof HTMLInputElement) {
                nextInput.focus();
                break;
              }
            }
          }
        }
      }, 10);
    }
  };

  const handleRemoveTag = (valueToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering focus
    e.preventDefault();
    onChange(values.filter(v => v !== valueToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (availableSuggestions.length > 0) {
        setSelectedIndex(prev => {
          const next = Math.min(prev + 1, availableSuggestions.length - 1);
          scrollSuggestionIntoView(next);
          return next;
        });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (availableSuggestions.length > 0) {
        setSelectedIndex(prev => {
          const next = Math.max(prev - 1, -1);
          scrollSuggestionIntoView(next);
          return next;
        });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && availableSuggestions[selectedIndex]) {
        handleAddTag(availableSuggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    } else if (e.key === 'Backspace' && inputValue === '' && values.length > 0) {
      // Remove last tag when backspace on empty input
      onChange(values.slice(0, -1));
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

  const handleContainerClick = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  // Check if we should hide the input (maxValues reached)
  const hideInput = maxValues && values.length >= maxValues;

  return (
    <div ref={containerRef} data-tag-input className={`relative ${className}`}>
      {/* Tags Container */}
      <div
        className={`flex flex-wrap items-center gap-1 px-2 py-1.5 bg-white border rounded min-h-[42px] cursor-text transition-colors
          ${isFocused ? 'border-ceremony ring-1 ring-ceremony/20' : 'border-steel'}
          ${disabled ? 'bg-slate-50 cursor-not-allowed' : ''}`}
        onClick={handleContainerClick}
      >
        {/* Chips */}
        {values.map(value => (
          <span
            key={value}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-ceremony/10 text-ceremony text-xs rounded font-medium"
          >
            <span className="truncate max-w-[150px]">{value}</span>
            <button
              type="button"
              onClick={(e) => handleRemoveTag(value, e)}
              onMouseDown={(e) => e.preventDefault()} // Prevent blur
              className="hover:bg-ceremony/20 rounded-full p-0.5 transition-colors flex-shrink-0"
              disabled={disabled}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Input */}
        {!hideInput && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder={values.length === 0 ? placeholder : ''}
            disabled={disabled}
            className="flex-1 min-w-[60px] outline-none text-sm font-medium bg-transparent"
          />
        )}
      </div>

      {/* Suggestions Dropdown - uses fixed positioning to escape overflow containers */}
      {isFocused && availableSuggestions.length > 0 && !hideInput && (
        <div
          ref={suggestionsRef}
          style={dropdownStyle}
          className="z-[100] bg-white border border-steel rounded-md shadow-xl overflow-y-auto"
        >
          {availableSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              className={`w-full text-left px-3 py-2 text-xs transition-colors font-medium border-b border-steel/50 last:border-0 ${
                index === selectedIndex
                  ? 'bg-ceremony/10 text-ceremony font-bold'
                  : 'hover:bg-paper'
              }`}
              onClick={() => handleAddTag(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              onMouseDown={(e) => e.preventDefault()} // Prevent blur
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagInput;
