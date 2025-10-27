import React, { useState, useEffect, useRef } from 'react';
import MultiSelectDropdown, { DropdownFilterConfig } from './MultiSelectDropdown';

// FIX: Re-export DropdownFilterConfig to make it available to other components that import Filters.
export type { DropdownFilterConfig };

interface DateRange {
  start: string;
  end: string;
}

interface FiltersProps {
  filters: {
    keyword?: string;
    dateRange?: DateRange;
    [key: string]: string | string[] | DateRange | undefined;
  };
  onFilterChange: (filters: Partial<FiltersProps['filters']>) => void;
  onReset: () => void;
  dropdowns: DropdownFilterConfig[];
  searchPlaceholder: string;
  totalCount: number;
  onRefresh: () => void;
  isLoading: boolean;
  hideSearch?: boolean;
  size?: 'default' | 'compact';
  plain?: boolean;
  dateRangeEnabled?: boolean;
  dateFilterEnabled?: boolean; // For single date selection
}

const DatePicker: React.FC<{
    label: string,
    value: string,
    onChange: (date: string) => void
}> = ({ label, value, onChange }) => (
    <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
        <input
            type="date"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-surface-input border border-border-primary rounded-md p-2 text-sm focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
        />
    </div>
);


const Filters: React.FC<FiltersProps> = ({ 
    filters, onFilterChange, onReset, dropdowns, searchPlaceholder, totalCount, onRefresh, isLoading, 
    hideSearch = false, size = 'default', plain = false, dateRangeEnabled = false, dateFilterEnabled = false
}) => {
  const [localKeyword, setLocalKeyword] = useState(filters.keyword || '');
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  
  const dateValue = filters.dateRange || { start: '', end: '' };
  
  const handleDateChange = (part: 'start' | 'end', value: string) => {
      onFilterChange({ dateRange: { ...dateValue, [part]: value }});
  }
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (filters.keyword !== localKeyword) {
      setLocalKeyword(filters.keyword || '');
    }
  }, [filters.keyword]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localKeyword !== filters.keyword) {
        onFilterChange({ keyword: localKeyword });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localKeyword, filters.keyword, onFilterChange]);

  const isCompact = size === 'compact';
  
  const activeDropdownFilters = dropdowns.flatMap(d => {
      const selected = (filters[d.key] || []) as string[];
      return selected.map(value => ({
          key: `${d.key}-${value}`,
          label: d.label,
          value: value,
          onRemove: () => {
              onFilterChange({ [d.key]: selected.filter(v => v !== value) });
          }
      }));
  });

  const activeDateFilter = dateValue.start && dateValue.end ? {
        key: `date-range-${dateValue.start}-${dateValue.end}`,
        label: 'Date Range',
        value: `${new Date(dateValue.start).toLocaleDateString('vi-VN')} - ${new Date(dateValue.end).toLocaleDateString('vi-VN')}`,
        onRemove: () => onFilterChange({ dateRange: { start: '', end: '' }})
  } : null;

  const activeFilters = [...activeDropdownFilters];
  if (activeDateFilter) activeFilters.push(activeDateFilter);
  const hasActiveFilters = (filters.keyword && filters.keyword.length > 0) || activeFilters.length > 0;

  const searchControls = (
    <div className="relative flex-1 min-w-0" style={{minWidth: '200px'}}>
      <i className="fas fa-search absolute top-1/2 left-3 -translate-y-1/2 text-text-placeholder peer-focus:text-accent-primary text-sm"></i>
      <input
        type="text"
        id="search-input-desktop"
        placeholder={searchPlaceholder}
        value={localKeyword}
        onChange={(e) => setLocalKeyword(e.target.value)}
        className={`peer w-full pl-9 pr-3 bg-surface-ground text-text-primary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary transition-all placeholder:text-text-placeholder focus:shadow-glow-accent text-sm ${isCompact ? 'h-8' : 'h-11'}`}
      />
    </div>
  );

  const dropdownControls = dropdowns.map(dropdown => (
    <MultiSelectDropdown
      key={dropdown.id}
      id={dropdown.id}
      label={dropdown.label}
      options={dropdown.options}
      selectedOptions={(filters[dropdown.key] || []) as string[]}
      onChange={(selected) => onFilterChange({ [dropdown.key]: selected })}
      icon={dropdown.icon}
      displayMode={dropdown.displayMode || 'count'}
      size={size}
    />
  ));

  const desktopContent = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 w-full">
          {!hideSearch && searchControls}
          {dropdownControls}
          {(dateRangeEnabled || dateFilterEnabled) && (
            <div className="relative" ref={datePickerRef}>
              <button onClick={() => setIsDatePopoverOpen(prev => !prev)} className={`flex items-center gap-2 pl-3 pr-2.5 text-sm font-medium rounded-lg border transition-all bg-surface-ground text-text-primary border-border-primary hover:border-accent-primary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/20 ${isCompact ? 'h-8' : 'h-11'} ${dateValue.start ? 'font-semibold text-accent-primary' : ''}`}>
                 <i className={`fas fa-calendar-alt text-text-placeholder text-sm`}></i>
                 <span>{dateValue.start ? `${new Date(dateValue.start).toLocaleDateString('vi-VN')}${dateValue.end ? ' - ...' : ''}` : (dateRangeEnabled ? 'Phạm vi Ngày' : 'Chọn ngày')}</span>
                 <i className={`fas fa-chevron-down text-text-placeholder text-xs transition-transform duration-200 ml-1 ${isDatePopoverOpen ? 'rotate-180' : ''}`}></i>
              </button>
              {isDatePopoverOpen && (
                <div className="date-range-picker-popover absolute top-full mt-2 right-0 p-4 animate-fade-in-down" style={{animationDuration: '0.2s'}}>
                    <div className={`grid ${dateRangeEnabled ? 'grid-cols-2 gap-3' : 'grid-cols-1'}`}>
                        <DatePicker label={dateRangeEnabled ? 'Từ ngày' : 'Chọn ngày'} value={dateValue.start} onChange={(val) => handleDateChange('start', val)} />
                        {dateRangeEnabled && <DatePicker label="Đến ngày" value={dateValue.end} onChange={(val) => handleDateChange('end', val)} />}
                    </div>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            <span id="total-items-count" className={`text-xs font-medium text-text-secondary bg-surface-ground rounded-lg border border-border-primary whitespace-nowrap flex items-center ${isCompact ? 'px-2.5 h-8' : 'px-4 h-11'}`}>
              {totalCount} kết quả
            </span>
            <button onClick={onRefresh} disabled={isLoading} id="refresh-btn" className={`flex-shrink-0 flex items-center justify-center rounded-lg bg-surface-ground text-text-secondary hover:text-accent-primary hover:bg-surface-accent transition-all disabled:opacity-50 ${isCompact ? 'w-8 h-8' : 'w-11 h-11'}`} aria-label="Làm mới" title="Làm mới">
              <i className={`fas fa-sync-alt text-base ${isLoading ? 'animate-spin' : ''}`}></i>
            </button>
          </div>
      </div>
      {hasActiveFilters && (
        <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary">Đang lọc:</span>
            {filters.keyword && (
                <div className="active-filter-chip">
                    <span>Từ khóa: "{filters.keyword}"</span>
                    <button onClick={() => onFilterChange({ keyword: '' })}><i className="fas fa-times text-xs"></i></button>
                </div>
            )}
            {activeFilters.map(filter => (
                <div key={filter.key} className="active-filter-chip">
                    <span className="chip-label">{filter.label}:</span>
                    <span>{filter.value}</span>
                    <button onClick={filter.onRemove}><i className="fas fa-times text-xs"></i></button>
                </div>
            ))}
            <button onClick={onReset} className="text-xs text-danger hover:underline font-semibold ml-2">Xóa tất cả</button>
        </div>
      )}
    </div>
  );
  
  const finalDesktopContent = (
    <div className={`hidden md:block flex-shrink-0 ${!plain && 'bg-surface-card rounded-xl shadow-md border border-border-primary'} ${isCompact ? 'p-2' : 'p-4'}`}>
      {desktopContent}
    </div>
  );

  return (
      <>
          {/* --- Mobile View --- */}
          <div className="md:hidden flex w-full items-center gap-2">
              {!hideSearch && React.cloneElement(searchControls, {id: 'search-input-mobile'})}
              <button onClick={() => setIsMobilePanelOpen(true)} className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-surface-ground rounded-lg border border-border-primary relative">
                  <i className="fas fa-filter text-accent-primary"></i>
                  {activeFilters.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-accent-primary text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface-card">{activeFilters.length}</span>
                  )}
              </button>
               <button onClick={onRefresh} disabled={isLoading} className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-surface-ground text-text-secondary hover:text-accent-primary hover:bg-surface-accent transition-all disabled:opacity-50`} aria-label="Làm mới" title="Làm mới">
                  <i className={`fas fa-sync-alt text-base ${isLoading ? 'animate-spin' : ''}`}></i>
              </button>
          </div>

          {/* --- Mobile Filter Panel (Modal) --- */}
          {isMobilePanelOpen && (
              <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end md:hidden" onClick={() => setIsMobilePanelOpen(false)}>
                  <div className="bg-surface-card rounded-t-2xl p-4 animate-fade-in-up" style={{animationDuration: '300ms'}} onClick={e => e.stopPropagation()}>
                      <div className="flex justify-between items-center mb-4 pb-3 border-b border-border-primary">
                          <h3 className="font-bold text-lg text-text-primary">Bộ Lọc</h3>
                          <button onClick={() => setIsMobilePanelOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover"><i className="fas fa-times"></i></button>
                      </div>
                      
                      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 -mr-2">
                        {(dateRangeEnabled || dateFilterEnabled) && (
                             <div>
                                <label className="text-sm font-medium text-text-secondary mb-1.5 block">{dateRangeEnabled ? 'Phạm vi Ngày' : 'Chọn ngày'}</label>
                                <div className={`grid ${dateRangeEnabled ? 'grid-cols-2 gap-3' : 'grid-cols-1'}`}>
                                    <DatePicker label={dateRangeEnabled ? 'Từ ngày' : 'Chọn ngày'} value={dateValue.start} onChange={(val) => handleDateChange('start', val)} />
                                    {dateRangeEnabled && <DatePicker label="Đến ngày" value={dateValue.end} onChange={(val) => handleDateChange('end', val)} />}
                                </div>
                            </div>
                        )}
                          {dropdowns.map(dropdown => (
                              <div key={'mobile-' + dropdown.id}>
                                  <label className="text-sm font-medium text-text-secondary mb-1.5 block">{dropdown.label}</label>
                                  <MultiSelectDropdown 
                                    id={'mobile-' + dropdown.id} 
                                    label={dropdown.label}
                                    options={dropdown.options}
                                    selectedOptions={(filters[dropdown.key] || []) as string[]}
                                    onChange={(selected) => onFilterChange({ [dropdown.key]: selected })}
                                    icon={dropdown.icon}
                                    displayMode={dropdown.displayMode}
                                    size="default" // Force default size in modal for better readability
                                  />
                              </div>
                          ))}
                      </div>
                      <div className="mt-6 grid grid-cols-2 gap-3">
                          <button onClick={() => { onReset(); }} disabled={!hasActiveFilters} className="btn-secondary w-full">Xóa Lọc</button>
                          <button onClick={() => setIsMobilePanelOpen(false)} className="btn-primary w-full">Xem {totalCount} kết quả</button>
                      </div>
                  </div>
              </div>
          )}

          {/* --- Desktop View --- */}
          {plain ? (
              <div className="hidden md:block w-full">{desktopContent}</div>
          ) : (
              finalDesktopContent
          )}
      </>
  );
};

export default Filters;