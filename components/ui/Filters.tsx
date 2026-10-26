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
    const datePickerRef = useRef<HTMLDivElement>(null);

    const dateValue = filters.dateRange || { start: '', end: '' };

    const handleDateChange = (part: 'start' | 'end', value: string) => {
        onFilterChange({ dateRange: { ...dateValue, [part]: value } });
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
            <div className={`md:hidden flex w-full items-center gap-2 ${plain ? '' : ''}`}>
                {!hideSearch && (
                    <div className="relative flex-grow flex items-center min-w-0">
                        <div className="absolute left-2.5 text-slate-400 z-10 pointer-events-none">
                            <i className="fas fa-search text-xs"></i>
                        </div>
                        <input
                            type="text"
                            id="search-input-mobile"
                            placeholder={searchPlaceholder}
                            value={localKeyword}
                            onChange={(e) => setLocalKeyword(e.target.value)}
                            className="w-full h-[32px] pl-8 pr-7 text-[11.5px] font-medium text-slate-800 placeholder:text-slate-400 bg-slate-100/90 rounded-xl border border-slate-200/80 focus:bg-white focus:border-slate-400 focus:outline-none transition-all"
                        />
                        {localKeyword && (
                            <button
                                onClick={() => { setLocalKeyword(''); onFilterChange({ keyword: '' }); }}
                                className="absolute right-2 text-slate-400 hover:text-slate-600 w-5 h-5 flex items-center justify-center rounded-full transition-colors"
                            >
                                <i className="fas fa-circle-xmark text-xs"></i>
                            </button>
                        )}
                    </div>
                )}
                <button
                    onClick={() => setIsMobilePanelOpen(true)}
                    className={`h-[32px] px-2.5 rounded-xl flex items-center space-x-1 font-medium text-[11px] transition-all active:scale-95 flex-shrink-0 border ${
                        activeFilters.length > 0
                            ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                            : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80 border-slate-200/80 shadow-2xs'
                    }`}
                >
                    <i className="fas fa-sliders text-[10px]"></i>
                    <span>Lọc</span>
                    {activeFilters.length > 0 && (
                        <span className="w-3.5 h-3.5 rounded-full bg-white text-slate-700 font-bold text-[9px] flex items-center justify-center -mr-0.5">
                            {activeFilters.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    aria-label="Làm mới"
                    title="Làm mới"
                    className="w-8 h-[32px] rounded-xl flex items-center justify-center bg-slate-100/90 border border-slate-200/80 text-slate-600 hover:text-slate-900 active:scale-90 transition-all flex-shrink-0"
                >
                    <i className={`fas fa-sync-alt text-xs ${isLoading ? 'animate-spin' : ''}`}></i>
                </button>
            </div>

            {/* --- Mobile Filter Panel (Modal Bottom Sheet iOS) --- */}
            {isMobilePanelOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex flex-col justify-end md:hidden">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                        onClick={() => setIsMobilePanelOpen(false)}
                    />

                    {/* iOS Bottom Sheet Container */}
                    <div
                        className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col max-h-[60dvh] animate-in slide-in-from-bottom duration-250 overflow-hidden text-slate-800"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Grab handle */}
                        <div className="pt-2 pb-0.5 flex justify-center">
                            <div className="w-8 h-1 rounded-full bg-slate-300" />
                        </div>

                        {/* Navigation Header */}
                        <div className="px-4 py-1.5 border-b border-black/[0.06] flex items-center justify-between">
                            <div className="w-16 flex justify-start">
                                {hasActiveFilters ? (
                                    <button
                                        onClick={() => { onReset(); }}
                                        className="text-[12.5px] font-medium text-slate-500 hover:text-slate-800 active:opacity-60 transition-opacity"
                                    >
                                        Đặt lại
                                    </button>
                                ) : (
                                    <span className="w-1" />
                                )}
                            </div>

                            <h3 className="text-[13.5px] font-bold text-slate-800 tracking-tight text-center flex-1">
                                Bộ Lọc
                            </h3>

                            <div className="w-16 flex justify-end">
                                <button
                                    onClick={() => setIsMobilePanelOpen(false)}
                                    className="text-[13.5px] font-bold text-slate-700 hover:text-slate-900 active:opacity-60 transition-opacity"
                                >
                                    Xong
                                </button>
                            </div>
                        </div>

                        {/* Content Scrollable */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 no-scrollbar">
                            {(dateRangeEnabled || dateFilterEnabled) && (
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 px-0.5">
                                        {dateRangeEnabled ? 'Khoảng Thời Gian' : 'Ngày'}
                                    </span>
                                    <div className={`grid ${dateRangeEnabled ? 'grid-cols-2 gap-2' : 'grid-cols-1'}`}>
                                        <DatePicker label={dateRangeEnabled ? 'Từ ngày' : 'Chọn ngày'} value={dateValue.start} onChange={(val) => handleDateChange('start', val)} />
                                        {dateRangeEnabled && <DatePicker label="Đến ngày" value={dateValue.end} onChange={(val) => handleDateChange('end', val)} />}
                                    </div>
                                </div>
                            )}

                            {dropdowns.map(dropdown => {
                                const hasSelection = (filters[dropdown.key] as string[])?.length > 0;
                                const selectionCount = (filters[dropdown.key] as string[])?.length || 0;

                                return (
                                    <div key={'mobile-' + dropdown.id}>
                                        <div className="flex items-center justify-between mb-1.5 px-0.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                {dropdown.label}
                                            </span>
                                            {hasSelection && (
                                                <span className="text-[10px] font-semibold text-slate-700">
                                                    Đã chọn: {selectionCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1">
                                            <MultiSelectDropdown
                                                id={'mobile-' + dropdown.id}
                                                label={dropdown.label}
                                                options={dropdown.options}
                                                selectedOptions={(filters[dropdown.key] || []) as string[]}
                                                onChange={(selected) => onFilterChange({ [dropdown.key]: selected })}
                                                icon={dropdown.icon}
                                                displayMode={dropdown.displayMode}
                                                size="compact"
                                                mode="chips"
                                                searchable={false}
                                                variant="modern"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Bottom CTA Button */}
                        <div className="p-3 border-t border-black/[0.06] bg-white">
                            <button
                                onClick={() => setIsMobilePanelOpen(false)}
                                className="w-full h-[38px] rounded-full bg-slate-700 hover:bg-slate-800 text-white font-semibold text-[13px] tracking-tight shadow-xs active:scale-[0.98] transition-all flex items-center justify-center space-x-1"
                            >
                                <span>Xem {totalCount} kết quả</span>
                            </button>
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