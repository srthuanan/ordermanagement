import React, { useState, useMemo } from 'react';
import moment from 'moment';
import { StockVehicle } from '../../types';
import { getExteriorColorStyle, getInteriorColorStyle } from '../../utils/styleUtils';
import { formatShortWarehouseName } from '../../utils/stringUtils';
import { getQuickLocationName } from '../../utils/geocodeUtils';
import CarImage from '../ui/CarImage';
import StatusBadge from '../ui/StatusBadge';
import { MiniGpsMapModal } from '../modals/MiniGpsMapModal';

interface FacetedStockCardProps {
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

export const FacetedStockCard: React.FC<FacetedStockCardProps> = ({
    vehicle,
    onHoldCar,
    onReleaseCar,
    onJoinQueue,
    onLeaveQueue,
    onOpenExtensionModal,
    onCreateRequestForVehicle,
    onShowDetails,
    onAdminEdit,
    currentUser,
    isAdmin,
    showToast,
    processingVin,
    queuedVins,
    canHoldMore,
    isReferenceAccount,
    onOpenSwapModal,
    userOrders,
}) => {
    const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
    const [isGpsMapOpen, setIsGpsMapOpen] = useState(false);

    const isMine = (vehicle["Người Giữ Xe"] || (vehicle as any).nguoi_giu_xe || '')
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFC') === (currentUser || '').trim().toLowerCase().normalize('NFC');

    const isHeldByCurrentUser = vehicle["Trạng thái"] === 'Đang giữ' && isMine;
    const isAvailable = vehicle["Trạng thái"] === 'Chưa ghép';
    const isTakenByOther = (vehicle["Trạng thái"] === 'Đang giữ' || vehicle["Trạng thái"] === 'Đã ghép') && !isMine;
    const isProcessing = processingVin === vehicle.VIN;
    const isQueued = queuedVins?.some(v => v?.toUpperCase() === vehicle.VIN?.toUpperCase());

    const telemetry = vehicle.telemetry || (vehicle as any).telemetry;
    const hasGps = Boolean(telemetry && telemetry.lat && telemetry.lng);
    const quickLocation = hasGps ? getQuickLocationName(telemetry.lat, telemetry.lng) : '';
    const isInTransit = vehicle["Vị trí"] === 'Đang vận tải';

    const canShowSwapButton = useMemo(() => {
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

    const handleCopyVin = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!vehicle.VIN || vehicle.VIN === '---') return;
        navigator.clipboard.writeText(vehicle.VIN).then(() => {
            setCopiedLabel('VIN');
            showToast('Đã sao chép', `VIN: ${vehicle.VIN}`, 'info', 2000);
            setTimeout(() => setCopiedLabel(null), 2000);
        }).catch(() => {
            showToast('Thông tin VIN', vehicle.VIN, 'info', 3000);
        });
    };

    // Calculate Hold Expiry if holding
    const holdExpiryStr = useMemo(() => {
        if (vehicle["Trạng thái"] !== 'Đang giữ' || !vehicle["Thời Gian Hết Hạn Giữ"]) return '';
        const m = moment(vehicle["Thời Gian Hết Hạn Giữ"], ['DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY HH:mm', moment.ISO_8601]);
        if (!m.isValid()) return '';
        const diffHours = m.diff(moment(), 'hours');
        if (diffHours < 0) return 'Quá hạn';
        if (diffHours < 1) {
            const diffMin = m.diff(moment(), 'minutes');
            return `Còn ${diffMin}p`;
        }
        return `Còn ${diffHours}h (${m.format('HH:mm DD/MM')})`;
    }, [vehicle]);

    return (
        <article
            className="group relative bg-white hover:bg-slate-50/60 rounded-xl border border-slate-200/90 hover:border-blue-400/80 shadow-2xs hover:shadow-md transition-all duration-200 p-3 flex flex-col md:flex-row gap-3 min-h-[146px] overflow-hidden cursor-pointer"
            onClick={() => onShowDetails(vehicle)}
        >
            {/* Top decorative micro line based on status */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] ${
                vehicle["Trạng thái"] === 'Chưa ghép'
                    ? 'bg-emerald-500'
                    : vehicle["Trạng thái"] === 'Đang giữ'
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
            }`} />

            {/* Left side: Vehicle Image Studio Deck */}
            <div className="w-full md:w-[136px] xl:w-[145px] shrink-0 flex flex-col items-center justify-between p-2 rounded-lg bg-gradient-to-b from-slate-50 to-slate-100/50 border border-slate-100 relative group/img">
                <div className="w-full flex-1 flex items-center justify-center relative min-h-[72px]">
                    {/* Soft Realistic Contact Shadow */}
                    <div className="absolute bottom-1 w-[80%] h-2 bg-slate-900/10 rounded-[100%] blur-[2.5px] pointer-events-none transform scale-x-95 group-hover/img:scale-x-105 transition-transform duration-300"></div>

                    <CarImage
                        model={vehicle["Dòng xe"]}
                        exteriorColor={vehicle["Ngoại thất"]}
                        version={vehicle["Phiên bản"]}
                        className="object-contain max-h-[74px] max-w-full drop-shadow-sm transition-transform duration-300 group-hover/img:scale-105"
                        alt={`VinFast ${vehicle["Dòng xe"]}`}
                    />
                </div>

                {/* Color Swatch & Exterior Text */}
                <div className="w-full flex items-center justify-center gap-1.5 pt-1.5 border-t border-slate-200/60">
                    <span
                        className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0 shadow-2xs"
                        style={getExteriorColorStyle(vehicle["Ngoại thất"])}
                        title={vehicle["Ngoại thất"] || 'Màu ngoại thất'}
                    />
                    <span className="text-[10px] font-medium text-slate-600 truncate max-w-[105px]">
                        {vehicle["Ngoại thất"] || 'Chưa rõ màu'}
                    </span>
                </div>
            </div>

            {/* Right side: Vehicle Info & Operational Command */}
            <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
                {/* Header row: Model + Version pill + Status Badge */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[14px] font-black text-slate-900 tracking-tight group-hover:text-blue-700 transition-colors truncate">
                            {vehicle["Dòng xe"]}
                        </span>
                        {vehicle["Phiên bản"] ? (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/80 shrink-0">
                                {vehicle["Phiên bản"]}
                            </span>
                        ) : (
                            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 shrink-0 animate-pulse">
                                Thiếu PB
                            </span>
                        )}
                        {vehicle["Nội thất"] && (
                            <span
                                className="text-[9.5px] text-slate-400 font-medium truncate hidden sm:inline"
                                style={getInteriorColorStyle(vehicle["Nội thất"])}
                            >
                                • NT {vehicle["Nội thất"]}
                            </span>
                        )}
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                        <StatusBadge status={vehicle["Trạng thái"]} size="sm" />
                        {isAdmin && onAdminEdit && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAdminEdit(vehicle);
                                }}
                                className="w-5 h-5 rounded-md hover:bg-slate-200/80 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-colors text-[9.5px]"
                                title="Sửa thông tin xe (Admin)"
                            >
                                <i className="fas fa-pen"></i>
                            </button>
                        )}
                    </div>
                </div>

                {/* VIN & Warehouse Location Row */}
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px]">
                    {/* Clickable VIN */}
                    <button
                        type="button"
                        onClick={handleCopyVin}
                        className="group/vin inline-flex items-center gap-1 font-mono font-bold text-blue-600 hover:text-blue-800 transition-colors text-[11.5px]"
                        title="Click để sao chép VIN"
                    >
                        <i className={`fas ${copiedLabel === 'VIN' ? 'fa-check text-emerald-600' : 'fa-fingerprint text-slate-400 group-hover/vin:text-blue-500'} text-[10px]`}></i>
                        <span className={copiedLabel === 'VIN' ? 'text-emerald-600 underline' : 'underline-offset-2 hover:underline'}>
                            {vehicle.VIN || '---'}
                        </span>
                        {copiedLabel === 'VIN' && (
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded border border-emerald-200">
                                Đã chép
                            </span>
                        )}
                    </button>

                    {/* Warehouse Location / GPS button */}
                    <div className="flex items-center gap-1 text-[10.5px] text-slate-600 font-medium truncate">
                        <i className={`fas ${isInTransit ? 'fa-truck text-amber-500' : 'fa-warehouse text-emerald-600'} text-[9px]`}></i>
                        {isInTransit && hasGps ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsGpsMapOpen(true);
                                }}
                                className="font-bold text-amber-700 hover:text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                                title="📍 Click xem vị trí GPS vệ tinh trực tiếp"
                            >
                                <span className="truncate max-w-[120px]">{quickLocation || 'Bản đồ GPS'}</span>
                                <i className="fas fa-location-arrow text-[8px] text-blue-600"></i>
                            </button>
                        ) : (
                            <span className="truncate max-w-[150px]">
                                {formatShortWarehouseName(vehicle["Vị trí"]) || 'Chưa cập nhật vị trí'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Technical Specs: DMS Code, Engine Number, COC */}
                <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                    {((vehicle["Mã DMS"] || (vehicle as any).ma_dms)) && (
                        <span className="truncate font-mono">
                            <span className="text-slate-400">DMS:</span> <strong className="text-slate-700 font-semibold">{vehicle["Mã DMS"] || (vehicle as any).ma_dms}</strong>
                        </span>
                    )}
                    {((vehicle["Số máy"] || (vehicle as any).so_may)) && (
                        <span className="truncate font-mono hidden sm:inline">
                            <span className="text-slate-400">Máy:</span> <strong className="text-slate-700 font-semibold">{vehicle["Số máy"] || (vehicle as any).so_may}</strong>
                        </span>
                    )}
                    {((vehicle["Số COC"] || (vehicle as any).so_coc)) && (
                        <span className="truncate font-mono hidden md:inline text-amber-700">
                            <span className="text-slate-400">COC:</span> <strong className="font-semibold">{vehicle["Số COC"] || (vehicle as any).so_coc}</strong>
                        </span>
                    )}
                </div>

                {/* Operational Footer: Holder / Expiry info + Action buttons */}
                <div
                    className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 mt-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Left: Holder details */}
                    <div className="flex items-center gap-1.5 min-w-0 text-[10px]">
                        {vehicle["Trạng thái"] === 'Chưa ghép' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Sẵn sàng ghép (Tự do)
                            </span>
                        ) : vehicle["Trạng thái"] === 'Đang giữ' ? (
                            <div className="inline-flex items-center gap-1.5 text-amber-800 truncate" title={`Người giữ: ${vehicle["Người Giữ Xe"] || '---'}`}>
                                <i className="fas fa-clock text-amber-500 text-[9.5px]"></i>
                                <span className="font-bold truncate max-w-[110px]">
                                    {isHeldByCurrentUser ? 'Tôi đang giữ' : (vehicle["Người Giữ Xe"] || 'Đang giữ')}
                                </span>
                                {holdExpiryStr && (
                                    <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-200/70 px-1 py-0.2 rounded font-medium shrink-0">
                                        {holdExpiryStr}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-blue-700 font-medium truncate">
                                <i className="fas fa-check-circle text-blue-500 text-[9.5px]"></i>
                                <span className="truncate">Đã ghép đơn hàng</span>
                            </span>
                        )}
                    </div>

                    {/* Right: Operational CTA Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {isReferenceAccount ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wider">
                                Chỉ xem
                            </span>
                        ) : isProcessing ? (
                            <div className="px-3 py-1 flex items-center justify-center">
                                <i className="fas fa-circle-notch fa-spin text-blue-600 text-xs"></i>
                            </div>
                        ) : isAvailable ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => onHoldCar(vehicle.VIN)}
                                    disabled={!canHoldMore}
                                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all shadow-2xs flex items-center gap-1 active:scale-95 ${
                                        canHoldMore
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                    }`}
                                    title={canHoldMore ? 'Bấm giữ xe 24 giờ' : 'Bạn đã hết lượt giữ xe'}
                                >
                                    <i className="fas fa-lock text-[9px]"></i>
                                    Giữ xe (24h)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onCreateRequestForVehicle(vehicle)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10.5px] font-bold transition-all flex items-center gap-1 active:scale-95"
                                    title="Tạo đơn hàng hoặc yêu cầu ghép xe vào hợp đồng"
                                >
                                    <i className="fas fa-plus text-[9px]"></i>
                                    Ghép đơn
                                </button>
                            </>
                        ) : isHeldByCurrentUser ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => onReleaseCar(vehicle.VIN)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-[10.5px] font-semibold transition-colors"
                                    title="Nhả giữ xe"
                                >
                                    Nhả xe
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onOpenExtensionModal(vehicle)}
                                    className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10.5px] font-semibold transition-colors"
                                    title="Gia hạn thời gian giữ xe"
                                >
                                    Gia hạn
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onCreateRequestForVehicle(vehicle)}
                                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10.5px] font-bold transition-all shadow-xs"
                                    title="Tạo đơn hoặc ghép xe"
                                >
                                    Ghép đơn
                                </button>
                            </>
                        ) : isTakenByOther ? (
                            <>
                                {isQueued ? (
                                    <button
                                        type="button"
                                        onClick={() => onLeaveQueue(vehicle.VIN)}
                                        className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-rose-50 text-amber-800 hover:text-rose-600 border border-amber-200 text-[10px] font-semibold transition-colors flex items-center gap-1"
                                        title="Hủy xếp hàng chờ"
                                    >
                                        <i className="fas fa-times text-[8.5px]"></i>
                                        Hủy chờ
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => onJoinQueue(vehicle.VIN)}
                                        className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-800 border border-slate-200 hover:border-amber-300 text-[10px] font-semibold transition-colors flex items-center gap-1"
                                        title="Đăng ký vào hàng chờ khi xe được nhả"
                                    >
                                        <i className="fas fa-user-clock text-[8.5px]"></i>
                                        Xếp hàng
                                    </button>
                                )}

                                {canShowSwapButton && onOpenSwapModal && (
                                    <button
                                        type="button"
                                        onClick={() => onOpenSwapModal(vehicle)}
                                        className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-semibold transition-colors"
                                        title="Đề nghị đổi xe cùng cấu hình"
                                    >
                                        Đổi xe
                                    </button>
                                )}

                                {isAdmin && vehicle["Trạng thái"] === 'Đang giữ' && (
                                    <button
                                        type="button"
                                        onClick={() => onReleaseCar(vehicle.VIN)}
                                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors text-[9px]"
                                        title="Admin can thiệp hủy giữ"
                                    >
                                        <i className="fas fa-user-shield"></i>
                                    </button>
                                )}
                            </>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Mini GPS Modal if open */}
            {isGpsMapOpen && telemetry && (
                <MiniGpsMapModal
                    isOpen={isGpsMapOpen}
                    onClose={() => setIsGpsMapOpen(false)}
                    lat={telemetry.lat}
                    lng={telemetry.lng}
                    vin={vehicle.VIN}
                    vehicleName={vehicle["Dòng xe"]}
                />
            )}
        </article>
    );
};

export default React.memo(FacetedStockCard);

