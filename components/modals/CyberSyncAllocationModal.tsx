import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { syncCyberAllocations, undoCyberAllocations } from '../../services/api/stockService';

interface CyberSyncAllocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess?: () => void;
}

const WEB_EXTERIOR_COLORS_MAP: Record<string, string> = {
    "CE11": "Jet Black (CE11)",
    "CE18": "Brahminy White (CE18)",
    "CE17": "Silver (CE17)",
    "CE2Q": "Solar Ruby (CE2Q)",
    "CE1W": "Urbant Mint (CE1W)",
    "CE1V": "Zenith Grey (CE1V)",
    "CE1U": "Summer Yellow (CE1U)",
    "CE1M": "Crimson Red (CE1M)",
    "CE1N": "Vinfast Blue (CE1N)",
    "CE14": "Neptune Grey (CE14)",
    "CE1J": "Electric Blue (CE1J)",
    "CE1H": "Deep Ocean (CE1H)",
    "CE1A": "Sunset ORB (CE1A)",
    "CE1X": "Iris Berry (CE1X)",
    "CE21": "Rose Pink (CE21)",
    "CE2G": "Sky Blue (CE2G)",
    "CE2T": "Pebble Beige (CE2T)",
    "CE2K": "Pink Gold (CE2K)",
    "CE2J": "Moonlit Ocean (CE2J)",
    "CE2N": "Introspective Brown (CE2N)",
    "CE2O": "Mysterioso Purple (CE2O)",
    "CE22": "Ivy_Green_GNE (CE22)",
    "CE23": "Champagne_Creme_YLG (CE23)",
    "CE2B": "Vinbus Green (CE2B)",
    "CE32": "Vitality Orange (CE32)",
    "CE33": "Starburst Blue (CE33)",
    "111U": "Jet Black Roof- Summer Yellow Body (111U)",
    "181U": "Brahminy White Roof- Summer Yellow Body (181U)",
    "181Y": "Brahminy White Roof- Aquatic Azure Body (181Y)",
    "1821": "Brahminy White Roof- Rose Pink Body (1821)",
    "181X": "Brahminy White Roof - Iris Berry Body (181X)",
    "111M": "Crimson Red - Jet Black Roof (111M)",
    "111H": "Deep Ocean_Jet Black Roof (111H)",
    "112Q": "Solar Ruby Body - Jet Black Roof (112Q)",
    "1132": "Vitality Orange Body - Jet Black Roof (1132)",
    "171V": "Zenith Grey-desat Silver Roof (171V)",
    "171W": "Urbant Mint Green - Desat Silv (171W)",
    "1722": "Ivy Green-desat Silver Roof (1722)",
    "1833": "Starburst Blue Body - Infinity Blanc Roof (1833)",
    "1832": "Vitality Orange Body - Infinity Blanc Roof (1832)",
    "312O": "Mysterioso Purple Body - Stealth Gray Roof (312O)",
    "3111": "Jet Black Body - Stealth Gray Roof (3111)",
    "1V18": "Infinity Blanc_Zenith Grey Roof (1v18)",
};

