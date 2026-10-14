import React from 'react';
import ReactDOM from 'react-dom';

export interface ReconciliationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: any | null;
    type?: 'missing_yard' | 'td4' | 'dnx' | 'all';
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
        type === 'missing_yard' ? 'MISSING_YARD' :
        type === 'td4' ? 'TD4' :
        type === 'dnx' ? 'DNX' : 'UNKNOWN'
    );

    const vin = String(item.vin || item.soKhung || '').trim().toUpperCase();
    const carModel = item.carModel || item.loaiXe || 'Chưa rõ';
    const color = item.color || item.mauSac || '';
    const customerName = item.customerName || 'Chưa rõ';
    const tvbh = item.tvbh || 'Chưa rõ';
    const orderNumber = item.orderNumber || item.soDonHang || '';
    const ngayXhd = item.ngayXuatHoaDon || item.ngayChungTu || '';
    const maHdCyber = item.maHdCyber || item.soHd || '';
    const khoCyber = item.khoCyber || item.tenKhoCyber || item.maKhoCyber || 'Cyber';
    const khoThucTe = item.khoThucTe || item.khoBaiThucTe || (item.satelliteYard ? item.satelliteYard.khoName : '') || 'Không có ở 3 bãi';
    const ngayXuatBai = item.ngayXuatBaiThucTe || (item.satelliteYard ? item.satelliteYard.ngayGiao : '');
    const ngayNhanBai = item.ngayNhanBai || (item.satelliteYard ? item.satelliteYard.ngayNhan : '');

    // Nội dung ngắn gọn & súc tích
    let shortAlertTitle = '';
    let shortProblem = '';
    let actionSteps: { role: string; task: string; color: string }[] = [];
    let bannerBg = 'bg-red-50 text-red-900 border-red-200';

    // 1. Phân hệ: MẤT BÃI / XUẤT BÃI CHƯA CÓ TD4
    if (itemType === 'MISSING_YARD' || item.satelliteStatus) {
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
                        <span className="text-white font-medium text-xs truncate">{carModel} {color ? `(${color})` : ''}</span>
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
