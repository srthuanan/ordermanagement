import React, { useState, FormEvent, useMemo } from 'react';
import * as authService from '../services/authService';
import bgVideo from '../pictures/nennoel.mp4';
import logoNoel from '../pictures/logonoel.png';

interface LoginScreenProps {
    onLoginSuccess: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

const Snowflake: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
    <div className="snowflake" style={style}></div>
);

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, showToast }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<'login' | 'forgot' | 'reset'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const snowflakes = useMemo(() => {
        return Array.from({ length: 50 }).map((_, i) => {
            const size = Math.random() * 3 + 1;
            const style = {
                left: `${Math.random() * 100}vw`,
                width: `${size}px`,
                height: `${size}px`,
                animationDuration: `${Math.random() * 10 + 10}s`,
                animationDelay: `${Math.random() * 5}s`,
            };
            return <Snowflake key={i} style={style} />;
        });
    }, []);

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
        <div className="frosty-christmas relative h-screen w-screen overflow-hidden flex items-center justify-center p-4">
            {/* Video Background */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute top-0 left-0 w-full h-full object-cover z-0"
            >
                <source src={bgVideo} type="video/mp4" />
            </video>
            
            {/* Animated Snowflakes Overlay */}
            <div id="snowflakes" aria-hidden="true">{snowflakes}</div>

            <div className="relative z-20 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 lg:gap-8 items-center">
                
                <div className="hidden lg:col-span-1 lg:flex flex-col items-center justify-center text-center p-8 text-shadow">
                    <p className="text-5xl italic text-white/90 leading-tight font-serif drop-shadow-lg">
                        "The future is forged in <br/> <span className="text-blue-300">winter's heart</span>."
                    </p>
                    <div className="w-24 h-1 bg-blue-400/50 my-6 rounded-full"></div>
                    <p className="text-xl text-white/70 tracking-widest uppercase font-light">- Frost & Co. -</p>
                </div>
                
                <div className="form-panel-frosty w-full max-w-[300px] mx-auto lg:max-w-[300px] lg:mx-0 rounded-xl flex flex-col justify-center p-5 relative overflow-hidden">
                    {/* Decorative ice glint */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

                    {viewMode === 'login' && (
                        <div className="w-full animate-fade-in-up">
                            <div className="text-center mb-2 animate-fade-in-down flex justify-center">
                                <img 
                                    src={logoNoel} 
                                    alt="Logo Noel" 
                                    className="max-h-28 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                                />
                            </div>
                            <form onSubmit={handleLoginSubmit} className="space-y-3">
                                <div className="frosty-input-container">
                                    <i className="fas fa-user frosty-input-icon text-xs"></i>
                                    <input value={username} onChange={e => setUsername(e.target.value)} type="text" placeholder="Username" autoComplete="username" className="frosty-input text-sm h-10"/>
                                </div>
                                <div className="frosty-input-container">
                                    <i className="fas fa-key frosty-input-icon text-xs"></i>
                                    <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" autoComplete="current-password" className="frosty-input text-sm h-10"/>
                                </div>
                                <div className="flex items-center justify-end pt-0.5">
                                    <button type="button" onClick={() => setViewMode('forgot')} className="text-[10px] font-medium text-blue-200 hover:text-white transition-colors hover:underline focus:outline-none">Forgot password?</button>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="frosty-button w-full mt-1 text-sm h-10">
                                    {isSubmitting ? <><i className="fas fa-spinner animate-spin mr-2"></i>Wait...</> : 'Log In'}
                                </button>
                            </form>
                        </div>
                    )}

                    {viewMode === 'forgot' && (
                        <div className="w-full animate-fade-in-up">
                            <div className="text-center mb-4">
                                <i className="fas fa-lock-open text-2xl text-blue-200 mb-2 opacity-80"></i>
                                <h2 className="text-lg font-bold text-white tracking-tight text-shadow">Forgot Password</h2>
                                <p className="text-[10px] text-blue-200/70 mt-0.5">Enter your email to receive a reset code.</p>
                            </div>
                            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                                <div className="frosty-input-container">
                                    <i className="fas fa-envelope frosty-input-icon text-xs"></i>
                                    <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Registered Email" required className="frosty-input text-sm h-10"/>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="frosty-button w-full mt-1 text-sm h-10">{isSubmitting ? <><i className="fas fa-spinner animate-spin mr-2"></i>Sending...</> : 'Send OTP'}</button>
                                <div className="text-center mt-3"><button type="button" onClick={handleBackToLogin} className="text-[10px] font-medium text-blue-200 hover:text-white transition-colors"><i className="fas fa-arrow-left mr-1"></i>Back to Login</button></div>
                            </form>
                        </div>
                    )}

                     {viewMode === 'reset' && (
                        <div className="w-full animate-fade-in-up">
                            <div className="text-center mb-4">
                                <i className="fas fa-shield-alt text-2xl text-blue-200 mb-2 opacity-80"></i>
                                <h2 className="text-lg font-bold text-white tracking-tight text-shadow">Reset Password</h2>
                                <p className="text-[10px] text-blue-200/70 mt-0.5">OTP sent to <strong className="text-white">{email}</strong>.</p>
                            </div>
                            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                                <div className="frosty-input-container">
                                    <i className="fas fa-key frosty-input-icon text-xs"></i>
                                    <input value={otp} onChange={e => setOtp(e.target.value)} type="text" placeholder="OTP Code" required className="frosty-input text-sm h-10"/>
                                </div>
                                <div className="frosty-input-container">
                                    <i className="fas fa-lock frosty-input-icon text-xs"></i>
                                    <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="New Password" required className="frosty-input text-sm h-10"/>
                                </div>
                                <div className="frosty-input-container">
                                    <i className="fas fa-check-circle frosty-input-icon text-xs"></i>
                                    <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="Confirm Password" required className="frosty-input text-sm h-10"/>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="frosty-button w-full mt-1 text-sm h-10">{isSubmitting ? <><i className="fas fa-spinner animate-spin mr-2"></i>Confirming...</> : 'Confirm Reset'}</button>
                                <div className="text-center mt-3"><button type="button" onClick={handleBackToLogin} className="text-[10px] font-medium text-blue-200 hover:text-white transition-colors"><i className="fas fa-arrow-left mr-1"></i>Back to Login</button></div>
                            </form>
                        </div>
                    )}
                </div>

            </div>
            <footer className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center text-[10px] font-medium text-white/30 z-20">
                &copy; {new Date().getFullYear()} OrderManagement
            </footer>
        </div>
    );
};

export default LoginScreen;
