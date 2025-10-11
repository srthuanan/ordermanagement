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
    
    const textClasses = wrap ? 'cursor-pointer break-words' : 'truncate cursor-pointer';

    return (
        <div className={`group relative flex items-start justify-between ${className}`} title={`Click để sao chép: ${text}`}>
            <span className={textClasses} onClick={(e) => handleCopy(e)}>{label ? `${label}: ` : ''}{text}</span>
            <button onClick={handleCopy} className="ml-2 text-text-secondary/50 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 shrink-0">
                <i className="fas fa-copy text-xs"></i>
            </button>
        </div>
    );
};

const AdminInvoiceTable: React.FC<AdminInvoiceTableProps> = ({ orders, viewType, sortConfig, onSort, selectedRows, onToggleRow, onToggleAllRows, onAction, showToast, suggestions, onShowSuggestions }) => {
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
                {orders.map((order, index) => {
                    const orderNumber = order['Số đơn hàng'];
                    const status = (order as any)['Trạng thái xử lý'] || order['Kết quả'] || 'N/A';
                    const matchingCars = suggestions?.get(orderNumber);

                    return (
                        <tr key={orderNumber} className="hover:bg-surface-hover transition-colors">
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
                                        <CopyableField text={order.VIN || ''} showToast={showToast} className="text-text-secondary text-xs font-mono mt-1" label="VIN" />
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
                                            {[ { key: 'LinkHopDong', label: 'Hợp đồng', icon: 'fa-file-contract' }, { key: 'LinkDeNghiXHD', label: 'Đề nghị', icon: 'fa-file-invoice' }, { key: 'LinkHoaDonDaXuat', label: 'Hóa Đơn', icon: 'fa-file-invoice-dollar' }].map(file => (
                                                <a key={file.key} href={order[file.key] ? order[file.key] as string : undefined} target={order[file.key] ? '_blank' : undefined} rel="noreferrer" onClick={(e) => { if (!order[file.key]) e.preventDefault(); e.stopPropagation(); }} className={`transition-opacity ${order[file.key] ? 'hover:opacity-70 cursor-pointer' : 'cursor-not-allowed'}`} title={file.label + (order[file.key] ? '' : ' (chưa có)')} >
                                                    <i className={`fas ${file.icon} fa-fw text-lg w-6 text-center ${order[file.key] ? 'text-text-secondary' : 'text-text-placeholder/50'}`}></i>
                                                </a>
                                            ))}
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
                                    <AdminActionMenu status={status} viewType={viewType} onAction={(type) => onAction(type, order)} />
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

const AdminActionMenu: React.FC<{ status: string; viewType: 'invoices' | 'pending' | 'paired', onAction: (type: ActionType) => void }> = ({ status, viewType, onAction }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const s = status.toLowerCase();
    
    // FIX: Refactored action list generation to be a single expression, which helps TypeScript
    // correctly infer the types of the array and its items, resolving assignment errors.
    const actions = (
        viewType === 'invoices'
            ? [
                  { type: 'vinclub', label: 'Y/C VinClub', icon: 'fa-id-card', condition: s === 'chờ phê duyệt' },
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
                     {actions.length === 0 && <div className="px-3 py-2 text-sm text-text-secondary text-center">Không có hành động</div>}
                </div>
            )}
        </div>
    );
};

export default AdminInvoiceTable;
