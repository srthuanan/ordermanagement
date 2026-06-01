import React, { useState } from 'react';
import moment from 'moment';
import { StockVehicle } from '../types';
import { getExteriorColorStyle, getInteriorColorStyle, getBrochureUrl } from '../utils/styleUtils';
import Button from './ui/Button';
import CarImage from './ui/CarImage'; // Import the new component
import StatusBadge from './ui/StatusBadge';

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
    onAdminEdit,
    currentUser,
    isAdmin,
    showToast,
    processingVin,
    queuedVins,
    canHoldMore,
    onViewCarOnMap,
    isReferenceAccount
}) => {
    const [confirmAction, setConfirmAction] = useState<{ action: 'hold' | 'release' } | null>(null);
    if (false) showToast?.('', '', 'success');
    const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

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
                    <div className="flex items-center justify-center w-full h-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hết lượt giữ</span>
                    </div>
                );
            }

            return (
                <Button
                    onClick={(e) => { e.stopPropagation(); onHoldCar(vehicle.VIN); }}
                    variant="ghost"
                    size="sm"
                    className="bg-white border border-blue-200 text-blue-600 shadow-sm hover:bg-blue-50 hover:border-blue-300 hover:shadow-md rounded-full group px-4 w-full"
                    title="Giữ xe"
                >
                    <span className="material-symbols-outlined text-[16px] group-hover:scale-110 transition-transform">lock</span>
                    <span className="font-semibold text-xs">Giữ xe</span>
                </Button>
            );
        }

        if (isHeldByCurrentUser) {
            return (
                <div className="flex items-center gap-1.5 w-full">
                    <button
                        onClick={(e) => { e.stopPropagation(); onReleaseCar(vehicle.VIN); }}
                        className="flex-1 h-8 flex items-center justify-center gap-1.5 bg-white border border-red-100 text-red-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm"
                    >
                        <i className="fas fa-times"></i>
                        <span>Hủy</span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onCreateRequestForVehicle(vehicle); }}
                        className="flex-1 h-8 flex items-center justify-center gap-1.5 bg-white border-blue-100 text-blue-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm"
                    >
                        <i className="fas fa-link"></i>
                        <span>Ghép</span>
                    </button>
                </div>
            );
        }

        if (isTakenByOther) {
            const isQueued = queuedVins.some(v => v?.toUpperCase() === vehicle.VIN?.toUpperCase());
            return (
                <div className="flex items-center gap-2 w-full">
                    {isQueued ? (
                        <Button 
                            onClick={(e) => { e.stopPropagation(); onLeaveQueue(vehicle.VIN); }}
                            variant="ghost" 
                            size="sm"
                            className="bg-white border border-slate-200 text-slate-400 shadow-sm hover:bg-slate-50 hover:text-slate-600 hover:border-slate-300 rounded-full group flex-1"
                            title="Hủy đăng ký hàng chờ"
                        >
                             <i className="fas fa-times text-[10px] group-hover:rotate-90 transition-transform"></i>
                             <span className="font-semibold text-xs tracking-tight">Hủy chờ</span>
                        </Button>
                    ) : (
                        <Button 
                            onClick={(e) => { e.stopPropagation(); onJoinQueue(vehicle.VIN); }}
                            variant="ghost" 
                            size="sm"
                            className="bg-white border border-amber-200 text-amber-600 shadow-sm hover:bg-amber-50 hover:border-amber-300 hover:shadow-md rounded-full group flex-1"
                            title="Đăng ký hàng chờ"
                        >
                            <span className="material-symbols-outlined text-[16px] group-hover:scale-110 transition-transform">person_add</span>
                            <span className="font-semibold text-xs">Chờ xe</span>
                        </Button>
                    )}
                    
                    {isAdmin && vehicle["Trạng thái"] === 'Đang giữ' && (
                        <Button 
                            variant="ghost" 
                            size="sm"
                            className="bg-white border border-red-200 text-red-600 shadow-sm hover:bg-red-50 hover:border-red-300 hover:shadow-md rounded-full group p-0 w-8 h-8 flex items-center justify-center flex-shrink-0"
                            onClick={(e) => { e.stopPropagation(); onReleaseCar(vehicle.VIN); }} 
                            title="Admin Hủy Giữ"
                        >
                            <i className="fas fa-user-shield text-xs"></i>
                        </Button>
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
        vehicle['Thời Gian Hết Hạn Giữ'] && moment(vehicle['Thời Gian Hết Hạn Giữ'], DATE_FORMATS).isValid() ? { icon: 'fa-clock', label: 'Thời hạn', value: moment(vehicle['Thời Gian Hết Hạn Giữ'], DATE_FORMATS).format('DD/MM/YYYY HH:mm:ss'), copyable: false } : null,
        vehicle['Ngày vận tải'] && vehicle['Ngày vận tải'] !== '#N/A' && moment(vehicle['Ngày vận tải'], DATE_FORMATS).isValid() ? { icon: 'fa-shipping-fast', label: 'Vận tải', value: moment(vehicle['Ngày vận tải'], DATE_FORMATS).format('DD/MM/YYYY'), copyable: false } : null,
        vehicle['Ghi chú dms'] && vehicle['Ghi chú dms'] !== '#N/A' && vehicle['Ghi chú dms'].trim() !== '' ? { icon: 'fa-comment-dots', label: 'Ghi chú', value: vehicle['Ghi chú dms'], copyable: false } : null,
    ].filter((item): item is { icon: string; label: string; value: string; copyable: boolean } => item !== null);

    return (
        <div 
            className={`relative flex flex-col gap-2 rounded-xl bg-white p-2 shadow-sm ${isMissingVersion ? 'border-amber-300 ring-1 ring-amber-100/50 shadow-amber-50' : 'border border-cyan-100 shadow-cyan-100/50'} hover:shadow-lg hover:shadow-cyan-200/40 hover:border-cyan-300 hover:z-[99] transition-all duration-300 ease-out active:scale-[0.98] group`}
        >
            {/* Premium Glassmorphism Interactive Tooltip - Hidden on mobile where tap opens details */}
            <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%+12px)] min-w-[190px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_25px_60px_-15px_rgba(59,130,246,0.25)] border border-blue-100/80 p-2.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-400 z-[100] scale-95 group-hover:scale-100 pointer-events-auto delay-100 hidden md:block">
                <div className="text-[10px] font-black uppercase text-blue-600 mb-2 border-b border-blue-50 pb-1.5 tracking-[0.1em] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
                            <i className="fas fa-list-ul text-[10px]"></i>
                        </div>
                        <span className="whitespace-nowrap">Chi tiết thông tin</span>
                    </div>
                    {getBrochureUrl(vehicle['Dòng xe']) && (
                        <a 
                            href={getBrochureUrl(vehicle['Dòng xe'])!} 
                            target="_blank" 
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-center gap-1 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-200/50 hover:border-blue-300/80 text-blue-600 px-2 h-6 rounded-lg text-[9px] font-black uppercase transition-all flex-shrink-0 shadow-sm hover:shadow active:scale-95"
                            title="Xem tài liệu kỹ thuật (Brochure)"
                        >
                            <span className="material-symbols-outlined text-[14px]">menu_book</span>
                            <span className="whitespace-nowrap">Brochure</span>
                        </a>
                    )}
                </div>
                <div className="flex flex-col gap-1.5 relative z-10 w-full">
                    {detailsList.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-start text-[10px] leading-tight w-full">
                             <div className="w-4 flex flex-shrink-0 items-center justify-center pt-0.5">
                                 <i className={`fas ${item.icon} text-blue-300 text-[10px]`}></i>
                             </div>
                             <div className="flex-1 min-w-0 flex items-baseline">
                                 <span className="text-slate-500 font-medium whitespace-nowrap text-[10px]">{item.label}: </span>
                                 <span 
                                     className={`font-bold text-slate-800 break-words ml-1.5 text-[10px] flex items-center ${item.copyable && item.value !== '---' ? 'cursor-pointer hover:text-blue-600 hover:bg-blue-50 rounded px-1 -mx-1 py-0.5 -my-0.5 transition-colors border border-transparent hover:border-blue-100' : ''}`}
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
                                     title={item.copyable && item.value !== '---' ? `Click để copy ${item.label}` : undefined}
                                 >
                                     {copiedLabel === item.label ? <span className="text-green-600 flex items-center gap-1"><i className="fas fa-check text-[9px]"></i> Đã copy</span> : item.value}
                                 </span>
                             </div>
                        </div>
                    ))}
                </div>
                {/* Decorative glow corner */}
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-blue-400/10 blur-[40px] rounded-full pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-blue-400/5 blur-[40px] rounded-full pointer-events-none"></div>
            </div>
            {isMissingVersion && (
                <div className="absolute -top-2 -right-1 z-30 flex items-center gap-1.5 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full shadow-lg text-[9px] font-bold uppercase tracking-wider animate-bounce-subtle">
                    <i className="fas fa-edit"></i>
                    Bổ sung PB
                </div>
            )}
            {isAdmin && onAdminEdit && !isReferenceAccount && (
                <button
                    onClick={(e) => { e.stopPropagation(); onAdminEdit(vehicle); }}
                    className="absolute top-1 left-1 z-[110] w-6 h-6 flex items-center justify-center rounded-lg bg-slate-700/70 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-accent-primary transition-all duration-200 backdrop-blur-sm shadow-sm"
                    title="Sửa / Xóa xe (Admin)"
                >
                    <i className="fas fa-cog text-[9px]"></i>
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
                            <span className="text-light-text-primary text-base font-bold whitespace-nowrap group-hover:text-accent-primary transition-colors">
                                {vehicle['Dòng xe']}
                            </span>
                            <span className="text-light-text-secondary text-xs font-medium truncate" title={vehicle['Phiên bản']}>
                                {vehicle['Phiên bản'] || <span className="text-amber-500 font-bold italic animate-pulse">Chưa có FB</span>}
                            </span>
                        </div>
                        {getBrochureUrl(vehicle['Dòng xe']) && (
                            <a 
                                href={getBrochureUrl(vehicle['Dòng xe'])!} 
                                target="_blank" 
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-center p-1 rounded-full text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-all flex-shrink-0"
                                title="Xem tài liệu kỹ thuật (Brochure)"
                            >
                                <span className="material-symbols-outlined text-[18px]">menu_book</span>
                            </a>
                        )}
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
                    <div className="flex flex-col gap-1 mt-0.5">
                        {/* Technical Info Group */}
                        <div className="bg-gray-50 rounded p-1 border border-gray-100">
                            <div
                                className="cursor-pointer flex items-center justify-between"
                                title="Click để sao chép VIN"
                                onClick={(e) => handleCopyVin(e, vehicle.VIN)}
                            >
                                <span className={`material-symbols-outlined ${copiedLabel === 'VIN_MAIN' ? 'text-green-500' : 'text-gray-400'}`} style={{ fontSize: '16px' }} title="VIN">{copiedLabel === 'VIN_MAIN' ? 'check_circle' : 'fingerprint'}</span>
                                <span className={`text-sm font-mono font-bold hover:underline transition-colors ${copiedLabel === 'VIN_MAIN' ? 'text-green-500' : 'text-accent-primary hover:text-accent-primary-hover'}`}>{copiedLabel === 'VIN_MAIN' ? 'Đã copy!' : vehicle.VIN}</span>
                            </div>

                            {(() => {
                                const dmsKey = Object.keys(vehicle).find(k => k.includes("DMS"));
                                const dmsValue = dmsKey ? vehicle[dmsKey as keyof typeof vehicle] : null;

                                if (dmsValue) {
                                    return (
                                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-200 border-dashed" title={`Mã DMS: ${dmsValue}`}>
                                            <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '16px' }} title="DMS">qr_code_2</span>
                                            <span className="text-xs font-mono font-medium text-gray-700">{dmsValue}</span>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>


                    </div>

                    <div className="flex items-center justify-between mt-0.5">
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
                            {(() => {
                                const hasGps = (vehicle.extension_reason && typeof vehicle.extension_reason === 'string' && vehicle.extension_reason.includes('GPS:')) ||
                                               ((vehicle as any)['extension_reason'] && typeof (vehicle as any)['extension_reason'] === 'string' && (vehicle as any)['extension_reason'].includes('GPS:')) ||
                                               (vehicle["Vị trí"] && typeof vehicle["Vị trí"] === 'string' && vehicle["Vị trí"].includes('GPS:')) ||
                                               ((vehicle as any)['Vị trí'] && typeof (vehicle as any)['Vị trí'] === 'string' && (vehicle as any)['Vị trí'].includes('GPS:'));

                                if (hasGps && onViewCarOnMap) {
                                    return (
                                        <span 
                                            className="group/gps cursor-pointer w-6 h-6 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-200 flex items-center justify-center transition-all shadow-sm hover:shadow-md relative group"
                                            title="Click để định vị xe trên Bản Đồ Live"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onViewCarOnMap(vehicle.VIN);
                                            }}
                                        >
                                            <div className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-20 group-hover/gps:opacity-40 duration-[2s]"></div>
                                            <i className="fa-solid fa-location-crosshairs text-indigo-600 text-xs group-hover/gps:scale-110 transition-transform"></i>
                                        </span>
                                    );
                                }
                                return null;
                            })()}

                            {vehicle["Ngày vận tải"] && vehicle["Ngày vận tải"] !== '#N/A' && moment(vehicle["Ngày vận tải"], DATE_FORMATS).isValid() && (
                                <div className="flex items-center gap-1 text-blue-600/80" title={`Ngày vận tải: ${moment(vehicle["Ngày vận tải"], DATE_FORMATS).format('DD/MM/YYYY')}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>local_shipping</span>
                                    <span className="text-[11px] font-medium">{moment(vehicle["Ngày vận tải"], DATE_FORMATS).format('DD/MM/YYYY')}</span>
                                </div>
                            )}
                        </div>
                        {/* daysInStock display removed as per user request */}
                    </div>
                </div>
            </div>

            <div className="border-t border-dashed border-gray-200 mt-1 pt-1 flex items-center justify-center">
                {renderActions()}
            </div>
        </div>
    );
};

export default StockCard;