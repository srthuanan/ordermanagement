import React, { useState } from 'react';
import moment from 'moment';
import 'moment/locale/vi';
import { Order } from '../../types';
import StatusBadge from '../ui/StatusBadge';

moment.locale('vi');

// Helper to format date and time, ensuring robustness for various string formats
// FIX: Updated to be more robust by trying multiple common formats with strict parsing.
const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    // Define possible formats, with ISO 8601 being a common one from JS dates.
    const formats = [
        moment.ISO_8601,
        "DD/MM/YYYY HH:mm:ss",
        "D/M/YYYY H:m:s",
        "YYYY-MM-DD HH:mm:ss"
    ];
    const date = moment(dateString, formats, 'vi', true); // Strict parsing
    return date.isValid() ? date.format('HH:mm DD/MM/YYYY') : '—';
};


const InfoItem: React.FC<{ icon: string; label: string; value?: string | number; children?: React.ReactNode; valueClassName?: string }> = ({ icon, label, value, children, valueClassName = '' }) => (
    <div className="flex items-start gap-4 py-3">
        <i className={`fas ${icon} text-accent-secondary text-lg w-6 text-center mt-1`}></i>
        <div className="flex-1">
            <p className="text-sm text-text-secondary">{label}</p>
            {value && <p className={`text-text-primary font-semibold text-base break-words ${valueClassName}`}>{value}</p>}
            {children}
        </div>
    </div>
);

const TimelineItem: React.FC<{ icon: string; label: string; value?: string | number; }> = ({ icon, label, value }) => (
    <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
            <i className={`fas ${icon} text-accent-secondary text-sm w-5 text-center`}></i>
            <p className="text-sm text-text-primary font-medium">{label}</p>
        </div>
        <p className="text-sm text-text-primary font-semibold">{value || '—'}</p>
    </div>
);

const VINDisplay: React.FC<{ vin: string }> = ({ vin }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(vin);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div
            onClick={handleCopy}
            className="relative p-4 rounded-lg bg-slate-800 border border-accent-secondary/30 shadow-lg hover:shadow-glow-accent transition-all duration-300 cursor-pointer group"
            title="Click để sao chép VIN"
        >
            <div className="text-left">
                <p className="text-xs text-slate-400 uppercase tracking-widest">Số Khung (VIN)</p>
                <p className="text-white font-mono tracking-wider text-2xl break-all group-hover:text-accent-secondary transition-colors">{vin}</p>
            </div>
            {isCopied && (
                 <div className="absolute top-2 right-2 text-xs font-semibold text-success bg-success-bg px-2 py-1 rounded-full animate-fade-in">
                    Đã sao chép!
                </div>
            )}
        </div>
    );
};

const InfoCard: React.FC<{title: string, icon: string, children: React.ReactNode, style?: React.CSSProperties}> = ({ title, icon, children, style }) => (
    <div className="bg-surface-card p-5 rounded-lg border border-border-primary shadow-sm animate-fade-in-down" style={style}>
        <h3 className="font-bold text-lg text-text-primary flex items-center gap-3 mb-2 border-b border-border-primary pb-3">
            <i className={`fas ${icon} text-accent-primary`}></i>
            {title}
        </h3>
        <div className="divide-y divide-border-primary/50 divide-dashed">
            {children}
        </div>
    </div>
);


