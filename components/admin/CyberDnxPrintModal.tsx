import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { exportCyberPdf, getCyberViewPdfUrl } from '../../services/api/stockService';

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
    ma_gd?: string;
    ten_gd?: string;
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

// Hàm format ngày hiển thị: YYYY-MM-DD -> DD/MM/YYYY
const formatDisplayDate = (dStr?: string) => {
    if (!dStr) return new Date().toLocaleDateString('vi-VN');
    const parts = dStr.split('T')[0].split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dStr;
};

// Hàm xuất HTML chuẩn in ấn A4
const generateDnxHtml = (data: CyberDnxPrintData, showSignatures: boolean): string => {
    const formattedDate = formatDisplayDate(data.ngay_ct);
    const dateObj = data.ngay_ct ? new Date(data.ngay_ct) : new Date();
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();

    const carRows = (data.cars || []).map((car, idx) => `
        <tr>
            <td style="text-align: center; padding: 6px 4px;">${idx + 1}</td>
            <td style="font-family: 'Consolas', monospace; font-weight: bold; padding: 6px 8px; font-size: 11pt;">${car.vin || '-'}</td>
            <td style="font-family: 'Consolas', monospace; padding: 6px 8px; font-size: 10.5pt;">${car.so_may || '-'}</td>
            <td style="padding: 6px 8px;">${car.ten_kx || car.dong_xe || car.ma_kx || '-'}</td>
            <td style="padding: 6px 8px;">${car.ten_mau || car.ma_mau || '-'}</td>
            <td style="padding: 6px 8px; font-size: 10pt;">${car.ghi_chu || data.ly_do || 'Xuất xe giao KH'}</td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Phiếu Đề Nghị Xuất Xe - ${data.so_ct}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 12mm 15mm 15mm 15mm;
        }
        * { box-sizing: border-box; }
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.35;
            color: #111;
            background: #fff;
            margin: 0;
            padding: 0;
        }
        .page-container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }
        .header-table td {
            vertical-align: top;
            padding: 0;
        }
        .company-name {
            font-size: 11pt;
            font-weight: bold;
            text-transform: uppercase;
        }
        .company-sub {
            font-size: 9.5pt;
            color: #333;
        }
        .doc-meta {
            text-align: right;
            font-size: 9.5pt;
        }
        .doc-meta strong {
            font-size: 10pt;
        }
        .title-block {
            text-align: center;
            margin: 10px 0 15px 0;
        }
        .title-main {
            font-size: 17pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 4px 0;
        }
        .title-sub {
            font-size: 10.5pt;
            font-style: italic;
            color: #222;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            font-size: 11pt;
        }
        .info-table td {
            padding: 3px 0;
            vertical-align: top;
        }
        .info-lbl {
            width: 140px;
            font-weight: normal;
        }
        .info-val {
            font-weight: bold;
        }
        table.car-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0 16px 0;
            font-size: 10.5pt;
        }
        table.car-table th, table.car-table td {
            border: 1px solid #222;
            padding: 5px 6px;
        }
        table.car-table th {
            background-color: #f1f3f5;
            font-weight: bold;
            text-align: center;
        }
        .sig-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            page-break-inside: avoid;
        }
        .sig-table td {
            width: 25%;
            text-align: center;
            vertical-align: top;
            padding: 0 4px;
        }
        .sig-title {
            font-weight: bold;
            font-size: 10.5pt;
            text-transform: uppercase;
        }
        .sig-sub {
            font-size: 9pt;
            font-style: italic;
            color: #444;
            margin-bottom: 45px;
        }
        .sig-name {
            font-weight: bold;
            font-size: 10pt;
        }
        .sig-stamp {
            display: inline-block;
            border: 1.5px dashed #2563eb;
            color: #1d4ed8;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 8.5pt;
            font-weight: bold;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="page-container">
        <!-- ĐẦU TRANG -->
        <table class="header-table">
            <tr>
                <td style="width: 60%;">
                    <div class="company-name">CÔNG TY TNHH MINH ĐẠO PHÁT</div>
                    <div class="company-sub"><strong>SHOWROOM VINFAST THUẬN AN</strong></div>
                    <div class="company-sub">Địa chỉ: KP. Bình Đức 2, P. Bình Hòa, TP. Thuận An, Bình Dương</div>
                </td>
                <td style="width: 40%;" class="doc-meta">
                    <div><strong>Mẫu số: PXX00</strong></div>
                    <div>(Ban hành theo QĐ CyberSoft)</div>
                    <div style="margin-top: 4px; font-weight: bold; color: #0f172a;">Số: ${data.so_ct}</div>
                </td>
            </tr>
        </table>

        <!-- TIÊU ĐỀ -->
        <div class="title-block">
            <div class="title-main">PHIẾU ĐỀ NGHỊ XUẤT XE</div>
            <div class="title-sub">Ngày ${day} tháng ${month} năm ${year}</div>
            ${data.ten_gd || data.ma_gd ? `
                <div style="font-size: 10pt; color: #475569; margin-top: 3px;">
                    Tính chất: <strong>${data.ten_gd || (String(data.ma_gd) === '9' ? 'Điều chuyển xe các điểm KD' : 'Điều chuyển xe nội bộ điểm KD')}</strong>
                </div>
            ` : ''}
        </div>

        <!-- THÔNG TIN PHIẾU -->
        <table class="info-table">
            <tr>
                <td class="info-lbl">Họ tên người đề nghị:</td>
                <td class="info-val">${data.user_name || 'Phạm Thành Nhân'}</td>
                <td class="info-lbl" style="width: 110px;">Bộ phận/Đơn vị:</td>
                <td class="info-val" style="width: 160px;">${data.don_vi || 'Kinh doanh'}</td>
            </tr>
            <tr>
                <td class="info-lbl">Khách hàng:</td>
                <td class="info-val" colspan="3">${data.khach_hang || 'Giao xe Khách Hàng'}</td>
            </tr>
            <tr>
                <td class="info-lbl">Kho xuất:</td>
                <td class="info-val">${data.ten_kho_xuat ? `${data.ten_kho_xuat} (${data.ma_kho_xuat})` : data.ma_kho_xuat}</td>
                <td class="info-lbl">Kho nhận:</td>
                <td class="info-val">${data.ten_kho_nhan ? `${data.ten_kho_nhan} (${data.ma_kho_nhan})` : data.ma_kho_nhan}</td>
            </tr>
            <tr>
                <td class="info-lbl">Lý do đề nghị xuất:</td>
                <td class="info-val" colspan="3">${data.ly_do || 'Điều chuyển xe làm PDI chuẩn bị bàn giao KH'}</td>
            </tr>
        </table>

        <!-- BẢNG DANH SÁCH XE -->
        <table class="car-table">
            <thead>
                <tr>
                    <th style="width: 35px;">STT</th>
                    <th style="width: 170px;">Số Khung (VIN)</th>
                    <th style="width: 120px;">Số Máy</th>
                    <th>Dòng Xe / Phiên Bản</th>
                    <th style="width: 100px;">Màu Ngoại Thất</th>
                    <th style="width: 140px;">Ghi Chú</th>
                </tr>
            </thead>
            <tbody>
                ${carRows}
            </tbody>
        </table>

        <div style="font-size: 10.5pt; font-style: italic; margin-bottom: 15px;">
            Tổng cộng: <strong>${data.cars?.length || 1}</strong> xe. Kính đề nghị Ban Giám Đốc và các bộ phận liên quan phê duyệt xuất xe.
        </div>

        <!-- KHU VỰC KÝ TÊN -->
        <table class="sig-table">
            <tr>
                <td>
                    <div class="sig-title">Người Lập Phiếu</div>
                    <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
                    ${showSignatures ? `
                        <div class="sig-stamp">✓ Đã xác nhận</div>
                        <div class="sig-name">${data.user_name || 'Phạm Thành Nhân'}</div>
                    ` : '<div style="height: 50px;"></div>'}
                </td>
                <td>
                    <div class="sig-title">Kế Toán Bán Hàng</div>
                    <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
                    ${showSignatures ? `
                        <div class="sig-stamp">✓ Đã kiểm soát</div>
                        <div class="sig-name">KT Bán Hàng</div>
                    ` : '<div style="height: 50px;"></div>'}
                </td>
                <td>
                    <div class="sig-title">Trưởng Phòng KD</div>
                    <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
                    ${showSignatures ? `
                        <div class="sig-stamp">✓ Đã duyệt</div>
                        <div class="sig-name">TP Bán Hàng</div>
                    ` : '<div style="height: 50px;"></div>'}
                </td>
                <td>
                    <div class="sig-title">Ban Giám Đốc</div>
                    <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
                    ${showSignatures ? `
                        <div class="sig-stamp">✓ Phê duyệt</div>
                        <div class="sig-name">Ban Giám Đốc</div>
                    ` : '<div style="height: 50px;"></div>'}
                </td>
            </tr>
        </table>
    </div>
</body>
</html>`;
};

// Hàm kích hoạt in trực tiếp qua iframe ẩn
const printHtmlDocument = (htmlContent: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 1500);
    }, 300);
};

