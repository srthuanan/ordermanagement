import React, { useState } from 'react';
import moment from 'moment';
import { VcRequest, VcSortConfig, ActionType } from '../../types';
import StatusBadge from '../ui/StatusBadge';

interface ImageSource {
    src: string;
    originalUrl?: string;
    label: string;
}

interface AdminVcRequestTableProps {
    requests: VcRequest[];
    sortConfig: VcSortConfig | null;
    onSort: (key: keyof VcRequest) => void;
    selectedRows: Set<string>;
    onToggleRow: (orderNumber: string) => void;
    onToggleAllRows: () => void;
    onAction: (type: ActionType, request: VcRequest) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onOpenImagePreview: (images: ImageSource[], startIndex: number, customerName: string) => void;
}

const SortableHeader: React.FC<{ colKey: keyof VcRequest, title: string, sortConfig: VcSortConfig | null, onSort: (key: keyof VcRequest) => void }> = ({ colKey, title, sortConfig, onSort }) => {
    const isSorted = sortConfig?.key === colKey;
    const icon = isSorted ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '';
    return <th className="py-3.5 px-3 text-left text-xs font-bold text-text-secondary cursor-pointer hover:bg-surface-hover transition-colors whitespace-nowrap uppercase tracking-wider" onClick={() => onSort(colKey)}>{title} {icon}</th>;
};


