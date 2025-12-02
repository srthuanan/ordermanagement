import React, { useState, useRef, useEffect, useMemo } from 'react';

// FIX: Added and exported DropdownFilterConfig interface to be used by other components.
export interface DropdownFilterConfig {
  id: string;
  key: string;
  label: string;
  options: string[];
  icon: string;
  displayMode?: 'count' | 'selection';
}

interface MultiSelectDropdownProps {
  id: string;
  label: string;
  options: string[];
  selectedOptions: string[];
  onChange: (selected: string[]) => void;
  icon: string;
  displayMode?: 'count' | 'selection';
  size?: 'default' | 'compact';
  variant?: 'default' | 'modern';
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ label, options, selectedOptions, onChange, icon, displayMode = 'count', size = 'default', variant = 'default' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option && option.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
      searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    )
  );

  const handleOptionToggle = (option: string) => {
    const newSelected = selectedOptions.includes(option)
      ? selectedOptions.filter(item => item !== option)
      : [...selectedOptions, option];
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    // Select only the currently filtered options
    onChange(Array.from(new Set([...selectedOptions, ...filteredOptions])));
  };

  const handleClearAll = () => {
    onChange([]);
  }

  const handleClearFiltered = () => {
    onChange(selectedOptions.filter(opt => !filteredOptions.includes(opt)));
  }

  const displayLabel = useMemo(() => {
    if (selectedOptions.length === 0) return label;

    if (displayMode === 'selection') {
      if (selectedOptions.length <= 2) return selectedOptions.join(', ');
      return `${selectedOptions.length} lựa chọn`;
    }

    // default 'count' mode
    return `${label} (${selectedOptions.length})`;
  }, [selectedOptions, label, displayMode]);

  const isCompact = size === 'compact';
  const areAllFilteredSelected = filteredOptions.length > 0 && filteredOptions.every(opt => selectedOptions.includes(opt));

  const buttonClasses = useMemo(() => {
    if (variant === 'modern') {
      const base = 'flex-shrink-0 flex items-center justify-between transition-all duration-200 border';
      const sizeClass = isCompact ? 'w-28 px-3 h-8 text-xs rounded-full flex-shrink' : 'w-40 px-4 h-9 text-sm rounded-full';
      const activeState = isOpen || selectedOptions.length > 0
        ? 'bg-accent-primary/10 border-accent-primary text-accent-primary shadow-sm'
        : 'bg-white border-border-secondary text-text-secondary hover:border-accent-primary/50 hover:text-text-primary shadow-sm';
      return `${base} ${sizeClass} ${activeState}`;
    }

    const base = 'btn-filter justify-between';
    const sizeClass = isCompact ? 'px-3 h-9 text-xs' : 'w-full pl-3 pr-2.5 text-sm md:w-52 h-11 !rounded-lg';
    const activeState = isOpen || selectedOptions.length > 0 ? 'active' : '';
    return `${base} ${sizeClass} ${activeState}`;
  }, [isCompact, isOpen, selectedOptions.length, variant]);


  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClasses}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <i className={`fas ${icon} text-text-placeholder text-xs`}></i>
          <span className={`truncate ${selectedOptions.length > 0 ? 'font-semibold' : ''}`}>{displayLabel}</span>
        </div>
        <i className={`fas fa-chevron-down text-text-placeholder text-xs transition-transform duration-200 ml-2 ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-72 bg-surface-card border border-border-secondary rounded-lg shadow-lg z-20 animate-fade-in-down flex flex-col" style={{ animationDuration: '0.2s' }}>
          <div className="p-2 border-b border-border-primary">
            <div className="relative">
              <i className="fas fa-search absolute top-1/2 left-3 -translate-y-1/2 text-text-placeholder text-sm"></i>
              <input
                type="text"
                placeholder="Tìm kiếm..."
                autoFocus
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface-input text-text-primary border border-border-primary rounded-md focus:outline-none focus:border-accent-primary transition-shadow futuristic-input"
              />
            </div>
          </div>
          <ul className="flex-grow max-h-60 overflow-y-auto p-1">
            <li key="select-all">
              <label className="flex items-center gap-3 w-full px-2 py-2 text-sm font-medium text-text-primary rounded-md hover:bg-surface-hover cursor-pointer">
                <input
                  type="checkbox"
                  checked={areAllFilteredSelected}
                  onChange={() => areAllFilteredSelected ? handleClearFiltered() : handleSelectAll()}
                  className="custom-checkbox"
                />
                <span className="font-semibold italic">{areAllFilteredSelected ? 'Bỏ chọn tất cả (đã lọc)' : 'Chọn tất cả (đã lọc)'}</span>
              </label>
            </li>
            <div className="h-px bg-border-primary my-1"></div>
            {filteredOptions.length > 0 ? filteredOptions.map(option => (
              <li key={option}>
                <label className="flex items-center gap-3 w-full px-2 py-2 text-sm font-medium text-text-primary rounded-md hover:bg-surface-hover cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option)}
                    onChange={() => handleOptionToggle(option)}
                    className="custom-checkbox"
                  />
                  <span>{option}</span>
                </label>
              </li>
            )) : (
              <li className="px-2 py-2 text-sm text-text-secondary text-center">Không có kết quả.</li>
            )}
          </ul>
          <div className="p-2 border-t border-border-primary flex justify-between">
            <button onClick={handleClearAll} className="text-xs font-semibold text-danger hover:underline">Xóa tất cả</button>
            <button onClick={() => setIsOpen(false)} className="px-3 py-1 bg-accent-primary text-white text-xs font-bold rounded-md hover:bg-accent-primary-hover">Áp dụng</button>
          </div>
        </div>
      )}
    </div>
  );
};
export default MultiSelectDropdown;