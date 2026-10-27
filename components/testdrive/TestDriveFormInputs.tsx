import React, { useMemo, useState } from 'react';
import { useVehicleConfig } from '../../hooks/useVehicleConfig';
import { TestDriveBooking } from '../../types';
import moment from 'moment';
import Button from '../ui/Button';

interface InputFieldProps {
    name: keyof TestDriveBooking;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
    readOnly?: boolean;
    pattern?: string;
    title?: string;
    className?: string;
}

const InputField: React.FC<InputFieldProps> = ({ name, label, value, onChange, type = "text", placeholder, required, readOnly, pattern, title, className = "" }) => (
    <div className={className}>
        <label htmlFor={String(name)} className="block text-[11px] font-medium text-text-secondary mb-0.5 whitespace-nowrap">
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
        </label>
        <input
            type={type}
            name={String(name)}
            id={String(name)}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            readOnly={readOnly}
            pattern={pattern}
            title={title}
            className={`block h-10 w-full rounded-xl border border-slate-200 bg-[#f7f7f9] px-3 py-1.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-400 md:h-9 md:rounded-lg md:border-border-secondary md:bg-surface-ground md:px-2.5 md:focus:border-accent-primary md:focus:ring-accent-primary ${readOnly ? 'cursor-not-allowed bg-surface-input text-text-secondary' : 'text-text-primary'}`}
        />
    </div>
);


const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    if (time.includes('T') || time.includes(' ')) {
        const date = moment(time);
        if (date.isValid()) return date.hour() * 60 + date.minute();
    }
    const parts = time.split(':');
    if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (!isNaN(hours) && !isNaN(minutes)) return hours * 60 + minutes;
    }
    return 0;
};

const formatDisplayTime = (timeStr: string): string => {
    if (!timeStr) return '';
    if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
    const time = moment(timeStr);
    if (time.isValid()) return time.format('HH:mm');
    return timeStr;
};

const BUFFER_MINUTES = 15;

const Timeline: React.FC<{
    bookings: TestDriveBooking[];
    formData: TestDriveBooking;
    conflictError: string;
}> = ({ bookings, formData, conflictError }) => {
    const dayStartMinutes = 8 * 60;
    const dayEndMinutes = 20 * 60;
    const totalDayMinutes = dayEndMinutes - dayStartMinutes;

    const currentSelection = useMemo(() => {
        if (!formData.thoiGianKhoiHanh || !formData.thoiGianTroVe) return null;
        const start = timeToMinutes(formData.thoiGianKhoiHanh);
        const end = timeToMinutes(formData.thoiGianTroVe);
        if (start >= end) return null;
        return { start, end };
    }, [formData.thoiGianKhoiHanh, formData.thoiGianTroVe]);

    return (
        <div className="space-y-1 mt-1">
            <div className="relative bg-white h-7 rounded-md shadow-inner border border-border-secondary overflow-hidden">
                {bookings.map(booking => {
                    const start = timeToMinutes(booking.thoiGianKhoiHanh);
                    const end = timeToMinutes(booking.thoiGianTroVe);
                    const bufferStart = Math.max(dayStartMinutes, start - BUFFER_MINUTES);
                    const bufferEnd = Math.min(dayEndMinutes, end + BUFFER_MINUTES);
                    const left = ((bufferStart - dayStartMinutes) / totalDayMinutes) * 100;
                    const width = ((bufferEnd - bufferStart) / totalDayMinutes) * 100;
                    const actualLeft = ((start - bufferStart) / (bufferEnd - bufferStart)) * 100;
                    const actualWidth = ((end - start) / (bufferEnd - bufferStart)) * 100;

                    return (
                        <div key={booking.soPhieu}
                            className="absolute h-full group top-0"
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`Đã đặt: ${formatDisplayTime(booking.thoiGianKhoiHanh)} - ${formatDisplayTime(booking.thoiGianTroVe)}\nKH: ${booking.tenKhachHang}`}>
                            <div className="absolute inset-0 bg-slate-200/50"></div>
                            <div className="absolute h-full bg-slate-400/80 border-x border-slate-500 top-0 cursor-not-allowed" style={{ left: `${actualLeft}%`, width: `${actualWidth}%` }}></div>
                        </div>
                    );
                })}
                {currentSelection && (
                    <div className={`absolute h-full top-0 border-2 z-10 transition-all duration-300 ${conflictError ? 'bg-danger/20 border-danger' : 'bg-success/20 border-success'}`}
                        style={{
                            left: `${((currentSelection.start - dayStartMinutes) / totalDayMinutes) * 100}%`,
                            width: `${((currentSelection.end - currentSelection.start) / totalDayMinutes) * 100}%`
                        }}>
                    </div>
                )}
            </div>
            <div className="flex justify-between text-[10px] text-text-secondary px-0.5 leading-none font-medium">
                <span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span><span>18:00</span><span>20:00</span>
            </div>
        </div>
    );
};


