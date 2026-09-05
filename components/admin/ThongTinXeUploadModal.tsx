import React, { useState, useEffect } from 'react';
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

    // Find & Replace State
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

    // Keyboard shortcut Ctrl+F / Ctrl+H
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F' || e.key === 'h' || e.key === 'H')) {
                e.preventDefault();
                setIsSearchOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 md:p-4 animate-fade-in"
            onPaste={handlePaste}
        >
            <div 
                className="bg-white w-full max-w-6xl max-h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Excel Green Header */}
                <header className="flex items-center justify-between px-6 py-3.5 bg-[#107c41] text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white text-lg font-black shadow-sm">
                            <i className="fas fa-table"></i>
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                                Bảng Tính Excel Cập Nhật Xe Master (thongtinxe)
                                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Excel Grid 100%</span>
                            </h2>
                            <p className="text-[11px] text-emerald-100">Bấm Ctrl+V để dán dữ liệu | Bấm Ctrl+H để tìm kiếm và thay thế hàng loạt</p>
                        </div>
                    </div>

                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
                        <i className="fas fa-times text-xs"></i>
                    </button>
                </header>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-slate-100 border-b border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleAddRow}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                        >
                            <i className="fas fa-plus text-emerald-600"></i> Thêm Dòng
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsSearchOpen(prev => !prev)}
                            className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 ${
                                isSearchOpen ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                            }`}
                        >
                            <i className="fas fa-search text-amber-600"></i> Tìm & Thay Thế (Ctrl+H)
                        </button>

                        <label className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95">
                            <i className="fas fa-file-excel text-[#107c41]"></i> Tải File Excel (.xlsx)
                            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
                        </label>

                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 font-bold text-blue-600 flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                            title="Tải file Excel mẫu chuẩn"
                        >
                            <i className="fas fa-download text-blue-600"></i> Tải File Mẫu
                        </button>

                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-red-50 text-red-600 font-bold flex items-center gap-1.5 shadow-sm transition-all"
                        >
                            <i className="fas fa-trash-alt"></i> Xóa Sạch Bảng
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold px-3 py-1 rounded-lg">
                            <i className="fas fa-check-circle text-emerald-600"></i>
                            <span>Hợp lệ: <b>{validRows.length}</b> / {gridRows.length} dòng</span>
                        </div>
                        {focusedCell && (
                            <span className="text-[11px] text-[#107c41] font-bold bg-emerald-100/80 px-2 py-0.5 rounded">
                                Đang chọn: Dòng {focusedCell.rowIndex + 1}, Cột {focusedCell.colIndex + 1} ({TTX_GRID_COLUMNS[focusedCell.colIndex]?.toUpperCase()})
                            </span>
                        )}
                    </div>
                </div>

                {/* Find & Replace Floating Panel */}
                {isSearchOpen && (
                    <div className="bg-amber-50/90 border-b border-amber-200 px-6 py-3 flex flex-wrap items-center gap-4 text-xs animate-fade-in shadow-inner no-grid-paste">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-900 flex items-center gap-1">
                                <i className="fas fa-search text-amber-600"></i> Tìm kiếm:
                            </span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Từ khóa cần tìm (VD: VF3)..."
                                className="px-3 py-1.5 border border-amber-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 w-44 bg-white font-medium"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-900 flex items-center gap-1">
                                <i className="fas fa-exchange-alt text-amber-600"></i> Thay thế bằng:
                            </span>
                            <input
                                type="text"
                                value={replaceQuery}
                                onChange={e => setReplaceQuery(e.target.value)}
                                placeholder="Giá trị mới (VD: VF 3)..."
                                className="px-3 py-1.5 border border-amber-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 w-44 bg-white font-medium"
                            />
                        </div>

                        <div className="flex items-center gap-3 font-semibold text-amber-800">
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={matchExact}
                                    onChange={e => setMatchExact(e.target.checked)}
                                    className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                                />
                                Exact cell
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={matchCase}
                                    onChange={e => setMatchCase(e.target.checked)}
                                    className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                                />
                                Match case
                            </label>
                        </div>

                        <button
                            type="button"
                            onClick={handleReplaceAll}
                            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm active:scale-95 transition-all flex items-center gap-1.5 ml-auto"
                        >
                            <i className="fas fa-check-double"></i> Thay Thế Tất Cả (Replace All)
                        </button>
                    </div>
                )}

                {/* Spreadsheet Body */}
                <main className="flex-1 overflow-auto bg-slate-200/60 p-0">
                    <table className="w-full border-collapse text-xs bg-white">
                        <thead>
                            <tr className="bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-wider border-b border-slate-300 select-none sticky top-0 z-10 shadow-sm">
                                <th className="w-12 py-2 px-2 border-r border-slate-300 text-center bg-slate-200/80 text-slate-500">#</th>
                                <th className="py-2 px-3 border-r border-slate-300 min-w-[170px] text-emerald-800">
                                    <div className="flex items-center justify-between">
                                        <span>A | SỐ VIN (17 KÝ TỰ)</span>
                                        <i className="fas fa-asterisk text-[8px] text-red-500"></i>
                                    </div>
                                </th>
                                <th className="py-2 px-3 border-r border-slate-300 min-w-[130px]">B | MÔ TẢ / DÒNG XE</th>
                                <th className="py-2 px-3 border-r border-slate-300 min-w-[110px]">C | KHU VỰC</th>
                                <th className="py-2 px-3 border-r border-slate-300 min-w-[120px]">D | PHIÊN BẢN</th>
                                <th className="py-2 px-3 border-r border-slate-300 min-w-[120px]">E | NGOẠI THẤT</th>
                                <th className="py-2 px-3 border-r border-slate-300 min-w-[120px]">F | NỘI THẤT</th>
                                <th className="w-10 py-2 border-slate-300 text-center bg-slate-200/80"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-[12px]">
                            {gridRows.map((row, rIdx) => {
                                const isValidVin = row.vin.length === 17;
                                return (
                                    <tr key={row.id} className="hover:bg-amber-50/40 group transition-colors">
                                        {/* Row Index */}
                                        <td className="py-1 px-2 border-r border-slate-300 text-center font-bold bg-slate-100 text-slate-500 select-none">
                                            {rIdx + 1}
                                        </td>

                                        {/* Col A: VIN */}
                                        <td className={`p-0 border-r border-slate-300 relative ${isValidVin ? 'bg-emerald-50/30' : row.vin ? 'bg-amber-50/40' : ''}`}>
                                            <input
                                                type="text"
                                                value={row.vin}
                                                maxLength={17}
                                                placeholder="Số VIN 17 ký tự..."
                                                onFocus={() => setFocusedCell({ rowIndex: rIdx, colIndex: 0 })}
                                                onChange={e => handleCellChange(row.id, 'vin', e.target.value)}
                                                className="w-full h-9 px-2.5 font-mono font-bold uppercase text-slate-900 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-[#107c41] focus:z-20 transition-all placeholder:font-sans placeholder:font-normal placeholder:text-slate-300"
                                            />
                                            {row.vin && (
                                                <span className={`absolute right-2 top-2 text-[10px] font-bold px-1.5 rounded ${isValidVin ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100'}`}>
                                                    {row.vin.length}/17
                                                </span>
                                            )}
                                        </td>

                                        {/* Col B: Mô tả / Dòng Xe */}
                                        <td className="p-0 border-r border-slate-300">
                                            <input
                                                type="text"
                                                value={row.mo_ta}
                                                placeholder="VF 3, VF 5, VF 8..."
                                                onFocus={() => setFocusedCell({ rowIndex: rIdx, colIndex: 1 })}
                                                onChange={e => handleCellChange(row.id, 'mo_ta', e.target.value)}
                                                className="w-full h-9 px-2.5 font-sans font-bold text-slate-800 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-[#107c41] focus:z-20 transition-all placeholder:text-slate-300"
                                            />
                                        </td>

                                        {/* Col C: Khu Vực / Mã DMS */}
                                        <td className="p-0 border-r border-slate-300">
                                            <input
                                                type="text"
                                                value={row.khu_vuc}
                                                placeholder="DMS-HCM..."
                                                onFocus={() => setFocusedCell({ rowIndex: rIdx, colIndex: 2 })}
                                                onChange={e => handleCellChange(row.id, 'khu_vuc', e.target.value)}
                                                className="w-full h-9 px-2.5 font-sans text-slate-700 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-[#107c41] focus:z-20 transition-all placeholder:text-slate-300"
                                            />
                                        </td>

                                        {/* Col D: Phiên Bản */}
                                        <td className="p-0 border-r border-slate-300">
                                            <input
                                                type="text"
                                                value={row.phien_ban}
                                                placeholder="Plus, Eco, Base..."
                                                onFocus={() => setFocusedCell({ rowIndex: rIdx, colIndex: 3 })}
                                                onChange={e => handleCellChange(row.id, 'phien_ban', e.target.value)}
                                                className="w-full h-9 px-2.5 font-sans font-medium text-slate-700 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-[#107c41] focus:z-20 transition-all placeholder:text-slate-300"
                                            />
                                        </td>

                                        {/* Col E: Ngoại Thất */}
                                        <td className="p-0 border-r border-slate-300">
                                            <input
                                                type="text"
                                                value={row.ngoai_that}
                                                placeholder="Trắng, Đỏ, Xám..."
                                                onFocus={() => setFocusedCell({ rowIndex: rIdx, colIndex: 4 })}
                                                onChange={e => handleCellChange(row.id, 'ngoai_that', e.target.value)}
                                                className="w-full h-9 px-2.5 font-sans font-medium text-slate-700 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-[#107c41] focus:z-20 transition-all placeholder:text-slate-300"
                                            />
                                        </td>

                                        {/* Col F: Nội Thất */}
                                        <td className="p-0 border-r border-slate-300">
                                            <input
                                                type="text"
                                                value={row.noi_that}
                                                placeholder="Đen, Nâu, Vàng..."
                                                onFocus={() => setFocusedCell({ rowIndex: rIdx, colIndex: 5 })}
                                                onChange={e => handleCellChange(row.id, 'noi_that', e.target.value)}
                                                className="w-full h-9 px-2.5 font-sans font-medium text-slate-700 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-[#107c41] focus:z-20 transition-all placeholder:text-slate-300"
                                            />
                                        </td>

                                        {/* Actions */}
                                        <td className="py-1 px-1 text-center bg-slate-50 border-r border-slate-300">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteRow(row.id)}
                                                className="w-6 h-6 rounded hover:bg-red-100 text-slate-300 group-hover:text-red-500 flex items-center justify-center transition-colors m-auto"
                                                title="Xóa dòng này"
                                            >
                                                <i className="fas fa-trash-alt text-[10px]"></i>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </main>

                {/* Footer */}
                <footer className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <i className="fas fa-info-circle text-[#107c41]"></i>
                        <span>Chỉ các dòng xe có <b>Số VIN đúng 17 ký tự</b> ({validRows.length} xe) mới được cập nhật vào danh mục Master.</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                            Hủy Bỏ
                        </button>
                        <button
                            type="button"
                            onClick={handleUploadToMaster}
                            disabled={validRows.length === 0 || isUploading}
                            className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg transition-all ${
                                validRows.length > 0 && !isUploading
                                    ? 'bg-[#107c41] hover:bg-[#0b5c30] shadow-emerald-200 active:scale-95'
                                    : 'bg-slate-300 cursor-not-allowed shadow-none'
                            }`}
                        >
                            {isUploading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-import"></i>}
                            Cập Nhật Xe Master {validRows.length > 0 ? `(${validRows.length} Xe)` : ''}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ThongTinXeUploadModal;
