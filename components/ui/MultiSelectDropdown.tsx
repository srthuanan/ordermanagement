import React, { useState, useRef, useEffect, useMemo } from 'react';
import Button from './Button';

export interface DropdownFilterConfig {
  id: string;
  key: string;
  label: string;
  options: string[];
  icon: string;
  displayMode?: 'count' | 'selection';
  mode?: 'dropdown' | 'chips' | 'inline';
  selectionMode?: 'single' | 'multiple';
  searchable?: boolean;
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
  mode?: 'dropdown' | 'chips' | 'inline';
  selectionMode?: 'single' | 'multiple';
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label, options, selectedOptions, onChange, icon,
  displayMode = 'count', size = 'default', variant = 'default',
  mode = 'dropdown', selectionMode = 'multiple', placeholder, disabled = false,
  searchable = true
}) => {
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
    if (selectionMode === 'single') {
      onChange([option]);
      setIsOpen(false);
    } else {
      const newSelected = selectedOptions.includes(option)
        ? selectedOptions.filter(item => item !== option)
        : [...selectedOptions, option];
      onChange(newSelected);
    }
  };

  const handleSelectAll = () => {
    onChange(Array.from(new Set([...selectedOptions, ...filteredOptions])));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleClearFiltered = () => {
    onChange(selectedOptions.filter(opt => !filteredOptions.includes(opt)));
  };

  const displayLabel = useMemo(() => {
    if (selectedOptions.length === 0) return placeholder || label;

    if (selectionMode === 'single') {
      return selectedOptions[0];
    }

    if (displayMode === 'selection') {
      if (selectedOptions.length <= 2) return selectedOptions.join(', ');
      return `${selectedOptions.length} lựa chọn`;
    }

    return `${label} (${selectedOptions.length})`;
  }, [selectedOptions, label, displayMode, selectionMode, placeholder]);

  const isCompact = size === 'compact';
  const areAllFilteredSelected = selectionMode === 'multiple' && filteredOptions.length > 0 && filteredOptions.every(opt => selectedOptions.includes(opt));

  // --- STYLES ---
  const buttonClasses = useMemo(() => {
    const base = 'flex items-center justify-between transition-all duration-200 border outline-none focus:ring-2 focus:ring-accent-primary/20';
    const rounded = 'rounded-xl'; // More rounded for modern look
    const disabledClass = disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-pointer';

    if (variant === 'modern') {
      const sizeClass = isCompact ? 'px-3 h-8 text-xs' : 'px-4 h-10 text-sm';
      const activeState = !disabled && (isOpen || (selectedOptions.length > 0 && selectionMode === 'multiple'))
        ? 'bg-accent-primary/5 border-accent-primary text-accent-primary shadow-sm'
        : 'bg-white border-gray-200 text-gray-600 hover:border-accent-primary/50 hover:text-gray-900 hover:shadow-sm';
      return `${base} ${rounded} ${sizeClass} ${activeState} ${disabledClass} w-full md:w-auto min-w-[160px]`;
    }

    // Default variant
    const sizeClass = isCompact ? 'px-3 h-9 text-xs' : 'px-4 h-11 text-sm';
    const activeState = !disabled && (isOpen || (selectedOptions.length > 0 && selectionMode === 'multiple'))
      ? 'bg-white border-accent-primary text-accent-primary ring-1 ring-accent-primary/10'
      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50';
    return `${base} ${rounded} ${sizeClass} ${activeState} ${disabledClass} w-full md:w-56`;
  }, [isCompact, isOpen, selectedOptions.length, variant, selectionMode, disabled]);


  // --- RENDER: CHIPS MODE ---
  if (mode === 'chips') {
    return (
      <div className="flex flex-wrap gap-2">
        {options.map(option => {
          const isSelected = selectedOptions.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => !disabled && handleOptionToggle(option)}
              disabled={disabled}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ease-out flex items-center gap-1.5
                ${isSelected
                  ? 'bg-accent-primary text-white border-accent-primary shadow-md shadow-accent-primary/20 transform scale-105'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-accent-primary/50 hover:text-accent-primary hover:bg-accent-primary/5'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isSelected && <i className="fas fa-check text-[10px]"></i>}
              {option}
            </button>
          );
        })}
      </div>
    );
  }

  // --- RENDER: INLINE MODE ---
  if (mode === 'inline') {
    return (
      <div className={`w-full bg-gray-50/50 rounded-xl border border-gray-100 p-2 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
        {searchable && options.length > 5 && (
          <div className="relative mb-2">
            <i className="fas fa-search absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              disabled={disabled}
              className="w-full pl-9 pr-3 py-2 bg-white text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 transition-all text-sm placeholder:text-gray-400"
            />
          </div>
        )}
        <ul className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
          {selectionMode === 'multiple' && filteredOptions.length > 0 && (
            <li>
              <label className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${areAllFilteredSelected ? 'bg-accent-primary border-accent-primary' : 'border-gray-300 group-hover:border-accent-primary'}`}>
                  {areAllFilteredSelected && <i className="fas fa-check text-white text-[10px]"></i>}
                </div>
                <input
                  type="checkbox"
                  checked={areAllFilteredSelected}
                  onChange={() => areAllFilteredSelected ? handleClearFiltered() : handleSelectAll()}
                  className="hidden"
                />
                <span className="font-semibold italic text-xs text-gray-500 group-hover:text-accent-primary transition-colors">{areAllFilteredSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</span>
              </label>
            </li>
          )}
          {filteredOptions.length > 0 ? filteredOptions.map(option => {
            const isSelected = selectedOptions.includes(option);
            return (
              <li key={option}>
                <label className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-all cursor-pointer group ${isSelected ? 'bg-accent-primary/5 text-accent-primary font-medium' : 'text-gray-700 hover:bg-white hover:shadow-sm'}`}>
                  {selectionMode === 'multiple' && (
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-accent-primary border-accent-primary' : 'border-gray-300 group-hover:border-accent-primary'}`}>
                      {isSelected && <i className="fas fa-check text-white text-[10px]"></i>}
                    </div>
                  )}
                  <input
                    type={selectionMode === 'single' ? 'radio' : 'checkbox'}
                    checked={isSelected}
                    onChange={() => handleOptionToggle(option)}
                    className="hidden"
                  />
                  <span>{option}</span>
                  {selectionMode === 'single' && isSelected && <i className="fas fa-check text-accent-primary ml-auto text-xs"></i>}
                </label>
              </li>
            );
          }) : (
            <li className="px-3 py-4 text-sm text-gray-400 text-center italic">Không tìm thấy kết quả.</li>
          )}
        </ul>
      </div>
    );
  }

  // --- RENDER: DROPDOWN MODE (Desktop Default) ---
  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={buttonClasses}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isOpen || (selectedOptions.length > 0 && selectionMode === 'multiple') ? 'bg-accent-primary/10 text-accent-primary' : 'bg-gray-100 text-gray-400'}`}>
            <i className={`fas ${icon} text-xs`}></i>
          </div>
          <span className={`truncate ${selectedOptions.length > 0 ? 'font-semibold text-gray-900' : ''}`}>{displayLabel}</span>
        </div>
        <i className={`fas fa-chevron-down text-xs transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent-primary' : 'text-gray-400'}`}></i>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full min-w-[200px] bg-white border border-gray-100 rounded-xl shadow-xl shadow-gray-200/50 z-50 animate-in fade-in zoom-in-95 duration-200 flex flex-col overflow-hidden ring-1 ring-black/5">
          {searchable && options.length > 5 && (
            <div className="p-3 border-b border-gray-50 bg-gray-50/30">
              <div className="relative">
                <i className="fas fa-search absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  autoFocus
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 transition-all text-sm placeholder:text-gray-400"
                />
              </div>
            </div>
          )}

          <ul className="flex-grow max-h-64 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
            {selectionMode === 'multiple' && filteredOptions.length > 0 && (
              <li>
                <label className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-all cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${areAllFilteredSelected ? 'bg-accent-primary border-accent-primary' : 'border-gray-300 group-hover:border-accent-primary'}`}>
                    {areAllFilteredSelected && <i className="fas fa-check text-white text-[10px]"></i>}
                  </div>
                  <input
                    type="checkbox"
                    checked={areAllFilteredSelected}
                    onChange={() => areAllFilteredSelected ? handleClearFiltered() : handleSelectAll()}
                    className="hidden"
                  />
                  <span className="font-semibold italic text-xs text-gray-500 group-hover:text-accent-primary transition-colors">{areAllFilteredSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</span>
                </label>
              </li>
            )}
            {filteredOptions.length > 0 ? filteredOptions.map(option => {
              const isSelected = selectedOptions.includes(option);
              return (
                <li key={option}>
                  <label className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-all cursor-pointer group ${isSelected ? 'bg-accent-primary/5 text-accent-primary font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    {selectionMode === 'multiple' && (
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-accent-primary border-accent-primary' : 'border-gray-300 group-hover:border-accent-primary'}`}>
                        {isSelected && <i className="fas fa-check text-white text-[10px]"></i>}
                      </div>
                    )}
                    <input
                      type={selectionMode === 'single' ? 'radio' : 'checkbox'}
                      checked={isSelected}
                      onChange={() => handleOptionToggle(option)}
                      className="hidden"
                    />
                    <span>{option}</span>
                    {selectionMode === 'single' && isSelected && <i className="fas fa-check text-accent-primary ml-auto text-xs"></i>}
                  </label>
                </li>
              );
            }) : (
              <li className="px-3 py-8 text-sm text-gray-400 text-center flex flex-col items-center gap-2">
                <i className="fas fa-search text-2xl opacity-20"></i>
                <span>Không tìm thấy kết quả</span>
              </li>
            )}
          </ul>

          {selectionMode === 'multiple' && (
            <div className="p-3 border-t border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <Button onClick={handleClearAll} variant="ghost" size="sm" className="text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 !px-2 h-8">
                Xóa chọn ({selectedOptions.length})
              </Button>
              <Button onClick={() => setIsOpen(false)} variant="primary" size="sm" className="px-4 py-1.5 text-xs font-bold rounded-lg shadow-sm shadow-accent-primary/30">
                Áp dụng
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;