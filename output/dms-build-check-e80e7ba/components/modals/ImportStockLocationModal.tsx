import React, { useState, useRef, useMemo } from 'react';
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

    // Map of current stock by uppercase VIN
    const stockMap = useMemo(() => {
        const map = new Map<string, StockVehicle>();
        stockVehicles.forEach(v => {
            const cleanVin = (v.VIN || (v as any).vin || '').trim().toUpperCase();
            if (cleanVin) map.set(cleanVin, v);
        });
        return map;
    }, [stockVehicles]);

    if (!isOpen) return null;

    const parseExcelBuffer = (buffer: ArrayBuffer, name: string) => {
        try {
            setIsParsing(true);
            const wb = xlsx.read(buffer, { type: 'array' });
            const sheetName = wb.SheetNames[0];
            const sheet = wb.Sheets[sheetName];
            const rawRows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });

            // Find header row containing VIN or "Số khung"
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
                    // Identify other columns in this row
                    row.forEach((cell, cIdx) => {
                        const str = String(cell || '').trim().toLowerCase();
                        
                        // Ignore date columns for location
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
                
                // Quy tắc: Không dùng cột O (Tên SR phụ trách).
                // Nếu cột N có giá trị -> formatShortWarehouseName(rawKho).
                // Nếu cột N trống -> Đang vận tải.
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

                    // Ưu tiên bảo vệ: Nếu xe trong kho đã có Mã DMS hoặc Số máy (từ DMS live),
                    // ta giữ nguyên dữ liệu thực tế đó, chỉ bổ sung nếu trong kho đang trống.
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
                return {
                    ...item,
                    newLocation: val,
                    isChanged
                };
            }
            return item;
        }));
        setPlanItems(prev => prev.map(item => item.vin === vin ? { ...item, vi_tri: val.trim() } : item));
    };

    const handleDmsEdit = (vin: string, val: string) => {
        setMatchedRows(prev => prev.map(item => {
            if (item.vin === vin) {
                const isChanged = val.trim() !== item.currentDms || item.newLocation.trim() !== item.currentLocation || item.newSoMay.trim() !== item.currentSoMay;
                return {
                    ...item,
                    newDms: val,
                    isChanged
                };
            }
            return item;
        }));
        setPlanItems(prev => prev.map(item => item.vin === vin ? { ...item, ma_dms: val.trim() } : item));
    };

    const handleSoMayEdit = (vin: string, val: string) => {
        setMatchedRows(prev => prev.map(item => {
            if (item.vin === vin) {
                const isChanged = val.trim() !== item.currentSoMay || item.newLocation.trim() !== item.currentLocation || item.newDms.trim() !== item.currentDms;
                return {
                    ...item,
                    newSoMay: val,
                    isChanged
                };
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
            // 1. Lưu vĩnh viễn toàn bộ file Kế hoạch giao xe vào Supabase (kehoach_giaoxe)
            let savedPlanCount = 0;
            if (planItems.length > 0) {
                const planRes = await saveDeliveryPlanToStorage(planItems);
                if (planRes.status === 'SUCCESS') {
                    savedPlanCount = planRes.savedCount || planItems.length;
                }
            }

            // 2. Cập nhật các xe đang có trong kho xe
            let updatedStockCount = 0;
            if (validUpdates.length > 0) {
                const res = await bulkUpdateVehicleLocations(validUpdates);
                if (res.status === 'SUCCESS') {
                    updatedStockCount = validUpdates.length;
                }
            }

            const successMsg = `Đã lưu kế hoạch ${savedPlanCount} xe (và cập nhật ${updatedStockCount} xe trong kho). Khi có xe mới nhập kho, hệ thống sẽ tự động gán vị trí và số máy từ kế hoạch này!`;
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
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
                            <i className="fas fa-file-excel text-lg"></i>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">
                                Nhập Vị Trí Kho, Mã DMS & Số Máy Từ Excel
                            </h2>
                            <p className="text-xs text-slate-500">
                                Tự động quét VIN trong kho để gán Vị trí kho, Mã DMS (Mã XHĐ) và Số máy từ Kế hoạch nhà máy giao
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isUpdating}
                        className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                    >
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Upload Drag & Drop Area */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                            dragActive
                                ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
                                : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20'
                        }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">
                                <i className="fas fa-cloud-arrow-up"></i>
                            </div>
                            <div className="text-sm font-semibold text-slate-700">
                                {fileName ? (
                                    <span className="text-emerald-700 font-bold">📄 {fileName}</span>
                                ) : (
                                    <span>Kéo thả file Excel vào đây hoặc <span className="text-emerald-600 underline">bấm để chọn file</span></span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400">
                                Tự động lấy: <strong>Vị trí kho</strong>, <strong>Mã DMS (Mã XHĐ)</strong> và <strong>Số máy</strong> theo số VIN
                            </p>
                        </div>
                    </div>

                    {/* Options & Stats */}
                    {matchedRows.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                            <div className="flex items-center gap-4 flex-wrap">
                                <span className="text-slate-600">
                                    Tổng xe trong file: <strong className="text-slate-800">{totalExcelVinsCount}</strong>
                                </span>
                                <span className="text-slate-600">
                                    Khớp với kho: <strong className="text-emerald-600">{matchedRows.length} xe</strong>
                                </span>
                                <span className="text-slate-600">
                                    Có dữ liệu mới: <strong className="text-blue-600">{changedCount} xe</strong>
                                </span>
                                {unmatchedVinsInExcelCount > 0 && (
                                    <span className="text-slate-400">
                                        (Xe ngoài kho: {unmatchedVinsInExcelCount})
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 text-slate-600 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl">
                                <i className="fas fa-truck text-amber-600 text-xs"></i>
                                <span className="text-[11px]">Xe trống cột N sẽ được gán là <strong className="text-amber-700">"Đang vận tải"</strong> (không dùng cột O)</span>
                            </div>
                        </div>
                    )}

                    {/* Preview Table */}
                    {isParsing ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                            <i className="fas fa-spinner fa-spin text-2xl text-emerald-600"></i>
                            <span className="text-xs">Đang đọc dữ liệu file Excel và đối chiếu số VIN...</span>
                        </div>
                    ) : matchedRows.length > 0 ? (
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="max-h-[340px] overflow-y-auto">
                                <table className="w-full text-left text-xs text-slate-600">
                                    <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 py-2.5 w-10 text-center">STT</th>
                                            <th className="px-3 py-2.5">Số VIN</th>
                                            <th className="px-3 py-2.5">Dòng xe / Bản</th>
                                            <th className="px-3 py-2.5">Mã DMS (XHĐ)</th>
                                            <th className="px-3 py-2.5">Số Máy</th>
                                            <th className="px-3 py-2.5">Vị Trí Kho</th>
                                            <th className="px-3 py-2.5 text-center w-24">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {matchedRows.map((row, idx) => (
                                            <tr key={row.vin} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-3 py-2 text-center font-mono text-slate-400">
                                                    {idx + 1}
                                                </td>
                                                <td className="px-3 py-2 font-mono font-bold text-slate-800">
                                                    {row.vin}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="font-medium text-slate-700">{row.model}</div>
                                                    <div className="text-[11px] text-slate-400">{row.version} - {row.color}</div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={row.newDms}
                                                        onChange={(e) => handleDmsEdit(row.vin, e.target.value)}
                                                        placeholder="Mã DMS..."
                                                        className={`w-24 px-2 py-1 text-xs font-mono font-semibold rounded-lg border focus:outline-none focus:ring-1 ${
                                                            row.newDms !== row.currentDms
                                                                ? 'border-blue-400 bg-blue-50/40 text-blue-800'
                                                                : 'border-slate-200 bg-white text-slate-700'
                                                        }`}
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={row.newSoMay}
                                                        onChange={(e) => handleSoMayEdit(row.vin, e.target.value)}
                                                        placeholder="Số máy..."
                                                        className={`w-32 px-2 py-1 text-xs font-mono rounded-lg border focus:outline-none focus:ring-1 ${
                                                            row.newSoMay !== row.currentSoMay
                                                                ? 'border-indigo-400 bg-indigo-50/40 text-indigo-800'
                                                                : 'border-slate-200 bg-white text-slate-700'
                                                        }`}
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={row.newLocation}
                                                        onChange={(e) => handleLocationEdit(row.vin, e.target.value)}
                                                        placeholder="Tên kho..."
                                                        className={`w-32 px-2 py-1 text-xs font-medium rounded-lg border focus:outline-none focus:ring-1 ${
                                                            row.newLocation === 'Đang vận tải'
                                                                ? 'border-amber-400 bg-amber-50/80 text-amber-800 font-semibold'
                                                                : row.newLocation !== row.currentLocation
                                                                ? 'border-emerald-400 bg-emerald-50/40 text-emerald-800'
                                                                : 'border-slate-200 bg-white text-slate-700'
                                                        }`}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {row.isChanged ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                                            Cập nhật
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                                                            Giữ nguyên
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        !fileName && (
                            <div className="py-8 text-center text-slate-400 text-xs">
                                Vui lòng tải file Excel lên để xem trước các xe sẽ được cập nhật.
                            </div>
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50">
                    <div className="text-xs text-slate-500">
                        {planItems.length > 0 && (
                            <span>
                                Sẽ lưu <strong className="text-emerald-700 font-bold">{planItems.length} xe</strong> vào Kế hoạch giao xe
                                {matchedRows.length > 0 ? (
                                    <> (và cập nhật ngay <strong className="text-slate-800 font-bold">{matchedRows.length} xe</strong> khớp trong kho)</>
                                ) : (
                                    <> (sẵn sàng tự động nhận diện khi xe nhập kho)</>
                                )}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isUpdating}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
                        >
                            Đóng
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmUpdate}
                            disabled={isUpdating || (matchedRows.length === 0 && planItems.length === 0)}
                            className={`px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all ${
                                isUpdating || (matchedRows.length === 0 && planItems.length === 0)
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 active:scale-[0.98]'
                            }`}
                        >
                            {isUpdating ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i>
                                    <span>Đang cập nhật...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-check"></i>
                                    <span>Xác nhận lưu Kế hoạch & Cập nhật</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportStockLocationModal;
