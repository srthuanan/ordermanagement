import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { GlobalNotification } from '../context/GlobalNotificationContext';

interface AnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentNotification: GlobalNotification | null;
    onSave: (notification: GlobalNotification) => Promise<void>;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ isOpen, onClose, currentNotification, onSave }) => {
    const [content, setContent] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [type, setType] = useState<GlobalNotification['type']>('info');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (currentNotification) {
                setContent(currentNotification.content);
                setIsActive(currentNotification.isActive);
                setType(currentNotification.type);
            } else {
                setContent('');
                setIsActive(true);
                setType('info');
            }
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

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!content.trim()) {
            alert('Vui lòng nhập nội dung thông báo.');
            return;
        }
        setIsSubmitting(true);
        try {
            await onSave({ content, isActive, type });
            onClose();
        } catch (error) {
            alert('Có lỗi xảy ra khi lưu thông báo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="ann-sheet"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) { window.dispatchEvent(new CustomEvent('close-all-sheets')); onClose(); }
            }}
        >
            <style>{`
                .ann-sheet {
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
                    .ann-sheet {
                        inset: 0;
                        width: 100vw;
                    }
                }
                .ann-sheet-panel {
                    width: clamp(320px, 28vw, 420px);
                    max-width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #ffffff;
                    color: #17263b;
                    border-right: 1px solid #e2e8f0;
                    box-shadow: 18px 0 42px -14px rgba(20, 34, 54, 0.16);
                    animation: annSlideInLeft 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @keyframes annSlideInLeft {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .ann-header {
                    padding: 22px 20px 14px;
                    border-bottom: 1px solid #e9edf2;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                }
                .ann-title {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 650;
                    line-height: 1.15;
                    letter-spacing: -0.5px;
                    color: #17263b;
                }
                .ann-subtitle {
                    margin: 4px 0 0;
                    font-size: 11.5px;
                    font-weight: 450;
                    color: #7b879a;
                }
                .ann-close-btn {
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
                .ann-close-btn:hover {
                    background: #f1f5f9;
                    color: #0f172a;
                }
                .ann-body {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    padding: 18px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }
                .ann-field {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .ann-label {
                    font-size: 11px;
                    font-weight: 600;
                    color: #475569;
                }
                .ann-textarea, .ann-select {
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
                .ann-textarea {
                    padding: 9px 11px;
                    line-height: 1.5;
                    resize: vertical;
                    min-height: 92px;
                }
                .ann-select {
                    height: 36px;
                    padding: 0 11px;
                }
                .ann-textarea:focus, .ann-select:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
                }
                .ann-toggle-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 12px;
                    border: 1px solid #e9edf2;
                    border-radius: 8px;
                    background: #ffffff;
                }
                .ann-preview-card {
                    padding: 11px 12px;
                    border: 1px solid #e9edf2;
                    border-radius: 8px;
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .ann-preview-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    flex-shrink: 0;
                    background: #2563eb;
                }
                .ann-preview-dot[data-type="warning"] { background: #d97706; }
                .ann-preview-dot[data-type="danger"] { background: #dc2626; }
                .ann-preview-dot[data-type="success"] { background: #16a34a; }
                .ann-preview-dot[data-type="tet"] { background: #e11d48; }
                .ann-preview-text {
                    font-size: 12px;
                    font-weight: 500;
                    color: #17263b;
                    line-height: 1.45;
                    overflow-wrap: anywhere;
                }
                .ann-footer {
                    padding: 12px 20px;
                    border-top: 1px solid #eef2f6;
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 8px;
                }
                .ann-btn-cancel {
                    height: 34px;
                    padding: 0 14px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    background: #ffffff;
                    color: #475569;
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                }
                .ann-btn-cancel:hover:not(:disabled) {
                    background: #f8fafc;
                    color: #17263b;
                }
                .ann-btn-submit {
                    height: 34px;
                    padding: 0 16px;
                    border: 0;
                    border-radius: 8px;
                    background: #17263b;
                    color: #ffffff;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                }
                .ann-btn-submit:hover:not(:disabled) {
                    background: #0f172a;
                }
                .ann-btn-submit:disabled, .ann-btn-cancel:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }
            `}</style>

            <form onSubmit={handleSave} className="ann-sheet-panel" onClick={e => e.stopPropagation()}>
                <header className="ann-header">
                    <div>
                        <h2 className="ann-title">Cài đặt thông báo</h2>
                        <p className="ann-subtitle">Phát thông báo chạy chữ toàn hệ thống</p>
                    </div>
                    <button type="button" onClick={onClose} className="ann-close-btn" aria-label="Đóng">
                        <X size={16} strokeWidth={2} />
                    </button>
                </header>

                <main className="ann-body">
                    <div className="ann-field">
                        <label className="ann-label">Nội dung thông báo</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={3}
                            autoFocus
                            placeholder="Nhập nội dung thông báo toàn hệ thống..."
                            className="ann-textarea"
                        />
                    </div>

                    <div className="ann-field">
                        <label className="ann-label">Phân loại thông báo</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as any)}
                            className="ann-select"
                        >
                            <option value="info">Thông tin chung</option>
                            <option value="warning">Cảnh báo nghiệp vụ</option>
                            <option value="danger">Khẩn cấp / Quan trọng</option>
                            <option value="success">Hoàn tất / Thành công</option>
                            <option value="tet">Sự kiện / Lễ Tết</option>
                        </select>
                    </div>

                    <div className="ann-toggle-row">
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#17263b' }}>Hiển thị thông báo</div>
                            <div style={{ fontSize: 11, color: '#7b879a' }}>{isActive ? 'Đang bật trên toàn hệ thống' : 'Đang tạm ẩn'}</div>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={isActive}
                            onClick={() => setIsActive(v => !v)}
                            className={`sidebar-switch ${isActive ? 'is-on' : ''}`}
                        />
                    </div>

                    <div className="ann-field">
                        <label className="ann-label">Xem trước nội dung</label>
                        <div className="ann-preview-card">
                            <span className="ann-preview-dot" data-type={type} />
                            <span className="ann-preview-text">
                                {content.trim() || 'Nội dung thông báo sẽ hiển thị tại đây...'}
                            </span>
                        </div>
                    </div>
                </main>

                <footer className="ann-footer">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="ann-btn-cancel">
                        Hủy bỏ
                    </button>
                    <button type="submit" disabled={isSubmitting} className="ann-btn-submit">
                        {isSubmitting ? 'Đang lưu...' : 'Lưu cài đặt'}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default AnnouncementModal;
