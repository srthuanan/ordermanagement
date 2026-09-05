import React, { useState, useEffect, useRef, useMemo } from 'react';

export const RealtimeFooterClock: React.FC<{ className?: string }> = ({ className = '' }) => {
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [viewDate, setViewDate] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);

    // Live clock interval (updates every 1s)
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Close on click outside or Escape
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // Footer button text
    const footerTimeText = useMemo(() => {
        const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayName = days[currentTime.getDay()];
        const dateStr = currentTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return `${dayName}, ${dateStr} • ${timeStr}`;
    }, [currentTime]);

    // Calendar generation logic
    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth(); // 0 - 11

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday, 1 is Monday...
    // Adjust to Monday first (0: T2, 1: T3, ..., 6: CN)
    const startDayOffset = (firstDayOfMonth + 6) % 7;

    const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();

    // Calendar matrix
    const calendarDays = useMemo(() => {
        const days: { date: Date; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }[] = [];

        const today = new Date();
        const isSameDay = (d1: Date, d2: Date) =>
            d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();

        // 1. Previous month trailing days
        for (let i = startDayOffset - 1; i >= 0; i--) {
            const d = new Date(currentYear, currentMonth - 1, prevMonthDaysCount - i);
            days.push({
                date: d,
                isCurrentMonth: false,
                isToday: isSameDay(d, today),
                isSelected: isSameDay(d, selectedDate)
            });
        }

        // 2. Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(currentYear, currentMonth, i);
            days.push({
                date: d,
                isCurrentMonth: true,
                isToday: isSameDay(d, today),
                isSelected: isSameDay(d, selectedDate)
            });
        }

        // 3. Next month leading days to complete 35 or 42 grid cells
        const totalCells = days.length <= 35 ? 35 : 42;
        const nextDaysCount = totalCells - days.length;
        for (let i = 1; i <= nextDaysCount; i++) {
            const d = new Date(currentYear, currentMonth + 1, i);
            days.push({
                date: d,
                isCurrentMonth: false,
                isToday: isSameDay(d, today),
                isSelected: isSameDay(d, selectedDate)
            });
        }

        return days;
    }, [currentYear, currentMonth, startDayOffset, daysInMonth, prevMonthDaysCount, selectedDate]);

    const handlePrevMonth = () => {
        setViewDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(currentYear, currentMonth + 1, 1));
    };

    const handleToday = () => {
        const today = new Date();
        setViewDate(today);
        setSelectedDate(today);
    };

    // Calculate Day of year and Week number
    const { dayOfYear, weekNumber } = useMemo(() => {
        const now = currentTime;
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const diff = now.getTime() - startOfYear.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const doy = Math.floor(diff / oneDay) + 1;
        const week = Math.ceil((doy + startOfYear.getDay()) / 7);
        return { dayOfYear: doy, weekNumber: week };
    }, [currentTime]);

    const fullLiveDateStr = useMemo(() => {
        const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayName = days[currentTime.getDay()];
        return `${dayName}, ngày ${currentTime.getDate()} tháng ${currentTime.getMonth() + 1} năm ${currentTime.getFullYear()}`;
    }, [currentTime]);

    return (
        <div className={`relative ${className}`}>
            {/* Clickable Footer Button */}
            <button
                ref={buttonRef}
                type="button"
                onClick={() => {
                    if (!isOpen) {
                        setViewDate(new Date());
                    }
                    setIsOpen(!isOpen);
                }}
                title="Bấm để mở lịch ngày & giờ"
                className={`flex items-center gap-1.5 font-sans [font-variant-numeric:tabular-nums] text-[10px] font-semibold tracking-wider uppercase select-none transition-all px-2 py-0.5 rounded-md cursor-pointer ${
                    isOpen 
                        ? 'text-blue-600 bg-blue-50/80 shadow-2xs font-bold' 
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 active:scale-95'
                }`}
            >
                <i className={`far fa-calendar-alt text-[10px] transition-transform ${isOpen ? 'text-blue-600 scale-110' : 'text-slate-400'}`}></i>
                <span>{footerTimeText}</span>
            </button>

            {/* macOS / Windows 11 Fluent Glassmorphism Calendar Popover */}
            {isOpen && (
                <div
                    ref={popoverRef}
                    className="fixed bottom-9 left-4 z-[99999] w-[310px] bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.18)] p-4 text-slate-800 animate-in fade-in zoom-in-95 duration-150 select-none"
                    style={{ animationDuration: '180ms' }}
                >
                    {/* Header: Digital Clock & Full Live Date */}
                    <div className="pb-3 mb-3 border-b border-slate-100">
                        <div className="flex items-baseline justify-between">
                            <div className="font-mono text-2xl font-black tracking-tight text-slate-900 [font-variant-numeric:tabular-nums]">
                                {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <button
                                type="button"
                                onClick={handleToday}
                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-0.5 rounded-md transition-colors active:scale-95"
                            >
                                Hôm nay
                            </button>
                        </div>
                        <div className="text-[11.5px] font-medium text-slate-500 mt-0.5 capitalize">
                            {fullLiveDateStr}
                        </div>
                    </div>

                    {/* Month Navigator */}
                    <div className="flex items-center justify-between mb-2.5 px-0.5">
                        <span className="font-bold text-[13px] text-slate-800 tracking-tight capitalize">
                            Tháng {currentMonth + 1}, {currentYear}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handlePrevMonth}
                                title="Tháng trước"
                                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 active:scale-90 text-slate-600 transition-all"
                            >
                                <i className="fas fa-chevron-left text-[10px]"></i>
                            </button>
                            <button
                                type="button"
                                onClick={handleNextMonth}
                                title="Tháng sau"
                                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 active:scale-90 text-slate-600 transition-all"
                            >
                                <i className="fas fa-chevron-right text-[10px]"></i>
                            </button>
                        </div>
                    </div>

                    {/* Day of Week Headers */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, index) => (
                            <div
                                key={d}
                                className={`text-[10px] font-bold py-0.5 ${
                                    index === 6 ? 'text-rose-500' : 'text-slate-400'
                                }`}
                            >
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                        {calendarDays.map((item, idx) => {
                            const isSun = item.date.getDay() === 0;

                            let buttonClasses = 'h-7 w-7 mx-auto flex items-center justify-center rounded-full text-[11.5px] transition-all relative font-medium ';

                            if (item.isToday) {
                                buttonClasses += 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30 ring-2 ring-blue-400/30 scale-105 ';
                            } else if (item.isSelected) {
                                buttonClasses += 'bg-slate-800 text-white font-bold ';
                            } else if (!item.isCurrentMonth) {
                                buttonClasses += 'text-slate-300 hover:text-slate-500 hover:bg-slate-100/60 ';
                            } else if (isSun) {
                                buttonClasses += 'text-rose-600 hover:bg-rose-50 font-semibold ';
                            } else {
                                buttonClasses += 'text-slate-700 hover:bg-slate-100 active:scale-95 ';
                            }

                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                        setSelectedDate(item.date);
                                        if (!item.isCurrentMonth) {
                                            setViewDate(new Date(item.date.getFullYear(), item.date.getMonth(), 1));
                                        }
                                    }}
                                    className={buttonClasses}
                                >
                                    {item.date.getDate()}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer Info: Day of Year, Week Number */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>Tuần {weekNumber}</span>
                        <span>•</span>
                        <span>Ngày thứ {dayOfYear} / 365</span>
                        <span>•</span>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="hover:text-slate-700 font-semibold transition-colors"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RealtimeFooterClock;
