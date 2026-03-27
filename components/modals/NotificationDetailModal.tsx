import React from 'react';
import { useGlobalNotificationContext } from '../context/GlobalNotificationContext';
import { useModalBackground } from '../../utils/styleUtils';
import speakerAnim from '../../pictures/speaker_anim.gif';
import moment from 'moment';

interface NotificationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({ isOpen, onClose }) => {
    const { history, clearHistory } = useGlobalNotificationContext();
    const bgStyle = useModalBackground();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div
                className="bg-surface-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl animate-fade-in-scale-up flex flex-col max-h-[90vh] sm:max-h-[80vh]"

                onClick={e => e.stopPropagation()}
                style={bgStyle}
            >
                <header className="p-4 border-b border-border-primary flex justify-between items-center bg-gradient-to-r from-red-800 to-red-900 rounded-t-2xl text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm shadow-inner overflow-hidden border border-white/20">
                            <img src={speakerAnim} alt="Speaker" className="w-8 h-8 object-contain" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Lịch Sử Thông Báo</h2>
                            <p className="text-xs text-white/70">Các thông báo gần đây từ hệ thống</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </header>

                <main className="p-3 sm:p-4 overflow-y-auto flex-grow custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-text-secondary opacity-60">
                            <i className="fas fa-bell-slash text-4xl mb-3"></i>
                            <p>Chưa có thông báo nào được ghi nhận.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((item, index) => (
                                <div key={index} className={`relative p-3 sm:p-4 rounded-xl border border-border-primary/50 shadow-sm transition-all hover:scale-[1.01] ${index === 0 ? 'bg-surface-hover/30 ring-1 ring-accent-primary/20' : 'bg-surface-ground'}`}>
                                    {index === 0 && (
                                        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-red-600 text-white text-[10px] uppercase font-bold tracking-wider rounded-full shadow-md animate-pulse">
                                            Mới nhất
                                        </div>
                                    )}
                                    <div className="flex gap-3">
                                        <div className={`
                                            w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white shadow-md
                                            ${item.type === 'tet' ? 'bg-gradient-to-br from-red-500 to-yellow-500' :
                                                item.type === 'warning' ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                                                    item.type === 'success' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' :
                                                        item.type === 'danger' ? 'bg-gradient-to-br from-red-500 to-rose-700' :
                                                            'bg-gradient-to-br from-blue-400 to-blue-600'}
                                        `}>
                                            <i className={`fas ${item.type === 'tet' ? 'fa-star' : item.type === 'warning' ? 'fa-exclamation-triangle' : item.type === 'success' ? 'fa-check' : 'fa-bell'}`}></i>
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-medium leading-relaxed ${item.type === 'tet' ? 'text-red-500 dark:text-red-400 font-bold' : 'text-text-primary'}`}>
                                                {item.content}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${item.type === 'tet' ? 'bg-red-50 text-red-600 border-red-200' :
                                                    'bg-gray-100 text-gray-500 border-gray-200'
                                                    } uppercase tracking-wider font-bold`}>
                                                    {item.type}
                                                </span>
                                                {item.timestamp && (
                                                    <span className="text-xs text-text-secondary flex items-center gap-1">
                                                        <i className="far fa-clock text-[10px]"></i>
                                                        {moment(item.timestamp).fromNow()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                <footer className="p-4 border-t border-border-primary bg-surface-ground/50 rounded-b-2xl flex justify-between items-center">
                    <span className="text-xs text-text-secondary">Hiển thị {history.length} thông báo gần nhất</span>
                    {history.length > 0 && (
                        <button
                            onClick={clearHistory}
                            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                            <i className="fas fa-trash-alt"></i>
                            Xóa lịch sử
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default NotificationDetailModal;
