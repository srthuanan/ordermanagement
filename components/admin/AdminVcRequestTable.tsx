import React, { useState } from 'react';
import moment from 'moment';
import { VcRequest, VcSortConfig, ActionType } from '../../types';
import StatusBadge from '../ui/StatusBadge';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';

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
    onDownloadAll: (request: VcRequest) => void;
}

const CopyableField: React.FC<{ text: string; showToast?: Function; className?: string; label?: string }> = ({ text, className, label }) => {
    const copyWithFeedback = useCopyFeedback();
    if (!text || text === 'N/A') {
        return <div className={className}>{label ? `${label}: ` : ''}N/A</div>;
    }
    return (
        <div
            className={`cursor-pointer ${className}`}
            title={`Click để sao chép: ${text}`}
            onClick={(e) => { e.stopPropagation(); copyWithFeedback(text, e); }}
        >
            <span className="truncate">{text}</span>
        </div>
    );
};

const AdminActionMenu: React.FC<{ status: string; onAction: (type: ActionType) => void, onToggle: (isOpen: boolean) => void }> = ({ status, onAction, onToggle }) => {
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
    const actions = [
        { type: 'approveVc', label: 'Phê Duyệt', icon: 'fa-check-circle', condition: s === 'chờ duyệt ycvc' },
        { type: 'rejectVc', label: 'Từ Chối', icon: 'fa-ban', isDanger: true, condition: s === 'chờ duyệt ycvc' },
    ].filter(a => a.condition);

    const handleActionClick = (action: typeof actions[0]) => {
        onAction(action.type as ActionType);
        setOpenState(false);
    };

    return (
        <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
            <button onClick={(e) => { e.stopPropagation(); setOpenState(!isOpen) }} className="w-8 h-8 rounded-full hover:bg-surface-hover flex items-center justify-center"><i className="fas fa-ellipsis-h text-text-secondary"></i></button>

            {isOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-surface-card border border-border-secondary rounded-lg shadow-2xl z-20 p-0.5 animate-fade-in-scale-up" style={{ animationDuration: '150ms' }}>
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

const VcRequestCard: React.FC<{
    request: VcRequest;
    index: number;
    selectedRows: Set<string>;
    onToggleRow: (orderNumber: string) => void;
    onAction: (type: ActionType, request: VcRequest) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onOpenImagePreview: (images: ImageSource[], startIndex: number, customerName: string) => void;
    onDownloadAll: (request: VcRequest) => void;
}> = ({ request, index, selectedRows, onToggleRow, onAction, onOpenImagePreview, onDownloadAll }) => {
    const orderNumber = request['Số đơn hàng'];
    const status = request['Trạng thái xử lý'] || 'N/A';
    const dmsCode = request['Mã KH DMS'];
    const isSelected = selectedRows.has(orderNumber);
    const copyWithFeedback = useCopyFeedback();

    let fileUrls: Record<string, string> = {};
    try {
        if (request.FileUrls) fileUrls = JSON.parse(request.FileUrls);
        else if (request['URL hình ảnh']) fileUrls = { unc: request['URL hình ảnh'] };
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

    const handleImagePreview = (e: React.MouseEvent, docIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenImagePreview(allImageSources, docIndex, request['Tên khách hàng']);
    };

    const handleActionInternal = (type: ActionType) => {
        onAction(type, request);
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
                            <h3
                                className="font-bold text-text-primary truncate cursor-pointer hover:text-accent-primary transition-colors"
                                title="Click để sao chép tên khách hàng"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    copyWithFeedback(request["Tên khách hàng"], e);
                                }}
                            >
                                {request["Tên khách hàng"]}
                            </h3>
                            <span className="text-[10px] font-mono text-text-secondary bg-surface-ground px-1.5 rounded border border-border-secondary">{index + 1}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                            <CopyableField text={orderNumber} className="font-mono hover:text-accent-primary transition-colors" label="SĐH" />
                        </div>
                    </div>
                    <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <StatusBadge status={status} size="sm" />
                    </div>
                </div>

                {/* Body: Request Info */}
                <div className="bg-surface-ground rounded-lg p-2 mb-2 border border-border-secondary/50">
                    <div className="space-y-1.5">
                        {request.VIN && (
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-text-secondary uppercase font-bold">VIN</span>
                                <CopyableField text={request.VIN} className="font-mono font-bold text-accent-primary text-xs" label="VIN" />
                            </div>
                        )}
                        {dmsCode && (
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-text-secondary uppercase font-bold">DMS</span>
                                <span className="font-mono font-semibold text-text-primary text-xs">{dmsCode}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-text-secondary uppercase font-bold">Người YC</span>
                            <span className="text-xs text-text-primary truncate max-w-[60%]" title={request["Người YC"]}>{request["Người YC"]}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-text-secondary uppercase font-bold">Thời gian</span>
                            <span className="text-xs text-text-primary">{moment(request["Thời gian YC"]).format('HH:mm DD/MM/YY')}</span>
                        </div>
                    </div>
                </div>

                {/* Documents */}
                {docEntries.length > 0 && (
                    <div className="mb-2">
                        <div className="text-[10px] text-text-secondary uppercase font-bold mb-1">Hồ sơ</div>
                        <div className="flex flex-wrap gap-1.5">
                            {docEntries.map(([key], docIndex) => {
                                const doc = docLabels[key] || { label: key, icon: 'fa-file' };
                                return (
                                    <button
                                        key={key}
                                        onClick={(e) => handleImagePreview(e, docIndex)}
                                        title={`Xem ${doc.label}`}
                                        className="px-2 py-1 bg-accent-primary/10 text-accent-primary rounded text-xs font-medium hover:bg-accent-primary/20 transition-colors flex items-center gap-1"
                                    >
                                        <i className={`fas ${doc.icon}`}></i>
                                        <span className="hidden sm:inline">{doc.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Note */}
                {request['Ghi chú'] && (
                    <div className="mb-2 text-xs text-text-secondary bg-surface-ground/50 rounded p-1.5 border border-border-secondary/30">
                        <span className="font-semibold">Ghi chú: </span>
                        <span className="line-clamp-2">{request['Ghi chú']}</span>
                    </div>
                )}

                {/* Footer: Actions */}
                <div className="flex justify-end items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDownloadAll(request); }}
                        className="w-8 h-8 rounded-full bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 flex items-center justify-center transition-colors"
                        title="Tải tất cả hồ sơ"
                    >
                        <i className="fas fa-file-archive"></i>
                    </button>
                    <AdminActionMenu status={status} onAction={handleActionInternal} onToggle={() => { }} />
                </div>
            </div>
        </div>
    );
};

const AdminVcRequestTable: React.FC<AdminVcRequestTableProps> = ({ requests, sortConfig, onSort, selectedRows, onToggleRow, onToggleAllRows, onAction, onOpenImagePreview, showToast, onDownloadAll }) => {
    const isAllSelected = requests.length > 0 && selectedRows.size === requests.length;

    const sortOptions = [
        { key: 'Thời gian YC', label: 'Thời Gian YC' },
        { key: 'Tên khách hàng', label: 'Tên Khách Hàng' },
        { key: 'Người YC', label: 'Người Yêu Cầu' },
        { key: 'Trạng thái xử lý', label: 'Trạng Thái' },
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
                        onChange={(e) => onSort(e.target.value as keyof VcRequest)}
                    >
                        {sortOptions.map(opt => (
                            <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => onSort(sortConfig?.key as keyof VcRequest)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-ground hover:bg-surface-hover text-text-secondary transition-colors"
                        title={sortConfig?.direction === 'asc' ? 'Tăng dần' : 'Giảm dần'}
                    >
                        <i className={`fas fa-sort-amount-${sortConfig?.direction === 'asc' ? 'down-alt' : 'down'}`}></i>
                    </button>
                </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-surface-ground">
                {requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 w-full h-full bg-slate-50 rounded-2xl">
                        <div className="relative w-20 h-20 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center mb-5">
                            <div className="absolute inset-0 border border-gray-200/60 rounded-full transform scale-110"></div>
                            <div className="absolute inset-0 border border-gray-100 rounded-full transform scale-125"></div>
                            <i className="fas fa-crown text-gray-300 text-3xl"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-600 mb-1 tracking-tight">Trống Không!</h3>
                        <p className="text-xs text-gray-400 max-w-xs text-center">Không có yêu cầu VinClub nào tại đây.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {requests.map((request, index) => (
                            <VcRequestCard
                                key={request['Số đơn hàng']}
                                request={request}
                                index={index}
                                selectedRows={selectedRows}
                                onToggleRow={onToggleRow}
                                onAction={onAction}
                                showToast={showToast}
                                onOpenImagePreview={onOpenImagePreview}
                                onDownloadAll={onDownloadAll}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminVcRequestTable;