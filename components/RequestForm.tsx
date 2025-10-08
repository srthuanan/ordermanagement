import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { AnalyticsData, Order, StockVehicle } from '../types';
import { extractDateFromImageTesseract } from '../services/ocrService';
import { versionsMap, allPossibleVersions, defaultExteriors, defaultInteriors, interiorColorRules } from '../constants';
import * as apiService from '../services/apiService';
import FileUpload from './ui/FileUpload';

interface RequestFormProps {
    onSuccess: (newOrder: Order) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    hideToast: () => void;
    existingOrderNumbers: string[];
    initialVehicle?: StockVehicle;
}

const InputGroup: React.FC<{icon: string; children: React.ReactNode; label: string; htmlFor: string;}> = ({ icon, children, label, htmlFor }) => (
    <div>
        <label htmlFor={htmlFor} className="block text-sm font-medium text-text-primary mb-2">{label}</label>
        <div className="relative">
            <i className={`fas ${icon} absolute top-1/2 left-4 -translate-y-1/2 text-text-placeholder peer-focus:text-accent-primary transition-colors text-base`}></i>
            {children}
        </div>
    </div>
);

// Horizontal Stepper for Mobile
const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = [
        { num: 1, title: 'Thông tin Xe & KH', icon: 'fa-car' },
        { num: 2, title: 'Tải Chứng Từ', icon: 'fa-file-upload' },
        { num: 3, title: 'Xác Nhận Gửi', icon: 'fa-paper-plane' },
    ];

    return (
        <div className="flex items-center w-full max-w-2xl mx-auto">
            {steps.map((step, index) => {
                const isActive = currentStep === step.num;
                const isCompleted = currentStep > step.num;
                return (
                    <React.Fragment key={step.num}>
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
                                ${isActive ? 'bg-accent-primary border-accent-primary text-white shadow-lg shadow-accent-primary/30' : ''}
                                ${isCompleted ? 'bg-success border-success text-white' : ''}
                                ${!isActive && !isCompleted ? 'bg-surface-card border-border-primary text-text-secondary' : ''}
                            `}>
                                <i className={`fas ${isCompleted ? 'fa-check' : step.icon} text-xl`}></i>
                            </div>
                            <p className={`mt-2 text-xs font-bold transition-colors w-20
                                ${isActive || isCompleted ? 'text-text-primary' : 'text-text-secondary'}
                            `}>{step.title}</p>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`flex-1 h-1 mx-2 sm:mx-4 rounded transition-colors ${isCompleted ? 'bg-success' : 'bg-border-primary'}`}></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// Vertical Stepper for Desktop
const VerticalStepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = [
        { num: 1, title: 'Thông tin Xe & KH', icon: 'fa-car' },
        { num: 2, title: 'Tải Chứng Từ', icon: 'fa-file-upload' },
        { num: 3, title: 'Xác Nhận Gửi', icon: 'fa-paper-plane' },
    ];
    return (
        <div className="flex flex-col justify-center h-full relative">
            <div className="absolute left-6 top-0 h-full w-0.5 bg-border-primary/70" style={{ transform: 'translateX(-50%)' }}></div>
            {steps.map((step, index) => {
                const isActive = currentStep === step.num;
                const isCompleted = currentStep > step.num;
                return (
                    <div key={step.num} className={`relative flex items-center gap-5 p-4 ${index < steps.length - 1 ? 'mb-8' : ''}`}>
                        <div className={`z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all duration-300
                            ${isActive ? 'bg-accent-primary border-accent-primary text-white shadow-lg shadow-accent-primary/30 scale-110' : ''}
                            ${isCompleted ? 'bg-success border-success text-white' : ''}
                            ${!isActive && !isCompleted ? 'bg-surface-card border-border-primary text-text-secondary' : ''}
                        `}>
                            <i className={`fas ${isCompleted ? 'fa-check' : step.icon} text-xl`}></i>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary">Bước {step.num}</p>
                            <p className={`font-bold transition-colors
                                ${isActive || isCompleted ? 'text-text-primary' : 'text-text-secondary'}
                            `}>{step.title}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const labelMap: Record<string, string> = {
    "ten_ban_hang": "Tên Tư Vấn Bán Hàng",
    "ten_khach_hang": "Tên Khách Hàng",
    "dong_xe": "Dòng Xe",
    "phien_ban": "Phiên Bản",
    "ngoai_that": "Ngoại Thất",
    "noi_that": "Nội Thất",
    "so_don_hang": "Số Đơn Hàng",
    "ngay_coc": "Ngày Cọc",
    "vin": "Số VIN",
};

const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    try {
        return new Date(dateString).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return dateString;
    }
};


const RequestForm: React.FC<RequestFormProps> = ({ onSuccess, showToast, hideToast, existingOrderNumbers, initialVehicle }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        ten_ban_hang: 'PHẠM THÀNH NHÂN',
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
    const [vehicleAnalyticsData, setVehicleAnalyticsData] = useState<AnalyticsData | null>(null);
    const [warningMessage, setWarningMessage] = useState('');
    const [warningType, setWarningType] = useState<'hot' | 'slow' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [availableExteriors] = useState<string[]>(defaultExteriors);
    const [availableInteriors, setAvailableInteriors] = useState<string[]>(defaultInteriors);
    
    const inputClass = "peer w-full pl-11 pr-4 py-3 bg-surface-card text-text-primary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all placeholder:text-text-placeholder";
    const isPreFilled = !!initialVehicle;

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
        }
    }, [initialVehicle]);

    useEffect(() => {
        const mockAnalytics: AnalyticsData = {
            pendingRequestCount: { 'vf 8|plus|jet black (ce11)': 5 },
            stockStatus: { 'vf 6|eco tiêu chuẩn|neptune grey (ce14)': { count: 3, isSlowMoving: true } }
        };
        setVehicleAnalyticsData(mockAnalytics);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'dong_xe') {
                newState.phien_ban = '';
                newState.ngoai_that = '';
                newState.noi_that = '';
                if (value === 'VF 3') newState.phien_ban = 'Base';
                else if (value === 'VF 5') newState.phien_ban = 'Plus';
            }
            if (name === 'phien_ban') {
                newState.ngoai_that = '';
                newState.noi_that = '';
            }
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
        if (interiors.length === 1) setFormData(prev => ({...prev, noi_that: interiors[0]}));
    }, [formData.dong_xe, formData.phien_ban]);

    const handleFileSelect = useCallback(async (file: File | null) => {
        setChicFile(file);
        setFormData(prev => ({ ...prev, ngay_coc: '' }));
        setOcrStatus('');
        if (file) {
            setIsProcessingOcr(true);
            setOcrStatus('Đang chuẩn bị xử lý...');
            try {
                const extractedDate = await extractDateFromImageTesseract(file, (progressStatus) => setOcrStatus(progressStatus));
                if (extractedDate) {
                    setFormData(prev => ({ ...prev, ngay_coc: extractedDate }));
                    setOcrStatus('✓ Đã điền Ngày Cọc thành công!');
                } else {
                    setOcrStatus('Lỗi: Không tìm thấy ngày giờ hợp lệ trong ảnh.');
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Xử lý ảnh thất bại.';
                if (message.includes('Tesseract')) showToast('Lỗi Tải Thư Viện', 'Thư viện nhận dạng ảnh chưa sẵn sàng. Vui lòng làm mới trang (F5).', 'error', 5000);
                setOcrStatus(`Lỗi: ${message}`);
            } finally { setIsProcessingOcr(false); }
        }
    }, [showToast]);
    
    const handleClearForm = () => {
        setFormData({
            ten_ban_hang: 'PHẠM THÀNH NHÂN', ten_khach_hang: '', so_don_hang: '', dong_xe: '', phien_ban: '', ngoai_that: '', noi_that: '', ngay_coc: '', vin: '',
        });
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
            setWarningMessage(`Lưu ý: Đang có <strong>${pendingCount}</strong> yêu cầu khác đang chờ ghép cho Màu xe này.`);
            setWarningType('hot');
        } else if (stockInfo.isSlowMoving && stockInfo.count > 0) {
            setWarningMessage(`Gợi ý: Xe này đang có sẵn trong kho, có thể giao ngay.`);
            setWarningType('slow');
        } else { setWarningMessage(''); setWarningType(null); }
    }, [formData.dong_xe, formData.phien_ban, formData.ngoai_that, vehicleAnalyticsData, isPreFilled]);

    const handleNextStep = (e: FormEvent) => {
        e.preventDefault();
        if (step === 1) {
            const requiredFields: (keyof typeof formData)[] = ['ten_khach_hang', 'so_don_hang', 'dong_xe', 'phien_ban', 'ngoai_that', 'noi_that'];
            if (requiredFields.some(field => !formData[field])) {
                showToast('Thiếu Thông Tin', 'Vui lòng điền đầy đủ thông tin xe và khách hàng.', 'warning', 3000); return;
            }
            const pattern = new RegExp("^N[0-9]{5}-[A-Z]{3}-[0-9]{2}-[0-9]{2}-[0-9]{4}$");
            if (!pattern.test(formData.so_don_hang)) {
                showToast('Sai Định Dạng', 'Số đơn hàng không đúng định dạng. VD: N31913-VSO-25-04-0028', 'warning', 4000); return;
            }
            if (existingOrderNumbers.includes(formData.so_don_hang)) {
                showToast('Đơn Hàng Trùng Lặp', `Số đơn hàng "${formData.so_don_hang}" đã tồn tại.`, 'error', 4000); return;
            }
            setStep(2);
        } else if (step === 2) {
            if (!chicFile) { showToast('Thiếu Chứng Từ', 'Vui lòng tải lên ảnh Ủy nhiệm chi.', 'warning', 3000); return; }
            if (!formData.ngay_coc) { showToast('Chờ Xử Lý Ảnh', 'Vui lòng chờ xử lý Ngày cọc từ ảnh.', 'warning', 3000); return; }
            setStep(3);
        }
    };

    const handlePrevStep = () => setStep(s => s > 1 ? s - 1 : 1);

    const handleConfirmSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!chicFile) return;
        setIsSubmitting(true);
        showToast('Đang Gửi Yêu Cầu', 'Vui lòng chờ trong giây lát.', 'loading');
        try {
            const result = await apiService.addRequest(formData, chicFile);
            hideToast();
            if (result.status === "SUCCESS" && result.newRecord) {
                onSuccess(result.newRecord);
                handleClearForm();
            } else { throw new Error(result.message || 'Gửi yêu cầu thất bại.'); }
        } catch (error) {
            hideToast();
            const message = error instanceof Error ? error.message : 'Lỗi không xác định.';
            showToast('Gửi Yêu Cầu Thất Bại', message, 'error', 5000);
        } finally { setIsSubmitting(false); }
    };
    
    const availableVersions = formData.dong_xe ? (versionsMap[formData.dong_xe as keyof typeof versionsMap] || allPossibleVersions) : [];
    const warningClasses = { hot: 'bg-warning-bg border-warning text-yellow-800', slow: 'bg-success-bg border-success text-green-800' };

    const renderStep1 = () => (
        <div className={step === 1 ? 'animate-fade-in-up' : 'hidden'}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-8 gap-y-6">
                <div className="lg:col-span-3 space-y-5">
                    <h3 className="text-lg font-bold text-text-primary flex items-center gap-3"><i className="fas fa-user-circle text-accent-primary"></i>Thông tin Khách hàng & Xe</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <InputGroup icon="fa-user-tie" label="Tên khách hàng" htmlFor="ten_khach_hang"><input id="ten_khach_hang" type="text" name="ten_khach_hang" value={formData.ten_khach_hang} onChange={handleInputChange} onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} required className={inputClass} placeholder="VD: NGUYỄN VĂN A" /></InputGroup>
                        <InputGroup icon="fa-barcode" label="Số đơn hàng" htmlFor="so_don_hang"><input id="so_don_hang" type="text" name="so_don_hang" value={formData.so_don_hang} onChange={handleInputChange} required pattern="^N[0-9]{5}-[A-Z]{3}-[0-9]{2}-[0-9]{2}-[0-9]{4}$" title="Định dạng: Nxxxxx-XXX-yy-mm-zzzz" onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Số đơn hàng không đúng định dạng. VD: N31913-VSO-25-04-0028')} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} className={inputClass} placeholder="VD: N31913-VSO-25-04-0028" /></InputGroup>
                        <InputGroup icon="fa-car" label="Dòng xe" htmlFor="dong_xe"><select id="dong_xe" name="dong_xe" value={formData.dong_xe} onChange={handleInputChange} required className={`${inputClass} disabled:bg-surface-input`} disabled={isPreFilled}><option value="" disabled>Chọn dòng xe</option>{Object.keys(versionsMap).map(car => <option key={car} value={car}>{car}</option>)}</select></InputGroup>
                        <InputGroup icon="fa-cogs" label="Phiên bản" htmlFor="phien_ban"><select id="phien_ban" name="phien_ban" value={formData.phien_ban} onChange={handleInputChange} required disabled={!formData.dong_xe || isPreFilled} className={`${inputClass} disabled:bg-surface-input`}><option value="" disabled>Chọn phiên bản</option>{availableVersions.map(v => <option key={v} value={v}>{v}</option>)}</select></InputGroup>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-5">
                     <h3 className="text-lg font-bold text-text-primary flex items-center gap-3"><i className="fas fa-palette text-accent-primary"></i>Tùy chọn màu sắc</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <InputGroup icon="fa-fill-drip" label="Ngoại thất" htmlFor="ngoai_that"><select id="ngoai_that" name="ngoai_that" value={formData.ngoai_that} onChange={handleInputChange} required disabled={!formData.phien_ban || isPreFilled} className={`${inputClass} disabled:bg-surface-input`}><option value="" disabled>Chọn ngoại thất</option>{availableExteriors.map(color => <option key={color} value={color}>{color}</option>)}</select></InputGroup>
                        <InputGroup icon="fa-chair" label="Nội thất" htmlFor="noi_that"><select id="noi_that" name="noi_that" value={formData.noi_that} onChange={handleInputChange} required disabled={!formData.phien_ban || isPreFilled} className={`${inputClass} disabled:bg-surface-input`}><option value="" disabled>Chọn nội thất</option>{availableInteriors.map(color => <option key={color} value={color}>{color}</option>)}</select></InputGroup>
                    </div>
                    {warningMessage && warningType && (
                        <div className={`p-3 rounded-lg border text-sm flex items-start ${warningClasses[warningType]}`}>
                            <i className={`fas ${warningType === 'hot' ? 'fa-exclamation-triangle' : 'fa-check-circle'} mr-3 mt-1`}></i>
                            <p dangerouslySetInnerHTML={{ __html: warningMessage }}></p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className={step === 2 ? 'animate-fade-in-up' : 'hidden'}>
            <div className="w-full max-w-lg mx-auto space-y-5">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-3 justify-center"><i className="fas fa-file-alt text-accent-primary"></i>Chứng từ & Đơn hàng</h3>
                <div>
                    <label htmlFor="chic_file_upload" className="block text-sm font-medium text-text-primary text-center mb-2">Ảnh Ủy Nhiệm Chi</label>
                    <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessingOcr} ocrStatus={ocrStatus}/>
                </div>
                <InputGroup icon="fa-calendar-alt" label="Ngày Cọc (Tự động điền từ ảnh)" htmlFor="ngay_coc">
                    <input id="ngay_coc" name="ngay_coc" type="datetime-local" value={formData.ngay_coc ? formData.ngay_coc.slice(0, 16) : ''} required readOnly className={`${inputClass} bg-surface-input cursor-not-allowed`} />
                </InputGroup>
            </div>
        </div>
    );
    
    const renderStep3 = () => (
        <div className={step === 3 ? 'animate-fade-in-up' : 'hidden'}>
             <div className="w-full max-w-2xl mx-auto">
                <h3 className="text-lg font-bold text-text-primary text-center mb-4">Kiểm Tra Lại Thông Tin</h3>
                 <div className="bg-surface-ground rounded-lg p-6 space-y-2 border border-border-primary">
                    {Object.entries(formData).map(([key, value]) => {
                        if (!value && key === 'vin') return null;
                        return (
                            <div key={key} className="flex justify-between items-start text-sm py-2.5 border-b border-dashed border-border-primary/50">
                                <span className="text-text-secondary">{labelMap[key] || key}</span>
                                <span className="font-semibold text-right text-text-primary">{key === 'ngay_coc' ? formatDateTime(String(value)) : (String(value) || '—')}</span>
                            </div>
                        )
                    })}
                    {chicFile && (
                        <div className="flex justify-between items-start text-sm py-2.5">
                            <span className="text-text-secondary">Ảnh Ủy nhiệm chi</span>
                            <span className="font-semibold text-right truncate text-text-primary" title={chicFile.name}>{chicFile.name}</span>
                        </div>
                    )}
                </div>
             </div>
        </div>
    );

    return (
        <div className="w-full mx-auto bg-surface-card rounded-xl overflow-hidden">
             <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* Left Panel: Stepper */}
                <div className="lg:col-span-4 bg-slate-50 p-6 border-r border-border-primary hidden lg:flex">
                    <VerticalStepper currentStep={step} />
                </div>

                {/* Right Panel: Form Content */}
                <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col">
                     {/* Mobile Stepper */}
                     <div className="lg:hidden mb-8">
                         <Stepper currentStep={step} />
                     </div>

                    <form onSubmit={step === 3 ? handleConfirmSubmit : handleNextStep} className="flex flex-col flex-grow">
                        <div className="min-h-[320px] flex-grow flex items-center">
                            <div className="w-full">
                                {renderStep1()}
                                {renderStep2()}
                                {renderStep3()}
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-6 mt-auto border-t border-border-primary">
                            <button type="button" onClick={handleClearForm} disabled={isSubmitting || isPreFilled} className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed">
                                <i className="fas fa-eraser mr-2"></i><span>Xóa Nháp</span>
                            </button>
                            <div className="flex items-center gap-4">
                                {step > 1 && (
                                    <button type="button" onClick={handlePrevStep} disabled={isSubmitting} className="btn-secondary">
                                        <i className="fas fa-arrow-left mr-2"></i>Quay lại
                                    </button>
                                )}
                                {step < 3 && (
                                     <button type="submit" className="btn-primary">
                                        <span>{step === 1 ? 'Tiếp Tục' : 'Xem Lại & Gửi'}</span><i className="fas fa-arrow-right ml-2"></i>
                                    </button>
                                )}
                                 {step === 3 && (
                                    <button type="submit" disabled={isSubmitting} className="btn-primary">
                                        {isSubmitting ? <><i className="fas fa-spinner fa-spin mr-2"></i> Đang gửi...</> : <><i className="fas fa-paper-plane mr-2"></i> Xác nhận & Gửi</>}
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RequestForm;