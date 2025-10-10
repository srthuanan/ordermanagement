import React, { useState, useRef, useEffect, useCallback } from 'react';
import moment from 'moment';
import { StockVehicle, StockSortConfig } from '../types';
import StatusBadge from './ui/StatusBadge';

interface StockTableProps {
  vehicles: StockVehicle[];
  sortConfig: StockSortConfig | null;
  onSort: (key: keyof StockVehicle) => void;
  startIndex: number;
  onHoldCar: (vin: string) => void;
  onReleaseCar: (vin: string) => void;
  onCreateRequestForVehicle: (vehicle: StockVehicle) => void;
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

// Helper function to apply dynamic styles based on exterior color text.
const getExteriorColorStyle = (exteriorValue: string | undefined): React.CSSProperties => {
    const isDarkMode = false;
    const specificFontWeight = 500;
    const outlineStyle: React.CSSProperties = {
        textShadow: '0 0 4px rgba(0,0,0,0.8)',
    };

    if (!exteriorValue) return {};
    const lowerExteriorValue = exteriorValue.toLowerCase().trim();

    if (lowerExteriorValue === "brahminy white (ce18)") return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("sunset orb (ce1a)")) return { color: 'var(--exterior-orange-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("crimson red (ce1m)")) return { color: 'var(--exterior-red-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("vinfast blue (ce1n)")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("neptune grey (ce14)")) return isDarkMode ? { color: '#aebcc5', fontWeight: specificFontWeight } : { color: '#778899', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black (ce11)")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'black', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("electric blue (ce1j)")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("zenith grey (ce1v)")) return isDarkMode ? { color: '#d4e0f2', fontWeight: specificFontWeight } : { color: '#B0C4DE', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black roof- summer yellow body (111u)")) return { color: 'var(--exterior-yellow-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("brahminy white roof- aquatic azure body (181y)")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("brahminy white roof- rose pink body (1821)")) return { color: 'var(--exterior-pink-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("brahminy white roof - iris berry body (181x)")) return { color: 'var(--exterior-pink-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("urbant mint (ce1w)")) return isDarkMode ? { color: '#6ee6a0', fontWeight: specificFontWeight } : { color: '#3CB371', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("vinbus green (ce2b)")) return { color: 'var(--exterior-green-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("deep ocean (ce1h)")) return isDarkMode ? { color: '#2e8b57', fontWeight: specificFontWeight } : { color: '#006400', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("iris berry (ce1x)")) return { color: 'var(--exterior-pink-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("zenith grey-desat silver roof (171v)")) return { color: 'var(--exterior-grey-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("urbant mint green - desat silv (171w)")) return { color: 'var(--exterior-green-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("ivy green-desat silver roof (1722)")) return { color: 'var(--exterior-green-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("atlantic blue-aquatic azure ro (1y26)")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black-champagne creme roof (2311)")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("infinity blanc _ silky white r (2418)")) return { color: 'var(--exterior-white-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("champagne creme - matte champa (2523)")) return { color: 'var(--exterior-yellow-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black - graphite roof (2811)")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("crimson velvet - mystery bronz (2927)")) return { color: 'var(--exterior-red-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("ivy_green_gne (ce22)")) return { color: 'var(--exterior-green-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("champagne_creme_ylg (ce23)")) return { color: 'var(--exterior-yellow-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("crimson red - jet black roof (111m)")) return { color: 'var(--exterior-red-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("infinity blanc_zenith grey roof (1v18)")) return { color: 'var(--exterior-white-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("deep ocean_jet black roof (111h)")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("alantic blue_denim blue roof (2a26)")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black_mystery bronze roof (2911)")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("champagne creme_infinity blanc roof (1823)")) return { color: 'var(--exterior-yellow-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("de sat silver ind12007 (ce17)")) return { color: 'var(--exterior-grey-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("crimson red") || lowerExteriorValue.includes("crimson velvet")) return { color: 'var(--exterior-red-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("rose pink") || lowerExteriorValue.includes("iris berry")) return { color: 'var(--exterior-pink-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("vinfast blue") || lowerExteriorValue.includes("electric blue") || lowerExteriorValue.includes("atlantic blue") || lowerExteriorValue.includes("aquatic azure") || lowerExteriorValue.includes("alantic blue")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("deep ocean")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("sunset orb")) return { color: 'var(--exterior-orange-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("summer yellow") || lowerExteriorValue.includes("champagne creme") || lowerExteriorValue.includes("champagne_creme_ylg")) return { color: 'var(--exterior-yellow-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("urbant mint") || lowerExteriorValue.includes("vinbus green") || lowerExteriorValue.includes("ivy green") || lowerExteriorValue.includes("ivy_green_gne")) return { color: 'var(--exterior-green-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("brahminy white") || lowerExteriorValue.includes("infinity blanc")) return { color: 'var(--exterior-white-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("neptune grey") || lowerExteriorValue.includes("zenith grey") || lowerExteriorValue.includes("de sat silver") || lowerExteriorValue.includes("graphite")) return { color: 'var(--exterior-grey-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("mystery bronz")) return { color: 'var(--exterior-bronze-text)', fontWeight: specificFontWeight };

    return {};
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

const StockTable: React.FC<StockTableProps> = ({ vehicles, sortConfig, onSort, startIndex, onHoldCar, onReleaseCar, onCreateRequestForVehicle, currentUser, isAdmin, showToast, highlightedVins, processingVin }) => {
  const [confirmAction, setConfirmAction] = useState<{ vin: string; action: 'hold' | 'release' } | null>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((window as any).tippy) {
      (window as any).tippy('[data-tippy-content]', {
        allowHTML: true,
        placement: 'top',
        animation: 'scale-subtle',
        theme: 'light-border',
        duration: [200, 200],
      });
    }
  }, [vehicles]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (confirmRef.current && !confirmRef.current.contains(event.target as Node)) {
        setConfirmAction(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (vehicles.length === 0) {
    return (
      <div className="text-center py-16 text-text-secondary">
        <i className="fas fa-box-open fa-3x mb-4 text-text-placeholder"></i>
        <p className="font-semibold text-text-primary">Không tìm thấy xe nào trong kho.</p>
        <p className="text-sm">Hãy thử thay đổi bộ lọc hoặc kiểm tra lại sau.</p>
      </div>
    );
  }

  const handleCopyVin = (e: React.MouseEvent, vin: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(vin).then(() => {
        showToast('Đã Sao Chép', `Số VIN ${vin} đã được sao chép thành công.`, 'success', 2000);
    }).catch(err => {
        console.error('Lỗi sao chép VIN: ', err);
        showToast('Sao Chép Thất Bại', 'Không thể truy cập vào clipboard của bạn.', 'error', 3000);
    });
  };

  return (
    <div className="w-full">
        <div className="min-w-full py-2 align-middle">
            <table className="min-w-full divide-y divide-border-primary">
                <thead className="bg-surface-hover sticky top-0 z-10">
                    <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-center text-xs font-bold text-text-secondary sm:pl-6 w-12 uppercase tracking-wider">#</th>
                        <SortableHeaderCell columnKey="VIN" title="Số VIN" sortConfig={sortConfig} onSort={onSort} />
                        <SortableHeaderCell columnKey="Dòng xe" title="Dòng Xe" sortConfig={sortConfig} onSort={onSort} />
                        <SortableHeaderCell columnKey="Phiên bản" title="Phiên Bản" sortConfig={sortConfig} onSort={onSort} />
                        <SortableHeaderCell columnKey="Ngoại thất" title="Ngoại Thất" sortConfig={sortConfig} onSort={onSort} />
                        <SortableHeaderCell columnKey="Nội thất" title="Nội Thất" sortConfig={sortConfig} onSort={onSort} />
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
                        const tippyContent = isHeld && vehicle["Người Giữ Xe"] && vehicle["Thời Gian Hết Hạn Giữ"] ? `
                            <div class="p-2 text-left text-sm">
                                <div class="flex items-center gap-2">
                                    <i class="fas fa-user-clock text-accent-primary"></i>
                                    <div>
                                        <div class="font-semibold text-text-secondary text-xs">Người giữ:</div>
                                        <div class="text-text-primary font-medium">${vehicle["Người Giữ Xe"]}</div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 mt-2 pt-2 border-t border-dashed border-border-primary">
                                    <i class="fas fa-hourglass-end text-danger"></i>
                                    <div>
                                        <div class="font-semibold text-text-secondary text-xs">Hết hạn:</div>
                                        <div class="text-text-primary font-medium font-mono">${moment(vehicle["Thời Gian Hết Hạn Giữ"]).format('HH:mm DD/MM/YYYY')}</div>
                                        <div class="text-xs text-text-secondary">${moment(vehicle["Thời Gian Hết Hạn Giữ"]).fromNow()}</div>
                                    </div>
                                </div>
                            </div>
                        ` : '';

                        return (
                            <tr 
                                key={vehicle.VIN}
                                data-tippy-content={tippyContent}
                                className={`hover:bg-surface-hover transition-colors duration-200 animate-fade-in-up ${isHighlighted ? 'highlight-row' : ''} ${isConfirmOpen ? 'relative z-20' : ''}`} 
                                style={{animationDelay: `${index * 20}ms`}}
                            >
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-center text-text-secondary font-medium sm:pl-6">{startIndex + index + 1}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm font-mono text-text-primary">
                                    <span
                                        className="text-base font-bold text-accent-primary hover:text-accent-primary-hover hover:underline cursor-pointer transition-colors"
                                        title="Click để sao chép VIN"
                                        onClick={(e) => handleCopyVin(e, vehicle.VIN)}>
                                        {vehicle.VIN}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-text-primary">{vehicle["Dòng xe"]}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-text-primary">{vehicle["Phiên bản"]}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-text-primary font-medium" style={getExteriorColorStyle(vehicle['Ngoại thất'])}>{vehicle["Ngoại thất"]}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-text-primary">{vehicle["Nội thất"]}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    <div>
                                        <StatusBadge status={vehicle["Trạng thái"]} />
                                        {isHeld && vehicle["Thời Gian Hết Hạn Giữ"] && (
                                            <HoldCountdown expirationTime={vehicle["Thời Gian Hết Hạn Giữ"]} />
                                        )}
                                    </div>
                                </td>
                                <td className="whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-6">
                                    <div className="relative flex items-center justify-center gap-2 h-9">
                                        {isProcessing ? (
                                            <div className="flex items-center justify-center w-full h-full">
                                                <i className="fas fa-spinner fa-spin text-accent-primary text-xl"></i>
                                            </div>
                                        ) : isAvailable ? (
                                            <>
                                                <button
                                                    className="action-btn hold-action"
                                                    onClick={(e) => { e.stopPropagation(); setConfirmAction({ vin: vehicle.VIN, action: 'hold' }); }}
                                                    title="Giữ xe (tạm thời)"
                                                >
                                                    <i className="fas fa-stopwatch-20"></i>
                                                </button>
                                                <button
                                                    className="action-btn pair-action"
                                                    onClick={(e) => { e.stopPropagation(); onCreateRequestForVehicle(vehicle); }}
                                                    title="Ghép xe ngay"
                                                >
                                                    <i className="fas fa-link"></i>
                                                </button>
                                            </>
                                        ) : isHeldByCurrentUser ? (
                                            <>
                                                <button
                                                    className="action-btn release-action"
                                                    onClick={(e) => { e.stopPropagation(); setConfirmAction({ vin: vehicle.VIN, action: 'release' }); }}
                                                    title="Hủy giữ xe"
                                                >
                                                    <i className="fas fa-undo"></i>
                                                </button>
                                                <button
                                                    className="action-btn pair-action"
                                                    onClick={(e) => { e.stopPropagation(); onCreateRequestForVehicle(vehicle); }}
                                                    title="Tạo yêu cầu cho xe đã giữ"
                                                >
                                                    <i className="fas fa-link"></i>
                                                </button>
                                            </>
                                        ) : isHeldByOther ? (
                                            <>
                                                <button
                                                    disabled
                                                    className="action-btn"
                                                    title={`Đang được giữ bởi ${vehicle["Người Giữ Xe"]}`}
                                                >
                                                    <i className="fas fa-lock"></i>
                                                </button>
                                                {isAdmin && (
                                                    <button
                                                        className="action-btn admin-release-action"
                                                        onClick={(e) => { e.stopPropagation(); setConfirmAction({ vin: vehicle.VIN, action: 'release' }); }}
                                                        title="Admin Hủy Giữ"
                                                    >
                                                        <i className="fas fa-user-shield"></i>
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-xs text-text-secondary">—</span>
                                        )}
                                        
                                        {isConfirmOpen && !isProcessing && (
                                            <div
                                                ref={confirmRef}
                                                onClick={e => e.stopPropagation()}
                                                className="absolute -top-1 right-full mr-2 z-30 w-64 bg-surface-overlay p-4 rounded-lg shadow-xl border border-border-primary animate-fade-in-scale-up"
                                                style={{ animationDuration: '150ms' }}
                                            >
                                                <p className="text-sm font-semibold text-text-primary text-center">
                                                {confirmAction.action === 'hold' ? 'Xác nhận giữ xe này?' : 'Xác nhận hủy giữ xe?'}
                                                </p>
                                                <p className="text-xs text-text-secondary text-center mt-1">
                                                VIN: <span className="font-mono">{confirmAction.vin}</span>
                                                </p>
                                                <div className="flex justify-center gap-3 mt-4">
                                                <button
                                                    onClick={() => setConfirmAction(null)}
                                                    className="flex-1 btn-secondary !py-1.5 !text-xs"
                                                >
                                                    Không
                                                </button>
                                                <button
                                                    onClick={() => {
                                                    if (confirmAction.action === 'hold') {
                                                        onHoldCar(confirmAction.vin);
                                                    } else {
                                                        onReleaseCar(confirmAction.vin);
                                                    }
                                                    setConfirmAction(null);
                                                    }}
                                                    className={`flex-1 !py-1.5 !text-xs ${confirmAction.action === 'hold' ? 'btn-primary' : 'btn-danger'}`}
                                                >
                                                    Có, Xác nhận
                                                </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default StockTable;