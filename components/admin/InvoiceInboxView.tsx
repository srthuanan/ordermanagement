import React, { useState, useMemo, useEffect } from 'react';
import moment from 'moment';
import { Order, ActionType } from '../../types';
import StatusBadge from '../ui/StatusBadge';
import PdfThumbnail from '../ui/PdfThumbnail';
import Button from '../ui/Button';
import { toEmbeddableUrl, getDriveFileId, forceDownload, getSanitizedFilename } from '../../utils/imageUtils';
import AnimatedBackground from '../ui/AnimatedBackground';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';
import { supabase } from '../../services/supabaseClient';
import MarqueeText from '../ui/MarqueeText';

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


const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

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
    const [policySearchQuery, setPolicySearchQuery] = useState('');
    const [policyFilterModelOnly, setPolicyFilterModelOnly] = useState(true);
    const [isSplitView, setIsSplitView] = useState(true);
    const [activeDocKey, setActiveDocKey] = useState<'LinkHopDong' | 'LinkDeNghiXHD' | 'LinkHoaDonDaXuat'>('LinkDeNghiXHD');
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
        const list = orders.filter(order => {
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

        // 2. Sort by Invoice Date (descending), then by Request Date
        return list.sort((a, b) => {
            const dateA = a['Ngày xuất hóa đơn'] ? new Date(a['Ngày xuất hóa đơn']).getTime() : 0;
            const dateB = b['Ngày xuất hóa đơn'] ? new Date(b['Ngày xuất hóa đơn']).getTime() : 0;

            if (dateA !== dateB) return dateB - dateA;

            const timeA = a['Thời gian nhập'] ? new Date(a['Thời gian nhập']).getTime() : 0;
            const timeB = b['Thời gian nhập'] ? new Date(b['Thời gian nhập']).getTime() : 0;
            return timeB - timeA;
        });
    }, [orders, selectedFolder]);

    const selectedOrder = useMemo(() => orders.find(o => o['Số đơn hàng'] === selectedOrderId), [orders, selectedOrderId]);

    const currentCarModel = useMemo(() => {
        return (selectedOrder?.['Dòng xe'] || selectedOrder?.dong_xe || selectedOrder?.['DÒNG XE'] || '').trim();
    }, [selectedOrder]);

    const filteredDbPolicies = useMemo(() => {
        const modelLower = currentCarModel.toLowerCase();
        const search = policySearchQuery.trim().toLowerCase();
        const selectedPoliciesList = editData.policy.split('; ').filter(Boolean);

        return dbPolicies.filter(p => {
            const policyName = p.ten_chinh_sach || '';
            const policyDongXe = (p.dong_xe || '').trim().toLowerCase();
            const isChecked = selectedPoliciesList.includes(policyName);

            // Search query filter
            if (search) {
                const matchesSearch = policyName.toLowerCase().includes(search) || policyDongXe.includes(search);
                if (!matchesSearch && !isChecked) return false;
            }

            // Car model filter (if active and order has a car model)
            if (policyFilterModelOnly && modelLower && !search) {
                if (isChecked) return true; // Keep selected policies visible

                // Apply to all models if empty or "tất cả"
                if (!policyDongXe || policyDongXe === '' || policyDongXe.includes('tất cả')) {
                    return true;
                }

                // Match model name (e.g. "VF 3" matches "VF 3" or "VF 3, VF 5")
                const isModelMatch = policyDongXe.includes(modelLower) || modelLower.includes(policyDongXe);
                if (!isModelMatch) return false;
            }

            return true;
        });
    }, [dbPolicies, currentCarModel, editData.policy, policyFilterModelOnly, policySearchQuery]);

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
                engineNumber: selectedOrder["Số máy"] || '',
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

    const folders = useMemo(() => {
        const counts = {
            pending_approval: 0,
            approved: 0,
            request_supplement: 0,
            supplemented: 0,
            pending_signature: 0,
            completed: 0
        };

        orders.forEach(o => {
            const s = (o['Trạng thái xử lý'] || o['Kết quả'] || '').toLowerCase().trim().normalize('NFC');
            if (s === 'chờ phê duyệt') counts.pending_approval++;
            else if (s === 'đã phê duyệt') counts.approved++;
            else if (s === 'yêu cầu bổ sung') counts.request_supplement++;
            else if (s === 'đã bổ sung') counts.supplemented++;
            else if (s === 'chờ ký hóa đơn' || s === 'chờ ký hóa đơn') counts.pending_signature++;
            else if (s === 'đã xuất hóa đơn') counts.completed++;
        });

        return [
            { id: 'pending_approval', label: 'Chờ Phê Duyệt', icon: 'fa-clock', count: counts.pending_approval },
            { id: 'approved', label: 'Đã Phê Duyệt', icon: 'fa-check', count: counts.approved },
            { id: 'request_supplement', label: 'Yêu Cầu Bổ Sung', icon: 'fa-exclamation-circle', count: counts.request_supplement },
            { id: 'supplemented', label: 'Đã Bổ Sung', icon: 'fa-plus-circle', count: counts.supplemented },
            { id: 'pending_signature', label: 'Chờ Ký Hóa Đơn', icon: 'fa-file-signature', count: counts.pending_signature },
            { id: 'completed', label: 'Đã Xuất Hóa Đơn', icon: 'fa-check-double', count: counts.completed },
            { id: 'all', label: 'Tất Cả', icon: 'fa-list', count: orders.length },
        ];
    }, [orders]);

    const getActions = (status: string) => {
        const s = status.toLowerCase().trim().normalize('NFC');
        const adminNotes = (selectedOrder?.['Ghi chú Admin'] || selectedOrder?.ghi_chu_admin || (selectedOrder as any)?.ghi_chu_admin || '').toString();
        const isAlreadyRequestedRescan = adminNotes.includes('[YÊU CẦU SCAN LẠI]');

        return [
            { type: 'reScan', label: 'Quét AI', icon: 'fa-sync', variant: 'primary', condition: true },
            { type: 'approve', label: 'Phê Duyệt', icon: 'fa-check-double', variant: 'primary', condition: s === 'chờ phê duyệt' || s === 'đã bổ sung' },
            { type: 'supplement', label: 'Yêu Cầu Bổ Sung', icon: 'fa-exclamation-triangle', variant: 'secondary', condition: s === 'chờ phê duyệt' || s === 'đã bổ sung' },
            { type: 'rescan', label: 'Y/C Scan Lại', icon: 'fa-camera', variant: 'secondary', condition: s !== 'đã hủy' && !isAlreadyRequestedRescan },
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
            { 
                type: 'migrateToDrive', 
                label: 'Bốc sang Drive', 
                icon: 'fa-cloud-upload-alt', 
                variant: 'secondary',
                condition: s !== 'đã xuất hóa đơn' && s !== 'đã hủy' && 
                          ((selectedOrder?.LinkHopDong && selectedOrder.LinkHopDong.includes('supabase.co')) || 
                           (selectedOrder?.LinkDeNghiXHD && selectedOrder.LinkDeNghiXHD.includes('supabase.co')))
            },
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

    // Group orders by Invoice Date for 'pending_signature' and 'completed' folders
    const groupedOrders = useMemo(() => {
        if (selectedFolder !== 'pending_signature' && selectedFolder !== 'completed') return null;

        const groups: { [key: string]: Order[] } = {};
        filteredOrders.forEach(order => {
            const dateVal = order['Ngày xuất hóa đơn'];
            const dateStr = dateVal ? moment(dateVal).format('DD/MM/YYYY') : 'Chưa có ngày';
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(order);
        });

        // Return array of [date, orders] sorted by date descending
        return Object.entries(groups).sort((a, b) => {
            if (a[0] === 'Chưa có ngày') return 1;
            if (b[0] === 'Chưa có ngày') return -1;
            // moment comparison for DD/MM/YYYY
            const dateA = moment(a[0], 'DD/MM/YYYY').valueOf();
            const dateB = moment(b[0], 'DD/MM/YYYY').valueOf();
            return dateB - dateA;
        });
    }, [filteredOrders, selectedFolder]);

    const renderOrder = (order: Order) => {
        const isSelected = selectedOrderId === order['Số đơn hàng'];
        return (
            <div
                key={order['Số đơn hàng']}
                onClick={(e) => {
                    handleOrderSelect(order['Số đơn hàng']);
                    setMobileView('detail');
                    copyWithFeedback(order['Tên khách hàng'], e);
                }}
                className={`p-3 cursor-pointer transition-all duration-150 relative border-l-4 ${
                    isSelected
                        ? 'bg-slate-100/90 border-blue-600 font-bold'
                        : 'border-transparent hover:bg-slate-50'
                }`}
            >
                <div className="text-xs font-extrabold text-slate-900 mb-1 uppercase overflow-hidden">
                    <MarqueeText 
                        text={order['Tên khách hàng'] || '—'} 
                        className="text-xs font-extrabold text-slate-900 uppercase"
                    />
                </div>
                <div className="text-[11px] text-slate-600 font-medium truncate">
                    {order['Dòng xe']} {order['Phiên bản']}
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full bg-slate-50 md:rounded-xl shadow-md border-0 md:border border-border-primary overflow-hidden animate-fade-in relative z-0">
            <AnimatedBackground />
            {/* Column 1: Folders */}
            <div className={`w-full md:w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col relative z-10 ${mobileView !== 'folders' ? 'hidden md:flex' : 'flex'}`}>
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {folders.map(folder => {
                        const isActive = selectedFolder === folder.id;
                        return (
                            <button
                                key={folder.id}
                                onClick={() => handleFolderChange(folder.id)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <i className={`fas ${folder.icon} w-4 text-center text-xs opacity-80`}></i>
                                    <span>{folder.label}</span>
                                </div>
                                {folder.count > 0 && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                        isActive ? 'bg-blue-700 text-white' : 'bg-slate-200/80 text-slate-700 border border-slate-200'
                                    }`}>
                                        {folder.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
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
                            <div className={`bg-white border-b border-gray-100 z-10 ${isSplitView ? 'lg:hidden' : ''}`}>
                                <div className="px-4 md:px-5 py-2 md:py-2 flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {/* Mobile Back Button - Premium Refined */}
                                        <button
                                            onClick={() => setMobileView('list')}
                                            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 active:scale-90 transition-all shadow-sm"
                                        >
                                            <i className="fas fa-arrow-left text-xs"></i>
                                        </button>

                                        <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-base font-black shadow-2xs flex-shrink-0">
                                            {selectedOrder['Tên khách hàng'].charAt(0)}
                                        </div>

                                        <div className="space-y-1 flex-1 min-w-0 overflow-hidden">
                                            <div className="flex items-center gap-2.5">
                                                <div className="min-w-0 flex-1 overflow-hidden">
                                                    <MarqueeText 
                                                        text={selectedOrder['Tên khách hàng'] || '—'}
                                                        className="font-black text-base text-slate-900 leading-none cursor-pointer hover:text-blue-600 transition-colors uppercase"
                                                        title="Click để sao chép tên khách hàng"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            copyWithFeedback(selectedOrder['Tên khách hàng'], e);
                                                        }}
                                                    />
                                                </div>
                                                <StatusBadge status={selectedOrder['Trạng thái xử lý'] || selectedOrder['Kết quả'] || ''} size="sm" />
                                            </div>
                                            <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium truncate">
                                                <span>Đơn hàng: <strong className="font-mono text-slate-900">{selectedOrder['Số đơn hàng']}</strong></span>
                                                <span className="text-slate-300">|</span>
                                                <span>TVBH: <strong className="text-slate-900">{selectedOrder['Tên tư vấn bán hàng'] || 'Chưa rõ'}</strong></span>
                                            </div>
                                        </div>

                                        {(() => {
                                            const rawPolicies = selectedOrder['CHÍNH SÁCH'] || '';
                                            const explicitAiNote = selectedOrder['Ghi chú AI'] || '';
                                            const aiNotes: string[] = [];
                                            
                                            if (explicitAiNote) {
                                                if (explicitAiNote.includes(' | ')) {
                                                    const parts = explicitAiNote.split(' | ');
                                                    parts.forEach((p: string) => { if (p.trim()) aiNotes.push(p.trim()); });
                                                } else { 
                                                    aiNotes.push(explicitAiNote.trim()); 
                                                }
                                            }
                                            
                                            const successMatch = rawPolicies.match(/✅[^⚠️]*(?=(?:⚠️)|$)/);
                                            if (successMatch) {
                                                const match = successMatch[0].trim();
                                                if (!aiNotes.some(n => n.includes(match) || match.includes(n))) aiNotes.push(match);
                                            }
                                            
                                            const errorMatch = rawPolicies.match(/⚠️[^✅]*(?=(?:✅)|$)/);
                                            if (errorMatch) {
                                                const match = errorMatch[0].trim();
                                                if (!aiNotes.some(n => n.includes(match) || match.includes(n))) aiNotes.push(match);
                                            }

                                            // @ts-ignore
                                            selectedOrder._aiNotes = aiNotes;
                                            return null;
                                        })()}
                                    </div>

                                    <div className="flex items-center gap-3 ml-auto">
                                        <button 
                                            onClick={() => setIsSplitView(!isSplitView)}
                                            className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${isSplitView ? 'bg-accent-primary border-accent-primary text-white shadow-lg shadow-accent-primary/20' : 'bg-white border-slate-200 text-slate-500 hover:border-accent-primary hover:text-accent-primary'}`}
                                            title="Chế độ xem song song"
                                        >
                                            <i className={`fas ${isSplitView ? 'fa-columns' : 'fa-chalkboard'} text-xs`}></i>
                                            <span className="text-[10px] font-black uppercase tracking-tight">Split View</span>
                                        </button>

                                        <div className="flex items-center gap-1 p-1 bg-slate-50/80 rounded-xl border border-slate-200/50">
                                            {((selectedOrder?.['Ghi chú Admin'] || selectedOrder?.ghi_chu_admin || '').toString().includes('[YÊU CẦU SCAN LẠI]')) && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-300 text-amber-800 rounded-lg text-[10px] font-bold shadow-xs" title={(selectedOrder?.['Ghi chú Admin'] || selectedOrder?.ghi_chu_admin || '').toString()}>
                                                    <i className="fas fa-hourglass-half text-amber-600 animate-pulse text-[9px]"></i>
                                                    <span>Đang Chờ TVBH Scan Lại</span>
                                                </div>
                                            )}
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
                                                        leftIcon={<i className={`fas ${action.icon} text-[9px]`}></i>}
                                                        className="font-bold px-2.5 py-1 h-7 text-[10px]"
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
                            </div>

                            {/* Main Content Area - Split View Support */}
                            <div className={`flex-1 p-1.5 md:p-2 flex ${isSplitView ? 'flex-row' : 'flex-col'} gap-1.5 md:gap-2 min-h-0 overflow-y-auto bg-gray-50/30 lg:overflow-hidden`}>
                                
                                {isSplitView && (
                                    <div className="hidden lg:flex flex-[2] flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-0 relative">
                                        <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                                            <div className="flex gap-2">
                                                {[
                                                    { key: 'LinkDeNghiXHD', label: 'Đề nghị XHĐ', icon: 'fa-file-invoice' },
                                                    { key: 'LinkHopDong', label: 'Hợp đồng MB', icon: 'fa-file-contract' },
                                                    { key: 'LinkHoaDonDaXuat', label: 'Hóa Đơn Red', icon: 'fa-file-invoice-dollar' }
                                                ].map(doc => (
                                                    <button 
                                                        key={doc.key}
                                                        onClick={() => setActiveDocKey(doc.key as any)}
                                                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${activeDocKey === doc.key ? 'bg-accent-primary text-white shadow-md' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                                                    >
                                                        <i className={`fas ${doc.icon} ${activeDocKey === doc.key ? 'text-white' : 'text-accent-primary'} opacity-80 text-[9px]`}></i>
                                                        {doc.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {selectedOrder[activeDocKey] && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const url = selectedOrder[activeDocKey] as string;
                                                            const labels: any = {
                                                                LinkDeNghiXHD: 'Đề nghị XHĐ',
                                                                LinkHopDong: 'Hợp đồng MB',
                                                                LinkHoaDonDaXuat: 'Hóa Đơn Red'
                                                            };
                                                            forceDownload(url, getSanitizedFilename(selectedOrder["Tên khách hàng"], labels[activeDocKey], url));
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-accent-primary hover:border-accent-primary transition-all shadow-sm group"
                                                        title="Tải xuống tài liệu này"
                                                    >
                                                        <i className="fas fa-download text-[10px] group-hover:bounce"></i>
                                                    </button>
                                                )}
                                                

                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 bg-slate-100 relative">
                                            {selectedOrder[activeDocKey] ? (
                                                (() => {
                                                    const url = selectedOrder[activeDocKey] as string;
                                                    const isPdf = url.toLowerCase().includes('.pdf') || (url.toLowerCase().includes('drive.google.com') && activeDocKey.toLowerCase().includes('pdf'));
                                                    const isDrive = url.toLowerCase().includes('drive.google.com');
                                                    
                                                    if (isDrive) {
                                                        return (
                                                            <iframe 
                                                                src={toEmbeddableUrl(url)} 
                                                                className="w-full h-full border-0"
                                                                title="Document Preview"
                                                            />
                                                        );
                                                    }
                                                    
                                                    if (isPdf) {
                                                        return (
                                                            <iframe 
                                                                src={url} 
                                                                className="w-full h-full border-0"
                                                                title="PDF Preview"
                                                            />
                                                        );
                                                    }
                                                    
                                                    return (
                                                        <div className="w-full h-full overflow-auto flex items-start justify-center p-4 bg-slate-200">
                                                            <img src={url} alt="Large Preview" className="max-w-full shadow-2xl rounded-sm" />
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                                    <i className="fas fa-file-excel text-4xl mb-4 opacity-20"></i>
                                                    <span className="text-xs font-medium italic">Tài liệu này chưa được tải lên</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className={`flex flex-col gap-2 min-w-0 ${isSplitView ? 'flex-[1] overflow-y-auto custom-scrollbar pr-1' : 'w-full'}`}>
                                    
                                    {/* CUSTOMER HEADER & ACTIONS - Clean Modern Integrated Card */}
                                    {isSplitView && (
                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 flex flex-col gap-3.5 animate-in slide-in-from-right-4 duration-300">
                                            {/* Top Customer Info */}
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-base font-black shadow-2xs flex-shrink-0">
                                                        {selectedOrder['Tên khách hàng'].charAt(0)}
                                                    </div>
                                                    <div className="space-y-0.5 min-w-0 flex-1 overflow-hidden">
                                                        <MarqueeText 
                                                            text={selectedOrder['Tên khách hàng'] || '—'}
                                                            className="font-black text-base text-slate-900 leading-tight cursor-pointer hover:text-blue-600 transition-colors uppercase"
                                                            title="Click để sao chép tên khách hàng"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                copyWithFeedback(selectedOrder['Tên khách hàng'], e);
                                                            }}
                                                        />
                                                        <div className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1 italic">
                                                            <i className="fa-solid fa-user-tie text-[9px] text-slate-400 not-italic"></i>
                                                            <span>TVBH: <span className="text-slate-600 font-medium italic">{toTitleCase(selectedOrder['Tên tư vấn bán hàng'] || 'Chưa rõ')}</span></span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => setIsSplitView(false)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all flex-shrink-0"
                                                    title="Đóng Split View"
                                                >
                                                    <i className="fas fa-times text-xs"></i>
                                                </button>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-100">
                                                {((selectedOrder?.['Ghi chú Admin'] || selectedOrder?.ghi_chu_admin || '').toString().includes('[YÊU CẦU SCAN LẠI]')) && (
                                                    <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-800 rounded-lg text-xs font-bold w-full shadow-xs" title={(selectedOrder?.['Ghi chú Admin'] || selectedOrder?.ghi_chu_admin || '').toString()}>
                                                        <i className="fas fa-hourglass-half text-amber-600 animate-pulse text-[10px]"></i>
                                                        <span>Đang Chờ TVBH Scan Lại</span>
                                                    </div>
                                                )}
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
                                                            className="font-bold px-3 py-1.5 text-xs flex-1 justify-center whitespace-nowrap"
                                                            isLoading={processingId === selectedOrder['Số đơn hàng'] && processingActionType === action.type}
                                                            disabled={!!processingId}
                                                        >
                                                            {action.label}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className={`grid grid-cols-1 ${isSplitView ? 'grid-cols-1' : 'md:grid-cols-3'} gap-2 flex-shrink-0`}>
                                        {/* Column 1: Vehicle & Specs */}
                                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
                                            <div className="bg-gray-50/50 px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <i className="fas fa-car text-accent-primary text-[10px]"></i>
                                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Thông tin xe</h3>
                                                </div>
                                            </div>
                                            <div className="p-2 space-y-0.5">
                                                <div className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 rounded-lg transition-colors group">
                                                    <div className="flex items-center gap-2.5">
                                                        <i className="fas fa-car text-blue-500 opacity-40 group-hover:opacity-100 text-[10px] transition-opacity"></i>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Dòng xe / PB</span>
                                                    </div>
                                                    <span className="text-[10px] font-semibold text-slate-800 truncate ml-4" title={`${selectedOrder['Dòng xe']} - ${selectedOrder['Phiên bản']}`}>
                                                        {selectedOrder['Dòng xe']} - {selectedOrder['Phiên bản']}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 rounded-lg transition-colors group border-t border-gray-50 mt-0.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <i className="fas fa-palette text-amber-500 opacity-40 group-hover:opacity-100 text-[10px] transition-opacity"></i>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Màu sắc</span>
                                                    </div>
                                                    <span className="text-[10px] font-medium text-slate-700 truncate ml-4">
                                                        {selectedOrder['Ngoại thất'] || 'N/A'} / {selectedOrder['Nội thất'] || 'N/A'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 rounded-lg transition-colors group border-t border-gray-50 mt-0.5 pt-1">
                                                    <div className="flex items-center gap-2.5">
                                                        <i className="fas fa-fingerprint text-accent-primary opacity-40 group-hover:opacity-100 text-[10px] transition-opacity"></i>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Số VIN</span>
                                                    </div>
                                                    <div className="text-xs font-bold text-accent-primary truncate ml-4 font-mono tracking-normal bg-accent-primary/5 px-2 py-0.5 rounded border border-accent-primary/10">
                                                        <CopyableField text={selectedOrder.VIN || ''} showToast={showToast} />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 rounded-lg transition-colors group">
                                                    <div className="flex items-center gap-2.5">
                                                        <i className="fas fa-cogs text-gray-400 opacity-40 group-hover:opacity-100 text-[10px] transition-opacity"></i>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Số Máy</span>
                                                    </div>
                                                    <div className="text-[10px] font-medium text-slate-700 truncate ml-4 font-mono">
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={editData.engineNumber}
                                                                onChange={e => setEditData({ ...editData, engineNumber: e.target.value })}
                                                                className="w-full text-[10px] border border-accent-primary/30 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-accent-primary text-right"
                                                            />
                                                        ) : (
                                                            <CopyableField text={selectedOrder['Số máy'] || ''} showToast={showToast} />
                                                        )}
                                                    </div>
                                                </div>

                                                {selectedOrder['Xe xăng VIN'] && (
                                                    <div className="mt-2 pt-2 border-t border-dashed border-amber-200 bg-amber-50/60 rounded-lg px-2 pb-1.5 transition-all animate-fade-in shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                                                        <div className="flex items-center gap-1.5 mb-1.5">
                                                            <i className="fas fa-gas-pump text-amber-600 text-[10px]"></i>
                                                            <span className="text-[9px] font-semibold text-amber-800 uppercase tracking-wider">Thông tin xe xăng thu đổi</span>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[9px] text-gray-500 font-medium tracking-wide">Hãng / Model</span>
                                                                <span className="text-[10px] font-medium text-gray-800">
                                                                    {selectedOrder['Xe xăng Hãng'] || '—'} {selectedOrder['Xe xăng Model'] ? `(${selectedOrder['Xe xăng Model']})` : ''}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center border-t border-amber-100/50 pt-1 mt-1">
                                                                <span className="text-[9px] text-gray-500 font-medium tracking-wide">Số VIN gốc</span>
                                                                <div className="text-[10px] font-semibold text-amber-900 font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200 shadow-sm">
                                                                    <CopyableField text={selectedOrder['Xe xăng VIN'] || ''} showToast={showToast} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Column 2: Transaction Details */}
                                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-visible relative">
                                            <div className="bg-gray-50/50 px-3 py-1.5 border-b border-gray-100 flex items-center gap-2 rounded-t-xl">
                                                <i className="fas fa-receipt text-accent-primary text-[10px]"></i>
                                                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Giao dịch</h3>
                                            </div>
                                            <div className="p-2.5 space-y-2 relative">
                                                <div className="text-left relative">
                                                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 ml-0.5">Số đơn hàng</div>
                                                    {(() => {
                                                        const aiNotes = (selectedOrder as any)._aiNotes || [];
                                                        const hasWarning = aiNotes.some((n: string) => n.includes('⚠️') || n.includes('🚨'));

                                                        return (
                                                            <div className={`flex justify-center bg-gray-50/50 border rounded-xl py-1 pr-8 relative transition-all duration-300 ${hasWarning ? 'border-red-200 bg-red-50/30' : 'border-gray-100 shadow-sm'}`}>
                                                                <CopyableField text={selectedOrder['Số đơn hàng'] || ''} showToast={showToast} className={`text-[12px] font-bold truncate font-mono tracking-tight ${hasWarning ? 'text-red-600' : 'text-accent-primary'}`} />
                                                                {hasWarning && (
                                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 group/err">
                                                                        <div className="text-red-500 animate-pulse cursor-help">
                                                                            <i className="fas fa-exclamation-triangle text-xs"></i>
                                                                        </div>
                                                                        <div className="absolute top-full right-0 mt-2 w-72 bg-slate-900 text-white rounded-xl p-3 shadow-2xl opacity-0 group-hover/err:opacity-100 transition-all invisible group-hover/err:visible z-[100] transform scale-95 group-hover/err:scale-100 origin-top-right">
                                                                            <div className="text-[10px] font-bold text-red-400 uppercase mb-2 border-b border-white/10 pb-1">Chi tiết sai lệch (AI)</div>
                                                                            <div className="space-y-2">
                                                                                {aiNotes.filter((n: string) => !n.includes('✅')).map((note: string, idx: number) => (
                                                                                    <div key={`ai-note-${idx}`} className="flex items-start gap-2">
                                                                                        <i className="fas fa-caret-right text-red-500 mt-1 text-[8px]"></i>
                                                                                        <span className="text-[10px] font-medium leading-relaxed text-slate-200">{note.replace(/^[⚠️🚨ℹ️]\s*/, '').trim()}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                            <div className="absolute top-[-4px] right-3 w-3 h-3 bg-slate-900 rotate-45"></div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex flex-col">
                                                        <div className="text-[9px] font-medium text-slate-500 uppercase tracking-tighter mb-0.5 ml-0.5">Hoa hồng ứng</div>
                                                        <div className="w-full bg-green-50/50 border border-green-100 rounded-lg px-2 py-1 flex items-baseline justify-center">
                                                            <span className="text-xs font-bold text-green-700">
                                                                {isEditing ? (
                                                                    <input type="text" value={editData.commission} onChange={e => setEditData({ ...editData, commission: e.target.value })} className="w-full bg-transparent focus:outline-none text-center" />
                                                                ) : (
                                                                    `${Number(String(selectedOrder['Hoa hồng ứng'] || 0).replace(/[^0-9]/g, '')).toLocaleString()}đ`
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="text-[9px] font-medium text-slate-500 uppercase tracking-tighter mb-0.5 ml-0.5">Vpoint</div>
                                                        <div className="w-full bg-blue-50/50 border border-blue-100 rounded-lg px-2 py-1 flex items-baseline justify-center">
                                                            <span className="text-xs font-bold text-blue-700">
                                                                {isEditing ? (
                                                                    <input type="text" value={editData.vpoint} onChange={e => setEditData({ ...editData, vpoint: e.target.value })} className="w-full bg-transparent focus:outline-none text-center" />
                                                                ) : (
                                                                    `${Number(String(selectedOrder['Điểm Vpoint sử dụng'] || 0).replace(/[^0-9]/g, '')).toLocaleString()}`
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {selectedOrder['Mã VC'] && (
                                                    <div className="flex flex-col mt-2">
                                                        <div className="text-[9px] font-medium text-slate-500 uppercase tracking-tighter mb-0.5 ml-0.5">Mã VC (Voucher)</div>
                                                        <div className="w-full bg-purple-50/50 border border-purple-100 rounded-lg px-2 py-1 flex items-center gap-2">
                                                            <i className="fas fa-ticket-alt text-purple-500 text-[10px]"></i>
                                                            <CopyableField text={selectedOrder['Mã VC'] || ''} showToast={showToast} className="text-xs font-bold text-purple-700 tracking-wide" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Column 3: Policy List */}
                                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[160px]">
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
                                                        <button onClick={handleSaveEdit} disabled={isSaving} className="text-[8px] font-bold text-green-600">LƯU</button>
                                                        <button onClick={() => setIsEditing(false)} disabled={isSaving} className="text-[8px] font-bold text-red-500">HỦY</button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`p-2.5 overflow-y-auto custom-scrollbar flex-1 min-h-[120px] ${isSplitView ? 'max-h-[300px]' : ''}`}>
                                                {isEditing ? (
                                                    <div className="space-y-1.5 p-0.5">
                                                        {/* Quick Search & Model Filter Header */}
                                                        <div className="space-y-1 pb-2 mb-1 border-b border-gray-100">
                                                            <div className="relative">
                                                                <input 
                                                                    type="text" 
                                                                    value={policySearchQuery} 
                                                                    onChange={e => setPolicySearchQuery(e.target.value)} 
                                                                    placeholder="🔍 Tìm chính sách..." 
                                                                    className="w-full text-[10px] px-2 py-1 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-gray-400" 
                                                                />
                                                                {policySearchQuery && (
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => setPolicySearchQuery('')} 
                                                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px] px-1"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {currentCarModel && (
                                                                <div className="flex items-center justify-between gap-1 text-[9px] pt-0.5">
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => setPolicyFilterModelOnly(!policyFilterModelOnly)} 
                                                                        className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all ${
                                                                            policyFilterModelOnly 
                                                                                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs' 
                                                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                                        }`}
                                                                        title={policyFilterModelOnly ? `Đang lọc theo dòng xe ${currentCarModel}. Click để hiện tất cả.` : 'Click để lọc theo dòng xe.'}
                                                                    >
                                                                        <span>🚗</span>
                                                                        <span>{policyFilterModelOnly ? `Xe: ${currentCarModel}` : 'Tất cả dòng xe'}</span>
                                                                        <i className={`fas fa-chevron-${policyFilterModelOnly ? 'down' : 'up'} text-[7px] opacity-60`}></i>
                                                                    </button>

                                                                    <span className="text-[9px] font-semibold text-gray-400">
                                                                        {filteredDbPolicies.length}/{dbPolicies.length}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Checkbox List */}
                                                        {filteredDbPolicies.length === 0 ? (
                                                            <div className="text-center py-4 text-[10px] text-gray-400 italic">
                                                                Không có chính sách nào {policyFilterModelOnly ? `cho ${currentCarModel}` : ''}
                                                            </div>
                                                        ) : (
                                                            filteredDbPolicies.map((p, idx) => {
                                                                const isChecked = editData.policy.split('; ').filter(Boolean).includes(p.ten_chinh_sach);
                                                                return (
                                                                    <label key={idx} className={`flex items-start justify-between gap-2 px-2 py-1 rounded-md cursor-pointer transition-all ${isChecked ? 'bg-indigo-50/70 border border-indigo-100' : 'hover:bg-gray-50 border border-transparent'}`}>
                                                                        <div className="flex items-start gap-2 min-w-0">
                                                                            <input 
                                                                                type="checkbox" 
                                                                                checked={isChecked} 
                                                                                onChange={() => {
                                                                                    const current = editData.policy.split('; ').filter(Boolean);
                                                                                    const exists = current.includes(p.ten_chinh_sach);
                                                                                    const updated = exists ? current.filter(x => x !== p.ten_chinh_sach) : [...current, p.ten_chinh_sach];
                                                                                    setEditData({...editData, policy: updated.join('; ')});
                                                                                }}
                                                                                className="mt-0.5 accent-indigo-600 flex-shrink-0"
                                                                            />
                                                                            <span className={`text-[10px] ${isChecked ? 'font-bold text-indigo-950' : 'text-gray-700'}`}>{p.ten_chinh_sach}</span>
                                                                        </div>
                                                                    </label>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        {(selectedOrder['CHÍNH SÁCH'] || '').split(/; |, /).filter(Boolean).map((item, idx) => (
                                                            <div key={idx} className="flex items-start gap-2">
                                                                <div className="w-1 h-1 rounded-full bg-accent-primary mt-1.5 flex-shrink-0"></div>
                                                                <span className="text-[10px] font-semibold text-gray-600 leading-tight">{item}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {!isSplitView && (
                                        <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex flex-col min-h-0 lg:flex-1">
                                            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-50">
                                                <div className="flex items-center gap-2">
                                                    <i className="fas fa-folder-open text-accent-primary text-[10px]"></i>
                                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hồ Sơ Chứng Từ</h3>
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
                                    )}
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