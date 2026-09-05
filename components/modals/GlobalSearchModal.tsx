import React, { useState, useMemo, useEffect } from 'react';
import { globalSearch } from '../../services/apiService';

interface GlobalSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectItem?: (item: any, category: string) => void;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onSelectItem }) => {
    const [keyword, setKeyword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<Record<string, any[]> | null>(null);
    const [executionTime, setExecutionTime] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<string>('all');
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('global_recent_searches');
        if (saved) {
            try { setRecentSearches(JSON.parse(saved)); } catch(e){}
        }
    }, []);

    const saveRecentSearch = (kw: string) => {
        if (!kw.trim()) return;
        const updated = [kw, ...recentSearches.filter(s => s !== kw)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('global_recent_searches', JSON.stringify(updated));
    };

    const filteredCategories = useMemo(() => {
        if (!results) return [];
        const cats = Object.keys(results);
        if (activeTab === 'all') return cats;
        return cats.filter(c => c === activeTab);
    }, [results, activeTab]);

    useEffect(() => {
        if (!isOpen) {
            setKeyword('');
            setResults(null);
            setExecutionTime(null);
            setActiveTab('all');
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!isOpen) return null;

    const handleSearch = async (searchKeyword = keyword) => {
        if (typeof searchKeyword !== 'string' || !searchKeyword.trim()) return;
        if (searchKeyword !== keyword) setKeyword(searchKeyword);
        setIsLoading(true);
        setResults(null);
        setExecutionTime(null);
        saveRecentSearch(searchKeyword);

        try {
            const startTime = performance.now();
            const response = await globalSearch(searchKeyword, 'all');
            if (response && response.status === "SUCCESS" && response.data) {
                setResults(response.data);
                setExecutionTime(Number(((performance.now() - startTime) / 1000).toFixed(2)));
            }
            setIsLoading(false);
        } catch (error) {
            console.error("Search error:", error);
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch(keyword);
    };

    const getStatusStyle = (status: string) => {
        const s = status?.toLowerCase() || '';
        if (s.includes('đã xuất') || s.includes('thành công') || s.includes('phê duyệt')) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (s.includes('chờ') || s.includes('đang')) return 'text-amber-600 bg-amber-50 border-amber-100';
        if (s.includes('hủy') || s.includes('từ chối')) return 'text-rose-600 bg-rose-50 border-rose-100';
        return 'text-slate-600 bg-slate-50 border-slate-100';
    };

    const renderValue = (key: string, value: any) => {
        if (!value) return <span className="text-slate-300">—</span>;
        const str = String(value);

        if (str.startsWith('{') || str.startsWith('[')) {
            try {
                const parsed = JSON.parse(str);
                return (
                    <div className="flex flex-wrap gap-1.5">
                        {Object.entries(parsed).map(([name, url]: [string, any]) => (
                            <a key={name} href={String(url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors text-[10px] font-bold">
                                <i className="fas fa-link scale-75"></i> {name}
                            </a>
                        ))}
                    </div>
                );
            } catch (e) { /* ignore */ }
        }

        if (key.toLowerCase().includes('kết quả') || key.toLowerCase().includes('trạng thái')) {
            return (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusStyle(str)}`}>
                    {str}
                </span>
            );
        }

        return <span className="text-slate-700 font-medium">{str}</span>;
    };

    const getIcon = (category: string) => {
        switch (category) {
            case 'Đơn hàng': return 'fa-file-invoice text-blue-500';
            case 'Dữ liệu lưu trữ': return 'fa-history text-amber-500';
            case 'Kho xe': return 'fa-car text-indigo-500';
            case 'Yêu cầu hóa đơn': return 'fa-file-alt text-emerald-500';
            case 'Yêu cầu VinClub': return 'fa-star text-purple-500';
            default: return 'fa-database text-slate-400';
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex font-sans">
            {/* Backdrop with slight dim */}
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            {/* Content Drawer (Slide in from Right) */}
            <div className="absolute right-0 top-0 bottom-0 flex flex-col w-full sm:w-[450px] lg:w-[500px] bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.1)] animate-slide-in-right overflow-hidden">

                {/* Search Bar Block */}
                <div className="flex flex-col flex-shrink-0 bg-white border-b border-slate-100 relative z-10 shadow-sm">
                    {/* Search Input Row (Drawer Style) */}
                    <div className="relative flex items-center px-6 py-5">
                        <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-search'} text-xl text-indigo-500`}></i>
                        <input
                            type="text"
                            className="w-full pl-4 pr-12 py-2 bg-transparent outline-none transition-all text-slate-800 placeholder:text-slate-300 text-lg font-medium"
                            placeholder="Nhập từ khóa tìm kiếm..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                        {executionTime !== null && (
                            <div className="absolute right-16 flex flex-col items-end opacity-40">
                                <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase">Latency</span>
                                <span className="text-xs font-black text-slate-600 leading-none">{executionTime}s</span>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="absolute right-4 w-8 h-8 rounded-full hover:bg-slate-100 transition-all text-slate-400 flex items-center justify-center active:scale-90"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    {/* Filter Tabs */}
                    {results && (
                        <div className="px-6 py-3 bg-slate-50 flex gap-2 items-center overflow-x-auto no-scrollbar border-t border-b border-slate-100">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition-all ${activeTab === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
                            >
                                Tất cả ({Object.values(results).reduce((a, c) => a + c.length, 0)})
                            </button>
                            {Object.keys(results).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveTab(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition-all ${activeTab === cat ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
                                >
                                    {cat} ({results[cat].length})
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Results Workspace */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6 md:p-8 pb-20">

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 md:py-32">
                                <div className="relative w-12 h-12 md:w-16 md:h-16">
                                    <div className="absolute inset-0 rounded-full border-[3px] border-slate-200 border-t-indigo-600 animate-spin"></div>
                                </div>
                                <h3 className="mt-6 text-sm font-bold text-slate-800 tracking-widest uppercase animate-pulse">Đang tìm dữ liệu...</h3>
                            </div>
                        ) : !results ? (
                            <div className="animate-fade-in-up">
                                <div className="grid grid-cols-1 gap-6 mt-6">
                                    {/* Recent Searches */}
                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                                                <i className="fas fa-history"></i>
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Tìm kiếm gần đây</h3>
                                        </div>
                                        {recentSearches.length > 0 ? (
                                            <div className="space-y-2">
                                                {recentSearches.map((rs, i) => (
                                                    <button key={i} onClick={() => handleSearch(rs)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group">
                                                        <i className="fas fa-clock text-slate-300 group-hover:text-emerald-500 transition-colors"></i>
                                                        <span className="text-sm font-semibold text-slate-600 flex-grow">{rs}</span>
                                                        <i className="fas fa-arrow-right text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all"></i>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="h-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                                                <span className="text-xs font-bold text-slate-400">Chưa có lịch sử</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-center mt-12 gap-8 opacity-40">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <kbd className="px-2 py-1 bg-slate-200 rounded text-slate-600 font-mono shadow-sm">↵</kbd> Tìm kiếm
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <kbd className="px-2 py-1 bg-slate-200 rounded text-slate-600 font-mono shadow-sm">ESC</kbd> Đóng
                                    </div>
                                </div>
                            </div>
                        ) : filteredCategories.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl mb-4">
                                    <i className="fas fa-ghost"></i>
                                </div>
                                <h3 className="text-lg font-bold text-slate-600 uppercase tracking-widest">Không có kết quả</h3>
                                <p className="mt-2 text-xs font-bold text-slate-400 text-center px-4">Từ khóa "{keyword}" không khớp với bất kỳ dữ liệu nào</p>
                            </div>
                        ) : (
                            <div className="space-y-10 md:space-y-16">
                                {filteredCategories.map(cat => (
                                    <div key={cat} className="space-y-4 md:space-y-6">
                                        <div className="flex items-center gap-3 px-2">
                                            <i className={`fas ${getIcon(cat)} text-sm text-indigo-500`}></i>
                                            <h3 className="font-bold text-slate-900 text-base md:text-lg">{cat}</h3>
                                            <div className="h-px bg-slate-200 flex-grow mx-4"></div>
                                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg uppercase">{results[cat].length} kết quả</span>
                                        </div>
                                        <div className="flex flex-col gap-8 md:gap-10">
                                            {results[cat].map((row: any, idx: number) => {
                                                const keys = Object.keys(row);
                                                let titleKey = keys.find(k => k.toLowerCase().includes('số đơn') || k.toLowerCase() === 'vin' || k.toLowerCase().includes('khách hàng'));
                                                if (!titleKey) titleKey = keys[0];
                                                
                                                const title = row[titleKey];
                                                const snippetEntries = Object.entries(row).filter(([k]) => k !== titleKey);

                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={() => onSelectItem?.(row, cat)}
                                                        className="group cursor-pointer flex flex-col gap-1"
                                                    >
                                                        {/* Breadcrumb */}
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
                                                            <i className={`fas ${getIcon(cat)} text-[10px]`}></i>
                                                            <span className="font-medium">VinFast System <span className="mx-1 text-slate-300">›</span> {cat}</span>
                                                        </div>
                                                        
                                                        {/* Blue Title */}
                                                        <h3 className="text-lg md:text-[20px] leading-tight font-medium text-[#1a0dab] group-hover:underline truncate mb-1">
                                                            {titleKey}: {title}
                                                        </h3>
                                                        
                                                        {/* Snippet */}
                                                        <div className="text-sm text-[#4d5156] flex flex-wrap items-center gap-x-4 gap-y-2">
                                                            {snippetEntries.map(([k, v]) => (
                                                                <div key={k} className="flex items-center gap-1.5">
                                                                    <span className="font-semibold text-slate-600">{k}:</span>
                                                                    <div className="truncate max-w-[250px]">{renderValue(k, v)}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in-right {
                    animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};


export default GlobalSearchModal;
