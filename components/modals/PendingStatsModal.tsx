import React, { useMemo } from 'react';

interface Variant {
    variant: string;
    count: number;
}
interface GroupedStat {
    model: string;
    total: number;
    variants: Variant[];
}

interface PendingStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    stats: GroupedStat[];
}

const RankIndicator: React.FC<{ rank: number }> = ({ rank }) => {
    if (rank === 1) {
        return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-400/20 text-amber-500" title="Hạng 1"><i className="fas fa-crown"></i></div>;
    }
    if (rank === 2) {
        return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-400/20 font-bold text-slate-500" title="Hạng 2">2</div>;
    }
    if (rank === 3) {
        return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-600/20 font-bold text-yellow-700" title="Hạng 3">3</div>;
    }
    return <div className="flex items-center justify-center w-8 h-8 font-semibold text-text-secondary">{rank}</div>;
}


const PendingStatsModal: React.FC<PendingStatsModalProps> = ({ isOpen, onClose, stats }) => {
    
    const flattenedStats = useMemo(() => {
        return stats
            .flatMap(group => 
                group.variants.map(variant => {
                    const [phienBanNgoaiThat, noiThat] = variant.variant.split(' / ');
                    const parts = phienBanNgoaiThat.split(' - ');
                    const phienBan = parts.length > 1 ? parts.slice(0, -1).join(' - ') : 'N/A';
                    const ngoaiThat = parts.length > 1 ? parts[parts.length - 1] : phienBanNgoaiThat;

                    return {
                        model: group.model,
                        version: phienBan,
                        exterior: ngoaiThat,
                        interior: noiThat,
                        count: variant.count
                    };
                })
            )
            .sort((a, b) => b.count - a.count);
    }, [stats]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-surface-card w-full max-w-2xl rounded-2xl shadow-xl animate-fade-in-scale-up flex flex-col max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex-shrink-0 flex items-center justify-between p-5 border-b border-border-primary">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/10">
                            <i className="fas fa-chart-pie text-lg text-amber-500"></i>
                        </div>
                        <h2 className="text-xl font-bold text-text-primary">Thống Kê Xe Chờ Ghép</h2>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover">
                        <i className="fas fa-times"></i>
                    </button>
                </header>

                <main className="flex-grow p-4 overflow-y-auto bg-surface-ground">
                    {flattenedStats.length > 0 ? (
                        <div className="bg-surface-card border border-border-primary rounded-lg shadow-sm">
                            <header className="grid grid-cols-[3.5rem_1fr_4rem] items-center gap-4 px-4 py-2 border-b border-border-primary text-xs font-bold text-text-secondary uppercase">
                                <span className="text-center">Hạng</span>
                                <span>Cấu hình xe</span>
                                <span className="text-right">Số Lượng</span>
                            </header>
                             <div className="divide-y divide-border-primary/70">
                                {flattenedStats.map((item, index) => (
                                    <div key={index} className="grid grid-cols-[3.5rem_1fr_4rem] items-center gap-4 px-4 py-3 hover:bg-surface-hover transition-colors">
                                        <div className="flex justify-center">
                                            <RankIndicator rank={index + 1} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-text-primary truncate" title={`${item.model} - ${item.version}`}>
                                                {item.model} - {item.version}
                                            </p>
                                            <p className="text-xs text-text-secondary truncate" title={`${item.exterior} / ${item.interior}`}>
                                                {item.exterior} / {item.interior}
                                            </p>
                                        </div>
                                        <div className="font-bold text-lg text-accent-primary text-right font-mono">
                                            {item.count}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-text-secondary py-12 flex flex-col items-center justify-center h-full">
                            <i className="fas fa-box-open fa-3x mb-4"></i>
                            <p>Không có yêu cầu nào đang chờ.</p>
                        </div>
                    )}
                </main>

                <footer className="p-4 border-t flex justify-end gap-4 bg-surface-card rounded-b-2xl">
                    <button onClick={onClose} className="btn-secondary">Đóng</button>
                </footer>
            </div>
        </div>
    );
};

export default PendingStatsModal;