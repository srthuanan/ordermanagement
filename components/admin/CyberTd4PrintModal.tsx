import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CyberVoucherTicketItem, exportCyberPdf } from '../../services/api/stockService';

interface CyberTd4PrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: CyberVoucherTicketItem | null;
}

export const CyberTd4PrintModal: React.FC<CyberTd4PrintModalProps> = ({
    isOpen,
    onClose,
    data
}) => {
    const pdfIframeRef = useRef<HTMLIFrameElement>(null);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const paperSize = 'A4'; // Luôn in A4 - đã bỏ selector

    // Tự động gọi CyberSoft Engine để xuất file PDF gốc khi mở modal hoặc đổi khổ giấy
    useEffect(() => {
        if (!isOpen || !data || !data.stt_rec) return;

        // Reset trạng thái khi mở modal mới
        setPdfUrl(null);
        setPdfError(null);

        let isMounted = true;
        const loadOfficialPdf = async () => {
            setIsExportingPdf(true);
            setPdfError(null);

            // Bước 1: Kiểm tra cache - nếu file đã có thì serve ngay (0s chờ!)
            const cleanStt = data.stt_rec.replace(/[^a-zA-Z0-9_-]/g, '_');
            const cachedUrl = `/api/cyber/view-pdf?stt_rec=${cleanStt}`;
            try {
                const cacheCheck = await fetch(cachedUrl, { method: 'HEAD' });
                if (cacheCheck.ok && isMounted) {
                    // File đã có sẵn → hiển thị ngay lập tức!
                    setPdfUrl(`${cachedUrl}&t=${Date.now()}`);
                    setIsExportingPdf(false);
                    return;
                }
            } catch (_) { /* bỏ qua lỗi HEAD, tiếp tục export */ }

            // Bước 2: File chưa có → gọi CyberSoft Engine để xuất
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
                } else {
                    setPdfError(res.error || 'Không thể xuất file PDF từ CyberSoft.');
                }
            } catch (err: any) {
                if (isMounted) {
                    setPdfError(err.message || 'Lỗi kết nối khi trích xuất PDF từ CyberSoft.');
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

    // In trực tiếp từ PDF iframe
    const handlePrintPdf = () => {
        if (pdfIframeRef.current?.contentWindow) {
            try {
                pdfIframeRef.current.contentWindow.focus();
                pdfIframeRef.current.contentWindow.print();
                return;
            } catch (_) {}
        }
        if (pdfUrl) {
            const printWindow = window.open(pdfUrl, '_blank');
            printWindow?.focus();
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

    return ReactDOM.createPortal(
        <div 
            className="fixed inset-0 z-[2147483647] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[1050px] h-[94vh] max-h-[94vh] flex flex-col overflow-hidden animate-scale-in relative z-10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header thanh tiêu đề Modal */}
                <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
                    <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-sm font-bold">
                            <i className="fas fa-file-pdf"></i>
                        </span>
                        <div>
                            <div className="text-sm font-bold flex items-center gap-2">
                                <span>Giấy Ra Cổng (Phiếu TD4)</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold uppercase">
                                    {data.so_ct}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {pdfUrl && (
                            <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                                title="Mở trong tab mới"
                            >
                                <i className="fas fa-external-link-alt text-[10px]"></i>
                                <span className="hidden sm:inline">Mở tab mới</span>
                            </a>
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

                {/* PDF Viewer Container */}
                <div className="flex-1 min-h-0 overflow-hidden bg-slate-900/90 flex flex-col justify-center items-center relative">
                    {isExportingPdf ? (
                        <div className="flex flex-col items-center justify-center text-white gap-3 p-8 animate-pulse">
                            <i className="fas fa-circle-notch fa-spin text-4xl text-amber-500"></i>
                            <div className="text-sm font-bold text-slate-200">
                                Đang kết xuất file PDF gốc từ CyberSoft ERP...
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                                Stt_Rec: {data.stt_rec} • Mẫu TD400.mrt
                            </div>
                        </div>
                    ) : pdfError ? (
                        <div className="p-8 max-w-md text-center bg-white rounded-2xl shadow-xl border border-rose-200">
                            <i className="fas fa-exclamation-triangle text-3xl text-rose-500 mb-3"></i>
                            <h4 className="font-bold text-sm text-slate-800 mb-1">Chưa thể xuất file PDF trực tiếp</h4>
                            <p className="text-xs text-slate-500 mb-4">{pdfError}</p>
                            <button
                                type="button"
                                onClick={() => { setPdfError(null); setRetryCount(c => c + 1); }}
                                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                            >
                                Thử lại
                            </button>
                        </div>
                    ) : pdfUrl ? (
                        <iframe
                            ref={pdfIframeRef}
                            src={pdfUrl}
                            className="w-full h-full border-0 bg-white"
                            title={`Giấy Ra Cổng - ${data.so_ct}`}
                        />
                    ) : null}
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
                                title="Tải file PDF Cyber về máy tính"
                            >
                                <i className="fas fa-download text-xs"></i>
                                <span>Tải PDF Gốc</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handlePrintPdf}
                            disabled={!pdfUrl || isExportingPdf}
                            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <i className="fas fa-print"></i>
                            <span>In File PDF Cyber Ngay</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};

