import React, { useState, useRef, useEffect, useCallback } from 'react';
import moment from 'moment';
import { StockVehicle, StockSortConfig } from '../types';
import StatusBadge from './ui/StatusBadge';
import { getExteriorColorStyle } from '../utils/styleUtils';

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
            <table className="min-w-full divide-y divide-border-primary responsive-table">
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
                                <td data-label="#" className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-center text-text-secondary font-medium sm:pl-6">{startIndex + index + 1}</td>
                                <td data-label="Số VIN" className="whitespace-nowrap px-3 py-4 text-sm font-mono text-text-primary">
                                    <span
                                        className="text-base font-bold text-accent-primary hover:text-accent-primary-hover hover:underline cursor-pointer transition-colors"
                                        title="Click để sao chép VIN"
                                        onClick={(e) => handleCopyVin(e, vehicle.VIN)}>
                                        {vehicle.VIN}
                                    </span>
                                </td>
                                <td data-label="Dòng Xe" className="whitespace-nowrap px-3 py-4 text-sm text-text-primary">{vehicle["Dòng xe"]}</td>
                                <td data-label="Phiên Bản" className="whitespace-nowrap px-3 py-4 text-sm text-text-primary">{vehicle["Phiên bản"]}</td>
                                <td data-label="Ngoại Thất" className="whitespace-nowrap px-3 py-4 text-sm text-text-primary font-medium" style={getExteriorColorStyle(vehicle['Ngoại thất'])}>{vehicle["Ngoại thất"]}</td>
                                <td data-label="Nội Thất" className="whitespace-nowrap px-3 py-4 text-sm text-text-primary">{vehicle["Nội thất"]}</td>
                                <td data-label="Trạng Thái" className="whitespace-nowrap px-3 py-4 text-sm">
                                    <div>
                                        <StatusBadge status={vehicle["Trạng thái"]} />
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
                                        
                                        {isConfirmOpen && !isProcessing && confirmAction && (
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