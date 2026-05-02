import React, { useState, useMemo, useEffect } from 'react';
import moment from 'moment';
import { VcRequest, ActionType } from '../../types';
import StatusBadge from '../ui/StatusBadge';
import Button from '../ui/Button';
import { toEmbeddableUrl, getDriveFileId, forceDownload, getSanitizedFilename } from '../../utils/imageUtils';
import AnimatedBackground from '../ui/AnimatedBackground';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';

interface ImageSource {
    src: string;
    originalUrl?: string;
    label: string;
}

interface VcInboxViewProps {
    requests: VcRequest[];
    onAction: (type: ActionType, request: VcRequest) => Promise<void> | void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onOpenImagePreview: (images: ImageSource[], startIndex: number, customerName: string) => void;
    onDownloadAll: (request: VcRequest) => void;
    selectedFolder: string;
    selectedRequestId: string | null;
    onFolderChange: (folder: string) => void;
    onRequestSelect: (requestId: string | null) => void;
    processingId?: string | null;
    processingActionType?: ActionType | null;
    isLoading?: boolean;
    onNavigateToTab?: (view: any, subState?: { folder?: string; id?: string }) => void;
}


const CopyableField: React.FC<{ text: string; showToast?: Function; className?: string; label?: string; wrap?: boolean }> = ({ text, className, label, wrap = false }) => {
    const copyWithFeedback = useCopyFeedback();
    if (!text || text === 'N/A') {
        return <div className={className}>{label ? `${label}: ` : ''}N/A</div>;
    }
    return (
        <div
            className={`cursor-pointer relative ${className}`}
            title={`Click để sao chép: ${text}`}
            onClick={(e) => { e.stopPropagation(); copyWithFeedback(text, e); }}
        >
            <span>{label ? `${label}: ` : ''}</span>
            <span className={wrap ? 'break-words' : 'truncate'}>{text}</span>
        </div>
    );
};

