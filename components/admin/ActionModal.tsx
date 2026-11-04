import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface InputConfig {
    id: string;
    label: string;
    placeholder?: string;
    type?: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'password' | 'email';
    isVIN?: boolean;
    options?: string[];
    required?: boolean;
}

interface ActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (formData: Record<string, string>) => Promise<boolean>;
    title: string;
    description: string;
    inputs?: InputConfig[];
    submitText: string;
    submitColor: 'primary' | 'danger' | 'success';
    icon: string;
    targetId?: string;
    showToast?: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

const ActionModal: React.FC<ActionModalProps> = ({
    isOpen, onClose, onSubmit, title, description, inputs = [], submitText, submitColor, targetId, showToast
}) => {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(prev => {
                // If inputs array reference changes but isOpen is still true, do not wipe data if we have some.
                // This prevents background refreshes in parent component from clearing user input.
                if (Object.keys(prev).length > 0 && inputs.length > 0) {
                    return prev;
                }

                return inputs.reduce((acc, input) => {
                    acc[input.id] = '';
                    return acc;
                }, {} as Record<string, string>);
            });
            setIsSubmitting(false);
        } else {
            setFormData({});
            setIsSubmitting(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isSubmitting) onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        let value = e.target.value;
        const inputConfig = inputs.find(i => i.id === e.target.name);
        if (inputConfig?.isVIN) {
            value = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17);
        }
        setFormData(prev => ({ ...prev, [e.target.name]: value }));
    };

    const isFormValid = () => {
        for (const input of inputs) {
            const isRequired = input.required !== false;
            const value = formData[input.id]?.trim();
            if (isRequired && !value) return false;
            if (input.isVIN && value && value.length !== 17) return false;
        }
        return true;
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (inputs.length > 0 && !isFormValid()) {
            if (showToast) {
                showToast('Thông tin không hợp lệ', 'Vui lòng điền đầy đủ và chính xác thông tin.', 'warning');
            } else {
                alert('Vui lòng điền đầy đủ và chính xác thông tin.');
            }
            return;
        }
        setIsSubmitting(true);
        const success = await onSubmit(formData);
        if (!success) {
            setIsSubmitting(false);
        }
    };

    const isDanger = submitColor === 'danger';

    return (
        <div
            className="am-sheet"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) { window.dispatchEvent(new CustomEvent('close-all-sheets')); onClose(); }
            }}
        >
            <style>{`
                .am-sheet {
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
                    .am-sheet {
                        inset: 0;
                        width: 100vw;
                    }
                }
                .am-sheet-panel {
                    width: clamp(310px, 27vw, 410px);
                    max-width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #ffffff;
                    color: #17263b;
                    border-right: 1px solid #e2e8f0;
                    box-shadow: 18px 0 42px -14px rgba(20, 34, 54, 0.16);
                    animation: amSlideInLeft 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @keyframes amSlideInLeft {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .am-header {
                    padding: 22px 20px 14px;
                    border-bottom: 1px solid #e9edf2;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                }
                .am-title {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 650;
                    line-height: 1.15;
                    letter-spacing: -0.5px;
                    color: #17263b;
                }
                .am-subtitle {
                    margin: 4px 0 0;
                    font-size: 11.5px;
                    font-weight: 450;
                    line-height: 1.45;
                    color: #7b879a;
                }
                .am-close-btn {
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
                    flex-shrink: 0;
                    transition: background-color 140ms ease, color 140ms ease;
                }
                .am-close-btn:hover {
                    background: #f1f5f9;
                    color: #0f172a;
                }
                .am-body {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    padding: 18px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }
                .am-target-box {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    padding: 9px 12px;
                    border: 1px solid #e9edf2;
                    border-radius: 8px;
                    background: #f8fafc;
                }
                .am-target-label {
                    font-size: 11px;
                    font-weight: 500;
                    color: #64748b;
                }
                .am-target-val {
                    font-size: 12px;
                    font-weight: 600;
                    color: #17263b;
                    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
                }
                .am-field {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .am-label {
                    font-size: 11px;
                    font-weight: 600;
                    color: #475569;
                }
                .am-input, .am-select, .am-textarea {
                    width: 100%;
                    border: 1px solid #dbe2ea;
                    border-radius: 8px;
                    background: #ffffff;
                    font-size: 12.5px;
                    font-weight: 500;
                    color: #17263b;
                    outline: none;
                    transition: border-color 140ms ease, box-shadow 140ms ease;
                }
                .am-input, .am-select {
                    height: 36px;
                    padding: 0 11px;
                }
                .am-textarea {
                    padding: 9px 11px;
                    line-height: 1.5;
                    resize: vertical;
                    min-height: 84px;
                }
                .am-input::placeholder, .am-textarea::placeholder {
                    color: #94a3b8;
                    font-weight: 400;
                }
                .am-input:focus, .am-select:focus, .am-textarea:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
                }
                .am-footer {
                    padding: 12px 20px;
                    border-top: 1px solid #eef2f6;
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 8px;
                }
                .am-btn-cancel {
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
                .am-btn-cancel:hover:not(:disabled) {
                    background: #f8fafc;
                    color: #17263b;
                }
                .am-btn-submit {
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
                .am-btn-submit:hover:not(:disabled) {
                    background: #0f172a;
                }
                .am-btn-submit.is-danger {
                    background: #dc2626;
                }
                .am-btn-submit.is-danger:hover:not(:disabled) {
                    background: #b91c1c;
                }
                .am-btn-submit:disabled, .am-btn-cancel:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }
            `}</style>

            <form onSubmit={handleSubmit} className="am-sheet-panel" onClick={e => e.stopPropagation()}>
                <header className="am-header">
                    <div>
                        <h3 className="am-title">{title}</h3>
                        <p className="am-subtitle">{description}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="am-close-btn"
                        aria-label="Đóng"
                    >
                        <X size={16} strokeWidth={2} />
                    </button>
                </header>

                <main className="am-body">
                    {targetId && (
                        <div className="am-target-box">
                            <span className="am-target-label">Thực hiện cho</span>
                            <span className="am-target-val">{targetId}</span>
                        </div>
                    )}
                    {inputs.length > 0 && inputs.map((input, idx) => (
                        <div key={input.id} className="am-field">
                            <label htmlFor={input.id} className="am-label">{input.label}</label>
                            {input.type === 'textarea' ? (
                                <textarea
                                    id={input.id}
                                    name={input.id}
                                    value={formData[input.id] || ''}
                                    onChange={handleInputChange}
                                    placeholder={input.placeholder}
                                    rows={4}
                                    autoFocus={idx === 0}
                                    className="am-textarea"
                                />
                            ) : input.type === 'select' ? (
                                <select
                                    id={input.id}
                                    name={input.id}
                                    value={formData[input.id] || ''}
                                    onChange={handleInputChange}
                                    autoFocus={idx === 0}
                                    className="am-select"
                                >
                                    <option value="" disabled>{input.placeholder || 'Chọn một tùy chọn'}</option>
                                    {input.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            ) : (
                                <input
                                    id={input.id}
                                    name={input.id}
                                    type={input.type || 'text'}
                                    value={formData[input.id] || ''}
                                    onChange={handleInputChange}
                                    placeholder={input.placeholder}
                                    maxLength={input.isVIN ? 17 : undefined}
                                    autoFocus={idx === 0}
                                    className={`am-input ${input.isVIN ? 'font-mono uppercase' : ''}`}
                                />
                            )}
                        </div>
                    ))}
                </main>

                <footer className="am-footer">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="am-btn-cancel"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || (inputs.length > 0 && !isFormValid())}
                        className={`am-btn-submit ${isDanger ? 'is-danger' : ''}`}
                    >
                        {isSubmitting ? 'Đang xử lý...' : submitText}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default ActionModal;
