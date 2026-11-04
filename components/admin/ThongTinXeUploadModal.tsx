import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import * as xlsx from 'xlsx';
import { supabaseAdmin } from '../../services/supabaseClient';
import { logAction, getExteriorColorName, getInteriorColorName } from '../../services/api/baseService';
import { versionsMap } from '../../constants';

interface ThongTinXeUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess?: () => void;
}

export interface ThongTinXeGridRow {
    id: string;
    vin: string;
    mo_ta: string;
    khu_vuc: string;
    phien_ban: string;
    ngoai_that: string;
    noi_that: string;
    nam_san_xuat: number | null;
}

const TTX_GRID_COLUMNS: (keyof ThongTinXeGridRow)[] = ['vin', 'mo_ta', 'khu_vuc', 'phien_ban', 'ngoai_that', 'noi_that'];

const createEmptyThongTinRow = (idIndex: number): ThongTinXeGridRow => ({
    id: `row-ttx-${Date.now()}-${idIndex}-${Math.random()}`,
    vin: '',
    mo_ta: '',
    khu_vuc: '',
    phien_ban: '',
    ngoai_that: '',
    noi_that: '',
    nam_san_xuat: new Date().getFullYear()
});

const createInitialThongTinRows = (count = 5): ThongTinXeGridRow[] => {
    return Array.from({ length: count }, (_, i) => createEmptyThongTinRow(i));
};

