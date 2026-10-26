import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ChevronLeft,
  Search,
  X,
  Car,
  SlidersHorizontal,
  RotateCw,
  Copy,
  MapPin,
  Lock,
  Unlock,
  Clock,
  Plus,
  ArrowLeftRight,
  Navigation,
} from 'lucide-react';
import moment from 'moment';
import { StockVehicle, Order } from '../../types';
import { getExteriorSwatchColor, getCarImage } from '../../utils/styleUtils';
import { formatShortWarehouseName } from '../../utils/stringUtils';
import { getQuickLocationName } from '../../utils/geocodeUtils';
import { SwapCarModal } from '../modals/SwapCarModal';

interface MobileStockViewProps {
  stockData: StockVehicle[];
  queuedVins?: string[];
  isLoading?: boolean;
  error?: string | null;
  refetchStock: (isSilent?: boolean) => void;
  highlightedVins?: Set<string>;
  showToast?: (
    title: string,
    message: string,
    type: 'success' | 'error' | 'loading' | 'warning' | 'info',
    duration?: number
  ) => void;
  currentUser?: string;
  currentUserName?: string;
  userRole?: string;
  isAdmin?: boolean;
  canHoldMore?: boolean;
  onCreateRequestForVehicle: (vehicle: StockVehicle) => void;
  renderCreateRequestForm?: (
    vehicle: StockVehicle,
    onCompleted: () => void
  ) => React.ReactNode;
  onHoldCar: (vin: string) => void;
  onReleaseCar: (vin: string) => void;
  onJoinQueue: (vin: string) => void;
  onLeaveQueue: (vin: string) => void;
  onOpenExtensionModal?: (vehicle: StockVehicle) => void;
  processingVin?: string | null;
  allOrders?: Order[];
  forcedSearch?: string;
  isReferenceAccount?: boolean;
  onBack: () => void;
}

const isTransitLocation = (location?: string): boolean => {
  const normalized = String(location || '').trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes('vận tải') ||
    normalized.includes('hải phòng')
  );
};

const getVehicleLocationLabel = (vehicle: StockVehicle): string => {
  const warehouseName = formatShortWarehouseName(vehicle['Vị trí'] || '');
  const telemetry = vehicle.telemetry;

  if (!isTransitLocation(vehicle['Vị trí']) || !telemetry?.lat || !telemetry?.lng) {
    if (vehicle.isResolvedFromSatellite) {
      return `${warehouseName} (Thực tế: ${vehicle.realWarehouseName || 'Bãi ngoài'})`;
    }
    return warehouseName;
  }

  return (
    telemetry.address?.trim() ||
    getQuickLocationName(telemetry.lat, telemetry.lng) ||
    warehouseName ||
    'Đang vận tải'
  );
};

const getVehicleDisplayName = (vehicle: StockVehicle): string => {
  const model = (vehicle['Dòng xe'] || '').trim();
  const trim = (vehicle['Phiên bản'] || '').trim();
  if (!trim || trim.toLowerCase() === model.toLowerCase()) return model;
  return trim.toLowerCase().startsWith(model.toLowerCase()) ? trim : `${model} ${trim}`;
};

const STOCK_DATE_FORMATS = [
  'DD/MM/YYYY HH:mm:ss',
  'D/M/YYYY H:m:s',
  'DD/MM/YYYY HH:mm',
  'D/M/YYYY H:m',
  'YYYY-MM-DD HH:mm:ss',
  moment.ISO_8601,
];

const formatHoldExpiry = (value?: string): string => {
  const rawValue = String(value || '').trim();
  if (!rawValue) return '';
  if (rawValue.toLowerCase() === 'vô thời hạn') return 'Vô thời hạn';

  const parsed = moment(rawValue, STOCK_DATE_FORMATS);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm') : '';
};

const isHoldNearExpiry = (value?: string, now = Date.now()): boolean => {
  const rawValue = String(value || '').trim();
  if (!rawValue || rawValue.toLowerCase() === 'vô thời hạn') return false;

  const expiry = moment(rawValue, STOCK_DATE_FORMATS);
  if (!expiry.isValid()) return false;

  const remainingMinutes = expiry.diff(moment(now), 'minutes');
  return remainingMinutes > 0 && remainingMinutes <= 20;
};

// Huy hiệu kính mờ hologram đồng bộ 1-1 với tab Đơn hàng.
const MobileStatusBadge: React.FC<{
  meta: {
    label: string;
    key: string;
    holoFrom: string;
    holoVia: string;
    holoTo: string;
    textColor: string;
    glowShadow: string;
    [key: string]: any;
  };
}> = React.memo(({ meta }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center h-[19px] px-2.5 rounded-full overflow-hidden flex-shrink-0 select-none backdrop-blur-md transition-all ${meta.glowShadow || 'shadow-xs'}`}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`stock-holo-bg-${meta.key}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.88" />
            <stop offset="35%" stopColor={meta.holoFrom} stopOpacity="0.32" />
            <stop offset="70%" stopColor={meta.holoVia} stopOpacity="0.25" />
            <stop offset="100%" stopColor={meta.holoTo} stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id={`stock-holo-rim-${meta.key}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="30%" stopColor={meta.holoFrom} stopOpacity="0.75" />
            <stop offset="65%" stopColor={meta.holoVia} stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={`stock-holo-ray-${meta.key}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" rx="9.5" fill={`url(#stock-holo-bg-${meta.key})`} />
        <polygon points="6,0 18,0 12,19 0,19" fill={`url(#stock-holo-ray-${meta.key})`} opacity="0.8" />
        <rect
          width="100%"
          height="100%"
          rx="9.5"
          fill="none"
          stroke={`url(#stock-holo-rim-${meta.key})`}
          strokeWidth="1"
        />
      </svg>
      <span
        className={`relative z-10 text-[9px] font-extrabold tracking-tight ${meta.textColor}`}
        style={{ textShadow: '0 0.5px 1px rgba(255,255,255,0.9)' }}
      >
        {meta.label}
      </span>
    </div>
  );
});

