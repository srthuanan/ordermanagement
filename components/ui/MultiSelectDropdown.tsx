import React, { useState, useRef, useEffect } from 'react';

interface MultiSelectDropdownProps {
  id: string;
  label: string;
  options: string[];
  selectedOptions: string[];
  onChange: (selected: string[]) => void;
  icon: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ label, options, selectedOptions, onChange, icon }) => {
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
    option.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
        searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    )
  );

  const handleOptionToggle = (option: string) => {
    const newSelected = selectedOptions.includes(option)
      ? selectedOptions.filter(item => item !== option)
      : [...selectedOptions, option];
    onChange(newSelected);
  };
  
  const displayLabel = selectedOptions.length > 0 
    ? `${selectedOptions.length} đã chọn`
    : label;

  return (
    <div className="relative" ref={dropdownRef}>
        {/* Trigger Button */}
        <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full md:w-52 flex items-center justify-between pl-3.5 pr-3 py-2.5 text-sm font-medium rounded-lg border transition-all bg-surface-ground text-text-primary border-border-primary hover:border-accent-primary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
        >
            <div className="flex items-center gap-3">
                 <i className={`fas ${icon} text-text-placeholder`}></i>
                 <span className={`truncate ${selectedOptions.length > 0 ? 'font-semibold text-accent-primary' : ''}`}>{displayLabel}</span>
            </div>
            <i className={`fas fa-chevron-down text-text-placeholder text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
            <div className="absolute top-full mt-2 w-72 bg-surface-card border border-border-secondary rounded-lg shadow-lg z-20 animate-fade-in-down" style={{animationDuration: '0.2s'}}>
                <div className="p-2">
                    <div className="relative">
                        <i className="fas fa-search absolute top-1/2 left-3 -translate-y-1/2 text-text-placeholder text-sm"></i>
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-surface-input text-text-primary border border-border-primary rounded-md focus:outline-none focus:border-accent-primary"
                        />
                    </div>
                </div>
                <ul className="max-h-60 overflow-y-auto p-2">
                    {filteredOptions.length > 0 ? filteredOptions.map(option => (
                        <li key={option}>
                            <label className="flex items-center gap-3 w-full px-2 py-2.5 text-sm font-medium text-text-primary rounded-md hover:bg-surface-hover cursor-pointer">
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
            </div>
        )}
    </div>
  );
};
export default MultiSelectDropdown;