import React from 'react';
import { Search, Filter, Download, Eye, PackageCheck, X, FileCheck, Ban, Pencil, ScrollText } from 'lucide-react';
import { Order, OrderStatus, InventoryItem } from '../types';
import { statusTone } from '../constants';
import { matchesVehicleConfig, canUseVehicleForPair } from '../utils/matching';

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
  const totalOrders = orders.length;
  const unpairedOrders = orders.filter((order) => order.status === 'Chưa ghép').length;
  const reviewOrders = orders.filter((order) => reviewStatuses.includes(order.status)).length;
  const issuedOrders = orders.filter((order) => order.status === 'Đã xuất hóa đơn').length;
  const canceledOrders = orders.filter((order) => order.status === 'Đã hủy').length;

  return (
    <section className="panel orders-panel">
      <div className="panel-heading section-heading orders-panel-heading">
        <div className="orders-panel-title">
          <p className="eyebrow">Quản lý bán hàng</p>
          <h2>Đơn hàng</h2>
          <p className="orders-panel-lead">
            Bố cục mới: lọc nhanh ở trên, tóm tắt trạng thái ở giữa, thao tác theo từng thẻ ở dưới.
          </p>
        </div>
        <div className="orders-panel-badge">
          <span className="tag">Đang hiển thị {totalOrders} đơn</span>
        </div>
      </div>

      <div className="orders-summary-grid">
        <article className="orders-summary-card">
          <span>Tổng đơn</span>
          <strong>{totalOrders}</strong>
          <small>Toàn bộ đơn đang lọc theo tab hiện tại</small>
        </article>
        <article className="orders-summary-card">
          <span>Chưa ghép</span>
          <strong>{unpairedOrders}</strong>
          <small>Cần ghép xe từ kho phù hợp</small>
        </article>
        <article className="orders-summary-card">
          <span>Chờ xử lý</span>
          <strong>{reviewOrders}</strong>
          <small>Đang chờ duyệt, bổ sung hoặc ký HĐ</small>
        </article>
        <article className="orders-summary-card">
          <span>Đã xuất HĐ</span>
          <strong>{issuedOrders}</strong>
          <small>{canceledOrders} đơn đã hủy trong danh sách</small>
        </article>
      </div>

      <div className="orders-workspace">
        <div className="orders-toolbar-shell">
          <div className="toolbar orders-toolbar">
            <label className="search-box">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Tìm số đơn, khách hàng, VIN, cấu hình xe..."
              />
            </label>
            <label className="select-box">
              <Filter size={18} />
              <select
                value={status}
                onChange={(event) => onStatusChange(event.target.value as OrderStatus | 'Tất cả')}
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
            <button className="ghost-button" onClick={() => alert('Tính năng xuất Excel đang được xây dựng')}>
              <Download size={17} />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        <div className="orders-grid">
          {orders.length === 0 ? (
            <div className="orders-empty">
              <div className="empty-state">Không tìm thấy đơn hàng phù hợp.</div>
            </div>
          ) : (
            orders.map((order) => {
              const candidates = inventory.filter(
                (item) =>
                  matchesVehicleConfig(order, item) &&
                  canUseVehicleForPair(item, currentUsername, canOverrideHeldVehicle)
              );
              const canPair = canPairOrder && order.status === 'Chưa ghép' && candidates.length > 0;
              const canUnpair = canManageInventory && order.status === 'Đã ghép';
              const canInvoice = canManageInventory && order.status === 'Đã ghép';
              const canCancel = canManageInventory && order.status !== 'Đã hủy' && order.status !== 'Đã xuất hóa đơn';
              const canEdit = canManageInventory && !['Đã xuất hóa đơn', 'Đã hủy', 'Chờ ký hóa đơn'].includes(order.status);
              const canPolicy = canManageInventory && order.status !== 'Đã hủy';
              const vehicleSummary = `${order.line} / ${order.version}`;
              const finishSummary = `${order.exterior} · ${order.interior}`;

              return (
                <article key={order.id} className="order-card">
                  <div className="order-card__header">
                    <div className="order-card__identity">
                      <p className="order-card__eyebrow">Mã đơn</p>
                      <div className="order-card__title-row">
                        <h3>{order.id}</h3>
                        <span className={statusTone[order.status]}>{order.status}</span>
                      </div>
                      <p className="order-card__headline">{order.customer}</p>
                    </div>
                    <button
                      className="icon-button"
                      title="Xem chi tiết"
                      onClick={() => onViewOrder(order)}
                    >
                      <Eye size={18} />
                    </button>
                  </div>

                  <div className="order-card__content">
                    <div className="order-card__summary">
                      <div>
                        <span>Khách hàng</span>
                        <strong>{order.customer}</strong>
                        <small>{order.phone}</small>
                      </div>
                      <div>
                        <span>Tư vấn bán hàng</span>
                        <strong>{order.staff}</strong>
                        <small>{order.area || 'Khu vực chưa cập nhật'}</small>
                      </div>
                      <div>
                        <span>Tiến độ</span>
                        <strong>{order.createdAt}</strong>
                        <small>Cọc {order.depositDate} · Cần xe {order.needDate}</small>
                      </div>
                      <div>
                        <span>Trạng thái xe</span>
                        <strong>{order.vin || 'Chưa ghép'}</strong>
                        <small>{order.pairedAt || 'Chưa có thời gian ghép'}</small>
                      </div>
                    </div>

                    <div className="order-card__vehicle">
                      <div>
                        <span>Dòng xe</span>
                        <strong>{vehicleSummary}</strong>
                      </div>
                      <div>
                        <span>Màu xe</span>
                        <strong>{finishSummary}</strong>
                      </div>
                    </div>

                    <div className="order-card__meta">
                      <span className="tag">VIN: {order.vin || 'Trống'}</span>
                      <span className="tag">Chính sách: {order.policy || 'Chưa chọn'}</span>
                      <span className="tag">DMS: {order.dmsCode || 'Trống'}</span>
                      <span className="tag">Số máy: {order.engineNo || 'Trống'}</span>
                    </div>
                  </div>

                  <div className="order-card__actions">
                    <button
                      className="ghost-button row-action-button"
                      disabled={!canPair}
                      title={
                        canPair
                          ? `Có ${candidates.length} xe phù hợp trong kho`
                          : order.status !== 'Chưa ghép'
                            ? 'Đơn đã ghép hoặc đã hoàn tất'
                            : 'Không có xe rảnh tương ứng trong kho'
                      }
                      onClick={() => onPairOrder(order)}
                    >
                      <PackageCheck size={16} />
                      <span>Ghép xe</span>
                    </button>
                    <button
                      className="ghost-button row-action-button"
                      disabled={!canInvoice}
                      title={canInvoice ? 'Cập nhật hồ sơ bàn giao xe & xuất hóa đơn GTGT' : 'Chỉ đơn đã ghép mới được chốt xuất hóa đơn'}
                      onClick={() => onInvoiceOrder(order)}
                    >
                      <FileCheck size={16} />
                      <span>Xuất HĐ</span>
                    </button>
                    <button
                      className="ghost-button row-action-button"
                      disabled={!canUnpair || isUnpairingOrderId === order.id}
                      title={canUnpair ? 'Hủy ghép và trả xe về trạng thái trống' : 'Chỉ đơn đã ghép mới hủy ghép được'}
                      onClick={() => onUnpairOrder(order.id)}
                    >
                      <X size={16} />
                      <span>{isUnpairingOrderId === order.id ? 'Đang hủy...' : 'Hủy ghép'}</span>
                    </button>
                    <button
                      className="ghost-button row-action-button"
                      disabled={!canEdit}
                      title={canEdit ? 'Sửa thông tin đơn hàng' : 'Không cho sửa đơn đã hoàn tất'}
                      onClick={() => onEditOrder(order)}
                    >
                      <Pencil size={16} />
                      <span>Sửa</span>
                    </button>
                    <button
                      className="ghost-button row-action-button"
                      disabled={!canPolicy || isUpdatingPolicy}
                      title={canPolicy ? 'Chọn chính sách áp dụng cho đơn hàng' : 'Đơn đã hủy'}
                      onClick={() => onSelectPolicy(order)}
                    >
                      <ScrollText size={16} />
                      <span>{isUpdatingPolicy ? 'Đang lưu...' : 'Chọn CS'}</span>
                    </button>
                    <button
                      className="ghost-button row-action-button order-card__danger"
                      disabled={!canCancel}
                      title={canCancel ? 'Hủy đơn hàng và hoàn cọc' : 'Không cho phép hủy đơn đã hoàn tất hoặc đã hủy'}
                      onClick={() => onCancelOrder(order)}
                    >
                      <Ban size={16} />
                      <span>Hủy đơn</span>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
