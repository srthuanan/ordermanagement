import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { Order, SortConfig, StockVehicle, ActionType } from '../../types';
import StatusBadge from '../ui/StatusBadge';

interface AdminInvoiceTableProps {
    orders: Order[];
    viewType: 'invoices' | 'pending' | 'paired';
    sortConfig: SortConfig | null;
    onSort: (key: keyof Order) => void;
    selectedRows: Set<string>;
    onToggleRow: (orderNumber: string) => void;
    onToggleAllRows: () => void;
    onAction: (type: ActionType, order: Order) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    suggestions?: Map<string, StockVehicle[]>;
    onShowSuggestions?: (order: Order, cars: StockVehicle[]) => void;
    onOpenFilePreview: (url: string, label: string) => void;
    // New prop for inline editing
    onUpdateInvoiceDetails?: (orderNumber: string, data: { engineNumber: string; policy: string; po: string }) => Promise<boolean>;
}

const SortableHeader: React.FC<{ colKey: keyof Order, title: string, sortConfig: SortConfig | null, onSort: (key: keyof Order) => void }> = ({ colKey, title, sortConfig, onSort }) => {
    const isSorted = sortConfig?.key === colKey;
    const icon = isSorted ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '';
    return <th className="py-2 px-1.5 text-left text-xs font-bold text-text-secondary cursor-pointer hover:bg-surface-hover transition-colors whitespace-nowrap uppercase tracking-wider" onClick={() => onSort(colKey)}>{title} {icon}</th>;
};

const CopyableField: React.FC<{ text: string; showToast: Function; className?: string; label?: string; wrap?: boolean }> = ({ text, showToast, className, label, wrap = false }) => {
    if (!text || text === 'N/A') {
        return <div className={className}>{label ? `${label}: ` : ''}N/A</div>;
    }

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            showToast('Đã sao chép!', `${text} đã được sao chép.`, 'success', 2000);
        }).catch(() => showToast('Lỗi', 'Không thể sao chép.', 'error'));
    };
    
    return (
        <div className={`cursor-pointer ${className}`} title={`Click để sao chép: ${text}`} onClick={handleCopy}>
            <span>{label ? `${label}: ` : ''}</span>
            <span className={wrap ? 'break-words' : 'truncate'}>{text}</span>
        </div>
    );
};

