import React, { useState, useMemo } from 'react';
import { useNightMode } from '../../hooks/useNightMode';

export interface DmsScannedCar {
    vin: string;
    dong_xe?: string;
    phien_ban?: string;
    ma_phien_ban?: string;
    so_may?: string;
    ma_dms?: string;
    has_gps?: boolean;
    lat?: number | null;
    lng?: number | null;
    status?: string;
}

export interface DmsRadarScanResult {
    success: boolean;
    message?: string;
    error?: string;
    summary?: {
        total_stock: number;
        updated_count: number;
        gps_count: number;
        sold_removed: number;
        dealer?: string;
        timestamp?: string;
    };
    cars?: DmsScannedCar[];
}

interface DmsRadarResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: DmsRadarScanResult | null;
    onRefreshStock?: () => void;
}

export const DmsRadarResultModal: React.FC<DmsRadarResultModalProps> = ({
    isOpen,
    onClose,
    data,
    onRefreshStock
}) => {
    const isNight = useNightMode();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTab, setFilterTab] = useState<'all' | 'gps' | 'updated' | 'sold'>('all');
    const [copiedVin, setCopiedVin] = useState<string | null>(null);

    const summary = data?.summary || {
        total_stock: 0,
        updated_count: 0,
        gps_count: 0,
        sold_removed: 0,
        dealer: 'N31913',
        timestamp: new Date().toISOString()
    };

    const cars = data?.cars || [];

    const handleCopy = (vin: string) => {
        navigator.clipboard.writeText(vin);
        setCopiedVin(vin);
        setTimeout(() => setCopiedVin(null), 2000);
    };

    const filteredCars = useMemo(() => {
        return cars.filter(c => {
            const matchesSearch = !searchTerm || 
                c.vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.dong_xe?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.phien_ban?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.ma_phien_ban?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.so_may?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.ma_dms?.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            if (filterTab === 'gps') return !!c.has_gps;
            if (filterTab === 'sold') return (c.status || '').toLowerCase().includes('xuất');
            if (filterTab === 'updated') return !(c.status || '').toLowerCase().includes('xuất');
            return true;
        });
    }, [cars, searchTerm, filterTab]);

    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <div className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 ${
                isNight 
                    ? 'bg-slate-900 border-slate-700/80 text-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]' 
                    : 'bg-white border-slate-200 text-slate-900 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.25)]'
            }`}>
                
                {/* Header Strip with Glowing Radar Animation */}
                <div className={`px-6 py-4 border-b flex items-center justify-between relative overflow-hidden ${
                    isNight ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-slate-50/80'
                }`}>
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"></div>

                    <div className="flex items-center gap-3.5 z-10">
                        <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
                            <i className="fas fa-satellite-dish text-lg animate-pulse"></i>
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                                    Kết Quả Quét VinFast DMS Radar
                                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                        {summary.dealer || 'VinFast'}
                                    </span>
                                </h2>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Đồng bộ trực tiếp OData: Số máy, Mã DMS, Mã phiên bản chuẩn & GPS Live
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Đóng"
                    >
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                {/* KPI Metrics Dashboard Grid */}
                <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    {/* Metric 1 */}
                    <div className={`p-3.5 rounded-2xl border transition-all ${
                        isNight ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80'
                    }`}>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                            <span>Tổng xe quét</span>
                            <i className="fas fa-boxes-stacked text-slate-400"></i>
                        </div>
                        <div className="text-2xl font-black font-mono tracking-tight text-slate-800 dark:text-slate-100">
                            {summary.total_stock}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Xe trong kho hiện hành</div>
                    </div>

                    {/* Metric 2 */}
                    <div className={`p-3.5 rounded-2xl border transition-all ${
                        isNight ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50/60 border-emerald-200/80'
                    }`}>
                        <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">
                            <span>Cập nhật vào kho</span>
                            <i className="fas fa-check-double text-emerald-500"></i>
                        </div>
                        <div className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                            {summary.updated_count}
                        </div>
                        <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Mã PB, Số máy, Mã DMS</div>
                    </div>

                    {/* Metric 3 */}
                    <div className={`p-3.5 rounded-2xl border transition-all ${
                        isNight ? 'bg-cyan-950/20 border-cyan-800/40' : 'bg-cyan-50/60 border-cyan-200/80'
                    }`}>
                        <div className="flex items-center justify-between text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-1">
                            <span>Tọa độ GPS Live</span>
                            <i className="fas fa-location-crosshairs text-cyan-500"></i>
                        </div>
                        <div className="text-2xl font-black font-mono tracking-tight text-cyan-600 dark:text-cyan-400">
                            {summary.gps_count}
                        </div>
                        <div className="text-[10px] text-cyan-600/70 dark:text-cyan-400/70 mt-0.5">Định vị radar bản đồ</div>
                    </div>

                    {/* Metric 4 */}
                    <div className={`p-3.5 rounded-2xl border transition-all ${
                        isNight ? 'bg-amber-950/20 border-amber-800/40' : 'bg-amber-50/60 border-amber-200/80'
                    }`}>
                        <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
                            <span>Xe đã xuất HĐ</span>
                            <i className="fas fa-receipt text-amber-500"></i>
                        </div>
                        <div className="text-2xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
                            {summary.sold_removed}
                        </div>
                        <div className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">Tự động gỡ khỏi kho</div>
                    </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-72">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Lọc VIN, phiên bản, số máy..."
                            className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border outline-none font-medium transition-all ${
                                isNight 
                                    ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-cyan-500 placeholder:text-slate-500' 
                                    : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 placeholder:text-slate-400'
                            }`}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                            >
                                <i className="fas fa-times-circle"></i>
                            </button>
                        )}
                    </div>

                    {/* Filter Segmented Control */}
                    <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setFilterTab('all')}
                            className={`px-3 py-1 text-xs rounded-xl font-bold transition-all ${
                                filterTab === 'all'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            Tất cả ({cars.length})
                        </button>
                        <button
                            onClick={() => setFilterTab('gps')}
                            className={`px-3 py-1 text-xs rounded-xl font-bold transition-all ${
                                filterTab === 'gps'
                                    ? 'bg-cyan-600 text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            🛰️ Có GPS ({cars.filter(c => c.has_gps).length})
                        </button>
                        <button
                            onClick={() => setFilterTab('updated')}
                            className={`px-3 py-1 text-xs rounded-xl font-bold transition-all ${
                                filterTab === 'updated'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            ✅ Đã cập nhật ({cars.filter(c => !(c.status || '').toLowerCase().includes('xuất')).length})
                        </button>
                        {summary.sold_removed > 0 && (
                            <button
                                onClick={() => setFilterTab('sold')}
                                className={`px-3 py-1 text-xs rounded-xl font-bold transition-all ${
                                    filterTab === 'sold'
                                        ? 'bg-amber-600 text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                🏷️ Đã XHĐ ({summary.sold_removed})
                            </button>
                        )}
                    </div>
                </div>

                {/* Cars Table Section */}
                <div className="flex-1 overflow-y-auto max-h-[46vh] p-4">
                    {filteredCars.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">
                            <i className="fas fa-inbox text-3xl mb-2 opacity-50 block"></i>
                            Không tìm thấy xe nào khớp với bộ lọc.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                                        isNight ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
                                    }`}>
                                        <th className="py-2.5 px-3">Số VIN</th>
                                        <th className="py-2.5 px-3">Dòng xe & Phiên bản</th>
                                        <th className="py-2.5 px-3">Mã PB DMS</th>
                                        <th className="py-2.5 px-3">Số máy</th>
                                        <th className="py-2.5 px-3">Mã DMS</th>
                                        <th className="py-2.5 px-3 text-center">GPS</th>
                                        <th className="py-2.5 px-3 text-right">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredCars.map((car, idx) => {
                                        const isSold = (car.status || '').toLowerCase().includes('xuất');
                                        return (
                                            <tr 
                                                key={car.vin || idx} 
                                                className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                                                    isSold ? 'opacity-60 bg-amber-50/20' : ''
                                                }`}
                                            >
                                                {/* VIN */}
                                                <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{car.vin}</span>
                                                        <button 
                                                            onClick={() => handleCopy(car.vin)}
                                                            className="text-slate-400 hover:text-blue-500 text-[10px] p-0.5"
                                                            title="Sao chép VIN"
                                                        >
                                                            <i className={`fas ${copiedVin === car.vin ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i>
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Dòng xe & Phiên bản */}
                                                <td className="py-2 px-3 whitespace-nowrap">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200">{car.dong_xe || '—'}</div>
                                                    <div className="text-[11px] text-slate-400 font-medium">{car.phien_ban || '—'}</div>
                                                </td>

                                                {/* Mã Phiên Bản DMS */}
                                                <td className="py-2 px-3 whitespace-nowrap">
                                                    {car.ma_phien_ban && car.ma_phien_ban !== '(chưa rõ)' ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-black text-[11px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 shadow-xs">
                                                            <i className="fas fa-tag text-[9px]"></i>
                                                            {car.ma_phien_ban}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-[11px]">—</span>
                                                    )}
                                                </td>

                                                {/* Số Máy */}
                                                <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                    {car.so_may && car.so_may !== '(trống)' ? (
                                                        <span>{car.so_may}</span>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-[11px]">—</span>
                                                    )}
                                                </td>

                                                {/* Mã DMS Showroom */}
                                                <td className="py-2 px-3 whitespace-nowrap">
                                                    {car.ma_dms && car.ma_dms !== '(trống)' ? (
                                                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                                                            {car.ma_dms}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-[11px]">—</span>
                                                    )}
                                                </td>

                                                {/* GPS */}
                                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                                    {car.has_gps ? (
                                                        <span 
                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60"
                                                            title={car.lat && car.lng ? `${car.lat}, ${car.lng}` : 'Có tọa độ'}
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping"></span>
                                                            Live
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-slate-600 text-[10px]">Chưa có</span>
                                                    )}
                                                </td>

                                                {/* Trạng thái */}
                                                <td className="py-2 px-3 text-right whitespace-nowrap">
                                                    {isSold ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                                                            <i className="fas fa-times-circle text-[9px]"></i>
                                                            Đã XHĐ
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                                                            <i className="fas fa-check-circle text-[9px]"></i>
                                                            Khớp chuẩn
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Strip */}
                <div className={`px-6 py-3.5 border-t flex items-center justify-between gap-3 ${
                    isNight ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-slate-50'
                }`}>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <i className="fas fa-clock text-slate-400"></i>
                        Quét lúc: <span className="font-mono font-medium">{new Date(summary.timestamp || Date.now()).toLocaleTimeString('vi-VN')}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {onRefreshStock && (
                            <button
                                onClick={() => {
                                    onRefreshStock();
                                    onClose();
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 active:scale-95"
                            >
                                <i className="fas fa-rotate"></i>
                                Cập nhật lại danh sách kho
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                                isNight 
                                    ? 'border-slate-700 hover:bg-slate-800 text-slate-300' 
                                    : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                            }`}
                        >
                            Đóng
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DmsRadarResultModal;
