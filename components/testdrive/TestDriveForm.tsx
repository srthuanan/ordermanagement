import React, { useState, useEffect, useMemo, useCallback } from 'react';
import moment from 'moment';
import { TestDriveBooking, TestDriveSortConfig } from '../../types';
import * as apiService from '../../services/apiService';
import TestDriveFormInputs from './TestDriveFormInputs';
import TestDrivePreview from './TestDrivePreview';
import TestDriveHistoryTable from './TestDriveHistoryTable';
import TestDriveCheckinModal from './TestDriveCheckinModal';
import TabbedFilter from '../ui/TabbedFilter';
import MultiSelectDropdown from '../ui/MultiSelectDropdown';
import ActionModal from '../admin/ActionModal';
import Button from '../ui/Button';


interface ImageSource {
    src: string;
    originalUrl?: string;
    label: string;
}

interface TestDriveFormProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    hideToast: () => void;
    onOpenImagePreview: (images: ImageSource[], startIndex: number, customerName: string) => void;
    currentUser: string;
    isAdmin: boolean;
    allTestDrives: TestDriveBooking[];
    setAllTestDrives: React.Dispatch<React.SetStateAction<TestDriveBooking[]>>;
    isLoading: boolean;
    refetch: (isSilent?: boolean) => void;
}

const initialFormData: TestDriveBooking = {
    soPhieu: '',
    ngayThuXe: '',
    loaiXe: '',
    thoiGianKhoiHanh: '',
    thoiGianTroVe: '',
    loTrinh: '',
    tenKhachHang: '',
    dienThoai: '',
    email: '',
    diaChi: '',
    tuLai: 'co',
    dacDiem: '',
    gplxSo: '',
    hieuLucGPLX: '',
    ngayCamKet: '',
    tenTuVan: '',
    coSo: 'VF Minh Đạo Thuận An',
    bienSo: '',
    gplxHang: '',
    cmndO: '',
    cmndNoiCap: '',
    cmndNgayCap: '',
};

