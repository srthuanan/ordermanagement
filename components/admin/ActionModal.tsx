import React, { useState, useEffect } from 'react';

interface InputConfig {
    id: string;
    label: string;
    placeholder: string;
    type?: 'text' | 'textarea';
    isVIN?: boolean;
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
            hover: 'hover:bg-accent-primary-hover',
            iconBg: 'bg-blue-100',
            iconText: 'text-accent-primary',
        },
        danger: {
            bg: 'bg-danger',
            hover: 'hover:bg-danger-hover',
            iconBg: 'bg-danger-bg',
            iconText: 'text-danger',
        },
        success: {
            bg: 'bg-success',
            hover: 'hover:bg-emerald-700',
            iconBg: 'bg-success-bg',
            iconText: 'text-success',
        }
    };
    const selectedColor = colorMap[submitColor] || colorMap.primary;
    const submitButtonClass = `btn-${submitColor === 'primary' ? 'primary' : submitColor}`;


    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-surface-card w-full max-w-md rounded-2xl shadow-xl animate-fade-in-scale-up"
                onClick={(e) => e.stopPropagation()}
            >
                <main className="p-6 text-center">
                    <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${selectedColor.iconBg}`}>
                         <i className={`fas ${icon} text-2xl ${selectedColor.iconText}`}></i>
                    </div>
                    <h3 className="mt-4 text-lg font-bold leading-6 text-text-primary">{title}</h3>
                    <div className="mt-2">
                        <p className="text-sm text-text-secondary">{description}</p>
                        {targetId && <p className="text-sm font-semibold text-text-primary mt-1 font-mono">{targetId}</p>}
                    </div>

                    {inputs.length > 0 && (
                        <div className="mt-4 space-y-3 text-left">
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
                                    ) : (
                                        <input
                                            id={input.id}
                                            name={input.id}
                                            type="text"
                                            value={formData[input.id] || ''}
                                            onChange={handleInputChange}
                                            placeholder={input.placeholder}
                                            maxLength={input.isVIN ? 17 : undefined}
                                            className="w-full bg-surface-ground border border-border-primary rounded-lg shadow-inner-sm p-2.5 focus:ring-accent-primary focus:border-accent-primary transition futuristic-input font-mono"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </main>
                <footer className="px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-center sm:gap-4 bg-surface-ground rounded-b-2xl">
                    <button onClick={onClose} disabled={isSubmitting} className="btn-secondary w-full sm:w-auto">Hủy</button>
                    <button onClick={handleSubmit} disabled={isSubmitting || (inputs.length > 0 && !isFormValid())} className={`${submitButtonClass} w-full sm:w-auto`}>
                        {/* FIX: Replaced undefined variable 'submitIcon' with the 'icon' prop. */}
                        {isSubmitting ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className={`fas ${icon} mr-2`}></i>}
                        {isSubmitting ? 'Đang xử lý...' : submitText}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ActionModal;