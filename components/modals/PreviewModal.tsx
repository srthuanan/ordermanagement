import React from 'react';

interface PreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    data: Record<string, string>;
    fileName?: string;
    isSubmitting: boolean;
}

const labelMap: Record<string, string> = {
    "ten_ban_hang": "Tên Tư Vấn Bán Hàng",
    "ten_khach_hang": "Tên Khách Hàng",
    "dong_xe": "Dòng Xe",
    "phien_ban": "Phiên Bản",
    "ngoai_that": "Ngoại Thất",
    "noi_that": "Nội Thất",
    "so_don_hang": "Số Đơn Hàng",
    "ngay_coc": "Ngày Cọc",
};

const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString('vi-VN');
    } catch {
        return dateString;
    }
};

const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, onConfirm, data, fileName, isSubmitting }) => {
    if (!isOpen) return null;

    return (
         <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-surface-card w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl shadow-xl animate-fade-in-scale-up"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-5 border-b border-border-primary">
                    <h2 className="text-xl font-bold text-text-primary">Xác Nhận Thông Tin</h2>
                    <button 
                        onClick={onClose}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </header>
                <main className="overflow-y-auto p-6">
                    <p className="text-sm text-text-secondary mb-4 p-3 bg-surface-ground rounded-lg">Vui lòng kiểm tra kỹ các thông tin dưới đây trước khi gửi yêu cầu.</p>
                    <div className="space-y-2">
                        {Object.entries(data).map(([key, value]) => (
                             <div key={key} className="flex justify-between items-start text-sm py-2.5 border-b border-dashed border-border-primary">
                                <span className="text-text-secondary">{labelMap[key] || key}</span>
                                <span className="font-semibold text-right text-text-primary">{key === 'ngay_coc' ? formatDateTime(String(value)) : (String(value) || 'N/A')}</span>
                            </div>
                        ))}
                        {fileName && (
                             <div className="flex justify-between items-start text-sm py-2.5">
                                <span className="text-text-secondary">Ảnh Ủy nhiệm chi</span>
                                <span className="font-semibold text-right truncate text-text-primary" title={fileName}>{fileName}</span>
                            </div>
                        )}
                    </div>
                </main>
                <footer className="p-4 border-t border-border-primary flex justify-end items-center gap-4 bg-surface-ground rounded-b-2xl">
                    <button 
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="btn-secondary"
                    >
                        Chỉnh sửa
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="btn-primary"
                    >
                        {isSubmitting ? <><i className="fas fa-spinner fa-spin mr-2"></i> Đang gửi...</> : "Xác nhận & Gửi"}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default PreviewModal;