import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import * as xlsx from 'xlsx';
import { versionsMap } from '../../constants';

interface BulkAddCarExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess: (data: any[]) => void;
}

export interface ExcelGridRow {
    id: string;
    vin: string;
    dong_xe: string;
    phien_ban: string;
    ngoai_that: string;
    noi_that: string;
    ma_dms: string;
}

const GRID_COLUMNS: (keyof ExcelGridRow)[] = ['vin', 'dong_xe', 'phien_ban', 'ngoai_that', 'noi_that', 'ma_dms'];

const createEmptyRow = (idIndex: number): ExcelGridRow => ({
    id: `row-${Date.now()}-${idIndex}-${Math.random()}`,
    vin: '',
    dong_xe: '',
    phien_ban: '',
    ngoai_that: '',
    noi_that: '',
    ma_dms: ''
});

const createInitialRows = (count = 5): ExcelGridRow[] => {
    return Array.from({ length: count }, (_, i) => createEmptyRow(i));
};

const BulkAddCarExcelModal: React.FC<BulkAddCarExcelModalProps> = ({ isOpen, onClose, showToast, onSuccess }) => {
    const [gridRows, setGridRows] = useState<ExcelGridRow[]>(() => createInitialRows(5));
    const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [replaceQuery, setReplaceQuery] = useState('');
    const [matchExact, setMatchExact] = useState(false);
    const [matchCase, setMatchCase] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setGridRows(createInitialRows(5));
            setFocusedCell(null);
            setIsUploading(false);
            setIsSearchOpen(false);
            setSearchQuery('');
            setReplaceQuery('');
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape' && !isUploading) {
                onClose();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F' || e.key === 'h' || e.key === 'H')) {
                e.preventDefault();
                setIsSearchOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isUploading, onClose]);

    if (!isOpen) return null;

    const validRows = gridRows.filter(r => r.vin && r.vin.length === 17);

    const handleCellChange = (id: string, field: keyof ExcelGridRow, value: string) => {
        setGridRows(prev => prev.map(row => {
            if (row.id !== id) return row;
            const updated = { ...row, [field]: value };
            if (field === 'vin') {
                updated.vin = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            }
            if (field === 'dong_xe' && value) {
                const mUpper = value.trim().toUpperCase().replace(/\s+/g, ' ');
                if (mUpper === 'VF5' || mUpper === 'VF 5' || mUpper.startsWith('VF5 ') || mUpper.startsWith('VF 5 ')) {
                    updated.dong_xe = 'VF 5';
                    if (!updated.phien_ban) updated.phien_ban = 'Plus';
                } else if (mUpper === 'VF3' || mUpper === 'VF 3') {
                    updated.dong_xe = 'VF 3';
                } else {
                    const vMap = versionsMap as Record<string, string[]>;
                    const versions = vMap[value] || vMap[value.toLowerCase()] || [];
                    if (versions.length === 1 && !updated.phien_ban) {
                        updated.phien_ban = versions[0];
                    }
                }
            }
            return updated;
        }));
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const target = e.target as HTMLElement;
        if (target && target.closest && target.closest('.no-grid-paste')) {
            return;
        }

        const text = e.clipboardData.getData('text');
        if (!text) return;

        const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length === 0) return;

        e.preventDefault();

        const startRowIndex = focusedCell ? focusedCell.rowIndex : 0;
        const startColIndex = focusedCell ? focusedCell.colIndex : 0;

        const firstLine = lines[0];
        let sep = '\t';
        if (firstLine.includes('\t')) sep = '\t';
        else if (firstLine.includes(';')) sep = ';';
        else if (firstLine.includes(',')) sep = ',';

        const firstLineCells = firstLine.split(sep).map(c => c.trim().toLowerCase());
        const isHeader = firstLineCells.some(c => c.includes('vin') || c.includes('dòng xe') || c.includes('mô tả') || c.includes('phiên bản'));
        const dataLines = isHeader ? lines.slice(1) : lines;

        const vMap = versionsMap as Record<string, string[]>;

        setGridRows(prev => {
            const nextRows = [...prev];

            dataLines.forEach((line, lineIdx) => {
                const targetRowIdx = startRowIndex + lineIdx;
                while (nextRows.length <= targetRowIdx) {
                    nextRows.push(createEmptyRow(nextRows.length));
                }

                const cells = line.split(sep).map(c => c.trim());
                const rowObj = { ...nextRows[targetRowIdx] };

                if (isHeader) {
                    firstLineCells.forEach((h, cIdx) => {
                        const val = cells[cIdx] || '';
                        if (h.includes('vin') || h.includes('khung')) rowObj.vin = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
                        else if (h.includes('dòng') || h.includes('mô tả') || h.includes('model')) rowObj.dong_xe = val;
                        else if (h.includes('phiên') || h.includes('version')) rowObj.phien_ban = val;
                        else if (h.includes('ngoại') || h.includes('màu xe')) rowObj.ngoai_that = val;
                        else if (h.includes('nội')) rowObj.noi_that = val;
                        else if (h.includes('dms') || h.includes('khu vực') || h.includes('vị trí')) rowObj.ma_dms = val;
                    });
                } else {
                    cells.forEach((val, cIdx) => {
                        const targetColIdx = startColIndex + cIdx;
                        if (targetColIdx < GRID_COLUMNS.length) {
                            const colKey = GRID_COLUMNS[targetColIdx];
                            if (colKey === 'vin') {
                                rowObj.vin = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            } else {
                                (rowObj as any)[colKey] = val;
                            }
                        }
                    });
                }

                if (rowObj.dong_xe) {
                    const mUpper = rowObj.dong_xe.trim().toUpperCase().replace(/\s+/g, ' ');
                    if (mUpper === 'VF5' || mUpper === 'VF 5' || mUpper.startsWith('VF5 ') || mUpper.startsWith('VF 5 ')) {
                        rowObj.dong_xe = 'VF 5';
                        if (!rowObj.phien_ban) rowObj.phien_ban = 'Plus';
                    } else if (mUpper === 'VF3' || mUpper === 'VF 3') {
                        rowObj.dong_xe = 'VF 3';
                    } else {
                        const versions = vMap[rowObj.dong_xe] || vMap[rowObj.dong_xe.toLowerCase()] || [];
                        if (versions.length === 1 && !rowObj.phien_ban) {
                            rowObj.phien_ban = versions[0];
                        }
                    }
                }

                nextRows[targetRowIdx] = rowObj;
            });

            return nextRows;
        });

        showToast('Đã dán dữ liệu', `Đã dán ${dataLines.length} dòng bắt đầu từ dòng ${startRowIndex + 1}, cột ${startColIndex + 1}`, 'success');
    };

    const handleReplaceAll = () => {
        if (!searchQuery.trim()) {
            showToast('Chưa nhập từ khóa', 'Vui lòng nhập từ khóa cần tìm kiếm.', 'warning');
            return;
        }

        let matchCount = 0;
        const vMap = versionsMap as Record<string, string[]>;

        setGridRows(prev => prev.map(row => {
            const nextRow = { ...row };
            GRID_COLUMNS.forEach(col => {
                const val = String((nextRow as any)[col] || '');
                if (!val) return;

                let shouldReplace = false;
                let newVal = val;

                if (matchExact) {
                    const isMatch = matchCase ? val === searchQuery : val.toLowerCase() === searchQuery.toLowerCase();
                    if (isMatch) {
                        newVal = replaceQuery;
                        shouldReplace = true;
                    }
                } else {
                    const isMatch = matchCase ? val.includes(searchQuery) : val.toLowerCase().includes(searchQuery.toLowerCase());
                    if (isMatch) {
                        const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const flags = matchCase ? 'g' : 'gi';
                        const re = new RegExp(escaped, flags);
                        newVal = val.replace(re, replaceQuery);
                        shouldReplace = true;
                    }
                }

                if (shouldReplace) {
                    matchCount++;
                    if (col === 'vin') {
                        newVal = newVal.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    }
                    (nextRow as any)[col] = newVal;
                }
            });

            if (nextRow.dong_xe) {
                const versions = vMap[nextRow.dong_xe] || vMap[nextRow.dong_xe.toLowerCase()] || [];
                if (versions.length === 1 && !nextRow.phien_ban) {
                    nextRow.phien_ban = versions[0];
                }
            }

            return nextRow;
        }));

        if (matchCount > 0) {
            showToast('Hoàn tất thay thế', `Đã thay thế ${matchCount} vị trí trùng khớp trong bảng!`, 'success');
        } else {
            showToast('Không tìm thấy', `Không tìm thấy từ khóa "${searchQuery}" trong bảng.`, 'warning');
        }
    };

    const handleAddRow = () => {
        setGridRows(prev => [...prev, createEmptyRow(prev.length)]);
    };

    const handleDeleteRow = (id: string) => {
        setGridRows(prev => {
            const next = prev.filter(r => r.id !== id);
            return next.length > 0 ? next : createInitialRows(3);
        });
    };

    const handleDownloadTemplate = () => {
        const ws = xlsx.utils.json_to_sheet([
            {
                'Số VIN': 'VF312345678901234',
                'Dòng xe': 'VF 3',
                'Phiên bản': 'Base',
                'Ngoại thất': 'Trắng',
                'Nội thất': 'Đen',
                'Mã DMS': 'DMS-HCM'
            },
            {
                'Số VIN': 'VF598765432109876',
                'Dòng xe': 'VF 5',
                'Phiên bản': 'Plus',
                'Ngoại thất': 'Đỏ',
                'Nội thất': 'Đen',
                'Mã DMS': 'DMS-HN'
            }
        ]);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'MauNhapXe');
        xlsx.writeFile(wb, 'Mau_Nhap_Xe_Tu_Excel.xlsx');
    };

    const handleClearAll = () => {
        setGridRows(createInitialRows(5));
        setFocusedCell(null);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            try {
                const data = await file.arrayBuffer();
                const workbook = xlsx.read(data);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

                if (rows.length === 0) {
                    showToast('Lỗi', 'File Excel không có dữ liệu', 'warning');
                    return;
                }

                const findColumn = (row: any, keywords: string[]) => {
                    const keys = Object.keys(row);
                    for (const kw of keywords) {
                        const found = keys.find(k => k.toLowerCase().includes(kw.toLowerCase()));
                        if (found) return found;
                    }
                    return null;
                };

                const vMap = versionsMap as Record<string, string[]>;

                const parsed: ExcelGridRow[] = rows.map((row, idx) => {
                    const vinKey = findColumn(row, ['Số VIN', 'VIN', 'Số khung', 'Chassis']) || '';
                    const modelKey = findColumn(row, ['Dòng xe', 'Mô tả sản phẩm', 'Model', 'Loại xe']) || '';
                    const versionKey = findColumn(row, ['Phiên bản', 'Version', 'Option']) || '';
                    const exteriorKey = findColumn(row, ['Ngoại thất', 'Màu ngoại thất', 'Màu xe', 'Exterior']) || '';
                    const interiorKey = findColumn(row, ['Nội thất', 'Màu nội thất', 'Interior']) || '';
                    const regionKey = findColumn(row, ['Khu vực', 'Mã DMS', 'Vị trí', 'Region']) || '';

                    const modelName = String(row[modelKey] || '').trim();
                    let versionName = String(row[versionKey] || '').trim();
                    if (modelName) {
                        const versions = vMap[modelName] || vMap[modelName.toLowerCase()] || [];
                        if (versions.length === 1 && !versionName) {
                            versionName = versions[0];
                        }
                    }

                    return {
                        id: `row-excel-${idx}-${Date.now()}`,
                        vin: String(row[vinKey] || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''),
                        dong_xe: modelName,
                        phien_ban: versionName,
                        ngoai_that: String(row[exteriorKey] || '').trim(),
                        noi_that: String(row[interiorKey] || '').trim(),
                        ma_dms: String(row[regionKey] || '').trim()
                    };
                });

                setGridRows(prev => {
                    const nonEmptyPrev = prev.filter(r => r.vin.trim() || r.dong_xe.trim());
                    return [...nonEmptyPrev, ...parsed];
                });

                showToast('Thành công', `Đã tải ${parsed.length} dòng từ file Excel vào bảng!`, 'success');
            } catch (err: any) {
                showToast('Lỗi đọc file', err.message || 'Không thể đọc file Excel', 'error');
            }
        }
    };

    const handleImportToStock = () => {
        if (validRows.length === 0) {
            showToast('Thiếu số VIN', 'Vui lòng nhập hoặc dán ít nhất 1 dòng xe có Số VIN đúng 17 ký tự.', 'warning');
            return;
        }

        setIsUploading(true);
        try {
            const uniqueMap = new Map<string, ExcelGridRow>();
            validRows.forEach(item => uniqueMap.set(item.vin, item));
            const finalData = Array.from(uniqueMap.values());

            onSuccess(finalData);
            showToast('Thành công', `Đã import ${finalData.length} xe vào kho hàng!`, 'success');
            onClose();
        } catch (err: any) {
            showToast('Lỗi Import', err.message || 'Không thể import xe', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div
            className="eg-sheet"
            onPaste={handlePaste}
            onClick={(e) => {
                if (e.target === e.currentTarget && !isUploading) { window.dispatchEvent(new CustomEvent('close-all-sheets')); onClose(); }
            }}
        >
            <style>{`
                .eg-sheet {
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
                    .eg-sheet {
                        inset: 0;
                        width: 100vw;
                    }
                }
                .eg-sheet-panel {
                    width: clamp(640px, 68vw, 960px);
                    max-width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #ffffff;
                    color: #17263b;
                    border-right: 1px solid #e2e8f0;
                    box-shadow: 18px 0 42px -14px rgba(20, 34, 54, 0.16);
                    animation: egSlideInLeft 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @keyframes egSlideInLeft {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .eg-header {
                    padding: 22px 24px 14px;
                    border-bottom: 1px solid #e9edf2;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                }
                .eg-title {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 650;
                    line-height: 1.15;
                    letter-spacing: -0.5px;
                    color: #17263b;
                }
                .eg-subtitle {
                    margin: 4px 0 0;
                    font-size: 11.5px;
                    font-weight: 450;
                    color: #7b879a;
                }
                .eg-close-btn {
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
                }
                .eg-close-btn:hover {
                    background: #f1f5f9;
                    color: #0f172a;
                }
                .eg-toolbar {
                    padding: 10px 24px;
                    border-bottom: 1px solid #e9edf2;
                    background: #f8fafc;
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                }
                .eg-tool-btn {
                    height: 30px;
                    padding: 0 11px;
                    border: 1px solid #dbe2ea;
                    border-radius: 6px;
                    background: #ffffff;
                    color: #17263b;
                    font-size: 11.5px;
                    font-weight: 500;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                .eg-tool-btn:hover {
                    background: #f1f5f9;
                }
                .eg-search-bar {
                    padding: 10px 24px;
                    border-bottom: 1px solid #e9edf2;
                    background: #ffffff;
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 10px;
                    font-size: 11.5px;
                }
                .eg-table-wrap {
                    flex: 1;
                    min-height: 0;
                    overflow: auto;
                    background: #ffffff;
                }
                .eg-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                }
                .eg-table th {
                    padding: 9px 10px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e9edf2;
                    border-right: 1px solid #eef2f6;
                    font-size: 10.5px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                    color: #64748b;
                    text-align: left;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                .eg-table td {
                    padding: 0;
                    border-bottom: 1px solid #eef2f6;
                    border-right: 1px solid #f1f5f9;
                    position: relative;
                }
                .eg-cell-input {
                    width: 100%;
                    height: 34px;
                    padding: 0 10px;
                    border: 0;
                    background: transparent;
                    font-size: 12px;
                    color: #17263b;
                    outline: none;
                }
                .eg-cell-input:focus {
                    background: #eff6ff;
                    box-shadow: inset 0 0 0 1.5px #3b82f6;
                }
                .eg-footer {
                    padding: 12px 24px;
                    border-top: 1px solid #eef2f6;
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }
                .eg-btn-cancel {
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
                .eg-btn-submit {
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
                .eg-btn-submit:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }
            `}</style>

            <div className="eg-sheet-panel" onClick={e => e.stopPropagation()}>
                <header className="eg-header">
                    <div>
                        <h2 className="eg-title">Nhập xe từ Excel</h2>
                        <p className="eg-subtitle">Dán trực tiếp từ bảng tính (Ctrl+V) hoặc tải tệp Excel (.xlsx) vào kho xe</p>
                    </div>
                    <button type="button" onClick={onClose} className="eg-close-btn" aria-label="Đóng">
                        <X size={16} strokeWidth={2} />
                    </button>
                </header>

                <div className="eg-toolbar">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <button type="button" onClick={handleAddRow} className="eg-tool-btn">
                            + Thêm dòng
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsSearchOpen(prev => !prev)}
                            className="eg-tool-btn"
                            style={isSearchOpen ? { borderColor: '#3b82f6', color: '#2563eb' } : undefined}
                        >
                            Tìm & Thay thế
                        </button>
                        <label className="eg-tool-btn">
                            Chọn tệp Excel (.xlsx)
                            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
                        </label>
                        <button type="button" onClick={handleDownloadTemplate} className="eg-tool-btn">
                            Tải tệp mẫu
                        </button>
                        <button type="button" onClick={handleClearAll} className="eg-tool-btn" style={{ color: '#dc2626' }}>
                            Xóa bảng
                        </button>
                    </div>

                    <div style={{ fontSize: 11.5, color: '#64748b' }}>
                        VIN hợp lệ: <strong style={{ color: '#17263b' }}>{validRows.length}</strong> / {gridRows.length} dòng
                    </div>
                </div>

                {isSearchOpen && (
                    <div className="eg-search-bar no-grid-paste">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Tìm từ khóa..."
                            style={{ height: 30, padding: '0 10px', border: '1px solid #dbe2ea', borderRadius: 6, fontSize: 12 }}
                        />
                        <input
                            type="text"
                            value={replaceQuery}
                            onChange={e => setReplaceQuery(e.target.value)}
                            placeholder="Thay thế bằng..."
                            style={{ height: 30, padding: '0 10px', border: '1px solid #dbe2ea', borderRadius: 6, fontSize: 12 }}
                        />
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#475569' }}>
                            <input type="checkbox" checked={matchExact} onChange={e => setMatchExact(e.target.checked)} />
                            Khớp toàn ô
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#475569' }}>
                            <input type="checkbox" checked={matchCase} onChange={e => setMatchCase(e.target.checked)} />
                            Phân biệt hoa/thường
                        </label>
                        <button
                            type="button"
                            onClick={handleReplaceAll}
                            style={{ height: 30, padding: '0 12px', border: 0, borderRadius: 6, background: '#17263b', color: '#ffffff', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
                        >
                            Thay thế tất cả
                        </button>
                    </div>
                )}

                <main className="eg-table-wrap">
                    <table className="eg-table">
                        <thead>
                            <tr>
                                <th style={{ width: 42, textAlign: 'center' }}>#</th>
                                <th style={{ minWidth: 165 }}>Số VIN (17 ký tự)</th>
                                <th style={{ minWidth: 120 }}>Dòng xe</th>
                                <th style={{ minWidth: 120 }}>Phiên bản</th>
                                <th style={{ minWidth: 120 }}>Ngoại thất</th>
                                <th style={{ minWidth: 120 }}>Nội thất</th>
                                <th style={{ minWidth: 110 }}>Mã DMS</th>
                                <th style={{ width: 38, textAlign: 'center' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {gridRows.map((row, rIdx) => {
                                const isValidVin = row.vin.length === 17;
                                return (
                                    <tr key={row.id}>
                                        <td style={{ textAlign: 'center', color: '#94a3b8', background: '#f8fafc', fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace' }}>
                                            {rIdx + 1}
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={row.vin}
                                                maxLength={17}
                                                placeholder="Số VIN 17 ký tự..."
                                                onFocus={() => setFocusedCell({ rowIndex: rIdx, colIndex: 0 })}
                                                onChange={e => handleCellChange(row.id, 'vin', e.target.value)}
                                                className="eg-cell-input font-mono font-semibold uppercase"
                                            />
                                            {row.vin && (
                                                <span style={{ position: 'absolute', right: 8, top: 9, fontSize: 10, fontWeight: 600, color: isValidVin ? '#16a34a' : '#d97706' }}>
                                                    {row.vin.length}/17
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={row.dong_xe}
                                                placeholder="VF 3, VF 5..."
                                                onFocus={() => setFocusedCell({ rowIndex: rIdx, colIndex: 1 })}
                                                onChange={e => handleCellChange(row.id, 'dong_xe', e.target.value)}
                                                className="eg-cell-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={row.phien_ban}
                                                placeholder="Plus, Eco..."
                                                onFocus={() => setFocusedCell({ rowIndex: rIdx, colIndex: 2 })}
                                                onChange={e => handleCellChange(row.id, 'phien_ban', e.target.value)}
                                                className="eg-cell-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={row.ngoai_that}
                                                placeholder="Trắng, Đỏ..."
                                                onFocus={() => setFocusedCell({ rowIndex: rIdx, colIndex: 3 })}
                                                onChange={e => handleCellChange(row.id, 'ngoai_that', e.target.value)}
                                                className="eg-cell-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={row.noi_that}
                                                placeholder="Đen, Nâu..."
                                                onFocus={() => setFocusedCell({ rowIndex: rIdx, colIndex: 4 })}
                                                onChange={e => handleCellChange(row.id, 'noi_that', e.target.value)}
                                                className="eg-cell-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={row.ma_dms}
                                                placeholder="Mã DMS..."
                                                onFocus={() => setFocusedCell({ rowIndex: rIdx, colIndex: 5 })}
                                                onChange={e => handleCellChange(row.id, 'ma_dms', e.target.value)}
                                                className="eg-cell-input"
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center', background: '#f8fafc' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteRow(row.id)}
                                                style={{ border: 0, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}
                                                title="Xóa dòng"
                                            >
                                                ×
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </main>

                <footer className="eg-footer">
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>
                        Chỉ các dòng có Số VIN đủ 17 ký tự ({validRows.length} xe) mới được đưa vào kho.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button type="button" onClick={onClose} className="eg-btn-cancel">
                            Hủy bỏ
                        </button>
                        <button
                            type="button"
                            onClick={handleImportToStock}
                            disabled={validRows.length === 0 || isUploading}
                            className="eg-btn-submit"
                        >
                            {isUploading ? 'Đang nhập...' : `Nhập vào kho ${validRows.length > 0 ? `(${validRows.length} xe)` : ''}`}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default BulkAddCarExcelModal;
