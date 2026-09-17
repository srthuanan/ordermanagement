import React, { useState, useEffect, useMemo } from 'react';
import * as xlsx from 'xlsx';
import Button from '../ui/Button';
import { searchCyberFactoryPlan, getCyberPlanFilterOptions, CyberPlanSearchParams } from '../../services/api/stockService';

interface CyberPlanCarItem {
    vin: string;
    so_may: string;
    ma_kx: string;
    ten_kx: string;
    phien_ban: string;
    dong_xe: string;
    ma_mau: string;
    ten_mau: string;
    ma_mau_nt: string;
    ten_mau_nt: string;
    nam_sx: number;
    ma_dms: string;
    ma_ttcp: string;
    ten_ttcp: string;
    vi_tri_kho: string;
    ghi_chu: string;
    ngay_phan_bo: string;
    ngay_ct: string;
    ma_ct: string;
    current_physical_warehouse?: string;
    raw_physical_warehouse?: string;
}

interface CyberFactoryPlanSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

const COMMON_MODELS = [
    'Tất cả',
    'VF 3',
    'VF 5',
    'VF 6',
    'VF 7',
    'VF 8',
    'VF 9',
    'EC Van',
    'LIMO'
];

export const CyberFactoryPlanSearchModal: React.FC<CyberFactoryPlanSearchModalProps> = ({
    isOpen,
    onClose,
    showToast
}) => {
    const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const firstDayOfYear = useMemo(() => `${new Date().getFullYear()}-01-01`, []);

    const [keyword, setKeyword] = useState('');
    const [selectedModel, setSelectedModel] = useState('Tất cả');
    const [selectedColor, setSelectedColor] = useState('Tất cả');
    const [selectedTtcp, setSelectedTtcp] = useState('');
    const [fromDate, setFromDate] = useState(firstDayOfYear);
    const [toDate, setToDate] = useState(todayStr);
    const [planType, setPlanType] = useState<'K10' | 'K15' | 'ALL'>('K10');

    const [filterOptions, setFilterOptions] = useState<{ ttcp_list: any[]; colors: string[] }>({
        ttcp_list: [],
        colors: []
    });

    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingColors, setIsLoadingColors] = useState(false);
    const [cars, setCars] = useState<CyberPlanCarItem[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [hasSearched, setHasSearched] = useState(false);
    const [copiedVin, setCopiedVin] = useState<string | null>(null);

    const loadFilterOptions = async (modelName?: string) => {
        setIsLoadingColors(true);
        try {
            const res = await getCyberPlanFilterOptions(modelName === 'Tất cả' ? '' : modelName);
            if (res && res.success) {
                setFilterOptions(prev => ({
                    ttcp_list: res.ttcp_list && res.ttcp_list.length > 0 ? res.ttcp_list : prev.ttcp_list,
                    colors: res.colors || []
                }));
            }
        } finally {
            setIsLoadingColors(false);
        }
    };

    // Khi mở modal: Không tải danh sách trước, chỉ nạp bộ lọc tùy chọn
    useEffect(() => {
        if (isOpen) {
            setHasSearched(false);
            setCars([]);
            setTotalCount(0);
            loadFilterOptions(selectedModel);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleModelChange = (newModel: string) => {
        setSelectedModel(newModel);
        setSelectedColor('Tất cả');
        loadFilterOptions(newModel);
    };

    const executeSearch = async (overrideParams?: Partial<CyberPlanSearchParams>) => {
        setIsLoading(true);
        setHasSearched(true);
        try {
            const params: CyberPlanSearchParams = {
                keyword: keyword.trim(),
                model: selectedModel === 'Tất cả' ? '' : selectedModel,
                color: selectedColor === 'Tất cả' ? '' : selectedColor,
                ttcp: selectedTtcp,
                fromDate,
                toDate,
                planType,
                limit: 150,
                offset: 0,
                ...overrideParams
            };

            const res = await searchCyberFactoryPlan(params);
            if (res && res.success) {
                setCars(res.cars || []);
                setTotalCount(res.total || 0);
            } else {
                throw new Error(res?.error || 'Lỗi tra cứu kế hoạch.');
            }
        } catch (err: any) {
            showToast('Lỗi tra cứu', err.message || 'Không thể tra cứu dữ liệu từ CyberSoft', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setKeyword('');
        setSelectedModel('Tất cả');
        setSelectedColor('Tất cả');
        setSelectedTtcp('');
        setFromDate(firstDayOfYear);
        setToDate(todayStr);
        setPlanType('ALL');
        setHasSearched(false);
        setCars([]);
        setTotalCount(0);
        loadFilterOptions('Tất cả');
    };

    const handleCopyVin = (vin: string) => {
        navigator.clipboard.writeText(vin);
        setCopiedVin(vin);
        setTimeout(() => setCopiedVin(null), 2000);
    };

    const handleExportExcel = () => {
        if (cars.length === 0) {
            showToast('Không có dữ liệu', 'Chưa có xe nào trong kết quả để xuất file.', 'warning');
            return;
        }

        const exportRows = cars.map((c, idx) => ({
            'STT': idx + 1,
            'Số VIN': c.vin,
            'Số máy': c.so_may,
            'Dòng xe': c.dong_xe || c.ten_kx,
            'Phiên bản': c.phien_ban,
            'Ngoại thất': c.ten_mau,
            'Nội thất': c.ten_mau_nt,
            'Năm SX': c.nam_sx,
            'Đơn vị nhận (TTCP)': c.ten_ttcp,
            'Mã TTCP': c.ma_ttcp,
            'Vị trí kho thực tế': c.current_physical_warehouse || '',
            'Kho trên phiếu': c.vi_tri_kho || '',
            'Mã DMS (XHĐ)': c.ma_dms,
            'Ngày chứng từ': c.ngay_ct,
            'Ngày phân bổ': c.ngay_phan_bo,
            'Loại chứng từ': c.ma_ct,
            'Ghi chú': c.ghi_chu
        }));

        const ws = xlsx.utils.json_to_sheet(exportRows);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'KeHoachGiaoXeCyber');
        const fileName = `Ke_Hoach_Giao_Xe_CyberSoft_${new Date().toISOString().slice(0, 10)}.xlsx`;
        xlsx.writeFile(wb, fileName);
        showToast('Xuất Excel thành công', `Đã tải về file ${fileName}`, 'success');
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in font-sans">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden text-slate-200">
                
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                                    Tra Cứu Kế Hoạch Nhà Máy Giao Toàn Hệ Thống
                                </h3>
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-full">
                                    Toàn Hệ Thống CyberSoft
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Tra cứu danh sách phân bổ xe (K10 / K15) của tất cả showroom thuộc hệ thống Vân Đạo & vị trí thực tế
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                        disabled={isLoading}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Filter Toolbar */}
                <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 space-y-3 shrink-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                        
                        {/* 1. Keyword search */}
                        <div className="lg:col-span-2 relative">
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Từ khóa tìm kiếm</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Tìm số VIN, số máy, mã DMS, ghi chú..."
                                    value={keyword}
                                    onChange={e => setKeyword(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && executeSearch()}
                                    className="w-full bg-slate-800/90 border border-slate-700 text-xs rounded-xl pl-8 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                />
                                <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        {/* 2. Model Filter */}
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Dòng xe</label>
                            <select
                                value={selectedModel}
                                onChange={e => handleModelChange(e.target.value)}
                                className="w-full bg-slate-800/90 border border-slate-700 text-xs rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                                {COMMON_MODELS.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        {/* 3. Color Filter */}
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                                Màu ngoại thất
                                {isLoadingColors && (
                                    <span className="ml-1.5 text-indigo-400 animate-pulse">đang tải...</span>
                                )}
                            </label>
                            <select
                                value={selectedColor}
                                onChange={e => setSelectedColor(e.target.value)}
                                disabled={isLoadingColors}
                                className="w-full bg-slate-800/90 border border-slate-700 text-xs rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="Tất cả">{isLoadingColors ? 'Đang tải màu...' : 'Tất cả màu'}</option>
                                {filterOptions.colors.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* 4. Showroom (TTCP) Filter */}
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Đơn vị nhận (Showroom)</label>
                            <select
                                value={selectedTtcp}
                                onChange={e => setSelectedTtcp(e.target.value)}
                                className="w-full bg-slate-800/90 border border-slate-700 text-xs rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer truncate"
                            >
                                <option value="">Tất cả showroom</option>
                                {filterOptions.ttcp_list.map(t => (
                                    <option key={t.code} value={t.code}>
                                        {t.name} ({t.count})
                                    </option>
                                ))}
                            </select>
                        </div>

                    </div>

                    {/* Secondary row: Date range + Plan type + Action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium">Từ ngày:</span>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={e => setFromDate(e.target.value)}
                                className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-indigo-500"
                            />
                            <span className="text-xs text-slate-400 font-medium">Đến ngày:</span>
                            <input
                                type="date"
                                value={toDate}
                                onChange={e => setToDate(e.target.value)}
                                className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-indigo-500"
                            />

                            {/* Plan type toggle */}
                            <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800/80 p-0.5 text-xs ml-2">
                                <button
                                    onClick={() => setPlanType('K10')}
                                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                        planType === 'K10' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    K10 (Phân bổ)
                                </button>
                                <button
                                    onClick={() => setPlanType('K15')}
                                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                        planType === 'K15' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    K15 (Điều chuyển)
                                </button>
                                <button
                                    onClick={() => setPlanType('ALL')}
                                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                        planType === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Tất cả
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                onClick={handleReset}
                                disabled={isLoading}
                                className="text-xs text-slate-400 hover:text-white"
                            >
                                Đặt lại
                            </Button>
                            <button
                                onClick={() => executeSearch()}
                                disabled={isLoading}
                                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Đang tìm...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-3.5 h-3.5 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        Tìm kiếm
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sub-header / Stats and Export */}
                <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Tìm thấy:</span>
                        <span className="font-bold text-indigo-400 text-sm">{totalCount.toLocaleString()}</span>
                        <span className="text-slate-400">xe kế hoạch trên CyberSoft</span>
                        {totalCount > cars.length && (
                            <span className="text-[11px] text-slate-500 italic">
                                (Hiển thị {cars.length} xe mới nhất)
                            </span>
                        )}
                    </div>

                    <button
                        onClick={handleExportExcel}
                        disabled={isLoading || cars.length === 0}
                        className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900/50 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Xuất Excel ({cars.length})
                    </button>
                </div>

                {/* Body Table */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                            <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm font-medium">Đang truy vấn kế hoạch nhà máy giao từ CyberSoft ERP...</p>
                            <p className="text-xs text-slate-500">Đang quét sổ cái phân bổ K10/K15 và vị trí thực tế</p>
                        </div>
                    ) : !hasSearched ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            </div>
                            <div className="text-center">
                                <p className="text-base font-semibold text-slate-200">Tra cứu xe kế hoạch chưa xuất hóa đơn bán (XHĐ)</p>
                                <p className="text-xs text-slate-500 mt-1">Chọn Dòng xe, Màu ngoại thất và nhấn <strong className="text-indigo-400">Tìm kiếm</strong> để bắt đầu.</p>
                                <p className="text-[11px] text-slate-600 mt-0.5">Chỉ hiển thị xe có trong kế hoạch K10/K15 mà <span className="text-amber-400">chưa có ngày hóa đơn bán</span></p>
                            </div>
                            <button
                                onClick={() => executeSearch()}
                                className="mt-1 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Tìm kiếm ngay
                            </button>
                        </div>
                    ) : cars.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-1">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-sm font-medium text-slate-300">
                                Không tìm thấy xe kế hoạch nào chưa XHĐ phù hợp với điều kiện lọc!
                            </p>
                            <p className="text-xs text-slate-500">
                                Hãy thử mở rộng khoảng thời gian hoặc chọn "Tất cả showroom"
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-950/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                                        <th className="py-2.5 px-3">STT</th>
                                        <th className="py-2.5 px-3">Số VIN</th>
                                        <th className="py-2.5 px-3">Dòng xe / Phiên bản</th>
                                        <th className="py-2.5 px-3">Ngoại thất / Nội thất</th>
                                        <th className="py-2.5 px-3">Đơn vị nhận (TTCP)</th>
                                        <th className="py-2.5 px-3">Vị trí kho thực tế</th>
                                        <th className="py-2.5 px-3">Ngày CT / Phân bổ</th>
                                        <th className="py-2.5 px-3">Số máy / DMS</th>
                                        <th className="py-2.5 px-3">Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                                    {cars.map((item, idx) => (
                                        <tr key={`${item.vin}-${idx}`} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="py-2.5 px-3 text-slate-500 font-sans">{idx + 1}</td>
                                            
                                            {/* VIN with copy button */}
                                            <td className="py-2.5 px-3">
                                                <div className="flex items-center gap-1.5 font-bold text-white tracking-wide">
                                                    <span>{item.vin}</span>
                                                    <button
                                                        onClick={() => handleCopyVin(item.vin)}
                                                        className="text-slate-500 hover:text-indigo-400 p-0.5 rounded transition-colors"
                                                        title="Sao chép số VIN"
                                                    >
                                                        {copiedVin === item.vin ? (
                                                            <span className="text-[10px] text-emerald-400 font-sans">✓</span>
                                                        ) : (
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Model */}
                                            <td className="py-2.5 px-3 font-sans text-slate-200">
                                                <div className="font-semibold text-indigo-300">
                                                    {item.dong_xe || item.ten_kx}
                                                </div>
                                                {item.phien_ban && (
                                                    <div className="text-slate-400 text-[10px]">
                                                        {item.phien_ban}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Color */}
                                            <td className="py-2.5 px-3 font-sans text-slate-300">
                                                <div>{item.ten_mau || item.ma_mau || '-'}</div>
                                                {item.ten_mau_nt && (
                                                    <div className="text-slate-500 text-[10px]">
                                                        NT: {item.ten_mau_nt}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Showroom TTCP */}
                                            <td className="py-2.5 px-3 font-sans">
                                                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                                    item.ma_ttcp === '02.01.08' || (item.ten_ttcp || '').includes('Thuận An')
                                                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                                        : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                                                }`}>
                                                    {item.ten_ttcp || item.ma_ttcp || '-'}
                                                </span>
                                            </td>

                                            {/* Physical warehouse */}
                                            <td className="py-2.5 px-3 font-sans">
                                                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                                    item.current_physical_warehouse && item.current_physical_warehouse !== 'Đang vận tải'
                                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                        : 'bg-amber-500/15 text-amber-300 border border-amber-600/30'
                                                }`}>
                                                    {item.current_physical_warehouse || 'Đang vận tải'}
                                                </span>
                                            </td>

                                            {/* Dates */}
                                            <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px]">
                                                <div>{item.ngay_ct || '-'}</div>
                                                {item.ngay_phan_bo && (
                                                    <div className="text-[10px] text-slate-500">
                                                        PB: {item.ngay_phan_bo}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Engine / DMS */}
                                            <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">
                                                <div>{item.so_may || '-'}</div>
                                                {item.ma_dms && (
                                                    <div className="text-indigo-400">{item.ma_dms}</div>
                                                )}
                                            </td>

                                            {/* Notes */}
                                            <td className="py-2.5 px-3 font-sans text-slate-400 text-[10px] max-w-[150px] truncate" title={item.ghi_chu}>
                                                {item.ghi_chu || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
                    <div className="text-xs text-slate-400">
                        {totalCount > 0 && (
                            <span>Đang hiển thị <strong className="text-white">{cars.length}</strong> / <strong className="text-white">{totalCount.toLocaleString()}</strong> xe kế hoạch giao từ nhà máy</span>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-xs text-slate-400 hover:text-white"
                    >
                        Đóng
                    </Button>
                </div>

            </div>
        </div>
    );
};
