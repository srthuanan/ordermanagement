import React, { useState, useRef, useEffect, useMemo } from 'react';
import { includesNormalized } from '../../utils/stringUtils';

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
  align?: 'left' | 'right';
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label, options, selectedOptions, onChange, icon,
  displayMode = 'count', size = 'default', variant = 'default',
  mode = 'dropdown', selectionMode = 'multiple', placeholder, disabled = false,
  searchable = true, align = 'left'
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
    includesNormalized(option, searchTerm)
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
  const isSelectedOrOpen = !disabled && (isOpen || (selectedOptions.length > 0 && selectionMode === 'multiple'));

  const buttonClasses = useMemo(() => {
    const base = 'flex items-center justify-between transition-all duration-200 outline-none focus:ring-2 focus:ring-slate-900/10';
    const disabledClass = disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-pointer';

    if (variant === 'modern') {
      const sizeClass = isCompact ? 'px-2 lg:px-1.5 h-7 lg:h-[26px] text-[10.5px] lg:text-[10px]' : 'px-3 h-8 text-xs';
      const activeState = isSelectedOrOpen
        ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
        : 'bg-slate-100/75 hover:bg-white text-slate-600 hover:text-slate-900 border-slate-200/80 hover:border-slate-300';
      return `${base} rounded-xl border ${sizeClass} ${activeState} ${disabledClass} font-semibold transition-all duration-200 select-none`;
    }

    // Default variant
    const sizeClass = isCompact ? 'px-2 h-7 text-[10px]' : 'px-4 h-12 text-sm lg:px-6';
    const activeState = isSelectedOrOpen
      ? 'bg-white text-accent-primary border border-accent-primary/50 shadow-sm'
      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 shadow-sm';
    return `${base} rounded-full ${sizeClass} ${activeState} ${disabledClass} w-full font-medium`;
  }, [isCompact, isSelectedOrOpen, variant, disabled]);


  // --- RENDER: CHIPS MODE ---
  if (mode === 'chips') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {options.map(option => {
          const isSelected = selectedOptions.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => !disabled && handleOptionToggle(option)}
              disabled={disabled}
              className={`
                h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border
                ${isSelected
                  ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                  : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isSelected && <i className="fas fa-check text-[8px] mr-1"></i>}
              <span>{option}</span>
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
        <div className={`flex items-center ${isCompact ? 'gap-1 lg:gap-1' : 'gap-2'} min-w-0`}>
          <div className={`${isCompact ? 'w-4 h-4 text-[8px]' : 'w-5 h-5 text-[9px]'} rounded-md flex items-center justify-center transition-all ${
            isSelectedOrOpen && variant === 'modern'
              ? 'bg-white/20 text-white' 
              : 'bg-white/80 text-slate-400 group-hover:text-slate-600'
          }`}>
            <i className={`fas ${icon}`}></i>
          </div>
          <span className={`truncate ${
            isSelectedOrOpen && variant === 'modern'
              ? 'text-white font-bold' 
              : 'text-slate-700 font-semibold'
          }`}>{displayLabel}</span>
        </div>
        <div className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} rounded-full flex items-center justify-center transition-all ml-0.5 ${
          isSelectedOrOpen && variant === 'modern'
            ? 'text-white/80' 
            : 'text-slate-400'
        }`}>
          <i className={`fas fa-chevron-down ${isCompact ? 'text-[6.5px]' : 'text-[7px]'} transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}></i>
        </div>
      </button>

      {isOpen && (
        <div className={`absolute top-[calc(100%+0.5rem)] ${align === 'right' ? 'left-0 lg:left-auto lg:right-0' : 'left-0'} w-full min-w-[240px] bg-white border border-slate-100 rounded-[1.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] z-[110] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 flex flex-col overflow-hidden ring-1 ring-slate-900/5 backdrop-blur-xl bg-white/95`}>
          {searchable && options.length > 5 && (
            <div className="p-4 border-b border-slate-50">
              <div className="relative group">
                <i className="fas fa-search absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-300 text-[10px] group-focus-within:text-accent-primary transition-colors"></i>
                <input
                  type="text"
                  placeholder="Tìm kiếm nhanh..."
                  autoFocus
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 text-slate-900 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-primary/10 focus:bg-white transition-all text-xs font-bold placeholder:text-slate-300 shadow-inner"
                />
              </div>
            </div>
          )}

          <ul className="flex-grow max-h-72 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {selectionMode === 'multiple' && filteredOptions.length > 0 && (
              <li>
                <label className="flex items-center gap-3 w-full px-4 py-2.5 text-xs text-slate-600 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group">
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${areAllFilteredSelected ? 'bg-slate-700 border-slate-700' : 'border-slate-300 group-hover:border-slate-500'}`}>
                    {areAllFilteredSelected && <i className="fas fa-check text-white text-[8px]"></i>}
                  </div>
                  <input
                    type="checkbox"
                    checked={areAllFilteredSelected}
                    onChange={() => areAllFilteredSelected ? handleClearFiltered() : handleSelectAll()}
                    className="hidden"
                  />
                  <span className="font-bold text-[10px] uppercase tracking-wider text-slate-700">{areAllFilteredSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</span>
                </label>
              </li>
            )}
            {filteredOptions.length > 0 ? filteredOptions.map(option => {
              const isSelected = selectedOptions.includes(option);
              return (
                <li key={option}>
                  <label className={`flex items-center gap-2.5 w-full ${isCompact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'} rounded-xl transition-all cursor-pointer group relative overflow-hidden ${isSelected ? 'bg-slate-100/90 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                    {isSelected && <div className="absolute left-0 top-0 w-1 h-full bg-slate-700 animate-in slide-in-from-left duration-200"></div>}
                    
                    {selectionMode === 'multiple' && (
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-slate-700 border-slate-700 text-white shadow-2xs' : 'border-slate-300 group-hover:border-slate-500'}`}>
                        {isSelected && <i className="fas fa-check text-white text-[8px]"></i>}
                      </div>
                    )}
                    
                    <input
                      type={selectionMode === 'single' ? 'radio' : 'checkbox'}
                      checked={isSelected}
                      onChange={() => handleOptionToggle(option)}
                      className="hidden"
                    />
                    
                    <span className="truncate text-[11.5px]">{option}</span>
                    
                    {selectionMode === 'single' && isSelected && (
                      <div className="ml-auto w-4 h-4 bg-slate-700 rounded-full flex items-center justify-center animate-in zoom-in duration-200">
                        <i className="fas fa-check text-white text-[7px]"></i>
                      </div>
                    )}
                  </label>
                </li>
              );
            }) : (
              <li className={`px-4 ${isCompact ? 'py-6 text-xs' : 'py-8 text-sm'} text-slate-400 text-center flex flex-col items-center gap-2`}>
                <span className="font-medium text-[11px]">Không tìm thấy kết quả</span>
              </li>
            )}
          </ul>

          {selectionMode === 'multiple' && (
            <div className="p-3 border-t border-slate-100 bg-slate-50/80 flex justify-between items-center">
              <button onClick={handleClearAll} className="text-[11px] font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg">
                Xóa ({selectedOptions.length})
              </button>
              <button onClick={() => setIsOpen(false)} className="px-4 py-1.5 text-[11px] font-semibold bg-slate-700 hover:bg-slate-800 text-white rounded-full shadow-2xs">
                Áp dụng
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;