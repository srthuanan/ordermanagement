import React, { useState, useEffect, useRef } from 'react';
import { useNightMode } from '../../hooks/useNightMode';

interface Tab {
    id: string;
    label: string;
    count?: number;
}

interface TabbedFilterProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (id: string) => void;
    tabsExtra?: React.ReactNode;

    // Search
    searchPlaceholder?: string;
    searchValue: string;
    onSearchChange: (value: string) => void;

    // View Mode
    viewMode?: 'grid' | 'list';
    onViewModeChange?: (mode: 'grid' | 'list') => void;

    // Secondary Filters (rendered as children)
    children?: React.ReactNode;

    // Actions
    onReset: () => void;
    canReset?: boolean;
    extraActions?: React.ReactNode;
}

const TabbedFilter: React.FC<TabbedFilterProps> = ({
    tabs,
    activeTab,
    onTabChange,
    tabsExtra,
    searchPlaceholder = "Tìm hồ sơ...",
    searchValue,
    onSearchChange,
    children,
    onReset,
    canReset = false,
    extraActions
}) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const isNight = useNightMode();

    // Local state for debounced search
    const [localSearch, setLocalSearch] = useState(searchValue);
    const searchTimeoutRef = useRef<number | null>(null);

    // Sync local search when external searchValue changes (e.g. on reset)
    useEffect(() => {
        setLocalSearch(searchValue);
    }, [searchValue]);

    const handleSearchChange = (val: string) => {
        setLocalSearch(val);

        if (searchTimeoutRef.current) {
            window.clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = window.setTimeout(() => {
            onSearchChange(val);
        }, 300);
    };

    const handleClearSearch = () => {
        setLocalSearch('');
        onSearchChange('');
    };

    const tabsContainerRef = useRef<HTMLDivElement>(null);

    const handleTabsWheel = (e: React.WheelEvent) => {
        if (tabsContainerRef.current && e.deltaY !== 0) {
            tabsContainerRef.current.scrollLeft += e.deltaY;
        }
    };

    return (
        <div className="w-full mb-1.5">
            {/* Automotive Cockpit Rail: Ultra-modern floating frosted glass toolbar */}
            <div className={`relative flex flex-col lg:flex-row lg:items-center justify-between gap-1.5 p-1 lg:p-1 rounded-2xl border backdrop-blur-2xl transition-all duration-300 ${
                isNight
                    ? 'bg-slate-900/80 border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] text-slate-100'
                    : 'bg-white/85 border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] text-slate-800'
            }`}>

                {/* Left Track: Model Rail + Extra Metric Pills */}
                <div className="flex items-center justify-between gap-1.5 min-w-0 flex-1">
                    <div 
                        ref={tabsContainerRef}
                        onWheel={handleTabsWheel}
                        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0 scroll-smooth py-0.5"
                    >
                        {/* Segmented Model Track Capsule */}
                        <div className={`flex items-center gap-1 p-0.5 rounded-xl border transition-colors ${
                            isNight
                                ? 'bg-slate-800/80 border-slate-700/60'
                                : 'bg-slate-100/80 border-slate-200/60'
                        }`}>
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => onTabChange(tab.id)}
                                        className={`
                                            relative flex items-center gap-1.5 px-2.5 py-1 lg:px-2 lg:py-0.5 text-[11px] lg:text-[10px] font-semibold rounded-lg transition-all duration-200 outline-none whitespace-nowrap min-h-[26px] lg:min-h-0 select-none
                                            ${isActive
                                                ? (isNight
                                                    ? 'bg-white text-slate-950 shadow-sm font-bold scale-[1.02]'
                                                    : 'bg-slate-900 text-white shadow-sm font-bold scale-[1.02]')
                                                : (isNight
                                                    ? 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80')
                                            }
                                        `}
                                    >
                                        <span className="tracking-tight">{tab.label}</span>
                                        {tab.count !== undefined && (
                                            <span className={`text-[8.5px] lg:text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-full transition-colors ${
                                                isActive
                                                    ? (isNight ? 'bg-slate-950/15 text-slate-900' : 'bg-white/20 text-white')
                                                    : (isNight ? 'bg-slate-700/80 text-slate-300' : 'bg-slate-200/80 text-slate-600')
                                            }`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Extra Actions attached to Tab Rail (e.g., Fleet Stats Button) */}
                        {tabsExtra && (
                            <div className="flex items-center flex-shrink-0 ml-1">
                                {tabsExtra}
                            </div>
                        )}
                    </div>

                    {/* Mobile Filter Toggle Button */}
                    <div className="lg:hidden flex items-center gap-1 flex-shrink-0">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className={`flex items-center gap-1.5 px-2.5 h-[32px] rounded-xl text-[11px] font-medium transition-all border active:scale-95 ${
                                canReset 
                                    ? 'bg-slate-700 text-white border-slate-700 shadow-2xs' 
                                    : 'bg-slate-100/90 text-slate-700 border-slate-200/80 hover:bg-slate-200/70'
                            }`}
                        >
                            <i className="fas fa-sliders text-[10px]"></i>
                            <span>Lọc</span>
                            {canReset && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Desktop Track: Search, Facet Dropdowns, Reset (100% Untouched for Laptop/Desktop) */}
                <div className="hidden lg:flex flex-row items-center gap-1.5 flex-shrink-0 w-auto">
                    {/* Divider on desktop */}
                    <div className="h-4 w-px bg-slate-200/80 dark:bg-slate-700/80 flex-shrink-0 mx-0.5"></div>

                    {/* Integrated Cockpit Search Pill */}
                    <div className="relative flex items-center w-auto min-w-0">
                        <div className={`relative flex items-center w-28 xl:w-36 h-[26px] px-2 rounded-xl border transition-all ${
                            isNight
                                ? 'bg-slate-800/80 border-slate-700 focus-within:border-white focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-white/10'
                                : 'bg-slate-100/75 border-slate-200/80 focus-within:border-slate-900 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-900/10'
                        }`}>
                            <i className="fas fa-search text-slate-400 text-[10px] mr-1.5 flex-shrink-0"></i>
                            <input
                                type="text"
                                placeholder={searchPlaceholder}
                                value={localSearch}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className={`w-full bg-transparent border-none outline-none text-[10px] font-medium p-0 placeholder:text-slate-400 ${
                                    isNight ? 'text-slate-100' : 'text-slate-900'
                                }`}
                            />
                            {localSearch && (
                                <button 
                                    onClick={handleClearSearch} 
                                    className="text-slate-400 hover:text-rose-500 ml-1 flex-shrink-0 transition-colors"
                                    title="Xoá tìm kiếm"
                                >
                                    <i className="fas fa-circle-xmark text-[10px]"></i>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Secondary Dropdown Facets */}
                    <div className="flex items-center gap-1 flex-nowrap w-auto">
                        {children}
                    </div>

                    {/* Extra Actions & Reset Button */}
                    <div className="flex items-center gap-1 w-auto border-slate-100 dark:border-slate-800 flex-shrink-0">
                        {extraActions && (
                            <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-1 h-5">
                                {extraActions}
                            </div>
                        )}

                        {canReset && (
                            <button
                                onClick={onReset}
                                className={`h-[26px] w-[26px] flex items-center justify-center rounded-xl border transition-all duration-200 active:scale-90 group ${
                                    isNight
                                        ? 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10'
                                        : 'bg-slate-100/80 border-slate-200/70 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50'
                                }`}
                                title="Làm mới tất cả bộ lọc"
                            >
                                <i className="fas fa-arrow-rotate-right text-[10px] group-hover:rotate-180 transition-transform duration-500"></i>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 🍏 APPLE IOS FILTER BOTTOM SHEET FOR MOBILE (ĐỒNG BỘ CHUẨN XÁM ĐẬM NHỎ GỌN) */}
            {/* ========================================================================= */}
            {isMobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    {/* Sheet Container */}
                    <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col max-h-[60dvh] animate-in slide-in-from-bottom duration-250 overflow-hidden text-slate-800">
                        {/* Grab handle */}
                        <div className="pt-2 pb-0.5 flex justify-center">
                            <div className="w-8 h-1 rounded-full bg-slate-300" />
                        </div>

                        {/* Navigation Header */}
                        <div className="px-4 py-1.5 border-b border-black/[0.06] flex items-center justify-between">
                            <div className="w-16 flex justify-start">
                                {canReset ? (
                                    <button
                                        onClick={() => {
                                            onReset();
                                            handleClearSearch();
                                        }}
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
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="text-[13.5px] font-bold text-slate-700 hover:text-slate-900 active:opacity-60 transition-opacity"
                                >
                                    Xong
                                </button>
                            </div>
                        </div>

                        {/* Content Scrollable */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 no-scrollbar">
                            {/* Ô tìm kiếm nhỏ gọn */}
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 px-0.5">
                                    Tìm kiếm
                                </span>
                                <div className="relative flex items-center w-full h-[34px] px-2.5 rounded-xl bg-slate-100/90 border border-slate-200/80 focus-within:border-slate-400 focus-within:bg-white transition-all">
                                    <i className="fas fa-search text-slate-400 text-xs mr-2 flex-shrink-0"></i>
                                    <input
                                        type="text"
                                        placeholder={searchPlaceholder}
                                        value={localSearch}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        className="w-full bg-transparent border-none outline-none text-[11.5px] font-medium text-slate-800 placeholder:text-slate-400"
                                    />
                                    {localSearch && (
                                        <button
                                            onClick={handleClearSearch}
                                            className="text-slate-400 hover:text-slate-600 ml-1 flex-shrink-0"
                                        >
                                            <i className="fas fa-circle-xmark text-xs"></i>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Dòng xe / Phân loại Tabs */}
                            {tabs && tabs.length > 0 && (
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 px-0.5">
                                        Phân loại / Dòng xe
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {tabs.map((tab) => {
                                            const isActive = activeTab === tab.id;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => onTabChange(tab.id)}
                                                    className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border ${
                                                        isActive
                                                            ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                                            : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                                    }`}
                                                >
                                                    <span>{tab.label}</span>
                                                    {tab.count !== undefined && (
                                                        <span
                                                            className={`text-[9.5px] font-normal ${
                                                                isActive ? 'text-slate-200' : 'text-slate-400'
                                                            }`}
                                                        >
                                                            {tab.count}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Tiêu chí lọc phụ (Dropdowns) */}
                            {children && (
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 px-0.5">
                                        Tiêu chí chi tiết
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {children}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom CTA Button */}
                        <div className="p-3 border-t border-black/[0.06] bg-white">
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="w-full h-[38px] rounded-full bg-slate-700 hover:bg-slate-800 text-white font-semibold text-[13px] tracking-tight shadow-xs active:scale-[0.98] transition-all flex items-center justify-center space-x-1"
                            >
                                <span>Xong</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(TabbedFilter);