const AdminVcRequestTable: React.FC<AdminVcRequestTableProps> = ({ requests, sortConfig, onSort, selectedRows, onToggleRow, onToggleAllRows, onAction, onOpenImagePreview, showToast }) => {
    const isAllSelected = requests.length > 0 && selectedRows.size === requests.length;
    
    const handleImagePreview = (e: React.MouseEvent, images: ImageSource[], startIndex: number, customer: string) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenImagePreview(images, startIndex, customer);
    };

    const handleCopy = (e: React.MouseEvent, text: string, label: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            showToast('Đã sao chép!', `${label} ${text} đã được sao chép.`, 'success', 2000);
        }).catch(() => showToast('Lỗi', `Không thể sao chép ${label}.`, 'error'));
    };

    return (
        <table className="min-w-full divide-y divide-border-primary responsive-table">
            <thead className="bg-surface-hover sticky top-0 z-10">
                <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 w-12 sm:pl-6">
                        <input type="checkbox" className="custom-checkbox" checked={isAllSelected} onChange={onToggleAllRows} />
                    </th>
                    <th scope="col" className="py-3.5 px-3 text-center text-xs font-bold text-text-secondary w-12 uppercase tracking-wider">#</th>
                    <SortableHeader colKey="Tên khách hàng" title="Khách Hàng / SĐH / VIN" sortConfig={sortConfig} onSort={onSort} />
                    <SortableHeader colKey="Người YC" title="Người Yêu Cầu" sortConfig={sortConfig} onSort={onSort} />
                    <SortableHeader colKey="Thời gian YC" title="Thời Gian YC" sortConfig={sortConfig} onSort={onSort} />
                    <th className="py-3.5 px-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Hồ sơ & Ghi chú</th>
                    <SortableHeader colKey="Trạng thái xử lý" title="Trạng Thái" sortConfig={sortConfig} onSort={onSort} />
                    <th scope="col" className="py-3.5 px-3 text-center text-xs font-bold text-text-secondary uppercase tracking-wider">Hành Động</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border-primary bg-surface-card">
                {requests.map((req, index) => {
                    const orderNumber = req['Số đơn hàng'];
                    const status = req['Trạng thái xử lý'] || 'N/A';
                    const dmsCode = req['Mã KH DMS'];
                    let fileUrls: Record<string, string> = {};
                    try {
                        if (req.FileUrls) fileUrls = JSON.parse(req.FileUrls);
                        else if (req['URL hình ảnh']) fileUrls = { unc: req['URL hình ảnh'] };
                    } catch (e) { console.error('Failed to parse FileUrls', e); }

                    const docLabels: Record<string, { label: string, icon: string }> = {
                        idCardFront: { label: 'CCCD Trước', icon: 'fa-id-card' },
                        idCardBack: { label: 'CCCD Sau', icon: 'fa-id-card' },
                        businessLicense: { label: 'GPKD', icon: 'fa-file-alt' },
                        regFront: { label: 'Cavet Trước', icon: 'fa-car' },
                        regBack: { label: 'Cavet Sau', icon: 'fa-car' },
                        unc: { label: 'UNC', icon: 'fa-file-invoice-dollar' },
                    };
                    
                    const docEntries = Object.entries(fileUrls);
                    const allImageSources: ImageSource[] = docEntries.map(([key, url]) => {
                        const doc = docLabels[key] || { label: key, icon: 'fa-file' };
                        return { src: url, originalUrl: url, label: doc.label };
                    });

                    return (
                        <tr key={orderNumber} className="hover:bg-surface-hover transition-colors">
                            <td data-label="checkbox" className="pl-4 w-12 sm:pl-6" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" className="custom-checkbox" checked={selectedRows.has(orderNumber)} onChange={() => onToggleRow(orderNumber)} />
                            </td>
                            <td data-label="#" className="px-3 py-4 text-sm text-center text-text-secondary">{index + 1}</td>
                            
                            <td data-label="Khách hàng / SĐH / VIN" className="px-3 py-4 text-sm">
                                <div className="font-semibold text-text-primary">{req["Tên khách hàng"]}</div>
                                <div 
                                    className="text-text-secondary font-mono text-xs mt-1 cursor-pointer group flex items-center gap-2"
                                    title={`Click để sao chép: ${orderNumber}`}
                                    onClick={(e) => handleCopy(e, orderNumber, 'SĐH')}
                                >
                                    <span>{orderNumber}</span>
                                    <i className="fas fa-copy text-text-placeholder opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                </div>
                                {req.VIN && (
                                    <div 
                                        className="text-accent-primary font-mono text-xs mt-1 cursor-pointer group flex items-center gap-2"
                                        title={`Click để sao chép: ${req.VIN}`}
                                        onClick={(e) => handleCopy(e, req.VIN!, 'VIN')}
                                    >
                                        <span>{req.VIN}</span>
                                        <i className="fas fa-copy text-text-placeholder opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                    </div>
                                )}
                            </td>
                            
                            <td data-label="Người Yêu Cầu" className="px-3 py-4 text-sm text-text-primary">{req["Người YC"]}</td>
                            <td data-label="Thời gian YC" className="px-3 py-4 text-sm text-text-primary">{moment(req["Thời gian YC"]).format('HH:mm DD/MM/YYYY')}</td>
                            <td data-label="Hồ sơ & Ghi chú" className="px-3 py-4 text-sm text-text-secondary">
                                {dmsCode && <div className="text-xs font-mono font-semibold text-text-primary">DMS: {dmsCode}</div>}
                                <div className="flex items-center gap-3 mt-1">
                                    {docEntries.map(([key, url], docIndex) => {
                                        const doc = docLabels[key] || { label: key, icon: 'fa-file' };
                                        return (
                                            <button key={key} onClick={(e) => handleImagePreview(e, allImageSources, docIndex, req['Tên khách hàng'])} title={`Xem ${doc.label}`} className="text-accent-primary hover:underline text-lg">
                                                <i className={`fas ${doc.icon}`}></i>
                                            </button>
                                        )
                                    })}
                                </div>
                                <p className="truncate text-xs mt-1" title={req['Ghi chú']}>{req['Ghi chú'] || '—'}</p>
                            </td>
                            <td data-label="Trạng Thái" className="px-3 py-4 text-sm"><StatusBadge status={status} /></td>
                            
                            <td data-label="Hành Động" className="px-3 py-4 text-center">
                                <AdminActionMenu status={status} onAction={(type) => onAction(type, req)} />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

const AdminActionMenu: React.FC<{ status: string; onAction: (type: ActionType) => void }> = ({ status, onAction }) => {
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

    return (
        <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsOpen(p => !p)} className="w-8 h-8 rounded-full hover:bg-surface-hover flex items-center justify-center"><i className="fas fa-ellipsis-h text-text-secondary"></i></button>
            {isOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-surface-card border border-border-secondary rounded-lg shadow-2xl z-20 p-1 animate-fade-in-scale-up" style={{animationDuration: '150ms'}}>
                    {actions.map((action) => (
                        <button key={action.type} onClick={() => { onAction(action.type as ActionType); setIsOpen(false); }}
                            className={`flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium rounded-md ${action.isDanger ? 'text-danger hover:bg-danger-bg' : 'text-text-primary hover:bg-surface-hover'}`}
                        >
                            <i className={`fas ${action.icon} fa-fw w-5 text-center`}></i>
                            <span>{action.label}</span>
                        </button>
                    ))}
                     {actions.length === 0 && <div className="px-3 py-2 text-sm text-text-secondary text-center">Không có hành động</div>}
                </div>
            )}
        </div>
    );
};

export default AdminVcRequestTable;
