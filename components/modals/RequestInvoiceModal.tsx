import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Order } from '../../types';
import SimpleFileUpload from '../ui/SimpleFileUpload';
import './create-request-sheet.css';
import * as apiService from '../../services/apiService';
import { supabase } from '../../services/supabaseClient';
import { checkCyberContractStatus, CheckCyberContractResult } from '../../services/api/stockService';
import { cleanCyberContractCode, checkCustomerNameMatch } from '../../utils/stringUtils';

interface RequestInvoiceModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: (
        order: Order,
        contractFile: File | null,
        proposalFile: File | null,
        policy: string[],
        commission: string,
        vpoint: string,
        aiNote?: string,
        preProcessedPayloads?: any,
        xeXangVin?: string,
        xeXangHang?: string,
        xeXangModel?: string,
        maVc?: string,
        vtlxData?: {
            hangXe?: string;
            soKhung?: string;
            camKetFile?: File | null;
            cavetFile?: File | null;
        }
    ) => Promise<any>;
    stockData?: any[];
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    /** When true, renders inline inside a parent container (no fixed overlay) */
    inline?: boolean;
    /** Mobile-only: ẩn header trùng & thu gọn khoảng cách (Desktop không dùng) */
    compact?: boolean;
    /** Bật/tắt kiểm soát đối soát với VinFast DMS */
    isDmsCompareEnabled?: boolean;
    /** 'create' (mặc định: tạo mới XHĐ) hoặc 'supplement' (bổ sung chứng từ / cập nhật XHĐ) */
    mode?: 'create' | 'supplement';
}

