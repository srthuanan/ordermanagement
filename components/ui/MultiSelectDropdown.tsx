import React, { useState, useRef, useEffect, useMemo } from 'react';
import { includesNormalized } from '../../utils/stringUtils';
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
  const buttonClasses = useMemo(() => {
    const base = 'flex items-center justify-between transition-all duration-200 outline-none focus:ring-2 focus:ring-accent-primary/20';
    const disabledClass = disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-pointer';

    if (variant === 'modern') {
      const sizeClass = isCompact ? 'px-3 lg:px-2 h-8 lg:h-7 text-[11px] lg:text-[10px]' : 'px-4 lg:px-3 h-10 lg:h-8 text-[13px] lg:text-[12px]';
      const activeState = !disabled && (isOpen || (selectedOptions.length > 0 && selectionMode === 'multiple'))
        ? 'bg-white text-accent-primary ring-1 ring-accent-primary/20 shadow-sm'
        : 'bg-transparent text-slate-400 hover:text-slate-700 hover:bg-white/50';
      return `${base} rounded-lg ${sizeClass} ${activeState} ${disabledClass} font-semibold lg:font-medium transition-all duration-200`;
    }

    // Default variant (Neumorphism Style)
    const sizeClass = isCompact ? 'px-2 h-7 text-[10px]' : 'px-4 h-12 text-base lg:px-6';
    const activeState = !disabled && (isOpen || (selectedOptions.length > 0 && selectionMode === 'multiple'))
      ? 'bg-white text-[#6d5dfc] shadow-[inset_2px_2px_5px_#e5e7eb,inset_-2px_-2px_5px_#ffffff] font-bold'
      : 'bg-white text-gray-700 shadow-[-2px_-2px_5px_#ffffff,2px_2px_5px_#e5e7eb] hover:text-[#6d5dfc] font-medium';
    return `${base} rounded-full ${sizeClass} ${activeState} ${disabledClass} w-full`;
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
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isOpen || (selectedOptions.length > 0 && selectionMode === 'multiple') ? 'bg-accent-primary/10 text-accent-primary' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
            <i className={`fas ${icon} text-[10px]`}></i>
          </div>
          <span className="truncate font-bold tracking-tight text-slate-700">{displayLabel}</span>
        </div>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}`}>
          <i className={`fas fa-chevron-down text-[7px] transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}></i>
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
                <label className="flex items-center gap-3 w-full px-4 py-3 text-xs text-slate-600 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${areAllFilteredSelected ? 'bg-accent-primary border-accent-primary' : 'border-slate-200 group-hover:border-accent-primary'}`}>
                    {areAllFilteredSelected && <i className="fas fa-check text-white text-[9px]"></i>}
                  </div>
                  <input
                    type="checkbox"
                    checked={areAllFilteredSelected}
                    onChange={() => areAllFilteredSelected ? handleClearFiltered() : handleSelectAll()}
                    className="hidden"
                  />
                  <span className="font-black text-[10px] uppercase tracking-wider">{areAllFilteredSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</span>
                </label>
              </li>
            )}
            {filteredOptions.length > 0 ? filteredOptions.map(option => {
              const isSelected = selectedOptions.includes(option);
              return (
                <li key={option}>
                  <label className={`flex items-center gap-3 w-full ${isCompact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-xs lg:text-[13px]'} rounded-xl transition-all cursor-pointer group relative overflow-hidden ${isSelected ? 'bg-accent-primary/5 text-accent-primary font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                    {isSelected && <div className="absolute left-0 top-0 w-1 h-full bg-accent-primary animate-in slide-in-from-left duration-300"></div>}
                    
                    {selectionMode === 'multiple' && (
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-accent-primary border-accent-primary shadow-sm shadow-accent-primary/20' : 'border-slate-200 group-hover:border-accent-primary'}`}>
                        {isSelected && <i className="fas fa-check text-white text-[9px]"></i>}
                      </div>
                    )}
                    
                    <input
                      type={selectionMode === 'single' ? 'radio' : 'checkbox'}
                      checked={isSelected}
                      onChange={() => handleOptionToggle(option)}
                      className="hidden"
                    />
                    
                    <span className="truncate">{option}</span>
                    
                    {selectionMode === 'single' && isSelected && (
                      <div className="ml-auto w-5 h-5 bg-accent-primary rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                        <i className="fas fa-check text-white text-[8px]"></i>
                      </div>
                    )}
                  </label>
                </li>
              );
            }) : (
              <li className={`px-4 ${isCompact ? 'py-8 text-xs' : 'py-12 text-sm'} text-slate-300 text-center flex flex-col items-center gap-3`}>
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                  <i className="fas fa-search text-xl opacity-20"></i>
                </div>
                <span className="font-bold uppercase tracking-widest text-[10px]">Không tìm thấy</span>
              </li>
            )}
          </ul>

          {selectionMode === 'multiple' && (
            <div className="p-4 border-t border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <Button onClick={handleClearAll} variant="ghost" size="sm" className="text-[10px] font-black text-red-500 hover:text-red-600 hover:bg-red-50 px-3 h-9 rounded-xl uppercase tracking-wider">
                Xóa tất cả ({selectedOptions.length})
              </Button>
              <Button onClick={() => setIsOpen(false)} variant="primary" size="sm" className="px-5 py-2 text-[10px] font-black rounded-xl shadow-sm uppercase tracking-widest">
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