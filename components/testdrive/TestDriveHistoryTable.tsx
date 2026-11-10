import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Plus, X, Camera, Printer, Trash2, ArrowLeft } from 'lucide-react';
import moment from 'moment';
import { TestDriveBooking, TestDriveSortConfig } from '../../types';
import { normalizeName } from '../../services/authService';
import CarImage from '../ui/CarImage';
import { toEmbeddableUrl, toViewableUrl } from '../../utils/imageUtils';
import MultiSelectDropdown from '../ui/MultiSelectDropdown';
import '../orders/orders-premium.css';

interface ImageSource {
    src: string;
    originalUrl?: string;
    label: string;
}

interface TestDriveHistoryTableProps {
    bookings: TestDriveBooking[];
    onSelectBooking: (booking: TestDriveBooking) => void;
    onUpdateCheckin: (booking: TestDriveBooking, mode?: 'checkin' | 'checkout' | 'update' | 'view', anchorEl?: HTMLElement | null) => void;
    onDelete: (booking: TestDriveBooking) => void;
    currentUser: string;
    isAdmin: boolean;
    sortConfig: TestDriveSortConfig | null;
    onSort: (key: keyof TestDriveBooking) => void;
    onOpenImagePreview: (images: ImageSource[], startIndex: number, customerName: string) => void;
    isReferenceAccount?: boolean;
    onCreateNew?: () => void;
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

const getTestDriveStatusTone = (status: string) => {
    if (status === 'Đã hoàn tất') return 'green';
    if (status === 'Đang lái thử') return 'blue';
    if (status === 'Chờ Check-in') return 'amber';
    return 'gray';
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
            className="flex flex-col rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-blue-400 hover:shadow-xs transition-all overflow-hidden group"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
        >
            <div className="h-16 bg-slate-50 flex items-center justify-center overflow-hidden relative">
                {!hasError ? (
                    <img
                        src={imgSrc}
                        alt={label}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={handleError}
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <i className={`fas ${icon} text-xs`}></i>
                    </div>
                )}
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                    <i className="fas fa-search-plus text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-150"></i>
                </div>
            </div>
            <div className="px-1.5 py-1 text-center border-t border-slate-100 bg-slate-50/70">
                <div className="font-semibold text-[9px] text-slate-700 truncate" title={label}>{label}</div>
            </div>
        </div>
    );
};

