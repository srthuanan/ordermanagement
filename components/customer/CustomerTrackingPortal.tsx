import React, { useState, useEffect } from 'react';
import { CustomerTrackingOrder, searchCustomerOrders, normalizePhone } from '../../services/api/customerTrackingService';

interface CustomerTrackingPortalProps {
    initialPhone?: string;
}

const getExteriorColorHex = (colorName: string): string => {
    const c = (colorName || '').toLowerCase();
    if (c.includes('trắng') || c.includes('white')) return '#f8fafc';
    if (c.includes('đen') || c.includes('black')) return '#0f172a';
    if (c.includes('xám') || c.includes('grey') || c.includes('gray')) return '#64748b';
    if (c.includes('bạc') || c.includes('silver')) return '#cbd5e1';
    if (c.includes('đỏ') || c.includes('red') || c.includes('ruby')) return '#dc2626';
    if (c.includes('xanh rêu') || c.includes('deep ocean')) return '#065f46';
    if (c.includes('bạc hà') || c.includes('mint')) return '#6ee7b7';
    if (c.includes('vàng') || c.includes('yellow')) return '#fbbf24';
    if (c.includes('hồng') || c.includes('pink')) return '#f472b6';
    if (c.includes('sky blue')) return '#38bdf8';
    if (c.includes('nâu') || c.includes('brown')) return '#78350f';
    if (c.includes('xanh') || c.includes('blue')) return '#2563eb';
    return '#94a3b8';
};

const getInteriorColorHex = (colorName: string): string => {
    const c = (colorName || '').toLowerCase();
    if (c.includes('nâu') || c.includes('brown')) return '#78350f';
    if (c.includes('be') || c.includes('beige')) return '#d4b996';
    if (c.includes('xám') || c.includes('ghi') || c.includes('grey')) return '#94a3b8';
    return '#1e293b'; // Chuẩn đen sang trọng của VinFast
};

