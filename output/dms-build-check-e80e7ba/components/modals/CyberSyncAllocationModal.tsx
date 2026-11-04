import React, { useState, useEffect, useMemo } from 'react';
import Button from '../ui/Button';
import { syncCyberAllocations, undoCyberAllocations } from '../../services/api/stockService';
import { supabaseAdmin } from '../../services/supabaseClient';
import { versionsMap } from '../../constants';
import * as xlsx from 'xlsx';

interface CyberSyncAllocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess?: () => void;
}

/**
 * Tự động chuẩn hóa Dòng xe và Phiên bản xe từ mã CyberSoft ERP về đúng 100%
 * với danh mục phiên bản Web App (versionsMap) để hệ thống tự động ghép xe hoàn hảo.
 */
export const normalizeAppVersion = (
    dongXe: string, 
    rawVersion: string, 
    maKx?: string
): { dong_xe: string; phien_ban: string } => {
    let cleanDx = (dongXe || '').trim();
    let cleanV = (rawVersion || '').trim();
    const cleanKx = (maKx || '').toUpperCase().trim();

    // 1. Chuẩn hóa tên Dòng xe chuẩn Web App
    const dxUpper = cleanDx.toUpperCase();
    if (dxUpper === 'VF3' || dxUpper === 'VF 3') cleanDx = 'VF 3';
    else if (dxUpper === 'VF2' || dxUpper === 'VF 2') cleanDx = 'VF 2';
    else if (dxUpper === 'VF5' || dxUpper === 'VF 5') cleanDx = 'VF 5';
    else if (dxUpper === 'VF6' || dxUpper === 'VF 6') cleanDx = 'VF 6';
    else if (dxUpper === 'VF7' || dxUpper === 'VF 7') cleanDx = 'VF 7';
    else if (dxUpper === 'VF8' || dxUpper === 'VF 8') cleanDx = 'VF 8';
    else if (dxUpper === 'VF9' || dxUpper === 'VF 9') cleanDx = 'VF 9';
    else if (dxUpper === 'ECVAN' || dxUpper === 'EC VAN') cleanDx = 'EC Van';
    else if (dxUpper === 'LIMO') cleanDx = 'LIMO';

    // 2. Chuẩn hóa tên Phiên bản theo danh mục versionsMap của Web App
    const vLower = cleanV.toLowerCase();

    if (cleanDx === 'VF 3') {
        if (vLower.includes('plus') || cleanKx === 'VF305' || cleanKx === 'VF306') {
            cleanV = 'Plus';
        } else {
            cleanV = 'Base';
        }
    } else if (cleanDx === 'VF 2') {
        if (vLower.includes('plus') || cleanKx === 'VF201') cleanV = 'Plus';
        else cleanV = 'Base';
    } else if (cleanDx === 'VF 5') {
        cleanV = 'Plus';
    } else if (cleanDx === 'VF 6') {
        if (vLower.includes('eco') || cleanKx === 'VF601' || cleanKx === 'VF603' || cleanKx === 'VF607') {
            cleanV = 'Eco Tiêu chuẩn';
        } else {
            cleanV = 'Plus';
        }
    } else if (cleanDx === 'VF 7') {
        if (vLower.includes('eco hud') || cleanKx === 'VF713') cleanV = 'Eco_HUD';
        else if (vLower.includes('tiêu chuẩn 1') || cleanKx === 'VF701') cleanV = 'Eco Tiêu chuẩn 1';
        else if (vLower.includes('tiêu chuẩn 2') || cleanKx === 'VF706') cleanV = 'Eco Tiêu chuẩn 2';
        else if (vLower.includes('eco')) cleanV = 'Eco';
        else if (vLower.includes('nâng cấp') || cleanKx === 'VF702' || cleanKx === 'VF703' || cleanKx === 'VF794') cleanV = 'Plus Nâng cấp';
        else if (cleanKx === 'VF784' || cleanKx === 'VF793') cleanV = 'Plus_Metal Tiêu chuẩn 2 (2 Cầu)';
        else if (vLower.includes('1 cầu') || cleanKx === 'VF707') cleanV = 'Plus Tiêu chuẩn 1';
        else if (cleanKx === 'VF708') cleanV = 'Plus Tiêu chuẩn 2';
        else if (cleanV) cleanV = cleanV;
        else cleanV = 'Plus Tiêu chuẩn';
    } else if (cleanDx === 'VF 8') {
        if (vLower.includes('thế hệ mới') || vLower.includes('all new') || cleanKx.includes('THM')) {
            cleanV = 'All New';
        } else if (vLower.includes('nâng cấp') || cleanKx === 'PD1U05') {
            cleanV = 'Eco Nâng cấp';
        } else if (vLower.includes('eco') || cleanKx === 'PD1U01' || cleanKx === 'VF8 S') {
            cleanV = 'Eco Tiêu chuẩn';
        } else {
            cleanV = 'Plus';
        }
    } else if (cleanDx === 'VF 9') {
        if (vLower.includes('eco') || cleanKx === 'PE1U01') cleanV = 'Eco_3ZONES';
        else if (vLower.includes('6 chỗ') || cleanKx === 'PE1U08') cleanV = 'Plus_CAP_Metal_3ZONES';
        else cleanV = 'Plus_Metal_3ZONES';
    } else if (cleanDx === 'EC Van') {
        if (vLower.includes('cửa trượt') || cleanKx === 'ECVANNCCT') cleanV = 'Plus_Cửa trượt';
        else if (vLower.includes('nâng cao') || cleanKx === 'ECVANNC') cleanV = 'Plus';
        else cleanV = 'Base';
    } else if (cleanDx === 'LIMO') {
        cleanV = 'LIMO';
    }

    return { dong_xe: cleanDx, phien_ban: cleanV };
};

