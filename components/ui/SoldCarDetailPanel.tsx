import React, { useState } from 'react';
import { Order } from '../../types';
import { getBackgroundColorStyle } from '../../utils/styleUtils';

const DetailRow: React.FC<{ icon: string, label: string; value?: string | number }> = ({ icon, label, value }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 group hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-accent-primary/10 group-hover:text-accent-primary transition-all duration-300">
                <i className={`fas ${icon} text-xs`}></i>
            </div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-[13px] font-bold text-slate-700 text-right">{value || '—'}</span>
    </div>
);

interface SoldCarDetailPanelProps {
    order: Order | null;
    showOrderInAdmin?: (order: Order, targetTab: any) => void;
    showAdminTab?: (targetTab: any) => void;
    isAdmin?: boolean;
}

const SoldCarDetailPanel: React.FC<SoldCarDetailPanelProps> = ({ order }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = (textToCopy: string) => {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(() => { });
    };

    if (!order) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200 m-3 animate-fade-in">
                <i className="fas fa-hand-pointer text-slate-200 text-4xl mb-4"></i>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Chọn Đơn Hàng</p>
                <p className="text-slate-300 text-xs mt-1">Vui lòng chọn từ danh sách bên trái</p>
            </div>
        );
    }

    return (
        <div className="p-4 flex flex-col h-full space-y-4 animate-fade-in overflow-hidden">
            {/* Header / Order ID Section */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">
                        {order["Tên khách hàng"]}
                    </h2>
                    <p className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-mono font-bold text-slate-500 uppercase">
                        <i className="fas fa-hashtag text-[8px]"></i>
                        {order["Số đơn hàng"]}
                    </p>
                </div>
            </div>

            {/* Main Info Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-4 space-y-1 relative overflow-hidden flex-shrink-0">
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-1 h-full bg-accent-primary/40"></div>
                
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Thông tin chung</span>
                    <div 
                        onClick={() => handleCopy(order.VIN || '')}
                        className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded-lg transition-all ${isCopied ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    >
                        <span className="text-[10px] font-mono font-bold">{order.VIN}</span>
                        <i className={`fas ${isCopied ? 'fa-check' : 'fa-copy'} text-[10px]`}></i>
                    </div>
                </div>

                <DetailRow icon="fa-user-tie" label="Sale" value={order["Tên tư vấn bán hàng"]} />
                <DetailRow icon="fa-car" label="Xe" value={order["Dòng xe"]} />
                <DetailRow icon="fa-layer-group" label="Bản" value={order["Phiên bản"]} />
            </div>

            {/* Colors Section - Horizontal Cards */}
            <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                <div className="bg-slate-50/50 border border-white rounded-2xl p-3 hover:bg-white hover:shadow-md transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full border border-white flex-shrink-0 shadow-sm" style={getBackgroundColorStyle(order["Ngoại thất"])}></div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Ngoại thất</span>
                    </div>
                    <p className="text-xs font-bold text-slate-700 truncate group-hover:text-accent-primary transition-colors">{order["Ngoại thất"]}</p>
                </div>
                <div className="bg-slate-50/50 border border-white rounded-2xl p-3 hover:bg-white hover:shadow-md transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full border border-white flex-shrink-0 shadow-sm" style={getBackgroundColorStyle(order["Nội thất"])}></div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Nội thất</span>
                    </div>
                    <p className="text-xs font-bold text-slate-700 truncate group-hover:text-accent-primary transition-colors">{order["Nội thất"]}</p>
                </div>
            </div>

            {/* Footer Status Badge or Info */}
            <div className="mt-auto pt-2 flex items-center justify-between border-t border-slate-50">
                <span className="text-[10px] text-slate-300 italic font-medium">Cập nhật 2 phút trước</span>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/40"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/20"></div>
                </div>
            </div>
        </div>
    );
};

export default SoldCarDetailPanel;