export const CustomerTrackingPortal: React.FC<CustomerTrackingPortalProps> = ({ initialPhone = '' }) => {
    const [phoneInput, setPhoneInput] = useState<string>(initialPhone);
    const [orders, setOrders] = useState<CustomerTrackingOrder[]>([]);
    const [selectedOrderIdx, setSelectedOrderIdx] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [hasSearched, setHasSearched] = useState<boolean>(false);
    const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);
    const [copiedVin, setCopiedVin] = useState<boolean>(false);
    const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);

    // Tự động tìm kiếm nếu có số điện thoại từ URL
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const urlPhone = queryParams.get('phone') || queryParams.get('track') || queryParams.get('sdt') || initialPhone;
        if (urlPhone && urlPhone.trim().length >= 9 && urlPhone !== '1') {
            const clean = urlPhone.trim();
            setPhoneInput(clean);
            handleSearch(clean);
        } else {
            setIsSearchExpanded(true);
        }
    }, [initialPhone]);

    const handleSearch = async (phoneToQuery?: string) => {
        const phone = (phoneToQuery !== undefined ? phoneToQuery : phoneInput).trim();
        if (!phone || phone.length < 6) return;

        try {
            const url = new URL(window.location.href);
            url.searchParams.set('phone', phone);
            window.history.replaceState({}, '', url.toString());
        } catch (_) {}

        setIsLoading(true);
        setHasSearched(true);
        try {
            const found = await searchCustomerOrders(phone);
            setOrders(found);
            setSelectedOrderIdx(0);
            if (found.length > 0) {
                setIsSearchExpanded(false);
            }
        } catch (err) {
            console.error('Lỗi tra cứu đơn hàng:', err);
            setOrders([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyVin = (vin: string) => {
        if (!vin) return;
        navigator.clipboard.writeText(vin);
        setCopiedVin(true);
        setTimeout(() => setCopiedVin(false), 2000);
    };

    const handleCopyZaloLink = (order: CustomerTrackingOrder) => {
        const shareUrl = `${window.location.origin}${window.location.pathname}?phone=${order.so_dien_thoai || phoneInput}`;
        const zaloMessage = `Kính gửi Anh/Chị ${order.khach_hang},\nVinFast Thuận An trân trọng gửi link theo dõi tiến độ giao nhận xe ${order.dong_xe}:\n👉 ${shareUrl}\nChúc Anh/Chị luôn vạn dặm bình an!`;
        navigator.clipboard.writeText(zaloMessage);
        setCopiedShareLink(true);
        setTimeout(() => setCopiedShareLink(false), 3000);
    };

    const activeOrder = orders[selectedOrderIdx];

    return (
        <div className="w-full h-screen overflow-y-auto bg-[#070B14] text-slate-100 font-sans selection:bg-blue-600 selection:text-white flex flex-col antialiased">
            {/* SUBTLE LUXURY AMBIENT GLOW */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-blue-900/15 via-indigo-900/5 to-transparent blur-[120px] pointer-events-none"></div>

            {/* MINIMALIST HEADER */}
            <header className="sticky top-0 z-40 backdrop-blur-md bg-[#070B14]/80 border-b border-white/[0.06] px-4 sm:px-8 py-3.5">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    {/* BRAND MARK */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-md shadow-white/10 text-slate-950 font-black text-sm tracking-widest">
                            V
                        </div>
                        <div>
                            <span className="text-xs font-black tracking-[0.25em] text-white uppercase block">VINFAST</span>
                            <span className="text-[10px] text-slate-400 font-medium tracking-wide">THUẬN AN • BÌNH DƯƠNG</span>
                        </div>
                    </div>

                    {/* TOP RIGHT CONTROLS */}
                    <div className="flex items-center gap-2">
                        {activeOrder && !isSearchExpanded && (
                            <button
                                type="button"
                                onClick={() => setIsSearchExpanded(true)}
                                className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium border border-white/[0.08] flex items-center gap-2 transition-all cursor-pointer"
                            >
                                <i className="fa-solid fa-magnifying-glass text-[11px] text-slate-400"></i>
                                <span className="font-mono">{phoneInput}</span>
                                <span className="text-[10px] text-slate-500 hidden sm:inline">(Đổi số)</span>
                            </button>
                        )}

                        {activeOrder && (
                            <button
                                type="button"
                                onClick={() => handleCopyZaloLink(activeOrder)}
                                className="px-3.5 py-1.5 rounded-lg bg-white text-slate-950 hover:bg-slate-100 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-white/20 cursor-pointer active:scale-95"
                                title="Sao chép link gửi Zalo cho khách"
                            >
                                <i className={`fa-solid ${copiedShareLink ? 'fa-check text-emerald-600' : 'fa-share-nodes'}`}></i>
                                <span className="hidden sm:inline">{copiedShareLink ? 'Đã sao chép link Zalo' : 'Gửi Zalo'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* SEARCH PANEL (MINIMALIST & COLLAPSIBLE) */}
            {isSearchExpanded && (
                <section className="px-4 py-8 max-w-xl mx-auto w-full animate-fade-in relative z-20">
                    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6 backdrop-blur-xl shadow-2xl space-y-4">
                        <div className="text-center space-y-1">
                            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Tra Cứu Tiến Độ Nhận Xe</h2>
                            <p className="text-xs text-slate-400 font-normal">Nhập số điện thoại đăng ký hợp đồng để xem lộ trình xe của bạn</p>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex items-center gap-2 pt-1">
                            <input
                                type="tel"
                                value={phoneInput}
                                onChange={(e) => setPhoneInput(e.target.value)}
                                placeholder="Nhập số điện thoại nhận cọc..."
                                className="flex-1 px-4 py-2.5 bg-black/40 border border-white/15 rounded-xl text-sm font-semibold text-white placeholder-slate-500 outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0"
                            >
                                {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Tra Cứu'}
                            </button>
                        </form>
                    </div>
                </section>
            )}

            {/* LOADING STATE */}
            {isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                    <span className="text-xs text-slate-400 font-medium tracking-widest uppercase">Đang đồng bộ dữ liệu...</span>
                </div>
            )}

            {/* EMPTY STATE */}
            {!isLoading && hasSearched && orders.length === 0 && (
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="max-w-md w-full rounded-2xl bg-white/[0.02] border border-white/[0.06] p-8 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-white/[0.05] text-slate-400 flex items-center justify-center mx-auto text-lg">
                            <i className="fa-regular fa-file"></i>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-white">Chưa tìm thấy thông tin đơn hàng</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Số điện thoại <strong className="text-white">{phoneInput}</strong> chưa khớp với hồ sơ xe nào đang chờ bàn giao.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsSearchExpanded(true)}
                            className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4 cursor-pointer"
                        >
                            Thử lại với số điện thoại khác
                        </button>
                    </div>
                </div>
            )}

            {/* MAIN DASHBOARD */}
            {!isLoading && activeOrder && (
                <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-8 animate-fade-in relative z-10">
                    {/* CONTRACT SELECTOR IF MULTIPLE ORDERS */}
                    {orders.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {orders.map((ord, i) => (
                                <button
                                    key={ord.id || i}
                                    onClick={() => setSelectedOrderIdx(i)}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                                        selectedOrderIdx === i 
                                            ? 'bg-white text-slate-950 shadow-sm' 
                                            : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.06]'
                                    }`}
                                >
                                    Xe {i + 1}: {ord.dong_xe}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* HERO CAR PRESENTATION */}
                    <div className="text-center space-y-3 pt-2">
                        {/* GREETING & CONTRACT SUBTITLE */}
                        <div className="space-y-1">
                            <span className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                                HỢP ĐỒNG #{activeOrder.so_hop_dong || activeOrder.so_don_hang}
                            </span>
                            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                                Kính chào Quý khách, <span className="font-black">{activeOrder.khach_hang}</span>
                            </h1>
                            <p className="text-xs text-slate-400">
                                {activeOrder.showroom} hân hạnh đồng hành cùng Quý khách
                            </p>
                        </div>

                        {/* HIGH-RES 3D CAR STAGE WITH SOFT PEDESTAL REFLECTION */}
                        <div className="relative py-4 sm:py-6 flex flex-col items-center justify-center max-w-2xl mx-auto">
                            {/* CAR GRAPHIC */}
                            <div className="w-full h-56 sm:h-72 flex items-center justify-center relative z-10 transition-transform duration-700 hover:scale-[1.02]">
                                <img 
                                    src={activeOrder.car_image} 
                                    alt={activeOrder.dong_xe}
                                    className="max-w-full max-h-full object-contain filter drop-shadow-[0_25px_35px_rgba(0,0,0,0.85)]"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/pictures/vf5-ce18.webp';
                                    }}
                                />
                            </div>

                            {/* SOFT RADIAL REFLECTION ON THE FLOOR */}
                            <div className="w-72 sm:w-96 h-10 bg-gradient-to-r from-transparent via-blue-500/15 to-transparent rounded-full blur-xl -mt-5"></div>

                            {/* CAR TITLE & COLOR BADGE */}
                            <div className="mt-2 space-y-2">
                                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">{activeOrder.dong_xe}</h2>
                                <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 shadow-sm">
                                        <span className="text-slate-400 text-[11px]">Ngoại thất:</span>
                                        <span 
                                            className="w-2.5 h-2.5 rounded-full inline-block border border-white/40 shadow-sm shrink-0"
                                            style={{ backgroundColor: getExteriorColorHex(activeOrder.ngoai_that) }}
                                        ></span>
                                        <strong className="text-white font-semibold">{activeOrder.ngoai_that}</strong>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 shadow-sm">
                                        <span className="text-slate-400 text-[11px]">Nội thất:</span>
                                        <span 
                                            className="w-2.5 h-2.5 rounded-full inline-block border border-white/40 shadow-sm shrink-0"
                                            style={{ backgroundColor: getInteriorColorHex(activeOrder.noi_that) }}
                                        ></span>
                                        <strong className="text-white font-semibold">{activeOrder.noi_that}</strong>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* HORIZONTAL LINEAR 5-STEP TIMELINE */}
                    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-5 sm:p-7 backdrop-blur-xl space-y-6">
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <h3 className="text-xs sm:text-sm font-bold text-white tracking-wider uppercase">Tiến Độ Bàn Giao Xe</h3>
                            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>Giai đoạn {activeOrder.current_milestone} / {activeOrder.milestones.length || 6}</span>
                            </span>
                        </div>

                        {/* STEP TRACKER (DESKTOP & MOBILE RESPONSIVE) */}
                        <div className="grid grid-cols-6 gap-1 sm:gap-2 relative">
                            {/* CONNECTING LINE */}
                            <div className="absolute top-4 left-4 right-4 sm:left-6 sm:right-6 h-0.5 bg-white/[0.08] -z-0"></div>

                            {activeOrder.milestones.map((ms) => {
                                const isDone = ms.status === 'COMPLETED';
                                const isCurrent = ms.stage === activeOrder.current_milestone;
                                return (
                                    <div key={ms.stage} className="flex flex-col items-center text-center relative z-10 group">
                                        {/* CIRCLE ICON */}
                                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                            isDone 
                                                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                                                : isCurrent 
                                                    ? 'bg-white text-slate-950 ring-4 ring-blue-500/30 shadow-lg shadow-white/20' 
                                                    : 'bg-[#0f172a] text-slate-500 border border-white/10'
                                        }`}>
                                            {isDone ? <i className="fa-solid fa-check text-[11px]"></i> : ms.stage}
                                        </div>

                                        {/* STEP TITLE */}
                                        <span className={`text-[10px] sm:text-xs font-bold mt-2.5 transition-colors line-clamp-1 ${
                                            isCurrent ? 'text-white font-extrabold' : isDone ? 'text-slate-300' : 'text-slate-500'
                                        }`}>
                                            {ms.stage === 1 && 'Đặt cọc'}
                                            {ms.stage === 2 && 'Ghép VIN'}
                                            {ms.stage === 3 && 'Vận chuyển'}
                                            {ms.stage === 4 && 'Hóa đơn'}
                                            {ms.stage === 5 && 'Chờ COC'}
                                            {ms.stage === 6 && 'Bàn giao'}
                                        </span>

                                        {/* STEP STATUS INDICATOR */}
                                        <span className={`text-[9.5px] font-medium hidden sm:block mt-0.5 ${
                                            isCurrent ? 'text-blue-400 font-bold' : isDone ? 'text-emerald-400/80' : 'text-slate-600'
                                        }`}>
                                            {isCurrent ? 'Đang xử lý' : isDone ? 'Hoàn tất' : 'Chờ'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ACTIVE STAGE HIGHLIGHT CARD */}
                        <div className="rounded-xl bg-gradient-to-r from-blue-950/30 via-white/[0.02] to-blue-950/30 border border-blue-500/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                                    <i className="fa-solid fa-circle-info text-xs"></i>
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="text-xs sm:text-sm font-bold text-white">
                                        {activeOrder.milestones[activeOrder.current_milestone - 1]?.title}
                                    </h4>
                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        {activeOrder.milestones[activeOrder.current_milestone - 1]?.subtitle}
                                    </p>
                                    {activeOrder.milestones[activeOrder.current_milestone - 1]?.note && (
                                        <p className="text-[11px] text-blue-300 font-medium pt-0.5">
                                            • {activeOrder.milestones[activeOrder.current_milestone - 1]?.note}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {activeOrder.ngay_giao_xe_du_kien && (
                                <div className="shrink-0 text-left sm:text-right bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.06]">
                                    <span className="text-[10px] text-slate-400 block font-medium">Lịch bàn giao dự kiến</span>
                                    <span className="text-xs font-bold text-emerald-400">{activeOrder.ngay_giao_xe_du_kien}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* THREE-CARD EXECUTIVE DETAILS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* CARD 1: TECHNICAL PASSPORT & WAREHOUSE DISPATCH */}
                        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-5 sm:p-6 backdrop-blur-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                                <span className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2">
                                    <i className="fa-solid fa-car-side text-blue-400"></i>
                                    <span>Hồ Sơ Xe & Vận Chuyển</span>
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                                    {activeOrder.vin ? 'Đã cấp VIN' : 'Chờ ghép xe'}
                                </span>
                            </div>

                            <div className="divide-y divide-white/[0.04] text-xs">
                                <div className="py-2.5 flex items-center justify-between">
                                    <span className="text-slate-400">Số khung (VIN)</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-white tracking-wider">
                                            {activeOrder.vin || 'Đang chờ nhà máy phân bổ'}
                                        </span>
                                        {activeOrder.vin && (
                                            <button
                                                type="button"
                                                onClick={() => handleCopyVin(activeOrder.vin)}
                                                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                                                title="Sao chép số VIN"
                                            >
                                                <i className={`fa-solid ${copiedVin ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="py-2.5 flex items-center justify-between">
                                    <span className="text-slate-400">Số máy động cơ</span>
                                    <span className="font-mono text-slate-200">{activeOrder.so_may || 'Đồng bộ theo hồ sơ gốc'}</span>
                                </div>

                                <div className="py-2.5 flex items-center justify-between">
                                    <span className="text-slate-400">Màu ngoại thất</span>
                                    <div className="flex items-center gap-2">
                                        <span 
                                            className="w-2.5 h-2.5 rounded-full inline-block border border-white/40 shadow-sm shrink-0"
                                            style={{ backgroundColor: getExteriorColorHex(activeOrder.ngoai_that) }}
                                        ></span>
                                        <span className="font-semibold text-slate-100">{activeOrder.ngoai_that}</span>
                                    </div>
                                </div>

                                <div className="py-2.5 flex items-center justify-between">
                                    <span className="text-slate-400">Màu nội thất</span>
                                    <div className="flex items-center gap-2">
                                        <span 
                                            className="w-2.5 h-2.5 rounded-full inline-block border border-white/40 shadow-sm shrink-0"
                                            style={{ backgroundColor: getInteriorColorHex(activeOrder.noi_that) }}
                                        ></span>
                                        <span className="font-semibold text-slate-100">{activeOrder.noi_that}</span>
                                    </div>
                                </div>

                                <div className="py-2.5 flex items-center justify-between">
                                    <span className="text-slate-400">Vị trí hiện tại</span>
                                    <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                        <span>{activeOrder.vi_tri_xe}</span>
                                    </span>
                                </div>

                                {activeOrder.so_ct_dnx && (
                                    <div className="py-2.5 flex items-center justify-between">
                                        <span className="text-slate-400">Lệnh điều chuyển Cyber (DNX)</span>
                                        <span className="font-mono text-blue-400 font-semibold">{activeOrder.so_ct_dnx}</span>
                                    </div>
                                )}

                                {activeOrder.so_ct_td4 && (
                                    <div className="py-2.5 flex items-center justify-between">
                                        <span className="text-slate-400">Phiếu xuất xe Cyber (TD4)</span>
                                        <span className="font-mono text-purple-400 font-semibold">{activeOrder.so_ct_td4}</span>
                                    </div>
                                )}

                                <div className="py-2.5 flex items-center justify-between">
                                    <span className="text-slate-400">Hồ sơ COC gốc</span>
                                    <span className={`font-semibold ${activeOrder.ngay_coc_ve ? 'text-emerald-400' : 'text-slate-300'}`}>
                                        {activeOrder.ngay_coc_ve ? `Đã về Showroom (${activeOrder.ngay_coc_ve})` : 'Chờ nhà máy cấp phát'}
                                    </span>
                                </div>

                                <div className="py-2.5 flex items-center justify-between">
                                    <span className="text-slate-400">Lịch giao xe dự kiến</span>
                                    <span className="font-bold text-emerald-400">
                                        {activeOrder.ngay_giao_xe_du_kien || 'TVBH đang sắp xếp theo giờ lành'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* CARD 2: FINANCIAL & CONTRACT LEDGER (CYBER + SUPABASE) */}
                        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-5 sm:p-6 backdrop-blur-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                                <span className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2">
                                    <i className="fa-solid fa-file-invoice-dollar text-emerald-400"></i>
                                    <span>Hợp Đồng & Thanh Toán</span>
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium">
                                    {activeOrder.ten_post || 'Đã duyệt HĐ'}
                                </span>
                            </div>

                            <div className="divide-y divide-white/[0.04] text-xs">
                                <div className="py-2.5 flex items-center justify-between">
                                    <span className="text-slate-400">Mã hợp đồng Cyber</span>
                                    <span className="font-mono font-semibold text-slate-200">
                                        {activeOrder.so_hop_dong || activeOrder.so_don_hang}
                                    </span>
                                </div>

                                <div className="py-2.5 flex items-center justify-between">
                                    <span className="text-slate-400">Số tiền đã cọc</span>
                                    <span className="font-bold text-emerald-400">
                                        {activeOrder.tien_coc ? `${activeOrder.tien_coc.toLocaleString('vi-VN')} ₫` : 'Đã xác nhận'}
                                    </span>
                                </div>

                                <div className="py-2.5 flex items-center justify-between">
                                    <span className="text-slate-400">Số tiền đã thanh toán</span>
                                    <span className="font-bold text-emerald-300">
                                        {activeOrder.da_thanh_toan ? `${activeOrder.da_thanh_toan.toLocaleString('vi-VN')} ₫` : 'Đang cập nhật'}
                                    </span>
                                </div>

                                {activeOrder.link_hoa_don && (
                                    <div className="py-2.5 flex items-center justify-between">
                                        <span className="text-slate-400">Hóa đơn GTGT điện tử</span>
                                        <a
                                            href={activeOrder.link_hoa_don}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-2.5 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[11px] font-bold border border-blue-500/30 flex items-center gap-1.5 transition-all"
                                        >
                                            <i className="fa-solid fa-file-pdf"></i>
                                            <span>Xem Hóa Đơn M-Invoice</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* CARD 3: VIP CONCIERGE & SHOWROOM NAVIGATION */}
                    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-5 sm:p-6 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-blue-500/20 shrink-0">
                                <i className="fa-solid fa-user-tie"></i>
                            </div>
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">TƯ VẤN BÁN HÀNG PHỤ TRÁCH</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                </div>
                                <h4 className="text-base font-bold text-white tracking-tight">{activeOrder.tvbh_name}</h4>
                                <p className="text-xs text-slate-400">Chuyên viên tư vấn • Showroom VinFast Thuận An (Bình Dương)</p>
                            </div>
                        </div>

                        {/* DUAL ACTION BUTTONS (CALL & ZALO) */}
                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                            <a
                                href={`https://zalo.me/${activeOrder.tvbh_phone || normalizePhone(phoneInput) || '0987144227'}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-2.5 px-4 bg-[#0068FF] hover:bg-[#0054cc] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-blue-500/20 active:scale-95"
                            >
                                <i className="fa-solid fa-comment-dots text-sm"></i>
                                <span>Nhắn Zalo TVBH</span>
                            </a>
                            <a
                                href="https://www.google.com/maps/search/?api=1&query=VinFast+Thuận+An+Bình+Dương"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-2.5 px-4 bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer active:scale-95"
                            >
                                <i className="fa-solid fa-location-dot text-sm text-blue-400"></i>
                                <span>Chỉ Đường Đến Showroom</span>
                            </a>
                        </div>
                    </div>
                </main>
            )}

            {/* MINIMALIST FOOTER */}
            <footer className="mt-auto border-t border-white/[0.06] py-5 px-4 text-center text-slate-500 text-xs">
                <p className="tracking-wide">© {new Date().getFullYear()} VinFast Thuận An. Chúc Quý khách vạn dặm bình an cùng chiếc xe mới!</p>
            </footer>
        </div>
    );
};
