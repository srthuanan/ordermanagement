import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import AnchoredCyberSheet from '../ui/AnchoredCyberSheet';

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
    icon?: string;
    targetId?: string;
    showToast?: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    anchor?: HTMLElement | null;
}

const ActionModal: React.FC<ActionModalProps> = ({
    isOpen, onClose, onSubmit, title, description, inputs = [], submitText, submitColor, icon = '', targetId, showToast, anchor
}) => {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(prev => {
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
        <AnchoredCyberSheet
            anchor={anchor}
            className="is-action-sheet"
            label={title}
            onClose={() => { if (!isSubmitting) onClose(); }}
        >
            <form onSubmit={handleSubmit} className="am-anchored-panel" onClick={e => e.stopPropagation()}>
                <header className="am-header">
                    <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                            {icon && (
                                <i className={`fas ${icon} text-xs ${isDanger ? 'text-rose-500' : 'text-slate-500'}`}></i>
                            )}
                            <h3 className={`am-title truncate ${isDanger ? 'text-rose-600' : 'text-slate-900'}`}>{title}</h3>
                        </div>
                        {description && <p className="am-subtitle line-clamp-2">{description}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }}
                        disabled={isSubmitting}
                        className="am-close-btn"
                        aria-label="Đóng"
                        title="Đóng (Esc)"
                    >
                        <X size={15} strokeWidth={2} />
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
                                    rows={3}
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
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }}
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
                        {isSubmitting ? (
                            <>
                                <i className="fas fa-spinner fa-spin text-[10px]"></i>
                                <span>Đang xử lý...</span>
                            </>
                        ) : submitText}
                    </button>
                </footer>
            </form>
        </AnchoredCyberSheet>
    );
};

export default ActionModal;
