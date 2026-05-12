import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../services/apiService';
import moment from 'moment';

interface ShareSidePanelProps {
    car: any;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const ShareSidePanel: React.FC<ShareSidePanelProps> = ({ car, onClose, showToast }) => {
    const [expiration, setExpiration] = useState<string>('2'); // hours
    const [isGenerating, setIsGenerating] = useState(false);
    const [sharedLink, setSharedLink] = useState<string | null>(null);
    const [activeShares, setActiveShares] = useState<any[]>([]);
    const [isLoadingShares, setIsLoadingShares] = useState(true);
    const [viewMode, setViewMode] = useState<'create' | 'manage'>('create');

    useEffect(() => {
        fetchActiveShares();
        
        // Listen for realtime view_count updates
        const channel = supabase
            .channel(`share_updates_${car.vin}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'shared_locations',
                    filter: `vin=eq.${car.vin}`,
                },
                (payload) => {
                    if (payload.new) {
                        setActiveShares(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
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
        <>
            {/* Side Panel Container - Minimalist Elegance */}
            <div className="fixed top-[64px] right-0 h-[calc(100vh-64px)] w-full md:w-[380px] bg-white z-[40] animate-slide-in-right border-l border-slate-200 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
                
                {/* Slim Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex flex-col">
                        <h3 className="text-[13px] font-black text-slate-800 tracking-wider uppercase">Chia Sẻ Vị Trí</h3>
                        <p className="text-[10px] font-bold text-slate-400 tracking-tight">{car.vin}</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-white hover:shadow-sm text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Sub-Header: Car & Tabs */}
                <div className="p-6 pb-2 space-y-5">
                    {/* Compact Car Info */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                            <i className="fa-solid fa-car text-sm"></i>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[14px] font-bold text-slate-800 truncate">{car.phien_ban || car.dong_xe}</span>
                            <span className="text-[10px] font-medium text-slate-500">{car.ngoai_that} / {car.noi_that}</span>
                        </div>
                    </div>

                    {/* Minimalist Tab Switcher */}
                    <div className="flex border-b border-slate-100">
                        <button 
                            onClick={() => setViewMode('create')}
                            className={`flex-1 py-3 text-[11px] font-black transition-all relative ${viewMode === 'create' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            TẠO LINK MỚI
                            {viewMode === 'create' && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 rounded-full animate-fade-in"></div>}
                        </button>
                        <button 
                            onClick={() => setViewMode('manage')}
                            className={`flex-1 py-3 text-[11px] font-black transition-all relative ${viewMode === 'manage' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            ĐANG CHIA SẺ
                            {activeShares.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px]">{activeShares.length}</span>}
                            {viewMode === 'manage' && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 rounded-full animate-fade-in"></div>}
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
                    {!sharedLink ? (
                        viewMode === 'create' ? (
                            <div className="space-y-8 animate-fade-in">
                                {/* Expiration Options - Simple & Clean */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hạn dùng link</label>
                                    <div className="space-y-2">
                                        {[
                                            { label: '2 Giờ', value: '2', icon: 'fa-clock', desc: 'Dành cho khách xem ngay' },
                                            { label: '6 Giờ', value: '6', icon: 'fa-hourglass-half', desc: 'Dành cho vận chuyển xa' },
                                            { label: '24 Giờ', value: '24', icon: 'fa-calendar-day', desc: 'Dành cho khách ở tỉnh' }
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setExpiration(opt.value)}
                                                className={`w-full group flex items-center justify-between p-4 rounded-2xl transition-all border ${expiration === opt.value ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${expiration === opt.value ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                                                        <i className={`fa-solid ${opt.icon} text-xs`}></i>
                                                    </div>
                                                    <div className="flex flex-col text-left">
                                                        <span className={`text-[13px] font-bold ${expiration === opt.value ? 'text-indigo-600' : 'text-slate-700'}`}>
                                                            {opt.label}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">{opt.desc}</span>
                                                    </div>
                                                </div>
                                                {expiration === opt.value && <i className="fa-solid fa-check text-indigo-600 text-[10px]"></i>}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Refined Primary Button */}
                                <button
                                    onClick={handleShare}
                                    disabled={isGenerating}
                                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold text-[11px] rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 tracking-wide mt-2"
                                >
                                    {isGenerating ? (
                                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-link text-[10px]"></i>
                                            TẠO LINK TRUY CẬP
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3 animate-fade-in">
                                {isLoadingShares ? (
                                    <div className="py-20 flex flex-col items-center justify-center gap-3 opacity-30">
                                        <i className="fa-solid fa-circle-notch fa-spin text-xl"></i>
                                        <span className="text-[9px] font-black uppercase tracking-widest">Đang tải...</span>
                                    </div>
                                ) : activeShares.length > 0 ? (
                                    activeShares.map(share => (
                                        <div key={share.id} className="group relative p-5 bg-white rounded-3xl border border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 overflow-hidden">
                                            {/* Decorative Background Accent */}
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
                                            
                                            <div className="relative flex justify-between items-start mb-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                                        <span className="text-[12px] font-black text-slate-800 tracking-tight">Mã: {share.token.substring(0, 10)}</span>
                                                    </div>
                                                    
                                                    <div className="flex flex-wrap gap-2">
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-full border border-slate-100">
                                                            <i className="fa-solid fa-eye text-[9px]"></i>
                                                            <span className="text-[10px] font-black">{share.view_count || 0} LƯỢT XEM</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                                                            <i className="fa-solid fa-clock text-[9px]"></i>
                                                            <span className="text-[10px] font-black uppercase">{moment(share.expires_at).fromNow()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <button 
                                                    onClick={() => handleRevoke(share.id)}
                                                    className="w-8 h-8 rounded-xl bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center"
                                                    title="Hủy link"
                                                >
                                                    <i className="fa-solid fa-trash-can text-[11px]"></i>
                                                </button>
                                            </div>

                                            <button 
                                                onClick={() => {
                                                    const url = window.location.origin + window.location.pathname + '?token=' + share.token;
                                                    navigator.clipboard.writeText(url);
                                                    showToast('Thành công', 'Đã copy link!', 'success');
                                                }}
                                                className="w-full h-10 bg-slate-900 hover:bg-black text-white text-[10px] font-black rounded-xl transition-all shadow-md hover:shadow-black/20 flex items-center justify-center gap-2 tracking-widest active:scale-95"
                                            >
                                                <i className="fa-solid fa-copy text-[10px]"></i>
                                                SAO CHÉP LINK
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-300">
                                        <i className="fa-solid fa-ghost text-3xl"></i>
                                        <p className="text-[10px] font-black uppercase tracking-widest">Không có link hoạt động</p>
                                    </div>
                                )}
                            </div>
                        )
                    ) : (
                        <div className="animate-fade-in space-y-8 flex flex-col items-center py-4">
                            <div className="p-4 bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-slate-100">
                                <QRCodeSVG value={sharedLink} size={180} />
                            </div>
                            
                            <div className="text-center space-y-2">
                                <h4 className="text-[14px] font-black text-slate-800 uppercase tracking-wider">Đã Sẵn Sàng!</h4>
                                <p className="text-[11px] text-slate-400 px-4">Gửi mã QR hoặc sao chép link bên dưới để khách hàng có thể theo dõi xe ngay lập tức.</p>
                            </div>

                            <div className="w-full space-y-3">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(sharedLink);
                                        showToast('Thành công', 'Đã copy link!', 'success');
                                    }}
                                    className="w-full h-11 bg-slate-900 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-black active:scale-[0.98] tracking-wide"
                                >
                                    <i className="fa-solid fa-copy text-[10px]"></i>
                                    SAO CHÉP LINK
                                </button>
                                <button
                                    onClick={() => setSharedLink(null)}
                                    className="w-full h-10 bg-white text-slate-500 font-bold text-[10px] rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all border border-slate-100"
                                >
                                    QUAY LẠI
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ShareSidePanel;
