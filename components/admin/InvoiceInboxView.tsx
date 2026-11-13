import AnchoredCyberSheet from '../ui/AnchoredCyberSheet';
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import moment from 'moment';
import { Order, ActionType } from '../../types';
import Button from '../ui/Button';
import { getDriveFileId, forceDownload, getSanitizedFilename } from '../../utils/imageUtils';
import './invoice-workspace.css';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';
import { supabase } from '../../services/supabaseClient';
import { useStorageDocumentStatus } from '../../hooks/useStorageDocumentStatus';
import MarqueeText from '../ui/MarqueeText';
import CyberAssignVehicleModal from '../modals/CyberAssignVehicleModal';
import {
    getCyberXepXeContracts,
    deleteCyberXepXe,
    approveCyberContract,
    revokeCyberContractApproval,
    CyberXepXeContract,
    isOrderAssignedOnCyber,
    checkOrderCyberAssignmentDirect,
    exportCyberPdf
} from '../../services/api/stockService';
import { syncAndNotifyMInvoice } from '../../services/api/mInvoiceService';
import { checkNdpApprovedOrders } from '../../services/api/invoiceService';
import MobileInvoiceView from './mobile/MobileInvoiceView';

interface InvoiceInboxViewProps {
    orders: Order[];
    onAction: (type: ActionType, order: Order, data?: any) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onOpenFilePreview: (url: string, label: string) => void;
    onUpdateInvoiceDetails?: (orderNumber: string, data: { engineNumber: string; policy: string; commission: string; vpoint: string }) => Promise<boolean>;
    selectedFolder: string;
    selectedOrderId: string | null;
    onFolderChange: (folder: string) => void;
    onOrderSelect: (orderId: string | null) => void;
    processingId?: string | null;
    processingActionType?: ActionType | null;
    isLoading?: boolean;
    onBackToAdminHome?: () => void;
    onOpenActionMenu?: () => void;
    isDmsCompareXhdEnabled?: boolean;
    isTogglingDmsCompareXhd?: boolean;
    handleToggleDmsCompareXhdGlobal?: () => void;
}


const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const CopyableField: React.FC<{ text: string; showToast?: Function; className?: string; label?: string; wrap?: boolean }> = ({ text, className, label, wrap = false }) => {
    const copyWithFeedback = useCopyFeedback();
    if (!text || text === 'N/A') {
        return <div className={className}>{label ? `${label}: ` : ''}N/A</div>;
    }
    return (
        <div
            className={`cursor-pointer ${className}`}
            title={`Click để sao chép: ${text}`}
            onClick={(e) => { e.stopPropagation(); copyWithFeedback(text, e); }}
        >
            <span>{label ? `${label}: ` : ''}</span>
            <span className={wrap ? 'break-words' : 'truncate'}>{text}</span>
        </div>
    );
};