const WEB_EXTERIOR_COLORS_MAP: Record<string, string> = {
    "CE11": "Jet Black (CE11)",
    "CE18": "White (CE18)",
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

interface ExistingStockInfo {
    vin: string;
    trang_thai?: string;
    vi_tri?: string;
    dong_xe?: string;
    phien_ban?: string;
    source?: 'khoxe' | 'donhang' | 'archived';
    detail?: string;
}

export const CyberSyncAllocationModal: React.FC<CyberSyncAllocationModalProps> = ({
    isOpen,
    onClose,
    showToast,
    onSuccess
}) => {
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
    const [activeDatePreset, setActiveDatePreset] = useState<'thisMonth' | 'today' | 'last7days' | 'lastMonth' | 'thisYear' | 'custom'>('thisMonth');

    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingStock, setIsCheckingStock] = useState(false);
    const [isUndoing, setIsUndoing] = useState(false);
    const [previewCars, setPreviewCars] = useState<any[]>([]);
    const [rawOriginalCars, setRawOriginalCars] = useState<any[]>([]);
    const [existingStockMap, setExistingStockMap] = useState<Record<string, ExistingStockInfo>>({});
    const [selectedVins, setSelectedVins] = useState<Set<string>>(new Set());
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

    // Search and Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDongXe, setFilterDongXe] = useState('ALL');
    const [filterViTri, setFilterViTri] = useState('ALL');
    const [filterStockStatus, setFilterStockStatus] = useState<'ALL' | 'NEW' | 'EXISTING' | 'MODIFIED'>('ALL');

    useEffect(() => {
        if (isOpen) {
            setPreviewCars([]);
            setRawOriginalCars([]);
            setExistingStockMap({});
            setSelectedVins(new Set());
            setHasLoadedPreview(false);
            setSyncStats(null);
            setIsQuickEdit(false);
            setEditingRowIdx(null);
            setSearchQuery('');
            setFilterDongXe('ALL');
            setFilterViTri('ALL');
            setFilterStockStatus('ALL');
        }
    }, [isOpen]);

    // Lắng nghe phím ESC để đóng modal
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading && !isUndoing) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isLoading, isUndoing, onClose]);

    // Chọn nhanh khoảng ngày
    const applyDatePreset = (preset: 'today' | 'last7days' | 'thisMonth' | 'lastMonth' | 'thisYear') => {
        const currentDate = new Date();
        let start = new Date();
        let end = new Date();

        if (preset === 'today') {
            start = currentDate;
            end = currentDate;
        } else if (preset === 'last7days') {
            start = new Date();
            start.setDate(currentDate.getDate() - 7);
            end = currentDate;
        } else if (preset === 'thisMonth') {
            start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            end = currentDate;
        } else if (preset === 'lastMonth') {
            start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            end = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
        } else if (preset === 'thisYear') {
            start = new Date(currentDate.getFullYear(), 0, 1);
            end = currentDate;
        }

        setFromDate(getFormattedDate(start));
        setToDate(getFormattedDate(end));
        setActiveDatePreset(preset);
    };

    // 1. Xem trước danh sách xe từ CyberSoft ERP và đối soát tồn kho Supabase
    const handlePreview = async (overrideFromDate?: string, overrideToDate?: string) => {
        const fDate = overrideFromDate || fromDate;
        const tDate = overrideToDate || toDate;

        setIsLoading(true);
        setSyncStats(null);
        setEditingRowIdx(null);
        try {
            const res = await syncCyberAllocations({ fromDate: fDate, toDate: tDate, preview: true });
            if (res && res.success) {
                const cars = res.cars || [];
                // Tự động chuẩn hóa Dòng xe và Phiên bản xe khớp chuẩn 100% với danh mục Web App (versionsMap)
                const normalizedCars = cars.map((c: any) => {
                    const norm = normalizeAppVersion(c.dong_xe, c.phien_ban, c.ma_kx);
                    return {
                        ...c,
                        dong_xe: norm.dong_xe,
                        phien_ban: norm.phien_ban
                    };
                });

                setPreviewCars(normalizedCars);
                setRawOriginalCars(JSON.parse(JSON.stringify(normalizedCars)));
                setHasLoadedPreview(true);
                // Đặt selectedVins rỗng trước khi đối soát kho
                setSelectedVins(new Set());

                // Kiểm tra trạng thái xe đối chiếu với Supabase khoxe, donhang, archived_orders
                const vins = normalizedCars.map((c: any) => c.vin).filter(Boolean);
                if (vins.length > 0) {
                    checkExistingStock(vins);
                }

                showToast('Đã tải xem trước', `Tìm thấy ${res.total || 0} xe từ CyberSoft. Đang đối soát kho để phân loại xe mới và xe đã có...`, 'info');
            } else {
                throw new Error(res?.error || 'Không thể lấy dữ liệu từ CyberSoft.');
            }
        } catch (err: any) {
            showToast('Lỗi xem trước', err.message || 'Lỗi kết nối CyberSoft', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Đối chiếu kho Supabase (khoxe, donhang, archived_orders)
    const checkExistingStock = async (vins: string[]) => {
        setIsCheckingStock(true);
        try {
            const cleanVins = Array.from(new Set(vins.map(v => (v || '').trim().toUpperCase()).filter(Boolean)));
            if (cleanVins.length === 0) return;

            // Truy vấn song song bảng khoxe, donhang và archived_orders
            const [khoxeRes, donhangRes, archivedRes] = await Promise.all([
                supabaseAdmin
                    .from('khoxe')
                    .select('vin, trang_thai, vi_tri, dong_xe, phien_ban')
                    .in('vin', cleanVins),
                supabaseAdmin
                    .from('donhang')
                    .select('vin, so_don_hang, ket_qua')
                    .in('vin', cleanVins),
                supabaseAdmin
                    .from('archived_orders')
                    .select('vin, so_don_hang')
                    .in('vin', cleanVins)
            ]);

            const map: Record<string, ExistingStockInfo> = {};

            // 1. Kiểm tra trong Kho xe
            if (!khoxeRes.error && khoxeRes.data) {
                khoxeRes.data.forEach((item: any) => {
                    if (item.vin) {
                        const uv = item.vin.trim().toUpperCase();
                        map[uv] = {
                            vin: uv,
                            trang_thai: item.trang_thai || 'Đã có trong kho',
                            vi_tri: item.vi_tri || 'Kho xe',
                            dong_xe: item.dong_xe,
                            phien_ban: item.phien_ban,
                            source: 'khoxe',
                            detail: `Đã có trong kho (${item.trang_thai || 'Chưa ghép'} - ${item.vi_tri || 'Kho xe'})`
                        };
                    }
                });
            }

            // 2. Kiểm tra trong Đơn hàng
            if (!donhangRes.error && donhangRes.data) {
                donhangRes.data.forEach((item: any) => {
                    if (item.vin) {
                        const uv = item.vin.trim().toUpperCase();
                        if (!map[uv]) {
                            map[uv] = {
                                vin: uv,
                                trang_thai: `Đơn hàng ${item.so_don_hang}`,
                                vi_tri: 'Đã gắn đơn hàng',
                                source: 'donhang',
                                detail: `Đang gắn vào đơn ${item.so_don_hang} (${item.ket_qua || 'Đang xử lý'})`
                            };
                        }
                    }
                });
            }

            // 3. Kiểm tra trong Lưu trữ đơn hàng (xe đã hoàn tất/giao xe)
            if (!archivedRes.error && archivedRes.data) {
                archivedRes.data.forEach((item: any) => {
                    if (item.vin) {
                        const uv = item.vin.trim().toUpperCase();
                        if (!map[uv]) {
                            map[uv] = {
                                vin: uv,
                                trang_thai: 'Đã lưu trữ / Giao xe',
                                vi_tri: 'Đã xuất kho',
                                source: 'archived',
                                detail: `Xe đã từng hoàn tất đơn cũ ${item.so_don_hang}`
                            };
                        }
                    }
                });
            }

            setExistingStockMap(map);

            // QUY TẮC CỐT LÕI: Tự động CHỈ CHỌN các xe mới (chưa từng được thêm vào hệ thống)
            const brandNewVins = cleanVins.filter(v => !map[v]);
            setSelectedVins(new Set(brandNewVins));

            if (brandNewVins.length === 0 && cleanVins.length > 0) {
                showToast(
                    'Đã đối soát kho', 
                    `Tất cả ${cleanVins.length} xe trong danh sách đều đã từng có trong hệ thống (đã bị khóa, không thể thêm lại).`, 
                    'info', 
                    4500
                );
            } else {
                showToast(
                    'Đã đối soát kho', 
                    `Phát hiện ${brandNewVins.length} xe mới (đã chọn để nạp) và ${cleanVins.length - brandNewVins.length} xe đã có (bị khóa, không nạp lại).`, 
                    'success', 
                    4000
                );
            }
        } catch (e) {
            console.warn('Lỗi kiểm tra kho xe hiện hữu:', e);
        } finally {
            setIsCheckingStock(false);
        }
    };

    // Chỉnh sửa thuộc tính của xe
    const updateCarField = (idx: number, field: string, val: string) => {
        setPreviewCars(prev => {
            const updated = [...prev];
            const currentCar = { ...updated[idx] };
            currentCar[field] = val;

            if (field === 'dong_xe') {
                const vMap = versionsMap as Record<string, string[]>;
                const availVersions = vMap[val] || [];
                if (availVersions.length === 1) {
                    currentCar.phien_ban = availVersions[0];
                } else if (availVersions.length > 0 && !availVersions.includes(currentCar.phien_ban)) {
                    currentCar.phien_ban = availVersions[0];
                }
            }

            if (field === 'ma_mau') {
                const upperCode = val.trim().toUpperCase();
                currentCar.ma_mau = upperCode;
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

    const editedCount = useMemo(() => {
        return previewCars.filter((_, idx) => isCarModified(idx)).length;
    }, [previewCars, rawOriginalCars]);

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
            const vinToRemove = car.vin;
            setPreviewCars(prev => prev.filter((_, i) => i !== idx));
            setRawOriginalCars(prev => prev.filter((_, i) => i !== idx));
            if (vinToRemove) {
                setSelectedVins(prev => {
                    const next = new Set(prev);
                    next.delete(vinToRemove);
                    return next;
                });
            }
            if (editingRowIdx === idx) setEditingRowIdx(null);
        }
    };

    // Toggle chọn/bỏ chọn 1 xe (chỉ cho phép đối với xe mới)
    const toggleSelectCar = (vin: string) => {
        const cleanVin = (vin || '').trim().toUpperCase();
        if (existingStockMap[cleanVin]) {
            showToast(
                'Không thể chọn', 
                `Xe này (VIN: ${cleanVin}) đã từng được thêm vào hệ thống trước đó, không được thêm lại.`, 
                'warning'
            );
            return;
        }
        setSelectedVins(prev => {
            const next = new Set(prev);
            if (next.has(vin)) {
                next.delete(vin);
            } else {
                next.add(vin);
            }
            return next;
        });
    };

    // Toggle chọn/bỏ chọn tất cả xe MỚI đang hiển thị (filtered & chưa có trong kho)
    const toggleSelectAllVisible = (selectableVins: string[]) => {
        if (selectableVins.length === 0) return;
        const allSelected = selectableVins.every(v => selectedVins.has(v));
        setSelectedVins(prev => {
            const next = new Set(prev);
            if (allSelected) {
                selectableVins.forEach(v => next.delete(v));
            } else {
                selectableVins.forEach(v => next.add(v));
            }
            return next;
        });
    };

    // Xuất Excel danh sách xem trước
    const handleExportExcel = () => {
        if (previewCars.length === 0) {
            showToast('Chưa có dữ liệu', 'Không có dữ liệu để xuất Excel.', 'warning');
            return;
        }

        const dataToExport = previewCars.map((car, idx) => {
            const exist = existingStockMap[car.vin?.toUpperCase()];
            return {
                'STT': idx + 1,
                'Dòng xe': car.dong_xe || '',
                'Phiên bản': car.phien_ban || '',
                'Mã màu': car.ma_mau || '',
                'Ngoại thất': car.ngoai_that || '',
                'Nội thất': car.noi_that || '',
                'Số khung (VIN)': car.vin || '',
                'Số máy': car.so_may || '',
                'Mã DMS': car.ma_dms || '',
                'Vị trí kho': car.vi_tri || 'Đang vận tải',
                'Trạng thái kho hiện tại': exist ? (exist.detail || exist.trang_thai || 'Đã có trong hệ thống - Không nạp lại') : 'Xe mới (Sẵn sàng nạp)',
                'Có thể nạp': exist ? 'Không (Đã tồn tại)' : (selectedVins.has(car.vin) ? 'Có (Đã chọn)' : 'Chưa chọn'),
                'Dòng xe gốc Cyber': car.ten_kx_cyber || '',
                'Ngày phân bổ': car.ngay_nhap || '',
                'Đã chỉnh sửa': isCarModified(idx) ? 'Có' : 'Không',
            };
        });

        const ws = xlsx.utils.json_to_sheet(dataToExport);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'KeHoachGiaoNhaMay');
        const filename = `Ke_Hoach_Giao_Nha_May_Cyber_${fromDate}_den_${toDate}.xlsx`;
        xlsx.writeFile(wb, filename);
        showToast('Xuất Excel thành công', `Đã tải về file "${filename}"`, 'success', 3000);
    };

    const [isSavingSingle, setIsSavingSingle] = useState<string | null>(null);

    // Lưu trực tiếp 1 xe vào Supabase khoxe ngay lập tức (Chỉ dành cho xe MỚI)
    const saveSingleCarToSupabase = async (idx: number) => {
        const car = previewCars[idx];
        if (!car || !car.vin) {
            showToast('Lỗi', 'Không tìm thấy số VIN của xe.', 'error');
            return;
        }

        const cleanVin = car.vin.trim().toUpperCase();
        if (existingStockMap[cleanVin]) {
            showToast(
                'Không được thêm lại', 
                `Xe (VIN: ${cleanVin}) đã từng được thêm vào hệ thống trước đó, không thể nạp lại.`, 
                'warning'
            );
            return;
        }

        const recordToSave = {
            vin: cleanVin,
            dong_xe: car.dong_xe || '',
            phien_ban: car.phien_ban || '',
            ngoai_that: car.ngoai_that || '',
            noi_that: car.noi_that || '',
            so_may: car.so_may || '',
            ma_dms: car.ma_dms || '',
            vi_tri: car.vi_tri || 'Đang vận tải',
            trang_thai: 'Chưa ghép',
            ngay_nhap: car.ngay_nhap || new Date().toISOString()
        };

        setIsSavingSingle(cleanVin);
        try {
            const { error } = await supabaseAdmin
                .from('khoxe')
                .upsert(recordToSave, { onConflict: 'vin' });

            if (error) throw error;

            // Cập nhật lại existingStockMap đánh dấu xe đã có trong kho
            setExistingStockMap(prev => ({
                ...prev,
                [cleanVin]: {
                    vin: cleanVin,
                    dong_xe: recordToSave.dong_xe,
                    phien_ban: recordToSave.phien_ban,
                    vi_tri: recordToSave.vi_tri,
                    trang_thai: recordToSave.trang_thai,
                    source: 'khoxe',
                    detail: `Đã có trong kho (${recordToSave.vi_tri})`
                }
            }));

            // Bỏ chọn khỏi selectedVins
            setSelectedVins(prev => {
                const next = new Set(prev);
                next.delete(car.vin);
                return next;
            });

            // Đóng chế độ sửa dòng nếu đang mở dòng này
            if (editingRowIdx === idx) {
                setEditingRowIdx(null);
            }

            // Đồng bộ lại rawOriginalCars để xe không còn bị đánh dấu là "đã sửa chưa lưu"
            setRawOriginalCars(prev => {
                const next = [...prev];
                next[idx] = JSON.parse(JSON.stringify(car));
                return next;
            });

            showToast(
                'Đã nạp vào Kho xe!', 
                `Xe mới ${recordToSave.dong_xe} (${recordToSave.phien_ban}) [VIN: ${cleanVin}] đã được thêm vào Kho xe thành công!`, 
                'success', 
                3500
            );

            if (onSuccess) onSuccess();
        } catch (err: any) {
            showToast('Lỗi lưu Supabase', err.message || 'Không thể lưu xe vào Kho xe', 'error');
        } finally {
            setIsSavingSingle(null);
        }
    };

    // Thực hiện đồng bộ chính thức vào Supabase khoxe (CHỈ nạp các xe MỚI đã được tick chọn)
    const handleSync = async () => {
        const carsToSync = previewCars.filter(c => {
            const cleanVin = (c.vin || '').trim().toUpperCase();
            return selectedVins.has(c.vin) && !existingStockMap[cleanVin];
        });

        if (carsToSync.length === 0) {
            showToast(
                'Không có xe mới để nạp', 
                'Không có xe mới nào được chọn. Các xe đã từng được thêm vào hệ thống không được nạp lại.', 
                'warning', 
                4000
            );
            return;
        }

        setIsLoading(true);
        try {
            showToast('Đang nạp xe...', `Đang nạp ${carsToSync.length} xe mới vào Kho xe...`, 'loading', 3000);

            // 1. Lưu trực tiếp danh sách xe MỚI vào Supabase khoxe
            const VALID_COLS = ['vin', 'dong_xe', 'phien_ban', 'ngoai_that', 'noi_that', 'so_may', 'ma_dms', 'vi_tri', 'trang_thai', 'ngay_nhap'];
            const cleanCars = carsToSync.map(c => {
                const item: any = {};
                for (const k of VALID_COLS) {
                    if (c[k] !== undefined && c[k] !== null) item[k] = c[k];
                }
                const cleanVin = (c.vin || '').trim().toUpperCase();
                item.vin = cleanVin;
                item.trang_thai = 'Chưa ghép';
                if (!item.ngay_nhap) item.ngay_nhap = new Date().toISOString();
                return item;
            }).filter(c => !!c.vin);

            if (cleanCars.length > 0) {
                const { error: upsertErr } = await supabaseAdmin
                    .from('khoxe')
                    .upsert(cleanCars, { onConflict: 'vin' });

                if (upsertErr) throw upsertErr;
            }

            // 2. Gọi thêm service đồng bộ để log và nạp
            const res = await syncCyberAllocations({
                fromDate,
                toDate,
                preview: false,
                cars: cleanCars
            });

            const successCount = res?.success_count || cleanCars.length;
            const failCount = res?.fail_count || 0;

            setSyncStats({
                total: cleanCars.length,
                success: successCount,
                fail: failCount
            });

            const vins = res?.vins || cleanCars.map((c: any) => c.vin);
            if (vins.length > 0) {
                setSyncedVins(vins);
                sessionStorage.setItem('last_cyber_synced_vins', JSON.stringify(vins));
                checkExistingStock(previewCars.map(c => c.vin).filter(Boolean));
            }

            showToast('Đồng bộ hoàn tất!', `Đã nạp thành công ${successCount} xe mới vào Kho xe Supabase.`, 'success', 5000);
            if (onSuccess) onSuccess();
        } catch (err: any) {
            showToast('Lỗi đồng bộ', err.message || 'Không thể nạp xe vào Kho xe', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Hoàn tác các xe vừa nạp
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

    // Filter logic
    const uniqueViTriList = useMemo(() => {
        const set = new Set<string>();
        previewCars.forEach(c => {
            if (c.vi_tri) set.add(c.vi_tri);
        });
        return Array.from(set).sort();
    }, [previewCars]);

    const filteredCars = useMemo(() => {
        return previewCars.filter((car, idx) => {
            // 1. Text Search
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchVin = (car.vin || '').toLowerCase().includes(q);
                const matchDongXe = (car.dong_xe || '').toLowerCase().includes(q);
                const matchPhienBan = (car.phien_ban || '').toLowerCase().includes(q);
                const matchMau = (car.ma_mau || '').toLowerCase().includes(q) || (car.ngoai_that || '').toLowerCase().includes(q);
                const matchNoiThat = (car.noi_that || '').toLowerCase().includes(q);
                const matchSoMay = (car.so_may || '').toLowerCase().includes(q);
                const matchDms = (car.ma_dms || '').toLowerCase().includes(q);
                const matchViTri = (car.vi_tri || '').toLowerCase().includes(q);
                if (!matchVin && !matchDongXe && !matchPhienBan && !matchMau && !matchNoiThat && !matchSoMay && !matchDms && !matchViTri) {
                    return false;
                }
            }

            // 2. Dòng xe filter
            if (filterDongXe !== 'ALL' && car.dong_xe !== filterDongXe) {
                return false;
            }

            // 3. Vị trí filter
            if (filterViTri !== 'ALL' && car.vi_tri !== filterViTri) {
                return false;
            }

            // 4. Stock status filter
            if (filterStockStatus !== 'ALL') {
                const exist = existingStockMap[car.vin?.toUpperCase()];
                const isModified = isCarModified(idx);

                if (filterStockStatus === 'NEW' && exist) return false;
                if (filterStockStatus === 'EXISTING' && !exist) return false;
                if (filterStockStatus === 'MODIFIED' && !isModified) return false;
            }

            return true;
        });
    }, [previewCars, searchQuery, filterDongXe, filterViTri, filterStockStatus, existingStockMap, rawOriginalCars]);

    // Thống kê theo dòng xe
    const dongXeStats = useMemo(() => {
        const map: Record<string, number> = {};
        previewCars.forEach(c => {
            const dx = c.dong_xe || 'Khác';
            map[dx] = (map[dx] || 0) + 1;
        });
        return map;
    }, [previewCars]);

    // Thống kê số xe mới vs xe đã có
    const stockComparisonStats = useMemo(() => {
        let newCars = 0;
        let existingCars = 0;
        let matchedOrders = 0;

        previewCars.forEach(c => {
            const exist = existingStockMap[c.vin?.toUpperCase()];
            if (!exist) {
                newCars++;
            } else {
                existingCars++;
                if (exist.trang_thai === 'Đã ghép') {
                    matchedOrders++;
                }
            }
        });

        return { newCars, existingCars, matchedOrders };
    }, [previewCars, existingStockMap]);

    const visibleVins = useMemo(() => filteredCars.map(c => c.vin).filter(Boolean), [filteredCars]);
    const selectableVisibleVins = useMemo(() => {
        return visibleVins.filter(v => !existingStockMap[(v || '').trim().toUpperCase()]);
    }, [visibleVins, existingStockMap]);

    const isAllVisibleSelected = selectableVisibleVins.length > 0 && selectableVisibleVins.every(v => selectedVins.has(v));
    const isSomeVisibleSelected = selectableVisibleVins.some(v => selectedVins.has(v)) && !isAllVisibleSelected;

    const selectedNewCount = useMemo(() => {
        return previewCars.filter(c => {
            const cleanVin = (c.vin || '').trim().toUpperCase();
            return selectedVins.has(c.vin) && !existingStockMap[cleanVin];
        }).length;
    }, [previewCars, selectedVins, existingStockMap]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[9999] flex items-center justify-center p-2 sm:p-4 animate-fade-in font-sans"
            onClick={() => {
                if (!isLoading && !isUndoing) onClose();
            }}
        >
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

            <div 
                className="bg-white w-full max-w-[1380px] max-h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                
                {/* Header hiện đại phong cách VinFast Cobalt */}
                <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-sky-900 text-white flex items-center justify-between shadow-lg relative overflow-hidden">
                    {/* Background glow effects */}
                    <div className="absolute -top-16 -right-16 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex items-center gap-3.5 relative z-10">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-400/30 to-white/10 flex items-center justify-center backdrop-blur-md border border-white/25 shadow-inner">
                            <i className="fas fa-truck-fast text-yellow-300 text-xl drop-shadow-sm"></i>
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">Đồng bộ Kế hoạch Nhà máy Giao</h3>
                                <span className="bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                    CyberSoft K10
                                </span>
                            </div>
                            <div className="text-xs text-sky-100/90 flex flex-wrap items-center gap-2 mt-0.5 font-medium">
                                <span className="bg-white/15 px-2.5 py-0.5 rounded-md text-[11px] font-semibold text-white">
                                    Showroom VinFast Thuận An (02.01.08)
                                </span>
                                <span>•</span>
                                <span className="text-[11px] text-amber-200/95 flex items-center gap-1">
                                    <i className="fas fa-pen-fancy text-[10px]"></i>
                                    Hiệu chỉnh trực tiếp & Đối chiếu kho Supabase trước khi nạp
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 relative z-10">
                        {previewCars.length > 0 && (
                            <button
                                onClick={handleExportExcel}
                                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm border border-emerald-400/30 cursor-pointer hover:scale-102 active:scale-98"
                                title="Xuất toàn bộ danh sách phân bổ ra file Excel (.xlsx)"
                            >
                                <i className="fas fa-file-excel text-emerald-200"></i>
                                <span>Xuất Excel</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            disabled={isLoading || isUndoing}
                            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer hover:rotate-90 active:scale-95 border border-white/15"
                            title="Đóng cửa sổ"
                        >
                            <i className="fas fa-times text-sm"></i>
                        </button>
                    </div>
                </div>

                {/* Thanh điều khiển khoảng ngày & Presets */}
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Quick Presets Buttons */}
                        <div className="flex items-center bg-slate-200/70 p-0.5 rounded-xl text-xs font-semibold text-slate-600 shadow-2xs">
                            <button
                                type="button"
                                onClick={() => applyDatePreset('today')}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    activeDatePreset === 'today' ? 'bg-white text-blue-800 font-bold shadow-xs' : 'hover:text-slate-900'
                                }`}
                            >
                                Hôm nay
                            </button>
                            <button
                                type="button"
                                onClick={() => applyDatePreset('last7days')}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    activeDatePreset === 'last7days' ? 'bg-white text-blue-800 font-bold shadow-xs' : 'hover:text-slate-900'
                                }`}
                            >
                                7 ngày qua
                            </button>
                            <button
                                type="button"
                                onClick={() => applyDatePreset('thisMonth')}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    activeDatePreset === 'thisMonth' ? 'bg-white text-blue-800 font-bold shadow-xs' : 'hover:text-slate-900'
                                }`}
                            >
                                Tháng này
                            </button>
                            <button
                                type="button"
                                onClick={() => applyDatePreset('lastMonth')}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    activeDatePreset === 'lastMonth' ? 'bg-white text-blue-800 font-bold shadow-xs' : 'hover:text-slate-900'
                                }`}
                            >
                                Tháng trước
                            </button>
                            <button
                                type="button"
                                onClick={() => applyDatePreset('thisYear')}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    activeDatePreset === 'thisYear' ? 'bg-white text-blue-800 font-bold shadow-xs' : 'hover:text-slate-900'
                                }`}
                            >
                                Cả năm {now.getFullYear()}
                            </button>
                        </div>

                        {/* Date Inputs */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 shadow-2xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                                <label className="text-[11px] font-bold text-slate-500">Từ:</label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => {
                                        setFromDate(e.target.value);
                                        setActiveDatePreset('custom');
                                    }}
                                    disabled={isLoading}
                                    className="text-xs font-semibold text-slate-700 outline-none bg-transparent"
                                />
                            </div>

                            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 shadow-2xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                                <label className="text-[11px] font-bold text-slate-500">Đến:</label>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => {
                                        setToDate(e.target.value);
                                        setActiveDatePreset('custom');
                                    }}
                                    disabled={isLoading}
                                    className="text-xs font-semibold text-slate-700 outline-none bg-transparent"
                                />
                            </div>

                            <Button
                                variant="secondary"
                                onClick={() => handlePreview()}
                                disabled={isLoading}
                                className="text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all border border-slate-300"
                            >
                                <i className={`fas ${isLoading ? 'fa-circle-notch fa-spin text-blue-600' : 'fa-magnifying-glass text-blue-600'} text-xs`}></i>
                                <span>{isLoading ? 'Đang truy vấn...' : 'Xem trước'}</span>
                            </Button>
                        </div>
                    </div>

                    {/* Action buttons right */}
                    <div className="flex items-center gap-2">
                        {hasLoadedPreview && previewCars.length > 0 && (
                            <button
                                onClick={() => setIsQuickEdit(!isQuickEdit)}
                                className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
                                    isQuickEdit 
                                        ? 'bg-amber-600 text-white border-amber-700 shadow-inner' 
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-blue-700'
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
                            disabled={isLoading || previewCars.length === 0 || selectedNewCount === 0}
                            className={`text-xs px-4 py-1.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all ${
                                previewCars.length === 0 || selectedNewCount === 0
                                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 hover:scale-102 active:scale-98'
                            }`}
                        >
                            {isLoading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin text-xs"></i>
                                    <span>Đang nạp vào Kho xe...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-cloud-arrow-down text-xs"></i>
                                    <span>
                                        {selectedNewCount > 0 
                                            ? `Nạp ${selectedNewCount} xe mới vào Kho xe` 
                                            : 'Không có xe mới để nạp'}
                                    </span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Content / Preview Area */}
                <div className="p-4 sm:p-5 flex-1 overflow-y-auto min-h-[350px] bg-slate-100/70">
                    
                    {/* Thông báo kết quả đồng bộ thành công */}
                    {syncStats && (
                        <div className="mb-4 p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 rounded-2xl flex items-center justify-between text-xs text-emerald-900 animate-fade-in shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                    <i className="fas fa-check"></i>
                                </div>
                                <div>
                                    <p className="font-extrabold text-sm text-emerald-950">
                                        Đồng bộ thành công: Đã nạp {syncStats.success} xe vào Kho xe Showroom Thuận An!
                                    </p>
                                    <p className="text-[11px] text-emerald-700 font-medium">
                                        Dữ liệu đã sẵn sàng trên bảng <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-900 font-mono font-bold">khoxe</code> để bộ phận Điều phối ghép hợp đồng và xuất hóa đơn.
                                    </p>
                                </div>
                            </div>
                            {syncedVins.length > 0 && (
                                <button
                                    onClick={handleUndo}
                                    disabled={isUndoing}
                                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                    title="Xóa các xe vừa nạp khỏi Kho xe"
                                >
                                    <i className={`fas ${isUndoing ? 'fa-spinner fa-spin' : 'fa-rotate-left'} text-xs`}></i>
                                    <span>{isUndoing ? 'Đang xóa...' : `Hoàn tác (${syncedVins.length} xe)`}</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* EMPTY STATE CAO CẤP */}
                    {!hasLoadedPreview && !isLoading && !syncStats && (
                        <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center p-6 sm:p-8">
                            <div className="relative mb-5">
                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-sky-400/20 text-blue-600 flex items-center justify-center text-3xl shadow-inner border border-blue-200/60">
                                    <i className="fas fa-warehouse drop-shadow-sm"></i>
                                </div>
                                <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-md border-2 border-white">
                                    <i className="fas fa-bolt"></i>
                                </span>
                            </div>

                            <h4 className="text-base sm:text-lg font-extrabold text-slate-800 mb-1.5">
                                Sẵn sàng đối soát & nạp Kế hoạch giao xe từ Nhà máy
                            </h4>
                            <p className="text-xs sm:text-sm max-w-lg text-slate-500 leading-relaxed mb-6">
                                Hệ thống sẽ kết nối với phân hệ chứng từ <span className="font-semibold text-slate-700">K10 CyberSoft</span> để lấy kế hoạch xe nhà máy giao cho Showroom Thuận An. Bạn có thể kiểm tra số khung VIN, màu sắc, vị trí kho và hiệu chỉnh trước khi lưu.
                            </p>

                            {/* Quy trình 3 bước trực quan */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 max-w-2xl w-full mb-7 text-left">
                                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center">1</span>
                                        <span className="text-xs font-bold text-slate-800">Chọn kỳ phân bổ</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-snug">
                                        Chọn nhanh "Tháng này" hoặc khoảng ngày nhận xe từ nhà máy VinFast.
                                    </p>
                                </div>

                                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center">2</span>
                                        <span className="text-xs font-bold text-slate-800">Rà soát & Tinh chỉnh</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-snug">
                                        Sửa nhanh dòng xe, ngoại thất, vị trí kho hoặc gán kho hàng loạt.
                                    </p>
                                </div>

                                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px] flex items-center justify-center">3</span>
                                        <span className="text-xs font-bold text-slate-800">Nạp Kho an toàn</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-snug">
                                        Tự động upsert theo VIN, đối chiếu tồn kho và hỗ trợ hoàn tác 1 chạm.
                                    </p>
                                </div>
                            </div>

                            {/* Nút bấm nhanh ngay tại Empty State */}
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                <Button
                                    variant="primary"
                                    onClick={() => handlePreview()}
                                    disabled={isLoading}
                                    className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white shadow-md shadow-blue-500/20 hover:scale-103 active:scale-97 flex items-center gap-2"
                                >
                                    <i className="fas fa-play text-xs text-sky-200"></i>
                                    <span>Tải xem trước kỳ hiện tại ({fromDate} ➔ {toDate})</span>
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        applyDatePreset('last7days');
                                        const end = new Date();
                                        const start = new Date();
                                        start.setDate(end.getDate() - 7);
                                        handlePreview(getFormattedDate(start), getFormattedDate(end));
                                    }}
                                    disabled={isLoading}
                                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
                                >
                                    <i className="fas fa-clock-rotate-left text-blue-600 text-xs"></i>
                                    <span>7 ngày gần nhất</span>
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* LOADING STATE HIỆN ĐẠI */}
                    {isLoading && (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-600 gap-3">
                            <div className="relative">
                                <i className="fas fa-circle-notch fa-spin text-4xl text-blue-600"></i>
                                <i className="fas fa-bolt text-yellow-500 absolute inset-0 flex items-center justify-center text-xs"></i>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-slate-800">Đang liên kết dữ liệu máy chủ CyberSoft ERP...</p>
                                <p className="text-xs text-slate-400 mt-0.5">Trích xuất chứng từ phân bổ K10 và bản đồ vị trí xe cho Showroom Thuận An</p>
                            </div>
                        </div>
                    )}

                    {/* KHI ĐÃ TẢI PREVIEW XONG */}
                    {hasLoadedPreview && !isLoading && (
                        <div className="space-y-3">
                            
                            {/* KPI Metrics Banner */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-base font-bold">
                                        <i className="fas fa-car-side"></i>
                                    </div>
                                    <div>
                                        <div className="text-lg font-black text-slate-800 leading-tight">{previewCars.length}</div>
                                        <div className="text-[11px] text-slate-500 font-medium">Tổng xe phân bổ</div>
                                    </div>
                                </div>

                                <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-base font-bold">
                                        <i className="fas fa-sparkles"></i>
                                    </div>
                                    <div>
                                        <div className="text-lg font-black text-emerald-700 leading-tight">
                                            {stockComparisonStats.newCars}
                                            {isCheckingStock && <i className="fas fa-circle-notch fa-spin text-[10px] ml-1 text-slate-400"></i>}
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-medium">Xe mới (Sẵn sàng nạp)</div>
                                    </div>
                                </div>

                                <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-base font-bold">
                                        <i className="fas fa-lock text-slate-500"></i>
                                    </div>
                                    <div>
                                        <div className="text-lg font-black text-slate-700 leading-tight">
                                            {stockComparisonStats.existingCars}
                                            {stockComparisonStats.matchedOrders > 0 && (
                                                <span className="text-[10px] font-bold text-amber-600 ml-1.5">
                                                    ({stockComparisonStats.matchedOrders} có HĐ)
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-medium">Đã tồn tại (Bị khóa)</div>
                                    </div>
                                </div>

                                <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-base font-bold">
                                        <i className="fas fa-square-check"></i>
                                    </div>
                                    <div>
                                        <div className="text-lg font-black text-indigo-700 leading-tight">
                                            {selectedNewCount}
                                            <span className="text-xs text-slate-400 font-normal"> / {stockComparisonStats.newCars}</span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-medium">Đang chọn nạp</div>
                                    </div>
                                </div>
                            </div>

                            {/* Tags Dòng xe filter nhanh */}
                            <div className="bg-white px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                                        <i className="fas fa-filter text-[10px]"></i> Dòng xe:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setFilterDongXe('ALL')}
                                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                            filterDongXe === 'ALL'
                                                ? 'bg-blue-600 text-white shadow-2xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        Tất cả ({previewCars.length})
                                    </button>
                                    {Object.entries(dongXeStats).map(([dx, count]) => (
                                        <button
                                            key={dx}
                                            type="button"
                                            onClick={() => setFilterDongXe(filterDongXe === dx ? 'ALL' : dx)}
                                            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                                filterDongXe === dx
                                                    ? 'bg-blue-600 text-white shadow-2xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {dx} <span className="opacity-80 font-normal">({count})</span>
                                        </button>
                                    ))}
                                </div>

                                {editedCount > 0 && (
                                    <button
                                        onClick={resetAllToOriginal}
                                        className="text-[11px] text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 font-bold px-2.5 py-1 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer ml-auto"
                                        title="Khôi phục toàn bộ dữ liệu gốc từ CyberSoft"
                                    >
                                        <i className="fas fa-rotate-left text-xs text-amber-600"></i>
                                        <span>Khôi phục tất cả về gốc Cyber ({editedCount})</span>
                                    </button>
                                )}
                            </div>

                            {/* Toolbar Tìm kiếm, Lọc trạng thái & Thao tác hàng loạt */}
                            <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
                                    {/* Search Box */}
                                    <div className="relative flex-1 max-w-sm">
                                        <i className="fas fa-magnifying-glass absolute left-3 top-2.5 text-xs text-slate-400"></i>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Tìm số VIN, Dòng xe, Màu sắc, Số máy..."
                                            className="w-full text-xs pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                                            >
                                                <i className="fas fa-times-circle"></i>
                                            </button>
                                        )}
                                    </div>

                                    {/* Filter Vị trí */}
                                    {uniqueViTriList.length > 0 && (
                                        <select
                                            value={filterViTri}
                                            onChange={(e) => setFilterViTri(e.target.value)}
                                            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                                        >
                                            <option value="ALL">Vị trí: Tất cả ({previewCars.length})</option>
                                            {uniqueViTriList.map(vt => (
                                                <option key={vt} value={vt}>{vt}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Filter Tồn kho */}
                                    <select
                                        value={filterStockStatus}
                                        onChange={(e) => setFilterStockStatus(e.target.value as any)}
                                        className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                                    >
                                        <option value="ALL">Kho: Tất cả ({previewCars.length})</option>
                                        <option value="NEW">✨ Chỉ xe mới ({stockComparisonStats.newCars})</option>
                                        <option value="EXISTING">🔒 Chỉ xe đã tồn tại / Bị khóa ({stockComparisonStats.existingCars})</option>
                                        <option value="MODIFIED">✏️ Chỉ xe đã chỉnh sửa ({editedCount})</option>
                                    </select>
                                </div>
                            </div>

                            {/* BẢNG DỮ LIỆU PREVIEW */}
                            {filteredCars.length === 0 ? (
                                <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                                    <i className="fas fa-filter-circle-xmark text-3xl text-slate-300 mb-2"></i>
                                    <p className="font-bold text-slate-700 text-sm">Không tìm thấy xe nào phù hợp bộ lọc</p>
                                    <p className="text-slate-400 mt-1">Thử xóa từ khóa tìm kiếm hoặc đổi điều kiện lọc ở thanh phía trên.</p>
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setFilterDongXe('ALL');
                                            setFilterViTri('ALL');
                                            setFilterStockStatus('ALL');
                                        }}
                                        className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                    >
                                        Xóa tất cả bộ lọc
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                                    <div className="max-h-[460px] overflow-y-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead className="bg-slate-100/90 backdrop-blur-md text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 select-none shadow-2xs">
                                                <tr>
                                                    {/* Checkbox select all (chỉ áp dụng cho xe mới) */}
                                                    <th className="py-2.5 px-3 text-center w-10">
                                                        <input
                                                            type="checkbox"
                                                            checked={isAllVisibleSelected}
                                                            disabled={selectableVisibleVins.length === 0}
                                                            ref={el => {
                                                                if (el) el.indeterminate = isSomeVisibleSelected;
                                                            }}
                                                            onChange={() => toggleSelectAllVisible(selectableVisibleVins)}
                                                            className={`w-4 h-4 rounded text-blue-600 focus:ring-blue-500 ${
                                                                selectableVisibleVins.length === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                                                            }`}
                                                            title={
                                                                selectableVisibleVins.length === 0
                                                                    ? "Tất cả các xe hiển thị đều đã có trong hệ thống (bị khóa, không thêm lại)"
                                                                    : "Chọn / Bỏ chọn tất cả xe mới đang hiển thị"
                                                            }
                                                        />
                                                    </th>
                                                    <th className="py-2.5 px-2 text-center w-12">STT</th>
                                                    <th className="py-2.5 px-3 min-w-[155px]">Dòng xe / Phiên bản</th>
                                                    <th className="py-2.5 px-2.5 text-center w-24">Mã màu</th>
                                                    <th className="py-2.5 px-3 min-w-[170px]">Ngoại thất / Nội thất</th>
                                                    <th className="py-2.5 px-3 min-w-[150px]">Số khung (VIN)</th>
                                                    <th className="py-2.5 px-2.5 w-28">Số máy</th>
                                                    <th className="py-2.5 px-2.5 w-24">Mã DMS</th>
                                                    <th className="py-2.5 px-3 min-w-[130px]">Kho / Vị trí</th>
                                                    <th className="py-2.5 px-2.5 text-center w-28">Trạng thái kho</th>
                                                    <th className="py-2.5 px-2.5 text-center w-24">Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                                                {filteredCars.map((car) => {
                                                    const realIdx = previewCars.findIndex(c => c.vin === car.vin);
                                                    const exist = existingStockMap[car.vin?.toUpperCase()];
                                                    const isEditing = !exist && (isQuickEdit || editingRowIdx === realIdx);
                                                    const modified = realIdx >= 0 && isCarModified(realIdx);
                                                    const isSelected = selectedVins.has(car.vin);

                                                    return (
                                                        <tr 
                                                            key={car.vin || realIdx} 
                                                            className={`transition-colors ${
                                                                exist
                                                                    ? 'bg-slate-50/75 text-slate-500 hover:bg-slate-100/60'
                                                                    : !isSelected 
                                                                        ? 'opacity-60 bg-white' 
                                                                        : modified 
                                                                            ? 'bg-amber-50/50 hover:bg-amber-50' 
                                                                            : 'hover:bg-blue-50/30'
                                                            }`}
                                                        >
                                                            {/* Checkbox */}
                                                            <td className="py-2 px-3 text-center">
                                                                {exist ? (
                                                                    <div 
                                                                        className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed mx-auto"
                                                                        title={`Xe đã từng được thêm vào (${exist.detail || exist.trang_thai || 'Đã có trong hệ thống'}) - Bị khóa, không được thêm lại.`}
                                                                    >
                                                                        <i className="fas fa-lock text-[10px] text-slate-400"></i>
                                                                    </div>
                                                                ) : (
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => toggleSelectCar(car.vin)}
                                                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                                        title={isSelected ? "Bỏ chọn xe mới này" : "Chọn xe mới này để nạp vào kho"}
                                                                    />
                                                                )}
                                                            </td>

                                                            {/* STT */}
                                                            <td className="py-2 px-2 font-semibold text-slate-400 text-center">
                                                                <div className="flex flex-col items-center">
                                                                    <span>{realIdx + 1}</span>
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
                                                                            onChange={(e) => updateCarField(realIdx, 'dong_xe', e.target.value)}
                                                                            placeholder="Dòng xe (VF 8, LIMO...)"
                                                                            className="w-full text-xs font-bold text-blue-900 bg-white border border-blue-300 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                                                        />
                                                                        <div className="relative">
                                                                            <input
                                                                                type="text"
                                                                                list={`cyber_pb_options_${realIdx}`}
                                                                                value={car.phien_ban || ''}
                                                                                onChange={(e) => updateCarField(realIdx, 'phien_ban', e.target.value)}
                                                                                placeholder="Phiên bản (Plus, Base...)"
                                                                                className="w-full text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-500"
                                                                            />
                                                                            <datalist id={`cyber_pb_options_${realIdx}`}>
                                                                                {((versionsMap as any)[car.dong_xe] || []).map((v: string) => (
                                                                                    <option key={v} value={v} />
                                                                                ))}
                                                                            </datalist>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <div className="font-bold text-blue-900 flex items-center gap-1.5 flex-wrap">
                                                                            <span>{car.dong_xe}</span>
                                                                            {car.phien_ban && (
                                                                                <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.2 rounded text-[10.5px]">
                                                                                    {car.phien_ban}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {car.ten_kx_cyber && (
                                                                            <div className="text-[10px] text-slate-400 truncate max-w-[210px] mt-0.5 flex items-center gap-1" title={`Mã Cyber: ${car.ma_kx || ''} • Gốc: ${car.ten_kx_cyber}`}>
                                                                                <span className="text-slate-400">Cyber:</span>
                                                                                <span className="font-mono text-slate-500">{car.ma_kx || ''}</span>
                                                                                <span>•</span>
                                                                                <span className="truncate">{car.ten_kx_cyber}</span>
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
                                                                        onChange={(e) => updateCarField(realIdx, 'ma_mau', e.target.value)}
                                                                        placeholder="CE11"
                                                                        className="w-20 text-center uppercase font-mono font-bold text-xs bg-white border border-blue-300 rounded-lg px-1 py-1 text-blue-700 outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                                                    />
                                                                ) : (
                                                                    car.ma_mau ? (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
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
                                                                            onChange={(e) => updateCarField(realIdx, 'ngoai_that', e.target.value)}
                                                                            placeholder="Ngoại thất (Jet Black (CE11)...)"
                                                                            className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            list="cyber_noi_that_options"
                                                                            value={car.noi_that || ''}
                                                                            onChange={(e) => updateCarField(realIdx, 'noi_that', e.target.value)}
                                                                            placeholder="Nội thất (Black, Brown, Beige, Grey)"
                                                                            className="w-full text-[11px] text-slate-500 bg-white border border-slate-300 rounded-lg px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-500"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                                                            <span className="truncate max-w-[200px]" title={car.ngoai_that}>{car.ngoai_that || '-'}</span>
                                                                        </div>
                                                                        {car.noi_that && (
                                                                            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                                                                <span>Nội thất:</span>
                                                                                <span className="font-semibold text-slate-700">{car.noi_that}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>

                                                            {/* Số khung (VIN) */}
                                                            <td className="py-1.5 px-3">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-mono font-bold text-indigo-700 select-all tracking-wider">
                                                                        {car.vin}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(car.vin);
                                                                            showToast('Đã sao chép VIN', car.vin, 'info', 1500);
                                                                        }}
                                                                        className="text-slate-300 hover:text-indigo-600 transition-colors p-0.5 cursor-pointer"
                                                                        title="Sao chép số khung VIN"
                                                                    >
                                                                        <i className="fas fa-copy text-[11px]"></i>
                                                                    </button>
                                                                </div>
                                                            </td>

                                                            {/* Số máy */}
                                                            <td className="py-1.5 px-2.5">
                                                                {isEditing ? (
                                                                    <input
                                                                        type="text"
                                                                        value={car.so_may || ''}
                                                                        onChange={(e) => updateCarField(realIdx, 'so_may', e.target.value)}
                                                                        placeholder="Số máy"
                                                                        className="w-full font-mono text-[11px] bg-white border border-slate-300 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
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
                                                                        onChange={(e) => updateCarField(realIdx, 'ma_dms', e.target.value)}
                                                                        placeholder="Mã DMS"
                                                                        className="w-full font-semibold text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
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
                                                                        onChange={(e) => updateCarField(realIdx, 'vi_tri', e.target.value)}
                                                                        placeholder="Vị trí kho"
                                                                        className="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                                                    />
                                                                ) : (
                                                                    <span className="text-slate-700 font-medium flex items-center gap-1">
                                                                        <i className="fas fa-location-dot text-blue-500 text-[10px]"></i>
                                                                        <span>{car.vi_tri || 'Đang vận tải'}</span>
                                                                    </span>
                                                                )}
                                                            </td>

                                                            {/* Trạng thái kho đối chiếu Supabase */}
                                                            <td className="py-1.5 px-2.5 text-center">
                                                                {exist ? (
                                                                    <div className="flex flex-col items-center gap-0.5">
                                                                        <span 
                                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs" 
                                                                            title={exist.detail || `Đã có trong hệ thống. Vị trí: ${exist.vi_tri || 'N/A'}`}
                                                                        >
                                                                            <i className="fas fa-lock text-[9px] text-slate-500"></i>
                                                                            <span>Đã có - Không nạp lại</span>
                                                                        </span>
                                                                        <span className="text-[9.5px] text-slate-400 font-medium truncate max-w-[130px]" title={exist.detail}>
                                                                            {exist.trang_thai || exist.vi_tri || 'Đã tồn tại'}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                                                        <i className="fas fa-sparkles text-[9px] text-emerald-600"></i>
                                                                        <span>Xe mới</span>
                                                                    </span>
                                                                )}
                                                            </td>

                                                            {/* Thao tác */}
                                                            <td className="py-1.5 px-2.5 text-center">
                                                                {exist ? (
                                                                    <div className="flex items-center justify-center">
                                                                        <span 
                                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-400 text-[11px] font-semibold border border-slate-200 cursor-not-allowed"
                                                                            title={`Xe này đã từng được thêm vào hệ thống (${exist.detail || 'Đã tồn tại'}). Không thể chỉnh sửa hoặc thêm lại.`}
                                                                        >
                                                                            <i className="fas fa-ban text-[10px] text-slate-400"></i>
                                                                            <span>Bị khóa</span>
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        {!isQuickEdit && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setEditingRowIdx(editingRowIdx === realIdx ? null : realIdx)}
                                                                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                                                                    editingRowIdx === realIdx
                                                                                        ? 'bg-blue-600 text-white shadow-xs'
                                                                                        : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'
                                                                                }`}
                                                                                title={editingRowIdx === realIdx ? "Xong chỉnh sửa" : "Chỉnh sửa dòng này"}
                                                                            >
                                                                                <i className={`fas ${editingRowIdx === realIdx ? 'fa-check' : 'fa-pencil'} text-xs`}></i>
                                                                            </button>
                                                                        )}

                                                                        {/* Nút lưu trực tiếp vào Supabase cho xe mới này */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => saveSingleCarToSupabase(realIdx)}
                                                                            disabled={isSavingSingle === car.vin}
                                                                            className={`p-1.5 rounded-lg transition-all cursor-pointer shadow-2xs ${
                                                                                modified 
                                                                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 font-bold' 
                                                                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-300'
                                                                            }`}
                                                                            title="Lưu trực tiếp thông tin xe mới này vào Kho xe Supabase"
                                                                        >
                                                                            <i className={`fas ${isSavingSingle === car.vin ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'} text-xs`}></i>
                                                                        </button>

                                                                        {modified && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => resetRowToOriginal(realIdx)}
                                                                                className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-100 transition-all cursor-pointer"
                                                                                title="Khôi phục xe này về dữ liệu gốc CyberSoft"
                                                                            >
                                                                                <i className="fas fa-rotate-left text-xs"></i>
                                                                            </button>
                                                                        )}

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeCar(realIdx)}
                                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                                                                            title="Loại bỏ xe này khỏi danh sách nạp"
                                                                        >
                                                                            <i className="fas fa-trash-can text-xs"></i>
                                                                        </button>
                                                                    </div>
                                                                )}
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

                {/* Footer với thông tin trạng thái & phím tắt */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 font-medium text-slate-600">
                            <i className="fas fa-shield-halved text-blue-600"></i>
                            <span>Tự động upsert theo số VIN • Trạng thái mặc định: Chưa ghép</span>
                        </span>

                        {syncedVins.length > 0 && (
                            <button
                                onClick={handleUndo}
                                disabled={isUndoing || isLoading}
                                className="text-amber-800 hover:text-red-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                title="Hoàn tác lần nạp xe gần nhất"
                            >
                                <i className={`fas ${isUndoing ? 'fa-spinner fa-spin' : 'fa-rotate-left'} text-xs`}></i>
                                <span>Hoàn tác ({syncedVins.length} xe vừa nạp)</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {previewCars.length > 0 && (
                            <span className="text-[11px] font-semibold text-slate-400 mr-2">
                                Đã chọn: <strong className="text-blue-700">{selectedVins.size}</strong>/{previewCars.length} xe
                            </span>
                        )}

                        <Button
                            variant="secondary"
                            onClick={onClose}
                            disabled={isLoading || isUndoing}
                            className="text-xs px-4 py-1.5 rounded-xl font-bold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 shadow-2xs"
                        >
                            Đóng
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
};
