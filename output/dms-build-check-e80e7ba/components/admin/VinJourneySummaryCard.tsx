import React, { useState, useEffect, useMemo } from 'react';
import { SatelliteCarItem } from './SatelliteWarehousesView';
import { supabase } from '../../services/supabaseClient';

export interface VinJourneySummaryCardProps {
    vin: string;
    cars: SatelliteCarItem[];
    allOrders?: any[];
    onClose?: () => void;
    showToast?: (title: string, message: string, type?: any, duration?: number) => void;
    onNavigateToTab?: (tab: string, options?: any) => void;
}

export interface JourneyStep {
    id: string;
    title: string;
    date: string;
    timestamp?: number;
    priority?: number;
    location: string;
    type: 'receive' | 'transfer' | 'invoice' | 'td4' | 'dnx' | 'current';
    icon: string;
    badgeColor: string;
    details: string;
    subDetails?: string;
    isCurrent?: boolean;
}

// Cache bộ nhớ tạm để không query lại Supabase cho cùng 1 số VIN
const vinDetailsCache = new Map<string, { cyberInfo: any; orderInfo: any }>();

export const VinJourneySummaryCard: React.FC<VinJourneySummaryCardProps> = ({
    vin,
    cars,
    allOrders = [],
    onClose,
    showToast,
    onNavigateToTab
}) => {
    const cleanVin = useMemo(() => String(vin || '').trim().toUpperCase(), [vin]);

    // Lấy toàn bộ bản ghi kho bãi liên quan đến số VIN này
    const matchingYardCars = useMemo(() => {
        if (!cleanVin) return [];
        return cars.filter(c => {
            const v = String(c.soKhung || '').trim().toUpperCase();
            return v === cleanVin || (cleanVin.length >= 6 && v.endsWith(cleanVin)) || (v.length >= 6 && cleanVin.endsWith(v));
        });
    }, [cars, cleanVin]);

    // Trạng thái đơn hàng / CSDL Cyber (Khởi tạo ngay từ Cache nếu có)
    const [orderInfo, setOrderInfo] = useState<any | null>(() => vinDetailsCache.get(cleanVin)?.orderInfo || null);
    const [cyberInfo, setCyberInfo] = useState<any | null>(() => vinDetailsCache.get(cleanVin)?.cyberInfo || null);

    // Tìm thông tin từ allOrders hoặc query Supabase
    useEffect(() => {
        if (!cleanVin) return;

        // 1. Kiểm tra cache RAM trước
        const cached = vinDetailsCache.get(cleanVin);
        if (cached) {
            setOrderInfo(cached.orderInfo);
            setCyberInfo(cached.cyberInfo);
            return;
        }

        // 2. Tìm nhanh trong allOrders có sẵn
        let found = allOrders.find(o => {
            const v = String(o.vin || o.VIN || o['Số khung'] || '').trim().toUpperCase();
            return v === cleanVin || (cleanVin.length >= 6 && v.endsWith(cleanVin));
        });

        if (found) {
            setOrderInfo(found);
        }

        // 3. Query CyberSoft trạng thái xe
        let isMounted = true;
        const fetchDetails = async () => {
            try {
                const { data: csData } = await supabase
                    .from('cyber_car_status')
                    .select('*')
                    .eq('vin', cleanVin)
                    .maybeSingle();

                if (!isMounted) return;

                if (csData) {
                    setCyberInfo(csData);
                }
                const finalOrder = found || null;
                vinDetailsCache.set(cleanVin, {
                    cyberInfo: csData || null,
                    orderInfo: finalOrder
                });
            } catch (err) {
                console.warn('Lỗi tải chi tiết đơn hàng cho VIN:', err);
            }
        };

        fetchDetails();

        return () => {
            isMounted = false;
        };
    }, [cleanVin, allOrders]);

    // Helper parse ngày VN (DD/MM/YYYY hoặc YYYY-MM-DD) thành timestamp để so sánh chính xác
    const parseVnDateToTime = (dStr?: string | null): number => {
        if (!dStr) return 0;
        const s = String(dStr).trim();
        const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
        if (dmy) {
            return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10)).getTime();
        }
        const ymd = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
        if (ymd) {
            return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10)).getTime();
        }
        const t = new Date(s).getTime();
        return isNaN(t) ? 0 : t;
    };

    const formatVnDate = (dStr?: string | null): string => {
        if (!dStr) return 'N/A';
        const s = String(dStr).trim();
        const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
        if (dmy) {
            const dd = dmy[1].padStart(2, '0');
            const mm = dmy[2].padStart(2, '0');
            return `${dd}/${mm}/${dmy[3]}`;
        }
        const ymd = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
        if (ymd) {
            const dd = ymd[3].padStart(2, '0');
            const mm = ymd[2].padStart(2, '0');
            return `${dd}/${mm}/${ymd[1]}`;
        }
        return s.slice(0, 10);
    };

    // Xác định hiện trạng cuối cùng: Đang tồn hay đã xuất?
    const currentStatus = useMemo(() => {
        if (matchingYardCars.length === 0) {
            return {
                isTonKho: false,
                statusText: 'KHÔNG TÌM THẤY TRONG 3 BÃI NGOÀI',
                badgeColor: 'bg-red-600 text-white',
                location: 'Chưa có thông tin bãi',
                pin: '-',
                date: ''
            };
        }

        // Ưu tiên dòng có isTonKho === true
        const tonRow = matchingYardCars.find(c => c.isTonKho);
        if (tonRow) {
            return {
                isTonKho: true,
                statusText: `ĐANG TỒN BÃI THỰC TẾ (${tonRow.khoName.toUpperCase()})`,
                badgeColor: 'bg-emerald-600 text-white',
                location: tonRow.khoName,
                pin: tonRow.mucPin,
                date: formatVnDate(tonRow.ngayNhan),
                raw: tonRow
            };
        }

        // Nếu tất cả các dòng đều đã giao -> lấy dòng có ngày giao mới nhất theo timestamp
        const sorted = [...matchingYardCars].sort((a, b) => {
            const timeA = parseVnDateToTime(a.ngayGiao || a.ngayNhan);
            const timeB = parseVnDateToTime(b.ngayGiao || b.ngayNhan);
            return timeB - timeA;
        });
        const latest = sorted[0];
        return {
            isTonKho: false,
            statusText: `ĐÃ XUẤT BÃI / BÀN GIAO (${latest.khoName.toUpperCase()})`,
            badgeColor: 'bg-slate-600 text-white',
            location: latest.khoName,
            pin: latest.mucPin,
            date: formatVnDate(latest.ngayGiao),
            raw: latest
        };
    }, [matchingYardCars]);

    // Xây dựng Timeline từ A đến Z theo đúng trình tự thời gian
    const journeySteps = useMemo(() => {
        const steps: JourneyStep[] = [];

        // 1. Sắp xếp các bản ghi bãi theo ngày nhận tăng dần (từ quá khứ đến hiện tại)
        const sortedYards = [...matchingYardCars].sort((a, b) => {
            const timeA = parseVnDateToTime(a.ngayNhan);
            const timeB = parseVnDateToTime(b.ngayNhan);
            return timeA - timeB;
        });

        // 2. Duyệt qua từng bãi xe đã từng lưu lại
        sortedYards.forEach((yard, idx) => {
            const isFirstYard = idx === 0;
            const inTime = parseVnDateToTime(yard.ngayNhan);

            // Chặng Nhập Bãi
            steps.push({
                id: `yard-in-${yard.id}`,
                title: isFirstYard ? `Tiếp nhận ban đầu tại ${yard.khoName}` : `Tiếp nhận chuyển về ${yard.khoName}`,
                date: formatVnDate(yard.ngayNhan),
                timestamp: inTime,
                priority: isFirstYard ? 1 : 5, // Nếu cùng ngày: kho cũ xuất (priority 4) trước, kho mới nhận (priority 5) sau
                location: yard.khoName,
                type: 'receive',
                icon: isFirstYard ? 'fa-truck-ramp-box' : 'fa-warehouse',
                badgeColor: isFirstYard ? 'bg-blue-600' : 'bg-emerald-600',
                details: `Bên giao: ${yard.benGiao || (isFirstYard ? 'Xe lồng / Vận chuyển' : 'Điều chuyển nội bộ')} | Mức Pin: ${yard.mucPin}`,
                subDetails: yard.showroomQuanLy ? `Showroom quản lý: ${yard.showroomQuanLy}` : (yard.tinhTrang ? `Tình trạng: ${yard.tinhTrang}` : undefined)
            });

            // Nếu bãi này đã xuất chuyển sang bãi khác hoặc xuất bàn giao
            if (!yard.isTonKho && yard.ngayGiao) {
                const outTime = parseVnDateToTime(yard.ngayGiao);
                const nextYard = sortedYards[idx + 1];
                const hasNextYard = !!nextYard;

                steps.push({
                    id: `yard-out-${yard.id}`,
                    title: hasNextYard ? `Xuất điều chuyển khỏi ${yard.khoName}` : `Xuất bãi / Giao xe tại ${yard.khoName}`,
                    date: formatVnDate(yard.ngayGiao),
                    timestamp: outTime,
                    priority: hasNextYard ? 4 : 7,
                    location: yard.khoName,
                    type: 'transfer',
                    icon: hasNextYard ? 'fa-arrow-right-arrow-left' : 'fa-circle-check',
                    badgeColor: hasNextYard ? 'bg-amber-600' : 'bg-slate-700',
                    details: hasNextYard 
                        ? `Xuất chuyển sang ${nextYard.khoName}. ${yard.note ? `Ghi chú bãi: ${yard.note}` : ''}` 
                        : `Bãi đã xác nhận xuất xe khỏi kho. Ghi chú: ${yard.note || yard.tinhTrang || 'Đã giao'}`,
                });
            }
        });

        // 3. Chặng Phiếu Điều Chuyển ĐNX (nếu có số phiếu)
        const soDnx = orderInfo?.so_ct_dnx || cyberInfo?.so_ct_dnx || cyberInfo?.dnx_data?.so_ct;
        const rawNgayDnx = orderInfo?.ngay_lap_dnx || cyberInfo?.ngay_ct_dnx || cyberInfo?.dnx_data?.ngay_ct;
        if (soDnx) {
            let dnxTime = parseVnDateToTime(rawNgayDnx);
            let dnxDateStr = rawNgayDnx ? formatVnDate(rawNgayDnx) : '';

            // Nếu không có ngày ĐNX trong hệ thống, tìm ngày bãi xuất chuyển đầu tiên hoặc ngày bãi nhận tiếp theo
            if (!dnxTime) {
                const transferOutStep = steps.find(s => s.type === 'transfer' && s.id.startsWith('yard-out-'));
                if (transferOutStep && transferOutStep.timestamp) {
                    dnxTime = transferOutStep.timestamp;
                    dnxDateStr = transferOutStep.date;
                } else if (sortedYards.length > 1) {
                    dnxTime = parseVnDateToTime(sortedYards[1].ngayNhan);
                    dnxDateStr = formatVnDate(sortedYards[1].ngayNhan);
                }
            }

            steps.push({
                id: 'dnx-step',
                title: `Lập phiếu xuất điều chuyển ĐNX: ${soDnx}`,
                date: dnxDateStr || 'Điều chuyển',
                timestamp: dnxTime || 0,
                priority: 3, // Xếp ngay trước bước xuất điều chuyển (priority 4)
                location: cyberInfo?.ten_kho || 'Kho điều chuyển K83',
                type: 'dnx',
                icon: 'fa-file-lines',
                badgeColor: 'bg-sky-600',
                details: `Lệnh điều chuyển nội bộ giữa các kho nhằm phục vụ giao xe cho khách hàng.`
            });
        }

        // 4. Chặng Hóa Đơn Bán Hàng (nếu có)
        const rawNgayHd = orderInfo?.ngay_xuat_hoa_don || orderInfo?.ngay_hd;
        if (rawNgayHd) {
            const hdTime = parseVnDateToTime(rawNgayHd);
            steps.push({
                id: 'invoice-step',
                title: 'Showroom xuất hóa đơn bán hàng',
                date: formatVnDate(rawNgayHd),
                timestamp: hdTime,
                priority: 2,
                location: 'Showroom Thuận An',
                type: 'invoice',
                icon: 'fa-file-invoice-dollar',
                badgeColor: 'bg-indigo-600',
                details: `Khách hàng: ${orderInfo?.ten_khach_hang || 'Chưa rõ'} | TVBH: ${orderInfo?.tvbh || orderInfo?.ten_tu_van_ban_hang || 'Chưa rõ'}`,
                subDetails: orderInfo?.so_don_hang ? `Số đơn hàng: ${orderInfo.so_don_hang}` : undefined
            });
        }

        // 5. Chặng Phiếu Xuất Kho Giao Xe TD4 (nếu có)
        const soTd4 = orderInfo?.so_ct_td4 || cyberInfo?.so_ct_td4 || cyberInfo?.td4_data?.so_ct;
        const rawNgayTd4 = orderInfo?.ngay_ct_td4 || cyberInfo?.ngay_ct_td4 || cyberInfo?.td4_data?.ngay_ct;
        const maPost = cyberInfo?.td4_data?.ma_post || cyberInfo?.ma_post;
        if (soTd4) {
            let postLabel = 'Đang trình duyệt';
            if (maPost === '9') postLabel = 'Đã hạch toán (Cấp 9)';
            else if (maPost === '5') postLabel = 'BGĐ đã duyệt xuất (Cấp 5)';
            else if (maPost === '4') postLabel = 'KTT đã duyệt (Cấp 4)';
            else if (maPost === '3') postLabel = 'Chờ duyệt (Cấp 3)';

            const td4Time = parseVnDateToTime(rawNgayTd4);

            steps.push({
                id: 'td4-step',
                title: `Lập phiếu giao xe xuất kho TD4: ${soTd4}`,
                date: rawNgayTd4 ? formatVnDate(rawNgayTd4) : 'Chờ ngày',
                timestamp: td4Time || (Date.now() - 3600000),
                priority: 6,
                location: 'CyberSoft ERP',
                type: 'td4',
                icon: 'fa-id-card-clip',
                badgeColor: maPost === '5' || maPost === '9' ? 'bg-purple-700' : 'bg-blue-600',
                details: `Trạng thái chứng từ: ${postLabel}. ${maPost >= '5' ? 'Đã có lệnh ra cổng.' : 'Chưa được BGĐ duyệt ra cổng (xe lưu bãi là hợp lệ).'}`
            });
        }

        // 6. Bước Hiện Tại (Luôn chốt hạ cuối cùng)
        steps.push({
            id: 'current-status-step',
            title: currentStatus.isTonKho ? `Hiện tại: Đang lưu bãi an toàn tại ${currentStatus.location}` : `Hiện tại: Đã xuất giao xe`,
            date: 'Hiện tại',
            timestamp: Number.MAX_SAFE_INTEGER,
            priority: 99,
            location: currentStatus.location,
            type: 'current',
            icon: currentStatus.isTonKho ? 'fa-warehouse' : 'fa-circle-check',
            badgeColor: currentStatus.isTonKho ? 'bg-emerald-600' : 'bg-slate-700',
            details: currentStatus.isTonKho
                ? `Mức Pin hiện tại: ${currentStatus.pin} • Tình trạng: ${currentStatus.raw?.tinhTrang || 'Bình thường'}`
                : `Xe đã xuất khỏi bãi vào ngày ${currentStatus.date || 'trước đó'}.`,
            isCurrent: true
        });

        // 7. Sắp xếp toàn bộ các bước theo trình tự thời gian tăng dần
        steps.sort((a, b) => {
            const timeDiff = (a.timestamp || 0) - (b.timestamp || 0);
            if (timeDiff !== 0) return timeDiff;
            return (a.priority || 0) - (b.priority || 0);
        });

        return steps;
    }, [matchingYardCars, orderInfo, cyberInfo, currentStatus]);

    // Copy tóm tắt hành trình gửi Zalo
    const handleCopyZalo = () => {
        const tvbh = orderInfo?.tvbh || orderInfo?.ten_tu_van_ban_hang || 'Chưa gán';
        const kh = orderInfo?.ten_khach_hang || 'Chưa có tên';
        const model = matchingYardCars[0]?.loaiXe || orderInfo?.dong_xe || 'VinFast';
        const color = matchingYardCars[0]?.mauSac || orderInfo?.ngoai_that || orderInfo?.mau_ngoai_that || '';

        let text = `🚗 BÁO CÁO HÀNH TRÌNH XE TỪ A - Z: ${cleanVin}\n`;
        text += `========================================\n`;
        text += `📍 HIỆN TRẠNG CHỐT: ${currentStatus.statusText}\n`;
        if (currentStatus.isTonKho) {
            text += `   • Vị trí: ${currentStatus.location} | Mức Pin: ${currentStatus.pin}\n`;
            text += `   • Ngày tiếp nhận bãi: ${currentStatus.date}\n`;
        } else {
            text += `   • Ngày bãi xuất xe: ${currentStatus.date} (tại ${currentStatus.location})\n`;
        }
        text += `----------------------------------------\n`;
        text += `👤 KHÁCH HÀNG: ${kh}\n`;
        text += `👨‍💼 TVBH PHỤ TRÁCH: ${tvbh}\n`;
        text += `🚘 DÒNG XE: ${model} ${color ? `(${color})` : ''}\n`;
        if (orderInfo?.so_don_hang) text += `📑 SỐ ĐƠN HÀNG: ${orderInfo.so_don_hang}\n`;
        if (orderInfo?.ngay_xuat_hoa_don) text += `🧾 NGÀY XUẤT HĐ: ${String(orderInfo.ngay_xuat_hoa_don).slice(0, 10)}\n`;
        if (orderInfo?.so_ct_dnx || cyberInfo?.so_ct_dnx) text += `📦 PHIẾU ĐNX: ${orderInfo?.so_ct_dnx || cyberInfo?.so_ct_dnx}\n`;
        if (orderInfo?.so_ct_td4 || cyberInfo?.so_ct_td4) text += `📋 PHIẾU TD4: ${orderInfo?.so_ct_td4 || cyberInfo?.so_ct_td4}\n`;
        text += `----------------------------------------\n`;
        text += `🛣️ CÁC MỐC HÀNH TRÌNH TỪ A - Z:\n`;
        journeySteps.forEach((s, idx) => {
            text += ` ${idx + 1}. [${s.date}] ${s.title}\n`;
            text += `    👉 ${s.details}\n`;
        });
        text += `========================================\n`;
        text += `(Tra cứu tự động từ Hệ thống Quản trị Showroom Thuận An)`;

        navigator.clipboard.writeText(text);
        if (showToast) {
            showToast('Đã sao chép', `Đã copy toàn bộ hành trình xe ${cleanVin} gửi Zalo!`, 'success', 2000);
        }
    };

    return (
        <div className="bg-[#F4F8FD] text-slate-800 p-2 sm:p-2.5 rounded-xs border border-[#B9D5F7] shadow-xs mb-1.5 transition-all text-[11px]">
            {/* Header ngắn gọn, đồng bộ CyberSoft */}
            <div className="flex items-center justify-between gap-2 border-b border-[#D0E2F9] pb-1.5 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                        <i className="fa-solid fa-route text-blue-700"></i>
                        <span>Hành Trình Giao Nhận & Luân Chuyển Bãi (Từ A Đến Z):</span>
                    </span>
                    <span className="font-mono font-bold text-blue-900 bg-white px-2 py-0.2 rounded-xs border border-[#B9D5F7] shadow-2xs text-[11.5px]">
                        {cleanVin}
                    </span>
                    {currentStatus.isTonKho ? (
                        <span className="text-[10px] font-bold text-[#137333] bg-[#E6F4EA] border border-[#CEEAD6] px-2 py-0.2 rounded-xs flex items-center gap-1 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Đang tồn bãi: {currentStatus.location} ({currentStatus.pin})
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.2 rounded-xs shadow-2xs">
                            ✓ Đã xuất giao ({currentStatus.date || 'Trước đó'})
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {onNavigateToTab && (
                        <div className="flex items-center gap-1 bg-white/90 p-0.5 rounded border border-[#B9D5F7] shadow-2xs">
                            <button
                                type="button"
                                onClick={() => onNavigateToTab('de_nghi_xuat', { vin: cleanVin, fromWarehouse: currentStatus.location?.includes('QL13') ? 'K87' : 'K87', toWarehouse: 'K83' })}
                                className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xs text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                title="Chuyển sang Lập Phiếu ĐNX cho xe này"
                            >
                                <i className="fa-solid fa-truck text-[9px]"></i>
                                <span>Lập ĐNX</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onNavigateToTab('tra_cuu_phieu', { vin: cleanVin })}
                                className="px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xs text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                title="Xem toàn bộ phiếu TD4, ĐNX, PX7 của xe này"
                            >
                                <i className="fa-solid fa-file-invoice text-[9px] text-blue-600"></i>
                                <span>Tiến Trình Phiếu</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onNavigateToTab('ton_kho', { vin: cleanVin })}
                                className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xs text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                title="Xem tồn kho Cyber của xe này"
                            >
                                <i className="fa-solid fa-warehouse text-[9px] text-blue-600"></i>
                                <span>Sổ Tồn</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onNavigateToTab('reconcile_k83', { vin: cleanVin })}
                                className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xs text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                title="Kiểm tra đối soát lệch kho xe này"
                            >
                                <i className="fa-solid fa-scale-balanced text-[9px] text-rose-600"></i>
                                <span>Đối Soát</span>
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleCopyZalo}
                        className="px-2 py-0.5 bg-white hover:bg-blue-50 text-blue-700 border border-[#7F9DB9] rounded-xs text-[10.5px] font-bold flex items-center gap-1 shadow-2xs active:translate-y-px transition-all cursor-pointer"
                        title="Sao chép toàn bộ hành trình gửi Zalo"
                    >
                        <i className="fa-solid fa-copy text-[9.5px]"></i>
                        <span>Copy Zalo</span>
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-5 h-5 rounded-xs hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                            title="Đóng bảng tổng hợp"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* DÒNG TIẾN TRÌNH HÀNH TRÌNH TỪ A ĐẾN Z (Đồng bộ bố cục & màu sắc bảng CyberSoft) */}
            <div className="relative border-l-2 border-[#9FBCEB] ml-2.5 pl-3.5 space-y-1.5">
                {journeySteps.map((step, sIdx) => {
                    return (
                        <div key={step.id || sIdx} className="relative">
                            {/* Dot biểu tượng */}
                            <div className={`absolute -left-[19px] top-1.5 w-3.5 h-3.5 rounded-full ${step.badgeColor} border-2 border-white flex items-center justify-center text-[7.5px] text-white shadow-xs`}>
                                <i className={`fa-solid ${step.icon}`}></i>
                            </div>

                            <div className={`p-1.5 rounded-xs text-[11px] transition-all ${
                                step.isCurrent 
                                    ? 'bg-[#EBF7EE] border border-[#A6E3B8] text-[#0d5925] shadow-2xs font-medium' 
                                    : 'bg-white hover:bg-[#F9FBFC] text-slate-800 border border-[#DCE7F5] shadow-2xs'
                            }`}>
                                <div className="flex flex-wrap items-center justify-between gap-1">
                                    <div className="font-bold flex items-center gap-1.5">
                                        <span className={step.isCurrent ? 'text-[#0d5925]' : 'text-slate-900'}>
                                            {step.isCurrent ? step.title : `${sIdx + 1}. ${step.title}`}
                                        </span>
                                        {step.isCurrent && (
                                            <span className="px-1.5 py-0.1 bg-[#137333] text-white text-[8.5px] font-bold rounded-xs uppercase tracking-wider">
                                                Điểm Hiện Tại
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono font-medium">
                                        {step.date}
                                    </span>
                                </div>
                                <div className={`text-[10.5px] mt-0.5 ${step.isCurrent ? 'text-emerald-800' : 'text-slate-600'}`}>
                                    {step.details}
                                </div>
                                {step.subDetails && (
                                    <div className="text-[9.5px] text-slate-500 mt-0.5 italic">
                                        {step.subDetails}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default VinJourneySummaryCard;
