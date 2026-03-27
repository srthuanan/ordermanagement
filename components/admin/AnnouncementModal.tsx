import React, { useState, useEffect } from 'react';
import { useModalBackground } from '../../utils/styleUtils';
import { GlobalNotification } from '../context/GlobalNotificationContext';
import speakerAnim from '../../pictures/speaker_anim.gif';

interface AnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentNotification: GlobalNotification | null;
    onSave: (notification: GlobalNotification) => Promise<void>;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ isOpen, onClose, currentNotification, onSave }) => {
    const [content, setContent] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [type, setType] = useState<GlobalNotification['type']>('info');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const bgStyle = useModalBackground();

    useEffect(() => {
        if (isOpen) {
            if (currentNotification) {
                setContent(currentNotification.content);
                setIsActive(currentNotification.isActive);
                setType(currentNotification.type);
            } else {
                // Defaults if no existing notification
                setContent('');
                setIsActive(true);
                setType('info');
            }
        }
    }, [isOpen]); // Only run when modal opens, ignore currentNotification updates while open

    const handleSave = async () => {
        if (!content.trim()) {
            alert('Vui lòng nhập nội dung thông báo.');
            return;
        }
        setIsSubmitting(true);
        try {
            await onSave({ content, isActive, type });
            onClose();
        } catch (error) {
            alert('Có lỗi xảy ra khi lưu thông báo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface-card w-full max-w-lg rounded-2xl shadow-xl animate-fade-in-scale-up flex flex-col" onClick={e => e.stopPropagation()} style={bgStyle}>
                <header className="p-4 border-b border-border-primary flex justify-between items-center">
                    <h2 className="text-xl font-bold text-text-primary">Cài Đặt Thông Báo</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </header>

                <main className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Nội dung thông báo</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={3}
                            placeholder="Nhập nội dung thông báo chạy chữ..."
                            className="w-full bg-surface-ground border border-border-primary rounded-lg p-3 futuristic-input focus:ring-2 focus:ring-accent-primary outline-none text-text-primary"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">Loại thông báo</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as any)}
                                className="w-full bg-surface-ground border border-border-primary rounded-lg p-2.5 futuristic-input text-text-primary outline-none"
                            >
                                <option value="info">Thông tin (Xanh dương)</option>
                                <option value="warning">Cảnh báo (Vàng)</option>
                                <option value="danger">Khẩn cấp (Đỏ)</option>
                                <option value="success">Thành công (Xanh lá)</option>
                                <option value="tet">Chúc Mừng Năm Mới (Vàng/Đỏ)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">Trạng thái</label>
                            <div className="flex items-center gap-3 h-[42px]">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary"></div>
                                    <span className="ml-3 text-sm font-medium text-text-primary">{isActive ? 'Đang Hiển Thị' : 'Đã Tắt'}</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="mt-4 pt-4 border-t border-border-primary">
                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">Xem trước</label>
                        <div className="relative z-40 w-full overflow-hidden border border-white/10 bg-[#0f172a] shadow-lg h-10 flex items-center rounded-lg mt-2">
                            {/* Premium Background Effects */}
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E')] opacity-20 mix-blend-soft-light"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-30"></div>

                            {/* Type-Specific Overlays (All Festive Now) */}
                            {type === 'tet' && <div className="absolute inset-0 bg-gradient-to-r from-red-900/90 via-[#450a0a] to-red-900/90 mix-blend-multiply"></div>}
                            {type === 'info' && <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-slate-900 to-blue-900/90 mix-blend-multiply"></div>}
                            {type === 'warning' && <div className="absolute inset-0 bg-gradient-to-r from-amber-700/80 via-yellow-900/80 to-amber-700/80"></div>}
                            {type === 'success' && <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/90 via-green-900 to-emerald-900/90"></div>}
                            {type === 'danger' && <div className="absolute inset-0 bg-gradient-to-r from-red-900/90 via-rose-950 to-red-900/90"></div>}

                            {/* Universal Festive Overlay */}
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E')] opacity-20 mix-blend-soft-light"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/5 to-transparent opacity-30"></div>

                            {/* Static Badge/Label (Left Side) - All Gold/Red Style */}
                            <div className="absolute left-0 z-20 h-full flex items-center pl-3 pr-4 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent">
                                <div className={`
                                flex items-center gap-1.5 px-2 py-0.5 rounded-full border backdrop-blur-md shadow-sm
                                border-yellow-500/40 bg-red-950/40
                            `}>
                                    <img src={speakerAnim} alt="Speaker" className="w-5 h-5 object-contain drop-shadow-sm" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-yellow-200/90">
                                        Thông Báo
                                    </span>
                                </div>
                            </div>

                            {/* Scrolling Content Preview (Static here for better preview) */}
                            <div className="flex items-center whitespace-nowrap pl-28 relative z-10 w-full">
                                <span className="text-xs font-medium tracking-wide flex items-center gap-3 text-yellow-50/90">
                                    <i className="fas fa-star text-[8px] text-yellow-500/60 animate-pulse"></i>
                                    {content || "Nội dung sẽ hiển thị ở đây..."}
                                    <i className="fas fa-star text-[8px] text-yellow-500/60 animate-pulse"></i>
                                </span>
                            </div>
                        </div>
                    </div>

                </main>

                <footer className="p-4 border-t border-border-primary flex justify-end gap-3 bg-surface-ground rounded-b-2xl">
                    <button onClick={onClose} disabled={isSubmitting} className="btn-secondary px-4 py-2 rounded-lg">Hủy</button>
                    <button onClick={handleSave} disabled={isSubmitting} className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2">
                        {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                        <span>Lưu Cài Đặt</span>
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default AnnouncementModal;
