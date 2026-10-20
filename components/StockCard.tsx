import React, { useState } from 'react';
import moment from 'moment';
import { StockVehicle } from '../types';
import { getExteriorColorStyle, getInteriorColorStyle, getExteriorSwatchColor } from '../utils/styleUtils';
import { formatShortWarehouseName } from '../utils/stringUtils';
import { getQuickLocationName } from '../utils/geocodeUtils';
import CarImage from './ui/CarImage';
import StatusBadge from './ui/StatusBadge';
import * as apiService from '../services/apiService';
import { useVehicleConfig } from '../hooks/useVehicleConfig';
import { MiniGpsMapModal } from './modals/MiniGpsMapModal';

interface StockCardProps {
    vehicle: StockVehicle;
    onHoldCar: (vin: string) => void;
    onReleaseCar: (vin: string) => void;
    onJoinQueue: (vin: string) => void;
    onLeaveQueue: (vin: string) => void;
    onOpenExtensionModal: (vehicle: StockVehicle) => void;
    onCreateRequestForVehicle: (vehicle: StockVehicle) => void;
    onShowDetails: (vehicle: StockVehicle) => void;
    onAdminEdit?: (vehicle: StockVehicle) => void;
    currentUser: string;
    isAdmin: boolean;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    highlightedVins: Set<string>;
    processingVin: string | null;
    queuedVins: string[];
    canHoldMore: boolean;
    onViewCarOnMap?: (vin: string) => void;
    isReferenceAccount?: boolean;
    onOpenSwapModal?: (vehicle: StockVehicle) => void;
    userOrders?: any[];
    onRefetchStock?: () => void;
}

const getInteriorSwatchColor = (interior?: string): string => {
    if (!interior) return '#475569';
    const lower = interior.toLowerCase();
    if (lower.includes('black') || lower.includes('đen')) return '#1e293b';
    if (lower.includes('brown') || lower.includes('nâu') || lower.includes('ce2n')) return '#78350f';
    if (lower.includes('beige') || lower.includes('kem') || lower.includes('be')) return '#d97706';
    if (lower.includes('grey') || lower.includes('gray') || lower.includes('xám')) return '#64748b';
    if (lower.includes('white') || lower.includes('trắng')) return '#f8fafc';
    return '#475569';
};

