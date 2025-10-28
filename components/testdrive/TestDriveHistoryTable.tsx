import React from 'react';
import { TestDriveBooking, TestDriveSortConfig } from '../../types';
import moment from 'moment';
import { normalizeName } from '../../services/authService';
import StatusBadge from '../ui/StatusBadge';

interface TestDriveHistoryTableProps {
    bookings: TestDriveBooking[];
    onSelectBooking: (booking: TestDriveBooking) => void;
    onUpdateCheckin: (booking: TestDriveBooking) => void;
    currentUser: string;
    isAdmin: boolean;
    sortConfig: TestDriveSortConfig | null;
    onSort: (key: keyof TestDriveBooking) => void;
}

const formatTime = (timeStr?: string): string => {
    if (!timeStr) return '';
    if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
    const time = moment(timeStr);
    return time.isValid() ? time.format('HH:mm') : timeStr;
};

const getStatus = (booking: TestDriveBooking): string => {
    if (booking.odoBefore && booking.odoAfter) return 'Đã hoàn tất';
    if (booking.odoBefore) return 'Đang lái thử';
    return 'Chờ Check-in';
};

const SortableHeader: React.FC<{ colKey: keyof TestDriveBooking, title: string, sortConfig: TestDriveSortConfig | null, onSort: (key: keyof TestDriveBooking) => void }> = ({ colKey, title, sortConfig, onSort }) => {
    const isSorted = sortConfig?.key === colKey;
    const icon = isSorted ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '';
    return <th className="py-3 px-3 text-left text-xs font-bold text-text-secondary cursor-pointer hover:bg-surface-hover transition-colors whitespace-nowrap uppercase tracking-wider" onClick={() => onSort(colKey)}>{title} {icon}</th>;
};

const TestDriveHistoryTable: React.FC<TestDriveHistoryTableProps> = ({ bookings, onSelectBooking, onUpdateCheckin, currentUser, isAdmin, sortConfig, onSort }) => {
    if (bookings.length === 0) {
        return (
            <div className="text-center py-16 text-text-secondary flex flex-col items-center justify-center h-full">
                <i className="fas fa-calendar-times fa-3x mb-4"></i>
                <p className="font-semibold">Không tìm thấy lịch lái thử nào.</p>
                <p className="text-sm">Hãy thử thay đổi bộ lọc hoặc xóa ngày đã chọn.</p>
            </div>
        );
    }
    
    return (
        <div className="flex-grow overflow-auto">
            <table className="min-w-full divide-y divide-border-primary responsive-table">
                <thead className="bg-surface-hover sticky top-0 z-10">
                    <tr>
                        <th className="py-3 px-3 text-center text-xs font-bold text-text-secondary w-10 uppercase tracking-wider">#</th>
                        <SortableHeader colKey="soPhieu" title="Số Phiếu" sortConfig={sortConfig} onSort={onSort} />
                        <SortableHeader colKey="tenKhachHang" title="Khách Hàng" sortConfig={sortConfig} onSort={onSort} />
                        <SortableHeader colKey="loaiXe" title="Loại Xe" sortConfig={sortConfig} onSort={onSort} />
                        <SortableHeader colKey="ngayThuXe" title="Ngày/Giờ Lái" sortConfig={sortConfig} onSort={onSort} />
                        <SortableHeader colKey="tenTuVan" title="TVBH" sortConfig={sortConfig} onSort={onSort} />
                        <th className="py-3 px-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Trạng Thái</th>
                        <th className="py-3 px-3 text-center text-xs font-bold text-text-secondary uppercase tracking-wider">Hành Động</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-primary bg-surface-card">
                    {bookings.map((booking, index) => {
                        const canUpdate = isAdmin || normalizeName(currentUser) === normalizeName(booking.tenTuVan);
                        const status = getStatus(booking);
                        return (
                            <tr key={booking.soPhieu} onClick={() => onUpdateCheckin(booking)} className="hover:bg-surface-hover transition-colors cursor-pointer">
                                <td data-label="#" className="px-3 py-3 text-sm text-center text-text-secondary">{index + 1}</td>
                                <td data-label="Số Phiếu" className="px-3 py-3 text-sm font-mono text-text-primary">{booking.soPhieu}</td>
                                <td data-label="Khách Hàng" className="px-3 py-3 text-sm">
                                    <div className="font-semibold text-text-primary">{booking.tenKhachHang}</div>
                                    <div className="text-xs text-text-secondary">{booking.dienThoai}</div>
                                </td>
                                <td data-label="Loại Xe" className="px-3 py-3 text-sm font-medium text-text-primary">{booking.loaiXe}</td>
                                <td data-label="Ngày/Giờ Lái" className="px-3 py-3 text-sm">
                                    <div>{moment(booking.ngayThuXe).format('DD/MM/YYYY')}</div>
                                    <div className="text-xs font-semibold text-accent-primary">{formatTime(booking.thoiGianKhoiHanh)} - {formatTime(booking.thoiGianTroVe)}</div>
                                </td>
                                <td data-label="TVBH" className="px-3 py-3 text-sm text-text-secondary">{booking.tenTuVan}</td>
                                <td data-label="Trạng Thái" className="px-3 py-3 text-sm"><StatusBadge status={status} /></td>
                                <td data-label="Hành động" className="px-3 py-3 text-sm text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onUpdateCheckin(booking); }}
                                            className="action-btn hold-action"
                                            disabled={!canUpdate}
                                            title={!canUpdate ? "Chỉ người tạo phiếu mới có thể cập nhật." : "Cập nhật thông tin check-in/out"}
                                        ><i className="fas fa-camera"></i></button>
                                        <button onClick={(e) => { e.stopPropagation(); onSelectBooking(booking); }} className="action-btn pair-action" title="Xem & In phiếu">
                                            <i className="fas fa-print"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default TestDriveHistoryTable;