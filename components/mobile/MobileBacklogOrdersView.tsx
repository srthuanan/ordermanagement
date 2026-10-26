import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  Search,
  X,
  SlidersHorizontal,
  RotateCw,
  Phone,
  Copy,
  MapPin,
  Car,
  FileText,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { getBacklogOrders, updateBacklogTienDo } from '../../services/api/adminService';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';
import { getExteriorSwatchColor } from '../../utils/styleUtils';
import moment from 'moment';

export type BacklogProgressType = 'Chờ xe' | 'Cần xe' | 'Hoàn cọc' | 'Hủy cọc';

interface MobileBacklogOrdersViewProps {
  currentUser: string;
  currentUserName?: string;
  userRole?: string;
  isCurrentUserAdmin?: boolean;
  onBack: () => void;
  showToast?: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info') => void;
  orders?: any[];
  onSelectOrder?: (order: any) => void;
  onNavigateStock?: (vin: string) => void;
}

const normalizeStr = (s?: string): string => {
  if (!s) return '';
  return s.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
};

const isNameMatch = (orderTvbh?: string, targetName?: string): boolean => {
  const a = normalizeStr(orderTvbh);
  const b = normalizeStr(targetName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
};

const formatVND = (num?: number | string): string => {
  const val = Number(num || 0);
  if (!val) return '0 ₫';
  return val.toLocaleString('vi-VN') + ' ₫';
};

const PROGRESS_STYLES: Record<BacklogProgressType, {
  shortLabel: string;
  label: string;
  icon: string;
  activeBtnCls: string;
  idleBtnCls: string;
}> = {
  'Chờ xe': {
    shortLabel: 'Chờ xe',
    label: 'Chờ xe',
    icon: 'fa-hourglass-half',
    activeBtnCls: 'bg-sky-600 text-white font-bold shadow-xs',
    idleBtnCls: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
  },
  'Cần xe': {
    shortLabel: '⚡ Cần xe',
    label: 'Cần xe',
    icon: 'fa-bolt',
    activeBtnCls: 'bg-emerald-600 text-white font-bold shadow-xs',
    idleBtnCls: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
  },
  'Hoàn cọc': {
    shortLabel: 'Hoàn cọc',
    label: 'Hoàn cọc',
    icon: 'fa-rotate-left',
    activeBtnCls: 'bg-amber-600 text-white font-bold shadow-xs',
    idleBtnCls: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
  },
  'Hủy cọc': {
    shortLabel: 'Hủy cọc',
    label: 'Hủy cọc',
    icon: 'fa-ban',
    activeBtnCls: 'bg-rose-600 text-white font-bold shadow-xs',
    idleBtnCls: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
  }
};

const PROGRESS_BADGE_META: Record<BacklogProgressType, {
  bg: string;
  text: string;
  border: string;
  dot: string;
}> = {
  'Chờ xe': {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200/90',
    dot: 'bg-sky-500'
  },
  'Cần xe': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200/90',
    dot: 'bg-emerald-500'
  },
  'Hoàn cọc': {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200/90',
    dot: 'bg-amber-500'
  },
  'Hủy cọc': {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200/90',
    dot: 'bg-rose-500'
  }
};

