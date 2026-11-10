import React, { useMemo } from 'react';
import { useVehicleConfig } from '../../hooks/useVehicleConfig';
import { TestDriveBooking } from '../../types';
import moment from 'moment';

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
        <label htmlFor={String(name)} className="block text-[11px] font-semibold text-slate-600 mb-1 whitespace-nowrap">
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
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
            className={`block h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${readOnly ? 'cursor-not-allowed bg-slate-50 text-slate-400' : ''}`}
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
            <div className="relative bg-slate-100/90 h-6 rounded-md border border-slate-200 overflow-hidden">
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
                            <div className="absolute inset-0 bg-slate-200/60"></div>
                            <div className="absolute h-full bg-slate-400 border-x border-slate-500 top-0 cursor-not-allowed" style={{ left: `${actualLeft}%`, width: `${actualWidth}%` }}></div>
                        </div>
                    );
                })}
                {currentSelection && (
                    <div className={`absolute h-full top-0 border-2 z-10 transition-all duration-300 ${conflictError ? 'bg-rose-500/25 border-rose-500' : 'bg-emerald-500/25 border-emerald-500'}`}
                        style={{
                            left: `${((currentSelection.start - dayStartMinutes) / totalDayMinutes) * 100}%`,
                            width: `${((currentSelection.end - currentSelection.start) / totalDayMinutes) * 100}%`
                        }}>
                    </div>
                )}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 px-0.5 leading-none font-mono">
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

