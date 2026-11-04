import React, { useState, useRef, useMemo, useEffect } from 'react';
import { X } from 'lucide-react';
import * as xlsx from 'xlsx';
import { StockVehicle } from '../../types';
import { bulkUpdateVehicleLocations, saveDeliveryPlanToStorage, DeliveryPlanItem } from '../../services/api/stockService';
import { formatShortWarehouseName } from '../../utils/stringUtils';

interface MatchedCarRow {
    vin: string;
    model: string;
    version: string;
    color: string;
    currentLocation: string;
    newLocation: string;
    excelRawKho: string;
    excelSR: string;
    currentDms: string;
    newDms: string;
    currentSoMay: string;
    newSoMay: string;
    isChanged: boolean;
}

interface ImportStockLocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    stockVehicles: StockVehicle[];
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess: () => void;
}

const ImportStockLocationModal: React.FC<ImportStockLocationModalProps> = ({
    isOpen,
    onClose,
    stockVehicles,
    showToast,
    onSuccess
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string>('');
    const [isParsing, setIsParsing] = useState<boolean>(false);
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    const [matchedRows, setMatchedRows] = useState<MatchedCarRow[]>([]);
    const [planItems, setPlanItems] = useState<DeliveryPlanItem[]>([]);
    const [unmatchedVinsInExcelCount, setUnmatchedVinsInExcelCount] = useState<number>(0);
    const [totalExcelVinsCount, setTotalExcelVinsCount] = useState<number>(0);
    const [dragActive, setDragActive] = useState<boolean>(false);

    const stockMap = useMemo(() => {
        const map = new Map<string, StockVehicle>();
        stockVehicles.forEach(v => {
            const cleanVin = (v.VIN || (v as any).vin || '').trim().toUpperCase();
            if (cleanVin) map.set(cleanVin, v);
        });
        return map;
    }, [stockVehicles]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isUpdating) onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, isUpdating, onClose]);

    if (!isOpen) return null;

    const parseExcelBuffer = (buffer: ArrayBuffer, name: string) => {
        try {
            setIsParsing(true);
            const wb = xlsx.read(buffer, { type: 'array' });
            const sheetName = wb.SheetNames[0];
            const sheet = wb.Sheets[sheetName];
            const rawRows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });

            let headerIdx = -1;
            let vinCol = -1;
            let khoCol = -1;
            let modelCol = -1;
            let verCol = -1;
            let colorCol = -1;
            let dmsCol = -1;
            let soMayCol = -1;

            for (let i = 0; i < Math.min(rawRows.length, 25); i++) {
                const row = rawRows[i];
                if (!Array.isArray(row)) continue;

                row.forEach((cell, cIdx) => {
                    const str = String(cell || '').trim().toLowerCase();
                    if (str === 'số khung' || str === 'so khung' || str === 'vin' || str === 'số vin') {
                        headerIdx = i;
                        vinCol = cIdx;
                    }
                });

                if (headerIdx !== -1) {
                    row.forEach((cell, cIdx) => {
                        const str = String(cell || '').trim().toLowerCase();
                        if (str.includes('ngày') || str.includes('ngay') || str.includes('thời gian') || str.includes('thoi gian')) {
                            return;
                        }
                        if (str.includes('số máy') || str.includes('so may') || str.includes('số động cơ') || str.includes('so dong co') || str === 'động cơ') {
                            soMayCol = cIdx;
                        } else if (str.includes('mã xhđ') || str.includes('ma xhd') || str.includes('mã dms') || str.includes('ma dms') || str.includes('mã xuất')) {
                            dmsCol = cIdx;
                        } else if (str.includes('vị trí xe vật lý') || str.includes('vị trí kho') || str === 'kho' || str === 'kho xe' || (str.includes('vị trí') && str.includes('kho'))) {
                            khoCol = cIdx;
                        } else if (khoCol === -1 && (str.includes('vị trí') || str.includes('kho'))) {
                            khoCol = cIdx;
                        } else if (str === 'loại xe' || str === 'dòng xe') {
                            modelCol = cIdx;
                        } else if (str === 'phiên bản' || str === 'bản') {
                            verCol = cIdx;
                        } else if (str.includes('ngoại thất') || str.includes('màu')) {
                            if (colorCol === -1) colorCol = cIdx;
                        }
                    });
                    break;
                }
            }

            if (headerIdx === -1 || vinCol === -1) {
                showToast('Lỗi đọc file', 'Không tìm thấy cột "Số khung" hoặc "VIN" trong file Excel này.', 'error');
                setIsParsing(false);
                return;
            }

            const dataRows = rawRows.slice(headerIdx + 1).filter(r => r && r[vinCol]);
            let excelVins = 0;
            const matches: MatchedCarRow[] = [];
            const allPlanItems: DeliveryPlanItem[] = [];

            dataRows.forEach(r => {
                const vin = String(r[vinCol] || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (!vin || vin.length < 5) return;
                excelVins++;

                const rawKho = khoCol !== -1 && r[khoCol] ? String(r[khoCol]).trim() : '';
                const rawDms = dmsCol !== -1 && r[dmsCol] ? String(r[dmsCol]).trim() : '';
                const rawSoMay = soMayCol !== -1 && r[soMayCol] ? String(r[soMayCol]).trim() : '';
                const rawDongXe = modelCol !== -1 && r[modelCol] ? String(r[modelCol]).trim() : '';
                const rawPhienBan = verCol !== -1 && r[verCol] ? String(r[verCol]).trim() : '';
                const rawMau = colorCol !== -1 && r[colorCol] ? String(r[colorCol]).trim() : '';

                const targetLoc = rawKho ? formatShortWarehouseName(rawKho) : 'Đang vận tải';

                allPlanItems.push({
                    vin,
                    vi_tri: targetLoc,
                    raw_kho: rawKho,
                    ma_dms: rawDms,
                    so_may: rawSoMay,
                    dong_xe: rawDongXe,
                    phien_ban: rawPhienBan,
                    ngoai_that: rawMau
                });

                const stockCar = stockMap.get(vin);
                if (stockCar) {
                    const currLoc = (stockCar['Vị trí'] || (stockCar as any).vi_tri || '').trim();
                    const currDms = (stockCar['Mã DMS'] || (stockCar as any).ma_dms || '').trim();
                    const currSoMay = (stockCar['Số máy'] || (stockCar as any).so_may || '').trim();

                    const newDmsVal = currDms || rawDms;
                    const newSoMayVal = currSoMay || rawSoMay;

                    const isChanged = (targetLoc !== '' && targetLoc !== currLoc) ||
                                      (currDms === '' && rawDms !== '') ||
                                      (currSoMay === '' && rawSoMay !== '');

                    matches.push({
                        vin,
                        model: stockCar['Dòng xe'] || rawDongXe,
                        version: stockCar['Phiên bản'] || rawPhienBan,
                        color: stockCar['Ngoại thất'] || rawMau,
                        currentLocation: currLoc,
                        newLocation: targetLoc,
                        excelRawKho: rawKho,
                        excelSR: '',
                        currentDms: currDms,
                        newDms: newDmsVal,
                        currentSoMay: currSoMay,
                        newSoMay: newSoMayVal,
                        isChanged
                    });
                }
            });

            setFileName(name);
            setTotalExcelVinsCount(excelVins);
            setMatchedRows(matches);
            setPlanItems(allPlanItems);
            setUnmatchedVinsInExcelCount(Math.max(0, excelVins - matches.length));
            setIsParsing(false);

            if (matches.length > 0) {
                showToast('Khớp dữ liệu thành công', `Đã tìm thấy ${matches.length} xe trong kho khớp với số VIN và lưu trữ kế hoạch cho ${allPlanItems.length} xe.`, 'success');
            } else {
                showToast('Đã đọc kế hoạch', `File có ${allPlanItems.length} xe. Hiện tại chưa có xe trong kho khớp, nhưng bạn có thể bấm Lưu để lưu trữ vĩnh viễn kế hoạch cho các lần nhập xe sau!`, 'info');
            }
        } catch (err: any) {
            console.error('Lỗi khi đọc file Excel:', err);
            showToast('Lỗi đọc file', err.message || 'Không thể mở và đọc dữ liệu từ file Excel này.', 'error');
            setIsParsing(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            if (evt.target?.result) {
                parseExcelBuffer(evt.target.result as ArrayBuffer, file.name);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                if (evt.target?.result) {
                    parseExcelBuffer(evt.target.result as ArrayBuffer, file.name);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const handleLocationEdit = (vin: string, val: string) => {
        setMatchedRows(prev => prev.map(item => {
            if (item.vin === vin) {
                const isChanged = val.trim() !== item.currentLocation || item.newDms.trim() !== item.currentDms || item.newSoMay.trim() !== item.currentSoMay;
                return { ...item, newLocation: val, isChanged };
            }
            return item;
        }));
        setPlanItems(prev => prev.map(item => item.vin === vin ? { ...item, vi_tri: val.trim() } : item));
    };

    const handleDmsEdit = (vin: string, val: string) => {
        setMatchedRows(prev => prev.map(item => {
            if (item.vin === vin) {
                const isChanged = val.trim() !== item.currentDms || item.newLocation.trim() !== item.currentLocation || item.newSoMay.trim() !== item.currentSoMay;
                return { ...item, newDms: val, isChanged };
            }
            return item;
        }));
        setPlanItems(prev => prev.map(item => item.vin === vin ? { ...item, ma_dms: val.trim() } : item));
    };

    const handleSoMayEdit = (vin: string, val: string) => {
        setMatchedRows(prev => prev.map(item => {
            if (item.vin === vin) {
                const isChanged = val.trim() !== item.currentSoMay || item.newLocation.trim() !== item.currentLocation || item.newDms.trim() !== item.currentDms;
                return { ...item, newSoMay: val, isChanged };
            }
            return item;
        }));
        setPlanItems(prev => prev.map(item => item.vin === vin ? { ...item, so_may: val.trim() } : item));
    };

    const handleConfirmUpdate = async () => {
        if (planItems.length === 0 && matchedRows.length === 0) {
            showToast('Không có dữ liệu', 'Chưa có thông tin xe để cập nhật.', 'warning');
            return;
        }

        const changedRows = matchedRows.filter(r => r.isChanged);
        const rowsToSave = changedRows.length > 0 ? changedRows : matchedRows;

        const validUpdates = rowsToSave
            .map(r => ({
                vin: r.vin,
                vi_tri: r.newLocation.trim() || undefined,
                ma_dms: r.newDms.trim() || undefined,
                so_may: r.newSoMay.trim() || undefined
            }))
            .filter(r => r.vi_tri || r.ma_dms || r.so_may);

        setIsUpdating(true);
        try {
            let savedPlanCount = 0;
            if (planItems.length > 0) {
                const planRes = await saveDeliveryPlanToStorage(planItems);
                if (planRes.status === 'SUCCESS') {
                    savedPlanCount = planRes.savedCount || planItems.length;
                }
            }

            let updatedStockCount = 0;
            if (validUpdates.length > 0) {
                const res = await bulkUpdateVehicleLocations(validUpdates);
                if (res.status === 'SUCCESS') {
                    updatedStockCount = validUpdates.length;
                }
            }

            const successMsg = `Đã lưu kế hoạch ${savedPlanCount} xe (và cập nhật ${updatedStockCount} xe trong kho).`;
            showToast('Lưu kế hoạch & Cập nhật kho thành công', successMsg, 'success');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Lỗi khi cập nhật kho & kế hoạch:', err);
            showToast('Lỗi cập nhật', err.message || 'Có lỗi xảy ra khi lưu vào hệ thống.', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const changedCount = matchedRows.filter(r => r.isChanged).length;

    return (
        <div
            className="isl-sheet"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isUpdating) { window.dispatchEvent(new CustomEvent('close-all-sheets')); onClose(); }
            }}
        >
            <style>{`
                .isl-sheet {
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
                    .isl-sheet {
                        inset: 0;
                        width: 100vw;
                    }
                }
                .isl-sheet-panel {
                    width: clamp(540px, 60vw, 860px);
                    max-width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #ffffff;
                    color: #17263b;
                    border-right: 1px solid #e2e8f0;
                    box-shadow: 18px 0 42px -14px rgba(20, 34, 54, 0.16);
                    animation: islSlideInLeft 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @keyframes islSlideInLeft {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .isl-header {
                    padding: 22px 24px 14px;
                    border-bottom: 1px solid #e9edf2;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                }
                .isl-title {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 650;
                    line-height: 1.15;
                    letter-spacing: -0.5px;
                    color: #17263b;
                }
                .isl-subtitle {
                    margin: 4px 0 0;
                    font-size: 11.5px;
                    font-weight: 450;
                    color: #7b879a;
                }
                .isl-close-btn {
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
                .isl-close-btn:hover {
                    background: #f1f5f9;
                    color: #0f172a;
                }
                .isl-body {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    padding: 18px 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .isl-dropzone {
                    border: 1px dashed #cbd5e1;
                    border-radius: 8px;
                    padding: 20px 16px;
                    text-align: center;
                    background: #f8fafc;
                    cursor: pointer;
                    transition: border-color 140ms ease, background-color 140ms ease;
                }
                .isl-dropzone:hover, .isl-dropzone.is-drag {
                    border-color: #3b82f6;
                    background: #eff6ff;
                }
                .isl-stats-bar {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 10px 12px;
                    border: 1px solid #e9edf2;
                    border-radius: 8px;
                    background: #f8fafc;
                    font-size: 11.5px;
                    color: #475569;
                }
                .isl-table-wrap {
                    border: 1px solid #e9edf2;
                    border-radius: 8px;
                    overflow: hidden;
                    background: #ffffff;
                }
                .isl-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    text-align: left;
                }
                .isl-table th {
                    padding: 9px 10px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e9edf2;
                    border-right: 1px solid #eef2f6;
                    font-size: 10.5px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                    color: #64748b;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                .isl-table th:last-child {
                    border-right: 0;
                }
                .isl-table td {
                    padding: 8px 10px;
                    border-bottom: 1px solid #eef2f6;
                    border-right: 1px solid #f1f5f9;
                    color: #17263b;
                    vertical-align: middle;
                }
                .isl-table td:last-child {
                    border-right: 0;
                }
                .isl-table tr:last-child td {
                    border-bottom: 0;
                }
                .isl-cell-input {
                    width: 100%;
                    height: 28px;
                    padding: 0 8px;
                    border: 1px solid #dbe2ea;
                    border-radius: 6px;
                    background: #ffffff;
                    font-size: 11.5px;
                    color: #17263b;
                    outline: none;
                }
                .isl-cell-input:focus {
                    border-color: #3b82f6;
                }
                .isl-footer {
                    padding: 12px 24px;
                    border-top: 1px solid #eef2f6;
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }
                .isl-btn-cancel {
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
                .isl-btn-submit {
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
                .isl-btn-submit:disabled, .isl-btn-cancel:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }
            `}</style>

            <div className="isl-sheet-panel" onClick={e => e.stopPropagation()}>
                <header className="isl-header">
                    <div>
                        <h2 className="isl-title">Nhập vị trí kho từ Excel</h2>
                        <p className="isl-subtitle">Quét số VIN để gán Vị trí kho, Mã DMS và Số máy từ Kế hoạch nhà máy</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isUpdating}
                        className="isl-close-btn"
                        aria-label="Đóng"
                    >
                        <X size={16} strokeWidth={2} />
                    </button>
                </header>

                <main className="isl-body">
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`isl-dropzone ${dragActive ? 'is-drag' : ''}`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#17263b' }}>
                            {fileName ? `Tệp đã chọn: ${fileName}` : 'Kéo thả tệp Excel (.xlsx, .xls) vào đây hoặc bấm để chọn tệp'}
                        </div>
                        <div style={{ fontSize: 11, color: '#7b879a', marginTop: 4 }}>
                            Tự động lấy Vị trí kho, Mã DMS (Mã XHĐ) và Số máy theo cột Số khung / VIN
                        </div>
                    </div>

                    {matchedRows.length > 0 && (
                        <div className="isl-stats-bar">
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                <span>Tổng xe trong tệp: <strong style={{ color: '#17263b' }}>{totalExcelVinsCount}</strong></span>
                                <span>Khớp với kho: <strong style={{ color: '#16a34a' }}>{matchedRows.length} xe</strong></span>
                                <span>Thay đổi mới: <strong style={{ color: '#2563eb' }}>{changedCount} xe</strong></span>
                                {unmatchedVinsInExcelCount > 0 && (
                                    <span style={{ color: '#94a3b8' }}>Ngoài kho: {unmatchedVinsInExcelCount}</span>
                                )}
                            </div>
                        </div>
                    )}

                    {isParsing ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 12, color: '#7b879a' }}>
                            Đang đọc dữ liệu tệp Excel và đối chiếu số VIN...
                        </div>
                    ) : matchedRows.length > 0 ? (
                        <div className="isl-table-wrap">
                            <table className="isl-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 42, textAlign: 'center' }}>#</th>
                                        <th>Số VIN</th>
                                        <th>Dòng xe / Bản</th>
                                        <th>Mã DMS</th>
                                        <th>Số máy</th>
                                        <th>Vị trí kho</th>
                                        <th style={{ width: 90, textAlign: 'center' }}>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {matchedRows.map((row, idx) => (
                                        <tr key={row.vin}>
                                            <td style={{ textAlign: 'center', color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace' }}>
                                                {idx + 1}
                                            </td>
                                            <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontWeight: 600 }}>
                                                {row.vin}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{row.model}</div>
                                                <div style={{ fontSize: 11, color: '#7b879a' }}>{row.version} · {row.color}</div>
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={row.newDms}
                                                    onChange={(e) => handleDmsEdit(row.vin, e.target.value)}
                                                    placeholder="Mã DMS..."
                                                    className="isl-cell-input font-mono"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={row.newSoMay}
                                                    onChange={(e) => handleSoMayEdit(row.vin, e.target.value)}
                                                    placeholder="Số máy..."
                                                    className="isl-cell-input font-mono"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={row.newLocation}
                                                    onChange={(e) => handleLocationEdit(row.vin, e.target.value)}
                                                    placeholder="Tên kho..."
                                                    className="isl-cell-input"
                                                />
                                            </td>
                                            <td style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: row.isChanged ? '#16a34a' : '#94a3b8' }}>
                                                {row.isChanged ? 'Cập nhật' : 'Giữ nguyên'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        !fileName && (
                            <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
                                Chọn tệp Excel để xem trước danh sách xe khớp trong kho.
                            </div>
                        )
                    )}
                </main>

                <footer className="isl-footer">
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>
                        {planItems.length > 0 && (
                            <span>
                                Lưu kế hoạch <strong style={{ color: '#17263b' }}>{planItems.length} xe</strong>
                                {matchedRows.length > 0 ? ` • Cập nhật kho ${matchedRows.length} xe` : ''}
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isUpdating}
                            className="isl-btn-cancel"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmUpdate}
                            disabled={isUpdating || (matchedRows.length === 0 && planItems.length === 0)}
                            className="isl-btn-submit"
                        >
                            {isUpdating ? 'Đang lưu...' : 'Lưu kế hoạch & Cập nhật'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ImportStockLocationModal;
