import React, { useState, useEffect } from 'react';
import { CustomerTrackingOrder, searchCustomerOrders, normalizePhone } from '../../services/api/customerTrackingService';

interface CustomerTrackingPortalProps {
    initialPhone?: string;
}

export const CustomerTrackingPortal: React.FC<CustomerTrackingPortalProps> = ({ initialPhone = '' }) => {
    const [phoneInput, setPhoneInput] = useState<string>(initialPhone);
    const [orders, setOrders] = useState<CustomerTrackingOrder[]>([]);
    const [selectedOrderIdx, setSelectedOrderIdx] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [hasSearched, setHasSearched] = useState<boolean>(false);
    const [copiedVin, setCopiedVin] = useState<boolean>(false);
    const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);

    // Tự động tìm kiếm nếu có số điện thoại từ URL
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const urlPhone = queryParams.get('phone') || queryParams.get('track') || queryParams.get('sdt') || initialPhone;
        if (urlPhone && urlPhone.trim().length >= 9 && urlPhone !== '1') {
            setPhoneInput(urlPhone.trim());
            handleSearch(urlPhone.trim());
        }
    }, [initialPhone]);

    const handleSearch = async (phoneToQuery?: string) => {
        const phone = (phoneToQuery !== undefined ? phoneToQuery : phoneInput).trim();
        if (!phone || phone.length < 9) return;

        setIsLoading(true);
        setHasSearched(true);
        try {
            const found = await searchCustomerOrders(phone);
            setOrders(found);
            setSelectedOrderIdx(0);
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
        const zaloMessage = `Kính chào Anh/Chị ${order.khach_hang},\nEm gửi Anh/Chị đường link theo dõi tiến độ xe ${order.dong_xe} trực tuyến 24/7 tại Showroom VinFast Thuận An:\n👉 ${shareUrl}\nChúc Anh/Chị một ngày tràn đầy năng lượng!`;
        navigator.clipboard.writeText(zaloMessage);
        setCopiedShareLink(true);
        setTimeout(() => setCopiedShareLink(false), 3000);
    };

    const activeOrder = orders[selectedOrderIdx];

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#09111e] via-[#0f1d33] to-[#070d17] text-slate-100 font-sans flex flex-col selection:bg-cyan-500 selection:text-white">
            {/* TOP BAR / BRAND HEADER */}
            <header className="sticky top-0 z-40 backdrop-blur-md bg-[#09111e]/85 border-b border-cyan-900/30 px-4 py-3 sm:px-6">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-lg tracking-wider">
                            V
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm sm:text-base tracking-wide text-white uppercase">VINFAST</span>
                                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                                    THUẬN AN
                                </span>
                            </div>
                            <p className="text-[10.5px] text-slate-400">Cổng Tra Cứu Tiến Độ Nhận Xe Trực Tuyến 24/7</p>
                        </div>
                    </div>

                    <a 
                        href="tel:1900232389" 
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition-colors"
                    >
                        <i className="fa-solid fa-headset text-cyan-400"></i>
                        <span>Hotline: 1900 23 23 89</span>
                    </a>
                </div>
            </header>

            {/* MAIN CONTENT CONTAINER */}
            <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">
                {/* HERO SEARCH SECTION */}
                <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/80 via-blue-950/40 to-slate-900/80 border border-cyan-800/30 p-5 sm:p-7 shadow-2xl backdrop-blur-sm">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

                    <div className="max-w-xl mx-auto text-center space-y-2 mb-5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-bold tracking-wide uppercase">
                            <i className="fa-solid fa-car-side"></i>
                            <span>Hành Trình Rước Xe Về Nhà</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                            Tra Cứu Lộ Trình Xe VinFast Của Bạn
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-400">
                            Nhập số điện thoại đã đăng ký đặt cọc để kiểm tra tình trạng ghép xe, hồ sơ hóa đơn và lịch nhận xe mới nhất.
                        </p>
                    </div>

                    {/* SEARCH INPUT */}
                    <form 
                        onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                        className="max-w-lg mx-auto flex flex-col sm:flex-row items-center gap-2"
                    >
                        <div className="relative w-full">
                            <i className="fa-solid fa-phone absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400 text-sm"></i>
                            <input
                                type="tel"
                                value={phoneInput}
                                onChange={(e) => setPhoneInput(e.target.value)}
                                placeholder="Nhập số điện thoại nhận cọc (VD: 0903...)"
                                className="w-full pl-10 pr-4 py-3 bg-[#060c17]/90 border border-cyan-700/50 rounded-xl text-sm font-bold text-white placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/25 cursor-pointer transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
                                    <span>Đang tra cứu...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-magnifying-glass text-sm"></i>
                                    <span>Tra Cứu Tiến Độ</span>
                                </>
                            )}
                        </button>
                    </form>
                </section>

                {/* SEARCH RESULTS */}
                {isLoading && (
                    <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                        <div className="w-12 h-12 rounded-full border-3 border-cyan-500/20 border-t-cyan-400 animate-spin"></div>
                        <p className="text-xs font-semibold text-slate-300">Đang đồng bộ lộ trình xe từ hệ thống nhà máy...</p>
                    </div>
                )}

                {!isLoading && hasSearched && orders.length === 0 && (
                    <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-xl">
                            <i className="fa-solid fa-file-circle-question"></i>
                        </div>
                        <h3 className="text-base font-bold text-white">Chưa tìm thấy đơn hàng tương ứng</h3>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                            Số điện thoại <strong>{phoneInput}</strong> chưa khớp với hợp đồng cọc nào đang xử lý. Vui lòng kiểm tra lại số điện thoại hoặc liên hệ trực tiếp với Tư vấn bán hàng của bạn.
                        </p>
                        <a 
                            href="tel:1900232389" 
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold rounded-lg border border-slate-700"
                        >
                            <i className="fa-solid fa-phone"></i>
                            <span>Gọi Tổng Đài Hỗ Trợ: 1900 23 23 89</span>
                        </a>
                    </div>
                )}

                {/* DETAILED ORDER CARD */}
                {!isLoading && activeOrder && (
                    <div className="space-y-5 animate-fade-in">
                        {/* SELECTOR NẾU CÓ NHIỀU ĐƠN HÀNG */}
                        {orders.length > 1 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                <span className="text-xs text-slate-400 shrink-0 font-medium">Bạn có {orders.length} hợp đồng:</span>
                                {orders.map((ord, i) => (
                                    <button
                                        key={ord.id || i}
                                        onClick={() => setSelectedOrderIdx(i)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                            selectedOrderIdx === i 
                                                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' 
                                                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                                        }`}
                                    >
                                        Xe #{i + 1}: {ord.dong_xe} ({ord.so_hop_dong || 'HĐ'})
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* CAR HERO DISPLAY CARD */}
                        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800/90 to-blue-950/70 border border-cyan-800/30 overflow-hidden shadow-2xl relative">
                            {/* STATUS BADGE */}
                            <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80">
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">HỢP ĐỒNG #{activeOrder.so_hop_dong || activeOrder.so_don_hang}</span>
                                    <h2 className="text-lg sm:text-2xl font-black text-white mt-0.5">
                                        Kính chào Quý khách, <span className="text-cyan-300">{activeOrder.khach_hang}</span>
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                        <span>Giai đoạn {activeOrder.current_milestone}/5</span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyZaloLink(activeOrder)}
                                        className="px-3 py-1 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold rounded-lg border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors"
                                        title="Sao chép tin nhắn Zalo kèm link tra cứu gửi khách hàng"
                                    >
                                        <i className={`fa-solid ${copiedShareLink ? 'fa-check text-emerald-400' : 'fa-share-nodes'}`}></i>
                                        <span>{copiedShareLink ? 'Đã sao chép tin nhắn Zalo!' : 'Gửi qua Zalo'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* CAR VISUAL & SPECS GRID */}
                            <div className="p-5 sm:p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                {/* CAR IMAGE PREVIEW */}
                                <div className="md:col-span-5 flex flex-col items-center justify-center relative">
                                    <div className="w-56 h-36 sm:w-64 sm:h-40 flex items-center justify-center relative">
                                        <img 
                                            src={activeOrder.car_image} 
                                            alt={activeOrder.dong_xe}
                                            className="max-w-full max-h-full object-contain filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)] transform hover:scale-105 transition-transform duration-300"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = '/pictures/vf5-ce18.webp';
                                            }}
                                        />
                                    </div>
                                    <div className="text-center mt-2">
                                        <span className="font-black text-white text-base sm:text-lg block tracking-wide">{activeOrder.dong_xe}</span>
                                        <span className="text-xs text-slate-400 font-medium">{activeOrder.ngoai_that} • Nội thất {activeOrder.noi_that}</span>
                                    </div>
                                </div>

                                {/* CAR DETAILS PILLS */}
                                <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                                    <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                                        <span className="text-[10px] text-slate-400 block font-medium">Số Khung (VIN)</span>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <span className="font-mono font-bold text-cyan-300 text-[11px] truncate">
                                                {activeOrder.vin || 'Đang cập nhật'}
                                            </span>
                                            {activeOrder.vin && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyVin(activeOrder.vin)}
                                                    className="text-slate-400 hover:text-cyan-400 text-[10px] shrink-0"
                                                    title="Sao chép số VIN"
                                                >
                                                    <i className={`fa-solid ${copiedVin ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                                        <span className="text-[10px] text-slate-400 block font-medium">Số Máy</span>
                                        <span className="font-mono font-bold text-slate-200 text-[11px] block mt-0.5 truncate">
                                            {activeOrder.so_may || 'Theo hồ sơ xuất xưởng'}
                                        </span>
                                    </div>

                                    <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                                        <span className="text-[10px] text-slate-400 block font-medium">Tiền Đã Đặt Cọc</span>
                                        <span className="font-bold text-emerald-400 text-[11px] block mt-0.5">
                                            {activeOrder.tien_coc ? `${activeOrder.tien_coc.toLocaleString('vi-VN')} đ` : 'Đã xác nhận'}
                                        </span>
                                    </div>

                                    <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                                        <span className="text-[10px] text-slate-400 block font-medium">Vị Trí Hiện Tại</span>
                                        <span className="font-bold text-amber-300 text-[11px] block mt-0.5 truncate">
                                            <i className="fa-solid fa-location-dot mr-1 text-[10px]"></i>
                                            {activeOrder.vi_tri_xe}
                                        </span>
                                    </div>

                                    <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                                        <span className="text-[10px] text-slate-400 block font-medium">Showroom Bàn Giao</span>
                                        <span className="font-bold text-white text-[11px] block mt-0.5 truncate">
                                            VinFast Thuận An
                                        </span>
                                    </div>

                                    <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                                        <span className="text-[10px] text-slate-400 block font-medium">Tư Vấn Bán Hàng</span>
                                        <span className="font-bold text-cyan-300 text-[11px] block mt-0.5 truncate">
                                            {activeOrder.tvbh_name}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 5-STAGE MILESTONE TIMELINE */}
                        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-7 shadow-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                                    <i className="fa-solid fa-timeline text-cyan-400"></i>
                                    <span>Lộ Trình Xử Lý Đơn Hàng</span>
                                </h3>
                                <span className="text-[11px] text-slate-400">Cập nhật thời gian thực</span>
                            </div>

                            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-[11px] sm:before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                                {activeOrder.milestones.map((ms) => {
                                    const isDone = ms.status === 'COMPLETED';
                                    const isInProgress = ms.status === 'IN_PROGRESS';
                                    return (
                                        <div key={ms.stage} className="relative group">
                                            {/* STEP ICON / BADGE */}
                                            <div className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-md ${
                                                isDone 
                                                    ? 'bg-emerald-500 text-white shadow-emerald-500/30' 
                                                    : isInProgress 
                                                        ? 'bg-cyan-500 text-white ring-4 ring-cyan-500/20 animate-pulse' 
                                                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                                            }`}>
                                                {isDone ? (
                                                    <i className="fa-solid fa-check text-[11px]"></i>
                                                ) : (
                                                    <span>{ms.stage}</span>
                                                )}
                                            </div>

                                            {/* STEP CONTENT */}
                                            <div className={`p-3.5 rounded-xl border transition-all ${
                                                isDone 
                                                    ? 'bg-slate-900/90 border-emerald-900/40' 
                                                    : isInProgress 
                                                        ? 'bg-blue-950/40 border-cyan-500/50 shadow-lg shadow-cyan-500/5' 
                                                        : 'bg-slate-900/40 border-slate-800/80 opacity-75'
                                            }`}>
                                                <div className="flex flex-wrap items-center justify-between gap-1">
                                                    <span className={`text-xs sm:text-sm font-bold ${
                                                        isDone ? 'text-white' : isInProgress ? 'text-cyan-300' : 'text-slate-400'
                                                    }`}>
                                                        {ms.title}
                                                    </span>
                                                    {ms.date && (
                                                        <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                                                            {ms.date}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-xs text-slate-300 mt-1">{ms.subtitle}</p>

                                                {ms.note && (
                                                    <div className="mt-1.5 text-[11px] text-cyan-400/90 flex items-center gap-1.5">
                                                        <i className="fa-solid fa-circle-info text-[10px]"></i>
                                                        <span>{ms.note}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* TVBH SUPPORT & SHOWROOM CONTACT */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* TVBH CARD */}
                            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950/50 border border-cyan-800/30 p-5 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-cyan-500/20">
                                        <i className="fa-solid fa-user-tie"></i>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">Chuyên viên phụ trách đơn hàng</span>
                                        <h4 className="text-sm sm:text-base font-bold text-white">{activeOrder.tvbh_name}</h4>
                                        <p className="text-[11px] text-slate-400">VinFast Thuận An • Đồng hành 24/7</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <a
                                        href={`https://zalo.me/${normalizePhone(phoneInput)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="py-2.5 px-3 bg-[#0068FF] hover:bg-[#0054cc] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                                    >
                                        <i className="fa-solid fa-comment-dots"></i>
                                        <span>Chat Zalo</span>
                                    </a>
                                    <a
                                        href="tel:1900232389"
                                        className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                                    >
                                        <i className="fa-solid fa-phone"></i>
                                        <span>Gọi Hỗ Trợ</span>
                                    </a>
                                </div>
                            </div>

                            {/* SHOWROOM LOCATION CARD */}
                            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3 flex flex-col justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                                        <i className="fa-solid fa-store"></i>
                                        <span>Địa Điểm Bàn Giao Xe</span>
                                    </div>
                                    <h4 className="text-sm sm:text-base font-bold text-white">Showroom VinFast Thuận An</h4>
                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        Đại lộ Bình Dương, Khu phố Bình Đức, Phường Bình Hòa, TP. Thuận An, Bình Dương.
                                    </p>
                                </div>

                                <div className="pt-2">
                                    <a
                                        href="https://www.google.com/maps/search/?api=1&query=VinFast+Thuận+An"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
                                    >
                                        <i className="fa-solid fa-diamond-turn-right text-cyan-400"></i>
                                        <span>Chỉ Đường Google Maps Đến Showroom</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* DELIVERY CHECKLIST */}
                        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 space-y-3 text-xs text-slate-300">
                            <div className="font-bold text-white flex items-center gap-2">
                                <i className="fa-solid fa-list-check text-cyan-400"></i>
                                <span>Lưu ý chuẩn bị khi đến nhận xe:</span>
                            </div>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
                                <li className="flex items-start gap-2 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                                    <i className="fa-solid fa-id-card text-emerald-400 mt-0.5"></i>
                                    <span>Bản gốc CCCD/CMND của người đứng tên trên hợp đồng mua bán.</span>
                                </li>
                                <li className="flex items-start gap-2 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                                    <i className="fa-solid fa-receipt text-cyan-400 mt-0.5"></i>
                                    <span>Biên lai chuyển khoản đủ 100% tiền xe hoặc thông báo giải ngân ngân hàng.</span>
                                </li>
                                <li className="flex items-start gap-2 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                                    <i className="fa-solid fa-mobile-screen-button text-purple-400 mt-0.5"></i>
                                    <span>Cài đặt sẵn ứng dụng <strong>VinFast App</strong> trên điện thoại để kích hoạt xe.</span>
                                </li>
                                <li className="flex items-start gap-2 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                                    <i className="fa-solid fa-champagne-glasses text-amber-400 mt-0.5"></i>
                                    <span>Showroom đã chuẩn bị sẵn hoa chúc mừng & lễ giao xe trang trọng cho quý khách!</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </main>

            {/* FOOTER */}
            <footer className="mt-8 border-t border-slate-800/80 py-4 px-4 text-center text-slate-500 text-xs">
                <p>© {new Date().getFullYear()} VinFast Thuận An. Hệ thống tra cứu giao xe tự động phục vụ Quý khách hàng.</p>
            </footer>
        </div>
    );
};
