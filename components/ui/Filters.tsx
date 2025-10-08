import React from 'react';
import MultiSelectDropdown from './MultiSelectDropdown';

export interface DropdownFilterConfig {
  id: string;
  key: string; // The key in the filters state object
  label: string;
  options: string[];
  icon: string;
}

interface FiltersProps {
  filters: {
    keyword: string;
    [key: string]: string | string[]; // Allow dynamic filter keys
  };
  onFilterChange: (filters: Partial<FiltersProps['filters']>) => void;
  onReset: () => void;
  dropdowns: DropdownFilterConfig[];
  searchPlaceholder: string;
  totalCount: number;
  onRefresh: () => void;
  isLoading: boolean;
}

const ActiveFilterPill: React.FC<{ value: string; onRemove: () => void; }> = ({ value, onRemove }) => (
    <div className="flex items-center gap-2 bg-accent-primary/10 text-accent-primary text-xs font-semibold pl-2.5 pr-1.5 py-1 rounded-full animate-fade-in-up" style={{animationDuration: '300ms'}}>
        <span className="truncate max-w-xs">{value}</span>
        <button onClick={onRemove} className="w-4 h-4 rounded-full bg-accent-primary/20 hover:bg-accent-primary/40 flex items-center justify-center flex-shrink-0">
            <i className="fas fa-times text-xs"></i>
        </button>
    </div>
);


const Filters: React.FC<FiltersProps> = ({ filters, onFilterChange, onReset, dropdowns, searchPlaceholder, totalCount, onRefresh, isLoading }) => {
  
  const activeDropdownFilters = dropdowns.flatMap(d => 
    (filters[d.key] as string[]).map(value => ({
      key: `${d.key}-${value}`,
      value: value,
      onRemove: () => {
        const currentValues = filters[d.key] as string[];
        onFilterChange({ [d.key]: currentValues.filter(v => v !== value) });
      }
    }))
  );

  const hasActiveDropdownFilters = activeDropdownFilters.length > 0;

  return (
    <div className="flex-shrink-0 bg-surface-card p-4 rounded-xl shadow-md border border-border-primary">
        {/* Top Section: Search and Primary Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-grow w-full">
                 <i className="fas fa-search absolute top-1/2 left-4 -translate-y-1/2 text-text-placeholder peer-focus:text-accent-primary"></i>
                 <input 
                    type="text" 
                    id="search-input" 
                    placeholder={searchPlaceholder} 
                    value={filters.keyword}
                    onChange={(e) => onFilterChange({ keyword: e.target.value })}
                    className="peer w-full pl-11 pr-4 py-2.5 bg-surface-ground text-text-primary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all placeholder:text-text-placeholder"
                 />
            </div>
            <div className="flex-shrink-0 flex items-center justify-end gap-2 w-full sm:w-auto">
                 <span id="total-items-count" className="text-sm font-medium text-text-secondary px-4 py-2.5 bg-surface-ground rounded-lg border border-border-primary whitespace-nowrap">
                    Tổng: <strong className="font-semibold text-text-primary">{totalCount}</strong>
                 </span>
                 <button onClick={onRefresh} disabled={isLoading} id="refresh-btn" className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-lg bg-surface-ground text-text-secondary hover:text-accent-primary hover:bg-surface-accent transition-all disabled:opacity-50" aria-label="Làm mới" title="Làm mới">
                    <i className={`fas fa-sync-alt text-lg ${isLoading ? 'animate-spin' : ''}`}></i>
                 </button>
            </div>
        </div>

        {/* Bottom Section: Filter Controls & Active Filters */}
        <div className="mt-3 pt-3 border-t border-border-primary">
             <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Filter Dropdowns */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-wrap">
                     <span className="text-sm font-semibold text-text-primary whitespace-nowrap hidden sm:block">
                        <i className="fas fa-filter mr-2 text-accent-primary"></i>
                        Bộ lọc chi tiết:
                    </span>
                    {dropdowns.map(dropdown => (
                        <MultiSelectDropdown
                            key={dropdown.id}
                            id={dropdown.id}
                            label={dropdown.label}
                            options={dropdown.options}
                            selectedOptions={filters[dropdown.key] as string[]}
                            onChange={(selected) => onFilterChange({ [dropdown.key]: selected })}
                            icon={dropdown.icon}
                        />
                    ))}
                </div>

                {/* Active Filters & Reset Button */}
                {hasActiveDropdownFilters && (
                    <div className="flex items-center gap-2 flex-wrap justify-start md:justify-end w-full md:w-auto animate-fade-in-up" style={{animationDuration: '300ms'}}>
                        {activeDropdownFilters.map(filter => (
                            <ActiveFilterPill key={filter.key} value={filter.value} onRemove={filter.onRemove} />
                        ))}
                        
                        <button onClick={onReset} className="ml-2 text-sm text-accent-secondary hover:text-accent-primary font-semibold transition-all flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-accent">
                            <i className="fas fa-times-circle"></i>
                            <span>Xóa Lọc</span>
                        </button>
                    </div>
                )}
             </div>
        </div>
    </div>
  );
};

export default Filters;