const StockCard: React.FC<StockCardProps> = ({
    vehicle,
    onHoldCar,
    onReleaseCar,
    onJoinQueue,
    onLeaveQueue,
    onOpenExtensionModal,
    onCreateRequestForVehicle,
    onShowDetails,
    onAdminEdit: _onAdminEdit,
    currentUser,
    isAdmin,
    showToast,
    processingVin,
    queuedVins,
    canHoldMore,
    onViewCarOnMap: _onViewCarOnMap,
    isReferenceAccount,
    onOpenSwapModal,
    userOrders,
    onRefetchStock
}) => {
    const { versionsMap, vehicleLines, vehicleColors, vehicleInteriors } = useVehicleConfig();
    const [confirmAction, setConfirmAction] = useState<{ action: 'hold' | 'release' } | null>(null);
    const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
    const [isGpsMapOpen, setIsGpsMapOpen] = useState(false);

    // Inline Admin Edit state
    const [isInlineEditing, setIsInlineEditing] = useState(false);
    const [editMode, setEditMode] = useState<'edit' | 'delete'>('edit');
    const [editChanges, setEditChanges] = useState<Partial<StockVehicle>>({});
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');

    const currentEditModel = editChanges['Dòng xe'] !== undefined ? editChanges['Dòng xe'] : vehicle['Dòng xe'];
    const currentEditVersion = editChanges['Phiên bản'] !== undefined ? editChanges['Phiên bản'] : vehicle['Phiên bản'];
    const currentEditExterior = editChanges['Ngoại thất'] !== undefined ? editChanges['Ngoại thất'] : vehicle['Ngoại thất'];
    const currentEditInterior = editChanges['Nội thất'] !== undefined ? editChanges['Nội thất'] : vehicle['Nội thất'];
    const currentEditSoMay = editChanges['Số máy'] !== undefined ? editChanges['Số máy'] : vehicle['Số máy'];
    const currentEditMaDMS = editChanges['Mã DMS'] !== undefined ? editChanges['Mã DMS'] : vehicle['Mã DMS'];
    const currentEditViTri = editChanges['Vị trí'] !== undefined ? editChanges['Vị trí'] : vehicle['Vị trí'];
    const currentEditVIN = editChanges.VIN !== undefined ? editChanges.VIN : vehicle.VIN;

    const handleEditFieldChange = (field: keyof StockVehicle, value: string) => {
        setEditChanges(prev => {
            const next = { ...prev, [field]: value };
            if (field === 'Dòng xe') {
                const versions = versionsMap[value] || [];
                if (versions.length === 1) {
                    next['Phiên bản'] = versions[0];
                } else if (value === 'VF5' || value === 'vf5' || value === 'VF 5') {
                    next['Phiên bản'] = 'Plus';
                }
            }
            return next;
        });
    };

    const hasEditChanges = Object.keys(editChanges).length > 0;
    const isVinInvalid = currentEditVIN !== undefined && currentEditVIN.length !== 17 && currentEditVIN !== vehicle.VIN;
    const canSaveEdit = hasEditChanges && !isVinInvalid;

    const handleSaveInlineEdit = async () => {
        if (!hasEditChanges) return;
        setIsSavingEdit(true);
        try {
            const res = await apiService.updateCarInfo(vehicle.VIN, editChanges);
            if (res.status === 'SUCCESS') {
                showToast('Thành công', `Đã cập nhật thông tin xe ${vehicle.VIN}`, 'success');
                setIsInlineEditing(false);
                setEditChanges({});
                if (onRefetchStock) onRefetchStock();
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } catch (err: any) {
            showToast('Lỗi', err.message, 'error');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDeleteInline = async () => {
        if (!deleteReason.trim()) {
            showToast('Thiếu thông tin', 'Vui lòng nhập lý do xóa xe.', 'warning');
            return;
        }
        setIsSavingEdit(true);
        try {
            const res = await apiService.performAdminAction('deleteCarFromStockLogic', {
                vinToDelete: vehicle.VIN,
                reason: deleteReason
            });
            if (res.status === 'SUCCESS') {
                showToast('Đã xóa', res.message, 'success');
                setIsInlineEditing(false);
                setDeleteReason('');
                if (onRefetchStock) onRefetchStock();
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } catch (err: any) {
            showToast('Lỗi', err.message, 'error');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const availableVersions = versionsMap[(currentEditModel || '')] || [];

    // Smart Conditional Visibility for "⇄ Đổi xe" Button
    const canShowSwapButton = React.useMemo(() => {
        if (!onOpenSwapModal || !userOrders || userOrders.length === 0) return false;
        const holder = (vehicle["Người Giữ Xe"] || (vehicle as any).nguoi_giu_xe || '').toString().trim();
        if (!holder || holder.toLowerCase() === (currentUser || '').toLowerCase()) return false;

        const carStatus = (vehicle["Trạng thái"] || '').toString().trim();
        if (carStatus !== 'Đã ghép' && carStatus !== 'Đang giữ') return false;

        const tModel = (vehicle["Dòng xe"] || '').trim().toLowerCase();
        const tVer = (vehicle["Phiên bản"] || '').trim().toLowerCase();
        const tExt = (vehicle["Ngoại thất"] || '').trim().toLowerCase();
        const tInt = (vehicle["Nội thất"] || '').trim().toLowerCase();

        return userOrders.some((o: any) => {
            const oStatus = (o["Kết quả"] || '').toLowerCase();
            if (oStatus.includes('đã xuất hóa đơn') || oStatus.includes('hủy')) return false;

            const oModel = (o["Dòng xe"] || '').trim().toLowerCase();
            const oVer = (o["Phiên bản"] || '').trim().toLowerCase();
            const oExt = (o["Ngoại thất"] || '').trim().toLowerCase();
            const oInt = (o["Nội thất"] || '').trim().toLowerCase();

            return oModel === tModel && oVer === tVer && oExt === tExt && oInt === tInt;
        });
    }, [onOpenSwapModal, userOrders, vehicle, currentUser]);

    const handleCopyVin = (e: React.MouseEvent, vin: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(vin).then(() => {
            setCopiedLabel('VIN_MAIN');
            setTimeout(() => setCopiedLabel(null), 2000);
        }).catch(err => {
            console.error('Lỗi sao chép VIN: ', err);
        });
    };

    const DATE_FORMATS = ['DD/MM/YYYY HH:mm:ss', 'D/M/YYYY H:m:s', 'DD/MM/YYYY', 'YYYY-MM-DD HH:mm:ss', moment.ISO_8601];

    const isMine = vehicle["Người Giữ Xe"]?.trim().toLowerCase().normalize('NFC') === currentUser?.trim().toLowerCase().normalize('NFC');
    const isHeldByCurrentUser = vehicle["Trạng thái"] === 'Đang giữ' && isMine;
    const isAvailable = vehicle["Trạng thái"] === 'Chưa ghép';
    const isTakenByOther = (vehicle["Trạng thái"] === 'Đang giữ' || vehicle["Trạng thái"] === 'Đã ghép') && !isMine;
    const isProcessing = processingVin === vehicle.VIN;
    const isMissingVersion = !vehicle['Phiên bản'] || vehicle['Phiên bản'].trim() === '';

    const hasRequestedExtension = vehicle.is_extension_requested;
    let isNearExpiry = false;
    if (vehicle['Thời Gian Hết Hạn Giữ']) {
        const expiry = moment(vehicle['Thời Gian Hết Hạn Giữ'], 'DD/MM/YYYY HH:mm:ss');
        const diffMinutes = expiry.diff(moment(), 'minutes');
        isNearExpiry = diffMinutes <= 20 && diffMinutes > 0;
    }

    const telemetry = vehicle.telemetry || (vehicle as any).telemetry;
    const hasGps = Boolean(telemetry && telemetry.lat && telemetry.lng);
    const quickLocation = hasGps ? getQuickLocationName(telemetry.lat, telemetry.lng) : '';
    const isInTransit = vehicle["Vị trí"] === 'Đang vận tải';

    const exteriorSwatch = getExteriorSwatchColor(vehicle['Ngoại thất']);
    const interiorSwatch = getInteriorSwatchColor(vehicle['Nội thất']);

    const renderActions = () => {
        if (isReferenceAccount) {
            return (
                <div className="flex items-center justify-between w-full py-0.5">
                    <span className="text-[10px] text-slate-400 font-medium italic">Chế độ</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Chỉ Xem</span>
                </div>
            );
        }

        if (isProcessing) {
            return (
                <div className="flex items-center justify-center w-full py-1">
                    <i className="fas fa-circle-notch fa-spin text-blue-600 text-xs"></i>
                </div>
            );
        }

        if (confirmAction) {
            return (
                <div className="w-full flex items-center gap-1.5 animate-fade-in">
                    <button
                        onClick={(e) => { e.stopPropagation(); setConfirmAction(null); }}
                        className="flex-1 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10.5px] font-semibold transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirmAction.action === 'hold') {
                                onHoldCar(vehicle.VIN);
                            } else {
                                onReleaseCar(vehicle.VIN);
                            }
                            setConfirmAction(null);
                        }}
                        className="flex-1 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10.5px] font-semibold transition-colors"
                    >
                        Xác nhận
                    </button>
                </div>
            );
        }

        return (
            <div className="w-full flex items-center justify-center">
                {isAvailable ? (
                    !canHoldMore ? (
                        <div className="w-full h-8 flex items-center justify-center bg-slate-50 text-slate-400 text-[10.5px] font-medium rounded-lg border border-slate-200/60">
                            Hết lượt giữ xe
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onHoldCar(vehicle.VIN); }}
                            className="w-full h-8 px-2.5 rounded-lg bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-200 flex items-center justify-between cursor-pointer transition-all group/sw"
                            title="Bấm để giữ xe"
                        >
                            <span className="text-[11px] font-semibold text-slate-700 group-hover/sw:text-blue-700 transition-colors">
                                Giữ xe
                            </span>

                            {/* Minimal Toggle Switch */}
                            <div className="w-7 h-4 rounded-full bg-slate-200 group-hover/sw:bg-blue-600 p-0.5 transition-colors flex items-center">
                                <div className="w-3 h-3 rounded-full bg-white shadow-xs transition-transform duration-200 group-hover/sw:translate-x-3"></div>
                            </div>
                        </button>
                    )
                ) : isHeldByCurrentUser ? (
                    <div className="w-full flex items-center gap-1.5">
                        <button
                            onClick={(e) => { e.stopPropagation(); onReleaseCar(vehicle.VIN); }}
                            className="flex-1 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/80 text-[10.5px] font-semibold transition-colors"
                            title="Nhả xe"
                        >
                            Nhả xe
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onCreateRequestForVehicle(vehicle); }}
                            className="flex-1 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 text-[10.5px] font-semibold transition-colors"
                            title="Ghép xe"
                        >
                            Ghép xe
                        </button>
                    </div>
                ) : isTakenByOther ? (
                    <div className="flex items-center gap-1.5 w-full">
                        {queuedVins.some(v => v?.toUpperCase() === vehicle.VIN?.toUpperCase()) ? (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onLeaveQueue(vehicle.VIN); }}
                                className="w-full h-8 px-2.5 rounded-lg bg-amber-50 hover:bg-rose-50 text-amber-800 hover:text-rose-600 border border-amber-200/80 flex items-center justify-between transition-colors group/sw cursor-pointer"
                                title="Hủy đăng ký hàng chờ"
                            >
                                <span className="text-[10.5px] font-semibold">Đang chờ xe</span>
                                <span className="text-[10px] text-amber-600 group-hover/sw:text-rose-600 font-medium">Hủy chờ ✕</span>
                            </button>
                        ) : (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onJoinQueue(vehicle.VIN); }}
                                className="flex-1 h-8 px-2.5 rounded-lg bg-slate-50 hover:bg-amber-50/60 border border-slate-200 hover:border-amber-200 flex items-center justify-between cursor-pointer transition-all group/sw"
                                title="Đăng ký hàng chờ"
                            >
                                <span className="text-[11px] font-semibold text-slate-700 group-hover/sw:text-amber-800 transition-colors">
                                    Đăng ký chờ
                                </span>
                                <div className="w-7 h-4 rounded-full bg-slate-200 group-hover/sw:bg-amber-500 p-0.5 transition-colors flex items-center">
                                    <div className="w-3 h-3 rounded-full bg-white shadow-xs transition-transform duration-200 group-hover/sw:translate-x-3"></div>
                                </div>
                            </button>
                        )}

                        {canShowSwapButton && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onOpenSwapModal!(vehicle); }}
                                className="h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 text-[10.5px] font-semibold transition-colors shrink-0"
                                title="Đề nghị đổi xe cùng cấu hình"
                            >
                                Đổi
                            </button>
                        )}

                        {isAdmin && vehicle["Trạng thái"] === 'Đang giữ' && (
                            <button 
                                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center shrink-0 transition-colors"
                                onClick={(e) => { e.stopPropagation(); onReleaseCar(vehicle.VIN); }} 
                                title="Admin Hủy Giữ"
                            >
                                <i className="fas fa-user-shield text-[9.5px]"></i>
                            </button>
                        )}
                    </div>
                ) : null}
            </div>
        );
    };

    const detailsList = [
        { icon: 'fa-car-side', label: 'Dòng xe', value: `${vehicle['Dòng xe'] || ''} - ${vehicle['Phiên bản'] || 'Chưa rõ phiên bản'}`, copyable: false },
        { icon: 'fa-palette', label: 'Màu sắc', value: `${vehicle['Ngoại thất'] || '---'} / ${vehicle['Nội thất'] || '---'}`, copyable: false },
        vehicle.VIN && vehicle.VIN !== '---' ? { icon: 'fa-fingerprint', label: 'Số VIN', value: vehicle.VIN, copyable: true } : null,
        (vehicle['Số máy'] || (vehicle as any).so_may) ? { icon: 'fa-cogs', label: 'Số máy', value: vehicle['Số máy'] || (vehicle as any).so_may, copyable: true } : null,
        (vehicle['Mã DMS'] || (vehicle as any).ma_dms) ? { icon: 'fa-qrcode', label: 'Mã DMS', value: vehicle['Mã DMS'] || (vehicle as any).ma_dms, copyable: true } : null,
        (vehicle['Số COC'] || (vehicle as any).so_coc) ? { icon: 'fa-file-invoice text-amber-500', label: 'Số COC', value: vehicle['Số COC'] || (vehicle as any).so_coc, copyable: true } : null,
        isInTransit ? {
            icon: 'fa-truck text-amber-500',
            label: 'Vận tải',
            value: quickLocation || formatShortWarehouseName(vehicle['Vị trí']) || 'Đang vận tải',
            copyable: false,
            isMapGps: hasGps
        } : {
            icon: 'fa-warehouse text-emerald-600',
            label: 'Kho xe',
            value: vehicle.isResolvedFromSatellite 
                ? `${formatShortWarehouseName(vehicle['Vị trí'])} (Thực tế: ${vehicle.realWarehouseName || 'Bãi ngoài'})` 
                : (formatShortWarehouseName(vehicle['Vị trí']) || 'Chưa cập nhật'),
            copyable: false
        },
        { icon: 'fa-info-circle', label: 'Trạng thái', value: vehicle['Trạng thái'] || '---', copyable: false },
        vehicle['Người Giữ Xe'] ? { icon: 'fa-user-shield', label: 'Người giữ', value: vehicle['Người Giữ Xe'], copyable: false } : null,
        vehicle['Thời Gian Hết Hạn Giữ'] && moment(vehicle['Thời Gian Hết Hạn Giữ'], DATE_FORMATS).isValid() ? { icon: 'fa-clock', label: 'Thời hạn', value: moment(vehicle['Thời Gian Hết Hạn Giữ'], DATE_FORMATS).format('DD/MM/YYYY HH:mm'), copyable: false } : null,
        vehicle['Ngày vận tải'] && vehicle['Ngày vận tải'] !== '#N/A' && moment(vehicle['Ngày vận tải'], DATE_FORMATS).isValid() ? { icon: 'fa-shipping-fast', label: 'Vận tải', value: moment(vehicle['Ngày vận tải'], DATE_FORMATS).format('DD/MM/YYYY'), copyable: false } : null,
        vehicle['Ghi chú dms'] && vehicle['Ghi chú dms'] !== '#N/A' && vehicle['Ghi chú dms'].trim() !== '' ? { icon: 'fa-comment-dots', label: 'Ghi chú', value: vehicle['Ghi chú dms'], copyable: false } : null,
    ].filter((item): item is { icon: string; label: string; value: string; copyable: boolean; isMapAction?: boolean; isMapGps?: boolean } => item !== null);

    const isAvailableStatus = vehicle['Trạng thái'] === 'Chưa ghép';
    const isHoldingStatus = vehicle['Trạng thái'] === 'Đang giữ';
    const isPairedStatus = vehicle['Trạng thái'] === 'Đã ghép';

    return (
        <div 
            id={`stock-card-${vehicle.VIN}`}
            className={`group relative flex flex-col justify-between rounded-2xl bg-white transition-all duration-300 ease-out overflow-hidden p-3 min-h-[305px] hover:-translate-y-0.5 ${
                isMissingVersion 
                    ? 'border-2 border-amber-300 shadow-[0_2px_10px_-2px_rgba(245,158,11,0.2)]' 
                    : isHeldByCurrentUser
                    ? 'border-2 border-blue-400 shadow-[0_2px_12px_-2px_rgba(59,130,246,0.2)]'
                    : 'border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-[0_16px_32px_-6px_rgba(15,23,42,0.12),0_4px_12px_rgba(15,23,42,0.06)] hover:border-slate-300'
            }`}
        >
            {/* Top Status Accent Line (Hairline thread) */}
            <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${
                isAvailableStatus 
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-500' 
                    : isHoldingStatus 
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500' 
                    : isPairedStatus 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600' 
                    : 'bg-slate-300'
            }`} />

            {/* Quick Interactive Details Overlay on Desktop Hover (Unified Seamless Card) */}
            <div className="absolute inset-0 bg-white/98 text-slate-800 backdrop-blur-md rounded-2xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[90] shadow-xl flex flex-col justify-between hidden md:flex pointer-events-auto border border-slate-200/80">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <i className="fas fa-layer-group text-blue-600"></i> Thông số xe
                    </span>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                            {vehicle.VIN?.slice(-8)}
                        </span>
                        {isAdmin && !isReferenceAccount && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsInlineEditing(true);
                                    setEditMode('edit');
                                    setEditChanges({});
                                    setDeleteReason('');
                                }}
                                className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Sửa xe (Admin)"
                            >
                                <i className="fas fa-pen text-[8px]"></i>
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="flex flex-col justify-around flex-1 py-1 w-full overflow-hidden">
                    {detailsList.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10px] leading-tight w-full gap-1 py-0.5 group/row">
                            <span className="text-slate-500 font-semibold whitespace-nowrap text-[9.5px] flex-shrink-0 flex items-center gap-1.5">
                                <i className={`fas ${item.icon} text-slate-400 text-[9px] w-3`}></i>
                                {item.label}
                            </span>
                            {(item as any).isMapGps ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsGpsMapOpen(true);
                                    }}
                                    className="truncate max-w-[130px] text-right font-bold text-amber-700 hover:text-blue-600 hover:underline inline-flex items-center justify-end gap-1 cursor-pointer transition-colors"
                                    title="📍 Click xem bản đồ GPS"
                                >
                                    <span className="truncate">{item.value}</span>
                                    <i className="fas fa-map-marked-alt text-[8.5px] text-blue-600"></i>
                                </button>
                            ) : (
                                <span 
                                    className={`truncate max-w-[135px] text-right ${
                                        item.label === 'Số VIN'
                                            ? 'cursor-pointer font-mono font-bold text-blue-600 hover:text-blue-700 hover:underline text-[11px]'
                                            : item.label === 'Mã DMS'
                                            ? 'cursor-pointer font-mono font-bold text-teal-600 hover:text-teal-700 hover:underline text-[10px]'
                                            : item.label === 'Số máy'
                                            ? 'cursor-pointer font-mono font-bold text-indigo-600 hover:text-indigo-700 hover:underline text-[10px]'
                                            : item.label === 'Số COC'
                                            ? 'cursor-pointer font-mono font-bold text-amber-600 hover:text-amber-700 hover:underline text-[10px]'
                                            : 'font-bold text-slate-800 text-[10px]'
                                    }`}
                                    onClick={(e) => {
                                        if (item.copyable && item.value !== '---') {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(item.value).then(() => {
                                                setCopiedLabel(item.label);
                                                setTimeout(() => setCopiedLabel(null), 2000);
                                            }).catch(err => {
                                                console.error('Lỗi sao chép: ', err);
                                            });
                                        }
                                    }}
                                    title={item.value}
                                >
                                    {copiedLabel === item.label ? <span className="text-emerald-600 font-bold flex items-center gap-1 text-[9.5px]"><i className="fas fa-check text-[8px]"></i> Đã copy</span> : item.value}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Unified Seamless Action Footer */}
                <div className="pt-2 border-t border-slate-100 shrink-0 w-full">
                    {renderActions()}
                </div>
            </div>

            {/* Inline Admin Edit Mode Panel */}
            {isInlineEditing && (
                <div 
                    className="absolute inset-0 bg-white/98 backdrop-blur-xl z-[150] rounded-2xl p-3 flex flex-col justify-between shadow-2xl border-2 border-blue-500 animate-fade-in pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setEditMode('edit')}
                                className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${editMode === 'edit' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <i className="fas fa-pen text-[8px] mr-1"></i> Sửa Xe
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditMode('delete')}
                                className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${editMode === 'delete' ? 'bg-red-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <i className="fas fa-trash-alt text-[8px] mr-1"></i> Xóa Xe
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setIsInlineEditing(false);
                                setEditChanges({});
                                setDeleteReason('');
                            }}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        >
                            <i className="fas fa-times text-[10px]"></i>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto hidden-scrollbar py-1.5 space-y-1.5 min-h-0 text-[11px]">
                        {editMode === 'edit' ? (
                            <>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <div>
                                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Dòng Xe</label>
                                        <select
                                            className="w-full text-[10.5px] font-bold border border-slate-200 rounded-lg px-1.5 py-1 outline-none focus:border-blue-500 bg-slate-50 text-slate-800"
                                            value={currentEditModel || ''}
                                            onChange={(e) => handleEditFieldChange('Dòng xe', e.target.value)}
                                        >
                                            <option value="">-- Chọn --</option>
                                            {vehicleLines.slice().sort().map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Phiên Bản</label>
                                        <select
                                            className="w-full text-[10.5px] font-bold border border-slate-200 rounded-lg px-1.5 py-1 outline-none focus:border-blue-500 bg-slate-50 text-slate-800"
                                            value={currentEditVersion || ''}
                                            onChange={(e) => handleEditFieldChange('Phiên bản', e.target.value)}
                                            disabled={!currentEditModel}
                                        >
                                            <option value="">-- Chọn --</option>
                                            {availableVersions.map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-1.5">
                                    <div>
                                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Ngoại Thất</label>
                                        <select
                                            className="w-full text-[10px] border border-slate-200 rounded-lg px-1.5 py-1 outline-none focus:border-blue-500 bg-slate-50 text-slate-800 truncate"
                                            value={vehicleColors.includes(currentEditExterior || '') ? currentEditExterior : ''}
                                            onChange={(e) => handleEditFieldChange('Ngoại thất', e.target.value)}
                                        >
                                            <option value="">-- Chọn --</option>
                                            {vehicleColors.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Nội Thất</label>
                                        <select
                                            className="w-full text-[10px] border border-slate-200 rounded-lg px-1.5 py-1 outline-none focus:border-blue-500 bg-slate-50 text-slate-800"
                                            value={currentEditInterior || ''}
                                            onChange={(e) => handleEditFieldChange('Nội thất', e.target.value)}
                                        >
                                            <option value="">-- Chọn --</option>
                                            {vehicleInteriors.map(c => <option key={c} value={c}>{c}</option>)}
                                            {currentEditInterior && !vehicleInteriors.includes(currentEditInterior) && <option value={currentEditInterior}>{currentEditInterior}</option>}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Số VIN (17 ký tự)</label>
                                    <input
                                        type="text"
                                        className="w-full text-[10.5px] font-mono font-bold border border-slate-200 rounded-lg px-1.5 py-1 outline-none focus:border-blue-500 bg-amber-50/50 uppercase text-slate-800"
                                        value={currentEditVIN || ''}
                                        onChange={(e) => handleEditFieldChange('VIN', e.target.value.toUpperCase())}
                                        placeholder="Nhập 17 ký tự VIN..."
                                    />
                                    {isVinInvalid && (
                                        <span className="text-[8px] text-red-500 font-bold block mt-0.5">VIN cần đủ 17 ký tự ({currentEditVIN.length}/17)</span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-1.5">
                                    <div>
                                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Số Máy</label>
                                        <input
                                            type="text"
                                            className="w-full text-[10px] font-mono font-bold border border-slate-200 rounded-lg px-1.5 py-1 outline-none focus:border-blue-500 bg-slate-50 text-slate-800"
                                            value={currentEditSoMay || ''}
                                            onChange={(e) => handleEditFieldChange('Số máy', e.target.value)}
                                            placeholder="Số máy..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Mã DMS</label>
                                        <input
                                            type="text"
                                            className="w-full text-[10px] font-mono font-bold border border-slate-200 rounded-lg px-1.5 py-1 outline-none focus:border-blue-500 bg-slate-50 text-slate-800"
                                            value={currentEditMaDMS || ''}
                                            onChange={(e) => handleEditFieldChange('Mã DMS', e.target.value)}
                                            placeholder="Mã DMS..."
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Vị Trí Kho</label>
                                    <input
                                        type="text"
                                        className="w-full text-[10px] font-medium border border-slate-200 rounded-lg px-1.5 py-1 outline-none focus:border-emerald-500 bg-slate-50 text-slate-800"
                                        value={currentEditViTri || ''}
                                        onChange={(e) => handleEditFieldChange('Vị trí', e.target.value)}
                                        placeholder="Nhập vị trí kho..."
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="space-y-1.5 py-1">
                                <div className="p-2 bg-red-50 border border-red-100 rounded-lg text-red-700 text-[9.5px] leading-tight">
                                    <p className="font-bold flex items-center gap-1 mb-0.5">
                                        <i className="fas fa-exclamation-triangle text-red-500"></i> Xóa xe khỏi kho
                                    </p>
                                    <span>Hành động này sẽ giải phóng trạng thái và xóa thông tin xe khỏi kho.</span>
                                </div>
                                <div>
                                    <label className="block text-[8.5px] font-bold text-slate-500 uppercase mb-0.5">Lý do xóa <span className="text-red-500">*</span></label>
                                    <textarea
                                        rows={3}
                                        value={deleteReason}
                                        onChange={(e) => setDeleteReason(e.target.value)}
                                        placeholder="Nhập lý do xóa xe..."
                                        className="w-full text-[10.5px] border border-slate-200 rounded-lg p-1.5 outline-none focus:border-red-400 resize-none text-slate-800"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                setIsInlineEditing(false);
                                setEditChanges({});
                                setDeleteReason('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] transition-colors"
                        >
                            Hủy
                        </button>
                        {editMode === 'edit' ? (
                            <button
                                type="button"
                                onClick={handleSaveInlineEdit}
                                disabled={!canSaveEdit || isSavingEdit}
                                className="px-3.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm active:scale-95"
                            >
                                {isSavingEdit ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin text-[9px]"></i> Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-save text-[9px]"></i> Lưu lại
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleDeleteInline}
                                disabled={!deleteReason.trim() || isSavingEdit}
                                className="px-3.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm active:scale-95"
                            >
                                {isSavingEdit ? 'Đang xóa...' : 'Xác Nhận Xóa'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Clickable Area for Full Car Details Modal */}
            <div className="cursor-pointer relative z-10 flex flex-col flex-1 justify-between h-full" onClick={() => onShowDetails(vehicle)}>
                
                {/* 1. Header: Model + Version Pill + Status Capsule */}
                <div className="flex items-center justify-between gap-1.5 pt-0.5 pb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[14px] font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors whitespace-nowrap">
                            {vehicle['Dòng xe']}
                        </span>
                        {vehicle['Phiên bản'] ? (
                            <span className="px-1.5 py-[2px] rounded text-[8.5px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200/80 truncate leading-none" title={vehicle['Phiên bản']}>
                                {vehicle['Phiên bản']}
                            </span>
                        ) : (
                            <span className="px-1.5 py-[2px] rounded text-[8px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 animate-pulse leading-none">
                                Thiếu PB
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <StatusBadge
                            status={vehicle['Trạng thái']}
                            size="sm"
                        />
                    </div>
                </div>

                {/* 2. Studio Showcase (Seamless Car Stage) */}
                <div className="relative h-[124px] w-full flex items-center justify-center my-auto group/stage">
                    {/* Realistic Tire Contact Shadow */}
                    <div className="absolute bottom-2.5 w-[72%] h-2.5 bg-slate-900/10 rounded-[100%] blur-[3.5px] pointer-events-none transform scale-x-95 group-hover:scale-x-105 transition-transform duration-500"></div>

                    {/* Car Image */}
                    <div className="relative z-10 w-[180px] h-[90px] flex items-center justify-center">
                        <CarImage
                            model={vehicle['Dòng xe']}
                            exteriorColor={vehicle['Ngoại thất']}
                            version={vehicle['Phiên bản']}
                            className="car-image object-contain max-w-full max-h-full drop-shadow-sm transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                            alt={`VinFast ${vehicle['Dòng xe']}`}
                        />
                    </div>
                </div>

                {/* 3. Specs & Color Passport */}
                <div className="flex flex-col gap-2 mt-auto">
                    {/* Dual Swatch & Color Row */}
                    <div className="flex items-center justify-between gap-2 px-0.5 pb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                            {/* Color Swatch Dots */}
                            <div className="flex items-center shrink-0" title={`Sơn: ${vehicle['Ngoại thất'] || '---'} | Nội thất: ${vehicle['Nội thất'] || '---'}`}>
                                <span 
                                    className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-2xs z-10 ring-1 ring-white" 
                                    style={{ backgroundColor: exteriorSwatch }}
                                />
                                <span 
                                    className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-2xs -ml-1.5 ring-1 ring-white" 
                                    style={{ backgroundColor: interiorSwatch }}
                                />
                            </div>
                            <span className="text-[11px] font-semibold text-slate-700 truncate" style={getExteriorColorStyle(vehicle['Ngoại thất'])}>
                                {vehicle['Ngoại thất'] || '---'}
                            </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 text-slate-400">
                            <span className="text-[10px] font-medium text-slate-500 truncate max-w-[80px]" style={getInteriorColorStyle(vehicle['Nội thất'])}>
                                {vehicle['Nội thất'] || '---'}
                            </span>
                        </div>
                    </div>

                    {/* Passport Card: VIN & Warehouse */}
                    <div className="flex flex-col gap-1.5 py-2.5 px-2.5 rounded-xl bg-slate-50/90 border border-slate-200/60 shadow-2xs">
                        {/* VIN with Tactile Copy */}
                        <div
                            className="cursor-pointer flex items-center justify-between group/vin"
                            title="Click để sao chép VIN"
                            onClick={(e) => handleCopyVin(e, vehicle.VIN)}
                        >
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                <i className={`fas ${copiedLabel === 'VIN_MAIN' ? 'fa-check text-emerald-500' : 'fa-fingerprint text-slate-400'} text-[9px]`}></i>
                                VIN
                            </span>
                            <span className={`text-[11.5px] font-mono font-black transition-colors ${copiedLabel === 'VIN_MAIN' ? 'text-emerald-600' : 'text-blue-600 group-hover/vin:text-blue-700 group-hover/vin:underline'}`}>
                                {copiedLabel === 'VIN_MAIN' ? 'Đã sao chép!' : vehicle.VIN}
                            </span>
                        </div>

                        {/* Location / Transit info */}
                        {vehicle["Vị trí"] && (
                            <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-200/50">
                                <span className={`font-bold flex items-center gap-1 ${isInTransit ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    <i className={`fas ${isInTransit ? 'fa-truck' : 'fa-warehouse'} text-[8.5px]`}></i>
                                    {isInTransit ? 'Vận tải' : 'Kho'}
                                </span>

                                {isInTransit && hasGps ? (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsGpsMapOpen(true);
                                        }}
                                        className="font-bold text-[10px] text-amber-700 hover:text-blue-600 hover:underline inline-flex items-center gap-1 truncate max-w-[130px] cursor-pointer"
                                        title={`📍 Vị trí GPS: ${quickLocation || 'Xem bản đồ'}`}
                                    >
                                        <span className="truncate">{quickLocation || 'Bản đồ GPS'}</span>
                                        <i className="fas fa-location-arrow text-[8px] text-blue-600"></i>
                                    </button>
                                ) : (
                                    <span className={`font-bold text-[10px] truncate max-w-[130px] inline-flex items-center gap-1 ${isInTransit ? 'text-amber-700' : 'text-slate-700'}`}>
                                        <span className="truncate">{formatShortWarehouseName(vehicle["Vị trí"])}</span>
                                        {vehicle.isResolvedFromSatellite && (
                                            <span 
                                                className="shrink-0 text-[8px] font-bold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-300" 
                                                title={`Bãi ngoài: ${vehicle.realWarehouseName || ''}`}
                                            >
                                                Bãi TT
                                            </span>
                                        )}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Expiry / Extension Alert if holding */}
                    {isHeldByCurrentUser && (isNearExpiry || hasRequestedExtension) && (
                        <div className="flex items-center justify-between pt-0.5">
                            {hasRequestedExtension ? (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg w-full justify-center">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                                    <span className="text-[9.5px] font-bold uppercase tracking-wider">Đang chờ duyệt gia hạn</span>
                                </div>
                            ) : (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onOpenExtensionModal(vehicle); }}
                                    className="flex items-center justify-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all rounded-lg w-full text-[10px] font-bold group"
                                >
                                    <i className="fas fa-clock text-[9px] text-amber-600 group-hover:rotate-45 transition-transform"></i>
                                    <span>Sắp hết hạn • Bấm xin gia hạn</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Action Bar (on touch devices where desktop hover is disabled) */}
            <div className="md:hidden mt-2 pt-1 border-t border-slate-100/60 relative z-10">
                {renderActions()}
            </div>

            {/* Mini GPS Map Modal */}
            {hasGps && isGpsMapOpen && (
                <MiniGpsMapModal
                    isOpen={isGpsMapOpen}
                    onClose={() => setIsGpsMapOpen(false)}
                    vehicleName={`${vehicle['Dòng xe'] || ''} ${vehicle['Phiên bản'] || ''}`.trim()}
                    vin={vehicle.VIN}
                    lat={telemetry.lat}
                    lng={telemetry.lng}
                    locationName={quickLocation || formatShortWarehouseName(vehicle['Vị trí'])}
                    capturedAt={telemetry.captured_at}
                />
            )}
        </div>
    );
};

export default React.memo(StockCard);