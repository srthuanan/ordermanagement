import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Eye, PackageCheck, X, FileCheck, Ban, Pencil, ScrollText, User, Car, CreditCard, ArrowLeft, Info } from 'lucide-react';
import { Order, OrderStatus, InventoryItem } from '../types';
import { statusTone } from '../constants';
import { matchesVehicleConfig, canUseVehicleForPair } from '../utils/matching';
import { copyToClipboard } from '../utils/clipboard';
import { QueueRankingModal } from './modals/QueueRankingModal';

const viDateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

function parseDetailDate(value?: string) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoCandidate = new Date(trimmed);
  if (!Number.isNaN(isoCandidate.getTime()) && /\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return isoCandidate;
  }

  const parseWithPattern = (
    pattern: RegExp,
    map: (matches: RegExpExecArray) => { year: number; month: number; day: number; hour?: number; minute?: number; second?: number }
  ) => {
    const matches = pattern.exec(trimmed);
    if (!matches) return null;

    const parts = map(matches);
    const parsed = new Date(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour ?? 0,
      parts.minute ?? 0,
      parts.second ?? 0
    );

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  return (
    parseWithPattern(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
      (matches) => ({
        day: Number(matches[1]),
        month: Number(matches[2]),
        year: Number(matches[3]),
        hour: matches[4] ? Number(matches[4]) : 0,
        minute: matches[5] ? Number(matches[5]) : 0,
        second: matches[6] ? Number(matches[6]) : 0
      })
    ) ||
    parseWithPattern(
      /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
      (matches) => ({
        year: Number(matches[1]),
        month: Number(matches[2]),
        day: Number(matches[3]),
        hour: matches[4] ? Number(matches[4]) : 0,
        minute: matches[5] ? Number(matches[5]) : 0,
        second: matches[6] ? Number(matches[6]) : 0
      })
    ) ||
    null
  );
}

const formatDetailDate = (value?: string) => {
  const parsed = parseDetailDate(value);
  if (!parsed) return value || '—';
  return viDateTimeFormatter.format(parsed);
};

interface OrdersPanelProps {
  orders: Order[];
  allOrders?: Order[];
  inventory: InventoryItem[];
  currentUsername: string;
  canOverrideHeldVehicle: boolean;
  canPairOrder: boolean;
  canManageOrderActions: boolean;
  isUnpairingOrderId: string;
  isUpdatingPolicy: boolean;
  query: string;
  status: OrderStatus | 'Tất cả';
  onQueryChange: (value: string) => void;
  onStatusChange: (value: OrderStatus | 'Tất cả') => void;
  onViewOrder: (order: Order) => void;
  onPairOrder: (order: Order) => void;
  onUnpairOrder: (orderId: string) => void;
  onInvoiceOrder: (order: Order) => void;
  onCancelOrder: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onSelectPolicy: (order: Order) => void;
  showStaffColumn?: boolean;
}

