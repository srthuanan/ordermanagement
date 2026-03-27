import React, { useState } from 'react';
import moment from 'moment';
import 'moment/locale/vi';
import { Order } from '../../types';
import StatusBadge from '../ui/StatusBadge';
import CarImage from '../ui/CarImage';
import { getExteriorColorStyle, getInteriorColorStyle } from '../../utils/styleUtils';
import Button from '../ui/Button';

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

const InfoItem: React.FC<{ icon?: string; label: string; value?: string | number; children?: React.ReactNode; valueClassName?: string; valueStyle?: React.CSSProperties; className?: string; onClick?: (e: React.MouseEvent) => void; hideIconOnMobile?: boolean }> = ({ icon, label, value, children, valueClassName = '', valueStyle, className = '', onClick, hideIconOnMobile }) => (
    <div className={`flex items-start gap-2 md:gap-3 ${className} ${onClick ? 'cursor-pointer hover:bg-slate-50/50 rounded-lg transition-colors' : ''}`} onClick={onClick}>
        {icon && (
            <div className={`flex-shrink-0 w-7 h-7 md:w-9 md:h-9 items-center justify-center rounded-lg bg-red-100 border border-red-200 ${hideIconOnMobile ? 'hidden md:flex' : 'flex'}`}>
                <i className={`fas ${icon} text-red-600 text-xs md:text-base`}></i>
            </div>
        )}
        <div className="flex-1 min-w-0">
            <p className="text-[10px] md:text-xs text-text-secondary">{label}</p>
            {value && <p style={valueStyle} className={`text-text-primary text-sm md:text-base font-bold break-words leading-tight ${valueClassName}`}>{value}</p>}
            {children}
        </div>
    </div>
);

const TimelineStep: React.FC<{ icon: string; label: string; value?: string; isLast?: boolean }> = ({ icon, label, value, isLast }) => (
    <div className="relative pl-0 md:pl-8 flex flex-row md:block items-center md:items-start gap-3 md:gap-0">
        <div className="relative md:absolute top-0 left-0 flex-shrink-0">
            <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-red-100 border border-red-200 flex items-center justify-center">
                <i className={`fas ${icon} text-red-600 text-[10px] md:text-xs`}></i>
            </div>
        </div>
        {!isLast && <div className="hidden md:block absolute top-7 left-[13px] h-full w-px bg-border-secondary"></div>}
        <div className="flex flex-col pb-0 md:pb-5">
            <p className="text-[10px] md:text-xs text-text-secondary">{label}</p>
            <p className="text-xs md:text-sm font-semibold text-text-primary break-words">{value || '—'}</p>
        </div>
    </div>
);

