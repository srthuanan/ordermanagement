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

    const handleSearch = async () => {
        if (!keyword.trim()) return;
        setIsLoading(true);
        setResults(null);
        setExecutionTime(null);

        try {
            const startTime = performance.now();
            const response = await globalSearch(keyword, 'all');
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
        if (e.key === 'Enter') handleSearch();
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
        <div className="fixed inset-0 z-[9999] flex flex-col animate-fade-in overflow-hidden font-sans">
            {/* Backdrop with semi-transparent blur */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>

            {/* Content Container */}
            <div className="relative flex flex-col w-full h-full md:h-[90%] md:w-[95%] md:max-w-7xl mx-auto md:my-auto bg-white md:rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-500">

                {/* Header Section */}
                <div className="flex flex-col flex-shrink-0 bg-white border-b border-slate-100">
                    {/* Top Row: Logo & Close Button */}
                    <div className="px-4 md:px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                <i className="fas fa-search text-lg md:text-xl"></i>
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none">TÌM KIẾM</h2>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 tracking-wider uppercase opacity-70">Toàn Hệ Thống</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-4">
                            {executionTime !== null && (
                                <div className="hidden sm:flex flex-col items-end opacity-40">
                                    <span className="text-[9px] font-black tracking-tighter text-slate-400">LATENCY</span>
                                    <span className="text-xs font-black text-slate-600 leading-none">{executionTime}s</span>
                                </div>
                            )}
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-500 transition-all text-slate-500 flex items-center justify-center border border-transparent active:scale-90"
                            >
                                <i className="fas fa-times text-lg"></i>
                            </button>
                        </div>
                    </div>

                    {/* Search Input Row */}
                    <div className="px-4 md:px-8 pb-4 md:pb-6">
                        <div className="relative group">
                            <input
                                type="text"
                                className="w-full pl-12 pr-28 py-4 bg-slate-100/80 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-slate-800 placeholder:text-slate-400 font-semibold"
                                placeholder="Mã VIN, Số đơn hàng, Khách hàng..."
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                            />
                            <div className="absolute left-4 inset-y-0 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500">
                                <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-search'} text-lg`}></i>
                            </div>
                            <div className="absolute right-2 inset-y-2 flex items-center">
                                <button
                                    onClick={handleSearch}
                                    disabled={isLoading || keyword.trim().length < 2}
                                    className="h-full px-4 md:px-6 bg-slate-900 hover:bg-indigo-600 disabled:opacity-30 disabled:hover:bg-slate-900 text-white rounded-xl text-[11px] font-bold tracking-widest transition-all active:scale-95 shadow-sm"
                                >
                                    {isLoading ? '...' : 'TÌM'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    {results && (
                        <div className="px-4 md:px-8 py-2 bg-slate-50 flex gap-2 items-center overflow-x-auto no-scrollbar border-t border-slate-50">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider whitespace-nowrap transition-all uppercase ${activeTab === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 bg-white border border-slate-200'}`}
                            >
                                Tất cả ({Object.values(results).reduce((a, c) => a + c.length, 0)})
                            </button>
                            {Object.keys(results).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveTab(cat)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider whitespace-nowrap transition-all uppercase border ${activeTab === cat ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'text-slate-500 bg-white border-slate-200'}`}
                                >
                                    {cat} ({results[cat].length})
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Results Workspace */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/30">
                    <div className="max-w-5xl mx-auto space-y-8 md:space-y-12 pb-20">

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 md:py-32">
                                <div className="relative w-12 h-12 md:w-16 md:h-16">
                                    <div className="absolute inset-0 rounded-full border-[3px] border-slate-200 border-t-indigo-600 animate-spin"></div>
                                </div>
                                <h3 className="mt-6 text-sm font-bold text-slate-800 tracking-widest uppercase animate-pulse">Đang tìm dữ liệu...</h3>
                            </div>
                        ) : !results ? (
                            <div className="flex flex-col items-center justify-center py-20 md:py-32 opacity-30">
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                                    <i className="fas fa-search-plus text-4xl text-slate-400"></i>
                                </div>
                                <h3 className="text-lg md:text-xl font-bold text-slate-500 uppercase tracking-widest">Sẵn sàng tìm kiếm</h3>
                                <p className="text-sm font-medium mt-2 text-slate-400 text-center px-4">Nhập từ khóa để tra cứu dữ liệu từ hệ thống</p>
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

                                        <div className="grid grid-cols-1 gap-3 md:gap-4">
                                            {results[cat].map((row: any, idx: number) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => onSelectItem?.(row, cat)}
                                                    className="group bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex items-center gap-4 md:gap-8 relative overflow-hidden"
                                                >
                                                    <div className="absolute left-0 inset-y-0 w-1 bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                                    <div className="flex-grow grid grid-cols-2 md:grid-cols-4 gap-x-4 md:gap-x-10 gap-y-4 md:gap-y-6">
                                                        {Object.entries(row).map(([key, value]) => (
                                                            <div key={key} className="flex flex-col min-w-0">
                                                                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1 leading-none">{key}</span>
                                                                <div className="text-[13px] md:text-sm truncate">
                                                                    {renderValue(key, value)}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="flex-shrink-0">
                                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center justify-center text-slate-300 border border-slate-100 active:scale-90">
                                                            <i className="fas fa-chevron-right text-xs"></i>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Section */}
                <div className="hidden md:flex px-8 py-3 bg-slate-900 text-indigo-200/40 text-[9px] font-bold tracking-[0.2em] uppercase items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Encrypted Connection Active
                    </div>
                    <div className="flex gap-8">
                        <span>CLUSTER: VN-SOUTH-01</span>
                        <span className="opacity-60">REF: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                    </div>
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};


export default GlobalSearchModal;
