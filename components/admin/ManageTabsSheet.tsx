import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AdminSubView } from '../../types';

interface ManageTabsSheetProps {
    isOpen: boolean;
    onClose: () => void;
    categories: Record<string, { label: string; icon: string; views: AdminSubView[] }>;
    labels: Record<AdminSubView, string>;
    hiddenTabs: AdminSubView[];
    toggleTabVisibility: (view: AdminSubView) => void;
}

const ManageTabsSheet: React.FC<ManageTabsSheetProps> = ({
    isOpen,
    onClose,
    categories,
    labels,
    hiddenTabs,
    toggleTabVisibility
}) => {
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="mt-sheet"
            onClick={(e) => {
                if (e.target === e.currentTarget) { window.dispatchEvent(new CustomEvent('close-all-sheets')); onClose(); }
            }}
        >
            <style>{`
                .mt-sheet {
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
                    .mt-sheet {
                        inset: 0;
                        width: 100vw;
                    }
                }
                .mt-sheet-panel {
                    width: clamp(320px, 28vw, 420px);
                    max-width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #ffffff;
                    color: #17263b;
                    border-right: 1px solid #e2e8f0;
                    box-shadow: 18px 0 42px -14px rgba(20, 34, 54, 0.16);
                    animation: mtSlideInLeft 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @keyframes mtSlideInLeft {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .mt-header {
                    padding: 22px 20px 14px;
                    border-bottom: 1px solid #e9edf2;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                }
                .mt-title {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 650;
                    line-height: 1.15;
                    letter-spacing: -0.5px;
                    color: #17263b;
                }
                .mt-subtitle {
                    margin: 4px 0 0;
                    font-size: 11.5px;
                    font-weight: 450;
                    color: #7b879a;
                }
                .mt-close-btn {
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
                }
                .mt-close-btn:hover {
                    background: #f1f5f9;
                    color: #0f172a;
                }
                .mt-body {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    padding: 16px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .mt-group-title {
                    margin: 0 0 6px;
                    font-size: 10.5px;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    color: #7b879a;
                }
                .mt-table {
                    border: 1px solid #e9edf2;
                    border-radius: 8px;
                    background: #ffffff;
                    overflow: hidden;
                }
                .mt-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 10px 12px;
                    border-bottom: 1px solid #eef2f6;
                    cursor: pointer;
                    transition: background-color 140ms ease;
                }
                .mt-row:last-child {
                    border-bottom: 0;
                }
                .mt-row:hover {
                    background: #f8fafc;
                }
                .mt-row-label {
                    font-size: 12.5px;
                    font-weight: 500;
                    color: #17263b;
                }
                .mt-row-label.is-off {
                    color: #94a3b8;
                }
                .mt-footer {
                    padding: 12px 20px;
                    border-top: 1px solid #eef2f6;
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                }
                .mt-btn-done {
                    height: 34px;
                    padding: 0 18px;
                    border: 0;
                    border-radius: 8px;
                    background: #17263b;
                    color: #ffffff;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                }
                .mt-btn-done:hover {
                    background: #0f172a;
                }
            `}</style>
            <div className="mt-sheet-panel" onClick={e => e.stopPropagation()}>
                <header className="mt-header">
                    <div>
                        <h3 className="mt-title">Cài đặt hiển thị Tab</h3>
                        <p className="mt-subtitle">Bật hoặc ẩn các phân hệ quản trị trên thanh điều hướng</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-close-btn"
                        aria-label="Đóng"
                    >
                        <X size={16} strokeWidth={2} />
                    </button>
                </header>

                <main className="mt-body">
                    {Object.entries(categories).map(([catKey, cat]) => (
                        <section key={catKey}>
                            <div className="mt-group-title">{cat.label}</div>
                            <div className="mt-table">
                                {cat.views.map(view => {
                                    const isVisible = !hiddenTabs.includes(view);
                                    return (
                                        <div
                                            key={view}
                                            onClick={() => toggleTabVisibility(view)}
                                            className="mt-row"
                                        >
                                            <span className={`mt-row-label ${!isVisible ? 'is-off' : ''}`}>
                                                {labels[view]}
                                            </span>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={isVisible}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleTabVisibility(view);
                                                }}
                                                className={`sidebar-switch ${isVisible ? 'is-on' : ''}`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </main>

                <footer className="mt-footer">
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-btn-done"
                    >
                        Hoàn tất
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ManageTabsSheet;