const VINDisplay: React.FC<{ vin: string }> = ({ vin }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
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
            className="relative p-2 md:p-4 rounded-xl md:rounded-2xl overflow-hidden cursor-pointer border border-amber-200/50 shadow-2xl shadow-amber-500/20 group transition-all duration-300 hover:shadow-amber-500/30 hover:scale-[1.02]"
            onClick={handleCopy}
            title="Click để sao chép VIN"
            style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 25%, #fcd34d 50%, #fbbf24 75%, #f59e0b 100%)'
            }}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/5 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none"></div>
            <div className="absolute top-2 left-4 w-1 h-1 bg-white/80 rounded-full animate-pulse"></div>
            <div className="absolute top-4 right-8 w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
            <div className="absolute bottom-3 left-12 w-1 h-1 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>

            <div className="relative z-10 text-center py-1">
                <p className="text-[9px] md:text-xs text-amber-900/80 uppercase tracking-[0.2em] font-extrabold mb-0.5 md:mb-1 drop-shadow-sm">Số Khung (VIN)</p>
                <p
                    className="tracking-[0.1em] text-sm md:text-2xl font-black drop-shadow-lg"
                    style={{
                        fontFamily: '"Orbitron", "Courier New", monospace',
                        background: 'linear-gradient(180deg, #1e293b 0%, #334155 50%, #475569 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    {vin}
                </p>
            </div>

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-300 ${isCopied ? 'bg-emerald-500/90 text-white shadow-lg shadow-emerald-500/50' : 'bg-white/90 text-amber-600 shadow-lg'}`}>
                    <i className={`fas ${isCopied ? 'fa-check' : 'fa-copy'} text-xs`}></i>
                </div>
            </div>
        </div>
    );
};

interface OrderDetailsModalProps {
    isOpen: boolean;
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

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, order: initialOrder, onClose, orderList, onNavigate, onCancel, onRequestInvoice, onSupplement, onRequestVC, onConfirmVC, onEdit }) => {
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    if (!isOpen || !initialOrder) return null;

    const order = orderList.find(o => o['Số đơn hàng'] === initialOrder['Số đơn hàng']) || initialOrder;
    const generalStatus = (order["Kết quả"] || "chưa ghép").toLowerCase().trim().normalize('NFC');
    const vcStatus = (order["Trạng thái VC"] || "").toLowerCase().trim().normalize('NFC');
    const statusText = order["Trạng thái VC"] || order["Kết quả"] || "Chưa ghép";
    const isCancelled = statusText.toLowerCase().includes('đã hủy') || statusText.toLowerCase().includes('từ chối');

    const canCancel = ['chưa ghép', 'đã ghép'].includes(generalStatus);
    const canRequestInvoice = generalStatus === 'đã ghép';
    const canAddSupplement = generalStatus === 'yêu cầu bổ sung';
    const canEdit = !!onEdit && ['chưa ghép', 'đã ghép'].includes(generalStatus);
    // Kiểm tra ngày xuất hóa đơn (phải <= 28/02/2026)
    const invoiceDateStr = order["Ngày xuất hóa đơn"];
    const isDateValidForVC = !invoiceDateStr || (() => {
        const formats = ["DD/MM/YYYY", moment.ISO_8601, "YYYY-MM-DD HH:mm:ss", "D/M/YYYY"];
        const date = moment(invoiceDateStr, formats, 'vi', true);
        const cutoffDate = moment("2026-02-28").endOf('day');
        return date.isValid() && date.isSameOrBefore(cutoffDate);
    })();

    const canRequestVC = (generalStatus === 'đã xuất hóa đơn') &&
        !['chờ duyệt vc', 'đã cấp vc', 'từ chối vc', 'yêu cầu vinclub', 'chờ duyệt ycvc', 'chờ xác thực vc (tvbh)', 'đã có vc', 'từ chối ycvc'].includes(vcStatus) &&
        isDateValidForVC;
    const canConfirmVC = (vcStatus || generalStatus) === 'chờ xác thực vc (tvbh)';
    const canDownloadInvoice = !!order.LinkHoaDonDaXuat;

    const currentIndex = orderList.findIndex(o => o['Số đơn hàng'] === order['Số đơn hàng']);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < orderList.length - 1;

    let daysSincePairedText = '—';
    if (order["Thời gian ghép"]) {
        const formats = [moment.ISO_8601, "DD/MM/YYYY HH:mm:ss", "D/M/YYYY H:m:s", "YYYY-MM-DD HH:mm:ss"];
        const pairingDate = moment(order["Thời gian ghép"], formats, 'vi', true);
        if (pairingDate.isValid()) {
            const today = moment().startOf('day');
            const pairingDay = pairingDate.startOf('day');
            const days = today.diff(pairingDay, 'days');
            daysSincePairedText = `${Math.max(0, days)} ngày`;
        }
    }

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
        if (distance > 50 && hasNext) onNavigate('next');
        else if (distance < -50 && hasPrev) onNavigate('prev');
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center animate-fade-in overflow-hidden" onClick={onClose}>
            {/* Full-Screen Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-blue-900/30 to-slate-800/40">
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-amber-500/15 to-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-gradient-to-tl from-blue-500/15 to-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20" />
            </div>

            {/* Floating Content Container */}
            <div
                className="relative z-10 w-full max-w-7xl mx-auto px-0 md:px-4 py-0 md:py-8 flex flex-col justify-end md:justify-center h-full md:h-auto md:min-h-[auto] pointer-events-none"
            >
                <div
                    className="flex flex-col w-full h-[95vh] md:h-[90vh] animate-slide-up-mobile md:animate-fade-in-scale-up pointer-events-auto bg-white md:bg-transparent rounded-t-3xl md:rounded-2xl overflow-hidden shadow-2xl border-t border-white/20 md:border-none detail-modal-content"
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    {/* Header */}
                    <header className="flex-shrink-0 mb-0 md:mb-4 bg-white md:bg-transparent z-20">
                        <div className="md:bg-gradient-to-r md:from-amber-50 md:via-white md:to-amber-50 rounded-none md:rounded-2xl p-3 md:p-5 border-b border-amber-200/30 shadow-sm relative overflow-hidden group">
                            <div className="hidden md:block absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none"></div>
                            {/* Drag handle for mobile */}
                            <div className="md:hidden w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-2 opacity-50"></div>
                            <div className="flex items-start md:items-center justify-between relative z-10">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 md:gap-3">
                                        <div className="w-1 md:w-1.5 h-6 md:h-8 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full shadow-sm"></div>
                                        <h2 className="text-lg md:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                                            CHI TIẾT <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-800">ĐƠN HÀNG</span>
                                        </h2>
                                    </div>
                                    <div
                                        className="flex items-center gap-2 pl-3 md:pl-5 opacity-80 cursor-pointer hover:opacity-100 transition-opacity"
                                        title="Click để sao chép Số đơn hàng"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(order["Số đơn hàng"]);
                                        }}
                                    >
                                        <i className="fas fa-hashtag text-[10px] text-amber-500"></i>
                                        <p className="text-xs md:text-sm font-mono text-slate-500 font-bold tracking-wider">{order["Số đơn hàng"]}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 md:gap-4">
                                    <div className="scale-90 origin-right md:scale-100">
                                        <StatusBadge status={statusText} />
                                    </div>
                                    <button onClick={onClose} className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-gray-100 md:bg-white/50 hover:bg-gray-200 md:hover:bg-white text-gray-500 md:text-gray-400 hover:text-gray-900 transition-all hover:rotate-90 shadow-sm border border-gray-100">
                                        <i className="fas fa-times text-sm md:text-xl"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 min-h-0 overflow-hidden relative bg-gray-50 md:bg-transparent">
                        <div className="h-full md:bg-white/95 md:backdrop-blur-3xl rounded-none md:rounded-2xl shadow-none md:shadow-2xl border-none md:border border-white/20 overflow-hidden flex flex-col relative">
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:128px_128px] pointer-events-none"></div>

                            {hasPrev && (
                                <button onClick={(e) => { e.stopPropagation(); onNavigate('prev'); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white backdrop-blur-sm text-slate-600 rounded-full flex items-center justify-center text-xl z-50 hidden md:flex shadow-lg hover:scale-110 active:scale-95 border border-white/50">
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                            )}
                            {hasNext && (
                                <button onClick={(e) => { e.stopPropagation(); onNavigate('next'); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white backdrop-blur-sm text-slate-600 rounded-full flex items-center justify-center text-xl z-50 hidden md:flex shadow-lg hover:scale-110 active:scale-95 border border-white/50">
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                            )}

                            <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden z-10 p-2 md:p-6 custom-scrollbar md:scrollbar-default space-y-3 md:space-y-0 flex flex-col">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-6 flex-1 min-h-0">
                                    {/* Column 1: Customer & Timeline */}
                                    <div className="md:col-span-1 flex flex-col gap-3 md:gap-6">
                                        {/* Customer Info */}
                                        <div className="bg-white md:bg-gray-50/50 p-3 md:p-5 rounded-xl md:rounded-2xl border border-gray-100 shadow-sm">
                                            <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:gap-6">
                                                <InfoItem icon="fa-user-circle" label="Khách hàng" value={order["Tên khách hàng"]} valueClassName="uppercase text-sm md:text-base text-slate-800" />
                                                <InfoItem icon="fa-user-tie" label="TVBH" value={order["Tên tư vấn bán hàng"]} valueClassName="text-sm md:text-base text-slate-800" />
                                            </div>
                                            <div className="border-t border-gray-100 mt-3 pt-3 md:pt-6 md:mt-6">
                                                <h4 className="font-bold text-amber-700 mb-2 md:mb-4 tracking-wide uppercase text-[10px] md:text-xs text-center md:text-left">Tiến độ đơn hàng</h4>

                                                {/* Mobile timeline: Horizontal-ish or 2x2 grid? Let's try 2-col grid for milestones on mobile */}
                                                <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-1">
                                                    <TimelineStep icon="fa-file-invoice-dollar" label="Ngày cọc" value={formatDateTime(order["Ngày cọc"])} />
                                                    <TimelineStep icon="fa-paper-plane" label="Yêu cầu" value={formatDateTime(order["Thời gian nhập"])} />
                                                    <TimelineStep icon="fa-link" label="Ghép VIN" value={formatDateTime(order["Thời gian ghép"])} />
                                                    <TimelineStep icon="fa-hourglass-half" label="Số ngày" value={daysSincePairedText} isLast />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2 & 3: Car Info & VIN */}
                                    <div className="md:col-span-2 flex flex-col gap-3 md:gap-6 flex-1 min-h-0">
                                        {isCancelled && order["Ghi chú hủy"] && (
                                            <div className="shrink-0 p-3 md:p-4 rounded-xl bg-red-50 border border-red-100 flex items-start">
                                                <i className="fas fa-exclamation-triangle text-red-500 text-lg md:text-xl mr-3 md:mr-4 mt-1"></i>
                                                <div>
                                                    <h3 className="font-bold text-red-700 text-sm md:text-base">Yêu cầu đã bị hủy</h3>
                                                    <p className="text-xs md:text-sm text-red-600 mt-1">Lý do: {order["Ghi chú hủy"]}</p>
                                                </div>
                                            </div>
                                        )}

                                        {order.VIN && <div className="shrink-0"><VINDisplay vin={order.VIN} /></div>}

                                        <div className="flex-1 bg-white md:bg-gray-50/50 p-3 md:p-5 rounded-xl md:rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                                            <div className="shrink-0 flex items-center justify-between mb-3 md:mb-4">
                                                <h3 className="font-bold text-sm md:text-base text-amber-700 tracking-wide uppercase">Thông Tin Xe</h3>
                                            </div>

                                            <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-8 items-stretch">
                                                <div className="flex-shrink-0 w-full md:w-3/5 flex items-center justify-center min-h-[110px] md:min-h-[200px] h-auto md:h-full rounded-xl p-1.5 md:p-4 bg-gradient-to-br from-gray-50 to-white border border-gray-100 shadow-inner hover:shadow-lg transition-all duration-300">
                                                    <CarImage model={order['Dòng xe']} exteriorColor={order['Ngoại thất']} className="w-full h-auto object-contain max-h-[130px] md:max-h-[250px] drop-shadow-2xl transform hover:scale-105 transition-transform duration-500" alt={order['Dòng xe']} />
                                                </div>

                                                <div className="flex-1 grid grid-cols-2 md:grid-cols-1 gap-x-4 gap-y-3 md:gap-y-0 md:justify-around text-xs md:text-base">
                                                    <div className="col-span-2 md:col-span-1 pb-1.5 md:pb-0 border-b border-gray-100 md:border-none">
                                                        <InfoItem icon="fa-car-side" label="Dòng xe" value={`${order["Dòng xe"]} - ${order["Phiên bản"]}`} valueClassName="text-base md:text-lg text-slate-800" />
                                                    </div>
                                                    <div className="pb-0 md:pb-0">
                                                        <InfoItem icon="fa-palette" hideIconOnMobile label="Màu ngoại" value={order["Ngoại thất"]} valueStyle={getExteriorColorStyle(order["Ngoại thất"])} valueClassName="font-bold text-sm md:text-base" />
                                                    </div>
                                                    <div className="pb-0 md:pb-0">
                                                        <InfoItem icon="fa-chair" hideIconOnMobile label="Màu nội" value={order["Nội thất"]} valueStyle={getInteriorColorStyle(order["Nội thất"])} valueClassName="font-bold text-sm md:text-base" />
                                                    </div>
                                                    <div className="pb-0 md:pb-0">
                                                        <InfoItem
                                                            icon="fa-cogs"
                                                            hideIconOnMobile
                                                            label="Số máy"
                                                            value={order["Số động cơ"] || '—'}
                                                            valueClassName="font-mono font-bold text-xs md:text-base text-slate-700"
                                                            onClick={(e) => {
                                                                if (order["Số động cơ"]) {
                                                                    e.stopPropagation();
                                                                    navigator.clipboard.writeText(order["Số động cơ"]);
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="pb-0 md:pb-0">
                                                        <InfoItem icon="fa-barcode" hideIconOnMobile label="Mã DMS" value={order["Mã DMS"] || '—'} valueClassName="font-mono font-bold text-sm md:text-base text-slate-700" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-amber-200/30 w-full"></div>

                            <footer className="shrink-0 p-3 md:p-4 border-t border-amber-200/30 bg-gradient-to-r from-amber-50/95 via-white/95 to-amber-50/95 backdrop-blur-xl flex flex-col-reverse md:flex-row items-center justify-between gap-3 md:gap-4 relative z-20 shadow-inner pb-safe md:pb-4">
                                <Button onClick={onClose} variant="secondary" size="sm" className="w-full md:w-auto">Đóng</Button>

                                <div className="grid grid-cols-2 gap-2 w-full md:flex md:w-auto md:flex-wrap md:justify-end md:gap-3">
                                    {/* Secondary Actions */}
                                    {canDownloadInvoice && <Button onClick={() => window.open(order.LinkHoaDonDaXuat, '_blank')} variant="secondary" size="sm" className="bg-blue-50 text-blue-600 hover:bg-blue-100" leftIcon={<i className="fas fa-download"></i>}>Hóa Đơn</Button>}
                                    {canEdit && <Button onClick={() => onEdit!(order)} variant="secondary" size="sm" className="bg-orange-50 text-orange-600 hover:bg-orange-100" leftIcon={<i className="fas fa-pencil-alt"></i>}>Sửa</Button>}
                                    {canCancel && <Button onClick={() => onCancel(order)} variant="danger" size="sm" leftIcon={<i className="fas fa-trash-alt"></i>}>Hủy</Button>}

                                    {/* Primary Actions */}
                                    {canRequestInvoice && <Button onClick={() => onRequestInvoice(order)} variant="primary" size="sm" leftIcon={<i className="fas fa-file-invoice-dollar"></i>}>Xuất HĐ</Button>}
                                    {canAddSupplement && <Button onClick={() => onSupplement(order)} variant="primary" size="sm" className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-none shadow-lg shadow-amber-500/30" leftIcon={<i className="fas fa-edit"></i>}>Bổ Sung</Button>}
                                    {canRequestVC && <Button onClick={() => onRequestVC(order)} variant="primary" size="sm" className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-none shadow-lg shadow-purple-500/30" leftIcon={<i className="fas fa-id-card"></i>}>Y/C VC</Button>}
                                    {canConfirmVC && <Button onClick={() => onConfirmVC(order)} variant="success" size="sm" leftIcon={<i className="fas fa-check"></i>}>Xác Thực</Button>}
                                </div>
                            </footer>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default React.memo(OrderDetailsModal);