import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface CyberDnxPrintData {
    so_ct: string;
    stt_rec?: string;
    ngay_ct?: string;
    user_name: string;
    ma_kho_xuat: string;
    ten_kho_xuat?: string;
    ma_kho_nhan: string;
    ten_kho_nhan?: string;
    khach_hang?: string;
    don_vi?: string;
    dia_chi?: string;
    ly_do?: string;
    total_cars?: number;
    cars: Array<{
        stt_rec0?: string;
        vin: string;
        so_may?: string;
        ma_kx?: string;
        ten_kx?: string;
        dong_xe?: string;
        ma_mau?: string;
        ten_mau?: string;
        ma_kho_xuat?: string;
        ma_kho_nhan?: string;
        ghi_chu?: string;
    }>;
}

interface CyberDnxPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: CyberDnxPrintData | null;
}

const WAREHOUSE_NAMES: Record<string, string> = {
    'K87': 'Kho xe ô tô QL13 - HCM',
    'K86': 'Kho xe ô tô VinFast Q12 - HCM',
    'K83': 'Kho xe ô tô Thuận An',
    'K106': 'Kho xe ô tô Hà Huy Giáp',
    'K103': 'Kho xe ô tô Lĩnh Nam',
    'K17': 'Kho xe SR Cam Giá',
    'KTN.NM': 'Kho xe Nhà máy SXLR - Thái Nguyên',
    'KTN.TT': 'Kho xe Tân Thịnh - Thái Nguyên',
    'KTN.TL': 'Kho xe Tân Long - Thái Nguyên',
    'K74': 'Kho xe ô tô Vinfast Mê Linh'
};

const MODEL_NAME_FALLBACK: Record<string, string> = {
    'VF304': 'VF3 tiêu chuẩn 2 màu nâng cao',
    'VF301': 'VF3 Tiêu Chuẩn',
    'VF3': 'VF 3',
    'VF501': 'VF5 Plus',
    'VF5': 'VF 5',
    'VF6': 'VF 6',
    'VF601': 'VF6 Plus',
    'VF7': 'VF 7',
    'VF701': 'VF7 Plus',
    'VF8': 'VF 8',
    'VF801': 'VF8 Eco',
    'VF802': 'VF8 Plus',
    'VF9': 'VF 9',
    'VF901': 'VF9 Eco',
    'VF902': 'VF9 Plus',
    'ECVANNCCT': 'EC VAN Nâng cao Cửa trượt',
    'ECVANNCTC': 'EC VAN Nâng cao Cửa mở',
    'ECVANTC': 'EC VAN Tiêu chuẩn',
    'ECVAN': 'EC VAN',
    'VFMPV7': 'VF MPV 7',
    'LIMO': 'LIMO GREEN'
};

const COLOR_NAME_FALLBACK: Record<string, string> = {
    'CE1W': 'Xanh Lá Nhạt',
    'CE2Q': 'Màu đỏ Ruby',
    'CE18': 'Trắng',
    'CE17': 'Bạc',
    'CE19': 'Đen',
    'CE11': 'Xanh Dương',
    'CE16': 'Xám',
    'CE14': 'Đỏ',
    'CE1A': 'Vàng',
    'CE24': 'Hồng Tím',
    'CE1F': 'Xanh Rêu'
};

export const formatVietnameseModelName = (maKx?: string, tenKx?: string): string => {
    const cleanKx = (maKx || '').trim().toUpperCase();
    const cleanTen = (tenKx || '').trim();
    if (cleanTen && cleanTen.toUpperCase() !== cleanKx) {
        return cleanTen;
    }
    return MODEL_NAME_FALLBACK[cleanKx] || cleanTen || cleanKx || 'VF 3';
};

export const formatVietnameseColorName = (maMau?: string, tenMau?: string): string => {
    const cleanMau = (maMau || '').trim().toUpperCase();
    const cleanTen = (tenMau || '').trim();
    if (cleanTen && cleanTen.toUpperCase() !== cleanMau) {
        return cleanTen;
    }
    return COLOR_NAME_FALLBACK[cleanMau] || cleanTen || cleanMau || 'Trắng';
};

