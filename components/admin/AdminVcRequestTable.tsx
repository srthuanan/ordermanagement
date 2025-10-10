import React, { useState } from 'react';
import moment from 'moment';
import { API_URL } from '../../constants';
import { VcRequest, SortConfig, ActionType } from '../../types';
import StatusBadge from '../ui/StatusBadge';

interface AdminVcRequestTableProps {
    requests: VcRequest[];
    sortConfig: SortConfig | null;
    onSort: (key: keyof VcRequest) => void;
    selectedRows: Set<string>;
    onToggleRow: (orderNumber: string) => void;
    onToggleAllRows: () => void;
    onAction: (type: ActionType, request: VcRequest) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onOpenImagePreview: (imageUrl: string, originalUrl: string, fileLabel: string, customerName: string) => void;
}

const SortableHeader: React.FC<{ colKey: keyof VcRequest, title: string, sortConfig: SortConfig | null, onSort: (key: keyof VcRequest) => void }> = ({ colKey, title, sortConfig, onSort }) => {
    const isSorted = sortConfig?.key === colKey;
    const icon = isSorted ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '';
    return <th className="py-3.5 px-3 text-left text-xs font-bold text-text-secondary cursor-pointer hover:bg-surface-hover transition-colors whitespace-nowrap uppercase tracking-wider" onClick={() => onSort(colKey)}>{title} {icon}</th>;
};

const CopyableField: React.FC<{ text: string; showToast: Function; className?: string; label?: string; wrap?: boolean }> = ({ text, showToast, className, label, wrap = false }) => {
    if (!text || text === 'N/A') {
        return <div className={className}>{label ? `${label}: ` : ''}N/A</div>;
    }
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => showToast('Đã sao chép!', `${text} đã được sao chép.`, 'success', 2000)).catch(() => showToast('Lỗi', 'Không thể sao chép.', 'error'));
    };
    const textClasses = wrap ? 'cursor-pointer break-words' : 'truncate cursor-pointer';
    return (
        <div className={`group relative flex items-start justify-between ${className}`} title={`Click để sao chép: ${text}`}>
            <span className={textClasses} onClick={(e) => handleCopy(e)}>{label ? `${label}: ` : ''}{text}</span>
            <button onClick={handleCopy} className="ml-2 text-text-secondary/50 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 shrink-0"><i className="fas fa-copy text-xs"></i></button>
        </div>
    );
};