// Main Modal Component
interface OrderDetailsModalProps {
    order: Order | null;
    onClose: () => void;
    orderList: Order[];
    onNavigate: (direction: 'prev' | 'next') => void;
}
const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose, orderList, onNavigate }) => {
  if (!order) return null;

  const statusText = order["Kết quả"] || "Chưa ghép";
  const isCancelled = statusText.toLowerCase().includes('đã hủy') || statusText.toLowerCase().includes('từ chối');

  const currentIndex = orderList.findIndex(o => o['Số đơn hàng'] === order['Số đơn hàng']);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < orderList.length - 1;

  // FIX: Correctly calculate the number of days since the VIN was paired using robust parsing.
  // This logic now correctly handles future dates and prevents incorrect calculations.
  let daysSincePairedText = '—';
  if (order["Thời gian ghép"]) {
      const formats = [
          moment.ISO_8601,
          "DD/MM/YYYY HH:mm:ss",
          "D/M/YYYY H:m:s",
          "YYYY-MM-DD HH:mm:ss"
      ];
      const pairingDate = moment(order["Thời gian ghép"], formats, 'vi', true);
      if (pairingDate.isValid()) {
          // Use moment().startOf('day') to compare just the date part, avoiding time-of-day issues.
          const today = moment().startOf('day');
          const pairingDay = pairingDate.startOf('day');
          const days = today.diff(pairingDay, 'days');
          // Ensure the value is not negative for future dates.
          daysSincePairedText = `${Math.max(0, days)} ngày`;
      }
  }

  return (
    <div 
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
        onClick={onClose}
    >
        {hasPrev && (
            <button
                onClick={(e) => { e.stopPropagation(); onNavigate('prev'); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 text-white rounded-full flex items-center justify-center text-2xl hover:bg-white/40 transition-colors z-10 hidden md:flex"
                title="Yêu cầu trước"
            >
                <i className="fas fa-chevron-left"></i>
            </button>
        )}
        <div 
            className="bg-surface-ground w-full max-w-5xl max-h-[95vh] flex flex-col rounded-2xl shadow-2xl animate-fade-in-scale-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            <header className="flex-shrink-0 flex items-center justify-center p-6 bg-surface-card border-b border-border-primary relative bg-gradient-to-b from-surface-card to-surface-ground/30 text-center">
                <div className="flex flex-col items-center gap-2">
                    <div>
                        <h2 className="text-xl font-bold text-gradient">Chi Tiết Yêu Cầu</h2>
                        <p className="text-sm text-text-secondary mt-1">
                           SĐH: <span className="font-mono">{order["Số đơn hàng"]}</span>
                           <span className="mx-2">|</span>
                           KH: <span className="font-semibold">{order["Tên khách hàng"]}</span>
                        </p>
                    </div>
                    <div className="mt-2">
                        <StatusBadge status={statusText} />
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                    aria-label="Đóng"
                >
                    <i className="fas fa-times text-xl"></i>
                </button>
            </header>

            <main className="overflow-y-auto flex-grow p-4 sm:p-6 space-y-6">
                {isCancelled && order["Ghi chú hủy"] && (
                    <div className="p-4 rounded-lg bg-danger-bg border border-danger/30">
                        <div className="flex items-start">
                            <i className="fas fa-exclamation-triangle text-danger text-xl mr-4 mt-1"></i>
                            <div>
                                <h3 className="font-bold text-danger">Yêu cầu đã bị hủy</h3>
                                <p className="text-sm text-red-800 mt-1">Lý do: {order["Ghi chú hủy"]}</p>
                            </div>
                        </div>
                    </div>
                )}
                
                {order.VIN && <VINDisplay vin={order.VIN} />}
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <InfoCard title="Thông tin chung" icon="fa-user-circle" style={{ animationDelay: '100ms' }}>
                        <InfoItem icon="fa-user-circle" label="Tên khách hàng" value={order["Tên khách hàng"]} valueClassName="uppercase" />
                        <InfoItem icon="fa-user-tie" label="Tư vấn bán hàng" value={order["Tên tư vấn bán hàng"]} />
                    </InfoCard>
                    
                    <InfoCard title="Chi tiết xe" icon="fa-car" style={{ animationDelay: '200ms' }}>
                        <InfoItem icon="fa-car-side" label="Dòng xe & Phiên bản" value={`${order["Dòng xe"]} - ${order["Phiên bản"]}`} />
                        <InfoItem icon="fa-palette" label="Ngoại thất" value={order["Ngoại thất"]} />
                        <InfoItem icon="fa-chair" label="Nội thất" value={order["Nội thất"]} />
                    </InfoCard>

                    <InfoCard title="Mốc thời gian" icon="fa-history" style={{ animationDelay: '300ms' }}>
                        <TimelineItem icon="fa-file-invoice-dollar" label="Ngày cọc" value={formatDateTime(order["Ngày cọc"])} />
                        <TimelineItem icon="fa-paper-plane" label="Ngày yêu cầu" value={formatDateTime(order["Thời gian nhập"])} />
                        <TimelineItem icon="fa-check-circle" label="Ngày ghép VIN" value={formatDateTime(order["Thời gian ghép"])} />
                        <TimelineItem icon="fa-hourglass-half" label="Số ngày ghép" value={daysSincePairedText} />
                    </InfoCard>
                </div>
            </main>
            <footer className="p-4 border-t border-border-primary flex justify-end flex-shrink-0 bg-surface-card rounded-b-2xl">
                <button 
                    onClick={onClose}
                    className="btn-secondary"
                >
                    Đóng
                </button>
            </footer>
        </div>
        {hasNext && (
            <button
                onClick={(e) => { e.stopPropagation(); onNavigate('next'); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 text-white rounded-full flex items-center justify-center text-2xl hover:bg-white/40 transition-colors z-10 hidden md:flex"
                title="Yêu cầu tiếp theo"
            >
                <i className="fas fa-chevron-right"></i>
            </button>
        )}
    </div>
  );
};

export default OrderDetailsModal;