const DocumentCard: React.FC<{
    url: string;
    label: string;
    icon: string;
    onClick: () => void;
    customerName?: string;
}> = ({ url, label, icon, onClick, customerName }) => {
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);
    const [retryStage, setRetryStage] = useState(0);

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
        } else {
            setHasError(true);
        }
    };

    return (
        <div
            className="flex flex-col rounded-xl border border-gray-200 bg-white cursor-pointer hover:border-accent-primary hover:shadow-md transition-all overflow-hidden group h-full"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
        >
            <div className="flex-1 min-h-0 bg-gray-50 flex items-center justify-center overflow-hidden relative">
                {imgSrc && !hasError ? (
                    <img
                        src={imgSrc}
                        alt={label}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={handleError}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                        <i className={`fas ${fileType === 'pdf' ? 'fa-file-pdf text-red-500' : icon} text-3xl`}></i>
                        <span className="text-[10px] font-bold uppercase">{fileType === 'pdf' ? 'PDF' : 'FILE'}</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-accent-primary opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                        <i className="fas fa-search-plus text-lg"></i>
                    </div>
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={e => {
                            e.stopPropagation();
                            forceDownload(url, getSanitizedFilename(customerName, label, url));
                        }}
                        className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 backdrop-blur-sm transition-colors"
                        title="Tải về"
                    >
                        <i className="fas fa-download text-xs"></i>
                    </button>
                </div>
            </div>
            <div className="px-3 py-2 border-t border-gray-100 bg-white flex-shrink-0">
                <div className="font-bold text-[10px] text-gray-700 truncate" title={label}>{label}</div>
            </div>
        </div>
    );
};

const VcInboxView: React.FC<VcInboxViewProps> = ({
    requests,
    onAction,
    showToast,
    onOpenImagePreview,
    onDownloadAll,
    selectedFolder,
    selectedRequestId,
    onFolderChange,
    onRequestSelect,
    processingId,
    processingActionType,
    isLoading = false,
    onNavigateToTab
}) => {

    // Mobile View State
    const [mobileView, setMobileView] = useState<'folders' | 'list' | 'detail'>('folders');
    const [processingAction, setProcessingAction] = useState<{ id: string, type: string } | null>(null);
    const copyWithFeedback = useCopyFeedback();

    // 1. Filter Requests by Folder
    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const status = (req['Trạng thái xử lý'] || '').toLowerCase();
            switch (selectedFolder) {
                case 'pending': return status === 'chờ duyệt ycvc';
                case 'approved': return status.includes('đã duyệt') || status.includes('hoàn thành') || status.includes('đã phê duyệt');
                case 'rejected': return status.includes('từ chối') || status.includes('hủy');
                case 'all': return true;
                default: return true;
            }
        });
    }, [requests, selectedFolder]);

    const selectedRequest = useMemo(() => requests.find(r => r['Số đơn hàng'] === selectedRequestId), [requests, selectedRequestId]);

    // Auto-select first request if none selected or folder changes
    useEffect(() => {
        if (filteredRequests.length > 0) {
            const firstId = filteredRequests[0]['Số đơn hàng'];
            onRequestSelect(firstId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFolder]);

    const folders = [
        { id: 'pending', label: 'Chờ Duyệt', icon: 'fa-clock', count: requests.filter(r => (r['Trạng thái xử lý'] || '').toLowerCase() === 'chờ duyệt ycvc').length },
        {
            id: 'approved', label: 'Đã phê duyệt', icon: 'fa-check-circle', count: requests.filter(r => {
                const s = (r['Trạng thái xử lý'] || '').toLowerCase();
                return s.includes('đã duyệt') || s.includes('hoàn thành') || s.includes('đã phê duyệt');
            }).length
        },
        { id: 'rejected', label: 'Đã Từ Chối', icon: 'fa-ban', count: requests.filter(r => (r['Trạng thái xử lý'] || '').toLowerCase().includes('từ chối')).length },
        { id: 'all', label: 'Tất Cả', icon: 'fa-list', count: requests.length },
    ];

    const getActions = (status: string) => {
        const s = status.toLowerCase();
        return [
            { type: 'approveVc', label: 'Phê Duyệt', icon: 'fa-check-circle', variant: 'success', condition: s === 'chờ duyệt ycvc' },
            { type: 'rejectVc', label: 'Từ Chối', icon: 'fa-ban', variant: 'danger', condition: s === 'chờ duyệt ycvc' },
        ].filter(a => a.condition);
    };

    const docLabels: Record<string, { label: string, icon: string }> = {
        idCardFront: { label: 'CCCD Trước', icon: 'fa-id-card' },
        idCardBack: { label: 'CCCD Sau', icon: 'fa-id-card' },
        businessLicense: { label: 'GPKD', icon: 'fa-file-alt' },
        regFront: { label: 'Cavet Trước', icon: 'fa-car' },
        regBack: { label: 'Cavet Sau', icon: 'fa-car' },
        plateImage: { label: 'Ảnh Biển Số', icon: 'fa-image' },
        unc: { label: 'UNC', icon: 'fa-file-invoice-dollar' },
    };

    const getImages = (req: VcRequest) => {
        let fileUrls: Record<string, string> = {};
        try {
            if (req.FileUrls) fileUrls = JSON.parse(req.FileUrls);
            else if (req['URL hình ảnh']) fileUrls = { unc: req['URL hình ảnh'] };
        } catch (e) { console.error('Failed to parse FileUrls', e); }

        const docEntries = Object.entries(fileUrls);
        const allImageSources: ImageSource[] = docEntries.map(([key, url]) => {
            const doc = docLabels[key] || { label: key, icon: 'fa-file' };
            return { src: url, originalUrl: url, label: doc.label };
        });
        return { docEntries, allImageSources, fileUrls };
    };

    const handleFolderClick = (folderId: string) => {
        onFolderChange(folderId);
        setMobileView('list');
    };

    const handleRequestClick = (requestId: string) => {
        onRequestSelect(requestId);
        setMobileView('detail');
    };

    const handleActionClick = async (type: ActionType, request: VcRequest) => {
        setProcessingAction({ id: request['Số đơn hàng'], type: type });
        try {
            await onAction(type, request);
        } catch (e) {
            console.error(e);
        } finally {
            setProcessingAction(null);
        }
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
            const currentIndex = filteredRequests.findIndex(r => r['Số đơn hàng'] === selectedRequestId);
            if (currentIndex === -1) return;

            if (isLeftSwipe && currentIndex < filteredRequests.length - 1) {
                // Next Request
                handleRequestClick(filteredRequests[currentIndex + 1]['Số đơn hàng']);
            } else if (isRightSwipe && currentIndex > 0) {
                // Previous Request
                handleRequestClick(filteredRequests[currentIndex - 1]['Số đơn hàng']);
            }
        }
    };

    return (
        <div className="flex h-full bg-slate-50 rounded-xl shadow-md border border-border-primary overflow-hidden animate-fade-in relative z-0">
            <AnimatedBackground />
            {/* Column 1: Folders */}
            <div className={`w-full md:w-64 flex-shrink-0 border-r border-border-primary bg-surface-ground/90 flex flex-col relative z-10 ${mobileView !== 'folders' ? 'hidden md:flex' : 'flex'}`}>
                <div className="md:hidden p-3 bg-white border-b border-border-secondary flex items-center justify-center relative">
                    <span className="font-bold text-sm">Quản Lý VC</span>
                </div>
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {folders.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => handleFolderClick(folder.id)}
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
                {/* Mobile Header */}
                <div className="md:hidden p-2.5 bg-white border-b border-border-secondary flex items-center gap-2">
                    <button onClick={() => setMobileView('folders')} className="p-1.5 hover:bg-surface-ground rounded-full">
                        <i className="fas fa-arrow-left text-gray-500"></i>
                    </button>
                    <span className="font-bold text-sm">
                        {folders.find(f => f.id === selectedFolder)?.label || 'Danh sách'}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading && filteredRequests.length === 0 ? (
                        <div className="divide-y divide-border-secondary">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="p-4 md:p-3 space-y-2">
                                    <div className="skeleton-item h-4 w-3/4 rounded-md"></div>
                                    <div className="skeleton-item h-3 w-1/2 rounded-md"></div>
                                </div>
                            ))}
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="p-8 text-center text-text-placeholder text-sm">Không tìm thấy yêu cầu nào.</div>
                    ) : (
                        <div className="divide-y divide-border-secondary">
                            {filteredRequests.map(req => {
                                const isSelected = selectedRequestId === req['Số đơn hàng'];
                                return (
                                    <div
                                        key={req['Số đơn hàng']}
                                        onClick={() => handleRequestClick(req['Số đơn hàng'])}
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
                                                        copyWithFeedback(req['Tên khách hàng'], e);
                                                    }}
                                                >
                                                    {req['Tên khách hàng']}
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 leading-none">
                                                        <span>{req['Loại YC']}</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                                        <span className="truncate">{moment(req['Thời gian YC']).format('DD/MM/YY')}</span>
                                                    </div>
                                                    <div className="text-[9px] text-slate-300 font-mono mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {req['Số đơn hàng']}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0">
                                                {(() => {
                                                    const status = (req['Trạng thái xử lý'] || '').toLowerCase();
                                                    if (status.includes('chờ')) return (
                                                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shadow-sm border border-amber-100/50">
                                                            <i className="fas fa-clock text-xs"></i>
                                                        </div>
                                                    );
                                                    if (status.includes('duyệt') || status.includes('thành')) return (
                                                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100/50">
                                                            <i className="fas fa-check-circle text-xs"></i>
                                                        </div>
                                                    );
                                                    if (status.includes('từ chối')) return (
                                                        <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shadow-sm border border-rose-100/50">
                                                            <i className="fas fa-ban text-xs"></i>
                                                        </div>
                                                    );
                                                    return <i className="fas fa-question-circle text-gray-300 text-sm"></i>;
                                                })()}
                                            </div>
                                        </div>

                                        {/* Status on mobile */}
                                        <div className="mt-2.5 flex items-center justify-between md:hidden border-t border-slate-100/50 pt-2">
                                            <StatusBadge status={req['Trạng thái xử lý'] || ''} size="sm" />
                                            <span className="text-[9px] text-slate-400 font-mono font-medium">{req['Số đơn hàng'].split('-').pop()}</span>
                                        </div>

                                        {/* Desktop subtle status dot */}
                                        {!isSelected && (req['Trạng thái xử lý'] || '').toLowerCase() === 'chờ duyệt ycvc' && (
                                            <div className="absolute right-1.5 top-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse"></div>
                                        )}
                                    </div>
                                );
                            })}
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
                {selectedRequest ? (
                    <>
                        {/* Detail Header */}
                        <div className="bg-white border-b border-gray-100 z-10 sticky top-0">
                            <div className="px-4 md:px-6 py-2 md:py-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-8">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {/* Mobile Back Button */}
                                    <button
                                        onClick={() => setMobileView('list')}
                                        className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <i className="fas fa-arrow-left text-gray-500"></i>
                                    </button>

                                    {/* Avatar */}
                                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary font-bold text-base md:text-lg flex-shrink-0">
                                        {selectedRequest['Tên khách hàng'].charAt(0)}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5 overflow-hidden">
                                            <h2
                                                className="text-sm md:text-base font-bold text-gray-900 truncate cursor-pointer hover:text-accent-primary transition-colors"
                                                title="Click để sao chép tên khách hàng"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    copyWithFeedback(selectedRequest['Tên khách hàng'], e);
                                                }}
                                            >
                                                {selectedRequest['Tên khách hàng']}
                                            </h2>
                                            <StatusBadge status={selectedRequest['Trạng thái xử lý'] || ''} size="sm" />
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <button
                                                onClick={() => onNavigateToTab?.('matching', { folder: 'paired', id: selectedRequest['Số đơn hàng'] })}
                                                className="h-6 px-2.5 bg-slate-100 hover:bg-accent-primary hover:text-white text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 border border-slate-200/40 group/nav"
                                                title="Xem trong Ghép Xe"
                                            >
                                                <i className="fas fa-car text-[10px] opacity-40 group-hover/nav:opacity-100"></i>
                                                <span>Ghép Xe</span>
                                            </button>
                                            <button
                                                onClick={() => onNavigateToTab?.('invoices', { id: selectedRequest['Số đơn hàng'] })}
                                                className="h-6 px-2.5 bg-slate-100 hover:bg-accent-primary hover:text-white text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 border border-slate-200/40 group/nav"
                                                title="Xem trong Hóa Đơn"
                                            >
                                                <i className="fas fa-file-invoice-dollar text-[10px] opacity-40 group-hover/nav:opacity-100"></i>
                                                <span>Hóa Đơn</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Header Actions */}
                                {/* Header Actions - Grouped Premium Style */}
                                <div className="flex items-center gap-1.5 p-1 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm ml-auto overflow-x-auto no-scrollbar">
                                    <Button
                                        onClick={() => onDownloadAll(selectedRequest)}
                                        variant="ghost"
                                        size="sm"
                                        leftIcon={<i className="fas fa-file-archive text-[10px]"></i>}
                                        className="whitespace-nowrap px-4 py-1.5 rounded-xl font-bold text-[11px] bg-slate-100/80 text-slate-600 hover:bg-slate-200 border border-transparent transition-all duration-300 active:scale-95"
                                    >
                                        Tải Hồ Sơ
                                    </Button>

                                    {getActions(selectedRequest['Trạng thái xử lý'] || selectedRequest['Kết quả'] || '').map(action => {
                                        let variant: 'success' | 'danger' | 'primary' | 'secondary' = 'primary';

                                        if (action.type === 'approveVc') variant = 'success';
                                        else if (action.type === 'rejectVc') variant = 'danger';

                                        return (
                                            <Button
                                                key={action.type}
                                                onClick={() => handleActionClick(action.type as any, selectedRequest)}
                                                variant={variant}
                                                size="sm"
                                                leftIcon={<i className={`fas ${action.icon} text-[10px]`}></i>}
                                                className="font-bold px-3"
                                                isLoading={(processingAction?.id === selectedRequest['Số đơn hàng'] && processingAction.type === action.type) || (processingId === selectedRequest['Số đơn hàng'] && processingActionType === action.type)}
                                                disabled={!!processingAction || (processingId === selectedRequest['Số đơn hàng'] && !!processingActionType)}
                                            >
                                                {action.label}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Content Scroll Area - Fixed on Desktop, Scrollable on Mobile */}
                        <div className="flex-1 p-2 md:p-4 flex flex-col gap-3 md:gap-4 min-h-0 overflow-y-auto md:overflow-hidden bg-gray-50/30">

                            {/* Row 1: Key Info Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Details Card */}
                                <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-50">
                                        <i className="fas fa-info-circle text-accent-primary text-[10px]"></i>
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Chi Tiết Yêu Cầu</h3>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Loại YC</span>
                                            <span className="text-[11px] font-bold text-gray-800 bg-blue-50 px-2 py-0.5 rounded-full">{selectedRequest['Loại YC']}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Số Đơn Hàng</span>
                                            <CopyableField text={selectedRequest['Số đơn hàng']} showToast={showToast} className="text-[11px] font-mono font-bold text-accent-primary" />
                                        </div>
                                        {selectedRequest['Loại YC'] !== 'Cá Nhân' && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Mã KH DMS</span>
                                                <CopyableField text={selectedRequest['Mã KH DMS'] || 'N/A'} showToast={showToast} className="text-[11px] font-mono font-bold text-gray-700" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Vehicle Card */}
                                <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-50">
                                        <i className="fas fa-car text-accent-primary text-[10px]"></i>
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Thông Tin Xe</h3>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Số VIN</span>
                                            <CopyableField text={selectedRequest.VIN || 'N/A'} showToast={showToast} className="text-[11px] font-mono font-bold text-accent-primary" />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Thời Gian YC</span>
                                            <span className="text-[11px] font-medium text-gray-700">{moment(selectedRequest['Thời gian YC']).format('DD/MM/YYYY HH:mm:ss')}</span>
                                        </div>
                                        {selectedRequest['Ghi chú'] && (
                                            <div className="pt-2 border-t border-gray-50">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase block mb-1">Ghi chú</span>
                                                <p className="text-[10px] text-gray-600 leading-tight italic line-clamp-2" title={selectedRequest['Ghi chú']}>
                                                    "{selectedRequest['Ghi chú']}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>


                            </div>

                            {/* Documents Grid - Flexible height */}
                            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col min-h-0 flex-1">
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
                                    <div className="flex items-center gap-2">
                                        <i className="fas fa-images text-accent-primary text-xs"></i>
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hồ Sơ Đính Kèm</h3>
                                    </div>
                                    <div className="text-[9px] font-bold text-accent-primary bg-accent-primary/5 px-2.5 py-1 rounded-full border border-accent-primary/10">
                                        {getImages(selectedRequest).docEntries.length} tệp tin
                                    </div>
                                </div>

                                <div className="flex-1 min-h-0 overflow-hidden">
                                    {(() => {
                                        const { docEntries, allImageSources } = getImages(selectedRequest);
                                        if (docEntries.length === 0) {
                                            return (
                                                <div className="h-full flex flex-col items-center justify-center text-gray-300 py-12">
                                                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                                                        <i className="fas fa-image-slash text-2xl"></i>
                                                    </div>
                                                    <p className="text-sm font-medium">Không có hồ sơ đính kèm</p>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="flex flex-row gap-3 h-full pb-1 overflow-x-auto no-scrollbar">
                                                {docEntries.map(([key, url], index) => {
                                                    const doc = docLabels[key] || { label: key, icon: 'fa-file' };
                                                    return (
                                                        <div key={key} className="h-full flex-1 min-w-[140px]">
                                                            <DocumentCard
                                                                url={url}
                                                                label={doc.label}
                                                                icon={doc.icon}
                                                                onClick={() => onOpenImagePreview(allImageSources, index, selectedRequest['Tên khách hàng'])}
                                                                customerName={selectedRequest['Tên khách hàng']}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-placeholder p-8">
                        <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                            <i className="fas fa-id-card text-5xl opacity-20"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-400 mb-2">Chưa chọn yêu cầu</h3>
                        <p className="text-sm text-gray-400 max-w-xs text-center">Chọn một yêu cầu cấp VC từ danh sách bên trái để kiểm tra hồ sơ và phê duyệt.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VcInboxView;
