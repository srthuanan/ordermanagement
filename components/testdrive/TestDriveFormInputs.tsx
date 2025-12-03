import React, { useMemo } from 'react';
import { versionsMap } from '../../constants';
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
}

const InputField: React.FC<InputFieldProps> = ({ name, label, value, onChange, type = "text", placeholder, required, readOnly, pattern, title }) => (
    <div>
        <label htmlFor={String(name)} className="block text-sm font-medium text-text-secondary">
            {label}
            {required && <span className="text-danger ml-1">*</span>}
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
            className={`mt-1 block w-full futuristic-input p-2 text-sm ${readOnly ? 'bg-surface-input cursor-not-allowed' : ''}`}
        />
    </div>
);

interface TextAreaFieldProps {
    name: keyof TestDriveBooking;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    required?: boolean;
}

const TextAreaField: React.FC<TextAreaFieldProps> = ({ name, label, value, onChange, placeholder, required }) => (
    <div>
        <label htmlFor={String(name)} className="block text-sm font-medium text-text-secondary">
            {label}
            {required && <span className="text-danger ml-1">*</span>}
        </label>
        <textarea name={String(name)} id={String(name)} value={value} onChange={onChange} placeholder={placeholder} className="mt-1 block w-full futuristic-input p-2 text-sm" rows={2} />
    </div>
);


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

const formatDisplayTime = (timeStr: string): string => {
    if (!timeStr) return '';
    // Handle HH:mm format directly
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
        return timeStr;
    }
    // Handle full ISO/Date string from Google Sheets
    const time = moment(timeStr);
    if (time.isValid()) {
        return time.format('HH:mm');
    }
    return timeStr; // Fallback
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

    if (!formData.ngayThuXe || !formData.loaiXe) {
        return <div className="p-4 text-center bg-surface-ground rounded-lg text-sm text-text-secondary">Vui lòng chọn ngày và loại xe để xem lịch.</div>;
    }

    return (
        <div className="space-y-2">
            <div className="relative bg-white h-10 rounded shadow-inner-sm border border-border-secondary overflow-hidden">
                {/* Booked slots with buffers */}
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
                            className="absolute h-full group"
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`Đã đặt: ${formatDisplayTime(booking.thoiGianKhoiHanh)} - ${formatDisplayTime(booking.thoiGianTroVe)}\nKH: ${booking.tenKhachHang}`}>
                            <div className="absolute inset-0 bg-slate-300/60 rounded"></div>
                            <div className="absolute h-full bg-slate-400/80 border-x border-slate-500" style={{ left: `${actualLeft}%`, width: `${actualWidth}%` }}></div>
                        </div>
                    );
                })}
                {/* Current selection */}
                {currentSelection && (
                    <div className={`absolute h-full rounded border-2 z-10 ${conflictError ? 'bg-danger/50 border-danger' : 'bg-success/50 border-success'}`}
                        style={{
                            left: `${((currentSelection.start - dayStartMinutes) / totalDayMinutes) * 100}%`,
                            width: `${((currentSelection.end - currentSelection.start) / totalDayMinutes) * 100}%`
                        }}>
                    </div>
                )}
            </div>
            {/* Time markers */}
            <div className="flex justify-between text-xs text-text-secondary px-1">
                <span>8:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span><span>18:00</span><span>20:00</span>
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
}