const AdminVcRequestTable: React.FC<AdminVcRequestTableProps> = ({ requests, sortConfig, onSort, selectedRows, onToggleRow, onToggleAllRows, onAction, showToast, onOpenImagePreview }) => {
    const isAllSelected = requests.length > 0 && selectedRows.size === requests.length;

    const headers = [
        { key: 'Người YC', title: 'Người YC / Khách Hàng', sortable: true },
        { key: 'Số đơn hàng', title: 'SĐH / VIN', sortable: true },
        { key: 'Thời gian YC', title: 'Thời Gian YC', sortable: true },
        { key: 'Hồ sơ', title: 'Hồ Sơ', sortable: false },
        { key: 'Trạng thái xử lý', title: 'Trạng Thái', sortable: true },
    ];

    const getFileIdFromUrl = (url: string) => {
        if (!url || typeof url !== 'string') return null;
        const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]{25,})|id=([a-zA-Z0-9_-]{25,})/);
        return fileIdMatch ? (fileIdMatch[1] || fileIdMatch[2]) : null;
    }

    return (
        <table className="min-w-full divide-y divide-border-primary">
            <thead className="bg-surface-hover sticky top-0 z-10">
                <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 w-12 sm:pl-6">
                        <input type="checkbox" className="custom-checkbox" checked={isAllSelected} onChange={onToggleAllRows} />
                    </th>
                    <th scope="col" className="py-3.5 px-3 text-center text-xs font-bold text-text-secondary w-12 uppercase tracking-wider">#</th>
                    {headers.map(h => h.sortable ? <SortableHeader key={h.key} colKey={h.key as keyof VcRequest} title={h.title} sortConfig={sortConfig} onSort={onSort} /> : <th key={h.key} className="py-3.5 px-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">{h.title}</th>)}
                    <th scope="col" className="py-3.5 px-3 text-center text-xs font-bold text-text-secondary uppercase tracking-wider">Hành Động</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border-primary bg-surface-card">
                {requests.map((req, index) => {
                    const orderNumber = req['Số đơn hàng'];
                    const status = req['Trạng thái xử lý'] || 'N/A';
                    
                    const documents = [
                        { key: 'Link CCCD Mặt Trước', label: 'CCCD Trước', icon: 'fa-id-card' },
                        { key: 'Link CCCD Mặt Sau', label: 'CCCD Sau', icon: 'fa-address-card' },
                        { key: 'Link Cavet Xe Mặt Trước', label: 'Cavet Trước', icon: 'fa-car-side' },
                        { key: 'Link Cavet Xe Mặt Sau', label: 'Cavet Sau', icon: 'fa-car-alt' },
                        { key: 'Link GPKD', label: 'GPKD', icon: 'fa-building' }
                    ];

                    const filesHtml = (
                        <div className="flex items-center gap-3">
                            {documents.map(doc => {
                                const url = req[doc.key];
                                const fileId = getFileIdFromUrl(url);
                                const imageUrl = fileId ? `${API_URL}?action=serveImage&fileId=${fileId}` : '';

                                return (
                                    <button 
                                        key={doc.key} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (imageUrl && url) onOpenImagePreview(imageUrl, url, doc.label, req['Tên khách hàng'])
                                        }}
                                        disabled={!fileId}
                                        className={`transition-opacity ${fileId ? 'hover:opacity-70 cursor-pointer' : 'cursor-not-allowed opacity-20'}`} 
                                        title={doc.label + (fileId ? '' : ' (chưa có)')}
                                    >
                                        <i className={`fas ${doc.icon} fa-fw text-lg w-6 text-center text-text-secondary`}></i>
                                    </button>
                                )
                            })}
                        </div>
                    );

                    return (
                        <tr key={orderNumber} className="hover:bg-surface-hover transition-colors">
                            <td className="pl-4 w-12 sm:pl-6" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" className="custom-checkbox" checked={selectedRows.has(orderNumber)} onChange={() => onToggleRow(orderNumber)} />
                            </td>
                            <td className="px-3 py-4 text-sm text-center text-text-secondary">{index + 1}</td>
                            
                            <td className="px-3 py-4 text-sm max-w-xs">
                                <div className="font-semibold text-text-primary">{req["Người YC"]}</div>
                                <div className="text-text-secondary text-xs mt-1">KH: {req["Tên khách hàng"]} ({req['Loại KH']})</div>
                            </td>

                            <td className="px-3 py-4 text-sm max-w-xs">
                                <CopyableField text={orderNumber} showToast={showToast} className="font-semibold text-text-primary" />
                                <CopyableField text={req.VIN || ''} showToast={showToast} className="text-text-secondary font-mono text-xs mt-1" label="VIN" />
                            </td>
                            
                            <td className="px-3 py-4 text-sm">
                                <div className="text-text-primary" title={req["Thời gian YC"] ? moment(req["Thời gian YC"]).format('HH:mm DD/MM/YYYY') : 'N/A'}>
                                    {req["Thời gian YC"] ? moment(req["Thời gian YC"]).format('DD/MM/YYYY') : 'N/A'}
                                </div>
                            </td>
                            
                            <td className="px-3 py-4 text-sm">{filesHtml}</td>
                            <td className="px-3 py-4 text-sm"><StatusBadge status={status} /></td>
                            
                            <td className="px-3 py-4 text-center">
                                <AdminVcActionMenu status={status} onAction={(type) => onAction(type, req)} />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

const AdminVcActionMenu: React.FC<{ status: string; onAction: (type: ActionType) => void }> = ({ status, onAction }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const s = status.toLowerCase();
    
    const actions = [
        { type: 'approveVc', label: 'Phê Duyệt', icon: 'fa-check-circle', condition: s === 'chờ duyệt ycvc' },
        { type: 'rejectVc', label: 'Từ Chối', icon: 'fa-ban', isDanger: true, condition: s === 'chờ duyệt ycvc' },
    ].filter(a => a.condition);

    if (actions.length === 0) {
        return <span className="text-xs text-text-secondary">—</span>;
    }

    return (
        <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsOpen(p => !p)} className="w-8 h-8 rounded-full hover:bg-surface-hover flex items-center justify-center"><i className="fas fa-ellipsis-h text-text-secondary"></i></button>
            {isOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-surface-card border border-border-secondary rounded-lg shadow-2xl z-20 p-1 animate-fade-in-scale-up" style={{animationDuration: '150ms'}}>
                    {actions.map((action) => (
                        <button key={action.type} onClick={() => { onAction(action.type as ActionType); setIsOpen(false); }}
                            className={`flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium rounded-md ${action.isDanger ? 'text-danger hover:bg-danger-bg' : 'text-text-primary hover:bg-surface-hover'}`}
                        >
                            <i className={`fas ${action.icon} fa-fw w-5 text-center`}></i>
                            <span>{action.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminVcRequestTable;
