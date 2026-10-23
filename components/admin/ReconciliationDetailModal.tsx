import React from 'react';
import ReactDOM from 'react-dom';

export interface ReconciliationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: any | null;
    type?: 'missing_yard' | 'td4' | 'dnx' | 'k83_reconcile' | 'all';
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

export const ReconciliationDetailModal: React.FC<ReconciliationDetailModalProps> = ({
    isOpen,
    onClose,
    item,
    type = 'all',
    showToast
}) => {
    if (!isOpen || !item) return null;

    const itemType = item.type || (
        item.reconcileType ? 'K83_RECONCILE' :
        type === 'k83_reconcile' ? 'K83_RECONCILE' :
        type === 'missing_yard' ? 'MISSING_YARD' :
        type === 'td4' ? 'TD4' :
        type === 'dnx' ? 'DNX' : 'UNKNOWN'
    );

    const rawVin = String(item.vin || item.soKhung || '').trim().toUpperCase();
    const match17 = rawVin.match(/[A-Z0-9]{17}/);
    const vin = match17 ? match17[0] : rawVin.split('(')[0].split(' ')[0].split('-')[0].trim();
    const carModel = item.carModel || item.loaiXe || 'Chưa rõ';
    const color = item.color || item.mauSac || '';
    const customerName = item.customerName || 'Chưa rõ';
    const tvbh = item.tvbh || item.tvbhCyber || 'Chưa rõ';
    const orderNumber = item.orderNumber || item.soDonHang || '';
    const ngayXhd = item.ngayXuatHoaDon || item.ngayChungTu || item.ngayHdCyber || '';
    const maHdCyber = item.maHdCyber || item.soHd || item.soHdCyber || '';
    const khoCyber = item.khoCyber || item.tenKhoCyber || item.maKhoCyber || 'Cyber';
    const khoThucTe = item.khoThucTe || item.khoBaiThucTe || item.khoName || (item.satelliteYard ? item.satelliteYard.khoName : '') || 'Không có ở 3 bãi';
    const ngayXuatBai = item.ngayXuatBaiThucTe || item.ngayGiaoYard || (item.satelliteYard ? item.satelliteYard.ngayGiao : '');
    const ngayNhanBai = item.ngayNhanBai || item.ngayNhanYard || (item.satelliteYard ? item.satelliteYard.ngayNhan : '');

    // Nội dung ngắn gọn & súc tích
    let shortAlertTitle = '';
    let shortProblem = '';
    let actionSteps: { role: string; task: string; color: string }[] = [];
    let bannerBg = 'bg-red-50 text-red-900 border-red-200';

    // 0. Phân hệ mới: TRA SOÁT TỒN KHO CYBER K83 vs BÃI THUẬN AN THỰC TẾ
    if (itemType === 'K83_RECONCILE' || item.reconcileType) {
        if (item.reconcileType === 'MATCHED') {
            bannerBg = 'bg-emerald-50 text-emerald-950 border-emerald-300';
            shortAlertTitle = 'Xe đã khớp hoàn toàn giữa Sổ Cyber K83 và Bãi Thuận An thực tế';
            shortProblem = 'Xe có mặt trên sổ sách Cyber K83 và thực tế đang nằm tại bãi Thuận An (Mức pin: ' + (item.mucPin || '-') + ').';
            actionSteps = [
                { role: 'Thủ Kho Bãi', task: 'Định kỳ kiểm tra mức pin, bảo quản xe an toàn trong bãi.', color: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
                { role: `TVBH (${tvbh})`, task: 'Theo dõi hợp đồng và chuẩn bị lịch hẹn bàn giao cho khách hàng.', color: 'text-blue-700 bg-blue-50 border-blue-200' }
            ];
        } else if (item.reconcileType === 'CYBER_K83_ONLY') {
            bannerBg = 'bg-amber-50 text-amber-950 border-amber-300';
            const td4Label = item.td4MaPostLabel ? ` [${item.td4MaPostLabel}]` : '';

            if (item.otherYardInfo?.isTonKho) {
                const otherYardName = item.otherYardInfo.khoName;
                if (item.hasDnx) {
                    shortAlertTitle = `Xe đang ở bãi ${otherYardName} — ĐÃ CÓ ĐNX (${item.soCtDnx}) về K83`;
                    shortProblem = item.discrepancyReason || `Sổ Cyber báo K83 nhưng xe đang nằm tại ${otherYardName} và đã lập phiếu ĐNX ${item.soCtDnx} về Showroom Thuận An.`;
                    actionSteps = [
                        { role: 'Admin & Điều Phối Xe', task: `Đã có ĐNX ${item.soCtDnx}. Liên hệ xe lồng khẩn trương vận chuyển xe từ ${otherYardName} về Showroom Thuận An.`, color: 'text-purple-800 bg-purple-50 border-purple-200' },
                        { role: `TVBH (${tvbh})`, task: 'Theo dõi tiến độ vận chuyển xe về bãi Thuận An để kịp chuẩn bị bàn giao cho khách.', color: 'text-blue-700 bg-blue-50 border-blue-200' }
                    ];
                } else {
                    shortAlertTitle = `Xe đang ở bãi ${otherYardName} — CHƯA CÓ ĐNX điều chuyển về K83`;
                    shortProblem = item.discrepancyReason || `Sổ Cyber báo tồn K83 nhưng thực tế xe đang ở ${otherYardName} và chưa hề có phiếu ĐNX điều chuyển về Showroom Thuận An.`;
                    actionSteps = [
                        { role: 'TVBH & Admin', task: `Khẩn trương lập phiếu ĐNX điều chuyển xe từ ${otherYardName} về Showroom Thuận An (K83).`, color: 'text-amber-800 bg-amber-50 border-amber-200' },
                        { role: 'Điều Phối Xe', task: 'Sau khi có ĐNX, lên kế hoạch xe lồng vận chuyển về bãi showroom.', color: 'text-slate-700 bg-slate-100 border-slate-200' }
                    ];
                }
            } else if (item.hasDnx && item.dnxMaKhoXuat === 'K83' && item.dnxMaKhoNhan && item.dnxMaKhoNhan !== 'K83') {
                shortAlertTitle = `Phiếu ĐNX (${item.soCtDnx}) xuất khỏi K83 — Kế toán chưa làm PXK trừ kho`;
                shortProblem = item.discrepancyReason || `Xe có lệnh ĐNX ${item.soCtDnx} xuất điều chuyển từ K83 sang ${item.dnxTenKhoNhan || item.dnxMaKhoNhan}, nhưng Kế toán chưa làm Phiếu Xuất Kho (PXK) để trừ tồn K83.`;
                actionSteps = [
                    { role: 'Kế Toán Kho', task: `Mở CyberSoft hoàn tất Phiếu Xuất Kho (PXK) theo ĐNX ${item.soCtDnx} để giảm trừ tồn kho K83.`, color: 'text-purple-800 bg-purple-50 border-purple-200' },
                    { role: `TVBH (${tvbh})`, task: 'Kiểm tra thủ tục xuất điều chuyển xe sang showroom nhận.', color: 'text-blue-700 bg-blue-50 border-blue-200' }
                ];
            } else if (item.hasTd4 && item.isTd4Approved) {
                shortAlertTitle = `Phiếu TD4 (${item.soCtTd4})${td4Label} ĐÃ DUYỆT — Sổ Cyber K83 chưa trừ tồn`;
                shortProblem = item.discrepancyReason || `Xe đã có phiếu TD4 được phê duyệt hoàn tất nhưng sổ tồn kho K83 CyberSoft vẫn chưa giảm trừ.`;
                actionSteps = [
                    { role: 'Kế Toán Kho', task: `Kiểm tra lại hạch toán sổ cái trên CyberSoft ERP hoặc chạy lại Stored Procedure để hạ tồn kho K83.`, color: 'text-purple-800 bg-purple-50 border-purple-200' },
                    { role: `TVBH (${tvbh})`, task: 'Xe đã hoàn tất thủ tục chứng từ xuất kho.', color: 'text-blue-700 bg-blue-50 border-blue-200' }
                ];
            } else if (item.hasTd4 && !item.isTd4Approved) {
                shortAlertTitle = `Phiếu TD4 (${item.soCtTd4})${td4Label} ĐANG CHỜ DUYỆT — Chưa hạ tồn kho K83`;
                shortProblem = item.discrepancyReason || `Phiếu TD4 mới lập, đang trình KTT/BGĐ phê duyệt, chưa hoàn tất hạ tồn kho sổ sách.`;
                actionSteps = [
                    { role: 'Kế Toán Trưởng & BGĐ', task: `Khẩn trương phê duyệt hoàn tất phiếu TD4 (${item.soCtTd4}) trên CyberSoft để hạ tồn kho K83.`, color: 'text-amber-800 bg-amber-50 border-amber-200' },
                    { role: `TVBH (${tvbh})`, task: 'Theo dõi tiến trình ký duyệt phiếu TD4 của Kế toán & BGĐ.', color: 'text-blue-700 bg-blue-50 border-blue-200' }
                ];
            } else {
                shortAlertTitle = 'Xe đã rời bãi nhưng CHƯA LẬP PHIẾU TD4 trên CyberSoft';
                shortProblem = item.discrepancyReason || `Xe đã xuất khỏi bãi thực tế nhưng trên hệ thống CyberSoft K83 hoàn toàn chưa có phiếu TD4.`;
                actionSteps = [
                    { role: `TVBH (${tvbh})`, task: 'Gửi biên bản giao nhận xe cho Kế toán để lập phiếu TD4 ngay.', color: 'text-blue-700 bg-blue-50 border-blue-200' },
                    { role: 'Kế Toán Xuất Xe', task: 'Mở CyberSoft ERP lập phiếu xuất bán / giao xe (TD4) trình duyệt để hạ kho K83.', color: 'text-rose-800 bg-rose-50 border-rose-200' }
                ];
            }
        } else {
            // YARD_ONLY
            bannerBg = 'bg-red-50 text-red-950 border-red-300';
            if (item.hasDnx) {
                const routeInfo = (item.dnxTenKhoXuat || item.dnxMaKhoXuat) ? ` (${item.dnxTenKhoXuat || item.dnxMaKhoXuat} ➔ ${item.dnxTenKhoNhan || item.dnxMaKhoNhan || 'K83'})` : '';
                shortAlertTitle = `Xe đã về bãi theo ĐNX (${item.soCtDnx}) — Kế toán CHƯA LẬP PNK K83`;
                shortProblem = item.discrepancyReason || `Xe đã có mặt tại bãi Thuận An thực tế theo phiếu ĐNX ${item.soCtDnx}${routeInfo}, nhưng Kế toán chưa làm Phiếu Nhập Kho (PNK) K83 trên CyberSoft.`;
                actionSteps = [
                    { role: 'Kế Toán Kho Thuận An', task: `Mở CyberSoft kiểm tra ĐNX ${item.soCtDnx} và bấm xác nhận Phiếu Nhập Kho (PNK) K83 ngay để đưa xe vào sổ tồn showroom.`, color: 'text-amber-800 bg-amber-50 border-amber-200' },
                    { role: `TVBH (${tvbh})`, task: 'Đôn đốc Kế toán hoàn tất PNK để kịp tiến độ làm thủ tục xuất giao xe.', color: 'text-blue-700 bg-blue-50 border-blue-200' }
                ];
            } else {
                shortAlertTitle = 'Xe nằm tại bãi Thuận An nhưng CHƯA CÓ ĐNX điều chuyển về K83';
                shortProblem = item.discrepancyReason || `Xe đang nằm tại bãi Thuận An (Pin: ${item.mucPin || '-'}) nhưng sổ Cyber ghi nhận ở ${item.tenKhoCyber || item.maKhoCyber || 'kho khác'} và chưa hề có phiếu ĐNX điều chuyển về K83.`;
                actionSteps = [
                    { role: 'TVBH Phụ Trách & Admin', task: `Lập ngay phiếu ĐNX điều chuyển xe từ ${item.maKhoCyber || 'kho hiện tại'} về K83 trên CyberSoft ERP để làm căn cứ nhập kho.`, color: 'text-rose-800 bg-rose-50 border-rose-200' },
                    { role: 'Thủ Kho Bãi', task: 'Rà soát chứng từ xe vào bãi, yêu cầu TVBH cung cấp số ĐNX.', color: 'text-slate-800 bg-slate-100 border-slate-200' }
                ];
            }
        }
    }
    // 1. Phân hệ: MẤT BÃI / XUẤT BÃI CHƯA CÓ TD4
    else if (itemType === 'MISSING_YARD' || item.satelliteStatus) {
        const isDispatched = item.satelliteStatus === 'ALREADY_DISPATCHED_WITHOUT_TD4' || Boolean(ngayXuatBai);

        if (isDispatched) {
            bannerBg = 'bg-red-50 text-red-900 border-red-300';
            shortAlertTitle = 'Xe đã xuất bãi nhưng chưa có Phiếu TD4 trên CyberSoft';
            shortProblem = `Bãi thực tế (${khoThucTe}) ghi nhận xe đã rời bãi ngày ${ngayXuatBai ? ngayXuatBai.slice(0, 10) : 'N/A'}, nhưng Kế toán chưa tạo Phiếu TD4 ra cổng để trừ tồn kho sổ sách.`;
            actionSteps = [
                { role: `TVBH (${tvbh})`, task: `Gửi biên bản giao xe của khách ${customerName} cho Kế toán ngay.`, color: 'text-blue-700 bg-blue-50 border-blue-200' },
                { role: 'Kế Toán Kho', task: `Lập ngay Phiếu TD4 trên Cyber trình BGĐ duyệt để tất toán hạ tồn kho.`, color: 'text-amber-800 bg-amber-50 border-amber-200' },
                { role: 'Thủ Kho Bãi', task: `Rà soát bảo vệ: Tuyệt đối không cho xe rời bãi khi chưa có Phiếu TD4 ký duyệt.`, color: 'text-slate-800 bg-slate-100 border-slate-200' }
            ];
        } else {
            bannerBg = 'bg-orange-50 text-orange-950 border-orange-300';
            shortAlertTitle = 'Sổ Cyber báo tồn nhưng 3 bãi ngoài không có xe';
            shortProblem = `Sổ Cyber báo xe đang ở ${khoCyber} (HĐ: ${maHdCyber || 'Đã XHĐ'}), nhưng thực tế cả 3 bãi ngoài không có xe và chưa có phiếu xuất TD4.`;
            actionSteps = [
                { role: `TVBH (${tvbh})`, task: `Xác nhận với khách ${customerName}: Khách đã nhận xe chưa? (Giao thẳng hay chưa giao).`, color: 'text-blue-700 bg-blue-50 border-blue-200' },
                { role: 'Kế Toán & Kho', task: `Nếu xe đã giao thực tế thì lập TD4 xuất sổ; nếu chưa giao thì truy tìm vị trí xe ngay.`, color: 'text-amber-800 bg-amber-50 border-amber-200' }
            ];
        }
    } 
    // 2. Phân hệ: TỒN PHIẾU TD4
    else if (itemType === 'TD4') {
        const isApproved = item.isViolation !== false;
        const soTd4 = item.soCtTd4 || item.soChungTu || 'TD4';

        if (isApproved) {
            bannerBg = 'bg-purple-50 text-purple-950 border-purple-300';
            shortAlertTitle = `Phiếu TD4 (${soTd4}) đã duyệt nhưng xe vẫn còn nằm bãi`;
            shortProblem = `Về kế toán xe ĐÃ GIAO (BGĐ đã duyệt TD4 ra cổng), nhưng bãi ${khoThucTe} vẫn báo xe còn tồn thực tế.`;
            actionSteps = [
                { role: 'Thủ Kho Bãi', task: `Nếu xe ĐÃ RỜI BÃI: Cập nhật ngay ngày xuất trên Google Sheets để trừ tồn bãi.`, color: 'text-purple-800 bg-purple-50 border-purple-200' },
                { role: `TVBH (${tvbh})`, task: `Nếu xe CHƯA GIAO (khách hoãn nhận): Báo cáo gấp lý do cho Ban Giám Đốc.`, color: 'text-blue-700 bg-blue-50 border-blue-200' }
            ];
        } else {
            bannerBg = 'bg-blue-50 text-blue-950 border-blue-200';
            shortAlertTitle = `Phiếu TD4 (${soTd4}) đang chờ duyệt — Xe lưu bãi hợp lệ`;
            shortProblem = `Hồ sơ đang trình KTT/BGĐ ký duyệt, xe nằm bãi chờ giao là đúng quy trình.`;
            actionSteps = [
                { role: `TVBH (${tvbh})`, task: `Theo dõi tiến độ ký duyệt của BGĐ để kịp lịch bàn giao cho khách ${customerName}.`, color: 'text-blue-700 bg-blue-50 border-blue-200' }
            ];
        }
    }
    // 3. Phân hệ: ĐNX
    else if (itemType === 'DNX') {
        const isAtThuanAn = item.reconcileStatus === 'AT_THUAN_AN' || item.typeLabel?.includes('Thuận An');
        const soDnx = item.soCtDnx || item.soChungTu || 'ĐNX';

        if (isAtThuanAn) {
            bannerBg = 'bg-amber-50 text-amber-950 border-amber-300';
            shortAlertTitle = `Xe ĐNX (${soDnx}) đã về bãi Thuận An — Chưa nhập kho K83`;
            shortProblem = `Xe đã về bãi xe Thuận An (nhận bãi ngày ${ngayNhanBai ? ngayNhanBai.slice(0, 10) : 'N/A'}), nhưng Kế toán chưa làm Phiếu Nhập Kho K83 trên Cyber.`;
            actionSteps = [
                { role: 'Kế Toán Kho', task: `Mở CyberSoft làm Phiếu Nhập Kho (PNK) K83 theo ĐNX ${soDnx} ngay.`, color: 'text-amber-800 bg-amber-50 border-amber-200' },
                { role: `TVBH (${tvbh})`, task: `Nhắc Kế toán hoàn tất PNK để kịp in phiếu xuất TD4 bàn giao xe.`, color: 'text-blue-700 bg-blue-50 border-blue-200' }
            ];
        } else {
            bannerBg = 'bg-slate-50 text-slate-900 border-slate-200';
            shortAlertTitle = `Xe ĐNX (${soDnx}) đang luân chuyển giữa các bãi`;
            shortProblem = `Xe đang trên xe lồng hoặc tạm lưu tại ${khoThucTe} để điều phối về Thuận An.`;
            actionSteps = [
                { role: `TVBH (${tvbh})`, task: `Theo dõi lộ trình xe lồng về bãi Thuận An.`, color: 'text-slate-700 bg-slate-100 border-slate-200' }
            ];
        }
    }

    // Sao chép tin nhắn Zalo cực ngắn
    const handleCopyZalo = () => {
        let msg = `🚨 [ĐỐI SOÁT KHO] ${shortAlertTitle}\n`;
        msg += `• VIN: ${vin} (${carModel})\n`;
        msg += `• TVBH: ${tvbh} | KH: ${customerName}${orderNumber ? ` (${orderNumber})` : ''}\n`;
        msg += `• Vấn đề: ${shortProblem}\n`;
        msg += `👉 CẦN XỬ LÝ:\n`;
        actionSteps.forEach((s, idx) => {
            msg += `${idx + 1}. ${s.role}: ${s.task}\n`;
        });

        navigator.clipboard.writeText(msg);
        showToast('Đã sao chép Zalo', `Đã sao chép nội dung ngắn gọn cho xe ${vin}!`, 'success', 2000);
    };

    const handleCopyVin = () => {
        navigator.clipboard.writeText(vin);
        showToast('Đã sao chép', `Đã copy VIN: ${vin}`, 'info', 1500);
    };

    return ReactDOM.createPortal(
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-2xs p-3 select-text animate-fade-in font-sans"
            onClick={onClose}
        >
            <div 
                className="bg-white w-full max-w-xl rounded-lg shadow-xl border border-slate-300 flex flex-col overflow-hidden text-slate-800"
                onClick={e => e.stopPropagation()}
            >
                {/* 1. HEADER NGẮN GỌN */}
                <div className="bg-[#2B579A] text-white px-4 py-2.5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-mono font-bold text-yellow-300 text-sm tracking-wide">{vin}</span>
                        <button 
                            onClick={handleCopyVin}
                            className="text-white/70 hover:text-white cursor-pointer" 
                            title="Chép số VIN"
                        >
                            <i className="fa-regular fa-copy text-xs"></i>
                        </button>
                        <span className="text-white/60">•</span>
                        <span className="text-white font-medium text-xs truncate">
                            {carModel} {color ? `(${color})` : ''}
                            {(rawVin.includes('TRƯNG BÀY') || rawVin.includes('TRUNG BAY') || (item.note && String(item.note).toUpperCase().includes('TRƯNG BÀY'))) ? ' • [Trưng Bày]' : ''}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white rounded w-6 h-6 flex items-center justify-center text-base cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {/* 2. BODY TRỰC DIỆN */}
                <div className="p-4 space-y-3 bg-[#FAF9F5] text-xs">
                    
                    {/* BẢN CHẤT LỖI (1-2 CÂU NGẮN) */}
                    <div className={`p-3 rounded-md border ${bannerBg}`}>
                        <div className="font-bold text-[12.5px] flex items-center gap-1.5 mb-1">
                            <span>🚨</span>
                            <span>{shortAlertTitle}</span>
                        </div>
                        <div className="text-[11.5px] leading-relaxed opacity-90">
                            {shortProblem}
                        </div>
                    </div>

                    {/* TÓM TẮT THÔNG TIN NHANH (3 Ô GỌN GÀNG) */}
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
                            <div className="text-slate-400 font-medium text-[10px] uppercase">🏛️ Kế Toán Cyber</div>
                            <div className="font-bold text-slate-900 mt-0.5 truncate">{khoCyber}</div>
                            <div className="text-slate-600 truncate mt-0.5 font-mono">
                                HĐ: {maHdCyber || 'Chưa rõ'} {ngayXhd ? `(${ngayXhd.slice(0, 10)})` : ''}
                            </div>
                        </div>

                        <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
                            <div className="text-slate-400 font-medium text-[10px] uppercase">🚚 Bãi Ngoài Thực Tế</div>
                            <div className="font-bold text-blue-900 mt-0.5 truncate">{khoThucTe}</div>
                            <div className="text-slate-600 truncate mt-0.5">
                                {ngayXuatBai ? `Xuất: ${ngayXuatBai.slice(0, 10)}` : 'Chưa xuất bãi'}
                            </div>
                        </div>

                        <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
                            <div className="text-slate-400 font-medium text-[10px] uppercase">📑 Khách Hàng & TVBH</div>
                            <div className="font-bold text-slate-900 mt-0.5 truncate" title={customerName}>{customerName}</div>
                            <div className="text-blue-700 font-medium truncate mt-0.5" title={tvbh}>{tvbh}</div>
                        </div>
                    </div>

                    {/* HƯỚNG XỬ LÝ CỤ THỂ (GẠCH ĐẦU DÒNG NGẮN GỌN) */}
                    <div className="bg-white p-3 rounded-md border border-slate-200 shadow-2xs space-y-2">
                        <div className="font-bold text-slate-800 text-[11.5px] flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                            <i className="fa-solid fa-list-check text-emerald-600"></i>
                            <span>Hướng Xử Lý Cần Làm Ngay:</span>
                        </div>

                        <div className="space-y-1.5">
                            {actionSteps.map((s, idx) => (
                                <div key={idx} className={`p-2 rounded border text-[11px] flex items-start gap-2 ${s.color}`}>
                                    <span className="font-bold shrink-0">{s.role}:</span>
                                    <span className="flex-1">{s.task}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* 3. FOOTER */}
                <div className="bg-white border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={handleCopyZalo}
                        className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                        <i className="fa-solid fa-copy"></i>
                        <span>Sao Chép Gửi Zalo</span>
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 transition-colors cursor-pointer"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
