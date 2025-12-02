import React from 'react';
import { TestDriveBooking, TestDriveSortConfig } from '../../types';
import moment from 'moment';
import { normalizeName } from '../../services/authService';
import StatusBadge from '../ui/StatusBadge';

interface TestDriveHistoryTableProps {
    bookings: TestDriveBooking[];
    onSelectBooking: (booking: TestDriveBooking) => void;
    onUpdateCheckin: (booking: TestDriveBooking, mode?: 'update' | 'view') => void;
    onDelete: (booking: TestDriveBooking) => void;
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

const TestDriveHistoryTable: React.FC<TestDriveHistoryTableProps> = ({ bookings, onSelectBooking, onUpdateCheckin, onDelete, currentUser, isAdmin, sortConfig, onSort }) => {
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
            {/* Mobile View: Cards */}
            <div className="md:hidden space-y-3 pb-4">
                {bookings.map((booking, index) => {
                    const canUpdate = isAdmin || normalizeName(currentUser) === normalizeName(booking.tenTuVan);
                    const status = getStatus(booking);
                    const isMyRequest = normalizeName(currentUser) === normalizeName(booking.tenTuVan);

                    return (
                        <div
                            key={booking.soPhieu}
                            className={`relative bg-white rounded-xl p-4 shadow-sm border border-gray-200 ${isMyRequest ? 'ring-1 ring-accent-primary/30' : ''}`}
                            onClick={() => {
                                if (canUpdate) {
                                    if (status === 'Đã hoàn tất') {
                                        onUpdateCheckin(booking, 'view');
                                    } else {
                                        onUpdateCheckin(booking);
                                    }
                                } else {
                                    onUpdateCheckin(booking, 'view');
                                }
                            }}
                        >
                            {/* Header: Ticket Number & Actions */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="text-xs text-gray-500 font-mono mt-1">
                                    Số Phiếu: <span className="text-gray-700 font-medium">{booking.soPhieu}</span>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={(e) => {
                                            if (canUpdate) {
                                                e.stopPropagation();
                                                if (status === 'Đã hoàn tất') {
                                                    onUpdateCheckin(booking, 'update');
                                                } else {
                                                    onUpdateCheckin(booking);
                                                }
                                            }
                                        }}
                                        className={`w-8 h-8 flex items-center justify-center rounded-full bg-surface-ground shadow-sm text-gray-600 hover:text-accent-primary transition-colors ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={!canUpdate}
                                    >
                                        <i className={`fas ${status === 'Đã hoàn tất' ? 'fa-plus-circle' : 'fa-camera'}`}></i>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSelectBooking(booking); }}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-ground shadow-sm text-gray-600 hover:text-accent-primary transition-colors"
                                    >
                                        <i className="fas fa-print"></i>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(booking); }}
                                        className={`w-8 h-8 flex items-center justify-center rounded-full bg-surface-ground shadow-sm text-gray-600 hover:text-danger transition-colors ${(!canUpdate || status !== 'Chờ Check-in') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={!canUpdate || status !== 'Chờ Check-in'}
                                    >
                                        <i className="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-dashed border-gray-200 my-2"></div>

                            {/* Customer Info */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-500">Khách Hàng</span>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-gray-800 uppercase">{booking.tenKhachHang}</div>
                                    <div className="text-xs text-gray-500">{booking.dienThoai}</div>
                                </div>
                            </div>

                            {/* Car Info */}
                            <div className="mb-2">
                                <div className="text-sm font-medium text-gray-800">{booking.loaiXe}</div>
                            </div>

                            <div className="border-t border-dashed border-gray-200 my-2"></div>

                            {/* Date/Time */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-500">Ngày/Giờ Lái</span>
                                <div className="text-right">
                                    <div className="text-sm text-gray-800">{moment(booking.ngayThuXe).format('DD/MM/YYYY')}</div>
                                    <div className="text-sm font-bold text-accent-primary">
                                        {formatTime(booking.thoiGianKhoiHanh)} - {formatTime(booking.thoiGianTroVe)}
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-dashed border-gray-200 my-2"></div>

                            {/* Consultant */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-500">TVBH</span>
                                <span className={`text-sm font-medium uppercase ${isMyRequest ? 'text-accent-primary' : 'text-gray-700'}`}>
                                    {booking.tenTuVan}
                                </span>
                            </div>

                            {/* Status */}
                            <div className="flex justify-between items-center mt-3">
                                <span className="text-sm text-gray-500">Trạng Thái</span>
                                <StatusBadge status={status} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop View: Table */}
            <table className="hidden md:table min-w-full divide-y divide-border-primary responsive-table">
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
                        const isMyRequest = normalizeName(currentUser) === normalizeName(booking.tenTuVan);

                        const handleRowClick = () => {
                            if (canUpdate) {
                                // Owner/Admin can edit pending bookings, but only view completed ones via row click
                                // (they can use the dedicated button to 'update' completed ones)
                                if (status === 'Đã hoàn tất') {
                                    onUpdateCheckin(booking, 'view');
                                } else {
                                    onUpdateCheckin(booking); // This will open in checkin/checkout mode
                                }
                            } else {
                                // Other users can only view, regardless of status
                                onUpdateCheckin(booking, 'view');
                            }
                        };

                        return (
                            <tr
                                key={booking.soPhieu}
                                className={`hover:bg-surface-hover transition-colors ${isMyRequest ? 'my-request-row' : ''} cursor-pointer`}
                                onClick={handleRowClick}
                            >
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
                                <td data-label="TVBH" className="px-3 py-3 text-sm text-text-secondary">
                                    <span className={isMyRequest ? 'font-semibold text-accent-primary' : ''}>
                                        {booking.tenTuVan}
                                    </span>
                                </td>
                                <td data-label="Trạng Thái" className="px-3 py-3 text-sm"><StatusBadge status={status} /></td>
                                <td data-label="Hành động" className="px-3 py-3 text-sm text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                if (canUpdate) {
                                                    e.stopPropagation();
                                                    if (status === 'Đã hoàn tất') {
                                                        onUpdateCheckin(booking, 'update');
                                                    } else {
                                                        onUpdateCheckin(booking);
                                                    }
                                                }
                                            }}
                                            className={`action-btn ${status === 'Đã hoàn tất' ? 'pair-action' : 'hold-action'}`}
                                            disabled={!canUpdate}
                                            title={!canUpdate
                                                ? "Chỉ người tạo phiếu hoặc admin mới có thể cập nhật."
                                                : (status === 'Đã hoàn tất'
                                                    ? "Cập nhật hình ảnh"
                                                    : "Cập nhật thông tin check-in/out")}
                                        ><i className={`fas ${status === 'Đã hoàn tất' ? 'fa-plus-circle' : 'fa-camera'}`}></i></button>
                                        <button onClick={(e) => { e.stopPropagation(); onSelectBooking(booking); }} className="action-btn pair-action" title="Xem & In phiếu">
                                            <i className="fas fa-print"></i>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(booking); }}
                                            className="action-btn release-action"
                                            disabled={!canUpdate || status !== 'Chờ Check-in'}
                                            title={!canUpdate ? "Chỉ người tạo phiếu hoặc admin mới có thể xóa." : (status !== 'Chờ Check-in' ? 'Không thể xóa phiếu đã check-in' : 'Xóa phiếu lái thử')}
                                        >
                                            <i className="fas fa-trash-alt"></i>
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