import React, { useState } from 'react';
import { Order } from '../../types';

const DetailInfoRow: React.FC<{ icon: string, label: string; value?: string | number; valueClassName?: string }> = ({ icon, label, value, valueClassName }) => (
    <div className="flex items-start gap-4 py-3 border-b border-dashed border-border-primary/50">
        <i className={`fas ${icon} text-accent-secondary text-base w-5 text-center mt-1`}></i>
        <div className="flex-1">
            <p className="text-xs text-text-secondary">{label}</p>
            <p className={`text-sm text-text-primary font-semibold break-words ${valueClassName}`}>{value || '—'}</p>
        </div>
    </div>
);

interface SoldCarDetailPanelProps {
    order: Order | null;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}


const SoldCarDetailPanel: React.FC<SoldCarDetailPanelProps> = ({ order, showToast }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = (textToCopy: string) => {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy).then(() => {
            setIsCopied(true);
            showToast('Đã Sao Chép', `Số VIN ${textToCopy} đã được sao chép.`, 'success', 2000);
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(() => {
            showToast('Lỗi Sao Chép', 'Không thể truy cập clipboard.', 'error');
        });
    };

    return (
        <div className="detail-panel h-full">
            <h3 className="text-lg font-bold text-text-primary mb-0 p-4 border-b border-border-primary flex items-center gap-3 flex-shrink-0">
                <i className="fas fa-file-invoice text-accent-primary"></i>
                Chi Tiết Đơn Hàng
            </h3>
            <div className="detail-panel-body flex-grow">
                {order ? (
                    <div className="space-y-4">
                        {/* VIN Display */}
                        <div 
                            className="relative p-3 my-2 rounded-lg bg-slate-800 text-center shadow-lg cursor-pointer hover:bg-slate-700 transition-colors"
                            onClick={() => handleCopy(order.VIN || '')}
                            title="Click để sao chép VIN"
                        >
                            <p className="text-xs text-slate-400 uppercase tracking-widest">Số Khung (VIN)</p>
                            <p className="text-white font-mono tracking-wider text-xl break-all">{order.VIN}</p>
                            {isCopied && (
                                <div className="absolute top-1 right-1 text-xs font-semibold text-success bg-success-bg/20 px-1.5 py-0.5 rounded-full animate-fade-in">
                                    ✓
                                </div>
                            )}
                        </div>
                        
                        {/* Customer Info */}
                        <div>
                            <h4 className="font-semibold text-text-primary mb-2 mt-2">
                                <i className="fas fa-user-circle mr-2 text-accent-secondary"></i>
                                Thông tin Khách Hàng
                            </h4>
                            <div className="pl-4">
                               <DetailInfoRow icon="fa-user" label="Tên Khách Hàng" value={order["Tên khách hàng"]} />
                               <DetailInfoRow icon="fa-barcode" label="Số Đơn Hàng" value={order["Số đơn hàng"]} valueClassName="font-mono" />
                               <DetailInfoRow icon="fa-user-tie" label="Tư Vấn Bán Hàng" value={order["Tên tư vấn bán hàng"]} />
                            </div>
                        </div>

                        {/* Vehicle Info */}
                        <div>
                            <h4 className="font-semibold text-text-primary mb-2 mt-4">
                                <i className="fas fa-car mr-2 text-accent-secondary"></i>
                                Chi tiết Xe
                            </h4>
                             <div className="pl-4">
                                <DetailInfoRow icon="fa-car-side" label="Dòng Xe" value={order["Dòng xe"]} />
                                <DetailInfoRow icon="fa-cogs" label="Phiên Bản" value={order["Phiên bản"]} />
                                <DetailInfoRow icon="fa-palette" label="Ngoại Thất" value={order["Ngoại thất"]} />
                                <DetailInfoRow icon="fa-chair" label="Nội Thất" value={order["Nội thất"]} />
                             </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-text-secondary p-8 flex flex-col items-center justify-center h-full min-h-[200px]">
                        <i className="fas fa-mouse-pointer fa-2x mb-4 text-text-placeholder"></i>
                        <p className="font-semibold">Chưa chọn đơn hàng</p>
                        <p className="text-sm">Chọn một mục từ bảng để xem chi tiết.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SoldCarDetailPanel;