const Stepper: React.FC<{ currentStep: number, hasVinClub?: boolean, compact?: boolean, mode?: 'create' | 'supplement' }> = ({ currentStep, hasVinClub, mode }) => {
    const steps = ["Thông tin & Chứng từ", mode === 'supplement' ? "Xác nhận bổ sung" : "Xác nhận"];
    return (
        <div className="request-step-indicator" aria-label={`Bước ${currentStep} trên 2`}>
            {steps.map((label, index) => {
                const stepNumber = index + 1;
                const isCompleted = stepNumber < currentStep || (stepNumber === 2 && Boolean(hasVinClub));
                const isActive = stepNumber === currentStep && !isCompleted;
                return (
                    <React.Fragment key={stepNumber}>
                        <span data-current={isActive} data-complete={isCompleted} aria-current={isActive ? 'step' : undefined}>
                            <b>{isCompleted ? '✓' : stepNumber}</b>
                            {label}
                        </span>
                        {index < steps.length - 1 && <span className="request-step-line" aria-hidden="true" />}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const formatNumber = (value: string) => {
    const cleanValue = (value || '').replace(/\D/g, '');
    if (!cleanValue) return '';
    const normalized = cleanValue.length > 1 ? cleanValue.replace(/^0+/, '') || '0' : cleanValue;
    return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const getRawValue = (value: string) => (value || '').replace(/\./g, '');

const RequestInvoiceModal: React.FC<RequestInvoiceModalProps> = ({ order, onClose, onConfirm, stockData, showToast, inline = false, compact = false, isDmsCompareEnabled, mode = 'create' }) => {
    const [step, setStep] = useState(1);
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [proposalFile, setProposalFile] = useState<File | null>(null);
    const [vinClubConfirmed, setVinClubConfirmed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);
    const [existingContractUrl, setExistingContractUrl] = useState<string>('');
    const [existingProposalUrl, setExistingProposalUrl] = useState<string>('');
    const [existingCamKetUrl, setExistingCamKetUrl] = useState<string>('');
    const [existingCavetUrl, setExistingCavetUrl] = useState<string>('');
    const [existingAdminNotes, setExistingAdminNotes] = useState<string>('');
    const [policy, setPolicy] = useState<string[]>(() => {
        if (order && order["CHÍNH SÁCH"]) {
            return order["CHÍNH SÁCH"].split('; ').filter(Boolean);
        }
        return [];
    });
    const [commission, setCommission] = useState(() => {
        if (order && (order["Hoa hồng ứng"] || (order as any).hoa_hong_ung)) {
            return formatNumber(String(order["Hoa hồng ứng"] || (order as any).hoa_hong_ung));
        }
        return '';
    });
    const [vpoint, setVpoint] = useState(() => {
        if (order && (order["Điểm Vpoint sử dụng"] || order.vpoint)) {
            return formatNumber(String(order["Điểm Vpoint sử dụng"] || order.vpoint));
        }
        return '0';
    });
    const [xeXangVin, setXeXangVin] = useState('');
    const [xeXangHang, setXeXangHang] = useState('');
    const [xeXangModel, setXeXangModel] = useState('');
    const [vtlxHangXe, setVtlxHangXe] = useState('');
    const [vtlxSoKhung, setVtlxSoKhung] = useState('');
    const [camKetChuyenDoiXanhFile, setCamKetChuyenDoiXanhFile] = useState<File | null>(null);
    const [cavetXeCuFile, setCavetXeCuFile] = useState<File | null>(null);
    const [vtlxVinCheckError, setVtlxVinCheckError] = useState('');
    const [isCheckingVtlxVin, setIsCheckingVtlxVin] = useState(false);
    const [maVc, setMaVc] = useState('');
    const [maHdCyber, setMaHdCyber] = useState<string>(() => {
        return cleanCyberContractCode(order?.["Mã HĐ Cyber"] || order?.ma_hd_cyber || (order as any)?.so_hop_dong || order?.["Số hợp đồng"] || '');
    });
    const [vinCheckError, setVinCheckError] = useState('');
    const [isCheckingVin, setIsCheckingVin] = useState(false);

    useEffect(() => {
        const orderNo = (order?.["Số đơn hàng"] || (order as any)?.so_don_hang || '').trim();
        if (!orderNo) return;
        supabase.from('yeucauxhd').select('*').eq('so_don_hang', orderNo).maybeSingle().then(({ data }) => {
            if (data) {
                if (data.url_hop_dong) setExistingContractUrl(data.url_hop_dong);
                if (data.url_de_nghi_xhd) setExistingProposalUrl(data.url_de_nghi_xhd);
                if (data.url_cam_ket_vtlx) setExistingCamKetUrl(data.url_cam_ket_vtlx);
                if (data.url_cavet_vtlx) setExistingCavetUrl(data.url_cavet_vtlx);
                if (data.ghi_chu_admin) setExistingAdminNotes(data.ghi_chu_admin);
                if (mode === 'supplement') {
                    if ((!policy || policy.length === 0) && data.chinh_sach) {
                        setPolicy(data.chinh_sach.split('; ').map((s: string) => s.trim()).filter(Boolean));
                    }
                    if (!commission && data.hoa_hong_ung) setCommission(formatNumber(String(data.hoa_hong_ung)));
                    if ((!vpoint || vpoint === '0') && data.vpoint) setVpoint(formatNumber(String(data.vpoint)));
                    if (!maVc && data.ma_vc) setMaVc(data.ma_vc);
                    if (!xeXangVin && data.xe_xang_vin) setXeXangVin(data.xe_xang_vin);
                    if (!xeXangHang && data.xe_xang_hang) setXeXangHang(data.xe_xang_hang);
                    if (!xeXangModel && data.xe_xang_model) setXeXangModel(data.xe_xang_model);
                    if (!vtlxHangXe && data.vtlx_hang_xe) setVtlxHangXe(data.vtlx_hang_xe);
                    if (!vtlxSoKhung && data.vtlx_so_khung) setVtlxSoKhung(data.vtlx_so_khung);
                }
            }
        }, (err: any) => console.warn('Lỗi tải yeucauxhd:', err));
    }, [order?.["Số đơn hàng"], mode]);

    const parsedSupplementRequirements = useMemo(() => {
        if (mode !== 'supplement') return null;
        const notes = (order?.["Ghi chú Admin"] || (order as any)?.ghi_chu_admin || existingAdminNotes || '').toString();
        const match = notes.match(/\[MỤC CẦN (?:BỔ SUNG|SCAN LẠI):\s*([^\]]+)\]/i);
        const isRescan = notes.includes('[YÊU CẦU SCAN LẠI]') || notes.toLowerCase().includes('scan lại');

        if (!match) {
            const lower = notes.toLowerCase();
            const hasKeyword = lower.includes('hợp đồng') || lower.includes('chính sách') || lower.includes('hoa hồng') || lower.includes('đề nghị') || lower.includes('vpoint') || lower.includes('voucher') || lower.includes('vtlx');
            const cleanReason = notes.replace(/\[YÊU CẦU SCAN LẠI\]:\s*/gi, '').trim();
            if (!hasKeyword) {
                return {
                    hdmb: true,
                    dnxhd: true,
                    chinh_sach: false,
                    hoa_hong: false,
                    vpoint: false,
                    ma_vc: false,
                    xe_xang: false,
                    vtlx: false,
                    hasTag: false,
                    isRescan,
                    cleanReason
                };
            }
            return {
                hdmb: lower.includes('hợp đồng') || lower.includes('hdmb'),
                dnxhd: lower.includes('đề nghị') || lower.includes('dnxhd') || lower.includes('xhd'),
                chinh_sach: lower.includes('chính sách') || lower.includes('csbh'),
                hoa_hong: lower.includes('hoa hồng'),
                vpoint: lower.includes('vpoint'),
                ma_vc: lower.includes('voucher') || lower.includes('ma vc'),
                xe_xang: lower.includes('xe xăng') || lower.includes('thu cũ'),
                vtlx: lower.includes('vtlx') || lower.includes('tương lai xanh'),
                hasTag: false,
                isRescan,
                cleanReason
            };
        }
        const rawTags = match[1].toUpperCase();
        const cleanReason = notes
            .replace(/\[YÊU CẦU SCAN LẠI\]:\s*/gi, '')
            .replace(match[0], '')
            .trim();
        const lowerReason = cleanReason.toLowerCase();
        const hasCamKetKeyword = lowerReason.includes('cam kết') || lowerReason.includes('cà vẹt') || lowerReason.includes('vtlx');
        return {
            hdmb: rawTags.includes('HDMB') || lowerReason.includes('hợp đồng') || lowerReason.includes('hdmb'),
            dnxhd: rawTags.includes('DNXHD') || lowerReason.includes('đề nghị') || lowerReason.includes('dnxhd'),
            chinh_sach: rawTags.includes('CHINH_SACH'),
            hoa_hong: rawTags.includes('HOA_HONG'),
            vpoint: rawTags.includes('VPOINT'),
            ma_vc: rawTags.includes('MA_VC'),
            xe_xang: rawTags.includes('XE_XANG'),
            vtlx: rawTags.includes('VTLX') || hasCamKetKeyword,
            hasTag: true,
            isRescan,
            cleanReason
        };
    }, [mode, order?.["Ghi chú Admin"], (order as any)?.ghi_chu_admin, existingAdminNotes]);

    // Cyber contract status warning & Step 3 check
    const [isValidatingContract, setIsValidatingContract] = useState(false);
    const [contractWarning, setContractWarning] = useState<CheckCyberContractResult | null>(null);
    const [cyberContractStatus, setCyberContractStatus] = useState<CheckCyberContractResult | null>(null);
    const [isCheckingCyberContract, setIsCheckingCyberContract] = useState(false);

    // DMS Verification (Đối soát cấu hình VinFast DMS trước khi xuất hóa đơn)
    const [dmsVerification, setDmsVerification] = useState<{
        status: 'idle' | 'checking' | 'valid' | 'invalid';
        message?: string;
        details?: any;
        errorType?: 'customer' | 'model' | 'version' | 'exterior' | 'interior' | 'invoiced' | 'canceled' | 'not_found' | 'general';
        expectedVal?: string;
        dmsVal?: string;
    }>({ status: 'idle' });
    const [isCheckingDms, setIsCheckingDms] = useState(false);
    const prevDmsStatusRef = useRef<string>('');
    const prevCyberApprovedRef = useRef<boolean>(false);

    // Trạng thái Bật/Tắt kiểm soát đối soát DMS từ Admin
    const [isDmsEnabled, setIsDmsEnabled] = useState<boolean>(() => {
        if (typeof isDmsCompareEnabled === 'boolean') return isDmsCompareEnabled;
        const saved = localStorage.getItem('dms_compare_xhd_enabled');
        return saved !== 'false';
    });

    useEffect(() => {
        if (typeof isDmsCompareEnabled === 'boolean') {
            setIsDmsEnabled(isDmsCompareEnabled);
        }
    }, [isDmsCompareEnabled]);

    useEffect(() => {
        if (typeof isDmsCompareEnabled === 'boolean') return;
        apiService.getAppSetting('dms_compare_xhd_visibility').then((res: any) => {
            if (res && res.status === 'SUCCESS' && res.data) {
                const enabled = res.data.isEnabled !== false;
                setIsDmsEnabled(enabled);
                localStorage.setItem('dms_compare_xhd_enabled', String(enabled));
            }
        }).catch(() => { });
    }, [isDmsCompareEnabled]);

    const [matchedCar, setMatchedCar] = useState<any>(() => {
        return stockData?.find((v: any) => v.VIN === order?.VIN) || null;
    });

    const expectedConfig = useMemo(() => {
        const car = matchedCar || stockData?.find((v: any) => v.VIN === order.VIN);
        return {
            dong_xe: car?.['Dòng xe'] || order['Dòng xe'] || (order as any).dong_xe || '',
            phien_ban: car?.['Phiên bản'] || order['Phiên bản'] || (order as any).phien_ban || '',
            ma_phien_ban: car?.['Mã phiên bản'] || car?.ma_phien_ban || '',
            ngoai_that: car?.['Màu ngoại thất'] || car?.['Ngoại thất'] || order['Ngoại thất'] || (order as any).ngoai_that || '',
            noi_that: car?.['Màu nội thất'] || car?.['Nội thất'] || order['Nội thất'] || (order as any).noi_that || '',
        };
    }, [stockData, order, matchedCar]);

    const isWholesaleDeposit = (policyInput?: any): boolean => {
        if (!policyInput) return false;
        const str = Array.isArray(policyInput) ? policyInput.join(' ') : String(policyInput);
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd')
            .includes('coc si');
    };

    const recheckDmsVerification = async (isManualClick = false) => {
        // Nếu Admin đã tắt kiểm soát đối soát DMS khi gửi XHĐ
        if (!isDmsEnabled) {
            setDmsVerification({
                status: 'valid',
                message: 'Admin đã tắt kiểm soát DMS: Miễn đối soát cấu hình DMS khi gửi XHĐ.'
            });
            setIsCheckingDms(false);
            if (isManualClick) {
                showToast('Kiểm soát DMS đang tắt', 'Admin đã tạm tắt kiểm soát so sánh DMS. TVBH có thể gửi XHĐ bình thường.', 'info', 3000);
            }
            return;
        }

        const orderNo = order["Số đơn hàng"] || (order as any).so_don_hang;
        if (!orderNo) {
            setDmsVerification({ status: 'invalid', message: 'Đơn hàng chưa có Số đơn hàng (VSO).' });
            return;
        }

        // Riêng đơn hàng nào chọn CS Cọc sỉ thì không cần tra so sánh DMS
        const rawPolicies = [
            ...(Array.isArray(policy) ? policy : [policy]),
            order?.["Chính sách"] || (order as any)?.chinh_sach || ''
        ].filter(Boolean).join(' ');

        if (isWholesaleDeposit(rawPolicies)) {
            setDmsVerification({
                status: 'valid',
                message: 'Chính sách Cọc sỉ: Miễn đối soát cấu hình DMS.'
            });
            setIsCheckingDms(false);
            if (isManualClick) {
                showToast('Chính sách Cọc sỉ', 'Đơn hàng chọn chính sách Cọc sỉ: Miễn đối soát cấu hình DMS.', 'info', 3000);
            }
            return;
        }

        if (isManualClick) {
            showToast('Đang đối soát DMS...', 'Đang kiểm tra đối soát cấu hình thực tế với VinFast DMS...', 'info', 2000);
        }

        // TÌM XE THỰC TẾ TRONG KHO THEO SỐ VIN ĐÃ GHÉP (ƯU TIÊN KHOXE -> THONGTINXE)
        let car = matchedCar || stockData?.find((v: any) => v.VIN === order.VIN);
        const hasValidMatCode = (val?: string) => {
            const code = String(val || '').trim().toUpperCase();
            return code.length >= 4 && code.length <= 6 && /[A-Z]/.test(code) && /[0-9]/.test(code) && !['MPV7', 'BCO2', 'BCO3'].includes(code);
        };
        if (order.VIN && (!car || !hasValidMatCode(car.ma_phien_ban || car['Mã phiên bản']))) {
            try {
                const { data: dbCar } = await supabase.from('khoxe').select('*').ilike('vin', order.VIN.trim()).maybeSingle();
                let resolvedMaPb = (dbCar?.ma_phien_ban || '').trim();
                if (!hasValidMatCode(resolvedMaPb)) {
                    const { data: ttCar } = await supabase.from('thongtinxe').select('*').ilike('vin', order.VIN.trim()).maybeSingle();
                    if (ttCar) {
                        const ttPb = (ttCar.ma_phien_ban || ttCar.phien_ban || '').trim();
                        if (hasValidMatCode(ttPb)) {
                            resolvedMaPb = ttPb;
                        }
                        if (!car && !dbCar) {
                            car = {
                                VIN: ttCar.vin,
                                'Dòng xe': ttCar.mo_ta,
                                'Phiên bản': ttCar.phien_ban,
                                'Ngoại thất': ttCar.ngoai_that,
                                'Nội thất': ttCar.noi_that,
                                'Mã phiên bản': resolvedMaPb || ttCar.phien_ban,
                                ma_phien_ban: resolvedMaPb || ttCar.phien_ban,
                                so_may: ttCar.so_may
                            };
                        }
                    }
                }
                if (dbCar) {
                    car = {
                        ...(car || {}),
                        VIN: dbCar.vin,
                        'Dòng xe': dbCar.dong_xe || car?.['Dòng xe'],
                        'Phiên bản': dbCar.phien_ban || car?.['Phiên bản'],
                        'Ngoại thất': dbCar.ngoai_that || car?.['Ngoại thất'],
                        'Nội thất': dbCar.noi_that || car?.['Nội thất'],
                        'Mã phiên bản': resolvedMaPb || dbCar.ma_phien_ban || car?.['Mã phiên bản'],
                        ma_phien_ban: resolvedMaPb || dbCar.ma_phien_ban || car?.ma_phien_ban,
                        so_may: dbCar.so_may || car?.so_may
                    };
                } else if (car && resolvedMaPb) {
                    car = {
                        ...car,
                        'Mã phiên bản': resolvedMaPb,
                        ma_phien_ban: resolvedMaPb
                    };
                }
                if (car) setMatchedCar(car);
            } catch (carErr) {
                console.warn('[RequestInvoiceModal] Lỗi tìm xe khoxe/thongtinxe:', carErr);
            }
        }

        // ĐỐI SOÁT TRỰC TIẾP GIỮA XE GHÉP (VIN) & TÊN KHÁCH HÀNG VỚI VSO TRÊN VINFAST DMS
        setIsCheckingDms(true);
        setDmsVerification(prev => prev.status === 'invalid' ? prev : { status: 'checking', message: 'Đang đối soát cấu hình giữa VIN xe và VSO trên VinFast DMS...' });
        try {
            const targetConfig = car ? {
                dong_xe: car['Dòng xe'] || car.dong_xe,
                phien_ban: car['Phiên bản'] || car.phien_ban,
                ma_phien_ban: car.ma_phien_ban || car['Mã phiên bản'] || '',
                ngoai_that: car['Ngoại thất'] || car['Màu ngoại thất'] || car.ngoai_that,
                noi_that: car['Nội thất'] || car['Màu nội thất'] || car.noi_that,
                ten_khach_hang: order["Tên khách hàng"]
            } : {
                ...expectedConfig,
                ten_khach_hang: order["Tên khách hàng"]
            };

            const res = await apiService.verifyDmsVso(orderNo, targetConfig, true);
            if (res.isValid) {
                const ordCustomer = (order["Tên khách hàng"] || '').trim();
                setDmsVerification({
                    status: 'valid',
                    message: order.VIN
                        ? `Khớp 100% cấu hình & Tên khách hàng (${ordCustomer}) giữa VIN xe (${order.VIN}) và VSO (${orderNo}) trên DMS!`
                        : 'Khớp 100% giữa Đơn hàng và VSO trên DMS',
                    details: res.details
                });
                if (isManualClick) {
                    showToast('Khớp 100% DMS', 'Cấu hình xe khớp hoàn toàn với VSO trên VinFast DMS.', 'success', 3000);
                }
                prevDmsStatusRef.current = 'valid';
            } else {
                setDmsVerification({
                    status: 'invalid',
                    errorType: res.errorType || 'general',
                    expectedVal: res.expectedVal,
                    dmsVal: res.dmsVal,
                    message: res.reason || 'Cấu hình xe không khớp với VSO trên VinFast DMS.',
                    details: res.details
                });
                prevDmsStatusRef.current = 'invalid';
                if (isManualClick) {
                    showToast('Chưa khớp DMS', res.reason || 'Cấu hình xe chưa khớp với VSO trên VinFast DMS.', 'warning', 3500);
                }
            }
        } catch (err: any) {
            setDmsVerification({
                status: 'invalid',
                message: err.message || 'Lỗi khi kết nối hệ thống kiểm tra DMS.'
            });
            prevDmsStatusRef.current = 'invalid';
            if (isManualClick) {
                showToast('Lỗi kiểm tra DMS', err.message || 'Lỗi khi kết nối hệ thống kiểm tra DMS.', 'error', 3000);
            }
        } finally {
            setIsCheckingDms(false);
        }
    };

    const checkedKeyRef = useRef<string>('');
    const orderNoStr = (order?.["Số đơn hàng"] || (order as any)?.so_don_hang || '').trim();
    const orderVinStr = (order?.VIN || '').trim();
    const currentKey = `${orderNoStr}_${orderVinStr}`;

    useEffect(() => {
        if (mode === 'supplement') return; // Không tra soát đối soát lại khi ở luồng bổ sung
        if (!orderNoStr) return;
        if (checkedKeyRef.current === currentKey) return;
        checkedKeyRef.current = currentKey;
        recheckDmsVerification();
        recheckCyberContract();
    }, [orderNoStr, orderVinStr, mode]);

    const recheckCyberContract = async (isManualClick = false) => {
        setIsCheckingCyberContract(true);
        if (isManualClick) {
            showToast('Đang tra cứu Cyber...', 'Đang kết nối kiểm tra dữ liệu hợp đồng mới nhất trên CyberSoft...', 'info', 2000);
        }
        try {
            const contractCode = (maHdCyber || order?.["Mã HĐ Cyber"] || order?.ma_hd_cyber || (order as any)?.so_hop_dong || order?.["Số hợp đồng"] || '').trim();
            const res = await checkCyberContractStatus({
                so_ct: contractCode,
                customer_name: order["Tên khách hàng"],
                tvbh_name: order["Tên tư vấn bán hàng"],
                vin: order.VIN,
                order_no: order["Số đơn hàng"]
            });
            setCyberContractStatus(res);
            if (isManualClick) {
                if (res.found && res.is_approved) {
                    showToast('Hợp đồng đã duyệt!', `HĐ ${res.so_ct || contractCode} trên CyberSoft đã được phê duyệt.`, 'success', 3500);
                } else if (res.found && !res.is_approved) {
                    showToast('HĐ Cyber chưa duyệt', `HĐ ${res.so_ct || contractCode} hiện vẫn đang chờ duyệt (${res.ten_post || 'chưa duyệt'}).`, 'warning', 3500);
                } else {
                    showToast('Chưa có HĐ trên Cyber', `Chưa tìm thấy hợp đồng ${contractCode || ''} của khách hàng trên hệ thống CyberSoft.`, 'error', 3500);
                }
            }
            prevCyberApprovedRef.current = res.found ? res.is_approved : false;
        } catch (err) {
            console.error("Lỗi tra cứu hợp đồng Cyber:", err);
            setCyberContractStatus({
                success: false,
                found: false,
                is_approved: false,
                error: 'Không thể kết nối máy chủ đối soát hợp đồng'
            });
            if (isManualClick) {
                showToast('Lỗi kết nối Cyber', 'Không thể kết nối máy chủ CyberSoft. Vui lòng thử lại sau giây lát.', 'error', 3000);
            }
        } finally {
            setIsCheckingCyberContract(false);
        }
    };


    useEffect(() => {
        const existing = (order?.["Mã HĐ Cyber"] || order?.ma_hd_cyber || (order as any)?.so_hop_dong || order?.["Số hợp đồng"] || '').trim();
        if (existing) {
            setMaHdCyber(existing);
            return;
        }

        // Tự động tìm Mã HĐ Cyber nếu đơn hàng chưa có
        const autoResolveCyberContract = async () => {
            try {
                const custName = (order?.["Tên khách hàng"] || '').trim();
                if (custName) {
                    const { data: tonData } = await supabase
                        .from('donhang_ton')
                        .select('so_hop_dong, khach_hang')
                        .ilike('khach_hang', `%${custName}%`)
                        .limit(1);

                    if (tonData && tonData.length > 0 && tonData[0].so_hop_dong) {
                        setMaHdCyber(cleanCyberContractCode(tonData[0].so_hop_dong));
                        return;
                    }
                }
            } catch (e) {
                console.error("Lỗi tra cứu cọc tồn cho HĐ Cyber:", e);
            }
        };

        if (order) {
            autoResolveCyberContract();
        }
    }, [order?.["Tên khách hàng"], order?.["Số đơn hàng"]]);

    useEffect(() => {
        if (mode === 'supplement') return;
        if (step === 2 && !cyberContractStatus && !isCheckingCyberContract) {
            recheckCyberContract();
        }
    }, [step, mode]);

    useEffect(() => {
        if (cyberContractStatus?.so_ct && !maHdCyber) {
            setMaHdCyber(cyberContractStatus.so_ct.trim());
        }
    }, [cyberContractStatus?.so_ct]);

    useEffect(() => {
        if (isWholesaleDeposit(policy)) {
            setDmsVerification({
                status: 'valid',
                message: 'Chính sách Cọc sỉ: Miễn đối soát cấu hình DMS.'
            });
            setIsCheckingDms(false);
        }
    }, [policy]);

    // Background tracking for Google Drive
    const [capturedImages, setCapturedImages] = useState<any[]>([]);
    const [fileOrigins, setFileOrigins] = useState<number[]>([]);

    const [salesPoliciesOptions, setSalesPoliciesOptions] = useState<{ ten_chinh_sach: string, dong_xe: string }[]>([]);
    const [isLoadingPolicies, setIsLoadingPolicies] = useState(true);

    useEffect(() => {
        const fetchPolicies = async () => {
            try {
                setIsLoadingPolicies(true);
                const result = await apiService.getSalesPolicies();
                if (result.status === 'SUCCESS' && Array.isArray(result.data)) {
                    setSalesPoliciesOptions(result.data);
                } else {
                    setSalesPoliciesOptions([]);
                }
            } catch (error) {
                setSalesPoliciesOptions([]);
            } finally {
                setIsLoadingPolicies(false);
            }
        };
        fetchPolicies();
    }, []);

    const filteredSalesPolicies = useMemo(() => {
        const orderPolicies = (order && order["CHÍNH SÁCH"])
            ? order["CHÍNH SÁCH"].split('; ').map(s => s.trim()).filter(Boolean)
            : [];

        const allValidFromDb = salesPoliciesOptions
            .map(p => typeof p === 'string' ? (p as string).trim() : (p?.ten_chinh_sach || '').trim())
            .filter(Boolean);

        if (!order || !order["Dòng xe"] || salesPoliciesOptions.length === 0) {
            return [...new Set([...orderPolicies, ...allValidFromDb])].sort();
        }

        const rawCarModel = (order["Dòng xe"] || '').toLowerCase().replace(/\s+/g, '');
        const rawVersion = (order["Phiên bản"] || '').toLowerCase().replace(/\s+/g, '');

        // Bảng tra cứu tất cả các mẫu xe VinFast & biệt danh (Nerio, Herio, Sherio, v.v.)
        const carModelAliases: Record<string, string[]> = {
            vf2: ['vf2', 'vf 2'],
            vf3: ['vf3', 'vf 3', 'nerio'],
            vf5: ['vf5', 'vf 5', 'herio'],
            vfe34: ['vfe34', 'vf e34', 'e34'],
            vf6: ['vf6', 'vf 6', 'shero'],
            vf7: ['vf7', 'vf 7'],
            vf8: ['vf8', 'vf 8'],
            vf9: ['vf9', 'vf 9'],
            fadil: ['fadil'],
            luxa: ['luxa', 'lux a'],
            luxsa: ['luxsa', 'lux sa'],
            ec300: ['ec300', 'ec 300'],
            limo: ['limo']
        };

        // Tìm key dòng xe hiện tại của đơn hàng (ví dụ: 'vf5')
        let orderModelKey = '';
        for (const [key, aliases] of Object.entries(carModelAliases)) {
            if (aliases.some(alias => rawCarModel.includes(alias.replace(/\s+/g, '')))) {
                orderModelKey = key;
                break;
            }
        }
        if (!orderModelKey) orderModelKey = rawCarModel;

        const matchedFromDb = salesPoliciesOptions.map(p => {
            const name = typeof p === 'string' ? (p as string).trim() : (p?.ten_chinh_sach || '').trim();
            const dongXe = typeof p === 'string' ? '' : (p?.dong_xe || '').trim();
            return { name, dongXe };
        }).filter(item => item.name !== '').filter(item => {
            const nameLower = item.name.toLowerCase();
            const dongXeLower = item.dongXe.toLowerCase();
            const combinedText = `${nameLower} ${dongXeLower}`;

            // 1. Kiểm tra nếu có trường dongXe cụ thể trong DB
            if (item.dongXe) {
                const dongXeList = item.dongXe.toLowerCase().split(',').map(s => s.trim().replace(/\s+/g, ''));
                if (dongXeList.some(dx => dx === 'tatca' || dx === 'all' || dx.includes('tấtcả'))) return true;
                const matchesDbDongXe = dongXeList.some(dx => {
                    const modelAliases = carModelAliases[orderModelKey] || [orderModelKey];
                    return modelAliases.some(alias => dx.includes(alias.replace(/\s+/g, '')) || alias.replace(/\s+/g, '').includes(dx));
                });
                if (!matchesDbDongXe) return false;
            }

            // 2. Kiểm tra xem tên chính sách có đề cập đến bất kỳ dòng xe nào khác trong hệ thống không
            const mentionedModelKeys: string[] = [];
            for (const [key, aliases] of Object.entries(carModelAliases)) {
                const isMentioned = aliases.some(alias => {
                    const cleanAlias = alias.replace(/\s+/g, '');
                    return combinedText.includes(alias) || combinedText.replace(/\s+/g, '').includes(cleanAlias);
                });
                if (isMentioned) {
                    mentionedModelKeys.push(key);
                }
            }

            // Nếu chính sách đề cập đến dòng xe cụ thể:
            if (mentionedModelKeys.length > 0) {
                // Nếu không khớp với dòng xe đơn hàng hiện tại -> LOẠI BỎ NGAY!
                if (!mentionedModelKeys.includes(orderModelKey)) {
                    return false;
                }
            }

            // 3. Kiểm tra lọc theo phiên bản xe (Plus vs Eco, 1 cầu vs 2 cầu)
            if (combinedText.includes('2 cầu') && (orderModelKey === 'vf5' || orderModelKey === 'vf3' || rawVersion.includes('1cầu') || rawVersion.includes('1cau'))) {
                return false; // VF5/VF3 không có 2 cầu
            }

            if (combinedText.includes('[eco') && rawVersion.includes('plus')) {
                if (!combinedText.includes('plus')) {
                    return false;
                }
            }

            if (combinedText.includes('[plus') && rawVersion.includes('eco')) {
                if (!combinedText.includes('eco')) {
                    return false;
                }
            }

            return true;
        }).map(item => item.name);

        const result = [...new Set([...orderPolicies, ...matchedFromDb])].filter(Boolean);

        return result.sort();
    }, [order, salesPoliciesOptions]);

    useEffect(() => {
        // Clean up any empty policy strings
        setPolicy(currentSelection => currentSelection.filter(p => p && p.trim() !== ''));
    }, []);

    const [processingStage, setProcessingStage] = useState(0);

    const handleNumberChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setter(formatNumber(e.target.value));
    };

    const isGasToElectricPolicy = useMemo(() => {
        return policy.some(p => {
            const low = p.toLowerCase();
            return (low.includes('xăng') && low.includes('điện')) ||
                low.includes('thu cũ đổi mới');
        });
    }, [policy]);

    const isVtlxPolicy = useMemo(() => {
        return policy.some(p => {
            const up = p.toUpperCase();
            const low = p.toLowerCase();
            return up.includes('VTLX') || low.includes('vì tương lai xanh') || low.includes('vi tuong lai xanh');
        });
    }, [policy]);

    const isVinFastGasCarAppreciationPolicy = useMemo(() => {
        const targetPolicies = [
            'Tri ân khách hàng xe xăng [Fadil] - 30Tr',
            'Tri ân khách hàng xe xăng [Lux A] - 60Tr',
            'Tri ân khách hàng xe xăng [Lux SA] - 80Tr'
        ];
        return policy.some(p => targetPolicies.some(target => p.includes(target)));
    }, [policy]);

    const isVtlxRequested = Boolean(
        parsedSupplementRequirements?.vtlx ||
        (parsedSupplementRequirements?.xe_xang && isVtlxPolicy) ||
        parsedSupplementRequirements?.cleanReason?.toLowerCase().includes('cam kết') ||
        parsedSupplementRequirements?.cleanReason?.toLowerCase().includes('cà vẹt') ||
        parsedSupplementRequirements?.cleanReason?.toLowerCase().includes('vtlx')
    );
    const isXeXangRequested = Boolean(
        parsedSupplementRequirements?.xe_xang ||
        (!isVtlxPolicy && (
            parsedSupplementRequirements?.cleanReason?.toLowerCase().includes('xe xăng') ||
            parsedSupplementRequirements?.cleanReason?.toLowerCase().includes('thu cũ')
        ))
    );

    const showPolicyCol = mode !== 'supplement' || Boolean(parsedSupplementRequirements?.chinh_sach);
    const showHoaHong = mode !== 'supplement' || Boolean(parsedSupplementRequirements?.hoa_hong);
    const showVpoint = mode !== 'supplement' || Boolean(parsedSupplementRequirements?.vpoint);
    const showMaVc = mode === 'supplement' ? Boolean(parsedSupplementRequirements?.ma_vc) : isVinFastGasCarAppreciationPolicy;
    const showXeXang = mode === 'supplement' ? (isXeXangRequested && !isVtlxPolicy) : isGasToElectricPolicy;
    const showVtlx = mode === 'supplement' ? (isVtlxRequested || (isXeXangRequested && isVtlxPolicy)) : isVtlxPolicy;
    const showHdmb = mode !== 'supplement' || Boolean(parsedSupplementRequirements?.hdmb);
    const showDnxhd = mode !== 'supplement' || Boolean(parsedSupplementRequirements?.dnxhd);

    const hasAnyField = showPolicyCol || showHoaHong || showVpoint || showMaVc || showXeXang || showVtlx || showHdmb || showDnxhd;
    const effectiveShowHdmb = showHdmb || !hasAnyField;
    const effectiveShowDnxhd = showDnxhd || !hasAnyField;
    const showDocsSection = effectiveShowHdmb || effectiveShowDnxhd;
    const showFinanceRow = showHoaHong || showVpoint;

    useEffect(() => {
        if (!isGasToElectricPolicy || !xeXangVin.trim()) {
            setVinCheckError('');
            return;
        }

        const currentOrderNo = (order?.["Số đơn hàng"] || (order as any)?.so_don_hang || '').trim();
        const timeoutId = setTimeout(async () => {
            try {
                setIsCheckingVin(true);
                setVinCheckError('');
                const cleanGasVin = xeXangVin.trim().toUpperCase();

                let queryY = apiService.supabase.from('yeucauxhd')
                    .select('xe_xang_vin, so_don_hang')
                    .ilike('xe_xang_vin', cleanGasVin);
                if (currentOrderNo) {
                    queryY = queryY.neq('so_don_hang', currentOrderNo);
                }
                const { data: existingGasCar } = await queryY;

                let queryA = apiService.supabase.from('archived_orders')
                    .select('xe_xang_vin, so_don_hang')
                    .ilike('xe_xang_vin', cleanGasVin);
                if (currentOrderNo) {
                    queryA = queryA.neq('so_don_hang', currentOrderNo);
                }
                const { data: existingArchivedGasCar } = await queryA;

                const conflictY = (existingGasCar || []).find(r => r.so_don_hang && r.so_don_hang.trim() !== currentOrderNo);
                const conflictA = (existingArchivedGasCar || []).find(r => r.so_don_hang && r.so_don_hang.trim() !== currentOrderNo);
                const matched = conflictY || conflictA;

                if (matched) {
                    setVinCheckError(`Xe xăng có số VIN ${cleanGasVin} đã được sử dụng trong yêu cầu ${matched.so_don_hang}.`);
                }
            } catch (err) {
                console.error('Error checking duplicate old gas car VIN:', err);
            } finally {
                setIsCheckingVin(false);
            }
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [xeXangVin, isGasToElectricPolicy, order?.["Số đơn hàng"]]);

    useEffect(() => {
        if (!isVtlxPolicy || !vtlxSoKhung.trim()) {
            setVtlxVinCheckError('');
            return;
        }

        const currentOrderNo = (order?.["Số đơn hàng"] || (order as any)?.so_don_hang || '').trim();
        const timeoutId = setTimeout(async () => {
            try {
                setIsCheckingVtlxVin(true);
                setVtlxVinCheckError('');
                const cleanVin = vtlxSoKhung.trim().toUpperCase();

                let queryY = apiService.supabase.from('yeucauxhd')
                    .select('vtlx_so_khung, xe_xang_vin, so_don_hang')
                    .or(`vtlx_so_khung.ilike.${cleanVin},xe_xang_vin.ilike.${cleanVin}`);
                if (currentOrderNo) {
                    queryY = queryY.neq('so_don_hang', currentOrderNo);
                }
                const { data: existingY } = await queryY;

                let queryA = apiService.supabase.from('archived_orders')
                    .select('vtlx_so_khung, xe_xang_vin, so_don_hang')
                    .or(`vtlx_so_khung.ilike.${cleanVin},xe_xang_vin.ilike.${cleanVin}`);
                if (currentOrderNo) {
                    queryA = queryA.neq('so_don_hang', currentOrderNo);
                }
                const { data: existingA } = await queryA;

                const conflictY = (existingY || []).find(r => r.so_don_hang && r.so_don_hang.trim() !== currentOrderNo);
                const conflictA = (existingA || []).find(r => r.so_don_hang && r.so_don_hang.trim() !== currentOrderNo);
                const matched = conflictY || conflictA;

                if (matched) {
                    setVtlxVinCheckError(`Số khung ${cleanVin} đã được sử dụng trong yêu cầu ${matched.so_don_hang}.`);
                }
            } catch (err) {
                console.error('Error checking duplicate VTLX VIN:', err);
            } finally {
                setIsCheckingVtlxVin(false);
            }
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [vtlxSoKhung, isVtlxPolicy, order?.["Số đơn hàng"]]);

    const rawCommission = getRawValue(commission);
    const rawVpoint = getRawValue(vpoint);
    const isCommissionValid = rawCommission === '' || (!isNaN(Number(rawCommission)) && Number(rawCommission) >= 0);
    const isVpointValid = rawVpoint === '' || (!isNaN(Number(rawVpoint)) && Number(rawVpoint) >= 0);

    // Kiểm tra hợp lệ cấu hình DMS và CyberSoft (Chặn không cho tiếp tục nếu có lỗi)
    const car = matchedCar || stockData?.find((v: any) => v.VIN === order.VIN);
    const carExtCode = car ? (apiService.getExteriorColorCode(car['Ngoại thất'] || car['Màu ngoại thất'] || '') || (car as any).ma_mau) : '';
    const carIntCode = car ? (apiService.getInteriorColorCode(car['Nội thất'] || car['Màu nội thất'] || '') || (car as any).ma_noi_that) : '';
    const carModelCode = car ? apiService.getModelCode(car['Dòng xe'] || '') : '';

    const cyberExtCode = (cyberContractStatus?.ma_mau || '').trim().toUpperCase();
    const cyberIntCode = (cyberContractStatus?.ma_mau_nt || '').trim().toUpperCase();
    const cyberModelCode = apiService.getModelCode(cyberContractStatus?.ten_kx || cyberContractStatus?.ma_kx || '');

    const hasCyberMismatch = Boolean(car && cyberContractStatus?.found && (
        (carModelCode && cyberModelCode && carModelCode !== cyberModelCode) ||
        (carExtCode && cyberExtCode && !apiService.compareExteriorColorCodes(carExtCode, cyberExtCode)) ||
        (carIntCode && cyberIntCode && !apiService.compareInteriorColorCodes(carIntCode, cyberIntCode))
    ));

    const isDmsValid = !isDmsEnabled || dmsVerification.status !== 'invalid';
    const isVerificationBlocked = mode === 'supplement' ? false : (!isDmsValid || hasCyberMismatch || (cyberContractStatus && !cyberContractStatus.is_approved));

    const isSupplementMode = mode === 'supplement';
    const hasContract = Boolean(contractFile || existingContractUrl);
    const hasProposal = Boolean(proposalFile || existingProposalUrl);
    const isVtlxInfoValid = !showVtlx || (
        isSupplementMode
            ? (!vtlxVinCheckError)
            : (vtlxHangXe.trim() !== '' && vtlxSoKhung.trim() !== '' && !vtlxVinCheckError)
    );
    const isVtlxDocsValid = !showVtlx || (
        isSupplementMode
            ? Boolean(camKetChuyenDoiXanhFile || cavetXeCuFile || existingCamKetUrl || existingCavetUrl)
            : Boolean(camKetChuyenDoiXanhFile && cavetXeCuFile)
    );

    const isStep1InfoValid = isSupplementMode
        ? ((!showPolicyCol || policy.length > 0) &&
            (!showHoaHong || isCommissionValid) &&
            (!showVpoint || isVpointValid) &&
            (!showXeXang || (!vinCheckError)) &&
            (!showMaVc || maVc.trim() !== '') &&
            isVtlxInfoValid)
        : (policy.length > 0 &&
            isCommissionValid &&
            isVpointValid &&
            (!isGasToElectricPolicy || (xeXangVin.trim() !== '' && xeXangHang.trim() !== '' && xeXangModel.trim() !== '' && !vinCheckError)) &&
            (!isVinFastGasCarAppreciationPolicy || maVc.trim() !== '') &&
            isVtlxInfoValid);

    const isStep1DocsValid = isSupplementMode
        ? ((!effectiveShowHdmb || hasContract) && (!effectiveShowDnxhd || hasProposal) && isVtlxDocsValid)
        : (Boolean(contractFile && proposalFile) && isVtlxDocsValid);
    const isStep1Valid = isStep1InfoValid && isStep1DocsValid && !isVerificationBlocked;
    const isStep2Valid = isSupplementMode ? true : vinClubConfirmed;
    const isFormValid = isStep1Valid && isStep2Valid && !isVerificationBlocked;

    useEffect(() => {
        const savedData = sessionStorage.getItem(`invoice_draft_${order["Số đơn hàng"]}`);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.policy && parsed.policy.length > 0) setPolicy(parsed.policy);
                if (parsed.commission !== undefined && parsed.commission !== null) setCommission(parsed.commission);
                if (parsed.vpoint !== undefined && parsed.vpoint !== null) setVpoint(parsed.vpoint);
                if (parsed.maVc) setMaVc(parsed.maVc);
                if (parsed.vtlxHangXe) setVtlxHangXe(parsed.vtlxHangXe);
                if (parsed.vtlxSoKhung) setVtlxSoKhung(parsed.vtlxSoKhung);
            } catch (e) { console.error(e); }
        }
    }, [order]);

    useEffect(() => {
        const dataToSave = { policy, commission, vpoint, maVc, vtlxHangXe, vtlxSoKhung };
        sessionStorage.setItem(`invoice_draft_${order["Số đơn hàng"]}`, JSON.stringify(dataToSave));
    }, [policy, commission, vpoint, maVc, vtlxHangXe, vtlxSoKhung, order]);

    const payloadsRef = useRef<{ contract: any, proposal: any }>({ contract: null, proposal: null });

    useEffect(() => {
        const handleContractProcessed = (e: any) => {
            payloadsRef.current.contract = e.detail;
            if (e.detail?.payload) {
                setFileOrigins(prev => {
                    const next = [...prev];
                    next[0] = e.detail.count;
                    return next;
                });
                setCapturedImages(prev => [...prev, ...e.detail.payload]);
            }
        };
        const handleProposalProcessed = (e: any) => {
            payloadsRef.current.proposal = e.detail;
            if (e.detail?.payload) {
                setFileOrigins(prev => {
                    const next = [...prev];
                    next[1] = e.detail.count;
                    return next;
                });
                setCapturedImages(prev => [...prev, ...e.detail.payload]);
            }
        };
        window.addEventListener('file_processed_hop_dong_file_input', handleContractProcessed);
        window.addEventListener('file_processed_denghi_xhd_file_input', handleProposalProcessed);
        return () => {
            window.removeEventListener('file_processed_hop_dong_file_input', handleContractProcessed);
            window.removeEventListener('file_processed_denghi_xhd_file_input', handleProposalProcessed);
        };
    }, []);

    const handleContractFileSelect = (file: File | null) => {
        setContractFile(file);
        if (!file) {
            payloadsRef.current.contract = null;
        }
    };

    const handleProposalFileSelect = (file: File | null) => {
        setProposalFile(file);
        if (!file) {
            payloadsRef.current.proposal = null;
        }
    };

    const handleNext = () => setStep((prev: any) => Math.min(prev + 1, 2));
    const handleBack = () => setStep((prev: any) => Math.max(prev - 1, 1));

    const executeSubmission = async () => {
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        try {
            setProcessingStage(1);
            await new Promise(r => setTimeout(r, 600));
            setProcessingStage(2);
            await new Promise(r => setTimeout(r, 600));
            setProcessingStage(3);

            // Save split images to Supabase in background for Re-Scan functionality
            if (capturedImages.length > 0 && fileOrigins.length > 0) {
                const triggerArchival = async () => {
                    try {
                        const orderNumber = order["Số đơn hàng"];
                        const customerName = order["Tên khách hàng"] || "KH vãng lai";
                        const contractImgCount = fileOrigins[0] || 0;

                        // 1. Lưu bộ HĐMB trước
                        if (contractImgCount > 0) {
                            const contractImgs = capturedImages.slice(0, contractImgCount);
                            console.log(`[Supabase] Archiving ${contractImgCount} HĐMB images for re-scan...`);
                            await apiService.saveSplitImagesToSupabase(orderNumber, customerName, contractImgs, "HĐMB");
                        }

                        // 2. Sau đó lưu bộ ĐNXHĐ
                        const proposalImgCount = fileOrigins[1] || 0;
                        if (proposalImgCount > 0) {
                            const proposalImgs = capturedImages.slice(contractImgCount, contractImgCount + proposalImgCount);
                            console.log(`[Supabase] Archiving ${proposalImgCount} ĐNXHĐ images for re-scan...`);
                            await apiService.saveSplitImagesToSupabase(orderNumber, customerName, proposalImgs, "ĐNXHĐ");
                        }

                        console.log(`✅ [Supabase] Toàn bộ ảnh đã được lưu vào Storage cho đơn hàng ${orderNumber}`);
                    } catch (err) {
                        console.error("❌ [Supabase] Lỗi lưu trữ ảnh quét lại:", err);
                    }
                };

                // Gọi mà không await để không làm chậm UI chính
                triggerArchival();
            }

            const cleanedContractCode = cleanCyberContractCode(maHdCyber) || cleanCyberContractCode(order["Mã HĐ Cyber"] || order.ma_hd_cyber || '');
            const updatedOrder: Order = {
                ...order,
                "Mã HĐ Cyber": cleanedContractCode,
                ma_hd_cyber: cleanedContractCode,
            };

            await onConfirm(
                updatedOrder,
                contractFile || null,
                proposalFile || null,
                policy,
                getRawValue(commission) || '0',
                getRawValue(vpoint) || '0',
                '',
                payloadsRef.current,
                xeXangVin.trim() || undefined,
                xeXangHang.trim() || undefined,
                xeXangModel.trim() || undefined,
                maVc.trim() || undefined,
                (showVtlx || isVtlxPolicy) ? {
                    hangXe: vtlxHangXe.trim(),
                    soKhung: vtlxSoKhung.trim().toUpperCase(),
                    camKetFile: camKetChuyenDoiXanhFile || null,
                    cavetFile: cavetXeCuFile || null
                } : undefined
            );
            sessionStorage.removeItem(`invoice_draft_${order["Số đơn hàng"]}`);
            setProcessingStage(4);
            await new Promise(r => setTimeout(r, 1500));
            onClose();
        } catch (error) {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
            setProcessingStage(0);
        }
    };

    const handleSubmit = async () => {
        if (isSubmittingRef.current || isValidatingContract) return;

        // Nếu ở chế độ nộp bổ sung hồ sơ: Bỏ qua đối soát DMS & Cyber, nộp ngay các mục cần bổ sung
        if (mode === 'supplement') {
            if (!isFormValid) {
                showToast('Thiếu Thông Tin', 'Vui lòng hoàn thành các thông tin hoặc chứng từ cần bổ sung.', 'warning');
                return;
            }
            await executeSubmission();
            return;
        }

        // 1. Kiểm tra đối soát cấu hình xe trên hệ thống VinFast DMS
        if (dmsVerification.status === 'invalid') {
            showToast('Lỗi Đối Soát DMS', dmsVerification.message || 'Cấu hình xe không khớp với VSO trên VinFast DMS.', 'error', 10000);
            return;
        }
        if (dmsVerification.status === 'checking' || isCheckingDms) {
            showToast('Đang Kiểm Tra DMS', 'Hệ thống đang đối soát cấu hình xe trên VinFast DMS, vui lòng đợi trong giây lát...', 'warning', 4000);
            return;
        }

        if (!isFormValid || (!contractFile || !proposalFile)) {
            showToast('Thiếu Thông Tin', "Vui lòng hoàn thành tất cả các bước.", 'warning');
            return;
        }

        if (stockData && stockData.length > 0 && order.VIN) {
            const vehicle = stockData.find(v => v.VIN === order.VIN);
            if (vehicle) {
                const dmsCode = vehicle['Mã DMS'] || vehicle['Mã DMS'] || vehicle['DMS Code'] || vehicle['Mã đơn hàng'] || '';
                const orderPrefix = order["Số đơn hàng"] ? order["Số đơn hàng"].trim().substring(0, 6) : '';
                if (dmsCode && orderPrefix && dmsCode.trim().toUpperCase() !== orderPrefix.toUpperCase()) {
                    showToast('Sai Mã DMS', `Anh chị vui lòng tạo lại đơn hàng đúng đầu DMS (${dmsCode})`, 'error', 10000);
                    return;
                }
            }
        }

        // Kiểm tra tình trạng phê duyệt hợp đồng trên hệ thống CyberSoft
        let currentStatus = cyberContractStatus;
        if (!currentStatus) {
            setIsValidatingContract(true);
            try {
                currentStatus = await checkCyberContractStatus({
                    customer_name: order["Tên khách hàng"],
                    tvbh_name: order["Tên tư vấn bán hàng"],
                    vin: order.VIN,
                    order_no: order["Số đơn hàng"]
                });
                setCyberContractStatus(currentStatus);
            } catch (err) {
                console.error("Lỗi khi kiểm tra tình trạng hợp đồng trên Cyber:", err);
            } finally {
                setIsValidatingContract(false);
            }
        }

        // Kiểm tra đối soát cấu hình Mã màu ngoại thất, nội thất và dòng xe giữa HĐ CyberSoft và Xe ghép
        if (currentStatus && currentStatus.found) {
            const car = stockData?.find((v: any) => v.VIN === order.VIN);
            const carExtCode = car ? (apiService.getExteriorColorCode(car['Ngoại thất'] || car['Màu ngoại thất'] || '') || (car as any).ma_mau) : '';
            const carIntCode = car ? (apiService.getInteriorColorCode(car['Nội thất'] || car['Màu nội thất'] || '') || (car as any).ma_noi_that) : '';
            const carModelCode = car ? apiService.getModelCode(car['Dòng xe'] || '') : '';

            const cyberExtCode = (currentStatus.ma_mau || '').trim().toUpperCase();
            const cyberIntCode = (currentStatus.ma_mau_nt || '').trim().toUpperCase();
            const cyberModelCode = apiService.getModelCode(currentStatus.ten_kx || currentStatus.ma_kx || '');

            if (carModelCode && cyberModelCode && carModelCode !== cyberModelCode) {
                showToast('Lệch dòng xe với Cyber', `Xe ghép (${order.VIN}) là [${carModelCode}] nhưng HĐ Cyber là [${cyberModelCode} - ${currentStatus.ten_kx || currentStatus.ma_kx}].`, 'error');
                return;
            }
            if (carExtCode && cyberExtCode && !apiService.compareExteriorColorCodes(carExtCode, cyberExtCode)) {
                showToast('Lệch màu ngoại thất với Cyber', `Xe ghép mang mã [${carExtCode}] nhưng HĐ Cyber mang mã [${cyberExtCode} - ${currentStatus.ten_mau || cyberExtCode}].`, 'error');
                return;
            }
            if (carIntCode && cyberIntCode && !apiService.compareInteriorColorCodes(carIntCode, cyberIntCode)) {
                showToast('Lệch màu nội thất với Cyber', `Xe ghép mang mã [${carIntCode}] nhưng HĐ Cyber mang mã [${cyberIntCode} - ${currentStatus.ten_mau_nt || cyberIntCode}].`, 'error');
                return;
            }

            // Kiểm tra đối soát Tên khách hàng giữa Đơn hàng và HĐ Cyber
            const ordCus = (order["Tên khách hàng"] || '').trim();
            const cybCus = (currentStatus.ten_kh || '').trim();
            if (ordCus && cybCus && !checkCustomerNameMatch(ordCus, cybCus)) {
                showToast(
                    'Lệch tên khách hàng với Cyber',
                    `Tên khách hàng trên Đơn hàng [${ordCus}] KHÔNG KHỚP với tên trên HĐ Cyber [${cybCus}]. Vui lòng kiểm tra lại trước khi gửi đề nghị xuất HĐ.`,
                    'error',
                    8000
                );
                return;
            }
        }

        // Nếu hợp đồng chưa duyệt: Chặn hoàn toàn không cho xuất hóa đơn
        if (currentStatus && !currentStatus.is_approved) {
            showToast(
                'Hợp đồng chưa được duyệt',
                `Hợp đồng ${currentStatus.so_ct || ''} hiện ở trạng thái '${currentStatus.ten_post || 'Chờ duyệt'}'. Vui lòng liên hệ Quản lý/Giám đốc duyệt hợp đồng trước khi xuất hóa đơn.`,
                'error'
            );
            return;
        }

        await executeSubmission();
    };

    const ProcessingStep = ({ label, status }: { label: string, status: 'pending' | 'active' | 'completed' }) => {
        let icon = "fa-circle text-border-secondary";
        let textClass = "text-text-secondary";
        let bgClass = "bg-surface-ground";
        if (status === 'active') {
            icon = "fa-spinner fa-spin text-accent-primary";
            textClass = "text-accent-primary font-semibold";
            bgClass = "bg-accent-primary/5 border-accent-primary/20";
        } else if (status === 'completed') {
            icon = "fa-check-circle text-success";
            textClass = "text-text-primary font-medium";
            bgClass = "bg-success/5 border-success/20";
        }
        return (
            <div className={`flex items-center p-3 rounded-lg border ${status === 'pending' ? 'border-transparent' : 'border-border-secondary'} ${bgClass} transition-all duration-300`}>
                <div className="w-8 flex justify-center mr-3"><i className={`fas ${icon} text-lg`}></i></div>
                <span className={`${textClass}`}>{label}</span>
            </div>
        );
    };

    if (isSubmitting) {
        const submittingContent = (
            <div className="flex flex-col items-center justify-center flex-1 py-10 animate-fade-in">
                <div className="relative z-10 bg-white/95 backdrop-blur-3xl w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col items-center animate-fade-in-scale-up border border-white/20">
                    <div className="w-16 h-16 mb-4 relative">
                        <div className="absolute inset-0 rounded-full border-4 border-border-primary"></div>
                        <div className={`absolute inset-0 rounded-full border-4 ${processingStage === 4 ? 'border-success' : 'border-accent-primary border-t-transparent animate-spin'}`}></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <i className={`fas ${processingStage === 4 ? 'fa-check text-success' : 'fa-paper-plane text-accent-primary'} text-xl`}></i>
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-1">{processingStage === 4 ? 'Hoàn tất!' : 'Đang xử lý hồ sơ'}</h3>
                    <p className="text-sm text-text-secondary mb-6">{processingStage === 4 ? 'Yêu cầu đã được gửi thành công.' : 'Vui lòng không tắt trình duyệt...'}</p>
                    <div className="w-full space-y-3">
                        <ProcessingStep label="Xử lý Hợp đồng mua bán" status={processingStage > 1 ? 'completed' : processingStage === 1 ? 'active' : 'pending'} />
                        <ProcessingStep label="Xử lý Đề nghị xuất hóa đơn" status={processingStage > 2 ? 'completed' : processingStage === 2 ? 'active' : 'pending'} />
                        <ProcessingStep label="Đang gửi dữ liệu..." status={processingStage > 3 ? 'completed' : processingStage === 3 ? 'active' : 'pending'} />
                    </div>
                </div>
            </div>
        );
        if (inline) return submittingContent;
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-blue-900/30 to-slate-800/40">
                    <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/15 to-cyan-500/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-gradient-to-tl from-purple-500/15 to-pink-500/10 rounded-full blur-3xl animate-pulse" />
                </div>
                {submittingContent}
            </div>
        );
    }

    const formatDiagVal = (val?: string) => {
        if (!val) return '';
        let s = val.trim();
        const dupMatch = s.match(/^([A-Z0-9]+)\s*\(([^)]+)\)\s*\(\1\)$/i);
        if (dupMatch) {
            s = `${dupMatch[2].trim()} (${dupMatch[1].toUpperCase()})`;
        }
        const sameMatch = s.match(/^([^(]+?)\s*\(([^)]+)\)$/);
        if (sameMatch && sameMatch[1].trim().toLowerCase() === sameMatch[2].trim().toLowerCase()) {
            s = sameMatch[1].trim();
        }
        return s;
    };

    const renderCyberContractStatusCard = () => {
        if (!cyberContractStatus) {
            return null;
        }

        const car = matchedCar || stockData?.find((v: any) => v.VIN === order.VIN);
        const carExtCode = car ? (apiService.getExteriorColorCode(car['Ngoại thất'] || car['Màu ngoại thất'] || '') || (car as any).ma_mau) : '';
        const carIntCode = car ? (apiService.getInteriorColorCode(car['Nội thất'] || car['Màu nội thất'] || '') || (car as any).ma_noi_that) : '';
        const carModelCode = car ? apiService.getModelCode(car['Dòng xe'] || '') : '';

        const cyberExtCode = (cyberContractStatus.ma_mau || '').trim().toUpperCase();
        const cyberIntCode = (cyberContractStatus.ma_mau_nt || '').trim().toUpperCase();
        const cyberModelCode = apiService.getModelCode(cyberContractStatus.ten_kx || cyberContractStatus.ma_kx || '');

        let configLabel = '';
        let wrongVal = '';
        let rightVal = '';
        let configGuide = '';
        if (car && cyberContractStatus.found) {
            if (carModelCode && cyberModelCode && carModelCode !== cyberModelCode) {
                const expShow = carModelCode || car['Dòng xe'] || '';
                const cybShow = cyberModelCode || cyberContractStatus.ten_kx || '';
                configLabel = 'Lệch Dòng xe';
                wrongVal = cybShow;
                rightVal = expShow;
                configGuide = `Sửa dòng xe trên Cyber thành ${expShow} rồi bấm Tra lại.`;
            } else if (carExtCode && cyberExtCode && !apiService.compareExteriorColorCodes(carExtCode, cyberExtCode)) {
                configLabel = 'Lệch Ngoại thất';
                wrongVal = cyberExtCode;
                rightVal = carExtCode;
                configGuide = `Sửa màu ngoại thất trên Cyber thành ${carExtCode} rồi bấm Tra lại.`;
            } else if (carIntCode && cyberIntCode && !apiService.compareInteriorColorCodes(carIntCode, cyberIntCode)) {
                configLabel = 'Lệch Nội thất';
                wrongVal = cyberIntCode;
                rightVal = carIntCode;
                configGuide = `Sửa màu nội thất trên Cyber thành ${carIntCode} rồi bấm Tra lại.`;
            }
        }

        const ordCustomer = (order["Tên khách hàng"] || '').trim();
        const cybCustomer = (cyberContractStatus.ten_kh || '').trim();
        let customerMismatch = false;
        if (ordCustomer && cybCustomer && cyberContractStatus.found) {
            if (!checkCustomerNameMatch(ordCustomer, cybCustomer)) {
                customerMismatch = true;
            }
        }

        if (configLabel || customerMismatch) {
            const label = customerMismatch ? 'Lệch Tên KH' : configLabel;
            const currentWrong = formatDiagVal(customerMismatch ? cybCustomer : wrongVal);
            const targetRight = formatDiagVal(customerMismatch ? ordCustomer : rightVal);
            const targetLabel = customerMismatch ? 'Đơn' : 'Xe';
            const displayGuide = customerMismatch
                ? `Sửa tên khách hàng trên HĐ Cyber thành ${ordCustomer} rồi bấm Tra lại.`
                : configGuide;

            return (
                <div className="invoice-diag-card" data-tone="red">
                    <div className="invoice-diag-body">
                        <div className="invoice-diag-head">
                            <span className="invoice-diag-badge"><i />Cyber</span>
                            <p className="invoice-diag-title">{label}</p>
                            <div className="invoice-diag-diff">
                                <span className="invoice-diag-chip" data-side="wrong" title={currentWrong}>
                                    <small>Cyber:</small> {currentWrong}
                                </span>
                                <span className="invoice-diag-swap">⇄</span>
                                <span className="invoice-diag-chip" data-side="right" title={targetRight}>
                                    <small>{targetLabel}:</small> {targetRight}
                                </span>
                            </div>
                        </div>
                        <p className="invoice-diag-guide">{displayGuide}</p>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); recheckCyberContract(true); }}
                        title="Kiểm tra lại hợp đồng Cyber"
                        className="invoice-diag-btn"
                    >
                        <i className={`fas fa-arrows-rotate text-[9px] ${isCheckingCyberContract ? 'animate-spin' : ''}`}></i>
                        <span>Tra lại</span>
                    </button>
                </div>
            );
        }

        if (cyberContractStatus.is_approved) {
            return null;
        }

        const unapprovedTitle = cyberContractStatus.found ? 'HĐ Cyber chưa duyệt' : 'Chưa có HĐ trên Cyber';
        const unapprovedGuide = cyberContractStatus.found ? 'Duyệt HĐ trên Cyber rồi bấm Tra lại.' : 'Tạo HĐ trên Cyber rồi bấm Tra lại.';

        return (
            <div className="invoice-diag-card">
                <div className="invoice-diag-body">
                    <div className="invoice-diag-head">
                        <span className="invoice-diag-badge"><i />Cyber</span>
                        <p className="invoice-diag-title">{unapprovedTitle}</p>
                    </div>
                    <p className="invoice-diag-guide">{unapprovedGuide}</p>
                </div>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); recheckCyberContract(true); }}
                    title="Kiểm tra lại trạng thái hợp đồng"
                    className="invoice-diag-btn"
                >
                    <i className={`fas fa-arrows-rotate text-[9px] ${isCheckingCyberContract ? 'animate-spin' : ''}`}></i>
                    <span>Tra lại</span>
                </button>
            </div>
        );
    };

    const renderDmsVerificationCard = () => {
        if (!isDmsEnabled) {
            return null;
        }

        if (dmsVerification.status === 'valid' || (dmsVerification.status === 'idle' && !isCheckingDms)) {
            return null;
        }

        if (dmsVerification.status === 'invalid') {
            const raw = (dmsVerification.message || '').trim();
            const norm = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

            let title = 'Lỗi cấu hình DMS';
            let guide = 'Kiểm tra lại trên DMS rồi bấm Tra lại.';
            let wrongVal = '';
            let rightVal = '';
            let rightLabel = 'Xe';

            const errorType = dmsVerification.errorType;
            const expectedVal = dmsVerification.expectedVal;
            const dmsVal = dmsVerification.dmsVal;

            if (errorType === 'customer' || norm.includes('ten khach hang') || norm.includes('khach hang')) {
                const exp = formatDiagVal(expectedVal);
                const dms = formatDiagVal(dmsVal);
                title = 'Lệch Tên KH';
                wrongVal = dms;
                rightVal = exp;
                rightLabel = 'Đơn';
                guide = `Sửa tên khách hàng trên DMS thành ${exp} rồi bấm Tra lại.`;
            } else if (errorType === 'canceled' || norm.includes('huy') || norm.includes('cancel') || norm.includes('void')) {
                title = 'VSO trên DMS đã bị hủy';
                guide = 'Đổi sang số VSO đang Mở rồi bấm Tra lại.';
            } else if (errorType === 'invoiced' || norm.includes('hoa don') || norm.includes('invoiced') || norm.includes('da xuat')) {
                title = 'VSO trên DMS đã xuất hóa đơn';
                guide = 'Đổi sang số VSO đang Mở rồi bấm Tra lại.';
            } else if (errorType === 'not_found' || norm.includes('khong tim thay')) {
                title = 'Không tìm thấy VSO trên DMS';
                guide = 'Kiểm tra lại số VSO trên DMS rồi bấm Tra lại.';
            } else if (errorType === 'exterior' || norm.includes('ngoai that')) {
                const exp = formatDiagVal(apiService.getExteriorColorCode(expectedVal || '') || expectedVal || '');
                const dms = formatDiagVal(apiService.getExteriorColorCode(dmsVal || '') || dmsVal || '');
                title = 'Lệch Ngoại thất';
                wrongVal = dms;
                rightVal = exp;
                guide = `Sửa màu ngoại thất trên DMS thành ${exp} rồi bấm Tra lại.`;
            } else if (errorType === 'interior' || norm.includes('noi that')) {
                const exp = formatDiagVal(apiService.getInteriorColorCode(expectedVal || '') || expectedVal || '');
                const dms = formatDiagVal(apiService.getInteriorColorCode(dmsVal || '') || dmsVal || '');
                title = 'Lệch Nội thất';
                wrongVal = dms;
                rightVal = exp;
                guide = `Sửa màu nội thất trên DMS thành ${exp} rồi bấm Tra lại.`;
            } else if (errorType === 'model' || norm.includes('dong xe') || norm.includes('model')) {
                const exp = formatDiagVal(apiService.getModelCode(expectedVal || '') || expectedVal || '');
                const dms = formatDiagVal(apiService.getModelCode(dmsVal || '') || dmsVal || '');
                title = 'Lệch Dòng xe';
                wrongVal = dms;
                rightVal = exp;
                guide = `Sửa dòng xe trên DMS thành ${exp} rồi bấm Tra lại.`;
            } else if (errorType === 'version' || norm.includes('phien ban') || norm.includes('version')) {
                const car = matchedCar || stockData?.find((v: any) => v.VIN === order.VIN);
                const rawCarMaPb = (car?.ma_phien_ban || car?.['Mã phiên bản'] || '').trim().toUpperCase();
                const vinVerCode = apiService.resolveMaterialVersionCode(
                    car?.['Dòng xe'] || car?.dong_xe || expectedConfig.dong_xe,
                    car?.['Phiên bản'] || car?.phien_ban || expectedConfig.phien_ban,
                    rawCarMaPb || expectedVal
                ) || formatDiagVal(expectedVal);
                const dmsVerCode = apiService.resolveMaterialVersionCode(
                    car?.['Dòng xe'] || car?.dong_xe || expectedConfig.dong_xe,
                    dmsVal,
                    dmsVal
                ) || formatDiagVal(dmsVal);
                title = 'Lệch Phiên bản';
                wrongVal = dmsVerCode;
                rightVal = vinVerCode;
                guide = `Đổi mã phiên bản thành ${vinVerCode}`;
            } else if (raw) {
                title = 'Cấu hình chưa khớp DMS';
                guide = 'Kiểm tra lại trên DMS rồi bấm Tra lại.';
            }

            return (
                <div className="invoice-diag-card" data-tone="red">
                    <div className="invoice-diag-body">
                        <div className="invoice-diag-head">
                            <span className="invoice-diag-badge"><i />DMS</span>
                            <p className="invoice-diag-title">{title}</p>
                            {wrongVal && rightVal && (
                                <div className="invoice-diag-diff">
                                    <span className="invoice-diag-chip" data-side="wrong" title={wrongVal}>
                                        <small>DMS:</small> {wrongVal}
                                    </span>
                                    <span className="invoice-diag-swap">⇄</span>
                                    <span className="invoice-diag-chip" data-side="right" title={rightVal}>
                                        <small>{rightLabel}:</small> {rightVal}
                                    </span>
                                </div>
                            )}
                        </div>
                        <p className="invoice-diag-guide">{guide}</p>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); recheckDmsVerification(true); }}
                        title="Kiểm tra lại trạng thái DMS"
                        className="invoice-diag-btn"
                    >
                        <i className={`fas fa-arrows-rotate text-[9px] ${isCheckingDms ? 'animate-spin' : ''}`}></i>
                        <span>Tra lại</span>
                    </button>
                </div>
            );
        }

        return null;
    };

    const currentStepComplete = step === 1 ? isStep1Valid : isFormValid;
    const modelStr = String(expectedConfig.dong_xe || order["Dòng xe"] || order.dong_xe || '').trim();
    const versionStr = String(expectedConfig.phien_ban || order["Phiên bản"] || (order as any).phien_ban || '').trim();
    const matVersionCode = String(expectedConfig.ma_phien_ban || apiService.resolveMaterialVersionCode(modelStr, versionStr, '') || '').trim();
    const extColorStr = String(expectedConfig.ngoai_that || order["Ngoại thất"] || (order as any).ngoai_that || '').trim() || '---';
    const intColorStr = String(expectedConfig.noi_that || order["Nội thất"] || (order as any).noi_that || '').trim() || '---';
    const engineNoStr = String(car?.so_may || car?.['Số máy'] || (order as any)?.so_may || (order as any)?.['Số máy'] || '').trim() || '---';
    const displayVehicle = modelStr
        ? (versionStr && versionStr.toLowerCase() !== modelStr.toLowerCase() ? `${modelStr} · ${versionStr}` : modelStr)
        : '---';
    const displayColors = extColorStr !== '---' || intColorStr !== '---'
        ? `${extColorStr} / ${intColorStr}`
        : '---';

    // Shared inner content (header + steps + form)
    const innerContent = (
        <div className={compact ? 'flex-1 flex flex-col min-h-0 overflow-hidden' : 'invoice-sheet-root'}>
            {!compact && (
                <header className="invoice-sheet-header">
                    <Stepper currentStep={step} hasVinClub={vinClubConfirmed} mode={mode} />
                    <div className="invoice-sheet-header-right">
                        <span className="request-step-counter">Bước {step}/2</span>
                        <button type="button" onClick={onClose} className="invoice-sheet-back" title="Quay lại" aria-label="Quay lại">
                            <i className="fas fa-arrow-left text-xs"></i>
                        </button>
                    </div>
                </header>
            )}

            <main className={compact ? 'flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5' : 'invoice-sheet-body custom-scrollbar'}>
                {step === 1 && (
                    <div className="invoice-summary-strip" data-inline={inline ? 'true' : 'false'}>
                        {!compact && !inline && (
                            <div className="invoice-summary-item">
                                <span className="invoice-summary-label">Số đơn hàng</span>
                                <div className="invoice-summary-value">
                                    <span className="invoice-summary-text" data-mono="true" data-tone="blue" title={order["Số đơn hàng"]}>{order["Số đơn hàng"]}</span>
                                </div>
                            </div>
                        )}
                        {!compact && !inline && (
                            <div className="invoice-summary-item">
                                <span className="invoice-summary-label">Khách hàng</span>
                                <div className="invoice-summary-value">
                                    <span className="invoice-summary-text" title={order["Tên khách hàng"]}>{order["Tên khách hàng"]}</span>
                                </div>
                            </div>
                        )}
                        <div className="invoice-summary-item">
                            <span className="invoice-summary-label">Mã HĐ Cyber</span>
                            <div className="invoice-summary-value">
                                {maHdCyber ? (
                                    <span className="invoice-summary-text" data-mono="true" data-tone="emerald" title={maHdCyber}>
                                        {maHdCyber}
                                    </span>
                                ) : (
                                    <input
                                        type="text"
                                        value={maHdCyber}
                                        onChange={(e) => setMaHdCyber(e.target.value.toUpperCase())}
                                        onBlur={() => setMaHdCyber(prev => cleanCyberContractCode(prev))}
                                        placeholder="Nhập mã HĐ..."
                                        className="invoice-input"
                                        style={{ height: 26, fontSize: 11, padding: '0 8px' }}
                                        data-mono="true"
                                    />
                                )}
                            </div>
                        </div>
                        <div className="invoice-summary-item">
                            <span className="invoice-summary-label">Số VIN</span>
                            <div className="invoice-summary-value">
                                <span className="invoice-summary-text" data-mono="true" title={order.VIN}>{order.VIN || '---'}</span>
                            </div>
                        </div>
                        <div className="invoice-summary-item">
                            <span className="invoice-summary-label">Dòng xe</span>
                            <div className="invoice-summary-value">
                                <span className="invoice-summary-text" title={`${displayVehicle}${matVersionCode ? ` (${matVersionCode})` : ''}`}>
                                    {displayVehicle}{matVersionCode ? ` (${matVersionCode})` : ''}
                                </span>
                            </div>
                        </div>
                        {!compact && (
                            <div className="invoice-summary-item">
                                <span className="invoice-summary-label">Ngoại / Nội thất</span>
                                <div className="invoice-summary-value">
                                    <span className="invoice-summary-text" title={displayColors}>
                                        {displayColors}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {mode === 'supplement' && step === 1 && (() => {
                    const isRescan = Boolean(parsedSupplementRequirements?.isRescan);
                    return (
                        <div className={`p-3 rounded-xl flex items-start gap-2.5 text-xs shadow-2xs border ${isRescan ? 'bg-sky-50/90 border-sky-200/90 text-sky-950' : 'bg-amber-50/90 border-amber-200/90 text-amber-950'}`}>
                            <i className={`fas ${isRescan ? 'fa-camera text-sky-600' : 'fa-list-check text-amber-600'} text-sm mt-0.5 shrink-0`}></i>
                            <div className="text-[12px] leading-relaxed flex-1">
                                <div className={`font-bold flex items-center gap-1.5 flex-wrap ${isRescan ? 'text-sky-900' : 'text-amber-900'}`}>
                                    <span>{isRescan ? 'Admin yêu cầu scan lại các mục:' : 'Admin yêu cầu bổ sung các mục:'}</span>
                                    {parsedSupplementRequirements && (
                                        <span className="inline-flex items-center gap-1.5 flex-wrap">
                                            {parsedSupplementRequirements.hdmb && <span className={`${isRescan ? 'bg-sky-200/90 text-sky-950 border-sky-300' : 'bg-amber-200/90 text-amber-950 border-amber-300'} font-extrabold px-2 py-0.5 rounded-full text-[11px] border`}>Hợp đồng mua bán</span>}
                                            {parsedSupplementRequirements.dnxhd && <span className={`${isRescan ? 'bg-sky-200/90 text-sky-950 border-sky-300' : 'bg-amber-200/90 text-amber-950 border-amber-300'} font-extrabold px-2 py-0.5 rounded-full text-[11px] border`}>Đề nghị XHĐ</span>}
                                            {parsedSupplementRequirements.chinh_sach && <span className={`${isRescan ? 'bg-sky-200/90 text-sky-950 border-sky-300' : 'bg-amber-200/90 text-amber-950 border-amber-300'} font-extrabold px-2 py-0.5 rounded-full text-[11px] border`}>Chính sách bán hàng</span>}
                                            {parsedSupplementRequirements.hoa_hong && <span className={`${isRescan ? 'bg-sky-200/90 text-sky-950 border-sky-300' : 'bg-amber-200/90 text-amber-950 border-amber-300'} font-extrabold px-2 py-0.5 rounded-full text-[11px] border`}>Hoa hồng ứng</span>}
                                            {parsedSupplementRequirements.vpoint && <span className={`${isRescan ? 'bg-sky-200/90 text-sky-950 border-sky-300' : 'bg-amber-200/90 text-amber-950 border-amber-300'} font-extrabold px-2 py-0.5 rounded-full text-[11px] border`}>Điểm Vpoint</span>}
                                            {parsedSupplementRequirements.ma_vc && <span className={`${isRescan ? 'bg-sky-200/90 text-sky-950 border-sky-300' : 'bg-amber-200/90 text-amber-950 border-amber-300'} font-extrabold px-2 py-0.5 rounded-full text-[11px] border`}>Mã VC</span>}
                                            {parsedSupplementRequirements.xe_xang && !isVtlxPolicy && !isVtlxRequested && <span className={`${isRescan ? 'bg-sky-200/90 text-sky-950 border-sky-300' : 'bg-amber-200/90 text-amber-950 border-amber-300'} font-extrabold px-2 py-0.5 rounded-full text-[11px] border`}>Xe xăng thu cũ</span>}
                                            {(parsedSupplementRequirements.vtlx || isVtlxRequested || (parsedSupplementRequirements.xe_xang && isVtlxPolicy)) && <span className={`${isRescan ? 'bg-sky-200/90 text-sky-950 border-sky-300' : 'bg-amber-200/90 text-amber-950 border-amber-300'} font-extrabold px-2 py-0.5 rounded-full text-[11px] border`}>Hồ sơ VTLX (Cam kết & Cà vẹt)</span>}
                                        </span>
                                    )}
                                </div>
                                {parsedSupplementRequirements?.cleanReason && (
                                    <p className={`mt-1.5 font-medium bg-white/70 p-2 rounded-lg border ${isRescan ? 'text-slate-700 border-sky-200/60' : 'text-slate-700 border-amber-200/60'}`}>
                                        <strong className={isRescan ? 'text-sky-900' : 'text-amber-900'}>Chi tiết từ Admin:</strong> {parsedSupplementRequirements.cleanReason}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* BARS: KIỂM TRA DUYỆT HĐ CYBER & ĐỐI SOÁT CẤU HÌNH VINFAST DMS (Ẩn hoàn toàn khi ở luồng bổ sung) */}
                {mode !== 'supplement' && (() => {
                    const cyberCard = renderCyberContractStatusCard();
                    const dmsCard = renderDmsVerificationCard();
                    if (!cyberCard && !dmsCard) return null;
                    return (
                        <div className="invoice-diag-row">
                            {cyberCard}
                            {dmsCard}
                        </div>
                    );
                })()}

                {/* STEP 1 */}
                <div style={{ display: step === 1 ? (showPolicyCol ? 'grid' : 'block') : 'none' }} className={showPolicyCol ? "invoice-step1-grid" : "w-full max-w-4xl mx-auto space-y-4"}>
                    {/* Cột trái: Danh sách chính sách bán hàng để chọn */}
                    {showPolicyCol && (
                        <div className="invoice-step1-col">
                            <div className="invoice-step1-policy-wrap">
                                <label className="invoice-field-label">
                                    <span>Chính sách bán hàng áp dụng <span className="req">*</span></span>
                                    <span className="invoice-field-hint">
                                        {policy.length > 0 ? `Đã chọn ${policy.length} chính sách` : 'Chọn 1 hoặc nhiều chính sách'}
                                    </span>
                                </label>
                                <div className="invoice-policy-list-box">
                                    {isLoadingPolicies ? (
                                        <div className="text-[11px] text-slate-400 py-4 px-2 flex items-center gap-2">
                                            <i className="fas fa-spinner fa-spin text-blue-500"></i>
                                            <span>Đang tải danh sách chính sách...</span>
                                        </div>
                                    ) : filteredSalesPolicies.length > 0 ? (
                                        filteredSalesPolicies.map((policyName) => {
                                            const isSelected = policy.includes(policyName);
                                            return (
                                                <button
                                                    key={policyName}
                                                    type="button"
                                                    className="invoice-policy-chip"
                                                    data-selected={isSelected}
                                                    onClick={() => {
                                                        setPolicy(prev =>
                                                            prev.includes(policyName)
                                                                ? prev.filter(p => p !== policyName)
                                                                : [...prev, policyName]
                                                        );
                                                    }}
                                                >
                                                    <span className="invoice-policy-chip-dot">
                                                        {isSelected && <i className="fas fa-check"></i>}
                                                    </span>
                                                    <span>{policyName}</span>
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="text-[11px] text-slate-400 py-3 px-2">
                                            Không có chính sách khả dụng cho dòng xe này.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Cột phải: Các ô nhập liệu & Hồ sơ chứng từ đính kèm */}
                    <div className={`invoice-step1-col invoice-step1-docs-col ${!showPolicyCol ? 'w-full max-w-2xl mx-auto' : ''}`}>
                        {showFinanceRow && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {showHoaHong && (
                                    <div>
                                        <label className="invoice-field-label">
                                            <span>Hoa hồng ứng trước</span>
                                        </label>
                                        <div className="invoice-input-wrap">
                                            <input
                                                type="text"
                                                value={commission}
                                                onChange={handleNumberChange(setCommission)}
                                                className="invoice-input"
                                                placeholder="0"
                                            />
                                            <span className="invoice-input-unit">VNĐ</span>
                                        </div>
                                    </div>
                                )}

                                {showVpoint && (
                                    <div>
                                        <label className="invoice-field-label">
                                            <span>Điểm Vpoint sử dụng</span>
                                        </label>
                                        <div className="invoice-input-wrap">
                                            <input
                                                type="text"
                                                value={vpoint}
                                                onChange={handleNumberChange(setVpoint)}
                                                className="invoice-input"
                                                placeholder="0"
                                            />
                                            <span className="invoice-input-unit">ĐIỂM</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {showMaVc && (
                            <div className="animate-fade-in">
                                <label className="invoice-field-label">
                                    <span>Mã VC (Voucher) <span className="req">*</span></span>
                                </label>
                                <input
                                    type="text"
                                    value={maVc}
                                    onChange={(e) => setMaVc(e.target.value.toUpperCase())}
                                    className="invoice-input"
                                    placeholder="Nhập mã VC..."
                                    required
                                />
                            </div>
                        )}

                        {showXeXang && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
                                <div>
                                    <label className="invoice-field-label">
                                        <span>
                                            Số VIN xe xăng <span className="req">*</span>
                                            {isCheckingVin && <i className="fas fa-spinner fa-spin ml-1.5 text-blue-500"></i>}
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        value={xeXangVin}
                                        onChange={(e) => setXeXangVin(e.target.value.toUpperCase())}
                                        className="invoice-input"
                                        data-mono="true"
                                        style={vinCheckError ? { borderColor: '#f43f5e' } : undefined}
                                        placeholder="VD: VIN123..."
                                    />
                                    {vinCheckError && (
                                        <p className="text-[10.5px] text-rose-600 font-semibold mt-1 flex items-start gap-1">
                                            <i className="fas fa-exclamation-triangle mt-0.5 flex-shrink-0"></i>
                                            <span>{vinCheckError}</span>
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="invoice-field-label">
                                        <span>Hãng xe xăng <span className="req">*</span></span>
                                    </label>
                                    <input
                                        type="text"
                                        value={xeXangHang}
                                        onChange={(e) => setXeXangHang(e.target.value)}
                                        className="invoice-input"
                                        placeholder="VD: Toyota"
                                    />
                                </div>
                                <div>
                                    <label className="invoice-field-label">
                                        <span>Model xe xăng <span className="req">*</span></span>
                                    </label>
                                    <input
                                        type="text"
                                        value={xeXangModel}
                                        onChange={(e) => setXeXangModel(e.target.value)}
                                        className="invoice-input"
                                        placeholder="VD: Camry"
                                    />
                                </div>
                            </div>
                        )}

                        {showVtlx && (
                            <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-2.5 animate-fade-in shadow-2xs">
                                <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/50">
                                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                                        <i className="fas fa-leaf text-emerald-600"></i>
                                        <span>Chính Sách Vì Tương Lai Xanh (VTLX)</span>
                                    </div>
                                    <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                                        Bắt buộc xe cũ & chứng từ
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="invoice-field-label">
                                            <span>Hãng xe (xăng hoặc điện cũ) <span className="req">*</span></span>
                                        </label>
                                        <input
                                            type="text"
                                            value={vtlxHangXe}
                                            onChange={(e) => setVtlxHangXe(e.target.value)}
                                            className="invoice-input"
                                            placeholder="VD: Honda, Toyota, VinFast..."
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="invoice-field-label">
                                            <span>
                                                Số khung (xăng hoặc điện cũ) <span className="req">*</span>
                                                {isCheckingVtlxVin && <i className="fas fa-spinner fa-spin ml-1.5 text-emerald-600"></i>}
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={vtlxSoKhung}
                                            onChange={(e) => setVtlxSoKhung(e.target.value.toUpperCase())}
                                            className="invoice-input"
                                            data-mono="true"
                                            style={vtlxVinCheckError ? { borderColor: '#f43f5e' } : undefined}
                                            placeholder="VD: RL4XXXXXXXXXXXXXX"
                                            required
                                        />
                                        {vtlxVinCheckError && (
                                            <p className="text-[10.5px] text-rose-600 font-semibold mt-1 flex items-start gap-1">
                                                <i className="fas fa-exclamation-triangle mt-0.5 flex-shrink-0"></i>
                                                <span>{vtlxVinCheckError}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-emerald-200/50">
                                    <label className="invoice-field-label">
                                        <span>Hồ sơ VTLX đính kèm <span className="req">*</span></span>
                                        <span className="invoice-field-hint">PDF hoặc Ảnh (JPG, PNG...)</span>
                                    </label>
                                    <div className="invoice-docs-stack">
                                        <SimpleFileUpload
                                            id="cam_ket_vtlx_file_input"
                                            label={isSupplementMode ? "Cam kết chuyển đổi xanh (Mới)" : "Cam kết chuyển đổi xanh"}
                                            onFileSelect={(file) => setCamKetChuyenDoiXanhFile(file)}
                                            required={!isSupplementMode && !existingCamKetUrl}
                                            accept=".pdf,application/pdf,image/*,.jpg,.jpeg,.png,.webp"
                                            buttonText="Chọn PDF / Ảnh"
                                            placeholderText={isSupplementMode && existingCamKetUrl ? "Đã có tệp cũ trên hệ thống · Bấm để tải file mới thay thế" : "Kéo thả hoặc bấm để đính kèm PDF hoặc Ảnh"}
                                            disableCompression={false}
                                            showPreview={false}
                                            variant="slot"
                                        />
                                        <SimpleFileUpload
                                            id="cavet_vtlx_file_input"
                                            label={isSupplementMode ? "Cà vẹt xe điện hoặc xăng cũ (Mới)" : "Cà vẹt xe điện hoặc xăng cũ"}
                                            onFileSelect={(file) => setCavetXeCuFile(file)}
                                            required={!isSupplementMode && !existingCavetUrl}
                                            accept=".pdf,application/pdf,image/*,.jpg,.jpeg,.png,.webp"
                                            buttonText="Chọn PDF / Ảnh"
                                            placeholderText={isSupplementMode && existingCavetUrl ? "Đã có tệp cũ trên hệ thống · Bấm để tải file mới thay thế" : "Kéo thả hoặc bấm để đính kèm PDF hoặc Ảnh"}
                                            disableCompression={false}
                                            showPreview={false}
                                            variant="slot"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {showDocsSection && (
                            <div className="invoice-docs-section">
                                <label className="invoice-field-label">
                                    <span>Hồ sơ chứng từ đính kèm {mode !== 'supplement' && <span className="req">*</span>}</span>
                                    <span className="invoice-field-hint">PDF hoặc Ảnh</span>
                                </label>
                                <div className="invoice-docs-stack">
                                    {effectiveShowHdmb && (
                                        <SimpleFileUpload
                                            id="hop_dong_file_input"
                                            label={mode === 'supplement' ? "Hợp đồng mua bán (Mới)" : "Hợp đồng mua bán"}
                                            onFileSelect={handleContractFileSelect}
                                            required={mode !== 'supplement' && !existingContractUrl}
                                            accept=".pdf,application/pdf,image/*,.jpg,.jpeg,.png,.webp"
                                            disableCompression={false}
                                            showPreview={false}
                                            variant="slot"
                                            buttonText="Chọn tệp HĐ"
                                            placeholderText={mode === 'supplement' && existingContractUrl ? "Đã có tệp cũ trên hệ thống · Bấm để tải file mới thay thế" : "Kéo thả hoặc bấm để đính kèm Hợp đồng"}
                                        />
                                    )}
                                    {effectiveShowDnxhd && (
                                        <SimpleFileUpload
                                            id="denghi_xhd_file_input"
                                            label={mode === 'supplement' ? "Đề nghị xuất hóa đơn (Mới)" : "Đề nghị xuất hóa đơn"}
                                            onFileSelect={handleProposalFileSelect}
                                            required={mode !== 'supplement' && !existingProposalUrl}
                                            accept=".pdf,application/pdf,image/*,.jpg,.jpeg,.png,.webp"
                                            disableCompression={false}
                                            showPreview={false}
                                            variant="slot"
                                            buttonText="Chọn tệp ĐNXHĐ"
                                            placeholderText={mode === 'supplement' && existingProposalUrl ? "Đã có tệp cũ trên hệ thống · Bấm để tải file mới thay thế" : "Kéo thả hoặc bấm để đính kèm Đề nghị XHĐ"}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* STEP 2: XÁC NHẬN */}
                <div style={{ display: step === 2 ? 'flex' : 'none' }} className="invoice-step2-layout">
                    <div className="invoice-confirm-grid">
                        {/* Khối 1: Cấu hình xe xuất hóa đơn */}
                        <div className="invoice-confirm-card">
                            <div className="invoice-confirm-card-title">
                                <span>Cấu hình xe xuất hóa đơn</span>
                                <span className="invoice-confirm-card-hint">
                                    {matVersionCode ? `Mã PB: ${matVersionCode}` : 'Thông tin xe ghép'}
                                </span>
                            </div>
                            <div className="invoice-confirm-spec-grid">
                                <div className="invoice-confirm-spec-item">
                                    <span className="invoice-confirm-spec-label">Dòng xe</span>
                                    <span className="invoice-confirm-spec-val" title={modelStr || '---'}>
                                        {modelStr || '---'}
                                    </span>
                                </div>
                                <div className="invoice-confirm-spec-item">
                                    <span className="invoice-confirm-spec-label">Phiên bản</span>
                                    <span className="invoice-confirm-spec-val" title={`${versionStr || '---'}${matVersionCode ? ` (${matVersionCode})` : ''}`}>
                                        {versionStr || '---'}{matVersionCode ? ` (${matVersionCode})` : ''}
                                    </span>
                                </div>
                                <div className="invoice-confirm-spec-item">
                                    <span className="invoice-confirm-spec-label">Màu ngoại thất</span>
                                    <span className="invoice-confirm-spec-val" title={extColorStr}>
                                        {extColorStr}
                                    </span>
                                </div>
                                <div className="invoice-confirm-spec-item">
                                    <span className="invoice-confirm-spec-label">Màu nội thất</span>
                                    <span className="invoice-confirm-spec-val" title={intColorStr}>
                                        {intColorStr}
                                    </span>
                                </div>
                                <div className="invoice-confirm-spec-item">
                                    <span className="invoice-confirm-spec-label">Số VIN</span>
                                    <span className="invoice-confirm-spec-val" data-mono="true" data-tone="blue" title={order.VIN || '---'}>
                                        {order.VIN || '---'}
                                    </span>
                                </div>
                                <div className="invoice-confirm-spec-item">
                                    <span className="invoice-confirm-spec-label">Số máy</span>
                                    <span className="invoice-confirm-spec-val" data-mono="true" title={engineNoStr}>
                                        {engineNoStr}
                                    </span>
                                </div>
                                <div className="invoice-confirm-spec-item" data-span="2">
                                    <span className="invoice-confirm-spec-label">Mã hợp đồng Cyber</span>
                                    <span className="invoice-confirm-spec-val" data-mono="true" data-tone="emerald" title={maHdCyber || '---'}>
                                        {maHdCyber || '---'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Khối 2: Chính sách & Tài chính */}
                        <div className="invoice-confirm-card">
                            <div className="invoice-confirm-card-title">
                                <span>Chính sách & Tài chính</span>
                                <span className="invoice-confirm-card-hint">Đã chọn {policy.length} chính sách</span>
                            </div>
                            <div className="invoice-confirm-policies">
                                {policy.length > 0 ? policy.map((p, idx) => (
                                    <div key={idx} className="invoice-policy-chip" data-selected="true">
                                        <span className="invoice-policy-chip-dot">
                                            <i className="fas fa-check"></i>
                                        </span>
                                        <span>{p}</span>
                                    </div>
                                )) : (
                                    <div className="text-[11px] text-slate-400 py-4 px-2">
                                        Chưa chọn chính sách
                                    </div>
                                )}
                            </div>

                            <div className="invoice-confirm-finance-grid">
                                <div className="invoice-confirm-finance-box">
                                    <p className="invoice-confirm-spec-label mb-0.5">Hoa hồng ứng trước</p>
                                    <p className="text-[12px] font-bold text-blue-600">
                                        {commission ? `${parseInt(getRawValue(commission)).toLocaleString('vi-VN')} đ` : '0 đ'}
                                    </p>
                                </div>
                                <div className="invoice-confirm-finance-box">
                                    <p className="invoice-confirm-spec-label mb-0.5">Điểm Vpoint sử dụng</p>
                                    <p className="text-[12px] font-bold text-indigo-600">
                                        {vpoint ? `${parseInt(getRawValue(vpoint)).toLocaleString('vi-VN')} điểm` : '0 điểm'}
                                    </p>
                                </div>
                                {isVinFastGasCarAppreciationPolicy && maVc && (
                                    <div className="invoice-confirm-finance-box" data-span="2">
                                        <p className="invoice-confirm-spec-label mb-0.5">Mã VC (Voucher)</p>
                                        <p className="invoice-confirm-spec-val" data-mono="true">{maVc}</p>
                                    </div>
                                )}
                                {isGasToElectricPolicy && xeXangVin && (
                                    <div className="invoice-confirm-finance-box" data-span="2">
                                        <p className="invoice-confirm-spec-label mb-0.5">Xe xăng thu cũ đổi mới</p>
                                        <p className="invoice-confirm-spec-val">
                                            {xeXangHang} {xeXangModel} · <span className="font-mono text-blue-600">{xeXangVin}</span>
                                        </p>
                                    </div>
                                )}
                                {(isVtlxPolicy || showVtlx) && vtlxSoKhung && (
                                    <div className="invoice-confirm-finance-box" data-span="2">
                                        <p className="invoice-confirm-spec-label mb-0.5 text-emerald-800 font-semibold flex items-center gap-1">
                                            <i className="fas fa-leaf text-emerald-600"></i>
                                            <span>Xe cũ Vì Tương Lai Xanh (VTLX)</span>
                                        </p>
                                        <p className="invoice-confirm-spec-val">
                                            {vtlxHangXe || 'Xe cũ'} · <span className="font-mono text-emerald-700 font-bold">{vtlxSoKhung}</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Khối 3: Hồ sơ chứng từ đính kèm */}
                        <div className="invoice-confirm-card">
                            <div className="invoice-confirm-card-title">
                                <span>Hồ sơ chứng từ đính kèm</span>
                                <span className="invoice-confirm-card-hint">
                                    {(isVtlxPolicy || showVtlx) ? '4 tệp (PDF / Ảnh)' : '2 tệp PDF'}
                                </span>
                            </div>
                            <div className="invoice-docs-stack">
                                {[
                                    { label: 'Hợp đồng mua bán', file: contractFile },
                                    { label: 'Đề nghị xuất hóa đơn', file: proposalFile },
                                    ...((isVtlxPolicy || showVtlx) ? [
                                        { label: 'Cam kết chuyển đổi xanh', file: camKetChuyenDoiXanhFile },
                                        { label: 'Cà vẹt xe điện hoặc xăng cũ', file: cavetXeCuFile }
                                    ] : [])
                                ].map((doc, idx) => {
                                    const sizeText = doc.file
                                        ? doc.file.size >= 1024 * 1024
                                            ? `${(doc.file.size / (1024 * 1024)).toFixed(2)} MB`
                                            : `${(doc.file.size / 1024).toFixed(1)} KB`
                                        : '';
                                    const isImg = doc.file && (doc.file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(doc.file.name));
                                    return (
                                        <div
                                            key={idx}
                                            className="invoice-pdf-slot"
                                            data-uploaded={Boolean(doc.file)}
                                            style={{ cursor: 'default' }}
                                        >
                                            <div className="invoice-pdf-slot-icon">
                                                <i className={`fas ${isImg ? 'fa-file-image text-emerald-600' : 'fa-file-pdf text-rose-500'}`}></i>
                                                {doc.file && (
                                                    <span className="invoice-pdf-slot-check">
                                                        <i className="fas fa-check"></i>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="invoice-pdf-slot-body">
                                                <div className="invoice-pdf-slot-title">
                                                    <span>{doc.label}</span>
                                                </div>
                                                <div className="invoice-pdf-slot-meta">
                                                    {doc.file ? (
                                                        <>
                                                            <span className="invoice-pdf-slot-filename" title={doc.file.name}>{doc.file.name}</span>
                                                            <span className="invoice-pdf-slot-dot">·</span>
                                                            <span className="invoice-pdf-slot-size">{sizeText}</span>
                                                        </>
                                                    ) : (
                                                        <span>Chưa tải lên</span>
                                                    )}
                                                </div>
                                            </div>
                                            {doc.file && (
                                                <div className="invoice-pdf-slot-actions">
                                                    <span className="invoice-pdf-slot-badge">Đã tải lên</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div
                        className="invoice-vinclub-box"
                        data-checked={vinClubConfirmed}
                        onClick={() => setVinClubConfirmed(!vinClubConfirmed)}
                    >
                        <div className="invoice-vinclub-check">
                            {vinClubConfirmed && <i className="fas fa-check text-[9px]"></i>}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11.5px] font-semibold text-slate-800">Tôi xác nhận khách hàng đã tạo tài khoản VinClub</p>
                            <p className="text-[10px] text-slate-500">Điều kiện bắt buộc để tiếp tục gửi yêu cầu xuất hóa đơn</p>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="invoice-sheet-footer">
                {step > 1 ? (
                    <button type="button" onClick={handleBack} disabled={isSubmitting} className="btn-secondary">
                        Quay lại
                    </button>
                ) : (
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-secondary">
                        Hủy
                    </button>
                )}

                {step < 2 ? (
                    <button
                        type="button"
                        data-complete={currentStepComplete}
                        onClick={() => {
                            if (isVerificationBlocked) {
                                if (!isDmsValid) {
                                    showToast('Chặn xuất hóa đơn', dmsVerification.message || 'Cấu hình xe chưa khớp với DMS.', 'error');
                                } else if (hasCyberMismatch) {
                                    showToast('Chặn xuất hóa đơn', 'Cấu hình xe không khớp với Hợp đồng Cyber. Vui lòng kiểm tra lại.', 'error');
                                } else if (cyberContractStatus && !cyberContractStatus.is_approved) {
                                    showToast('Hợp đồng chưa duyệt', 'Hợp đồng Cyber chưa được duyệt. Vui lòng liên hệ Giám đốc duyệt hợp đồng.', 'warning');
                                }
                                return;
                            }
                            if (!isStep1InfoValid) {
                                if (policy.length === 0) {
                                    showToast('Chưa chọn chính sách', 'Vui lòng chọn ít nhất 1 chính sách bán hàng áp dụng.', 'warning');
                                } else if (isGasToElectricPolicy && (!xeXangVin.trim() || !xeXangHang.trim() || !xeXangModel.trim() || vinCheckError)) {
                                    showToast('Thông tin xe xăng cũ', vinCheckError || 'Vui lòng nhập đầy đủ VIN, hãng và model xe xăng thu cũ đổi mới.', 'warning');
                                } else if (isVinFastGasCarAppreciationPolicy && !maVc.trim()) {
                                    showToast('Thiếu mã Voucher', 'Vui lòng nhập mã Voucher tri ân xe xăng.', 'warning');
                                } else if (isVtlxPolicy && (!vtlxHangXe.trim() || !vtlxSoKhung.trim() || vtlxVinCheckError)) {
                                    showToast('Thông tin xe cũ VTLX', vtlxVinCheckError || 'Vui lòng nhập đầy đủ hãng xe và số khung xe cũ (xăng hoặc điện).', 'warning');
                                }
                                return;
                            }
                            if (!isStep1DocsValid) {
                                if (mode !== 'supplement' && (!contractFile || !proposalFile)) {
                                    showToast('Thiếu hồ sơ chứng từ', 'Vui lòng tải lên cả Hợp đồng mua bán và Đề nghị xuất hóa đơn.', 'warning');
                                } else if (isVtlxPolicy && (!camKetChuyenDoiXanhFile || !cavetXeCuFile) && !existingCamKetUrl && !existingCavetUrl) {
                                    showToast('Thiếu hồ sơ VTLX', 'Vui lòng tải lên cả file Cam kết chuyển đổi xanh và Cà vẹt xe cũ (PDF hoặc Ảnh).', 'warning');
                                } else {
                                    showToast('Thiếu hồ sơ chứng từ', 'Vui lòng tải lên đầy đủ các chứng từ bắt buộc.', 'warning');
                                }
                                return;
                            }
                            handleNext();
                        }}
                        disabled={isSubmitting}
                        className="btn-primary"
                    >
                        <span>Tiếp theo</span>
                        <i className="fas fa-arrow-right text-[9px]"></i>
                    </button>
                ) : (
                    <button
                        type="button"
                        data-complete={isFormValid}
                        onClick={handleSubmit}
                        disabled={isSubmitting || isValidatingContract || !isFormValid}
                        className="btn-primary"
                    >
                        <i className={`fas ${isSubmitting || isValidatingContract ? 'fa-spinner fa-spin' : 'fa-check'} text-[9.5px]`}></i>
                        <span>
                            {isValidatingContract
                                ? 'Đang kiểm tra...'
                                : mode === 'supplement'
                                    ? (parsedSupplementRequirements?.isRescan ? 'Xác nhận nộp bản scan lại' : 'Xác nhận nộp bổ sung')
                                    : 'Gửi yêu cầu'}
                        </span>
                    </button>
                )}
            </footer>
        </div>
    );

    const contractWarningModal = contractWarning && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/65 backdrop-blur-md transition-opacity"
                onClick={() => setContractWarning(null)}
            />

            {/* Dialog Container */}
            <div
                className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-amber-200/80 overflow-hidden animate-fade-in-scale-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Accent Top Gradient */}
                <div className="h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />

                <div className="p-6 md:p-7">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100/90 border border-amber-300 flex items-center justify-center text-amber-600 flex-shrink-0 shadow-inner">
                            <i className="fas fa-triangle-exclamation text-2xl animate-bounce"></i>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight leading-snug">
                                Cảnh Báo Hợp Đồng Chưa Được Duyệt
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Dữ liệu đối soát tự động từ hệ thống quản lý
                            </p>
                        </div>
                    </div>

                    {/* Details Card */}
                    <div className="bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-slate-50/50 rounded-2xl border border-amber-200/70 p-4 mb-5 space-y-2.5 text-xs">
                        <div className="flex justify-between items-center pb-2 border-b border-amber-200/40">
                            <span className="text-slate-500 font-medium">Số hợp đồng:</span>
                            <span className="font-mono font-bold text-slate-800">
                                {contractWarning.so_ct || 'Chưa tìm thấy hợp đồng'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center pb-2 border-b border-amber-200/40">
                            <span className="text-slate-500 font-medium">Khách hàng:</span>
                            <span className="font-bold text-slate-800 text-right max-w-[240px] truncate">
                                {order["Tên khách hàng"] || contractWarning.ten_kh || 'N/A'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center pb-2 border-b border-amber-200/40">
                            <span className="text-slate-500 font-medium">Tư vấn bán hàng:</span>
                            <span className="font-bold text-slate-800">
                                {order["Tên tư vấn bán hàng"] || contractWarning.ten_tvbh || 'N/A'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center pt-0.5">
                            <span className="text-slate-500 font-medium">Trạng thái hợp đồng:</span>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${contractWarning.found
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-rose-100 text-rose-900 border border-rose-300'
                                }`}>
                                <i className={`fas ${contractWarning.found ? 'fa-clock' : 'fa-circle-xmark'} text-[10px]`}></i>
                                {contractWarning.ten_post || (contractWarning.found ? 'Hợp đồng chờ duyệt' : 'Chưa có hợp đồng')}
                            </span>
                        </div>
                    </div>

                    {/* Explanatory Message */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 mb-6 text-[11px] text-slate-600 leading-relaxed flex items-start gap-2.5">
                        <i className="fas fa-info-circle text-blue-500 mt-0.5 flex-shrink-0 text-xs"></i>
                        <span>
                            Hợp đồng của khách hàng <strong>{order["Tên khách hàng"]}</strong> hiện <strong>chưa được phê duyệt</strong> trên hệ thống. Vui lòng liên hệ Quản lý/Giám đốc để duyệt hợp đồng trước khi xuất hóa đơn.
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setContractWarning(null)}
                            className="px-5 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 active:scale-95 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                        >
                            <i className="fas fa-arrow-left text-[11px]"></i>
                            Đã hiểu, quay lại
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {inline ? (
                <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
                    {innerContent}
                </div>
            ) : (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in overflow-hidden" onClick={onClose}>
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-blue-900/30 to-slate-800/40">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20" />
                    </div>
                    <div className="relative z-10 w-full max-w-7xl mx-auto px-2 md:px-4 py-8 flex flex-col justify-center min-h-[100dvh] pointer-events-none">
                        <div className="flex flex-col w-full h-[90vh] animate-fade-in-scale-up pointer-events-auto border border-white/20 rounded-2xl overflow-hidden shadow-2xl bg-white/95 backdrop-blur-3xl relative" onClick={e => e.stopPropagation()}>
                            {innerContent}
                        </div>
                    </div>
                </div>
            )}
            {contractWarningModal}
        </>
    );
};

export default RequestInvoiceModal;