import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CyberVoucherTicketItem, exportCyberPdf, getCyberViewPdfUrl } from '../../services/api/stockService';

interface CyberTd4PrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: CyberVoucherTicketItem | null;
}

const formatDisplayDate = (dStr?: string) => {
    if (!dStr) return new Date().toLocaleDateString('vi-VN');
    const parts = dStr.split('T')[0].split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dStr;
};

// Hàm xuất HTML chuẩn in ấn A4 cho Giấy Ra Cổng TD4
const generateTd4Html = (data: CyberVoucherTicketItem): string => {
    const dateObj = data.ngay_ct ? new Date(data.ngay_ct) : new Date();
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();

    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Giấy Ra Cổng - ${data.so_ct}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
        }
        * { box-sizing: border-box; }
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12.5pt;
            line-height: 1.4;
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
            margin-bottom: 10px;
        }
        .header-table td {
            vertical-align: top;
            padding: 0;
        }
        .company-name {
            font-size: 11.5pt;
            font-weight: bold;
            text-transform: uppercase;
        }
        .company-sub {
            font-size: 10pt;
            color: #333;
        }
        .doc-meta {
            text-align: right;
            font-size: 10pt;
        }
        .title-block {
            text-align: center;
            margin: 15px 0 20px 0;
        }
        .title-main {
            font-size: 18pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 4px 0;
        }
        .title-sub {
            font-size: 11pt;
            font-style: italic;
            color: #222;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 12pt;
        }
        .info-table td {
            padding: 5px 0;
            vertical-align: top;
        }
        .info-lbl {
            width: 150px;
            font-weight: normal;
        }
        .info-val {
            font-weight: bold;
        }
        table.car-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0 20px 0;
            font-size: 11.5pt;
        }
        table.car-table th, table.car-table td {
            border: 1px solid #222;
            padding: 8px;
        }
        table.car-table th {
            background-color: #f1f3f5;
            font-weight: bold;
            text-align: center;
        }
        .sig-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 25px;
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
            font-size: 11pt;
            text-transform: uppercase;
        }
        .sig-sub {
            font-size: 9.5pt;
            font-style: italic;
            color: #444;
            margin-bottom: 50px;
        }
        .sig-name {
            font-weight: bold;
            font-size: 10.5pt;
        }
        .sig-stamp {
            display: inline-block;
            border: 1.5px dashed #d97706;
            color: #b45309;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 9pt;
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
                    <div><strong>Mẫu số: TD400</strong></div>
                    <div>(Ban hành theo QĐ CyberSoft)</div>
                    <div style="margin-top: 4px; font-weight: bold; color: #0f172a;">Số: ${data.so_ct}</div>
                </td>
            </tr>
        </table>

        <!-- TIÊU ĐỀ -->
        <div class="title-block">
            <div class="title-main">GIẤY RA CỔNG</div>
            <div class="title-sub">Ngày ${day} tháng ${month} năm ${year}</div>
        </div>

        <!-- THÔNG TIN PHIẾU -->
        <table class="info-table">
            <tr>
                <td class="info-lbl">Khách hàng / Đơn vị:</td>
                <td class="info-val" colspan="3">${data.ten_kh || 'Khách hàng nhận xe'}</td>
            </tr>
            <tr>
                <td class="info-lbl">TVBH / Người phụ trách:</td>
                <td class="info-val">${data.nvkd || 'Tư vấn bán hàng'}</td>
                <td class="info-lbl" style="width: 120px;">Đơn vị bàn giao:</td>
                <td class="info-val" style="width: 170px;">VinFast Thuận An</td>
            </tr>
            <tr>
                <td class="info-lbl">Lý do ra cổng:</td>
                <td class="info-val" colspan="3">${data.dien_giai || 'Giao xe mới hoàn tất thủ tục bàn giao cho Khách Hàng'}</td>
            </tr>
        </table>

        <!-- BẢNG THÔNG TIN XE -->
        <table class="car-table">
            <thead>
                <tr>
                    <th style="width: 40px;">STT</th>
                    <th>Dòng Xe / Phiên Bản</th>
                    <th style="width: 180px;">Số Khung (VIN)</th>
                    <th style="width: 130px;">Số Máy</th>
                    <th style="width: 110px;">Màu Ngoại Thất</th>
                    <th style="width: 110px;">Biển Số</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="text-align: center; font-weight: bold;">1</td>
                    <td style="font-weight: bold;">${data.ten_kx || '-'}</td>
                    <td style="font-family: 'Consolas', monospace; font-weight: bold; font-size: 11pt;">${data.so_khung || '-'}</td>
                    <td style="font-family: 'Consolas', monospace; font-size: 10.5pt;">${data.so_may || '-'}</td>
                    <td>${data.ten_mau || '-'}</td>
                    <td style="text-align: center; font-weight: bold;">${data.bien_so || 'Chưa bấm biển'}</td>
                </tr>
            </tbody>
        </table>

        <div style="font-size: 11.5pt; font-style: italic; margin-bottom: 25px;">
            Giấy ra cổng có giá trị cho 01 xe ra khỏi khuôn viên showroom. Đề nghị bộ phận Bảo Vệ kiểm tra đúng số khung, số máy trước khi mở cổng.
        </div>

        <!-- KHU VỰC KÝ TÊN -->
        <table class="sig-table">
            <tr>
                <td>
                    <div class="sig-title">Người Lập Phiếu</div>
                    <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
                    <div class="sig-stamp">✓ Đã xác nhận</div>
                    <div class="sig-name">${data.nvkd || 'Phạm Thành Nhân'}</div>
                </td>
                <td>
                    <div class="sig-title">Kế Toán Kiểm Soát</div>
                    <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
                    <div class="sig-stamp">✓ Đã kiểm soát</div>
                    <div class="sig-name">Kế Toán BH</div>
                </td>
                <td>
                    <div class="sig-title">Bảo Vệ Cổng</div>
                    <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
                    <div style="height: 40px;"></div>
                    <div class="sig-name">Bảo Vệ Cổng</div>
                </td>
                <td>
                    <div class="sig-title">Người Nhận Xe</div>
                    <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
                    <div style="height: 40px;"></div>
                    <div class="sig-name">${data.ten_kh || 'Khách Hàng'}</div>
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

export const CyberTd4PrintModal: React.FC<CyberTd4PrintModalProps> = ({
    isOpen,
    onClose,
    data
}) => {
    const pdfIframeRef = useRef<HTMLIFrameElement>(null);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [_pdfError, setPdfError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [activeView, setActiveView] = useState<'pdf' | 'html'>('html');
    const paperSize = 'A4';

    // Tự động gọi CyberSoft Engine để xuất file PDF gốc khi mở modal
    useEffect(() => {
        if (!isOpen || !data) return;

        if (!data.stt_rec) {
            setActiveView('html');
            return;
        }

        setPdfUrl(null);
        setPdfError(null);

        let isMounted = true;
        const loadOfficialPdf = async () => {
            setIsExportingPdf(true);
            setPdfError(null);

            const cleanStt = data.stt_rec.replace(/[^a-zA-Z0-9_-]/g, '_');
            const cachedUrl = getCyberViewPdfUrl(cleanStt);
            try {
                const cacheCheck = await fetch(cachedUrl, {
                    method: 'GET',
                    signal: AbortSignal.timeout(3000)
                });
                if (cacheCheck.ok && isMounted) {
                    setPdfUrl(`${cachedUrl}&t=${Date.now()}`);
                    setActiveView('pdf');
                    setIsExportingPdf(false);
                    return;
                }
                // 404/500 từ Render → bỏ qua, chuyển sang HTML print
            } catch (_) { /* network error hoặc timeout → bỏ qua */ }

            try {
                const res = await exportCyberPdf({
                    stt_rec: data.stt_rec,
                    voucher_type: 'TD4',
                    paper_size: paperSize,
                    user_name: data.nvkd || '02.NHANPT'
                });

                if (!isMounted) return;

                if (res.success && (res.pdf_base64 || res.pdf_url)) {
                    setPdfUrl(res.pdf_base64 || `${res.pdf_url}&t=${Date.now()}`);
                    setActiveView('pdf');
                } else {
                    setPdfError(res.error || 'Máy chủ Cyber chưa có file PDF gốc.');
                    setActiveView('html');
                }
            } catch (err: any) {
                if (isMounted) {
                    setPdfError(err.message || 'Lỗi kết nối khi trích xuất PDF từ máy chủ.');
                    setActiveView('html');
                }
            } finally {
                if (isMounted) {
                    setIsExportingPdf(false);
                }
            }
        };

        loadOfficialPdf();

        return () => {
            isMounted = false;
        };
    }, [isOpen, data?.stt_rec, paperSize, retryCount]);

    // Đóng khi bấm ESC
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !data) return null;

    // In trực tiếp: nếu có PDF thì in PDF, nếu không thì in HTML A4
    const handlePrint = () => {
        if (activeView === 'pdf' && pdfUrl) {
            if (pdfIframeRef.current?.contentWindow) {
                try {
                    pdfIframeRef.current.contentWindow.focus();
                    pdfIframeRef.current.contentWindow.print();
                    return;
                } catch (_) {}
            }
            const printWindow = window.open(pdfUrl, '_blank');
            printWindow?.focus();
        } else {
            const html = generateTd4Html(data);
            printHtmlDocument(html);
        }
    };

    // Tải file PDF về máy
    const handleDownloadPdf = () => {
        if (!pdfUrl) return;
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `Giay_Ra_Cong_${data.so_ct.replace(/[\/\\?%*:|"<>]/g, '_')}.pdf`;
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
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[1050px] h-[94vh] max-h-[94vh] flex flex-col overflow-hidden animate-scale-in relative z-10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header thanh tiêu đề Modal */}
                <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
                    <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-sm font-bold">
                            <i className="fas fa-file-invoice"></i>
                        </span>
                        <div>
                            <div className="text-sm font-bold flex items-center gap-2">
                                <span>Giấy Ra Cổng (Phiếu TD4)</span>
                                <span className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold uppercase font-mono tracking-wide">
                                    {data.so_ct}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {pdfUrl && (
                            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs mr-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveView('html')}
                                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                                        activeView === 'html'
                                            ? 'bg-amber-500 text-slate-950 shadow-xs'
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
                                            ? 'bg-amber-500 text-slate-950 shadow-xs'
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
                    <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between text-xs text-amber-900 shrink-0">
                        <div className="flex items-center gap-2">
                            <i className="fas fa-check-circle text-amber-600"></i>
                            <span>
                                Đang xem <strong>Bản in Giấy Ra Cổng chuẩn A4 (Mẫu TD400)</strong>. Sẵn sàng in ngay!
                            </span>
                        </div>
                        {isExportingPdf ? (
                            <span className="flex items-center gap-1.5 text-amber-700">
                                <i className="fas fa-spinner fa-spin text-xs"></i> Đang dò file PDF Cyber...
                            </span>
                        ) : !pdfUrl ? (
                            <button
                                type="button"
                                onClick={() => { setRetryCount(c => c + 1); }}
                                className="text-amber-700 hover:text-amber-900 underline font-semibold cursor-pointer"
                            >
                                Thử tải PDF Cyber
                            </button>
                        ) : null}
                    </div>
                )}

                {/* PDF Viewer Container / HTML Preview */}
                <div className="flex-1 min-h-0 overflow-auto bg-slate-100/90 flex flex-col items-center p-4 relative">
                    {activeView === 'pdf' && pdfUrl ? (
                        <iframe
                            ref={pdfIframeRef}
                            src={pdfUrl}
                            className="w-full h-full border-0 bg-white shadow-lg rounded-lg"
                            title={`Giấy Ra Cổng - ${data.so_ct}`}
                        />
                    ) : (
                        /* BẢN IN GIẤY RA CỔNG TRỰC TIẾP CHUẨN A4 */
                        <div className="bg-white text-slate-900 w-full max-w-[800px] shadow-2xl rounded-sm p-8 sm:p-10 border border-slate-300 font-serif my-auto">
                            {/* Đầu trang */}
                            <div className="flex justify-between items-start border-b border-slate-300 pb-3 mb-4">
                                <div>
                                    <div className="font-bold text-[13px] uppercase tracking-wide text-slate-900">
                                        CÔNG TY TNHH MINH ĐẠO PHÁT
                                    </div>
                                    <div className="text-[12px] font-bold text-amber-800">
                                        SHOWROOM VINFAST THUẬN AN
                                    </div>
                                    <div className="text-[11px] text-slate-600">
                                        KP. Bình Đức 2, P. Bình Hòa, TP. Thuận An, Bình Dương
                                    </div>
                                </div>
                                <div className="text-right text-[11px] text-slate-600">
                                    <div className="font-bold text-slate-800">Mẫu số: TD400</div>
                                    <div>(Ban hành theo QĐ CyberSoft)</div>
                                    <div className="mt-1 font-bold font-mono text-[13px] text-amber-900">
                                        Số: {data.so_ct}
                                    </div>
                                </div>
                            </div>

                            {/* Tiêu đề */}
                            <div className="text-center my-4">
                                <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-950 tracking-wider">
                                    GIẤY RA CỔNG
                                </h1>
                                <div className="text-xs italic text-slate-600 mt-1">
                                    Ngày {formattedDate}
                                </div>
                            </div>

                            {/* Thông tin */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] mb-4 bg-slate-50/60 p-3.5 rounded-lg border border-slate-200">
                                <div className="sm:col-span-2">
                                    <span className="text-slate-600">Khách hàng / Đơn vị nhận: </span>
                                    <strong className="text-slate-900">{data.ten_kh || 'Khách hàng nhận xe'}</strong>
                                </div>
                                <div>
                                    <span className="text-slate-600">TVBH / Người phụ trách: </span>
                                    <strong className="text-slate-900">{data.nvkd || 'Tư vấn bán hàng'}</strong>
                                </div>
                                <div>
                                    <span className="text-slate-600">Đơn vị bàn giao: </span>
                                    <strong className="text-slate-900">VinFast Thuận An</strong>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-slate-600">Lý do ra cổng: </span>
                                    <strong className="text-slate-900">{data.dien_giai || 'Giao xe mới hoàn tất thủ tục bàn giao cho Khách Hàng'}</strong>
                                </div>
                            </div>

                            {/* Chi tiết xe */}
                            <div className="overflow-x-auto mb-4">
                                <table className="w-full border-collapse border border-slate-800 text-[11.5px]">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-900">
                                            <th className="border border-slate-800 p-2 text-center w-10">STT</th>
                                            <th className="border border-slate-800 p-2 text-center">Dòng Xe / Phiên Bản</th>
                                            <th className="border border-slate-800 p-2 text-center">Số Khung (VIN)</th>
                                            <th className="border border-slate-800 p-2 text-center">Số Máy</th>
                                            <th className="border border-slate-800 p-2 text-center">Màu Xe</th>
                                            <th className="border border-slate-800 p-2 text-center">Biển Số</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="hover:bg-slate-50">
                                            <td className="border border-slate-800 p-2 text-center font-bold">1</td>
                                            <td className="border border-slate-800 p-2 font-semibold text-slate-900">{data.ten_kx || '-'}</td>
                                            <td className="border border-slate-800 p-2 font-mono font-bold text-slate-950">{data.so_khung || '-'}</td>
                                            <td className="border border-slate-800 p-2 font-mono text-slate-700">{data.so_may || '-'}</td>
                                            <td className="border border-slate-800 p-2 text-slate-800">{data.ten_mau || '-'}</td>
                                            <td className="border border-slate-800 p-2 text-center font-bold text-slate-900">{data.bien_so || 'Chưa bấm biển'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="text-[11.5px] italic text-slate-600 mb-6">
                                Giấy ra cổng có giá trị cho 01 xe ra khỏi khuôn viên showroom. Đề nghị bộ phận Bảo Vệ kiểm tra đúng số khung, số máy trước khi mở cổng.
                            </div>

                            {/* Khu vực chữ ký */}
                            <div className="grid grid-cols-4 gap-2 text-center text-[11.5px] mt-4 pt-2">
                                <div>
                                    <div className="font-bold uppercase text-slate-900">Người Lập Phiếu</div>
                                    <div className="text-[10px] italic text-slate-500 mb-6">(Ký, ghi rõ họ tên)</div>
                                    <span className="inline-block text-[10px] px-2 py-0.5 rounded border border-amber-500 text-amber-700 font-bold uppercase mb-1">
                                        ✓ Đã xác nhận
                                    </span>
                                    <div className="font-bold text-slate-900">{data.nvkd || 'Phạm Thành Nhân'}</div>
                                </div>
                                <div>
                                    <div className="font-bold uppercase text-slate-900">KT Kiểm Soát</div>
                                    <div className="text-[10px] italic text-slate-500 mb-6">(Ký, ghi rõ họ tên)</div>
                                    <span className="inline-block text-[10px] px-2 py-0.5 rounded border border-amber-500 text-amber-700 font-bold uppercase mb-1">
                                        ✓ Đã duyệt
                                    </span>
                                    <div className="font-bold text-slate-900">Kế Toán BH</div>
                                </div>
                                <div>
                                    <div className="font-bold uppercase text-slate-900">Bảo Vệ Cổng</div>
                                    <div className="text-[10px] italic text-slate-500 mb-6">(Ký, ghi rõ họ tên)</div>
                                    <div className="h-6"></div>
                                    <div className="font-bold text-slate-700">Bảo Vệ Cổng</div>
                                </div>
                                <div>
                                    <div className="font-bold uppercase text-slate-900">Người Nhận Xe</div>
                                    <div className="text-[10px] italic text-slate-500 mb-6">(Ký, ghi rõ họ tên)</div>
                                    <div className="h-6"></div>
                                    <div className="font-bold text-slate-900">{data.ten_kh || 'Khách Hàng'}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer Controls */}
                <div className="px-5 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-end gap-3 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                            Đóng
                        </button>
                        
                        {pdfUrl && (
                            <button
                                type="button"
                                onClick={handleDownloadPdf}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                title="Tải file PDF về máy tính"
                            >
                                <i className="fas fa-download text-xs"></i>
                                <span>Tải PDF Gốc</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
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