const timeToMinutes = (time: string): number => {
    if (!time) return 0;

    // Handle full ISO/Date string from Google Sheets
    if (time.includes('T') || time.includes(' ')) {
        const date = moment(time);
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

const BUFFER_MINUTES = 15;

const TestDriveForm: React.FC<TestDriveFormProps> = ({ showToast, hideToast, onOpenImagePreview, currentUser, isAdmin, allTestDrives, setAllTestDrives, isLoading }) => {
    const [formData, setFormData] = useState<TestDriveBooking>(() => {
        return { ...initialFormData, tenTuVan: currentUser || '' };
    });
    const [conflictError, setConflictError] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
    const [selectedBookingForPreview, setSelectedBookingForPreview] = useState<TestDriveBooking | null>(null);
    const [dataForPrinting, setDataForPrinting] = useState<TestDriveBooking>(formData);
    const [checkinModalState, setCheckinModalState] = useState<{ booking: TestDriveBooking, mode: 'checkin' | 'checkout' | 'update' | 'view' } | null>(null);
    const [bookingToDelete, setBookingToDelete] = useState<TestDriveBooking | null>(null);


    // State for history view
    const [historyFilters, setHistoryFilters] = useState<{ keyword: string; dateRange: { start: string, end: string }; car: string[]; status: string[]; }>({ keyword: '', dateRange: { start: '', end: '' }, car: [], status: [] });
    const [historySortConfig, setHistorySortConfig] = useState<TestDriveSortConfig | null>({ key: 'ngayThuXe', direction: 'desc' });

    const generateNextSoPhieu = useCallback((latestSoPhieu?: string) => {
        const now = new Date();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear().toString().slice(-2);
        const prefix = `LT/${month}${year}`;

        let nextCounter = 1;
        if (latestSoPhieu && latestSoPhieu.startsWith(prefix)) {
            const parts = latestSoPhieu.split('/');
            const lastCounter = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastCounter)) {
                nextCounter = lastCounter + 1;
            }
        }
        return `${prefix}/${nextCounter.toString().padStart(3, '0')}`;
    }, []);

    const getLatestSoPhieuForCurrentMonth = useCallback((drives: TestDriveBooking[]): string | undefined => {
        const currentMonthPrefix = `LT/${moment().format('MMYY')}`;
        const bookingsThisMonth = drives.filter(b => b.soPhieu && b.soPhieu.startsWith(currentMonthPrefix));

        if (bookingsThisMonth.length === 0) {
            return undefined;
        }

        // Sort by the counter part of soPhieu descending to find the max
        bookingsThisMonth.sort((a, b) => {
            const counterA = parseInt(a.soPhieu.split('/').pop() || '0', 10);
            const counterB = parseInt(b.soPhieu.split('/').pop() || '0', 10);
            return counterB - counterA;
        });

        return bookingsThisMonth[0].soPhieu;
    }, []);

    // Set initial form data after the first data fetch
    useEffect(() => {
        // Initialize the form once the initial data load is finished.
        // This runs whether there are existing bookings or not.
        if (!isLoading && formData.soPhieu === '') {
            const latestSoPhieu = getLatestSoPhieuForCurrentMonth(allTestDrives);
            setFormData(prev => ({ ...prev, tenTuVan: currentUser || '', soPhieu: generateNextSoPhieu(latestSoPhieu) }));
        }
    }, [isLoading, allTestDrives, formData.soPhieu, generateNextSoPhieu, getLatestSoPhieuForCurrentMonth, currentUser]);

    const handleReset = useCallback(() => {
        const latestSoPhieu = getLatestSoPhieuForCurrentMonth(allTestDrives);
        setFormData({ ...initialFormData, tenTuVan: currentUser || '', soPhieu: generateNextSoPhieu(latestSoPhieu) });
        setSelectedBookingForPreview(null);
        setActiveTab('create');
    }, [allTestDrives, generateNextSoPhieu, getLatestSoPhieuForCurrentMonth, currentUser]);

    const triggerPrint = useCallback((bookingData: TestDriveBooking) => {
        setDataForPrinting(bookingData);
//         showToast('Đang chuẩn bị...', 'Vui lòng chờ trong khi tài liệu in đang được tạo.', 'loading');

        setTimeout(() => {
            const printContents = document.getElementById('print-container')?.innerHTML;
            if (!printContents) {
                hideToast();
                showToast('Lỗi In', 'Không tìm thấy nội dung để in.', 'error');
                return;
            }

            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.src = "about:blank";
            document.body.appendChild(iframe);

            const iframeDoc = iframe.contentWindow?.document;
            if (!iframeDoc) {
                hideToast();
                showToast('Lỗi In', 'Không thể tạo tài liệu in.', 'error');
                document.body.removeChild(iframe);
                return;
            }

            iframeDoc.open();
            iframeDoc.write('<html><head><title>In Phiếu Lái Thử</title>');

            const links = document.getElementsByTagName('link');
            for (let i = 0; i < links.length; i++) {
                if (links[i].rel === 'stylesheet') {
                    iframeDoc.write(links[i].outerHTML);
                }
            }
            const styles = document.getElementsByTagName('style');
            for (let i = 0; i < styles.length; i++) {
                iframeDoc.write(styles[i].outerHTML);
            }

            iframeDoc.write('</head><body>');
            // FIX: The original code copied only the innerHTML, losing the #print-container ID
            // which is essential for the print CSS rules to apply correctly. By wrapping the
            // contents in a div with the correct ID, we ensure the print styles can target
            // and display the content.
            iframeDoc.write('<div id="print-wrapper">' + printContents + '</div>');
            iframeDoc.write('</body></html>');
            iframeDoc.close();

            const handleIframeLoad = () => {
                hideToast();
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();

                setTimeout(() => {
                    document.body.removeChild(iframe);
                    if (activeTab === 'create') {
                        handleReset();
                    }
                }, 1000);
            };

            if (iframe.contentWindow) {
                iframe.contentWindow.onload = handleIframeLoad;
            } else {
                setTimeout(handleIframeLoad, 500);
            }

        }, 200);
    }, [activeTab, handleReset, hideToast, showToast]);


    const scheduleForSelectedCar = useMemo(() => {
        if (!formData.ngayThuXe || !formData.loaiXe) return [];
        return allTestDrives.filter(drive => drive.ngayThuXe === formData.ngayThuXe && drive.loaiXe === formData.loaiXe);
    }, [allTestDrives, formData.ngayThuXe, formData.loaiXe]);

    useEffect(() => {
        setConflictError('');
        setSuggestions([]); // Clear suggestions on every change

        if (!formData.thoiGianKhoiHanh || !formData.thoiGianTroVe) return;

        const newStart = timeToMinutes(formData.thoiGianKhoiHanh);
        const newEnd = timeToMinutes(formData.thoiGianTroVe);

        if (newStart >= newEnd) {
            setConflictError('Giờ khởi hành phải trước giờ trở về.');
            return;
        }

        const sortedSchedule = [...scheduleForSelectedCar].sort((a, b) => timeToMinutes(a.thoiGianKhoiHanh) - timeToMinutes(b.thoiGianKhoiHanh));

        const findNextAvailableSlots = (sortedBookings: TestDriveBooking[], duration: number) => {
            const suggestions: string[] = [];
            const dayStart = 8 * 60; // 8:00 AM
            const dayEnd = 20 * 60; // 8:00 PM
            let searchStart = dayStart;

            const mergedBookings = sortedBookings.map(b => ({
                start: timeToMinutes(b.thoiGianKhoiHanh) - BUFFER_MINUTES,
                end: timeToMinutes(b.thoiGianTroVe) + BUFFER_MINUTES,
            }));

            while (searchStart + duration <= dayEnd && suggestions.length < 3) {
                const potentialEnd = searchStart + duration;
                let isConflict = false;
                for (const booking of mergedBookings) {
                    if (searchStart < booking.end && potentialEnd > booking.start) {
                        isConflict = true;
                        searchStart = booking.end;
                        break;
                    }
                }

                if (!isConflict) {
                    const format = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
                    suggestions.push(`${format(searchStart)} - ${format(potentialEnd)}`);
                    searchStart = potentialEnd; // Continue searching from the end of the found slot
                }
            }
            return suggestions;
        };


        for (const booking of sortedSchedule) {
            const existingStart = timeToMinutes(booking.thoiGianKhoiHanh);
            const existingEnd = timeToMinutes(booking.thoiGianTroVe);

            if (newStart < (existingEnd + BUFFER_MINUTES) && (newEnd + BUFFER_MINUTES) > existingStart) {
                setConflictError(`Lịch bị trùng với KH: ${booking.tenKhachHang} (${moment(booking.thoiGianKhoiHanh, "HH:mm").format('HH:mm')} - ${moment(booking.thoiGianTroVe, "HH:mm").format('HH:mm')})`);

                const duration = newEnd - newStart;
                const nextSlots = findNextAvailableSlots(sortedSchedule, duration);
                setSuggestions(nextSlots);

                return;
            }
        }
    }, [formData.thoiGianKhoiHanh, formData.thoiGianTroVe, scheduleForSelectedCar]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'ngayThuXe') {
                newState.ngayCamKet = value;
            }
            return newState;
        });
    };

    const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, tuLai: e.target.value }));
    };

    const handleSuggestionClick = (slot: string) => {
        const [start, end] = slot.split(' - ');
        setFormData(prev => ({
            ...prev,
            thoiGianKhoiHanh: start,
            thoiGianTroVe: end,
        }));
    };

    const handleSaveAndPrint = async () => {
        const requiredFields: { key: keyof TestDriveBooking; label: string }[] = [
            { key: 'ngayThuXe', label: 'Ngày thử xe' }, { key: 'loaiXe', label: 'Loại xe' },
            { key: 'thoiGianKhoiHanh', label: 'Giờ khởi hành' }, { key: 'thoiGianTroVe', label: 'Giờ trở về' },
            { key: 'loTrinh', label: 'Lộ trình' }, { key: 'tenKhachHang', label: 'Tên khách hàng' },
            { key: 'dienThoai', label: 'Điện thoại' }, { key: 'diaChi', label: 'Địa chỉ' },
            { key: 'gplxSo', label: 'Số GPLX' }, { key: 'hieuLucGPLX', label: 'Hiệu lực GPLX' },
            { key: 'cmndO', label: 'Số CMND/CCCD' }, { key: 'cmndNgayCap', label: 'Ngày cấp CMND' },
            { key: 'cmndNoiCap', label: 'Nơi cấp CMND' }, { key: 'gplxHang', label: 'Hạng bằng' },
            { key: 'bienSo', label: 'Biển số xe' },
        ];

        const missingFields = requiredFields.filter(({ key }) => !formData[key]?.trim()).map(({ label }) => label);
        if (missingFields.length > 0) {
            showToast('Thiếu Thông Tin', `Vui lòng điền: ${missingFields.join(', ')}`, 'warning');
            return;
        }
        if (conflictError) {
            showToast('Lỗi Trùng Lịch', `Không thể lưu: ${conflictError}`, 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await apiService.saveTestDriveBooking(formData);
            if (result.status === 'SUCCESS' && result.newRecord) {
                showToast('Lưu Thành Công', 'Lịch lái thử đã được lưu. Chuẩn bị in...', 'success');
                setAllTestDrives(prev => [...prev, result.newRecord].sort((a, b) => b.ngayThuXe.localeCompare(a.ngayThuXe)));

                triggerPrint(formData);

            } else {
                throw new Error(result.message || 'Lưu lịch thất bại.');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Lỗi không xác định.';
            showToast('Lưu Thất Bại', message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReprint = () => {
        if (selectedBookingForPreview) {
            triggerPrint(selectedBookingForPreview);
        }
    };

    const handleUpdateCheckin = async (payload: any): Promise<boolean> => {
//         showToast('Đang Cập Nhật', 'Vui lòng chờ...', 'loading');
        try {
            const result = await apiService.updateTestDriveCheckin(payload);
            if (result.status === 'SUCCESS' && result.updatedRecord) {
                showToast('Thành Công', 'Đã cập nhật thông tin lái thử.', 'success');
                setAllTestDrives(prevDrives =>
                    prevDrives.map(drive =>
                        drive.soPhieu === result.updatedRecord.soPhieu ? result.updatedRecord : drive
                    )
                );
                // Also update the preview if it's the one being edited
                if (selectedBookingForPreview?.soPhieu === result.updatedRecord.soPhieu) {
                    setSelectedBookingForPreview(result.updatedRecord);
                }
                setCheckinModalState(null);
                return true;
            } else {
                throw new Error(result.message || 'Cập nhật thất bại.');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Lỗi không xác định.';
            showToast('Cập Nhật Thất Bại', message, 'error');
            return false;
        }
    };

    const handleDeleteBooking = async (): Promise<boolean> => {
        if (!bookingToDelete) return false;
//         showToast('Đang Xóa', `Đang xóa phiếu ${bookingToDelete.soPhieu}...`, 'loading');
        try {
            const result = await apiService.deleteTestDriveBooking(bookingToDelete.soPhieu);
            if (result.status === 'SUCCESS') {
                showToast('Thành Công', result.message || 'Đã xóa phiếu lái thử.', 'success');
                setAllTestDrives(prev => prev.filter(b => b.soPhieu !== bookingToDelete.soPhieu));
                setBookingToDelete(null);
                return true;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Lỗi không xác định";
            showToast('Xóa Thất Bại', message, 'error');
            setBookingToDelete(null);
            return false;
        }
    };

    const handleOpenCheckinModal = (booking: TestDriveBooking, modeOverride?: 'update' | 'view') => {
        if (modeOverride) {
            setCheckinModalState({ booking, mode: modeOverride });
            return;
        }

        let mode: 'checkin' | 'checkout' | 'update' | 'view' = 'checkin';
        if (booking.odoBefore && booking.odoAfter) {
            mode = 'view';
        } else if (booking.odoBefore) {
            mode = 'checkout';
        }
        setCheckinModalState({ booking, mode });
    };

    const processedHistory = useMemo(() => {
        let filtered = [...allTestDrives];

        if (historyFilters.keyword) {
            const kw = historyFilters.keyword.toLowerCase();
            filtered = filtered.filter(b => {
                const searchStr = [
                    b.soPhieu,
                    b.tenKhachHang,
                    b.dienThoai,
                    b.tenTuVan,
                    b.loaiXe,
                    b.diaChi,
                    b.email,
                    b.loTrinh,
                    b.dacDiem,
                    b.gplxSo
                ].map(val => String(val || '').toLowerCase()).join(' ');
                return searchStr.includes(kw);
            });
        }
        if (historyFilters.dateRange.start && historyFilters.dateRange.end) {
            const start = moment(historyFilters.dateRange.start).startOf('day');
            const end = moment(historyFilters.dateRange.end).endOf('day');
            filtered = filtered.filter(b => {
                if (!b.ngayThuXe) return false;
                const bookingDate = moment(b.ngayThuXe);
                return bookingDate.isBetween(start, end, 'day', '[]'); // inclusive
            });
        }
        if (historyFilters.car.length > 0) {
            filtered = filtered.filter(b => historyFilters.car.includes(b.loaiXe));
        }
        // Status filtering removed - now handled by consultant selection in TestDriveHistoryTable

        if (historySortConfig) {
            filtered.sort((a, b) => {
                const aVal = a[historySortConfig.key];
                const bVal = b[historySortConfig.key];
                if (aVal === null || aVal === undefined || aVal === '') return 1;
                if (bVal === null || bVal === undefined || bVal === '') return -1;

                if (historySortConfig.key === 'ngayThuXe' || historySortConfig.key === 'thoiGianKhoiHanh') {
                    const timeA = moment(`${a.ngayThuXe} ${a.thoiGianKhoiHanh}`, ["YYYY-MM-DD HH:mm", "DD/MM/YYYY HH:mm"]);
                    const timeB = moment(`${b.ngayThuXe} ${b.thoiGianKhoiHanh}`, ["YYYY-MM-DD HH:mm", "DD/MM/YYYY HH:mm"]);
                    if (timeA.isBefore(timeB)) return historySortConfig.direction === 'asc' ? -1 : 1;
                    if (timeA.isAfter(timeB)) return historySortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }

                if (String(aVal) < String(bVal)) return historySortConfig.direction === 'asc' ? -1 : 1;
                if (String(aVal) > String(bVal)) return historySortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [allTestDrives, historyFilters, historySortConfig]);

    const uniqueCars = useMemo(() => [...new Set(allTestDrives.map(b => b.loaiXe))].sort(), [allTestDrives]);


    if (selectedBookingForPreview) {
        return (
            <div className="bg-surface-card p-4 rounded-xl border border-border-primary shadow-lg flex flex-col h-full overflow-hidden animate-fade-in-up">
                <header className="print-hidden flex-shrink-0 flex items-center justify-between border-b border-border-primary mb-4 pb-3 gap-2">
                    <h2 className="text-lg font-bold text-text-primary">Xem Lại Phiếu Lái Thử</h2>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setSelectedBookingForPreview(null)} variant="secondary" size="sm" leftIcon={<i className="fas fa-arrow-left"></i>}>
                            Quay Lại Danh Sách
                        </Button>
                        <Button onClick={handleReprint} variant="primary" size="sm" leftIcon={<i className="fas fa-print"></i>}>
                            In Lại
                        </Button>
                    </div>
                </header>
                <TestDrivePreview data={selectedBookingForPreview} />
                <div id="print-container" className="hidden">
                    <div>
                        <TestDrivePreview.PhieuLaiThu data={dataForPrinting} />
                    </div>
                    <div className="page-break" />
                    <div>
                        <TestDrivePreview.GiayCamKet data={dataForPrinting} />
                    </div>
                </div>
            </div>
        );
    }

    const historyCarTabs = uniqueCars.map(car => ({
        id: car,
        label: car,
        count: allTestDrives.filter(b => b.loaiXe === car).length
    }));

    const historyTabs = [
        { id: 'all', label: 'Tất cả', count: allTestDrives.length },
        ...historyCarTabs
    ];

    const activeHistoryCarTab = (historyFilters.car && historyFilters.car.length === 1) ? historyFilters.car[0] : 'all';

    const handleHistoryTabChange = (tabId: string) => {
        setHistoryFilters(prev => ({ ...prev, car: tabId === 'all' ? [] : [tabId] }));
    };

    return (
        <div className="bg-surface-card p-4 rounded-xl border border-border-primary shadow-lg flex flex-col h-full overflow-hidden">
            {activeTab === 'history' && (
                <div className="flex-shrink-0 mb-2">
                    <TabbedFilter
                        tabs={historyTabs}
                        activeTab={activeHistoryCarTab}
                        onTabChange={handleHistoryTabChange}
                        searchValue={historyFilters.keyword}
                        onSearchChange={(val) => setHistoryFilters(prev => ({ ...prev, keyword: val }))}
                        onReset={() => setHistoryFilters({ keyword: '', dateRange: { start: '', end: '', }, car: [], status: [] })}
                        canReset={true}
                        extraActions={
                            <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-1.5 bg-gray-50/50 border border-gray-100 rounded-md px-2 py-1 lg:py-0.5">
                                    <i className="fas fa-calendar-alt text-accent-primary opacity-60 text-[10px] lg:text-[9px]"></i>
                                    <input
                                        type="date"
                                        className="bg-transparent text-[11px] lg:text-[10px] border-none focus:ring-0 p-0 text-gray-700 w-[95px] lg:w-[85px] font-bold"
                                        value={historyFilters.dateRange.start}
                                        onChange={(e) => setHistoryFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, start: e.target.value } }))}
                                    />
                                    <span className="text-gray-300 text-[10px]">-</span>
                                    <input
                                        type="date"
                                        className="bg-transparent text-[11px] lg:text-[10px] border-none focus:ring-0 p-0 text-gray-700 w-[95px] lg:w-[85px] font-bold"
                                        value={historyFilters.dateRange.end}
                                        onChange={(e) => setHistoryFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, end: e.target.value } }))}
                                    />
                                </div>
                                <Button
                                    onClick={() => setActiveTab('create')}
                                    variant="primary"
                                    className="h-8 lg:h-7 !px-3 lg:!px-2.5 !rounded-md"
                                    leftIcon={<i className="fas fa-plus text-[10px]"></i>}
                                >
                                    <span className="text-[11px] lg:text-[10px] font-bold">Tạo Mới</span>
                                </Button>
                            </div>
                        }
                    >
                        {/* Secondary Filters */}
                        <div className="min-w-[110px] hidden lg:block">
                            <MultiSelectDropdown
                                id="car-filter"
                                label="Dòng xe"
                                options={uniqueCars}
                                selectedOptions={historyFilters.car}
                                onChange={(selected: string[]) => setHistoryFilters(prev => ({ ...prev, car: selected }))}
                                icon="fa-car"
                                displayMode="selection"
                                size="compact"
                                variant="modern"
                                searchable={true}
                                align="right"
                            />
                        </div>
                        <div className="min-w-[110px]">
                            <MultiSelectDropdown
                                id="status-filter"
                                label="Trạng thái"
                                options={['Chờ check-in', 'Đang lái thử', 'Hoàn tất', 'Hủy']}
                                selectedOptions={historyFilters.status}
                                onChange={(selected: string[]) => setHistoryFilters(prev => ({ ...prev, status: selected }))}
                                icon="fa-tasks"
                                displayMode="selection"
                                size="compact"
                                variant="modern"
                                align="right"
                            />
                        </div>
                    </TabbedFilter>
                </div>
            )}


            {activeTab === 'create' && (
                <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-6 overflow-hidden print-hidden">
                    <TestDriveFormInputs
                        formData={formData}
                        handleInputChange={handleInputChange}
                        handleRadioChange={handleRadioChange}
                        conflictError={conflictError}
                        scheduleForSelectedCar={scheduleForSelectedCar}
                        suggestions={suggestions}
                        onSuggestionClick={handleSuggestionClick}
                        onReset={handleReset}
                        onSave={handleSaveAndPrint}
                        isSubmitting={isSubmitting}
                        onSwitchToList={() => setActiveTab('history')}
                    />
                    <TestDrivePreview data={formData} hideOnMobile={true} />
                </div>
            )
            }

            {
                activeTab === 'history' && (
                    <div className="flex-grow flex flex-col overflow-hidden print-hidden">
                        {isLoading && allTestDrives.length === 0 ? (
                            <div className="bg-white/50 h-full rounded-lg overflow-hidden divide-y divide-border-secondary">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                                        <div className="flex-1 space-y-2">
                                            <div className="skeleton-item h-4 w-1/3 rounded-md"></div>
                                            <div className="skeleton-item h-3 w-1/2 rounded-md"></div>
                                        </div>
                                        <div className="skeleton-item h-8 w-24 rounded-lg"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <TestDriveHistoryTable
                                bookings={processedHistory}
                                onSelectBooking={setSelectedBookingForPreview}
                                onUpdateCheckin={handleOpenCheckinModal}
                                onDelete={setBookingToDelete}
                                currentUser={currentUser}
                                isAdmin={isAdmin}
                                onOpenImagePreview={onOpenImagePreview}
                                sortConfig={historySortConfig}
                                onSort={(key) => setHistorySortConfig(prev => ({ key, direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                            />
                        )}
                    </div>
                )
            }

            <div id="print-container" className="hidden">
                <div className="print-page-break-after">
                    <TestDrivePreview.PhieuLaiThu data={dataForPrinting} />
                </div>
                <div>
                    <TestDrivePreview.GiayCamKet data={dataForPrinting} />
                </div>
            </div>


            {
                checkinModalState && (
                    <TestDriveCheckinModal
                        booking={checkinModalState.booking}
                        mode={checkinModalState.mode}
                        onClose={() => setCheckinModalState(null)}
                        onSubmit={handleUpdateCheckin}
                        showToast={showToast}
                        onOpenImagePreview={onOpenImagePreview}
                        currentUser={currentUser}
                        isAdmin={isAdmin}
                    />
                )
            }
            {
                bookingToDelete && (
                    <ActionModal
                        isOpen={!!bookingToDelete}
                        onClose={() => setBookingToDelete(null)}
                        onSubmit={handleDeleteBooking}
                        title="Xác Nhận Xóa Phiếu Lái Thử"
                        description={`Bạn có chắc chắn muốn xóa vĩnh viễn phiếu ${bookingToDelete.soPhieu} của KH: ${bookingToDelete.tenKhachHang}?`}
                        targetId={bookingToDelete.soPhieu}
                        submitText="Xóa Phiếu"
                        submitColor="danger"
                        icon="fa-trash-alt"
                    />
                )
            }
        </div >
    );
};

export default React.memo(TestDriveForm);