const AdminActionMenu: React.FC<{ status: string; viewType: 'invoices' | 'pending' | 'paired', onAction: (type: ActionType) => void, onToggle: (isOpen: boolean) => void }> = ({ status, viewType, onAction, onToggle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    const setOpenState = (newIsOpen: boolean) => {
        setIsOpen(newIsOpen);
        onToggle(newIsOpen);
    };

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenState(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onToggle]);

    const s = status.toLowerCase();
    
    const actions = (
        viewType === 'invoices'
            ? [
                  { type: 'approve', label: 'Phê Duyệt', icon: 'fa-check-double', condition: s === 'chờ phê duyệt' || s === 'đã bổ sung' },
                  { type: 'supplement', label: 'Y/C Bổ Sung', icon: 'fa-exclamation-triangle', condition: s === 'chờ phê duyệt' || s === 'đã bổ sung' },
                  { type: 'pendingSignature', label: 'Chờ Ký HĐ', icon: 'fa-signature', condition: s === 'đã phê duyệt' },
                  { type: 'uploadInvoice', label: 'Tải Lên HĐ', icon: 'fa-upload', condition: s === 'chờ ký hóa đơn' },
                  { type: 'resend', label: 'Gửi lại Email', icon: 'fa-paper-plane', condition: s === 'yêu cầu bổ sung' || s === 'đã xuất hóa đơn' },
                  { type: 'cancel', label: 'Hủy Yêu Cầu', icon: 'fa-trash-alt', isDanger: true, condition: s !== 'đã xuất hóa đơn' && s !== 'đã hủy' },
              ]
            : viewType === 'pending'
            ? [
                  { type: 'manualMatch', label: 'Ghép Thủ Công', icon: 'fa-link', condition: true },
                  { type: 'cancel', label: 'Hủy Yêu Cầu', icon: 'fa-trash-alt', isDanger: true, condition: true },
              ]
            : viewType === 'paired'
            ? [
                  { type: 'requestInvoice', label: 'Y/C Xuất Hóa Đơn', icon: 'fa-file-invoice-dollar', condition: true },
                  { type: 'unmatch', label: 'Hủy Ghép Xe', icon: 'fa-unlink', isDanger: true, condition: true },
              ]
            : []
    ).filter(a => a.condition);

    const handleActionClick = (action: typeof actions[0]) => {
        onAction(action.type as ActionType);
        setOpenState(false);
    };


    return (
        <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
            <button onClick={(e) => { e.stopPropagation(); setOpenState(!isOpen) }} className="w-8 h-8 rounded-full hover:bg-surface-hover flex items-center justify-center"><i className="fas fa-ellipsis-h text-text-secondary"></i></button>
            
            {isOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-surface-card border border-border-secondary rounded-lg shadow-2xl z-20 p-0.5 animate-fade-in-scale-up" style={{animationDuration: '150ms'}}>
                    {actions.map((action) => (
                        <button key={action.type} onClick={() => handleActionClick(action)}
                            className={`flex items-center gap-3 w-full text-left px-2 py-1.5 text-sm font-medium rounded-md ${action.isDanger ? 'text-danger hover:bg-danger-bg' : 'text-text-primary hover:bg-surface-hover'}`}
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

const AdminInvoiceTableRow: React.FC<{
    order: Order;
    index: number;
    viewType: 'invoices' | 'pending' | 'paired';
    selectedRows: Set<string>;
    onToggleRow: (orderNumber: string) => void;
    onAction: (type: ActionType, order: Order) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    suggestions?: Map<string, StockVehicle[]>;
    onShowSuggestions?: (order: Order, cars: StockVehicle[]) => void;
    onOpenFilePreview: (url: string, label: string) => void;
    onUpdateInvoiceDetails?: (orderNumber: string, data: { engineNumber: string; policy: string; po: string }) => Promise<boolean>;
}> = ({ order, index, viewType, selectedRows, onToggleRow, onAction, showToast, suggestions, onShowSuggestions, onOpenFilePreview, onUpdateInvoiceDetails }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editData, setEditData] = useState({
        engineNumber: order["Số động cơ"] || '',
        policy: order["CHÍNH SÁCH"] || '',
        po: order["PO PIN"] || ''
    });

    const orderNumber = order['Số đơn hàng'];
    const status = (order as any)['Trạng thái xử lý'] || order['Kết quả'] || 'N/A';
    const matchingCars = suggestions?.get(orderNumber);

    // Sync edit data when order prop changes (if not editing)
    useEffect(() => {
        if (!isEditing) {
            setEditData({
                engineNumber: order["Số động cơ"] || '',
                policy: order["CHÍNH SÁCH"] || '',
                po: order["PO PIN"] || ''
            });
        }
    }, [order, isEditing]);

    const handleActionInternal = (type: ActionType) => {
        if (type === 'edit' && viewType === 'invoices') {
            setIsEditing(true);
        } else {
            onAction(type, order);
        }
    };

    const handleSaveEdit = async () => {
        if (!onUpdateInvoiceDetails) return;
        setIsSaving(true);
        const success = await onUpdateInvoiceDetails(orderNumber, editData);
        setIsSaving(false);
        if (success) {
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditData({
            engineNumber: order["Số động cơ"] || '',
            policy: order["CHÍNH SÁCH"] || '',
            po: order["PO PIN"] || ''
        });
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (viewType === 'invoices' && !isEditing) {
            e.preventDefault(); // Prevent text selection
            const s = status.toLowerCase();
            // Prevent editing if status is finalized or cancelled (matching menu logic)
            if (s !== 'đã xuất hóa đơn' && s !== 'đã hủy') {
                setIsEditing(true);
            } else {
                showToast('Không thể sửa', 'Đơn hàng đã hoàn tất hoặc đã hủy không thể chỉnh sửa.', 'warning');
            }
        }
    };

    return (
        <tr 
            className={`hover:bg-surface-hover transition-colors ${isMenuOpen || isEditing ? 'relative z-20 bg-surface-accent/30' : ''}`}
            onDoubleClick={handleDoubleClick}
        >
            <td data-label="checkbox" className="pl-2 w-12 sm:pl-3" onClick={e => e.stopPropagation()}>
                <input type="checkbox" className="custom-checkbox" checked={selectedRows.has(orderNumber)} onChange={() => onToggleRow(orderNumber)} disabled={isEditing} />
            </td>
            <td data-label="#" className="px-1.5 py-2 text-sm text-center text-text-secondary">{index + 1}</td>
            
            {/* Customer/Order Info - Not Editable Inline */}
            <td data-label="Khách Hàng / SĐH" className="px-1.5 py-2 text-sm">
                <CopyableField text={order["Tên khách hàng"]} showToast={showToast} className="font-semibold text-text-primary" wrap={true} />
                <CopyableField text={orderNumber} showToast={showToast} className="text-text-secondary font-mono text-xs" />
                <div className="text-text-secondary text-xs mt-1">TVBH: {order["Tên tư vấn bán hàng"] || 'N/A'}</div>
            </td>
            
            {/* Dynamic Columns */}
            {viewType === 'invoices' && (
                <>
                    <td data-label="Thông Tin Xe" className="px-1.5 py-2 text-sm">
                        <div className="font-medium text-text-primary">{order["Dòng xe"]} - {order["Phiên bản"]}</div>
                        <div className="text-text-secondary text-xs mt-1">{order["Ngoại thất"]} / {order["Nội thất"]}</div>
                        <CopyableField text={order.VIN || ''} showToast={showToast} className="font-bold text-accent-primary text-sm font-mono mt-1 hover:text-accent-primary-hover hover:underline" label="VIN" />
                        
                        {/* Engine Number Editing */}
                        {isEditing ? (
                             <div className="mt-1" onClick={e => e.stopPropagation()}>
                                <input 
                                    type="text" 
                                    value={editData.engineNumber}
                                    onChange={e => setEditData({...editData, engineNumber: e.target.value})}
                                    className="w-full text-xs font-mono border border-accent-primary rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-accent-primary bg-white"
                                    placeholder="Số máy..."
                                />
                            </div>
                        ) : (
                            <CopyableField text={order["Số động cơ"] || ''} showToast={showToast} className="text-text-secondary text-xs font-mono mt-1" label="S.MÁY" />
                        )}
                    </td>
                    <td data-label="Ngày YC / XHĐ" className="px-1.5 py-2 text-sm">
                        <div className="text-text-primary" title={`Yêu cầu: ${order["Thời gian nhập"] ? moment(order["Thời gian nhập"]).format('HH:mm DD/MM/YYYY') : 'N/A'}`}>
                            {order["Thời gian nhập"] ? moment(order["Thời gian nhập"]).format('DD/MM/YYYY') : 'N/A'}
                        </div>
                        <div className="text-text-secondary text-xs mt-1" title={order["Ngày xuất hóa đơn"] ? `Xuất hóa đơn: ${moment(order["Ngày xuất hóa đơn"]).format('HH:mm DD/MM/YYYY')}` : 'Chưa xuất hóa đơn'}>
                            {order["Ngày xuất hóa đơn"] ? moment(order["Ngày xuất hóa đơn"]).format('DD/MM/YYYY') : 'Chưa XHĐ'}
                        </div>
                    </td>
                    <td data-label="Chính Sách / PO" className="px-1.5 py-2 text-sm min-w-[150px]">
                         {/* Policy & PO Editing */}
                         {isEditing ? (
                             <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
                                <textarea 
                                    value={editData.policy}
                                    onChange={e => setEditData({...editData, policy: e.target.value})}
                                    className="w-full text-xs border border-accent-primary rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-accent-primary bg-white resize-y min-h-[40px]"
                                    placeholder="Chính sách..."
                                    rows={2}
                                />
                                <input 
                                    type="text" 
                                    value={editData.po}
                                    onChange={e => setEditData({...editData, po: e.target.value})}
                                    className="w-full text-xs font-mono border border-accent-primary rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-accent-primary bg-white"
                                    placeholder="PO PIN..."
                                />
                            </div>
                        ) : (
                            <>
                                <div className="text-xs font-medium text-text-primary line-clamp-3" title={order["CHÍNH SÁCH"]}>{order["CHÍNH SÁCH"] || 'N/A'}</div>
                                <CopyableField text={order["PO PIN"] || ''} showToast={showToast} className="text-text-secondary text-xs font-mono mt-1" label="PO" />
                            </>
                        )}
                    </td>
                    <td data-label="Hồ Sơ" className="px-1.5 py-2 text-sm">
                        <div className="flex items-center gap-1.5">
                            {[ { key: 'LinkHopDong', label: 'Hợp đồng', icon: 'fa-file-contract' }, { key: 'LinkDeNghiXHD', label: 'Đề nghị', icon: 'fa-file-invoice' }, { key: 'LinkHoaDonDaXuat', label: 'Hóa Đơn', icon: 'fa-file-invoice-dollar' }].map(file => {
                                const url = order[file.key] as string | undefined;
                                return (
                                    <button 
                                        key={file.key} 
                                        onClick={(e) => { 
                                            if (!url) return; 
                                            e.preventDefault(); 
                                            e.stopPropagation(); 
                                            onOpenFilePreview(url, `${file.label} - ${order["Tên khách hàng"]}`);
                                        }} 
                                        className={`transition-opacity ${url ? 'hover:opacity-70 cursor-pointer' : 'cursor-not-allowed'}`} 
                                        title={file.label + (url ? '' : ' (chưa có)')}
                                        disabled={!url}
                                    >
                                        <i className={`fas ${file.icon} fa-fw text-lg w-5 text-center ${url ? 'text-text-secondary' : 'text-text-placeholder/50'}`}></i>
                                    </button>
                                );
                            })}
                        </div>
                    </td>
                </>
            )}
             {viewType === 'pending' && (
                <>
                    <td data-label="Yêu Cầu Xe" className="px-1.5 py-2 text-sm">
                        <div className="font-medium text-text-primary">{order["Dòng xe"]} - {order["Phiên bản"]}</div>
                        <div className="text-text-secondary text-xs">{order["Ngoại thất"]} / {order["Nội thất"]}</div>
                    </td>
                    <td data-label="Ngày Cọc / Yêu Cầu" className="px-1.5 py-2 text-sm">
                        <div className="text-text-primary" title={`Cọc: ${order["Ngày cọc"] ? moment(order["Ngày cọc"]).format('HH:mm DD/MM/YYYY') : 'N/A'}`}>
                            {order["Ngày cọc"] ? moment(order["Ngày cọc"]).format('DD/MM/YYYY') : 'N/A'}
                        </div>
                        <div className="text-text-secondary text-xs mt-1" title={`Yêu cầu: ${order["Thời gian nhập"] ? moment(order["Thời gian nhập"]).format('HH:mm DD/MM/YYYY') : 'N/A'}`}>
                            {order["Thời gian nhập"] ? moment(order["Thời gian nhập"]).format('DD/MM/YYYY') : 'Chưa có'}
                        </div>
                    </td>
                </>
            )}
             {viewType === 'paired' && (
                <>
                    <td data-label="Thông Tin Xe" className="px-1.5 py-2 text-sm">
                        <div className="font-medium text-text-primary">{order["Dòng xe"]} - {order["Phiên bản"]}</div>
                        <div className="text-text-secondary text-xs mt-1">{order["Ngoại thất"]} / {order["Nội thất"]}</div>
                        <CopyableField text={order.VIN || ''} showToast={showToast} className="font-bold text-accent-primary text-sm font-mono mt-1 hover:text-accent-primary-hover hover:underline" label="VIN" />
                    </td>
                    <td data-label="Ngày Cọc / Ghép" className="px-1.5 py-2 text-sm">
                        <div className="text-text-primary" title={`Cọc: ${order["Ngày cọc"] ? moment(order["Ngày cọc"]).format('HH:mm DD/MM/YYYY') : 'N/A'}`}>
                            {order["Ngày cọc"] ? moment(order["Ngày cọc"]).format('DD/MM/YYYY') : 'N/A'}
                        </div>
                        <div className="text-text-secondary text-xs mt-1" title={order["Thời gian ghép"] ? `Ghép: ${moment(order["Thời gian ghép"]).format('HH:mm DD/MM/YYYY')}` : 'Chưa ghép'}>
                            {order["Thời gian ghép"] ? moment(order["Thời gian ghép"]).format('DD/MM/YYYY') : 'Chưa ghép'}
                        </div>
                    </td>
                </>
            )}

            {/* Status */}
            <td data-label="Trạng Thái" className="px-1.5 py-2 text-sm"><StatusBadge status={status} /></td>
            
            {/* Actions */}
            <td data-label="Hành Động" className="px-1.5 py-2 text-center">
                <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                    {isEditing ? (
                        <div className="flex gap-1">
                            <button 
                                onClick={handleSaveEdit} 
                                disabled={isSaving}
                                className="w-8 h-8 rounded-full bg-success/10 text-success hover:bg-success hover:text-white flex items-center justify-center transition-colors"
                                title="Lưu"
                            >
                                {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                            </button>
                            <button 
                                onClick={handleCancelEdit}
                                disabled={isSaving} 
                                className="w-8 h-8 rounded-full bg-danger/10 text-danger hover:bg-danger hover:text-white flex items-center justify-center transition-colors"
                                title="Hủy"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    ) : (
                        <>
                            {viewType === 'pending' && matchingCars && matchingCars.length > 0 && onShowSuggestions && (
                                <button onClick={(e) => { e.stopPropagation(); onShowSuggestions(order, matchingCars); }} className="action-btn hold-action" title={`Có ${matchingCars.length} xe gợi ý`}>
                                    <i className="fas fa-lightbulb"></i>
                                </button>
                            )}
                            <AdminActionMenu status={status} viewType={viewType} onAction={handleActionInternal} onToggle={setIsMenuOpen} />
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
};

const AdminInvoiceTable: React.FC<AdminInvoiceTableProps> = ({ orders, viewType, sortConfig, onSort, selectedRows, onToggleRow, onToggleAllRows, onAction, showToast, suggestions, onShowSuggestions, onOpenFilePreview, onUpdateInvoiceDetails }) => {
    const isAllSelected = orders.length > 0 && selectedRows.size === orders.length;

    const headersConfig = {
        invoices: [
            { key: 'Tên khách hàng', title: 'Khách Hàng / SĐH', sortable: true },
            { key: 'Dòng xe', title: 'Thông Tin Xe', sortable: false },
            { key: 'Thời gian nhập', title: 'Ngày YC / XHĐ', sortable: true },
            { key: 'CHÍNH SÁCH', title: 'Chính Sách / PO', sortable: false },
            { key: 'Hồ sơ', title: 'Hồ Sơ', sortable: false },
            { key: 'Kết quả', title: 'Trạng Thái', sortable: true },
        ],
        pending: [
            { key: 'Tên khách hàng', title: 'Khách Hàng / SĐH', sortable: true },
            { key: 'Dòng xe', title: 'Yêu Cầu Xe', sortable: true },
            { key: 'Thời gian nhập', title: 'Ngày Cọc / Yêu Cầu', sortable: true },
            { key: 'Kết quả', title: 'Trạng Thái', sortable: true },
        ],
        paired: [
            { key: 'Tên khách hàng', title: 'Khách Hàng / SĐH', sortable: true },
            { key: 'Dòng xe', title: 'Thông Tin Xe', sortable: true },
            { key: 'Thời gian ghép', title: 'Ngày Cọc / Ghép', sortable: true },
            { key: 'Kết quả', title: 'Trạng Thái', sortable: true },
        ]
    };
    
    const currentHeaders = headersConfig[viewType];

    return (
        <table className="min-w-full divide-y divide-border-primary responsive-table">
            <thead className="bg-surface-hover sticky top-0 z-10">
                <tr>
                    <th scope="col" className="py-2 pl-2 pr-1.5 text-left text-sm font-semibold text-gray-900 w-12 sm:pl-3">
                        <input type="checkbox" className="custom-checkbox" checked={isAllSelected} onChange={onToggleAllRows} />
                    </th>
                    <th scope="col" className="py-2 px-1.5 text-center text-xs font-bold text-text-secondary w-12 uppercase tracking-wider">#</th>
                    {currentHeaders.map(h => h.sortable ? <SortableHeader key={h.key} colKey={h.key as keyof Order} title={h.title} sortConfig={sortConfig} onSort={onSort} /> : <th key={h.key} className="py-2 px-1.5 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">{h.title}</th>)}
                    <th scope="col" className="py-2 px-1.5 text-center text-xs font-bold text-text-secondary uppercase tracking-wider">Hành Động</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border-primary bg-surface-card">
                {orders.map((order, index) => (
                    <AdminInvoiceTableRow
                        key={order['Số đơn hàng']}
                        order={order}
                        index={index}
                        viewType={viewType}
                        selectedRows={selectedRows}
                        onToggleRow={onToggleRow}
                        onAction={onAction}
                        showToast={showToast}
                        suggestions={suggestions}
                        onShowSuggestions={onShowSuggestions}
                        onOpenFilePreview={onOpenFilePreview}
                        onUpdateInvoiceDetails={onUpdateInvoiceDetails}
                    />
                ))}
            </tbody>
        </table>
    );
};

export default AdminInvoiceTable;