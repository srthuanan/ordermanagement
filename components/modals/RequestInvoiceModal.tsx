import React, { useState } from 'react';
import { Order } from '../../types';
import SimpleFileUpload from '../ui/SimpleFileUpload';

interface RequestInvoiceModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: (order: Order, contractFile: File, proposalFile: File) => void;
}

const InfoRow: React.FC<{ label: string; value: string; icon: string; isMono?: boolean }> = ({ label, value, icon, isMono = false }) => (
    <div className="flex items-center gap-3 text-sm">
        <i className={`fas ${icon} fa-fw w-4 text-center text-accent-secondary`}></i>
        <span className="text-text-secondary">{label}:</span>
        <span className={`font-semibold text-text-primary ${isMono ? 'font-mono' : ''}`}>{value}</span>
    </div>
);


const RequestInvoiceModal: React.FC<RequestInvoiceModalProps> = ({ order, onClose, onConfirm }) => {
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [proposalFile, setProposalFile] = useState<File | null>(null);
    const [vinClubConfirmed, setVinClubConfirmed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        if (!contractFile || !proposalFile) {
            alert("Vui lòng tải lên đủ cả 2 tệp: Hợp đồng và Đề nghị XHD.");
            return;
        }
        if (!vinClubConfirmed) {
            alert("Bạn phải xác nhận khách hàng đã tạo tài khoản Vinclub.");
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
                        <h2 className="text-xl font-bold text-gradient">Yêu Cầu Xuất Hóa Đơn</h2>
                        <p className="text-sm text-text-secondary mt-1">Cung cấp chứng từ để tiến hành xuất hóa đơn.</p>
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
                        <InfoRow label="Số VIN" value={order.VIN || 'N/A'} icon="fa-car" isMono />
                    </div>

                    {/* File Uploads */}
                    <div>
                        <h3 className="font-semibold text-text-primary text-base mb-3">Tải lên chứng từ</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <SimpleFileUpload id="hop_dong_file_input" label="1. Hợp đồng mua bán" onFileSelect={setContractFile} required accept=".pdf" />
                            <SimpleFileUpload id="denghi_xhd_file_input" label="2. Đề nghị xuất hóa đơn" onFileSelect={setProposalFile} required accept=".pdf" />
                        </div>
                    </div>

                    {/* Final Confirmation */}
                    <div>
                         <h3 className="font-semibold text-text-primary text-base mb-3">Xác nhận cuối cùng</h3>
                        <div className="relative p-4 rounded-lg border border-accent-primary/20 bg-surface-accent">
                            <div className="flex items-start">
                                <div className="flex items-center h-6">
                                    <input
                                        id="vinclub-confirm"
                                        type="checkbox"
                                        checked={vinClubConfirmed}
                                        onChange={(e) => setVinClubConfirmed(e.target.checked)}
                                        className="focus:ring-accent-primary h-5 w-5 text-accent-primary border-border-secondary rounded-md cursor-pointer"
                                    />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor="vinclub-confirm" className="font-medium text-text-primary cursor-pointer">
                                        Tôi xác nhận khách hàng đã tạo tài khoản Vinclub.
                                    </label>
                                    <p className="text-accent-primary/80">Đây là điều kiện bắt buộc để tiếp tục.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
                
                <footer className="p-4 border-t border-border-primary flex justify-end gap-4 bg-surface-ground rounded-b-2xl">
                    <button onClick={onClose} disabled={isSubmitting} className="btn-secondary">Hủy</button>
                    <button
                        onClick={handleSubmit}
                        disabled={!contractFile || !proposalFile || !vinClubConfirmed || isSubmitting}
                        className="btn-primary"
                    >
                         {isSubmitting ? <><i className="fas fa-spinner fa-spin mr-2"></i> Đang gửi...</> : <><i className="fas fa-paper-plane mr-2"></i> Xác nhận & Gửi</>}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default RequestInvoiceModal;