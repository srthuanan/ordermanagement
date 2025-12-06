import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { Order, SortConfig, StockVehicle, ActionType } from '../../types';
import StatusBadge from '../ui/StatusBadge';

interface AdminOrderListProps {
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
    onUpdateInvoiceDetails?: (orderNumber: string, data: { engineNumber: string; policy: string; commission: string; vpoint: string }) => Promise<boolean>;
}

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

    useEffect(() => {
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
                <div className="absolute right-0 mt-1 w-48 bg-surface-card border border-border-secondary rounded-lg shadow-2xl z-20 p-0.5 animate-fade-in-scale-up" style={{ animationDuration: '150ms' }}>
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

const AdminOrderCard: React.FC<{
    order: Order;
    index: number;
    viewType: 'invoices' | 'pending' | 'paired';
    selectedRows: Set<string>;
    onToggleRow: (orderNumber: string) => void;
    onAction: (type: ActionType, order: Order) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    suggestions?: Map<string, StockVehicle[]>;
    onShowSuggestions?: (order: Order, cars: StockVehicle[]) => void;
}> = ({ order, index, viewType, selectedRows, onToggleRow, onAction, showToast, suggestions, onShowSuggestions }) => {
    const orderNumber = order['Số đơn hàng'];
    const status = (order as any)['Trạng thái xử lý'] || order['Kết quả'] || 'N/A';
    const matchingCars = suggestions?.get(orderNumber);
    const isSelected = selectedRows.has(orderNumber);

    const handleActionInternal = (type: ActionType) => {
        onAction(type, order);
    };

    return (
        <div
            className={`bg-white rounded-xl border transition-all duration-200 group relative ${isSelected ? 'border-accent-primary shadow-md bg-accent-primary/5' : 'border-border-primary hover:border-accent-primary/50 hover:shadow-sm'}`}
            onClick={() => onToggleRow(orderNumber)}
        >
            {/* Selection Indicator Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-colors ${isSelected ? 'bg-accent-primary' : 'bg-transparent group-hover:bg-accent-primary/30'}`}></div>

            <div className="p-3 pl-4">
                {/* Header: Customer & Status */}
                <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-bold text-text-primary truncate" title={order["Tên khách hàng"]}>{order["Tên khách hàng"]}</h3>
                            <span className="text-[10px] font-mono text-text-secondary bg-surface-ground px-1.5 rounded border border-border-secondary">{index + 1}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                            <CopyableField text={orderNumber} showToast={showToast} className="font-mono hover:text-accent-primary transition-colors" />
                            <span>•</span>
                            <span className="truncate" title={order["Tên tư vấn bán hàng"]}>{order["Tên tư vấn bán hàng"]}</span>
                        </div>
                    </div>
                    <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <StatusBadge status={status} size="sm" />
                    </div>
                </div>

                {/* Body: Vehicle Info */}
                <div className="bg-surface-ground rounded-lg p-2 mb-2 border border-border-secondary/50">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="font-bold text-sm text-text-primary">{order["Dòng xe"]}</div>
                            <div className="text-xs text-text-secondary">{order["Phiên bản"]}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-medium text-text-primary">{order["Ngoại thất"]}</div>
                            <div className="text-xs text-text-secondary">{order["Nội thất"]}</div>
                        </div>
                    </div>
                    {viewType === 'paired' && (
                        <div className="mt-1.5 pt-1.5 border-t border-border-secondary/50 flex justify-between items-center">
                            <span className="text-[10px] text-text-secondary uppercase font-bold">VIN</span>
                            <CopyableField text={order.VIN || ''} showToast={showToast} className="font-mono font-bold text-accent-primary text-xs" />
                        </div>
                    )}
                </div>

                {/* Footer: Dates & Actions */}
                <div className="flex justify-between items-end">
                    <div className="text-xs text-text-secondary space-y-0.5">
                        {viewType === 'pending' ? (
                            <>
                                <div className="flex items-center gap-1.5" title="Ngày cọc">
                                    <i className="fas fa-money-bill-wave text-text-placeholder w-3"></i>
                                    <span>{order["Ngày cọc"] ? moment(order["Ngày cọc"]).format('DD/MM') : '--'}</span>
                                </div>
                                <div className="flex items-center gap-1.5" title="Ngày yêu cầu">
                                    <i className="fas fa-clock text-text-placeholder w-3"></i>
                                    <span className={moment(order["Thời gian nhập"]).isBefore(moment().subtract(3, 'days')) ? 'text-danger font-medium' : ''}>
                                        {order["Thời gian nhập"] ? moment(order["Thời gian nhập"]).format('DD/MM') : '--'}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-1.5" title="Ngày cọc">
                                    <i className="fas fa-money-bill-wave text-text-placeholder w-3"></i>
                                    <span>{order["Ngày cọc"] ? moment(order["Ngày cọc"]).format('DD/MM') : '--'}</span>
                                </div>
                                <div className="flex items-center gap-1.5" title="Ngày ghép">
                                    <i className="fas fa-link text-text-placeholder w-3"></i>
                                    <span>{order["Thời gian ghép"] ? moment(order["Thời gian ghép"]).format('DD/MM') : '--'}</span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {viewType === 'pending' && matchingCars && matchingCars.length > 0 && onShowSuggestions && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onShowSuggestions(order, matchingCars); }}
                                className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 hover:bg-yellow-200 flex items-center justify-center transition-colors shadow-sm animate-pulse"
                                title={`Có ${matchingCars.length} xe gợi ý`}
                            >
                                <i className="fas fa-lightbulb"></i>
                            </button>
                        )}
                        <AdminActionMenu status={status} viewType={viewType} onAction={handleActionInternal} onToggle={() => { }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminOrderList: React.FC<AdminOrderListProps> = ({ orders, viewType, sortConfig, onSort, selectedRows, onToggleRow, onToggleAllRows, onAction, showToast, suggestions, onShowSuggestions }) => {
    const isAllSelected = orders.length > 0 && selectedRows.size === orders.length;

    const sortOptions = [
        { key: 'Thời gian nhập', label: 'Ngày Yêu Cầu' },
        { key: 'Tên khách hàng', label: 'Tên Khách Hàng' },
        { key: 'Dòng xe', label: 'Dòng Xe' },
        { key: 'Kết quả', label: 'Trạng Thái' },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 bg-white border-b border-border-secondary sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none group">
                        <input
                            type="checkbox"
                            className="custom-checkbox"
                            checked={isAllSelected}
                            onChange={onToggleAllRows}
                        />
                        <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                            {selectedRows.size > 0 ? `Đã chọn ${selectedRows.size}` : 'Chọn tất cả'}
                        </span>
                    </label>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary hidden sm:inline">Sắp xếp:</span>
                    <select
                        className="text-xs border-none bg-surface-ground rounded-lg py-1.5 pl-2 pr-8 font-medium text-text-primary focus:ring-1 focus:ring-accent-primary cursor-pointer"
                        value={sortConfig?.key || ''}
                        onChange={(e) => onSort(e.target.value as keyof Order)}
                    >
                        {sortOptions.map(opt => (
                            <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => onSort(sortConfig?.key as keyof Order)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-ground hover:bg-surface-hover text-text-secondary transition-colors"
                        title={sortConfig?.direction === 'asc' ? 'Tăng dần' : 'Giảm dần'}
                    >
                        <i className={`fas fa-sort-amount-${sortConfig?.direction === 'asc' ? 'down-alt' : 'down'}`}></i>
                    </button>
                </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-surface-ground">
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-text-placeholder">
                        <i className="fas fa-box-open text-4xl mb-3 opacity-50"></i>
                        <p>Không có đơn hàng nào</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {orders.map((order, index) => (
                            <AdminOrderCard
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
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminOrderList;
