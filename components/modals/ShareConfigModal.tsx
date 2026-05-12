import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../services/apiService';
import moment from 'moment';

interface ShareConfigModalProps {
    car: any;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const ShareConfigModal: React.FC<ShareConfigModalProps> = ({ car, onClose, showToast }) => {
    const [expiration, setExpiration] = useState<string>('2'); // hours
    const [isGenerating, setIsGenerating] = useState(false);
    const [sharedLink, setSharedLink] = useState<string | null>(null);
    const [activeShares, setActiveShares] = useState<any[]>([]);
    const [isLoadingShares, setIsLoadingShares] = useState(true);
    const [viewMode, setViewMode] = useState<'create' | 'manage'>('create');

    useEffect(() => {
        fetchActiveShares();
    }, [car.vin]);

    const fetchActiveShares = async () => {
        setIsLoadingShares(true);
        try {
            const { data, error } = await supabase
                .from('shared_locations')
                .select('*')
                .eq('vin', car.vin)
                .eq('is_active', true)
                .gt('expires_at', moment().toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;
            setActiveShares(data || []);
            if (data && data.length > 0 && sharedLink === null) setViewMode('manage');
        } catch (err) {
            console.error('Error fetching active shares:', err);
        } finally {
            setIsLoadingShares(false);
        }
    };

    const generateToken = () => {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    };

    const handleShare = async () => {
        setIsGenerating(true);
        try {
            const token = generateToken();
            const expiresAt = moment().add(parseInt(expiration), 'hours').toISOString();
            
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('shared_locations')
                .insert({
                    vin: car.vin,
                    token: token,
                    expires_at: expiresAt,
                    created_by: user?.id,
                    is_active: true
                });

            if (error) throw error;

            const url = window.location.origin + window.location.pathname + '?token=' + token;
            setSharedLink(url);
            navigator.clipboard.writeText(url);
            showToast('Thành công', 'Đã tạo link chia sẻ!', 'success');
            fetchActiveShares();
        } catch (err: any) {
            console.error('Error creating share link:', err);
            showToast('Lỗi', 'Không thể tạo link chia sẻ: ' + err.message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRevoke = async (id: string) => {
        try {
            const { error } = await supabase
                .from('shared_locations')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;
            setActiveShares(prev => prev.filter(s => s.id !== id));
            showToast('Thành công', 'Đã hủy chia sẻ!', 'success');
        } catch (err) {
            showToast('Lỗi', 'Không thể hủy chia sẻ.', 'error');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] w-full max-w-md overflow-hidden animate-scale-up border border-slate-100">
                {/* Header Section */}
                <div className="relative p-6 pb-4">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">CHIA SẺ VỊ TRÍ</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100 uppercase tracking-wider">
                                    {car.dong_xe}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{car.vin}</span>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-all active:scale-90"
                        >
                            <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    {!sharedLink && (
                        <div className="mt-8 p-1 bg-slate-100/80 rounded-2xl flex">
                            <button 
                                onClick={() => setViewMode('create')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-black rounded-xl transition-all ${viewMode === 'create' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <i className="fa-solid fa-plus-circle text-xs"></i>
                                TẠO MỚI
                            </button>
                            <button 
                                onClick={() => setViewMode('manage')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-black rounded-xl transition-all relative ${viewMode === 'manage' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <i className="fa-solid fa-share-nodes text-xs"></i>
                                QUẢN LÝ
                                {activeShares.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-[9px] flex items-center justify-center rounded-full border-2 border-white shadow-sm font-black">
                                        {activeShares.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {!sharedLink ? (
                    <div className="px-6 pb-8 pt-2">
                        {viewMode === 'create' ? (
                            <div className="space-y-8 animate-fade-in">
                                {/* Expiration Cards */}
                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Thời gian hiệu lực</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: '2 Giờ', value: '2', icon: 'fa-clock' },
                                            { label: '6 Giờ', value: '6', icon: 'fa-hourglass-half' },
                                            { label: '24 Giờ', value: '24', icon: 'fa-calendar-day' }
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setExpiration(opt.value)}
                                                className={`group flex flex-col items-center gap-2 p-4 rounded-[20px] transition-all border-2 ${expiration === opt.value ? 'bg-indigo-50 border-indigo-600 shadow-[0_8px_20px_rgba(79,70,229,0.15)]' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${expiration === opt.value ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                                                    <i className={`fa-solid ${opt.icon} text-xs`}></i>
                                                </div>
                                                <span className={`text-[11px] font-black tracking-tight ${expiration === opt.value ? 'text-indigo-600' : 'text-slate-500'}`}>
                                                    {opt.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleShare}
                                    disabled={isGenerating}
                                    className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-black rounded-3xl shadow-[0_12px_24px_rgba(79,70,229,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                    {isGenerating ? (
                                        <i className="fa-solid fa-circle-notch fa-spin text-xl"></i>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-bolt-lightning text-lg animate-pulse"></i>
                                            <span className="text-sm tracking-widest uppercase">TẠO LINK TRUY CẬP</span>
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Link sẽ tự động vô hiệu hóa sau khi hết hạn</p>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fade-in h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                                {isLoadingShares ? (
                                    <div className="h-full flex flex-col items-center justify-center gap-3">
                                        <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu...</span>
                                    </div>
                                ) : activeShares.length > 0 ? (
                                    activeShares.map(share => (
                                        <div key={share.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                                                        <i className="fa-solid fa-link text-[10px] text-indigo-500"></i>
                                                        ID: {share.token.substring(0, 6)}...
                                                    </span>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                            <i className="fa-solid fa-eye text-[8px]"></i>
                                                            {share.view_count || 0} VIEW
                                                        </span>
                                                        <span className="text-[9px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                            <i className="fa-solid fa-clock text-[8px]"></i>
                                                            {moment(share.expires_at).fromNow(true)} CÒN LẠI
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1.5">
                                                    <button 
                                                        onClick={() => {
                                                            const url = window.location.origin + window.location.pathname + '?token=' + share.token;
                                                            navigator.clipboard.writeText(url);
                                                            showToast('Thành công', 'Đã copy link!', 'success');
                                                        }}
                                                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 flex items-center justify-center transition-all shadow-sm active:scale-90"
                                                    >
                                                        <i className="fa-solid fa-copy text-xs"></i>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRevoke(share.id)}
                                                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 flex items-center justify-center transition-all shadow-sm active:scale-90"
                                                    >
                                                        <i className="fa-solid fa-trash-can text-xs"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-300">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-3xl">
                                            <i className="fa-solid fa-cloud-moon"></i>
                                        </div>
                                        <div className="text-center space-y-1">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Không có link hoạt động</p>
                                            <p className="text-[10px] font-bold text-slate-300 px-8 leading-relaxed">Mọi link chia sẻ đã hết hạn hoặc đã bị xóa.</p>
                                        </div>
                                        <button 
                                            onClick={() => setViewMode('create')}
                                            className="px-4 py-2 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-xl hover:bg-indigo-100 transition-all"
                                        >
                                            TẠO LINK MỚI NGAY
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-8 flex flex-col items-center gap-8 animate-fade-in">
                        <div className="relative">
                            <div className="absolute -inset-4 bg-indigo-50 rounded-[40px] animate-pulse"></div>
                            <div className="relative p-6 bg-white rounded-[32px] shadow-[0_15px_30px_rgba(0,0,0,0.1)] border border-slate-100">
                                <QRCodeSVG value={sharedLink} size={160} />
                            </div>
                        </div>
                        
                        <div className="w-full text-center space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                                <i className="fa-solid fa-check-circle text-xs"></i>
                                <span className="text-[10px] font-black uppercase tracking-wider">Đã sao chép link</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 break-all text-[11px] font-mono text-slate-500 leading-relaxed">
                                {sharedLink}
                            </div>
                        </div>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(sharedLink);
                                    showToast('Thành công', 'Đã copy lại link!', 'success');
                                }}
                                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <i className="fa-solid fa-copy"></i>
                                COPY LẠI
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <i className="fa-solid fa-check"></i>
                                HOÀN TẤT
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShareConfigModal;
