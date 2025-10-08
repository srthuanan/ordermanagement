import React, { useState } from 'react';
import { Order } from '../../types';
import SimpleFileUpload from '../ui/SimpleFileUpload';

interface SupplementaryFileModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: (order: Order, contractFile: File | null, proposalFile: File | null) => void;
}

const InfoRow: React.FC<{ label: string; value: string; icon: string; isMono?: boolean }> = ({ label, value, icon, isMono = false }) => (
    <div className="flex items-center gap-3 text-sm">
        <i className={`fas ${icon} fa-fw w-4 text-center text-accent-secondary`}></i>
        <span className="text-text-secondary">{label}:</span>
        <span className={`font-semibold text-text-primary ${isMono ? 'font-mono' : ''}`}>{value}</span>
    </div>
);

const SupplementaryFileModal: React.FC<SupplementaryFileModalProps> = ({ order, onClose, onConfirm }) => {
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [proposalFile, setProposalFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        if (!contractFile && !proposalFile) {
            alert("Vui lòng chọn ít nhất một file để bổ sung.");
            return;
        }
        setIsSubmitting(true);
        onConfirm(order, contractFile, proposalFile);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface-card w-full max-w-2xl rounded-2xl shadow-xl animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <header className="relative flex flex-col items-center justify-center p-6 text-center bg-surface-card border-b border-border-primary">
                    <div className="animate-fade-in-down">
                        <h2 className="text-xl font-bold text-gradient">Bổ Sung Chứng Từ</h2>
                        <p className="text-sm text-text-secondary mt-1">Tải lên các tệp mới để cập nhật hoặc thay thế.</p>
                    </div>
                    <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-text-secondary hover:bg-surface-hover">
                        <i className="fas fa-times"></i>
                    </button>
                </header>

                <main className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Order Summary */}
                    <div className="p-4 bg-surface-ground rounded-lg border border-border-primary space-y-2">
                         <h3 className="font-semibold text-text-primary text-base mb-2">Tóm tắt yêu cầu</h3>
                        <InfoRow label="Số đơn hàng" value={order["Số đơn hàng"]} icon="fa-barcode" isMono />
                        <InfoRow label="Khách hàng" value={order["Tên khách hàng"]} icon="fa-user" />
                    </div>

                    {/* Alert/Instruction */}
                    <div className="flex items-start gap-3 p-3 text-sm bg-warning-bg rounded-lg border border-warning/30 text-yellow-800">
                        <i className="fas fa-info-circle mt-0.5"></i>
                        <p>
                           <strong>Lưu ý:</strong> Chỉ cần tải lên tệp bạn muốn thay thế. Các tệp không được tải lên sẽ được giữ nguyên.
                        </p>
                    </div>

                    {/* File Uploads */}
                     <div>
                        <h3 className="font-semibold text-text-primary text-base mb-3">Tải lên tệp mới</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <SimpleFileUpload id="supp_hop_dong_file_input" label="Hợp đồng mua bán (Mới)" onFileSelect={setContractFile} accept=".pdf" />
                            <SimpleFileUpload id="supp_denghi_xhd_file_input" label="Đề nghị XHD (Mới)" onFileSelect={setProposalFile} accept=".pdf" />
                        </div>
                    </div>
                </main>
                <footer className="p-4 border-t border-border-primary flex justify-end gap-4 bg-surface-ground rounded-b-2xl">
                    <button onClick={onClose} disabled={isSubmitting} className="btn-secondary">Hủy</button>
                    <button
                        onClick={handleSubmit}
                        disabled={!contractFile && !proposalFile || isSubmitting}
                        className="btn-primary"
                    >
                        {isSubmitting ? <><i className="fas fa-spinner fa-spin mr-2"></i> Đang gửi...</> : <><i className="fas fa-check-circle mr-2"></i> Cập nhật & Gửi</>}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default SupplementaryFileModal;