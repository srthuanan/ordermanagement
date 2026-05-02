import React, { useEffect, useState, useMemo } from 'react';
import * as apiService from '../../services/apiService';
import Button from '../ui/Button';
import AnimatedBackground from '../ui/AnimatedBackground';
import moment from 'moment';

interface StockVehicleExtended {
    vin: string;
    dong_xe: string;
    phien_ban: string;
    ngoai_that: string;
    noi_that: string;
    nguoi_giu_xe: string;
    thoi_gian_het_han_giu: string;
    extension_count: number;
    extension_evidence_url: string;
    extension_reason?: string;
}

interface UserReputation {
    email: string;
    name: string;
    total: number;
    matched: number;
    currentHolds: number;
    maxHolds: number;
    score: number;
    is_blocked: boolean;
}

interface QueueItem {
    id: string;
    vin: string;
    tvbh_email: string;
    tvbh_name: string;
    created_at: string;
    status: string;
    updated_at: string;
}

// --- SUB-COMPONENTS (MEMOIZED) ---

const FolderButton = React.memo(({ folder, isActive, onClick }: { folder: any, isActive: boolean, onClick: (id: string) => void }) => (
    <button
        onClick={() => onClick(folder.id)}
        className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${isActive ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}`}
    >
        <div className="flex items-center gap-3">
            <i className={`fas ${folder.icon} w-5 text-center text-sm ${isActive ? 'text-accent-primary' : 'text-slate-400'}`}></i>
            <span>{folder.label}</span>
        </div>
        {folder.count > 0 && <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${isActive ? 'bg-accent-primary text-white' : 'bg-slate-200 text-slate-500'}`}>{folder.count}</span>}
    </button>
));