export const MobileStockView: React.FC<MobileStockViewProps> = ({
  stockData = [],
  queuedVins = [],
  isLoading = false,
  error: _error,
  refetchStock,
  highlightedVins: _highlightedVins,
  showToast,
  currentUser = '',
  currentUserName: _currentUserName = '',
  userRole: _userRole = '',
  isAdmin = false,
  canHoldMore = true,
  onCreateRequestForVehicle,
  renderCreateRequestForm,
  onHoldCar,
  onReleaseCar,
  onJoinQueue,
  onLeaveQueue,
  onOpenExtensionModal,
  allOrders = [],
  forcedSearch = '',
  isReferenceAccount = false,
  onBack,
}) => {
  const [searchTerm, setSearchTerm] = useState(forcedSearch || '');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [activeDetailVehicle, setActiveDetailVehicle] = useState<StockVehicle | null>(null);
  const [detailSheetView, setDetailSheetView] = useState<'detail' | 'create-request'>('detail');
  const [selectedSwapVehicle, setSelectedSwapVehicle] = useState<StockVehicle | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [holdClock, setHoldClock] = useState(() => Date.now());

  // Danh sách đơn hàng đang hoạt động của TVBH hiện tại
  const userOrders = useMemo(() => {
    return (allOrders || []).filter((o: any) => {
      const tvbhName = (
        o['Tên tư vấn bán hàng'] ||
        o['Tên TVBH'] ||
        o.ten_tu_van_ban_hang ||
        ''
      )
        .toString()
        .trim()
        .toLowerCase();
      return (
        tvbhName === (currentUser || '').trim().toLowerCase() ||
        tvbhName === (_currentUserName || '').trim().toLowerCase()
      );
    });
  }, [allOrders, currentUser, _currentUserName]);

  // Kiểm tra điều kiện đổi xe cùng cấu hình 1-1
  const canSwapVehicle = useCallback(
    (vehicle: StockVehicle) => {
      if (!userOrders || userOrders.length === 0) return false;
      const holder = (vehicle['Người Giữ Xe'] || '').toString().trim();
      if (!holder || holder.toLowerCase() === (currentUser || '').toLowerCase()) return false;

      const carStatus = (vehicle['Trạng thái'] || '').toString().trim();
      if (carStatus !== 'Đã ghép' && carStatus !== 'Đang giữ') return false;

      const tModel = (vehicle['Dòng xe'] || '').trim().toLowerCase();
      const tVer = (vehicle['Phiên bản'] || '').trim().toLowerCase();
      const tExt = (vehicle['Ngoại thất'] || '').trim().toLowerCase();
      const tInt = (vehicle['Nội thất'] || '').trim().toLowerCase();

      return userOrders.some((o: any) => {
        const oStatus = (o['Kết quả'] || '').toLowerCase();
        if (oStatus.includes('đã xuất hóa đơn') || oStatus.includes('hủy')) return false;

        const oModel = (o['Dòng xe'] || '').trim().toLowerCase();
        const oVer = (o['Phiên bản'] || '').trim().toLowerCase();
        const oExt = (o['Ngoại thất'] || '').trim().toLowerCase();
        const oInt = (o['Nội thất'] || '').trim().toLowerCase();

        return oModel === tModel && oVer === tVer && oExt === tExt && oInt === tInt;
      });
    },
    [userOrders, currentUser]
  );

  // Sync forced search
  useEffect(() => {
    if (forcedSearch) {
      setSearchTerm(forcedSearch);
    }
  }, [forcedSearch]);

  useEffect(() => {
    if (!activeDetailVehicle) return;

    setHoldClock(Date.now());
    const timer = window.setInterval(() => setHoldClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [activeDetailVehicle]);

  // Refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refetchStock(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast?.('Đã làm mới', 'Dữ liệu kho xe đã được đồng bộ mới nhất.', 'info');
    }, 800);
  }, [refetchStock, showToast]);

  // Sao chép mã nhận diện trong phần chi tiết
  const handleCopyVin = useCallback(
    (vin: string, e?: React.SyntheticEvent, label = 'Số VIN') => {
      e?.stopPropagation();
      try {
        navigator.clipboard.writeText(vin);
      } catch {
        /* fallback */
      }
      showToast?.('Đã sao chép', `${label}: ${vin}`, 'success', 1500);
    },
    [showToast]
  );

  // Chuẩn hóa trạng thái kho xe: Đã ghép, Chưa ghép, hoặc Đang giữ (Đồng bộ 100% với TAB Đơn hàng)
  const getVehicleStatusMeta = useCallback(
    (vehicle: StockVehicle) => {
      const rawStatus = (vehicle['Trạng thái'] || '').trim();
      const holder = (vehicle['Người Giữ Xe'] || '').trim();
      const isMine = holder.toLowerCase().normalize('NFC') === (currentUser || '').trim().toLowerCase().normalize('NFC');
      const isHeld = rawStatus === 'Đang giữ';
      const isMyHold = isHeld && isMine;
      const isPaired = rawStatus === 'Đã ghép';

      if (isMyHold) {
        return {
          label: 'Tôi đang giữ',
          key: 'my_hold',
          holoFrom: '#818cf8',
          holoVia: '#38bdf8',
          holoTo: '#a78bfa',
          textColor: 'text-indigo-950',
          glowShadow: 'shadow-[0_2px_8px_rgba(129,140,248,0.25)]',
        };
      }

      if (isHeld) {
        return {
          label: 'Đang giữ',
          key: 'held',
          holoFrom: '#fbbf24',
          holoVia: '#fb923c',
          holoTo: '#f472b6',
          textColor: 'text-amber-950',
          glowShadow: 'shadow-[0_2px_8px_rgba(251,191,36,0.22)]',
        };
      }

      if (isPaired) {
        return {
          label: 'Đã ghép',
          key: 'paired',
          holoFrom: '#38bdf8',
          holoVia: '#818cf8',
          holoTo: '#a78bfa',
          textColor: 'text-sky-950',
          glowShadow: 'shadow-[0_2px_8px_rgba(56,189,248,0.25)]',
        };
      }

      // Mặc định hoặc 'Chưa ghép' (Đồng bộ màu sắc & hiệu ứng 1-1 với TAB Đơn hàng)
      return {
        label: 'Chưa ghép',
        key: 'unpaired',
        holoFrom: '#fbbf24',
        holoVia: '#fb923c',
        holoTo: '#f472b6',
        textColor: 'text-amber-950',
        glowShadow: 'shadow-[0_2px_8px_rgba(251,191,36,0.22)]',
      };
    },
    [currentUser]
  );

  // Danh sách dòng xe độc nhất
  const modelTabs = useMemo(() => {
    const map = new Map<string, number>();
    stockData.forEach((v) => {
      const model = (v['Dòng xe'] || 'Khác').trim();
      if (model) {
        map.set(model, (map.get(model) || 0) + 1);
      }
    });

    const list = Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return [{ name: 'all', label: 'Tất cả', count: stockData.length }, ...list.map((l) => ({ name: l.name, label: l.name, count: l.count }))];
  }, [stockData]);

  // Danh sách kho bãi độc nhất
  const warehouseOptions = useMemo(() => {
    const map = new Map<string, number>();
    stockData.forEach((v) => {
      const rawLoc = v['Vị trí'] || 'Chưa định vị';
      const shortLoc = formatShortWarehouseName(rawLoc);
      map.set(shortLoc, (map.get(shortLoc) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [stockData]);

  // Bộ đếm theo nhóm trạng thái: Chưa ghép, Đang giữ, Đã ghép
  const statusCounts = useMemo(() => {
    let unpaired = 0;
    let paired = 0;
    let held = 0;
    let myHold = 0;

    stockData.forEach((v) => {
      const rawStatus = (v['Trạng thái'] || '').trim();
      const holder = (v['Người Giữ Xe'] || '').trim();
      const isMine = holder.toLowerCase().normalize('NFC') === (currentUser || '').trim().toLowerCase().normalize('NFC');

      if (rawStatus === 'Đang giữ') {
        held++;
        if (isMine) myHold++;
      } else if (rawStatus === 'Đã ghép') {
        paired++;
      } else {
        unpaired++;
      }
    });

    return {
      all: stockData.length,
      unpaired,
      paired,
      held,
      myHold,
      available: unpaired,
    };
  }, [stockData, currentUser]);

  // Lọc dữ liệu kho xe
  const filteredVehicles = useMemo(() => {
    return stockData.filter((v) => {
      // 1. Tìm kiếm từ khóa (VIN, Dòng xe, Phiên bản, Màu, Kho)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const vin = (v.VIN || '').toLowerCase();
        const model = (v['Dòng xe'] || '').toLowerCase();
        const trim = (v['Phiên bản'] || '').toLowerCase();
        const ext = (v['Ngoại thất'] || '').toLowerCase();
        const loc = (v['Vị trí'] || '').toLowerCase();
        const holder = (v['Người Giữ Xe'] || '').toLowerCase();
        const dms = (v['Mã DMS'] || '').toLowerCase();

        const match =
          vin.includes(q) ||
          model.includes(q) ||
          trim.includes(q) ||
          ext.includes(q) ||
          loc.includes(q) ||
          holder.includes(q) ||
          dms.includes(q);

        if (!match) return false;
      }

      // 2. Lọc Dòng xe
      if (selectedModel !== 'all') {
        const model = (v['Dòng xe'] || '').trim().toLowerCase();
        if (model !== selectedModel.toLowerCase()) return false;
      }

      // 3. Lọc Trạng thái: Chưa ghép | Đang giữ | Đã ghép | Tôi đang giữ
      if (selectedStatus !== 'all') {
        const rawStatus = (v['Trạng thái'] || '').trim();
        const holder = (v['Người Giữ Xe'] || '').trim();
        const isMyHold = holder.toLowerCase().normalize('NFC') === (currentUser || '').trim().toLowerCase().normalize('NFC');

        if (selectedStatus === 'unpaired' || selectedStatus === 'available') {
          if (rawStatus === 'Đang giữ' || rawStatus === 'Đã ghép') return false;
        } else if (selectedStatus === 'held') {
          if (rawStatus !== 'Đang giữ') return false;
        } else if (selectedStatus === 'paired') {
          if (rawStatus !== 'Đã ghép') return false;
        } else if (selectedStatus === 'my_hold') {
          if (!isMyHold || rawStatus !== 'Đang giữ') return false;
        }
      }

      // 4. Lọc Kho bãi
      if (selectedWarehouse !== 'all') {
        const shortLoc = formatShortWarehouseName(v['Vị trí'] || '');
        if (shortLoc !== selectedWarehouse) return false;
      }

      return true;
    });
  }, [stockData, searchTerm, selectedModel, selectedStatus, selectedWarehouse, currentUser]);

  // Đếm số lượng bộ lọc đang áp dụng
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedModel !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    if (selectedWarehouse !== 'all') count++;
    return count;
  }, [selectedModel, selectedStatus, selectedWarehouse]);

  const handleResetFilters = useCallback(() => {
    setSelectedModel('all');
    setSelectedStatus('all');
    setSelectedWarehouse('all');
    setSearchTerm('');
  }, []);

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
      }}
      className="fixed inset-0 h-[100dvh] w-full bg-[#f2f2f7] text-slate-800 flex flex-col z-50 overflow-hidden select-none"
    >
      {/* ========================================================================= */}
      {/* 🍏 1. APPLE NAVIGATION BAR TRONG SUỐT (FROSTED GLASS IOS HEADER) */}
      {/* ========================================================================= */}
      <header className="w-full bg-white/85 backdrop-blur-xl border-b border-black/[0.08] px-3.5 pt-2 pb-2.5 flex-shrink-0 z-30 shadow-2xs">
        <div className="flex items-center justify-between">
          {/* Back button sang Bàn điều khiển */}
          <div className="w-20 flex justify-start">
            <button
              onClick={onBack}
              className="flex items-center space-x-0.5 text-slate-700 hover:text-slate-900 active:scale-95 transition-all text-[13px] font-semibold py-1 px-1.5 -ml-1 rounded-lg hover:bg-black/[0.04]"
            >
              <ChevronLeft size={17} strokeWidth={2.4} className="-mr-0.5 text-slate-600" />
              <span>Back</span>
            </button>
          </div>

          {/* Tiêu đề mục căn giữa chuẩn xác 100% */}
          <h1 className="text-xs font-bold uppercase tracking-wider text-slate-700 text-center flex-1">
            KHO XE
          </h1>

          {/* Nút làm mới danh sách */}
          <div className="w-20 flex justify-end">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Làm mới dữ liệu"
              className="w-8 h-8 rounded-full bg-slate-100/90 text-slate-600 hover:text-blue-600 flex items-center justify-center active:scale-90 transition-all"
            >
              <RotateCw size={15} strokeWidth={2.2} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 📋 2. DANH SÁCH XE TRONG KHO (SMARTPHONE FEED ĐỒNG BỘ ĐƠN HÀNG) */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-y-auto px-3 pt-2.5 pb-[calc(1rem+env(safe-area-inset-bottom))] scroll-pb-24 no-scrollbar">
        {isLoading && stockData.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center px-4">
            <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-bold text-slate-700">Đang nạp tồn kho thời gian thực...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-white text-slate-400 flex items-center justify-center mb-3 shadow-xs border border-slate-200">
              <Car size={26} strokeWidth={1.8} />
            </div>
            <h3 className="text-sm font-bold text-slate-700">Không tìm thấy xe phù hợp</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Thử thay đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc.
            </p>
            {(searchTerm || activeFiltersCount > 0) && (
              <button
                onClick={handleResetFilters}
                className="mt-3.5 px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-xs active:scale-95"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200/70 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
            {filteredVehicles.map((vehicle, idx) => {
              const vin = (vehicle.VIN || '').trim();
              const carModel = (vehicle['Dòng xe'] || '').trim();
              const carTrim = (vehicle['Phiên bản'] || '').trim();
              const exterior = vehicle['Ngoại thất'] || 'Tiêu chuẩn';
              const interior = vehicle['Nội thất'] || 'Tiêu chuẩn';
              const carImgUrl = getCarImage(carModel, exterior, carTrim);
              const statusMeta = getVehicleStatusMeta(vehicle);
              const holder = (vehicle['Người Giữ Xe'] || '').trim();
              const isMine = holder.toLowerCase().normalize('NFC') === (currentUser || '').trim().toLowerCase().normalize('NFC');
              const isHeld = vehicle['Trạng thái'] === 'Đang giữ';
              const isMyHold = isHeld && isMine;
              const carDisplayName = getVehicleDisplayName(vehicle);

              return (
                <div
                  key={vin || idx}
                  onClick={() => {
                    setDetailSheetView('detail');
                    setActiveDetailVehicle(vehicle);
                  }}
                  className="flex min-h-[74px] cursor-pointer select-none items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-slate-50/80 active:bg-slate-100/70"
                >
                  {/* 1. CỘT TRÁI: ẢNH XE 3D CHUẨN HÓA */}
                  <div className="relative flex min-h-10 w-[72px] flex-shrink-0 self-stretch items-center justify-center overflow-hidden border-r border-slate-100/90 pr-2">
                    {carImgUrl ? (
                      <img
                        src={carImgUrl}
                        alt={carDisplayName}
                        className="h-10 w-full object-contain scale-[0.94] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.10)]"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                        <Car size={16} />
                      </div>
                    )}
                  </div>

                  {/* 2. CỘT GIỮA: THÔNG TIN DÒNG XE */}
                  <div className="flex min-w-0 flex-1 flex-col justify-center space-y-0.5 self-stretch border-r border-slate-100/90 pr-2">
                    {/* Dòng 1: Tên xe & Phiên bản & Màu */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="flex-shrink-0 whitespace-nowrap font-bold text-[12.5px] tracking-tight text-slate-900">
                        {carModel}
                      </span>
                      {carTrim && carTrim.toLowerCase() !== carModel.toLowerCase() && (
                        <span className="flex-shrink-0 whitespace-nowrap text-[11px] font-semibold text-slate-600">
                          {carTrim}
                        </span>
                      )}
                      <span className="text-slate-300 text-[10px]">•</span>
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full border border-white ring-1 ring-slate-300 shadow-2xs"
                        style={{ backgroundColor: getExteriorSwatchColor(exterior) }}
                        title={`${exterior} / ${interior}`}
                      />
                      <span className="min-w-0 truncate text-[10.5px] font-medium text-slate-600">
                        {exterior}
                      </span>
                    </div>

                    {/* Dòng 2: Số VIN • Vị trí kho bãi */}
                    <div className="flex items-center gap-1.5 text-[9.5px] text-slate-500 font-medium truncate">
                      {vin ? (
                        <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1 py-0.2 rounded text-[9px] flex-shrink-0">
                          {vin.slice(-8)}
                        </span>
                      ) : null}
                      <span className="text-slate-300 text-[8px]">•</span>
                      <span className="inline-flex items-center gap-0.5 truncate text-[9.5px] text-slate-500 min-w-0">
                        <MapPin size={9} className="text-emerald-600 flex-shrink-0" />
                        <span className="truncate">{getVehicleLocationLabel(vehicle)}</span>
                      </span>
                    </div>

                    {/* Người đang giữ (nếu có) */}
                    {isHeld && holder && (
                      <div className="text-[9px] text-amber-700 flex items-center gap-1 truncate pt-0.5">
                        <Lock size={8.5} className="text-amber-500 flex-shrink-0" />
                        <span>Giữ bởi:</span>
                        <span className="font-semibold uppercase text-amber-900 truncate">
                          {isMyHold ? 'Chính bạn' : holder}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 3. CỘT TRẠNG THÁI */}
                  <div className="flex w-[76px] flex-shrink-0 self-stretch items-center justify-center">
                    <MobileStatusBadge meta={statusMeta} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 🔍 3. APPLE FLOATING BOTTOM DOCK: TÌM KIẾM & BỘ LỌC TINH GỌN */}
      {/* ========================================================================= */}
      <div className="w-full bg-white/92 backdrop-blur-2xl border-t border-black/[0.08] px-3 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(0,0,0,0.06)] z-30 flex-shrink-0 space-y-1">
        {/* Dải tags bộ lọc đang áp dụng */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
              Đang lọc:
            </span>
            {selectedModel !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 flex-shrink-0">
                <span>Xe: {selectedModel}</span>
                <button
                  onClick={() => setSelectedModel('all')}
                  className="hover:text-slate-900 active:scale-90 ml-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            )}
            {selectedStatus !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 flex-shrink-0">
                <span>
                  {selectedStatus === 'unpaired' || selectedStatus === 'available'
                    ? 'Chưa ghép'
                    : selectedStatus === 'held'
                      ? 'Đang giữ'
                      : selectedStatus === 'paired'
                        ? 'Đã ghép'
                        : 'Tôi đang giữ'}
                </span>
                <button
                  onClick={() => setSelectedStatus('all')}
                  className="hover:text-slate-900 active:scale-90 ml-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            )}
            {selectedWarehouse !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 flex-shrink-0">
                <span>Kho: {selectedWarehouse}</span>
                <button
                  onClick={() => setSelectedWarehouse('all')}
                  className="hover:text-slate-900 active:scale-90 ml-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            )}
            <button
              onClick={handleResetFilters}
              className="text-[10px] font-medium text-slate-500 hover:text-slate-800 active:scale-95 px-1 py-0.5 flex-shrink-0"
            >
              Xóa tất cả
            </button>
          </div>
        )}

        {/* Thanh tìm kiếm & Nút Lọc thu nhỏ theo phong cách Apple */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search size={13} strokeWidth={2} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm số VIN, dòng xe, màu, kho..."
              className="w-full h-[34px] pl-[30px] pr-[28px] rounded-xl bg-slate-100/90 focus:bg-white text-[11.5px] text-slate-800 placeholder-slate-400 border border-slate-200/80 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200 shadow-2xs transition-all font-sans"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 active:scale-90"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsFilterSheetOpen(true)}
            className={`h-[34px] px-2.5 rounded-xl flex items-center space-x-1 font-medium text-[11px] transition-all active:scale-95 flex-shrink-0 border ${
              activeFiltersCount > 0
                ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80 border-slate-200/80 shadow-2xs'
            }`}
          >
            <SlidersHorizontal size={12} strokeWidth={2} />
            <span>Lọc</span>
            {activeFiltersCount > 0 && (
              <span className="w-3.5 h-3.5 rounded-full bg-white text-slate-700 font-bold text-[9px] flex items-center justify-center -mr-0.5">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🎛️ 4. APPLE FILTER BOTTOM SHEET (TINH GỌN CHO KHO XE) */}
      {/* ========================================================================= */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsFilterSheetOpen(false)}
          />

          <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col max-h-[58dvh] overflow-hidden">
            <div className="pt-1.5 pb-0.5 flex justify-center">
              <div className="w-7 h-1 rounded-full bg-slate-300" />
            </div>

            <div className="px-3.5 py-1.5 border-b border-black/[0.06] flex items-center justify-between flex-shrink-0">
              <div className="w-14 flex justify-start">
                {activeFiltersCount > 0 ? (
                  <button
                    onClick={handleResetFilters}
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-800 active:opacity-60 transition-opacity"
                  >
                    Đặt lại
                  </button>
                ) : (
                  <span className="w-1" />
                )}
              </div>

              <h3 className="text-[12px] font-bold text-slate-800 tracking-tight text-center flex-1">
                Bộ Lọc Kho Xe
              </h3>

              <div className="w-14 flex justify-end">
                <button
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="text-[12px] font-bold text-blue-600 hover:text-blue-700 active:opacity-60 transition-opacity"
                >
                  Xong
                </button>
              </div>
            </div>

            <div className="px-3.5 py-2.5 overflow-y-auto space-y-3 text-xs no-scrollbar flex-1">
              {/* Mục 1: Dòng xe */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
                  Dòng Xe
                </label>
                <div className="flex flex-wrap gap-1">
                  {modelTabs.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => setSelectedModel(t.name)}
                      className={`px-2 py-1 rounded-lg font-medium text-[10.5px] transition-all border ${
                        selectedModel.toLowerCase() === t.name.toLowerCase()
                          ? 'bg-slate-800 text-white font-bold border-slate-800 shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border-slate-200/60'
                      }`}
                    >
                      {t.label} ({t.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Mục 2: Trạng thái kho */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
                  Trạng Thái
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'all', label: `Tất cả (${statusCounts.all})` },
                    { id: 'unpaired', label: `Chưa ghép (${statusCounts.unpaired})` },
                    { id: 'held', label: `Đang giữ (${statusCounts.held})` },
                    { id: 'paired', label: `Đã ghép (${statusCounts.paired})` },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStatus(s.id)}
                      className={`py-1.5 px-2 rounded-lg font-medium text-[10.5px] text-center transition-all border ${
                        selectedStatus === s.id
                          ? 'bg-slate-800 text-white font-bold border-slate-800 shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border-slate-200/60'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mục 3: Kho bãi */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
                  Kho Vị Trí
                </label>
                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto no-scrollbar">
                  <button
                    onClick={() => setSelectedWarehouse('all')}
                    className={`px-2 py-0.8 rounded-lg font-medium text-[10px] transition-all border ${
                      selectedWarehouse === 'all'
                        ? 'bg-slate-800 text-white font-bold border-slate-800 shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border-slate-200/60'
                    }`}
                  >
                    Tất cả kho ({stockData.length})
                  </button>
                  {warehouseOptions.map((w) => (
                    <button
                      key={w.name}
                      onClick={() => setSelectedWarehouse(w.name)}
                      className={`px-2 py-0.8 rounded-lg font-medium text-[10px] transition-all border ${
                        selectedWarehouse === w.name
                          ? 'bg-slate-800 text-white font-bold border-slate-800 shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border-slate-200/60'
                      }`}
                    >
                      {w.name} ({w.count})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-3.5 py-2 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between flex-shrink-0">
              <span className="text-[10.5px] text-slate-500 font-medium">
                Tìm thấy <strong className="text-slate-900 font-bold">{filteredVehicles.length}</strong> xe
              </span>
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[11px] shadow-2xs active:scale-95"
              >
                Áp Dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📄 5. MODAL / BOTTOM SHEET CHI TIẾT XE KHO (IN-SHEET DETAILS) */}
      {/* ========================================================================= */}
      {activeDetailVehicle && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overscroll-none bg-black/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={() => {
            setActiveDetailVehicle(null);
            setDetailSheetView('detail');
          }}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => {
            if (detailSheetView === 'detail') e.preventDefault();
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`max-h-[calc(100dvh-8px)] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl ${
              detailSheetView === 'create-request'
                ? 'h-[calc(100dvh-8px)] touch-auto p-0'
                : 'touch-none p-4 sm:p-5'
            }`}
          >
            {detailSheetView === 'create-request' && renderCreateRequestForm ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-slate-100 bg-white px-3">
                  <button
                    type="button"
                    onClick={() => setDetailSheetView('detail')}
                    className="inline-flex h-8 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-slate-600 active:bg-slate-100"
                  >
                    <ChevronLeft size={17} />
                    <span>Back</span>
                  </button>
                  <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-800">
                    Ghép xe
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDetailVehicle(null);
                      setDetailSheetView('detail');
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:scale-90"
                    aria-label="Đóng"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  {renderCreateRequestForm(activeDetailVehicle, () => {
                    setActiveDetailVehicle(null);
                    setDetailSheetView('detail');
                  })}
                </div>
              </div>
            ) : (
              <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {getVehicleDisplayName(activeDetailVehicle)}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  VIN: {activeDetailVehicle.VIN}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetailVehicle(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center active:scale-90"
              >
                <X size={16} />
              </button>
            </div>

            {/* Ảnh render 3D to rõ */}
            {getCarImage(
              activeDetailVehicle['Dòng xe'],
              activeDetailVehicle['Ngoại thất'],
              activeDetailVehicle['Phiên bản']
            ) && (
              <div className="mt-3 flex h-[clamp(6.5rem,18dvh,9rem)] w-full items-center justify-center rounded-2xl border border-slate-200/60 bg-[radial-gradient(circle_at_50%_38%,#ffffff_0%,#f8fafc_58%,#eef2f7_100%)] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <img
                  src={getCarImage(
                    activeDetailVehicle['Dòng xe'],
                    activeDetailVehicle['Ngoại thất'],
                    activeDetailVehicle['Phiên bản']
                  )}
                  alt="VinFast"
                  className="max-h-full max-w-full object-contain filter drop-shadow-md"
                />
              </div>
            )}

            {/* Thông số chi tiết xe */}
            <div className="mt-3 space-y-2.5 text-xs">
              <div className="space-y-1.5 rounded-2xl border border-slate-200/70 bg-slate-50/65 p-3 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Màu ngoại thất:</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-slate-300"
                      style={{
                        backgroundColor: getExteriorSwatchColor(activeDetailVehicle['Ngoại thất']),
                      }}
                    />
                    {activeDetailVehicle['Ngoại thất'] || 'Tiêu chuẩn'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Màu nội thất:</span>
                  <span className="text-slate-800 font-medium">
                    {activeDetailVehicle['Nội thất'] || 'Tiêu chuẩn'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Trạng thái kho:</span>
                  <MobileStatusBadge meta={getVehicleStatusMeta(activeDetailVehicle)} />
                </div>

                {activeDetailVehicle['Trạng thái'] === 'Đang giữ' && activeDetailVehicle['Người Giữ Xe'] && (
                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                    <span className="text-slate-500 font-medium">Người giữ:</span>
                    <span className="max-w-[62%] truncate text-right font-semibold uppercase text-slate-900">
                      {activeDetailVehicle['Người Giữ Xe']}
                    </span>
                  </div>
                )}

                {activeDetailVehicle['Trạng thái'] === 'Đang giữ' &&
                  formatHoldExpiry(activeDetailVehicle['Thời Gian Hết Hạn Giữ']) && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Hạn giữ:</span>
                      <span className="font-mono font-semibold text-amber-800">
                        {formatHoldExpiry(activeDetailVehicle['Thời Gian Hết Hạn Giữ'])}
                      </span>
                    </div>
                  )}

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">
                    {isTransitLocation(activeDetailVehicle['Vị trí']) && activeDetailVehicle.telemetry?.lat
                      ? 'Vị trí hiện tại:'
                      : 'Vị trí kho xe:'}
                  </span>
                      <span className="flex max-w-[62%] items-center gap-1 text-right font-semibold text-slate-900">
                        <MapPin size={12} className="text-emerald-600" />
                        <span>{getVehicleLocationLabel(activeDetailVehicle)}</span>
                      </span>
                </div>

                {(activeDetailVehicle['Số máy'] || activeDetailVehicle.so_may) && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Số máy:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-slate-800">
                        {activeDetailVehicle['Số máy'] || activeDetailVehicle.so_may}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyVin(String(activeDetailVehicle['Số máy'] || activeDetailVehicle.so_may), undefined, 'Số máy')}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 active:scale-90"
                        title="Sao chép số máy"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                  </div>
                )}

                {(activeDetailVehicle['Mã DMS'] || activeDetailVehicle.ma_dms) && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Mã DMS:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-slate-700">
                        {activeDetailVehicle['Mã DMS'] || activeDetailVehicle.ma_dms}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyVin(String(activeDetailVehicle['Mã DMS'] || activeDetailVehicle.ma_dms), undefined, 'Mã DMS')}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 active:scale-90"
                        title="Sao chép mã DMS"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                  </div>
                )}

                {(activeDetailVehicle['Số COC'] || activeDetailVehicle.so_coc) && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Số COC:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-slate-800">
                        {activeDetailVehicle['Số COC'] || activeDetailVehicle.so_coc}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyVin(String(activeDetailVehicle['Số COC'] || activeDetailVehicle.so_coc), undefined, 'Số COC')}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 active:scale-90"
                        title="Sao chép số COC"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                  </div>
                )}

                {activeDetailVehicle['Ngày vận tải'] &&
                  activeDetailVehicle['Ngày vận tải'] !== '#N/A' &&
                  moment(activeDetailVehicle['Ngày vận tải']).isValid() && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Ngày vận tải:</span>
                      <span className="font-mono text-slate-700">
                        {moment(activeDetailVehicle['Ngày vận tải']).format('DD/MM/YYYY')}
                      </span>
                    </div>
                  )}

                {activeDetailVehicle['Ghi chú dms'] &&
                  activeDetailVehicle['Ghi chú dms'] !== '#N/A' &&
                  String(activeDetailVehicle['Ghi chú dms']).trim() !== '' && (
                    <div className="flex items-start justify-between gap-3 border-t border-slate-200/60 pt-2">
                      <span className="flex-shrink-0 text-slate-500 font-medium">Ghi chú:</span>
                      <span className="text-right text-slate-700">
                        {activeDetailVehicle['Ghi chú dms']}
                      </span>
                    </div>
                  )}

                {isTransitLocation(activeDetailVehicle['Vị trí']) &&
                  activeDetailVehicle.telemetry?.lat &&
                  activeDetailVehicle.telemetry?.lng && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">Bản đồ:</span>
                    <a
                      href={`https://www.google.com/maps?q=${activeDetailVehicle.telemetry.lat},${activeDetailVehicle.telemetry.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10.5px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200/80 active:scale-95"
                    >
                      <Navigation size={11} />
                      <span>Mở bản đồ</span>
                    </a>
                  </div>
                )}

              </div>

              {/* Tác nghiệp chi tiết chuẩn nghiệp vụ Showroom: BẢO TOÀN QUY TẮC KHÔNG GHÉP ĐƠN KHI CHƯA GIỮ */}
              <div className="space-y-2 pt-1">
                {isReferenceAccount ? null : (() => {
                  const detailVin = (activeDetailVehicle.VIN || '').trim();
                  const isDetailMine = (activeDetailVehicle['Người Giữ Xe'] || '').trim().toLowerCase().normalize('NFC') === (currentUser || '').trim().toLowerCase().normalize('NFC');
                  const isDetailHeld = activeDetailVehicle['Trạng thái'] === 'Đang giữ';
                  const isDetailMyHold = isDetailHeld && isDetailMine;
                  const isDetailAvailable = activeDetailVehicle['Trạng thái'] === 'Chưa ghép' || (!isDetailHeld && activeDetailVehicle['Trạng thái'] !== 'Đã ghép');
                  const isDetailQueued = queuedVins.some((v) => v?.toUpperCase() === detailVin.toUpperCase());

                  if (isDetailAvailable) {
                    return (
                      <div>
                        {canHoldMore ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDetailVehicle(null);
                              onHoldCar(detailVin);
                            }}
                            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-800 text-[12px] font-semibold tracking-tight text-white transition-all active:scale-[0.98] active:bg-slate-900"
                            title="Giữ xe trong 24 giờ"
                          >
                            <Lock size={13} strokeWidth={2.4} />
                            <span>Giữ</span>
                          </button>
                        ) : (
                          <div className="flex h-9 w-full items-center justify-center rounded-xl border border-slate-200/60 bg-slate-100 text-xs font-medium text-slate-400">
                            Hết lượt giữ xe
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (isDetailMyHold) {
                    return (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDetailVehicle(null);
                              onReleaseCar(detailVin);
                            }}
                            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-[12px] font-medium tracking-tight text-slate-600 transition-all active:scale-[0.96] active:bg-slate-200"
                            title="Hủy giữ xe"
                          >
                            <Unlock size={15} strokeWidth={2.2} className="text-rose-500" />
                            <span>Hủy</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const v = activeDetailVehicle;
                              if (renderCreateRequestForm) {
                                setDetailSheetView('create-request');
                              } else {
                                setActiveDetailVehicle(null);
                                onCreateRequestForVehicle(v);
                              }
                            }}
                            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-800 text-[12px] font-semibold tracking-tight text-white transition-all active:scale-[0.98] active:bg-slate-900"
                          >
                            <Plus size={15} strokeWidth={2.2} />
                            <span>Ghép</span>
                          </button>
                        </div>

                        {activeDetailVehicle.is_extension_requested ? (
                          <div className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-amber-50 text-[12px] font-medium tracking-tight text-amber-700">
                            <Clock size={15} className="text-amber-600" />
                            <span>Đang chờ duyệt gia hạn</span>
                          </div>
                        ) : onOpenExtensionModal &&
                          isHoldNearExpiry(activeDetailVehicle['Thời Gian Hết Hạn Giữ'], holdClock) ? (
                          <button
                            type="button"
                            onClick={() => {
                              const v = activeDetailVehicle;
                              setActiveDetailVehicle(null);
                              onOpenExtensionModal(v);
                            }}
                            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-[12px] font-medium tracking-tight text-slate-600 transition-all active:scale-[0.96] active:bg-slate-200"
                          >
                            <Clock size={15} className="text-amber-600" />
                            <span>Gia hạn giữ xe</span>
                          </button>
                        ) : null}
                      </div>
                    );
                  }

                  // Trường hợp xe người khác giữ / đã ghép
                  return (
                    <div className="space-y-2">
                      <div>
                        {isDetailQueued ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDetailVehicle(null);
                              onLeaveQueue(detailVin);
                            }}
                            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-[12px] font-medium tracking-tight text-slate-600 transition-all active:scale-[0.96] active:bg-slate-200"
                            title="Rời hàng chờ xe"
                          >
                            <Clock size={15} className="text-rose-500" />
                            <span>Hủy</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDetailVehicle(null);
                              onJoinQueue(detailVin);
                            }}
                            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-[12px] font-medium tracking-tight text-slate-600 transition-all active:scale-[0.96] active:bg-slate-200"
                            title="Đăng ký vào hàng chờ xe"
                          >
                            <Clock size={15} />
                            <span>Chờ</span>
                          </button>
                        )}
                      </div>

                      {canSwapVehicle(activeDetailVehicle) && (
                        <button
                          type="button"
                          onClick={() => {
                            const v = activeDetailVehicle;
                            setActiveDetailVehicle(null);
                            setSelectedSwapVehicle(v);
                          }}
                          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-[12px] font-medium tracking-tight text-slate-600 transition-all active:scale-[0.96] active:bg-slate-200"
                        >
                          <ArrowLeftRight size={15} strokeWidth={2.2} />
                          <span>Gửi đề xuất đổi xe cùng cấu hình</span>
                        </button>
                      )}

                      {isAdmin && isDetailHeld && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDetailVehicle(null);
                            onReleaseCar(detailVin);
                          }}
                          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-[12px] font-medium tracking-tight text-slate-600 transition-all active:scale-[0.96] active:bg-slate-200"
                        >
                          <Unlock size={15} strokeWidth={2.2} className="text-rose-500" />
                          <span>Hủy giữ xe này (Quyền Quản lý)</span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🔄 6. MODAL ĐỔI XE CÙNG CẤU HÌNH (SWAP CAR MODAL) */}
      {/* ========================================================================= */}
      {selectedSwapVehicle && (
        <SwapCarModal
          targetVehicle={selectedSwapVehicle}
          userOrders={userOrders}
          onClose={() => setSelectedSwapVehicle(null)}
          showToast={showToast || (() => {})}
          onSuccess={() => refetchStock(true)}
        />
      )}
    </div>
  );
};

export default MobileStockView;
