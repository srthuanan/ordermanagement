import React, { useState } from 'react';
import moment from 'moment';
import 'moment/locale/vi';
import { Order } from '../../types';
import StatusBadge from '../ui/StatusBadge';
import CarImage from '../ui/CarImage';
import { getExteriorColorStyle, getInteriorColorStyle, useModalBackground } from '../../utils/styleUtils';

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
    return date.isValid() ? date.format('HH:mm DD/MM/YYYY') : '—';
};

const InfoItem: React.FC<{ icon: string; label: string; value?: string | number; children?: React.ReactNode; valueClassName?: string; valueStyle?: React.CSSProperties }> = ({ icon, label, value, children, valueClassName = '', valueStyle }) => (
    <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-surface-accent">
            <i className={`fas ${icon} text-accent-primary text-lg`}></i>
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs text-text-secondary">{label}</p>
            {value && <p style={valueStyle} className={`text-text-primary font-bold break-words ${valueClassName}`}>{value}</p>}
            {children}
        </div>
    </div>
);

const TimelineStep: React.FC<{ icon: string; label: string; value?: string; isLast?: boolean }> = ({ icon, label, value, isLast }) => (
    <div className="relative pl-10">
        <div className="absolute top-0 left-0 flex items-center">
            <div className="w-8 h-8 rounded-full bg-surface-accent flex items-center justify-center">
                <i className={`fas ${icon} text-accent-primary`}></i>
            </div>
        </div>
        {!isLast && <div className="absolute top-8 left-[15px] h-full w-px bg-border-secondary"></div>}
        <div className="flex flex-col pb-8">
            <p className="text-xs text-text-secondary">{label}</p>
            <p className="text-sm font-semibold text-text-primary">{value || '—'}</p>
        </div>
    </div>
);


