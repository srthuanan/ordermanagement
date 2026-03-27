import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Notification } from '../../types';
import * as apiService from '../../services/apiService';
import moment from 'moment';

interface StockArrivalPopupProps {
    notifications: Notification[];
    onRefresh: () => void;
    onNavigate?: (targetView: string, targetId?: string) => void;
}

const StockArrivalPopup: React.FC<StockArrivalPopupProps> = ({ notifications, onRefresh, onNavigate }) => {
    const [currentHero, setCurrentHero] = useState<Notification | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const stockNotifs = notifications.filter(n =>
            !n.isRead &&
            n.type === 'stock_hero' &&
            !sessionStorage.getItem(`dismissed_hero_${n.id}`)
        );

        if (stockNotifs.length > 0) {
            setCurrentHero(stockNotifs[0]);
            const timer = setTimeout(() => setIsVisible(true), 1200);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [notifications]);

    const handleDismiss = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!currentHero) return;
        setIsVisible(false);
        if (currentHero.id) {
            await apiService.markNotificationAsRead(currentHero.id);
        }
        sessionStorage.setItem(`dismissed_hero_${currentHero.id}`, 'true');
        setTimeout(onRefresh, 500);
    };

    if (!currentHero) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9, transition: { duration: 0.2 } }}
                    className="fixed right-4 bottom-20 z-[9999] pointer-events-none"
                >
                    <div
                        className="pointer-events-auto flex items-start gap-3 bg-white/95 backdrop-blur-xl border border-indigo-500/20 rounded-2xl px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.08)] min-w-[280px] max-w-[340px] group transition-all hover:shadow-[0_15px_50px_rgba(0,0,0,0.12)]"
                        role="alert"
                    >
                        {/* Icon Circle - Mirrored from Toast style */}
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <i className="fas fa-warehouse text-[14px] animate-pulse"></i>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-[12px] font-bold text-slate-800 leading-tight">Thông báo nhập kho</p>
                                <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                <span className="text-[10px] text-slate-400 font-medium">{moment(currentHero.timestamp).fromNow()}</span>
                            </div>

                            <div
                                className="text-[11px] text-slate-500 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: currentHero.message }}
                            />

                            {/* Action Row */}
                            <div className="mt-3 flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        if (onNavigate && currentHero.targetView) {
                                            onNavigate(currentHero.targetView, currentHero.targetId);
                                        }
                                        handleDismiss();
                                    }}
                                    className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 active:scale-95"
                                >
                                    Xem Kho
                                </button>
                                <button
                                    onClick={(e) => handleDismiss(e)}
                                    className="px-3 py-1 rounded-lg bg-slate-50 text-slate-500 text-[10px] font-bold hover:bg-slate-100 transition-colors active:scale-95"
                                >
                                    Bỏ qua
                                </button>
                            </div>
                        </div>

                        {/* Traditional Close X */}
                        <button
                            onClick={(e) => handleDismiss(e)}
                            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-all -mr-1 -mt-1"
                        >
                            <i className="fas fa-times text-[10px]"></i>
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StockArrivalPopup;
