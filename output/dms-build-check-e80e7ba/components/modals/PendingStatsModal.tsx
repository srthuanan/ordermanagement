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

const PendingStatsModal: React.FC<PendingStatsModalProps> = ({ isOpen, onClose, stats }) => {
    const flattenedStats = useMemo(() => {
        return stats
            .flatMap(group =>
                group.variants.map(variant => {
                    const [phienBanNgoaiThat, noiThat] = variant.variant.split(' / ');
                    const parts = phienBanNgoaiThat.split(' - ');
                    const phienBan = parts.length > 1 ? parts.slice(0, -1).join(' - ') : '';
                    const ngoaiThat = parts.length > 1 ? parts[parts.length - 1] : phienBanNgoaiThat;

                    return {
                        title: phienBan ? `${group.model} - ${phienBan}` : `${group.model}`,
                        subtitle: noiThat ? `${ngoaiThat} / ${noiThat}` : ngoaiThat,
                        count: variant.count
                    };
                })
            )
            .sort((a, b) => b.count - a.count);
    }, [stats]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[9999] flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white w-full max-w-lg max-h-[85vh] rounded-2xl shadow-xl border border-slate-200/80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header: Đơn giản, tinh tế */}
                <header className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                        Thống Kê Xe Chờ Ghép
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Đóng"
                    >
                        <i className="fa-solid fa-xmark text-sm"></i>
                    </button>
                </header>

                {/* Table Content: Đơn giản, rõ ràng */}
                <main className="p-4 overflow-y-auto flex-grow min-h-0">
                    {flattenedStats.length > 0 ? (
                        <div className="border border-slate-100 rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                        <th className="py-2.5 pl-4 pr-2 w-12 text-center">Hạng</th>
                                        <th className="py-2.5 px-3">Cấu hình xe</th>
                                        <th className="py-2.5 pl-2 pr-4 text-right w-20">Số lượng</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {flattenedStats.map((item, index) => (
                                        <tr
                                            key={index}
                                            className="hover:bg-slate-50/60 transition-colors"
                                        >
                                            {/* Hạng */}
                                            <td className="py-2.5 pl-4 pr-2 text-center align-middle font-mono text-slate-400 text-xs font-semibold">
                                                {index + 1}
                                            </td>

                                            {/* Cấu hình xe */}
                                            <td className="py-2.5 px-3 align-middle">
                                                <div className="font-semibold text-slate-800 text-[13px] leading-tight">
                                                    {item.title}
                                                </div>
                                                <div className="text-[11px] text-slate-400 mt-0.5">
                                                    {item.subtitle}
                                                </div>
                                            </td>

                                            {/* Số lượng */}
                                            <td className="py-2.5 pl-2 pr-4 text-right align-middle font-mono font-bold text-slate-900 text-sm">
                                                {item.count}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-slate-400 text-xs">
                            Không có yêu cầu chờ ghép.
                        </div>
                    )}
                </main>

                {/* Footer: Nút Đóng gọn gàng */}
                <footer className="flex-shrink-0 px-5 py-3 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                    >
                        Đóng
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default PendingStatsModal;