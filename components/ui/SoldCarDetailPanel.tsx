import React, { useState } from 'react';
import { Order } from '../../types';

const DetailInfoRow: React.FC<{ icon: string, label: string; value?: string | number; valueClassName?: string }> = ({ icon, label, value, valueClassName }) => (
    <div className="flex items-start gap-2 py-2 border-b border-dashed border-border-primary/50">
        <i className={`fas ${icon} text-accent-secondary text-base w-5 text-center mt-1`}></i>
        <div className="flex-1">
            <p className="text-xs text-text-secondary">{label}</p>
            <p className={`text-sm text-text-primary font-semibold break-words ${valueClassName}`}>{value || '—'}</p>
        </div>
    </div>
);

interface SoldCarDetailPanelProps {
    order: Order | null;
    showOrderInAdmin?: (order: Order, targetTab: any) => void;
    showAdminTab?: (targetTab: any) => void;
    isAdmin?: boolean;
}


const SoldCarDetailPanel: React.FC<SoldCarDetailPanelProps> = ({ order, showOrderInAdmin, isAdmin }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = (textToCopy: string) => {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(() => { });
    };

    return (
        <div className="detail-panel h-full">
            <h3 className="text-lg font-bold text-text-primary mb-0 p-2 border-b border-border-primary flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <i className="fas fa-file-invoice text-accent-primary"></i>
                    Chi Tiết Đơn Hàng
                </div>
                {isAdmin && order && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => showOrderInAdmin?.(order, 'matching')}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-accent-primary hover:text-white text-slate-400 transition-all border border-slate-200/50"
                            title="Đến Ghép Xe"
                        >
                            <i className="fas fa-car text-[11px]"></i>
                        </button>
                        <button
                            onClick={() => showOrderInAdmin?.(order, 'invoices')}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-accent-primary hover:text-white text-slate-400 transition-all border border-slate-200/50"
                            title="Đến Hóa Đơn"
                        >
                            <i className="fas fa-file-invoice-dollar text-[11px]"></i>
                        </button>
                        <button
                            onClick={() => showOrderInAdmin?.(order, 'vc')}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-accent-primary hover:text-white text-slate-400 transition-all border border-slate-200/50"
                            title="Đến Xử Lý VC"
                        >
                            <i className="fas fa-id-card text-[11px]"></i>
                        </button>
                    </div>
                )}
            </h3>
            <div className="detail-panel-body flex-grow hidden-scrollbar">
                {order ? (
                    <div className="space-y-2">
                        {/* VIN Display */}
                        <div
                            className="relative p-2 my-1 rounded-lg bg-slate-800 text-center shadow-lg cursor-pointer hover:bg-slate-700 transition-colors"
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
                            <h4 className="font-semibold text-text-primary mb-1 mt-1">
                                <i className="fas fa-user-circle mr-2 text-accent-secondary"></i>
                                Thông tin Khách Hàng
                            </h4>
                            <div className="pl-2">
                                <DetailInfoRow icon="fa-user" label="Tên Khách Hàng" value={order["Tên khách hàng"]} />
                                <DetailInfoRow icon="fa-barcode" label="Số Đơn Hàng" value={order["Số đơn hàng"]} valueClassName="font-mono" />
                                <DetailInfoRow icon="fa-user-tie" label="Tư Vấn Bán Hàng" value={order["Tên tư vấn bán hàng"]} />
                            </div>
                        </div>

                        {/* Vehicle Info */}
                        <div>
                            <h4 className="font-semibold text-text-primary mb-1 mt-2">
                                <i className="fas fa-car mr-2 text-accent-secondary"></i>
                                Chi tiết Xe
                            </h4>
                            <div className="pl-2">
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