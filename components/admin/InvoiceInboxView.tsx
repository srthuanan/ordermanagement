import React, { useState, useMemo, useEffect } from 'react';
import moment from 'moment';
import { Order, ActionType } from '../../types';
import StatusBadge from '../ui/StatusBadge';
import CarImage from '../ui/CarImage';

interface InvoiceInboxViewProps {
    orders: Order[];
    onAction: (type: ActionType, order: Order) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onOpenFilePreview: (url: string, label: string) => void;
    onUpdateInvoiceDetails?: (orderNumber: string, data: { engineNumber: string; policy: string; po: string }) => Promise<boolean>;
    selectedFolder: string;
    selectedOrderId: string | null;
    onFolderChange: (folder: string) => void;
    onOrderSelect: (orderId: string | null) => void;
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

const InvoiceInboxView: React.FC<InvoiceInboxViewProps> = ({ orders, onAction, showToast, onOpenFilePreview, onUpdateInvoiceDetails, selectedFolder, selectedOrderId, onFolderChange, onOrderSelect }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editData, setEditData] = useState({ engineNumber: '', policy: '', po: '' });

    // 1. Filter Orders by Folder
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const status = (order['Trạng thái xử lý'] || order['Kết quả'] || '').toLowerCase();
            switch (selectedFolder) {
                case 'pending_approval': return status === 'chờ phê duyệt';
                case 'approved': return status === 'đã phê duyệt';
                case 'request_supplement': return status === 'yêu cầu bổ sung';
                case 'supplemented': return status === 'đã bổ sung';
                case 'pending_signature': return status === 'chờ ký hóa đơn' || status === 'chờ ký hóa đơn';
                case 'completed': return status === 'đã xuất hóa đơn';
                case 'all': return true;
                default: return true;
            }
        });
    }, [orders, selectedFolder]);

    const selectedOrder = useMemo(() => orders.find(o => o['Số đơn hàng'] === selectedOrderId), [orders, selectedOrderId]);

    // Auto-select first order if none selected
    useEffect(() => {
        if (!selectedOrderId && filteredOrders.length > 0) {
            const firstId = filteredOrders[0]['Số đơn hàng'];
            if (firstId) onOrderSelect(firstId);
        }
    }, [filteredOrders, selectedOrderId, onOrderSelect]);

    // Sync edit data
    useEffect(() => {
        if (selectedOrder && !isEditing) {
            setEditData({
                engineNumber: selectedOrder["Số động cơ"] || '',
                policy: selectedOrder["CHÍNH SÁCH"] || '',
                po: selectedOrder["PO PIN"] || ''
            });
        }
    }, [selectedOrder, isEditing]);

    const handleSaveEdit = async () => {
        if (!selectedOrder || !onUpdateInvoiceDetails) return;
        setIsSaving(true);
        const success = await onUpdateInvoiceDetails(selectedOrder['Số đơn hàng'], editData);
        setIsSaving(false);
        if (success) setIsEditing(false);
    };

    const folders = [
        { id: 'pending_approval', label: 'Chờ Phê Duyệt', icon: 'fa-clock', count: orders.filter(o => (o['Trạng thái xử lý'] || o['Kết quả'] || '').toLowerCase() === 'chờ phê duyệt').length },
        { id: 'approved', label: 'Đã Phê Duyệt', icon: 'fa-check', count: orders.filter(o => (o['Trạng thái xử lý'] || o['Kết quả'] || '').toLowerCase() === 'đã phê duyệt').length },
        { id: 'request_supplement', label: 'Yêu Cầu Bổ Sung', icon: 'fa-exclamation-circle', count: orders.filter(o => (o['Trạng thái xử lý'] || o['Kết quả'] || '').toLowerCase() === 'yêu cầu bổ sung').length },
        { id: 'supplemented', label: 'Đã Bổ Sung', icon: 'fa-plus-circle', count: orders.filter(o => (o['Trạng thái xử lý'] || o['Kết quả'] || '').toLowerCase() === 'đã bổ sung').length },
        { id: 'pending_signature', label: 'Chờ Ký Hóa Đơn', icon: 'fa-file-signature', count: orders.filter(o => ['chờ ký hóa đơn', 'chờ ký hóa đơn'].includes((o['Trạng thái xử lý'] || o['Kết quả'] || '').toLowerCase())).length },
        { id: 'completed', label: 'Đã Xuất Hóa Đơn', icon: 'fa-check-double', count: orders.filter(o => (o['Trạng thái xử lý'] || o['Kết quả'] || '').toLowerCase() === 'đã xuất hóa đơn').length },
        { id: 'all', label: 'Tất Cả', icon: 'fa-list', count: orders.length },
    ];

    const getActions = (status: string) => {
        const s = status.toLowerCase();
        return [
            { type: 'approve', label: 'Phê Duyệt', icon: 'fa-check-double', className: 'btn-primary', condition: s === 'chờ phê duyệt' || s === 'đã bổ sung' },
            { type: 'supplement', label: 'Yêu Cầu Bổ Sung', icon: 'fa-exclamation-triangle', className: 'btn-warning', condition: s === 'chờ phê duyệt' || s === 'đã bổ sung' },
            { type: 'pendingSignature', label: 'Chuyển Chờ Ký', icon: 'fa-signature', className: 'btn-primary', condition: s === 'đã phê duyệt' },
            { type: 'uploadInvoice', label: 'Tải Lên Hóa Đơn', icon: 'fa-upload', className: 'btn-success', condition: s === 'chờ ký hóa đơn' },
            { type: 'resend', label: 'Gửi Lại Email', icon: 'fa-paper-plane', className: 'btn-secondary', condition: s === 'yêu cầu bổ sung' || s === 'đã xuất hóa đơn' },
            { type: 'cancel', label: 'Hủy Yêu Cầu', icon: 'fa-trash-alt', className: 'btn-danger', condition: s !== 'đã xuất hóa đơn' && s !== 'đã hủy' },
        ].filter(a => a.condition);
    };

    return (
        <div className="flex h-full bg-surface-card rounded-xl shadow-md border border-border-primary overflow-hidden animate-fade-in">
            {/* Column 1: Folders */}
            <div className="w-64 flex-shrink-0 border-r border-border-primary bg-surface-ground flex flex-col">
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {folders.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => onFolderChange(folder.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${selectedFolder === folder.id ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}`}
                        >
                            <div className="flex items-center gap-3">
                                <i className={`fas ${folder.icon} w-5 text-center`}></i>
                                <span>{folder.label}</span>
                            </div>
                            {folder.count > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${selectedFolder === folder.id ? 'bg-accent-primary text-white' : 'bg-surface-hover text-text-secondary'}`}>{folder.count}</span>}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Column 2: List */}
            <div className="w-80 flex-shrink-0 border-r border-border-primary flex flex-col bg-white">
                {/* Search removed as it's handled globally */}
                <div className="flex-1 overflow-y-auto">
                    {filteredOrders.length === 0 ? (
                        <div className="p-8 text-center text-text-placeholder text-sm">Không tìm thấy đơn hàng nào.</div>
                    ) : (
                        <div className="divide-y divide-border-secondary">
                            {filteredOrders.map(order => (
                                <div
                                    key={order['Số đơn hàng']}
                                    onClick={() => onOrderSelect(order['Số đơn hàng'])}
                                    className={`p-3 cursor-pointer hover:bg-surface-hover transition-colors group ${selectedOrderId === order['Số đơn hàng'] ? 'bg-accent-primary/5 border-l-4 border-accent-primary' : 'border-l-4 border-transparent'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0 pr-3">
                                            <div className="text-text-primary text-sm truncate mb-0.5">{order['Tên khách hàng']}</div>
                                            <div className="text-xs text-text-secondary truncate">{order['Dòng xe']} <span className="text-text-placeholder">•</span> {order['Phiên bản']}</div>
                                        </div>
                                        <div className="w-16 h-10 flex-shrink-0">
                                            <CarImage
                                                model={order['Dòng xe']}
                                                exteriorColor={order['Ngoại thất']}
                                                className="w-full h-full object-contain opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Column 3: Detail */}
            <div className="flex-1 flex flex-col bg-surface-ground min-w-0">
                {
                    selectedOrder ? (
                        <>
                            {/* Header Actions - Compact */}
                            < div className="px-4 py-3 bg-white border-b border-border-primary flex justify-between items-center shadow-sm z-10" >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary font-bold text-base">
                                        {selectedOrder['Tên khách hàng'].charAt(0)}
                                    </div>
                                    <div>
                                        <h2
                                            className="text-base font-bold text-text-primary leading-tight cursor-pointer hover:text-accent-primary transition-colors"
                                            title="Click để sao chép tên khách hàng"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(selectedOrder['Tên khách hàng']);
                                                showToast('Đã sao chép', 'Tên khách hàng đã được sao chép', 'success');
                                            }}
                                        >
                                            {selectedOrder['Tên khách hàng']}
                                        </h2>
                                        <div className="text-xs text-text-secondary flex items-center gap-2 mt-0.5">
                                            <span
                                                className="font-mono cursor-pointer hover:text-accent-primary border-b border-dashed border-transparent hover:border-accent-primary transition-all"
                                                title="Click để sao chép số đơn hàng"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(selectedOrder['Số đơn hàng']);
                                                    showToast('Đã sao chép', 'Số đơn hàng đã được sao chép', 'success');
                                                }}
                                            >
                                                {selectedOrder['Số đơn hàng']}
                                            </span>
                                            <span>•</span>
                                            <span>{selectedOrder['Tên tư vấn bán hàng']}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {getActions(selectedOrder['Trạng thái xử lý'] || selectedOrder['Kết quả'] || '').map(action => (
                                        <button
                                            key={action.type}
                                            onClick={() => onAction(action.type as any, selectedOrder)}
                                            className={`btn ${action.className} px-2.5 py-1 text-xs flex items-center gap-1.5 rounded`}
                                        >
                                            <i className={`fas ${action.icon}`}></i>
                                            <span className="hidden xl:inline">{action.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div >

                            {/* Content - Compact */}
                            < div className="flex-1 overflow-y-auto p-4 custom-scrollbar" >
                                <div className="max-w-5xl mx-auto space-y-4">
                                    {/* Status Card */}
                                    <div className="bg-white rounded-lg border border-border-primary px-4 py-3 flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="text-xs text-text-secondary">Trạng thái:</div>
                                            <StatusBadge status={selectedOrder['Trạng thái xử lý'] || selectedOrder['Kết quả'] || ''} size="sm" />
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-text-secondary">Ngày yêu cầu:</span>
                                            <span className="font-medium text-text-primary">{moment(selectedOrder['Thời gian nhập']).format('HH:mm DD/MM/YYYY')}</span>
                                        </div>
                                    </div>

                                    {/* Vehicle Info */}
                                    <div className="bg-white rounded-lg border border-border-primary p-3 shadow-sm">
                                        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 border-b border-border-secondary pb-1.5">Thông Tin Xe</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="text-[10px] text-text-secondary block mb-0.5 uppercase">Dòng xe / Phiên bản</label>
                                                <div className="text-sm font-medium truncate" title={`${selectedOrder['Dòng xe']} - ${selectedOrder['Phiên bản']}`}>{selectedOrder['Dòng xe']} - {selectedOrder['Phiên bản']}</div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-text-secondary block mb-0.5 uppercase">Màu sắc</label>
                                                <div className="text-sm font-medium truncate" title={`${selectedOrder['Ngoại thất']} / ${selectedOrder['Nội thất']}`}>{selectedOrder['Ngoại thất']} / {selectedOrder['Nội thất']}</div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-text-secondary block mb-0.5 uppercase">Số VIN</label>
                                                <CopyableField text={selectedOrder.VIN || ''} showToast={showToast} className="font-mono font-bold text-accent-primary text-sm truncate" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-text-secondary block mb-0.5 uppercase">Số Máy</label>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editData.engineNumber}
                                                        onChange={e => setEditData({ ...editData, engineNumber: e.target.value })}
                                                        className="w-full text-xs border border-accent-primary rounded px-2 py-1"
                                                    />
                                                ) : (
                                                    <CopyableField text={selectedOrder['Số động cơ'] || ''} showToast={showToast} className="font-mono text-sm truncate" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Policy & PO & Documents Grid */}
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                        {/* Policy & PO */}
                                        <div className="bg-white rounded-lg border border-border-primary p-3 shadow-sm flex flex-col h-full">
                                            <div className="flex justify-between items-center mb-2 border-b border-border-secondary pb-1.5">
                                                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Thanh Toán & Chính Sách</h3>
                                                {!isEditing ? (
                                                    <button onClick={() => setIsEditing(true)} className="text-accent-primary hover:text-accent-primary-hover text-xs font-medium">
                                                        <i className="fas fa-edit mr-1"></i> Sửa
                                                    </button>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <button onClick={handleSaveEdit} disabled={isSaving} className="text-success hover:text-success-hover text-xs font-medium">
                                                            <i className="fas fa-save mr-1"></i> Lưu
                                                        </button>
                                                        <button onClick={() => setIsEditing(false)} disabled={isSaving} className="text-danger hover:text-danger-hover text-xs font-medium">
                                                            <i className="fas fa-times mr-1"></i> Hủy
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 flex flex-col gap-3">
                                                <div className="flex-1">
                                                    <label className="text-[10px] text-text-secondary block mb-0.5 uppercase">Chính Sách</label>
                                                    {isEditing ? (
                                                        <textarea
                                                            value={editData.policy}
                                                            onChange={e => setEditData({ ...editData, policy: e.target.value })}
                                                            className="w-full text-xs border border-accent-primary rounded px-2 py-1 h-20 resize-none"
                                                        />
                                                    ) : (
                                                        <div className="text-xs whitespace-pre-wrap bg-surface-ground p-2 rounded border border-border-secondary h-20 overflow-y-auto custom-scrollbar">{selectedOrder['CHÍNH SÁCH'] || 'Không có'}</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-text-secondary block mb-0.5 uppercase">PO PIN</label>
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={editData.po}
                                                            onChange={e => setEditData({ ...editData, po: e.target.value })}
                                                            className="w-full text-xs border border-accent-primary rounded px-2 py-1 font-mono"
                                                        />
                                                    ) : (
                                                        <CopyableField text={selectedOrder['PO PIN'] || ''} showToast={showToast} className="font-mono text-xs font-bold bg-surface-ground p-1.5 rounded border border-border-secondary block truncate" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Documents */}
                                        <div className="bg-white rounded-lg border border-border-primary p-3 shadow-sm flex flex-col h-full">
                                            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 border-b border-border-secondary pb-1.5">Hồ Sơ Đính Kèm</h3>
                                            <div className="flex-1 flex flex-col gap-2">
                                                {[{ key: 'LinkHopDong', label: 'Hợp đồng', icon: 'fa-file-contract' }, { key: 'LinkDeNghiXHD', label: 'Đề nghị XHĐ', icon: 'fa-file-invoice' }, { key: 'LinkHoaDonDaXuat', label: 'Hóa Đơn Đã Xuất', icon: 'fa-file-invoice-dollar' }].map(file => {
                                                    const url = selectedOrder[file.key] as string | undefined;
                                                    return (
                                                        <div key={file.key} className={`flex items-center gap-3 p-2 rounded border transition-all ${url ? 'border-border-secondary bg-surface-ground cursor-pointer hover:bg-surface-hover' : 'border-border-secondary/50 bg-surface-ground/50 opacity-60'}`}
                                                            onClick={() => url && onOpenFilePreview(url, `${file.label} - ${selectedOrder["Tên khách hàng"]}`)}
                                                        >
                                                            <div className={`w-8 h-8 rounded flex items-center justify-center ${url ? 'bg-white text-accent-primary shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                                                                <i className={`fas ${file.icon} text-sm`}></i>
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-medium text-xs text-text-primary truncate">{file.label}</div>
                                                                <div className="text-[10px] text-text-secondary truncate">{url ? 'Nhấn để xem' : 'Chưa có'}</div>
                                                            </div>
                                                            {url && <i className="fas fa-external-link-alt text-[10px] text-text-placeholder"></i>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div >
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-text-placeholder">
                            <i className="fas fa-inbox text-6xl mb-4 opacity-20"></i>
                            <p>Chọn một đơn hàng để xem chi tiết</p>
                        </div>
                    )}
            </div >
        </div >
    );
};

export default InvoiceInboxView;
