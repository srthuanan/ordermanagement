import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CyberVoucherTicketItem, exportCyberPdf, getCyberViewPdfUrl } from '../../services/api/stockService';

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
    const paperSize = 'A4';

    // Tự động gọi CyberSoft Engine để xuất file PDF gốc khi mở modal
    useEffect(() => {
        if (!isOpen || !data) return;

        if (!data.stt_rec) {
            setPdfError('Không tìm thấy mã số chứng từ (stt_rec) để trích xuất file PDF.');
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
                    signal: AbortSignal.timeout(5000)
                });
                if (cacheCheck.ok && isMounted) {
                    setPdfUrl(`${cachedUrl}&t=${Date.now()}`);
                    setIsExportingPdf(false);
                    return;
                }
            } catch (_) { /* bỏ qua lỗi network/timeout cache */ }

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
                    setPdfError(res.error || 'Chưa tìm thấy file PDF Giấy Ra Cổng gốc của phiếu này trên máy chủ.');
                }
            } catch (err: any) {
                if (isMounted) {
                    setPdfError(err.message || 'Lỗi kết nối khi trích xuất PDF từ máy chủ.');
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
    }, [isOpen, data?.stt_rec, retryCount]);

    // Đóng khi bấm phím ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen || !data) return null;

    const handlePrint = () => {
        if (pdfUrl) {
            if (pdfIframeRef.current?.contentWindow) {
                try {
                    pdfIframeRef.current.contentWindow.focus();
                    pdfIframeRef.current.contentWindow.print();
                    return;
                } catch (_) {}
            }
            const printWindow = window.open(pdfUrl, '_blank');
            printWindow?.focus();
        }
    };

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
                        <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-sm font-bold">
                            <i className="fas fa-file-pdf"></i>
                        </span>
                        <div>
                            <div className="text-sm font-bold flex items-center gap-2">
                                <span>Giấy Ra Cổng (TD4)</span>
                                <span className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-amber-600 text-white font-extrabold uppercase font-mono tracking-wide">
                                    {data.so_ct}
                                </span>
                                {data.ten_kh && (
                                    <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                                        KH: {data.ten_kh}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
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

                {/* Body Area: File PDF Gốc CyberSoft */}
                <div className="flex-1 min-h-0 overflow-hidden bg-slate-900/10 flex flex-col items-center justify-center p-2 sm:p-4 relative">
                    {isExportingPdf ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
                            <i className="fas fa-circle-notch fa-spin text-3xl text-amber-600 mb-3"></i>
                            <div className="text-sm font-bold text-slate-800">Đang tải Giấy Ra Cổng CyberSoft gốc...</div>
                            <div className="text-xs text-slate-500 mt-1">Vui lòng chờ trong giây lát</div>
                        </div>
                    ) : pdfUrl ? (
                        <iframe
                            ref={pdfIframeRef}
                            src={pdfUrl}
                            className="w-full h-full border-0 bg-white shadow-xl rounded-xl"
                            title={`Giấy Ra Cổng - ${data.so_ct}`}
                        />
                    ) : (
                        <div className="max-w-md p-6 bg-white rounded-2xl shadow-xl border border-amber-100 text-center">
                            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 mx-auto flex items-center justify-center text-xl mb-3 border border-amber-200">
                                <i className="fas fa-exclamation-triangle"></i>
                            </div>
                            <h3 className="text-sm font-bold text-slate-800 mb-1">Chưa có file PDF CyberSoft gốc</h3>
                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                {pdfError || 'Không tìm thấy bản kết xuất PDF chính thống từ phần mềm CyberSoft cho phiếu này.'}
                            </p>
                            <button
                                type="button"
                                onClick={() => setRetryCount(c => c + 1)}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs"
                            >
                                <i className="fas fa-rotate-right"></i>
                                <span>Thử tải lại</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Modal Footer Controls */}
                <div className="px-5 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                        <span>Số chứng từ:</span>
                        <strong className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{data.so_ct}</strong>
                        {data.stt_rec && (
                            <span className="text-[11px] text-slate-400 font-mono">({data.stt_rec})</span>
                        )}
                    </div>

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
                            disabled={!pdfUrl || isExportingPdf}
                            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <i className="fas fa-print"></i>
                            <span>In Phiếu PDF</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};