const TestDriveHistoryTable: React.FC<TestDriveHistoryTableProps> = ({
    bookings,
    onSelectBooking,
    onUpdateCheckin,
    onDelete,
    currentUser,
    isAdmin,
    onOpenImagePreview,
    isReferenceAccount,
    onCreateNew
}) => {
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [selectedCarModel, setSelectedCarModel] = useState<string[]>([]);
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string[]>([]);
    const [selectedConsultantFilter, setSelectedConsultantFilter] = useState<string[]>([]);
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

    // Unique options for filter popover
    const uniqueCars = useMemo(() => Array.from(new Set(bookings.map(b => b.loaiXe).filter(Boolean))).sort(), [bookings]);
    const uniqueConsultants = useMemo(() => Array.from(new Set(bookings.map(b => b.tenTuVan).filter(Boolean))).sort(), [bookings]);
    const statusOptions = ['Chờ Check-in', 'Đang lái thử', 'Đã hoàn tất'];

    // Filter bookings based on keyword and facets
    const filteredBookings = useMemo(() => {
        return bookings.filter(booking => {
            if (searchKeyword.trim()) {
                const q = searchKeyword.toLowerCase().trim();
                const matchName = (booking.tenKhachHang || '').toLowerCase().includes(q);
                const matchPhone = (booking.dienThoai || '').includes(q);
                const matchCar = (booking.loaiXe || '').toLowerCase().includes(q);
                const matchPlate = (booking.bienSo || '').toLowerCase().includes(q);
                const matchConsultant = (booking.tenTuVan || '').toLowerCase().includes(q);
                const matchCode = (booking.soPhieu || '').toLowerCase().includes(q);
                if (!matchName && !matchPhone && !matchCar && !matchPlate && !matchConsultant && !matchCode) {
                    return false;
                }
            }

            if (selectedCarModel.length > 0 && !selectedCarModel.includes(booking.loaiXe)) {
                return false;
            }

            if (selectedStatusFilter.length > 0) {
                const status = getStatus(booking);
                if (!selectedStatusFilter.includes(status)) {
                    return false;
                }
            }

            if (selectedConsultantFilter.length > 0 && !selectedConsultantFilter.includes(booking.tenTuVan)) {
                return false;
            }

            return true;
        });
    }, [bookings, searchKeyword, selectedCarModel, selectedStatusFilter, selectedConsultantFilter]);

    const activeFilterCount = selectedCarModel.length + selectedStatusFilter.length + selectedConsultantFilter.length;

    const handleResetFilters = () => {
        setSearchKeyword('');
        setSelectedCarModel([]);
        setSelectedStatusFilter([]);
        setSelectedConsultantFilter([]);
    };

    // Auto-select first booking
    useEffect(() => {
        if (filteredBookings.length > 0) {
            const currentValid = filteredBookings.find(b => (b.soPhieu || b.dienThoai) === selectedBookingId);
            if (!currentValid) {
                setSelectedBookingId(filteredBookings[0].soPhieu || filteredBookings[0].dienThoai || null);
            }
        } else {
            setSelectedBookingId(null);
        }
    }, [filteredBookings, selectedBookingId]);

    const selectedBooking = useMemo(() => {
        if (!selectedBookingId) return filteredBookings[0] || null;
        return filteredBookings.find(b => (b.soPhieu || b.dienThoai) === selectedBookingId) || filteredBookings[0] || null;
    }, [filteredBookings, selectedBookingId]);

    const selectedStatus = selectedBooking ? getStatus(selectedBooking) : '';
    const selectedTone = selectedBooking ? getTestDriveStatusTone(selectedStatus) : 'gray';

    const startTime = selectedBooking ? formatTime(selectedBooking.thoiGianKhoiHanh) : '';
    const endTime = selectedBooking ? formatTime(selectedBooking.thoiGianTroVe) : '';

    return (
        <div className="premium-orders">
            {/* LEFT SIDEBAR: Matches Tab Đơn Hàng 100% */}
            <aside className="premium-orders-sidebar" aria-label="Danh sách lái thử">
                {/* Heading */}
                <div className="premium-list-heading">
                    <h1>Lái thử <span>{bookings.length}</span></h1>
                    <div>
                        {onCreateNew && !isReferenceAccount && (
                            <button type="button" aria-label="Tạo phiếu lái thử mới" title="Tạo phiếu mới" onClick={onCreateNew}>
                                <Plus size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="premium-list-search">
                    <label>
                        <Search size={16} />
                        <input
                            aria-label="Tìm phiếu lái thử"
                            placeholder="Tìm khách hàng, số xe, TVBH…"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                        />
                        {searchKeyword && (
                            <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setSearchKeyword('')}>
                                <X size={14} />
                            </button>
                        )}
                    </label>
                    <button
                        type="button"
                        aria-label="Bộ lọc lái thử"
                        aria-expanded={filtersOpen}
                        className="premium-filter-toggle"
                        onClick={() => setFiltersOpen(o => !o)}
                    >
                        <Filter size={16} />
                        {activeFilterCount > 0 ? <span>{activeFilterCount}</span> : 'Lọc'}
                    </button>
                </div>

                {/* Filter Popover Panel */}
                {filtersOpen && (
                    <div id="premium-testdrive-filters" className="premium-filter-panel">
                        <div>
                            <strong>Bộ lọc</strong>
                            <button type="button" onClick={handleResetFilters}>Đặt lại</button>
                            <button type="button" aria-label="Đóng bộ lọc" onClick={() => setFiltersOpen(false)}>
                                <X size={15} />
                            </button>
                        </div>
                        <div className="premium-filter-facet">
                            <span>Dòng xe</span>
                            <MultiSelectDropdown
                                id="filter-car-model"
                                label="Dòng xe"
                                icon="fa-car"
                                options={uniqueCars}
                                selectedOptions={selectedCarModel}
                                onChange={setSelectedCarModel}
                                searchable
                                size="compact"
                                displayMode="selection"
                                variant="modern"
                            />
                        </div>
                        <div className="premium-filter-facet">
                            <span>Trạng thái</span>
                            <MultiSelectDropdown
                                id="filter-status"
                                label="Trạng thái"
                                icon="fa-tags"
                                options={statusOptions}
                                selectedOptions={selectedStatusFilter}
                                onChange={setSelectedStatusFilter}
                                size="compact"
                                displayMode="selection"
                                variant="modern"
                            />
                        </div>
                        <div className="premium-filter-facet">
                            <span>Tư vấn</span>
                            <MultiSelectDropdown
                                id="filter-consultant"
                                label="Tư vấn bán hàng"
                                icon="fa-user"
                                options={uniqueConsultants}
                                selectedOptions={selectedConsultantFilter}
                                onChange={setSelectedConsultantFilter}
                                searchable
                                size="compact"
                                displayMode="selection"
                                variant="modern"
                            />
                        </div>
                        <button type="button" className="premium-filter-done" onClick={() => setFiltersOpen(false)}>
                            Xem {filteredBookings.length} phiếu lái thử
                        </button>
                    </div>
                )}

                {/* Filter Summary */}
                {(activeFilterCount > 0 || searchKeyword) && (
                    <div className="premium-filter-summary">
                        <span>{filteredBookings.length} kết quả</span>
                        <button type="button" onClick={handleResetFilters}>Xóa bộ lọc</button>
                    </div>
                )}

                {/* List of Orders */}
                <div className="premium-order-list">
                    {filteredBookings.length === 0 ? (
                        <div className="premium-list-message">
                            <strong>Không tìm thấy phiếu lái thử</strong>
                            <p>Vui lòng thử từ khóa tìm kiếm hoặc bỏ bớt bộ lọc.</p>
                            <button type="button" onClick={handleResetFilters}>Đặt lại bộ lọc</button>
                        </div>
                    ) : (
                        filteredBookings.map((booking) => {
                            const status = getStatus(booking);
                            const tone = getTestDriveStatusTone(status);
                            const isSelected = selectedBooking && (selectedBooking.soPhieu || selectedBooking.dienThoai) === (booking.soPhieu || booking.dienThoai);
                            const bDate = moment(booking.ngayThuXe, ['YYYY-MM-DD', 'DD/MM/YYYY'], true);

                            return (
                                <button
                                    type="button"
                                    key={booking.soPhieu || `${booking.dienThoai}_${booking.ngayThuXe}`}
                                    className="premium-order-row"
                                    aria-pressed={isSelected}
                                    onClick={() => setSelectedBookingId(booking.soPhieu || booking.dienThoai || null)}
                                >
                                    <span className="premium-row-top">
                                        <strong>{booking.tenKhachHang || 'Khách hàng'}</strong>
                                        <span className="premium-status" data-tone={tone}>
                                            <i />
                                            {status}
                                        </span>
                                    </span>
                                    <span className="premium-row-bottom">
                                        <span>{booking.loaiXe || 'Xe lái thử'} · {formatTime(booking.thoiGianKhoiHanh) || '—'}</span>
                                        <time>{bDate.isValid() ? bDate.format('DD/MM/YYYY') : booking.ngayThuXe || '—'}</time>
                                    </span>
                                    <span className="premium-row-id">
                                        {booking.soPhieu || 'Chưa gán số'} · {booking.tenTuVan || 'Chưa rõ TVBH'}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer Count */}
                <div className="premium-list-footer">
                    {filteredBookings.length} / {bookings.length} phiếu lái thử
                </div>
            </aside>

            {/* RIGHT DETAILS VIEW: Matches Tab Đơn Hàng 100% */}
            <div className="premium-order-content">
                {selectedBooking ? (
                    <div className="ios-order-detail-main h-full flex flex-col justify-between">
                        {/* Upper Body Area */}
                        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                            {/* Breadcrumb & Heading Header */}
                            <header className="premium-detail-heading">
                                <div className="premium-detail-breadcrumb">
                                    Lái thử <span>/</span> {selectedBooking.soPhieu || 'Phiếu lái thử'}
                                </div>
                                <div className="premium-detail-title-row">
                                    <div>
                                        <h2>{selectedBooking.tenKhachHang || 'Khách hàng'}</h2>
                                        <p>
                                            Tư vấn bán hàng · <strong className="text-slate-800">{selectedBooking.tenTuVan || 'Chưa xác định'}</strong>
                                            <span>·</span>
                                            Cơ sở: {selectedBooking.coSo || 'VF Minh Đạo Thuận An'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="premium-status" data-tone={selectedTone}>
                                            <i />
                                            {selectedStatus}
                                        </span>
                                    </div>
                                </div>
                            </header>

                            {/* Main Body */}
                            <div className="ios-order-detail-body">
                                {/* Balanced Automotive Hero Zone (Matches Tab Đơn Hàng) */}
                                <section className="premium-vehicle-summary">
                                    <div className="premium-vehicle-photo">
                                        <CarImage
                                            model={selectedBooking.loaiXe}
                                            exteriorColor="Trắng"
                                            className="w-full max-h-[175px] object-contain drop-shadow-md select-none"
                                            hideDecal
                                        />
                                    </div>
                                    <div className="premium-vehicle-info">
                                        <h3>
                                            {selectedBooking.loaiXe || 'VF XE'}
                                            <span>{selectedBooking.tuLai === 'co' ? 'Tự lái' : 'Có lái'}</span>
                                        </h3>
                                        <div className="premium-vehicle-vin">
                                            <button type="button">
                                                <i className="fas fa-barcode"></i>
                                                <span>{selectedBooking.bienSo ? `Biển số ${selectedBooking.bienSo}` : 'Chưa gán biển số xe'}</span>
                                            </button>
                                            <small>· {selectedBooking.coSo || 'VF Minh Đạo'}</small>
                                        </div>
                                        <div className="premium-vehicle-specs">
                                            <div>
                                                <dt>Hình thức</dt>
                                                <dd>{selectedBooking.tuLai === 'co' ? 'Khách tự lái' : 'TVBH lái xe'}</dd>
                                            </div>
                                            <div>
                                                <dt>Khởi hành</dt>
                                                <dd>{startTime || '—'}</dd>
                                            </div>
                                            <div>
                                                <dt>Dự kiến về</dt>
                                                <dd>{endTime || '—'}</dd>
                                            </div>
                                            <div>
                                                <dt>Lộ trình</dt>
                                                <dd className="truncate max-w-[180px]" title={selectedBooking.loTrinh}>
                                                    {selectedBooking.loTrinh || 'Cung đường chuẩn SR'}
                                                </dd>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Three-Column Workspace Board (Matches Tab Đơn Hàng) */}
                                <div className="premium-tri-board">
                                    {/* Column 1: Tiến Độ */}
                                    <div className="premium-tri-col">
                                        <div className="premium-tri-head">
                                            <div className="premium-tri-tabs">
                                                <button type="button" data-tab-active="true">Tiến Độ</button>
                                            </div>
                                        </div>
                                        <div className="premium-tri-body">
                                            <div className="premium-timeline is-four-step">
                                                {/* Step 1: Tạo phiếu */}
                                                <div data-complete="true">
                                                    <div className="premium-timeline-node">
                                                        <i className="fas fa-check"></i>
                                                    </div>
                                                    <div className="premium-timeline-copy">
                                                        <div className="flex-1 flex justify-between items-center pr-3">
                                                            <strong className="text-xs font-semibold text-slate-800">Tạo phiếu lái thử</strong>
                                                            <span className="text-[11px] text-slate-400">
                                                                {moment(selectedBooking.ngayThuXe, ['YYYY-MM-DD', 'DD/MM/YYYY']).format('DD/MM/YYYY')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Step 2: Check-in */}
                                                <div data-complete={Boolean(selectedBooking.odoBefore)} data-current={!selectedBooking.odoBefore}>
                                                    <div className="premium-timeline-node">
                                                        <i className="fas fa-check"></i>
                                                    </div>
                                                    <div className="premium-timeline-copy">
                                                        <div className="flex-1 flex justify-between items-center pr-3">
                                                            <strong className="text-xs font-semibold text-slate-800">Check-in nhận xe</strong>
                                                            <span className="text-[11px] text-slate-500 font-medium">
                                                                {selectedBooking.odoBefore ? `ODO: ${selectedBooking.odoBefore} km` : 'Chưa nhận xe'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Step 3: Hoàn tất */}
                                                <div data-complete={Boolean(selectedBooking.odoAfter)} data-current={Boolean(selectedBooking.odoBefore && !selectedBooking.odoAfter)}>
                                                    <div className="premium-timeline-node">
                                                        <i className="fas fa-check"></i>
                                                    </div>
                                                    <div className="premium-timeline-copy">
                                                        <div className="flex-1 flex justify-between items-center pr-3">
                                                            <strong className="text-xs font-semibold text-slate-800">Hoàn tất & Trả xe</strong>
                                                            <span className="text-[11px] text-slate-500 font-medium">
                                                                {selectedBooking.odoAfter ? `ODO: ${selectedBooking.odoAfter} km` : 'Chưa trả xe'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Thông Tin & Bằng Lái */}
                                    <div className="premium-tri-col is-bordered">
                                        <div className="premium-tri-head">
                                            <h3>Thông Tin &amp; Bằng Lái</h3>
                                        </div>
                                        <div className="premium-tri-body space-y-2 text-xs pt-1">
                                            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                                <span className="text-slate-400 text-[11px]">Số điện thoại</span>
                                                <a href={`tel:${selectedBooking.dienThoai}`} className="text-blue-600 font-semibold hover:underline">
                                                    {selectedBooking.dienThoai || 'Chưa có'}
                                                </a>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                                <span className="text-slate-400 text-[11px]">Số GPLX</span>
                                                <span className="font-mono text-slate-700 font-medium">{selectedBooking.gplxSo || 'Chưa cung cấp'}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                                <span className="text-slate-400 text-[11px]">Hạng / Hạn GPLX</span>
                                                <span className="text-slate-700">
                                                    {selectedBooking.gplxHang ? `Hạng ${selectedBooking.gplxHang}` : '—'} {selectedBooking.hieuLucGPLX ? `· Đến ${selectedBooking.hieuLucGPLX}` : ''}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                                <span className="text-slate-400 text-[11px]">Mã phiếu</span>
                                                <span className="font-mono text-slate-700">{selectedBooking.soPhieu || '—'}</span>
                                            </div>
                                            <div className="flex justify-between items-start gap-3 py-1.5">
                                                <span className="text-slate-400 text-[11px] shrink-0">Địa chỉ</span>
                                                <span className="text-right text-slate-700 font-medium leading-relaxed break-words flex-1">
                                                    {selectedBooking.diaChi || 'Chưa cập nhật'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 3: Ảnh Bàn Giao & Thao Tác */}
                                    <div className="premium-tri-col is-bordered">
                                        <div className="premium-tri-head">
                                            <h3>Ảnh Bàn Giao Xe</h3>
                                        </div>
                                        <div className="premium-tri-body pt-1">
                                            {(() => {
                                                const images: ImageSource[] = [];

                                                if (selectedBooking.imagesBefore) {
                                                    try {
                                                        const urls = typeof selectedBooking.imagesBefore === 'string'
                                                            ? JSON.parse(selectedBooking.imagesBefore)
                                                            : selectedBooking.imagesBefore;
                                                        if (Array.isArray(urls)) {
                                                            urls.forEach((u: string | any, idx: number) => {
                                                                const s = typeof u === 'string' ? u : u?.url;
                                                                if (s) images.push({ src: s, originalUrl: s, label: `Trước đi ${idx + 1}` });
                                                            });
                                                        }
                                                    } catch (e) { }
                                                }

                                                if (selectedBooking.imagesAfter) {
                                                    try {
                                                        const urls = typeof selectedBooking.imagesAfter === 'string'
                                                            ? JSON.parse(selectedBooking.imagesAfter)
                                                            : selectedBooking.imagesAfter;
                                                        if (Array.isArray(urls)) {
                                                            urls.forEach((u: string | any, idx: number) => {
                                                                const s = typeof u === 'string' ? u : u?.url;
                                                                if (s) images.push({ src: s, originalUrl: s, label: `Sau về ${idx + 1}` });
                                                            });
                                                        }
                                                    } catch (e) { }
                                                }

                                                if (images.length > 0) {
                                                    return (
                                                        <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[140px]">
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
                                                    );
                                                }

                                                return (
                                                    <div className="h-full flex flex-col items-center justify-center p-3 text-center border border-dashed border-slate-200 rounded-lg text-slate-400">
                                                        <i className="fas fa-camera text-xl mb-1 text-slate-300"></i>
                                                        <span className="text-[11px] text-slate-500 font-medium">Chưa có ảnh bàn giao</span>
                                                        <span className="text-[9px] text-slate-400">Ảnh được lưu khi bấm Check-in</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Fixed Action Bar (Matches Tab Đơn Hàng Footer 100%) */}
                        <div className="h-12 px-6 border-t border-slate-200/90 bg-white flex items-center justify-between shrink-0">
                            <button
                                type="button"
                                onClick={() => setSelectedBookingId(null)}
                                className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1.5 transition-colors"
                            >
                                <ArrowLeft size={14} /> Đóng
                            </button>

                            <div className="flex items-center gap-2">
                                {/* Contextual Action Button */}
                                {(() => {
                                    const isMyRequest = normalizeName(currentUser) === normalizeName(selectedBooking.tenTuVan);
                                    const canUpdate = isAdmin || isMyRequest;

                                    if (!isReferenceAccount && canUpdate) {
                                        if (selectedStatus === 'Chờ Check-in') {
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={(e) => onUpdateCheckin(selectedBooking, 'checkin', e.currentTarget)}
                                                    className="px-3.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                                >
                                                    <Camera size={13} />
                                                    <span>Check-in Nhận xe</span>
                                                </button>
                                            );
                                        }
                                        if (selectedStatus === 'Đang lái thử') {
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={(e) => onUpdateCheckin(selectedBooking, 'checkout', e.currentTarget)}
                                                    className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                                >
                                                    <i className="fas fa-flag-checkered text-[11px]"></i>
                                                    <span>Check-out Trả xe</span>
                                                </button>
                                            );
                                        }
                                        return null;
                                    }
                                    return null;
                                })()}

                                {/* Print Button */}
                                <button
                                    type="button"
                                    onClick={() => onSelectBooking(selectedBooking)}
                                    className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-all"
                                    title="Xem & In phiếu thỏa thuận lái thử"
                                >
                                    <Printer size={13} /> In phiếu
                                </button>

                                {/* Delete Button */}
                                {!isReferenceAccount && (isAdmin || normalizeName(currentUser) === normalizeName(selectedBooking.tenTuVan)) && selectedStatus === 'Chờ Check-in' && (
                                    <button
                                        type="button"
                                        onClick={() => onDelete(selectedBooking)}
                                        className="px-2.5 py-1.5 rounded-md border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 font-semibold text-xs flex items-center gap-1 shadow-2xs transition-all"
                                        title="Xóa phiếu lái thử"
                                    >
                                        <Trash2 size={13} /> Hủy
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="premium-detail-empty">
                        <i className="fa-regular fa-clipboard"></i>
                        <h2>Chọn phiếu lái thử</h2>
                        <p>Bấm vào một mục bên danh sách để xem thông tin hành trình và tiếp nhận bàn giao xe.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestDriveHistoryTable;
