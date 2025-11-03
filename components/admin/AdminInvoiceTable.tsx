import React, { useState } from 'react';
import moment from 'moment';
// FIX: Imported ActionType from the central types file.
import { Order, SortConfig, StockVehicle, ActionType } from '../../types';
import StatusBadge from '../ui/StatusBadge';

// FIX: Removed local ActionType definition, as it's now imported from types.ts.

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
}

const SortableHeader: React.FC<{ colKey: keyof Order, title: string, sortConfig: SortConfig | null, onSort: (key: keyof Order) => void }> = ({ colKey, title, sortConfig, onSort }) => {
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
    const [confirmAction, setConfirmAction] = useState<{ type: ActionType; label: string; isDanger?: boolean } | null>(null);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const confirmRef = React.useRef<HTMLDivElement>(null);


    const setOpenState = (newIsOpen: boolean) => {
        setIsOpen(newIsOpen);
        onToggle(newIsOpen);
    };

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { 
            if (
                menuRef.current && !menuRef.current.contains(e.target as Node) &&
                (!confirmRef.current || !confirmRef.current.contains(e.target as Node))
            ) {
                setOpenState(false);
                setConfirmAction(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onToggle]);

    const s = status.toLowerCase();
    
    // FIX: Refactored action list generation to be a single expression, which helps TypeScript
    // correctly infer the types of the array and its items, resolving assignment errors.
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
        const simpleActions: ActionType[] = ['approve', 'pendingSignature', 'resend', 'requestInvoice'];
        
        if (simpleActions.includes(action.type as ActionType)) {
            setOpenState(false);
            setConfirmAction({ type: action.type as ActionType, label: action.label, isDanger: action.isDanger });
        } else {
            onAction(action.type as ActionType);
            setOpenState(false);
        }
    };


    return (
        <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
            <button onClick={(e) => { e.stopPropagation(); setConfirmAction(null); setOpenState(!isOpen) }} className="w-8 h-8 rounded-full hover:bg-surface-hover flex items-center justify-center"><i className="fas fa-ellipsis-h text-text-secondary"></i></button>
            
            {confirmAction && (
                <div
                    ref={confirmRef}
                    className="absolute top-1/2 -translate-y-1/2 right-full mr-2 z-30 w-64 bg-surface-overlay p-4 rounded-lg shadow-xl border border-border-primary animate-fade-in-scale-up"
                    style={{ animationDuration: '150ms' }}
                >
                    <p className="text-sm font-semibold text-text-primary text-center">
                        Xác nhận "{confirmAction.label}"?
                    </p>
                    <div className="flex justify-center gap-3 mt-4">
                        <button
                            onClick={() => setConfirmAction(null)}
                            className="flex-1 btn-secondary !py-1.5 !text-xs"
                        >
                            Không
                        </button>
                        <button
                            onClick={() => {
                                onAction(confirmAction.type);
                                setConfirmAction(null);
                            }}
                            className={`flex-1 !py-1.5 !text-xs ${confirmAction.isDanger ? 'btn-danger' : 'btn-primary'}`}
                        >
                            Có, Xác nhận
                        </button>
                    </div>
                </div>
            )}
            
            {isOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-surface-card border border-border-secondary rounded-lg shadow-2xl z-20 p-1 animate-fade-in-scale-up" style={{animationDuration: '150ms'}}>
                    {actions.map((action) => (
                        <button key={action.type} onClick={() => handleActionClick(action)}
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
}> = ({ order, index, viewType, selectedRows, onToggleRow, onAction, showToast, suggestions, onShowSuggestions, onOpenFilePreview }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const orderNumber = order['Số đơn hàng'];
    const status = (order as any)['Trạng thái xử lý'] || order['Kết quả'] || 'N/A';
    const matchingCars = suggestions?.get(orderNumber);

    return (
        <tr className={`hover:bg-surface-hover transition-colors ${isMenuOpen ? 'relative z-20' : ''}`}>
            <td data-label="checkbox" className="pl-4 w-12 sm:pl-6" onClick={e => e.stopPropagation()}>
                <input type="checkbox" className="custom-checkbox" checked={selectedRows.has(orderNumber)} onChange={() => onToggleRow(orderNumber)} />
            </td>
            <td data-label="#" className="px-3 py-4 text-sm text-center text-text-secondary">{index + 1}</td>
            
            {/* Customer/Order Info */}
            <td data-label="Khách Hàng / SĐH" className="px-3 py-4 text-sm">
                <CopyableField text={order["Tên khách hàng"]} showToast={showToast} className="font-semibold text-text-primary" wrap={true} />
                <CopyableField text={orderNumber} showToast={showToast} className="text-text-secondary font-mono text-xs" />
                <div className="text-text-secondary text-xs mt-1">TVBH: {order["Tên tư vấn bán hàng"] || 'N/A'}</div>
            </td>
            
            {/* Dynamic Columns */}
            {viewType === 'invoices' && (
                <>
                    <td data-label="Thông Tin Xe" className="px-3 py-4 text-sm">
                        <div className="font-medium text-text-primary">{order["Dòng xe"]} - {order["Phiên bản"]}</div>
                        <div className="text-text-secondary text-xs mt-1">{order["Ngoại thất"]} / {order["Nội thất"]}</div>
                        <CopyableField text={order.VIN || ''} showToast={showToast} className="font-bold text-accent-primary text-sm font-mono mt-1 hover:text-accent-primary-hover hover:underline" label="VIN" />
                        <CopyableField text={order["Số động cơ"] || ''} showToast={showToast} className="text-text-secondary text-xs font-mono mt-1" label="S.MÁY" />
                    </td>
                    <td data-label="Ngày YC / XHĐ" className="px-3 py-4 text-sm">
                        <div className="text-text-primary" title={`Yêu cầu: ${order["Thời gian nhập"] ? moment(order["Thời gian nhập"]).format('HH:mm DD/MM/YYYY') : 'N/A'}`}>
                            {order["Thời gian nhập"] ? moment(order["Thời gian nhập"]).format('DD/MM/YYYY') : 'N/A'}
                        </div>
                        <div className="text-text-secondary text-xs mt-1" title={order["Ngày xuất hóa đơn"] ? `Xuất hóa đơn: ${moment(order["Ngày xuất hóa đơn"]).format('HH:mm DD/MM/YYYY')}` : 'Chưa xuất hóa đơn'}>
                            {order["Ngày xuất hóa đơn"] ? moment(order["Ngày xuất hóa đơn"]).format('DD/MM/YYYY') : 'Chưa XHĐ'}
                        </div>
                    </td>
                    <td data-label="Chính Sách / PO" className="px-3 py-4 text-sm">
                        <div className="text-xs font-medium text-text-primary" title={order["CHÍNH SÁCH"]}>{order["CHÍNH SÁCH"] || 'N/A'}</div>
                        <CopyableField text={order["PO PIN"] || ''} showToast={showToast} className="text-text-secondary text-xs font-mono mt-1" label="PO" />
                    </td>
                    <td data-label="Hồ Sơ" className="px-3 py-4 text-sm">
                        <div className="flex items-center gap-3">
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
                                        <i className={`fas ${file.icon} fa-fw text-lg w-6 text-center ${url ? 'text-text-secondary' : 'text-text-placeholder/50'}`}></i>
                                    </button>
                                );
                            })}
                        </div>
                    </td>
                </>
            )}
             {viewType === 'pending' && (
                <>
                    <td data-label="Yêu Cầu Xe" className="px-3 py-4 text-sm">
                        <div className="font-medium text-text-primary">{order["Dòng xe"]} - {order["Phiên bản"]}</div>
                        <div className="text-text-secondary text-xs">{order["Ngoại thất"]} / {order["Nội thất"]}</div>
                    </td>
                    <td data-label="Ngày Yêu Cầu" className="px-3 py-4 text-sm"><div className="text-text-primary">{moment(order["Thời gian nhập"]).format('DD/MM/YYYY')}</div></td>
                </>
            )}
             {viewType === 'paired' && (
                <>
                    <td data-label="Xe Đã Ghép" className="px-3 py-4 text-sm">
                        <div className="font-medium text-text-primary">{order["Dòng xe"]} - {order["Phiên bản"]}</div>
                        <CopyableField text={order.VIN || ''} showToast={showToast} className="text-text-secondary text-xs font-mono mt-1" label="VIN" />
                    </td>
                    <td data-label="Ngày Ghép" className="px-3 py-4 text-sm"><div className="text-text-primary">{order["Thời gian ghép"] ? moment(order["Thời gian ghép"]).format('DD/MM/YYYY') : 'N/A'}</div></td>
                </>
            )}

            {/* Status */}
            <td data-label="Trạng Thái" className="px-3 py-4 text-sm"><StatusBadge status={status} /></td>
            
            {/* Actions */}
            <td data-label="Hành Động" className="px-3 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                    {viewType === 'pending' && matchingCars && matchingCars.length > 0 && onShowSuggestions && (
                        <button onClick={(e) => { e.stopPropagation(); onShowSuggestions(order, matchingCars); }} className="action-btn hold-action" title={`Có ${matchingCars.length} xe gợi ý`}>
                            <i className="fas fa-lightbulb"></i>
                        </button>
                    )}
                    <AdminActionMenu status={status} viewType={viewType} onAction={(type) => onAction(type, order)} onToggle={setIsMenuOpen} />
                </div>
            </td>
        </tr>
    );
};

