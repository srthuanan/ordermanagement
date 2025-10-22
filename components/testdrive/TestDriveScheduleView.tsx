import React, { useState, useMemo } from 'react';
import { TestDriveBooking } from '../../types';
import { versionsMap } from '../../constants';
import moment from 'moment';

interface TestDriveScheduleViewProps {
    allTestDrives: TestDriveBooking[];
    isLoading: boolean;
}

const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    
    // Handle full ISO/Date string from Google Sheets
    if (time.includes('T') || time.includes(' ')) {
        const date = moment.utc(time); // Use UTC to avoid local timezone conversion
        if (date.isValid()) {
            return date.hour() * 60 + date.minute();
        }
    }

    // Handle HH:mm format from input
    const parts = time.split(':');
    if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (!isNaN(hours) && !isNaN(minutes)) {
            return hours * 60 + minutes;
        }
    }
    
    return 0; // Fallback
};

const TestDriveScheduleView: React.FC<TestDriveScheduleViewProps> = ({ allTestDrives, isLoading }) => {
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedCar, setSelectedCar] = useState('');

    const scheduleForSelected = useMemo(() => {
        if (!selectedDate || !selectedCar) return [];
        return allTestDrives
            .filter(drive => drive.ngayThuXe === selectedDate && drive.loaiXe === selectedCar)
            .sort((a,b) => timeToMinutes(a.thoiGianKhoiHanh) - timeToMinutes(b.thoiGianKhoiHanh));
    }, [allTestDrives, selectedDate, selectedCar]);

    const renderSchedule = () => {
        if (isLoading) {
            return <div className="flex items-center justify-center h-48 bg-surface-ground rounded-lg border border-border-primary"><i className="fas fa-spinner fa-spin mr-2 text-accent-primary"></i><p className="text-text-secondary">Đang tải lịch...</p></div>;
        }

        if (!selectedDate || !selectedCar) {
            return (
                <div className="flex items-center justify-center h-48 bg-surface-ground rounded-lg border border-border-primary">
                    <p className="text-text-secondary">Chọn ngày và loại xe để xem lịch.</p>
                </div>
            );
        }

        return (
            <div className="bg-surface-ground p-4 rounded-lg border border-border-primary">
                <h4 className="text-sm font-semibold text-text-primary mb-3">Lịch trình cho {selectedCar} ngày {new Date(selectedDate).toLocaleDateString('vi-VN')}</h4>
                <div className="relative bg-white h-10 rounded shadow-inner-sm border border-border-secondary">
                    {/* Time markers */}
                    <div className="absolute top-0 left-0 w-full h-full flex justify-between text-xs text-text-placeholder px-1 items-end">
                       {Array.from({ length: 12 }).map((_, i) => <span key={i} className={`border-l ${i % 3 === 0 ? 'h-2 border-border-secondary' : 'h-1 border-border-primary'}`}></span>)}
                       <span className="border-l h-2 border-border-secondary"></span>
                    </div>

                    {/* Saved Bookings */}
                    {scheduleForSelected.map(booking => {
                        const startMinutes = timeToMinutes(booking.thoiGianKhoiHanh);
                        const endMinutes = timeToMinutes(booking.thoiGianTroVe);
                        const dayStartMinutes = 8 * 60;
                        const dayEndMinutes = 20 * 60;
                        const totalDayMinutes = dayEndMinutes - dayStartMinutes;
                        
                        const left = Math.max(0, ((startMinutes - dayStartMinutes) / totalDayMinutes) * 100);
                        const width = Math.min(100 - left, ((endMinutes - startMinutes) / totalDayMinutes) * 100);
                        
                        return (
                            <div key={booking.soPhieu}
                                 className="absolute h-full bg-slate-400/70 rounded border border-slate-500 hover:bg-slate-500 transition-colors"
                                 style={{ left: `${left}%`, width: `${width}%` }}
                                 title={`Đã đặt - KH: ${booking.tenKhachHang}\nThời gian: ${moment.utc(booking.thoiGianKhoiHanh).format('HH:mm')} - ${moment.utc(booking.thoiGianTroVe).format('HH:mm')}\nTVBH: ${booking.tenTuVan || 'N/A'}`}>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-between text-xs text-text-secondary mt-1 px-1">
                    <span>8:00</span>
                    <span>11:00</span>
                    <span>14:00</span>
                    <span>17:00</span>
                    <span>20:00</span>
                </div>
                {scheduleForSelected.length > 0 && (
                    <ul className="mt-4 space-y-2 text-sm max-h-60 overflow-y-auto pr-2">
                        {scheduleForSelected.map(booking => (
                            <li key={booking.soPhieu} className="p-2 bg-white rounded-md border border-border-primary">
                                <span className="font-semibold text-accent-primary">{moment.utc(booking.thoiGianKhoiHanh).format('HH:mm')} - {moment.utc(booking.thoiGianTroVe).format('HH:mm')}</span>: {booking.tenKhachHang} ({booking.soPhieu})
                                <span className="text-xs text-text-secondary block">TVBH: {booking.tenTuVan || 'N/A'}</span>
                            </li>
                        ))}
                    </ul>
                )}
                 {scheduleForSelected.length === 0 && (
                     <p className="text-sm text-text-secondary text-center py-4 mt-2">Chưa có lịch đặt cho xe này vào ngày đã chọn.</p>
                 )}
            </div>
        );
    };

    return (
        <div className="print-hidden flex-grow flex flex-col overflow-hidden animate-fade-in-up">
            <h2 className="text-lg font-bold text-text-primary flex-shrink-0">Lịch Lái Thử</h2>
            <div className="flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                <div>
                    <label htmlFor="schedule-date" className="block text-sm font-medium text-text-secondary">Chọn ngày</label>
                    <input type="date" name="schedule-date" id="schedule-date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="mt-1 block w-full futuristic-input p-2 text-sm" />
                </div>
                <div>
                    <label htmlFor="schedule-car" className="block text-sm font-medium text-text-secondary">Chọn loại xe</label>
                    <select name="schedule-car" id="schedule-car" value={selectedCar} onChange={e => setSelectedCar(e.target.value)} className="mt-1 block w-full futuristic-input p-2 text-sm">
                        <option value="" disabled>Chọn loại xe</option>
                        {Object.keys(versionsMap).map(model => (<option key={model} value={model}>{model}</option>))}
                    </select>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto pr-2">
                {renderSchedule()}
            </div>
        </div>
    );
};

export default TestDriveScheduleView;