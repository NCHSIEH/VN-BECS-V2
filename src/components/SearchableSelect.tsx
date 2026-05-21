import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function SearchableSelect({ options, value, onChange, placeholder, label, className = "" }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    opt.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {label && <label className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest mb-1 block">{label}</label>}
      <div 
        className="w-full bg-clinical-bg border border-clinical-border text-clinical-text rounded p-2 text-sm flex justify-between items-center cursor-pointer hover:border-cyan-400 transition-colors font-mono min-h-[42px]"
        onClick={() => { setIsOpen(!isOpen); setSearchTerm(""); }}
      >
        <span className={selectedOption ? "text-clinical-text" : "text-clinical-muted"}>
          {selectedOption ? selectedOption.label : (placeholder || "Select an option...")}
        </span>
        <ChevronDown size={16} className="text-clinical-muted shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-clinical-bg border border-cyan-900/50 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="p-2 border-b border-clinical-border flex items-center gap-2 bg-clinical-bg">
            <Search size={14} className="text-clinical-muted shrink-0" />
            <input
              autoFocus
              type="text"
              className="w-full bg-transparent border-none outline-none text-clinical-text text-sm font-sans"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <ul className="max-h-48 overflow-y-auto custom-scrollbar p-1">
            {filteredOptions.length === 0 ? (
              <li className="p-3 text-clinical-muted text-sm italic text-center">No results found</li>
            ) : (
              filteredOptions.map((opt) => (
                <li
                  key={opt.value}
                  className={`p-2.5 rounded-md text-sm font-mono cursor-pointer transition-colors ${value === opt.value ? 'bg-cyan-950/40 text-cyan-400 font-bold' : 'text-clinical-text hover:bg-clinical-bg'}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
