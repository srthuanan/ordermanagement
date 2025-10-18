import React, { useState, FormEvent } from 'react';
import * as authService from '../services/authService';
import backgroundVideo from '../pictures/2222.mp4';
import backgroundGif from '../pictures/RIP.gif';
import logoGif from '../pictures/logohallo.gif';
import userIcon from '../pictures/icon1.gif';
import passIcon from '../pictures/icon2.gif';
import loginButton from '../pictures/login.png';

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
        <div className="halloween relative h-screen w-screen overflow-hidden">
            {/* Fullscreen Video Background */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-0"
            >
                <source src={backgroundVideo} type="video/mp4" />
            </video>

            {/* --- Dark Overlay --- */}
            <div className="absolute inset-0 bg-black/60 z-5"></div>

            {/* --- Login Card --- */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-5xl z-20">
                <div className="glass-card grid grid-cols-1 lg:grid-cols-10 rounded-2xl shadow-2xl overflow-hidden min-h-[500px] relative isolate">
                    
                    {/* --- Left Branding Panel --- */}
                    <div className="hidden lg:col-span-6 lg:flex flex-col justify-between p-12 text-white relative login-card-divider overflow-hidden">
                        {/* GIF Background */}
                        <img
                            src={backgroundGif}
                            alt="Background Animation"
                            className="absolute inset-0 w-full h-full object-cover z-0"
                        />
                        {/* Dark Overlay for Readability */}
                        <div className="absolute inset-0 bg-black/40 z-10"></div>
                        
                        {/* Content */}
                        <div className="relative z-20 flex flex-col justify-between h-full text-center">
                             {/* Top Content */}
                            <div className='text-center'>
                                <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-shadow leading-tight animate-spooky-flicker">
                                    Hệ Thống Quản Lý<br/>Đơn Hàng Nội Bộ
                                </h2>
                            </div>
                            
                            {/* Bottom Content */}
                            <div className='text-center'>
                                <div className="w-24 h-1 bg-gradient-to-r from-accent-secondary to-transparent mb-6 animate-fade-in-up mx-auto" style={{animationDelay: '400ms'}}></div>
                                <div>
                                    <p className="max-w-md text-lg text-slate-300 text-shadow mx-auto animate-ghostly-fade">
                                        Nâng cao hiệu quả công việc và trải nghiệm cho tư vấn bán hàng.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* --- Right Form Panel --- */}
                    <div className="lg:col-span-4 flex flex-col justify-center p-8 sm:p-10">
                         {viewMode === 'login' && (
                            <div className="w-full animate-fade-in-up">
                                <div className="text-center mb-8">
                                    <img src={logoGif} alt="Order Management Logo" className="mx-auto h-35" />
                                </div>
                                <form onSubmit={handleLoginSubmit} className="space-y-6">
                                     <div className="energy-input-container">
                                        <img src={userIcon} alt="Username Icon" className="energy-input-icon" />
                                        <input value={username} onChange={e => setUsername(e.target.value)} type="text" placeholder="Tên đăng nhập" autoComplete="username" className="energy-input"/>
                                    </div>
                                    <div className="energy-input-container">
                                        <img src={passIcon} alt="Password Icon" className="energy-input-icon" />
                                        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Mật khẩu" autoComplete="current-password" className="energy-input"/>
                                    </div>
                                    <div className="flex items-center justify-end pt-2">
                                        <button type="button" onClick={() => setViewMode('forgot')} className="text-sm font-semibold forgot-password-link hover:underline focus:outline-none">Quên mật khẩu?</button>
                                    </div>
                                    <button type="submit" disabled={isSubmitting} className="bg-transparent border-none p-0 w-full mt-2 flex items-center justify-center h-[52px] cursor-pointer group disabled:cursor-not-allowed">
                                        {isSubmitting ? (
                                            <div className="text-white flex items-center font-semibold">
                                                <i className="fas fa-spinner animate-spin mr-2"></i>Đang xử lý...
                                            </div>
                                        ) : (
                                            <img 
                                                src={loginButton}
                                                alt="Đăng Nhập" 
                                                className="h-16 object-contain transition-transform duration-300 group-hover:scale-105 group-disabled:opacity-50"
                                            />
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {viewMode === 'forgot' && (
                            <div className="w-full animate-fade-in-up">
                                <h2 className="text-3xl font-extrabold mb-2 text-center tracking-tight text-white">Quên Mật Khẩu</h2>
                                <p className="text-md text-slate-400 mb-10 text-center">Nhập email để nhận mã khôi phục.</p>
                                <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
                                    <div className="energy-input-container">
                                        <i className="fas fa-envelope energy-input-icon"></i>
                                        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email đăng ký" required className="energy-input"/>
                                    </div>
                                    <button type="submit" disabled={isSubmitting} className="energy-gate-button w-full mt-4 !py-3 !text-base">{isSubmitting ? <><i className="fas fa-spinner animate-spin mr-2"></i>Đang gửi...</> : 'Gửi Mã OTP'}</button>
                                    <div className="text-center mt-4"><button type="button" onClick={handleBackToLogin} className="text-sm font-semibold text-slate-400 hover:underline"><i className="fas fa-arrow-left mr-2"></i>Quay lại Đăng nhập</button></div>
                                </form>
                            </div>
                        )}

                         {viewMode === 'reset' && (
                            <div className="w-full animate-fade-in-up">
                                <h2 className="text-3xl font-extrabold mb-2 text-center tracking-tight text-white">Đặt Lại Mật Khẩu</h2>
                                <p className="text-sm text-slate-400 mb-8 text-center">Mã OTP đã được gửi tới <strong>{email}</strong>.</p>
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
                                    <button type="submit" disabled={isSubmitting} className="energy-gate-button w-full mt-4 !py-3 !text-base">{isSubmitting ? <><i className="fas fa-spinner animate-spin mr-2"></i>Đang xử lý...</> : 'Xác Nhận'}</button>
                                    <div className="text-center pt-2"><button type="button" onClick={handleBackToLogin} className="text-sm font-semibold text-slate-400 hover:underline"><i className="fas fa-arrow-left mr-2"></i>Quay lại Đăng nhập</button></div>
                                </form>
                            </div>
                        )}
                    </div>

                </div>
            </div>
            <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-[10px] font-medium text-slate-400/50 z-20">
                &copy; {new Date().getFullYear()} OrderManagement. All Rights Reserved.
            </footer>
        </div>
    );
};

export default LoginScreen;