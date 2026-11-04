import React, { useEffect, useState } from 'react';

const FifoAlertModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [suggestedVin, setSuggestedVin] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const handleFifoError = (e: any) => {
            const msg = e.detail?.message || '';
            const match = msg.match(/VIN:\s*([A-Z0-9]+)/);
            if (match && match[1]) {
                setSuggestedVin(match[1]);
            } else {
                setSuggestedVin('');
            }
            setIsOpen(true);
            setCopied(false);
        };

        window.addEventListener('fifo-error', handleFifoError);
        return () => window.removeEventListener('fifo-error', handleFifoError);
    }, []);

    const handleCopy = () => {
        if (suggestedVin) {
            navigator.clipboard.writeText(suggestedVin);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleNavigate = () => {
        if (suggestedVin) {
            window.dispatchEvent(new CustomEvent('navigate-stock', { detail: { vin: suggestedVin } }));
            setIsOpen(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] w-full max-w-sm overflow-hidden animate-slide-in-up border border-white/20">
                {/* Minimal Header */}
                <div className="pt-8 pb-4 flex flex-col items-center justify-center">
                    <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 shadow-inner ring-4 ring-white">
                        <i className="fas fa-shield-alt text-xl"></i>
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Hệ thống gợi ý xe cũ hơn</h2>
                    <p className="text-sm text-slate-500 mt-1 px-6 text-center leading-relaxed">
                        Theo quy tắc FIFO, vui lòng ưu tiên xử lý xe có cùng cấu hình nhập kho trước.
                    </p>
                </div>
                
                {/* Body */}
                <div className="px-6 pb-6 mt-2">
                    <div className="bg-slate-50 rounded-xl p-1 shadow-inner flex items-center justify-between border border-slate-100 transition-all hover:bg-slate-100/80">
                        <div className="flex-1 text-center py-3">
                            <span className="font-mono text-xl font-bold text-slate-700 tracking-wider">
                                {suggestedVin || "Không xác định"}
                            </span>
                        </div>
                        <div className="flex gap-1 pr-1">
                            <button 
                                onClick={handleCopy}
                                className="w-12 h-12 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-blue-500 transition-all"
                                title="Copy số VIN"
                            >
                                <i className={`fas ${copied ? 'fa-check text-green-500' : 'fa-copy'}`}></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex border-t border-slate-100 bg-slate-50/50">
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="flex-1 py-4 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        Đóng lại
                    </button>
                    <button 
                        onClick={handleNavigate}
                        className="flex-1 py-4 text-sm font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors border-l border-slate-100"
                    >
                        Sử dụng xe này
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FifoAlertModal;
