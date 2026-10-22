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
    const [filterTab, setFilterTab] = useState<'all' | 'gps' | 'sold'>('all');
    const [copiedVin, setCopiedVin] = useState<string | null>(null);

    const summary = data?.summary || {
        total_stock: 0,
        updated_count: 0,
        gps_count: 0,
        sold_removed: 0,
        dealer: 'VinFast',
        timestamp: new Date().toISOString()
    };

    const cars = data?.cars || [];

    const handleCopy = (vin: string) => {
        navigator.clipboard.writeText(vin);
        setCopiedVin(vin);
        setTimeout(() => setCopiedVin(null), 1500);
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
            return true;
        });
    }, [cars, searchTerm, filterTab]);

    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className={`relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border shadow-xl overflow-hidden transition-all ${
                isNight 
                    ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-2xl' 
                    : 'bg-white border-slate-200 text-slate-900'
            }`}>
                
                {/* Header Tối Giản */}
                <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
                    isNight ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-semibold shadow-xs">
                            <i className="fas fa-satellite-dish"></i>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold tracking-tight text-black">
                                    Kết Quả Đồng Bộ DMS
                                </h2>
                                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                                    {summary.dealer || 'DMS'}
                                </span>
                            </div>
                            {/* Stats tóm tắt 1 dòng chữ đen rõ nét */}
                            <div className="text-xs text-slate-700 mt-1 flex items-center gap-2 font-medium">
                                <span>Tổng quét: <strong className="text-black font-bold">{summary.total_stock}</strong> xe</span>
                                <span className="text-slate-400">•</span>
                                <span>Đã khớp: <strong className="text-emerald-700 font-bold">{summary.updated_count}</strong></span>
                                <span className="text-slate-400">•</span>
                                <span>GPS Live: <strong className="text-blue-700 font-bold">{summary.gps_count}</strong></span>
                                {summary.sold_removed > 0 && (
                                    <>
                                        <span className="text-slate-400">•</span>
                                        <span className="text-amber-700">Đã XHĐ: <strong className="font-bold">{summary.sold_removed}</strong></span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-black hover:bg-slate-100 transition-colors"
                        title="Đóng"
                    >
                        <i className="fas fa-times text-xs"></i>
                    </button>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="px-5 py-2.5 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50">
                    <div className="relative flex-1 max-w-xs">
                        <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[11px]"></i>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm số VIN, dòng xe, số máy..."
                            className="w-full pl-8 pr-7 py-1 text-xs font-medium rounded-lg border border-slate-300 bg-white text-black placeholder:text-slate-400 focus:border-blue-600 outline-none transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black text-xs"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setFilterTab('all')}
                            className={`px-3 py-1 text-xs rounded-md font-bold transition-colors ${
                                filterTab === 'all'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            Tất cả ({cars.length})
                        </button>
                        <button
                            onClick={() => setFilterTab('gps')}
                            className={`px-3 py-1 text-xs rounded-md font-bold transition-colors ${
                                filterTab === 'gps'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            Có GPS ({cars.filter(c => c.has_gps).length})
                        </button>
                        {summary.sold_removed > 0 && (
                            <button
                                onClick={() => setFilterTab('sold')}
                                className={`px-3 py-1 text-xs rounded-md font-bold transition-colors ${
                                    filterTab === 'sold'
                                        ? 'bg-amber-600 text-white'
                                        : 'text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                Đã XHĐ ({summary.sold_removed})
                            </button>
                        )}
                    </div>
                </div>

                {/* Bảng Dữ Liệu Rõ Ràng & Đơn Giản */}
                <div className="flex-1 overflow-y-auto max-h-[52vh]">
                    {filteredCars.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">
                            Không có xe nào phù hợp với tìm kiếm.
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 bg-slate-100/90 border-slate-200 text-slate-800">
                                    <th className="py-2.5 px-4 font-bold text-slate-900">Số VIN</th>
                                    <th className="py-2.5 px-3 font-bold text-slate-900">Dòng xe & Phiên bản</th>
                                    <th className="py-2.5 px-3 font-bold text-slate-900">Mã PB</th>
                                    <th className="py-2.5 px-3 font-bold text-slate-900">Số máy</th>
                                    <th className="py-2.5 px-3 font-bold text-slate-900">Mã DMS</th>
                                    <th className="py-2.5 px-4 font-bold text-slate-900 text-right">Định vị</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredCars.map((car, idx) => {
                                    const isSold = (car.status || '').toLowerCase().includes('xuất');
                                    return (
                                        <tr 
                                            key={car.vin || idx} 
                                            className={`hover:bg-slate-50 transition-colors ${
                                                isSold ? 'opacity-50 bg-amber-50/30' : ''
                                            }`}
                                        >
                                            {/* VIN - Chữ màu đen đậm sắc nét */}
                                            <td className="py-2.5 px-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-black text-xs tracking-tight">
                                                        {car.vin}
                                                    </span>
                                                    <button 
                                                        onClick={() => handleCopy(car.vin)}
                                                        className="text-slate-400 hover:text-black text-xs p-0.5 transition-colors"
                                                        title="Sao chép VIN"
                                                    >
                                                        <i className={`fas ${copiedVin === car.vin ? 'fa-check text-emerald-600 font-bold' : 'fa-copy'}`}></i>
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Tên xe & phiên bản - Chữ màu đen */}
                                            <td className="py-2.5 px-3 whitespace-nowrap">
                                                <span className="font-bold text-black text-xs">
                                                    {car.dong_xe || '—'}
                                                </span>
                                                {car.phien_ban && (
                                                    <span className="text-slate-700 text-xs ml-1.5 font-medium">
                                                        {car.phien_ban}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Mã PB DMS */}
                                            <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs">
                                                {car.ma_phien_ban && car.ma_phien_ban !== '(chưa rõ)' ? (
                                                    <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded shadow-xs">
                                                        {car.ma_phien_ban}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 font-medium">—</span>
                                                )}
                                            </td>

                                            {/* Số máy - Chữ màu đen rõ ràng */}
                                            <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs font-semibold text-black">
                                                {car.so_may && car.so_may !== '(trống)' ? car.so_may : (
                                                    <span className="text-slate-400 font-normal">—</span>
                                                )}
                                            </td>

                                            {/* Mã DMS Showroom - Chữ màu đen đậm */}
                                            <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs font-bold text-slate-800">
                                                {car.ma_dms || '—'}
                                            </td>

                                            {/* GPS Định vị */}
                                            <td className="py-2.5 px-4 whitespace-nowrap text-right">
                                                {car.has_gps ? (
                                                    <span 
                                                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-700"
                                                        title={car.lat && car.lng ? `${car.lat}, ${car.lng}` : 'Có tọa độ'}
                                                    >
                                                        <i className="fas fa-location-dot text-[11px]"></i>
                                                        GPS Live
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 font-bold">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer Gọn Nhẹ */}
                <div className={`px-5 py-2.5 border-t flex items-center justify-between text-xs ${
                    isNight ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'
                }`}>
                    <span className="text-xs text-slate-600 font-medium">
                        Cập nhật: {new Date(summary.timestamp || Date.now()).toLocaleTimeString('vi-VN')}
                    </span>

                    <div className="flex items-center gap-2">
                        {onRefreshStock && (
                            <button
                                onClick={() => {
                                    onRefreshStock();
                                    onClose();
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                            >
                                <i className="fas fa-rotate mr-1.5 text-[10px]"></i>
                                Tải lại trang kho
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold border border-slate-300 text-slate-800 hover:bg-slate-100 transition-colors"
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

