import React from 'react';
import MultiSelectDropdown from './MultiSelectDropdown';

export interface DropdownFilterConfig {
  id: string;
  key: string; // The key in the filters state object
  label: string;
  options: string[];
  icon: string;
  displayMode?: 'count' | 'selection';
}

interface FiltersProps {
  filters: {
    keyword?: string;
    [key: string]: string | string[] | undefined;
  };
  onFilterChange: (filters: Partial<FiltersProps['filters']>) => void;
  onReset: () => void;
  dropdowns: DropdownFilterConfig[];
  searchPlaceholder: string;
  totalCount: number;
  onRefresh: () => void;
  isLoading: boolean;
  hideSearch?: boolean;
}

const ActiveFilterPill: React.FC<{ value: string; onRemove: () => void; }> = ({ value, onRemove }) => (
    <div className="flex items-center gap-2 bg-accent-primary/10 text-accent-primary text-xs font-semibold pl-2.5 pr-1.5 py-1 rounded-full animate-fade-in-up" style={{animationDuration: '300ms'}}>
        <span className="truncate max-w-xs">{value}</span>
        <button onClick={onRemove} className="w-4 h-4 rounded-full bg-accent-primary/20 hover:bg-accent-primary/40 flex items-center justify-center flex-shrink-0">
            <i className="fas fa-times text-xs"></i>
        </button>
    </div>
);


const Filters: React.FC<FiltersProps> = ({ filters, onFilterChange, onReset, dropdowns, searchPlaceholder, totalCount, onRefresh, isLoading, hideSearch = false }) => {
  
  const activeDropdownFilters = dropdowns.flatMap(d => 
    ((filters[d.key] || []) as string[]).map(value => ({
      key: `${d.key}-${value}`,
      value: value,
      onRemove: () => {
        const currentValues = (filters[d.key] || []) as string[];
        onFilterChange({ [d.key]: currentValues.filter(v => v !== value) });
      }
    }))
  );

  const hasActiveDropdownFilters = activeDropdownFilters.length > 0;

  return (
    <div className="flex-shrink-0 bg-surface-card p-4 rounded-xl shadow-md border border-border-primary space-y-3">
        {/* Main filter bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-wrap">
            {/* Search Input */}
            {!hideSearch && (
              <div className="relative w-full sm:w-auto sm:flex-grow max-w-sm">
                  <i className="fas fa-search absolute top-1/2 left-4 -translate-y-1/2 text-text-placeholder peer-focus:text-accent-primary"></i>
                  <input 
                      type="text" 
                      id="search-input" 
                      placeholder={searchPlaceholder} 
                      value={filters.keyword || ''}
                      onChange={(e) => onFilterChange({ keyword: e.target.value })}
                      className="peer w-full pl-11 pr-4 py-2.5 bg-surface-ground text-text-primary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all placeholder:text-text-placeholder"
                  />
              </div>
            )}

            {/* Dropdown Filters */}
            {dropdowns.map(dropdown => (
                <MultiSelectDropdown
                    key={dropdown.id}
                    id={dropdown.id}
                    label={dropdown.label}
                    options={dropdown.options}
                    selectedOptions={(filters[dropdown.key] || []) as string[]}
                    onChange={(selected) => onFilterChange({ [dropdown.key]: selected })}
                    icon={dropdown.icon}
                    displayMode={dropdown.displayMode}
                />
            ))}

            {/* Spacer to push right content */}
            <div className="flex-grow hidden lg:block"></div>

            {/* Right-aligned controls */}
            <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                 <span id="total-items-count" className="text-sm font-medium text-text-secondary px-4 py-2.5 bg-surface-ground rounded-lg border border-border-primary whitespace-nowrap">
                    Tổng: <strong className="font-semibold text-text-primary">{totalCount}</strong>
                 </span>
                 <button onClick={onRefresh} disabled={isLoading} id="refresh-btn" className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-lg bg-surface-ground text-text-secondary hover:text-accent-primary hover:bg-surface-accent transition-all disabled:opacity-50" aria-label="Làm mới" title="Làm mới">
                    <i className={`fas fa-sync-alt text-lg ${isLoading ? 'animate-spin' : ''}`}></i>
                 </button>
            </div>
        </div>

        {/* Active Filters (only shown when active) */}
        {hasActiveDropdownFilters && (
            <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-border-primary/50">
                {activeDropdownFilters.map(filter => (
                    <ActiveFilterPill key={filter.key} value={filter.value} onRemove={filter.onRemove} />
                ))}
                <button onClick={onReset} className="ml-auto text-xs text-accent-secondary hover:text-accent-primary font-semibold transition-all flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-surface-accent">
                    <i className="fas fa-times-circle"></i>
                    <span>Xóa Lọc</span>
                </button>
            </div>
        )}
    </div>
  );
};

export default Filters;