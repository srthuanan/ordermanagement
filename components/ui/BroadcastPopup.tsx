import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Notification } from '../../types';
import * as apiService from '../../services/apiService';
import speakerAnim from '../../pictures/speaker_anim.gif';

interface BroadcastPopupProps {
    notifications: Notification[];
    onRefresh: () => void;
}

const BroadcastPopup: React.FC<BroadcastPopupProps> = ({ notifications, onRefresh }) => {
    const [currentBroadcast, setCurrentBroadcast] = useState<Notification | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Find the latest unread broadcast notification
        const broadcasts = notifications.filter(n =>
            !n.isRead &&
            n.type === 'broadcast' &&
            !sessionStorage.getItem(`dismissed_broadcast_${n.id}`)
        );

        if (broadcasts.length > 0) {
            // Sort by timestamp descending and take the first one
            const latest = [...broadcasts].sort((a, b) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )[0];
            
            setCurrentBroadcast(latest);
            const timer = setTimeout(() => setIsVisible(true), 1500); // Delay slightly for elegance
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [notifications]);

    const handleDismiss = async () => {
        if (!currentBroadcast) return;
        setIsVisible(false);
        if (currentBroadcast.id) {
            await apiService.markNotificationAsRead(currentBroadcast.id);
        }
        sessionStorage.setItem(`dismissed_broadcast_${currentBroadcast.id}`, 'true');
        setTimeout(onRefresh, 500);
    };

    if (!currentBroadcast) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm pointer-events-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border border-slate-200"
                    >
                        {/* Decorative Header */}
                        <div className="h-2 bg-gradient-to-r from-red-500 via-amber-500 to-red-500"></div>
                        
                        <div className="p-8 sm:p-10">
                            <div className="flex flex-col items-center">
                                {/* Speaker Icon with Animation */}
                                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-red-100/50">
                                    <img src={speakerAnim} alt="Broadcast" className="w-12 h-12 object-contain" />
                                </div>

                                <div className="space-y-1 mb-6 text-center">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600">Thông báo khẩn</h3>
                                    <div className="h-1 w-12 bg-red-500 mx-auto rounded-full"></div>
                                </div>
                                
                                <div 
                                    className="w-full text-slate-800 leading-relaxed mb-10 overflow-hidden flex flex-col items-center justify-center text-center"
                                    dangerouslySetInnerHTML={{ __html: currentBroadcast.message }}
                                />

                                <button
                                    onClick={handleDismiss}
                                    className="w-full py-4 bg-gradient-to-r from-slate-900 to-black hover:from-black hover:to-slate-900 text-white rounded-2xl font-bold text-sm tracking-wider transition-all shadow-xl active:scale-[0.98] shadow-slate-200 border border-white/10"
                                >
                                    XÁC NHẬN ĐÃ ĐỌC
                                </button>
                                
                                <div className="mt-6 flex items-center gap-2 text-slate-400">
                                    <i className="fab fa-telegram text-xs"></i>
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Phát từ Telegram Admin</span>
                                </div>
                            </div>
                        </div>

                        {/* Corner Close Button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400"
                        >
                            <i className="fas fa-times text-xs"></i>
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default BroadcastPopup;
