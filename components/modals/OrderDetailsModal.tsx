import React, { useState } from 'react';
import moment from 'moment';
import 'moment/locale/vi';
import { Order } from '../../types';
import StatusBadge from '../ui/StatusBadge';

moment.locale('vi');

// Helper to format date and time
const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    try {
        const date = moment(dateString);
        return date.isValid() ? date.format('HH:mm DD/MM/YYYY') : '—';
    } catch (e) {
        return '—';
    }
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
        <div className="p-4 rounded-lg bg-slate-800 border border-accent-secondary/30 flex items-center justify-center gap-4 shadow-lg hover:shadow-glow-accent transition-shadow duration-300">
            {/* Spacer to balance the button */}
            <div className="w-12 h-12 flex-shrink-0"></div>
            <div className="flex-1 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-widest">Số Khung (VIN)</p>
                <p className="text-white font-mono tracking-wider text-2xl break-all">{vin}</p>
            </div>
            <button 
                onClick={handleCopy}
                className={`w-12 h-12 flex-shrink-0 rounded-lg flex items-center justify-center transition-all duration-200 text-xl ${
                    isCopied 
                    ? 'bg-success text-white' 
                    : 'bg-accent-secondary/20 text-accent-secondary hover:bg-accent-secondary hover:text-white'
                }`}
                title={isCopied ? "Đã sao chép!" : "Sao chép VIN"}
            >
                <i className={`fas ${isCopied ? 'fa-check-circle' : 'fa-copy'}`}></i>
            </button>
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
const OrderDetailsModal: React.FC<{ order: Order | null; onClose: () => void }> = ({ order, onClose }) => {
  if (!order) return null;

  const statusText = order["Trạng thái VC"] || order["Kết quả"] || "Chưa ghép";
  const isCancelled = statusText.toLowerCase().includes('đã hủy') || statusText.toLowerCase().includes('từ chối');

  let daysSincePairedText = '—';
  if (order["Thời gian ghép"]) {
      const pairingDate = moment(order["Thời gian ghép"]);
      if (pairingDate.isValid()) {
          const days = moment().diff(pairingDate, 'days');
          daysSincePairedText = `${Math.max(0, days)} ngày`;
      }
  }

  return (
    <div 
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
        onClick={onClose}
    >
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
    </div>
  );
};

export default OrderDetailsModal;