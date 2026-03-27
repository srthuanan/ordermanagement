import React, { useState, useMemo, useEffect } from 'react';
import moment from 'moment';
import { Order, ActionType } from '../../types';
import StatusBadge from '../ui/StatusBadge';
import CarImage from '../ui/CarImage';
import PdfThumbnail from '../ui/PdfThumbnail';
import Button from '../ui/Button';
import { toEmbeddableUrl, getDriveFileId, forceDownload, getSanitizedFilename } from '../../utils/imageUtils';
import AnimatedBackground from '../ui/AnimatedBackground';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';
import { supabase } from '../../services/supabaseClient';

interface InvoiceInboxViewProps {
    orders: Order[];
    onAction: (type: ActionType, order: Order, data?: any) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onOpenFilePreview: (url: string, label: string) => void;
    onUpdateInvoiceDetails?: (orderNumber: string, data: { engineNumber: string; policy: string; commission: string; vpoint: string }) => Promise<boolean>;
    selectedFolder: string;
    selectedOrderId: string | null;
    onFolderChange: (folder: string) => void;
    onOrderSelect: (orderId: string | null) => void;
    processingId?: string | null;
    processingActionType?: ActionType | null;
    isLoading?: boolean;
}


const CopyableField: React.FC<{ text: string; showToast?: Function; className?: string; label?: string; wrap?: boolean }> = ({ text, className, label, wrap = false }) => {
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
    customerName?: string;
}> = ({ url, label, icon, onPreview, customerName }) => {
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

        if (retryStage === 0) {
            setRetryStage(1);
            setImgSrc(`https://lh3.googleusercontent.com/d/${fileId}=w500`);
        } else if (retryStage === 1) {
            setRetryStage(2);
            setUseIframe(true);
        } else {
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
            className={`flex flex-col rounded-xl border transition-all overflow-hidden group h-full min-h-0 ${url ? 'border-gray-200 bg-white cursor-pointer hover:shadow-md hover:border-accent-primary' : 'border-gray-100 bg-gray-50/50 opacity-60'}`}
            onClick={() => url && onPreview()}
        >
            <div className={`flex-1 min-h-0 flex items-center justify-center overflow-hidden relative ${url ? 'bg-white' : 'bg-gray-50'}`}>
                {(fileType === 'pdf' || (fileType === 'drive' && label.toLowerCase().includes('pdf'))) && url ? (
                    <PdfThumbnail url={url} width={400} className="w-full h-full object-cover object-top transition-transform duration-500 scale-[1.3] group-hover:scale-[1.6]" />
                ) : useIframe && drivePreviewUrl ? (
                    <>
                        <iframe
                            src={drivePreviewUrl}
                            className="w-full h-full border-0 pointer-events-none scale-[1.5] origin-top-left"
                            title={label}
                            tabIndex={-1}
                        />
                        <div className="absolute inset-0 bg-transparent z-10"></div>
                    </>
                ) : imgSrc && !hasError ? (
                    <img
                        src={imgSrc}
                        alt={label}
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        onError={handleError}
                    />
                ) : (
                    <i className={`fas ${fileType === 'pdf' ? 'fa-file-pdf text-red-500' : icon + (url ? ' text-accent-primary' : ' text-gray-400')} text-3xl opacity-50`}></i>
                )}
                {url && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                        <i className="fas fa-search-plus text-accent-primary opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300"></i>
                    </div>
                )}
            </div>

            <div className="px-2 py-1.5 border-t border-gray-100 bg-white flex-shrink-0">
                <div className="flex items-center justify-between gap-2 overflow-hidden">
                    <div className="font-bold text-[10px] text-gray-700 truncate min-w-0 flex-1" title={label}>{label}</div>
                    {url && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    forceDownload(url, getSanitizedFilename(customerName, label, url));
                                }}
                                className="text-gray-400 hover:text-accent-primary transition-colors p-0.5"
                                title="Tải xuống"
                            >
                                <i className="fas fa-download text-[9px]"></i>
                            </button>
                            <i className="fas fa-external-link-alt text-[9px] text-gray-400 group-hover:text-accent-primary transition-colors"></i>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const InvoiceInboxView: React.FC<InvoiceInboxViewProps> = ({
    orders,
    onAction,
    showToast,
    onOpenFilePreview,
    onUpdateInvoiceDetails,
    selectedFolder,
    selectedOrderId,
    onFolderChange,
    onOrderSelect,
    processingId,
    processingActionType,
    isLoading = false
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editData, setEditData] = useState({ engineNumber: '', policy: '', commission: '', vpoint: '' });
    const [dbPolicies, setDbPolicies] = useState<{ten_chinh_sach: string, dong_xe: string}[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const copyWithFeedback = useCopyFeedback();

    useEffect(() => {
        const fetchPolicies = async () => {
            try {
                const { data } = await supabase
                    .from('chinhsach')
                    .select('ten_chinh_sach, dong_xe')
                    .eq('trang_thai', 'Hoạt động')
                    .order('ten_chinh_sach', { ascending: true });
                if (data) {
                    setDbPolicies(data);
                }
            } catch (e) {
                console.error('Lỗi fetch policies từ supabase', e);
            }
        };
        fetchPolicies();
    }, []);

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
            const status = (order['Trạng thái xử lý'] || order['Kết quả'] || '').toLowerCase().trim().normalize('NFC');
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
    }, [selectedFolder]);

    // Sync edit data
    useEffect(() => {
        if (selectedOrder && !isEditing) {
            setEditData({
                engineNumber: selectedOrder["Số động cơ"] || '',
                policy: selectedOrder["CHÍNH SÁCH"] || '',
                commission: selectedOrder["Hoa hồng ứng"] || '',
                vpoint: selectedOrder["Điểm Vpoint sử dụng"] || ''
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
        { id: 'pending_approval', label: 'Chờ Phê Duyệt', icon: 'fa-clock', count: orders.filter(o => (o['Trạng thái xử lý'] || o['Kết quả'] || '').toLowerCase().trim().normalize('NFC') === 'chờ phê duyệt').length },
        { id: 'approved', label: 'Đã Phê Duyệt', icon: 'fa-check', count: orders.filter(o => (o['Trạng thái xử lý'] || o['Kết quả'] || '').toLowerCase().trim().normalize('NFC') === 'đã phê duyệt').length },
        { id: 'request_supplement', label: 'Yêu Cầu Bổ Sung', icon: 'fa-exclamation-circle', count: orders.filter(o => (o['Trạng thái xử lý'] || o['Kết quả'] || '').toLowerCase().trim().normalize('NFC') === 'yêu cầu bổ sung').length },
        { id: 'supplemented', label: 'Đã Bổ Sung', icon: 'fa-plus-circle', count: orders.filter(o => (o['Trạng thái xử lý'] || o['Kết quả'] || '').toLowerCase().trim().normalize('NFC') === 'đã bổ sung').length },
        { id: 'pending_signature', label: 'Chờ Ký Hóa Đơn', icon: 'fa-file-signature', count: orders.filter(o => { const s = (o['Trạng thái xử lý'] || o['Kết quả'] || '').toLowerCase().trim().normalize('NFC'); return s === 'chờ ký hóa đơn' || s === 'chờ ký hóa đơn'; }).length },
        { id: 'completed', label: 'Đã Xuất Hóa Đơn', icon: 'fa-check-double', count: orders.filter(o => (o['Trạng thái xử lý'] || o['Kết quả'] || '').toLowerCase().trim().normalize('NFC') === 'đã xuất hóa đơn').length },
        { id: 'all', label: 'Tất Cả', icon: 'fa-list', count: orders.length },
    ];

    const getActions = (status: string) => {
        const s = status.toLowerCase().trim().normalize('NFC');
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
            { type: 'cancel', label: 'Hủy Yêu Cầu', icon: 'fa-trash-alt', variant: 'danger', condition: s !== 'đã xuất hóa đơn' && s !== 'đã hủy' && s !== 'chờ ký hóa đơn' && s !== 'chờ ký hóa đơn' },
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

    // Group orders by Invoice Date for 'pending_signature' folder
    const groupedOrders = useMemo(() => {
        if (selectedFolder !== 'pending_signature') return null;

        const groups: { [key: string]: Order[] } = {};
        filteredOrders.forEach(order => {
            const dateVal = order['Ngày xuất hóa đơn'];
            const dateStr = dateVal ? moment(dateVal).format('DD/MM/YYYY') : 'Chưa có ngày';
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(order);
        });

        // Return array of [date, orders] sorted by date
        return Object.entries(groups).sort((a, b) => {
            if (a[0] === 'Chưa có ngày') return 1;
            if (b[0] === 'Chưa có ngày') return -1;
            return moment(a[0], 'DD/MM/YYYY').valueOf() - moment(b[0], 'DD/MM/YYYY').valueOf();
        });
    }, [filteredOrders, selectedFolder]);

    const renderOrder = (order: Order) => {
        const isSelected = selectedOrderId === order['Số đơn hàng'];
        return (
            <div
                key={order['Số đơn hàng']}
                onClick={() => handleOrderSelect(order['Số đơn hàng'])}
                className={`px-4 py-3 cursor-pointer transition-all duration-300 group relative border-l-2 ${isSelected
                    ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] border-accent-primary z-10'
                    : 'bg-transparent border-transparent hover:bg-slate-50/80 hover:border-slate-200'
                    }`}
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div
                            className={`text-[13px] font-bold truncate mb-1 cursor-pointer transition-colors ${isSelected ? 'text-accent-primary' : 'text-slate-700 group-hover:text-accent-primary'
                                }`}
                            title="Click để sao chép tên khách hàng"
                            onClick={(e) => {
                                e.stopPropagation();
                                copyWithFeedback(order['Tên khách hàng'], e);
                            }}
                        >
                            {order['Tên khách hàng']}
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 leading-none">
                                <span>{order['Dòng xe']}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                <span className="truncate">{order['Phiên bản']}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-slate-400 font-medium mt-0.5">
                                <i className="fas fa-user-tie text-[8px] opacity-40"></i>
                                <span>{order['Tên tư vấn bán hàng']}</span>
                            </div>
                            <div className="text-[9px] text-slate-300 font-mono mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {order['Số đơn hàng']}
                            </div>
                        </div>
                    </div>
                    <div className="w-14 h-11 flex-shrink-0 relative overflow-hidden bg-slate-50 rounded-lg border border-slate-100/50 p-1 group-hover:bg-white transition-colors">
                        <CarImage
                            model={order['Dòng xe']}
                            exteriorColor={order['Ngoại thất']}
                            className={`w-full h-full object-contain transition-all duration-500 ${isSelected ? 'scale-110 rotate-[-2deg]' : 'opacity-60 scale-95 grayscale-[30%] group-hover:opacity-100 group-hover:scale-105 group-hover:grayscale-0'
                                }`}
                        />
                    </div>
                </div>

                {/* Status indicator on mobile list */}
                <div className="mt-2.5 flex items-center justify-between md:hidden border-t border-slate-100/50 pt-2">
                    <StatusBadge status={order['Trạng thái xử lý'] || order['Kết quả'] || ''} size="sm" />
                    <span className="text-[9px] text-slate-400 font-mono font-medium">{order['Số đơn hàng'].split('-').pop()}</span>
                </div>

                {/* Desktop subtle status dot */}
                {!isSelected && (
                    <div className={`absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full transition-all duration-300 ${order['Trạng thái xử lý'] === 'Cần xử lý' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'bg-transparent opacity-0 group-hover:opacity-20 group-hover:bg-slate-300'}`}></div>
                )}
            </div>
        );
    };

    return (
        <div className="flex h-full bg-slate-50 md:rounded-xl shadow-md border-0 md:border border-border-primary overflow-hidden animate-fade-in relative z-0">
            <AnimatedBackground />
            {/* Column 1: Folders */}
            <div className={`w-full md:w-64 flex-shrink-0 border-r border-border-primary bg-surface-ground/90 flex flex-col relative z-10 ${mobileView !== 'folders' ? 'hidden md:flex' : 'flex'}`}>
                <div className="md:hidden p-3 bg-white border-b border-border-secondary flex items-center justify-center relative">
                    <span className="font-bold text-sm">Hóa Đơn</span>
                </div>
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
            <div className={`w-full md:w-64 flex-shrink-0 border-r border-border-primary flex flex-col bg-white/90 relative z-10 ${mobileView !== 'list' ? 'hidden md:flex' : 'flex'}`}>
                {/* Mobile Back Button */}
                <div className="md:hidden p-2.5 bg-white border-b border-border-secondary flex items-center gap-2">
                    <button onClick={() => setMobileView('folders')} className="p-1.5 hover:bg-surface-ground rounded-full">
                        <i className="fas fa-arrow-left text-gray-500"></i>
                    </button>
                    <span className="font-bold text-sm">
                        {folders.find(f => f.id === selectedFolder)?.label || 'Danh sách'}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading && filteredOrders.length === 0 ? (
                        <div className="divide-y divide-border-secondary">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="p-4 md:p-3 flex items-center justify-between">
                                    <div className="flex-1 space-y-2">
                                        <div className="skeleton-item h-4 w-3/4 rounded-md"></div>
                                        <div className="skeleton-item h-3 w-1/2 rounded-md"></div>
                                    </div>
                                    <div className="skeleton-item h-10 w-16 rounded-lg ml-3"></div>
                                </div>
                            ))}
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 h-full bg-slate-50/50">
                            <div className="w-16 h-16 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center mb-4">
                                <i className="fas fa-inbox text-gray-300 text-2xl"></i>
                            </div>
                            <p className="text-sm font-semibold text-gray-400 text-center">Không có đơn hàng</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border-secondary">
                            {groupedOrders ? (
                                groupedOrders.map(([date, groupOrders]) => (
                                    <React.Fragment key={date}>
                                        <div className="bg-surface-ground px-3 py-2 text-xs font-bold text-text-secondary sticky top-0 z-10 border-b border-border-secondary flex justify-between items-center shadow-sm">
                                            <span>{date}</span>
                                            <span className="bg-surface-card px-1.5 py-0.5 rounded-full text-[10px] border border-border-secondary">{groupOrders.length}</span>
                                        </div>
                                        {groupOrders.map(order => renderOrder(order))}
                                    </React.Fragment>
                                ))
                            ) : (
                                filteredOrders.map(order => renderOrder(order))
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* Column 3: Detail */}
            <div
                className={`flex-1 flex flex-col bg-surface-ground/90 min-w-0 relative z-10 ${mobileView !== 'detail' ? 'hidden md:flex' : 'flex'}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {
                    selectedOrder ? (
                        <>
                            {/* Header Actions - Compact */}
                            {/* Clean Compact Header */}
                            <div className="bg-white border-b border-gray-100 z-10">
                                <div className="px-4 md:px-6 py-2 md:py-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-8">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {/* Mobile Back Button - Premium Refined */}
                                        <button
                                            onClick={() => setMobileView('list')}
                                            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 active:scale-90 transition-all shadow-sm"
                                        >
                                            <i className="fas fa-arrow-left text-xs"></i>
                                        </button>

                                        {/* Avatar - Elevated Design */}
                                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/50 border border-indigo-100/50 flex items-center justify-center text-accent-primary font-black text-lg md:text-xl flex-shrink-0 shadow-sm ring-4 ring-white">
                                            {selectedOrder['Tên khách hàng'].charAt(0)}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5 overflow-hidden">
                                                <h2
                                                    className="text-sm md:text-base font-black text-slate-800 truncate cursor-pointer hover:text-accent-primary transition-colors tracking-tight"
                                                    title="Click để sao chép tên khách hàng"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        copyWithFeedback(selectedOrder['Tên khách hàng'], e);
                                                    }}
                                                >
                                                    {selectedOrder['Tên khách hàng']}
                                                </h2>
                                                <StatusBadge status={selectedOrder['Trạng thái xử lý'] || selectedOrder['Kết quả'] || ''} size="sm" />
                                            </div>

                                            {/* Consultant Name - Added */}
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 border border-slate-200/50">
                                                    <i className="fas fa-user-tie text-[8px] opacity-60"></i>
                                                    <span className="uppercase tracking-tighter">TVBH: {selectedOrder['Tên tư vấn bán hàng'] || 'Chưa rõ'}</span>
                                                </div>
                                            </div>


                                        </div>
                                    </div>

                                    {/* Right Actions - Refined Grouping */}
                                    {/* Right Actions - Minimalist Grouping */}
                                    <div className="flex items-center gap-2 p-1 bg-slate-50/80 rounded-xl border border-slate-200/50 ml-auto overflow-x-auto no-scrollbar">
                                        {getActions(selectedOrder['Trạng thái xử lý'] || selectedOrder['Kết quả'] || '').map(action => {
                                            let variant: 'primary' | 'success' | 'danger' | 'secondary' = 'primary';

                                            switch (action.type) {
                                                case 'approve': variant = 'success'; break;
                                                case 'cancel': variant = 'danger'; break;
                                                case 'supplement': variant = 'secondary'; break;
                                                default: variant = action.variant === 'success' ? 'success' : (action.variant === 'danger' ? 'danger' : (action.variant === 'secondary' ? 'secondary' : 'primary'));
                                            }

                                            return (
                                                <Button
                                                    key={action.type}
                                                    onClick={action.onClick ? action.onClick : () => onAction(action.type as any, selectedOrder)}
                                                    variant={variant}
                                                    size="sm"
                                                    leftIcon={<i className={`fas ${action.icon} text-[10px]`}></i>}
                                                    className="font-bold px-3"
                                                    isLoading={processingId === selectedOrder['Số đơn hàng'] && processingActionType === action.type}
                                                    disabled={!!processingId}
                                                >
                                                    {action.label}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Main Content Area */}
                            <div className="flex-1 p-2 md:p-3 flex flex-col gap-2 md:gap-3 min-h-0 overflow-y-auto bg-gray-50/30 lg:overflow-hidden">
                                {/* Top Row: 3 Columns Info */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-shrink-0">
                                    {/* Column 1: Vehicle & Specs */}
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
                                        <div className="bg-gray-50/50 px-3 py-1.5 border-b border-gray-100 flex items-center gap-2">
                                            <i className="fas fa-car text-accent-primary text-[10px]"></i>
                                            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Thông tin xe</h3>
                                        </div>
                                        <div className="p-3 space-y-1">
                                            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors group">
                                                <div className="flex items-center gap-2.5">
                                                    <i className="fas fa-car text-blue-500 opacity-40 group-hover:opacity-100 text-[10px] transition-opacity"></i>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Dòng xe / Phiên bản</span>
                                                </div>
                                                <span className="text-[10px] font-black text-gray-900 truncate ml-4" title={`${selectedOrder['Dòng xe']} - ${selectedOrder['Phiên bản']}`}>
                                                    {selectedOrder['Dòng xe']} - {selectedOrder['Phiên bản']}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors group">
                                                <div className="flex items-center gap-2.5">
                                                    <i className="fas fa-palette text-orange-400 opacity-40 group-hover:opacity-100 text-[10px] transition-opacity"></i>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Màu sắc</span>
                                                </div>
                                                <span className="text-[10px] font-black text-gray-700 truncate ml-4" title={`${selectedOrder['Ngoại thất']} / ${selectedOrder['Nội thất']}`}>
                                                    {selectedOrder['Ngoại thất']} / {selectedOrder['Nội thất']}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors group">
                                                <div className="flex items-center gap-2.5">
                                                    <i className="fas fa-fingerprint text-accent-primary opacity-40 group-hover:opacity-100 text-[10px] transition-opacity"></i>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Số VIN</span>
                                                </div>
                                                <div className="text-sm font-black text-accent-primary truncate ml-4 font-mono tracking-normal bg-accent-primary/5 px-2 py-0.5 rounded border border-accent-primary/10">
                                                    <CopyableField text={selectedOrder.VIN || ''} showToast={showToast} />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors group border-t border-gray-50 mt-1 pt-2">
                                                <div className="flex items-center gap-2.5">
                                                    <i className="fas fa-cogs text-gray-400 opacity-40 group-hover:opacity-100 text-[10px] transition-opacity"></i>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Số Máy</span>
                                                </div>
                                                <div className="text-[10px] font-black text-gray-600 truncate ml-4 font-mono">
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={editData.engineNumber}
                                                            onChange={e => setEditData({ ...editData, engineNumber: e.target.value })}
                                                            className="w-full text-[10px] border border-accent-primary/30 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-accent-primary text-right"
                                                        />
                                                    ) : (
                                                        <CopyableField text={selectedOrder['Số động cơ'] || ''} showToast={showToast} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Transaction Details */}
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
                                        <div className="bg-gray-50/50 px-3 py-1.5 border-b border-gray-100 flex items-center gap-2">
                                            <i className="fas fa-receipt text-accent-primary text-[10px]"></i>
                                            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Giao dịch</h3>
                                        </div>
                                        <div className="p-3 space-y-3">
                                            <div className="text-left">
                                                <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 ml-0.5">Số đơn hàng</div>
                                                <div className="flex justify-center bg-gray-50/50 border border-gray-100 rounded-lg py-1">
                                                    <CopyableField text={selectedOrder['Số đơn hàng'] || ''} showToast={showToast} className="text-xs font-bold text-accent-primary truncate font-mono" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex flex-col">
                                                    <div className="text-[8px] font-black text-green-600/50 uppercase tracking-tighter mb-0.5 ml-0.5">Hoa hồng ứng</div>
                                                    <div className="w-full bg-green-50/50 border border-green-100 rounded-lg px-2.5 py-1.5 flex items-baseline justify-center">
                                                        <span className="text-xs font-black text-green-600">
                                                            {isEditing ? (
                                                                <input type="text" value={editData.commission} onChange={e => setEditData({ ...editData, commission: e.target.value })} className="w-full bg-transparent focus:outline-none text-center" />
                                                            ) : (
                                                                `${Number(String(selectedOrder['Hoa hồng ứng'] || 0).replace(/[^0-9]/g, '')).toLocaleString()}đ`
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="text-[8px] font-black text-blue-600/50 uppercase tracking-tighter mb-0.5 ml-0.5">Vpoint sử dụng</div>
                                                    <div className="w-full bg-blue-50/50 border border-blue-100 rounded-lg px-2.5 py-1.5 flex items-baseline justify-center">
                                                        <span className="text-xs font-black text-blue-600">
                                                            {isEditing ? (
                                                                <input type="text" value={editData.vpoint} onChange={e => setEditData({ ...editData, vpoint: e.target.value })} className="w-full bg-transparent focus:outline-none text-center" />
                                                            ) : (
                                                                `${Number(String(selectedOrder['Điểm Vpoint sử dụng'] || 0).replace(/[^0-9]/g, '')).toLocaleString()}`
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Date Info */}
                                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-50">
                                                <div className="flex flex-col">
                                                    <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 ml-0.5">Ngày yêu cầu</div>
                                                    <div className="bg-gray-50/30 rounded-lg px-2 py-1 flex items-center justify-center gap-1.5">
                                                        <i className="far fa-clock text-[9px] text-gray-400"></i>
                                                        <span className="text-[10px] font-bold text-gray-600">{moment(selectedOrder['Thời gian nhập']).format('HH:mm DD/MM/YYYY')}</span>
                                                    </div>
                                                </div>
                                                {selectedOrder['Ngày xuất hóa đơn'] && (
                                                    <div className="flex flex-col">
                                                        <div className="text-[8px] font-bold text-blue-400 uppercase tracking-wider mb-0.5 ml-0.5">Ngày xuất HĐ</div>
                                                        <div className="bg-blue-50/30 rounded-lg px-2 py-1 flex items-center justify-center gap-1.5">
                                                            <i className="fas fa-file-invoice text-[9px] text-blue-400"></i>
                                                            <span className="text-[10px] font-bold text-blue-600">{moment(selectedOrder['Ngày xuất hóa đơn']).format('HH:mm DD/MM/YYYY')}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 3: Policy List */}
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
                                        <div className="bg-gray-50/50 px-3 py-1.5 border-b border-gray-100 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-shield-alt text-accent-primary text-[10px]"></i>
                                                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Chính sách</h3>
                                            </div>
                                            {!isEditing ? (
                                                <button onClick={() => setIsEditing(true)} className="text-[9px] font-bold text-accent-primary hover:text-accent-primary-hover flex items-center gap-1 transition-colors">
                                                    <i className="fas fa-edit"></i> SỬA
                                                </button>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <button onClick={handleSaveEdit} disabled={isSaving} className="text-[8px] font-bold text-green-600 hover:text-green-700 disabled:opacity-50">LƯU</button>
                                                    <button onClick={() => setIsEditing(false)} disabled={isSaving} className="text-[8px] font-bold text-red-500 hover:text-red-600 disabled:opacity-50">HỦY</button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 p-3 overflow-hidden min-h-[100px]">
                                            {isEditing ? (
                                                <div className="w-full max-h-[400px] overflow-y-auto custom-scrollbar">
                                                    {(() => {
                                                        const orderCarModel = (selectedOrder?.['Dòng xe'] || '').toLowerCase().replace(/\s+/g, '');
                                                        const selectedPolicies = editData.policy
                                                            ? editData.policy.split(',').map(s => s.trim()).filter(Boolean)
                                                            : [];

                                                        const dbPolicyNames = dbPolicies.map(p => p.ten_chinh_sach);
                                                        const unmatchedPolicies = selectedPolicies.filter(p => !dbPolicyNames.includes(p));
                                                        const matchedSelected = selectedPolicies.filter(p => dbPolicyNames.includes(p));

                                                        const visiblePolicies = dbPolicies.filter(p => {
                                                            const dx = (p.dong_xe || '').toLowerCase();
                                                            if (!dx || dx.trim() === '' || dx.includes('tất cả') || dx === 'all') return true;
                                                            if (!orderCarModel) return true;
                                                            const dxArr = dx.split(',').map(s => s.replace(/\s+/g, ''));
                                                            return dxArr.some(d => orderCarModel.includes(d) || d.includes(orderCarModel));
                                                        });

                                                        const togglePolicy = (name: string) => {
                                                            const current = editData.policy
                                                                ? editData.policy.split(',').map(s => s.trim()).filter(Boolean)
                                                                : [];
                                                            const exists = current.includes(name);
                                                            const updated = exists
                                                                ? current.filter(p => p !== name)
                                                                : [...current, name];
                                                            setEditData({ ...editData, policy: updated.join(', ') });
                                                        };

                                                        const removeUnmatched = (name: string) => {
                                                            const current = editData.policy
                                                                ? editData.policy.split(',').map(s => s.trim()).filter(Boolean)
                                                                : [];
                                                            const updated = current.filter(p => p !== name);
                                                            setEditData({ ...editData, policy: updated.join(', ') });
                                                        };

                                                        const clearAll = () => {
                                                            setEditData({ ...editData, policy: '' });
                                                        };

                                                        return (
                                                            <div className="space-y-2 p-1">
                                                                {/* Header with count and clear button */}
                                                                <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                                                                    <span className="text-[9px] text-gray-500 font-medium">
                                                                        Đã chọn: <b className="text-accent-primary">{matchedSelected.length}</b>
                                                                    </span>
                                                                    {selectedPolicies.length > 0 && (
                                                                        <button
                                                                            onClick={clearAll}
                                                                            className="text-[9px] text-red-500 hover:text-red-700 font-bold transition-colors"
                                                                        >
                                                                            <i className="fas fa-trash-alt mr-1"></i>Xóa tất cả
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* Show old unmatched policies as removable tags */}
                                                                {unmatchedPolicies.length > 0 && (
                                                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                                                                        <p className="text-[9px] text-amber-700 font-bold mb-1">
                                                                            <i className="fas fa-exclamation-triangle mr-1"></i>
                                                                            CS cũ không khớp ({unmatchedPolicies.length}):
                                                                        </p>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {unmatchedPolicies.map(name => (
                                                                                <span 
                                                                                    key={name}
                                                                                    className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-medium"
                                                                                >
                                                                                    {name.length > 25 ? name.substring(0, 25) + '...' : name}
                                                                                    <button 
                                                                                        onClick={() => removeUnmatched(name)}
                                                                                        className="text-amber-600 hover:text-red-600 ml-0.5"
                                                                                    >
                                                                                        <i className="fas fa-times text-[7px]"></i>
                                                                                    </button>
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Checkbox list */}
                                                                {visiblePolicies.length === 0 && (
                                                                    <p className="text-[10px] text-gray-400 italic p-2">Không có chính sách phù hợp</p>
                                                                )}
                                                                {visiblePolicies.map(p => {
                                                                    const isChecked = selectedPolicies.includes(p.ten_chinh_sach);
                                                                    return (
                                                                        <label
                                                                            key={p.ten_chinh_sach}
                                                                            className={`flex items-start gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                                                                                isChecked
                                                                                    ? 'bg-accent-primary/10 border border-accent-primary/30'
                                                                                    : 'hover:bg-gray-50 border border-transparent'
                                                                            }`}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={() => togglePolicy(p.ten_chinh_sach)}
                                                                                className="mt-0.5 accent-accent-primary flex-shrink-0"
                                                                            />
                                                                            <span className={`text-[10px] leading-snug font-medium ${
                                                                                isChecked ? 'text-accent-primary' : 'text-gray-700'
                                                                            }`}>
                                                                                {p.ten_chinh_sach}
                                                                            </span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="h-full overflow-y-auto custom-scrollbar">
                                                    <div className="text-[10px] text-gray-700 leading-relaxed">
                                                        {selectedOrder['CHÍNH SÁCH'] ? (
                                                            <div className="space-y-2">
                                                                {(() => {
                                                                    const rawPolicies = selectedOrder['CHÍNH SÁCH'] || '';
                                                                    let cleanPoliciesStr = rawPolicies;
                                                                    const aiNotes: string[] = [];
                                                                    
                                                                    // Extract success notes
                                                                    const successMatch = cleanPoliciesStr.match(/✅[^⚠️]*(?=(?:⚠️)|$)/);
                                                                    if (successMatch) {
                                                                        aiNotes.push(successMatch[0].trim());
                                                                        cleanPoliciesStr = cleanPoliciesStr.replace(successMatch[0], '');
                                                                    }
                                                                    
                                                                    // Extract error notes
                                                                    const errorMatch = cleanPoliciesStr.match(/⚠️[^✅]*(?=(?:✅)|$)/);
                                                                    if (errorMatch) {
                                                                        aiNotes.push(errorMatch[0].trim());
                                                                        cleanPoliciesStr = cleanPoliciesStr.replace(errorMatch[0], '');
                                                                    }
                                                                    
                                                                    cleanPoliciesStr = cleanPoliciesStr.replace(/^[,\s]+|[,\s]+$/g, '');

                                                                    let parsedPolicies: string[] = [];

                                                                    if (cleanPoliciesStr) {
                                                                        if (dbPolicies && dbPolicies.length > 0) {
                                                                            let remainingStr = cleanPoliciesStr;
                                                                            const matches: { policy: string, index: number }[] = [];
                                                                            
                                                                            for (const p of dbPolicies) {
                                                                                const name = p.ten_chinh_sach;
                                                                                if (name && remainingStr.includes(name)) {
                                                                                    matches.push({ policy: name, index: cleanPoliciesStr.indexOf(name) });
                                                                                    remainingStr = remainingStr.replace(name, '');
                                                                                }
                                                                            }
                                                                            matches.sort((a, b) => a.index - b.index);
                                                                            const sortedMatchedPolicies = matches.map(m => m.policy);

                                                                            const leftover = remainingStr.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 1 && !/^[\s,;\.]+$/.test(s));
                                                                            parsedPolicies = [...sortedMatchedPolicies, ...leftover];
                                                                        } else {
                                                                            const parts = cleanPoliciesStr.split(/(?<!\d),(?![^(]*\))|,(?!\d)(?![^(]*\))/);
                                                                            for (const p of parts) {
                                                                                const item = p ? p.trim() : '';
                                                                                if (!item) continue;
                                                                                
                                                                                if (parsedPolicies.length > 0 && !/[\d%]|Giảm|Tặng|VinClub|Voucher|Miễn|Thẻ|BH|Bảo hiểm/i.test(item) && item.split(' ').length <= 6) {
                                                                                    parsedPolicies[parsedPolicies.length - 1] += ', ' + item;
                                                                                } else {
                                                                                    parsedPolicies.push(item);
                                                                                }
                                                                            }
                                                                        }
                                                                    }

                                                                    return (
                                                                        <>
                                                                            {parsedPolicies.length > 0 ? (
                                                                                <div className="space-y-1.5 mb-3">
                                                                                    {parsedPolicies.map((item, idx) => (
                                                                                        <div key={`p-${idx}`} className="flex items-start gap-2 group">
                                                                                            <div className="w-1.5 h-1.5 rounded-full bg-accent-primary mt-1 flex-shrink-0 opacity-40"></div>
                                                                                            <span className="font-semibold text-gray-600 truncate-2-lines">{item}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : (!aiNotes.length && <span className="text-gray-400 italic">Không có</span>)}
                                                                            
                                                                            {aiNotes.length > 0 && (
                                                                                <div className="space-y-2 mt-2 pt-2 border-t border-gray-100 flex flex-col">
                                                                                    {aiNotes.map((note, idx) => {
                                                                                        const isSuccess = note.includes('✅');
                                                                                        return (
                                                                                            <div key={`ai-${idx}`} className={`p-2.5 rounded-lg border ${isSuccess ? 'bg-success/5 border-success/30 text-success' : 'bg-danger/5 border-danger/30 text-danger animate-pulse'}`}>
                                                                                                <div className="flex items-start gap-2">
                                                                                                    <i className={`fas mt-0.5 ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
                                                                                                    <span className="font-bold text-[10px] leading-snug">{note.replace(/^[✅⚠️]\s*/, '')}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center h-full py-4 text-gray-400 opacity-60">
                                                                <i className="fas fa-info-circle mb-1 text-xs"></i>
                                                                <span className="italic text-[9px]">Chưa có chính sách</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Documents Section - Fills remaining space on large screens, expands on mobile */}
                                <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex flex-col min-h-0 lg:flex-1">
                                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-50">
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-folder-open text-accent-primary text-[10px]"></i>
                                            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hồ Sơ Chứng Từ</h3>
                                        </div>
                                        <div className="text-[9px] font-bold text-accent-primary bg-accent-primary/5 px-2.5 py-0.5 rounded-full">
                                            Chứng từ đính kèm
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-0 overflow-visible lg:overflow-hidden">
                                        <div className="flex flex-col lg:flex-row gap-3 lg:h-full pb-1">
                                            {[
                                                { key: 'LinkHopDong', label: 'Hợp đồng MB', icon: 'fa-file-contract' },
                                                { key: 'LinkDeNghiXHD', label: 'Đề nghị XHĐ', icon: 'fa-file-invoice' },
                                                { key: 'LinkHoaDonDaXuat', label: 'Hóa Đơn Red', icon: 'fa-file-invoice-dollar' }
                                            ].map(file => {
                                                const url = selectedOrder[file.key] as string | undefined;
                                                return (
                                                    <div key={file.key} className="h-48 lg:h-full flex-none lg:flex-1 lg:min-w-[200px]">
                                                        <DocumentThumbnail
                                                            url={url}
                                                            label={file.label}
                                                            icon={file.icon}
                                                            onPreview={() => url && onOpenFilePreview(url, `${file.label} - ${selectedOrder["Tên khách hàng"]}`)}
                                                            customerName={selectedOrder["Tên khách hàng"]}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 w-full h-full bg-slate-50">
                            <div className="relative w-24 h-24 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center mb-6">
                                <div className="absolute inset-0 border border-gray-200/60 rounded-full transform scale-110"></div>
                                <div className="absolute inset-0 border border-gray-100 rounded-full transform scale-125"></div>
                                <i className="fas fa-hand-pointer text-gray-300 text-4xl"></i>
                            </div>
                            <h3 className="text-lg font-bold text-gray-600 mb-1 tracking-tight">Chưa chọn đơn hàng</h3>
                            <p className="text-sm text-gray-400 max-w-xs text-center">Vui lòng chọn một đơn hàng từ danh sách để xem chi tiết.</p>
                        </div>
                    )
                }
            </div>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.jpeg,.png,.jpg"
                onChange={handleFileChange}
            />
        </div>
    );
};

export default InvoiceInboxView;