const VINDisplay: React.FC<{ vin: string }> = ({ vin }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Sử dụng document.execCommand để tương thích tốt hơn trong iframe
        const el = document.createElement('textarea');
        el.value = vin;
        document.body.appendChild(el);
        el.select();
        try {
            document.execCommand('copy');
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Không thể sao chép VIN:', err);
        }
        document.body.removeChild(el);
    };

    return (
        <div
            className="relative p-4 rounded-xl bg-gradient-to-br from-[#CBBACC] to-[#2580B3] shadow-lg group overflow-hidden cursor-pointer"
            onClick={handleCopy}
            title="Click để sao chép VIN"
        >
            {/* Shimmer effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none"></div>

            <div className="relative z-10 text-center">
                <p className="text-xs text-blue-200 uppercase tracking-widest">Số Khung (VIN)</p>
                <p className="text-white font-mono tracking-wider text-2xl break-all text-shadow-md font-bold">{vin}</p>
            </div>

            <button
                onClick={handleCopy}
                className="absolute top-3 right-3 w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-blue-200 hover:bg-white/20 hover:text-white transition-all duration-200 z-20"
                title="Sao chép VIN"
            >
                <i className={`fas transition-all ${isCopied ? 'fa-check-circle text-green-400' : 'fa-copy'}`}></i>
            </button>
        </div>
    );
};


interface OrderDetailsModalProps {
    order: Order | null;
    onClose: () => void;
    orderList: Order[];
    onNavigate: (direction: 'prev' | 'next') => void;
    onCancel: (order: Order) => void;
    onRequestInvoice: (order: Order) => void;
    onSupplement: (order: Order) => void;
    onRequestVC: (order: Order) => void;
    onConfirmVC: (order: Order) => void;
    onEdit?: (order: Order) => void;
}
const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose, orderList, onNavigate, onCancel, onRequestInvoice, onSupplement, onRequestVC, onConfirmVC, onEdit }) => {
    const bgStyle = useModalBackground();

    // Swipe Navigation Logic - Must be before early return
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    if (!order) return null;

    const generalStatus = (order["Kết quả"] || "chưa ghép").toLowerCase().trim().normalize('NFC');
    const vcStatus = (order["Trạng thái VC"] || "").toLowerCase().trim().normalize('NFC');
    const status = vcStatus || generalStatus;

    const canCancel = ['chưa ghép', 'chờ ghép (bulk)', 'đã ghép', 'chờ phê duyệt', 'yêu cầu bổ sung'].includes(generalStatus);
    const canRequestInvoice = generalStatus === 'đã ghép';
    const canAddSupplement = generalStatus === 'yêu cầu bổ sung';
    const canEdit = !!onEdit && !['đã xuất hóa đơn', 'đã hủy', 'chờ ký hóa đơn'].includes(generalStatus);
    const canRequestVC = (generalStatus === 'đã xuất hóa đơn' || vcStatus === 'từ chối ycvc') && !['yêu cầu vinclub', 'chờ duyệt ycvc', 'chờ xác thực vc (tvbh)', 'đã có vc'].includes(vcStatus);
    const canConfirmVC = status === 'chờ xác thực vc (tvbh)';
    const canDownloadInvoice = !!order.LinkHoaDonDaXuat;

    const handleAction = (action: (order: Order) => void) => {
        action(order);
        onClose(); // Close the detail modal after initiating an action
    };

    const statusText = order["Trạng thái VC"] || order["Kết quả"] || "Chưa ghép";
    const isCancelled = statusText.toLowerCase().includes('đã hủy') || statusText.toLowerCase().includes('từ chối');

    const currentIndex = orderList.findIndex(o => o['Số đơn hàng'] === order['Số đơn hàng']);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < orderList.length - 1;

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
            const today = moment().startOf('day');
            const pairingDay = pairingDate.startOf('day');
            const days = today.diff(pairingDay, 'days');
            daysSincePairedText = `${Math.max(0, days)} ngày`;
        }
    }

    // --- NEUMORPHIC BUTTON STYLES ---
    const btnBase = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 ease-in-out bg-surface-ground";
    const btnEffect = "shadow-[4px_4px_8px_#d1d9e6,-4px_-4px_8px_#ffffff] hover:shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] hover:-translate-y-px active:shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] active:translate-y-0.5";

    const btnClose = `${btnBase} ${btnEffect} text-text-secondary hover:text-text-primary`;
    const btnEdit = `${btnBase} ${btnEffect} text-blue-700 hover:text-blue-800`;
    const btnCancel = `${btnBase} ${btnEffect} text-red-700 hover:text-red-800`;
    const btnPrimary = `${btnBase} ${btnEffect} text-accent-primary hover:text-accent-primary-hover font-bold`;
    const btnDownload = `${btnBase} ${btnEffect} text-gray-700 hover:text-gray-800`;

    // Swipe Navigation Logic
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && hasNext) {
            onNavigate('next');
        } else if (isRightSwipe && hasPrev) {
            onNavigate('prev');
        }
    };

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
                className="bg-surface-ground w-full max-w-4xl max-h-[95vh] flex flex-col rounded-2xl shadow-2xl animate-fade-in-scale-up"
                onClick={(e) => e.stopPropagation()}
                style={bgStyle}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <header className="flex-shrink-0 flex items-start justify-between p-5 border-b border-border-primary">
                    <div>
                        <h2 className="text-xl font-bold text-gradient">Chi Tiết Yêu Cầu</h2>
                        <p className="text-sm text-text-secondary mt-1 font-mono">
                            {order["Số đơn hàng"]}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <StatusBadge status={statusText} />
                        <button
                            onClick={onClose}
                            className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                            aria-label="Đóng"
                        >
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </header>

                <main className="overflow-y-auto flex-grow p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="md:col-span-1 bg-surface-card p-5 rounded-lg border border-border-primary shadow-sm flex flex-col gap-6">
                        <div className="space-y-4">
                            <InfoItem icon="fa-user-circle" label="Tên khách hàng" value={order["Tên khách hàng"]} valueClassName="uppercase" />
                            <InfoItem icon="fa-user-tie" label="Tư vấn bán hàng" value={order["Tên tư vấn bán hàng"]} />
                        </div>
                        <div className="border-t border-border-primary pt-6">
                            <h4 className="font-semibold text-text-primary mb-4">Mốc Thời Gian</h4>
                            <div className="flex flex-col">
                                <TimelineStep icon="fa-file-invoice-dollar" label="Ngày cọc" value={formatDateTime(order["Ngày cọc"])} />
                                <TimelineStep icon="fa-paper-plane" label="Ngày yêu cầu" value={formatDateTime(order["Thời gian nhập"])} />
                                <TimelineStep icon="fa-link" label="Ngày ghép VIN" value={formatDateTime(order["Thời gian ghép"])} />
                                <TimelineStep icon="fa-hourglass-half" label="Số ngày đã ghép" value={daysSincePairedText} isLast />
                            </div>
                        </div>
                    </div>
                    {/* Right Column */}
                    <div className="md:col-span-2 space-y-6">
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
                        <div className="bg-surface-card p-5 rounded-lg border border-border-primary shadow-sm">
                            <h3 className="font-bold text-lg text-text-primary mb-4">Thông Tin Xe</h3>
                            <div className="flex items-center justify-center h-48 mb-4 rounded-lg p-2">
                                <CarImage
                                    model={order['Dòng xe']}
                                    exteriorColor={order['Ngoại thất']}
                                    className="h-full w-auto object-contain"
                                    alt={order['Dòng xe']}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InfoItem icon="fa-car-side" label="Dòng xe & Phiên bản" value={`${order["Dòng xe"]} - ${order["Phiên bản"]}`} />
                                <InfoItem icon="fa-palette" label="Ngoại thất" value={order["Ngoại thất"]} valueStyle={getExteriorColorStyle(order["Ngoại thất"])} />
                                <InfoItem icon="fa-chair" label="Nội thất" value={order["Nội thất"]} valueStyle={getInteriorColorStyle(order["Nội thất"])} />
                            </div>
                        </div>
                    </div>
                </main>

                <footer className="flex-shrink-0 flex items-center justify-end flex-wrap gap-4 p-5 border-t border-border-primary bg-surface-ground rounded-b-2xl">
                    <button onClick={onClose} className={btnClose}>Đóng</button>
                    {canDownloadInvoice && (
                        <a href={order.LinkHoaDonDaXuat} target="_blank" rel="noopener noreferrer" className={btnDownload}><i className="fas fa-download"></i>Tải Hóa Đơn</a>
                    )}
                    {canEdit && (<button onClick={() => handleAction(onEdit!)} className={btnEdit}><i className="fas fa-pencil-alt"></i>Chỉnh Sửa</button>)}
                    {canCancel && (<button onClick={() => handleAction(onCancel)} className={btnCancel}><i className="fas fa-trash-alt"></i>Hủy Yêu Cầu</button>)}
                    {canRequestInvoice && (<button onClick={() => handleAction(onRequestInvoice)} className={btnPrimary}><i className="fas fa-file-invoice-dollar"></i>Y/C Xuất Hóa Đơn</button>)}
                    {canAddSupplement && (<button onClick={() => handleAction(onSupplement)} className={btnPrimary}><i className="fas fa-edit"></i>Bổ Sung File</button>)}
                    {canRequestVC && (<button onClick={() => handleAction(onRequestVC)} className={btnPrimary}><i className="fas fa-id-card"></i>Y/C Cấp VC</button>)}
                    {canConfirmVC && (<button onClick={() => handleAction(onConfirmVC)} className={btnPrimary}><i className="fas fa-check"></i>Xác Thực UNC VC</button>)}
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