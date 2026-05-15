import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Eye, PackageCheck, X, FileCheck, Ban, Pencil, ScrollText, User, Car, CreditCard, ArrowLeft } from 'lucide-react';
import { Order, OrderStatus, InventoryItem } from '../types';
import { statusTone } from '../constants';
import { matchesVehicleConfig, canUseVehicleForPair } from '../utils/matching';
import { copyToClipboard } from '../utils/clipboard';

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
  inventory: InventoryItem[];
  currentUsername: string;
  canOverrideHeldVehicle: boolean;
  canPairOrder: boolean;
  canManageInventory: boolean;
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
}

export const OrdersPanel: React.FC<OrdersPanelProps> = ({
  orders,
  inventory,
  currentUsername,
  canOverrideHeldVehicle,
  canPairOrder,
  canManageInventory,
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
  onSelectPolicy
}) => {
  const reviewStatuses: OrderStatus[] = ['Chờ phê duyệt', 'Đã phê duyệt', 'Yêu cầu bổ sung', 'Đã bổ sung', 'Chờ ký hóa đơn'];
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [isMobile, setIsMobile] = useState(false);
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
  const selectedCanUnpair = Boolean(selectedOrder) && canManageInventory && selectedOrder.status === 'Đã ghép';
  const selectedCanInvoice = Boolean(selectedOrder) && canManageInventory && selectedOrder.status === 'Đã ghép';
  const selectedCanCancel =
    Boolean(selectedOrder) &&
    canManageInventory &&
    selectedOrder.status !== 'Đã hủy' &&
    selectedOrder.status !== 'Đã xuất hóa đơn';
  const selectedCanEdit =
    Boolean(selectedOrder) &&
    canManageInventory &&
    !['Đã xuất hóa đơn', 'Đã hủy', 'Chờ ký hóa đơn'].includes(selectedOrder.status);
  const selectedCanPolicy = Boolean(selectedOrder) && canManageInventory && selectedOrder.status !== 'Đã hủy';

  useEffect(() => {
    if (!isMobile) {
      setMobileView('list');
    }
  }, [isMobile]);

  return (
    <section
      className={isMobile ? `panel orders-panel ${mobileView === 'detail' ? 'orders-mobile-detail' : 'orders-mobile-list'}` : 'panel orders-panel'}
    >
      <div className="orders-modular-workspace">
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
                          setMobileView('detail');
                        }}
                      >
                        <div className="orders-mobile-card-header">
                          <div className="orders-mobile-card-headings">
                            <p className="orders-mobile-card-title">{order.customer}</p>
                            <p className="orders-mobile-card-subtitle">{order.id}</p>
                          </div>
                          <span className={statusTone[order.status]} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>
                            {order.status}
                          </span>
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
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{order.customer}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{order.phone}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#334155' }}>{order.line} {order.version}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{order.exterior} · {order.interior}</div>
                          </td>
                          <td>
                            {order.vin ? (
                              <strong style={{ color: '#0284c7', fontSize: '12.5px', letterSpacing: '0.02em' }}>{order.vin}</strong>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '11.5px', fontStyle: 'italic' }}>Chưa ghép</span>
                            )}
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
        <div className="orders-visual-side">
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
                          onClick={() => setMobileView('list')}
                          style={{ flex: '0 0 auto', height: '32px', padding: '0 10px', fontSize: '12px' }}
                        >
                          <ArrowLeft size={14} />
                          <span>Danh sách</span>
                        </button>

                        <div className="orders-mobile-actions-top no-scrollbar" style={{ display: 'flex', flexWrap: 'nowrap', gap: '6px', overflowX: 'auto', paddingBottom: '2px', WebkitOverflowScrolling: 'touch', flex: '1 1 auto', justifyContent: 'flex-end' }}>
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
                          style={{ height: '30px', fontSize: '10.5px', padding: '0 10px', whiteSpace: 'nowrap', flex: '0 0 auto' }}
                        >
                          <PackageCheck size={14} />
                          <span>Ghép xe</span>
                        </button>
                        <button
                          className="ghost-button"
                          disabled={!selectedCanInvoice}
                          title={selectedCanInvoice ? 'Cập nhật hồ sơ bàn giao xe & xuất hóa đơn GTGT' : 'Chỉ đơn đã ghép mới được chốt xuất hóa đơn'}
                          onClick={() => onInvoiceOrder(selectedOrder)}
                          style={{ height: '30px', fontSize: '10.5px', padding: '0 10px', whiteSpace: 'nowrap', flex: '0 0 auto', border: '1px solid #cbd5e1' }}
                        >
                          <FileCheck size={14} />
                          <span>Xuất HĐ</span>
                        </button>
                        <button
                          className="ghost-button"
                          disabled={!selectedCanUnpair || isUnpairingOrderId === selectedOrder.id}
                          title={selectedCanUnpair ? 'Hủy ghép và trả xe về trạng thái trống' : 'Chỉ đơn đã ghép mới hủy ghép được'}
                          onClick={() => onUnpairOrder(selectedOrder.id)}
                          style={{ height: '30px', fontSize: '10.5px', padding: '0 10px', whiteSpace: 'nowrap', flex: '0 0 auto', border: '1px solid #cbd5e1' }}
                        >
                          <X size={14} />
                          <span>{isUnpairingOrderId === selectedOrder.id ? 'Đang...' : 'Hủy ghép'}</span>
                        </button>
                        <button
                          className="ghost-button"
                          disabled={!selectedCanEdit}
                          title={selectedCanEdit ? 'Sửa thông tin đơn hàng' : 'Không cho sửa đơn đã hoàn tất'}
                          onClick={() => onEditOrder(selectedOrder)}
                          style={{ height: '30px', fontSize: '10.5px', padding: '0 10px', whiteSpace: 'nowrap', flex: '0 0 auto', border: '1px solid #cbd5e1' }}
                        >
                          <Pencil size={14} />
                          <span>Sửa</span>
                        </button>
                        <button
                          className="ghost-button"
                          disabled={!selectedCanPolicy || isUpdatingPolicy}
                          title={selectedCanPolicy ? 'Chọn chính sách áp dụng cho đơn hàng' : 'Đơn đã hủy'}
                          onClick={() => onSelectPolicy(selectedOrder)}
                          style={{ height: '30px', fontSize: '10.5px', padding: '0 10px', whiteSpace: 'nowrap', flex: '0 0 auto', border: '1px solid #cbd5e1' }}
                        >
                          <ScrollText size={14} />
                          <span>CS</span>
                        </button>
                        <button
                          className="ghost-button order-card__danger"
                          disabled={!selectedCanCancel}
                          title={selectedCanCancel ? 'Hủy đơn hàng và hoàn cọc' : 'Không cho phép hủy đơn đã hoàn tất hoặc đã hủy'}
                          onClick={() => onCancelOrder(selectedOrder)}
                          style={{ height: '30px', fontSize: '10.5px', padding: '0 10px', whiteSpace: 'nowrap', flex: '0 0 auto', border: '1px solid #fecdd3', color: '#be123c', background: '#fff1f2' }}
                        >
                          <Ban size={14} />
                          <span>Hủy</span>
                        </button>
                      </div>
                      </div>

                      <div className="orders-mobile-detail-shell" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          <div className="clickable-copy-field" title="Click để copy mã đơn" onClick={() => copyToClipboard(selectedOrder.id, 'Mã đơn')} style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 700 }}>CHI TIẾT ĐƠN HÀNG</p>
                            <h3 style={{ margin: '2px 0 0', fontSize: '18px', lineHeight: 1.15, fontWeight: 700, color: '#0f172a' }}>{selectedOrder.id}</h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', fontWeight: 500, color: '#475569' }}>{selectedOrder.customer}</p>
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
                              <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' }}>{selectedOrder.customer}</strong>
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

                            <div className={selectedOrder.engineNo ? 'clickable-copy-field' : ''} title={selectedOrder.engineNo ? 'Click để copy số máy' : ''} onClick={() => selectedOrder.engineNo && copyToClipboard(selectedOrder.engineNo, 'Số máy')} style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, textAlign: 'right', alignItems: 'flex-end' }}>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Số máy</span>
                              <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' }}>{selectedOrder.engineNo || 'Trống'}</strong>
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
                        onClick={() => setMobileView('list')}
                        style={{ alignSelf: 'flex-start', height: '32px', padding: '0 10px', fontSize: '12px' }}
                      >
                        <ArrowLeft size={14} />
                        <span>Danh sách</span>
                      </button>
                    ) : null}
                    <div className="orders-detail-pane__header clickable-copy-field" title="Click để copy mã đơn" onClick={() => copyToClipboard(selectedOrder.id, 'Mã đơn')} style={{ paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0', borderRadius: '4px', padding: '4px' }}>
                      <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 700, margin: 0 }}>CHI TIẾT ĐƠN</p>
                      <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 800, color: '#0f766e' }}>{selectedOrder.id}</h3>
                    </div>

                    {/* Modul 1: Nhân sự & Tiến độ */}
                    <div className="order-detail-card-module" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '6px', borderBottom: '1px dashed #cbd5e1', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#0f766e', letterSpacing: '0.04em' }}>
                        <User size={14} />
                        <span>Nhân sự & Lịch hẹn</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '8px 12px', flex: 1, alignContent: 'center' }}>
                        <div className="clickable-copy-field" title="Click để copy tên khách" onClick={() => copyToClipboard(selectedOrder.customer, 'Tên khách')} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '1px' }}>Khách hàng</span>
                          <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedOrder.customer}</strong>
                          <small className="clickable-copy-field" title="Click để copy SĐT" onClick={(e) => { e.stopPropagation(); copyToClipboard(selectedOrder.phone || '', 'Số điện thoại'); }} style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px', fontWeight: 500 }}>📞 {selectedOrder.phone || 'Chưa có SĐT'}</small>
                        </div>
                        
                        <div className="clickable-copy-field" title="Click để copy tên TVBH" onClick={() => copyToClipboard(selectedOrder.staff, 'Tên TVBH')} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '1px' }}>Tư vấn phụ trách</span>
                          <strong style={{ fontSize: '13.5px', color: '#0f172a', display: 'block', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedOrder.staff}</strong>
                          <small style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>📍 {selectedOrder.area || 'N/A'}</small>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Ngày đặt cọc</span>
                          <strong style={{ fontSize: '13.5px', color: '#334155', fontWeight: 600 }}>{selectedOrder.depositDate || 'Chưa có'}</strong>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Thời điểm tạo đơn</span>
                          <strong style={{ fontSize: '13.5px', color: '#334155', fontWeight: 600 }}>{selectedOrder.createdAt}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Modul 2: Cấu hình xe & Hệ thống ghép */}
                    <div className="order-detail-card-module" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1.4, minHeight: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '6px', borderBottom: '1px dashed #cbd5e1', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#0f766e', letterSpacing: '0.04em' }}>
                        <Car size={14} />
                        <span>Cấu hình xe & Hệ thống</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', flex: 1, alignContent: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Cấu hình đặt cọc</span>
                          <strong style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 700 }}>{selectedVehicleSummary}</strong>
                          <small style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>🎨 {selectedFinishSummary}</small>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Chính sách (CS)</span>
                          <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 700, lineHeight: 1.3 }}>{selectedOrder.policy || 'Mặc định'}</strong>
                        </div>

                        <div className={selectedOrder.vin ? "clickable-copy-field" : ""} title={selectedOrder.vin ? "Click để copy số VIN" : ""} onClick={() => selectedOrder.vin && copyToClipboard(selectedOrder.vin, 'Số VIN')} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Số VIN ghép</span>
                          <strong style={{ fontSize: '13.5px', color: selectedOrder.vin ? '#0f766e' : '#475569', fontWeight: 700 }}>{selectedOrder.vin || 'Chưa ghép'}</strong>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Thời điểm ghép</span>
                          <strong style={{ fontSize: '13.5px', color: '#334155', fontWeight: 600 }}>{selectedOrder.pairedAt || 'Chưa ghép'}</strong>
                        </div>

                        <div className={selectedOrder.engineNo ? "clickable-copy-field" : ""} title={selectedOrder.engineNo ? "Click để copy số máy" : ""} onClick={() => selectedOrder.engineNo && copyToClipboard(selectedOrder.engineNo, 'Số máy')} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Số máy</span>
                          <strong style={{ fontSize: '13.5px', color: '#334155', fontWeight: 700 }}>{selectedOrder.engineNo || 'Trống'}</strong>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Ngày hẹn cần xe</span>
                          <strong style={{ fontSize: '13.5px', color: '#334155', fontWeight: 600 }}>{selectedOrder.needDate || 'N/A'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Modul 3: Tài chính & Hồ sơ */}
                    <div className="order-detail-card-module" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1.2, minHeight: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '6px', borderBottom: '1px dashed #cbd5e1', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#0f766e', letterSpacing: '0.04em' }}>
                        <CreditCard size={14} />
                        <span>Tài chính & Hồ sơ</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', flex: 1, alignContent: 'center' }}>
                        <div className="clickable-copy-field" title="Click để copy số tiền cọc" onClick={() => copyToClipboard(selectedOrder.depositAmount ? selectedOrder.depositAmount.toString() : '', 'Số tiền cọc')} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Tiền đã cọc</span>
                          <strong style={{ fontSize: '14px', color: '#0f766e', fontWeight: 700 }}>
                            {selectedOrder.depositAmount ? new Intl.NumberFormat('vi-VN').format(selectedOrder.depositAmount) + ' ₫' : 'N/A'}
                          </strong>
                        </div>

                        <div className={selectedOrder.contractCode ? "clickable-copy-field" : ""} title={selectedOrder.contractCode ? "Click để copy mã HĐ" : ""} onClick={() => selectedOrder.contractCode && copyToClipboard(selectedOrder.contractCode, 'Mã HĐ')} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Hình thức & Hợp đồng</span>
                          <strong style={{ fontSize: '13.5px', color: '#334155', fontWeight: 700 }}>{selectedOrder.paymentMethod || 'Tiền mặt'}</strong>
                          <small style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>📜 HĐ: {selectedOrder.contractCode || 'Chưa tạo'}</small>
                        </div>

                        <div className="clickable-copy-field" title="Click để copy địa chỉ XHD" onClick={() => copyToClipboard(selectedOrder.invoiceAddress || '', 'Địa chỉ XHD')} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4px 8px', borderRadius: '6px', gridColumn: 'span 2' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Địa chỉ xuất hóa đơn (XHD)</span>
                          <strong style={{ fontSize: '13px', color: '#1e293b', display: 'block', whiteSpace: 'normal', wordBreak: 'break-all', marginTop: '2px', lineHeight: 1.4, fontWeight: 600 }}>
                            {selectedOrder.invoiceAddress || 'Chưa khai báo địa chỉ'}
                          </strong>
                        </div>

                        {selectedOrder.status === 'Đã hủy' && selectedOrder.cancelNote ? (
                          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '8px 12px', gridColumn: 'span 2', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#be123c', display: 'block', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Lý do hủy đơn</span>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#9f1239', fontStyle: 'italic', lineHeight: 1.4, fontWeight: 500 }}>
                              {selectedOrder.cancelNote}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="orders-detail-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
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
                        style={{ height: '30px', fontSize: '11.5px' }}
                      >
                        <PackageCheck size={14} />
                        <span>Ghép xe</span>
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!selectedCanInvoice}
                        title={selectedCanInvoice ? 'Cập nhật hồ sơ bàn giao xe & xuất hóa đơn GTGT' : 'Chỉ đơn đã ghép mới được chốt xuất hóa đơn'}
                        onClick={() => onInvoiceOrder(selectedOrder)}
                        style={{ height: '30px', fontSize: '11.5px', border: '1px solid #cbd5e1' }}
                      >
                        <FileCheck size={14} />
                        <span>Xuất HĐ</span>
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!selectedCanUnpair || isUnpairingOrderId === selectedOrder.id}
                        title={selectedCanUnpair ? 'Hủy ghép và trả xe về trạng thái trống' : 'Chỉ đơn đã ghép mới hủy ghép được'}
                        onClick={() => onUnpairOrder(selectedOrder.id)}
                        style={{ height: '30px', fontSize: '11.5px', border: '1px solid #cbd5e1' }}
                      >
                        <X size={14} />
                        <span>{isUnpairingOrderId === selectedOrder.id ? 'Đang...' : 'Hủy ghép'}</span>
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!selectedCanEdit}
                        title={selectedCanEdit ? 'Sửa thông tin đơn hàng' : 'Không cho sửa đơn đã hoàn tất'}
                        onClick={() => onEditOrder(selectedOrder)}
                        style={{ height: '30px', fontSize: '11.5px', border: '1px solid #cbd5e1' }}
                      >
                        <Pencil size={14} />
                        <span>Sửa</span>
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!selectedCanPolicy || isUpdatingPolicy}
                        title={selectedCanPolicy ? 'Chọn chính sách áp dụng cho đơn hàng' : 'Đơn đã hủy'}
                        onClick={() => onSelectPolicy(selectedOrder)}
                        style={{ height: '30px', fontSize: '11.5px', border: '1px solid #cbd5e1' }}
                      >
                        <ScrollText size={14} />
                        <span>CS</span>
                      </button>
                      <button
                        className="ghost-button order-card__danger"
                        disabled={!selectedCanCancel}
                        title={selectedCanCancel ? 'Hủy đơn hàng và hoàn cọc' : 'Không cho phép hủy đơn đã hoàn tất hoặc đã hủy'}
                        onClick={() => onCancelOrder(selectedOrder)}
                        style={{ height: '30px', fontSize: '11.5px', border: '1px solid #fecdd3', color: '#be123c', background: '#fff1f2' }}
                      >
                        <Ban size={14} />
                        <span>Hủy</span>
                      </button>
                    </div>
                  </>
                );
              })()
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '8px' }}>
                <Eye size={32} style={{ opacity: 0.3 }} />
                <span>Chọn một đơn ở bên trái để xem chi tiết.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