const AdminInvoiceTable: React.FC<AdminInvoiceTableProps> = ({ orders, viewType, sortConfig, onSort, selectedRows, onToggleRow, onToggleAllRows, onAction, showToast, suggestions, onShowSuggestions, onOpenFilePreview }) => {
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
            { key: 'Thời gian nhập', title: 'Ngày Yêu Cầu', sortable: true },
            { key: 'Kết quả', title: 'Trạng Thái', sortable: true },
        ],
        paired: [
            { key: 'Tên khách hàng', title: 'Khách Hàng / SĐH', sortable: true },
            { key: 'Dòng xe', title: 'Xe Đã Ghép', sortable: true },
            { key: 'Thời gian ghép', title: 'Ngày Ghép', sortable: true },
            { key: 'Kết quả', title: 'Trạng Thái', sortable: true },
        ]
    };
    
    const currentHeaders = headersConfig[viewType];

    return (
        <table className="min-w-full divide-y divide-border-primary responsive-table">
            <thead className="bg-surface-hover sticky top-0 z-10">
                <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 w-12 sm:pl-6">
                        <input type="checkbox" className="custom-checkbox" checked={isAllSelected} onChange={onToggleAllRows} />
                    </th>
                    <th scope="col" className="py-3.5 px-3 text-center text-xs font-bold text-text-secondary w-12 uppercase tracking-wider">#</th>
                    {currentHeaders.map(h => h.sortable ? <SortableHeader key={h.key} colKey={h.key as keyof Order} title={h.title} sortConfig={sortConfig} onSort={onSort} /> : <th key={h.key} className="py-3.5 px-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">{h.title}</th>)}
                    <th scope="col" className="py-3.5 px-3 text-center text-xs font-bold text-text-secondary uppercase tracking-wider">Hành Động</th>
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
                    />
                ))}
            </tbody>
        </table>
    );
};

export default AdminInvoiceTable;