import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import MultiSelectDropdown, { DropdownFilterConfig } from './MultiSelectDropdown';
import moment from 'moment';
import Button from './Button';

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
    viewSwitcherEnabled?: boolean;
    activeView?: 'table' | 'grid';
    onViewChange?: (view: 'table' | 'grid') => void;
    extraActionButton?: React.ReactNode;
    variant?: 'default' | 'modern';
    dropdownClassName?: string;
    searchable?: boolean;
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
            className="w-full bg-surface-input border border-border-primary rounded-md p-2 text-sm focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary futuristic-input"
        />
    </div>
);


const Filters: React.FC<FiltersProps> = ({
    filters, onFilterChange, onReset, dropdowns, searchPlaceholder, totalCount, onRefresh, isLoading,
    hideSearch = false, size = 'default', plain = false, dateRangeEnabled = false, dateFilterEnabled = false,
    viewSwitcherEnabled = false, activeView = 'table', onViewChange, extraActionButton, variant = 'default',
    dropdownClassName = 'w-32 md:w-40 lg:w-48', searchable = true
}) => {
    const [localKeyword, setLocalKeyword] = useState(filters.keyword || '');
    const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
    const [expandedMobileFilters, setExpandedMobileFilters] = useState<string[]>([]);
    const datePickerRef = useRef<HTMLDivElement>(null);

    const dateValue = filters.dateRange || { start: '', end: '' };

    const handleDateChange = (part: 'start' | 'end', value: string) => {
        onFilterChange({ dateRange: { ...dateValue, [part]: value } });
    }

    const toggleMobileFilter = (id: string) => {
        setExpandedMobileFilters(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

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
        onRemove: () => onFilterChange({ dateRange: { start: '', end: '' } })
    } : null;

    const activeFilters = [...activeDropdownFilters];
    if (activeDateFilter) activeFilters.push(activeDateFilter);
    const hasActiveFilters = (filters.keyword && filters.keyword.length > 0) || activeFilters.length > 0;

    const dropdownControls = dropdowns.map(dropdown => (
        <div key={dropdown.id} className={dropdownClassName}>
            <MultiSelectDropdown

                id={dropdown.id}
                label={dropdown.label}
                options={dropdown.options}
                selectedOptions={(filters[dropdown.key] || []) as string[]}
                onChange={(selected) => onFilterChange({ [dropdown.key]: selected })}
                icon={dropdown.icon}
                displayMode={dropdown.displayMode || 'count'}
                size={size}
                variant={variant}
                searchable={searchable}
            />

        </div >
    ));

    const desktopContent = (
        <div className={`${variant === 'modern' ? 'flex items-center gap-2' : `flex items-center gap-2 ${plain ? '!shadow-none !bg-transparent !p-0 !border-none' : ''}`}`}>
            {!hideSearch && (
                <div className={`relative flex items-center transition-all duration-300 ${variant === 'modern' ? 'w-40 focus-within:w-60 flex-shrink' : 'flex-grow min-w-[200px] lg:min-w-[300px]'}`}>
                    <i className={`fas fa-search absolute left-3 z-10 ${variant === 'modern' ? 'text-accent-primary text-xs' : 'left-4 text-gray-400'}`}></i>
                    <input
                        type="text"
                        id="search-input-desktop"
                        placeholder={searchPlaceholder}
                        value={localKeyword}
                        onChange={(e) => setLocalKeyword(e.target.value)}
                        className={`w-full h-8 pl-9 pr-8 py-1.5 focus:outline-none text-text-primary placeholder:text-text-placeholder text-sm transition-all duration-300 ${variant === 'modern' ? 'bg-white border border-border-secondary rounded-full shadow-sm focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20' : 'relative'}`}
                    />
                    {localKeyword && (
                        <button
                            onClick={() => { setLocalKeyword(''); onFilterChange({ keyword: '' }); }}
                            className="absolute right-2 text-gray-400 hover:text-danger transition-colors"
                            title="Xóa tìm kiếm"
                        >
                            <i className="fas fa-times-circle text-xs"></i>
                        </button>
                    )}
                </div>
            )}

            {dropdownControls}

            <div className={`w-8 h-8 flex items-center justify-center transition-all duration-200 ${variant === 'modern' ? '' : 'ml-2'}`}>
                <Button
                    onClick={onReset}
                    variant="danger"
                    className={`!p-0 w-8 h-8 rounded-full transition-all duration-200 ${hasActiveFilters ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
                    title="Xóa tất cả bộ lọc"
                    tabIndex={hasActiveFilters ? 0 : -1}
                >
                    <i className="fas fa-times"></i>
                </Button>
            </div>

            {dateRangeEnabled && (
                <div className="relative" ref={datePickerRef}>
                    <Button
                        onClick={() => setIsDatePopoverOpen(!isDatePopoverOpen)}
                        variant="ghost"
                        className={`h-9 px-3 text-xs ${(dateValue.start && dateValue.end) || isDatePopoverOpen ? 'bg-surface-hover text-accent-primary' : ''}`}
                        leftIcon={<i className="fas fa-calendar-alt text-text-placeholder text-xs"></i>}
                    >
                        <span className={`${dateValue.start && dateValue.end ? 'font-semibold' : ''}`}>
                            {dateValue.start && dateValue.end ? `${moment(dateValue.start).format('DD/MM')} - ${moment(dateValue.end).format('DD/MM')}` : 'Chọn ngày'}
                        </span>
                    </Button>
                    {isDatePopoverOpen && (
                        <div className="absolute top-full mt-2 right-0 z-20 bg-surface-card p-4 rounded-lg shadow-lg border border-border-primary date-range-picker-popover">
                            <div className="space-y-3">
                                <DatePicker label="Từ ngày" value={dateValue.start} onChange={(val) => handleDateChange('start', val)} />
                                <DatePicker label="Đến ngày" value={dateValue.end} onChange={(val) => handleDateChange('end', val)} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <span className="text-sm font-medium text-text-secondary px-3 whitespace-nowrap border-l border-border-primary/50 ml-auto">
                {totalCount} kết quả
            </span>

            {viewSwitcherEnabled && (
                <div className="view-switcher-group flex gap-1">
                    <Button onClick={() => onViewChange?.('table')} variant={activeView === 'table' ? 'primary' : 'ghost'} size="sm" className="!p-2" title="Xem dạng danh sách"><i className="fas fa-list"></i></Button>
                    <Button onClick={() => onViewChange?.('grid')} variant={activeView === 'grid' ? 'primary' : 'ghost'} size="sm" className="!p-2" title="Xem dạng lưới"><i className="fas fa-th-large"></i></Button>
                </div>
            )}

            {extraActionButton}

            <Button onClick={onRefresh} disabled={isLoading} variant="ghost" className={`w-9 h-9 flex-shrink-0 ${variant === 'modern' ? '!rounded-full !bg-gray-50 hover:!bg-gray-100 !border-transparent' : ''}`} aria-label="Làm mới" title="Làm mới">
                <i className={`fas fa-sync-alt text-base ${isLoading ? 'animate-spin' : ''}`}></i>
            </Button>
        </div>
    );

    const finalDesktopContent = (
        <div className={`hidden md:block flex-shrink-0 ${!plain && variant !== 'modern' && 'p-2'}`}>
            {desktopContent}
        </div>
    );

    return (
        <>
            {/* --- Mobile View --- */}
            <div className={`md:hidden flex w-full items-center gap-2 ${plain ? '' : ''}`}>
                {!hideSearch && (
                    <div className="relative flex-grow flex items-center min-w-0">
                        <i className="fas fa-search absolute left-4 text-gray-400 z-10"></i>
                        <input
                            type="text"
                            id="search-input-mobile"
                            placeholder={searchPlaceholder}
                            value={localKeyword}
                            onChange={(e) => setLocalKeyword(e.target.value)}
                            className="w-full h-9 pl-11 pr-9 py-1.5 relative focus:outline-none text-text-primary placeholder:text-text-placeholder text-sm bg-surface-ground rounded-lg border border-transparent focus:bg-white focus:border-accent-primary transition-all duration-300"
                        />
                        {localKeyword && (
                            <button
                                onClick={() => { setLocalKeyword(''); onFilterChange({ keyword: '' }); }}
                                className="absolute right-3 text-gray-400 hover:text-danger transition-colors"
                            >
                                <i className="fas fa-times-circle"></i>
                            </button>
                        )}
                    </div>
                )}
                <Button onClick={() => setIsMobilePanelOpen(true)} variant="ghost" className="flex-shrink-0 w-9 h-9 relative !p-0">
                    <i className="fas fa-filter text-accent-primary"></i>
                    {activeFilters.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-surface-ground">{activeFilters.length}</span>
                    )}
                </Button>
                <Button onClick={onRefresh} disabled={isLoading} variant="ghost" className="flex-shrink-0 w-9 h-9 !p-0" aria-label="Làm mới" title="Làm mới">
                    <i className={`fas fa-sync-alt text-base ${isLoading ? 'animate-spin' : ''}`}></i>
                </Button>
            </div>

            {/* --- Mobile Filter Panel (Modal) --- */}
            {isMobilePanelOpen && createPortal(
                <div className="fixed inset-0 bg-black/60 z-[60] flex flex-col justify-end md:hidden" onClick={() => setIsMobilePanelOpen(false)}>
                    <div className="bg-surface-card rounded-t-2xl p-4 animate-fade-in-up flex flex-col max-h-[85vh]" style={{ animationDuration: '300ms' }} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-border-primary flex-shrink-0">
                            <h3 className="font-bold text-lg text-text-primary">Bộ Lọc</h3>
                            <Button onClick={() => setIsMobilePanelOpen(false)} variant="ghost" className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover !p-0"><i className="fas fa-times"></i></Button>
                        </div>

                        <div className="space-y-3 overflow-y-auto pr-2 -mr-2 custom-scrollbar py-2 flex-grow">
                            {(dateRangeEnabled || dateFilterEnabled) && (
                                <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-100">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{dateRangeEnabled ? 'Thời gian' : 'Ngày'}</label>
                                    <div className={`grid ${dateRangeEnabled ? 'grid-cols-2 gap-3' : 'grid-cols-1'}`}>
                                        <DatePicker label={dateRangeEnabled ? 'Từ ngày' : 'Chọn ngày'} value={dateValue.start} onChange={(val) => handleDateChange('start', val)} />
                                        {dateRangeEnabled && <DatePicker label="Đến ngày" value={dateValue.end} onChange={(val) => handleDateChange('end', val)} />}
                                    </div>
                                </div>
                            )}

                            {dropdowns.map(dropdown => {
                                const isExpanded = expandedMobileFilters.includes(dropdown.id);
                                const hasSelection = (filters[dropdown.key] as string[])?.length > 0;

                                return (
                                    <div key={'mobile-' + dropdown.id} className={`border rounded-xl transition-all duration-300 overflow-hidden ${isExpanded ? 'bg-white border-accent-primary/30 shadow-sm' : 'bg-white border-gray-100'}`}>
                                        <button
                                            type="button"
                                            onClick={() => toggleMobileFilter(dropdown.id)}
                                            className="flex items-center justify-between w-full p-3 text-left group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${hasSelection ? 'bg-accent-primary text-white shadow-sm shadow-accent-primary/30' : 'bg-gray-100 text-gray-400 group-hover:bg-accent-primary/10 group-hover:text-accent-primary'}`}>
                                                    <i className={`fas ${dropdown.icon} text-xs`}></i>
                                                </div>
                                                <div>
                                                    <span className={`text-sm font-semibold transition-colors ${hasSelection ? 'text-accent-primary' : 'text-gray-700 group-hover:text-gray-900'}`}>{dropdown.label}</span>
                                                    {hasSelection && (
                                                        <div className="text-[10px] text-gray-500 font-medium">Đã chọn {(filters[dropdown.key] as string[]).length}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-gray-100 text-gray-600' : 'text-gray-300'}`}>
                                                <i className="fas fa-chevron-down text-xs"></i>
                                            </div>
                                        </button>

                                        <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                            <div className="overflow-hidden">
                                                <div className="p-3 pt-0 border-t border-gray-50">
                                                    <div className="mt-3">
                                                        <MultiSelectDropdown
                                                            id={'mobile-' + dropdown.id}
                                                            label={dropdown.label}
                                                            options={dropdown.options}
                                                            selectedOptions={(filters[dropdown.key] || []) as string[]}
                                                            onChange={(selected) => onFilterChange({ [dropdown.key]: selected })}
                                                            icon={dropdown.icon}
                                                            displayMode={dropdown.displayMode}
                                                            size="default"
                                                            mode={dropdown.mode || (dropdown.options.length > 6 ? 'inline' : 'chips')}
                                                            searchable={false}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-border-primary flex-shrink-0">
                            <Button onClick={() => { onReset(); }} disabled={!hasActiveFilters} variant="secondary" fullWidth className="rounded-xl">Xóa Lọc</Button>
                            <Button onClick={() => setIsMobilePanelOpen(false)} variant="primary" fullWidth className="rounded-xl shadow-lg shadow-accent-primary/20">Xem {totalCount} kết quả</Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* --- Desktop View --- */}
            {finalDesktopContent}
        </>
    );
};

export default Filters;