export const CyberDnxPrintModal: React.FC<CyberDnxPrintModalProps> = ({
    isOpen,
    onClose,
    data
}) => {
    const pdfIframeRef = useRef<HTMLIFrameElement>(null);
    const [showSignatures, setShowSignatures] = useState(true);
    
    // PDF kết xuất trực tiếp từ CyberSoft ERP Engine
    const [cyberPdfUrl, setCyberPdfUrl] = useState<string | null>(null);
    const [cyberPdfError, setCyberPdfError] = useState<string | null>(null);
    const [isCyberLoading, setIsCyberLoading] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [activeView, setActiveView] = useState<'pdf' | 'html'>('html');

    // Kết xuất PDF từ CyberSoft ERP Engine
    useEffect(() => {
        if (!isOpen || !data) return;

        // Nếu không có stt_rec (chỉ có data cục bộ), dùng ngay HTML view
        if (!data.stt_rec) {
            setActiveView('html');
            return;
        }

        setCyberPdfUrl(null);
        setCyberPdfError(null);

        const sigSuffix = showSignatures ? '_sig' : '_nosig';
        const cleanStt = data.stt_rec.replace(/[^a-zA-Z0-9_-]/g, '_') + sigSuffix;
        const cachedUrl = getCyberViewPdfUrl(cleanStt);

        let isMounted = true;
        const loadOfficialPdf = async () => {
            setIsCyberLoading(true);
            setCyberPdfError(null);

            // Bước 1: Thử lấy file PDF từ cache
            try {
                const cacheCheck = await fetch(cachedUrl, { method: 'GET' });
                if (cacheCheck.ok && isMounted) {
                    setCyberPdfUrl(`${cachedUrl}&t=${Date.now()}`);
                    setActiveView('pdf');
                    setIsCyberLoading(false);
                    return;
                }
            } catch (_) { /* bỏ qua lỗi */ }

            // Bước 2: Thử gọi exportCyberPdf từ server
            try {
                const res = await exportCyberPdf({
                    stt_rec: data.stt_rec!,
                    voucher_type: 'DNX',
                    paper_size: 'A4',
                    user_name: data.user_name || '02.NHANPT',
                    include_signatures: showSignatures
                });

                if (!isMounted) return;

                if (res.success && (res.pdf_base64 || res.pdf_url)) {
                    setCyberPdfUrl(res.pdf_base64 || `${res.pdf_url}&t=${Date.now()}`);
                    setActiveView('pdf');
                } else {
                    // Chuyển mượt mà sang bản in HTML chuẩn A4 thay vì chặn lỗi người dùng
                    setCyberPdfError(res.error || 'Máy chủ Cyber chưa có file PDF gốc.');
                    setActiveView('html');
                }
            } catch (err: any) {
                if (isMounted) {
                    setCyberPdfError(err.message || 'Chưa thể kết xuất file PDF từ máy chủ.');
                    setActiveView('html');
                }
            } finally {
                if (isMounted) {
                    setIsCyberLoading(false);
                }
            }
        };

        loadOfficialPdf();

        return () => {
            isMounted = false;
        };
    }, [isOpen, data?.stt_rec, showSignatures, retryCount]);

    // Đóng khi bấm phím ESC
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !data) return null;

    // In phiếu: Nếu đang ở view PDF thì in PDF, nếu ở view HTML thì in bản in trực tiếp chuẩn A4
    const handlePrint = () => {
        if (activeView === 'pdf' && cyberPdfUrl) {
            if (pdfIframeRef.current?.contentWindow) {
                try {
                    pdfIframeRef.current.contentWindow.focus();
                    pdfIframeRef.current.contentWindow.print();
                    return;
                } catch (_) {}
            }
            const printWindow = window.open(cyberPdfUrl, '_blank');
            printWindow?.focus();
        } else {
            const html = generateDnxHtml(data, showSignatures);
            printHtmlDocument(html);
        }
    };

    // Tải PDF Cyber gốc về máy
    const handleDownloadPdfCyber = () => {
        if (!cyberPdfUrl) return;
        const link = document.createElement('a');
        link.href = cyberPdfUrl;
        link.download = `De_Nghi_Xuat_Xe_${data.so_ct.replace(/[\/\\?%*:|"<>]/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formattedDate = formatDisplayDate(data.ngay_ct);

    return ReactDOM.createPortal(
        <div 
            className="fixed inset-0 z-[2147483647] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[1100px] h-[95vh] max-h-[95vh] flex flex-col overflow-hidden animate-scale-in relative z-10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header thanh tiêu đề Modal */}
                <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-sm font-bold">
                            <i className="fas fa-file-invoice"></i>
                        </span>
                        <div>
                            <div className="text-sm font-bold flex items-center gap-2">
                                <span>Phiếu Đề Nghị Xuất Xe</span>
                                <span className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-extrabold uppercase font-mono tracking-wide">
                                    {data.so_ct}
                                </span>
                                {(data.ten_gd || data.ma_gd) && (
                                    <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                                        {data.ten_gd || (String(data.ma_gd) === '9' ? 'Điều chuyển xe các điểm KD' : 'Điều chuyển xe nội bộ điểm KD')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Switch View Tabs nếu có PDF */}
                        {cyberPdfUrl && (
                            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs mr-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveView('html')}
                                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                                        activeView === 'html'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Bản In Chuẩn A4
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveView('pdf')}
                                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                                        activeView === 'pdf'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    File PDF Cyber
                                </button>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                            title="Đóng (ESC)"
                        >
                            <i className="fas fa-times text-xs"></i>
                        </button>
                    </div>
                </div>

                {/* Notice thông báo khi chuyển sang Bản in trực tiếp */}
                {activeView === 'html' && (
                    <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900 shrink-0">
                        <div className="flex items-center gap-2">
                            <i className="fas fa-check-circle text-blue-600"></i>
                            <span>
                                Đang xem <strong>Bản in trực tiếp chuẩn CyberSoft A4 (Mẫu PXX00)</strong>. Sẵn sàng in ngay!
                            </span>
                        </div>
                        {isCyberLoading ? (
                            <span className="flex items-center gap-1.5 text-blue-700">
                                <i className="fas fa-spinner fa-spin text-xs"></i> Đang dò file PDF Cyber...
                            </span>
                        ) : !cyberPdfUrl ? (
                            <button
                                type="button"
                                onClick={() => { setRetryCount(c => c + 1); }}
                                className="text-blue-700 hover:text-blue-900 underline font-semibold cursor-pointer"
                            >
                                Thử tải PDF Cyber
                            </button>
                        ) : null}
                    </div>
                )}

                {/* Body Area: Bản in HTML hoặc PDF Iframe */}
                <div className="flex-1 min-h-0 overflow-auto bg-slate-100/90 flex flex-col items-center p-4 relative">
                    {activeView === 'pdf' && cyberPdfUrl ? (
                        <iframe
                            ref={pdfIframeRef}
                            src={cyberPdfUrl}
                            className="w-full h-full border-0 bg-white shadow-lg rounded-lg"
                            title={`Đề Nghị Xuất Xe - ${data.so_ct}`}
                        />
                    ) : (
                        /* BẢN IN TRỰC TIẾP CHUẨN A4 */
                        <div className="bg-white text-slate-900 w-full max-w-[800px] shadow-2xl rounded-sm p-8 sm:p-10 border border-slate-300 font-serif my-auto">
                            {/* Đầu trang */}
                            <div className="flex justify-between items-start border-b border-slate-300 pb-3 mb-4">
                                <div>
                                    <div className="font-bold text-[13px] uppercase tracking-wide text-slate-900">
                                        CÔNG TY TNHH MINH ĐẠO PHÁT
                                    </div>
                                    <div className="text-[12px] font-bold text-blue-800">
                                        SHOWROOM VINFAST THUẬN AN
                                    </div>
                                    <div className="text-[11px] text-slate-600">
                                        KP. Bình Đức 2, P. Bình Hòa, TP. Thuận An, Bình Dương
                                    </div>
                                </div>
                                <div className="text-right text-[11px] text-slate-600">
                                    <div className="font-bold text-slate-800">Mẫu số: PXX00</div>
                                    <div>(Ban hành theo QĐ CyberSoft)</div>
                                    <div className="mt-1 font-bold font-mono text-[13px] text-blue-900">
                                        Số: {data.so_ct}
                                    </div>
                                </div>
                            </div>

                            {/* Tiêu đề phiếu */}
                            <div className="text-center my-4">
                                <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-950 tracking-wider">
                                    PHIẾU ĐỀ NGHỊ XUẤT XE
                                </h1>
                                <div className="text-xs italic text-slate-600 mt-1">
                                    Ngày {formattedDate}
                                </div>
                                {(data.ten_gd || data.ma_gd) && (
                                    <div className="text-xs text-slate-700 font-medium mt-1">
                                        Tính chất: <strong>{data.ten_gd || (String(data.ma_gd) === '9' ? 'Điều chuyển xe các điểm KD' : 'Điều chuyển xe nội bộ điểm KD')}</strong>
                                    </div>
                                )}
                            </div>

                            {/* Thông tin phiếu */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] mb-4 bg-slate-50/60 p-3.5 rounded-lg border border-slate-200">
                                <div>
                                    <span className="text-slate-600">Người đề nghị: </span>
                                    <strong className="text-slate-900">{data.user_name || 'Phạm Thành Nhân'}</strong>
                                </div>
                                <div>
                                    <span className="text-slate-600">Đơn vị: </span>
                                    <strong className="text-slate-900">{data.don_vi || 'VinFast Thuận An'}</strong>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-slate-600">Khách hàng: </span>
                                    <strong className="text-blue-950">{data.khach_hang || 'Giao xe Khách Hàng'}</strong>
                                </div>
                                <div>
                                    <span className="text-slate-600">Kho xuất: </span>
                                    <strong className="text-slate-900">{data.ten_kho_xuat ? `${data.ten_kho_xuat} (${data.ma_kho_xuat})` : data.ma_kho_xuat}</strong>
                                </div>
                                <div>
                                    <span className="text-slate-600">Kho nhận: </span>
                                    <strong className="text-slate-900">{data.ten_kho_nhan ? `${data.ten_kho_nhan} (${data.ma_kho_nhan})` : data.ma_kho_nhan}</strong>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-slate-600">Lý do đề nghị xuất: </span>
                                    <strong className="text-slate-900">{data.ly_do || 'Điều chuyển xe làm PDI chuẩn bị bàn giao KH'}</strong>
                                </div>
                            </div>

                            {/* Bảng danh sách xe */}
                            <div className="overflow-x-auto mb-4">
                                <table className="w-full border-collapse border border-slate-800 text-[11.5px]">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-900">
                                            <th className="border border-slate-800 p-2 text-center w-10">STT</th>
                                            <th className="border border-slate-800 p-2 text-center">Số Khung (VIN)</th>
                                            <th className="border border-slate-800 p-2 text-center">Số Máy</th>
                                            <th className="border border-slate-800 p-2 text-center">Dòng Xe / Phiên Bản</th>
                                            <th className="border border-slate-800 p-2 text-center">Màu Xe</th>
                                            <th className="border border-slate-800 p-2 text-center">Ghi Chú</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data.cars || []).map((car, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="border border-slate-800 p-2 text-center font-bold">{idx + 1}</td>
                                                <td className="border border-slate-800 p-2 font-mono font-bold text-slate-950">{car.vin}</td>
                                                <td className="border border-slate-800 p-2 font-mono text-slate-700">{car.so_may || '-'}</td>
                                                <td className="border border-slate-800 p-2 font-semibold text-slate-900">{car.ten_kx || car.dong_xe || car.ma_kx || '-'}</td>
                                                <td className="border border-slate-800 p-2 text-slate-800">{car.ten_mau || car.ma_mau || '-'}</td>
                                                <td className="border border-slate-800 p-2 text-slate-600 text-[11px]">{car.ghi_chu || data.ly_do || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="text-[11.5px] italic text-slate-600 mb-6">
                                Tổng cộng: <strong>{data.cars?.length || 1}</strong> xe. Kính đề nghị Ban Giám Đốc và các bộ phận liên quan phê duyệt xuất xe.
                            </div>

                            {/* Khu vực chữ ký */}
                            <div className="grid grid-cols-4 gap-2 text-center text-[11.5px] mt-4 pt-2">
                                <div>
                                    <div className="font-bold uppercase text-slate-900">Người Đề Nghị</div>
                                    <div className="text-[10px] italic text-slate-500 mb-6">(Ký, ghi rõ họ tên)</div>
                                    {showSignatures ? (
                                        <div>
                                            <span className="inline-block text-[10px] px-2 py-0.5 rounded border border-blue-500 text-blue-700 font-bold uppercase mb-1">
                                                ✓ Đã ký
                                            </span>
                                            <div className="font-bold text-slate-900">{data.user_name || 'Phạm Thành Nhân'}</div>
                                        </div>
                                    ) : <div className="h-10"></div>}
                                </div>
                                <div>
                                    <div className="font-bold uppercase text-slate-900">Kế Toán BH</div>
                                    <div className="text-[10px] italic text-slate-500 mb-6">(Ký, ghi rõ họ tên)</div>
                                    {showSignatures ? (
                                        <div>
                                            <span className="inline-block text-[10px] px-2 py-0.5 rounded border border-blue-500 text-blue-700 font-bold uppercase mb-1">
                                                ✓ Đã duyệt
                                            </span>
                                            <div className="font-bold text-slate-900">KT Bán Hàng</div>
                                        </div>
                                    ) : <div className="h-10"></div>}
                                </div>
                                <div>
                                    <div className="font-bold uppercase text-slate-900">Trưởng Phòng KD</div>
                                    <div className="text-[10px] italic text-slate-500 mb-6">(Ký, ghi rõ họ tên)</div>
                                    {showSignatures ? (
                                        <div>
                                            <span className="inline-block text-[10px] px-2 py-0.5 rounded border border-blue-500 text-blue-700 font-bold uppercase mb-1">
                                                ✓ Đã duyệt
                                            </span>
                                            <div className="font-bold text-slate-900">TP Bán Hàng</div>
                                        </div>
                                    ) : <div className="h-10"></div>}
                                </div>
                                <div>
                                    <div className="font-bold uppercase text-slate-900">Ban Giám Đốc</div>
                                    <div className="text-[10px] italic text-slate-500 mb-6">(Ký, ghi rõ họ tên)</div>
                                    {showSignatures ? (
                                        <div>
                                            <span className="inline-block text-[10px] px-2 py-0.5 rounded border border-blue-500 text-blue-700 font-bold uppercase mb-1">
                                                ✓ Phê duyệt
                                            </span>
                                            <div className="font-bold text-slate-900">Ban Giám Đốc</div>
                                        </div>
                                    ) : <div className="h-10"></div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-5 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                        <span>Số chứng từ:</span>
                        <strong className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{data.so_ct}</strong>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors mr-2">
                            <input
                                type="checkbox"
                                checked={showSignatures}
                                onChange={(e) => setShowSignatures(e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                            />
                            <span>Kèm chữ ký</span>
                        </label>

                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                            Đóng
                        </button>
                        
                        {cyberPdfUrl && (
                            <button
                                type="button"
                                onClick={handleDownloadPdfCyber}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                title="Tải file PDF gốc về máy"
                            >
                                <i className="fas fa-download text-xs"></i>
                                <span>Tải PDF Gốc</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <i className="fas fa-print"></i>
                            <span>In Phiếu Ngay</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};