export const MobileBacklogOrdersView: React.FC<MobileBacklogOrdersViewProps> = ({
  currentUser,
  currentUserName,
  userRole,
  isCurrentUserAdmin = false,
  onBack,
  showToast,
  orders = [],
  onSelectOrder,
  onNavigateStock
}) => {
  const copyWithFeedback = useCopyFeedback();
  const [backlogOrders, setBacklogOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [mobileDetailOrder, setMobileDetailOrder] = useState<any | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [selectedProgress, setSelectedProgress] = useState<string>('all');
  const [selectedPairing, setSelectedPairing] = useState<string>('all');
  const [selectedTvbh, setSelectedTvbh] = useState<string>('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Identify if current user is Sales Manager
  const isManager = useMemo(() => {
    if (isCurrentUserAdmin) return false;
    const r = (userRole || '').toLowerCase();
    return r.includes('trưởng phòng') || r.includes('tpkd') || r.includes('trưởng nhóm');
  }, [isCurrentUserAdmin, userRole]);

  // Team members list for TPKD
  const [teamMembers, setTeamMembers] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadTeamMembers = async () => {
      if (!isManager) return;
      try {
        const { data: teamRows } = await supabase
          .from('user_roles')
          .select('full_name, team_leader')
          .eq('status', 'active');

        if (teamRows && isMounted) {
          const myNames = [currentUserName, currentUser].filter(Boolean).map(n => normalizeStr(n));
          const members: string[] = [];

          teamRows.forEach(r => {
            const leader = normalizeStr(r.team_leader);
            if (myNames.some(me => me === leader || leader.includes(me) || me.includes(leader))) {
              if (r.full_name) members.push(r.full_name);
            }
          });

          setTeamMembers(Array.from(new Set(members.filter(Boolean))));
        }
      } catch (err) {
        console.error('Lỗi lấy danh sách thành viên phòng kinh doanh:', err);
      }
    };

    loadTeamMembers();
    return () => { isMounted = false; };
  }, [isManager, currentUserName, currentUser]);

  // Fetch backlog orders from Supabase
  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const res = await getBacklogOrders();
      if (res.status === 'SUCCESS' && Array.isArray(res.data)) {
        setBacklogOrders(res.data);
      }
    } catch (err: any) {
      console.error('Lỗi tải danh sách đơn cọc tồn:', err);
      showToast?.('Lỗi tải dữ liệu', err.message || 'Không thể tải danh sách đơn tồn', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('realtime_mobile_donhang_ton')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donhang_ton' }, () => {
        fetchOrders(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  // Auto link paired VINs
  useEffect(() => {
    let isMounted = true;
    const autoLinkPairedOrders = async () => {
      try {
        const { data: pairedRows } = await supabase
          .from('donhang')
          .select('so_don_hang, ma_hd_cyber, vin, ket_qua, ten_khach_hang')
          .not('vin', 'is', null);

        if (!isMounted) return;

        const lookup: Record<string, { vin: string; so_don_hang?: string }> = {};

        if (pairedRows) {
          pairedRows.forEach(r => {
            const shd = (r.ma_hd_cyber || '').trim();
            const sdh = (r.so_don_hang || '').trim();
            const vin = (r.vin || '').trim();
            if (shd && vin) lookup[shd] = { vin, so_don_hang: sdh };
            if (sdh && vin) lookup[sdh] = { vin, so_don_hang: sdh };
          });
        }

        if (orders && orders.length > 0) {
          orders.forEach(o => {
            const shd = (o['Mã HĐ Cyber'] || o.ma_hd_cyber || '').trim();
            const sdh = (o['Số đơn hàng'] || o.so_don_hang || '').trim();
            const vin = (o.VIN || o['Số khung'] || o.vin || '').trim();
            if (shd && vin) lookup[shd] = { vin, so_don_hang: sdh };
            if (sdh && vin) lookup[sdh] = { vin, so_don_hang: sdh };
          });
        }

        setBacklogOrders(prev => {
          let changed = false;
          const next = prev.map(item => {
            const shd = (item.so_hop_dong || '').trim();
            const sdh = (item.so_don_hang || '').trim();
            const match = lookup[shd] || (sdh && lookup[sdh]);

            if (match && match.vin) {
              const needsVinUpdate = !item.vin || item.vin !== match.vin;
              const needsSdhUpdate = match.so_don_hang && item.so_don_hang !== match.so_don_hang;

              if (needsVinUpdate || needsSdhUpdate) {
                changed = true;
                if (needsVinUpdate) {
                  supabase.from('donhang_ton')
                    .update({ 
                      vin: match.vin, 
                      so_don_hang: match.so_don_hang || item.so_don_hang 
                    })
                    .eq('id', item.id)
                    .then();
                }
                return { ...item, vin: match.vin, so_don_hang: match.so_don_hang || item.so_don_hang };
              }
            }
            return item;
          });
          return changed ? next : prev;
        });
      } catch (err) {
        console.error('Lỗi tự động đối soát đơn cọc tồn:', err);
      }
    };

    autoLinkPairedOrders();
    return () => { isMounted = false; };
  }, [orders]);

  // Handle change deposit progress
  const handleProgressChange = async (orderId: string, newProgress: BacklogProgressType, currentVal: BacklogProgressType) => {
    if (newProgress === currentVal) return;
    setUpdatingId(orderId);

    setBacklogOrders(prev => prev.map(o => o.id === orderId ? { ...o, tien_do: newProgress } : o));

    try {
      const res = await updateBacklogTienDo(orderId, newProgress);
      if (res.status === 'SUCCESS') {
        showToast?.('Đã cập nhật', `Tiến độ chuyển sang: "${newProgress}"`, 'success');
      } else {
        setBacklogOrders(prev => prev.map(o => o.id === orderId ? { ...o, tien_do: currentVal } : o));
        showToast?.('Lỗi cập nhật', res.message || 'Không thể lưu tiến độ', 'error');
      }
    } catch (e: any) {
      setBacklogOrders(prev => prev.map(o => o.id === orderId ? { ...o, tien_do: currentVal } : o));
      showToast?.('Lỗi cập nhật', e.message || 'Đã có lỗi xảy ra', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Base orders filtered by role
  const baseOrdersForUser = useMemo(() => {
    if (isCurrentUserAdmin) {
      return backlogOrders;
    }
    if (isManager) {
      if (teamMembers.length === 0) {
        return backlogOrders.filter(o => 
          isNameMatch(o.tvbh_name, currentUser) || 
          isNameMatch(o.tvbh_name, currentUserName)
        );
      }
      return backlogOrders.filter(o => 
        teamMembers.some(member => isNameMatch(o.tvbh_name, member))
      );
    }
    return backlogOrders.filter(o => 
      isNameMatch(o.tvbh_name, currentUser) || 
      isNameMatch(o.tvbh_name, currentUserName)
    );
  }, [backlogOrders, isCurrentUserAdmin, isManager, teamMembers, currentUser, currentUserName]);

  // Model categories with counts
  const modelTabs = useMemo(() => {
    const counts: Record<string, number> = {};
    baseOrdersForUser.forEach(o => {
      const pb = o.phien_ban || '';
      const match = pb.match(/^(VF\s*[0-9]|VF\s*e34|LIMO|MINIO|EC\s*VAN)/i);
      const m = match ? match[0].toUpperCase() : pb.split(' ')[0] || 'Khác';
      counts[m] = (counts[m] || 0) + 1;
    });
    return Object.keys(counts).sort().map(m => ({
      id: m,
      label: m,
      count: counts[m]
    }));
  }, [baseOrdersForUser]);

  // TVBH options
  const tvbhOptions = useMemo(() => {
    if (!isCurrentUserAdmin && !isManager) return [];
    return Array.from(new Set(baseOrdersForUser.map(o => o.tvbh_name).filter(Boolean))).sort();
  }, [baseOrdersForUser, isCurrentUserAdmin, isManager]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return baseOrdersForUser.filter(order => {
      // 1. Dòng xe
      if (selectedModel !== 'all') {
        const pb = (order.phien_ban || '').toLowerCase();
        const sm = selectedModel.toLowerCase();
        if (sm.startsWith('vf')) {
          if (!pb.startsWith(sm)) return false;
        } else {
          if (!pb.includes(sm)) return false;
        }
      }

      // 2. Tiến độ cọc
      if (selectedProgress !== 'all') {
        const p = (order.tien_do as BacklogProgressType) || 'Chờ xe';
        if (p !== selectedProgress) return false;
      }

      // 3. Ghép xe
      if (selectedPairing !== 'all') {
        const hasVin = !!(order.vin && order.vin.trim().length > 5);
        if (selectedPairing === 'paired' && !hasVin) return false;
        if (selectedPairing === 'unpaired' && hasVin) return false;
      }

      // 4. TVBH
      if (selectedTvbh !== 'all') {
        if (!isNameMatch(order.tvbh_name, selectedTvbh)) return false;
      }

      // 5. Search
      if (searchTerm) {
        const term = normalizeStr(searchTerm);
        const kh = normalizeStr(order.khach_hang);
        const sdt = normalizeStr(order.so_dien_thoai);
        const shd = normalizeStr(order.so_hop_dong);
        const sdh = normalizeStr(order.so_don_hang);
        const vin = normalizeStr(order.vin);
        const tv = normalizeStr(order.tvbh_name);
        const pb = normalizeStr(order.phien_ban);

        if (!kh.includes(term) && !sdt.includes(term) && !shd.includes(term) &&
            !sdh.includes(term) && !vin.includes(term) && !tv.includes(term) && !pb.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [baseOrdersForUser, selectedModel, selectedProgress, selectedPairing, selectedTvbh, searchTerm]);

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedModel !== 'all') count++;
    if (selectedProgress !== 'all') count++;
    if (selectedPairing !== 'all') count++;
    if (selectedTvbh !== 'all') count++;
    return count;
  }, [selectedModel, selectedProgress, selectedPairing, selectedTvbh]);

  // Reset filters
  const handleResetFilters = () => {
    setSelectedModel('all');
    setSelectedProgress('all');
    setSelectedPairing('all');
    setSelectedTvbh('all');
    setSearchTerm('');
  };

  // Pull refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchOrders(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast?.('Đã cập nhật', 'Danh sách hợp đồng cọc tồn đã được đồng bộ mới nhất.', 'info');
    }, 800);
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
            ĐƠN TỒN
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
      {/* 📋 2. DANH SÁCH ĐƠN CỌC TỒN MOBILE-FIRST (COMPACT IOS LIST) */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-y-auto px-2.5 py-2 no-scrollbar">
        {isLoading && backlogOrders.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center px-4">
            <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-bold text-slate-700">Đang nạp hợp đồng cọc tồn từ Cyber ERP...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-white text-slate-400 flex items-center justify-center mb-3 shadow-xs border border-slate-200">
              <FileText size={22} strokeWidth={1.8} />
            </div>
            <h3 className="text-xs font-bold text-slate-700">Không tìm thấy hợp đồng cọc tồn</h3>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
              {activeFiltersCount > 0 || searchTerm
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc.'
                : 'Hiện tại không có hợp đồng cọc tồn nào cần theo dõi.'}
            </p>
            {(activeFiltersCount > 0 || searchTerm) && (
              <button
                onClick={handleResetFilters}
                className="mt-3 px-3 py-1 rounded-full bg-blue-600 text-white text-[11px] font-semibold shadow-xs active:scale-95"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* 📱 1. GIAO DIỆN COMPACT IOS LIST: DANH SÁCH TINH GỌN CHUẨN APPLE */
          /* ========================================================================= */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden divide-y divide-slate-100">
            {filteredOrders.map((order, idx) => {
              const currentProgress: BacklogProgressType = (order.tien_do as BacklogProgressType) || 'Chờ xe';
              const badgeMeta = PROGRESS_BADGE_META[currentProgress] || PROGRESS_BADGE_META['Chờ xe'];
              const swatchColor = getExteriorSwatchColor(order.ngoai_that);
              const carDisplayName = order.phien_ban || 'Chưa định phiên bản';
              const shortModel = carDisplayName.split(' ').slice(0, 2).join(' ');

              return (
                <div
                  key={order.id || order.so_don_hang || idx}
                  onClick={() => {
                    setMobileDetailOrder(order);
                    onSelectOrder?.(order);
                  }}
                  className="px-2 py-1.5 hover:bg-slate-50/80 active:bg-slate-100/90 transition-colors cursor-pointer flex items-center justify-between gap-1.5"
                >
                  {/* CỘT TRÁI: STT + KHÁCH HÀNG + XE & THÔNG TIN */}
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {/* Số thứ tự tròn nhỏ gọn */}
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 font-mono text-[8.5px] font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      {/* Hàng 1: Tên khách hàng (không in đậm) + Dòng xe kèm chấm màu */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-[10.5px] text-slate-800 uppercase tracking-tight truncate">
                          {order.khach_hang || '—'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 truncate flex-shrink-0">
                          <span
                            className="w-1.5 h-1.5 rounded-full border border-slate-300 flex-shrink-0"
                            style={{ backgroundColor: swatchColor }}
                          />
                          <span>{shortModel}</span>
                        </span>
                      </div>

                      {/* Hàng 2: SĐT • VIN (hoặc Chờ VIN) • TVBH */}
                      <div className="flex items-center gap-1.5 text-[8.5px] text-slate-400 font-medium truncate">
                        {order.so_dien_thoai ? (
                          <span className="font-mono text-blue-600 font-semibold text-[9px]">{order.so_dien_thoai}</span>
                        ) : (
                          <span className="font-mono truncate">{order.so_hop_dong?.split('/')[0] || 'HĐ'}</span>
                        )}
                        <span>•</span>
                        {order.vin && order.vin.length > 5 ? (
                          <span className="inline-flex items-center gap-0.5 font-mono font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/70 text-[8px]">
                            <Car size={7.5} />
                            <span>{order.vin.slice(-8)}</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium text-[8px]">Chưa ghép</span>
                        )}
                        {(isCurrentUserAdmin || isManager) && order.tvbh_name && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500 truncate uppercase font-semibold text-[8.5px]">
                              {order.tvbh_name.split(' ').slice(-2).join(' ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CỘT PHẢI: TIỀN CỌC + HUY HIỆU TIẾN ĐỘ + CHEVRON */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="text-right space-y-0.5">
                      <div className="text-[10.5px] font-mono font-bold text-emerald-700 tracking-tight leading-none">
                        {formatVND(order.tien_coc)}
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[7.5px] font-bold tracking-tight border ${badgeMeta.bg} ${badgeMeta.text} ${badgeMeta.border} shadow-2xs leading-tight`}
                        >
                          <span className={`w-1 h-1 rounded-full ${badgeMeta.dot}`} />
                          <span>{PROGRESS_STYLES[currentProgress]?.label || currentProgress}</span>
                        </span>
                      </div>
                    </div>

                    <ChevronRight size={11} className="text-slate-300 flex-shrink-0 -mr-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 🔍 3. APPLE FLOATING BOTTOM DOCK: Ô TÌM KIẾM & NÚT BỘ LỌC TINH GỌN */}
      {/* ========================================================================= */}
      <div className="w-full bg-white/92 backdrop-blur-2xl border-t border-black/[0.08] px-3 pt-1.5 pb-2 shadow-[0_-6px_20px_rgba(0,0,0,0.06)] z-30 flex-shrink-0 space-y-1">
        {/* Dải tag bộ lọc đang áp dụng */}
        {(activeFiltersCount > 0) && (
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
            {selectedProgress !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 flex-shrink-0">
                <span>{selectedProgress}</span>
                <button
                  onClick={() => setSelectedProgress('all')}
                  className="hover:text-slate-900 active:scale-90 ml-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            )}
            {selectedPairing !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 flex-shrink-0">
                <span>{selectedPairing === 'paired' ? 'Đã ghép' : 'Chưa ghép'}</span>
                <button
                  onClick={() => setSelectedPairing('all')}
                  className="hover:text-slate-900 active:scale-90 ml-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            )}
            {selectedTvbh !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 flex-shrink-0">
                <span>TVBH: {selectedTvbh}</span>
                <button
                  onClick={() => setSelectedTvbh('all')}
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
              placeholder="Tìm tên khách, số VIN, số HĐ..."
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
      {/* 🎛️ 4. APPLE IOS FILTER SHEET TINH GỌN (THU NHỎ GỌN GÀNG CHUẨN NATIVE) */}
      {/* ========================================================================= */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop mờ chuẩn iOS */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsFilterSheetOpen(false)}
          />

          {/* iOS Bottom Sheet Container: max-h-[58dvh], rounded-t-2xl */}
          <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col max-h-[58dvh] overflow-hidden">
            {/* Grab handle thanh kéo chuẩn iOS nhỏ gọn */}
            <div className="pt-1.5 pb-0.5 flex justify-center">
              <div className="w-7 h-1 rounded-full bg-slate-300" />
            </div>

            {/* Apple Navigation Bar nhỏ gọn */}
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
                Bộ Lọc Cọc Tồn
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

            {/* Body các mục lọc tinh gọn */}
            <div className="px-3.5 py-2.5 overflow-y-auto space-y-3 text-xs no-scrollbar flex-1">
              {/* Mục 1: Dòng xe */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
                  Dòng Xe
                </label>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setSelectedModel('all')}
                    className={`px-2 py-1 rounded-lg font-medium text-[10.5px] transition-all border ${
                      selectedModel === 'all'
                        ? 'bg-slate-800 text-white font-bold border-slate-800 shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border-slate-200/60'
                    }`}
                  >
                    Tất cả ({baseOrdersForUser.length})
                  </button>
                  {modelTabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedModel(t.id)}
                      className={`px-2 py-1 rounded-lg font-medium text-[10.5px] transition-all border ${
                        selectedModel === t.id
                          ? 'bg-slate-800 text-white font-bold border-slate-800 shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border-slate-200/60'
                      }`}
                    >
                      {t.label} ({t.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Mục 2: Tiến độ cọc */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tiến Độ Cọc
                </label>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setSelectedProgress('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium text-[10.5px] text-center transition-all border ${
                      selectedProgress === 'all'
                        ? 'bg-slate-800 text-white font-bold border-slate-800 shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border-slate-200/60'
                    }`}
                  >
                    Tất cả
                  </button>
                  {(['Chờ xe', 'Cần xe', 'Hoàn cọc', 'Hủy cọc'] as BacklogProgressType[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => setSelectedProgress(status)}
                      className={`px-2.5 py-1 rounded-lg font-medium text-[10.5px] text-center transition-all border ${
                        selectedProgress === status
                          ? 'bg-slate-800 text-white font-bold border-slate-800 shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border-slate-200/60'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mục 3: Tình trạng ghép xe */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
                  Ghép Xe
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'paired', label: 'Đã ghép xe' },
                    { id: 'unpaired', label: 'Chưa ghép xe' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPairing(p.id)}
                      className={`py-1 px-1 rounded-lg font-medium text-[10.5px] text-center transition-all border ${
                        selectedPairing === p.id
                          ? 'bg-slate-800 text-white font-bold border-slate-800 shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border-slate-200/60'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mục 4: Tư vấn bán hàng (cho Admin & TPKD) */}
              {(isCurrentUserAdmin || isManager) && tvbhOptions.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tư Vấn Bán Hàng
                  </label>
                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto no-scrollbar">
                    <button
                      onClick={() => setSelectedTvbh('all')}
                      className={`px-2 py-0.8 rounded-lg font-medium text-[10px] transition-all border ${
                        selectedTvbh === 'all'
                          ? 'bg-slate-800 text-white font-bold border-slate-800 shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border-slate-200/60'
                      }`}
                    >
                      Tất cả TVBH
                    </button>
                    {tvbhOptions.map((name) => (
                      <button
                        key={name}
                        onClick={() => setSelectedTvbh(name)}
                        className={`px-2 py-0.8 rounded-lg font-medium text-[10px] uppercase transition-all border ${
                          selectedTvbh === name
                            ? 'bg-slate-800 text-white font-bold border-slate-800 shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border-slate-200/60'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Nút Áp dụng ở chân sheet nhỏ gọn */}
            <div className="px-3.5 py-2 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between flex-shrink-0">
              <span className="text-[10.5px] text-slate-500 font-medium">
                Tìm thấy <strong className="text-slate-900 font-bold">{filteredOrders.length}</strong> hợp đồng
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
      {/* 📄 5. MODAL / BOTTOM SHEET XEM CHI TIẾT HỢP ĐỒNG CỌC TỒN MOBILE */}
      {/* ========================================================================= */}
      {mobileDetailOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setMobileDetailOrder(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
          >
            {/* Thanh quai kéo iOS */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

            {/* Tiêu đề Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 uppercase">
                  {mobileDetailOrder.khach_hang || 'Chi tiết hợp đồng'}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  HĐ: {mobileDetailOrder.so_hop_dong || mobileDetailOrder.so_don_hang}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileDetailOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center active:scale-90"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chi tiết nội dung */}
            <div className="space-y-3 text-xs">
              {/* Dòng xe & màu sắc */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Phiên bản xe:</span>
                  <span className="font-bold text-slate-900">{mobileDetailOrder.phien_ban || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Màu ngoại thất:</span>
                  <span className="font-semibold text-slate-800 uppercase flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-slate-300"
                      style={{ backgroundColor: getExteriorSwatchColor(mobileDetailOrder.ngoai_that) }}
                    />
                    {mobileDetailOrder.ngoai_that || 'Tiêu chuẩn'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Nội thất:</span>
                  <span className="text-slate-700">{mobileDetailOrder.noi_that || 'Tiêu chuẩn'}</span>
                </div>
              </div>

              {/* Tiền bạc & Ngày hợp đồng */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Tiền cọc:</span>
                  <span className="font-bold font-mono text-emerald-700 text-sm">{formatVND(mobileDetailOrder.tien_coc)}</span>
                </div>
                {Number(mobileDetailOrder.gia_tri_hd || 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Giá trị HĐ:</span>
                    <span className="font-mono text-slate-700">{formatVND(mobileDetailOrder.gia_tri_hd)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Ngày hợp đồng:</span>
                  <span className="font-mono text-slate-700">{moment(mobileDetailOrder.ngay_hop_dong || mobileDetailOrder.ngay_giao_dich).format('DD/MM/YYYY')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Tư vấn bán hàng:</span>
                  <span className="font-bold uppercase text-slate-800">{mobileDetailOrder.tvbh_name || '—'}</span>
                </div>
              </div>

              {/* Khách hàng & SĐT */}
              {mobileDetailOrder.so_dien_thoai && (
                <div className="flex gap-2">
                  <a
                    href={`tel:${mobileDetailOrder.so_dien_thoai}`}
                    className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs active:scale-95"
                  >
                    <Phone size={14} />
                    <span>Gọi {mobileDetailOrder.so_dien_thoai}</span>
                  </a>
                  <button
                    type="button"
                    onClick={(e) => copyWithFeedback(mobileDetailOrder.so_dien_thoai, e)}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-1 active:scale-95"
                    title="Sao chép số điện thoại"
                  >
                    <Copy size={13} />
                    <span>Chép SĐT</span>
                  </button>
                </div>
              )}

              {/* Số VIN & Kho xe */}
              {mobileDetailOrder.vin && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Số VIN đã ghép:</span>
                    <span className="font-mono font-bold text-emerald-950 text-xs">{mobileDetailOrder.vin}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const v = mobileDetailOrder.vin;
                      setMobileDetailOrder(null);
                      if (onNavigateStock) {
                        onNavigateStock(v);
                      } else {
                        window.dispatchEvent(new CustomEvent('navigate-stock', { detail: { vin: v } }));
                      }
                    }}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 active:scale-95 shadow-xs"
                  >
                    <MapPin size={12} />
                    <span>Xem kho</span>
                  </button>
                </div>
              )}

              {/* Đổi tiến độ cọc */}
              <div className="space-y-1.5 pt-1">
                <span className="text-slate-500 font-semibold block text-[11px]">Cập nhật tiến độ cọc:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Chờ xe', 'Cần xe', 'Hoàn cọc', 'Hủy cọc'] as BacklogProgressType[]).map((st) => {
                    const isCur = (mobileDetailOrder.tien_do || 'Chờ xe') === st;
                    const cfg = PROGRESS_STYLES[st];
                    return (
                      <button
                        key={st}
                        type="button"
                        disabled={updatingId === mobileDetailOrder.id}
                        onClick={async () => {
                          await handleProgressChange(mobileDetailOrder.id, st, mobileDetailOrder.tien_do || 'Chờ xe');
                          setMobileDetailOrder((prev: any) => prev ? { ...prev, tien_do: st } : null);
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:cursor-wait disabled:opacity-60 ${
                          isCur
                            ? `${cfg.activeBtnCls} border-transparent shadow-xs`
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Nút đóng */}
            <button
              type="button"
              onClick={() => setMobileDetailOrder(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold active:scale-95"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileBacklogOrdersView;
