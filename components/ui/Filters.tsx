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
    dropdownClassName = 'w-28 md:w-36 lg:w-64', searchable = true
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
        <div className={`flex items-center gap-2 ${variant === 'modern' ? 'py-0.5' : ''}`}>
            {variant === 'modern' ? (
                <div className="flex items-center bg-transparent p-0 gap-1">
                    {!hideSearch && (
                        <div className="relative flex items-center group">
                            <i className="fas fa-search absolute left-2 top-1/2 -translate-y-1/2 z-10 text-gray-400 group-focus-within:text-accent-primary text-[10px] transition-colors"></i>
                            <input
                                type="text"
                                placeholder={searchPlaceholder}
                                value={localKeyword}
                                onChange={(e) => setLocalKeyword(e.target.value)}
                                className="w-28 mt-0.5 focus:w-44 h-7 pl-7 pr-2 text-[11px] bg-gray-50/50 hover:bg-gray-100/80 focus:bg-white border border-gray-100/50 focus:border-accent-primary/30 rounded-md focus:shadow-sm focus:ring-0 text-gray-900 placeholder:text-gray-400 transition-all duration-300 font-bold"
                            />
                            {localKeyword && (
                                <button onClick={() => { setLocalKeyword(''); onFilterChange({ keyword: '' }); }} className="absolute right-1 text-gray-300 hover:text-danger p-1"><i className="fas fa-times-circle text-[9px]"></i></button>
                            )}
                        </div>
                    )}

                    {!hideSearch && <div className="w-[1px] h-3 bg-gray-300 mx-1 opacity-20"></div>}

                    <div className="flex items-center gap-0.5">
                        {dropdownControls}
                    </div>

                    <div className="flex items-center">
                        <button
                            onClick={onReset}
                            className={`flex items-center justify-center w-7 h-7 rounded-md text-[10px] transition-all duration-200 ${hasActiveFilters ? 'text-danger hover:bg-danger/10' : 'opacity-0 pointer-events-none'}`}
                            title="Xóa tất cả bộ lọc"
                        >
                            <i className="fas fa-rotate-left"></i>
                        </button>
                    </div>

                    <div className="w-[1px] h-3 bg-gray-300 mx-1 opacity-20"></div>

                    {dateRangeEnabled && (
                        <div className="relative" ref={datePickerRef}>
                            <button
                                onClick={() => setIsDatePopoverOpen(!isDatePopoverOpen)}
                                className={`h-7 px-2 rounded-md text-[10px] font-medium transition-all flex items-center gap-1.5 ${((dateValue.start && dateValue.end) || isDatePopoverOpen) ? 'bg-white text-accent-primary shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
                            >
                                <i className="fas fa-calendar-alt opacity-70 text-[9px]"></i>
                                <span>{dateValue.start && dateValue.end ? `${moment(dateValue.start).format('DD/MM')} - ${moment(dateValue.end).format('DD/MM')}` : 'Ngày'}</span>
                            </button>
                            {isDatePopoverOpen && (
                                <div className="absolute top-full mt-2 right-0 z-20 bg-white p-3 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-gray-100 min-w-[240px] animate-in fade-in zoom-in-95 duration-150">
                                    <div className="space-y-2">
                                        <DatePicker label="Từ ngày" value={dateValue.start} onChange={(val) => handleDateChange('start', val)} />
                                        <DatePicker label="Đến ngày" value={dateValue.end} onChange={(val) => handleDateChange('end', val)} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {!hideSearch && (
                        <div className="relative flex-grow min-w-[200px] lg:min-w-[300px]">
                            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input
                                type="text"
                                placeholder={searchPlaceholder}
                                value={localKeyword}
                                onChange={(e) => setLocalKeyword(e.target.value)}
                                className="w-full h-10 pl-11 pr-4 bg-white border border-border-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all font-medium text-text-primary"
                            />
                        </div>
                    )}
                    {dropdownControls}
                    <Button onClick={onReset} variant="danger" className={`!p-0 w-10 h-10 rounded-xl transition-all ${hasActiveFilters ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}><i className="fas fa-times"></i></Button>
                </>
            )}

            <div className={`flex items-center gap-1.5 ml-auto`}>
                {extraActionButton}
                <div className={`px-2 py-1 rounded-md ${variant === 'modern' ? 'bg-transparent' : 'bg-slate-100'}`}>
                    <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap">
                        <span className="text-accent-primary mr-1">{totalCount}</span>Kết quả
                    </span>
                </div>

                {viewSwitcherEnabled && (
                    <div className="view-switcher-group flex gap-0.5 p-0.5 bg-transparent border border-gray-100 rounded-md">
                        <button onClick={() => onViewChange?.('table')} className={`w-6 h-6 flex items-center justify-center rounded transition-all ${activeView === 'table' ? 'bg-gray-100 text-accent-primary' : 'text-gray-300 hover:text-gray-500'}`}><i className="fas fa-list text-[9px]"></i></button>
                        <button onClick={() => onViewChange?.('grid')} className={`w-6 h-6 flex items-center justify-center rounded transition-all ${activeView === 'grid' ? 'bg-gray-100 text-accent-primary' : 'text-gray-300 hover:text-gray-500'}`}><i className="fas fa-th-large text-[9px]"></i></button>
                    </div>
                )}

                <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${variant === 'modern' ? 'bg-transparent text-slate-400 hover:text-accent-primary hover:bg-gray-50' : 'bg-white'}`}
                >
                    <i className={`fas fa-sync-alt text-[10px] ${isLoading ? 'animate-spin' : ''}`}></i>
                </button>
            </div>
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
            {/* --- Mobile View --- */}
            <div className={`md:hidden flex w-full items-center gap-3 ${plain ? '' : ''}`}>
                {!hideSearch && (
                    <div className="relative flex-grow flex items-center min-w-0">
                        <div className="absolute left-3 text-gray-400 z-10">
                            <i className="fas fa-search text-sm"></i>
                        </div>
                        <input
                            type="text"
                            id="search-input-mobile"
                            placeholder={searchPlaceholder}
                            value={localKeyword}
                            onChange={(e) => setLocalKeyword(e.target.value)}
                            className="w-full h-10 pl-10 pr-9 py-2 relative focus:outline-none text-text-primary placeholder:text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-100 focus:bg-white focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/10 transition-all duration-300"
                        />
                        {localKeyword && (
                            <button
                                onClick={() => { setLocalKeyword(''); onFilterChange({ keyword: '' }); }}
                                className="absolute right-3 text-gray-400 hover:text-danger w-6 h-6 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors"
                            >
                                <i className="fas fa-times-circle text-xs"></i>
                            </button>
                        )}
                    </div>
                )}
                <Button onClick={() => setIsMobilePanelOpen(true)} variant="ghost" className={`flex-shrink-0 w-10 h-10 relative !p-0 rounded-xl border border-gray-100 bg-white ${activeFilters.length > 0 ? 'border-accent-primary/30 text-accent-primary bg-accent-primary/5' : 'text-gray-500'}`}>
                    <i className="fas fa-filter text-sm"></i>
                    {activeFilters.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm">{activeFilters.length}</span>
                    )}
                </Button>
                <Button onClick={onRefresh} disabled={isLoading} variant="ghost" className="flex-shrink-0 w-10 h-10 !p-0 rounded-xl border border-gray-100 bg-white text-gray-500 hover:text-accent-primary hover:bg-gray-50" aria-label="Làm mới" title="Làm mới">
                    <i className={`fas fa-sync-alt text-sm ${isLoading ? 'animate-spin' : ''}`}></i>
                </Button>
            </div>

            {/* --- Mobile Filter Panel (Modal) --- */}
            {isMobilePanelOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex flex-col justify-end md:hidden" onClick={() => setIsMobilePanelOpen(false)}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

                    {/* Content */}
                    <div className="relative z-10 bg-white rounded-t-3xl p-5 animate-slide-up-mobile flex flex-col max-h-[85vh] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5 pb-0 flex-shrink-0">
                            <div>
                                <h3 className="font-bold text-xl text-slate-800">Bộ Lọc</h3>
                                <p className="text-xs text-slate-500 mt-1">Tùy chỉnh hiển thị danh sách</p>
                            </div>
                            <Button onClick={() => setIsMobilePanelOpen(false)} variant="ghost" className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200 !p-0 transition-transform active:scale-95"><i className="fas fa-times"></i></Button>
                        </div>

                        <div className="space-y-4 overflow-y-auto px-1 -mx-1 custom-scrollbar py-2 flex-grow">
                            {(dateRangeEnabled || dateFilterEnabled) && (
                                <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                            <i className="fas fa-calendar-alt text-xs"></i>
                                        </div>
                                        <label className="text-sm font-bold text-slate-700">{dateRangeEnabled ? 'Khoảng Thời Gian' : 'Ngày'}</label>
                                    </div>
                                    <div className={`grid ${dateRangeEnabled ? 'grid-cols-2 gap-3' : 'grid-cols-1'}`}>
                                        <DatePicker label={dateRangeEnabled ? 'Từ ngày' : 'Chọn ngày'} value={dateValue.start} onChange={(val) => handleDateChange('start', val)} />
                                        {dateRangeEnabled && <DatePicker label="Đến ngày" value={dateValue.end} onChange={(val) => handleDateChange('end', val)} />}
                                    </div>
                                </div>
                            )}

                            {dropdowns.map(dropdown => {
                                const isExpanded = expandedMobileFilters.includes(dropdown.id);
                                const hasSelection = (filters[dropdown.key] as string[])?.length > 0;
                                const selectionCount = (filters[dropdown.key] as string[])?.length || 0;

                                return (
                                    <div key={'mobile-' + dropdown.id} className={`border rounded-2xl transition-all duration-300 overflow-hidden ${isExpanded ? 'bg-white border-accent-primary/40 shadow-md shadow-accent-primary/5' : 'bg-white border-gray-100'}`}>
                                        <button
                                            type="button"
                                            onClick={() => toggleMobileFilter(dropdown.id)}
                                            className="flex items-center justify-between w-full p-4 text-left group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${hasSelection ? 'bg-accent-primary text-white shadow-md shadow-accent-primary/30' : 'bg-gray-50 text-gray-400 group-hover:bg-accent-primary/10 group-hover:text-accent-primary'}`}>
                                                    <i className={`fas ${dropdown.icon} text-sm`}></i>
                                                </div>
                                                <div>
                                                    <span className={`text-sm font-bold transition-colors block ${hasSelection ? 'text-accent-primary' : 'text-slate-700 group-hover:text-slate-900'}`}>{dropdown.label}</span>
                                                    {hasSelection ? (
                                                        <div className="text-[11px] text-accent-primary/80 font-medium mt-0.5">Đã chọn {selectionCount}</div>
                                                    ) : (
                                                        <div className="text-[11px] text-gray-400 mt-0.5">Tất cả</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 border ${isExpanded ? 'rotate-180 bg-accent-primary/10 text-accent-primary border-accent-primary/20' : 'bg-white text-gray-300 border-gray-100'}`}>
                                                <i className="fas fa-chevron-down text-xs"></i>
                                            </div>
                                        </button>

                                        <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                            <div className="overflow-hidden">
                                                <div className="p-4 pt-0 border-t border-dashed border-gray-100">
                                                    <div className="mt-4">
                                                        <MultiSelectDropdown
                                                            id={'mobile-' + dropdown.id}
                                                            label={dropdown.label}
                                                            options={dropdown.options}
                                                            selectedOptions={(filters[dropdown.key] || []) as string[]}
                                                            onChange={(selected) => onFilterChange({ [dropdown.key]: selected })}
                                                            icon={dropdown.icon}
                                                            displayMode={dropdown.displayMode}
                                                            size="default"
                                                            mode="chips"
                                                            searchable={false}
                                                            variant="modern"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 flex-shrink-0">
                            <Button onClick={() => { onReset(); }} disabled={!hasActiveFilters} variant="secondary" fullWidth className="rounded-xl h-12 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-slate-600 border-none">
                                Xóa Lọc ({activeFilters.length})
                            </Button>
                            <Button onClick={() => setIsMobilePanelOpen(false)} variant="primary" fullWidth className="rounded-xl h-12 text-sm font-bold shadow-lg shadow-accent-primary/25">
                                Xem {totalCount} kết quả
                            </Button>
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