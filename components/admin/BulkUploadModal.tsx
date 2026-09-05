import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as apiService from '../../services/apiService';
import { useModalBackground } from '../../utils/styleUtils';

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

/**
 * Chuẩn hóa chuỗi tiếng Việt (bỏ dấu, chuyển thường, giữ chữ và số)
 */
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

/**
 * Thuật toán tự động tìm mã đơn hàng từ tên file
 */
const matchOrderFromFileName = (fileName: string, orders: any[] = []): string | null => {
    const cleanFileName = normalizeText(fileName);

    // 1. Kiểm tra xem có chứa trực tiếp Số đơn hàng nào từ cơ sở dữ liệu không
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

    // 2. Thử khớp Regex mã đơn hàng đa dạng hơn (N...-VSO-..., SO-..., N...)
    const orderNumberRegex = /((N\d+[-_]VSO[-_][A-Z0-9\-_]+)|(SO-\d+)|(N\d{5}-\d+))/i;
    const match = fileName.match(orderNumberRegex);
    if (match && match[1]) {
        return match[1].toUpperCase().replace(/_/g, '-');
    }

    // 3. Khớp theo Tên khách hàng (bỏ dấu tiếng Việt)
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
    const bgStyle = useModalBackground();

    useEffect(() => {
        if (isOpen) {
            setFiles([]);
            setIsUploading(false);
            setEditingIndex(null);
            setManualInput('');
        }
    }, [isOpen]);

    // Đánh giá và cập nhật trạng thái duplicate cho danh sách file
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

    // Gán mã đơn hàng thủ công cho 1 file
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

    // Danh sách gợi ý đơn hàng khi gán thủ công
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
            const filesData = await Promise.all(
                validFiles.map(async ({ file, orderNumber }) => ({
                    orderNumber: orderNumber!,
                    base64Data: await fileToBase64(file),
                    mimeType: file.type,
                    fileName: file.name,
                    fileObject: file
                }))
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300" onClick={handleClose}>
            <div className="bg-surface-card w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-scale-up border border-white/20" onClick={e => e.stopPropagation()} style={bgStyle}>
                
                {/* HEADER */}
                <header className="flex-shrink-0 p-5 bg-gradient-to-r from-slate-50 to-blue-50/30 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                            <i className="fas fa-cloud-upload-alt text-lg"></i>
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Tải Hóa Đơn Hàng Loạt</h2>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Tự động nhận diện và ghép đơn theo tên file & khách hàng</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </header>

                <main className="p-6 overflow-y-auto flex-grow min-h-0 custom-scrollbar bg-slate-50/50">
                    
                    {/* DRAG AND DROP ZONE */}
                    <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} className="w-full">
                        <input ref={inputRef} type="file" multiple className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleChange} />
                        <div
                            className={`relative w-full h-44 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 group cursor-pointer overflow-hidden
                                ${dragActive 
                                    ? 'border-2 border-blue-500 bg-blue-50/80 shadow-[0_0_20px_rgba(59,130,246,0.15)] scale-[1.01]' 
                                    : 'border-2 border-dashed border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-md'
                                }`}
                            onClick={() => inputRef.current?.click()}
                        >
                            <div className={`w-14 h-14 mb-3 rounded-full flex items-center justify-center transition-all duration-300 ${dragActive ? 'bg-blue-600 text-white scale-110' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 group-hover:scale-110'}`}>
                                <i className="fas fa-file-upload text-xl"></i>
                            </div>
                            <p className="font-bold text-slate-700 text-base">Kéo thả file vào đây</p>
                            <p className="text-slate-400 text-xs mt-1 mb-2">hoặc <span className="text-blue-600 font-semibold group-hover:underline">duyệt thư mục</span></p>
                            
                            <div className="flex items-center gap-2 mt-1 px-3 py-1 bg-slate-100 rounded-full text-[11px] font-medium text-slate-500">
                                <i className="fas fa-magic text-purple-500"></i>
                                Hỗ trợ: Tên file chứa SỐ ĐƠN HÀNG hoặc TÊN KHÁCH HÀNG
                            </div>
                        </div>
                    </div>

                    {/* FILE LIST ZONE */}
                    {files.length > 0 && (
                        <div className="mt-6 animate-fade-in-up">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <i className="fas fa-list-ul text-slate-400"></i> Danh sách tải lên
                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">{files.length}</span>
                                    </h3>
                                    {invalidFilesCount > 0 && (
                                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                            <i className="fas fa-exclamation-triangle"></i> {invalidFilesCount} chưa ghép
                                        </span>
                                    )}
                                    {duplicateFilesCount > 0 && (
                                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                            <i className="fas fa-copy"></i> {duplicateFilesCount} trùng mã
                                        </span>
                                    )}
                                </div>

                                <button
                                    onClick={handleClearAll}
                                    className="text-xs text-slate-400 hover:text-red-500 font-medium transition-colors flex items-center gap-1"
                                >
                                    <i className="fas fa-trash-alt"></i> Xóa tất cả
                                </button>
                            </div>
                            
                            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                                {files.map((f, i) => (
                                    <div key={i} className={`p-3 rounded-xl border transition-all duration-200 hover:shadow-md flex flex-col gap-2
                                        ${f.status === 'invalid_name' 
                                            ? 'bg-red-50/40 border-red-200' 
                                            : f.status === 'duplicate'
                                            ? 'bg-amber-50/40 border-amber-200'
                                            : 'bg-white border-slate-200/80'}`}>
                                        
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center 
                                                ${f.status === 'invalid_name' ? 'bg-red-100 text-red-500' : f.status === 'duplicate' ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                                                <i className={`fas ${f.file.name.endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-image'} text-base`}></i>
                                            </div>

                                            <div className="flex-grow min-w-0">
                                                <p className="text-xs font-bold text-slate-700 truncate">{f.file.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    {f.status === 'invalid_name' ? (
                                                        <span className="text-[11px] font-semibold text-red-500 flex items-center gap-1">
                                                            <i className="fas fa-times-circle"></i> Chưa ghép mã đơn
                                                        </span>
                                                    ) : (
                                                        <span className={`text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md
                                                            ${f.status === 'duplicate' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                            <i className={`fas ${f.status === 'duplicate' ? 'fa-copy' : 'fa-check-circle'}`}></i>
                                                            SĐH: {f.orderNumber}
                                                            {f.manualOverride && <span className="text-[9px] opacity-75">(Thủ công)</span>}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] font-medium text-slate-400">{(f.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                {/* Nút sửa/gán mã đơn thủ công */}
                                                <button
                                                    onClick={() => {
                                                        if (editingIndex === i) {
                                                            setEditingIndex(null);
                                                        } else {
                                                            setEditingIndex(i);
                                                            setManualInput(f.orderNumber || '');
                                                            setOrderSearchFilter('');
                                                        }
                                                    }}
                                                    className={`w-8 h-8 rounded-lg text-xs font-medium flex items-center justify-center transition-colors
                                                        ${editingIndex === i ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600'}`}
                                                    title="Gán / đổi mã đơn hàng"
                                                >
                                                    <i className="fas fa-pen"></i>
                                                </button>

                                                <button 
                                                    onClick={() => handleRemoveFile(f.file.name)} 
                                                    className="w-8 h-8 rounded-lg text-slate-400 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
                                                    title="Xóa tệp"
                                                >
                                                    <i className="fas fa-trash-alt text-xs"></i>
                                                </button>
                                            </div>
                                        </div>

                                        {/* INLINE ORDER PICKER / SELECTOR */}
                                        {(editingIndex === i || f.status === 'invalid_name') && (
                                            <div className="mt-1 p-2.5 bg-slate-100/80 rounded-xl border border-slate-200 text-xs flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-slate-600 flex items-center gap-1">
                                                        <i className="fas fa-search text-blue-500"></i> Chọn hoặc gõ Mã đơn hàng cho tệp này:
                                                    </span>
                                                    {editingIndex === i && (
                                                        <button 
                                                            onClick={() => setEditingIndex(null)}
                                                            className="text-[11px] text-slate-400 hover:text-slate-600"
                                                        >
                                                            Đóng
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={editingIndex === i ? manualInput : orderSearchFilter}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (editingIndex === i) setManualInput(val);
                                                            setOrderSearchFilter(val);
                                                        }}
                                                        placeholder="Nhập mã SĐH hoặc tên KH..."
                                                        className="flex-grow px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase font-mono"
                                                    />
                                                    <button
                                                        onClick={() => handleAssignOrderNumber(i, editingIndex === i ? manualInput : orderSearchFilter)}
                                                        disabled={!(editingIndex === i ? manualInput : orderSearchFilter).trim()}
                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 transition-all flex items-center gap-1"
                                                    >
                                                        <i className="fas fa-check"></i> Gán
                                                    </button>
                                                </div>

                                                {/* Danh sách gợi ý từ DB */}
                                                {filteredOrderSuggestions.length > 0 && (
                                                    <div className="max-h-32 overflow-y-auto bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 custom-scrollbar">
                                                        {filteredOrderSuggestions.map((o, idx) => {
                                                            const sdh = (o["Số đơn hàng"] || o.so_don_hang || '').toString();
                                                            const kh = (o["Tên khách hàng"] || o.ten_khach_hang || 'Không tên').toString();
                                                            const xe = (o["Dòng xe"] || o.dong_xe || '').toString();
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    onClick={() => handleAssignOrderNumber(i, sdh)}
                                                                    className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-2 truncate">
                                                                        <span className="font-mono font-bold text-blue-700">{sdh}</span>
                                                                        <span className="text-slate-600 truncate">{kh}</span>
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-medium flex-shrink-0">{xe}</span>
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

                <footer className="px-6 py-4 flex justify-between items-center bg-slate-50/80 rounded-b-3xl border-t border-slate-200/60 flex-shrink-0 backdrop-blur-md">
                    <div className="text-xs text-slate-500 font-medium">
                        {files.length > 0 && (
                            <span>Sẵn sàng tải lên: <b className="text-blue-600">{validFilesCount}</b> / {files.length} tệp</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={!isUploading ? handleClose : undefined}
                            disabled={isUploading}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={!isUploading && validFilesCount > 0 ? handleUpload : undefined}
                            disabled={isUploading || validFilesCount === 0}
                            className="px-5 py-2 rounded-lg text-sm font-semibold text-white shadow-md hover:shadow-lg hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 bg-blue-500 flex items-center justify-center gap-2 border border-blue-600/20"
                        >
                            {isUploading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin text-base"></i>
                                    <span>Đang xử lý...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-upload text-base"></i>
                                    <span>Tải lên {validFilesCount > 0 ? `(${validFilesCount})` : ''}</span>
                                </>
                            )}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default BulkUploadModal;