const TestDriveFormInputs: React.FC<TestDriveFormInputsProps> = ({
    formData,
    handleInputChange,
    handleRadioChange,
    conflictError,
    scheduleForSelectedCar,
    suggestions,
    onSuggestionClick,
    onReset,
    onSave,
    isSubmitting,
    onSwitchToList: _onSwitchToList,
    mobileMode = false
}) => {
    const { vehicleLines } = useVehicleConfig();

    if (mobileMode) {
        return (
            <aside className="td-form-mobile flex h-full min-h-0 flex-col overflow-hidden bg-[#f2f2f7] print-hidden">
                <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-3 py-2 backdrop-blur-xl">
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#1c1c1e]">Thông tin lái thử</p>
                        <p className="mt-0.5 truncate text-[9.5px] text-[#8e8e93]">{formData.tenTuVan}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button type="button" onClick={onReset} className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-[10.5px] font-medium text-slate-600">Làm mới</button>
                        <button type="button" onClick={onSave} disabled={!!conflictError || isSubmitting} className="h-7 rounded-lg bg-blue-600 px-2.5 text-[10.5px] font-semibold text-white">{isSubmitting ? 'Đang lưu...' : 'Lưu'}</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    <div className="rounded-xl bg-white p-3 border border-slate-200 space-y-2.5">
                        <p className="text-xs font-bold text-slate-800">Lịch Trình & Xe</p>
                        <InputField name="ngayThuXe" label="Ngày lái thử" type="date" value={formData.ngayThuXe} onChange={handleInputChange} required />
                        <div>
                            <label htmlFor="loaiXe" className="block text-[11px] font-semibold text-slate-600 mb-1">Loại xe *</label>
                            <select name="loaiXe" id="loaiXe" value={formData.loaiXe} onChange={handleInputChange} className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs">
                                <option value="" disabled>Chọn xe</option>
                                {vehicleLines.map(model => (<option key={model} value={model}>{model}</option>))}
                            </select>
                        </div>
                        <InputField name="bienSo" label="Biển số" value={formData.bienSo || ''} onChange={handleInputChange} placeholder="VD: 98A-123.45" required />
                        <InputField name="loTrinh" label="Lộ trình" value={formData.loTrinh} onChange={handleInputChange} required />
                    </div>

                    <div className="rounded-xl bg-white p-3 border border-slate-200 space-y-2.5">
                        <p className="text-xs font-bold text-slate-800">Khách Hàng</p>
                        <InputField name="tenKhachHang" label="Họ tên" value={formData.tenKhachHang} onChange={handleInputChange} required />
                        <InputField name="dienThoai" label="Điện thoại" type="tel" value={formData.dienThoai} onChange={handleInputChange} required />
                        <InputField name="diaChi" label="Địa chỉ" value={formData.diaChi} onChange={handleInputChange} required />
                        <InputField name="gplxSo" label="Số GPLX" value={formData.gplxSo} onChange={handleInputChange} required />
                    </div>
                </div>
            </aside>
        );
    }

    return (
        <aside className="w-full lg:w-[480px] xl:w-[520px] shrink-0 border-r border-slate-200/90 bg-white flex flex-col h-full min-h-0 overflow-y-auto p-5 space-y-5 print-hidden">
            {/* SECTION 1: LỊCH TRÌNH & XE */}
            <div className="space-y-3.5">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                    <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                        <i className="fas fa-car-side"></i>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Lịch Trình &amp; Xe Lái Thử
                    </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <InputField name="ngayThuXe" label="Ngày lái thử" type="date" value={formData.ngayThuXe} onChange={handleInputChange} required />
                    <div>
                        <label htmlFor="loaiXe" className="block text-[11px] font-semibold text-slate-600 mb-1 whitespace-nowrap">
                            Loại xe <span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <select
                            name="loaiXe"
                            id="loaiXe"
                            value={formData.loaiXe}
                            onChange={handleInputChange}
                            className="block h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="" disabled>Chọn xe</option>
                            {vehicleLines.map(model => (<option key={model} value={model}>{model}</option>))}
                        </select>
                    </div>
                    <InputField name="bienSo" label="Biển số xe" value={formData.bienSo || ''} onChange={handleInputChange} placeholder="VD: 98A-123.45" required />
                </div>

                <Timeline bookings={scheduleForSelectedCar} formData={formData} conflictError={conflictError} />

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-end">
                    <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                        <div>
                            <label htmlFor="thoiGianKhoiHanh" className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Từ <span className="text-rose-500 ml-0.5">*</span>
                            </label>
                            <select
                                name="thoiGianKhoiHanh"
                                id="thoiGianKhoiHanh"
                                value={formData.thoiGianKhoiHanh}
                                onChange={handleInputChange}
                                className="block h-8 w-full rounded-lg border border-slate-200 bg-white px-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                            >
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
                            <label htmlFor="thoiGianTroVe" className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Đến <span className="text-rose-500 ml-0.5">*</span>
                            </label>
                            <select
                                name="thoiGianTroVe"
                                id="thoiGianTroVe"
                                value={formData.thoiGianTroVe}
                                onChange={handleInputChange}
                                className="block h-8 w-full rounded-lg border border-slate-200 bg-white px-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                            >
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
                    <div className="sm:col-span-4">
                        <InputField name="loTrinh" label="Lộ trình lái thử" value={formData.loTrinh} onChange={handleInputChange} required placeholder="VD: Showroom -> Đại Lộ Bình Dương..." />
                    </div>
                </div>

                {conflictError && (
                    <div className="text-[11px] text-rose-700 bg-rose-50 rounded-lg p-2.5 border border-rose-200 flex items-start gap-2">
                        <i className="fas fa-exclamation-triangle text-rose-500 mt-0.5"></i>
                        <div>
                            <span className="font-bold">Trùng lịch:</span> {conflictError}
                            {suggestions.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1.5 items-center">
                                    <span className="text-slate-600 text-[10px]">Gợi ý khung giờ rảnh:</span>
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => onSuggestionClick(s)}
                                            className="bg-white hover:bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-200 transition-colors cursor-pointer"
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

            {/* SECTION 2: THÔNG TIN KHÁCH HÀNG & GPLX */}
            <div className="space-y-3.5 pt-2">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                    <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
                        <i className="fas fa-id-card"></i>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Thông Tin Khách Hàng &amp; Bằng Lái
                    </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                        <InputField name="tenKhachHang" label="Họ và tên khách hàng" value={formData.tenKhachHang} onChange={handleInputChange} required placeholder="Nhập họ tên" />
                    </div>
                    <InputField name="dienThoai" label="Số điện thoại" type="tel" value={formData.dienThoai} onChange={handleInputChange} required pattern="0[0-9]{9,10}" placeholder="09..." />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <InputField name="email" label="Email" type="email" value={formData.email} onChange={handleInputChange} placeholder="email@example.com" required />
                    <div className="sm:col-span-2">
                        <InputField name="diaChi" label="Địa chỉ thường trú" value={formData.diaChi} onChange={handleInputChange} required placeholder="Địa chỉ thường trú" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <InputField name="cmndO" label="Số CMND/CCCD" value={formData.cmndO || ''} onChange={handleInputChange} placeholder="Mã định danh" required />
                    <InputField name="cmndNgayCap" label="Ngày cấp CMND/CCCD" type="date" value={formData.cmndNgayCap || ''} onChange={handleInputChange} required />
                    <InputField name="cmndNoiCap" label="Nơi cấp" value={formData.cmndNoiCap || ''} onChange={handleInputChange} placeholder="Cục CS QLHC..." required />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                    <div className="sm:col-span-3">
                        <InputField name="gplxSo" label="Số GPLX" value={formData.gplxSo} onChange={handleInputChange} required />
                    </div>
                    <div className="sm:col-span-2">
                        <InputField name="gplxHang" label="Hạng Bằng" value={formData.gplxHang || ''} onChange={handleInputChange} placeholder="B2..." required />
                    </div>
                    <div className="sm:col-span-4">
                        <InputField name="hieuLucGPLX" label="Hết hạn GPLX" type="date" value={formData.hieuLucGPLX} onChange={handleInputChange} required />
                    </div>
                    <div className="sm:col-span-3 flex flex-col justify-end pb-1">
                        <span className="text-[11px] font-semibold text-slate-600 mb-1.5 block">Tự lái xe? <span className="text-rose-500">*</span></span>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer group">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${formData.tuLai === 'co' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white group-hover:border-blue-400'}`}>
                                    {formData.tuLai === 'co' && <i className="fas fa-check text-white text-[7px]"></i>}
                                </div>
                                <input type="radio" name="tuLai" value="co" checked={formData.tuLai === 'co'} onChange={handleRadioChange} className="hidden" />
                                <span className="text-xs text-slate-700 font-medium">Có</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer group">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${formData.tuLai === 'khong' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white group-hover:border-blue-400'}`}>
                                    {formData.tuLai === 'khong' && <i className="fas fa-check text-white text-[7px]"></i>}
                                </div>
                                <input type="radio" name="tuLai" value="khong" checked={formData.tuLai === 'khong'} onChange={handleRadioChange} className="hidden" />
                                <span className="text-xs text-slate-700 font-medium">Không</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default React.memo(TestDriveFormInputs);
