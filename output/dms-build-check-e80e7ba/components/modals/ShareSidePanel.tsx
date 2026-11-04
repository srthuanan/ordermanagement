import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../services/apiService';
import moment from 'moment';
import CarImage from '../ui/CarImage';

interface ShareSidePanelProps {
    car: any;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const ShareSidePanel: React.FC<ShareSidePanelProps> = ({ car, onClose, showToast }) => {
    const [expiration, setExpiration] = useState<string>('2'); // hours
    const [isGenerating, setIsGenerating] = useState(false);
    const initialUrl = car?.vin ? `${window.location.origin}${window.location.pathname}?vin=${car.vin}` : null;
    const [sharedLink, setSharedLink] = useState<string | null>(initialUrl);
    const [copiedBtn, setCopiedBtn] = useState(false);
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
        <div 
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-[99998] transition-opacity animate-fade-in flex items-center justify-center p-3 sm:p-4"
            onClick={onClose}
        >
            {/* Centered Modal Container */}
            <div 
                className="w-full max-w-[390px] max-h-[88vh] bg-slate-50 z-[99999] animate-scale-up rounded-3xl border border-slate-200/90 flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden my-auto"
                onClick={(e) => e.stopPropagation()}
            >
                
                {/* Premium Dark Tech Header */}
                <div className="px-5 py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-500/20 relative shrink-0 shadow-md">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
                            <i className="fa-solid fa-radar text-xs animate-pulse"></i>
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-[11.5px] font-black tracking-wider uppercase text-white flex items-center gap-1.5">
                                Chia Sẻ Vị Trí Xe
                            </h3>
                            <span className="text-[9.5px] font-mono font-bold text-indigo-300 tracking-wider">
                                {car.vin}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
                    >
                        <i className="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>

                {/* Main Body */}
                <div className="flex-1 overflow-y-auto hidden-scrollbar p-4 space-y-3.5">
                    
                    {/* Glossy Car Preview Card */}
                    <div className="p-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-slate-800 shadow-md flex items-center justify-between gap-2.5 relative overflow-hidden">
                        <div className="flex flex-col min-w-0 z-10">
                            <span className="text-[8.5px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Dòng xe</span>
                            <h4 className="text-xs font-black text-white truncate">{car.phien_ban || car.dong_xe || 'VinFast'}</h4>
                            <p className="text-[10px] font-bold text-slate-300 truncate mt-0.5">
                                {car.ngoai_that || car["Ngoại thất"] || 'Chưa rõ màu'}
                            </p>
                        </div>

                        <div className="w-20 h-12 relative z-10 shrink-0 flex items-center justify-center">
                            <CarImage 
                                model={car.dong_xe || car["Dòng xe"]} 
                                exteriorColor={car.ngoai_that || car["Ngoại thất"]}
                                version={car.phien_ban || car["Phiên bản"]}
                                className="w-full h-full object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)]" 
                            />
                        </div>
                    </div>

                    {!sharedLink ? (
                        /* Token Creation & Management Views */
                        <div className="space-y-3">
                            <div className="flex border-b border-slate-200">
                                <button 
                                    onClick={() => setViewMode('create')}
                                    className={`flex-1 py-2 text-[11px] font-black transition-all relative ${viewMode === 'create' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    TẠO LINK MỚI
                                    {viewMode === 'create' && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 rounded-full"></div>}
                                </button>
                                <button 
                                    onClick={() => setViewMode('manage')}
                                    className={`flex-1 py-2 text-[11px] font-black transition-all relative ${viewMode === 'manage' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    ĐANG CHIA SẺ
                                    {activeShares.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[8.5px]">{activeShares.length}</span>}
                                    {viewMode === 'manage' && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 rounded-full"></div>}
                                </button>
                            </div>

                            {viewMode === 'create' ? (
                                <div className="space-y-4 animate-fade-in pt-1">
                                    <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest">Thời hạn link</label>
                                    <div className="space-y-1.5">
                                        {[
                                            { label: '2 Giờ', value: '2', icon: 'fa-clock', desc: 'Dành cho khách xem ngay' },
                                            { label: '6 Giờ', value: '6', icon: 'fa-hourglass-half', desc: 'Dành cho vận chuyển xa' },
                                            { label: '24 Giờ', value: '24', icon: 'fa-calendar-day', desc: 'Dành cho khách ở tỉnh' }
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setExpiration(opt.value)}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${expiration === opt.value ? 'bg-indigo-50 border-indigo-300 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${expiration === opt.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                        <i className={`fa-solid ${opt.icon} text-[11px]`}></i>
                                                    </div>
                                                    <div className="flex flex-col text-left">
                                                        <span className={`text-[11.5px] font-bold ${expiration === opt.value ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                            {opt.label}
                                                        </span>
                                                        <span className="text-[9.5px] text-slate-400">{opt.desc}</span>
                                                    </div>
                                                </div>
                                                {expiration === opt.value && <i className="fa-solid fa-check text-indigo-600 text-xs"></i>}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleShare}
                                        disabled={isGenerating}
                                        className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 tracking-wide mt-2"
                                    >
                                        {isGenerating ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-link text-xs"></i> TẠO LINK TRUY CẬP</>}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2.5 animate-fade-in pt-1">
                                    {isLoadingShares ? (
                                        <div className="py-10 flex flex-col items-center justify-center gap-2 opacity-40">
                                            <i className="fa-solid fa-circle-notch fa-spin text-base"></i>
                                            <span className="text-[9.5px] font-bold">Đang tải...</span>
                                        </div>
                                    ) : activeShares.length > 0 ? (
                                        activeShares.map(share => (
                                            <div key={share.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="text-[11px] font-mono font-bold text-slate-800">Mã: {share.token.substring(0, 10)}</span>
                                                        <p className="text-[9.5px] font-bold text-slate-400 mt-0.5">Hết hạn: {moment(share.expires_at).fromNow()}</p>
                                                    </div>
                                                    <button onClick={() => handleRevoke(share.id)} className="text-slate-400 hover:text-red-500 p-1">
                                                        <i className="fa-solid fa-trash-can text-xs"></i>
                                                    </button>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const url = window.location.origin + window.location.pathname + '?token=' + share.token;
                                                        navigator.clipboard.writeText(url);
                                                        showToast('Thành công', 'Đã copy link!', 'success');
                                                    }}
                                                    className="w-full py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg hover:bg-black transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <i className="fa-solid fa-copy text-[9.5px]"></i> SAO CHÉP LINK
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                                            <i className="fa-solid fa-ghost text-xl"></i>
                                            <p className="text-[10px] font-bold">Không có link hoạt động</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setSharedLink(initialUrl)}
                                className="w-full py-2 bg-white text-indigo-600 font-extrabold text-[11px] rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 mt-2"
                            >
                                <i className="fa-solid fa-qrcode text-xs"></i> Xem Mã QR Định Vị Live
                            </button>
                        </div>
                    ) : (
                        /* GORGEOUS QR CODE VIEW */
                        <div className="animate-fade-in space-y-3.5 flex flex-col items-center py-0.5">
                            {/* Main QR Card */}
                            <div className="w-full p-4 bg-gradient-to-b from-white via-slate-50 to-indigo-50/40 rounded-2xl border border-slate-200/90 shadow-md flex flex-col items-center gap-3 relative overflow-hidden">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>

                                {/* QR SVG Box */}
                                <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-xs relative z-10">
                                    <QRCodeSVG value={sharedLink} size={150} level="M" />
                                </div>

                                <div className="text-center relative z-10">
                                    <p className="text-[11px] font-bold text-slate-600">
                                        Quét camera để xem vị trí xe Live
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="w-full space-y-2 pt-0.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (sharedLink) {
                                            navigator.clipboard.writeText(sharedLink).catch(() => {});
                                            setCopiedBtn(true);
                                            setTimeout(() => setCopiedBtn(false), 2000);
                                        }
                                    }}
                                    className={`w-full py-2.5 ${copiedBtn ? 'bg-emerald-600 shadow-emerald-200' : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 shadow-indigo-500/25'} text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 tracking-wider cursor-pointer`}
                                >
                                    <i className={`fa-solid ${copiedBtn ? 'fa-check text-xs' : 'fa-copy text-xs'}`}></i>
                                    <span>{copiedBtn ? 'ĐÃ SAO CHÉP LINK! 🎉' : 'SAO CHÉP LINK'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setSharedLink(null)}
                                    className="w-full py-2 bg-white hover:bg-slate-100 text-slate-600 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all border border-slate-200 shadow-2xs cursor-pointer"
                                >
                                    <i className="fa-solid fa-sliders text-[11px]"></i>
                                    <span>Tùy chọn nâng cao</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareSidePanel;
