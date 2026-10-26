import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  Search,
  X,
  Car,
  FileText,
  Phone,
  Copy,
  Check,
  Receipt,
  RotateCw,
  SlidersHorizontal,
  MapPin,
  Tag,
  Trash2,
  Edit3,
  FileDown,
  Upload,
  Clock,
  FileCheck,
  AlertCircle,
  Truck,
  Printer,
  ArrowLeft,
} from 'lucide-react';
import { Order } from '../../types';
import { getExteriorSwatchColor, getCarImage } from '../../utils/styleUtils';
import { formatShortWarehouseName } from '../../utils/stringUtils';
import { downloadDeliveryNoticeDocx } from '../../services/deliveryNoticeService';
import { CyberDnxPrintModal, CyberDnxPrintData } from '../admin/CyberDnxPrintModal';
import { getTransferRequestByOrder, createTransferRequest, TransferRequestItem } from '../../services/api/transferService';
import { cancelRequest, updateOrderPolicy } from '../../services/api/orderService';
import { policyAdminService, Policy } from '../../services/api/policyAdminService';
import RequestInvoiceModal from '../modals/RequestInvoiceModal';
import EditOrderModal from '../modals/EditOrderModal';

interface MobileOrdersViewProps {
  orders: Order[];
  currentUser?: string;
  currentUserName?: string;
  userRole?: string;
  isCurrentUserAdmin?: boolean;
  onBack: () => void;
  onViewDetails?: (order: Order) => void;
  selectedOrder?: Order | null;
  setSelectedOrder?: (order: Order | null) => void;
  onCancelOrder?: (order: Order) => void;
  onRequestInvoice?: (order: Order) => void;
  onInvoiceConfirm?: (...args: any[]) => Promise<any> | any;
  onSupplement?: (order: Order) => void;
  onRequestVC?: (order: Order) => void;
  onConfirmVC?: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
  onSelectPolicy?: (order: Order, policy: string) => void;
  showToast?: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
  stockData?: any[];
  refetchHistory?: () => void;
}

