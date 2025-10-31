import React, { useState, FormEvent } from 'react';
import * as authService from '../services/authService';

interface LoginScreenProps {
    onLoginSuccess: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, showToast }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<'login' | 'forgot' | 'reset'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleLoginSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            showToast('Lỗi', 'Vui lòng nhập đầy đủ thông tin!', 'error');
            return;
        }
        setIsSubmitting(true);
        const result = await authService.login(username, password);
        setIsSubmitting(false);
        if (result.success) {
            showToast('Thành Công', 'Đăng nhập thành công!', 'success');
            onLoginSuccess();
        } else {
            showToast('Thất Bại', result.message || 'Đăng nhập không thành công.', 'error');
        }
    };

    const handleForgotPasswordSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!email) {
            showToast('Lỗi', 'Vui lòng nhập email của bạn.', 'error');
            return;
        }
        setIsSubmitting(true);
        const result = await authService.forgotPassword(email);
        setIsSubmitting(false);
        if (result.success) {
            showToast('Thành Công', result.message || 'Mã OTP đã được gửi.', 'success', 6000);
            setViewMode('reset');
        } else {
            showToast('Thất Bại', result.message || 'Yêu cầu không thành công.', 'error');
        }
    };

    const handleResetPasswordSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!otp || !newPassword || !confirmPassword) {
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
        setIsSubmitting(true);
        const result = await authService.resetPassword(email, otp, newPassword);
        setIsSubmitting(false);
        if (result.success) {
            showToast('Thành Công', result.message || 'Mật khẩu đã được đặt lại.', 'success');
            handleBackToLogin();
        } else {
            showToast('Thất Bại', result.message || 'Đặt lại mật khẩu không thành công.', 'error');
        }
    };

    const handleBackToLogin = () => {
        setEmail(''); setOtp(''); setNewPassword(''); setConfirmPassword(''); setUsername(''); setPassword('');
        setViewMode('login');
    };

    return (
        <div className="teachers-day relative h-screen w-screen overflow-hidden flex items-center justify-center p-4">
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute top-0 left-0 w-full h-full object-cover z-0"
            >
                <source src="/pictures/1111.mp4" type="video/mp4" />
            </video>
            {/* --- Dark Overlay --- */}
            <div className="absolute inset-0 bg-black/40 z-5"></div>

            {/* --- Main Content Grid --- */}
            <div className="relative z-20 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 lg:gap-8 items-center">
                
                {/* --- Left Cinematic Panel --- */}
                <div className="hidden lg:col-span-2 lg:flex flex-col items-center justify-center text-center p-8 text-shadow">
                    <i className="fas fa-quote-left text-4xl text-white/80 mb-4"></i>
                    <p className="text-3xl italic text-white leading-relaxed">
                        "Một gánh sách không bằng một người thầy giỏi."
                    </p>
                    <p className="text-xl text-white/90 mt-4">- Ngạn ngữ Việt Nam -</p>
                </div>
                
                {/* --- Right Form Panel --- */}
                <div className="form-panel-teachers w-full max-w-sm mx-auto lg:max-w-none lg:mx-0 rounded-2xl flex flex-col justify-center p-8 sm:p-10">
                    {viewMode === 'login' && (
                        <div className="w-full animate-fade-in-up">
                            <div className="text-center mb-8 animate-fade-in-down">
                                <img src="/pictures/logonhagiao.png" alt="Tri Ân Thầy Cô" className="h-26 mx-auto filter drop-shadow-lg animate-zoom-in-out" />
                                <h1 className="text-3xl font-bold text-white mt-3 text-shadow">
                                    Tri Ân Thầy Cô
                                </h1>
                                <p className="text-lg font-semibold text-white/80 tracking-widest"></p>
                            </div>
                            <form onSubmit={handleLoginSubmit} className="space-y-6">
                                <div className="energy-input-container">
                                    <img src="/pictures/icon1.gif" alt="Username" className="energy-input-icon" />
                                    <input value={username} onChange={e => setUsername(e.target.value)} type="text" placeholder="Tên đăng nhập" autoComplete="username" className="energy-input"/>
                                </div>
                                <div className="energy-input-container">
                                    <img src="/pictures/icon2.gif" alt="Password" className="energy-input-icon" />
                                    <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Mật khẩu" autoComplete="current-password" className="energy-input"/>
                                </div>
                                <div className="flex items-center justify-end pt-2">
                                    <button type="button" onClick={() => setViewMode('forgot')} className="text-sm font-semibold forgot-password-link hover:underline focus:outline-none">Quên mật khẩu?</button>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="teachers-day-button w-full mt-2">
                                    {isSubmitting ? (
                                        <>
                                            <i className="fas fa-spinner animate-spin mr-2"></i>Đang xử lý...
                                        </>
                                    ) : (
                                        'Đăng Nhập'
                                    )}
                                </button>
                            </form>
                        </div>
                    )}

                    {viewMode === 'forgot' && (
                        <div className="w-full animate-fade-in-up">
                            <h2 className="text-3xl font-extrabold mb-2 text-center tracking-tight text-white text-shadow">Quên Mật Khẩu</h2>
                            <p className="text-md text-slate-300 mb-10 text-center">Nhập email để nhận mã khôi phục.</p>
                            <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
                                <div className="energy-input-container">
                                    <i className="fas fa-envelope energy-input-icon"></i>
                                    <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email đăng ký" required className="energy-input"/>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="teachers-day-button w-full mt-4">{isSubmitting ? <><i className="fas fa-spinner animate-spin mr-2"></i>Đang gửi...</> : 'Gửi Mã OTP'}</button>
                                <div className="text-center mt-4"><button type="button" onClick={handleBackToLogin} className="text-sm font-semibold text-slate-300 hover:text-white hover:underline"><i className="fas fa-arrow-left mr-2"></i>Quay lại Đăng nhập</button></div>
                            </form>
                        </div>
                    )}

                     {viewMode === 'reset' && (
                        <div className="w-full animate-fade-in-up">
                            <h2 className="text-3xl font-extrabold mb-2 text-center tracking-tight text-white text-shadow">Đặt Lại Mật Khẩu</h2>
                            <p className="text-sm text-slate-300 mb-8 text-center">Mã OTP đã được gửi tới <strong className="text-white">{email}</strong>.</p>
                            <form onSubmit={handleResetPasswordSubmit} className="space-y-6">
                                <div className="energy-input-container">
                                    <i className="fas fa-key energy-input-icon"></i>
                                    <input value={otp} onChange={e => setOtp(e.target.value)} type="text" placeholder="Mã OTP" required className="energy-input"/>
                                </div>
                                <div className="energy-input-container">
                                    <i className="fas fa-lock energy-input-icon"></i>
                                    <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" required className="energy-input"/>
                                </div>
                                <div className="energy-input-container">
                                    <i className="fas fa-check-circle energy-input-icon"></i>
                                    <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="Xác nhận mật khẩu mới" required className="energy-input"/>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="teachers-day-button w-full mt-4">{isSubmitting ? <><i className="fas fa-spinner animate-spin mr-2"></i>Đang xử lý...</> : 'Xác Nhận'}</button>
                                <div className="text-center pt-2"><button type="button" onClick={handleBackToLogin} className="text-sm font-semibold text-slate-300 hover:text-white hover:underline"><i className="fas fa-arrow-left mr-2"></i>Quay lại Đăng nhập</button></div>
                            </form>
                        </div>
                    )}
                </div>

            </div>
            <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-[10px] font-medium text-white/70 z-20 text-shadow">
                &copy; {new Date().getFullYear()} OrderManagement. All Rights Reserved.
            </footer>
        </div>
    );
};

export default LoginScreen;