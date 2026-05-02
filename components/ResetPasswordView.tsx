import React, { useState, useEffect } from 'react';
import * as authService from '../services/authService';

interface ResetPasswordViewProps {
    onSuccess: () => void;
    onCancel: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    context?: 'recovery' | 'invite';
}

const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onSuccess, onCancel, showToast, context = 'recovery' }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [passwordStrength, setPasswordStrength] = useState(0);

    // Password strength logic
    useEffect(() => {
        let strength = 0;
        if (newPassword.length >= 8) strength += 20;
        if (newPassword.length >= 10) strength += 20;
        if (/[A-Z]/.test(newPassword)) strength += 20;
        if (/[0-9]/.test(newPassword)) strength += 20;
        if (/[^A-Za-z0-9]/.test(newPassword)) strength += 20;
        setPasswordStrength(strength);
    }, [newPassword]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!newPassword || !confirmPassword) {
            setError('Vui lòng điền đầy đủ các thông tin.');
            return;
        }

        if (newPassword.length < 10 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            setError('Mật khẩu phải có ít nhất 10 ký tự, bao gồm cả chữ và số.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        setIsSubmitting(true);
        const result = await authService.resetPassword(newPassword);
        setIsSubmitting(false);

        if (result.success) {
            const successMsg = context === 'invite' 
                ? 'Tài khoản đã được kích hoạt thành công! Bạn có thể bắt đầu làm việc ngay bây giờ.' 
                : 'Mật khẩu đã được đặt lại thành công! Bạn có thể đăng nhập ngay bây giờ.';
            showToast('Thành Công', successMsg, 'success');
            onSuccess();
        } else {
            setError(result.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
        }
    };

    const getStrengthColor = () => {
        if (passwordStrength <= 20) return 'bg-red-500';
        if (passwordStrength <= 40) return 'bg-orange-500';
        if (passwordStrength <= 60) return 'bg-yellow-500';
        if (passwordStrength <= 80) return 'bg-blue-500';
        return 'bg-green-500';
    };

    const getStrengthText = () => {
        if (passwordStrength <= 20) return 'Rất yếu';
        if (passwordStrength <= 40) return 'Yếu';
        if (passwordStrength <= 60) return 'Trung bình';
        if (passwordStrength <= 80) return 'Mạnh';
        return 'Rất mạnh';
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#f4f7f9] font-['Segoe_UI',Tahoma,Geneva,Verdana,sans-serif]">
            <div className="w-full max-w-[550px] bg-white rounded-[16px] shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-[#e2e8f0] overflow-hidden animate-fade-in-scale-up">
                {/* Header matching Email */}
                <header className="px-10 pt-[30px] pb-[20px] border-b border-[#f1f5f9]">
                    <div className="flex justify-between items-start">
                        <img 
                            src="https://raw.githubusercontent.com/srthuanan/ordermanagement/main/pictures/logomd.webp" 
                            alt="VinFast" 
                            className="h-[42px] w-auto block"
                        />
                        <div className="text-right">
                            <div className="text-[13px] font-bold text-[#1e3a8a]">VINFAST THUẬN AN</div>
                        </div>
                    </div>
                </header>

                <main className="px-10 py-[30px]">
                    <div className="h-[1px] bg-[#1e3a8a] mb-[30px] opacity-20"></div>
                    
                    <div className="text-[13px] text-[#64748b] mb-[5px] font-medium">Thân gửi,</div>
                    <div className="text-[18px] text-[#0f172a] font-bold mb-5">THÀNH VIÊN HỆ THỐNG</div>

                    {/* Inner Form Box matching Email Details Box */}
                    <div className="bg-[#f8fafc] border border-[#f1f5f9] rounded-[12px] p-6 mb-6">
                        <div className="text-[#1e3a8a] text-[15px] font-bold mb-4">
                            {context === 'invite' ? 'Thiết Lập Mật Khẩu Thành Viên' : 'Yêu Cầu Khôi Phục Mật Khẩu'}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-xs font-medium flex items-center gap-2 animate-shake">
                                    <i className="fas fa-exclamation-circle"></i>
                                    {error}
                                </div>
                            )}

                            <div className="space-y-1">
                                <div className="flex justify-between items-center text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                                    <label>Mật khẩu mới</label>
                                    <span className={`text-[9px] ${passwordStrength > 60 ? 'text-green-600' : 'text-orange-500'}`}>{getStrengthText()}</span>
                                </div>
                                <div className="relative group">
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Nhập mật khẩu mới..."
                                        required
                                        className="w-full py-3 bg-white border-b border-[#f1f5f9] focus:border-[#1e3a8a] outline-none text-[13px] text-[#334155] font-semibold transition-all placeholder:text-[#cbd5e1]"
                                    />
                                    <div className="h-0.5 w-full bg-[#f1f5f9] mt-1 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-500 ${getStrengthColor()}`}
                                            style={{ width: `${passwordStrength}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1 pt-2">
                                <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider block">Xác nhận mật khẩu</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Nhập lại mật khẩu..."
                                    required
                                    className="w-full py-3 bg-white border-b border-[#f1f5f9] focus:border-[#1e3a8a] outline-none text-[13px] text-[#334155] font-semibold transition-all placeholder:text-[#cbd5e1]"
                                />
                            </div>

                            <div className="pt-6 text-center">
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="inline-block bg-[#1e3a8a] hover:bg-[#162e70] text-white px-8 py-3 rounded-[30px] font-bold text-[14px] shadow-[0_4px_12px_rgba(30,58,138,0.15)] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 mx-auto"
                                >
                                    {isSubmitting ? (
                                        <><i className="fas fa-spinner fa-spin"></i> ĐANG XỬ LÝ...</>
                                    ) : (
                                        <>{context === 'invite' ? 'HOÀN TẤT KÍCH HOẠT' : 'ĐẶT LẠI MẬT KHẨU'}</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="text-center">
                        <button 
                            type="button" 
                            onClick={onCancel}
                            className="text-[#64748b] hover:text-[#1e3a8a] text-[13px] font-medium transition-colors"
                        >
                            Quay lại Đăng nhập
                        </button>
                    </div>
                </main>
                
                <footer className="px-10 py-5 border-top border-[#f1f5f9] text-center">
                    <div className="text-[10px] color-[#94a3b8] font-bold uppercase tracking-[0.5px] mb-2">Hệ thống Quản lý Bán hàng</div>
                    <div className="text-[11px] text-[#cbd5e1] flex items-center justify-center gap-2">
                        <i className="fas fa-info-circle text-[10px]"></i>
                        Mật khẩu phải có ít nhất 10 ký tự, bao gồm cả chữ và số.
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ResetPasswordView;