// 🔮 HUY HIỆU KÍNH MỜ HOLOGRAM ÁNH KIM SANG TRỌNG (Frosted Glass Hologram & Iridescent Prism)
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
      {/* NỀN SVG THỦY TINH HOLOGRAM ÁNH KIM CHUYỂN SẮC */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          {/* 1. Dải màu nền kính mờ Hologram Iridescent */}
          <linearGradient id={`holo-bg-${meta.key}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.88" />
            <stop offset="35%" stopColor={meta.holoFrom} stopOpacity="0.32" />
            <stop offset="70%" stopColor={meta.holoVia} stopOpacity="0.25" />
            <stop offset="100%" stopColor={meta.holoTo} stopOpacity="0.4" />
          </linearGradient>

          {/* 2. Viền phản quang lăng kính tán sắc siêu thực (Prism Shimmer Rim) */}
          <linearGradient id={`holo-rim-${meta.key}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="30%" stopColor={meta.holoFrom} stopOpacity="0.75" />
            <stop offset="65%" stopColor={meta.holoVia} stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
          </linearGradient>

          {/* 3. Vệt sáng Hologram xiên 45 độ (Prism Light Sheen Ray) */}
          <linearGradient id={`holo-ray-${meta.key}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Lớp nền kính chuyển sắc Hologram */}
        <rect width="100%" height="100%" rx="9.5" fill={`url(#holo-bg-${meta.key})`} />

        {/* Tia sáng Hologram quang học xiên qua thẻ tạo chiều sâu 3D */}
        <polygon points="6,0 18,0 12,19 0,19" fill={`url(#holo-ray-${meta.key})`} opacity="0.8" />

        {/* Đường viền lăng kính tán sắc siêu mỏng 1px */}
        <rect
          width="100%"
          height="100%"
          rx="9.5"
          fill="none"
          stroke={`url(#holo-rim-${meta.key})`}
          strokeWidth="1"
        />
      </svg>

      {/* Chữ text sắc nét, dập bóng kim loại sang trọng */}
      <span
        className={`relative z-10 text-[9px] font-extrabold tracking-tight ${meta.textColor}`}
        style={{
          textShadow: '0 0.5px 1px rgba(255,255,255,0.9)',
        }}
      >
        {meta.label}
      </span>
    </div>
  );
});

export const MobileOrdersView: React.FC<MobileOrdersViewProps> = ({
  orders = [],
  currentUser: _currentUser = '',
  currentUserName = '',
  userRole = '',
  isCurrentUserAdmin: _isCurrentUserAdmin = false,
  onBack,
  onViewDetails: _onViewDetails,
  selectedOrder: _selectedOrder,
  setSelectedOrder: _setSelectedOrder,
  onCancelOrder,
  onRequestInvoice,
  onInvoiceConfirm,
  onSupplement,
  onRequestVC: _onRequestVC,
  onConfirmVC: _onConfirmVC,
  onEditOrder,
  onSelectPolicy,
  showToast,
  stockData = [],
  refetchHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeSheetOrder, setActiveSheetOrder] = useState<Order | null>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [copiedVin, setCopiedVin] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // In-Sheet Navigation: Điều hướng các tính năng trực tiếp trong Sheet (không mở modal khác)
  type SheetSubView = 'detail' | 'request_invoice' | 'transfer' | 'edit' | 'cancel' | 'policy';
  const [sheetSubView, setSheetSubView] = useState<SheetSubView>('detail');

  // Trạng thái Hủy Đơn Hàng In-Sheet
  const [cancelType, setCancelType] = useState('Hủy luôn đơn hàng (Hủy đơn)');
  const [cancelReason, setCancelReason] = useState('Khách hàng đổi ý / Hủy cọc');
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Trạng thái Chọn Chính Sách In-Sheet
  const [availablePolicies, setAvailablePolicies] = useState<Policy[]>([]);
  const [policySearchQuery, setPolicySearchQuery] = useState('');
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);
  const [selectedPolicyNames, setSelectedPolicyNames] = useState<string[]>([]);
  const [showOnlyMatchModel, setShowOnlyMatchModel] = useState(true);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  // Trạng thái Điều Chuyển Xe & In Phiếu DNX
  const [transferRequest, setTransferRequest] = useState<TransferRequestItem | null>(null);
  const [_isLoadingTransferReq, setIsLoadingTransferReq] = useState(false);
  const [transferReason, setTransferReason] = useState('Điều chuyển xe nội bộ làm PDI chuẩn bị giao KH');
  const [customTransferReason, setCustomTransferReason] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [printDnxData, setPrintDnxData] = useState<CyberDnxPrintData | null>(null);
  const [isPrintDnxOpen, setIsPrintDnxOpen] = useState(false);

  // Tự động đồng bộ các trường form khi mở đơn hàng mới
  React.useEffect(() => {
    if (activeSheetOrder) {
      setSheetSubView('detail');
      setCancelType('Hủy luôn đơn hàng (Hủy đơn)');
      setCancelReason('Khách hàng đổi ý / Hủy cọc');
      setCustomCancelReason('');
    }
  }, [activeSheetOrder]);

  // Tải danh sách chính sách bán hàng khi mở subview policy
  React.useEffect(() => {
    if (sheetSubView === 'policy') {
      const cur = (activeSheetOrder?.['CHÍNH SÁCH'] || '') as string;
      setSelectedPolicyNames(cur.split(';').map((s) => s.trim()).filter(Boolean));
      setPolicySearchQuery('');
      setShowOnlyMatchModel(true);
      setIsLoadingPolicies(true);
      policyAdminService.getAllPolicies()
        .then(({ status, data }) => {
          if (status === 'SUCCESS' && data) {
            setAvailablePolicies(data.filter(p => p.trang_thai === 'Hoạt động'));
          }
        })
        .catch((err) => console.error('Lỗi tải chính sách:', err))
        .finally(() => setIsLoadingPolicies(false));
    }
  }, [sheetSubView]);

  // Tự động tải thông tin yêu cầu chuyển xe đã gửi theo đơn và VIN
  React.useEffect(() => {
    const orderNo = activeSheetOrder?.['Số đơn hàng'];
    const vin = activeSheetOrder?.VIN;
    if (orderNo && vin) {
      setIsLoadingTransferReq(true);
      getTransferRequestByOrder(orderNo, vin)
        .then((req) => setTransferRequest(req))
        .catch((err) => console.error('Lỗi lấy thông tin chuyển xe:', err))
        .finally(() => setIsLoadingTransferReq(false));
    } else {
      setTransferRequest(null);
    }
  }, [activeSheetOrder?.['Số đơn hàng'], activeSheetOrder?.VIN]);

  // Xử lý khi lưu chỉnh sửa đơn hàng thành công (form đầy đủ như bản Laptop)
  const handleEditSuccess = (message: string, updatedOrder?: any) => {
    showToast?.('Thành công', message || 'Đã lưu chỉnh sửa thông tin đơn hàng.', 'success');
    refetchHistory?.();
    if (updatedOrder) {
      setActiveSheetOrder((prev) => (prev ? { ...prev, ...updatedOrder } : prev));
    }
    setSheetSubView('detail');
  };

  // Xử lý Hủy Đơn Hàng trực tiếp trong Sheet
  const handleConfirmCancel = useCallback(async () => {
    if (!activeSheetOrder) return;
    const orderNo = activeSheetOrder['Số đơn hàng'];
    const finalReason = cancelReason === 'Khác' ? (customCancelReason.trim() || 'Hủy theo yêu cầu') : cancelReason;
    setIsSubmittingCancel(true);
    try {
      await cancelRequest(orderNo, finalReason, cancelType);
      showToast?.('Thành công', cancelType.includes('Chờ xe') ? 'Đã hủy ghép và đưa vào danh sách chờ xe.' : 'Đã hủy đơn hàng thành công.', 'success');
      refetchHistory?.();
      setActiveSheetOrder(null);
    } catch (err: any) {
      showToast?.('Lỗi', err.message || 'Không thể hủy đơn hàng.', 'error');
    } finally {
      setIsSubmittingCancel(false);
    }
  }, [activeSheetOrder, cancelReason, customCancelReason, cancelType, showToast, refetchHistory]);

  // Xử lý Chọn Chính Sách trực tiếp trong Sheet
  const handleSavePolicies = useCallback(async () => {
    if (!activeSheetOrder) return;
    const policyName = selectedPolicyNames.join('; ');
    setIsSavingPolicy(true);
    try {
      const res = await updateOrderPolicy(activeSheetOrder['Số đơn hàng'], policyName);
      if (res.status !== 'SUCCESS') throw new Error(res.message);
      setActiveSheetOrder((prev) => (prev ? { ...prev, 'CHÍNH SÁCH': policyName, chinh_sach: policyName } : null));
      onSelectPolicy?.(activeSheetOrder, policyName);
      showToast?.('Đã lưu', selectedPolicyNames.length ? `Đã lưu ${selectedPolicyNames.length} chính sách.` : 'Đã xoá chính sách của đơn.', 'success');
      refetchHistory?.();
      setSheetSubView('detail');
    } catch (err: any) {
      showToast?.('Lỗi', err.message || 'Không thể cập nhật chính sách.', 'error');
    } finally {
      setIsSavingPolicy(false);
    }
  }, [activeSheetOrder, selectedPolicyNames, onSelectPolicy, showToast, refetchHistory]);


  // Xử lý gửi yêu cầu chuyển xe nội bộ tới Admin trực tiếp trong Sheet
  const handleSendTransferRequest = useCallback(async () => {
    if (!activeSheetOrder) return;
    const vin = (activeSheetOrder.VIN || '').trim().toUpperCase();
    const orderNo = activeSheetOrder['Số đơn hàng'];
    if (!vin || !orderNo) {
      showToast?.('Thiếu thông tin', 'Đơn hàng chưa có số VIN để yêu cầu chuyển xe.', 'warning');
      return;
    }

    const finalReason = transferReason === 'Khác' ? (customTransferReason.trim() || 'Điều chuyển xe nội bộ') : transferReason;
    setIsSubmittingTransfer(true);
    try {
      const res = await createTransferRequest({
        orderNumber: orderNo,
        vin: vin,
        customerName: activeSheetOrder['Tên khách hàng'] || '',
        consultantName: activeSheetOrder['Tên tư vấn bán hàng'] || (activeSheetOrder as any)?.['TVBH'] || currentUserName || 'TVBH',
        carModel: activeSheetOrder['Dòng xe'] || '',
        trim: activeSheetOrder['Phiên bản'] || '',
        extColor: activeSheetOrder['Ngoại thất'] || '',
        fromWarehouse: (activeSheetOrder as any)?.ma_kho || 'K87',
        fromWarehouseName: formatShortWarehouseName((activeSheetOrder as any)?.['Vị trí'] || (activeSheetOrder as any)?.['ten_kho'] || (activeSheetOrder as any)?.['Kho'] || 'QL13 (HCM)'),
        toWarehouse: 'K83',
        toWarehouseName: 'Thuận An',
        reason: finalReason,
        note: transferNote.trim(),
      });

      if (res.success && res.data) {
        setTransferRequest(res.data);
        showToast?.('Đã gửi yêu cầu', `Đã gửi yêu cầu chuyển xe ${vin} về Thuận An thành công!`, 'success');
        setSheetSubView('detail');
      } else {
        showToast?.('Không thể gửi', res.error || 'Lỗi gửi yêu cầu chuyển xe', 'error');
      }
    } catch (err: any) {
      showToast?.('Lỗi', err.message || 'Lỗi kết nối khi gửi yêu cầu chuyển xe', 'error');
    } finally {
      setIsSubmittingTransfer(false);
    }
  }, [activeSheetOrder, transferReason, customTransferReason, transferNote, currentUserName, showToast]);

  // Chuẩn hóa trạng thái đơn hàng (phiên bản Kính Mờ Hologram Ánh Kim Sang Trọng)
  const getOrderStatusMeta = useCallback((order: Order) => {
    const rawResult = (order['Kết quả'] || '').trim().toLowerCase();

    if (rawResult.includes('đã xuất hóa đơn') || rawResult.includes('hoàn thành')) {
      return {
        label: 'Hóa đơn',
        key: 'invoiced',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        holoFrom: '#34d399',
        holoVia: '#2dd4bf',
        holoTo: '#38bdf8',
        textColor: 'text-emerald-950',
        glowShadow: 'shadow-[0_2px_8px_rgba(52,211,153,0.22)]',
        step: 4,
      };
    }
    if (rawResult.includes('chờ ký')) {
      return {
        label: 'Chờ ký',
        key: 'signing',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-200/80',
        holoFrom: '#c084fc',
        holoVia: '#f472b6',
        holoTo: '#818cf8',
        textColor: 'text-purple-950',
        glowShadow: 'shadow-[0_2px_8px_rgba(192,132,252,0.22)]',
        step: 3,
      };
    }
    if (rawResult.includes('chờ phê duyệt') || rawResult.includes('yêu cầu')) {
      return {
        label: 'Yêu cầu XHĐ',
        key: 'requested',
        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        holoFrom: '#818cf8',
        holoVia: '#38bdf8',
        holoTo: '#a78bfa',
        textColor: 'text-indigo-950',
        glowShadow: 'shadow-[0_2px_8px_rgba(129,140,248,0.22)]',
        step: 3,
      };
    }
    if (rawResult.includes('đã ghép') || rawResult.includes('đã duyệt') || order.VIN) {
      return {
        label: 'Đã ghép',
        key: 'paired',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/80',
        holoFrom: '#38bdf8',
        holoVia: '#818cf8',
        holoTo: '#a78bfa',
        textColor: 'text-sky-950',
        glowShadow: 'shadow-[0_2px_8px_rgba(56,189,248,0.25)]',
        step: 2,
      };
    }
    if (rawResult.includes('hủy') || rawResult.includes('từ chối')) {
      return {
        label: 'Đã hủy',
        key: 'cancelled',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200/80',
        holoFrom: '#fb7185',
        holoVia: '#f87171',
        holoTo: '#fda4af',
        textColor: 'text-rose-950',
        glowShadow: 'shadow-[0_2px_8px_rgba(251,113,133,0.22)]',
        step: 0,
      };
    }
    return {
      label: 'Chưa ghép',
      key: 'unpaired',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200/80',
      holoFrom: '#fbbf24',
      holoVia: '#fb923c',
      holoTo: '#f472b6',
      textColor: 'text-amber-950',
      glowShadow: 'shadow-[0_2px_8px_rgba(251,191,36,0.22)]',
      step: 1,
    };
  }, []);

  // Danh mục tất cả dòng xe độc nhất trong dữ liệu
  const modelTabs = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const model = (o['Dòng xe'] || 'Khác').trim();
      if (model) {
        map.set(model, (map.get(model) || 0) + 1);
      }
    });

    const list = Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return [{ name: 'all', label: 'Tất cả', count: orders.length }, ...list.map(l => ({ name: l.name, label: l.name, count: l.count }))];
  }, [orders]);

  // Bộ đếm theo nhóm trạng thái
  const statusCounts = useMemo(() => {
    let unpaired = 0;
    let paired = 0;
    let signing = 0;
    let invoiced = 0;

    orders.forEach((o) => {
      const meta = getOrderStatusMeta(o);
      if (meta.key === 'unpaired') unpaired++;
      else if (meta.key === 'paired') paired++;
      else if (meta.key === 'signing' || meta.key === 'requested') signing++;
      else if (meta.key === 'invoiced') invoiced++;
    });

    return {
      all: orders.length,
      unpaired,
      paired,
      signing,
      invoiced,
    };
  }, [orders, getOrderStatusMeta]);

  // Lọc dữ liệu theo Search, Dòng xe, Trạng thái
  const filteredOrders = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return orders.filter((order) => {
      // 1. Lọc theo model
      if (selectedModel !== 'all') {
        const orderModel = (order['Dòng xe'] || '').trim().toLowerCase();
        if (orderModel !== selectedModel.toLowerCase()) return false;
      }

      // 2. Lọc theo trạng thái
      if (selectedStatus !== 'all') {
        const meta = getOrderStatusMeta(order);
        if (selectedStatus === 'unpaired' && meta.key !== 'unpaired') return false;
        if (selectedStatus === 'paired' && meta.key !== 'paired') return false;
        if (selectedStatus === 'signing' && meta.key !== 'signing' && meta.key !== 'requested') return false;
        if (selectedStatus === 'invoiced' && meta.key !== 'invoiced') return false;
      }

      // 3. Tìm kiếm tự do
      if (q) {
        const custName = (order['Tên khách hàng'] || '').toLowerCase();
        const vin = (order['VIN'] || '').toLowerCase();
        const phone = (order['Số điện thoại'] || order['SĐT'] || '').toLowerCase();
        const orderNo = (order['Số đơn hàng'] || '').toLowerCase();
        const dmsCode = (order['Mã DMS'] || '').toLowerCase();
        const tvbh = (order['Tên tư vấn bán hàng'] || '').toLowerCase();

        return (
          custName.includes(q) ||
          vin.includes(q) ||
          phone.includes(q) ||
          orderNo.includes(q) ||
          dmsCode.includes(q) ||
          tvbh.includes(q)
        );
      }

      return true;
    });
  }, [orders, searchTerm, selectedModel, selectedStatus, getOrderStatusMeta]);


  // Chuẩn hóa tên sang Title Case sang trọng nếu bị ALL-CAPS
  const toTitleCase = (str?: string) => {
    if (!str) return '';
    const trimmed = str.trim();
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 2) {
      return trimmed
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
    return trimmed;
  };

  const handleCopyVin = (vin: string, e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    try {
      navigator.clipboard.writeText(vin);
    } catch {
      /* ignore */
    }
    setCopiedVin(vin);
    setTimeout(() => setCopiedVin((cur) => (cur === vin ? null : cur)), 1800);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    refetchHistory?.();
    setTimeout(() => setIsRefreshing(false), 900);
  };

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
            Đơn Hàng
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
      {/* 📋 2. DANH SÁCH ĐƠN HÀNG MOBILE-FIRST (SMARTPHONE FEED) */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5 no-scrollbar">
        {filteredOrders.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-white text-slate-400 flex items-center justify-center mb-3 shadow-xs border border-slate-200">
              <Car size={26} strokeWidth={1.8} />
            </div>
            <h3 className="text-sm font-bold text-slate-700">Không tìm thấy đơn hàng</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác.
            </p>
            {(searchTerm || selectedModel !== 'all' || selectedStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedModel('all');
                  setSelectedStatus('all');
                }}
                className="mt-3.5 px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-xs active:scale-95"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        ) : (
          filteredOrders.map((order, idx) => {
            const statusMeta = getOrderStatusMeta(order);
            const customerName = order['Tên khách hàng'] || 'Khách hàng';
            const vin = (order['VIN'] || '').trim();
            const carModel = (order['Dòng xe'] || '').trim();
            const carTrim = (order['Phiên bản'] || '').trim();
            const orderNo = order['Số đơn hàng'] || '';
            const carImgUrl = getCarImage(carModel, order['Ngoại thất'], carTrim);

            // Khử trùng lặp tên dòng xe & phiên bản (ví dụ MINIO MINIO)
            const carDisplayName = (!carTrim || carTrim.toLowerCase() === carModel.toLowerCase())
              ? carModel
              : carTrim.toLowerCase().startsWith(carModel.toLowerCase())
                ? carTrim
                : `${carModel} ${carTrim}`;

            return (
              <div
                key={orderNo || idx}
                onClick={() => setActiveSheetOrder(order)}
                className="bg-white rounded-[20px] p-3 border border-slate-150/70 shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-[0.985] transition-all cursor-pointer relative overflow-hidden space-y-2.5"
              >
                {/* 1. THANH TIÊU ĐỀ: DÒNG XE (TRÁI) ──────── HUY HIỆU TRẠNG THÁI (PHẢI) */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[14.5px] text-slate-900 tracking-tight">
                    {carDisplayName}
                  </span>
                  {/* Huy hiệu trạng thái siêu nhỏ gọn với nền SVG đặc biệt */}
                  <MobileStatusBadge meta={statusMeta} />
                </div>

                {/* 2. KHỐI TRUNG TÂM: TÊN KHÁCH & TVBH (TRÁI) ──────── ẢNH XE 3D CÂN XỨNG (PHẢI) */}
                <div className="flex items-center justify-between gap-3">
                  {/* Bên trái: Tên khách hàng & TVBH phụ trách */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="text-[13px] font-semibold text-slate-800 tracking-tight truncate">
                      {toTitleCase(customerName)}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium truncate flex items-center space-x-1">
                      <span>TVBH:</span>
                      <span className="text-slate-600 font-medium">
                        {order['Tên tư vấn bán hàng'] ? toTitleCase(order['Tên tư vấn bán hàng']) : 'Chưa phân bổ'}
                      </span>
                    </p>
                  </div>

                  {/* Bên phải: Ảnh render 3D xe VinFast to đẹp, sắc nét, cân đối */}
                  {carImgUrl && (
                    <div className="w-24 h-12 flex-shrink-0 flex items-center justify-end">
                      <img
                        src={carImgUrl}
                        alt={carDisplayName}
                        className="max-h-full max-w-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.12)] transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 3. THANH BIỂN SỐ VIN CÔNG NGHỆ: BO TRÒN MỀM MẠI, CHẠM CHÉP TIỆN LỢI */}
                <div
                  onClick={(e) => vin && handleCopyVin(vin, e)}
                  className="bg-slate-50/90 hover:bg-slate-100/80 active:scale-[0.99] border border-slate-200/60 rounded-xl px-2.5 py-1.5 flex items-center justify-between transition-all"
                  title={vin ? 'Chạm để sao chép số VIN' : undefined}
                >
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <Car size={12} className={vin ? 'text-blue-500' : 'text-slate-400'} />
                    {vin ? (
                      <span className="font-mono text-[11px] font-semibold text-slate-700 tracking-wide">
                        {vin}
                      </span>
                    ) : (
                      <span className="text-[10.5px] text-amber-600 font-medium">
                        Chưa ghép số VIN
                      </span>
                    )}
                  </div>

                  {vin ? (
                    <div className="flex items-center space-x-1 text-[10px] font-medium flex-shrink-0 pl-2">
                      {copiedVin === vin ? (
                        <span className="text-emerald-600 flex items-center space-x-0.5">
                          <Check size={11} strokeWidth={2.4} />
                          <span>Đã chép</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 hover:text-slate-700 flex items-center space-x-0.5">
                          <Copy size={10} />
                          <span>Chép</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[9.5px] text-slate-400 italic flex-shrink-0">
                      Chờ phân bổ xe
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* ========================================================================= */}
      {/* 🔍 2. APPLE FLOATING BOTTOM DOCK: Ô TÌM KIẾM & NÚT BỘ LỌC THU NHỎ TINH GỌN */}
      {/* ========================================================================= */}
      <div className="w-full bg-white/92 backdrop-blur-2xl border-t border-black/[0.08] px-3 pt-1.5 pb-2 shadow-[0_-6px_20px_rgba(0,0,0,0.06)] z-30 flex-shrink-0 space-y-1">
        {/* Dải tag bộ lọc đang áp dụng (tone màu xám nhã nhặn) */}
        {(selectedModel !== 'all' || selectedStatus !== 'all') && (
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
              Đang lọc:
            </span>
            {selectedStatus !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 flex-shrink-0">
                <span>
                  {selectedStatus === 'unpaired'
                    ? 'Chưa ghép'
                    : selectedStatus === 'paired'
                      ? 'Đã ghép'
                      : selectedStatus === 'signing'
                        ? 'Chờ ký'
                        : 'Hóa đơn'}
                </span>
                <button
                  onClick={() => setSelectedStatus('all')}
                  className="hover:text-slate-900 active:scale-90 ml-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            )}
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
            <button
              onClick={() => {
                setSelectedModel('all');
                setSelectedStatus('all');
              }}
              className="text-[10px] font-medium text-slate-500 hover:text-slate-800 active:scale-95 px-1 py-0.5 flex-shrink-0"
            >
              Xóa tất cả
            </button>
          </div>
        )}

        {/* Thanh tìm kiếm & Nút Lọc thu nhỏ theo yêu cầu */}
        <div className="flex items-center space-x-2">
          {/* Ô tìm kiếm nhỏ gọn: h-[34px], text-[11.5px] */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search size={13} strokeWidth={2} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên khách, số VIN, số đơn..."
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

          {/* Nút Bộ Lọc nhỏ gọn: h-[34px], px-2.5, tone xám than thanh lịch */}
          <button
            onClick={() => setIsFilterSheetOpen(true)}
            className={`h-[34px] px-2.5 rounded-xl flex items-center space-x-1 font-medium text-[11px] transition-all active:scale-95 flex-shrink-0 border ${selectedModel !== 'all' || selectedStatus !== 'all'
                ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80 border-slate-200/80 shadow-2xs'
              }`}
          >
            <SlidersHorizontal size={12} strokeWidth={2} />
            <span>Lọc</span>
            {(selectedModel !== 'all' || selectedStatus !== 'all') && (
              <span className="w-3.5 h-3.5 rounded-full bg-white text-slate-700 font-bold text-[9px] flex items-center justify-center -mr-0.5">
                {(selectedModel !== 'all' ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🎛️ 3. APPLE IOS FILTER SHEET TINH GỌN (TONE XÁM ĐẬM, NÚT NHỎ GỌN) */}
      {/* ========================================================================= */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop mờ chuẩn iOS */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsFilterSheetOpen(false)}
          />

          {/* iOS Bottom Sheet Container */}
          <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col max-h-[55dvh] animate-in slide-in-from-bottom duration-250 overflow-hidden">
            {/* Grab handle thanh kéo chuẩn iOS */}
            <div className="pt-2 pb-0.5 flex justify-center">
              <div className="w-8 h-1 rounded-full bg-slate-300" />
            </div>

            {/* Apple Navigation Bar */}
            <div className="px-4 py-1.5 border-b border-black/[0.06] flex items-center justify-between">
              {/* Nút Đặt lại bên trái */}
              <div className="w-16 flex justify-start">
                {(selectedModel !== 'all' || selectedStatus !== 'all') ? (
                  <button
                    onClick={() => {
                      setSelectedModel('all');
                      setSelectedStatus('all');
                    }}
                    className="text-[12.5px] font-medium text-slate-500 hover:text-slate-800 active:opacity-60 transition-opacity"
                  >
                    Đặt lại
                  </button>
                ) : (
                  <span className="w-1" />
                )}
              </div>

              {/* Tiêu đề căn giữa màu xám đậm */}
              <h3 className="text-[13.5px] font-bold text-slate-800 tracking-tight text-center flex-1">
                Bộ Lọc
              </h3>

              {/* Nút Xong bên phải màu xám đậm */}
              <div className="w-16 flex justify-end">
                <button
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="text-[13.5px] font-bold text-slate-700 hover:text-slate-900 active:opacity-60 transition-opacity"
                >
                  Xong
                </button>
              </div>
            </div>

            {/* Content cuộn êm ái, các nút nhỏ gọn */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
              {/* Mục 1: Trạng thái đơn hàng */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 px-0.5">
                  Trạng thái đơn
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'Tất cả', count: statusCounts.all },
                    { id: 'unpaired', label: 'Chưa ghép', count: statusCounts.unpaired },
                    { id: 'paired', label: 'Đã ghép', count: statusCounts.paired },
                    { id: 'signing', label: 'Chờ ký', count: statusCounts.signing },
                    { id: 'invoiced', label: 'Hóa đơn', count: statusCounts.invoiced },
                  ].map((st) => {
                    const isActive = selectedStatus === st.id;
                    return (
                      <button
                        key={st.id}
                        onClick={() => setSelectedStatus(st.id)}
                        className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border ${isActive
                            ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                            : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                          }`}
                      >
                        <span>{st.label}</span>
                        <span
                          className={`text-[9.5px] font-normal ${isActive ? 'text-slate-200' : 'text-slate-400'
                            }`}
                        >
                          {st.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mục 2: Dòng xe VinFast nhỏ gọn */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 px-0.5">
                  Dòng xe VinFast
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {modelTabs.map((tab) => {
                    const isActive = selectedModel === tab.name;
                    return (
                      <button
                        key={tab.name}
                        onClick={() => setSelectedModel(tab.name)}
                        className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border ${isActive
                            ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                            : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                          }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`text-[9.5px] font-normal ${isActive ? 'text-slate-200' : 'text-slate-400'
                            }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CTA Button ở đáy - Tone xám đậm nhỏ gọn */}
            <div className="p-3 border-t border-black/[0.06] bg-white">
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="w-full h-[38px] rounded-full bg-slate-700 hover:bg-slate-800 text-white font-semibold text-[13px] tracking-tight shadow-xs active:scale-[0.98] transition-all flex items-center justify-center space-x-1"
              >
                <span>Xem {filteredOrders.length} Đơn Hàng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📱 3. IOS BOTTOM SHEET: CHI TIẾT ĐƠN HÀNG TOÀN DIỆN (FULL DESKTOP SUITE) */}
      {/* ========================================================================= */}
      {activeSheetOrder && (() => {
        // Tra cứu xe trong kho theo VIN
        const cleanVin = (activeSheetOrder.VIN || '').trim().toUpperCase();
        const matchedStockVehicle = cleanVin && Array.isArray(stockData)
          ? stockData.find((s) => (s.VIN || s.vin || '').toString().trim().toUpperCase() === cleanVin) || null
          : null;

        // Vị trí kho thực tế của xe
        const rawLoc = (
          matchedStockVehicle?.['Vị trí'] ||
          matchedStockVehicle?.['vi_tri'] ||
          matchedStockVehicle?.['Kho'] ||
          matchedStockVehicle?.['Kho xe'] ||
          (activeSheetOrder as any)?.['Vị trí'] ||
          (activeSheetOrder as any)?.['vi_tri'] ||
          (activeSheetOrder as any)?.['Kho'] ||
          ''
        );
        const carWarehouseLocation = cleanVin ? formatShortWarehouseName(String(rawLoc || '').trim()) : '';

        // Đánh giá trạng thái nghiệp vụ chuẩn xác 100% theo giao diện Laptop (OrderDetailView.tsx)
        const statusText = activeSheetOrder['Kết quả'] || activeSheetOrder['Trạng thái VC'] || 'Chưa ghép';
        const generalStatus = (activeSheetOrder['Kết quả'] || 'chưa ghép').toLowerCase().trim().normalize('NFC');
        const adminNotes = (activeSheetOrder['Ghi chú Admin'] || (activeSheetOrder as any).ghi_chu_admin || '').toString();
        const isReferenceAccount = userRole === 'reference';
        const isCancelled = statusText.toLowerCase().includes('đã hủy') || statusText.toLowerCase().includes('từ chối') || generalStatus.includes('hủy') || generalStatus.includes('huy');

        const isSupplementRequested = generalStatus === 'yêu cầu bổ sung' || generalStatus.includes('bổ sung');
        const isRescanRequested = adminNotes.includes('[YÊU CẦU SCAN LẠI]');
        const canAddSupplement = (isSupplementRequested || isRescanRequested) && !isCancelled && !isReferenceAccount;

        // Logic ẩn hiện các nút tác nghiệp chuẩn mực 1-1 như trên Laptop:
        // 1. Xuất Hóa Đơn: CHỈ HIỂN THỊ KHI trạng thái chính xác là 'đã ghép'
        const canRequestInvoice = (generalStatus === 'đã ghép' || generalStatus === 'đã ghép xe') && !isCancelled && !isReferenceAccount;

        // 2. Sửa đơn: CHỈ HIỂN THỊ KHI đơn ở 'chưa ghép' hoặc 'đã ghép'
        const canEdit = !!onEditOrder && ['chưa ghép', 'đã ghép', 'đã ghép xe'].includes(generalStatus) && !isCancelled && !isReferenceAccount;

        // 3. Hủy đơn: CHỈ HIỂN THỊ KHI đơn ở 'chưa ghép' hoặc 'đã ghép'
        const canCancel = !!onCancelOrder && ['chưa ghép', 'đã ghép', 'đã ghép xe'].includes(generalStatus) && !isCancelled && !isReferenceAccount;

        // 4. Đổi chính sách: CHỈ HIỂN THỊ KHI đơn ở 'chưa ghép' hoặc 'đã ghép'
        const canChangePolicy = !!onSelectPolicy && ['chưa ghép', 'đã ghép', 'đã ghép xe'].includes(generalStatus) && !isCancelled && !isReferenceAccount;

        // 5. Mở hóa đơn điện tử: có LinkHoaDonDaXuat
        const canDownloadInvoice = !!activeSheetOrder.LinkHoaDonDaXuat;

        // 6. TB Giao Xe: Tuân thủ quy chuẩn tuyệt đối trong .agents/AGENTS.md
        const isExcludedFromDeliveryNotice =
          generalStatus.includes('chờ phê duyệt') ||
          generalStatus.includes('chờ duyệt') ||
          generalStatus.includes('yêu cầu') ||
          generalStatus.includes('đã ghép') ||
          generalStatus.includes('chờ ký') ||
          generalStatus.includes('đã xuất') ||
          generalStatus.includes('chưa ghép');
        const canDeliveryNotice = !!activeSheetOrder.VIN && !isExcludedFromDeliveryNotice && !isCancelled;

        // Tải văn bản Thông báo giao xe Word
        const handleDownloadDeliveryWord = async () => {
          try {
            showToast?.('Đang tạo file', 'Đang kết xuất văn bản Thông báo giao xe...', 'loading', 1500);
            await downloadDeliveryNoticeDocx(activeSheetOrder);
            showToast?.('Thành công', 'Đã tải Thông báo sẵn sàng giao xe (Word)!', 'success');
          } catch (e: any) {
            showToast?.('Lỗi', `Lỗi tải file: ${e.message}`, 'error');
          }
        };

        // Kiểm tra điều kiện Điều Chuyển Xe & In Phiếu DNX (chuẩn theo OrderDetailView.tsx)
        const rawLocLower = String(rawLoc || '').toLowerCase();
        const isCarAlreadyAtThuanAn = Boolean(
          rawLocLower.includes('thuận an') ||
          rawLocLower.includes('thuan an') ||
          rawLocLower === 'k83' ||
          rawLocLower.startsWith('k83 ') ||
          rawLocLower.startsWith('k83-')
        );

        const isCarInTransit = Boolean(
          rawLocLower.includes('chưa có') ||
          rawLocLower.includes('chưa về') ||
          rawLocLower.includes('đang về') ||
          rawLocLower.includes('vận chuyển') ||
          rawLocLower.includes('vận tải') ||
          rawLocLower.includes('tiếp nhận nhà máy') ||
          rawLocLower.includes('ktn')
        );

        const isCarInWarehouse = Boolean(cleanVin && rawLoc && !isCarInTransit);
        const hasExistingTd4 = Boolean(
          activeSheetOrder.so_ct_td4 ||
          (activeSheetOrder as any)?.['Số CT TD4'] ||
          transferRequest?.hasTd4
        );
        const hasExistingDnx = Boolean(
          activeSheetOrder.so_ct_dnx ||
          (activeSheetOrder as any)?.['Số CT DNX'] ||
          transferRequest?.status === 'completed' ||
          transferRequest?.soCtDnx
        );

        // Nút Chuyển Xe / In Phiếu DNX chỉ hiển thị khi:
        // Xe có VIN, chưa có phiếu TD4 ra cổng, không phải tài khoản chỉ xem, và xe đã về kho thực tế
        const canShowTransferHub = Boolean(
          cleanVin &&
          !hasExistingTd4 &&
          !isReferenceAccount &&
          isCarInWarehouse &&
          !isCancelled
        );

        // Xử lý mở xem & in phiếu Đề nghị xuất xe (DNX)
        const handleOpenPrintDnx = () => {
          const soCt = transferRequest?.soCtDnx || activeSheetOrder.so_ct_dnx || (activeSheetOrder as any)?.['Số CT DNX'] || 'DNX';
          const printData: CyberDnxPrintData = transferRequest?.printData || {
            so_ct: soCt,
            stt_rec: (transferRequest as any)?.stt_rec || '',
            ngay_ct: (transferRequest as any)?.createdAt || '',
            user_name: currentUserName || 'Phạm Thành Nhân',
            ma_kho_xuat: (matchedStockVehicle as any)?.ma_kho || 'K87',
            ten_kho_xuat: carWarehouseLocation || 'Kho xe ô tô QL13 - HCM',
            ma_kho_nhan: 'K83',
            ten_kho_nhan: 'Kho xe ô tô Thuận An',
            khach_hang: activeSheetOrder['Tên khách hàng'] || '',
            don_vi: 'Thuận An',
            ly_do: transferRequest?.reason || 'Điều chuyển xe nội bộ làm PDI chuẩn bị giao KH',
            total_cars: 1,
            cars: [{
              stt_rec0: '0001',
              vin: cleanVin,
              so_may: (activeSheetOrder as any)?.['Số máy'] || '',
              ma_kx: activeSheetOrder['Dòng xe'] || '',
              ten_kx: `${activeSheetOrder['Dòng xe'] || ''} ${activeSheetOrder['Phiên bản'] || ''}`.trim(),
              dong_xe: activeSheetOrder['Dòng xe'] || '',
              ma_mau: activeSheetOrder['Ngoại thất'] || '',
              ten_mau: activeSheetOrder['Ngoại thất'] || '',
              ma_kho_xuat: (matchedStockVehicle as any)?.ma_kho || 'K87',
              ma_kho_nhan: 'K83',
              ghi_chu: 'Lấy xe về PDI giao KH'
            }]
          };
          setPrintDnxData(printData);
          setIsPrintDnxOpen(true);
        };

        // Mở hóa đơn điện tử PDF
        const handleOpenInvoiceUrl = () => {
          let url = activeSheetOrder.LinkHoaDonDaXuat;
          if (!url) return;
          if (url.includes('drive.google.com') && url.includes('/file/d/')) {
            const match = url.match(/\/file\/d\/([^/]+)/);
            if (match) url = `https://drive.google.com/uc?export=download&id=${match[1]}`;
          }
          window.open(url, '_blank');
        };

        const statusMeta = getOrderStatusMeta(activeSheetOrder);

        return (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop mờ nền */}
            <div
              className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => setActiveSheetOrder(null)}
            />

            {/* iOS Sheet Content */}
            <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-[28px] shadow-[0_-12px_45px_rgba(0,0,0,0.22)] border-t border-slate-200 flex flex-col max-h-[92dvh] animate-in slide-in-from-bottom duration-300 overflow-hidden">
              {/* Grab handle */}
              <div className="pt-2.5 pb-1 flex justify-center">
                <div className="w-10 h-1 rounded-full bg-slate-300" />
              </div>

              {/* Sheet Header (Hỗ trợ nút Quay lại khi vào các màn hình chức năng) */}
              {sheetSubView === 'detail' ? (
                <div className="px-4 py-2.5 border-b border-slate-150 flex items-center justify-between bg-white">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center space-x-2">
                      <h2 className="text-[17px] font-bold text-slate-900 tracking-tight truncate">
                        {activeSheetOrder['Tên khách hàng'] || 'Chi Tiết Đơn Hàng'}
                      </h2>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex items-center space-x-1 text-[11px] text-slate-500 font-mono">
                        <span>Đơn:</span>
                        <span className="font-semibold text-slate-700">{activeSheetOrder['Số đơn hàng'] || '—'}</span>
                        {activeSheetOrder['Số đơn hàng'] && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(activeSheetOrder['Số đơn hàng'] || '');
                              showToast?.('Đã chép', `Đã chép mã đơn hàng ${activeSheetOrder['Số đơn hàng']}`, 'success');
                            }}
                            className="text-slate-400 hover:text-blue-600 active:scale-90 p-0.5"
                            title="Chép mã đơn"
                          >
                            <Copy size={11} />
                          </button>
                        )}
                      </div>
                      {/* Thẻ trạng thái Hologram */}
                      <MobileStatusBadge meta={statusMeta} />
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveSheetOrder(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center active:scale-90 transition-all flex-shrink-0 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="px-4 py-2.5 border-b border-slate-150 flex items-center justify-between bg-white">
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <button
                      onClick={() => setSheetSubView('detail')}
                      className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center active:scale-90 transition-all flex-shrink-0 cursor-pointer"
                      title="Quay lại chi tiết"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div className="min-w-0">
                      <h2 className="text-[15px] font-bold text-slate-900 tracking-tight truncate">
                        {sheetSubView === 'request_invoice' && 'Yêu Cầu Xuất Hóa Đơn'}
                        {sheetSubView === 'transfer' && 'Yêu Cầu Chuyển Xe Nội Bộ'}
                        {sheetSubView === 'edit' && 'Chỉnh Sửa Đơn Hàng'}
                        {sheetSubView === 'cancel' && 'Hủy Đơn Hàng'}
                        {sheetSubView === 'policy' && 'Chọn Chính Sách Bán Hàng'}
                      </h2>
                      <p className="text-[10.5px] text-slate-500 font-mono truncate">
                        {activeSheetOrder['Số đơn hàng']} • {activeSheetOrder['Tên khách hàng']}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveSheetOrder(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center active:scale-90 transition-all flex-shrink-0 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Sheet Body 'detail' — có scroll riêng */}
              {sheetSubView === 'detail' && (
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar bg-slate-50/40">
                <>
                {/* 1. Thẻ xe & Hộ chiếu VIN */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-2xs space-y-2.5">
                  <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                    Thông tin xe
                  </h4>

                  {/* Chi tiết thông số xe */}
                  <div className="space-y-1.5 text-[12.5px]">
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Dòng xe & Bản:</span>
                      <span className="font-bold text-slate-900">
                        {activeSheetOrder['Dòng xe']} {activeSheetOrder['Phiên bản']}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Màu ngoại thất:</span>
                      <div className="flex items-center space-x-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white ring-1 ring-slate-200 shadow-2xs"
                          style={{ backgroundColor: getExteriorSwatchColor(activeSheetOrder['Ngoại thất']) }}
                        />
                        <span className="font-semibold text-slate-800">
                          {activeSheetOrder['Ngoại thất'] || '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Màu nội thất:</span>
                      <span className="font-semibold text-slate-800">
                        {activeSheetOrder['Nội thất'] || '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Số khung (VIN):</span>
                      {activeSheetOrder.VIN ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50/90 border border-blue-200/80 px-2.5 py-0.5 rounded-md text-[12px] tracking-tight">
                            {activeSheetOrder.VIN}
                          </span>
                          <button
                            onClick={(e) => handleCopyVin(activeSheetOrder.VIN!, e)}
                            className="text-slate-400 hover:text-blue-600 active:scale-90 p-0.5"
                            title="Sao chép VIN"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-amber-600 font-semibold text-xs">Chưa ghép VIN</span>
                      )}
                    </div>

                    {/* Vị trí kho CyberSoft */}
                    {carWarehouseLocation && (
                      <div className="flex items-center justify-between py-1">
                        <span className="text-slate-500">Vị trí kho thực tế:</span>
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <MapPin size={12} className="text-emerald-600" />
                          <span>{carWarehouseLocation}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Khách hàng & Hợp đồng & Chính sách bán hàng */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-2xs space-y-2">
                  <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                    Khách hàng & Hợp đồng
                  </h4>

                  <div className="space-y-1.5 text-[12.5px]">
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Tên khách hàng:</span>
                      <span className="font-bold text-slate-900">{activeSheetOrder['Tên khách hàng']}</span>
                    </div>

                    {activeSheetOrder['Số điện thoại'] && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Số điện thoại:</span>
                        <a
                          href={`tel:${activeSheetOrder['Số điện thoại']}`}
                          className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 bg-emerald-50 px-2 py-0.5 rounded-md"
                        >
                          <Phone size={12} />
                          <span>{activeSheetOrder['Số điện thoại']}</span>
                        </a>
                      </div>
                    )}

                    {activeSheetOrder['CCCD'] && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">CCCD/MST:</span>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-slate-800">{activeSheetOrder['CCCD']}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(activeSheetOrder['CCCD'] || '');
                              showToast?.('Đã chép', 'Đã chép số CCCD/MST', 'success');
                            }}
                            className="text-slate-400 hover:text-blue-600 active:scale-90"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">TVBH phụ trách:</span>
                      <span className="font-semibold text-slate-800">
                        {activeSheetOrder['Tên tư vấn bán hàng'] || '—'}
                      </span>
                    </div>

                    {/* Chính sách bán hàng kèm nút đổi nhanh */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Chính sách bán hàng:</span>
                      <div className="flex items-center space-x-1.5 max-w-[65%]">
                        <span className="font-semibold text-blue-700 truncate" title={activeSheetOrder['CHÍNH SÁCH']}>
                          {activeSheetOrder['CHÍNH SÁCH'] || 'Tiêu chuẩn'}
                        </span>
                        {canChangePolicy && (
                          <button
                            onClick={() => setSheetSubView('policy')}
                            className="p-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 active:scale-90 transition-all flex-shrink-0"
                            title="Đổi chính sách bán hàng"
                          >
                            <Tag size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {activeSheetOrder['Thời gian cần xe'] && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Thời gian cần xe:</span>
                        <span className="font-semibold text-slate-800">{activeSheetOrder['Thời gian cần xe']}</span>
                      </div>
                    )}

                    {activeSheetOrder['Ngày cọc'] && (
                      <div className="flex items-center justify-between py-1">
                        <span className="text-slate-500">Ngày đặt cọc:</span>
                        <span className="font-semibold text-slate-800">{activeSheetOrder['Ngày cọc']}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Hóa đơn điện tử M-Invoice & Chứng từ kế toán */}
                {(activeSheetOrder.so_ct_dnx || activeSheetOrder.so_ct_td4) && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 shadow-2xs">
                    <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
                      Chứng từ kế toán
                    </h4>

                    {activeSheetOrder.so_ct_dnx && (
                      <div className="flex items-center justify-between text-xs text-slate-800">
                        <span>Số phiếu ĐNX Cyber:</span>
                        <span className="font-mono font-bold">{activeSheetOrder.so_ct_dnx}</span>
                      </div>
                    )}

                    {activeSheetOrder.so_ct_td4 && (
                      <div className="flex items-center justify-between text-xs text-slate-800">
                        <span>Số phiếu TD4 (Ra cổng):</span>
                        <span className="font-mono font-bold">{activeSheetOrder.so_ct_td4}</span>
                      </div>
                    )}
                  </div>
                )}
                </>
              </div>
              )}

              {/* ===== SUB-VIEW: YÊU CẦU XUẤT HÓA ĐƠN — footer cố định ===== */}
              {sheetSubView === 'request_invoice' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <RequestInvoiceModal
                    inline
                    compact
                    order={activeSheetOrder}
                    stockData={stockData}
                    showToast={showToast || (() => undefined)}
                    onClose={() => setSheetSubView('detail')}
                    onConfirm={async (...args: any[]) => {
                      if (onInvoiceConfirm) await onInvoiceConfirm(...args);
                      else onRequestInvoice?.(activeSheetOrder);
                      refetchHistory?.();
                      setSheetSubView('detail');
                    }}
                  />
                </div>
              )}

              {/* ===== SUB-VIEW: CHỈNH SỬA ĐƠN — footer cố định ===== */}
              {sheetSubView === 'edit' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <EditOrderModal
                    inline
                    isOpen
                    order={activeSheetOrder}
                    isAdmin={_isCurrentUserAdmin}
                    showToast={showToast || (() => undefined)}
                    existingOrderNumbers={orders
                      .map((o) => o['Số đơn hàng'])
                      .filter((n) => n && n !== activeSheetOrder['Số đơn hàng'])}
                    onClose={() => setSheetSubView('detail')}
                    onSuccess={handleEditSuccess}
                  />
                </div>
              )}

              {/* Scroll area — cancel/transfer/policy */}
              {sheetSubView !== 'request_invoice' && sheetSubView !== 'edit' && sheetSubView !== 'detail' && (
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar bg-slate-50/40">

                {/* ===== SUB-VIEW: HỦY ĐƠN ===== */}
                {sheetSubView === 'cancel' && (
                  <div className="space-y-3">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-150 space-y-3">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block mb-1">Hình thức hủy</span>
                        <select value={cancelType} onChange={(e) => setCancelType(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold focus:outline-none">
                          <option value="Hủy luôn đơn hàng (Hủy đơn)">Hủy luôn đơn hàng (Hủy đơn)</option>
                          {activeSheetOrder.VIN && <option value="Hủy ghép xe, giữ đơn chờ xe (Chờ xe)">Hủy ghép xe, giữ đơn chờ xe (Chờ xe)</option>}
                        </select>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-700 block mb-1">Lý do</span>
                        <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold focus:outline-none">
                          <option value="Khách hàng đổi ý / Hủy cọc">Khách hàng đổi ý / Hủy cọc</option>
                          <option value="Khách đổi dòng xe / màu xe">Khách đổi dòng xe / màu xe</option>
                          <option value="Khách không đủ tài chính">Khách không đủ tài chính</option>
                          <option value="Khác">Lý do khác...</option>
                        </select>
                        {cancelReason === 'Khác' && (
                          <input type="text" value={customCancelReason} onChange={(e) => setCustomCancelReason(e.target.value)} placeholder="Nhập lý do cụ thể..." className="w-full h-10 px-3 mt-1.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none" />
                        )}
                      </div>
                    </div>
                    <button type="button" onClick={handleConfirmCancel} disabled={isSubmittingCancel} className="w-full h-10 rounded-xl bg-[#FF3B30] disabled:opacity-50 text-white font-bold text-[13px] flex items-center justify-center space-x-1.5 active:scale-[0.98] transition-all">
                      <Trash2 size={14} />
                      <span>{isSubmittingCancel ? 'Đang xử lý...' : 'Xác Nhận Hủy Đơn'}</span>
                    </button>
                  </div>
                )}

                {/* ===== SUB-VIEW: CHỌN CHÍNH SÁCH ===== */}
                {sheetSubView === 'policy' && (() => {
                  const q = policySearchQuery.toLowerCase().trim();
                  const carModel = (activeSheetOrder['Dòng xe'] || '').toLowerCase().trim();
                  let list = availablePolicies.filter((p) =>
                    (p.ten_chinh_sach || '').toLowerCase().includes(q) || (p.dong_xe || '').toLowerCase().includes(q)
                  );
                  if (showOnlyMatchModel && carModel) {
                    list = list.filter((p) => {
                      const pm = (p.dong_xe || '').toLowerCase().trim();
                      if (!pm || pm.includes('tất cả')) return true;
                      return pm.includes(carModel) || carModel.includes(pm);
                    });
                  }
                  // Đưa các chính sách đã chọn lên đầu danh sách
                  list = [...list].sort((a, b) => Number(selectedPolicyNames.includes(b.ten_chinh_sach)) - Number(selectedPolicyNames.includes(a.ten_chinh_sach)));
                  const togglePolicy = (name: string) =>
                    setSelectedPolicyNames((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

                  return (
                    <div className="space-y-2 pb-14">
                      {/* Tìm kiếm */}
                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={policySearchQuery} onChange={(e) => setPolicySearchQuery(e.target.value)} placeholder="Tìm chính sách..." className="w-full h-9 pl-8 pr-3 rounded-xl bg-white border border-slate-200 text-[12px] focus:outline-none focus:border-slate-400" />
                      </div>

                      {/* Lọc theo dòng xe */}
                      <div className="flex items-center justify-between px-0.5">
                        <button
                          type="button"
                          onClick={() => setShowOnlyMatchModel((v) => !v)}
                          className="flex items-center gap-2 text-[11.5px] text-slate-600 active:opacity-60"
                        >
                          <span className={`relative w-8 h-[18px] rounded-full transition-colors ${showOnlyMatchModel ? 'bg-slate-700' : 'bg-slate-300'}`}>
                            <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all ${showOnlyMatchModel ? 'left-[16px]' : 'left-[2px]'}`} />
                          </span>
                          <span>Chỉ dòng xe <b className="text-slate-800">{activeSheetOrder['Dòng xe'] || '—'}</b></span>
                        </button>
                        <span className="text-[10.5px] text-slate-400">Đã chọn {selectedPolicyNames.length}</span>
                      </div>

                      {/* Danh sách chọn nhiều */}
                      {isLoadingPolicies ? (
                        <p className="text-center text-xs text-slate-400 py-6">Đang tải chính sách...</p>
                      ) : list.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-6">Không có chính sách phù hợp.</p>
                      ) : (
                        <div className="bg-white rounded-2xl border border-slate-150 divide-y divide-slate-100 overflow-hidden">
                          {list.map((p) => {
                            const pName = p.ten_chinh_sach || '';
                            const checked = selectedPolicyNames.includes(pName);
                            return (
                              <button
                                key={p.id || pName}
                                type="button"
                                onClick={() => togglePolicy(pName)}
                                className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors active:bg-slate-100 ${checked ? 'bg-slate-50' : 'bg-white'}`}
                              >
                                <span className={`mt-0.5 w-[18px] h-[18px] rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'bg-slate-700 border-slate-700' : 'bg-white border-slate-300'}`}>
                                  {checked && <Check size={12} strokeWidth={3} className="text-white" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className={`block text-[12px] leading-snug ${checked ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>{pName}</span>
                                  {p.dong_xe && <span className="block text-[10px] text-slate-400 mt-0.5">{p.dong_xe}</span>}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ===== SUB-VIEW: CHUYỂN XE ===== */}
                {sheetSubView === 'transfer' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex items-center justify-between text-xs">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase block">Kho xuất</span>
                        <span className="font-bold text-slate-800 truncate block mt-0.5">{carWarehouseLocation || 'Kho QL13 (HCM)'}</span>
                      </div>
                      <Truck size={16} className="text-indigo-500 mx-2" />
                      <div className="flex-1 min-w-0 text-right">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase block">Kho đích</span>
                        <span className="font-bold text-indigo-700 block mt-0.5">Thuận An (K83)</span>
                      </div>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-150 space-y-3">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block mb-1">Lý do điều chuyển *</span>
                        <select value={transferReason} onChange={(e) => setTransferReason(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold focus:outline-none">
                          <option value="Điều chuyển xe nội bộ làm PDI chuẩn bị giao KH">Điều chuyển xe nội bộ làm PDI chuẩn bị giao KH</option>
                          <option value="Lấy xe về PDI giao KH">Lấy xe về PDI giao KH</option>
                          <option value="Chuyển về Showroom Thuận An trưng bày / giao xe">Chuyển về Showroom Thuận An trưng bày / giao xe</option>
                          <option value="Chuyển xe đi đăng ký / đăng kiểm">Chuyển xe đi đăng ký / đăng kiểm</option>
                          <option value="Khác">Lý do khác...</option>
                        </select>
                        {transferReason === 'Khác' && (
                          <input type="text" value={customTransferReason} onChange={(e) => setCustomTransferReason(e.target.value)} placeholder="Nhập lý do cụ thể..." className="w-full h-10 px-3 mt-1.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-700 block mb-1">Ghi chú</span>
                        <textarea value={transferNote} onChange={(e) => setTransferNote(e.target.value)} rows={2} placeholder="Ghi chú cho Admin lập phiếu..." className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none resize-none" />
                      </div>
                    </div>
                    <button type="button" onClick={handleSendTransferRequest} disabled={isSubmittingTransfer} className="w-full h-10 rounded-xl bg-indigo-600 disabled:opacity-50 text-white font-bold text-[13px] flex items-center justify-center space-x-1.5 active:scale-[0.98] transition-all">
                      <Truck size={14} />
                      <span>{isSubmittingTransfer ? 'Đang gửi...' : 'Gửi Yêu Cầu Chuyển Xe'}</span>
                    </button>
                  </div>
                )}
              </div>
              )}

              {/* Footer Lưu chính sách */}
              {sheetSubView === 'policy' && (
                <div className="px-3.5 py-2.5 border-t border-slate-150 bg-white/95 backdrop-blur-sm flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSheetSubView('detail')}
                    className="h-9 px-4 rounded-xl bg-slate-100 text-slate-600 font-medium text-[12px] active:scale-[0.97] transition-all"
                  >
                    Huỷ
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePolicies}
                    disabled={isSavingPolicy}
                    className="flex-1 h-9 rounded-xl bg-slate-800 active:bg-slate-900 disabled:opacity-50 text-white font-semibold text-[12px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                  >
                    <Check size={13} />
                    <span>{isSavingPolicy ? 'Đang lưu...' : `Lưu chính sách (${selectedPolicyNames.length})`}</span>
                  </button>
                </div>
              )}

              {/* Sheet Footer Action Hub (Các Nút Đồng Cấp & Bằng Nhau Phong Cách iOS) */}
              {sheetSubView === 'detail' && (() => {
                // Gom toàn bộ các nút tác nghiệp khả dụng thành một hệ thống đồng cấp phong cách iOS
                const allActionButtons = [
                  // Nút tác nghiệp quy trình chính (Apple Primary)
                  canRequestInvoice && (
                    <button
                      key="request-invoice"
                      onClick={() => setSheetSubView('request_invoice')}
                      className="h-9 px-3 rounded-xl bg-slate-800 active:bg-slate-900 active:scale-[0.97] text-white font-semibold text-[12px] tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileText size={13} className="flex-shrink-0" />
                      <span className="truncate">Xuất Hóa Đơn</span>
                    </button>
                  ),
                  canAddSupplement && (
                    <button
                      key="supplement"
                      onClick={() => {
                        const ord = activeSheetOrder;
                        setActiveSheetOrder(null);
                        onSupplement?.(ord);
                      }}
                      className="h-9 px-3 rounded-xl bg-slate-800 active:bg-slate-900 active:scale-[0.97] text-white font-semibold text-[12px] tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Upload size={13} className="flex-shrink-0" />
                      <span className="truncate">Bổ Sung Hồ Sơ</span>
                    </button>
                  ),
                  canDownloadInvoice && (
                    <button
                      key="view-invoice"
                      onClick={handleOpenInvoiceUrl}
                      className="h-9 px-3 rounded-xl bg-slate-800 active:bg-slate-900 active:scale-[0.97] text-white font-semibold text-[12px] tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Receipt size={13} className="flex-shrink-0" />
                      <span className="truncate">Xem Hóa Đơn</span>
                    </button>
                  ),

                  // Nút điều chuyển xe / In phiếu DNX
                  canShowTransferHub && (
                    hasExistingDnx ? (
                      <button
                        key="print-dnx"
                        onClick={handleOpenPrintDnx}
                        className="h-9 px-3 rounded-xl bg-slate-800 active:bg-slate-900 active:scale-[0.97] text-white font-semibold text-[12px] tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        title={`Đã lập phiếu ${transferRequest?.soCtDnx || activeSheetOrder.so_ct_dnx || 'DNX'}. Bấm để xem và in phiếu.`}
                      >
                        <Printer size={13} className="text-white flex-shrink-0" />
                        <span className="truncate">In Phiếu DNX</span>
                      </button>
                    ) : isCarAlreadyAtThuanAn ? null : (
                      <button
                        key="transfer"
                        onClick={() => setSheetSubView('transfer')}
                        className={`flex-1 h-9 rounded-xl font-medium text-[12px] tracking-tight flex flex-row items-center justify-center gap-1.5 active:scale-[0.96] transition-all cursor-pointer ${transferRequest?.status === 'pending'
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-slate-100 active:bg-slate-200 text-slate-600'
                          }`}
                        title="Yêu cầu Admin lập phiếu điều chuyển xe nội bộ (DNX) về showroom Thuận An"
                      >
                        <Truck size={15} className="flex-shrink-0" />
                        <span className="truncate">{transferRequest?.status === 'pending' ? 'Chờ Chuyển' : 'Chuyển Xe'}</span>
                        {transferRequest?.status === 'pending' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse ml-0.5 flex-shrink-0" />
                        )}
                      </button>
                    )
                  ),

                  // Nút Sửa Đơn (iOS Neutral Fill)
                  canEdit && (
                    <button
                      key="edit"
                      onClick={() => setSheetSubView('edit')}
                      className="flex-1 h-9 rounded-xl bg-slate-100 active:bg-slate-200 active:scale-[0.96] text-slate-600 font-medium text-[12px] tracking-tight flex flex-row items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Edit3 size={15} className="flex-shrink-0" />
                      <span className="truncate">Sửa Đơn</span>
                    </button>
                  ),

                  // Nút Hủy Đơn (iOS Destructive Red)
                  canCancel && (
                    <button
                      key="cancel"
                      onClick={() => setSheetSubView('cancel')}
                      className="flex-1 h-9 rounded-xl bg-slate-100 active:bg-slate-200 active:scale-[0.96] text-slate-600 font-medium text-[12px] tracking-tight flex flex-row items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 size={15} className="flex-shrink-0 text-rose-500" />
                      <span className="truncate">Hủy Đơn</span>
                    </button>
                  ),

                  // Nút TB Giao Xe (iOS Indigo)
                  canDeliveryNotice && (
                    <button
                      key="delivery"
                      onClick={handleDownloadDeliveryWord}
                      className="flex-1 h-9 rounded-xl bg-slate-100 active:bg-slate-200 active:scale-[0.96] text-slate-600 font-medium text-[12px] tracking-tight flex flex-row items-center justify-center gap-1.5 transition-all cursor-pointer"
                      title="Tải văn bản Word Thông báo sẵn sàng giao xe"
                    >
                      <FileDown size={15} className="flex-shrink-0" />
                      <span className="truncate">TB Giao Xe</span>
                    </button>
                  ),
                ].filter(Boolean);

                const hasActionButtons = allActionButtons.length > 0;
                const isPendingApproval = !isCancelled && (generalStatus.includes('chờ phê duyệt') || generalStatus.includes('chờ duyệt') || (generalStatus.includes('yêu cầu') && !isSupplementRequested));
                const isPendingSigning = !isCancelled && generalStatus.includes('chờ ký');
                const isInvoiceIssued = !isCancelled && (generalStatus.includes('đã xuất hóa đơn') || generalStatus.includes('đã xuất'));

                if (!hasActionButtons && !isCancelled && !isPendingApproval && !isPendingSigning && !isInvoiceIssued) {
                  return null;
                }

                return (
                  <div className="px-3.5 py-2.5 border-t border-slate-150 bg-white/95 backdrop-blur-sm space-y-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.03)]">
                    {/* THÔNG BÁO TRẠNG THÁI TIẾN ĐỘ (NẾU ĐƠN Ở GIAI ĐOẠN CHỜ HOẶC ĐÃ HỦY) */}
                    {isCancelled ? (
                      <div className="py-1.5 px-3 rounded-[10px] bg-slate-100 text-slate-500 text-[11px] font-medium text-center border border-slate-200 flex items-center justify-center space-x-1.5">
                        <AlertCircle size={13} className="text-slate-400" />
                        <span>Đơn hàng đã hủy (Chỉ xem)</span>
                      </div>
                    ) : isPendingApproval ? (
                      <div className="py-1.5 px-3 rounded-[10px] bg-amber-50 text-amber-800 border border-amber-200/70 text-[11px] font-medium text-center flex items-center justify-center space-x-1.5">
                        <Clock size={13} className="text-amber-600 animate-pulse" />
                        <span>Hồ sơ đang chờ Kế toán kiểm tra & phê duyệt</span>
                      </div>
                    ) : isPendingSigning ? (
                      <div className="py-1.5 px-3 rounded-[10px] bg-purple-50 text-purple-800 border border-purple-200/70 text-[11px] font-medium text-center flex items-center justify-center space-x-1.5">
                        <FileCheck size={13} className="text-purple-600 animate-pulse" />
                        <span>Hóa đơn đã lập, đang chờ Ban Giám Đốc ký điện tử</span>
                      </div>
                    ) : isInvoiceIssued && !canDownloadInvoice ? (
                      <div className="py-1.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/70 text-[11px] font-medium text-center flex items-center justify-center space-x-1.5">
                        <Receipt size={13} className="text-emerald-600" />
                        <span>Đã xuất hóa đơn thành công</span>
                      </div>
                    ) : null}

                    {/* LƯỚI CÁC NÚT TÁC NGHIỆP: ĐỒNG CẤP & BẰNG NHAU PHONG CÁCH IOS */}
                    {hasActionButtons && (() => {
                      const PRIMARY_KEYS = ['request-invoice', 'supplement', 'view-invoice', 'print-dnx'];
                      const primaryBtns = allActionButtons.filter((b: any) => PRIMARY_KEYS.includes(String(b?.key)));
                      const secondaryBtns = allActionButtons.filter((b: any) => !PRIMARY_KEYS.includes(String(b?.key)));
                      return (
                        <div className="space-y-2">
                          {primaryBtns.length > 0 && (
                            <div className={`grid gap-2 ${primaryBtns.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                              {primaryBtns}
                            </div>
                          )}
                          {secondaryBtns.length > 0 && (
                            <div className="flex gap-2">
                              {secondaryBtns}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* Các chức năng (Xuất HĐ, Sửa, Hủy, Chính sách, Chuyển xe) hiển thị trực tiếp trong Sheet chi tiết */}

      {/* Modal In Phiếu DNX */}
      <CyberDnxPrintModal
        isOpen={isPrintDnxOpen}
        onClose={() => setIsPrintDnxOpen(false)}
        data={printDnxData}
      />
    </div>
  );
};