const ThongTinXeUploadModal: React.FC<ThongTinXeUploadModalProps> = ({ isOpen, onClose, showToast, onSuccess }) => {
    const [gridRows, setGridRows] = useState<ThongTinXeGridRow[]>(() => createInitialThongTinRows(5));
    const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [replaceQuery, setReplaceQuery] = useState('');
    const [matchExact, setMatchExact] = useState(false);
    const [matchCase, setMatchCase] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setGridRows(createInitialThongTinRows(5));
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

    const handleCellChange = (id: string, field: keyof ThongTinXeGridRow, value: any) => {
        setGridRows(prev => prev.map(row => {
            if (row.id !== id) return row;
            const updated = { ...row, [field]: value };
            if (field === 'vin') {
                updated.vin = String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
            }
            if (field === 'mo_ta' && value) {
                const mUpper = String(value).trim().toUpperCase().replace(/\s+/g, ' ');
                if (mUpper === 'VF5' || mUpper === 'VF 5' || mUpper.startsWith('VF5 ') || mUpper.startsWith('VF 5 ')) {
                    updated.mo_ta = 'VF 5';
                    if (!updated.phien_ban) updated.phien_ban = 'Plus';
                } else if (mUpper === 'VF3' || mUpper === 'VF 3') {
                    updated.mo_ta = 'VF 3';
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
                    nextRows.push(createEmptyThongTinRow(nextRows.length));
                }

                const cells = line.split(sep).map(c => c.trim());
                const rowObj = { ...nextRows[targetRowIdx] };

                if (isHeader) {
                    firstLineCells.forEach((h, cIdx) => {
                        const val = cells[cIdx] || '';
                        if (h.includes('vin') || h.includes('khung')) rowObj.vin = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
                        else if (h.includes('mô tả') || h.includes('dòng') || h.includes('model')) rowObj.mo_ta = val;
                        else if (h.includes('khu vực') || h.includes('dms') || h.includes('vị trí')) rowObj.khu_vuc = val;
                        else if (h.includes('phiên') || h.includes('version')) rowObj.phien_ban = val;
                        else if (h.includes('ngoại') || h.includes('màu xe')) rowObj.ngoai_that = val;
                        else if (h.includes('nội')) rowObj.noi_that = val;
                    });
                } else {
                    cells.forEach((val, cIdx) => {
                        const targetColIdx = startColIndex + cIdx;
                        if (targetColIdx < TTX_GRID_COLUMNS.length) {
                            const colKey = TTX_GRID_COLUMNS[targetColIdx];
                            if (colKey === 'vin') {
                                rowObj.vin = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            } else {
                                (rowObj as any)[colKey] = val;
                            }
                        }
                    });
                }

                if (rowObj.mo_ta) {
                    const mUpper = String(rowObj.mo_ta).trim().toUpperCase().replace(/\s+/g, ' ');
                    if (mUpper === 'VF5' || mUpper === 'VF 5' || mUpper.startsWith('VF5 ') || mUpper.startsWith('VF 5 ')) {
                        rowObj.mo_ta = 'VF 5';
                        if (!rowObj.phien_ban) rowObj.phien_ban = 'Plus';
                    } else if (mUpper === 'VF3' || mUpper === 'VF 3') {
                        rowObj.mo_ta = 'VF 3';
                    } else {
                        const versions = vMap[rowObj.mo_ta] || vMap[rowObj.mo_ta.toLowerCase()] || [];
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
            TTX_GRID_COLUMNS.forEach(col => {
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

            if (nextRow.mo_ta) {
                const versions = vMap[nextRow.mo_ta] || vMap[nextRow.mo_ta.toLowerCase()] || [];
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
        setGridRows(prev => [...prev, createEmptyThongTinRow(prev.length)]);
    };

    const handleDeleteRow = (id: string) => {
        setGridRows(prev => {
            const next = prev.filter(r => r.id !== id);
            return next.length > 0 ? next : createInitialThongTinRows(3);
        });
    };

    const handleDownloadTemplate = () => {
        const ws = xlsx.utils.json_to_sheet([
            {
                'Số VIN': 'VF312345678901234',
                'Mô tả sản phẩm': 'VF 3',
                'Khu vực': 'DMS-HCM',
                'Phiên bản': 'Base',
                'Màu ngoại thất xe': 'Trắng',
                'Màu nội thất xe': 'Đen'
            },
            {
                'Số VIN': 'VF598765432109876',
                'Mô tả sản phẩm': 'VF 5',
                'Khu vực': 'DMS-HN',
                'Phiên bản': 'Plus',
                'Màu ngoại thất xe': 'Đỏ',
                'Màu nội thất xe': 'Đen'
            }
        ]);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'MauThongTinXe');
        xlsx.writeFile(wb, 'Mau_Cap_Nhat_Thong_Tin_Xe.xlsx');
    };

    const handleClearAll = () => {
        setGridRows(createInitialThongTinRows(5));
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

                const vMap = versionsMap as Record<string, string[]>;

                const parsed: ThongTinXeGridRow[] = rows.map((row, idx) => {
                    const normalizedRow: Record<string, any> = {};
                    for (const key in row) {
                        normalizedRow[key.trim()] = row[key];
                    }

                    const moTa = String(normalizedRow['Mô tả sản phẩm'] || normalizedRow['Dòng xe'] || '').trim();
                    let phienBan = String(normalizedRow['Phiên bản'] || '').trim();
                    if (moTa) {
                        const versions = vMap[moTa] || vMap[moTa.toLowerCase()] || [];
                        if (versions.length === 1 && !phienBan) {
                            phienBan = versions[0];
                        }
                    }

                    return {
                        id: `row-ttx-file-${idx}-${Date.now()}`,
                        vin: String(normalizedRow['Số VIN'] || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''),
                        mo_ta: moTa,
                        khu_vuc: String(normalizedRow['Khu vực'] || ''),
                        phien_ban: phienBan,
                        ngoai_that: String(normalizedRow['Màu ngoại thất xe'] || ''),
                        noi_that: String(normalizedRow['Màu nội thất xe'] || ''),
                        nam_san_xuat: normalizedRow['Năm sản xuất'] ? parseInt(normalizedRow['Năm sản xuất']) : new Date().getFullYear()
                    };
                });

                setGridRows(prev => {
                    const nonEmptyPrev = prev.filter(r => r.vin.trim() || r.mo_ta.trim());
                    return [...nonEmptyPrev, ...parsed];
                });

                showToast('Thành công', `Đã tải ${parsed.length} dòng từ file Excel vào bảng!`, 'success');
            } catch (err: any) {
                showToast('Lỗi đọc file', err.message || 'Không thể đọc file Excel', 'error');
            }
        }
    };

    const handleUploadToMaster = async () => {
        if (validRows.length === 0) {
            showToast('Lỗi', 'Vui lòng nhập hoặc dán dữ liệu có ít nhất 1 Số VIN hợp lệ (17 ký tự)', 'error');
            return;
        }

        setIsUploading(true);

        try {
            const uniqueDataMap = new Map<string, any>();
            validRows.forEach(item => {
                uniqueDataMap.set(item.vin, {
                    vin: item.vin,
                    so_may: '',
                    mo_ta: item.mo_ta,
                    khu_vuc: item.khu_vuc,
                    phien_ban: item.phien_ban,
                    ngoai_that: item.ngoai_that,
                    noi_that: item.noi_that,
                    nam_san_xuat: item.nam_san_xuat,
                    inventory_id: '',
                    check_sum: '',
                    so_ton_kho: ''
                });
            });
            const uniqueFormattedData = Array.from(uniqueDataMap.values());

            const UPSERT_CHUNK_SIZE = 500;
            for (let i = 0; i < uniqueFormattedData.length; i += UPSERT_CHUNK_SIZE) {
                const chunk = uniqueFormattedData.slice(i, i + UPSERT_CHUNK_SIZE);
                const { error: upsertError } = await (supabaseAdmin as any)
                    .from('thongtinxe')
                    .upsert(chunk, { onConflict: 'vin', ignoreDuplicates: false });

                if (upsertError) throw upsertError;
            }

            const uploadedVins = uniqueFormattedData.map(d => d.vin);
            const QUERY_CHUNK_SIZE = 200;
            let existingKhoxe: any[] = [];

            for (let i = 0; i < uploadedVins.length; i += QUERY_CHUNK_SIZE) {
                const chunk = uploadedVins.slice(i, i + QUERY_CHUNK_SIZE);
                const { data: chunkData, error: chunkErr } = await (supabaseAdmin as any)
                    .from('khoxe')
                    .select('vin')
                    .in('vin', chunk);

                if (chunkErr) throw chunkErr;
                if (chunkData) existingKhoxe = [...existingKhoxe, ...chunkData];
            }

            if (existingKhoxe && existingKhoxe.length > 0) {
                const existingVins = existingKhoxe.map((x: any) => x.vin);
                const updates = uniqueFormattedData
                    .filter(d => existingVins.includes(d.vin))
                    .map(d => ({
                        vin: d.vin,
                        ngoai_that: getExteriorColorName(d.ngoai_that),
                        noi_that: getInteriorColorName(d.noi_that),
                        ma_dms: d.khu_vuc
                    }));

                const CHUNK_SIZE = 50;
                for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
                    const chunk = updates.slice(i, i + CHUNK_SIZE);
                    await Promise.all(chunk.map(updateData =>
                        (supabaseAdmin as any).from('khoxe').update({
                            ngoai_that: updateData.ngoai_that,
                            noi_that: updateData.noi_that,
                            ma_dms: updateData.ma_dms
                        }).eq('vin', updateData.vin)
                    ));
                }
            }

            await logAction('UPLOAD_THONGTINXE', { rowCount: uniqueFormattedData.length, syncedKhoXe: existingKhoxe?.length || 0 }, 'bulk_import', 'SETTINGS');
            showToast('Thành công', `Đã cập nhật ${uniqueFormattedData.length} mã xe Master thành công.`, 'success');

            if (onSuccess) onSuccess();
            onClose();

        } catch (error: any) {
            console.error('Lỗi import Master:', error);
            showToast('Lỗi Import', error.message || 'Lỗi không xác định', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div
            className="ttx-sheet"
            onPaste={handlePaste}
            onClick={(e) => {
                if (e.target === e.currentTarget && !isUploading) { window.dispatchEvent(new CustomEvent('close-all-sheets')); onClose(); }
            }}
        >
            <style>{`
                .ttx-sheet {
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
                    .ttx-sheet {
                        inset: 0;
                        width: 100vw;
                    }
                }
                .ttx-sheet-panel {
                    width: clamp(640px, 68vw, 960px);
                    max-width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #ffffff;
                    color: #17263b;
                    border-right: 1px solid #e2e8f0;
                    box-shadow: 18px 0 42px -14px rgba(20, 34, 54, 0.16);
                    animation: ttxSlideInLeft 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @keyframes ttxSlideInLeft {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .ttx-header {
                    padding: 22px 24px 14px;
                    border-bottom: 1px solid #e9edf2;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                }
                .ttx-title {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 650;
                    line-height: 1.15;
                    letter-spacing: -0.5px;
                    color: #17263b;
                }
                .ttx-subtitle {
                    margin: 4px 0 0;
                    font-size: 11.5px;
                    font-weight: 450;
                    color: #7b879a;
                }
                .ttx-close-btn {
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
                .ttx-close-btn:hover {
                    background: #f1f5f9;
                    color: #0f172a;
                }
                .ttx-toolbar {
                    padding: 10px 24px;
                    border-bottom: 1px solid #e9edf2;
                    background: #f8fafc;
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                }
                .ttx-tool-btn {
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
                .ttx-tool-btn:hover {
                    background: #f1f5f9;
                }
                .ttx-search-bar {
                    padding: 10px 24px;
                    border-bottom: 1px solid #e9edf2;
                    background: #ffffff;
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 10px;
                    font-size: 11.5px;
                }
                .ttx-table-wrap {
                    flex: 1;
                    min-height: 0;
                    overflow: auto;
                    background: #ffffff;
                }
                .ttx-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                }
                .ttx-table th {
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
                .ttx-table td {
                    padding: 0;
                    border-bottom: 1px solid #eef2f6;
                    border-right: 1px solid #f1f5f9;
                    position: relative;
                }
                .ttx-cell-input {
                    width: 100%;
                    height: 34px;
                    padding: 0 10px;
                    border: 0;
                    background: transparent;
                    font-size: 12px;
                    color: #17263b;
                    outline: none;
                }
                .ttx-cell-input:focus {
                    background: #eff6ff;
                    box-shadow: inset 0 0 0 1.5px #3b82f6;
                }
                .ttx-footer {
                    padding: 12px 24px;
                    border-top: 1px solid #eef2f6;
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }
                .ttx-btn-cancel {
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
                .ttx-btn-submit {
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
                .ttx-btn-submit:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }
            `}</style>

            <div className="ttx-sheet-panel" onClick={e => e.stopPropagation()}>
                <header className="ttx-header">
                    <div>
                        <h2 className="ttx-title">Cập nhật Core / thongtinxe</h2>
                        <p className="ttx-subtitle">Đồng bộ danh mục xe gốc Master và tự động ánh xạ sang kho hiện hành</p>
                    </div>
                    <button type="button" onClick={onClose} className="ttx-close-btn" aria-label="Đóng">
                        <X size={16} strokeWidth={2} />
                    </button>
                </header>

                <div className="ttx-toolbar">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <button type="button" onClick={handleAddRow} className="ttx-tool-btn">
                            + Thêm dòng
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsSearchOpen(prev => !prev)}
                            className="ttx-tool-btn"
                            style={isSearchOpen ? { borderColor: '#3b82f6', color: '#2563eb' } : undefined}
                        >
                            Tìm & Thay thế
                        </button>
                        <label className="ttx-tool-btn">
                            Chọn tệp Excel (.xlsx)
                            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
                        </label>
                        <button type="button" onClick={handleDownloadTemplate} className="ttx-tool-btn">
                            Tải tệp mẫu
                        </button>
                        <button type="button" onClick={handleClearAll} className="ttx-tool-btn" style={{ color: '#dc2626' }}>
                            Xóa bảng
                        </button>
                    </div>

                    <div style={{ fontSize: 11.5, color: '#64748b' }}>
                        VIN hợp lệ: <strong style={{ color: '#17263b' }}>{validRows.length}</strong> / {gridRows.length} dòng
                    </div>
                </div>

                {isSearchOpen && (
                    <div className="ttx-search-bar no-grid-paste">
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

                <main className="ttx-table-wrap">
                    <table className="ttx-table">
                        <thead>
                            <tr>
                                <th style={{ width: 42, textAlign: 'center' }}>#</th>
                                <th style={{ minWidth: 165 }}>Số VIN (17 ký tự)</th>
                                <th style={{ minWidth: 120 }}>Mô tả / Dòng xe</th>
                                <th style={{ minWidth: 110 }}>Khu vực</th>
                                <th style={{ minWidth: 120 }}>Phiên bản</th>
                                <th style={{ minWidth: 120 }}>Ngoại thất</th>
                                <th style={{ minWidth: 120 }}>Nội thất</th>
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
                                                className="ttx-cell-input font-mono font-semibold uppercase"
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
                                                value={row.mo_ta}
                                                placeholder="VF 3, VF 5..."
                                                onFocus={() => setFocusedCell({ rowIndex: rIdx, colIndex: 1 })}
                                                onChange={e => handleCellChange(row.id, 'mo_ta', e.target.value)}
                                                className="ttx-cell-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={row.khu_vuc}
                                                placeholder="DMS-HCM..."
                                                onFocus={() => setFocusedCell({ rowIndex: rIdx, colIndex: 2 })}
                                                onChange={e => handleCellChange(row.id, 'khu_vuc', e.target.value)}
                                                className="ttx-cell-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={row.phien_ban}
                                                placeholder="Plus, Eco..."
                                                onFocus={() => setFocusedCell({ rowIndex: rIdx, colIndex: 3 })}
                                                onChange={e => handleCellChange(row.id, 'phien_ban', e.target.value)}
                                                className="ttx-cell-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={row.ngoai_that}
                                                placeholder="Trắng, Đỏ..."
                                                onFocus={() => setFocusedCell({ rowIndex: rIdx, colIndex: 4 })}
                                                onChange={e => handleCellChange(row.id, 'ngoai_that', e.target.value)}
                                                className="ttx-cell-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={row.noi_that}
                                                placeholder="Đen, Nâu..."
                                                onFocus={() => setFocusedCell({ rowIndex: rIdx, colIndex: 5 })}
                                                onChange={e => handleCellChange(row.id, 'noi_that', e.target.value)}
                                                className="ttx-cell-input"
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

                <footer className="ttx-footer">
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>
                        Chỉ các dòng có Số VIN đủ 17 ký tự ({validRows.length} xe) mới được cập nhật vào bảng Master.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button type="button" onClick={onClose} className="ttx-btn-cancel">
                            Hủy bỏ
                        </button>
                        <button
                            type="button"
                            onClick={handleUploadToMaster}
                            disabled={validRows.length === 0 || isUploading}
                            className="ttx-btn-submit"
                        >
                            {isUploading ? 'Đang cập nhật...' : `Cập nhật Master ${validRows.length > 0 ? `(${validRows.length} xe)` : ''}`}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ThongTinXeUploadModal;
