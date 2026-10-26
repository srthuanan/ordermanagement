import React, { useState, useEffect, useCallback, FormEvent, useMemo, useRef } from 'react';
import { AnalyticsData, Order, StockVehicle } from '../types';
import { extractDateFromImageTesseract, extractDateWithGemini } from '../services/ocrService';
import { useVehicleConfig } from '../hooks/useVehicleConfig';
import * as apiService from '../services/apiService';
import FileUpload from './ui/FileUpload';
import CarImage from './ui/CarImage';
import SelectPolicyModal from './modals/SelectPolicyModal';
import { cleanCyberContractCode } from '../utils/stringUtils';
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
    embeddedMobile?: boolean;
}

const InputGroup: React.FC<{ icon?: string; children: React.ReactNode; label: string; htmlFor: string; required?: boolean; badge?: React.ReactNode }> = ({ children, label, htmlFor, required, icon, badge }) => (
    <div className="space-y-1.5">
        <div className="flex items-center justify-between min-h-[22px]">
            <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                {icon && <i className={`fas ${icon} text-slate-400`}></i>}
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {badge}
        </div>
        <div className="relative">
            {children}
        </div>
    </div>
);


const normalizeStr = (s?: string): string => {
    if (!s) return '';
    return s.trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");
};

const isNameMatch = (orderTvbh?: string, targetName?: string): boolean => {
    const a = normalizeStr(orderTvbh);
    const b = normalizeStr(targetName);
    if (!a || !b) return false;
    return a === b || a.includes(b) || b.includes(a);
};

// Kiểm tra xem chính sách có phải là "Cọc sỉ" hay không
const isWholesaleDeposit = (policy?: string): boolean => {
    if (!policy) return false;
    return normalizeStr(policy).includes('coc si');
};

