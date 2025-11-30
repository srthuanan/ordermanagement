import React, { useState, useRef, useEffect } from 'react';
import { AdminSubView, ActionType } from '../../types';

interface BulkActionBarProps {
    view: AdminSubView;
    selectedRows: Set<string>;
    setSelectedRows: (rows: Set<string>) => void;
    setBulkActionModal: (modal: { type: ActionType } | null) => void;
}

const bulkActionsForView: Record<AdminSubView, { type: ActionType; label: string; icon: string; isDanger?: boolean }[]> = {
    dashboard: [],
    invoices: [
        { type: 'approve', label: 'Phê duyệt', icon: 'fa-check-double' },
        { type: 'supplement', label: 'Y/C Bổ sung', icon: 'fa-exclamation-triangle' },
        { type: 'pendingSignature', label: 'Chuyển sang "Chờ ký HĐ"', icon: 'fa-signature' },
        { type: 'cancel', label: 'Hủy Yêu cầu', icon: 'fa-trash-alt', isDanger: true },
    ],
    pending: [
        { type: 'cancel', label: 'Hủy Yêu cầu (Xóa)', icon: 'fa-trash-alt', isDanger: true },
    ],
    paired: [],
    vc: [],
    phongkd: [],
};

const BulkActionBar: React.FC<BulkActionBarProps> = ({ view, selectedRows, setSelectedRows, setBulkActionModal }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const actions = bulkActionsForView[view];
    if (actions.length === 0) return null;

    return (
        <div className="relative z-10 p-1.5 border-b border-border-primary flex items-center justify-between bg-surface-accent animate-fade-in-down">
            <span className="text-sm font-semibold text-text-primary">
                Đã chọn: <span className="font-bold text-accent-primary">{selectedRows.size}</span>
            </span>
            <div className="flex items-center gap-1">
                <button onClick={() => setSelectedRows(new Set())} className="btn-secondary !text-xs !py-0.5 !px-2">
                    <i className="fas fa-times mr-1"></i> Bỏ chọn
                </button>
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setIsMenuOpen(p => !p)} className="btn-primary !text-xs !py-0.5 !px-2.5 flex items-center">
                        Thao tác hàng loạt <i className={`fas fa-chevron-down ml-2 text-xs transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}></i>
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-1 w-52 bg-surface-card border rounded-lg shadow-lg z-20 p-0.5">
                            {actions.map(action => (
                                <button
                                    key={action.type}
                                    onClick={() => { setBulkActionModal({ type: action.type as ActionType }); setIsMenuOpen(false); }}
                                    className={`flex items-center gap-2 w-full text-left px-2 py-1.5 text-sm font-medium rounded-md ${action.isDanger ? 'text-danger hover:bg-danger-bg' : 'text-text-primary hover:bg-surface-hover'}`}
                                >
                                    <i className={`fas ${action.icon} fa-fw w-5 text-center`}></i>
                                    <span>{action.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkActionBar;
