import React, { useState, useEffect, useMemo, useCallback } from 'react';
import moment from 'moment';
import { TestDriveBooking } from '../types';
import * as apiService from '../services/apiService';
import TestDriveFormInputs from './testdrive/TestDriveFormInputs';
import TestDrivePreview from './testdrive/TestDrivePreview';
import TestDriveHistoryTable from './testdrive/TestDriveHistoryTable';
import TestDriveCheckinModal from './testdrive/TestDriveCheckinModal';

interface ImageSource {
    src: string;
    originalUrl?: string;
    label: string;
}

interface TestDriveFormProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onOpenImagePreview: (images: ImageSource[], startIndex: number, customerName: string) => void;
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
};

const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    
    // Handle full ISO/Date string from Google Sheets (which is what moment.utc is good at)
    if (time.includes('T') || time.includes(' ')) {
        const date = moment.utc(time);
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

const formatDisplayTime = (timeStr: string): string => {
    if (!timeStr) return '';
    // Handle HH:mm format directly
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
        return timeStr;
    }
    // Handle full ISO/Date string from Google Sheets
    const time = moment.utc(timeStr);
    if (time.isValid()) {
        return time.format('HH:mm');
    }
    return timeStr; // Fallback
};

const BUFFER_MINUTES = 15;

