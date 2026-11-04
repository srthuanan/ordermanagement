import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, AlertCircle } from 'lucide-react';
import * as authService from '../../services/authService';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    username: string;
    isFirstLogin?: boolean;
    embedded?: boolean;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, showToast, username, isFirstLogin, embedded = false }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
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
            handleClose();
        } else {
            setLocalError(result.message || 'Đổi mật khẩu không thành công.');
        }
    };

    // Reset state when modal is closed
    const handleClose = () => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowOld(false);
        setShowNew(false);
        setShowConfirm(false);
        setIsSubmitting(false);
        setLocalError(null);
        onClose();
    };

    useEffect(() => {
        if (!isOpen || embedded) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, embedded]);

    if (!isOpen) return null;

    if (embedded) {
        return (
            <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col bg-white">
                <main className="min-h-0 flex-1 p-4">
                    <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-[10.5px] leading-relaxed text-blue-800">
                        Mật khẩu mới cần ít nhất 10 ký tự, bao gồm cả chữ và số.
                    </div>

                    {localError && (
                        <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] font-medium text-rose-600 animate-shake">
                            <i className="fas fa-exclamation-circle"></i>
                            {localError}
                        </div>
                    )}

                    <div className="space-y-2 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3">
                        <label className="block">
                            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Mật khẩu hiện tại</span>
                            <input
                                type="password"
                                value={oldPassword}
                                onChange={e => setOldPassword(e.target.value)}
                                placeholder={isFirstLogin ? 'Mật khẩu tạm thời' : 'Nhập mật khẩu hiện tại'}
                                required
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </label>

                        <label className="block pt-1">
                            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Mật khẩu mới</span>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Nhập mật khẩu mới"
                                required
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </label>

                        <label className="block pt-1">
                            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Xác nhận mật khẩu mới</span>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Nhập lại mật khẩu mới"
                                required
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </label>
                    </div>
                </main>

                <footer className="flex flex-shrink-0 gap-2 border-t border-slate-100 bg-white p-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="h-10 flex-1 rounded-xl bg-slate-100 text-[12px] font-medium text-slate-600 active:bg-slate-200 disabled:opacity-50"
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex h-10 flex-[1.35] items-center justify-center gap-1.5 rounded-xl bg-slate-800 text-[12px] font-semibold text-white active:bg-slate-900 disabled:opacity-60"
                    >
                        {isSubmitting ? (
                            <><i className="fas fa-spinner fa-spin"></i><span>Đang xử lý...</span></>
                        ) : (
                            <span>Xác nhận đổi</span>
                        )}
                    </button>
                </footer>
            </form>
        );
    }

    return (
        <div
            className="cp-sheet"
            onClick={(e) => {
                if (e.target === e.currentTarget) { window.dispatchEvent(new CustomEvent('close-all-sheets')); handleClose(); }
            }}
        >
            <style>{`
                .cp-sheet {
                    position: fixed;
                    inset: 0 0 0 64px;
                    width: calc(100vw - 64px);
                    height: 100dvh;
                    z-index: 1005;
                    display: flex;
                    align-items: stretch;
                    justify-content: flex-start;
                    background: rgba(15, 23, 42, 0.08);
                    overflow: hidden;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                }
                @media (max-width: 768px) {
                    .cp-sheet {
                        inset: 0;
                        width: 100vw;
                    }
                }
                .cp-sheet-panel {
                    width: clamp(290px, 25vw, 390px);
                    max-width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #ffffff;
                    color: #17263b;
                    border-right: 1px solid #e2e8f0;
                    box-shadow: 18px 0 42px -14px rgba(20, 34, 54, 0.16);
                    animation: cpSlideInLeft 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @keyframes cpSlideInLeft {
                    from {
                        transform: translateX(-100%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }
                .cp-header {
                    padding: 22px 20px 14px;
                    border-bottom: 1px solid #e9edf2;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }
                .cp-title {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 650;
                    line-height: 1.15;
                    letter-spacing: -0.5px;
                    color: #17263b;
                }
                .cp-subtitle {
                    margin: 3px 0 0;
                    font-size: 11px;
                    font-weight: 450;
                    color: #7b879a;
                }
                .cp-close-btn {
                    width: 28px;
                    height: 28px;
                    border: 0;
                    border-radius: 6px;
                    background: transparent;
                    color: #64748b;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: background-color 140ms ease, color 140ms ease;
                }
                .cp-close-btn:hover {
                    background: #f1f5f9;
                    color: #0f172a;
                }
                .cp-body {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    padding: 18px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }
                .cp-hint {
                    font-size: 11.5px;
                    line-height: 1.45;
                    color: #64748b;
                    padding-bottom: 4px;
                    border-bottom: 1px solid #f1f5f9;
                }
                .cp-error {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    padding: 9px 11px;
                    border-radius: 8px;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #dc2626;
                    font-size: 11.5px;
                    font-weight: 500;
                    line-height: 1.4;
                }
                .cp-field {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .cp-label {
                    font-size: 11px;
                    font-weight: 600;
                    color: #475569;
                }
                .cp-input-wrap {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .cp-input {
                    width: 100%;
                    height: 36px;
                    padding: 0 34px 0 11px;
                    border: 1px solid #dbe2ea;
                    border-radius: 8px;
                    background: #ffffff;
                    font-size: 12.5px;
                    font-weight: 500;
                    color: #17263b;
                    outline: none;
                    transition: border-color 140ms ease, box-shadow 140ms ease;
                }
                .cp-input::placeholder {
                    color: #94a3b8;
                    font-weight: 400;
                }
                .cp-input:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
                }
                .cp-eye-btn {
                    position: absolute;
                    right: 6px;
                    width: 24px;
                    height: 24px;
                    border: 0;
                    border-radius: 5px;
                    background: transparent;
                    color: #94a3b8;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }
                .cp-eye-btn:hover {
                    color: #475569;
                    background: #f1f5f9;
                }
                .cp-footer {
                    padding: 12px 20px;
                    border-top: 1px solid #eef2f6;
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 8px;
                }
                .cp-btn-cancel {
                    height: 34px;
                    padding: 0 14px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    background: #ffffff;
                    color: #475569;
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background-color 140ms ease, color 140ms ease;
                }
                .cp-btn-cancel:hover:not(:disabled) {
                    background: #f8fafc;
                    color: #17263b;
                }
                .cp-btn-submit {
                    height: 34px;
                    padding: 0 16px;
                    border: 0;
                    border-radius: 8px;
                    background: #17263b;
                    color: #ffffff;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    transition: background-color 140ms ease;
                }
                .cp-btn-submit:hover:not(:disabled) {
                    background: #0f172a;
                }
                .cp-btn-submit:disabled,
                .cp-btn-cancel:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
            `}</style>

            <form onSubmit={handleSubmit} className="cp-sheet-panel" onClick={e => e.stopPropagation()}>
                <header className="cp-header">
                    <div>
                        <h2 className="cp-title">
                            {isFirstLogin ? 'Kích hoạt tài khoản' : 'Đổi mật khẩu'}
                        </h2>
                        <p className="cp-subtitle">Tài khoản: {username}</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="cp-close-btn"
                        aria-label="Đóng"
                    >
                        <X size={16} strokeWidth={2} />
                    </button>
                </header>

                <main className="cp-body">
                    <div className="cp-hint">
                        Mật khẩu mới cần tối thiểu 10 ký tự, bao gồm cả chữ và số.
                    </div>

                    {localError && (
                        <div className="cp-error">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span>{localError}</span>
                        </div>
                    )}

                    <div className="cp-field">
                        <label className="cp-label">Mật khẩu hiện tại</label>
                        <div className="cp-input-wrap">
                            <input
                                type={showOld ? 'text' : 'password'}
                                value={oldPassword}
                                onChange={e => setOldPassword(e.target.value)}
                                placeholder={isFirstLogin ? 'Nhập mật khẩu tạm thời' : 'Nhập mật khẩu hiện tại'}
                                required
                                autoFocus
                                className="cp-input"
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowOld(v => !v)}
                                className="cp-eye-btn"
                                aria-label="Hiện/ẩn mật khẩu"
                            >
                                {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>

                    <div className="cp-field">
                        <label className="cp-label">Mật khẩu mới</label>
                        <div className="cp-input-wrap">
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Nhập mật khẩu mới"
                                required
                                className="cp-input"
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowNew(v => !v)}
                                className="cp-eye-btn"
                                aria-label="Hiện/ẩn mật khẩu"
                            >
                                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>

                    <div className="cp-field">
                        <label className="cp-label">Xác nhận mật khẩu mới</label>
                        <div className="cp-input-wrap">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Nhập lại mật khẩu mới"
                                required
                                className="cp-input"
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowConfirm(v => !v)}
                                className="cp-eye-btn"
                                aria-label="Hiện/ẩn mật khẩu"
                            >
                                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>
                </main>

                <footer className="cp-footer">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="cp-btn-cancel"
                    >
                        {isFirstLogin ? 'Thoát' : 'Hủy bỏ'}
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="cp-btn-submit"
                    >
                        {isSubmitting ? 'Đang lưu...' : (isFirstLogin ? 'Kích hoạt' : 'Lưu mật khẩu')}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default ChangePasswordModal;
