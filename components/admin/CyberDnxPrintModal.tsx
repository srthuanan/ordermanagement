import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { exportCyberPdf } from '../../services/api/stockService';

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

    // Kết xuất PDF từ CyberSoft ERP Engine có chèn chữ ký điện tử trực tiếp lên file gốc
    useEffect(() => {
        if (!isOpen || !data || !data.stt_rec) return;

        setCyberPdfUrl(null);
        setCyberPdfError(null);

        const sigSuffix = showSignatures ? '_sig' : '_nosig';
        const cleanStt = data.stt_rec!.replace(/[^a-zA-Z0-9_-]/g, '_') + sigSuffix;
        const cachedUrl = `/api/cyber/view-pdf?stt_rec=${cleanStt}`;

        let isMounted = true;
        const loadOfficialPdf = async () => {
            setIsCyberLoading(true);
            setCyberPdfError(null);

            // Bước 1: Kiểm tra cache file PDF đã được tạo sẵn chưa (0s chờ!)
            try {
                const cacheCheck = await fetch(cachedUrl, { method: 'HEAD' });
                if (cacheCheck.ok && isMounted) {
                    setCyberPdfUrl(`${cachedUrl}&t=${Date.now()}`);
                    setIsCyberLoading(false);
                    return;
                }
            } catch (_) { /* bỏ qua lỗi HEAD */ }

            // Bước 2: Nếu chưa có cache → gọi CyberSoft Engine để tạo file
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
                } else {
                    setCyberPdfError(res.error || 'Không thể kết xuất file PDF từ CyberSoft.');
                }
            } catch (err: any) {
                if (isMounted) {
                    setCyberPdfError(err.message || 'Lỗi kết nối khi trích xuất PDF từ CyberSoft.');
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

    // In từ PDF iframe Cyber
    const handlePrintPdfCyber = () => {
        if (pdfIframeRef.current?.contentWindow) {
            try {
                pdfIframeRef.current.contentWindow.focus();
                pdfIframeRef.current.contentWindow.print();
                return;
            } catch (_) {}
        }
        if (cyberPdfUrl) {
            const printWindow = window.open(cyberPdfUrl, '_blank');
            printWindow?.focus();
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

    return ReactDOM.createPortal(
        <div 
            className="fixed inset-0 z-[2147483647] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[1150px] h-[95vh] max-h-[95vh] flex flex-col overflow-hidden animate-scale-in relative z-10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header thanh tiêu đề Modal */}
                <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-sm font-bold">
                            <i className="fas fa-file-pdf"></i>
                        </span>
                        <div>
                            <div className="text-sm font-bold flex items-center gap-2">
                                <span>Phiếu Đề Nghị Xuất Xe (CyberSoft ERP)</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-extrabold uppercase">
                                    {data.so_ct}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {cyberPdfUrl && (
                            <a
                                href={cyberPdfUrl}
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

                {/* Body Area: PDF Viewer */}
                <div className="flex-1 min-h-0 overflow-hidden bg-slate-900/90 flex flex-col justify-center items-center relative">
                    {isCyberLoading ? (
                        <div className="flex flex-col items-center justify-center text-white gap-3 p-8 animate-pulse">
                            <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500"></i>
                            <div className="text-sm font-bold text-slate-200">
                                Đang kết xuất Phiếu Đề Nghị Xuất Xe từ CyberSoft ERP...
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                                Stt_Rec: {data.stt_rec || '-'} • Mẫu PXX00.mrt
                            </div>
                        </div>
                    ) : cyberPdfError ? (
                        <div className="p-8 max-w-md text-center bg-white rounded-2xl shadow-xl border border-rose-200">
                            <i className="fas fa-exclamation-triangle text-3xl text-rose-500 mb-3"></i>
                            <h4 className="font-bold text-sm text-slate-800 mb-1">Chưa thể xuất file PDF trực tiếp</h4>
                            <p className="text-xs text-slate-500 mb-4">{cyberPdfError}</p>
                            <button
                                type="button"
                                onClick={() => { setCyberPdfError(null); setRetryCount(c => c + 1); }}
                                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                            >
                                Thử lại
                            </button>
                        </div>
                    ) : cyberPdfUrl ? (
                        <iframe
                            ref={pdfIframeRef}
                            src={cyberPdfUrl}
                            className="w-full h-full border-0 bg-white"
                            title={`Đề Nghị Xuất Xe Cyber - ${data.so_ct}`}
                        />
                    ) : null}
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
                                title="Tải file PDF Cyber gốc về máy"
                            >
                                <i className="fas fa-download text-xs"></i>
                                <span>Tải PDF Gốc</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handlePrintPdfCyber}
                            disabled={!cyberPdfUrl || isCyberLoading}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
