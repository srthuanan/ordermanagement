import React, { useState } from 'react';
import { Order } from '../../types';
import SimpleFileUpload from '../ui/SimpleFileUpload';
import Button from '../ui/Button';



interface SupplementaryFileModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: (order: Order, contractFile: File | null, proposalFile: File | null, aiNote?: string) => void;
    showToast?: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}



const SupplementaryFileModal: React.FC<SupplementaryFileModalProps> = ({ order, onClose, onConfirm, showToast }) => {
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [proposalFile, setProposalFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [processingStage, setProcessingStage] = useState(0);

    const handleContractFileSelect = (file: File | null) => {
        setContractFile(file);
    };

    const handleProposalFileSelect = (file: File | null) => {
        setProposalFile(file);
    };

    const handleSubmit = async () => {
        if (!contractFile && !proposalFile) {
            if (showToast) showToast('Thiếu tệp', 'Vui lòng chọn ít nhất một file để bổ sung.', 'warning');
            return;
        }
        setIsSubmitting(true);
        setProcessingStage(1);

        try {
            // AI note will be handled in background by the API service
            const aiNote = '';

            await new Promise(r => setTimeout(r, 600)); // fake delay for UX
            setProcessingStage(2);
            await new Promise(r => setTimeout(r, 600));

            setProcessingStage(3);
            await onConfirm(order, contractFile, proposalFile, aiNote || undefined);

            setProcessingStage(4);
            await new Promise(r => setTimeout(r, 1500));
            onClose();
        } catch (error) {
            setIsSubmitting(false);
            setProcessingStage(0);
            if (showToast) showToast('Lỗi', 'Có lỗi xảy ra khi nộp hồ sơ bổ sung', 'error');
        }
    };

    const isFormValid = contractFile || proposalFile;

    const ProcessingStep = ({ label, status }: { label: string, status: 'pending' | 'active' | 'completed' }) => {
        let icon = "fa-circle text-border-secondary";
        let textClass = "text-text-secondary";
        let bgClass = "bg-surface-ground";

        if (status === 'active') {
            icon = "fa-spinner fa-spin text-accent-primary";
            textClass = "text-accent-primary font-semibold";
            bgClass = "bg-accent-primary/5 border-accent-primary/20";
        } else if (status === 'completed') {
            icon = "fa-check-circle text-success";
            textClass = "text-text-primary font-medium";
            bgClass = "bg-success/5 border-success/20";
        }

        return (
            <div className={`flex items-center p-3 rounded-lg border ${status === 'pending' ? 'border-transparent' : 'border-border-secondary'} ${bgClass} transition-all duration-300`}>
                <div className="w-8 flex justify-center mr-3">
                    <i className={`fas ${icon} text-lg transition-all duration-300`}></i>
                </div>
                <span className={`${textClass} transition-all duration-300`}>{label}</span>
            </div>
        );
    };

    if (isSubmitting) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-blue-900/30 to-slate-800/40">
                    <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/15 to-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
                    <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-gradient-to-tl from-purple-500/15 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20" />
                </div>

                <div className="relative z-10 bg-white/95 backdrop-blur-3xl w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col items-center animate-fade-in-scale-up border border-white/20">
                    <div className="w-16 h-16 mb-4 relative">
                        <div className="absolute inset-0 rounded-full border-4 border-border-primary"></div>
                        <div className={`absolute inset-0 rounded-full border-4 ${processingStage === 4 ? 'border-success' : 'border-accent-primary border-t-transparent animate-spin'}`}></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <i className={`fas ${processingStage === 4 ? 'fa-check text-success' : 'fa-paper-plane text-accent-primary'} text-xl`}></i>
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-1">{processingStage === 4 ? 'Hoàn tất!' : 'Đang xử lý tải lên'}</h3>
                    <p className="text-sm text-text-secondary mb-6">{processingStage === 4 ? 'Hồ sơ đã được gửi hệ thống thành công.' : 'Vui lòng không tắt trình duyệt...'}</p>

                    <div className="w-full space-y-3">
                        <ProcessingStep label="Đang tải Hợp đồng mua bán" status={processingStage > 1 ? 'completed' : processingStage === 1 ? 'active' : 'pending'} />
                        <ProcessingStep label="Đang tải Đề nghị xuất hóa đơn" status={processingStage > 2 ? 'completed' : processingStage === 2 ? 'active' : 'pending'} />
                        <ProcessingStep label="Đang đồng bộ dữ liệu..." status={processingStage > 3 ? 'completed' : processingStage === 3 ? 'active' : 'pending'} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in overflow-hidden" onClick={onClose}>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-blue-900/30 to-slate-800/40">
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/15 to-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-gradient-to-tl from-purple-500/15 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20" />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-2 md:px-4 py-8 flex flex-col justify-center min-h-[100dvh] pointer-events-none">
                <div className="flex flex-col w-full h-[90vh] animate-fade-in-scale-up pointer-events-auto border border-white/20 rounded-2xl overflow-hidden shadow-2xl bg-white/95 backdrop-blur-3xl relative" onClick={e => e.stopPropagation()}>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:128px_128px] pointer-events-none"></div>
                    
                    <header className="flex-shrink-0">
                        <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 p-4 md:p-5 border-b border-blue-200/30 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-400/20 transition-all duration-700"></div>

                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-10 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full shadow-sm"></div>
                                    <div className="flex flex-col">
                                        <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                                            BỔ SUNG <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-700">CHỨNG TỪ</span>
                                        </h1>
                                        <p className="text-[10px] md:text-xs text-text-secondary font-bold uppercase tracking-wider mt-0.5">Tải lên các tệp mới để cập nhật hoặc thay thế</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/50 hover:bg-white text-gray-400 hover:text-gray-900 transition-all hover:rotate-90 hover:scale-110 shadow-sm border border-gray-100">
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>
                        </div>
                    </header>

                    <main className="flex-grow min-h-0 flex flex-col overflow-hidden relative z-10">
                        <div className="flex-grow flex flex-col p-4 md:p-5 gap-4 overflow-hidden">
                            {/* Summary Box */}
                            <div className="bg-gradient-to-br from-blue-50/80 via-white to-blue-50/80 flex-shrink-0 rounded-xl border border-blue-200/40 relative overflow-hidden group shadow-sm transition-all duration-300 p-3 md:p-4">
                                <div className="absolute top-0 right-0 p-2 md:p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <i className="fas fa-folder-open text-4xl md:text-5xl text-blue-600 transform rotate-12"></i>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 relative z-10 gap-3 md:gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-0.5">Số đơn hàng</span>
                                        <div className="flex items-center gap-1.5 text-blue-600">
                                            <i className="fas fa-barcode opacity-70"></i>
                                            <span className="font-bold font-mono tracking-tight">{order["Số đơn hàng"]}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:border-l md:border-accent-primary/20 md:pl-4">
                                        <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-0.5">Khách hàng</span>
                                        <div className="flex items-center gap-1.5 text-text-primary">
                                            <i className="fas fa-user text-blue-600 opacity-70"></i>
                                            <span className="font-bold truncate" title={order["Tên khách hàng"]}>{order["Tên khách hàng"]}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:border-l md:border-accent-primary/20 md:pl-4">
                                        <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-0.5">Số VIN</span>
                                        <div className="flex items-center gap-1.5 text-text-primary">
                                            <i className="fas fa-car text-blue-600 opacity-70"></i>
                                            <span className="font-bold font-mono tracking-tight">{order.VIN || '---'}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:border-l md:border-accent-primary/20 md:pl-4">
                                        <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-0.5">Ngoại thất / Máy</span>
                                        <div className="flex items-center gap-1.5 text-text-primary">
                                            <i className="fas fa-palette text-blue-600 opacity-70"></i>
                                            <span className="font-bold tracking-tight">{order["Ngoại thất"] || '---'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Alert/Instruction */}
                            <div className="flex flex-shrink-0 items-start gap-3 p-4 text-sm bg-warning-bg/80 rounded-lg border border-warning/40 text-amber-900 shadow-sm backdrop-blur-md">
                                <i className="fas fa-info-circle mt-0.5 text-amber-600 text-lg"></i>
                                <p className="leading-relaxed">
                                    <strong>Lưu ý:</strong> Chỉ cần tải lên tệp bạn muốn bổ sung hoặc thay thế. Các chứng từ cũ không được chọn tải lên sẽ vẫn giữ nguyên an toàn trên hệ thống.
                                </p>
                            </div>

                            {/* File Uploads */}
                            <div className="bg-white/60 flex flex-col p-5 md:p-8 rounded-2xl border border-gray-200/60 shadow-sm flex-grow overflow-hidden">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base">
                                        <i className="fas fa-cloud-upload-alt text-blue-500"></i> Khu vực tải tệp mới
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow">
                                    <SimpleFileUpload 
                                        id="supp_hop_dong_file_input" 
                                        label="Hợp đồng mua bán (Mới)" 
                                        onFileSelect={handleContractFileSelect} 
                                        accept=".pdf,image/*" 
                                        disableCompression={true} 
                                        showPreview={false} 
                                        className="flex flex-col h-full"
                                    />
                                    <SimpleFileUpload 
                                        id="supp_denghi_xhd_file_input" 
                                        label="Đề nghị XHD (Mới)" 
                                        onFileSelect={handleProposalFileSelect} 
                                        accept=".pdf,image/*" 
                                        disableCompression={true} 
                                        showPreview={false} 
                                        className="flex flex-col h-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </main>

                    <footer className="flex-shrink-0 p-4 md:p-5 border-t border-blue-200/30 bg-gradient-to-r from-blue-50/95 via-white/95 to-blue-50/95 backdrop-blur-xl flex justify-end items-center gap-3 relative z-10 shadow-inner">
                        <Button onClick={onClose} disabled={isSubmitting} variant="secondary" size="md">
                            Hủy Bỏ
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting || !isFormValid} variant="success" size="md" isLoading={isSubmitting} leftIcon={!isSubmitting ? <i className="fas fa-cloud-upload-alt"></i> : undefined}>
                            Xác Nhận Bổ Sung
                        </Button>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default SupplementaryFileModal;
