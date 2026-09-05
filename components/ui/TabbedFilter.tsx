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

    return (
        <div className="w-full mb-1">
            {/* Main Toolbar Container: Glassmorphism header with clean light mode styling */}
            <div className={`flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-1.5 p-1.5 lg:p-1 border backdrop-blur-xl rounded-xl shadow-sm transition-all duration-300 ${
                isNight
                    ? 'bg-slate-900/60 border-slate-700/60 text-slate-100'
                    : 'bg-white/75 border-slate-200/70 text-slate-800'
            }`}>

                {/* Header Row on Mobile: Tabs + Filter Toggle */}
                <div className="flex items-center justify-between gap-2 lg:contents">
                    {/* 1. Tabs Group - Glassmorphic pills & Extra button */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0 max-w-[calc(100%-100px)] lg:max-w-none">
                        <div className={`flex items-center gap-1 ${isNight ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-slate-100/70 border border-slate-200/50'} rounded-lg p-1`}>
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => onTabChange(tab.id)}
                                    className={`
                                        flex items-center gap-1.5 px-3.5 py-1.5 lg:py-1 text-[12px] lg:text-[11px] font-medium rounded-md transition-all duration-200 outline-none whitespace-nowrap min-h-[32px] lg:min-h-0
                                        ${activeTab === tab.id
                                            ? 'bg-gradient-to-r from-sky-600 via-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 scale-[1.02]'
                                            : (isNight ? 'text-slate-300 hover:text-cyan-300 hover:bg-slate-700/60' : 'text-slate-600 hover:text-sky-700 hover:bg-white/80')}
                                    `}
                                >
                                    {tab.label}
                                    {tab.count !== undefined && (
                                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                                            activeTab === tab.id
                                                ? 'bg-white/25 text-white'
                                                : (isNight ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600')
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {tabsExtra && (
                            <div className="flex items-center flex-shrink-0">
                                {tabsExtra}
                            </div>
                        )}
                    </div>

                    {/* Mobile Filter Toggle Button */}
                    <div className="lg:hidden flex items-center gap-1">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold transition-all border min-h-[40px] ${isMobileMenuOpen ? 'bg-sky-600 text-white border-sky-600 shadow-md' : 'bg-white text-slate-700 border-slate-200'}`}
                        >
                            <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-filter'} text-[11px]`}></i>
                            {isMobileMenuOpen ? 'Đóng' : 'Bộ Lọc'}
                        </button>
                    </div>
                </div>

                {/* 2. Search & Filters Container - Pushed right on desktop */}
                <div className={`
                    ${isMobileMenuOpen ? 'flex' : 'hidden lg:flex'} 
                    flex-col lg:flex-row items-center gap-2 lg:gap-1.5 lg:ml-auto w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 mt-1 lg:mt-0
                `}>

                    {/* Search Field */}
                    <div className="relative w-full lg:w-auto min-w-[140px] lg:min-w-0">
                        <i className="fas fa-search absolute left-3 lg:left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] lg:text-[10px]"></i>
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={localSearch}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className={`pl-8 lg:pl-7 pr-7 py-2 lg:py-1 text-[12px] lg:text-[11px] border rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none w-full lg:w-40 transition-all font-semibold placeholder:text-slate-400 ${
                                isNight
                                    ? 'bg-slate-800/80 border-slate-700 text-slate-100 focus:bg-slate-800'
                                    : 'bg-white/80 border-slate-200 text-slate-900 focus:bg-white'
                            }`}
                        />
                        {localSearch && (
                            <button onClick={handleClearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500">
                                <i className="fas fa-times-circle text-[11px] lg:text-[10px]"></i>
                            </button>
                        )}
                    </div>

                    {/* Secondary Filters Dropdowns */}
                    <div className="flex items-center gap-1.5 lg:gap-1 flex-wrap lg:flex-nowrap w-full lg:w-auto">
                        {children}
                    </div>

                    {/* Action Tools (Reset, etc.) */}
                    <div className="flex items-center gap-2 lg:gap-1 w-full lg:w-auto lg:ml-0 lg:mr-1 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-50">
                        {extraActions && (
                            <div className="flex items-center gap-2 lg:gap-1 lg:border-r border-gray-200 lg:pr-1 lg:h-5">
                                {extraActions}
                            </div>
                        )}

                        {canReset && (
                            <button
                                onClick={() => { onReset(); setIsMobileMenuOpen(false); }}
                                className="h-9 lg:h-6 px-3 lg:px-0 lg:w-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all gap-2 lg:gap-0 lg:ml-auto"
                                title="Làm mới"
                            >
                                <i className="fas fa-rotate-left text-[11px] lg:text-[10px]"></i>
                                <span className="lg:hidden text-[11px] font-bold">Làm mới</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(TabbedFilter);