const RequestForm: React.FC<RequestFormProps> = ({ onSuccess, showToast, existingOrderNumbers, initialVehicle, currentUser, vehicleAnalyticsData, onOpenImagePreview, embeddedMobile = false }) => {
    // --- State ---
    const [step, setStep] = useState<1 | 2>(1); // 1: Config, 2: Info
    const [formData, setFormData] = useState({
        ten_ban_hang: currentUser,
        ten_khach_hang: '',
        so_don_hang: '',
        ma_hd_cyber: '',
        dong_xe: '',
        phien_ban: '',
        ngoai_that: '',
        noi_that: '',
        ngay_coc: '',
        thoi_gian_can_xe: '',
        vin: '',
        chinh_sach: '',
    });
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
    const [chicFile, setChicFile] = useState<File | null>(null);
    const [isProcessingOcr, setIsProcessingOcr] = useState(false);
    const [ocrStatus, setOcrStatus] = useState('');
    const [warningMessage, setWarningMessage] = useState('');
    const [warningType, setWarningType] = useState<'hot' | 'slow' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dmsWarning, setDmsWarning] = useState('');
    const [dmsConfigCheck, setDmsConfigCheck] = useState<{
        isChecking: boolean;
        status: 'idle' | 'checking' | 'valid' | 'warning';
        title?: string;
        message?: string;
    }>({ isChecking: false, status: 'idle' });
    const [showVsoTooltip, setShowVsoTooltip] = useState(false);
    const { versionsMap, allPossibleVersions, vehicleLines, getMappedExteriors, getMappedInteriors } = useVehicleConfig();

    // Backlog deposits (Cọc tồn Cyber)
    const [backlogOrders, setBacklogOrders] = useState<any[]>([]);
    const [isBacklogDropdownOpen, setIsBacklogDropdownOpen] = useState(false);
    const [backlogSearch, setBacklogSearch] = useState('');
    const backlogDropdownRef = useRef<HTMLDivElement>(null);

    const [availableExteriors, setAvailableExteriors] = useState<string[]>([]);
    const [availableInteriors, setAvailableInteriors] = useState<string[]>([]);

    // Tự động kiểm tra đối soát cấu hình xe ghép với VSO trên VinFast DMS
    useEffect(() => {
        // Riêng đơn hàng nào chọn CS Cọc sỉ thì không cần tra so sánh DMS
        if (isWholesaleDeposit(formData.chinh_sach)) {
            setDmsConfigCheck({ isChecking: false, status: 'idle' });
            setShowVsoTooltip(false);
            return;
        }

        const orderNo = (formData.so_don_hang || '').trim().toUpperCase();
        const pattern = new RegExp("^N[0-9]{5}-[A-Z]{3}-[0-9]{2}-[0-9]{2}-[0-9]{4}$");

        if (!pattern.test(orderNo) || (!initialVehicle && !formData.dong_xe)) {
            setDmsConfigCheck({ isChecking: false, status: 'idle' });
            return;
        }

        const timer = setTimeout(async () => {
            setDmsConfigCheck(prev => ({ ...prev, isChecking: true, status: 'checking' }));
            try {
                const targetConfig = initialVehicle ? {
                    dong_xe: initialVehicle['Dòng xe'] || formData.dong_xe,
                    phien_ban: initialVehicle['Phiên bản'] || formData.phien_ban,
                    ngoai_that: initialVehicle['Ngoại thất'] || initialVehicle['Màu ngoại thất'] || formData.ngoai_that,
                    noi_that: initialVehicle['Nội thất'] || initialVehicle['Màu nội thất'] || formData.noi_that,
                    ten_khach_hang: formData.ten_khach_hang
                } : {
                    dong_xe: formData.dong_xe,
                    phien_ban: formData.phien_ban,
                    ngoai_that: formData.ngoai_that,
                    noi_that: formData.noi_that,
                    ten_khach_hang: formData.ten_khach_hang
                };

                const res = await apiService.verifyDmsVso(orderNo, targetConfig, true);

                if (res.isValid) {
                    setDmsConfigCheck({
                        isChecking: false,
                        status: 'valid',
                        title: 'Khớp 100% DMS',
                        message: 'Cấu hình xe khớp hoàn toàn với VSO trên VinFast DMS.'
                    });
                } else {
                    const errorType = res.errorType;
                    const expectedVal = res.expectedVal;
                    const dmsVal = res.dmsVal;
                    const rawReason = (res.reason || '').trim();
                    const norm = rawReason.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

                    let title = 'Lệch cấu hình DMS';
                    let guide = 'Nhắc nhở: TVBH nhớ xử lý trước khi Xuất hóa đơn.';

                    if (errorType === 'customer' || norm.includes('ten khach hang') || norm.includes('khach hang')) {
                        title = `Lệch Tên KH: Đơn [${expectedVal}] ⇄ DMS [${dmsVal}]`;
                        guide = `Tên khách trên VSO là [${dmsVal}]. TVBH nhớ kiểm tra lại trước khi Xuất hóa đơn.`;
                    } else if (errorType === 'canceled' || norm.includes('huy') || norm.includes('cancel')) {
                        title = 'VSO trên DMS đã bị Hủy';
                        guide = 'VSO này đã bị Hủy trên DMS. Vui lòng mở lại hoặc đổi VSO trước khi Xuất hóa đơn.';
                    } else if (errorType === 'invoiced' || norm.includes('hoa don') || norm.includes('da xuat')) {
                        title = 'VSO trên DMS đã xuất Hóa đơn';
                        guide = 'VSO này đã xuất hóa đơn trên DMS. Vui lòng kiểm tra lại trước khi làm thủ tục Xuất hóa đơn.';
                    } else if (errorType === 'exterior' || norm.includes('ngoai that')) {
                        const exp = apiService.getExteriorColorCode(expectedVal || '') || expectedVal || '';
                        const dms = apiService.getExteriorColorCode(dmsVal || '') || dmsVal || '';
                        title = `Lệch Ngoại thất: Xe [${exp}] ⇄ DMS [${dms}]`;
                        guide = `Xe ghép mang màu [${exp}] nhưng VSO yêu cầu [${dms}]. TVBH nhớ xử lý trước khi Xuất hóa đơn.`;
                    } else if (errorType === 'interior' || norm.includes('noi that')) {
                        const exp = apiService.getInteriorColorCode(expectedVal || '') || expectedVal || '';
                        const dms = apiService.getInteriorColorCode(dmsVal || '') || dmsVal || '';
                        title = `Lệch Nội thất: Xe [${exp}] ⇄ DMS [${dms}]`;
                        guide = `Xe ghép mang nội thất [${exp}] nhưng VSO yêu cầu [${dms}]. TVBH nhớ xử lý trước khi Xuất hóa đơn.`;
                    } else if (errorType === 'version' || norm.includes('phien ban')) {
                        const exp = apiService.getVersionCode(expectedVal || '') || expectedVal || '';
                        const dms = apiService.getVersionCode(dmsVal || '') || dmsVal || '';
                        title = `Lệch Phiên bản: Xe [${exp}] ⇄ DMS [${dms}]`;
                        guide = `Xe ghép là phiên bản [${exp}] nhưng VSO là [${dms}]. TVBH nhớ xử lý trước khi Xuất hóa đơn.`;
                    } else if (errorType === 'model' || norm.includes('dong xe')) {
                        const exp = apiService.getModelCode(expectedVal || '') || expectedVal || '';
                        const dms = apiService.getModelCode(dmsVal || '') || dmsVal || '';
                        title = `Lệch Dòng xe: Xe [${exp}] ⇄ DMS [${dms}]`;
                        guide = `Xe ghép là [${exp}] nhưng VSO là [${dms}]. TVBH nhớ xử lý trước khi Xuất hóa đơn.`;
                    } else if (rawReason) {
                        title = 'Cấu hình chưa khớp DMS';
                        guide = `${rawReason}. TVBH nhớ xử lý trước khi Xuất hóa đơn.`;
                    }

                    setDmsConfigCheck({
                        isChecking: false,
                        status: 'warning',
                        title,
                        message: guide
                    });
                }
            } catch (err: any) {
                setDmsConfigCheck({ isChecking: false, status: 'idle' });
            }
        }, 600);

        return () => clearTimeout(timer);
    }, [formData.so_don_hang, formData.dong_xe, formData.phien_ban, formData.ngoai_that, formData.noi_that, formData.chinh_sach, initialVehicle]);

    // Tải danh sách hợp đồng cọc tồn từ donhang_ton
    useEffect(() => {
        let isMounted = true;
        const loadBacklog = async () => {
            try {
                const res = await apiService.getBacklogOrders();
                if (isMounted && res.status === 'SUCCESS' && Array.isArray(res.data)) {
                    setBacklogOrders(res.data);
                }
            } catch (err) {
                console.error('[RequestForm] Lỗi tải danh sách cọc tồn:', err);
            }
        };
        loadBacklog();
        return () => { isMounted = false; };
    }, []);

    // Danh sách hợp đồng cọc tồn thuộc TVBH hiện tại
    const userBacklogList = useMemo(() => {
        if (!backlogOrders || backlogOrders.length === 0) return [];
        const isAdm = currentUser?.toLowerCase() === 'admin' || currentUser?.toLowerCase() === 'quản trị viên';
        return backlogOrders.filter(item => {
            if (!isAdm && !isNameMatch(item.tvbh_name, currentUser)) return false;
            const td = (item.tien_do || '').toLowerCase();
            if (td === 'hoàn cọc' || td === 'hủy cọc') return false;
            return true;
        });
    }, [backlogOrders, currentUser]);

    // Lọc theo tìm kiếm trong popup cọc tồn
    const filteredBacklog = useMemo(() => {
        if (!backlogSearch.trim()) return userBacklogList;
        const q = normalizeStr(backlogSearch);
        return userBacklogList.filter(item => {
            const soHd = normalizeStr(item.so_hop_dong || item.so_ct || item.so_don_hang);
            const kh = normalizeStr(item.khach_hang);
            const sdt = normalizeStr(item.so_dien_thoai);
            const pb = normalizeStr(item.phien_ban);
            const nt = normalizeStr(item.ngoai_that);
            return soHd.includes(q) || kh.includes(q) || sdt.includes(q) || pb.includes(q) || nt.includes(q);
        });
    }, [userBacklogList, backlogSearch]);

    // Xử lý click ngoài để đóng dropdown cọc tồn
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (backlogDropdownRef.current && !backlogDropdownRef.current.contains(e.target as Node)) {
                setIsBacklogDropdownOpen(false);
            }
        };
        if (isBacklogDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isBacklogDropdownOpen]);

    // Xử lý chọn 1 hợp đồng từ cọc tồn (chỉ lấy mã HĐ Cyber và Tên khách hàng theo yêu cầu)
    const handleSelectBacklogContract = (contract: any) => {
        const cyberCode = cleanCyberContractCode(contract.so_hop_dong || contract.so_ct || contract.so_don_hang || '');
        const customerName = (contract.khach_hang || '').trim().toUpperCase();

        setFormData(prev => ({
            ...prev,
            ma_hd_cyber: cyberCode,
            ten_khach_hang: customerName || prev.ten_khach_hang,
        }));

        setIsBacklogDropdownOpen(false);
        setBacklogSearch('');
        showToast('Đã chọn HĐ Cyber', `Đã chọn: ${cyberCode} - ${customerName}`, 'success', 2500);
    };

    // --- BỘ SƯU TẬP 5 BỨC TRANH 3D SHOWROOM TONE TRẮNG SÁNG SIÊU SANG ---
    const [whiteLuxuryBgIndex, setWhiteLuxuryBgIndex] = useState<number>(() => Math.floor(Math.random() * 5));

    // Đổi ngẫu nhiên bức tranh tone trắng sáng khác mỗi khi chọn Dòng xe mới
    useEffect(() => {
        if (formData.dong_xe) {
            setWhiteLuxuryBgIndex(prev => {
                const choices = [0, 1, 2, 3, 4].filter(i => i !== prev);
                return choices[Math.floor(Math.random() * choices.length)];
            });
        }
    }, [formData.dong_xe]);

    const inputClass = embeddedMobile
        ? "w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[12px] font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors shadow-2xs"
        : "w-full pl-4 pr-4 py-3.5 bg-white border border-slate-200 rounded-lg text-base font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/10 transition-all duration-300 shadow-sm hover:border-slate-300";
    const isPreFilled = !!initialVehicle;

    // --- Effects ---
    useEffect(() => {
        setAvailableExteriors(getMappedExteriors(formData.dong_xe, formData.phien_ban));
        setAvailableInteriors(getMappedInteriors(formData.dong_xe, formData.phien_ban));
    }, [formData.dong_xe, formData.phien_ban, getMappedExteriors, getMappedInteriors]);

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
            setStep(2); // Automatically jump to step 2 if pairing a specific vehicle
        } else {
            setStep(1);
        }
    }, [initialVehicle]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const val = (name === 'ten_khach_hang' || name === 'ma_hd_cyber' || name === 'so_don_hang') ? value.toUpperCase() : value;
        setFormData(prev => {
            const newState = { ...prev, [name]: val };

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
                const versions = versionsMap[value] || [];
                if (versions.length === 1) newState.phien_ban = versions[0];
            }
            if (name === 'phien_ban') { 
                newState.ngoai_that = ''; newState.noi_that = ''; 
            }
            return newState;
        });
    };

    const handleFileSelect = useCallback(async (file: File | null) => {
        console.log('[RequestForm] File selected:', file?.name);
        setChicFile(file);
        setFormData(prev => ({ ...prev, ngay_coc: '' }));
        setOcrStatus('');
        if (file) {
            setIsProcessingOcr(true);
            setOcrStatus('Đang xử lý');
            console.log('[RequestForm] Triggering Gemini OCR...');
            try {
                // Ưu tiên dùng Gemini AI (Chính xác cao hơn)
                let extractedDate = await extractDateWithGemini(file, (status) => setOcrStatus(status));
                
                // Nếu Gemini thất bại hoặc không ra kết quả, dùng Tesseract dự phòng
                if (!extractedDate) {
                    setOcrStatus('Đang xử lý');
                    extractedDate = await extractDateFromImageTesseract(file, (status) => setOcrStatus(status));
                }

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
        setFormData({ ten_ban_hang: currentUser, ten_khach_hang: '', so_don_hang: '', ma_hd_cyber: '', dong_xe: '', phien_ban: '', ngoai_that: '', noi_that: '', ngay_coc: '', thoi_gian_can_xe: '', vin: '', chinh_sach: '' });
        setDmsWarning('');
        setDmsConfigCheck({ isChecking: false, status: 'idle' });
        setShowVsoTooltip(false);
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
        // Validation Step 1: BẮT BUỘC CHỌN ĐẦY ĐỦ CẤU HÌNH XE
        if (!validateStep1()) {
            setStep(1);
            return;
        }

        // Validation Step 2: BẮT BUỘC NHẬP MÃ HĐ CYBER
        const requiredFields: (keyof typeof formData)[] = ['ten_khach_hang', 'so_don_hang', 'chinh_sach', 'ma_hd_cyber'];
        if (requiredFields.some(field => !formData[field]?.trim())) { 
            if (!formData.ma_hd_cyber?.trim()) {
                showToast('Thiếu Thông Tin', 'Vui lòng nhập hoặc chọn Mã HĐ Cyber (Bắt buộc khi yêu cầu ghép xe).', 'warning', 3500); 
            } else if (!formData.chinh_sach) {
                showToast('Thiếu Thông Tin', 'Vui lòng chọn Chính sách bán hàng áp dụng cho đơn hàng.', 'warning', 3000); 
            } else {
                showToast('Thiếu Thông Tin', 'Vui lòng điền đủ thông tin khách hàng.', 'warning', 3000); 
            }
            return; 
        }
        const pattern = new RegExp("^N[0-9]{5}-[A-Z]{3}-[0-9]{2}-[0-9]{2}-[0-9]{4}$");
        if (!pattern.test(formData.so_don_hang)) { showToast('Sai Định Dạng', 'Số đơn hàng không đúng định dạng DMS (Nxxxxx-VSO-xx-xx-xxxx).', 'warning', 4000); return; }
        if (existingOrderNumbers.includes(formData.so_don_hang)) { showToast('Trùng Lặp', 'Số đơn hàng đã tồn tại trên hệ thống.', 'error', 4000); return; }

        // [CHỐNG GIAN LẬN]: Chặn cứng khi mã DMS không khớp với 6 ký tự đầu SĐH
        if (initialVehicle && dmsWarning) { showToast('Không Hợp Lệ', 'Mã DMS xe không khớp với Số đơn hàng. Không thể tiếp tục.', 'error', 5000); return; }
        if (!chicFile) { showToast('Thiếu Chứng Từ', 'Vui lòng tải lên UNC.', 'warning', 3000); return; }
        if (!formData.ngay_coc) { showToast('Chờ Xử Lý Ảnh', 'Vui lòng chờ OCR.', 'warning', 3000); return; }

        setIsSubmitting(true);
//         showToast('Đang Gửi', 'Đang xử lý...', 'loading');
        try {
            const requestPayload = {
                ...formData,
                ma_hd_cyber: cleanCyberContractCode(formData.ma_hd_cyber) || null,
                ten_khach_hang: (formData.ten_khach_hang || '').trim().toUpperCase(),
                is_flex_match: 'false',
                ngoai_that_flex: '[]',
                noi_that_flex: '[]'
            };
            const result = await apiService.addRequest(requestPayload as any, chicFile);
            if (result.status === "SUCCESS" && result.newRecord) {
                if (dmsConfigCheck.status === 'warning' && !isWholesaleDeposit(formData.chinh_sach)) {
                    showToast('Đã gửi yêu cầu ghép xe', 'Yêu cầu ghép xe đã được gửi. Lưu ý TVBH cần xử lý lệch cấu hình trước khi Xuất hóa đơn.', 'warning', 6000);
                } else {
                    showToast('Thành Công', 'Yêu cầu ghép xe đã được gửi thành công.', 'success', 3000);
                }
                onSuccess(result.newRecord);
                handleClearForm();
            }
            else { throw new Error(result.message || 'Thất bại.'); }
        } catch (error) {
            showToast('Lỗi', error instanceof Error ? error.message : 'Lỗi lạ.', 'error', 5000);
        } finally { setIsSubmitting(false); }
    };

    const handleShowSample = (e: React.MouseEvent) => { e.preventDefault(); onOpenImagePreview([{ src: 'pictures/uynhiemchi.webp', originalUrl: 'pictures/uynhiemchi.webp', label: 'Mẫu UNC' }], 0, 'Ảnh Mẫu'); };
    const availableVersions = formData.dong_xe ? (versionsMap[formData.dong_xe] || allPossibleVersions) : [];
    const warningClasses = {
        'hot': 'bg-orange-50 border-orange-100 text-orange-700 font-bold shadow-sm animate-pulse-subtle',
        'slow': 'bg-green-50 border-green-100 text-green-700 font-bold shadow-sm'
    };

    const isMidAutumnSeason = (): boolean => {
        if (typeof window !== 'undefined') {
            const override = localStorage.getItem('THEME_SEASON');
            if (override === 'trung_thu') return true;
            if (override === 'normal') return false;
        }
        return false;
    };

    const WHITE_LUXURY_SHOWROOMS = [
        'pictures/showroom_trung_thu_1.webp', // 1. White Luxury Studio
        'pictures/showroom_trung_thu_2.webp', // 2. Penthouse Sky Studio
        'pictures/showroom_trung_thu_3.webp', // 3. Cathedral Infinity Terrace
        'pictures/showroom_trung_thu_4.webp', // 4. Grand Circular Rotunda
        'pictures/showroom_trung_thu_5.webp', // 5. Modern Zen Bamboo Studio
    ];

    const getShowroomBg = () => {
        // Trong mùa Trung Thu: Chọn ngẫu nhiên trong bộ sưu tập 5 tranh 3D Tone Trắng Sáng
        if (isMidAutumnSeason()) {
            return WHITE_LUXURY_SHOWROOMS[whiteLuxuryBgIndex] || 'pictures/showroom_trung_thu_1.webp';
        }
        // Hết mùa Trung Thu -> Tự động quay về hệ thống tranh showroom nguyên bản theo từng dòng xe
        const model = formData.dong_xe?.toLowerCase() || '';
        if (model.includes('vf 3') || model.includes('vf 5')) return 'pictures/showroom_nature.png';
        if (model.includes('vf 6') || model.includes('vf 7') || model.includes('vfe34')) return 'pictures/showroom_city.png';
        if (model.includes('vf 8') || model.includes('vf 9')) return 'pictures/showroom_tech.png';
        return 'pictures/showroom_bg_white.png';
    };

    return (
        <form onSubmit={handleConfirmSubmit} className={`flex h-full w-full flex-col overflow-hidden p-0 lg:flex-row lg:gap-6 ${embeddedMobile ? 'bg-white' : 'bg-transparent lg:p-4'}`}>

            {/* LEFT PANEL: 3D Studio Background & Car (50%) */}
            <div className={`${embeddedMobile ? 'hidden' : 'hidden md:flex'} relative z-20 order-1 w-full flex-col overflow-hidden rounded-l-3xl lg:order-1 lg:w-[50%]`}>
                {/* 3D Studio Background: Modern Showroom Image */}
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out"
                    style={{ backgroundImage: `url('${getShowroomBg()}')` }}
                >
                    {/* Soft ambient overlay linh hoạt theo mùa */}
                    <div className={`absolute inset-0 pointer-events-none transition-all duration-700 ${
                        isMidAutumnSeason() ? 'bg-gradient-to-t from-white/15 via-transparent to-slate-900/5' : 'bg-white/20'
                    }`}></div>
                </div>

                {/* Header */}
                <div className="absolute top-6 left-8 z-30">
                    <div className="flex items-center gap-3 px-5 py-2 bg-slate-900/95 backdrop-blur-md rounded-md shadow-lg border border-white/10">
                        <i className="fas fa-car-side text-white/80 text-sm"></i>
                        <h1 className="text-[11px] font-bold text-white tracking-[0.2em] uppercase">Yêu cầu ghép xe</h1>
                    </div>
                </div>

                <div className="flex-1 p-8 pt-20 flex flex-col justify-center items-center relative z-20">
                        {(formData.dong_xe && formData.ngoai_that) ? (
                            <div className="relative w-full flex flex-col items-center translate-y-16 lg:translate-y-24">
                                {/* Main Car Image */}
                                <CarImage
                                    model={formData.dong_xe}
                                    exteriorColor={formData.ngoai_that}
                                    version={formData.phien_ban}
                                    className="w-[90%] h-auto max-h-[45vh] object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.4)] z-20 transition-all duration-700 ease-out"
                                    alt="Xe"
                                />
                                
                                {/* Soft Blurred Mirror Reflection */}
                                <div className="absolute inset-0 opacity-40 z-10 pointer-events-none mix-blend-multiply" style={{ maskImage: 'linear-gradient(to bottom, transparent 75%, black 78%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 75%, black 78%, transparent 100%)' }}>
                                    <CarImage
                                        model={formData.dong_xe}
                                        exteriorColor={formData.ngoai_that}
                                        version={formData.phien_ban}
                                        className="w-[90%] h-auto max-h-[45vh] object-contain mx-auto transform scale-y-[-1] translate-y-[56%] blur-[4px]"
                                        alt=""
                                    />
                                </div>
                                
                                {/* Intense Grounding Contact Shadow */}
                                <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 w-[55%] h-6 bg-black/40 blur-[10px] rounded-[100%] z-10"></div>
                            </div>
                        ) : null}
                        {(isSubmitting || isProcessingOcr) && <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-md z-30"><i className="fas fa-circle-notch fa-spin text-4xl text-accent-primary"></i></div>}
                    </div>
                </div>

            {/* RIGHT PANEL: Spacious Form (50%) */}
            <div className={`relative z-10 order-2 flex h-full flex-1 flex-col bg-white lg:order-2 lg:w-[50%] ${embeddedMobile ? 'overflow-hidden' : 'overflow-y-auto rounded-3xl border border-slate-100/50 shadow-xl'}`}>
                {/* Stepper Header - Compact */}
                <div className={`flex shrink-0 items-center justify-between border-b border-slate-100 ${embeddedMobile ? 'bg-white px-4 py-2.5' : 'bg-transparent px-6 py-4'}`}>
                    {embeddedMobile ? (
                        <>
                            <div className="min-w-0">
                                <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate-900">
                                    {step === 1 ? 'Cấu hình xe' : 'Thông tin hợp đồng'}
                                </h3>
                                <p className="mt-0.5 truncate text-[10.5px] font-medium text-slate-500">
                                    {formData.dong_xe} {formData.phien_ban}
                                    {formData.vin ? ` · VIN ...${formData.vin.slice(-6)}` : ''}
                                </p>
                            </div>
                            <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                                Bước {step}/2
                            </span>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${step >= 1 ? 'bg-accent-primary text-white' : 'bg-slate-100 text-slate-400'}`}>1</div>
                                <div className={`h-0.5 w-12 rounded-full transition-all ${step >= 2 ? 'bg-accent-primary' : 'bg-slate-100'}`}></div>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${step >= 2 ? 'bg-accent-primary text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
                            </div>
                            <div>
                                <h3 className="text-[12px] font-extrabold text-slate-900 uppercase tracking-[0.15em]">{step === 1 ? 'Cấu hình xe' : 'Thông tin HĐ'}</h3>
                            </div>
                        </>
                    )}
                </div>

                {/* Content Area */}
                <div className={`flex flex-grow flex-col ${embeddedMobile ? 'overflow-hidden p-3' : 'overflow-y-auto p-6 md:p-8'}`}>
                    <div className={`relative flex w-full flex-grow flex-col ${embeddedMobile ? 'justify-start' : 'justify-center'}`}>

                        {/* STEP 1: Premium Config Grid */}
                        {step === 1 && (
                            <div className={`relative z-10 animate-fade-in ${embeddedMobile ? 'space-y-3' : 'space-y-4 md:space-y-5'}`}>
                                <div className={`grid grid-cols-1 ${embeddedMobile ? 'gap-3' : 'gap-5 md:gap-6'}`}>
                                    <div>
                                        <InputGroup label="Dòng xe (Model)" htmlFor="dong_xe" required>
                                            <div className={`flex flex-wrap ${embeddedMobile ? 'mt-1.5 justify-center gap-1.5' : 'mt-2 gap-2'}`}>
                                                {vehicleLines.map(model => {
                                                    const isSelected = formData.dong_xe === model;
                                                    return (
                                                        <button
                                                            key={model}
                                                            type="button"
                                                            disabled={isPreFilled}
                                                            onClick={() => handleInputChange({ target: { name: 'dong_xe', value: model } } as any)}
                                                            className={`${embeddedMobile ? 'h-8 w-[calc(20%-5px)] flex-none rounded-lg px-1 text-[9.5px] tracking-wide' : 'rounded-md px-4 py-1.5 text-[11px] tracking-wider'} font-bold uppercase transition-colors duration-300 ${
                                                                isSelected
                                                                    ? 'bg-slate-900 text-white shadow-sm border border-slate-900'
                                                                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-900 hover:text-slate-900 hover:bg-slate-50'
                                                            } ${isPreFilled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {model}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </InputGroup>
                                    </div>
                                    <div>
                                        <InputGroup label="Phiên bản (Version)" htmlFor="phien_ban" required>
                                            <div className="flex flex-nowrap overflow-x-auto gap-2 mt-2 pb-2 -mx-1 px-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                                {availableVersions.length > 0 ? availableVersions.map(version => {
                                                    const isSelected = formData.phien_ban === version;
                                                    return (
                                                        <button
                                                            key={version}
                                                            type="button"
                                                            disabled={!formData.dong_xe || isPreFilled}
                                                            onClick={() => handleInputChange({ target: { name: 'phien_ban', value: version } } as any)}
                                                            className={`whitespace-nowrap flex-shrink-0 px-4 py-1.5 rounded-md text-[11px] font-bold tracking-wider uppercase transition-colors duration-300 ${
                                                                isSelected
                                                                    ? 'bg-slate-900 text-white shadow-sm border border-slate-900'
                                                                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-900 hover:text-slate-900 hover:bg-slate-50'
                                                            } ${(!formData.dong_xe || isPreFilled) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {version}
                                                        </button>
                                                    );
                                                }) : (
                                                    <div className="text-sm text-slate-400 italic px-2 py-1.5">Vui lòng chọn Dòng xe trước</div>
                                                )}
                                            </div>
                                        </InputGroup>
                                    </div>
                                    <div>
                                        <InputGroup
                                            label="Màu ngoại thất (Exterior Color)"
                                            htmlFor="ngoai_that"
                                            required
                                            badge={embeddedMobile && formData.ngoai_that ? (
                                                <span className="max-w-[52vw] truncate rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                                                    {formData.ngoai_that}
                                                </span>
                                            ) : undefined}
                                        >
                                            {!embeddedMobile && <div className="mt-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center min-h-[46px]">
                                                <span className={`text-[13px] italic ${formData.ngoai_that ? 'text-slate-700' : 'text-slate-400'}`}>
                                                    {formData.ngoai_that || 'Vui lòng chọn vòng màu bên dưới...'}
                                                </span>
                                            </div>}
                                        </InputGroup>
                                        <div className={`${embeddedMobile ? 'mt-1.5 grid min-h-8 grid-cols-6 gap-1.5 px-1 pb-1' : 'mt-3 flex min-h-[44px] flex-wrap gap-2 pl-1'}`}>
                                             {(formData.phien_ban && availableExteriors.length > 0) ? (
                                                    Array.from(new Set(availableExteriors)).map(color => {
                                                        const lower = color.toLowerCase();
                                                        const getHex = (str: string) => {
                                                            if (str.includes('ce18') || str.includes('1818')) return '#ffffff';
                                                            if (str.includes('ce33') || str.includes('1833')) return '#2563eb'; // Starburst Blue
                                                            if (str.includes('ce2q') || str.includes('112q') || str.includes('182q')) return '#b91c1c'; // Solar Ruby
                                                            if (str.includes('ce11') || str.includes('3111')) return '#111827'; // Jet Black
                                                            if (str.includes('ce31')) return '#4b5563'; // Stealth Gray
                                                            if (str.includes('ce32') || str.includes('1132') || str.includes('1832')) return '#ea580c'; // Vitality Orange
                                                            if (str.includes('ce2o') || str.includes('312o')) return '#7e22ce'; // Mysterioso Purple
                                                            if (str.includes('deep ocean') || str.includes('ce22')) return '#1a4731'; // Dark green
                                                            if (str.includes('orange') || str.includes('orb')) return '#ea580c';
                                                            if (str.includes('purple') || str.includes('berry')) return '#6b21a8';
                                                            if (str.includes('mint') || str.includes('ce1w')) return '#a7f3d0';
                                                            if (str.includes('ruby') || str.includes('red') || str.includes('velvet') || str.includes('crimson') || str.includes('ce1m')) return '#991b1b';
                                                            if (str.includes('blue') || str.includes('azure') || str.includes('ocean') || str.includes('ce1n')) return '#1d4ed8';
                                                            if (str.includes('black')) return '#111827';
                                                            if (str.includes('gray') || str.includes('grey') || str.includes('silver') || str.includes('neptune') || str.includes('ce17') || str.includes('ce1v') || str.includes('171v')) return '#6b7280';
                                                            if (str.includes('white') || str.includes('blanc') || str.includes('creme')) return '#ffffff';
                                                            if (str.includes('brown') || str.includes('bronze') || str.includes('bronz') || str.includes('ce2n')) return '#78350f';
                                                            if (str.includes('green') || str.includes('ivy') || str.includes('ce1h')) return '#15803d';
                                                            if (str.includes('yellow') || str.includes('champa') || str.includes('ce1u') || str.includes('111u') || str.includes('181u')) return '#facc15';
                                                            if (str.includes('pink') || str.includes('ce21') || str.includes('1821') || str.includes('ce1x')) return '#f472b6';
                                                            return '#e5e7eb';
                                                        };
                                                        
                                                        let backgroundStyle = '';
                                                        const isWhiteSingle = !lower.includes('-') && !lower.includes('_') && (lower.includes('white') || lower.includes('ce18') || lower.includes('blanc'));

                                                        if (lower.includes('-')) {
                                                            const parts = lower.split('-');
                                                            const color1 = getHex(parts[0]);
                                                            const color2 = getHex(parts[1]);
                                                            backgroundStyle = `linear-gradient(135deg, ${color1} 50%, ${color2} 50%)`;
                                                        } else if (lower.includes('_')) {
                                                            const parts = lower.split('_');
                                                            const color1 = getHex(parts[0]);
                                                            const color2 = getHex(parts[1]);
                                                            backgroundStyle = `linear-gradient(135deg, ${color1} 50%, ${color2} 50%)`;
                                                        } else if (isWhiteSingle) {
                                                            backgroundStyle = `linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)`;
                                                        } else {
                                                            backgroundStyle = getHex(lower);
                                                        }
                                                        
                                                        const isSelected = formData.ngoai_that === color;
                                                        return (
                                                            <div 
                                                                key={color} 
                                                                onClick={!isPreFilled ? () => handleInputChange({ target: { name: 'ngoai_that', value: color } } as any) : undefined} 
                                                                className={`relative flex flex-shrink-0 items-center justify-center rounded-full cursor-pointer transition-all duration-300 ease-out ${embeddedMobile ? 'h-7 w-7 justify-self-center' : 'h-8 w-8'} ${isSelected ? 'ring-2 ring-accent-primary ring-offset-2 scale-110 shadow-md' : 'ring-1 ring-slate-300 hover:ring-slate-400 hover:scale-105 shadow-sm'}`} 
                                                                title={color}
                                                            >
                                                                <div className={`w-full h-full rounded-full overflow-hidden relative border ${isWhiteSingle ? 'border-slate-300 shadow-inner' : 'border-black/10'}`}>
                                                                    <div className="absolute inset-0" style={{ background: backgroundStyle }}></div>
                                                                    {!isWhiteSingle && (
                                                                        <>
                                                                            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/20 mix-blend-overlay rounded-full"></div>
                                                                            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent h-1/2 rounded-t-full"></div>
                                                                        </>
                                                                    )}
                                                                    {isWhiteSingle && (
                                                                        <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-slate-200/50 rounded-full"></div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className={`${embeddedMobile ? 'col-span-6 w-full justify-center text-center text-[10.5px]' : 'text-[13px]'} flex h-8 items-center py-1 italic text-slate-400`}>
                                                        Vui lòng chọn Phiên bản để xem bảng màu...
                                                    </div>
                                                )}
                                            </div>
                                    </div>
                                    <div>
                                        <InputGroup
                                            label="Màu nội thất (Interior Color)"
                                            htmlFor="noi_that"
                                            required
                                            badge={embeddedMobile && formData.noi_that ? (
                                                <span className="max-w-[52vw] truncate rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                                                    {formData.noi_that}
                                                </span>
                                            ) : undefined}
                                        >
                                            {!embeddedMobile && <div className="mt-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center min-h-[46px]">
                                                <span className={`text-[13px] italic ${formData.noi_that ? 'text-slate-700' : 'text-slate-400'}`}>
                                                    {formData.noi_that || 'Vui lòng chọn vòng màu bên dưới...'}
                                                </span>
                                            </div>}
                                        </InputGroup>
                                        <div className={`${embeddedMobile ? 'mt-1.5 grid min-h-8 grid-cols-6 gap-1.5 px-1 pb-1' : 'mt-3 flex min-h-[44px] flex-wrap gap-2 pl-1'}`}>
                                            {(formData.ngoai_that && availableInteriors.length > 0) ? (
                                                availableInteriors.map(color => {
                                                    const lower = color.toLowerCase();
                                                    const hex = lower.includes('black') ? '#111827' : lower.includes('brown') ? '#92400e' : lower.includes('beige') ? '#e5e5cb' : '#e5e7eb';
                                                    const isSelected = formData.noi_that === color;
                                                    return (
                                                        <div 
                                                            key={color} 
                                                            onClick={!isPreFilled ? () => handleInputChange({ target: { name: 'noi_that', value: color } } as any) : undefined} 
                                                            className={`relative flex flex-shrink-0 items-center justify-center rounded-full cursor-pointer transition-all duration-300 ease-out ${embeddedMobile ? 'h-7 w-7 justify-self-center' : 'h-8 w-8'} ${isSelected ? 'ring-2 ring-accent-primary ring-offset-2 scale-110 shadow-md' : 'ring-1 ring-slate-200 hover:ring-slate-300 hover:scale-105 shadow-sm'}`} 
                                                            title={color}
                                                        >
                                                            <div className="w-full h-full rounded-full overflow-hidden relative border border-black/10">
                                                                <div className="absolute inset-0" style={{ backgroundColor: hex }}></div>
                                                                <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/5 to-black/30 mix-blend-overlay rounded-full"></div>
                                                                <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent h-1/2 rounded-t-full"></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className={`${embeddedMobile ? 'col-span-6 w-full justify-center text-center text-[10.5px]' : 'text-[13px]'} flex h-8 items-center py-1 italic text-slate-400`}>
                                                    Vui lòng chọn Ngoại thất để xem bảng màu...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>



                                {warningMessage && warningType && <div className={`p-3 rounded-lg border flex items-center gap-2 text-xs ${warningClasses[warningType]}`}><i className={`fas ${warningType === 'hot' ? 'fa-fire' : 'fa-check-circle'}`}></i><span dangerouslySetInnerHTML={{ __html: warningMessage }}></span></div>}
                            </div>
                        )}

                        {/* STEP 2: Premium Info Grid */}
                        {step === 2 && (
                            <div className={`relative z-10 flex flex-col animate-fade-in ${embeddedMobile ? 'gap-2' : 'gap-3 md:gap-4'}`}>
                                <div className={`grid grid-cols-1 md:grid-cols-2 ${embeddedMobile ? 'gap-2' : 'gap-3 md:gap-4'}`}>
                                    {/* MÃ HĐ CYBER (BẮT BUỘC) */}
                                    <div className="relative">
                                        <div className={`flex items-center justify-between ${embeddedMobile ? 'mb-1' : 'mb-2'}`}>
                                            <label htmlFor="ma_hd_cyber" className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                                                <i className="fas fa-file-signature text-blue-500"></i>
                                                Mã HĐ Cyber <span className="text-red-500">*</span>
                                            </label>
                                            {userBacklogList.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsBacklogDropdownOpen(prev => !prev)}
                                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1 border border-blue-200 transition-colors shadow-2xs"
                                                    title="Chọn nhanh từ danh sách hợp đồng cọc tồn của bạn"
                                                >
                                                    <i className="fas fa-list-check text-[10px]"></i>
                                                    <span>Cọc tồn ({userBacklogList.length})</span>
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <input
                                                id="ma_hd_cyber"
                                                type="text"
                                                name="ma_hd_cyber"
                                                value={formData.ma_hd_cyber}
                                                onChange={handleInputChange}
                                                onBlur={() => setFormData(prev => ({ ...prev, ma_hd_cyber: cleanCyberContractCode(prev.ma_hd_cyber) }))}
                                                onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())}
                                                required
                                                placeholder="VD: 02.xxxx/xx/2026/HĐMB-MDP"
                                                className={`${inputClass} !py-2.5 pr-10 font-mono font-medium ${!formData.ma_hd_cyber ? 'border-amber-300 focus:border-blue-500' : 'border-blue-300 text-blue-900 bg-blue-50/20'}`}
                                            />
                                            {userBacklogList.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsBacklogDropdownOpen(prev => !prev)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                                    title="Mở danh sách cọc tồn"
                                                >
                                                    <i className={`fas ${isBacklogDropdownOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs`}></i>
                                                </button>
                                            )}
                                        </div>

                                        {/* DROPDOWN POPUP CỌC TỒN */}
                                        {isBacklogDropdownOpen && (
                                            <div
                                                ref={backlogDropdownRef}
                                                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-2.5 max-h-72 overflow-hidden flex flex-col animate-fade-in"
                                                style={{ minWidth: '300px' }}
                                            >
                                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 shrink-0">
                                                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                                        <i className="fas fa-layer-group text-blue-500"></i>
                                                        Cọc tồn của bạn ({filteredBacklog.length})
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsBacklogDropdownOpen(false)}
                                                        className="text-slate-400 hover:text-slate-600 text-xs px-1"
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </div>

                                                {userBacklogList.length > 3 && (
                                                    <div className="mb-2 shrink-0">
                                                        <input
                                                            type="text"
                                                            placeholder="Tìm số HĐ, tên KH, xe, SĐT..."
                                                            value={backlogSearch}
                                                            onChange={(e) => setBacklogSearch(e.target.value)}
                                                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                                                            autoFocus
                                                        />
                                                    </div>
                                                )}

                                                <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                                                    {filteredBacklog.length === 0 ? (
                                                        <div className="py-4 text-center text-xs text-slate-400 italic">
                                                            {backlogSearch ? 'Không tìm thấy hợp đồng phù hợp' : 'Chưa có hợp đồng cọc tồn nào'}
                                                        </div>
                                                    ) : (
                                                        filteredBacklog.map((item, idx) => {
                                                            const code = item.so_hop_dong || item.so_ct || item.so_don_hang;
                                                            const isCurrentSelected = formData.ma_hd_cyber === code;
                                                            return (
                                                                <div
                                                                    key={item.id || code || idx}
                                                                    onClick={() => handleSelectBacklogContract(item)}
                                                                    className={`p-2.5 rounded-lg border cursor-pointer transition-all text-left ${
                                                                        isCurrentSelected
                                                                            ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-400'
                                                                            : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:border-blue-200'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className="font-mono font-bold text-xs text-blue-700 truncate">
                                                                            {code}
                                                                        </span>
                                                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 shrink-0">
                                                                            {Number(item.tien_coc || 0).toLocaleString('vi-VN')} ₫
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between text-xs text-slate-700 font-semibold mt-1">
                                                                        <span className="truncate">{item.khach_hang}</span>
                                                                        <span className="text-[11px] text-slate-500 font-mono shrink-0">{item.so_dien_thoai}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                                                                        <span className="truncate italic">{item.phien_ban} - {item.ngoai_that}</span>
                                                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                                                            {item.tien_do || 'Chờ xe'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <InputGroup
                                                label="Số đơn hàng (VSO)"
                                                htmlFor="so_don_hang"
                                                icon="fa-barcode"
                                                required
                                                badge={
                                                    dmsConfigCheck.isChecking ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                                            <i className="fas fa-spinner fa-spin text-xs"></i>
                                                            <span>Đang kiểm tra...</span>
                                                        </span>
                                                    ) : dmsConfigCheck.status === 'valid' ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shadow-2xs" title="Cấu hình xe khớp 100% với VSO trên VinFast DMS">
                                                            <i className="fas fa-check-circle text-emerald-500 text-[10px]"></i>
                                                            <span>Khớp DMS</span>
                                                        </span>
                                                    ) : dmsConfigCheck.status === 'warning' ? (
                                                        <div 
                                                            className="relative inline-flex items-center"
                                                            onMouseEnter={() => setShowVsoTooltip(true)}
                                                            onMouseLeave={() => setShowVsoTooltip(false)}
                                                            onClick={() => setShowVsoTooltip(prev => !prev)}
                                                        >
                                                            <button
                                                                type="button"
                                                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-0.5 rounded-md shadow-2xs transition-colors cursor-pointer select-none"
                                                                title="Xem chi tiết nhắc nhở lệch cấu hình"
                                                            >
                                                                <i className="fas fa-exclamation-triangle text-amber-600 text-[10px]"></i>
                                                                <span>Nhắc nhở</span>
                                                            </button>

                                                            {/* Khung thông tin dạng hover nhẹ - Nền trắng đục 100%, không bị xuyên thấu, không đẩy bố cục */}
                                                            {showVsoTooltip && (
                                                                <div className="absolute right-0 top-full mt-2 w-80 sm:w-88 p-3.5 rounded-xl border-2 border-amber-300 bg-white shadow-2xl text-xs z-[100] animate-fade-in pointer-events-auto">
                                                                    {/* Mũi tên chỉ lên nút Nhắc nhở */}
                                                                    <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white border-t-2 border-l-2 border-amber-300 rotate-45"></div>

                                                                    <div className="relative z-10 space-y-2">
                                                                        <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                                                                            <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                                                                                <i className="fas fa-info-circle text-amber-600 shrink-0"></i>
                                                                                <span className="truncate">{dmsConfigCheck.title || 'Lệch cấu hình DMS'}</span>
                                                                            </div>
                                                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0 border border-amber-200">
                                                                                Nhắc nhở
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-[11px] text-slate-700 leading-relaxed font-normal">
                                                                            {dmsConfigCheck.message}
                                                                        </div>
                                                                        <div className="text-[10px] text-amber-800/90 pt-1.5 border-t border-amber-100 italic leading-snug">
                                                                            * Hệ thống vẫn cho phép gửi yêu cầu ghép xe. TVBH vui lòng xử lý/chỉnh sửa trên DMS hoặc đổi xe trước khi làm thủ tục Xuất hóa đơn.
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : null
                                                }
                                            >
                                                <div className="relative">
                                                    <input
                                                        id="so_don_hang"
                                                        type="text"
                                                        name="so_don_hang"
                                                        value={formData.so_don_hang}
                                                        onChange={handleInputChange}
                                                        required
                                                        pattern="^N[0-9]{5}-[A-Z]{3}-[0-9]{2}-[0-9]{2}-[0-9]{4}$"
                                                        title="Định dạng: Nxxxxx-VSO-yy-mm-zzzz"
                                                        onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Sai định dạng.')}
                                                        onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                                                        className={`${inputClass} !py-2.5 font-mono uppercase ${
                                                            dmsWarning
                                                                ? 'border-red-400 focus:ring-red-100'
                                                                : dmsConfigCheck.status === 'warning'
                                                                    ? 'border-amber-300 bg-amber-50/15 focus:border-amber-400 focus:ring-amber-100 pr-9'
                                                                    : ''
                                                        }`}
                                                        placeholder="VD: N31923-VSO-26-10-xxxx"
                                                    />
                                                    {dmsConfigCheck.status === 'warning' && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" title={dmsConfigCheck.message}>
                                                            <i className="fas fa-exclamation-circle text-sm"></i>
                                                        </div>
                                                    )}
                                                </div>
                                                {dmsWarning && (
                                                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-red-500 bg-red-50 p-2 rounded-lg border border-red-100 animate-fade-in">
                                                        <i className="fas fa-exclamation-triangle"></i>
                                                        {dmsWarning}
                                                    </div>
                                                )}
                                            </InputGroup>
                                        </div>

                                    <div>
                                        <InputGroup label="Tên khách hàng" htmlFor="ten_khach_hang" icon="fa-user" required>
                                            <input id="ten_khach_hang" type="text" name="ten_khach_hang" value={formData.ten_khach_hang} onChange={handleInputChange} onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} required className={`${inputClass} !py-2.5`} placeholder="" />
                                        </InputGroup>
                                    </div>

                                    <div>
                                        <InputGroup label="Chính sách" htmlFor="chinh_sach" icon="fa-scroll" required>
                                            <div className="relative">
                                                <input
                                                    id="chinh_sach"
                                                    type="text"
                                                    name="chinh_sach"
                                                    value={formData.chinh_sach || ''}
                                                    readOnly
                                                    required
                                                    placeholder="Vui lòng chọn chính sách..."
                                                    className={`${inputClass} !py-2.5 cursor-pointer pr-10`}
                                                    onClick={() => setIsPolicyModalOpen(true)}
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-accent-primary p-2 hover:bg-slate-100 rounded-full transition-colors"
                                                    onClick={() => setIsPolicyModalOpen(true)}
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                            </div>
                                        </InputGroup>
                                    </div>

                                    {!formData.vin && (
                                        <div className="md:col-span-2">
                                            <InputGroup label="Thời gian cần xe" htmlFor="thoi_gian_can_xe" icon="fa-clock" required>
                                                <input id="thoi_gian_can_xe" type="date" name="thoi_gian_can_xe" value={formData.thoi_gian_can_xe} onChange={handleInputChange} required className={`${inputClass} !py-2.5`} />
                                            </InputGroup>
                                        </div>
                                    )}
                                </div>
                                <div className={`${embeddedMobile ? 'rounded-xl p-2' : 'rounded-2xl p-3 shadow-inner md:p-4'} bg-slate-50/50 backdrop-blur-sm border border-slate-200/50`}>
                                    <div className={`flex items-center justify-between ${embeddedMobile ? 'mb-2' : 'mb-3'}`}>
                                        <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-accent-primary/10 flex items-center justify-center">
                                                <i className="fas fa-file-invoice-dollar text-accent-primary text-[10px]"></i>
                                            </div>
                                            ỦY NHIỆM CHI <span className="text-red-500">*</span>
                                        </label>
                                        <button type="button" onClick={handleShowSample} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-accent-primary hover:bg-accent-primary hover:text-white hover:border-accent-primary transition-all uppercase">Xem mẫu</button>
                                    </div>
                                    <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessingOcr} ocrStatus={ocrStatus} showToast={showToast} compact={embeddedMobile} />
                                    {(!embeddedMobile || formData.ngay_coc) && (
                                        <div className={`${embeddedMobile ? 'mt-2 p-2 text-[10.5px]' : 'mt-4 p-3 text-xs'} flex items-center justify-between text-slate-500 bg-white/80 rounded-xl border border-slate-100 shadow-sm`}>
                                            <span className="font-medium">Ngày cọc:</span>
                                            <span className={`font-mono font-bold px-2 py-0.5 rounded ${formData.ngay_coc ? 'text-green-600 bg-green-50' : 'text-slate-400 bg-slate-50'}`}>
                                                {formData.ngay_coc ? new Date(formData.ngay_coc).toLocaleDateString('vi-VN') : 'CHƯA NHẬN DIỆN'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className={`flex shrink-0 items-center ${embeddedMobile ? 'border-t border-slate-100 bg-white px-4 py-3' : 'justify-end px-6 py-5 md:px-8'}`}>
                    <div className={`flex items-center gap-2 ${embeddedMobile ? 'w-full' : 'gap-3'}`}>
                        {step === 1 ? (
                            <button
                                type="button"
                                onClick={handleClearForm}
                                className={`${embeddedMobile ? 'h-10 flex-1 rounded-xl bg-slate-100 text-[12px] font-medium text-slate-600 active:bg-slate-200' : 'rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-100 active:bg-slate-200'} cursor-pointer transition-all`}
                            >
                                Hủy bỏ
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleBackStep}
                                className={`${embeddedMobile ? 'h-10 flex-1 rounded-xl bg-slate-100 text-[12px] font-medium text-slate-600 active:bg-slate-200' : 'rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-100 active:bg-slate-200'} flex cursor-pointer items-center justify-center gap-1.5 transition-all`}
                            >
                                <i className="fas fa-arrow-left text-xs"></i>
                                <span>Quay lại</span>
                            </button>
                        )}

                        {step === 1 ? (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                className={`${embeddedMobile ? 'h-10 flex-[1.25] rounded-xl bg-slate-800 text-[12px] shadow-xs active:bg-slate-900' : 'rounded-full bg-blue-600 px-6 py-2.5 text-sm shadow-md hover:bg-blue-700 hover:shadow-lg active:bg-blue-800'} flex cursor-pointer items-center justify-center gap-2 font-semibold text-white transition-all`}
                            >
                                <span>Tiếp theo</span>
                                <i className="fas fa-arrow-right text-xs"></i>
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`${embeddedMobile ? 'h-10 flex-[1.25] rounded-xl bg-slate-800 text-[12px] shadow-xs active:bg-slate-900' : 'rounded-full bg-blue-600 px-6 py-2.5 text-sm shadow-md hover:bg-blue-700 hover:shadow-lg active:bg-blue-800'} flex cursor-pointer items-center justify-center gap-2 font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin text-sm"></i>
                                        <span>Đang gửi...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Gửi yêu cầu</span>
                                        <i className="fas fa-paper-plane text-xs"></i>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <SelectPolicyModal
                isOpen={isPolicyModalOpen}
                onClose={() => setIsPolicyModalOpen(false)}
                onSelect={(policy) => {
                    setFormData(prev => ({ ...prev, chinh_sach: policy }));
                }}
                currentPolicy={formData.chinh_sach}
                carModel={formData.dong_xe}
                compact={true}
                embeddedMobile={embeddedMobile}
            />
        </form>
    );
};

export default React.memo(RequestForm);
