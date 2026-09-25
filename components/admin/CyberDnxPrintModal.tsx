import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { exportCyberPdf, getCyberStoragePdfUrl } from '../../services/api/stockService';

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

    // Kết xuất PDF từ CyberSoft ERP Engine
    useEffect(() => {
        if (!isOpen || !data) return;

        if (!data.stt_rec) {
            setCyberPdfError('Không tìm thấy mã số chứng từ (stt_rec) để trích xuất file PDF CyberSoft.');
            return;
        }

        setCyberPdfUrl(null);
        setCyberPdfError(null);

        const sigSuffix = showSignatures ? '_sig' : '_nosig';
        const cleanStt = data.stt_rec.replace(/[^a-zA-Z0-9_-]/g, '_') + sigSuffix;
        const storagePdfUrl = getCyberStoragePdfUrl(cleanStt);
        const cleanSoCt = data.so_ct ? data.so_ct.replace(/[^a-zA-Z0-9_-]/g, '_') + sigSuffix : null;
        const storagePdfUrlBySoCt = cleanSoCt ? getCyberStoragePdfUrl(cleanSoCt) : null;

        let isMounted = true;
        const loadOfficialPdf = async () => {
            setIsCyberLoading(true);
            setCyberPdfError(null);

            // Bước 1: Kiểm tra xem file đã có sẵn trên Supabase Storage Cloud chưa (theo stt_rec hoặc theo so_ct)
            try {
                const checkRes = await fetch(storagePdfUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
                if (checkRes.ok && isMounted) {
                    setCyberPdfUrl(`${storagePdfUrl}?t=${Date.now()}`);
                    setIsCyberLoading(false);
                    return;
                }
            } catch (_) {}

            if (storagePdfUrlBySoCt) {
                try {
                    const checkRes2 = await fetch(storagePdfUrlBySoCt, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
                    if (checkRes2.ok && isMounted) {
                        setCyberPdfUrl(`${storagePdfUrlBySoCt}?t=${Date.now()}`);
                        setIsCyberLoading(false);
                        return;
                    }
                } catch (_) {}
            }

            // Bước 2: Nếu chưa có trên Cloud, gọi exportCyberPdf (truyền cả stt_rec và so_ct để backend tự động chữa lỗi nếu lệch mã)
            try {
                const res = await exportCyberPdf({
                    stt_rec: data.stt_rec!,
                    so_ct: data.so_ct,
                    voucher_type: 'DNX',
                    paper_size: 'A4',
                    user_name: data.user_name || '02.NHANPT',
                    include_signatures: showSignatures
                });

                if (!isMounted) return;

                if (res.success && (res.pdf_url || res.pdf_base64)) {
                    setCyberPdfUrl(res.pdf_url || res.pdf_base64 || null);
                    return;
                }
            } catch (err: any) {
                console.warn("[CyberDnxModal] exportCyberPdf initial call error, will poll storage:", err);
            }

            // Bước 3: Nếu gọi trực tiếp chưa trả về ngay (ví dụ đang ở môi trường Cloud/GitHub Pages),
            // tiến hành thăm dò (polling) Supabase Storage 4 lần x 2.5s phòng khi daemon ở máy văn phòng đang hoàn tất tải lên
            for (let attempt = 1; attempt <= 4; attempt++) {
                if (!isMounted) return;
                await new Promise(r => setTimeout(r, 2500));
                if (!isMounted) return;

                try {
                    const retryCheck = await fetch(storagePdfUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
                    if (retryCheck.ok && isMounted) {
                        setCyberPdfUrl(`${storagePdfUrl}?t=${Date.now()}`);
                        setIsCyberLoading(false);
                        return;
                    }
                } catch (_) {}

                if (storagePdfUrlBySoCt) {
                    try {
                        const retryCheck2 = await fetch(storagePdfUrlBySoCt, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
                        if (retryCheck2.ok && isMounted) {
                            setCyberPdfUrl(`${storagePdfUrlBySoCt}?t=${Date.now()}`);
                            setIsCyberLoading(false);
                            return;
                        }
                    } catch (_) {}
                }
            }

            if (!isMounted) return;

            const isCloud = typeof window !== 'undefined' && (
                window.location.hostname.endsWith('github.io') ||
                !['localhost', '127.0.0.1'].includes(window.location.hostname)
            );
            if (isCloud) {
                setCyberPdfError('Phiếu này chưa kịp đồng bộ lên hệ thống đám mây. Vui lòng bật tiến trình đồng bộ ngầm trên máy tính văn phòng hoặc bấm Thử tải lại sau ít giây.');
            } else {
                setCyberPdfError('Chưa tìm thấy file PDF CyberSoft gốc của phiếu này trên máy chủ.');
            }
        };

        loadOfficialPdf();

        return () => {
            isMounted = false;
        };
    }, [isOpen, data?.stt_rec, showSignatures, retryCount]);

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

    // In phiếu: In trực tiếp file PDF chính thống của CyberSoft
    const handlePrint = () => {
        if (cyberPdfUrl) {
            if (pdfIframeRef.current?.contentWindow) {
                try {
                    pdfIframeRef.current.contentWindow.focus();
                    pdfIframeRef.current.contentWindow.print();
                    return;
                } catch (_) {}
            }
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
                            <i className="fas fa-file-pdf"></i>
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
                    {isCyberLoading ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
                            <i className="fas fa-circle-notch fa-spin text-3xl text-blue-600 mb-3"></i>
                            <div className="text-sm font-bold text-slate-800">Đang tải file PDF CyberSoft gốc...</div>
                            <div className="text-xs text-slate-500 mt-1">Vui lòng chờ trong giây lát</div>
                        </div>
                    ) : cyberPdfUrl ? (
                        <iframe
                            ref={pdfIframeRef}
                            src={cyberPdfUrl}
                            className="w-full h-full border-0 bg-white shadow-xl rounded-xl"
                            title={`Đề Nghị Xuất Xe - ${data.so_ct}`}
                        />
                    ) : (
                        <div className="max-w-md p-6 bg-white rounded-2xl shadow-xl border border-red-100 text-center">
                            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 mx-auto flex items-center justify-center text-xl mb-3 border border-amber-200">
                                <i className="fas fa-exclamation-triangle"></i>
                            </div>
                            <h3 className="text-sm font-bold text-slate-800 mb-1">Chưa có file PDF CyberSoft gốc</h3>
                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                {cyberPdfError || 'Không tìm thấy bản kết xuất PDF chính thống từ phần mềm CyberSoft cho phiếu này.'}
                            </p>
                            <button
                                type="button"
                                onClick={() => setRetryCount(c => c + 1)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs"
                            >
                                <i className="fas fa-rotate-right"></i>
                                <span>Thử tải lại</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-5 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                        <span>Số chứng từ:</span>
                        <strong className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{data.so_ct}</strong>
                        {data.stt_rec && (
                            <span className="text-[11px] text-slate-400 font-mono">({data.stt_rec})</span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors mr-2">
                            <input
                                type="checkbox"
                                checked={showSignatures}
                                onChange={(e) => setShowSignatures(e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                            />
                            <span>Chèn chữ ký</span>
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
                            disabled={!cyberPdfUrl || isCyberLoading}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
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
