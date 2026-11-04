import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import { StockVehicle, StockSortConfig } from '../types';
import StatusBadge from './ui/StatusBadge';
import { getExteriorColorStyle } from '../utils/styleUtils';
import { getQuickLocationName } from '../utils/geocodeUtils';
import sandTimerAnimationUrl from '../pictures/sand-timer.json?url';
import pairCarAnimationUrl from '../pictures/pair-animation.json?url';
import huygiuAnimationUrl from '../pictures/huygiu.json?url';
import Button from './ui/Button';
import { MiniGpsMapModal } from './modals/MiniGpsMapModal';

interface StockTableProps {
    vehicles: StockVehicle[];
    sortConfig: StockSortConfig | null;
    onSort: (key: keyof StockVehicle) => void;
    startIndex: number;
    onHoldCar: (vin: string) => void;
    onReleaseCar: (vin: string) => void;
    onCreateRequestForVehicle: (vehicle: StockVehicle) => void;
    onShowDetails: (vehicle: StockVehicle) => void;
    currentUser: string;
    isAdmin: boolean;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    highlightedVins: Set<string>;
    processingVin: string | null;
}

const HoldCountdown: React.FC<{ expirationTime: string }> = ({ expirationTime }) => {
    const calculateRemainingTime = useCallback(() => {
        const expiration = moment(expirationTime);
        const now = moment();
        const duration = moment.duration(expiration.diff(now));

        if (duration.asSeconds() <= 0) {
            return { total: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        return {
            total: duration.asSeconds(),
            hours: Math.floor(duration.asHours()),
            minutes: duration.minutes(),
            seconds: duration.seconds(),
        };
    }, [expirationTime]);

    const [remainingTime, setRemainingTime] = useState(calculateRemainingTime());

    useEffect(() => {
        const timer = setInterval(() => {
            setRemainingTime(calculateRemainingTime());
        }, 1000);

        return () => clearInterval(timer);
    }, [calculateRemainingTime]);

    if (remainingTime.total <= 0) {
        return <div className="mt-1 text-xs font-mono text-danger font-semibold">Hết hạn</div>;
    }

    const isUrgent = remainingTime.total < 5 * 60; // Less than 5 minutes

    const pad = (num: number) => num.toString().padStart(2, '0');

    return (
        <div className={`mt-1 text-xs font-mono font-semibold flex items-center gap-1.5 ${isUrgent ? 'text-danger animate-pulse' : 'text-text-secondary'}`}>
            <i className="far fa-clock"></i>
            <span>
                {remainingTime.hours > 0 && `${pad(remainingTime.hours)}:`}
                {pad(remainingTime.minutes)}:{pad(remainingTime.seconds)}
            </span>
        </div>
    );
};

const SortableHeaderCell: React.FC<{ columnKey: keyof StockVehicle; title: string; sortConfig: StockSortConfig | null; onSort: (key: keyof StockVehicle) => void; className?: string; }> =
    ({ columnKey, title, sortConfig, onSort, className }) => {
        const isSorted = sortConfig?.key === columnKey;
        const directionIcon = sortConfig?.direction === 'asc' ? '▲' : '▼';

        return (
            <th scope="col" onClick={() => onSort(columnKey)} className={`py-3.5 px-3 text-left text-xs font-bold text-text-secondary cursor-pointer hover:bg-surface-hover transition-colors whitespace-nowrap uppercase tracking-wider ${className}`}>
                {title} {isSorted && <span className="text-xs ml-1">{directionIcon}</span>}
            </th>
        );
    };

import { useNightMode } from '../hooks/useNightMode';

const StockTable: React.FC<StockTableProps> = ({ vehicles, sortConfig, onSort, startIndex, onHoldCar, onReleaseCar, onCreateRequestForVehicle, onShowDetails, currentUser, isAdmin, showToast, highlightedVins, processingVin }) => {
    const [confirmAction, setConfirmAction] = useState<{ vin: string; action: 'hold' | 'release' } | null>(null);
    const [copiedVin, setCopiedVin] = useState<string | null>(null);
    const [selectedGpsCar, setSelectedGpsCar] = useState<StockVehicle | null>(null);
    const isNight = useNightMode();
    if (false) showToast?.('', '', 'success');

    if (vehicles.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 px-4 w-full h-full">
                <div className="text-6xl mb-6 drop-shadow-md animate-bounce" style={{ animationDuration: '2s' }}>🏖️</div>
                <h3 className={`text-xl font-bold mb-2 tracking-tight ${isNight ? 'text-slate-200' : 'text-gray-700'}`}>Không có xe nào ở đây!</h3>
                <p className={`text-sm max-w-sm text-center ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
                    Tất cả xe đã được bán hết hoặc bộ lọc của bạn quá khắt khe. Hãy thử đổi bộ lọc rồi ra biển dạo chơi nhé!
                </p>
            </div>
        );
    }

    const handleCopyVin = (e: React.MouseEvent, vin: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(vin).then(() => {
            setCopiedVin(vin);
            setTimeout(() => setCopiedVin(null), 2000);
        }).catch(err => {
            console.error('Lỗi sao chép VIN: ', err);
        });
    };

    return (
        <div className="w-full">
            <div className="min-w-full py-2 align-middle">
                <table className="min-w-full divide-y divide-border-primary responsive-table">
                    <thead className="bg-surface-hover sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-center text-xs font-bold text-text-secondary sm:pl-6 w-12 uppercase tracking-wider">#</th>
                            <SortableHeaderCell columnKey="VIN" title="Số VIN" sortConfig={sortConfig} onSort={onSort} />
                            <SortableHeaderCell columnKey="Dòng xe" title="Dòng Xe" sortConfig={sortConfig} onSort={onSort} />
                            <SortableHeaderCell columnKey="Phiên bản" title="Phiên Bản" sortConfig={sortConfig} onSort={onSort} />
                            <SortableHeaderCell columnKey="Ngoại thất" title="Ngoại Thất" sortConfig={sortConfig} onSort={onSort} />
                            <SortableHeaderCell columnKey="Nội thất" title="Nội Thất" sortConfig={sortConfig} onSort={onSort} />
                            <SortableHeaderCell columnKey="Ngày vận tải" title="Ngày Vận Tải" sortConfig={sortConfig} onSort={onSort} />
                            <SortableHeaderCell columnKey="Trạng thái" title="Trạng Thái" sortConfig={sortConfig} onSort={onSort} />
                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-center text-xs font-bold text-text-secondary uppercase tracking-wider">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary bg-surface-card">
                        {vehicles.map((vehicle, index) => {
                            const isHeldByCurrentUser = vehicle["Trạng thái"] === 'Đang giữ' &&
                                vehicle["Người Giữ Xe"]?.trim().toLowerCase().normalize('NFC') === currentUser?.trim().toLowerCase().normalize('NFC');

                            const isAvailable = vehicle["Trạng thái"] === 'Chưa ghép';
                            const isHeldByOther = vehicle["Trạng thái"] === 'Đang giữ' && !isHeldByCurrentUser;
                            const isHighlighted = highlightedVins.has(vehicle.VIN);
                            const isConfirmOpen = confirmAction?.vin === vehicle.VIN;
                            const isProcessing = processingVin === vehicle.VIN;

                            const isHeld = vehicle["Trạng thái"] === 'Đang giữ';

                            return (
                                <tr
                                    key={vehicle.VIN}
                                    className={`hover:bg-surface-hover transition-colors duration-200 animate-fade-in-up cursor-pointer ${isHighlighted ? 'highlight-row' : ''} ${isConfirmOpen ? 'relative z-20' : ''}`}
                                    style={{ animationDelay: `${index * 20}ms` }}
                                    onClick={() => onShowDetails(vehicle)}
                                >
                                    <td data-label="#" className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-center text-text-secondary font-medium sm:pl-6">{startIndex + index + 1}</td>
                                    <td data-label="Số VIN" className="whitespace-nowrap px-3 py-4 text-sm font-mono text-text-primary">
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className={`text-base font-bold hover:underline cursor-pointer transition-colors ${copiedVin === vehicle.VIN ? 'text-green-500' : 'text-accent-primary hover:text-accent-primary-hover'}`}
                                                title="Click để sao chép VIN"
                                                onClick={(e) => handleCopyVin(e, vehicle.VIN)}>
                                                {copiedVin === vehicle.VIN ? <span className="flex items-center gap-1"><i className="fas fa-check text-sm"></i> Đã copy</span> : vehicle.VIN}
                                            </span>
                                            {vehicle["Vị trí"] === 'Đang vận tải' && vehicle.telemetry && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedGpsCar(vehicle);
                                                    }}
                                                    className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
                                                    title={`🛰️ Xem bản đồ vị trí xe lồng: ${vehicle.telemetry.lat.toFixed(5)}, ${vehicle.telemetry.lng.toFixed(5)}`}
                                                >
                                                    <i className="fas fa-truck text-[10px]"></i>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td data-label="Dòng Xe" className="whitespace-nowrap px-3 py-4 text-sm text-text-primary">{vehicle["Dòng xe"]}</td>
                                    <td data-label="Phiên Bản" className="whitespace-nowrap px-3 py-4 text-sm text-text-primary">{vehicle["Phiên bản"]}</td>
                                    <td data-label="Ngoại Thất" className="whitespace-nowrap px-3 py-4 text-sm text-text-primary font-medium" style={getExteriorColorStyle(vehicle['Ngoại thất'])}>{vehicle["Ngoại thất"]}</td>
                                    <td data-label="Nội Thất" className="whitespace-nowrap px-3 py-4 text-sm text-text-primary">{vehicle["Nội thất"]}</td>
                                    <td data-label="Ngày Vận Tải" className="whitespace-nowrap px-3 py-4 text-sm text-text-primary">
                                        <div className="flex flex-col gap-0.5">
                                            {vehicle["Ngày vận tải"] && (
                                                <span>{moment(vehicle["Ngày vận tải"]).format('DD/MM/YYYY')}</span>
                                            )}
                                            {vehicle["Vị trí"] === 'Đang vận tải' && vehicle.telemetry ? (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedGpsCar(vehicle);
                                                    }}
                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-blue-600 hover:underline cursor-pointer group/tblgps"
                                                    title={`📍 Tọa độ: ${vehicle.telemetry.lat.toFixed(5)}, ${vehicle.telemetry.lng.toFixed(5)}\nClick để xem bản đồ`}
                                                >
                                                    <span>{getQuickLocationName(vehicle.telemetry.lat, vehicle.telemetry.lng) || 'Xem GPS'}</span>
                                                    <i className="fas fa-map-marked-alt text-[8px] opacity-0 group-hover/tblgps:opacity-100 transition-opacity"></i>
                                                </button>
                                            ) : vehicle["Vị trí"] === 'Đang vận tải' ? (
                                                <span className="text-[11px] font-medium text-amber-600">
                                                    Đang vận tải
                                                </span>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td data-label="Trạng Thái" className="whitespace-nowrap px-3 py-4 text-sm">
                                        <div>
                                            <StatusBadge status={vehicle["Trạng thái"]} />
                                            {isHeld && vehicle["Người Giữ Xe"] && (
                                                <div className="mt-1.5 text-xs font-medium text-text-primary flex items-center gap-1.5">
                                                    <i className="far fa-user text-text-secondary" title="Người giữ xe"></i>
                                                    <span className="truncate max-w-[120px]" title={vehicle["Người Giữ Xe"]}>{vehicle["Người Giữ Xe"]}</span>
                                                </div>
                                            )}
                                            {isHeld && vehicle["Thời Gian Hết Hạn Giữ"] && (
                                                <HoldCountdown expirationTime={vehicle["Thời Gian Hết Hạn Giữ"]} />
                                            )}
                                        </div>
                                    </td>
                                    <td data-label="Hành động" className="whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-6">
                                        <div className="relative flex items-center justify-center gap-2 h-9">
                                            {isProcessing ? (
                                                <div className="flex items-center justify-center w-full h-full">
                                                    <i className="fas fa-spinner fa-spin text-accent-primary text-xl"></i>
                                                </div>
                                            ) : isConfirmOpen && confirmAction ? (
                                                <div className="flex justify-center items-center gap-3 w-full animate-fade-in" style={{ animationDuration: '150ms' }}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setConfirmAction(null); }}
                                                        className="w-10 h-8 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all rounded-full shadow-sm"
                                                        title="Hủy"
                                                    >
                                                        <i className="fas fa-times text-xs"></i>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirmAction.action === 'hold') {
                                                                onHoldCar(confirmAction.vin);
                                                            } else {
                                                                onReleaseCar(confirmAction.vin);
                                                            }
                                                            setConfirmAction(null);
                                                        }}
                                                        className="w-10 h-8 flex items-center justify-center bg-accent-primary text-white hover:bg-accent-primary-hover transition-all rounded-full shadow-md font-black text-[10px]"
                                                        title="Xác nhận"
                                                    >
                                                        OK
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    {isAvailable ? (
                                                        <div
                                                            className="cursor-pointer transition-transform hover:scale-110"
                                                            onClick={(e) => { e.stopPropagation(); setConfirmAction({ vin: vehicle.VIN, action: 'hold' }); }}
                                                            title="Giữ xe (tạm thời)"
                                                        >
                                                            <lottie-player
                                                                src={sandTimerAnimationUrl}
                                                                background="transparent"
                                                                speed="1"
                                                                style={{ width: '36px', height: '36px' }}
                                                                loop
                                                                autoplay
                                                            ></lottie-player>
                                                        </div>
                                                    ) : isHeldByCurrentUser ? (
                                                        <>
                                                            <div
                                                                className="cursor-pointer transition-transform hover:scale-110"
                                                                onClick={(e) => { e.stopPropagation(); setConfirmAction({ vin: vehicle.VIN, action: 'release' }); }}
                                                                title="Hủy giữ xe"
                                                            >
                                                                <lottie-player
                                                                    src={huygiuAnimationUrl}
                                                                    background="transparent"
                                                                    speed="1"
                                                                    style={{ width: '36px', height: '36px' }}
                                                                    loop
                                                                    autoplay
                                                                ></lottie-player>
                                                            </div>
                                                            <div
                                                                className="cursor-pointer transition-transform hover:scale-110"
                                                                onClick={(e) => { e.stopPropagation(); onCreateRequestForVehicle(vehicle); }}
                                                                title="Tạo yêu cầu cho xe đã giữ"
                                                            >
                                                                <lottie-player
                                                                    src={pairCarAnimationUrl}
                                                                    background="transparent"
                                                                    speed="1"
                                                                    style={{ width: '42px', height: '42px' }}
                                                                    loop
                                                                    autoplay
                                                                ></lottie-player>
                                                            </div>
                                                        </>
                                                    ) : isHeldByOther ? (
                                                        <>
                                                            <Button
                                                                disabled
                                                                variant="secondary"
                                                                className="w-9 h-9 !p-0 rounded-full flex items-center justify-center opacity-70 cursor-not-allowed"
                                                                title={`Đang được giữ bởi ${vehicle["Người Giữ Xe"]}`}
                                                            >
                                                                <i className="fas fa-lock"></i>
                                                            </Button>
                                                            {isAdmin && (
                                                                <Button
                                                                    variant="danger"
                                                                    className="w-9 h-9 !p-0 rounded-full flex items-center justify-center admin-release-action"
                                                                    onClick={(e) => { e.stopPropagation(); setConfirmAction({ vin: vehicle.VIN, action: 'release' }); }}
                                                                    title="Admin Hủy Giữ"
                                                                >
                                                                    <i className="fas fa-user-shield"></i>
                                                                </Button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-text-secondary">—</span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mini GPS Map Modal */}
            {selectedGpsCar && selectedGpsCar.telemetry && (
                <MiniGpsMapModal
                    isOpen={Boolean(selectedGpsCar)}
                    onClose={() => setSelectedGpsCar(null)}
                    vehicleName={`${selectedGpsCar['Dòng xe'] || ''} ${selectedGpsCar['Phiên bản'] || ''}`.trim()}
                    vin={selectedGpsCar.VIN}
                    lat={selectedGpsCar.telemetry.lat}
                    lng={selectedGpsCar.telemetry.lng}
                    locationName={getQuickLocationName(selectedGpsCar.telemetry.lat, selectedGpsCar.telemetry.lng) || selectedGpsCar['Vị trí']}
                    capturedAt={selectedGpsCar.telemetry.captured_at}
                />
            )}
        </div>
    );
};

export default StockTable;
