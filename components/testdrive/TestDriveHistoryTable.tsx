import React, { useState, useMemo, useEffect } from 'react';
import { TestDriveBooking, TestDriveSortConfig } from '../../types';
import moment from 'moment';
import { normalizeName } from '../../services/authService';
import StatusBadge from '../ui/StatusBadge';
import AnimatedBackground from '../ui/AnimatedBackground';

import { toEmbeddableUrl, toViewableUrl } from '../../utils/imageUtils';

interface ImageSource {
    src: string;
    originalUrl?: string;
    label: string;
}

interface TestDriveHistoryTableProps {
    bookings: TestDriveBooking[];
    onSelectBooking: (booking: TestDriveBooking) => void;
    onUpdateCheckin: (booking: TestDriveBooking, mode?: 'update' | 'view') => void;
    onDelete: (booking: TestDriveBooking) => void;
    currentUser: string;
    isAdmin: boolean;
    sortConfig: TestDriveSortConfig | null;
    onSort: (key: keyof TestDriveBooking) => void;
    onOpenImagePreview: (images: ImageSource[], startIndex: number, customerName: string) => void;
    isReferenceAccount?: boolean;
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

const DocumentCard: React.FC<{ url: string; label: string; icon: string; onClick: () => void }> = ({ url, label, icon, onClick }) => {
    const [imgSrc, setImgSrc] = useState(toEmbeddableUrl(url, 320));
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setImgSrc(toEmbeddableUrl(url, 320));
        setHasError(false);
    }, [url]);

    const handleError = () => {
        const thumbnailUrl = toEmbeddableUrl(url, 320);
        if (imgSrc === thumbnailUrl) {
            setImgSrc(toViewableUrl(url));
        } else {
            setHasError(true);
        }
    };

    return (
        <div
            className="flex flex-col rounded border border-border-secondary bg-surface-ground cursor-pointer hover:bg-surface-hover transition-all overflow-hidden group"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
        >
            <div className="h-24 bg-white flex items-center justify-center overflow-hidden relative">
                {!hasError ? (
                    <img
                        src={imgSrc}
                        alt={label}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={handleError}
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-surface-ground shadow-sm flex items-center justify-center text-accent-primary">
                        <i className={`fas ${icon} text-xl opacity-50`}></i>
                    </div>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <i className="fas fa-search-plus text-white opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 drop-shadow-md"></i>
                </div>
            </div>
            <div className="p-1.5 text-center border-t border-border-secondary bg-surface-ground">
                <div className="font-medium text-[10px] text-text-primary truncate" title={label}>{label}</div>
            </div>
        </div>
    );
};

const TestDriveHistoryTable: React.FC<TestDriveHistoryTableProps> = ({ bookings, onSelectBooking, onUpdateCheckin, onDelete, currentUser, isAdmin, onOpenImagePreview, isReferenceAccount }) => {
    // Extract unique consultants for display in column 1
    const consultants = useMemo(() => {
        const uniqueNames = Array.from(new Set(bookings.map(b => b.tenTuVan || 'Chưa xác định')));

        // Sort: Current user first, then others alphabetically
        uniqueNames.sort((a, b) => {
            const isUserA = normalizeName(a) === normalizeName(currentUser);
            const isUserB = normalizeName(b) === normalizeName(currentUser);
            if (isUserA && !isUserB) return -1;
            if (!isUserA && isUserB) return 1;
            return a.localeCompare(b);
        });

        return uniqueNames.map(name => ({
            id: `consultant_${name}`,
            label: name,
            count: bookings.filter(b => normalizeName(b.tenTuVan || 'Chưa xác định') === normalizeName(name)).length
        }));
    }, [bookings, currentUser]);

    // Use lazy initialization to compute initial selectedFolder
    const [selectedFolder, setSelectedFolder] = useState<string>(() => {
        // Find if current user is in consultants list
        const userFolderId = `consultant_${currentUser}`;
        if (consultants.some(c => normalizeName(c.label) === normalizeName(currentUser))) {
            return userFolderId;
        }
        if (consultants.length > 0) {
            return consultants[0].id;
        }
        return '';
    });

    const [selectedStatus, setSelectedStatus] = useState<string>('all'); // 'all', 'pending', 'ongoing', 'completed'
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'folders' | 'list' | 'detail'>('folders');

    // Update selectedFolder when consultants change and current selection becomes invalid
    useEffect(() => {
        if (consultants.length > 0 && !selectedFolder) {
            setSelectedFolder(consultants[0].id);
        }
    }, [consultants, selectedFolder]);

    // Filter bookings by consultant and status
    const filteredBookings = useMemo(() => {
        return bookings.filter(booking => {
            // First filter by consultant name
            if (selectedFolder.startsWith('consultant_')) {
                const consultantName = selectedFolder.replace('consultant_', '');
                const matchesConsultant = normalizeName(booking.tenTuVan) === normalizeName(consultantName);

                if (!matchesConsultant) return false;

                // Then filter by status if not 'all'
                if (selectedStatus !== 'all') {
                    const status = getStatus(booking);
                    switch (selectedStatus) {
                        case 'pending': return status === 'Chờ Check-in';
                        case 'ongoing': return status === 'Đang lái thử';
                        case 'completed': return status === 'Đã hoàn tất';
                        default: return true;
                    }
                }

                return true;
            }
            // If no valid folder selected, show all
            return true;
        });
    }, [bookings, selectedFolder, selectedStatus]);

    const selectedBooking = useMemo(() =>
        bookings.find(b => b.soPhieu === selectedBookingId),
        [bookings, selectedBookingId]
    );

    // Auto-select first booking when filtered list changes
    useEffect(() => {
        if (filteredBookings.length > 0) {
            // Always select the first booking in the filtered list
            setSelectedBookingId(filteredBookings[0].soPhieu);
        } else {
            // Clear selection if no bookings
            setSelectedBookingId(null);
        }
    }, [filteredBookings]);

    // Get selected consultant name for display
    const selectedConsultantName = useMemo(() => {
        const consultant = consultants.find(c => c.id === selectedFolder);
        return consultant?.label || '';
    }, [consultants, selectedFolder]);

    const handleFolderClick = (folderId: string) => {
        setSelectedFolder(folderId);
        setSelectedStatus('all'); // Reset status filter when changing consultant
        setMobileView('list');
    };

    const handleBookingClick = (bookingId: string) => {
        setSelectedBookingId(bookingId);
        setMobileView('detail');

        const booking = bookings.find(b => b.soPhieu === bookingId);
        if (booking) {
            const status = getStatus(booking);
            const canUpdate = isAdmin || normalizeName(currentUser) === normalizeName(booking.tenTuVan);

            if (status !== 'Đã hoàn tất' && canUpdate && !isReferenceAccount) {
                onUpdateCheckin(booking);
            }
        }
    };

    if (bookings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 px-4 w-full h-full bg-slate-50 rounded-2xl relative overflow-hidden">
                <AnimatedBackground />
                <div className="relative mb-6 z-10 w-24 h-24 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center">
                    <div className="absolute inset-0 border border-gray-200/60 rounded-full transform scale-110"></div>
                    <div className="absolute inset-0 border border-gray-100 rounded-full transform scale-125"></div>
                    <i className="fas fa-calendar-times text-gray-300 text-4xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-600 mb-2 tracking-tight z-10">Trống Không!</h3>
                <p className="text-sm text-gray-400 max-w-sm text-center z-10">Không tìm thấy lịch lái thử nào. Hãy thử theo dõi các ngày khác.</p>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-slate-50 relative rounded-xl shadow-md border border-border-primary overflow-hidden animate-fade-in">
            <AnimatedBackground />
            {/* Column 1: Consultant Names (TVBH) */}
            <div className={`w-full md:w-72 flex-shrink-0 border-r border-border-primary bg-surface-ground/90 flex flex-col absolute md:relative inset-0 z-20 md:z-10 transition-transform duration-300 ${mobileView === 'folders' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-4 border-b border-border-primary md:hidden flex items-center justify-between bg-white">
                    <span className="font-bold text-lg">Tư Vấn Bán Hàng</span>
                </div>
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {/* Consultant List */}
                    {consultants.map(consultant => (
                        <button
                            key={consultant.id}
                            onClick={() => handleFolderClick(consultant.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${selectedFolder === consultant.id ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedFolder === consultant.id ? 'bg-accent-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                                    {(consultant.label || '?').charAt(0)}
                                </div>
                                <span className="truncate text-left">{consultant.label}</span>
                            </div>
                            {consultant.count > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${selectedFolder === consultant.id ? 'bg-accent-primary text-white' : 'bg-surface-hover text-text-secondary'}`}>{consultant.count}</span>}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Column 2: Booking List - Adjusted width to w-96 */}
            <div className={`w-full md:w-96 flex-shrink-0 border-r border-border-primary flex flex-col bg-white/90 absolute md:relative inset-0 z-20 md:z-10 transition-transform duration-300 ${mobileView === 'list' ? 'translate-x-0' : (mobileView === 'detail' ? '-translate-x-full md:translate-x-0' : 'translate-x-full md:translate-x-0')}`}>
                {/* Mobile Header */}
                <div className="p-3 border-b border-border-primary md:hidden flex items-center gap-3 bg-white shadow-sm">
                    <button onClick={() => setMobileView('folders')} className="w-8 h-8 rounded-full bg-surface-ground flex items-center justify-center text-text-secondary hover:bg-surface-hover">
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <span className="font-bold text-text-primary">
                        {selectedConsultantName}
                    </span>
                </div>

                {/* Status Filter Tabs */}
                <div className="flex items-center gap-1 p-2 bg-surface-ground border-b border-border-primary">
                    <button
                        onClick={() => setSelectedStatus('all')}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${selectedStatus === 'all' ? 'bg-white text-accent-primary shadow-sm' : 'text-text-secondary hover:bg-white/50'}`}
                    >
                        Tất cả
                    </button>
                    <button
                        onClick={() => setSelectedStatus('pending')}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${selectedStatus === 'pending' ? 'bg-white text-accent-primary shadow-sm' : 'text-text-secondary hover:bg-white/50'}`}
                    >
                        Chờ Check-in
                    </button>
                    <button
                        onClick={() => setSelectedStatus('ongoing')}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${selectedStatus === 'ongoing' ? 'bg-white text-accent-primary shadow-sm' : 'text-text-secondary hover:bg-white/50'}`}
                    >
                        Đang lái
                    </button>
                    <button
                        onClick={() => setSelectedStatus('completed')}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${selectedStatus === 'completed' ? 'bg-white text-accent-primary shadow-sm' : 'text-text-secondary hover:bg-white/50'}`}
                    >
                        Hoàn tất
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredBookings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 h-full">
                            <div className="relative mb-4 w-16 h-16 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center">
                                <i className="fas fa-filter text-gray-300 text-2xl"></i>
                            </div>
                            <p className="text-sm text-slate-500">Không có lịch thỏa mãn.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border-secondary">
                            {filteredBookings.map((booking, index) => {
                                const status = getStatus(booking);
                                const isMyRequest = normalizeName(currentUser) === normalizeName(booking.tenTuVan);

                                return (
                                    <div
                                        key={`${booking.soPhieu}-${index}`}
                                        onClick={() => handleBookingClick(booking.soPhieu)}
                                        className={`px-3 py-3 cursor-pointer hover:bg-surface-hover transition-colors ${selectedBookingId === booking.soPhieu ? 'bg-accent-primary/5 border-l-4 border-accent-primary' : 'border-l-4 border-transparent'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Avatar */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isMyRequest ? 'bg-accent-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                                                {(booking.tenKhachHang || '?').charAt(0)}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm text-text-primary truncate">{booking.tenKhachHang}</div>
                                                <div className="text-xs text-text-secondary truncate">{booking.loaiXe}</div>
                                                <div className="text-xs text-accent-primary font-medium mt-0.5">
                                                    {moment(booking.ngayThuXe, ["YYYY-MM-DD", "DD/MM/YYYY"]).format('DD/MM')} • {formatTime(booking.thoiGianKhoiHanh)}
                                                </div>
                                            </div>

                                            {/* Status Icon */}
                                            <div className="flex-shrink-0">
                                                {status === 'Chờ Check-in' && <i className="fas fa-clock text-warning text-base"></i>}
                                                {status === 'Đang lái thử' && <i className="fas fa-car text-blue-500 text-base"></i>}
                                                {status === 'Đã hoàn tất' && <i className="fas fa-check-circle text-success text-base"></i>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Column 3: Detail Panel */}
            <div className={`w-full flex-1 flex flex-col bg-surface-ground/90 min-w-0 absolute md:relative inset-0 z-30 md:z-10 transition-transform duration-300 ${mobileView === 'detail' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                {selectedBooking ? (
                    <>
                        {/* Header */}
                        <div className="px-4 py-3 bg-white border-b border-border-primary flex justify-between items-center shadow-sm z-10">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {/* Mobile Back Button */}
                                <button onClick={() => setMobileView('list')} className="md:hidden w-8 h-8 rounded-full bg-surface-ground flex items-center justify-center text-text-secondary hover:bg-surface-hover">
                                    <i className="fas fa-arrow-left"></i>
                                </button>

                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold hidden sm:flex ${normalizeName(currentUser) === normalizeName(selectedBooking.tenTuVan) ? 'bg-accent-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                                    {selectedBooking.tenKhachHang.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-base font-bold text-text-primary leading-tight truncate">
                                        {selectedBooking.tenKhachHang}
                                    </h2>
                                    <div className="text-xs text-text-secondary flex items-center gap-2 mt-0.5">
                                        <span className="font-mono">#{selectedBooking.soPhieu}</span>
                                        <span>•</span>
                                        <StatusBadge status={getStatus(selectedBooking)} />
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const canUpdate = isAdmin || normalizeName(currentUser) === normalizeName(selectedBooking.tenTuVan);
                                    const status = getStatus(selectedBooking);

                                    return (
                                        <>
                                            {!isReferenceAccount && (
                                                <button
                                                    onClick={() => {
                                                        if (canUpdate) {
                                                            if (status === 'Đã hoàn tất') {
                                                                onUpdateCheckin(selectedBooking, 'update');
                                                            } else {
                                                                onUpdateCheckin(selectedBooking);
                                                            }
                                                        }
                                                    }}
                                                    className={`w-9 h-9 rounded-full hover:bg-surface-hover flex items-center justify-center ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    disabled={!canUpdate}
                                                    title={status === 'Đã hoàn tất' ? "Cập nhật hình ảnh" : "Check-in/out"}
                                                >
                                                    <i className={`fas ${status === 'Đã hoàn tất' ? 'fa-images' : 'fa-camera'} text-text-secondary`}></i>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onSelectBooking(selectedBooking)}
                                                className="w-9 h-9 rounded-full hover:bg-surface-hover flex items-center justify-center"
                                                title="Xem & In phiếu"
                                            >
                                                <i className="fas fa-print text-text-secondary"></i>
                                            </button>
                                            {!isReferenceAccount && (
                                                <button
                                                    onClick={() => onDelete(selectedBooking)}
                                                    className={`w-9 h-9 rounded-full hover:bg-surface-hover flex items-center justify-center ${(!canUpdate || status !== 'Chờ Check-in') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    disabled={!canUpdate || status !== 'Chờ Check-in'}
                                                    title="Xóa phiếu"
                                                >
                                                    <i className="fas fa-trash-alt text-danger"></i>
                                                </button>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Detail Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {/* Compact Info Card */}
                            <div className="bg-white rounded-lg p-3 shadow-sm border border-border-secondary">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                    {/* Vehicle */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
                                            <i className="fas fa-car text-sm"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[10px] text-text-secondary uppercase font-bold">Xe Lái Thử</div>
                                            <div className="text-sm font-bold text-text-primary truncate" title={selectedBooking.loaiXe}>{selectedBooking.loaiXe}</div>
                                        </div>
                                    </div>

                                    {/* Customer */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center flex-shrink-0">
                                            <i className="fas fa-user text-sm"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[10px] text-text-secondary uppercase font-bold">Khách Hàng</div>
                                            <div className="text-sm font-bold text-text-primary truncate">{selectedBooking.tenKhachHang}</div>
                                            <div className="text-[10px] text-text-secondary truncate">{selectedBooking.dienThoai}</div>
                                        </div>
                                    </div>

                                    {/* Schedule */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0">
                                            <i className="fas fa-calendar-alt text-sm"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[10px] text-text-secondary uppercase font-bold">Lịch Trình</div>
                                            <div className="text-sm font-medium text-text-primary truncate">{moment(selectedBooking.ngayThuXe, ["YYYY-MM-DD", "DD/MM/YYYY"]).format('DD/MM/YYYY')}</div>
                                            <div className="text-[10px] text-accent-primary font-bold">
                                                {formatTime(selectedBooking.thoiGianKhoiHanh)} - {formatTime(selectedBooking.thoiGianTroVe)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Consultant */}
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${normalizeName(currentUser) === normalizeName(selectedBooking.tenTuVan) ? 'bg-accent-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                                            {selectedBooking.tenTuVan.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[10px] text-text-secondary uppercase font-bold">Tư Vấn</div>
                                            <div className={`text-sm font-medium truncate ${normalizeName(currentUser) === normalizeName(selectedBooking.tenTuVan) ? 'text-accent-primary' : 'text-text-primary'}`}>
                                                {selectedBooking.tenTuVan}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ODO Strip */}
                                {(selectedBooking.odoBefore || selectedBooking.odoAfter) && (
                                    <div className="mt-3 pt-3 border-t border-border-secondary grid grid-cols-2 gap-4">
                                        {selectedBooking.odoBefore && (
                                            <div className="flex items-center justify-between bg-surface-ground px-2 py-1.5 rounded">
                                                <span className="text-[10px] text-text-secondary">ODO Đi</span>
                                                <span className="text-xs font-bold text-text-primary">{selectedBooking.odoBefore} km</span>
                                            </div>
                                        )}
                                        {selectedBooking.odoAfter && (
                                            <div className="flex items-center justify-between bg-surface-ground px-2 py-1.5 rounded">
                                                <span className="text-[10px] text-text-secondary">ODO Về</span>
                                                <span className="text-xs font-bold text-text-primary">{selectedBooking.odoAfter} km</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Images Section */}
                            {(() => {
                                const images: ImageSource[] = [];

                                // Check-in images (imagesBefore)
                                if (selectedBooking.imagesBefore) {
                                    try {
                                        const checkInUrls = typeof selectedBooking.imagesBefore === 'string' ? JSON.parse(selectedBooking.imagesBefore) : selectedBooking.imagesBefore;
                                        if (Array.isArray(checkInUrls)) {
                                            checkInUrls.forEach((url: string | any, idx: number) => {
                                                const urlStr = typeof url === 'string' ? url : url?.url; // handle if object
                                                if (urlStr) {
                                                    images.push({ src: urlStr, originalUrl: urlStr, label: `Trước khi đi ${idx + 1}` });
                                                }
                                            });
                                        }
                                    } catch (e) { console.error('Failed to parse imagesBefore', e); }
                                }

                                // Check-out images (imagesAfter)
                                if (selectedBooking.imagesAfter) {
                                    try {
                                        const checkOutUrls = typeof selectedBooking.imagesAfter === 'string' ? JSON.parse(selectedBooking.imagesAfter) : selectedBooking.imagesAfter;
                                        if (Array.isArray(checkOutUrls)) {
                                            checkOutUrls.forEach((url: string | any, idx: number) => {
                                                const urlStr = typeof url === 'string' ? url : url?.url;
                                                if (urlStr) {
                                                    images.push({ src: urlStr, originalUrl: urlStr, label: `Sau khi về ${idx + 1}` });
                                                }
                                            });
                                        }
                                    } catch (e) { console.error('Failed to parse imagesAfter', e); }
                                }

                                if (images.length > 0) {
                                    return (
                                        <div className="bg-white rounded-lg p-3 shadow-sm border border-border-secondary">
                                            <h3 className="text-[10px] font-bold text-text-secondary uppercase mb-2 flex items-center gap-1.5">
                                                <i className="fas fa-images"></i>
                                                Hình Ảnh ({images.length})
                                            </h3>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                                {images.map((img, idx) => (
                                                    <DocumentCard
                                                        key={idx}
                                                        url={img.src}
                                                        label={img.label}
                                                        icon="fa-image"
                                                        onClick={() => onOpenImagePreview(images, idx, selectedBooking.tenKhachHang)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-slate-400 bg-slate-50/50">
                        <div className="relative mb-6 w-20 h-20 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center">
                            <div className="absolute inset-0 border border-gray-200/60 rounded-full transform scale-110"></div>
                            <div className="absolute inset-0 border border-gray-100 rounded-full transform scale-125"></div>
                            <i className="fas fa-hand-pointer text-gray-300 text-3xl"></i>
                        </div>
                        <h4 className="text-lg font-bold text-slate-500 mb-1">Chọn Lịch Lái Thử</h4>
                        <p className="text-xs text-center">Bấm vào một mục bên danh sách để xem chi tiết thông tin và thực hiện check-in.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestDriveHistoryTable;