import React, { useState, useMemo, useEffect } from 'react';
import moment from 'moment';
import { VcRequest, ActionType } from '../../types';
import StatusBadge from '../ui/StatusBadge';
import { toEmbeddableUrl } from '../../utils/imageUtils';

interface ImageSource {
    src: string;
    originalUrl?: string;
    label: string;
}

interface VcInboxViewProps {
    requests: VcRequest[];
    onAction: (type: ActionType, request: VcRequest) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onOpenImagePreview: (images: ImageSource[], startIndex: number, customerName: string) => void;
    onDownloadAll: (request: VcRequest) => void;
    selectedFolder: string;
    selectedRequestId: string | null;
    onFolderChange: (folder: string) => void;
    onRequestSelect: (requestId: string | null) => void;
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

const DocumentCard: React.FC<{ url: string; label: string; icon: string; onClick: () => void }> = ({ url, label, icon, onClick }) => {
    const [imgSrc, setImgSrc] = useState(toEmbeddableUrl(url, 320));
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setImgSrc(toEmbeddableUrl(url, 320));
        setHasError(false);
    }, [url]);

    return (
        <div
            className="flex flex-col rounded border border-border-secondary bg-surface-ground cursor-pointer hover:bg-surface-hover transition-all overflow-hidden group"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
        >
            <div className="h-32 bg-white flex items-center justify-center overflow-hidden relative">
                {!hasError ? (
                    <img
                        src={imgSrc}
                        alt={label}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={() => setHasError(true)}
                    />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-surface-ground shadow-sm flex items-center justify-center text-accent-primary">
                        <i className={`fas ${icon} text-2xl opacity-50`}></i>
                    </div>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <i className="fas fa-search-plus text-white opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 drop-shadow-md"></i>
                </div>
            </div>
            <div className="p-2 text-center border-t border-border-secondary bg-surface-ground">
                <div className="font-medium text-xs text-text-primary truncate" title={label}>{label}</div>
                <div className="text-[10px] text-text-secondary mt-0.5">Nhấn để xem</div>
            </div>
        </div>
    );
};

const VcInboxView: React.FC<VcInboxViewProps> = ({ requests, onAction, showToast, onOpenImagePreview, onDownloadAll, selectedFolder, selectedRequestId, onFolderChange, onRequestSelect }) => {

    // Mobile View State
    const [mobileView, setMobileView] = useState<'folders' | 'list' | 'detail'>('folders');

    // 1. Filter Requests by Folder
    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const status = (req['Trạng thái xử lý'] || '').toLowerCase();
            switch (selectedFolder) {
                case 'pending': return status === 'chờ duyệt ycvc';
                case 'approved': return status.includes('đã duyệt') || status.includes('hoàn thành') || status.includes('đã phê duyệt'); // Adjust based on actual status
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
            onRequestSelect(filteredRequests[0]['Số đơn hàng']);
        }
    }, [selectedFolder, onRequestSelect]); // Trigger on folder change

    // Ensure selection on initial load if nothing selected
    useEffect(() => {
        if (!selectedRequestId && filteredRequests.length > 0) {
            onRequestSelect(filteredRequests[0]['Số đơn hàng']);
        }
    }, [filteredRequests, selectedRequestId, onRequestSelect]);

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
            { type: 'approveVc', label: 'Phê Duyệt', icon: 'fa-check-circle', className: 'btn-success', condition: s === 'chờ duyệt ycvc' },
            { type: 'rejectVc', label: 'Từ Chối', icon: 'fa-ban', className: 'btn-danger', condition: s === 'chờ duyệt ycvc' },
        ].filter(a => a.condition);
    };

    const docLabels: Record<string, { label: string, icon: string }> = {
        idCardFront: { label: 'CCCD Trước', icon: 'fa-id-card' },
        idCardBack: { label: 'CCCD Sau', icon: 'fa-id-card' },
        businessLicense: { label: 'GPKD', icon: 'fa-file-alt' },
        regFront: { label: 'Cavet Trước', icon: 'fa-car' },
        regBack: { label: 'Cavet Sau', icon: 'fa-car' },
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
        <div className="flex h-full bg-surface-card rounded-xl shadow-md border border-border-primary overflow-hidden animate-fade-in relative">
            {/* Column 1: Folders */}
            <div className={`w-full md:w-64 flex-shrink-0 border-r border-border-primary bg-surface-ground flex flex-col absolute md:relative inset-0 z-20 md:z-auto transition-transform duration-300 ${mobileView === 'folders' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-4 border-b border-border-primary md:hidden flex items-center justify-between bg-white">
                    <span className="font-bold text-lg">Danh Mục</span>
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
            <div className={`w-full md:w-80 flex-shrink-0 border-r border-border-primary flex flex-col bg-white absolute md:relative inset-0 z-20 md:z-auto transition-transform duration-300 ${mobileView === 'list' ? 'translate-x-0' : (mobileView === 'detail' ? '-translate-x-full md:translate-x-0' : 'translate-x-full md:translate-x-0')}`}>
                {/* Mobile Header */}
                <div className="p-3 border-b border-border-primary md:hidden flex items-center gap-3 bg-white shadow-sm">
                    <button onClick={() => setMobileView('folders')} className="w-8 h-8 rounded-full bg-surface-ground flex items-center justify-center text-text-secondary hover:bg-surface-hover">
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <span className="font-bold text-text-primary">{folders.find(f => f.id === selectedFolder)?.label}</span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredRequests.length === 0 ? (
                        <div className="p-8 text-center text-text-placeholder text-sm">Không tìm thấy yêu cầu nào.</div>
                    ) : (
                        <div className="divide-y divide-border-secondary">
                            {filteredRequests.map(req => (
                                <div
                                    key={req['Số đơn hàng']}
                                    onClick={() => handleRequestClick(req['Số đơn hàng'])}
                                    className={`px-3 py-2 cursor-pointer hover:bg-surface-hover transition-colors flex items-center justify-between ${selectedRequestId === req['Số đơn hàng'] ? 'bg-accent-primary/5 border-l-4 border-accent-primary' : 'border-l-4 border-transparent'}`}
                                >
                                    <span className="text-text-primary text-sm truncate pr-2">{req['Tên khách hàng']}</span>
                                    <div className="flex-shrink-0">
                                        {(() => {
                                            const status = (req['Trạng thái xử lý'] || '').toLowerCase();
                                            if (status.includes('chờ')) return <i className="fas fa-clock text-warning text-base" title={req['Trạng thái xử lý']}></i>;
                                            if (status.includes('đã duyệt') || status.includes('hoàn thành') || status.includes('phê duyệt')) return <i className="fas fa-check-circle text-blue-400 text-sm" title={req['Trạng thái xử lý']}></i>;
                                            if (status.includes('từ chối')) return <i className="fas fa-ban text-danger text-base" title={req['Trạng thái xử lý']}></i>;
                                            return <i className="fas fa-question-circle text-text-secondary text-base" title={req['Trạng thái xử lý']}></i>;
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Column 3: Detail */}
            <div
                className={`w-full flex-1 flex flex-col bg-surface-ground min-w-0 absolute md:relative inset-0 z-30 md:z-auto transition-transform duration-300 ${mobileView === 'detail' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {selectedRequest ? (
                    <>
                        {/* Header Actions - Compact */}
                        <div className="px-4 py-3 bg-white border-b border-border-primary flex justify-between items-center shadow-sm z-10">
                            <div className="flex items-center gap-3">
                                {/* Mobile Back Button */}
                                <button onClick={() => setMobileView('list')} className="md:hidden w-8 h-8 rounded-full bg-surface-ground flex items-center justify-center text-text-secondary hover:bg-surface-hover">
                                    <i className="fas fa-arrow-left"></i>
                                </button>

                                <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary font-bold text-base hidden sm:flex">
                                    {selectedRequest['Tên khách hàng'].charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <h2
                                        className="text-base font-bold text-text-primary leading-tight cursor-pointer hover:text-accent-primary transition-colors truncate"
                                        title="Click để sao chép tên khách hàng"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(selectedRequest['Tên khách hàng']);
                                            showToast('Đã sao chép', 'Tên khách hàng đã được sao chép', 'success');
                                        }}
                                    >
                                        {selectedRequest['Tên khách hàng']}
                                    </h2>
                                    <div className="text-xs text-text-secondary flex items-center gap-2 mt-0.5">
                                        <span
                                            className="font-mono cursor-pointer hover:text-accent-primary border-b border-dashed border-transparent hover:border-accent-primary transition-all"
                                            title="Click để sao chép số đơn hàng"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(selectedRequest['Số đơn hàng']);
                                                showToast('Đã sao chép', 'Số đơn hàng đã được sao chép', 'success');
                                            }}
                                        >
                                            {selectedRequest['Số đơn hàng']}
                                        </span>
                                        <span className="hidden sm:inline">•</span>
                                        <span className="hidden sm:inline">{selectedRequest['Người YC']}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onDownloadAll(selectedRequest)}
                                    className="btn btn-secondary px-2.5 py-1 text-xs flex items-center gap-1.5 rounded"
                                    title="Tải tất cả hồ sơ"
                                >
                                    <i className="fas fa-file-archive"></i>
                                    <span className="hidden xl:inline">Tải Hồ Sơ</span>
                                </button>
                                {getActions(selectedRequest['Trạng thái xử lý'] || '').map(action => (
                                    <button
                                        key={action.type}
                                        onClick={() => onAction(action.type as any, selectedRequest)}
                                        className={`btn ${action.className} px-2.5 py-1 text-xs flex items-center gap-1.5 rounded`}
                                    >
                                        <i className={`fas ${action.icon}`}></i>
                                        <span className="hidden xl:inline">{action.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content - Compact */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="max-w-5xl mx-auto space-y-4">
                                {/* Status Card */}
                                <div className="bg-white rounded-lg border border-border-primary px-4 py-3 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs text-text-secondary">Trạng thái:</div>
                                        <StatusBadge status={selectedRequest['Trạng thái xử lý'] || ''} size="sm" />
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-text-secondary">Ngày yêu cầu:</span>
                                        <span className="font-medium text-text-primary">{moment(selectedRequest['Thời gian YC']).format('HH:mm DD/MM/YYYY')}</span>
                                    </div>
                                </div>

                                {/* Request Info */}
                                <div className="bg-white rounded-lg border border-border-primary p-3 shadow-sm">
                                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 border-b border-border-secondary pb-1.5">Thông Tin Yêu Cầu</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="text-[10px] text-text-secondary block mb-0.5 uppercase">Loại Yêu Cầu</label>
                                            <div className="text-sm font-medium truncate">{selectedRequest['Loại YC']}</div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-text-secondary block mb-0.5 uppercase">Mã KH DMS</label>
                                            <CopyableField text={selectedRequest['Mã KH DMS'] || ''} showToast={showToast} className="font-mono text-sm truncate" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-text-secondary block mb-0.5 uppercase">Số VIN</label>
                                            <CopyableField text={selectedRequest.VIN || ''} showToast={showToast} className="font-mono font-bold text-accent-primary text-sm truncate" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-text-secondary block mb-0.5 uppercase">Ghi chú</label>
                                            <div className="text-sm truncate" title={selectedRequest['Ghi chú']}>{selectedRequest['Ghi chú'] || '—'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Documents */}
                                <div className="bg-white rounded-lg border border-border-primary p-3 shadow-sm flex flex-col h-full">
                                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 border-b border-border-secondary pb-1.5">Hồ Sơ Đính Kèm</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {(() => {
                                            const { docEntries, allImageSources } = getImages(selectedRequest);
                                            if (docEntries.length === 0) {
                                                return (
                                                    <div className="col-span-full text-center py-4 text-text-placeholder text-sm">
                                                        Không có hồ sơ đính kèm
                                                    </div>
                                                );
                                            }
                                            return docEntries.map(([key, url], index) => {
                                                const doc = docLabels[key] || { label: key, icon: 'fa-file' };
                                                return (
                                                    <DocumentCard
                                                        key={key}
                                                        url={url}
                                                        label={doc.label}
                                                        icon={doc.icon}
                                                        onClick={() => onOpenImagePreview(allImageSources, index, selectedRequest['Tên khách hàng'])}
                                                    />
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-placeholder">
                        <i className="fas fa-inbox text-6xl mb-4 opacity-20"></i>
                        <p>Chọn một yêu cầu để xem chi tiết</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VcInboxView;
