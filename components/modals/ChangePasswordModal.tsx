import React, { useState } from 'react';
import * as authService from '../../services/authService';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    username: string;
    isFirstLogin?: boolean;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, showToast, username, isFirstLogin }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (!oldPassword || !newPassword || !confirmPassword) {
            setLocalError('Vui lòng điền đầy đủ các thông tin.');
            return;
        }
        
        // Quy luật mật khẩu mới: 10 ký tự, có cả chữ và số
        const hasLetter = /[a-zA-Z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);

        if (newPassword.length < 10 || !hasLetter || !hasNumber) {
            setLocalError('Mật khẩu phải có ít nhất 10 ký tự, bao gồm cả chữ và số.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setLocalError('Mật khẩu xác nhận không khớp.');
            return;
        }

        if (oldPassword === newPassword) {
            setLocalError('Mật khẩu mới phải khác mật khẩu cũ.');
            return;
        }

        setIsSubmitting(true);
        const result = await authService.changePassword(username, oldPassword, newPassword);
        setIsSubmitting(false);

        if (result.success) {
            showToast('Thành Công', result.message || 'Mật khẩu đã được thay đổi thành công!', 'success');
            onClose();
        } else {
            setLocalError(result.message || 'Đổi mật khẩu không thành công.');
        }
    };

    // Reset state when modal is closed
    const handleClose = () => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsSubmitting(false);
        setLocalError(null);
        onClose();
    };

    if (!isOpen) return null;


    return (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 font-['Segoe_UI',Tahoma,Geneva,Verdana,sans-serif]" onClick={handleClose}>
            <div className="w-full max-w-[500px] bg-white rounded-[16px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[#e2e8f0] overflow-hidden animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    {/* Header matching Email & ResetPasswordView */}
                    <header className="px-8 pt-[25px] pb-[15px] border-b border-[#f1f5f9]">
                        <div className="flex justify-between items-start">
                            <img 
                                src="https://raw.githubusercontent.com/srthuanan/ordermanagement/main/pictures/logomd.webp" 
                                alt="VinFast" 
                                className="h-[38px] w-auto block"
                            />
                            <div className="text-right">
                                <div className="text-[12px] font-bold text-[#1e3a8a]">VINFAST THUẬN AN</div>
                            </div>
                        </div>
                    </header>

                    <main className="px-8 py-6">
                        <div className="text-[13px] text-[#64748b] mb-[5px] font-medium">Chào Bạn,</div>
                        <div className="text-[18px] text-[#0f172a] font-bold mb-6 uppercase">
                            {isFirstLogin ? 'Kích Hoạt Tài Khoản' : 'Đổi Mật Khẩu'}
                        </div>

                        {/* Inner Form Box */}
                        <div className="bg-[#f8fafc] border border-[#f1f5f9] rounded-[12px] p-5 space-y-4">
                            {localError && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-xs font-medium flex items-center gap-2 animate-shake">
                                    <i className="fas fa-exclamation-circle"></i>
                                    {localError}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider block">Mật khẩu hiện tại</label>
                                <input
                                    type="password"
                                    value={oldPassword}
                                    onChange={e => setOldPassword(e.target.value)}
                                    placeholder={isFirstLogin ? "Mật khẩu tạm thời" : "Nhập mật khẩu hiện tại..."}
                                    required
                                    className="w-full py-2.5 bg-transparent border-b border-[#e2e8f0] focus:border-[#1e3a8a] outline-none text-[13px] text-[#334155] font-semibold transition-all placeholder:text-[#cbd5e1] placeholder:font-normal"
                                />
                            </div>

                            <div className="space-y-1 pt-2">
                                <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider block">Mật khẩu mới</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Nhập mật khẩu mới..."
                                    required
                                    className="w-full py-2.5 bg-transparent border-b border-[#e2e8f0] focus:border-[#1e3a8a] outline-none text-[13px] text-[#334155] font-semibold transition-all placeholder:text-[#cbd5e1] placeholder:font-normal"
                                />
                            </div>

                            <div className="space-y-1 pt-2">
                                <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider block">Xác nhận mật khẩu mới</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Nhập lại mật khẩu mới..."
                                    required
                                    className="w-full py-2.5 bg-transparent border-b border-[#e2e8f0] focus:border-[#1e3a8a] outline-none text-[13px] text-[#334155] font-semibold transition-all placeholder:text-[#cbd5e1] placeholder:font-normal"
                                />
                            </div>
                        </div>
                    </main>

                    <footer className="px-8 pb-8 flex items-center justify-between">
                        <button 
                            type="button" 
                            onClick={handleClose} 
                            disabled={isSubmitting}
                            className="text-[#64748b] hover:text-[#1e3a8a] text-[13px] font-medium transition-colors"
                        >
                            {isFirstLogin ? 'Thoát' : 'Hủy bỏ'}
                        </button>
                        
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="bg-[#1e3a8a] hover:bg-[#162e70] text-white px-8 py-2.5 rounded-[30px] font-bold text-[13px] shadow-[0_4px_12px_rgba(30,58,138,0.15)] transition-all transform hover:scale-[1.05] active:scale-[0.95] disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <><i className="fas fa-spinner fa-spin"></i> ĐANG XỬ LÝ...</>
                            ) : (
                                <>{isFirstLogin ? 'KÍCH HOẠT NGAY' : 'XÁC NHẬN ĐỔI'}</>
                            )}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;