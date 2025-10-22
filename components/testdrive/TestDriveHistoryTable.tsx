import React, { useState, useMemo } from 'react';
import { TestDriveBooking } from '../../types';
import moment from 'moment';

interface TestDriveHistoryTableProps {
    bookings: TestDriveBooking[];
    onSelectBooking: (booking: TestDriveBooking) => void;
    onUpdateCheckin: (booking: TestDriveBooking) => void;
}

const PAGE_SIZE = 10;

const TestDriveHistoryTable: React.FC<TestDriveHistoryTableProps> = ({ bookings, onSelectBooking, onUpdateCheckin }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const filteredBookings = useMemo(() => {
        const reversedBookings = [...bookings].reverse(); // Show newest first
        if (!searchTerm) {
            return reversedBookings;
        }
        const lowercasedFilter = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return reversedBookings.filter(booking =>
            booking.soPhieu.toLowerCase().includes(lowercasedFilter) ||
            booking.tenKhachHang.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(lowercasedFilter) ||
            (booking.tenTuVan && booking.tenTuVan.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(lowercasedFilter))
        );
    }, [bookings, searchTerm]);

    const paginatedBookings = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return filteredBookings.slice(startIndex, startIndex + PAGE_SIZE);
    }, [filteredBookings, currentPage]);
    
    const totalPages = Math.ceil(filteredBookings.length / PAGE_SIZE);

    const formatTime = (timeStr?: string): string => {
        if (!timeStr) return '';
        // Handle HH:mm format directly
        if (/^\d{2}:\d{2}$/.test(timeStr)) {
            return timeStr;
        }
        // Handle full ISO/Date string from Google Sheets by interpreting it as UTC
        const time = moment.utc(timeStr);
        if (time.isValid()) {
            return time.format('HH:mm');
        }
        return timeStr; // Fallback
    }

    return (
        <div className="flex flex-col h-full">
            {/* Search Bar */}
            <div className="mb-4">
                 <div className="relative">
                    <i className="fas fa-search absolute top-1/2 left-4 -translate-y-1/2 text-text-placeholder"></i>
                    <input
                        type="text"
                        placeholder="Tìm theo số phiếu, tên khách hàng hoặc TVBH..."
                        value={searchTerm}
                        onChange={e => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1); // Reset page on new search
                        }}
                        className="w-full pl-11 pr-4 py-2 futuristic-input"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="flex-grow overflow-y-auto border border-border-primary rounded-lg">
                <table className="min-w-full divide-y divide-border-primary text-sm">
                    <thead className="bg-surface-hover sticky top-0">
                        <tr>
                            <th className="py-2 px-3 text-left font-semibold text-text-secondary">Số Phiếu</th>
                            <th className="py-2 px-3 text-left font-semibold text-text-secondary">Khách Hàng</th>
                            <th className="py-2 px-3 text-left font-semibold text-text-secondary">Tư Vấn</th>
                            <th className="py-2 px-3 text-left font-semibold text-text-secondary">Loại Xe</th>
                            <th className="py-2 px-3 text-left font-semibold text-text-secondary">Ngày Lái Thử</th>
                            <th className="py-2 px-3 text-left font-semibold text-text-secondary">Thời Gian</th>
                            <th className="py-2 px-3 text-center font-semibold text-text-secondary">Trạng thái</th>
                            <th className="py-2 px-3 text-center font-semibold text-text-secondary">Hành Động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary">
                        {paginatedBookings.map(booking => (
                            <tr key={booking.soPhieu} className="hover:bg-surface-hover">
                                <td className="py-2 px-3 font-mono text-accent-primary">{booking.soPhieu}</td>
                                <td className="py-2 px-3">{booking.tenKhachHang}</td>
                                <td className="py-2 px-3">{booking.tenTuVan || 'N/A'}</td>
                                <td className="py-2 px-3">{booking.loaiXe}</td>
                                <td className="py-2 px-3">{moment(booking.ngayThuXe).format('DD/MM/YYYY')}</td>
                                <td className="py-2 px-3 font-mono">{formatTime(booking.thoiGianKhoiHanh)} - {formatTime(booking.thoiGianTroVe)}</td>
                                <td className="py-2 px-3 text-center">
                                    <div className="flex justify-center items-center gap-3 text-lg">
                                        <i className={`fas fa-camera ${booking.odoBefore ? 'text-success' : 'text-text-placeholder'}`} title={booking.odoBefore ? `Check-in: ${booking.odoBefore}km` : 'Chưa check-in'}></i>
                                        <i className={`fas fa-flag-checkered ${booking.odoAfter ? 'text-success' : 'text-text-placeholder'}`} title={booking.odoAfter ? `Check-out: ${booking.odoAfter}km` : 'Chưa check-out'}></i>
                                    </div>
                                </td>
                                <td className="py-2 px-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => onUpdateCheckin(booking)} className="btn-secondary !text-xs !py-1 !px-2.5">Cập nhật</button>
                                        <button onClick={() => onSelectBooking(booking)} className="btn-secondary !text-xs !py-1 !px-2.5">Xem & In</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredBookings.length === 0 && (
                    <div className="text-center py-10 text-text-secondary">Không tìm thấy kết quả.</div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center mt-4 gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-secondary !py-1 !px-3 disabled:opacity-50">Trước</button>
                    <span className="text-sm text-text-secondary">Trang {currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn-secondary !py-1 !px-3 disabled:opacity-50">Sau</button>
                </div>
            )}
        </div>
    );
};

export default TestDriveHistoryTable;