interface TestDriveFormInputsProps {
    formData: TestDriveBooking;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handleRadioChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    conflictError: string;
    scheduleForSelectedCar: TestDriveBooking[];
    suggestions: string[];
    onSuggestionClick: (slot: string) => void;
    onReset: () => void;
    onSave: () => void;
    isSubmitting: boolean;
    onSwitchToList: () => void;
    mobileMode?: boolean;
}

const TestDriveFormInputs: React.FC<TestDriveFormInputsProps> = ({ formData, handleInputChange, handleRadioChange, conflictError, scheduleForSelectedCar, suggestions, onSuggestionClick, onReset, onSave, isSubmitting, onSwitchToList, mobileMode = false }) => {
    const { vehicleLines } = useVehicleConfig();
    const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);

    if (mobileMode) {
        const panelClass = 'rounded-2xl bg-white p-3 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.5)] ring-1 ring-black/[0.04]';
        return (
            <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f2f2f7] print-hidden">
                <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-3 py-2 backdrop-blur-xl">
                    <div className="min-w-0"><p className="text-[13px] font-semibold text-[#1c1c1e]">Thông tin lái thử</p><p className="mt-0.5 truncate text-[9.5px] text-[#8e8e93]">{formData.tenTuVan}</p></div>
                    <div className="flex items-center gap-1.5">
                        <button type="button" onClick={onReset} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500" title="Làm mới"><i className="fas fa-rotate text-[10px]" /></button>
                        <button type="button" onClick={onSwitchToList} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500" title="Danh sách"><i className="fas fa-list text-[10px]" /></button>
                    </div>
                </div>

                <div className="flex flex-shrink-0 items-center px-4 py-2.5">
                    {[
                        { id: 1, label: 'Xe & lịch' },
                        { id: 2, label: 'Khách hàng' },
                        { id: 3, label: 'Giấy tờ' },
                    ].map((step, index) => (
                        <React.Fragment key={step.id}>
                            <button type="button" onClick={() => setMobileStep(step.id as 1 | 2 | 3)} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${mobileStep === step.id ? 'bg-slate-900 text-white' : mobileStep > step.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 ring-1 ring-slate-200'}`}>{mobileStep > step.id ? <i className="fas fa-check text-[8px]" /> : step.id}</span>
                                <span className={`text-[9px] font-medium ${mobileStep === step.id ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</span>
                            </button>
                            {index < 2 && <span className={`mb-4 h-px w-8 ${mobileStep > step.id ? 'bg-blue-500' : 'bg-slate-200'}`} />}
                        </React.Fragment>
                    ))}
                </div>

                <div className="min-h-0 flex-1 overflow-hidden px-3 pb-2">
                    {mobileStep === 1 && (
                        <div className={`${panelClass} space-y-2.5`}>
                            <div className="grid grid-cols-2 gap-2">
                                <InputField name="ngayThuXe" label="Ngày lái thử" type="date" value={formData.ngayThuXe} onChange={handleInputChange} required />
                                <div><label htmlFor="mobile-loaiXe" className="mb-0.5 block whitespace-nowrap text-[11px] font-medium text-text-secondary">Loại xe <span className="text-danger">*</span></label><select name="loaiXe" id="mobile-loaiXe" value={formData.loaiXe} onChange={handleInputChange} className="h-10 w-full rounded-xl border border-slate-200 bg-[#f7f7f9] px-2 text-sm outline-none focus:border-blue-400"><option value="">Chọn xe</option>{vehicleLines.map(model => <option key={model} value={model}>{model}</option>)}</select></div>
                            </div>
                            <InputField name="bienSo" label="Biển số xe" value={formData.bienSo || ''} onChange={handleInputChange} placeholder="VD: 98A-123.45" required />
                            <Timeline bookings={scheduleForSelectedCar} formData={formData} conflictError={conflictError} />
                            <div className="grid grid-cols-2 gap-2">
                                <div><label htmlFor="mobile-start" className="mb-0.5 block text-[11px] font-medium text-text-secondary">Từ <span className="text-danger">*</span></label><select name="thoiGianKhoiHanh" id="mobile-start" value={formData.thoiGianKhoiHanh} onChange={handleInputChange} className="h-10 w-full rounded-xl border border-slate-200 bg-[#f7f7f9] px-2 text-sm outline-none"> <option value="">--:--</option>{Array.from({ length: 49 }, (_, i) => { const h = Math.floor(i * 15 / 60) + 8; const m = (i * 15) % 60; if (h > 20) return null; const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; return <option key={value} value={value}>{value}</option>; })}</select></div>
                                <div><label htmlFor="mobile-end" className="mb-0.5 block text-[11px] font-medium text-text-secondary">Đến <span className="text-danger">*</span></label><select name="thoiGianTroVe" id="mobile-end" value={formData.thoiGianTroVe} onChange={handleInputChange} className="h-10 w-full rounded-xl border border-slate-200 bg-[#f7f7f9] px-2 text-sm outline-none"><option value="">--:--</option>{Array.from({ length: 49 }, (_, i) => { const h = Math.floor(i * 15 / 60) + 8; const m = (i * 15) % 60; if (h > 20) return null; const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; return <option key={value} value={value}>{value}</option>; })}</select></div>
                            </div>
                            <InputField name="loTrinh" label="Lộ trình" value={formData.loTrinh} onChange={handleInputChange} required placeholder="Showroom → điểm đến" />
                            {conflictError && <p className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[9.5px] text-rose-600"><i className="fas fa-triangle-exclamation mr-1" />{conflictError}</p>}
                        </div>
                    )}

                    {mobileStep === 2 && (
                        <div className={`${panelClass} space-y-3`}>
                            <InputField name="tenKhachHang" label="Họ và tên" value={formData.tenKhachHang} onChange={handleInputChange} required placeholder="Nhập tên khách hàng" />
                            <InputField name="dienThoai" label="Số điện thoại" type="tel" value={formData.dienThoai} onChange={handleInputChange} required pattern="0[0-9]{9,10}" placeholder="09..." />
                            <InputField name="email" label="Email" type="email" value={formData.email} onChange={handleInputChange} placeholder="email@example.com" required />
                            <InputField name="diaChi" label="Địa chỉ" value={formData.diaChi} onChange={handleInputChange} required placeholder="Địa chỉ thường trú" />
                        </div>
                    )}

                    {mobileStep === 3 && (
                        <div className={`${panelClass} space-y-2.5`}>
                            <InputField name="cmndO" label="Số CCCD" value={formData.cmndO || ''} onChange={handleInputChange} placeholder="Mã định danh" required />
                            <div className="grid grid-cols-2 gap-2"><InputField name="cmndNgayCap" label="Ngày cấp" type="date" value={formData.cmndNgayCap || ''} onChange={handleInputChange} required /><InputField name="cmndNoiCap" label="Nơi cấp" value={formData.cmndNoiCap || ''} onChange={handleInputChange} placeholder="Cục CS QLHC" required /></div>
                            <div className="grid grid-cols-2 gap-2"><InputField name="gplxSo" label="Số GPLX" value={formData.gplxSo} onChange={handleInputChange} required /><InputField name="gplxHang" label="Hạng bằng" value={formData.gplxHang || ''} onChange={handleInputChange} placeholder="B2" required /></div>
                            <InputField name="hieuLucGPLX" label="Hết hạn GPLX" type="date" value={formData.hieuLucGPLX} onChange={handleInputChange} required />
                            <div className="flex items-center justify-between rounded-xl bg-[#f7f7f9] px-3 py-2"><span className="text-[11px] font-medium text-slate-600">Khách tự lái?</span><div className="flex rounded-lg bg-[#e3e3e8] p-0.5"><label className={`cursor-pointer rounded-md px-4 py-1 text-[10px] font-semibold ${formData.tuLai === 'co' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><input type="radio" name="tuLai" value="co" checked={formData.tuLai === 'co'} onChange={handleRadioChange} className="hidden" />Có</label><label className={`cursor-pointer rounded-md px-4 py-1 text-[10px] font-semibold ${formData.tuLai === 'khong' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><input type="radio" name="tuLai" value="khong" checked={formData.tuLai === 'khong'} onChange={handleRadioChange} className="hidden" />Không</label></div></div>
                        </div>
                    )}
                </div>

                <div className="flex flex-shrink-0 gap-2 border-t border-slate-200/80 bg-white/95 p-3 backdrop-blur-xl">
                    {mobileStep > 1 ? <button type="button" onClick={() => setMobileStep((mobileStep - 1) as 1 | 2)} className="h-11 flex-1 rounded-[14px] bg-slate-100 text-xs font-semibold text-slate-600">Quay lại</button> : <button type="button" onClick={onSwitchToList} className="h-11 flex-1 rounded-[14px] bg-slate-100 text-xs font-semibold text-slate-600">Hủy</button>}
                    {mobileStep < 3 ? <button type="button" onClick={() => setMobileStep((mobileStep + 1) as 2 | 3)} className="h-11 flex-[2] rounded-[14px] bg-slate-900 text-xs font-semibold text-white">Tiếp theo <i className="fas fa-chevron-right ml-1 text-[9px]" /></button> : <button type="button" onClick={onSave} disabled={!!conflictError || isSubmitting} className="h-11 flex-[2] rounded-[14px] bg-slate-900 text-xs font-semibold text-white disabled:bg-slate-300">{isSubmitting ? 'Đang lưu...' : 'Lưu & In'}</button>}
                </div>
            </aside>
        );
    }

    return (
        <aside className="flex h-full flex-col overflow-hidden bg-[#f2f2f7] print-hidden lg:col-span-2 md:bg-transparent">
            <div className="flex h-full flex-col overflow-hidden bg-[#f2f2f7] md:rounded-xl md:border md:border-border-primary/50 md:bg-surface-card md:shadow-sm">
                {/* Header */}
                <div className="flex flex-shrink-0 flex-col items-stretch justify-between gap-2 border-b border-slate-200/80 bg-white/90 p-2.5 backdrop-blur-xl sm:flex-row sm:items-center sm:gap-0 md:border-border-primary/50 md:bg-surface-ground/30">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center">
                            <i className="fas fa-steering-wheel text-accent-primary text-sm"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-text-primary text-sm whitespace-nowrap leading-none">Thông Tin Lái Thử</h3>
                            {formData.tenTuVan && <p className="text-[10px] text-text-secondary mt-0.5"><i className="fas fa-user-tie mr-1"></i>{formData.tenTuVan}</p>}
                        </div>
                    </div>

                    <div className="flex w-full rounded-[10px] bg-[#e3e3e8] p-0.5 sm:w-auto md:border md:border-border-secondary/50 md:bg-surface-ground md:p-1 md:shadow-sm">
                        <Button
                            onClick={onReset}
                            variant="ghost"
                            size="sm"
                            className="h-7 flex-1 rounded-md px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:bg-white hover:text-text-primary sm:flex-none"
                            leftIcon={<i className="fas fa-sync-alt text-[10px]"></i>}
                        >
                            Làm Mới
                        </Button>
                        <div className="w-px bg-border-secondary/50 mx-1 h-3 self-center"></div>
                        <Button
                            onClick={onSave}
                            disabled={!!conflictError || isSubmitting}
                            isLoading={isSubmitting}
                            variant="primary"
                            size="sm"
                            className={`h-7 flex-1 rounded-md px-2.5 py-1 text-[11px] font-bold shadow-sm sm:flex-none ${!!conflictError ? 'opacity-50 cursor-not-allowed' : ''}`}
                            leftIcon={!isSubmitting ? <i className="fas fa-save text-[10px]"></i> : undefined}
                        >
                            Lưu & In
                        </Button>
                        <div className="w-px bg-border-secondary/50 mx-1 h-3 self-center"></div>
                        <Button
                            onClick={onSwitchToList}
                            variant="ghost"
                            size="sm"
                            className="h-7 flex-1 rounded-md px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:bg-white hover:text-text-primary sm:flex-none"
                            leftIcon={<i className="fas fa-list text-[10px]"></i>}
                        >
                            Danh Sách
                        </Button>
                    </div>
                </div>

                {/* Content - single flowing layout, no scroll */}
                <div className="flex flex-grow flex-col gap-3 overflow-y-auto p-3 md:gap-4">
                    {/* SECTION 1: LỊCH TRÌNH & XE */}
                    <div className="flex-shrink-0 rounded-2xl bg-white p-3.5 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.5)] ring-1 ring-black/[0.04] md:rounded-xl md:border md:border-border-secondary/30 md:bg-surface-ground/50 md:p-3 md:shadow-sm md:ring-0">
                        <h4 className="text-[11px] font-bold text-accent-primary uppercase tracking-wider mb-2.5 border-b border-border-secondary/30 pb-0.5 flex items-center">
                            <i className="fas fa-calendar-alt mr-1.5 opacity-70"></i>Lịch Trình & Xe
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2.5">
                            <InputField name="ngayThuXe" label="Ngày lái thử" type="date" value={formData.ngayThuXe} onChange={handleInputChange} required />
                            <div>
                                <label htmlFor="loaiXe" className="block text-[11px] font-medium text-text-secondary mb-0.5 whitespace-nowrap">Loại xe <span className="text-danger ml-0.5">*</span></label>
                                <select name="loaiXe" id="loaiXe" value={formData.loaiXe} onChange={handleInputChange} className="block h-10 w-full rounded-xl border border-slate-200 bg-[#f7f7f9] px-3 py-1.5 text-sm text-text-primary outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-400 md:h-9 md:rounded-lg md:border-border-secondary md:bg-surface-ground md:px-2.5 md:focus:border-accent-primary md:focus:ring-accent-primary">
                                    <option value="" disabled>Chọn xe</option>
                                    {vehicleLines.map(model => (<option key={model} value={model}>{model}</option>))}
                                </select>
                            </div>
                            <InputField name="bienSo" label="Biển số xe" value={formData.bienSo || ''} onChange={handleInputChange} placeholder="VD: 98A-123.45" required />
                        </div>

                        <Timeline bookings={scheduleForSelectedCar} formData={formData} conflictError={conflictError} />

                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-2.5 items-end">
                            <div className="md:col-span-2 grid grid-cols-2 gap-2">
                                <div>
                                    <label htmlFor="thoiGianKhoiHanh" className="block text-[11px] font-medium text-text-secondary mb-0.5">Từ <span className="text-danger ml-0.5">*</span></label>
                                    <select name="thoiGianKhoiHanh" id="thoiGianKhoiHanh" value={formData.thoiGianKhoiHanh} onChange={handleInputChange} className="block h-10 w-full rounded-xl border border-slate-200 bg-[#f7f7f9] px-2 py-1.5 text-sm text-text-primary outline-none focus:border-blue-400 focus:bg-white md:h-9 md:rounded-lg md:border-border-secondary md:bg-surface-ground">
                                        <option value="">--:--</option>
                                        {Array.from({ length: 49 }, (_, i) => {
                                            const h = Math.floor(i * 15 / 60) + 8;
                                            const m = (i * 15) % 60;
                                            if (h > 20) return null;
                                            const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                            return <option key={val} value={val}>{val}</option>;
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="thoiGianTroVe" className="block text-[11px] font-medium text-text-secondary mb-0.5">Đến <span className="text-danger ml-0.5">*</span></label>
                                    <select name="thoiGianTroVe" id="thoiGianTroVe" value={formData.thoiGianTroVe} onChange={handleInputChange} className="block h-10 w-full rounded-xl border border-slate-200 bg-[#f7f7f9] px-2 py-1.5 text-sm text-text-primary outline-none focus:border-blue-400 focus:bg-white md:h-9 md:rounded-lg md:border-border-secondary md:bg-surface-ground">
                                        <option value="">--:--</option>
                                        {Array.from({ length: 49 }, (_, i) => {
                                            const h = Math.floor(i * 15 / 60) + 8;
                                            const m = (i * 15) % 60;
                                            if (h > 20) return null;
                                            const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                            return <option key={val} value={val}>{val}</option>;
                                        })}
                                    </select>
                                </div>
                            </div>
                            <div className="md:col-span-4">
                                <InputField name="loTrinh" label="Lộ trình" value={formData.loTrinh} onChange={handleInputChange} required placeholder="VD: Showroom -> Đại Lộ Bình Dương..." />
                            </div>
                        </div>

                        {conflictError && (
                            <div className="text-[10px] text-danger mt-1.5 flex items-start bg-danger-bg/20 rounded-md p-1.5 border border-danger/20">
                                <i className="fas fa-exclamation-triangle mr-1.5 mt-0.5"></i>
                                <div>
                                    <span className="font-bold">Trùng lịch:</span> {conflictError}
                                    {suggestions.length > 0 && (
                                        <div className="mt-0.5 flex flex-wrap gap-1.5 items-center">
                                            <span className="text-text-primary">Gợi ý:</span>
                                            {suggestions.map((s, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => onSuggestionClick(s)}
                                                    className="bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary px-1.5 py-0.5 rounded text-[10px] font-bold border border-accent-primary/30 transition-colors"
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SECTION 2: KHÁCH HÀNG */}
                    <div className="flex flex-shrink-0 flex-col rounded-2xl bg-white p-3.5 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.5)] ring-1 ring-black/[0.04] md:rounded-xl md:border md:border-border-secondary/30 md:bg-surface-ground/50 md:p-3 md:shadow-sm md:ring-0">
                        <h4 className="text-[11px] font-bold text-accent-primary uppercase tracking-wider mb-2.5 border-b border-border-secondary/30 pb-0.5 flex items-center">
                            <i className="fas fa-user mr-1.5 opacity-70"></i>Thông Tin Khách Hàng
                        </h4>

                        <div className="flex flex-col justify-between flex-grow gap-2">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="md:col-span-2">
                                    <InputField name="tenKhachHang" label="Họ và tên" value={formData.tenKhachHang} onChange={handleInputChange} required placeholder="Nhập tên khách hàng" />
                                </div>
                                <InputField name="dienThoai" label="Số điện thoại" type="tel" value={formData.dienThoai} onChange={handleInputChange} required pattern="0[0-9]{9,10}" placeholder="09..." />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <InputField name="email" label="Email" type="email" value={formData.email} onChange={handleInputChange} placeholder="email@example.com" required />
                                <div className="md:col-span-2">
                                    <InputField name="diaChi" label="Địa chỉ" value={formData.diaChi} onChange={handleInputChange} required placeholder="Địa chỉ thường trú" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <InputField name="cmndO" label="Số CMND/CCCD" value={formData.cmndO || ''} onChange={handleInputChange} placeholder="Mã định danh" required />
                                <InputField name="cmndNgayCap" label="Ngày cấp" type="date" value={formData.cmndNgayCap || ''} onChange={handleInputChange} required />
                                <InputField name="cmndNoiCap" label="Nơi cấp" value={formData.cmndNoiCap || ''} onChange={handleInputChange} placeholder="Cục CS QLHC..." required />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <div className="md:col-span-3">
                                <InputField name="gplxSo" label="Số GPLX" value={formData.gplxSo} onChange={handleInputChange} required />
                            </div>
                            <div className="md:col-span-2">
                                <InputField name="gplxHang" label="Hạng Bằng" value={formData.gplxHang || ''} onChange={handleInputChange} placeholder="B2..." required />
                            </div>
                            <div className="md:col-span-4">
                                <InputField name="hieuLucGPLX" label="Hết hạn GPLX" type="date" value={formData.hieuLucGPLX} onChange={handleInputChange} required />
                            </div>
                            <div className="md:col-span-3 flex flex-col justify-end pb-1.5 pl-0 md:pl-2 pt-2 md:pt-0 border-t border-border-secondary/30 md:border-t-0 mt-2 md:mt-0">
                                <span className="text-[10px] font-medium text-text-secondary mb-1.5 block">Tự lái? <span className="text-danger">*</span></span>
                                <div className="flex gap-3">
                                    <label className="flex items-center gap-1.5 cursor-pointer group">
                                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${formData.tuLai === 'co' ? 'border-accent-primary bg-accent-primary' : 'border-text-secondary bg-transparent group-hover:border-accent-primary'}`}>
                                            {formData.tuLai === 'co' && <i className="fas fa-check text-white text-[7px]"></i>}
                                        </div>
                                        <input type="radio" name="tuLai" value="co" checked={formData.tuLai === 'co'} onChange={handleRadioChange} className="hidden" />
                                        <span className="text-xs">Có</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer group">
                                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${formData.tuLai === 'khong' ? 'border-accent-primary bg-accent-primary' : 'border-text-secondary bg-transparent group-hover:border-accent-primary'}`}>
                                            {formData.tuLai === 'khong' && <i className="fas fa-check text-white text-[7px]"></i>}
                                        </div>
                                        <input type="radio" name="tuLai" value="khong" checked={formData.tuLai === 'khong'} onChange={handleRadioChange} className="hidden" />
                                        <span className="text-xs">Không</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default React.memo(TestDriveFormInputs);
