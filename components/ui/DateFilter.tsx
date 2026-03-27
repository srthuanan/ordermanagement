import React from 'react';
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
    years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i) // Generates [Current-1, ..., Current+3] -> [2025, 2026, 2027, 2028, 2029]
}) => {
    return (
        <div className="flex items-center gap-1 bg-gray-50/50 border border-gray-100 rounded-md px-1.5 py-0.5">
            <div className="relative group">
                <div className="flex items-center gap-1.5 px-2 py-0.5 pointer-events-none">
                    <i className="fas fa-calendar-alt text-accent-primary opacity-60 text-[10px] lg:text-[9px]"></i>
                    <span className="text-[11px] lg:text-[10px] font-bold text-gray-700 whitespace-nowrap">
                        {selectedMonth === null ? 'Cả Năm' : MONTHS[selectedMonth]}
                    </span>
                    <i className="fas fa-chevron-down text-[9px] lg:text-[8px] text-gray-400 group-hover:text-accent-primary transition-colors"></i>
                </div>
                <select
                    value={selectedMonth === null ? 'all' : selectedMonth}
                    onChange={(e) => onMonthChange(e.target.value === 'all' ? null : parseInt(e.target.value))}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                >
                    <option value="all">Cả Năm</option>
                    {MONTHS.map((month, index) => (
                        <option key={index} value={index}>{month}</option>
                    ))}
                </select>
            </div>

            <div className="h-3 w-px bg-gray-200"></div>

            <div className="relative group">
                <div className="flex items-center gap-1.5 px-2 py-0.5 pointer-events-none">
                    <span className="text-[11px] lg:text-[10px] font-bold text-gray-700">
                        {selectedYear}
                    </span>
                    <i className="fas fa-chevron-down text-[9px] lg:text-[8px] text-gray-400 group-hover:text-accent-primary transition-colors"></i>
                </div>
                <select
                    value={selectedYear}
                    onChange={(e) => onYearChange(parseInt(e.target.value))}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                >
                    {years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default DateFilter;
