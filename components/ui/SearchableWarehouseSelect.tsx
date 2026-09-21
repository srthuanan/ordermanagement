import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CyberWarehouseItem, CYBER_POPULAR_WAREHOUSES, CYBER_OTHER_WAREHOUSES, CYBER_ALL_WAREHOUSES } from '../../constants/cyberWarehouses';
import { includesNormalized } from '../../utils/stringUtils';

interface SearchableWarehouseSelectProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    theme?: 'light' | 'dark';
    size?: 'sm' | 'md';
    customWarehouseName?: string;
    isDetected?: boolean;
    className?: string;
}

export const SearchableWarehouseSelect: React.FC<SearchableWarehouseSelectProps> = ({
    value,
    onChange,
    placeholder = 'Chọn kho...',
    disabled = false,
    theme = 'light',
    size = 'sm',
    customWarehouseName = '',
    isDetected = false,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Tìm item hiện tại
    const selectedItem = useMemo(() => {
        const found = CYBER_ALL_WAREHOUSES.find(w => w.id === value);
        if (found) return found;
        if (value) {
            return {
                id: value,
                name: customWarehouseName ? `${value} – ${customWarehouseName}` : value,
                shortName: customWarehouseName || value,
                isPopular: false
            };
        }
        return null;
    }, [value, customWarehouseName]);

    // Xử lý click ngoài để đóng
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus vào input khi mở dropdown
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        } else {
            setSearchTerm('');
        }
    }, [isOpen]);

    // Lọc danh sách kho theo từ khóa
    const filterItem = (item: CyberWarehouseItem, term: string) => {
        if (!term.trim()) return true;
        return (
            includesNormalized(item.id, term) ||
            includesNormalized(item.name, term) ||
            includesNormalized(item.shortName, term)
        );
    };

    const filteredPopular = useMemo(() => {
        return CYBER_POPULAR_WAREHOUSES.filter(item => filterItem(item, searchTerm));
    }, [searchTerm]);

    const filteredOther = useMemo(() => {
        return CYBER_OTHER_WAREHOUSES.filter(item => filterItem(item, searchTerm));
    }, [searchTerm]);

    const totalMatches = filteredPopular.length + filteredOther.length;

    // Chọn kho
    const handleSelect = (id: string) => {
        onChange(id);
        setIsOpen(false);
        setSearchTerm('');
    };

    // Phím tắt bàn phím
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchTerm('');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const firstMatch = filteredPopular[0] || filteredOther[0];
            if (firstMatch) {
                handleSelect(firstMatch.id);
            }
        }
    };

    // Theme styles
    const isDark = theme === 'dark';
    const isSm = size === 'sm';

    const triggerBg = isDark
        ? 'bg-slate-950 border-slate-700 text-white hover:border-slate-600'
        : isDetected
            ? 'bg-emerald-50/30 border-emerald-500 text-slate-800 hover:border-emerald-600'
            : 'bg-white border-slate-300 text-slate-800 hover:border-slate-400';

    const dropdownBg = isDark
        ? 'bg-slate-900 border-slate-700 text-slate-200'
        : 'bg-white border-slate-200 text-slate-800 shadow-xl';

    const searchInputBg = isDark
        ? 'bg-slate-950 border-slate-700 text-white focus:border-emerald-500'
        : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-500 focus:bg-white';

    const itemHoverBg = isDark
        ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
        : 'hover:bg-blue-50 text-slate-700 hover:text-blue-900';

    const itemActiveBg = isDark
        ? 'bg-emerald-950/60 text-emerald-300 font-bold border-l-2 border-emerald-500'
        : 'bg-blue-50/80 text-blue-700 font-bold border-l-2 border-blue-600';

    const sectionHeaderColor = isDark
        ? 'text-slate-400 bg-slate-850/80'
        : 'text-slate-500 bg-slate-50';

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            {/* Nút bấm hiển thị kho hiện tại */}
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between border rounded-lg cursor-pointer transition-all select-none ${
                    isSm ? 'h-7 px-2 text-xs font-bold' : 'px-3 py-2 text-sm font-semibold rounded-xl'
                } ${triggerBg} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                tabIndex={disabled ? -1 : 0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (!disabled) setIsOpen(true);
                    }
                }}
            >
                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                    {selectedItem ? (
                        <>
                            <span className={`px-1 py-0.2 rounded text-[10px] font-black uppercase tracking-wider ${
                                isDark ? 'bg-slate-800 text-emerald-400' : 'bg-slate-100 text-blue-700 border border-slate-200'
                            }`}>
                                {selectedItem.id}
                            </span>
                            <span className="truncate">
                                {selectedItem.name}
                            </span>
                        </>
                    ) : (
                        <span className="text-slate-400 font-normal">{placeholder}</span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-1">
                    <i className={`fas fa-search text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}></i>
                    <i className={`fas fa-chevron-down text-[9px] transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-blue-500' : isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}></i>
                </div>
            </div>

            {/* Dropdown Menu với ô gõ tìm kiếm */}
            {isOpen && (
                <div
                    className={`absolute z-50 left-0 right-0 mt-1 border rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-100 ${dropdownBg}`}
                    style={{ minWidth: '320px', maxWidth: '100%' }}
                >
                    {/* Ô gõ tìm kiếm nhanh */}
                    <div className={`p-2 border-b ${isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-white'}`}>
                        <div className="relative">
                            <i className={`fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-xs ${
                                isDark ? 'text-slate-500' : 'text-slate-400'
                            }`}></i>
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Gõ tìm: K83, K91, OCP, Thuận An, QL13..."
                                className={`w-full pl-7 pr-7 py-1.5 text-xs rounded-lg border outline-none font-medium transition-all ${searchInputBg}`}
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                >
                                    <i className="fas fa-times-circle text-xs"></i>
                                </button>
                            )}
                        </div>
                        <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-slate-400">
                            <span>Tìm thấy {totalMatches} kho xe</span>
                            <span className="text-[9.5px]">Nhấn <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono">Enter</kbd> để chọn</span>
                        </div>
                    </div>

                    {/* Danh sách kho xe */}
                    <div className="max-h-64 overflow-y-auto scrollbar-thin divide-y divide-slate-100 dark:divide-slate-800">
                        {totalMatches === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400">
                                <i className="fas fa-warehouse text-base mb-1 block opacity-40"></i>
                                Không tìm thấy kho xe nào khớp với "{searchTerm}"
                            </div>
                        ) : (
                            <>
                                {/* Nhóm kho thường dùng / trọng điểm */}
                                {filteredPopular.length > 0 && (
                                    <div>
                                        <div className={`px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1 ${sectionHeaderColor}`}>
                                            <i className="fas fa-star text-amber-500 text-[10px]"></i>
                                            <span>Kho Thường Dùng ({filteredPopular.length})</span>
                                        </div>
                                        {filteredPopular.map(item => {
                                            const isSelected = item.id === value;
                                            return (
                                                <div
                                                    key={`pop-${item.id}`}
                                                    onClick={() => handleSelect(item.id)}
                                                    className={`px-2.5 py-1.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                                        isSelected ? itemActiveBg : itemHoverBg
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                                                            isSelected
                                                                ? 'bg-blue-600 text-white'
                                                                : isDark
                                                                    ? 'bg-slate-800 text-slate-300'
                                                                    : 'bg-slate-100 text-slate-700'
                                                        }`}>
                                                            {item.id}
                                                        </span>
                                                        <span className="truncate">{item.name}</span>
                                                    </div>
                                                    {isSelected && (
                                                        <i className="fas fa-check text-xs ml-1.5 shrink-0 text-blue-600 dark:text-emerald-400"></i>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Nhóm các kho xe khác */}
                                {filteredOther.length > 0 && (
                                    <div>
                                        <div className={`px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1 ${sectionHeaderColor}`}>
                                            <i className="fas fa-building text-slate-400 text-[10px]"></i>
                                            <span>Các Kho Khác Toàn Quốc ({filteredOther.length})</span>
                                        </div>
                                        {filteredOther.map(item => {
                                            const isSelected = item.id === value;
                                            return (
                                                <div
                                                    key={`oth-${item.id}`}
                                                    onClick={() => handleSelect(item.id)}
                                                    className={`px-2.5 py-1.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                                        isSelected ? itemActiveBg : itemHoverBg
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                                                            isSelected
                                                                ? 'bg-blue-600 text-white'
                                                                : isDark
                                                                    ? 'bg-slate-800 text-slate-300'
                                                                    : 'bg-slate-100 text-slate-700'
                                                        }`}>
                                                            {item.id}
                                                        </span>
                                                        <span className="truncate">{item.name}</span>
                                                    </div>
                                                    {isSelected && (
                                                        <i className="fas fa-check text-xs ml-1.5 shrink-0 text-blue-600 dark:text-emerald-400"></i>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