export const CyberDnxPrintModal: React.FC<CyberDnxPrintModalProps> = ({
    isOpen,
    onClose,
    data
}) => {
    const printContentRef = useRef<HTMLDivElement>(null);

    // Đóng modal khi bấm phím ESC
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !data) return null;

    const now = new Date();
    const dateStr = data.ngay_ct || now.toISOString().slice(0, 10);
    const [year, month, day] = dateStr.split('-');
    const formattedVoucherDate = `${day || String(now.getDate()).padStart(2, '0')}/${month || String(now.getMonth() + 1).padStart(2, '0')}/${year || now.getFullYear()}`;
    const formattedPrintDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const formattedPrintTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const getOfficialWarehouseName = (code?: string, name?: string): string => {
        const cleanCode = (code || '').trim().toUpperCase();
        if (cleanCode && WAREHOUSE_NAMES[cleanCode]) {
            return WAREHOUSE_NAMES[cleanCode];
        }
        if (name) {
            // Nếu name bị tiền tố như "K87 - QL13 (HCM)" thì dùng tên chuẩn từ Cyber
            for (const [k, v] of Object.entries(WAREHOUSE_NAMES)) {
                if (name.toUpperCase().startsWith(k)) return v;
            }
            return name;
        }
        return code || '';
    };

    const warehouseOutName = getOfficialWarehouseName(data.ma_kho_xuat, data.ten_kho_xuat);
    const warehouseInName = getOfficialWarehouseName(data.ma_kho_nhan, data.ten_kho_nhan);

    const handlePrint = () => {
        const printElem = printContentRef.current;
        if (!printElem) return;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow?.document;
        if (!iframeDoc) {
            document.body.removeChild(iframe);
            return;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Đề Nghị Xuất Xe - ${data.so_ct}</title>
                <style>
                    @page {
                        size: A4 landscape;
                        margin: 8mm 12mm 8mm 12mm;
                    }
                    * {
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Times New Roman', Times, serif;
                        font-size: 11pt;
                        line-height: 1.35;
                        color: #000;
                        background: #fff;
                        margin: 0;
                        padding: 0;
                    }
                    .company-block {
                        margin-bottom: 8px;
                    }
                    .company-name {
                        font-weight: bold;
                        font-size: 11.5pt;
                        text-transform: uppercase;
                    }
                    .company-addr {
                        font-size: 10.5pt;
                    }
                    .voucher-title {
                        text-align: center;
                        font-size: 19pt;
                        font-weight: bold;
                        text-transform: uppercase;
                        margin-top: 4px;
                        margin-bottom: 4px;
                        letter-spacing: 0.5px;
                    }
                    .date-row {
                        position: relative;
                        text-align: center;
                        font-size: 11pt;
                        font-weight: bold;
                        margin-bottom: 14px;
                    }
                    .date-center {
                        display: inline-block;
                    }
                    .num-right {
                        position: absolute;
                        right: 0;
                        top: 0;
                        font-weight: normal;
                    }
                    .num-right strong {
                        font-weight: bold;
                    }
                    .info-grid {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 14px;
                        font-size: 11pt;
                    }
                    .info-grid td {
                        padding: 2.5px 0;
                        vertical-align: top;
                    }
                    .info-label {
                        width: 120px;
                        font-weight: bold;
                    }
                    .info-val {
                        font-weight: normal;
                    }
                    .info-val.bold-name {
                        font-weight: bold;
                        text-transform: uppercase;
                    }
                    .cyber-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 6px;
                        margin-bottom: 25px;
                        font-size: 9.5pt;
                    }
                    .cyber-table th, .cyber-table td {
                        border: 1px solid #000;
                        padding: 4px 5px;
                    }
                    .cyber-table th {
                        background-color: #ffdcb9 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        font-weight: bold;
                        text-align: center;
                        vertical-align: middle;
                    }
                    .cyber-table td {
                        vertical-align: middle;
                    }
                    .text-center { text-align: center; }
                    .text-left { text-align: left; }
                    .text-right { text-align: right; }
                    .signatures-row {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 20px;
                        margin-bottom: 50px;
                        page-break-inside: avoid;
                        font-size: 11pt;
                    }
                    .sig-col {
                        width: 45%;
                        text-align: center;
                    }
                    .sig-date {
                        font-weight: bold;
                        font-style: italic;
                        margin-bottom: 4px;
                    }
                    .sig-title {
                        font-weight: bold;
                        text-transform: uppercase;
                        margin-bottom: 2px;
                    }
                    .sig-subtitle {
                        font-style: italic;
                        font-size: 10.5pt;
                    }
                    .sig-space {
                        height: 60px;
                    }
                    .sig-name {
                        font-weight: bold;
                        font-size: 11.5pt;
                    }
                    .footer-bottom {
                        position: fixed;
                        bottom: 4mm;
                        left: 12mm;
                        right: 12mm;
                        display: flex;
                        justify-content: space-between;
                        font-size: 10pt;
                    }
                </style>
            </head>
            <body>
                ${printElem.innerHTML}
            </body>
            </html>
        `;

        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => {
                try {
                    document.body.removeChild(iframe);
                } catch (_) {}
            }, 1500);
        }, 300);
    };

    const modalContent = (
        <div 
            className="fixed inset-0 z-[9999999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[1220px] h-[92vh] max-h-[92vh] flex flex-col overflow-hidden animate-scale-in relative z-10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Nút đóng góc phải trên */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-900 text-white shadow-md flex items-center justify-center transition-all cursor-pointer"
                    title="Đóng (ESC)"
                >
                    <i className="fas fa-times text-xs"></i>
                </button>

                {/* Printable Document Container */}
                <div className="flex-1 min-h-0 overflow-y-auto bg-slate-300/80 p-4 sm:p-6 custom-scrollbar flex justify-center items-start">
                    
                    {/* A4 Landscape Sheet Container (Khớp 100% ĐNX.pdf) */}
                    <div 
                        ref={printContentRef}
                        className="bg-white text-black shadow-2xl border border-slate-300 p-8 sm:p-10 w-full max-w-[280mm] min-h-[195mm] text-[11pt] leading-snug select-text flex flex-col justify-between my-2"
                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                        <div>
                            {/* 1. Thông tin Đơn vị chủ quản bên góc trái trên cùng */}
                            <div className="company-block mb-2">
                                <div className="company-name font-bold text-[11.5pt] uppercase text-black">
                                    CÔNG TY TNHH MINH ĐẠO PHÁT
                                </div>
                                <div className="company-addr text-[10.5pt] text-black">
                                    Tổ dân phố Cam Giá 2, Phường Gia Sàng, Tỉnh Thái Nguyên, Việt Nam
                                </div>
                            </div>

                            {/* 2. Tiêu đề Phiếu chính giữa */}
                            <div className="voucher-title text-center text-[19pt] font-bold uppercase mt-1 mb-1 tracking-wide">
                                ĐỀ NGHỊ XUẤT XE
                            </div>

                            {/* 3. Dòng Ngày Tháng (ở giữa) & Số chứng từ (căn sát phải) */}
                            <div className="date-row relative text-center text-[11pt] font-bold mb-4">
                                <div className="date-center">
                                    Ngày: {formattedVoucherDate}
                                </div>
                                <div className="num-right absolute right-0 top-0 font-normal text-[11pt]">
                                    Số: <strong className="font-bold">{data.so_ct}</strong>
                                </div>
                            </div>

                            {/* 4. Khối 4 dòng thông tin Người nhận / Đơn vị / Địa chỉ / Nội dung */}
                            <table className="info-grid w-full mb-3 text-[11pt]">
                                <tbody>
                                    <tr>
                                        <td className="info-label w-28 font-bold text-black py-0.5">Người nhận:</td>
                                        <td className="info-val font-bold uppercase text-black py-0.5">
                                            {data.khach_hang || data.user_name || 'NGÔ TRÍ DŨNG'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-label w-28 font-bold text-black py-0.5">Đơn vị:</td>
                                        <td className="info-val text-black py-0.5">{data.don_vi || 'Thuận An'}</td>
                                    </tr>
                                    <tr>
                                        <td className="info-label w-28 font-bold text-black py-0.5">Địa chỉ:</td>
                                        <td className="info-val text-black py-0.5"></td>
                                    </tr>
                                    <tr>
                                        <td className="info-label w-28 font-bold text-black py-0.5">Nội dung:</td>
                                        <td className="info-val text-black py-0.5">
                                            {data.ly_do || 'Điều chuyển xe nội bộ làm PDI chuẩn bị giao KH'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* 5. Bảng danh sách xe chuẩn Cyber (Header cam nhạt #ffdcb9, 2 tầng) */}
                            <table className="cyber-table w-full border-collapse my-2 text-[9.5pt]">
                                <thead>
                                    <tr style={{ backgroundColor: '#ffdcb9' }}>
                                        <th rowSpan={2} className="border border-black p-1 text-center w-10 font-bold bg-[#ffdcb9]">STT</th>
                                        <th colSpan={2} className="border border-black p-1 text-center font-bold bg-[#ffdcb9]">Kiểu xe</th>
                                        <th colSpan={2} className="border border-black p-1 text-center font-bold bg-[#ffdcb9]">Màu xe</th>
                                        <th rowSpan={2} className="border border-black p-1 text-center w-40 font-bold bg-[#ffdcb9]">Số khung</th>
                                        <th rowSpan={2} className="border border-black p-1 text-center w-36 font-bold bg-[#ffdcb9]">Số máy</th>
                                        <th rowSpan={2} className="border border-black p-1 text-center w-28 font-bold bg-[#ffdcb9]">Nơi đi</th>
                                        <th rowSpan={2} className="border border-black p-1 text-center w-28 font-bold bg-[#ffdcb9]">Nơi đến</th>
                                        <th rowSpan={2} className="border border-black p-1 text-center font-bold bg-[#ffdcb9]">Ghi chú</th>
                                    </tr>
                                    <tr style={{ backgroundColor: '#ffdcb9' }}>
                                        <th className="border border-black p-1 text-center w-16 font-bold bg-[#ffdcb9]">Mã</th>
                                        <th className="border border-black p-1 text-center font-bold bg-[#ffdcb9]">Tên</th>
                                        <th className="border border-black p-1 text-center w-12 font-bold bg-[#ffdcb9]">Mã</th>
                                        <th className="border border-black p-1 text-center w-16 font-bold bg-[#ffdcb9]">Tên</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.cars.map((car, idx) => (
                                        <tr key={idx}>
                                            <td className="border border-black p-1.5 text-center font-medium">{idx + 1}</td>
                                            <td className="border border-black p-1.5 text-center font-medium uppercase">{car.ma_kx || 'LIMO'}</td>
                                            <td className="border border-black p-1.5 text-left font-medium">{formatVietnameseModelName(car.ma_kx, car.ten_kx || car.dong_xe)}</td>
                                            <td className="border border-black p-1.5 text-center font-medium uppercase">{car.ma_mau || 'CE17'}</td>
                                            <td className="border border-black p-1.5 text-center font-medium">{formatVietnameseColorName(car.ma_mau, car.ten_mau)}</td>
                                            <td className="border border-black p-1.5 text-center font-medium">{car.vin}</td>
                                            <td className="border border-black p-1.5 text-center font-medium break-all">{car.so_may || '-'}</td>
                                            <td className="border border-black p-1.5 text-center text-[9pt]">{warehouseOutName}</td>
                                            <td className="border border-black p-1.5 text-center text-[9pt]">{warehouseInName}</td>
                                            <td className="border border-black p-1.5 text-left text-[9pt]">
                                                {car.ghi_chu || data.ly_do || 'Điều chuyển xe nội bộ làm PDI chuẩn bị giao KH'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* 6. Chữ ký 2 bên: Người đề nghị (trái) & Phụ trách chi nhánh (phải) */}
                            <div className="signatures-row flex justify-between mt-8 text-[11pt]">
                                <div className="sig-col w-[45%] text-center">
                                    <div className="sig-date font-bold italic text-[10.5pt] mb-1">
                                        Xuất ngày.....tháng.....năm..........
                                    </div>
                                    <div className="sig-title font-bold uppercase text-[11pt]">
                                        NGƯỜI ĐỀ NGHỊ
                                    </div>
                                    <div className="sig-subtitle italic text-[10pt] text-slate-700 mb-2">
                                        (Ký, ghi rõ họ tên)
                                    </div>
                                    <div className="sig-space h-16"></div>
                                    <div className="sig-name font-bold text-[11.5pt] text-black">
                                        Phạm Thành Nhân
                                    </div>
                                </div>

                                <div className="sig-col w-[45%] text-center">
                                    <div className="sig-date font-bold italic text-[10.5pt] mb-1">
                                        Nhập ngày..... tháng..... năm..........
                                    </div>
                                    <div className="sig-title font-bold uppercase text-[11pt]">
                                        PHỤ TRÁCH CHI NHÁNH
                                    </div>
                                    <div className="sig-subtitle italic text-[10pt] text-slate-700 mb-2">
                                        (Ký, ghi rõ họ tên)
                                    </div>
                                    <div className="sig-space h-16"></div>
                                    <div className="sig-name font-bold text-[11.5pt] text-black">
                                        Trần Bảo Khôi
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 7. Footer đáy trang: Trang 1 (bên trái) và Ngày Giờ (bên phải) */}
                        <div className="footer-bottom flex justify-between text-[10pt] pt-12 text-slate-800">
                            <div>Trang 1</div>
                            <div>
                                <span>Ngày: {formattedPrintDate}</span>
                                <span className="ml-6">Giờ: {formattedPrintTime}</span>
                            </div>
                        </div>

                    </div>

                </div>

                {/* Modal Footer Controls */}
                <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                        <span>Số chứng từ:</span>
                        <strong className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{data.so_ct}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                            Đóng
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <i className="fas fa-print"></i>
                            <span>In Phiếu Ngay (A4 Ngang)</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
