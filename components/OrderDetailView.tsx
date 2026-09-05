import React, { useState, useEffect } from 'react';
import moment from 'moment';
import 'moment/locale/vi';
import { Order } from '../types';
import StatusBadge from './ui/StatusBadge';
import CarImage from './ui/CarImage';
import LiveWeatherEffect from './ui/LiveWeatherEffect';
import NationalDayCarBackdrop from './ui/NationalDayCarBackdrop';

import carModelBadgeBgImg from '../pictures/car_model_badge_bg.webp';
import vinHeroCardBgImg from '../pictures/vin_hero_card_bg.webp';
import { getExteriorColorStyle, getInteriorColorStyle } from '../utils/styleUtils';
import SelectPolicyModal from './modals/SelectPolicyModal';
import RequestInvoiceModal from './modals/RequestInvoiceModal';
import { Policy, policyAdminService } from '../services/api/policyAdminService';
import { useVehicleConfig } from '../hooks/useVehicleConfig';
import { changeOrderConfiguration, updateOrderDetails } from '../services/apiService';
import MarqueeText from './ui/MarqueeText';

moment.locale('vi');

const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    const formats = [
        moment.ISO_8601,
        "DD/MM/YYYY HH:mm:ss",
        "D/M/YYYY H:m:s",
        "YYYY-MM-DD HH:mm:ss"
    ];
    const date = moment(dateString, formats, 'vi', true);
    return date.isValid() ? date.format('DD/MM/YYYY HH:mm:ss') : '—';
};

export interface OrderDetailViewProps {
    order: Order | null;
    orderList?: Order[];
    onNavigate?: (direction: 'prev' | 'next') => void;
    onCancel?: (order: Order) => void;
    onRequestInvoice?: (order: Order) => void;
    onSupplement?: (order: Order) => void;
    onRequestVC?: (order: Order) => void;
    onConfirmVC?: (order: Order) => void;
    onEdit?: (order: Order) => void;
    onSelectPolicy?: (order: Order, policy: string) => void;
    isReferenceAccount?: boolean;
    onClose?: () => void;
    /** For inline cancel: callback when cancel is confirmed */
    onCancelConfirm?: (order: Order, reason: string, unmatchType: string, thoiGianCanXe?: string) => Promise<void> | void;
    /** For inline invoice: callback when invoice is confirmed */
    onInvoiceConfirm?: (
        order: Order, contractFile: File, proposalFile: File, policy: string[],
        commission: string, vpoint: string, aiNote?: string, preProcessedPayloads?: any,
        xeXangVin?: string, xeXangHang?: string, xeXangModel?: string, maVc?: string
    ) => Promise<any>;
    showToast?: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    stockData?: any[];
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({
    order,
    orderList = [],
    onCancel,
    onRequestInvoice,
    onSupplement,
    onRequestVC,
    onConfirmVC,
    onEdit,
    onSelectPolicy,
    isReferenceAccount,
    onClose,
    onCancelConfirm,
    onInvoiceConfirm,
    showToast,
    stockData,
}) => {
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
    const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

    // Vehicle config hook for inline edit dropdowns
    const { versionsMap, vehicleLines } = useVehicleConfig();

    // Inline Action States
    const [inlineMode, setInlineMode] = useState<'VIEW' | 'POLICY' | 'CANCEL' | 'INVOICE' | 'EDIT'>('VIEW');
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loadingPolicies, setLoadingPolicies] = useState(false);
    const [policySearch, setPolicySearch] = useState('');
    const [selectedPolicyNames, setSelectedPolicyNames] = useState<string[]>([]);
    const [showOnlyMatchModel, setShowOnlyMatchModel] = useState(true);

    // Inline Edit States
    const [editFormData, setEditFormData] = useState<Partial<Order>>({});
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
    const [editSuccessMessage, setEditSuccessMessage] = useState<string | null>(null);

    // Inline Cancel States
    const [cancelReason, setCancelReason] = useState('');
    const [cancelUnmatchType, setCancelUnmatchType] = useState('Hủy luôn đơn hàng (Hủy đơn)');
    const [cancelThoiGianCanXe, setCancelThoiGianCanXe] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    // Interactive 3D Parallax Tilt State (Đề xuất 1)
    const [car3dRotation, setCar3dRotation] = useState<{ rx: number; ry: number; active: boolean }>({ rx: 0, ry: 0, active: false });

    const handleCarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const normX = (x / rect.width - 0.5) * 2;
        const normY = (y / rect.height - 0.5) * 2;