export const OrdersPanel: React.FC<OrdersPanelProps> = ({
  orders,
  allOrders,
  inventory,
  currentUsername,
  canOverrideHeldVehicle,
  canPairOrder,
  canManageOrderActions,
  isUnpairingOrderId,
  isUpdatingPolicy,
  query,
  status,
  onQueryChange,
  onStatusChange,
  onViewOrder,
  onPairOrder,
  onUnpairOrder,
  onInvoiceOrder,
  onCancelOrder,
  onEditOrder,
  onSelectPolicy,
  showStaffColumn
}) => {
  const reviewStatuses: OrderStatus[] = ['Chờ phê duyệt', 'Đã phê duyệt', 'Yêu cầu bổ sung', 'Đã bổ sung', 'Chờ ký hóa đơn'];
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [isMobile, setIsMobile] = useState(false);
  const [showPolicyTooltip, setShowPolicyTooltip] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null,
    [orders, selectedOrderId]
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setIsMobile(media.matches);
    update();

    if (media.addEventListener) {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (!orders.length) {
      if (selectedOrderId) {
        setSelectedOrderId('');
      }
      setMobileView('list');
      return;
    }

    if (!selectedOrderId || !orders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

  const totalOrders = orders.length;
  const unpairedOrders = orders.filter((order) => order.status === 'Chưa ghép').length;
  const reviewOrders = orders.filter((order) => reviewStatuses.includes(order.status)).length;
  const issuedOrders = orders.filter((order) => order.status === 'Đã xuất hóa đơn').length;
  const canceledOrders = orders.filter((order) => order.status === 'Đã hủy').length;

  const selectedCandidates = selectedOrder
    ? inventory.filter(
        (item) =>
          matchesVehicleConfig(selectedOrder, item) &&
          canUseVehicleForPair(item, currentUsername, canOverrideHeldVehicle)
      )
    : [];

  const selectedCanPair =
    Boolean(selectedOrder) &&
    canPairOrder &&
    selectedOrder.status === 'Chưa ghép' &&
    selectedCandidates.length > 0;
  const selectedCanUnpair = Boolean(selectedOrder) && canManageOrderActions && selectedOrder.status === 'Đã ghép';
  const selectedCanInvoice = Boolean(selectedOrder) && canManageOrderActions && selectedOrder.status === 'Đã ghép';
  const selectedCanCancel =
    Boolean(selectedOrder) &&
    canManageOrderActions &&
    selectedOrder.status !== 'Đã hủy' &&
    selectedOrder.status !== 'Đã xuất hóa đơn';
  const selectedCanEdit =
    Boolean(selectedOrder) &&
    canManageOrderActions &&
    !['Đã xuất hóa đơn', 'Đã hủy', 'Chờ ký hóa đơn'].includes(selectedOrder.status);
  const selectedCanPolicy = Boolean(selectedOrder) && canManageOrderActions && selectedOrder.status !== 'Đã hủy';

  useEffect(() => {
    if (!isMobile) {
      setMobileView('list');
    }
  }, [isMobile]);

  return (
    <section
      className={isMobile ? `panel orders-panel ${mobileView === 'detail' ? 'orders-mobile-detail' : 'orders-mobile-list'}` : 'panel orders-panel'}
    >
      <div className="orders-modular-workspace" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Cánh trái: Bảng dữ liệu đơn hàng & Bộ lọc */}
        <div className="orders-data-side">
          {/* 1. Hàng Metrics rút gọn siêu gọn */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span className="tag" style={{ fontSize: '10.5px', padding: '3px 8px', background: '#f1f5f9', color: '#334155', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: 600 }}>
              Tổng: <strong>{totalOrders}</strong>
            </span>
            <span className="tag" style={{ fontSize: '10.5px', padding: '3px 8px', background: '#ecfdf5', color: '#047857', borderRadius: '6px', border: '1px solid #a7f3d0', fontWeight: 600 }}>
              Chưa ghép: <strong>{unpairedOrders}</strong>
            </span>
            <span className="tag" style={{ fontSize: '10.5px', padding: '3px 8px', background: '#fffbeb', color: '#b45309', borderRadius: '6px', border: '1px solid #fde68a', fontWeight: 600 }}>
              Chờ xử lý: <strong>{reviewOrders}</strong>
            </span>
            <span className="tag" style={{ fontSize: '10.5px', padding: '3px 8px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '6px', border: '1px solid #bfdbfe', fontWeight: 600 }}>
              Đã xuất HĐ: <strong>{issuedOrders}</strong>
            </span>
            <span className="tag" style={{ fontSize: '10.5px', padding: '3px 8px', background: '#fff1f2', color: '#be123c', borderRadius: '6px', border: '1px solid #fecdd3', fontWeight: 600 }}>
              Đã hủy: <strong>{canceledOrders}</strong>
            </span>
          </div>

          {/* 2. Thanh bộ lọc Toolbar (mô phỏng hệt Kho xe) */}
          <div style={{ 
            padding: '4px 0 4px 0', 
            background: '#ffffff', 
            display: 'flex', 
            flexWrap: 'wrap', 
            alignItems: 'center', 
            gap: '8px' 
          }}>
            <label className="search-box" style={{ flex: '2 1 260px', minHeight: '34px', height: '34px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Search size={14} style={{ color: '#64748b' }} />
              <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Tìm nhanh số đơn, KH, VIN..."
                style={{ fontSize: '12.5px', border: 'none', outline: 'none', width: '100%', color: '#1e293b' }}
              />
            </label>

            <label className="select-box" style={{ flex: '1 1 150px', minHeight: '34px', height: '34px', padding: '0 8px', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc' }}>
              <Filter size={12} style={{ color: '#64748b' }} />
              <select 
                value={status} 
                onChange={(e) => onStatusChange(e.target.value as OrderStatus | 'Tất cả')} 
                style={{ fontSize: '12px', fontWeight: 600, color: '#334155', border: 'none', background: 'transparent', width: '100%', outline: 'none', cursor: 'pointer' }}
              >
                <option>Tất cả</option>
                <option>Chưa ghép</option>
                <option>Đã ghép</option>
                <option>Chờ phê duyệt</option>
                <option>Đã phê duyệt</option>
                <option>Yêu cầu bổ sung</option>
                <option>Đã bổ sung</option>
                <option>Chờ ký hóa đơn</option>
                <option>Đã xuất hóa đơn</option>
                <option>Đã hủy</option>
              </select>
            </label>

            <button
              type="button"
              className="ghost-button"
              onClick={() => setShowQueueModal(true)}
              style={{ flex: '0 0 auto', minHeight: '34px', height: '34px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', color: '#3b82f6', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Car size={14} />
              Xếp hạng chờ ghép xe
            </button>
          </div>

          {/* 3. Bảng dữ liệu DATA TABLE chuyên nghiệp */}
          <div className="table-wrap" style={{ marginTop: '4px' }}>
            {isMobile ? (
              <div className="orders-mobile-card-list">
                {orders.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'center' }}>
                    Không tìm thấy đơn hàng phù hợp.
                  </div>
                ) : (
                  orders.map((order) => {
                    const isActive = selectedOrder?.id === order.id;
                    return (
                      <button
                        key={order.id}
                        type="button"
                        className={isActive ? 'orders-mobile-card active' : 'orders-mobile-card'}
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setIsDetailPanelOpen(true);
                          setMobileView('detail');
                        }}
                      >
                        <div className="orders-mobile-card-header">
                          <div className="orders-mobile-card-headings">
                            <p className="orders-mobile-card-title" style={{ textTransform: 'uppercase' }}>{order.customer}</p>
                            <p className="orders-mobile-card-subtitle">{order.id}</p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <span className={statusTone[order.status]} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>
                              {order.status}
                            </span>
                            {(() => {
                              if (order.vin) return null;
                              const matchCount = inventory.filter(v => matchesVehicleConfig(order, v) && canUseVehicleForPair(v, currentUsername, canOverrideHeldVehicle)).length;
                              if (matchCount > 0 && canManageOrderActions) {
                                return (
                                  <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                    Có {matchCount} xe rảnh
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>

                        <div className="orders-mobile-card-divider" />

                        <div className="orders-mobile-card-bottom">
                          <div className="orders-mobile-card-meta">
                            <span>Dòng xe</span>
                            <strong>{order.line}</strong>
                          </div>
                          <div className="orders-mobile-card-meta orders-mobile-card-meta-right">
                            <span>Tư vấn bán hàng</span>
                            <strong>{order.staff}</strong>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    {showStaffColumn && <th>Tên TVBH</th>}
                    <th>Cấu hình xe</th>
                    <th>VIN ghép</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontStyle: 'italic' }}>
                        Không tìm thấy đơn hàng phù hợp.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const isActive = selectedOrder?.id === order.id;
                      return (
                        <tr
                          key={order.id}
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            setIsDetailPanelOpen(true);
                            if (isMobile) {
                              setMobileView('detail');
                            }
                          }}
                          className={isActive ? 'active-row' : ''}
                          style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                        >
                          <td style={{ fontWeight: 700, color: '#0f766e' }}>
                            {order.id}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#1e293b', textTransform: 'uppercase' }}>{order.customer}</div>
                          </td>
                          {showStaffColumn && (
                            <td>
                              <div style={{ fontWeight: 600, color: '#475569' }}>{order.staff}</div>
                            </td>
                          )}
                          <td>
                            <div style={{ fontWeight: 600, color: '#334155' }}>{order.line} {order.version}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{order.exterior} · {order.interior}</div>
                          </td>
                          <td>
                            {order.vin ? (
                              <strong style={{ color: '#0284c7', fontSize: '12.5px', letterSpacing: '0.02em' }}>{order.vin}</strong>
                            ) : (() => {
                              const matchCount = inventory.filter(v => matchesVehicleConfig(order, v) && canUseVehicleForPair(v, currentUsername, canOverrideHeldVehicle)).length;
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{ color: '#94a3b8', fontSize: '11.5px', fontStyle: 'italic' }}>Chưa ghép</span>
                                  {matchCount > 0 && canManageOrderActions && (
                                    <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, width: 'fit-content' }}>Có {matchCount} xe rảnh</span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td>
                            <span 
                              className={statusTone[order.status]} 
                              style={{ 
                                display: 'inline-block', 
                                padding: '3px 8px', 
                                borderRadius: '12px', 
                                fontSize: '11px', 
                                fontWeight: 700 
                              }}
                            >
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Cánh phải: Chi tiết đơn hàng & Các nút hành động */}
        {isDetailPanelOpen && (
          <div className="slide-over-overlay" onClick={() => setIsDetailPanelOpen(false)}>
            <div className="slide-over-panel" onClick={(e) => e.stopPropagation()}>
              {!isMobile && (
                <button 
                  onClick={() => setIsDetailPanelOpen(false)} 
                  style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, background: '#e2e8f0', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}
                >
                  <X size={20} />
                </button>
              )}
              <div className="orders-visual-side" style={{ height: '100%' }}>
          <div className="order-detail-widget-container">
            {selectedOrder ? (
              (() => {
                const selectedVehicleSummary = `${selectedOrder.line} / ${selectedOrder.version}`;
                const selectedFinishSummary = `${selectedOrder.exterior} · ${selectedOrder.interior}`;

                if (isMobile) {
                  return (
                    <div className="orders-mobile-detail-view" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="orders-mobile-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          className="ghost-button orders-mobile-back"
                          onClick={() => { setMobileView('list'); setIsDetailPanelOpen(false); }}
                          style={{ flex: '0 0 auto', height: '32px', padding: '0 10px', fontSize: '12px' }}
                        >
                          <ArrowLeft size={14} />
                          <span>Danh sách</span>
                        </button>
                      <div className="orders-detail-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: canPairOrder ? '1fr 1fr' : '1fr', gap: '8px' }}>
                          {canPairOrder && (
                            <button
                              className="primary-button"
                              disabled={!selectedCanPair}
                              title={
                                selectedCanPair
                                  ? `Có ${selectedCandidates.length} xe phù hợp trong kho`
                                  : selectedOrder.status !== 'Chưa ghép'
                                    ? 'Đơn đã ghép hoặc đã hoàn tất'
                                    : 'Không có xe rảnh tương ứng trong kho'
                              }
                              onClick={() => onPairOrder(selectedOrder)}
                              style={{ height: '36px', fontSize: '13px', borderRadius: '8px', padding: '0 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                            >
                              <PackageCheck size={16} />
                              <span>Ghép xe</span>
                            </button>
                          )}
                          <button
                            className={canPairOrder ? "ghost-button" : "primary-button"}
                            disabled={!selectedCanInvoice}
                            title={selectedCanInvoice ? 'Cập nhật hồ sơ bàn giao xe & xuất hóa đơn GTGT' : 'Chỉ đơn đã ghép mới được chốt xuất hóa đơn'}
                            onClick={() => onInvoiceOrder(selectedOrder)}
                            style={{ height: '36px', fontSize: '13px', borderRadius: '8px', border: canPairOrder ? '1px solid #cbd5e1' : 'none', backgroundColor: canPairOrder ? '#f8fafc' : undefined, padding: '0 12px' }}
                          >
                            <FileCheck size={16} />
                            <span>Xuất HĐ</span>
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <button
                            className="ghost-button"
                            disabled={!selectedCanEdit}
                            title={selectedCanEdit ? 'Sửa thông tin đơn hàng' : 'Không cho sửa đơn đã hoàn tất'}
                            onClick={() => onEditOrder(selectedOrder)}
                            style={{ height: '36px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px' }}
                          >
                            <Pencil size={16} />
                            <span>Sửa</span>
                          </button>
                          <button
                            className="ghost-button"
                            disabled={!selectedCanUnpair || isUnpairingOrderId === selectedOrder.id}
                            title={selectedCanUnpair ? 'Hủy ghép và trả xe về trạng thái trống' : 'Chỉ đơn đã ghép mới hủy ghép được'}
                            onClick={() => onUnpairOrder(selectedOrder.id)}
                            style={{ height: '36px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px' }}
                          >
                            <X size={16} />
                            <span>{isUnpairingOrderId === selectedOrder.id ? 'Đang...' : 'Hủy ghép'}</span>
                          </button>
                        </div>
                        <button
                          className="ghost-button order-card__danger"
                          disabled={!selectedCanCancel}
                          title={selectedCanCancel ? 'Hủy đơn hàng và hoàn cọc' : 'Không cho phép hủy đơn đã hoàn tất hoặc đã hủy'}
                          onClick={() => onCancelOrder(selectedOrder)}
                          style={{ height: '36px', fontSize: '13px', borderRadius: '8px', border: '1px solid #fecdd3', color: '#be123c', background: '#fff1f2', width: '100%' }}
                        >
                          <Ban size={16} />
                          <span>Hủy đơn</span>
                        </button>
                      </div>
                      </div>

                      <div className="orders-mobile-detail-shell" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          <div className="clickable-copy-field" title="Click để copy mã đơn" onClick={() => copyToClipboard(selectedOrder.id, 'Mã đơn')} style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 700 }}>CHI TIẾT ĐƠN HÀNG</p>
                            <h3 style={{ margin: '2px 0 0', fontSize: '18px', lineHeight: 1.15, fontWeight: 700, color: '#0f172a' }}>{selectedOrder.id}</h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', fontWeight: 500, color: '#475569', textTransform: 'uppercase' }}>{selectedOrder.customer}</p>
                          </div>
                          <span className={statusTone[selectedOrder.status]} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {selectedOrder.status}
                          </span>
                        </div>

                        <div style={{ height: '1px', width: '100%', background: '#f1f5f9' }} />

                        <div className="orders-mobile-detail-section" style={{ paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#b45309', letterSpacing: '0.04em' }}>
                            <User size={14} />
                            <span>Nhân sự & Lịch hẹn</span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
                            <div className="clickable-copy-field" title="Click để copy tên khách" onClick={() => copyToClipboard(selectedOrder.customer, 'Tên khách')} style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Khách hàng</span>
                              <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word', textTransform: 'uppercase' }}>{selectedOrder.customer}</strong>
                            </div>

                            <div className="clickable-copy-field" title="Click để copy tên TVBH" onClick={() => copyToClipboard(selectedOrder.staff, 'Tên TVBH')} style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, textAlign: 'right', alignItems: 'flex-end' }}>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tư vấn bán hàng</span>
                              <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' }}>{selectedOrder.staff}</strong>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ngày cọc</span>
                              <strong style={{ fontSize: '13px', color: '#334155', fontWeight: 600, lineHeight: 1.35 }}>{formatDetailDate(selectedOrder.depositDate)}</strong>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right', alignItems: 'flex-end' }}>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Thời điểm tạo</span>
                              <strong style={{ fontSize: '13px', color: '#334155', fontWeight: 600, lineHeight: 1.35 }}>{formatDetailDate(selectedOrder.createdAt)}</strong>
                            </div>
                          </div>

                          <div style={{ paddingTop: '4px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tiến độ</span>
                                <strong style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 600 }}>Tạo đơn</strong>
                                <small style={{ fontSize: '11px', color: '#64748b' }}>{formatDetailDate(selectedOrder.createdAt)}</small>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Đặt cọc</span>
                                <strong style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 600 }}>{selectedOrder.depositDate || '—'}</strong>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ghép VIN</span>
                                <strong style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 600 }}>{selectedOrder.pairedAt || 'Chưa ghép'}</strong>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cần xe</span>
                                <strong style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 600 }}>{selectedOrder.needDate || 'N/A'}</strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="orders-mobile-detail-section" style={{ paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#b45309', letterSpacing: '0.04em' }}>
                            <Car size={14} />
                            <span>Thông tin xe</span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', gridColumn: 'span 2' }}>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dòng xe</span>
                              <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, lineHeight: 1.35 }}>{selectedVehicleSummary}</strong>
                              <small style={{ fontSize: '11px', color: '#64748b' }}>{selectedFinishSummary}</small>
                            </div>

                            <div className={selectedOrder.vin ? 'clickable-copy-field' : ''} title={selectedOrder.vin ? 'Click để copy số VIN' : ''} onClick={() => selectedOrder.vin && copyToClipboard(selectedOrder.vin, 'Số VIN')} style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Số VIN</span>
                              <strong style={{ fontSize: '13px', color: selectedOrder.vin ? '#0f766e' : '#475569', fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' }}>{selectedOrder.vin || 'Chưa ghép'}</strong>
                            </div>

                          </div>
                        </div>

                        <div className="orders-mobile-detail-section" style={{ paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#b45309', letterSpacing: '0.04em' }}>
                            <CreditCard size={14} />
                            <span>Tài chính & Hồ sơ</span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tiền đã cọc</span>
                              <strong style={{ fontSize: '13px', color: '#0f766e', fontWeight: 600, lineHeight: 1.35 }}>
                                {selectedOrder.depositAmount ? new Intl.NumberFormat('vi-VN').format(selectedOrder.depositAmount) + ' ₫' : 'N/A'}
                              </strong>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right', alignItems: 'flex-end' }}>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hình thức TT</span>
                              <strong style={{ fontSize: '13px', color: '#334155', fontWeight: 600, lineHeight: 1.35 }}>{selectedOrder.paymentMethod || 'Tiền mặt'}</strong>
                            </div>

                            <div className={selectedOrder.contractCode ? 'clickable-copy-field' : ''} title={selectedOrder.contractCode ? 'Click để copy mã HĐ' : ''} onClick={() => selectedOrder.contractCode && copyToClipboard(selectedOrder.contractCode, 'Mã HĐ')} style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mã hợp đồng</span>
                              <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' }}>{selectedOrder.contractCode || 'Chưa tạo'}</strong>
                            </div>

                            <div className={selectedOrder.maAmis ? 'clickable-copy-field' : ''} title={selectedOrder.maAmis ? 'Click để copy mã Amis' : ''} onClick={() => selectedOrder.maAmis && copyToClipboard(selectedOrder.maAmis, 'Mã Amis')} style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mã Amis</span>
                              <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' }}>{selectedOrder.maAmis || 'Chưa khai báo'}</strong>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right', alignItems: 'flex-end' }}>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Trạng thái</span>
                              <strong style={{ fontSize: '13px', color: '#334155', fontWeight: 600, lineHeight: 1.35 }}>{selectedOrder.status}</strong>
                            </div>

                            <div className="clickable-copy-field" title="Click để copy địa chỉ XHD" onClick={() => copyToClipboard(selectedOrder.invoiceAddress || '', 'Địa chỉ XHD')} style={{ display: 'flex', flexDirection: 'column', gap: '2px', gridColumn: 'span 2' }}>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Địa chỉ xuất hóa đơn</span>
                              <strong style={{ fontSize: '12.5px', color: '#1e293b', fontWeight: 600, lineHeight: 1.4, wordBreak: 'break-word' }}>{selectedOrder.invoiceAddress || 'Chưa khai báo địa chỉ'}</strong>
                            </div>

                            {selectedOrder.status === 'Đã hủy' && selectedOrder.cancelNote ? (
                              <div style={{ gridColumn: 'span 2', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '10px 12px' }}>
                                <span style={{ fontSize: '10px', color: '#be123c', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lý do hủy đơn</span>
                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9f1239', fontStyle: 'italic', lineHeight: 1.4 }}>{selectedOrder.cancelNote}</p>
                              </div>
                            ) : null}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                }

                return (
                  <>
                    {isMobile ? (
                      <button
                        type="button"
                        className="ghost-button orders-mobile-back"
                        onClick={() => { setMobileView('list'); setIsDetailPanelOpen(false); }}
                        style={{ alignSelf: 'flex-start', height: '32px', padding: '0 10px', fontSize: '12px' }}
                      >
                        <ArrowLeft size={14} />
                        <span>Danh sách</span>
                      </button>
                    ) : null}
                    <div className="orders-detail-pane__header" style={{ paddingBottom: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div className="clickable-copy-field" title="Click để copy mã đơn" onClick={() => copyToClipboard(selectedOrder.id, 'Mã đơn')} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', fontWeight: 700, margin: 0 }}>Hồ sơ đơn hàng</p>
                        <h3 style={{ fontSize: '24px', margin: 0, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontFamily: '"Inter", sans-serif' }}>{selectedOrder.id}</h3>
                      </div>
                      <span className={statusTone[selectedOrder.status]} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.02em', border: '1px solid currentColor', opacity: 0.9 }}>
                        {selectedOrder.status}
                      </span>
                    </div>

                    {/* Modul 1: Khách hàng & Nhân sự */}
                    <div className="order-detail-card-module" style={{ padding: '24px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.08em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={12} /> Thông tin liên hệ
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                        {/* Avatar & Customer */}
                        <div className="clickable-copy-field" title="Click để copy tên khách" onClick={() => copyToClipboard(selectedOrder.customer, 'Tên khách')} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, flexShrink: 0 }}>
                            {selectedOrder.customer.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Khách hàng</span>
                            <strong style={{ fontSize: '16px', color: '#0f172a', fontWeight: 800, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>{selectedOrder.customer}</strong>
                          </div>
                        </div>

                        {/* Staff & Dates */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div className="clickable-copy-field" title="Click để copy tên TVBH" onClick={() => copyToClipboard(selectedOrder.staff, 'Tên TVBH')} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tư vấn phụ trách</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                                {selectedOrder.staff.charAt(0).toUpperCase()}
                              </div>
                              <strong style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>{selectedOrder.staff}</strong>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ngày đặt cọc</span>
                            <strong style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>{selectedOrder.depositDate || '—'}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Modul 2: Xe & Cấu hình */}
                    <div className="order-detail-card-module" style={{ padding: '24px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.08em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Car size={12} /> Phương tiện
                      </p>
                      
                      <div style={{ background: '#0f172a', color: '#fff', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', overflow: 'hidden' }}>
                        {/* Decorative background element */}
                        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }} />
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Dòng xe lựa chọn</span>
                            <strong style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>{selectedVehicleSummary}</strong>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '999px', width: 'fit-content', marginTop: '4px' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: selectedOrder.exterior.includes('Trắng') ? '#fff' : selectedOrder.exterior.includes('Đỏ') ? '#ef4444' : selectedOrder.exterior.includes('Đen') ? '#000' : '#cbd5e1', border: '1px solid rgba(255,255,255,0.2)' }} />
                              <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 500 }}>{selectedFinishSummary}</span>
                            </div>
                          </div>

                          <div
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', cursor: 'help' }}
                            onMouseEnter={() => setShowPolicyTooltip(true)}
                            onMouseLeave={() => setShowPolicyTooltip(false)}
                          >
                            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Chính sách áp dụng</span>
                            <strong style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 700 }}>
                              {selectedOrder.policy ? `${selectedOrder.policy.split('\n').filter(Boolean).length} CS` : 'Mặc định'}
                            </strong>
                            {showPolicyTooltip && selectedOrder.policy && (
                              <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 999, minWidth: '240px' }}>
                                <p style={{ margin: '0 0 8px', fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chi tiết chính sách</p>
                                {selectedOrder.policy.split('\n').filter(Boolean).map((line, idx) => (
                                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '6px' }}>
                                    <span style={{ color: '#0ea5e9', fontWeight: 700, flexShrink: 0 }}>•</span>
                                    <span style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.5 }}>{line}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Số VIN định danh</span>
                          {selectedOrder.vin ? (
                            <div className="clickable-copy-field" title="Click để copy số VIN" onClick={() => copyToClipboard(selectedOrder.vin!, 'Số VIN')} style={{ background: 'linear-gradient(135deg, #e2e8f0 0%, #ffffff 100%)', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 16px', width: 'fit-content', boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.2)' }}>
                              <strong style={{ fontSize: '16px', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.15em', color: '#0f172a', fontWeight: 800 }}>{selectedOrder.vin}</strong>
                            </div>
                          ) : (
                            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '6px', padding: '8px 16px', width: 'fit-content' }}>
                              <span style={{ fontSize: '14px', fontStyle: 'italic', color: '#94a3b8', fontWeight: 500 }}>Chưa được cấp VIN</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Modul 3: Tài chính & Hồ sơ (Receipt Layout) */}
                    <div className="order-detail-card-module" style={{ padding: '24px 0' }}>
                      <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.08em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CreditCard size={12} /> Hóa đơn & Biên lai
                      </p>
                      
                      <div style={{ background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '24px', position: 'relative' }}>
                        {/* Fake receipt perforation top */}
                        <div style={{ position: 'absolute', top: '-4px', left: '12px', right: '12px', height: '8px', background: 'radial-gradient(circle, transparent 4px, #fafafa 4.5px) repeat-x', backgroundSize: '12px 12px' }} />
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px dashed #d4d4d4', paddingBottom: '16px' }}>
                            <span style={{ fontSize: '12px', color: '#525252', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tiền đã cọc</span>
                            <strong style={{ fontSize: '24px', fontFamily: '"JetBrains Mono", monospace', color: '#171717', fontWeight: 800 }}>
                              {selectedOrder.depositAmount ? new Intl.NumberFormat('vi-VN').format(selectedOrder.depositAmount) + ' ₫' : 'N/A'}
                            </strong>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderBottom: '1px dashed #d4d4d4', paddingBottom: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hình thức thanh toán</span>
                              <strong style={{ fontSize: '13px', color: '#171717', fontWeight: 600 }}>{selectedOrder.paymentMethod || 'Tiền mặt'}</strong>
                            </div>
                            <div className={selectedOrder.contractCode ? "clickable-copy-field" : ""} title={selectedOrder.contractCode ? "Click để copy mã HĐ" : ""} onClick={() => selectedOrder.contractCode && copyToClipboard(selectedOrder.contractCode, 'Mã HĐ')} style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                              <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mã Hợp Đồng</span>
                              <strong style={{ fontSize: '13px', color: '#171717', fontWeight: 600 }}>{selectedOrder.contractCode || 'Chưa tạo'}</strong>
                            </div>
                          </div>

                          <div className="clickable-copy-field" title="Click để copy địa chỉ XHD" onClick={() => copyToClipboard(selectedOrder.invoiceAddress || '', 'Địa chỉ XHD')} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Thông tin xuất hóa đơn</span>
                            <strong style={{ fontSize: '13px', color: '#171717', fontWeight: 500, lineHeight: 1.5, wordBreak: 'break-word' }}>
                              {selectedOrder.invoiceAddress || 'Chưa có thông tin XHD'}
                            </strong>
                            {selectedOrder.maAmis && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', padding: '4px 8px', background: '#e0f2fe', color: '#0284c7', borderRadius: '4px', width: 'fit-content', fontSize: '11px', fontWeight: 700 }} onClick={(e) => { e.stopPropagation(); copyToClipboard(selectedOrder.maAmis!, 'Mã Amis'); }}>
                                Mã Amis: {selectedOrder.maAmis}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="orders-detail-actions" style={{ position: 'sticky', bottom: 0, background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', paddingTop: '20px', paddingBottom: '20px', borderTop: '1px solid #f1f5f9', zIndex: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: canPairOrder ? '1fr 1fr' : '1fr', gap: '12px' }}>
                        {canPairOrder && (
                          <button
                            className="primary-button"
                            disabled={!selectedCanPair}
                            title={
                              selectedCanPair
                                ? `Có ${selectedCandidates.length} xe phù hợp trong kho`
                                : selectedOrder.status !== 'Chưa ghép'
                                  ? 'Đơn đã ghép hoặc đã hoàn tất'
                                  : 'Không có xe rảnh tương ứng trong kho'
                            }
                            onClick={() => onPairOrder(selectedOrder)}
                            style={{ 
                              height: '40px', 
                              fontSize: '13.5px', 
                              borderRadius: '8px', 
                              fontWeight: 600,
                              transition: 'all 0.2s ease',
                              ...(selectedCanPair ? {
                                background: '#0f172a',
                                color: '#ffffff',
                                border: 'none',
                              } : {
                                background: '#f8fafc',
                                color: '#94a3b8',
                                border: '1px solid #e2e8f0'
                              })
                            }}
                          >
                            <PackageCheck size={16} />
                            <span>Ghép xe</span>
                          </button>
                        )}
                        <button
                          className={canPairOrder ? "ghost-button" : "primary-button"}
                          disabled={!selectedCanInvoice}
                          title={selectedCanInvoice ? 'Cập nhật hồ sơ bàn giao xe & xuất hóa đơn GTGT' : 'Chỉ đơn đã ghép mới được chốt xuất hóa đơn'}
                          onClick={() => onInvoiceOrder(selectedOrder)}
                          style={{ 
                            height: '40px', 
                            fontSize: '13.5px', 
                            borderRadius: '8px', 
                            fontWeight: 600,
                            border: '1px solid #e2e8f0', 
                            backgroundColor: selectedCanInvoice ? '#ffffff' : '#f8fafc',
                            color: selectedCanInvoice ? '#0f172a' : '#94a3b8'
                          }}
                        >
                          <FileCheck size={16} />
                          <span>Xuất hóa đơn</span>
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <button
                          className="ghost-button"
                          disabled={!selectedCanEdit}
                          title={selectedCanEdit ? 'Sửa thông tin đơn hàng' : 'Không cho sửa đơn đã hoàn tất'}
                          onClick={() => onEditOrder(selectedOrder)}
                          style={{ height: '38px', fontSize: '13px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 500, color: '#475569', background: '#ffffff' }}
                        >
                          <Pencil size={15} />
                          <span>Sửa thông tin</span>
                        </button>
                        <button
                          className="ghost-button"
                          disabled={!selectedCanUnpair || isUnpairingOrderId === selectedOrder.id}
                          title={selectedCanUnpair ? 'Hủy ghép và trả xe về trạng thái trống' : 'Chỉ đơn đã ghép mới hủy ghép được'}
                          onClick={() => onUnpairOrder(selectedOrder.id)}
                          style={{ height: '38px', fontSize: '13px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 500, color: '#475569', background: '#ffffff' }}
                        >
                          <X size={15} />
                          <span>{isUnpairingOrderId === selectedOrder.id ? 'Đang hủy...' : 'Hủy ghép'}</span>
                        </button>
                      </div>
                      <button
                        className="ghost-button"
                        disabled={!selectedCanCancel}
                        title={selectedCanCancel ? 'Hủy đơn hàng và hoàn cọc' : 'Không cho phép hủy đơn đã hoàn tất hoặc đã hủy'}
                        onClick={() => onCancelOrder(selectedOrder)}
                        style={{ height: '38px', fontSize: '13px', borderRadius: '8px', border: 'none', color: selectedCanCancel ? '#ef4444' : '#f87171', background: selectedCanCancel ? '#fef2f2' : 'transparent', width: '100%', fontWeight: 500, transition: 'all 0.2s ease' }}
                      >
                        <Ban size={15} />
                        <span>Hủy bỏ đơn hàng</span>
                      </button>
                    </div>
                  </>
                );
              })()
            ) : null}
            </div>
          </div>
            </div>
          </div>
        )}
        </div>
        {showQueueModal && (
          <QueueRankingModal
            orders={allOrders || orders}
            onClose={() => setShowQueueModal(false)}
          />
        )}
      </section>
    );
  };
