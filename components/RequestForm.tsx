import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { AnalyticsData, Order, StockVehicle } from '../types';
import { extractDateFromImageTesseract } from '../services/ocrService';
import { versionsMap, allPossibleVersions, defaultExteriors, defaultInteriors, interiorColorRules, VALID_IMAGES_BY_MODEL } from '../constants';
import * as apiService from '../services/apiService';
import FileUpload from './ui/FileUpload';
import CarImage from './ui/CarImage';
import Button from './ui/Button';
import MultiSelectDropdown from './ui/MultiSelectDropdown';

interface ImageSource {
    src: string;
    originalUrl?: string;
    label: string;
}

interface RequestFormProps {
    onSuccess: (newOrder: Order) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    hideToast: () => void;
    existingOrderNumbers: string[];
    initialVehicle?: StockVehicle;
    currentUser: string;
    vehicleAnalyticsData: AnalyticsData;
    onOpenImagePreview: (images: ImageSource[], startIndex: number, customerName: string) => void;
}

const InputGroup: React.FC<{ icon?: string; children: React.ReactNode; label: string; htmlFor: string; required?: boolean }> = ({ icon, children, label, htmlFor, required }) => (
    <div className="group space-y-2.5">
        <label htmlFor={htmlFor} className="flex items-center text-[10px] md:text-xs font-black text-slate-500/80 transition-colors group-focus-within:text-accent-primary uppercase tracking-[0.15em]">
            {icon && <i className={`fas ${icon} mr-2 text-slate-400/60 group-focus-within:text-accent-primary transition-colors`}></i>}
            {label} {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative">
            {children}
        </div>
    </div>
);


const RequestForm: React.FC<RequestFormProps> = ({ onSuccess, showToast, existingOrderNumbers, initialVehicle, currentUser, vehicleAnalyticsData, onOpenImagePreview }) => {
    // --- State ---
    const [step, setStep] = useState<1 | 2>(1); // 1: Config, 2: Info
    const [formData, setFormData] = useState({
        ten_ban_hang: currentUser,
        ten_khach_hang: '',
        so_don_hang: '',
        dong_xe: '',
        phien_ban: '',
        ngoai_that: '',
        noi_that: '',
        ngay_coc: '',
        vin: '',
    });
    const [chicFile, setChicFile] = useState<File | null>(null);
    const [isProcessingOcr, setIsProcessingOcr] = useState(false);
    const [ocrStatus, setOcrStatus] = useState('');
    const [warningMessage, setWarningMessage] = useState('');
    const [warningType, setWarningType] = useState<'hot' | 'slow' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dmsWarning, setDmsWarning] = useState('');

    const [availableExteriors, setAvailableExteriors] = useState<string[]>(defaultExteriors);
    const [availableInteriors, setAvailableInteriors] = useState<string[]>(defaultInteriors);

    const inputClass = "w-full pl-4 pr-4 py-3.5 bg-white border border-slate-200 rounded-lg text-base font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/10 transition-all duration-300 shadow-sm hover:border-slate-300";
    const isPreFilled = !!initialVehicle;

    // --- Effects ---
    useEffect(() => {
        if (initialVehicle) {
            setFormData(prev => ({
                ...prev,
                dong_xe: initialVehicle['Dòng xe'] || '',
                phien_ban: initialVehicle['Phiên bản'] || '',
                ngoai_that: initialVehicle['Ngoại thất'] || '',
                noi_that: initialVehicle['Nội thất'] || '',
                vin: initialVehicle.VIN || '',
            }));
            const model = initialVehicle['Dòng xe'];
            if (model) {
                const modelKey = model.toLowerCase().replace(/\s+/g, '');
                const validCodes = VALID_IMAGES_BY_MODEL[modelKey];
                if (validCodes) {
                    const filteredExteriors = defaultExteriors.filter(color => {
                        const match = color.match(/\(([^)]+)\)/);
                        return match && match[1] && validCodes.includes(match[1].toLowerCase());
                    });
                    setAvailableExteriors(filteredExteriors);
                }
            }
            setStep(2); // Automatically jump to step 2 if pairing a specific vehicle
        } else {
            setStep(1);
        }
    }, [initialVehicle]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: value };

            // --- CHECK DMS WARNING ---
            if (name === 'so_don_hang' && initialVehicle) {
                const dmsCode = initialVehicle["Mã DMS"] || Object.entries(initialVehicle).find(([k]) => k.includes("DMS"))?.[1];
                if (dmsCode && value.length >= 6) {
                    const prefix = value.substring(0, 6).toUpperCase();
                    const dmsUpper = String(dmsCode).toUpperCase();
                    if (prefix !== dmsUpper) {
                        setDmsWarning(`Mã DMS (${dmsUpper}) không khớp với 6 ký tự đầu SĐH (${prefix})`);
                    } else {
                        setDmsWarning('');
                    }
                } else {
                    setDmsWarning('');
                }
            }
            // --------------------------

            if (name === 'dong_xe') {
                newState.phien_ban = ''; newState.ngoai_that = ''; newState.noi_that = '';
                if (value === 'VF 5') newState.phien_ban = 'Plus';
                const modelKey = value.toLowerCase().replace(/\s+/g, '');
                const validCodes = VALID_IMAGES_BY_MODEL[modelKey];
                if (validCodes) {
                    const filteredExteriors = defaultExteriors.filter(color => {
                        const match = color.match(/\(([^)]+)\)/);
                        return match && match[1] && validCodes.includes(match[1].toLowerCase());
                    });
                    setAvailableExteriors(filteredExteriors);
                } else {
                    setAvailableExteriors(defaultExteriors);
                }
            }
            if (name === 'phien_ban') { newState.ngoai_that = ''; newState.noi_that = ''; }
            return newState;
        });
    };

    useEffect(() => {
        const { dong_xe, phien_ban } = formData;
        if (!dong_xe) { setAvailableInteriors(defaultInteriors); return; }
        const lowerDongXe = dong_xe.toLowerCase();
        const lowerPhienBan = phien_ban.toLowerCase();
        let interiors = defaultInteriors;
        for (const rule of interiorColorRules) {
            if (rule.models.includes(lowerDongXe) && (!rule.versions || rule.versions.includes(lowerPhienBan))) {
                interiors = rule.colors; break;
            }
        }
        setAvailableInteriors(interiors);
        if (interiors.length === 1) setFormData(prev => ({ ...prev, noi_that: interiors[0] }));
    }, [formData.dong_xe, formData.phien_ban]);

    const handleFileSelect = useCallback(async (file: File | null) => {
        setChicFile(file);
        setFormData(prev => ({ ...prev, ngay_coc: '' }));
        setOcrStatus('');
        if (file) {
            setIsProcessingOcr(true);
            setOcrStatus('Đang nhận diện ngày...');
            try {
                const extractedDate = await extractDateFromImageTesseract(file, (status) => setOcrStatus(status));
                if (extractedDate) {
                    const formattedDate = extractedDate.includes('T') ? extractedDate.split('T')[0] : extractedDate;
                    setFormData(prev => ({ ...prev, ngay_coc: formattedDate }));
                    setOcrStatus('Đã điền');
                } else {
                    setOcrStatus('Không tìm thấy ngày cọc');
                }
            } catch (error) {
                console.error("OCR Fail:", error);
                setOcrStatus('Lỗi OCR (Vui lòng điền tay)');
            } finally {
                setIsProcessingOcr(false);
            }
        }
    }, []);

    const handleClearForm = () => {
        setFormData({ ten_ban_hang: currentUser, ten_khach_hang: '', so_don_hang: '', dong_xe: '', phien_ban: '', ngoai_that: '', noi_that: '', ngay_coc: '', vin: '', });
        handleFileSelect(null);
        setStep(1);
    };

    useEffect(() => {
        if (!vehicleAnalyticsData || isPreFilled) return;
        const { dong_xe, phien_ban, ngoai_that } = formData;
        if (!dong_xe || !phien_ban || !ngoai_that) { setWarningMessage(''); setWarningType(null); return; }
        const vehicleKey = `${dong_xe}|${phien_ban}|${ngoai_that}`.trim().toLowerCase();
        const pendingCount = vehicleAnalyticsData.pendingRequestCount?.[vehicleKey] || 0;
        const stockInfo = vehicleAnalyticsData.stockStatus?.[vehicleKey] || { count: 0, isSlowMoving: false };
        if (pendingCount > 0) {
            setWarningMessage(`Đang có <strong>${pendingCount}</strong> khách khác chờ ghép.`);
            setWarningType('hot');
        } else if (stockInfo.isSlowMoving && stockInfo.count > 0) {
            setWarningMessage(`Xe đang có sẵn, giao ngay.`);
            setWarningType('slow');
        } else { setWarningMessage(''); setWarningType(null); }
    }, [formData.dong_xe, formData.phien_ban, formData.ngoai_that, vehicleAnalyticsData, isPreFilled]);

    const validateStep1 = () => {
        const { dong_xe, phien_ban, ngoai_that, noi_that } = formData;
        if (!dong_xe || !phien_ban || !ngoai_that || !noi_that) {
            showToast('Thiếu Thông Tin', 'Vui lòng chọn đầy đủ cấu hình xe.', 'warning', 3000);
            return false;
        }
        return true;
    };

    const handleNextStep = () => {
        if (step === 1) {
            if (validateStep1()) setStep(2);
        }
    };

    const handleBackStep = () => setStep(1);

    const handleConfirmSubmit = async (e: FormEvent) => {
        e.preventDefault();
        // Validation Step 2
        const requiredFields: (keyof typeof formData)[] = ['ten_khach_hang', 'so_don_hang'];
        if (requiredFields.some(field => !formData[field])) { showToast('Thiếu Thông Tin', 'Vui lòng điền đủ thông tin khách hàng.', 'warning', 3000); return; }
        const pattern = new RegExp("^N[0-9]{5}-[A-Z]{3}-[0-9]{2}-[0-9]{2}-[0-9]{4}$");
        if (!pattern.test(formData.so_don_hang)) { showToast('Sai Định Dạng', 'Số đơn hàng không đúng.', 'warning', 4000); return; }
        if (existingOrderNumbers.includes(formData.so_don_hang)) { showToast('Trùng Lặp', 'Số đơn hàng đã tồn tại.', 'error', 4000); return; }
        if (!chicFile) { showToast('Thiếu Chứng Từ', 'Vui lòng tải lên UNC.', 'warning', 3000); return; }
        if (!formData.ngay_coc) { showToast('Chờ Xử Lý Ảnh', 'Vui lòng chờ OCR.', 'warning', 3000); return; }

        setIsSubmitting(true);
//         showToast('Đang Gửi', 'Đang xử lý...', 'loading');
        try {
            const result = await apiService.addRequest(formData, chicFile);
            if (result.status === "SUCCESS" && result.newRecord) { onSuccess(result.newRecord); handleClearForm(); }
            else { throw new Error(result.message || 'Thất bại.'); }
        } catch (error) {
            showToast('Lỗi', error instanceof Error ? error.message : 'Lỗi lạ.', 'error', 5000);
        } finally { setIsSubmitting(false); }
    };

    const handleShowSample = (e: React.MouseEvent) => { e.preventDefault(); onOpenImagePreview([{ src: 'pictures/uynhiemchi.webp', originalUrl: 'pictures/uynhiemchi.webp', label: 'Mẫu UNC' }], 0, 'Ảnh Mẫu'); };
    const availableVersions = formData.dong_xe ? (versionsMap[formData.dong_xe as keyof typeof versionsMap] || allPossibleVersions) : [];
    const warningClasses = {
        'hot': 'bg-orange-50 border-orange-100 text-orange-700 font-bold shadow-sm animate-pulse-subtle',
        'slow': 'bg-green-50 border-green-100 text-green-700 font-bold shadow-sm'
    };

    return (
        <form onSubmit={handleConfirmSubmit} className="flex flex-col lg:flex-row h-full w-full bg-transparent overflow-hidden gap-0 lg:gap-6 p-0 lg:p-4">

            {/* LEFT PANEL: Branding & Large Compact Preview (60%) */}
            <div className="w-full lg:w-[60%] relative order-1 lg:order-1 flex flex-col z-20 hidden md:flex">
                <div className="flex-1 p-8 flex flex-col justify-center items-center relative overflow-hidden bg-transparent rounded-2xl border border-white/20 shadow-none">
                    <div className="relative z-10 w-full mb-8 text-center text-slate-800">
                        <h2 className="text-4xl font-black text-slate-800 tracking-tighter drop-shadow-md uppercase italic">{formData.dong_xe || "VinFast"}</h2>
                        {formData.phien_ban && <div className="mt-2 text-xs font-black text-accent-primary uppercase tracking-[0.3em] bg-accent-primary/5 px-3 py-1 rounded-full inline-block">{formData.phien_ban}</div>}
                    </div>

                    <div className="relative w-full flex-grow flex items-center justify-center p-4">
                        {(formData.dong_xe && formData.ngoai_that) ? (
                            <CarImage
                                model={formData.dong_xe}
                                exteriorColor={formData.ngoai_that}
                                className="w-full h-auto max-h-[60vh] object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.1)] z-20 transition-all duration-700 ease-out"
                                alt="Xe"
                            />
                        ) : (
                            <div className="text-slate-400 flex flex-col items-center"><i className="fas fa-car text-7xl mb-4 opacity-20"></i><p className="text-sm font-bold tracking-widest uppercase">Chưa chọn xe</p></div>
                        )}
                        {(isSubmitting || isProcessingOcr) && <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-md rounded-2xl z-30"><i className="fas fa-circle-notch fa-spin text-4xl text-accent-primary"></i></div>}
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: Compact Stepper Form (40%) */}
            <div className="flex-1 lg:w-[40%] order-2 lg:order-2 bg-transparent flex flex-col h-full relative z-10 overflow-hidden rounded-2xl border border-white/20 shadow-none">
                {/* Stepper Header - Compact */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-transparent shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${step >= 1 ? 'bg-accent-primary text-white' : 'bg-slate-100 text-slate-400'}`}>1</div>
                        <div className={`h-0.5 w-12 rounded-full transition-all ${step >= 2 ? 'bg-accent-primary' : 'bg-slate-100'}`}></div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${step >= 2 ? 'bg-accent-primary text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-800">{step === 1 ? 'Cấu hình Xe' : 'Thông tin HĐ'}</h3>
                    </div>
                </div>

                {/* Content Area - NO SCROLL - Fully fitted */}
                <div className="flex-grow flex flex-col p-3 md:p-4 overflow-hidden">
                    <div className="flex-grow flex flex-col justify-center w-full bg-white/40 backdrop-blur-md rounded-[2rem] p-4 md:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-white/50 relative">
                        {/* Inner subtle glow */}
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>

                        {/* STEP 1: Premium Config Grid */}
                        {step === 1 && (
                            <div className="space-y-4 md:space-y-5 animate-fade-in relative z-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-8 md:gap-y-4">
                                    <div className="md:col-span-2">
                                        <InputGroup label="Dòng xe" htmlFor="dong_xe" icon="fa-car" required>
                                            <MultiSelectDropdown id="dong_xe" label="Dòng xe" placeholder="Chọn dòng xe..." options={Object.keys(versionsMap)} selectedOptions={formData.dong_xe ? [formData.dong_xe] : []} onChange={(s) => handleInputChange({ target: { name: 'dong_xe', value: s[0] || '' } } as any)} icon="fa-car" selectionMode="single" variant="modern" disabled={isPreFilled} searchable={false} />
                                        </InputGroup>
                                    </div>
                                    <div className="col-span-1">
                                        <InputGroup label="Phiên bản" htmlFor="phien_ban" icon="fa-code-branch" required>
                                            <MultiSelectDropdown id="phien_ban" label="Phiên bản" placeholder="Chọn phiên bản..." options={availableVersions} selectedOptions={formData.phien_ban ? [formData.phien_ban] : []} onChange={(s) => handleInputChange({ target: { name: 'phien_ban', value: s[0] || '' } } as any)} icon="fa-code-branch" selectionMode="single" variant="modern" disabled={!formData.dong_xe || isPreFilled} searchable={false} />
                                        </InputGroup>
                                    </div>
                                    <div className="col-span-1">
                                        <InputGroup label="Ngoại thất" htmlFor="ngoai_that" icon="fa-fill-drip" required>
                                            <MultiSelectDropdown id="ngoai_that" label="Ngoại thất" placeholder="Chọn màu..." options={availableExteriors} selectedOptions={formData.ngoai_that ? [formData.ngoai_that] : []} onChange={(s) => handleInputChange({ target: { name: 'ngoai_that', value: s[0] || '' } } as any)} icon="fa-fill-drip" selectionMode="single" variant="modern" disabled={!formData.phien_ban || isPreFilled} searchable={false} />
                                        </InputGroup>
                                    </div>
                                    <div className="md:col-span-2">
                                        <InputGroup label="Nội thất" htmlFor="noi_that" icon="fa-couch" required>
                                            <MultiSelectDropdown id="noi_that" label="Nội thất" placeholder="Chọn nội thất..." options={availableInteriors} selectedOptions={formData.noi_that ? [formData.noi_that] : []} onChange={(s) => handleInputChange({ target: { name: 'noi_that', value: s[0] || '' } } as any)} icon="fa-couch" selectionMode="single" variant="modern" disabled={!formData.phien_ban || isPreFilled} searchable={false} />
                                        </InputGroup>
                                    </div>
                                </div>
                                {warningMessage && warningType && <div className={`p-3 rounded-lg border flex items-center gap-2 text-xs ${warningClasses[warningType]}`}><i className={`fas ${warningType === 'hot' ? 'fa-fire' : 'fa-check-circle'}`}></i><span dangerouslySetInnerHTML={{ __html: warningMessage }}></span></div>}
                            </div>
                        )}

                        {/* STEP 2: Premium Info Grid */}
                        {step === 2 && (
                            <div className="space-y-4 md:space-y-5 animate-fade-in relative z-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-8 md:gap-y-4">
                                    <div className="md:col-span-2">
                                        <InputGroup label="Tên khách hàng" htmlFor="ten_khach_hang" icon="fa-user" required>
                                            <input id="ten_khach_hang" type="text" name="ten_khach_hang" value={formData.ten_khach_hang} onChange={handleInputChange} onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} required className={`${inputClass} !py-2.5`} placeholder="" />
                                        </InputGroup>
                                    </div>
                                    <div className="md:col-span-2">
                                        <InputGroup label="Số đơn hàng" htmlFor="so_don_hang" icon="fa-barcode" required>
                                            <input
                                                id="so_don_hang"
                                                type="text"
                                                name="so_don_hang"
                                                value={formData.so_don_hang}
                                                onChange={handleInputChange}
                                                required
                                                pattern="^N[0-9]{5}-[A-Z]{3}-[0-9]{2}-[0-9]{2}-[0-9]{4}$"
                                                title="Định dạng: Nxxxxx-XXX-yy-mm-zzzz"
                                                onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Sai định dạng.')}
                                                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                                                className={`${inputClass} !py-2.5 ${dmsWarning ? 'border-red-400 focus:ring-red-100' : ''}`}
                                                placeholder=""
                                            />
                                            {dmsWarning && (
                                                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-red-500 bg-red-50 p-2 rounded-lg border border-red-100 animate-fade-in">
                                                    <i className="fas fa-exclamation-triangle"></i>
                                                    {dmsWarning}
                                                </div>
                                            )}
                                        </InputGroup>
                                    </div>

                                </div>
                                <div className="p-4 md:p-5 bg-slate-50/50 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-inner">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-accent-primary/10 flex items-center justify-center">
                                                <i className="fas fa-file-invoice-dollar text-accent-primary text-[10px]"></i>
                                            </div>
                                            ỦY NHIỆM CHI <span className="text-red-500">*</span>
                                        </label>
                                        <button type="button" onClick={handleShowSample} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-accent-primary hover:bg-accent-primary hover:text-white hover:border-accent-primary transition-all uppercase">Xem mẫu</button>
                                    </div>
                                    <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessingOcr} ocrStatus={ocrStatus} showToast={showToast} />
                                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500 bg-white/80 p-3 rounded-xl border border-slate-100 shadow-sm">
                                        <span className="font-medium">Ngày cọc (OCR tự động):</span>
                                        <span className={`font-mono font-bold px-2 py-0.5 rounded ${formData.ngay_coc ? 'text-green-600 bg-green-50' : 'text-slate-400 bg-slate-50'}`}>
                                            {formData.ngay_coc ? new Date(formData.ngay_coc).toLocaleDateString('vi-VN') : 'CHƯA NHẬN DIỆN'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions - Compact */}
                <div className="p-3 md:p-5 border-t border-slate-100 bg-transparent flex justify-between items-center shrink-0">
                    {step === 1 ? (
                        <Button type="button" onClick={handleClearForm} variant="ghost" className="text-slate-400 hover:text-slate-600 text-sm">Hủy</Button>
                    ) : (
                        <Button type="button" onClick={handleBackStep} variant="secondary" className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm">Quay lại</Button>
                    )}

                    {step === 1 ? (
                        <Button type="button" onClick={handleNextStep} variant="primary" className="px-6 py-2.5 bg-accent-primary hover:bg-accent-primary-hover shadow-lg shadow-accent-primary/25 rounded-lg text-sm" rightIcon={<i className="fas fa-arrow-right"></i>}>
                            Tiếp theo
                        </Button>
                    ) : (
                        <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting} variant="primary" className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-600/25 rounded-lg text-sm" leftIcon={!isSubmitting ? <i className="fas fa-check"></i> : undefined}>
                            Hoàn tất
                        </Button>
                    )}
                </div>
            </div>
        </form>
    );
};

export default React.memo(RequestForm);