        setCar3dRotation({
            ry: normX * 8.5,
            rx: -normY * 6.0,
            active: true
        });
    };

    const handleCarMouseLeave = () => {
        setCar3dRotation({ rx: 0, ry: 0, active: false });
    };

    const resolvedOrder = order ? (orderList.find(o => o['Số đơn hàng'] === order['Số đơn hàng']) || order) : null;

    // Reset inline mode when switching to a different order
    useEffect(() => {
        setInlineMode('VIEW');
    }, [order?.['Số đơn hàng']]);

    useEffect(() => {
        if (inlineMode === 'EDIT' && resolvedOrder) {
            setEditFormData({
                "Tên khách hàng": resolvedOrder["Tên khách hàng"] || "",
                "Số đơn hàng": resolvedOrder["Số đơn hàng"] || "",
                "Dòng xe": resolvedOrder["Dòng xe"] || "",
                "Phiên bản": resolvedOrder["Phiên bản"] || "",
                "Ngoại thất": resolvedOrder["Ngoại thất"] || "",
                "Nội thất": resolvedOrder["Nội thất"] || "",
                "Ngày cọc": resolvedOrder["Ngày cọc"] ? moment(resolvedOrder["Ngày cọc"]).format('YYYY-MM-DDTHH:mm') : "",
                "Tên tư vấn bán hàng": resolvedOrder["Tên tư vấn bán hàng"] || "",
            });
            setEditErrorMessage(null);
            setEditSuccessMessage(null);
        }
    }, [inlineMode, resolvedOrder]);

    const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const val = name === 'Tên khách hàng' ? value.toUpperCase() : value;
        setEditFormData(prev => {
            const newState: Partial<Order> = { ...prev, [name]: val };
            if (name === 'Dòng xe') {
                newState['Phiên bản'] = '';
                newState['Ngoại thất'] = '';
                newState['Nội thất'] = '';
                const versions = versionsMap[value] || [];
                if (versions.length === 1) newState['Phiên bản'] = versions[0];
            }
            if (name === 'Phiên bản') {
                newState['Ngoại thất'] = '';
                newState['Nội thất'] = '';
            }
            return newState;
        });
    };

    const handleSaveInlineEdit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!resolvedOrder) return;

        if (!editFormData['Tên khách hàng'] || !editFormData['Số đơn hàng'] || !editFormData['Dòng xe'] || !editFormData['Phiên bản'] || !editFormData['Ngoại thất'] || !editFormData['Nội thất']) {
            setEditErrorMessage('Vui lòng điền đầy đủ các thông tin bắt buộc.');
            return;
        }

        setIsSavingEdit(true);
        setEditErrorMessage(null);
        setEditSuccessMessage(null);

        try {
            const isConfigChanged = (
                editFormData['Dòng xe'] !== resolvedOrder['Dòng xe'] ||
                editFormData['Phiên bản'] !== resolvedOrder['Phiên bản'] ||
                editFormData['Ngoại thất'] !== resolvedOrder['Ngoại thất'] ||
                editFormData['Nội thất'] !== resolvedOrder['Nội thất']
            );

            const changes: Partial<Order> = {};
            Object.keys(editFormData).forEach(key => {
                const formKey = key as keyof Order;
                const originalValue = resolvedOrder[formKey];
                const newValue = editFormData[formKey];

                if (formKey === 'Ngày cọc') {
                    const oldDate = originalValue ? moment(originalValue).format('YYYY-MM-DDTHH:mm') : '';
                    const newDate = newValue ? moment(newValue as string).format('YYYY-MM-DDTHH:mm') : '';
                    if (oldDate !== newDate) {
                        changes[formKey] = new Date(newValue as string).toISOString();
                    }
                } else if (String(newValue || '') !== String(originalValue || '')) {
                    changes[formKey] = newValue;
                }
            });

            if (Object.keys(changes).length === 0) {
                setInlineMode('VIEW');
                setIsSavingEdit(false);
                return;
            }

            if (isConfigChanged) {
                const configData = {
                    "Dòng xe": editFormData["Dòng xe"],
                    "Phiên bản": editFormData["Phiên bản"],
                    "Ngoại thất": editFormData["Ngoại thất"],
                    "Nội thất": editFormData["Nội thất"]
                };
                await changeOrderConfiguration(resolvedOrder['Số đơn hàng'], configData);

                const otherChanges: any = { ...changes };
                delete otherChanges["Dòng xe"];
                delete otherChanges["Phiên bản"];
                delete otherChanges["Ngoại thất"];
                delete otherChanges["Nội thất"];

                if (Object.keys(otherChanges).length > 0) {
                    await updateOrderDetails(resolvedOrder['Số đơn hàng'], otherChanges);
                }
            } else {
                await updateOrderDetails(resolvedOrder['Số đơn hàng'], changes);
            }

            setEditSuccessMessage('Cập nhật thông tin đơn hàng thành công!');
            if (onEdit) {
                onEdit({ ...resolvedOrder, ...changes });
            }
            setTimeout(() => {
                setInlineMode('VIEW');
            }, 800);
        } catch (err: any) {
            setEditErrorMessage(err.message || 'Cập nhật thất bại. Vui lòng thử lại.');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleInlineCancel = async () => {
        if (!resolvedOrder) return;
        if (!cancelReason.trim()) {
            showToast?.('Thiếu thông tin', 'Vui lòng nhập lý do hủy.', 'warning');
            return;
        }
        if (cancelUnmatchType.includes('Chờ xe') && !cancelThoiGianCanXe) {
            showToast?.('Thiếu thông tin', 'Vui lòng chọn thời gian cần xe.', 'warning');
            return;
        }
        setIsCancelling(true);
        try {
            await onCancelConfirm?.(
                resolvedOrder,
                cancelReason,
                cancelUnmatchType,
                cancelUnmatchType.includes('Chờ xe') ? cancelThoiGianCanXe : undefined
            );
            setInlineMode('VIEW');
            setCancelReason('');
            setCancelUnmatchType('Hủy luôn đơn hàng (Hủy đơn)');
            setCancelThoiGianCanXe('');
        } finally {
            setIsCancelling(false);
        }
    };

    useEffect(() => {
        if (inlineMode === 'POLICY' && resolvedOrder) {
            const fetchPolicies = async () => {
                setLoadingPolicies(true);
                const { status, data } = await policyAdminService.getAllPolicies();
                if (status === 'SUCCESS' && data) {
                    setPolicies(data.filter(p => p.trang_thai === 'Hoạt động'));
                }
                setLoadingPolicies(false);
            };
            fetchPolicies();

            const currentPolicy = resolvedOrder["CHÍNH SÁCH"];
            if (currentPolicy) {
                setSelectedPolicyNames(currentPolicy.split('; ').map(s => s.trim()).filter(Boolean));
            } else {
                setSelectedPolicyNames([]);
            }
        }
    }, [inlineMode, resolvedOrder]);

    if (!order || !resolvedOrder) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-white/95 backdrop-blur-3xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden relative">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:128px_128px] pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center text-3xl mb-4 shadow-inner mx-auto">
                        <i className="fas fa-hand-pointer animate-bounce"></i>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-800 mb-1">Chọn Đơn Hàng Để Xem Chi Tiết</h3>
                    <p className="text-xs text-text-secondary max-w-xs leading-relaxed">Nhấp vào bất kỳ đơn hàng nào từ danh sách bên trái để xem đầy đủ thông tin chi tiết tại đây.</p>
                </div>
            </div>
        );
    }
    const generalStatus = (resolvedOrder["Kết quả"] || "chưa ghép").toLowerCase().trim().normalize('NFC');
    const vcStatus = (resolvedOrder["Trạng thái VC"] || "").toLowerCase().trim().normalize('NFC');
    const statusText = resolvedOrder["Kết quả"] || resolvedOrder["Trạng thái VC"] || "Chưa ghép";
    const isCancelled = statusText.toLowerCase().includes('đã hủy') || statusText.toLowerCase().includes('từ chối');

    const isSupplementRequested = generalStatus === 'yêu cầu bổ sung';
    const adminNotes = (resolvedOrder['Ghi chú Admin'] || resolvedOrder.ghi_chu_admin || '').toString();
    const isRescanRequested = adminNotes.includes('[YÊU CẦU SCAN LẠI]');
    const canCancel = ['chưa ghép', 'đã ghép'].includes(generalStatus);
    const canRequestInvoice = generalStatus === 'đã ghép';
    const canAddSupplement = (isSupplementRequested || isRescanRequested) && !isCancelled;
    const canEdit = !!onEdit && ['chưa ghép', 'đã ghép'].includes(generalStatus);

    const invoiceDateStr = resolvedOrder["Ngày xuất hóa đơn"];
    const isDateValidForVC = !invoiceDateStr || (() => {
        const formats = ["DD/MM/YYYY", moment.ISO_8601, "YYYY-MM-DD HH:mm:ss", "D/M/YYYY"];
        const date = moment(invoiceDateStr, formats, 'vi', true);
        const cutoffDate = moment("2026-02-28").endOf('day');
        return date.isValid() && date.isSameOrBefore(cutoffDate);
    })();

    const canRequestVC = (generalStatus === 'đã xuất hóa đơn') &&
        !['chờ duyệt vc', 'đã cấp vc', 'từ chối vc', 'yêu cầu vinclub', 'chờ duyệt ycvc', 'chờ xác thực vc (tvbh)', 'đã có vc', 'từ chối ycvc'].includes(vcStatus) &&
        isDateValidForVC;
    const canConfirmVC = (vcStatus || generalStatus) === 'chờ xác thực vc (tvbh)';
    const canDownloadInvoice = !!resolvedOrder.LinkHoaDonDaXuat;

    let daysSincePairedText = '—';
    if (resolvedOrder["Thời gian ghép"]) {
        const formats = [moment.ISO_8601, "DD/MM/YYYY HH:mm:ss", "D/M/YYYY H:m:s", "YYYY-MM-DD HH:mm:ss"];
        const pairingDate = moment(resolvedOrder["Thời gian ghép"], formats, 'vi', true);
        if (pairingDate.isValid()) {
            const today = moment().startOf('day');
            const pairingDay = pairingDate.startOf('day');
            const days = today.diff(pairingDay, 'days');
            daysSincePairedText = `${Math.max(0, days)} ngày`;
        }
    }

    const togglePolicy = (name: string) => {
        setSelectedPolicyNames(prev => 
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        );
    };

    let filteredPolicies = policies.filter(p => 
        p.ten_chinh_sach.toLowerCase().includes(policySearch.toLowerCase()) ||
        (p.dong_xe || '').toLowerCase().includes(policySearch.toLowerCase())
    );

    const carModel = resolvedOrder["Dòng xe"];
    if (showOnlyMatchModel && carModel) {
        filteredPolicies = filteredPolicies.filter(p => {
            if (!p.dong_xe || p.dong_xe.trim() === '' || p.dong_xe.toLowerCase().includes('tất cả')) return true;
            const modelLower = carModel.toLowerCase();
            const policyModelLower = p.dong_xe.toLowerCase();
            return policyModelLower.includes(modelLower) || modelLower.includes(policyModelLower);
        });
    }







    return (
        <div className="h-full flex flex-col overflow-hidden rounded-2xl border border-gray-200 shadow-lg bg-white">
            {/* Compact header with Harmonized Gradient */}
            {inlineMode !== 'INVOICE' && (
            <header className="flex-shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-100/90 via-indigo-50/40 to-slate-100/90 rounded-t-2xl shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-1.5 h-5 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full flex-shrink-0 shadow-xs"></div>
                    <span className="text-sm font-extrabold text-slate-800 tracking-tight whitespace-nowrap">Chi tiết đơn hàng</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={statusText} />
                    {onClose && (
                        <button type="button" onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-all cursor-pointer" title="Đóng chi tiết">
                            <i className="fas fa-times text-xs"></i>
                        </button>
                    )}
                </div>
            </header>
            )}

            {/* Main Body (FLEX SCALE-TO-FIT NO SCROLL) */}
            {/* Main Body - Tech Micro-Dashed Dot Mesh (15% Darker) */}
            <main 
                className="flex-1 min-h-0 flex flex-col overflow-hidden relative"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M24 0 H0 V24' fill='none' stroke='%236366f1' stroke-width='0.8' stroke-opacity='0.24' stroke-dasharray='3 2' /%3E%3Ccircle cx='24' cy='0' r='1.2' fill='%236366f1' fill-opacity='0.35' /%3E%3C/svg%3E"), linear-gradient(135deg, rgba(238,242,255,0.5) 0%, rgba(255,255,255,0.95) 50%, rgba(241,245,249,0.6) 100%)`,
                    backgroundSize: '24px 24px, cover'
                }}
            >
            {inlineMode === 'INVOICE' ? (
                <RequestInvoiceModal
                    inline
                    order={resolvedOrder}
                    onClose={() => setInlineMode('VIEW')}
                    onConfirm={async (...args) => {
                        if (onInvoiceConfirm) await onInvoiceConfirm(...args);
                        else if (onRequestInvoice) onRequestInvoice(resolvedOrder);
                        setInlineMode('VIEW');
                    }}
                    stockData={stockData}
                    showToast={showToast || ((t, m, type) => console.log(t, m, type))}
                />
            ) : (
            <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-1.5 sm:gap-2 md:gap-6 px-1.5 py-1 md:px-6 md:py-3 overflow-hidden relative">
                
                {/* LEFT COLUMN: Borderless Car Display with Real-Time Weather Effect (Hidden on mobile when in inline EDIT/CANCEL/POLICY mode) */}
                <div className={`flex-[3.5] sm:flex-[4] md:flex-[5] ${inlineMode !== 'VIEW' ? 'hidden md:flex' : 'flex'} flex-col relative items-center justify-center py-0.5 md:py-1 shrink-0 min-h-[135px] sm:min-h-[170px] md:min-h-0`}>
                    {/* Live Dynamic Weather Backdrop (Nắng, Mưa, Ban đêm, Sấm sét) */}
                    <LiveWeatherEffect />
                    
                    {/* Cờ Tổ Quốc Phấp Phới Dưới Nền Xe */}
                    <NationalDayCarBackdrop />
                    

                    
                    {/* Interactive 3D Parallax Tilt Car Display */}
                    <div 
                        onMouseMove={handleCarMouseMove}
                        onMouseLeave={handleCarMouseLeave}
                        className="flex-1 w-full min-h-0 relative z-30 flex items-center justify-center py-0 select-none cursor-grab transform translate-x-0 md:translate-x-16 translate-y-0 md:translate-y-5"
                        style={{ perspective: '1200px' }}
                    >
                        <div 
                            className="w-full h-full flex items-center justify-center pointer-events-auto relative z-10"
                            style={{
                                transform: car3dRotation.active 
                                    ? `rotateX(${car3dRotation.rx.toFixed(2)}deg) rotateY(${car3dRotation.ry.toFixed(2)}deg) scale3d(1.04, 1.04, 1.04)`
                                    : 'rotateX(2deg) rotateY(-5deg) rotateZ(1.5deg) scale3d(1, 1, 1)',
                                transition: car3dRotation.active ? 'transform 0.12s ease-out' : 'transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                transformStyle: 'preserve-3d'
                            }}
                        >
                            <CarImage 
                                model={resolvedOrder['Dòng xe']} 
                                exteriorColor={resolvedOrder['Ngoại thất']}
                                version={resolvedOrder['Phiên bản']}
                                className="w-full max-h-[105px] sm:max-h-[160px] md:max-h-none md:h-full object-contain" 
                                hideDecal
                            />
                        </div>
                    </div>

                    {/* Floating Specs Pill */}
                    <div className="absolute bottom-0.5 md:bottom-2 left-1/2 -translate-x-1/2 w-max max-w-[98%] md:max-w-full z-40 pointer-events-auto">
                        <div className="relative overflow-hidden bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xl shadow-slate-900/10 rounded-xl md:rounded-3xl p-1 md:p-3 flex items-center gap-0.5 sm:gap-1.5 md:gap-6 backdrop-blur-md select-none group hover:scale-[1.02] transition-transform duration-300">

                            <div className="relative z-10 px-1 sm:px-2 md:px-4 text-center max-w-[85px] sm:max-w-[110px] md:max-w-none">
                                <p className="text-[7.5px] md:text-[9px] font-bold text-slate-500 uppercase tracking-wide md:tracking-widest mb-0.5 md:mb-1 truncate">Ngoại thất</p>
                                <p className="text-[8.5px] sm:text-[9.5px] md:text-[11px] font-black text-slate-900 truncate" style={getExteriorColorStyle(resolvedOrder["Ngoại thất"])}>{resolvedOrder["Ngoại thất"] || '—'}</p>
                            </div>
                            <div className="relative z-10 px-1 sm:px-2 md:px-4 text-center">
                                <p className="text-[7.5px] md:text-[9px] font-bold text-slate-500 uppercase tracking-wide md:tracking-widest mb-0.5 md:mb-1">Nội thất</p>
                                <p className="text-[8.5px] sm:text-[9.5px] md:text-[11px] font-black text-slate-900 truncate" style={getInteriorColorStyle(resolvedOrder["Nội thất"])}>{resolvedOrder["Nội thất"] || '—'}</p>
                            </div>
                            <div 
                                className="relative z-10 px-1 sm:px-2 md:px-4 text-center cursor-pointer group/dms rounded-lg md:rounded-2xl hover:bg-indigo-100/50 transition-colors py-0.5 md:py-1"
                                onClick={(e) => {
                                    const dmsVal = resolvedOrder["Mã DMS"] || resolvedOrder["Mã DMS"] || '';
                                    if (!dmsVal) return;
                                    e.stopPropagation();
                                    const copyDms = () => {
                                        setCopiedLabel('dmsCode');
                                        setTimeout(() => setCopiedLabel(null), 2000);
                                    };
                                    if (navigator.clipboard && navigator.clipboard.writeText) {
                                        navigator.clipboard.writeText(dmsVal).then(copyDms).catch(() => {
                                            const ta = document.createElement('textarea');
                                            ta.value = dmsVal;
                                            document.body.appendChild(ta);
                                            ta.select();
                                            document.execCommand('copy');
                                            document.body.removeChild(ta);
                                            copyDms();
                                        });
                                    } else {
                                        const ta = document.createElement('textarea');
                                        ta.value = dmsVal;
                                        document.body.appendChild(ta);
                                        ta.select();
                                        document.execCommand('copy');
                                        document.body.removeChild(ta);
                                        copyDms();
                                    }
                                }}
                                title={resolvedOrder["Mã DMS"] ? "Click để sao chép Mã DMS" : "Chưa có Mã DMS"}
                            >
                                <p className="text-[7.5px] md:text-[9px] font-bold text-slate-500 uppercase tracking-wide md:tracking-widest mb-0.5 md:mb-1 group-hover/dms:text-indigo-800 transition-colors">Mã DMS</p>
                                <p className="text-[8.5px] sm:text-[9.5px] md:text-[11px] font-black font-mono text-indigo-800 truncate">
                                    {copiedLabel === 'dmsCode' ? '✓ Đã copy' : resolvedOrder["Mã DMS"] || '—'}
                                </p>
                            </div>
                            <div 
                                className="relative z-10 px-1 sm:px-2 md:px-4 text-center cursor-pointer group/engine rounded-lg md:rounded-2xl hover:bg-amber-100/50 transition-colors py-0.5 md:py-1"
                                onClick={(e) => {
                                    const engineVal = resolvedOrder["Số máy"] || resolvedOrder["Số Máy"] || resolvedOrder["So may"] || '';
                                    if (!engineVal) return;
                                    e.stopPropagation();
                                    const copyEngine = () => {
                                        setCopiedLabel('engineNo');
                                        setTimeout(() => setCopiedLabel(null), 2000);
                                    };
                                    if (navigator.clipboard && navigator.clipboard.writeText) {
                                        navigator.clipboard.writeText(engineVal).then(copyEngine).catch(() => {
                                            const ta = document.createElement('textarea');
                                            ta.value = engineVal;
                                            document.body.appendChild(ta);
                                            ta.select();
                                            document.execCommand('copy');
                                            document.body.removeChild(ta);
                                            copyEngine();
                                        });
                                    } else {
                                        const ta = document.createElement('textarea');
                                        ta.value = engineVal;
                                        document.body.appendChild(ta);
                                        ta.select();
                                        document.execCommand('copy');
                                        document.body.removeChild(ta);
                                        copyEngine();
                                    }
                                }}
                                title={resolvedOrder["Số máy"] ? "Click để sao chép số máy" : "Chưa có số máy"}
                            >
                                <p className="text-[7.5px] md:text-[9px] font-bold text-slate-500 uppercase tracking-wide md:tracking-widest mb-0.5 md:mb-1 group-hover/engine:text-amber-800 transition-colors">Số Máy</p>
                                <p className="text-[8.5px] sm:text-[9.5px] md:text-[11px] font-black font-mono text-slate-900 truncate max-w-[65px] sm:max-w-[100px] md:max-w-[120px]">
                                    {copiedLabel === 'engineNo' ? '✓ Đã copy' : resolvedOrder["Số máy"] || '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Dynamic Animated Car Model & Trim Badge */}
                    <div className="absolute top-1 left-1 md:top-2 md:left-2 z-20 flex flex-col gap-1 md:gap-2">
                        <div className="relative group overflow-hidden rounded-lg md:rounded-2xl shadow-xl shadow-slate-900/30 border border-slate-700/80 w-max flex items-center justify-center transition-transform duration-300 hover:scale-105 select-none">
                            {/* Animated Background WebP */}
                            <img 
                                src={carModelBadgeBgImg} 
                                alt="Badge Background" 
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                            />
                            {/* Model & Trim Text with Glowing Contrast */}
                            <span className="relative z-10 px-2 py-1 md:px-4 md:py-2 text-white text-[8.5px] sm:text-[9.5px] md:text-[10.5px] font-black uppercase tracking-wider md:tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex items-center gap-1 sm:gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping opacity-75"></span>
                                <span className="text-cyan-300 font-extrabold tracking-wider">{resolvedOrder['Dòng xe']}</span>
                                <span className="text-white/95">{resolvedOrder['Phiên bản']}</span>
                            </span>
                        </div>
                        {isCancelled && resolvedOrder["Ghi chú hủy"] && (
                            <span className="px-2 py-0.5 md:px-4 md:py-2 bg-red-500/90 backdrop-blur text-white text-[8px] md:text-[10px] font-bold rounded-lg md:rounded-2xl shadow-lg border border-red-400 max-w-[160px] md:max-w-[200px] text-right truncate w-max" title={resolvedOrder["Ghi chú hủy"]}>
                                Lý do hủy: {resolvedOrder["Ghi chú hủy"]}
                            </span>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Apple Frosted Glass Architecture Card */}
                <div className="flex-[6.5] md:flex-[6] max-w-lg w-full flex flex-col bg-white/85 backdrop-blur-2xl rounded-2xl md:rounded-3xl border border-slate-200/70 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.06),inset_0_1px_1px_rgba(255,255,255,0.95)] overflow-hidden md:overflow-visible relative z-10 mx-auto md:mx-0 p-2 sm:p-3 md:p-4 pt-3 md:pt-6 gap-2 md:gap-3">
                    {inlineMode === 'CANCEL' ? (
                        <div className="flex-1 flex flex-col h-full p-4 md:p-6 bg-white/90 rounded-2xl border border-red-100 overflow-hidden animate-fade-in justify-between">
                            {/* Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-red-100 shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-red-100/80 rounded-xl flex items-center justify-center shrink-0">
                                        <i className="fas fa-exclamation-triangle text-red-500 text-sm"></i>
                                    </div>
                                    <h3 className="text-xs font-black text-slate-800 tracking-tight uppercase">Xác Nhận Hủy Đơn</h3>
                                </div>
                                <button
                                    onClick={() => setInlineMode('VIEW')}
                                    className="px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                                >
                                    <i className="fas fa-arrow-left text-[9px]"></i> Quay lại
                                </button>
                            </div>

                            {/* Order summary */}
                            <div className="shrink-0 mt-3 mb-2 p-3 bg-red-50/60 border border-red-100 rounded-xl text-[12px] text-slate-700 leading-relaxed">
                                Hủy yêu cầu đơn{' '}
                                <strong className="font-mono text-slate-900 bg-white border border-red-200 px-1.5 py-0.5 rounded text-[11px]">
                                    {resolvedOrder['Số đơn hàng']}
                                </strong>{' '}
                                — <strong className="text-slate-900">{resolvedOrder['Tên khách hàng']}</strong>?
                            </div>

                            {/* Form fields */}
                            <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto">
                                {/* Cancel type */}
                                <div className="space-y-1">
                                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                        Tùy chọn hủy <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={cancelUnmatchType}
                                        onChange={(e) => setCancelUnmatchType(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[13px] focus:border-red-400 focus:ring-4 focus:ring-red-400/10 transition-all outline-none text-slate-700"
                                    >
                                        <option value="Hủy luôn đơn hàng (Hủy đơn)">Hủy luôn đơn hàng (Hủy đơn)</option>
                                        <option value="Hủy ghép & Đợi xe khác (Chờ xe)">Hủy ghép &amp; Đợi xe khác (Chờ xe)</option>
                                    </select>
                                </div>

                                {/* Thời gian cần xe */}
                                {cancelUnmatchType.includes('Chờ xe') && (
                                    <div className="animate-fade-in p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                                        <label className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                                            <i className="far fa-calendar-alt text-[10px]"></i>
                                            Thời gian cần xe <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={cancelThoiGianCanXe}
                                            onChange={(e) => setCancelThoiGianCanXe(e.target.value)}
                                            className="w-full bg-white border border-amber-200 rounded-lg p-2 text-[13px] focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all outline-none text-slate-700 font-bold"
                                        />
                                    </div>
                                )}

                                {/* Reason */}
                                <div className="space-y-1 flex-1 flex flex-col">
                                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                        Lý do hủy <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[13px] focus:border-red-400 focus:ring-4 focus:ring-red-400/10 transition-all outline-none resize-none text-slate-700 placeholder:text-slate-400"
                                        placeholder="Nhập lý do hủy..."
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 mt-2">
                                <button
                                    onClick={() => setInlineMode('VIEW')}
                                    disabled={isCancelling}
                                    className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shadow-2xs disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleInlineCancel}
                                    disabled={isCancelling || !cancelReason.trim()}
                                    className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition-all disabled:opacity-50"
                                >
                                    {isCancelling ? 'Đang xử lý...' : 'Xác Nhận Hủy'}
                                </button>
                            </div>
                        </div>
                    ) : inlineMode === 'EDIT' ? (
                        <div className="flex-1 flex flex-col h-full p-4 md:p-6 bg-white/90 rounded-2xl border border-slate-200/80 overflow-hidden animate-fade-in justify-between">
                            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
                                <h3 className="text-xs font-black text-slate-800 tracking-tight uppercase">Chỉnh Sửa Đơn Hàng</h3>
                                <button 
                                    type="button"
                                    onClick={() => setInlineMode('VIEW')}
                                    className="px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                                >
                                    <i className="fas fa-arrow-left text-[9px]"></i> Quay lại
                                </button>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto hidden-scrollbar py-2 space-y-3">
                                {resolvedOrder.VIN && (
                                    <div className="p-2.5 px-3.5 bg-amber-50/90 border border-amber-200/80 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 shadow-2xs shrink-0">
                                        <div className="w-4 h-4 rounded bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 text-[10px] font-bold">
                                            <i className="fas fa-lock"></i>
                                        </div>
                                        <div className="leading-tight truncate">
                                            <span className="font-extrabold text-amber-950 mr-1">Đã ghép VIN ({resolvedOrder.VIN}):</span>
                                            <span className="text-amber-800 text-[11px]">Đổi cấu hình sẽ giải phóng VIN.</span>
                                        </div>
                                    </div>
                                )}

                                {editErrorMessage && (
                                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2 shrink-0">
                                        <i className="fas fa-exclamation-circle text-red-500"></i>
                                        <span>{editErrorMessage}</span>
                                    </div>
                                )}
                                {editSuccessMessage && (
                                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2 shrink-0">
                                        <i className="fas fa-check-circle text-emerald-500"></i>
                                        <span>{editSuccessMessage}</span>
                                    </div>
                                )}

                                <form id="inline-edit-order-form" onSubmit={handleSaveInlineEdit} className="flex-1 flex flex-col justify-between py-1 gap-3 md:gap-5">
                                    <div className="space-y-2 md:space-y-3">
                                        <h4 className="text-[10.5px] md:text-[11px] font-black text-blue-600 uppercase tracking-wider">THÔNG TIN KHÁCH HÀNG</h4>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-4">
                                            <div>
                                                <label className="block text-[10px] md:text-[10.5px] font-bold text-slate-500 uppercase tracking-wide mb-1 truncate">TVBH (ADMIN ONLY)</label>
                                                <div className="relative">
                                                    <i className="fas fa-user-tie absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                                    <input 
                                                        type="text"
                                                        name="Tên tư vấn bán hàng"
                                                        value={editFormData['Tên tư vấn bán hàng'] || ''}
                                                        onChange={handleEditInputChange}
                                                        placeholder="Tên TVBH..."
                                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl pl-8 pr-2.5 py-2 md:py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] md:text-[10.5px] font-bold text-slate-500 uppercase tracking-wide mb-1 truncate">TÊN KHÁCH HÀNG</label>
                                                <div className="relative">
                                                    <i className="fas fa-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                                    <input 
                                                        type="text"
                                                        name="Tên khách hàng"
                                                        value={editFormData['Tên khách hàng'] || ''}
                                                        onChange={handleEditInputChange}
                                                        placeholder="Tên khách hàng..."
                                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl pl-8 pr-2.5 py-2 md:py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] md:text-[10.5px] font-bold text-slate-500 uppercase tracking-wide mb-1 truncate">SỐ ĐƠN HÀNG</label>
                                                <div className="relative">
                                                    <i className="fas fa-file-invoice absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                                    <input 
                                                        type="text"
                                                        name="Số đơn hàng"
                                                        value={editFormData['Số đơn hàng'] || ''}
                                                        onChange={handleEditInputChange}
                                                        placeholder="Mã đơn hàng..."
                                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl pl-8 pr-2.5 py-2 md:py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 md:space-y-3">
                                        <h4 className="text-[10.5px] md:text-[11px] font-black text-indigo-600 uppercase tracking-wider">CẤU HÌNH XE</h4>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-4">
                                            <div>
                                                <label className="block text-[10px] md:text-[10.5px] font-bold text-slate-500 uppercase tracking-wide mb-1 truncate">DÒNG XE</label>
                                                <div className="relative">
                                                    <i className="fas fa-car absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                                    <select
                                                        name="Dòng xe"
                                                        value={editFormData['Dòng xe'] || ''}
                                                        onChange={handleEditInputChange}
                                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl pl-8 pr-7 py-2 md:py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                                                    >
                                                        <option value="">Chọn dòng xe</option>
                                                        {vehicleLines.map(line => (
                                                            <option key={line} value={line}>{line}</option>
                                                        ))}
                                                    </select>
                                                    <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] md:text-[10.5px] font-bold text-slate-500 uppercase tracking-wide mb-1 truncate">PHIÊN BẢN</label>
                                                <div className="relative">
                                                    <i className="fas fa-code-branch absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                                    <select
                                                        name="Phiên bản"
                                                        value={editFormData['Phiên bản'] || ''}
                                                        onChange={handleEditInputChange}
                                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl pl-8 pr-7 py-2 md:py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                                                    >
                                                        <option value="">Chọn phiên bản</option>
                                                        {(versionsMap[editFormData['Dòng xe'] || ''] || []).map(ver => (
                                                            <option key={ver} value={ver}>{ver}</option>
                                                        ))}
                                                    </select>
                                                    <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white/90 z-10">
                                <button 
                                    type="button"
                                    onClick={() => setInlineMode('VIEW')}
                                    className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shadow-2xs"
                                >
                                    Hủy
                                </button>
                                <button 
                                    type="submit"
                                    form="inline-edit-order-form"
                                    disabled={isSavingEdit}
                                    className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition-all disabled:opacity-50"
                                >
                                    {isSavingEdit ? 'Đang lưu...' : 'Lưu'}
                                </button>
                            </div>
                        </div>
                    ) : inlineMode === 'POLICY' ? (
                        <div className="flex-1 flex flex-col p-5 md:p-6 bg-white/90 rounded-2xl border border-slate-200/80 overflow-hidden animate-fade-in">
                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
                                <div>
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                        <i className="fas fa-gift text-amber-500"></i> Cập Nhật Chính Sách Ưu Đãi
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                        Dòng xe: <span className="text-indigo-600 font-extrabold">{resolvedOrder["Dòng xe"] || 'Tất cả'}</span>
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setInlineMode('VIEW')}
                                    className="px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                                >
                                    <i className="fas fa-arrow-left text-[9px]"></i> Quay lại
                                </button>
                            </div>

                            <div className="flex items-center gap-3 mb-3 shrink-0">
                                <div className="relative flex-1">
                                    <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                    <input 
                                        type="text"
                                        placeholder="Tìm kiếm chính sách..."
                                        value={policySearch}
                                        onChange={e => setPolicySearch(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                    />
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer shrink-0 select-none">
                                    <input 
                                        type="checkbox"
                                        checked={showOnlyMatchModel}
                                        onChange={e => setShowOnlyMatchModel(e.target.checked)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 transition-all"
                                    />
                                    <span className="text-xs font-bold text-slate-600">Đúng dòng xe</span>
                                </label>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
                                {loadingPolicies ? (
                                    <div className="py-12 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-2 justify-center">
                                        <i className="fas fa-circle-notch animate-spin text-lg text-indigo-500"></i>
                                        Đang tải danh sách chính sách...
                                    </div>
                                ) : filteredPolicies.length === 0 ? (
                                    <div className="py-12 text-center text-xs font-bold text-slate-400">Không tìm thấy chính sách phù hợp</div>
                                ) : (
                                    filteredPolicies.map(p => {
                                        const isChecked = selectedPolicyNames.includes(p.ten_chinh_sach);
                                        return (
                                            <div 
                                                key={p.id || p.ten_chinh_sach}
                                                onClick={() => togglePolicy(p.ten_chinh_sach)}
                                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                                    isChecked 
                                                        ? 'bg-amber-500/[0.08] border-amber-400 text-amber-950 font-bold shadow-xs' 
                                                        : 'bg-white/80 border-slate-200/80 hover:bg-slate-50 text-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[9px] border transition-colors shrink-0 ${
                                                        isChecked ? 'bg-amber-500 border-amber-600 text-white' : 'border-slate-300 bg-white'
                                                    }`}>
                                                        {isChecked && <i className="fas fa-check"></i>}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold truncate">{p.ten_chinh_sach}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                                <button 
                                    onClick={() => setInlineMode('VIEW')}
                                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shadow-2xs"
                                >
                                    Đóng
                                </button>
                                <button 
                                    onClick={() => {
                                        if (onSelectPolicy) {
                                            onSelectPolicy(resolvedOrder, selectedPolicyNames.join('; '));
                                        }
                                        setInlineMode('VIEW');
                                    }}
                                    className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition-all"
                                >
                                    Lưu
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Executive Obsidian Platinum Hero Card: VIN & Customer */}
                            <div className="relative flex-shrink-0">
                                <div id="vin-hero-card" className="p-3 sm:p-4 md:p-5 text-white rounded-xl md:rounded-[1.4rem] shadow-[0_12px_36px_-6px_rgba(15,23,42,0.45)] relative overflow-hidden group">
                                    {/* Animated High-Tech Hologram & Laser Pulse Background */}
                                    <img 
                                        src={vinHeroCardBgImg} 
                                        alt="VIN Card Background" 
                                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                    />
                                    
                                    <div className="relative z-10 flex flex-col gap-2 md:gap-4">
                                        <div className="text-center">
                                            <p className="text-[8.5px] md:text-[9.5px] font-bold text-sky-300/90 uppercase tracking-[0.2em] md:tracking-[0.25em] mb-1 md:mb-1.5 flex items-center justify-center gap-1.5">
                                                <i className="fas fa-barcode text-[11px] md:text-xs text-sky-400"></i> Số Khung (VIN)
                                            </p>
                                            <div 
                                                className="cursor-pointer group inline-block py-0.5 relative max-w-full"
                                                onClick={(e) => {
                                                    if (!resolvedOrder.VIN) return;
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(resolvedOrder.VIN).then(() => {
                                                        setCopiedLabel('vin');
                                                        setTimeout(() => setCopiedLabel(null), 2000);
                                                    });
                                                }}
                                                title={resolvedOrder.VIN ? "Click để sao chép VIN" : "Chưa có VIN"}
                                            >
                                                <div className="px-1 py-0.5 sm:px-2 sm:py-1 md:px-3 md:py-1.5 transition-all duration-300 group-hover:scale-[1.02] group-active:scale-[0.98]">
                                                    <p 
                                                        className={`text-[19px] sm:text-2xl md:text-[36px] lg:text-[38px] font-black tracking-[0.06em] sm:tracking-[0.12em] md:tracking-[0.16em] leading-none select-all inline-block truncate max-w-full ${
                                                            resolvedOrder.VIN 
                                                                ? 'drop-shadow-[0_2px_12px_rgba(255,255,255,0.5)] drop-shadow-[0_6px_22px_rgba(0,0,0,0.9)]' 
                                                                : 'text-slate-500'
                                                        }`}
                                                        style={{ 
                                                            fontFamily: "'Barlow Condensed', 'Rajdhani', 'Bahnschrift', 'Space Grotesk', sans-serif",
                                                            background: resolvedOrder.VIN 
                                                                ? 'linear-gradient(180deg, #ffffff 0%, #f8fafc 18%, #cbd5e1 38%, #ffffff 48%, #64748b 52%, #94a3b8 72%, #cbd5e1 100%)' 
                                                                : undefined,
                                                            WebkitBackgroundClip: resolvedOrder.VIN ? 'text' : undefined,
                                                            WebkitTextFillColor: resolvedOrder.VIN ? 'transparent' : undefined
                                                        }}
                                                    >
                                                        {copiedLabel === 'vin' ? '✓ ĐÃ SAO CHÉP VIN' : resolvedOrder.VIN || 'CHƯA GHÉP XE'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Customer & Order Code Section */}
                                        <div className="flex items-center justify-between pt-1 md:pt-2 gap-2">
                                            <div className="min-w-0 pr-1.5 sm:pr-2 flex-1 overflow-hidden">
                                                <MarqueeText 
                                                    text={copiedLabel === 'customer' ? '✓ ĐÃ SAO CHÉP TÊN KH' : (resolvedOrder['Tên khách hàng'] || '—')} 
                                                    className="text-[11.5px] sm:text-xs md:text-sm font-extrabold text-white tracking-tight uppercase cursor-pointer hover:text-amber-200 transition-colors"
                                                    title={resolvedOrder['Tên khách hàng'] ? `Click để sao chép: ${resolvedOrder['Tên khách hàng']}` : undefined}
                                                    onClick={(e) => {
                                                        const name = resolvedOrder['Tên khách hàng'];
                                                        if (!name) return;
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(name).then(() => {
                                                            setCopiedLabel('customer');
                                                            setTimeout(() => setCopiedLabel(null), 2000);
                                                        });
                                                    }}
                                                />
                                                <p className="text-[9px] md:text-[10px] font-medium text-slate-400 mt-0.5 truncate flex items-center gap-1.5"><i className="fas fa-user-tie text-[8.5px] md:text-[9px] text-indigo-400"></i> {resolvedOrder['Tên tư vấn bán hàng']}</p>
                                            </div>
                                            <div 
                                                className="text-right cursor-pointer group flex-shrink-0 bg-white/[0.06] hover:bg-white/[0.14] backdrop-blur-md px-2 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl transition-all active:scale-95"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(resolvedOrder["Số đơn hàng"]).then(() => {
                                                        setCopiedLabel('orderId');
                                                        setTimeout(() => setCopiedLabel(null), 2000);
                                                    });
                                                }}
                                                title="Click để sao chép mã đơn hàng"
                                            >
                                                <p className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Mã Đơn</p>
                                                <p className="text-[9.5px] sm:text-[10.5px] md:text-[11px] font-black font-mono text-white tracking-wide">{copiedLabel === 'orderId' ? '✓ Đã copy' : resolvedOrder['Số đơn hàng']}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Executive Split Panels (Timeline & Policies) */}
                            <div className="flex-1 min-h-0 bg-slate-50/70 backdrop-blur-xl rounded-2xl border border-slate-200/80 p-3 md:p-3.5 flex flex-col justify-between overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-2.5 items-stretch flex-1">
                                    {/* Left: 3 Stacked Frosted Milestone Cards (Phương Án 1) */}
                                    <div className="flex flex-col justify-between gap-2.5">
                                        <div className="flex items-center justify-between pb-0.5">
                                            <h3 className="text-[9.5px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                                <i className="fa-solid fa-bars-progress text-indigo-500 text-[10px]"></i> Tiến Độ Xử Lý
                                            </h3>
                                            <span className="text-[9px] font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                                                Ghép: {daysSincePairedText}
                                            </span>
                                        </div>

                                        {(() => {
                                            const hasInvoiced = Boolean(resolvedOrder["Ngày xuất hóa đơn"] || resolvedOrder.LinkHoaDonDaXuat);
                                            const isAllCompleted = Boolean(resolvedOrder["Thời gian ghép"] && hasInvoiced);

                                            return (
                                                <div className="flex flex-col flex-1 justify-around py-0.5">
                                                    {/* Card 1: Ngày Cọc */}
                                                    <div className="px-3 py-1.5 md:py-2 bg-white/95 hover:bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2.5 transition-all relative z-10">
                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            <div className="w-5 h-5 text-amber-500 flex items-center justify-center shrink-0">
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                                                    <rect x="2" y="5" width="20" height="14" rx="2" />
                                                                    <line x1="2" y1="10" x2="22" y2="10" />
                                                                    <circle cx="6.5" cy="15" r="1" fill="currentColor" />
                                                                </svg>
                                                            </div>
                                                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1 text-left w-full">1. Ngày Cọc</p>
                                                                <p className="text-[10px] md:text-[10.5px] font-bold text-slate-800 tracking-tight tabular-nums whitespace-nowrap leading-none text-center w-full">
                                                                    {formatDateTime(resolvedOrder["Ngày cọc"])}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[8.5px] font-bold shrink-0">✓</span>
                                                    </div>

                                                    {/* Flowchart Directional Arrow 1 -> 2 */}
                                                    <div className="flex items-center justify-center py-0.5">
                                                        <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                            <line x1="12" y1="4" x2="12" y2="20" />
                                                            <polyline points="18 14 12 20 6 14" />
                                                        </svg>
                                                    </div>

                                                    {/* Card 2: Tạo Yêu Cầu */}
                                                    <div className={`px-3 py-1.5 md:py-2 rounded-xl border shadow-2xs flex items-center justify-between gap-2.5 transition-all relative z-10 ${
                                                        resolvedOrder["Thời gian nhập"]
                                                            ? 'bg-white/95 hover:bg-white border-slate-200/90'
                                                            : 'bg-slate-100/70 border-slate-200/50 opacity-60'
                                                    }`}>
                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            <div className={`w-5 h-5 flex items-center justify-center shrink-0 ${
                                                                resolvedOrder["Thời gian nhập"] ? 'text-sky-500' : 'text-slate-300'
                                                            }`}>
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            </div>
                                                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1 text-left w-full">2. Tạo Yêu Cầu</p>
                                                                <p className="text-[10px] md:text-[10.5px] font-bold text-slate-800 tracking-tight tabular-nums whitespace-nowrap leading-none text-center w-full">
                                                                    {resolvedOrder["Thời gian nhập"] ? formatDateTime(resolvedOrder["Thời gian nhập"]) : 'Đang chờ xử lý'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {resolvedOrder["Thời gian nhập"] ? (
                                                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[8.5px] font-bold shrink-0">✓</span>
                                                        ) : <div className="w-3.5" />}
                                                    </div>

                                                    {/* Flowchart Directional Arrow 2 -> 3 */}
                                                    <div className="flex items-center justify-center py-0.5">
                                                        <svg className={`w-3.5 h-3.5 transition-colors ${resolvedOrder["Thời gian ghép"] ? (isAllCompleted ? 'text-slate-400' : 'text-emerald-500') : 'text-slate-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                            <line x1="12" y1="4" x2="12" y2="20" />
                                                            <polyline points="18 14 12 20 6 14" />
                                                        </svg>
                                                    </div>

                                                    {/* Card 3: Ghép VIN */}
                                                    <div className={`px-3 py-1.5 md:py-2 rounded-xl border shadow-2xs flex items-center justify-between gap-2.5 transition-all relative z-10 ${
                                                        resolvedOrder["Thời gian ghép"]
                                                            ? isAllCompleted
                                                                ? 'bg-white/95 hover:bg-white border-slate-200/90'
                                                                : 'bg-emerald-500/[0.08] hover:bg-emerald-500/[0.12] border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
                                                            : 'bg-slate-100/70 border-slate-200/50 opacity-60'
                                                    }`}>
                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            <div className={`w-5 h-5 flex items-center justify-center shrink-0 ${
                                                                resolvedOrder["Thời gian ghép"] ? 'text-emerald-500' : 'text-slate-300'
                                                            }`}>
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                                                                    <circle cx="7" cy="17" r="1.5" />
                                                                    <circle cx="17" cy="17" r="1.5" />
                                                                </svg>
                                                            </div>
                                                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1 text-left w-full">3. Ghép VIN</p>
                                                                <p className="text-[10px] md:text-[10.5px] font-bold text-slate-800 tracking-tight tabular-nums whitespace-nowrap leading-none text-center w-full">
                                                                    {resolvedOrder["Thời gian ghép"] ? formatDateTime(resolvedOrder["Thời gian ghép"]) : 'Chưa ghép xe'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {resolvedOrder["Thời gian ghép"] ? (
                                                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[8.5px] font-bold shrink-0">✓</span>
                                                        ) : <div className="w-3.5" />}
                                                    </div>

                                                    {/* Flowchart Directional Arrow 3 -> 4 */}
                                                    <div className="flex items-center justify-center py-0.5">
                                                        <svg className={`w-3.5 h-3.5 transition-colors ${hasInvoiced ? (isAllCompleted ? 'text-slate-400' : 'text-blue-500') : 'text-slate-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                            <line x1="12" y1="4" x2="12" y2="20" />
                                                            <polyline points="18 14 12 20 6 14" />
                                                        </svg>
                                                    </div>

                                                    {/* Card 4: Xuất Hóa Đơn */}
                                                    <div className={`px-3 py-1.5 md:py-2 rounded-xl border shadow-2xs flex items-center justify-between gap-2.5 transition-all relative z-10 ${
                                                        hasInvoiced
                                                            ? isAllCompleted
                                                                ? 'bg-white/95 hover:bg-white border-slate-200/90'
                                                                : 'bg-blue-500/[0.08] hover:bg-blue-500/[0.12] border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.12)]'
                                                            : 'bg-slate-100/70 border-slate-200/50 opacity-60'
                                                    }`}>
                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            <div className={`w-5 h-5 flex items-center justify-center shrink-0 ${
                                                                hasInvoiced ? 'text-indigo-500' : 'text-slate-300'
                                                            }`}>
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                                                                </svg>
                                                            </div>
                                                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1 text-left w-full">4. Xuất Hóa Đơn</p>
                                                                <p className="text-[10px] md:text-[10.5px] font-bold text-slate-800 tracking-tight tabular-nums whitespace-nowrap leading-none text-center w-full">
                                                                    {resolvedOrder["Ngày xuất hóa đơn"] ? formatDateTime(resolvedOrder["Ngày xuất hóa đơn"]) : (resolvedOrder.LinkHoaDonDaXuat ? 'Đã xuất HĐ' : 'Chưa xuất HĐ')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {hasInvoiced ? (
                                                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[8.5px] font-bold shrink-0">✓</span>
                                                        ) : <div className="w-3.5" />}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Right: Executive Policy Cards */}
                                    <div className="flex flex-col justify-between gap-2.5 border-t md:border-t-0 md:border-l border-slate-200/80 pt-2 md:pt-0 md:pl-2.5 flex-1">
                                        <h3 className="text-[9.5px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                            <i className="fas fa-gift text-indigo-600 text-[10px]"></i> Chính Sách Ưu Đãi
                                        </h3>
                                        
                                        <div className="flex-1 flex flex-col justify-between bg-white rounded-2xl p-2.5 md:p-3 border border-slate-200/80 shadow-2xs min-h-[110px]">
                                            {(() => {
                                                const rawPolicy: string = String(resolvedOrder["CHÍNH SÁCH"] || (resolvedOrder as any).chinh_sach || (resolvedOrder as any)["Chính sách"] || (resolvedOrder as any).policy || '');
                                                if (!rawPolicy) return <p className="text-[10.5px] font-medium text-slate-400 italic my-auto text-center">Không có chính sách</p>;
                                                
                                                const items: string[] = rawPolicy.includes('\n') 
                                                    ? rawPolicy.split('\n') 
                                                    : rawPolicy.includes(';') 
                                                        ? rawPolicy.split(';') 
                                                        : [rawPolicy];

                                                return (
                                                    <div className="flex-1 overflow-y-auto pr-0.5 space-y-1.5 mb-1.5">
                                                        {items.map((s: string) => s.trim()).filter(Boolean).map((item: string, idx: number) => (
                                                            <div key={idx} className="flex items-start gap-1.5 bg-slate-50/80 px-2 py-1.5 rounded-lg border border-slate-200/60 shadow-2xs">
                                                                <i className="fas fa-check-circle text-emerald-600 text-[8.5px] mt-0.5 shrink-0"></i>
                                                                <span className="text-[9.5px] font-medium text-slate-600 leading-snug">{item}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                            
                                            {onSelectPolicy && !isReferenceAccount && ['chưa ghép', 'đã ghép'].includes(generalStatus) && (
                                                <button 
                                                    onClick={() => setInlineMode('POLICY')}
                                                    className="mt-1 text-[9.5px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-900 hover:text-white border border-slate-200 px-3 py-1.5 rounded-xl transition-all w-full text-center shadow-2xs active:scale-95 cursor-pointer"
                                                >
                                                    Cập nhật chính sách
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            )}
            </main>

            {/* Apple Minimalist Actions Dock Footer */}
            {inlineMode === 'VIEW' && (
            <footer className="flex-shrink-0 px-3 py-2 md:px-5 md:py-3 bg-white/90 backdrop-blur-2xl border-t border-slate-200/60 flex items-center justify-between gap-1.5 sm:gap-2 md:gap-3 relative z-20 rounded-b-2xl">
                {onClose ? (
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-[11px] sm:text-xs transition-all border border-slate-200/60 active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                        Đóng
                    </button>
                ) : <div />}

                <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-wrap">
                    {isReferenceAccount && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-white shrink-0">
                            <i className="fa-solid fa-eye text-[9px] text-slate-400"></i>
                            <span className="text-[9px] font-black uppercase tracking-widest">Chỉ xem</span>
                        </div>
                    )}
                    {canDownloadInvoice && (
                        <button
                            onClick={() => {
                                let url = resolvedOrder.LinkHoaDonDaXuat;
                                if (url) {
                                    if (url.includes('drive.google.com') && url.includes('/file/d/')) {
                                        const match = url.match(/\/file\/d\/([^/]+)/);
                                        if (match) url = `https://drive.google.com/uc?export=download&id=${match[1]}`;
                                    }
                                    window.open(url, '_blank');
                                }
                            }}
                            className="px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-full bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-[10.5px] sm:text-[11px] border border-sky-200 transition-all flex items-center gap-1 shrink-0 active:scale-95"
                        >
                            <i className="fas fa-download text-[9px]"></i> Hóa Đơn
                        </button>
                    )}
                    {canEdit && !isReferenceAccount && (
                        <button 
                            onClick={() => setInlineMode('EDIT')} 
                            className="px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10.5px] sm:text-[11px] border border-slate-200 transition-all flex items-center gap-1 shrink-0 active:scale-95"
                        >
                            <i className="fas fa-pencil-alt text-[9px] text-slate-500"></i> Sửa
                        </button>
                    )}
                    {canCancel && !isReferenceAccount && (
                        <button
                            onClick={() => {
                                if (onCancelConfirm) {
                                    setCancelReason('');
                                    setCancelUnmatchType('Hủy luôn đơn hàng (Hủy đơn)');
                                    setCancelThoiGianCanXe(resolvedOrder['Thời gian cần xe'] || '');
                                    setInlineMode('CANCEL');
                                } else {
                                    onCancel?.(resolvedOrder);
                                }
                            }}
                            className="px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-full bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[10.5px] sm:text-[11px] border border-red-200 transition-all flex items-center gap-1 shrink-0 active:scale-95"
                        >
                            <i className="fas fa-trash-alt text-[9px] text-red-500"></i> Hủy
                        </button>
                    )}
                    {canRequestInvoice && !isReferenceAccount && (
                        <button 
                            onClick={() => {
                                if (onInvoiceConfirm || showToast) {
                                    setInlineMode('INVOICE');
                                } else if (onRequestInvoice) {
                                    onRequestInvoice(resolvedOrder);
                                }
                            }} 
                            className="px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-xl sm:rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10.5px] sm:text-[11.5px] transition-all flex items-center gap-1 shrink-0 shadow-sm active:scale-95"
                        >
                            <i className="fas fa-file-invoice-dollar text-[9.5px] sm:text-[10.5px]"></i> Xuất Hóa Đơn
                        </button>
                    )}

                    {canAddSupplement && !isReferenceAccount && (
                        <button onClick={() => onSupplement!(resolvedOrder)} className="px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10.5px] sm:text-[11px] transition-all flex items-center gap-1 shrink-0 active:scale-95">
                            <i className="fas fa-file-upload text-[9px]"></i> Bổ Sung
                        </button>
                    )}
                    {canRequestVC && !isReferenceAccount && (
                        <button onClick={() => onRequestVC!(resolvedOrder)} className="px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10.5px] sm:text-[11px] transition-all flex items-center gap-1 shrink-0 active:scale-95">
                            <i className="fas fa-id-card text-[9px]"></i> VinClub
                        </button>
                    )}
                    {canConfirmVC && !isReferenceAccount && (
                        <button onClick={() => onConfirmVC!(resolvedOrder)} className="px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] sm:text-[11px] transition-all flex items-center gap-1 shrink-0 active:scale-95">
                            <i className="fas fa-check text-[9px]"></i> Xác Thực
                        </button>
                    )}
                </div>
            </footer>
            )}

            <SelectPolicyModal
                isOpen={isPolicyModalOpen}
                onClose={() => setIsPolicyModalOpen(false)}
                currentPolicy={resolvedOrder["CHÍNH SÁCH"]}
                carModel={resolvedOrder["Dòng xe"]}
                onSelect={(policyName) => {
                    onSelectPolicy?.(resolvedOrder, policyName);
                    setIsPolicyModalOpen(false);
                }}
            />
        </div>
    );
};
