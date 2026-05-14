import React, { useEffect, useMemo, useState } from 'react';
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
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null,
    [orders, selectedOrderId]
  );

  useEffect(() => {
    if (!orders.length) {
      if (selectedOrderId) {
        setSelectedOrderId('');
      }
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

  return (
    <section className="panel orders-panel">
      <div className="panel-heading section-heading orders-panel-heading">
        <div className="orders-panel-title">
          <p className="eyebrow">Quản lý bán hàng</p>
          <h2>Đơn hàng</h2>
          <p className="orders-panel-lead">
            Bố cục mới: danh sách bên trái, chi tiết và thao tác bên phải.
          </p>
          <div className="orders-panel-metrics">
            <span className="tag">Tổng {totalOrders}</span>
            <span className="tag">Chưa ghép {unpairedOrders}</span>
            <span className="tag">Chờ xử lý {reviewOrders}</span>
            <span className="tag">Đã xuất HĐ {issuedOrders}</span>
            <span className="tag">Đã hủy {canceledOrders}</span>
          </div>
        </div>
        <div className="orders-panel-badge">
          <span className="tag">Đang hiển thị {totalOrders} đơn</span>
        </div>
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

        <div className="orders-master-detail">
          <aside className="orders-list-pane">
            <div className="orders-list-pane__header">
              <div>
                <p className="orders-panel-subtitle">Danh sách đơn</p>
                <h3>{orders.length} đơn đang lọc</h3>
              </div>
              <span className="tag">Click để xem chi tiết</span>
            </div>

            <div className="orders-list">
              {orders.length === 0 ? (
                <div className="orders-empty">
                  <div className="empty-state">Không tìm thấy đơn hàng phù hợp.</div>
                </div>
              ) : (
                orders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    className={`order-list-item ${selectedOrder?.id === order.id ? 'active' : ''}`}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <div className="order-list-item__top">
                      <div>
                        <p className="order-list-item__id">{order.id}</p>
                        <strong>{order.customer}</strong>
                      </div>
                      <span className={statusTone[order.status]}>{order.status}</span>
                    </div>

                    <div className="order-list-item__meta">
                      <span>{order.line} / {order.version}</span>
                      <span>{order.vin || 'Chưa ghép VIN'}</span>
                    </div>

                    <div className="order-list-item__footer">
                      <span>{order.staff}</span>
                      <span>{order.createdAt}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="orders-detail-pane">
            {selectedOrder ? (
              (() => {
                const selectedVehicleSummary = `${selectedOrder.line} / ${selectedOrder.version}`;
                const selectedFinishSummary = `${selectedOrder.exterior} · ${selectedOrder.interior}`;

                return (
                  <>
                    <div className="orders-detail-pane__header">
                      <div>
                        <p className="orders-panel-subtitle">Chi tiết đơn</p>
                        <h3>{selectedOrder.id}</h3>
                      </div>
                      <button
                        className="icon-button"
                        title="Xem chi tiết đầy đủ"
                        onClick={() => onViewOrder(selectedOrder)}
                      >
                        <Eye size={18} />
                      </button>
                    </div>

                    <div className="orders-detail-hero">
                      <div>
                        <span>Khách hàng</span>
                        <strong>{selectedOrder.customer}</strong>
                        <small>{selectedOrder.phone}</small>
                      </div>
                      <div>
                        <span>Trạng thái</span>
                        <strong className={statusTone[selectedOrder.status]}>{selectedOrder.status}</strong>
                        <small>{selectedOrder.vin || 'Chưa ghép xe'}</small>
                      </div>
                    </div>

                    <div className="orders-detail-grid">
                      <article>
                        <span>Tư vấn bán hàng</span>
                        <strong>{selectedOrder.staff}</strong>
                        <small>{selectedOrder.area || 'Khu vực chưa cập nhật'}</small>
                      </article>
                      <article>
                        <span>Tiến độ</span>
                        <strong>{selectedOrder.createdAt}</strong>
                        <small>Cọc {selectedOrder.depositDate} · Cần xe {selectedOrder.needDate}</small>
                      </article>
                      <article>
                        <span>Dòng xe</span>
                        <strong>{selectedVehicleSummary}</strong>
                        <small>{selectedFinishSummary}</small>
                      </article>
                      <article>
                        <span>Xe ghép</span>
                        <strong>{selectedOrder.vin || 'Trống'}</strong>
                        <small>{selectedOrder.pairedAt || 'Chưa có thời gian ghép'}</small>
                      </article>
                    </div>

                    <div className="orders-detail-tags">
                      <span className="tag">Chính sách: {selectedOrder.policy || 'Chưa chọn'}</span>
                      <span className="tag">DMS: {selectedOrder.dmsCode || 'Trống'}</span>
                      <span className="tag">Số máy: {selectedOrder.engineNo || 'Trống'}</span>
                    </div>



                    <div className="orders-detail-actions">
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
                      >
                        <PackageCheck size={16} />
                        <span>Ghép xe</span>
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!selectedCanInvoice}
                        title={selectedCanInvoice ? 'Cập nhật hồ sơ bàn giao xe & xuất hóa đơn GTGT' : 'Chỉ đơn đã ghép mới được chốt xuất hóa đơn'}
                        onClick={() => onInvoiceOrder(selectedOrder)}
                      >
                        <FileCheck size={16} />
                        <span>Xuất HĐ</span>
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!selectedCanUnpair || isUnpairingOrderId === selectedOrder.id}
                        title={selectedCanUnpair ? 'Hủy ghép và trả xe về trạng thái trống' : 'Chỉ đơn đã ghép mới hủy ghép được'}
                        onClick={() => onUnpairOrder(selectedOrder.id)}
                      >
                        <X size={16} />
                        <span>{isUnpairingOrderId === selectedOrder.id ? 'Đang hủy...' : 'Hủy ghép'}</span>
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!selectedCanEdit}
                        title={selectedCanEdit ? 'Sửa thông tin đơn hàng' : 'Không cho sửa đơn đã hoàn tất'}
                        onClick={() => onEditOrder(selectedOrder)}
                      >
                        <Pencil size={16} />
                        <span>Sửa</span>
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!selectedCanPolicy || isUpdatingPolicy}
                        title={selectedCanPolicy ? 'Chọn chính sách áp dụng cho đơn hàng' : 'Đơn đã hủy'}
                        onClick={() => onSelectPolicy(selectedOrder)}
                      >
                        <ScrollText size={16} />
                        <span>{isUpdatingPolicy ? 'Đang lưu...' : 'Chọn CS'}</span>
                      </button>
                      <button
                        className="ghost-button order-card__danger"
                        disabled={!selectedCanCancel}
                        title={selectedCanCancel ? 'Hủy đơn hàng và hoàn cọc' : 'Không cho phép hủy đơn đã hoàn tất hoặc đã hủy'}
                        onClick={() => onCancelOrder(selectedOrder)}
                      >
                        <Ban size={16} />
                        <span>Hủy đơn</span>
                      </button>
                    </div>
                  </>
                );
              })()
            ) : (
              <div className="orders-detail-empty">
                <div className="empty-state">Chọn một đơn ở bên trái để xem chi tiết.</div>
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
};