const InvoiceInboxView: React.FC<InvoiceInboxViewProps> = ({
    orders,
    onAction,
    showToast,
    onOpenFilePreview,
    onUpdateInvoiceDetails,
    selectedFolder,
    selectedOrderId,
    onFolderChange,
    onOrderSelect,
    processingId,
    processingActionType,
    isLoading = false,
    onBackToAdminHome,
    onOpenActionMenu,
    isDmsCompareXhdEnabled = true,
    isTogglingDmsCompareXhd = false,
    handleToggleDmsCompareXhdGlobal
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editData, setEditData] = useState({ engineNumber: '', policy: '', commission: '', vpoint: '' });
    const [dbPolicies, setDbPolicies] = useState<{ten_chinh_sach: string, dong_xe: string}[]>([]);
    const [policySearchQuery, setPolicySearchQuery] = useState('');
    const [policyFilterModelOnly, setPolicyFilterModelOnly] = useState(true);
    
    const [activeDocKey, setActiveDocKey] = useState<'LinkHopDong' | 'LinkDeNghiXHD' | 'LinkHoaDonDaXuat' | 'CyberDKBH' | 'url_cam_ket_vtlx' | 'url_cavet_vtlx'>('LinkDeNghiXHD');
    const [cyberDkbhUrls, setCyberDkbhUrls] = useState<Record<string, string>>({});
    const [isLoadingCyberDkbh, setIsLoadingCyberDkbh] = useState(false);
    const [cyberDkbhError, setCyberDkbhError] = useState<string | null>(null);
    const [dmsReportResult, setDmsReportResult] = useState<any>(null);
    const [vtlxLiveUrls, setVtlxLiveUrls] = useState<{ [orderNo: string]: { camKetUrl?: string; cavetUrl?: string; hangXe?: string; soKhung?: string } }>({});

    // 1. Filter Orders by Folder
    const filteredOrders = useMemo(() => {
        const list = orders.filter(order => {
            const status = (order['Trạng thái xử lý'] || order['Kết quả'] || '').toLowerCase().trim().normalize('NFC');
            switch (selectedFolder) {
                case 'pending_approval': return status === 'chờ phê duyệt';
                case 'approved': return status === 'đã phê duyệt';
                case 'request_supplement': return status === 'yêu cầu bổ sung';
                case 'supplemented': return status === 'đã bổ sung';
                case 'pending_signature': return status === 'chờ ký hóa đơn' || status === 'chờ ký hóa đơn';
                case 'completed': return status === 'đã xuất hóa đơn';
                case 'all': return true;
                default: return true;
            }
        });

        // 2. Sort by Invoice Date (descending), then by Request Date
        return list.sort((a, b) => {
            const dateA = a['Ngày xuất hóa đơn'] ? new Date(a['Ngày xuất hóa đơn']).getTime() : 0;
            const dateB = b['Ngày xuất hóa đơn'] ? new Date(b['Ngày xuất hóa đơn']).getTime() : 0;

            if (dateA !== dateB) return dateB - dateA;

            const timeA = a['Thời gian nhập'] ? new Date(a['Thời gian nhập']).getTime() : 0;
            const timeB = b['Thời gian nhập'] ? new Date(b['Thời gian nhập']).getTime() : 0;
            return timeB - timeA;
        });
    }, [orders, selectedFolder]);

    const selectedOrder = useMemo(() => orders.find(o => o['Số đơn hàng'] === selectedOrderId), [orders, selectedOrderId]);

    const orderNo = (selectedOrder?.['Số đơn hàng'] || (selectedOrder as any)?.so_don_hang || '').trim();
    const liveVtlx = vtlxLiveUrls[orderNo] || {};
    const effectiveCamKetUrl = (liveVtlx.camKetUrl ?? selectedOrder?.url_cam_ket_vtlx ?? '').trim();
    const effectiveCavetUrl = (liveVtlx.cavetUrl ?? selectedOrder?.url_cavet_vtlx ?? '').trim();
    const selectedDocUrl = activeDocKey === 'url_cam_ket_vtlx' ? effectiveCamKetUrl
        : activeDocKey === 'url_cavet_vtlx' ? effectiveCavetUrl
        : activeDocKey === 'CyberDKBH' ? cyberDkbhUrls[orderNo] || ''
        : String(selectedOrder?.[activeDocKey] || '');
    const documentStatus = useStorageDocumentStatus(selectedDocUrl);
    const effectiveHangXe = (selectedOrder?.vtlx_hang_xe || selectedOrder?.['VTLX Hãng xe'] || (selectedOrder as any)?.vtlx_hang_xe || liveVtlx.hangXe || '').trim();
    const effectiveSoKhung = (selectedOrder?.vtlx_so_khung || selectedOrder?.['VTLX Số khung'] || (selectedOrder as any)?.vtlx_so_khung || liveVtlx.soKhung || '').trim();
    const isVtlxPolicyOrder = useMemo(() => {
        if (!selectedOrder) return false;
        const policyStr = (selectedOrder['CHÍNH SÁCH'] || (selectedOrder as any)?.chinh_sach || '').toUpperCase();
        return policyStr.includes('VTLX') || policyStr.includes('TƯƠNG LAI XANH') || Boolean(effectiveCamKetUrl) || Boolean(effectiveCavetUrl) || Boolean(effectiveSoKhung);
    }, [selectedOrder, effectiveCamKetUrl, effectiveCavetUrl, effectiveSoKhung]);

    useEffect(() => {
        if (!orderNo) return;
        let active = true;
        const refresh = () => supabase.from('yeucauxhd')
            .select('url_cam_ket_vtlx, url_cavet_vtlx, vtlx_hang_xe, vtlx_so_khung')
            .eq('so_don_hang', orderNo)
            .maybeSingle()
            .then(({ data }) => {
                if (active && data) {
                    setVtlxLiveUrls(prev => ({
                        ...prev,
                        [orderNo]: {
                            camKetUrl: data.url_cam_ket_vtlx || '',
                            cavetUrl: data.url_cavet_vtlx || '',
                            hangXe: data.vtlx_hang_xe || '',
                            soKhung: data.vtlx_so_khung || '',
                        }
                    }));
                }
            }, () => {});
        refresh();
        const channel = supabase.channel(`invoice-documents-${orderNo}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'yeucauxhd', filter: `so_don_hang=eq.${orderNo}` }, refresh)
            .subscribe();
        return () => { active = false; void supabase.removeChannel(channel); };
    }, [orderNo, selectedOrder]);

    const loadCyberDkbhPdf = async (order?: Order | null, force = false) => {
        const targetOrder = order || selectedOrder;
        if (!targetOrder) return;
        const orderKey = targetOrder['Số đơn hàng'] || targetOrder.id || '';
        if (!orderKey) return;
        if (!force && cyberDkbhUrls[orderKey]) return;

        // Ưu tiên tìm số HĐ Cyber chuẩn (dạng 02.xxxx hoặc lấy từ hợp đồng đã liên kết)
        let contractCode = (targetOrder['Mã HĐ Cyber'] || (targetOrder as any).ma_hd_cyber || targetOrder['Số hợp đồng'] || '').trim();
        
        // Nếu mã đang lưu là dạng số đơn hàng (N31...), đối soát nhanh trong danh sách cyberContracts
        if (!contractCode || contractCode.startsWith('N31') || !contractCode.includes('02.')) {
            const matchedContract = cyberContracts.find(c => 
                (c.ma_hd && c.ma_hd.includes('02.')) &&
                ((targetOrder['Số đơn hàng'] && c.ma_hd.includes(targetOrder['Số đơn hàng'])) ||
                 (c.ten_kh && targetOrder['Tên khách hàng'] && c.ten_kh.toLowerCase().trim() === targetOrder['Tên khách hàng'].toLowerCase().trim()) ||
                 (c.so_khung && targetOrder.VIN && c.so_khung.trim() === targetOrder.VIN.trim()))
            );
            if (matchedContract && matchedContract.ma_hd) {
                contractCode = matchedContract.ma_hd;
            }
        }

        const customerName = (targetOrder['Tên khách hàng'] || (targetOrder as any).ten_khach_hang || '').trim();

        if (!contractCode && !customerName) {
            setCyberDkbhError('Đơn hàng này chưa có thông tin Mã HĐ Cyber để tra cứu Điều Kiện Bán Hàng.');
            return;
        }

        setIsLoadingCyberDkbh(true);
        setCyberDkbhError(null);
        try {
            const res = await exportCyberPdf({
                so_ct: contractCode,
                ten_kh: customerName,
                so_vin: targetOrder.VIN || (targetOrder as any).so_vin,
                voucher_type: 'HDX',
                user_name: '02.NHANPT',
                force_refresh: force
            });
            if (res && res.success && (res.pdf_base64 || res.pdf_url)) {
                let url = res.pdf_url || '';
                if (res.pdf_base64) {
                    try {
                        const base64Clean = res.pdf_base64.replace(/^data:application\/pdf;base64,/, '');
                        const byteCharacters = atob(base64Clean);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: 'application/pdf' });
                        url = URL.createObjectURL(blob);
                    } catch (_) {
                        url = res.pdf_base64;
                    }
                } else if (url && url.startsWith('http')) {
                    url += (url.includes('?') ? '&' : '?') + `t=${Date.now()}`;
                }
                if (url) {
                    setCyberDkbhUrls(prev => ({ ...prev, [orderKey]: url }));
                }
            } else {
                setCyberDkbhError(res?.error || 'Không tìm thấy phiếu Đề nghị điều kiện bán hàng trên CyberSoft.');
            }
        } catch (err: any) {
            setCyberDkbhError(err?.message || 'Lỗi khi kết xuất phiếu từ CyberSoft.');
        } finally {
            setIsLoadingCyberDkbh(false);
        }
    };

    // Tự động tải hoặc cập nhật PDF ĐKBH Cyber khi chọn đơn hàng khác
    useEffect(() => {
        if (activeDocKey === 'CyberDKBH' && selectedOrder) {
            const orderKey = selectedOrder['Số đơn hàng'] || selectedOrder.id || '';
            if (orderKey && !cyberDkbhUrls[orderKey]) {
                loadCyberDkbhPdf(selectedOrder);
            }
        }
    }, [activeDocKey, selectedOrderId]);

    const [docZoom, setDocZoom] = useState<number>(100);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isAutoFetching, setIsAutoFetching] = useState(false);
    const [isBatchFetching, setIsBatchFetching] = useState(false);
    const [isCheckingDms, setIsCheckingDms] = useState(false);
    const copyWithFeedback = useCopyFeedback();
    const [isCyberAssignModalOpen, setIsCyberAssignModalOpen] = useState(false);
    const [cyberSheetAnchor, setCyberSheetAnchor] = useState<HTMLElement | null>(null);
    const [cyberContracts, setCyberContracts] = useState<CyberXepXeContract[]>(() => {
        try {
            const cached = sessionStorage.getItem('cyber_xep_xe_contracts_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (_) {}
        return [];
    });
    const [cyberApprovalConfirm, setCyberApprovalConfirm] = useState<{
        isOpen: boolean;
        action: 'approve' | 'revoke';
        contract: CyberXepXeContract;
        reason: string;
    } | null>(null);
    const [isSubmittingCyberApproval, setIsSubmittingCyberApproval] = useState(false);
    const [isLoadingCyberContracts, setIsLoadingCyberContracts] = useState<boolean>(() => {
        try {
            const cached = sessionStorage.getItem('cyber_xep_xe_contracts_cache');
            if (cached && JSON.parse(cached).length > 0) return false;
        } catch (_) {}
        return true;
    });

    useEffect(() => {
        let isMounted = true;
        const loadCyber = async () => {
            try {
                const now = new Date();
                const currY = now.getFullYear();
                const res = await getCyberXepXeContracts({
                    thang1: 1,
                    nam1: currY,
                    thang2: 12,
                    nam2: currY,
                    ma_dvcs: '02',
                    showroom: 'Ô tô Vinfast Thuận An'
                });
                if (isMounted && res && res.success && res.contracts) {
                    setCyberContracts(res.contracts);
                    try {
                        sessionStorage.setItem('cyber_xep_xe_contracts_cache', JSON.stringify(res.contracts));
                    } catch (_) {}
                }
            } catch (err) {
                console.warn('Lỗi tải hợp đồng CyberSoft:', err);
            } finally {
                if (isMounted) setIsLoadingCyberContracts(false);
            }
        };
        loadCyber();
        return () => { isMounted = false; };
    }, []);

    const handleCyberAssignSuccess = (vin: string, engineNo?: string, assignedContract?: CyberXepXeContract) => {
        if (selectedOrder) {
            selectedOrder.VIN = vin;
            selectedOrder.vin = vin;
            selectedOrder['SỐ VIN'] = vin;
            if (engineNo) {
                selectedOrder['Số máy'] = engineNo;
                selectedOrder.so_may = engineNo;
                selectedOrder['SỐ MÁY'] = engineNo;
                setEditData(prev => ({ ...prev, engineNumber: engineNo }));
            }
        }
        // Cập nhật danh sách hợp đồng Cyber trong state để ẩn ngay nút Ghép xe Cyber
        setCyberContracts(prev => {
            const targetMaHd = assignedContract?.ma_hd || selectedOrder?.['Số đơn hàng'];
            return prev.map(c => {
                if ((assignedContract && c.stt_rec === assignedContract.stt_rec) || (targetMaHd && c.ma_hd === targetMaHd)) {
                    return {
                        ...c,
                        so_khung: vin,
                        so_may: engineNo || c.so_may,
                        ten_color: 'Đã ghép SK'
                    };
                }
                return c;
            });
        });
    };

    const [isUnassigning, setIsUnassigning] = useState(false);

    const handleRefreshCyber = async () => {
        setIsLoadingCyberContracts(true);
        try {
            sessionStorage.removeItem('cyber_xep_xe_contracts_cache');
            const now = new Date();
            const currY = now.getFullYear();

            // 1. Nếu đang chọn đơn hàng cụ thể, tra cứu realtime trước theo VIN / Số ĐT / Tên KH / Số HĐ trực tiếp từ CyberSoft
            let directResult: any = null;
            if (selectedOrder) {
                try {
                    directResult = await checkOrderCyberAssignmentDirect(selectedOrder);
                    if (directResult?.contract) {
                        const dc = directResult.contract;
                        if (dc.so_khung && dc.so_khung.trim()) {
                            selectedOrder.VIN = dc.so_khung.trim();
                            selectedOrder.vin = dc.so_khung.trim();
                            selectedOrder['SỐ VIN'] = dc.so_khung.trim();
                        }
                        if (dc.so_may && dc.so_may.trim()) {
                            selectedOrder['Số máy'] = dc.so_may.trim();
                            selectedOrder.so_may = dc.so_may.trim();
                            selectedOrder['SỐ MÁY'] = dc.so_may.trim();
                            setEditData(prev => ({ ...prev, engineNumber: dc.so_may!.trim() }));
                        }

                        // Cập nhật ngay hợp đồng mới nhất vào state & sessionStorage
                        setCyberContracts(prev => {
                            const exists = prev.some(c => c.stt_rec === dc.stt_rec && c.stt_rec0 === dc.stt_rec0);
                            const updatedContracts = exists 
                                ? prev.map(c => (c.stt_rec === dc.stt_rec && c.stt_rec0 === dc.stt_rec0) ? { ...c, ...dc } : c)
                                : [dc, ...prev];
                            try {
                                sessionStorage.setItem('cyber_xep_xe_contracts_cache', JSON.stringify(updatedContracts));
                            } catch (_) {}
                            return updatedContracts;
                        });

                        const stDesc = dc.so_khung ? `Đã xếp xe (${dc.so_khung})` : (dc.ten_color || 'Chờ ghép SK');
                        showToast('Đã tải từ Cyber', `HĐ ${dc.ma_hd || ''}: ${stDesc} (Trực tiếp CyberSoft ERP)`, 'success');
                        return; // Hoàn tất tra cứu siêu tốc trong ~1s!
                    }
                } catch (dErr) {
                    console.warn('[handleRefreshCyber] Direct order check error:', dErr);
                }
            }

            // 2. Nếu không tìm thấy HĐ trực tiếp hoặc không có đơn hàng đang chọn, tải 2 tháng gần nhất (thay vì 12 tháng)
            const currM = now.getMonth() + 1;
            const res = await getCyberXepXeContracts({
                force: true,
                refresh: true,
                thang1: Math.max(1, currM - 1),
                nam1: currY,
                thang2: currM,
                nam2: currY,
                ma_dvcs: '02',
                showroom: 'Ô tô Vinfast Thuận An'
            });

            if (res && res.success && res.contracts) {
                setCyberContracts(res.contracts);
                try {
                    sessionStorage.setItem('cyber_xep_xe_contracts_cache', JSON.stringify(res.contracts));
                } catch (_) {}

                showToast('Đã tải từ Cyber', 'Đã tải dữ liệu mới nhất trực tiếp từ máy chủ CyberSoft ERP!', 'success');
            } else {
                throw new Error(res?.error || 'Không nhận được dữ liệu hợp đồng từ máy chủ CyberSoft ERP');
            }
        } catch (err: any) {
            showToast('Lỗi tải từ Cyber', err.message || 'Không thể đồng bộ dữ liệu trực tiếp từ CyberSoft.', 'error');
        } finally {
            setIsLoadingCyberContracts(false);
        }
    };

    const handleExecuteDirectCyberApproval = async () => {
        if (!cyberApprovalConfirm || !cyberApprovalConfirm.contract) return;
        const { action, contract: targetContract, reason } = cyberApprovalConfirm;
        setIsSubmittingCyberApproval(true);
        try {
            const currentUserName = (typeof window !== 'undefined' ? (localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser") || "") : "").toLowerCase().trim();
            const adminUser = currentUserName || 'admin';
            let res;
            if (action === 'approve') {
                res = await approveCyberContract({
                    stt_rec: targetContract.stt_rec,
                    ma_hd: targetContract.ma_hd,
                    reason,
                    admin_user: adminUser
                });
            } else {
                res = await revokeCyberContractApproval({
                    stt_rec: targetContract.stt_rec,
                    ma_hd: targetContract.ma_hd,
                    reason,
                    admin_user: adminUser
                });
            }

            if (!res || !res.success) {
                throw new Error(res?.error || (action === 'approve' ? 'Không thể duyệt hợp đồng' : 'Không thể hoàn tác duyệt'));
            }

            // Ghi audit log vào Supabase để bảo đảm an toàn và minh bạch nội bộ
            try {
                await supabase.from('cyber_audit_logs').insert({
                    action: action === 'approve' ? 'APPROVE_CONTRACT' : 'REVOKE_CONTRACT_APPROVAL',
                    stt_rec: targetContract.stt_rec,
                    ma_hd: targetContract.ma_hd,
                    ten_kh: targetContract.ten_kh,
                    so_khung: targetContract.so_khung || '',
                    admin_user: adminUser,
                    reason,
                    created_at: new Date().toISOString()
                });
            } catch (auditErr) {
                console.warn('[Audit Log] Không thể lưu cyber_audit_logs:', auditErr);
            }

            const newPost = action === 'approve' ? '3' : '2';
            const newColorName = action === 'approve' ? 'Chờ ghép SK' : 'Chờ duyệt';
            const newMaColor = action === 'approve' ? '06' : '04';
            const newBackColor = action === 'approve' ? 'yellow' : 'greenyellow';

            const updatedContract: CyberXepXeContract = {
                ...targetContract,
                ma_post: newPost,
                ten_color: newColorName,
                ma_color: newMaColor,
                back_color: newBackColor
            };

            setCyberContracts(prev => prev.map(c => 
                (c.stt_rec === targetContract.stt_rec && c.stt_rec0 === targetContract.stt_rec0) 
                    ? updatedContract 
                    : c
            ));

            showToast(
                action === 'approve' ? 'Duyệt thành công' : 'Hoàn tác thành công',
                res.message || (action === 'approve' ? `Hợp đồng ${targetContract.ma_hd} đã chuyển sang Màu vàng (Chờ ghép SK)` : `Hợp đồng ${targetContract.ma_hd} đã quay lại Màu xanh (Chờ duyệt)`),
                'success',
                5000
            );

            setCyberApprovalConfirm(null);

            // Làm mới dữ liệu Cyber trực tiếp
            handleRefreshCyber();
        } catch (err: any) {
            showToast('Lỗi thao tác Cyber', err.message || 'Có lỗi xảy ra', 'error', 6000);
        } finally {
            setIsSubmittingCyberApproval(false);
        }
    };

    const handleUnassignCyberCar = async () => {
        const contract = cyberAssignmentStatus.contract;
        const vinToUnassign = cyberAssignmentStatus.cyberVin || selectedOrder?.VIN;
        if (!contract || !vinToUnassign) {
            showToast('Không tìm thấy xe', 'Không có thông tin xe ghép trên CyberSoft ERP.', 'warning');
            return;
        }
        const confirmMsg = `Bạn có chắc chắn muốn hủy ghép xe ${vinToUnassign} khỏi hợp đồng (${contract.ma_hd}) trên CyberSoft ERP không?`;
        if (!window.confirm(confirmMsg)) return;

        setIsUnassigning(true);
        try {
            const res = await deleteCyberXepXe({
                ma_hd: contract.ma_hd,
                stt_rec: contract.stt_rec,
                stt_rec0: contract.stt_rec0,
                so_khung: vinToUnassign,
                ma_dvcs: contract.ma_dvcs || '02',
                user_name: 'SYSTEM'
            });

            if (!res || !res.success) {
                throw new Error(res?.error || res?.note || 'Không thể hủy ghép xe trên CyberSoft ERP');
            }

            // Cập nhật bảng cyber_xep_xe trên Supabase
            if (contract.stt_rec) {
                await supabase
                    .from('cyber_xep_xe')
                    .update({ so_khung: '', ten_color: 'Chờ ghép SK', updated_at: new Date().toISOString() })
                    .match({ stt_rec: contract.stt_rec, stt_rec0: contract.stt_rec0 });
            }

            showToast('Hủy ghép thành công', `Đã gỡ số khung ${vinToUnassign} khỏi HĐ ${contract.ma_hd} trên CyberSoft ERP!`, 'success');

            // Cập nhật lại state cyberContracts
            setCyberContracts(prev => prev.map(c => 
                c.stt_rec === contract.stt_rec && c.stt_rec0 === contract.stt_rec0 
                    ? { ...c, so_khung: '', so_may: '', ten_color: 'Chờ ghép SK' } 
                    : c
            ));
        } catch (err: any) {
            showToast('Lỗi hủy ghép xe', err.message || 'Không thể gỡ xe trên Cyber', 'error');
        } finally {
            setIsUnassigning(false);
        }
    };

    useEffect(() => {
        const fetchPolicies = async () => {
            try {
                const { data } = await supabase
                    .from('chinhsach')
                    .select('ten_chinh_sach, dong_xe')
                    .eq('trang_thai', 'Hoạt động')
                    .order('ten_chinh_sach', { ascending: true });
                if (data) {
                    setDbPolicies(data);
                }
            } catch (e) {
                console.error('Lỗi fetch policies từ supabase', e);
            }
        };
        fetchPolicies();
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && selectedOrder) {
            onAction('uploadInvoice', selectedOrder, { file });
        }
        // Reset input value to allow selecting the same file again
        if (event.target) event.target.value = '';
    };

    const handleAutoFetchMInvoice = async () => {
        if (!selectedOrder) return;
        const vin = (selectedOrder.VIN || selectedOrder.vin || selectedOrder['SỐ VIN'] || selectedOrder['Số VIN'] || '').trim().toUpperCase();
        if (!vin) {
            showToast('Chưa có số VIN', 'Đơn hàng này chưa có thông tin số VIN (số khung) để tra cứu M-Invoice.', 'error');
            return;
        }

        setIsAutoFetching(true);
        showToast('Đang tra cứu M-Invoice', `Đang kiểm tra hóa đơn cho số VIN: ${vin}...`, 'info');

        try {
            const orderNo = (selectedOrder['Số đơn hàng'] || selectedOrder.so_don_hang || '').trim();
            const res = await syncAndNotifyMInvoice(vin, orderNo);

            if (!res.success) {
                if (res.status === 'UNSIGNED') {
                    showToast('Hóa đơn chưa ký', res.message, 'warning', 6000);
                } else if (res.status === 'NOT_FOUND') {
                    showToast('Không tìm thấy', res.message, 'warning', 6000);
                } else {
                    showToast('Thông báo M-Invoice', res.message, 'error', 6000);
                }
                return;
            }

            showToast('Thành công', res.message || 'Đã lấy HĐ, lưu Supabase và gửi email thành công!', 'success', 6000);
            onAction('uploadInvoice', selectedOrder, { url: res.data?.url });
        } catch (err: any) {
            showToast('Lỗi', err.message || 'Không thể lấy hóa đơn M-Invoice.', 'error');
        } finally {
            setIsAutoFetching(false);
        }
    };

    const handleBatchFetchMInvoice = async () => {
        const pendingOrders = filteredOrders.filter(o => {
            const s = (o['Trạng thái xử lý'] || o['Kết quả'] || '').toLowerCase().trim().normalize('NFC');
            const hasInvoice = !!(o['Link hóa đơn đã xuất'] || o.link_hoa_don_da_xuat || o.url_hoa_don_da_xuat);
            return (s === 'chờ ký hóa đơn' || s === 'chờ ký hóa đơn') && !hasInvoice;
        });

        if (pendingOrders.length === 0) {
            showToast('Thông báo', 'Không có đơn hàng nào đang ở trạng thái Chờ Ký Hóa Đơn (chưa có hóa đơn).', 'info');
            return;
        }

        setIsBatchFetching(true);
        showToast('Bắt đầu quét hàng loạt', `Đang quét kiểm tra M-Invoice cho ${pendingOrders.length} xe đang chờ ký (chế độ song song siêu tốc)...`, 'info');

        let signedCount = 0;
        let unsignedCount = 0;
        let notFoundCount = 0;

        // Xử lý song song từng cụm 3 xe đồng thời để tăng tốc độ gấp 3 lần
        const CHUNK_SIZE = 3;
        for (let i = 0; i < pendingOrders.length; i += CHUNK_SIZE) {
            const chunk = pendingOrders.slice(i, i + CHUNK_SIZE);
            const progressMsg = `Đang quét xe ${i + 1} - ${Math.min(i + CHUNK_SIZE, pendingOrders.length)} / ${pendingOrders.length}...`;
            showToast('Tiến độ quét M-Invoice', progressMsg, 'info', 2500);

            await Promise.all(chunk.map(async (order) => {
                const vin = (order.VIN || order.vin || order['SỐ VIN'] || order['Số VIN'] || '').trim().toUpperCase();
                const orderNo = (order['Số đơn hàng'] || order.so_don_hang || '').trim();
                if (!vin) return;

                try {
                    const res = await syncAndNotifyMInvoice(vin, orderNo);
                    if (res.success) {
                        if (res.status !== 'ALREADY_COMPLETED') {
                            signedCount++;
                        }
                        onAction('uploadInvoice', order, { url: res.data?.url });
                    } else if (res.status === 'UNSIGNED') {
                        unsignedCount++;
                    } else {
                        notFoundCount++;
                    }
                } catch (_) {
                    notFoundCount++;
                }
            }));
        }

        setIsBatchFetching(false);
        if (signedCount > 0) {
            showToast('Hoàn tất quét M-Invoice', `Đã tự động lấy và xuất hóa đơn cho ${signedCount} xe! (${unsignedCount} xe chưa ký số)`, 'success', 6000);
        } else {
            showToast('Kết quả quét M-Invoice', `Đã kiểm tra ${pendingOrders.length} xe: ${unsignedCount} xe CHƯA KÝ SỐ, ${notFoundCount} xe chưa có HĐ trên M-Invoice.`, 'warning', 6000);
        }
    };

    const handleBatchDmsCheckApproved = async (_checkAll = false, singleOrderNo?: string) => {
        if (isCheckingDms) return;
        setIsCheckingDms(true);
        const targetOrderList = singleOrderNo
            ? filteredOrders.filter(o => ((o['Số đơn hàng'] || (o as any).so_don_hang || '').trim()) === singleOrderNo)
            : filteredOrders;

        const targets = targetOrderList.map(o => ({
            orderNo: (o['Số đơn hàng'] || (o as any).so_don_hang || '').trim(),
            vin: (o['VIN'] || o['vin'] || o['SỐ VIN'] || o['Số VIN'] || '').trim(),
            customerName: (o['Tên khách hàng'] || (o as any).ten_khach_hang || '').trim(),
            showroom: (o['Mã DMS'] || o['ma_dms'] || '').trim(),
            currentStatus: (o['Trạng thái xử lý'] || (o as any).ket_qua || o['Kết quả'] || '').trim()
        })).filter(o => Boolean(o.orderNo));

        const countMsg = singleOrderNo ? `đơn ${singleOrderNo}` : `${targets.length} đơn hàng`;
        showToast('Bắt đầu tra cứu', `Đang đối soát VSO/VIN trên hệ thống NDP Dealer Portal cho ${countMsg}...`, 'info', 4000);
        try {
            const cleanRes = await checkNdpApprovedOrders(targets);


            if (cleanRes && cleanRes.success) {
                setDmsReportResult(cleanRes);
                if (cleanRes.transitioned_count > 0) {
                    showToast('Thành công', `Đã tìm thấy ${cleanRes.transitioned_count}/${cleanRes.total_checked} đơn hàng có HĐ trên NDP! Báo cáo chi tiết đang hiển thị.`, 'success', 6000);
                } else {
                    showToast('Kết quả tra cứu', `Đã kiểm tra ${cleanRes.total_checked || targets.length} đơn. Xem báo cáo chi tiết trên màn hình.`, 'info', 5000);
                }
            } else {
                showToast('Thông báo', cleanRes?.error || 'Không thể đối soát. Kiểm tra phiên đăng nhập NDP VHKD_01 và kết nối máy chủ.', 'warning', 6000);
            }
        } catch (err: any) {
            showToast('Lỗi', err.message || 'Lỗi khi tra cứu NDP.', 'error', 5000);
        } finally {
            setIsCheckingDms(false);
        }
    };

    // Kiểm tra trạng thái đơn hàng đã được xếp xe trên CyberSoft ERP hay chưa
    const cyberAssignmentStatus = useMemo(() => {
        return isOrderAssignedOnCyber(selectedOrder, cyberContracts);
    }, [selectedOrder, cyberContracts]);

    const currentCarModel = useMemo(() => {
        return (selectedOrder?.['Dòng xe'] || selectedOrder?.dong_xe || selectedOrder?.['DÒNG XE'] || '').trim();
    }, [selectedOrder]);

    const filteredDbPolicies = useMemo(() => {
        const modelLower = currentCarModel.toLowerCase();
        const search = policySearchQuery.trim().toLowerCase();
        const selectedPoliciesList = editData.policy.split('; ').filter(Boolean);

        return dbPolicies.filter(p => {
            const policyName = p.ten_chinh_sach || '';
            const policyDongXe = (p.dong_xe || '').trim().toLowerCase();
            const isChecked = selectedPoliciesList.includes(policyName);

            // Search query filter
            if (search) {
                const matchesSearch = policyName.toLowerCase().includes(search) || policyDongXe.includes(search);
                if (!matchesSearch && !isChecked) return false;
            }

            // Car model filter (if active and order has a car model)
            if (policyFilterModelOnly && modelLower && !search) {
                if (isChecked) return true; // Keep selected policies visible

                // Apply to all models if empty or "tất cả"
                if (!policyDongXe || policyDongXe === '' || policyDongXe.includes('tất cả')) {
                    return true;
                }

                // Match model name (e.g. "VF 3" matches "VF 3" or "VF 3, VF 5")
                const isModelMatch = policyDongXe.includes(modelLower) || modelLower.includes(policyDongXe);
                if (!isModelMatch) return false;
            }

            return true;
        });
    }, [dbPolicies, currentCarModel, editData.policy, policyFilterModelOnly, policySearchQuery]);

    // Auto-select first order if none selected or folder changes (Robust version)
    useEffect(() => {
        if (filteredOrders.length > 0) {
            const firstId = filteredOrders[0]['Số đơn hàng'];
            onOrderSelect(firstId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFolder]);

    // Tự động kiểm tra nhanh trực tiếp Cyber ERP cho đơn hàng đang chọn (< 1s) nếu chưa ghép xe hoặc cần cập nhật
    useEffect(() => {
        if (!selectedOrder) return;
        const currentCheck = isOrderAssignedOnCyber(selectedOrder, cyberContracts);
        if (currentCheck.isAssigned) return;

        let isCancelled = false;
        checkOrderCyberAssignmentDirect(selectedOrder).then(res => {
            if (isCancelled || !res?.contract) return;
            const dc = res.contract;
            setCyberContracts(prev => {
                const exists = prev.some(c => c.stt_rec === dc.stt_rec && c.stt_rec0 === dc.stt_rec0);
                const updated = exists 
                    ? prev.map(c => (c.stt_rec === dc.stt_rec && c.stt_rec0 === dc.stt_rec0) ? { ...c, ...dc } : c)
                    : [dc, ...prev];
                try {
                    sessionStorage.setItem('cyber_xep_xe_contracts_cache', JSON.stringify(updated));
                } catch (_) {}
                return updated;
            });
        }).catch(() => {});

        return () => { isCancelled = true; };
    }, [selectedOrderId]);

    // Tự động tải Đề nghị điều kiện bán hàng (Cyber) khi admin đang xem tab CyberDKBH
    useEffect(() => {
        if (activeDocKey === 'CyberDKBH' && selectedOrder) {
            loadCyberDkbhPdf(selectedOrder);
        }
    }, [activeDocKey, selectedOrderId]);

    // Sync edit data
    useEffect(() => {
        if (selectedOrder && !isEditing) {
            setEditData({
                engineNumber: selectedOrder["Số máy"] || '',
                policy: selectedOrder["CHÍNH SÁCH"] || '',
                commission: selectedOrder["Hoa hồng ứng"] || '',
                vpoint: selectedOrder["Điểm Vpoint sử dụng"] || ''
            });
        }
    }, [selectedOrder, isEditing]);

    const handleSaveEdit = async () => {
        if (!selectedOrder || !onUpdateInvoiceDetails) return;
        setIsSaving(true);
        const success = await onUpdateInvoiceDetails(selectedOrder['Số đơn hàng'], editData);
        setIsSaving(false);
        if (success) setIsEditing(false);
    };

    const folders = useMemo(() => {
        const counts = {
            pending_approval: 0,
            approved: 0,
            request_supplement: 0,
            supplemented: 0,
            pending_signature: 0,
            completed: 0
        };

        orders.forEach(o => {
            const s = (o['Trạng thái xử lý'] || o['Kết quả'] || '').toLowerCase().trim().normalize('NFC');
            if (s === 'chờ phê duyệt') counts.pending_approval++;
            else if (s === 'đã phê duyệt') counts.approved++;
            else if (s === 'yêu cầu bổ sung') counts.request_supplement++;
            else if (s === 'đã bổ sung') counts.supplemented++;
            else if (s === 'chờ ký hóa đơn' || s === 'chờ ký hóa đơn') counts.pending_signature++;
            else if (s === 'đã xuất hóa đơn') counts.completed++;
        });

        return [
            { id: 'pending_approval', label: 'Chờ Phê Duyệt', icon: 'fa-clock', count: counts.pending_approval },
            { id: 'approved', label: 'Đã Phê Duyệt', icon: 'fa-check', count: counts.approved },
            { id: 'request_supplement', label: 'Yêu Cầu Bổ Sung', icon: 'fa-exclamation-circle', count: counts.request_supplement },
            { id: 'supplemented', label: 'Đã Bổ Sung', icon: 'fa-plus-circle', count: counts.supplemented },
            { id: 'pending_signature', label: 'Chờ Ký Hóa Đơn', icon: 'fa-file-signature', count: counts.pending_signature },
            { id: 'completed', label: 'Đã Xuất Hóa Đơn', icon: 'fa-check-double', count: counts.completed },
            { id: 'all', label: 'Tất Cả', icon: 'fa-list', count: orders.length },
        ];
    }, [orders]);

    const getActions = (status: string) => {
        const s = status.toLowerCase().trim().normalize('NFC');
        const adminNotes = (selectedOrder?.['Ghi chú Admin'] || selectedOrder?.ghi_chu_admin || (selectedOrder as any)?.ghi_chu_admin || '').toString();
        const isAlreadyRequestedRescan = adminNotes.includes('[YÊU CẦU SCAN LẠI]');

        return [
            { type: 'approve', label: 'Phê Duyệt', icon: 'fa-check-double', variant: 'primary', condition: s === 'chờ phê duyệt' || s === 'đã bổ sung' },
            { type: 'supplement', label: 'Yêu Cầu Bổ Sung', icon: 'fa-exclamation-triangle', variant: 'secondary', condition: s === 'chờ phê duyệt' || s === 'đã bổ sung' },
            { type: 'rescan', label: 'Y/C Scan Lại', icon: 'fa-camera', variant: 'secondary', condition: s !== 'đã hủy' && !isAlreadyRequestedRescan },
            { type: 'pendingSignature', label: 'Chuyển Chờ Ký', icon: 'fa-signature', variant: 'primary', condition: s === 'đã phê duyệt' },
            {
                type: 'autoMInvoice',
                label: isAutoFetching ? 'Đang Lấy M-Invoice...' : '⚡ Lấy HĐ M-Invoice',
                icon: isAutoFetching ? 'fa-spinner fa-spin' : 'fa-bolt',
                variant: 'primary',
                condition: s === 'chờ ký hóa đơn' || s === 'chờ ký hóa đơn',
                onClick: handleAutoFetchMInvoice
            },
            {
                type: 'uploadInvoice',
                label: 'Tải Lên Hóa Đơn',
                icon: 'fa-upload',
                variant: 'success',
                condition: s === 'chờ ký hóa đơn' || s === 'chờ ký hóa đơn',
                onClick: () => fileInputRef.current?.click()
            },
            { type: 'resend', label: 'Gửi Lại Email', icon: 'fa-paper-plane', variant: 'secondary', condition: s === 'yêu cầu bổ sung' || s === 'đã xuất hóa đơn' },
            { 
                type: 'migrateToDrive', 
                label: 'Bốc sang Drive', 
                icon: 'fa-cloud-upload-alt', 
                variant: 'secondary',
                condition: s !== 'đã xuất hóa đơn' && s !== 'đã hủy' && 
                          ((selectedOrder?.LinkHopDong && selectedOrder.LinkHopDong.includes('supabase.co')) || 
                           (selectedOrder?.LinkDeNghiXHD && selectedOrder.LinkDeNghiXHD.includes('supabase.co')))
            },
            { type: 'cancel', label: 'Hủy Yêu Cầu', icon: 'fa-trash-alt', variant: 'danger', condition: s !== 'đã xuất hóa đơn' && s !== 'đã hủy' && s !== 'chờ ký hóa đơn' && s !== 'chờ ký hóa đơn' },
        ].filter(a => a.condition);
    };


    // Mobile View State
    const [, setMobileView] = useState<'folders' | 'list' | 'detail'>('folders');

    // Update mobile view when folder or order changes
    const handleFolderChange = (folder: string) => {
        onFolderChange(folder);
        setMobileView('list');
    };

    const handleOrderSelect = (orderId: string | null) => {
        onOrderSelect(orderId);
        if (orderId) setMobileView('detail');
    };

    // Swipe Navigation Logic
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe || isRightSwipe) {
            const currentIndex = filteredOrders.findIndex(o => o['Số đơn hàng'] === selectedOrderId);
            if (currentIndex === -1) return;

            if (isLeftSwipe && currentIndex < filteredOrders.length - 1) {
                // Next Order
                handleOrderSelect(filteredOrders[currentIndex + 1]['Số đơn hàng']);
            } else if (isRightSwipe && currentIndex > 0) {
                // Previous Order
                handleOrderSelect(filteredOrders[currentIndex - 1]['Số đơn hàng']);
            }
        }
    };

    // Group orders by Invoice Date for 'pending_signature' and 'completed' folders
    const groupedOrders = useMemo(() => {
        if (selectedFolder !== 'pending_signature' && selectedFolder !== 'completed') return null;

        const groups: { [key: string]: Order[] } = {};
        filteredOrders.forEach(order => {
            const dateVal = order['Ngày xuất hóa đơn'];
            const dateStr = dateVal ? moment(dateVal).format('DD/MM/YYYY') : 'Chưa có ngày';
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(order);
        });

        // Return array of [date, orders] sorted by date descending
        return Object.entries(groups).sort((a, b) => {
            if (a[0] === 'Chưa có ngày') return 1;
            if (b[0] === 'Chưa có ngày') return -1;
            // moment comparison for DD/MM/YYYY
            const dateA = moment(a[0], 'DD/MM/YYYY').valueOf();
            const dateB = moment(b[0], 'DD/MM/YYYY').valueOf();
            return dateB - dateA;
        });
    }, [filteredOrders, selectedFolder]);

    const renderOrder = (order: Order) => {
        const isSelected = selectedOrderId === order['Số đơn hàng'];
        const status = order['Trạng thái xử lý'] || order['Kết quả'] || 'Chờ duyệt';
        const date = moment(order['Ngày xuất hóa đơn'] || order['Thời gian nhập'], [moment.ISO_8601, 'DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY'], true);
        const getTone = (st: string) => {
            const s = (st || '').toLowerCase();
            if (/hủy|từ chối/.test(s)) return 'red';
            if (/đã xuất|hoàn tất|hoàn thành/.test(s)) return 'green';
            if (/chờ|yêu cầu bổ sung/.test(s)) return 'amber';
            if (/đã ghép|đã phê duyệt|đã bổ sung/.test(s)) return 'blue';
            return 'gray';
        };

        return (
            <button
                type="button"
                key={order['Số đơn hàng']}
                className="premium-order-row"
                aria-pressed={isSelected}
                onClick={(e) => {
                    handleOrderSelect(order['Số đơn hàng']);
                    setMobileView('detail');
                    copyWithFeedback(order['Tên khách hàng'], e);
                }}
            >
                <span className="premium-row-top">
                    <strong>{order['Tên khách hàng'] || 'Chưa có tên'}</strong>
                    <span className="premium-status" data-tone={getTone(status)}>
                        <i />
                        {status}
                    </span>
                </span>
                <span className="premium-row-bottom">
                    <span>{order['Dòng xe']} · {order['Phiên bản'] || '—'}</span>
                    <time>{date.isValid() ? date.format('DD/MM/YYYY') : '—'}</time>
                </span>
                <span className="premium-row-id">{order['Số đơn hàng']}</span>
            </button>
        );
    };

    return (
        <>
            {/* Dedicated iOS Mobile Invoice View (< 768px) */}
            <div className="flex md:hidden h-full w-full flex-col overflow-hidden bg-[#F2F2F7]">
                <MobileInvoiceView
                    orders={orders}
                    onAction={onAction}
                    showToast={showToast}
                    onOpenFilePreview={onOpenFilePreview}
                    onUpdateInvoiceDetails={onUpdateInvoiceDetails}
                    selectedFolder={selectedFolder}
                    selectedOrderId={selectedOrderId}
                    onFolderChange={handleFolderChange}
                    onOrderSelect={handleOrderSelect}
                    processingId={processingId}
                    processingActionType={processingActionType}
                    isLoading={isLoading}
                    onBackToAdminHome={onBackToAdminHome}
                    onOpenActionMenu={onOpenActionMenu}
                    onBatchFetchInvoices={handleBatchFetchMInvoice}
                    onBatchCheckDms={() => handleBatchDmsCheckApproved(false)}
                    isBatchFetching={isBatchFetching}
                    isCheckingDms={isCheckingDms}
                />
            </div>

            {/* Desktop invoice workspace (>= 768px) */}
            <div className="hidden md:grid premium-orders invoice-workspace">

                {/* Column 1: Folders */}
                <div className="hidden">
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {folders.map(folder => {
                        const isActive = selectedFolder === folder.id;
                        return (
                            <button
                                key={folder.id}
                                onClick={() => handleFolderChange(folder.id)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <i className={`fas ${folder.icon} w-4 text-center text-xs opacity-80`}></i>
                                    <span>{folder.label}</span>
                                </div>
                                {folder.count > 0 && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                        isActive ? 'bg-blue-700 text-white' : 'bg-slate-200/80 text-slate-700 border border-slate-200'
                                    }`}>
                                        {folder.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Bật/Tắt kiểm soát so sánh NDP khi TVBH gửi XHĐ */}
                <div className="p-2.5 border-t border-slate-200 bg-slate-50/70">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1.5">
                        <span className="flex items-center gap-1.5 truncate">
                            <i className={`fas ${isDmsCompareXhdEnabled ? 'fa-shield-halved text-emerald-600' : 'fa-shield text-slate-400'}`} />
                            <span>So sánh DMS (gửi XHĐ)</span>
                        </span>
                        <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold ${
                            isDmsCompareXhdEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                            {isDmsCompareXhdEnabled ? 'BẬT' : 'TẮT'}
                        </span>
                    </div>
                    {handleToggleDmsCompareXhdGlobal && (
                        <button
                            type="button"
                            onClick={handleToggleDmsCompareXhdGlobal}
                            disabled={isTogglingDmsCompareXhd}
                            className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all shadow-2xs border cursor-pointer ${
                                isDmsCompareXhdEnabled
                                    ? 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-300'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                            }`}
                            title="Bật/Tắt kiểm soát bắt buộc khớp cấu hình với VinFast DMS khi TVBH gửi yêu cầu xuất hóa đơn"
                        >
                            <i className={`fas ${isTogglingDmsCompareXhd ? 'fa-spinner fa-spin' : isDmsCompareXhdEnabled ? 'fa-power-off' : 'fa-check'}`} />
                            <span>{isDmsCompareXhdEnabled ? 'Tắt kiểm soát DMS' : 'Bật kiểm soát DMS'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Column 2: List */}
            <aside className="premium-orders-sidebar" aria-label="Danh sách hóa đơn">
                {/* Mobile Back Button */}
                <div className="premium-list-heading">
                    <h1>Hóa đơn <span>{filteredOrders.length}</span></h1>
                    <div className="flex items-center gap-1">
                        
                    </div>
                </div>

                <div id="invoice-sidebar-filter-target" className="invoice-sidebar-filter-target" />
                <div className="invoice-folder-tabs">
                    {folders.map(folder => {
                        const isActive = selectedFolder === folder.id;
                        return (
                            <button
                                key={folder.id}
                                aria-pressed={isActive}
                                type="button"
                                onClick={() => handleFolderChange(folder.id)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                                    isActive
                                        ? 'bg-slate-900 text-white font-bold'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {folder.label} {folder.count > 0 ? `(${folder.count})` : ''}
                            </button>
                        );
                    })}
                </div>
                <div className="hidden">
                    <button onClick={() => setMobileView('folders')} className="p-1.5 hover:bg-surface-ground rounded-full">
                        <i className="fas fa-arrow-left text-gray-500"></i>
                    </button>
                    <span className="font-bold text-sm">
                        {folders.find(f => f.id === selectedFolder)?.label || 'Danh sách'}
                    </span>
                </div>

                {/* Batch NDP check button for Approved folder */}
                {selectedFolder === 'approved' && filteredOrders.length > 0 && (
                    <div className="invoice-batch-tools p-2 border-b border-border-secondary">
                        <button
                            onClick={() => handleBatchDmsCheckApproved(false)}
                            disabled={isCheckingDms}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] text-white rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                            title="Tự động đối soát trên VinFast NDP Dealer Portal, chỉ chuyển đơn Đã phê duyệt khi khớp mã đơn, VIN, đại lý và trạng thái xuất hóa đơn"
                        >
                            <i className={`fas ${isCheckingDms ? 'fa-spinner fa-spin' : 'fa-robot'} text-[11px]`}></i>
                            <span>{isCheckingDms ? 'Đang Tra Cứu NDP...' : `⚡ Tra NDP Tự Động Chờ Ký (${filteredOrders.length})`}</span>
                        </button>
                    </div>
                )}

                {/* Batch NDP check button for ALL folders */}
                {selectedFolder === 'all' && filteredOrders.length > 0 && (
                    <div className="invoice-batch-tools p-2 border-b border-border-secondary">
                        <button
                            onClick={() => handleBatchDmsCheckApproved(false)}
                            disabled={isCheckingDms}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] text-white rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                            title="Tra NDP cho danh sách; chỉ đơn Đã phê duyệt đủ điều kiện mới được chuyển Chờ ký"
                        >
                            <i className={`fas ${isCheckingDms ? 'fa-spinner fa-spin' : 'fa-sync-alt'} text-[11px]`}></i>
                            <span>{isCheckingDms ? 'Đang Tra NDP Lại...' : `⚡ Tra NDP Lại Tất Cả Đơn (${filteredOrders.length})`}</span>
                        </button>
                    </div>
                )}

                {/* Batch NDP check button for Invoiced folder */}
                {selectedFolder === 'invoiced' && filteredOrders.length > 0 && (
                    <div className="invoice-batch-tools p-2 border-b border-border-secondary">
                        <button
                            onClick={() => handleBatchDmsCheckApproved(false)}
                            disabled={isCheckingDms}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] text-white rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                            title="Đối soát lại mã đơn, VIN và trạng thái hóa đơn trên VinFast NDP cho các đơn đã xuất"
                        >
                            <i className={`fas ${isCheckingDms ? 'fa-spinner fa-spin' : 'fa-robot'} text-[11px]`}></i>
                            <span>{isCheckingDms ? 'Đang Đối Soát NDP...' : `🔄 Đối Soát NDP Đơn Đã Xuất (${filteredOrders.length})`}</span>
                        </button>
                    </div>
                )}

                {/* Batch M-Invoice button for Pending Signature folder */}
                {selectedFolder === 'pending_signature' && filteredOrders.length > 0 && (
                    <div className="invoice-batch-tools p-2 border-b border-border-secondary flex flex-col gap-1.5">
                        <button
                            onClick={handleBatchFetchMInvoice}
                            disabled={isBatchFetching}
                            className="w-full flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                            title="Tự động kiểm tra trên M-Invoice và tải lên tất cả các xe đã ký số"
                        >
                            <i className={`fas ${isBatchFetching ? 'fa-spinner fa-spin' : 'fa-bolt'} text-[11px]`}></i>
                            <span>{isBatchFetching ? 'Đang quét hóa đơn…' : `Quét hóa đơn (${filteredOrders.length})`}</span>
                        </button>
                        <button
                            onClick={() => handleBatchDmsCheckApproved(true)}
                            disabled={isCheckingDms}
                            className="w-full flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                            title="Kiểm tra lại trạng thái hóa đơn trên NDP cho các đơn này"
                        >
                            <i className={`fas ${isCheckingDms ? 'fa-spinner fa-spin' : 'fa-sync-alt'} text-[10px]`}></i>
                            <span>{isCheckingDms ? 'Đang kiểm tra NDP…' : `Đối soát NDP (${filteredOrders.length})`}</span>
                        </button>
                    </div>
                )}

                <div className="premium-order-list" aria-busy={isLoading}>
                    {isLoading && filteredOrders.length === 0 ? (
                        <div className="divide-y divide-border-secondary">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="p-4 md:p-3 flex items-center justify-between">
                                    <div className="flex-1 space-y-2">
                                        <div className="skeleton-item h-4 w-3/4 rounded-md"></div>
                                        <div className="skeleton-item h-3 w-1/2 rounded-md"></div>
                                    </div>
                                    <div className="skeleton-item h-10 w-16 rounded-lg ml-3"></div>
                                </div>
                            ))}
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 h-full bg-slate-50/50">
                            <div className="w-16 h-16 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center mb-4">
                                <i className="fas fa-inbox text-gray-300 text-2xl"></i>
                            </div>
                            <p className="text-sm font-semibold text-gray-400 text-center">Không có đơn hàng</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border-secondary">
                            {groupedOrders ? (
                                groupedOrders.map(([date, groupOrders]) => (
                                    <React.Fragment key={date}>
                                        <div className="bg-surface-ground px-3 py-2 text-xs font-bold text-text-secondary sticky top-0 z-10 border-b border-border-secondary flex justify-between items-center shadow-sm">
                                            <span>{date}</span>
                                            <span className="bg-surface-card px-1.5 py-0.5 rounded-full text-[10px] border border-border-secondary">{groupOrders.length}</span>
                                        </div>
                                        {groupOrders.map(order => renderOrder(order))}
                                    </React.Fragment>
                                ))
                            ) : (
                                filteredOrders.map(order => renderOrder(order))
                            )}
                        </div>
                    )}

                </div>

                <div className="premium-list-footer flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                            <span>{filteredOrders.length} đơn</span>
                            <span className="flex items-center gap-1 font-semibold text-slate-600">
                                <i className={`fas ${isDmsCompareXhdEnabled ? 'fa-shield-halved text-emerald-600' : 'fa-shield text-slate-400'}`} />
                                DMS: {isDmsCompareXhdEnabled ? 'BẬT' : 'TẮT'}
                            </span>
                        </div>
                    </div>
            </aside>

            {/* Column 2: Detail Workspace */}
            <div
                className={`premium-order-content ${'invoice-split-view'}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {
                    selectedOrder ? (
                        <>
                            {/* Header Actions - Compact */}
                            <div className={`bg-white border-b border-gray-100 z-10 ${'lg:hidden'}`}>
                                <div className="px-4 md:px-5 py-2 md:py-2 flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {/* Mobile Back Button - Premium Refined */}
                                        <button
                                            onClick={() => setMobileView('list')}
                                            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 active:scale-90 transition-all shadow-sm"
                                        >
                                            <i className="fas fa-arrow-left text-xs"></i>
                                        </button>

                                        <div className="hidden">
                                            {selectedOrder['Tên khách hàng'].charAt(0)}
                                        </div>

                                        <div className="space-y-1 flex-1 min-w-0 overflow-hidden">
                                            <div className="min-w-0 flex-1 overflow-hidden">
                                                <MarqueeText 
                                                    text={selectedOrder['Tên khách hàng'] || '—'}
                                                    className="font-black text-base text-slate-900 leading-none cursor-pointer hover:text-blue-600 transition-colors uppercase"
                                                    title="Click để sao chép tên khách hàng"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        copyWithFeedback(selectedOrder['Tên khách hàng'], e);
                                                    }}
                                                />
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-medium">
                                                <span>TVBH: <strong className="text-slate-900">{selectedOrder['Tên tư vấn bán hàng'] || 'Chưa rõ'}</strong></span>
                                            </div>
                                        </div>

                                        {(() => {
                                            const rawPolicies = selectedOrder['CHÍNH SÁCH'] || '';
                                            const explicitAiNote = selectedOrder['Ghi chú AI'] || '';
                                            const aiNotes: string[] = [];
                                            
                                            if (explicitAiNote) {
                                                if (explicitAiNote.includes(' | ')) {
                                                    const parts = explicitAiNote.split(' | ');
                                                    parts.forEach((p: string) => { if (p.trim()) aiNotes.push(p.trim()); });
                                                } else { 
                                                    aiNotes.push(explicitAiNote.trim()); 
                                                }
                                            }
                                            
                                            const successMatch = rawPolicies.match(/✅[^⚠️]*(?=(?:⚠️)|$)/);
                                            if (successMatch) {
                                                const match = successMatch[0].trim();
                                                if (!aiNotes.some(n => n.includes(match) || match.includes(n))) aiNotes.push(match);
                                            }
                                            
                                            const errorMatch = rawPolicies.match(/⚠️[^✅]*(?=(?:✅)|$)/);
                                            if (errorMatch) {
                                                const match = errorMatch[0].trim();
                                                if (!aiNotes.some(n => n.includes(match) || match.includes(n))) aiNotes.push(match);
                                            }

                                            // @ts-ignore
                                            selectedOrder._aiNotes = aiNotes;
                                            return null;
                                        })()}
                                    </div>

                                    <div className="flex items-center gap-3 ml-auto">
                                        

                                        <div className="flex items-center gap-1 p-1 bg-slate-50/80 rounded-xl border border-slate-200/50">
                                            {((selectedOrder?.['Ghi chú Admin'] || selectedOrder?.ghi_chu_admin || '').toString().includes('[YÊU CẦU SCAN LẠI]')) && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-300 text-amber-800 rounded-lg text-[10px] font-bold shadow-xs" title={(selectedOrder?.['Ghi chú Admin'] || selectedOrder?.ghi_chu_admin || '').toString()}>
                                                    <i className="fas fa-hourglass-half text-amber-600 animate-pulse text-[9px]"></i>
                                                    <span>Đang Chờ TVBH Scan Lại</span>
                                                </div>
                                            )}
                                            {(() => {
                                                const coc = (selectedOrder as any)?.['Ngày COC về'] || (selectedOrder as any)?.ngay_coc_ve || (() => {
                                                    const m = ((selectedOrder?.['Ghi chú Admin'] || selectedOrder?.ghi_chu_admin || '') as string).match(/\[COC về:\s*([^\]]+)\]/i);
                                                    return m ? m[1].trim() : '';
                                                })();
                                                if (!coc) return null;
                                                return (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-[10px] font-bold shadow-xs" title={`Hồ sơ COC đã về: ${coc}`}>
                                                        <i className="fas fa-certificate text-emerald-600 text-[9px]"></i>
                                                        <span>COC: {coc}</span>
                                                    </div>
                                                );
                                            })()}
                                            {getActions(selectedOrder['Trạng thái xử lý'] || selectedOrder['Kết quả'] || '').map(action => {
                                                let variant: 'primary' | 'success' | 'danger' | 'secondary' = 'primary';
                                                switch (action.type) {
                                                    case 'approve': variant = 'success'; break;
                                                    case 'cancel': variant = 'danger'; break;
                                                    case 'supplement': variant = 'secondary'; break;
                                                    default: variant = action.variant === 'success' ? 'success' : (action.variant === 'danger' ? 'danger' : (action.variant === 'secondary' ? 'secondary' : 'primary'));
                                                }
                                                const isActionLoading = processingId === selectedOrder['Số đơn hàng'] && processingActionType === action.type;
                                                return (
                                                    <Button
                                                        key={action.type}
                                                        onClick={action.onClick ? action.onClick : () => onAction(action.type as any, selectedOrder)}
                                                        variant={variant}
                                                        size="sm"
                                                        className="!w-8 !h-8 !p-0 !min-w-[32px] rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xs"
                                                        title={action.label}
                                                        aria-label={action.label}
                                                        isLoading={isActionLoading}
                                                        disabled={!!processingId}
                                                    >
                                                        {!isActionLoading && <i className={`fas ${action.icon} text-xs`}></i>}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Document and review workspace */}
                            <div className={`invoice-review-body flex-1 p-1.5 md:p-2 flex ${'flex-row overflow-hidden'} gap-1.5 md:gap-2 min-h-0 bg-gray-50/30`}>
                                
                                <div className="invoice-document-pane flex flex-[2] flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-0 relative">
                                        <div className="invoice-document-toolbar bg-gray-50 px-3 py-2 border-b border-gray-100 flex items-center justify-between gap-2 overflow-hidden">
                                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0 py-0.5">
                                                {[
                                                    { key: 'LinkDeNghiXHD', label: 'Đề nghị XHĐ', icon: 'fa-file-invoice' },
                                                    { key: 'LinkHopDong', label: 'Hợp đồng MB', icon: 'fa-file-contract' },
                                                    { key: 'LinkHoaDonDaXuat', label: 'Hóa Đơn Red', icon: 'fa-file-invoice-dollar' },
                                                    { key: 'CyberDKBH', label: 'ĐK Bán Hàng', icon: 'fa-receipt' },
                                                    ...(isVtlxPolicyOrder || effectiveCamKetUrl ? [{ 
                                                        key: 'url_cam_ket_vtlx', 
                                                        label: 'Cam kết VTLX', 
                                                        icon: 'fa-leaf',
                                                        hasFile: Boolean(effectiveCamKetUrl)
                                                    }] : []),
                                                    ...(isVtlxPolicyOrder || effectiveCavetUrl ? [{ 
                                                        key: 'url_cavet_vtlx', 
                                                        label: 'Cà vẹt xe cũ', 
                                                        icon: 'fa-id-card',
                                                        hasFile: Boolean(effectiveCavetUrl)
                                                    }] : [])
                                                ].map(doc => (
                                                    <button 
                                                        key={doc.key}
                                                        aria-pressed={activeDocKey === doc.key}
                                                        title={`${doc.label}${doc.key.includes('vtlx') && !(doc as any).hasFile ? ' (Chưa có)' : ''}`}
                                                        aria-label={`${doc.label}${doc.key.includes('vtlx') && !(doc as any).hasFile ? ' (Chưa có)' : ''}`}
                                                        onClick={() => {
                                                            setActiveDocKey(doc.key as any);
                                                            if (doc.key === 'CyberDKBH' && selectedOrder) {
                                                                loadCyberDkbhPdf(selectedOrder);
                                                            }
                                                        }}
                                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 cursor-pointer ${
                                                            activeDocKey === doc.key 
                                                                ? (doc.key.includes('vtlx') ? 'bg-emerald-600 text-white shadow-md' : 'bg-accent-primary text-white shadow-md') 
                                                                : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <i className={`fas ${doc.icon} ${activeDocKey === doc.key ? 'text-white' : (doc.key.includes('vtlx') ? 'text-emerald-600' : 'text-accent-primary')} opacity-80 text-[9px]`}></i>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                                                {(() => {
                                                    const orderKey = selectedOrder ? (selectedOrder['Số đơn hàng'] || selectedOrder.id || '') : '';
                                                    let currentDocUrl = '';
                                                    if (activeDocKey === 'CyberDKBH') {
                                                        currentDocUrl = cyberDkbhUrls[orderKey] || '';
                                                    } else if (activeDocKey === 'url_cam_ket_vtlx') {
                                                        currentDocUrl = effectiveCamKetUrl;
                                                    } else if (activeDocKey === 'url_cavet_vtlx') {
                                                        currentDocUrl = effectiveCavetUrl;
                                                    } else if (selectedOrder) {
                                                        currentDocUrl = (selectedOrder[activeDocKey] as string) || (selectedOrder as any)?.[activeDocKey] || '';
                                                    }

                                                    const docLabels: any = {
                                                        LinkDeNghiXHD: 'Đề nghị XHĐ',
                                                        LinkHopDong: 'Hợp đồng MB',
                                                        LinkHoaDonDaXuat: 'Hóa Đơn Red',
                                                        CyberDKBH: 'Đề nghị ĐK Bán Hàng',
                                                        url_cam_ket_vtlx: 'Cam kết chuyển đổi xanh',
                                                        url_cavet_vtlx: 'Cà vẹt xe cũ (VTLX)'
                                                    };

                                                    if (!currentDocUrl) return null;

                                                    return (
                                                        <>
                                                            {/* Nút Tra NDP Đơn Này */}
                                                            {selectedOrder && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleBatchDmsCheckApproved(false, selectedOrder['Số đơn hàng'] || (selectedOrder as any).so_don_hang)}
                                                                    disabled={isCheckingDms}
                                                                    className="px-2 h-6 flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 transition-colors text-[10px] font-bold shadow-2xs"
                                                                    title="Tra cứu trực tiếp mã đơn và VIN của đơn hàng này trên VinFast NDP"
                                                                    aria-label="Tra NDP"
                                                                >
                                                                    <i className={`fas ${isCheckingDms ? 'fa-spinner fa-spin' : 'fa-robot'} text-[9px]`}></i>
                                                                </button>
                                                            )}

                                                            {/* Zoom Controls: [-] [100%] [+] */}
                                                            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setDocZoom(prev => Math.max(prev - 20, 60))}
                                                                    className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-accent-primary hover:bg-gray-100 transition-colors"
                                                                    title="Thu nhỏ (-20%)"
                                                                >
                                                                    <i className="fas fa-minus text-[9px]"></i>
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setDocZoom(100)}
                                                                    className="px-1.5 h-6 flex items-center justify-center text-[10px] font-bold text-gray-700 hover:text-accent-primary hover:bg-gray-100 rounded transition-colors min-w-[42px]"
                                                                    title="Nhấn để đưa về kích thước chuẩn (100%)"
                                                                >
                                                                    {docZoom}%
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setDocZoom(prev => Math.min(prev + 20, 250))}
                                                                    className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-accent-primary hover:bg-gray-100 transition-colors"
                                                                    title="Phóng to (+20%)"
                                                                >
                                                                    <i className="fas fa-plus text-[9px]"></i>
                                                                </button>
                                                            </div>

                                                            {/* Refresh CyberDKBH button */}
                                                            {activeDocKey === 'CyberDKBH' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => loadCyberDkbhPdf(selectedOrder, true)}
                                                                    disabled={isLoadingCyberDkbh}
                                                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-500 transition-all shadow-2xs"
                                                                    title="Làm mới phiếu từ máy chủ CyberSoft"
                                                                >
                                                                    <i className={`fas fa-sync-alt text-[10px] ${isLoadingCyberDkbh ? 'animate-spin text-emerald-600' : ''}`}></i>
                                                                </button>
                                                            )}

                                                            {/* Fullscreen Modal Preview */}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    onOpenFilePreview(currentDocUrl, `${docLabels[activeDocKey]} - ${selectedOrder['Tên khách hàng']}`);
                                                                }}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-accent-primary hover:border-accent-primary transition-all shadow-2xs"
                                                                title="Xem toàn màn hình"
                                                            >
                                                                <i className="fas fa-expand text-[10px]"></i>
                                                            </button>

                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    forceDownload(currentDocUrl, getSanitizedFilename(selectedOrder["Tên khách hàng"], docLabels[activeDocKey], currentDocUrl));
                                                                }}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-accent-primary hover:border-accent-primary transition-all shadow-2xs group"
                                                                title="Tải xuống tài liệu này"
                                                            >
                                                                <i className="fas fa-download text-[10px] group-hover:bounce"></i>
                                                            </button>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 bg-slate-100 relative overflow-hidden">
                                            {(() => {
                                                const orderKey = selectedOrder ? (selectedOrder['Số đơn hàng'] || selectedOrder.id || '') : '';
                                                let currentDocUrl = '';
                                                if (activeDocKey === 'CyberDKBH') {
                                                    currentDocUrl = cyberDkbhUrls[orderKey] || '';
                                                } else if (activeDocKey === 'url_cam_ket_vtlx') {
                                                    currentDocUrl = effectiveCamKetUrl;
                                                } else if (activeDocKey === 'url_cavet_vtlx') {
                                                    currentDocUrl = effectiveCavetUrl;
                                                } else if (selectedOrder) {
                                                    currentDocUrl = (selectedOrder[activeDocKey] as string || (selectedOrder as any)?.[activeDocKey] || '');
                                                }

                                                // Xử lý riêng cho tab CyberDKBH
                                                if (activeDocKey === 'CyberDKBH') {
                                                    if (isLoadingCyberDkbh) {
                                                        return (
                                                            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-white/70">
                                                                <div className="relative mb-3">
                                                                    <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                                                                    <i className="fas fa-receipt absolute inset-0 m-auto flex items-center justify-center text-emerald-600 text-xs"></i>
                                                                </div>
                                                                <div className="text-xs font-bold text-gray-700">Đang kết xuất phiếu từ CyberSoft...</div>
                                                                <div className="text-[10px] text-gray-400 mt-1 max-w-xs">Đang tải mẫu Đề nghị điều kiện bán hàng và dữ liệu hợp đồng</div>
                                                            </div>
                                                        );
                                                    }

                                                    if (!currentDocUrl) {
                                                        const contractCode = (selectedOrder['Mã HĐ Cyber'] || (selectedOrder as any).ma_hd_cyber || selectedOrder['Số hợp đồng'] || '').trim();
                                                        return (
                                                            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-gray-500 bg-white/50">
                                                                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-2xs">
                                                                    <i className="fas fa-receipt text-xl"></i>
                                                                </div>
                                                                <div className="text-xs font-bold text-gray-700 mb-1">
                                                                    {contractCode ? 'Chưa kết xuất phiếu Đề nghị điều kiện bán hàng' : 'Chưa có Mã HĐ Cyber'}
                                                                </div>
                                                                <div className="text-[10px] text-gray-400 max-w-sm mb-3">
                                                                    {cyberDkbhError || (contractCode ? `Hợp đồng: ${contractCode}. Nhấn nút dưới đây để kết xuất trực tiếp từ máy chủ CyberSoft.` : 'Vui lòng cập nhật Mã HĐ Cyber cho đơn hàng này để xem điều kiện bán hàng.')}
                                                                </div>
                                                                {contractCode && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => loadCyberDkbhPdf(selectedOrder, true)}
                                                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 hover:shadow-md active:scale-95 cursor-pointer"
                                                                    >
                                                                        <i className="fas fa-sync-alt text-[10px]"></i>
                                                                        <span>Kết xuất từ CyberSoft</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                }

                                                if (currentDocUrl) {
                                                    if (documentStatus.loading || documentStatus.error) {
                                                        return (
                                                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center text-slate-600" role="status">
                                                                <i className={`fas ${documentStatus.loading ? 'fa-spinner fa-spin' : 'fa-file-circle-exclamation'} text-2xl`} />
                                                                <p className="text-sm max-w-md">{documentStatus.loading ? 'Đang kiểm tra hồ sơ…' : documentStatus.error}</p>
                                                                {documentStatus.error && <button type="button" onClick={documentStatus.retry} className="px-4 py-2 rounded-lg bg-white border text-sm">Thử lại</button>}
                                                            </div>
                                                        );
                                                    }
                                                    const rawUrl = currentDocUrl;
                                                    const lowerUrl = rawUrl.toLowerCase();
                                                    const fileId = getDriveFileId(rawUrl);
                                                    const isDrive = Boolean(fileId || lowerUrl.includes('drive.google.com') || lowerUrl.includes('docs.google.com'));
                                                    const isPureImage = !isDrive && (/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(lowerUrl) || rawUrl.startsWith('data:image'));
                                                    const scale = docZoom / 100;

                                                    if (!isPureImage) {
                                                        const iframeSrc = (isDrive && fileId) 
                                                            ? `https://drive.google.com/file/d/${fileId}/preview`
                                                            : `${rawUrl}${rawUrl.includes('#') ? '&' : '#'}toolbar=0&navpanes=0&view=FitH`;
                                                        
                                                        if (docZoom === 100) {
                                                            return (
                                                                <div className="w-full h-full overflow-hidden p-0 relative">
                                                                    <iframe 
                                                                        src={iframeSrc}
                                                                        className="w-[calc(100%+24px)] max-w-none h-full border-0 block"
                                                                        title="Document Preview"
                                                                    />
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        return (
                                                            <div className="w-full h-full overflow-auto p-2 bg-slate-200/90 custom-scrollbar flex items-start justify-center">
                                                                <div 
                                                                    style={{ 
                                                                        width: scale > 1 ? `${scale * 100}%` : '100%',
                                                                        height: scale > 1 ? `${scale * 100}%` : '100%',
                                                                        minWidth: scale > 1 ? `${scale * 100}%` : 'auto',
                                                                        minHeight: scale > 1 ? `${scale * 100}%` : 'auto',
                                                                        position: 'relative',
                                                                        flexShrink: 0
                                                                    }}
                                                                    className="shadow-md rounded bg-white overflow-hidden"
                                                                >
                                                                    <div 
                                                                        style={{ 
                                                                            width: scale > 1 ? `${100 / scale}%` : '100%',
                                                                            height: scale > 1 ? `${100 / scale}%` : '100%',
                                                                            transform: `scale(${scale})`,
                                                                            transformOrigin: scale > 1 ? 'top left' : 'top center',
                                                                            position: scale > 1 ? 'absolute' : 'relative',
                                                                            top: 0,
                                                                            left: 0
                                                                        }}
                                                                        className="w-full h-full overflow-hidden"
                                                                    >
                                                                        <iframe 
                                                                            src={iframeSrc}
                                                                            className="w-[calc(100%+24px)] max-w-none h-full border-0 block"
                                                                            title="Document Preview"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    return (
                                                        <div className="w-full h-full overflow-auto flex items-start justify-center p-4 bg-slate-200 custom-scrollbar">
                                                            <img 
                                                                src={rawUrl} 
                                                                alt="Preview" 
                                                                style={{ 
                                                                    transform: docZoom === 100 ? 'none' : `scale(${scale})`,
                                                                    transformOrigin: 'top center',
                                                                    transition: 'transform 0.15s ease-out',
                                                                    maxWidth: docZoom <= 100 ? '100%' : 'none'
                                                                }}
                                                                className="shadow-2xl rounded-sm" 
                                                            />
                                                        </div>
                                                    );
                                                }

                                                if (activeDocKey === 'url_cam_ket_vtlx') {
                                                    return (
                                                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-gray-500 bg-white/50">
                                                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-2xs">
                                                                <i className="fas fa-leaf text-xl"></i>
                                                            </div>
                                                            <div className="text-xs font-bold text-gray-700 mb-1">Chưa có Cam kết VTLX</div>
                                                            <div className="text-[10px] text-gray-400 max-w-xs">Tư vấn bán hàng chưa đính kèm tệp Cam kết chuyển đổi xanh cho đơn hàng này.</div>
                                                        </div>
                                                    );
                                                }

                                                if (activeDocKey === 'url_cavet_vtlx') {
                                                    return (
                                                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-gray-500 bg-white/50">
                                                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-2xs">
                                                                <i className="fas fa-id-card text-xl"></i>
                                                            </div>
                                                            <div className="text-xs font-bold text-gray-700 mb-1">Chưa có Cà vẹt xe cũ (VTLX)</div>
                                                            <div className="text-[10px] text-gray-400 max-w-xs">Tư vấn bán hàng chưa đính kèm ảnh/PDF Cà vẹt xe cũ cho đơn hàng này.</div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                                        <i className="fas fa-file-excel text-4xl mb-4 opacity-20"></i>
                                                        <span className="text-xs font-medium italic">Tài liệu này chưa được tải lên</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                <div className={`invoice-inspector flex flex-col min-w-0 ${'flex-[1] h-full overflow-hidden justify-between gap-2'}`}
                                    onClickCapture={e => {
                                        const button = (e.target as HTMLElement).closest('button');
                                        if (button) setCyberSheetAnchor(button);
                                    }}>
                                    
                                    {/* CUSTOMER HEADER & ACTIONS - Clean Modern Integrated Card */}
                                    <div className="invoice-customer-header bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 flex flex-col gap-2 flex-shrink-0">
                                            {/* Top Customer Info */}
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="hidden">
                                                        {selectedOrder['Tên khách hàng'].charAt(0)}
                                                    </div>
                                                    <div className="space-y-0.5 min-w-0 flex-1 overflow-hidden">
                                                        <div className="min-w-0 flex-1 overflow-hidden">
                                                            <MarqueeText 
                                                                text={selectedOrder['Tên khách hàng'] || '—'}
                                                                className="font-black text-sm text-slate-900 leading-tight cursor-pointer hover:text-blue-600 transition-colors uppercase"
                                                                title="Click để sao chép tên khách hàng"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    copyWithFeedback(selectedOrder['Tên khách hàng'], e);
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 font-medium truncate flex flex-wrap items-center gap-2">
                                                            <span className="flex items-center gap-1.5 italic">
                                                                <i className="fa-solid fa-user-tie text-[9px] text-slate-400 not-italic"></i>
                                                                <span>TVBH: <span className="text-slate-600 font-medium italic">{toTitleCase(selectedOrder['Tên tư vấn bán hàng'] || 'Chưa rõ')}</span></span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                                                {((selectedOrder?.['Ghi chú Admin'] || selectedOrder?.ghi_chu_admin || '').toString().includes('[YÊU CẦU SCAN LẠI]')) && (
                                                    <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-300 text-amber-800 rounded-lg text-xs font-bold w-full shadow-xs" title={(selectedOrder?.['Ghi chú Admin'] || selectedOrder?.ghi_chu_admin || '').toString()}>
                                                        <i className="fas fa-hourglass-half text-amber-600 animate-pulse text-[10px]"></i>
                                                        <span>Đang Chờ TVBH Scan Lại</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {getActions(selectedOrder['Trạng thái xử lý'] || selectedOrder['Kết quả'] || '').map(action => {
                                                        let variant: 'primary' | 'success' | 'danger' | 'secondary' = 'primary';
                                                        switch (action.type) {
                                                            case 'approve': variant = 'success'; break;
                                                            case 'cancel': variant = 'danger'; break;
                                                            case 'supplement': variant = 'secondary'; break;
                                                            default: variant = action.variant === 'success' ? 'success' : (action.variant === 'danger' ? 'danger' : (action.variant === 'secondary' ? 'secondary' : 'primary'));
                                                        }
                                                        const isActionLoading = processingId === selectedOrder['Số đơn hàng'] && processingActionType === action.type;
                                                        return (
                                                            <Button
                                                                key={action.type}
                                                                onClick={action.onClick ? action.onClick : () => onAction(action.type as any, selectedOrder)}
                                                                variant={variant}
                                                                size="sm"
                                                                className="!w-8 !h-8 !p-0 !min-w-[32px] rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xs"
                                                                title={action.label}
                                                                aria-label={action.label}
                                                                isLoading={isActionLoading}
                                                                disabled={!!processingId}
                                                            >
                                                                {!isActionLoading && <i className={`fas ${action.icon} text-xs`}></i>}
                                                            </Button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                    <div className={`invoice-facts grid grid-cols-1 ${'flex-1 min-h-0 justify-between'} gap-2`}>
                                        {/* Column 1: Vehicle & Specs */}
                                        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${'flex-1 min-h-0 justify-between'}`}>
                                            <div className="bg-gray-50/50 px-3 py-1.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <i className="fas fa-car text-accent-primary text-[10px]"></i>
                                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Thông tin xe</h3>
                                                </div>
                                            </div>
                                            <div className={`p-2 space-y-0.5 ${'flex-1 flex flex-col justify-evenly'}`}>
                                                <div className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 rounded-lg transition-colors group">
                                                    <div className="flex items-center gap-2">
                                                        <i className="fas fa-car text-blue-500 opacity-50 group-hover:opacity-100 text-[10px] transition-opacity"></i>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Dòng xe / PB</span>
                                                    </div>
                                                    <span className="text-[10px] font-semibold text-slate-800 truncate ml-4" title={`${selectedOrder['Dòng xe']} - ${selectedOrder['Phiên bản']}`}>
                                                        {selectedOrder['Dòng xe']} - {selectedOrder['Phiên bản']}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 rounded-lg transition-colors group border-t border-gray-100/80">
                                                    <div className="flex items-center gap-2">
                                                        <i className="fas fa-palette text-amber-500 opacity-50 group-hover:opacity-100 text-[10px] transition-opacity"></i>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Màu sắc</span>
                                                    </div>
                                                    <span className="text-[10px] font-medium text-slate-700 truncate ml-4">
                                                        {selectedOrder['Ngoại thất'] || 'N/A'} / {selectedOrder['Nội thất'] || 'N/A'}
                                                    </span>
                                                </div>

                                                <div className="flex flex-col py-1.5 px-2 hover:bg-gray-50/60 rounded-lg transition-colors group border-t border-gray-100/80">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <i className="fas fa-fingerprint text-accent-primary opacity-60 group-hover:opacity-100 text-[10px] transition-opacity"></i>
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Số VIN</span>
                                                        </div>
                                                        
                                                        {/* Right action group: Status Badge, Gỡ xe, Refresh */}
                                                        <div className="flex items-center gap-1.5">
                                                            {cyberAssignmentStatus.isAssigned ? (
                                                                <>
                                                                    <span 
                                                                        className="px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                        title={`Đơn hàng đã được xếp xe trên CyberSoft ERP (Số khung: ${cyberAssignmentStatus.cyberVin || selectedOrder.VIN || '—'})`}
                                                                    >
                                                                        <i className="fas fa-check-circle text-[9px] text-emerald-600"></i>
                                                                        <span>Đã xếp xe</span>
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleUnassignCyberCar}
                                                                        disabled={isUnassigning}
                                                                        className="px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                                                                        title="Hủy ghép / Gỡ xe khỏi hợp đồng trên CyberSoft ERP"
                                                                    >
                                                                        <i className={`fas fa-link-slash text-[9px] text-rose-500 ${isUnassigning ? 'animate-spin' : ''}`}></i>
                                                                        <span>{isUnassigning ? 'Đang gỡ...' : 'Gỡ xe'}</span>
                                                                    </button>
                                                                </>
                                                            ) : isLoadingCyberContracts ? (
                                                                <span 
                                                                    className="px-2 py-0.5 rounded-lg text-[10px] font-medium flex items-center gap-1.5 bg-slate-50 text-slate-500 border border-slate-200 animate-pulse"
                                                                    title="Đang đồng bộ trạng thái xếp xe từ CyberSoft ERP..."
                                                                >
                                                                    <i className="fas fa-spinner fa-spin text-[9px] text-blue-500"></i>
                                                                    <span>Đang kiểm tra...</span>
                                                                </span>
                                                            ) : cyberAssignmentStatus.isPendingGreen ? (
                                                                selectedOrder['Trạng thái xử lý'] !== 'đã xuất hóa đơn' && selectedOrder['Kết quả'] !== 'đã xuất hóa đơn' && (
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (cyberAssignmentStatus.contract) {
                                                                                    setCyberApprovalConfirm({
                                                                                        isOpen: true,
                                                                                        action: 'approve',
                                                                                        contract: cyberAssignmentStatus.contract,
                                                                                        reason: 'Duyệt đề phòng lúc vắng Giám đốc để kịp tiến độ xếp xe'
                                                                                    });
                                                                                } else {
                                                                                    setIsCyberAssignModalOpen(true);
                                                                                }
                                                                            }}
                                                                            className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white animate-pulse"
                                                                            title="Duyệt hợp đồng trên CyberSoft ERP từ Màu xanh -> Màu vàng (Chờ ghép SK) không ghi nhận người duyệt trên Cyber"
                                                                        >
                                                                            <i className="fas fa-bolt text-[9px] text-yellow-200"></i>
                                                                            <span>⚡ Duyệt Cyber</span>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setIsCyberAssignModalOpen(true)}
                                                                            className="px-1.5 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                                                                            title="Xem danh sách hợp đồng & ghép xe Cyber"
                                                                        >
                                                                            <i className="fas fa-external-link-alt text-[8px]"></i>
                                                                        </button>
                                                                    </div>
                                                                )
                                                            ) : (
                                                                selectedOrder['Trạng thái xử lý'] !== 'đã xuất hóa đơn' && selectedOrder['Kết quả'] !== 'đã xuất hóa đơn' && (
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setIsCyberAssignModalOpen(true)}
                                                                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white"
                                                                            title="Ghép xe trực tiếp từ CyberSoft ERP"
                                                                        >
                                                                            <i className="fas fa-car-side text-[9px]"></i>
                                                                            <span>Ghép xe Cyber</span>
                                                                        </button>
                                                                        {cyberAssignmentStatus.contract && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setCyberApprovalConfirm({
                                                                                        isOpen: true,
                                                                                        action: 'revoke',
                                                                                        contract: cyberAssignmentStatus.contract!,
                                                                                        reason: 'Hoàn tác duyệt hợp đồng'
                                                                                    });
                                                                                }}
                                                                                className="px-1.5 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-slate-200 transition-colors cursor-pointer"
                                                                                title="Hoàn tác duyệt: Chuyển hợp đồng về lại Màu xanh (Chờ duyệt) trên CyberSoft ERP"
                                                                            >
                                                                                <i className="fas fa-undo text-[8px]"></i>
                                                                                <span className="text-[9px]">Hoàn tác</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )
                                                            )}

                                                            {/* Refresh Button */}
                                                            <button
                                                                type="button"
                                                                onClick={handleRefreshCyber}
                                                                disabled={isLoadingCyberContracts}
                                                                className="w-6 h-6 rounded-lg text-[10px] flex items-center justify-center border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                                                                title="Đồng bộ / Làm mới dữ liệu CyberSoft ERP"
                                                            >
                                                                <i className={`fas fa-sync-alt text-[9px] ${isLoadingCyberContracts ? 'fa-spin text-blue-500' : ''}`}></i>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Full width VIN display pill card */}
                                                    <div 
                                                        onClick={(e) => {
                                                            if (selectedOrder.VIN && selectedOrder.VIN !== '—') {
                                                                copyWithFeedback(selectedOrder.VIN, e);
                                                            }
                                                        }}
                                                        className={`w-full bg-blue-50/60 hover:bg-blue-100/80 border border-blue-200 hover:border-blue-300 rounded-lg py-1.5 px-3 flex items-center justify-center transition-all duration-200 shadow-xs ${selectedOrder.VIN && selectedOrder.VIN !== '—' ? 'cursor-pointer active:scale-[0.99]' : ''}`}
                                                        title={selectedOrder.VIN && selectedOrder.VIN !== '—' ? "Click để sao chép số VIN" : ""}
                                                    >
                                                        <span className="invoice-vin-value font-mono font-bold text-xs text-blue-700 tracking-wider select-all text-center">
                                                            {selectedOrder.VIN || '—'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 rounded-lg transition-colors group border-t border-gray-100/80">
                                                    <div className="flex items-center gap-2">
                                                        <i className="fas fa-cogs text-indigo-500 opacity-50 group-hover:opacity-100 text-[10px] transition-opacity"></i>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Số Máy</span>
                                                    </div>
                                                    <div className="text-[10px] font-medium text-slate-700 truncate ml-4 font-mono">
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={editData.engineNumber}
                                                                onChange={e => setEditData({ ...editData, engineNumber: e.target.value })}
                                                                className="w-full text-[10px] border border-accent-primary/30 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-accent-primary text-right"
                                                            />
                                                        ) : (
                                                            <CopyableField text={selectedOrder['Số máy'] || ''} showToast={showToast} />
                                                        )}
                                                    </div>
                                                </div>

                                                {Boolean(selectedOrder['Xe xăng VIN'] && !isVtlxPolicyOrder && selectedOrder['Xe xăng VIN'] !== effectiveSoKhung) && (
                                                    <div className="mt-1 pt-1 border-t border-dashed border-amber-200 bg-amber-50/60 rounded-lg px-2 pb-1 transition-all animate-fade-in shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <i className="fas fa-gas-pump text-amber-600 text-[10px]"></i>
                                                            <span className="text-[9px] font-semibold text-amber-800 uppercase tracking-wider">Thông tin xe xăng thu đổi</span>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[9px] text-gray-500 font-medium tracking-wide">Hãng / Model</span>
                                                                <span className="text-[10px] font-medium text-gray-800">
                                                                    {selectedOrder['Xe xăng Hãng'] || '—'} {selectedOrder['Xe xăng Model'] ? `(${selectedOrder['Xe xăng Model']})` : ''}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center border-t border-amber-100/50 pt-0.5 mt-0.5">
                                                                <span className="text-[9px] text-gray-500 font-medium tracking-wide">Số VIN gốc</span>
                                                                <div className="text-[10px] font-semibold text-amber-900 font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200 shadow-sm">
                                                                    <CopyableField text={selectedOrder['Xe xăng VIN'] || ''} showToast={showToast} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {(isVtlxPolicyOrder || effectiveSoKhung || effectiveHangXe || effectiveCamKetUrl || effectiveCavetUrl) && (
                                                    <div className="mt-1 pt-1 border-t border-dashed border-emerald-200 bg-emerald-50/70 rounded-lg px-2 pb-1.5 transition-all animate-fade-in shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <i className="fas fa-leaf text-emerald-600 text-[10px]"></i>
                                                                <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider">Hồ sơ xe cũ VTLX</span>
                                                            </div>
                                                            <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-200">VTLX</span>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[9px] text-gray-500 font-medium tracking-wide">Hãng xe cũ:</span>
                                                                <span className="text-[10px] font-bold text-gray-800">
                                                                    {effectiveHangXe || selectedOrder['Xe xăng Hãng'] || '—'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center border-t border-emerald-100/50 pt-0.5">
                                                                <span className="text-[9px] text-gray-500 font-medium tracking-wide">Số khung cũ:</span>
                                                                <div className="text-[10px] font-semibold text-emerald-900 font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200 shadow-xs">
                                                                    {(effectiveSoKhung || selectedOrder['Xe xăng VIN']) ? (
                                                                        <CopyableField text={effectiveSoKhung || selectedOrder['Xe xăng VIN'] || ''} showToast={showToast} />
                                                                    ) : (
                                                                        <span className="text-gray-400 font-normal">Chưa có</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Nút Xem & Tải file VTLX */}
                                                            <div className="border-t border-emerald-100/60 pt-1 space-y-1">
                                                                {/* 1. Cam kết VTLX */}
                                                                <div className="flex items-center justify-between gap-1.5 bg-white/90 px-2 py-1 rounded border border-emerald-200/80">
                                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                                        <i className="fas fa-file-contract text-emerald-600 text-[10px] flex-shrink-0"></i>
                                                                        <span className="text-[9px] font-semibold text-gray-700 truncate">Cam kết VTLX</span>
                                                                    </div>
                                                                    {effectiveCamKetUrl ? (
                                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                                            
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    forceDownload(effectiveCamKetUrl, getSanitizedFilename(selectedOrder['Tên khách hàng'], 'CamKet_VTLX', effectiveCamKetUrl));
                                                                                }}
                                                                                className="w-5 h-5 flex items-center justify-center text-[9px] text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-all cursor-pointer border border-transparent hover:border-emerald-200"
                                                                                title="Tải xuống Cam kết VTLX"
                                                                            >
                                                                                <i className="fas fa-download text-[8px]"></i>
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-[8px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                                            Chưa tải lên
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* 2. Cà vẹt xe cũ */}
                                                                <div className="flex items-center justify-between gap-1.5 bg-white/90 px-2 py-1 rounded border border-emerald-200/80">
                                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                                        <i className="fas fa-id-card text-emerald-600 text-[10px] flex-shrink-0"></i>
                                                                        <span className="text-[9px] font-semibold text-gray-700 truncate">Cà vẹt xe cũ</span>
                                                                    </div>
                                                                    {effectiveCavetUrl ? (
                                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                                            
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    forceDownload(effectiveCavetUrl, getSanitizedFilename(selectedOrder['Tên khách hàng'], 'CaVet_VTLX', effectiveCavetUrl));
                                                                                }}
                                                                                className="w-5 h-5 flex items-center justify-center text-[9px] text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-all cursor-pointer border border-transparent hover:border-emerald-200"
                                                                                title="Tải xuống Cà vẹt xe cũ"
                                                                            >
                                                                                <i className="fas fa-download text-[8px]"></i>
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-[8px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                                            Chưa tải lên
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Column 2: Transaction Details */}
                                        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col ${'flex-1 min-h-0 justify-between'} overflow-visible relative`}>
                                            <div className="bg-gray-50/50 px-3 py-1.5 border-b border-gray-100 flex items-center gap-2 rounded-t-xl flex-shrink-0">
                                                <i className="fas fa-receipt text-accent-primary text-[10px]"></i>
                                                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Giao dịch</h3>
                                            </div>
                                            <div className={`p-2.5 space-y-2 relative ${'flex-1 flex flex-col justify-evenly'}`}>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="text-left relative flex flex-col">
                                                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 ml-0.5 truncate">Số đơn hàng</div>
                                                        {(() => {
                                                            const aiNotes = (selectedOrder as any)._aiNotes || [];
                                                            const hasWarning = aiNotes.some((n: string) => n.includes('⚠️') || n.includes('🚨'));

                                                            return (
                                                                <div className={`flex items-center justify-center bg-gray-50/50 border rounded-xl py-1 px-1.5 relative transition-all duration-300 h-[34px] ${hasWarning ? 'border-red-200 bg-red-50/30' : 'border-gray-100 shadow-sm'}`}>
                                                                    <CopyableField text={selectedOrder['Số đơn hàng'] || ''} showToast={showToast} className={`text-[11px] font-bold truncate font-mono tracking-tight ${hasWarning ? 'text-red-600' : 'text-accent-primary'}`} />
                                                                    {hasWarning && (
                                                                        <div className="absolute right-1 top-1/2 -translate-y-1/2 group/err">
                                                                            <div className="text-red-500 animate-pulse cursor-help">
                                                                                <i className="fas fa-exclamation-triangle text-xs"></i>
                                                                            </div>
                                                                            <div className="absolute top-full right-0 mt-2 w-72 bg-slate-900 text-white rounded-xl p-3 shadow-2xl opacity-0 group-hover/err:opacity-100 transition-all invisible group-hover/err:visible z-[100] transform scale-95 group-hover/err:scale-100 origin-top-right">
                                                                                <div className="text-[10px] font-bold text-red-400 uppercase mb-2 border-b border-white/10 pb-1">Chi tiết sai lệch (AI)</div>
                                                                                <div className="space-y-2">
                                                                                    {aiNotes.filter((n: string) => !n.includes('✅')).map((note: string, idx: number) => (
                                                                                        <div key={`ai-note-${idx}`} className="flex items-start gap-2">
                                                                                            <i className="fas fa-caret-right text-red-500 mt-1 text-[8px]"></i>
                                                                                            <span className="text-[10px] font-medium leading-relaxed text-slate-200">{note.replace(/^[⚠️🚨ℹ️]\s*/, '').trim()}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                <div className="absolute top-[-4px] right-3 w-3 h-3 bg-slate-900 rotate-45"></div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                    <div className="text-left relative flex flex-col">
                                                        <div className="flex items-center justify-between mb-0.5 ml-0.5">
                                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider truncate">Mã HĐ Cyber</span>
                                                        </div>
                                                        <div className="flex items-center justify-center gap-1 bg-emerald-50/50 border border-emerald-200/80 rounded-xl py-1 px-1.5 shadow-2xs h-[34px]">
                                                            <i className="fas fa-file-contract text-emerald-600 text-[9px] flex-shrink-0"></i>
                                                            {(selectedOrder['Mã HĐ Cyber'] || (selectedOrder as any).ma_hd_cyber) ? (
                                                                <CopyableField 
                                                                    text={selectedOrder['Mã HĐ Cyber'] || (selectedOrder as any).ma_hd_cyber || ''} 
                                                                    showToast={showToast} 
                                                                    className="text-[10.5px] font-bold truncate font-mono tracking-tight text-emerald-800" 
                                                                />
                                                            ) : (
                                                                <span className="text-[10px] text-slate-400 italic truncate">Chưa liên kết</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex flex-col">
                                                        <div className="text-[9px] font-medium text-slate-500 uppercase tracking-tighter mb-0.5 ml-0.5">Hoa hồng ứng</div>
                                                        <div className="w-full bg-green-50/50 border border-green-100 rounded-lg px-2 py-1 flex items-baseline justify-center">
                                                            <span className="text-xs font-bold text-green-700">
                                                                {isEditing ? (
                                                                    <input type="text" value={editData.commission} onChange={e => setEditData({ ...editData, commission: e.target.value })} className="w-full bg-transparent focus:outline-none text-center" />
                                                                ) : (
                                                                    `${Number(String(selectedOrder['Hoa hồng ứng'] || 0).replace(/[^0-9]/g, '')).toLocaleString()}đ`
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="text-[9px] font-medium text-slate-500 uppercase tracking-tighter mb-0.5 ml-0.5">Vpoint</div>
                                                        <div className="w-full bg-blue-50/50 border border-blue-100 rounded-lg px-2 py-1 flex items-baseline justify-center">
                                                            <span className="text-xs font-bold text-blue-700">
                                                                {isEditing ? (
                                                                    <input type="text" value={editData.vpoint} onChange={e => setEditData({ ...editData, vpoint: e.target.value })} className="w-full bg-transparent focus:outline-none text-center" />
                                                                ) : (
                                                                    `${Number(String(selectedOrder['Điểm Vpoint sử dụng'] || 0).replace(/[^0-9]/g, '')).toLocaleString()}`
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {selectedOrder['Mã VC'] && (
                                                    <div className="flex flex-col mt-1">
                                                        <div className="text-[9px] font-medium text-slate-500 uppercase tracking-tighter mb-0.5 ml-0.5">Mã VC (Voucher)</div>
                                                        <div className="w-full bg-purple-50/50 border border-purple-100 rounded-lg px-2 py-1 flex items-center gap-2">
                                                            <i className="fas fa-ticket-alt text-purple-500 text-[10px]"></i>
                                                            <CopyableField text={selectedOrder['Mã VC'] || ''} showToast={showToast} className="text-xs font-bold text-purple-700 tracking-wide" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Column 3: Policy List */}
                                        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${'flex-1 min-h-0 justify-between'}`}>
                                            <div className="bg-gray-50/50 px-3 py-1.5 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <i className="fas fa-shield-alt text-accent-primary text-[10px]"></i>
                                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Chính sách</h3>
                                                </div>
                                                {!isEditing ? (
                                                    <button onClick={() => setIsEditing(true)} className="text-[9px] font-bold text-accent-primary hover:text-accent-primary-hover flex items-center gap-1 transition-colors">
                                                        <i className="fas fa-edit"></i> SỬA
                                                    </button>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <button onClick={handleSaveEdit} disabled={isSaving} className="text-[8px] font-bold text-green-600">LƯU</button>
                                                        <button onClick={() => setIsEditing(false)} disabled={isSaving} className="text-[8px] font-bold text-red-500">HỦY</button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`p-2.5 overflow-y-auto no-scrollbar ${'flex-1 min-h-0 flex flex-col justify-center'}`}>
                                                {isEditing ? (
                                                    <div className="space-y-1.5 p-0.5">
                                                        {/* Quick Search & Model Filter Header */}
                                                        <div className="space-y-1 pb-2 mb-1 border-b border-gray-100">
                                                            <div className="relative">
                                                                <input 
                                                                    type="text" 
                                                                    value={policySearchQuery} 
                                                                    onChange={e => setPolicySearchQuery(e.target.value)} 
                                                                    placeholder="🔍 Tìm chính sách..." 
                                                                    className="w-full text-[10px] px-2 py-1 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-gray-400" 
                                                                />
                                                                {policySearchQuery && (
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => setPolicySearchQuery('')} 
                                                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px] px-1"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {currentCarModel && (
                                                                <div className="flex items-center justify-between gap-1 text-[9px] pt-0.5">
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => setPolicyFilterModelOnly(!policyFilterModelOnly)} 
                                                                        className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all ${
                                                                            policyFilterModelOnly 
                                                                                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs' 
                                                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                                        }`}
                                                                        title={policyFilterModelOnly ? `Đang lọc theo dòng xe ${currentCarModel}. Click để hiện tất cả.` : 'Click để lọc theo dòng xe.'}
                                                                    >
                                                                        <span>🚗</span>
                                                                        <span>{policyFilterModelOnly ? `Xe: ${currentCarModel}` : 'Tất cả dòng xe'}</span>
                                                                        <i className={`fas fa-chevron-${policyFilterModelOnly ? 'down' : 'up'} text-[7px] opacity-60`}></i>
                                                                    </button>

                                                                    <span className="text-[9px] font-semibold text-gray-400">
                                                                        {filteredDbPolicies.length}/{dbPolicies.length}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Checkbox List */}
                                                        {filteredDbPolicies.length === 0 ? (
                                                            <div className="text-center py-4 text-[10px] text-gray-400 italic">
                                                                Không có chính sách nào {policyFilterModelOnly ? `cho ${currentCarModel}` : ''}
                                                            </div>
                                                        ) : (
                                                            filteredDbPolicies.map((p, idx) => {
                                                                const isChecked = editData.policy.split('; ').filter(Boolean).includes(p.ten_chinh_sach);
                                                                return (
                                                                    <label key={idx} className={`flex items-start justify-between gap-2 px-2 py-1 rounded-md cursor-pointer transition-all ${isChecked ? 'bg-indigo-50/70 border border-indigo-100' : 'hover:bg-gray-50 border border-transparent'}`}>
                                                                        <div className="flex items-start gap-2 min-w-0">
                                                                            <input 
                                                                                type="checkbox" 
                                                                                checked={isChecked} 
                                                                                onChange={() => {
                                                                                    const current = editData.policy.split('; ').filter(Boolean);
                                                                                    const exists = current.includes(p.ten_chinh_sach);
                                                                                    const updated = exists ? current.filter(x => x !== p.ten_chinh_sach) : [...current, p.ten_chinh_sach];
                                                                                    setEditData({...editData, policy: updated.join('; ')});
                                                                                }}
                                                                                className="mt-0.5 accent-indigo-600 flex-shrink-0"
                                                                            />
                                                                            <span className={`text-[10px] ${isChecked ? 'font-bold text-indigo-950' : 'text-gray-700'}`}>{p.ten_chinh_sach}</span>
                                                                        </div>
                                                                    </label>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1.5 my-auto">
                                                        {(selectedOrder['CHÍNH SÁCH'] || '').split(/; |, /).filter(Boolean).map((item, idx) => (
                                                            <div key={idx} className="flex items-start gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-accent-primary mt-1 flex-shrink-0"></div>
                                                                <span className="text-[10px] font-semibold text-gray-600 leading-tight">{item}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 w-full h-full bg-slate-50">
                            <div className="relative w-24 h-24 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center mb-6">
                                <div className="absolute inset-0 border border-gray-200/60 rounded-full transform scale-110"></div>
                                <div className="absolute inset-0 border border-gray-100 rounded-full transform scale-125"></div>
                                <i className="fas fa-hand-pointer text-gray-300 text-4xl"></i>
                            </div>
                            <h3 className="text-lg font-bold text-gray-600 mb-1 tracking-tight">Chưa chọn đơn hàng</h3>
                            <p className="text-sm text-gray-400 max-w-xs text-center">Vui lòng chọn một đơn hàng từ danh sách để xem chi tiết.</p>
                        </div>
                    )
                }
            </div>
            {/* Modal Ghép Xe CyberSoft trực tiếp trên Tab Hóa Đơn */}
            <CyberAssignVehicleModal
                anchorElement={cyberSheetAnchor}
                isOpen={isCyberAssignModalOpen}
                onClose={() => setIsCyberAssignModalOpen(false)}
                order={selectedOrder}
                initialContracts={cyberContracts}
                showToast={showToast}
                onSuccess={handleCyberAssignSuccess}
            />

            {/* Modal Xác nhận Duyệt / Hoàn tác Hợp đồng Cyber trực tiếp */}
            {cyberApprovalConfirm && cyberApprovalConfirm.isOpen && (
                <AnchoredCyberSheet anchor={cyberSheetAnchor} compact label="Duyệt hợp đồng Cyber" onClose={() => { if (!isSubmittingCyberApproval) setCyberApprovalConfirm(null); }}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className={`p-4 border-b flex items-center justify-between ${
                            cyberApprovalConfirm.action === 'approve' 
                                ? 'bg-amber-50/70 border-amber-100 text-amber-900' 
                                : 'bg-rose-50/70 border-rose-100 text-rose-900'
                        }`}>
                            <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                    cyberApprovalConfirm.action === 'approve'
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'bg-rose-500 text-white shadow-xs'
                                }`}>
                                    <i className={`fas ${cyberApprovalConfirm.action === 'approve' ? 'fa-bolt' : 'fa-undo'} text-sm`}></i>
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm leading-tight">
                                        {cyberApprovalConfirm.action === 'approve' ? 'Phê Duyệt Hợp Đồng Cyber' : 'Hoàn Tác Duyệt Hợp Đồng Cyber'}
                                    </h3>
                                    <p className="text-[10px] text-slate-500">
                                        {cyberApprovalConfirm.action === 'approve' ? 'Duyệt nội bộ Admin (Không ghi nhận người duyệt trên Cyber ERP)' : 'Đưa hợp đồng về lại Màu xanh (Chờ duyệt)'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCyberApprovalConfirm(null)}
                                disabled={isSubmittingCyberApproval}
                                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
                            >
                                <i className="fas fa-times text-xs"></i>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-3.5">
                            {/* Contract summary */}
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Số hợp đồng:</span>
                                    <span className="font-bold font-mono text-slate-900">{cyberApprovalConfirm.contract.ma_hd || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Khách hàng:</span>
                                    <span className="font-bold text-slate-900">{cyberApprovalConfirm.contract.ten_kh || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Dòng xe:</span>
                                    <span className="font-medium text-slate-700">{cyberApprovalConfirm.contract.ten_kx || '—'} - {cyberApprovalConfirm.contract.ten_mau || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                                    <span className="text-slate-500">Trạng thái hiện tại:</span>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                        cyberApprovalConfirm.contract.ma_post === '2' || (cyberApprovalConfirm.contract.ten_color || '').toLowerCase().includes('chờ duyệt')
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {cyberApprovalConfirm.contract.ten_color || (cyberApprovalConfirm.contract.ma_post === '2' ? 'Chờ duyệt (Xanh)' : 'Chờ ghép SK (Vàng)')}
                                    </span>
                                </div>
                            </div>

                            {/* Note notice */}
                            <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed flex items-start gap-2 ${
                                cyberApprovalConfirm.action === 'approve'
                                    ? 'bg-amber-50/60 border-amber-200/70 text-amber-900'
                                    : 'bg-rose-50/60 border-rose-200/70 text-rose-900'
                            }`}>
                                <i className={`fas ${cyberApprovalConfirm.action === 'approve' ? 'fa-info-circle text-amber-600' : 'fa-exclamation-triangle text-rose-600'} text-xs mt-0.5 flex-shrink-0`}></i>
                                <span>
                                    {cyberApprovalConfirm.action === 'approve' ? (
                                        <>Hợp đồng sẽ chuyển sang <b>Màu vàng (Chờ ghép SK)</b> để có thể ghép số khung ngay. Thao tác này <b>không ghi nhận người duyệt trên Cyber ERP</b>, phục vụ xử lý kịp tiến độ.</>
                                    ) : (
                                        <>Hợp đồng sẽ quay về trạng thái <b>Chờ duyệt (Màu xanh)</b> trên Cyber ERP. Lưu ý: Chỉ hoàn tác khi xe chưa xuất hóa đơn.</>
                                    )}
                                </span>
                            </div>

                            {/* Reason Input */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                    Lý do / Ghi chú nội bộ
                                </label>
                                <input
                                    type="text"
                                    value={cyberApprovalConfirm.reason}
                                    onChange={(e) => setCyberApprovalConfirm(prev => prev ? ({ ...prev, reason: e.target.value }) : null)}
                                    placeholder="Nhập lý do thực hiện..."
                                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setCyberApprovalConfirm(null)}
                                disabled={isSubmittingCyberApproval}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteDirectCyberApproval}
                                disabled={isSubmittingCyberApproval}
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 ${
                                    cyberApprovalConfirm.action === 'approve'
                                        ? 'bg-amber-600 hover:bg-amber-700'
                                        : 'bg-rose-600 hover:bg-rose-700'
                                }`}
                            >
                                {isSubmittingCyberApproval ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin text-xs"></i>
                                        <span>Đang xử lý Cyber...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className={`fas ${cyberApprovalConfirm.action === 'approve' ? 'fa-check' : 'fa-undo'} text-xs`}></i>
                                        <span>{cyberApprovalConfirm.action === 'approve' ? 'Xác nhận Duyệt Cyber' : 'Xác nhận Hoàn tác'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </AnchoredCyberSheet>
            )}

            {/* Modal Báo Cáo Chi Tiết Đối Soát NDP Cho Admin - Render trực tiếp lên document.body ở lớp cao nhất */}
            {dmsReportResult && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                                    🤖
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold tracking-tight">KẾT QUẢ ĐỐI SOÁT VINFAST NDP (TỰ ĐỘNG CHỜ KÝ)</h3>
                                    <p className="text-[11px] text-emerald-100">
                                        Tổng số đơn đã quét: <b>{dmsReportResult.total_checked}</b> | Chuyển thành công: <b>{dmsReportResult.transitioned_count}</b>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDmsReportResult(null)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                                    <div>
                                        <div className="text-[11px] text-emerald-700 font-medium">Đã chuyển "Chờ ký hóa đơn"</div>
                                        <div className="text-xl font-bold text-emerald-800 mt-0.5">{dmsReportResult.transitioned_count || 0} đơn</div>
                                    </div>
                                    <div className="w-8 h-8 rounded-lg bg-emerald-200/60 flex items-center justify-center text-emerald-700 text-sm font-bold">
                                        ✓
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                                    <div>
                                        <div className="text-[11px] text-slate-600 font-medium">Giữ nguyên "Đã phê duyệt"</div>
                                        <div className="text-xl font-bold text-slate-800 mt-0.5">{dmsReportResult.unprocessed?.length || 0} đơn</div>
                                    </div>
                                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold">
                                        ⏳
                                    </div>
                                </div>
                            </div>

                            {/* Section 1: Đơn hàng đã chuyển */}
                            {dmsReportResult.transitioned && dmsReportResult.transitioned.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        Đơn hàng chuyển thành công ({dmsReportResult.transitioned.length})
                                    </div>
                                    <div className="space-y-2">
                                        {dmsReportResult.transitioned.map((item: any, idx: number) => (
                                            <div key={idx} className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-emerald-900 text-[13px]">{item.order_no}</span>
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                            {item.source || 'NDP Portal'}
                                                        </span>
                                                    </div>
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                                                        {item.ari_no?.startsWith('NDP') ? item.ari_no : `Mã: ${item.ari_no}`}
                                                    </span>
                                                </div>
                                                <div className="text-slate-600 text-[11px] flex items-center justify-between">
                                                    <span>Khách hàng: <b>{item.customer}</b></span>
                                                    <span>VIN: <b>{item.vin || 'N/A'}</b></span>
                                                </div>
                                                <div className="text-[10px] text-emerald-700">
                                                    Thời gian: <b>{item.invoice_date}</b> • Showroom: <b>{item.showroom || item.order_no?.split('-')[0]}</b>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Section 2: Đơn hàng chưa chuyển & Lý do */}
                            {dmsReportResult.unprocessed && dmsReportResult.unprocessed.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                        Đơn hàng chưa chuyển & Lý do chi tiết ({dmsReportResult.unprocessed.length})
                                    </div>
                                    <div className="space-y-2">
                                        {dmsReportResult.unprocessed.map((item: any, idx: number) => (
                                            <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-slate-800 text-[12px]">{item.order_no}</span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-semibold">
                                                        Showroom: {item.showroom || item.order_no?.split('-')[0]}
                                                    </span>
                                                </div>
                                                <div className="text-slate-600 text-[11px]">
                                                    Khách hàng: <b>{item.customer}</b> {item.vin ? `• VIN: ${item.vin}` : ''}
                                                </div>
                                                <div className="text-[11px] text-amber-800 bg-amber-50/80 p-2 rounded-lg border border-amber-200/60 mt-0.5">
                                                    <i className="fas fa-info-circle mr-1 text-amber-600"></i>
                                                    Lý do: <b>{item.reason}</b>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] text-slate-500 italic">
                                * Đơn đã chuyển sang "Chờ ký hóa đơn" sẽ tự động hiển thị trong tab tương ứng.
                            </span>
                            <div className="flex items-center gap-2">

                                <button
                                    onClick={() => handleBatchDmsCheckApproved(false)}
                                    disabled={isCheckingDms}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                                    title="Quét lại các đơn hàng ngay bây giờ"
                                >
                                    <i className={`fas ${isCheckingDms ? 'fa-spinner fa-spin' : 'fa-sync-alt'} text-xs`}></i>
                                    <span>Quét Lại</span>
                                </button>
                                <button
                                    onClick={() => setDmsReportResult(null)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                                >
                                    Đóng
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                                >
                                    <i className="fas fa-sync-alt text-xs"></i>
                                    <span>Tải lại trang</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.jpeg,.png,.jpg"
                onChange={handleFileChange}
            />
            </div>
        </>
    );
};

export default InvoiceInboxView;
