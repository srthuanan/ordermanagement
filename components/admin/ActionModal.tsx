import React, { useState, useEffect } from 'react';
import yesAnimationUrl from '../../pictures/yes.json?url';
import noAnimationUrl from '../../pictures/no-animation.json?url';
import { useModalBackground } from '../../utils/styleUtils';

interface InputConfig {
    id: string;
    label: string;
    placeholder?: string;
    type?: 'text' | 'textarea' | 'select';
    isVIN?: boolean;
    options?: string[];
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
}

const ActionModal: React.FC<ActionModalProps> = ({
    isOpen, onClose, onSubmit, title, description, inputs = [], submitText, submitColor, icon, targetId
}) => {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const bgStyle = useModalBackground();

    useEffect(() => {
        if (isOpen) {
            const initialData = inputs.reduce((acc, input) => {
                acc[input.id] = '';
                return acc;
            }, {} as Record<string, string>);
            setFormData(initialData);
        }
    }, [isOpen, inputs]);

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
            const value = formData[input.id]?.trim();
            if (!value) return false;
            if (input.isVIN && value.length !== 17) return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (inputs.length > 0 && !isFormValid()) {
             // Let's use a toast for better UX
            // This assumes a global toast function is available or passed via props if this was a larger app.
            // For now, an alert will suffice.
            alert('Vui lòng điền đầy đủ và chính xác thông tin.');
            return;
        }
        setIsSubmitting(true);
        const success = await onSubmit(formData);
        // Do not set isSubmitting to false here; the modal will close on success
        if (!success) {
            setIsSubmitting(false);
        }
    };

    const colorMap = {
        primary: {
            bg: 'bg-accent-primary',
            iconBg: 'bg-blue-100',
            iconText: 'text-accent-primary',
        },
        danger: {
            bg: 'bg-danger',
            iconBg: 'bg-danger-bg',
            iconText: 'text-danger',
        },
        success: {
            bg: 'bg-success',
            iconBg: 'bg-success-bg',
            iconText: 'text-success',
        }
    };
    const selectedColor = colorMap[submitColor] || colorMap.primary;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2" onClick={onClose}>
            <div
                className="bg-surface-card w-full max-w-lg rounded-2xl shadow-xl animate-fade-in-scale-up"
                onClick={(e) => e.stopPropagation()}
                style={bgStyle}
            >
                <div className={`h-1.5 rounded-t-2xl ${selectedColor.bg}`}></div>

                <header className="p-3 flex items-start gap-2">
                    <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg ${selectedColor.iconBg}`}>
                        <i className={`fas ${icon} text-2xl ${selectedColor.iconText}`}></i>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold leading-6 text-text-primary">{title}</h3>
                        <p className="text-sm text-text-secondary mt-1">{description}</p>
                    </div>
                </header>

                <main className="px-3 pb-3 space-y-2">
                    {targetId && (
                        <div className="bg-surface-ground border border-border-primary rounded-md p-1.5 text-center">
                            <p className="text-xs text-text-secondary">Thực hiện cho:</p>
                            <p className="text-sm font-semibold text-text-primary font-mono">{targetId}</p>
                        </div>
                    )}
                    {inputs.length > 0 && (
                        <div className="space-y-2">
                            {inputs.map(input => (
                                <div key={input.id}>
                                    <label htmlFor={input.id} className="block text-sm font-medium text-text-secondary mb-1">{input.label}</label>
                                    {input.type === 'textarea' ? (
                                        <textarea
                                            id={input.id}
                                            name={input.id}
                                            value={formData[input.id] || ''}
                                            onChange={handleInputChange}
                                            placeholder={input.placeholder}
                                            rows={3}
                                            className="w-full bg-surface-ground border border-border-primary rounded-lg shadow-inner-sm p-2 focus:ring-accent-primary focus:border-accent-primary transition futuristic-input"
                                        />
                                    ) : input.type === 'select' ? (
                                        <select
                                            id={input.id}
                                            name={input.id}
                                            value={formData[input.id] || ''}
                                            onChange={handleInputChange}
                                            className="w-full bg-surface-ground border border-border-primary rounded-lg shadow-inner-sm p-2 focus:ring-accent-primary focus:border-accent-primary transition futuristic-input"
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
                                            className="w-full bg-surface-ground border border-border-primary rounded-lg shadow-inner-sm p-2 focus:ring-accent-primary focus:border-accent-primary transition futuristic-input"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </main>
                <footer className="px-3 py-2 flex justify-end items-center gap-1.5 bg-surface-ground rounded-b-2xl border-t border-border-primary">
                    <div onClick={!isSubmitting ? onClose : undefined} title="Hủy" className={`cursor-pointer ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 transition-transform'}`}>
                        <lottie-player src={noAnimationUrl} background="transparent" speed="1" style={{ width: '52px', height: '52px' }} loop autoplay />
                    </div>
                    <div
                        onClick={!isSubmitting ? handleSubmit : undefined}
                        title={submitText}
                        className={`cursor-pointer ${(isSubmitting || (inputs.length > 0 && !isFormValid())) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 transition-transform'}`}
                    >
                        <lottie-player src={yesAnimationUrl} background="transparent" speed="1" style={{ width: '52px', height: '52px' }} loop autoplay />
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ActionModal;