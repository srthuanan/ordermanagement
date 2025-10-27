import React, { useMemo } from 'react';
import { TestDriveBooking } from '../../types';
import moment from 'moment';
import { normalizeName } from '../../services/authService';

interface TestDriveHistoryTableProps {
    bookings: TestDriveBooking[];
    onSelectBooking: (booking: TestDriveBooking) => void;
    onUpdateCheckin: (booking: TestDriveBooking) => void;
    currentUser: string;
    isAdmin: boolean;
}

const formatTime = (timeStr?: string): string => {
    if (!timeStr) return '';
    if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
    const time = moment(timeStr);
    return time.isValid() ? time.format('HH:mm') : timeStr;
};

const KanbanCard: React.FC<{ booking: TestDriveBooking; onSelectBooking: (b: TestDriveBooking) => void; onUpdateCheckin: (b: TestDriveBooking) => void; currentUser: string; isAdmin: boolean; }> = ({ booking, onSelectBooking, onUpdateCheckin, currentUser, isAdmin }) => {
    const isToday = moment(booking.ngayThuXe).isSame(moment(), 'day');
    const isPast = moment(booking.ngayThuXe).isBefore(moment(), 'day');
    const canUpdate = isAdmin || normalizeName(currentUser) === normalizeName(booking.tenTuVan);


    let dateTag;
    if (isToday) {
        dateTag = <div className="kanban-card-tag bg-blue-100 text-blue-800">Hôm nay</div>;
    } else if (isPast) {
        dateTag = <div className="kanban-card-tag bg-slate-100 text-slate-600">{moment(booking.ngayThuXe).format('DD/MM')}</div>;
    } else {
        dateTag = <div className="kanban-card-tag bg-indigo-100 text-indigo-800">{moment(booking.ngayThuXe).format('DD/MM')}</div>;
    }

    return (
        <div className="kanban-card animate-fade-in-up">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-base text-text-primary">{booking.tenKhachHang}</p>
                    <p className="text-xs text-text-secondary font-mono mt-0.5">{booking.soPhieu}</p>
                </div>
                {dateTag}
            </div>
            <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-text-secondary"><i className="fas fa-car fa-fw w-4 text-center"></i><span className="font-medium text-text-primary">{booking.loaiXe}</span></div>
                <div className="flex items-center gap-2 text-text-secondary"><i className="fas fa-clock fa-fw w-4 text-center"></i><span className="font-medium text-text-primary">{formatTime(booking.thoiGianKhoiHanh)} - {formatTime(booking.thoiGianTroVe)}</span></div>
                <div className="flex items-center gap-2 text-text-secondary"><i className="fas fa-user-tie fa-fw w-4 text-center"></i><span className="font-medium text-text-primary">{booking.tenTuVan}</span></div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-dashed border-border-primary">
                <button
                    onClick={() => onUpdateCheckin(booking)}
                    className="btn-secondary !text-xs !py-1 !px-2.5"
                    disabled={!canUpdate}
                    title={!canUpdate ? "Chỉ người tạo phiếu mới có thể cập nhật." : "Cập nhật thông tin check-in/out"}
                >Cập nhật</button>
                <button onClick={() => onSelectBooking(booking)} className="btn-primary !text-xs !py-1 !px-2.5">Xem & In</button>
            </div>
        </div>
    );
};


const KanbanColumn: React.FC<{ title: string; count: number; children: React.ReactNode; icon: string; iconColor: string; }> = ({ title, count, children, icon, iconColor }) => (
    <div className="kanban-column">
        <div className="kanban-column-header">
            <div className="flex items-center gap-2">
                <i className={`fas ${icon} ${iconColor}`}></i>
                <span className="text-text-primary">{title}</span>
            </div>
            <span className="text-sm font-semibold bg-surface-accent text-accent-primary px-2 py-0.5 rounded-full">{count}</span>
        </div>
        <div className="kanban-cards">
            {children}
        </div>
    </div>
);


const TestDriveHistoryTable: React.FC<TestDriveHistoryTableProps> = ({ bookings, onSelectBooking, onUpdateCheckin, currentUser, isAdmin }) => {

    const columns = useMemo(() => {
        const awaitingCheckin = bookings.filter(b => !b.odoBefore);
        const inProgress = bookings.filter(b => b.odoBefore && !b.odoAfter);
        const completed = bookings.filter(b => b.odoBefore && b.odoAfter);

        return {
            awaiting: { title: 'Chờ Check-in', bookings: awaitingCheckin, icon: 'fa-hourglass-start', color: 'text-amber-500' },
            progress: { title: 'Đang Lái thử', bookings: inProgress, icon: 'fa-road', color: 'text-blue-500' },
            completed: { title: 'Đã Hoàn tất', bookings: completed, icon: 'fa-flag-checkered', color: 'text-green-500' },
        };
    }, [bookings]);

    return (
        <div className="flex-grow overflow-hidden">
             {bookings.length > 0 ? (
                <div className="kanban-board h-full">
                   <KanbanColumn title={columns.awaiting.title} count={columns.awaiting.bookings.length} icon={columns.awaiting.icon} iconColor={columns.awaiting.color}>
                       {columns.awaiting.bookings.map(booking => <KanbanCard key={booking.soPhieu} booking={booking} onSelectBooking={onSelectBooking} onUpdateCheckin={onUpdateCheckin} currentUser={currentUser} isAdmin={isAdmin} />)}
                   </KanbanColumn>
                   <KanbanColumn title={columns.progress.title} count={columns.progress.bookings.length} icon={columns.progress.icon} iconColor={columns.progress.color}>
                       {columns.progress.bookings.map(booking => <KanbanCard key={booking.soPhieu} booking={booking} onSelectBooking={onSelectBooking} onUpdateCheckin={onUpdateCheckin} currentUser={currentUser} isAdmin={isAdmin} />)}
                   </KanbanColumn>
                   <KanbanColumn title={columns.completed.title} count={columns.completed.bookings.length} icon={columns.completed.icon} iconColor={columns.completed.color}>
                       {columns.completed.bookings.map(booking => <KanbanCard key={booking.soPhieu} booking={booking} onSelectBooking={onSelectBooking} onUpdateCheckin={onUpdateCheckin} currentUser={currentUser} isAdmin={isAdmin} />)}
                   </KanbanColumn>
                </div>
            ) : (
                <div className="text-center py-16 text-text-secondary flex flex-col items-center justify-center h-full">
                    <i className="fas fa-calendar-times fa-3x mb-4"></i>
                    <p className="font-semibold">Không tìm thấy lịch lái thử nào.</p>
                    <p className="text-sm">Hãy thử thay đổi bộ lọc hoặc xóa ngày đã chọn.</p>
                </div>
            )}
        </div>
    );
};

export default TestDriveHistoryTable;