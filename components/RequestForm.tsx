import React, { useState, useEffect, useCallback, FormEvent, useMemo, useRef } from 'react';
import { AnalyticsData, Order, StockVehicle } from '../types';
import { extractDateFromImageTesseract, extractDateWithGemini } from '../services/ocrService';
import { useVehicleConfig } from '../hooks/useVehicleConfig';
import * as apiService from '../services/apiService';
import FileUpload from './ui/FileUpload';
import CarImage from './ui/CarImage';
import SelectPolicyModal from './modals/SelectPolicyModal';
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

const InputGroup: React.FC<{ icon?: string; children: React.ReactNode; label: string; htmlFor: string; required?: boolean }> = ({ children, label, htmlFor, required, icon }) => (
    <div className="space-y-2">
        <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
            {icon && <i className={`fas ${icon} text-slate-400`}></i>}
            {label} {required && <span className="text-red-500">*</span>}
        </label>
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

const RequestForm: React.FC<RequestFormProps> = ({ onSuccess, showToast, existingOrderNumbers, initialVehicle, currentUser, vehicleAnalyticsData, onOpenImagePreview }) => {
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
    const { versionsMap, allPossibleVersions, vehicleLines, getMappedExteriors, getMappedInteriors } = useVehicleConfig();

    // Backlog deposits (Cọc tồn Cyber)
    const [backlogOrders, setBacklogOrders] = useState<any[]>([]);
    const [isBacklogDropdownOpen, setIsBacklogDropdownOpen] = useState(false);
    const [backlogSearch, setBacklogSearch] = useState('');
    const backlogDropdownRef = useRef<HTMLDivElement>(null);

    const [availableExteriors, setAvailableExteriors] = useState<string[]>([]);
    const [availableInteriors, setAvailableInteriors] = useState<string[]>([]);

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

    // Xử lý chọn 1 hợp đồng từ cọc tồn
    const handleSelectBacklogContract = (contract: any) => {
        const cyberCode = (contract.so_hop_dong || contract.so_ct || contract.so_don_hang || '').trim();
        const customerName = (contract.khach_hang || '').trim().toUpperCase();

        setFormData(prev => {
            const next = {
                ...prev,
                ma_hd_cyber: cyberCode,
                ten_khach_hang: customerName || prev.ten_khach_hang,
            };
            // Nếu so_don_hang trong Cyber có định dạng DMS chuẩn thì tự động điền
            if (contract.so_don_hang && /^N[0-9]{5}-[A-Z]{3}-[0-9]{2}-[0-9]{2}-[0-9]{4}$/.test(contract.so_don_hang)) {
                next.so_don_hang = contract.so_don_hang;
            }
            // Điền ngày cọc nếu chưa có
            if (contract.ngay_hop_dong && !prev.ngay_coc) {
                next.ngay_coc = contract.ngay_hop_dong;
            }
            return next;
        });

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

    const inputClass = "w-full pl-4 pr-4 py-3.5 bg-white border border-slate-200 rounded-lg text-base font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/10 transition-all duration-300 shadow-sm hover:border-slate-300";
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
        const val = name === 'ten_khach_hang' ? value.toUpperCase() : value;
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
        if (!pattern.test(formData.so_don_hang)) { showToast('Sai Định Dạng', 'Số đơn hàng không đúng.', 'warning', 4000); return; }
        if (existingOrderNumbers.includes(formData.so_don_hang)) { showToast('Trùng Lặp', 'Số đơn hàng đã tồn tại.', 'error', 4000); return; }
        // [CHỐNG GIAN LẬN]: Chặn cứng khi mã DMS không khớp với 6 ký tự đầu SĐH
        if (initialVehicle && dmsWarning) { showToast('Không Hợp Lệ', 'Mã DMS xe không khớp với Số đơn hàng. Không thể tiếp tục.', 'error', 5000); return; }
        if (!chicFile) { showToast('Thiếu Chứng Từ', 'Vui lòng tải lên UNC.', 'warning', 3000); return; }
        if (!formData.ngay_coc) { showToast('Chờ Xử Lý Ảnh', 'Vui lòng chờ OCR.', 'warning', 3000); return; }

        setIsSubmitting(true);
//         showToast('Đang Gửi', 'Đang xử lý...', 'loading');
        try {
            const requestPayload = {
                ...formData,
                ma_hd_cyber: (formData.ma_hd_cyber || '').trim(),
                ten_khach_hang: (formData.ten_khach_hang || '').trim().toUpperCase(),
                is_flex_match: 'false',
                ngoai_that_flex: '[]',
                noi_that_flex: '[]'
            };
            const result = await apiService.addRequest(requestPayload as any, chicFile);
            if (result.status === "SUCCESS" && result.newRecord) { onSuccess(result.newRecord); handleClearForm(); }
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
        <form onSubmit={handleConfirmSubmit} className="flex flex-col lg:flex-row h-full w-full bg-transparent overflow-hidden gap-0 lg:gap-6 p-0 lg:p-4">

            {/* LEFT PANEL: 3D Studio Background & Car (50%) */}
            <div className="w-full lg:w-[50%] relative order-1 lg:order-1 flex flex-col z-20 hidden md:flex overflow-hidden rounded-l-3xl">
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
            <div className="flex-1 lg:w-[50%] order-2 lg:order-2 bg-white flex flex-col h-full relative z-10 overflow-y-auto rounded-3xl shadow-xl border border-slate-100/50">
                {/* Stepper Header - Compact */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-transparent shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${step >= 1 ? 'bg-accent-primary text-white' : 'bg-slate-100 text-slate-400'}`}>1</div>
                        <div className={`h-0.5 w-12 rounded-full transition-all ${step >= 2 ? 'bg-accent-primary' : 'bg-slate-100'}`}></div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${step >= 2 ? 'bg-accent-primary text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
                    </div>
                    <div>
                        <h3 className="text-[12px] font-extrabold text-slate-900 uppercase tracking-[0.15em]">{step === 1 ? 'Cấu hình xe' : 'Thông tin HĐ'}</h3>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-grow flex flex-col p-6 md:p-8 overflow-y-auto">
                    <div className="flex-grow flex flex-col justify-center w-full relative">

                        {/* STEP 1: Premium Config Grid */}
                        {step === 1 && (
                            <div className="space-y-4 md:space-y-5 animate-fade-in relative z-10">
                                {userBacklogList.length > 0 && !isPreFilled && (
                                    <div className="p-3 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200/80 rounded-xl flex items-center justify-between gap-3 animate-fade-in shadow-2xs">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 shadow-xs">
                                                <i className="fas fa-file-contract"></i>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-800">
                                                    Bạn có <span className="text-blue-600 font-extrabold">{userBacklogList.length}</span> hợp đồng cọc tồn trên Cyber
                                                </p>
                                                <p className="text-[11px] text-slate-500 truncate">
                                                    Chọn hợp đồng cọc tồn để tự động điền mã HĐ, tên KH và ngày cọc
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setStep(2);
                                                setIsBacklogDropdownOpen(true);
                                            }}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors shadow-2xs flex items-center gap-1.5"
                                        >
                                            <i className="fas fa-list-check"></i>
                                            <span>Chọn cọc tồn</span>
                                        </button>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 gap-5 md:gap-6">
                                    <div>
                                        <InputGroup label="Dòng xe (Model)" htmlFor="dong_xe" required>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {vehicleLines.map(model => {
                                                    const isSelected = formData.dong_xe === model;
                                                    return (
                                                        <button
                                                            key={model}
                                                            type="button"
                                                            disabled={isPreFilled}
                                                            onClick={() => handleInputChange({ target: { name: 'dong_xe', value: model } } as any)}
                                                            className={`px-4 py-1.5 rounded-md text-[11px] font-bold tracking-wider uppercase transition-colors duration-300 ${
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
                                        <InputGroup label="Màu ngoại thất (Exterior Color)" htmlFor="ngoai_that" required>
                                            <div className="mt-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center min-h-[46px]">
                                                <span className={`text-[13px] italic ${formData.ngoai_that ? 'text-slate-700' : 'text-slate-400'}`}>
                                                    {formData.ngoai_that || 'Vui lòng chọn vòng màu bên dưới...'}
                                                </span>
                                            </div>
                                        </InputGroup>
                                        <div className="flex flex-wrap gap-2 mt-3 pl-1 min-h-[44px]">
                                            {(formData.phien_ban && availableExteriors.length > 0) ? (
                                                    availableExteriors.map(color => {
                                                        const lower = color.toLowerCase();
                                                        const getHex = (str: string) => {
                                                            if (str.includes('deep ocean')) return '#1a4731'; // Dark green
                                                            if (str.includes('orange') || str.includes('orb')) return '#ea580c';
                                                            if (str.includes('purple') || str.includes('berry')) return '#6b21a8';
                                                            if (str.includes('mint')) return '#a7f3d0';
                                                            if (str.includes('ruby') || str.includes('red') || str.includes('velvet') || str.includes('crimson')) return '#991b1b';
                                                            if (str.includes('blue') || str.includes('azure') || str.includes('ocean')) return '#1d4ed8';
                                                            if (str.includes('black')) return '#111827';
                                                            if (str.includes('gray') || str.includes('grey') || str.includes('silver') || str.includes('neptune')) return '#6b7280';
                                                            if (str.includes('white') || str.includes('blanc') || str.includes('creme')) return '#f8fafc';
                                                            if (str.includes('brown') || str.includes('bronze') || str.includes('bronz')) return '#78350f';
                                                            if (str.includes('green') || str.includes('ivy')) return '#15803d';
                                                            if (str.includes('yellow') || str.includes('champa')) return '#fde047';
                                                            if (str.includes('pink')) return '#f472b6';
                                                            return '#e5e7eb';
                                                        };
                                                        
                                                        let backgroundStyle = '';
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
                                                        } else {
                                                            backgroundStyle = getHex(lower);
                                                        }
                                                        
                                                        const isSelected = formData.ngoai_that === color;
                                                        return (
                                                            <div 
                                                                key={color} 
                                                                onClick={!isPreFilled ? () => handleInputChange({ target: { name: 'ngoai_that', value: color } } as any) : undefined} 
                                                                className={`relative flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-all duration-300 ease-out ${isSelected ? 'ring-2 ring-accent-primary ring-offset-2 scale-110 shadow-md' : 'ring-1 ring-slate-200 hover:ring-slate-300 hover:scale-105 shadow-sm'}`} 
                                                                title={color}
                                                            >
                                                                <div className="w-full h-full rounded-full overflow-hidden relative border border-black/10">
                                                                    <div className="absolute inset-0" style={{ background: backgroundStyle }}></div>
                                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/20 mix-blend-overlay rounded-full"></div>
                                                                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent h-1/2 rounded-t-full"></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="text-[13px] text-slate-400 italic py-1 flex items-center h-8">Vui lòng chọn Phiên bản để xem bảng màu...</div>
                                                )}
                                            </div>
                                    </div>
                                    <div>
                                        <InputGroup label="Màu nội thất (Interior Color)" htmlFor="noi_that" required>
                                            <div className="mt-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center min-h-[46px]">
                                                <span className={`text-[13px] italic ${formData.noi_that ? 'text-slate-700' : 'text-slate-400'}`}>
                                                    {formData.noi_that || 'Vui lòng chọn vòng màu bên dưới...'}
                                                </span>
                                            </div>
                                        </InputGroup>
                                        <div className="flex flex-wrap gap-2 mt-3 pl-1 min-h-[44px]">
                                            {(formData.ngoai_that && availableInteriors.length > 0) ? (
                                                availableInteriors.map(color => {
                                                    const lower = color.toLowerCase();
                                                    const hex = lower.includes('black') ? '#111827' : lower.includes('brown') ? '#92400e' : lower.includes('beige') ? '#e5e5cb' : '#e5e7eb';
                                                    const isSelected = formData.noi_that === color;
                                                    return (
                                                        <div 
                                                            key={color} 
                                                            onClick={!isPreFilled ? () => handleInputChange({ target: { name: 'noi_that', value: color } } as any) : undefined} 
                                                            className={`relative flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-all duration-300 ease-out ${isSelected ? 'ring-2 ring-accent-primary ring-offset-2 scale-110 shadow-md' : 'ring-1 ring-slate-200 hover:ring-slate-300 hover:scale-105 shadow-sm'}`} 
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
                                                <div className="text-[13px] text-slate-400 italic py-1 flex items-center h-8">Vui lòng chọn Ngoại thất để xem bảng màu...</div>
                                            )}
                                        </div>
                                    </div>
                                </div>



                                {warningMessage && warningType && <div className={`p-3 rounded-lg border flex items-center gap-2 text-xs ${warningClasses[warningType]}`}><i className={`fas ${warningType === 'hot' ? 'fa-fire' : 'fa-check-circle'}`}></i><span dangerouslySetInnerHTML={{ __html: warningMessage }}></span></div>}
                            </div>
                        )}

                        {/* STEP 2: Premium Info Grid */}
                        {step === 2 && (
                            <div className="flex flex-col gap-3 md:gap-4 animate-fade-in relative z-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                    {/* MÃ HĐ CYBER (BẮT BUỘC) */}
                                    <div className="relative">
                                        <div className="flex items-center justify-between mb-2">
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
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
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
                                <div className="p-3 md:p-4 bg-slate-50/50 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-inner">
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
                                        <span className="font-medium">Ngày cọc:</span>
                                        <span className={`font-mono font-bold px-2 py-0.5 rounded ${formData.ngay_coc ? 'text-green-600 bg-green-50' : 'text-slate-400 bg-slate-50'}`}>
                                            {formData.ngay_coc ? new Date(formData.ngay_coc).toLocaleDateString('vi-VN') : 'CHƯA NHẬN DIỆN'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 md:px-8 py-5 flex items-center justify-end shrink-0">
                    <div className="flex items-center gap-3">
                        {step === 1 ? (
                            <button
                                type="button"
                                onClick={handleClearForm}
                                className="px-5 py-2.5 border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-full font-semibold text-sm transition-all shadow-xs cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleBackStep}
                                className="px-5 py-2.5 border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-full font-semibold text-sm transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                                <i className="fas fa-arrow-left text-xs"></i>
                                <span>Quay lại</span>
                            </button>
                        )}

                        {step === 1 ? (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-full transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
                            >
                                <span>Tiếp theo</span>
                                <i className="fas fa-arrow-right text-xs"></i>
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-full transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
            />
        </form>
    );
};

export default React.memo(RequestForm);
