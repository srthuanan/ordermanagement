import React, { useState, useMemo, useEffect } from 'react';
import moment from 'moment';
import { Order, ActionType } from '../../types';
import StatusBadge from '../ui/StatusBadge';
import CarImage from '../ui/CarImage';
import PdfThumbnail from '../ui/PdfThumbnail';
import Button from '../ui/Button';
import { toEmbeddableUrl, getDriveFileId, toDownloadableUrl } from '../../utils/imageUtils';

interface InvoiceInboxViewProps {
    orders: Order[];
    onAction: (type: ActionType, order: Order, data?: any) => void;
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

const DocumentThumbnail: React.FC<{
    url?: string;
    label: string;
    icon: string;
    onPreview: () => void;
}> = ({ url, label, icon, onPreview }) => {
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);
    const [retryStage, setRetryStage] = useState(0);
    const [useIframe, setUseIframe] = useState(false);

    const fileType = useMemo(() => {
        if (!url) return 'unknown';
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes('drive.google.com')) return 'drive';
        if (lowerUrl.includes('.pdf')) return 'pdf';
        if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)/.test(lowerUrl)) return 'image';
        return 'other';
    }, [url]);

    useEffect(() => {
        setHasError(false);
        setRetryStage(0);
        setUseIframe(false);
        if (fileType === 'drive' && url) {
            setImgSrc(toEmbeddableUrl(url, 500));
        } else if (fileType === 'image' && url) {
            setImgSrc(url);
        } else {
            setImgSrc(null);
        }
    }, [url, fileType]);

    const handleError = () => {
        if (fileType !== 'drive' || !url) {
            setHasError(true);
            return;
        }

        const fileId = getDriveFileId(url);
        if (!fileId) {
            setHasError(true);
            return;
        }

        // Fallback Strategy
        if (retryStage === 0) {
            // Stage 1: Try lh3.googleusercontent.com
            setRetryStage(1);
            setImgSrc(`https://lh3.googleusercontent.com/d/${fileId}=w500`);
        } else if (retryStage === 1) {
            // Stage 2: Try iframe preview (most robust for PDFs)
            setRetryStage(2);
            setUseIframe(true);
        } else {
            // Give up
            setHasError(true);
        }
    };

    const drivePreviewUrl = useMemo(() => {
        if (fileType === 'drive' && url) {
            const fileId = getDriveFileId(url);
            if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
        }
        return null;
    }, [url, fileType]);

    return (
        <div
            className={`flex flex-col rounded-lg border transition-all overflow-hidden group ${url ? 'border-border-secondary bg-surface-ground cursor-pointer hover:shadow-md hover:border-accent-primary' : 'border-border-secondary/50 bg-surface-ground/50 opacity-60'}`}
            onClick={() => url && onPreview()}
        >
            <div className={`w-full h-24 md:h-40 flex items-center justify-center overflow-hidden border-b border-border-secondary relative ${url ? 'bg-white' : 'bg-gray-100'}`}>
                {(fileType === 'pdf' || (fileType === 'drive' && label.toLowerCase().includes('pdf'))) && url ? (
                    <PdfThumbnail url={url} width={200} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : useIframe && drivePreviewUrl ? (
                    <>
                        <iframe
                            src={drivePreviewUrl}
                            className="w-full h-full border-0 pointer-events-none scale-[1.5] origin-top-left"
                            title={label}
                            tabIndex={-1}
                        />
                        {/* Overlay to capture clicks */}
                        <div className="absolute inset-0 bg-transparent z-10"></div>
                    </>
                ) : imgSrc && !hasError ? (
                    <img
                        src={imgSrc}
                        alt={label}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={handleError}
                    />
                ) : (
                    <i className={`fas ${fileType === 'pdf' ? 'fa-file-pdf text-red-500' : icon + (url ? ' text-accent-primary' : ' text-gray-400')} text-5xl`}></i>
                )}
            </div>

            <div className="p-2 md:p-3">
                <div className="font-bold text-xs md:text-sm text-text-primary truncate mb-1" title={label}>{label}</div>
                <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${url ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {url ? 'Đã có file' : 'Chưa có'}
                    </span>
                    {url && (
                        <div className="flex items-center gap-2">
                            <a
                                href={toDownloadableUrl(url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-text-placeholder hover:text-accent-primary transition-colors"
                                title="Tải xuống"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <i className="fas fa-download text-xs"></i>
                            </a>
                            <i className="fas fa-external-link-alt text-xs text-text-placeholder group-hover:text-accent-primary transition-colors"></i>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const InvoiceInboxView: React.FC<InvoiceInboxViewProps> = ({ orders, onAction, showToast, onOpenFilePreview, onUpdateInvoiceDetails, selectedFolder, selectedOrderId, onFolderChange, onOrderSelect }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editData, setEditData] = useState({ engineNumber: '', policy: '', po: '' });
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && selectedOrder) {
            onAction('uploadInvoice', selectedOrder, { file });
        }
        // Reset input value to allow selecting the same file again
        if (event.target) event.target.value = '';
    };

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

    // Auto-select first order if none selected or folder changes (Robust version)
    useEffect(() => {
        if (filteredOrders.length > 0) {
            const firstId = filteredOrders[0]['Số đơn hàng'];
            onOrderSelect(firstId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredOrders]);

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
            { type: 'approve', label: 'Phê Duyệt', icon: 'fa-check-double', variant: 'primary', condition: s === 'chờ phê duyệt' || s === 'đã bổ sung' },
            { type: 'supplement', label: 'Yêu Cầu Bổ Sung', icon: 'fa-exclamation-triangle', variant: 'secondary', condition: s === 'chờ phê duyệt' || s === 'đã bổ sung' },
            { type: 'pendingSignature', label: 'Chuyển Chờ Ký', icon: 'fa-signature', variant: 'primary', condition: s === 'đã phê duyệt' },
            {
                type: 'uploadInvoice',
                label: 'Tải Lên Hóa Đơn',
                icon: 'fa-upload',
                variant: 'success',
                condition: s === 'chờ ký hóa đơn',
                onClick: () => fileInputRef.current?.click()
            },
            { type: 'resend', label: 'Gửi Lại Email', icon: 'fa-paper-plane', variant: 'secondary', condition: s === 'yêu cầu bổ sung' || s === 'đã xuất hóa đơn' },
            { type: 'cancel', label: 'Hủy Yêu Cầu', icon: 'fa-trash-alt', variant: 'danger', condition: s !== 'đã xuất hóa đơn' && s !== 'đã hủy' },
        ].filter(a => a.condition);
    };


    // Mobile View State
    const [mobileView, setMobileView] = useState<'folders' | 'list' | 'detail'>('folders');

    // Update mobile view when folder or order changes
    const handleFolderChange = (folder: string) => {
        onFolderChange(folder);
        setMobileView('list');
    };

    const handleOrderSelect = (orderId: string | null) => {
        onOrderSelect(orderId);
        if (orderId) setMobileView('detail');
    };

    // Swipe Navigation Logic
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe || isRightSwipe) {
            const currentIndex = filteredOrders.findIndex(o => o['Số đơn hàng'] === selectedOrderId);
            if (currentIndex === -1) return;

            if (isLeftSwipe && currentIndex < filteredOrders.length - 1) {
                // Next Order
                handleOrderSelect(filteredOrders[currentIndex + 1]['Số đơn hàng']);
            } else if (isRightSwipe && currentIndex > 0) {
                // Previous Order
                handleOrderSelect(filteredOrders[currentIndex - 1]['Số đơn hàng']);
            }
        }
    };

    return (
        <div className="flex h-full bg-surface-card rounded-xl shadow-md border border-border-primary overflow-hidden animate-fade-in relative">
            {/* Column 1: Folders */}
            <div className={`w-full md:w-64 flex-shrink-0 border-r border-border-primary bg-surface-ground flex flex-col ${mobileView !== 'folders' ? 'hidden md:flex' : 'flex'}`}>
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {folders.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => handleFolderChange(folder.id)}
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
            <div className={`w-full md:w-64 flex-shrink-0 border-r border-border-primary flex flex-col bg-white ${mobileView !== 'list' ? 'hidden md:flex' : 'flex'}`}>
                {/* Mobile Back Button */}
                <div className="md:hidden p-2 border-b border-border-secondary flex items-center gap-2">
                    <button onClick={() => setMobileView('folders')} className="p-2 hover:bg-surface-ground rounded-full">
                        <i className="fas fa-arrow-left text-text-secondary"></i>
                    </button>
                    <span className="font-bold text-sm">Danh sách</span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredOrders.length === 0 ? (
                        <div className="p-8 text-center text-text-placeholder text-sm">Không tìm thấy đơn hàng nào.</div>
                    ) : (
                        <div className="divide-y divide-border-secondary">
                            {filteredOrders.map(order => (
                                <div
                                    key={order['Số đơn hàng']}
                                    onClick={() => handleOrderSelect(order['Số đơn hàng'])}
                                    className={`p-3 cursor-pointer hover:bg-surface-hover transition-all duration-200 group ${selectedOrderId === order['Số đơn hàng'] ? 'bg-accent-primary/10 border-l-4 border-accent-primary shadow-inner' : 'border-l-4 border-transparent'}`}
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
            <div
                className={`flex-1 flex flex-col bg-surface-ground min-w-0 ${mobileView !== 'detail' ? 'hidden md:flex' : 'flex'}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {
                    selectedOrder ? (
                        <>
                            {/* Header Actions - Compact */}
                            < div className="px-4 py-3 bg-white border-b border-border-primary flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm z-10 gap-3 md:gap-0" >
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    {/* Mobile Back Button */}
                                    <button onClick={() => setMobileView('list')} className="md:hidden p-1 hover:bg-surface-ground rounded-full mr-1">
                                        <i className="fas fa-arrow-left text-text-secondary"></i>
                                    </button>

                                    <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary font-bold text-base flex-shrink-0">
                                        {selectedOrder['Tên khách hàng'].charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h2
                                            className="text-base font-bold text-text-primary leading-tight cursor-pointer hover:text-accent-primary transition-colors truncate"
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
                                                className="font-mono cursor-pointer hover:text-accent-primary border-b border-dashed border-transparent hover:border-accent-primary transition-all truncate"
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
                                            <span className="truncate">{selectedOrder['Tên tư vấn bán hàng']}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                                    {getActions(selectedOrder['Trạng thái xử lý'] || selectedOrder['Kết quả'] || '').map(action => (
                                        <Button
                                            key={action.type}
                                            onClick={action.onClick ? action.onClick : () => onAction(action.type as any, selectedOrder)}
                                            variant={action.variant as any}
                                            size="sm"
                                            leftIcon={<i className={`fas ${action.icon}`}></i>}
                                            className="whitespace-nowrap"
                                        >
                                            {action.label}
                                        </Button>
                                    ))}
                                </div>
                            </div >

                            {/* Content - Compact */}
                            < div className="flex-1 overflow-y-auto p-2 custom-scrollbar" >
                                <div className="max-w-5xl mx-auto space-y-2">
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
                                    <div className="bg-white rounded-lg border border-border-primary shadow-sm">
                                        <div className="bg-gray-100 px-3 py-2 border-b border-border-secondary">
                                            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Thông Tin Xe</h3>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3">
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
                                </div>

                                {/* Policy & PO & Documents Grid */}
                                <div className="flex flex-col gap-2 mt-2">
                                    {/* Top Row: Policy & PO */}
                                    {/* Combined Policy & PO Card */}
                                    {/* Combined Policy & PO Card */}
                                    {/* Combined Policy & PO Card */}
                                    <div className="bg-white rounded-lg border border-border-primary shadow-sm">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-gray-100 px-3 py-2 border-b border-border-secondary items-center rounded-t-lg">
                                            <div className="md:col-span-2">
                                                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Thanh Toán & Chính Sách</h3>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">PO PIN</h3>
                                                {!isEditing ? (
                                                    <Button onClick={() => setIsEditing(true)} variant="ghost" size="sm" className="!p-1 h-auto text-accent-primary hover:text-accent-primary-hover" leftIcon={<i className="fas fa-edit"></i>}>
                                                        Sửa
                                                    </Button>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <Button onClick={handleSaveEdit} disabled={isSaving} variant="success" size="sm" className="!p-1 h-auto" leftIcon={<i className="fas fa-save"></i>}>
                                                            Lưu
                                                        </Button>
                                                        <Button onClick={() => setIsEditing(false)} disabled={isSaving} variant="danger" size="sm" className="!p-1 h-auto" leftIcon={<i className="fas fa-times"></i>}>
                                                            Hủy
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3">
                                            {/* Policy Content */}
                                            <div className="md:col-span-2">
                                                {isEditing ? (
                                                    <textarea
                                                        value={editData.policy}
                                                        onChange={e => setEditData({ ...editData, policy: e.target.value })}
                                                        rows={5}
                                                        className="w-full text-xs border border-accent-primary rounded px-2 py-1"
                                                    />
                                                ) : (
                                                    <div className="text-xs whitespace-pre-wrap bg-surface-ground p-2 rounded border border-border-secondary">{selectedOrder['CHÍNH SÁCH'] || 'Không có'}</div>
                                                )}
                                            </div>

                                            {/* PO PIN Content */}
                                            <div className="flex flex-col">
                                                <div className="flex-1 flex flex-col justify-center">
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={editData.po}
                                                            onChange={e => setEditData({ ...editData, po: e.target.value })}
                                                            className="w-full text-xs border border-accent-primary rounded px-2 py-1 font-mono"
                                                        />
                                                    ) : (
                                                        <CopyableField text={selectedOrder['PO PIN'] || ''} showToast={showToast} className="font-mono text-sm font-bold bg-surface-ground p-3 rounded border border-border-secondary block break-words text-center" wrap={true} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Row: Documents */}
                                    <div className="bg-white rounded-lg border border-border-primary shadow-sm flex flex-col h-full">
                                        <div className="bg-gray-100 px-3 py-2 border-b border-border-secondary">
                                            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Hồ Sơ Đính Kèm</h3>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3">
                                            {[{ key: 'LinkHopDong', label: 'Hợp đồng', icon: 'fa-file-contract' }, { key: 'LinkDeNghiXHD', label: 'Đề nghị XHĐ', icon: 'fa-file-invoice' }, { key: 'LinkHoaDonDaXuat', label: 'Hóa Đơn Đã Xuất', icon: 'fa-file-invoice-dollar' }].map(file => {
                                                const url = selectedOrder[file.key] as string | undefined;
                                                return (
                                                    <DocumentThumbnail
                                                        key={file.key}
                                                        url={url}
                                                        label={file.label}
                                                        icon={file.icon}
                                                        onPreview={() => url && onOpenFilePreview(url, `${file.label} - ${selectedOrder["Tên khách hàng"]}`)}
                                                    />
                                                );
                                            })}
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
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.jpeg,.png,.jpg"
                onChange={handleFileChange}
            />
        </div >
    );
};

export default InvoiceInboxView;