export const CyberSyncAllocationModal: React.FC<CyberSyncAllocationModalProps> = ({
    isOpen,
    onClose,
    showToast,
    onSuccess
}) => {
    // Mặc định từ ngày 1 đầu tháng đến hôm nay
    const getFormattedDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const [fromDate, setFromDate] = useState<string>(getFormattedDate(firstDay));
    const [toDate, setToDate] = useState<string>(getFormattedDate(now));
    const [isLoading, setIsLoading] = useState(false);
    const [isUndoing, setIsUndoing] = useState(false);
    const [previewCars, setPreviewCars] = useState<any[]>([]);
    const [rawOriginalCars, setRawOriginalCars] = useState<any[]>([]);
    const [hasLoadedPreview, setHasLoadedPreview] = useState(false);
    const [isQuickEdit, setIsQuickEdit] = useState(false);
    const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
    const [syncStats, setSyncStats] = useState<{ total: number; success: number; fail: number } | null>(null);
    const [syncedVins, setSyncedVins] = useState<string[]>(() => {
        try {
            const saved = sessionStorage.getItem('last_cyber_synced_vins');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        if (isOpen) {
            setPreviewCars([]);
            setRawOriginalCars([]);
            setHasLoadedPreview(false);
            setSyncStats(null);
            setIsQuickEdit(false);
            setEditingRowIdx(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // 1. Xem trước danh sách xe từ CyberSoft
    const handlePreview = async () => {
        setIsLoading(true);
        setSyncStats(null);
        setEditingRowIdx(null);
        try {
            const res = await syncCyberAllocations({ fromDate, toDate, preview: true });
            if (res && res.success) {
                const cars = res.cars || [];
                setPreviewCars(cars);
                setRawOriginalCars(JSON.parse(JSON.stringify(cars)));
                setHasLoadedPreview(true);
                showToast('Đã tải xem trước', `Tìm thấy ${res.total || 0} xe phân bổ cho Thuận An từ CyberSoft.`, 'info');
            } else {
                throw new Error(res?.error || 'Không thể lấy dữ liệu từ CyberSoft.');
            }
        } catch (err: any) {
            showToast('Lỗi xem trước', err.message || 'Lỗi kết nối CyberSoft', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Chỉnh sửa thuộc tính của xe
    const updateCarField = (idx: number, field: string, val: string) => {
        setPreviewCars(prev => {
            const updated = [...prev];
            const currentCar = { ...updated[idx] };
            currentCar[field] = val;

            if (field === 'ma_mau') {
                const upperCode = val.trim().toUpperCase();
                currentCar.ma_mau = upperCode;
                // Tự động link với tên màu ngoại thất chuẩn trên Web App tương ứng
                if (WEB_EXTERIOR_COLORS_MAP[upperCode]) {
                    currentCar.ngoai_that = WEB_EXTERIOR_COLORS_MAP[upperCode];
                }
            }

            if (field === 'noi_that') {
                const lower = val.trim().toLowerCase();
                if (lower.includes('đen') || lower === 'black') currentCar.noi_that = 'Black';
                else if (lower.includes('nâu') || lower.includes('mocha') || lower === 'brown') currentCar.noi_that = 'Brown';
                else if (lower.includes('be') || lower === 'beige') currentCar.noi_that = 'Beige';
                else if (lower.includes('xám') || lower === 'grey' || lower === 'gray') currentCar.noi_that = 'Grey';
            }

            updated[idx] = currentCar;
            return updated;
        });
    };

    // Kiểm tra xe có bị sửa đổi so với dữ liệu gốc Cyber hay không
    const isCarModified = (idx: number) => {
        const current = previewCars[idx];
        const orig = rawOriginalCars[idx];
        if (!current || !orig) return false;
        return (
            current.dong_xe !== orig.dong_xe ||
            current.phien_ban !== orig.phien_ban ||
            current.ma_mau !== orig.ma_mau ||
            current.ngoai_that !== orig.ngoai_that ||
            current.noi_that !== orig.noi_that ||
            current.so_may !== orig.so_may ||
            current.ma_dms !== orig.ma_dms ||
            current.vi_tri !== orig.vi_tri
        );
    };

    const editedCount = previewCars.filter((_, idx) => isCarModified(idx)).length;

    // Khôi phục 1 xe về gốc Cyber
    const resetRowToOriginal = (idx: number) => {
        if (!rawOriginalCars[idx]) return;
        setPreviewCars(prev => {
            const updated = [...prev];
            updated[idx] = JSON.parse(JSON.stringify(rawOriginalCars[idx]));
            return updated;
        });
        showToast('Đã khôi phục', `Đã trả về thông tin gốc từ CyberSoft cho xe STT ${idx + 1}.`, 'info', 2000);
    };

    // Khôi phục tất cả xe về gốc Cyber
    const resetAllToOriginal = () => {
        if (rawOriginalCars.length === 0) return;
        setPreviewCars(JSON.parse(JSON.stringify(rawOriginalCars)));
        showToast('Đã khôi phục tất cả', 'Đã trả lại toàn bộ dữ liệu gốc CyberSoft ban đầu.', 'info', 2500);
    };

    // Xóa xe khỏi danh sách chuẩn bị nạp
    const removeCar = (idx: number) => {
        const car = previewCars[idx];
        if (window.confirm(`Loại bỏ xe ${car.dong_xe || ''} (VIN: ${car.vin}) khỏi danh sách nạp này?`)) {
            setPreviewCars(prev => prev.filter((_, i) => i !== idx));
            setRawOriginalCars(prev => prev.filter((_, i) => i !== idx));
            if (editingRowIdx === idx) setEditingRowIdx(null);
        }
    };

    // 3. Thực hiện đồng bộ chính thức vào Supabase khoxe với các xe đã chỉnh sửa
    const handleSync = async () => {
        if (previewCars.length === 0) {
            showToast('Chưa có xe', 'Vui lòng bấm "Xem trước" trước khi nạp vào Kho xe.', 'warning');
            return;
        }

        setIsLoading(true);
        try {
            showToast('Đang đồng bộ...', `Đang nạp ${previewCars.length} xe vào Kho xe...`, 'loading', 3000);
            const res = await syncCyberAllocations({
                fromDate,
                toDate,
                preview: false,
                cars: previewCars
            });

            if (res && res.success) {
                setSyncStats({
                    total: res.total || previewCars.length,
                    success: res.success_count || previewCars.length,
                    fail: res.fail_count || 0
                });

                const vins = res.vins || previewCars.map((c: any) => c.vin);
                if (vins.length > 0) {
                    setSyncedVins(vins);
                    sessionStorage.setItem('last_cyber_synced_vins', JSON.stringify(vins));
                }

                showToast('Đồng bộ hoàn tất!', `Đã nạp thành công ${res.success_count || previewCars.length} xe vào Kho xe.`, 'success', 5000);
                if (onSuccess) onSuccess();
            } else {
                throw new Error(res?.error || 'Đồng bộ thất bại.');
            }
        } catch (err: any) {
            showToast('Lỗi đồng bộ', err.message || 'Không thể nạp xe vào Kho xe', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // 4. Hoàn tác các xe vừa nạp
    const handleUndo = async () => {
        if (!syncedVins || syncedVins.length === 0) {
            showToast('Không có dữ liệu', 'Không tìm thấy danh sách xe vừa nạp để hoàn tác.', 'warning');
            return;
        }

        const confirmMsg = `Bạn có chắc chắn muốn hoàn tác và XÓA ${syncedVins.length} xe vừa nạp khỏi Kho xe không?\n\nLưu ý: Chỉ những xe chưa bị ghép mới được hoàn tác xóa khỏi hệ thống.`;
        if (!window.confirm(confirmMsg)) {
            return;
        }

        setIsUndoing(true);
        try {
            showToast('Đang hoàn tác...', `Đang xóa ${syncedVins.length} xe khỏi Kho xe...`, 'loading', 3000);
            const res = await undoCyberAllocations(syncedVins);
            if (res && res.success) {
                showToast('Hoàn tác thành công!', `Đã xóa thành công ${res.deletedCount} xe khỏi Kho xe.`, 'success', 5000);
                setSyncedVins([]);
                sessionStorage.removeItem('last_cyber_synced_vins');
                setSyncStats(null);
                if (onSuccess) onSuccess();
            } else {
                throw new Error(res?.error || 'Hoàn tác thất bại.');
            }
        } catch (err: any) {
            showToast('Lỗi hoàn tác', err.message || 'Không thể xóa xe khỏi Kho xe', 'error');
        } finally {
            setIsUndoing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            {/* Datalist hỗ trợ gợi ý */}
            <datalist id="cyber_dong_xe_options">
                <option value="VF 3" />
                <option value="VF 5" />
                <option value="VF 6" />
                <option value="VF 7" />
                <option value="VF 8" />
                <option value="VF 9" />
                <option value="LIMO" />
                <option value="VF e34" />
                <option value="EC Van" />
            </datalist>

            <datalist id="cyber_ngoai_that_options">
                {Object.values(WEB_EXTERIOR_COLORS_MAP).map(c => (
                    <option key={c} value={c} />
                ))}
            </datalist>

            <datalist id="cyber_noi_that_options">
                <option value="Black" />
                <option value="Brown" />
                <option value="Beige" />
                <option value="Grey" />
            </datalist>

            <datalist id="cyber_vi_tri_options">
                <option value="Đang vận tải" />
                <option value="Kho Thuận An" />
                <option value="Kho Minh Đạo" />
                <option value="Kho Nhà máy Hải Phòng" />
                <option value="Showroom Thuận An" />
            </datalist>

            <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                
                {/* Header */}
                <div className="px-6 py-3.5 bg-gradient-to-r from-blue-700 via-sky-700 to-indigo-800 text-white flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                            <i className="fas fa-bolt text-yellow-300 text-lg"></i>
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold">Đồng bộ Kế hoạch Nhà máy Giao</h3>
                            <p className="text-xs text-sky-100 flex items-center gap-1.5">
                                <span>CyberSoft ERP (K10)</span>
                                <span>•</span>
                                <span className="bg-sky-400/25 px-2 py-0.5 rounded text-[11px] font-semibold">
                                    Showroom VinFast Thuận An (02.01.08)
                                </span>
                                <span>•</span>
                                <span className="text-[11px] text-amber-200 font-medium">
                                    Hỗ trợ chỉnh sửa trực tiếp trước khi nạp
                                </span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Đóng cửa sổ"
                    >
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                {/* Filter Controls */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-slate-600">Từ ngày:</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                disabled={isLoading}
                                className="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg shadow-xs focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-slate-600">Đến ngày:</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                disabled={isLoading}
                                className="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg shadow-xs focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 outline-none"
                            />
                        </div>

                        <Button
                            variant="secondary"
                            onClick={handlePreview}
                            disabled={isLoading}
                            className="text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-xs"
                        >
                            <i className="fas fa-magnifying-glass text-xs text-blue-600"></i>
                            <span>Xem trước</span>
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        {hasLoadedPreview && previewCars.length > 0 && (
                            <button
                                onClick={() => setIsQuickEdit(!isQuickEdit)}
                                className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                    isQuickEdit 
                                        ? 'bg-amber-600 text-white border-amber-700 shadow-inner' 
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-xs'
                                }`}
                                title={isQuickEdit ? "Tắt chế độ sửa tất cả ô" : "Bật sửa trực tiếp tất cả ô trên bảng"}
                            >
                                <i className={`fas ${isQuickEdit ? 'fa-check' : 'fa-pen-to-square'} text-xs`}></i>
                                <span>{isQuickEdit ? 'Xong sửa nhanh' : 'Sửa trực tiếp toàn bảng'}</span>
                            </button>
                        )}

                        <Button
                            variant="primary"
                            onClick={handleSync}
                            disabled={isLoading || previewCars.length === 0}
                            className="text-xs px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                        >
                            {isLoading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin text-xs"></i>
                                    <span>Đang đồng bộ...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-cloud-arrow-down text-xs"></i>
                                    <span>Nạp {previewCars.length > 0 ? `(${previewCars.length} xe)` : ''} vào Kho xe</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Content / Preview Area */}
                <div className="p-4 flex-1 overflow-y-auto min-h-[300px] bg-slate-100/60">
                    {syncStats && (
                        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-fade-in shadow-xs">
                            <div className="flex items-center gap-2">
                                <i className="fas fa-circle-check text-emerald-600 text-base"></i>
                                <div>
                                    <p className="font-bold">Đồng bộ thành công: Đã nạp {syncStats.success} xe vào hệ thống Kho xe.</p>
                                    <p className="text-[11px] text-emerald-600 font-medium">Bảng khoxe (Trạng thái: Chưa ghép - Sẵn sàng ghép đơn)</p>
                                </div>
                            </div>
                            {syncedVins.length > 0 && (
                                <button
                                    onClick={handleUndo}
                                    disabled={isUndoing}
                                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                    title="Xóa các xe vừa nạp khỏi Kho xe"
                                >
                                    <i className={`fas ${isUndoing ? 'fa-spinner fa-spin' : 'fa-rotate-left'} text-xs`}></i>
                                    <span>{isUndoing ? 'Đang xóa...' : `Hoàn tác (${syncedVins.length} xe)`}</span>
                                </button>
                            )}
                        </div>
                    )}

                    {!hasLoadedPreview && !isLoading && !syncStats && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-2xl mb-3 shadow-inner">
                                <i className="fas fa-truck-ramp-box"></i>
                            </div>
                            <h4 className="text-sm font-bold text-slate-700 mb-1">Chưa tải dữ liệu xem trước</h4>
                            <p className="text-xs max-w-md text-slate-500">
                                Hãy chọn khoảng ngày phân bổ phía trên rồi bấm <b>"Xem trước"</b> để kiểm tra danh sách xe được nhà máy giao cho Showroom Thuận An. Bạn có thể <b>sửa đổi trực tiếp</b> dòng xe, phiên bản, màu sắc trước khi bấm <b>"Nạp vào Kho xe"</b>.
                            </p>
                        </div>
                    )}

                    {isLoading && (
                        <div className="h-56 flex flex-col items-center justify-center text-slate-500 gap-3">
                            <i className="fas fa-circle-notch fa-spin text-3xl text-blue-600"></i>
                            <span className="text-xs font-semibold">Đang liên kết dữ liệu với máy chủ CyberSoft ERP...</span>
                        </div>
                    )}

                    {hasLoadedPreview && !isLoading && (
                        <div>
                            {/* Toolbar thông tin & thao tác nhanh */}
                            <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-800">
                                        Danh sách xe phân bổ cho Thuận An ({previewCars.length} xe)
                                    </span>
                                    {editedCount > 0 && (
                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                            Đã sửa {editedCount} xe
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {editedCount > 0 && (
                                        <button
                                            onClick={resetAllToOriginal}
                                            className="text-[11px] text-slate-600 hover:text-blue-700 bg-white hover:bg-slate-50 border border-slate-300 font-semibold px-2.5 py-1 rounded-md transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                                            title="Khôi phục toàn bộ dữ liệu gốc từ CyberSoft"
                                        >
                                            <i className="fas fa-rotate-left text-xs text-amber-600"></i>
                                            <span>Khôi phục tất cả về gốc Cyber</span>
                                        </button>
                                    )}
                                    <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                        {fromDate} ➔ {toDate}
                                    </span>
                                </div>
                            </div>

                            {previewCars.length === 0 ? (
                                <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                                    Không có xe nào được phân bổ cho Thuận An trong khoảng ngày đã chọn.
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="max-h-[440px] overflow-y-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 select-none">
                                                <tr>
                                                    <th className="py-2.5 px-2.5 text-center w-10">STT</th>
                                                    <th className="py-2.5 px-3 min-w-[150px]">Dòng xe / Phiên bản</th>
                                                    <th className="py-2.5 px-2.5 text-center w-24">Mã màu</th>
                                                    <th className="py-2.5 px-3 min-w-[160px]">Ngoại thất / Nội thất</th>
                                                    <th className="py-2.5 px-3 min-w-[150px]">Số khung (VIN)</th>
                                                    <th className="py-2.5 px-2.5 w-28">Số máy</th>
                                                    <th className="py-2.5 px-2.5 w-24">Mã DMS</th>
                                                    <th className="py-2.5 px-3 min-w-[130px]">Kho / Vị trí</th>
                                                    <th className="py-2.5 px-2.5 text-center w-24">Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                                {previewCars.map((car, idx) => {
                                                    const isEditing = isQuickEdit || editingRowIdx === idx;
                                                    const modified = isCarModified(idx);

                                                    return (
                                                        <tr 
                                                            key={car.vin || idx} 
                                                            className={`transition-colors ${
                                                                modified ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            {/* STT */}
                                                            <td className="py-2 px-2.5 font-semibold text-slate-400 text-center">
                                                                <div className="flex flex-col items-center">
                                                                    <span>{idx + 1}</span>
                                                                    {modified && (
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-0.5" title="Đã chỉnh sửa"></span>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* Dòng xe / Phiên bản */}
                                                            <td className="py-1.5 px-3">
                                                                {isEditing ? (
                                                                    <div className="space-y-1">
                                                                        <input
                                                                            type="text"
                                                                            list="cyber_dong_xe_options"
                                                                            value={car.dong_xe || ''}
                                                                            onChange={(e) => updateCarField(idx, 'dong_xe', e.target.value)}
                                                                            placeholder="Dòng xe (VF 8, LIMO...)"
                                                                            className="w-full text-xs font-bold text-blue-900 bg-white border border-blue-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            value={car.phien_ban || ''}
                                                                            onChange={(e) => updateCarField(idx, 'phien_ban', e.target.value)}
                                                                            placeholder="Phiên bản (Plus, Eco...)"
                                                                            className="w-full text-[11px] text-slate-600 bg-white border border-slate-300 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-500"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <div className="font-bold text-blue-900 flex items-center gap-1.5">
                                                                            <span>{car.dong_xe}</span>
                                                                            {car.phien_ban && (
                                                                                <span className="font-normal text-slate-500">({car.phien_ban})</span>
                                                                            )}
                                                                        </div>
                                                                        {car.ten_kx_cyber && car.ten_kx_cyber !== car.dong_xe && (
                                                                            <div className="text-[10px] text-slate-400 truncate max-w-[190px]" title={`Gốc Cyber: ${car.ten_kx_cyber}`}>
                                                                                Gốc: {car.ten_kx_cyber}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>

                                                            {/* Mã màu */}
                                                            <td className="py-1.5 px-2.5 text-center">
                                                                {isEditing ? (
                                                                    <input
                                                                        type="text"
                                                                        value={car.ma_mau || ''}
                                                                        onChange={(e) => updateCarField(idx, 'ma_mau', e.target.value)}
                                                                        placeholder="CE11"
                                                                        className="w-18 text-center uppercase font-mono font-bold text-xs bg-white border border-blue-300 rounded px-1 py-1 text-blue-700 outline-none focus:ring-1 focus:ring-blue-500"
                                                                    />
                                                                ) : (
                                                                    car.ma_mau ? (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                                                                            {car.ma_mau}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-400">-</span>
                                                                    )
                                                                )}
                                                            </td>

                                                            {/* Ngoại thất / Nội thất */}
                                                            <td className="py-1.5 px-3">
                                                                {isEditing ? (
                                                                    <div className="space-y-1">
                                                                        <input
                                                                            type="text"
                                                                            list="cyber_ngoai_that_options"
                                                                            value={car.ngoai_that || ''}
                                                                            onChange={(e) => updateCarField(idx, 'ngoai_that', e.target.value)}
                                                                            placeholder="Ngoại thất (Jet Black (CE11)...)"
                                                                            className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            list="cyber_noi_that_options"
                                                                            value={car.noi_that || ''}
                                                                            onChange={(e) => updateCarField(idx, 'noi_that', e.target.value)}
                                                                            placeholder="Nội thất (Black, Brown, Beige, Grey)"
                                                                            className="w-full text-[11px] text-slate-500 bg-white border border-slate-300 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-500"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <div className="font-semibold text-slate-800">{car.ngoai_that || '-'}</div>
                                                                        {car.noi_that && <div className="text-[10px] text-slate-400">{car.noi_that}</div>}
                                                                    </div>
                                                                )}
                                                            </td>

                                                            {/* Số khung (VIN) */}
                                                            <td className="py-1.5 px-3">
                                                                <span className="font-mono font-bold text-indigo-700 select-all">{car.vin}</span>
                                                            </td>

                                                            {/* Số máy */}
                                                            <td className="py-1.5 px-2.5">
                                                                {isEditing ? (
                                                                    <input
                                                                        type="text"
                                                                        value={car.so_may || ''}
                                                                        onChange={(e) => updateCarField(idx, 'so_may', e.target.value)}
                                                                        placeholder="Số máy"
                                                                        className="w-full font-mono text-[11px] bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                                                    />
                                                                ) : (
                                                                    <span className="font-mono text-[11px] text-slate-600">{car.so_may || '-'}</span>
                                                                )}
                                                            </td>

                                                            {/* Mã DMS */}
                                                            <td className="py-1.5 px-2.5">
                                                                {isEditing ? (
                                                                    <input
                                                                        type="text"
                                                                        value={car.ma_dms || ''}
                                                                        onChange={(e) => updateCarField(idx, 'ma_dms', e.target.value)}
                                                                        placeholder="Mã DMS"
                                                                        className="w-full font-semibold text-xs bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                                                    />
                                                                ) : (
                                                                    <span className="font-semibold text-slate-800">{car.ma_dms || '-'}</span>
                                                                )}
                                                            </td>

                                                            {/* Kho / Vị trí */}
                                                            <td className="py-1.5 px-3">
                                                                {isEditing ? (
                                                                    <input
                                                                        type="text"
                                                                        list="cyber_vi_tri_options"
                                                                        value={car.vi_tri || ''}
                                                                        onChange={(e) => updateCarField(idx, 'vi_tri', e.target.value)}
                                                                        placeholder="Vị trí kho"
                                                                        className="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                                                    />
                                                                ) : (
                                                                    <span className="text-slate-700 font-medium">{car.vi_tri || 'Đang vận tải'}</span>
                                                                )}
                                                            </td>

                                                            {/* Thao tác */}
                                                            <td className="py-1.5 px-2.5 text-center">
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    {!isQuickEdit && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditingRowIdx(editingRowIdx === idx ? null : idx)}
                                                                            className={`p-1.5 rounded transition-all cursor-pointer ${
                                                                                editingRowIdx === idx
                                                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                                                    : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'
                                                                            }`}
                                                                            title={editingRowIdx === idx ? "Lưu dòng này" : "Chỉnh sửa dòng này"}
                                                                        >
                                                                            <i className={`fas ${editingRowIdx === idx ? 'fa-check' : 'fa-pencil'} text-xs`}></i>
                                                                        </button>
                                                                    )}

                                                                    {modified && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => resetRowToOriginal(idx)}
                                                                            className="p-1.5 rounded text-amber-600 hover:text-amber-800 hover:bg-amber-100 transition-all cursor-pointer"
                                                                            title="Khôi phục xe này về dữ liệu gốc CyberSoft"
                                                                        >
                                                                            <i className="fas fa-rotate-left text-xs"></i>
                                                                        </button>
                                                                    )}

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeCar(idx)}
                                                                        className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                                                                        title="Loại bỏ xe này khỏi danh sách nạp"
                                                                    >
                                                                        <i className="fas fa-trash-can text-xs"></i>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                            <i className="fas fa-shield-halved text-blue-600"></i>
                            <span>Tự động upsert theo số VIN • Trạng thái: Chưa ghép</span>
                        </span>
                        {syncedVins.length > 0 && (
                            <button
                                onClick={handleUndo}
                                disabled={isUndoing || isLoading}
                                className="text-amber-700 hover:text-red-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                title="Hoàn tác lần nạp xe gần nhất"
                            >
                                <i className={`fas ${isUndoing ? 'fa-spinner fa-spin' : 'fa-rotate-left'} text-xs`}></i>
                                <span>Hoàn tác ({syncedVins.length} xe vừa nạp)</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            disabled={isLoading || isUndoing}
                            className="text-xs px-4 py-1.5"
                        >
                            Đóng
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
};
