import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import * as apiService from '../../services/apiService';

interface BulkUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    hideToast: () => void;
    orders?: any[];
}

interface UploadableFile {
    file: File;
    orderNumber: string | null;
    status: 'valid' | 'invalid_name' | 'duplicate';
    manualOverride?: boolean;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const normalizeText = (str: string): string => {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const matchOrderFromFileName = (fileName: string, orders: any[] = []): string | null => {
    const cleanFileName = normalizeText(fileName);

    if (orders && orders.length > 0) {
        for (const o of orders) {
            const sdh = (o["Số đơn hàng"] || o.so_don_hang || '').toString().trim();
            if (!sdh) continue;

            const cleanSdh = normalizeText(sdh);
            if (cleanSdh && cleanFileName.includes(cleanSdh)) {
                return sdh.toUpperCase();
            }
        }
    }

    const orderNumberRegex = /((N\d+[-_]VSO[-_][A-Z0-9\-_]+)|(SO-\d+)|(N\d{5}-\d+))/i;
    const match = fileName.match(orderNumberRegex);
    if (match && match[1]) {
        return match[1].toUpperCase().replace(/_/g, '-');
    }

    if (orders && orders.length > 0) {
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
        const cleanNameOnly = normalizeText(nameWithoutExt);

        if (cleanNameOnly.length >= 3) {
            const matchedOrder = orders.find(o => {
                const customerNameRaw = o["Tên khách hàng"] || o.ten_khach_hang;
                if (!customerNameRaw) return false;
                const cleanCustomerName = normalizeText(customerNameRaw);
                return cleanCustomerName.length >= 3 && cleanNameOnly.includes(cleanCustomerName);
            });

            if (matchedOrder) {
                const sdh = matchedOrder["Số đơn hàng"] || matchedOrder.so_don_hang;
                if (sdh) return sdh.toString().toUpperCase();
            }
        }
    }

    return null;
};

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, onSuccess, showToast, hideToast: _hideToast, orders = [] }) => {
    const [files, setFiles] = useState<UploadableFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [manualInput, setManualInput] = useState<string>('');
    const [orderSearchFilter, setOrderSearchFilter] = useState<string>('');

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setFiles([]);
            setIsUploading(false);
            setEditingIndex(null);
            setManualInput('');
        }
    }, [isOpen]);

    const updateFileStatuses = useCallback((fileList: UploadableFile[]): UploadableFile[] => {
        const orderCounts = new Map<string, number>();
        fileList.forEach(f => {
            if (f.orderNumber) {
                const upper = f.orderNumber.toUpperCase();
                orderCounts.set(upper, (orderCounts.get(upper) || 0) + 1);
            }
        });

        return fileList.map(f => {
            if (!f.orderNumber) {
                return { ...f, status: 'invalid_name' };
            }
            const count = orderCounts.get(f.orderNumber.toUpperCase()) || 0;
            if (count > 1) {
                return { ...f, status: 'duplicate' };
            }
            return { ...f, status: 'valid' };
        });
    }, []);

    const handleClose = useCallback(() => {
        setFiles([]);
        setIsUploading(false);
        setEditingIndex(null);
        onClose();
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isUploading) handleClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, isUploading, handleClose]);

    const handleFiles = useCallback(async (incomingFiles: FileList | null) => {
        if (!incomingFiles || incomingFiles.length === 0) return;

        const newFilesArray = Array.from(incomingFiles);

        const newUploadableFiles: UploadableFile[] = newFilesArray.map(file => {
            const detectedOrderNumber = matchOrderFromFileName(file.name, orders);
            return {
                file,
                orderNumber: detectedOrderNumber,
                status: detectedOrderNumber ? 'valid' : 'invalid_name',
            };
        });

        setFiles(prev => {
            const existingFileNames = new Set(prev.map(f => f.file.name));
            const uniqueNewFiles = newUploadableFiles.filter(nf => !existingFileNames.has(nf.file.name));
            return updateFileStatuses([...prev, ...uniqueNewFiles]);
        });
    }, [orders, updateFileStatuses]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files) handleFiles(e.target.files);
    };

    const handleRemoveFile = (fileName: string) => {
        setFiles(prev => updateFileStatuses(prev.filter(f => f.file.name !== fileName)));
        if (editingIndex !== null) setEditingIndex(null);
    };

    const handleClearAll = () => {
        setFiles([]);
        setEditingIndex(null);
    };

    const handleAssignOrderNumber = (index: number, orderNo: string) => {
        const trimmed = orderNo.trim().toUpperCase();
        setFiles(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                orderNumber: trimmed || null,
                manualOverride: true,
            };
            return updateFileStatuses(updated);
        });
        setEditingIndex(null);
        setManualInput('');
        setOrderSearchFilter('');
    };

    const filteredOrderSuggestions = useMemo(() => {
        if (!orders || orders.length === 0) return [];
        const term = normalizeText(orderSearchFilter || manualInput);
        if (!term) return orders.slice(0, 10);

        return orders.filter(o => {
            const sdh = (o["Số đơn hàng"] || o.so_don_hang || '').toString();
            const kh = (o["Tên khách hàng"] || o.ten_khach_hang || '').toString();
            const xe = (o["Dòng xe"] || o.dong_xe || '').toString();
            return normalizeText(sdh).includes(term) || normalizeText(kh).includes(term) || normalizeText(xe).includes(term);
        }).slice(0, 15);
    }, [orders, orderSearchFilter, manualInput]);

    const handleUpload = async () => {
        const validFiles = files.filter(f => f.status === 'valid' || f.status === 'duplicate');
        if (validFiles.length === 0) {
            showToast('Không có tệp hợp lệ', 'Vui lòng gán hoặc chọn mã đơn hàng cho các tệp tải lên.', 'warning');
            return;
        }

        setIsUploading(true);

        try {
            const { compressFileIfNeeded } = await import('../../services/ocrService');
            const filesData = await Promise.all(
                validFiles.map(async ({ file, orderNumber }) => {
                    const processedFile = await compressFileIfNeeded(file);
                    return {
                        orderNumber: orderNumber!,
                        base64Data: await fileToBase64(processedFile),
                        mimeType: processedFile.type,
                        fileName: processedFile.name,
                        fileObject: processedFile
                    };
                })
            );

            const result = await apiService.uploadBulkInvoices(filesData);
            showToast('Hoàn tất!', result.message, result.status === 'SUCCESS' ? 'success' : 'warning', 10000);
            if (result.status === 'SUCCESS') {
                onSuccess();
                handleClose();
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Lỗi không xác định.';
            showToast('Tải lên thất bại', message, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    const validFilesCount = files.filter(f => (f.status === 'valid' || f.status === 'duplicate') && !!f.orderNumber).length;
    const invalidFilesCount = files.filter(f => f.status === 'invalid_name').length;
    const duplicateFilesCount = files.filter(f => f.status === 'duplicate').length;

    return (
        <div
            className="bu-sheet"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isUploading) { window.dispatchEvent(new CustomEvent('close-all-sheets')); handleClose(); }
            }}
        >
            <style>{`
                .bu-sheet {
                    position: fixed;
                    inset: 0 0 0 64px;
                    width: calc(100vw - 64px);
                    height: 100dvh;
                    z-index: 1005;
                    display: flex;
                    align-items: stretch;
                    justify-content: flex-start;
                    background: rgba(15, 23, 42, 0.08);
                    overflow: hidden;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                }
                @media (max-width: 768px) {
                    .bu-sheet {
                        inset: 0;
                        width: 100vw;
                    }
                }
                .bu-sheet-panel {
                    width: clamp(360px, 38vw, 520px);
                    max-width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #ffffff;
                    color: #17263b;
                    border-right: 1px solid #e2e8f0;
                    box-shadow: 18px 0 42px -14px rgba(20, 34, 54, 0.16);
                    animation: buSlideInLeft 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @keyframes buSlideInLeft {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .bu-header {
                    padding: 22px 20px 14px;
                    border-bottom: 1px solid #e9edf2;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                }
                .bu-title {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 650;
                    line-height: 1.15;
                    letter-spacing: -0.5px;
                    color: #17263b;
                }
                .bu-subtitle {
                    margin: 4px 0 0;
                    font-size: 11.5px;
                    font-weight: 450;
                    color: #7b879a;
                }
                .bu-close-btn {
                    width: 28px;
                    height: 28px;
                    border: 0;
                    border-radius: 6px;
                    background: transparent;
                    color: #64748b;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    flex-shrink: 0;
                }
                .bu-close-btn:hover {
                    background: #f1f5f9;
                    color: #0f172a;
                }
                .bu-body {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    padding: 18px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .bu-dropzone {
                    border: 1px dashed #cbd5e1;
                    border-radius: 8px;
                    padding: 22px 16px;
                    text-align: center;
                    background: #f8fafc;
                    cursor: pointer;
                    transition: border-color 140ms ease, background-color 140ms ease;
                }
                .bu-dropzone:hover, .bu-dropzone.is-drag {
                    border-color: #3b82f6;
                    background: #eff6ff;
                }
                .bu-table {
                    border: 1px solid #e9edf2;
                    border-radius: 8px;
                    background: #ffffff;
                    overflow: hidden;
                }
                .bu-row {
                    padding: 11px 12px;
                    border-bottom: 1px solid #eef2f6;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .bu-row:last-child {
                    border-bottom: 0;
                }
                .bu-footer {
                    padding: 12px 20px;
                    border-top: 1px solid #eef2f6;
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                }
                .bu-btn-cancel {
                    height: 34px;
                    padding: 0 14px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    background: #ffffff;
                    color: #475569;
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                }
                .bu-btn-cancel:hover:not(:disabled) {
                    background: #f8fafc;
                    color: #17263b;
                }
                .bu-btn-submit {
                    height: 34px;
                    padding: 0 16px;
                    border: 0;
                    border-radius: 8px;
                    background: #17263b;
                    color: #ffffff;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                }
                .bu-btn-submit:hover:not(:disabled) {
                    background: #0f172a;
                }
                .bu-btn-submit:disabled, .bu-btn-cancel:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }
            `}</style>

            <div className="bu-sheet-panel" onClick={e => e.stopPropagation()}>
                <header className="bu-header">
                    <div>
                        <h2 className="bu-title">Tải lên HĐ hàng loạt</h2>
                        <p className="bu-subtitle">Tự động nhận diện và ghép đơn theo tên tệp hoặc khách hàng</p>
                    </div>
                    <button onClick={handleClose} className="bu-close-btn" aria-label="Đóng">
                        <X size={16} strokeWidth={2} />
                    </button>
                </header>

                <main className="bu-body">
                    <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}>
                        <input ref={inputRef} type="file" multiple className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleChange} />
                        <div
                            className={`bu-dropzone ${dragActive ? 'is-drag' : ''}`}
                            onClick={() => inputRef.current?.click()}
                        >
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#17263b' }}>
                                Kéo thả tệp vào đây hoặc bấm để chọn tệp
                            </div>
                            <div style={{ fontSize: 11, color: '#7b879a', marginTop: 4 }}>
                                Hỗ trợ PDF, PNG, JPG • Tự động khớp Số đơn hàng hoặc Tên khách hàng
                            </div>
                        </div>
                    </div>

                    {files.length > 0 && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: 600, color: '#475569' }}>
                                    <span>Danh sách tệp ({files.length})</span>
                                    {invalidFilesCount > 0 && (
                                        <span style={{ color: '#dc2626' }}>• {invalidFilesCount} chưa ghép</span>
                                    )}
                                    {duplicateFilesCount > 0 && (
                                        <span style={{ color: '#d97706' }}>• {duplicateFilesCount} trùng mã</span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClearAll}
                                    style={{ border: 0, background: 'transparent', fontSize: 11, fontWeight: 500, color: '#64748b', cursor: 'pointer' }}
                                >
                                    Xóa tất cả
                                </button>
                            </div>

                            <div className="bu-table">
                                {files.map((f, i) => (
                                    <div key={i} className="bu-row">
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ fontSize: 12, fontWeight: 600, color: '#17263b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {f.file.name}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, fontSize: 11 }}>
                                                    {f.status === 'invalid_name' ? (
                                                        <span style={{ color: '#dc2626', fontWeight: 500 }}>Chưa ghép mã đơn</span>
                                                    ) : (
                                                        <span style={{ color: f.status === 'duplicate' ? '#d97706' : '#16a34a', fontWeight: 600, fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace' }}>
                                                            {f.orderNumber} {f.manualOverride ? '(Thủ công)' : ''}
                                                        </span>
                                                    )}
                                                    <span style={{ color: '#94a3b8' }}>• {(f.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (editingIndex === i) {
                                                            setEditingIndex(null);
                                                        } else {
                                                            setEditingIndex(i);
                                                            setManualInput(f.orderNumber || '');
                                                            setOrderSearchFilter('');
                                                        }
                                                    }}
                                                    style={{
                                                        height: 26,
                                                        padding: '0 8px',
                                                        borderRadius: 6,
                                                        border: '1px solid #e2e8f0',
                                                        background: editingIndex === i ? '#17263b' : '#ffffff',
                                                        color: editingIndex === i ? '#ffffff' : '#475569',
                                                        fontSize: 11,
                                                        fontWeight: 500,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Sửa mã
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFile(f.file.name)}
                                                    style={{
                                                        height: 26,
                                                        padding: '0 8px',
                                                        borderRadius: 6,
                                                        border: '1px solid #fee2e2',
                                                        background: '#ffffff',
                                                        color: '#dc2626',
                                                        fontSize: 11,
                                                        fontWeight: 500,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </div>

                                        {(editingIndex === i || f.status === 'invalid_name') && (
                                            <div style={{ padding: 10, borderRadius: 6, background: '#f8fafc', border: '1px solid #e9edf2', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <input
                                                        type="text"
                                                        value={editingIndex === i ? manualInput : orderSearchFilter}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (editingIndex === i) setManualInput(val);
                                                            setOrderSearchFilter(val);
                                                        }}
                                                        placeholder="Nhập mã SĐH hoặc tên KH..."
                                                        style={{
                                                            flex: 1,
                                                            height: 32,
                                                            padding: '0 10px',
                                                            border: '1px solid #dbe2ea',
                                                            borderRadius: 6,
                                                            background: '#ffffff',
                                                            fontSize: 11.5,
                                                            fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAssignOrderNumber(i, editingIndex === i ? manualInput : orderSearchFilter)}
                                                        disabled={!(editingIndex === i ? manualInput : orderSearchFilter).trim()}
                                                        style={{
                                                            height: 32,
                                                            padding: '0 12px',
                                                            borderRadius: 6,
                                                            border: 0,
                                                            background: '#17263b',
                                                            color: '#ffffff',
                                                            fontSize: 11.5,
                                                            fontWeight: 600,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Gán
                                                    </button>
                                                </div>

                                                {filteredOrderSuggestions.length > 0 && (
                                                    <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #e9edf2', borderRadius: 6, background: '#ffffff' }}>
                                                        {filteredOrderSuggestions.map((o, idx) => {
                                                            const sdh = (o["Số đơn hàng"] || o.so_don_hang || '').toString();
                                                            const kh = (o["Tên khách hàng"] || o.ten_khach_hang || 'Không tên').toString();
                                                            const xe = (o["Dòng xe"] || o.dong_xe || '').toString();
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    onClick={() => handleAssignOrderNumber(i, sdh)}
                                                                    style={{
                                                                        padding: '6px 10px',
                                                                        borderBottom: '1px solid #f1f5f9',
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                        fontSize: 11,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
                                                                        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontWeight: 600, color: '#2563eb' }}>{sdh}</span>
                                                                        <span style={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kh}</span>
                                                                    </div>
                                                                    <span style={{ color: '#94a3b8', fontSize: 10.5, flexShrink: 0 }}>{xe}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>

                <footer className="bu-footer">
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>
                        {files.length > 0 && (
                            <span>Hợp lệ: <strong style={{ color: '#17263b' }}>{validFilesCount}</strong> / {files.length} tệp</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            type="button"
                            onClick={!isUploading ? handleClose : undefined}
                            disabled={isUploading}
                            className="bu-btn-cancel"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="button"
                            onClick={!isUploading && validFilesCount > 0 ? handleUpload : undefined}
                            disabled={isUploading || validFilesCount === 0}
                            className="bu-btn-submit"
                        >
                            {isUploading ? 'Đang tải lên...' : `Tải lên ${validFilesCount > 0 ? `(${validFilesCount})` : ''}`}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default BulkUploadModal;
