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
    years = [2023, 2024, 2025]
}) => {
    return (
        <div className="flex items-center space-x-2 bg-surface-card border border-border-primary rounded-lg p-1 shadow-sm">
            <div className="relative">
                <select
                    value={selectedMonth === null ? 'all' : selectedMonth}
                    onChange={(e) => onMonthChange(e.target.value === 'all' ? null : parseInt(e.target.value))}
                    className="appearance-none bg-transparent border-none text-sm font-semibold text-text-primary py-1 pl-3 pr-8 focus:ring-0 cursor-pointer hover:text-accent-primary transition-colors"
                >
                    <option value="all">Cả Năm</option>
                    {MONTHS.map((month, index) => (
                        <option key={index} value={index}>{month}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                    <i className="fas fa-chevron-down text-xs"></i>
                </div>
            </div>

            <div className="h-4 w-px bg-border-primary"></div>

            <div className="relative">
                <select
                    value={selectedYear}
                    onChange={(e) => onYearChange(parseInt(e.target.value))}
                    className="appearance-none bg-transparent border-none text-sm font-semibold text-text-primary py-1 pl-3 pr-8 focus:ring-0 cursor-pointer hover:text-accent-primary transition-colors"
                >
                    {years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                    <i className="fas fa-chevron-down text-xs"></i>
                </div>
            </div>
        </div>
    );
};

export default DateFilter;
