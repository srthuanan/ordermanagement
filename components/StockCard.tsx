import React, { useState } from 'react';
import moment from 'moment';
import { StockVehicle } from '../types';
import { getExteriorColorStyle, getInteriorColorStyle } from '../utils/styleUtils';
import CarImage from './ui/CarImage';
import StatusBadge from './ui/StatusBadge';
import * as apiService from '../services/apiService';
import { useVehicleConfig } from '../hooks/useVehicleConfig';

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
    onViewCarOnMap,
    isReferenceAccount,
    onOpenSwapModal,
    userOrders,
    onRefetchStock
}) => {
    const { versionsMap, vehicleLines, vehicleColors, vehicleInteriors } = useVehicleConfig();
    const [confirmAction, setConfirmAction] = useState<{ action: 'hold' | 'release' } | null>(null);
    if (false) showToast?.('', '', 'success');
    const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

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

    const hasRealGps = React.useMemo(() => {
        if (!onViewCarOnMap || !vehicle.VIN) return false;
        const vin = vehicle.VIN.trim().toUpperCase();
        const reasonStr = String(vehicle.extension_reason || (vehicle as any)['extension_reason'] || '');
        const locationStr = String(vehicle["Vị trí"] || (vehicle as any)['Vị trí'] || '');
        const noteStr = String(vehicle["Ghi chú"] || (vehicle as any)['ghi_chu'] || '');

        if (reasonStr.includes('GPS:') || locationStr.includes('GPS:') || noteStr.includes('GPS:')) {
            return true;
        }

        try {
            const cached = localStorage.getItem('car_gps_cache');
            if (cached) {
                const gpsData = JSON.parse(cached);
                if (gpsData && gpsData[vin] && (gpsData[vin].lat || gpsData[vin].latitude)) {
                    return true;
                }
            }
        } catch (e) {}

        return false;
    }, [onViewCarOnMap, vehicle]);

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

    const renderActions = () => {
        if (isReferenceAccount) {
            return (
                <div className="flex items-center justify-center w-full h-8 bg-amber-50/30 border border-dashed border-amber-200/50 rounded-xl">
                     <span className="text-[9px] font-black text-amber-600/60 uppercase tracking-widest">Chỉ Xem</span>
                </div>
            );
        }
        if (isProcessing) {
            return (
                <div className="flex items-center justify-center w-full h-9">
                    <i className="fas fa-spinner fa-spin text-accent-primary text-xl"></i>
                </div>
            );
        }

        if (confirmAction) {
            return (
                <div className="flex justify-center items-center gap-1.5 w-full animate-fade-in" style={{ animationDuration: '150ms' }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setConfirmAction(null); }}
                        className="flex-1 h-8 flex items-center justify-center gap-1 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all rounded-xl text-[10px] font-black uppercase tracking-wider"
                    >
                        HỦY
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
                        className="flex-1 h-8 flex items-center justify-center gap-1 bg-accent-primary text-white hover:bg-accent-primary-hover transition-all rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm"
                    >
                        XÁC NHẬN
                    </button>
                </div>
            );
        }

        if (isAvailable) {
            if (!canHoldMore) {
                return (
                    <div className="flex items-center justify-center w-full h-7 bg-slate-50/80 border border-slate-200/60 rounded-full">
                         <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider">Hết lượt giữ</span>
                    </div>
                );
            }

            return (
                <button
                    onClick={(e) => { e.stopPropagation(); onHoldCar(vehicle.VIN); }}
                    className="w-full h-7 flex items-center justify-center gap-1.5 bg-white/85 hover:bg-white backdrop-blur-md text-blue-600 hover:text-blue-700 border border-slate-200/80 hover:border-blue-300 rounded-full font-semibold text-[11.5px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-sm active:scale-[0.97] transition-all duration-200 group"
                    title="Giữ xe"
                >
                    <i className="fas fa-lock text-[10px] text-blue-500 group-hover:scale-110 transition-transform"></i>
                    <span>Giữ xe</span>
                </button>
            );
        }

        if (isHeldByCurrentUser) {
            return (
                <div className="flex items-center gap-1.5 w-full">
                    <button
                        onClick={(e) => { e.stopPropagation(); onReleaseCar(vehicle.VIN); }}
                        className="flex-1 h-7 flex items-center justify-center gap-1.5 bg-white/85 hover:bg-rose-50/60 backdrop-blur-md text-rose-600 hover:text-rose-700 border border-slate-200/80 hover:border-rose-300 rounded-full text-[11px] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.03)] active:scale-[0.97] transition-all"
                    >
                        <i className="fas fa-unlock text-[9.5px] text-rose-500"></i>
                        <span>Nhả xe</span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onCreateRequestForVehicle(vehicle); }}
                        className="flex-1 h-7 flex items-center justify-center gap-1.5 bg-white/85 hover:bg-blue-50/60 backdrop-blur-md text-blue-600 hover:text-blue-700 border border-slate-200/80 hover:border-blue-300 rounded-full text-[11px] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.03)] active:scale-[0.97] transition-all"
                    >
                        <i className="fas fa-link text-[9.5px] text-blue-500"></i>
                        <span>Ghép</span>
                    </button>
                </div>
            );
        }

        if (isTakenByOther) {
            const isQueued = queuedVins.some(v => v?.toUpperCase() === vehicle.VIN?.toUpperCase());
            return (
                <div className="flex items-center gap-1.5 w-full">
                    {isQueued ? (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onLeaveQueue(vehicle.VIN); }}
                            className="flex-1 h-7 flex items-center justify-center gap-1.5 bg-white/85 hover:bg-slate-100 backdrop-blur-md text-slate-500 hover:text-slate-700 border border-slate-200/80 hover:border-slate-300 rounded-full font-semibold text-[11px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] active:scale-[0.97] transition-all group"
                            title="Hủy đăng ký hàng chờ"
                        >
                             <i className="fas fa-times text-[9px] group-hover:rotate-90 transition-transform"></i>
                             <span>Hủy chờ</span>
                        </button>
                    ) : (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onJoinQueue(vehicle.VIN); }}
                            className="flex-1 h-7 flex items-center justify-center gap-1.5 bg-white/85 hover:bg-amber-50/60 backdrop-blur-md text-amber-700 hover:text-amber-800 border border-slate-200/80 hover:border-amber-300 rounded-full font-semibold text-[11.5px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] active:scale-[0.97] transition-all group"
                            title="Đăng ký hàng chờ"
                        >
                            <i className="fas fa-user-plus text-[10px] text-amber-600 group-hover:scale-110 transition-transform"></i>
                            <span>Chờ xe</span>
                        </button>
                    )}
                    
                    {canShowSwapButton && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onOpenSwapModal!(vehicle); }}
                            className="h-7 flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full px-2.5 font-semibold text-[11px] shadow-sm hover:shadow active:scale-[0.97] transition-all"
                            title="Gửi đề nghị tráo đổi xe cùng cấu hình 100% với TVBH giữ xe"
                        >
                            <i className="fa-solid fa-right-left text-[9px]"></i>
                            <span>Đổi xe</span>
                        </button>
                    )}
                    
                    {isAdmin && vehicle["Trạng thái"] === 'Đang giữ' && (
                        <button 
                            className="h-7 w-7 rounded-full bg-white/85 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/80 hover:border-rose-300 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-center flex-shrink-0 active:scale-[0.97] transition-all"
                            onClick={(e) => { e.stopPropagation(); onReleaseCar(vehicle.VIN); }} 
                            title="Admin Hủy Giữ"
                        >
                            <i className="fas fa-user-shield text-[10px]"></i>
                        </button>
                    )}
                </div>
            );
        }

        return null;
    };

    const detailsList = [
        { icon: 'fa-car-side', label: 'Dòng xe', value: `${vehicle['Dòng xe'] || ''} - ${vehicle['Phiên bản'] || 'Chưa rõ phiên bản'}`, copyable: false },
        { icon: 'fa-palette', label: 'Màu sắc', value: `${vehicle['Ngoại thất'] || '---'} / ${vehicle['Nội thất'] || '---'}`, copyable: false },
        vehicle.VIN && vehicle.VIN !== '---' ? { icon: 'fa-fingerprint', label: 'Số VIN', value: vehicle.VIN, copyable: true } : null,
        vehicle['Số máy'] && vehicle['Số máy'] !== '---' ? { icon: 'fa-microchip', label: 'Số máy', value: vehicle['Số máy'], copyable: true } : null,
        { icon: 'fa-info-circle', label: 'Trạng thái', value: vehicle['Trạng thái'] || '---', copyable: false },
        vehicle['Người Giữ Xe'] ? { icon: 'fa-user-shield', label: 'Người giữ', value: vehicle['Người Giữ Xe'], copyable: false } : null,
        hasRealGps ? { icon: 'fa-location-crosshairs text-blue-500', label: 'Vị trí GPS', value: 'Xem trên bản đồ ➔', copyable: false, isMapAction: true } : null,
        vehicle['Thời Gian Hết Hạn Giữ'] && moment(vehicle['Thời Gian Hết Hạn Giữ'], DATE_FORMATS).isValid() ? { icon: 'fa-clock', label: 'Thời hạn', value: moment(vehicle['Thời Gian Hết Hạn Giữ'], DATE_FORMATS).format('DD/MM/YYYY HH:mm:ss'), copyable: false } : null,
        vehicle['Ngày vận tải'] && vehicle['Ngày vận tải'] !== '#N/A' && moment(vehicle['Ngày vận tải'], DATE_FORMATS).isValid() ? { icon: 'fa-shipping-fast', label: 'Vận tải', value: moment(vehicle['Ngày vận tải'], DATE_FORMATS).format('DD/MM/YYYY'), copyable: false } : null,
        vehicle['Ghi chú dms'] && vehicle['Ghi chú dms'] !== '#N/A' && vehicle['Ghi chú dms'].trim() !== '' ? { icon: 'fa-comment-dots', label: 'Ghi chú', value: vehicle['Ghi chú dms'], copyable: false } : null,
    ].filter((item): item is { icon: string; label: string; value: string; copyable: boolean; isMapAction?: boolean } => item !== null);

    return (
        <div 
            id={`stock-card-${vehicle.VIN}`}
            className={`relative flex flex-col gap-2 rounded-2xl bg-white p-2.5 shadow-sm ${isMissingVersion ? 'border-amber-300 ring-1 ring-amber-100/50 shadow-amber-50' : 'border border-slate-200/80'} hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-300 hover:z-[99] transition-all duration-300 ease-out active:scale-[0.99] group`}
        >
            {/* Premium Interactive Details Overlay - Compact & Clean */}
            <div className="absolute top-0 left-0 right-0 bottom-[46px] bg-white/98 backdrop-blur-md rounded-t-2xl p-2.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] shadow-sm border-x border-t border-slate-200/80 flex flex-col justify-between hidden md:flex pointer-events-auto">
                <div className="flex items-center justify-between pb-0.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Thông tin chi tiết</span>
                </div>
                
                <div className="flex flex-col justify-around flex-1 py-0.5 w-full overflow-hidden">
                    {detailsList.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10px] leading-tight w-full gap-1 py-1">
                            <span className="text-slate-500 font-semibold whitespace-nowrap text-[9.5px] flex-shrink-0 flex items-center gap-1.5">
                                <i className={`fas ${item.icon} text-slate-400 text-[9px] w-3`}></i>
                                {item.label}
                            </span>
                            <span 
                                className={`truncate max-w-[130px] text-right ${
                                    (item as any).isMapAction
                                        ? 'cursor-pointer font-bold text-blue-600 hover:text-blue-700 hover:underline text-[10.5px] flex items-center justify-end gap-1'
                                        : item.label === 'Số VIN'
                                        ? 'cursor-pointer font-mono font-bold text-blue-600 hover:text-blue-700 hover:underline text-[11.5px]'
                                        : item.label === 'Số máy'
                                        ? 'cursor-pointer font-mono font-bold text-indigo-600 hover:text-indigo-700 hover:underline text-[10.5px]'
                                        : 'font-bold text-slate-800 text-[10px]'
                                }`}
                                onClick={(e) => {
                                    if ((item as any).isMapAction && vehicle.VIN && onViewCarOnMap) {
                                        e.stopPropagation();
                                        onViewCarOnMap(vehicle.VIN);
                                        return;
                                    }
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
                                {copiedLabel === item.label ? <span className="text-green-600 flex items-center gap-1 font-sans text-[9px]"><i className="fas fa-check text-[8px]"></i> Đã copy</span> : item.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            {/* Inline Admin Edit Mode Panel */}
            {isInlineEditing && (
                <div 
                    className="absolute inset-0 bg-white/98 backdrop-blur-xl z-[150] rounded-2xl p-2.5 flex flex-col justify-between shadow-2xl border-2 border-blue-500 animate-fade-in pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100 shrink-0">
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
                            title="Đóng / Hủy sửa"
                        >
                            <i className="fas fa-times text-[10px]"></i>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto hidden-scrollbar py-1.5 space-y-1.5 min-h-0 text-[11px]">
                        {editMode === 'edit' ? (
                            <>
                                {/* Dòng xe & Phiên bản */}
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

                                {/* Ngoại thất & Nội thất */}
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

                                {/* Số VIN */}
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

                                {/* Số máy & Mã DMS */}
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

                    {/* Footer */}
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
            {isMissingVersion && (
                <div className="absolute -top-2 -right-1 z-30 flex items-center gap-1.5 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full shadow-lg text-[9px] font-bold uppercase tracking-wider animate-bounce-subtle">
                    <i className="fas fa-edit"></i>
                    Bổ sung PB
                </div>
            )}
            {isAdmin && !isReferenceAccount && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsInlineEditing(!isInlineEditing);
                        setEditMode('edit');
                        setEditChanges({});
                        setDeleteReason('');
                    }}
                    className={`absolute top-2 right-2 z-[160] w-6 h-6 flex items-center justify-center rounded-lg ${isInlineEditing ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800/80 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-blue-600'} transition-all duration-200 backdrop-blur-sm shadow-sm`}
                    title={isInlineEditing ? "Đóng sửa xe" : "Sửa / Xóa xe trực tiếp (Admin)"}
                >
                    <i className={`fas ${isInlineEditing ? 'fa-times' : 'fa-cog'} text-[9.5px]`}></i>
                </button>
            )}

            <div className="cursor-pointer" onClick={() => onShowDetails(vehicle)}>
                {/* Car Image with Animation and Glow */}
                <div className="car-image-container relative flex items-center justify-center py-0.5 h-[90px] overflow-hidden rounded-lg bg-gradient-to-br from-gray-50 to-white">
                    {/* Floor Glow */}
                    {/* Floor Glow - Static */}


                    {/* Static Car */}
                    <div className={`relative z-10 w-[160px] h-[80px] flex items-center justify-center ${vehicle["Người Giữ Xe"] ? 'group-hover:blur-[1px] group-hover:opacity-90' : ''}`}>
                        {/* Sparkles */}
                        <div className="sparkle-container">
                            <div className="sparkle" style={{ top: '30%', left: '30%', animationDelay: '0s', width: '8px', height: '8px' }}></div>
                            <div className="sparkle" style={{ top: '20%', left: '70%', animationDelay: '1.2s' }}></div>
                            <div className="sparkle" style={{ top: '60%', left: '20%', animationDelay: '0.5s', width: '6px', height: '6px' }}></div>
                            <div className="sparkle" style={{ top: '70%', left: '80%', animationDelay: '2.5s' }}></div>
                            <div className="sparkle" style={{ top: '40%', left: '50%', animationDelay: '3s', width: '10px', height: '10px' }}></div>
                        </div>

                        <CarImage
                            model={vehicle['Dòng xe']}
                            exteriorColor={vehicle['Ngoại thất']}
                            version={vehicle['Phiên bản']}
                            className="car-image object-contain max-w-full max-h-full transition-transform duration-300 group-hover:scale-[1.03]"
                            alt={`VinFast ${vehicle['Dòng xe']}`}
                        />
                    </div>

                    {/* Keeper Info Overlay */}
                    {vehicle["Người Giữ Xe"] && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                            <div className="bg-black/60 backdrop-blur-sm text-white rounded-lg p-2 shadow-xl border border-white/10 flex flex-col items-center transform scale-95 group-hover:scale-100 transition-transform duration-300 min-w-[100px]">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <div className="w-4 h-4 rounded-full bg-accent-primary/90 flex items-center justify-center shadow-sm">
                                        <i className="fas fa-user-shield text-white text-[8px]"></i>
                                    </div>
                                    <span className="font-semibold text-[10px] text-accent-primary tracking-wide uppercase">Đang Giữ</span>
                                </div>
                                <p className="font-bold text-xs whitespace-nowrap mb-0.5 text-shadow-sm">{vehicle["Người Giữ Xe"]}</p>
                                {vehicle["Thời Gian Hết Hạn Giữ"] && (
                                    <div className="flex items-center gap-1 text-[9px] text-gray-200 bg-white/5 px-1.5 py-0.5 rounded-full mt-0.5">
                                        <i className="fas fa-clock text-[8px]"></i>
                                        <span>{moment(vehicle["Thời Gian Hết Hạn Giữ"], DATE_FORMATS).format('HH:mm DD/MM')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-15deg] w-full h-full animate-shine opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </div>

                <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center justify-between gap-1 overflow-hidden">
                        <div className="flex items-baseline gap-1.5 overflow-hidden flex-1">
                            <span className="text-light-text-primary text-base font-medium whitespace-nowrap group-hover:text-accent-primary transition-colors">
                                {vehicle['Dòng xe']}
                            </span>
                            <span className="text-light-text-secondary text-xs font-medium truncate" title={vehicle['Phiên bản']}>
                                {vehicle['Phiên bản'] || <span className="text-amber-500 font-medium italic animate-pulse">Chưa có FB</span>}
                            </span>
                        </div>

                    </div>

                    <div className="flex items-center justify-between gap-2 text-light-text-secondary mb-1">
                        <div className="flex items-center gap-1.5 min-w-0" title={`Ngoại thất: ${vehicle['Ngoại thất']}`}>
                            <p className="text-xs truncate font-medium" style={getExteriorColorStyle(vehicle['Ngoại thất'])}>{vehicle['Ngoại thất']}</p>
                        </div>
                        <div className="h-3 w-px bg-gray-300 mx-1"></div>
                        <div className="flex items-center gap-1.5 min-w-0" title={`Nội thất: ${vehicle['Nội thất']}`}>
                            <span className="material-symbols-outlined flex-shrink-0 text-light-text-tertiary" style={{ fontSize: '14px' }}>chair</span>
                            <p className="text-xs truncate" style={getInteriorColorStyle(vehicle['Nội thất'])}>{vehicle['Nội thất']}</p>
                        </div>
                    </div>
                    {/* Technical Info Group - Clean & Synchronized */}
                    <div className="flex flex-col gap-1 py-1 px-1.5 rounded-lg bg-slate-50/80 border border-slate-100 mt-0.5">
                        <div
                            className="cursor-pointer flex items-center justify-between group/vin"
                            title="Click để sao chép VIN"
                            onClick={(e) => handleCopyVin(e, vehicle.VIN)}
                        >
                            <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                <i className={`fas ${copiedLabel === 'VIN_MAIN' ? 'fa-check text-emerald-500' : 'fa-fingerprint text-slate-400'} text-[9px]`}></i>
                                VIN
                            </span>
                            <span className={`text-[12.5px] font-mono font-bold transition-colors ${copiedLabel === 'VIN_MAIN' ? 'text-emerald-600' : 'text-blue-600 group-hover/vin:text-blue-700 group-hover/vin:underline'}`}>
                                {copiedLabel === 'VIN_MAIN' ? 'Đã copy!' : vehicle.VIN}
                            </span>
                        </div>

                        {(() => {
                            const dmsKey = Object.keys(vehicle).find(k => k.includes("DMS"));
                            const dmsValue = dmsKey ? vehicle[dmsKey as keyof typeof vehicle] : null;

                            if (dmsValue) {
                                return (
                                    <div className="flex items-center justify-between text-[10.5px] pt-0.5" title={`Mã DMS: ${dmsValue}`}>
                                        <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                            <i className="fas fa-qrcode text-[9px] text-slate-400"></i>
                                            DMS
                                        </span>
                                        <span className="font-mono font-medium text-slate-600 text-[10.5px]">{dmsValue}</span>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                        {isHeldByCurrentUser && (isNearExpiry || hasRequestedExtension) ? (
                            <div className="flex items-center">
                                {hasRequestedExtension ? (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200/50 rounded-md">
                                        <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse"></div>
                                        <span className="text-[9px] font-black uppercase tracking-widest">Chờ duyệt</span>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onOpenExtensionModal(vehicle); }}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-all rounded-md group"
                                    >
                                        <i className="fas fa-history text-[10px] opacity-70 group-hover:rotate-[-45deg] transition-transform"></i>
                                        <span className="text-[9px] font-black uppercase tracking-[0.15em]">Gia hạn</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <StatusBadge
                                status={vehicle['Trạng thái']}
                                iconOnly={!!(vehicle["Ngày vận tải"] && vehicle["Ngày vận tải"] !== '#N/A' && moment(vehicle["Ngày vận tải"]).isValid())}
                            />
                        )}

                        <div className="flex items-center gap-2">
                            {hasRealGps && onViewCarOnMap && vehicle.VIN && (
                                <button 
                                    type="button"
                                    className="group/gps cursor-pointer w-6 h-6 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-100 hover:border-blue-200 flex items-center justify-center transition-all shadow-sm hover:shadow-md relative group"
                                    title="Click để định vị xe trên Bản Đồ Live GPS"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewCarOnMap(vehicle.VIN);
                                    }}
                                >
                                    <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20 group-hover/gps:opacity-40 duration-[2s]"></div>
                                    <i className="fa-solid fa-location-crosshairs text-blue-600 text-xs group-hover/gps:scale-110 transition-transform"></i>
                                </button>
                            )}

                            {vehicle["Ngày vận tải"] && vehicle["Ngày vận tải"] !== '#N/A' && moment(vehicle["Ngày vận tải"], DATE_FORMATS).isValid() && (
                                <div className="flex items-center gap-1 text-blue-600/80" title={`Ngày vận tải: ${moment(vehicle["Ngày vận tải"], DATE_FORMATS).format('DD/MM/YYYY')}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>local_shipping</span>
                                    <span className="text-[11px] font-medium">{moment(vehicle["Ngày vận tải"], DATE_FORMATS).format('DD/MM/YYYY')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-100 mt-1 pt-1.5 flex items-center justify-center">
                {renderActions()}
            </div>
        </div>
    );
};

export default React.memo(StockCard);