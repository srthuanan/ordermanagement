import React, { useState, useRef, useEffect } from 'react';
import { MONTHS } from '../../constants';

interface DateFilterProps {
    selectedMonth: number | null; // 0-11 for Jan-Dec, null for "All Time"
    selectedYear: number;
    onMonthChange: (month: number | null) => void;
    onYearChange: (year: number) => void;
    years?: number[];
}

const DateFilter: React.FC<DateFilterProps> = ({
    selectedMonth,
    selectedYear,
    onMonthChange,
    onYearChange,
    years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i)
}) => {
    const [isMonthOpen, setIsMonthOpen] = useState(false);
    const [isYearOpen, setIsYearOpen] = useState(false);
    
    const monthRef = useRef<HTMLDivElement>(null);
    const yearRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (monthRef.current && !monthRef.current.contains(event.target as Node)) {
                setIsMonthOpen(false);
            }
            if (yearRef.current && !yearRef.current.contains(event.target as Node)) {
                setIsYearOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex items-center gap-1 bg-white/60 backdrop-blur-md border border-white/80 shadow-sm rounded-xl px-2 py-1 relative z-[100]">
            {/* Month Dropdown */}
            <div className="relative" ref={monthRef}>
                <button 
                    onClick={() => { setIsMonthOpen(!isMonthOpen); setIsYearOpen(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-colors group cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
                >
                    <i className="fas fa-calendar-alt text-accent-primary opacity-70 text-[11px]"></i>
                    <span className="text-[12px] font-bold text-slate-700 whitespace-nowrap">
                        {selectedMonth === null ? 'Cả Năm' : MONTHS[selectedMonth]}
                    </span>
                    <i className={`fas fa-chevron-down text-[9px] text-slate-400 transition-transform duration-300 ${isMonthOpen ? 'rotate-180 text-accent-primary' : 'group-hover:text-accent-primary'}`}></i>
                </button>

                {isMonthOpen && (
                    <div className="absolute top-[calc(100%+0.5rem)] left-0 w-36 bg-white border border-slate-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] py-1.5 z-[110] animate-in fade-in zoom-in-95 duration-200 overflow-hidden ring-1 ring-slate-900/5">
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            <button
                                onClick={() => { onMonthChange(null); setIsMonthOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-[12px] font-medium transition-colors hover:bg-slate-50 ${selectedMonth === null ? 'bg-accent-primary/10 text-accent-primary' : 'text-slate-600'}`}
                            >
                                Cả Năm
                            </button>
                            {MONTHS.map((month, index) => (
                                <button
                                    key={index}
                                    onClick={() => { onMonthChange(index); setIsMonthOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-[12px] font-medium transition-colors hover:bg-slate-50 ${selectedMonth === index ? 'bg-accent-primary/10 text-accent-primary' : 'text-slate-600'}`}
                                >
                                    {month}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="h-4 w-px bg-slate-200"></div>

            {/* Year Dropdown */}
            <div className="relative" ref={yearRef}>
                <button 
                    onClick={() => { setIsYearOpen(!isYearOpen); setIsMonthOpen(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-colors group cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
                >
                    <span className="text-[12px] font-bold text-slate-700">
                        {selectedYear}
                    </span>
                    <i className={`fas fa-chevron-down text-[9px] text-slate-400 transition-transform duration-300 ${isYearOpen ? 'rotate-180 text-accent-primary' : 'group-hover:text-accent-primary'}`}></i>
                </button>

                {isYearOpen && (
                    <div className="absolute top-[calc(100%+0.5rem)] right-0 w-28 bg-white border border-slate-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] py-1.5 z-[110] animate-in fade-in zoom-in-95 duration-200 overflow-hidden ring-1 ring-slate-900/5">
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {years.map((year) => (
                                <button
                                    key={year}
                                    onClick={() => { onYearChange(year); setIsYearOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-[12px] font-medium transition-colors hover:bg-slate-50 ${selectedYear === year ? 'bg-accent-primary/10 text-accent-primary' : 'text-slate-600'}`}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DateFilter;
