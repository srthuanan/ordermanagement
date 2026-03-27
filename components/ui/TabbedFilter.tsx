import React, { useState, useEffect, useRef } from 'react';

interface Tab {
    id: string;
    label: string;
    count?: number;
}

interface TabbedFilterProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (id: string) => void;

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
    searchPlaceholder = "Tìm hồ sơ...",
    searchValue,
    onSearchChange,
    children,
    onReset,
    canReset = false,
    extraActions
}) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            {/* Main Toolbar Container: Stack vertically on mobile, horizontal on desktop */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-1.5 p-1.5 lg:p-0.5 bg-white border border-blue-100/50 rounded-lg shadow-sm">

                {/* Header Row on Mobile: Tabs + Filter Toggle */}
                <div className="flex items-center justify-between gap-2 lg:contents">
                    {/* 1. Tabs Group - Scrollable on mobile, no wrap */}
                    <div className="flex items-center gap-0.5 bg-gray-50/80 rounded-md p-0.5 overflow-x-auto no-scrollbar flex-shrink-0 max-w-[calc(100%-100px)] lg:max-w-none">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`
                                    flex items-center gap-1.5 px-4 py-2.5 lg:py-1 text-[12px] lg:text-[10px] font-bold rounded transition-all duration-200 outline-none whitespace-nowrap min-h-[36px] lg:min-h-0
                                    ${activeTab === tab.id
                                        ? 'bg-white text-accent-primary shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-white/40'}
                                `}
                            >
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span className={`text-[9px] px-1 rounded-sm ${activeTab === tab.id ? 'bg-accent-primary/10 text-accent-primary' : 'bg-gray-200/60 text-gray-400'}`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Mobile Filter Toggle Button */}
                    <div className="lg:hidden flex items-center gap-1">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold transition-all border min-h-[40px] ${isMobileMenuOpen ? 'bg-accent-primary text-white border-accent-primary shadow-md' : 'bg-white text-gray-600 border-gray-100'}`}
                        >
                            <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-filter'} text-[11px]`}></i>
                            {isMobileMenuOpen ? 'Đóng' : 'Bộ Lọc'}
                        </button>
                    </div>
                </div>

                {/* 2. Search & Filters Container - Pushed right on desktop */}
                <div className={`
                    ${isMobileMenuOpen ? 'flex' : 'hidden lg:flex'} 
                    flex-col lg:flex-row items-center gap-2 lg:gap-1.5 lg:ml-auto w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-50 mt-1 lg:mt-0
                `}>

                    {/* Search Field */}
                    <div className="relative w-full lg:w-auto min-w-[120px] lg:min-w-0">
                        <i className="fas fa-search absolute left-3 lg:left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] lg:text-[9px]"></i>
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={localSearch}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-9 lg:pl-6 pr-6 py-2.5 lg:py-1 text-[12px] lg:text-[10px] border border-gray-100 rounded-md focus:ring-1 focus:ring-accent-primary/20 focus:border-accent-primary outline-none w-full lg:w-36 bg-gray-100/40 hover:bg-gray-100/60 focus:bg-white text-gray-900 transition-all font-bold placeholder:text-gray-400"
                        />
                        {localSearch && (
                            <button onClick={handleClearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500">
                                <i className="fas fa-times-circle text-[11px] lg:text-[9px]"></i>
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
