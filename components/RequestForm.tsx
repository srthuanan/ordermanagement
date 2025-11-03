import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { AnalyticsData, Order, StockVehicle } from '../types';
import { extractDateFromImageTesseract } from '../services/ocrService';
import { versionsMap, allPossibleVersions, defaultExteriors, defaultInteriors, interiorColorRules } from '../constants';
import * as apiService from '../services/apiService';
import FileUpload from './ui/FileUpload';
import uncSampleJpg from '/pictures/uynhiemchi.jpg';

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

const InputGroup: React.FC<{icon: string; children: React.ReactNode; label?: string; htmlFor: string;}> = ({ icon, children, label, htmlFor }) => (
    <div>
        {label ? (
            <label htmlFor={htmlFor} className="block text-sm font-medium text-text-secondary mb-2">{label}</label>
        ) : (
            <div className="block text-sm font-medium text-transparent mb-2 select-none">&nbsp;</div>
        )}
        <div className="relative">
            <i className={`fas ${icon} absolute top-1/2 left-4 -translate-y-1/2 text-slate-500 peer-focus:text-accent-start transition-colors text-base`}></i>
            {children}
        </div>
    </div>
);

const SectionHeader: React.FC<{icon: string, title: string}> = ({ icon, title }) => (
    <div className="relative mb-5">
        <div className="flex items-center gap-3">
            <i className={`fas ${icon} text-accent-secondary text-xl`}></i>
            <h3 className="text-lg font-bold text-text-primary">{title}</h3>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-accent-start/50 to-transparent -mb-2"></div>
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
    
    const [availableExteriors] = useState<string[]>(defaultExteriors);
    const [availableInteriors, setAvailableInteriors] = useState<string[]>(defaultInteriors);
    
    const inputClass = "peer w-full pl-11 pr-4 py-3 rounded-lg focus:outline-none transition-all placeholder:text-text-placeholder futuristic-input";
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
    
    const handlePreviewUnc = () => {
        onOpenImagePreview(
            [{ src: uncSampleJpg, originalUrl: uncSampleJpg, label: 'Mẫu Ủy Nhiệm Chi' }],
            0,
            'Mẫu UNC'
        );
    };

    const availableVersions = formData.dong_xe ? (versionsMap[formData.dong_xe as keyof typeof versionsMap] || allPossibleVersions) : [];
    const warningClasses = { hot: 'bg-warning-bg border-warning/50 text-warning', slow: 'bg-success-bg border-success/50 text-success' };

    return (
        <form onSubmit={handleConfirmSubmit} className="flex flex-col h-full">
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
                {/* Left Column */}
                <div className="space-y-6">
                    {isPreFilled && (
                        <div className="p-4 rounded-lg border border-accent-primary/50 bg-surface-accent flex items-start gap-4 shadow-sm">
                            <i className="fas fa-lock text-accent-primary text-2xl mt-1"></i>
                            <div>
                                <h4 className="font-bold text-text-primary">Yêu cầu cho xe đã giữ</h4>
                                <p className="text-sm text-text-secondary mt-1">
                                    Bạn đang tạo yêu cầu cho xe có số VIN cụ thể: <strong className="font-mono text-accent-primary">{formData.vin}</strong>.
                                    Thông tin xe đã được điền sẵn và không thể thay đổi.
                                </p>
                            </div>
                        </div>
                    )}

                    <section>
                        <SectionHeader icon="fa-user-circle" title="Thông tin Khách hàng & Xe" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                            <InputGroup icon="fa-user-tie" htmlFor="ten_khach_hang"><input id="ten_khach_hang" type="text" name="ten_khach_hang" value={formData.ten_khach_hang} onChange={handleInputChange} onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} required className={inputClass} placeholder="Tên khách hàng" /></InputGroup>
                            <InputGroup icon="fa-barcode" htmlFor="so_don_hang"><input id="so_don_hang" type="text" name="so_don_hang" value={formData.so_don_hang} onChange={handleInputChange} required pattern="^N[0-9]{5}-[A-Z]{3}-[0-9]{2}-[0-9]{2}-[0-9]{4}$" title="Định dạng: Nxxxxx-XXX-yy-mm-zzzz" onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Số đơn hàng không đúng định dạng. Yêu cầu định dạng: Nxxxxx-XXX-yy-mm-zzzz')} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} className={inputClass} placeholder="Số đơn hàng" /></InputGroup>
                            <InputGroup icon="fa-car" label="Dòng xe" htmlFor="dong_xe"><select id="dong_xe" name="dong_xe" value={formData.dong_xe} onChange={handleInputChange} required className={`${inputClass} futuristic-select disabled:opacity-50`} disabled={isPreFilled}><option value="" disabled>Chọn dòng xe</option>{Object.keys(versionsMap).map(car => <option key={car} value={car}>{car}</option>)}</select></InputGroup>
                            <InputGroup icon="fa-cogs" label="Phiên bản" htmlFor="phien_ban"><select id="phien_ban" name="phien_ban" value={formData.phien_ban} onChange={handleInputChange} required disabled={!formData.dong_xe || isPreFilled} className={`${inputClass} futuristic-select disabled:opacity-50`}><option value="" disabled>Chọn phiên bản</option>{availableVersions.map(v => <option key={v} value={v}>{v}</option>)}</select></InputGroup>
                        </div>
                    </section>
                    
                     <section>
                        <SectionHeader icon="fa-palette" title="Tùy chọn màu sắc" />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                            <InputGroup icon="fa-fill-drip" label="Ngoại thất" htmlFor="ngoai_that"><select id="ngoai_that" name="ngoai_that" value={formData.ngoai_that} onChange={handleInputChange} required disabled={!formData.phien_ban || isPreFilled} className={`${inputClass} futuristic-select disabled:opacity-50`}><option value="" disabled>Chọn ngoại thất</option>{availableExteriors.map(color => <option key={color} value={color}>{color}</option>)}</select></InputGroup>
                            <InputGroup icon="fa-chair" label="Nội thất" htmlFor="noi_that"><select id="noi_that" name="noi_that" value={formData.noi_that} onChange={handleInputChange} required disabled={!formData.phien_ban || isPreFilled} className={`${inputClass} futuristic-select disabled:opacity-50`}><option value="" disabled>Chọn nội thất</option>{availableInteriors.map(color => <option key={color} value={color}>{color}</option>)}</select></InputGroup>
                        </div>
                         {warningMessage && warningType && (
                            <div className={`p-3 mt-4 rounded-lg border text-sm flex items-start ${warningClasses[warningType]}`}>
                                <i className={`fas ${warningType === 'hot' ? 'fa-exclamation-triangle' : 'fa-check-circle'} mr-3 mt-1`}></i>
                                <p dangerouslySetInnerHTML={{ __html: warningMessage }}></p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                     <section>
                        <SectionHeader icon="fa-file-invoice-dollar" title="Chứng từ & Xác thực" />
                        <button type="button" onClick={handlePreviewUnc} className="text-xs text-accent-secondary hover:text-accent-primary hover:underline transition-colors flex items-center gap-2 mb-2">
                            <i className="fas fa-eye"></i>
                            <span>Xem Ảnh Ủy Nhiệm Chi Mẫu</span>
                        </button>
                        <div className="space-y-5 mt-4">
                            <div>
                                <label htmlFor="chic_file_upload" className="block text-sm font-medium text-text-secondary text-left mb-2">Ảnh Ủy nhiệm chi</label>
                                <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessingOcr} ocrStatus={ocrStatus} showToast={showToast} />
                            </div>
                            <InputGroup icon="fa-calendar-alt" label="Ngày Cọc (Tự động điền từ ảnh)" htmlFor="ngay_coc">
                                <input id="ngay_coc" name="ngay_coc" type="datetime-local" value={formData.ngay_coc ? formData.ngay_coc.slice(0, 16) : ''} required readOnly className={`${inputClass} !bg-surface-input cursor-not-allowed`} />
                            </InputGroup>
                        </div>
                    </section>
                </div>
            </div>

            <div className="flex-shrink-0 flex justify-between items-center pt-6 mt-8 border-t border-border-primary">
                <button type="button" onClick={handleClearForm} disabled={isSubmitting || isPreFilled} className="btn-futuristic-secondary disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg font-semibold">
                    <i className="fas fa-eraser mr-2"></i><span>Xóa Nháp</span>
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-futuristic-primary px-8 py-3 rounded-lg font-bold text-base">
                    {isSubmitting ? <><i className="fas fa-spinner fa-spin mr-2"></i> Đang gửi...</> : <><i className="fas fa-paper-plane mr-2"></i> Xác nhận & Gửi Yêu Cầu</>}
                </button>
            </div>
        </form>
    );
};

export default React.memo(RequestForm);