const TestDriveFormInputs: React.FC<TestDriveFormInputsProps> = ({ formData, handleInputChange, handleRadioChange, conflictError, scheduleForSelectedCar, suggestions, onSuggestionClick, onReset, onSave, isSubmitting }) => {
    return (
        <aside className="lg:col-span-2 print-hidden overflow-y-auto pr-4 space-y-5">
            <section>
                <div className="flex items-center justify-between border-b border-border-primary pb-2 mb-3">
                    <h3 className="font-semibold text-accent-primary text-base">Thông tin Lịch Hẹn</h3>
                    <div className="flex items-center gap-2 md:hidden">
                        <Button
                            onClick={onReset}
                            variant="secondary"
                            size="sm"
                            className="!py-1 !px-2 text-xs !h-auto"
                            leftIcon={<i className="fas fa-undo"></i>}
                        >
                            Làm Mới
                        </Button>
                        <Button
                            onClick={onSave}
                            disabled={!!conflictError || isSubmitting}
                            isLoading={isSubmitting}
                            variant="primary"
                            size="sm"
                            className="!py-1 !px-2 text-xs !h-auto"
                            leftIcon={!isSubmitting ? <i className="fas fa-save"></i> : undefined}
                        >
                            Lưu & In
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <InputField name="ngayThuXe" label="Ngày thử xe / Ngày cam kết" type="date" value={formData.ngayThuXe} onChange={handleInputChange} required />
                    <InputField name="tenTuVan" label="Tư vấn bán hàng" value={formData.tenTuVan} onChange={() => { }} readOnly />
                    <div className="sm:col-span-2">
                        <label htmlFor="loaiXe" className="block text-sm font-medium text-text-secondary">Loại xe<span className="text-danger ml-1">*</span></label>
                        <select name="loaiXe" id="loaiXe" value={formData.loaiXe} onChange={handleInputChange} className="mt-1 block w-full futuristic-input p-2 text-sm">
                            <option value="" disabled>Chọn loại xe</option>
                            {Object.keys(versionsMap).map(model => (<option key={model} value={model}>{model}</option>))}
                        </select>
                    </div>

                    <div className="sm:col-span-2 pt-2">
                        <Timeline bookings={scheduleForSelectedCar} formData={formData} conflictError={conflictError} />
                    </div>

                    <InputField name="thoiGianKhoiHanh" label="Giờ khởi hành" type="time" value={formData.thoiGianKhoiHanh} onChange={handleInputChange} required />
                    <InputField name="thoiGianTroVe" label="Giờ trở về" type="time" value={formData.thoiGianTroVe} onChange={handleInputChange} required />
                    <div className="sm:col-span-2"><TextAreaField name="loTrinh" label="Lộ trình" value={formData.loTrinh} onChange={handleInputChange} required /></div>
                    {conflictError && (
                        <div className="sm:col-span-2 mt-1 p-3 bg-danger-bg/50 border border-danger/30 rounded-lg text-sm animate-fade-in-up">
                            <p className="text-danger font-semibold"><i className="fas fa-exclamation-triangle mr-2"></i>{conflictError}</p>
                            {suggestions.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-danger/20">
                                    <p className="font-semibold text-text-primary">Gợi ý các khung giờ trống tiếp theo:</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {suggestions.map(slot => (
                                            <Button
                                                key={slot}
                                                onClick={() => onSuggestionClick(slot)}
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs bg-success/10 text-success font-semibold px-2 py-1 rounded hover:bg-success/20 transition-colors !h-auto"
                                            >
                                                {slot}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>

            <section>
                <h3 className="font-semibold text-accent-primary text-base border-b border-border-primary pb-2 mb-3">Thông tin Khách hàng</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <div className="sm:col-span-2"><InputField name="tenKhachHang" label="Tên khách hàng" value={formData.tenKhachHang} onChange={handleInputChange} required /></div>
                    <InputField
                        name="dienThoai"
                        label="Điện thoại"
                        type="tel"
                        value={formData.dienThoai}
                        onChange={handleInputChange}
                        required
                        pattern="0[0-9]{9,10}"
                        title="Số điện thoại phải bắt đầu bằng 0 và có 10 hoặc 11 chữ số."
                    />
                    <InputField name="email" label="Email" type="email" value={formData.email} onChange={handleInputChange} />
                    <div className="sm:col-span-2"><TextAreaField name="diaChi" label="Địa chỉ" value={formData.diaChi} onChange={handleInputChange} required /></div>
                    <InputField name="gplxSo" label="Số GPLX" value={formData.gplxSo} onChange={handleInputChange} required />
                    <InputField name="hieuLucGPLX" label="Hiệu lực GPLX" type="date" value={formData.hieuLucGPLX} onChange={handleInputChange} required />
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-text-secondary">Tự lái thử<span className="text-danger ml-1">*</span></label>
                        <div className="mt-2 flex gap-6">
                            <label className="flex items-center gap-2"><input type="radio" name="tuLai" value="co" checked={formData.tuLai === 'co'} onChange={handleRadioChange} className="h-4 w-4" /> Có</label>
                            <label className="flex items-center gap-2"><input type="radio" name="tuLai" value="khong" checked={formData.tuLai === 'khong'} onChange={handleRadioChange} className="h-4 w-4" /> Không</label>
                        </div>
                    </div>
                    <div className="sm:col-span-2"><TextAreaField name="dacDiem" label="Đặc điểm khách hàng quan tâm" value={formData.dacDiem} onChange={handleInputChange} /></div>
                </div>
            </section>
        </aside>
    );
};

export default React.memo(TestDriveFormInputs);