const ListItem = React.memo(({ item, activeSubTab, isSelected, onClick }: { item: any, activeSubTab: string, isSelected: boolean, onClick: (id: string) => void }) => {
    let title = '';
    let subtitle = '';
    let id = '';
    let statusText = '';
    let statusColor = '';

    if (activeSubTab === 'extensions') {
        const ext = item as StockVehicleExtended;
        title = ext.vin;
        subtitle = ext.nguoi_giu_xe;
        id = ext.vin;
        statusText = `Lần ${ext.extension_count}`;
        statusColor = 'bg-blue-100 text-blue-600';
    } else if (activeSubTab === 'reputation') {
        const rep = item as UserReputation;
        title = rep.name;
        subtitle = rep.email;
        id = rep.email;
        statusText = `${rep.score}%`;
        statusColor = rep.score >= 85 ? 'bg-emerald-100 text-emerald-600' : rep.score >= 65 ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600';
    } else if (activeSubTab === 'queue') {
        title = item.vin;
        subtitle = `${item.items.length} người chờ`;
        id = item.vin;
        statusText = 'HOT';
        statusColor = 'bg-orange-100 text-orange-600';
    }

    return (
        <div
            onClick={() => onClick(id)}
            className={`px-4 py-3 cursor-pointer transition-all duration-300 group relative border-l-2 ${isSelected
                ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] border-accent-primary z-10'
                : 'bg-transparent border-transparent hover:bg-slate-50/80 hover:border-slate-200'
                }`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-bold truncate mb-0.5 ${isSelected ? 'text-accent-primary' : 'text-slate-700'}`}>
                        {title}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium truncate">
                        {subtitle}
                    </div>
                </div>
                <div className={`text-[9px] font-black px-1.5 py-0.5 rounded ${statusColor}`}>
                    {statusText}
                </div>
            </div>
        </div>
    );
});

const ExtensionDetail = React.memo(({ item, onOpenFilePreview }: { item: StockVehicleExtended, onOpenFilePreview: (url: string, label: string) => void }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Thông tin xe & Người giữ</h3>
            <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Người giữ xe:</span>
                    <span className="font-bold text-slate-700">{item.nguoi_giu_xe}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Thời hạn hiện tại:</span>
                    <span className="font-mono font-bold text-rose-500">
                        {moment(item.thoi_gian_het_han_giu).format('DD/MM/YYYY HH:mm:ss')}
                    </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Số lần gia hạn:</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold">{item.extension_count}</span>
                </div>
            </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Lý do & Minh chứng</h3>
            <div className="bg-slate-50 p-4 rounded-xl flex-1 mb-4">
                <p className="text-xs italic text-slate-600 leading-relaxed">
                    "{item.extension_reason || 'Không có lý do chi tiết...'}"
                </p>
            </div>
            {item.extension_evidence_url && (
                <Button variant="secondary" size="sm" fullWidth leftIcon={<i className="fas fa-paperclip"></i>} onClick={() => onOpenFilePreview(item.extension_evidence_url, "Minh chứng gia hạn")}>
                    Xem minh chứng đính kèm
                </Button>
            )}
        </div>
    </div>
));

const ReputationDetail = React.memo(({ item, onUpdateScore, isUpdating }: { item: UserReputation, onUpdateScore: (email: string, score: number) => void, isUpdating: boolean }) => {
    const [history, setHistory] = useState<any[]>([]);
    const [isLoadingHist, setIsLoadingHist] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchHistory = async () => {
            setIsLoadingHist(true);
            try {
                const hist = await apiService.getUserReputationHistory(item.email);
                if (isMounted) setHistory(hist);
            } catch (err) {
                console.error("Lỗi tải lịch sử uy tín:", err);
            } finally {
                if (isMounted) setIsLoadingHist(false);
            }
        };
        fetchHistory();
        return () => { isMounted = false; };
    }, [item.email]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center relative overflow-hidden">
                    {isUpdating && <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10"><i className="fas fa-circle-notch fa-spin text-accent-primary"></i></div>}
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Điểm uy tín (Sửa trực tiếp)</div>
                    <div className="flex items-center justify-center gap-1 group">
                        <input 
                            type="number"
                            key={item.email}
                            defaultValue={item.score}
                            disabled={isUpdating}
                            className={`text-4xl font-black bg-transparent w-24 text-right outline-none transition-all border-b-2 border-transparent focus:border-accent-primary ${item.score >= 85 ? 'text-emerald-500' : item.score >= 65 ? 'text-amber-500' : 'text-rose-500'}`}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onUpdateScore(item.email, parseInt(e.currentTarget.value));
                                    e.currentTarget.blur();
                                }
                            }}
                            onBlur={(e) => {
                                const newVal = parseInt(e.target.value);
                                if (newVal !== item.score) {
                                    onUpdateScore(item.email, newVal);
                                }
                            }}
                        />
                        <span className={`text-4xl font-black ${item.score >= 85 ? 'text-emerald-500' : item.score >= 65 ? 'text-amber-500' : 'text-rose-500'}`}>%</span>
                        <i className="fas fa-edit text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1"></i>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Số lượt còn trống</div>
                    <div className="text-4xl font-black text-accent-primary">
                        {Math.max(0, item.maxHolds - item.currentHolds)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Lượt giữ khả dụng</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Tình trạng tài nguyên</div>
                    <div className="space-y-2">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-700 ${item.currentHolds >= item.maxHolds ? 'bg-rose-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(((item.currentHolds / item.maxHolds) * 100), 100)}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                            <span>Đang giữ: {item.currentHolds} xe</span>
                            <span>Hạn mức: {item.maxHolds} xe</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col max-h-[400px]">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-3 mb-4">Lịch sử Biến động (30 ngày)</h3>
                {isLoadingHist ? (
                    <div className="flex-1 flex justify-center items-center"><i className="fas fa-spinner fa-spin text-accent-primary text-2xl"></i></div>
                ) : history.length === 0 ? (
                    <div className="flex-1 flex flex-col justify-center items-center opacity-50">
                        <i className="fas fa-history text-3xl mb-2 text-slate-300"></i>
                        <p className="text-xs text-slate-500 italic">Chưa có thay đổi nào trong 30 ngày qua.</p>
                    </div>
                ) : (
                    <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar-premium pr-2">
                        {history.map((h, i) => (
                            <div key={h.id || i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:bg-slate-100">
                                <div className="min-w-0 pr-3">
                                    <div className="text-[12px] font-bold text-slate-700 truncate">{h.reason}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 font-medium">
                                        <i className="far fa-clock"></i> {moment(h.date).format('HH:mm DD/MM')} 
                                        <span className="text-slate-300">•</span> 
                                        <span className="font-mono">{h.vin}</span>
                                    </div>
                                </div>
                                <div className={`text-sm font-black px-2.5 py-1.5 rounded-lg bg-white shadow-sm border flex flex-shrink-0 ${h.type === 'success' ? 'text-emerald-500 border-emerald-100' : 'text-rose-500 border-rose-100'}`}>
                                    {h.pointChange > 0 ? '+' : ''}{h.pointChange}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

const QueueDetail = React.memo(({ item, vehicles }: { item: { vin: string, items: any[] }, vehicles: Record<string, any> }) => (
    <div className="space-y-6">
        {/* Car & Holder Info */}
        {vehicles[item.vin] && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                        <i className="fas fa-car text-accent-primary"></i>
                        Thông tin xe
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">Model:</span>
                            <span className="font-bold text-slate-700">
                                {vehicles[item.vin].dong_xe} {vehicles[item.vin].phien_ban}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">Màu sắc:</span>
                            <span className="font-bold text-slate-700">
                                {vehicles[item.vin].ngoai_that} / {vehicles[item.vin].noi_that}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">Mã DMS:</span>
                            <span className="font-mono font-bold text-slate-600 px-1.5 py-0.5 bg-slate-100 rounded">
                                {vehicles[item.vin].ma_dms || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${vehicles[item.vin].nguoi_giu_xe ? 'bg-accent-primary/5 border-accent-primary/20' : 'bg-slate-50 border-gray-100'}`}>
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                        <i className="fas fa-user-lock text-accent-primary"></i>
                        Người đang giữ (Current)
                    </h3>
                    {vehicles[item.vin].nguoi_giu_xe ? (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-medium">Họ tên:</span>
                                <span className="font-black text-accent-primary">
                                    {vehicles[item.vin].nguoi_giu_xe}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-medium">Hết hạn:</span>
                                <span className="font-mono font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded shadow-sm">
                                    {vehicles[item.vin].thoi_gian_het_han_giu || 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-medium">Trạng thái:</span>
                                <span className="px-2 py-0.5 bg-accent-primary/10 text-accent-primary rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm">
                                    ĐANG GIỮ XE
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-4 opacity-50">
                            <i className="fas fa-unlock text-slate-300 text-xl mb-2"></i>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Xe đang trống (Chưa ai giữ)</span>
                        </div>
                    )}
                </div>
            </div>
        )}

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-3 mb-6">Trình tự hàng chờ giữ xe (Timeline)</h3>
            <div className="relative pl-8 border-l-2 border-slate-100 space-y-8 ml-4">
                {item.items.map((person: any, idx: number) => {
                    // Logic tính thời gian ưu tiên còn lại
                    const isPrioritized = person.status === 'prioritized';
                    let remainingText = '';
                    if (isPrioritized && person.updated_at) {
                        const expiry = moment(person.updated_at).add(15, 'minutes');
                        const diff = expiry.diff(moment());
                        if (diff > 0) {
                            remainingText = `Còn ${Math.ceil(diff / 60000)} phút`;
                        } else {
                            remainingText = 'Hết hạn ưu tiên';
                        }
                    }

                    return (
                        <div key={person.id} className="relative">
                            <div className={`absolute -left-[41px] top-0 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center text-[10px] font-black shadow-sm ${idx === 0 ? (isPrioritized ? 'bg-emerald-500 text-white animate-bounce' : 'bg-orange-500 text-white animate-pulse') : 'bg-slate-300 text-slate-500'}`}>
                                {idx + 1}
                            </div>
                            <div className={`p-4 rounded-xl border transition-all ${isPrioritized ? 'bg-emerald-50 border-emerald-200' : idx === 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100 opacity-60'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className={`text-[13px] font-black ${isPrioritized ? 'text-emerald-700' : idx === 0 ? 'text-orange-700' : 'text-slate-600'}`}>{person.tvbh_name}</div>
                                        <div className="text-[10px] font-medium text-slate-400">{person.tvbh_email}</div>
                                    </div>
                                    {isPrioritized ? (
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[9px] font-black uppercase tracking-tighter shadow-sm">Có quyền giữ xe</span>
                                            <span className="text-[9px] font-bold text-emerald-600">{remainingText}</span>
                                        </div>
                                    ) : idx === 0 && (
                                        <span className="px-2 py-0.5 bg-orange-200 text-orange-700 rounded text-[9px] font-black uppercase tracking-tighter">Đang chờ giải phóng</span>
                                    )}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                    <i className="far fa-clock"></i>
                                    <span>Đăng ký lúc: {moment(person.created_at).format('DD/MM/YYYY HH:mm:ss')}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
));

// --- MAIN COMPONENT ---

interface HoldManagementViewProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info') => void;
    onOpenFilePreview: (url: string, label: string) => void;
}

const HoldManagementView: React.FC<HoldManagementViewProps> = ({ showToast, onOpenFilePreview }) => {
    const [extensions, setExtensions] = useState<StockVehicleExtended[]>([]);
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [reputations, setReputations] = useState<UserReputation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [processingVin, setProcessingVin] = useState<string | null>(null);
    const [activeSubTab, setActiveSubTab] = useState<'extensions' | 'reputation' | 'queue'>('extensions');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [vehicles, setVehicles] = useState<Record<string, any>>({});
    const [mobileView, setMobileView] = useState<'folders' | 'list' | 'detail'>('folders');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = React.useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            // First, trigger server-side auto-release to clean up expired holds
            await apiService.autoReleaseExpiredHolds();
            
            const [extRes, queueRes, repRes] = await Promise.all([
                apiService.getPendingHoldExtensions(),
                apiService.getAllHoldQueues(),
                apiService.getAllUsersReputations()
            ]);
            setExtensions(extRes as StockVehicleExtended[]);
            setQueue(queueRes as QueueItem[]);
            setReputations(repRes as UserReputation[]);

            const vins = Array.from(new Set((queueRes as QueueItem[]).map(q => q.vin)));
            if (vins.length > 0) {
                const vData = await apiService.getVehiclesByVins(vins);
                const vMap = (vData || []).reduce((acc: any, v: any) => ({ ...acc, [v.vin]: v }), {});
                setVehicles(vMap);
            }
        } catch (err) {
            console.error("Hold Management Fetch Error:", err);
            showToast('Lỗi', 'Không thể tải dữ liệu quản lý giữ xe.', 'error');
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const groupedQueue = useMemo(() => {
        return queue.reduce((acc: Record<string, QueueItem[]>, item) => {
            if (!acc[item.vin]) acc[item.vin] = [];
            acc[item.vin].push(item);
            return acc;
        }, {});
    }, [queue]);

    const folders = useMemo(() => [
        { id: 'extensions', label: 'Duyệt Gia Hạn', icon: 'fa-clock', count: extensions.length },
        { id: 'reputation', label: 'TVBH & Uy Tín', icon: 'fa-medal', count: reputations.length },
        { id: 'queue', label: 'Hàng Chờ Xe', icon: 'fa-fire-alt', count: Object.keys(groupedQueue).length },
    ], [extensions.length, reputations.length, groupedQueue]);

    const currentList = useMemo(() => {
        const filtered = (() => {
            switch (activeSubTab) {
                case 'extensions': return extensions;
                case 'reputation': 
                    return [...reputations]
                        .filter(r => {
                            const email = (r.email || '').toLowerCase();
                            const name = (r.name || '').toLowerCase();
                            // Filter out obvious test/junk accounts
                            if (['user', 'admin', 'test'].includes(email)) return false;
                            if (email.includes('test@') || email.includes('demo@')) return false;
                            if (name === 'user' || name === 'admin' || name.includes('tài khoản test')) return false;
                            // Filter out accounts that only have a short slug as both name and email (likely system/test)
                            if (r.name === r.email && !r.email.includes(' ') && r.email.length < 8) return false;
                            return true;
                        })
                        .sort((a, b) => {
                            if (b.score !== a.score) return b.score - a.score;
                            return (a.name || '').localeCompare(b.name || '', 'vi');
                        });
                case 'queue': return Object.entries(groupedQueue).map(([vin, items]) => ({ vin, items }));
                default: return [];
            }
        })();

        if (!searchTerm.trim()) return filtered;
        
        const term = searchTerm.toLowerCase();
        return (filtered as any[]).filter(item => {
            if (activeSubTab === 'reputation') {
                return item.name.toLowerCase().includes(term) || item.email.toLowerCase().includes(term);
            } else if (activeSubTab === 'extensions') {
                return item.vin.toLowerCase().includes(term) || item.nguoi_giu_xe.toLowerCase().includes(term);
            } else if (activeSubTab === 'queue') {
                return item.vin.toLowerCase().includes(term);
            }
            return true;
        });
    }, [activeSubTab, extensions, reputations, groupedQueue, searchTerm]);

    useEffect(() => {
        if (currentList.length > 0) {
            const firstItem = currentList[0];
            const id = activeSubTab === 'reputation' ? (firstItem as UserReputation).email : (firstItem as any).vin;
            setSelectedId(prev => prev || id);
        } else {
            setSelectedId(null);
        }
    }, [activeSubTab, currentList.length]);

    const handleTabChange = React.useCallback((tabId: string) => {
        setActiveSubTab(tabId as any);
        setMobileView('list');
    }, []);

    const handleItemSelect = React.useCallback((id: string) => {
        setSelectedId(id);
        setMobileView('detail');
    }, []);

    const onApprove = React.useCallback(async (vin: string) => {
        setProcessingVin(vin);
        try {
            const res = await apiService.approveHoldExtension(vin);
            if (res.status === 'SUCCESS') {
                showToast('Thành công', 'Đã gia hạn giữ xe thêm 12h.', 'success');
                fetchData(true);
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } finally {
            setProcessingVin(null);
        }
    }, [showToast, fetchData]);

    const onReject = React.useCallback(async (vin: string) => {
        setProcessingVin(vin);
        try {
            const res = await apiService.rejectHoldExtension(vin);
            if (res.status === 'SUCCESS') {
                showToast('Thành công', 'Đã từ chối yêu cầu gia hạn.', 'success');
                fetchData(true);
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } finally {
            setProcessingVin(null);
        }
    }, [showToast, fetchData]);

    const onUpdateScore = React.useCallback(async (email: string, newScore: number) => {
        try {
            setIsActionLoading(true);
            const res = await apiService.updateUserReputation(email, newScore, 'Admin điều chỉnh trực tiếp');
            if (res.status === 'SUCCESS') {
                showToast('Thành công', res.message, 'success');
                // Background refresh
                fetchData(true);
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } catch (err) {
            showToast('Lỗi', 'Không thể cập nhật điểm uy tín.', 'error');
        } finally {
            setIsActionLoading(false);
        }
    }, [showToast, fetchData]);

    const onToggleBlock = React.useCallback(async (email: string, currentStatus: boolean) => {
        try {
            setIsActionLoading(true);
            const res = await apiService.toggleUserBlock(email, !currentStatus, 'Admin action');
            if (res.status === 'SUCCESS') {
                showToast('Thành công', res.message, 'success');
                fetchData(true);
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } catch (err) {
            showToast('Lỗi', `Thao tác thất bại.`, 'error');
        } finally {
            setIsActionLoading(false);
        }
    }, [showToast, fetchData]);

    const selectedItem = useMemo(() => {
        if (!selectedId) return null;
        if (activeSubTab === 'reputation') return reputations.find(r => r.email === selectedId);
        if (activeSubTab === 'extensions') return extensions.find(e => e.vin === selectedId);
        if (activeSubTab === 'queue') {
            const items = groupedQueue[selectedId];
            return items ? { vin: selectedId, items } : null;
        }
        return null;
    }, [selectedId, activeSubTab, reputations, extensions, groupedQueue]);

    return (
        <div className="flex h-full bg-slate-50 md:rounded-xl shadow-md border-0 md:border border-border-primary overflow-hidden animate-fade-in relative z-0">
            <AnimatedBackground />
            
            <div className={`w-full md:w-64 flex-shrink-0 border-r border-border-primary bg-surface-ground/90 flex flex-col relative z-10 ${mobileView !== 'folders' ? 'hidden md:flex' : 'flex'}`}>
                <div className="md:hidden p-3 bg-white border-b border-border-secondary flex items-center justify-center relative">
                    <span className="font-bold text-sm">Quản Lý Giữ Xe</span>
                </div>
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {folders.map(folder => (
                        <FolderButton key={folder.id} folder={folder} isActive={activeSubTab === folder.id} onClick={handleTabChange} />
                    ))}
                </nav>
                <div className="p-4 border-t border-border-primary">
                     <Button onClick={() => fetchData()} variant="secondary" size="sm" fullWidth leftIcon={<i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''}`}></i>}>
                         Làm mới dữ liệu
                     </Button>
                </div>
            </div>

            <div className={`w-full md:w-64 flex-shrink-0 border-r border-border-primary flex flex-col bg-white/90 relative z-10 ${mobileView !== 'list' ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-3 bg-white border-b border-border-secondary flex items-center gap-2">
                    <button onClick={() => setMobileView('folders')} className="md:hidden p-1.5 hover:bg-surface-ground rounded-full">
                        <i className="fas fa-arrow-left text-gray-500"></i>
                    </button>
                    <span className="font-bold text-sm">{folders.find(f => f.id === activeSubTab)?.label || 'Danh sách'}</span>
                </div>

                <div className="px-3 py-2 bg-slate-50 border-b border-border-secondary">
                    <div className="relative">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm..." 
                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                            >
                                <i className="fas fa-times-circle text-[10px]"></i>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                         <div className="p-4 space-y-4">
                             {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg"></div>)}
                         </div>
                    ) : currentList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 h-full bg-slate-50/50">
                            <i className="fas fa-inbox text-gray-300 text-3xl mb-3"></i>
                            <p className="text-xs font-bold text-gray-400 text-center uppercase tracking-wider">Trống</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border-secondary">
                            {currentList.map(item => (
                                <ListItem 
                                    key={activeSubTab === 'reputation' ? (item as any).email : (item as any).vin}
                                    item={item}
                                    activeSubTab={activeSubTab}
                                    isSelected={selectedId === (activeSubTab === 'reputation' ? (item as any).email : (item as any).vin)}
                                    onClick={handleItemSelect}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className={`flex-1 flex flex-col bg-surface-ground/90 min-w-0 relative z-10 ${mobileView !== 'detail' ? 'hidden md:flex' : 'flex'}`}>
                {selectedItem ? (
                    <>
                        <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
                            <div className="flex items-center gap-3 min-w-0">
                                <button onClick={() => setMobileView('list')} className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100">
                                    <i className="fas fa-arrow-left text-xs text-slate-500"></i>
                                </button>
                                <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary font-bold shadow-sm border border-accent-primary/20">
                                    {(activeSubTab === 'reputation' ? (selectedItem as UserReputation).name : (selectedItem as any).vin).charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-sm font-black text-slate-800 truncate">
                                        {activeSubTab === 'reputation' ? (selectedItem as UserReputation).name : (selectedItem as any).vin}
                                    </h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        {activeSubTab === 'reputation' ? (selectedItem as UserReputation).email : 'Chi tiết yêu cầu / Hàng chờ'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {activeSubTab === 'reputation' && (
                                    <Button size="sm" variant={(selectedItem as UserReputation).is_blocked ? 'success' : 'danger'} onClick={() => onToggleBlock((selectedItem as UserReputation).email, (selectedItem as UserReputation).is_blocked)} isLoading={isActionLoading}>
                                        {(selectedItem as UserReputation).is_blocked ? 'Mở khóa' : 'Khóa'}
                                    </Button>
                                )}
                                {activeSubTab === 'extensions' && (
                                    <>
                                        <Button size="sm" variant="danger" onClick={() => onReject((selectedItem as StockVehicleExtended).vin)} isLoading={processingVin === (selectedItem as StockVehicleExtended).vin}>Từ chối</Button>
                                        <Button size="sm" variant="success" onClick={() => onApprove((selectedItem as StockVehicleExtended).vin)} isLoading={processingVin === (selectedItem as StockVehicleExtended).vin}>Duyệt</Button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
                            {activeSubTab === 'extensions' && <ExtensionDetail item={selectedItem as StockVehicleExtended} onOpenFilePreview={onOpenFilePreview} />}
                            {activeSubTab === 'reputation' && <ReputationDetail item={selectedItem as UserReputation} onUpdateScore={onUpdateScore} isUpdating={isActionLoading} />}
                            {activeSubTab === 'queue' && <QueueDetail item={selectedItem as any} vehicles={vehicles} />}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4 opacity-50">
                             <i className="fas fa-mouse-pointer text-slate-300 text-2xl"></i>
                        </div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Chưa chọn mục nào</h3>
                        <p className="text-xs text-slate-400 mt-2">Vui lòng chọn một mục từ danh sách bên trái để xem chi tiết.</p>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar-premium::-webkit-scrollbar { width: 5px; height: 5px; }
                .custom-scrollbar-premium::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar-premium::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                .custom-scrollbar-premium::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
                input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
            `}} />
        </div>
    );
};

export default HoldManagementView;
