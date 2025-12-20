import React from 'react';

interface ModeToggleProps {
  isRegex: boolean;
  onToggle: (isRegex: boolean) => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ isRegex, onToggle }) => {
  return (
    <div className="flex items-center bg-white border border-steel rounded px-1 shrink-0">
      <button
        type="button"
        onClick={() => onToggle(false)}
        className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
          !isRegex ? 'bg-ink text-paper' : 'text-slate-400 hover:text-ink'
        }`}
      >
        String
      </button>
      <button
        type="button"
        onClick={() => onToggle(true)}
        className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
          isRegex ? 'bg-ink text-paper' : 'text-slate-400 hover:text-ink'
        }`}
      >
        Regex
      </button>
    </div>
  );
};

export default ModeToggle;
