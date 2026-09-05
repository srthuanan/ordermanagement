import React, { useState } from 'react';
import { Order } from '../../types';
import { getBackgroundColorStyle, getExteriorColorStyle, getInteriorColorStyle } from '../../utils/styleUtils';
import CarImage from './CarImage';
import StatusBadge from './StatusBadge';
import FilePreviewModal from '../modals/FilePreviewModal';
import moment from 'moment';
import MarqueeText from './MarqueeText';

const formatDateTime = (dateString?: string): string | null => {
    if (!dateString || dateString === '—' || dateString === 'N/A' || dateString === 'null') return null;
    const formats = [
        moment.ISO_8601,
        "DD/MM/YYYY HH:mm:ss",
        "D/M/YYYY H:m:s",
        "YYYY-MM-DD HH:mm:ss",
        "DD/MM/YYYY",
        "YYYY-MM-DD"
    ];
    const date = moment(dateString, formats, 'vi', true);
    if (!date.isValid()) return null;
    return date.format('DD/MM/YYYY');
};

const DetailRow: React.FC<{ icon: string, label: string; value?: string | number; copyable?: boolean; isMono?: boolean }> = ({ icon, label, value, copyable, isMono }) => {
    const [copied, setCopied] = useState(false);

    // Hide row completely if value is empty, missing, or placeholder dash
    if (!value || String(value).trim() === '' || String(value).trim() === '—' || String(value).trim() === 'N/A' || String(value).trim() === 'null') {
        return null;
    }

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(String(value)).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {});
    };

    return (
        <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50/70 px-2 rounded-lg transition-colors">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <i className={`fas ${icon} text-xs`}></i>
                </div>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider truncate">{label}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
                <span className={`text-xs font-bold text-slate-800 text-right truncate ${isMono ? 'font-mono' : ''}`}>
                    {value}
                </span>
                {copyable && (
                    <button 
                        onClick={handleCopy}
                        className={`p-1 rounded text-[10px] transition-all ${copied ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                        title="Sao chép"
                    >
                        <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                    </button>
                )}
            </div>
        </div>
    );
};

interface FileCardProps {
    title: string;
    description: string;
    url?: string;
    icon: string;
    iconBgColor: string;
    iconTextColor: string;
    onView: (url: string, title: string) => void;
}

const FileCard: React.FC<FileCardProps> = ({ title, description, url, icon, iconBgColor, iconTextColor, onView }) => {
    const hasUrl = !!url && url.trim() !== '' && url !== 'null' && url !== 'undefined' && url !== '—';

    // Hide FileCard completely if file URL does not exist
    if (!hasUrl) return null;

    return (
        <div className="p-3 rounded-xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl ${iconBgColor} ${iconTextColor} flex items-center justify-center shrink-0 shadow-sm`}>
                        <i className={`fas ${icon} text-sm`}></i>
                    </div>
                    <div className="min-w-0">
                        <h5 className="text-xs font-bold text-slate-800 truncate">{title}</h5>
                        <p className="text-[10px] text-slate-500 truncate">{description}</p>
                    </div>
                </div>

                <div className="shrink-0">
                    <button
                        onClick={() => onView(url!, title)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm group"
                    >
                        <span>Xem File</span>
                        <i className="fas fa-eye text-[10px] group-hover:scale-110 transition-transform"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

interface SoldCarDetailPanelProps {
    order: Order | null;
    showOrderInAdmin?: (order: Order, targetTab: any) => void;
    showAdminTab?: (targetTab: any) => void;
    isAdmin?: boolean;
}

const SoldCarDetailPanel: React.FC<SoldCarDetailPanelProps> = ({ order }) => {
    const [copiedVin, setCopiedVin] = useState(false);
    const [previewFile, setPreviewFile] = useState<{ url: string; label: string } | null>(null);

    if (!order) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200 m-3 animate-fade-in">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-4 shadow-inner">
                    <i className="fas fa-hand-pointer text-2xl"></i>
                </div>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Chọn Đơn Hàng</p>
                <p className="text-slate-400 text-xs mt-1 text-center">Vui lòng chọn 1 đơn hàng từ danh sách bên trái để xem đầy đủ thông tin</p>
            </div>
        );
    }

    const handleCopyVin = () => {
        if (!order.VIN) return;
        navigator.clipboard.writeText(order.VIN).then(() => {
            setCopiedVin(true);
            setTimeout(() => setCopiedVin(false), 2000);
        }).catch(() => {});
    };

    const handleViewFile = (url: string, label: string) => {
        setPreviewFile({ url, label });
    };

    // Extract all potential file links from order
    const linkHopDong = order.LinkHopDong || order.url_hop_dong || order.link_hop_dong || order['URL Hợp đồng'] || order['URL Hợp Đồng'];
    const linkDeNghiXHD = order.LinkDeNghiXHD || order.url_de_nghi_xhd || order.link_de_nghi_xhd || order['URL Đề nghị XHĐ'];
    const linkHoaDonRed = order.LinkHoaDonDaXuat || order.link_hoa_don_da_xuat || order.url_hoa_don_da_xuat || order['Link hóa đơn'] || order['Link Hóa Đơn'];
    const linkCCCD = order.LinkCCCD || order.url_cccd || order.link_cccd || order['Link CCCD'];
    const linkTBTV = order.LinkTBTV || order.url_tbtv || order.link_tbtv || order['Link TBTV'];
    const linkGNT = order.LinkGNT || order.url_gnt || order.link_gnt || order['Link GNT'];

    // Additional uploaded files list (if any)
    let extraFiles: { name: string; url: string }[] = [];
    const fileUrlsRaw = order.FileUrls || order.file_urls || order.tep_dinh_kem;
    if (fileUrlsRaw) {
        try {
            if (typeof fileUrlsRaw === 'string') {
                if (fileUrlsRaw.startsWith('[')) {
                    extraFiles = JSON.parse(fileUrlsRaw);
                } else if (fileUrlsRaw.startsWith('http')) {
                    extraFiles = [{ name: 'Tập tin bổ sung', url: fileUrlsRaw }];
                }
            } else if (Array.isArray(fileUrlsRaw)) {
                extraFiles = fileUrlsRaw.map((item, idx) => typeof item === 'string' ? { name: `File đính kèm ${idx + 1}`, url: item } : item);
            }
        } catch (e) {
            console.warn('Failed to parse extra file URLs', e);
        }
    }

    const availableFiles = [
        { title: "Hóa Đơn Red (VAT)", description: "File hóa đơn điện tử VAT đã xuất", url: linkHoaDonRed, icon: "fa-file-invoice-dollar", iconBgColor: "bg-emerald-100", iconTextColor: "text-emerald-600" },
        { title: "Hợp Đồng Mua Bán (HĐMB)", description: "Hợp đồng kinh tế / HĐMB xe ký kết", url: linkHopDong, icon: "fa-file-contract", iconBgColor: "bg-blue-100", iconTextColor: "text-blue-600" },
        { title: "Đề Nghị Xuất Hóa Đơn (ĐNXHĐ)", description: "Phiếu yêu cầu / đề nghị xuất hóa đơn", url: linkDeNghiXHD, icon: "fa-file-invoice", iconBgColor: "bg-amber-100", iconTextColor: "text-amber-600" },
        { title: "Tài Liệu CCCD / Hộ Chiếu", description: "Giấy tờ định danh chủ xe", url: linkCCCD, icon: "fa-id-card", iconBgColor: "bg-purple-100", iconTextColor: "text-purple-600" },
        { title: "Thông Báo Cho Vay (TBTV)", description: "Thông báo chấp thuận cấp tín dụng ngân hàng", url: linkTBTV, icon: "fa-building-columns", iconBgColor: "bg-indigo-100", iconTextColor: "text-indigo-600" },
        { title: "Giấy Nộp Tiền (GNT)", description: "Chứng từ thanh toán / nộp tiền đặt cọc", url: linkGNT, icon: "fa-receipt", iconBgColor: "bg-rose-100", iconTextColor: "text-rose-600" },
    ].filter(f => !!f.url && f.url.trim() !== '' && f.url !== 'null' && f.url !== 'undefined' && f.url !== '—');

    const totalFileCount = availableFiles.length + extraFiles.length;

    const policies = order["CHÍNH SÁCH"] ? String(order["CHÍNH SÁCH"]).split('; ') : [];
    const statusText = order["Kết quả"] || "Đã xuất hóa đơn";

    const dateCoc = formatDateTime(order["Ngày cọc"]);
    const dateGhep = formatDateTime(order["Thời gian ghép"]);
    const dateXHD = formatDateTime(order["Ngày xuất hóa đơn"]);

    const hasTransactionInfo = !!(order["SĐT"] || order["CCCD"] || order["Địa chỉ"] || dateCoc || dateGhep || dateXHD || policies.length > 0);

    return (
        <div className="p-4 flex flex-col h-full space-y-4 animate-fade-in overflow-y-auto custom-scrollbar relative">
            {/* 1. Header & Quick Overview */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 rounded-2xl text-white shadow-lg relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none"></div>
                <div className="flex items-start justify-between gap-3 mb-2 relative z-10">
                    <div className="min-w-0 flex-1 overflow-hidden">
                        <MarqueeText
                            text={order["Tên khách hàng"] || '—'}
                            className="text-lg font-black tracking-tight text-white mb-0.5"
                        />
                        <p className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                            Đơn hàng #{order["Số đơn hàng"]}
                        </p>
                    </div>
                    <StatusBadge status={statusText} />
                </div>

                {/* VIN Box inside Header */}
                {order.VIN && order.VIN !== '—' && (
                    <div 
                        onClick={handleCopyVin}
                        className="mt-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-all group backdrop-blur-sm"
                        title="Click để sao chép VIN"
                    >
                        <div>
                            <p className="text-[9px] uppercase tracking-widest text-sky-300 font-bold">Số Khung (VIN)</p>
                            <p 
                                className="text-base font-extrabold tracking-wider transition-colors"
                                style={{
                                    fontFamily: "'Barlow Condensed', 'Rajdhani', 'Bahnschrift', sans-serif",
                                    background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 45%, #ffffff 50%, #64748b 55%, #cbd5e1 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}
                            >
                                {order.VIN}
                            </p>
                        </div>
                        <div className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${copiedVin ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white group-hover:bg-white/30'}`}>
                            <i className={`fas ${copiedVin ? 'fa-check' : 'fa-copy'} text-[10px]`}></i>
                            <span>{copiedVin ? 'Đã copy' : 'Copy'}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Vehicle Image & Specifications Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1.5">
                        <i className="fas fa-car text-blue-500"></i> Thông Tin Phương Tiện
                    </span>
                    <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {order["Dòng xe"]} {order["Phiên bản"]}
                    </span>
                </div>

                {/* Car Preview Image */}
                <div className="w-full h-32 rounded-xl bg-gradient-to-b from-slate-50 to-slate-100/60 border border-slate-100 flex items-center justify-center p-2 relative overflow-hidden group">
                    <CarImage 
                        model={order["Dòng xe"]} 
                        exteriorColor={order["Ngoại thất"]} 
                        version={order["Phiên bản"]}
                        className="w-full h-full object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-500" 
                        alt={order["Dòng xe"]}
                    />
                </div>

                {/* Exterior & Interior Swatches */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-4 h-4 rounded-full border border-black/20 shadow-sm shrink-0" style={getBackgroundColorStyle(order["Ngoại thất"])}></div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Ngoại thất</span>
                        </div>
                        <p className="text-xs font-bold truncate" style={getExteriorColorStyle(order["Ngoại thất"])}>{order["Ngoại thất"] || '—'}</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-4 h-4 rounded-full border border-black/20 shadow-sm shrink-0" style={getBackgroundColorStyle(order["Nội thất"])}></div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Nội thất</span>
                        </div>
                        <p className="text-xs font-bold truncate" style={getInteriorColorStyle(order["Nội thất"])}>{order["Nội thất"] || '—'}</p>
                    </div>
                </div>

                <DetailRow icon="fa-cogs" label="Số máy" value={order["Số máy"]} copyable isMono />
                <DetailRow icon="fa-barcode" label="Mã DMS" value={order["Mã DMS"]} copyable isMono />
                <DetailRow icon="fa-user-tie" label="TVBH Phụ Trách" value={order["Tên tư vấn bán hàng"]} />
            </div>

            {/* 3. Customer & Transaction Details (Rendered ONLY if at least 1 field exists) */}
            {hasTransactionInfo && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-2 shrink-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1.5 mb-2">
                        <i className="fas fa-user-circle text-amber-500"></i> Thông Tin Giao Dịch
                    </span>

                    {order["SĐT"] && <DetailRow icon="fa-phone" label="Số điện thoại" value={order["SĐT"]} copyable />}
                    {order["CCCD"] && <DetailRow icon="fa-id-card" label="CCCD / CMND" value={order["CCCD"]} copyable isMono />}
                    {order["Địa chỉ"] && <DetailRow icon="fa-map-marker-alt" label="Địa chỉ KH" value={order["Địa chỉ"]} />}
                    {dateCoc && <DetailRow icon="fa-calendar-alt" label="Ngày Cọc" value={dateCoc} />}
                    {dateGhep && <DetailRow icon="fa-link" label="Ngày Ghép VIN" value={dateGhep} />}
                    {dateXHD && <DetailRow icon="fa-file-invoice-dollar" label="Ngày Xuất HĐ" value={dateXHD} />}

                    {policies.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider flex items-center gap-1 mb-2">
                                <i className="fas fa-award"></i> Chính sách áp dụng
                            </span>
                            <div className="space-y-1.5">
                                {policies.map((p, i) => (
                                    <div key={i} className="flex items-start gap-2 bg-amber-50/80 border border-amber-100/80 p-2 rounded-lg text-xs font-bold text-slate-800">
                                        <i className="fas fa-check-circle text-amber-500 text-xs mt-0.5 shrink-0"></i>
                                        <span>{p}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 4. ATTACHED FILES & DOCUMENTS SECTION (Rendered ONLY if at least 1 file exists!) 🔥 */}
            {totalFileCount > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3 shrink-0">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1.5">
                            <i className="fas fa-folder-open text-purple-500"></i> Tập Tin & Hồ Sơ Đơn Hàng
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {totalFileCount} Tệp
                        </span>
                    </div>

                    <div className="space-y-2">
                        {availableFiles.map((file, idx) => (
                            <FileCard
                                key={idx}
                                title={file.title}
                                description={file.description}
                                url={file.url}
                                icon={file.icon}
                                iconBgColor={file.iconBgColor}
                                iconTextColor={file.iconTextColor}
                                onView={handleViewFile}
                            />
                        ))}

                        {/* Extra files if any */}
                        {extraFiles.map((file, i) => (
                            <FileCard
                                key={i}
                                title={file.name || `Tập tin bổ sung #${i + 1}`}
                                description="Tệp tin đính kèm phụ trợ"
                                url={file.url}
                                icon="fa-paperclip"
                                iconBgColor="bg-teal-100"
                                iconTextColor="text-teal-600"
                                onView={handleViewFile}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 5. Notes & Cancel Remarks */}
            {(order["Ghi chú"] || order["Ghi chú hủy"]) && (
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 space-y-1 shrink-0">
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                        <i className="fas fa-sticky-note"></i> Ghi Chú Đơn Hàng
                    </span>
                    <p className="text-xs font-semibold text-amber-900 leading-relaxed">
                        {order["Ghi chú hủy"] || order["Ghi chú"]}
                    </p>
                </div>
            )}

            {/* In-app File Preview Modal */}
            <FilePreviewModal
                isOpen={!!previewFile}
                onClose={() => setPreviewFile(null)}
                fileUrl={previewFile?.url || ''}
                fileLabel={previewFile?.label || ''}
            />
        </div>
    );
};

export default SoldCarDetailPanel;