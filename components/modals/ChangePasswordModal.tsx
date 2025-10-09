import React, { useState } from 'react';
import * as authService from '../../services/authService';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    username: string;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, showToast, username }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!oldPassword || !newPassword || !confirmPassword) {
            showToast('Thiếu Thông Tin', 'Vui lòng điền đầy đủ các trường.', 'warning');
            return;
        }
        if (newPassword.length < 6) {
            showToast('Mật Khẩu Yếu', 'Mật khẩu mới phải có ít nhất 6 ký tự.', 'warning');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('Lỗi', 'Mật khẩu xác nhận không khớp.', 'error');
            return;
        }
        if (oldPassword === newPassword) {
            showToast('Lưu Ý', 'Mật khẩu mới phải khác mật khẩu cũ.', 'info');
            return;
        }

        setIsSubmitting(true);
        const result = await authService.changePassword(username, oldPassword, newPassword);
        setIsSubmitting(false);

        if (result.success) {
            showToast('Thành Công', result.message || 'Mật khẩu đã được thay đổi thành công!', 'success');
            onClose();
        } else {
            showToast('Thất Bại', result.message || 'Đổi mật khẩu không thành công.', 'error');
        }
    };
    
    // Reset state when modal is closed
    const handleClose = () => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsSubmitting(false);
        onClose();
    };

    if (!isOpen) return null;

    const inputClass = "peer w-full pl-12 pr-4 py-3 bg-surface-ground text-text-primary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary transition-all placeholder:text-text-placeholder focus:shadow-glow-accent";

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={handleClose}>
            <div className="bg-surface-card w-full max-w-md rounded-2xl shadow-xl animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <header className="relative flex flex-col items-center justify-center p-6 text-center bg-surface-card border-b border-border-primary">
                        <div className="animate-fade-in-down">
                            <h2 className="text-xl font-bold text-gradient">Đổi Mật Khẩu</h2>
                            <p className="text-sm text-text-secondary mt-1">Bảo mật tài khoản của bạn.</p>
                        </div>
                        <button type="button" onClick={handleClose} className="absolute top-4 right-4 w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-text-secondary hover:bg-surface-hover">
                            <i className="fas fa-times"></i>
                        </button>
                    </header>
                    
                    <main className="p-6 space-y-5">
                        <div className="relative">
                            <i className="fas fa-shield-alt absolute top-1/2 left-4 -translate-y-1/2 text-text-secondary peer-focus:text-accent-primary"></i>
                            <input
                                type="password"
                                value={oldPassword}
                                onChange={e => setOldPassword(e.target.value)}
                                placeholder="Mật khẩu cũ"
                                required
                                className={inputClass}
                            />
                        </div>
                         <div className="relative">
                            <i className="fas fa-lock absolute top-1/2 left-4 -translate-y-1/2 text-text-secondary peer-focus:text-accent-primary"></i>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
                                required
                                className={inputClass}
                            />
                        </div>
                         <div className="relative">
                            <i className="fas fa-check-circle absolute top-1/2 left-4 -translate-y-1/2 text-text-secondary peer-focus:text-accent-primary"></i>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Xác nhận mật khẩu mới"
                                required
                                className={inputClass}
                            />
                        </div>
                    </main>
                    
                    <footer className="p-4 border-t border-border-primary flex justify-end gap-4 bg-surface-ground rounded-b-2xl">
                        <button type="button" onClick={handleClose} disabled={isSubmitting} className="btn-secondary">Hủy</button>
                        <button type="submit" disabled={isSubmitting} className="btn-primary">
                            {isSubmitting ? <><i className="fas fa-spinner fa-spin mr-2"></i> Đang xử lý...</> : <><i className="fas fa-save mr-2"></i> Xác Nhận</>}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