const TestDriveForm: React.FC<TestDriveFormProps> = ({ showToast, onOpenImagePreview }) => {
    const [formData, setFormData] = useState<TestDriveBooking>(() => {
        const user = sessionStorage.getItem('currentConsultant') || '';
        return { ...initialFormData, tenTuVan: user };
    });
    const [allTestDrives, setAllTestDrives] = useState<TestDriveBooking[]>([]);
    const [conflictError, setConflictError] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
    const [selectedBookingForPreview, setSelectedBookingForPreview] = useState<TestDriveBooking | null>(null);
    const [dataForPrinting, setDataForPrinting] = useState<TestDriveBooking>(formData);
    const [isPrinting, setIsPrinting] = useState(false);
    const [checkinBooking, setCheckinBooking] = useState<TestDriveBooking | null>(null);

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

    const fetchSchedule = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await apiService.getTestDriveSchedule();
            if (result.status === 'SUCCESS' && result.data) {
                const schedule: TestDriveBooking[] = result.data;
                const sortedSchedule = schedule.sort((a, b) => a.soPhieu.localeCompare(b.soPhieu));
                setAllTestDrives(sortedSchedule);
                const latestSoPhieu = sortedSchedule.length > 0 ? sortedSchedule[sortedSchedule.length - 1].soPhieu : undefined;
                const user = sessionStorage.getItem('currentConsultant') || '';
                setFormData({ ...initialFormData, tenTuVan: user, soPhieu: generateNextSoPhieu(latestSoPhieu) });
            } else {
                showToast('Lỗi Tải Lịch', result.message || 'Không thể tải dữ liệu lịch lái thử.', 'error');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Lỗi không xác định.';
            showToast('Lỗi Mạng', message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [generateNextSoPhieu, showToast]);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    const handleReset = useCallback(() => {
        const latestSoPhieu = allTestDrives.length > 0 ? allTestDrives[allTestDrives.length - 1].soPhieu : undefined;
        const user = sessionStorage.getItem('currentConsultant') || '';
        setFormData({ ...initialFormData, soPhieu: generateNextSoPhieu(latestSoPhieu), tenTuVan: user });
        setSelectedBookingForPreview(null);
        setActiveTab('create');
    }, [allTestDrives, generateNextSoPhieu]);

    useEffect(() => {
        if (isPrinting) {
            window.print();
            setIsPrinting(false);
            if (activeTab === 'create') {
                handleReset();
            }
        }
    }, [isPrinting, activeTab, handleReset]);

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
                setConflictError(`Lịch bị trùng với KH: ${booking.tenKhachHang} (${formatDisplayTime(booking.thoiGianKhoiHanh)} - ${formatDisplayTime(booking.thoiGianTroVe)})`);
                
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
                setAllTestDrives(prev => [...prev, result.newRecord].sort((a,b) => a.soPhieu.localeCompare(b.soPhieu)));
                
                setDataForPrinting(formData);
                setIsPrinting(true); 

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
            setDataForPrinting(selectedBookingForPreview);
            setIsPrinting(true);
        }
    };

    const handleUpdateCheckin = async (payload: any): Promise<boolean> => {
        showToast('Đang Cập Nhật', 'Vui lòng chờ...', 'loading');
        try {
            const result = await apiService.updateTestDriveCheckin(payload);
            if (result.status === 'SUCCESS' && result.updatedRecord) {
                showToast('Thành Công', 'Đã cập nhật thông tin lái thử.', 'success');
                setAllTestDrives(prevDrives => 
                    prevDrives.map(drive => 
                        drive.soPhieu === result.updatedRecord.soPhieu ? result.updatedRecord : drive
                    )
                );
                setCheckinBooking(null);
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

    if (selectedBookingForPreview) {
        return (
            <div className="bg-surface-card p-4 rounded-xl border border-border-primary shadow-lg flex flex-col h-full overflow-hidden animate-fade-in-up">
                <header className="print-hidden flex-shrink-0 flex items-center justify-between border-b border-border-primary mb-4 pb-3 gap-2">
                    <h2 className="text-lg font-bold text-text-primary">Xem Lại Phiếu Lái Thử</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedBookingForPreview(null)} className="btn-secondary !py-2 !px-3"><i className="fas fa-arrow-left mr-2"></i>Quay Lại Danh Sách</button>
                        <button onClick={handleReprint} className="btn-primary !py-2 !px-3"><i className="fas fa-print mr-2"></i>In Lại</button>
                    </div>
                </header>
                <TestDrivePreview data={selectedBookingForPreview} />
                <div id="print-container" className="hidden">
                    <div className="print-page-break-after">
                        <TestDrivePreview.PhieuLaiThu data={dataForPrinting} />
                    </div>
                    <div>
                        <TestDrivePreview.GiayCamKet data={dataForPrinting} />
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-surface-card p-4 rounded-xl border border-border-primary shadow-lg flex flex-col h-full overflow-hidden animate-fade-in-up">
            <header className="print-hidden flex-shrink-0 flex items-center justify-between mb-4 pb-3 gap-2">
                <div className="flex items-center border border-border-primary rounded-lg bg-surface-ground p-0.5">
                    <button onClick={() => setActiveTab('create')} className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === 'create' ? 'bg-white text-accent-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
                        <i className="fas fa-edit mr-2"></i>Tạo Phiếu Mới
                    </button>
                     <button onClick={() => setActiveTab('history')} className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === 'history' ? 'bg-white text-accent-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
                        <i className="fas fa-history mr-2"></i>Lịch Sử Phiếu
                    </button>
                </div>
                 <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="btn-secondary !py-2 !px-3" title="Xóa toàn bộ thông tin đã nhập"><i className="fas fa-eraser mr-2"></i>Làm Mới</button>
                    {activeTab === 'create' && (
                        <button onClick={handleSaveAndPrint} disabled={!!conflictError || isSubmitting} className="btn-primary !py-2 !px-3" title="Lưu & In văn bản">
                            {isSubmitting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Đang lưu...</> : <><i className="fas fa-print mr-2"></i>Lưu & In</>}
                        </button>
                    )}
                </div>
            </header>

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
                    />
                    <TestDrivePreview data={formData} />
                </div>
            )}
            
            {activeTab === 'history' && (
                <div className="flex-grow overflow-hidden print-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <i className="fas fa-spinner fa-spin text-4xl text-accent-primary"></i>
                        </div>
                    ) : (
                        <TestDriveHistoryTable 
                            bookings={allTestDrives}
                            onSelectBooking={setSelectedBookingForPreview}
                            onUpdateCheckin={setCheckinBooking}
                        />
                    )}
                </div>
            )}
            
            <div id="print-container" className="hidden">
                <div className="print-page-break-after">
                    <TestDrivePreview.PhieuLaiThu data={dataForPrinting} />
                </div>
                <div>
                    <TestDrivePreview.GiayCamKet data={dataForPrinting} />
                </div>
            </div>
            
            {checkinBooking && (
                <TestDriveCheckinModal
                    booking={checkinBooking}
                    onClose={() => setCheckinBooking(null)}
                    onSubmit={handleUpdateCheckin}
                    showToast={showToast}
                    onOpenImagePreview={onOpenImagePreview}
                />
            )}
        </div>
    );
};

export default React.memo(TestDriveForm);