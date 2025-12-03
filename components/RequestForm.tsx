
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

const InputGroup: React.FC<{ icon?: string; children: React.ReactNode; label: string; htmlFor: string; }> = ({ icon, children, label, htmlFor }) => (
    <div>
        <label htmlFor={htmlFor} className="hidden md:block text-sm font-medium text-text-secondary mb-1 md:mb-1.5">{label}</label>
        <div className="relative">
            {icon && <i className={`fas ${icon} absolute top-1/2 left-3 md:left-4 -translate-y-1/2 text-slate-500 peer-focus:text-accent-primary transition-colors text-base z-10`}></i>}
            {children}
        </div>
    </div>
);

const SectionHeader: React.FC<{ icon: string, title: string }> = ({ icon, title }) => (
    <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 border-b border-white/20 bg-accent-primary/5">
        <i className={`fas ${icon} text-accent-secondary text-base md:text-lg`}></i>
        <h3 className="text-sm md:text-base font-bold text-text-primary">{title}</h3>
    </div>
);


const RequestForm: React.FC<RequestFormProps> = ({ onSuccess, showToast, hideToast, existingOrderNumbers, initialVehicle, currentUser, vehicleAnalyticsData, onOpenImagePreview }) => {
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

    const [availableExteriors, setAvailableExteriors] = useState<string[]>(defaultExteriors);
    const [availableInteriors, setAvailableInteriors] = useState<string[]>(defaultInteriors);

    const inputClass = "peer w-full pl-10 md:pl-11 pr-3 md:pr-4 py-2 md:py-2.5 text-sm md:text-base rounded-lg focus:outline-none transition-all placeholder:text-text-placeholder futuristic-input";
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

            // Filter exteriors for initial vehicle
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
                } else {
                    setAvailableExteriors(defaultExteriors);
                }
            }
        }
    }, [initialVehicle]);

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

                // Filter available exteriors based on model
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
        if (interiors.length === 1) setFormData(prev => ({ ...prev, noi_that: interiors[0] }));
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
            ten_ban_hang: currentUser, ten_khach_hang: '', so_don_hang: '', dong_xe: '', phien_ban: '', ngoai_that: '', noi_that: '', ngay_coc: '', vin: '',
        });
        handleFileSelect(null);
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

    const handleConfirmSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // --- Full Form Validation ---
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
        if (!chicFile) { showToast('Thiếu Chứng Từ', 'Vui lòng tải lên ảnh Ủy nhiệm chi.', 'warning', 3000); return; }
        if (!formData.ngay_coc) { showToast('Chờ Xử Lý Ảnh', 'Vui lòng chờ xử lý Ngày cọc từ ảnh.', 'warning', 3000); return; }

        setIsSubmitting(true);
        showToast('Đang Gửi Yêu Cầu', 'Vui lòng chờ trong giây lát...', 'loading');
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

    const handleShowSample = (e: React.MouseEvent) => {
        e.preventDefault();
        const sampleImage: ImageSource[] = [{
            src: 'pictures/uynhiemchi.jpg',
            originalUrl: 'pictures/uynhiemchi.jpg',
            label: 'Mẫu Ủy nhiệm chi hợp lệ'
        }];
        onOpenImagePreview(sampleImage, 0, 'Ảnh Mẫu');
    };

    const availableVersions = formData.dong_xe ? (versionsMap[formData.dong_xe as keyof typeof versionsMap] || allPossibleVersions) : [];
    const warningClasses = { hot: 'bg-warning-bg border-warning/50 text-warning', slow: 'bg-success-bg border-success/50 text-success' };

    return (
        <form onSubmit={handleConfirmSubmit} className="flex flex-col h-full relative">

            {/* Snow Overlay Removed */}

            <div className="flex-grow overflow-hidden p-4 md:p-6 relative z-10">
                {isPreFilled && (
                    <div className="p-3 mb-4 rounded-lg border border-accent-primary/50 bg-surface-accent flex items-start gap-3 shadow-sm relative z-10">
                        <i className="fas fa-lock text-accent-primary text-xl mt-1"></i>
                        <div>
                            <h4 className="font-bold text-text-primary text-sm">Yêu cầu cho xe đã giữ</h4>
                            <p className="text-xs text-text-secondary mt-1">
                                Đang tạo yêu cầu cho VIN: <strong className="font-mono text-accent-primary">{formData.vin}</strong>.
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 xl:gap-x-8 gap-y-4 md:gap-y-8 relative z-10 h-full">
                    {/* Column 1: Vehicle Config */}
                    <section className="bg-white/60 backdrop-blur-md rounded-2xl p-0 border border-white/40 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full overflow-hidden">
                        <SectionHeader icon="fa-cogs" title="1. Cấu hình Xe" />
                        <div className="p-3 md:p-4 space-y-2 md:space-y-3 flex-grow overflow-y-auto custom-scrollbar">
                            <InputGroup label="Dòng xe" htmlFor="dong_xe">
                                <MultiSelectDropdown
                                    id="dong_xe"
                                    label="Dòng xe"
                                    placeholder="Chọn dòng xe"
                                    options={Object.keys(versionsMap)}
                                    selectedOptions={formData.dong_xe ? [formData.dong_xe] : []}
                                    onChange={(selected) => handleInputChange({ target: { name: 'dong_xe', value: selected[0] || '' } } as any)}
                                    icon="fa-car"
                                    selectionMode="single"
                                    variant="modern"
                                    disabled={isPreFilled}
                                    searchable={false}
                                />
                            </InputGroup>
                            <InputGroup label="Phiên bản" htmlFor="phien_ban">
                                <MultiSelectDropdown
                                    id="phien_ban"
                                    label="Phiên bản"
                                    placeholder="Chọn phiên bản"
                                    options={availableVersions}
                                    selectedOptions={formData.phien_ban ? [formData.phien_ban] : []}
                                    onChange={(selected) => handleInputChange({ target: { name: 'phien_ban', value: selected[0] || '' } } as any)}
                                    icon="fa-code-branch"
                                    selectionMode="single"
                                    variant="modern"
                                    disabled={!formData.dong_xe || isPreFilled}
                                    searchable={false}
                                />
                            </InputGroup>
                            <InputGroup label="Ngoại thất" htmlFor="ngoai_that">
                                <MultiSelectDropdown
                                    id="ngoai_that"
                                    label="Ngoại thất"
                                    placeholder="Chọn màu ngoại thất"
                                    options={availableExteriors}
                                    selectedOptions={formData.ngoai_that ? [formData.ngoai_that] : []}
                                    onChange={(selected) => handleInputChange({ target: { name: 'ngoai_that', value: selected[0] || '' } } as any)}
                                    icon="fa-fill-drip"
                                    selectionMode="single"
                                    variant="modern"
                                    disabled={!formData.phien_ban || isPreFilled}
                                    searchable={false}
                                />
                            </InputGroup>
                            <InputGroup label="Nội thất" htmlFor="noi_that">
                                <MultiSelectDropdown
                                    id="noi_that"
                                    label="Nội thất"
                                    placeholder="Chọn nội thất"
                                    options={availableInteriors}
                                    selectedOptions={formData.noi_that ? [formData.noi_that] : []}
                                    onChange={(selected) => handleInputChange({ target: { name: 'noi_that', value: selected[0] || '' } } as any)}
                                    icon="fa-couch"
                                    selectionMode="single"
                                    variant="modern"
                                    disabled={!formData.phien_ban || isPreFilled}
                                    searchable={false}
                                />
                            </InputGroup>

                            {warningMessage && warningType && (
                                <div className={`p-3 mt-2 rounded-lg border text-sm flex items-start ${warningClasses[warningType]}`}>
                                    <i className={`fas ${warningType === 'hot' ? 'fa-exclamation-triangle' : 'fa-check-circle'} mr-3 mt-1`}></i>
                                    <p dangerouslySetInnerHTML={{ __html: warningMessage }}></p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Column 2: Customer Info & Docs */}
                    <section className="bg-white/60 backdrop-blur-md rounded-2xl p-0 border border-white/40 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full overflow-hidden">
                        <SectionHeader icon="fa-user-circle" title="2. Thông tin & Chứng từ" />
                        <div className="p-3 md:p-4 space-y-2 md:space-y-3 flex-grow overflow-y-auto custom-scrollbar">
                            <InputGroup icon="fa-user-tie" label="Tên khách hàng" htmlFor="ten_khach_hang"><input id="ten_khach_hang" type="text" name="ten_khach_hang" value={formData.ten_khach_hang} onChange={handleInputChange} onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} required className={inputClass} placeholder="VD: NGUYEN VAN A" /></InputGroup>
                            <InputGroup icon="fa-barcode" label="Số đơn hàng" htmlFor="so_don_hang"><input id="so_don_hang" type="text" name="so_don_hang" value={formData.so_don_hang} onChange={handleInputChange} required pattern="^N[0-9]{5}-[A-Z]{3}-[0-9]{2}-[0-9]{2}-[0-9]{4}$" title="Định dạng: Nxxxxx-XXX-yy-mm-zzzz" onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Số đơn hàng không đúng định dạng. Yêu cầu định dạng: Nxxxxx-XXX-yy-mm-zzzz')} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} className={inputClass} placeholder="VD: N12345-VSO-24-01-0001" /></InputGroup>

                            <div className="mt-2">
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-sm font-medium text-text-secondary">Ủy nhiệm chi</label>
                                    <Button
                                        type="button"
                                        onClick={handleShowSample}
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-accent-secondary hover:underline hover:text-accent-primary-hover !p-0 !h-auto"
                                    >
                                        <i className="fas fa-info-circle mr-1"></i>
                                        Xem mẫu
                                    </Button>
                                </div>
                                <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessingOcr} ocrStatus={ocrStatus} showToast={showToast} />
                            </div>

                            <div className="mt-2">
                                <InputGroup icon="fa-calendar-alt" label="Ngày Cọc (Tự động điền từ ảnh)" htmlFor="ngay_coc">
                                    <input id="ngay_coc" name="ngay_coc" type="datetime-local" value={formData.ngay_coc ? formData.ngay_coc.slice(0, 16) : ''} required readOnly className={`${inputClass} !bg-surface-input cursor-not-allowed`} />
                                </InputGroup>
                            </div>
                        </div>
                    </section>

                    {/* Column 3: Preview & Verification */}
                    <section className="bg-white/60 backdrop-blur-md rounded-2xl p-0 border border-white/40 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <SectionHeader icon="fa-eye" title="3. Xem trước & Xác thực" />
                        <div className="p-3 md:p-4 flex flex-col h-full">
                            <div className="relative h-52 bg-surface-ground rounded-xl flex items-center justify-center p-4 border border-border-primary text-center shadow-inner-sm">
                                {(formData.dong_xe && formData.ngoai_that) ? (
                                    <CarImage
                                        model={formData.dong_xe}
                                        exteriorColor={formData.ngoai_that}
                                        className="max-w-full max-h-full object-contain drop-shadow-lg"
                                        alt="Cấu hình xe"
                                    />
                                ) : (
                                    <div className="text-text-placeholder transition-all duration-300">
                                        <i className="fas fa-car text-5xl text-slate-400 mb-3 opacity-50"></i>
                                        <p className="font-semibold text-sm text-slate-500">Xem trước xe của bạn</p>
                                        <p className="text-xs mt-1">Chọn cấu hình xe để xem trước</p>
                                    </div>
                                )}
                                {(isSubmitting || isProcessingOcr) && (
                                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
                                        <i className="fas fa-spinner fa-spin text-4xl text-accent-primary"></i>
                                    </div>
                                )}
                            </div>

                        </div>
                    </section>
                </div>
            </div>

            <div className="flex-shrink-0 flex flex-row justify-end items-center gap-3 p-4 md:p-6 border-t border-white/20 relative z-10 bg-white/60 backdrop-blur-md">
                <Button
                    type="button"
                    onClick={handleClearForm}
                    disabled={isSubmitting || isPreFilled}
                    variant="secondary"
                    size="sm"
                    className="w-auto"
                    leftIcon={<i className="fas fa-eraser"></i>}
                >
                    Xóa Nháp
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    variant="primary"
                    size="sm"
                    className="w-auto"
                    leftIcon={!isSubmitting ? <i className="fas fa-paper-plane"></i> : undefined}
                >
                    Xác nhận & Gửi
                </Button>
            </div>
        </form>
    );
};

export default React.memo(RequestForm);
