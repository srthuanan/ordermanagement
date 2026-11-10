import React, { useState, useRef, useLayoutEffect } from 'react';
import { Order } from '../../types';

import CarImage from './CarImage';

import FilePreviewModal from '../modals/FilePreviewModal';
import moment from 'moment';


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
        <div className="sold-detail-row flex items-center justify-between py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50/70 px-2 rounded-lg transition-colors">
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
        <div className="sold-file-card p-3 rounded-xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200">
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
                        aria-label={`Xem ${title}`}
                        title={title}
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
    mobileMode?: boolean;
}

const SoldCarDetailPanel: React.FC<SoldCarDetailPanelProps> = ({ order, mobileMode = false }) => {
    const [copiedVin, setCopiedVin] = useState(false);
    const [previewFile, setPreviewFile] = useState<{ url: string; label: string } | null>(null);
    const fitViewportRef = useRef<HTMLDivElement>(null);
    const fitContentRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (mobileMode || !order) return;
        const viewport = fitViewportRef.current;
        const content = fitContentRef.current;
        if (!viewport || !content) return;
        const fit = () => {
            const height = viewport.clientHeight;
            if (!height || !viewport.clientWidth) return;
            content.style.setProperty('zoom', '1');
            content.style.width = '100%';
            content.style.height = height + 'px';
            // Reduce image height and whitespace before scaling any text.
            for (let density = 0; density <= 2; density++) {
                content.dataset.density = String(density);
                if (content.scrollHeight <= height + 1) return;
            }
            // Reflow at the wider logical width so every field stays visible.
            let scale = 1;
            for (let pass = 0; pass < 12; pass++) {
                const measured = content.scrollHeight * scale;
                if (measured <= height + 1) break;
                scale *= Math.min(0.98, height / measured);
                content.style.setProperty('zoom', String(scale));
                content.style.width = (100 / scale) + '%';
                content.style.height = (height / scale) + 'px';
            }
        };
        let frame = 0;
        let active = true;
        const schedule = () => {
            if (!active) return;
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(fit);
        };
        fit();
        const observer = new ResizeObserver(schedule);
        observer.observe(viewport);
        document.fonts?.ready.then(schedule);
        return () => {
            active = false;
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, [order, mobileMode]);

    if (!order) {
        if (!mobileMode) return <div className="sold-detail-empty"><i className="fas fa-receipt" /><h2>Chọn một đơn hàng</h2><p>Xem thông tin xe, giao dịch và hồ sơ đã bán.</p></div>;
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

    const policies = order["CHÍNH SÁCH"]
        ? String(order["CHÍNH SÁCH"])
            .split(/;\s*|\r?\n+|,\s*(?=(?:chương trình|chính sách|csbh|cọc sỉ|vinclub|ưu đãi|khuyến mãi)\b)/i)
            .map(policy => policy.trim())
            .filter(Boolean)
        : [];
    const statusText = order["Kết quả"] || "Đã xuất hóa đơn";

    const dateCoc = formatDateTime(order["Ngày cọc"]);
    const dateGhep = formatDateTime(order["Thời gian ghép"]);
    const dateXHD = formatDateTime(order["Ngày xuất hóa đơn"]);

    const hasTransactionInfo = !!(order["SĐT"] || order["CCCD"] || order["Địa chỉ"] || dateCoc || dateGhep || dateXHD || policies.length > 0);

    if (mobileMode) {
        const compactFiles = [
            ...availableFiles.map(file => ({ name: file.title, url: file.url, icon: file.icon, iconBgColor: file.iconBgColor, iconTextColor: file.iconTextColor })),
            ...extraFiles.map((file, index) => ({ name: file.name || `Tệp ${index + 1}`, url: file.url, icon: 'fa-paperclip', iconBgColor: 'bg-slate-100', iconTextColor: 'text-slate-600' }))
        ];
        const compactValue = (value: unknown) => {
            if (value === null || value === undefined) return null;
            const text = String(value).trim();
            if (!text || text === '—' || text.toLowerCase() === 'null' || text.toLowerCase() === 'n/a') return null;
            return text;
        };
        const detailItem = (label: string, value: unknown, mono = false) => {
            const text = compactValue(value);
            if (!text) return null;
            return (
                <div className="min-w-0">
                    <p className="text-[7px] font-semibold uppercase leading-none tracking-wide text-slate-400">{label}</p>
                    <p title={text} className={`mt-1 truncate text-[9.5px] font-semibold leading-none text-slate-800 ${mono ? 'font-mono' : ''}`}>{text}</p>
                </div>
            );
        };
        const hasCompactTransactionInfo = hasTransactionInfo || !!(
            order.so_ct_dnx || order['Số CT DNX'] || order['Ghi chú'] || order['Ghi chú hủy']
        );
        const transactionFacts = [
            { label: 'Điện thoại', value: order['SĐT'], mono: true },
            { label: 'CCCD / CMND', value: order['CCCD'], mono: true },
            { label: 'Ngày cọc', value: dateCoc },
            { label: 'Ngày ghép VIN', value: dateGhep },
            { label: 'Ngày xuất HĐ', value: dateXHD },
            { label: 'Số CT DNX', value: order.so_ct_dnx || order['Số CT DNX'], mono: true }
        ].filter(item => compactValue(item.value));

        return (
            <div className="space-y-2 bg-[#f2f2f7] p-2 pb-[max(8px,env(safe-area-inset-bottom))] text-slate-900">
                <section className="overflow-hidden rounded-[22px] border border-white bg-white shadow-[0_4px_18px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/80">
                    <div className="flex items-start justify-between gap-3 px-3 pb-1 pt-3">
                        <div className="min-w-0">
                            <p className="truncate text-[14px] font-bold uppercase tracking-tight">{order['Tên khách hàng'] || 'Chưa cập nhật'}</p>
                            <p className="mt-0.5 truncate font-mono text-[8px] text-slate-400">#{order['Số đơn hàng'] || '—'}</p>
                        </div>
                        <span className="relative inline-flex h-[19px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-white via-emerald-100 to-cyan-100 px-2.5 text-[9px] font-extrabold text-emerald-950 shadow-[0_2px_8px_rgba(52,211,153,0.22)] ring-1 ring-emerald-200/80">Hóa đơn</span>
                    </div>

                    <div className="relative h-[112px] overflow-hidden bg-gradient-to-b from-white via-slate-50 to-blue-50/70">
                        <div className="absolute inset-y-0 right-3 flex w-[58%] items-center justify-center">
                            <CarImage model={order['Dòng xe']} exteriorColor={order['Ngoại thất']} version={order['Phiên bản']} className="h-[104px] w-full object-contain drop-shadow-lg" alt={order['Dòng xe']} />
                        </div>
                        <div className="absolute inset-y-0 left-3 flex w-[42%] flex-col justify-center pr-2">
                            <p className="text-[15px] font-bold leading-tight text-slate-900">{order['Dòng xe']}</p>
                            <p className="mt-0.5 text-[10px] font-medium text-slate-500">{order['Phiên bản']}</p>
                            <div className="mt-3 space-y-1">
                                <p className="truncate text-[8px] text-slate-500"><span className="mr-1 text-[7px] font-semibold uppercase text-slate-400">Ngoại thất</span>{order['Ngoại thất']}</p>
                                <p className="truncate text-[8px] text-slate-500"><span className="mr-1 text-[7px] font-semibold uppercase text-slate-400">Nội thất</span>{order['Nội thất']}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 px-3 py-2">
                        {detailItem('Số máy', order['Số máy'], true)}
                        <div className="pl-3">{detailItem('Mã DMS', order['Mã DMS'], true)}</div>
                    </div>

                    {order.VIN && (
                        <button type="button" onClick={handleCopyVin} className="mx-2 mb-2 flex h-10 w-[calc(100%-16px)] items-center justify-between rounded-[12px] bg-slate-900 px-3 text-left text-white shadow-sm active:scale-[0.99]">
                            <span className="min-w-0"><span className="block text-[7px] font-semibold uppercase tracking-wider text-cyan-300">Số khung VIN</span><strong className="block truncate font-mono text-[10px] tracking-wide">{order.VIN}</strong></span>
                            <i className={`fas ${copiedVin ? 'fa-check text-emerald-300' : 'fa-copy text-slate-300'} text-[11px]`} />
                        </button>
                    )}
                    {compactValue(order['Tên tư vấn bán hàng']) && (
                        <div className="flex items-center justify-between px-3 pb-2.5"><span className="text-[8px] font-semibold uppercase text-slate-400">Tư vấn phụ trách</span><strong className="truncate pl-3 text-[9.5px] text-slate-700">{order['Tên tư vấn bán hàng']}</strong></div>
                    )}
                </section>

                {(hasCompactTransactionInfo || compactFiles.length > 0) && (
                    <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-2xs">
                        {transactionFacts.length > 0 && (
                            <div className="px-3 py-2.5">
                                <div className="mb-2 flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 text-amber-600"><i className="fas fa-receipt text-[9px]" /></span><p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">Giao dịch</p></div>
                                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(transactionFacts.length, 3)}, minmax(0, 1fr))` }}>
                                    {transactionFacts.map(item => <div key={item.label}>{detailItem(item.label, item.value, item.mono)}</div>)}
                                </div>
                            </div>
                        )}

                        {policies.length > 0 && (
                            <div className="mx-2 mb-2 rounded-[13px] bg-blue-50/55 px-2.5 py-2 ring-1 ring-blue-100/80">
                                <p className="mb-1 text-[8px] font-bold uppercase tracking-wider text-blue-500">Chính sách áp dụng</p>
                                <ul className="space-y-0.5">
                                    {policies.map((policy, index) => (
                                        <li key={`${policy}-${index}`} className="flex items-start gap-1.5 text-[9px] leading-[1.25] text-slate-600"><span className="mt-[4px] h-1 w-1 shrink-0 rounded-full bg-blue-500" /><span>{policy}</span></li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {(compactValue(order['Địa chỉ']) || compactValue(order['Ghi chú hủy'] || order['Ghi chú'])) && (
                            <div className="space-y-1 border-t border-slate-100 px-3 py-2">
                                {compactValue(order['Địa chỉ']) && <p className="truncate text-[9px] text-slate-600"><span className="mr-2 text-[8px] font-semibold uppercase text-slate-400">Địa chỉ</span>{order['Địa chỉ']}</p>}
                                {compactValue(order['Ghi chú hủy'] || order['Ghi chú']) && <p className="truncate text-[9px] text-slate-600"><span className="mr-2 text-[8px] font-semibold uppercase text-slate-400">Ghi chú</span>{order['Ghi chú hủy'] || order['Ghi chú']}</p>}
                            </div>
                        )}

                        {compactFiles.length > 0 && (
                            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-3 py-2">
                                <div><p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Hồ sơ điện tử</p><p className="text-[7.5px] text-slate-400">{compactFiles.length} tài liệu</p></div>
                                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                    {compactFiles.map((file, index) => (
                                        <button key={`${file.name}-${index}`} type="button" onClick={() => handleViewFile(file.url!, file.name)} title={file.name} aria-label={`Xem ${file.name}`} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${file.iconBgColor} ${file.iconTextColor} shadow-2xs ring-1 ring-black/[0.04] active:scale-90`}><i className={`fas ${file.icon} text-[12px]`} /></button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                <FilePreviewModal isOpen={!!previewFile} onClose={() => setPreviewFile(null)} fileUrl={previewFile?.url || ''} fileLabel={previewFile?.label || ''} />
            </div>
        );
    }

    return <div className="sold-detail">
        <header className="sold-detail-heading"><p>Lịch sử bán hàng <span> / </span>{order['Số đơn hàng']}</p><div><h2>{order['Tên khách hàng'] || 'Chưa có tên khách hàng'}</h2><span className="sold-status" data-cancelled={/hủy/i.test(statusText)}>{statusText}</span></div></header>
        <div className="sold-detail-fit-viewport" ref={fitViewportRef}>
        <div className="sold-detail-scroll sold-detail-compact" ref={fitContentRef}>
            <section className="sold-vehicle-summary">
                <div className="sold-vehicle-photo"><CarImage model={order['Dòng xe']} exteriorColor={order['Ngoại thất']} version={order['Phiên bản']} alt={order['Dòng xe']} /></div>
                <div className="sold-vehicle-info"><h3>{order['Dòng xe']}</h3><p>{order['Phiên bản'] || '—'}</p>{order.VIN && order.VIN !== '—' && <button type="button" className="sold-copy-vin" onClick={handleCopyVin} title="Sao chép số VIN">{order.VIN}<i className={copiedVin?'fas fa-check':'fas fa-copy'} /><span aria-live="polite">{copiedVin?'Đã sao chép':''}</span></button>}<dl><div><dt>Ngoại thất</dt><dd>{order['Ngoại thất'] || '—'}</dd></div><div><dt>Nội thất</dt><dd>{order['Nội thất'] || '—'}</dd></div></dl></div>
            </section>
            <div className="sold-detail-data-grid">
            <section className="sold-detail-section"><h4>Thông tin xe & tư vấn</h4><DetailRow icon="fa-cogs" label="Số máy" value={order['Số máy']} copyable isMono /><DetailRow icon="fa-barcode" label="Mã DMS" value={order['Mã DMS']} copyable isMono /><DetailRow icon="fa-user-tie" label="Tư vấn bán hàng" value={order['Tên tư vấn bán hàng']} /><DetailRow icon="fa-receipt" label="Phiếu xuất DNX" value={order.so_ct_dnx || order['Số CT DNX']} copyable /><DetailRow icon="fa-truck" label="Phiếu giao TD4" value={order.so_ct_td4 || order['Số CT TD4']} copyable /></section>
            {!!(order['SĐT'] || order['CCCD'] || order['Địa chỉ'] || dateCoc || dateGhep || dateXHD) && <section className="sold-detail-section"><h4>Khách hàng & giao dịch</h4><DetailRow icon="fa-phone" label="Điện thoại" value={order['SĐT']} copyable /><DetailRow icon="fa-id-card" label="CCCD / CMND" value={order['CCCD']} copyable /><DetailRow icon="fa-map-marker-alt" label="Địa chỉ" value={order['Địa chỉ']} /><DetailRow icon="fa-calendar-alt" label="Ngày cọc" value={dateCoc || undefined} /><DetailRow icon="fa-link" label="Ngày ghép VIN" value={dateGhep || undefined} /><DetailRow icon="fa-file-invoice-dollar" label="Ngày xuất hóa đơn" value={dateXHD || undefined} /></section>}
            </div>
            <div className="sold-detail-resources">
            <div className="sold-detail-context-grid">
            {policies.length > 0 && <section className="sold-detail-section"><h4>Chính sách áp dụng</h4><ul className="sold-policy-list">{policies.map((policy,index)=><li key={index}>{policy}</li>)}</ul></section>}
            {(order['Ghi chú'] || order['Ghi chú hủy']) && <section className="sold-detail-section"><h4>Ghi chú</h4><p className="sold-note">{order['Ghi chú hủy'] || order['Ghi chú']}</p></section>}
            </div>
            {(availableFiles.length > 0 || extraFiles.length > 0) && <section className="sold-detail-section"><h4>Hồ sơ & chứng từ <span>{totalFileCount}</span></h4><div className="sold-file-list">{availableFiles.map((file,index)=><FileCard key={index} {...file} onView={handleViewFile} />)}{extraFiles.map((file,index)=><FileCard key={index} title={file.name || 'Tập tin bổ sung'} description="Tài liệu đính kèm" url={file.url} icon="fa-paperclip" iconBgColor="bg-slate-100" iconTextColor="text-slate-600" onView={handleViewFile} />)}</div></section>}

            </div>
        </div>
        </div>
        <FilePreviewModal isOpen={!!previewFile} onClose={() => setPreviewFile(null)} fileUrl={previewFile?.url || ''} fileLabel={previewFile?.label || ''} />
    </div>;
};

export default SoldCarDetailPanel;
